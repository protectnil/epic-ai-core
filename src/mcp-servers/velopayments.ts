/**
 * Velo Payments MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Velo Payments MCP server was found on GitHub.
//
// Base URL: https://api.sandbox.velopayments.com (sandbox) / https://api.velopayments.com (production)
// Auth: OAuth2 — POST /v1/authenticate with API key to receive Bearer token
// Docs: https://apidocs.velopayments.com/
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VeloPaymentsConfig {
  apiKey: string;      // base64-encoded API key:secret
  baseUrl?: string;    // defaults to https://api.velopayments.com
  payorId?: string;    // default payor ID for operations
}

export class VeloPaymentsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly payorId?: string;
  private cachedToken?: string;
  private tokenExpiry?: number;

  constructor(config: VeloPaymentsConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.velopayments.com').replace(/\/$/, '');
    this.payorId = config.payorId;
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Auth ────────────────────────────────────────────────────────────────
      {
        name: 'authenticate',
        description: 'Authenticate with the Velo Payments API and receive an OAuth2 Bearer token',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Payees ──────────────────────────────────────────────────────────────
      {
        name: 'list_payees',
        description: 'List payees for a payor with optional filters for name, status, and country',
        inputSchema: {
          type: 'object',
          properties: {
            payor_id: { type: 'string', description: 'Payor ID (uses configured default if omitted)' },
            display_name: { type: 'string', description: 'Filter by payee display name' },
            payee_type: { type: 'string', description: 'Filter by payee type: Individual or Company' },
            onboarded_status: { type: 'string', description: 'Filter by onboarding status: CREATED, INVITED, REGISTERED, ONBOARDED' },
            watchlist_status: { type: 'string', description: 'Filter by watchlist status: INITIATED, PENDING, FAILED, TRANSITIONED, FUNCTIONALLY_COMPLETE' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Page size (default: 25, max: 100)' },
          },
        },
      },
      {
        name: 'get_payee',
        description: 'Get details for a specific payee by ID',
        inputSchema: {
          type: 'object',
          properties: {
            payee_id: { type: 'string', description: 'Payee UUID' },
            sensitive: { type: 'boolean', description: 'Include sensitive data (requires elevated permissions)' },
          },
          required: ['payee_id'],
        },
      },
      // ── Payments ─────────────────────────────────────────────────────────────
      {
        name: 'list_payments_for_payor',
        description: 'List payment audit records for a payor with optional status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            payor_id: { type: 'string', description: 'Payor ID' },
            payee_id: { type: 'string', description: 'Filter by payee ID' },
            payment_memo: { type: 'string', description: 'Filter by payment memo text' },
            status: { type: 'string', description: 'Filter by status: ACCEPTED, AWAITING_FUNDS, FUNDED, UNFUNDED, BANK_PAYMENT_REQUESTED, REJECTED, ACCEPTED_BY_RAILS, CONFIRMED, FAILED, WITHDRAWN' },
            submitted_date_from: { type: 'string', description: 'Filter from date (YYYY-MM-DD)' },
            submitted_date_to: { type: 'string', description: 'Filter to date (YYYY-MM-DD)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Page size (default: 25)' },
          },
        },
      },
      {
        name: 'withdraw_payment',
        description: 'Withdraw a pending payment before it is processed',
        inputSchema: {
          type: 'object',
          properties: {
            payment_id: { type: 'string', description: 'Payment UUID to withdraw' },
            reason: { type: 'string', description: 'Reason for withdrawal' },
          },
          required: ['payment_id'],
        },
      },
      // ── Payouts ──────────────────────────────────────────────────────────────
      {
        name: 'get_payout_statistics',
        description: 'Get payout statistics for a payor (counts by status)',
        inputSchema: {
          type: 'object',
          properties: {
            payor_id: { type: 'string', description: 'Payor ID' },
          },
        },
      },
      // ── Source Accounts ───────────────────────────────────────────────────────
      {
        name: 'list_source_accounts',
        description: 'List source accounts (funding accounts) for the payor',
        inputSchema: {
          type: 'object',
          properties: {
            payor_id: { type: 'string', description: 'Payor ID to filter by' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Page size (default: 25)' },
          },
        },
      },
      {
        name: 'get_source_account',
        description: 'Get details for a specific source account',
        inputSchema: {
          type: 'object',
          properties: {
            source_account_id: { type: 'string', description: 'Source account UUID' },
          },
          required: ['source_account_id'],
        },
      },
      {
        name: 'create_funding_request',
        description: 'Request funding for a source account from a linked funding account',
        inputSchema: {
          type: 'object',
          properties: {
            source_account_id: { type: 'string', description: 'Source account to fund' },
            amount: { type: 'number', description: 'Amount to fund in minor units (e.g. cents)' },
            currency: { type: 'string', description: 'ISO 4217 currency code (e.g. USD)' },
          },
          required: ['source_account_id', 'amount', 'currency'],
        },
      },
      // ── Payors ──────────────────────────────────────────────────────────────
      {
        name: 'get_payor',
        description: 'Get details for a specific payor by ID',
        inputSchema: {
          type: 'object',
          properties: {
            payor_id: { type: 'string', description: 'Payor UUID' },
          },
          required: ['payor_id'],
        },
      },
      // ── Funding Accounts ─────────────────────────────────────────────────────
      {
        name: 'list_funding_accounts',
        description: 'List funding accounts for a payor',
        inputSchema: {
          type: 'object',
          properties: {
            payor_id: { type: 'string', description: 'Payor ID' },
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Page size' },
          },
        },
      },
      {
        name: 'get_funding_account',
        description: 'Get details for a specific funding account',
        inputSchema: {
          type: 'object',
          properties: {
            funding_account_id: { type: 'string', description: 'Funding account UUID' },
          },
          required: ['funding_account_id'],
        },
      },
      // ── Webhooks ─────────────────────────────────────────────────────────────
      {
        name: 'list_webhooks',
        description: 'List webhooks configured for a payor',
        inputSchema: {
          type: 'object',
          properties: {
            payor_id: { type: 'string', description: 'Payor ID' },
          },
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a new webhook for a payor',
        inputSchema: {
          type: 'object',
          properties: {
            payor_id: { type: 'string', description: 'Payor ID' },
            webhook_url: { type: 'string', description: 'HTTPS URL to receive webhook events' },
            authorization_header: { type: 'string', description: 'Authorization header value sent with webhook calls' },
            enabled: { type: 'boolean', description: 'Whether the webhook is active (default: true)' },
          },
          required: ['payor_id', 'webhook_url'],
        },
      },
      {
        name: 'ping_webhook',
        description: 'Send a test ping event to a webhook to verify it is responding',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: { type: 'string', description: 'Webhook UUID' },
          },
          required: ['webhook_id'],
        },
      },
      // ── Users ────────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List users for the authenticated payor',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Filter by user type: All, BACKOFFICE, PAYOR, PAYEE' },
            page: { type: 'number', description: 'Page number' },
            page_size: { type: 'number', description: 'Page size' },
          },
        },
      },
      {
        name: 'invite_user',
        description: 'Invite a new user to join the payor account',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email address of the user to invite' },
            mfa_type: { type: 'string', description: 'MFA type: TOTP or SMS' },
            sms_number: { type: 'string', description: 'SMS number for MFA (required if mfa_type is SMS)' },
            primary_contact_number: { type: 'string', description: 'Primary contact phone number' },
            roles: { type: 'array', items: { type: 'string' }, description: 'Role names to assign' },
          },
          required: ['email', 'mfa_type', 'roles'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'authenticate': return await this.authenticate();
        case 'list_payees': return await this.listPayees(args);
        case 'get_payee': return await this.getPayee(args);
        case 'list_payments_for_payor': return await this.listPaymentsForPayor(args);
        case 'withdraw_payment': return await this.withdrawPayment(args);
        case 'get_payout_statistics': return await this.getPayoutStatistics(args);
        case 'list_source_accounts': return await this.listSourceAccounts(args);
        case 'get_source_account': return await this.getSourceAccount(args);
        case 'create_funding_request': return await this.createFundingRequest(args);
        case 'get_payor': return await this.getPayor(args);
        case 'list_funding_accounts': return await this.listFundingAccounts(args);
        case 'get_funding_account': return await this.getFundingAccount(args);
        case 'list_webhooks': return await this.listWebhooks(args);
        case 'create_webhook': return await this.createWebhook(args);
        case 'ping_webhook': return await this.pingWebhook(args);
        case 'list_users': return await this.listUsers(args);
        case 'invite_user': return await this.inviteUser(args);
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


  private async getToken(): Promise<string> {
    if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/authenticate`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    const data = await response.json() as { access_token?: string; expires_in?: number };
    if (!response.ok || !data.access_token) {
      throw new Error(`Authentication failed: ${JSON.stringify(data)}`);
    }
    this.cachedToken = data.access_token;
    this.tokenExpiry = Date.now() + ((data.expires_in ?? 1800) - 60) * 1000;
    return this.cachedToken;
  }

  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const token = await this.getToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers as Record<string, string> ?? {}),
    };
    const response = await this.fetchWithRetry(url, { ...init, headers });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async authenticate(): Promise<ToolResult> {
    try {
      const token = await this.getToken();
      return { content: [{ type: 'text', text: JSON.stringify({ authenticated: true, token: token.slice(0, 20) + '...' }) }], isError: false };
    } catch (err) {
      return { content: [{ type: 'text', text: String(err) }], isError: true };
    }
  }

  private async listPayees(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const payorId = String(args.payor_id ?? this.payorId ?? '');
    if (payorId) params.set('payorId', payorId);
    if (args.display_name) params.set('displayName', String(args.display_name));
    if (args.payee_type) params.set('payeeType', String(args.payee_type));
    if (args.onboarded_status) params.set('onboardedStatus', String(args.onboarded_status));
    if (args.watchlist_status) params.set('watchlistStatus', String(args.watchlist_status));
    params.set('page', String((args.page as number) ?? 1));
    params.set('pageSize', String((args.page_size as number) ?? 25));
    return this.fetchJSON(`${this.baseUrl}/v4/payees?${params}`);
  }

  private async getPayee(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.sensitive) params.set('sensitive', 'true');
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/v4/payees/${encodeURIComponent(String(args.payee_id))}${qs ? `?${qs}` : ''}`);
  }

  private async listPaymentsForPayor(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const payorId = String(args.payor_id ?? this.payorId ?? '');
    if (payorId) params.set('payorId', payorId);
    if (args.payee_id) params.set('payeeId', String(args.payee_id));
    if (args.payment_memo) params.set('paymentMemo', String(args.payment_memo));
    if (args.status) params.set('status', String(args.status));
    if (args.submitted_date_from) params.set('submittedDateFrom', String(args.submitted_date_from));
    if (args.submitted_date_to) params.set('submittedDateTo', String(args.submitted_date_to));
    params.set('page', String((args.page as number) ?? 1));
    params.set('pageSize', String((args.page_size as number) ?? 25));
    return this.fetchJSON(`${this.baseUrl}/v4/paymentaudit/payments?${params}`);
  }

  private async withdrawPayment(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.reason) body.reason = args.reason;
    return this.fetchJSON(`${this.baseUrl}/v1/payments/${encodeURIComponent(String(args.payment_id))}/withdraw`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async getPayoutStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const payorId = String(args.payor_id ?? this.payorId ?? '');
    if (payorId) params.set('payorId', payorId);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/v1/paymentaudit/payoutStatistics${qs ? `?${qs}` : ''}`);
  }

  private async listSourceAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const payorId = String(args.payor_id ?? this.payorId ?? '');
    if (payorId) params.set('payorId', payorId);
    params.set('page', String((args.page as number) ?? 1));
    params.set('pageSize', String((args.page_size as number) ?? 25));
    return this.fetchJSON(`${this.baseUrl}/v2/sourceAccounts?${params}`);
  }

  private async getSourceAccount(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/v2/sourceAccounts/${encodeURIComponent(String(args.source_account_id))}`);
  }

  private async createFundingRequest(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/v2/sourceAccounts/${encodeURIComponent(String(args.source_account_id))}/fundingRequest`, {
      method: 'POST',
      body: JSON.stringify({ amount: args.amount, currency: args.currency }),
    });
  }

  private async getPayor(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/v2/payors/${encodeURIComponent(String(args.payor_id))}`);
  }

  private async listFundingAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const payorId = String(args.payor_id ?? this.payorId ?? '');
    if (payorId) params.set('payorId', payorId);
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    return this.fetchJSON(`${this.baseUrl}/v2/fundingAccounts?${params}`);
  }

  private async getFundingAccount(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/v2/fundingAccounts/${encodeURIComponent(String(args.funding_account_id))}`);
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const payorId = String(args.payor_id ?? this.payorId ?? '');
    if (payorId) params.set('payorId', payorId);
    return this.fetchJSON(`${this.baseUrl}/v1/webhooks?${params}`);
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      payorId: args.payor_id ?? this.payorId,
      webhookUrl: args.webhook_url,
      enabled: (args.enabled as boolean) ?? true,
    };
    if (args.authorization_header) body.authorizationHeader = args.authorization_header;
    return this.fetchJSON(`${this.baseUrl}/v1/webhooks`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async pingWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/v1/webhooks/${encodeURIComponent(String(args.webhook_id))}/ping`, { method: 'POST', body: '{}' });
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.type) params.set('type', String(args.type));
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/v2/users${qs ? `?${qs}` : ''}`);
  }

  private async inviteUser(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      email: args.email,
      mfaType: args.mfa_type,
      roles: args.roles,
    };
    if (args.sms_number) body.smsNumber = args.sms_number;
    if (args.primary_contact_number) body.primaryContactNumber = args.primary_contact_number;
    return this.fetchJSON(`${this.baseUrl}/v2/users/invite`, { method: 'POST', body: JSON.stringify(body) });
  }

  static catalog() {
    return {
      name: 'velopayments',
      displayName: 'Velo Payments',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['velo', 'payments', 'payouts', 'payees', 'disbursement', 'cross-border', 'treasury', 'fintech'],
      toolNames: [
        'authenticate', 'list_payees', 'get_payee', 'list_payments_for_payor', 'withdraw_payment',
        'get_payout_statistics', 'list_source_accounts', 'get_source_account', 'create_funding_request',
        'get_payor', 'list_funding_accounts', 'get_funding_account',
        'list_webhooks', 'create_webhook', 'ping_webhook', 'list_users', 'invite_user',
      ],
      description: 'Velo Payments: manage global payouts, payees, source accounts, funding requests, and webhooks for cross-border payment disbursement.',
      author: 'protectnil' as const,
    };
  }
}
