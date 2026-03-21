/**
 * Stripe MCP Server
 * Adapter for the Stripe API — payments, customers, and subscriptions
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface StripeConfig {
  secret_key: string;
}

export class StripeMCPServer {
  private config: StripeConfig;
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(config: StripeConfig) {
    this.config = config;
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.secret_key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_customers',
        description: 'List customers in Stripe with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of customers to return (max 100).' },
            email: { type: 'string', description: 'Filter customers by email address.' },
            starting_after: { type: 'string', description: 'Cursor for pagination — customer ID to start after.' },
          },
          required: [],
        },
      },
      {
        name: 'get_customer',
        description: 'Retrieve a single Stripe customer by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'string', description: 'The Stripe customer ID (cus_...).' },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'list_payments',
        description: 'List payment intents in Stripe.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of payment intents to return (max 100).' },
            customer: { type: 'string', description: 'Filter by Stripe customer ID.' },
            starting_after: { type: 'string', description: 'Cursor for pagination — payment intent ID to start after.' },
          },
          required: [],
        },
      },
      {
        name: 'create_payment_intent',
        description: 'Create a new Stripe payment intent.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Amount in the smallest currency unit (e.g. cents for USD).' },
            currency: { type: 'string', description: 'Three-letter ISO currency code (e.g. usd).' },
            customer: { type: 'string', description: 'Stripe customer ID to associate with this payment intent.' },
            description: { type: 'string', description: 'An arbitrary string describing the payment intent.' },
            metadata: { type: 'object', description: 'Set of key-value pairs for metadata.' },
          },
          required: ['amount', 'currency'],
        },
      },
      {
        name: 'list_subscriptions',
        description: 'List subscriptions in Stripe.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of subscriptions to return (max 100).' },
            customer: { type: 'string', description: 'Filter by Stripe customer ID.' },
            status: {
              type: 'string',
              enum: ['active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'trialing', 'all'],
              description: 'Filter subscriptions by status.',
            },
            starting_after: { type: 'string', description: 'Cursor for pagination — subscription ID to start after.' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_customers': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.email) params.set('email', args.email as string);
          if (args.starting_after) params.set('starting_after', args.starting_after as string);
          const response = await fetch(`${this.baseUrl}/customers?${params}`, { headers: this.authHeaders });
          const data = await response.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_customer': {
          const response = await fetch(`${this.baseUrl}/customers/${args.customer_id}`, {
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

        case 'list_payments': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.customer) params.set('customer', args.customer as string);
          if (args.starting_after) params.set('starting_after', args.starting_after as string);
          const response = await fetch(`${this.baseUrl}/payment_intents?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_payment_intent': {
          const params = new URLSearchParams();
          params.set('amount', String(args.amount));
          params.set('currency', args.currency as string);
          if (args.customer) params.set('customer', args.customer as string);
          if (args.description) params.set('description', args.description as string);
          if (args.metadata && typeof args.metadata === 'object') {
            for (const [k, v] of Object.entries(args.metadata as Record<string, string>)) {
              params.set(`metadata[${k}]`, v);
            }
          }
          const response = await fetch(`${this.baseUrl}/payment_intents`, {
            method: 'POST',
            headers: this.authHeaders,
            body: params,
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_subscriptions': {
          const params = new URLSearchParams();
          if (args.limit) params.set('limit', String(args.limit));
          if (args.customer) params.set('customer', args.customer as string);
          if (args.status) params.set('status', args.status as string);
          if (args.starting_after) params.set('starting_after', args.starting_after as string);
          const response = await fetch(`${this.baseUrl}/subscriptions?${params}`, { headers: this.authHeaders });
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
