import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

const BASE_URL = "https://old.chesstempo.com/chess-openings.html";
const DATA_FILE = path.join("data", "chesstempo_openings.json");

async function scrapeChessTempoOpenings() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    console.log("🌐 Visiting ChessTempo Openings page...");
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    const openings = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".openingsTable a"))
            .map(link => {
                const anchor = link as HTMLAnchorElement; // Explicitly cast to HTMLAnchorElement
                return {
                    name: anchor.textContent?.trim() || "",
                    url: anchor.href.startsWith("http") ? anchor.href : `https://old.chesstempo.com${anchor.getAttribute("href")}`
                };
            });
    });

    console.log(`✅ Found ${openings.length} openings.`);

    let results: any[] = [];

    for (const opening of openings) {
        console.log(`🔍 Scraping ${opening.name}...`);
        try {
            const openingPage = await browser.newPage();
            await openingPage.goto(opening.url, { waitUntil: "domcontentloaded" });

            const details = await openingPage.evaluate(() => {
                const movesElement = document.querySelector(".openingMoves");
                const descriptionElement = document.querySelector(".openingDescription");

                return {
                    moves: movesElement ? movesElement.textContent?.trim() || "No moves found" : "No moves found",
                    description: descriptionElement ? descriptionElement.textContent?.trim() || "No description available" : "No description available"
                };
            });

            results.push({
                name: opening.name,
                url: opening.url,
                moves: details.moves,
                description: details.description
            });

            await openingPage.close();
        } catch (error) {
            console.error(`❌ Error scraping ${opening.name}:`, error);
        }
    }

    await browser.close();

    // Ensure data folder exists
    if (!fs.existsSync("data")) {
        fs.mkdirSync("data");
    }

    // Save results to JSON
    fs.writeFileSync(DATA_FILE, JSON.stringify(results, null, 2), "utf-8");
    console.log(`📂 Data saved to ${DATA_FILE}`);
}

scrapeChessTempoOpenings().catch(console.error);
