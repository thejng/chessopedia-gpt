import { qdrant, COLLECTION_NAME } from "./qdrant";
import { logger } from "./logger";

export interface RetrievedDoc {
    id: string | number;
    score: number;
    payload: Record<string, any>;
}

//merges two ranked lists into one
function fuseRRF(listA: RetrievedDoc[], listB: RetrievedDoc[], k = 60): RetrievedDoc[] {
    const scores = new Map<string, number>();
    const docMap = new Map<string, RetrievedDoc>();

    const scoreList = (list: RetrievedDoc[]) => {
        list.forEach((doc, rank) => {
            const key = String(doc.id);
            scores.set(key, (scores.get(key) ?? 0) + 1 / (k + rank + 1));
            if (!docMap.has(key)) docMap.set(key, doc);
        });
    };

    scoreList(listA);
    scoreList(listB);

    return [...scores.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key, score]) => ({ ...docMap.get(key)!, score }));
}

export async function retrieveDocuments(
    vector: number[],
    queryText: string,
    opts: { limit?: number; categoryFilter?: string } = {}
): Promise<RetrievedDoc[]> {
    const { limit = 20, categoryFilter } = opts;

    const filter = categoryFilter
        ? { must: [{ key: "category", match: { value: categoryFilter } }] }
        : undefined;

    const keywords = queryText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 6);

    // Run vector search and keyword search  parallelly
    const vectorSearchPromise = qdrant.search(COLLECTION_NAME, {
        vector,
        limit,
        filter,
        with_payload: true,
    });

    const keywordSearchPromise = keywords.length > 0
        ? qdrant.scroll(COLLECTION_NAME, {
            filter: {
                should: keywords.map(kw => ({ key: "text", match: { text: kw } })),
                ...(categoryFilter ? { must: [{ key: "category", match: { value: categoryFilter } }] } : {}),
            },
            limit: 10,
            with_payload: true,
        }).catch((err: Error) => {
            logger.warn("Keyword search failed, vector-only", { error: err.message });
            return { points: [] };
        })
        : Promise.resolve({ points: [] });

    const [vectorResults, kwResult] = await Promise.all([vectorSearchPromise, keywordSearchPromise]);

    const vectorDocs: RetrievedDoc[] = vectorResults.map(r => ({
        id: r.id,
        score: r.score,
        payload: (r.payload as Record<string, any>) ?? {},
    }));

    const keywordDocs: RetrievedDoc[] = (kwResult.points ?? []).map(p => ({
        id: p.id,
        score: 0.5,
        payload: (p.payload as Record<string, any>) ?? {},
    }));

    logger.debug(`Vector: ${vectorDocs.length} | Keyword: ${keywordDocs.length}`);
    const fused = fuseRRF(vectorDocs, keywordDocs);
    return fused.slice(0, limit);
}
