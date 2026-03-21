# Cybersecurity Briefing

Full threat briefing with Ollama orchestrator, tiered autonomy, and streaming events. Requires Ollama running locally with Mistral 7B.

## Prerequisites

- Ollama running (`ollama serve`)
- Mistral 7B pulled (`ollama pull mistral:7b`)

## Run

```bash
npx tsx index.ts
```

## What it does

1. Creates an agent with Ollama as orchestrator (local SLM routes tools)
2. Configures tiered autonomy — read/query is auto, contain is escalate, delete/revoke requires approval
3. Streams the briefing in real time — plan, action, narrative, and done events
4. Prints each stream event as it arrives
5. Shows pending approvals after the briefing completes
