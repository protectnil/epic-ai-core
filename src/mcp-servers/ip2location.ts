/**
 * IP2Location.io MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official IP2Location.io MCP server was found on GitHub.
//
// Base URL: https://api.ip2location.io
// Auth: key query parameter or Bearer token header. Keyless queries allowed up to 1,000/day.
// Docs: https://www.ip2location.io/ip2location-documentation
// Rate limits: Keyless: 1,000 queries/day. Free plan (API key): 50,000 queries/month. Resets 00:00 UTC.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Ip2LocationConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class Ip2LocationMCPServer extends MCPAdapterBase {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(config: Ip2LocationConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.ip2location.io';
  }

  static catalog() {
    return {
      name: 'ip2location',
      displayName: 'IP2Location.io',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'ip2location', 'ip geolocation', 'ip lookup', 'geolocation', 'reverse ip',
        'ip address', 'country', 'city', 'region', 'latitude', 'longitude',
        'isp', 'internet service provider', 'timezone', 'zip code', 'postal code',
        'mobile', 'carrier', 'mcc', 'mnc', 'proxy', 'vpn', 'fraud score',
        'network', 'domain', 'area code', 'weather station', 'asn', 'as',
        'district', 'net speed', 'usage type', 'currency', 'language',
        'elevation', 'population', 'iab category', 'whois', 'hosted domain',
      ],
      toolNames: [
        'lookup_ip',
        'lookup_ip_translated',
        'get_my_ip',
      ],
      description: 'IP2Location.io geolocation: reverse lookup any IPv4 or IPv6 address for country, region, city, coordinates, ZIP, timezone, ISP, ASN, domain, proxy/fraud data, mobile carrier, currency, and more.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'lookup_ip',
        description: 'Reverse lookup an IPv4 or IPv6 address to get country, region, city, coordinates, ZIP, timezone, ISP, domain, ASN, usage type, proxy status, and fraud score',
        inputSchema: {
          type: 'object',
          properties: {
            ip: {
              type: 'string',
              description: 'IPv4 or IPv6 address to look up (e.g. 8.8.8.8 or 2001:4860:4860::8888)',
            },
          },
          required: ['ip'],
        },
      },
      {
        name: 'lookup_ip_translated',
        description: 'Reverse lookup an IPv4 or IPv6 address and return continent, country, region, and city names translated into the specified language (requires Plus or Security plan API key)',
        inputSchema: {
          type: 'object',
          properties: {
            ip: {
              type: 'string',
              description: 'IPv4 or IPv6 address to look up (e.g. 8.8.8.8)',
            },
            lang: {
              type: 'string',
              description: 'ISO 639-1 language code for translated place names. Valid values: ar, cs, da, de, en, es, et, fi, fr, ga, it, ja, ko, ms, nl, pt, ru, sv, tr, vi, zh-cn, zh-tw',
            },
          },
          required: ['ip', 'lang'],
        },
      },
      {
        name: 'get_my_ip',
        description: 'Look up geolocation data for the caller\'s own IP address (no IP argument needed). Returns country, region, city, coordinates, timezone, ISP, and proxy status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'lookup_ip':            return this.lookupIp(args);
        case 'lookup_ip_translated': return this.lookupIpTranslated(args);
        case 'get_my_ip':            return this.getMyIp();
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

  private async query(params: Record<string, string | undefined>): Promise<ToolResult> {
    const qs = new URLSearchParams();
    if (this.apiKey) {
      qs.set('key', this.apiKey);
    }
    qs.set('format', 'json');
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        qs.set(key, value);
      }
    }
    const url = `${this.baseUrl}/?${qs.toString()}`;
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    const response = await this.fetchWithRetry(url, { headers });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `IP2Location.io API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as Record<string, unknown>;
    // Error shape: { "error": { "error_code": 10001, "error_message": "..." } }
    if (data['error'] && typeof data['error'] === 'object') {
      const err = data['error'] as Record<string, unknown>;
      return {
        content: [{ type: 'text', text: `IP2Location.io error ${err['error_code']}: ${err['error_message']}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool methods ───────────────────────────────────────────────────────────

  private async lookupIp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ip) {
      return { content: [{ type: 'text', text: 'ip is required' }], isError: true };
    }
    return this.query({ ip: args.ip as string });
  }

  private async lookupIpTranslated(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ip) {
      return { content: [{ type: 'text', text: 'ip is required' }], isError: true };
    }
    if (!args.lang) {
      return { content: [{ type: 'text', text: 'lang is required' }], isError: true };
    }
    return this.query({
      ip: args.ip as string,
      lang: args.lang as string,
    });
  }

  private async getMyIp(): Promise<ToolResult> {
    return this.query({});
  }
}
