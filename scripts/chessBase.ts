import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const BASE_URL = "https://chessbase.in";
const MAX_PAGES = 50;
const ARTICLES_PER_PAGE = 15;
const OUT_FILE = path.join(__dirname, "Data", "structured", "chessNewsDatav1.json");

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Load existing data to allow incremental scraping (resume where we left off)
    let articles: any[] = [];
    if (fs.existsSync(OUT_FILE)) {
        articles = JSON.parse(fs.readFileSync(OUT_FILE, "utf-8"));
        console.log(`📂 Loaded ${articles.length} existing articles. Resuming...`);
    }

    const existingTitles = new Set(articles.map((a: any) => a.title));

    for (let i = 1; i <= MAX_PAGES; i++) {
        console.log(`🔍 Scraping page ${i}...`);
        await page.goto(`${BASE_URL}/?page=${i}`, { waitUntil: "domcontentloaded" });

        let links: string[] = await page.evaluate(() =>
            [...new Set(
                Array.from(document.querySelectorAll('a[href^="/news/"]'))
                    .map(a => (a as HTMLAnchorElement).getAttribute("href") ?? "")
                    .filter(Boolean)
            )]
        );

        for (const link of links.slice(0, ARTICLES_PER_PAGE)) {
            await page.goto(`${BASE_URL}${link}`, { waitUntil: "domcontentloaded" });

            const raw = await page.evaluate(() => {
                const titleElem = document.querySelector("section.introduction h1");
                const title = titleElem?.textContent?.trim() ?? "";
                const paragraphs = Array.from(document.querySelectorAll("section.introduction p"))
                    .map(p => p.textContent?.trim() ?? "")
                    .filter(t => t.length > 0);
                const metaElem = document.querySelector("div.meta");
                const dateMatch = metaElem?.textContent?.match(/\d{2}\/\d{2}\/\d{4}/);
                return { title, date: dateMatch ? dateMatch[0] : "", content: paragraphs.join("\n") };
            });

            if (!raw.title || existingTitles.has(raw.title) || raw.content.length < 20) continue;

            const structured = {
                title: raw.title,
                date: raw.date,
                content: raw.content,
                category: "news",
                source: "chess_news",
                text: [
                    `Title: ${raw.title}`,
                    raw.date ? `Date: ${raw.date}` : null,
                    `Content: ${raw.content}`,
                ].filter(Boolean).join("\n"),
            };

            articles.push(structured);
            existingTitles.add(raw.title);
            console.log(`📰 Scraped: ${raw.title}`);

            // Save incrementally after every article
            fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
            fs.writeFileSync(OUT_FILE, JSON.stringify(articles, null, 2));
        }
    }

    console.log(`✅ Done. Total articles: ${articles.length} → ${OUT_FILE}`);
    await browser.close();
})();
