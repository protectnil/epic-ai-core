/**
 * Walmart Order API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Spec: https://api.apis.guru/v2/specs/walmart.com/order/3.0.1/swagger.json
// Base URL: https://marketplace.walmartapis.com
// Auth: Walmart Marketplace — Basic auth (Consumer ID + private key) or OAuth2 (client_id + client_secret → Bearer token).
//   Token endpoint: https://marketplace.walmartapis.com/v3/token
//   Required headers per call: WM_SEC.ACCESS_TOKEN, WM_QOS.CORRELATION_ID, WM_SVC.NAME, Accept.
// Docs: https://developer.walmart.com/api/us/mp/orders
// Rate limits: 10 req/s per endpoint (Marketplace standard).
//
// Tools (9): list_orders, list_released_orders, get_released_orders_next_page,
//   get_order, get_orders_next_page, acknowledge_order, cancel_order, refund_order, ship_order.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WalmartOrderConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class WalmartOrderMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: WalmartOrderConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://marketplace.walmartapis.com';
  }

  static catalog() {
    return {
      name: 'walmart-order',
      displayName: 'Walmart Marketplace Orders',
      version: '1.0.0',
      category: 'ecommerce',
      keywords: [
        'walmart', 'walmart marketplace', 'orders', 'order management', 'ecommerce',
        'purchase order', 'shipping', 'fulfillment', 'cancel order', 'refund', 'acknowledge',
        'seller', 'marketplace', 'retail',
      ],
      toolNames: [
        'list_orders', 'list_released_orders', 'get_released_orders_next_page',
        'get_order', 'get_orders_next_page',
        'acknowledge_order', 'cancel_order', 'refund_order', 'ship_order',
      ],
      description: 'Walmart Marketplace Order API: list, retrieve, acknowledge, cancel, refund, and update shipping for seller orders.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_orders',
        description: 'List all Walmart Marketplace orders with optional filters for status, date range, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              description: 'Filter by item SKU',
            },
            customer_order_id: {
              type: 'string',
              description: 'Filter by customer order ID',
            },
            purchase_order_id: {
              type: 'string',
              description: 'Filter by Walmart purchase order ID',
            },
            status: {
              type: 'string',
              description: 'Filter by order status: Created, Acknowledged, Shipped, Cancelled, Delivered',
            },
            created_start_date: {
              type: 'string',
              description: 'Filter orders created on or after this date (ISO 8601, e.g. 2024-01-01T00:00:00.000Z)',
            },
            created_end_date: {
              type: 'string',
              description: 'Filter orders created on or before this date (ISO 8601)',
            },
            from_expected_ship_date: {
              type: 'string',
              description: 'Filter by expected ship date start (ISO 8601)',
            },
            to_expected_ship_date: {
              type: 'string',
              description: 'Filter by expected ship date end (ISO 8601)',
            },
            limit: {
              type: 'string',
              description: 'Number of results per page (default: 10, max: 200)',
            },
          },
        },
      },
      {
        name: 'list_released_orders',
        description: 'List all released (ready to ship) Walmart Marketplace orders starting from a given date',
        inputSchema: {
          type: 'object',
          properties: {
            created_start_date: {
              type: 'string',
              description: 'Start date for released orders (ISO 8601, required by Walmart API)',
            },
            limit: {
              type: 'string',
              description: 'Number of results per page (default: 10, max: 200)',
            },
            product_info: {
              type: 'string',
              description: 'Set to Y to include product info in response',
            },
            ship_node_type: {
              type: 'string',
              description: 'Filter by ship node type: SellerFulfilled, WFSFulfilled, WhymaxFulfilled',
            },
          },
        },
      },
      {
        name: 'get_released_orders_next_page',
        description: 'Retrieve the next page of released orders using a cursor from a previous list_released_orders call',
        inputSchema: {
          type: 'object',
          properties: {
            next_cursor: {
              type: 'string',
              description: 'The nextCursor value returned by a previous list_released_orders response',
            },
          },
          required: ['next_cursor'],
        },
      },
      {
        name: 'get_order',
        description: 'Get full details of a single Walmart order by purchase order ID',
        inputSchema: {
          type: 'object',
          properties: {
            purchase_order_id: {
              type: 'string',
              description: 'Walmart purchase order ID (e.g. 1796277083022)',
            },
            product_info: {
              type: 'string',
              description: 'Set to Y to include product info in response',
            },
          },
          required: ['purchase_order_id'],
        },
      },
      {
        name: 'get_orders_next_page',
        description: 'Retrieve the next page of orders using a cursor from a previous list_orders call',
        inputSchema: {
          type: 'object',
          properties: {
            next_cursor: {
              type: 'string',
              description: 'The nextCursor value returned by a previous list_orders response',
            },
          },
          required: ['next_cursor'],
        },
      },
      {
        name: 'acknowledge_order',
        description: 'Acknowledge receipt of a Walmart order to confirm you have received it and will fulfill it',
        inputSchema: {
          type: 'object',
          properties: {
            purchase_order_id: {
              type: 'string',
              description: 'Walmart purchase order ID to acknowledge',
            },
          },
          required: ['purchase_order_id'],
        },
      },
      {
        name: 'cancel_order',
        description: 'Cancel one or more order lines for a Walmart order',
        inputSchema: {
          type: 'object',
          properties: {
            purchase_order_id: {
              type: 'string',
              description: 'Walmart purchase order ID',
            },
            order_lines: {
              type: 'string',
              description: 'JSON object with orderLines array. Each entry: { lineNumber, orderLineStatuses: [{ status: "Cancelled", cancellationReason, statusQuantity: { unitOfMeasurement, amount } }] }',
            },
          },
          required: ['purchase_order_id', 'order_lines'],
        },
      },
      {
        name: 'refund_order',
        description: 'Issue a refund for one or more order lines on a Walmart order',
        inputSchema: {
          type: 'object',
          properties: {
            purchase_order_id: {
              type: 'string',
              description: 'Walmart purchase order ID',
            },
            order_lines: {
              type: 'string',
              description: 'JSON object with orderLines array. Each entry: { lineNumber, refunds: [{ refundComments, refundCharges: [{ refundReason, charge: { chargeType, chargeName, chargeAmount: { currency, amount }, tax } }] }] }',
            },
          },
          required: ['purchase_order_id', 'order_lines'],
        },
      },
      {
        name: 'ship_order',
        description: 'Update shipping information for one or more order lines — marks lines as shipped with tracking details',
        inputSchema: {
          type: 'object',
          properties: {
            purchase_order_id: {
              type: 'string',
              description: 'Walmart purchase order ID',
            },
            order_lines: {
              type: 'string',
              description: 'JSON object with orderLines array. Each entry: { lineNumber, orderLineStatuses: [{ status: "Shipped", statusQuantity, trackingInfo: { shipDateTime, carrierName: { otherCarrier, carrier }, methodCode, trackingNumber, trackingURL } }] }',
            },
          },
          required: ['purchase_order_id', 'order_lines'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_orders':
          return this.listOrders(args);
        case 'list_released_orders':
          return this.listReleasedOrders(args);
        case 'get_released_orders_next_page':
          return this.getReleasedOrdersNextPage(args);
        case 'get_order':
          return this.getOrder(args);
        case 'get_orders_next_page':
          return this.getOrdersNextPage(args);
        case 'acknowledge_order':
          return this.acknowledgeOrder(args);
        case 'cancel_order':
          return this.cancelOrder(args);
        case 'refund_order':
          return this.refundOrder(args);
        case 'ship_order':
          return this.shipOrder(args);
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
      'Content-Type': 'application/json',
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

  private async walmartPost(path: string, body: unknown): Promise<ToolResult> {
    const hdrs = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errBody ? ' — ' + errBody.slice(0, 500) : ''}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ---- Tool implementations ----

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.sku) params.sku = args.sku as string;
    if (args.customer_order_id) params.customerOrderId = args.customer_order_id as string;
    if (args.purchase_order_id) params.purchaseOrderId = args.purchase_order_id as string;
    if (args.status) params.status = args.status as string;
    if (args.created_start_date) params.createdStartDate = args.created_start_date as string;
    if (args.created_end_date) params.createdEndDate = args.created_end_date as string;
    if (args.from_expected_ship_date) params.fromExpectedShipDate = args.from_expected_ship_date as string;
    if (args.to_expected_ship_date) params.toExpectedShipDate = args.to_expected_ship_date as string;
    if (args.limit) params.limit = args.limit as string;
    return this.walmartGet('/v3/orders', params);
  }

  private async listReleasedOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.created_start_date) params.createdStartDate = args.created_start_date as string;
    if (args.limit) params.limit = args.limit as string;
    if (args.product_info) params.productInfo = args.product_info as string;
    if (args.ship_node_type) params.shipNodeType = args.ship_node_type as string;
    return this.walmartGet('/v3/orders/released', params);
  }

  private async getReleasedOrdersNextPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.next_cursor) {
      return { content: [{ type: 'text', text: 'next_cursor is required' }], isError: true };
    }
    return this.walmartGet(`/v3/orders/released${encodeURIComponent(args.next_cursor as string)}`);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.purchase_order_id) {
      return { content: [{ type: 'text', text: 'purchase_order_id is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.product_info) params.productInfo = args.product_info as string;
    return this.walmartGet(`/v3/orders/${encodeURIComponent(args.purchase_order_id as string)}`, params);
  }

  private async getOrdersNextPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.next_cursor) {
      return { content: [{ type: 'text', text: 'next_cursor is required' }], isError: true };
    }
    return this.walmartGet(`/v3/orders${encodeURIComponent(args.next_cursor as string)}`);
  }

  private async acknowledgeOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.purchase_order_id) {
      return { content: [{ type: 'text', text: 'purchase_order_id is required' }], isError: true };
    }
    return this.walmartPost(
      `/v3/orders/${encodeURIComponent(args.purchase_order_id as string)}/acknowledge`,
      {}
    );
  }

  private async cancelOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.purchase_order_id || !args.order_lines) {
      return { content: [{ type: 'text', text: 'purchase_order_id and order_lines are required' }], isError: true };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(args.order_lines as string);
    } catch {
      return { content: [{ type: 'text', text: 'order_lines must be valid JSON' }], isError: true };
    }
    return this.walmartPost(
      `/v3/orders/${encodeURIComponent(args.purchase_order_id as string)}/cancel`,
      parsed
    );
  }

  private async refundOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.purchase_order_id || !args.order_lines) {
      return { content: [{ type: 'text', text: 'purchase_order_id and order_lines are required' }], isError: true };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(args.order_lines as string);
    } catch {
      return { content: [{ type: 'text', text: 'order_lines must be valid JSON' }], isError: true };
    }
    return this.walmartPost(
      `/v3/orders/${encodeURIComponent(args.purchase_order_id as string)}/refund`,
      parsed
    );
  }

  private async shipOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.purchase_order_id || !args.order_lines) {
      return { content: [{ type: 'text', text: 'purchase_order_id and order_lines are required' }], isError: true };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(args.order_lines as string);
    } catch {
      return { content: [{ type: 'text', text: 'order_lines must be valid JSON' }], isError: true };
    }
    return this.walmartPost(
      `/v3/orders/${encodeURIComponent(args.purchase_order_id as string)}/shipping`,
      parsed
    );
  }
}
