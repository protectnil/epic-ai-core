/**
 * Epic AI® Cybersecurity Briefing Example
 * Streams a threat briefing with Ollama orchestration and tiered autonomy.
 * Requires: ollama serve + ollama pull qwen2.5:7b
 * Run: npx tsx index.ts
 */

import { EpicAI } from '@epicai/core';

async function main() {
  const agent = await EpicAI.create({
    // Local SLM orchestrator — tool schemas never leave your machine
    orchestrator: {
      provider: 'ollama',
      model: 'qwen2.5:7b',
      baseUrl: 'http://localhost:11434',
      maxIterations: 10,
    },
    // Generator omitted — Ollama handles both routing and synthesis
    federation: {
      servers: [],  // Replace with your MCP servers:
      // { name: 'splunk', transport: 'streamable-http', url: 'https://splunk.local/mcp' },
      // { name: 'vault', transport: 'stdio', command: 'mcp-vault' },
      retryPolicy: { maxRetries: 3, backoffMs: 500, maxBackoffMs: 5000 },
    },
    autonomy: {
      tiers: {
        auto: ['get_events', 'get_status', 'search', 'query', 'read', 'list'],
        escalate: ['contain_threat', 'isolate', 'block'],
        approve: ['escalate_threat', 'delete', 'revoke', 'terminate'],
      },
      approvalQueue: {
        persistence: 'memory',
        ttlMs: 30 * 60 * 1000,  // 30 minutes
        onExpire: 'deny',
      },
    },
    persona: {
      name: 'sentinel',
      tone: 'Watch commander — crisp, decisive, direct',
      domain: 'Federated cybersecurity intelligence across 10 (ISC)² security domains',
      systemPrompt: `You are Sentinel — the Epic AI® Federated Intelligence Orchestrator.
You deliver threat briefings describing the current state of a 10-domain security board.
Walk through each domain by severity. Reference event IDs. Be direct.`,
      constraints: [
        'Never speculate beyond available evidence.',
        'Cite source servers and event IDs.',
        'Flag any event requiring human approval.',
      ],
    },
    audit: {
      store: 'memory',
      integrity: 'sha256-chain',
    },
    transport: 'sse',
  });

  await agent.start();
  console.log('Sentinel agent started. Streaming briefing...\n');

  // Stream the briefing — events arrive in real time
  for await (const event of agent.stream('Deliver a full threat briefing across all 10 security domains.')) {
    switch (event.type) {
      case 'plan':
        console.log(`[PLAN] Iteration ${event.data.iteration}, tools: ${event.data.toolCalls.join(', ')}`);
        break;
      case 'action':
        console.log(`[ACTION] ${event.data.tool} on ${event.data.server} (${event.data.durationMs}ms)`);
        break;
      case 'approval-needed':
        console.log(`[APPROVAL NEEDED] ${event.data.tool} on ${event.data.server} — action ID: ${event.data.actionId}`);
        break;
      case 'narrative':
        process.stdout.write(event.data.text);
        break;
      case 'done':
        console.log(`\n\n[DONE] ${event.data.loopIterations} iterations, ${event.data.actionsExecuted} actions, ${event.data.actionsPending} pending`);
        break;
      case 'error':
        console.error(`[ERROR] ${event.data.message}`);
        break;
    }
  }

  // Show pending approvals
  const pending = await agent.autonomy.pending();
  if (pending.length > 0) {
    console.log(`\n${pending.length} actions awaiting approval:`);
    for (const p of pending) {
      console.log(`  ${p.id} — ${p.action.tool} on ${p.action.server} (${p.tier})`);
    }
  }

  // Verify audit trail
  const integrity = await agent.audit.verify();
  console.log(`\nAudit trail: ${integrity.chainLength} records, integrity ${integrity.valid ? 'VALID' : 'BROKEN'}`);

  await agent.stop();
}

main().catch(console.error);
