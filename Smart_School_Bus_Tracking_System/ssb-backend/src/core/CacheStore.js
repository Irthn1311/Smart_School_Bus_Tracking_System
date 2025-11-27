/**
 * CacheStore - Interface for cache providers (not actual interface in JS, just documentation)
 * 
 * All cache providers should implement:
 * - get<T>(key: string): Promise<T | null>
 * - set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean>
 * - delete(key: string): Promise<boolean>
 * - clear(): Promise<boolean>
 */

// This is just for documentation, no actual code needed

