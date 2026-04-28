import { NextRequest, NextResponse } from "next/server";
import { embedText }         from "../../../lib/embedder";
import { rewriteQuery }      from "../../../lib/queryRewriter";
import { retrieveDocuments } from "../../../lib/retriever";
import { rerankDocuments }   from "../../../lib/reranker";
import { buildContext }      from "../../../lib/contextBuilder";
import { ollama, CHAT_MODEL, CHAT_FALLBACK } from "../../../lib/ollama";
import { getCache, setCache } from "../../../lib/cache";
import { logger } from "../../../lib/logger";
import axios from "axios";

export async function POST(req: NextRequest) {
    try {
        const contentLength = req.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > 50_000) {
            return NextResponse.json({ error: "Request body too large" }, { status: 413 });
        }

        const { username, messages } = await req.json();

        if (!username || typeof username !== "string" || username.length > 50 || !messages?.length) {
            return NextResponse.json(
                { error: "Username and messages are required" },
                { status: 400 }
            );
        }

        const latestMessage = messages.at(-1)?.content?.trim() ?? "";
        logger.info("Profile request", { username, query: latestMessage });

        const cacheKey = `player:${username.toLowerCase()}`;
        let playerData = getCache<any>(cacheKey);

        if (!playerData) {
            try {
                const [profileRes, statsRes] = await Promise.all([
                    axios.get(`https://api.chess.com/pub/player/${username}`),
                    axios.get(`https://api.chess.com/pub/player/${username}/stats`),
                ]);
                playerData = { profile: profileRes.data, stats: statsRes.data };
                setCache(cacheKey, playerData);
            } catch {
                playerData = null;
                logger.warn(`Could not fetch Chess.com data for ${username}`);
            }
        }

        const searchQuery = rewriteQuery(`chess player ${username} ${latestMessage}`);
        const { vector } = await embedText(searchQuery);
        const rawDocs = await retrieveDocuments(vector, searchQuery, { limit: 15 });
        const topDocs = rerankDocuments(searchQuery, rawDocs, 4);
        const ragContext = buildContext(topDocs);

        const playerSummary = playerData
            ? `Username: ${username}
Rating (Rapid): ${playerData.stats?.chess_rapid?.last?.rating ?? "N/A"}
Rating (Blitz): ${playerData.stats?.chess_blitz?.last?.rating ?? "N/A"}
Rating (Bullet): ${playerData.stats?.chess_bullet?.last?.rating ?? "N/A"}
Country: ${playerData.profile?.country ?? "N/A"}
Joined: ${playerData.profile?.joined ? new Date(playerData.profile.joined * 1000).toLocaleDateString() : "N/A"}`
            : `Chess.com data unavailable for "${username}"`;

        const prompt = `You are Chessopedia GPT, an expert chess analyst.
Generate a concise player profile using the information below.

Chess.com Data:
${playerSummary}

Knowledge Base Context:
${ragContext || "No additional context found."}

User Question: ${latestMessage}

Generate a helpful, factual profile response:`;

        const tryGenerate = async (model: string) =>
            ollama.generate({ model, prompt, options: { temperature: 0.4, num_predict: 400 } });

        let result: Awaited<ReturnType<typeof tryGenerate>>;
        try {
            result = await tryGenerate(CHAT_MODEL);
        } catch {
            result = await tryGenerate(CHAT_FALLBACK);
        }

        return NextResponse.json({ profile: result.response.trim() });

    } catch (err: any) {
        logger.error("Profile route error", { error: err.message });
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}