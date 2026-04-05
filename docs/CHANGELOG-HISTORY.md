# Changelog

All notable changes to `@epicai/legion` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## 0.5.0 — 2026-04-01

### Breaking Changes
- Package renamed from `@epicai/core` to `@epicai/legion`
- CLI commands renamed: `epic-ai` → `legion`, `epic-ai-gateway` → `legion-gateway`

### Added
- **29 new REST adapters** — 11 AWS services (DynamoDB, Lambda, IAM, CloudWatch, ECS, SNS, SQS, CloudTrail, Cost Explorer, Route 53, Redshift) + 18 industry verticals (FHIR, Opera PMS, Mews, Cloudbeds, InfoGenesis, Autodesk Construction, PlanGrid, Buildertrend, Epicor, Infor, Odoo, Majesco, Blackboard, PowerSchool, Bandwidth, Adobe Sign, Travelport, Trello). 870 REST adapters on disk.
- **Setup wizard** — interactive CLI with Clack prompts. Auto-detects 11 MCP clients (Claude Code, Cursor, Windsurf, VS Code, Codex, Gemini, Cline, Continue, Goose, Roo Code, Claude Desktop). Writes MCP config with permission. Secrets provider integration (Vault, AWS SM, Azure KV, 1Password, Doppler).
- **MCP server mode** (`--serve`) — exposes `legion_query`, `legion_call`, `legion_list` tools. Three-tier routing (keyword matching, BM25 relevance scoring, model-assisted classification) to 35,020 tools across 2,009 live integrations.
- **Subcommands** — `add`, `remove`, `health`, `list` with fuzzy matching
- **Elastic License 2.0** for adapters and registry (LICENSE-ADAPTERS)
- MCP registry cleaned to Node-only (Python/Go/Rust/Java entries archived)

### Changed
- Default adapter count: 870 REST + 1,139 live MCP = 2,009 integrations, 35,020 tools. Dead, timed-out, and unreachable MCP servers excluded from catalog.

---

## 0.4.4 — 2026-03-24

### Added
- `mcp-registry.json` ships with package — 472 adapter connection configs (223 MCP + 472 REST).
- `RegistryLoader` — one-line adapter loading with credential resolution from env vars.
- Adapter sync service — autonomous MCP discovery, tool enumeration, Qdrant embeddings, GitHub publishing.
- MongoDB schema (`epicai_core.adapters`) — verbose source of truth with 37 indexes.
- 472 individual test files in `tests/adapters/`.
- `docs/KNOWN-ISSUES.md` — Llama 3.1 8B tool-calling limitation documented.
- Spec folder generators, CSV export, test file generators — all from MongoDB.

### Fixed
- All 472 adapters have `static catalog()` — adapter-catalog.json now contains 472 entries (was 470).

## 0.4.3 — 2026-03-24

### Fixed
- Default timeout increased to 30s for inference backends.
- Throughput test fix for concurrent request measurement.
- All 472 adapters now have `static catalog()` — adapter-catalog.json contains 472 entries.
- MCP registry (`mcp-registry.json`) ships with package — 472 entries, 223 vendor MCP configs, ready-to-connect.
- `RegistryLoader` — one-line adapter loading with automatic credential resolution from env vars.
- Adapter sync service — autonomous MongoDB-backed source of truth with MCP discovery, enumeration, and publishing.

## 0.4.2 — 2026-03-24

### Changed
- `provider: 'auto'` now probes `localhost:8080` (llama.cpp) as second priority, before Ollama fallback.
- Clear error message with setup instructions when no inference backend is available.

## 0.4.1 — 2026-03-24

### Fixed
- All adapters rewritten to ADAPTER-DEVELOPMENT-PROTOCOL — full tool coverage, MCP headers, static `catalog()` method on every adapter.
- Integration tests probe gateway first (`localhost:8000`), fall back to llama.cpp (`localhost:8080`), then Ollama — M5 Metal compatible.

## 0.4.0 — 2026-03-24

### Added
- **Inference Gateway** (`npx epic-ai-gateway`) — OpenAI-compatible HTTP router for llama.cpp, mlx-lm, and vLLM backends with circuit breakers, Redis-backed control plane, and leader-elected health checks.
- **Auto provider** — `provider: 'auto'` probes `localhost:8000` (gateway), `localhost:8080` (llama.cpp), `localhost:11434` (Ollama legacy). First responder wins.
- **Three-tier tool resolution** — DomainClassifier (keyword/semantic), BM25 ToolPreFilter, and SLM selection prevent context window bloat across 472 adapters.
- **Adapter sandboxing** — SandboxManager runs community and vendor adapters in process-isolated sandboxes with configurable memory limits, timeouts, and egress enforcement.
- **Adaptive connection pool** — Per-tenant burst-aware connection management with LRU/LFU eviction, replacing flat maxConnections.
- **Enterprise trust** — AuthMiddleware, AccessPolicyEngine, ArtifactVerifier (Sigstore/SLSA), and pluggable secrets providers.
- **PrometheusExporter** — new observability export format.
- **ADAPTER-DEVELOPMENT-PROTOCOL** — mandatory standard for all adapter contributions.

### Changed
- Default orchestrator provider changed from `'ollama'` to `'auto'`.
- Default model changed to `llama3.1:8b`.
- Ollama deprecated — Apple M5 Metal incompatibility ([#13867](https://github.com/ollama/ollama/issues/13867), [#13896](https://github.com/ollama/ollama/issues/13896), [#13460](https://github.com/ollama/ollama/issues/13460)) with no fix timeline. The Inference Gateway with llama.cpp is the reliable path across all Apple Silicon generations.
- Ollama `/api/chat` and `/api/generate` endpoints deprecated via OllamaShim (sunset 2026-12-31). Use OpenAI-compatible `/v1/chat/completions` instead.

## 0.3.0 — 2026-03-24

### Added
- 359 new adapters — expanded from 113 to 472 across 22 enterprise categories.

---

## 0.2.0 — 2026-03-22

### Changed
- **Product renamed to Epic AI® IVA Core** — title, README, Developer Guide, package.json description, and footer all reflect IVA Core branding to align with U.S. Trademark Reg. No. 7,748,019
- **113 enterprise adapters** (was 40 cybersecurity-only) — expanded from 10 (ISC)² security domains to 7 operational categories: Security, DevOps & Infrastructure, Observability, Productivity & Collaboration, AI/ML Platforms, Business Operations, and Content & Social
- Adapter section reorganized by operational category with full vendor tables across all categories
- README "Why Epic AI®" section reordered — token efficiency, data sovereignty, and SLM latency now lead; governance and compliance follow
- README subtitle: "Local SLM orchestrates. Cloud LLM responds. Your data never leaves."
- Developer Guide intro broadened from "IVA framework for cybersecurity" to platform-level positioning across all adapter domains
- Developer Guide persona examples expanded from 2 (security-only) to 7: sentinel (security), ops-lead (DevOps), deal-desk (sales), controller (finance), chief (CEO), pm (product), people-ops (HR)
- Developer Guide orchestrator examples broadened to cross-functional queries
- Developer Guide memory examples now include security and sales use cases
- Developer Guide retrieval indexing example includes deployment runbook alongside threat/vuln data
- Data sovereignty section reframed from "security architecture" to "data sovereignty architecture" with cross-domain data examples
- Custom adapter examples renamed from `MySecurityTool` to `MyCustomAdapter`
- Persona name in all SDK examples changed from `praetor` to `sentinel`
- Approver email in autonomy examples changed from `ciso@corp.com` to `ops@corp.com`

### Added
- NOTICE file — Apache 2.0 Section 4(d) attribution carry-forward
- TRADEMARK.md added to npm package `files` array
- Managed adapter maintenance line in README and Developer Guide: "keeping adapters current as vendor APIs and MCP specifications evolve — available from protectNIL Inc."
- Trademark notice in README and Developer Guide expanded to cover all 7 operational domains

### Fixed
- Developer Guide Writing Custom Adapters section: `MyCustomAdapter` class now has constructor accepting `name` parameter, consistent with Federation Layer MCPAdapter example
- SECURITY.md: removed proprietary product name from public repo scope section

---

## 0.1.2 — 2026-03-21

### Added
- Package renamed from `@epic-ai/core` to `@epicai/core`
- StreamEvent discriminated union with typed interfaces exported from package root
- CHANGELOG.md
- Three runnable examples: basic-agent, cybersecurity-briefing, multi-persona
- Deterministic test harness with stdio, HTTP, and API profiles

### Fixed
- durationMs semantics aligned between Orchestrator.run() and JSONResponse.collect()
- ConnectionPool retry creates fresh adapter per attempt (no state leakage)
- sanitizeKeys handles nested objects, arrays, and circular references
- Security contact standardized to security@epic-ai.io across all docs

---

## 0.1.1 — 2026-03-20

### Added
- IVA (Intelligent Virtual Assistant) positioning across all documentation
- 40 cybersecurity MCP adapters spanning all 10 (ISC)² security domains
- Deterministic test harness (stdio, HTTP, API profiles)
- Data sovereignty architecture: tool schemas and security telemetry never leave infrastructure
- TRADEMARK.md — HashiCorp-modeled trademark policy separating Apache 2.0 code rights from mark rights
- DEVELOPER_GUIDE.md — comprehensive guide covering all 10 SDK layers with code examples
- StreamEvent discriminated union with typed payloads (PlanEvent, ActionEvent, DoneEvent, etc.)
- Three-boundary prompt injection defense (planner, iteration, synthesis)
- Startup validation ordering — fail fast before side effects

### Fixed
- Trademark registration number corrected to 7,748,019
- loopIterations now 1-based (one-pass run reports 1, not 0)
- actionsPending is run-local via Set, not global queue
- Tool output sanitized before planner loop re-entry
- ConnectionPool.connect() accepts custom MCPAdapter instances or factory functions
- MCPAdapter interface exported from package root
- ObservabilityEmitter.consoleLogger() writes to stderr, not stdout

## 0.1.0 — 2026-03-20

### Added
- Initial release of Epic AI® Zero LLM Context MCP Orchestrator
- Five-layer architecture: Federation, Autonomy, Retrieval, Persona, Audit
- Zero LLM Context orchestrator/generator split — local SLM routes tools, cloud LLM responds
- Tiered autonomy governance (auto / escalate / approve) with dynamic policy engine
- SHA-256 hash-chained append-only audit trail with tamper-evident verification
- Hybrid retrieval (dense + miniCOIL + BM25 with Reciprocal Rank Fusion)
- Importance-weighted persistent memory with access-frequency auto-promotion
- Persona manager with system prompt builder and injection defense
- 40 cybersecurity vendor MCP server adapters
- CLI setup tool (`npx epic-ai setup`) with Ollama detection and model pull
- SSE streaming and JSON response transport
- Observability: event emission, token/cost tracking, OpenTelemetry integration
- Resilience: rate limiting, error classification, graceful shutdown, checkpoint/restore, prompt cache
- Apache License 2.0
