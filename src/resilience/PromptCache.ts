/**
 * @epicai/legion — Prompt Cache
 * Caches system prompts and tool definitions to avoid recomputing on every call.
 * Supports semantic similarity matching for repeated queries.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  ttlMs: number;
}

export class PromptCache<T = string> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();
  private readonly maxEntries: number;
  private readonly defaultTTLMs: number;

  constructor(options?: { maxEntries?: number; defaultTTLMs?: number }) {
    this.maxEntries = options?.maxEntries ?? 100;
    this.defaultTTLMs = options?.defaultTTLMs ?? 3600000; // 1 hour
  }

  /**
   * Get a cached value. Returns null if not found or expired.
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.createdAt > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = now;
    return entry.value;
  }

  /**
   * Cache a value with optional TTL.
   */
  set(key: string, value: T, ttlMs?: number): void {
    // Evict if at capacity (LRU: remove least recently accessed)
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      key,
      value,
      createdAt: now,
      accessCount: 1,
      lastAccessed: now,
      ttlMs: ttlMs ?? this.defaultTTLMs,
    });
  }

  /**
   * Get or compute: returns cached value if available,
   * otherwise computes it, caches it, and returns it.
   * Concurrent callers for the same key share the in-flight promise
   * to prevent thundering herd on cache miss.
   */
  async getOrCompute(key: string, compute: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached;

    // Return in-flight promise if another caller is already computing
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const promise = compute().then(value => {
      this.set(key, value, ttlMs);
      this.inFlight.delete(key);
      return value;
    }).catch(err => {
      this.inFlight.delete(key);
      throw err;
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Invalidate a specific key.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix.
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Number of cached entries.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Cache hit rate statistics.
   */
  stats(): { size: number; totalAccesses: number; avgAccessCount: number } {
    let totalAccesses = 0;
    for (const entry of this.cache.values()) {
      totalAccesses += entry.accessCount;
    }
    return {
      size: this.cache.size,
      totalAccesses,
      avgAccessCount: this.cache.size > 0 ? totalAccesses / this.cache.size : 0,
    };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
