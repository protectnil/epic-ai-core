# Epic AI Harness

This directory defines the test harness that Claude should implement for `@epicai/core`.

The harness is split into three backend profiles and one shared runner:

- `stdio` MCP backend
- `http` MCP backend
- direct `api` backend
- shared scenario corpus and assertion runner

The goal is to verify the actual orchestrator behavior end to end:

- planning
- autonomy and approval gating
- tool execution
- streaming order
- sanitization
- retry behavior
- audit behavior
- state isolation

## Source Of Truth

- Harness implementation: `src/harness/`
- Harness tests: `tests/harness/`
- This spec: `docs/harness/`

## Reading Order

1. [Overview](./overview.md)
2. [Backends](./backends.md)
3. [Scenario Corpus](./scenario-corpus.md)
4. [Shared Assertion Runner](./shared-assertion-runner.md)
5. [Acceptance Criteria](./acceptance-criteria.md)

