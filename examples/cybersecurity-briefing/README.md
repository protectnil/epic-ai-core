# Cybersecurity Briefing

Full threat briefing with local SLM orchestrator (llama.cpp), tiered autonomy, and streaming events.

## Prerequisites

- llama.cpp running with a model loaded (`llama-server --model <path-to-gguf> --port 8080 --jinja`)

## Run

```bash
npx tsx index.ts
```

## What it does

1. Creates an agent with a local SLM as orchestrator (routes tools via llama.cpp on port 8080)
2. Configures tiered autonomy — read/query is auto, contain is escalate, delete/revoke requires approval
3. Streams the briefing in real time — plan, action, narrative, and done events
4. Prints each stream event as it arrives
5. Shows pending approvals after the briefing completes
