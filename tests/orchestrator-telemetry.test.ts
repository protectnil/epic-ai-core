/**
 * @epic-ai/core — Orchestrator Telemetry Tests
 * Tests the 'done' StreamEvent payload and generator fallback behavior.
 */

import { describe, it, expect } from 'vitest';
import { EpicAI } from '../src/EpicAI.js';

describe('Orchestrator done payload', () => {
  it('done event has loopIterations (not action count)', async () => {
    const agent = await EpicAI.create({
      orchestrator: { provider: 'custom', model: 'test', llm: async () => ({ content: 'test', toolCalls: [], finishReason: 'stop' as const }) },
      generator: { provider: 'custom', model: 'test', llm: async () => ({ content: 'synthesized response', toolCalls: [], finishReason: 'stop' as const }) },
      federation: { servers: [] },
      autonomy: { tiers: { auto: [], escalate: [], approve: [] } },
      persona: { name: 'test', tone: 'test', domain: 'test', systemPrompt: 'test' },
      audit: { store: 'memory', integrity: 'none' },
    });

    await agent.start();
    const events: Array<{ type: string; data: Record<string, unknown> }> = [];
    for await (const event of agent.stream('test query')) {
      events.push(event);
    }
    await agent.stop();

    const doneEvent = events.find(e => e.type === 'done');
    expect(doneEvent).toBeDefined();
    expect(doneEvent!.data).toHaveProperty('loopIterations');
    expect(doneEvent!.data).toHaveProperty('actionsExecuted');
    expect(doneEvent!.data).toHaveProperty('actionsPending');
    expect(typeof doneEvent!.data.loopIterations).toBe('number');
    expect(typeof doneEvent!.data.actionsPending).toBe('number');
  });
});

describe('Generator fallback', () => {
  it('fails fast when non-ollama orchestrator has no generator config', async () => {
    const agent = await EpicAI.create({
      orchestrator: { provider: 'custom', model: 'test', llm: async () => ({ content: 'test', toolCalls: [], finishReason: 'stop' as const }) },
      // No generator config — and provider is 'custom', not 'ollama'
      federation: { servers: [] },
      autonomy: { tiers: { auto: [], escalate: [], approve: [] } },
      persona: { name: 'test', tone: 'test', domain: 'test', systemPrompt: 'test' },
      audit: { store: 'memory', integrity: 'none' },
    });

    await expect(agent.start()).rejects.toThrow('Generator config is required');
  });

  it('ollama orchestrator can serve both roles without generator config', async () => {
    // This test validates the Ollama fallback path — it won't actually connect
    // to Ollama, but it should NOT throw about missing generator config.
    const agent = await EpicAI.create({
      orchestrator: { provider: 'ollama', model: 'mistral:7b' },
      // No generator config — but provider is 'ollama', so orchestrator doubles as generator
      federation: { servers: [] },
      autonomy: { tiers: { auto: [], escalate: [], approve: [] } },
      persona: { name: 'test', tone: 'test', domain: 'test', systemPrompt: 'test' },
      audit: { store: 'memory', integrity: 'none' },
    });

    // start() should not throw about generator — it may throw about Ollama connection
    // which is expected since Ollama may not be running. The point is it doesn't
    // throw about missing generator config.
    try {
      await agent.start();
      await agent.stop();
    } catch (e) {
      // Ollama connection failure is OK — generator config error is NOT
      expect(String(e)).not.toContain('Generator config is required');
    }
  });
});
