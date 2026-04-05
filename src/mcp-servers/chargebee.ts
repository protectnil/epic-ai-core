/**
 * Chargebee MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://www.chargebee.com/docs/billing/2.0/ai-in-chargebee/chargebee-mcp — transport: streamable-HTTP, auth: Bearer API key
// The deprecated npm package (@chargebee/mcp v0.0.8) exposed only 2 tools: chargebee_documentation_search,
// chargebee_code_planner — knowledge-base lookups only, no CRUD operations. It is no longer supported.
// The NEW official Chargebee MCP Agent Server (2025) exposes 3 agents: Knowledge Base Agent (public, docs only),
// Data Lookup Agent (read-only: customer/subscription/invoice retrieval, requires API key), and
// Onboarding Agent (test-site setup only). The MCP agents do NOT expose write operations.
// Our adapter covers: 18 tools (full CRUD). Chargebee MCP covers: read-only lookup agents (tool count not published).
// Recommendation: use-rest-api — MCP agents fail criterion #3 (documented tool count < 10 for CRUD operations)
// and do not cover create/update/cancel/pause operations that our adapter provides.
//
// Base URL: https://{site}.chargebee.com/api/v2
// Auth: HTTP Basic — API key as username, empty password (Base64 encoded)
// Docs: https://apidocs.chargebee.com/docs/api
// Rate limits: 150 API calls/min on most plans; burst up to 300/min with credits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ChargebeeConfig {
  apiKey: string;
  /**
   * Your Chargebee site name (the subdomain of your Chargebee account).
   * Example: if your URL is https://acme-test.chargebee.com, set site to "acme-test".
   */
  site: string;
  /**
   * Base URL override. Defaults to https://{site}.chargebee.com/api/v2.
   * Override only if using a custom domain or EU data residency.
   */
  baseUrl?: string;
}

export class ChargebeeMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ChargebeeConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || `https://${config.site}.chargebee.com/api/v2`;
  }

  private get authHeader(): string {
    // Chargebee uses HTTP Basic auth: API key as username, empty password.
    return `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_subscriptions',
        description: 'List subscriptions with optional filters for customer ID, status, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of subscriptions to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
            customerId: {
              type: 'string',
              description: 'Filter by customer ID',
            },
            status: {
              type: 'string',
              description: 'Filter by subscription status: active, cancelled, future, in_trial, non_renewing, paused',
            },
          },
        },
      },
      {
        name: 'get_subscription',
        description: 'Retrieve full details of a specific subscription by its Chargebee subscription ID',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: {
              type: 'string',
              description: 'The Chargebee subscription ID',
            },
          },
          required: ['subscriptionId'],
        },
      },
      {
        name: 'create_subscription',
        description: 'Create a new subscription for an existing customer with a specified plan or item price',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              description: 'The Chargebee customer ID to attach the subscription to',
            },
            planId: {
              type: 'string',
              description: 'Plan ID (Product Catalog 1.0). Use itemPriceId for Product Catalog 2.0',
            },
            itemPriceId: {
              type: 'string',
              description: 'Item price ID (Product Catalog 2.0). Use planId for Product Catalog 1.0',
            },
            billingCycles: {
              type: 'number',
              description: 'Number of billing cycles the subscription should run before cancellation',
            },
            startDate: {
              type: 'number',
              description: 'Unix timestamp for the subscription start date (future subscriptions)',
            },
            trialEnd: {
              type: 'number',
              description: 'Unix timestamp to override the default trial end date',
            },
          },
          required: ['customerId'],
        },
      },
      {
        name: 'update_subscription',
        description: 'Update an existing subscription — change plan, quantity, billing cycle, or addons',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: {
              type: 'string',
              description: 'The Chargebee subscription ID to update',
            },
            planId: {
              type: 'string',
              description: 'New plan ID (Product Catalog 1.0)',
            },
            planQuantity: {
              type: 'number',
              description: 'New quantity for the plan',
            },
            billingCycles: {
              type: 'number',
              description: 'New billing cycles value',
            },
            endOfTerm: {
              type: 'boolean',
              description: 'If true, changes take effect at the end of the current term (default: false)',
            },
          },
          required: ['subscriptionId'],
        },
      },
      {
        name: 'cancel_subscription',
        description: 'Cancel a subscription immediately or at the end of the current billing term',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: {
              type: 'string',
              description: 'The Chargebee subscription ID to cancel',
            },
            endOfTerm: {
              type: 'boolean',
              description: 'If true, the subscription is cancelled at end of current term. Defaults to false (immediate)',
            },
            cancelReasonCode: {
              type: 'string',
              description: 'Reason code for the cancellation',
            },
          },
          required: ['subscriptionId'],
        },
      },
      {
        name: 'pause_subscription',
        description: 'Pause a subscription temporarily, halting billing until it is resumed',
        inputSchema: {
          type: 'object',
          properties: {
            subscriptionId: {
              type: 'string',
              description: 'The Chargebee subscription ID to pause',
            },
            pauseDate: {
              type: 'number',
              description: 'Unix timestamp for when to pause (default: immediately)',
            },
            resumeDate: {
              type: 'number',
              description: 'Unix timestamp for when to automatically resume the subscription',
            },
          },
          required: ['subscriptionId'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customers with optional filters for email, and pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of customers to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
            email: {
              type: 'string',
              description: 'Filter by customer email address',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Retrieve full details of a specific customer by their Chargebee customer ID',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              description: 'The Chargebee customer ID',
            },
          },
          required: ['customerId'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer record in Chargebee with billing information',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Customer email address',
            },
            firstName: {
              type: 'string',
              description: 'Customer first name',
            },
            lastName: {
              type: 'string',
              description: 'Customer last name',
            },
            company: {
              type: 'string',
              description: 'Company name',
            },
            phone: {
              type: 'string',
              description: 'Customer phone number',
            },
            billingAddressLine1: {
              type: 'string',
              description: 'Billing address line 1',
            },
            billingAddressCity: {
              type: 'string',
              description: 'Billing address city',
            },
            billingAddressState: {
              type: 'string',
              description: 'Billing address state/province',
            },
            billingAddressZip: {
              type: 'string',
              description: 'Billing address postal code',
            },
            billingAddressCountry: {
              type: 'string',
              description: 'Billing address country code (ISO 3166-1 alpha-2, e.g. US)',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'update_customer',
        description: 'Update an existing customer record — name, email, company, phone, or billing address',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              description: 'The Chargebee customer ID to update',
            },
            email: {
              type: 'string',
              description: 'New email address',
            },
            firstName: {
              type: 'string',
              description: 'New first name',
            },
            lastName: {
              type: 'string',
              description: 'New last name',
            },
            company: {
              type: 'string',
              description: 'New company name',
            },
            phone: {
              type: 'string',
              description: 'New phone number',
            },
          },
          required: ['customerId'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List invoices with optional filters for customer ID, subscription ID, status, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of invoices to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
            customerId: {
              type: 'string',
              description: 'Filter by customer ID',
            },
            subscriptionId: {
              type: 'string',
              description: 'Filter by subscription ID',
            },
            status: {
              type: 'string',
              description: 'Filter by invoice status: paid, posted, payment_due, not_paid, voided, pending',
            },
          },
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve full details of a specific invoice by its Chargebee invoice ID',
        inputSchema: {
          type: 'object',
          properties: {
            invoiceId: {
              type: 'string',
              description: 'The Chargebee invoice ID',
            },
          },
          required: ['invoiceId'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List payment transactions with optional filters for customer ID, subscription ID, and payment status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of transactions to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
            customerId: {
              type: 'string',
              description: 'Filter by customer ID',
            },
            subscriptionId: {
              type: 'string',
              description: 'Filter by subscription ID',
            },
            paymentStatus: {
              type: 'string',
              description: 'Filter by payment status: success, failed, voided, timeout, needs_attention, in_progress',
            },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Retrieve full details of a specific payment transaction by its Chargebee transaction ID',
        inputSchema: {
          type: 'object',
          properties: {
            transactionId: {
              type: 'string',
              description: 'The Chargebee transaction ID',
            },
          },
          required: ['transactionId'],
        },
      },
      {
        name: 'list_payment_sources',
        description: 'List payment sources for a customer — cards, bank accounts, and other payment methods on file',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: {
              type: 'string',
              description: 'The Chargebee customer ID whose payment sources to list',
            },
            limit: {
              type: 'number',
              description: 'Number of payment sources to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
          },
          required: ['customerId'],
        },
      },
      {
        name: 'list_plans',
        description: 'List plans in the account (Product Catalog 1.0). For Product Catalog 2.0, use list_items',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of plans to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
            status: {
              type: 'string',
              description: 'Filter by plan status: active, archived',
            },
          },
        },
      },
      {
        name: 'list_items',
        description: 'List items in the account (Product Catalog 2.0) — the catalog of products and services',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of items to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
            status: {
              type: 'string',
              description: 'Filter by item status: active, archived, deleted',
            },
            type: {
              type: 'string',
              description: 'Filter by item type: plan, addon, charge',
            },
          },
        },
      },
      {
        name: 'list_coupons',
        description: 'List coupons defined in the account with optional filter for status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of coupons to return (max 100, default 10)',
            },
            offset: {
              type: 'string',
              description: 'Pagination offset token from a previous response',
            },
            status: {
              type: 'string',
              description: 'Filter by coupon status: active, expired, archived, deleted',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_subscriptions':
          return await this.listSubscriptions(args);
        case 'get_subscription':
          return await this.getSubscription(args);
        case 'create_subscription':
          return await this.createSubscription(args);
        case 'update_subscription':
          return await this.updateSubscription(args);
        case 'cancel_subscription':
          return await this.cancelSubscription(args);
        case 'pause_subscription':
          return await this.pauseSubscription(args);
        case 'list_customers':
          return await this.listCustomers(args);
        case 'get_customer':
          return await this.getCustomer(args);
        case 'create_customer':
          return await this.createCustomer(args);
        case 'update_customer':
          return await this.updateCustomer(args);
        case 'list_invoices':
          return await this.listInvoices(args);
        case 'get_invoice':
          return await this.getInvoice(args);
        case 'list_transactions':
          return await this.listTransactions(args);
        case 'get_transaction':
          return await this.getTransaction(args);
        case 'list_payment_sources':
          return await this.listPaymentSources(args);
        case 'list_plans':
          return await this.listPlans(args);
        case 'list_items':
          return await this.listItems(args);
        case 'list_coupons':
          return await this.listCoupons(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  private async chargebeeGet(path: string, params: URLSearchParams): Promise<ToolResult> {
    const query = params.toString();
    const url = `${this.baseUrl}${path}${query ? `?${query}` : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `Chargebee API error (HTTP ${response.status}): ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Chargebee returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async chargebeePost(path: string, body: URLSearchParams): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: body.toString(),
    });
    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `Chargebee API error (HTTP ${response.status}): ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Chargebee returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', args.offset as string);
    if (args.customerId) params.set('customer_id[is]', args.customerId as string);
    if (args.status) params.set('status[is]', args.status as string);
    return this.chargebeeGet('/subscriptions', params);
  }

  private async getSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.subscriptionId as string;
    if (!id) return { content: [{ type: 'text', text: 'subscriptionId is required' }], isError: true };
    return this.chargebeeGet(`/subscriptions/${encodeURIComponent(id)}`, new URLSearchParams());
  }

  private async createSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const customerId = args.customerId as string;
    if (!customerId) return { content: [{ type: 'text', text: 'customerId is required' }], isError: true };
    const body = new URLSearchParams();
    body.set('customer_id', customerId);
    if (args.planId) body.set('plan_id', args.planId as string);
    if (args.itemPriceId) body.set('subscription_items[item_price_id][0]', args.itemPriceId as string);
    if (args.billingCycles) body.set('billing_cycles', String(args.billingCycles));
    if (args.startDate) body.set('start_date', String(args.startDate));
    if (args.trialEnd) body.set('trial_end', String(args.trialEnd));
    return this.chargebeePost('/subscriptions', body);
  }

  private async updateSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.subscriptionId as string;
    if (!id) return { content: [{ type: 'text', text: 'subscriptionId is required' }], isError: true };
    const body = new URLSearchParams();
    if (args.planId) body.set('plan_id', args.planId as string);
    if (args.planQuantity) body.set('plan_quantity', String(args.planQuantity));
    if (args.billingCycles) body.set('billing_cycles', String(args.billingCycles));
    if (typeof args.endOfTerm === 'boolean') body.set('end_of_term', String(args.endOfTerm));
    return this.chargebeePost(`/subscriptions/${encodeURIComponent(id)}`, body);
  }

  private async cancelSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.subscriptionId as string;
    if (!id) return { content: [{ type: 'text', text: 'subscriptionId is required' }], isError: true };
    const body = new URLSearchParams();
    if (typeof args.endOfTerm === 'boolean') body.set('end_of_term', String(args.endOfTerm));
    if (args.cancelReasonCode) body.set('cancel_reason_code', args.cancelReasonCode as string);
    return this.chargebeePost(`/subscriptions/${encodeURIComponent(id)}/cancel`, body);
  }

  private async pauseSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.subscriptionId as string;
    if (!id) return { content: [{ type: 'text', text: 'subscriptionId is required' }], isError: true };
    const body = new URLSearchParams();
    if (args.pauseDate) body.set('pause_date', String(args.pauseDate));
    if (args.resumeDate) body.set('resume_date', String(args.resumeDate));
    return this.chargebeePost(`/subscriptions/${encodeURIComponent(id)}/pause`, body);
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', args.offset as string);
    if (args.email) params.set('email[is]', args.email as string);
    return this.chargebeeGet('/customers', params);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.customerId as string;
    if (!id) return { content: [{ type: 'text', text: 'customerId is required' }], isError: true };
    return this.chargebeeGet(`/customers/${encodeURIComponent(id)}`, new URLSearchParams());
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const body = new URLSearchParams();
    body.set('email', args.email as string);
    if (args.firstName) body.set('first_name', args.firstName as string);
    if (args.lastName) body.set('last_name', args.lastName as string);
    if (args.company) body.set('company', args.company as string);
    if (args.phone) body.set('phone', args.phone as string);
    if (args.billingAddressLine1) body.set('billing_address[line1]', args.billingAddressLine1 as string);
    if (args.billingAddressCity) body.set('billing_address[city]', args.billingAddressCity as string);
    if (args.billingAddressState) body.set('billing_address[state]', args.billingAddressState as string);
    if (args.billingAddressZip) body.set('billing_address[zip]', args.billingAddressZip as string);
    if (args.billingAddressCountry) body.set('billing_address[country]', args.billingAddressCountry as string);
    return this.chargebeePost('/customers', body);
  }

  private async updateCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.customerId as string;
    if (!id) return { content: [{ type: 'text', text: 'customerId is required' }], isError: true };
    const body = new URLSearchParams();
    if (args.email) body.set('email', args.email as string);
    if (args.firstName) body.set('first_name', args.firstName as string);
    if (args.lastName) body.set('last_name', args.lastName as string);
    if (args.company) body.set('company', args.company as string);
    if (args.phone) body.set('phone', args.phone as string);
    return this.chargebeePost(`/customers/${encodeURIComponent(id)}`, body);
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', args.offset as string);
    if (args.customerId) params.set('customer_id[is]', args.customerId as string);
    if (args.subscriptionId) params.set('subscription_id[is]', args.subscriptionId as string);
    if (args.status) params.set('status[is]', args.status as string);
    return this.chargebeeGet('/invoices', params);
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.invoiceId as string;
    if (!id) return { content: [{ type: 'text', text: 'invoiceId is required' }], isError: true };
    return this.chargebeeGet(`/invoices/${encodeURIComponent(id)}`, new URLSearchParams());
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', args.offset as string);
    if (args.customerId) params.set('customer_id[is]', args.customerId as string);
    if (args.subscriptionId) params.set('subscription_id[is]', args.subscriptionId as string);
    if (args.paymentStatus) params.set('payment_status[is]', args.paymentStatus as string);
    return this.chargebeeGet('/transactions', params);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.transactionId as string;
    if (!id) return { content: [{ type: 'text', text: 'transactionId is required' }], isError: true };
    return this.chargebeeGet(`/transactions/${encodeURIComponent(id)}`, new URLSearchParams());
  }

  private async listPaymentSources(args: Record<string, unknown>): Promise<ToolResult> {
    const customerId = args.customerId as string;
    if (!customerId) return { content: [{ type: 'text', text: 'customerId is required' }], isError: true };
    const params = new URLSearchParams();
    params.set('customer_id[is]', customerId);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', args.offset as string);
    return this.chargebeeGet('/payment_sources', params);
  }

  private async listPlans(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', args.offset as string);
    if (args.status) params.set('status[is]', args.status as string);
    return this.chargebeeGet('/plans', params);
  }

  private async listItems(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', args.offset as string);
    if (args.status) params.set('status[is]', args.status as string);
    if (args.type) params.set('type[is]', args.type as string);
    return this.chargebeeGet('/items', params);
  }

  private async listCoupons(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', args.offset as string);
    if (args.status) params.set('status[is]', args.status as string);
    return this.chargebeeGet('/coupons', params);
  }

  static catalog() {
    return {
      name: 'chargebee',
      displayName: 'Chargebee',
      version: '1.0.0',
      category: 'commerce' as const,
      keywords: ['chargebee', 'subscription', 'billing', 'invoice', 'customer', 'payment', 'plan', 'coupon', 'cancel', 'trial', 'recurring', 'saas', 'revenue', 'transaction', 'product catalog'],
      toolNames: ['list_subscriptions', 'get_subscription', 'create_subscription', 'update_subscription', 'cancel_subscription', 'pause_subscription', 'list_customers', 'get_customer', 'create_customer', 'update_customer', 'list_invoices', 'get_invoice', 'list_transactions', 'get_transaction', 'list_payment_sources', 'list_plans', 'list_items', 'list_coupons'],
      description: 'Chargebee subscription billing: manage subscriptions, customers, invoices, transactions, payment sources, plans, items, and coupons via REST API v2.',
      author: 'protectnil' as const,
    };
  }
}
