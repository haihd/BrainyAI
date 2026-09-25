import {OpenaiBot} from "~libs/chatbot/openai/index";
import {BotSession, SimpleBotMessage} from "~libs/chatbot/BotSessionBase";
import type {BotCompletionParams, BotConstructorParams} from "~libs/chatbot/IBot";
import {ConversationResponse, ResponseMessageType} from "~libs/open-ai/open-ai-interface";
import {ChatError, ErrorCode} from "~utils/errors";
import {Logger} from "~utils/logger";
import {BotSupportedMimeType} from "~libs/chatbot/BotBase";
import {Storage} from "@plasmohq/storage";
import {
    API_PROVIDERS,
    type ApiProviderConfig,
    apiKeyStorageKey,
    baseUrlStorageKey,
    modelStorageKey
} from "~libs/chatbot/api/providers";

interface ApiSettings {
    apiKey: string;
    model: string;
    baseUrl: string;
}

async function getApiSettings(provider: ApiProviderConfig): Promise<ApiSettings> {
    const storage = new Storage();
    const apiKey = (await storage.get(apiKeyStorageKey(provider.id))) ?? '';
    const model = (await storage.get(modelStorageKey(provider.id))) || provider.defaultModel;
    const baseUrl = (provider.editableBaseUrl && await storage.get(baseUrlStorageKey(provider.id))) || provider.baseUrl;
    return {apiKey, model, baseUrl: baseUrl.replace(/\/+$/, '')};
}

async function readErrorDetail(response: Response): Promise<string> {
    try {
        const text = await response.text();
        try {
            const json = JSON.parse(text);
            const err = Array.isArray(json) ? json[0]?.error : json.error;
            return err?.message ?? text;
        } catch {
            return text;
        }
    } catch {
        return '';
    }
}

/**
 * Builds a bot class for a provider that implements the OpenAI Chat Completions API.
 * Each provider gets its own class (the UI identifies models by their static botName)
 * and its own conversation session.
 */
export function createApiBot(provider: ApiProviderConfig) {
    class SessionSingleton {
        private static instance: SessionSingleton | null;
        static globalConversationId: string;
        session: BotSession;

        private constructor() {
            this.session = new BotSession(SessionSingleton.globalConversationId);
        }

        static destroy() {
            SessionSingleton.globalConversationId = "";
            SessionSingleton.instance = null;
        }

        static getInstance(globalConversationId: string) {
            if (globalConversationId !== SessionSingleton.globalConversationId) {
                SessionSingleton.destroy();
            }

            SessionSingleton.globalConversationId = globalConversationId;

            if (!SessionSingleton.instance) {
                SessionSingleton.instance = new SessionSingleton();
            }

            return SessionSingleton.instance;
        }
    }

    return class ApiBot extends OpenaiBot {
        static provider = provider;
        static botName = provider.label;
        static logoSrc = provider.logoSrc;
        static loginUrl = provider.apiKeyUrl;
        static requireLogin = false;
        static desc = `Uses your own ${provider.label} API key. Set the key and model in Settings → API Keys & Models.`;
        static maxTokenLimit = provider.maxTokenLimit;
        static supportUploadPDF = false;
        static supportUploadImage = false;
        supportedUploadTypes = [BotSupportedMimeType.TXT];

        constructor(params: BotConstructorParams) {
            super(params);
            this.botSession = SessionSingleton.getInstance(params.globalConversationId);
        }

        static async checkIsLogin(): Promise<[ChatError | null, boolean]> {
            const {apiKey, model, baseUrl} = await getApiSettings(provider);
            return [null, !!(apiKey && model && baseUrl)];
        }

        static async checkModelCanUse(): Promise<boolean> {
            const [, configured] = await ApiBot.checkIsLogin();
            return configured;
        }

        async startAuth(): Promise<boolean> {
            window.open(chrome.runtime.getURL('options.html'));
            return false;
        }

        async completion({prompt, rid, cb}: BotCompletionParams): Promise<void> {
            const conversationId = this.botSession.session.botConversationId;
            try {
                const {apiKey, model, baseUrl} = await getApiSettings(provider);

                if (!apiKey || !model || !baseUrl) {
                    throw new ChatError(ErrorCode.MODEL_INTERNAL_ERROR,
                        `${provider.label} is not configured. Add your API key and model in Settings → API Keys & Models.`);
                }

                const response = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model,
                        messages: [{role: 'user', content: prompt}],
                        stream: true
                    })
                });

                if (!response.ok) {
                    const detail = await readErrorDetail(response);
                    Logger.error(`${provider.label} http error`, response.status, detail);
                    throw new ChatError(ErrorCode.MODEL_INTERNAL_ERROR,
                        `${provider.label} returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
                }

                const reader = response.body!.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let messageText = '';
                let messageId = '';

                for (;;) {
                    const {value, done} = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, {stream: true});
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const rawLine of lines) {
                        const line = rawLine.trim();
                        if (!line.startsWith('data:')) continue;

                        const data = line.slice(5).trim();
                        if (data === '[DONE]') continue;

                        let json;
                        try {
                            json = JSON.parse(data);
                        } catch (e) {
                            Logger.error('Failed to parse stream chunk:', data);
                            continue;
                        }

                        if (json.error) {
                            throw new ChatError(ErrorCode.MODEL_INTERNAL_ERROR, json.error.message ?? String(json.error));
                        }

                        messageText += json.choices?.[0]?.delta?.content ?? '';
                        messageId = json.id || messageId;

                        cb(rid, new ConversationResponse({
                            conversation_id: conversationId,
                            message_type: ResponseMessageType.GENERATING,
                            message_text: messageText,
                            message_id: messageId,
                            parent_message_id: this.botSession.session.getParentMessageId()
                        }));
                    }
                }

                if (!messageText) {
                    throw new ChatError(ErrorCode.MODEL_INTERNAL_ERROR, `${provider.label} returned an empty response.`);
                }

                this.botSession.session.addMessage(new SimpleBotMessage(messageText, messageId));

                cb(rid, new ConversationResponse({
                    conversation_id: conversationId,
                    message_type: ResponseMessageType.DONE,
                    message_text: messageText,
                    message_id: messageId,
                    parent_message_id: this.botSession.session.getParentMessageId()
                }));
            } catch (error) {
                Logger.error(`${provider.label} API error:`, error);
                cb(rid, new ConversationResponse({
                    conversation_id: conversationId,
                    message_type: ResponseMessageType.ERROR,
                    error: error instanceof ChatError ? error : new ChatError(ErrorCode.MODEL_INTERNAL_ERROR, error.message)
                }));
            }
        }

        getBotName(): string {
            return ApiBot.botName;
        }

        getRequireLogin(): boolean {
            return ApiBot.requireLogin;
        }

        getMaxTokenLimit(): number {
            return ApiBot.maxTokenLimit;
        }

        getLoginUrl(): string {
            return ApiBot.loginUrl;
        }

        uploadFile(file: File): Promise<string> {
            return this.fileInstance.uploadFile(file, this.supportedUploadTypes);
        }
    };
}

export type ApiBotClass = ReturnType<typeof createApiBot>;

export const API_BOTS: ApiBotClass[] = API_PROVIDERS.map(createApiBot);
