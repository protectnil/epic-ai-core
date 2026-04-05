# Harness Acceptance Criteria

The harness is complete when all of the following are true:

## Functional

- The same scenario corpus runs against `stdio`, `http`, and `api`.
- The same shared runner verifies all three profiles.
- The canonical tools exist in every backend.
- The orchestrator loop is exercised through the real agent lifecycle.

## Behavioral

- `plan` appears before tool execution.
- `approval-needed` appears before a denied or paused action.
- `action` and `result` appear in the correct order.
- `narrative` appears after tool results when synthesis is expected.
- `done` is the final event.
- Sanitization is verified for retrieval, memory, and tool output.

## Reliability

- STDIO and HTTP profiles run locally without external accounts.
- API profile uses one real vendor credential or sandbox.
- Timeouts are bounded.
- State resets between runs.
- Retry attempts do not leak state.

## Maintainability

- The scenario corpus is versioned.
- The runner is reusable.
- Backend-specific logic stays in backend files.
- Scenario assertions stay in the shared runner.

## Non-Goals

- No fake Splunk clone.
- No fake Qualys platform.
- No three unrelated harness systems.
- No public SDK surface that hides the test intent.

