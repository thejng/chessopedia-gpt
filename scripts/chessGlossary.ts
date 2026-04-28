import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const OUT_FILE = path.join(__dirname, "Data", "structured", "chess_glossary.json");

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    console.log("🌐 Navigating to Wikipedia Chess Glossary...");
    await page.goto("https://en.wikipedia.org/wiki/Glossary_of_chess", { waitUntil: "networkidle0" });

    const glossaryExists = await page.evaluate(() => !!document.querySelector("dl.glossary"));
    if (!glossaryExists) {
        console.log("❌ Glossary section not found!");
        await browser.close();
        return;
    }

    const raw = await page.evaluate(() => {
        const terms: { term: string; definition: string }[] = [];
        document.querySelectorAll("dl.glossary dt").forEach((dt) => {
            const term = dt.textContent?.trim() ?? "";
            const definitionEl = dt.nextElementSibling;
            const definition = definitionEl?.tagName === "DD" ? definitionEl.textContent?.trim() ?? "" : "";
            if (term && definition) terms.push({ term, definition });
        });
        return terms;
    });

    const structured = raw.map(r => ({
        term: r.term,
        definition: r.definition,
        category: "glossary",
        source: "chess_glossary",
        text: `Term: ${r.term}\nDefinition: ${r.definition}`,
    }));

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(structured, null, 2));
    console.log(`✅ Saved ${structured.length} glossary terms → ${OUT_FILE}`);
    await browser.close();
})();