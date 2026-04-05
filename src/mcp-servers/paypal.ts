/**
 * PayPal MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/paypal/paypal-mcp-server — transport: stdio, auth: OAuth2 access token
// Our adapter covers: 29 tools. Vendor MCP covers: 30 tools.
// Recommendation: use-both — our adapter has capture_order and authorize_order not in vendor MCP;
// vendor MCP has update_plan and update_subscription not covered by our adapter.
//
// Integration: use-both
// MCP-sourced tools (route through MCP): update_plan, update_subscription
// REST-sourced tools (this adapter): create_order, get_order, capture_order, authorize_order,
//   list_transactions, create_invoice, get_invoice, send_invoice, send_invoice_reminder,
//   generate_invoice_qr_code, list_invoices, cancel_invoice, get_dispute, list_disputes,
//   accept_dispute_claim, create_refund, get_refund, create_product, list_products, get_product,
//   update_product, create_subscription_plan, list_subscription_plans, get_subscription_plan,
//   create_subscription, get_subscription, cancel_subscription, create_shipment_tracking,
//   get_shipment_tracking
// Shared (route MCP-first): create_order, get_order, create_refund, get_refund, list_disputes,
//   get_dispute, accept_dispute_claim, create_product, list_products, update_product,
//   create_subscription_plan, list_subscription_plans, create_subscription, cancel_subscription,
//   list_transactions, send_invoice, create_invoice, list_invoices, get_invoice
//
// Base URL: https://api-m.paypal.com
// Auth: OAuth2 client credentials — POST /v1/oauth2/token with Basic auth (clientId:clientSecret)
// Docs: https://developer.paypal.com/api/rest/
// Rate limits: Not publicly documented; PayPal recommends exponential backoff on 429 responses.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class PayPalMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: PayPalConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api-m.paypal.com';
  }

  static catalog() {
    return {
      name: 'paypal',
      displayName: 'PayPal',
      version: '1.0.0',
      category: 'commerce' as const,
      keywords: ['paypal', 'payment', 'checkout', 'order', 'invoice', 'subscription', 'dispute', 'refund', 'commerce', 'billing'],
      toolNames: [
        'create_order', 'get_order', 'capture_order', 'authorize_order',
        'list_transactions',
        'create_invoice', 'get_invoice', 'send_invoice', 'send_invoice_reminder',
        'generate_invoice_qr_code', 'list_invoices', 'cancel_invoice',
        'get_dispute', 'list_disputes', 'accept_dispute_claim',
        'create_refund', 'get_refund',
        'create_shipment_tracking', 'get_shipment_tracking',
        'create_product', 'list_products', 'get_product', 'update_product',
        'create_subscription_plan', 'list_subscription_plans', 'get_subscription_plan',
        'create_subscription', 'get_subscription', 'cancel_subscription',
      ],
      description: 'PayPal commerce: create and capture orders, manage invoices, process refunds, handle disputes, manage subscriptions and billing plans.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_order',
        description: 'Create a new PayPal checkout order with intent CAPTURE or AUTHORIZE and one or more purchase units',
        inputSchema: {
          type: 'object',
          properties: {
            intent: {
              type: 'string',
              description: 'Payment intent: CAPTURE (capture immediately) or AUTHORIZE (authorize then capture later)',
            },
            currency_code: {
              type: 'string',
              description: 'Three-letter ISO-4217 currency code (e.g. USD, EUR)',
            },
            amount_value: {
              type: 'string',
              description: 'Total order amount as a decimal string (e.g. "29.99")',
            },
            description: {
              type: 'string',
              description: 'Optional purchase unit description',
            },
            reference_id: {
              type: 'string',
              description: 'Optional merchant reference ID for the purchase unit',
            },
          },
          required: ['intent', 'currency_code', 'amount_value'],
        },
      },
      {
        name: 'get_order',
        description: 'Retrieve full details of a PayPal order by order ID including status and purchase units',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'PayPal order ID returned from create_order',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'capture_order',
        description: 'Capture payment for an approved PayPal order, completing the transaction and transferring funds',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'PayPal order ID to capture',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'authorize_order',
        description: 'Authorize payment for a PayPal order without capturing funds immediately',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'PayPal order ID to authorize',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List PayPal transaction history for a date range with optional field filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start of date range in ISO 8601 format (e.g. 2024-01-01T00:00:00-0700)',
            },
            end_date: {
              type: 'string',
              description: 'End of date range in ISO 8601 format (max 31-day window)',
            },
            transaction_status: {
              type: 'string',
              description: 'Filter by status: D (denied), P (pending), S (success), V (reversal)',
            },
            page_size: {
              type: 'number',
              description: 'Transactions per page (default: 100, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a draft PayPal invoice with line items, due date, and recipient details',
        inputSchema: {
          type: 'object',
          properties: {
            recipient_email: {
              type: 'string',
              description: 'Email address of the invoice recipient',
            },
            currency_code: {
              type: 'string',
              description: 'Three-letter ISO-4217 currency code (e.g. USD)',
            },
            item_name: {
              type: 'string',
              description: 'Name of the item or service being invoiced',
            },
            item_quantity: {
              type: 'number',
              description: 'Quantity of items (default: 1)',
            },
            item_unit_amount: {
              type: 'string',
              description: 'Unit price as a decimal string (e.g. "100.00")',
            },
            note: {
              type: 'string',
              description: 'Optional note to the recipient',
            },
            due_date: {
              type: 'string',
              description: 'Invoice due date in YYYY-MM-DD format',
            },
          },
          required: ['recipient_email', 'currency_code', 'item_name', 'item_unit_amount'],
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve full details of a PayPal invoice by invoice ID including status and line items',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'PayPal invoice ID (e.g. INV2-XXXX-XXXX-XXXX-XXXX)',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'send_invoice',
        description: 'Send a draft PayPal invoice to the recipient via email',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'PayPal invoice ID to send',
            },
            send_to_recipient: {
              type: 'boolean',
              description: 'Send to the invoice recipient (default: true)',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'send_invoice_reminder',
        description: 'Send a payment reminder email for a previously sent PayPal invoice to the recipient',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'PayPal invoice ID to send the reminder for',
            },
            subject: {
              type: 'string',
              description: 'Optional subject line of the reminder email',
            },
            note: {
              type: 'string',
              description: 'Optional note to include in the reminder email',
            },
            send_to_recipient: {
              type: 'boolean',
              description: 'Whether to send the reminder to the invoice recipient (default: true)',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'generate_invoice_qr_code',
        description: 'Generate a QR code PNG image (Base64-encoded) for a sent PayPal invoice to enable mobile payment',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'PayPal invoice ID to generate the QR code for (must be in SENT state)',
            },
            width: {
              type: 'number',
              description: 'Width of the QR code image in pixels (default: 400, max: 500)',
            },
            height: {
              type: 'number',
              description: 'Height of the QR code image in pixels (default: 400, max: 500)',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List PayPal invoices with optional filtering by status, date range, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Invoices per page (default: 20, max: 100)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: DRAFT, SENT, SCHEDULED, PAYMENT_PENDING, PARTIALLY_PAID, PAID, CANCELLED, REFUNDED',
            },
          },
          required: [],
        },
      },
      {
        name: 'cancel_invoice',
        description: 'Cancel a sent PayPal invoice and optionally notify the recipient',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'PayPal invoice ID to cancel',
            },
            cancellation_note: {
              type: 'string',
              description: 'Optional cancellation note sent to the recipient',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'get_dispute',
        description: 'Retrieve full details of a PayPal dispute including status, reason, and transaction information',
        inputSchema: {
          type: 'object',
          properties: {
            dispute_id: {
              type: 'string',
              description: 'PayPal dispute ID (e.g. PP-D-XXXXX)',
            },
          },
          required: ['dispute_id'],
        },
      },
      {
        name: 'list_disputes',
        description: 'List PayPal disputes with optional filters for start time, status, and reason',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'string',
              description: 'Filter disputes opened after this ISO 8601 timestamp',
            },
            disputed_transaction_id: {
              type: 'string',
              description: 'Filter by the disputed transaction ID',
            },
            dispute_state: {
              type: 'string',
              description: 'Filter by state: REQUIRED_ACTION, REQUIRED_OTHER_PARTY_ACTION, UNDER_PAYPAL_REVIEW, RESOLVED, OPEN_INQUIRIES, APPEALABLE',
            },
            page_size: {
              type: 'number',
              description: 'Disputes per page (default: 10, max: 50)',
            },
            next_page_token: {
              type: 'string',
              description: 'Pagination token from a previous list response',
            },
          },
          required: [],
        },
      },
      {
        name: 'accept_dispute_claim',
        description: 'Accept a PayPal dispute claim, agreeing to the buyer\'s resolution and closing the dispute',
        inputSchema: {
          type: 'object',
          properties: {
            dispute_id: {
              type: 'string',
              description: 'PayPal dispute ID to accept',
            },
            note: {
              type: 'string',
              description: 'Optional note explaining the acceptance decision',
            },
          },
          required: ['dispute_id'],
        },
      },
      {
        name: 'create_refund',
        description: 'Issue a full or partial refund for a captured PayPal payment by capture ID',
        inputSchema: {
          type: 'object',
          properties: {
            capture_id: {
              type: 'string',
              description: 'PayPal capture ID to refund',
            },
            amount_value: {
              type: 'string',
              description: 'Refund amount as a decimal string (e.g. "15.00"). Omit for full refund.',
            },
            currency_code: {
              type: 'string',
              description: 'Three-letter ISO-4217 currency code, required when amount_value is specified',
            },
            note_to_payer: {
              type: 'string',
              description: 'Optional refund reason shown to the payer (max 255 characters)',
            },
          },
          required: ['capture_id'],
        },
      },
      {
        name: 'get_refund',
        description: 'Retrieve details of a PayPal refund by refund ID including status and amount',
        inputSchema: {
          type: 'object',
          properties: {
            refund_id: {
              type: 'string',
              description: 'PayPal refund ID',
            },
          },
          required: ['refund_id'],
        },
      },
      {
        name: 'create_shipment_tracking',
        description: 'Add shipment tracking information to a PayPal transaction by posting carrier and tracking number',
        inputSchema: {
          type: 'object',
          properties: {
            transaction_id: {
              type: 'string',
              description: 'PayPal transaction ID to attach tracking information to',
            },
            tracking_number: {
              type: 'string',
              description: 'Carrier-assigned shipment tracking number',
            },
            status: {
              type: 'string',
              description: 'Shipment status: SHIPPED, ON_THE_WAY, DELIVERED, CANCELLED',
            },
            carrier: {
              type: 'string',
              description: 'Carrier code (e.g. FEDEX, UPS, USPS, DHL). Use OTHER if carrier not listed.',
            },
            carrier_name_other: {
              type: 'string',
              description: 'Carrier name when carrier is set to OTHER',
            },
          },
          required: ['transaction_id', 'status'],
        },
      },
      {
        name: 'get_shipment_tracking',
        description: 'Retrieve shipment tracking details for a PayPal transaction by transaction ID and tracking number',
        inputSchema: {
          type: 'object',
          properties: {
            transaction_id: {
              type: 'string',
              description: 'PayPal transaction ID',
            },
            tracking_number: {
              type: 'string',
              description: 'The shipment tracking number',
            },
          },
          required: ['transaction_id', 'tracking_number'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a PayPal catalog product for use in subscription plans',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Product name (max 127 characters)',
            },
            type: {
              type: 'string',
              description: 'Product type: PHYSICAL, DIGITAL, or SERVICE',
            },
            description: {
              type: 'string',
              description: 'Optional product description (max 256 characters)',
            },
            category: {
              type: 'string',
              description: 'Optional product category (e.g. SOFTWARE, SERVICES)',
            },
            image_url: {
              type: 'string',
              description: 'Optional URL of the product image',
            },
          },
          required: ['name', 'type'],
        },
      },
      {
        name: 'list_products',
        description: 'List PayPal catalog products with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Products per page (default: 10, max: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_product',
        description: 'Retrieve details of a PayPal catalog product by product ID',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'PayPal product ID (e.g. PROD-XXXX)',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'update_product',
        description: 'Update fields on an existing PayPal catalog product using JSON Patch operations',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'PayPal product ID to update',
            },
            description: {
              type: 'string',
              description: 'New product description',
            },
            category: {
              type: 'string',
              description: 'New product category',
            },
            image_url: {
              type: 'string',
              description: 'New product image URL',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'create_subscription_plan',
        description: 'Create a PayPal subscription billing plan linked to a product with pricing and billing cycles',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'PayPal product ID this plan belongs to',
            },
            name: {
              type: 'string',
              description: 'Plan name (max 127 characters)',
            },
            billing_interval_unit: {
              type: 'string',
              description: 'Billing cycle interval: DAY, WEEK, MONTH, or YEAR',
            },
            billing_interval_count: {
              type: 'number',
              description: 'Number of intervals between billing cycles (default: 1)',
            },
            currency_code: {
              type: 'string',
              description: 'Three-letter ISO-4217 currency code',
            },
            price_value: {
              type: 'string',
              description: 'Price per billing cycle as a decimal string (e.g. "9.99")',
            },
            description: {
              type: 'string',
              description: 'Optional plan description',
            },
          },
          required: ['product_id', 'name', 'billing_interval_unit', 'currency_code', 'price_value'],
        },
      },
      {
        name: 'list_subscription_plans',
        description: 'List PayPal subscription billing plans with optional filtering by product ID',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Filter plans by product ID',
            },
            page_size: {
              type: 'number',
              description: 'Plans per page (default: 10, max: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_subscription_plan',
        description: 'Retrieve full details of a PayPal subscription plan by plan ID',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: {
              type: 'string',
              description: 'PayPal subscription plan ID (e.g. P-XXXX)',
            },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'create_subscription',
        description: 'Create a PayPal subscription for a subscriber against a billing plan',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: {
              type: 'string',
              description: 'PayPal subscription plan ID to subscribe to',
            },
            subscriber_email: {
              type: 'string',
              description: 'Email address of the subscriber',
            },
            subscriber_name_given: {
              type: 'string',
              description: 'Subscriber first name',
            },
            subscriber_name_surname: {
              type: 'string',
              description: 'Subscriber last name',
            },
            start_time: {
              type: 'string',
              description: 'Subscription start time in ISO 8601 format (default: immediately)',
            },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'get_subscription',
        description: 'Retrieve details of a PayPal subscription by subscription ID including status and billing info',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_id: {
              type: 'string',
              description: 'PayPal subscription ID (e.g. I-XXXX)',
            },
          },
          required: ['subscription_id'],
        },
      },
      {
        name: 'cancel_subscription',
        description: 'Cancel an active PayPal subscription with an optional reason',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_id: {
              type: 'string',
              description: 'PayPal subscription ID to cancel',
            },
            reason: {
              type: 'string',
              description: 'Cancellation reason (max 128 characters)',
            },
          },
          required: ['subscription_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_order':
          return await this.createOrder(args);
        case 'get_order':
          return await this.getOrder(args);
        case 'capture_order':
          return await this.captureOrder(args);
        case 'authorize_order':
          return await this.authorizeOrder(args);
        case 'list_transactions':
          return await this.listTransactions(args);
        case 'create_invoice':
          return await this.createInvoice(args);
        case 'get_invoice':
          return await this.getInvoice(args);
        case 'send_invoice':
          return await this.sendInvoice(args);
        case 'send_invoice_reminder':
          return await this.sendInvoiceReminder(args);
        case 'generate_invoice_qr_code':
          return await this.generateInvoiceQrCode(args);
        case 'list_invoices':
          return await this.listInvoices(args);
        case 'cancel_invoice':
          return await this.cancelInvoice(args);
        case 'get_dispute':
          return await this.getDispute(args);
        case 'list_disputes':
          return await this.listDisputes(args);
        case 'accept_dispute_claim':
          return await this.acceptDisputeClaim(args);
        case 'create_refund':
          return await this.createRefund(args);
        case 'get_refund':
          return await this.getRefund(args);
        case 'create_shipment_tracking':
          return await this.createShipmentTracking(args);
        case 'get_shipment_tracking':
          return await this.getShipmentTracking(args);
        case 'create_product':
          return await this.createProduct(args);
        case 'list_products':
          return await this.listProducts(args);
        case 'get_product':
          return await this.getProduct(args);
        case 'update_product':
          return await this.updateProduct(args);
        case 'create_subscription_plan':
          return await this.createSubscriptionPlan(args);
        case 'list_subscription_plans':
          return await this.listSubscriptionPlans(args);
        case 'get_subscription_plan':
          return await this.getSubscriptionPlan(args);
        case 'create_subscription':
          return await this.createSubscription(args);
        case 'get_subscription':
          return await this.getSubscription(args);
        case 'cancel_subscription':
          return await this.cancelSubscription(args);
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

  // ── Auth ──────────────────────────────────────────────────────────────────

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
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
    };
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  private async createOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const body = {
      intent: args.intent,
      purchase_units: [{
        amount: { currency_code: args.currency_code, value: args.amount_value },
        ...(args.description ? { description: args.description } : {}),
        ...(args.reference_id ? { reference_id: args.reference_id } : {}),
      }],
    };
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/checkout/orders`, {
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

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/checkout/orders/${encodeURIComponent(args.order_id as string)}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async captureOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/checkout/orders/${encodeURIComponent(args.order_id as string)}/capture`, {
      method: 'POST',
      headers,
      body: '{}',
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async authorizeOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/checkout/orders/${encodeURIComponent(args.order_id as string)}/authorize`, {
      method: 'POST',
      headers,
      body: '{}',
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const params = new URLSearchParams();
    params.set('start_date', args.start_date as string);
    params.set('end_date', args.end_date as string);
    if (args.transaction_status) params.set('transaction_status', args.transaction_status as string);
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.page) params.set('page', String(args.page));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/reporting/transactions?${params}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  private async createInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const body: Record<string, unknown> = {
      detail: {
        currency_code: args.currency_code,
        ...(args.note ? { note: args.note } : {}),
        ...(args.due_date ? { payment_term: { due_date: args.due_date } } : {}),
      },
      primary_recipients: [{ billing_info: { email_address: args.recipient_email } }],
      items: [{
        name: args.item_name,
        quantity: String(args.item_quantity ?? 1),
        unit_amount: { currency_code: args.currency_code, value: args.item_unit_amount },
      }],
    };
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/invoicing/invoices`, {
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

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/invoicing/invoices/${encodeURIComponent(args.invoice_id as string)}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const body = { send_to_recipient: args.send_to_recipient !== false };
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/invoicing/invoices/${encodeURIComponent(args.invoice_id as string)}/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text || '{"status":"sent"}' }], isError: false };
  }

  private async sendInvoiceReminder(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const notification: Record<string, unknown> = { send_to_recipient: args.send_to_recipient !== false };
    if (args.subject) notification.subject = args.subject;
    if (args.note) notification.note = args.note;
    const body = { notification };
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/invoicing/invoices/${encodeURIComponent(args.invoice_id as string)}/remind`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text || '{"status":"reminder_sent"}' }], isError: false };
  }

  private async generateInvoiceQrCode(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const body: Record<string, unknown> = {
      width: (args.width as number) ?? 400,
      height: (args.height as number) ?? 400,
    };
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/invoicing/invoices/${encodeURIComponent(args.invoice_id as string)}/generate-qr-code`, {
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

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const params = new URLSearchParams();
    params.set('page', String(args.page ?? 1));
    params.set('page_size', String(args.page_size ?? 20));
    if (args.status) params.set('status', args.status as string);
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/invoicing/invoices?${params}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cancelInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const body: Record<string, unknown> = {};
    if (args.cancellation_note) body.cancellation_note = args.cancellation_note;
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/invoicing/invoices/${encodeURIComponent(args.invoice_id as string)}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text || '{"status":"cancelled"}' }], isError: false };
  }

  // ── Disputes ──────────────────────────────────────────────────────────────

  private async getDispute(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/customer/disputes/${encodeURIComponent(args.dispute_id as string)}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDisputes(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const params = new URLSearchParams();
    if (args.start_time) params.set('start_time', args.start_time as string);
    if (args.disputed_transaction_id) params.set('disputed_transaction_id', args.disputed_transaction_id as string);
    if (args.dispute_state) params.set('dispute_state', args.dispute_state as string);
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.next_page_token) params.set('next_page_token', args.next_page_token as string);
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/customer/disputes?${params}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async acceptDisputeClaim(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const body: Record<string, unknown> = {};
    if (args.note) body.note = args.note;
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/customer/disputes/${encodeURIComponent(args.dispute_id as string)}/accept-claim`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text || '{"status":"accepted"}' }], isError: false };
  }

  // ── Refunds ───────────────────────────────────────────────────────────────

  private async createRefund(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const body: Record<string, unknown> = {};
    if (args.amount_value) {
      body.amount = { value: args.amount_value, currency_code: args.currency_code };
    }
    if (args.note_to_payer) body.note_to_payer = args.note_to_payer;
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/payments/captures/${encodeURIComponent(args.capture_id as string)}/refund`, {
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

  private async getRefund(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/payments/refunds/${encodeURIComponent(args.refund_id as string)}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Shipment Tracking ─────────────────────────────────────────────────────

  private async createShipmentTracking(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const tracker: Record<string, unknown> = {
      transaction_id: args.transaction_id,
      status: args.status,
    };
    if (args.tracking_number) tracker.tracking_number = args.tracking_number;
    if (args.carrier) tracker.carrier = args.carrier;
    if (args.carrier_name_other) tracker.carrier_name_other = args.carrier_name_other;
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/shipping/trackers-batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ trackers: [tracker] }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getShipmentTracking(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const trackerId = `${encodeURIComponent(args.transaction_id as string)}-${encodeURIComponent(args.tracking_number as string)}`;
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/shipping/trackers/${trackerId}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Products ──────────────────────────────────────────────────────────────

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const body: Record<string, unknown> = { name: args.name, type: args.type };
    if (args.description) body.description = args.description;
    if (args.category) body.category = args.category;
    if (args.image_url) body.image_url = args.image_url;
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/catalogs/products`, {
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

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const params = new URLSearchParams();
    params.set('page_size', String(args.page_size ?? 10));
    params.set('page', String(args.page ?? 1));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/catalogs/products?${params}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/catalogs/products/${encodeURIComponent(args.product_id as string)}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const patch: Array<{ op: string; path: string; value: unknown }> = [];
    if (args.description !== undefined) patch.push({ op: 'replace', path: '/description', value: args.description });
    if (args.category !== undefined) patch.push({ op: 'replace', path: '/category', value: args.category });
    if (args.image_url !== undefined) patch.push({ op: 'replace', path: '/image_url', value: args.image_url });
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/catalogs/products/${encodeURIComponent(args.product_id as string)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text || '{"status":"updated"}' }], isError: false };
  }

  // ── Subscription Plans ────────────────────────────────────────────────────

  private async createSubscriptionPlan(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const body: Record<string, unknown> = {
      product_id: args.product_id,
      name: args.name,
      billing_cycles: [{
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        frequency: {
          interval_unit: args.billing_interval_unit,
          interval_count: args.billing_interval_count ?? 1,
        },
        pricing_scheme: {
          fixed_price: { value: args.price_value, currency_code: args.currency_code },
        },
      }],
      payment_preferences: { auto_bill_outstanding: true },
    };
    if (args.description) body.description = args.description;
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/billing/plans`, {
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

  private async listSubscriptionPlans(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const params = new URLSearchParams();
    if (args.product_id) params.set('product_id', args.product_id as string);
    params.set('page_size', String(args.page_size ?? 10));
    params.set('page', String(args.page ?? 1));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/billing/plans?${params}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSubscriptionPlan(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/billing/plans/${encodeURIComponent(args.plan_id as string)}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  private async createSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const body: Record<string, unknown> = { plan_id: args.plan_id };
    if (args.start_time) body.start_time = args.start_time;
    if (args.subscriber_email || args.subscriber_name_given || args.subscriber_name_surname) {
      const subscriber: Record<string, unknown> = {};
      if (args.subscriber_email) subscriber.email_address = args.subscriber_email;
      if (args.subscriber_name_given || args.subscriber_name_surname) {
        subscriber.name = {
          given_name: args.subscriber_name_given,
          surname: args.subscriber_name_surname,
        };
      }
      body.subscriber = subscriber;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/billing/subscriptions`, {
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

  private async getSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/billing/subscriptions/${encodeURIComponent(args.subscription_id as string)}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cancelSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const body: Record<string, unknown> = {};
    if (args.reason) body.reason = args.reason;
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/billing/subscriptions/${encodeURIComponent(args.subscription_id as string)}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text || '{"status":"cancelled"}' }], isError: false };
  }
}
