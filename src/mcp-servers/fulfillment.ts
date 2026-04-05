/**
 * Fulfillment.com MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Fulfillment.com MCP server was found on GitHub or npmjs.com.
//
// Base URL: https://api.fulfillment.com/v2
// Auth: OAuth2 Bearer token obtained via POST /oauth/access_token (password or client_credentials grant).
//   Also supports x-api-key header for certain endpoints. Bearer token is preferred.
// Docs: https://developer.fulfillment.com
// Rate limits: Not publicly documented. Contact your account executive.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FulfillmentConfig {
  /** Bearer token from OAuth2 /oauth/access_token. Pass this after obtaining it via get_access_token. */
  accessToken?: string;
  /** API key for x-api-key header auth (alternative to Bearer token) */
  apiKey?: string;
}

export class FulfillmentMCPServer extends MCPAdapterBase {
  private readonly baseUrl = 'https://api.fulfillment.com/v2';
  private readonly accessToken: string;
  private readonly apiKey: string;

  constructor(config: FulfillmentConfig) {
    super();
    this.accessToken = config.accessToken ?? '';
    this.apiKey = config.apiKey ?? '';
  }

  static catalog() {
    return {
      name: 'fulfillment',
      displayName: 'Fulfillment.com',
      version: '1.0.0',
      category: 'logistics' as const,
      keywords: [
        'fulfillment', 'order', 'shipping', 'logistics', 'warehouse', 'inventory',
        'return', 'rma', 'tracking', 'ecommerce', 'fdc', 'accounting',
      ],
      toolNames: [
        'get_access_token', 'list_orders', 'create_order', 'get_order',
        'cancel_order', 'ship_order', 'update_order_status',
        'list_returns', 'create_return', 'get_tracking',
        'list_inventory', 'list_order_accounting', 'get_current_user',
      ],
      description:
        'Manage orders, inventory, returns, shipments, and accounting via the Fulfillment.com logistics API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_access_token',
        description:
          'Obtain an OAuth2 Bearer access token using username/password credentials. Store the returned token and pass it as accessToken in subsequent requests.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Fulfillment.com account username or email',
            },
            password: {
              type: 'string',
              description: 'Fulfillment.com account password',
            },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'list_orders',
        description:
          'List fulfillment orders filtered by date range. Supports pagination and optional hydration for additional order details.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDate: {
              type: 'string',
              description: 'Start date-time in ISO 8601 format (e.g. "2024-01-01T00:00:00Z")',
            },
            toDate: {
              type: 'string',
              description: 'End date-time in ISO 8601 format (e.g. "2024-01-31T23:59:59Z")',
            },
            merchantIds: {
              type: 'string',
              description: 'CSV of merchant IDs to filter by (e.g. "123" or "1,2,3")',
            },
            warehouseIds: {
              type: 'string',
              description: 'CSV of warehouse IDs to filter by',
            },
            page: {
              type: 'number',
              description: 'Page multiplier for pagination (default 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of orders to return per page (default 25)',
            },
            hydrate: {
              type: 'string',
              description: 'CSV of additional data to hydrate — e.g. "items,tracking"',
            },
          },
          required: ['fromDate', 'toDate'],
        },
      },
      {
        name: 'create_order',
        description: 'Create a new fulfillment order with shipping address, items, and shipping method.',
        inputSchema: {
          type: 'object',
          properties: {
            order: {
              type: 'object',
              description:
                'Order object. Must include: shippingAddress (object with firstName, lastName, address1, city, state, zip, country), items (array of {sku, quantity}), and shippingMethod (string). Optional: merchantId, externalId, integrator.',
            },
          },
          required: ['order'],
        },
      },
      {
        name: 'get_order',
        description: 'Get full details for a specific fulfillment order by FDC order ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'FDC order ID',
            },
            merchantId: {
              type: 'string',
              description:
                'If provided, treats the id parameter as your merchant order ID instead of the FDC ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'cancel_order',
        description: 'Cancel a fulfillment order by FDC order ID. Only orders not yet shipped can be cancelled.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'FDC order ID to cancel',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'ship_order',
        description: 'Mark a fulfillment order as shipped, providing shipment details.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'FDC order ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_order_status',
        description: 'Update the status of a fulfillment order by FDC order ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'FDC order ID',
            },
            status: {
              type: 'string',
              description: 'New status for the order (e.g. "hold", "released")',
            },
          },
          required: ['id', 'status'],
        },
      },
      {
        name: 'list_returns',
        description: 'List return (RMA) records within a date range, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDate: {
              type: 'string',
              description: 'Start date-time in ISO 8601 format',
            },
            toDate: {
              type: 'string',
              description: 'End date-time in ISO 8601 format',
            },
            page: {
              type: 'number',
              description: 'Page multiplier for pagination (default 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of returns to return per page (default 25)',
            },
          },
          required: ['fromDate', 'toDate'],
        },
      },
      {
        name: 'create_return',
        description: 'Inform Fulfillment.com of an incoming RMA (return merchandise authorization) with expected items.',
        inputSchema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Array of return items, each with sku (string) and quantityExpected (integer, min 1)',
            },
            orderId: {
              type: 'string',
              description: 'The FDC order ID this return is associated with (optional)',
            },
          },
          required: ['items'],
        },
      },
      {
        name: 'get_tracking',
        description: 'Get tracking information for a shipment by tracking number.',
        inputSchema: {
          type: 'object',
          properties: {
            trackingNumber: {
              type: 'string',
              description: 'Carrier tracking number',
            },
          },
          required: ['trackingNumber'],
        },
      },
      {
        name: 'list_inventory',
        description: 'List current inventory levels across warehouses, with optional filters by merchant, warehouse, or SKU.',
        inputSchema: {
          type: 'object',
          properties: {
            merchantIds: {
              type: 'string',
              description: 'CSV of merchant IDs to filter by (e.g. "123" or "1,2,3")',
            },
            warehouseIds: {
              type: 'string',
              description: 'CSV of warehouse IDs to filter by',
            },
            externalSkuNames: {
              type: 'string',
              description: 'CSV of external SKU reference names to filter by',
            },
            page: {
              type: 'number',
              description: 'Page multiplier for pagination (default 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of inventory items to return per page (default 25)',
            },
          },
          required: [],
        },
      },
      {
        name: 'list_order_accounting',
        description: 'List order accounting records (charges and credits) within a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDate: {
              type: 'string',
              description: 'Start date-time in ISO 8601 format',
            },
            toDate: {
              type: 'string',
              description: 'End date-time in ISO 8601 format',
            },
            page: {
              type: 'number',
              description: 'Page multiplier for pagination (default 0)',
            },
            limit: {
              type: 'number',
              description: 'Number of records to return per page (default 25)',
            },
            warehouseIds: {
              type: 'string',
              description: 'CSV of warehouse IDs to filter by',
            },
            orderIds: {
              type: 'string',
              description: 'CSV of order IDs to filter by',
            },
            hydrate: {
              type: 'string',
              description: 'CSV of additional data to hydrate',
            },
          },
          required: ['fromDate', 'toDate'],
        },
      },
      {
        name: 'get_current_user',
        description: 'Get information about the currently authenticated Fulfillment.com user and their merchant account.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }

  private buildHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    } else if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }


  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ToolResult> {
    const init: RequestInit = {
      method,
      headers: this.buildHeaders(body !== undefined ? 'application/json' : undefined),
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, init);

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Fulfillment.com API error (HTTP ${response.status}): ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: `Fulfillment.com API returned non-JSON response (HTTP ${response.status})` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_access_token':
          return this.getAccessToken(args);
        case 'list_orders':
          return this.listOrders(args);
        case 'create_order':
          return this.createOrder(args);
        case 'get_order':
          return this.getOrder(args);
        case 'cancel_order':
          return this.cancelOrder(args);
        case 'ship_order':
          return this.shipOrder(args);
        case 'update_order_status':
          return this.updateOrderStatus(args);
        case 'list_returns':
          return this.listReturns(args);
        case 'create_return':
          return this.createReturn(args);
        case 'get_tracking':
          return this.getTracking(args);
        case 'list_inventory':
          return this.listInventory(args);
        case 'list_order_accounting':
          return this.listOrderAccounting(args);
        case 'get_current_user':
          return this.getCurrentUser();
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async getAccessToken(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    const password = args.password as string;
    if (!username || !password) {
      return { content: [{ type: 'text', text: 'username and password are required' }], isError: true };
    }
    return this.request('POST', '/oauth/access_token', {
      grant_type: 'password',
      username,
      password,
    });
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const fromDate = args.fromDate as string;
    const toDate = args.toDate as string;
    if (!fromDate || !toDate) {
      return { content: [{ type: 'text', text: 'fromDate and toDate are required' }], isError: true };
    }
    const params = new URLSearchParams({ fromDate, toDate });
    if (args.merchantIds) params.set('merchantIds', args.merchantIds as string);
    if (args.warehouseIds) params.set('warehouseIds', args.warehouseIds as string);
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.hydrate) params.set('hydrate', args.hydrate as string);
    return this.request('GET', `/orders?${params}`);
  }

  private async createOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const order = args.order as Record<string, unknown>;
    if (!order) {
      return { content: [{ type: 'text', text: 'order is required' }], isError: true };
    }
    return this.request('POST', '/orders', order);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.merchantId) params.set('merchantId', args.merchantId as string);
    const qs = params.toString();
    return this.request('GET', `/orders/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`);
  }

  private async cancelOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('DELETE', `/orders/${encodeURIComponent(id)}`);
  }

  private async shipOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('PUT', `/orders/${encodeURIComponent(id)}/ship`);
  }

  private async updateOrderStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    const status = args.status as string;
    if (!id || !status) {
      return { content: [{ type: 'text', text: 'id and status are required' }], isError: true };
    }
    return this.request('PUT', `/orders/${encodeURIComponent(id)}/status`, { status });
  }

  private async listReturns(args: Record<string, unknown>): Promise<ToolResult> {
    const fromDate = args.fromDate as string;
    const toDate = args.toDate as string;
    if (!fromDate || !toDate) {
      return { content: [{ type: 'text', text: 'fromDate and toDate are required' }], isError: true };
    }
    const params = new URLSearchParams({ fromDate, toDate });
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    return this.request('GET', `/returns?${params}`);
  }

  private async createReturn(args: Record<string, unknown>): Promise<ToolResult> {
    const items = args.items as unknown[];
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { content: [{ type: 'text', text: 'items array is required' }], isError: true };
    }
    const body: Record<string, unknown> = { items };
    if (args.orderId) body.orderId = args.orderId;
    return this.request('PUT', '/returns', body);
  }

  private async getTracking(args: Record<string, unknown>): Promise<ToolResult> {
    const trackingNumber = args.trackingNumber as string;
    if (!trackingNumber) {
      return { content: [{ type: 'text', text: 'trackingNumber is required' }], isError: true };
    }
    return this.request('GET', `/track?trackingNumber=${encodeURIComponent(trackingNumber)}`);
  }

  private async listInventory(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.merchantIds) params.set('merchantIds', args.merchantIds as string);
    if (args.warehouseIds) params.set('warehouseIds', args.warehouseIds as string);
    if (args.externalSkuNames) params.set('externalSkuNames', args.externalSkuNames as string);
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const qs = params.toString();
    return this.request('GET', `/inventory${qs ? `?${qs}` : ''}`);
  }

  private async listOrderAccounting(args: Record<string, unknown>): Promise<ToolResult> {
    const fromDate = args.fromDate as string;
    const toDate = args.toDate as string;
    if (!fromDate || !toDate) {
      return { content: [{ type: 'text', text: 'fromDate and toDate are required' }], isError: true };
    }
    const params = new URLSearchParams({ fromDate, toDate });
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.warehouseIds) params.set('warehouseIds', args.warehouseIds as string);
    if (args.orderIds) params.set('orderIds', args.orderIds as string);
    if (args.hydrate) params.set('hydrate', args.hydrate as string);
    return this.request('GET', `/accounting?${params}`);
  }

  private async getCurrentUser(): Promise<ToolResult> {
    return this.request('GET', '/users/me');
  }
}
