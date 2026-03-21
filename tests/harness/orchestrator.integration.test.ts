/**
 * @epicai/core — Harness Orchestrator Integration Tests
 * Exercises EpicAI.create/start/run/stream against the harness STDIO backend.
 * Validates planner behavior, approval gating, stream ordering, sanitization,
 * and audit recording — the things the backend-only tests cannot catch.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EpicAI } from '../../src/EpicAI.js';
import type { EpicAIAgent, StreamEvent, LLMResponse } from '../../src/types/index.js';

/**
 * Deterministic mock LLM that routes tool calls based on the user query.
 * This replaces the real Ollama/OpenAI orchestrator so tests run without a model.
 */
function createMockLLM(behavior: 'echo' | 'approval' | 'multi-step' | 'passthrough') {
  return async (opts: { messages: Array<{ role: string; content?: string | null }>; tools?: unknown[] }): Promise<LLMResponse> => {
    if (behavior === 'echo') {
      // First call: route to echo tool. After tool result: respond with text.
      const hasToolResult = opts.messages.some(m => m.role === 'tool');
      if (!hasToolResult) {
        return {
          content: null,
          finishReason: 'tool_calls',
          toolCalls: [{ id: 'tc-1', name: 'harness-stdio:echo', arguments: { message: 'orchestrator-test' } }],
        };
      }
      return { content: 'Echo complete.', finishReason: 'stop', toolCalls: [] };
    }

    if (behavior === 'approval') {
      const hasToolResult = opts.messages.some(m => m.role === 'tool');
      const hasApprovalMsg = opts.messages.some(m => m.role === 'assistant' && typeof m.content === 'string' && m.content.includes('requires human approval'));
      if (!hasToolResult && !hasApprovalMsg) {
        return {
          content: null,
          finishReason: 'tool_calls',
          toolCalls: [{ id: 'tc-2', name: 'harness-stdio:approval_target', arguments: { action: 'delete_all' } }],
        };
      }
      return { content: 'Approval required.', finishReason: 'stop', toolCalls: [] };
    }

    if (behavior === 'multi-step') {
      const toolResults = opts.messages.filter(m => m.role === 'tool');
      if (toolResults.length === 0) {
        return {
          content: null,
          finishReason: 'tool_calls',
          toolCalls: [{ id: 'tc-3', name: 'harness-stdio:multi_step', arguments: { step: 1 } }],
        };
      }
      if (toolResults.length === 1) {
        return {
          content: null,
          finishReason: 'tool_calls',
          toolCalls: [{ id: 'tc-4', name: 'harness-stdio:echo', arguments: { message: 'follow-up from multi_step' } }],
        };
      }
      return { content: 'Multi-step complete.', finishReason: 'stop', toolCalls: [] };
    }

    // passthrough: no tool calls, just respond
    return { content: 'Passthrough response.', finishReason: 'stop', toolCalls: [] };
  };
}

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve to dist/ — pretest ensures it's built before tests run
const __testDir = dirname(fileURLToPath(import.meta.url));
const HARNESS_STDIO_SCRIPT = resolve(__testDir, '..', '..', 'dist', 'harness', 'stdio', 'process.js');

describe('Orchestrator Integration with Harness', { timeout: 30_000 }, () => {

  it('runs echo tool through full orchestrator loop and produces correct stream events', async () => {
    const agent = await EpicAI.create({
      orchestrator: { provider: 'custom', model: 'mock', llm: createMockLLM('echo') as never },
      generator: { provider: 'custom', model: 'mock', llm: createMockLLM('passthrough') as never },
      federation: {
        servers: [
          { name: 'harness-stdio', transport: 'stdio', command: 'node', args: [HARNESS_STDIO_SCRIPT] },
        ],
      },
      autonomy: {
        tiers: {
          auto: ['echo', 'sleep', 'ping', 'multi_step', 'stateful_counter', 'malformed', 'fail'],
          escalate: [],
          approve: ['approval_target'],
        },
      },
      persona: {
        name: 'test',
        tone: 'neutral',
        domain: 'testing',
        systemPrompt: 'You are a test harness.',
      },
      audit: { store: 'memory', integrity: 'sha256-chain' },
    });

    await agent.start();

    try {
      // Collect stream events
      const events: StreamEvent[] = [];
      for await (const event of agent.stream('echo test')) {
        events.push(event);
      }

      // Verify stream ordering: plan → action → result → narrative → done
      const types = events.map(e => e.type);

      expect(types).toContain('plan');
      expect(types).toContain('action');
      expect(types).toContain('result');
      expect(types).toContain('narrative');
      expect(types).toContain('done');

      // plan must appear before action
      expect(types.indexOf('plan')).toBeLessThan(types.indexOf('action'));
      // action must appear before result
      expect(types.indexOf('action')).toBeLessThan(types.indexOf('result'));
      // result must appear before done
      expect(types.indexOf('result')).toBeLessThan(types.indexOf('done'));
      // done must be last
      expect(types[types.length - 1]).toBe('done');

      // Verify action event references the echo tool
      const actionEvent = events.find(e => e.type === 'action');
      expect((actionEvent!.data as Record<string, unknown>).tool).toBe('harness-stdio:echo');

      // Verify result event has content
      const resultEvent = events.find(e => e.type === 'result');
      expect((resultEvent!.data as Record<string, unknown>).isError).toBe(false);

      // Verify audit trail
      const auditRecords = await agent.audit.query({});
      expect(auditRecords.length).toBeGreaterThan(0);
      expect(auditRecords[0].tool).toBe('harness-stdio:echo');

      // Verify audit chain integrity
      const intact = await agent.audit.verify();
      expect(intact).toHaveProperty('valid', true);
    } finally {
      await agent.stop();
    }
  });

  it('approval_target triggers approval-needed event before execution', async () => {
    const agent = await EpicAI.create({
      orchestrator: { provider: 'custom', model: 'mock', llm: createMockLLM('approval') as never },
      generator: { provider: 'custom', model: 'mock', llm: createMockLLM('passthrough') as never },
      federation: {
        servers: [
          { name: 'harness-stdio', transport: 'stdio', command: 'node', args: [HARNESS_STDIO_SCRIPT] },
        ],
      },
      autonomy: {
        tiers: {
          auto: ['echo', 'sleep', 'ping'],
          escalate: [],
          approve: ['approval_target'],
        },
      },
      persona: {
        name: 'test',
        tone: 'neutral',
        domain: 'testing',
        systemPrompt: 'You are a test harness.',
      },
      audit: { store: 'memory', integrity: 'sha256-chain' },
    });

    await agent.start();

    try {
      const events: StreamEvent[] = [];
      for await (const event of agent.stream('approval test')) {
        events.push(event);
      }

      const types = events.map(e => e.type);

      // approval-needed must appear
      expect(types).toContain('approval-needed');

      // approval-needed must appear before done
      expect(types.indexOf('approval-needed')).toBeLessThan(types.indexOf('done'));

      // No action event for the approval_target tool (it was blocked)
      const actionEvents = events.filter(e => e.type === 'action');
      const approvalActions = actionEvents.filter(e =>
        (e.data as Record<string, unknown>).tool === 'harness-stdio:approval_target'
      );
      expect(approvalActions.length).toBe(0);

      // done should report pending actions
      const doneEvent = events.find(e => e.type === 'done');
      expect((doneEvent!.data as Record<string, unknown>).actionsPending).toBeGreaterThan(0);
    } finally {
      await agent.stop();
    }
  });

  it('multi_step causes orchestrator to iterate correctly', async () => {
    const agent = await EpicAI.create({
      orchestrator: { provider: 'custom', model: 'mock', llm: createMockLLM('multi-step') as never },
      generator: { provider: 'custom', model: 'mock', llm: createMockLLM('passthrough') as never },
      federation: {
        servers: [
          { name: 'harness-stdio', transport: 'stdio', command: 'node', args: [HARNESS_STDIO_SCRIPT] },
        ],
      },
      autonomy: {
        tiers: {
          auto: ['echo', 'sleep', 'ping', 'multi_step', 'stateful_counter', 'malformed', 'fail'],
          escalate: [],
          approve: ['approval_target'],
        },
      },
      persona: {
        name: 'test',
        tone: 'neutral',
        domain: 'testing',
        systemPrompt: 'You are a test harness.',
      },
      audit: { store: 'memory', integrity: 'sha256-chain' },
    });

    await agent.start();

    try {
      const events: StreamEvent[] = [];
      for await (const event of agent.stream('multi step test')) {
        events.push(event);
      }

      const types = events.map(e => e.type);

      // Verify plan→action→result ordering within each iteration.
      // Extract indices of each event type to prove sequencing, not just counts.
      const planIndices = types.map((t, i) => t === 'plan' ? i : -1).filter(i => i >= 0);
      const actionIndices = types.map((t, i) => t === 'action' ? i : -1).filter(i => i >= 0);
      const resultIndices = types.map((t, i) => t === 'result' ? i : -1).filter(i => i >= 0);

      // Must have at least 2 of each (two iterations)
      expect(planIndices.length).toBeGreaterThanOrEqual(2);
      expect(actionIndices.length).toBeGreaterThanOrEqual(2);
      expect(resultIndices.length).toBeGreaterThanOrEqual(2);

      // Each iteration: plan[n] < action[n] < result[n]
      for (let i = 0; i < Math.min(planIndices.length, actionIndices.length, resultIndices.length); i++) {
        expect(planIndices[i]).toBeLessThan(actionIndices[i]);
        expect(actionIndices[i]).toBeLessThan(resultIndices[i]);
      }

      // Second iteration starts after first iteration's result
      expect(planIndices[1]).toBeGreaterThan(resultIndices[0]);

      // done reports correct action count
      const doneEvent = events.find(e => e.type === 'done');
      expect((doneEvent!.data as Record<string, unknown>).actionsExecuted).toBeGreaterThanOrEqual(2);
      expect((doneEvent!.data as Record<string, unknown>).loopIterations).toBeGreaterThanOrEqual(2);

      // done is terminal
      expect(types[types.length - 1]).toBe('done');
    } finally {
      await agent.stop();
    }
  });

  it('sanitizes tool output containing injection-looking content', async () => {
    // Side-effect capture: the orchestrator LLM records what it saw in the tool message.
    // We assert on this directly, not on result.response (which comes from the generator).
    let capturedToolContent: string | null = null;

    const injectionLLM = async (opts: { messages: Array<{ role: string; content?: string | null }>; tools?: unknown[] }): Promise<LLMResponse> => {
      const hasToolResult = opts.messages.some(m => m.role === 'tool');
      if (!hasToolResult) {
        return {
          content: null,
          finishReason: 'tool_calls',
          toolCalls: [{ id: 'tc-5', name: 'harness-stdio:malformed', arguments: { variant: 3 } }],
        };
      }
      // Capture the actual tool message content the orchestrator sees after sanitization
      const toolMsg = opts.messages.find(m => m.role === 'tool');
      if (toolMsg && typeof toolMsg.content === 'string') {
        capturedToolContent = toolMsg.content;
      }
      // Return no tool calls — orchestrator exits the loop
      return { content: null, finishReason: 'stop', toolCalls: [] };
    };

    const agent = await EpicAI.create({
      orchestrator: { provider: 'custom', model: 'mock', llm: injectionLLM as never },
      generator: { provider: 'custom', model: 'mock', llm: createMockLLM('passthrough') as never },
      federation: {
        servers: [
          { name: 'harness-stdio', transport: 'stdio', command: 'node', args: [HARNESS_STDIO_SCRIPT] },
        ],
      },
      autonomy: {
        tiers: {
          auto: ['echo', 'sleep', 'ping', 'multi_step', 'stateful_counter', 'malformed', 'fail'],
          escalate: [],
          approve: ['approval_target'],
        },
      },
      persona: {
        name: 'test',
        tone: 'neutral',
        domain: 'testing',
        systemPrompt: 'You are a test harness.',
      },
      audit: { store: 'memory', integrity: 'sha256-chain' },
    });

    await agent.start();

    try {
      await agent.run('sanitization test');

      // Assert directly on what the orchestrator LLM received — not on generator output.
      // Variant 3 is a multi-line string. sanitizeInjectedContent strips lines
      // starting with "system:" and "ignore" patterns.
      expect(capturedToolContent).not.toBeNull();
      // Lines starting with "system:" should be stripped
      expect(capturedToolContent).not.toContain('ignore previous instructions');
      // Lines starting with "ignore" should be stripped
      expect(capturedToolContent).not.toContain('ignore all prior context');
      // Normal lines should survive sanitization
      expect(capturedToolContent).toContain('Normal tool output line 1');
      expect(capturedToolContent).toContain('Normal tool output line 2');
      expect(capturedToolContent).toContain('Final normal line');
    } finally {
      await agent.stop();
    }
  });
});
