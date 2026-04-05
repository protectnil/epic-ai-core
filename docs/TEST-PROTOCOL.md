# Epic AI® Legion — Integration Test Protocol

**Package:** `@epicai/legion`
**Version:** 1.0.0

---

## Purpose

This document defines the complete test protocol for validating the Epic AI® Legion SDK. Any developer or contributor can use it to run the full suite on their hardware.

---

## Inference Backend Setup

The SDK uses `provider: 'auto'` which probes three endpoints in order:

| Priority | URL | Backend | Notes |
|----------|-----|---------|-------|
| 1 | `http://localhost:8000` | Inference Gateway | Multi-backend router. Start with `npx epic-ai-gateway` |
| 2 | `http://localhost:8080` | llama.cpp | Direct server. Start with `llama-server --model <file> --port 8080` |
| 3 | `http://localhost:11434` | Ollama (legacy) | Deprecated. Broken on Apple M5 Metal. |

**Recommended setup:**

```bash
brew install llama.cpp
# Download a GGUF model from Hugging Face (e.g., bartowski/Meta-Llama-3.1-8B-Instruct-GGUF)
llama-server --model llama-3.1-8b-instruct.Q4_K_M.gguf --port 8080 --jinja
```

The first endpoint that responds on `/v1/models` wins. Default model: `llama-3.1-8b-instruct.Q4_K_M.gguf` (or equivalent GGUF). Download GGUF files from [Hugging Face](https://huggingface.co/models?library=gguf).

---

## Three Test Lanes

| Lane | Command | Runner | External Dependencies | Purpose |
|------|---------|--------|----------------------|---------|
| 1 | `npm test` | Vitest | None | Unit tests — all layers, mock LLMs |
| 2 | `npm run test:integration` | Vitest (separate config) | Local inference backend (llama.cpp or gateway) | Air-gapped + hybrid LLM integration |
| 3 | `npm run test:harness` | Standalone tsx | None | Transport correctness (stdio, HTTP, API) |

---

## Lane 1: Unit Tests (`npm test`)

All test files in `tests/` excluding `tests/integration/`. Mock LLMs, in-memory adapters, no external services.

- Expected: all tests pass in under 10 seconds on any hardware
- No inference backend, no MongoDB, no Redis, no cloud API keys required

---

## Lane 2: Integration Tests (`npm run test:integration`)

### Prerequisites

- Local inference backend running (llama.cpp on port 8080 or gateway on port 8000)
- Model loaded: a GGUF such as `llama-3.1-8b-instruct.Q4_K_M.gguf` (download from Hugging Face). Start with `--jinja` for tool-call support.
- For hybrid tests: `OPENAI_API_KEY` env var set (tests skip gracefully if absent)

### Test Structure

```
tests/integration/
├── ollama.test.ts                         # 2 basic provider tests (probes gateway/llama.cpp — filename is legacy, Ollama not required)
├── air-gapped/
│   └── orchestrator-generator.test.ts     # 20 tests — local backend both sides
└── hybrid/
    └── cloud-handoff.test.ts              # 3 tests — local backend + OpenAI
```

### Air-Gapped Tests (20 tests, ~35 LLM calls)

All inference stays local. Zero external API calls.

| Section | Tests | What It Validates |
|---------|-------|-------------------|
| Tool Selection Accuracy | 5 | Correct tool selected from 8 available for threat hunting, identity checks, EDR queries, CVE lookups, network flow analysis |
| Multi-Step Chaining | 3 | Orchestrator iterates: search→identity check, list→isolate endpoint, three-step search→correlate→respond |
| Argument Extraction | 3 | Enum values, compound filters, structured fields extracted from natural language |
| Stop Conditions | 2 | Direct response for general knowledge; stops after complete tool result instead of looping |
| Throughput & Latency | 3 | Single inference latency, concurrent requests (p50/p95), token generation rate (tokens/sec) |
| Long Context | 2 | Correct routing with ~2K token system prompt + 10-message history; synthesis from large tool results without hallucination |
| Adversarial | 2 | Prompt injection resistance; semantic tool selection despite misleading keyword overlap |

### Hybrid Tests (3 tests)

Gated on `OPENAI_API_KEY`. Tests skip gracefully if absent. Cost per run: ~$0.01.

| Test | Local Calls | Cloud LLM Calls | What It Validates |
|------|-------------|-----------------|-------------------|
| Tool select → cloud synthesis | 1 | 1 | Orchestrator selects tool, generator produces actionable briefing |
| Data sovereignty verification | 1 | 1 | Generator messages contain zero tool schema keywords; tool definitions stay local |
| Multi-step + cloud synthesis | 2 | 1 | Two-step orchestrator loop, generator synthesizes executive briefing from all results |

---

## Lane 3: Harness Tests (`npm run test:harness`)

Runs `tests/harness-check.ts` via `npx tsx` — not Vitest. Spawns real MCP servers over all three transport profiles (stdio, HTTP, API), executes 15 assertions per profile (45 total), calls `process.exit()` on completion.

- Expected: 45/45 assertions pass, under 30 seconds

---

## Hardware Requirements

| Configuration | RAM | Recommended Model | Expected Performance |
|---------------|-----|-------------------|---------------------|
| Minimum | 16GB | llama3.1:8b (Q4) | ~40 t/s — tool routing functional |
| Recommended | 24GB | llama3.1:8b or 14B | ~30-42 t/s — comfortable with IDE + Docker |
| Power | 32GB+ | 70B quantized | ~15 t/s — near cloud-quality responses |

Apple Silicon (M1–M4) and NVIDIA GPUs (RTX 3060+) supported via llama.cpp. **Apple M5:** Ollama is incompatible — use llama.cpp directly.

---

## Execution Sequence

### Pre-flight

1. Verify inference backend is running: `curl http://localhost:8080/v1/models`
2. Verify model is loaded (response should list at least one model)
3. Verify Node.js >= 20: `node --version`
4. Install dependencies: `npm ci`

### Run

```bash
# Lane 1 — Unit tests (no dependencies)
npm test

# Lane 2 — Integration (requires local inference backend)
npm run test:integration

# Lane 3 — Harness (standalone transport check)
npm run test:harness

# Full hybrid (if OpenAI key available)
OPENAI_API_KEY=sk-... npm run test:integration
```

### Capture

Record the following per run:

- Hardware (chip, memory, GPU/CPU)
- Inference backend and model (e.g., llama.cpp + llama-3.1-8b-instruct Q4_K_M)
- Node.js version
- `npm test` result (files, tests, duration)
- `npm run test:integration` result (files, tests, duration, per-test latency)
- `npm run test:harness` result (assertions, duration)
- Any failures with full error output
- Tokens/sec from throughput tests

---

## Failure Triage

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Tool-call tests fail, throughput tests pass | Model does not support structured tool calls | Use `--jinja` flag with llama.cpp or switch to functionary-small-v3.2 |
| No inference backend available | No server running on probed ports | Start llama-server on port 8080 or gateway on port 8000 |
| Connection refused on all ports | Backend not started or wrong port | `curl http://localhost:8080/v1/models` to verify |
| Metal crash on M5 Mac | Ollama M5 incompatibility | Do not use Ollama on M5. Use llama.cpp directly |
| Hybrid tests skip | No `OPENAI_API_KEY` | Set env var or accept skip |
| Vitest hangs on collection | Integration tests included in main config | Verify `tests/integration/` excluded from main vitest.config |

---

## Known Issues

### Llama 3.1 8B tool-calling through llama.cpp

Llama 3.1 8B Instruct does not produce structured tool calls through llama.cpp's OpenAI-compatible `/v1/chat/completions` endpoint by default. The SDK works correctly — it sends tool schemas, logs the response, and falls back to text synthesis when no tool calls are returned. The model does not activate tool-calling behavior without specific llama.cpp configuration.

**Workaround:** Start llama-server with the `--jinja` flag:

```bash
llama-server --model llama-3.1-8b-instruct.Q4_K_M.gguf --port 8080 --jinja
```

**Alternative:** Use `functionary-small-v3.2`, a model purpose-built for structured tool call output.

This is a model/runtime compatibility issue, not an SDK bug.

---

## Contributing Test Results

If you run this suite on hardware not yet documented, please open a GitHub Discussion with your results. We're building a hardware compatibility matrix from community-contributed benchmarks.

---

*Epic AI® is a registered trademark of protectNIL Inc. (U.S. Reg. No. 7,748,019)*
