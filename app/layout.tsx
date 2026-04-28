import "./global.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Chessopedia GPT — Your Chess Intelligence",
    description: "Ask anything about chess — openings, tactics, FIDE ratings, player profiles, history, and more. Powered by a local AI knowledge base.",
    keywords: "chess AI, chess openings, FIDE ratings, chess tactics, chess history, chess GPT",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="icon" href="/favicon.ico" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body suppressHydrationWarning>{children}</body>
        </html>
    );
}
