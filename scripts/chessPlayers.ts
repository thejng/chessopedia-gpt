import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const OUT_FILE = path.join(__dirname, "Data", "structured", "chess_players.json");

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    console.log("🌐 Navigating to Wikipedia List of Chess Players...");
    await page.goto("https://en.wikipedia.org/wiki/List_of_chess_players");

    const raw = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("ul li a[href^='/wiki/']")).map((a) => {
            const name = a.textContent?.trim() ?? "";
            const profile = new URL((a as HTMLAnchorElement).getAttribute("href") ?? "", "https://en.wikipedia.org").href;
            const parentText = (a as HTMLElement).parentElement?.textContent ?? "";
            const details = parentText.replace(name, "").trim().replace(/[()]/g, "");
            const parts = details.split(",");

            let country = "";
            let birthYear = parts.length === 2 ? parts[1].trim() : (parts[0]?.trim() ?? "");
            let deathYear = "";

            if (parts.length === 2) country = parts[0].trim();

            const match = birthYear.match(/(\d{4})\s*[–-]\s*(\d{4})?/);
            if (match) {
                birthYear = match[1] ?? "";
                deathYear = match[2] ?? "";
            } else {
                birthYear = birthYear.includes("born") ? birthYear.replace("born", "").trim() : birthYear;
            }

            return { name, country: country.trim(), birthYear, deathYear, profile };
        }).filter(p =>
            p.name.length > 1 &&
            p.profile.includes("wiki/") &&
            !p.profile.includes("Special:") &&
            !p.profile.includes("Wikipedia:") &&
            !p.profile.includes("Portal:") &&
            !p.profile.includes("Help:") &&
            !p.profile.includes("#") &&
            !["Main page", "Current events", "Help", "Learn to edit", "Article", "Talk", "Read"].includes(p.name)
        );
    });

    const structured = raw.map(r => ({
        name: r.name,
        country: r.country,
        birthYear: r.birthYear,
        deathYear: r.deathYear,
        profile: r.profile,
        category: "player",
        source: "chess_players",
        text: [
            `Name: ${r.name}`,
            r.country   ? `Country: ${r.country}`     : null,
            r.birthYear ? `Birth Year: ${r.birthYear}` : null,
            r.deathYear ? `Death Year: ${r.deathYear}` : null,
            r.profile   ? `Profile: ${r.profile}`      : null,
        ].filter(Boolean).join("\n"),
    }));

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(structured, null, 2));
    console.log(`✅ Saved ${structured.length} players → ${OUT_FILE}`);
    await browser.close();
})();
