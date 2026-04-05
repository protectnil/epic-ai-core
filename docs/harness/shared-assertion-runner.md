# Shared Assertion Runner

The shared assertion runner is the engine that executes the scenario corpus against a selected backend profile.

It is responsible for:

- starting the backend
- creating the agent
- injecting fixtures
- running the scenario
- capturing stream events
- capturing planner and synthesis inputs
- capturing audit records
- comparing actual behavior to expected behavior
- stopping and resetting the backend

## Runner Contract

The runner must be backend-agnostic.

It should expose a shape similar to:

```ts
createHarnessRunner({ profile }): HarnessRunner
```

and the runner must support:

- `runScenario(scenario)`
- `runAll()`
- `reset()`

## What The Runner Must Verify

- Tool discovery matches the canonical tool set.
- Stream ordering is correct.
- Approval events occur before execution when required.
- Tool outputs are sanitized before they are reused by the planner.
- Synthesis receives sanitized tool summaries.
- Audit writes happen when tool execution happens.
- State does not leak across repeated runs.
- `done` is terminal and semantically correct.

## What The Runner Must Capture

- ordered stream events
- exact event payloads
- orchestrator LLM messages
- generator LLM messages
- backend tool calls
- audit records
- backend health and cleanup state

## Assertions By Scenario

The runner should compare exact expectations for:

- event order
- event count
- payload fields
- tool names
- tool arguments
- narrative text
- counts like `loopIterations`, `actionsExecuted`, and `actionsPending`

## Error Reporting

Failures must explain:

- which scenario failed
- which backend failed
- which assertion failed
- the actual value
- the expected value

Do not make the runner swallow mismatches.

