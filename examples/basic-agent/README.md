# Basic Agent

Minimal Epic AI® agent — no external dependencies, no Ollama required. Runs entirely in-process with a mock LLM and in-memory audit trail.

## Run

```bash
npx tsx index.ts
```

## What it does

1. Creates an agent with a custom mock LLM (no Ollama or OpenAI needed)
2. Connects to a mock MCP server with simulated threat data
3. Runs a query and prints the response
4. Verifies the audit trail integrity
5. Exports the audit trail as JSON
