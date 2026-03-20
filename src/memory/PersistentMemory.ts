/**
 * @epic-ai/core — Persistent Memory
 * Importance-weighted persistent memory with etch/recall/context/forget.
 * Adapted from NILAssist useEtchedMemory.ts patterns.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type {
  MemoryConfig,
  MemoryEntry,
  StoredMemory,
  RecallOptions,
  ContextSummary,
} from '../types/index.js';

export class PersistentMemory {
  private readonly config: MemoryConfig;

  constructor(config: MemoryConfig) {
    this.config = config;
  }

  /**
   * Etch a memory — store a new entry for a user.
   */
  async etch(userId: string, entry: MemoryEntry): Promise<StoredMemory> {
    return this.config.store.save(userId, entry);
  }

  /**
   * Recall memories — retrieve stored entries for a user.
   * Automatically updates access counts and promotes importance.
   */
  async recall(userId: string, options?: RecallOptions): Promise<StoredMemory[]> {
    return this.config.store.recall(userId, options ?? {});
  }

  /**
   * Get context summary for a user — aggregate statistics.
   */
  async context(userId: string): Promise<ContextSummary> {
    return this.config.store.context(userId);
  }

  /**
   * Forget a memory — soft delete by ID.
   */
  async forget(userId: string, memoryId: string): Promise<void> {
    return this.config.store.delete(userId, memoryId);
  }
}
