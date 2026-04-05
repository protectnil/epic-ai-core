# Adapter Development Protocol

**Package:** `@epicai/legion`
**License:** Apache 2.0
**Applies to:** All adapters in `src/mcp-servers/`, all contributors (protectNIL, vendor, community)

---

## Purpose

This document is the mandatory standard for building, reviewing, and shipping adapters in the Epic AI Intelligence Platform. Every adapter in the SDK — whether built by protectNIL, contributed by a vendor, or submitted by the community — follows this protocol. No exceptions.

An adapter connects the Epic AI orchestrator to a vendor's API. When a user asks "show me open PagerDuty incidents," the orchestrator selects the `list_incidents` tool from the PagerDuty adapter, calls it, and uses the result in its response. The adapter is the bridge between the AI and the vendor's data.

---

## Decision: REST Wrapper vs. Vendor MCP

Before writing any code, determine the integration strategy.

### When to connect to a vendor's official MCP server

Use the vendor's MCP server when ALL of these are true:

1. The vendor publishes an official MCP server (GitHub repo, npm package, or documented endpoint)
2. The MCP server is actively maintained (commits within the last 6 months)
3. The MCP server exposes 10+ tools (full API surface coverage)
4. The MCP server supports stdio or streamable-HTTP transport

**If the vendor has an official MCP server, document it in the adapter file header.** Even if you build a REST wrapper (see below), the MCP server must be documented so users know it exists and future contributors can evaluate migration.

### When to build a REST API wrapper

Build a REST wrapper when ANY of these are true:

1. The vendor has no official MCP server
2. The vendor's MCP server is abandoned (no commits in 6+ months)
3. The vendor's MCP server covers fewer tools than our adapter would
4. The customer requires air-gapped deployment (no npm install at runtime)
5. The vendor's MCP server has unresolved security issues

### When to ship both

When the vendor's MCP server and REST API have **non-overlapping tools** — each exposes operations the other doesn't — ship both to achieve full coverage. The adapter catalog lists one entry per vendor with `type: 'both'`. The FederationManager routes each tool call to the appropriate transport:

- Tools that exist in the vendor MCP are routed through the MCP connection
- Tools that only exist in the REST API are routed through our REST adapter
- For tools that exist in both (shared), the MCP connection takes priority

The REST adapter file header must document which tools come from each source. This is NOT the same as running two competing integrations — it is a single logical adapter with unified tool routing across two transports.

If the vendor's MCP and API are strict supersets/subsets of each other (one covers everything the other does), use only the richer one — do not ship both.

### Documentation requirement

Every adapter file must include a header comment block documenting the vendor's MCP status. This block goes below the copyright JSDoc comment and above the import statements:

```typescript
/**
 * {Vendor Name} MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/vendor/mcp-server-name — transport: stdio, auth: API token
// Our adapter covers: 8 tools (core operations). Vendor MCP covers: 60+ tools (full API).
// Recommendation: Use vendor MCP for full coverage. Use this adapter for air-gapped deployments.
//
// Base URL: https://api.vendor.com
// Auth: OAuth2 client credentials
// Docs: https://developer.vendor.com/api/
// Rate limits: 120 req/min per OAuth2 token
```

Or if no MCP exists:

```typescript
// Official MCP: None found as of [date]
// No official [Vendor] MCP server was found on GitHub.
```

> **Note:** The bundled `crowdstrike.ts` adapter predates this protocol and uses a condensed single-line header. New adapters and updated adapters must use the full multi-line MCP-status block shown above.

---

## Tool Count: Ship Complete, Filter Smart

### Do not artificially limit tool count

An adapter should expose every operation a developer would reasonably need. If Salesforce has 30 operations, expose 30. If CrowdStrike has 20, expose 20. Do not cap at 5 or 8.

The orchestrator's three-tier tool resolution handles selection:

1. **Tier 1 — Domain Classifier** narrows 4,000+ adapters to the ~5-20 most relevant
2. **Tier 2 — BM25 Pre-Filter** narrows those adapters' tools to the top 8 (configurable)
3. **Tier 3 — Orchestrator SLM** sees only those 8 tools and picks the right one

The adapter's job is completeness. The pre-filter's job is selection. Do not confuse them.

### Tool tiers

Tool tiers are a logical concept used by the orchestration layer — they are **not a field on `ToolDefinition`** (which only has `name`, `description`, and `inputSchema`). Tier assignment is managed by the FederationManager at registration time based on the adapter's catalog metadata and the per-query BM25 promotion step.

| Tier | Behavior | Use case |
|---|---|---|
| `orchestrated` | Participates in three-tier resolution. SLM can select it. | Common operations: list, get, search, create, update |
| `direct` | Registered in ToolRegistry but NOT sent to SLM. Callable by explicit name only. | Rare/dangerous operations: bulk delete, schema migration, admin config |

**Default tier:** All tools default to `orchestrated`. Tools are marked `direct` only for tools that are rarely needed or could cause damage if selected by a small model with imperfect judgment — this designation is expressed in catalog metadata, not in `ToolDefinition`.

**Vendor MCP tools:** When connecting a vendor MCP server with 60+ tools, all tools register as `direct` by default. The DomainClassifier + BM25 promote the most relevant to `orchestrated` per query. This prevents a 60-tool vendor MCP from flooding the SLM's context.

---

## Adapter File Structure

Every REST API adapter is a single TypeScript file in `src/mcp-servers/`. One file per vendor.

### File naming

```
src/mcp-servers/{vendor-name}.ts
```

Lowercase, hyphenated. Match the vendor's commonly used short name:
- `crowdstrike.ts` (not `crowd-strike.ts` or `CrowdStrike.ts`)
- `palo-alto.ts` (not `paloalto.ts`)
- `google-cloud.ts` (not `gcp.ts`)

### File header

```typescript
/**
 * {Vendor Name} MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: {URL or "None found as of YYYY-MM"}
// {Additional MCP notes: transport, auth, tool count, recommendation}
//
// Base URL: {vendor API base URL}
// Auth: {auth mechanism — Bearer token, Basic auth, OAuth2, API key header, HMAC, etc.}
// Docs: {link to vendor API documentation}
// Rate limits: {documented rate limits, if known}
```

### Import

Every adapter imports from the local types file only:

```typescript
import { ToolDefinition, ToolResult } from './types.js';
```

No other imports except Node.js built-ins (`crypto` for HMAC/SigV4 signing). No npm packages. No framework imports. No SDK imports. The adapter is self-contained.

### ToolResult shapes

There are two `ToolResult` definitions in the codebase. REST API adapters (all files in `src/mcp-servers/`) use the **adapter-level** shape from `src/mcp-servers/types.ts`:

```typescript
interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError: boolean;
}
```

This is the shape every adapter's `callTool()` must return. The content must be an array with at least one `{ type: 'text', text: string }` element.

The **SDK-level** `ToolResult` in `src/types/index.ts` is a different type used by the FederationManager after it executes a tool call — it adds routing metadata (`server`, `tool`, `durationMs`) that the federation layer attaches. Adapters never construct or return the SDK-level shape directly.

### EpicAIAdapter vs. VendorMCPServer pattern

The codebase has two adapter patterns:

| Pattern | File pattern | Interface | Use case |
|---|---|---|---|
| **VendorMCPServer** | `src/mcp-servers/{vendor}.ts` | No base class. Self-contained class with `get tools()` and `callTool()`. | REST API wrappers — the pattern described in this document. |
| **EpicAIAdapter** | `src/federation/adapters/` | Abstract class from `src/federation/adapters/base.ts`. | V2 adapter contract for federation-aware adapters that optionally implement `connect()`, `disconnect()`, and `ping()`. Supports lazy connection pool and health tracking. |

When writing a new REST API adapter, use the **VendorMCPServer** pattern. The `EpicAIAdapter` base class is for advanced federation adapters that need lifecycle management — not for standard REST wrappers.

### Config interface

```typescript
interface {Vendor}Config {
  apiToken: string;         // or clientId/clientSecret, apiKey, etc.
  baseUrl?: string;         // optional override, always has a default
}
```

Name the interface `{VendorName}Config`. Include only what's needed for authentication and endpoint configuration. Always provide a sensible default for `baseUrl`.

### Class

```typescript
export class {VendorName}MCPServer {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: {Vendor}Config) {
    this.token = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.vendor.com';
  }

  get tools(): ToolDefinition[] {
    return [
      // ... tool definitions
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'tool_name':
          return this.toolName(args);
        // ... one case per tool
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // Private methods — one per tool
  private async toolName(args: Record<string, unknown>): Promise<ToolResult> {
    // ...
  }
}
```

**Class naming:** `{VendorName}MCPServer` — PascalCase vendor name, always ends with `MCPServer`.

**Constructor:** Store config values. Do not make network calls in the constructor.

**`get tools()`:** Returns a static array of `ToolDefinition` objects. No async. No network calls. This is called at registration time and must be fast.

**`callTool()`:** Switch dispatch on tool name. Each case delegates to a private method. The default case returns an error `ToolResult` — never throws.

---

## Tool Definition Standard

```typescript
{
  name: 'list_incidents',
  description: 'List incidents with optional filters for status, severity, and date range',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Filter by status: open, closed, resolved (default: open)',
      },
      severity: {
        type: 'string',
        description: 'Filter by severity: critical, high, medium, low',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return (default: 50, max: 200)',
      },
    },
  },
}
```

### Naming conventions

| Pattern | Use | Example |
|---|---|---|
| `list_{noun}` | Paginated list with optional filters | `list_incidents`, `list_channels` |
| `get_{noun}` | Single item by ID | `get_incident`, `get_user` |
| `search_{noun}` | Full-text or complex query search | `search_hosts`, `search_logs` |
| `create_{noun}` | Create a new resource | `create_ticket`, `create_channel` |
| `update_{noun}` | Modify an existing resource | `update_incident`, `update_user` |
| `delete_{noun}` | Remove a resource | `delete_ticket` |
| `{verb}_{noun}` | Domain-specific action | `quarantine_host`, `rotate_secret`, `acknowledge_alert` |

### Description quality

The description is what the BM25 pre-filter and the SLM use to decide relevance. A bad description means the tool never gets selected.

**Good:** `List incidents with optional filters for status, severity, and date range`
**Bad:** `List incidents`
**Terrible:** `incidents`

Include: what it does, what filters/options are available, what it returns. The description should be 10-30 words. It's a tool selection hint, not API documentation.

### inputSchema quality

Every property must have a `type` and a `description`. The description should include valid values, defaults, and constraints. The SLM uses these to construct the arguments object.

**Good:**
```typescript
status: {
  type: 'string',
  description: 'Filter by status: open, closed, resolved (default: open)',
}
```

**Bad:**
```typescript
status: { type: 'string' }
```

### Required fields

Use `required` sparingly. If a tool works without a parameter (using a sensible default), don't require it. The SLM may omit optional parameters — that should be fine.

```typescript
inputSchema: {
  type: 'object',
  properties: { ... },
  required: ['incident_id'],  // only fields that truly cannot be defaulted
}
```

---

## Tool Implementation Standard

### HTTP calls

Use `fetch()`. No Axios, no Got, no other HTTP library.

```typescript
private async listIncidents(args: Record<string, unknown>): Promise<ToolResult> {
  const status = (args.status as string) ?? 'open';
  const limit = (args.limit as number) ?? 50;

  const response = await fetch(
    `${this.baseUrl}/v1/incidents?status=${status}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    return {
      content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
      isError: true,
    };
  }

  const data = await response.json();
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    isError: false,
  };
}
```

### Error handling

`callTool()` must never propagate an exception to its caller. Always return a `ToolResult` with `isError: true`. The orchestrator handles errors through the normal observe loop — it does not catch exceptions from tool calls.

```typescript
// CORRECT
return {
  content: [{ type: 'text', text: `API error: ${response.status}` }],
  isError: true,
};

// WRONG — never let an exception escape callTool()
throw new Error(`API error: ${response.status}`);
```

**Private helper methods** (e.g., `getOrRefreshToken()`) may throw internally. The rule is that `callTool()` must catch all exceptions from helpers and convert them to `ToolResult` before returning. Wrap the entire `callTool()` body in a top-level try/catch:

```typescript
async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  try {
    // ... switch dispatch and helper calls
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
```

This pattern — helper throws, `callTool()` catches — is the correct design. The OAuth2 `getOrRefreshToken()` helper in this document throws on token failure; the wrapping `callTool()` try/catch converts it to a `ToolResult` before it leaves the adapter.

### Authentication patterns

| Auth type | Implementation |
|---|---|
| Bearer token | `Authorization: Bearer ${this.token}` |
| API key header | `X-Api-Key: ${this.apiKey}` or vendor-specific header name |
| Basic auth | `Authorization: Basic ${btoa(user + ':' + pass)}` |
| OAuth2 client credentials | Implement `getOrRefreshToken()` private method. Cache token. Refresh on 401. |
| HMAC signature | Import `createHmac` from `node:crypto`. Sign per vendor spec. |
| AWS SigV4 | Import from `node:crypto`. Follow AWS SigV4 signing process. |

### OAuth2 pattern

For vendors requiring OAuth2 client credentials flow:

```typescript
private bearerToken: string | null = null;
private tokenExpiry: number = 0;

private async getOrRefreshToken(): Promise<string> {
  const now = Date.now();
  if (this.bearerToken && this.tokenExpiry > now) {
    return this.bearerToken;
  }

  const response = await fetch(`${this.baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`OAuth2 token request failed: ${response.statusText}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  this.bearerToken = data.access_token;
  this.tokenExpiry = now + (data.expires_in - 60) * 1000;  // refresh 60s early
  return this.bearerToken;
}
```

### Response formatting

Always return JSON-stringified data in the `ToolResult.content` text field. The orchestrator and generator LLM consume this as structured text.

```typescript
return {
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  isError: false,
};
```

For large responses, truncate to prevent context window bloat:

```typescript
const text = JSON.stringify(data, null, 2);
const truncated = text.length > 10_000
  ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
  : text;

return {
  content: [{ type: 'text', text: truncated }],
  isError: false,
};
```

---

## Adapter Catalog Entry

Every adapter must be discoverable by the three-tier tool resolution system. This requires a catalog entry.

### How catalog entries are generated

The build script `scripts/generate-catalog.ts` reads each compiled adapter from `dist/mcp-servers/`, instantiates the class with stub config, reads the `tools` getter, and generates the catalog entry automatically. No manual `static catalog()` method is required.

For adapters that want to provide explicit metadata (category, keywords, description), implement the optional static method:

```typescript
export class PagerDutyMCPServer {
  /** Optional: explicit catalog metadata. If omitted, inferred from class name + tools. */
  static catalog(): AdapterCatalogEntry {
    return {
      name: 'pagerduty',
      displayName: 'PagerDuty',
      version: '1.0.0',
      category: 'observability',
      keywords: ['incident', 'alert', 'on-call', 'escalation', 'page', 'acknowledge'],
      toolNames: ['list_incidents', 'get_incident', 'acknowledge_incident', 'resolve_incident', 'list_oncalls'],
      description: 'Incident management: create, triage, acknowledge, and resolve incidents. Query on-call schedules and escalation policies.',
      author: 'protectnil',
    };
  }

  // ... rest of class
}
```

When `static catalog()` is present, the generator uses it directly. When absent, the generator infers:
- `name` from the filename (e.g., `pagerduty.ts` → `pagerduty`)
- `displayName` from the class name (e.g., `PagerDutyMCPServer` → `PagerDuty`)
- `version` defaults to `'1.0.0'`
- `toolNames` from the `tools` getter
- `keywords` from tool names + descriptions (tokenized, stopwords removed)
- `category` defaults to `misc` (maintainers should add `static catalog()` for correct categorization)
- `description` defaults to an empty string (maintainers should provide one via `static catalog()`)
- `author` defaults to `'community'`

> **Note:** All eight fields of `AdapterCatalogEntry` — `name`, `displayName`, `version`, `category`, `keywords`, `toolNames`, `description`, and `author` — are required by the type. When relying on inference, `version`, `description`, and `author` will receive the defaults above, which are suitable for development but should be overridden in `static catalog()` before shipping.

### Category taxonomy

Use one of these categories. Do not invent new ones without updating the `AdapterCategory` type in `src/federation/AdapterCatalog.ts`.

| Category | Vendors |
|---|---|
| `cybersecurity` | CrowdStrike, Splunk, Palo Alto, SentinelOne, etc. |
| `cloud` | AWS, Azure, GCP, DigitalOcean, Cloudflare |
| `devops` | Kubernetes, Terraform, ArgoCD, CircleCI, Jenkins |
| `data` | Snowflake, BigQuery, PostgreSQL, MongoDB, Redis |
| `collaboration` | Slack, Microsoft Teams, Zoom, Discord |
| `crm` | Salesforce, HubSpot, Pipedrive, Zoho |
| `commerce` | Stripe, Shopify, PayPal, Square |
| `observability` | Datadog, Grafana, Sentry, New Relic, Prometheus |
| `communication` | Gmail, Twilio, SendGrid, Mailchimp |
| `ai-ml` | OpenAI, Anthropic, Hugging Face, Cohere |
| `identity` | Okta, Auth0, CyberArk, BeyondTrust |
| `compliance` | Drata, Vanta, ServiceNow GRC, OneTrust |
| `finance` | QuickBooks, Xero, Stripe Billing, Zuora |
| `social` | Twitter/X, LinkedIn, Reddit, YouTube |
| `misc` | Everything else — file under misc, propose a new category if 3+ adapters share a theme |

### Keywords

Keywords drive the Tier 1 domain classifier. Include:
- The vendor name and common abbreviations
- The product category
- Key actions the adapter performs
- Industry terms users would search for

**Good keywords:** `['pagerduty', 'incident', 'alert', 'on-call', 'escalation', 'page', 'acknowledge', 'resolve']`
**Bad keywords:** `['api', 'tool', 'integration']` — too generic, matches everything

---

## Testing

### Required tests

Every adapter must have a test that validates:

1. The class instantiates without error
2. `get tools()` returns a non-empty array
3. Every tool has `name`, `description`, and `inputSchema`
4. `callTool()` with an unknown tool name returns `isError: true` (not throw)

### Test location

Tests live in `tests/adapters/{vendor-name}.test.ts`. Use vitest.

### Test pattern

```typescript
import { describe, it, expect } from 'vitest';
import { PagerDutyMCPServer } from '../../src/mcp-servers/pagerduty.js';

describe('PagerDutyMCPServer', () => {
  const adapter = new PagerDutyMCPServer({ apiToken: 'test-token' });

  it('instantiates', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });
});
```

### Live sandbox tests (optional)

If the vendor provides a free sandbox or test account, write integration tests in `tests/adapters/{vendor-name}.integration.test.ts`. These are NOT run in CI — they require credentials and network access. They are run manually during adapter validation.

---

## Contribution Workflow

### For protectNIL engineers

1. Check the vendor's MCP status. Document in file header.
2. Research the vendor API: auth, base URL, endpoints, rate limits.
3. Write `docs/adapters/{vendor}/spec.md` — API surface, auth pattern, rate limits.
4. Implement adapter in `src/mcp-servers/{vendor}.ts`.
5. Write test in `tests/adapters/{vendor}.test.ts`.
6. Run: `npx vitest run {vendor}` — all tests pass.
7. Run: `npm run build` — zero new TypeScript errors.
8. Code review.
9. Commit and push.

### For community contributors

1. Open a GitHub issue proposing the adapter. Tag: `adapter-request`.
2. Get approval from a maintainer (confirms no duplicate, vendor is valid).
3. Fork the repo. Create branch: `adapter/{vendor-name}`.
4. Follow steps 1-7 above.
5. Submit PR. CI runs lint, typecheck, and tests.
6. Code review for: auth correctness, error handling, API path accuracy, tool description quality.
7. Maintainer merges. Catalog auto-regenerated on next build.

### For vendor contributors

Same as community, but:
- Use your official API documentation (not reverse-engineered).
- Attest API path accuracy in the PR description.
- Your adapter is labeled `author: 'vendor'` in the catalog — higher trust tier.

---

## Quality Gate (Review Checklist)

Every adapter PR is reviewed against this checklist:

- [ ] File header documents MCP server availability (URL or "None found")
- [ ] Auth pattern matches vendor documentation (not guessed)
- [ ] Base URL is correct (verified against vendor docs)
- [ ] API paths are correct (verified against vendor docs)
- [ ] OAuth2 token refresh implements 60-second early renewal
- [ ] `callTool()` has a top-level try/catch that converts all exceptions to `ToolResult`
- [ ] Every `callTool` case returns `ToolResult` — no exceptions escape the method
- [ ] Unknown tool case returns `isError: true`
- [ ] Response data is JSON-stringified in `content[0].text`
- [ ] Large responses are truncated at 10KB
- [ ] Tool descriptions are 10-30 words with actionable detail
- [ ] `inputSchema` properties have `type` and `description`
- [ ] `required` array only includes fields that cannot be defaulted
- [ ] Test file exists and all 4 required tests pass
- [ ] Tool names follow naming convention (`verb_noun`)
- [ ] No npm dependencies beyond `./types.js` and `node:crypto`
- [ ] No hardcoded credentials, URLs, or test data in source
- [ ] Rate limit documentation in header comment (if known)

---

## Anti-Patterns

| Do NOT | Do instead |
|---|---|
| Throw exceptions from `callTool()` | Return `{ content: [...], isError: true }` |
| Import npm packages | Use `fetch()` and `node:crypto` only |
| Hardcode API keys in source | Accept via constructor config |
| Cap tools at 5-8 artificially | Ship complete coverage; let the pre-filter select |
| Guess API paths from training data | Read the vendor's actual API documentation |
| Skip the MCP documentation header | Always document, even if "None found" |
| Use `axios`, `got`, or `node-fetch` | Use native `fetch()` (Node 20+) |
| Create helper utilities across adapters | Each adapter is self-contained, one file |
| Return raw HTML or XML in tool results | Parse to JSON, stringify |
| Ignore pagination | Support `cursor`/`offset`/`page` parameters |
| Ship without tests | Minimum 4 tests per adapter (see Testing section) |

---

*Epic AI® is a registered trademark of protectNIL Inc. (U.S. Trademark Registration No. 7,748,019).*
