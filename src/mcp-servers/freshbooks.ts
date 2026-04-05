/**
 * FreshBooks MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. FreshBooks has not published an official MCP server.
//   Several community servers exist (roboulos/freshbooks-mcp, OI-OS/freshbooks-mcp-server,
//   Good-Samaritan-Software-LLC/freshbooks-mcp) but none is an official FreshBooks product.
//
// Base URL: https://api.freshbooks.com
// Auth: OAuth2 Bearer token — Authorization: Bearer <access_token>
//   Accounting endpoints use accountId: /accounting/account/{accountId}/
//   Time tracking / projects use businessId: /timetracking/business/{businessId}/
//   Both IDs are available from: GET /auth/api/v1/users/me
// Docs: https://developer.freshbooks.com/docs/accounting/
// Rate limits: Not publicly documented. FreshBooks enforces per-account limits server-side.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FreshBooksConfig {
  accessToken: string;
  accountId: string;
  businessId?: string;
  baseUrl?: string;
}

export class FreshBooksMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly accountId: string;
  private readonly businessId: string;
  private readonly baseUrl: string;

  constructor(config: FreshBooksConfig) {
    super();
    this.accessToken = config.accessToken;
    this.accountId = config.accountId;
    this.businessId = config.businessId || '';
    this.baseUrl = config.baseUrl || 'https://api.freshbooks.com';
  }

  static catalog() {
    return {
      name: 'freshbooks',
      displayName: 'FreshBooks',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['freshbooks', 'invoice', 'client', 'expense', 'payment', 'estimate', 'project', 'accounting', 'billing', 'time tracking', 'freelance', 'small business'],
      toolNames: [
        'get_identity',
        'list_clients', 'get_client', 'create_client', 'update_client',
        'list_invoices', 'get_invoice', 'create_invoice', 'update_invoice',
        'list_expenses', 'get_expense', 'create_expense',
        'list_payments', 'get_payment', 'create_payment',
        'list_estimates', 'get_estimate', 'create_estimate',
        'list_items', 'get_item', 'create_item',
        'list_taxes', 'get_tax',
        'list_time_entries', 'create_time_entry',
        'list_projects', 'get_project', 'create_project',
      ],
      description: 'Manage FreshBooks accounting: invoices, clients, expenses, payments, estimates, items, taxes, time tracking, and projects via the FreshBooks REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Identity ──────────────────────────────────────────────────────────
      {
        name: 'get_identity',
        description: 'Get the current user identity, including accountId and businessId needed for other API calls',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Clients ───────────────────────────────────────────────────────────
      {
        name: 'list_clients',
        description: 'List clients in the FreshBooks account, with optional name search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            search_name: { type: 'string', description: 'Filter clients by name (partial match)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Clients per page (max 100, default: 25)' },
          },
        },
      },
      {
        name: 'get_client',
        description: 'Retrieve a single FreshBooks client by their client ID',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The FreshBooks client ID' },
          },
          required: ['client_id'],
        },
      },
      {
        name: 'create_client',
        description: 'Create a new client record in FreshBooks with name, email, and contact details',
        inputSchema: {
          type: 'object',
          properties: {
            fname: { type: 'string', description: 'Client first name' },
            lname: { type: 'string', description: 'Client last name' },
            email: { type: 'string', description: 'Client email address' },
            organization: { type: 'string', description: 'Company or organization name' },
            phone: { type: 'string', description: 'Phone number' },
            currency_code: { type: 'string', description: 'Default currency code for invoices (e.g. USD, EUR, CAD — default: USD)' },
          },
          required: ['fname', 'lname'],
        },
      },
      {
        name: 'update_client',
        description: 'Update an existing FreshBooks client by ID — change name, email, or organization',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The FreshBooks client ID to update' },
            fname: { type: 'string', description: 'Updated first name' },
            lname: { type: 'string', description: 'Updated last name' },
            email: { type: 'string', description: 'Updated email address' },
            organization: { type: 'string', description: 'Updated organization name' },
          },
          required: ['client_id'],
        },
      },
      // ── Invoices ──────────────────────────────────────────────────────────
      {
        name: 'list_invoices',
        description: 'List invoices in the FreshBooks account, with optional filters for status and client',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'Filter by client ID' },
            status: { type: 'number', description: 'Filter by status: 1=draft, 2=sent, 3=viewed, 4=paid, 5=auto-paid, 6=retry, 7=failed, 8=partial' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Invoices per page (max 100, default: 25)' },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a single FreshBooks invoice by its invoice ID, including line items and payment status',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: { type: 'string', description: 'The FreshBooks invoice ID' },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new invoice in FreshBooks for a client, with line items and optional due date',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The client ID to bill' },
            lines: {
              type: 'array',
              description: 'Line items for the invoice (required)',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Line item name/description' },
                  unit_cost: { type: 'number', description: 'Cost per unit' },
                  qty: { type: 'number', description: 'Quantity' },
                  taxName1: { type: 'string', description: 'Name of first tax to apply (optional)' },
                },
              },
            },
            due_offset_days: { type: 'number', description: 'Days until due from creation (default: 30)' },
            notes: { type: 'string', description: 'Notes or payment terms on the invoice' },
            currency_code: { type: 'string', description: 'Invoice currency (default: USD)' },
            discount_value: { type: 'number', description: 'Discount percentage to apply (0-100)' },
          },
          required: ['client_id', 'lines'],
        },
      },
      {
        name: 'update_invoice',
        description: 'Update an existing invoice by ID — change notes, due date, status, or discount',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: { type: 'string', description: 'The FreshBooks invoice ID to update' },
            notes: { type: 'string', description: 'Updated notes' },
            due_offset_days: { type: 'number', description: 'Updated days until due' },
            status: { type: 'number', description: 'New status code: 1=draft, 2=sent' },
            discount_value: { type: 'number', description: 'New discount percentage' },
          },
          required: ['invoice_id'],
        },
      },
      // ── Expenses ──────────────────────────────────────────────────────────
      {
        name: 'list_expenses',
        description: 'List expenses in the FreshBooks account, with optional client and category filters',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'Filter expenses by client ID' },
            category_id: { type: 'string', description: 'Filter by expense category ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Expenses per page (max 100, default: 25)' },
          },
        },
      },
      {
        name: 'get_expense',
        description: 'Retrieve a single FreshBooks expense by ID',
        inputSchema: {
          type: 'object',
          properties: {
            expense_id: { type: 'string', description: 'The FreshBooks expense ID' },
          },
          required: ['expense_id'],
        },
      },
      {
        name: 'create_expense',
        description: 'Create a new expense record in FreshBooks with amount, vendor, and optional client',
        inputSchema: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Expense amount (required)' },
            currency_code: { type: 'string', description: 'Currency code (default: USD)' },
            vendor: { type: 'string', description: 'Vendor name' },
            client_id: { type: 'string', description: 'Associate with a client ID (optional)' },
            category_id: { type: 'string', description: 'Expense category ID (optional)' },
            notes: { type: 'string', description: 'Notes about the expense' },
            date: { type: 'string', description: 'Date of expense in YYYY-MM-DD format (default: today)' },
          },
          required: ['amount'],
        },
      },
      // ── Payments ──────────────────────────────────────────────────────────
      {
        name: 'list_payments',
        description: 'List payments received on invoices, with optional invoice filter',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: { type: 'string', description: 'Filter payments by invoice ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Payments per page (max 100, default: 25)' },
          },
        },
      },
      {
        name: 'get_payment',
        description: 'Retrieve a single FreshBooks payment by ID',
        inputSchema: {
          type: 'object',
          properties: {
            payment_id: { type: 'string', description: 'The FreshBooks payment ID' },
          },
          required: ['payment_id'],
        },
      },
      {
        name: 'create_payment',
        description: 'Record a payment against an existing FreshBooks invoice',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: { type: 'string', description: 'Invoice ID to apply the payment to' },
            amount: { type: 'number', description: 'Payment amount' },
            date: { type: 'string', description: 'Payment date in YYYY-MM-DD format (default: today)' },
            type: { type: 'string', description: 'Payment type: Check, Credit, Cash, PayPal, Bank Transfer, etc. (default: Check)' },
            notes: { type: 'string', description: 'Optional payment notes' },
          },
          required: ['invoice_id', 'amount'],
        },
      },
      // ── Estimates ─────────────────────────────────────────────────────────
      {
        name: 'list_estimates',
        description: 'List estimates (quotes) in the FreshBooks account, with optional client filter',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'Filter estimates by client ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Estimates per page (max 100, default: 25)' },
          },
        },
      },
      {
        name: 'get_estimate',
        description: 'Retrieve a single FreshBooks estimate (quote) by ID, including line items',
        inputSchema: {
          type: 'object',
          properties: {
            estimate_id: { type: 'string', description: 'The FreshBooks estimate ID' },
          },
          required: ['estimate_id'],
        },
      },
      {
        name: 'create_estimate',
        description: 'Create a new estimate (quote) in FreshBooks for a client with line items',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The client ID for the estimate' },
            lines: {
              type: 'array',
              description: 'Line items (required)',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Line item name' },
                  unit_cost: { type: 'number', description: 'Unit cost' },
                  qty: { type: 'number', description: 'Quantity' },
                },
              },
            },
            notes: { type: 'string', description: 'Notes or terms' },
            currency_code: { type: 'string', description: 'Currency code (default: USD)' },
          },
          required: ['client_id', 'lines'],
        },
      },
      // ── Items ─────────────────────────────────────────────────────────────
      {
        name: 'list_items',
        description: 'List saved line items (products/services catalog) in FreshBooks',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Items per page (max 100, default: 25)' },
          },
        },
      },
      {
        name: 'get_item',
        description: 'Retrieve a specific saved line item by ID',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: { type: 'string', description: 'The FreshBooks item ID' },
          },
          required: ['item_id'],
        },
      },
      {
        name: 'create_item',
        description: 'Create a new saved line item (product or service) in the FreshBooks catalog',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Item name (required)' },
            unit_cost: { type: 'number', description: 'Default unit cost' },
            description: { type: 'string', description: 'Item description' },
            inventory: { type: 'number', description: 'Inventory count (optional)' },
          },
          required: ['name'],
        },
      },
      // ── Taxes ─────────────────────────────────────────────────────────────
      {
        name: 'list_taxes',
        description: 'List all tax rates configured in the FreshBooks account',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Taxes per page (max 100, default: 25)' },
          },
        },
      },
      {
        name: 'get_tax',
        description: 'Retrieve a specific tax rate by ID',
        inputSchema: {
          type: 'object',
          properties: {
            tax_id: { type: 'string', description: 'The FreshBooks tax ID' },
          },
          required: ['tax_id'],
        },
      },
      // ── Time Entries ──────────────────────────────────────────────────────
      {
        name: 'list_time_entries',
        description: 'List time tracking entries for the business. Requires businessId in adapter config.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'Filter by client ID' },
            project_id: { type: 'string', description: 'Filter by project ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Entries per page (max 100, default: 25)' },
          },
        },
      },
      {
        name: 'create_time_entry',
        description: 'Create a new time tracking entry for a project. Requires businessId in adapter config.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'Project ID to log time against (required)' },
            duration: { type: 'number', description: 'Duration in seconds (required)' },
            note: { type: 'string', description: 'Work description note' },
            started_at: { type: 'string', description: 'Start datetime in ISO 8601 format (default: now)' },
            billable: { type: 'boolean', description: 'Whether this time is billable (default: true)' },
          },
          required: ['project_id', 'duration'],
        },
      },
      // ── Projects ──────────────────────────────────────────────────────────
      {
        name: 'list_projects',
        description: 'List projects in the FreshBooks business. Requires businessId in adapter config.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'Filter by client ID' },
            complete: { type: 'boolean', description: 'Filter by completion status (default: shows all)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Projects per page (default: 25)' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details of a specific project by ID. Requires businessId in adapter config.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'The FreshBooks project ID' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new project in FreshBooks with title, client, and billing type. Requires businessId.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Project title (required)' },
            client_id: { type: 'string', description: 'Client ID associated with the project' },
            billing_method: { type: 'string', description: 'Billing method: hourly_rate, project_rate, or by_task (default: hourly_rate)' },
            hourly_rate: { type: 'number', description: 'Hourly rate if billing_method is hourly_rate' },
            project_type: { type: 'string', description: 'Project type: fixed_price or hourly (default: hourly)' },
            description: { type: 'string', description: 'Project description' },
          },
          required: ['title'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_identity':        return await this.getIdentity();
        case 'list_clients':        return await this.listClients(args);
        case 'get_client':          return await this.getClient(args);
        case 'create_client':       return await this.createClient(args);
        case 'update_client':       return await this.updateClient(args);
        case 'list_invoices':       return await this.listInvoices(args);
        case 'get_invoice':         return await this.getInvoice(args);
        case 'create_invoice':      return await this.createInvoice(args);
        case 'update_invoice':      return await this.updateInvoice(args);
        case 'list_expenses':       return await this.listExpenses(args);
        case 'get_expense':         return await this.getExpense(args);
        case 'create_expense':      return await this.createExpense(args);
        case 'list_payments':       return await this.listPayments(args);
        case 'get_payment':         return await this.getPayment(args);
        case 'create_payment':      return await this.createPayment(args);
        case 'list_estimates':      return await this.listEstimates(args);
        case 'get_estimate':        return await this.getEstimate(args);
        case 'create_estimate':     return await this.createEstimate(args);
        case 'list_items':          return await this.listItems(args);
        case 'get_item':            return await this.getItem(args);
        case 'create_item':         return await this.createItem(args);
        case 'list_taxes':          return await this.listTaxes(args);
        case 'get_tax':             return await this.getTax(args);
        case 'list_time_entries':   return await this.listTimeEntries(args);
        case 'create_time_entry':   return await this.createTimeEntry(args);
        case 'list_projects':       return await this.listProjects(args);
        case 'get_project':         return await this.getProject(args);
        case 'create_project':      return await this.createProject(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Api-Version': 'alpha',
    };
  }

  private requireBusiness(): ToolResult | null {
    if (!this.businessId) {
      return {
        content: [{ type: 'text', text: 'businessId is required in the adapter config for time tracking and project endpoints' }],
        isError: true,
      };
    }
    return null;
  }

  private async fbRequest(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `FreshBooks API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `FreshBooks returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private acctUrl(path: string): string {
    return `${this.baseUrl}/accounting/account/${this.accountId}/${path}`;
  }

  private bizUrl(path: string): string {
    return `${this.baseUrl}/timetracking/business/${this.businessId}/${path}`;
  }

  private listParams(args: Record<string, unknown>, extra?: Record<string, string>): string {
    const params = new URLSearchParams(extra);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return params.toString() ? `?${params.toString()}` : '';
  }

  // ── Identity ──────────────────────────────────────────────────────────────

  private async getIdentity(): Promise<ToolResult> {
    return this.fbRequest(`${this.baseUrl}/auth/api/v1/users/me`);
  }

  // ── Clients ───────────────────────────────────────────────────────────────

  private async listClients(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.search_name) params.set('search[name]', args.search_name as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fbRequest(this.acctUrl(`users/clients${params.toString() ? '?' + params.toString() : ''}`));
  }

  private async getClient(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fbRequest(this.acctUrl(`users/clients/${encodeURIComponent(args.client_id as string)}`));
  }

  private async createClient(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { fname: args.fname, lname: args.lname };
    if (args.email) body.email = args.email;
    if (args.organization) body.organization = args.organization;
    if (args.phone) body.home_phone = args.phone;
    if (args.currency_code) body.currency_code = args.currency_code;
    return this.fbRequest(this.acctUrl('users/clients'), { method: 'POST', body: JSON.stringify({ client: body }) });
  }

  private async updateClient(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.fname) body.fname = args.fname;
    if (args.lname) body.lname = args.lname;
    if (args.email) body.email = args.email;
    if (args.organization) body.organization = args.organization;
    return this.fbRequest(
      this.acctUrl(`users/clients/${encodeURIComponent(args.client_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ client: body }) },
    );
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.client_id) params.set('search[clientid]', args.client_id as string);
    if (args.status !== undefined) params.set('search[invoice_status]', String(args.status));
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fbRequest(this.acctUrl(`invoices/invoices${params.toString() ? '?' + params.toString() : ''}`));
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fbRequest(this.acctUrl(`invoices/invoices/${encodeURIComponent(args.invoice_id as string)}`));
  }

  private async createInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const lines = args.lines as Array<{ name: string; unit_cost: number; qty: number; taxName1?: string }>;
    const body = {
      invoice: {
        customerid: args.client_id,
        due_offset_days: (args.due_offset_days as number) ?? 30,
        notes: (args.notes as string) || '',
        currency_code: (args.currency_code as string) || 'USD',
        ...(args.discount_value !== undefined ? { discount_value: args.discount_value } : {}),
        lines: lines.map((l) => ({
          name: l.name,
          unit_cost: { amount: String(l.unit_cost), code: (args.currency_code as string) || 'USD' },
          qty: l.qty,
          type: 0,
          ...(l.taxName1 ? { taxName1: l.taxName1 } : {}),
        })),
      },
    };
    return this.fbRequest(this.acctUrl('invoices/invoices'), { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.notes !== undefined) body.notes = args.notes;
    if (args.due_offset_days !== undefined) body.due_offset_days = args.due_offset_days;
    if (args.status !== undefined) body.status = args.status;
    if (args.discount_value !== undefined) body.discount_value = args.discount_value;
    return this.fbRequest(
      this.acctUrl(`invoices/invoices/${encodeURIComponent(args.invoice_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ invoice: body }) },
    );
  }

  // ── Expenses ──────────────────────────────────────────────────────────────

  private async listExpenses(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.client_id) params.set('search[clientid]', args.client_id as string);
    if (args.category_id) params.set('search[categoryid]', args.category_id as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fbRequest(this.acctUrl(`expenses/expenses${params.toString() ? '?' + params.toString() : ''}`));
  }

  private async getExpense(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fbRequest(this.acctUrl(`expenses/expenses/${encodeURIComponent(args.expense_id as string)}`));
  }

  private async createExpense(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      amount: { amount: String(args.amount), code: (args.currency_code as string) || 'USD' },
    };
    if (args.vendor) body.vendor = args.vendor;
    if (args.client_id) body.clientid = args.client_id;
    if (args.category_id) body.categoryid = args.category_id;
    if (args.notes) body.notes = args.notes;
    if (args.date) body.date = args.date;
    return this.fbRequest(this.acctUrl('expenses/expenses'), { method: 'POST', body: JSON.stringify({ expense: body }) });
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  private async listPayments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.invoice_id) params.set('search[invoiceid]', args.invoice_id as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fbRequest(this.acctUrl(`payments/payments${params.toString() ? '?' + params.toString() : ''}`));
  }

  private async getPayment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fbRequest(this.acctUrl(`payments/payments/${encodeURIComponent(args.payment_id as string)}`));
  }

  private async createPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      payment: {
        invoiceid: args.invoice_id,
        amount: { amount: String(args.amount), code: 'USD' },
        date: (args.date as string) || new Date().toISOString().slice(0, 10),
        type: (args.type as string) || 'Check',
        ...(args.notes ? { note: args.notes } : {}),
      },
    };
    return this.fbRequest(this.acctUrl('payments/payments'), { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Estimates ─────────────────────────────────────────────────────────────

  private async listEstimates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.client_id) params.set('search[clientid]', args.client_id as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fbRequest(this.acctUrl(`estimates/estimates${params.toString() ? '?' + params.toString() : ''}`));
  }

  private async getEstimate(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fbRequest(this.acctUrl(`estimates/estimates/${encodeURIComponent(args.estimate_id as string)}`));
  }

  private async createEstimate(args: Record<string, unknown>): Promise<ToolResult> {
    const lines = args.lines as Array<{ name: string; unit_cost: number; qty: number }>;
    const body = {
      estimate: {
        customerid: args.client_id,
        notes: (args.notes as string) || '',
        currency_code: (args.currency_code as string) || 'USD',
        lines: lines.map((l) => ({
          name: l.name,
          unit_cost: { amount: String(l.unit_cost), code: (args.currency_code as string) || 'USD' },
          qty: l.qty,
          type: 0,
        })),
      },
    };
    return this.fbRequest(this.acctUrl('estimates/estimates'), { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  private async listItems(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fbRequest(this.acctUrl(`items/items${this.listParams(args)}`));
  }

  private async getItem(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fbRequest(this.acctUrl(`items/items/${encodeURIComponent(args.item_id as string)}`));
  }

  private async createItem(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.unit_cost !== undefined) body.unit_cost = { amount: String(args.unit_cost), code: 'USD' };
    if (args.description) body.description = args.description;
    if (args.inventory !== undefined) body.inventory = args.inventory;
    return this.fbRequest(this.acctUrl('items/items'), { method: 'POST', body: JSON.stringify({ item: body }) });
  }

  // ── Taxes ─────────────────────────────────────────────────────────────────

  private async listTaxes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fbRequest(this.acctUrl(`taxes/taxes${this.listParams(args)}`));
  }

  private async getTax(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fbRequest(this.acctUrl(`taxes/taxes/${encodeURIComponent(args.tax_id as string)}`));
  }

  // ── Time Entries ──────────────────────────────────────────────────────────

  private async listTimeEntries(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireBusiness();
    if (guard) return guard;
    const params = new URLSearchParams();
    if (args.client_id) params.set('client_id', args.client_id as string);
    if (args.project_id) params.set('project_id', args.project_id as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fbRequest(this.bizUrl(`time_entries${params.toString() ? '?' + params.toString() : ''}`));
  }

  private async createTimeEntry(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireBusiness();
    if (guard) return guard;
    const body: Record<string, unknown> = {
      project_id: args.project_id,
      duration: args.duration,
      billable: (args.billable as boolean) ?? true,
    };
    if (args.note) body.note = args.note;
    if (args.started_at) body.started_at = args.started_at;
    return this.fbRequest(this.bizUrl('time_entries'), { method: 'POST', body: JSON.stringify({ time_entry: body }) });
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireBusiness();
    if (guard) return guard;
    const params = new URLSearchParams();
    if (args.client_id) params.set('client_id', args.client_id as string);
    if (args.complete !== undefined) params.set('complete', String(args.complete));
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fbRequest(this.bizUrl(`projects${params.toString() ? '?' + params.toString() : ''}`));
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireBusiness();
    if (guard) return guard;
    return this.fbRequest(this.bizUrl(`projects/${encodeURIComponent(args.project_id as string)}`));
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    const guard = this.requireBusiness();
    if (guard) return guard;
    const body: Record<string, unknown> = {
      title: args.title,
      billing_method: (args.billing_method as string) || 'hourly_rate',
      project_type: (args.project_type as string) || 'hourly',
    };
    if (args.client_id) body.client_id = Number(args.client_id);
    if (args.hourly_rate !== undefined) body.rate = String(args.hourly_rate);
    if (args.description) body.description = args.description;
    return this.fbRequest(this.bizUrl('projects'), { method: 'POST', body: JSON.stringify({ project: body }) });
  }
}
