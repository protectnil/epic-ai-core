/**
 * @epicai/core — Hash Chain
 * SHA-256 chain integrity for tamper-evident audit logging.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createHash } from 'node:crypto';
import type { ActionRecord } from '../types/index.js';

/**
 * Recursively sort all keys in an object (and nested objects/arrays)
 * to produce a deterministic structure for canonical JSON serialization.
 */
function deepSortKeys(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(deepSortKeys);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = deepSortKeys(obj[key]);
    }
    return sorted;
  }
  return value;
}

export class HashChain {
  /**
   * Compute SHA-256 hash of a record.
   * The hash field is set to empty string during computation.
   * Uses deep key sorting to ensure nested objects in input/output
   * produce deterministic hashes regardless of key insertion order.
   */
  static computeHash(record: Omit<ActionRecord, 'hash'>): string {
    const serializable = {
      ...record,
      hash: '',
      timestamp: record.timestamp instanceof Date ? record.timestamp.toISOString() : record.timestamp,
    };
    const canonical = deepSortKeys(serializable);
    const json = JSON.stringify(canonical);
    return createHash('sha256').update(json).digest('hex');
  }

  /**
   * Verify the integrity of a chain of records.
   * Walks from first to last, recomputing each hash and checking previousHash links.
   *
   * @returns valid=true if the entire chain is intact, or brokenAt=sequenceNumber where it breaks.
   */
  static verifyChain(records: ActionRecord[]): { valid: boolean; chainLength: number; brokenAt?: number } {
    if (records.length === 0) {
      return { valid: true, chainLength: 0 };
    }

    // Sort by sequence number
    const sorted = [...records].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    for (let i = 0; i < sorted.length; i++) {
      const record = sorted[i];

      // Verify hash of this record
      const { hash: _storedHash, ...recordWithoutHash } = record;
      const computedHash = this.computeHash(recordWithoutHash);
      if (computedHash !== record.hash) {
        return { valid: false, chainLength: sorted.length, brokenAt: record.sequenceNumber };
      }

      // Verify chain link (previousHash)
      if (i === 0) {
        // First record should have empty previousHash
        if (record.previousHash !== '') {
          return { valid: false, chainLength: sorted.length, brokenAt: record.sequenceNumber };
        }
      } else {
        // Subsequent records should reference the previous record's hash
        if (record.previousHash !== sorted[i - 1].hash) {
          return { valid: false, chainLength: sorted.length, brokenAt: record.sequenceNumber };
        }
      }
    }

    return { valid: true, chainLength: sorted.length };
  }
}
