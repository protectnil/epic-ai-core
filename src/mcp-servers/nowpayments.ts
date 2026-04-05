/**
 * NOWPayments MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official NOWPayments MCP server was found on GitHub.
//
// Base URL: https://api.nowpayments.io
// Auth: x-api-key header (required on all endpoints)
// Docs: https://documenter.getpostman.com/view/7907941/2s93JusNJt
// Rate limits: Not publicly documented; standard API key limits apply

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NOWPaymentsConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NOWPaymentsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NOWPaymentsConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.nowpayments.io';
  }

  static catalog() {
    return {
      name: 'nowpayments',
      displayName: 'NOWPayments',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'nowpayments', 'now payments', 'crypto payment', 'cryptocurrency payment',
        'bitcoin payment', 'eth payment', 'crypto invoice', 'crypto checkout',
        'payment gateway', 'crypto gateway', 'digital currency payment',
        'recurring payment', 'subscription', 'payment status', 'payout',
        'sub-partner', 'transfer', 'estimate', 'min amount',
      ],
      toolNames: [
        'get_estimated_price',
        'get_minimum_payment_amount',
        'list_payments',
        'get_payment_status',
        'update_payment_estimate',
        'verify_payout',
        'list_sub_partners',
        'get_sub_partner_balance',
        'get_transfer',
        'list_transfers',
        'list_subscriptions',
        'list_subscription_plans',
        'get_subscription_plan',
        'update_subscription_plan',
        'delete_subscription',
        'get_subscription',
      ],
      description: 'NOWPayments crypto payment gateway: create and manage cryptocurrency payments, payouts, subscriptions, and sub-partner accounts. Supports 300+ cryptocurrencies.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Pricing & Estimates ────────────────────────────────────────────────
      {
        name: 'get_estimated_price',
        description: 'Get the estimated price to convert an amount from one cryptocurrency to another (e.g. USD equivalent in BTC)',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'The amount to convert',
            },
            currency_from: {
              type: 'string',
              description: 'Source currency code (e.g. usd, btc, eth)',
            },
            currency_to: {
              type: 'string',
              description: 'Target currency code (e.g. btc, eth, ltc)',
            },
          },
          required: ['amount', 'currency_from', 'currency_to'],
        },
      },
      {
        name: 'get_minimum_payment_amount',
        description: 'Get the minimum payment amount for a given currency pair — amounts below this threshold will not be processed',
        inputSchema: {
          type: 'object',
          properties: {
            currency_from: {
              type: 'string',
              description: 'Source currency code (e.g. btc, eth)',
            },
            currency_to: {
              type: 'string',
              description: 'Target currency code (e.g. usd, eur)',
            },
          },
          required: ['currency_from', 'currency_to'],
        },
      },
      // ── Payments ───────────────────────────────────────────────────────────
      {
        name: 'list_payments',
        description: 'List all payments with optional filtering by date range, pagination, and sorting',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of results to return (default 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default 0)',
            },
            sortBy: {
              type: 'string',
              description: 'Field to sort by (e.g. created_at, amount)',
            },
            orderBy: {
              type: 'string',
              description: 'Sort direction: asc or desc',
            },
            dateFrom: {
              type: 'string',
              description: 'Filter payments from this date (ISO 8601 format)',
            },
            dateTo: {
              type: 'string',
              description: 'Filter payments to this date (ISO 8601 format)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_payment_status',
        description: 'Get the status and details of a specific payment by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            payment_id: {
              type: 'string',
              description: 'The NOWPayments payment ID',
            },
          },
          required: ['payment_id'],
        },
      },
      {
        name: 'update_payment_estimate',
        description: 'Update the merchant estimate for a payment — recalculates the expected amount based on current exchange rates',
        inputSchema: {
          type: 'object',
          properties: {
            payment_id: {
              type: 'string',
              description: 'The NOWPayments payment ID to update the estimate for',
            },
          },
          required: ['payment_id'],
        },
      },
      // ── Payouts ────────────────────────────────────────────────────────────
      {
        name: 'verify_payout',
        description: 'Verify a payout withdrawal using a verification code sent to the account email',
        inputSchema: {
          type: 'object',
          properties: {
            withdrawals_id: {
              type: 'string',
              description: 'The withdrawal/payout ID to verify',
            },
            verification_code: {
              type: 'string',
              description: 'The verification code received via email',
            },
          },
          required: ['withdrawals_id', 'verification_code'],
        },
      },
      // ── Sub-partners ───────────────────────────────────────────────────────
      {
        name: 'list_sub_partners',
        description: 'List all sub-partners associated with this merchant account, with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Filter by sub-partner ID or comma-separated list of IDs',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip (default 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default 10)',
            },
            order: {
              type: 'string',
              description: 'Sort direction: ASC or DESC (default ASC)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_sub_partner_balance',
        description: 'Get the current balance for a specific sub-partner account',
        inputSchema: {
          type: 'object',
          properties: {
            sub_partner_id: {
              type: 'string',
              description: 'The sub-partner account ID',
            },
          },
          required: ['sub_partner_id'],
        },
      },
      // ── Transfers ──────────────────────────────────────────────────────────
      {
        name: 'get_transfer',
        description: 'Get the details of a specific sub-partner transfer by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            transfer_id: {
              type: 'string',
              description: 'The transfer ID to retrieve',
            },
          },
          required: ['transfer_id'],
        },
      },
      {
        name: 'list_transfers',
        description: 'List all sub-partner transfers with optional filtering by ID, status, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Filter by sub-partner ID or comma-separated IDs',
            },
            status: {
              type: 'string',
              description: 'Filter by status: WAITING, CREATED, FINISHED, or REJECTED',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default 10)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip (default 0)',
            },
            order: {
              type: 'string',
              description: 'Sort direction: ASC or DESC',
            },
          },
          required: [],
        },
      },
      // ── Subscriptions ──────────────────────────────────────────────────────
      {
        name: 'list_subscriptions',
        description: 'List recurring payment subscriptions with optional filtering by status, plan, and active state',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: WAITING_PAY, PAID, PARTIALLY_PAID, or EXPIRED',
            },
            subscription_plan_id: {
              type: 'string',
              description: 'Filter by subscription plan ID',
            },
            is_active: {
              type: 'boolean',
              description: 'Filter by active state: true for active, false for inactive',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip',
            },
          },
          required: [],
        },
      },
      {
        name: 'list_subscription_plans',
        description: 'List all subscription plans configured for this merchant account',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of plans to return',
            },
            offset: {
              type: 'number',
              description: 'Number of plans to skip for pagination',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_subscription_plan',
        description: 'Get details of a specific subscription plan by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: {
              type: 'string',
              description: 'The subscription plan ID',
            },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'update_subscription_plan',
        description: 'Update an existing subscription plan — modify amount, currency, interval, or title',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: {
              type: 'string',
              description: 'The subscription plan ID to update',
            },
            amount: {
              type: 'number',
              description: 'New payment amount for the plan',
            },
            currency: {
              type: 'string',
              description: 'New currency code for the plan (e.g. usd, btc)',
            },
            interval_day: {
              type: 'number',
              description: 'New billing interval in days',
            },
            title: {
              type: 'string',
              description: 'New display title for the subscription plan',
            },
          },
          required: ['plan_id'],
        },
      },
      {
        name: 'delete_subscription',
        description: 'Cancel and delete a recurring payment subscription by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            sub_id: {
              type: 'string',
              description: 'The subscription ID to delete/cancel',
            },
          },
          required: ['sub_id'],
        },
      },
      {
        name: 'get_subscription',
        description: 'Get the details and current status of a specific recurring payment subscription',
        inputSchema: {
          type: 'object',
          properties: {
            sub_id: {
              type: 'string',
              description: 'The subscription ID to retrieve',
            },
          },
          required: ['sub_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_estimated_price':       return this.getEstimatedPrice(args);
        case 'get_minimum_payment_amount':return this.getMinimumPaymentAmount(args);
        case 'list_payments':             return this.listPayments(args);
        case 'get_payment_status':        return this.getPaymentStatus(args);
        case 'update_payment_estimate':   return this.updatePaymentEstimate(args);
        case 'verify_payout':             return this.verifyPayout(args);
        case 'list_sub_partners':         return this.listSubPartners(args);
        case 'get_sub_partner_balance':   return this.getSubPartnerBalance(args);
        case 'get_transfer':              return this.getTransfer(args);
        case 'list_transfers':            return this.listTransfers(args);
        case 'list_subscriptions':        return this.listSubscriptions(args);
        case 'list_subscription_plans':   return this.listSubscriptionPlans(args);
        case 'get_subscription_plan':     return this.getSubscriptionPlan(args);
        case 'update_subscription_plan':  return this.updateSubscriptionPlan(args);
        case 'delete_subscription':       return this.deleteSubscription(args);
        case 'get_subscription':          return this.getSubscription(args);
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

  private headers(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params?: Record<string, string | number | boolean>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, String(v));
        }
      }
    }
    const response = await this.fetchWithRetry(url.toString(), { headers: this.headers() });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body?: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ───────────────────────────────────────────────────

  private async getEstimatedPrice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.amount || !args.currency_from || !args.currency_to) {
      return { content: [{ type: 'text', text: 'amount, currency_from, and currency_to are required' }], isError: true };
    }
    return this.get('/v1/estimate', {
      amount: args.amount as number,
      currency_from: args.currency_from as string,
      currency_to: args.currency_to as string,
    });
  }

  private async getMinimumPaymentAmount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.currency_from || !args.currency_to) {
      return { content: [{ type: 'text', text: 'currency_from and currency_to are required' }], isError: true };
    }
    return this.get('/v1/min-amount', {
      currency_from: args.currency_from as string,
      currency_to: args.currency_to as string,
    });
  }

  private async listPayments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number> = {};
    if (args.limit)    params.limit    = args.limit as number;
    if (args.page)     params.page     = args.page as number;
    if (args.sortBy)   params.sortBy   = args.sortBy as string;
    if (args.orderBy)  params.orderBy  = args.orderBy as string;
    if (args.dateFrom) params.dateFrom = args.dateFrom as string;
    if (args.dateTo)   params.dateTo   = args.dateTo as string;
    return this.get('/v1/payment/', params);
  }

  private async getPaymentStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.payment_id) {
      return { content: [{ type: 'text', text: 'payment_id is required' }], isError: true };
    }
    return this.get(`/v1/payment/${args.payment_id as string}`);
  }

  private async updatePaymentEstimate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.payment_id) {
      return { content: [{ type: 'text', text: 'payment_id is required' }], isError: true };
    }
    return this.post(`/v1/payment/${args.payment_id as string}/update-merchant-estimate`);
  }

  private async verifyPayout(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.withdrawals_id || !args.verification_code) {
      return { content: [{ type: 'text', text: 'withdrawals_id and verification_code are required' }], isError: true };
    }
    return this.post(`/v1/payout/${args.withdrawals_id as string}/verify`, {
      verification_code: args.verification_code as string,
    });
  }

  private async listSubPartners(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number> = {};
    if (args.id)     params.id     = args.id as string;
    if (args.offset) params.offset = args.offset as number;
    if (args.limit)  params.limit  = args.limit as number;
    if (args.order)  params.order  = args.order as string;
    return this.get('/v1/sub-partner', params);
  }

  private async getSubPartnerBalance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sub_partner_id) {
      return { content: [{ type: 'text', text: 'sub_partner_id is required' }], isError: true };
    }
    return this.get(`/v1/sub-partner/balance/${args.sub_partner_id as string}`);
  }

  private async getTransfer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.transfer_id) {
      return { content: [{ type: 'text', text: 'transfer_id is required' }], isError: true };
    }
    return this.get(`/v1/sub-partner/transfer/${args.transfer_id as string}`);
  }

  private async listTransfers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number> = {};
    if (args.id)     params.id     = args.id as string;
    if (args.status) params.status = args.status as string;
    if (args.limit)  params.limit  = args.limit as number;
    if (args.offset) params.offset = args.offset as number;
    if (args.order)  params.order  = args.order as string;
    return this.get('/v1/sub-partner/transfers', params);
  }

  private async listSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean> = {};
    if (args.status)               params.status               = args.status as string;
    if (args.subscription_plan_id) params.subscription_plan_id = args.subscription_plan_id as string;
    if (args.is_active !== undefined) params.is_active         = args.is_active as boolean;
    if (args.limit)                params.limit                = args.limit as number;
    if (args.offset)               params.offset               = args.offset as number;
    return this.get('/v1/subscriptions', params);
  }

  private async listSubscriptionPlans(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, number> = {};
    if (args.limit)  params.limit  = args.limit as number;
    if (args.offset) params.offset = args.offset as number;
    return this.get('/v1/subscriptions/plans', params);
  }

  private async getSubscriptionPlan(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.plan_id) {
      return { content: [{ type: 'text', text: 'plan_id is required' }], isError: true };
    }
    return this.get(`/v1/subscriptions/plans/${args.plan_id as string}`);
  }

  private async updateSubscriptionPlan(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.plan_id) {
      return { content: [{ type: 'text', text: 'plan_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.amount)       body.amount       = args.amount;
    if (args.currency)     body.currency     = args.currency;
    if (args.interval_day) body.interval_day = args.interval_day;
    if (args.title)        body.title        = args.title;
    return this.patch(`/v1/subscriptions/plans/${args.plan_id as string}`, body);
  }

  private async deleteSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sub_id) {
      return { content: [{ type: 'text', text: 'sub_id is required' }], isError: true };
    }
    return this.del(`/v1/subscriptions/${args.sub_id as string}`);
  }

  private async getSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sub_id) {
      return { content: [{ type: 'text', text: 'sub_id is required' }], isError: true };
    }
    return this.get(`/v1/subscriptions/${args.sub_id as string}`);
  }
}
