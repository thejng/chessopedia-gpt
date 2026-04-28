import { QdrantClient } from "@qdrant/js-client-rest";
import "dotenv/config";

const COLLECTION = process.env.QDRANT_COLLECTION || "chessopedia_gpt";
const VECTOR_DIM  = parseInt(process.env.OLLAMA_EMBED_DIM || "1024", 10);
const client = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333" });

async function setup() {
    console.log("🚀 Connecting to Qdrant...");

    // Check if collection already exists
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION);

    if (exists) {
        console.log(`⚠️  Collection "${COLLECTION}" already exists. Deleting and recreating...`);
        await client.deleteCollection(COLLECTION);
    }

    // Create collection with 1024-dim cosine vectors
    await client.createCollection(COLLECTION, {
        vectors: { size: VECTOR_DIM, distance: "Cosine" },
    });
    console.log(`✅ Collection "${COLLECTION}" created (${VECTOR_DIM}-dim, Cosine)`);

    // Create full-text index on "text" for keyword search
    await client.createPayloadIndex(COLLECTION, {
        field_name: "text",
        field_schema: "text",
    });
    console.log("✅ Full-text index on 'text' field");

    // Create keyword indexes on payload fields for filtering
    for (const field of ["category", "source"]) {
        await client.createPayloadIndex(COLLECTION, {
            field_name: field,
            field_schema: "keyword",
        });
        console.log(`✅ Keyword index on '${field}' field`);
    }

    console.log("\n🎉 Qdrant setup complete! Run 'npm run seed' next.");
}

setup().catch(err => {
    console.error("❌ Setup failed:", err.message);
    process.exit(1);
});
