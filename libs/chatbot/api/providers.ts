import IconOpenAI from "data-base64:~assets/simple-icons_openai.svg";
import IconGemini from "data-base64:~assets/gemini.svg";
import IconDeepSeek from "data-base64:~assets/deepseek.svg";
import IconApi from "data-base64:~assets/api.svg";
import IconKimi from "data-base64:~assets/kimi.png";

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
    /** Help text under the base URL field. */
    baseUrlHint?: string;
    /**
     * Used until the user picks a model. Prefer a "latest" alias where the provider
     * offers one, so new releases are picked up without a code change.
     */
    defaultModel: string;
    /** Offline suggestions for the model field. The live list from GET /models is preferred. */
    modelSuggestions: string[];
    /**
     * Used to pick a model automatically from the live model list, e.g. when the saved
     * model has been retired. The first pattern with a match wins; among its matches
     * the newest-looking id is chosen (see pickRecommendedModel).
     */
    preferredModels: RegExp[];
    /** Where the user creates an API key. */
    apiKeyUrl: string;
    /** Text of the apiKeyUrl link; defaults to "Get an API key". */
    apiKeyLinkLabel?: string;
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
        defaultModel: "gpt-5-mini",
        modelSuggestions: ["gpt-5-mini", "gpt-5", "gpt-5-nano"],
        preferredModels: [/^gpt-\d+(\.\d+)?-mini$/, /^gpt-\d/],
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
        // Alias that Google moves to each new Flash release
        defaultModel: "gemini-flash-latest",
        modelSuggestions: ["gemini-flash-latest", "gemini-flash-lite-latest"],
        preferredModels: [/^gemini-flash-latest$/, /^gemini-[\d.]+-flash$/, /flash/],
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
        // deepseek-chat / deepseek-reasoner were retired on 2026-07-24
        defaultModel: "deepseek-v4-flash",
        modelSuggestions: ["deepseek-v4-flash", "deepseek-v4-pro"],
        preferredModels: [/flash/, /chat/, /^deepseek/],
        apiKeyUrl: "https://platform.deepseek.com/api_keys",
        apiKeyPlaceholder: "sk-...",
        logoSrc: IconDeepSeek,
        maxTokenLimit: 64000,
    },
    {
        id: "moonshot",
        label: "Kimi",
        vendor: "Moonshot (Kimi)",
        baseUrl: "https://api.moonshot.ai/v1",
        // Keys from the China platform only work with https://api.moonshot.cn/v1
        editableBaseUrl: true,
        baseUrlHint: "Use https://api.moonshot.cn/v1 for keys from the China platform.",
        defaultModel: "kimi-k3",
        modelSuggestions: ["kimi-k3", "kimi-k2.6"],
        preferredModels: [/^kimi-k[\d.]+$/, /^kimi/],
        apiKeyUrl: "https://platform.kimi.ai/",
        apiKeyPlaceholder: "sk-...",
        logoSrc: IconKimi,
        maxTokenLimit: 256000,
    },
    {
        // Any other OpenAI-compatible service: OpenRouter, Groq, Mistral, xAI, LM Studio, ...
        id: "custom",
        label: "Custom API",
        vendor: "Custom (OpenAI-compatible)",
        baseUrl: "",
        editableBaseUrl: true,
        baseUrlHint: "The URL before /chat/completions, e.g. https://openrouter.ai/api/v1",
        defaultModel: "",
        modelSuggestions: [],
        preferredModels: [],
        apiKeyUrl: "https://platform.openai.com/docs/api-reference/chat",
        apiKeyLinkLabel: "API reference",
        apiKeyPlaceholder: "API key",
        logoSrc: IconApi,
        maxTokenLimit: 128000,
    },
];

export const apiKeyStorageKey = (id: string) => `${id}-api-key`;
export const modelStorageKey = (id: string) => `${id}-model`;
export const baseUrlStorageKey = (id: string) => `${id}-base-url`;
/** Cached result of the provider's GET /models. */
export const modelListStorageKey = (id: string) => `${id}-models`;
