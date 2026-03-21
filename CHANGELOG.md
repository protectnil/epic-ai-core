# Changelog

All notable changes to `@epicai/core` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
