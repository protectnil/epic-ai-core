/**
 * Plaid MCP Server
 * Adapter for the Plaid API — accounts, transactions, balances, and identity
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface PlaidConfig {
  client_id: string;
  secret: string;
  access_token: string;
}

export class PlaidMCPServer {
  private config: PlaidConfig;
  private baseUrl = 'https://production.plaid.com';

  constructor(config: PlaidConfig) {
    this.config = config;
  }

  private get authHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  private authBody(extra: Record<string, unknown> = {}): string {
    return JSON.stringify({
      client_id: this.config.client_id,
      secret: this.config.secret,
      access_token: this.config.access_token,
      ...extra,
    });
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_accounts',
        description: 'Retrieve all accounts associated with the Plaid access token.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_transactions',
        description: 'Retrieve transactions for a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string', description: 'Start of the date range in YYYY-MM-DD format.' },
            end_date: { type: 'string', description: 'End of the date range in YYYY-MM-DD format.' },
            count: { type: 'number', description: 'Number of transactions to fetch (max 500).' },
            offset: { type: 'number', description: 'Offset for pagination.' },
            account_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of account IDs to filter transactions.',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_balance',
        description: 'Retrieve real-time balance for each account.',
        inputSchema: {
          type: 'object',
          properties: {
            account_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of account IDs to retrieve balances for.',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_identity',
        description: 'Retrieve identity data (name, address, email) for account holders.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_institution',
        description: 'Retrieve details about a financial institution by Plaid institution ID.',
        inputSchema: {
          type: 'object',
          properties: {
            institution_id: { type: 'string', description: 'The Plaid institution ID (e.g. ins_3).' },
            country_codes: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of country codes (e.g. ["US"]) required by the API.',
            },
          },
          required: ['institution_id', 'country_codes'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_accounts': {
          const response = await fetch(`${this.baseUrl}/accounts/get`, {
            method: 'POST',
            headers: this.authHeaders,
            body: this.authBody(),
          });
          const data = await response.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_transactions': {
          const extra: Record<string, unknown> = {
            start_date: args.start_date,
            end_date: args.end_date,
          };
          const options: Record<string, unknown> = {};
          if (args.count) options['count'] = args.count;
          if (args.offset) options['offset'] = args.offset;
          if (args.account_ids) options['account_ids'] = args.account_ids;
          if (Object.keys(options).length) extra['options'] = options;
          const response = await fetch(`${this.baseUrl}/transactions/get`, {
            method: 'POST',
            headers: this.authHeaders,
            body: this.authBody(extra),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_balance': {
          const extra: Record<string, unknown> = {};
          if (args.account_ids) extra['options'] = { account_ids: args.account_ids };
          const response = await fetch(`${this.baseUrl}/accounts/balance/get`, {
            method: 'POST',
            headers: this.authHeaders,
            body: this.authBody(extra),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_identity': {
          const response = await fetch(`${this.baseUrl}/identity/get`, {
            method: 'POST',
            headers: this.authHeaders,
            body: this.authBody(),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_institution': {
          const body = JSON.stringify({
            client_id: this.config.client_id,
            secret: this.config.secret,
            institution_id: args.institution_id,
            country_codes: args.country_codes,
          });
          const response = await fetch(`${this.baseUrl}/institutions/get_by_id`, {
            method: 'POST',
            headers: this.authHeaders,
            body,
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
