/**
 * Walmart Price Management MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None as of 2026-03. Walmart has not published an official MCP server.
//
// Base URL: https://marketplace.walmartapis.com (production)
//           https://sandbox.walmartapis.com (sandbox)
// Auth: OAuth2 Bearer token — WM_SEC.ACCESS_TOKEN header
//   Required headers on every request:
//     WM_SEC.ACCESS_TOKEN — OAuth2 access token
//     WM_CONSUMER.CHANNEL.TYPE — channel type identifier
//     WM_QOS.CORRELATION_ID — correlation ID (UUID)
//     WM_SVC.NAME — service name (e.g. "Walmart Marketplace")
// Spec: https://api.apis.guru/v2/specs/walmart.com/price/1.0.0/openapi.json
// Category: ecommerce
// Docs: https://developer.walmart.com/api/us/mp/price

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WalmartPriceConfig {
  accessToken: string;
  channelType?: string;
  serviceName?: string;
  sandbox?: boolean;
  baseUrl?: string;
}

export class WalmartPriceMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly channelType: string;
  private readonly serviceName: string;
  private readonly baseUrl: string;

  constructor(config: WalmartPriceConfig) {
    super();
    this.accessToken = config.accessToken;
    this.channelType = config.channelType || '';
    this.serviceName = config.serviceName || 'Walmart Marketplace';
    const defaultBase = config.sandbox
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com';
    this.baseUrl = config.baseUrl || defaultBase;
  }

  static catalog() {
    return {
      name: 'walmart-price',
      displayName: 'Walmart Price Management',
      version: '1.0.0',
      category: 'ecommerce' as const,
      keywords: ['walmart', 'price', 'marketplace', 'ecommerce', 'listing', 'cap', 'bulk', 'feed', 'seller'],
      toolNames: [
        'update_price',
        'bulk_update_prices',
        'set_cap_program_price',
        'get_price_feed_status',
      ],
      description: 'Manage item prices on Walmart Marketplace: update single prices, bulk upload via feed, configure CAP (Competitive Price Adjustment) program SKUs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'update_price',
        description: 'Update the price for a single Walmart Marketplace item using the PUT /v3/price endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            price_xml: {
              type: 'string',
              description: 'Price XML payload as required by Walmart API (includes sku, currency, amount)',
            },
            correlation_id: {
              type: 'string',
              description: 'Unique correlation ID (UUID) for tracing this request',
            },
          },
          required: ['price_xml'],
        },
      },
      {
        name: 'bulk_update_prices',
        description: 'Upload a bulk price feed for multiple items using the POST /v3/feeds endpoint with feedType=price',
        inputSchema: {
          type: 'object',
          properties: {
            feed_payload: {
              type: 'string',
              description: 'The feed file content (XML or JSON) containing multiple item price updates',
            },
            feed_type: {
              type: 'string',
              description: 'Feed type — use "price" for standard price updates (default: "price")',
            },
            correlation_id: {
              type: 'string',
              description: 'Unique correlation ID (UUID) for tracing this request',
            },
          },
          required: ['feed_payload'],
        },
      },
      {
        name: 'set_cap_program_price',
        description: 'Set up CAP (Competitive Price Adjustment) SKU pricing using the POST /v3/cppreference endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            cap_payload: {
              type: 'string',
              description: 'CAP reference payload (XML or JSON) defining the SKU CAP program enrollment',
            },
            correlation_id: {
              type: 'string',
              description: 'Unique correlation ID (UUID) for tracing this request',
            },
          },
          required: ['cap_payload'],
        },
      },
      {
        name: 'get_price_feed_status',
        description: 'Check the ingestion status of a previously submitted price feed by feedId',
        inputSchema: {
          type: 'object',
          properties: {
            feed_id: {
              type: 'string',
              description: 'The feedId returned when the bulk price feed was submitted',
            },
            include_details: {
              type: 'boolean',
              description: 'Include per-item details in the status response (default: false)',
            },
            correlation_id: {
              type: 'string',
              description: 'Unique correlation ID (UUID) for tracing this request',
            },
          },
          required: ['feed_id'],
        },
      },
    ];
  }

  private buildHeaders(correlationId?: string): Record<string, string> {
    return {
      'WM_SEC.ACCESS_TOKEN': this.accessToken,
      'WM_CONSUMER.CHANNEL.TYPE': this.channelType,
      'WM_QOS.CORRELATION_ID': correlationId || `mcp-${Date.now()}`,
      'WM_SVC.NAME': this.serviceName,
      Accept: 'application/json',
    };
  }

  private async fetch(
    path: string,
    method: string,
    headers: Record<string, string>,
    body?: string,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await this.fetchWithRetry(url, { method, headers, body });
      const text = await res.text();
      const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n…[truncated]' : text;
      if (!res.ok) {
        return {
          content: [{ type: 'text', text: `HTTP ${res.status} ${res.statusText}: ${truncated}` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text', text: truncated }], isError: false };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Request failed: ${String(err)}` }],
        isError: true,
      };
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'update_price': {
          const headers = this.buildHeaders(args.correlation_id as string | undefined);
          headers['Content-Type'] = 'application/xml';
          return await this.fetch('/v3/price', 'PUT', headers, String(args.price_xml ?? ''));
        }

        case 'bulk_update_prices': {
          const feedType = String(args.feed_type ?? 'price');
          const headers = this.buildHeaders(args.correlation_id as string | undefined);
          headers['Content-Type'] = 'application/octet-stream';
          return await this.fetch(
            `/v3/feeds?feedType=${encodeURIComponent(feedType)}`,
            'POST',
            headers,
            String(args.feed_payload ?? ''),
          );
        }

        case 'set_cap_program_price': {
          const headers = this.buildHeaders(args.correlation_id as string | undefined);
          headers['Content-Type'] = 'application/xml';
          return await this.fetch('/v3/cppreference', 'POST', headers, String(args.cap_payload ?? ''));
        }

        case 'get_price_feed_status': {
          const feedId = String(args.feed_id ?? '');
          const includeDetails = args.include_details === true ? 'true' : 'false';
          const headers = this.buildHeaders(args.correlation_id as string | undefined);
          return await this.fetch(
            `/v3/feeds/${encodeURIComponent(feedId)}?includeDetails=${includeDetails}`,
            'GET',
            headers,
          );
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Tool execution error: ${String(err)}` }],
        isError: true,
      };
    }
  }
}
