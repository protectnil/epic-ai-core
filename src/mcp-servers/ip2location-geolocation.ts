/**
 * IP2Location Geolocation MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official IP2Location MCP server was found on GitHub.
//
// Base URL: https://api.ip2location.com/v2
// Auth: key query parameter (sign up at https://www.ip2location.com/web-service/ip2location)
// Docs: https://www.ip2location.com/web-service/ip2location
// Rate limits: Varies by subscription plan (credit-based).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Ip2LocationGeolocationConfig {
  apiKey: string;
  baseUrl?: string;
}

export class Ip2LocationGeolocationMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: Ip2LocationGeolocationConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.ip2location.com/v2';
  }

  static catalog() {
    return {
      name: 'ip2location-geolocation',
      displayName: 'IP2Location IP Geolocation',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'ip2location', 'ip geolocation', 'ip lookup', 'geolocation', 'reverse ip',
        'ip address', 'country', 'city', 'region', 'latitude', 'longitude',
        'isp', 'internet service provider', 'timezone', 'zip code', 'postal code',
        'mobile', 'carrier', 'mcc', 'mnc', 'proxy', 'vpn', 'location data',
        'network', 'domain', 'area code', 'weather station',
      ],
      toolNames: [
        'lookup_ip',
        'lookup_ip_with_addons',
      ],
      description: 'IP2Location IP geolocation: reverse lookup any IPv4 or IPv6 address to get country, region, city, latitude/longitude, ZIP code, timezone, ISP, domain, carrier, and more.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'lookup_ip',
        description: 'Reverse lookup an IP address (IPv4 or IPv6) to get country, region, city, coordinates, ZIP, timezone, ISP, domain, and usage type',
        inputSchema: {
          type: 'object',
          properties: {
            ip: {
              type: 'string',
              description: 'IPv4 or IPv6 address to look up (e.g. 8.8.8.8 or 2001:4860:4860::8888)',
            },
            package: {
              type: 'string',
              description: 'Service package controlling response detail level: WS1 (country only) through WS25 (all fields). Default: WS3 (country, region, city, coordinates)',
              enum: [
                'WS1', 'WS2', 'WS3', 'WS4', 'WS5', 'WS6', 'WS7', 'WS8', 'WS9',
                'WS10', 'WS11', 'WS12', 'WS13', 'WS14', 'WS15', 'WS16', 'WS17',
                'WS18', 'WS19', 'WS20', 'WS21', 'WS22', 'WS23', 'WS24', 'WS25',
              ],
            },
          },
          required: ['ip'],
        },
      },
      {
        name: 'lookup_ip_with_addons',
        description: 'Reverse lookup an IP address with optional add-on data: continent details, full country profile, region translations, city translations, geotargeting metro, country groupings, or timezone info',
        inputSchema: {
          type: 'object',
          properties: {
            ip: {
              type: 'string',
              description: 'IPv4 or IPv6 address to look up (e.g. 8.8.8.8)',
            },
            package: {
              type: 'string',
              description: 'Service package WS1–WS25 (default: WS3)',
            },
            addon: {
              type: 'string',
              description: 'Comma-separated add-on fields: continent, country, region, city, geotargeting, country_groupings, time_zone_info (e.g. "continent,country,time_zone_info")',
            },
            lang: {
              type: 'string',
              description: 'Translation language for continent/country/region/city names: ar, cs, da, de, en, es, et, fi, fr, ga, it, ja, ko, ms, nl, pt, ru, sv, tr, vi, zh-cn, zh-tw',
            },
          },
          required: ['ip'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'lookup_ip':            return this.lookupIp(args);
        case 'lookup_ip_with_addons': return this.lookupIpWithAddons(args);
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
    qs.set('key', this.apiKey);
    qs.set('format', 'json');
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        qs.set(key, value);
      }
    }
    const url = `${this.baseUrl}/?${qs.toString()}`;
    const response = await this.fetchWithRetry(url, {});
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `IP2Location API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as Record<string, unknown>;
    if (data['response'] && typeof data['response'] === 'string' && data['response'] !== 'OK') {
      return {
        content: [{ type: 'text', text: `IP2Location error: ${data['response']}` }],
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
    return this.query({
      ip: args.ip as string,
      package: (args.package as string | undefined) ?? 'WS3',
    });
  }

  private async lookupIpWithAddons(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ip) {
      return { content: [{ type: 'text', text: 'ip is required' }], isError: true };
    }
    return this.query({
      ip: args.ip as string,
      package: (args.package as string | undefined) ?? 'WS3',
      addon: args.addon as string | undefined,
      lang: args.lang as string | undefined,
    });
  }
}
