/**
 * FraudLabs Pro Fraud Detection MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.fraudlabspro.com
// Auth: API key passed as query param ?key=<apiKey>
// Docs: https://www.fraudlabspro.com/developer/api/screen-order
// Endpoints: Screen Order (fraud detection), Order Feedback

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FraudLabsProConfig {
  apiKey: string;
  baseUrl?: string; // default: https://api.fraudlabspro.com
}

export class FraudlabsproFraudDetectionMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: FraudLabsProConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.fraudlabspro.com';
  }

  static catalog() {
    return {
      name: 'fraudlabspro-fraud-detection',
      displayName: 'FraudLabs Pro Fraud Detection',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'fraudlabspro', 'fraud detection', 'payment fraud', 'chargeback', 'order screening',
        'cybersecurity', 'risk scoring', 'ip intelligence', 'credit card fraud', 'ecommerce security',
        'fraud prevention', 'transaction screening', 'blacklist', 'bin lookup', 'avs', 'cvv',
        'email validation', 'device fingerprint', 'proxy detection', 'order feedback',
      ],
      toolNames: [
        'screen_order',
        'submit_order_feedback',
      ],
      description: 'FraudLabs Pro: screen e-commerce orders for payment fraud risk using IP intelligence, billing/shipping validation, email reputation, and card BIN data. Submit feedback to improve detection accuracy.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'screen_order',
        description: 'Screen an e-commerce order for payment fraud. Analyzes IP address, billing/shipping address mismatch, email reputation, card BIN, AVS/CVV results, and device signals. Returns a fraud risk score and recommendation (APPROVE, REVIEW, REJECT).',
        inputSchema: {
          type: 'object',
          properties: {
            ip: {
              type: 'string',
              description: 'Customer IP address (IPv4 or IPv6) — primary fraud signal (e.g. "1.2.3.4")',
            },
            first_name: {
              type: 'string',
              description: 'Customer first name on the billing order',
            },
            last_name: {
              type: 'string',
              description: 'Customer last name on the billing order',
            },
            bill_addr: {
              type: 'string',
              description: 'Billing street address',
            },
            bill_city: {
              type: 'string',
              description: 'Billing city',
            },
            bill_state: {
              type: 'string',
              description: 'Billing state or province',
            },
            bill_country: {
              type: 'string',
              description: 'Billing country (ISO 3166-1 alpha-2 code, e.g. US, GB, CA)',
            },
            bill_zip_code: {
              type: 'string',
              description: 'Billing postal/ZIP code',
            },
            ship_addr: {
              type: 'string',
              description: 'Shipping street address',
            },
            ship_city: {
              type: 'string',
              description: 'Shipping city',
            },
            ship_state: {
              type: 'string',
              description: 'Shipping state or province',
            },
            ship_country: {
              type: 'string',
              description: 'Shipping country (ISO 3166-1 alpha-2 code)',
            },
            ship_zip_code: {
              type: 'string',
              description: 'Shipping postal/ZIP code',
            },
            email: {
              type: 'string',
              description: 'Customer email address (plain text — will be hashed before transmission)',
            },
            email_domain: {
              type: 'string',
              description: 'Email domain only (e.g. gmail.com) — alternative to full email',
            },
            email_hash: {
              type: 'string',
              description: 'SHA-256 hash of the lowercase customer email (use instead of plain email for privacy)',
            },
            user_phone: {
              type: 'string',
              description: 'Customer phone number',
            },
            username_hash: {
              type: 'string',
              description: 'SHA-256 hash of the customer username',
            },
            password_hash: {
              type: 'string',
              description: 'SHA-256 hash of the customer password',
            },
            bin_no: {
              type: 'string',
              description: 'First 6 digits of the payment card number (Bank Identification Number)',
            },
            card_hash: {
              type: 'string',
              description: 'SHA-256 hash of the full payment card number',
            },
            avs_result: {
              type: 'string',
              description: 'AVS (Address Verification System) response code from payment processor (e.g. Y, N, A, Z)',
            },
            cvv_result: {
              type: 'string',
              description: 'CVV verification result from payment processor: M (match), N (no match), P (not processed)',
            },
            user_order_id: {
              type: 'string',
              description: 'Your internal order ID for reference',
            },
            user_order_memo: {
              type: 'string',
              description: 'Order notes or memo for your records',
            },
            amount: {
              type: 'number',
              description: 'Order total amount (e.g. 49.99)',
            },
            quantity: {
              type: 'number',
              description: 'Total number of items in the order',
            },
            currency: {
              type: 'string',
              description: 'Order currency (ISO 4217 code, e.g. USD, EUR, GBP)',
            },
            department: {
              type: 'string',
              description: 'Product department or category for the order',
            },
            payment_mode: {
              type: 'string',
              description: 'Payment method: creditcard, paypal, cod (cash on delivery), moneyorder, bitcoin, etc.',
            },
            flp_checksum: {
              type: 'string',
              description: 'FraudLabs Pro device checksum from the JavaScript library (device fingerprint)',
            },
          },
          required: ['ip'],
        },
      },
      {
        name: 'submit_order_feedback',
        description: 'Submit feedback on a previously screened order. Marks an order as APPROVE, REJECT, or REJECT_BLACKLIST to improve the fraud detection model and optionally blacklist the customer.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The FraudLabs Pro transaction ID returned from a previous screen_order call',
            },
            action: {
              type: 'string',
              description: 'Feedback action: APPROVE (legitimate order), REJECT (fraudulent — do not blacklist), REJECT_BLACKLIST (fraudulent — add to blacklist)',
            },
            notes: {
              type: 'string',
              description: 'Optional notes about the order outcome for your records',
            },
          },
          required: ['id', 'action'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'screen_order':           return this.screenOrder(args);
        case 'submit_order_feedback':  return this.submitOrderFeedback(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────────


  private async postForm(path: string, params: Record<string, string>): Promise<ToolResult> {
    const qs = new URLSearchParams({ ...params, key: this.apiKey, format: 'json' });
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs.toString()}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ─────────────────────────────────────────────────────

  private async screenOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ip) {
      return { content: [{ type: 'text', text: 'ip is required' }], isError: true };
    }
    const params: Record<string, string> = {
      ip: String(args.ip),
    };
    const optionalStrings = [
      'first_name', 'last_name', 'bill_addr', 'bill_city', 'bill_state',
      'bill_country', 'bill_zip_code', 'ship_addr', 'ship_city', 'ship_state',
      'ship_country', 'ship_zip_code', 'email', 'email_domain', 'email_hash',
      'user_phone', 'username_hash', 'password_hash', 'bin_no', 'card_hash',
      'avs_result', 'cvv_result', 'user_order_id', 'user_order_memo',
      'currency', 'department', 'payment_mode', 'flp_checksum',
    ];
    for (const key of optionalStrings) {
      if (args[key] !== undefined && args[key] !== null && args[key] !== '') {
        params[key] = String(args[key]);
      }
    }
    if (args.amount !== undefined)   params.amount   = String(args.amount);
    if (args.quantity !== undefined) params.quantity = String(args.quantity);
    return this.postForm('/v1/order/screen', params);
  }

  private async submitOrderFeedback(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.action) {
      return { content: [{ type: 'text', text: 'id and action are required' }], isError: true };
    }
    const validActions = ['APPROVE', 'REJECT', 'REJECT_BLACKLIST'];
    if (!validActions.includes(String(args.action))) {
      return {
        content: [{ type: 'text', text: `action must be one of: ${validActions.join(', ')}` }],
        isError: true,
      };
    }
    const params: Record<string, string> = {
      id:     String(args.id),
      action: String(args.action),
    };
    if (args.notes) params.notes = String(args.notes);
    return this.postForm('/v1/order/feedback', params);
  }
}
