# Epic AI® IVA Core
## Local SLM orchestrates. Cloud LLM responds. Your data never leaves.

> **Zero LLM Context MCP Orchestrator — 113 enterprise adapters, tiered autonomy governance, tamper-evident audit trails. Connect your AI to everything.**

[![npm version](https://img.shields.io/npm/v/@epicai/core.svg?style=flat)](https://www.npmjs.com/package/@epicai/core)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/protectnil/epic-ai-core/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

**Epic AI®** is an open-source TypeScript SDK for building Intelligent Virtual Assistants (IVAs) that federate across multiple Model Context Protocol (MCP) servers. A local small language model (SLM) handles all tool selection, routing, and governance — keeping tool schemas, server topology, and intermediate results off the cloud LLM entirely. The cloud LLM receives only curated context for response synthesis.

113 pre-built adapters span security, DevOps, cloud infrastructure, observability, productivity, AI/ML, and business operations — all under Apache 2.0.

Built by [protectNIL Inc.](https://protectnil.com) — Epic AI® is a registered trademark (U.S. Reg. No. 7,748,019).

---

## Why Epic AI®

**1. Tool schemas bloat LLM context — and degrade performance.**
Every MCP tool definition sent to a cloud LLM consumes tokens, increases latency, and leaks your internal tool surface to a third party. Epic AI® uses a local SLM as the orchestrator — tool schemas never reach the cloud. One query across 10 servers costs zero additional context tokens.

**2. Your data stays on your infrastructure — by architecture, not by policy.**
Every tool schema, every intermediate tool result, every routing decision stays on your local SLM. The cloud LLM receives only the curated, sanitized context needed to produce a response. Supports fully air-gapped deployments where no data transits external APIs.

**3. Local SLM means low latency.**
The orchestrator makes routing decisions in 50–200ms on commodity hardware. Total latency for a multi-tool orchestration loop is under 2 seconds locally, versus 5–15 seconds round-tripping to cloud APIs per tool call.

**4. Agents need governance, not just guardrails.**
Static system-prompt guardrails break under adversarial input. Epic AI® implements a tiered autonomy engine: actions are classified as `auto`, `escalate`, or `approve` at runtime against dynamic policies. High-risk operations require explicit human approval before execution — not after.

**5. Compliance requires provenance, not just logging.**
Append-only logs are not audit trails. Epic AI® writes every agent action to a SHA-256 hash-chained record that makes tampering detectable across any sequence of events, with export to JSON, CSV, and syslog formats.

---

## Quick Start

```bash
npm install @epicai/core
npx epic-ai setup
```

```typescript
import { EpicAI } from '@epicai/core';

const agent = await EpicAI.create({
  orchestrator: { provider: 'ollama', model: 'mistral:7b' },
  generator:    { provider: 'openai', model: 'gpt-4.1', apiKey: process.env.OPENAI_API_KEY },
  federation: {
    servers: [
      { name: 'vault',  transport: 'stdio',           command: 'mcp-vault' },
      { name: 'splunk', transport: 'streamable-http',  url: 'https://splunk.local/mcp' },
    ],
  },
  autonomy: {
    tiers: {
      auto:     ['read', 'query', 'search'],
      escalate: ['contain', 'isolate'],
      approve:  ['delete', 'revoke', 'terminate'],
    },
  },
  persona: {
    name:         'sentinel',
    tone:         'commanding',
    domain:       'cybersecurity',
    systemPrompt: 'You are a sovereign cybersecurity intelligence officer.',
  },
  audit: { store: 'memory', integrity: 'sha256-chain' },
});

await agent.start();
const result = await agent.run('What threats were detected in the last 24 hours?');
console.log(result.response);
await agent.stop();
```

---

## Architecture

```
                        ┌─────────────────────────────────────────────────────┐
                        │                    EpicAI Agent                     │
                        │                  (EpicAI.create())                  │
                        └──────────────────────┬──────────────────────────────┘
                                               │
              ┌────────────────────────────────┼────────────────────────────────┐
              │                                │                                │
              ▼                                ▼                                ▼
   ┌──────────────────┐            ┌───────────────────┐            ┌───────────────────┐
   │  Orchestrator    │            │   Autonomy Layer   │            │   Audit Trail     │
   │  (Local SLM)     │◄──────────►│   TieredAutonomy  │            │  SHA-256 chain    │
   │  Mistral 7B /    │  evaluates │   PolicyEngine     │            │  append-only log  │
   │  vLLM / custom   │  actions   │   ApprovalQueue    │            │  tamper-evident   │
   └────────┬─────────┘            └───────────────────┘            └───────────────────┘
            │ selects tools
            │ (schemas stay local)
            ▼
   ┌──────────────────────────────────────────────────────┐
   │               Federation Layer                       │
   │   FederationManager → ConnectionPool → ToolRegistry  │
   │   Correlator (cross-source entity resolution)        │
   └────────┬────────┬────────┬────────┬──────────────────┘
            │        │        │        │
       ┌────┘   ┌────┘   ┌────┘   ┌────┘
       ▼        ▼        ▼        ▼
   [MCP-1]  [MCP-2]  [MCP-3]  [MCP-N]
   Splunk  CrowdStrike  Vault   GitHub ...
            │
            │ results returned
            ▼
   ┌──────────────────┐     ┌─────────────────────┐
   │  Retrieval Layer │     │   Memory Layer       │
   │  HybridRetriever │     │   PersistentMemory   │
   │  dense + sparse  │     │   importance-weighted│
   │  + BM25 + RRF    │     │   Redis + MongoDB    │
   └────────┬─────────┘     └──────────┬───────────┘
            │                          │
            └──────────┬───────────────┘
                       ▼
            ┌──────────────────┐
            │  Persona Layer   │
            │  PersonaManager  │
            │  SystemPrompt    │
            │  Builder         │
            └────────┬─────────┘
                     │ composed context
                     ▼
            ┌──────────────────┐
            │   Generator      │
            │  (Cloud LLM)     │
            │  GPT-4.1 /       │
            │  Claude / custom │
            └──────────────────┘
```

The orchestrator (local SLM) never sends tool schemas to the generator (cloud LLM). Tool definitions, MCP server topology, and intermediate tool results are handled entirely on-premise. The cloud LLM receives only the curated context needed to produce a response.

---

## Five Layers

### Layer 1 — Federation

Connect any number of MCP servers behind a single interface. The `FederationManager` manages connection lifecycles, health checks, and retry policies across all registered servers. The `ToolRegistry` provides unified tool discovery. The `Correlator` resolves the same entity (an IP address, a user, a hostname) across data from multiple servers.

```typescript
import { FederationManager } from '@epicai/core';

const federation = new FederationManager({
  servers: [
    { name: 'crowdstrike', transport: 'streamable-http', url: 'https://cs.local/mcp',
      auth: { type: 'bearer', token: process.env.CS_TOKEN } },
    { name: 'splunk', transport: 'streamable-http', url: 'https://splunk.local/mcp' },
    { name: 'vault',  transport: 'stdio', command: 'mcp-vault' },
  ],
  retryPolicy: { maxRetries: 3, backoffMs: 500, maxBackoffMs: 10_000 },
  healthCheckIntervalMs: 30_000,
});

await federation.connectAll();
const tools = federation.listTools();      // unified tool list across all servers
const health = await federation.health();  // per-server connection status
```

**Transports:** `stdio` (local subprocess) and `streamable-http` (remote MCP server over HTTPS).

**Auth schemes:** `bearer`, `basic`, `api-key`.

---

### Layer 2 — Autonomy

Every tool call the orchestrator requests passes through the `TieredAutonomy` engine before execution. Actions are matched against three tiers:

| Tier       | Behavior                                           |
|------------|----------------------------------------------------|
| `auto`     | Executed immediately without human review          |
| `escalate` | Executed, but enqueued for post-hoc human review   |
| `approve`  | Blocked until an authorized human explicitly approves |

Dynamic `PolicyEngine` rules can override tier assignments at runtime based on payload content, time-of-day, source server, or any custom condition. The `ApprovalQueue` supports in-memory or Redis persistence with configurable TTL and expiry behavior.

```typescript
import { TieredAutonomy } from '@epicai/core';

const autonomy = new TieredAutonomy(
  {
    auto:     ['search', 'query', 'read', 'list'],
    escalate: ['contain', 'isolate', 'block'],
    approve:  ['delete', 'revoke', 'terminate', 'disable'],
  },
  { persistence: 'redis', redis: { host: 'localhost', port: 6379 }, ttlMs: 3_600_000 },
);

autonomy.addPolicy({
  name:      'no-prod-deletes-after-hours',
  condition: (ctx) => ctx.tool === 'delete' && ctx.server === 'prod',
  override:  'approve',
  priority:  10,
});

const decision = await autonomy.evaluate({
  tool: 'delete', server: 'prod', args: {},
  persona: 'sentinel', timestamp: new Date(), priorActions: [],
});
// decision.tier === 'approve' — blocked, pending human approval
```

Approve or deny pending actions:

```typescript
await agent.approve('action-uuid-here', { approver: 'ops@example.com' });
await agent.deny('action-uuid-here',    { approver: 'ops@example.com', reason: 'Out of change window' });
```

---

### Layer 3 — Retrieval

The `HybridRetriever` runs three parallel search paths against a vector store and fuses results using Reciprocal Rank Fusion (RRF):

- **Dense** — semantic embedding similarity (e.g., OpenAI `text-embedding-3-small`, local models)
- **Sparse** — miniCOIL learned sparse representations for keyword-sensitive recall
- **BM25** — classical term-frequency scoring for exact-match retrieval

RRF fusion balances all three signals without requiring manual weight tuning.

Persistent memory stores recalled context with importance scores, enabling agents to surface high-signal memories while suppressing stale noise.

```typescript
import { HybridRetriever } from '@epicai/core';
import { QdrantAdapter } from '@epicai/core/retrieval/adapters/qdrant';

const retriever = new HybridRetriever({
  dense:  { provider: 'qdrant', collection: 'dense-collection',  adapter: new QdrantAdapter(client, 'dense-collection') },
  sparse: { provider: 'qdrant', collection: 'sparse-collection', adapter: new QdrantAdapter(client, 'sparse-collection') },
  bm25:   { provider: 'qdrant', collection: 'bm25-collection',   adapter: new QdrantAdapter(client, 'bm25-collection') },
  maxResults: 10,
  minScore: 0.0,
  fusion: 'rrf',
});

const results = await retriever.search('lateral movement indicators past 48h');
```

**Vector store adapters:** `InMemoryAdapter` (built-in, zero dependencies), `QdrantAdapter` (optional peer dependency).

---

### Layer 4 — Persona

The `PersonaManager` and `SystemPromptBuilder` compose the final system prompt delivered to the generator LLM. Persona configuration controls name, tone, domain focus, vocabulary substitutions, and output constraints — enabling purpose-built agents without modifying orchestration logic.

```typescript
import { PersonaManager, SystemPromptBuilder } from '@epicai/core';

const persona = new PersonaManager();
persona.register({
  name:         'sentinel',
  tone:         'commanding',
  domain:       'cybersecurity',
  systemPrompt: 'You are a sovereign threat intelligence officer.',
  vocabulary:   { 'host': 'endpoint', 'user': 'principal' },
  constraints:  ['Never speculate beyond available evidence.', 'Cite all source servers.'],
});

const prompt = SystemPromptBuilder.build(persona.active(), conversationContext);
```

Multiple personas can be defined and switched at runtime via the agent configuration, enabling multi-role deployments from a single SDK instance.

---

### Layer 5 — Audit

Every action taken by the agent — tool invocations, autonomy decisions, approval events — is written to the `AuditTrail`. Each record is assigned a monotonically increasing sequence number and a SHA-256 hash that chains to the previous record, making retroactive tampering detectable.

```typescript
import { AuditTrail } from '@epicai/core';

const audit = new AuditTrail({ store: 'append-only-log', path: '/var/log/epic-ai/audit.jsonl', integrity: 'sha256-chain' });

// Query
const records = await audit.query({ tool: 'delete', since: new Date('2026-01-01') });

// Verify chain integrity — returns false if any record was modified or deleted
const intact = await audit.verify();

// Export
const csv  = await audit.export('csv');
const json = await audit.export('json');
await audit.export('syslog');  // emits to syslog
```

**Audit store adapters:** `memory` (built-in), `append-only-log` (JSONL file, built-in), `custom` (bring your own `AuditStoreAdapter` implementation).

---

## 113 Enterprise Adapters

Epic AI® ships 113 pre-built MCP server adapters across security, DevOps, cloud infrastructure, observability, productivity, AI/ML, and business operations. Each adapter implements the `MCPAdapter` interface and handles authentication, request formatting, and response normalization for its respective platform.

All 113 adapters are included in the SDK under Apache 2.0.

### Security Operations

| Category              | Adapters                                                                                     |
|-----------------------|----------------------------------------------------------------------------------------------|
| **EDR / XDR**         | CrowdStrike Falcon, CrowdStrike Identity, Carbon Black, SentinelOne, Cybereason, Sophos, Trend Micro |
| **SIEM / Analytics**  | Splunk, IBM QRadar, Microsoft Sentinel, Sumo Logic, LogRhythm, Datadog Security, Coralogix, Elasticsearch |
| **Threat Intelligence** | Recorded Future, ThreatConnect, Anomali, Mandiant                                         |
| **Network Security**  | Palo Alto Networks, Fortinet, Check Point, Cisco Secure, Zscaler, Barracuda, Darktrace, Cloudflare |
| **Vulnerability Mgmt**| Tenable, Qualys, Rapid7, Orca, Lacework, Wiz, Prisma Cloud                                  |
| **Identity & Access** | CyberArk, BeyondTrust, Delinea, Ping Identity                                               |
| **GRC / Compliance**  | ServiceNow GRC, OneTrust, Drata                                                              |
| **Email Security**    | Proofpoint, Mimecast                                                                         |
| **Incident Management** | PagerDuty, Incident.io, Sentry                                                            |

### DevOps & Infrastructure

| Category              | Adapters                                                                                     |
|-----------------------|----------------------------------------------------------------------------------------------|
| **CI/CD**             | GitHub, GitLab, Bitbucket, CircleCI, ArgoCD                                                  |
| **Containers & Orchestration** | Kubernetes, Docker Hub, Terraform Registry                                          |
| **Cloud Platforms**   | AWS, Azure, Google Cloud, Vercel, Cloudflare                                                 |
| **Databases**         | MongoDB, PostgreSQL, Redis, Snowflake, BigQuery, Neon, Supabase, Elasticsearch               |

### Observability

| Category              | Adapters                                                                                     |
|-----------------------|----------------------------------------------------------------------------------------------|
| **Monitoring & APM**  | Datadog Observability, Grafana, New Relic, Dynatrace, Prometheus, Coralogix                  |

### Productivity & Collaboration

| Category              | Adapters                                                                                     |
|-----------------------|----------------------------------------------------------------------------------------------|
| **Communication**     | Slack, Microsoft Teams, Discord, Zoom, Twilio                                                |
| **Project Management**| Jira, Linear, Asana, Notion, Confluence                                                      |
| **Email & Calendar**  | Gmail, Google Calendar, SendGrid, Microsoft Graph                                            |
| **Workspace**         | Google Drive, Google Workspace, Figma, Retool                                                |

### AI / ML Platforms

| Category              | Adapters                                                                                     |
|-----------------------|----------------------------------------------------------------------------------------------|
| **Model Providers**   | OpenAI API, Anthropic API, Ollama API, Hugging Face                                          |
| **Frameworks**        | LangChain API, LlamaIndex API, Weights & Biases                                             |

### Business Operations

| Category              | Adapters                                                                                     |
|-----------------------|----------------------------------------------------------------------------------------------|
| **CRM & Marketing**   | Salesforce, HubSpot, LinkedIn                                                                |
| **Payments & Finance**| Stripe, PayPal, Plaid, QuickBooks, Xero, Shopify                                            |
| **Support**           | Zendesk, ServiceNow ITSM                                                                    |
| **Content & Social**  | Twitter, Reddit, YouTube, Twitch, Dev.to, Substack, Stack Overflow                          |

### Example: Splunk Adapter

```typescript
import { SplunkMCPServer } from '@epicai/core/mcp-servers/splunk';

const splunk = new SplunkMCPServer({
  host:     'splunk.corp.example.com',
  username: process.env.SPLUNK_USER!,
  password: process.env.SPLUNK_PASS!,
});

// Use directly or connect via FederationManager
await federation.connect('splunk', { name: 'splunk', transport: 'streamable-http', url: 'https://splunk.corp.example.com:8089' });
```

All 113 adapters share a consistent interface — swap platforms without changing orchestration logic. Managed adapter maintenance — keeping adapters current as vendor APIs and MCP specifications evolve — is available from [protectNIL Inc.](https://protectnil.com)

---

## Enterprise Features

### Observability

Event callbacks for every agent lifecycle event. Token and cost tracking per invocation. OpenTelemetry integration via `createOTelEventCallback` and `createOTelLogCallback`.

```typescript
import { ObservabilityEmitter, TokenTracker, createOTelEventCallback } from '@epicai/core';

const emitter = new ObservabilityEmitter();
emitter.onEvent(createOTelEventCallback(tracer));
emitter.onEvent((event) => metrics.record(event.type, event.data));

const tracker = new TokenTracker();
tracker.record({ model: 'gpt-4.1', promptTokens: 1200, completionTokens: 340, costUsd: 0.0048 });
const summary = tracker.summary(); // total tokens, total cost, per-model breakdown
```

For a compact human-readable snapshot of one run, attach a `RunTelemetryCollector` to the same event/log stream:

```typescript
import { RunTelemetryCollector } from '@epicai/core';

const telemetry = new RunTelemetryCollector();
const detach = telemetry.attach(emitter);

// ... run the agent ...

console.log(telemetry.format());
detach();
```

### Resilience

- **Rate limiting** — token bucket per server with configurable burst capacity (`RateLimiter`)
- **Error classification** — distinguish transient from fatal errors for retry logic (`ErrorClassifier`)
- **Graceful shutdown** — ordered teardown with per-task timeout enforcement (`GracefulShutdown`)
- **Crash recovery** — checkpoint/restore for long-running orchestrator loops (`FileCheckpointStore`)
- **Prompt cache** — SHA-256 keyed in-memory cache for repeated prompt fragments (`PromptCache`)

```typescript
import { RateLimiter, GracefulShutdown, FileCheckpointStore } from '@epicai/core';

const limiter  = new RateLimiter({ requestsPerSecond: 10, burst: 20 });
const shutdown = new GracefulShutdown({ timeoutMs: 15_000 });
const checkpoint = new FileCheckpointStore('/var/lib/epic-ai/checkpoints');

shutdown.register('save-checkpoint', async () => {
  await checkpoint.save('orchestrator', { step: currentStep, context });
});
```

### Streaming

The agent `stream()` method yields `StreamEvent` objects as the orchestrator loop progresses — plan selection, tool invocations, autonomy decisions, narrative generation, and completion — enabling real-time UI updates over SSE.

```typescript
for await (const event of agent.stream('Identify all endpoints with active C2 beaconing')) {
  if (event.type === 'action')     console.log('Tool:', event.data.tool);
  if (event.type === 'narrative')  process.stdout.write(event.data.text);
  if (event.type === 'done')       console.log(`Completed in ${event.data.durationMs}ms`);
}
```

---

## Configuration Reference

### `EpicAIConfig`

| Field          | Type                   | Required | Description                                              |
|----------------|------------------------|----------|----------------------------------------------------------|
| `orchestrator` | `OrchestratorConfig`   | Yes      | Local SLM for tool selection and orchestration           |
| `generator`    | `GeneratorConfig`      | No       | Cloud LLM for final response generation                  |
| `federation`   | `FederationConfig`     | Yes      | MCP server connections and retry policy                  |
| `autonomy`     | `AutonomyConfig`       | Yes      | Tiered action governance rules and approval queue        |
| `retrieval`    | `RetrievalConfig`      | No       | Hybrid retriever and vector store configuration          |
| `persona`      | `PersonaConfig`        | Yes      | Agent identity, tone, domain, and system prompt          |
| `audit`        | `AuditConfig`          | Yes      | Audit store, integrity mode, retention, and export       |
| `transport`    | `'sse' \| 'json'`      | No       | Streaming transport for `stream()` output                |

### `OrchestratorConfig`

| Field           | Type                                                | Description                              |
|-----------------|-----------------------------------------------------|------------------------------------------|
| `provider`      | `'ollama' \| 'vllm' \| 'apple-foundation' \| 'custom'` | Orchestrator runtime                 |
| `model`         | `string`                                            | Model name (e.g., `'mistral:7b'`)        |
| `baseUrl`       | `string`                                            | Base URL for Ollama or vLLM endpoints    |
| `maxIterations` | `number`                                            | Max orchestrator loop iterations         |
| `llm`           | `LLMFunction`                                       | Bring-your-own LLM function (custom)     |

### `GeneratorConfig`

| Field      | Type                                        | Description                                       |
|------------|---------------------------------------------|---------------------------------------------------|
| `provider` | `'openai' \| 'anthropic' \| 'ollama' \| 'custom'` | Generator LLM provider                      |
| `model`    | `string`                                    | Model name (e.g., `'gpt-4.1'`, `'claude-opus-4'`)|
| `apiKey`   | `string`                                    | API key for the provider                          |
| `maxTokens`| `number`                                    | Maximum tokens for generation                     |
| `llm`      | `LLMFunction`                               | Bring-your-own LLM function (custom)              |

### `AutonomyConfig`

| Field          | Type                    | Description                                           |
|----------------|-------------------------|-------------------------------------------------------|
| `tiers`        | `AutonomyRules`         | Action keyword lists for `auto`, `escalate`, `approve`|
| `policies`     | `AutonomyPolicy[]`      | Dynamic policy rules (optional)                       |
| `approvalQueue`| `ApprovalQueueConfig`   | Approval persistence: `memory` or `redis`             |

### `AuditConfig`

| Field       | Type                                  | Description                                     |
|-------------|---------------------------------------|-------------------------------------------------|
| `store`     | `'memory' \| 'append-only-log' \| 'custom'` | Audit storage backend                   |
| `path`      | `string`                              | File path for `append-only-log` store           |
| `integrity` | `'sha256-chain' \| 'none'`            | Hash chaining mode                              |
| `export`    | `Array<'json' \| 'csv' \| 'syslog'>` | Enabled export formats                          |
| `retention` | `{ maxAgeDays?, maxSizeBytes? }`      | Log retention policy                            |

---

## API Reference

All public types are exported from `@epicai/core` and are fully documented with JSDoc. The package ships declaration files (`.d.ts`) alongside all compiled modules. See the [Developer Guide](DEVELOPER_GUIDE.md) for comprehensive documentation of every layer, configuration option, and adapter interface.

### Primary Exports

| Export                | Description                                              |
|-----------------------|----------------------------------------------------------|
| `EpicAI`              | Static factory — `EpicAI.create(config)` → `EpicAIAgent` |
| `FederationManager`   | Multi-server MCP connection management                   |
| `TieredAutonomy`      | Action governance with tier evaluation and approval queue|
| `HybridRetriever`     | Dense + sparse + BM25 retrieval with RRF fusion          |
| `PersonaManager`      | Agent identity and system prompt composition             |
| `AuditTrail`          | SHA-256 hash-chained append-only audit logging           |
| `ObservabilityEmitter`| Event callbacks and OpenTelemetry integration            |
| `TokenTracker`        | Token and cost tracking across models                    |
| `RateLimiter`         | Token bucket rate limiting per server                    |
| `GracefulShutdown`    | Ordered agent teardown with timeout enforcement          |

---

## Contributing

Contributions are welcome. Please read the [contributing guidelines](CONTRIBUTING.md) before opening a pull request.

**Requirements:**
- Node.js >= 20.0.0
- TypeScript 5.3+

**Setup:**

```bash
git clone https://github.com/protectnil/epic-ai-core.git
cd epic-ai-core
npm install
npm run build
npm test
```

**Before submitting a PR:**

1. All existing tests must pass: `npm test`
2. TypeScript must compile with zero errors: `npm run lint`
3. New public APIs must include JSDoc documentation and TypeScript types
4. New MCP server adapters must implement `MCPAdapter` and include tests

**Reporting security vulnerabilities:** Do not open public issues for security vulnerabilities. Email [security@epic-ai.io](mailto:security@epic-ai.io).

---

## License

Copyright 2026 protectNIL Inc.

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full license text.

You may not use this software except in compliance with the License. A copy of the License is also available at [https://www.apache.org/licenses/LICENSE-2.0](https://www.apache.org/licenses/LICENSE-2.0).

---

## Trademark Notice

**Epic AI®** is a registered trademark of protectNIL Inc., U.S. Trademark Registration No. 7,748,019. Use of the Epic AI® name and mark in connection with software, services, or documentation is subject to the [trademark policies](TRADEMARK.md) of protectNIL Inc.

The `@epicai/core` npm package and this repository are official specimens of use of the Epic AI® mark in commerce in connection with downloadable computer software featuring an Intelligent Virtual Assistant (IVA) utilizing natural language processing (NLP), natural language understanding (NLU), machine learning, generative and conversational AI to access and process third-party sources of information across security operations, DevOps, cloud infrastructure, observability, productivity, AI/ML platforms, and business operations.

All other trademarks, service marks, and product names referenced in this document are the property of their respective owners. CrowdStrike, Splunk, Palo Alto Networks, Microsoft, IBM, AWS, Google Cloud, Kubernetes, GitHub, Salesforce, and all other third-party names are used solely to identify compatible integrations and are not affiliated with or endorsed by protectNIL Inc.

---

*Epic AI® — Intelligent Virtual Assistant (IVA) Platform | Zero LLM Context MCP Orchestrator | 113 Enterprise Adapters | Built by [protectNIL Inc.](https://protectnil.com)*
