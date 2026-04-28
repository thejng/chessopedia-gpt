import fs from "fs";
import path from "path";

const RAW_DIR = path.join(__dirname, "Data");
const OUT_DIR = path.join(__dirname, "Data", "structured");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function makeText(fields: Record<string, string | undefined>): string {
    return Object.entries(fields)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
}

// ── 1. Chess Glossary ──────────────────────────────────────────────────────
function processGlossary(file: string, category: "glossary" | "problems") {
    const raw: { term: string; definition: string }[] = JSON.parse(
        fs.readFileSync(path.join(RAW_DIR, file), "utf-8")
    );
    const out = raw
        .filter(r => r.term && r.definition)
        .map(r => ({
            term: r.term.trim(),
            definition: r.definition.trim(),
            category,
            source: file.replace(".json", ""),
            text: makeText({ Term: r.term.trim(), Definition: r.definition.trim() }),
        }));
    const outFile = path.join(OUT_DIR, file);
    fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
    console.log(`✅ ${file}: ${out.length} records`);
}

// ── 2. Chess Players ───────────────────────────────────────────────────────
function processPlayers() {
    const raw: any[] = JSON.parse(
        fs.readFileSync(path.join(RAW_DIR, "chess_players.json"), "utf-8")
    );
    const out = raw
        .filter(r => r.name && r.name.length > 1)
        .map(r => ({
            name: r.name?.trim() || "",
            country: r.country?.trim() || "",
            birthYear: r.birthYear?.trim() || "",
            deathYear: r.deathYear?.trim() || "",
            profile: r.profile?.trim() || "",
            category: "player",
            source: "chess_players",
            text: makeText({
                "Name": r.name,
                "Country": r.country,
                "Birth Year": r.birthYear,
                "Death Year": r.deathYear || undefined,
                "Profile": r.profile,
            }),
        }));
    fs.writeFileSync(path.join(OUT_DIR, "chess_players.json"), JSON.stringify(out, null, 2));
    console.log(`✅ chess_players.json: ${out.length} records`);
}

// ── 3. FIDE Ratings ────────────────────────────────────────────────────────
function processFideRatings() {
    const raw: any[] = JSON.parse(
        fs.readFileSync(path.join(RAW_DIR, "fide_ratings.json"), "utf-8")
    );
    const out = raw
        .filter(r => r.name && r.rating)
        .map(r => ({
            rank: r.rank?.toString().trim() || "",
            name: r.name?.trim() || "",
            federation: r.federation?.trim() || "",
            rating: r.rating?.toString().trim() || "",
            birthYear: r.birthYear?.toString().trim() || "",
            ratingCategory: r.category?.trim() || "open",
            category: "fide_rating",
            source: "fide_ratings",
            text: makeText({
                "Rank": r.rank,
                "Name": r.name,
                "Federation": r.federation,
                "Rating": r.rating,
                "Birth Year": r.birthYear,
                "Rating Category": r.category,
            }),
        }));
    fs.writeFileSync(path.join(OUT_DIR, "fide_ratings.json"), JSON.stringify(out, null, 2));
    console.log(`✅ fide_ratings.json: ${out.length} records`);
}

// ── 4. FIDE Tournaments ────────────────────────────────────────────────────
function processTournaments() {
    const raw: any[] = JSON.parse(
        fs.readFileSync(path.join(RAW_DIR, "fide_tournaments.json"), "utf-8")
    );
    const out = raw
        .filter(r => r["Tournament Name"] || r.tournamentName)
        .map(r => {
            const name = r["Tournament Name"] || r.tournamentName || "";
            return {
                tournamentName: name.trim(),
                city: (r.City || r.city || "").trim(),
                country: (r.Country || r.country || "").trim(),
                startDate: (r["Start Date"] || r.startDate || "").trim(),
                endDate: (r["End Date"] || r.endDate || "").trim(),
                timeControl: (r["Time Control"] || r.timeControl || "").trim(),
                numberOfPlayers: (r["Number of players"] || r.numberOfPlayers || "").toString().trim(),
                chiefArbiter: (r["Chief Arbiter"] || r.chiefArbiter || "").trim(),
                tournamentURL: r.tournamentURL || "",
                category: "tournament",
                source: "fide_tournaments",
                text: makeText({
                    "Tournament": name,
                    "City": r.City || r.city,
                    "Country": r.Country || r.country,
                    "Start Date": r["Start Date"] || r.startDate,
                    "End Date": r["End Date"] || r.endDate,
                    "Time Control": r["Time Control"] || r.timeControl,
                    "Players": (r["Number of players"] || r.numberOfPlayers)?.toString(),
                }),
            };
        });
    fs.writeFileSync(path.join(OUT_DIR, "fide_tournaments.json"), JSON.stringify(out, null, 2));
    console.log(`✅ fide_tournaments.json: ${out.length} records`);
}

// ── 5. Chess Wiki ──────────────────────────────────────────────────────────
function processWiki() {
    const raw: any[] = JSON.parse(
        fs.readFileSync(path.join(RAW_DIR, "chess_wiki.json"), "utf-8")
    );
    const out = raw
        .filter(r => r.heading && r.content)
        .map(r => ({
            heading: r.heading.trim(),
            content: r.content.trim(),
            category: "wiki",
            source: "chess_wiki",
            text: `Section: ${r.heading.trim()}\nContent: ${r.content.trim()}`,
        }));
    fs.writeFileSync(path.join(OUT_DIR, "chess_wiki.json"), JSON.stringify(out, null, 2));
    console.log(`✅ chess_wiki.json: ${out.length} records`);
}

// ── 6. Chess News ──────────────────────────────────────────────────────────
function processNews() {
    const raw: any[] = JSON.parse(
        fs.readFileSync(path.join(RAW_DIR, "chessNewsDatav1.json"), "utf-8")
    );
    const out = raw
        .filter(r => r.title && r.content && r.content.length > 20)
        .map(r => ({
            title: r.title.trim(),
            date: (r.date || "").trim(),
            content: r.content.trim(),
            category: "news",
            source: "chess_news",
            text: makeText({
                "Title": r.title,
                "Date": r.date || undefined,
                "Content": r.content,
            }),
        }));
    fs.writeFileSync(path.join(OUT_DIR, "chessNewsDatav1.json"), JSON.stringify(out, null, 2));
    console.log(`✅ chessNewsDatav1.json: ${out.length} records`);
}

// ── Run all ────────────────────────────────────────────────────────────────
console.log("🔄 Restructuring all data files...\n");
processGlossary("chess_glossary.json", "glossary");
processGlossary("chess_problems_glossary.json", "problems");
processPlayers();
processFideRatings();
processTournaments();
processWiki();
processNews();
console.log("\n✅ All files restructured → scripts/Data/structured/");
