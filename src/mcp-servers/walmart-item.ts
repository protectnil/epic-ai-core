/**
 * Walmart Item API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Spec: https://api.apis.guru/v2/specs/walmart.com/item/3.0.1/swagger.json
// Base URL: https://marketplace.walmartapis.com
// Auth: Walmart Marketplace — OAuth2 (client_id + client_secret → Bearer token).
//   Token endpoint: https://marketplace.walmartapis.com/v3/token
//   Required headers per call: WM_SEC.ACCESS_TOKEN, WM_QOS.CORRELATION_ID, WM_SVC.NAME, Accept.
// Docs: https://developer.walmart.com/api/us/mp/items
// Rate limits: 10 req/s per endpoint (Marketplace standard).
// Note: Feed uploads are async — upload returns a feedId, poll get_feed_status for completion.
//
// Tools (4): list_feeds, get_feed_status, list_feeds_v2, get_feed_status_v2.
// (Upload requires multipart form — excluded; use Walmart Seller Center for bulk uploads.)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WalmartItemConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class WalmartItemMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: WalmartItemConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://marketplace.walmartapis.com';
  }

  static catalog() {
    return {
      name: 'walmart-item',
      displayName: 'Walmart Marketplace Items',
      version: '1.0.0',
      category: 'ecommerce',
      keywords: [
        'walmart', 'walmart marketplace', 'items', 'catalog', 'products', 'listings',
        'feed', 'bulk upload', 'item feed', 'seller', 'marketplace', 'sku', 'ecommerce',
        'product catalog', 'inventory feed',
      ],
      toolNames: [
        'list_feeds', 'get_feed_status',
        'list_feeds_v2', 'get_feed_status_v2',
      ],
      description: 'Walmart Marketplace Item API: check feed statuses and monitor item catalog uploads for sellers.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_feeds',
        description: 'List item feed submissions and their statuses. Use to monitor bulk item upload jobs. Returns feedId, status, and item counts.',
        inputSchema: {
          type: 'object',
          properties: {
            feed_id: {
              type: 'string',
              description: 'Filter to a specific feed by feedId',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset (default: 0)',
            },
            limit: {
              type: 'string',
              description: 'Number of results to return (default: 50, max: 50)',
            },
          },
        },
      },
      {
        name: 'get_feed_status',
        description: 'Get detailed item-level status for a specific feed submission — shows which items succeeded or failed ingestion',
        inputSchema: {
          type: 'object',
          properties: {
            feed_id: {
              type: 'string',
              description: 'The feedId returned when the feed was uploaded',
            },
            include_details: {
              type: 'string',
              description: 'Set to true to include per-item ingestion details (default: false)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset for item details (default: 0)',
            },
            limit: {
              type: 'string',
              description: 'Number of item detail records to return (default: 50, max: 50)',
            },
          },
          required: ['feed_id'],
        },
      },
      {
        name: 'list_feeds_v2',
        description: 'List item feed submissions using the v2 API endpoint — legacy version, prefer list_feeds (v3) for new integrations',
        inputSchema: {
          type: 'object',
          properties: {
            feed_id: {
              type: 'string',
              description: 'Filter to a specific feed by feedId',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset (default: 0)',
            },
            limit: {
              type: 'string',
              description: 'Number of results to return (default: 50, max: 50)',
            },
          },
        },
      },
      {
        name: 'get_feed_status_v2',
        description: 'Get detailed item-level status for a specific feed using the v2 API endpoint — legacy version, prefer get_feed_status (v3)',
        inputSchema: {
          type: 'object',
          properties: {
            feed_id: {
              type: 'string',
              description: 'The feedId returned when the feed was uploaded',
            },
            include_details: {
              type: 'string',
              description: 'Set to true to include per-item ingestion details (default: false)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset for item details (default: 0)',
            },
            limit: {
              type: 'string',
              description: 'Number of item detail records to return (default: 50, max: 50)',
            },
          },
          required: ['feed_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_feeds':
          return this.listFeeds(args, 'v3');
        case 'get_feed_status':
          return this.getFeedStatus(args, 'v3');
        case 'list_feeds_v2':
          return this.listFeeds(args, 'v2');
        case 'get_feed_status_v2':
          return this.getFeedStatus(args, 'v2');
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

  // ---- Auth ----

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now) {
      return this.accessToken;
    }
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await this.fetchWithRetry(`${this.baseUrl}/v3/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'WM_SVC.NAME': 'Walmart Marketplace',
        'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`Walmart token fetch failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'WM_SEC.ACCESS_TOKEN': token,
      'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
      'WM_SVC.NAME': 'Walmart Marketplace',
      Accept: 'application/json',
    };
  }

  // ---- HTTP helpers ----


  private async walmartGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const hdrs = await this.headers();
    const qs = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: hdrs });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${body ? ' — ' + body.slice(0, 500) : ''}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ---- Tool implementations ----

  private async listFeeds(args: Record<string, unknown>, version: 'v2' | 'v3'): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.feed_id) params.feedId = args.feed_id as string;
    if (args.offset) params.offset = args.offset as string;
    if (args.limit) params.limit = args.limit as string;
    return this.walmartGet(`/${version}/feeds`, params);
  }

  private async getFeedStatus(args: Record<string, unknown>, version: 'v2' | 'v3'): Promise<ToolResult> {
    if (!args.feed_id) {
      return { content: [{ type: 'text', text: 'feed_id is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.include_details) params.includeDetails = args.include_details as string;
    if (args.offset) params.offset = args.offset as string;
    if (args.limit) params.limit = args.limit as string;
    return this.walmartGet(`/${version}/feeds/${encodeURIComponent(args.feed_id as string)}`, params);
  }
}
