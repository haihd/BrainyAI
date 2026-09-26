import {Storage} from "@plasmohq/storage";
import {type ApiProviderConfig, modelListStorageKey} from "~libs/chatbot/api/providers";

// Model lists can be large (OpenRouter has hundreds), too big for chrome.storage.sync items.
const localStorageArea = new Storage({area: "local"});

// Models returned by GET /models that cannot be used with /chat/completions.
const NON_CHAT_MODEL = /embed|tts|whisper|transcribe|dall-e|image|imagen|veo|sora|lyria|audio|realtime|live|moderation|aqa|babbage|davinci|computer-use|robotics/i;

const NEWNESS_PENALTY = /preview|exp|\d{4}-?\d{2}-?\d{2}|-\d{3,}$/i;

/** Splits "gemini-2.5-flash" into comparable number parts: [2, 5]. */
function versionParts(id: string): number[] {
    return (id.match(/\d+/g) ?? []).map(Number);
}

function compareVersions(a: string, b: string): number {
    const pa = versionParts(a);
    const pb = versionParts(b);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? -1) - (pb[i] ?? -1);
        if (diff) return diff;
    }
    return 0;
}

interface ModelEntry {
    id: string;
    /** Unix time the provider published the model, when the API reports it. */
    created?: number;
}

/**
 * Newest-first ordering: "*-latest" aliases, then stable ids before previews and
 * dated snapshots, then the publish date (or the version number when the provider
 * does not report one), then the shortest id.
 */
function compareNewestFirst(a: ModelEntry, b: ModelEntry): number {
    const latest = Number(/latest/i.test(b.id)) - Number(/latest/i.test(a.id));
    if (latest) return latest;
    const stable = Number(NEWNESS_PENALTY.test(a.id)) - Number(NEWNESS_PENALTY.test(b.id));
    if (stable) return stable;
    if (a.created && b.created && a.created !== b.created) return b.created - a.created;
    const version = compareVersions(b.id, a.id);
    if (version) return version;
    return a.id.length - b.id.length || a.id.localeCompare(b.id);
}

/**
 * Picks the model to use when none is set or the saved one no longer exists.
 * `ids` must be sorted newest first, as returned by fetchModelList.
 */
export function pickRecommendedModel(provider: ApiProviderConfig, ids: string[]): string | undefined {
    for (const pattern of provider.preferredModels) {
        const match = ids.find(id => pattern.test(id));
        if (match) {
            return match;
        }
    }
    return ids[0];
}

/** Loads the chat models the key can use from the provider's OpenAI-compatible GET /models, newest first. */
export async function fetchModelList(provider: ApiProviderConfig, apiKey: string, baseUrl: string): Promise<string[]> {
    const response = await fetch(`${baseUrl}/models`, {
        headers: {'Authorization': `Bearer ${apiKey}`}
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await readErrorDetail(response)}`);
    }

    const json = await response.json();
    const entries = new Map<string, ModelEntry>();
    for (const m of (json.data ?? json.models ?? []) as { id?: string, name?: string, created?: number }[]) {
        // Gemini returns "models/gemini-..." ids
        const id = (m.id ?? m.name ?? '').replace(/^models\//, '');
        if (id && !NON_CHAT_MODEL.test(id) && !entries.has(id)) {
            entries.set(id, {id, created: typeof m.created === 'number' ? m.created : undefined});
        }
    }

    const sorted = [...entries.values()].sort(compareNewestFirst).map(m => m.id);
    await localStorageArea.set(modelListStorageKey(provider.id), sorted);
    return sorted;
}

export async function getCachedModelList(provider: ApiProviderConfig): Promise<string[]> {
    return (await localStorageArea.get<string[]>(modelListStorageKey(provider.id))) ?? [];
}

export async function readErrorDetail(response: Response): Promise<string> {
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
