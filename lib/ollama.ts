import { Ollama } from "ollama";

export const ollama = new Ollama({
    host: process.env.OLLAMA_URL || "http://localhost:11434",
});

export const EMBED_MODEL   = process.env.OLLAMA_EMBED_MODEL    || "qwen3-embedding:0.6b";
export const EMBED_FALLBACK = process.env.OLLAMA_EMBED_FALLBACK || "bge-m3";
export const CHAT_MODEL    = process.env.OLLAMA_CHAT_MODEL     || "qwen2.5:7b";
export const CHAT_FALLBACK = process.env.OLLAMA_CHAT_FALLBACK  || "qwen3:4b";
