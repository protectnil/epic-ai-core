/**
 * Abstract API — IP Geolocation MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Abstract API MCP server was found on GitHub.
//
// Base URL: https://ipgeolocation.abstractapi.com
// Auth: API key passed as query parameter `api_key` on every request
// Docs: https://www.abstractapi.com/ip-geolocation-api#docs
// Spec: https://api.apis.guru/v2/specs/abstractapi.com/geolocation/1.0.0/openapi.json
// Rate limits: Free tier — 1 req/sec, 20,000 req/month. Paid tiers vary.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AbstractApiGeolocationConfig {
  /** Abstract API geolocation API key */
  apiKey: string;
  /** Optional base URL override (default: https://ipgeolocation.abstractapi.com) */
  baseUrl?: string;
}

export class AbstractApiGeolocationMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AbstractApiGeolocationConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://ipgeolocation.abstractapi.com';
  }

  static catalog() {
    return {
      name: 'abstractapi-geolocation',
      displayName: 'Abstract API — IP Geolocation',
      version: '1.0.0',
      category: 'data' as const,
      keywords: [
        'abstractapi', 'geolocation', 'ip', 'ip-address', 'location', 'country',
        'city', 'region', 'latitude', 'longitude', 'timezone', 'currency',
        'vpn', 'proxy', 'isp', 'asn', 'geoip', 'lookup', 'ipv4', 'ipv6',
      ],
      toolNames: ['geolocate_ip', 'geolocate_my_ip'],
      description: 'Geolocate IPv4 or IPv6 addresses: returns country, region, city, coordinates, timezone, currency, ISP, VPN/proxy detection, and flag for any IP address worldwide.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'geolocate_ip',
        description: 'Geolocate an IPv4 or IPv6 address — returns country, region, city, coordinates, timezone, currency, ISP, ASN, VPN/proxy flag, and country flag',
        inputSchema: {
          type: 'object',
          properties: {
            ip_address: {
              type: 'string',
              description: 'IPv4 or IPv6 address to geolocate (e.g. "195.154.25.40" or "2001:db8::1")',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (e.g. "country,city,timezone") — omit to return all fields',
            },
          },
          required: ['ip_address'],
        },
      },
      {
        name: 'geolocate_my_ip',
        description: 'Geolocate the caller\'s own IP address — returns country, region, city, coordinates, timezone, currency, ISP, ASN, and VPN/proxy flag',
        inputSchema: {
          type: 'object',
          properties: {
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (e.g. "country,city,timezone") — omit to return all fields',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'geolocate_ip':    return this.geolocateIp(args);
        case 'geolocate_my_ip': return this.geolocateMyIp(args);
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async doGet(params: Record<string, string>): Promise<ToolResult> {
    const qs = new URLSearchParams({ api_key: this.apiKey, ...params });
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/?${qs.toString()}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool Implementations ───────────────────────────────────────────────────

  private async geolocateIp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ip_address) {
      return { content: [{ type: 'text', text: 'ip_address is required' }], isError: true };
    }
    const params: Record<string, string> = { ip_address: args.ip_address as string };
    if (args.fields) params['fields'] = args.fields as string;
    return this.doGet(params);
  }

  private async geolocateMyIp(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.fields) params['fields'] = args.fields as string;
    return this.doGet(params);
  }
}
