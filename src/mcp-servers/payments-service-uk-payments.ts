/**
 * GOV.UK Pay (Payments Service UK) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official API: https://publicapi.payments.service.gov.uk
// Auth: API key in Authorization header (Bearer token).
//   Obtain API key from the GOV.UK Pay console: https://selfservice.payments.service.gov.uk
// Docs: https://docs.payments.service.gov.uk
// Rate limits: Not publicly specified; standard REST limits apply.
// Note: Spec sourced from https://raw.githubusercontent.com/alphagov/pay-publicapi/master/swagger/swagger.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface UKPaymentsConfig {
  /** API key from GOV.UK Pay console — sent as Bearer token in Authorization header */
  apiKey: string;
  /** Base URL. Defaults to https://publicapi.payments.service.gov.uk */
  baseUrl?: string;
}

export class PaymentsServiceUKPaymentsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: UKPaymentsConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://publicapi.payments.service.gov.uk';
  }

  static catalog() {
    return {
      name: 'payments-service-uk-payments',
      displayName: 'GOV.UK Pay',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['govuk pay', 'uk payments', 'gov.uk', 'government payments', 'hmrc', 'public sector payments'],
      toolNames: [
        'search_payments',
        'create_payment',
        'get_payment',
        'cancel_payment',
        'capture_payment',
        'get_payment_events',
        'get_payment_refunds',
        'create_refund',
        'get_refund',
        'search_refunds',
      ],
      description: 'GOV.UK Pay adapter — create and manage payments via the UK Government Payment Service, including search, capture, cancel, and refunds.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_payments',
        description: 'Search and list payments with optional filters. Returns paginated results.',
        inputSchema: {
          type: 'object',
          properties: {
            reference: {
              type: 'string',
              description: 'Filter by your payment reference.',
            },
            email: {
              type: 'string',
              description: 'Filter by payer email address.',
            },
            state: {
              type: 'string',
              description: 'Filter by payment state: created, started, submitted, capturable, success, failed, cancelled, error.',
            },
            card_brand: {
              type: 'string',
              description: 'Filter by card brand: visa, master-card, american-express, diners-club, discover, jcb, unionpay, maestro.',
            },
            from_date: {
              type: 'string',
              description: 'ISO 8601 start datetime for payment creation date filter (e.g. 2026-01-01T00:00:00Z).',
            },
            to_date: {
              type: 'string',
              description: 'ISO 8601 end datetime for payment creation date filter.',
            },
            page: {
              type: 'string',
              description: 'Page number for pagination (default: 1).',
            },
            display_size: {
              type: 'string',
              description: 'Number of results per page (default: 500, max: 500).',
            },
            cardholder_name: {
              type: 'string',
              description: 'Filter by cardholder name.',
            },
            first_digits_card_number: {
              type: 'string',
              description: 'Filter by first 6 digits of the card number.',
            },
            last_digits_card_number: {
              type: 'string',
              description: 'Filter by last 4 digits of the card number.',
            },
            from_settled_date: {
              type: 'string',
              description: 'ISO 8601 start date for settled date filter (e.g. 2026-01-01).',
            },
            to_settled_date: {
              type: 'string',
              description: 'ISO 8601 end date for settled date filter.',
            },
          },
        },
      },
      {
        name: 'create_payment',
        description: 'Create a new payment. Returns a payment ID and a _links.next_url for redirecting the user to the payment page.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Amount to pay in pence (e.g. 1450 = £14.50). Must be a positive integer.',
            },
            reference: {
              type: 'string',
              description: 'Your unique reference for this payment (up to 255 chars).',
            },
            description: {
              type: 'string',
              description: 'Description of the payment shown to the user on the payment page.',
            },
            return_url: {
              type: 'string',
              description: 'HTTPS URL the user is redirected to after completing or cancelling payment.',
            },
            language: {
              type: 'string',
              description: 'Language for the payment page: en (English) or cy (Welsh).',
            },
            email: {
              type: 'string',
              description: "Pre-fill the user's email address on the payment page.",
            },
            delayed_capture: {
              type: 'boolean',
              description: 'Set to true to delay capture until you explicitly call capture_payment. Defaults to false.',
            },
            moto: {
              type: 'boolean',
              description: 'Set to true for Mail Order / Telephone Order (MOTO) payments. Requires MOTO permission.',
            },
            metadata: {
              type: 'object',
              description: 'Key-value metadata (up to 10 keys, each key/value max 30/100 chars). Not shown to users.',
            },
            prefilled_cardholder_details: {
              type: 'object',
              description: 'Pre-fill cardholder details: { cardholder_name: string, billing_address: { line1, line2, postcode, city, country } }.',
            },
          },
          required: ['amount', 'reference', 'description', 'return_url'],
        },
      },
      {
        name: 'get_payment',
        description: 'Retrieve the current details and state of a payment by its payment ID.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentId: {
              type: 'string',
              description: 'GOV.UK Pay payment ID (returned when the payment was created).',
            },
          },
          required: ['paymentId'],
        },
      },
      {
        name: 'cancel_payment',
        description: 'Cancel a payment that has not yet been completed. Only payments in states: created, started, submitted, capturable can be cancelled.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentId: {
              type: 'string',
              description: 'GOV.UK Pay payment ID to cancel.',
            },
          },
          required: ['paymentId'],
        },
      },
      {
        name: 'capture_payment',
        description: 'Capture a payment that was created with delayed_capture=true. Payment must be in "capturable" state.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentId: {
              type: 'string',
              description: 'GOV.UK Pay payment ID to capture.',
            },
          },
          required: ['paymentId'],
        },
      },
      {
        name: 'get_payment_events',
        description: 'Retrieve the event history for a payment, showing all state transitions.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentId: {
              type: 'string',
              description: 'GOV.UK Pay payment ID.',
            },
          },
          required: ['paymentId'],
        },
      },
      {
        name: 'get_payment_refunds',
        description: 'Get all refunds associated with a specific payment.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentId: {
              type: 'string',
              description: 'GOV.UK Pay payment ID.',
            },
          },
          required: ['paymentId'],
        },
      },
      {
        name: 'create_refund',
        description: 'Submit a full or partial refund for a successful payment.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentId: {
              type: 'string',
              description: 'GOV.UK Pay payment ID to refund.',
            },
            amount: {
              type: 'number',
              description: 'Amount to refund in pence. Must not exceed the remaining refundable amount.',
            },
            refund_amount_available: {
              type: 'number',
              description: 'The amount you expect to be available for refund (pence). Used to prevent refund race conditions.',
            },
          },
          required: ['paymentId', 'amount'],
        },
      },
      {
        name: 'get_refund',
        description: 'Retrieve the details of a specific refund by payment ID and refund ID.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentId: {
              type: 'string',
              description: 'GOV.UK Pay payment ID.',
            },
            refundId: {
              type: 'string',
              description: 'Refund ID returned when the refund was created.',
            },
          },
          required: ['paymentId', 'refundId'],
        },
      },
      {
        name: 'search_refunds',
        description: 'Search all refunds across payments with optional date filters.',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'ISO 8601 start datetime for refund creation date filter.',
            },
            to_date: {
              type: 'string',
              description: 'ISO 8601 end datetime for refund creation date filter.',
            },
            from_settled_date: {
              type: 'string',
              description: 'ISO 8601 start date for settled date filter.',
            },
            to_settled_date: {
              type: 'string',
              description: 'ISO 8601 end date for settled date filter.',
            },
            page: {
              type: 'string',
              description: 'Page number for pagination.',
            },
            display_size: {
              type: 'string',
              description: 'Number of results per page.',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_payments':
          return await this.get('/v1/payments', args);
        case 'create_payment':
          return await this.post('/v1/payments', {
            amount: args.amount,
            reference: args.reference,
            description: args.description,
            return_url: args.return_url,
            ...(args.language !== undefined && { language: args.language }),
            ...(args.email !== undefined && { email: args.email }),
            ...(args.delayed_capture !== undefined && { delayed_capture: args.delayed_capture }),
            ...(args.moto !== undefined && { moto: args.moto }),
            ...(args.metadata !== undefined && { metadata: args.metadata }),
            ...(args.prefilled_cardholder_details !== undefined && { prefilled_cardholder_details: args.prefilled_cardholder_details }),
          });
        case 'get_payment':
          return await this.get(`/v1/payments/${enc(args.paymentId)}`);
        case 'cancel_payment':
          return await this.post(`/v1/payments/${enc(args.paymentId)}/cancel`);
        case 'capture_payment':
          return await this.post(`/v1/payments/${enc(args.paymentId)}/capture`);
        case 'get_payment_events':
          return await this.get(`/v1/payments/${enc(args.paymentId)}/events`);
        case 'get_payment_refunds':
          return await this.get(`/v1/payments/${enc(args.paymentId)}/refunds`);
        case 'create_refund': {
          const refundBody: Record<string, unknown> = { amount: args.amount };
          if (args.refund_amount_available !== undefined) {
            refundBody['refund_amount_available'] = args.refund_amount_available;
          }
          return await this.post(`/v1/payments/${enc(args.paymentId)}/refunds`, refundBody);
        }
        case 'get_refund':
          return await this.get(`/v1/payments/${enc(args.paymentId)}/refunds/${enc(args.refundId)}`);
        case 'search_refunds':
          return await this.get('/v1/refunds', args);
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async get(path: string, queryParams?: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(queryParams)) {
        if (v !== undefined && v !== null && v !== '') {
          q.set(k, String(v));
        }
      }
      const qs = q.toString();
      if (qs) url += `?${qs}`;
    }
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders });
    return this.handleResponse(response);
  }

  private async post(path: string, body?: unknown): Promise<ToolResult> {
    const init: RequestInit = {
      method: 'POST',
      headers: this.authHeaders,
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, init);
    return this.handleResponse(response);
  }

  private async handleResponse(response: Response): Promise<ToolResult> {
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `GOV.UK Pay API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`GOV.UK Pay returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

function enc(value: unknown): string {
  return encodeURIComponent(String(value ?? ''));
}
