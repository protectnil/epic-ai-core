/**
 * NPR Sponsorship MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official vendor MCP server found.
// Our adapter covers: 2 tools (get ads, record ad tracking).
// Community MCP servers: None found for this service.
// Recommendation: Use this adapter for full NPR sponsorship coverage.
//
// Base URL: https://sponsorship.api.npr.org
// Auth: OAuth2 Bearer token (passed as Authorization header)
// Docs: https://dev.npr.org/guide/app-experience/sponsorship/
// Note: Not for use by NPR One clients — designed for non-NPR One applications.
// Rate limits: Contact NPROneEnterprise@npr.org for rate limit details.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NprSponsorshipConfig {
  accessToken: string;
  /** Optional base URL override (default: https://sponsorship.api.npr.org) */
  baseUrl?: string;
}

export class NprSponsorshipMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: NprSponsorshipConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://sponsorship.api.npr.org';
  }

  static catalog() {
    return {
      name: 'npr-sponsorship',
      displayName: 'NPR Sponsorship',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'npr', 'sponsorship', 'ads', 'advertising', 'vast', 'radio',
        'public radio', 'media', 'audio', 'tracking', 'sponsorship units',
      ],
      toolNames: [
        'get_ads',
        'record_ad_tracking',
      ],
      description: 'NPR Sponsorship Service for non-NPR One client applications — request VAST sponsorship units and submit ad tracking data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_ads',
        description: 'Request VAST sponsorship units for display in non-NPR One client applications — returns ad content from the external sponsorship provider',
        inputSchema: {
          type: 'object',
          properties: {
            force_result: {
              type: 'boolean',
              description: 'Whether to force a synchronous call to the external sponsorship provider; default is asynchronous behavior',
            },
            ad_count: {
              type: 'integer',
              description: 'How many sponsorship units to request in one call; defaults to provider default if not specified',
            },
            advertising_id: {
              type: 'string',
              description: 'Advertising identifier for the device (X-Advertising-ID header), used for ad targeting',
            },
          },
        },
      },
      {
        name: 'record_ad_tracking',
        description: 'Submit ad tracking data for VAST sponsorship units that were previously requested — records impressions, clicks, and completion events',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_data: {
              type: 'object',
              description: 'Sponsorship tracking data to submit; should include items array with tracking URLs and event types from the original ad response',
            },
            advertising_id: {
              type: 'string',
              description: 'Advertising identifier for the device (X-Advertising-ID header), used for ad attribution',
            },
          },
          required: ['tracking_data'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_ads':
          return this.getAds(args);
        case 'record_ad_tracking':
          return this.recordAdTracking(args);
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

  private authHeaders(advertisingId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
    if (advertisingId) {
      headers['X-Advertising-ID'] = advertisingId;
    }
    return headers;
  }

  private async getAds(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.force_result !== undefined) params.set('forceResult', String(args.force_result));
    if (args.ad_count !== undefined) params.set('adCount', String(args.ad_count));

    const qs = params.toString();
    const url = `${this.baseUrl}/v2/ads${qs ? `?${qs}` : ''}`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.authHeaders(args.advertising_id as string | undefined),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`NPR Sponsorship returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async recordAdTracking(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracking_data) {
      return { content: [{ type: 'text', text: 'tracking_data is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/ads`, {
      method: 'POST',
      headers: this.authHeaders(args.advertising_id as string | undefined),
      body: JSON.stringify(args.tracking_data),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`NPR Sponsorship returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
