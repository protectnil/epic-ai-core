# CLAUDE.md — epic-ai-core (PUBLIC REPO)

## CRITICAL: This is a PUBLIC repository. Every commit message is permanently visible to the world.

## Commit Messages

**One line. No internals. No exceptions.**

- Subject line only, under 80 characters
- No multi-paragraph explanations
- No file paths, line numbers, or function names
- No "round N" or "Codex review" references
- No known-limitation disclosures
- No security architecture details
- No internal process references
- Co-Authored-By trailer is permitted (does not count as a second line)

**Good:**
```
fix: sanitize tool output before synthesis
```

**Bad:**
```
fix(docs): Codex round 5 — planner trust boundary now accurately documented

The guide previously stated tool results re-enter the planner as raw,
unsanitized role:tool messages. This was true in earlier code but is
now wrong — Orchestrator.ts:253-256 sanitizes tool output via
sanitizeInjectedContent() before pushing to planner message history.
```

## General Rules

- Never commit credentials, tokens, API keys, or infrastructure details
- Never commit litigation strategy, legal analysis, or enforcement documents
- Never reference the private `epic-ai` repo, TTAB proceedings, or trademark disputes
- Never reference internal documents, internal repos, or internal communications
- Keep PR descriptions concise — same rules as commit messages
- This is Apache 2.0 open-source code. Write every commit message as if opposing counsel, competitors, and Hacker News will read it. Because they will.

