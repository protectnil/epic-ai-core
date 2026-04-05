/**
 * Infor CloudSuite (ION API) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Infor CloudSuite REST API via the Infor ION API Gateway
// Base URL: configurable (e.g. https://mingledev01-ionapi.mingle.infor.com/TENANT/M3/m3api-rest/v2)
// Auth: OAuth2 Bearer token via Infor ION OAuth 2.0 (client_credentials grant)
// Docs: https://docs.infor.com/en-us/ion-api/
// Rate limits: not publicly documented; enforced per ION API subscription

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface InforConfig {
  baseUrl: string;
  /** OAuth2 access token obtained from Infor ION OAuth endpoint */
  bearerToken: string;
  /** Optional: OAuth2 token endpoint for auto-refresh (requires clientId + clientSecret + tokenUrl) */
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

export class InforMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private bearerToken: string;
  private readonly tokenUrl: string | undefined;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private tokenExpiry: number = 0;

  constructor(config: InforConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.bearerToken = config.bearerToken;
    this.tokenUrl = config.tokenUrl;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  static catalog() {
    return {
      name: 'infor',
      displayName: 'Infor CloudSuite',
      version: '1.0.0',
      category: 'manufacturing',
      keywords: [
        'infor', 'cloudsuite', 'ion', 'erp', 'manufacturing', 'distribution',
        'items', 'sales orders', 'purchase orders', 'work orders', 'customers',
        'suppliers', 'inventory', 'invoices', 'general ledger',
      ],
      toolNames: [
        'list_items', 'get_item', 'list_sales_orders', 'get_sales_order',
        'create_sales_order', 'list_purchase_orders', 'get_purchase_order',
        'list_work_orders', 'get_work_order', 'list_customers', 'list_suppliers',
        'get_inventory_balance', 'list_invoices', 'get_gl_accounts',
      ],
      description: 'Infor CloudSuite ERP via ION API: manage items, sales and purchase orders, work orders, customers, suppliers, inventory balances, invoices, and GL accounts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_items',
        description: 'List items (products/materials) from Infor CloudSuite, optionally filtered by item type or search term',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search by item number or description' },
            item_type: { type: 'string', description: 'Item type code to filter results' },
            maxrecs: { type: 'number', description: 'Maximum records to return (default: 50)' },
            exclude_search_fields: { type: 'string', description: 'Comma-separated fields to exclude from output' },
          },
        },
      },
      {
        name: 'get_item',
        description: 'Get full item master details from Infor CloudSuite by item number',
        inputSchema: {
          type: 'object',
          properties: {
            item_number: { type: 'string', description: 'Infor item number (ITNO)' },
          },
          required: ['item_number'],
        },
      },
      {
        name: 'list_sales_orders',
        description: 'List sales orders from Infor CloudSuite, optionally filtered by customer or status',
        inputSchema: {
          type: 'object',
          properties: {
            customer_number: { type: 'string', description: 'Customer number (CUNO) to filter orders' },
            order_type: { type: 'string', description: 'Order type to filter results' },
            from_date: { type: 'string', description: 'Filter orders on or after this date (YYYYMMDD)' },
            maxrecs: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
      {
        name: 'get_sales_order',
        description: 'Get full details for a specific sales order by order number',
        inputSchema: {
          type: 'object',
          properties: {
            order_number: { type: 'string', description: 'Sales order number (ORNO)' },
          },
          required: ['order_number'],
        },
      },
      {
        name: 'create_sales_order',
        description: 'Create a new sales order in Infor CloudSuite',
        inputSchema: {
          type: 'object',
          properties: {
            customer_number: { type: 'string', description: 'Customer number (CUNO)' },
            order_type: { type: 'string', description: 'Order type code' },
            requested_delivery_date: { type: 'string', description: 'Requested delivery date (YYYYMMDD)' },
            lines: {
              type: 'array',
              description: 'Array of order lines',
              items: {
                type: 'object',
                properties: {
                  item_number: { type: 'string', description: 'Item number (ITNO)' },
                  ordered_qty: { type: 'number', description: 'Ordered quantity' },
                  sales_price: { type: 'number', description: 'Sales price per unit' },
                },
              },
            },
          },
          required: ['customer_number'],
        },
      },
      {
        name: 'list_purchase_orders',
        description: 'List purchase orders from Infor CloudSuite, optionally filtered by supplier or status',
        inputSchema: {
          type: 'object',
          properties: {
            supplier_number: { type: 'string', description: 'Supplier number (SUNO) to filter purchase orders' },
            order_type: { type: 'string', description: 'Purchase order type code' },
            from_date: { type: 'string', description: 'Filter POs on or after this date (YYYYMMDD)' },
            maxrecs: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
      {
        name: 'get_purchase_order',
        description: 'Get full purchase order details by purchase order number',
        inputSchema: {
          type: 'object',
          properties: {
            pono: { type: 'string', description: 'Purchase order number (PUNO)' },
          },
          required: ['pono'],
        },
      },
      {
        name: 'list_work_orders',
        description: 'List manufacturing work orders, optionally filtered by item, facility, or status',
        inputSchema: {
          type: 'object',
          properties: {
            item_number: { type: 'string', description: 'Item number (ITNO) to filter work orders' },
            facility: { type: 'string', description: 'Facility/plant code (FACI) to filter results' },
            status_from: { type: 'string', description: 'Minimum work order status code' },
            status_to: { type: 'string', description: 'Maximum work order status code' },
            maxrecs: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
      {
        name: 'get_work_order',
        description: 'Get full details for a manufacturing work order by work order number',
        inputSchema: {
          type: 'object',
          properties: {
            work_order_number: { type: 'string', description: 'Manufacturing order number (MFNO)' },
          },
          required: ['work_order_number'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customers from Infor CloudSuite, optionally filtered by search term',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search by customer name or number' },
            customer_type: { type: 'string', description: 'Customer type code to filter results' },
            maxrecs: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
      {
        name: 'list_suppliers',
        description: 'List suppliers from Infor CloudSuite, optionally filtered by search term or group',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search by supplier name or number' },
            supplier_group: { type: 'string', description: 'Supplier group code to filter results' },
            maxrecs: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
      {
        name: 'get_inventory_balance',
        description: 'Get current on-hand inventory balance for an item, optionally by warehouse and location',
        inputSchema: {
          type: 'object',
          properties: {
            item_number: { type: 'string', description: 'Item number (ITNO)' },
            warehouse: { type: 'string', description: 'Warehouse code (WHLO) to limit results (optional)' },
          },
          required: ['item_number'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List AR invoices from Infor CloudSuite, optionally filtered by customer or date range',
        inputSchema: {
          type: 'object',
          properties: {
            customer_number: { type: 'string', description: 'Customer number (CUNO) to filter invoices' },
            from_date: { type: 'string', description: 'Invoice date on or after (YYYYMMDD)' },
            to_date: { type: 'string', description: 'Invoice date on or before (YYYYMMDD)' },
            maxrecs: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
      {
        name: 'get_gl_accounts',
        description: 'List general ledger accounts from Infor CloudSuite, optionally filtered by account type or range',
        inputSchema: {
          type: 'object',
          properties: {
            account_type: { type: 'string', description: 'GL account type code to filter results' },
            from_account: { type: 'string', description: 'Starting account number for range filter' },
            to_account: { type: 'string', description: 'Ending account number for range filter' },
            maxrecs: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_items': return this.listItems(args);
        case 'get_item': return this.getItem(args);
        case 'list_sales_orders': return this.listSalesOrders(args);
        case 'get_sales_order': return this.getSalesOrder(args);
        case 'create_sales_order': return this.createSalesOrder(args);
        case 'list_purchase_orders': return this.listPurchaseOrders(args);
        case 'get_purchase_order': return this.getPurchaseOrder(args);
        case 'list_work_orders': return this.listWorkOrders(args);
        case 'get_work_order': return this.getWorkOrder(args);
        case 'list_customers': return this.listCustomers(args);
        case 'list_suppliers': return this.listSuppliers(args);
        case 'get_inventory_balance': return this.getInventoryBalance(args);
        case 'list_invoices': return this.listInvoices(args);
        case 'get_gl_accounts': return this.getGlAccounts(args);
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
    // If no refresh config, use the static token as-is
    if (!this.tokenUrl || !this.clientId || !this.clientSecret) {
      return this.bearerToken;
    }
    const now = Date.now();
    if (this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`ION OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const qs = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listItems(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { maxrecs: String((args.maxrecs as number) || 50) };
    if (args.search) params['SQRY'] = args.search as string;
    if (args.item_type) params['ITTY'] = args.item_type as string;
    return this.apiGet('/execute/MMS200MI/LstItmBasic', params);
  }

  private async getItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_number) return { content: [{ type: 'text', text: 'item_number is required' }], isError: true };
    return this.apiGet('/execute/MMS200MI/GetItmBasic', { ITNO: args.item_number as string });
  }

  private async listSalesOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { maxrecs: String((args.maxrecs as number) || 50) };
    if (args.customer_number) params['CUNO'] = args.customer_number as string;
    if (args.order_type) params['ORTP'] = args.order_type as string;
    if (args.from_date) params['ORDT'] = args.from_date as string;
    return this.apiGet('/execute/OIS100MI/LstOrderHead', params);
  }

  private async getSalesOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_number) return { content: [{ type: 'text', text: 'order_number is required' }], isError: true };
    return this.apiGet('/execute/OIS100MI/GetOrderHead', { ORNO: args.order_number as string });
  }

  private async createSalesOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_number) return { content: [{ type: 'text', text: 'customer_number is required' }], isError: true };
    const body: Record<string, unknown> = {
      CUNO: args.customer_number,
      ORTP: args.order_type ?? '',
      RLDT: args.requested_delivery_date ?? '',
      lines: args.lines ?? [],
    };
    return this.apiPost('/execute/OIS100MI/AddOrderHead', body);
  }

  private async listPurchaseOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { maxrecs: String((args.maxrecs as number) || 50) };
    if (args.supplier_number) params['SUNO'] = args.supplier_number as string;
    if (args.order_type) params['ORTY'] = args.order_type as string;
    if (args.from_date) params['PUDT'] = args.from_date as string;
    return this.apiGet('/execute/PPS200MI/LstOrderHead', params);
  }

  private async getPurchaseOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pono) return { content: [{ type: 'text', text: 'pono is required' }], isError: true };
    return this.apiGet('/execute/PPS200MI/GetOrderHead', { PUNO: args.pono as string });
  }

  private async listWorkOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { maxrecs: String((args.maxrecs as number) || 50) };
    if (args.item_number) params['ITNO'] = args.item_number as string;
    if (args.facility) params['FACI'] = args.facility as string;
    if (args.status_from) params['WOST'] = args.status_from as string;
    if (args.status_to) params['WOST'] = args.status_to as string;
    return this.apiGet('/execute/PMS100MI/LstManufactOrder', params);
  }

  private async getWorkOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.work_order_number) return { content: [{ type: 'text', text: 'work_order_number is required' }], isError: true };
    return this.apiGet('/execute/PMS100MI/GetManufactOrder', { MFNO: args.work_order_number as string });
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { maxrecs: String((args.maxrecs as number) || 50) };
    if (args.search) params['SQRY'] = args.search as string;
    if (args.customer_type) params['CUTP'] = args.customer_type as string;
    return this.apiGet('/execute/CRS610MI/LstByNumber', params);
  }

  private async listSuppliers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { maxrecs: String((args.maxrecs as number) || 50) };
    if (args.search) params['SQRY'] = args.search as string;
    if (args.supplier_group) params['SUGR'] = args.supplier_group as string;
    return this.apiGet('/execute/CRS620MI/LstSuppliers', params);
  }

  private async getInventoryBalance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.item_number) return { content: [{ type: 'text', text: 'item_number is required' }], isError: true };
    const params: Record<string, string> = { ITNO: args.item_number as string };
    if (args.warehouse) params['WHLO'] = args.warehouse as string;
    return this.apiGet('/execute/MMS060MI/GetBalance', params);
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { maxrecs: String((args.maxrecs as number) || 50) };
    if (args.customer_number) params['CUNO'] = args.customer_number as string;
    if (args.from_date) params['IVDT'] = args.from_date as string;
    if (args.to_date) params['DUDT'] = args.to_date as string;
    return this.apiGet('/execute/ARS200MI/LstInvoiceHead', params);
  }

  private async getGlAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { maxrecs: String((args.maxrecs as number) || 50) };
    if (args.account_type) params['ACAT'] = args.account_type as string;
    if (args.from_account) params['AIT1'] = args.from_account as string;
    if (args.to_account) params['AIT1T'] = args.to_account as string;
    return this.apiGet('/execute/GLS200MI/LstAccountInfo', params);
  }
}
