"use client";
import { useState, useRef, useEffect } from "react";
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubble";
import PromptSuggestionsRow from "./components/PromptSuggestionsRow";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function Home() {
    const [messages, setMessages]   = useState<Message[]>([]);
    const [input, setInput]         = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef  = useRef<HTMLDivElement>(null);
    const inputRef   = useRef<HTMLTextAreaElement>(null);
    const areaRef    = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
        }
    }, [input]);

    const sendMessage = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;

        const userMsg: Message = { role: "user", content: trimmed };
        const newMessages = [...messages, userMsg];
        const assistantIndex = newMessages.length;

        setMessages([...newMessages, { role: "assistant", content: "" }]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: newMessages }),
            });

            if (!response.ok || !response.body) throw new Error(`Server error ${response.status}`);

            const reader  = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                accumulated += decoder.decode(value, { stream: true });
                setMessages(prev => {
                    const updated = [...prev];
                    updated[assistantIndex] = { role: "assistant", content: accumulated };
                    return updated;
                });
            }
        } catch {
            setMessages(prev => {
                const updated = [...prev];
                updated[assistantIndex] = {
                    role: "assistant",
                    content: "Something went wrong. Please make sure Ollama and Qdrant are running.",
                };
                return updated;
            });
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const isEmpty = messages.length === 0;

    return (
        <div className="app-shell">
            <header className="app-header">
                <div className="header-logo">
                    <span className="logo-piece">♟</span>
                    <span className="logo-text">Chessopedia</span>
                    <span className="logo-tag">GPT</span>
                </div>
                {!isEmpty && (
                    <button
                        className="clear-btn"
                        onClick={() => { setMessages([]); setInput(""); }}
                        title="Start new conversation"
                    >
                        + New chat
                    </button>
                )}
            </header>

            <main
                ref={areaRef}
                className={`chat-area ${isEmpty ? "chat-area--empty" : ""}`}
            >
                {isEmpty ? (
                    <div className="hero">
                        <span className="hero-piece" aria-hidden>♛</span>
                        <h1 className="hero-title">
                            What do you want to know<br />about chess?
                        </h1>
                        <p className="hero-sub">
                            Ask about openings, tactics, FIDE ratings, player history, or any chess concept.
                        </p>
                        <PromptSuggestionsRow onPromptClick={sendMessage} />
                    </div>
                ) : (
                    <div className="thread">
                        {messages.map((msg, i) => {
                            const isLast = i === messages.length - 1;
                            if (isLast && msg.role === "assistant" && msg.content === "" && isLoading) {
                                return <LoadingBubble key={i} />;
                            }
                            return (
                                <Bubble
                                    key={i}
                                    message={msg}
                                    isStreaming={isLoading && isLast && msg.role === "assistant"}
                                />
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>
                )}
            </main>

            <div className="input-dock">
                <div className="input-wrap">
                    <textarea
                        id="chess-question-input"
                        ref={inputRef}
                        className="chat-input"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything about chess…"
                        rows={1}
                        disabled={isLoading}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <button
                        id="send-button"
                        className="send-btn"
                        onClick={() => sendMessage(input)}
                        disabled={isLoading || !input.trim()}
                        title="Send message"
                    >
                        {isLoading
                            ? <span className="btn-spinner" />
                            : <span>♟</span>
                        }
                    </button>
                </div>
                <p className="input-hint">Enter to send · Shift+Enter for new line</p>
            </div>
        </div>
    );
}
