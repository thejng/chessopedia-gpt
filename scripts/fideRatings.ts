import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const OUT_FILE = path.join(__dirname, "Data", "structured", "fide_ratings.json");

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    console.log("🌐 Navigating to FIDE Top Lists...");
    await page.goto("https://ratings.fide.com/top_lists.phtml?list=open", { waitUntil: "networkidle2" });

    const categories = await page.evaluate(() =>
        Array.from(document.querySelectorAll(".switcher"))
            .map(el => el.getAttribute("data-value"))
            .filter(Boolean) as string[]
    );
    console.log("📋 Categories found:", categories);

    let allPlayers: any[] = [];

    for (const category of categories) {
        console.log(`🔍 Scraping category: ${category}`);
        await page.evaluate((cat) => {
            const tab = document.querySelector(`.switcher[data-value="${cat}"]`);
            if (tab) (tab as HTMLElement).click();
        }, category);

        await page.waitForSelector(".top_recors_table tbody tr");

        const players = await page.evaluate((cat) => {
            const tab = document.querySelector(`div[aria-hidden="false"]`);
            if (!tab) return [];
            return Array.from(tab.querySelectorAll("table.top_recors_table tbody tr")).map(row => {
                const cols = row.querySelectorAll("td");
                return {
                    rank:       cols[0]?.textContent?.trim() ?? "",
                    name:       cols[1]?.textContent?.trim() ?? "",
                    federation: cols[2]?.textContent?.trim().split("\n").pop() ?? "",
                    rating:     cols[3]?.textContent?.trim() ?? "",
                    birthYear:  cols[4]?.textContent?.trim() ?? "",
                    ratingCategory: cat,
                };
            }).slice(0, 100);
        }, category);

        console.log(`✅ Scraped ${players.length} players from ${category}`);
        allPlayers = allPlayers.concat(players);
    }

    const structured = allPlayers
        .filter(p => p.name && p.rating)
        .map(p => ({
            rank: p.rank,
            name: p.name,
            federation: p.federation,
            rating: p.rating,
            birthYear: p.birthYear,
            ratingCategory: p.ratingCategory,
            category: "fide_rating",
            source: "fide_ratings",
            text: [
                `Rank: ${p.rank}`,
                `Name: ${p.name}`,
                `Federation: ${p.federation}`,
                `Rating: ${p.rating}`,
                p.birthYear ? `Birth Year: ${p.birthYear}` : null,
                `Rating Category: ${p.ratingCategory}`,
            ].filter(Boolean).join("\n"),
        }));

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(structured, null, 2));
    console.log(`✅ Saved ${structured.length} FIDE ratings → ${OUT_FILE}`);
    await browser.close();
})();
