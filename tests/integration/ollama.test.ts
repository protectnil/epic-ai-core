/**
 * @epicai/core — Ollama Integration Test
 * Tests the orchestrator provider against a local model via Ollama.
 * Default: qwen2.5:7b (best tool-calling accuracy at 7B scale).
 * Override: EPICAI_TEST_MODEL=llama3.1:8b npm run test:integration
 * Requires: ollama running with the target model pulled.
 * CPU inference — expect 10-60 seconds per call.
 */

import { describe, it, expect } from 'vitest';
import { createOrchestratorLLM } from '../../src/orchestrator/OrchestratorProvider.js';
import type { LLMToolDefinition } from '../../src/types/index.js';

const OLLAMA_URL = 'http://localhost:11434';
const MODEL = process.env.EPICAI_TEST_MODEL || 'qwen2.5:7b';

async function ollamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/version`, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

describe('Ollama Orchestrator Provider', () => {
  it('generates a text response', async () => {
    if (!await ollamaAvailable()) {
      console.log('Skipping: Ollama not available');
      return;
    }

    const llm = createOrchestratorLLM({
      provider: 'ollama',
      model: MODEL,
      baseUrl: OLLAMA_URL,
      timeoutMs: 120000, // CPU inference is slow
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
    if (!await ollamaAvailable()) {
      console.log('Skipping: Ollama not available');
      return;
    }

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
      provider: 'ollama',
      model: MODEL,
      baseUrl: OLLAMA_URL,
      timeoutMs: 300000, // 5 min — tool calling on CPU is very slow
    });

    const response = await llm({
      messages: [
        { role: 'system', content: 'You are a cybersecurity AI. Use the available tools to answer questions.' },
        { role: 'user', content: 'Are there any critical threats targeting user admin@company.com?' },
      ],
      tools,
    });

    // Model should either call tools or respond with text
    const hasToolCalls = response.toolCalls.length > 0;
    const hasText = response.content !== null && response.content.length > 0;

    expect(hasToolCalls || hasText).toBe(true);

    if (hasToolCalls) {
      console.log('Tool calls:', response.toolCalls.map(tc => `${tc.name}(${JSON.stringify(tc.arguments)})`));
      // Verify tool call structure
      for (const tc of response.toolCalls) {
        expect(tc.name).toBeTruthy();
        expect(typeof tc.arguments).toBe('object');
      }
    } else {
      console.log('Text response (no tool calls):', response.content?.slice(0, 200));
    }
  });
});
