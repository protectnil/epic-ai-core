/**
 * @epicai/legion — Autonomy Layer Tests
 * Tests TieredAutonomy, PolicyEngine, ApprovalQueue without external deps.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { TieredAutonomy } from '../src/autonomy/TieredAutonomy.js';
import type { ActionContext, ActionRecord } from '../src/types/index.js';

function makeContext(tool: string): ActionContext {
  return {
    tool,
    server: 'test-server',
    args: {},
    persona: 'sentinel',
    timestamp: new Date(),
    priorActions: [] as ActionRecord[],
  };
}

describe('TieredAutonomy', () => {
  let autonomy: TieredAutonomy;

  afterEach(() => {
    autonomy?.destroy();
  });

  it('classifies auto-tier actions as allowed', async () => {
    autonomy = new TieredAutonomy({
      auto: ['read', 'query', 'search'],
      escalate: ['contain'],
      approve: ['delete'],
    });

    const decision = await autonomy.evaluate(makeContext('read'));
    expect(decision.tier).toBe('auto');
    expect(decision.allowed).toBe(true);
  });

  it('classifies escalate-tier actions as allowed but flagged', async () => {
    autonomy = new TieredAutonomy({
      auto: ['read'],
      escalate: ['contain', 'isolate'],
      approve: ['delete'],
    });

    const decision = await autonomy.evaluate(makeContext('contain'));
    expect(decision.tier).toBe('escalate');
    expect(decision.allowed).toBe(true);
  });

  it('classifies approve-tier actions as not allowed (pending)', async () => {
    autonomy = new TieredAutonomy({
      auto: ['read'],
      escalate: ['contain'],
      approve: ['delete', 'revoke'],
    });

    const decision = await autonomy.evaluate(makeContext('delete'));
    expect(decision.tier).toBe('approve');
    expect(decision.allowed).toBe(false);
  });

  it('defaults unknown actions to approve tier (safest)', async () => {
    autonomy = new TieredAutonomy({
      auto: ['read'],
      escalate: ['contain'],
      approve: ['delete'],
    });

    const decision = await autonomy.evaluate(makeContext('unknown-action'));
    expect(decision.tier).toBe('approve');
    expect(decision.allowed).toBe(false);
  });

  it('approves a pending action', async () => {
    autonomy = new TieredAutonomy({
      auto: [],
      escalate: [],
      approve: ['delete'],
    });

    const decision = await autonomy.evaluate(makeContext('delete'));
    expect(decision.allowed).toBe(false);

    const approved = await autonomy.approve(decision.id, 'analyst@company.com');
    expect(approved.allowed).toBe(true);
    expect(approved.approvedBy).toBe('analyst@company.com');
  });

  it('denies a pending action', async () => {
    autonomy = new TieredAutonomy({
      auto: [],
      escalate: [],
      approve: ['delete'],
    });

    const decision = await autonomy.evaluate(makeContext('delete'));
    const denied = await autonomy.deny(decision.id, 'admin@company.com', 'Not authorized');
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe('Not authorized');
  });

  it('approve is idempotent', async () => {
    autonomy = new TieredAutonomy({
      auto: [],
      escalate: [],
      approve: ['delete'],
    });

    const decision = await autonomy.evaluate(makeContext('delete'));
    const first = await autonomy.approve(decision.id, 'analyst@company.com');
    const second = await autonomy.approve(decision.id, 'other@company.com');
    expect(first.approvedBy).toBe('analyst@company.com');
    expect(second.approvedBy).toBe('analyst@company.com'); // unchanged
  });

  it('dynamic policy overrides static tier', async () => {
    autonomy = new TieredAutonomy({
      auto: ['contain'],
      escalate: [],
      approve: [],
    });

    autonomy.addPolicy({
      name: 'always-approve-contain',
      condition: (ctx) => ctx.tool === 'contain',
      override: 'approve',
      priority: 10,
    });

    const decision = await autonomy.evaluate(makeContext('contain'));
    expect(decision.tier).toBe('approve');
    expect(decision.policyApplied).toBe('always-approve-contain');
  });

  it('higher priority policy wins', async () => {
    autonomy = new TieredAutonomy({
      auto: ['search'],
      escalate: [],
      approve: [],
    });

    autonomy.addPolicy({
      name: 'low-priority',
      condition: () => true,
      override: 'escalate',
      priority: 1,
    });

    autonomy.addPolicy({
      name: 'high-priority',
      condition: () => true,
      override: 'approve',
      priority: 10,
    });

    const decision = await autonomy.evaluate(makeContext('search'));
    expect(decision.tier).toBe('approve');
    expect(decision.policyApplied).toBe('high-priority');
  });

  it('removePolicy stops it from applying', async () => {
    autonomy = new TieredAutonomy({
      auto: ['read'],
      escalate: [],
      approve: [],
    });

    autonomy.addPolicy({
      name: 'block-reads',
      condition: (ctx) => ctx.tool === 'read',
      override: 'approve',
    });

    expect((await autonomy.evaluate(makeContext('read'))).tier).toBe('approve');

    autonomy.removePolicy('block-reads');
    expect((await autonomy.evaluate(makeContext('read'))).tier).toBe('auto');
  });

  it('lists pending approvals', async () => {
    autonomy = new TieredAutonomy({
      auto: [],
      escalate: [],
      approve: ['delete', 'revoke'],
    });

    autonomy.evaluate(makeContext('delete'));
    autonomy.evaluate(makeContext('revoke'));

    expect(await autonomy.pending()).toHaveLength(2);
  });
});
