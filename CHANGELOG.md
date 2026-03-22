# Changelog

All notable changes to `@epicai/core` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## 0.2.0 — 2026-03-22

### Changed
- **Product renamed to Epic AI® IVA Core** — title, README, Developer Guide, package.json description, and footer all reflect IVA Core branding to align with U.S. Trademark Reg. No. 7,748,019
- **113 enterprise adapters** (was 40 cybersecurity-only) — expanded from 10 (ISC)² security domains to 7 operational categories: Security, DevOps & Infrastructure, Observability, Productivity & Collaboration, AI/ML Platforms, Business Operations, and Content & Social
- Adapter section reorganized by operational category with full vendor tables across all 7 domains
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
