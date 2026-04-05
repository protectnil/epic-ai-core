/**
 * Toast MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Toast MCP server was found on GitHub or the Toast developer portal.
// Community servers exist (github.com/matthewmckenzie/toast-mcp-server, naveenbanoth/toast-admin-mcp-server)
// but are not published by Toast Inc. and do not meet the official MCP criteria.
//
// Base URL: https://ws-api.toasttab.com  (production)
//   Sandbox: https://ws-sandbox-api.eng.toasttab.com
// Auth: OAuth2 client credentials — POST to /authentication/v1/authentication/login with
//       clientId, clientSecret, and userAccessType: "TOAST_MACHINE_CLIENT";
//       response token at data.token.accessToken, expires in data.token.expiresIn seconds.
//       Include as: Authorization: Bearer {token}. Also requires Toast-Restaurant-External-ID header per request.
// Docs: https://doc.toasttab.com/doc/devguide/apiOverview.html
// Rate limits: Not publicly documented; standard practice is to implement exponential backoff on 429.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ToastConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class ToastMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: ToastConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://ws-api.toasttab.com';
  }

  static catalog() {
    return {
      name: 'toast',
      displayName: 'Toast',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'toast', 'toast pos', 'restaurant', 'point of sale', 'orders', 'menu',
        'payments', 'hospitality', 'food service', 'checks', 'employees', 'labor',
        'dining', 'tables', 'reservations',
      ],
      toolNames: [
        'get_restaurants',
        'get_restaurant',
        'list_orders',
        'get_order',
        'create_order',
        'get_menus',
        'get_menu_item',
        'list_employees',
        'get_employee',
        'list_dining_options',
        'list_tables',
        'get_payment',
        'list_payments',
      ],
      description: 'Toast restaurant POS: retrieve orders, menus, employees, tables, payments, and dining options for restaurant locations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_restaurants',
        description: 'List all restaurant locations accessible to this integration partner with basic details',
        inputSchema: {
          type: 'object',
          properties: {
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response to retrieve the next page',
            },
          },
        },
      },
      {
        name: 'get_restaurant',
        description: 'Get detailed configuration and settings for a specific restaurant location by GUID',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_guid: {
              type: 'string',
              description: 'Restaurant GUID (e.g. 550e8400-e29b-41d4-a716-446655440000)',
            },
          },
          required: ['restaurant_guid'],
        },
      },
      {
        name: 'list_orders',
        description: 'List orders for a restaurant with optional date range, status, and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_guid: {
              type: 'string',
              description: 'Restaurant GUID to query orders for',
            },
            start_date: {
              type: 'string',
              description: 'Start of date range in ISO 8601 format (e.g. 2026-03-01T00:00:00)',
            },
            end_date: {
              type: 'string',
              description: 'End of date range in ISO 8601 format (e.g. 2026-03-31T23:59:59)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of orders per page (default: 100, max: 100)',
            },
          },
          required: ['restaurant_guid'],
        },
      },
      {
        name: 'get_order',
        description: 'Get full details for a specific order by order GUID, including checks, payments, and line items',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_guid: {
              type: 'string',
              description: 'Restaurant GUID that owns the order',
            },
            order_guid: {
              type: 'string',
              description: 'Order GUID to retrieve',
            },
          },
          required: ['restaurant_guid', 'order_guid'],
        },
      },
      {
        name: 'create_order',
        description: 'Create a new order at a restaurant with specified line items and dining option',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_guid: {
              type: 'string',
              description: 'Restaurant GUID to create the order at',
            },
            dining_option_guid: {
              type: 'string',
              description: 'Dining option GUID (dine-in, takeout, delivery, etc.)',
            },
            selections: {
              type: 'string',
              description: 'JSON array string of menu item selections with itemGuid and quantity',
            },
            table_guid: {
              type: 'string',
              description: 'Table GUID for dine-in orders (optional)',
            },
          },
          required: ['restaurant_guid', 'dining_option_guid', 'selections'],
        },
      },
      {
        name: 'get_menus',
        description: 'Retrieve the full menu structure for a restaurant, including groups, items, and modifiers',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_guid: {
              type: 'string',
              description: 'Restaurant GUID to retrieve menus for',
            },
          },
          required: ['restaurant_guid'],
        },
      },
      {
        name: 'get_menu_item',
        description: 'Get detailed pricing, modifiers, and availability for a specific menu item by GUID',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_guid: {
              type: 'string',
              description: 'Restaurant GUID that owns the menu item',
            },
            menu_item_guid: {
              type: 'string',
              description: 'Menu item GUID to retrieve',
            },
          },
          required: ['restaurant_guid', 'menu_item_guid'],
        },
      },
      {
        name: 'list_employees',
        description: 'List employees at a restaurant location with roles, contact info, and employment status',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_guid: {
              type: 'string',
              description: 'Restaurant GUID to list employees for',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['restaurant_guid'],
        },
      },
      {
        name: 'get_employee',
        description: 'Get details for a specific employee by GUID, including wages and job assignments',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_guid: {
              type: 'string',
              description: 'Restaurant GUID that employs this worker',
            },
            employee_guid: {
              type: 'string',
              description: 'Employee GUID to retrieve',
            },
          },
          required: ['restaurant_guid', 'employee_guid'],
        },
      },
      {
        name: 'list_dining_options',
        description: 'List available dining options (dine-in, takeout, delivery, drive-thru) configured for a restaurant',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_guid: {
              type: 'string',
              description: 'Restaurant GUID to list dining options for',
            },
          },
          required: ['restaurant_guid'],
        },
      },
      {
        name: 'list_tables',
        description: 'List dining tables and their sections for a restaurant location',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_guid: {
              type: 'string',
              description: 'Restaurant GUID to list tables for',
            },
          },
          required: ['restaurant_guid'],
        },
      },
      {
        name: 'get_payment',
        description: 'Get details for a specific payment by payment GUID, including amount, tip, and tender type',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_guid: {
              type: 'string',
              description: 'Restaurant GUID that processed the payment',
            },
            payment_guid: {
              type: 'string',
              description: 'Payment GUID to retrieve',
            },
          },
          required: ['restaurant_guid', 'payment_guid'],
        },
      },
      {
        name: 'list_payments',
        description: 'List payments for a restaurant over a date range, useful for reconciliation and reporting',
        inputSchema: {
          type: 'object',
          properties: {
            restaurant_guid: {
              type: 'string',
              description: 'Restaurant GUID to query payments for',
            },
            start_date: {
              type: 'string',
              description: 'Start of payment date range in ISO 8601 format',
            },
            end_date: {
              type: 'string',
              description: 'End of payment date range in ISO 8601 format',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['restaurant_guid'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_restaurants':
          return this.getRestaurants(args);
        case 'get_restaurant':
          return this.getRestaurant(args);
        case 'list_orders':
          return this.listOrders(args);
        case 'get_order':
          return this.getOrder(args);
        case 'create_order':
          return this.createOrder(args);
        case 'get_menus':
          return this.getMenus(args);
        case 'get_menu_item':
          return this.getMenuItem(args);
        case 'list_employees':
          return this.listEmployees(args);
        case 'get_employee':
          return this.getEmployee(args);
        case 'list_dining_options':
          return this.listDiningOptions(args);
        case 'list_tables':
          return this.listTables(args);
        case 'get_payment':
          return this.getPayment(args);
        case 'list_payments':
          return this.listPayments(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/authentication/v1/authentication/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: this.clientId, clientSecret: this.clientSecret, userAccessType: 'TOAST_MACHINE_CLIENT' }),
    });
    if (!response.ok) {
      throw new Error(`Toast authentication failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { token: { accessToken: string; expiresIn?: number } };
    this.bearerToken = data.token.accessToken;
    // Default to 55 minutes if expiresIn not returned
    this.tokenExpiry = now + ((data.token.expiresIn ?? 3600) - 60) * 1000;
    return this.bearerToken;
  }

  private async toastGet(path: string, restaurantGuid?: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    if (restaurantGuid) headers['Toast-Restaurant-External-ID'] = restaurantGuid;
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async toastPost(path: string, restaurantGuid: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Toast-Restaurant-External-ID': restaurantGuid,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRestaurants(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.toastGet('/partners/v1/restaurants', undefined, params);
  }

  private async getRestaurant(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_guid) return { content: [{ type: 'text', text: 'restaurant_guid is required' }], isError: true };
    return this.toastGet(`/restaurants/v1/restaurants/${encodeURIComponent(args.restaurant_guid as string)}`, args.restaurant_guid as string);
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_guid) return { content: [{ type: 'text', text: 'restaurant_guid is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.start_date) params.startDate = args.start_date as string;
    if (args.end_date) params.endDate = args.end_date as string;
    if (args.page_token) params.pageToken = args.page_token as string;
    if (args.page_size) params.pageSize = String(args.page_size);
    return this.toastGet('/ordersBulk', args.restaurant_guid as string, params);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_guid || !args.order_guid) return { content: [{ type: 'text', text: 'restaurant_guid and order_guid are required' }], isError: true };
    return this.toastGet(`/orders/${encodeURIComponent(args.order_guid as string)}`, args.restaurant_guid as string);
  }

  private async createOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_guid || !args.dining_option_guid || !args.selections) {
      return { content: [{ type: 'text', text: 'restaurant_guid, dining_option_guid, and selections are required' }], isError: true };
    }
    let selections: unknown;
    try { selections = JSON.parse(args.selections as string); } catch { return { content: [{ type: 'text', text: 'selections must be a valid JSON array string' }], isError: true }; }
    const body: Record<string, unknown> = {
      diningOption: { guid: args.dining_option_guid },
      selections,
    };
    if (args.table_guid) body.table = { guid: args.table_guid };
    return this.toastPost('/orders', args.restaurant_guid as string, body);
  }

  private async getMenus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_guid) return { content: [{ type: 'text', text: 'restaurant_guid is required' }], isError: true };
    return this.toastGet('/menus/v2/menus', args.restaurant_guid as string);
  }

  private async getMenuItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_guid || !args.menu_item_guid) return { content: [{ type: 'text', text: 'restaurant_guid and menu_item_guid are required' }], isError: true };
    return this.toastGet(`/menus/v2/menuItems/${encodeURIComponent(args.menu_item_guid as string)}`, args.restaurant_guid as string);
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_guid) return { content: [{ type: 'text', text: 'restaurant_guid is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.toastGet('/labor/v1/employees', args.restaurant_guid as string, params);
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_guid || !args.employee_guid) return { content: [{ type: 'text', text: 'restaurant_guid and employee_guid are required' }], isError: true };
    return this.toastGet(`/labor/v1/employees/${encodeURIComponent(args.employee_guid as string)}`, args.restaurant_guid as string);
  }

  private async listDiningOptions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_guid) return { content: [{ type: 'text', text: 'restaurant_guid is required' }], isError: true };
    return this.toastGet('/config/v2/diningOptions', args.restaurant_guid as string);
  }

  private async listTables(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_guid) return { content: [{ type: 'text', text: 'restaurant_guid is required' }], isError: true };
    return this.toastGet('/config/v2/tables', args.restaurant_guid as string);
  }

  private async getPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_guid || !args.payment_guid) return { content: [{ type: 'text', text: 'restaurant_guid and payment_guid are required' }], isError: true };
    return this.toastGet(`/payments/${encodeURIComponent(args.payment_guid as string)}`, args.restaurant_guid as string);
  }

  private async listPayments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurant_guid) return { content: [{ type: 'text', text: 'restaurant_guid is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.start_date) params.startDate = args.start_date as string;
    if (args.end_date) params.endDate = args.end_date as string;
    if (args.page_token) params.pageToken = args.page_token as string;
    return this.toastGet('/payments', args.restaurant_guid as string, params);
  }
}
