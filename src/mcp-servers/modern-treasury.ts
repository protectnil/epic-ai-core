/**
 * Modern Treasury MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://www.npmjs.com/package/modern-treasury-mcp — transport: streamable-HTTP, auth: Basic (org ID + API key)
// Vendor MCP is "Code Mode" — exposes only 2 tools: search_documentation and execute_code (agent writes
//   TypeScript SDK code that runs in an isolated sandbox). It does NOT expose per-endpoint tools.
// MCP FAILS criterion #3: fewer than 10 explicit tools (only 2). Decision: use-rest-api.
// Our adapter covers: 20 tools (payment orders, counterparties, internal/external accounts, transactions, ledgers).
// Recommendation: use-rest-api — vendor MCP fails the 10+ tools criterion; Code Mode sandbox is not a
//   direct tool integration. This REST adapter is the authoritative integration.
//   For air-gapped or SDK-code-generation use cases, the vendor MCP package can supplement.
//
// Base URL: https://app.moderntreasury.com/api
// Auth: HTTP Basic — username: Organization ID, password: API Key
// Docs: https://docs.moderntreasury.com/platform/reference/getting-started
// Rate limits: Not publicly documented — contact Modern Treasury for enterprise limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ModernTreasuryConfig {
  organizationId: string;
  apiKey: string;
  baseUrl?: string;
}

export class ModernTreasuryMCPServer extends MCPAdapterBase {
  private readonly organizationId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ModernTreasuryConfig) {
    super();
    this.organizationId = config.organizationId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://app.moderntreasury.com/api';
  }

  static catalog() {
    return {
      name: 'modern-treasury',
      displayName: 'Modern Treasury',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'modern treasury', 'payment', 'ach', 'wire', 'rtp', 'fednow', 'transaction',
        'ledger', 'counterparty', 'bank account', 'payment order', 'reconciliation',
        'money movement', 'financial operations', 'fintech', 'treasury',
      ],
      toolNames: [
        'list_payment_orders', 'get_payment_order', 'create_payment_order', 'update_payment_order',
        'list_transactions', 'get_transaction',
        'list_counterparties', 'get_counterparty', 'create_counterparty',
        'list_internal_accounts', 'get_internal_account',
        'list_external_accounts', 'get_external_account', 'create_external_account',
        'list_ledgers', 'get_ledger',
        'list_ledger_accounts', 'get_ledger_account',
        'list_ledger_transactions', 'get_ledger_transaction',
      ],
      description: 'Modern Treasury payment ops: create and track payment orders (ACH, wire, RTP), manage counterparties, accounts, and double-entry ledger transactions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_payment_orders',
        description: 'List payment orders with optional filters for status, type, direction, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: pending, processing, return_awaiting_acknowledgement, returned, sent, cancelled, failed (default: all)',
            },
            type: {
              type: 'string',
              description: 'Filter by payment type: ach, wire, rtp, check, sepa, book',
            },
            direction: {
              type: 'string',
              description: 'Filter by direction: credit (send money) or debit (receive money)',
            },
            after_cursor: {
              type: 'string',
              description: 'Pagination cursor — value from a previous response after_cursor field',
            },
            per_page: {
              type: 'number',
              description: 'Number of payment orders per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_payment_order',
        description: 'Get detailed information about a specific payment order by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Payment order ID (UUID format)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_payment_order',
        description: 'Create a new payment order to move funds via ACH, wire, RTP, FedNow, or check',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Payment type: ach, wire, rtp, check, sepa, book',
            },
            amount: {
              type: 'number',
              description: 'Amount in the lowest currency denomination (e.g. cents for USD — 1000 = $10.00)',
            },
            currency: {
              type: 'string',
              description: 'ISO 4217 currency code (e.g. USD, EUR, GBP)',
            },
            direction: {
              type: 'string',
              description: 'Payment direction: credit (sending funds out) or debit (pulling funds in)',
            },
            originating_account_id: {
              type: 'string',
              description: 'Internal account ID from which funds originate',
            },
            receiving_account_id: {
              type: 'string',
              description: 'External account ID of the recipient counterparty',
            },
            description: {
              type: 'string',
              description: 'Optional memo or description for the payment',
            },
          },
          required: ['type', 'amount', 'currency', 'direction', 'originating_account_id', 'receiving_account_id'],
        },
      },
      {
        name: 'update_payment_order',
        description: 'Update a payment order in pending status — modify amount, description, or other fields before processing',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Payment order ID to update',
            },
            amount: {
              type: 'number',
              description: 'Updated amount in lowest denomination',
            },
            description: {
              type: 'string',
              description: 'Updated description or memo',
            },
            status: {
              type: 'string',
              description: 'Update status: cancelled (to cancel a pending order)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List bank transactions across all internal accounts with optional filters for date, status, and account',
        inputSchema: {
          type: 'object',
          properties: {
            internal_account_id: {
              type: 'string',
              description: 'Filter transactions by internal account ID',
            },
            as_of_date_start: {
              type: 'string',
              description: 'Start date filter in ISO 8601 format (YYYY-MM-DD)',
            },
            as_of_date_end: {
              type: 'string',
              description: 'End date filter in ISO 8601 format (YYYY-MM-DD)',
            },
            after_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            per_page: {
              type: 'number',
              description: 'Number of transactions per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Get detailed information about a specific bank transaction by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Transaction ID (UUID format)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_counterparties',
        description: 'List counterparties (payees and payers) with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter by counterparty name (partial match supported)',
            },
            after_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            per_page: {
              type: 'number',
              description: 'Number of counterparties per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_counterparty',
        description: 'Get full profile information for a counterparty by ID, including linked external accounts',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Counterparty ID (UUID format)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_counterparty',
        description: 'Create a new counterparty with name, email, and optional external account details',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Legal name of the counterparty (individual or business)',
            },
            email: {
              type: 'string',
              description: 'Counterparty email address for notifications',
            },
            ledger_type: {
              type: 'string',
              description: 'Ledger type: customer or vendor (default: customer)',
            },
            taxpayer_identifier: {
              type: 'string',
              description: 'Optional tax ID (EIN or SSN) for US counterparties',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_internal_accounts',
        description: 'List your organization\'s internal bank accounts connected to Modern Treasury',
        inputSchema: {
          type: 'object',
          properties: {
            currency: {
              type: 'string',
              description: 'Filter by currency: USD, EUR, GBP, etc.',
            },
            payment_type: {
              type: 'string',
              description: 'Filter by supported payment type: ach, wire, rtp, check',
            },
            after_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            per_page: {
              type: 'number',
              description: 'Number of accounts per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_internal_account',
        description: 'Get details for a specific internal bank account by ID, including routing and account numbers',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Internal account ID (UUID format)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_external_accounts',
        description: 'List external bank accounts (counterparty accounts) with optional counterparty filter',
        inputSchema: {
          type: 'object',
          properties: {
            counterparty_id: {
              type: 'string',
              description: 'Filter external accounts by counterparty ID',
            },
            after_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            per_page: {
              type: 'number',
              description: 'Number of accounts per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_external_account',
        description: 'Get details for a specific external counterparty bank account by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'External account ID (UUID format)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_external_account',
        description: 'Create a new external bank account for a counterparty with routing and account number',
        inputSchema: {
          type: 'object',
          properties: {
            counterparty_id: {
              type: 'string',
              description: 'Counterparty ID to link this account to',
            },
            account_type: {
              type: 'string',
              description: 'Account type: checking or savings',
            },
            account_details: {
              type: 'string',
              description: 'JSON string with account details: [{"account_number":"...","account_number_type":"account_number"}]',
            },
            routing_details: {
              type: 'string',
              description: 'JSON string with routing details: [{"routing_number":"...","routing_number_type":"aba","payment_type":"ach"}]',
            },
            name: {
              type: 'string',
              description: 'Nickname for this external account',
            },
          },
          required: ['counterparty_id', 'account_type', 'account_details', 'routing_details'],
        },
      },
      {
        name: 'list_ledgers',
        description: 'List all ledgers in your organization for double-entry accounting and financial record keeping',
        inputSchema: {
          type: 'object',
          properties: {
            after_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            per_page: {
              type: 'number',
              description: 'Number of ledgers per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_ledger',
        description: 'Get details for a specific ledger by ID, including its currency and description',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Ledger ID (UUID format)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_ledger_accounts',
        description: 'List accounts within a ledger with optional balance filters and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            ledger_id: {
              type: 'string',
              description: 'Filter ledger accounts by ledger ID',
            },
            name: {
              type: 'string',
              description: 'Filter by account name (partial match)',
            },
            after_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            per_page: {
              type: 'number',
              description: 'Number of accounts per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_ledger_account',
        description: 'Get details and current balance for a specific ledger account by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Ledger account ID (UUID format)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_ledger_transactions',
        description: 'List double-entry ledger transactions with optional filters for status, date, and ledger account',
        inputSchema: {
          type: 'object',
          properties: {
            ledger_id: {
              type: 'string',
              description: 'Filter by ledger ID',
            },
            ledger_account_id: {
              type: 'string',
              description: 'Filter by a specific ledger account ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: pending, posted, archived',
            },
            effective_date_start: {
              type: 'string',
              description: 'Start date for effective date filter (YYYY-MM-DD)',
            },
            effective_date_end: {
              type: 'string',
              description: 'End date for effective date filter (YYYY-MM-DD)',
            },
            after_cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            per_page: {
              type: 'number',
              description: 'Number of transactions per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_ledger_transaction',
        description: 'Get a specific ledger transaction and its entries by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Ledger transaction ID (UUID format)',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_payment_orders':
          return this.listPaymentOrders(args);
        case 'get_payment_order':
          return this.getPaymentOrder(args);
        case 'create_payment_order':
          return this.createPaymentOrder(args);
        case 'update_payment_order':
          return this.updatePaymentOrder(args);
        case 'list_transactions':
          return this.listTransactions(args);
        case 'get_transaction':
          return this.getTransaction(args);
        case 'list_counterparties':
          return this.listCounterparties(args);
        case 'get_counterparty':
          return this.getCounterparty(args);
        case 'create_counterparty':
          return this.createCounterparty(args);
        case 'list_internal_accounts':
          return this.listInternalAccounts(args);
        case 'get_internal_account':
          return this.getInternalAccount(args);
        case 'list_external_accounts':
          return this.listExternalAccounts(args);
        case 'get_external_account':
          return this.getExternalAccount(args);
        case 'create_external_account':
          return this.createExternalAccount(args);
        case 'list_ledgers':
          return this.listLedgers(args);
        case 'get_ledger':
          return this.getLedger(args);
        case 'list_ledger_accounts':
          return this.listLedgerAccounts(args);
        case 'get_ledger_account':
          return this.getLedgerAccount(args);
        case 'list_ledger_transactions':
          return this.listLedgerTransactions(args);
        case 'get_ledger_transaction':
          return this.getLedgerTransaction(args);
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

  private get authHeader(): string {
    return `Basic ${btoa(`${this.organizationId}:${this.apiKey}`)}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async mtGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}${qs}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Modern Treasury returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async mtPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Modern Treasury returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async mtPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Modern Treasury returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPaymentOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
    };
    if (args.status) params.status = args.status as string;
    if (args.type) params.type = args.type as string;
    if (args.direction) params.direction = args.direction as string;
    if (args.after_cursor) params.after_cursor = args.after_cursor as string;
    return this.mtGet('payment_orders', params);
  }

  private async getPaymentOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.mtGet(`payment_orders/${encodeURIComponent(args.id as string)}`);
  }

  private async createPaymentOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['type', 'amount', 'currency', 'direction', 'originating_account_id', 'receiving_account_id'];
    for (const field of required) {
      if (!args[field]) return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
    }
    const body: Record<string, unknown> = {
      type: args.type,
      amount: args.amount,
      currency: args.currency,
      direction: args.direction,
      originating_account_id: args.originating_account_id,
      receiving_account_id: args.receiving_account_id,
    };
    if (args.description) body.description = args.description;
    return this.mtPost('payment_orders', body);
  }

  private async updatePaymentOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.amount) body.amount = args.amount;
    if (args.description) body.description = args.description;
    if (args.status) body.status = args.status;
    return this.mtPatch(`payment_orders/${encodeURIComponent(args.id as string)}`, body);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
    };
    if (args.internal_account_id) params.internal_account_id = args.internal_account_id as string;
    if (args.as_of_date_start) params['as_of_date[gte]'] = args.as_of_date_start as string;
    if (args.as_of_date_end) params['as_of_date[lte]'] = args.as_of_date_end as string;
    if (args.after_cursor) params.after_cursor = args.after_cursor as string;
    return this.mtGet('transactions', params);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.mtGet(`transactions/${encodeURIComponent(args.id as string)}`);
  }

  private async listCounterparties(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
    };
    if (args.name) params.name = args.name as string;
    if (args.after_cursor) params.after_cursor = args.after_cursor as string;
    return this.mtGet('counterparties', params);
  }

  private async getCounterparty(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.mtGet(`counterparties/${encodeURIComponent(args.id as string)}`);
  }

  private async createCounterparty(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.email) body.email = args.email;
    if (args.ledger_type) body.ledger_type = args.ledger_type;
    if (args.taxpayer_identifier) body.taxpayer_identifier = args.taxpayer_identifier;
    return this.mtPost('counterparties', body);
  }

  private async listInternalAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
    };
    if (args.currency) params.currency = args.currency as string;
    if (args.payment_type) params.payment_type = args.payment_type as string;
    if (args.after_cursor) params.after_cursor = args.after_cursor as string;
    return this.mtGet('internal_accounts', params);
  }

  private async getInternalAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.mtGet(`internal_accounts/${encodeURIComponent(args.id as string)}`);
  }

  private async listExternalAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
    };
    if (args.counterparty_id) params.counterparty_id = args.counterparty_id as string;
    if (args.after_cursor) params.after_cursor = args.after_cursor as string;
    return this.mtGet('external_accounts', params);
  }

  private async getExternalAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.mtGet(`external_accounts/${encodeURIComponent(args.id as string)}`);
  }

  private async createExternalAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['counterparty_id', 'account_type', 'account_details', 'routing_details'];
    for (const field of required) {
      if (!args[field]) return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
    }
    let accountDetails: unknown;
    let routingDetails: unknown;
    try {
      accountDetails = JSON.parse(args.account_details as string);
      routingDetails = JSON.parse(args.routing_details as string);
    } catch {
      return { content: [{ type: 'text', text: 'account_details and routing_details must be valid JSON strings' }], isError: true };
    }
    const body: Record<string, unknown> = {
      counterparty_id: args.counterparty_id,
      account_type: args.account_type,
      account_details: accountDetails,
      routing_details: routingDetails,
    };
    if (args.name) body.name = args.name;
    return this.mtPost('external_accounts', body);
  }

  private async listLedgers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
    };
    if (args.after_cursor) params.after_cursor = args.after_cursor as string;
    return this.mtGet('ledgers', params);
  }

  private async getLedger(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.mtGet(`ledgers/${encodeURIComponent(args.id as string)}`);
  }

  private async listLedgerAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
    };
    if (args.ledger_id) params.ledger_id = args.ledger_id as string;
    if (args.name) params.name = args.name as string;
    if (args.after_cursor) params.after_cursor = args.after_cursor as string;
    return this.mtGet('ledger_accounts', params);
  }

  private async getLedgerAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.mtGet(`ledger_accounts/${encodeURIComponent(args.id as string)}`);
  }

  private async listLedgerTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
    };
    if (args.ledger_id) params.ledger_id = args.ledger_id as string;
    if (args.ledger_account_id) params.ledger_account_id = args.ledger_account_id as string;
    if (args.status) params.status = args.status as string;
    if (args.effective_date_start) params['effective_date[gte]'] = args.effective_date_start as string;
    if (args.effective_date_end) params['effective_date[lte]'] = args.effective_date_end as string;
    if (args.after_cursor) params.after_cursor = args.after_cursor as string;
    return this.mtGet('ledger_transactions', params);
  }

  private async getLedgerTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.mtGet(`ledger_transactions/${encodeURIComponent(args.id as string)}`);
  }
}
