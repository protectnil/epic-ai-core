/**
 * @epic-ai/core — JSONL Audit Store Adapter
 * Append-only JSON Lines file for production audit logging.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { appendFile, mkdir } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
import type { AuditStoreAdapter, ActionRecord, AuditFilter } from '../../types/index.js';
import { HashChain } from '../HashChain.js';

export class JSONLAdapter implements AuditStoreAdapter {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Append a single record as one JSON line.
   * Atomic append — no read-modify-write.
   */
  async append(record: ActionRecord): Promise<void> {
    // Ensure directory exists
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const serialized = JSON.stringify(record, this.dateReplacer);
    await appendFile(this.filePath, serialized + '\n', 'utf-8');
  }

  /**
   * Query records by filter.
   * Reads the file line-by-line via readline for limit early-exit optimization.
   * Stops reading after collecting limit+offset matched lines.
   */
  async query(filter: AuditFilter): Promise<ActionRecord[]> {
    if (!existsSync(this.filePath)) return [];

    const since = filter.since
      ? (filter.since instanceof Date ? filter.since : new Date(filter.since))
      : null;
    const until = filter.until
      ? (filter.until instanceof Date ? filter.until : new Date(filter.until))
      : null;
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? Infinity;
    const stopAfter = offset + limit;

    const matched: ActionRecord[] = [];

    await new Promise<void>((resolve, reject) => {
      const rl = createInterface({
        input: createReadStream(this.filePath, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        if (!line.trim()) return;

        // Early exit once we have enough records
        if (matched.length >= stopAfter) {
          rl.close();
          return;
        }

        let parsed: ActionRecord;
        try {
          parsed = JSON.parse(line) as ActionRecord;
        } catch {
          return;
        }
        parsed.timestamp = new Date(parsed.timestamp as unknown as string);

        if (since && parsed.timestamp < since) return;
        if (until && parsed.timestamp > until) return;
        if (filter.tier && parsed.tier !== filter.tier) return;
        if (filter.server && parsed.server !== filter.server) return;
        if (filter.tool && parsed.tool !== filter.tool) return;
        if (filter.persona && parsed.persona !== filter.persona) return;
        if (filter.approvedBy && parsed.approvedBy !== filter.approvedBy) return;

        matched.push(parsed);
      });

      rl.on('close', resolve);
      rl.on('error', reject);
    });

    return matched.slice(offset, stopAfter === Infinity ? undefined : stopAfter);
  }

  /**
   * Verify the hash chain integrity of the entire file.
   */
  async verify(): Promise<{ valid: boolean; chainLength: number; brokenAt?: number }> {
    const records = await this.query({});
    const { valid, chainLength, brokenAt } = HashChain.verifyChain(records);
    return { valid, chainLength, brokenAt };
  }

  private dateReplacer(_key: string, value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }
}
