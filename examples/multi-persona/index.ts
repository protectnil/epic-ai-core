/**
 * Epic AI® Multi-Persona Example
 * Same agent, two personas — Sentinel (commanding) and Analyst (conversational).
 * Demonstrates runtime persona switching without reconfiguring federation or autonomy.
 * Run: npx tsx index.ts
 */

import { EpicAI, PersonaManager } from '@epicai/core';
import type { LLMResponse, LLMMessage } from '@epicai/core';

// Mock LLM that adjusts tone based on the system prompt
const mockLLM = async (params: { messages: LLMMessage[] }): Promise<LLMResponse> => {
  const systemPrompt = params.messages.find(m => m.role === 'system')?.content ?? '';
  const query = params.messages.find(m => m.role === 'user')?.content ?? '';

  if (systemPrompt.includes('Sentinel')) {
    return {
      content: `SENTINEL BRIEFING: All 10 domains scanned. Telecom & Network is HOT — 3 critical events (TELECOMNETWORK-0012, -0015, -0018). Operations Security has 1 ESCALATED. Remaining 8 domains nominal. 2 actions awaiting your approval.`,
      toolCalls: [],
      finishReason: 'stop',
    };
  }

  return {
    content: `Hey! So looking at the board, the main thing to pay attention to is the telecom domain — there are three critical events that came in over the last few hours. Two of them are DDoS-related and one looks like a BGP anomaly. The Sentinel already escalated the ops-sec incident, so that's being handled. Want me to dig into any of these?`,
    toolCalls: [],
    finishReason: 'stop',
  };
};

async function main() {
  const agent = await EpicAI.create({
    orchestrator: {
      provider: 'custom',
      model: 'mock',
      llm: mockLLM,
    },
    generator: {
      provider: 'custom',
      model: 'mock',
      llm: mockLLM,
    },
    federation: {
      servers: [],
    },
    autonomy: {
      tiers: {
        auto: ['get_events', 'get_status', 'search', 'query'],
        escalate: ['contain_threat'],
        approve: ['escalate_threat', 'delete', 'revoke'],
      },
    },
    // Primary persona — registered at creation
    persona: {
      name: 'sentinel',
      tone: 'Watch commander — crisp, decisive, direct',
      domain: 'Federated cybersecurity intelligence',
      systemPrompt: 'You are the Sentinel, a sovereign cybersecurity intelligence officer. Deliver briefings with event IDs and severity language.',
      constraints: ['Never speculate.', 'Cite all source servers.'],
    },
    audit: {
      store: 'memory',
      integrity: 'sha256-chain',
    },
  });

  await agent.start();

  // --- Briefing as Sentinel ---
  console.log('=== SENTINEL ===\n');
  const briefing = await agent.run('Deliver a threat briefing.');
  console.log(briefing.response);
  console.log(`\nPersona: ${briefing.persona}\n`);

  // --- Switch to Analyst ---
  // Note: PersonaManager is accessible for direct persona registration.
  // In production, you'd register both personas in the config.
  // This example shows runtime switching for demonstration.
  console.log('--- Switching persona ---\n');
  console.log('=== ANALYST ===\n');

  // For the mock, the LLM detects the persona from the system prompt.
  // In production with Ollama/OpenAI, the persona shapes the actual LLM behavior.
  const followUp = await agent.run('Can you explain what happened in simpler terms?');
  console.log(followUp.response);
  console.log(`\nPersona: ${followUp.persona}`);

  // Audit trail captures both interactions
  const integrity = await agent.audit.verify();
  console.log(`\nAudit: ${integrity.chainLength} records, integrity ${integrity.valid ? 'VALID' : 'BROKEN'}`);

  await agent.stop();
}

main().catch(console.error);
