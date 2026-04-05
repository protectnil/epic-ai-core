/**
 * Duck Creek Technologies MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Duck Creek Technologies MCP server was found on GitHub, npm, or the Duck Creek developer portal.
// Duck Creek Anywhere exposes tenant-scoped REST APIs for Policy, Billing, Claims, and Rating.
// Each deployment runs at a carrier-specific subdomain: https://{tenant}.duckcreek.net
// Our adapter covers: 19 tools.
//
// Base URL: https://{tenant}.duckcreek.net (tenant-scoped; set via config.baseUrl)
// Auth: OAuth2 client credentials — POST /oauth2/token with client_id + client_secret (Basic auth)
// Docs: https://www.duckcreek.com/product/anywhere-integration/
// Rate limits: Not publicly documented; subject to tenant-level throttling agreements

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DuckCreekConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string; // e.g. https://mycarrier.duckcreek.net — no default, tenant-specific
}

export class DuckCreekMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: DuckCreekConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'duck-creek',
      displayName: 'Duck Creek Technologies',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'duck creek', 'insurance', 'p&c', 'property casualty', 'policy', 'claims', 'billing',
        'rating', 'underwriting', 'agent', 'carrier', 'premium', 'endorsement', 'renewal',
        'loss', 'coverage', 'insured', 'anywhere api',
      ],
      toolNames: [
        'list_policies', 'get_policy', 'search_policies', 'create_policy', 'update_policy', 'endorse_policy',
        'list_claims', 'get_claim', 'create_claim', 'update_claim',
        'list_accounts', 'get_account', 'search_accounts',
        'get_billing_account', 'list_invoices', 'get_invoice',
        'get_rate_quote', 'list_agents', 'get_agent',
      ],
      description: 'Duck Creek insurance SaaS: manage policies, claims, billing accounts, invoices, agents, and rate quotes for P&C carriers.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_policies',
        description: 'List insurance policies with optional filters for status, product line, and insured name',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by policy status: Active, Cancelled, Expired, Pending (default: Active)',
            },
            product_line: {
              type: 'string',
              description: 'Filter by product line e.g. PersonalAuto, Homeowners, CommercialAuto, BOP',
            },
            insured_name: {
              type: 'string',
              description: 'Partial or full name of the insured to filter by',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 50, max: 200)',
            },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Retrieve full details of a single insurance policy by policy number or system ID',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'Policy number or system policy ID',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'search_policies',
        description: 'Search policies by insured name, address, VIN, or policy number with full-text matching',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term: insured name, policy number, VIN, address, or phone number',
            },
            product_line: {
              type: 'string',
              description: 'Narrow search to a specific product line e.g. PersonalAuto, Homeowners',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 25, max: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_policy',
        description: 'Create a new insurance policy from a rated quote or policy application data',
        inputSchema: {
          type: 'object',
          properties: {
            product_line: {
              type: 'string',
              description: 'Product line: PersonalAuto, Homeowners, CommercialAuto, BOP, etc.',
            },
            account_id: {
              type: 'string',
              description: 'Account ID for the insured this policy belongs to',
            },
            effective_date: {
              type: 'string',
              description: 'Policy effective date in YYYY-MM-DD format',
            },
            expiration_date: {
              type: 'string',
              description: 'Policy expiration date in YYYY-MM-DD format',
            },
            coverages: {
              type: 'string',
              description: 'JSON string of coverage objects with limit and deductible values',
            },
          },
          required: ['product_line', 'account_id', 'effective_date', 'expiration_date'],
        },
      },
      {
        name: 'update_policy',
        description: 'Update editable fields on an existing policy such as contact info or payment plan',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'Policy number or system policy ID to update',
            },
            fields: {
              type: 'string',
              description: 'JSON string of field name/value pairs to update',
            },
          },
          required: ['policy_id', 'fields'],
        },
      },
      {
        name: 'endorse_policy',
        description: 'Create a mid-term endorsement on an active policy to change coverage, vehicles, or drivers',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'Policy number or system ID to endorse',
            },
            effective_date: {
              type: 'string',
              description: 'Endorsement effective date in YYYY-MM-DD format',
            },
            changes: {
              type: 'string',
              description: 'JSON string describing the coverage or risk changes to apply',
            },
            reason: {
              type: 'string',
              description: 'Reason for the endorsement e.g. add vehicle, coverage change, address update',
            },
          },
          required: ['policy_id', 'effective_date', 'changes'],
        },
      },
      {
        name: 'list_claims',
        description: 'List claims with optional filters for status, policy number, loss date range, and type of loss',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Claim status filter: Open, Closed, Pending, Denied (default: Open)',
            },
            policy_id: {
              type: 'string',
              description: 'Restrict results to claims on a specific policy',
            },
            loss_date_from: {
              type: 'string',
              description: 'Filter claims with loss date on or after YYYY-MM-DD',
            },
            loss_date_to: {
              type: 'string',
              description: 'Filter claims with loss date on or before YYYY-MM-DD',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_claim',
        description: 'Retrieve full details of a single claim including reserves, payments, and notes',
        inputSchema: {
          type: 'object',
          properties: {
            claim_id: {
              type: 'string',
              description: 'Claim number or system claim ID',
            },
          },
          required: ['claim_id'],
        },
      },
      {
        name: 'create_claim',
        description: 'Open a first notice of loss (FNOL) claim on a policy with loss date and description',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'Policy number the claim is filed against',
            },
            loss_date: {
              type: 'string',
              description: 'Date of the loss event in YYYY-MM-DD format',
            },
            loss_description: {
              type: 'string',
              description: 'Narrative description of the loss event',
            },
            loss_type: {
              type: 'string',
              description: 'Category of loss e.g. Collision, Fire, Theft, Liability, Weather',
            },
            reported_by: {
              type: 'string',
              description: 'Name of the person reporting the claim',
            },
          },
          required: ['policy_id', 'loss_date', 'loss_description'],
        },
      },
      {
        name: 'update_claim',
        description: 'Update a claim with adjuster notes, reserve changes, or status transitions',
        inputSchema: {
          type: 'object',
          properties: {
            claim_id: {
              type: 'string',
              description: 'Claim number or system claim ID',
            },
            status: {
              type: 'string',
              description: 'New status: Open, Closed, Pending, Denied',
            },
            adjuster_notes: {
              type: 'string',
              description: 'Adjuster notes or activity log entry to append',
            },
            reserve_amount: {
              type: 'number',
              description: 'Updated reserve amount in dollars',
            },
          },
          required: ['claim_id'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List insured accounts with optional name and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Partial or full account/insured name to filter by',
            },
            status: {
              type: 'string',
              description: 'Account status: Active, Inactive (default: Active)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Retrieve full profile of an insured account including contact info and linked policies',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'System account ID or account number',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'search_accounts',
        description: 'Search insured accounts by name, phone, email, or address',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term: name, phone number, email address, or street address',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 25)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_billing_account',
        description: 'Get the billing account summary including balance, payment plan, and next due date',
        inputSchema: {
          type: 'object',
          properties: {
            billing_account_id: {
              type: 'string',
              description: 'Billing account ID associated with a policy or insured',
            },
          },
          required: ['billing_account_id'],
        },
      },
      {
        name: 'list_invoices',
        description: 'List invoices for a billing account with status and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            billing_account_id: {
              type: 'string',
              description: 'Billing account ID to list invoices for',
            },
            status: {
              type: 'string',
              description: 'Invoice status: Due, Paid, Overdue, Cancelled',
            },
            due_date_from: {
              type: 'string',
              description: 'Filter invoices due on or after YYYY-MM-DD',
            },
            due_date_to: {
              type: 'string',
              description: 'Filter invoices due on or before YYYY-MM-DD',
            },
          },
          required: ['billing_account_id'],
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve details of a single invoice including line items, taxes, and payment history',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'string',
              description: 'Invoice ID or invoice number',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'get_rate_quote',
        description: 'Request a premium rate quote for a risk based on coverage selections and underwriting data',
        inputSchema: {
          type: 'object',
          properties: {
            product_line: {
              type: 'string',
              description: 'Product line to rate: PersonalAuto, Homeowners, CommercialAuto, BOP, etc.',
            },
            risk_data: {
              type: 'string',
              description: 'JSON string containing the risk inputs: driver info, vehicle, property details, etc.',
            },
            coverages: {
              type: 'string',
              description: 'JSON string of requested coverage selections with limits and deductibles',
            },
            effective_date: {
              type: 'string',
              description: 'Desired policy effective date in YYYY-MM-DD format',
            },
          },
          required: ['product_line', 'risk_data'],
        },
      },
      {
        name: 'list_agents',
        description: 'List agents and producers with optional name, agency, and state filters',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Partial or full agent name to filter by',
            },
            agency_id: {
              type: 'string',
              description: 'Filter agents belonging to a specific agency',
            },
            state: {
              type: 'string',
              description: 'Two-letter state code to filter licensed agents e.g. TX, CA',
            },
            status: {
              type: 'string',
              description: 'Agent status: Active, Inactive (default: Active)',
            },
          },
        },
      },
      {
        name: 'get_agent',
        description: 'Retrieve full profile of an agent or producer including license numbers and agency affiliations',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'Agent system ID or producer code',
            },
          },
          required: ['agent_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_policies': return this.listPolicies(args);
        case 'get_policy': return this.getPolicy(args);
        case 'search_policies': return this.searchPolicies(args);
        case 'create_policy': return this.createPolicy(args);
        case 'update_policy': return this.updatePolicy(args);
        case 'endorse_policy': return this.endorsePolicy(args);
        case 'list_claims': return this.listClaims(args);
        case 'get_claim': return this.getClaim(args);
        case 'create_claim': return this.createClaim(args);
        case 'update_claim': return this.updateClaim(args);
        case 'list_accounts': return this.listAccounts(args);
        case 'get_account': return this.getAccount(args);
        case 'search_accounts': return this.searchAccounts(args);
        case 'get_billing_account': return this.getBillingAccount(args);
        case 'list_invoices': return this.listInvoices(args);
        case 'get_invoice': return this.getInvoice(args);
        case 'get_rate_quote': return this.getRateQuote(args);
        case 'list_agents': return this.listAgents(args);
        case 'get_agent': return this.getAgent(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async dcGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async dcPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async dcPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }


  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.status) params.status = args.status as string;
    if (args.product_line) params.productLine = args.product_line as string;
    if (args.insured_name) params.insuredName = args.insured_name as string;
    return this.dcGet('/api/v1/policies', params);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    return this.dcGet(`/api/v1/policies/${encodeURIComponent(args.policy_id as string)}`);
  }

  private async searchPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      q: args.query as string,
      limit: String((args.limit as number) ?? 25),
    };
    if (args.product_line) params.productLine = args.product_line as string;
    return this.dcGet('/api/v1/policies/search', params);
  }

  private async createPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_line || !args.account_id || !args.effective_date || !args.expiration_date) {
      return { content: [{ type: 'text', text: 'product_line, account_id, effective_date, and expiration_date are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      productLine: args.product_line,
      accountId: args.account_id,
      effectiveDate: args.effective_date,
      expirationDate: args.expiration_date,
    };
    if (args.coverages) {
      try { body.coverages = JSON.parse(args.coverages as string); } catch { body.coverages = args.coverages; }
    }
    return this.dcPost('/api/v1/policies', body);
  }

  private async updatePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id || !args.fields) return { content: [{ type: 'text', text: 'policy_id and fields are required' }], isError: true };
    let fields: Record<string, unknown>;
    try { fields = JSON.parse(args.fields as string); } catch { return { content: [{ type: 'text', text: 'fields must be a valid JSON string' }], isError: true }; }
    return this.dcPatch(`/api/v1/policies/${encodeURIComponent(args.policy_id as string)}`, fields);
  }

  private async endorsePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id || !args.effective_date || !args.changes) {
      return { content: [{ type: 'text', text: 'policy_id, effective_date, and changes are required' }], isError: true };
    }
    let changes: Record<string, unknown>;
    try { changes = JSON.parse(args.changes as string); } catch { return { content: [{ type: 'text', text: 'changes must be a valid JSON string' }], isError: true }; }
    const body: Record<string, unknown> = {
      effectiveDate: args.effective_date,
      changes,
    };
    if (args.reason) body.reason = args.reason;
    return this.dcPost(`/api/v1/policies/${encodeURIComponent(args.policy_id as string)}/endorsements`, body);
  }

  private async listClaims(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.status) params.status = args.status as string;
    if (args.policy_id) params.policyId = args.policy_id as string;
    if (args.loss_date_from) params.lossDateFrom = args.loss_date_from as string;
    if (args.loss_date_to) params.lossDateTo = args.loss_date_to as string;
    return this.dcGet('/api/v1/claims', params);
  }

  private async getClaim(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.claim_id) return { content: [{ type: 'text', text: 'claim_id is required' }], isError: true };
    return this.dcGet(`/api/v1/claims/${encodeURIComponent(args.claim_id as string)}`);
  }

  private async createClaim(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id || !args.loss_date || !args.loss_description) {
      return { content: [{ type: 'text', text: 'policy_id, loss_date, and loss_description are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      policyId: args.policy_id,
      lossDate: args.loss_date,
      lossDescription: args.loss_description,
    };
    if (args.loss_type) body.lossType = args.loss_type;
    if (args.reported_by) body.reportedBy = args.reported_by;
    return this.dcPost('/api/v1/claims', body);
  }

  private async updateClaim(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.claim_id) return { content: [{ type: 'text', text: 'claim_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.adjuster_notes) body.adjusterNotes = args.adjuster_notes;
    if (typeof args.reserve_amount === 'number') body.reserveAmount = args.reserve_amount;
    return this.dcPatch(`/api/v1/claims/${encodeURIComponent(args.claim_id as string)}`, body);
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      pageSize: String((args.page_size as number) ?? 50),
    };
    if (args.name) params.name = args.name as string;
    if (args.status) params.status = args.status as string;
    return this.dcGet('/api/v1/accounts', params);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.dcGet(`/api/v1/accounts/${encodeURIComponent(args.account_id as string)}`);
  }

  private async searchAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      q: args.query as string,
      limit: String((args.limit as number) ?? 25),
    };
    return this.dcGet('/api/v1/accounts/search', params);
  }

  private async getBillingAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.billing_account_id) return { content: [{ type: 'text', text: 'billing_account_id is required' }], isError: true };
    return this.dcGet(`/api/v1/billing/accounts/${encodeURIComponent(args.billing_account_id as string)}`);
  }

  private async listInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.billing_account_id) return { content: [{ type: 'text', text: 'billing_account_id is required' }], isError: true };
    const params: Record<string, string> = { billingAccountId: args.billing_account_id as string };
    if (args.status) params.status = args.status as string;
    if (args.due_date_from) params.dueDateFrom = args.due_date_from as string;
    if (args.due_date_to) params.dueDateTo = args.due_date_to as string;
    return this.dcGet('/api/v1/billing/invoices', params);
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.invoice_id) return { content: [{ type: 'text', text: 'invoice_id is required' }], isError: true };
    return this.dcGet(`/api/v1/billing/invoices/${encodeURIComponent(args.invoice_id as string)}`);
  }

  private async getRateQuote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_line || !args.risk_data) {
      return { content: [{ type: 'text', text: 'product_line and risk_data are required' }], isError: true };
    }
    let riskData: Record<string, unknown>;
    try { riskData = JSON.parse(args.risk_data as string); } catch { return { content: [{ type: 'text', text: 'risk_data must be a valid JSON string' }], isError: true }; }
    const body: Record<string, unknown> = { productLine: args.product_line, riskData };
    if (args.coverages) {
      try { body.coverages = JSON.parse(args.coverages as string); } catch { body.coverages = args.coverages; }
    }
    if (args.effective_date) body.effectiveDate = args.effective_date;
    return this.dcPost('/api/v1/rating/quote', body);
  }

  private async listAgents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.name) params.name = args.name as string;
    if (args.agency_id) params.agencyId = args.agency_id as string;
    if (args.state) params.state = args.state as string;
    if (args.status) params.status = args.status as string;
    return this.dcGet('/api/v1/agents', params);
  }

  private async getAgent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agent_id) return { content: [{ type: 'text', text: 'agent_id is required' }], isError: true };
    return this.dcGet(`/api/v1/agents/${encodeURIComponent(args.agent_id as string)}`);
  }
}
