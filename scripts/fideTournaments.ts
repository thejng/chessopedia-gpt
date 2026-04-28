import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const OUT_FILE = path.join(__dirname, "Data", "structured", "fide_tournaments.json");

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    console.log("🌐 Navigating to FIDE Rated Tournaments...");
    await page.goto("https://ratings.fide.com/rated_tournaments.phtml", { waitUntil: "networkidle2" });

    const tableExists = await page.$("#main_table");
    if (!tableExists) {
        console.error("❌ Tournament table not found!");
        await browser.close();
        return;
    }

    const tournamentLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll("#main_table tbody tr td:first-child a[href]"))
            .map(a => (a as HTMLAnchorElement).href)
            .filter(link => link.includes("tournament_information.phtml?event="))
    );
    console.log(`✅ Found ${tournamentLinks.length} tournaments`);

    const structured: any[] = [];

    for (const tournamentURL of tournamentLinks) {
        await page.goto(tournamentURL, { waitUntil: "networkidle2" });
        console.log(`🔍 Scraping: ${tournamentURL}`);

        const raw = await page.evaluate(() => {
            const rows = document.querySelectorAll(".details_table tr");
            const data: Record<string, string> = {};
            rows.forEach(row => {
                const cells = row.querySelectorAll("td");
                if (cells.length === 2) {
                    const key = cells[0].textContent?.trim() ?? "Unknown";
                    data[key] = cells[1].textContent?.trim() ?? "";
                }
            });
            return data;
        });

        const name = raw["Tournament Name"] ?? raw["tournamentName"] ?? "";
        if (!name) continue;

        const city          = raw["City"] ?? "";
        const country       = raw["Country"] ?? "";
        const startDate     = raw["Start Date"] ?? "";
        const endDate       = raw["End Date"] ?? "";
        const timeControl   = raw["Time Control"] ?? "";
        const numPlayers    = raw["Number of players"] ?? "";
        const chiefArbiter  = raw["Chief Arbiter"] ?? "";

        structured.push({
            tournamentName: name,
            city, country, startDate, endDate,
            timeControl, numberOfPlayers: numPlayers,
            chiefArbiter, tournamentURL,
            category: "tournament",
            source: "fide_tournaments",
            text: [
                `Tournament: ${name}`,
                city         ? `City: ${city}`               : null,
                country      ? `Country: ${country}`          : null,
                startDate    ? `Start Date: ${startDate}`     : null,
                endDate      ? `End Date: ${endDate}`         : null,
                timeControl  ? `Time Control: ${timeControl}` : null,
                numPlayers   ? `Players: ${numPlayers}`       : null,
            ].filter(Boolean).join("\n"),
        });
    }

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(structured, null, 2));
    console.log(`✅ Saved ${structured.length} tournaments → ${OUT_FILE}`);
    await browser.close();
})();
