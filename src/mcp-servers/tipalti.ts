/**
 * Tipalti MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Tipalti MCP server was found on GitHub or npm as of 2026-03-28.
// Our adapter covers: 15 tools. Vendor MCP covers: N/A (no official MCP).
// Recommendation: use-rest-api — no official vendor MCP exists.
//
// IMPORTANT — TWO TIPALTI API SURFACES:
//   1. Procurement REST API: x-api-key header auth; Tipalti redacts base URLs in public docs (contact
//      Implementation Manager for base URL and token). Covers POs and procurement workflows.
//      Confirmed paths: POST/GET /api/v1/resources/pos, POST /api/v1/resources/getUploadUrl.
//   2. Legacy SOAP API: https://api.tipalti.com (PayeeFunctions.asmx, PayerFunctions.asmx) — NOT REST.
//
// Base URL: Tipalti Procurement REST API base URL is provisioned per-tenant (not public). The default
//   in this adapter (https://api.tipalti.com) is the SOAP service host, not REST. Operators must
//   override baseUrl with their provisioned REST base URL from Tipalti Implementation.
// Auth: Static API token in x-api-key header — obtained from Tipalti Implementation Manager.
//   NOTE: Previous OAuth2 client_credentials flow was INCORRECT per official docs.
// Docs: https://help.tipalti.com/hc/en-us/articles/30718248220823-Procurement-REST-API-documentation
//       https://developer.tipalti.com/
// Rate limits: 429 returned when rate limit exceeded; Retry-After header indicates wait time.
//   Specific limits not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TipaltiConfig {
  apiToken: string;
  baseUrl?: string;
}

export class TipaltiMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: TipaltiConfig) {
    super();
    this.apiToken = config.apiToken;
    // NOTE: The Tipalti Procurement REST API base URL is tenant-provisioned. Operators must
    // supply their actual base URL via config.baseUrl. The default below is a placeholder.
    this.baseUrl = (config.baseUrl ?? 'https://api.tipalti.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'tipalti',
      displayName: 'Tipalti',
      version: '2.0.0',
      category: 'finance' as const,
      keywords: [
        'tipalti', 'accounts payable', 'AP', 'payee', 'vendor', 'supplier',
        'bill', 'invoice', 'payment', 'payout', 'mass payment', 'global payment',
        'tax', 'W-9', 'W-8', 'onboarding', 'procurement', 'ERP',
      ],
      toolNames: [
        'list_payees', 'get_payee', 'create_payee', 'update_payee',
        'get_payee_payment_method',
        'list_bills', 'get_bill', 'create_bill', 'approve_bill', 'void_bill',
        'list_payments', 'get_payment',
        'list_payment_orders', 'get_payment_order',
        'get_payee_tax_forms',
      ],
      description: 'Accounts payable automation: manage payees, bills, payments, and payout orders through the Tipalti REST API.',
      author: 'protectnil' as const,
    };
  }

  // ──────────────────────────────────────────────
  // HTTP helper — throws on non-OK
  // Auth: x-api-key header with static API token (per Tipalti Procurement REST API docs)
  // ──────────────────────────────────────────────
  private async req(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'x-api-key': this.apiToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Tipalti API error ${response.status}: ${errText}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : { ok: true };
  }

  // ──────────────────────────────────────────────
  // Truncation helper
  // ──────────────────────────────────────────────
  get tools(): ToolDefinition[] {
    return [
      // ── Payees ───────────────────────────────────
      {
        name: 'list_payees',
        description: 'List all payees (vendors/suppliers/contractors) registered in Tipalti with optional status and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by payee status: active, inactive, pending (default: all)' },
            limit: { type: 'number', description: 'Maximum payees to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_payee',
        description: 'Retrieve full profile details for a single payee by their Tipalti payee ID',
        inputSchema: {
          type: 'object',
          properties: {
            payee_id: { type: 'string', description: 'Tipalti payee ID (alphanumeric identifier)' },
          },
          required: ['payee_id'],
        },
      },
      {
        name: 'create_payee',
        description: 'Onboard a new payee in Tipalti with name, email, currency preference, and country',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Payee legal name (individual or company)' },
            email: { type: 'string', description: 'Payee primary email address for onboarding invitations' },
            currency: { type: 'string', description: 'Preferred payment currency code (e.g., USD, EUR, GBP)' },
            country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code (e.g., US, GB, DE)' },
            type: { type: 'string', description: 'Payee type: individual, company (default: individual)' },
          },
          required: ['name', 'email'],
        },
      },
      {
        name: 'update_payee',
        description: 'Update an existing payee record — name, email, currency, or country',
        inputSchema: {
          type: 'object',
          properties: {
            payee_id: { type: 'string', description: 'Tipalti payee ID to update' },
            name: { type: 'string', description: 'Updated legal name' },
            email: { type: 'string', description: 'Updated email address' },
            currency: { type: 'string', description: 'Updated preferred currency code' },
            country: { type: 'string', description: 'Updated ISO 3166-1 alpha-2 country code' },
          },
          required: ['payee_id'],
        },
      },
      {
        name: 'get_payee_payment_method',
        description: 'Retrieve the configured payment method (bank account, PayPal, wire) registered for a payee',
        inputSchema: {
          type: 'object',
          properties: {
            payee_id: { type: 'string', description: 'Tipalti payee ID' },
          },
          required: ['payee_id'],
        },
      },
      // ── Bills ────────────────────────────────────
      {
        name: 'list_bills',
        description: 'List vendor invoices (bills) in Tipalti with optional payee, status, and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            payee_id: { type: 'string', description: 'Filter bills for a specific payee ID' },
            status: { type: 'string', description: 'Filter by bill status: pending, approved, paid, rejected, voided' },
            from_date: { type: 'string', description: 'Filter bills created on or after this date (YYYY-MM-DD)' },
            to_date: { type: 'string', description: 'Filter bills created on or before this date (YYYY-MM-DD)' },
            limit: { type: 'number', description: 'Maximum bills to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_bill',
        description: 'Retrieve full details for a single bill by its Tipalti bill ID',
        inputSchema: {
          type: 'object',
          properties: {
            bill_id: { type: 'string', description: 'Tipalti bill ID' },
          },
          required: ['bill_id'],
        },
      },
      {
        name: 'create_bill',
        description: 'Create a new vendor invoice (bill) in Tipalti for AP processing and payment scheduling',
        inputSchema: {
          type: 'object',
          properties: {
            payee_id: { type: 'string', description: 'Tipalti payee ID for the vendor being billed' },
            amount: { type: 'number', description: 'Bill amount (positive number, no currency symbols)' },
            currency: { type: 'string', description: 'ISO 4217 currency code (e.g., USD, EUR)' },
            description: { type: 'string', description: 'Description or memo for this invoice' },
            due_date: { type: 'string', description: 'Payment due date in YYYY-MM-DD format' },
            reference_code: { type: 'string', description: 'External reference/PO number for reconciliation' },
            line_items: {
              type: 'array',
              description: 'Optional array of line items: [{description, amount, quantity}]',
              items: { type: 'object' },
            },
          },
          required: ['payee_id', 'amount', 'currency'],
        },
      },
      {
        name: 'approve_bill',
        description: 'Approve a pending bill to advance it through the AP workflow for payment',
        inputSchema: {
          type: 'object',
          properties: {
            bill_id: { type: 'string', description: 'Tipalti bill ID to approve' },
          },
          required: ['bill_id'],
        },
      },
      {
        name: 'void_bill',
        description: 'Void (cancel) a pending or approved bill before it is paid',
        inputSchema: {
          type: 'object',
          properties: {
            bill_id: { type: 'string', description: 'Tipalti bill ID to void' },
            reason: { type: 'string', description: 'Reason for voiding the bill (for audit trail)' },
          },
          required: ['bill_id'],
        },
      },
      // ── Payments ─────────────────────────────────
      {
        name: 'list_payments',
        description: 'List processed payment batches in Tipalti with optional status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by payment status: pending, processing, completed, failed' },
            from_date: { type: 'string', description: 'Filter payments on or after this date (YYYY-MM-DD)' },
            to_date: { type: 'string', description: 'Filter payments on or before this date (YYYY-MM-DD)' },
            limit: { type: 'number', description: 'Maximum payments to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_payment',
        description: 'Retrieve full details for a single payment by its Tipalti payment ID',
        inputSchema: {
          type: 'object',
          properties: {
            payment_id: { type: 'string', description: 'Tipalti payment ID' },
          },
          required: ['payment_id'],
        },
      },
      // ── Payment Orders ───────────────────────────
      {
        name: 'list_payment_orders',
        description: 'List payment orders submitted for execution with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by order status: pending, submitted, completed, failed' },
            limit: { type: 'number', description: 'Maximum payment orders to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_payment_order',
        description: 'Retrieve details for a specific payment order by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'string', description: 'Tipalti payment order ID' },
          },
          required: ['order_id'],
        },
      },
      // ── Tax Forms ────────────────────────────────
      {
        name: 'get_payee_tax_forms',
        description: 'Retrieve the tax form status and collected W-9/W-8 data for a payee (required for US tax compliance)',
        inputSchema: {
          type: 'object',
          properties: {
            payee_id: { type: 'string', description: 'Tipalti payee ID' },
          },
          required: ['payee_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_payees':             return await this.listPayees(args);
        case 'get_payee':               return await this.getPayee(args);
        case 'create_payee':            return await this.createPayee(args);
        case 'update_payee':            return await this.updatePayee(args);
        case 'get_payee_payment_method': return await this.getPayeePaymentMethod(args);
        case 'list_bills':              return await this.listBills(args);
        case 'get_bill':                return await this.getBill(args);
        case 'create_bill':             return await this.createBill(args);
        case 'approve_bill':            return await this.approveBill(args);
        case 'void_bill':               return await this.voidBill(args);
        case 'list_payments':           return await this.listPayments(args);
        case 'get_payment':             return await this.getPayment(args);
        case 'list_payment_orders':     return await this.listPaymentOrders(args);
        case 'get_payment_order':       return await this.getPaymentOrder(args);
        case 'get_payee_tax_forms':     return await this.getPayeeTaxForms(args);
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

  // ── Private tool methods ──────────────────────

  private async listPayees(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    const qs = params.toString() ? `?${params}` : '';
    const data = await this.req(`/api/payees${qs}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPayee(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/api/payees/${encodeURIComponent(args.payee_id as string)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createPayee(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name, email: args.email };
    if (args.currency) body.currency = args.currency;
    if (args.country) body.country = args.country;
    if (args.type) body.type = args.type;
    const data = await this.req('/api/payees', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updatePayee(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.payee_id as string;
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.email) body.email = args.email;
    if (args.currency) body.currency = args.currency;
    if (args.country) body.country = args.country;
    const data = await this.req(`/api/payees/${encodeURIComponent(id)}`, 'PUT', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPayeePaymentMethod(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/api/payees/${encodeURIComponent(args.payee_id as string)}/payment-method`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listBills(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.payee_id) params.set('payee_id', args.payee_id as string);
    if (args.status) params.set('status', args.status as string);
    if (args.from_date) params.set('from_date', args.from_date as string);
    if (args.to_date) params.set('to_date', args.to_date as string);
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    const qs = params.toString() ? `?${params}` : '';
    const data = await this.req(`/api/bills${qs}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getBill(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/api/bills/${encodeURIComponent(args.bill_id as string)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createBill(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      payee_id: args.payee_id,
      amount: args.amount,
      currency: args.currency,
    };
    if (args.description) body.description = args.description;
    if (args.due_date) body.due_date = args.due_date;
    if (args.reference_code) body.reference_code = args.reference_code;
    if (args.line_items) body.line_items = args.line_items;
    const data = await this.req('/api/bills', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async approveBill(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.bill_id as string;
    const data = await this.req(`/api/bills/${encodeURIComponent(id)}/approve`, 'POST');
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async voidBill(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.bill_id as string;
    const body: Record<string, unknown> = {};
    if (args.reason) body.reason = args.reason;
    const data = await this.req(`/api/bills/${encodeURIComponent(id)}/void`, 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPayments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.from_date) params.set('from_date', args.from_date as string);
    if (args.to_date) params.set('to_date', args.to_date as string);
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    const qs = params.toString() ? `?${params}` : '';
    const data = await this.req(`/api/payments${qs}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/api/payments/${encodeURIComponent(args.payment_id as string)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPaymentOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    const qs = params.toString() ? `?${params}` : '';
    const data = await this.req(`/api/payment-orders${qs}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPaymentOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/api/payment-orders/${encodeURIComponent(args.order_id as string)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPayeeTaxForms(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/api/payees/${encodeURIComponent(args.payee_id as string)}/tax-forms`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
