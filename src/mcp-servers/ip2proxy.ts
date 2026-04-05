/**
 * IP2Proxy MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official IP2Proxy MCP server was found on GitHub.
// Note: New registrations for the legacy ip2proxy.com web service are discontinued.
// Existing API keys continue to work. New users should use IP2Location.io.
//
// Base URL: https://api.ip2proxy.com
// Auth: key query parameter (sign up at https://www.ip2location.com/web-service/ip2proxy)
// Docs: https://www.ip2location.com/web-service/ip2proxy
// Rate limits: Credit-based. Credits deducted per query vary by package (PX1=1 credit through PX11=11 credits).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Ip2ProxyConfig {
  apiKey: string;
  baseUrl?: string;
}

export class Ip2ProxyMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: Ip2ProxyConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.ip2proxy.com';
  }

  static catalog() {
    return {
      name: 'ip2proxy',
      displayName: 'IP2Proxy',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'ip2proxy', 'proxy detection', 'vpn detection', 'tor', 'proxy', 'vpn',
        'anonymizer', 'ip lookup', 'threat detection', 'fraud prevention',
        'botnet', 'spam', 'scanner', 'residential proxy', 'datacenter',
        'public proxy', 'web proxy', 'search engine robot', 'ip intelligence',
        'is proxy', 'proxy type', 'usage type', 'isp', 'asn', 'last seen',
        'threat', 'provider', 'cybersecurity', 'ip address', 'geolocation',
      ],
      toolNames: [
        'detect_proxy',
        'detect_proxy_full',
      ],
      description: 'IP2Proxy proxy and VPN detection: check any IPv4 or IPv6 address for proxy, VPN, Tor, datacenter, residential proxy, threat type, ISP, ASN, and provider information.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'detect_proxy',
        description: 'Check if an IPv4 or IPv6 address is a proxy, VPN, or Tor exit node. Returns country, isProxy flag, and proxy type using the specified detection package (PX1 through PX11)',
        inputSchema: {
          type: 'object',
          properties: {
            ip: {
              type: 'string',
              description: 'IPv4 or IPv6 address to check (e.g. 8.8.8.8). If omitted, the calling server IP is used.',
            },
            package: {
              type: 'string',
              description: 'Detection package: PX1=country+isProxy, PX2 adds proxyType, PX3 adds region+city, PX4 adds ISP, PX5 adds domain, PX6 adds usageType, PX7 adds ASN, PX8 adds lastSeen, PX9 adds threat, PX10 adds residential, PX11 adds provider. Default: PX2',
              enum: ['PX1', 'PX2', 'PX3', 'PX4', 'PX5', 'PX6', 'PX7', 'PX8', 'PX9', 'PX10', 'PX11'],
            },
          },
        },
      },
      {
        name: 'detect_proxy_full',
        description: 'Full proxy and threat intelligence for an IPv4 or IPv6 address (PX11): country, region, city, ISP, domain, usage type, ASN, last seen in days, proxy type (VPN/TOR/DCH/PUB/WEB/SES/RES), isProxy flag, threat category (SPAM/SCANNER/BOTNET), residential flag, and provider name',
        inputSchema: {
          type: 'object',
          properties: {
            ip: {
              type: 'string',
              description: 'IPv4 or IPv6 address to check (e.g. 185.195.4.30). If omitted, the calling server IP is used.',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'detect_proxy':      return this.detectProxy(args);
        case 'detect_proxy_full': return this.detectProxyFull(args);
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
        content: [{ type: 'text', text: `IP2Proxy API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as Record<string, unknown>;
    if (data['response'] && typeof data['response'] === 'string' && data['response'] !== 'OK') {
      return {
        content: [{ type: 'text', text: `IP2Proxy error: ${data['response']}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool methods ───────────────────────────────────────────────────────────

  private async detectProxy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.query({
      ip: args.ip as string | undefined,
      package: (args.package as string | undefined) ?? 'PX2',
    });
  }

  private async detectProxyFull(args: Record<string, unknown>): Promise<ToolResult> {
    return this.query({
      ip: args.ip as string | undefined,
      package: 'PX11',
    });
  }
}
