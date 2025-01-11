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
    static botName = 'ollama';
    // static loginUrl = 'https://ollama.com';
    model = modelSlug;
    static requireLogin = false;
    static desc = 'Ollama';
    static maxTokenLimit = 32000;
    supportedUploadTypes = [BotSupportedMimeType.TXT];
    static get supportUploadPDF() {
        return false;
    }
    static get supportUploadImage() {
        return false;
    }

    static get loginUrl() {
        return 'https://ollama.coms';
    }

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

    static async checkIsLogin(): Promise<[ChatError | null, boolean]> {
        const storage = new Storage();
        const ollamaUrl = await storage.get('ollama-url');
        const response = await fetch(ollamaUrl + '/api/version', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost',
            }
        });

        if (!response.ok) {
            return Promise.resolve([null, true]);
        }

        return Promise.resolve([null, false]);
    }

    async completion({prompt, rid, cb, fileRef, file}: BotCompletionParams): Promise<void> {
        try {
            const storage = new Storage();
            const ollamaUrl = await storage.get('ollama-url');
            const ollamaModel = await storage.get('ollama-model');
            
            if (!ollamaUrl || !ollamaModel) {
                throw new ChatError(ErrorCode.MODEL_INTERNAL_ERROR, 'Ollama setting is not set.');
            }

            console.log('completion api called with prompt:', prompt);
            const response = await fetch(ollamaUrl + '/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'http://localhost',
                },
                body: JSON.stringify({
                    model: ollamaModel,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    stream: false
                })
            });

            if (!response.ok) {
                Logger.error('Http error: ', response);
                throw new ChatError(ErrorCode.MODEL_INTERNAL_ERROR, `HTTP error! status: ${response.status}`);
            }

            let messageText = '';
            let messageId = createUuid();

            const result = await response.json();
            Logger.log("Response:", result);

            try {
                messageText = result.message.content;

                if (!messageText) {
                    throw new ChatError(ErrorCode.MODEL_INTERNAL_ERROR, 'No response text received.');
                }
                
            } catch (parseError) {
                Logger.error('Response parsing error:', parseError);
                throw new ChatError(ErrorCode.MODEL_INTERNAL_ERROR, 'An error occurred while parsing the response.');
            }

            cb(rid, new ConversationResponse({
                conversation_id: this.botSession.session.botConversationId,
                message_type: ResponseMessageType.GENERATING,
                message_text: messageText,
                message_id: messageId,
                parent_message_id: this.botSession.session.getParentMessageId()
            }));

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

    getLoginUrl(): string {
        return OllamaAPI.loginUrl;
    }

}