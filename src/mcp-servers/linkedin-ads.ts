/**
 * LinkedIn Ads MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28. Community MCP servers exist (e.g. Pipedream Connect
// linkedin-ads-mcp, danielpopamd/linkedin-ads-mcp) but none are vendor-published by LinkedIn/Microsoft
// with 10+ tools and stdio/streamable-HTTP transport.
// Our adapter covers: 16 tools (accounts, campaigns, creatives, analytics, audiences, conversions).
// Recommendation: use-rest-api — no official vendor MCP qualifies for delegation.
//
// Base URL: https://api.linkedin.com/rest  (versioned Marketing API, active since 202206)
//   NOTE: The legacy https://api.linkedin.com/v2 base path is sunset for Marketing APIs.
//   All versioned Marketing API calls (202206+) use https://api.linkedin.com/rest.
//   The LinkedIn-Version header (YYYYMM format) must accompany every request.
//   Since version 202305: adCampaignGroups, adCampaigns, and creatives are account-scoped:
//     GET /rest/adAccounts/{accountId}/adCampaignGroups
//     GET /rest/adAccounts/{accountId}/adCampaigns
//     GET /rest/adAccounts/{accountId}/creatives
// Auth: OAuth2 3-legged (member authorization) — Bearer access token in Authorization header
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/
// Rate limits: Daily application limits vary by endpoint (500 calls/day standard); 429 on exceed.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LinkedInAdsConfig {
  accessToken: string;
  baseUrl?: string;
}

export class LinkedInAdsMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: LinkedInAdsConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.linkedin.com/rest';
  }

  static catalog() {
    return {
      name: 'linkedin-ads',
      displayName: 'LinkedIn Ads',
      version: '1.0.0',
      category: 'social',
      keywords: [
        'linkedin', 'ads', 'advertising', 'campaign', 'creative', 'sponsored',
        'campaign manager', 'b2b', 'lead generation', 'impression', 'click',
        'ad account', 'analytics', 'audience', 'conversion', 'targeting',
      ],
      toolNames: [
        'list_ad_accounts', 'get_ad_account',
        'list_campaign_groups', 'get_campaign_group', 'create_campaign_group', 'update_campaign_group',
        'list_campaigns', 'get_campaign', 'create_campaign', 'update_campaign',
        'list_creatives', 'get_creative',
        'get_ad_analytics',
        'list_conversion_rules', 'get_conversion_rule',
        'list_matched_audiences',
      ],
      description: 'LinkedIn Campaign Manager: manage ad accounts, campaign groups, campaigns, creatives, and retrieve ad analytics and audience data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_ad_accounts',
        description: 'List LinkedIn ad accounts accessible to the authenticated user with status and currency information',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 10, max: 100)',
            },
            status: {
              type: 'string',
              description: 'Filter by account status: ACTIVE, CANCELLED, DRAFT, PENDING_DELETION, REMOVED (default: all)',
            },
          },
        },
      },
      {
        name: 'get_ad_account',
        description: 'Get detailed information about a single LinkedIn ad account by account URN ID',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Ad account ID (numeric portion of the urn:li:sponsoredAccount:{id} URN)',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_campaign_groups',
        description: 'List campaign groups (campaign groups organize campaigns) for a given ad account with status filter',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Ad account ID to list campaign groups for',
            },
            start: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 10, max: 100)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: ACTIVE, ARCHIVED, CANCELLED, DRAFT, PAUSED (default: all)',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_campaign_group',
        description: 'Get details of a single campaign group including budget, status, and scheduling',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_group_id: {
              type: 'string',
              description: 'Campaign group ID (numeric portion of the sponsoredCampaignGroup URN)',
            },
          },
          required: ['campaign_group_id'],
        },
      },
      {
        name: 'create_campaign_group',
        description: 'Create a new campaign group under an ad account with budget and scheduling settings',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Ad account ID to create the campaign group under',
            },
            name: {
              type: 'string',
              description: 'Display name for the campaign group',
            },
            status: {
              type: 'string',
              description: 'Initial status: ACTIVE or DRAFT (default: DRAFT)',
            },
            totalBudget_amount: {
              type: 'string',
              description: 'Total budget amount as a decimal string (e.g. "1000.00")',
            },
            totalBudget_currencyCode: {
              type: 'string',
              description: 'ISO 4217 currency code for the budget (e.g. "USD")',
            },
          },
          required: ['account_id', 'name'],
        },
      },
      {
        name: 'update_campaign_group',
        description: 'Update campaign group status, budget, or name',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_group_id: {
              type: 'string',
              description: 'Campaign group ID to update',
            },
            name: {
              type: 'string',
              description: 'New display name',
            },
            status: {
              type: 'string',
              description: 'New status: ACTIVE, ARCHIVED, CANCELLED, DRAFT, PAUSED',
            },
          },
          required: ['campaign_group_id'],
        },
      },
      {
        name: 'list_campaigns',
        description: 'List ad campaigns for an account with optional filters for status, campaign group, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Ad account ID to list campaigns for',
            },
            start: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 10, max: 100)',
            },
            status: {
              type: 'string',
              description: 'Filter by campaign status: ACTIVE, ARCHIVED, CANCELLED, DRAFT, PAUSED, COMPLETED',
            },
            campaign_group_id: {
              type: 'string',
              description: 'Filter campaigns belonging to a specific campaign group ID',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_campaign',
        description: 'Get full details of a single LinkedIn ad campaign including targeting, budget, and objective',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Campaign ID (numeric portion of the sponsoredCampaign URN)',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'create_campaign',
        description: 'Create a new LinkedIn ad campaign with targeting criteria, budget, and objective type',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Ad account ID to create the campaign under',
            },
            campaign_group_id: {
              type: 'string',
              description: 'Campaign group ID to associate this campaign with',
            },
            name: {
              type: 'string',
              description: 'Campaign display name',
            },
            status: {
              type: 'string',
              description: 'Initial status: ACTIVE or DRAFT (default: DRAFT)',
            },
            objectiveType: {
              type: 'string',
              description: 'Campaign objective: BRAND_AWARENESS, ENGAGEMENT, JOB_APPLICANTS, LEAD_GENERATION, WEBSITE_CONVERSIONS, WEBSITE_VISITS, VIDEO_VIEWS',
            },
            dailyBudget_amount: {
              type: 'string',
              description: 'Daily budget amount as decimal string (e.g. "50.00")',
            },
            dailyBudget_currencyCode: {
              type: 'string',
              description: 'ISO 4217 currency code (e.g. "USD")',
            },
          },
          required: ['account_id', 'campaign_group_id', 'name'],
        },
      },
      {
        name: 'update_campaign',
        description: 'Update a LinkedIn campaign status, budget, or name',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Campaign ID to update',
            },
            name: {
              type: 'string',
              description: 'New campaign name',
            },
            status: {
              type: 'string',
              description: 'New status: ACTIVE, ARCHIVED, CANCELLED, DRAFT, PAUSED',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_creatives',
        description: 'List ad creatives for a campaign with status and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Ad account ID (required for the versioned creatives endpoint)',
            },
            campaign_id: {
              type: 'string',
              description: 'Campaign ID to list creatives for',
            },
            start: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 10, max: 100)',
            },
            status: {
              type: 'string',
              description: 'Filter by creative status: ACTIVE, PAUSED, ARCHIVED, CANCELLED, DRAFT',
            },
          },
          required: ['account_id', 'campaign_id'],
        },
      },
      {
        name: 'get_creative',
        description: 'Get details of a single ad creative including content, status, and campaign association',
        inputSchema: {
          type: 'object',
          properties: {
            creative_id: {
              type: 'string',
              description: 'Creative ID (numeric portion of the sponsoredCreative URN)',
            },
          },
          required: ['creative_id'],
        },
      },
      {
        name: 'get_ad_analytics',
        description: 'Retrieve ad performance analytics (impressions, clicks, spend, CTR) for accounts, campaigns, or creatives over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            pivot: {
              type: 'string',
              description: 'Grouping dimension: ACCOUNT, CAMPAIGN, CAMPAIGN_GROUP, CREATIVE (default: CAMPAIGN)',
            },
            dateRange_start_year: {
              type: 'number',
              description: 'Start date year (e.g. 2024)',
            },
            dateRange_start_month: {
              type: 'number',
              description: 'Start date month 1-12 (e.g. 1)',
            },
            dateRange_start_day: {
              type: 'number',
              description: 'Start date day 1-31 (e.g. 1)',
            },
            dateRange_end_year: {
              type: 'number',
              description: 'End date year (e.g. 2024)',
            },
            dateRange_end_month: {
              type: 'number',
              description: 'End date month 1-12 (e.g. 12)',
            },
            dateRange_end_day: {
              type: 'number',
              description: 'End date day 1-31 (e.g. 31)',
            },
            account_id: {
              type: 'string',
              description: 'Filter analytics for a specific ad account ID',
            },
            campaign_id: {
              type: 'string',
              description: 'Filter analytics for a specific campaign ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated metrics to include: clicks,impressions,costInLocalCurrency,actionClicks,conversionValueInLocalCurrency (default: clicks,impressions,costInLocalCurrency)',
            },
          },
        },
      },
      {
        name: 'list_conversion_rules',
        description: 'List conversion tracking rules configured for an ad account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Ad account ID to list conversion rules for',
            },
            start: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 10, max: 100)',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'get_conversion_rule',
        description: 'Get details of a single conversion tracking rule including type and event configuration',
        inputSchema: {
          type: 'object',
          properties: {
            conversion_id: {
              type: 'string',
              description: 'Conversion rule ID (numeric portion of the conversion URN)',
            },
          },
          required: ['conversion_id'],
        },
      },
      {
        name: 'list_matched_audiences',
        description: 'List matched audience segments (uploaded lists, website retargeting) for an ad account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Ad account ID to list matched audiences for',
            },
            start: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of results to return (default: 10, max: 100)',
            },
          },
          required: ['account_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_ad_accounts':
          return this.listAdAccounts(args);
        case 'get_ad_account':
          return this.getAdAccount(args);
        case 'list_campaign_groups':
          return this.listCampaignGroups(args);
        case 'get_campaign_group':
          return this.getCampaignGroup(args);
        case 'create_campaign_group':
          return this.createCampaignGroup(args);
        case 'update_campaign_group':
          return this.updateCampaignGroup(args);
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'get_campaign':
          return this.getCampaign(args);
        case 'create_campaign':
          return this.createCampaign(args);
        case 'update_campaign':
          return this.updateCampaign(args);
        case 'list_creatives':
          return this.listCreatives(args);
        case 'get_creative':
          return this.getCreative(args);
        case 'get_ad_analytics':
          return this.getAdAnalytics(args);
        case 'list_conversion_rules':
          return this.listConversionRules(args);
        case 'get_conversion_rule':
          return this.getConversionRule(args);
        case 'list_matched_audiences':
          return this.listMatchedAudiences(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202603',
      'X-Restli-Protocol-Version': '2.0.0',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/${path}`;
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/${path}`;
    const patchHeaders = { ...this.headers, 'X-RestLi-Method': 'PARTIAL_UPDATE' };
    const response = await this.fetchWithRetry(url, { method: 'POST', headers: patchHeaders, body: JSON.stringify({ patch: { $set: body } }) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ status: 'updated' }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAdAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      q: 'search',
      start: String((args.start as number) ?? 0),
      count: String((args.count as number) ?? 10),
    };
    if (args.status) params['search.status.values[0]'] = args.status as string;
    return this.apiGet('adAccounts', params);
  }

  private async getAdAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.apiGet(`adAccounts/${encodeURIComponent(args.account_id as string)}`);
  }

  private async listCampaignGroups(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    // Versioned API (202305+): account-scoped path /adAccounts/{id}/adCampaignGroups
    const params: Record<string, string> = {
      q: 'search',
      start: String((args.start as number) ?? 0),
      count: String((args.count as number) ?? 10),
    };
    if (args.status) params['search.status.values[0]'] = args.status as string;
    return this.apiGet(`adAccounts/${encodeURIComponent(args.account_id as string)}/adCampaignGroups`, params);
  }

  private async getCampaignGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_group_id) return { content: [{ type: 'text', text: 'campaign_group_id is required' }], isError: true };
    return this.apiGet(`adCampaignGroups/${encodeURIComponent(args.campaign_group_id as string)}`);
  }

  private async createCampaignGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id || !args.name) return { content: [{ type: 'text', text: 'account_id and name are required' }], isError: true };
    const body: Record<string, unknown> = {
      account: `urn:li:sponsoredAccount:${encodeURIComponent(args.account_id as string)}`,
      name: args.name,
      status: (args.status as string) ?? 'DRAFT',
    };
    if (args.totalBudget_amount && args.totalBudget_currencyCode) {
      body['totalBudget'] = {
        amount: args.totalBudget_amount,
        currencyCode: args.totalBudget_currencyCode,
      };
    }
    // Versioned API (202305+): account-scoped path /adAccounts/{id}/adCampaignGroups
    return this.apiPost(`adAccounts/${encodeURIComponent(args.account_id as string)}/adCampaignGroups`, body);
  }

  private async updateCampaignGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_group_id) return { content: [{ type: 'text', text: 'campaign_group_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body['name'] = args.name;
    if (args.status) body['status'] = args.status;
    return this.apiPatch(`adCampaignGroups/${encodeURIComponent(args.campaign_group_id as string)}`, body);
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    // Versioned API (202305+): account-scoped path /adAccounts/{id}/adCampaigns
    const params: Record<string, string> = {
      q: 'search',
      start: String((args.start as number) ?? 0),
      count: String((args.count as number) ?? 10),
    };
    if (args.status) params['search.status.values[0]'] = args.status as string;
    if (args.campaign_group_id) params['search.campaignGroup.values[0]'] = `urn:li:sponsoredCampaignGroup:${encodeURIComponent(args.campaign_group_id as string)}`;
    return this.apiGet(`adAccounts/${encodeURIComponent(args.account_id as string)}/adCampaigns`, params);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.apiGet(`adCampaigns/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async createCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id || !args.campaign_group_id || !args.name) {
      return { content: [{ type: 'text', text: 'account_id, campaign_group_id, and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      account: `urn:li:sponsoredAccount:${encodeURIComponent(args.account_id as string)}`,
      campaignGroup: `urn:li:sponsoredCampaignGroup:${encodeURIComponent(args.campaign_group_id as string)}`,
      name: args.name,
      status: (args.status as string) ?? 'DRAFT',
      type: 'SPONSORED_UPDATES',
    };
    if (args.objectiveType) body['objectiveType'] = args.objectiveType;
    if (args.dailyBudget_amount && args.dailyBudget_currencyCode) {
      body['dailyBudget'] = {
        amount: args.dailyBudget_amount,
        currencyCode: args.dailyBudget_currencyCode,
      };
    }
    // Versioned API (202305+): account-scoped path /adAccounts/{id}/adCampaigns
    return this.apiPost(`adAccounts/${encodeURIComponent(args.account_id as string)}/adCampaigns`, body);
  }

  private async updateCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body['name'] = args.name;
    if (args.status) body['status'] = args.status;
    return this.apiPatch(`adCampaigns/${encodeURIComponent(args.campaign_id as string)}`, body);
  }

  private async listCreatives(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    // Versioned API (202305+): account-scoped path uses 'creatives' (not 'adCreatives').
    // Requires account_id in path; campaign filter via search.campaign query param.
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required for versioned creatives endpoint' }], isError: true };
    const params: Record<string, string> = {
      q: 'search',
      'search.campaign.values[0]': `urn:li:sponsoredCampaign:${encodeURIComponent(args.campaign_id as string)}`,
      start: String((args.start as number) ?? 0),
      count: String((args.count as number) ?? 10),
    };
    if (args.status) params['search.status.values[0]'] = args.status as string;
    return this.apiGet(`adAccounts/${encodeURIComponent(args.account_id as string)}/creatives`, params);
  }

  private async getCreative(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.creative_id) return { content: [{ type: 'text', text: 'creative_id is required' }], isError: true };
    return this.apiGet(`creatives/${encodeURIComponent(args.creative_id as string)}`);
  }

  private async getAdAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    const pivot = (args.pivot as string) ?? 'CAMPAIGN';
    const fields = (args.fields as string) ?? 'clicks,impressions,costInLocalCurrency';
    const params: Record<string, string> = {
      q: 'analytics',
      pivot,
      fields,
      'dateRange.start.year': String(args.dateRange_start_year ?? new Date().getFullYear()),
      'dateRange.start.month': String(args.dateRange_start_month ?? 1),
      'dateRange.start.day': String(args.dateRange_start_day ?? 1),
      'dateRange.end.year': String(args.dateRange_end_year ?? new Date().getFullYear()),
      'dateRange.end.month': String(args.dateRange_end_month ?? new Date().getMonth() + 1),
      'dateRange.end.day': String(args.dateRange_end_day ?? new Date().getDate()),
      timeGranularity: 'ALL',
    };
    if (args.account_id) params['accounts[0]'] = `urn:li:sponsoredAccount:${encodeURIComponent(args.account_id as string)}`;
    if (args.campaign_id) params['campaigns[0]'] = `urn:li:sponsoredCampaign:${encodeURIComponent(args.campaign_id as string)}`;
    return this.apiGet('adAnalytics', params);
  }

  private async listConversionRules(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    const params: Record<string, string> = {
      q: 'account',
      account: `urn:li:sponsoredAccount:${encodeURIComponent(args.account_id as string)}`,
      start: String((args.start as number) ?? 0),
      count: String((args.count as number) ?? 10),
    };
    return this.apiGet('conversions', params);
  }

  private async getConversionRule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.conversion_id) return { content: [{ type: 'text', text: 'conversion_id is required' }], isError: true };
    return this.apiGet(`conversions/${encodeURIComponent(args.conversion_id as string)}`);
  }

  private async listMatchedAudiences(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    const params: Record<string, string> = {
      q: 'account',
      account: `urn:li:sponsoredAccount:${encodeURIComponent(args.account_id as string)}`,
      start: String((args.start as number) ?? 0),
      count: String((args.count as number) ?? 10),
    };
    return this.apiGet('customAudiences', params);
  }
}
