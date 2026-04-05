/**
 * Open Banking UK — Account and Transaction API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Open Banking UK has not published an official MCP server.
//
// Base URL: /open-banking/v3.1/aisp  (deployed at the ASPSP — the bank's own domain)
// Auth: OAuth2 Bearer token (TPPOAuth2Security, scope: accounts)
//   Consent must be created first: POST /account-access-consents
// Docs: https://openbankinguk.github.io/read-write-api-site3/v3.1.7/resources-and-data-models/aisp/
// Rate limits: Determined by each individual ASPSP (bank). Not standardized.
// Note: baseUrl must be set to the ASPSP's (bank's) host + /open-banking/v3.1/aisp

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenBankingUKConfig {
  accessToken: string;
  baseUrl?: string;
  xFapiInteractionId?: string;
}

export class OpenBankingUkAccountInfoOpenapiMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly xFapiInteractionId: string;

  constructor(config: OpenBankingUKConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://openbanking.org.uk/open-banking/v3.1/aisp';
    this.xFapiInteractionId = config.xFapiInteractionId || '';
  }

  static catalog() {
    return {
      name: 'openbanking-uk-account-info-openapi',
      displayName: 'Open Banking UK — Account Info',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'open banking', 'uk banking', 'bank accounts', 'transactions', 'balances',
        'standing orders', 'direct debits', 'statements', 'beneficiaries', 'aisp',
        'psd2', 'consent', 'account access', 'scheduled payments', 'offers', 'products',
      ],
      toolNames: [
        'create_account_access_consent',
        'get_account_access_consent',
        'delete_account_access_consent',
        'list_accounts',
        'get_account',
        'get_account_balances',
        'get_account_transactions',
        'get_account_beneficiaries',
        'get_account_direct_debits',
        'get_account_standing_orders',
        'get_account_scheduled_payments',
        'get_account_statements',
        'get_account_statement',
        'get_account_statement_transactions',
        'get_account_offers',
        'get_account_parties',
        'get_account_party',
        'get_account_product',
        'list_balances',
        'list_transactions',
        'list_beneficiaries',
        'list_direct_debits',
        'list_standing_orders',
        'list_scheduled_payments',
        'list_offers',
        'list_statements',
        'list_products',
        'get_party',
      ],
      description: 'Access UK Open Banking account and transaction data via the AISP (Account Information Service Provider) API: accounts, balances, transactions, standing orders, direct debits, statements, and consent management.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Consent Management ─────────────────────────────────────────────────
      {
        name: 'create_account_access_consent',
        description: 'Create an account access consent request specifying which permissions the TPP is requesting (e.g. ReadAccountsBasic, ReadTransactionsDetail)',
        inputSchema: {
          type: 'object',
          properties: {
            permissions: {
              type: 'array',
              description: 'Array of permission codes requested (e.g. ["ReadAccountsBasic","ReadBalances","ReadTransactionsBasic"])',
              items: { type: 'string' },
            },
            expiration_date_time: { type: 'string', description: 'ISO 8601 expiry date-time for the consent (optional)' },
            transaction_from_date_time: { type: 'string', description: 'ISO 8601 start date for transaction data access (optional)' },
            transaction_to_date_time: { type: 'string', description: 'ISO 8601 end date for transaction data access (optional)' },
          },
          required: ['permissions'],
        },
      },
      {
        name: 'get_account_access_consent',
        description: 'Retrieve an existing account access consent by ConsentId',
        inputSchema: {
          type: 'object',
          properties: {
            consent_id: { type: 'string', description: 'The consent identifier returned when the consent was created' },
          },
          required: ['consent_id'],
        },
      },
      {
        name: 'delete_account_access_consent',
        description: 'Revoke an account access consent by ConsentId, ending the TPP\'s data access',
        inputSchema: {
          type: 'object',
          properties: {
            consent_id: { type: 'string', description: 'The consent identifier to revoke' },
          },
          required: ['consent_id'],
        },
      },
      // ── Accounts ──────────────────────────────────────────────────────────
      {
        name: 'list_accounts',
        description: 'List all accounts the PSU has authorised the TPP to access',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_account',
        description: 'Get details of a specific account by AccountId',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
          },
          required: ['account_id'],
        },
      },
      // ── Balances ──────────────────────────────────────────────────────────
      {
        name: 'get_account_balances',
        description: 'Get all balances for a specific account (ClosingAvailable, ClosingBooked, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_balances',
        description: 'Get balances across all authorised accounts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Transactions ──────────────────────────────────────────────────────
      {
        name: 'get_account_transactions',
        description: 'Get transactions for a specific account with optional date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
            from_booking_date_time: { type: 'string', description: 'Filter transactions from this ISO 8601 date-time (optional)' },
            to_booking_date_time: { type: 'string', description: 'Filter transactions to this ISO 8601 date-time (optional)' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_transactions',
        description: 'Get transactions across all authorised accounts',
        inputSchema: {
          type: 'object',
          properties: {
            from_booking_date_time: { type: 'string', description: 'Filter from this ISO 8601 date-time (optional)' },
            to_booking_date_time: { type: 'string', description: 'Filter to this ISO 8601 date-time (optional)' },
          },
        },
      },
      // ── Beneficiaries ─────────────────────────────────────────────────────
      {
        name: 'get_account_beneficiaries',
        description: 'Get beneficiaries (saved payees) for a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_beneficiaries',
        description: 'Get beneficiaries across all authorised accounts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Direct Debits ─────────────────────────────────────────────────────
      {
        name: 'get_account_direct_debits',
        description: 'Get direct debit mandates for a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_direct_debits',
        description: 'Get direct debit mandates across all authorised accounts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Standing Orders ───────────────────────────────────────────────────
      {
        name: 'get_account_standing_orders',
        description: 'Get standing orders for a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_standing_orders',
        description: 'Get standing orders across all authorised accounts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Scheduled Payments ────────────────────────────────────────────────
      {
        name: 'get_account_scheduled_payments',
        description: 'Get scheduled payments for a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_scheduled_payments',
        description: 'Get scheduled payments across all authorised accounts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Statements ────────────────────────────────────────────────────────
      {
        name: 'get_account_statements',
        description: 'Get a list of statements for a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
            from_statement_date_time: { type: 'string', description: 'Filter from this ISO 8601 date-time (optional)' },
            to_statement_date_time: { type: 'string', description: 'Filter to this ISO 8601 date-time (optional)' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_account_statement',
        description: 'Get a specific statement by StatementId for an account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
            statement_id: { type: 'string', description: 'The statement identifier' },
          },
          required: ['account_id', 'statement_id'],
        },
      },
      {
        name: 'get_account_statement_transactions',
        description: 'Get transactions belonging to a specific statement for an account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
            statement_id: { type: 'string', description: 'The statement identifier' },
          },
          required: ['account_id', 'statement_id'],
        },
      },
      {
        name: 'list_statements',
        description: 'Get statements across all authorised accounts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Offers ────────────────────────────────────────────────────────────
      {
        name: 'get_account_offers',
        description: 'Get product offers associated with a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_offers',
        description: 'Get product offers across all authorised accounts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Parties ───────────────────────────────────────────────────────────
      {
        name: 'get_account_parties',
        description: 'Get all parties (account holders, mandatees) associated with a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_account_party',
        description: 'Get the primary party (PSU) details for a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_party',
        description: 'Get party details for the PSU authenticated in the current consent',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Products ──────────────────────────────────────────────────────────
      {
        name: 'get_account_product',
        description: 'Get the product details (product type, features, fees) for a specific account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'The account identifier' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_products',
        description: 'Get product details across all authorised accounts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_account_access_consent':      return await this.createAccountAccessConsent(args);
        case 'get_account_access_consent':         return await this.getAccountAccessConsent(args);
        case 'delete_account_access_consent':      return await this.deleteAccountAccessConsent(args);
        case 'list_accounts':                      return await this.listAccounts();
        case 'get_account':                        return await this.getAccount(args);
        case 'get_account_balances':               return await this.getAccountBalances(args);
        case 'list_balances':                      return await this.listBalances();
        case 'get_account_transactions':           return await this.getAccountTransactions(args);
        case 'list_transactions':                  return await this.listTransactions(args);
        case 'get_account_beneficiaries':          return await this.getAccountBeneficiaries(args);
        case 'list_beneficiaries':                 return await this.listBeneficiaries();
        case 'get_account_direct_debits':          return await this.getAccountDirectDebits(args);
        case 'list_direct_debits':                 return await this.listDirectDebits();
        case 'get_account_standing_orders':        return await this.getAccountStandingOrders(args);
        case 'list_standing_orders':               return await this.listStandingOrders();
        case 'get_account_scheduled_payments':     return await this.getAccountScheduledPayments(args);
        case 'list_scheduled_payments':            return await this.listScheduledPayments();
        case 'get_account_statements':             return await this.getAccountStatements(args);
        case 'get_account_statement':              return await this.getAccountStatement(args);
        case 'get_account_statement_transactions': return await this.getAccountStatementTransactions(args);
        case 'list_statements':                    return await this.listStatements();
        case 'get_account_offers':                 return await this.getAccountOffers(args);
        case 'list_offers':                        return await this.listOffers();
        case 'get_account_parties':                return await this.getAccountParties(args);
        case 'get_account_party':                  return await this.getAccountParty(args);
        case 'get_party':                          return await this.getParty();
        case 'get_account_product':                return await this.getAccountProduct(args);
        case 'list_products':                      return await this.listProducts();
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.xFapiInteractionId) {
      headers['x-fapi-interaction-id'] = this.xFapiInteractionId;
    }
    return headers;
  }

  private async obRequest(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Open Banking API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Open Banking API returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private buildDateQuery(from?: unknown, to?: unknown, fromKey = 'fromBookingDateTime', toKey = 'toBookingDateTime'): string {
    const params: string[] = [];
    if (from) params.push(`${fromKey}=${encodeURIComponent(String(from))}`);
    if (to) params.push(`${toKey}=${encodeURIComponent(String(to))}`);
    return params.length ? '?' + params.join('&') : '';
  }

  // ── Consent methods ────────────────────────────────────────────────────────

  private async createAccountAccessConsent(args: Record<string, unknown>): Promise<ToolResult> {
    const data: Record<string, unknown> = {
      Data: {
        Permissions: args['permissions'],
      },
      Risk: {},
    };
    if (args['expiration_date_time']) (data['Data'] as Record<string, unknown>)['ExpirationDateTime'] = args['expiration_date_time'];
    if (args['transaction_from_date_time']) (data['Data'] as Record<string, unknown>)['TransactionFromDateTime'] = args['transaction_from_date_time'];
    if (args['transaction_to_date_time']) (data['Data'] as Record<string, unknown>)['TransactionToDateTime'] = args['transaction_to_date_time'];
    return this.obRequest(this.url('/account-access-consents'), { method: 'POST', body: JSON.stringify(data) });
  }

  private async getAccountAccessConsent(args: Record<string, unknown>): Promise<ToolResult> {
    const consentId = args['consent_id'] as string;
    return this.obRequest(this.url(`/account-access-consents/${encodeURIComponent(consentId)}`));
  }

  private async deleteAccountAccessConsent(args: Record<string, unknown>): Promise<ToolResult> {
    const consentId = args['consent_id'] as string;
    return this.obRequest(this.url(`/account-access-consents/${encodeURIComponent(consentId)}`), { method: 'DELETE' });
  }

  // ── Account methods ────────────────────────────────────────────────────────

  private async listAccounts(): Promise<ToolResult> {
    return this.obRequest(this.url('/accounts'));
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}`));
  }

  // ── Balance methods ────────────────────────────────────────────────────────

  private async getAccountBalances(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/balances`));
  }

  private async listBalances(): Promise<ToolResult> {
    return this.obRequest(this.url('/balances'));
  }

  // ── Transaction methods ────────────────────────────────────────────────────

  private async getAccountTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    const q = this.buildDateQuery(args['from_booking_date_time'], args['to_booking_date_time']);
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/transactions${q}`));
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildDateQuery(args['from_booking_date_time'], args['to_booking_date_time']);
    return this.obRequest(this.url(`/transactions${q}`));
  }

  // ── Beneficiary methods ────────────────────────────────────────────────────

  private async getAccountBeneficiaries(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/beneficiaries`));
  }

  private async listBeneficiaries(): Promise<ToolResult> {
    return this.obRequest(this.url('/beneficiaries'));
  }

  // ── Direct Debit methods ───────────────────────────────────────────────────

  private async getAccountDirectDebits(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/direct-debits`));
  }

  private async listDirectDebits(): Promise<ToolResult> {
    return this.obRequest(this.url('/direct-debits'));
  }

  // ── Standing Order methods ─────────────────────────────────────────────────

  private async getAccountStandingOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/standing-orders`));
  }

  private async listStandingOrders(): Promise<ToolResult> {
    return this.obRequest(this.url('/standing-orders'));
  }

  // ── Scheduled Payment methods ──────────────────────────────────────────────

  private async getAccountScheduledPayments(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/scheduled-payments`));
  }

  private async listScheduledPayments(): Promise<ToolResult> {
    return this.obRequest(this.url('/scheduled-payments'));
  }

  // ── Statement methods ──────────────────────────────────────────────────────

  private async getAccountStatements(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    const q = this.buildDateQuery(args['from_statement_date_time'], args['to_statement_date_time'], 'fromStatementDateTime', 'toStatementDateTime');
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/statements${q}`));
  }

  private async getAccountStatement(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    const statementId = args['statement_id'] as string;
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/statements/${encodeURIComponent(statementId)}`));
  }

  private async getAccountStatementTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    const statementId = args['statement_id'] as string;
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/statements/${encodeURIComponent(statementId)}/transactions`));
  }

  private async listStatements(): Promise<ToolResult> {
    return this.obRequest(this.url('/statements'));
  }

  // ── Offer methods ──────────────────────────────────────────────────────────

  private async getAccountOffers(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/offers`));
  }

  private async listOffers(): Promise<ToolResult> {
    return this.obRequest(this.url('/offers'));
  }

  // ── Party methods ──────────────────────────────────────────────────────────

  private async getAccountParties(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/parties`));
  }

  private async getAccountParty(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/party`));
  }

  private async getParty(): Promise<ToolResult> {
    return this.obRequest(this.url('/party'));
  }

  // ── Product methods ────────────────────────────────────────────────────────

  private async getAccountProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args['account_id'] as string;
    return this.obRequest(this.url(`/accounts/${encodeURIComponent(accountId)}/product`));
  }

  private async listProducts(): Promise<ToolResult> {
    return this.obRequest(this.url('/products'));
  }
}
