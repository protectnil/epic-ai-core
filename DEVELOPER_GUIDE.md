# Epic AI® Core — Developer Guide

**SDK:** `@epic-ai/core`
**Version:** 0.1.0
**License:** Apache 2.0
**Runtime:** Node.js >= 20.0.0, TypeScript 5.3+

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Configuration Reference](#configuration-reference)
5. [Federation Layer](#federation-layer)
6. [Autonomy Layer](#autonomy-layer)
7. [Persona Layer](#persona-layer)
8. [Retrieval Layer](#retrieval-layer)
9. [Memory Layer](#memory-layer)
10. [Audit Layer](#audit-layer)
11. [Orchestrator](#orchestrator)
12. [Streaming](#streaming)
13. [Resilience](#resilience)
14. [Observability](#observability)
15. [MCP Server Adapters](#mcp-server-adapters)
16. [Writing Custom Adapters](#writing-custom-adapters)
17. [Testing](#testing)
18. [CLI Setup Tool](#cli-setup-tool)

---

## Installation

```bash
npm install @epic-ai/core
```

Optional peer dependencies for production:

```bash
npm install @qdrant/js-client-rest   # Vector store
npm install redis                     # Approval queue + memory cache
npm install mongodb                   # Audit + memory persistence
```

## Quick Start

```typescript
import { EpicAI } from '@epic-ai/core';

const agent = await EpicAI.create({
  orchestrator: { provider: 'ollama', model: 'mistral:7b' },
  generator: { provider: 'openai', model: 'gpt-4.1', apiKey: process.env.OPENAI_API_KEY },
  federation: {
    servers: [
      { name: 'vault', transport: 'stdio', command: 'mcp-vault' },
      { name: 'splunk', transport: 'streamable-http', url: 'https://splunk.local/mcp' },
    ],
  },
  autonomy: {
    tiers: {
      auto: ['read', 'query', 'search'],
      escalate: ['contain', 'isolate'],
      approve: ['delete', 'revoke', 'terminate'],
    },
  },
  persona: {
    name: 'praetor',
    tone: 'commanding',
    domain: 'cybersecurity',
    systemPrompt: 'You are the Praetor, a sovereign cybersecurity intelligence officer.',
  },
  audit: { store: 'memory', integrity: 'sha256-chain' },
});

await agent.start();
const result = await agent.run('What threats were detected in the last 24 hours?');
console.log(result.response);
await agent.stop();
```

## Architecture

Epic AI Core separates concerns into five integrated layers, plus orchestration, transport, resilience, and observability:

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────┐
│                    Orchestrator                      │
│              (Local SLM — Mistral 7B)               │
│         Selects tools, routes actions.               │
│         Tool schemas NEVER leave this box.           │
└──────┬──────────────┬───────────────┬───────────────┘
       │              │               │
       ▼              ▼               ▼
  Federation      Autonomy        Audit Trail
  (N MCP servers) (3-tier gate)   (SHA-256 chain)
       │              │
       ▼              ▼
  Tool Results    Approve/Deny
       │
       ▼
┌─────────────────────────────────────────────────────┐
│                    Generator                         │
│              (Cloud LLM — GPT-4.1)                  │
│         Receives curated context only.               │
│         Produces final human-readable response.      │
└─────────────────────────────────────────────────────┘
```

The orchestrator (local SLM) handles all tool selection and invocation. The generator (cloud LLM) only sees retrieved results and produces the response. Tool schemas, MCP server topology, and intermediate tool outputs never reach the cloud.

### Architecture Notes

#### Generator Fallback

If `generator` is omitted from `EpicAIConfig`, `EpicAI.start()` reuses the orchestrator's local model for both tool routing and response synthesis. **This only works when the orchestrator provider is `'ollama'`.** For all other providers, omitting `generator` throws an error at startup before any side effects (MCP connections, audit trail initialization) occur.

For production deployments, always provide an explicit `generator` configuration pointing to a cloud LLM (GPT-4.1, Claude, etc.) for response quality. The orchestrator (local SLM) handles tool selection; the generator handles human-readable synthesis.

#### Prompt Injection Defense

Sanitization is applied at two distinct boundaries:

1. **Before the planner loop** — Retrieval results and memory context are sanitized via `sanitizeInjectedContent()` and wrapped in `<DATA_CONTEXT>` tags with an explicit instruction boundary before entering the orchestrator's system prompt. This prevents injected content from steering tool selection.

2. **Before the synthesis prompt** — Tool output from MCP servers is sanitized via `sanitizeInjectedContent()` and wrapped in `<DATA_CONTEXT>` tags before the generator receives it for response synthesis.

**Trust boundary note:** Tool results re-enter the planner loop as `role: 'tool'` messages in the orchestrator's conversation history. These messages are sanitized before synthesis but are present as raw tool output in the planner context. The planner (local SLM) sees tool results without sanitization to preserve its ability to reason about them for subsequent tool calls. This is a deliberate design tradeoff — the planner must see actual tool output to make routing decisions, but this means a compromised MCP server could influence the planner's tool selection in subsequent iterations.

`sanitizeInjectedContent()` is a heuristic mitigation (strips common injection prefixes), not a formal security boundary. For deployments with untrusted MCP servers, implement output validation in your adapter's `callTool()` response and consider limiting `maxIterations` to reduce the planner's exposure to adversarial tool output.

#### Stream Event Typing

Stream event payloads are typed as `Record<string, unknown>` rather than a discriminated union. The exact payload schema for each event type is defined by convention (documented below in [StreamEvent Types](#streamevent-types)) rather than enforced by the type system. This is a known design gap — the stream contract lives in documentation and tests rather than in types. Consumers must validate event payloads defensively rather than assuming field presence. A future release may introduce typed discriminated unions for stream events.

#### Startup Validation Order

`EpicAI.start()` validates all configuration and creates LLM functions **before** performing any side effects. The sequence is:

1. Create orchestrator LLM
2. Resolve generator LLM (or throw if missing and non-Ollama)
3. Connect MCP servers (`connectAll()`)
4. Initialize audit trail (`auditTrail.init()`)

If configuration is invalid, the agent fails fast with no partial initialization.

---

## Configuration Reference

### EpicAIConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orchestrator` | `OrchestratorConfig` | Yes | Local SLM for tool routing |
| `generator` | `GeneratorConfig` | No | Cloud LLM for response synthesis (see [Generator Fallback](#generator-fallback)) |
| `federation` | `FederationConfig` | Yes | MCP server connections |
| `autonomy` | `AutonomyConfig` | Yes | Tiered action governance |
| `retrieval` | `RetrievalConfig` | No | Hybrid vector search |
| `persona` | `PersonaConfig` | Yes | Agent identity and system prompt |
| `audit` | `AuditConfig` | Yes | Append-only audit trail |
| `transport` | `'sse' \| 'json'` | No | Streaming format (default: `'json'`) |

### OrchestratorConfig

| Field | Type | Description |
|-------|------|-------------|
| `provider` | `'ollama' \| 'vllm' \| 'apple-foundation' \| 'custom'` | Runtime |
| `model` | `string` | Model name (e.g., `'mistral:7b'`) |
| `baseUrl` | `string` | Ollama/vLLM endpoint |
| `maxIterations` | `number` | Max tool-calling loop iterations |
| `timeoutMs` | `number` | Per-call timeout (default: 5000) |
| `llm` | `LLMFunction` | Bring-your-own LLM (for `'custom'` provider) |

### GeneratorConfig

| Field | Type | Description |
|-------|------|-------------|
| `provider` | `'openai' \| 'anthropic' \| 'ollama' \| 'custom'` | LLM provider |
| `model` | `string` | Model name (e.g., `'gpt-4.1'`, `'claude-opus-4-6'`) |
| `apiKey` | `string` | Provider API key |
| `maxTokens` | `number` | Max generation tokens |
| `timeoutMs` | `number` | Per-call timeout (default: 30000) |
| `llm` | `LLMFunction` | Bring-your-own LLM (for `'custom'` provider) |

### FederationConfig

```typescript
{
  servers: ServerConnection[];
  retryPolicy?: { maxRetries: number; backoffMs: number; maxBackoffMs: number };
  healthCheckIntervalMs?: number;
}
```

### ServerConnection

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique server identifier |
| `transport` | `'stdio' \| 'streamable-http'` | MCP transport |
| `url` | `string` | URL for HTTP transport |
| `command` | `string` | Command for stdio transport |
| `args` | `string[]` | Command arguments |
| `auth` | `AuthConfig` | Authentication (`bearer`, `basic`, `api-key`) |
| `timeoutMs` | `number` | Connection timeout |

### AutonomyConfig

```typescript
{
  tiers: {
    auto: string[];      // Tool names executed without review
    escalate: string[];  // Executed, queued for post-hoc review
    approve: string[];   // Blocked until human approves
  };
  policies?: AutonomyPolicy[];
  approvalQueue?: {
    persistence: 'memory' | 'redis';
    ttlMs: number;
    onExpire: 'deny' | 'escalate-to-admin';
    redis?: { host: string; port: number };
  };
}
```

### AuditConfig

| Field | Type | Description |
|-------|------|-------------|
| `store` | `'memory' \| 'append-only-log' \| 'custom'` | Storage backend |
| `path` | `string` | File path for `'append-only-log'` |
| `integrity` | `'sha256-chain' \| 'none'` | Hash chaining mode |
| `export` | `('json' \| 'csv' \| 'syslog')[]` | Enabled export formats |

---

## Federation Layer

The federation layer connects N MCP servers behind a single interface with unified tool discovery, health monitoring, and cross-source entity correlation.

### Connecting Servers

```typescript
import { FederationManager } from '@epic-ai/core';

const federation = new FederationManager({
  servers: [
    { name: 'crowdstrike', transport: 'streamable-http', url: 'https://cs.local/mcp',
      auth: { type: 'bearer', token: process.env.CS_TOKEN } },
    { name: 'vault', transport: 'stdio', command: 'mcp-vault' },
  ],
  retryPolicy: { maxRetries: 3, backoffMs: 500, maxBackoffMs: 10000 },
  healthCheckIntervalMs: 30000,
});

await federation.connectAll();
```

### Tool Discovery

```typescript
const allTools = federation.listTools();           // All tools across all servers
const vaultTools = federation.listToolsByServer('vault');  // Tools from one server
```

### Tool Invocation

```typescript
const result = await federation.callTool('vault_read_secret', { path: 'secret/api-keys' });
// result: { content, isError, server: 'vault', tool: 'vault_read_secret', durationMs }
```

### Cross-Source Correlation

```typescript
const correlated = await federation.correlate({
  timeRange: { start: new Date('2026-03-19'), end: new Date() },
  entities: ['10.0.1.45', 'admin@corp.com'],
  servers: ['crowdstrike', 'splunk'],
});
// Returns: { entities: CorrelatedEntity[], events: CorrelatedEvent[], timeline: [...] }
```

### Health Monitoring

```typescript
const health = await federation.health();
// [{ server, status, toolCount, lastPingMs, lastError }]

federation.onHealthChange((h) => {
  if (h.status === 'error') console.error(`${h.server} down: ${h.lastError}`);
});
```

### MCPAdapter Interface

Implement this to connect any custom MCP server:

```typescript
import { FederationManager, type MCPAdapter, type Tool, type ToolResult } from '@epic-ai/core';

class MyCustomAdapter implements MCPAdapter {
  readonly name: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

  constructor(name: string) { this.name = name; }

  async connect(): Promise<void> { /* negotiate transport */ }
  async disconnect(): Promise<void> { /* cleanup */ }
  async listTools(): Promise<Tool[]> { /* return tool definitions */ }
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> { /* invoke */ }
  async ping(): Promise<number> { /* return latency ms */ }
}

const serverConfig = { name: 'my-server', transport: 'stdio' as const, command: 'my-mcp' };

// Pass an adapter instance directly
await federation.connect('my-server', serverConfig, new MyCustomAdapter('my-server'));

// Or pass a factory function
await federation.connect('my-server', serverConfig, (cfg) => new MyCustomAdapter(cfg.name));
```

If no adapter is provided, `ConnectionPool` defaults to `MCPClientAdapter` (the built-in MCP protocol client).

---

## Autonomy Layer

Every tool call passes through the TieredAutonomy engine before execution. Three tiers:

| Tier | Behavior |
|------|----------|
| `auto` | Executed immediately, no human review |
| `escalate` | Executed, enqueued for post-hoc human review |
| `approve` | Blocked until a human explicitly approves |

### Tier Evaluation

```typescript
import { TieredAutonomy } from '@epic-ai/core';

const autonomy = new TieredAutonomy(
  {
    auto: ['search', 'query', 'read', 'list'],
    escalate: ['contain', 'isolate', 'block'],
    approve: ['delete', 'revoke', 'terminate', 'disable'],
  },
  { persistence: 'memory', ttlMs: 3600000, onExpire: 'deny' },
);

const decision = await autonomy.evaluate({
  tool: 'delete',
  server: 'vault',
  args: { path: 'secret/prod-keys' },
  persona: 'praetor',
  timestamp: new Date(),
  priorActions: [],
});
// decision.tier === 'approve', decision.allowed === false (pending)
```

### Dynamic Policies

Policies override tier assignments at runtime based on context:

```typescript
autonomy.addPolicy({
  name: 'no-prod-deletes-after-hours',
  condition: (ctx) => ctx.tool === 'delete' && ctx.server === 'prod' && new Date().getHours() > 18,
  override: 'approve',
  priority: 10,
});
```

Policies are evaluated in priority order (highest first). First match wins.

### Approving and Denying Actions

```typescript
// Via the agent
await agent.approve('action-uuid', { approver: 'ciso@corp.com' });
await agent.deny('action-uuid', { approver: 'ciso@corp.com', reason: 'Out of change window' });

// Via TieredAutonomy directly
await autonomy.approve('action-uuid', 'ciso@corp.com');
await autonomy.deny('action-uuid', 'ciso@corp.com', 'Not authorized');

// List pending
const pending = await autonomy.pending();
```

### Redis-Backed Queue

For multi-instance deployments:

```typescript
const autonomy = new TieredAutonomy(rules, {
  persistence: 'redis',
  redis: { host: 'localhost', port: 6379 },
  ttlMs: 1800000,
  onExpire: 'deny',
});
```

---

## Persona Layer

Controls agent identity, system prompt composition, vocabulary, and output constraints.

### Registering Personas

```typescript
import { PersonaManager } from '@epic-ai/core';

const persona = new PersonaManager();

persona.register({
  name: 'praetor',
  tone: 'commanding',
  domain: 'cybersecurity',
  systemPrompt: 'You are the Praetor, a sovereign threat intelligence officer.',
  vocabulary: { host: 'endpoint', user: 'principal' },
  constraints: ['Never speculate beyond available evidence.', 'Cite all source servers.'],
});

persona.register({
  name: 'analyst',
  tone: 'conversational',
  domain: 'cybersecurity',
  systemPrompt: 'You are a junior SOC analyst assisting with triage.',
});
```

### Switching Personas

```typescript
persona.switch('analyst');
const prompt = persona.buildSystemPrompt({ memories: [], tools: [] });
```

### System Prompt Builder

The builder assembles the final prompt from:

1. Persona system prompt
2. Constraints (appended as bullet list)
3. Memory context (wrapped in `<DATA_CONTEXT>` tags)
4. Tool context
5. Vocabulary replacements (global find-and-replace)

Injection patterns (`ignore previous`, `system:`, `you are`, `act as`) are automatically stripped from memory and tool context.

---

## Retrieval Layer

Triple-representation hybrid search with Reciprocal Rank Fusion (RRF).

### Setup

```typescript
import { HybridRetriever } from '@epic-ai/core';
import { QdrantAdapter } from '@epic-ai/core/retrieval/adapters/qdrant';

const retriever = new HybridRetriever({
  dense: { provider: 'qdrant', adapter: new QdrantAdapter({ host: 'localhost', port: 6333, collection: 'dense' }) },
  sparse: { provider: 'qdrant', adapter: new QdrantAdapter({ host: 'localhost', port: 6333, collection: 'sparse' }) },
  bm25: { provider: 'qdrant', adapter: new QdrantAdapter({ host: 'localhost', port: 6333, collection: 'bm25' }) },
  maxResults: 10,
  minScore: 0.0,
  fusion: 'rrf',
});
```

### Searching

```typescript
const results = await retriever.search('lateral movement indicators past 48h');
// [{ id, content, fusionScore, fusionSources: [{ type, rank, originalScore }], metadata }]
```

Each result includes `fusionSources` showing which retrieval paths contributed and at what rank.

### Indexing

```typescript
await retriever.index([
  { id: 'doc-1', content: 'Threat report...', metadata: { source: 'splunk' } },
  { id: 'doc-2', content: 'Vulnerability scan...', metadata: { source: 'qualys' } },
]);
```

### Fusion Strategies

- **`'rrf'`** — Reciprocal Rank Fusion (default). No weight tuning needed.
- **`'weighted'`** — Weighted sum per retrieval path. Requires manual weights.
- **`'custom'`** — Provide your own `(resultSets) => RetrievalResult[]` function.

### VectorStoreAdapter Interface

```typescript
interface VectorStoreAdapter {
  searchDense(query: string, options: SearchOptions): Promise<ScoredResult[]>;
  searchSparse(query: string, options: SearchOptions): Promise<ScoredResult[]>;
  searchBM25(query: string, options: SearchOptions): Promise<ScoredResult[]>;
  index(documents: IndexDocument[]): Promise<{ indexed: number; dense: number; sparse: number; bm25: number }>;
}
```

Built-in adapters: `InMemoryAdapter` (testing), `QdrantAdapter` (production).

---

## Memory Layer

Importance-weighted persistent memory with access-frequency auto-promotion.

### Storing Memories

```typescript
import { PersistentMemory, InMemoryStore } from '@epic-ai/core';

const memory = new PersistentMemory({ store: new InMemoryStore(), cacheTTLMs: 300000 });

await memory.etch('user-123', {
  type: 'threat-finding',
  content: 'Lateral movement detected from 10.0.1.45',
  importance: 'high',
  metadata: { source: 'crowdstrike', eventId: 'CS-2026-1234' },
});
```

### Recalling Memories

```typescript
const memories = await memory.recall('user-123', {
  type: 'threat-finding',
  importance: 'medium',
  limit: 10,
  sortBy: 'importance',  // or 'recency' or 'frequency'
});
```

Each recall increments `accessCount`. Frequently accessed memories are auto-promoted in importance.

### Memory Context

```typescript
const ctx = await memory.context('user-123');
// { totalMemories, memoryTypes, lastInteraction, importantMemories, ... }
```

### MemoryStoreAdapter Interface

```typescript
interface MemoryStoreAdapter {
  save(userId: string, entry: MemoryEntry): Promise<StoredMemory>;
  recall(userId: string, options: RecallOptions): Promise<StoredMemory[]>;
  context(userId: string): Promise<ContextSummary>;
  delete(userId: string, memoryId: string): Promise<void>;
}
```

Built-in adapters: `InMemoryStore` (testing), `RedisMongoAdapter` (production — Redis cache + MongoDB persistence).

---

## Audit Layer

SHA-256 hash-chained append-only logging. Every tool call, autonomy decision, and approval event is recorded with tamper-evident integrity.

### Recording

The orchestrator records actions automatically. For manual recording:

```typescript
import { AuditTrail } from '@epic-ai/core';

const audit = new AuditTrail({
  store: 'append-only-log',
  path: '/var/log/epic-ai/audit.jsonl',
  integrity: 'sha256-chain',
});
await audit.init();
```

### Querying

```typescript
const records = await audit.query({
  since: new Date('2026-03-01'),
  tier: 'approve',
  server: 'vault',
  limit: 50,
});
```

### Integrity Verification

```typescript
const result = await audit.verify();
// { valid: true, chainLength: 1247 }
// or { valid: false, chainLength: 1247, brokenAt: 892 }
```

### Export

```typescript
const csv = await audit.export('csv');
const json = await audit.export('json');
await audit.export('syslog');
```

### Hash Chain

Each record contains:
- `sequenceNumber` — monotonically increasing
- `previousHash` — SHA-256 of the prior record
- `hash` — SHA-256 of the current record (including `previousHash`)

Modifying or deleting any record breaks the chain. `verify()` walks the full chain and reports the first broken link.

### AuditStoreAdapter Interface

```typescript
interface AuditStoreAdapter {
  append(record: ActionRecord): Promise<void>;
  query(filter: AuditFilter): Promise<ActionRecord[]>;
  verify(): Promise<{ valid: boolean; chainLength: number; brokenAt?: number }>;
}
```

Built-in adapters: `InMemoryAuditAdapter` (testing), `JSONLAdapter` (production — atomic append to JSONL file).

---

## Orchestrator

The orchestrator runs a plan-act-observe loop:

1. **Retrieve** — HybridRetriever searches for relevant context (if configured)
2. **Remember** — PersistentMemory recalls user-specific context (if configured)
3. **Plan** — Local SLM receives the query, tools, and context. Selects tools to call.
4. **Act** — For each tool call:
   - Autonomy evaluates the action (auto/escalate/approve)
   - If allowed: FederationManager executes the tool
   - AuditTrail records the action
5. **Observe** — Tool results feed back into the SLM for the next iteration
6. **Repeat** — Until no more tool calls or `maxIterations` reached
7. **Etch** — New memories stored (if tools were executed)
8. **Synthesize** — Generator LLM produces the final response from curated context

### Batch Execution

```typescript
const result = await agent.run('Identify endpoints with active C2 beaconing');
// { response, events, actionsExecuted, actionsPending, persona, durationMs }
```

### Streaming

```typescript
for await (const event of agent.stream('Scan all domains for critical threats')) {
  switch (event.type) {
    case 'plan': console.log('Planning:', event.data); break;
    case 'action': console.log('Tool:', event.data.tool, 'on', event.data.server); break;
    case 'approval-needed': console.log('Needs approval:', event.data.actionId); break;
    case 'narrative': process.stdout.write(event.data.text); break;
    case 'done': console.log('Complete:', event.data.loopIterations, 'iterations,', event.data.actionsExecuted, 'actions'); break;
  }
}
```

### StreamEvent Types

| Type | Data | Description |
|------|------|-------------|
| `plan` | `{ iteration, toolCalls: string[] }` | Orchestrator selected tools for this iteration |
| `action` | `{ tool, server, durationMs }` | Tool executed |
| `approval-needed` | `{ actionId, tool, server, tier }` | Action blocked, needs human approval |
| `result` | `{ tool, content, isError }` | Tool returned data |
| `memory` | `{ etched: boolean, findingsCount }` | Memory etched after tool execution |
| `narrative` | `{ text }` | Generator produced text |
| `error` | `{ message }` | Error occurred |
| `done` | `{ loopIterations, actionsExecuted, actionsPending }` | Loop complete (1-based iteration count, run-local pending count) |

---

## Resilience

### Rate Limiting

```typescript
import { RateLimiter } from '@epic-ai/core';

const limiter = new RateLimiter({
  global: { requestsPerSecond: 100, burst: 200 },
  perServer: { requestsPerSecond: 10, burst: 20 },
});

if (limiter.allow('splunk')) { /* proceed */ }
const { remaining, resetsInMs } = limiter.remaining('splunk');
```

### Error Classification and Retry

```typescript
import { ErrorClassifier } from '@epic-ai/core';

const result = await ErrorClassifier.withRetry(
  () => federation.callTool('splunk_search', { query: 'index=main' }),
  { maxRetries: 3 },
);
```

Error categories:
- **Transient** (5xx, connection reset) — retry 3x, backoff 1s
- **Rate-limited** (429) — retry 5x, backoff 5s
- **Timeout** — retry 3x, backoff 2s
- **Permanent** (4xx, auth failure) — no retry

### Graceful Shutdown

```typescript
import { GracefulShutdown } from '@epic-ai/core';

const shutdown = new GracefulShutdown();
shutdown.register({ name: 'save-audit', fn: () => audit.flush(), timeoutMs: 5000 });
shutdown.register({ name: 'disconnect', fn: () => federation.disconnectAll(), timeoutMs: 10000 });

const unsubscribe = shutdown.registerSignalHandlers(() => process.exit(0));
```

### Crash Recovery

```typescript
import { FileCheckpointStore } from '@epic-ai/core';

const checkpoint = new FileCheckpointStore('/var/lib/epic-ai/checkpoints');
await checkpoint.save({ id: 'run-123', step: 5, context: { ... } });

// After crash:
const restored = await checkpoint.load('run-123');
```

### Prompt Cache

```typescript
import { PromptCache } from '@epic-ai/core';

const cache = new PromptCache({ maxEntries: 1000, defaultTTLMs: 300000 });
const prompt = await cache.getOrCompute('user-123-context', async () => {
  return buildExpensivePrompt();
});
```

Shared in-flight promises prevent thundering herd on cache miss. LRU eviction at capacity.

---

## Observability

### Event Callbacks

```typescript
import { ObservabilityEmitter } from '@epic-ai/core';

const emitter = new ObservabilityEmitter();

// Production: forward events to your logging infrastructure
emitter.onEvent((event) => {
  myLogger.info({ type: event.type, ...event.data, timestamp: event.timestamp });
});

// Production: structured log callback
emitter.onLog((entry) => {
  myLogger[entry.level](entry.message, { layer: entry.layer, ...entry.data });
});

// Development only: built-in stderr logger (JSON lines, never stdout)
// Accepts a list of keys to redact from nested payloads.
emitter.onLog(ObservabilityEmitter.consoleLogger(['apiKey', 'token', 'password']));
```

`ObservabilityEmitter.consoleLogger()` writes structured JSON to `stderr` (not `stdout`) to avoid polluting application output. It is intended for local development and debugging — production deployments should use a dedicated logging callback.

### Token and Cost Tracking

```typescript
import { TokenTracker } from '@epic-ai/core';

const tracker = new TokenTracker();
tracker.record('openai', 'gpt-4.1', 'generator', { promptTokens: 1200, completionTokens: 340 });

const summary = tracker.summary();
// { totalTokens, totalCostUsd, byRole: { orchestrator, generator }, byModel: { ... } }
```

### OpenTelemetry Integration

```typescript
import { createOTelEventCallback, createOTelLogCallback } from '@epic-ai/core';

emitter.onEvent(createOTelEventCallback(spanExporter, traceId));
emitter.onLog(createOTelLogCallback(logExporter));
```

---

## MCP Server Adapters

The SDK ships 40+ pre-built cybersecurity vendor adapters. Each implements `MCPAdapter` and handles authentication, request formatting, and response normalization.

| Category | Adapters |
|----------|----------|
| EDR / XDR | CrowdStrike Falcon, CrowdStrike Identity, Carbon Black, SentinelOne, Cybereason, Sophos, Trend Micro |
| SIEM / Analytics | Splunk, IBM QRadar, Microsoft Sentinel, Sumo Logic, LogRhythm, Datadog Security |
| Threat Intelligence | Recorded Future, ThreatConnect, Anomali, Mandiant |
| Network Security | Palo Alto Networks, Fortinet, Check Point, Cisco Secure, Zscaler, Barracuda, Darktrace |
| Vulnerability Mgmt | Tenable, Qualys, Rapid7, Orca, Lacework, Wiz, Prisma Cloud |
| Identity & Access | CyberArk, BeyondTrust, Delinea, Ping Identity |
| GRC / Compliance | ServiceNow GRC, OneTrust, Drata |
| Email Security | Proofpoint, Mimecast |

### Using an Adapter

```typescript
import { SplunkMCPServer } from '@epic-ai/core/mcp-servers/splunk';

const splunk = new SplunkMCPServer({
  host: 'splunk.corp.example.com',
  username: process.env.SPLUNK_USER,
  password: process.env.SPLUNK_PASS,
});
```

Or connect via the FederationManager:

```typescript
await federation.connect('splunk', {
  name: 'splunk',
  transport: 'streamable-http',
  url: 'https://splunk.corp.example.com:8089/mcp',
  auth: { type: 'bearer', token: process.env.SPLUNK_TOKEN },
});
```

---

## Writing Custom Adapters

### Custom MCP Server

```typescript
import { type MCPAdapter, type Tool, type ToolResult } from '@epic-ai/core';

class MySecurityTool implements MCPAdapter {
  readonly name = 'my-tool';
  status: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

  async connect(): Promise<void> { /* negotiate transport */ }
  async disconnect(): Promise<void> { /* cleanup */ }
  async listTools(): Promise<Tool[]> { /* return tool definitions */ }
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> { /* invoke */ }
  async ping(): Promise<number> { /* return latency ms */ }
}

// Register with the federation
const config = { name: 'my-tool', transport: 'stdio' as const, command: 'my-security-tool' };
await federation.connect('my-tool', config, new MySecurityTool());
```

### Custom Vector Store

```typescript
import type { VectorStoreAdapter, ScoredResult, IndexDocument, SearchOptions } from '@epic-ai/core';

class MyVectorStore implements VectorStoreAdapter {
  async searchDense(query: string, options: SearchOptions): Promise<ScoredResult[]> { /* semantic */ }
  async searchSparse(query: string, options: SearchOptions): Promise<ScoredResult[]> { /* sparse */ }
  async searchBM25(query: string, options: SearchOptions): Promise<ScoredResult[]> { /* keyword */ }
  async index(documents: IndexDocument[]): Promise<{ indexed: number; dense: number; sparse: number; bm25: number }> { /* store */ }
}
```

### Custom Memory Store

```typescript
import type { MemoryStoreAdapter } from '@epic-ai/core';

class MyMemoryStore implements MemoryStoreAdapter {
  async save(userId, entry) { /* persist */ }
  async recall(userId, options) { /* query + auto-promote */ }
  async context(userId) { /* aggregate stats */ }
  async delete(userId, memoryId) { /* soft delete */ }
}
```

### Custom Audit Store

```typescript
import type { AuditStoreAdapter } from '@epic-ai/core';

class MyAuditStore implements AuditStoreAdapter {
  async append(record) { /* atomic append */ }
  async query(filter) { /* filtered retrieval */ }
  async verify() { /* chain integrity check */ }
}
```

---

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run build         # TypeScript compile
```

The SDK provides in-memory adapters for all extension points, enabling fully offline testing:

```typescript
import { EpicAI } from '@epic-ai/core';

const agent = await EpicAI.create({
  orchestrator: { provider: 'custom', model: 'test', llm: mockLLM },
  federation: { servers: [] },
  autonomy: { tiers: { auto: ['*'], escalate: [], approve: [] } },
  persona: { name: 'test', tone: 'neutral', domain: 'test', systemPrompt: 'Test.' },
  audit: { store: 'memory', integrity: 'none' },
});
```

---

## CLI Setup Tool

Interactive setup wizard for first-time configuration:

```bash
npx epic-ai setup
npx epic-ai setup --model llama3:8b
npx epic-ai setup --skip-model
npx epic-ai setup --force-config
```

The wizard:
1. Detects Ollama (probes `http://localhost:11434/api/version`)
2. Checks/pulls the orchestrator model
3. Validates the model responds to a test prompt
4. Generates `epic-ai.config.ts` template

---

*Epic AI® is a registered trademark of protectNIL Inc. (U.S. Reg. No. 7,371,952)*
