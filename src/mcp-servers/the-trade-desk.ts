/**
 * The Trade Desk MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official The Trade Desk MCP server was found on GitHub. The Trade Desk GitHub org
// (github.com/thetradedesk) does not publish an MCP server as of this date.
// Our adapter covers: 17 tools.
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.thetradedesk.com/v3
// Auth: Proprietary token — POST /v3/authentication with login/password; include returned
//       token as "TTD {token}" in the Authorization header for all subsequent requests.
//       Note: TTD also supports static long-lived tokens (1 week – 1 year) generated in the
//       Platform UI and placed directly in the Authorization header as "TTD {token}".
// Docs: https://partner.thetradedesk.com/v3/portal/api/doc/ApiReferencePlatform
// Rate limits: Not publicly documented; enforced per-partner. Contact TTD account manager
//              for partner-specific thresholds. Implement exponential backoff on 429.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TheTradeDeskConfig {
  login: string;
  password: string;
  baseUrl?: string;
}

export class TheTradeDeskMCPServer extends MCPAdapterBase {
  private readonly login: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: TheTradeDeskConfig) {
    super();
    this.login = config.login;
    this.password = config.password;
    this.baseUrl = config.baseUrl || 'https://api.thetradedesk.com/v3';
  }

  static catalog() {
    return {
      name: 'the-trade-desk',
      displayName: 'The Trade Desk',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'trade desk', 'ttd', 'programmatic', 'display advertising', 'dsp',
        'campaigns', 'adgroups', 'creatives', 'advertisers', 'audiences',
        'bidding', 'site list', 'demand side platform', 'retargeting',
      ],
      toolNames: [
        'authenticate',
        'get_advertiser',
        'list_advertisers',
        'get_campaign',
        'list_campaigns',
        'create_campaign',
        'update_campaign',
        'get_adgroup',
        'list_adgroups',
        'create_adgroup',
        'update_adgroup',
        'get_creative',
        'list_creatives',
        'list_site_lists',
        'get_site_list',
        'list_audiences',
        'get_report',
      ],
      description: 'The Trade Desk programmatic advertising DSP: manage advertisers, campaigns, ad groups, creatives, site lists, audiences, and pull performance reports.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'authenticate',
        description: 'Authenticate with The Trade Desk API and retrieve an access token. Call this first if other tools return auth errors.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_advertiser',
        description: 'Get details for a specific advertiser account by advertiser ID',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'The advertiser ID (e.g. abc123def)',
            },
          },
          required: ['advertiser_id'],
        },
      },
      {
        name: 'list_advertisers',
        description: 'List all advertisers accessible to the authenticated partner, with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            partner_id: {
              type: 'string',
              description: 'Partner ID to scope the advertiser list',
            },
            page_start_index: {
              type: 'number',
              description: 'Zero-based index of the first record to return (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 1000)',
            },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Get details for a specific campaign by campaign ID, including budget, dates, and status',
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
        name: 'list_campaigns',
        description: 'List campaigns for an advertiser with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Filter campaigns by advertiser ID',
            },
            availability: {
              type: 'string',
              description: 'Filter by availability: Available, Archived (default: Available)',
            },
            page_start_index: {
              type: 'number',
              description: 'Zero-based index of the first record to return (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 1000)',
            },
          },
        },
      },
      {
        name: 'create_campaign',
        description: 'Create a new campaign for an advertiser with budget, date range, and goal settings',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID that owns this campaign',
            },
            campaign_name: {
              type: 'string',
              description: 'Display name for the campaign',
            },
            budget: {
              type: 'number',
              description: 'Total campaign budget in the advertiser currency',
            },
            start_date: {
              type: 'string',
              description: 'Campaign start date in ISO 8601 format (e.g. 2026-01-15T00:00:00)',
            },
            end_date: {
              type: 'string',
              description: 'Campaign end date in ISO 8601 format (e.g. 2026-03-31T23:59:59)',
            },
          },
          required: ['advertiser_id', 'campaign_name', 'budget', 'start_date', 'end_date'],
        },
      },
      {
        name: 'update_campaign',
        description: 'Update an existing campaign budget, name, dates, or status',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'The campaign ID to update',
            },
            campaign_name: {
              type: 'string',
              description: 'Updated display name for the campaign',
            },
            budget: {
              type: 'number',
              description: 'Updated total campaign budget',
            },
            end_date: {
              type: 'string',
              description: 'Updated campaign end date in ISO 8601 format',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'get_adgroup',
        description: 'Get details for a specific ad group by ad group ID, including targeting and bids',
        inputSchema: {
          type: 'object',
          properties: {
            adgroup_id: {
              type: 'string',
              description: 'The ad group ID to retrieve',
            },
          },
          required: ['adgroup_id'],
        },
      },
      {
        name: 'list_adgroups',
        description: 'List ad groups for a campaign with optional availability filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Filter ad groups by campaign ID',
            },
            availability: {
              type: 'string',
              description: 'Filter by availability: Available, Archived (default: Available)',
            },
            page_start_index: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 1000)',
            },
          },
        },
      },
      {
        name: 'create_adgroup',
        description: 'Create a new ad group within a campaign, specifying bid, budget, and targeting',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Parent campaign ID for this ad group',
            },
            adgroup_name: {
              type: 'string',
              description: 'Display name for the ad group',
            },
            budget_in_impressions: {
              type: 'number',
              description: 'Budget expressed as maximum impressions',
            },
            base_bid_cpm: {
              type: 'number',
              description: 'Base bid in CPM (cost per thousand impressions) in advertiser currency',
            },
          },
          required: ['campaign_id', 'adgroup_name'],
        },
      },
      {
        name: 'update_adgroup',
        description: 'Update an existing ad group bid, budget, name, or targeting settings',
        inputSchema: {
          type: 'object',
          properties: {
            adgroup_id: {
              type: 'string',
              description: 'The ad group ID to update',
            },
            adgroup_name: {
              type: 'string',
              description: 'Updated display name for the ad group',
            },
            base_bid_cpm: {
              type: 'number',
              description: 'Updated base bid in CPM',
            },
          },
          required: ['adgroup_id'],
        },
      },
      {
        name: 'get_creative',
        description: 'Get details for a specific creative asset by creative ID, including dimensions and tracking URLs',
        inputSchema: {
          type: 'object',
          properties: {
            creative_id: {
              type: 'string',
              description: 'The creative ID to retrieve',
            },
          },
          required: ['creative_id'],
        },
      },
      {
        name: 'list_creatives',
        description: 'List creatives for an advertiser with optional type filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Filter creatives by advertiser ID',
            },
            availability: {
              type: 'string',
              description: 'Filter by availability: Available, Archived (default: Available)',
            },
            page_start_index: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 1000)',
            },
          },
        },
      },
      {
        name: 'list_site_lists',
        description: 'List site/app allowlists and blocklists for an advertiser',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID to list site lists for',
            },
            page_start_index: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 1000)',
            },
          },
        },
      },
      {
        name: 'get_site_list',
        description: 'Get details and entries for a specific site list by site list ID',
        inputSchema: {
          type: 'object',
          properties: {
            site_list_id: {
              type: 'string',
              description: 'The site list ID to retrieve',
            },
          },
          required: ['site_list_id'],
        },
      },
      {
        name: 'list_audiences',
        description: 'List audience segments available for targeting, including first-party and third-party audiences',
        inputSchema: {
          type: 'object',
          properties: {
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID to filter audiences',
            },
            page_start_index: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (default: 100, max: 1000)',
            },
          },
        },
      },
      {
        name: 'get_report',
        description: 'Request a performance report for campaigns or ad groups, including impressions, clicks, spend, and conversions',
        inputSchema: {
          type: 'object',
          properties: {
            report_schedule_id: {
              type: 'string',
              description: 'Report schedule ID to retrieve results for',
            },
            advertiser_id: {
              type: 'string',
              description: 'Advertiser ID to scope the report',
            },
            start_date: {
              type: 'string',
              description: 'Report start date in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'Report end date in YYYY-MM-DD format',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'authenticate':
          return this.authenticate();
        case 'get_advertiser':
          return this.getAdvertiser(args);
        case 'list_advertisers':
          return this.listAdvertisers(args);
        case 'get_campaign':
          return this.getCampaign(args);
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'create_campaign':
          return this.createCampaign(args);
        case 'update_campaign':
          return this.updateCampaign(args);
        case 'get_adgroup':
          return this.getAdgroup(args);
        case 'list_adgroups':
          return this.listAdgroups(args);
        case 'create_adgroup':
          return this.createAdgroup(args);
        case 'update_adgroup':
          return this.updateAdgroup(args);
        case 'get_creative':
          return this.getCreative(args);
        case 'list_creatives':
          return this.listCreatives(args);
        case 'list_site_lists':
          return this.listSiteLists(args);
        case 'get_site_list':
          return this.getSiteList(args);
        case 'list_audiences':
          return this.listAudiences(args);
        case 'get_report':
          return this.getReport(args);
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
    const response = await this.fetchWithRetry(`${this.baseUrl}/authentication`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Login: this.login, Password: this.password }),
    });
    if (!response.ok) {
      throw new Error(`TTD authentication failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { Token: string; TokenExpirationUtc?: string };
    this.bearerToken = data.Token;
    // TTD tokens expire after 1 hour; refresh 60s early
    this.tokenExpiry = now + (3600 - 60) * 1000;
    return this.bearerToken;
  }

  private async ttdGet(path: string): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `TTD ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ttdPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `TTD ${token}`,
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

  private async ttdPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `TTD ${token}`,
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

  private async authenticate(): Promise<ToolResult> {
    try {
      const token = await this.getOrRefreshToken();
      return { content: [{ type: 'text', text: JSON.stringify({ status: 'authenticated', token_preview: token.slice(0, 8) + '...' }) }], isError: false };
    } catch (err) {
      return { content: [{ type: 'text', text: `Authentication failed: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }

  private async getAdvertiser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id) return { content: [{ type: 'text', text: 'advertiser_id is required' }], isError: true };
    return this.ttdGet(`/advertiser/${encodeURIComponent(args.advertiser_id as string)}`);
  }

  private async listAdvertisers(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      PageStartIndex: (args.page_start_index as number) ?? 0,
      PageSize: (args.page_size as number) ?? 100,
    };
    if (args.partner_id) body.PartnerId = args.partner_id;
    return this.ttdPost('/advertiser/query/partner', body);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.ttdGet(`/campaign/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      PageStartIndex: (args.page_start_index as number) ?? 0,
      PageSize: (args.page_size as number) ?? 100,
    };
    if (args.advertiser_id) body.AdvertiserId = args.advertiser_id;
    if (args.availability) body.Availability = args.availability;
    return this.ttdPost('/campaign/query/advertiser', body);
  }

  private async createCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.advertiser_id || !args.campaign_name || !args.budget || !args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'advertiser_id, campaign_name, budget, start_date, and end_date are required' }], isError: true };
    }
    return this.ttdPost('/campaign', {
      AdvertiserId: args.advertiser_id,
      CampaignName: args.campaign_name,
      Budget: args.budget,
      StartDate: args.start_date,
      EndDate: args.end_date,
    });
  }

  private async updateCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const body: Record<string, unknown> = { CampaignId: args.campaign_id };
    if (args.campaign_name) body.CampaignName = args.campaign_name;
    if (args.budget !== undefined) body.Budget = args.budget;
    if (args.end_date) body.EndDate = args.end_date;
    return this.ttdPut('/campaign', body);
  }

  private async getAdgroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.adgroup_id) return { content: [{ type: 'text', text: 'adgroup_id is required' }], isError: true };
    return this.ttdGet(`/adgroup/${encodeURIComponent(args.adgroup_id as string)}`);
  }

  private async listAdgroups(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      PageStartIndex: (args.page_start_index as number) ?? 0,
      PageSize: (args.page_size as number) ?? 100,
    };
    if (args.campaign_id) body.CampaignId = args.campaign_id;
    if (args.availability) body.Availability = args.availability;
    return this.ttdPost('/adgroup/query/campaign', body);
  }

  private async createAdgroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id || !args.adgroup_name) {
      return { content: [{ type: 'text', text: 'campaign_id and adgroup_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { CampaignId: args.campaign_id, AdGroupName: args.adgroup_name };
    if (args.budget_in_impressions !== undefined) body.BudgetInImpressions = args.budget_in_impressions;
    if (args.base_bid_cpm !== undefined) body.BaseBidCPM = args.base_bid_cpm;
    return this.ttdPost('/adgroup', body);
  }

  private async updateAdgroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.adgroup_id) return { content: [{ type: 'text', text: 'adgroup_id is required' }], isError: true };
    const body: Record<string, unknown> = { AdGroupId: args.adgroup_id };
    if (args.adgroup_name) body.AdGroupName = args.adgroup_name;
    if (args.base_bid_cpm !== undefined) body.BaseBidCPM = args.base_bid_cpm;
    return this.ttdPut('/adgroup', body);
  }

  private async getCreative(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.creative_id) return { content: [{ type: 'text', text: 'creative_id is required' }], isError: true };
    return this.ttdGet(`/creative/${encodeURIComponent(args.creative_id as string)}`);
  }

  private async listCreatives(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      PageStartIndex: (args.page_start_index as number) ?? 0,
      PageSize: (args.page_size as number) ?? 100,
    };
    if (args.advertiser_id) body.AdvertiserId = args.advertiser_id;
    if (args.availability) body.Availability = args.availability;
    return this.ttdPost('/creative/query/advertiser', body);
  }

  private async listSiteLists(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      PageStartIndex: (args.page_start_index as number) ?? 0,
      PageSize: (args.page_size as number) ?? 100,
    };
    if (args.advertiser_id) body.AdvertiserId = args.advertiser_id;
    return this.ttdPost('/sitelist/query/advertiser', body);
  }

  private async getSiteList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_list_id) return { content: [{ type: 'text', text: 'site_list_id is required' }], isError: true };
    return this.ttdGet(`/sitelist/${encodeURIComponent(args.site_list_id as string)}`);
  }

  private async listAudiences(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      PageStartIndex: (args.page_start_index as number) ?? 0,
      PageSize: (args.page_size as number) ?? 100,
    };
    if (args.advertiser_id) body.AdvertiserId = args.advertiser_id;
    return this.ttdPost('/thirdpartydata/query/advertiser', body);
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.report_schedule_id) body.ReportScheduleId = args.report_schedule_id;
    if (args.advertiser_id) body.AdvertiserId = args.advertiser_id;
    if (args.start_date) body.StartDate = args.start_date;
    if (args.end_date) body.EndDate = args.end_date;
    return this.ttdPost('/myreports/reportschedule/query', body);
  }
}
