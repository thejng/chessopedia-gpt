export interface RetrievedDoc {
    id: string | number;
    score: number;
    payload: Record<string, any>;
}

//qdrant retrieved docs in structured format for llm
export function buildContext(docs: RetrievedDoc[]): string {
    if (docs.length === 0) return "";

    return docs.map((doc, i) => {
        const p = doc.payload;
        const cat = p.category as string | undefined;
        let block = `--- Result ${i + 1} ---\n`;

        if (cat === "glossary" || cat === "problems") {
            block += `Term: ${p.term || "Unknown"}\n`;
            block += `Definition: ${p.definition || "N/A"}\n`;

        } else if (cat === "player") {
            block += `Player Name: ${p.name || "Unknown"}\n`;
            if (p.country)   block += `Country: ${p.country}\n`;
            if (p.birthYear) block += `Birth Year: ${p.birthYear}\n`;
            if (p.deathYear) block += `Death Year: ${p.deathYear}\n`;
            if (p.profile)   block += `Profile URL: ${p.profile}\n`;

        } else if (cat === "fide_rating") {
            block += `Player: ${p.name || "Unknown"}\n`;
            block += `Rank: ${p.rank || "N/A"}\n`;
            block += `FIDE Rating: ${p.rating || "N/A"}\n`;
            block += `Federation: ${p.federation || "N/A"}\n`;
            block += `Rating Category: ${p.ratingCategory || "N/A"}\n`;

        } else if (cat === "tournament") {
            block += `Tournament: ${p.tournamentName || "Unknown"}\n`;
            if (p.city)            block += `City: ${p.city}\n`;
            if (p.country)         block += `Country: ${p.country}\n`;
            if (p.startDate)       block += `Start Date: ${p.startDate}\n`;
            if (p.endDate)         block += `End Date: ${p.endDate}\n`;
            if (p.timeControl)     block += `Time Control: ${p.timeControl}\n`;
            if (p.numberOfPlayers) block += `Players: ${p.numberOfPlayers}\n`;

        } else if (cat === "news") {
            block += `Title: ${p.title || "Unknown"}\n`;
            if (p.date) block += `Date: ${p.date}\n`;
            block += `Content: ${p.content || p.text || ""}\n`;

        } else {
            // wiki or unknown — use the raw text field
            block += p.text || JSON.stringify(p);
        }

        return block.trim();
    }).join("\n\n");
}
