/**
 * @epic-ai/core — In-Memory Store
 * For development and testing. Not for production use.
 * Adapted from NILAssist useEtchedMemory.ts patterns.
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
} from '../../types/index.js';

export class InMemoryStore implements MemoryStoreAdapter {
  private readonly store = new Map<string, StoredMemory[]>();

  async save(userId: string, entry: MemoryEntry): Promise<StoredMemory> {
    const memory: StoredMemory = {
      ...entry,
      id: randomUUID(),
      userId,
      createdAt: new Date(),
      accessCount: 0,
      lastAccessed: null,
      isDeleted: false,
    };

    const userMemories = this.store.get(userId) ?? [];
    userMemories.push(memory);
    this.store.set(userId, userMemories);

    return memory;
  }

  async recall(userId: string, options: RecallOptions): Promise<StoredMemory[]> {
    let memories = (this.store.get(userId) ?? []).filter(m => !m.isDeleted);

    // Filter by type
    if (options.type) {
      memories = memories.filter(m => m.type === options.type);
    }

    // Filter by importance
    if (options.importance) {
      memories = memories.filter(m => m.importance === options.importance);
    }

    // Filter by date
    if (options.since) {
      const since = options.since instanceof Date ? options.since : new Date(options.since);
      memories = memories.filter(m => m.createdAt >= since);
    }

    // Sort
    switch (options.sortBy) {
      case 'importance':
        memories.sort((a, b) => this.importanceRank(b.importance) - this.importanceRank(a.importance));
        break;
      case 'recency':
        memories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'frequency':
        memories.sort((a, b) => b.accessCount - a.accessCount);
        break;
      default:
        memories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Update access counts (auto-promotion pattern from NILAssist)
    const limit = options.limit ?? 10;
    const result = memories.slice(0, limit);

    for (const memory of result) {
      memory.accessCount++;
      memory.lastAccessed = new Date();

      // Auto-promote importance based on access frequency
      if (memory.accessCount > 10 && memory.importance !== 'high') {
        memory.importance = 'high';
      } else if (memory.accessCount > 5 && memory.importance === 'normal') {
        memory.importance = 'medium';
      }
    }

    return result;
  }

  async context(userId: string): Promise<ContextSummary> {
    const memories = (this.store.get(userId) ?? []).filter(m => !m.isDeleted);

    const memoryTypes = new Map<string, number>();
    let lastInteraction: Date | null = null;
    let importantMemories = 0;
    let oldestMemory: Date | null = null;
    let newestMemory: Date | null = null;

    for (const memory of memories) {
      memoryTypes.set(memory.type, (memoryTypes.get(memory.type) ?? 0) + 1);

      if (memory.importance === 'high') importantMemories++;

      if (!lastInteraction || memory.createdAt > lastInteraction) {
        lastInteraction = memory.createdAt;
      }
      if (!oldestMemory || memory.createdAt < oldestMemory) {
        oldestMemory = memory.createdAt;
      }
      if (!newestMemory || memory.createdAt > newestMemory) {
        newestMemory = memory.createdAt;
      }
    }

    return {
      totalMemories: memories.length,
      memoryTypes,
      lastInteraction,
      importantMemories,
      oldestMemory,
      newestMemory,
    };
  }

  async delete(userId: string, memoryId: string): Promise<void> {
    const memories = this.store.get(userId);
    if (!memories) return;

    const memory = memories.find(m => m.id === memoryId);
    if (memory) {
      memory.isDeleted = true;
      memory.deletedAt = new Date();
    }
  }

  /**
   * Clear all stored memories. For testing.
   */
  clear(): void {
    this.store.clear();
  }

  private importanceRank(importance: string): number {
    switch (importance) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'normal': return 1;
      default: return 0;
    }
  }
}
