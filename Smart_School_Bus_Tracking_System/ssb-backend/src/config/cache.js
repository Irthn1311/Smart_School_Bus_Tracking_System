import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || process.env.REDIS_URL?.split("://")[1]?.split(":")[0] || "localhost",
  port: process.env.REDIS_PORT || process.env.REDIS_URL?.match(/:(\d+)/)?.[1] || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

// Create Redis client
let redisClient = null;

/**
 * Get Redis client (singleton)
 */
export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);
    
    redisClient.on("connect", () => {
      console.log("✅ Redis connected");
    });

    redisClient.on("error", (err) => {
      console.error("❌ Redis error:", err.message);
      // Fallback to in-memory cache if Redis fails
    });

    redisClient.on("close", () => {
      console.log("⚠️ Redis connection closed");
    });
  }

  return redisClient;
}

/**
 * Cache helper: Get value from cache
 */
export async function getCache(key) {
  try {
    const client = getRedisClient();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("Cache get error:", error.message);
    return null;
  }
}

/**
 * Cache helper: Set value to cache
 */
export async function setCache(key, value, ttlSeconds = 3600) {
  try {
    const client = getRedisClient();
    await client.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Cache set error:", error.message);
    return false;
  }
}

/**
 * Cache helper: Delete value from cache
 */
export async function deleteCache(key) {
  try {
    const client = getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error("Cache delete error:", error.message);
    return false;
  }
}

/**
 * Cache helper: Delete multiple keys (pattern)
 */
export async function deleteCachePattern(pattern) {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
    return keys.length;
  } catch (error) {
    console.error("Cache delete pattern error:", error.message);
    return 0;
  }
}

/**
 * Generate cache key for Maps API requests
 */
export function getCacheKey(prefix, params) {
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

/**
 * Initialize Redis connection
 */
export async function initRedis() {
  try {
    const client = getRedisClient();
    await client.connect();
    console.log("✅ Redis initialized");
    return true;
  } catch (error) {
    console.error("❌ Redis initialization failed:", error.message);
    console.log("⚠️ Falling back to in-memory cache (not persistent)");
    return false;
  }
}

export default {
  getRedisClient,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  getCacheKey,
  initRedis,
};

