/**
 * Ramp MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/ramp-public/ramp_mcp — transport: stdio, auth: OAuth2 client credentials
// Vendor MCP covers: 17 tools (ETL/SQLite pattern: process_data, execute_query, clear_table, get_ramp_categories,
//   get_currencies, load_transactions, load_reimbursements, load_bills, load_locations, load_departments,
//   load_bank_accounts, load_vendors, load_vendor_bank_accounts, load_entities, load_spend_limits,
//   load_spend_programs, load_users). Demo-env by default (RAMP_ENV=prd to use production). Single commit,
//   maintained 2025. MCP fails use-vendor-mcp criteria: ETL/in-memory SQLite pattern, not direct REST
//   replacement, and defaults to demo environment — not suitable for live production data access.
// Our adapter covers: 17 tools (full production REST API).
// Recommendation: use-rest-api. Use this adapter for live production REST access. Document vendor MCP for
//   read-only demo/ETL analytics workflows.
//
// Base URL: https://api.ramp.com  (demo/sandbox: https://demo-api.ramp.com)
// Auth: OAuth2 client credentials — POST /developer/v1/token with Basic(clientId:clientSecret) → Bearer token
// Docs: https://docs.ramp.com/developer-api/v1
// Rate limits: Documented at docs.ramp.com/developer-api/v1/rate-limiting (JS-rendered page, limits not
//   publicly disclosed in static content). Returns HTTP 429 on excess. Access tokens last 10 days.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RampConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class RampMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: RampConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.ramp.com';
  }

  static catalog() {
    return {
      name: 'ramp',
      displayName: 'Ramp',
      version: '1.0.0',
      category: 'finance',
      keywords: ['ramp', 'corporate card', 'spend management', 'transactions', 'cards', 'expense', 'reimbursement', 'bill pay', 'vendor', 'receipt', 'department'],
      toolNames: [
        'list_transactions', 'get_transaction',
        'list_cards', 'get_card', 'update_card',
        'list_users', 'get_user',
        'list_departments', 'get_department',
        'list_spend_programs', 'get_spend_program',
        'list_reimbursements', 'get_reimbursement',
        'list_bills', 'get_bill',
        'list_vendors', 'get_vendor',
      ],
      description: 'Manage Ramp corporate cards, transactions, expenses, reimbursements, bill pay, vendors, and departments via the Ramp Developer API.',
      author: 'protectnil',
    };
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`Ramp OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    // Access tokens last 10 days (864000s); refresh 60s early
    this.tokenExpiry = now + ((data.expires_in ?? 864000) - 60) * 1000;
    return this.bearerToken;
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_transactions',
        description: 'List Ramp transactions with optional filters for date range, card, user, merchant, and department. Supports cursor pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Filter transactions on or after this ISO 8601 date (e.g. 2026-01-01T00:00:00Z)',
            },
            to_date: {
              type: 'string',
              description: 'Filter transactions on or before this ISO 8601 date',
            },
            card_id: {
              type: 'string',
              description: 'Filter by card ID',
            },
            user_id: {
              type: 'string',
              description: 'Filter by user ID',
            },
            department_id: {
              type: 'string',
              description: 'Filter by department ID',
            },
            merchant_id: {
              type: 'string',
              description: 'Filter by merchant ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (2–100, default: 100)',
            },
            start: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Get a single Ramp transaction by its ID, including merchant, amount, and receipt details',
        inputSchema: {
          type: 'object',
          properties: {
            transaction_id: {
              type: 'string',
              description: 'The Ramp transaction ID',
            },
          },
          required: ['transaction_id'],
        },
      },
      {
        name: 'list_cards',
        description: 'List all Ramp corporate cards in the organization with spend limits and cardholder info',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Filter cards by the owning user ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (2–100, default: 100)',
            },
            start: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_card',
        description: 'Get a single Ramp card by its ID, including spend restrictions and cardholder details',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'The Ramp card ID',
            },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'update_card',
        description: 'Update a Ramp card display name or spending restrictions (limit and interval)',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: {
              type: 'string',
              description: 'The card ID to update',
            },
            display_name: {
              type: 'string',
              description: 'New display name for the card',
            },
            spending_restrictions: {
              type: 'object',
              description: 'Spending restrictions: { interval: "MONTHLY"|"DAILY"|"WEEKLY"|"YEARLY"|"TOTAL", limit: number (cents) }',
            },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List all users in the Ramp organization with roles and department assignments',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: {
              type: 'string',
              description: 'Filter users by department ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (2–100, default: 100)',
            },
            start: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get a single Ramp user by their ID, including contact info and department',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The Ramp user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_departments',
        description: 'List all departments in the Ramp organization',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of results per page (2–100, default: 100)',
            },
            start: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_department',
        description: 'Get a single department by its ID, including name and member count',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: {
              type: 'string',
              description: 'The department ID',
            },
          },
          required: ['department_id'],
        },
      },
      {
        name: 'list_spend_programs',
        description: 'List all spend programs (reusable card templates with preset spending rules) in the organization',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of results per page (2–100, default: 100)',
            },
            start: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_spend_program',
        description: 'Get a single spend program by its ID, including spending rules and card templates',
        inputSchema: {
          type: 'object',
          properties: {
            spend_program_id: {
              type: 'string',
              description: 'The spend program ID',
            },
          },
          required: ['spend_program_id'],
        },
      },
      {
        name: 'list_reimbursements',
        description: 'List out-of-pocket expense reimbursement requests with optional user filter',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Filter reimbursements by user ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (2–100, default: 100)',
            },
            start: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_reimbursement',
        description: 'Get a single reimbursement request by its ID, including amount, status, and receipts',
        inputSchema: {
          type: 'object',
          properties: {
            reimbursement_id: {
              type: 'string',
              description: 'The reimbursement ID',
            },
          },
          required: ['reimbursement_id'],
        },
      },
      {
        name: 'list_bills',
        description: 'List bill pay invoices in the organization with optional status and vendor filters',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of results per page (2–100, default: 100)',
            },
            start: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_bill',
        description: 'Get a single bill pay invoice by its ID, including line items, vendor, and payment status',
        inputSchema: {
          type: 'object',
          properties: {
            bill_id: {
              type: 'string',
              description: 'The bill ID',
            },
          },
          required: ['bill_id'],
        },
      },
      {
        name: 'list_vendors',
        description: 'List vendors (suppliers and payees) in the Ramp organization for bill tagging and purchase orders',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of results per page (2–100, default: 100)',
            },
            start: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_vendor',
        description: 'Get a single vendor by its ID, including contact details and payment information',
        inputSchema: {
          type: 'object',
          properties: {
            vendor_id: {
              type: 'string',
              description: 'The vendor ID',
            },
          },
          required: ['vendor_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_transactions':
          return await this.listTransactions(args);
        case 'get_transaction':
          return await this.getTransaction(args);
        case 'list_cards':
          return await this.listCards(args);
        case 'get_card':
          return await this.getCard(args);
        case 'update_card':
          return await this.updateCard(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'list_departments':
          return await this.listDepartments(args);
        case 'get_department':
          return await this.getDepartment(args);
        case 'list_spend_programs':
          return await this.listSpendPrograms(args);
        case 'get_spend_program':
          return await this.getSpendProgram(args);
        case 'list_reimbursements':
          return await this.listReimbursements(args);
        case 'get_reimbursement':
          return await this.getReimbursement(args);
        case 'list_bills':
          return await this.listBills(args);
        case 'get_bill':
          return await this.getBill(args);
        case 'list_vendors':
          return await this.listVendors(args);
        case 'get_vendor':
          return await this.getVendor(args);
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

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const h = await this.headers();
    const params = new URLSearchParams();
    if (args.from_date) params.set('from_date', args.from_date as string);
    if (args.to_date) params.set('to_date', args.to_date as string);
    if (args.card_id) params.set('card_id', args.card_id as string);
    if (args.user_id) params.set('user_id', args.user_id as string);
    if (args.department_id) params.set('department_id', args.department_id as string);
    if (args.merchant_id) params.set('merchant_id', args.merchant_id as string);
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.start) params.set('start', args.start as string);
    const qs = params.toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/transactions${qs ? `?${qs}` : ''}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list transactions: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.transaction_id as string;
    if (!id) return { content: [{ type: 'text', text: 'transaction_id is required' }], isError: true };
    const h = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/transactions/${encodeURIComponent(id)}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to get transaction: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listCards(args: Record<string, unknown>): Promise<ToolResult> {
    const h = await this.headers();
    const params = new URLSearchParams();
    if (args.user_id) params.set('user_id', args.user_id as string);
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.start) params.set('start', args.start as string);
    const qs = params.toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/cards${qs ? `?${qs}` : ''}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list cards: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getCard(args: Record<string, unknown>): Promise<ToolResult> {
    const cardId = args.card_id as string;
    if (!cardId) return { content: [{ type: 'text', text: 'card_id is required' }], isError: true };
    const h = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/cards/${encodeURIComponent(cardId)}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to get card: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async updateCard(args: Record<string, unknown>): Promise<ToolResult> {
    const cardId = args.card_id as string;
    if (!cardId) return { content: [{ type: 'text', text: 'card_id is required' }], isError: true };
    const h = await this.headers();
    const body: Record<string, unknown> = {};
    if (args.display_name !== undefined) body.display_name = args.display_name;
    if (args.spending_restrictions !== undefined) body.spending_restrictions = args.spending_restrictions;
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/cards/${encodeURIComponent(cardId)}`, {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify(body),
    });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to update card: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const h = await this.headers();
    const params = new URLSearchParams();
    if (args.department_id) params.set('department_id', args.department_id as string);
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.start) params.set('start', args.start as string);
    const qs = params.toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/users${qs ? `?${qs}` : ''}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list users: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const h = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/users/${encodeURIComponent(userId)}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to get user: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    const h = await this.headers();
    const params = new URLSearchParams();
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.start) params.set('start', args.start as string);
    const qs = params.toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/departments${qs ? `?${qs}` : ''}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list departments: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getDepartment(args: Record<string, unknown>): Promise<ToolResult> {
    const deptId = args.department_id as string;
    if (!deptId) return { content: [{ type: 'text', text: 'department_id is required' }], isError: true };
    const h = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/departments/${encodeURIComponent(deptId)}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to get department: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listSpendPrograms(args: Record<string, unknown>): Promise<ToolResult> {
    const h = await this.headers();
    const params = new URLSearchParams();
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.start) params.set('start', args.start as string);
    const qs = params.toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/spend_programs${qs ? `?${qs}` : ''}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list spend programs: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getSpendProgram(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.spend_program_id as string;
    if (!id) return { content: [{ type: 'text', text: 'spend_program_id is required' }], isError: true };
    const h = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/spend_programs/${encodeURIComponent(id)}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to get spend program: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listReimbursements(args: Record<string, unknown>): Promise<ToolResult> {
    const h = await this.headers();
    const params = new URLSearchParams();
    if (args.user_id) params.set('user_id', args.user_id as string);
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.start) params.set('start', args.start as string);
    const qs = params.toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/reimbursements${qs ? `?${qs}` : ''}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list reimbursements: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getReimbursement(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.reimbursement_id as string;
    if (!id) return { content: [{ type: 'text', text: 'reimbursement_id is required' }], isError: true };
    const h = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/reimbursements/${encodeURIComponent(id)}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to get reimbursement: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listBills(args: Record<string, unknown>): Promise<ToolResult> {
    const h = await this.headers();
    const params = new URLSearchParams();
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.start) params.set('start', args.start as string);
    const qs = params.toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/bills${qs ? `?${qs}` : ''}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list bills: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getBill(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.bill_id as string;
    if (!id) return { content: [{ type: 'text', text: 'bill_id is required' }], isError: true };
    const h = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/bills/${encodeURIComponent(id)}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to get bill: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listVendors(args: Record<string, unknown>): Promise<ToolResult> {
    const h = await this.headers();
    const params = new URLSearchParams();
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.start) params.set('start', args.start as string);
    const qs = params.toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/vendors${qs ? `?${qs}` : ''}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list vendors: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getVendor(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.vendor_id as string;
    if (!id) return { content: [{ type: 'text', text: 'vendor_id is required' }], isError: true };
    const h = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}/developer/v1/vendors/${encodeURIComponent(id)}`, { headers: h });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to get vendor: ${response.status} ${response.statusText}` }], isError: true };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Ramp returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
