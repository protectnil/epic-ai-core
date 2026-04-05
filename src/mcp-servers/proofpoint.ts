/**
 * Proofpoint TAP MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official Proofpoint MCP server exists on GitHub or npm.
// Our adapter covers: 12 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api.
//
// Base URL: https://tap-api-v2.proofpoint.com
// Auth: HTTP Basic — service principal (username) + secret (password)
// Docs: https://help.proofpoint.com/Threat_Insight_Dashboard/API_Documentation
// Rate limits: SIEM endpoints (clicks/blocked, messages/delivered, all): 1800 req/24h.
//   clicks/permitted: 1800 req/24h (separate pool). Campaign IDs: 50 req/24h.
//   Forensics (per threatId, no campaign): 50 req/24h. Forensics (with campaign): 1800 req/24h.
//   People/VAP: 50 req/24h. People/top-clickers: 50 req/24h. URL decode: 1800 req/24h.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ProofpointConfig {
  /** Service principal (username) from Proofpoint TAP dashboard. */
  servicePrincipal: string;
  /** API secret (password) from Proofpoint TAP dashboard. */
  secret: string;
  /** Override base URL. Defaults to https://tap-api-v2.proofpoint.com */
  baseUrl?: string;
}

export class ProofpointMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: ProofpointConfig) {
    super();
    this.baseUrl = (config.baseUrl ?? 'https://tap-api-v2.proofpoint.com').replace(/\/$/, '');
    this.authHeader = `Basic ${btoa(`${config.servicePrincipal}:${config.secret}`)}`;
  }

  static catalog() {
    return {
      name: 'proofpoint',
      displayName: 'Proofpoint TAP',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'proofpoint', 'tap', 'email', 'phishing', 'malware', 'threat',
        'click', 'siem', 'campaign', 'forensics', 'vap', 'url', 'decode',
        'blocked', 'permitted', 'delivered', 'attack',
      ],
      toolNames: [
        'list_clicks_blocked',
        'list_clicks_permitted',
        'list_messages_blocked',
        'list_messages_delivered',
        'list_all_threats',
        'get_campaign',
        'list_campaigns',
        'get_threat_detail',
        'list_forensics',
        'get_vap',
        'list_top_clickers',
        'decode_urls',
      ],
      description:
        'Proofpoint TAP (Targeted Attack Protection): retrieve blocked/permitted clicks, blocked/delivered messages, campaign details, threat intelligence, forensic evidence, very attacked people (VAP), and decode rewritten URLs.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_clicks_blocked',
        description:
          'List URL clicks that were blocked by Proofpoint TAP, with optional time window and threat type filters.',
        inputSchema: {
          type: 'object',
          properties: {
            sinceSeconds: {
              type: 'number',
              description:
                'Seconds back from now to start the retrieval window (e.g. 3600 = last hour). Max 3600. Mutually exclusive with sinceTime/interval.',
            },
            sinceTime: {
              type: 'string',
              description:
                'ISO 8601 timestamp. Returns events since this time. Mutually exclusive with sinceSeconds/interval.',
            },
            interval: {
              type: 'string',
              description:
                'ISO 8601 time interval (e.g. PT1H or 2026-01-01T00:00:00Z/PT1H). Mutually exclusive with sinceSeconds/sinceTime.',
            },
            threatType: {
              type: 'string',
              description:
                'Filter by threat type: malware, phish (default: all types returned).',
            },
            threatStatus: {
              type: 'string',
              description:
                'Filter by threat status: active, cleared, falsePositive (default: active and cleared).',
            },
            format: {
              type: 'string',
              description: 'Response format: syslog or json (default: json).',
            },
          },
        },
      },
      {
        name: 'list_clicks_permitted',
        description:
          'List URL clicks that were permitted by Proofpoint TAP (threats that passed through), with optional time window and threat type filters.',
        inputSchema: {
          type: 'object',
          properties: {
            sinceSeconds: {
              type: 'number',
              description: 'Seconds back from now (max 3600). Mutually exclusive with sinceTime/interval.',
            },
            sinceTime: {
              type: 'string',
              description: 'ISO 8601 timestamp start. Mutually exclusive with sinceSeconds/interval.',
            },
            interval: {
              type: 'string',
              description: 'ISO 8601 interval. Mutually exclusive with sinceSeconds/sinceTime.',
            },
            threatType: {
              type: 'string',
              description: 'Filter by threat type: malware, phish.',
            },
            threatStatus: {
              type: 'string',
              description: 'Filter by threat status: active, cleared, falsePositive.',
            },
            format: {
              type: 'string',
              description: 'Response format: syslog or json (default: json).',
            },
          },
        },
      },
      {
        name: 'list_messages_blocked',
        description:
          'List email messages that were blocked by Proofpoint TAP, with optional time window and threat type filters.',
        inputSchema: {
          type: 'object',
          properties: {
            sinceSeconds: {
              type: 'number',
              description: 'Seconds back from now (max 3600). Mutually exclusive with sinceTime/interval.',
            },
            sinceTime: {
              type: 'string',
              description: 'ISO 8601 timestamp start. Mutually exclusive with sinceSeconds/interval.',
            },
            interval: {
              type: 'string',
              description: 'ISO 8601 interval. Mutually exclusive with sinceSeconds/sinceTime.',
            },
            threatType: {
              type: 'string',
              description: 'Filter by threat type: malware, phish, spam, impostor.',
            },
            threatStatus: {
              type: 'string',
              description: 'Filter by threat status: active, cleared, falsePositive.',
            },
            format: {
              type: 'string',
              description: 'Response format: syslog or json (default: json).',
            },
          },
        },
      },
      {
        name: 'list_messages_delivered',
        description:
          'List email messages delivered by Proofpoint TAP that contained known threats (post-delivery detections), with optional time window and threat type filters.',
        inputSchema: {
          type: 'object',
          properties: {
            sinceSeconds: {
              type: 'number',
              description: 'Seconds back from now (max 3600). Mutually exclusive with sinceTime/interval.',
            },
            sinceTime: {
              type: 'string',
              description: 'ISO 8601 timestamp start. Mutually exclusive with sinceSeconds/interval.',
            },
            interval: {
              type: 'string',
              description: 'ISO 8601 interval. Mutually exclusive with sinceSeconds/sinceTime.',
            },
            threatType: {
              type: 'string',
              description: 'Filter by threat type: malware, phish, spam, impostor.',
            },
            threatStatus: {
              type: 'string',
              description: 'Filter by threat status: active, cleared, falsePositive.',
            },
            format: {
              type: 'string',
              description: 'Response format: syslog or json (default: json).',
            },
          },
        },
      },
      {
        name: 'list_all_threats',
        description:
          'List all click and message threat events in a single call from Proofpoint TAP SIEM API (combines blocked clicks, permitted clicks, blocked messages, and delivered messages).',
        inputSchema: {
          type: 'object',
          properties: {
            sinceSeconds: {
              type: 'number',
              description: 'Seconds back from now (max 3600). Mutually exclusive with sinceTime/interval.',
            },
            sinceTime: {
              type: 'string',
              description: 'ISO 8601 timestamp start. Mutually exclusive with sinceSeconds/interval.',
            },
            interval: {
              type: 'string',
              description: 'ISO 8601 interval. Mutually exclusive with sinceSeconds/sinceTime.',
            },
            threatType: {
              type: 'string',
              description: 'Filter by threat type: malware, phish, spam, impostor.',
            },
            threatStatus: {
              type: 'string',
              description: 'Filter by threat status: active, cleared, falsePositive.',
            },
            format: {
              type: 'string',
              description: 'Response format: syslog or json (default: json).',
            },
          },
        },
      },
      {
        name: 'get_campaign',
        description:
          'Retrieve full details of a specific Proofpoint TAP malware or phishing campaign by campaign ID, including associated threats and messages.',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Unique campaign identifier (UUID from TAP dashboard or SIEM API events).',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_campaigns',
        description:
          'List IDs of campaigns active within a time window, sorted by last updated timestamp.',
        inputSchema: {
          type: 'object',
          properties: {
            interval: {
              type: 'string',
              description:
                'ISO 8601 interval covering the time window to query (e.g. PT24H for last 24 hours). Required.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            size: {
              type: 'number',
              description: 'Number of campaign IDs per page (default: 100, max: 200).',
            },
          },
          required: ['interval'],
        },
      },
      {
        name: 'get_threat_detail',
        description:
          'Retrieve detailed threat intelligence for a specific threat by ID, including malware family, attack techniques, and associated indicators of compromise.',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'Unique threat identifier (SHA256 hash or UUID from SIEM API events or TAP dashboard URL).',
            },
          },
          required: ['threat_id'],
        },
      },
      {
        name: 'list_forensics',
        description:
          'Retrieve forensic evidence for a threat or campaign, including file hashes, network indicators, registry artifacts, and mutex names useful for incident response.',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'Threat ID to retrieve forensics for. Use threat_id OR campaign_id, not both.',
            },
            campaign_id: {
              type: 'string',
              description: 'Campaign ID to retrieve forensics for. Use campaign_id OR threat_id, not both.',
            },
            includeCampaignForensics: {
              type: 'boolean',
              description:
                'If true, include forensics from the broader campaign when retrieving threat forensics (default: false).',
            },
          },
        },
      },
      {
        name: 'get_vap',
        description:
          'Retrieve Very Attacked People (VAP) — the most targeted users in your organization — with attack index scores and attack type breakdowns for a given time window.',
        inputSchema: {
          type: 'object',
          properties: {
            window: {
              type: 'number',
              description: 'Number of days to include: 14, 30, or 90 (required).',
            },
            size: {
              type: 'number',
              description: 'Maximum number of VAPs to return (default: 1000).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
          required: ['window'],
        },
      },
      {
        name: 'list_top_clickers',
        description:
          'Retrieve top URL clickers in your organization — users most likely to click malicious links — with attack index scores for a given time window.',
        inputSchema: {
          type: 'object',
          properties: {
            window: {
              type: 'number',
              description: 'Number of days to include: 14, 30, or 90 (required).',
            },
            size: {
              type: 'number',
              description: 'Maximum number of top clickers to return (default: 1000).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
          required: ['window'],
        },
      },
      {
        name: 'decode_urls',
        description:
          'Decode one or more Proofpoint-rewritten (TAP-protected) URLs back to their original target URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of Proofpoint-encoded URL strings to decode (up to 200 per request).',
            },
          },
          required: ['urls'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_clicks_blocked':
          return await this.siemEndpoint('/v2/siem/clicks/blocked', args);
        case 'list_clicks_permitted':
          return await this.siemEndpoint('/v2/siem/clicks/permitted', args);
        case 'list_messages_blocked':
          return await this.siemEndpoint('/v2/siem/messages/blocked', args);
        case 'list_messages_delivered':
          return await this.siemEndpoint('/v2/siem/messages/delivered', args);
        case 'list_all_threats':
          return await this.siemEndpoint('/v2/siem/all', args);
        case 'get_campaign':
          return await this.getCampaign(args);
        case 'list_campaigns':
          return await this.listCampaigns(args);
        case 'get_threat_detail':
          return await this.getThreatDetail(args);
        case 'list_forensics':
          return await this.listForensics(args);
        case 'get_vap':
          return await this.getVap(args);
        case 'list_top_clickers':
          return await this.listTopClickers(args);
        case 'decode_urls':
          return await this.decodeUrls(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Shared helper for all five SIEM endpoints that share the same query params. */
  private async siemEndpoint(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.sinceSeconds !== undefined) params.set('sinceSeconds', String(args.sinceSeconds));
    if (args.sinceTime) params.set('sinceTime', args.sinceTime as string);
    if (args.interval) params.set('interval', args.interval as string);
    if (args.threatType) params.set('threatType', args.threatType as string);
    if (args.threatStatus) params.set('threatStatus', args.threatStatus as string);
    // Default to JSON so the response is machine-readable
    params.set('format', (args.format as string) ?? 'json');

    const url = `${this.baseUrl}${path}?${params.toString()}`;
    const response = await this.fetchWithRetry(url, {
      headers: { 'Authorization': this.authHeader, 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Proofpoint API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return this.truncatedResult(data);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.campaign_id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/campaign/${encodeURIComponent(id)}`,
      { headers: { 'Authorization': this.authHeader, 'Accept': 'application/json' } },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Proofpoint API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    return this.truncatedResult(await response.json());
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const interval = args.interval as string;
    if (!interval) {
      return { content: [{ type: 'text', text: 'interval is required' }], isError: true };
    }

    const params = new URLSearchParams({ interval });
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.size !== undefined) params.set('size', String(args.size));

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/campaign/ids?${params.toString()}`,
      { headers: { 'Authorization': this.authHeader, 'Accept': 'application/json' } },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Proofpoint API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    return this.truncatedResult(await response.json());
  }

  private async getThreatDetail(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.threat_id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'threat_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/threat/summary/${encodeURIComponent(id)}`,
      { headers: { 'Authorization': this.authHeader, 'Accept': 'application/json' } },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Proofpoint API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    return this.truncatedResult(await response.json());
  }

  private async listForensics(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.threat_id) params.set('threatId', args.threat_id as string);
    if (args.campaign_id) params.set('campaignId', args.campaign_id as string);
    if (args.includeCampaignForensics) params.set('includeCampaignForensics', 'true');

    if (!args.threat_id && !args.campaign_id) {
      return { content: [{ type: 'text', text: 'threat_id or campaign_id is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/forensics?${params.toString()}`,
      { headers: { 'Authorization': this.authHeader, 'Accept': 'application/json' } },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Proofpoint API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    return this.truncatedResult(await response.json());
  }

  private async getVap(args: Record<string, unknown>): Promise<ToolResult> {
    const window = args.window as number;
    if (!window) {
      return { content: [{ type: 'text', text: 'window is required (14, 30, or 90)' }], isError: true };
    }

    const params = new URLSearchParams({ window: String(window) });
    if (args.size !== undefined) params.set('size', String(args.size));
    if (args.page !== undefined) params.set('page', String(args.page));

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/people/vap?${params.toString()}`,
      { headers: { 'Authorization': this.authHeader, 'Accept': 'application/json' } },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Proofpoint API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    return this.truncatedResult(await response.json());
  }

  private async listTopClickers(args: Record<string, unknown>): Promise<ToolResult> {
    const window = args.window as number;
    if (!window) {
      return { content: [{ type: 'text', text: 'window is required (14, 30, or 90)' }], isError: true };
    }

    const params = new URLSearchParams({ window: String(window) });
    if (args.size !== undefined) params.set('size', String(args.size));
    if (args.page !== undefined) params.set('page', String(args.page));

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/people/top-clickers?${params.toString()}`,
      { headers: { 'Authorization': this.authHeader, 'Accept': 'application/json' } },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Proofpoint API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    return this.truncatedResult(await response.json());
  }

  private async decodeUrls(args: Record<string, unknown>): Promise<ToolResult> {
    const urls = args.urls as string[];
    if (!urls || urls.length === 0) {
      return { content: [{ type: 'text', text: 'urls array is required and must not be empty' }], isError: true };
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/url/decode`,
      {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ urls }),
      },
    );

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Proofpoint API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    return this.truncatedResult(await response.json());
  }

  /** JSON-stringify with 10KB truncation guard. */
  private truncatedResult(data: unknown): ToolResult {
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }
}
