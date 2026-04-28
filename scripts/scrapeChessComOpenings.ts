import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import "dotenv/config";

const DATA_FOLDER = "data";
const FILE_PATH = path.join(DATA_FOLDER, "chesscom_openings.json");

const ensureDataFolderExists = () => {
    if (!fs.existsSync(DATA_FOLDER)) {
        fs.mkdirSync(DATA_FOLDER);
    }
};

const saveDataToFile = (data: any) => {
    ensureDataFolderExists();
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
    console.log(`✅ Data saved to ${FILE_PATH}`);
};

const scrapeChessComOpenings = async () => {
    console.log("🔍 Launching browser...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://www.chess.com/openings", { waitUntil: "domcontentloaded" });
    console.log("🔍 Scraping main Chess.com openings page...");

    const openingLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("a.openings-game-name"))
            .map(link => (link as HTMLAnchorElement).href);
    });

    console.log(`🔗 Found ${openingLinks.length} opening links`);
    const openingsData: any[] = [];

    for (const link of openingLinks) {
        console.log(`📄 Scraping ${link}...`);
        const newPage = await browser.newPage();
        await newPage.goto(link, { waitUntil: "domcontentloaded" });

        const content = await newPage.evaluate(() => {
            return document.querySelector(".article-content")?.textContent?.trim() || "No relevant content found";
        });

        openingsData.push({ url: link, content });
        await newPage.close();
    }

    await browser.close();
    saveDataToFile(openingsData);
};

scrapeChessComOpenings().catch(console.error);