/**
 * NBG Greece MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official NBG Greece MCP server was found on GitHub.
//
// Base URL: https://apis.nbg.gr/sandbox/uk.openbanking.accountinfo/oauth2/v3.1.5 (sandbox)
//           https://services.nbg.gr/apis/open-banking/v3.1.5/aisp (production)
// Auth: OAuth2 Authorization Code Flow or Client Credentials Flow.
//   Token URL: https://my.nbg.gr/identity/connect/token
//   Authorization URL: https://my.nbg.gr/identity/connect/authorize
//   Scopes (sandbox): sandbox-uk-account-info-api-v1 offline_access
//   Scopes (production): accounts offline_access
//   Also requires Client-Id header on all requests.
// Rate limits: Not publicly documented. Contact NBG Technology HUB for details.
// Docs: https://developer.nbg.gr/
// Note: NBG (National Bank of Greece) UK Open Banking Account and Transaction API v3.1.5.
//   Implements the UK Open Banking Specification v3.1.5 for account information services.
//   Supports both sandbox testing (with sandbox-id header) and production usage.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NbgGrConfig {
  accessToken: string;
  clientId: string;
  baseUrl?: string;
  sandboxId?: string;
}

export class NbgGrMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly clientId: string;
  private readonly baseUrl: string;
  private readonly sandboxId: string | undefined;

  constructor(config: NbgGrConfig) {
    super();
    this.accessToken = config.accessToken;
    this.clientId = config.clientId;
    this.baseUrl = (
      config.baseUrl ||
      'https://apis.nbg.gr/sandbox/uk.openbanking.accountinfo/oauth2/v3.1.5'
    ).replace(/\/$/, '');
    this.sandboxId = config.sandboxId;
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Client-Id': this.clientId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.sandboxId) {
      headers['sandbox-id'] = this.sandboxId;
    }
    return { ...headers, ...extra };
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: this.buildHeaders(),
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await this.fetchWithRetry(url, init);
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Network error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `NBG API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text.slice(0, 10_000) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_account_access_consent',
        description:
          'Create an Account Access Consent to obtain authorisation for an AISP to access account data. Returns a ConsentId that must be authorised by the account holder before account data can be retrieved.',
        inputSchema: {
          type: 'object',
          properties: {
            permissions: {
              type: 'array',
              items: { type: 'string' },
              description:
                'List of permissions to request. Valid values include: ReadAccountsBasic, ReadAccountsDetail, ReadBalances, ReadBeneficiariesBasic, ReadBeneficiariesDetail, ReadTransactionsBasic, ReadTransactionsDetail, ReadTransactionsCredits, ReadTransactionsDebits, ReadStatementsBasic, ReadStatementsDetail, ReadParty, ReadScheduledPaymentsBasic, ReadScheduledPaymentsDetail, ReadStandingOrdersBasic, ReadStandingOrdersDetail.',
            },
            expiration_date_time: {
              type: 'string',
              description: 'Optional consent expiration date-time in ISO 8601 format (e.g. 2026-12-31T00:00:00Z).',
            },
            transaction_from_date_time: {
              type: 'string',
              description: 'Optional start date-time for transaction data access in ISO 8601 format.',
            },
            transaction_to_date_time: {
              type: 'string',
              description: 'Optional end date-time for transaction data access in ISO 8601 format.',
            },
          },
          required: ['permissions'],
        },
      },
      {
        name: 'get_account_access_consent',
        description:
          'Retrieve an existing Account Access Consent by its ConsentId. Returns the consent status, permissions granted, and validity period.',
        inputSchema: {
          type: 'object',
          properties: {
            consent_id: {
              type: 'string',
              description: 'The ConsentId of the account access consent to retrieve.',
            },
          },
          required: ['consent_id'],
        },
      },
      {
        name: 'delete_account_access_consent',
        description:
          'Delete (revoke) an Account Access Consent by its ConsentId. Once deleted, the AISP can no longer access data under this consent.',
        inputSchema: {
          type: 'object',
          properties: {
            consent_id: {
              type: 'string',
              description: 'The ConsentId of the account access consent to delete.',
            },
          },
          required: ['consent_id'],
        },
      },
      {
        name: 'list_accounts',
        description:
          'Retrieve a list of all accounts accessible under the current OAuth2 consent. Returns account identifiers, types, and basic details.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_account',
        description:
          'Retrieve details for a specific bank account by its AccountId, including account type, currency, and identification details.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The AccountId of the account to retrieve.',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_account_balances',
        description:
          'Retrieve the current balances for a specific account. Returns balance types such as ClosingAvailable, ClosingBooked, OpeningAvailable, and OpeningBooked with their amounts and currency.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The AccountId of the account to retrieve balances for.',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_account_transactions',
        description:
          'Retrieve transactions for a specific account, optionally filtered by booking date range.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The AccountId of the account to retrieve transactions for.',
            },
            from_booking_date_time: {
              type: 'string',
              description: 'Optional start date-time filter in ISO 8601 format (e.g. 2026-01-01T00:00:00Z).',
            },
            to_booking_date_time: {
              type: 'string',
              description: 'Optional end date-time filter in ISO 8601 format (e.g. 2026-03-31T23:59:59Z).',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_account_beneficiaries',
        description:
          'Retrieve the list of beneficiaries (payees) registered for a specific account.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The AccountId of the account to retrieve beneficiaries for.',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_account_standing_orders',
        description:
          'Retrieve standing orders (recurring payment instructions) for a specific account.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The AccountId of the account to retrieve standing orders for.',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_account_scheduled_payments',
        description:
          'Retrieve scheduled future payments for a specific account.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The AccountId of the account to retrieve scheduled payments for.',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_account_statements',
        description:
          'Retrieve a list of statements for a specific account, optionally filtered by date range.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The AccountId of the account to retrieve statements for.',
            },
            from_statement_date_time: {
              type: 'string',
              description: 'Optional start date-time filter in ISO 8601 format.',
            },
            to_statement_date_time: {
              type: 'string',
              description: 'Optional end date-time filter in ISO 8601 format.',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_account_statement',
        description:
          'Retrieve a specific statement for an account by StatementId.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The AccountId of the account.',
            },
            statement_id: {
              type: 'string',
              description: 'The StatementId of the specific statement to retrieve.',
            },
          },
          required: ['account_id', 'statement_id'],
        },
      },
      {
        name: 'get_account_statement_transactions',
        description:
          'Retrieve transactions associated with a specific statement for an account.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The AccountId of the account.',
            },
            statement_id: {
              type: 'string',
              description: 'The StatementId of the statement whose transactions to retrieve.',
            },
          },
          required: ['account_id', 'statement_id'],
        },
      },
      {
        name: 'get_account_parties',
        description:
          'Retrieve parties (persons or organisations) associated with a specific account.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The AccountId of the account to retrieve parties for.',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_party',
        description:
          'Retrieve the party (person or organisation) associated with the current OAuth2 token holder.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_sandbox',
        description:
          'Create a new sandbox environment for testing NBG Open Banking APIs without affecting production data.',
        inputSchema: {
          type: 'object',
          properties: {
            sandbox_id: {
              type: 'string',
              description: 'A unique identifier for the sandbox environment to create.',
            },
          },
          required: ['sandbox_id'],
        },
      },
      {
        name: 'export_sandbox',
        description:
          'Export the current state of a sandbox environment by its SandboxId, useful for inspecting sandbox data.',
        inputSchema: {
          type: 'object',
          properties: {
            sandbox_id: {
              type: 'string',
              description: 'The SandboxId of the sandbox to export.',
            },
          },
          required: ['sandbox_id'],
        },
      },
      {
        name: 'delete_sandbox',
        description:
          'Delete a sandbox environment by its SandboxId.',
        inputSchema: {
          type: 'object',
          properties: {
            sandbox_id: {
              type: 'string',
              description: 'The SandboxId of the sandbox to delete.',
            },
          },
          required: ['sandbox_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_account_access_consent':
          return await this.createAccountAccessConsent(args);
        case 'get_account_access_consent':
          return await this.getAccountAccessConsent(args);
        case 'delete_account_access_consent':
          return await this.deleteAccountAccessConsent(args);
        case 'list_accounts':
          return await this.request('GET', '/accounts');
        case 'get_account':
          return await this.getAccount(args);
        case 'get_account_balances':
          return await this.getAccountBalances(args);
        case 'get_account_transactions':
          return await this.getAccountTransactions(args);
        case 'get_account_beneficiaries':
          return await this.getAccountBeneficiaries(args);
        case 'get_account_standing_orders':
          return await this.getAccountStandingOrders(args);
        case 'get_account_scheduled_payments':
          return await this.getAccountScheduledPayments(args);
        case 'get_account_statements':
          return await this.getAccountStatements(args);
        case 'get_account_statement':
          return await this.getAccountStatement(args);
        case 'get_account_statement_transactions':
          return await this.getAccountStatementTransactions(args);
        case 'get_account_parties':
          return await this.getAccountParties(args);
        case 'get_party':
          return await this.request('GET', '/party');
        case 'create_sandbox':
          return await this.createSandbox(args);
        case 'export_sandbox':
          return await this.exportSandbox(args);
        case 'delete_sandbox':
          return await this.deleteSandbox(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async createAccountAccessConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.permissions || !Array.isArray(args.permissions)) {
      return {
        content: [{ type: 'text', text: 'permissions array is required' }],
        isError: true,
      };
    }
    const data: Record<string, unknown> = {
      Data: {
        Permissions: args.permissions,
      },
      Risk: {},
    };
    if (args.expiration_date_time) {
      (data['Data'] as Record<string, unknown>)['ExpirationDateTime'] = args.expiration_date_time;
    }
    if (args.transaction_from_date_time) {
      (data['Data'] as Record<string, unknown>)['TransactionFromDateTime'] = args.transaction_from_date_time;
    }
    if (args.transaction_to_date_time) {
      (data['Data'] as Record<string, unknown>)['TransactionToDateTime'] = args.transaction_to_date_time;
    }
    return this.request('POST', '/account-access-consents', data);
  }

  private async getAccountAccessConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consent_id) {
      return { content: [{ type: 'text', text: 'consent_id is required' }], isError: true };
    }
    return this.request('GET', `/account-access-consents/${args.consent_id}`);
  }

  private async deleteAccountAccessConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consent_id) {
      return { content: [{ type: 'text', text: 'consent_id is required' }], isError: true };
    }
    return this.request('DELETE', `/account-access-consents/${args.consent_id}`);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }
    return this.request('GET', `/accounts/${args.account_id}`);
  }

  private async getAccountBalances(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }
    return this.request('GET', `/accounts/${args.account_id}/balances`);
  }

  private async getAccountTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.from_booking_date_time) params.set('fromBookingDateTime', args.from_booking_date_time as string);
    if (args.to_booking_date_time) params.set('toBookingDateTime', args.to_booking_date_time as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/accounts/${args.account_id}/transactions${qs}`);
  }

  private async getAccountBeneficiaries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }
    return this.request('GET', `/accounts/${args.account_id}/beneficiaries`);
  }

  private async getAccountStandingOrders(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }
    return this.request('GET', `/accounts/${args.account_id}/standing-orders`);
  }

  private async getAccountScheduledPayments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }
    return this.request('GET', `/accounts/${args.account_id}/scheduled-payments`);
  }

  private async getAccountStatements(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.from_statement_date_time) params.set('fromStatementDateTime', args.from_statement_date_time as string);
    if (args.to_statement_date_time) params.set('toStatementDateTime', args.to_statement_date_time as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/accounts/${args.account_id}/statements${qs}`);
  }

  private async getAccountStatement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id || !args.statement_id) {
      return { content: [{ type: 'text', text: 'account_id and statement_id are required' }], isError: true };
    }
    return this.request('GET', `/accounts/${args.account_id}/statements/${args.statement_id}`);
  }

  private async getAccountStatementTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id || !args.statement_id) {
      return { content: [{ type: 'text', text: 'account_id and statement_id are required' }], isError: true };
    }
    return this.request('GET', `/accounts/${args.account_id}/statements/${args.statement_id}/transactions`);
  }

  private async getAccountParties(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }
    return this.request('GET', `/accounts/${args.account_id}/parties`);
  }

  private async createSandbox(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sandbox_id) {
      return { content: [{ type: 'text', text: 'sandbox_id is required' }], isError: true };
    }
    return this.request('POST', '/sandbox', { sandbox_id: args.sandbox_id });
  }

  private async exportSandbox(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sandbox_id) {
      return { content: [{ type: 'text', text: 'sandbox_id is required' }], isError: true };
    }
    return this.request('GET', `/sandbox/${args.sandbox_id}`);
  }

  private async deleteSandbox(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sandbox_id) {
      return { content: [{ type: 'text', text: 'sandbox_id is required' }], isError: true };
    }
    return this.request('DELETE', `/sandbox/${args.sandbox_id}`);
  }

  static catalog() {
    return {
      name: 'nbg-gr',
      displayName: 'NBG Greece Open Banking',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'nbg', 'national-bank-greece', 'open-banking', 'account', 'transaction',
        'balance', 'statement', 'consent', 'uk-ob', 'aisp', 'psd2', 'finance', 'banking', 'greece',
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
        'get_account_standing_orders',
        'get_account_scheduled_payments',
        'get_account_statements',
        'get_account_statement',
        'get_account_statement_transactions',
        'get_account_parties',
        'get_party',
        'create_sandbox',
        'export_sandbox',
        'delete_sandbox',
      ],
      description:
        'National Bank of Greece (NBG) UK Open Banking Account and Transaction API v3.1.5: manage consent, retrieve accounts, balances, transactions, beneficiaries, standing orders, scheduled payments, statements, and party information via the UK Open Banking standard.',
      author: 'protectnil' as const,
    };
  }
}
