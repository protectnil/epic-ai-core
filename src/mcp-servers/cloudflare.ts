/**
 * Cloudflare MCP Server
 * Adapter for Cloudflare API v4 using Bearer token authentication
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface CloudflareConfig {
  apiToken: string;
  accountId?: string;
}

const BASE = 'https://api.cloudflare.com/client/v4';

export class CloudflareMCPServer {
  private config: CloudflareConfig;

  constructor(config: CloudflareConfig) {
    this.config = config;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_zones',
        description: 'List all zones (domains) in the Cloudflare account',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter zones by domain name' },
            status: { type: 'string', description: 'Filter by status: active, pending, initializing, moved, deleted, deactivated' },
            page: { type: 'number', description: 'Page number (default 1)' },
            perPage: { type: 'number', description: 'Results per page (default 20, max 50)' },
          },
          required: [],
        },
      },
      {
        name: 'get_zone',
        description: 'Get details of a specific Cloudflare zone by zone ID',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: { type: 'string', description: 'Cloudflare zone ID' },
          },
          required: ['zoneId'],
        },
      },
      {
        name: 'list_dns_records',
        description: 'List DNS records for a Cloudflare zone',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: { type: 'string', description: 'Cloudflare zone ID' },
            type: { type: 'string', description: 'Record type filter: A, AAAA, CNAME, TXT, MX, etc.' },
            name: { type: 'string', description: 'Filter by record name' },
            page: { type: 'number', description: 'Page number' },
            perPage: { type: 'number', description: 'Results per page (max 100)' },
          },
          required: ['zoneId'],
        },
      },
      {
        name: 'create_dns_record',
        description: 'Create a new DNS record in a Cloudflare zone',
        inputSchema: {
          type: 'object',
          properties: {
            zoneId: { type: 'string', description: 'Cloudflare zone ID' },
            type: { type: 'string', description: 'DNS record type: A, AAAA, CNAME, TXT, MX, NS, SRV' },
            name: { type: 'string', description: 'DNS record name (e.g. example.com or sub.example.com)' },
            content: { type: 'string', description: 'DNS record content (IP, hostname, or text value)' },
            ttl: { type: 'number', description: 'Time to live in seconds (1 = automatic)' },
            proxied: { type: 'boolean', description: 'Whether the record is proxied through Cloudflare' },
          },
          required: ['zoneId', 'type', 'name', 'content'],
        },
      },
      {
        name: 'list_workers',
        description: 'List Cloudflare Workers scripts in the account',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'Cloudflare account ID (overrides config)' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const accountId = (args.accountId as string) || this.config.accountId || '';

      switch (name) {
        case 'list_zones': {
          const params = new URLSearchParams();
          if (args.name) params.set('name', String(args.name));
          if (args.status) params.set('status', String(args.status));
          if (args.page) params.set('page', String(args.page));
          if (args.perPage) params.set('per_page', String(args.perPage));
          const url = `${BASE}/zones?${params.toString()}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'get_zone': {
          const url = `${BASE}/zones/${String(args.zoneId)}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'list_dns_records': {
          const params = new URLSearchParams();
          if (args.type) params.set('type', String(args.type));
          if (args.name) params.set('name', String(args.name));
          if (args.page) params.set('page', String(args.page));
          if (args.perPage) params.set('per_page', String(args.perPage));
          const url = `${BASE}/zones/${String(args.zoneId)}/dns_records?${params.toString()}`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'create_dns_record': {
          const payload: Record<string, unknown> = {
            type: String(args.type),
            name: String(args.name),
            content: String(args.content),
          };
          if (args.ttl !== undefined) payload['ttl'] = Number(args.ttl);
          if (args.proxied !== undefined) payload['proxied'] = Boolean(args.proxied);
          const url = `${BASE}/zones/${String(args.zoneId)}/dns_records`;
          const response = await fetch(url, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(payload),
          });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        case 'list_workers': {
          const url = `${BASE}/accounts/${accountId}/workers/scripts`;
          const response = await fetch(url, { headers: this.headers() });
          let data: unknown;
          try { data = await response.json(); } catch { data = await response.text(); }
          return {
            content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            isError: !response.ok,
          };
        }

        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
