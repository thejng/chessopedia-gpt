import { QdrantClient } from "@qdrant/js-client-rest";
import { Ollama } from "ollama";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import "dotenv/config";

const COLLECTION  = process.env.QDRANT_COLLECTION || "chessopedia_gpt";
const VECTOR_DIM  = parseInt(process.env.OLLAMA_EMBED_DIM || "1024", 10);
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "qwen3-embedding:0.6b";
const EMBED_FALLBACK = process.env.OLLAMA_EMBED_FALLBACK || "bge-m3";

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333" });
const ollama = new Ollama({ host: process.env.OLLAMA_URL || "http://localhost:11434" });

const STRUCTURED_DIR = path.join(__dirname, "Data", "structured");
const BATCH_SIZE = 20;

// Deterministic UUID from text content — makes seeding idempotent
function textToId(text: string): string {
    const h = createHash("md5").update(text).digest("hex");
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

function normalizeVector(v: number[]): number[] {
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return norm === 0 ? v : v.map(x => x / norm);
}

async function embed(text: string): Promise<number[]> {
    try {
        const res = await ollama.embed({ model: EMBED_MODEL, input: text });
        return normalizeVector(res.embeddings[0]);
    } catch {
        console.warn(`  ⚠️  Primary embed failed, trying ${EMBED_FALLBACK}`);
        const res = await ollama.embed({ model: EMBED_FALLBACK, input: text });
        return normalizeVector(res.embeddings[0]);
    }
}

// Splitter for long-text fields (wiki, news)
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 512, chunkOverlap: 80 });

interface StructuredRecord {
    text: string;
    category: string;
    [key: string]: any;
}

async function seedFile(filename: string, needsChunking: boolean) {
    const filePath = path.join(STRUCTURED_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`  ⚠️  File not found: ${filePath} — skipping`);
        return;
    }

    const records: StructuredRecord[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    console.log(`\n📄 Seeding ${filename} (${records.length} records)...`);

    let inserted = 0;
    let skipped  = 0;
    const batchPoints: any[] = [];

    const flushBatch = async () => {
        if (batchPoints.length === 0) return;
        await qdrant.upsert(COLLECTION, { wait: true, points: batchPoints });
        batchPoints.length = 0;
    };

    for (const record of records) {
        const rawText = record.text || "";
        if (!rawText) { skipped++; continue; }

        const chunks = needsChunking ? await splitter.splitText(rawText) : [rawText];

        for (const chunk of chunks) {
            if (chunk.trim().length < 10) continue;
            try {
                const vector = await embed(chunk);
                const { text: _t, ...payloadRest } = record;

                batchPoints.push({
                    id:      textToId(chunk),
                    vector,
                    payload: { ...payloadRest, text: chunk },
                });
                inserted++;

                if (batchPoints.length >= BATCH_SIZE) {
                    await flushBatch();
                    process.stdout.write(`\r  ⬆️  Inserted: ${inserted}`);
                }
            } catch (err: any) {
                console.error(`\n  ❌ Embed error for chunk: ${err.message}`);
                skipped++;
            }
        }
    }

    await flushBatch();
    console.log(`\n  ✅ Done — inserted: ${inserted}, skipped: ${skipped}`);
}

// ── Dataset order: small files first, large (news) last ───────────────────
async function main() {
    console.log("🚀 Starting Qdrant seeding pipeline...");
    console.log(`   Embedding model : ${EMBED_MODEL}`);
    console.log(`   Collection      : ${COLLECTION}`);
    console.log(`   Vector dim      : ${VECTOR_DIM}\n`);

    // Verify Qdrant connection
    await qdrant.getCollections();
    console.log("✅ Qdrant connected\n");

    // No chunking needed (short records)
    await seedFile("chess_glossary.json",          false);
    await seedFile("chess_problems_glossary.json", false);
    await seedFile("chess_players.json",           false);
    await seedFile("fide_ratings.json",            false);
    await seedFile("fide_tournaments.json",        false);

    // Chunking needed (longer text)
    await seedFile("chess_wiki.json",              true);
    await seedFile("chessNewsDatav1.json",         true);   // largest — seeded last

    console.log("\n🎉 Seeding complete! Your Qdrant DB is ready.");
    console.log("   Dashboard: http://localhost:6333/dashboard");
}

main().catch(err => {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
});
