/**
 * PayPal MCP Server
 * Adapter for the PayPal API v2 — orders, transactions, and disputes
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface PayPalConfig {
  access_token: string;
}

export class PayPalMCPServer {
  private config: PayPalConfig;
  private baseUrl = 'https://api-m.paypal.com';

  constructor(config: PayPalConfig) {
    this.config = config;
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_order',
        description: 'Create a new PayPal order.',
        inputSchema: {
          type: 'object',
          properties: {
            intent: {
              type: 'string',
              enum: ['CAPTURE', 'AUTHORIZE'],
              description: 'The intent of the order.',
            },
            currency_code: { type: 'string', description: 'Three-letter ISO-4217 currency code.' },
            amount_value: { type: 'string', description: 'The total order amount as a string (e.g. "10.00").' },
            description: { type: 'string', description: 'Optional description for the purchase unit.' },
          },
          required: ['intent', 'currency_code', 'amount_value'],
        },
      },
      {
        name: 'get_order',
        description: 'Retrieve details for a PayPal order by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'string', description: 'The PayPal order ID.' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List PayPal transactions for a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string', description: 'Start of the date range in ISO 8601 format.' },
            end_date: { type: 'string', description: 'End of the date range in ISO 8601 format.' },
            page_size: { type: 'number', description: 'Number of transactions per page (max 500).' },
            page: { type: 'number', description: 'Page number for pagination.' },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_dispute',
        description: 'Retrieve details for a PayPal dispute by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dispute_id: { type: 'string', description: 'The PayPal dispute ID.' },
          },
          required: ['dispute_id'],
        },
      },
      {
        name: 'list_disputes',
        description: 'List PayPal disputes with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: { type: 'string', description: 'Filter disputes opened after this ISO 8601 timestamp.' },
            disputed_transaction_id: { type: 'string', description: 'Filter by a specific transaction ID.' },
            page_size: { type: 'number', description: 'Number of disputes per page (max 50).' },
            next_page_token: { type: 'string', description: 'Token for fetching the next page of results.' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_order': {
          const body = {
            intent: args.intent,
            purchase_units: [
              {
                amount: {
                  currency_code: args.currency_code,
                  value: args.amount_value,
                },
                ...(args.description ? { description: args.description } : {}),
              },
            ],
          };
          const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: this.authHeaders,
            body: JSON.stringify(body),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_order': {
          const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${args.order_id}`, {
            headers: this.authHeaders,
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_transactions': {
          const params = new URLSearchParams();
          params.set('start_date', args.start_date as string);
          params.set('end_date', args.end_date as string);
          if (args.page_size) params.set('page_size', String(args.page_size));
          if (args.page) params.set('page', String(args.page));
          const response = await fetch(`${this.baseUrl}/v1/reporting/transactions?${params}`, {
            headers: this.authHeaders,
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_dispute': {
          const response = await fetch(`${this.baseUrl}/v1/customer/disputes/${args.dispute_id}`, {
            headers: this.authHeaders,
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_disputes': {
          const params = new URLSearchParams();
          if (args.start_time) params.set('start_time', args.start_time as string);
          if (args.disputed_transaction_id) params.set('disputed_transaction_id', args.disputed_transaction_id as string);
          if (args.page_size) params.set('page_size', String(args.page_size));
          if (args.next_page_token) params.set('next_page_token', args.next_page_token as string);
          const response = await fetch(`${this.baseUrl}/v1/customer/disputes?${params}`, {
            headers: this.authHeaders,
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
}
