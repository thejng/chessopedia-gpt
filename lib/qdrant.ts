import { QdrantClient } from "@qdrant/js-client-rest";

export const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "chessopedia_gpt";
export const VECTOR_DIM = parseInt(process.env.OLLAMA_EMBED_DIM || "1024", 10);

export const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL || "http://localhost:6333",
});
