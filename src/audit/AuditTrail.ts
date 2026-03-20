/**
 * @epic-ai/core — Audit Trail
 * Hash-chained append-only action logging with integrity verification.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import type { AuditConfig, AuditStoreAdapter, ActionRecord, AuditFilter } from '../types/index.js';
import { HashChain } from './HashChain.js';
import { InMemoryAuditAdapter } from './adapters/InMemoryAdapter.js';
import { JSONLAdapter } from './adapters/JSONLAdapter.js';

/**
 * RFC 4180 CSV field escaping.
 * Wraps fields containing commas, newlines, or double-quotes in double-quotes.
 * Internal double-quotes are doubled.
 */
function csvEscapeField(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class AuditTrail {
  private readonly adapter: AuditStoreAdapter;
  private readonly integrity: 'sha256-chain' | 'none';
  private sequenceNumber = 0;
  private lastHash = '';
  private recordQueue: Promise<ActionRecord> = Promise.resolve(null as unknown as ActionRecord);

  constructor(config: AuditConfig) {
    this.integrity = config.integrity;

    if (config.store === 'custom' && config.adapter) {
      this.adapter = config.adapter;
    } else if (config.store === 'append-only-log') {
      if (!config.path) {
        throw new Error('AuditConfig store "append-only-log" requires a "path" field');
      }
      this.adapter = new JSONLAdapter(config.path);
    } else {
      // Default to in-memory
      this.adapter = new InMemoryAuditAdapter();
    }
  }

  /**
   * Restore sequenceNumber and lastHash from existing records in the adapter.
   * Call this after construction when using a persistent adapter so that
   * sequence numbers and hash chain continuity are preserved across restarts.
   */
  async init(): Promise<void> {
    const allRecords = await this.adapter.query({});
    if (allRecords.length > 0) {
      const last = allRecords.reduce((a, b) => a.sequenceNumber > b.sequenceNumber ? a : b);
      this.sequenceNumber = last.sequenceNumber + 1;
      this.lastHash = last.hash;
    }
  }

  /**
   * Record an action. Assigns ID, sequence number, computes hash chain.
   * Serialized via a promise queue to prevent race conditions in concurrent calls.
   */
  record(
    partial: Omit<ActionRecord, 'id' | 'sequenceNumber' | 'previousHash' | 'hash'>,
  ): Promise<ActionRecord> {
    this.recordQueue = this.recordQueue.then(() => this._doRecord(partial));
    return this.recordQueue;
  }

  private async _doRecord(
    partial: Omit<ActionRecord, 'id' | 'sequenceNumber' | 'previousHash' | 'hash'>,
  ): Promise<ActionRecord> {
    const id = randomUUID();
    const sequenceNumber = this.sequenceNumber++;
    const previousHash = this.lastHash;

    const recordWithoutHash = {
      ...partial,
      id,
      sequenceNumber,
      previousHash,
    };

    let hash = '';
    if (this.integrity === 'sha256-chain') {
      hash = HashChain.computeHash(recordWithoutHash);
    }

    const record: ActionRecord = { ...recordWithoutHash, hash };

    this.lastHash = hash;
    await this.adapter.append(record);

    return record;
  }

  /**
   * Query the audit trail with filters.
   */
  async query(filter: AuditFilter): Promise<ActionRecord[]> {
    return this.adapter.query(filter);
  }

  /**
   * Verify the integrity of the hash chain.
   */
  async verify(): Promise<{ valid: boolean; chainLength: number; brokenAt?: number }> {
    if (this.integrity === 'none') {
      return { valid: true, chainLength: this.sequenceNumber };
    }

    const allRecords = await this.adapter.query({});
    return HashChain.verifyChain(allRecords);
  }

  /**
   * Export the audit trail in the specified format.
   */
  async export(format: 'json' | 'csv' | 'syslog'): Promise<string> {
    const records = await this.adapter.query({});

    switch (format) {
      case 'json':
        return JSON.stringify(records, null, 2);

      case 'csv': {
        if (records.length === 0) return '';
        const headers = [
          'id', 'sequenceNumber', 'timestamp', 'action', 'tool', 'server',
          'tier', 'persona', 'approvedBy', 'durationMs', 'hash',
        ];
        const rows = records.map(r => [
          r.id,
          r.sequenceNumber,
          r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp,
          r.action,
          r.tool,
          r.server,
          r.tier,
          r.persona,
          r.approvedBy ?? '',
          r.durationMs,
          r.hash,
        ].map(csvEscapeField).join(','));
        return [headers.map(csvEscapeField).join(','), ...rows].join('\n');
      }

      case 'syslog':
        return records.map(r => {
          const ts = r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp;
          // Replace newlines in field values to prevent syslog injection
          const sanitize = (v: string | number) => String(v).replace(/[\n\r]/g, ' ');
          return `<14>${sanitize(ts)} epic-ai audit[${r.sequenceNumber}]: action=${sanitize(r.action)} tool=${sanitize(r.tool)} server=${sanitize(r.server)} tier=${sanitize(r.tier)} persona=${sanitize(r.persona)} duration=${sanitize(r.durationMs)}ms`;
        }).join('\n');

      default:
        throw new Error(`Unsupported export format: ${format as string}`);
    }
  }
}
