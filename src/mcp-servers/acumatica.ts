/**
 * Acumatica MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CDataSoftware/acumatica-mcp-server-by-cdata — transport: stdio, auth: JDBC credentials
//   This is a read-only CData JDBC-based MCP server, NOT an official Acumatica vendor MCP.
//   It exposes SQL SELECT queries over JDBC — not the native Acumatica REST API entities.
//   No official Acumatica Inc. MCP server was found as of 2026-03.
// Our adapter covers: 18 tools (customers, vendors, invoices, sales orders, inventory, payments, financials).
//   CData server: read-only SQL queries only. Use this adapter for full CRUD via native REST API.
// Recommendation: Use this adapter for full CRUD. CData server not recommended for production use.
//
// Base URL: https://<your-instance>.acumatica.com/entity/Default/23.200.001
//   (instance-specific — required in config; version segment may vary by deployment)
// Auth: OAuth2 Password Credentials flow (username + password + client_id + client_secret).
//   Token endpoint: https://<instance>.acumatica.com/identity/connect/token
//   Or: Cookie-based session via /entity/auth/login (Basic alternative).
// Docs: https://help.acumatica.com — search "REST API", or developer.acumatica.com
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AcumaticaConfig {
  /** Full instance URL, e.g. https://mycompany.acumatica.com */
  instanceUrl: string;
  /** OAuth2 client ID (from Connected Applications screen SM303010) */
  clientId: string;
  /** OAuth2 client secret */
  clientSecret: string;
  /** User account username */
  username: string;
  /** User account password */
  password: string;
  /** REST API endpoint version segment (default: 23.200.001) */
  apiVersion?: string;
}

export class AcumaticaMCPServer extends MCPAdapterBase {
  private readonly instanceUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly username: string;
  private readonly password: string;
  private readonly apiVersion: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AcumaticaConfig) {
    super();
    this.instanceUrl = config.instanceUrl.replace(/\/+$/, '');
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.username = config.username;
    this.password = config.password;
    this.apiVersion = config.apiVersion ?? '23.200.001';
  }

  static catalog() {
    return {
      name: 'acumatica',
      displayName: 'Acumatica',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'acumatica', 'erp', 'accounting', 'finance', 'invoice', 'customer', 'vendor',
        'sales order', 'purchase order', 'inventory', 'item', 'payment', 'journal entry',
        'general ledger', 'accounts receivable', 'accounts payable', 'mid-market', 'cloud erp',
      ],
      toolNames: [
        'list_customers', 'get_customer', 'create_customer', 'update_customer',
        'list_vendors', 'get_vendor', 'create_vendor',
        'list_invoices', 'get_invoice', 'create_invoice', 'release_invoice',
        'list_sales_orders', 'get_sales_order', 'create_sales_order',
        'list_stock_items', 'get_stock_item',
        'list_payments', 'get_payment',
      ],
      description: 'Acumatica mid-market cloud ERP: manage customers, vendors, invoices, sales orders, inventory, and payments via the native REST API.',
      author: 'protectnil',
    };
  }

  private get entityBase(): string {
    return `${this.instanceUrl}/entity/Default/${this.apiVersion}`;
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const tokenUrl = `${this.instanceUrl}/identity/connect/token`;
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      username: this.username,
      password: this.password,
      scope: 'api offline_access',
    });

    const response = await this.fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_customers',
        description: 'List customer records in Acumatica with optional filters for name, status, and class',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter by customer name (partial match)',
            },
            status: {
              type: 'string',
              description: 'Filter by customer status: Active, Inactive, Hold, CreditHold (default: Active)',
            },
            customer_class: {
              type: 'string',
              description: 'Filter by customer class ID',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (OData $top, default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Records to skip for pagination (OData $skip, default: 0)',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get full details of a single Acumatica customer by customer ID or account number',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Acumatica customer account number (e.g. C000001)',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer account in Acumatica with name, billing address, and payment terms',
        inputSchema: {
          type: 'object',
          properties: {
            customer_name: {
              type: 'string',
              description: 'Full customer or company name',
            },
            customer_id: {
              type: 'string',
              description: 'Custom account number to assign (auto-assigned if omitted)',
            },
            customer_class: {
              type: 'string',
              description: 'Customer class ID that determines default GL accounts and settings',
            },
            status: {
              type: 'string',
              description: 'Customer status: Active (default) or Inactive',
            },
            payment_terms: {
              type: 'string',
              description: 'Default payment terms code (e.g. NET30, COD)',
            },
            credit_limit: {
              type: 'number',
              description: 'Credit limit amount in account currency',
            },
          },
          required: ['customer_name'],
        },
      },
      {
        name: 'update_customer',
        description: 'Update a customer account status, credit limit, or payment terms by customer ID',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Acumatica customer account number to update',
            },
            status: {
              type: 'string',
              description: 'Updated status: Active, Inactive, Hold, CreditHold',
            },
            credit_limit: {
              type: 'number',
              description: 'Updated credit limit amount',
            },
            payment_terms: {
              type: 'string',
              description: 'Updated payment terms code',
            },
            customer_name: {
              type: 'string',
              description: 'Updated customer name',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'list_vendors',
        description: 'List vendor records in Acumatica with optional filters for name and status',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter by vendor name (partial match)',
            },
            status: {
              type: 'string',
              description: 'Filter by vendor status: Active, Inactive, Hold (default: Active)',
            },
            vendor_class: {
              type: 'string',
              description: 'Filter by vendor class ID',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_vendor',
        description: 'Get full details of a single vendor by their Acumatica vendor account number',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: {
              type: 'string',
              description: 'Acumatica vendor account number (e.g. V000001)',
            },
          },
          required: ['vendor_id'],
        },
      },
      {
        name: 'create_vendor',
        description: 'Create a new vendor account in Acumatica',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_name: {
              type: 'string',
              description: 'Vendor company name',
            },
            vendor_id: {
              type: 'string',
              description: 'Custom vendor account number (auto-assigned if omitted)',
            },
            vendor_class: {
              type: 'string',
              description: 'Vendor class ID',
            },
            status: {
              type: 'string',
              description: 'Vendor status: Active (default) or Inactive',
            },
            payment_terms: {
              type: 'string',
              description: 'Default payment terms code',
            },
          },
          required: ['vendor_name'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List accounts receivable invoices with optional filters for customer, status, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Filter invoices for a specific customer account number',
            },
            status: {
              type: 'string',
              description: 'Filter by invoice status: Open, Closed, Hold, Balanced, Voided (default: Open)',
            },
            doc_type: {
              type: 'string',
              description: 'Filter by document type: Invoice, Credit Memo, Debit Memo (default: Invoice)',
            },
            date_from: {
              type: 'string',
              description: 'Filter invoices with date on or after (ISO 8601: YYYY-MM-DD)',
            },
            date_to: {
              type: 'string',
              description: 'Filter invoices with date on or before (ISO 8601: YYYY-MM-DD)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Get full details of a specific AR invoice by reference number and document type',
        inputSchema: {
          type: 'object',
          properties: {
            reference_nbr: {
              type: 'string',
              description: 'Invoice reference number (e.g. AR-000001)',
            },
            doc_type: {
              type: 'string',
              description: 'Document type: Invoice, Credit Memo, Debit Memo (default: Invoice)',
            },
          },
          required: ['reference_nbr'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new accounts receivable invoice in Acumatica for a customer',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Customer account number to invoice',
            },
            doc_date: {
              type: 'string',
              description: 'Invoice date in ISO 8601 format (YYYY-MM-DD, default: today)',
            },
            due_date: {
              type: 'string',
              description: 'Invoice due date in ISO 8601 format (YYYY-MM-DD)',
            },
            doc_desc: {
              type: 'string',
              description: 'Invoice description or reference text',
            },
            details: {
              type: 'array',
              description: 'Line items: [{BranchID: "MAIN", InventoryID: "SERVICES", Qty: 1, UnitPrice: 500.00, Description: "Consulting"}]',
            },
          },
          required: ['customer_id', 'details'],
        },
      },
      {
        name: 'release_invoice',
        description: 'Release (post) an Acumatica AR invoice to make it official and open for payment',
        inputSchema: {
          type: 'object',
          properties: {
            reference_nbr: {
              type: 'string',
              description: 'Invoice reference number to release',
            },
            doc_type: {
              type: 'string',
              description: 'Document type: Invoice, Credit Memo, Debit Memo (default: Invoice)',
            },
          },
          required: ['reference_nbr'],
        },
      },
      {
        name: 'list_sales_orders',
        description: 'List sales orders with optional filters for customer, order type, and status',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Filter sales orders for a specific customer',
            },
            order_type: {
              type: 'string',
              description: 'Filter by order type: SO, QT, RO, TR (default: SO)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: Open, Hold, Shipping, Completed, Cancelled (default: Open)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_sales_order',
        description: 'Get full details of a specific sales order by order type and order number',
        inputSchema: {
          type: 'object',
          properties: {
            order_type: {
              type: 'string',
              description: 'Sales order type (e.g. SO, QT)',
            },
            order_nbr: {
              type: 'string',
              description: 'Sales order number (e.g. SO-000001)',
            },
          },
          required: ['order_type', 'order_nbr'],
        },
      },
      {
        name: 'create_sales_order',
        description: 'Create a new sales order in Acumatica for a customer with line items',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Customer account number',
            },
            order_type: {
              type: 'string',
              description: 'Order type (default: SO)',
            },
            order_date: {
              type: 'string',
              description: 'Order date in ISO 8601 format (YYYY-MM-DD, default: today)',
            },
            description: {
              type: 'string',
              description: 'Order description or reference',
            },
            details: {
              type: 'array',
              description: 'Order line items: [{InventoryID: "ITEM01", OrderQty: 5, UnitPrice: 100.00, WarehouseID: "MAIN"}]',
            },
          },
          required: ['customer_id', 'details'],
        },
      },
      {
        name: 'list_stock_items',
        description: 'List inventory stock items with optional filters for item class and status',
        inputSchema: {
          type: 'object',
          properties: {
            item_class: {
              type: 'string',
              description: 'Filter by item class ID',
            },
            status: {
              type: 'string',
              description: 'Filter by item status: Active, Inactive, ToDelete (default: Active)',
            },
            description: {
              type: 'string',
              description: 'Filter by item description (partial match)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_stock_item',
        description: 'Get full details of a specific inventory stock item by inventory ID',
        inputSchema: {
          type: 'object',
          properties: {
            inventory_id: {
              type: 'string',
              description: 'Acumatica inventory item ID (e.g. ITEM001)',
            },
          },
          required: ['inventory_id'],
        },
      },
      {
        name: 'list_payments',
        description: 'List AR payments with optional filters for customer, payment method, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Filter payments for a specific customer',
            },
            status: {
              type: 'string',
              description: 'Filter by payment status: Open, Closed, Hold, Balanced, Voided (default: Open)',
            },
            date_from: {
              type: 'string',
              description: 'Filter payments on or after this date (YYYY-MM-DD)',
            },
            date_to: {
              type: 'string',
              description: 'Filter payments on or before this date (YYYY-MM-DD)',
            },
            top: {
              type: 'number',
              description: 'Maximum records to return (default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_payment',
        description: 'Get full details of a specific AR payment by reference number',
        inputSchema: {
          type: 'object',
          properties: {
            reference_nbr: {
              type: 'string',
              description: 'Payment reference number (e.g. AR-000050)',
            },
            doc_type: {
              type: 'string',
              description: 'Document type: Payment, Prepayment, VoidPayment (default: Payment)',
            },
          },
          required: ['reference_nbr'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_customers':
          return this.listCustomers(args);
        case 'get_customer':
          return this.getCustomer(args);
        case 'create_customer':
          return this.createCustomer(args);
        case 'update_customer':
          return this.updateCustomer(args);
        case 'list_vendors':
          return this.listVendors(args);
        case 'get_vendor':
          return this.getVendor(args);
        case 'create_vendor':
          return this.createVendor(args);
        case 'list_invoices':
          return this.listInvoices(args);
        case 'get_invoice':
          return this.getInvoice(args);
        case 'create_invoice':
          return this.createInvoice(args);
        case 'release_invoice':
          return this.releaseInvoice(args);
        case 'list_sales_orders':
          return this.listSalesOrders(args);
        case 'get_sales_order':
          return this.getSalesOrder(args);
        case 'create_sales_order':
          return this.createSalesOrder(args);
        case 'list_stock_items':
          return this.listStockItems(args);
        case 'get_stock_item':
          return this.getStockItem(args);
        case 'list_payments':
          return this.listPayments(args);
        case 'get_payment':
          return this.getPayment(args);
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

  private buildOdata(params: {
    filter?: string;
    top?: number;
    skip?: number;
    expand?: string;
  }): string {
    const qs = new URLSearchParams();
    if (params.filter) qs.set('$filter', params.filter);
    if (params.top !== undefined) qs.set('$top', String(params.top));
    if (params.skip !== undefined) qs.set('$skip', String(params.skip));
    if (params.expand) qs.set('$expand', params.expand);
    const str = qs.toString();
    return str ? `?${str}` : '';
  }

  private async apiGet(entity: string, filter?: string, top = 20, skip = 0): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const url = `${this.entityBase}/${entity}${this.buildOdata({ filter, top, skip })}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Acumatica returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiGetSingle(entity: string, key: string): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const url = `${this.entityBase}/${entity}/${encodeURIComponent(key)}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Acumatica returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(entity: string, body: unknown, key?: string): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const url = key
      ? `${this.entityBase}/${entity}/${encodeURIComponent(key)}`
      : `${this.entityBase}/${entity}`;
    const response = await this.fetchWithRetry(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Acumatica returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(entity: string, action: string, body: unknown): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const url = `${this.entityBase}/${entity}/${action}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text || JSON.stringify({ success: true }) }], isError: false };
  }

  private buildFilter(conditions: Array<string | undefined>): string | undefined {
    const parts = conditions.filter((c): c is string => c !== undefined);
    return parts.length > 0 ? parts.join(' and ') : undefined;
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const conditions: Array<string | undefined> = [];
    if (args.name) conditions.push(`CustomerName eq '${encodeURIComponent(args.name as string)}'`);
    if (args.status) conditions.push(`Status eq '${encodeURIComponent(args.status as string)}'`);
    if (args.customer_class) conditions.push(`CustomerClassID eq '${encodeURIComponent(args.customer_class as string)}'`);
    return this.apiGet('Customer', this.buildFilter(conditions), (args.top as number) ?? 20, (args.skip as number) ?? 0);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    return this.apiGetSingle('Customer', args.customer_id as string);
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_name) return { content: [{ type: 'text', text: 'customer_name is required' }], isError: true };
    const body: Record<string, unknown> = {
      CustomerName: { value: args.customer_name },
    };
    if (args.customer_id) body.CustomerID = { value: args.customer_id };
    if (args.customer_class) body.CustomerClass = { value: args.customer_class };
    if (args.status) body.Status = { value: args.status };
    if (args.payment_terms) body.TermsID = { value: args.payment_terms };
    if (args.credit_limit !== undefined) body.CreditLimit = { value: args.credit_limit };
    return this.apiPut('Customer', body);
  }

  private async updateCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.status) body.Status = { value: args.status };
    if (args.credit_limit !== undefined) body.CreditLimit = { value: args.credit_limit };
    if (args.payment_terms) body.TermsID = { value: args.payment_terms };
    if (args.customer_name) body.CustomerName = { value: args.customer_name };
    return this.apiPut('Customer', body, args.customer_id as string);
  }

  private async listVendors(args: Record<string, unknown>): Promise<ToolResult> {
    const conditions: Array<string | undefined> = [];
    if (args.name) conditions.push(`VendorName eq '${encodeURIComponent(args.name as string)}'`);
    if (args.status) conditions.push(`Status eq '${encodeURIComponent(args.status as string)}'`);
    if (args.vendor_class) conditions.push(`VendorClassID eq '${encodeURIComponent(args.vendor_class as string)}'`);
    return this.apiGet('Vendor', this.buildFilter(conditions), (args.top as number) ?? 20, (args.skip as number) ?? 0);
  }

  private async getVendor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vendor_id) return { content: [{ type: 'text', text: 'vendor_id is required' }], isError: true };
    return this.apiGetSingle('Vendor', args.vendor_id as string);
  }

  private async createVendor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vendor_name) return { content: [{ type: 'text', text: 'vendor_name is required' }], isError: true };
    const body: Record<string, unknown> = {
      VendorName: { value: args.vendor_name },
    };
    if (args.vendor_id) body.VendorID = { value: args.vendor_id };
    if (args.vendor_class) body.VendorClass = { value: args.vendor_class };
    if (args.status) body.Status = { value: args.status };
    if (args.payment_terms) body.TermsID = { value: args.payment_terms };
    return this.apiPut('Vendor', body);
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const conditions: Array<string | undefined> = [];
    if (args.customer_id) conditions.push(`CustomerID eq '${encodeURIComponent(args.customer_id as string)}'`);
    if (args.status) conditions.push(`Status eq '${encodeURIComponent(args.status as string)}'`);
    if (args.doc_type) conditions.push(`Type eq '${encodeURIComponent(args.doc_type as string)}'`);
    if (args.date_from) conditions.push(`Date ge datetimeoffset'${encodeURIComponent(args.date_from as string)}T00:00:00+00:00'`);
    if (args.date_to) conditions.push(`Date le datetimeoffset'${encodeURIComponent(args.date_to as string)}T23:59:59+00:00'`);
    return this.apiGet('ARInvoice', this.buildFilter(conditions), (args.top as number) ?? 20, (args.skip as number) ?? 0);
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reference_nbr) return { content: [{ type: 'text', text: 'reference_nbr is required' }], isError: true };
    const docType = (args.doc_type as string) ?? 'Invoice';
    return this.apiGetSingle('ARInvoice', `${docType}%2F${encodeURIComponent(args.reference_nbr as string)}`);
  }

  private async createInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.details) {
      return { content: [{ type: 'text', text: 'customer_id and details are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      Type: { value: 'Invoice' },
      CustomerID: { value: args.customer_id },
      Details: args.details,
    };
    if (args.doc_date) body.Date = { value: args.doc_date };
    if (args.due_date) body.DueDate = { value: args.due_date };
    if (args.doc_desc) body.Description = { value: args.doc_desc };
    return this.apiPut('ARInvoice', body);
  }

  private async releaseInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reference_nbr) return { content: [{ type: 'text', text: 'reference_nbr is required' }], isError: true };
    const docType = (args.doc_type as string) ?? 'Invoice';
    const body = {
      entity: {
        Type: { value: docType },
        ReferenceNbr: { value: args.reference_nbr },
      },
    };
    return this.apiPost('ARInvoice', 'ReleaseARDocument', body);
  }

  private async listSalesOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const conditions: Array<string | undefined> = [];
    if (args.customer_id) conditions.push(`CustomerID eq '${encodeURIComponent(args.customer_id as string)}'`);
    if (args.order_type) conditions.push(`OrderType eq '${encodeURIComponent(args.order_type as string)}'`);
    if (args.status) conditions.push(`Status eq '${encodeURIComponent(args.status as string)}'`);
    return this.apiGet('SalesOrder', this.buildFilter(conditions), (args.top as number) ?? 20, (args.skip as number) ?? 0);
  }

  private async getSalesOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_type || !args.order_nbr) {
      return { content: [{ type: 'text', text: 'order_type and order_nbr are required' }], isError: true };
    }
    return this.apiGetSingle('SalesOrder', `${encodeURIComponent(args.order_type as string)}%2F${encodeURIComponent(args.order_nbr as string)}`);
  }

  private async createSalesOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.details) {
      return { content: [{ type: 'text', text: 'customer_id and details are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      OrderType: { value: (args.order_type as string) ?? 'SO' },
      CustomerID: { value: args.customer_id },
      Details: args.details,
    };
    if (args.order_date) body.Date = { value: args.order_date };
    if (args.description) body.Description = { value: args.description };
    return this.apiPut('SalesOrder', body);
  }

  private async listStockItems(args: Record<string, unknown>): Promise<ToolResult> {
    const conditions: Array<string | undefined> = [];
    if (args.item_class) conditions.push(`ItemClass eq '${encodeURIComponent(args.item_class as string)}'`);
    if (args.status) conditions.push(`ItemStatus eq '${encodeURIComponent(args.status as string)}'`);
    if (args.description) conditions.push(`Description eq '${encodeURIComponent(args.description as string)}'`);
    return this.apiGet('StockItem', this.buildFilter(conditions), (args.top as number) ?? 20, (args.skip as number) ?? 0);
  }

  private async getStockItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.inventory_id) return { content: [{ type: 'text', text: 'inventory_id is required' }], isError: true };
    return this.apiGetSingle('StockItem', args.inventory_id as string);
  }

  private async listPayments(args: Record<string, unknown>): Promise<ToolResult> {
    const conditions: Array<string | undefined> = [];
    if (args.customer_id) conditions.push(`CustomerID eq '${encodeURIComponent(args.customer_id as string)}'`);
    if (args.status) conditions.push(`Status eq '${encodeURIComponent(args.status as string)}'`);
    if (args.date_from) conditions.push(`ApplicationDate ge datetimeoffset'${encodeURIComponent(args.date_from as string)}T00:00:00+00:00'`);
    if (args.date_to) conditions.push(`ApplicationDate le datetimeoffset'${encodeURIComponent(args.date_to as string)}T23:59:59+00:00'`);
    return this.apiGet('ARPayment', this.buildFilter(conditions), (args.top as number) ?? 20, (args.skip as number) ?? 0);
  }

  private async getPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.reference_nbr) return { content: [{ type: 'text', text: 'reference_nbr is required' }], isError: true };
    const docType = (args.doc_type as string) ?? 'Payment';
    return this.apiGetSingle('ARPayment', `${docType}%2F${encodeURIComponent(args.reference_nbr as string)}`);
  }
}
