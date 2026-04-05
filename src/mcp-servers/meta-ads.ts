/**
 * Meta Ads MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Meta-authored MCP server found. Community server github.com/pipeboard-co/meta-ads-mcp exists
// but is not official (explicitly disclaimed by maintainer). github.com/brijr/meta-ads-mcp is also community-only.
// Our adapter covers: 22 tools (ad accounts, campaigns, ad sets, ads, creatives, audiences, insights).
//
// Base URL: https://graph.facebook.com/v22.0 (configurable; current latest is v24.0, released Oct 2025)
//           v22.0 is the minimum supported version as of September 2025; v24.0 is recommended for new integrations.
// Auth: User access token or system user token passed as "access_token" query parameter (OAuth 2.0)
// Docs: https://developers.facebook.com/docs/marketing-api/
//       https://developers.facebook.com/docs/marketing-api/reference/
// Rate limits: Rolling 1-hour window per token; formula: calls/hr = 60 + 400 * active_ads - 0.001 * errors

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MetaAdsConfig {
  accessToken: string;
  apiVersion?: string;  // defaults to v22.0
  baseUrl?: string;
}

export class MetaAdsMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: MetaAdsConfig) {
    super();
    this.accessToken = config.accessToken;
    const version = config.apiVersion || 'v22.0';
    this.baseUrl = config.baseUrl || `https://graph.facebook.com/${version}`;
  }

  static catalog() {
    return {
      name: 'meta-ads',
      displayName: 'Meta Ads',
      version: '1.0.0',
      category: 'social',
      keywords: ['meta', 'facebook', 'instagram', 'ads', 'advertising', 'campaign', 'ad set', 'creative', 'audience', 'marketing api', 'roas', 'cpa', 'cpm', 'insights', 'paid social'],
      toolNames: [
        'list_ad_accounts',
        'get_ad_account',
        'list_campaigns',
        'get_campaign',
        'create_campaign',
        'update_campaign',
        'delete_campaign',
        'list_ad_sets',
        'get_ad_set',
        'create_ad_set',
        'update_ad_set',
        'list_ads',
        'get_ad',
        'create_ad',
        'update_ad',
        'list_ad_creatives',
        'get_ad_creative',
        'list_custom_audiences',
        'get_campaign_insights',
        'get_ad_set_insights',
        'get_ad_insights',
        'get_account_insights',
      ],
      description: 'Meta Marketing API: manage Facebook and Instagram ad campaigns, ad sets, ads, creatives, and audiences. Retrieve performance insights and analytics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_ad_accounts',
        description: 'List Meta ad accounts accessible to the authenticated user token with account name and status',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Facebook user ID to list ad accounts for (default: "me" for token owner)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of ad accounts to return (default: 25, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response for next page',
            },
          },
        },
      },
      {
        name: 'get_ad_account',
        description: 'Get detailed information about a specific Meta ad account including spend limits, currency, and timezone',
        inputSchema: {
          type: 'object',
          properties: {
            ad_account_id: {
              type: 'string',
              description: 'Ad account ID in act_{id} format (e.g. act_123456789)',
            },
          },
          required: ['ad_account_id'],
        },
      },
      {
        name: 'list_campaigns',
        description: 'List ad campaigns in a Meta ad account with optional filters for status and objective',
        inputSchema: {
          type: 'object',
          properties: {
            ad_account_id: {
              type: 'string',
              description: 'Ad account ID in act_{id} format',
            },
            effective_status: {
              type: 'string',
              description: 'Filter by status (comma-separated): ACTIVE, PAUSED, DELETED, ARCHIVED (default: ACTIVE,PAUSED)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of campaigns to return (default: 25, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor for next page',
            },
          },
          required: ['ad_account_id'],
        },
      },
      {
        name: 'get_campaign',
        description: 'Get details of a specific Meta ad campaign by campaign ID including objective and budget',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'The campaign ID to retrieve',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'create_campaign',
        description: 'Create a new Meta ad campaign with objective, name, status, and optional spend cap',
        inputSchema: {
          type: 'object',
          properties: {
            ad_account_id: {
              type: 'string',
              description: 'Ad account ID in act_{id} format',
            },
            name: {
              type: 'string',
              description: 'Campaign name',
            },
            objective: {
              type: 'string',
              description: 'Campaign objective: OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_APP_PROMOTION, OUTCOME_SALES',
            },
            status: {
              type: 'string',
              description: 'Initial campaign status: ACTIVE, PAUSED (default: PAUSED)',
            },
            spend_cap: {
              type: 'number',
              description: 'Lifetime spend cap in cents for the campaign currency (optional)',
            },
            special_ad_categories: {
              type: 'string',
              description: 'Special ad categories (comma-separated) if applicable: CREDIT, EMPLOYMENT, HOUSING, ISSUES_ELECTIONS_POLITICS (default: NONE)',
            },
          },
          required: ['ad_account_id', 'name', 'objective'],
        },
      },
      {
        name: 'update_campaign',
        description: 'Update the name, status, or spend cap of an existing Meta ad campaign',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'The campaign ID to update',
            },
            name: {
              type: 'string',
              description: 'New campaign name (optional)',
            },
            status: {
              type: 'string',
              description: 'New status: ACTIVE, PAUSED, DELETED, ARCHIVED (optional)',
            },
            spend_cap: {
              type: 'number',
              description: 'New lifetime spend cap in cents (optional)',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'delete_campaign',
        description: 'Delete a Meta ad campaign by campaign ID — sets status to DELETED and stops all delivery',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'The campaign ID to delete',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_ad_sets',
        description: 'List ad sets within a Meta ad campaign or ad account with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            ad_account_id: {
              type: 'string',
              description: 'Ad account ID to list all ad sets in (use this OR campaign_id)',
            },
            campaign_id: {
              type: 'string',
              description: 'Campaign ID to list ad sets for (use this OR ad_account_id)',
            },
            effective_status: {
              type: 'string',
              description: 'Filter by status (comma-separated): ACTIVE, PAUSED, DELETED, ARCHIVED (default: ACTIVE,PAUSED)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of ad sets to return (default: 25, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor for next page',
            },
          },
        },
      },
      {
        name: 'get_ad_set',
        description: 'Get detailed configuration of a specific Meta ad set including targeting, budget, and schedule',
        inputSchema: {
          type: 'object',
          properties: {
            ad_set_id: {
              type: 'string',
              description: 'The ad set ID to retrieve',
            },
          },
          required: ['ad_set_id'],
        },
      },
      {
        name: 'create_ad_set',
        description: 'Create a new Meta ad set within a campaign with targeting, budget, optimization goal, and schedule',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'The campaign ID to create the ad set in',
            },
            ad_account_id: {
              type: 'string',
              description: 'Ad account ID in act_{id} format',
            },
            name: {
              type: 'string',
              description: 'Ad set name',
            },
            daily_budget: {
              type: 'number',
              description: 'Daily budget in cents in the account currency (use this OR lifetime_budget)',
            },
            lifetime_budget: {
              type: 'number',
              description: 'Lifetime budget in cents (use this OR daily_budget)',
            },
            optimization_goal: {
              type: 'string',
              description: 'Optimization goal: REACH, LINK_CLICKS, IMPRESSIONS, CONVERSIONS, LEAD_GENERATION, etc.',
            },
            billing_event: {
              type: 'string',
              description: 'Billing event: IMPRESSIONS, LINK_CLICKS, APP_INSTALLS (default: IMPRESSIONS)',
            },
            targeting: {
              type: 'string',
              description: 'JSON string of targeting spec (age_min, age_max, geo_locations, interests, etc.)',
            },
            status: {
              type: 'string',
              description: 'Initial ad set status: ACTIVE, PAUSED (default: PAUSED)',
            },
            start_time: {
              type: 'string',
              description: 'Start time in ISO 8601 format (optional)',
            },
            end_time: {
              type: 'string',
              description: 'End time in ISO 8601 format (optional, required with lifetime_budget)',
            },
          },
          required: ['campaign_id', 'ad_account_id', 'name', 'optimization_goal', 'billing_event'],
        },
      },
      {
        name: 'update_ad_set',
        description: 'Update the name, budget, status, or targeting of an existing Meta ad set',
        inputSchema: {
          type: 'object',
          properties: {
            ad_set_id: {
              type: 'string',
              description: 'The ad set ID to update',
            },
            name: {
              type: 'string',
              description: 'New ad set name (optional)',
            },
            status: {
              type: 'string',
              description: 'New status: ACTIVE, PAUSED, DELETED, ARCHIVED (optional)',
            },
            daily_budget: {
              type: 'number',
              description: 'New daily budget in cents (optional)',
            },
          },
          required: ['ad_set_id'],
        },
      },
      {
        name: 'list_ads',
        description: 'List ads within a Meta ad set or ad account with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            ad_set_id: {
              type: 'string',
              description: 'Ad set ID to list ads in (use this OR ad_account_id)',
            },
            ad_account_id: {
              type: 'string',
              description: 'Ad account ID to list all ads in (use this OR ad_set_id)',
            },
            effective_status: {
              type: 'string',
              description: 'Filter by status (comma-separated): ACTIVE, PAUSED, DELETED, ARCHIVED (default: ACTIVE,PAUSED)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of ads to return (default: 25, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor for next page',
            },
          },
        },
      },
      {
        name: 'get_ad',
        description: 'Get the full configuration of a specific Meta ad including creative, tracking, and status',
        inputSchema: {
          type: 'object',
          properties: {
            ad_id: {
              type: 'string',
              description: 'The ad ID to retrieve',
            },
          },
          required: ['ad_id'],
        },
      },
      {
        name: 'create_ad',
        description: 'Create a new Meta ad within an ad set, linking to an existing ad creative',
        inputSchema: {
          type: 'object',
          properties: {
            ad_account_id: {
              type: 'string',
              description: 'Ad account ID in act_{id} format',
            },
            ad_set_id: {
              type: 'string',
              description: 'The ad set ID to create the ad in',
            },
            name: {
              type: 'string',
              description: 'Ad name',
            },
            creative_id: {
              type: 'string',
              description: 'Existing ad creative ID to use for this ad',
            },
            status: {
              type: 'string',
              description: 'Initial ad status: ACTIVE, PAUSED (default: PAUSED)',
            },
          },
          required: ['ad_account_id', 'ad_set_id', 'name', 'creative_id'],
        },
      },
      {
        name: 'update_ad',
        description: 'Update the name, status, or creative of an existing Meta ad',
        inputSchema: {
          type: 'object',
          properties: {
            ad_id: {
              type: 'string',
              description: 'The ad ID to update',
            },
            name: {
              type: 'string',
              description: 'New ad name (optional)',
            },
            status: {
              type: 'string',
              description: 'New status: ACTIVE, PAUSED, DELETED, ARCHIVED (optional)',
            },
          },
          required: ['ad_id'],
        },
      },
      {
        name: 'list_ad_creatives',
        description: 'List ad creatives in a Meta ad account with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            ad_account_id: {
              type: 'string',
              description: 'Ad account ID in act_{id} format',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of creatives to return (default: 25, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor for next page',
            },
          },
          required: ['ad_account_id'],
        },
      },
      {
        name: 'get_ad_creative',
        description: 'Get details of a specific Meta ad creative including image, video, copy, and CTA configuration',
        inputSchema: {
          type: 'object',
          properties: {
            creative_id: {
              type: 'string',
              description: 'The ad creative ID to retrieve',
            },
          },
          required: ['creative_id'],
        },
      },
      {
        name: 'list_custom_audiences',
        description: 'List custom audiences in a Meta ad account including lookalikes, customer lists, and website retargeting audiences',
        inputSchema: {
          type: 'object',
          properties: {
            ad_account_id: {
              type: 'string',
              description: 'Ad account ID in act_{id} format',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of audiences to return (default: 25, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor for next page',
            },
          },
          required: ['ad_account_id'],
        },
      },
      {
        name: 'get_campaign_insights',
        description: 'Retrieve performance metrics (impressions, clicks, spend, ROAS, CPA) for a Meta campaign over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'The campaign ID to retrieve insights for',
            },
            date_preset: {
              type: 'string',
              description: 'Predefined date range: today, yesterday, last_7d, last_14d, last_30d, last_month, this_month (default: last_30d)',
            },
            time_range_start: {
              type: 'string',
              description: 'Custom start date in YYYY-MM-DD format (use with time_range_end instead of date_preset)',
            },
            time_range_end: {
              type: 'string',
              description: 'Custom end date in YYYY-MM-DD format',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated metrics: impressions,clicks,spend,reach,cpm,cpc,ctr,conversions,roas (default: impressions,clicks,spend,reach,cpm,cpc,ctr)',
            },
            level: {
              type: 'string',
              description: 'Breakdown level: campaign, adset, ad (default: campaign)',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'get_ad_set_insights',
        description: 'Retrieve performance metrics for a Meta ad set over a date range with optional demographic breakdowns',
        inputSchema: {
          type: 'object',
          properties: {
            ad_set_id: {
              type: 'string',
              description: 'The ad set ID to retrieve insights for',
            },
            date_preset: {
              type: 'string',
              description: 'Predefined date range: today, yesterday, last_7d, last_14d, last_30d (default: last_30d)',
            },
            time_range_start: {
              type: 'string',
              description: 'Custom start date in YYYY-MM-DD format',
            },
            time_range_end: {
              type: 'string',
              description: 'Custom end date in YYYY-MM-DD format',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated metrics: impressions,clicks,spend,reach,cpm,cpc,ctr,conversions (default: impressions,clicks,spend,reach,cpm,cpc)',
            },
            breakdowns: {
              type: 'string',
              description: 'Optional breakdown dimensions: age, gender, country, placement (optional)',
            },
          },
          required: ['ad_set_id'],
        },
      },
      {
        name: 'get_ad_insights',
        description: 'Retrieve performance metrics for a specific Meta ad, with optional placement and device breakdowns',
        inputSchema: {
          type: 'object',
          properties: {
            ad_id: {
              type: 'string',
              description: 'The ad ID to retrieve insights for',
            },
            date_preset: {
              type: 'string',
              description: 'Predefined date range: today, yesterday, last_7d, last_14d, last_30d (default: last_30d)',
            },
            time_range_start: {
              type: 'string',
              description: 'Custom start date in YYYY-MM-DD format',
            },
            time_range_end: {
              type: 'string',
              description: 'Custom end date in YYYY-MM-DD format',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated metrics (default: impressions,clicks,spend,reach,cpm,cpc,ctr)',
            },
          },
          required: ['ad_id'],
        },
      },
      {
        name: 'get_account_insights',
        description: 'Retrieve aggregate performance metrics for an entire Meta ad account across all campaigns over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            ad_account_id: {
              type: 'string',
              description: 'Ad account ID in act_{id} format',
            },
            date_preset: {
              type: 'string',
              description: 'Predefined date range: today, yesterday, last_7d, last_14d, last_30d, this_month (default: last_30d)',
            },
            time_range_start: {
              type: 'string',
              description: 'Custom start date in YYYY-MM-DD format',
            },
            time_range_end: {
              type: 'string',
              description: 'Custom end date in YYYY-MM-DD format',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated metrics (default: impressions,clicks,spend,reach,cpm,cpc,ctr,conversions)',
            },
            level: {
              type: 'string',
              description: 'Breakdown level: account, campaign, adset, ad (default: account)',
            },
          },
          required: ['ad_account_id'],
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
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'get_campaign':
          return this.getCampaign(args);
        case 'create_campaign':
          return this.createCampaign(args);
        case 'update_campaign':
          return this.updateCampaign(args);
        case 'delete_campaign':
          return this.deleteCampaign(args);
        case 'list_ad_sets':
          return this.listAdSets(args);
        case 'get_ad_set':
          return this.getAdSet(args);
        case 'create_ad_set':
          return this.createAdSet(args);
        case 'update_ad_set':
          return this.updateAdSet(args);
        case 'list_ads':
          return this.listAds(args);
        case 'get_ad':
          return this.getAd(args);
        case 'create_ad':
          return this.createAd(args);
        case 'update_ad':
          return this.updateAd(args);
        case 'list_ad_creatives':
          return this.listAdCreatives(args);
        case 'get_ad_creative':
          return this.getAdCreative(args);
        case 'list_custom_audiences':
          return this.listCustomAudiences(args);
        case 'get_campaign_insights':
          return this.getCampaignInsights(args);
        case 'get_ad_set_insights':
          return this.getAdSetInsights(args);
        case 'get_ad_insights':
          return this.getAdInsights(args);
        case 'get_account_insights':
          return this.getAccountInsights(args);
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

  private async graphGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    params.access_token = this.accessToken;
    const qs = new URLSearchParams(params).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async graphPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    body.access_token = this.accessToken;
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async graphDelete(path: string): Promise<ToolResult> {
    const params = new URLSearchParams({ access_token: this.accessToken });
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${params.toString()}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildInsightsParams(args: Record<string, unknown>, defaultFields: string): Record<string, string> {
    const params: Record<string, string> = {
      fields: (args.fields as string) ?? defaultFields,
    };
    if (args.time_range_start && args.time_range_end) {
      params.time_range = JSON.stringify({ since: args.time_range_start, until: args.time_range_end });
    } else {
      params.date_preset = (args.date_preset as string) ?? 'last_30d';
    }
    if (args.level) params.level = args.level as string;
    if (args.breakdowns) params.breakdowns = args.breakdowns as string;
    return params;
  }

  private async listAdAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = (args.user_id as string) ?? 'me';
    const params: Record<string, string> = {
      fields: 'id,name,account_status,currency,timezone_name,amount_spent,balance',
      limit: String((args.limit as number) ?? 25),
    };
    if (args.after) params.after = args.after as string;
    return this.graphGet(`/${userId}/adaccounts`, params);
  }

  private async getAdAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_account_id) return { content: [{ type: 'text', text: 'ad_account_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: 'id,name,account_status,currency,timezone_name,spend_cap,amount_spent,balance,business',
    };
    return this.graphGet(`/${encodeURIComponent(args.ad_account_id as string)}`, params);
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_account_id) return { content: [{ type: 'text', text: 'ad_account_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: 'id,name,objective,status,effective_status,spend_cap,start_time,stop_time,created_time',
      effective_status: `["${((args.effective_status as string) ?? 'ACTIVE,PAUSED').split(',').join('","')}"]`,
      limit: String((args.limit as number) ?? 25),
    };
    if (args.after) params.after = args.after as string;
    return this.graphGet(`/${encodeURIComponent(args.ad_account_id as string)}/campaigns`, params);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const params = { fields: 'id,name,objective,status,effective_status,spend_cap,start_time,stop_time,created_time,updated_time' };
    return this.graphGet(`/${encodeURIComponent(args.campaign_id as string)}`, params);
  }

  private async createCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_account_id || !args.name || !args.objective) {
      return { content: [{ type: 'text', text: 'ad_account_id, name, and objective are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      objective: args.objective,
      status: (args.status as string) ?? 'PAUSED',
      special_ad_categories: args.special_ad_categories
        ? (args.special_ad_categories as string).split(',').map(s => s.trim())
        : [],
    };
    if (args.spend_cap) body.spend_cap = args.spend_cap;
    return this.graphPost(`/${encodeURIComponent(args.ad_account_id as string)}/campaigns`, body);
  }

  private async updateCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.status) body.status = args.status;
    if (args.spend_cap !== undefined) body.spend_cap = args.spend_cap;
    return this.graphPost(`/${encodeURIComponent(args.campaign_id as string)}`, body);
  }

  private async deleteCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.graphDelete(`/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async listAdSets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_account_id && !args.campaign_id) {
      return { content: [{ type: 'text', text: 'ad_account_id or campaign_id is required' }], isError: true };
    }
    const parentId = args.campaign_id ?? args.ad_account_id;
    const endpoint = args.campaign_id ? `/${parentId}/adsets` : `/${parentId}/adsets`;
    const params: Record<string, string> = {
      fields: 'id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,optimization_goal,billing_event,start_time,end_time',
      effective_status: `["${((args.effective_status as string) ?? 'ACTIVE,PAUSED').split(',').join('","')}"]`,
      limit: String((args.limit as number) ?? 25),
    };
    if (args.after) params.after = args.after as string;
    return this.graphGet(endpoint, params);
  }

  private async getAdSet(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_set_id) return { content: [{ type: 'text', text: 'ad_set_id is required' }], isError: true };
    const params = { fields: 'id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,optimization_goal,billing_event,targeting,start_time,end_time,bid_amount' };
    return this.graphGet(`/${encodeURIComponent(args.ad_set_id as string)}`, params);
  }

  private async createAdSet(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id || !args.ad_account_id || !args.name || !args.optimization_goal || !args.billing_event) {
      return { content: [{ type: 'text', text: 'campaign_id, ad_account_id, name, optimization_goal, and billing_event are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      campaign_id: args.campaign_id,
      name: args.name,
      optimization_goal: args.optimization_goal,
      billing_event: args.billing_event,
      status: (args.status as string) ?? 'PAUSED',
    };
    if (args.daily_budget) body.daily_budget = args.daily_budget;
    if (args.lifetime_budget) body.lifetime_budget = args.lifetime_budget;
    if (args.start_time) body.start_time = args.start_time;
    if (args.end_time) body.end_time = args.end_time;
    if (args.targeting) {
      try {
        body.targeting = JSON.parse(args.targeting as string);
      } catch {
        return { content: [{ type: 'text', text: 'targeting must be valid JSON' }], isError: true };
      }
    }
    return this.graphPost(`/${encodeURIComponent(args.ad_account_id as string)}/adsets`, body);
  }

  private async updateAdSet(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_set_id) return { content: [{ type: 'text', text: 'ad_set_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.status) body.status = args.status;
    if (args.daily_budget !== undefined) body.daily_budget = args.daily_budget;
    return this.graphPost(`/${encodeURIComponent(args.ad_set_id as string)}`, body);
  }

  private async listAds(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_set_id && !args.ad_account_id) {
      return { content: [{ type: 'text', text: 'ad_set_id or ad_account_id is required' }], isError: true };
    }
    const parentId = args.ad_set_id ?? args.ad_account_id;
    const endpoint = args.ad_set_id ? `/${parentId}/ads` : `/${parentId}/ads`;
    const params: Record<string, string> = {
      fields: 'id,name,adset_id,campaign_id,status,effective_status,creative{id,name},created_time',
      effective_status: `["${((args.effective_status as string) ?? 'ACTIVE,PAUSED').split(',').join('","')}"]`,
      limit: String((args.limit as number) ?? 25),
    };
    if (args.after) params.after = args.after as string;
    return this.graphGet(endpoint, params);
  }

  private async getAd(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_id) return { content: [{ type: 'text', text: 'ad_id is required' }], isError: true };
    const params = { fields: 'id,name,adset_id,campaign_id,status,effective_status,creative{id,name,body,title},tracking_specs,created_time,updated_time' };
    return this.graphGet(`/${encodeURIComponent(args.ad_id as string)}`, params);
  }

  private async createAd(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_account_id || !args.ad_set_id || !args.name || !args.creative_id) {
      return { content: [{ type: 'text', text: 'ad_account_id, ad_set_id, name, and creative_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      adset_id: args.ad_set_id,
      name: args.name,
      creative: { creative_id: args.creative_id },
      status: (args.status as string) ?? 'PAUSED',
    };
    return this.graphPost(`/${encodeURIComponent(args.ad_account_id as string)}/ads`, body);
  }

  private async updateAd(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_id) return { content: [{ type: 'text', text: 'ad_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.status) body.status = args.status;
    return this.graphPost(`/${encodeURIComponent(args.ad_id as string)}`, body);
  }

  private async listAdCreatives(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_account_id) return { content: [{ type: 'text', text: 'ad_account_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: 'id,name,title,body,image_url,video_id,call_to_action_type,status',
      limit: String((args.limit as number) ?? 25),
    };
    if (args.after) params.after = args.after as string;
    return this.graphGet(`/${encodeURIComponent(args.ad_account_id as string)}/adcreatives`, params);
  }

  private async getAdCreative(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.creative_id) return { content: [{ type: 'text', text: 'creative_id is required' }], isError: true };
    const params = { fields: 'id,name,title,body,image_url,video_id,call_to_action_type,object_story_spec,status,thumbnail_url' };
    return this.graphGet(`/${encodeURIComponent(args.creative_id as string)}`, params);
  }

  private async listCustomAudiences(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_account_id) return { content: [{ type: 'text', text: 'ad_account_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: 'id,name,subtype,approximate_count_lower_bound,approximate_count_upper_bound,delivery_status,last_used_time',
      limit: String((args.limit as number) ?? 25),
    };
    if (args.after) params.after = args.after as string;
    return this.graphGet(`/${encodeURIComponent(args.ad_account_id as string)}/customaudiences`, params);
  }

  private async getCampaignInsights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const defaultFields = 'impressions,clicks,spend,reach,cpm,cpc,ctr';
    const params = this.buildInsightsParams(args, defaultFields);
    return this.graphGet(`/${encodeURIComponent(args.campaign_id as string)}/insights`, params);
  }

  private async getAdSetInsights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_set_id) return { content: [{ type: 'text', text: 'ad_set_id is required' }], isError: true };
    const defaultFields = 'impressions,clicks,spend,reach,cpm,cpc';
    const params = this.buildInsightsParams(args, defaultFields);
    return this.graphGet(`/${encodeURIComponent(args.ad_set_id as string)}/insights`, params);
  }

  private async getAdInsights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_id) return { content: [{ type: 'text', text: 'ad_id is required' }], isError: true };
    const defaultFields = 'impressions,clicks,spend,reach,cpm,cpc,ctr';
    const params = this.buildInsightsParams(args, defaultFields);
    return this.graphGet(`/${encodeURIComponent(args.ad_id as string)}/insights`, params);
  }

  private async getAccountInsights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_account_id) return { content: [{ type: 'text', text: 'ad_account_id is required' }], isError: true };
    const defaultFields = 'impressions,clicks,spend,reach,cpm,cpc,ctr,conversions';
    const params = this.buildInsightsParams(args, defaultFields);
    return this.graphGet(`/${encodeURIComponent(args.ad_account_id as string)}/insights`, params);
  }
}
