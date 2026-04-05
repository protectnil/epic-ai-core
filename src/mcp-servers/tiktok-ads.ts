/**
 * TikTok Ads MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official TikTok Ads MCP server was found. Community servers exist (github.com/AdsMCP/tiktok-ads-mcp-server,
// github.com/ysntony/tiktok-ads-mcp) but are not published by TikTok/ByteDance and expose only 6-9 tools — below
// the 10-tool threshold. Neither qualifies as an official vendor MCP.
// Our adapter covers: 16 tools. Vendor MCP covers: N/A (no official MCP).
// Recommendation: use-rest-api — no qualifying official vendor MCP server exists.
//
// Base URL: https://business-api.tiktok.com/open_api/v1.3
// Auth: Access token in the Access-Token header (obtained via OAuth2 authorization code flow).
//       Pass the token as: Access-Token: {access_token}
// Docs: https://business-api.tiktok.com/portal/docs
// Rate limits: Approximately 600 requests/min per advertiser for most endpoints; 429 returned on breach.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TikTokAdsConfig {
  accessToken: string;
  baseUrl?: string;
}

export class TikTokAdsMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: TikTokAdsConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://business-api.tiktok.com/open_api/v1.3';
  }

  static catalog() {
    return {
      name: 'tiktok-ads',
      displayName: 'TikTok Ads',
      version: '1.0.0',
      category: 'social',
      keywords: [
        'tiktok', 'tiktok ads', 'short video', 'social advertising', 'campaigns',
        'ad groups', 'creatives', 'audiences', 'reporting', 'performance',
        'bytedance', 'video ads', 'spark ads',
      ],
      toolNames: [
        'get_advertiser_info',
        'list_campaigns',
        'get_campaign',
        'create_campaign',
        'update_campaign',
        'list_adgroups',
        'get_adgroup',
        'create_adgroup',
        'update_adgroup',
        'list_ads',
        'get_ad',
        'create_ad',
        'update_ad',
        'get_report',
        'list_audiences',
        'get_creative_materials',
      ],
      description: 'TikTok Ads Manager: manage campaigns, ad groups, ads, audiences, and retrieve performance reports for TikTok advertising accounts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_advertiser_info',
        description: 'Get account information for one or more TikTok advertiser accounts by advertiser IDs',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_ids: {
              type: 'string',
              description: 'Comma-separated list of advertiser IDs (e.g. "123456789,987654321")',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return (e.g. "name,currency,timezone,status")',
            },
          },
          required: ['advertiser_ids'],
        },
      },
      {
        name: 'list_campaigns',
        description: 'List campaigns for an advertiser with optional status and objective filters',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID to list campaigns for',
            },
            campaign_ids: {
              type: 'string',
              description: 'Comma-separated campaign IDs to filter by (optional)',
            },
            primary_status: {
              type: 'string',
              description: 'Filter by status: STATUS_ALL, STATUS_ACTIVE, STATUS_DELETE, STATUS_ADVERTISER_AUDIT (default: STATUS_ALL)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 10, max: 1000)',
            },
          },
          required: ['advertiser_id'],
        },
      },
      {
        name: 'get_campaign',
        description: 'Get detailed information about a specific campaign by campaign ID',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID that owns the campaign',
            },
            campaign_id: {
              type: 'string',
              description: 'The campaign ID to retrieve',
            },
          },
          required: ['advertiser_id', 'campaign_id'],
        },
      },
      {
        name: 'create_campaign',
        description: 'Create a new TikTok Ads campaign with objective, budget type, and budget amount',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID to create the campaign under',
            },
            campaign_name: {
              type: 'string',
              description: 'Display name for the campaign (max 512 characters)',
            },
            objective_type: {
              type: 'string',
              description: 'Campaign objective: REACH, TRAFFIC, APP_INSTALL, VIDEO_VIEW, LEAD_GENERATION, CONVERSIONS',
            },
            budget_mode: {
              type: 'string',
              description: 'Budget type: BUDGET_MODE_DAY (daily) or BUDGET_MODE_TOTAL (lifetime)',
            },
            budget: {
              type: 'number',
              description: 'Campaign budget amount in the advertiser currency (minimum depends on currency)',
            },
          },
          required: ['advertiser_id', 'campaign_name', 'objective_type', 'budget_mode', 'budget'],
        },
      },
      {
        name: 'update_campaign',
        description: 'Update an existing campaign name, budget, or status',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID that owns the campaign',
            },
            campaign_id: {
              type: 'string',
              description: 'The campaign ID to update',
            },
            campaign_name: {
              type: 'string',
              description: 'Updated campaign display name',
            },
            budget: {
              type: 'number',
              description: 'Updated budget amount',
            },
            operation_status: {
              type: 'string',
              description: 'Status change: ENABLE or DISABLE',
            },
          },
          required: ['advertiser_id', 'campaign_id'],
        },
      },
      {
        name: 'list_adgroups',
        description: 'List ad groups for a campaign with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID to scope the query',
            },
            campaign_ids: {
              type: 'string',
              description: 'Comma-separated campaign IDs to filter ad groups by',
            },
            primary_status: {
              type: 'string',
              description: 'Filter by status: STATUS_ALL, STATUS_ACTIVE, STATUS_DELETE (default: STATUS_ALL)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 10, max: 1000)',
            },
          },
          required: ['advertiser_id'],
        },
      },
      {
        name: 'get_adgroup',
        description: 'Get detailed targeting and bid settings for a specific ad group by ad group ID',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID that owns the ad group',
            },
            adgroup_id: {
              type: 'string',
              description: 'The ad group ID to retrieve',
            },
          },
          required: ['advertiser_id', 'adgroup_id'],
        },
      },
      {
        name: 'create_adgroup',
        description: 'Create a new ad group within a campaign with audience targeting, bid, and schedule settings',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID to create the ad group under',
            },
            campaign_id: {
              type: 'string',
              description: 'Parent campaign ID',
            },
            adgroup_name: {
              type: 'string',
              description: 'Display name for the ad group',
            },
            schedule_type: {
              type: 'string',
              description: 'Schedule type: SCHEDULE_START_END (with end date) or SCHEDULE_FROM_NOW (no end date)',
            },
            schedule_start_time: {
              type: 'string',
              description: 'Ad group start time in YYYY-MM-DD HH:MM:SS format',
            },
            bid_type: {
              type: 'string',
              description: 'Bid strategy: BID_TYPE_NO_BID, BID_TYPE_CUSTOM, BID_TYPE_MAX_CONVERSION',
            },
            budget: {
              type: 'number',
              description: 'Ad group budget amount',
            },
          },
          required: ['advertiser_id', 'campaign_id', 'adgroup_name'],
        },
      },
      {
        name: 'update_adgroup',
        description: 'Update an existing ad group name, budget, bid, or status',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID that owns the ad group',
            },
            adgroup_id: {
              type: 'string',
              description: 'The ad group ID to update',
            },
            adgroup_name: {
              type: 'string',
              description: 'Updated ad group name',
            },
            budget: {
              type: 'number',
              description: 'Updated budget amount',
            },
            operation_status: {
              type: 'string',
              description: 'Status change: ENABLE or DISABLE',
            },
          },
          required: ['advertiser_id', 'adgroup_id'],
        },
      },
      {
        name: 'list_ads',
        description: 'List ads for an advertiser or ad group with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID to scope the query',
            },
            adgroup_ids: {
              type: 'string',
              description: 'Comma-separated ad group IDs to filter ads by',
            },
            primary_status: {
              type: 'string',
              description: 'Filter by status: STATUS_ALL, STATUS_ACTIVE, STATUS_DELETE (default: STATUS_ALL)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 10, max: 1000)',
            },
          },
          required: ['advertiser_id'],
        },
      },
      {
        name: 'get_ad',
        description: 'Get detailed creative and delivery settings for a specific ad by ad ID',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID that owns the ad',
            },
            ad_id: {
              type: 'string',
              description: 'The ad ID to retrieve',
            },
          },
          required: ['advertiser_id', 'ad_id'],
        },
      },
      {
        name: 'create_ad',
        description: 'Create a new ad within an ad group, specifying creative material IDs and ad copy',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID to create the ad under',
            },
            adgroup_id: {
              type: 'string',
              description: 'Ad group ID to place the ad in',
            },
            ad_name: {
              type: 'string',
              description: 'Display name for the ad',
            },
            ad_text: {
              type: 'string',
              description: 'Ad copy text displayed with the creative (max 100 characters)',
            },
            video_id: {
              type: 'string',
              description: 'Video material ID from TikTok creative library',
            },
            landing_page_url: {
              type: 'string',
              description: 'Destination URL when user clicks the ad',
            },
          },
          required: ['advertiser_id', 'adgroup_id', 'ad_name'],
        },
      },
      {
        name: 'update_ad',
        description: 'Update an existing ad name, status, or landing page URL',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID that owns the ad',
            },
            ad_id: {
              type: 'string',
              description: 'The ad ID to update',
            },
            ad_name: {
              type: 'string',
              description: 'Updated ad display name',
            },
            operation_status: {
              type: 'string',
              description: 'Status change: ENABLE or DISABLE',
            },
            landing_page_url: {
              type: 'string',
              description: 'Updated destination URL',
            },
          },
          required: ['advertiser_id', 'ad_id'],
        },
      },
      {
        name: 'get_report',
        description: 'Retrieve performance report data (impressions, clicks, spend, conversions) for campaigns or ad groups over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID to pull the report for',
            },
            report_type: {
              type: 'string',
              description: 'Report granularity: BASIC (summary) or AUDIENCE (by audience segment)',
            },
            dimensions: {
              type: 'string',
              description: 'Comma-separated grouping dimensions (e.g. "campaign_id,stat_time_day")',
            },
            metrics: {
              type: 'string',
              description: 'Comma-separated metrics to include (e.g. "spend,impressions,clicks,ctr,conversion")',
            },
            start_date: {
              type: 'string',
              description: 'Report start date in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'Report end date in YYYY-MM-DD format',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 20, max: 1000)',
            },
          },
          required: ['advertiser_id', 'dimensions', 'metrics', 'start_date', 'end_date'],
        },
      },
      {
        name: 'list_audiences',
        description: 'List custom audiences (customer file, lookalike, pixel-based) for an advertiser',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID to list audiences for',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 10, max: 100)',
            },
          },
          required: ['advertiser_id'],
        },
      },
      {
        name: 'get_creative_materials',
        description: 'List creative material assets (videos, images) uploaded to the TikTok creative library for an advertiser',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID to list creative materials for',
            },
            material_type: {
              type: 'string',
              description: 'Asset type: VIDEO or IMAGE',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 10, max: 100)',
            },
          },
          required: ['advertiser_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_advertiser_info':
          return this.getAdvertiserInfo(args);
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'get_campaign':
          return this.getCampaign(args);
        case 'create_campaign':
          return this.createCampaign(args);
        case 'update_campaign':
          return this.updateCampaign(args);
        case 'list_adgroups':
          return this.listAdgroups(args);
        case 'get_adgroup':
          return this.getAdgroup(args);
        case 'create_adgroup':
          return this.createAdgroup(args);
        case 'update_adgroup':
          return this.updateAdgroup(args);
        case 'list_ads':
          return this.listAds(args);
        case 'get_ad':
          return this.getAd(args);
        case 'create_ad':
          return this.createAd(args);
        case 'update_ad':
          return this.updateAd(args);
        case 'get_report':
          return this.getReport(args);
        case 'list_audiences':
          return this.listAudiences(args);
        case 'get_creative_materials':
          return this.getCreativeMaterials(args);
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
      'Access-Token': this.accessToken,
      'Content-Type': 'application/json',
    };
  }

  private async ttdGet(path: string, params: Record<string, string>): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ttdPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAdvertiserInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_ids) return { content: [{ type: 'text', text: 'advertiser_ids is required' }], isError: true };
    const params: Record<string, string> = { advertiser_ids: `[${encodeURIComponent(args.advertiser_ids as string)}]` };
    if (args.fields) params.fields = `[${encodeURIComponent(args.fields as string)}]`;
    return this.ttdGet('/advertiser/info/', params);
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id) return { content: [{ type: 'text', text: 'advertiser_id is required' }], isError: true };
    const params: Record<string, string> = {
      advertiser_id: args.advertiser_id as string,
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 10),
    };
    if (args.primary_status) params.primary_status = args.primary_status as string;
    if (args.campaign_ids) params.campaign_ids = `[${encodeURIComponent(args.campaign_ids as string)}]`;
    return this.ttdGet('/campaign/get/', params);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id || !args.campaign_id) return { content: [{ type: 'text', text: 'advertiser_id and campaign_id are required' }], isError: true };
    return this.ttdGet('/campaign/get/', {
      advertiser_id: args.advertiser_id as string,
      campaign_ids: `["${encodeURIComponent(args.campaign_id as string)}"]`,
    });
  }

  private async createCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id || !args.campaign_name || !args.objective_type || !args.budget_mode || args.budget === undefined) {
      return { content: [{ type: 'text', text: 'advertiser_id, campaign_name, objective_type, budget_mode, and budget are required' }], isError: true };
    }
    return this.ttdPost('/campaign/create/', {
      advertiser_id: args.advertiser_id,
      campaign_name: args.campaign_name,
      objective_type: args.objective_type,
      budget_mode: args.budget_mode,
      budget: args.budget,
    });
  }

  private async updateCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id || !args.campaign_id) return { content: [{ type: 'text', text: 'advertiser_id and campaign_id are required' }], isError: true };
    const body: Record<string, unknown> = {
      advertiser_id: args.advertiser_id,
      campaign_id: args.campaign_id,
    };
    if (args.campaign_name) body.campaign_name = args.campaign_name;
    if (args.budget !== undefined) body.budget = args.budget;
    if (args.operation_status) body.operation_status = args.operation_status;
    return this.ttdPost('/campaign/update/', body);
  }

  private async listAdgroups(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id) return { content: [{ type: 'text', text: 'advertiser_id is required' }], isError: true };
    const params: Record<string, string> = {
      advertiser_id: args.advertiser_id as string,
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 10),
    };
    if (args.campaign_ids) params.campaign_ids = `[${encodeURIComponent(args.campaign_ids as string)}]`;
    if (args.primary_status) params.primary_status = args.primary_status as string;
    return this.ttdGet('/adgroup/get/', params);
  }

  private async getAdgroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id || !args.adgroup_id) return { content: [{ type: 'text', text: 'advertiser_id and adgroup_id are required' }], isError: true };
    return this.ttdGet('/adgroup/get/', {
      advertiser_id: args.advertiser_id as string,
      adgroup_ids: `["${encodeURIComponent(args.adgroup_id as string)}"]`,
    });
  }

  private async createAdgroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id || !args.campaign_id || !args.adgroup_name) {
      return { content: [{ type: 'text', text: 'advertiser_id, campaign_id, and adgroup_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      advertiser_id: args.advertiser_id,
      campaign_id: args.campaign_id,
      adgroup_name: args.adgroup_name,
    };
    if (args.schedule_type) body.schedule_type = args.schedule_type;
    if (args.schedule_start_time) body.schedule_start_time = args.schedule_start_time;
    if (args.bid_type) body.bid_type = args.bid_type;
    if (args.budget !== undefined) body.budget = args.budget;
    return this.ttdPost('/adgroup/create/', body);
  }

  private async updateAdgroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id || !args.adgroup_id) return { content: [{ type: 'text', text: 'advertiser_id and adgroup_id are required' }], isError: true };
    const body: Record<string, unknown> = {
      advertiser_id: args.advertiser_id,
      adgroup_id: args.adgroup_id,
    };
    if (args.adgroup_name) body.adgroup_name = args.adgroup_name;
    if (args.budget !== undefined) body.budget = args.budget;
    if (args.operation_status) body.operation_status = args.operation_status;
    return this.ttdPost('/adgroup/update/', body);
  }

  private async listAds(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id) return { content: [{ type: 'text', text: 'advertiser_id is required' }], isError: true };
    const params: Record<string, string> = {
      advertiser_id: args.advertiser_id as string,
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 10),
    };
    if (args.adgroup_ids) params.adgroup_ids = `[${encodeURIComponent(args.adgroup_ids as string)}]`;
    if (args.primary_status) params.primary_status = args.primary_status as string;
    return this.ttdGet('/ad/get/', params);
  }

  private async getAd(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id || !args.ad_id) return { content: [{ type: 'text', text: 'advertiser_id and ad_id are required' }], isError: true };
    return this.ttdGet('/ad/get/', {
      advertiser_id: args.advertiser_id as string,
      ad_ids: `["${encodeURIComponent(args.ad_id as string)}"]`,
    });
  }

  private async createAd(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id || !args.adgroup_id || !args.ad_name) {
      return { content: [{ type: 'text', text: 'advertiser_id, adgroup_id, and ad_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      advertiser_id: args.advertiser_id,
      adgroup_id: args.adgroup_id,
      ad_name: args.ad_name,
    };
    if (args.ad_text) body.ad_text = args.ad_text;
    if (args.video_id) body.video_id = args.video_id;
    if (args.landing_page_url) body.landing_page_url = args.landing_page_url;
    return this.ttdPost('/ad/create/', body);
  }

  private async updateAd(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id || !args.ad_id) return { content: [{ type: 'text', text: 'advertiser_id and ad_id are required' }], isError: true };
    const body: Record<string, unknown> = {
      advertiser_id: args.advertiser_id,
      ad_id: args.ad_id,
    };
    if (args.ad_name) body.ad_name = args.ad_name;
    if (args.operation_status) body.operation_status = args.operation_status;
    if (args.landing_page_url) body.landing_page_url = args.landing_page_url;
    return this.ttdPost('/ad/update/', body);
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id || !args.dimensions || !args.metrics || !args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'advertiser_id, dimensions, metrics, start_date, and end_date are required' }], isError: true };
    }
    const params: Record<string, string> = {
      advertiser_id: args.advertiser_id as string,
      report_type: (args.report_type as string) ?? 'BASIC',
      dimensions: JSON.stringify((args.dimensions as string).split(',').map(d => d.trim())),
      metrics: JSON.stringify((args.metrics as string).split(',').map(m => m.trim())),
      start_date: args.start_date as string,
      end_date: args.end_date as string,
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 20),
    };
    return this.ttdGet('/report/integrated/get/', params);
  }

  private async listAudiences(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id) return { content: [{ type: 'text', text: 'advertiser_id is required' }], isError: true };
    return this.ttdGet('/dmp/custom_audience/list/', {
      advertiser_id: args.advertiser_id as string,
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 10),
    });
  }

  private async getCreativeMaterials(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id) return { content: [{ type: 'text', text: 'advertiser_id is required' }], isError: true };
    const params: Record<string, string> = {
      advertiser_id: args.advertiser_id as string,
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 10),
    };
    if (args.material_type) params.material_type = args.material_type as string;
    return this.ttdGet('/file/video/ad/search/', params);
  }
}
