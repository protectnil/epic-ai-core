/**
 * @epicai/legion — In-Memory Audit Store Adapter
 * For development and testing. Not for production use.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { AuditStoreAdapter, ActionRecord, AuditFilter } from '../../types/index.js';
import { HashChain } from '../HashChain.js';

export class InMemoryAuditAdapter implements AuditStoreAdapter {
  private readonly records: ActionRecord[] = [];

  async append(record: ActionRecord): Promise<void> {
    this.records.push(record);
  }

  async query(filter: AuditFilter): Promise<ActionRecord[]> {
    let results = [...this.records];

    if (filter.since) {
      const since = filter.since instanceof Date ? filter.since : new Date(filter.since);
      results = results.filter(r => r.timestamp >= since);
    }
    if (filter.until) {
      const until = filter.until instanceof Date ? filter.until : new Date(filter.until);
      results = results.filter(r => r.timestamp <= until);
    }
    if (filter.tier) {
      results = results.filter(r => r.tier === filter.tier);
    }
    if (filter.server) {
      results = results.filter(r => r.server === filter.server);
    }
    if (filter.tool) {
      results = results.filter(r => r.tool === filter.tool);
    }
    if (filter.persona) {
      results = results.filter(r => r.persona === filter.persona);
    }
    if (filter.approvedBy) {
      results = results.filter(r => r.approvedBy === filter.approvedBy);
    }
    if (filter.offset) {
      results = results.slice(filter.offset);
    }
    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  async verify(): Promise<{ valid: boolean; chainLength: number; brokenAt?: number }> {
    const { valid, chainLength, brokenAt } = HashChain.verifyChain(this.records);
    return { valid, chainLength, brokenAt };
  }

  /**
   * Update the status and output of a pending record by ID.
   * Mutates in-place for in-memory store.
   */
  async updateStatus(id: string, status: 'completed' | 'failed', output: Record<string, unknown>, durationMs: number): Promise<void> {
    const record = this.records.find(r => r.id === id);
    if (record) {
      record.status = status;
      record.output = output;
      record.durationMs = durationMs;
    }
  }

  /**
   * Get all records. For testing.
   */
  all(): ActionRecord[] {
    return [...this.records];
  }

  /**
   * Clear all records. For testing.
   */
  clear(): void {
    this.records.length = 0;
  }
}
