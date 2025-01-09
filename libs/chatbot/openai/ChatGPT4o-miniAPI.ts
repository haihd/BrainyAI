import {OpenaiBot} from "~libs/chatbot/openai/index";
import {OpenAIAuth} from "~libs/open-ai/open-ai-auth";
import {BotSession, SimpleBotMessage} from "~libs/chatbot/BotSessionBase";
import type {BotCompletionParams, BotConstructorParams} from "~libs/chatbot/IBot";
import {ConversationResponse, ResponseMessageType} from "~libs/open-ai/open-ai-interface";
import {ChatError, ErrorCode} from "~utils/errors";
import {Logger} from "~utils/logger";
import {BotSupportedMimeType} from "~libs/chatbot/BotBase";
import { Storage } from "@plasmohq/storage";

// Auth Singleton
class ChatGPTAPIAuthSingleton {
    private static instance: ChatGPTAPIAuthSingleton;
    auth: OpenAIAuth;

    protected constructor() {
        // ignore
    }

    static getInstance(): ChatGPTAPIAuthSingleton {
        if (!ChatGPTAPIAuthSingleton.instance) {
            ChatGPTAPIAuthSingleton.instance = new ChatGPTAPIAuthSingleton();
            ChatGPTAPIAuthSingleton.instance.auth = new OpenAIAuth();
        }
        return ChatGPTAPIAuthSingleton.instance;
    }
}

// Session Singleton
class ChatGPTAPISessionSingleton {
    private static instance: ChatGPTAPISessionSingleton | null;
    static globalConversationId: string;
    session: BotSession;

    private constructor() {
        this.session = new BotSession(ChatGPTAPISessionSingleton.globalConversationId);
    }

    static destroy() {
        ChatGPTAPISessionSingleton.globalConversationId = "";
        ChatGPTAPISessionSingleton.instance = null;
    }

    static getInstance(globalConversationId: string) {
        if (globalConversationId !== ChatGPTAPISessionSingleton.globalConversationId) {
            ChatGPTAPISessionSingleton.destroy();
        }

        ChatGPTAPISessionSingleton.globalConversationId = globalConversationId;

        if (!ChatGPTAPISessionSingleton.instance) {
            ChatGPTAPISessionSingleton.instance = new ChatGPTAPISessionSingleton();
        }

        return ChatGPTAPISessionSingleton.instance;
    }
}

const modelSlug = "gpt-4o-mini";

export default class ChatGPT4oMiniAPI extends OpenaiBot {
    static botName = 'gpt-4o-mini';
    model = modelSlug;
    static requireLogin = false;
    static desc = 'Accessing gpt-4o-mini via the OpenAI API';
    static maxTokenLimit = 9000;
    supportedUploadTypes = [BotSupportedMimeType.TXT];

    constructor(params: BotConstructorParams) {
        super(params);
        this.botSession = ChatGPTAPISessionSingleton.getInstance(params.globalConversationId);
        this.authInstance = ChatGPTAPIAuthSingleton.getInstance();
    }

    async completion({prompt, rid, cb, fileRef, file}: BotCompletionParams): Promise<void> {
        try {
            // API 키 가져오기
            const storage = new Storage();
            const apiKey = await storage.get('openai-api-key');
            
            if (!apiKey) {
                throw new ChatError(ErrorCode.MODEL_INTERNAL_ERROR, 'OpenAI API Key is not set.');
            }

            let messageText = '';
            let messageId = '';

            console.log('completion api called with prompt:', prompt);
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
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
        return ChatGPT4oMiniAPI.botName;
    }

    getRequireLogin(): boolean {
        return ChatGPT4oMiniAPI.requireLogin;
    }

    getMaxTokenLimit(): number {
        return ChatGPT4oMiniAPI.maxTokenLimit;
    }

    uploadFile(file: File): Promise<string> {
        return this.fileInstance.uploadFile(file, this.supportedUploadTypes);
    }
} 