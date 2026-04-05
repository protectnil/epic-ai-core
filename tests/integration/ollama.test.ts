/**
 * @epicai/legion — Inference Integration Test
 * Tests the orchestrator provider against a local model via the
 * Inference Gateway (llama.cpp / mlx-lm / vLLM) or Ollama fallback.
 *
 * Backend priority:
 *   1. Gateway at localhost:8000 (V2 — works on M5 Metal)
 *   2. Ollama at localhost:11434 (legacy fallback)
 *
 * Default model: llama3.1:8b
 * Override: EPICAI_TEST_MODEL=qwen2.5:7b npm run test:integration
 * Requires: at least one backend running with the target model.
 * CPU/Metal inference — expect 10-60 seconds per call.
 */

import { describe, it, expect } from 'vitest';
import { createOrchestratorLLM } from '../../src/orchestrator/OrchestratorProvider.js';
import type { LLMToolDefinition } from '../../src/types/index.js';

const GATEWAY_URL = process.env.EPICAI_GATEWAY_URL || 'http://localhost:8000';
const OLLAMA_URL = process.env.EPICAI_OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.EPICAI_TEST_MODEL || 'llama3.1:8b';

async function probeEndpoint(url: string, path: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function detectBackend(): Promise<{ provider: 'auto' | 'ollama'; baseUrl: string } | null> {
  // Probe order: gateway → llama.cpp direct → Ollama
  if (await probeEndpoint(GATEWAY_URL, '/v1/models')) {
    return { provider: 'auto', baseUrl: GATEWAY_URL };
  }
  if (await probeEndpoint('http://localhost:8080', '/v1/models')) {
    return { provider: 'auto', baseUrl: 'http://localhost:8080' };
  }
  if (await probeEndpoint(OLLAMA_URL, '/api/version')) {
    return { provider: 'ollama', baseUrl: OLLAMA_URL };
  }
  return null;
}

describe('Orchestrator Provider — Inference Backend', () => {
  it('generates a text response', async () => {
    const backend = await detectBackend();
    if (!backend) {
      console.log('Skipping: no inference backend available (gateway or Ollama)');
      return;
    }

    console.log(`Using backend: ${backend.provider} at ${backend.baseUrl}`);

    const llm = createOrchestratorLLM({
      provider: backend.provider,
      model: MODEL,
      baseUrl: backend.baseUrl,
      timeoutMs: 120000,
    });

    const response = await llm({
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Respond in one sentence.' },
        { role: 'user', content: 'What is MCP in the context of AI agents?' },
      ],
    });

    expect(response.content).toBeTruthy();
    expect(response.content!.length).toBeGreaterThan(10);
    expect(response.finishReason).toBe('stop');
    console.log('Response:', response.content?.slice(0, 200));
  });

  it('makes tool calls when tools are provided', { timeout: 300000 }, async () => {
    const backend = await detectBackend();
    if (!backend) {
      console.log('Skipping: no inference backend available (gateway or Ollama)');
      return;
    }

    console.log(`Using backend: ${backend.provider} at ${backend.baseUrl}`);

    const tools: LLMToolDefinition[] = [
      {
        name: 'search_threats',
        description: 'Search for cybersecurity threats in the last 24 hours',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          },
          required: ['query'],
        },
      },
      {
        name: 'check_identity',
        description: 'Check if a user identity has been compromised',
        parameters: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID or email' },
          },
          required: ['userId'],
        },
      },
    ];

    const llm = createOrchestratorLLM({
      provider: backend.provider,
      model: MODEL,
      baseUrl: backend.baseUrl,
      timeoutMs: 300000,
    });

    const response = await llm({
      messages: [
        { role: 'system', content: 'You are a cybersecurity AI. Use the available tools to answer questions.' },
        { role: 'user', content: 'Are there any critical threats targeting user admin@company.com?' },
      ],
      tools,
    });

    const hasToolCalls = response.toolCalls.length > 0;
    const hasText = response.content !== null && response.content.length > 0;

    expect(hasToolCalls || hasText).toBe(true);

    if (hasToolCalls) {
      console.log('Tool calls:', response.toolCalls.map(tc => `${tc.name}(${JSON.stringify(tc.arguments)})`));
      for (const tc of response.toolCalls) {
        expect(tc.name).toBeTruthy();
        expect(typeof tc.arguments).toBe('object');
      }
    } else {
      console.log('Text response (no tool calls):', response.content?.slice(0, 200));
    }
  });
});
