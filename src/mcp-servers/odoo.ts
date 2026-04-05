/**
 * Odoo ERP MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Odoo ERP JSON-RPC API (all versions 14+)
// Base URL: configurable (e.g. https://yourcompany.odoo.com or http://localhost:8069)
// Auth: session-based — POST /web/dataset/call_kw with session_id cookie after authenticate call
// Docs: https://www.odoo.com/documentation/17.0/developer/reference/external_api.html
// Note: Odoo uses JSON-RPC 2.0 over HTTP POST, not a conventional REST API.
//       This adapter wraps all JSON-RPC calls in the MCPAdapterBase pattern.
// Rate limits: not enforced by Odoo itself; depends on server configuration

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OdooConfig {
  baseUrl: string;
  database: string;
  username: string;
  password: string;
}

export class OdooMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly database: string;
  private readonly username: string;
  private readonly password: string;
  private sessionId: string | null = null;
  private uid: number | null = null;

  constructor(config: OdooConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.database = config.database;
    this.username = config.username;
    this.password = config.password;
  }

  static catalog() {
    return {
      name: 'odoo',
      displayName: 'Odoo ERP',
      version: '1.0.0',
      category: 'erp',
      keywords: [
        'odoo', 'erp', 'open source', 'crm', 'partners', 'customers',
        'products', 'sale orders', 'invoices', 'stock', 'inventory',
        'employees', 'projects', 'tasks', 'accounting',
      ],
      toolNames: [
        'search_read_partners', 'create_partner', 'search_read_products',
        'create_product', 'search_read_sale_orders', 'create_sale_order',
        'confirm_sale_order', 'search_read_invoices', 'create_invoice',
        'search_read_stock_moves', 'list_employees', 'search_read_projects',
        'create_task', 'get_account_balance',
      ],
      description: 'Odoo ERP via JSON-RPC: manage partners, products, sale orders, invoices, stock moves, employees, projects, tasks, and accounting balances.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_read_partners',
        description: 'Search and retrieve partner (customer/vendor/contact) records from Odoo',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search term to filter partners by name, email, or phone' },
            is_customer: { type: 'boolean', description: 'Filter to customers only (customer_rank > 0)' },
            is_vendor: { type: 'boolean', description: 'Filter to vendors only (supplier_rank > 0)' },
            limit: { type: 'number', description: 'Maximum records to return (default: 50)' },
            fields: {
              type: 'array',
              description: 'Fields to return (default: id, name, email, phone, street, city, country_id)',
              items: { type: 'string' },
            },
          },
        },
      },
      {
        name: 'create_partner',
        description: 'Create a new partner (customer, vendor, or contact) in Odoo',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Partner name (required)' },
            email: { type: 'string', description: 'Email address' },
            phone: { type: 'string', description: 'Phone number' },
            street: { type: 'string', description: 'Street address' },
            city: { type: 'string', description: 'City' },
            country_id: { type: 'number', description: 'Country ID (Odoo res.country ID)' },
            is_company: { type: 'boolean', description: 'True if this partner is a company (default: false)' },
            customer_rank: { type: 'number', description: 'Set to 1 to mark as customer' },
            supplier_rank: { type: 'number', description: 'Set to 1 to mark as vendor' },
          },
          required: ['name'],
        },
      },
      {
        name: 'search_read_products',
        description: 'Search and retrieve product records from Odoo',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search by product name or internal reference' },
            product_type: { type: 'string', description: 'Filter by type: consu (consumable), service, product (storable)' },
            limit: { type: 'number', description: 'Maximum records to return (default: 50)' },
            fields: {
              type: 'array',
              description: 'Fields to return (default: id, name, type, list_price, standard_price, uom_id)',
              items: { type: 'string' },
            },
          },
        },
      },
      {
        name: 'create_product',
        description: 'Create a new product template in Odoo',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Product name (required)' },
            product_type: { type: 'string', description: 'Type: consu, service, or product (default: product)' },
            list_price: { type: 'number', description: 'Sales price' },
            standard_price: { type: 'number', description: 'Cost price' },
            default_code: { type: 'string', description: 'Internal reference / SKU' },
            description: { type: 'string', description: 'Product description' },
          },
          required: ['name'],
        },
      },
      {
        name: 'search_read_sale_orders',
        description: 'Search and retrieve sales orders from Odoo',
        inputSchema: {
          type: 'object',
          properties: {
            partner_id: { type: 'number', description: 'Partner (customer) ID to filter orders' },
            state: { type: 'string', description: 'Filter by state: draft, sent, sale (confirmed), done, cancel' },
            from_date: { type: 'string', description: 'Filter orders created on or after (YYYY-MM-DD)' },
            limit: { type: 'number', description: 'Maximum records to return (default: 50)' },
            fields: {
              type: 'array',
              description: 'Fields to return',
              items: { type: 'string' },
            },
          },
        },
      },
      {
        name: 'create_sale_order',
        description: 'Create a new sales order (quotation) in Odoo',
        inputSchema: {
          type: 'object',
          properties: {
            partner_id: { type: 'number', description: 'Customer partner ID (required)' },
            commitment_date: { type: 'string', description: 'Commitment/delivery date (YYYY-MM-DD)' },
            order_lines: {
              type: 'array',
              description: 'Order line items',
              items: {
                type: 'object',
                properties: {
                  product_id: { type: 'number', description: 'Product ID' },
                  product_uom_qty: { type: 'number', description: 'Ordered quantity' },
                  price_unit: { type: 'number', description: 'Unit price' },
                },
              },
            },
          },
          required: ['partner_id'],
        },
      },
      {
        name: 'confirm_sale_order',
        description: 'Confirm a sales order (move from quotation/draft to confirmed sale) in Odoo',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'number', description: 'Sale order ID to confirm' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'search_read_invoices',
        description: 'Search and retrieve invoices (account.move) from Odoo',
        inputSchema: {
          type: 'object',
          properties: {
            partner_id: { type: 'number', description: 'Partner ID to filter invoices' },
            state: { type: 'string', description: 'Filter by state: draft, posted, cancel' },
            move_type: { type: 'string', description: 'Invoice type: out_invoice, in_invoice, out_refund, in_refund' },
            from_date: { type: 'string', description: 'Filter invoices on or after invoice date (YYYY-MM-DD)' },
            limit: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new customer invoice (account.move) in Odoo',
        inputSchema: {
          type: 'object',
          properties: {
            partner_id: { type: 'number', description: 'Customer partner ID (required)' },
            move_type: { type: 'string', description: 'out_invoice (customer invoice) or in_invoice (vendor bill); default: out_invoice' },
            invoice_date: { type: 'string', description: 'Invoice date (YYYY-MM-DD); defaults to today' },
            invoice_date_due: { type: 'string', description: 'Payment due date (YYYY-MM-DD)' },
            invoice_lines: {
              type: 'array',
              description: 'Invoice line items',
              items: {
                type: 'object',
                properties: {
                  product_id: { type: 'number', description: 'Product ID' },
                  quantity: { type: 'number', description: 'Quantity' },
                  price_unit: { type: 'number', description: 'Unit price' },
                  name: { type: 'string', description: 'Line description' },
                },
              },
            },
          },
          required: ['partner_id'],
        },
      },
      {
        name: 'search_read_stock_moves',
        description: 'Search and retrieve stock moves (inventory transactions) from Odoo',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'number', description: 'Product ID to filter stock moves' },
            state: { type: 'string', description: 'Filter by state: draft, confirmed, done, cancel' },
            from_date: { type: 'string', description: 'Filter moves on or after date (YYYY-MM-DD)' },
            limit: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
      {
        name: 'list_employees',
        description: 'List employees from Odoo HR module, optionally filtered by department or job position',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: { type: 'number', description: 'Department ID to filter employees' },
            job_id: { type: 'number', description: 'Job position ID to filter employees' },
            active: { type: 'boolean', description: 'Filter by active status (default: true)' },
            limit: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
      {
        name: 'search_read_projects',
        description: 'Search and retrieve projects from Odoo Project module',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search by project name' },
            partner_id: { type: 'number', description: 'Customer partner ID to filter projects' },
            limit: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in an Odoo project',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Task title/name (required)' },
            project_id: { type: 'number', description: 'Project ID to assign the task to (required)' },
            description: { type: 'string', description: 'Task description (HTML supported)' },
            assigned_to: { type: 'number', description: 'User ID to assign the task to' },
            deadline: { type: 'string', description: 'Task deadline (YYYY-MM-DD)' },
            tag_ids: {
              type: 'array',
              description: 'Array of tag IDs to apply to the task',
              items: { type: 'number' },
            },
          },
          required: ['name', 'project_id'],
        },
      },
      {
        name: 'get_account_balance',
        description: 'Get current balance for GL accounts from Odoo, optionally filtered by account type or code range',
        inputSchema: {
          type: 'object',
          properties: {
            account_type: { type: 'string', description: 'Account type: asset_receivable, liability_payable, income, expense, asset_cash, etc.' },
            from_code: { type: 'string', description: 'Starting account code for range filter' },
            to_code: { type: 'string', description: 'Ending account code for range filter' },
            limit: { type: 'number', description: 'Maximum records to return (default: 50)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_read_partners': return this.searchReadPartners(args);
        case 'create_partner': return this.createPartner(args);
        case 'search_read_products': return this.searchReadProducts(args);
        case 'create_product': return this.createProduct(args);
        case 'search_read_sale_orders': return this.searchReadSaleOrders(args);
        case 'create_sale_order': return this.createSaleOrder(args);
        case 'confirm_sale_order': return this.confirmSaleOrder(args);
        case 'search_read_invoices': return this.searchReadInvoices(args);
        case 'create_invoice': return this.createInvoice(args);
        case 'search_read_stock_moves': return this.searchReadStockMoves(args);
        case 'list_employees': return this.listEmployees(args);
        case 'search_read_projects': return this.searchReadProjects(args);
        case 'create_task': return this.createTask(args);
        case 'get_account_balance': return this.getAccountBalance(args);
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

  /** Authenticate with Odoo and cache session_id + uid */
  private async ensureSession(): Promise<void> {
    if (this.sessionId && this.uid !== null) return;

    const response = await this.fetchWithRetry(`${this.baseUrl}/web/session/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: this.database,
          login: this.username,
          password: this.password,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Odoo authentication HTTP error: ${response.status} ${response.statusText}`);
    }

    // Extract Set-Cookie session_id
    const setCookie = response.headers.get('set-cookie') ?? '';
    const match = setCookie.match(/session_id=([^;]+)/);
    if (match) this.sessionId = match[1];

    const body = await response.json() as {
      result?: { uid?: number; session_id?: string };
      error?: { data?: { message?: string } };
    };

    if (body.error) {
      throw new Error(`Odoo auth error: ${body.error.data?.message ?? JSON.stringify(body.error)}`);
    }

    if (!body.result?.uid) {
      throw new Error('Odoo authentication failed: invalid credentials or database');
    }

    this.uid = body.result.uid;
    // Some Odoo versions return session_id in result
    if (body.result.session_id) this.sessionId = body.result.session_id;
  }

  /**
   * Execute a JSON-RPC call to /web/dataset/call_kw (Odoo standard endpoint).
   * model: Odoo model technical name (e.g. 'res.partner')
   * method: ORM method (search_read, create, write, execute_kw, button_confirm, etc.)
   * args / kwargs: positional and keyword arguments per Odoo JSON-RPC spec
   */
  private async jsonRpc(
    model: string,
    method: string,
    args: unknown[],
    kwargs: Record<string, unknown> = {},
  ): Promise<ToolResult> {
    await this.ensureSession();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.sessionId) headers['Cookie'] = `session_id=${this.sessionId}`;

    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model,
        method,
        args,
        kwargs,
      },
    };

    const response = await this.fetchWithRetry(`${this.baseUrl}/web/dataset/call_kw`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json() as { result?: unknown; error?: { data?: { message?: string } } };

    if (data.error) {
      const msg = data.error.data?.message ?? JSON.stringify(data.error);
      return { content: [{ type: 'text', text: `Odoo JSON-RPC error: ${msg}` }], isError: true };
    }

    return { content: [{ type: 'text', text: this.truncate(data.result) }], isError: false };
  }

  private async searchReadPartners(args: Record<string, unknown>): Promise<ToolResult> {
    const domain: unknown[] = [];
    if (args.search) domain.push('|', ['name', 'ilike', args.search], ['email', 'ilike', args.search]);
    if (args.is_customer) domain.push(['customer_rank', '>', 0]);
    if (args.is_vendor) domain.push(['supplier_rank', '>', 0]);
    const fields = (args.fields as string[]) ?? ['id', 'name', 'email', 'phone', 'street', 'city', 'country_id'];
    return this.jsonRpc('res.partner', 'search_read', [domain], {
      fields,
      limit: (args.limit as number) || 50,
    });
  }

  private async createPartner(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const vals: Record<string, unknown> = { name: args.name };
    if (args.email !== undefined) vals.email = args.email;
    if (args.phone !== undefined) vals.phone = args.phone;
    if (args.street !== undefined) vals.street = args.street;
    if (args.city !== undefined) vals.city = args.city;
    if (args.country_id !== undefined) vals.country_id = args.country_id;
    if (args.is_company !== undefined) vals.is_company = args.is_company;
    if (args.customer_rank !== undefined) vals.customer_rank = args.customer_rank;
    if (args.supplier_rank !== undefined) vals.supplier_rank = args.supplier_rank;
    return this.jsonRpc('res.partner', 'create', [vals]);
  }

  private async searchReadProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const domain: unknown[] = [['active', '=', true]];
    if (args.search) domain.push(['name', 'ilike', args.search]);
    if (args.product_type) domain.push(['type', '=', args.product_type]);
    const fields = (args.fields as string[]) ?? ['id', 'name', 'type', 'list_price', 'standard_price', 'uom_id', 'default_code'];
    return this.jsonRpc('product.template', 'search_read', [domain], {
      fields,
      limit: (args.limit as number) || 50,
    });
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const vals: Record<string, unknown> = { name: args.name, type: args.product_type ?? 'product' };
    if (args.list_price !== undefined) vals.list_price = args.list_price;
    if (args.standard_price !== undefined) vals.standard_price = args.standard_price;
    if (args.default_code !== undefined) vals.default_code = args.default_code;
    if (args.description !== undefined) vals.description = args.description;
    return this.jsonRpc('product.template', 'create', [vals]);
  }

  private async searchReadSaleOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const domain: unknown[] = [];
    if (args.partner_id) domain.push(['partner_id', '=', args.partner_id]);
    if (args.state) domain.push(['state', '=', args.state]);
    if (args.from_date) domain.push(['date_order', '>=', `${args.from_date} 00:00:00`]);
    const fields = (args.fields as string[]) ?? ['id', 'name', 'partner_id', 'state', 'amount_total', 'date_order'];
    return this.jsonRpc('sale.order', 'search_read', [domain], {
      fields,
      limit: (args.limit as number) || 50,
    });
  }

  private async createSaleOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.partner_id) return { content: [{ type: 'text', text: 'partner_id is required' }], isError: true };
    const lines = ((args.order_lines as Record<string, unknown>[]) ?? []).map(l => [0, 0, l]);
    const vals: Record<string, unknown> = {
      partner_id: args.partner_id,
      order_line: lines,
    };
    if (args.commitment_date) vals.commitment_date = `${args.commitment_date} 00:00:00`;
    return this.jsonRpc('sale.order', 'create', [vals]);
  }

  private async confirmSaleOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    return this.jsonRpc('sale.order', 'action_confirm', [[args.order_id]]);
  }

  private async searchReadInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const domain: unknown[] = [];
    if (args.partner_id) domain.push(['partner_id', '=', args.partner_id]);
    if (args.state) domain.push(['state', '=', args.state]);
    if (args.move_type) domain.push(['move_type', '=', args.move_type]);
    if (args.from_date) domain.push(['invoice_date', '>=', args.from_date]);
    return this.jsonRpc('account.move', 'search_read', [domain], {
      fields: ['id', 'name', 'partner_id', 'state', 'move_type', 'amount_total', 'invoice_date', 'invoice_date_due'],
      limit: (args.limit as number) || 50,
    });
  }

  private async createInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.partner_id) return { content: [{ type: 'text', text: 'partner_id is required' }], isError: true };
    const lines = ((args.invoice_lines as Record<string, unknown>[]) ?? []).map(l => [0, 0, l]);
    const vals: Record<string, unknown> = {
      partner_id: args.partner_id,
      move_type: args.move_type ?? 'out_invoice',
      invoice_line_ids: lines,
    };
    if (args.invoice_date) vals.invoice_date = args.invoice_date;
    if (args.invoice_date_due) vals.invoice_date_due = args.invoice_date_due;
    return this.jsonRpc('account.move', 'create', [vals]);
  }

  private async searchReadStockMoves(args: Record<string, unknown>): Promise<ToolResult> {
    const domain: unknown[] = [];
    if (args.product_id) domain.push(['product_id', '=', args.product_id]);
    if (args.state) domain.push(['state', '=', args.state]);
    if (args.from_date) domain.push(['date', '>=', `${args.from_date} 00:00:00`]);
    return this.jsonRpc('stock.move', 'search_read', [domain], {
      fields: ['id', 'name', 'product_id', 'product_qty', 'state', 'date', 'location_id', 'location_dest_id'],
      limit: (args.limit as number) || 50,
    });
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const domain: unknown[] = [['active', '=', args.active !== false]];
    if (args.department_id) domain.push(['department_id', '=', args.department_id]);
    if (args.job_id) domain.push(['job_id', '=', args.job_id]);
    return this.jsonRpc('hr.employee', 'search_read', [domain], {
      fields: ['id', 'name', 'job_id', 'department_id', 'work_email', 'work_phone'],
      limit: (args.limit as number) || 50,
    });
  }

  private async searchReadProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const domain: unknown[] = [['active', '=', true]];
    if (args.search) domain.push(['name', 'ilike', args.search]);
    if (args.partner_id) domain.push(['partner_id', '=', args.partner_id]);
    return this.jsonRpc('project.project', 'search_read', [domain], {
      fields: ['id', 'name', 'partner_id', 'user_id', 'date_start', 'date'],
      limit: (args.limit as number) || 50,
    });
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const vals: Record<string, unknown> = {
      name: args.name,
      project_id: args.project_id,
    };
    if (args.description !== undefined) vals.description = args.description;
    if (args.assigned_to !== undefined) vals.user_ids = [args.assigned_to];
    if (args.deadline !== undefined) vals.date_deadline = args.deadline;
    if (args.tag_ids !== undefined) vals.tag_ids = (args.tag_ids as number[]).map(id => [4, id]);
    return this.jsonRpc('project.task', 'create', [vals]);
  }

  private async getAccountBalance(args: Record<string, unknown>): Promise<ToolResult> {
    const domain: unknown[] = [['deprecated', '=', false]];
    if (args.account_type) domain.push(['account_type', '=', args.account_type]);
    if (args.from_code) domain.push(['code', '>=', args.from_code]);
    if (args.to_code) domain.push(['code', '<=', args.to_code]);
    return this.jsonRpc('account.account', 'search_read', [domain], {
      fields: ['id', 'code', 'name', 'account_type', 'current_balance'],
      limit: (args.limit as number) || 50,
    });
  }
}
