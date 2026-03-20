/**
 * @epic-ai/core — Redis + MongoDB Memory Adapter
 * Redis as read-through cache, MongoDB as durable persistent store.
 * Adapted from NILAssist useEtchedMemory.ts and RedisConnectionPool.ts patterns.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import type {
  MemoryStoreAdapter,
  MemoryEntry,
  StoredMemory,
  RecallOptions,
  ContextSummary,
  MemoryImportance,
} from '../../types/index.js';

interface RedisMongoConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    keyPrefix?: string;
  };
  mongo: {
    uri: string;
    db: string;
    collection?: string;
  };
  cacheTTLSeconds?: number;
}

/*
 * eslint-disable @typescript-eslint/no-explicit-any —
 * `any` is used for redis, mongo, and db fields because these are optional
 * peer dependencies loaded via dynamic import(). Their types are not
 * available at compile time when the peer dependency is not installed.
 */

/**
 * Production memory adapter using Redis (cache) + MongoDB (durable store).
 *
 * Requires optional peer dependencies:
 *   npm install redis mongodb
 */
export class RedisMongoAdapter implements MemoryStoreAdapter {
  private readonly config: RedisMongoConfig;
  private readonly keyPrefix: string;
  private readonly cacheTTL: number;
  private readonly collectionName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import of optional peer dependency `redis`
  private redis: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic import of optional peer dependency `mongodb`
  private mongo: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MongoDB Db instance from dynamic import
  private db: any = null;
  private connected = false;

  constructor(config: RedisMongoConfig) {
    this.config = config;
    this.keyPrefix = config.redis.keyPrefix ?? 'eai:mem:';
    this.cacheTTL = config.cacheTTLSeconds ?? 3600;
    this.collectionName = config.mongo.collection ?? 'epic_ai_memories';
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      const redisModule = await import('redis');
      this.redis = redisModule.createClient({
        socket: { host: this.config.redis.host, port: this.config.redis.port },
        password: this.config.redis.password,
      });
      await this.redis.connect();
    } catch (err) {
      throw new Error(`Redis connection failed: ${err instanceof Error ? err.message : String(err)}. npm install redis`);
    }

    try {
      const mongoModule = await import('mongodb');
      this.mongo = new mongoModule.MongoClient(this.config.mongo.uri);
      await this.mongo.connect();
      this.db = this.mongo.db(this.config.mongo.db);
    } catch (err) {
      throw new Error(`MongoDB connection failed: ${err instanceof Error ? err.message : String(err)}. npm install mongodb`);
    }

    this.connected = true;
  }

  async save(userId: string, entry: MemoryEntry): Promise<StoredMemory> {
    await this.ensureConnected();

    const memory: StoredMemory = {
      ...entry,
      id: randomUUID(),
      userId,
      createdAt: new Date(),
      accessCount: 0,
      lastAccessed: null,
      isDeleted: false,
    };

    await this.collection().insertOne(memory);
    await this.invalidateCache(userId);
    return memory;
  }

  async recall(userId: string, options: RecallOptions): Promise<StoredMemory[]> {
    await this.ensureConnected();

    const cacheKey = this.cacheKey(userId, options);
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const filter: Record<string, unknown> = { userId, isDeleted: false };
    if (options.type) filter['type'] = options.type;
    if (options.importance) filter['importance'] = options.importance;
    if (options.since) filter['createdAt'] = { $gte: options.since };

    let sortField = 'createdAt';
    if (options.sortBy === 'importance') sortField = 'importance';
    if (options.sortBy === 'frequency') sortField = 'accessCount';

    const results: StoredMemory[] = await this.collection()
      .find(filter)
      .sort({ [sortField]: -1 })
      .limit(options.limit ?? 10)
      .toArray();

    for (const memory of results) {
      memory.accessCount++;
      memory.lastAccessed = new Date();
      if (memory.accessCount > 10 && memory.importance !== 'high') {
        memory.importance = 'high' as MemoryImportance;
      } else if (memory.accessCount > 5 && memory.importance === 'normal') {
        memory.importance = 'medium' as MemoryImportance;
      }
      await this.collection().updateOne(
        { id: memory.id },
        { $inc: { accessCount: 1 }, $set: { lastAccessed: new Date(), importance: memory.importance } },
      );
    }

    await this.setCache(cacheKey, results);
    return results;
  }

  async context(userId: string): Promise<ContextSummary> {
    await this.ensureConnected();

    const memories: StoredMemory[] = await this.collection()
      .find({ userId, isDeleted: false })
      .toArray();

    const memoryTypes = new Map<string, number>();
    let lastInteraction: Date | null = null;
    let importantMemories = 0;
    let oldestMemory: Date | null = null;
    let newestMemory: Date | null = null;

    for (const m of memories) {
      memoryTypes.set(m.type, (memoryTypes.get(m.type) ?? 0) + 1);
      if (m.importance === 'high') importantMemories++;
      const d = m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt);
      if (!lastInteraction || d > lastInteraction) lastInteraction = d;
      if (!oldestMemory || d < oldestMemory) oldestMemory = d;
      if (!newestMemory || d > newestMemory) newestMemory = d;
    }

    return { totalMemories: memories.length, memoryTypes, lastInteraction, importantMemories, oldestMemory, newestMemory };
  }

  async delete(userId: string, memoryId: string): Promise<void> {
    await this.ensureConnected();
    await this.collection().updateOne({ id: memoryId, userId }, { $set: { isDeleted: true, deletedAt: new Date() } });
    await this.invalidateCache(userId);
  }

  async disconnect(): Promise<void> {
    if (this.redis) { await this.redis.disconnect(); this.redis = null; }
    if (this.mongo) { await this.mongo.close(); this.mongo = null; this.db = null; }
    this.connected = false;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) await this.connect();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MongoDB Collection from dynamic import
  private collection(): any {
    if (!this.db) throw new Error('MongoDB not connected');
    return this.db.collection(this.collectionName);
  }

  private cacheKey(userId: string, options: RecallOptions): string {
    return `${this.keyPrefix}${userId}:${JSON.stringify(options)}`;
  }

  private async getCache(key: string): Promise<StoredMemory[] | null> {
    if (!this.redis) return null;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) as StoredMemory[] : null;
    } catch { return null; }
  }

  private async setCache(key: string, data: StoredMemory[]): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(data), { EX: this.cacheTTL });
      // Track the key in a per-user set so we can invalidate without KEYS scan
      const userId = this.userIdFromKey(key);
      if (userId) {
        const setKey = `${this.keyPrefix}keys:${userId}`;
        await this.redis.sAdd(setKey, key);
        await this.redis.expire(setKey, this.cacheTTL * 2);
      }
    } catch { /* non-fatal */ }
  }

  private async invalidateCache(userId: string): Promise<void> {
    if (!this.redis) return;
    try {
      // Use the per-user tracking set instead of KEYS scan
      const setKey = `${this.keyPrefix}keys:${userId}`;
      const keys: string[] = await this.redis.sMembers(setKey);
      if (keys.length > 0) await this.redis.del(keys);
      await this.redis.del(setKey);
    } catch { /* non-fatal */ }
  }

  /**
   * Extract userId from a cache key of the form `{keyPrefix}{userId}:{options}`.
   */
  private userIdFromKey(key: string): string | null {
    const withoutPrefix = key.slice(this.keyPrefix.length);
    const colonIdx = withoutPrefix.indexOf(':');
    return colonIdx !== -1 ? withoutPrefix.slice(0, colonIdx) : null;
  }
}
