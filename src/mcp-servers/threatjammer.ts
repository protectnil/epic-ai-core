/**
 * ThreatJammer MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official ThreatJammer MCP server exists.
// Our adapter covers: 8 core tools (IP risk assessment, geo, ASN lookup, denylist/allowlist query, dataset list, user agent parse, token info).
// Full API has 81 endpoints; this adapter covers the highest-value threat intelligence operations.
//
// Base URL: https://dublin.api.threatjammer.com (EU region) — regional endpoints also available (us-east-1, etc.)
// Auth: Bearer token in Authorization header (HTTPBearer scheme)
// Docs: https://threatjammer.com/docs
// Rate limits: Depends on subscription tier. Free tier includes limited daily queries.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ThreatJammerConfig {
  apiToken: string;
  /** Optional base URL override (default: https://dublin.api.threatjammer.com) */
  baseUrl?: string;
}

export class ThreatJammerMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: ThreatJammerConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl ?? 'https://dublin.api.threatjammer.com';
  }

  static catalog() {
    return {
      name: 'threatjammer',
      displayName: 'ThreatJammer',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'threatjammer', 'threat-intelligence', 'ip-risk', 'cybersecurity', 'denylist',
        'allowlist', 'blocklist', 'ip-reputation', 'geolocation', 'asn', 'bot-detection',
        'fraud-prevention', 'malicious-ip', 'user-agent', 'datacenter', 'threat-score',
      ],
      toolNames: [
        'assess_ip_address',
        'assess_ip_batch',
        'get_ip_geolocation',
        'get_asn_info',
        'list_datasets',
        'query_ip_denylists',
        'query_ip_allowlists',
        'parse_user_agent',
      ],
      description: 'ThreatJammer threat intelligence — assess IP address risk scores, geolocate IPs, query ASN data, check denylist/allowlist membership, parse user agents, and list available threat datasets.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'assess_ip_address',
        description: 'Get a risk score and threat signals for a single IP address — returns risk score (0-100), classification, datacenter flag, proxy/VPN detection, and dataset matches',
        inputSchema: {
          type: 'object',
          properties: {
            ip_address: {
              type: 'string',
              description: 'IPv4 or IPv6 address to assess (e.g. "198.51.100.42")',
            },
          },
          required: ['ip_address'],
        },
      },
      {
        name: 'assess_ip_batch',
        description: 'Get risk scores for a batch of IP addresses in a single request — returns risk scores, classifications, and threat signals for each IP',
        inputSchema: {
          type: 'object',
          properties: {
            ip_addresses: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of IPv4 or IPv6 addresses to assess (e.g. ["1.2.3.4", "5.6.7.8"])',
            },
          },
          required: ['ip_addresses'],
        },
      },
      {
        name: 'get_ip_geolocation',
        description: 'Get geolocation data for an IP address — returns country, region, city, latitude, longitude, timezone, and ISP',
        inputSchema: {
          type: 'object',
          properties: {
            ip_address: {
              type: 'string',
              description: 'IPv4 or IPv6 address to geolocate (e.g. "198.51.100.42")',
            },
          },
          required: ['ip_address'],
        },
      },
      {
        name: 'get_asn_info',
        description: 'Get Autonomous System Number (ASN) details for an AS number — returns ASN name, registry, country, and associated prefixes',
        inputSchema: {
          type: 'object',
          properties: {
            asn_number: {
              type: 'number',
              description: 'Autonomous System Number without the "AS" prefix (e.g. 15169 for Google)',
            },
            include_prefixes: {
              type: 'boolean',
              description: 'Include the list of IPv4 and IPv6 prefixes assigned to this ASN (default: false)',
            },
          },
          required: ['asn_number'],
        },
      },
      {
        name: 'list_datasets',
        description: 'List all threat intelligence datasets available in ThreatJammer — returns dataset names, descriptions, and source information',
        inputSchema: {
          type: 'object',
          properties: {
            dataset_name: {
              type: 'string',
              description: 'Optional: get details for a specific dataset by name instead of listing all datasets',
            },
          },
        },
      },
      {
        name: 'query_ip_denylists',
        description: 'Check which private denylists contain a given IP address — returns matching denylist IDs and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            ip_address: {
              type: 'string',
              description: 'IPv4 or IPv6 address to check against private denylists (e.g. "198.51.100.42")',
            },
          },
          required: ['ip_address'],
        },
      },
      {
        name: 'query_ip_allowlists',
        description: 'Check which private allowlists contain a given IP address — returns matching allowlist IDs and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            ip_address: {
              type: 'string',
              description: 'IPv4 or IPv6 address to check against private allowlists (e.g. "198.51.100.42")',
            },
          },
          required: ['ip_address'],
        },
      },
      {
        name: 'parse_user_agent',
        description: 'Parse and classify a User Agent string — returns device type, browser family, OS, vendor, and bot detection flags',
        inputSchema: {
          type: 'object',
          properties: {
            user_agent: {
              type: 'string',
              description: 'URL-encoded User Agent string to parse (e.g. "Mozilla%2F5.0+%28Windows+NT+10.0%3B+Win64%3B+x64%29")',
            },
          },
          required: ['user_agent'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'assess_ip_address':
          return this.assessIpAddress(args);
        case 'assess_ip_batch':
          return this.assessIpBatch(args);
        case 'get_ip_geolocation':
          return this.getIpGeolocation(args);
        case 'get_asn_info':
          return this.getAsnInfo(args);
        case 'list_datasets':
          return this.listDatasets(args);
        case 'query_ip_denylists':
          return this.queryIpDenylists(args);
        case 'query_ip_allowlists':
          return this.queryIpAllowlists(args);
        case 'parse_user_agent':
          return this.parseUserAgent(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Accept': 'application/json',
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ThreatJammer returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ThreatJammer returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async assessIpAddress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ip_address) return { content: [{ type: 'text', text: 'ip_address is required' }], isError: true };
    return this.get(`/v1/assess/ip/${encodeURIComponent(args.ip_address as string)}`);
  }

  private async assessIpBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!Array.isArray(args.ip_addresses) || args.ip_addresses.length === 0) {
      return { content: [{ type: 'text', text: 'ip_addresses must be a non-empty array' }], isError: true };
    }
    return this.post('/v1/assess/ip', args.ip_addresses);
  }

  private async getIpGeolocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ip_address) return { content: [{ type: 'text', text: 'ip_address is required' }], isError: true };
    return this.get(`/v1/geo/${encodeURIComponent(args.ip_address as string)}`);
  }

  private async getAsnInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.asn_number === undefined) return { content: [{ type: 'text', text: 'asn_number is required' }], isError: true };
    const asnNum = args.asn_number as number;
    if (args.include_prefixes) {
      return this.get(`/v1/asn/${encodeURIComponent(String(asnNum))}/prefixes`);
    }
    return this.get(`/v1/asn/${encodeURIComponent(String(asnNum))}`);
  }

  private async listDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.dataset_name) {
      return this.get(`/v1/dataset/ip/${encodeURIComponent(args.dataset_name as string)}`);
    }
    return this.get('/v1/dataset/ip');
  }

  private async queryIpDenylists(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ip_address) return { content: [{ type: 'text', text: 'ip_address is required' }], isError: true };
    return this.get(`/v1/denylist/private/ip/${encodeURIComponent(args.ip_address as string)}`);
  }

  private async queryIpAllowlists(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ip_address) return { content: [{ type: 'text', text: 'ip_address is required' }], isError: true };
    return this.get(`/v1/allowlist/private/ip/${encodeURIComponent(args.ip_address as string)}`);
  }

  private async parseUserAgent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_agent) return { content: [{ type: 'text', text: 'user_agent is required' }], isError: true };
    return this.get(`/v1/ua/${encodeURIComponent(args.user_agent as string)}`);
  }
}
