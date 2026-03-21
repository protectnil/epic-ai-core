/**
 * Xero MCP Server
 * Adapter for the Xero API v2 — invoices, contacts, and accounts
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface XeroConfig {
  access_token: string;
  tenant_id: string;
}

export class XeroMCPServer {
  private config: XeroConfig;
  private baseUrl = 'https://api.xero.com/api.xro/2.0';

  constructor(config: XeroConfig) {
    this.config = config;
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.access_token}`,
      'Xero-Tenant-Id': this.config.tenant_id,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_invoices',
        description: 'List invoices in Xero with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID', 'VOIDED'],
              description: 'Filter invoices by status.',
            },
            page: { type: 'number', description: 'Page number for pagination (100 results per page).' },
            where: { type: 'string', description: 'Xero filter expression (e.g. AmountDue>0).' },
          },
          required: [],
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a single Xero invoice by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: { type: 'string', description: 'The Xero invoice GUID or invoice number.' },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a new invoice in Xero.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['ACCREC', 'ACCPAY'],
              description: 'Invoice type: ACCREC (accounts receivable) or ACCPAY (accounts payable).',
            },
            contact_id: { type: 'string', description: 'Xero contact GUID for the invoice recipient.' },
            line_items: {
              type: 'array',
              description: 'Array of line item objects with Description, Quantity, UnitAmount, and AccountCode.',
              items: { type: 'object' },
            },
            due_date: { type: 'string', description: 'Invoice due date in YYYY-MM-DD format.' },
            reference: { type: 'string', description: 'Optional reference number for the invoice.' },
          },
          required: ['type', 'contact_id', 'line_items'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts in Xero.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (100 results per page).' },
            where: { type: 'string', description: 'Xero filter expression (e.g. IsCustomer=true).' },
            search_term: { type: 'string', description: 'Search contacts by name.' },
          },
          required: [],
        },
      },
      {
        name: 'list_accounts',
        description: 'List chart of accounts in Xero.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['BANK', 'CURRENT', 'CURRLIAB', 'DEPRECIATN', 'DIRECTCOSTS', 'EQUITY', 'EXPENSE', 'FIXED', 'INVENTORY', 'LIABILITY', 'NONCURRENT', 'OTHERINCOME', 'OVERHEADS', 'PREPAYMENT', 'REVENUE', 'SALES', 'TERMLIAB', 'PAYGLIABILITY'],
              description: 'Filter accounts by type.',
            },
            where: { type: 'string', description: 'Xero filter expression.' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_invoices': {
          const params = new URLSearchParams();
          if (args.status) params.set('Statuses', args.status as string);
          if (args.page) params.set('page', String(args.page));
          if (args.where) params.set('where', args.where as string);
          const response = await fetch(`${this.baseUrl}/Invoices?${params}`, { headers: this.authHeaders });
          const data = await response.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_invoice': {
          const response = await fetch(`${this.baseUrl}/Invoices/${args.invoice_id}`, {
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
            Invoices: [
              {
                Type: args.type,
                Contact: { ContactID: args.contact_id },
                LineItems: args.line_items,
                ...(args.due_date ? { DueDate: args.due_date } : {}),
                ...(args.reference ? { Reference: args.reference } : {}),
              },
            ],
          };
          const response = await fetch(`${this.baseUrl}/Invoices`, {
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

        case 'list_contacts': {
          const params = new URLSearchParams();
          if (args.page) params.set('page', String(args.page));
          if (args.where) params.set('where', args.where as string);
          if (args.search_term) params.set('searchTerm', args.search_term as string);
          const response = await fetch(`${this.baseUrl}/Contacts?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_accounts': {
          const params = new URLSearchParams();
          if (args.type) params.set('where', `Type=="${args.type}"`);
          if (args.where) params.set('where', args.where as string);
          const response = await fetch(`${this.baseUrl}/Accounts?${params}`, { headers: this.authHeaders });
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
