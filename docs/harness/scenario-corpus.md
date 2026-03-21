# Scenario Corpus

The scenario corpus is the fixed set of inputs that exercise the orchestrator.

Each scenario defines:

- query text
- optional `userId`
- backend profile
- tool fixtures
- retrieval fixtures
- memory fixtures
- autonomy rules and policies
- scripted planner behavior
- scripted synthesis behavior
- expected event order
- expected tool calls
- expected final result

The corpus must be versioned and deterministic.

## Required Scenarios

### `text_only_no_tools`

- The planner returns no tool calls.
- Expected events:
  - `narrative`
  - `done`
- Expected counts:
  - `loopIterations = 1`
  - `actionsExecuted = 0`
  - `actionsPending = 0`

### `single_auto_tool`

- The planner returns one auto-approved tool call.
- Expected events:
  - `plan`
  - `action`
  - `result`
  - `narrative`
  - `done`
- Expected:
  - one audit record
  - tool result summarized into synthesis

### `approval_gate`

- The planner returns one approve-tier tool call.
- Expected events:
  - `plan`
  - `approval-needed`
  - `done`
- Expected:
  - `actionsExecuted = 0`
  - `actionsPending = 1`
  - no tool result event

### `multi_step_iteration`

- The planner returns a tool on the first turn and stops on the second.
- Expected:
  - two planner turns
  - correct `loopIterations`
  - terminal `done`

### `retrieval_prompt_sanitization`

- Retrieved documents contain prompt-injection text.
- Expected:
  - injected lines are stripped before reaching the planner
  - retrieved context is wrapped in `<DATA_CONTEXT>`

### `memory_prompt_sanitization`

- Stored memories contain prompt-injection text.
- Expected:
  - injected lines are stripped before reaching the planner
  - memory context is wrapped in `<DATA_CONTEXT>`

### `tool_result_prompt_sanitization`

- A tool returns injection-looking text.
- Expected:
  - tool output is sanitized before it is appended back into planner history
  - the same sanitized output is used in synthesis

### `state_reset_between_runs`

- Run the same scenario twice on the same backend.
- Expected:
  - state does not leak between runs
  - counters reset
  - pending approvals remain run-local

### `prefixed_tool_matching`

- Use prefixed tool names such as `vault:read` or `splunk:query`.
- Expected:
  - autonomy still matches on suffix rules
  - the original prefixed action name is preserved

### `max_iterations_guard`

- Planner keeps requesting tools until the loop cap.
- Expected:
  - the orchestrator stops at `maxIterations`
  - no infinite loop

## Fixture Requirements

The corpus must include:

- one injected retrieved document
- one injected memory record
- one injected tool output
- one malformed tool response
- one approval-required tool
- one prefixed tool name
- one stateful counter fixture

## Determinism Rules

- Seed value: `1337`
- No use of `Math.random()` in test fixtures
- All timeouts must be bounded
- All expected outputs must be explicit

