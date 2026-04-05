# Epic AI® Legion

*35,835 tools. One self-hosted MCP server. Your context window only loads what the query needs.*

**Context window cost: 469 tokens.** Legion exposes 3 tools to your AI client. The routing happens server-side — your context window never sees the full catalog.

Credentials stay on your machine. The routing stays on your machine. No tool executes a write operation without your explicit approval — read operations run automatically, write operations require confirmation, and you control the boundary per adapter and per operation type. Every action — approved, rejected, or automated — is logged with a timestamp, identity, and SHA-256 hash chain for tamper-evident audit. Legion is an Intelligent Virtual Assistant (IVA) that classifies intent, selects adapters, calls them, and synthesizes a response. Tool schemas and routing decisions never leave your machine — only the final query reaches your LLM, local or cloud. 35,835 tools across Salesforce, GitHub, AWS, Zillow, Epic FHIR, Spotify, Stripe, CrowdStrike, and 4,130+ more integrations — REST APIs, stdio MCPs, and streamable-HTTP MCPs (`legion list`). All three transports, one unified interface. A two-tier routing engine — BM25 + miniCOIL relevance scoring, then model-assisted classification — narrows the full catalog to the handful of tools each query actually needs. The first tier runs at zero inference cost; the model only sees a compact shortlist. One install, one config, and your agent reaches every tool. The default shortlist is 8 tools per query — configurable. You add your API or MCP keys and it works.

```bash
npx @epicai/legion
```

Cloud LLM users: no GPU required — your AI client handles classification. Local SLM users: see [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for hardware specs by model size.

[![npm version](https://img.shields.io/npm/v/@epicai/legion.svg?style=flat)](https://www.npmjs.com/package/@epicai/legion)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)

---

## How It Works

Legion operates in two modes depending on how you use AI:

### Cloud LLM Mode (most developers)

Your AI client (Claude Code, Cursor, Copilot, etc.) connects to Legion as a single MCP server. Three tool definitions (469 tokens) replace thousands. Legion's routing engine selects the right adapters, calls them, and returns results to your LLM for synthesis.

```
Developer's machine
┌──────────────────────────────────────────────┐
│  Claude Code / Cursor / Copilot / Desktop    │
│  (already authenticated with your provider)  │
│       │                                      │
│       │ spawns as child process (stdio)      │
│       ▼                                      │
│  Legion MCP Server (npx @epicai/legion --serve)
│       │                                      │
│       ├── REST Adapters (870)                 │
│       ├── Stdio MCPs (3,004)                  │
│       └── HTTP/SSE MCPs (475)                 │
│                                              │
│  Credentials: ~/.epic-ai/.env (local only)   │
└──────────────────────────────────────────────┘
```

### Local SLM Mode (air-gapped)

Legion runs the full orchestrator loop locally. A local SLM (llama.cpp, vLLM) handles tool selection. An optional cloud LLM handles synthesis. Or go fully air-gapped — nothing leaves your machine.

```
Developer's machine
┌──────────────────────────────────────────────┐
│  llama.cpp / vLLM                            │
│  (localhost:8080 / :8000)                    │
│       ▲                                      │
│       │ /v1/chat/completions                 │
│       │                                      │
│  Legion Orchestrator                         │
│       │                                      │
│       ├── REST Adapters (870)                │
│       ├── Stdio MCPs (3,004)                 │
│       └── HTTP/SSE MCPs (475)                │
│                                              │
│  Nothing leaves this machine.                │
└──────────────────────────────────────────────┘
```

---

## Quick Start

```bash
npx @epicai/legion
```

The setup wizard:
1. **Detects your system** — Node.js, platform, local LLMs
2. **Scans for AI clients** — Claude Code, Cursor, Windsurf, VS Code, Codex, Gemini, and 5 more
3. **Auto-configures** — writes Legion to each client's MCP config (with your permission)
4. **Configures curated adapters** — zero-credential open data sources, ready immediately
5. **Proves routing** — runs demo queries to show each one routes to the correct adapter

30 seconds from `npx` to working IVA. Run `legion configure` after to connect your own APIs.

---

## Architecture

Two-tier tool resolution prevents context window bloat:

| Tier | Component | What it does | Cost |
|------|-----------|-------------|------|
| 1 | ToolPreFilter | BM25 + miniCOIL sparse scoring, top 8 from configured adapters | Zero inference |
| 2 | Orchestrator | LLM selects from the shortlist and makes tool calls | One inference call |

The full adapter catalog (35,835 tools) never reaches the LLM. Only the shortlisted 8 tools do.

---

## Adapters

4,135 integrations exposing 35,835 tools — 624 REST-only, 3,242 MCP-only, 246 dual (REST+MCP), 23 REST candidates. Transports: REST, stdio (3,004), streamable-HTTP (456), SSE (18), HTTP (1).

| Category | Examples |
|----------|---------|
| Cybersecurity | CrowdStrike, Splunk, Palo Alto, SentinelOne, Carbon Black |
| DevOps & CI/CD | GitHub, GitLab, Jenkins, ArgoCD, Terraform |
| Cloud | AWS (13 services), Azure, GCP, Cloudflare, DigitalOcean |
| Healthcare | Epic FHIR, athenahealth, Veeva, DrChrono |
| Hospitality | Opera PMS, Mews, Cloudbeds, InfoGenesis, Toast |
| Construction | Procore, Autodesk Construction, PlanGrid, Buildertrend |
| Manufacturing | Epicor, Infor, Odoo, SAP, NetSuite |
| Finance | Stripe, QuickBooks, Xero, Plaid, PayPal |
| Communication | Gmail, Twilio, Slack, Teams, Discord |
| Travel | Sabre, Amadeus, Travelport |
| Observability | Datadog, Grafana, New Relic, Splunk, PagerDuty |
| Commerce | Shopify, Square, BigCommerce, Magento |
| And more | Real estate, education, insurance, IoT, legal, social... |

```bash
npx @epicai/legion list              # browse all adapters
npx @epicai/legion list security     # filter by keyword
npx @epicai/legion add crowdstrike   # add a specific adapter
npx @epicai/legion health            # check adapter status
```

---

## Zero-Credential Developer Sandbox

71 integrations return real data with no API key, no account, and no subscription. Connect Legion and call them immediately — no setup beyond the install.

> **Try these first:**
> - **Crypto.com** (`com-crypto-mcp-crypto-com`) — 9 tools. Real-time prices, market data, and blockchain stats. No key required.
> - **PubMed** (`com-claude-mcp-pubmed-pubmed`) — 7 tools. Search 36 million biomedical papers. Production data, no account.

These are MCP servers probed and verified to return real data without credentials on 2026-04-02.

### Full List

| Integration | Transport | Tools | Domain |
|-------------|-----------|-------|--------|
| **Crypto.com** | streamable-http | 9 | Crypto / Finance |
| **PubMed** | streamable-http | 7 | Biomedical Research |
| 1stay | streamable-http | 8 | Travel |
| 1stdibs | streamable-http | 4 | Luxury Commerce |
| Actiongate | streamable-http | 3 | Payments |
| Aarna ATARS | streamable-http | 18 | AI Services |
| Agentra Pay | streamable-http | 6 | Payments |
| Aiwyn Tax | streamable-http | 10 | Finance |
| Apollo GraphOS | streamable-http | 3 | Developer Tools |
| Auteng Docs | streamable-http | 7 | Developer Tools |
| Auteng MCP | streamable-http | 7 | Developer Tools |
| Blockscout MCP | streamable-http | 16 | Blockchain |
| BrokerChooser | streamable-http | 1 | Finance |
| Chia Telehealth | streamable-http | 34 | Healthcare |
| Clarity SFDR | streamable-http | 6 | Compliance |
| Clerk | streamable-http | 2 | Authentication |
| Contabo VPS | streamable-http | 124 | Infrastructure |
| Context7 | streamable-http | 2 | Developer Tools |
| Crafted Trust Shield | streamable-http | 6 | Security |
| CryptoRefills | sse | 1 | Crypto |
| DataMerge MCP | streamable-http | 20 | Data |
| DCHub | streamable-http | 20 | Utilities |
| Exa | streamable-http | 3 | Web Search |
| Feedoracle Compliance | sse | 33 | Regulatory Data |
| Fiber | streamable-http | 10 | Developer Tools |
| Fodda | streamable-http | 7 | Utilities |
| GetCIMS | streamable-http | 2 | Utilities |
| GoDaddy | streamable-http | 2 | Domains |
| GovBase | streamable-http | 10 | Government Data |
| GrantedAI | streamable-http | 5 | AI Services |
| Guruwalk | streamable-http | 4 | Travel |
| Himalayas Jobs | streamable-http | 41 | Recruitment |
| Icecat | sse | 17 | Product Data |
| iVisa | streamable-http | 1 | Travel |
| Kismet Travel | streamable-http | 5 | Travel |
| Lattiq x402 Trading Signals | streamable-http | 14 | Finance |
| Lenny Rachitsky Podcast | streamable-http | 8 | Content |
| LimitGuard | streamable-http | 5 | API Intelligence |
| Lingo | streamable-http | 4 | Localization |
| LLMse MCP | streamable-http | 10 | AI Services |
| LunarCrush | streamable-http | 13 | Crypto Analytics |
| Ludo AI | streamable-http | 21 | AI Services |
| MCP Registry | streamable-http | 3 | Developer Tools |
| Medusa | streamable-http | 1 | E-commerce |
| Meet Bot | streamable-http | 5 | Productivity |
| MermaidChart | streamable-http | 6 | Diagramming |
| Microsoft Learn | streamable-http | 3 | Developer Docs |
| Moltravel | streamable-http | 56 | Travel |
| Open Targets | streamable-http | 5 | Drug / Disease Data |
| Partstable | streamable-http | 9 | Parts & Supply |
| Peek | streamable-http | 6 | Activity Booking |
| PGA Golf | streamable-http | 3 | Sports Data |
| Petstore MCP | streamable-http | 19 | Demo / Testing |
| Prince Cloud | streamable-http | 3 | Utilities |
| RankOracle | streamable-http | 13 | Analytics |
| Redpanda Docs | streamable-http | 1 | Developer Docs |
| Robtex | streamable-http | 45 | Network Intelligence |
| Rtopacks | streamable-http | 5 | Utilities |
| SaaS Browser | streamable-http | 4 | Utilities |
| Searchcode | streamable-http | 6 | Code Search |
| Senzing | streamable-http | 13 | Entity Resolution |
| Sentinel Signal | streamable-http | 8 | Security |
| Shibui Stock Data | streamable-http | 7 | Finance |
| Supplymaven | sse | 7 | Supply Chain |
| Swiss Caselaw | sse | 19 | Legal |
| UNO Platform | sse | 4 | Developer Docs |
| Upstash | stdio | 2 | Database |
| Vaadin Docs | streamable-http | 10 | Developer Docs |
| Velvoite Compliance | streamable-http | 16 | Compliance |
| WebforJ | streamable-http | 3 | Developer Docs |

```bash
# Try Crypto.com live — no credentials needed
npx @epicai/legion add com-crypto-mcp-crypto-com

# Try PubMed live — no credentials needed
npx @epicai/legion add com-claude-mcp-pubmed-pubmed
```

---

## Autonomy

Every tool call goes through a three-tier governance layer:

| Tier | Behavior | Example |
|------|----------|---------|
| `auto` | Executes immediately | Read, query, search, list |
| `escalate` | Executes, flags for review | Write, update, modify |
| `approve` | Blocks until human approves | Delete, revoke, terminate |

Unclassified actions default to `approve`. No tool writes to your systems without your explicit approval.

---

## Configuration

```typescript
import { EpicAI } from '@epicai/legion';

const agent = await EpicAI.create({
  orchestrator: {
    provider: 'auto',  // probes llama.cpp, vLLM
  },
  federation: {
    servers: [
      { name: 'github', transport: 'stdio', command: 'mcp-server-github' },
      { name: 'splunk', transport: 'streamable-http', url: 'https://splunk.corp/mcp' },
    ],
  },
  autonomy: {
    tiers: {
      auto: ['read', 'query', 'search', 'list'],
      escalate: ['write', 'update'],
      approve: ['delete', 'revoke', 'terminate'],
    },
  },
  persona: {
    name: 'assistant',
    tone: 'professional',
    domain: 'general',
    systemPrompt: 'You are a helpful assistant powered by Epic AI Legion.',
  },
  audit: {
    store: 'memory',
    integrity: 'sha256-chain',
  },
});

await agent.start();
const result = await agent.run('What are my open GitHub PRs?');
console.log(result.response);
await agent.stop();
```

See the [Developer Guide](DEVELOPER_GUIDE.md) for full configuration reference.

---

## Testing

Three test lanes — no cloud account required for the first two:

| Lane | Command | What it covers |
|------|---------|----------------|
| Unit | `npm test` | All layers, mock LLMs, no external dependencies |
| Integration | `npm run test:integration` | Local inference backend, air-gapped + hybrid LLM |
| Harness | `npm run test:harness` | 45 assertions across stdio, HTTP, and API transports |

See [docs/TEST-PROTOCOL.md](docs/TEST-PROTOCOL.md) for setup and the full [harness spec](docs/harness/).

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `legion` | Setup wizard — auto-detect clients, configure curated adapters |
| `legion query "<question>"` | Route a question to your adapters and return results |
| `legion list` | Show Curated + Custom adapters |
| `legion search [term]` | Search all 4,135 available adapters |
| `legion add <id>` | Add an adapter and enter credentials |
| `legion remove <id>` | Remove an adapter |
| `legion configure` | Connect your APIs and credentials interactively |
| `legion health` | Check adapter status |
| `legion serve` | Start as MCP server (used by AI clients) |
| `legion help` | Show all commands |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, PR process, and code style guidelines.

**Reporting security vulnerabilities:** Do not open public issues. Email [security@epic-ai.io](mailto:security@epic-ai.io).

---

## License

**SDK Framework** (src/, gateway/, harness/) — [Apache License 2.0](LICENSE)

**Adapters and Registry** (src/mcp-servers/, adapter-catalog.json, mcp-registry.json) — [Elastic License 2.0](LICENSE-ADAPTERS)

Copyright 2026 protectNIL Inc.

---

## Trademark Notice

**Epic AI®** is a registered trademark of protectNIL Inc., U.S. Trademark Registration No. 7,748,019. Use of the Epic AI® name and mark is subject to the [trademark policies](TRADEMARK.md) of protectNIL Inc.

The `@epicai/legion` npm package and this repository are official specimens of use of the Epic AI® mark in commerce in connection with downloadable computer software featuring an Intelligent Virtual Assistant (IVA) utilizing artificial intelligence to access and process third-party sources of information across enterprise operations.

All other trademarks, service marks, and product names referenced in this document are the property of their respective owners.

---

*Epic AI® — Intelligent Virtual Assistant (IVA) Platform | 35,835 Tools | Built by [protectNIL Inc.](https://protectnil.com)*
