# Harness Overview

The harness is a deterministic verification system for the Epic AI orchestrator.

It must prove that the runtime can handle three distinct seams:

- `stdio` MCP transport
- `streamable-http` MCP transport
- direct vendor API integration

The harness is **not** a fake Splunk or fake Qualys platform. It is a controlled test system with a shared tool contract and a reusable scenario corpus.

## Goals

- Exercise the real orchestrator loop, not a stubbed shortcut.
- Keep inputs deterministic so failures are reproducible.
- Validate stream ordering and payload semantics.
- Validate sanitization of prompt-boundary data.
- Validate retry and state isolation behavior.
- Validate one real vendor API path separately from MCP transport behavior.

## Public Surface

The intended public-facing entrypoint is an importable helper surface, with optional CLI support.

Recommended shape:

- `@epicai/core/harness`
- `createHarnessRunner({ profile })`
- `HarnessProfile.Stdio`
- `HarnessProfile.Http`
- `HarnessProfile.Api`

## Separation Of Concerns

- The **scenario corpus** defines what gets tested.
- The **shared assertion runner** defines how scenarios are executed and checked.
- The **backends** define how the test data is served.

That separation is required so the same assertions can run against all three profiles.

