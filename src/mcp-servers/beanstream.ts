/**
 * Beanstream Payments MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// Base URL: https://www.beanstream.com/api/v1
// Auth: HTTP Basic — Passcode base64(merchantId:apiPasscode)
// Docs: https://dev.na.bambora.com/docs/references/payment_APIs/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BeanstreamConfig {
  merchantId: string;
  apiPasscode: string;
  baseUrl?: string;
}

export class BeanstreamMCPServer extends MCPAdapterBase {
  private readonly merchantId: string;
  private readonly apiPasscode: string;
  private readonly baseUrl: string;

  constructor(config: BeanstreamConfig) {
    super();
    this.merchantId = config.merchantId;
    this.apiPasscode = config.apiPasscode;
    this.baseUrl = config.baseUrl || 'https://www.beanstream.com/api/v1';
  }

  static catalog() {
    return {
      name: 'beanstream',
      displayName: 'Beanstream Payments',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'beanstream', 'bambora', 'payment', 'transaction', 'credit card',
        'pre-auth', 'void', 'return', 'refund', 'profile', 'tokenization',
        'ecommerce', 'finance', 'payment gateway',
      ],
      toolNames: [
        'make_payment', 'get_payment', 'complete_preauth',
        'return_payment', 'void_transaction',
        'create_profile', 'get_profile', 'update_profile', 'delete_profile',
        'get_profile_cards', 'add_profile_card', 'update_profile_card', 'delete_profile_card',
        'search_transactions', 'tokenize_card',
      ],
      description: 'Process payments, manage customer profiles, and query transactions via the Beanstream (Bambora) Payments REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'make_payment',
        description: 'Submit a payment transaction. Supports credit card, token, or stored profile payments.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Payment amount (e.g. 10.00)' },
            payment_method: { type: 'string', description: 'Method: card, token, payment_profile (default: card)' },
            card_number: { type: 'string', description: 'Credit card number (required if payment_method=card)' },
            card_expiry_month: { type: 'string', description: 'Expiry month MM' },
            card_expiry_year: { type: 'string', description: 'Expiry year YY' },
            card_cvd: { type: 'string', description: 'CVD/CVV (optional)' },
            card_name: { type: 'string', description: 'Cardholder name' },
            token: { type: 'string', description: 'Single-use token (required if payment_method=token)' },
            customer_code: { type: 'string', description: 'Profile customer code (required if payment_method=payment_profile)' },
            order_number: { type: 'string', description: 'Merchant order number (optional, max 30 chars)' },
            customer_ip: { type: 'string', description: 'Customer IP for fraud detection' },
          },
          required: ['amount'],
        },
      },
      {
        name: 'get_payment',
        description: 'Retrieve details of a previously processed payment by transaction ID.',
        inputSchema: {
          type: 'object',
          properties: {
            trans_id: { type: 'number', description: 'Transaction ID' },
          },
          required: ['trans_id'],
        },
      },
      {
        name: 'complete_preauth',
        description: 'Capture funds for a pre-authorized transaction. Amount must be <= pre-auth amount.',
        inputSchema: {
          type: 'object',
          properties: {
            trans_id: { type: 'number', description: 'Transaction ID of the pre-authorization' },
            amount: { type: 'number', description: 'Amount to capture' },
          },
          required: ['trans_id', 'amount'],
        },
      },
      {
        name: 'return_payment',
        description: 'Refund a previously processed payment. Amount cannot exceed the original transaction.',
        inputSchema: {
          type: 'object',
          properties: {
            trans_id: { type: 'number', description: 'Transaction ID to refund' },
            amount: { type: 'number', description: 'Amount to refund' },
            order_number: { type: 'string', description: 'Optional order number for reference' },
          },
          required: ['trans_id', 'amount'],
        },
      },
      {
        name: 'void_transaction',
        description: 'Void a payment before settlement. Must be from the same business day.',
        inputSchema: {
          type: 'object',
          properties: {
            trans_id: { type: 'number', description: 'Transaction ID to void' },
            amount: { type: 'number', description: 'Amount (must match original transaction)' },
          },
          required: ['trans_id', 'amount'],
        },
      },
      {
        name: 'create_profile',
        description: 'Create a secure customer payment profile to store card data for future transactions.',
        inputSchema: {
          type: 'object',
          properties: {
            card_number: { type: 'string', description: 'Credit card number' },
            card_expiry_month: { type: 'string', description: 'Expiry month MM' },
            card_expiry_year: { type: 'string', description: 'Expiry year YY' },
            card_name: { type: 'string', description: 'Cardholder name' },
            customer_email: { type: 'string', description: 'Customer email address' },
            customer_phone: { type: 'string', description: 'Customer phone number' },
            billing_name: { type: 'string', description: 'Billing contact name' },
            billing_address_line1: { type: 'string', description: 'Billing address line 1' },
            billing_city: { type: 'string', description: 'Billing city' },
            billing_province: { type: 'string', description: 'Province/state (2-letter code)' },
            billing_postal_code: { type: 'string', description: 'Postal/zip code' },
            billing_country: { type: 'string', description: 'Country (2-letter ISO, e.g. CA, US)' },
          },
          required: ['card_number', 'card_expiry_month', 'card_expiry_year', 'card_name'],
        },
      },
      {
        name: 'get_profile',
        description: 'Retrieve a customer payment profile by its customer code.',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Customer profile ID' },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'update_profile',
        description: 'Update billing or contact information on an existing customer payment profile.',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Customer profile ID to update' },
            customer_email: { type: 'string', description: 'Updated email' },
            customer_phone: { type: 'string', description: 'Updated phone number' },
            billing_name: { type: 'string', description: 'Updated billing name' },
            billing_address_line1: { type: 'string', description: 'Updated billing address' },
            billing_city: { type: 'string', description: 'Updated city' },
            billing_province: { type: 'string', description: 'Updated province/state' },
            billing_postal_code: { type: 'string', description: 'Updated postal code' },
            billing_country: { type: 'string', description: 'Updated country (2-letter ISO)' },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'delete_profile',
        description: 'Permanently delete a customer payment profile and all stored card data.',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Customer profile ID to delete' },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'get_profile_cards',
        description: 'List all stored payment cards on a customer payment profile.',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Customer profile ID' },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'add_profile_card',
        description: 'Add a new payment card to an existing customer payment profile.',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Customer profile ID' },
            card_number: { type: 'string', description: 'Credit card number' },
            card_expiry_month: { type: 'string', description: 'Expiry month MM' },
            card_expiry_year: { type: 'string', description: 'Expiry year YY' },
            card_name: { type: 'string', description: 'Cardholder name' },
          },
          required: ['profile_id', 'card_number', 'card_expiry_month', 'card_expiry_year', 'card_name'],
        },
      },
      {
        name: 'update_profile_card',
        description: 'Update a specific stored card on a customer payment profile.',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Customer profile ID' },
            card_id: { type: 'number', description: 'Card ID (1-indexed)' },
            card_expiry_month: { type: 'string', description: 'Updated expiry month MM' },
            card_expiry_year: { type: 'string', description: 'Updated expiry year YY' },
            card_name: { type: 'string', description: 'Updated cardholder name' },
          },
          required: ['profile_id', 'card_id'],
        },
      },
      {
        name: 'delete_profile_card',
        description: 'Remove a specific stored card from a customer payment profile.',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: { type: 'string', description: 'Customer profile ID' },
            card_id: { type: 'number', description: 'Card ID (1-indexed) to delete' },
          },
          required: ['profile_id', 'card_id'],
        },
      },
      {
        name: 'search_transactions',
        description: 'Search transaction history by date range, amount, card type, or approval status.',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string', description: 'Start date YYYY-MM-DDTHH:mm:ss (default: 30 days ago)' },
            end_date: { type: 'string', description: 'End date YYYY-MM-DDTHH:mm:ss (default: now)' },
            start_row: { type: 'number', description: 'Starting row for pagination (default: 1)' },
            end_row: { type: 'number', description: 'Ending row (default: 25, max: 1000)' },
            criteria_type: { type: 'string', description: 'Filter field: amount, card_type, trans_type' },
            criteria_value: { type: 'string', description: 'Filter value (e.g. "P" for Visa)' },
          },
        },
      },
      {
        name: 'tokenize_card',
        description: 'Create a single-use token for a credit card for secure payment processing.',
        inputSchema: {
          type: 'object',
          properties: {
            card_number: { type: 'string', description: 'Credit card number' },
            card_expiry_month: { type: 'string', description: 'Expiry month MM' },
            card_expiry_year: { type: 'string', description: 'Expiry year YY' },
            card_cvd: { type: 'string', description: 'CVD/CVV (optional)' },
            card_name: { type: 'string', description: 'Cardholder name' },
          },
          required: ['card_number', 'card_expiry_month', 'card_expiry_year', 'card_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'make_payment':         return await this.makePayment(args);
        case 'get_payment':          return await this.getPayment(args);
        case 'complete_preauth':     return await this.completePreauth(args);
        case 'return_payment':       return await this.returnPayment(args);
        case 'void_transaction':     return await this.voidTransaction(args);
        case 'create_profile':       return await this.createProfile(args);
        case 'get_profile':          return await this.getProfile(args);
        case 'update_profile':       return await this.updateProfile(args);
        case 'delete_profile':       return await this.deleteProfile(args);
        case 'get_profile_cards':    return await this.getProfileCards(args);
        case 'add_profile_card':     return await this.addProfileCard(args);
        case 'update_profile_card':  return await this.updateProfileCard(args);
        case 'delete_profile_card':  return await this.deleteProfileCard(args);
        case 'search_transactions':  return await this.searchTransactions(args);
        case 'tokenize_card':        return await this.tokenizeCard(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    const credentials = Buffer.from(`${this.merchantId}:${this.apiPasscode}`).toString('base64');
    return {
      Authorization: `Passcode ${credentials}`,
      'Content-Type': 'application/json',
    };
  }

  private async bsRequest(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = { method, headers: this.buildHeaders() };
    if (body !== undefined) options.body = JSON.stringify(body);

    const response = await this.fetchWithRetry(url, options);

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Beanstream API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      return { content: [{ type: 'text', text: `Beanstream returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Payments ─────────────────────────────────────────────────────────────

  private async makePayment(args: Record<string, unknown>): Promise<ToolResult> {
    const method = (args.payment_method as string) || 'card';
    const body: Record<string, unknown> = { amount: args.amount };

    if (method === 'card') {
      body.payment_method = 'card';
      body.card = {
        number: args.card_number,
        name: args.card_name || 'Cardholder',
        expiry_month: args.card_expiry_month,
        expiry_year: args.card_expiry_year,
        ...(args.card_cvd ? { cvd: args.card_cvd } : {}),
      };
    } else if (method === 'token') {
      body.payment_method = 'token';
      body.token = { code: args.token, name: args.card_name || 'Cardholder' };
    } else if (method === 'payment_profile') {
      body.payment_method = 'payment_profile';
      body.payment_profile = { customer_code: args.customer_code };
    } else {
      body.payment_method = method;
    }

    if (args.order_number) body.order_number = args.order_number;
    if (args.customer_ip) body.customer_ip = args.customer_ip;

    return this.bsRequest('POST', '/payments', body);
  }

  private async getPayment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bsRequest('GET', `/payments/${args.trans_id}`);
  }

  private async completePreauth(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bsRequest('POST', `/payments/${args.trans_id}/completions`, { amount: args.amount });
  }

  private async returnPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { amount: args.amount };
    if (args.order_number) body.order_number = args.order_number;
    return this.bsRequest('POST', `/payments/${args.trans_id}/returns`, body);
  }

  private async voidTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bsRequest('POST', `/payments/${args.trans_id}/void`, { amount: args.amount });
  }

  // ── Profiles ─────────────────────────────────────────────────────────────

  private async createProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      card: {
        number: args.card_number,
        name: args.card_name,
        expiry_month: args.card_expiry_month,
        expiry_year: args.card_expiry_year,
      },
    };
    const billing: Record<string, unknown> = {};
    if (args.billing_name) billing.name = args.billing_name;
    if (args.billing_address_line1) billing.address_line1 = args.billing_address_line1;
    if (args.billing_city) billing.city = args.billing_city;
    if (args.billing_province) billing.province = args.billing_province;
    if (args.billing_postal_code) billing.postal_code = args.billing_postal_code;
    if (args.billing_country) billing.country = args.billing_country;
    if (Object.keys(billing).length > 0) body.billing = billing;
    if (args.customer_email) body.email = args.customer_email;
    if (args.customer_phone) body.phone = args.customer_phone;
    return this.bsRequest('POST', '/profiles', body);
  }

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bsRequest('GET', `/profiles/${args.profile_id}`);
  }

  private async updateProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const { profile_id, ...rest } = args;
    const body: Record<string, unknown> = {};
    const billing: Record<string, unknown> = {};
    if (rest.customer_email) body.email = rest.customer_email;
    if (rest.customer_phone) body.phone = rest.customer_phone;
    if (rest.billing_name) billing.name = rest.billing_name;
    if (rest.billing_address_line1) billing.address_line1 = rest.billing_address_line1;
    if (rest.billing_city) billing.city = rest.billing_city;
    if (rest.billing_province) billing.province = rest.billing_province;
    if (rest.billing_postal_code) billing.postal_code = rest.billing_postal_code;
    if (rest.billing_country) billing.country = rest.billing_country;
    if (Object.keys(billing).length > 0) body.billing = billing;
    return this.bsRequest('PUT', `/profiles/${profile_id}`, body);
  }

  private async deleteProfile(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bsRequest('DELETE', `/profiles/${args.profile_id}`);
  }

  // ── Profile Cards ─────────────────────────────────────────────────────────

  private async getProfileCards(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bsRequest('GET', `/profiles/${args.profile_id}/cards`);
  }

  private async addProfileCard(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bsRequest('POST', `/profiles/${args.profile_id}/cards`, {
      card: {
        number: args.card_number,
        name: args.card_name,
        expiry_month: args.card_expiry_month,
        expiry_year: args.card_expiry_year,
      },
    });
  }

  private async updateProfileCard(args: Record<string, unknown>): Promise<ToolResult> {
    const card: Record<string, unknown> = {};
    if (args.card_expiry_month) card.expiry_month = args.card_expiry_month;
    if (args.card_expiry_year) card.expiry_year = args.card_expiry_year;
    if (args.card_name) card.name = args.card_name;
    return this.bsRequest('PUT', `/profiles/${args.profile_id}/cards/${args.card_id}`, { card });
  }

  private async deleteProfileCard(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bsRequest('DELETE', `/profiles/${args.profile_id}/cards/${args.card_id}`);
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  private async searchTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    const body: Record<string, unknown> = {
      start_date: args.start_date || fmt(thirtyDaysAgo),
      end_date: args.end_date || fmt(now),
      start_row: args.start_row || 1,
      end_row: args.end_row || 25,
    };
    if (args.criteria_type && args.criteria_value) {
      body.criteria = [{ field: args.criteria_type, operator: '%3D', value: args.criteria_value }];
    }
    return this.bsRequest('POST', '/reports', body);
  }

  // ── Tokenization ──────────────────────────────────────────────────────────

  private async tokenizeCard(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      number: args.card_number,
      name: args.card_name,
      expiry_month: args.card_expiry_month,
      expiry_year: args.card_expiry_year,
    };
    if (args.card_cvd) body.cvd = args.card_cvd;
    return this.bsRequest('POST', '/scripts/tokenization/tokens', body);
  }
}
