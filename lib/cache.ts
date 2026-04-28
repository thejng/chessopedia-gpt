import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 900, checkperiod: 120 });

export function getCache<T>(key: string): T | undefined {
    return cache.get<T>(key);
}

export function setCache<T>(key: string, value: T, ttl?: number): void {
    if (ttl !== undefined) {
        cache.set(key, value, ttl);
    } else {
        cache.set(key, value);
    }
}

export function deleteCache(key: string): void {
    cache.del(key);
}
