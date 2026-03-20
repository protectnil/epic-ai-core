/**
 * @epicai/core — AuditTrail with JSONLAdapter Tests
 * Tests write + read + verify chain using the JSONL file adapter.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { AuditTrail } from '../src/audit/AuditTrail.js';
import { unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

function tempPath(): string {
  return join(tmpdir(), `epic-ai-test-audit-${randomUUID()}.jsonl`);
}

describe('AuditTrail with JSONLAdapter', () => {
  const cleanupPaths: string[] = [];

  afterEach(() => {
    for (const p of cleanupPaths) {
      try { if (existsSync(p)) unlinkSync(p); } catch { /* ignore */ }
    }
    cleanupPaths.length = 0;
  });

  it('selects JSONLAdapter when store is append-only-log', () => {
    const path = tempPath();
    cleanupPaths.push(path);

    // Should not throw — previously fell through to InMemoryAuditAdapter
    const audit = new AuditTrail({
      store: 'append-only-log',
      path,
      integrity: 'sha256-chain',
    });
    expect(audit).toBeDefined();
  });

  it('throws when append-only-log has no path', () => {
    expect(() => new AuditTrail({
      store: 'append-only-log',
      integrity: 'sha256-chain',
    })).toThrow('requires a "path"');
  });

  it('writes records to JSONL file and reads them back', async () => {
    const path = tempPath();
    cleanupPaths.push(path);

    const audit = new AuditTrail({
      store: 'append-only-log',
      path,
      integrity: 'sha256-chain',
    });

    await audit.record({
      action: 'scan-endpoints',
      tool: 'scan',
      server: 'crowdstrike',
      tier: 'auto',
      input: { scope: 'all-endpoints' },
      output: { found: 42 },
      persona: 'praetor',
      durationMs: 250,
      timestamp: new Date(),
    });

    await audit.record({
      action: 'contain-host',
      tool: 'contain',
      server: 'crowdstrike',
      tier: 'escalate',
      input: { hostId: 'abc123' },
      output: { status: 'contained' },
      persona: 'praetor',
      durationMs: 800,
      timestamp: new Date(),
    });

    // File should exist
    expect(existsSync(path)).toBe(true);

    // Query should return both records
    const records = await audit.query({});
    expect(records).toHaveLength(2);
    expect(records[0].action).toBe('scan-endpoints');
    expect(records[1].action).toBe('contain-host');

    // Chain should be valid
    expect(records[1].previousHash).toBe(records[0].hash);
  });

  it('verifies chain integrity from JSONL file', async () => {
    const path = tempPath();
    cleanupPaths.push(path);

    const audit = new AuditTrail({
      store: 'append-only-log',
      path,
      integrity: 'sha256-chain',
    });

    for (let i = 0; i < 5; i++) {
      await audit.record({
        action: `action-${i}`,
        tool: 'tool',
        server: 'server',
        tier: 'auto',
        input: { index: i },
        output: { result: `done-${i}` },
        persona: 'praetor',
        durationMs: i * 10,
        timestamp: new Date(),
      });
    }

    const result = await audit.verify();
    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(5);
  });

  it('queries by filter from JSONL file', async () => {
    const path = tempPath();
    cleanupPaths.push(path);

    const audit = new AuditTrail({
      store: 'append-only-log',
      path,
      integrity: 'sha256-chain',
    });

    await audit.record({
      action: 'read', tool: 'read', server: 'vault', tier: 'auto',
      input: {}, output: {}, persona: 'praetor', durationMs: 10, timestamp: new Date(),
    });
    await audit.record({
      action: 'delete', tool: 'delete', server: 'vault', tier: 'approve',
      input: {}, output: {}, persona: 'praetor', durationMs: 20, timestamp: new Date(),
    });

    const autoOnly = await audit.query({ tier: 'auto' });
    expect(autoOnly).toHaveLength(1);
    expect(autoOnly[0].tool).toBe('read');
  });

  it('exports JSONL-backed audit trail', async () => {
    const path = tempPath();
    cleanupPaths.push(path);

    const audit = new AuditTrail({
      store: 'append-only-log',
      path,
      integrity: 'sha256-chain',
    });

    await audit.record({
      action: 'test', tool: 'tool', server: 'server', tier: 'auto',
      input: {}, output: {}, persona: 'praetor', durationMs: 10, timestamp: new Date(),
    });

    const json = await audit.export('json');
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });
});
