/**
 * Cloudflare MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/cloudflare/mcp-server-cloudflare — transport: streamable-HTTP
//   and SSE (deprecated). Auth: OAuth2 with Cloudflare account. Published by Cloudflare (official).
//   Actively maintained: 3,600+ stars, 349 commits. Last commit 2025/2026.
//   Contains multiple specialized sub-servers:
//     - Cloudflare API MCP (cloudflare.com/api/mcp): 2 tools (search, execute) via "Codemode" —
//       covers 2,500+ endpoints in ~1,000 tokens via dynamic Worker sandbox execution.
//     - Workers Bindings: build Workers apps with storage, AI, compute primitives.
//     - Workers Builds: insights and management for Cloudflare Workers Builds.
//     - Observability (workers-observability): debug logs and analytics.
//     - Radar: global Internet traffic insights, URL scans.
//     - Container: sandbox development environments.
//     - Browser Rendering: fetch pages, convert to markdown, take screenshots.
//     - Logpush: summaries for Logpush job health.
//   MCP vendor tool count: 2 (Codemode API MCP) + additional per sub-server (not individually counted).
// Our adapter covers: 22 tools (explicit named tools for core DNS, zones, workers, KV, pages,
//   firewall/IP-access-rules, cache purge). Use for API-token auth without OAuth, air-gapped
//   deployments, scripted/CI integrations, or where explicit named tools are preferred over
//   the Codemode search+execute interface.
// Recommendation: use-both
//   MCP provides: dynamic coverage of all 2,500+ Cloudflare API endpoints via search()/execute()
//     Codemode, plus specialized sub-servers for observability, browser rendering, bindings.
//   REST adapter provides: explicit named tools that the SLM can select by name without
//     requiring Codemode generation. Better for deterministic tool routing in orchestration.
//
// Integration: use-both
// MCP-sourced tools (2 Codemode + sub-server tools): search, execute (Cloudflare API MCP);
//   plus workers-bindings, workers-builds, observability, radar, container, browser-rendering,
//   logpush sub-server tools (tool counts vary by sub-server).
// REST-sourced tools (22): list_zones, get_zone, purge_cache, list_dns_records, get_dns_record,
//   create_dns_record, update_dns_record, delete_dns_record, list_workers, get_worker,
//   delete_worker, list_kv_namespaces, list_kv_keys, get_kv_value, put_kv_value, delete_kv_value,
//   list_pages_projects, get_pages_project, list_firewall_rules, create_firewall_rule,
//   update_firewall_rule, delete_firewall_rule
//
// Base URL: https://api.cloudflare.com/client/v4
// Auth: Bearer token — Authorization: Bearer {API_TOKEN}
//   Source: https://developers.cloudflare.com/api/
// Docs: https://developers.cloudflare.com/api/
// Rate limits: 1,200 requests per 5 minutes per API token (some endpoints have tighter limits).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CloudflareConfig {
  apiToken: string;
  accountId?: string;
  baseUrl?: string;
}

const CLOUDFLARE_BASE_URL = 'https://api.cloudflare.com/client/v4';

export class CloudflareMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly accountId: string;
  private readonly baseUrl: string;

  constructor(config: CloudflareConfig) {
    super();
    this.apiToken = config.apiToken;
    this.accountId = config.accountId || '';
    this.baseUrl = (config.baseUrl || CLOUDFLARE_BASE_URL).replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'cloudflare',
      displayName: 'Cloudflare',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: ['cloudflare', 'dns', 'zone', 'worker', 'cdn', 'firewall', 'kv', 'pages', 'cache', 'ddos', 'waf'],
      toolNames: [
        'list_zones', 'get_zone', 'purge_cache',
        'list_dns_records', 'get_dns_record', 'create_dns_record', 'update_dns_record', 'delete_dns_record',
        'list_workers', 'get_worker', 'delete_worker',
        'list_kv_namespaces', 'list_kv_keys', 'get_kv_value', 'put_kv_value', 'delete_kv_value',
        'list_pages_projects', 'get_pages_project',
        'list_firewall_rules', 'create_firewall_rule', 'update_firewall_rule', 'delete_firewall_rule',
      ],
      description: 'Manage Cloudflare zones, DNS records, Workers scripts, KV namespaces, Pages projects, firewall rules, and cache operations via the v4 REST API.',
      author: 'protectnil' as const,
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJSON(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...options });
    let data: unknown;
    try { data = await response.json(); } catch { data = await response.text().catch(() => response.statusText); }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private resolveAccountId(args: Record<string, unknown>): string {
    return (args.accountId as string) || this.accountId;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_zones',
        description: 'List all zones (domains) in the Cloudflare account with optional filters for name and status.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter zones by domain name (exact or partial match).' },
            status: { type: 'string', description: 'Filter by zone status: active, pending, initializing, moved, deleted, deactivated.' },
            page: { type: 'number', description: 'Page number (default: 1).' },
            per_page: { type: 'number', description: 'Results per page (default: 20, max: 50).' },
          },
        },
      },
      {
        name: 'get_zone',
        description: 'Get details of a specific Cloudflare zone by zone ID including plan, status, and nameservers.',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: { type: 'string', description: 'Cloudflare zone ID.' },
          },
          required: ['zoneId'],
        },
      },
      {
        name: 'purge_cache',
        description: 'Purge cached files for a zone — purge everything or specific URLs/tags/hosts.',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: { type: 'string', description: 'Cloudflare zone ID.' },
            purge_everything: { type: 'boolean', description: 'Purge all cached files for this zone (default: false). Cannot be combined with files/tags/hosts.' },
            files: { type: 'array', description: 'Array of URLs to purge from cache (optional).', items: { type: 'string' } },
            tags: { type: 'array', description: 'Array of cache tags to purge (optional, Enterprise only).', items: { type: 'string' } },
            hosts: { type: 'array', description: 'Array of hostnames to purge (optional, Enterprise only).', items: { type: 'string' } },
          },
          required: ['zoneId'],
        },
      },
      {
        name: 'list_dns_records',
        description: 'List DNS records for a Cloudflare zone with optional filters for type and name.',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: { type: 'string', description: 'Cloudflare zone ID.' },
            type: { type: 'string', description: 'Record type filter: A, AAAA, CNAME, TXT, MX, NS, SRV, CAA, etc.' },
            name: { type: 'string', description: 'Filter by exact record name.' },
            page: { type: 'number', description: 'Page number (default: 1).' },
            per_page: { type: 'number', description: 'Results per page (max: 100).' },
          },
          required: ['zoneId'],
        },
      },
      {
        name: 'get_dns_record',
        description: 'Get details of a specific DNS record by zone ID and record ID.',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: { type: 'string', description: 'Cloudflare zone ID.' },
            recordId: { type: 'string', description: 'DNS record ID.' },
          },
          required: ['zoneId', 'recordId'],
        },
      },
      {
        name: 'create_dns_record',
        description: 'Create a new DNS record in a Cloudflare zone with type, name, content, TTL, and proxy status.',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: { type: 'string', description: 'Cloudflare zone ID.' },
            type: { type: 'string', description: 'DNS record type: A, AAAA, CNAME, TXT, MX, NS, SRV.' },
            name: { type: 'string', description: 'DNS record name (e.g. example.com or sub.example.com).' },
            content: { type: 'string', description: 'DNS record content (IP address, hostname, or text value).' },
            ttl: { type: 'number', description: 'Time to live in seconds (1 = automatic, default: 1).' },
            proxied: { type: 'boolean', description: 'Whether to proxy traffic through Cloudflare (default: false).' },
            priority: { type: 'number', description: 'MX record priority (required for MX records only).' },
          },
          required: ['zoneId', 'type', 'name', 'content'],
        },
      },
      {
        name: 'update_dns_record',
        description: 'Update an existing DNS record in a Cloudflare zone (PUT — replaces all mutable fields).',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: { type: 'string', description: 'Cloudflare zone ID.' },
            recordId: { type: 'string', description: 'DNS record ID to update.' },
            type: { type: 'string', description: 'DNS record type: A, AAAA, CNAME, TXT, MX, NS, SRV.' },
            name: { type: 'string', description: 'DNS record name (e.g. example.com or sub.example.com).' },
            content: { type: 'string', description: 'DNS record content (IP address, hostname, or text value).' },
            ttl: { type: 'number', description: 'Time to live in seconds (1 = automatic).' },
            proxied: { type: 'boolean', description: 'Whether to proxy traffic through Cloudflare.' },
          },
          required: ['zoneId', 'recordId', 'type', 'name', 'content'],
        },
      },
      {
        name: 'delete_dns_record',
        description: 'Delete a DNS record from a Cloudflare zone by zone ID and record ID.',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: { type: 'string', description: 'Cloudflare zone ID.' },
            recordId: { type: 'string', description: 'DNS record ID to delete.' },
          },
          required: ['zoneId', 'recordId'],
        },
      },
      {
        name: 'list_workers',
        description: 'List all Cloudflare Workers scripts in the account with name and last-modified date.',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
        },
      },
      {
        name: 'get_worker',
        description: 'Retrieve metadata and bindings for a specific Cloudflare Workers script by name.',
        inputSchema: {
          type: 'object',
          properties: {
            scriptName: { type: 'string', description: 'Worker script name.' },
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
          required: ['scriptName'],
        },
      },
      {
        name: 'delete_worker',
        description: 'Delete a Cloudflare Workers script by name. This removes the script and all its routes.',
        inputSchema: {
          type: 'object',
          properties: {
            scriptName: { type: 'string', description: 'Worker script name to delete.' },
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
          required: ['scriptName'],
        },
      },
      {
        name: 'list_kv_namespaces',
        description: 'List all Workers KV namespaces in the Cloudflare account.',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
            page: { type: 'number', description: 'Page number (default: 1).' },
            per_page: { type: 'number', description: 'Results per page (default: 20, max: 100).' },
          },
        },
      },
      {
        name: 'list_kv_keys',
        description: 'List keys in a Workers KV namespace with optional prefix filter and pagination cursor.',
        inputSchema: {
          type: 'object',
          properties: {
            namespaceId: { type: 'string', description: 'KV namespace ID.' },
            prefix: { type: 'string', description: 'Filter keys with this prefix (optional).' },
            limit: { type: 'number', description: 'Maximum number of keys to return (default: 1000, max: 1000).' },
            cursor: { type: 'string', description: 'Cursor for pagination from a previous list response (optional).' },
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
          required: ['namespaceId'],
        },
      },
      {
        name: 'get_kv_value',
        description: 'Read the value of a specific key from a Workers KV namespace.',
        inputSchema: {
          type: 'object',
          properties: {
            namespaceId: { type: 'string', description: 'KV namespace ID.' },
            key: { type: 'string', description: 'Key name to read.' },
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
          required: ['namespaceId', 'key'],
        },
      },
      {
        name: 'put_kv_value',
        description: 'Write or overwrite a key-value pair in a Workers KV namespace with optional TTL.',
        inputSchema: {
          type: 'object',
          properties: {
            namespaceId: { type: 'string', description: 'KV namespace ID.' },
            key: { type: 'string', description: 'Key name to write.' },
            value: { type: 'string', description: 'Value to store (string).' },
            expiration_ttl: { type: 'number', description: 'Time to live in seconds before the key expires (optional).' },
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
          required: ['namespaceId', 'key', 'value'],
        },
      },
      {
        name: 'delete_kv_value',
        description: 'Delete a key-value pair from a Workers KV namespace.',
        inputSchema: {
          type: 'object',
          properties: {
            namespaceId: { type: 'string', description: 'KV namespace ID.' },
            key: { type: 'string', description: 'Key name to delete.' },
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
          required: ['namespaceId', 'key'],
        },
      },
      {
        name: 'list_pages_projects',
        description: 'List all Cloudflare Pages projects in the account with deployment status and production branch.',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
        },
      },
      {
        name: 'get_pages_project',
        description: 'Get details of a specific Cloudflare Pages project including deployments and environment config.',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: { type: 'string', description: 'Pages project name.' },
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
          required: ['projectName'],
        },
      },
      {
        name: 'list_firewall_rules',
        description: 'List IP access rules (firewall rules) for an account or zone with optional filter by mode.',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: { type: 'string', description: 'Cloudflare zone ID to scope to zone-level rules (optional, uses account-level if omitted).' },
            mode: { type: 'string', description: 'Filter by rule mode: block, challenge, whitelist, js_challenge, managed_challenge.' },
            page: { type: 'number', description: 'Page number (default: 1).' },
            per_page: { type: 'number', description: 'Results per page (default: 20, max: 100).' },
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
        },
      },
      {
        name: 'create_firewall_rule',
        description: 'Create an IP access rule to block, challenge, or whitelist an IP, CIDR, ASN, or country.',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', description: 'Rule mode: block, challenge, whitelist, js_challenge, managed_challenge.' },
            configuration_target: { type: 'string', description: 'Target type: ip, ip_range, asn, or country.' },
            configuration_value: { type: 'string', description: 'Target value — IP address, CIDR, ASN number, or 2-letter country code.' },
            notes: { type: 'string', description: 'Optional notes explaining why this rule was created.' },
            zoneId: { type: 'string', description: 'Cloudflare zone ID to create a zone-scoped rule (optional, creates account-level rule if omitted).' },
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
          required: ['mode', 'configuration_target', 'configuration_value'],
        },
      },
      {
        name: 'update_firewall_rule',
        description: 'Update the mode or notes on an existing IP access firewall rule.',
        inputSchema: {
          type: 'object',
          properties: {
            ruleId: { type: 'string', description: 'Firewall rule ID to update.' },
            mode: { type: 'string', description: 'New rule mode: block, challenge, whitelist, js_challenge, managed_challenge.' },
            notes: { type: 'string', description: 'New notes for this rule (optional).' },
            zoneId: { type: 'string', description: 'Zone ID if this is a zone-level rule (optional).' },
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
          required: ['ruleId', 'mode'],
        },
      },
      {
        name: 'delete_firewall_rule',
        description: 'Delete an IP access firewall rule by its rule ID.',
        inputSchema: {
          type: 'object',
          properties: {
            ruleId: { type: 'string', description: 'Firewall rule ID to delete.' },
            zoneId: { type: 'string', description: 'Zone ID if this is a zone-level rule (optional).' },
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config default).' },
          },
          required: ['ruleId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_zones':
          return this.listZones(args);
        case 'get_zone':
          return this.getZone(args);
        case 'purge_cache':
          return this.purgeCache(args);
        case 'list_dns_records':
          return this.listDnsRecords(args);
        case 'get_dns_record':
          return this.getDnsRecord(args);
        case 'create_dns_record':
          return this.createDnsRecord(args);
        case 'update_dns_record':
          return this.updateDnsRecord(args);
        case 'delete_dns_record':
          return this.deleteDnsRecord(args);
        case 'list_workers':
          return this.listWorkers(args);
        case 'get_worker':
          return this.getWorker(args);
        case 'delete_worker':
          return this.deleteWorker(args);
        case 'list_kv_namespaces':
          return this.listKvNamespaces(args);
        case 'list_kv_keys':
          return this.listKvKeys(args);
        case 'get_kv_value':
          return this.getKvValue(args);
        case 'put_kv_value':
          return this.putKvValue(args);
        case 'delete_kv_value':
          return this.deleteKvValue(args);
        case 'list_pages_projects':
          return this.listPagesProjects(args);
        case 'get_pages_project':
          return this.getPagesProject(args);
        case 'list_firewall_rules':
          return this.listFirewallRules(args);
        case 'create_firewall_rule':
          return this.createFirewallRule(args);
        case 'update_firewall_rule':
          return this.updateFirewallRule(args);
        case 'delete_firewall_rule':
          return this.deleteFirewallRule(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async listZones(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.name) params.set('name', String(args.name));
    if (args.status) params.set('status', String(args.status));
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fetchJSON(`${this.baseUrl}/zones?${params.toString()}`);
  }

  private async getZone(args: Record<string, unknown>): Promise<ToolResult> {
    const zoneId = args.zoneId as string;
    if (!zoneId) return { content: [{ type: 'text', text: 'zoneId is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/zones/${encodeURIComponent(zoneId)}`);
  }

  private async purgeCache(args: Record<string, unknown>): Promise<ToolResult> {
    const zoneId = args.zoneId as string;
    if (!zoneId) return { content: [{ type: 'text', text: 'zoneId is required' }], isError: true };

    const body: Record<string, unknown> = {};
    if (args.purge_everything === true) {
      body.purge_everything = true;
    } else {
      if (args.files) body.files = args.files;
      if (args.tags) body.tags = args.tags;
      if (args.hosts) body.hosts = args.hosts;
    }

    return this.fetchJSON(`${this.baseUrl}/zones/${encodeURIComponent(zoneId)}/purge_cache`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async listDnsRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const zoneId = args.zoneId as string;
    if (!zoneId) return { content: [{ type: 'text', text: 'zoneId is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.type) params.set('type', String(args.type));
    if (args.name) params.set('name', String(args.name));
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fetchJSON(`${this.baseUrl}/zones/${encodeURIComponent(zoneId)}/dns_records?${params.toString()}`);
  }

  private async getDnsRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const zoneId = args.zoneId as string;
    const recordId = args.recordId as string;
    if (!zoneId || !recordId) return { content: [{ type: 'text', text: 'zoneId and recordId are required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`);
  }

  private async createDnsRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const zoneId = args.zoneId as string;
    if (!zoneId || !args.type || !args.name || !args.content) {
      return { content: [{ type: 'text', text: 'zoneId, type, name, and content are required' }], isError: true };
    }
    const payload: Record<string, unknown> = {
      type: String(args.type),
      name: String(args.name),
      content: String(args.content),
    };
    if (args.ttl !== undefined) payload.ttl = Number(args.ttl);
    if (args.proxied !== undefined) payload.proxied = Boolean(args.proxied);
    if (args.priority !== undefined) payload.priority = Number(args.priority);
    return this.fetchJSON(`${this.baseUrl}/zones/${encodeURIComponent(zoneId)}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  private async updateDnsRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const zoneId = args.zoneId as string;
    const recordId = args.recordId as string;
    if (!zoneId || !recordId || !args.type || !args.name || !args.content) {
      return { content: [{ type: 'text', text: 'zoneId, recordId, type, name, and content are required' }], isError: true };
    }
    const payload: Record<string, unknown> = {
      type: String(args.type),
      name: String(args.name),
      content: String(args.content),
    };
    if (args.ttl !== undefined) payload.ttl = Number(args.ttl);
    if (args.proxied !== undefined) payload.proxied = Boolean(args.proxied);
    return this.fetchJSON(`${this.baseUrl}/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  private async deleteDnsRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const zoneId = args.zoneId as string;
    const recordId = args.recordId as string;
    if (!zoneId || !recordId) return { content: [{ type: 'text', text: 'zoneId and recordId are required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`, {
      method: 'DELETE',
    });
  }

  private async listWorkers(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = this.resolveAccountId(args);
    if (!accountId) return { content: [{ type: 'text', text: 'accountId is required (set in config or pass as argument)' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/accounts/${encodeURIComponent(accountId)}/workers/scripts`);
  }

  private async getWorker(args: Record<string, unknown>): Promise<ToolResult> {
    const scriptName = args.scriptName as string;
    if (!scriptName) return { content: [{ type: 'text', text: 'scriptName is required' }], isError: true };
    const accountId = this.resolveAccountId(args);
    if (!accountId) return { content: [{ type: 'text', text: 'accountId is required (set in config or pass as argument)' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(scriptName)}`);
  }

  private async deleteWorker(args: Record<string, unknown>): Promise<ToolResult> {
    const scriptName = args.scriptName as string;
    if (!scriptName) return { content: [{ type: 'text', text: 'scriptName is required' }], isError: true };
    const accountId = this.resolveAccountId(args);
    if (!accountId) return { content: [{ type: 'text', text: 'accountId is required (set in config or pass as argument)' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(scriptName)}`, {
      method: 'DELETE',
    });
  }

  private async listKvNamespaces(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = this.resolveAccountId(args);
    if (!accountId) return { content: [{ type: 'text', text: 'accountId is required (set in config or pass as argument)' }], isError: true };
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fetchJSON(`${this.baseUrl}/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces?${params.toString()}`);
  }

  private async listKvKeys(args: Record<string, unknown>): Promise<ToolResult> {
    const namespaceId = args.namespaceId as string;
    if (!namespaceId) return { content: [{ type: 'text', text: 'namespaceId is required' }], isError: true };
    const accountId = this.resolveAccountId(args);
    if (!accountId) return { content: [{ type: 'text', text: 'accountId is required (set in config or pass as argument)' }], isError: true };
    const params = new URLSearchParams();
    if (args.prefix) params.set('prefix', String(args.prefix));
    if (args.limit) params.set('limit', String(args.limit));
    if (args.cursor) params.set('cursor', String(args.cursor));
    return this.fetchJSON(`${this.baseUrl}/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces/${encodeURIComponent(namespaceId)}/keys?${params.toString()}`);
  }

  private async getKvValue(args: Record<string, unknown>): Promise<ToolResult> {
    const namespaceId = args.namespaceId as string;
    const key = args.key as string;
    if (!namespaceId || !key) return { content: [{ type: 'text', text: 'namespaceId and key are required' }], isError: true };
    const accountId = this.resolveAccountId(args);
    if (!accountId) return { content: [{ type: 'text', text: 'accountId is required (set in config or pass as argument)' }], isError: true };

    const url = `${this.baseUrl}/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces/${encodeURIComponent(namespaceId)}/values/${encodeURIComponent(key)}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      let data: unknown;
      try { data = await response.json(); } catch { data = await response.text().catch(() => response.statusText); }
      return { content: [{ type: 'text', text: `API error ${response.status}: ${JSON.stringify(data)}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async putKvValue(args: Record<string, unknown>): Promise<ToolResult> {
    const namespaceId = args.namespaceId as string;
    const key = args.key as string;
    const value = args.value as string;
    if (!namespaceId || !key || value === undefined) {
      return { content: [{ type: 'text', text: 'namespaceId, key, and value are required' }], isError: true };
    }
    const accountId = this.resolveAccountId(args);
    if (!accountId) return { content: [{ type: 'text', text: 'accountId is required (set in config or pass as argument)' }], isError: true };

    const params = new URLSearchParams();
    if (args.expiration_ttl) params.set('expiration_ttl', String(args.expiration_ttl));

    const url = `${this.baseUrl}/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces/${encodeURIComponent(namespaceId)}/values/${encodeURIComponent(key)}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.fetchWithRetry(url, {
      method: 'PUT',
      headers: { ...this.headers, 'Content-Type': 'text/plain' },
      body: value,
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = await response.text().catch(() => response.statusText); }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  private async deleteKvValue(args: Record<string, unknown>): Promise<ToolResult> {
    const namespaceId = args.namespaceId as string;
    const key = args.key as string;
    if (!namespaceId || !key) return { content: [{ type: 'text', text: 'namespaceId and key are required' }], isError: true };
    const accountId = this.resolveAccountId(args);
    if (!accountId) return { content: [{ type: 'text', text: 'accountId is required (set in config or pass as argument)' }], isError: true };

    return this.fetchJSON(
      `${this.baseUrl}/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces/${encodeURIComponent(namespaceId)}/values/${encodeURIComponent(key)}`,
      { method: 'DELETE' },
    );
  }

  private async listPagesProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = this.resolveAccountId(args);
    if (!accountId) return { content: [{ type: 'text', text: 'accountId is required (set in config or pass as argument)' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/accounts/${encodeURIComponent(accountId)}/pages/projects`);
  }

  private async getPagesProject(args: Record<string, unknown>): Promise<ToolResult> {
    const projectName = args.projectName as string;
    if (!projectName) return { content: [{ type: 'text', text: 'projectName is required' }], isError: true };
    const accountId = this.resolveAccountId(args);
    if (!accountId) return { content: [{ type: 'text', text: 'accountId is required (set in config or pass as argument)' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}`);
  }

  private async listFirewallRules(args: Record<string, unknown>): Promise<ToolResult> {
    const zoneId = args.zoneId as string | undefined;
    const accountId = this.resolveAccountId(args);
    const scope = zoneId
      ? `zones/${encodeURIComponent(zoneId)}`
      : accountId
        ? `accounts/${encodeURIComponent(accountId)}`
        : null;
    if (!scope) return { content: [{ type: 'text', text: 'Either zoneId or accountId is required' }], isError: true };

    const params = new URLSearchParams();
    if (args.mode) params.set('mode', String(args.mode));
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fetchJSON(`${this.baseUrl}/${scope}/firewall/access_rules/rules?${params.toString()}`);
  }

  private async createFirewallRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.mode || !args.configuration_target || !args.configuration_value) {
      return { content: [{ type: 'text', text: 'mode, configuration_target, and configuration_value are required' }], isError: true };
    }

    const zoneId = args.zoneId as string | undefined;
    const accountId = this.resolveAccountId(args);
    const scope = zoneId
      ? `zones/${encodeURIComponent(zoneId)}`
      : accountId
        ? `accounts/${encodeURIComponent(accountId)}`
        : null;
    if (!scope) return { content: [{ type: 'text', text: 'Either zoneId or accountId is required' }], isError: true };

    const body: Record<string, unknown> = {
      mode: args.mode,
      configuration: {
        target: args.configuration_target,
        value: args.configuration_value,
      },
    };
    if (args.notes) body.notes = args.notes;

    return this.fetchJSON(`${this.baseUrl}/${scope}/firewall/access_rules/rules`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateFirewallRule(args: Record<string, unknown>): Promise<ToolResult> {
    const ruleId = args.ruleId as string;
    if (!ruleId || !args.mode) return { content: [{ type: 'text', text: 'ruleId and mode are required' }], isError: true };

    const zoneId = args.zoneId as string | undefined;
    const accountId = this.resolveAccountId(args);
    const scope = zoneId
      ? `zones/${encodeURIComponent(zoneId)}`
      : accountId
        ? `accounts/${encodeURIComponent(accountId)}`
        : null;
    if (!scope) return { content: [{ type: 'text', text: 'Either zoneId or accountId is required' }], isError: true };

    const body: Record<string, unknown> = { mode: args.mode };
    if (args.notes !== undefined) body.notes = args.notes;

    return this.fetchJSON(`${this.baseUrl}/${scope}/firewall/access_rules/rules/${encodeURIComponent(ruleId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  private async deleteFirewallRule(args: Record<string, unknown>): Promise<ToolResult> {
    const ruleId = args.ruleId as string;
    if (!ruleId) return { content: [{ type: 'text', text: 'ruleId is required' }], isError: true };

    const zoneId = args.zoneId as string | undefined;
    const accountId = this.resolveAccountId(args);
    const scope = zoneId
      ? `zones/${encodeURIComponent(zoneId)}`
      : accountId
        ? `accounts/${encodeURIComponent(accountId)}`
        : null;
    if (!scope) return { content: [{ type: 'text', text: 'Either zoneId or accountId is required' }], isError: true };

    return this.fetchJSON(`${this.baseUrl}/${scope}/firewall/access_rules/rules/${encodeURIComponent(ruleId)}`, {
      method: 'DELETE',
    });
  }
}
