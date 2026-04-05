/**
 * Klarna Payments MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Klarna Payments MCP server was found on GitHub.
//
// Base URL: https://api.klarna.com
// Auth: HTTP Basic (username = Klarna API user UID, password = Klarna API password).
//   Credentials are provided by Klarna Merchant Portal.
//   Playground: https://api.playground.klarna.com (uses same basic auth format)
// Docs: https://docs.klarna.com/klarna-payments/
// Rate limits: Not published; follow Retry-After header on 429 responses.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface KlarnaPaymentsConfig {
  /** Klarna API user UID (used as Basic Auth username) */
  apiUser: string;
  /** Klarna API password (used as Basic Auth password) */
  apiPassword: string;
  /**
   * Base URL for the Klarna Payments API.
   * Production: https://api.klarna.com
   * Playground: https://api.playground.klarna.com
   */
  baseUrl?: string;
}

export class KlarnaPaymentsMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: KlarnaPaymentsConfig) {
    super();
    this.authHeader = 'Basic ' + Buffer.from(`${config.apiUser}:${config.apiPassword}`).toString('base64');
    this.baseUrl = config.baseUrl ?? 'https://api.klarna.com';
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Sessions ──────────────────────────────────────────────────────────
      {
        name: 'create_payment_session',
        description:
          'Create a Klarna Payments session. Returns a session_id, client_token (pass to browser), and available payment_method_categories.',
        inputSchema: {
          type: 'object',
          properties: {
            purchase_country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code of the shopper (e.g. US, SE, GB)',
            },
            purchase_currency: {
              type: 'string',
              description: 'ISO 4217 currency code (e.g. USD, EUR, GBP)',
            },
            order_amount: {
              type: 'number',
              description: 'Total order amount in minor units (cents). Must equal sum of order_lines.',
            },
            order_lines: {
              type: 'array',
              description:
                'Array of order line items. Each item: { name, quantity, unit_price, total_amount, type? }',
            },
            order_tax_amount: {
              type: 'number',
              description: 'Total tax amount in minor units. Must match sum of order_lines tax.',
            },
            locale: {
              type: 'string',
              description: 'BCP 47 locale string (e.g. en-US, sv-SE)',
            },
            billing_address: {
              type: 'object',
              description:
                'Shopper billing address: { given_name, family_name, email, phone, street_address, postal_code, city, country }',
            },
            shipping_address: {
              type: 'object',
              description: 'Shopper shipping address (same fields as billing_address)',
            },
            customer: {
              type: 'object',
              description: 'Shopper details: { date_of_birth?, gender?, organization_entity_type? }',
            },
            merchant_reference1: {
              type: 'string',
              description: 'Merchant-side order reference (e.g. your order ID)',
            },
            merchant_reference2: {
              type: 'string',
              description: 'Secondary merchant reference (optional)',
            },
            merchant_urls: {
              type: 'object',
              description: 'Merchant callback URLs: { confirmation?, notification?, push? }',
            },
            intent: {
              type: 'string',
              description: 'Payment intent: buy (default), tokenize, buy_and_tokenize',
            },
          },
          required: ['purchase_country', 'purchase_currency', 'order_amount', 'order_lines'],
        },
      },
      {
        name: 'read_payment_session',
        description:
          'Read an existing Klarna Payments session by session_id. Returns all collected session data.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The session_id returned by create_payment_session',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'update_payment_session',
        description:
          'Update an existing Klarna Payments session, e.g. when cart contents or shopper details change.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The session_id returned by create_payment_session',
            },
            purchase_country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code' },
            purchase_currency: { type: 'string', description: 'ISO 4217 currency code' },
            order_amount: { type: 'number', description: 'Updated total order amount in minor units' },
            order_lines: { type: 'array', description: 'Updated array of order line items' },
            order_tax_amount: { type: 'number', description: 'Updated total tax amount in minor units' },
            locale: { type: 'string', description: 'BCP 47 locale string' },
            billing_address: { type: 'object', description: 'Updated billing address' },
            shipping_address: { type: 'object', description: 'Updated shipping address' },
            customer: { type: 'object', description: 'Updated customer details' },
            merchant_reference1: { type: 'string', description: 'Updated merchant order reference' },
            merchant_reference2: { type: 'string', description: 'Updated secondary merchant reference' },
            merchant_urls: { type: 'object', description: 'Updated merchant callback URLs' },
            intent: { type: 'string', description: 'Updated payment intent' },
          },
          required: ['session_id'],
        },
      },
      // ── Orders ────────────────────────────────────────────────────────────
      {
        name: 'create_order',
        description:
          "Place a Klarna order using an authorization_token obtained from the Klarna.js front-end. Closes the session and creates an order in Klarna's system.",
        inputSchema: {
          type: 'object',
          properties: {
            authorization_token: {
              type: 'string',
              description: 'Authorization token received from the Klarna.js front-end component',
            },
            purchase_country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code' },
            purchase_currency: { type: 'string', description: 'ISO 4217 currency code' },
            order_amount: { type: 'number', description: 'Total order amount in minor units' },
            order_lines: { type: 'array', description: 'Array of order line items' },
            order_tax_amount: { type: 'number', description: 'Total tax amount in minor units' },
            locale: { type: 'string', description: 'BCP 47 locale string' },
            billing_address: { type: 'object', description: 'Shopper billing address' },
            shipping_address: { type: 'object', description: 'Shopper shipping address' },
            customer: { type: 'object', description: 'Shopper details' },
            merchant_reference1: { type: 'string', description: 'Merchant order reference' },
            merchant_reference2: { type: 'string', description: 'Secondary merchant reference' },
            merchant_urls: { type: 'object', description: 'Merchant callback URLs' },
            auto_capture: {
              type: 'boolean',
              description: 'If true, auto-capture the payment on authorization (default false)',
            },
          },
          required: [
            'authorization_token',
            'purchase_country',
            'purchase_currency',
            'order_amount',
            'order_lines',
          ],
        },
      },
      {
        name: 'cancel_authorization',
        description:
          'Cancel/release an existing Klarna authorization token. Use when a customer abandons checkout.',
        inputSchema: {
          type: 'object',
          properties: {
            authorization_token: {
              type: 'string',
              description: 'The authorization token to cancel',
            },
          },
          required: ['authorization_token'],
        },
      },
      // ── Customer Tokens ───────────────────────────────────────────────────
      {
        name: 'create_customer_token',
        description:
          'Create a Klarna Customer Token from an authorization_token. Stores customer and payment method details for future recurring charges without re-authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            authorization_token: {
              type: 'string',
              description: 'Authorization token from the Klarna.js front-end',
            },
            purchase_country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code' },
            purchase_currency: { type: 'string', description: 'ISO 4217 currency code' },
            locale: { type: 'string', description: 'BCP 47 locale string (e.g. en-US)' },
            description: {
              type: 'string',
              description: 'Human-readable description of what the token is used for',
            },
            intended_use: {
              type: 'string',
              description: 'Intended token use: SUBSCRIPTION, RESERVE_ORDER, or UNSPECIFIED',
            },
            billing_address: { type: 'object', description: 'Customer billing address' },
            customer: { type: 'object', description: 'Customer details (date_of_birth, gender, etc.)' },
          },
          required: [
            'authorization_token',
            'purchase_country',
            'purchase_currency',
            'locale',
            'description',
            'intended_use',
          ],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_payment_session':
          return await this.createPaymentSession(args);
        case 'read_payment_session':
          return await this.readPaymentSession(args);
        case 'update_payment_session':
          return await this.updatePaymentSession(args);
        case 'create_order':
          return await this.createOrder(args);
        case 'cancel_authorization':
          return await this.cancelAuthorization(args);
        case 'create_customer_token':
          return await this.createCustomerToken(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Klarna API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (204 No Content)' }], isError: false };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Klarna returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Klarna API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Klarna returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async delete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Klarna API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: 'Authorization cancelled successfully.' }], isError: false };
  }

  private async createPaymentSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.purchase_country || !args.purchase_currency || args.order_amount === undefined || !args.order_lines) {
      return {
        content: [{ type: 'text', text: 'purchase_country, purchase_currency, order_amount, and order_lines are required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = {
      purchase_country: args.purchase_country,
      purchase_currency: args.purchase_currency,
      order_amount: args.order_amount,
      order_lines: args.order_lines,
    };
    for (const key of ['order_tax_amount', 'locale', 'billing_address', 'shipping_address',
      'customer', 'merchant_reference1', 'merchant_reference2', 'merchant_urls', 'intent'] as const) {
      if (args[key] !== undefined) body[key] = args[key];
    }
    return this.post('/payments/v1/sessions', body);
  }

  private async readPaymentSession(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.session_id as string;
    if (!sessionId) {
      return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    }
    return this.get(`/payments/v1/sessions/${encodeURIComponent(sessionId)}`);
  }

  private async updatePaymentSession(args: Record<string, unknown>): Promise<ToolResult> {
    const sessionId = args.session_id as string;
    if (!sessionId) {
      return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    for (const key of ['purchase_country', 'purchase_currency', 'order_amount', 'order_lines',
      'order_tax_amount', 'locale', 'billing_address', 'shipping_address',
      'customer', 'merchant_reference1', 'merchant_reference2', 'merchant_urls', 'intent'] as const) {
      if (args[key] !== undefined) body[key] = args[key];
    }
    return this.post(`/payments/v1/sessions/${encodeURIComponent(sessionId)}`, body);
  }

  private async createOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const authToken = args.authorization_token as string;
    if (!authToken || !args.purchase_country || !args.purchase_currency || args.order_amount === undefined || !args.order_lines) {
      return {
        content: [{ type: 'text', text: 'authorization_token, purchase_country, purchase_currency, order_amount, and order_lines are required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = {
      purchase_country: args.purchase_country,
      purchase_currency: args.purchase_currency,
      order_amount: args.order_amount,
      order_lines: args.order_lines,
    };
    for (const key of ['order_tax_amount', 'locale', 'billing_address', 'shipping_address',
      'customer', 'merchant_reference1', 'merchant_reference2', 'merchant_urls', 'auto_capture'] as const) {
      if (args[key] !== undefined) body[key] = args[key];
    }
    return this.post(`/payments/v1/authorizations/${encodeURIComponent(authToken)}/order`, body);
  }

  private async cancelAuthorization(args: Record<string, unknown>): Promise<ToolResult> {
    const authToken = args.authorization_token as string;
    if (!authToken) {
      return { content: [{ type: 'text', text: 'authorization_token is required' }], isError: true };
    }
    return this.delete(`/payments/v1/authorizations/${encodeURIComponent(authToken)}`);
  }

  private async createCustomerToken(args: Record<string, unknown>): Promise<ToolResult> {
    const authToken = args.authorization_token as string;
    if (!authToken || !args.purchase_country || !args.purchase_currency || !args.locale || !args.description || !args.intended_use) {
      return {
        content: [{ type: 'text', text: 'authorization_token, purchase_country, purchase_currency, locale, description, and intended_use are required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = {
      purchase_country: args.purchase_country,
      purchase_currency: args.purchase_currency,
      locale: args.locale,
      description: args.description,
      intended_use: args.intended_use,
    };
    if (args.billing_address !== undefined) body['billing_address'] = args.billing_address;
    if (args.customer !== undefined) body['customer'] = args.customer;
    return this.post(
      `/payments/v1/authorizations/${encodeURIComponent(authToken)}/customer-token`,
      body,
    );
  }

  static catalog() {
    return {
      name: 'klarna-payments',
      displayName: 'Klarna Payments',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'klarna', 'payments', 'bnpl', 'buy now pay later', 'checkout',
        'payment session', 'authorization', 'order', 'customer token',
        'installments', 'financing', 'e-commerce', 'fintech',
      ],
      toolNames: [
        'create_payment_session',
        'read_payment_session',
        'update_payment_session',
        'create_order',
        'cancel_authorization',
        'create_customer_token',
      ],
      description:
        'Klarna Payments adapter: create and manage payment sessions, place orders from browser-obtained authorization tokens, cancel authorizations, and generate customer tokens for recurring billing.',
      author: 'protectnil' as const,
    };
  }
}
