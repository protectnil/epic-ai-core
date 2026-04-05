/**
 * Amazon Ads MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://advertising.amazon.com/API/docs/en-us/mcp/mcp-overview — open beta
//   transport: stdio, auth: OAuth2 (LWA), maintained by Amazon Ads team (2025).
//   Amazon also maintains https://github.com/KuudoAI/amazon_ads_mcp (community) and
//   https://github.com/MarketplaceAdPros/amazon-ads-mcp-server (community).
// Our adapter covers: 18 tools (campaigns, ad groups, keywords, ads, reports, budgets, targeting).
//   Vendor MCP (open beta) covers full API surface.
// Recommendation: Use vendor MCP for full coverage when available. Use this adapter for
//   air-gapped deployments or environments requiring REST-only access.
//
// Base URL: https://advertising-api.amazon.com (NA default)
//   EU: https://advertising-api-eu.amazon.com
//   FE: https://advertising-api-fe.amazon.com
// Auth: OAuth2 — Login With Amazon (LWA) client credentials.
//   Token endpoint: https://api.amazon.com/auth/o2/token
//   Required headers: Amazon-Advertising-API-ClientId, Amazon-Advertising-API-Scope (profile ID)
// Docs: https://advertising.amazon.com/API/docs/en-us/reference/api-overview
// Rate limits: Varies by endpoint. Sponsored Products ~2 req/s; Reporting async (poll for results).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AmazonAdsConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  profileId: string;
  baseUrl?: string;
  region?: 'NA' | 'EU' | 'FE';
}

export class AmazonAdsMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;
  private readonly profileId: string;
  private readonly baseUrl: string;
  private readonly tokenEndpoint: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AmazonAdsConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;
    this.profileId = config.profileId;

    const regionBaseUrls: Record<string, string> = {
      NA: 'https://advertising-api.amazon.com',
      EU: 'https://advertising-api-eu.amazon.com',
      FE: 'https://advertising-api-fe.amazon.com',
    };
    const region = config.region ?? 'NA';
    this.baseUrl = config.baseUrl ?? regionBaseUrls[region];
    this.tokenEndpoint = 'https://api.amazon.com/auth/o2/token';
  }

  static catalog() {
    return {
      name: 'amazon-ads',
      displayName: 'Amazon Ads',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'amazon', 'amazon ads', 'sponsored products', 'sponsored brands', 'sponsored display',
        'retail media', 'advertising', 'campaigns', 'keywords', 'bids', 'budgets', 'acos',
        'roas', 'impressions', 'clicks', 'ppc', 'dsp', 'ad group', 'targeting',
      ],
      toolNames: [
        'list_profiles', 'list_campaigns', 'get_campaign', 'create_campaign', 'update_campaign',
        'list_ad_groups', 'get_ad_group', 'create_ad_group',
        'list_keywords', 'create_keywords', 'update_keyword',
        'list_product_ads', 'create_product_ad',
        'list_targeting_clauses', 'create_targeting_clauses',
        'request_report', 'get_report', 'list_bid_recommendations',
      ],
      description: 'Amazon Ads retail media: manage Sponsored Products campaigns, ad groups, keywords, product ads, targeting, and pull performance reports.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_profiles',
        description: 'List all Amazon Ads profiles accessible with the current credentials, including account type and marketplace',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_campaigns',
        description: 'List Sponsored Products campaigns with optional filters for state, name, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            state_filter: {
              type: 'string',
              description: 'Filter by campaign state: enabled, paused, archived (comma-separated, default: enabled,paused)',
            },
            name: {
              type: 'string',
              description: 'Filter campaigns by name (partial match)',
            },
            start_index: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 100)',
            },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Get detailed information about a single Sponsored Products campaign by campaign ID',
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
        description: 'Create a new Sponsored Products campaign with budget, targeting type, and bidding strategy',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Campaign name',
            },
            campaign_type: {
              type: 'string',
              description: 'Campaign type: sponsoredProducts, sponsoredBrands, sponsoredDisplay (default: sponsoredProducts)',
            },
            targeting_type: {
              type: 'string',
              description: 'Targeting type: manual or auto',
            },
            state: {
              type: 'string',
              description: 'Initial state: enabled or paused (default: paused)',
            },
            daily_budget: {
              type: 'number',
              description: 'Daily budget in account currency (e.g. 50.00)',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYYMMDD format (default: today)',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYYMMDD format (optional)',
            },
            bidding_strategy: {
              type: 'string',
              description: 'Bidding strategy: legacyForSales, autoForSales, manual (default: legacyForSales)',
            },
          },
          required: ['name', 'targeting_type', 'daily_budget'],
        },
      },
      {
        name: 'update_campaign',
        description: 'Update an existing campaign — state, budget, name, or bidding strategy',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Campaign ID to update',
            },
            state: {
              type: 'string',
              description: 'New state: enabled, paused, or archived',
            },
            daily_budget: {
              type: 'number',
              description: 'New daily budget in account currency',
            },
            name: {
              type: 'string',
              description: 'New campaign name',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_ad_groups',
        description: 'List ad groups within a campaign with optional state and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Filter by campaign ID',
            },
            state_filter: {
              type: 'string',
              description: 'Filter by state: enabled, paused, archived (default: enabled,paused)',
            },
            start_index: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of results (max 100, default: 100)',
            },
          },
        },
      },
      {
        name: 'get_ad_group',
        description: 'Get detailed information about a single ad group by ID',
        inputSchema: {
          type: 'object',
          properties: {
            ad_group_id: {
              type: 'string',
              description: 'Ad group ID to retrieve',
            },
          },
          required: ['ad_group_id'],
        },
      },
      {
        name: 'create_ad_group',
        description: 'Create a new ad group within a campaign with default bid',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Campaign ID to create the ad group under',
            },
            name: {
              type: 'string',
              description: 'Ad group name',
            },
            default_bid: {
              type: 'number',
              description: 'Default bid in account currency (e.g. 1.50)',
            },
            state: {
              type: 'string',
              description: 'Initial state: enabled or paused (default: enabled)',
            },
          },
          required: ['campaign_id', 'name', 'default_bid'],
        },
      },
      {
        name: 'list_keywords',
        description: 'List keywords in an ad group or campaign with optional state and match type filters',
        inputSchema: {
          type: 'object',
          properties: {
            ad_group_id: {
              type: 'string',
              description: 'Filter by ad group ID',
            },
            campaign_id: {
              type: 'string',
              description: 'Filter by campaign ID',
            },
            state_filter: {
              type: 'string',
              description: 'Filter by state: enabled, paused, archived (default: enabled,paused)',
            },
            match_type_filter: {
              type: 'string',
              description: 'Filter by match type: exact, phrase, broad (comma-separated)',
            },
            start_index: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of results (max 100, default: 100)',
            },
          },
        },
      },
      {
        name: 'create_keywords',
        description: 'Add one or more keywords to an ad group with match type and bid',
        inputSchema: {
          type: 'object',
          properties: {
            keywords: {
              type: 'string',
              description: 'JSON array of keyword objects with fields: campaign_id, ad_group_id, keyword_text, match_type (exact/phrase/broad), bid, state',
            },
          },
          required: ['keywords'],
        },
      },
      {
        name: 'update_keyword',
        description: 'Update a keyword — change state, bid, or both',
        inputSchema: {
          type: 'object',
          properties: {
            keyword_id: {
              type: 'string',
              description: 'Keyword ID to update',
            },
            state: {
              type: 'string',
              description: 'New state: enabled, paused, or archived',
            },
            bid: {
              type: 'number',
              description: 'New bid amount in account currency',
            },
          },
          required: ['keyword_id'],
        },
      },
      {
        name: 'list_product_ads',
        description: 'List product ads (ASINs/SKUs) in an ad group with optional state filter',
        inputSchema: {
          type: 'object',
          properties: {
            ad_group_id: {
              type: 'string',
              description: 'Filter by ad group ID',
            },
            campaign_id: {
              type: 'string',
              description: 'Filter by campaign ID',
            },
            state_filter: {
              type: 'string',
              description: 'Filter by state: enabled, paused, archived (default: enabled,paused)',
            },
            start_index: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            count: {
              type: 'number',
              description: 'Number of results (max 100, default: 100)',
            },
          },
        },
      },
      {
        name: 'create_product_ad',
        description: 'Add a product ad (ASIN or SKU) to an ad group',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Campaign ID',
            },
            ad_group_id: {
              type: 'string',
              description: 'Ad group ID to add the product ad to',
            },
            asin: {
              type: 'string',
              description: 'ASIN of the product (use asin or sku, not both)',
            },
            sku: {
              type: 'string',
              description: 'Seller SKU (use sku or asin, not both)',
            },
            state: {
              type: 'string',
              description: 'Initial state: enabled or paused (default: enabled)',
            },
          },
          required: ['campaign_id', 'ad_group_id'],
        },
      },
      {
        name: 'list_targeting_clauses',
        description: 'List product or audience targeting clauses for an ad group',
        inputSchema: {
          type: 'object',
          properties: {
            ad_group_id: {
              type: 'string',
              description: 'Filter by ad group ID',
            },
            campaign_id: {
              type: 'string',
              description: 'Filter by campaign ID',
            },
            state_filter: {
              type: 'string',
              description: 'Filter by state: enabled, paused, archived (default: enabled,paused)',
            },
          },
        },
      },
      {
        name: 'create_targeting_clauses',
        description: 'Create product or audience targeting clauses for manual-targeted ad groups',
        inputSchema: {
          type: 'object',
          properties: {
            targeting_clauses: {
              type: 'string',
              description: 'JSON array of targeting clause objects with fields: campaign_id, ad_group_id, expression (type + value), bid, state',
            },
          },
          required: ['targeting_clauses'],
        },
      },
      {
        name: 'request_report',
        description: 'Request an asynchronous performance report for sponsored ads — returns a reportId to poll with get_report',
        inputSchema: {
          type: 'object',
          properties: {
            record_type: {
              type: 'string',
              description: 'Report record type: campaigns, adGroups, keywords, productAds, targets',
            },
            report_date: {
              type: 'string',
              description: 'Report date in YYYYMMDD format (default: yesterday)',
            },
            metrics: {
              type: 'string',
              description: 'Comma-separated metrics: impressions, clicks, cost, attributedSales7d, attributedConversions7d, acos, roas (default: common set)',
            },
            campaign_type: {
              type: 'string',
              description: 'Campaign type for report: sponsoredProducts, sponsoredBrands, sponsoredDisplay (default: sponsoredProducts)',
            },
          },
          required: ['record_type'],
        },
      },
      {
        name: 'get_report',
        description: 'Check status and download a previously requested async performance report by reportId',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'Report ID returned by request_report',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'list_bid_recommendations',
        description: 'Get ML-powered bid recommendations for keywords or targeting expressions in an ad group',
        inputSchema: {
          type: 'object',
          properties: {
            ad_group_id: {
              type: 'string',
              description: 'Ad group ID to get bid recommendations for',
            },
            keyword_ids: {
              type: 'string',
              description: 'Comma-separated keyword IDs to get recommendations for (optional)',
            },
          },
          required: ['ad_group_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_profiles':
          return this.listProfiles();
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'get_campaign':
          return this.getCampaign(args);
        case 'create_campaign':
          return this.createCampaign(args);
        case 'update_campaign':
          return this.updateCampaign(args);
        case 'list_ad_groups':
          return this.listAdGroups(args);
        case 'get_ad_group':
          return this.getAdGroup(args);
        case 'create_ad_group':
          return this.createAdGroup(args);
        case 'list_keywords':
          return this.listKeywords(args);
        case 'create_keywords':
          return this.createKeywords(args);
        case 'update_keyword':
          return this.updateKeyword(args);
        case 'list_product_ads':
          return this.listProductAds(args);
        case 'create_product_ad':
          return this.createProductAd(args);
        case 'list_targeting_clauses':
          return this.listTargetingClauses(args);
        case 'create_targeting_clauses':
          return this.createTargetingClauses(args);
        case 'request_report':
          return this.requestReport(args);
        case 'get_report':
          return this.getReport(args);
        case 'list_bid_recommendations':
          return this.listBidRecommendations(args);
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

  // ---- Auth ----

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now) {
      return this.accessToken;
    }

    const response = await this.fetchWithRetry(this.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`LWA token refresh failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      Authorization: `Bearer ${token}`,
      'Amazon-Advertising-API-ClientId': this.clientId,
      'Amazon-Advertising-API-Scope': this.profileId,
      'Content-Type': 'application/json',
    };
  }

  // ---- HTTP helpers ----

  private async adsGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const hdrs = await this.headers();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: hdrs });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async adsPost(path: string, body: unknown): Promise<ToolResult> {
    const hdrs = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async adsPut(path: string, body: unknown): Promise<ToolResult> {
    const hdrs = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: hdrs,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ---- Tool implementations ----

  private async listProfiles(): Promise<ToolResult> {
    return this.adsGet('/v2/profiles');
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      stateFilter: (args.state_filter as string) ?? 'enabled,paused',
      startIndex: String((args.start_index as number) ?? 0),
      count: String((args.count as number) ?? 100),
    };
    if (args.name) params.name = args.name as string;
    return this.adsGet('/v2/sp/campaigns', params);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.adsGet(`/v2/sp/campaigns/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async createCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.targeting_type || args.daily_budget === undefined) {
      return { content: [{ type: 'text', text: 'name, targeting_type, and daily_budget are required' }], isError: true };
    }
    const campaign: Record<string, unknown> = {
      name: args.name,
      campaignType: (args.campaign_type as string) ?? 'sponsoredProducts',
      targetingType: args.targeting_type,
      state: (args.state as string) ?? 'paused',
      dailyBudget: args.daily_budget,
      startDate: (args.start_date as string) ?? new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    };
    if (args.end_date) campaign.endDate = args.end_date;
    if (args.bidding_strategy) {
      campaign.bidding = { strategy: args.bidding_strategy };
    }
    return this.adsPost('/v2/sp/campaigns', [campaign]);
  }

  private async updateCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const update: Record<string, unknown> = { campaignId: args.campaign_id };
    if (args.state) update.state = args.state;
    if (args.daily_budget !== undefined) update.dailyBudget = args.daily_budget;
    if (args.name) update.name = args.name;
    return this.adsPut('/v2/sp/campaigns', [update]);
  }

  private async listAdGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      stateFilter: (args.state_filter as string) ?? 'enabled,paused',
      startIndex: String((args.start_index as number) ?? 0),
      count: String((args.count as number) ?? 100),
    };
    if (args.campaign_id) params.campaignIdFilter = args.campaign_id as string;
    return this.adsGet('/v2/sp/adGroups', params);
  }

  private async getAdGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_group_id) return { content: [{ type: 'text', text: 'ad_group_id is required' }], isError: true };
    return this.adsGet(`/v2/sp/adGroups/${encodeURIComponent(args.ad_group_id as string)}`);
  }

  private async createAdGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id || !args.name || args.default_bid === undefined) {
      return { content: [{ type: 'text', text: 'campaign_id, name, and default_bid are required' }], isError: true };
    }
    const adGroup = {
      campaignId: args.campaign_id,
      name: args.name,
      defaultBid: args.default_bid,
      state: (args.state as string) ?? 'enabled',
    };
    return this.adsPost('/v2/sp/adGroups', [adGroup]);
  }

  private async listKeywords(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      stateFilter: (args.state_filter as string) ?? 'enabled,paused',
      startIndex: String((args.start_index as number) ?? 0),
      count: String((args.count as number) ?? 100),
    };
    if (args.ad_group_id) params.adGroupIdFilter = args.ad_group_id as string;
    if (args.campaign_id) params.campaignIdFilter = args.campaign_id as string;
    if (args.match_type_filter) params.matchTypeFilter = args.match_type_filter as string;
    return this.adsGet('/v2/sp/keywords', params);
  }

  private async createKeywords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.keywords) return { content: [{ type: 'text', text: 'keywords JSON array is required' }], isError: true };
    let parsed: unknown;
    try {
      parsed = JSON.parse(args.keywords as string);
    } catch {
      return { content: [{ type: 'text', text: 'keywords must be a valid JSON array' }], isError: true };
    }
    return this.adsPost('/v2/sp/keywords', parsed);
  }

  private async updateKeyword(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.keyword_id) return { content: [{ type: 'text', text: 'keyword_id is required' }], isError: true };
    const update: Record<string, unknown> = { keywordId: args.keyword_id };
    if (args.state) update.state = args.state;
    if (args.bid !== undefined) update.bid = args.bid;
    return this.adsPut('/v2/sp/keywords', [update]);
  }

  private async listProductAds(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      stateFilter: (args.state_filter as string) ?? 'enabled,paused',
      startIndex: String((args.start_index as number) ?? 0),
      count: String((args.count as number) ?? 100),
    };
    if (args.ad_group_id) params.adGroupIdFilter = args.ad_group_id as string;
    if (args.campaign_id) params.campaignIdFilter = args.campaign_id as string;
    return this.adsGet('/v2/sp/productAds', params);
  }

  private async createProductAd(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id || !args.ad_group_id) {
      return { content: [{ type: 'text', text: 'campaign_id and ad_group_id are required' }], isError: true };
    }
    if (!args.asin && !args.sku) {
      return { content: [{ type: 'text', text: 'Either asin or sku is required' }], isError: true };
    }
    const ad: Record<string, unknown> = {
      campaignId: args.campaign_id,
      adGroupId: args.ad_group_id,
      state: (args.state as string) ?? 'enabled',
    };
    if (args.asin) ad.asin = args.asin;
    if (args.sku) ad.sku = args.sku;
    return this.adsPost('/v2/sp/productAds', [ad]);
  }

  private async listTargetingClauses(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      stateFilter: (args.state_filter as string) ?? 'enabled,paused',
    };
    if (args.ad_group_id) params.adGroupIdFilter = args.ad_group_id as string;
    if (args.campaign_id) params.campaignIdFilter = args.campaign_id as string;
    return this.adsGet('/v2/sp/targets', params);
  }

  private async createTargetingClauses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.targeting_clauses) return { content: [{ type: 'text', text: 'targeting_clauses JSON array is required' }], isError: true };
    let parsed: unknown;
    try {
      parsed = JSON.parse(args.targeting_clauses as string);
    } catch {
      return { content: [{ type: 'text', text: 'targeting_clauses must be a valid JSON array' }], isError: true };
    }
    return this.adsPost('/v2/sp/targets', parsed);
  }

  private async requestReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_type) return { content: [{ type: 'text', text: 'record_type is required' }], isError: true };
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    const defaultMetrics: Record<string, string> = {
      campaigns: 'impressions,clicks,cost,attributedSales7d,attributedConversions7d',
      adGroups: 'impressions,clicks,cost,attributedSales7d,attributedConversions7d',
      keywords: 'impressions,clicks,cost,attributedSales7d,keywordBid',
      productAds: 'impressions,clicks,cost,attributedSales7d,asin',
      targets: 'impressions,clicks,cost,attributedSales7d',
    };
    const recordType = args.record_type as string;
    const body = {
      reportDate: (args.report_date as string) ?? yesterday,
      metrics: (args.metrics as string) ?? (defaultMetrics[recordType] ?? 'impressions,clicks,cost'),
    };
    const campaignType = (args.campaign_type as string) ?? 'sp';
    const typePrefix = campaignType === 'sponsoredProducts' ? 'sp'
      : campaignType === 'sponsoredBrands' ? 'hsa'
      : campaignType === 'sponsoredDisplay' ? 'sd'
      : campaignType;
    return this.adsPost(`/v2/${typePrefix}/${recordType}/report`, body);
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.report_id) return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    return this.adsGet(`/v2/reports/${encodeURIComponent(args.report_id as string)}`);
  }

  private async listBidRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ad_group_id) return { content: [{ type: 'text', text: 'ad_group_id is required' }], isError: true };
    const params: Record<string, string> = { adGroupId: args.ad_group_id as string };
    if (args.keyword_ids) params.keywordIds = args.keyword_ids as string;
    return this.adsGet('/v2/sp/keywords/bidRecommendations', params);
  }
}
