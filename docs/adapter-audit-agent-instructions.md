# Adapter Audit & Correction Agent — Instruction Set v1.1

## Mission

You are auditing and correcting Epic AI SDK adapters in
`./src/mcp-servers/`

Each adapter connects the Epic AI orchestrator to a vendor's API.
Your job is to verify that every adapter is CORRECT — correct
endpoints, correct auth, correct HTTP methods, correct tool names,
correct parameters — and that the adapter uses the RICHER integration
(MCP vs REST API), whichever exposes more tools.

You are NOT writing adapters from scratch. You are reading existing
code and verifying it against the vendor's actual documentation.

**BEFORE YOU START:** Read the adapter development protocol at
`./ADAPTER-DEVELOPMENT-PROTOCOL.md`
— every adapter must conform to it. Your audit must verify conformance.

---

## Your Assigned Adapters

You are responsible for these adapters (filenames provided):

```
[LIST OF 20 FILENAMES]
```

Process them one at a time, in order. Steps 2 and 3 (API docs
lookup and MCP server check) are independent research tasks — you
may batch your Tavily calls for efficiency where possible.

---

## Protocol — For Each Adapter, Do All 7 Steps

### Step 1: Read the Adapter Code

Read the full adapter file:
`./src/mcp-servers/{vendor}.ts`

Record:
- Class name
- Base URL used
- Auth mechanism used (Bearer, API key, OAuth2, Basic, HMAC, etc.)
- Every tool name in the `get tools()` array
- Every API endpoint in the private methods (HTTP method + path)
- The MCP header comment (Official MCP line)

### Step 2: Find the Vendor's Actual API Documentation

Use `tavily_search` to find the vendor's official API reference.
Search for: `"{Vendor Name} API reference documentation"`

Then use `tavily_extract` on the actual API docs URL to read it.

You are looking for:
- a) The correct base URL (e.g., `https://api.vendor.com/v2`)
- b) The correct auth mechanism (how does the vendor say to authenticate?)
- c) The full list of API endpoints (every operation the API supports)
- d) The correct HTTP methods for each endpoint
- e) Rate limits (if documented)

**DO NOT use search snippets as truth.** You must extract from the
actual documentation page. If `tavily_extract` fails on the docs URL,
try `tavily_crawl` on the vendor's developer docs domain.

If you cannot find the vendor's API docs after 3 attempts, record
the adapter as `UNVERIFIED — docs not found` and move to the next.

### Step 3: Check if the Vendor Has an MCP Server

Use `tavily_search` to search for:
`"{Vendor Name} MCP server model context protocol"`

Also search all three possible distribution channels:
- `"site:github.com {vendor} mcp server"`
- `"site:npmjs.com {vendor} mcp"` (npm-published MCP servers)
- `"{Vendor Name} MCP server endpoint documentation"` (vendor-hosted)

Record:
- a) Does an **official** MCP server exist? (URL if yes — must be published by the vendor or a recognized maintainer, not a random community fork)
- b) Is it maintained? (last commit date, or last npm publish date)
- c) How many tools does it expose? (check its README, source code, or npm description)
- d) What transport does it use? (stdio, streamable-HTTP, SSE)

If no MCP server exists, record `None found as of [today's date]` and
move on.

### Step 4: Compare — Which Is Richer?

Count the tools/endpoints:
- REST API endpoint count (from Step 2)
- MCP tool count (from Step 3, if exists)
- Our adapter's tool count (from Step 1)

Determine the recommendation using this decision tree:

**Important:** You must record the EXACT TOOL/ENDPOINT NAMES from
both sides — not just counts. The names are stored in the database
for coverage gap analysis.

**Collect three lists of names:**
1. **Vendor API endpoints** — every operation name from their REST API docs
2. **Vendor MCP tools** — every tool name from their MCP server (if exists)
3. **Our adapter tools** — every tool name from our `get tools()` array

Then compute the overlap:
- **Shared** — tools that appear in both MCP and API (same operation, different transport)
- **MCP-only** — tools the MCP has that the API doesn't expose
- **API-only** — endpoints the API has that the MCP doesn't cover
- **Ours-only** — tools we have that don't map to either source (likely fabricated)

**Decision tree:**

**If the vendor has an official MCP server**, evaluate it against
ALL FOUR criteria from the protocol (ADAPTER-DEVELOPMENT-PROTOCOL.md
lines 23-28):
1. The vendor publishes an official MCP server
2. The MCP server is actively maintained (commits within 6 months)
3. The MCP server exposes 10+ tools
4. The MCP server supports stdio or streamable-HTTP transport

Then compare the tool/endpoint NAMES, not just counts:

If no MCP server exists:
→ `use-rest-api`

If MCP fails ANY of the four criteria:
→ `use-rest-api` (document the MCP in the header with the reason,
e.g., "unmaintained since 2024-08" or "only 4 tools")

If MCP meets all four criteria AND the MCP is a **strict superset**
of the API (MCP covers everything the API does, plus more, and
the API has ZERO unique endpoints):
→ `use-vendor-mcp`

If MCP meets all four criteria AND the API is a **strict superset**
of the MCP (API covers everything the MCP does, plus more, and
the MCP has ZERO unique tools):
→ `use-rest-api`

If MCP meets all four criteria AND **each side has at least one
unique tool/endpoint the other doesn't cover** — whether they also
share some tools or not (partial overlap OR fully non-overlapping):
→ `use-both` — we need the union for full coverage. Document which
tools come from MCP and which from our REST adapter. The
FederationManager routes shared tools through MCP by default.

Record the decision with all three name lists and reasoning:
```
Vendor REST API: 45 endpoints [list_incidents, get_incident, create_incident, ...]
Vendor MCP: 12 tools [list_incidents, get_incident, search_logs, ...]
  - Shared: 8 tools
  - MCP-only: 4 tools (search_logs, get_dashboard, ...)
  - API-only: 37 endpoints (create_incident, delete_incident, ...)
Our adapter: 18 tools
Decision: use-both — MCP has 4 unique tools not in API, API has 37 unique
endpoints not in MCP. Full coverage requires union.
```

### Step 5: Audit Every Tool and Adapter Structure

#### 5A: Per-Tool Verification

For each tool in our adapter's `get tools()` array, verify:

**a) ENDPOINT:** Does the API path in our code match the vendor docs?
- Check the HTTP method (GET vs POST vs PUT vs PATCH vs DELETE)
- Check the URL path (e.g., `/v2/incidents` vs `/api/v1/incidents`)
- Check query parameters vs request body (GET uses query, POST uses body)

**b) AUTH:** Does our auth implementation match the vendor's requirements?
- Correct header name (`Authorization` vs `X-Api-Key` vs custom)
- Correct auth scheme (`Bearer` vs `Basic` vs token prefix)
- OAuth2 token URL correct?
- If OAuth2: does `getOrRefreshToken()` refresh 60 seconds early?

**c) PARAMETERS:** Do our tool's `inputSchema` parameters match the
vendor's actual API parameters?
- No fabricated parameters (params we invented that the API doesn't support)
- No missing required parameters
- Correct parameter types (string vs number vs boolean)
- `required` array only includes fields that truly cannot be defaulted
- Every property has both `type` and `description`

**d) TOOL NAME:** Does the tool name follow the `verb_noun` convention
and accurately describe what the API endpoint does?

**e) DESCRIPTION QUALITY:** Is the tool description 10-30 words with
actionable detail? (Not just "List incidents" — include what filters
are available and what it returns.)

For each tool, record one of:
- ✅ `PASS` — endpoint, auth, params all verified correct
- ❌ `FAIL` — with specific reason (wrong endpoint, wrong method, etc.)
- ⚠️ `UNVERIFIED` — could not confirm from docs (doc page didn't cover this endpoint)

#### 5B: Adapter Structure Verification (Protocol Quality Gate)

After auditing individual tools, verify the adapter file as a whole
against the protocol's quality gate checklist:

- [ ] `callTool()` has a top-level try/catch that converts ALL exceptions to `ToolResult` — no exceptions escape
- [ ] Every `case` in `callTool()` returns a `ToolResult` — no case falls through or returns void
- [ ] Unknown tool case in `callTool()` returns `{ isError: true }` (does not throw)
- [ ] Response data is JSON-stringified in `content[0].text`
- [ ] Large responses are truncated at 10KB
- [ ] No npm dependencies beyond `./types.js` and `node:crypto`
- [ ] No hardcoded credentials, API keys, or test data in source
- [ ] `encodeURIComponent()` used on all user-supplied URL interpolations
- [ ] File header documents MCP server availability (URL or "None found")
- [ ] Rate limits documented in header comment (if known from Step 2)
- [ ] Test file exists at `tests/adapters/{vendor}.test.ts` with 4 required tests (instantiation, tools non-empty, tool fields valid, unknown-tool error). If missing, create it following the pattern in ADAPTER-DEVELOPMENT-PROTOCOL.md

### Step 6: Fix Every Failure

#### 6A: Fix Tool-Level Failures

For every tool marked ❌ FAIL:
- Fix the endpoint URL to match vendor docs
- Fix the HTTP method to match vendor docs
- Fix the auth mechanism to match vendor docs
- Fix parameters to match vendor docs
- Fix tool descriptions that are too short or vague
- Fix `inputSchema` properties missing `type` or `description`
- Fix `required` arrays that include defaultable fields
- Remove fabricated tools that don't exist in the vendor's API
- Add missing tools that exist in the vendor's API but we didn't
  implement (if the decision in Step 4 is `use-rest-api`)

#### 6B: Fix Adapter Structure Failures

For every structure check that failed in Step 5B:
- Add missing try/catch in `callTool()`
- Add missing unknown-tool default case
- Add 10KB response truncation where missing
- Remove any hardcoded credentials or npm dependencies

Use the Edit tool to make corrections. Do NOT rewrite the entire
file — edit only the broken parts.

#### 6C: Update the File Header

Update the file header comment block to match the protocol format:
```
// Official MCP: {URL or "None found as of [today's date]"} — transport: {type}, auth: {method}
// Our adapter covers: {N} tools. Vendor MCP covers: {N} tools.
// Recommendation: {decision from Step 4 with reasoning}
//
// Base URL: {verified base URL from vendor docs}
// Auth: {verified auth mechanism}
// Docs: {verified docs URL}
// Rate limits: {from vendor docs, or "Not documented"}
```

#### 6D: Actions Based on Decision

**If `use-rest-api`:** Our REST adapter is the primary integration.
Fix all bugs, add missing API endpoints we don't cover yet. Document
the MCP in the header if one exists, but our adapter is authoritative.

**If `use-vendor-mcp`:** The vendor MCP covers everything. Do NOT
delete the existing REST adapter (air-gapped fallback). Instead:
1. Update the header: `// NOTE: Vendor MCP ({URL}) exposes {N} tools — superset of REST API. Prefer vendor MCP.`
2. Still fix any bugs in the REST adapter tools
3. Record the recommendation in Step 7 output

**If `use-both`:** The MCP and API have non-overlapping tools — we
need the union for full coverage. This is the most important case:
1. Update the header to document both sources with tool counts
2. Add a comment listing which tools come from the MCP and which
   from our REST adapter:
   ```
   // Integration: use-both
   // MCP-sourced tools ({N}): [tool_a, tool_b, ...]
   // REST-sourced tools ({N}): [tool_x, tool_y, ...]
   // Combined coverage: {N} tools (MCP: {N} + REST: {N} - shared: {N})
   ```
3. Ensure our REST adapter implements all API-only endpoints
   (the ones the MCP doesn't cover)
4. Fix any bugs in existing REST tools
5. Record the full overlap analysis in Step 7 output

### Step 7: Record Your Findings

After processing each adapter, output a structured record.
**Every name list must contain the actual names, not just counts.**
This data will be stored in MongoDB as a permanent audit record.

```
ADAPTER: {filename}
VENDOR: {vendor name}
DOCS URL: {verified docs URL}
BASE URL: {verified base URL}
AUTH: {verified auth mechanism}
RATE LIMITS: {from docs, or "Not documented"}

MCP SERVER: {URL or "None found as of [today's date]"}
MCP TRANSPORT: {stdio | streamable-HTTP | SSE | N/A}
MCP MAINTAINED: {yes/no + last commit/publish date, or N/A}
MCP OFFICIAL: {yes/no — published by the vendor themselves?}
MCP TOOL NAMES: [{comma-separated list of every tool name, or "N/A"}]
MCP TOOL COUNT: {number or 0}

VENDOR API ENDPOINT NAMES: [{comma-separated list of every endpoint/operation}]
VENDOR API ENDPOINT COUNT: {number}

OUR TOOL NAMES BEFORE: [{comma-separated list}]
OUR TOOL NAMES AFTER: [{comma-separated list}]
OUR TOOL COUNT: {before → after}

OVERLAP ANALYSIS:
  SHARED (in both MCP and API): [{names}]
  MCP-ONLY (in MCP but not API): [{names}]
  API-ONLY (in API but not MCP): [{names}]
  OURS-ONLY (in our adapter but not in either source — likely fabricated): [{names}]

DECISION: {use-rest-api | use-vendor-mcp | use-both}
DECISION REASONING: {1-3 sentences explaining why, referencing the
  name-level overlap analysis. If use-both, state which tools come
  from MCP and which from REST.}

TOOLS PASSED: {count}
TOOLS FAILED: {count}
TOOLS ADDED: {count}
TOOLS REMOVED: {count}
TOOLS UNVERIFIED: {count}
FAILURES: [{tool_name: reason}, ...] (if any)
STRUCTURE CHECKS PASSED: {X of 11}
STATUS: {VERIFIED | PARTIALLY VERIFIED | UNVERIFIED}
CHANGES MADE: {yes/no + summary of edits}
```

**Status definitions:**
- `VERIFIED` — ALL tools confirmed against vendor docs, all structure checks pass, zero UNVERIFIED tools
- `PARTIALLY VERIFIED` — some tools confirmed, some UNVERIFIED (docs incomplete or inaccessible for certain endpoints), but zero known-wrong tools remain
- `UNVERIFIED` — vendor docs not found after 3 attempts, or docs too sparse to confirm any tools; adapter left unchanged

---

## Rules

1. **NEVER GUESS.** If you cannot verify an endpoint from the vendor's
   actual documentation, mark it `UNVERIFIED`. Do not assume it's
   correct because it "looks right."

2. **NEVER FABRICATE.** Do not add tools for API endpoints you haven't
   verified exist. If the vendor docs show 15 endpoints and our
   adapter has 20 tools, 5 of our tools are probably fabricated.
   Find them and remove them.

3. **VENDOR DOCS ARE TRUTH.** Not search snippets. Not your training
   data. Not what "sounds right." The vendor's published API
   reference is the only source of truth for endpoints, methods,
   and parameters.

4. **FIX, DON'T REWRITE.** Edit only the broken parts. Don't
   restructure working code. Don't change formatting. Don't add
   comments to things that are already correct.

5. **FOLLOW THE PROTOCOL FILE.** The adapter must conform to
   `./ADAPTER-DEVELOPMENT-PROTOCOL.md`
   Read it before you start.

6. **TYPESCRIPT MUST COMPILE.** After all edits, the file must still
   compile. Do not introduce type errors. Use:
   `import { ToolDefinition, ToolResult } from './types.js';`
   Do not add new imports beyond `node:crypto`.

7. **encodeURIComponent.** All user-supplied arguments interpolated
   into URL paths or query strings MUST use `encodeURIComponent()`.
   This was already applied in a prior security fix — do not
   remove it.

8. **RESPONSE TRUNCATION.** All tool responses must truncate at 10KB:
   ```typescript
   const text = JSON.stringify(data, null, 2);
   const truncated = text.length > 10_000
     ? text.slice(0, 10_000) + '\n... [truncated]'
     : text;
   ```

9. **USE TODAY'S DATE.** When recording MCP status dates (e.g.,
   "None found as of ..."), use today's actual date. Do not
   hardcode a date from these instructions.

---

## Output

When you have processed all 20 adapters, output a summary table:

```
BATCH SUMMARY
─────────────
Total adapters: 20
Verified: X
Partially verified: X
Unverified: X

Decisions:
  use-rest-api: X
  use-vendor-mcp: X
  use-both: X

Tools:
  Total passed: X
  Total failed (fixed): X
  Total added: X
  Total removed: X
  Total unverified: X

Vendors with MCP servers found: X
Vendors without MCP servers: X

Files modified: X
Files unchanged: X
```

Followed by the per-adapter records from Step 7.
