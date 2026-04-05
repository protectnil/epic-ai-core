/**
 * @epicai/legion — EpicAI.create() Tests
 * Verifies that EpicAI.create() with valid config returns an agent with real methods.
 */

import { describe, it, expect } from 'vitest';
import { EpicAI } from '../src/EpicAI.js';
import type { EpicAIConfig, LLMResponse } from '../src/types/index.js';

function makeValidConfig(): EpicAIConfig {
  const mockLLM = async () => ({
    content: 'test response',
    toolCalls: [],
    finishReason: 'stop' as const,
  } satisfies LLMResponse);

  return {
    orchestrator: {
      provider: 'custom',
      model: 'test-model',
      llm: mockLLM,
    },
    generator: {
      provider: 'custom',
      model: 'test-generator',
      llm: mockLLM,
    },
    federation: {
      servers: [
        { name: 'test-server', transport: 'stdio', command: 'echo' },
      ],
    },
    autonomy: {
      tiers: {
        auto: ['read', 'query'],
        escalate: ['write'],
        approve: ['delete'],
      },
    },
    persona: {
      name: 'test-persona',
      tone: 'neutral',
      domain: 'testing',
      systemPrompt: 'You are a test assistant.',
    },
    audit: {
      store: 'memory',
      integrity: 'sha256-chain',
    },
  };
}

describe('EpicAI.create()', () => {
  it('returns an agent with real accessor methods', async () => {
    const config = makeValidConfig();
    const agent = await EpicAI.create(config);

    // Verify the agent has the expected interface
    expect(agent).toBeDefined();
    expect(typeof agent.start).toBe('function');
    expect(typeof agent.stop).toBe('function');
    expect(typeof agent.run).toBe('function');
    expect(typeof agent.stream).toBe('function');
    expect(typeof agent.approve).toBe('function');
    expect(typeof agent.deny).toBe('function');

    // Verify accessors are real objects, not stubs that throw
    expect(agent.audit).toBeDefined();
    expect(typeof agent.audit.query).toBe('function');
    expect(typeof agent.audit.verify).toBe('function');
    expect(typeof agent.audit.export).toBe('function');

    expect(agent.federation).toBeDefined();
    expect(typeof agent.federation.health).toBe('function');
    expect(typeof agent.federation.listTools).toBe('function');

    expect(agent.autonomy).toBeDefined();
    expect(typeof agent.autonomy.pending).toBe('function');
    expect(typeof agent.autonomy.listPolicies).toBe('function');
  });

  it('audit accessor works without start()', async () => {
    const agent = await EpicAI.create(makeValidConfig());

    // Audit query should work even before start — returns empty
    const records = await agent.audit.query({});
    expect(Array.isArray(records)).toBe(true);
    expect(records).toHaveLength(0);

    // Verify should return valid empty chain
    const verification = await agent.audit.verify();
    expect(verification.valid).toBe(true);
    expect(verification.chainLength).toBe(0);

    // Export should work
    const json = await agent.audit.export('json');
    expect(json).toBe('[]');
  });

  it('federation accessor returns empty tools before start', async () => {
    const agent = await EpicAI.create(makeValidConfig());

    // Before start, no connections are established
    const tools = agent.federation.listTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools).toHaveLength(0);
  });

  it('autonomy accessor returns empty pending and policies', async () => {
    const agent = await EpicAI.create(makeValidConfig());

    const pending = await agent.autonomy.pending();
    expect(Array.isArray(pending)).toBe(true);
    expect(pending).toHaveLength(0);

    const policies = agent.autonomy.listPolicies();
    expect(Array.isArray(policies)).toBe(true);
  });

  it('run() throws before start()', async () => {
    const agent = await EpicAI.create(makeValidConfig());

    await expect(agent.run('test')).rejects.toThrow('Agent not started');
  });

  it('rejects invalid config', async () => {
    await expect(EpicAI.create({} as EpicAIConfig)).rejects.toThrow();
  });

  it('registers autonomy policies from config', async () => {
    const config = makeValidConfig();
    config.autonomy.policies = [
      {
        name: 'block-all-deletes',
        condition: (ctx) => ctx.tool === 'delete',
        override: 'approve',
        priority: 100,
      },
    ];

    const agent = await EpicAI.create(config);
    const policies = agent.autonomy.listPolicies();
    expect(policies).toHaveLength(1);
    expect(policies[0].name).toBe('block-all-deletes');
  });
});
