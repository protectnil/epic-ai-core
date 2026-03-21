/**
 * QuickBooks MCP Server
 * Adapter for the QuickBooks Online API v3 — invoices, customers, and financial data
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface QuickBooksConfig {
  access_token: string;
  realm_id: string;
}

export class QuickBooksMCPServer {
  private config: QuickBooksConfig;

  constructor(config: QuickBooksConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return `https://quickbooks.api.intuit.com/v3/company/${this.config.realm_id}`;
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.access_token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query',
        description: 'Execute a QuickBooks Online SQL-like query against any entity.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'QuickBooks SQL query string (e.g. SELECT * FROM Invoice WHERE TotalAmt > 100).' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a single QuickBooks invoice by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: { type: 'string', description: 'The QuickBooks invoice ID.' },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new invoice in QuickBooks Online.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_ref_id: { type: 'string', description: 'QuickBooks customer ID for the CustomerRef.' },
            line_items: {
              type: 'array',
              description: 'Array of line item objects with Amount, DetailType, and SalesItemLineDetail.',
              items: { type: 'object' },
            },
            due_date: { type: 'string', description: 'Invoice due date in YYYY-MM-DD format.' },
            private_note: { type: 'string', description: 'Private memo visible only in QuickBooks.' },
          },
          required: ['customer_ref_id', 'line_items'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customers in QuickBooks Online.',
        inputSchema: {
          type: 'object',
          properties: {
            max_results: { type: 'number', description: 'Maximum number of customers to return.' },
            start_position: { type: 'number', description: 'Starting position for pagination (1-based).' },
          },
          required: [],
        },
      },
      {
        name: 'get_company_info',
        description: 'Retrieve company information for the connected QuickBooks Online account.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query': {
          const params = new URLSearchParams({ query: args.query as string });
          const response = await fetch(`${this.baseUrl}/query?${params}`, { headers: this.authHeaders });
          const data = await response.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_invoice': {
          const response = await fetch(`${this.baseUrl}/invoice/${args.invoice_id}`, {
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

        case 'create_invoice': {
          const body = {
            CustomerRef: { value: args.customer_ref_id },
            Line: args.line_items,
            ...(args.due_date ? { DueDate: args.due_date } : {}),
            ...(args.private_note ? { PrivateNote: args.private_note } : {}),
          };
          const response = await fetch(`${this.baseUrl}/invoice`, {
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

        case 'list_customers': {
          const maxResults = (args.max_results as number) ?? 100;
          const startPosition = (args.start_position as number) ?? 1;
          const query = `SELECT * FROM Customer STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;
          const params = new URLSearchParams({ query });
          const response = await fetch(`${this.baseUrl}/query?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_company_info': {
          const params = new URLSearchParams({ query: `SELECT * FROM CompanyInfo WHERE Id = '${this.config.realm_id}'` });
          const response = await fetch(`${this.baseUrl}/query?${params}`, { headers: this.authHeaders });
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
