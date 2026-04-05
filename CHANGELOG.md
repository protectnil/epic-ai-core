# Changelog

All notable changes to `@epicai/legion` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## 1.1.1 — 2026-04-04

### Fixed
- **312 REST adapter class name mismatches** in adapter-catalog.json — all 870 REST adapters now load correctly. Fabrique-generated catalog entries used inconsistent casing (e.g. `UsptoMCPServer` vs actual export `USPTOMCPServer`).

---

## 1.1.0 — 2026-04-04

### Added
- **4,135 integrations** (624 REST-only, 3,242 MCP-only, 246 dual REST+MCP, 23 REST candidates) exposing **35,835 tools**
- **870 REST adapters** across cybersecurity, DevOps, cloud, healthcare, finance, hospitality, construction, manufacturing, commerce, travel, observability, and more
- **3,479 MCP connections** — stdio (3,004), streamable-HTTP (456), SSE (18), HTTP (1)
- **Setup wizard** — auto-detects 11 MCP clients (Claude Code, Cursor, Windsurf, VS Code, Codex, Gemini, Cline, Continue, Goose, Roo Code, Claude Desktop), writes MCP config with permission
- **Curated zero-credential adapters** — PubMed, Govbase, Searchcode, Robtex configured by default, routing demo proves intelligence
- **CLI commands** — `legion query`, `legion list`, `legion search`, `legion configure`, `legion add`, `legion remove`, `legion health`, `legion help`, `legion serve`
- **MCP server mode** (`legion serve`) — exposes `legion_query`, `legion_call`, `legion_list` tools
- **Two-tier tool resolution** — BM25 + miniCOIL relevance scoring, then model-assisted classification — full catalog never reaches the LLM. Context window cost: 469 tokens.
- **Tiered autonomy governance** — auto / escalate / approve with per-adapter and per-operation configuration
- **SHA-256 hash-chained audit trail** — tamper-evident, append-only, exportable
- **Inference Gateway** (`legion-gateway`) — OpenAI-compatible router for llama.cpp, mlx-lm, and vLLM
- **Secrets providers** — HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, environment variables
- **Test harness** — 45 assertions across stdio, HTTP, and API transport profiles
- **71 zero-credential integrations** verified to return real data without credentials
- Apache License 2.0 (SDK framework) + Elastic License 2.0 (adapters and registry)
