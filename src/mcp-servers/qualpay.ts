/**
 * Qualpay Payment Gateway MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Qualpay MCP server was found on GitHub.
//
// Base URL: https://api-test.qualpay.com/pg (test); https://api.qualpay.com/pg (production)
// Auth: HTTP Basic Auth — merchant_id as username, security_key as password
// Docs: https://www.qualpay.com/developer/api/payment-gateway
// Rate limits: Not publicly documented. Contact Qualpay support for limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface QualpayConfig {
  merchantId: string;
  securityKey: string;
  /** Optional base URL override (default: https://api-test.qualpay.com/pg) */
  baseUrl?: string;
}

export class QualpayMCPServer extends MCPAdapterBase {
  private readonly merchantId: string;
  private readonly securityKey: string;
  private readonly baseUrl: string;

  constructor(config: QualpayConfig) {
    super();
    this.merchantId = config.merchantId;
    this.securityKey = config.securityKey;
    this.baseUrl = config.baseUrl ?? 'https://api-test.qualpay.com/pg';
  }

  static catalog() {
    return {
      name: 'qualpay',
      displayName: 'Qualpay',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'qualpay', 'payment', 'gateway', 'credit card', 'transaction',
        'authorize', 'capture', 'sale', 'refund', 'void', 'tokenize',
        'charge', 'merchant', 'card', 'pos', 'ecommerce', 'batch',
        'receipt', 'verify', 'credit', 'recharge', 'force',
      ],
      toolNames: [
        'get_card_type',
        'authorize_transaction',
        'capture_transaction',
        'sale_transaction',
        'credit_transaction',
        'force_transaction',
        'refund_transaction',
        'recharge_transaction',
        'void_transaction',
        'tokenize_card',
        'verify_card',
        'expire_token',
        'close_batch',
        'send_receipt_email',
      ],
      description: 'Qualpay Payment Gateway: authorize, capture, sale, refund, void, credit, force, and recharge card transactions; tokenize and verify cards; expire tokens; close batch; send email receipts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_card_type',
        description: 'Get card network type (Visa, Mastercard, Discover) for a card number — useful for display and routing before charging',
        inputSchema: {
          type: 'object',
          properties: {
            card_number: {
              type: 'string',
              description: 'Card number up to 19 digits',
            },
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID (overrides config if provided)',
            },
          },
          required: ['card_number'],
        },
      },
      {
        name: 'authorize_transaction',
        description: 'Authorize a card transaction without capturing funds — places a hold on the card; call capture_transaction later to settle',
        inputSchema: {
          type: 'object',
          properties: {
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            amt_tran: {
              type: 'number',
              description: 'Transaction amount (e.g. 19.99)',
            },
            card_number: {
              type: 'string',
              description: 'Card number up to 19 digits (use card_id for tokenized cards)',
            },
            exp_date: {
              type: 'string',
              description: 'Card expiration date in MMYY format (e.g. "1228")',
            },
            card_id: {
              type: 'string',
              description: 'Tokenized card ID (32-character string) — alternative to card_number',
            },
            cvv2: {
              type: 'string',
              description: 'Card CVV2/CVC security code (up to 4 digits)',
            },
            cardholder_name: {
              type: 'string',
              description: 'Name on the card (up to 64 characters)',
            },
            purchase_id: {
              type: 'string',
              description: 'Merchant purchase or order reference number (up to 25 characters)',
            },
            merch_ref_num: {
              type: 'string',
              description: 'Merchant reference number for reconciliation (up to 128 characters)',
            },
            avs_address: {
              type: 'string',
              description: 'Street address for AVS verification (up to 20 characters)',
            },
            avs_zip: {
              type: 'string',
              description: 'ZIP code for AVS verification (up to 9 digits)',
            },
            customer_id: {
              type: 'string',
              description: 'Customer ID for vault lookup (up to 32 characters)',
            },
            customer_email: {
              type: 'string',
              description: 'Customer email for receipt',
            },
            email_receipt: {
              type: 'boolean',
              description: 'Send email receipt to customer_email when true (default false)',
            },
            tokenize: {
              type: 'boolean',
              description: 'Tokenize the card after authorization and return card_id (default false)',
            },
            amt_tax: {
              type: 'number',
              description: 'Tax amount included in amt_tran',
            },
            tran_currency: {
              type: 'number',
              description: 'ISO 4217 numeric currency code (default 840 = USD)',
            },
            moto_ecomm_ind: {
              type: 'string',
              description: 'MOTO/ecommerce indicator: 1=phone, 2=mail, 7=internet (default 7)',
            },
            payload_apple_pay: {
              type: 'string',
              description: 'Apple Pay payment token payload (base64 encoded)',
            },
            payload_google_pay: {
              type: 'string',
              description: 'Google Pay payment token payload',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting (up to 32 characters)',
            },
            profile_id: {
              type: 'string',
              description: 'Express Pay profile ID for fee configuration (20-digit string)',
            },
            line_items: {
              type: 'string',
              description: 'JSON array of line item objects for level 2/3 card data',
            },
            partial_auth: {
              type: 'boolean',
              description: 'Allow partial authorization when full amount is unavailable (default false)',
            },
          },
          required: ['amt_tran'],
        },
      },
      {
        name: 'capture_transaction',
        description: 'Capture a previously authorized transaction to settle funds — requires the pg_id from the original authorization',
        inputSchema: {
          type: 'object',
          properties: {
            pg_id_orig: {
              type: 'string',
              description: 'PG ID of the original authorization transaction to capture (32-character string)',
            },
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            amt_tran: {
              type: 'number',
              description: 'Amount to capture — can be less than or equal to the authorized amount',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting',
            },
            profile_id: {
              type: 'string',
              description: 'Express Pay profile ID',
            },
            vendor_id: {
              type: 'number',
              description: 'Vendor ID for split funding scenarios',
            },
          },
          required: ['pg_id_orig', 'amt_tran'],
        },
      },
      {
        name: 'sale_transaction',
        description: 'Authorize and capture in a single step (Sale = Auth + Capture) — immediately charges the card',
        inputSchema: {
          type: 'object',
          properties: {
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            amt_tran: {
              type: 'number',
              description: 'Transaction amount (e.g. 49.99)',
            },
            card_number: {
              type: 'string',
              description: 'Card number up to 19 digits',
            },
            exp_date: {
              type: 'string',
              description: 'Card expiration date in MMYY format (e.g. "1228")',
            },
            card_id: {
              type: 'string',
              description: 'Tokenized card ID — alternative to card_number',
            },
            cvv2: {
              type: 'string',
              description: 'Card CVV2/CVC code (up to 4 digits)',
            },
            cardholder_name: {
              type: 'string',
              description: 'Name on the card',
            },
            purchase_id: {
              type: 'string',
              description: 'Merchant purchase or order reference number',
            },
            merch_ref_num: {
              type: 'string',
              description: 'Merchant reference number for reconciliation',
            },
            avs_address: {
              type: 'string',
              description: 'Street address for AVS verification',
            },
            avs_zip: {
              type: 'string',
              description: 'ZIP code for AVS verification',
            },
            customer_id: {
              type: 'string',
              description: 'Customer ID for vault lookup',
            },
            customer_email: {
              type: 'string',
              description: 'Customer email for receipt',
            },
            email_receipt: {
              type: 'boolean',
              description: 'Send email receipt to customer_email (default false)',
            },
            tokenize: {
              type: 'boolean',
              description: 'Tokenize the card and return card_id (default false)',
            },
            amt_tax: {
              type: 'number',
              description: 'Tax amount included in amt_tran',
            },
            tran_currency: {
              type: 'number',
              description: 'ISO 4217 numeric currency code (default 840 = USD)',
            },
            payload_apple_pay: {
              type: 'string',
              description: 'Apple Pay payment token payload',
            },
            payload_google_pay: {
              type: 'string',
              description: 'Google Pay payment token payload',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting',
            },
            profile_id: {
              type: 'string',
              description: 'Express Pay profile ID',
            },
            line_items: {
              type: 'string',
              description: 'JSON array of line item objects for level 2/3 card data',
            },
          },
          required: ['amt_tran'],
        },
      },
      {
        name: 'credit_transaction',
        description: 'Issue a standalone credit (refund) directly to a cardholder — not tied to a prior transaction; use refund_transaction to refund a specific captured transaction',
        inputSchema: {
          type: 'object',
          properties: {
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            amt_tran: {
              type: 'number',
              description: 'Credit amount to issue to the cardholder',
            },
            card_number: {
              type: 'string',
              description: 'Card number to credit (up to 19 digits)',
            },
            exp_date: {
              type: 'string',
              description: 'Card expiration date in MMYY format',
            },
            card_id: {
              type: 'string',
              description: 'Tokenized card ID — alternative to card_number',
            },
            cardholder_name: {
              type: 'string',
              description: 'Name on the card',
            },
            purchase_id: {
              type: 'string',
              description: 'Merchant reference for this credit',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting',
            },
          },
          required: ['amt_tran'],
        },
      },
      {
        name: 'force_transaction',
        description: 'Force a transaction approval using a voice authorization code obtained outside the payment system (e.g. from the card issuer by phone)',
        inputSchema: {
          type: 'object',
          properties: {
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            amt_tran: {
              type: 'number',
              description: 'Transaction amount',
            },
            auth_code: {
              type: 'string',
              description: 'Voice authorization code from the card issuer (6-character string)',
            },
            card_number: {
              type: 'string',
              description: 'Card number up to 19 digits',
            },
            exp_date: {
              type: 'string',
              description: 'Card expiration date in MMYY format',
            },
            card_id: {
              type: 'string',
              description: 'Tokenized card ID — alternative to card_number',
            },
            cardholder_name: {
              type: 'string',
              description: 'Name on the card',
            },
            purchase_id: {
              type: 'string',
              description: 'Merchant reference number',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting',
            },
          },
          required: ['amt_tran', 'auth_code'],
        },
      },
      {
        name: 'refund_transaction',
        description: 'Refund a previously captured (settled) transaction — ties the refund to the original transaction by PG ID',
        inputSchema: {
          type: 'object',
          properties: {
            pg_id_orig: {
              type: 'string',
              description: 'PG ID of the original captured transaction to refund (32-character string)',
            },
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            amt_tran: {
              type: 'number',
              description: 'Amount to refund — can be partial (less than or equal to original)',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting',
            },
            vendor_id: {
              type: 'number',
              description: 'Vendor ID for split-funding refund scenarios',
            },
          },
          required: ['pg_id_orig', 'amt_tran'],
        },
      },
      {
        name: 'recharge_transaction',
        description: 'Recharge (re-bill) a customer using a previously settled transaction as reference — creates a new sale against the same card',
        inputSchema: {
          type: 'object',
          properties: {
            pg_id_orig: {
              type: 'string',
              description: 'PG ID of the original settled transaction to recharge (32-character string)',
            },
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            amt_tran: {
              type: 'number',
              description: 'Amount to charge in the new transaction',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting',
            },
            profile_id: {
              type: 'string',
              description: 'Express Pay profile ID',
            },
          },
          required: ['pg_id_orig', 'amt_tran'],
        },
      },
      {
        name: 'void_transaction',
        description: 'Void a previously authorized (but not yet settled) transaction — cancels the hold on the card without settlement',
        inputSchema: {
          type: 'object',
          properties: {
            pg_id_orig: {
              type: 'string',
              description: 'PG ID of the authorized transaction to void (32-character string)',
            },
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting',
            },
          },
          required: ['pg_id_orig'],
        },
      },
      {
        name: 'tokenize_card',
        description: 'Tokenize a card number and store it in the Qualpay vault — returns a card_id token for future transactions without storing raw card data',
        inputSchema: {
          type: 'object',
          properties: {
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            card_number: {
              type: 'string',
              description: 'Card number to tokenize (up to 19 digits)',
            },
            exp_date: {
              type: 'string',
              description: 'Card expiration date in MMYY format (e.g. "1228")',
            },
            cardholder_name: {
              type: 'string',
              description: 'Name on the card (up to 64 characters)',
            },
            cvv2: {
              type: 'string',
              description: 'Card CVV2/CVC code (up to 4 digits)',
            },
            customer_id: {
              type: 'string',
              description: 'Customer ID to associate with this card token',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting',
            },
          },
          required: ['card_number', 'exp_date'],
        },
      },
      {
        name: 'verify_card',
        description: 'Verify a card is valid and open without charging it — performs a $0 authorization to validate card number, expiry, and optionally AVS/CVV',
        inputSchema: {
          type: 'object',
          properties: {
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            card_number: {
              type: 'string',
              description: 'Card number to verify (up to 19 digits)',
            },
            exp_date: {
              type: 'string',
              description: 'Card expiration date in MMYY format',
            },
            card_id: {
              type: 'string',
              description: 'Tokenized card ID — alternative to card_number',
            },
            cvv2: {
              type: 'string',
              description: 'Card CVV2/CVC code for CVV verification',
            },
            avs_address: {
              type: 'string',
              description: 'Street address for AVS verification',
            },
            avs_zip: {
              type: 'string',
              description: 'ZIP code for AVS verification',
            },
            tokenize: {
              type: 'boolean',
              description: 'Tokenize the card if verification passes (default false)',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting',
            },
          },
          required: ['card_number', 'exp_date'],
        },
      },
      {
        name: 'expire_token',
        description: 'Expire (invalidate) a stored card token so it can no longer be used for transactions',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'Card token to expire (32-character string)',
            },
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting',
            },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'close_batch',
        description: 'Close the current open batch to trigger settlement of all captured transactions — initiates end-of-day settlement',
        inputSchema: {
          type: 'object',
          properties: {
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            tran_currency: {
              type: 'number',
              description: 'ISO 4217 numeric currency code for the batch (default 840 = USD)',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting',
            },
            profile_id: {
              type: 'string',
              description: 'Express Pay profile ID',
            },
          },
          required: [],
        },
      },
      {
        name: 'send_receipt_email',
        description: 'Send a transaction receipt email for a completed transaction — can send to one or more email addresses',
        inputSchema: {
          type: 'object',
          properties: {
            pg_id: {
              type: 'string',
              description: 'PG ID of the completed transaction to email receipt for (32-character string)',
            },
            merchant_id: {
              type: 'number',
              description: 'Qualpay merchant ID',
            },
            email_address: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of email addresses to send the receipt to',
            },
            logo_url: {
              type: 'string',
              description: 'URL of a logo image to include in the receipt email',
            },
            developer_id: {
              type: 'string',
              description: 'Developer or ISV ID for reporting',
            },
          },
          required: ['pg_id', 'email_address'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_card_type':
          return this.post('/ardef', { card_number: args.card_number, merchant_id: args.merchant_id ?? Number(this.merchantId) });
        case 'authorize_transaction':
          return this.post('/auth', this.buildTxBody(args));
        case 'capture_transaction':
          return this.postWithPathId('/capture', args.pg_id_orig as string, this.buildCaptureBody(args));
        case 'sale_transaction':
          return this.post('/sale', this.buildTxBody(args));
        case 'credit_transaction':
          return this.post('/credit', this.buildTxBody(args));
        case 'force_transaction':
          return this.post('/force', this.buildTxBody(args));
        case 'refund_transaction':
          return this.postWithPathId('/refund', args.pg_id_orig as string, this.buildSimpleBody(args));
        case 'recharge_transaction':
          return this.postWithPathId('/recharge', args.pg_id_orig as string, this.buildSimpleBody(args));
        case 'void_transaction':
          return this.postWithPathId('/void', args.pg_id_orig as string, this.buildSimpleBody(args));
        case 'tokenize_card':
          return this.post('/tokenize', this.buildTxBody(args));
        case 'verify_card':
          return this.post('/verify', this.buildTxBody(args));
        case 'expire_token':
          return this.post('/expireToken', this.buildExpireBody(args));
        case 'close_batch':
          return this.post('/batchClose', this.buildBatchBody(args));
        case 'send_receipt_email':
          return this.postWithPathId('/emailReceipt', args.pg_id as string, this.buildEmailBody(args));
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

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.merchantId}:${this.securityKey}`).toString('base64');
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Qualpay returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async postWithPathId(path: string, id: string, body: Record<string, unknown>): Promise<ToolResult> {
    if (!id) return { content: [{ type: 'text', text: `${path} requires a transaction ID` }], isError: true };
    return this.post(`${path}/${encodeURIComponent(id)}`, body);
  }

  private buildTxBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = { merchant_id: Number(this.merchantId) };
    const fields = [
      'amt_tran', 'amt_tax', 'amt_convenience_fee', 'amt_tran_fee', 'amt_fbo',
      'card_number', 'exp_date', 'card_id', 'cvv2', 'cardholder_name',
      'avs_address', 'avs_zip', 'purchase_id', 'merch_ref_num',
      'customer_id', 'customer_email', 'email_receipt', 'tokenize',
      'tran_currency', 'moto_ecomm_ind', 'partial_auth',
      'payload_apple_pay', 'payload_google_pay',
      'auth_code', 'developer_id', 'profile_id', 'vendor_id',
      'line_items', 'loc_id', 'dba_name', 'type_id', 'client_ip',
      'duplicate_seconds', 'echo_fields', 'report_data',
      'retry_attempt', 'retry_id', 'fbo_id', 'subscription_id',
      'cavv_3ds', 'xid_3ds', 'mc_ucaf_data', 'mc_ucaf_ind',
      'emv_tran_id', 'tr_number', 'dda_number', 'card_swipe',
      'customer_code', 'email_address',
    ];
    for (const f of fields) {
      if (args[f] !== undefined) body[f] = args[f];
    }
    if (args.merchant_id !== undefined) body.merchant_id = args.merchant_id;
    return body;
  }

  private buildCaptureBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = { merchant_id: Number(this.merchantId), amt_tran: args.amt_tran };
    if (args.merchant_id !== undefined) body.merchant_id = args.merchant_id;
    if (args.developer_id !== undefined) body.developer_id = args.developer_id;
    if (args.profile_id !== undefined) body.profile_id = args.profile_id;
    if (args.vendor_id !== undefined) body.vendor_id = args.vendor_id;
    if (args.loc_id !== undefined) body.loc_id = args.loc_id;
    if (args.echo_fields !== undefined) body.echo_fields = args.echo_fields;
    if (args.report_data !== undefined) body.report_data = args.report_data;
    if (args.retry_attempt !== undefined) body.retry_attempt = args.retry_attempt;
    if (args.retry_id !== undefined) body.retry_id = args.retry_id;
    return body;
  }

  private buildSimpleBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = { merchant_id: Number(this.merchantId) };
    if (args.merchant_id !== undefined) body.merchant_id = args.merchant_id;
    if (args.amt_tran !== undefined) body.amt_tran = args.amt_tran;
    if (args.developer_id !== undefined) body.developer_id = args.developer_id;
    if (args.profile_id !== undefined) body.profile_id = args.profile_id;
    if (args.vendor_id !== undefined) body.vendor_id = args.vendor_id;
    if (args.loc_id !== undefined) body.loc_id = args.loc_id;
    if (args.echo_fields !== undefined) body.echo_fields = args.echo_fields;
    if (args.report_data !== undefined) body.report_data = args.report_data;
    if (args.retry_attempt !== undefined) body.retry_attempt = args.retry_attempt;
    if (args.retry_id !== undefined) body.retry_id = args.retry_id;
    return body;
  }

  private buildExpireBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = { merchant_id: Number(this.merchantId), card_id: args.card_id };
    if (args.merchant_id !== undefined) body.merchant_id = args.merchant_id;
    if (args.developer_id !== undefined) body.developer_id = args.developer_id;
    if (args.vendor_id !== undefined) body.vendor_id = args.vendor_id;
    if (args.loc_id !== undefined) body.loc_id = args.loc_id;
    if (args.profile_id !== undefined) body.profile_id = args.profile_id;
    if (args.echo_fields !== undefined) body.echo_fields = args.echo_fields;
    if (args.report_data !== undefined) body.report_data = args.report_data;
    if (args.retry_attempt !== undefined) body.retry_attempt = args.retry_attempt;
    if (args.retry_id !== undefined) body.retry_id = args.retry_id;
    return body;
  }

  private buildBatchBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = { merchant_id: Number(this.merchantId) };
    if (args.merchant_id !== undefined) body.merchant_id = args.merchant_id;
    if (args.tran_currency !== undefined) body.tran_currency = args.tran_currency;
    if (args.developer_id !== undefined) body.developer_id = args.developer_id;
    if (args.profile_id !== undefined) body.profile_id = args.profile_id;
    if (args.loc_id !== undefined) body.loc_id = args.loc_id;
    if (args.echo_fields !== undefined) body.echo_fields = args.echo_fields;
    if (args.report_data !== undefined) body.report_data = args.report_data;
    if (args.retry_attempt !== undefined) body.retry_attempt = args.retry_attempt;
    if (args.retry_id !== undefined) body.retry_id = args.retry_id;
    return body;
  }

  private buildEmailBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      merchant_id: Number(this.merchantId),
      email_address: args.email_address,
    };
    if (args.merchant_id !== undefined) body.merchant_id = args.merchant_id;
    if (args.logo_url !== undefined) body.logo_url = args.logo_url;
    if (args.developer_id !== undefined) body.developer_id = args.developer_id;
    if (args.vendor_id !== undefined) body.vendor_id = args.vendor_id;
    return body;
  }
}
