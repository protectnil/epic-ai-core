/**
 * Stripe MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/stripe/agent-toolkit — transport: stdio (local npx) or remote HTTPS (mcp.stripe.com)
// Remote server: https://mcp.stripe.com — OAuth2, no API key required in MCP client config.
// Local server: npx -y @stripe/mcp --api-key=sk_... — transport: stdio, auth: Stripe secret key.
// Vendor MCP covers: 25 tools — get_stripe_account_info, retrieve_balance, create_coupon, list_coupons,
//   create_customer, list_customers, list_disputes, update_dispute, create_invoice, create_invoice_item,
//   finalize_invoice, list_invoices, create_payment_link, list_payment_intents, create_price, list_prices,
//   create_product, list_products, create_refund, cancel_subscription, list_subscriptions, update_subscription,
//   search_stripe_resources, fetch_stripe_resources, search_stripe_documentation.
// Our adapter covers: 21 tools — list_customers, get_customer, create_customer, update_customer,
//   list_charges, get_charge, list_payment_intents, create_payment_intent, get_payment_intent,
//   list_subscriptions, get_subscription, cancel_subscription, list_invoices, get_invoice, pay_invoice,
//   list_refunds, create_refund, list_products, create_product, list_prices, create_price.
//
// Integration: use-both
// MCP-only tools (14): get_stripe_account_info, retrieve_balance, create_coupon, list_coupons,
//   list_disputes, update_dispute, create_invoice, create_invoice_item, finalize_invoice,
//   create_payment_link, update_subscription, search_stripe_resources, fetch_stripe_resources,
//   search_stripe_documentation.
// REST-only tools (10): get_customer, update_customer, list_charges, get_charge,
//   create_payment_intent, get_payment_intent, get_subscription, get_invoice, pay_invoice,
//   list_refunds.
// Shared tools (11): list_customers, create_customer, list_payment_intents, list_subscriptions,
//   cancel_subscription, list_invoices, create_refund, list_products, create_product,
//   list_prices, create_price. (FederationManager routes shared tools through MCP by default.)
// Combined coverage: 35 unique tools (MCP: 25 + REST: 21 - shared: 11).
// Recommendation: use-both. MCP has 14 unique tools (account info, balance, coupons, disputes,
//   invoice creation, payment links, subscription update, documentation search). REST has 10
//   unique tools (single-resource GET/update by ID, create_payment_intent, pay_invoice,
//   list_refunds, list_charges). Full coverage requires both.
//
// Base URL: https://api.stripe.com/v1
// Auth: Bearer token (Stripe secret key, format: sk_live_... or sk_test_...)
// Docs: https://docs.stripe.com/api
// Rate limits: 100 read requests/second and 100 write requests/second in live mode per secret key

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface StripeConfig {
  /** Stripe secret key (sk_live_... or sk_test_...) */
  secretKey: string;
  /** Optional API version header override (default: 2024-06-20) */
  apiVersion?: string;
}

export class StripeMCPServer extends MCPAdapterBase {
  private readonly secretKey: string;
  private readonly apiVersion: string;
  private readonly baseUrl = 'https://api.stripe.com/v1';

  constructor(config: StripeConfig) {
    super();
    this.secretKey = config.secretKey;
    this.apiVersion = config.apiVersion ?? '2024-06-20';
  }

  static catalog() {
    return {
      name: 'stripe',
      displayName: 'Stripe',
      version: '1.0.0',
      category: 'commerce' as const,
      keywords: ['stripe', 'payment', 'billing', 'subscription', 'invoice', 'charge', 'refund', 'customer', 'product', 'price', 'commerce', 'fintech'],
      toolNames: [
        'list_customers', 'get_customer', 'create_customer', 'update_customer',
        'list_charges', 'get_charge',
        'list_payment_intents', 'create_payment_intent', 'get_payment_intent',
        'list_subscriptions', 'get_subscription', 'cancel_subscription',
        'list_invoices', 'get_invoice', 'pay_invoice',
        'list_refunds', 'create_refund',
        'list_products', 'create_product',
        'list_prices', 'create_price',
      ],
      description: 'Payments, billing, and subscription management via the Stripe REST API — customers, charges, invoices, subscriptions, products, prices, and refunds.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_customers',
        description: 'List Stripe customers with optional filters for email address and pagination cursor.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of customers to return (1–100, default 10)',
            },
            email: {
              type: 'string',
              description: 'Filter customers by exact email address match',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor — customer ID to start after (e.g. cus_xxx)',
            },
            ending_before: {
              type: 'string',
              description: 'Pagination cursor — customer ID to end before',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Retrieve a single Stripe customer by ID including email, name, default payment method, and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Stripe customer ID (cus_...)',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new Stripe customer with email, name, phone, and optional metadata for billing.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: "Customer's email address",
            },
            name: {
              type: 'string',
              description: "Customer's full name",
            },
            phone: {
              type: 'string',
              description: "Customer's phone number",
            },
            description: {
              type: 'string',
              description: 'Arbitrary description for the customer record',
            },
            metadata: {
              type: 'object',
              description: 'Key-value pairs for storing additional information (max 50 keys)',
            },
          },
        },
      },
      {
        name: 'update_customer',
        description: 'Update an existing Stripe customer record — email, name, phone, or metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Stripe customer ID to update (cus_...)',
            },
            email: {
              type: 'string',
              description: 'New email address for the customer',
            },
            name: {
              type: 'string',
              description: 'New name for the customer',
            },
            phone: {
              type: 'string',
              description: 'New phone number for the customer',
            },
            description: {
              type: 'string',
              description: 'New description for the customer record',
            },
            metadata: {
              type: 'object',
              description: 'Key-value metadata to set (existing keys not included will be unset)',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'list_charges',
        description: 'List Stripe charges with optional filters for customer, payment intent, or date range.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of charges to return (1–100, default 10)',
            },
            customer: {
              type: 'string',
              description: 'Filter charges by Stripe customer ID',
            },
            payment_intent: {
              type: 'string',
              description: 'Filter charges by payment intent ID',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor — charge ID to start after (ch_...)',
            },
          },
        },
      },
      {
        name: 'get_charge',
        description: 'Retrieve a single Stripe charge by ID including amount, status, outcome, and payment method details.',
        inputSchema: {
          type: 'object',
          properties: {
            charge_id: {
              type: 'string',
              description: 'Stripe charge ID (ch_...)',
            },
          },
          required: ['charge_id'],
        },
      },
      {
        name: 'list_payment_intents',
        description: 'List Stripe payment intents with optional filters for customer, status, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of payment intents to return (1–100, default 10)',
            },
            customer: {
              type: 'string',
              description: 'Filter by Stripe customer ID',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor — payment intent ID to start after (pi_...)',
            },
          },
        },
      },
      {
        name: 'create_payment_intent',
        description: 'Create a Stripe payment intent for collecting payment. Returns a client_secret for frontend confirmation.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Amount in the smallest currency unit (e.g. 1000 = $10.00 USD)',
            },
            currency: {
              type: 'string',
              description: 'Three-letter ISO 4217 currency code (e.g. usd, eur, gbp)',
            },
            customer: {
              type: 'string',
              description: 'Stripe customer ID to associate with this payment intent',
            },
            description: {
              type: 'string',
              description: 'Arbitrary description for the payment intent',
            },
            payment_method_types: {
              type: 'array',
              description: 'Payment method types to accept (default: ["card"])',
            },
            metadata: {
              type: 'object',
              description: 'Key-value pairs for storing additional information',
            },
          },
          required: ['amount', 'currency'],
        },
      },
      {
        name: 'get_payment_intent',
        description: 'Retrieve a single Stripe payment intent by ID including status, amount, and payment method details.',
        inputSchema: {
          type: 'object',
          properties: {
            payment_intent_id: {
              type: 'string',
              description: 'Stripe payment intent ID (pi_...)',
            },
          },
          required: ['payment_intent_id'],
        },
      },
      {
        name: 'list_subscriptions',
        description: 'List Stripe subscriptions with optional filters for customer, status, and price.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of subscriptions to return (1–100, default 10)',
            },
            customer: {
              type: 'string',
              description: 'Filter by Stripe customer ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: active, past_due, unpaid, canceled, incomplete, trialing, all (default: active)',
            },
            price: {
              type: 'string',
              description: 'Filter by price ID',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor — subscription ID to start after (sub_...)',
            },
          },
        },
      },
      {
        name: 'get_subscription',
        description: 'Retrieve a single Stripe subscription by ID including status, current period, and items.',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_id: {
              type: 'string',
              description: 'Stripe subscription ID (sub_...)',
            },
          },
          required: ['subscription_id'],
        },
      },
      {
        name: 'cancel_subscription',
        description: 'Cancel a Stripe subscription immediately or at the end of the current billing period.',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_id: {
              type: 'string',
              description: 'Stripe subscription ID to cancel (sub_...)',
            },
            cancel_at_period_end: {
              type: 'boolean',
              description: 'If true, cancel at end of current period; if false (default), cancel immediately',
            },
          },
          required: ['subscription_id'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List Stripe invoices with optional filters for customer, subscription, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of invoices to return (1–100, default 10)',
            },
            customer: {
              type: 'string',
              description: 'Filter by Stripe customer ID',
            },
            subscription: {
              type: 'string',
              description: 'Filter by Stripe subscription ID',
            },
            status: {
              type: 'string',
              description: 'Filter by invoice status: draft, open, paid, uncollectible, void',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor — invoice ID to start after (in_...)',
            },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a single Stripe invoice by ID including line items, totals, and payment status.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'Stripe invoice ID (in_...)',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'pay_invoice',
        description: 'Attempt to pay an open Stripe invoice immediately using the customer\'s default payment method.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'Stripe invoice ID to pay (in_...)',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'list_refunds',
        description: 'List Stripe refunds with optional filters for charge ID and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of refunds to return (1–100, default 10)',
            },
            charge: {
              type: 'string',
              description: 'Filter refunds by charge ID (ch_...)',
            },
            payment_intent: {
              type: 'string',
              description: 'Filter refunds by payment intent ID (pi_...)',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor — refund ID to start after (re_...)',
            },
          },
        },
      },
      {
        name: 'create_refund',
        description: 'Create a full or partial refund for a Stripe charge or payment intent.',
        inputSchema: {
          type: 'object',
          properties: {
            charge: {
              type: 'string',
              description: 'Charge ID to refund (ch_...). Provide charge or payment_intent, not both.',
            },
            payment_intent: {
              type: 'string',
              description: 'Payment intent ID to refund (pi_...). Provide charge or payment_intent, not both.',
            },
            amount: {
              type: 'number',
              description: 'Amount to refund in smallest currency unit. Omit to refund the full charge.',
            },
            reason: {
              type: 'string',
              description: 'Reason for refund: duplicate, fraudulent, or requested_by_customer',
            },
          },
        },
      },
      {
        name: 'list_products',
        description: 'List Stripe products with optional filters for active status and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of products to return (1–100, default 10)',
            },
            active: {
              type: 'boolean',
              description: 'Filter by active status (true = active, false = archived)',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor — product ID to start after (prod_...)',
            },
          },
        },
      },
      {
        name: 'create_product',
        description: 'Create a new Stripe product for use with prices and subscriptions.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Product name as it appears on invoices and receipts',
            },
            description: {
              type: 'string',
              description: 'Optional product description',
            },
            active: {
              type: 'boolean',
              description: 'Whether the product is immediately available (default: true)',
            },
            metadata: {
              type: 'object',
              description: 'Key-value pairs for storing additional product information',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_prices',
        description: 'List Stripe prices with optional filters for product ID, currency, and active status.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of prices to return (1–100, default 10)',
            },
            product: {
              type: 'string',
              description: 'Filter prices by Stripe product ID (prod_...)',
            },
            active: {
              type: 'boolean',
              description: 'Filter by active status (true = active, false = archived)',
            },
            currency: {
              type: 'string',
              description: 'Filter by three-letter ISO currency code (e.g. usd)',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor — price ID to start after (price_...)',
            },
          },
        },
      },
      {
        name: 'create_price',
        description: 'Create a new Stripe price for a product, configuring amount, currency, and billing interval for subscriptions.',
        inputSchema: {
          type: 'object',
          properties: {
            product: {
              type: 'string',
              description: 'Stripe product ID this price belongs to (prod_...)',
            },
            unit_amount: {
              type: 'number',
              description: 'Price amount in smallest currency unit (e.g. 999 = $9.99 USD)',
            },
            currency: {
              type: 'string',
              description: 'Three-letter ISO 4217 currency code (e.g. usd)',
            },
            recurring_interval: {
              type: 'string',
              description: 'Billing interval for recurring prices: day, week, month, or year. Omit for one-time prices.',
            },
            recurring_interval_count: {
              type: 'number',
              description: 'Number of intervals between billings (e.g. 3 + month = every 3 months, default 1)',
            },
            nickname: {
              type: 'string',
              description: 'Brief label for the price shown in the dashboard',
            },
          },
          required: ['product', 'unit_amount', 'currency'],
        },
      },
    ];
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': this.apiVersion,
    };
  }

  private async get(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const url = params?.toString()
      ? `${this.baseUrl}${path}?${params}`
      : `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Stripe API error (HTTP ${response.status}): ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: `Stripe returned non-JSON response (HTTP ${response.status})` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async post(path: string, params: URLSearchParams): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: params,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Stripe API error (HTTP ${response.status}): ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: `Stripe returned non-JSON response (HTTP ${response.status})` }],
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
        case 'list_customers':
          return this.listCustomers(args);
        case 'get_customer':
          return this.getCustomer(args);
        case 'create_customer':
          return this.createCustomer(args);
        case 'update_customer':
          return this.updateCustomer(args);
        case 'list_charges':
          return this.listCharges(args);
        case 'get_charge':
          return this.getCharge(args);
        case 'list_payment_intents':
          return this.listPaymentIntents(args);
        case 'create_payment_intent':
          return this.createPaymentIntent(args);
        case 'get_payment_intent':
          return this.getPaymentIntent(args);
        case 'list_subscriptions':
          return this.listSubscriptions(args);
        case 'get_subscription':
          return this.getSubscription(args);
        case 'cancel_subscription':
          return this.cancelSubscription(args);
        case 'list_invoices':
          return this.listInvoices(args);
        case 'get_invoice':
          return this.getInvoice(args);
        case 'pay_invoice':
          return this.payInvoice(args);
        case 'list_refunds':
          return this.listRefunds(args);
        case 'create_refund':
          return this.createRefund(args);
        case 'list_products':
          return this.listProducts(args);
        case 'create_product':
          return this.createProduct(args);
        case 'list_prices':
          return this.listPrices(args);
        case 'create_price':
          return this.createPrice(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.email) params.set('email', args.email as string);
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    if (args.ending_before) params.set('ending_before', args.ending_before as string);
    return this.get('/customers', params);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.customer_id as string;
    if (!id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    return this.get(`/customers/${encodeURIComponent(id)}`);
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.email) params.set('email', args.email as string);
    if (args.name) params.set('name', args.name as string);
    if (args.phone) params.set('phone', args.phone as string);
    if (args.description) params.set('description', args.description as string);
    if (args.metadata && typeof args.metadata === 'object') {
      for (const [k, v] of Object.entries(args.metadata as Record<string, string>)) {
        params.set(`metadata[${k}]`, String(v));
      }
    }
    return this.post('/customers', params);
  }

  private async updateCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.customer_id as string;
    if (!id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.email) params.set('email', args.email as string);
    if (args.name) params.set('name', args.name as string);
    if (args.phone) params.set('phone', args.phone as string);
    if (args.description) params.set('description', args.description as string);
    if (args.metadata && typeof args.metadata === 'object') {
      for (const [k, v] of Object.entries(args.metadata as Record<string, string>)) {
        params.set(`metadata[${k}]`, String(v));
      }
    }
    return this.post(`/customers/${encodeURIComponent(id)}`, params);
  }

  private async listCharges(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.customer) params.set('customer', args.customer as string);
    if (args.payment_intent) params.set('payment_intent', args.payment_intent as string);
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    return this.get('/charges', params);
  }

  private async getCharge(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.charge_id as string;
    if (!id) return { content: [{ type: 'text', text: 'charge_id is required' }], isError: true };
    return this.get(`/charges/${encodeURIComponent(id)}`);
  }

  private async listPaymentIntents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.customer) params.set('customer', args.customer as string);
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    return this.get('/payment_intents', params);
  }

  private async createPaymentIntent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.amount || !args.currency) {
      return { content: [{ type: 'text', text: 'amount and currency are required' }], isError: true };
    }
    const params = new URLSearchParams();
    params.set('amount', String(args.amount));
    params.set('currency', args.currency as string);
    if (args.customer) params.set('customer', args.customer as string);
    if (args.description) params.set('description', args.description as string);
    if (Array.isArray(args.payment_method_types)) {
      (args.payment_method_types as string[]).forEach((t, i) => params.set(`payment_method_types[${i}]`, t));
    }
    if (args.metadata && typeof args.metadata === 'object') {
      for (const [k, v] of Object.entries(args.metadata as Record<string, string>)) {
        params.set(`metadata[${k}]`, String(v));
      }
    }
    return this.post('/payment_intents', params);
  }

  private async getPaymentIntent(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.payment_intent_id as string;
    if (!id) return { content: [{ type: 'text', text: 'payment_intent_id is required' }], isError: true };
    return this.get(`/payment_intents/${encodeURIComponent(id)}`);
  }

  private async listSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.customer) params.set('customer', args.customer as string);
    if (args.status) params.set('status', args.status as string);
    if (args.price) params.set('price', args.price as string);
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    return this.get('/subscriptions', params);
  }

  private async getSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.subscription_id as string;
    if (!id) return { content: [{ type: 'text', text: 'subscription_id is required' }], isError: true };
    return this.get(`/subscriptions/${encodeURIComponent(id)}`);
  }

  private async cancelSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.subscription_id as string;
    if (!id) return { content: [{ type: 'text', text: 'subscription_id is required' }], isError: true };

    if (args.cancel_at_period_end === true) {
      const params = new URLSearchParams({ cancel_at_period_end: 'true' });
      return this.post(`/subscriptions/${encodeURIComponent(id)}`, params);
    }

    // Immediate cancellation via DELETE
    const response = await this.fetchWithRetry(`${this.baseUrl}/subscriptions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Stripe API error (HTTP ${response.status}): ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      return { content: [{ type: 'text', text: `Stripe returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.customer) params.set('customer', args.customer as string);
    if (args.subscription) params.set('subscription', args.subscription as string);
    if (args.status) params.set('status', args.status as string);
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    return this.get('/invoices', params);
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.invoice_id as string;
    if (!id) return { content: [{ type: 'text', text: 'invoice_id is required' }], isError: true };
    return this.get(`/invoices/${encodeURIComponent(id)}`);
  }

  private async payInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.invoice_id as string;
    if (!id) return { content: [{ type: 'text', text: 'invoice_id is required' }], isError: true };
    return this.post(`/invoices/${encodeURIComponent(id)}/pay`, new URLSearchParams());
  }

  private async listRefunds(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.charge) params.set('charge', args.charge as string);
    if (args.payment_intent) params.set('payment_intent', args.payment_intent as string);
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    return this.get('/refunds', params);
  }

  private async createRefund(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.charge) params.set('charge', args.charge as string);
    if (args.payment_intent) params.set('payment_intent', args.payment_intent as string);
    if (args.amount) params.set('amount', String(args.amount));
    if (args.reason) params.set('reason', args.reason as string);
    return this.post('/refunds', params);
  }

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.active !== undefined) params.set('active', String(args.active));
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    return this.get('/products', params);
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const params = new URLSearchParams({ name });
    if (args.description) params.set('description', args.description as string);
    if (args.active !== undefined) params.set('active', String(args.active));
    if (args.metadata && typeof args.metadata === 'object') {
      for (const [k, v] of Object.entries(args.metadata as Record<string, string>)) {
        params.set(`metadata[${k}]`, String(v));
      }
    }
    return this.post('/products', params);
  }

  private async listPrices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.product) params.set('product', args.product as string);
    if (args.active !== undefined) params.set('active', String(args.active));
    if (args.currency) params.set('currency', args.currency as string);
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    return this.get('/prices', params);
  }

  private async createPrice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product || args.unit_amount === undefined || !args.currency) {
      return { content: [{ type: 'text', text: 'product, unit_amount, and currency are required' }], isError: true };
    }
    const params = new URLSearchParams();
    params.set('product', args.product as string);
    params.set('unit_amount', String(args.unit_amount));
    params.set('currency', args.currency as string);
    if (args.recurring_interval) {
      params.set('recurring[interval]', args.recurring_interval as string);
      if (args.recurring_interval_count) {
        params.set('recurring[interval_count]', String(args.recurring_interval_count));
      }
    }
    if (args.nickname) params.set('nickname', args.nickname as string);
    return this.post('/prices', params);
  }
}
