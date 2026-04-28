import { logger } from "./logger";
import type { RetrievedDoc } from "./contextBuilder";

export function rerankDocuments(
    query: string,
    docs: RetrievedDoc[],
    topK = 5
): RetrievedDoc[] {
    if (docs.length <= topK) return docs;

    // Extract query tokens
    const queryTokens = new Set(
        query
            .toLowerCase()
            .split(/\s+/)
            .map(w => w.replace(/[^a-z0-9]/g, ""))
            .filter(w => w.length > 2)
    );

    // Normalising vector scores to [0, 1] range
    const maxScore = Math.max(...docs.map(d => d.score), 1);
    const minScore = Math.min(...docs.map(d => d.score), 0);
    const scoreRange = maxScore - minScore || 1;

    const scored = docs.map(doc => {
        // 1. Normalised vector score
        const normVec = (doc.score - minScore) / scoreRange;

        // 2. Keyword overlap score
        const text = (doc.payload.text || "").toLowerCase();
        let hits = 0;
        for (const token of queryTokens) {
            if (text.includes(token)) hits++;
        }
        const kwScore = queryTokens.size > 0 ? hits / queryTokens.size : 0;

        // 3. Exact term/name bonus
        const term = (doc.payload.term || doc.payload.name || "").toLowerCase();
        const exactBonus = queryTokens.has(term) ? 0.15 : 0;

        const finalScore = 0.65 * normVec + 0.35 * kwScore + exactBonus;

        return { ...doc, score: finalScore };
    });

    const reranked = scored.sort((a, b) => b.score - a.score).slice(0, topK);
    logger.debug(`Reranked ${docs.length} to ${reranked.length} docs`);
    return reranked;
}
