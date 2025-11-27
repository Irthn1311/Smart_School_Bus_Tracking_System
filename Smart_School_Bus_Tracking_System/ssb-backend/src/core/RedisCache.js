import Redis from "ioredis";

/**
 * RedisCache - Redis cache implementation
 */
export class RedisCache {
  constructor(redisUrl) {
    // Parse Redis URL or use default config
    let config = {};
    if (redisUrl && redisUrl.startsWith("redis://")) {
      try {
        const url = new URL(redisUrl);
        config = {
          host: url.hostname,
          port: parseInt(url.port) || 6379,
          password: url.password || undefined,
        };
      } catch (error) {
        console.warn("Failed to parse Redis URL, using defaults:", error);
        config = { host: "localhost", port: 6379 };
      }
    } else if (redisUrl && redisUrl.startsWith("rediss://")) {
      // SSL Redis
      try {
        const url = new URL(redisUrl);
        config = {
          host: url.hostname,
          port: parseInt(url.port) || 6380,
          password: url.password || undefined,
          tls: {},
        };
      } catch (error) {
        console.warn("Failed to parse Redis URL, using defaults:", error);
        config = { host: "localhost", port: 6379 };
      }
    } else {
      // Use default or parse as host:port
      config = { host: "localhost", port: 6379 };
    }

    this.client = new Redis({
      ...config,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on("connect", () => {
      console.log("✅ Redis cache connected");
    });

    this.client.on("error", (err) => {
      console.error("❌ Redis cache error:", err.message);
    });

    this.client.on("close", () => {
      console.log("⚠️ Redis cache connection closed");
    });
  }

  async connect() {
    try {
      await this.client.connect();
      return true;
    } catch (error) {
      console.error("❌ Redis cache connection failed:", error);
      return false;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("RedisCache get error:", error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = undefined) {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error("RedisCache set error:", error);
      return false;
    }
  }

  async delete(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error("RedisCache delete error:", error);
      return false;
    }
  }

  async clear() {
    try {
      await this.client.flushdb();
      return true;
    } catch (error) {
      console.error("RedisCache clear error:", error);
      return false;
    }
  }

  async disconnect() {
    await this.client.quit();
  }
}
