import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import fs from "fs";

const chessopediaData = [
    "https://www.chess.com/players",
    "https://ratings.fide.com/top.phtml?list=men",
    "https://www.chesstempo.com/game-database.html",
    "https://www.chessify.me/",
    "https://en.wikipedia.org/wiki/List_of_chess_games",
    "https://www.chess.com/openings",
    "https://www.chesstempo.com/chess-openings.html",
    "https://en.wikipedia.org/wiki/Chess_endgame",
    "https://www.chesstempo.com/chess-tactics.html"
];

// Function to scrape a webpage
const scrapePage = async (url: string) => {
    console.log(`🔍 Scraping: ${url}`);
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: { headless: true },
        gotoOptions: { waitUntil: "domcontentloaded" },
        evaluate: async (page, browser) => {
            const result = await page.evaluate(() => document.body.innerText);
            await browser.close();
            return result;
        }
    });

    return (await loader.scrape()) || "";
};

// Function to scrape multiple pages and save data
const scrapeAndSaveData = async () => {
    const scrapedData: { url: string; content: string }[] = [];

    for await (const url of chessopediaData) {
        const content = await scrapePage(url);
        scrapedData.push({ url, content });
    }

    fs.writeFileSync("./src/data/rawData.json", JSON.stringify(scrapedData, null, 2));
    console.log("✅ Scraped data saved to rawData.json");
};

scrapeAndSaveData();
