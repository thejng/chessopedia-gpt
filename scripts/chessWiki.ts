import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const OUT_FILE = path.join(__dirname, "Data", "structured", "chess_wiki.json");

const SECTIONS = [
    "Rules", "Notation", "Gameplay", "Problems and studies",
    "Chess in public spaces", "Organized competition", "History",
    "Connections to other fields", "Online chess", "Computer chess", "Related games",
];

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    console.log("🌐 Navigating to Wikipedia Chess page...");
    await page.goto("https://en.wikipedia.org/wiki/Chess", { waitUntil: "domcontentloaded" });

    const structured: any[] = [];

    for (const section of SECTIONS) {
        const content = await page.evaluate((sec) => {
            const header = document.querySelector(`[id='${sec.replace(/ /g, "_")}']`);
            if (!header) return null;
            let text = "";
            let elem = header.parentElement?.nextElementSibling ?? null;
            while (elem && elem.tagName !== "H2") {
                if (elem.tagName === "P") text += elem.textContent?.trim() + "\n\n";
                elem = elem.nextElementSibling;
            }
            return text.replace(/\[\d+\]|\(citation needed\)/g, "").trim() || null;
        }, section);

        if (content) {
            structured.push({
                heading: section,
                content,
                category: "wiki",
                source: "chess_wiki",
                text: `Section: ${section}\nContent: ${content}`,
            });
            console.log(`✅ Extracted: ${section} (${content.length} chars)`);
        } else {
            console.log(`⚠️ Section not found: ${section}`);
        }
    }

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(structured, null, 2));
    console.log(`✅ Saved ${structured.length} wiki sections → ${OUT_FILE}`);
    await browser.close();
})();