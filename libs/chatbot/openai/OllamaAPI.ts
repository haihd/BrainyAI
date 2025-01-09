import {OpenaiBot} from "~libs/chatbot/openai/index";
import {OpenAIAuth} from "~libs/open-ai/open-ai-auth";
import {BotSession, SimpleBotMessage} from "~libs/chatbot/BotSessionBase";
import type {BotCompletionParams, BotConstructorParams} from "~libs/chatbot/IBot";
import {ConversationResponse, ResponseMessageType} from "~libs/open-ai/open-ai-interface";
import {ChatError, ErrorCode} from "~utils/errors";
import {Logger} from "~utils/logger";
import {BotSupportedMimeType} from "~libs/chatbot/BotBase";
import { Storage } from "@plasmohq/storage";
import { createUuid } from "~utils";

// Auth Singleton
class OllamaAPIAuthSingleton {
    private static instance: OllamaAPIAuthSingleton;
    auth: OpenAIAuth;

    protected constructor() {
        // ignore
    }

    static getInstance(): OllamaAPIAuthSingleton {
        if (!OllamaAPIAuthSingleton.instance) {
            OllamaAPIAuthSingleton.instance = new OllamaAPIAuthSingleton();
            OllamaAPIAuthSingleton.instance.auth = new OpenAIAuth();
        }
        return OllamaAPIAuthSingleton.instance;
    }
}

// Session Singleton
class OllamaAPISessionSingleton {
    private static instance: OllamaAPISessionSingleton | null;
    static globalConversationId: string;
    session: BotSession;

    private constructor() {
        this.session = new BotSession(OllamaAPISessionSingleton.globalConversationId);
    }

    static destroy() {
        OllamaAPISessionSingleton.globalConversationId = "";
        OllamaAPISessionSingleton.instance = null;
    }

    static getInstance(globalConversationId: string) {
        if (globalConversationId !== OllamaAPISessionSingleton.globalConversationId) {
            OllamaAPISessionSingleton.destroy();
        }

        OllamaAPISessionSingleton.globalConversationId = globalConversationId;

        if (!OllamaAPISessionSingleton.instance) {
            OllamaAPISessionSingleton.instance = new OllamaAPISessionSingleton();
        }

        return OllamaAPISessionSingleton.instance;
    }
}

const modelSlug = "ollama";

export default class OllamaAPI extends OpenaiBot {
    static botName = 'ollama-api';
    model = modelSlug;
    static requireLogin = false;
    static desc = 'Ollama API';
    static maxTokenLimit = 2000;
    supportedUploadTypes = [BotSupportedMimeType.TXT];

    constructor(params: BotConstructorParams) {
        super(params);
        try {
            this.botSession = OllamaAPISessionSingleton.getInstance(params.globalConversationId);
            this.authInstance = OllamaAPIAuthSingleton.getInstance();
        } catch (e) {
            OllamaAPISessionSingleton.destroy();
            this.botSession = OllamaAPISessionSingleton.getInstance(params.globalConversationId);
            this.authInstance = OllamaAPIAuthSingleton.getInstance();
        }
    }

    async completion({prompt, rid, cb, fileRef, file}: BotCompletionParams): Promise<void> {
        try {
            const storage = new Storage();
            const ollamaSettingString = await storage.get('ollama-setting');
            
            if (!ollamaSettingString) {
                throw new ChatError(ErrorCode.MODEL_INTERNAL_ERROR, 'Ollama setting is not set.');
            }

            const ollamaSetting = JSON.parse(ollamaSettingString);
            console.log('completion api called with prompt:', prompt);
            const response = await fetch(ollamaSetting.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: ollamaSetting.model,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    stream: true
                })
            });

            if (!response.ok) {
                Logger.error('Http error: ', response);
                throw new ChatError(ErrorCode.MODEL_INTERNAL_ERROR, `HTTP error! status: ${response.status}`);
            }

            let messageText = '';
            let messageId = '';

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const {value, done} = await reader?.read() || {};
                if (done) break;

                buffer += decoder.decode(value, {stream: true});
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const json = JSON.parse(data);
                            const content = json.choices[0]?.delta?.content || '';
                            messageText += content;
                            messageId = json.id;

                            Logger.log("Response:", json);
                            cb(rid, new ConversationResponse({
                                conversation_id: this.botSession.session.botConversationId,
                                message_type: ResponseMessageType.GENERATING,
                                message_text: messageText,
                                message_id: messageId,
                                parent_message_id: this.botSession.session.getParentMessageId()
                            }));
                        } catch (e) {
                            Logger.error('Failed to parse JSON:', e);
                            throw new ChatError(ErrorCode.MODEL_INTERNAL_ERROR, 'JSON 파싱 오류');
                        }
                    }
                }
            }

            this.botSession.session.addMessage(new SimpleBotMessage(messageText, messageId));

            cb(rid, new ConversationResponse({
                conversation_id: this.botSession.session.botConversationId,
                message_type: ResponseMessageType.DONE,
                message_text: messageText,
                message_id: messageId,
                parent_message_id: this.botSession.session.getParentMessageId()
            }));

        } catch (error) {
            Logger.error('API Error:', error);
            cb(rid, new ConversationResponse({
                conversation_id: this.botSession.session.botConversationId,
                message_type: ResponseMessageType.ERROR,
                error: error instanceof ChatError ? error : new ChatError(ErrorCode.MODEL_INTERNAL_ERROR, error.message)
            }));
        }
    }

    getBotName(): string {
        return OllamaAPI.botName;
    }

    getRequireLogin(): boolean {
        return OllamaAPI.requireLogin;
    }

    getMaxTokenLimit(): number {
        return OllamaAPI.maxTokenLimit;
    }

    uploadFile(file: File): Promise<string> {
        return this.fileInstance.uploadFile(file, this.supportedUploadTypes);
    }
} 