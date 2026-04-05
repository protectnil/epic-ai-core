/**
 * Open Banking Project Switzerland (Swiss NextGen API) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.dev.openbankingproject.ch
// Auth: Bearer token (OAuth2 / BearerAuthOAuth) via Authorization header
// Docs: https://github.com/openbankingproject-ch/obp-apis
// Spec: https://raw.githubusercontent.com/openbankingproject-ch/obp-apis/master/swiss-ng-api.yaml
// Standard: Berlin Group NextGenPSD2 v1.3.4 (Swiss edition 1.3.8.1-CH)
// Rate limits: Determined by individual ASPSP (bank) implementations

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenBankingProjectChConfig {
  bearerToken: string;
  baseUrl?: string;
}

export class OpenBankingProjectChMCPServer extends MCPAdapterBase {
  private readonly bearerToken: string;
  private readonly baseUrl: string;

  constructor(config: OpenBankingProjectChConfig) {
    super();
    this.bearerToken = config.bearerToken;
    this.baseUrl = config.baseUrl || 'https://api.dev.openbankingproject.ch';
  }

  static catalog() {
    return {
      name: 'openbankingproject-ch',
      displayName: 'Open Banking Project Switzerland (Swiss NextGen API)',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'open banking', 'swiss', 'switzerland', 'nextgen', 'nextgenpsd2', 'psd2',
        'berlin group', 'aspsp', 'tpp', 'xs2a', 'account', 'payment', 'consent',
        'balance', 'transaction', 'funds confirmation', 'sca', 'oauth',
        'sepa', 'credit transfer', 'direct debit', 'banking api',
      ],
      toolNames: [
        'get_account_list',
        'get_account_details',
        'get_account_balances',
        'get_transaction_list',
        'get_transaction_details',
        'create_consent',
        'get_consent',
        'delete_consent',
        'get_consent_status',
        'initiate_payment',
        'get_payment_information',
        'cancel_payment',
        'get_payment_status',
        'check_funds_availability',
      ],
      description: 'Swiss NextGen Banking API (Berlin Group NextGenPSD2): account info, balances, transactions, payment initiation, consent management, and funds confirmation for Swiss Open Banking.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Account Information ────────────────────────────────────────────────
      {
        name: 'get_account_list',
        description: 'Get list of all accessible payment accounts for the authenticated PSU (Payment Service User). Returns account identifiers, IBANs, currency, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            withBalance: {
              type: 'boolean',
              description: 'If true, include account balances in the response (requires PIIS consent)',
            },
          },
        },
      },
      {
        name: 'get_account_details',
        description: 'Get detailed information for a specific payment account by account ID — IBAN, currency, account name, product, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'The account resource identifier (account-id) returned from get_account_list',
            },
            withBalance: {
              type: 'boolean',
              description: 'If true, include account balance in the response',
            },
          },
          required: ['accountId'],
        },
      },
      {
        name: 'get_account_balances',
        description: 'Get current balance(s) for a specific account — closing booked, expected, authorised, and opening booked balances.',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'The account resource identifier',
            },
          },
          required: ['accountId'],
        },
      },
      {
        name: 'get_transaction_list',
        description: 'Get transaction history for a specific account filtered by date range and booking status.',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'The account resource identifier',
            },
            dateFrom: {
              type: 'string',
              description: 'Start date for transactions in ISO 8601 format (YYYY-MM-DD)',
            },
            dateTo: {
              type: 'string',
              description: 'End date for transactions in ISO 8601 format (YYYY-MM-DD)',
            },
            bookingStatus: {
              type: 'string',
              description: 'Filter by booking status: booked, pending, or both (default: booked)',
            },
            withBalance: {
              type: 'boolean',
              description: 'If true, include running balance in transaction entries',
            },
          },
          required: ['accountId'],
        },
      },
      {
        name: 'get_transaction_details',
        description: 'Get detailed information for a specific transaction by account ID and transaction ID.',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'The account resource identifier',
            },
            transactionId: {
              type: 'string',
              description: 'The transaction resource identifier',
            },
          },
          required: ['accountId', 'transactionId'],
        },
      },
      // ── Consent Management ─────────────────────────────────────────────────
      {
        name: 'create_consent',
        description: 'Create an account information consent (AIS consent) to authorise access to account data for a given period and set of permissions.',
        inputSchema: {
          type: 'object',
          properties: {
            access: {
              type: 'object',
              description: 'Access permissions object — specify accounts, balances, transactions arrays (use allAccounts or allPsd2 for broad access)',
            },
            recurringIndicator: {
              type: 'boolean',
              description: 'If true, consent allows recurring access; false for one-time access',
            },
            validUntil: {
              type: 'string',
              description: 'Consent expiry date in ISO 8601 format (YYYY-MM-DD)',
            },
            frequencyPerDay: {
              type: 'number',
              description: 'Maximum number of accesses per day (1-4 for recurring)',
            },
          },
          required: ['access', 'recurringIndicator', 'validUntil', 'frequencyPerDay'],
        },
      },
      {
        name: 'get_consent',
        description: 'Retrieve an existing AIS consent by consent ID — returns access permissions, status, and expiry.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The consent resource identifier',
            },
          },
          required: ['consentId'],
        },
      },
      {
        name: 'delete_consent',
        description: 'Revoke and delete an existing AIS consent by consent ID.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The consent resource identifier to delete',
            },
          },
          required: ['consentId'],
        },
      },
      {
        name: 'get_consent_status',
        description: 'Get the current status of an AIS consent — received, valid, rejected, or expired.',
        inputSchema: {
          type: 'object',
          properties: {
            consentId: {
              type: 'string',
              description: 'The consent resource identifier',
            },
          },
          required: ['consentId'],
        },
      },
      // ── Payment Initiation ─────────────────────────────────────────────────
      {
        name: 'initiate_payment',
        description: 'Initiate a payment order — supports single payments, periodic payments, and bulk payments. Payment product determines the scheme (sepa-credit-transfers, instant-sepa-credit-transfers, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            paymentService: {
              type: 'string',
              description: 'Payment service type: payments, bulk-payments, or periodic-payments',
            },
            paymentProduct: {
              type: 'string',
              description: 'Payment product: sepa-credit-transfers, instant-sepa-credit-transfers, target-2-payments, cross-border-credit-transfers',
            },
            creditorName: {
              type: 'string',
              description: 'Name of the payee (beneficiary)',
            },
            creditorIban: {
              type: 'string',
              description: 'IBAN of the payee account',
            },
            instructedAmount: {
              type: 'object',
              description: 'Payment amount object with currency (e.g. CHF) and amount (e.g. 100.00)',
            },
            remittanceInfo: {
              type: 'string',
              description: 'Payment reference / remittance information (free text or structured)',
            },
          },
          required: ['paymentService', 'paymentProduct', 'creditorName', 'creditorIban', 'instructedAmount'],
        },
      },
      {
        name: 'get_payment_information',
        description: 'Retrieve all information for an existing payment order by payment service, product, and payment ID.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentService: {
              type: 'string',
              description: 'Payment service type: payments, bulk-payments, or periodic-payments',
            },
            paymentProduct: {
              type: 'string',
              description: 'Payment product (e.g. sepa-credit-transfers)',
            },
            paymentId: {
              type: 'string',
              description: 'The payment resource identifier',
            },
          },
          required: ['paymentService', 'paymentProduct', 'paymentId'],
        },
      },
      {
        name: 'cancel_payment',
        description: 'Cancel a payment order that has not yet been executed. Requires authorisation if the payment requires SCA.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentService: {
              type: 'string',
              description: 'Payment service type: payments, bulk-payments, or periodic-payments',
            },
            paymentProduct: {
              type: 'string',
              description: 'Payment product (e.g. sepa-credit-transfers)',
            },
            paymentId: {
              type: 'string',
              description: 'The payment resource identifier to cancel',
            },
          },
          required: ['paymentService', 'paymentProduct', 'paymentId'],
        },
      },
      {
        name: 'get_payment_status',
        description: 'Get the current transaction/execution status of a payment order — RCVD, PDNG, ACCP, ACTC, ACSP, ACSC, ACWC, ACWP, RJCT, CANC, ACFC, PATC.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentService: {
              type: 'string',
              description: 'Payment service type: payments, bulk-payments, or periodic-payments',
            },
            paymentProduct: {
              type: 'string',
              description: 'Payment product (e.g. sepa-credit-transfers)',
            },
            paymentId: {
              type: 'string',
              description: 'The payment resource identifier',
            },
          },
          required: ['paymentService', 'paymentProduct', 'paymentId'],
        },
      },
      // ── Funds Confirmation ─────────────────────────────────────────────────
      {
        name: 'check_funds_availability',
        description: 'Check whether a specific amount is available on an account (PIIS — Payment Instrument Issuer Service). Returns true/false funds confirmation.',
        inputSchema: {
          type: 'object',
          properties: {
            cardNumber: {
              type: 'string',
              description: 'Payment card number (optional, used when checking card-based instruments)',
            },
            account: {
              type: 'object',
              description: 'Account object with IBAN or other account identifier',
            },
            instructedAmount: {
              type: 'object',
              description: 'Amount to check — object with currency and amount fields',
            },
          },
          required: ['account', 'instructedAmount'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account_list':          return this.getAccountList(args);
        case 'get_account_details':       return this.getAccountDetails(args);
        case 'get_account_balances':      return this.getAccountBalances(args);
        case 'get_transaction_list':      return this.getTransactionList(args);
        case 'get_transaction_details':   return this.getTransactionDetails(args);
        case 'create_consent':            return this.createConsent(args);
        case 'get_consent':               return this.getConsent(args);
        case 'delete_consent':            return this.deleteConsent(args);
        case 'get_consent_status':        return this.getConsentStatus(args);
        case 'initiate_payment':          return this.initiatePayment(args);
        case 'get_payment_information':   return this.getPaymentInformation(args);
        case 'cancel_payment':            return this.cancelPayment(args);
        case 'get_payment_status':        return this.getPaymentStatus(args);
        case 'check_funds_availability':  return this.checkFundsAvailability(args);
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

  private async request(
    method: string,
    path: string,
    query?: Record<string, string>,
    body?: unknown,
  ): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, v);
      }
    }
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Accept': 'application/json',
      'X-Request-ID': crypto.randomUUID(),
    };
    if (body) headers['Content-Type'] = 'application/json';

    const response = await this.fetchWithRetry(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${text.slice(0, 500)}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }

    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Account methods ────────────────────────────────────────────────────────

  private async getAccountList(args: Record<string, unknown>): Promise<ToolResult> {
    const query: Record<string, string> = {};
    if (args.withBalance) query['withBalance'] = String(args.withBalance);
    return this.request('GET', '/v1/accounts', query);
  }

  private async getAccountDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.accountId) return { content: [{ type: 'text', text: 'accountId is required' }], isError: true };
    const query: Record<string, string> = {};
    if (args.withBalance) query['withBalance'] = String(args.withBalance);
    return this.request('GET', `/v1/accounts/${args.accountId}`, query);
  }

  private async getAccountBalances(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.accountId) return { content: [{ type: 'text', text: 'accountId is required' }], isError: true };
    return this.request('GET', `/v1/accounts/${args.accountId}/balances`);
  }

  private async getTransactionList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.accountId) return { content: [{ type: 'text', text: 'accountId is required' }], isError: true };
    const query: Record<string, string> = {
      bookingStatus: (args.bookingStatus as string) ?? 'booked',
    };
    if (args.dateFrom)    query['dateFrom']    = args.dateFrom as string;
    if (args.dateTo)      query['dateTo']      = args.dateTo as string;
    if (args.withBalance) query['withBalance'] = String(args.withBalance);
    return this.request('GET', `/v1/accounts/${args.accountId}/transactions`, query);
  }

  private async getTransactionDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.accountId)     return { content: [{ type: 'text', text: 'accountId is required' }], isError: true };
    if (!args.transactionId) return { content: [{ type: 'text', text: 'transactionId is required' }], isError: true };
    return this.request('GET', `/v1/accounts/${args.accountId}/transactions/${args.transactionId}`);
  }

  // ── Consent methods ────────────────────────────────────────────────────────

  private async createConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.access)             return { content: [{ type: 'text', text: 'access is required' }], isError: true };
    if (!args.validUntil)         return { content: [{ type: 'text', text: 'validUntil is required' }], isError: true };
    if (args.frequencyPerDay === undefined) return { content: [{ type: 'text', text: 'frequencyPerDay is required' }], isError: true };
    const body = {
      access: args.access,
      recurringIndicator: (args.recurringIndicator as boolean) ?? true,
      validUntil: args.validUntil,
      frequencyPerDay: args.frequencyPerDay,
      combinedServiceIndicator: false,
    };
    return this.request('POST', '/v1/consents', undefined, body);
  }

  private async getConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId) return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    return this.request('GET', `/v1/consents/${args.consentId}`);
  }

  private async deleteConsent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId) return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    return this.request('DELETE', `/v1/consents/${args.consentId}`);
  }

  private async getConsentStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.consentId) return { content: [{ type: 'text', text: 'consentId is required' }], isError: true };
    return this.request('GET', `/v1/consents/${args.consentId}/status`);
  }

  // ── Payment methods ────────────────────────────────────────────────────────

  private async initiatePayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.paymentService) return { content: [{ type: 'text', text: 'paymentService is required' }], isError: true };
    if (!args.paymentProduct) return { content: [{ type: 'text', text: 'paymentProduct is required' }], isError: true };
    if (!args.creditorName)   return { content: [{ type: 'text', text: 'creditorName is required' }], isError: true };
    if (!args.creditorIban)   return { content: [{ type: 'text', text: 'creditorIban is required' }], isError: true };
    if (!args.instructedAmount) return { content: [{ type: 'text', text: 'instructedAmount is required' }], isError: true };
    const body: Record<string, unknown> = {
      creditorName: args.creditorName,
      creditorAccount: { iban: args.creditorIban },
      instructedAmount: args.instructedAmount,
    };
    if (args.remittanceInfo) body['remittanceInformationUnstructured'] = args.remittanceInfo;
    return this.request(
      'POST',
      `/v1/${args.paymentService}/${args.paymentProduct}`,
      undefined,
      body,
    );
  }

  private async getPaymentInformation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.paymentService) return { content: [{ type: 'text', text: 'paymentService is required' }], isError: true };
    if (!args.paymentProduct) return { content: [{ type: 'text', text: 'paymentProduct is required' }], isError: true };
    if (!args.paymentId)      return { content: [{ type: 'text', text: 'paymentId is required' }], isError: true };
    return this.request('GET', `/v1/${args.paymentService}/${args.paymentProduct}/${args.paymentId}`);
  }

  private async cancelPayment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.paymentService) return { content: [{ type: 'text', text: 'paymentService is required' }], isError: true };
    if (!args.paymentProduct) return { content: [{ type: 'text', text: 'paymentProduct is required' }], isError: true };
    if (!args.paymentId)      return { content: [{ type: 'text', text: 'paymentId is required' }], isError: true };
    return this.request('DELETE', `/v1/${args.paymentService}/${args.paymentProduct}/${args.paymentId}`);
  }

  private async getPaymentStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.paymentService) return { content: [{ type: 'text', text: 'paymentService is required' }], isError: true };
    if (!args.paymentProduct) return { content: [{ type: 'text', text: 'paymentProduct is required' }], isError: true };
    if (!args.paymentId)      return { content: [{ type: 'text', text: 'paymentId is required' }], isError: true };
    return this.request('GET', `/v1/${args.paymentService}/${args.paymentProduct}/${args.paymentId}/status`);
  }

  // ── Funds confirmation ─────────────────────────────────────────────────────

  private async checkFundsAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account)           return { content: [{ type: 'text', text: 'account is required' }], isError: true };
    if (!args.instructedAmount)  return { content: [{ type: 'text', text: 'instructedAmount is required' }], isError: true };
    const body: Record<string, unknown> = {
      account: args.account,
      instructedAmount: args.instructedAmount,
    };
    if (args.cardNumber) body['cardNumber'] = args.cardNumber;
    return this.request('POST', '/v1/funds-confirmations', undefined, body);
  }
}
