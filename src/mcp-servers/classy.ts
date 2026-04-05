/**
 * Classy (GoFundMe Pro) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official GoFundMe Pro (Classy) MCP server was found on GitHub or npm as of 2026-03-28.
// The Classy GitHub org (https://github.com/classy-org) contains Postman collections and sample apps but no MCP server.
// Our adapter covers: 16 tools. Vendor MCP covers: 0 tools (no official server).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Note: Classy rebranded to GoFundMe Pro in May 2025. API base URL and documentation remain at classy.org / developers.gofundme.com/pro.
// The GoFundMe Pro API exposes many additional endpoints beyond what this adapter covers (campaign series, promo codes,
// questions, ticket types, activity logs, designations, staff notifications, source codes) — these are out of scope
// for the current adapter but exist in the vendor API docs at https://developers.gofundme.com/pro/docs/.
//
// Base URL: https://api.classy.org/2.0
// Auth: OAuth2 client credentials — POST https://api.classy.org/oauth2/auth with client_id + client_secret; returns Bearer access_token
// Docs: https://developers.gofundme.com/pro/docs/
// Rate limits: 429 on breach; retry-after guidance of 24 seconds per rate limit response

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ClassyConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  authUrl?: string;
}

export class ClassyMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly authUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: ClassyConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.classy.org/2.0';
    this.authUrl = config.authUrl || 'https://api.classy.org/oauth2/auth';
  }

  static catalog() {
    return {
      name: 'classy',
      displayName: 'Classy / GoFundMe Pro',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'classy', 'gofundme', 'gofundme pro', 'nonprofit', 'fundraising', 'donation', 'campaign',
        'peer-to-peer', 'p2p', 'crowdfunding', 'charity', 'event ticketing', 'recurring giving',
        'donor', 'fundraiser', 'organization', 'transaction', 'membership',
      ],
      toolNames: [
        'list_campaigns', 'get_campaign', 'list_organization_campaigns',
        'list_transactions', 'get_transaction', 'list_campaign_transactions',
        'list_members', 'get_member',
        'list_fundraising_pages', 'get_fundraising_page',
        'list_fundraising_teams', 'get_fundraising_team',
        'get_organization', 'list_organizations',
        'list_recurring_donation_plans', 'get_recurring_donation_plan',
      ],
      description: 'Classy/GoFundMe Pro nonprofit fundraising: manage campaigns, track donations and transactions, list donors, fundraising pages, teams, and recurring giving plans.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_campaigns',
        description: 'List all fundraising campaigns for an organization with status, goal, and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'number',
              description: 'GoFundMe Pro organization ID',
            },
            status: {
              type: 'string',
              description: 'Filter by campaign status: active, draft, deactivated (default: active)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
          required: ['organizationId'],
        },
      },
      {
        name: 'get_campaign',
        description: 'Get full details for a specific fundraising campaign by ID including goal, raised amount, and end date',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: {
              type: 'number',
              description: 'Campaign ID',
            },
          },
          required: ['campaignId'],
        },
      },
      {
        name: 'list_organization_campaigns',
        description: 'List all campaigns across an organization with aggregate stats (alias for list_campaigns with organization scope)',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'number',
              description: 'GoFundMe Pro organization ID',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
          required: ['organizationId'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List all donation transactions for an organization with optional date range and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'number',
              description: 'GoFundMe Pro organization ID',
            },
            createdAtGte: {
              type: 'string',
              description: 'Return transactions created at or after this date (ISO 8601)',
            },
            createdAtLte: {
              type: 'string',
              description: 'Return transactions created at or before this date (ISO 8601)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: complete, refunded, cancelled (default: complete)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
          required: ['organizationId'],
        },
      },
      {
        name: 'get_transaction',
        description: 'Get details for a specific donation transaction by ID including amount, donor, campaign, and status',
        inputSchema: {
          type: 'object',
          properties: {
            transactionId: {
              type: 'number',
              description: 'Transaction ID',
            },
          },
          required: ['transactionId'],
        },
      },
      {
        name: 'list_campaign_transactions',
        description: 'List all donation transactions for a specific campaign with optional date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: {
              type: 'number',
              description: 'Campaign ID',
            },
            createdAtGte: {
              type: 'string',
              description: 'Return transactions created at or after this date (ISO 8601)',
            },
            createdAtLte: {
              type: 'string',
              description: 'Return transactions created at or before this date (ISO 8601)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
          required: ['campaignId'],
        },
      },
      {
        name: 'list_members',
        description: 'List donor/member profiles in an organization with contact and giving history information',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'number',
              description: 'GoFundMe Pro organization ID',
            },
            email: {
              type: 'string',
              description: 'Filter members by email address',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
          required: ['organizationId'],
        },
      },
      {
        name: 'get_member',
        description: 'Get profile details for a specific donor or member by member ID',
        inputSchema: {
          type: 'object',
          properties: {
            memberId: {
              type: 'number',
              description: 'Member ID',
            },
          },
          required: ['memberId'],
        },
      },
      {
        name: 'list_fundraising_pages',
        description: 'List individual peer-to-peer fundraising pages for a campaign with raised amounts and fundraiser info',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: {
              type: 'number',
              description: 'Campaign ID to list fundraising pages for',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
          required: ['campaignId'],
        },
      },
      {
        name: 'get_fundraising_page',
        description: 'Get details for a specific peer-to-peer fundraising page by ID including goal and raised amount',
        inputSchema: {
          type: 'object',
          properties: {
            fundraisingPageId: {
              type: 'number',
              description: 'Fundraising page ID',
            },
          },
          required: ['fundraisingPageId'],
        },
      },
      {
        name: 'list_fundraising_teams',
        description: 'List fundraising teams for a campaign with total raised and member count',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: {
              type: 'number',
              description: 'Campaign ID to list teams for',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
          required: ['campaignId'],
        },
      },
      {
        name: 'get_fundraising_team',
        description: 'Get details for a specific fundraising team by ID including goal, raised amount, and team members',
        inputSchema: {
          type: 'object',
          properties: {
            fundraisingTeamId: {
              type: 'number',
              description: 'Fundraising team ID',
            },
          },
          required: ['fundraisingTeamId'],
        },
      },
      {
        name: 'get_organization',
        description: 'Get profile and configuration details for a GoFundMe Pro nonprofit organization by ID',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'number',
              description: 'GoFundMe Pro organization ID',
            },
          },
          required: ['organizationId'],
        },
      },
      {
        name: 'list_organizations',
        description: 'List all GoFundMe Pro organizations accessible with the current API credentials',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'list_recurring_donation_plans',
        description: 'List active recurring donation (sustainer) plans for an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'number',
              description: 'GoFundMe Pro organization ID',
            },
            status: {
              type: 'string',
              description: 'Filter by plan status: active, cancelled, paused (default: active)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            perPage: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
          },
          required: ['organizationId'],
        },
      },
      {
        name: 'get_recurring_donation_plan',
        description: 'Get details for a specific recurring donation plan by ID including frequency, amount, and donor info',
        inputSchema: {
          type: 'object',
          properties: {
            planId: {
              type: 'number',
              description: 'Recurring donation plan ID',
            },
          },
          required: ['planId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'get_campaign':
          return this.getCampaign(args);
        case 'list_organization_campaigns':
          return this.listOrganizationCampaigns(args);
        case 'list_transactions':
          return this.listTransactions(args);
        case 'get_transaction':
          return this.getTransaction(args);
        case 'list_campaign_transactions':
          return this.listCampaignTransactions(args);
        case 'list_members':
          return this.listMembers(args);
        case 'get_member':
          return this.getMember(args);
        case 'list_fundraising_pages':
          return this.listFundraisingPages(args);
        case 'get_fundraising_page':
          return this.getFundraisingPage(args);
        case 'list_fundraising_teams':
          return this.listFundraisingTeams(args);
        case 'get_fundraising_team':
          return this.getFundraisingTeam(args);
        case 'get_organization':
          return this.getOrganization(args);
        case 'list_organizations':
          return this.listOrganizations(args);
        case 'list_recurring_donation_plans':
          return this.listRecurringDonationPlans(args);
        case 'get_recurring_donation_plan':
          return this.getRecurringDonationPlan(args);
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
    const response = await this.fetchWithRetry(this.authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`Classy OAuth2 token request failed: ${response.status} ${response.statusText}`);
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
    };
  }

  private async classyGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Classy returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationId) return { content: [{ type: 'text', text: 'organizationId is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.perPage as number) ?? 20),
    };
    if (args.status) params.status = args.status as string;
    return this.classyGet(`/organizations/${encodeURIComponent(args.organizationId as string)}/campaigns`, params);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaignId) return { content: [{ type: 'text', text: 'campaignId is required' }], isError: true };
    return this.classyGet(`/campaigns/${encodeURIComponent(args.campaignId as string)}`);
  }

  private async listOrganizationCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationId) return { content: [{ type: 'text', text: 'organizationId is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.perPage as number) ?? 20),
    };
    return this.classyGet(`/organizations/${encodeURIComponent(args.organizationId as string)}/campaigns`, params);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationId) return { content: [{ type: 'text', text: 'organizationId is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.perPage as number) ?? 20),
    };
    if (args.createdAtGte) params['filter[created_at][gte]'] = args.createdAtGte as string;
    if (args.createdAtLte) params['filter[created_at][lte]'] = args.createdAtLte as string;
    if (args.status) params['filter[status]'] = args.status as string;
    return this.classyGet(`/organizations/${encodeURIComponent(args.organizationId as string)}/transactions`, params);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.transactionId) return { content: [{ type: 'text', text: 'transactionId is required' }], isError: true };
    return this.classyGet(`/transactions/${encodeURIComponent(args.transactionId as string)}`);
  }

  private async listCampaignTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaignId) return { content: [{ type: 'text', text: 'campaignId is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.perPage as number) ?? 20),
    };
    if (args.createdAtGte) params['filter[created_at][gte]'] = args.createdAtGte as string;
    if (args.createdAtLte) params['filter[created_at][lte]'] = args.createdAtLte as string;
    return this.classyGet(`/campaigns/${encodeURIComponent(args.campaignId as string)}/transactions`, params);
  }

  private async listMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationId) return { content: [{ type: 'text', text: 'organizationId is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.perPage as number) ?? 20),
    };
    if (args.email) params['filter[email_address]'] = args.email as string;
    return this.classyGet(`/organizations/${encodeURIComponent(args.organizationId as string)}/members`, params);
  }

  private async getMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.memberId) return { content: [{ type: 'text', text: 'memberId is required' }], isError: true };
    return this.classyGet(`/members/${encodeURIComponent(args.memberId as string)}`);
  }

  private async listFundraisingPages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaignId) return { content: [{ type: 'text', text: 'campaignId is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.perPage as number) ?? 20),
    };
    return this.classyGet(`/campaigns/${encodeURIComponent(args.campaignId as string)}/fundraising-pages`, params);
  }

  private async getFundraisingPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fundraisingPageId) return { content: [{ type: 'text', text: 'fundraisingPageId is required' }], isError: true };
    return this.classyGet(`/fundraising-pages/${encodeURIComponent(args.fundraisingPageId as string)}`);
  }

  private async listFundraisingTeams(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaignId) return { content: [{ type: 'text', text: 'campaignId is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.perPage as number) ?? 20),
    };
    return this.classyGet(`/campaigns/${encodeURIComponent(args.campaignId as string)}/fundraising-teams`, params);
  }

  private async getFundraisingTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fundraisingTeamId) return { content: [{ type: 'text', text: 'fundraisingTeamId is required' }], isError: true };
    return this.classyGet(`/fundraising-teams/${encodeURIComponent(args.fundraisingTeamId as string)}`);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationId) return { content: [{ type: 'text', text: 'organizationId is required' }], isError: true };
    return this.classyGet(`/organizations/${encodeURIComponent(args.organizationId as string)}`);
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.perPage as number) ?? 20),
    };
    return this.classyGet('/organizations', params);
  }

  private async listRecurringDonationPlans(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationId) return { content: [{ type: 'text', text: 'organizationId is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.perPage as number) ?? 20),
    };
    if (args.status) params['filter[status]'] = args.status as string;
    return this.classyGet(`/organizations/${encodeURIComponent(args.organizationId as string)}/recurring-donation-plans`, params);
  }

  private async getRecurringDonationPlan(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.planId) return { content: [{ type: 'text', text: 'planId is required' }], isError: true };
    return this.classyGet(`/recurring-donation-plans/${encodeURIComponent(args.planId as string)}`);
  }
}
