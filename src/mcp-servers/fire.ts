/**
 * Fire Financial Services MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.fire.com/business
// Auth: Bearer token (obtained via POST /v1/apps/accesstokens)
// Docs: https://docs.fire.com/
// Rate limits: Standard business API rate limits apply

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FireConfig {
  /** Bearer access token obtained from the authenticate endpoint */
  accessToken: string;
  /** Base URL — defaults to https://api.fire.com/business */
  baseUrl?: string;
}

export class FireMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: FireConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://api.fire.com/business';
  }

  static catalog() {
    return {
      name: 'fire',
      displayName: 'Fire Financial Services',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['fire', 'banking', 'payments', 'accounts', 'batch', 'transfers', 'cards', 'direct-debit', 'open-banking'],
      toolNames: [
        'list_accounts',
        'get_account',
        'get_account_transactions',
        'list_batches',
        'create_batch_payment',
        'get_batch',
        'add_bank_transfer_to_batch',
        'submit_batch',
        'list_payees',
        'list_cards',
        'get_card_transactions',
        'block_card',
        'unblock_card',
        'list_direct_debit_mandates',
        'get_mandate',
        'new_payment_request',
        'get_payment_details',
        'list_users',
        'get_user',
      ],
      description: 'Fire Financial Services Business API: accounts, batch payments, bank transfers, cards, direct debits, and open payment requests.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // Accounts
      {
        name: 'list_accounts',
        description: 'List all fire.com accounts on your business profile.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_account',
        description: 'Retrieve details of a specific fire.com account by internal account number (ican).',
        inputSchema: {
          type: 'object',
          properties: {
            ican: { type: 'number', description: 'Internal account number (ican)' },
          },
          required: ['ican'],
        },
      },
      {
        name: 'get_account_transactions',
        description: 'List transactions for a specific account. Supports optional date range and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            ican: { type: 'number', description: 'Internal account number (ican)' },
            dateRangeFrom: { type: 'number', description: 'Start of date range as Unix timestamp in milliseconds (optional)' },
            dateRangeTo: { type: 'number', description: 'End of date range as Unix timestamp in milliseconds (optional)' },
            limit: { type: 'number', description: 'Number of records to return (optional, default 10)' },
            offset: { type: 'number', description: 'Offset for pagination (optional)' },
          },
          required: ['ican'],
        },
      },
      // Batch payments
      {
        name: 'list_batches',
        description: 'List all payment batches, optionally filtered by status or type.',
        inputSchema: {
          type: 'object',
          properties: {
            batchStatus: { type: 'string', description: 'Filter by batch status (e.g. PENDING_APPROVAL, COMPLETE)' },
            batchTypes: { type: 'string', description: 'Comma-separated batch types (e.g. BANK_TRANSFER)' },
          },
        },
      },
      {
        name: 'create_batch_payment',
        description: 'Create a new batch of payments. Returns a batchUuid to add items and submit.',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Batch type: BANK_TRANSFER or INTERNAL_TRANSFER' },
            currency: { type: 'string', description: 'ISO 4217 currency code (e.g. EUR, GBP)' },
            batchName: { type: 'string', description: 'Descriptive name for the batch' },
            jobNumber: { type: 'string', description: 'Optional job/reference number for internal tracking' },
            callbackUrl: { type: 'string', description: 'Optional URL for batch completion webhook callback' },
          },
          required: ['type', 'currency', 'batchName'],
        },
      },
      {
        name: 'get_batch',
        description: 'Get details of a single batch by UUID, including status, item count, and totals.',
        inputSchema: {
          type: 'object',
          properties: {
            batchUuid: { type: 'string', description: 'UUID of the batch' },
          },
          required: ['batchUuid'],
        },
      },
      {
        name: 'add_bank_transfer_to_batch',
        description: 'Add a bank transfer payment item to an existing open batch.',
        inputSchema: {
          type: 'object',
          properties: {
            batchUuid: { type: 'string', description: 'UUID of the batch to add the transfer to' },
            icanFrom: { type: 'number', description: 'Source account internal account number (ican)' },
            amount: { type: 'number', description: 'Amount in minor units (e.g. cents)' },
            reference: { type: 'string', description: 'Payment reference shown on the statement' },
            payeeId: { type: 'number', description: 'ID of the target payee' },
          },
          required: ['batchUuid', 'icanFrom', 'amount', 'reference', 'payeeId'],
        },
      },
      {
        name: 'submit_batch',
        description: 'Submit a batch for approval. Batch must be in OPEN status.',
        inputSchema: {
          type: 'object',
          properties: {
            batchUuid: { type: 'string', description: 'UUID of the batch to submit' },
          },
          required: ['batchUuid'],
        },
      },
      // Payees
      {
        name: 'list_payees',
        description: 'List all payee bank accounts registered on your fire.com account.',
        inputSchema: { type: 'object', properties: {} },
      },
      // Cards
      {
        name: 'list_cards',
        description: 'List all debit cards on your fire.com account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_card_transactions',
        description: 'List transactions for a specific debit card by card ID.',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: { type: 'number', description: 'Card ID' },
            limit: { type: 'number', description: 'Number of records to return (optional)' },
            offset: { type: 'number', description: 'Offset for pagination (optional)' },
          },
          required: ['cardId'],
        },
      },
      {
        name: 'block_card',
        description: 'Block a debit card to prevent further transactions.',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: { type: 'number', description: 'Card ID to block' },
          },
          required: ['cardId'],
        },
      },
      {
        name: 'unblock_card',
        description: 'Unblock a previously blocked debit card.',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: { type: 'number', description: 'Card ID to unblock' },
          },
          required: ['cardId'],
        },
      },
      // Direct Debits
      {
        name: 'list_direct_debit_mandates',
        description: 'List all direct debit mandates on your fire.com account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_mandate',
        description: 'Get details of a specific direct debit mandate by UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            mandateUuid: { type: 'string', description: 'UUID of the direct debit mandate' },
          },
          required: ['mandateUuid'],
        },
      },
      // Open Payments
      {
        name: 'new_payment_request',
        description: 'Create a Fire Open Payment request (open banking payment initiation). Returns a payment URL to send to the payer.',
        inputSchema: {
          type: 'object',
          properties: {
            currency: { type: 'string', description: 'ISO 4217 currency code (e.g. EUR)' },
            amount: { type: 'number', description: 'Amount in minor units (e.g. cents)' },
            myRef: { type: 'string', description: 'Internal reference for the payment' },
            description: { type: 'string', description: 'Description shown to the payer' },
            maxNumberPayments: { type: 'number', description: 'Maximum number of payments allowed for this request (optional)' },
          },
          required: ['currency', 'amount', 'myRef', 'description'],
        },
      },
      {
        name: 'get_payment_details',
        description: 'Retrieve the details and current status of an open payment by its UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            paymentUuid: { type: 'string', description: 'UUID of the payment request' },
          },
          required: ['paymentUuid'],
        },
      },
      // Users
      {
        name: 'list_users',
        description: 'List all users on your fire.com business account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_user',
        description: 'Get details of a specific fire.com user by user ID.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'number', description: 'User ID' },
          },
          required: ['userId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_accounts':
          return await this.request('GET', '/v1/accounts');
        case 'get_account':
          return await this.request('GET', `/v1/accounts/${args.ican as number}`);
        case 'get_account_transactions': {
          const params = new URLSearchParams();
          if (args.dateRangeFrom != null) params.set('dateRangeFrom', String(args.dateRangeFrom));
          if (args.dateRangeTo != null) params.set('dateRangeTo', String(args.dateRangeTo));
          if (args.limit != null) params.set('limit', String(args.limit));
          if (args.offset != null) params.set('offset', String(args.offset));
          const qs = params.toString() ? `?${params.toString()}` : '';
          return await this.request('GET', `/v3/accounts/${args.ican as number}/transactions${qs}`);
        }
        case 'list_batches': {
          const params = new URLSearchParams();
          if (args.batchStatus) params.set('batchStatus', args.batchStatus as string);
          if (args.batchTypes) params.set('batchTypes', args.batchTypes as string);
          const qs = params.toString() ? `?${params.toString()}` : '';
          return await this.request('GET', `/v1/batches${qs}`);
        }
        case 'create_batch_payment': {
          const body: Record<string, unknown> = {
            type: args.type,
            currency: args.currency,
            batchName: args.batchName,
          };
          if (args.jobNumber) body['jobNumber'] = args.jobNumber;
          if (args.callbackUrl) body['callbackUrl'] = args.callbackUrl;
          return await this.request('POST', '/v1/batches', body);
        }
        case 'get_batch':
          return await this.request('GET', `/v1/batches/${args.batchUuid as string}`);
        case 'add_bank_transfer_to_batch':
          return await this.request('POST', `/v1/batches/${args.batchUuid as string}/banktransfers`, {
            icanFrom: args.icanFrom,
            amount: args.amount,
            reference: args.reference,
            payeeId: args.payeeId,
          });
        case 'submit_batch':
          return await this.request('PUT', `/v1/batches/${args.batchUuid as string}`);
        case 'list_payees':
          return await this.request('GET', '/v1/payees');
        case 'list_cards':
          return await this.request('GET', '/v1/cards');
        case 'get_card_transactions': {
          const params = new URLSearchParams();
          if (args.limit != null) params.set('limit', String(args.limit));
          if (args.offset != null) params.set('offset', String(args.offset));
          const qs = params.toString() ? `?${params.toString()}` : '';
          return await this.request('GET', `/v1/cards/${args.cardId as number}/transactions${qs}`);
        }
        case 'block_card':
          return await this.request('POST', `/v1/cards/${args.cardId as number}/block`);
        case 'unblock_card':
          return await this.request('POST', `/v1/cards/${args.cardId as number}/unblock`);
        case 'list_direct_debit_mandates':
          return await this.request('GET', '/v1/mandates');
        case 'get_mandate':
          return await this.request('GET', `/v1/mandates/${args.mandateUuid as string}`);
        case 'new_payment_request': {
          const body: Record<string, unknown> = {
            currency: args.currency,
            amount: args.amount,
            myRef: args.myRef,
            description: args.description,
          };
          if (args.maxNumberPayments != null) body['maxNumberPayments'] = args.maxNumberPayments;
          return await this.request('POST', '/v1/paymentrequests', body);
        }
        case 'get_payment_details':
          return await this.request('GET', `/v1/payments/${args.paymentUuid as string}`);
        case 'list_users':
          return await this.request('GET', '/v1/users');
        case 'get_user':
          return await this.request('GET', `/v1/user/${args.userId as number}`);
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

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const init: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Fire API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Fire API returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };

  }
}
