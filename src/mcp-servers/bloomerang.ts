/**
 * Bloomerang MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Bloomerang MCP server was found on GitHub, npm, or any vendor-published source.
// Build this REST wrapper for all deployments.
//
// Base URL: https://api.bloomerang.co/v2
// Auth: Private API key → X-API-KEY header (generated in Bloomerang Admin → User Settings).
//       OAuth2 access token (after POST https://crm.bloomerang.co/oauth/token) → Authorization: Bearer <token>
// Docs: https://bloomerang.com/api/rest-api/
// Rate limits: Not publicly documented; treat conservatively (~60 req/min)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BloomerangConfig {
  apiToken?: string;
  clientId?: string;
  clientSecret?: string;
  baseUrl?: string;
}

export class BloomerangMCPServer extends MCPAdapterBase {
  private readonly apiToken: string | null;
  private readonly clientId: string | null;
  private readonly clientSecret: string | null;
  private readonly baseUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: BloomerangConfig) {
    super();
    this.apiToken = config.apiToken ?? null;
    this.clientId = config.clientId ?? null;
    this.clientSecret = config.clientSecret ?? null;
    this.baseUrl = config.baseUrl ?? 'https://api.bloomerang.co/v2';
  }

  static catalog() {
    return {
      name: 'bloomerang',
      displayName: 'Bloomerang',
      version: '1.0.0',
      category: 'crm',
      keywords: [
        'bloomerang', 'donor', 'nonprofit', 'fundraising', 'constituent', 'donation',
        'transaction', 'pledge', 'fund', 'campaign', 'appeal', 'gift', 'engagement',
        'volunteer', 'retention', 'donor management',
      ],
      toolNames: [
        'list_constituents', 'get_constituent', 'create_constituent', 'update_constituent',
        'search_constituents',
        'list_transactions', 'get_transaction', 'create_transaction',
        'list_funds', 'get_fund', 'create_fund',
        'list_campaigns', 'get_campaign', 'create_campaign',
        'list_appeals', 'get_appeal', 'create_appeal',
        'list_interactions', 'create_interaction',
        'get_constituent_timeline',
      ],
      description: 'Bloomerang nonprofit donor management: manage constituents, donations, transactions, funds, campaigns, appeals, and donor interactions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Constituents ──────────────────────────────────────────────────────
      {
        name: 'list_constituents',
        description: 'List donor constituents with optional filters for type, status, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            take: {
              type: 'number',
              description: 'Number of records to return (default: 50, max: 500)',
            },
            type: {
              type: 'string',
              description: 'Filter by constituent type: Individual, Organization, Household',
            },
            isInactive: {
              type: 'boolean',
              description: 'Include inactive constituents (default: false)',
            },
          },
        },
      },
      {
        name: 'get_constituent',
        description: 'Get full profile for a single constituent by their Bloomerang ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Bloomerang constituent ID (integer)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_constituent',
        description: 'Create a new donor constituent record with name, contact info, and type',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Constituent type: Individual, Organization, or Household',
            },
            firstName: {
              type: 'string',
              description: 'First name (for Individual)',
            },
            lastName: {
              type: 'string',
              description: 'Last name (for Individual)',
            },
            fullName: {
              type: 'string',
              description: 'Full name (for Organization or Household)',
            },
            email: {
              type: 'string',
              description: 'Primary email address',
            },
            phone: {
              type: 'string',
              description: 'Primary phone number',
            },
          },
          required: ['type'],
        },
      },
      {
        name: 'update_constituent',
        description: 'Update an existing constituent record by ID — name, email, phone, address, or status',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Bloomerang constituent ID to update',
            },
            firstName: { type: 'string', description: 'Updated first name' },
            lastName: { type: 'string', description: 'Updated last name' },
            fullName: { type: 'string', description: 'Updated full name (for Org/Household)' },
            email: { type: 'string', description: 'Updated primary email address' },
            phone: { type: 'string', description: 'Updated primary phone number' },
            isInactive: { type: 'boolean', description: 'Mark constituent as inactive (true) or active (false)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_constituents',
        description: 'Search constituents by name, email, or phone number with full-text matching',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search term matched against name, email address, and phone number',
            },
            skip: { type: 'number', description: 'Pagination offset (default: 0)' },
            take: { type: 'number', description: 'Max results to return (default: 50)' },
          },
          required: ['search'],
        },
      },
      // ── Transactions ──────────────────────────────────────────────────────
      {
        name: 'list_transactions',
        description: 'List donation transactions with optional filters for constituent, date range, and fund',
        inputSchema: {
          type: 'object',
          properties: {
            constituentId: {
              type: 'number',
              description: 'Filter transactions by constituent ID',
            },
            startDate: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format',
            },
            endDate: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format',
            },
            fundId: {
              type: 'number',
              description: 'Filter by fund ID',
            },
            skip: { type: 'number', description: 'Pagination offset (default: 0)' },
            take: { type: 'number', description: 'Max results (default: 50, max: 500)' },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Get full details for a single donation transaction by its Bloomerang ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Bloomerang transaction ID (integer)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_transaction',
        description: 'Create a donation transaction for a constituent with amount, fund, and payment method',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: {
              type: 'number',
              description: 'Constituent ID making the donation',
            },
            date: {
              type: 'string',
              description: 'Transaction date in YYYY-MM-DD format',
            },
            amount: {
              type: 'number',
              description: 'Total gift amount in dollars',
            },
            fundId: {
              type: 'number',
              description: 'Fund ID to apply the donation to',
            },
            campaignId: {
              type: 'number',
              description: 'Optional campaign ID to attribute the donation',
            },
            appealId: {
              type: 'number',
              description: 'Optional appeal ID to attribute the donation',
            },
            paymentMethod: {
              type: 'string',
              description: 'Payment method: Check, Cash, CreditCard, InKind, Stock, Other',
            },
            note: {
              type: 'string',
              description: 'Optional internal note on the transaction',
            },
          },
          required: ['accountId', 'date', 'amount', 'fundId'],
        },
      },
      // ── Funds ─────────────────────────────────────────────────────────────
      {
        name: 'list_funds',
        description: 'List all funds configured in the Bloomerang account with names and IDs',
        inputSchema: {
          type: 'object',
          properties: {
            skip: { type: 'number', description: 'Pagination offset (default: 0)' },
            take: { type: 'number', description: 'Max results to return (default: 50)' },
            isActive: { type: 'boolean', description: 'Filter by active status (default: returns all)' },
          },
        },
      },
      {
        name: 'get_fund',
        description: 'Get details for a specific fund by its Bloomerang fund ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Bloomerang fund ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_fund',
        description: 'Create a new fund for donation tracking and designations',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Fund name (must be unique)' },
            description: { type: 'string', description: 'Optional description of the fund purpose' },
            isActive: { type: 'boolean', description: 'Set fund as active (default: true)' },
          },
          required: ['name'],
        },
      },
      // ── Campaigns ─────────────────────────────────────────────────────────
      {
        name: 'list_campaigns',
        description: 'List fundraising campaigns with optional active/inactive filter',
        inputSchema: {
          type: 'object',
          properties: {
            skip: { type: 'number', description: 'Pagination offset (default: 0)' },
            take: { type: 'number', description: 'Max results (default: 50)' },
            isActive: { type: 'boolean', description: 'Filter by active status' },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Get details for a single campaign by its Bloomerang campaign ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Bloomerang campaign ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_campaign',
        description: 'Create a new fundraising campaign with name, goal, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Campaign name' },
            goal: { type: 'number', description: 'Fundraising goal amount in dollars' },
            startDate: { type: 'string', description: 'Campaign start date YYYY-MM-DD' },
            endDate: { type: 'string', description: 'Campaign end date YYYY-MM-DD' },
            isActive: { type: 'boolean', description: 'Activate campaign immediately (default: true)' },
          },
          required: ['name'],
        },
      },
      // ── Appeals ───────────────────────────────────────────────────────────
      {
        name: 'list_appeals',
        description: 'List fundraising appeals with optional campaign ID filter',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: { type: 'number', description: 'Filter appeals by campaign ID' },
            skip: { type: 'number', description: 'Pagination offset (default: 0)' },
            take: { type: 'number', description: 'Max results (default: 50)' },
          },
        },
      },
      {
        name: 'get_appeal',
        description: 'Get details for a specific fundraising appeal by its Bloomerang appeal ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Bloomerang appeal ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_appeal',
        description: 'Create a new fundraising appeal within a campaign with name and optional goal',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Appeal name' },
            campaignId: { type: 'number', description: 'Campaign ID this appeal belongs to' },
            goal: { type: 'number', description: 'Optional fundraising goal for this appeal' },
            isActive: { type: 'boolean', description: 'Activate appeal immediately (default: true)' },
          },
          required: ['name'],
        },
      },
      // ── Interactions ──────────────────────────────────────────────────────
      {
        name: 'list_interactions',
        description: 'List constituent interactions (emails, calls, notes) with optional constituent filter',
        inputSchema: {
          type: 'object',
          properties: {
            constituentId: { type: 'number', description: 'Filter interactions by constituent ID' },
            channel: {
              type: 'string',
              description: 'Filter by channel: Email, MassEmail, Phone, TextMessage, SocialMedia, InPerson, Mail, Other',
            },
            skip: { type: 'number', description: 'Pagination offset (default: 0)' },
            take: { type: 'number', description: 'Max results (default: 50)' },
          },
        },
      },
      {
        name: 'create_interaction',
        description: 'Log a donor interaction (email, call, note, meeting) against a constituent record',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'number', description: 'Constituent ID the interaction belongs to' },
            channel: {
              type: 'string',
              description: 'Channel type: Email, Phone, TextMessage, SocialMedia, InPerson, Mail, Other',
            },
            date: { type: 'string', description: 'Interaction date in YYYY-MM-DD format' },
            subject: { type: 'string', description: 'Subject or title of the interaction' },
            note: { type: 'string', description: 'Body or notes from the interaction' },
            isInbound: { type: 'boolean', description: 'True if contact initiated (inbound), false if outbound' },
          },
          required: ['accountId', 'channel', 'date'],
        },
      },
      // ── Timeline ──────────────────────────────────────────────────────────
      {
        name: 'get_constituent_timeline',
        description: 'Get the full engagement timeline for a constituent — gifts, interactions, and notes in chronological order',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Constituent ID to retrieve timeline for' },
            skip: { type: 'number', description: 'Pagination offset (default: 0)' },
            take: { type: 'number', description: 'Max timeline items to return (default: 50)' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_constituents':    return this.listConstituents(args);
        case 'get_constituent':      return this.getConstituent(args);
        case 'create_constituent':   return this.createConstituent(args);
        case 'update_constituent':   return this.updateConstituent(args);
        case 'search_constituents':  return this.searchConstituents(args);
        case 'list_transactions':    return this.listTransactions(args);
        case 'get_transaction':      return this.getTransaction(args);
        case 'create_transaction':   return this.createTransaction(args);
        case 'list_funds':           return this.listFunds(args);
        case 'get_fund':             return this.getFund(args);
        case 'create_fund':          return this.createFund(args);
        case 'list_campaigns':       return this.listCampaigns(args);
        case 'get_campaign':         return this.getCampaign(args);
        case 'create_campaign':      return this.createCampaign(args);
        case 'list_appeals':         return this.listAppeals(args);
        case 'get_appeal':           return this.getAppeal(args);
        case 'create_appeal':        return this.createAppeal(args);
        case 'list_interactions':    return this.listInteractions(args);
        case 'create_interaction':   return this.createInteraction(args);
        case 'get_constituent_timeline': return this.getConstituentTimeline(args);
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

  // Returns { header, value } — private key uses X-API-KEY; OAuth2 uses Authorization: Bearer
  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.apiToken) {
      // Private API key: sent as X-API-KEY header (not Bearer)
      return { 'X-API-KEY': this.apiToken };
    }

    // OAuth2 path
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Bloomerang: provide apiToken or clientId+clientSecret in config');
    }
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return { 'Authorization': `Bearer ${this.bearerToken}` };
    }

    const response = await this.fetchWithRetry('https://crm.bloomerang.co/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) throw new Error(`Bloomerang OAuth token request failed: ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return { 'Authorization': `Bearer ${this.bearerToken}` };
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const authHeaders = await this.getAuthHeaders();
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const authHeaders = await this.getAuthHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const authHeaders = await this.getAuthHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ──────────────────────────────────────────────────

  private async listConstituents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 50),
    };
    if (args.type) params.type = args.type as string;
    if (typeof args.isInactive === 'boolean') params.isInactive = String(args.isInactive);
    return this.get('/constituent', params);
  }

  private async getConstituent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/constituent/${encodeURIComponent(args.id as string)}`);
  }

  private async createConstituent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.type) return { content: [{ type: 'text', text: 'type is required' }], isError: true };
    return this.post('/constituent', args as Record<string, unknown>);
  }

  private async updateConstituent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id, ...body } = args;
    return this.put(`/constituent/${id}`, body);
  }

  private async searchConstituents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.search) return { content: [{ type: 'text', text: 'search is required' }], isError: true };
    const params: Record<string, string> = {
      search: args.search as string,
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 50),
    };
    return this.get('/constituents/search', params);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 50),
    };
    if (args.constituentId) params.constituentId = String(args.constituentId);
    if (args.startDate) params.startDate = args.startDate as string;
    if (args.endDate) params.endDate = args.endDate as string;
    if (args.fundId) params.fundId = String(args.fundId);
    return this.get('/transaction', params);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/transaction/${encodeURIComponent(args.id as string)}`);
  }

  private async createTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.accountId || !args.date || args.amount == null || !args.fundId) {
      return { content: [{ type: 'text', text: 'accountId, date, amount, and fundId are required' }], isError: true };
    }
    return this.post('/transaction', args as Record<string, unknown>);
  }

  private async listFunds(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 50),
    };
    if (typeof args.isActive === 'boolean') params.isActive = String(args.isActive);
    return this.get('/fund', params);
  }

  private async getFund(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/fund/${encodeURIComponent(args.id as string)}`);
  }

  private async createFund(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.post('/fund', args as Record<string, unknown>);
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 50),
    };
    if (typeof args.isActive === 'boolean') params.isActive = String(args.isActive);
    return this.get('/campaign', params);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/campaign/${encodeURIComponent(args.id as string)}`);
  }

  private async createCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.post('/campaign', args as Record<string, unknown>);
  }

  private async listAppeals(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 50),
    };
    if (args.campaignId) params.campaignId = String(args.campaignId);
    return this.get('/appeal', params);
  }

  private async getAppeal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/appeal/${encodeURIComponent(args.id as string)}`);
  }

  private async createAppeal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.post('/appeal', args as Record<string, unknown>);
  }

  private async listInteractions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 50),
    };
    if (args.constituentId) params.constituentId = String(args.constituentId);
    if (args.channel) params.channel = args.channel as string;
    return this.get('/interaction', params);
  }

  private async createInteraction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.accountId || !args.channel || !args.date) {
      return { content: [{ type: 'text', text: 'accountId, channel, and date are required' }], isError: true };
    }
    return this.post('/interaction', args as Record<string, unknown>);
  }

  private async getConstituentTimeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 50),
    };
    return this.get(`/constituent/${encodeURIComponent(args.id as string)}/timeline`, params);
  }
}
