import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getCache, setCache } from "../../../lib/cache";
import { logger } from "../../../lib/logger";

export async function POST(req: NextRequest) {
    try {
        const contentLength = req.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > 50_000) {
            return NextResponse.json({ error: "Request body too large" }, { status: 413 });
        }

        const { username } = await req.json();

        if (!username || typeof username !== "string" || username.length > 50) {
            return NextResponse.json({ error: "Invalid username" }, { status: 400 });
        }

        const cacheKey = `player:${username.toLowerCase()}`;

        const cached = getCache<any>(cacheKey);
        if (cached) {
            logger.info(`Cache hit for player: ${username}`);
            return NextResponse.json({ player: cached });
        }

        logger.info(`Fetching Chess.com data for: ${username}`);
        const [profileRes, statsRes] = await Promise.all([
            axios.get(`https://api.chess.com/pub/player/${username}`),
            axios.get(`https://api.chess.com/pub/player/${username}/stats`),
        ]);

        const playerData = {
            profile: profileRes.data,
            stats: statsRes.data,
        };

        setCache(cacheKey, playerData);
        logger.info(`Player data fetched and cached: ${username}`);

        return NextResponse.json({ player: playerData });

    } catch (err: any) {
        logger.error("Player API error", { error: err.message });
        const status = err.response?.status === 404 ? 404 : 500;
        return NextResponse.json(
            { error: status === 404 ? "Player not found on Chess.com" : "Failed to fetch player data" },
            { status }
        );
    }
}