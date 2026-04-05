/**
 * Majesco Insurance Platform MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Majesco Policy Administration & Claims REST API
// Base URL: configurable (e.g. https://your-instance.majesco.com/api/v1)
// Auth: OAuth2 Bearer token (client_credentials grant via Majesco Identity Server)
// Docs: https://developers.majesco.com (Majesco Developer Portal)
// Rate limits: not publicly documented; varies by subscription tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MajescoConfig {
  baseUrl: string;
  /** OAuth2 access token — provide directly or configure tokenUrl + clientId + clientSecret for auto-refresh */
  bearerToken?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

export class MajescoMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private bearerToken: string;
  private readonly tokenUrl: string | undefined;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private tokenExpiry: number = 0;

  constructor(config: MajescoConfig) {
    super();
    if (!config.bearerToken && !(config.tokenUrl && config.clientId && config.clientSecret)) {
      throw new Error('MajescoMCPServer: provide either bearerToken or tokenUrl + clientId + clientSecret');
    }
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.bearerToken = config.bearerToken ?? '';
    this.tokenUrl = config.tokenUrl;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  static catalog() {
    return {
      name: 'majesco',
      displayName: 'Majesco Insurance Platform',
      version: '1.0.0',
      category: 'insurance',
      keywords: [
        'majesco', 'insurance', 'policy', 'claims', 'premium', 'endorsement',
        'agents', 'billing', 'policy administration', 'p&c', 'life', 'annuity',
        'underwriting', 'quote', 'coverage',
      ],
      toolNames: [
        'search_policies', 'get_policy', 'create_policy', 'update_policy',
        'search_claims', 'get_claim', 'create_claim', 'update_claim_status',
        'get_premium_quote', 'list_agents', 'get_agent',
        'list_products', 'get_billing_account', 'create_endorsement',
      ],
      description: 'Majesco insurance platform: manage policies, claims, premium quotes, agents, billing accounts, and endorsements for P&C and life insurance lines.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_policies',
        description: 'Search insurance policies by insured name, policy number, product, or status',
        inputSchema: {
          type: 'object',
          properties: {
            policy_number: { type: 'string', description: 'Policy number to search for (exact or partial match)' },
            insured_name: { type: 'string', description: 'Insured party name to search' },
            product_code: { type: 'string', description: 'Insurance product code to filter results' },
            status: { type: 'string', description: 'Policy status: active, expired, cancelled, pending, lapsed' },
            effective_from: { type: 'string', description: 'Filter policies effective on or after (YYYY-MM-DD)' },
            effective_to: { type: 'string', description: 'Filter policies effective on or before (YYYY-MM-DD)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 25)' },
          },
        },
      },
      {
        name: 'get_policy',
        description: 'Get full policy details by policy ID, including coverages, limits, deductibles, and premium',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: { type: 'string', description: 'Majesco policy ID' },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'create_policy',
        description: 'Create a new insurance policy in Majesco policy administration',
        inputSchema: {
          type: 'object',
          properties: {
            product_code: { type: 'string', description: 'Insurance product code (required)' },
            insured_id: { type: 'string', description: 'Insured party ID (required)' },
            effective_date: { type: 'string', description: 'Policy effective date (YYYY-MM-DD, required)' },
            expiration_date: { type: 'string', description: 'Policy expiration date (YYYY-MM-DD, required)' },
            agent_id: { type: 'string', description: 'Writing agent ID' },
            premium: { type: 'number', description: 'Annual premium amount' },
            coverages: {
              type: 'array',
              description: 'Array of coverage objects',
              items: {
                type: 'object',
                properties: {
                  coverage_code: { type: 'string', description: 'Coverage type code' },
                  limit: { type: 'number', description: 'Coverage limit amount' },
                  deductible: { type: 'number', description: 'Deductible amount' },
                },
              },
            },
          },
          required: ['product_code', 'insured_id', 'effective_date', 'expiration_date'],
        },
      },
      {
        name: 'update_policy',
        description: 'Update an existing insurance policy (address change, coverage modification, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: { type: 'string', description: 'Policy ID to update (required)' },
            status: { type: 'string', description: 'New policy status' },
            premium: { type: 'number', description: 'Updated premium amount' },
            expiration_date: { type: 'string', description: 'Updated expiration date (YYYY-MM-DD)' },
            coverages: {
              type: 'array',
              description: 'Updated coverage objects (replaces existing coverages if provided)',
              items: {
                type: 'object',
                properties: {
                  coverage_code: { type: 'string', description: 'Coverage type code' },
                  limit: { type: 'number', description: 'Coverage limit amount' },
                  deductible: { type: 'number', description: 'Deductible amount' },
                },
              },
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'search_claims',
        description: 'Search insurance claims by policy number, claimant, claim type, or status',
        inputSchema: {
          type: 'object',
          properties: {
            claim_number: { type: 'string', description: 'Claim number to search for' },
            policy_id: { type: 'string', description: 'Policy ID to filter claims' },
            claimant_name: { type: 'string', description: 'Claimant name to search' },
            status: { type: 'string', description: 'Claim status: open, closed, pending, denied, paid' },
            loss_from: { type: 'string', description: 'Filter by loss date on or after (YYYY-MM-DD)' },
            loss_to: { type: 'string', description: 'Filter by loss date on or before (YYYY-MM-DD)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 25)' },
          },
        },
      },
      {
        name: 'get_claim',
        description: 'Get full claim details by claim ID, including loss details, reserves, payments, and notes',
        inputSchema: {
          type: 'object',
          properties: {
            claim_id: { type: 'string', description: 'Majesco claim ID' },
          },
          required: ['claim_id'],
        },
      },
      {
        name: 'create_claim',
        description: 'File a new insurance claim against a policy in Majesco',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: { type: 'string', description: 'Policy ID the claim is filed against (required)' },
            loss_date: { type: 'string', description: 'Date of loss (YYYY-MM-DD, required)' },
            report_date: { type: 'string', description: 'Date claim was reported (YYYY-MM-DD, defaults to today)' },
            loss_description: { type: 'string', description: 'Description of the loss event (required)' },
            claimant_name: { type: 'string', description: 'Name of the claimant' },
            claimant_phone: { type: 'string', description: 'Claimant phone number' },
            claimant_email: { type: 'string', description: 'Claimant email address' },
            loss_location: { type: 'string', description: 'Location where the loss occurred' },
            estimated_loss_amount: { type: 'number', description: 'Estimated amount of the loss' },
            coverage_code: { type: 'string', description: 'Coverage code the claim is filed under' },
          },
          required: ['policy_id', 'loss_date', 'loss_description'],
        },
      },
      {
        name: 'update_claim_status',
        description: 'Update the status of an existing insurance claim (e.g., open to closed, add reserve, mark paid)',
        inputSchema: {
          type: 'object',
          properties: {
            claim_id: { type: 'string', description: 'Claim ID to update (required)' },
            status: { type: 'string', description: 'New claim status: open, closed, pending, denied, paid (required)' },
            reserve_amount: { type: 'number', description: 'Updated reserve amount' },
            paid_amount: { type: 'number', description: 'Amount paid on the claim' },
            closure_reason: { type: 'string', description: 'Reason for closing or denying the claim' },
            adjuster_notes: { type: 'string', description: 'Notes from the claims adjuster' },
          },
          required: ['claim_id', 'status'],
        },
      },
      {
        name: 'get_premium_quote',
        description: 'Get a premium quote for an insurance product based on risk characteristics and coverage selections',
        inputSchema: {
          type: 'object',
          properties: {
            product_code: { type: 'string', description: 'Insurance product code to quote (required)' },
            effective_date: { type: 'string', description: 'Requested policy effective date (YYYY-MM-DD, required)' },
            insured_state: { type: 'string', description: 'State/jurisdiction for the risk (required, 2-letter code)' },
            risk_attributes: {
              type: 'object',
              description: 'Product-specific risk characteristics (e.g. property value, vehicle make/model, DOB)',
              properties: {},
            },
            coverages: {
              type: 'array',
              description: 'Requested coverages with limits and deductibles',
              items: {
                type: 'object',
                properties: {
                  coverage_code: { type: 'string', description: 'Coverage code' },
                  limit: { type: 'number', description: 'Requested limit' },
                  deductible: { type: 'number', description: 'Requested deductible' },
                },
              },
            },
          },
          required: ['product_code', 'effective_date', 'insured_state'],
        },
      },
      {
        name: 'list_agents',
        description: 'List insurance agents/producers, optionally filtered by agency, state license, or status',
        inputSchema: {
          type: 'object',
          properties: {
            agency_id: { type: 'string', description: 'Agency ID to filter agents' },
            licensed_state: { type: 'string', description: 'State where agent is licensed (2-letter code)' },
            status: { type: 'string', description: 'Agent status: active, inactive, suspended' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 25)' },
          },
        },
      },
      {
        name: 'get_agent',
        description: 'Get full agent/producer details by agent ID, including licenses, appointments, and production stats',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Majesco agent ID' },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'list_products',
        description: 'List available insurance products/lines of business configured in the Majesco platform',
        inputSchema: {
          type: 'object',
          properties: {
            line_of_business: { type: 'string', description: 'Filter by line of business: auto, home, commercial, life, health' },
            state: { type: 'string', description: 'Filter products approved/available in a state (2-letter code)' },
            status: { type: 'string', description: 'Product status: active, inactive, filing_pending' },
          },
        },
      },
      {
        name: 'get_billing_account',
        description: 'Get billing account details for a policy including payment schedule, balance, and transaction history',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: { type: 'string', description: 'Policy ID to retrieve billing account for' },
            billing_account_id: { type: 'string', description: 'Billing account ID (alternative to policy_id)' },
          },
        },
      },
      {
        name: 'create_endorsement',
        description: 'Create a policy endorsement (mid-term policy change) in Majesco',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: { type: 'string', description: 'Policy ID to endorse (required)' },
            effective_date: { type: 'string', description: 'Endorsement effective date (YYYY-MM-DD, required)' },
            endorsement_type: { type: 'string', description: 'Type of endorsement (e.g. address_change, coverage_change, add_driver, remove_vehicle)' },
            description: { type: 'string', description: 'Description of the changes being made' },
            changes: {
              type: 'object',
              description: 'Object containing the specific field changes for this endorsement',
              properties: {},
            },
            premium_change: { type: 'number', description: 'Premium adjustment due to endorsement (positive = increase, negative = decrease)' },
          },
          required: ['policy_id', 'effective_date'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_policies': return this.searchPolicies(args);
        case 'get_policy': return this.getPolicy(args);
        case 'create_policy': return this.createPolicy(args);
        case 'update_policy': return this.updatePolicy(args);
        case 'search_claims': return this.searchClaims(args);
        case 'get_claim': return this.getClaim(args);
        case 'create_claim': return this.createClaim(args);
        case 'update_claim_status': return this.updateClaimStatus(args);
        case 'get_premium_quote': return this.getPremiumQuote(args);
        case 'list_agents': return this.listAgents(args);
        case 'get_agent': return this.getAgent(args);
        case 'list_products': return this.listProducts(args);
        case 'get_billing_account': return this.getBillingAccount(args);
        case 'create_endorsement': return this.createEndorsement(args);
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
    if (!this.tokenUrl || !this.clientId || !this.clientSecret) {
      return this.bearerToken;
    }
    const now = Date.now();
    if (this.tokenExpiry > now && this.bearerToken) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`Majesco OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const qs = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 25),
    };
    if (args.policy_number) params['policyNumber'] = args.policy_number as string;
    if (args.insured_name) params['insuredName'] = args.insured_name as string;
    if (args.product_code) params['productCode'] = args.product_code as string;
    if (args.status) params['status'] = args.status as string;
    if (args.effective_from) params['effectiveFrom'] = args.effective_from as string;
    if (args.effective_to) params['effectiveTo'] = args.effective_to as string;
    return this.apiGet('/policies', params);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    return this.apiGet(`/policies/${encodeURIComponent(args.policy_id as string)}`);
  }

  private async createPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_code || !args.insured_id || !args.effective_date || !args.expiration_date) {
      return { content: [{ type: 'text', text: 'product_code, insured_id, effective_date, and expiration_date are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      productCode: args.product_code,
      insuredId: args.insured_id,
      effectiveDate: args.effective_date,
      expirationDate: args.expiration_date,
    };
    if (args.agent_id) body.agentId = args.agent_id;
    if (args.premium !== undefined) body.premium = args.premium;
    if (args.coverages) body.coverages = args.coverages;
    return this.apiPost('/policies', body);
  }

  private async updatePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id) return { content: [{ type: 'text', text: 'policy_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.status !== undefined) body.status = args.status;
    if (args.premium !== undefined) body.premium = args.premium;
    if (args.expiration_date !== undefined) body.expirationDate = args.expiration_date;
    if (args.coverages !== undefined) body.coverages = args.coverages;
    return this.apiPatch(`/policies/${encodeURIComponent(args.policy_id as string)}`, body);
  }

  private async searchClaims(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 25),
    };
    if (args.claim_number) params['claimNumber'] = args.claim_number as string;
    if (args.policy_id) params['policyId'] = args.policy_id as string;
    if (args.claimant_name) params['claimantName'] = args.claimant_name as string;
    if (args.status) params['status'] = args.status as string;
    if (args.loss_from) params['lossDateFrom'] = args.loss_from as string;
    if (args.loss_to) params['lossDateTo'] = args.loss_to as string;
    return this.apiGet('/claims', params);
  }

  private async getClaim(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.claim_id) return { content: [{ type: 'text', text: 'claim_id is required' }], isError: true };
    return this.apiGet(`/claims/${encodeURIComponent(args.claim_id as string)}`);
  }

  private async createClaim(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id || !args.loss_date || !args.loss_description) {
      return { content: [{ type: 'text', text: 'policy_id, loss_date, and loss_description are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      policyId: args.policy_id,
      lossDate: args.loss_date,
      lossDescription: args.loss_description,
      reportDate: args.report_date ?? new Date().toISOString().slice(0, 10),
    };
    if (args.claimant_name) body.claimantName = args.claimant_name;
    if (args.claimant_phone) body.claimantPhone = args.claimant_phone;
    if (args.claimant_email) body.claimantEmail = args.claimant_email;
    if (args.loss_location) body.lossLocation = args.loss_location;
    if (args.estimated_loss_amount !== undefined) body.estimatedLossAmount = args.estimated_loss_amount;
    if (args.coverage_code) body.coverageCode = args.coverage_code;
    return this.apiPost('/claims', body);
  }

  private async updateClaimStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.claim_id || !args.status) return { content: [{ type: 'text', text: 'claim_id and status are required' }], isError: true };
    const body: Record<string, unknown> = { status: args.status };
    if (args.reserve_amount !== undefined) body.reserveAmount = args.reserve_amount;
    if (args.paid_amount !== undefined) body.paidAmount = args.paid_amount;
    if (args.closure_reason) body.closureReason = args.closure_reason;
    if (args.adjuster_notes) body.adjusterNotes = args.adjuster_notes;
    return this.apiPatch(`/claims/${encodeURIComponent(args.claim_id as string)}/status`, body);
  }

  private async getPremiumQuote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_code || !args.effective_date || !args.insured_state) {
      return { content: [{ type: 'text', text: 'product_code, effective_date, and insured_state are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      productCode: args.product_code,
      effectiveDate: args.effective_date,
      insuredState: args.insured_state,
    };
    if (args.risk_attributes) body.riskAttributes = args.risk_attributes;
    if (args.coverages) body.coverages = args.coverages;
    return this.apiPost('/quotes/premium', body);
  }

  private async listAgents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 25),
    };
    if (args.agency_id) params['agencyId'] = args.agency_id as string;
    if (args.licensed_state) params['licensedState'] = args.licensed_state as string;
    if (args.status) params['status'] = args.status as string;
    return this.apiGet('/agents', params);
  }

  private async getAgent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agent_id) return { content: [{ type: 'text', text: 'agent_id is required' }], isError: true };
    return this.apiGet(`/agents/${encodeURIComponent(args.agent_id as string)}`);
  }

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.line_of_business) params['lineOfBusiness'] = args.line_of_business as string;
    if (args.state) params['state'] = args.state as string;
    if (args.status) params['status'] = args.status as string;
    return this.apiGet('/products', params);
  }

  private async getBillingAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id && !args.billing_account_id) {
      return { content: [{ type: 'text', text: 'policy_id or billing_account_id is required' }], isError: true };
    }
    if (args.billing_account_id) {
      return this.apiGet(`/billing/accounts/${encodeURIComponent(args.billing_account_id as string)}`);
    }
    return this.apiGet(`/policies/${encodeURIComponent(args.policy_id as string)}/billing`);
  }

  private async createEndorsement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.policy_id || !args.effective_date) {
      return { content: [{ type: 'text', text: 'policy_id and effective_date are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      policyId: args.policy_id,
      effectiveDate: args.effective_date,
    };
    if (args.endorsement_type) body.endorsementType = args.endorsement_type;
    if (args.description) body.description = args.description;
    if (args.changes) body.changes = args.changes;
    if (args.premium_change !== undefined) body.premiumChange = args.premium_change;
    return this.apiPost('/endorsements', body);
  }
}
