/**
 * Epic AI® Basic Agent Example
 * Minimal setup — mock LLM, no external dependencies.
 * Run: npx tsx index.ts
 */

import { EpicAI } from '@epicai/core';
import type { LLMResponse } from '@epicai/core';

// A mock LLM that returns a fixed response (no Ollama or cloud API needed)
const mockLLM = async (): Promise<LLMResponse> => ({
  content: 'All 10 security domains are nominal. No critical threats detected. 3 events auto-contained, 1 monitoring.',
  toolCalls: [],
  finishReason: 'stop',
});

async function main() {
  // Create the agent
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
      servers: [],  // No MCP servers — standalone agent
    },
    autonomy: {
      tiers: {
        auto: ['get_events', 'get_status', 'search', 'query'],
        escalate: ['contain_threat'],
        approve: ['escalate_threat', 'delete', 'revoke'],
      },
    },
    persona: {
      name: 'praetor',
      tone: 'Watch commander — crisp, decisive, direct',
      domain: 'Federated cybersecurity intelligence across 10 enterprise domains',
      systemPrompt: 'You are the Praetor, a sovereign cybersecurity intelligence officer. Report threats concisely.',
    },
    audit: {
      store: 'memory',
      integrity: 'sha256-chain',
    },
  });

  // Start the agent
  await agent.start();
  console.log('Agent started.\n');

  // Run a query
  const result = await agent.run('What is the current threat posture across all domains?');
  console.log('Response:', result.response);
  console.log(`Actions executed: ${result.actionsExecuted}, pending: ${result.actionsPending}\n`);

  // Verify audit trail integrity
  const integrity = await agent.audit.verify();
  console.log('Audit trail integrity:', integrity.valid ? 'VALID' : 'BROKEN');
  console.log(`Chain length: ${integrity.chainLength}\n`);

  // Export audit trail
  const auditJSON = await agent.audit.export('json');
  console.log('Audit trail:', auditJSON);

  // Stop the agent
  await agent.stop();
  console.log('\nAgent stopped.');
}

main().catch(console.error);
