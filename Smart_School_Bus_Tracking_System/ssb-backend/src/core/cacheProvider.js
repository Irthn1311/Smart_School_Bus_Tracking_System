import dotenv from "dotenv";
import { MemoryCache } from "./MemoryCache.js";
import { RedisCache } from "./RedisCache.js";

dotenv.config();

const CACHE_DRIVER = process.env.CACHE_DRIVER || "memory";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let cacheStore = null;

/**
 * Get cache provider instance (singleton)
 */
export async function getCacheProvider() {
  if (cacheStore) {
    return cacheStore;
  }

  switch (CACHE_DRIVER) {
    case "redis":
      try {
        const redisCache = new RedisCache(REDIS_URL);
        const connected = await redisCache.connect();
        if (connected) {
          cacheStore = redisCache;
          console.log("✅ Using Redis cache");
          return cacheStore;
        } else {
          console.warn("⚠️ Redis connection failed, falling back to memory cache");
          cacheStore = new MemoryCache(500, 3600000);
          return cacheStore;
        }
      } catch (error) {
        console.warn("⚠️ Redis initialization failed, falling back to memory cache:", error);
        cacheStore = new MemoryCache(500, 3600000);
        return cacheStore;
      }

    case "memory":
    default:
      cacheStore = new MemoryCache(500, 3600000);
      console.log("✅ Using memory cache");
      return cacheStore;
  }
}

/**
 * Generate cache key with prefix
 */
export function generateCacheKey(prefix, params) {
  const hash = JSON.stringify(params);
  // Simple hash function
  let hashValue = 0;
  for (let i = 0; i < hash.length; i++) {
    const char = hash.charCodeAt(i);
    hashValue = ((hashValue << 5) - hashValue) + char;
    hashValue = hashValue & hashValue; // Convert to 32-bit integer
  }
  return `${prefix}:${Math.abs(hashValue).toString(36)}`;
}

export default {
  getCacheProvider,
  generateCacheKey,
};

