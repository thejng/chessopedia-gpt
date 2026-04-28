import { NextRequest } from "next/server";
import { embedText }         from "../../../lib/embedder";
import { rewriteQuery }      from "../../../lib/queryRewriter";
import { retrieveDocuments } from "../../../lib/retriever";
import { rerankDocuments }   from "../../../lib/reranker";
import { buildContext }      from "../../../lib/contextBuilder";
import { generateAnswer }    from "../../../lib/generator";
import { logger }            from "../../../lib/logger";

export const runtime = "nodejs";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export async function POST(req: NextRequest) {
    try {
        const contentLength = req.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > 50_000) {
            return new Response(JSON.stringify({ error: "Request body too large" }), { status: 413 });
        }

        const body = await req.json();
        const messages: Message[] = body.messages ?? [];

        if (!messages.length) {
            return new Response(JSON.stringify({ error: "No messages provided" }), { status: 400 });
        }

        const latestMessage = messages.at(-1)?.content?.trim() ?? "";
        if (!latestMessage) {
            return new Response(JSON.stringify({ error: "Empty message" }), { status: 400 });
        }

        logger.info("Chat request", { message: latestMessage });

        const searchQuery = rewriteQuery(latestMessage);

        const { vector, model: embedModel, isFallback } = await embedText(searchQuery);
        if (isFallback) logger.warn("Using fallback embedding model");

        const rawDocs = await retrieveDocuments(vector, searchQuery, { limit: 20 });

        if (rawDocs.length === 0) {
            logger.warn("No documents found in Qdrant");
            const empty = new ReadableStream({
                start(c) {
                    c.enqueue(new TextEncoder().encode(
                        "I couldn't find relevant chess information for that query. Please try rephrasing your question."
                    ));
                    c.close();
                },
            });
            return new Response(empty, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }

        logger.info(`Retrieved ${rawDocs.length} docs with ${embedModel}`);

        const topDocs = rerankDocuments(searchQuery, rawDocs, 5);
        logger.info(`Reranked to ${topDocs.length} docs`);

        const context = buildContext(topDocs);
        const stream = await generateAnswer(context, messages);

        return new Response(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Transfer-Encoding": "chunked",
                "X-Embed-Model": embedModel,
            },
        });

    } catch (err: any) {
        logger.error("Chat route error", { error: err.message });
        return new Response(
            JSON.stringify({ error: err.message || "Internal Server Error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}