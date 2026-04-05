/**
 * papiNet Order Status MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official papiNet MCP server exists.
// Our adapter covers: 2 tools — list orders and get a specific order.
// Recommendation: Use this adapter for papiNet forest/paper supply chain order status integration.
//
// Base URL: https://papinet.papinet.io
// Auth: Not specified in the OpenAPI spec; contact papiNet CWG for enterprise access credentials.
// Docs: https://github.com/papinet/papiNet-API
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PapiNetOrderStatusConfig {
  /** Optional Bearer token or API key for authentication */
  apiKey?: string;
  /** Optional base URL override (default: https://papinet.papinet.io) */
  baseUrl?: string;
}

export class PapiNetOrderStatusMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: PapiNetOrderStatusConfig) {
    super();
    this.apiKey = config.apiKey ?? '';
    this.baseUrl = config.baseUrl ?? 'https://papinet.papinet.io';
  }

  static catalog() {
    return {
      name: 'papinet-order-status',
      displayName: 'papiNet Order Status',
      version: '1.0.0',
      category: 'logistics',
      keywords: [
        'papinet', 'order', 'order status', 'supply chain', 'forest', 'paper',
        'pulp', 'logistics', 'manufacturing', 'ecommerce', 'b2b', 'procurement',
        'shipment', 'delivery', 'order tracking', 'paper industry',
      ],
      toolNames: [
        'list_orders',
        'get_order',
      ],
      description: 'papiNet API for the forest and paper supply chain — list and retrieve order status records for B2B paper and pulp procurement workflows.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_orders',
        description: 'List papiNet supply chain orders with optional filtering by status, pagination offset, and result limit',
        inputSchema: {
          type: 'object',
          properties: {
            orderStatus: {
              type: 'string',
              description: 'Filter orders by status (e.g. "Active", "Completed", "Cancelled") — omit to return all statuses',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset — number of records to skip before returning results (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of orders to return per page (default: determined by server)',
            },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Get detailed status and line item information for a specific papiNet order by its order ID',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Unique identifier of the papiNet order to retrieve',
            },
          },
          required: ['orderId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_orders':
          return this.listOrders(args);
        case 'get_order':
          return this.getOrder(args);
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

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    return headers;
  }

  private async fetchGet(path: string, queryParams?: Record<string, string | number | undefined>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const response = await this.fetchWithRetry(url.toString(), { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`papiNet returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const queryParams: Record<string, string | number | undefined> = {};
    if (args.orderStatus !== undefined) queryParams['orderStatus'] = args.orderStatus as string;
    if (args.offset !== undefined) queryParams['offset'] = args.offset as number;
    if (args.limit !== undefined) queryParams['limit'] = args.limit as number;
    return this.fetchGet('/orders', queryParams);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId) return { content: [{ type: 'text', text: 'orderId is required' }], isError: true };
    return this.fetchGet(`/orders/${encodeURIComponent(args.orderId as string)}`);
  }
}
