# Chessopedia GPT

A local RAG (Retrieval-Augmented Generation) chess assistant. Ask about openings, tactics, FIDE ratings, player history, and any chess concept — powered by Ollama and Qdrant running on your own machine.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Vanilla CSS |
| LLM & Embeddings | Ollama (local) |
| Vector DB | Qdrant (local Docker) |
| Cache | node-cache (in-memory, 15-min TTL) |
| External API | Chess.com public API (player stats) |

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Docker](https://www.docker.com/) (for Qdrant)
- [Ollama](https://ollama.com/) installed and running

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` if your Ollama or Qdrant runs on a non-default port. No API keys required — everything runs locally.

### 3. Pull required Ollama models

```bash
ollama pull qwen2.5:7b
ollama pull qwen3-embedding:0.6b
```

### 4. Start Qdrant

```bash
docker run -d -p 6333:6333 --name qdrant qdrant/qdrant
```

### 5. Create the Qdrant collection

```bash
npm run setup-qdrant
```

### 6. Seed the knowledge base

```bash
npm run seed
```

> **Note:** Structured data files (`scripts/Data/structured/*.json`) are not included in the repository. Generate them first by running the scraper scripts in `scripts/`.

### 7. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Build for production |
| `npm run setup-qdrant` | Create the Qdrant collection and indexes |
| `npm run seed` | Embed and upsert all structured data into Qdrant |
| `npm run restructure` | Re-process raw scraped data into structured JSON |

## Architecture

```
User query
  → POST /api/chat
  → Query rewrite (pass-through)
  → Embed with qwen3-embedding:0.6b
  → Hybrid retrieval (vector + keyword, RRF fusion)
  → Re-rank top 5 docs (pure compute, no LLM)
  → Build context string
  → Stream answer from qwen2.5:7b
```

## Security Notes

- All inference is fully local — no data leaves your machine.
- The `.env` file is gitignored. Never commit it.
- API routes validate request body size (50 KB max) and input lengths.
