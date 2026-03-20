/**
 * @epic-ai/core — TieredAutonomy Prefixed Tool Name Tests
 * Verifies that server-prefixed tool names (e.g. "vault:read") correctly
 * match against unprefixed rule entries (e.g. "read").
 */

import { describe, it, expect, afterEach } from 'vitest';
import { TieredAutonomy } from '../src/autonomy/TieredAutonomy.js';
import type { ActionContext, ActionRecord } from '../src/types/index.js';

function makeContext(tool: string, server = 'test-server'): ActionContext {
  return {
    tool,
    server,
    args: {},
    persona: 'praetor',
    timestamp: new Date(),
    priorActions: [] as ActionRecord[],
  };
}

describe('TieredAutonomy — prefixed tool name matching', () => {
  let autonomy: TieredAutonomy;

  afterEach(() => {
    autonomy?.destroy();
  });

  it('matches "vault:read" against auto tier rule "read"', async () => {
    autonomy = new TieredAutonomy({
      auto: ['read', 'query', 'search'],
      escalate: ['contain'],
      approve: ['delete'],
    });

    const decision = await autonomy.evaluate(makeContext('vault:read'));
    expect(decision.tier).toBe('auto');
    expect(decision.allowed).toBe(true);
  });

  it('matches "splunk:query" against auto tier rule "query"', async () => {
    autonomy = new TieredAutonomy({
      auto: ['read', 'query', 'search'],
      escalate: ['contain'],
      approve: ['delete'],
    });

    const decision = await autonomy.evaluate(makeContext('splunk:query'));
    expect(decision.tier).toBe('auto');
    expect(decision.allowed).toBe(true);
  });

  it('matches "crowdstrike:contain" against escalate tier', async () => {
    autonomy = new TieredAutonomy({
      auto: ['read'],
      escalate: ['contain', 'isolate'],
      approve: ['delete'],
    });

    const decision = await autonomy.evaluate(makeContext('crowdstrike:contain'));
    expect(decision.tier).toBe('escalate');
    expect(decision.allowed).toBe(true);
  });

  it('matches "vault:delete" against approve tier rule "delete"', async () => {
    autonomy = new TieredAutonomy({
      auto: ['read'],
      escalate: ['contain'],
      approve: ['delete', 'revoke'],
    });

    const decision = await autonomy.evaluate(makeContext('vault:delete'));
    expect(decision.tier).toBe('approve');
    expect(decision.allowed).toBe(false);
  });

  it('still matches unprefixed tool names directly', async () => {
    autonomy = new TieredAutonomy({
      auto: ['read'],
      escalate: ['contain'],
      approve: ['delete'],
    });

    const decision = await autonomy.evaluate(makeContext('read'));
    expect(decision.tier).toBe('auto');
    expect(decision.allowed).toBe(true);
  });

  it('still matches fully qualified prefixed rules', async () => {
    autonomy = new TieredAutonomy({
      auto: ['vault:read'],
      escalate: [],
      approve: [],
    });

    const decision = await autonomy.evaluate(makeContext('vault:read'));
    expect(decision.tier).toBe('auto');
    expect(decision.allowed).toBe(true);
  });

  it('defaults unmatched prefixed tool to approve (safest)', async () => {
    autonomy = new TieredAutonomy({
      auto: ['read'],
      escalate: ['contain'],
      approve: ['delete'],
    });

    const decision = await autonomy.evaluate(makeContext('vault:unknown-tool'));
    expect(decision.tier).toBe('approve');
    expect(decision.allowed).toBe(false);
  });

  it('preserves full prefixed name in ActionDecision.action', async () => {
    autonomy = new TieredAutonomy({
      auto: ['read'],
      escalate: [],
      approve: [],
    });

    const decision = await autonomy.evaluate(makeContext('vault:read'));
    expect(decision.action).toBe('vault:read');
  });

  it('handles multi-colon tool names like "server:ns:tool"', async () => {
    autonomy = new TieredAutonomy({
      auto: ['ns:tool'],
      escalate: [],
      approve: [],
    });

    const decision = await autonomy.evaluate(makeContext('server:ns:tool'));
    expect(decision.tier).toBe('auto');
    expect(decision.allowed).toBe(true);
  });
});
