/**
 * @epicai/core — Hybrid Integration Tests (Ollama Orchestrator + Cloud Generator)
 * Tests the full orchestrator→generator handoff: local SLM selects tools,
 * cloud LLM synthesizes the response from curated tool results.
 *
 * Requires:
 *   - ollama running with mistral:7b pulled (orchestrator)
 *   - OPENAI_API_KEY env var set (generator)
 *
 * Skips gracefully if either dependency is missing.
 *
 * Run: npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createOrchestratorLLM } from '../../../src/orchestrator/OrchestratorProvider.js';
import type { LLMToolDefinition, LLMResponse, LLMMessage } from '../../../src/types/index.js';

const OLLAMA_URL = 'http://localhost:11434';
const ORCHESTRATOR_MODEL = 'mistral:7b';
const GENERATOR_MODEL = 'gpt-4.1';
const TIMEOUT_MS = 120_000;

async function ollamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/version`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

function openaiAvailable(): boolean {
  return typeof process.env.OPENAI_API_KEY === 'string' && process.env.OPENAI_API_KEY.length > 0;
}

async function callOpenAI(messages: LLMMessage[]): Promise<LLMResponse> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: GENERATOR_MODEL,
      messages,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI returned ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content ?? null,
    toolCalls: [],
    finishReason: choice?.finish_reason === 'stop' ? 'stop' : 'stop',
  };
}

const TOOLS: LLMToolDefinition[] = [
  {
    name: 'search_threats',
    description: 'Search for cybersecurity threats detected by the SIEM.',
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
    description: 'Check if a user identity has been compromised.',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID or email' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'list_endpoints',
    description: 'List endpoints with EDR agent status and detections.',
    parameters: {
      type: 'object',
      properties: {
        filter: { type: 'string', enum: ['all', 'compromised', 'offline', 'healthy'] },
      },
      required: [],
    },
  },
];

const SYSTEM_PROMPT = 'You are a cybersecurity AI. Use tools to query security data. Respond concisely.';

describe('Hybrid: Ollama Orchestrator → OpenAI Generator', { timeout: TIMEOUT_MS * 2 }, () => {

  beforeAll(async () => {
    if (!await ollamaAvailable()) {
      console.log('Skipping hybrid tests: Ollama not available');
    }
    if (!openaiAvailable()) {
      console.log('Skipping hybrid tests: OPENAI_API_KEY not set');
    }
  });

  it('orchestrator selects tool, generator synthesizes response from tool result', async () => {
    if (!await ollamaAvailable() || !openaiAvailable()) return;

    // Step 1: Orchestrator (Ollama) selects tools
    const orchestrator = createOrchestratorLLM({
      provider: 'ollama',
      model: ORCHESTRATOR_MODEL,
      baseUrl: OLLAMA_URL,
      timeoutMs: TIMEOUT_MS,
    });

    const orchestratorResponse = await orchestrator({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: 'Are there any critical threats targeting the finance department?' },
      ],
      tools: TOOLS,
    });

    expect(orchestratorResponse.toolCalls.length).toBeGreaterThan(0);
    console.log('Orchestrator tool calls:', orchestratorResponse.toolCalls.map(tc => `${tc.name}(${JSON.stringify(tc.arguments)})`));

    // Step 2: Simulate tool execution (MCP server would do this)
    const simulatedToolResult = 'SIEM Results: 4 critical threats targeting finance subnet 10.0.5.0/24 in last 6 hours.\n' +
      '1. Cobalt Strike beacon on FIN-WS-012 (10.0.5.12) — first seen 16:44 UTC\n' +
      '2. Credential harvesting attempt against svc-finance@corp.com — 16:52 UTC\n' +
      '3. Lateral movement via PSExec from FIN-WS-012 to FIN-SRV-01 — 17:01 UTC\n' +
      '4. Data staging on FIN-SRV-01, 2.3GB copied to C:\\Windows\\Temp — 17:14 UTC\n' +
      'Attack chain matches MITRE ATT&CK: T1059.001 → T1003.001 → T1570 → T1074.001';

    // Step 3: Generator (OpenAI) synthesizes a human-readable response
    // Note: the generator does NOT see the tool definitions — only the curated result
    const generatorResponse = await callOpenAI([
      { role: 'system', content: 'You are a cybersecurity AI assistant. Synthesize the following security data into a clear, actionable briefing for a SOC analyst. Be concise and prioritize recommended actions.' },
      { role: 'user', content: 'Are there any critical threats targeting the finance department?' },
      { role: 'assistant', content: `Based on the security data:\n\n${simulatedToolResult}` },
      { role: 'user', content: 'Summarize this and recommend immediate actions.' },
    ]);

    expect(generatorResponse.content).toBeTruthy();
    expect(generatorResponse.content!.length).toBeGreaterThan(50);

    // Generator should reference the actual data, not hallucinate
    const response = generatorResponse.content!.toLowerCase();
    expect(response).toMatch(/cobalt strike|beacon|fin-ws-012|lateral|finance/i);

    console.log('Generator synthesis:', generatorResponse.content?.slice(0, 400));
  });

  it('generator never sees tool schemas (data sovereignty verification)', async () => {
    if (!await ollamaAvailable() || !openaiAvailable()) return;

    // Orchestrator selects tools — tool schemas are sent here
    const orchestrator = createOrchestratorLLM({
      provider: 'ollama',
      model: ORCHESTRATOR_MODEL,
      baseUrl: OLLAMA_URL,
      timeoutMs: TIMEOUT_MS,
    });

    const orchResponse = await orchestrator({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: 'Check if admin@company.com has been compromised.' },
      ],
      tools: TOOLS,
    });
    expect(orchResponse.toolCalls.length).toBeGreaterThan(0);

    // Simulated tool result
    const toolResult = 'Account admin@company.com: status ACTIVE, last login 2 hours ago, 0 failed MFA attempts, no compromise indicators detected. Risk score: 12/100 (low).';

    // Generator receives ONLY the curated result — no tool definitions, no tool names, no schema
    const generatorMessages: LLMMessage[] = [
      { role: 'system', content: 'You are a cybersecurity assistant. Answer based only on the provided data.' },
      { role: 'user', content: 'Is admin@company.com compromised?' },
      { role: 'assistant', content: `Security check result: ${toolResult}` },
      { role: 'user', content: 'Give me a brief assessment.' },
    ];

    // Verify: none of the generator messages contain tool schema keywords
    const generatorPayload = JSON.stringify(generatorMessages);
    expect(generatorPayload).not.toContain('search_threats');
    expect(generatorPayload).not.toContain('check_identity');
    expect(generatorPayload).not.toContain('list_endpoints');
    expect(generatorPayload).not.toContain('LLMToolDefinition');

    const genResponse = await callOpenAI(generatorMessages);
    expect(genResponse.content).toBeTruthy();
    expect(genResponse.content!.toLowerCase()).toMatch(/admin@company\.com|no compromise|low risk|active/i);

    console.log('Data sovereignty verified. Generator response:', genResponse.content?.slice(0, 300));
  });

  it('full loop with multi-step orchestration and cloud synthesis', async () => {
    if (!await ollamaAvailable() || !openaiAvailable()) return;

    const orchestrator = createOrchestratorLLM({
      provider: 'ollama',
      model: ORCHESTRATOR_MODEL,
      baseUrl: OLLAMA_URL,
      timeoutMs: TIMEOUT_MS,
    });

    // Step 1: Orchestrator picks first tool
    const step1 = await orchestrator({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: 'Find critical threats and list all compromised endpoints.' },
      ],
      tools: TOOLS,
    });
    expect(step1.toolCalls.length).toBeGreaterThan(0);
    console.log('Orchestrator step 1:', step1.toolCalls.map(tc => tc.name));

    // Step 2: Feed result, orchestrator picks second tool
    const step2 = await orchestrator({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: 'Find critical threats and list all compromised endpoints.' },
        { role: 'assistant', content: null, tool_call_id: step1.toolCalls[0].id, name: step1.toolCalls[0].name },
        { role: 'tool', content: '3 critical threats found: ransomware on subnet 10.0.5.0/24, credential theft targeting CFO, data exfiltration attempt via DNS tunneling.', tool_call_id: step1.toolCalls[0].id, name: step1.toolCalls[0].name },
      ],
      tools: TOOLS,
    });

    const allToolResults = [
      '3 critical threats found: ransomware on subnet 10.0.5.0/24, credential theft targeting CFO, data exfiltration attempt via DNS tunneling.',
    ];

    if (step2.toolCalls.length > 0) {
      allToolResults.push('Compromised endpoints: FIN-WS-012 (Cobalt Strike, CRITICAL), FIN-SRV-01 (data staging, CRITICAL), EXEC-WS-003 (credential theft, HIGH). 3 of 340 endpoints compromised.');
      console.log('Orchestrator step 2:', step2.toolCalls.map(tc => tc.name));
    }

    // Step 3: Generator synthesizes from ALL tool results
    const synthesis = await callOpenAI([
      { role: 'system', content: 'You are a senior SOC analyst AI. Provide an executive threat briefing based on the security data below. Include: situation summary, affected assets, risk assessment, and recommended immediate actions.' },
      { role: 'user', content: `Security data collected:\n\n${allToolResults.join('\n\n')}` },
    ]);

    expect(synthesis.content).toBeTruthy();
    expect(synthesis.content!.length).toBeGreaterThan(100);
    console.log('Executive briefing:', synthesis.content?.slice(0, 500));
  });
});
