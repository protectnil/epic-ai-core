/**
 * @epicai/core — Audit Layer Tests
 * Tests AuditTrail hash chain integrity, recording, querying, and export.
 */

import { describe, it, expect } from 'vitest';
import { AuditTrail } from '../src/audit/AuditTrail.js';
import { HashChain } from '../src/audit/HashChain.js';

describe('AuditTrail', () => {
  it('records an action with hash chain', async () => {
    const audit = new AuditTrail({ store: 'memory', integrity: 'sha256-chain' });

    const record = await audit.record({
      action: 'query-splunk',
      tool: 'search',
      server: 'splunk',
      tier: 'auto',
      input: { query: 'error' },
      output: { results: 5 },
      persona: 'sentinel',
      durationMs: 150,
      timestamp: new Date(),
    });

    expect(record.id).toBeTruthy();
    expect(record.sequenceNumber).toBe(0);
    expect(record.previousHash).toBe('');
    expect(record.hash).toBeTruthy();
    expect(record.hash.length).toBe(64); // SHA-256 hex
  });

  it('chains hashes across records', async () => {
    const audit = new AuditTrail({ store: 'memory', integrity: 'sha256-chain' });

    const r1 = await audit.record({
      action: 'read', tool: 'read', server: 'vault', tier: 'auto',
      input: {}, output: {}, persona: 'sentinel', durationMs: 10, timestamp: new Date(),
    });

    const r2 = await audit.record({
      action: 'contain', tool: 'contain', server: 'crowdstrike', tier: 'escalate',
      input: {}, output: {}, persona: 'sentinel', durationMs: 20, timestamp: new Date(),
    });

    expect(r2.previousHash).toBe(r1.hash);
    expect(r2.sequenceNumber).toBe(1);
  });

  it('verifies a valid chain', async () => {
    const audit = new AuditTrail({ store: 'memory', integrity: 'sha256-chain' });

    for (let i = 0; i < 5; i++) {
      await audit.record({
        action: `action-${i}`, tool: 'tool', server: 'server', tier: 'auto',
        input: {}, output: {}, persona: 'sentinel', durationMs: i * 10, timestamp: new Date(),
      });
    }

    const result = await audit.verify();
    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(5);
  });

  it('queries by tier', async () => {
    const audit = new AuditTrail({ store: 'memory', integrity: 'sha256-chain' });

    await audit.record({
      action: 'read', tool: 'read', server: 'vault', tier: 'auto',
      input: {}, output: {}, persona: 'sentinel', durationMs: 10, timestamp: new Date(),
    });
    await audit.record({
      action: 'delete', tool: 'delete', server: 'vault', tier: 'approve',
      input: {}, output: {}, persona: 'sentinel', durationMs: 20, timestamp: new Date(),
    });
    await audit.record({
      action: 'contain', tool: 'contain', server: 'cs', tier: 'escalate',
      input: {}, output: {}, persona: 'sentinel', durationMs: 30, timestamp: new Date(),
    });

    const autoActions = await audit.query({ tier: 'auto' });
    expect(autoActions).toHaveLength(1);
    expect(autoActions[0].action).toBe('read');

    const approveActions = await audit.query({ tier: 'approve' });
    expect(approveActions).toHaveLength(1);
    expect(approveActions[0].action).toBe('delete');
  });

  it('exports to JSON', async () => {
    const audit = new AuditTrail({ store: 'memory', integrity: 'sha256-chain' });

    await audit.record({
      action: 'test', tool: 'tool', server: 'server', tier: 'auto',
      input: {}, output: {}, persona: 'sentinel', durationMs: 10, timestamp: new Date(),
    });

    const json = await audit.export('json');
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });

  it('exports to CSV', async () => {
    const audit = new AuditTrail({ store: 'memory', integrity: 'sha256-chain' });

    await audit.record({
      action: 'test', tool: 'tool', server: 'server', tier: 'auto',
      input: {}, output: {}, persona: 'sentinel', durationMs: 10, timestamp: new Date(),
    });

    const csv = await audit.export('csv');
    expect(csv).toContain('id,sequenceNumber,timestamp');
    expect(csv.split('\n')).toHaveLength(2); // header + 1 row
  });

  it('exports to syslog', async () => {
    const audit = new AuditTrail({ store: 'memory', integrity: 'sha256-chain' });

    await audit.record({
      action: 'test', tool: 'tool', server: 'server', tier: 'auto',
      input: {}, output: {}, persona: 'sentinel', durationMs: 10, timestamp: new Date(),
    });

    const syslog = await audit.export('syslog');
    expect(syslog).toContain('epic-ai audit');
    expect(syslog).toContain('action=test');
  });

  it('produces deterministic hash regardless of nested key order', () => {
    const baseRecord = {
      id: '00000000-0000-0000-0000-000000000001',
      sequenceNumber: 0,
      previousHash: '',
      timestamp: new Date('2026-01-01T00:00:00.000Z'),
      action: 'test',
      tool: 'tool',
      server: 'server',
      tier: 'auto' as const,
      persona: 'sentinel',
      durationMs: 10,
    };

    // Nested objects with keys in different insertion order
    const hash1 = HashChain.computeHash({
      ...baseRecord,
      input: { z: 1, a: 2, nested: { c: 3, b: 4 } },
      output: { beta: 'b', alpha: 'a' },
    });

    const hash2 = HashChain.computeHash({
      ...baseRecord,
      input: { a: 2, z: 1, nested: { b: 4, c: 3 } },
      output: { alpha: 'a', beta: 'b' },
    });

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex
  });
});
