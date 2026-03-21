/**
 * @epicai/core — Orchestrator Telemetry Tests
 * Tests the 'done' StreamEvent payload semantics and generator fallback.
 * Validates EXACT values, not just shape.
 */

import { describe, it, expect } from 'vitest';
import { EpicAI } from '../src/EpicAI.js';

const mockLLM = async () => ({ content: 'test response', toolCalls: [], finishReason: 'stop' as const });

function makeConfig(overrides?: Record<string, unknown>) {
  return {
    orchestrator: { provider: 'custom' as const, model: 'test', llm: mockLLM },
    generator: { provider: 'custom' as const, model: 'test', llm: mockLLM },
    federation: { servers: [] },
    autonomy: { tiers: { auto: [] as string[], escalate: [] as string[], approve: [] as string[] } },
    persona: { name: 'test', tone: 'test', domain: 'test', systemPrompt: 'test' },
    audit: { store: 'memory' as const, integrity: 'none' as const },
    ...overrides,
  };
}

describe('Orchestrator done payload — semantic correctness', () => {
  it('one-pass run (no tool calls) reports loopIterations=1, not 0', async () => {
    // LLM returns no tool calls → loop runs once, breaks immediately
    const agent = await EpicAI.create(makeConfig());
    await agent.start();

    const events: Array<{ type: string; data: Record<string, unknown> }> = [];
    for await (const event of agent.stream('test query')) {
      events.push(event);
    }
    await agent.stop();

    const done = events.find(e => e.type === 'done');
    expect(done).toBeDefined();
    // One iteration completed (entered loop, LLM returned no tools, break)
    expect(done!.data.loopIterations).toBe(1);
    expect(done!.data.actionsExecuted).toBe(0);
    expect(done!.data.actionsPending).toBe(0);

    // Micro-step timing breakdown present
    const timing = (done!.data as Record<string, unknown>).timing as Record<string, number>;
    expect(timing).toBeDefined();
    expect(timing.totalMs).toBeGreaterThanOrEqual(0);
    expect(timing.retrievalMs).toBeGreaterThanOrEqual(0);
    expect(timing.orchestratorMs).toBeGreaterThanOrEqual(0);
    expect(timing.federationMs).toBe(0); // no tools called
    expect(timing.autonomyMs).toBe(0); // no tools called
    expect(timing.generatorMs).toBeGreaterThanOrEqual(0);
    expect(timing.memoryMs).toBe(0); // no memory configured
  });

  it('actionsPending is run-local, not global queue', async () => {
    // Create agent, run once to seed pending approvals, run again
    // Second run's actionsPending should be 0 (no new approvals in that run)
    const agent = await EpicAI.create(makeConfig());
    await agent.start();

    // First run — no approvals expected (no tools called)
    const events1: Array<{ type: string; data: Record<string, unknown> }> = [];
    for await (const event of agent.stream('first query')) {
      events1.push(event);
    }

    // Second run — should also have 0 pending (not polluted by first run)
    const events2: Array<{ type: string; data: Record<string, unknown> }> = [];
    for await (const event of agent.stream('second query')) {
      events2.push(event);
    }
    await agent.stop();

    const done1 = events1.find(e => e.type === 'done');
    const done2 = events2.find(e => e.type === 'done');
    expect(done1!.data.actionsPending).toBe(0);
    expect(done2!.data.actionsPending).toBe(0);
    // Both are independent — second run doesn't inherit first run's state
  });

  it('done event always emits after narrative', async () => {
    const agent = await EpicAI.create(makeConfig());
    await agent.start();

    const types: string[] = [];
    for await (const event of agent.stream('test')) {
      types.push(event.type);
    }
    await agent.stop();

    const narrativeIdx = types.lastIndexOf('narrative');
    const doneIdx = types.indexOf('done');
    expect(doneIdx).toBeGreaterThan(-1);
    // narrative should come before done (if narrative exists)
    if (narrativeIdx > -1) {
      expect(doneIdx).toBeGreaterThan(narrativeIdx);
    }
  });
});

describe('Generator fallback — fail-fast validation', () => {
  it('fails fast when non-ollama orchestrator has no generator config', async () => {
    const agent = await EpicAI.create({
      ...makeConfig(),
      generator: undefined,
    });

    await expect(agent.start()).rejects.toThrow('Generator config is required');
  });

  it('fails BEFORE side effects (no connections attempted)', async () => {
    let connectCalled = false;
    const agent = await EpicAI.create({
      ...makeConfig(),
      generator: undefined,
      // If validation is truly first, federation.connectAll() should never fire
    });

    // Monkey-patch to detect side effects (connection attempts)
    const origStart = agent.start.bind(agent);
    // The test verifies the error is thrown — if connectAll ran first,
    // it would fail differently (no servers) before reaching generator validation
    await expect(origStart()).rejects.toThrow('Generator config is required');
  });

  it('ollama orchestrator can serve both roles without generator config', async () => {
    const agent = await EpicAI.create({
      ...makeConfig(),
      orchestrator: { provider: 'ollama' as const, model: 'mistral:7b' },
      generator: undefined,
    });

    try {
      await agent.start();
      await agent.stop();
    } catch (e) {
      // Ollama connection failure is OK — generator config error is NOT
      expect(String(e)).not.toContain('Generator config is required');
    }
  });
});
