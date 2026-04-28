import { ollama, EMBED_MODEL, EMBED_FALLBACK } from "./ollama";
import { getCache, setCache } from "./cache";
import { logger } from "./logger";

export interface EmbedResult {
    vector: number[];
    model: string;
    isFallback: boolean;
    cached: boolean;
}

function normalizeVector(v: number[]): number[] {
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return norm === 0 ? v : v.map(x => x / norm);
}

async function tryEmbed(model: string, text: string): Promise<number[]> {
    const res = await ollama.embed({
        model,
        input: text,
        keep_alive: "0",
    });
    const vec = res.embeddings[0];
    if (!vec || vec.length === 0) throw new Error(`Empty embedding from ${model}`);
    return vec;
}

export async function embedText(text: string): Promise<EmbedResult> {
    const cacheKey = `embed:${text.slice(0, 200)}`;
    const cached = getCache<{ vector: number[]; model: string }>(cacheKey);
    if (cached) {
        logger.debug(`Embed cache hit`);
        return { vector: cached.vector, model: cached.model, isFallback: false, cached: true };
    }

    let result: EmbedResult;
    try {
        logger.debug(`Embedding with ${EMBED_MODEL}`);
        const vector = normalizeVector(await tryEmbed(EMBED_MODEL, text));
        result = { vector, model: EMBED_MODEL, isFallback: false, cached: false };
    } catch (err: any) {
        logger.warn(`Primary embed failed, trying fallback ${EMBED_FALLBACK}`, { error: err.message });
        try {
            const vector = normalizeVector(await tryEmbed(EMBED_FALLBACK, text));
            result = { vector, model: EMBED_FALLBACK, isFallback: true, cached: false };
        } catch (fallbackErr: any) {
            logger.error("Both embedding models failed", { error: fallbackErr.message });
            throw new Error("All embedding models unavailable. Is Ollama running?");
        }
    }

    setCache(cacheKey, { vector: result.vector, model: result.model }, 1800);
    return result;
}
