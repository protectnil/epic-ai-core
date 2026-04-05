/**
 * bunq MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. bunq has not published an official MCP server.
//
// Base URL: https://api.bunq.com/v1 (production) or https://public-api.sandbox.bunq.com/v1 (sandbox)
// Auth: bunq uses a multi-step session setup:
//   1. POST /installation — register RSA public key, receive installationToken
//   2. POST /device-server — register device using installationToken
//   3. POST /session-server — create session using installationToken, receive sessionToken
//   All subsequent requests use: X-Bunq-Client-Authentication: <sessionToken>
//   Additionally requires: X-Bunq-Client-Request-Id (unique per request), X-Bunq-Language, X-Bunq-Region
// Docs: https://doc.bunq.com / https://beta.doc.bunq.com
// PSD2: Some endpoints require a PSD2 permit. Usage without permit is at own risk.
// Rate limits: Not publicly documented. bunq enforces rate limits server-side.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BunqConfig {
  sessionToken: string;
  userId: string | number;
  baseUrl?: string;
}

export class BunqMCPServer extends MCPAdapterBase {
  private readonly sessionToken: string;
  private readonly userId: string;
  private readonly baseUrl: string;

  constructor(config: BunqConfig) {
    super();
    this.sessionToken = config.sessionToken;
    this.userId = String(config.userId);
    this.baseUrl = config.baseUrl ?? 'https://api.bunq.com/v1';
  }

  static catalog() {
    return {
      name: 'bunq',
      displayName: 'bunq',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'bunq', 'banking', 'bank account', 'payment', 'transfer', 'monetary account',
        'card', 'debit card', 'credit card', 'request money', 'invoice', 'statement',
        'scheduled payment', 'direct debit', 'psd2', 'open banking', 'netherlands',
        'fintech', 'neobank', 'currency conversion', 'savings',
      ],
      toolNames: [
        'get_user',
        'list_monetary_accounts', 'get_monetary_account',
        'list_payments', 'get_payment', 'create_payment',
        'list_payment_batch', 'create_payment_batch',
        'list_request_inquiries', 'get_request_inquiry', 'create_request_inquiry',
        'list_schedule_payments', 'get_schedule_payment', 'create_schedule_payment',
        'list_cards', 'get_card',
        'list_draft_payments', 'get_draft_payment', 'create_draft_payment',
        'list_currency_conversions', 'get_currency_conversion',
        'list_customer_statements', 'create_customer_statement',
        'list_share_invite_responses', 'get_share_invite_response',
      ],
      description: 'Manage bunq bank accounts: monetary accounts, payments, transfers, request money, scheduled payments, cards, and account statements via the bunq REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── User ──────────────────────────────────────────────────────────────
      {
        name: 'get_user',
        description: 'Get details of the authenticated bunq user including name, email, and account status.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Monetary Accounts ──────────────────────────────────────────────────
      {
        name: 'list_monetary_accounts',
        description: 'List all monetary accounts (bank accounts) for the user, including balance and IBAN.',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of accounts to return (default: 10, max: 200)' },
            older_id: { type: 'number', description: 'Return accounts with ID older than this value (for pagination)' },
          },
        },
      },
      {
        name: 'get_monetary_account',
        description: 'Get details of a specific monetary account by its ID, including current balance and IBAN.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
          },
          required: ['monetary_account_id'],
        },
      },
      // ── Payments ──────────────────────────────────────────────────────────
      {
        name: 'list_payments',
        description: 'List payments for a specific monetary account, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            count: { type: 'number', description: 'Number of payments to return (default: 10, max: 200)' },
            older_id: { type: 'number', description: 'Return payments with ID older than this value (for pagination)' },
            newer_id: { type: 'number', description: 'Return payments with ID newer than this value' },
          },
          required: ['monetary_account_id'],
        },
      },
      {
        name: 'get_payment',
        description: 'Get details of a specific payment by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            payment_id: { type: 'number', description: 'Payment ID (required)' },
          },
          required: ['monetary_account_id', 'payment_id'],
        },
      },
      {
        name: 'create_payment',
        description: 'Create a new payment (bank transfer) from a monetary account to a recipient.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Source monetary account ID (required)' },
            amount_value: { type: 'string', description: 'Amount to transfer as a string (e.g. "10.00") (required)' },
            amount_currency: { type: 'string', description: 'Currency code (e.g. EUR) (required)' },
            counterparty_iban: { type: 'string', description: 'Recipient IBAN (required)' },
            counterparty_name: { type: 'string', description: 'Recipient name (required)' },
            description: { type: 'string', description: 'Payment description/reference' },
          },
          required: ['monetary_account_id', 'amount_value', 'amount_currency', 'counterparty_iban', 'counterparty_name'],
        },
      },
      // ── Payment Batch ──────────────────────────────────────────────────────
      {
        name: 'list_payment_batch',
        description: 'List payment batches for a monetary account.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            count: { type: 'number', description: 'Number of batches to return (default: 10, max: 200)' },
          },
          required: ['monetary_account_id'],
        },
      },
      {
        name: 'create_payment_batch',
        description: 'Create a batch of multiple payments in a single request.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Source monetary account ID (required)' },
            payments: {
              type: 'array',
              description: 'Array of payments to batch (required)',
              items: {
                type: 'object',
                properties: {
                  amount_value: { type: 'string', description: 'Amount as a string (e.g. "5.00")' },
                  amount_currency: { type: 'string', description: 'Currency code (e.g. EUR)' },
                  counterparty_iban: { type: 'string', description: 'Recipient IBAN' },
                  counterparty_name: { type: 'string', description: 'Recipient name' },
                  description: { type: 'string', description: 'Payment description' },
                },
              },
            },
          },
          required: ['monetary_account_id', 'payments'],
        },
      },
      // ── Request Inquiries ─────────────────────────────────────────────────
      {
        name: 'list_request_inquiries',
        description: 'List request-for-payment (money requests) sent from a monetary account.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            count: { type: 'number', description: 'Number of request inquiries to return (default: 10, max: 200)' },
            older_id: { type: 'number', description: 'Return requests older than this ID (for pagination)' },
          },
          required: ['monetary_account_id'],
        },
      },
      {
        name: 'get_request_inquiry',
        description: 'Get details of a specific request inquiry (money request) by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            request_inquiry_id: { type: 'number', description: 'Request inquiry ID (required)' },
          },
          required: ['monetary_account_id', 'request_inquiry_id'],
        },
      },
      {
        name: 'create_request_inquiry',
        description: 'Send a request for payment (request money) to another bunq user or IBAN.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID to receive into (required)' },
            amount_value: { type: 'string', description: 'Amount to request as a string (e.g. "25.00") (required)' },
            amount_currency: { type: 'string', description: 'Currency code (e.g. EUR) (required)' },
            counterparty_alias_type: { type: 'string', description: 'Alias type of recipient: EMAIL, PHONE_NUMBER, or IBAN (required)' },
            counterparty_alias_value: { type: 'string', description: 'Alias value of recipient (email, phone, or IBAN) (required)' },
            counterparty_name: { type: 'string', description: 'Recipient name' },
            description: { type: 'string', description: 'Description of the request' },
          },
          required: ['monetary_account_id', 'amount_value', 'amount_currency', 'counterparty_alias_type', 'counterparty_alias_value'],
        },
      },
      // ── Scheduled Payments ─────────────────────────────────────────────────
      {
        name: 'list_schedule_payments',
        description: 'List all scheduled (recurring) payments for a monetary account.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            count: { type: 'number', description: 'Number of scheduled payments to return (default: 10, max: 200)' },
          },
          required: ['monetary_account_id'],
        },
      },
      {
        name: 'get_schedule_payment',
        description: 'Get details of a specific scheduled payment by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            schedule_payment_id: { type: 'number', description: 'Scheduled payment ID (required)' },
          },
          required: ['monetary_account_id', 'schedule_payment_id'],
        },
      },
      {
        name: 'create_schedule_payment',
        description: 'Create a new scheduled (recurring) payment from a monetary account.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Source monetary account ID (required)' },
            amount_value: { type: 'string', description: 'Amount to transfer as a string (e.g. "50.00") (required)' },
            amount_currency: { type: 'string', description: 'Currency code (e.g. EUR) (required)' },
            counterparty_iban: { type: 'string', description: 'Recipient IBAN (required)' },
            counterparty_name: { type: 'string', description: 'Recipient name (required)' },
            description: { type: 'string', description: 'Payment description' },
            recurrence_size: { type: 'number', description: 'Recurrence interval size (required)' },
            recurrence_unit: { type: 'string', description: 'Recurrence unit: ONCE, HOURLY, DAILY, WEEKLY, MONTHLY, YEARLY (required)' },
            start_time: { type: 'string', description: 'Schedule start time in ISO 8601 format (required)' },
            end_time: { type: 'string', description: 'Schedule end time in ISO 8601 format (optional)' },
          },
          required: ['monetary_account_id', 'amount_value', 'amount_currency', 'counterparty_iban', 'counterparty_name', 'recurrence_size', 'recurrence_unit', 'start_time'],
        },
      },
      // ── Cards ──────────────────────────────────────────────────────────────
      {
        name: 'list_cards',
        description: 'List all payment cards (debit and credit) associated with the user.',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of cards to return (default: 10, max: 200)' },
            older_id: { type: 'number', description: 'Return cards with ID older than this value (for pagination)' },
          },
        },
      },
      {
        name: 'get_card',
        description: 'Get details of a specific card by ID, including status, limits, and linked accounts.',
        inputSchema: {
          type: 'object',
          properties: {
            card_id: { type: 'number', description: 'Card ID (required)' },
          },
          required: ['card_id'],
        },
      },
      // ── Draft Payments ────────────────────────────────────────────────────
      {
        name: 'list_draft_payments',
        description: 'List draft payments pending approval for a monetary account.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            count: { type: 'number', description: 'Number of draft payments to return (default: 10, max: 200)' },
          },
          required: ['monetary_account_id'],
        },
      },
      {
        name: 'get_draft_payment',
        description: 'Get details of a specific draft payment by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            draft_payment_id: { type: 'number', description: 'Draft payment ID (required)' },
          },
          required: ['monetary_account_id', 'draft_payment_id'],
        },
      },
      {
        name: 'create_draft_payment',
        description: 'Create a draft payment that requires manual approval before execution.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Source monetary account ID (required)' },
            entries: {
              type: 'array',
              description: 'Draft payment entries (required)',
              items: {
                type: 'object',
                properties: {
                  amount_value: { type: 'string', description: 'Amount as a string (e.g. "100.00")' },
                  amount_currency: { type: 'string', description: 'Currency code (e.g. EUR)' },
                  counterparty_iban: { type: 'string', description: 'Recipient IBAN' },
                  counterparty_name: { type: 'string', description: 'Recipient name' },
                  description: { type: 'string', description: 'Payment description' },
                },
              },
            },
            number_of_required_accepts: { type: 'number', description: 'Number of approvals required (default: 1)' },
          },
          required: ['monetary_account_id', 'entries'],
        },
      },
      // ── Currency Conversions ───────────────────────────────────────────────
      {
        name: 'list_currency_conversions',
        description: 'List currency conversions performed in a monetary account.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            count: { type: 'number', description: 'Number of conversions to return (default: 10, max: 200)' },
          },
          required: ['monetary_account_id'],
        },
      },
      {
        name: 'get_currency_conversion',
        description: 'Get details of a specific currency conversion by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            conversion_id: { type: 'number', description: 'Currency conversion ID (required)' },
          },
          required: ['monetary_account_id', 'conversion_id'],
        },
      },
      // ── Customer Statements ───────────────────────────────────────────────
      {
        name: 'list_customer_statements',
        description: 'List account statements generated for a monetary account.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            count: { type: 'number', description: 'Number of statements to return (default: 10, max: 200)' },
          },
          required: ['monetary_account_id'],
        },
      },
      {
        name: 'create_customer_statement',
        description: 'Generate a new account statement for a monetary account in a specified format and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            monetary_account_id: { type: 'number', description: 'Monetary account ID (required)' },
            statement_format: { type: 'string', description: 'Format: MT940, CSV, or PDF (required)' },
            date_start: { type: 'string', description: 'Start date in YYYY-MM-DD format (required)' },
            date_end: { type: 'string', description: 'End date in YYYY-MM-DD format (required)' },
            regional_format: { type: 'string', description: 'Regional format for CSV: EUROPEAN or UK_US (optional, CSV only)' },
          },
          required: ['monetary_account_id', 'statement_format', 'date_start', 'date_end'],
        },
      },
      // ── Share Invite Responses ─────────────────────────────────────────────
      {
        name: 'list_share_invite_responses',
        description: 'List monetary account share invitations the user has received (joint account invites).',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of invitations to return (default: 10, max: 200)' },
          },
        },
      },
      {
        name: 'get_share_invite_response',
        description: 'Get details of a specific monetary account share invitation.',
        inputSchema: {
          type: 'object',
          properties: {
            share_invite_response_id: { type: 'number', description: 'Share invitation ID (required)' },
          },
          required: ['share_invite_response_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_user':                        return await this.getUser();
        case 'list_monetary_accounts':          return await this.listMonetaryAccounts(args);
        case 'get_monetary_account':            return await this.getMonetaryAccount(args);
        case 'list_payments':                   return await this.listPayments(args);
        case 'get_payment':                     return await this.getPayment(args);
        case 'create_payment':                  return await this.createPayment(args);
        case 'list_payment_batch':              return await this.listPaymentBatch(args);
        case 'create_payment_batch':            return await this.createPaymentBatch(args);
        case 'list_request_inquiries':          return await this.listRequestInquiries(args);
        case 'get_request_inquiry':             return await this.getRequestInquiry(args);
        case 'create_request_inquiry':          return await this.createRequestInquiry(args);
        case 'list_schedule_payments':          return await this.listSchedulePayments(args);
        case 'get_schedule_payment':            return await this.getSchedulePayment(args);
        case 'create_schedule_payment':         return await this.createSchedulePayment(args);
        case 'list_cards':                      return await this.listCards(args);
        case 'get_card':                        return await this.getCard(args);
        case 'list_draft_payments':             return await this.listDraftPayments(args);
        case 'get_draft_payment':               return await this.getDraftPayment(args);
        case 'create_draft_payment':            return await this.createDraftPayment(args);
        case 'list_currency_conversions':       return await this.listCurrencyConversions(args);
        case 'get_currency_conversion':         return await this.getCurrencyConversion(args);
        case 'list_customer_statements':        return await this.listCustomerStatements(args);
        case 'create_customer_statement':       return await this.createCustomerStatement(args);
        case 'list_share_invite_responses':     return await this.listShareInviteResponses(args);
        case 'get_share_invite_response':       return await this.getShareInviteResponse(args);
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
    return {
      'Content-Type': 'application/json',
      'X-Bunq-Client-Authentication': this.sessionToken,
      'X-Bunq-Client-Request-Id': `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      'X-Bunq-Language': 'en_US',
      'X-Bunq-Region': 'en_US',
      'X-Bunq-Geolocation': '0 0 0 0 000',
    };
  }

  private buildPaginationParams(args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    if (args.count !== undefined) params.set('count', String(args.count));
    if (args.older_id !== undefined) params.set('older_id', String(args.older_id));
    if (args.newer_id !== undefined) params.set('newer_id', String(args.newer_id));
    return params.toString() ? `?${params.toString()}` : '';
  }

  private async bunqRequest(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { ...options, headers: { ...this.buildHeaders(), ...(options.headers as Record<string, string> | undefined) } });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `bunq API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `bunq returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private userPath(path: string): string {
    return `/user/${encodeURIComponent(this.userId)}${path}`;
  }

  private maPath(monetaryAccountId: unknown, path: string): string {
    return this.userPath(`/monetary-account/${encodeURIComponent(String(monetaryAccountId))}${path}`);
  }

  // ── User ──────────────────────────────────────────────────────────────────

  private async getUser(): Promise<ToolResult> {
    return this.bunqRequest(this.userPath(''));
  }

  // ── Monetary Accounts ──────────────────────────────────────────────────────

  private async listMonetaryAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.userPath(`/monetary-account${this.buildPaginationParams(args)}`));
  }

  private async getMonetaryAccount(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.userPath(`/monetary-account/${encodeURIComponent(String(args.monetary_account_id))}`));
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  private async listPayments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.maPath(args.monetary_account_id, `/payment${this.buildPaginationParams(args)}`));
  }

  private async getPayment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.maPath(args.monetary_account_id, `/payment/${encodeURIComponent(String(args.payment_id))}`));
  }

  private async createPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      amount: { value: args.amount_value, currency: args.amount_currency },
      counterparty_alias: { type: 'IBAN', value: args.counterparty_iban, name: args.counterparty_name },
      description: (args.description as string) || '',
    };
    return this.bunqRequest(this.maPath(args.monetary_account_id, '/payment'), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ── Payment Batch ──────────────────────────────────────────────────────────

  private async listPaymentBatch(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.maPath(args.monetary_account_id, `/payment-batch${this.buildPaginationParams(args)}`));
  }

  private async createPaymentBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const payments = (args.payments as Array<Record<string, unknown>>).map((p) => ({
      amount: { value: p.amount_value, currency: p.amount_currency },
      counterparty_alias: { type: 'IBAN', value: p.counterparty_iban, name: p.counterparty_name },
      description: (p.description as string) || '',
    }));
    return this.bunqRequest(this.maPath(args.monetary_account_id, '/payment-batch'), {
      method: 'POST',
      body: JSON.stringify({ payments }),
    });
  }

  // ── Request Inquiries ─────────────────────────────────────────────────────

  private async listRequestInquiries(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.maPath(args.monetary_account_id, `/request-inquiry${this.buildPaginationParams(args)}`));
  }

  private async getRequestInquiry(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.maPath(args.monetary_account_id, `/request-inquiry/${encodeURIComponent(String(args.request_inquiry_id))}`));
  }

  private async createRequestInquiry(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      amount_inquired: { value: args.amount_value, currency: args.amount_currency },
      counterparty_alias: {
        type: args.counterparty_alias_type,
        value: args.counterparty_alias_value,
        ...(args.counterparty_name ? { name: args.counterparty_name } : {}),
      },
      description: (args.description as string) || '',
    };
    return this.bunqRequest(this.maPath(args.monetary_account_id, '/request-inquiry'), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ── Scheduled Payments ─────────────────────────────────────────────────────

  private async listSchedulePayments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.maPath(args.monetary_account_id, `/schedule-payment${this.buildPaginationParams(args)}`));
  }

  private async getSchedulePayment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.maPath(args.monetary_account_id, `/schedule-payment/${encodeURIComponent(String(args.schedule_payment_id))}`));
  }

  private async createSchedulePayment(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      payment: {
        amount: { value: args.amount_value, currency: args.amount_currency },
        counterparty_alias: { type: 'IBAN', value: args.counterparty_iban, name: args.counterparty_name },
        description: (args.description as string) || '',
      },
      schedule: {
        time_start: args.start_time,
        ...(args.end_time ? { time_end: args.end_time } : {}),
        recurrence_size: args.recurrence_size,
        recurrence_unit: args.recurrence_unit,
      },
    };
    return this.bunqRequest(this.maPath(args.monetary_account_id, '/schedule-payment'), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ── Cards ──────────────────────────────────────────────────────────────────

  private async listCards(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.userPath(`/card${this.buildPaginationParams(args)}`));
  }

  private async getCard(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.userPath(`/card/${encodeURIComponent(String(args.card_id))}`));
  }

  // ── Draft Payments ────────────────────────────────────────────────────────

  private async listDraftPayments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.maPath(args.monetary_account_id, `/draft-payment${this.buildPaginationParams(args)}`));
  }

  private async getDraftPayment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.maPath(args.monetary_account_id, `/draft-payment/${encodeURIComponent(String(args.draft_payment_id))}`));
  }

  private async createDraftPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const entries = (args.entries as Array<Record<string, unknown>>).map((e) => ({
      amount: { value: e.amount_value, currency: e.amount_currency },
      counterparty_alias: { type: 'IBAN', value: e.counterparty_iban, name: e.counterparty_name },
      description: (e.description as string) || '',
    }));
    const body = {
      entries,
      number_of_required_accepts: (args.number_of_required_accepts as number) ?? 1,
    };
    return this.bunqRequest(this.maPath(args.monetary_account_id, '/draft-payment'), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ── Currency Conversions ───────────────────────────────────────────────────

  private async listCurrencyConversions(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.maPath(args.monetary_account_id, `/currency-conversion${this.buildPaginationParams(args)}`));
  }

  private async getCurrencyConversion(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.maPath(args.monetary_account_id, `/currency-conversion/${encodeURIComponent(String(args.conversion_id))}`));
  }

  // ── Customer Statements ───────────────────────────────────────────────────

  private async listCustomerStatements(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.maPath(args.monetary_account_id, `/customer-statement${this.buildPaginationParams(args)}`));
  }

  private async createCustomerStatement(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      statement_format: args.statement_format,
      date_start: args.date_start,
      date_end: args.date_end,
    };
    if (args.regional_format) body.regional_format = args.regional_format;
    return this.bunqRequest(this.maPath(args.monetary_account_id, '/customer-statement'), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ── Share Invite Responses ─────────────────────────────────────────────────

  private async listShareInviteResponses(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.userPath(`/share-invite-monetary-account-response${this.buildPaginationParams(args)}`));
  }

  private async getShareInviteResponse(args: Record<string, unknown>): Promise<ToolResult> {
    return this.bunqRequest(this.userPath(`/share-invite-monetary-account-response/${encodeURIComponent(String(args.share_invite_response_id))}`));
  }
}
