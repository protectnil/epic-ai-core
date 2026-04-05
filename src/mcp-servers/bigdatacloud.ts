/**
 * BigDataCloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: https://api.bigdatacloud.net
// Auth: API key via 'key' query parameter (free tier available, premium with key)
// Docs: https://www.bigdatacloud.com/docs/
// Spec: https://api.apis.guru/v2/specs/bigdatacloud.net/1.0.0/openapi.json
// Rate limits: Depends on plan; free tier has hourly limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BigDataCloudConfig {
  /** API key from BigDataCloud dashboard (optional for free endpoints) */
  apiKey?: string;
  baseUrl?: string;
}

const TRUNCATE = 10 * 1024;

export class BigdatacloudMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BigDataCloudConfig = {}) {
    super();
    this.apiKey = config.apiKey || '';
    this.baseUrl = (config.baseUrl || 'https://api.bigdatacloud.net').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'bigdatacloud',
      displayName: 'BigDataCloud',
      version: '1.0.0',
      category: 'data' as const,
      keywords: [
        'bigdatacloud', 'ip geolocation', 'geolocation', 'ip address', 'location',
        'reverse geocoding', 'network', 'latitude', 'longitude', 'country',
        'timezone', 'isp', 'asn', 'threat intelligence', 'confidence',
      ],
      toolNames: [
        'geolocate_ip_full',
        'geolocate_ip_with_confidence',
      ],
      description: 'BigDataCloud IP geolocation: get comprehensive geolocation data including confidence area, hazard reports, ISP info, and threat intelligence for any IP address.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'geolocate_ip_full',
        description: 'Get full IP geolocation with confidence area and hazard report. Returns location, network, timezone, ISP/ASN, and threat intelligence.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IPv4 or IPv6 address to geolocate. Omit or use "me" for the caller\'s IP.' },
            localityLanguage: { type: 'string', description: 'ISO 639-1 language code for locality names (default: en)' },
          },
        },
      },
      {
        name: 'geolocate_ip_with_confidence',
        description: 'Get IP geolocation with confidence area (without full hazard report). Faster and lighter than the full endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IPv4 or IPv6 address to geolocate. Omit or use "me" for the caller\'s IP.' },
            localityLanguage: { type: 'string', description: 'ISO 639-1 language code for locality names (default: en)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const result = await this._dispatch(name, args);
      const text = JSON.stringify(result);
      return {
        content: [{ type: 'text', text: text.length > TRUNCATE ? text.slice(0, TRUNCATE) + '…[truncated]' : text }],
        isError: false,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }

  private async _fetch(path: string): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchWithRetry(url, {});
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`BigDataCloud API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  private _qs(params: Record<string, unknown>): string {
    const p: string[] = [];
    if (this.apiKey) p.push(`key=${encodeURIComponent(this.apiKey)}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) p.push(`${k}=${encodeURIComponent(String(v))}`);
    }
    return p.length ? '?' + p.join('&') : '';
  }

  private async _dispatch(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'geolocate_ip_full': {
        const qs = this._qs({ ip: args.ip, localityLanguage: args.localityLanguage });
        return this._fetch(`/data/ip-geolocation-full${qs}`);
      }
      case 'geolocate_ip_with_confidence': {
        const qs = this._qs({ ip: args.ip, localityLanguage: args.localityLanguage });
        return this._fetch(`/data/ip-geolocation-with-confidence${qs}`);
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
