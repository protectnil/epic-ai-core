# Harness Backends

The harness must expose three backends under one shared runner.

## 1. STDIO Backend

- MCP server over `stdio`
- Local child process
- No external network dependency
- Primary target for:
  - planner behavior
  - autonomy behavior
  - event streaming
  - sanitization
  - audit logging
  - retry handling

## 2. HTTP Backend

- MCP server over `streamable-http`
- Local child process
- Binds to `127.0.0.1` on an ephemeral port
- Requires a known auth token or header
- Primary target for:
  - request auth
  - transport startup
  - readiness checks
  - timeout handling
  - reconnect behavior

## 3. API Backend

- Direct vendor integration backend
- Not MCP
- Uses a real vendor HTTP shape
- Primary target for:
  - auth
  - pagination
  - rate limiting
  - malformed responses
  - request/response payload drift

## Canonical Tool Contract

Each backend must expose the same logical tool contract:

- `echo`
- `sleep`
- `fail`
- `malformed`
- `approval_target`
- `multi_step`
- `stateful_counter`
- `ping`

The API backend may also expose vendor-specific endpoints, but the canonical tools must still exist so the shared runner can execute the same scenarios.

## Backend Rules

- No randomness unless seeded.
- No hidden state except the counter tool.
- Every backend must support start, stop, reset, health check, tool discovery, and tool invocation.
- The shared runner must be able to swap the backend without changing scenario logic.

