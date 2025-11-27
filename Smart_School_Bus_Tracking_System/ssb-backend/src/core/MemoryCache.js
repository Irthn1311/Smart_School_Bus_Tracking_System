import LRU from "lru-cache";

/**
 * MemoryCache - Simple LRU cache implementation using Map
 */
export class MemoryCache {
  constructor(maxSize = 500, ttlMs = 3600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  async get(key) {
    try {
      const item = this.cache.get(key);
      if (!item) return null;

      // Check if expired
      if (Date.now() > item.expiry) {
        this.cache.delete(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error("MemoryCache get error:", error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = undefined) {
    try {
      const ttl = ttlSeconds ? ttlSeconds * 1000 : this.ttlMs;
      const expiry = Date.now() + ttl;

      // Simple LRU: if cache is full, delete oldest entry
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      this.cache.set(key, { value, expiry });
      return true;
    } catch (error) {
      console.error("MemoryCache set error:", error);
      return false;
    }
  }

  async delete(key) {
    try {
      return this.cache.delete(key);
    } catch (error) {
      console.error("MemoryCache delete error:", error);
      return false;
    }
  }

  async clear() {
    try {
      this.cache.clear();
      return true;
    } catch (error) {
      console.error("MemoryCache clear error:", error);
      return false;
    }
  }

  async size() {
    return this.cache.size;
  }
}
