import IconOpenAI from "data-base64:~assets/simple-icons_openai.svg";
import IconGemini from "data-base64:~assets/gemini.svg";
import IconDeepSeek from "data-base64:~assets/deepseek.svg";
import IconApi from "data-base64:~assets/api.svg";

/**
 * An API provider that speaks the OpenAI Chat Completions protocol
 * (POST {baseUrl}/chat/completions, Bearer auth, SSE streaming).
 *
 * To add a new provider, append an entry to API_PROVIDERS. The options page
 * and the model picker in the side panel are both generated from this list.
 */
export interface ApiProviderConfig {
    /** Stable id, also the prefix of the storage keys. Never change it once released. */
    id: string;
    /** Name shown in the model picker and settings page. */
    label: string;
    /** Category title in the model picker. */
    vendor: string;
    /** Default base URL, without the trailing /chat/completions. */
    baseUrl: string;
    /** Whether the user may override the base URL in the settings page. */
    editableBaseUrl?: boolean;
    defaultModel: string;
    /** Suggestions for the model field; any other model id can still be typed. */
    modelSuggestions: string[];
    /** Where the user creates an API key. */
    apiKeyUrl: string;
    apiKeyPlaceholder: string;
    logoSrc: string;
    maxTokenLimit: number;
}

export const API_PROVIDERS: ApiProviderConfig[] = [
    {
        id: "openai",
        label: "OpenAI API",
        vendor: "OpenAI",
        baseUrl: "https://api.openai.com/v1",
        defaultModel: "gpt-4o-mini",
        modelSuggestions: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
        apiKeyUrl: "https://platform.openai.com/api-keys",
        apiKeyPlaceholder: "sk-...",
        logoSrc: IconOpenAI,
        maxTokenLimit: 128000,
    },
    {
        id: "gemini",
        label: "Gemini",
        vendor: "Google",
        // Gemini's OpenAI-compatible endpoint
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        defaultModel: "gemini-2.5-flash",
        modelSuggestions: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro", "gemini-2.0-flash"],
        apiKeyUrl: "https://aistudio.google.com/apikey",
        apiKeyPlaceholder: "AIza...",
        logoSrc: IconGemini,
        maxTokenLimit: 1000000,
    },
    {
        id: "deepseek",
        label: "DeepSeek",
        vendor: "DeepSeek",
        baseUrl: "https://api.deepseek.com",
        defaultModel: "deepseek-chat",
        modelSuggestions: ["deepseek-chat", "deepseek-reasoner"],
        apiKeyUrl: "https://platform.deepseek.com/api_keys",
        apiKeyPlaceholder: "sk-...",
        logoSrc: IconDeepSeek,
        maxTokenLimit: 64000,
    },
    {
        // Any other OpenAI-compatible service: OpenRouter, Groq, Mistral, xAI, LM Studio, ...
        id: "custom",
        label: "Custom API",
        vendor: "Custom (OpenAI-compatible)",
        baseUrl: "",
        editableBaseUrl: true,
        defaultModel: "",
        modelSuggestions: [],
        apiKeyUrl: "https://platform.openai.com/docs/api-reference/chat",
        apiKeyPlaceholder: "API key",
        logoSrc: IconApi,
        maxTokenLimit: 128000,
    },
];

export const apiKeyStorageKey = (id: string) => `${id}-api-key`;
export const modelStorageKey = (id: string) => `${id}-model`;
export const baseUrlStorageKey = (id: string) => `${id}-base-url`;
