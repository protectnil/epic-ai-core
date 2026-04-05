/**
 * Unit Banking-as-a-Service MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Unit MCP server was found on GitHub or in MCP registries.
//
// Base URL: https://api.s.unit.sh (sandbox) / https://api.unit.co (production)
// Auth: Bearer token (org-level API token from Unit Dashboard)
// Docs: https://docs.unit.co/
// Rate limits: 200 req/sec per org (documented in Unit API docs)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface UnitConfig {
  apiToken: string;
  baseUrl?: string;
}

export class UnitMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: UnitConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl || 'https://api.s.unit.sh').replace(/\/$/, '');
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/vnd.api+json',
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const opts: RequestInit = { method, headers: this.headers };
    if (body) opts.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, opts);
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"status":"success"}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_customers',
        description: 'List customers with optional filters for status, email, tags, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: Active, Archived' },
            email: { type: 'string', description: 'Filter by email address' },
            tags: { type: 'string', description: 'Filter by tag key:value' },
            limit: { type: 'number', description: 'Page size (default: 100, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get a specific customer by ID including their profile, status, and tags',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'string', description: 'Unit customer ID' },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_individual_customer',
        description: 'Create a new individual (personal) customer application with KYC verification',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: { type: 'string', description: 'First name' },
            last_name: { type: 'string', description: 'Last name' },
            email: { type: 'string', description: 'Email address' },
            phone_number: { type: 'string', description: 'Phone in E.164 format (+1...)' },
            date_of_birth: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' },
            ssn: { type: 'string', description: 'Full SSN (9 digits)' },
            address_street: { type: 'string', description: 'Street address' },
            address_city: { type: 'string', description: 'City' },
            address_state: { type: 'string', description: 'Two-letter state code' },
            address_postal_code: { type: 'string', description: 'ZIP code' },
            address_country: { type: 'string', description: 'Two-letter country code (default: US)' },
          },
          required: ['first_name', 'last_name', 'email', 'phone_number', 'date_of_birth', 'ssn', 'address_street', 'address_city', 'address_state', 'address_postal_code'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List deposit accounts with optional filters for customer, status, and type',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'string', description: 'Filter by customer ID' },
            status: { type: 'string', description: 'Filter by status: Open, Frozen, Closed' },
            type: { type: 'string', description: 'Filter by type: depositAccount, creditAccount' },
            limit: { type: 'number', description: 'Page size (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get a specific account by ID including balance, status, and account number',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'Unit account ID' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'create_deposit_account',
        description: 'Open a new deposit (checking) account for a customer',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'string', description: 'Customer ID to open account for' },
            deposit_product: { type: 'string', description: 'Deposit product name (from your Unit config)' },
            tags: { type: 'object', description: 'Key-value tags to attach to the account' },
          },
          required: ['customer_id', 'deposit_product'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List transactions for an account with optional date range and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'Filter by account ID' },
            since: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            until: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            type: { type: 'string', description: 'Transaction type filter' },
            limit: { type: 'number', description: 'Page size (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Get a specific transaction by account ID and transaction ID',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'Account ID' },
            transaction_id: { type: 'string', description: 'Transaction ID' },
          },
          required: ['account_id', 'transaction_id'],
        },
      },
      {
        name: 'create_book_payment',
        description: 'Create a book (internal) payment between two Unit accounts instantly',
        inputSchema: {
          type: 'object',
          properties: {
            amount_cents: { type: 'number', description: 'Amount in cents' },
            description: { type: 'string', description: 'Payment description' },
            from_account_id: { type: 'string', description: 'Source account ID' },
            to_account_id: { type: 'string', description: 'Destination account ID' },
          },
          required: ['amount_cents', 'description', 'from_account_id', 'to_account_id'],
        },
      },
      {
        name: 'create_ach_payment',
        description: 'Create an ACH payment (debit or credit) to/from an external bank account',
        inputSchema: {
          type: 'object',
          properties: {
            amount_cents: { type: 'number', description: 'Amount in cents' },
            direction: { type: 'string', description: 'Payment direction: Debit or Credit' },
            description: { type: 'string', description: 'Payment description' },
            account_id: { type: 'string', description: 'Unit account ID' },
            counterparty_routing_number: { type: 'string', description: 'External bank routing number' },
            counterparty_account_number: { type: 'string', description: 'External bank account number' },
            counterparty_name: { type: 'string', description: 'Name on external account' },
            counterparty_account_type: { type: 'string', description: 'Checking or Savings' },
          },
          required: ['amount_cents', 'direction', 'description', 'account_id', 'counterparty_routing_number', 'counterparty_account_number', 'counterparty_name'],
        },
      },
      {
        name: 'list_payments',
        description: 'List payments with optional filters for account, status, type, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'Filter by account ID' },
            status: { type: 'string', description: 'Filter by status: Pending, Sent, Returned, etc.' },
            type: { type: 'string', description: 'Filter by type: achPayment, bookPayment, wirePayment' },
            since: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            until: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            limit: { type: 'number', description: 'Page size (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_payment',
        description: 'Get a specific payment by ID including status, amount, and counterparty',
        inputSchema: {
          type: 'object',
          properties: {
            payment_id: { type: 'string', description: 'Payment ID' },
          },
          required: ['payment_id'],
        },
      },
      {
        name: 'list_cards',
        description: 'List debit cards with optional filters for account, status, and customer',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'Filter by account ID' },
            customer_id: { type: 'string', description: 'Filter by customer ID' },
            status: { type: 'string', description: 'Filter by status: Active, Frozen, ClosedByCustomer, etc.' },
            limit: { type: 'number', description: 'Page size (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'create_debit_card',
        description: 'Issue a new virtual or physical debit card for an account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'Account ID to issue card for' },
            card_type: { type: 'string', description: 'individualDebitCard or businessDebitCard' },
            shipping_address_street: { type: 'string', description: 'Shipping street (physical cards only)' },
            shipping_address_city: { type: 'string', description: 'Shipping city' },
            shipping_address_state: { type: 'string', description: 'Shipping state' },
            shipping_address_postal_code: { type: 'string', description: 'Shipping ZIP' },
            shipping_address_country: { type: 'string', description: 'Shipping country (default: US)' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'freeze_card',
        description: 'Temporarily freeze a debit card preventing all transactions',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: { type: 'string', description: 'Card ID to freeze' },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'unfreeze_card',
        description: 'Unfreeze a previously frozen debit card',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: { type: 'string', description: 'Card ID to unfreeze' },
          },
          required: ['card_id'],
        },
      },
      {
        name: 'list_statements',
        description: 'List account statements with optional filters for period and account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'Filter by account ID' },
            period: { type: 'string', description: 'Statement period (YYYY-MM)' },
            limit: { type: 'number', description: 'Page size (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'list_webhooks',
        description: 'List configured webhook endpoints for your organization',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Page size (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_customers': return await this.listCustomers(args);
        case 'get_customer': return await this.getCustomer(args);
        case 'create_individual_customer': return await this.createIndividualCustomer(args);
        case 'list_accounts': return await this.listAccounts(args);
        case 'get_account': return await this.getAccount(args);
        case 'create_deposit_account': return await this.createDepositAccount(args);
        case 'list_transactions': return await this.listTransactions(args);
        case 'get_transaction': return await this.getTransaction(args);
        case 'create_book_payment': return await this.createBookPayment(args);
        case 'create_ach_payment': return await this.createAchPayment(args);
        case 'list_payments': return await this.listPayments(args);
        case 'get_payment': return await this.getPayment(args);
        case 'list_cards': return await this.listCards(args);
        case 'create_debit_card': return await this.createDebitCard(args);
        case 'freeze_card': return await this.freezeCard(args);
        case 'unfreeze_card': return await this.unfreezeCard(args);
        case 'list_statements': return await this.listStatements(args);
        case 'list_webhooks': return await this.listWebhooks(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return { content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    }
  }

  private buildParams(args: Record<string, unknown>, filters: string[]): string {
    const params = new URLSearchParams();
    for (const key of filters) {
      if (args[key] !== undefined) params.append(`filter[${key}]`, String(args[key]));
    }
    if (args.limit) params.append('page[limit]', String(args.limit));
    if (args.offset) params.append('page[offset]', String(args.offset));
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/customers${this.buildParams(args, ['status', 'email', 'tags'])}`);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/customers/${encodeURIComponent(args.customer_id as string)}`);
  }

  private async createIndividualCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      data: {
        type: 'individualApplication',
        attributes: {
          fullName: { first: args.first_name, last: args.last_name },
          email: args.email,
          phone: { countryCode: '1', number: String(args.phone_number).replace(/^\+1/, '') },
          dateOfBirth: args.date_of_birth,
          ssn: args.ssn,
          address: {
            street: args.address_street,
            city: args.address_city,
            state: args.address_state,
            postalCode: args.address_postal_code,
            country: args.address_country || 'US',
          },
        },
      },
    };
    return this.request('POST', '/applications', body);
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/accounts${this.buildParams(args, ['customer_id', 'status', 'type'])}`);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/accounts/${encodeURIComponent(args.account_id as string)}`);
  }

  private async createDepositAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      data: {
        type: 'depositAccount',
        attributes: { depositProduct: args.deposit_product, tags: args.tags || {} },
        relationships: {
          customer: { data: { type: 'customer', id: args.customer_id } },
        },
      },
    };
    return this.request('POST', '/accounts', body);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/transactions${this.buildParams(args, ['account_id', 'since', 'until', 'type'])}`);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/accounts/${encodeURIComponent(args.account_id as string)}/transactions/${encodeURIComponent(args.transaction_id as string)}`);
  }

  private async createBookPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      data: {
        type: 'bookPayment',
        attributes: { amount: args.amount_cents, description: args.description },
        relationships: {
          account: { data: { type: 'depositAccount', id: args.from_account_id } },
          counterpartyAccount: { data: { type: 'depositAccount', id: args.to_account_id } },
        },
      },
    };
    return this.request('POST', '/payments', body);
  }

  private async createAchPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      data: {
        type: 'achPayment',
        attributes: {
          amount: args.amount_cents,
          direction: args.direction,
          description: args.description,
          counterparty: {
            routingNumber: args.counterparty_routing_number,
            accountNumber: args.counterparty_account_number,
            accountType: args.counterparty_account_type || 'Checking',
            name: args.counterparty_name,
          },
        },
        relationships: {
          account: { data: { type: 'depositAccount', id: args.account_id } },
        },
      },
    };
    return this.request('POST', '/payments', body);
  }

  private async listPayments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/payments${this.buildParams(args, ['account_id', 'status', 'type', 'since', 'until'])}`);
  }

  private async getPayment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/payments/${encodeURIComponent(args.payment_id as string)}`);
  }

  private async listCards(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/cards${this.buildParams(args, ['account_id', 'customer_id', 'status'])}`);
  }

  private async createDebitCard(args: Record<string, unknown>): Promise<ToolResult> {
    const attrs: Record<string, unknown> = {};
    if (args.shipping_address_street) {
      attrs.shippingAddress = {
        street: args.shipping_address_street,
        city: args.shipping_address_city,
        state: args.shipping_address_state,
        postalCode: args.shipping_address_postal_code,
        country: args.shipping_address_country || 'US',
      };
    }
    const body = {
      data: {
        type: args.card_type || 'individualDebitCard',
        attributes: attrs,
        relationships: {
          account: { data: { type: 'depositAccount', id: args.account_id } },
        },
      },
    };
    return this.request('POST', '/cards', body);
  }

  private async freezeCard(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', `/cards/${encodeURIComponent(args.card_id as string)}/freeze`);
  }

  private async unfreezeCard(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', `/cards/${encodeURIComponent(args.card_id as string)}/unfreeze`);
  }

  private async listStatements(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/statements${this.buildParams(args, ['account_id', 'period'])}`);
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/webhooks${this.buildParams(args, [])}`);
  }

  static catalog() {
    return {
      name: 'unit',
      displayName: 'Unit',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['unit', 'banking', 'baas', 'banking-as-a-service', 'accounts', 'payments', 'ach', 'cards', 'debit', 'deposits', 'fintech'],
      toolNames: [
        'list_customers', 'get_customer', 'create_individual_customer',
        'list_accounts', 'get_account', 'create_deposit_account',
        'list_transactions', 'get_transaction',
        'create_book_payment', 'create_ach_payment', 'list_payments', 'get_payment',
        'list_cards', 'create_debit_card', 'freeze_card', 'unfreeze_card',
        'list_statements', 'list_webhooks',
      ],
      description: 'Unit banking-as-a-service: manage customers, deposit accounts, ACH/book payments, debit cards, transactions, and statements.',
      author: 'protectnil' as const,
    };
  }
}
