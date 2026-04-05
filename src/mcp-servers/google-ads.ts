/**
 * Google Ads MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/google-marketing-solutions/google_ads_mcp — transport: stdio, auth: OAuth2 / service account
// Documented at: https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server
// Last release: v0.6.2 (Feb 26, 2026). Maintained. BUT exposes only 2 tools (list_accessible_customers, search).
// Fails the 10+ tools criterion — does not meet full coverage threshold.
// Our adapter covers: 21 tools. Vendor MCP covers: 2 tools.
// Recommendation: use-rest-api — vendor MCP is read-only and exposes only 2 tools vs our 21. REST adapter is the primary integration.
//
// Base URL: https://googleads.googleapis.com/v23
// Auth: OAuth2 (access token via Authorization: Bearer header) + developer token (developer-token header)
//       + optional login-customer-id header for manager account access
// Docs: https://developers.google.com/google-ads/api/rest/overview
// Rate limits: Varies by operation type; see per-method quota documentation.
//              Standard Access: 15,000 operations/day. Basic Access: higher limits on approval.
// NOTE: v19 was sunsetted February 2026. This adapter has been updated to v23 (current stable as of 2026-03-28).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoogleAdsConfig {
  accessToken: string;
  developerToken: string;
  loginCustomerId?: string;
  baseUrl?: string;
}

export class GoogleAdsMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly developerToken: string;
  private readonly loginCustomerId: string | undefined;
  private readonly baseUrl: string;

  constructor(config: GoogleAdsConfig) {
    super();
    this.accessToken = config.accessToken;
    this.developerToken = config.developerToken;
    this.loginCustomerId = config.loginCustomerId;
    this.baseUrl = config.baseUrl || 'https://googleads.googleapis.com/v23';
  }

  static catalog() {
    return {
      name: 'google-ads',
      displayName: 'Google Ads',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'google', 'ads', 'advertising', 'ppc', 'adwords', 'campaign', 'ad group', 'keyword',
        'bidding', 'budget', 'impression', 'click', 'conversion', 'roas', 'cpc', 'cpm',
        'search', 'display', 'shopping', 'performance max', 'remarketing', 'audience',
      ],
      toolNames: [
        'list_accessible_customers', 'get_customer',
        'list_campaigns', 'get_campaign', 'create_campaign', 'update_campaign', 'remove_campaign',
        'list_ad_groups', 'get_ad_group', 'create_ad_group', 'update_ad_group',
        'list_ads', 'get_ad',
        'list_keywords', 'create_keyword', 'update_keyword',
        'search_query_report', 'get_campaign_performance', 'get_keyword_performance',
        'list_campaign_budgets', 'create_campaign_budget',
      ],
      description: 'Google Ads advertising: manage campaigns, ad groups, ads, keywords, budgets, and pull performance reports.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_accessible_customers',
        description: 'List all Google Ads customer accounts accessible with the current OAuth2 credentials',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_customer',
        description: 'Get details for a specific Google Ads customer account including currency, timezone, and status',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only, no hyphens)',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'list_campaigns',
        description: 'List campaigns for a Google Ads customer with optional status and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            status: {
              type: 'string',
              description: 'Filter by campaign status: ENABLED, PAUSED, REMOVED (default: ENABLED and PAUSED)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results to return (max 10000, default: 1000)',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'get_campaign',
        description: 'Get detailed information for a specific Google Ads campaign by resource name or ID',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            campaign_id: {
              type: 'string',
              description: 'Campaign ID (numeric)',
            },
          },
          required: ['customer_id', 'campaign_id'],
        },
      },
      {
        name: 'create_campaign',
        description: 'Create a new Google Ads campaign with specified advertising channel type, bidding strategy, and budget',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            name: {
              type: 'string',
              description: 'Campaign name (must be unique within the account)',
            },
            advertising_channel_type: {
              type: 'string',
              description: 'Channel type: SEARCH, DISPLAY, SHOPPING, VIDEO, PERFORMANCE_MAX',
            },
            campaign_budget_resource_name: {
              type: 'string',
              description: 'Resource name of the campaign budget (e.g. customers/1234/campaignBudgets/5678)',
            },
            status: {
              type: 'string',
              description: 'Initial status: ENABLED or PAUSED (default: PAUSED)',
            },
          },
          required: ['customer_id', 'name', 'advertising_channel_type', 'campaign_budget_resource_name'],
        },
      },
      {
        name: 'update_campaign',
        description: 'Update a Google Ads campaign name, status, or bidding strategy settings',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            campaign_id: {
              type: 'string',
              description: 'Campaign ID (numeric)',
            },
            name: {
              type: 'string',
              description: 'New campaign name',
            },
            status: {
              type: 'string',
              description: 'New status: ENABLED or PAUSED',
            },
          },
          required: ['customer_id', 'campaign_id'],
        },
      },
      {
        name: 'remove_campaign',
        description: 'Remove (soft-delete) a Google Ads campaign, setting its status to REMOVED',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            campaign_id: {
              type: 'string',
              description: 'Campaign ID to remove (numeric)',
            },
          },
          required: ['customer_id', 'campaign_id'],
        },
      },
      {
        name: 'list_ad_groups',
        description: 'List ad groups for a customer or specific campaign with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            campaign_id: {
              type: 'string',
              description: 'Optional: filter ad groups to a specific campaign ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: ENABLED, PAUSED, REMOVED (default: ENABLED and PAUSED)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results to return (max 10000, default: 1000)',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'get_ad_group',
        description: 'Get details for a specific Google Ads ad group by ID',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            ad_group_id: {
              type: 'string',
              description: 'Ad group ID (numeric)',
            },
          },
          required: ['customer_id', 'ad_group_id'],
        },
      },
      {
        name: 'create_ad_group',
        description: 'Create a new ad group within an existing Google Ads campaign',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            campaign_id: {
              type: 'string',
              description: 'Campaign ID to create the ad group in',
            },
            name: {
              type: 'string',
              description: 'Ad group name',
            },
            status: {
              type: 'string',
              description: 'Initial status: ENABLED or PAUSED (default: PAUSED)',
            },
            cpc_bid_micros: {
              type: 'string',
              description: 'Default CPC bid in micros (e.g. 1000000 = $1.00)',
            },
          },
          required: ['customer_id', 'campaign_id', 'name'],
        },
      },
      {
        name: 'update_ad_group',
        description: 'Update a Google Ads ad group name, status, or default bid',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            ad_group_id: {
              type: 'string',
              description: 'Ad group ID to update (numeric)',
            },
            name: {
              type: 'string',
              description: 'New ad group name',
            },
            status: {
              type: 'string',
              description: 'New status: ENABLED or PAUSED',
            },
            cpc_bid_micros: {
              type: 'string',
              description: 'New default CPC bid in micros',
            },
          },
          required: ['customer_id', 'ad_group_id'],
        },
      },
      {
        name: 'list_ads',
        description: 'List ads for a customer or specific ad group with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            ad_group_id: {
              type: 'string',
              description: 'Optional: filter ads to a specific ad group ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: ENABLED, PAUSED, REMOVED (default: ENABLED and PAUSED)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results to return (default: 500)',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'get_ad',
        description: 'Get details for a specific Google Ads ad by ad group and ad ID',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            ad_group_id: {
              type: 'string',
              description: 'Ad group ID containing the ad',
            },
            ad_id: {
              type: 'string',
              description: 'Ad ID (numeric)',
            },
          },
          required: ['customer_id', 'ad_group_id', 'ad_id'],
        },
      },
      {
        name: 'list_keywords',
        description: 'List ad group keywords (criteria) for a customer or specific ad group with match type and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            ad_group_id: {
              type: 'string',
              description: 'Optional: filter keywords to a specific ad group ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: ENABLED, PAUSED, REMOVED (default: ENABLED)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results to return (default: 1000)',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_keyword',
        description: 'Add a keyword to a Google Ads ad group with specified match type and optional CPC bid',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            ad_group_id: {
              type: 'string',
              description: 'Ad group ID to add the keyword to',
            },
            keyword_text: {
              type: 'string',
              description: 'The keyword text to add',
            },
            match_type: {
              type: 'string',
              description: 'Match type: EXACT, PHRASE, or BROAD',
            },
            cpc_bid_micros: {
              type: 'string',
              description: 'Optional CPC bid override in micros (e.g. 500000 = $0.50)',
            },
          },
          required: ['customer_id', 'ad_group_id', 'keyword_text', 'match_type'],
        },
      },
      {
        name: 'update_keyword',
        description: 'Update a Google Ads keyword status or CPC bid by criterion ID',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            ad_group_id: {
              type: 'string',
              description: 'Ad group ID containing the keyword',
            },
            criterion_id: {
              type: 'string',
              description: 'Criterion (keyword) ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: ENABLED or PAUSED',
            },
            cpc_bid_micros: {
              type: 'string',
              description: 'New CPC bid in micros',
            },
          },
          required: ['customer_id', 'ad_group_id', 'criterion_id'],
        },
      },
      {
        name: 'search_query_report',
        description: 'Run a Google Ads Query Language (GAQL) search to retrieve custom reports on campaigns, keywords, or conversions',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            query: {
              type: 'string',
              description: 'GAQL query string (e.g. SELECT campaign.id, campaign.name, metrics.clicks FROM campaign WHERE segments.date DURING LAST_30_DAYS)',
            },
            page_size: {
              type: 'number',
              description: 'Number of rows per page (max 10000, default: 1000)',
            },
          },
          required: ['customer_id', 'query'],
        },
      },
      {
        name: 'get_campaign_performance',
        description: 'Get clicks, impressions, cost, conversions, and ROAS for campaigns over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            date_range: {
              type: 'string',
              description: 'Date range: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH (default: LAST_30_DAYS)',
            },
            campaign_id: {
              type: 'string',
              description: 'Optional: limit results to a single campaign ID',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'get_keyword_performance',
        description: 'Get clicks, impressions, average CPC, and conversions for keywords over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            date_range: {
              type: 'string',
              description: 'Date range: TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH, LAST_MONTH (default: LAST_30_DAYS)',
            },
            ad_group_id: {
              type: 'string',
              description: 'Optional: limit results to a specific ad group',
            },
            page_size: {
              type: 'number',
              description: 'Number of rows to return (default: 1000)',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'list_campaign_budgets',
        description: 'List campaign budgets for a Google Ads account with daily amount and delivery method',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results to return (default: 500)',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_campaign_budget',
        description: 'Create a shared or individual campaign budget with a daily spending amount',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'string',
              description: 'Google Ads customer ID (digits only)',
            },
            name: {
              type: 'string',
              description: 'Budget name (must be unique for shared budgets)',
            },
            amount_micros: {
              type: 'string',
              description: 'Daily budget amount in micros (e.g. 10000000 = $10.00)',
            },
            delivery_method: {
              type: 'string',
              description: 'Delivery method: STANDARD (default, evenly paced) or ACCELERATED',
            },
          },
          required: ['customer_id', 'name', 'amount_micros'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_accessible_customers':
          return this.listAccessibleCustomers();
        case 'get_customer':
          return this.getCustomer(args);
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'get_campaign':
          return this.getCampaign(args);
        case 'create_campaign':
          return this.createCampaign(args);
        case 'update_campaign':
          return this.updateCampaign(args);
        case 'remove_campaign':
          return this.removeCampaign(args);
        case 'list_ad_groups':
          return this.listAdGroups(args);
        case 'get_ad_group':
          return this.getAdGroup(args);
        case 'create_ad_group':
          return this.createAdGroup(args);
        case 'update_ad_group':
          return this.updateAdGroup(args);
        case 'list_ads':
          return this.listAds(args);
        case 'get_ad':
          return this.getAd(args);
        case 'list_keywords':
          return this.listKeywords(args);
        case 'create_keyword':
          return this.createKeyword(args);
        case 'update_keyword':
          return this.updateKeyword(args);
        case 'search_query_report':
          return this.searchQueryReport(args);
        case 'get_campaign_performance':
          return this.getCampaignPerformance(args);
        case 'get_keyword_performance':
          return this.getKeywordPerformance(args);
        case 'list_campaign_budgets':
          return this.listCampaignBudgets(args);
        case 'create_campaign_budget':
          return this.createCampaignBudget(args);
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
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'developer-token': this.developerToken,
      'Content-Type': 'application/json',
    };
    if (this.loginCustomerId) {
      h['login-customer-id'] = this.loginCustomerId;
    }
    return h;
  }


  private async adsGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async adsPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async gaqlSearch(customerId: string, query: string, pageSize = 1000): Promise<ToolResult> {
    return this.adsPost(`/customers/${customerId}/googleAds:search`, {
      query,
      pageSize,
    });
  }

  private async listAccessibleCustomers(): Promise<ToolResult> {
    return this.adsGet('/customers:listAccessibleCustomers');
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const query = `SELECT customer.id, customer.descriptive_name, customer.currency_code,
      customer.time_zone, customer.status, customer.manager
      FROM customer LIMIT 1`;
    return this.gaqlSearch(args.customer_id as string, query);
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const statusFilter = args.status
      ? `AND campaign.status = '${encodeURIComponent(args.status as string)}'`
      : `AND campaign.status IN ('ENABLED', 'PAUSED')`;
    const query = `SELECT campaign.id, campaign.name, campaign.status,
      campaign.advertising_channel_type, campaign.bidding_strategy_type,
      campaign.start_date, campaign.end_date
      FROM campaign
      WHERE campaign.status != 'REMOVED' ${statusFilter}`;
    return this.gaqlSearch(args.customer_id as string, query, (args.page_size as number) || 1000);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.campaign_id) return { content: [{ type: 'text', text: 'customer_id and campaign_id are required' }], isError: true };
    const query = `SELECT campaign.id, campaign.name, campaign.status,
      campaign.advertising_channel_type, campaign.bidding_strategy_type,
      campaign.start_date, campaign.end_date, campaign.campaign_budget
      FROM campaign WHERE campaign.id = ${encodeURIComponent(args.campaign_id as string)}`;
    return this.gaqlSearch(args.customer_id as string, query);
  }

  private async createCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.name || !args.advertising_channel_type || !args.campaign_budget_resource_name) {
      return { content: [{ type: 'text', text: 'customer_id, name, advertising_channel_type, and campaign_budget_resource_name are required' }], isError: true };
    }
    return this.adsPost(`/customers/${encodeURIComponent(args.customer_id as string)}/campaigns:mutate`, {
      operations: [{
        create: {
          name: args.name,
          advertisingChannelType: args.advertising_channel_type,
          campaignBudget: args.campaign_budget_resource_name,
          status: (args.status as string) || 'PAUSED',
        },
      }],
    });
  }

  private async updateCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.campaign_id) return { content: [{ type: 'text', text: 'customer_id and campaign_id are required' }], isError: true };
    const updateFields: Record<string, unknown> = {
      resourceName: `customers/${encodeURIComponent(args.customer_id as string)}/campaigns/${encodeURIComponent(args.campaign_id as string)}`,
    };
    const updateMask: string[] = [];
    if (args.name) { updateFields.name = args.name; updateMask.push('name'); }
    if (args.status) { updateFields.status = args.status; updateMask.push('status'); }
    return this.adsPost(`/customers/${encodeURIComponent(args.customer_id as string)}/campaigns:mutate`, {
      operations: [{ update: updateFields, updateMask: updateMask.join(',') }],
    });
  }

  private async removeCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.campaign_id) return { content: [{ type: 'text', text: 'customer_id and campaign_id are required' }], isError: true };
    return this.adsPost(`/customers/${encodeURIComponent(args.customer_id as string)}/campaigns:mutate`, {
      operations: [{ remove: `customers/${encodeURIComponent(args.customer_id as string)}/campaigns/${encodeURIComponent(args.campaign_id as string)}` }],
    });
  }

  private async listAdGroups(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const statusFilter = args.status
      ? `AND ad_group.status = '${encodeURIComponent(args.status as string)}'`
      : `AND ad_group.status IN ('ENABLED', 'PAUSED')`;
    const campaignFilter = args.campaign_id ? `AND campaign.id = ${encodeURIComponent(args.campaign_id as string)}` : '';
    const query = `SELECT ad_group.id, ad_group.name, ad_group.status,
      ad_group.type, ad_group.cpc_bid_micros, campaign.id, campaign.name
      FROM ad_group
      WHERE ad_group.status != 'REMOVED' ${statusFilter} ${campaignFilter}`;
    return this.gaqlSearch(args.customer_id as string, query, (args.page_size as number) || 1000);
  }

  private async getAdGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.ad_group_id) return { content: [{ type: 'text', text: 'customer_id and ad_group_id are required' }], isError: true };
    const query = `SELECT ad_group.id, ad_group.name, ad_group.status,
      ad_group.type, ad_group.cpc_bid_micros, campaign.id
      FROM ad_group WHERE ad_group.id = ${encodeURIComponent(args.ad_group_id as string)}`;
    return this.gaqlSearch(args.customer_id as string, query);
  }

  private async createAdGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.campaign_id || !args.name) {
      return { content: [{ type: 'text', text: 'customer_id, campaign_id, and name are required' }], isError: true };
    }
    const adGroup: Record<string, unknown> = {
      name: args.name,
      campaign: `customers/${encodeURIComponent(args.customer_id as string)}/campaigns/${encodeURIComponent(args.campaign_id as string)}`,
      status: (args.status as string) || 'PAUSED',
    };
    if (args.cpc_bid_micros) adGroup.cpcBidMicros = args.cpc_bid_micros;
    return this.adsPost(`/customers/${encodeURIComponent(args.customer_id as string)}/adGroups:mutate`, {
      operations: [{ create: adGroup }],
    });
  }

  private async updateAdGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.ad_group_id) return { content: [{ type: 'text', text: 'customer_id and ad_group_id are required' }], isError: true };
    const updateFields: Record<string, unknown> = {
      resourceName: `customers/${encodeURIComponent(args.customer_id as string)}/adGroups/${encodeURIComponent(args.ad_group_id as string)}`,
    };
    const updateMask: string[] = [];
    if (args.name) { updateFields.name = args.name; updateMask.push('name'); }
    if (args.status) { updateFields.status = args.status; updateMask.push('status'); }
    if (args.cpc_bid_micros) { updateFields.cpcBidMicros = args.cpc_bid_micros; updateMask.push('cpc_bid_micros'); }
    return this.adsPost(`/customers/${encodeURIComponent(args.customer_id as string)}/adGroups:mutate`, {
      operations: [{ update: updateFields, updateMask: updateMask.join(',') }],
    });
  }

  private async listAds(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const statusFilter = args.status
      ? `AND ad_group_ad.status = '${encodeURIComponent(args.status as string)}'`
      : `AND ad_group_ad.status IN ('ENABLED', 'PAUSED')`;
    const adGroupFilter = args.ad_group_id ? `AND ad_group.id = ${encodeURIComponent(args.ad_group_id as string)}` : '';
    const query = `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type,
      ad_group_ad.status, ad_group.id, campaign.id
      FROM ad_group_ad
      WHERE ad_group_ad.status != 'REMOVED' ${statusFilter} ${adGroupFilter}`;
    return this.gaqlSearch(args.customer_id as string, query, (args.page_size as number) || 500);
  }

  private async getAd(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.ad_group_id || !args.ad_id) return { content: [{ type: 'text', text: 'customer_id, ad_group_id, and ad_id are required' }], isError: true };
    const query = `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type,
      ad_group_ad.ad.final_urls, ad_group_ad.status
      FROM ad_group_ad
      WHERE ad_group.id = ${encodeURIComponent(args.ad_group_id as string)} AND ad_group_ad.ad.id = ${encodeURIComponent(args.ad_id as string)}`;
    return this.gaqlSearch(args.customer_id as string, query);
  }

  private async listKeywords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const statusFilter = args.status
      ? `AND ad_group_criterion.status = '${encodeURIComponent(args.status as string)}'`
      : `AND ad_group_criterion.status = 'ENABLED'`;
    const adGroupFilter = args.ad_group_id ? `AND ad_group.id = ${encodeURIComponent(args.ad_group_id as string)}` : '';
    const query = `SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type, ad_group_criterion.status,
      ad_group_criterion.cpc_bid_micros, ad_group.id, campaign.id
      FROM ad_group_criterion
      WHERE ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status != 'REMOVED' ${statusFilter} ${adGroupFilter}`;
    return this.gaqlSearch(args.customer_id as string, query, (args.page_size as number) || 1000);
  }

  private async createKeyword(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.ad_group_id || !args.keyword_text || !args.match_type) {
      return { content: [{ type: 'text', text: 'customer_id, ad_group_id, keyword_text, and match_type are required' }], isError: true };
    }
    const criterion: Record<string, unknown> = {
      adGroup: `customers/${encodeURIComponent(args.customer_id as string)}/adGroups/${encodeURIComponent(args.ad_group_id as string)}`,
      status: 'ENABLED',
      keyword: { text: args.keyword_text, matchType: args.match_type },
    };
    if (args.cpc_bid_micros) criterion.cpcBidMicros = args.cpc_bid_micros;
    return this.adsPost(`/customers/${encodeURIComponent(args.customer_id as string)}/adGroupCriteria:mutate`, {
      operations: [{ create: criterion }],
    });
  }

  private async updateKeyword(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.ad_group_id || !args.criterion_id) {
      return { content: [{ type: 'text', text: 'customer_id, ad_group_id, and criterion_id are required' }], isError: true };
    }
    const updateFields: Record<string, unknown> = {
      resourceName: `customers/${encodeURIComponent(args.customer_id as string)}/adGroupCriteria/${encodeURIComponent(args.ad_group_id as string)}~${encodeURIComponent(args.criterion_id as string)}`,
    };
    const updateMask: string[] = [];
    if (args.status) { updateFields.status = args.status; updateMask.push('status'); }
    if (args.cpc_bid_micros) { updateFields.cpcBidMicros = args.cpc_bid_micros; updateMask.push('cpc_bid_micros'); }
    return this.adsPost(`/customers/${encodeURIComponent(args.customer_id as string)}/adGroupCriteria:mutate`, {
      operations: [{ update: updateFields, updateMask: updateMask.join(',') }],
    });
  }

  private async searchQueryReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.query) return { content: [{ type: 'text', text: 'customer_id and query are required' }], isError: true };
    return this.gaqlSearch(args.customer_id as string, args.query as string, (args.page_size as number) || 1000);
  }

  private async getCampaignPerformance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const dateRange = (args.date_range as string) || 'LAST_30_DAYS';
    const campaignFilter = args.campaign_id ? `AND campaign.id = ${encodeURIComponent(args.campaign_id as string)}` : '';
    const query = `SELECT campaign.id, campaign.name, campaign.status,
      metrics.clicks, metrics.impressions, metrics.cost_micros,
      metrics.conversions, metrics.conversions_value, metrics.ctr, metrics.average_cpc
      FROM campaign
      WHERE segments.date DURING ${dateRange}
      AND campaign.status != 'REMOVED' ${campaignFilter}`;
    return this.gaqlSearch(args.customer_id as string, query);
  }

  private async getKeywordPerformance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const dateRange = (args.date_range as string) || 'LAST_30_DAYS';
    const adGroupFilter = args.ad_group_id ? `AND ad_group.id = ${encodeURIComponent(args.ad_group_id as string)}` : '';
    const query = `SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
      ad_group.id, campaign.id, campaign.name,
      metrics.clicks, metrics.impressions, metrics.cost_micros,
      metrics.conversions, metrics.average_cpc, metrics.ctr
      FROM keyword_view
      WHERE segments.date DURING ${dateRange}
      AND ad_group_criterion.status != 'REMOVED' ${adGroupFilter}`;
    return this.gaqlSearch(args.customer_id as string, query, (args.page_size as number) || 1000);
  }

  private async listCampaignBudgets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const query = `SELECT campaign_budget.id, campaign_budget.name,
      campaign_budget.amount_micros, campaign_budget.delivery_method,
      campaign_budget.status, campaign_budget.explicitly_shared
      FROM campaign_budget
      WHERE campaign_budget.status != 'REMOVED'`;
    return this.gaqlSearch(args.customer_id as string, query, (args.page_size as number) || 500);
  }

  private async createCampaignBudget(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id || !args.name || !args.amount_micros) {
      return { content: [{ type: 'text', text: 'customer_id, name, and amount_micros are required' }], isError: true };
    }
    return this.adsPost(`/customers/${encodeURIComponent(args.customer_id as string)}/campaignBudgets:mutate`, {
      operations: [{
        create: {
          name: args.name,
          amountMicros: args.amount_micros,
          deliveryMethod: (args.delivery_method as string) || 'STANDARD',
        },
      }],
    });
  }
}
