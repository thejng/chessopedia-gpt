"use client";
import React from "react";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface BubbleProps {
    message: Message;
    isStreaming?: boolean;
}

function renderInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    if (parts.length === 1) return text; 
    return parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
            ? <strong key={i}>{part.slice(2, -2)}</strong>
            : part
    );
}

const Bubble: React.FC<BubbleProps> = ({ message, isStreaming }) => {
    const isUser = message.role === "user";

    if (isUser) {
        return (
            <div className="message message--user">
                <div className="message-meta">
                    <span className="meta-label">You</span>
                </div>
                <div className="message-body">
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <div className="message message--assistant">
            <div className="message-meta">
                <span className="meta-icon">♟</span>
                <span className="meta-label">Chessopedia</span>
            </div>
            <div className="message-body">
                {renderInline(message.content)}
                {isStreaming && message.content !== "" && (
                    <span className="stream-cursor" aria-hidden />
                )}
            </div>
        </div>
    );
};

export default Bubble;