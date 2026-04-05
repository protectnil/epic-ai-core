/**
 * Rebilly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Rebilly has not published an official MCP server.
//
// Base URL: https://api-sandbox.rebilly.com (sandbox)
//           https://api.rebilly.com (live)
// Auth: SecretApiKey — REB-APIKEY header
// Docs: https://www.rebilly.com/catalog/all/
// Rate limits: Not publicly documented. Rebilly enforces per-account limits server-side.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RebillyConfig {
  apiKey: string;
  baseUrl?: string;
}

export class RebillyMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: RebillyConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api-sandbox.rebilly.com';
  }

  static catalog() {
    return {
      name: 'rebilly',
      displayName: 'Rebilly',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'rebilly', 'payment', 'subscription', 'invoice', 'customer',
        'transaction', 'dispute', 'billing', 'recurring', 'plan', 'product',
      ],
      toolNames: [
        'list_customers', 'get_customer', 'create_customer',
        'list_transactions', 'get_transaction', 'create_transaction', 'refund_transaction',
        'list_invoices', 'get_invoice', 'create_invoice', 'issue_invoice', 'void_invoice',
        'list_subscriptions', 'get_subscription', 'create_subscription', 'cancel_subscription',
        'list_plans', 'get_plan', 'create_plan',
        'list_products', 'get_product', 'create_product',
        'list_disputes', 'get_dispute', 'create_dispute',
        'list_payment_instruments', 'get_payment_instrument',
        'list_coupons', 'get_coupon',
      ],
      description: 'Manage Rebilly billing: customers, transactions, invoices, subscriptions, plans, products, disputes, payment instruments, and coupons via the Rebilly REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Customers ────────────────────────────────────────────────────────
      {
        name: 'list_customers',
        description: 'Retrieve a paginated list of Rebilly customers, with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum records to return (default: 20, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            email: { type: 'string', description: 'Filter customers by email address' },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Retrieve a single Rebilly customer by ID, including their payment methods and subscription status',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Rebilly customer ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new Rebilly customer record with name, email, and optional company details',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Customer email address' },
            firstName: { type: 'string', description: 'Customer first name' },
            lastName: { type: 'string', description: 'Customer last name' },
            company: { type: 'string', description: 'Company name (optional)' },
            phone: { type: 'string', description: 'Phone number (optional)' },
            customerId: { type: 'string', description: 'Custom ID to assign (optional, must be unique)' },
          },
          required: ['email'],
        },
      },
      // ── Transactions ─────────────────────────────────────────────────────
      {
        name: 'list_transactions',
        description: 'Retrieve a paginated list of Rebilly transactions, with optional date range and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum records to return (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset' },
            customerId: { type: 'string', description: 'Filter by customer ID' },
            status: { type: 'string', description: 'Filter by status: completed, declined, abandoned, refunded, voided' },
            type: { type: 'string', description: 'Filter by type: sale, authorize, capture, credit, refund, void' },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Retrieve a single Rebilly transaction by ID, including gateway response and timeline',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Rebilly transaction ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_transaction',
        description: 'Create a sale or authorize transaction against an existing payment instrument',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: { type: 'string', description: 'Customer ID to charge' },
            currency: { type: 'string', description: 'ISO 4217 currency code (e.g. USD)' },
            amount: { type: 'number', description: 'Transaction amount in major currency units (e.g. 10.00)' },
            type: { type: 'string', description: 'Transaction type: sale or authorize (default: sale)' },
            paymentInstrumentId: { type: 'string', description: 'Payment instrument ID to charge (optional; uses default if omitted)' },
            websiteId: { type: 'string', description: 'Website/brand ID for the transaction (required in live mode)' },
          },
          required: ['customerId', 'currency', 'amount'],
        },
      },
      {
        name: 'refund_transaction',
        description: 'Refund a completed Rebilly transaction, fully or partially',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Transaction ID to refund' },
            amount: { type: 'number', description: 'Refund amount (omit for full refund)' },
          },
          required: ['id'],
        },
      },
      // ── Invoices ─────────────────────────────────────────────────────────
      {
        name: 'list_invoices',
        description: 'Retrieve a paginated list of Rebilly invoices, with optional customer and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum records to return (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset' },
            customerId: { type: 'string', description: 'Filter by customer ID' },
            status: { type: 'string', description: 'Filter by status: draft, issued, partially-paid, paid, past-due, abandoned, voided, refunded' },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a single Rebilly invoice by ID, including line items and payment allocations',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Rebilly invoice ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new Rebilly invoice for a customer with line items and optional due date',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: { type: 'string', description: 'Customer ID to bill' },
            currency: { type: 'string', description: 'ISO 4217 currency code (e.g. USD)' },
            dueTime: { type: 'string', description: 'Due date/time in ISO 8601 format (optional)' },
            websiteId: { type: 'string', description: 'Website/brand ID (required in live mode)' },
          },
          required: ['customerId', 'currency'],
        },
      },
      {
        name: 'issue_invoice',
        description: 'Issue (send) a draft Rebilly invoice, making it payable by the customer',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Invoice ID to issue' },
          },
          required: ['id'],
        },
      },
      {
        name: 'void_invoice',
        description: 'Void a Rebilly invoice, marking it as uncollectable and closing it',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Invoice ID to void' },
          },
          required: ['id'],
        },
      },
      // ── Subscriptions ────────────────────────────────────────────────────
      {
        name: 'list_subscriptions',
        description: 'Retrieve a paginated list of Rebilly subscription orders, with optional customer and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum records to return (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset' },
            customerId: { type: 'string', description: 'Filter by customer ID' },
            status: { type: 'string', description: 'Filter by status: active, inactive, canceled, churned, pending, trial-ended, suspended, completed' },
          },
        },
      },
      {
        name: 'get_subscription',
        description: 'Retrieve a single Rebilly subscription order by ID, including plan details and billing cycle',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Subscription ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_subscription',
        description: 'Create a new Rebilly subscription order for a customer on a plan',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: { type: 'string', description: 'Customer ID to subscribe' },
            planId: { type: 'string', description: 'Plan ID to subscribe the customer to' },
            websiteId: { type: 'string', description: 'Website/brand ID (required in live mode)' },
            quantity: { type: 'number', description: 'Quantity for the plan (default: 1)' },
            trialDays: { type: 'number', description: 'Number of trial days before billing starts (optional)' },
          },
          required: ['customerId', 'planId'],
        },
      },
      {
        name: 'cancel_subscription',
        description: 'Cancel a Rebilly subscription order immediately or at the end of the billing period',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Subscription ID to cancel' },
            policy: { type: 'string', description: 'Cancellation policy: at-next-rebill or now (default: at-next-rebill)' },
            reason: { type: 'string', description: 'Reason code: did-not-use, did-not-want, missing-features, switched-plans, too-expensive, other, billing-failure' },
            description: { type: 'string', description: 'Optional free-text cancellation note' },
          },
          required: ['id'],
        },
      },
      // ── Plans ────────────────────────────────────────────────────────────
      {
        name: 'list_plans',
        description: 'Retrieve a paginated list of Rebilly billing plans',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum records to return (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_plan',
        description: 'Retrieve a single Rebilly billing plan by ID, including pricing and trial details',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Plan ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_plan',
        description: 'Create a new Rebilly billing plan with pricing, interval, and optional trial period',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Plan display name' },
            productId: { type: 'string', description: 'Product ID this plan belongs to' },
            currency: { type: 'string', description: 'ISO 4217 currency code (e.g. USD)' },
            amount: { type: 'number', description: 'Recurring charge amount (e.g. 29.99)' },
            interval: {
              type: 'object',
              description: 'Billing interval: { unit: "month"|"week"|"day"|"year", length: number }',
            },
            trialPeriodDays: { type: 'number', description: 'Number of free trial days (optional)' },
          },
          required: ['name', 'productId', 'currency', 'amount', 'interval'],
        },
      },
      // ── Products ─────────────────────────────────────────────────────────
      {
        name: 'list_products',
        description: 'Retrieve a paginated list of Rebilly products',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum records to return (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Retrieve a single Rebilly product by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Product ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a new Rebilly product that can be assigned to billing plans',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Product name' },
            description: { type: 'string', description: 'Product description (optional)' },
            requiresShipping: { type: 'boolean', description: 'Whether product requires physical shipping (default: false)' },
          },
          required: ['name'],
        },
      },
      // ── Disputes ─────────────────────────────────────────────────────────
      {
        name: 'list_disputes',
        description: 'Retrieve a paginated list of Rebilly disputes (chargebacks), with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum records to return (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset' },
            status: { type: 'string', description: 'Filter by status: response-needed, under-review, forfeited, won, lost, unknown' },
          },
        },
      },
      {
        name: 'get_dispute',
        description: 'Retrieve a single Rebilly dispute by ID, including reason code and deadline',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Dispute ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_dispute',
        description: 'Create a Rebilly dispute record for a transaction (used to track chargebacks received from gateway)',
        inputSchema: {
          type: 'object',
          properties: {
            transactionId: { type: 'string', description: 'Transaction ID being disputed' },
            currency: { type: 'string', description: 'ISO 4217 currency code' },
            amount: { type: 'number', description: 'Disputed amount' },
            reasonCode: { type: 'string', description: 'Card scheme reason code for the dispute' },
            type: { type: 'string', description: 'Dispute type: first-chargeback, second-chargeback, arbitration, fraud, ethoca-alert, verifi-alert' },
            deadlineTime: { type: 'string', description: 'Response deadline in ISO 8601 format' },
          },
          required: ['transactionId', 'currency', 'amount', 'reasonCode', 'type'],
        },
      },
      // ── Payment Instruments ──────────────────────────────────────────────
      {
        name: 'list_payment_instruments',
        description: 'Retrieve a paginated list of Rebilly payment instruments (cards, bank accounts, digital wallets)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum records to return (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset' },
            customerId: { type: 'string', description: 'Filter by customer ID' },
          },
        },
      },
      {
        name: 'get_payment_instrument',
        description: 'Retrieve a single Rebilly payment instrument by ID, including masked card details and status',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Payment instrument ID' },
          },
          required: ['id'],
        },
      },
      // ── Coupons ──────────────────────────────────────────────────────────
      {
        name: 'list_coupons',
        description: 'Retrieve a paginated list of Rebilly discount coupons',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum records to return (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_coupon',
        description: 'Retrieve a single Rebilly coupon by redemption code, including discount type and restrictions',
        inputSchema: {
          type: 'object',
          properties: {
            redemptionCode: { type: 'string', description: 'Coupon redemption code (e.g. SAVE20)' },
          },
          required: ['redemptionCode'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_customers':         return await this.listCustomers(args);
        case 'get_customer':           return await this.getCustomer(args);
        case 'create_customer':        return await this.createCustomer(args);
        case 'list_transactions':      return await this.listTransactions(args);
        case 'get_transaction':        return await this.getTransaction(args);
        case 'create_transaction':     return await this.createTransaction(args);
        case 'refund_transaction':     return await this.refundTransaction(args);
        case 'list_invoices':          return await this.listInvoices(args);
        case 'get_invoice':            return await this.getInvoice(args);
        case 'create_invoice':         return await this.createInvoice(args);
        case 'issue_invoice':          return await this.issueInvoice(args);
        case 'void_invoice':           return await this.voidInvoice(args);
        case 'list_subscriptions':     return await this.listSubscriptions(args);
        case 'get_subscription':       return await this.getSubscription(args);
        case 'create_subscription':    return await this.createSubscription(args);
        case 'cancel_subscription':    return await this.cancelSubscription(args);
        case 'list_plans':             return await this.listPlans(args);
        case 'get_plan':               return await this.getPlan(args);
        case 'create_plan':            return await this.createPlan(args);
        case 'list_products':          return await this.listProducts(args);
        case 'get_product':            return await this.getProduct(args);
        case 'create_product':         return await this.createProduct(args);
        case 'list_disputes':          return await this.listDisputes(args);
        case 'get_dispute':            return await this.getDispute(args);
        case 'create_dispute':         return await this.createDispute(args);
        case 'list_payment_instruments': return await this.listPaymentInstruments(args);
        case 'get_payment_instrument': return await this.getPaymentInstrument(args);
        case 'list_coupons':           return await this.listCoupons(args);
        case 'get_coupon':             return await this.getCoupon(args);
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

  private get headers(): Record<string, string> {
    return {
      'REB-APIKEY': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Rebilly API error ${response.status}: ${errText}` }], isError: true };
    }
    // 204 No Content
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{}' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Rebilly returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildQuery(params: Record<string, unknown>): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    const str = q.toString();
    return str ? '?' + str : '';
  }

  // ── Customers ────────────────────────────────────────────────────────────
  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({ limit: args.limit ?? 20, offset: args.offset ?? 0, ...(args.email ? { filter: `primaryAddress.emails:${args.email}` } : {}) });
    return this.request('GET', `/customers${qs}`);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/customers/${args.id}`);
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { primaryAddress: { emails: [{ label: 'main', value: args.email, primary: true }] } };
    if (args.firstName || args.lastName) body['primaryAddress'] = { ...(body['primaryAddress'] as object), firstName: args.firstName, lastName: args.lastName };
    if (args.company) (body['primaryAddress'] as Record<string, unknown>)['company'] = args.company;
    if (args.phone) (body['primaryAddress'] as Record<string, unknown>)['phoneNumbers'] = [{ label: 'main', value: args.phone, primary: true }];
    if (args.customerId) body['id'] = args.customerId;
    return this.request('POST', '/customers', body);
  }

  // ── Transactions ─────────────────────────────────────────────────────────
  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.customerId) filters.push(`customerId:${args.customerId}`);
    if (args.status) filters.push(`status:${args.status}`);
    if (args.type) filters.push(`type:${args.type}`);
    const qs = this.buildQuery({ limit: args.limit ?? 20, offset: args.offset ?? 0, ...(filters.length ? { filter: filters.join(',') } : {}) });
    return this.request('GET', `/transactions${qs}`);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/transactions/${args.id}`);
  }

  private async createTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      customerId: args.customerId,
      currency: args.currency,
      amount: args.amount,
      type: args.type ?? 'sale',
    };
    if (args.paymentInstrumentId) body['paymentInstruction'] = { token: args.paymentInstrumentId };
    if (args.websiteId) body['websiteId'] = args.websiteId;
    return this.request('POST', '/transactions', body);
  }

  private async refundTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.amount !== undefined) body['amount'] = args.amount;
    return this.request('POST', `/transactions/${args.id}/refund`, body);
  }

  // ── Invoices ─────────────────────────────────────────────────────────────
  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.customerId) filters.push(`customerId:${args.customerId}`);
    if (args.status) filters.push(`status:${args.status}`);
    const qs = this.buildQuery({ limit: args.limit ?? 20, offset: args.offset ?? 0, ...(filters.length ? { filter: filters.join(',') } : {}) });
    return this.request('GET', `/invoices${qs}`);
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/invoices/${args.id}`);
  }

  private async createInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { customerId: args.customerId, currency: args.currency };
    if (args.dueTime) body['dueTime'] = args.dueTime;
    if (args.websiteId) body['websiteId'] = args.websiteId;
    return this.request('POST', '/invoices', body);
  }

  private async issueInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', `/invoices/${args.id}/issue`, {});
  }

  private async voidInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', `/invoices/${args.id}/void`, {});
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────
  private async listSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.customerId) filters.push(`customerId:${args.customerId}`);
    if (args.status) filters.push(`status:${args.status}`);
    const qs = this.buildQuery({ limit: args.limit ?? 20, offset: args.offset ?? 0, ...(filters.length ? { filter: filters.join(',') } : {}) });
    return this.request('GET', `/subscriptions${qs}`);
  }

  private async getSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/subscriptions/${args.id}`);
  }

  private async createSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      customerId: args.customerId,
      items: [{ plan: { id: args.planId }, quantity: args.quantity ?? 1 }],
    };
    if (args.websiteId) body['websiteId'] = args.websiteId;
    if (args.trialDays) body['trialEnd'] = new Date(Date.now() + Number(args.trialDays) * 86400000).toISOString();
    return this.request('POST', '/subscriptions', body);
  }

  private async cancelSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      policy: args.policy ?? 'at-next-rebill',
      churnTime: args.policy === 'now' ? new Date().toISOString() : undefined,
    };
    if (args.reason) body['canceledBy'] = 'customer';
    if (args.description) body['cancelDescription'] = args.description;
    return this.request('POST', '/subscription-cancellations', { ...body, subscriptionId: args.id });
  }

  // ── Plans ─────────────────────────────────────────────────────────────────
  private async listPlans(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({ limit: args.limit ?? 20, offset: args.offset ?? 0 });
    return this.request('GET', `/plans${qs}`);
  }

  private async getPlan(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/plans/${args.id}`);
  }

  private async createPlan(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      name: args.name,
      productId: args.productId,
      currency: args.currency,
      pricing: { formula: 'fixed-fee', price: args.amount },
      recurringInterval: args.interval,
    };
    if (args.trialPeriodDays) body['trial'] = { price: 0, period: { unit: 'day', length: args.trialPeriodDays } };
    return this.request('POST', '/plans', body);
  }

  // ── Products ──────────────────────────────────────────────────────────────
  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({ limit: args.limit ?? 20, offset: args.offset ?? 0 });
    return this.request('GET', `/products${qs}`);
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/products/${args.id}`);
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body['description'] = args.description;
    if (args.requiresShipping !== undefined) body['requiresShipping'] = args.requiresShipping;
    return this.request('POST', '/products', body);
  }

  // ── Disputes ──────────────────────────────────────────────────────────────
  private async listDisputes(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.status) filters.push(`status:${args.status}`);
    const qs = this.buildQuery({ limit: args.limit ?? 20, offset: args.offset ?? 0, ...(filters.length ? { filter: filters.join(',') } : {}) });
    return this.request('GET', `/disputes${qs}`);
  }

  private async getDispute(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/disputes/${args.id}`);
  }

  private async createDispute(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      transactionId: args.transactionId,
      currency: args.currency,
      amount: args.amount,
      reasonCode: args.reasonCode,
      type: args.type,
    };
    if (args.deadlineTime) body['deadlineTime'] = args.deadlineTime;
    return this.request('POST', '/disputes', body);
  }

  // ── Payment Instruments ───────────────────────────────────────────────────
  private async listPaymentInstruments(args: Record<string, unknown>): Promise<ToolResult> {
    const filters: string[] = [];
    if (args.customerId) filters.push(`customerId:${args.customerId}`);
    const qs = this.buildQuery({ limit: args.limit ?? 20, offset: args.offset ?? 0, ...(filters.length ? { filter: filters.join(',') } : {}) });
    return this.request('GET', `/payment-instruments${qs}`);
  }

  private async getPaymentInstrument(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/payment-instruments/${args.id}`);
  }

  // ── Coupons ───────────────────────────────────────────────────────────────
  private async listCoupons(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({ limit: args.limit ?? 20, offset: args.offset ?? 0 });
    return this.request('GET', `/coupons${qs}`);
  }

  private async getCoupon(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/coupons/${args.redemptionCode}`);
  }
}
