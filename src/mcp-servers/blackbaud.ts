/**
 * Blackbaud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — No official Blackbaud MCP server exists.
// CData offers a read-only third-party MCP server for Blackbaud Financial Edge NXT via JDBC
// (https://cdn.cdata.com/help/JZK/mcp) — not official vendor, requires CData licensing,
// limited read-only coverage. Composio offers a managed connector but not a vendor MCP.
// Neither qualifies under the protocol's "official vendor MCP" criteria.
// Our adapter covers: 20 tools. Vendor MCP covers: 0 tools (N/A — no official MCP).
// Recommendation: use-rest-api — this REST adapter is the primary integration.
//
// Base URL: https://api.sky.blackbaud.com
// Auth: OAuth 2.0 Authorization Code flow. Requires:
//       - access_token (obtain via user auth flow at https://oauth2.sky.blackbaud.com/authorization)
//       - Bb-Api-Subscription-Key header (from Blackbaud Developer Profile → My Subscriptions)
//       The SKY API does NOT support client_credentials flow — it requires user authorization.
//       Pass a pre-obtained access_token and the adapter will use it directly.
//       For refresh: provide refreshToken + clientId + clientSecret to auto-refresh.
// Docs: https://developer.blackbaud.com/skyapi
//       https://developer.blackbaud.com/skyapi/docs/basics/
//       https://developer.blackbaud.com/skyapi/docs/authorization
// Rate limits: 10 calls/second. Daily quota: 1,000 (Free), 25,000 (Standard), 100,000 (High volume),
//              250,000 (Max volume) calls/24-hr period. HTTP 429 on rate limit; Retry-After header provided.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BlackbaudConfig {
  accessToken: string;
  subscriptionKey: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  baseUrl?: string;
}

export class BlackbaudMCPServer extends MCPAdapterBase {
  private accessToken: string;
  private readonly subscriptionKey: string;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private refreshToken: string | undefined;
  private readonly baseUrl: string;

  constructor(config: BlackbaudConfig) {
    super();
    this.accessToken = config.accessToken;
    this.subscriptionKey = config.subscriptionKey;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;
    this.baseUrl = config.baseUrl || 'https://api.sky.blackbaud.com';
  }

  static catalog() {
    return {
      name: 'blackbaud',
      displayName: 'Blackbaud',
      version: '1.0.0',
      category: 'crm',
      keywords: [
        'blackbaud', 'nonprofit', 'crm', 'raiser\'s edge', 'renxt', 'fundraising',
        'constituent', 'donor', 'gift', 'donation', 'fund', 'campaign', 'pledge',
        'appeal', 'appeal letter', 'giving', 'philanthropy', 'ngo', 'charity',
        'sky api', 'financial edge', 'altru',
      ],
      toolNames: [
        'list_constituents',
        'get_constituent',
        'create_constituent',
        'update_constituent',
        'search_constituents',
        'list_constituent_addresses',
        'list_constituent_phones',
        'list_constituent_emails',
        'list_gifts',
        'get_gift',
        'create_gift',
        'update_gift',
        'list_funds',
        'get_fund',
        'list_campaigns',
        'get_campaign',
        'list_appeals',
        'get_appeal',
        'list_gift_types',
        'get_constituent_giving_summary',
      ],
      description: 'Blackbaud SKY API for Raiser\'s Edge NXT: manage constituents (donors), gifts, funds, campaigns, and appeals in nonprofit CRM and fundraising operations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_constituents',
        description: 'List constituents (donors, volunteers, organizations) in Raiser\'s Edge NXT with optional sort and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of constituents to return (default: 500, max: 500 per call).',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
            sort_token: {
              type: 'string',
              description: 'Pagination sort token from a previous response to retrieve the next page.',
            },
            include_inactive: {
              type: 'boolean',
              description: 'Include inactive constituents in results (default: false).',
            },
          },
        },
      },
      {
        name: 'get_constituent',
        description: 'Get full profile details for a single constituent in Raiser\'s Edge NXT by their constituent ID.',
        inputSchema: {
          type: 'object',
          properties: {
            constituent_id: {
              type: 'string',
              description: 'Unique constituent ID.',
            },
          },
          required: ['constituent_id'],
        },
      },
      {
        name: 'create_constituent',
        description: 'Create a new constituent (individual or organization) record in Raiser\'s Edge NXT.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Constituent type: Individual or Organization.',
            },
            first: {
              type: 'string',
              description: 'First name (for Individual type).',
            },
            last: {
              type: 'string',
              description: 'Last name (for Individual type). Required for individuals.',
            },
            name: {
              type: 'string',
              description: 'Organization name (for Organization type).',
            },
            email: {
              type: 'string',
              description: 'Primary email address.',
            },
            phone: {
              type: 'string',
              description: 'Primary phone number.',
            },
            birthdate: {
              type: 'string',
              description: 'Date of birth in ISO 8601 format YYYY-MM-DD (for individuals).',
            },
            gender: {
              type: 'string',
              description: 'Gender: Male, Female, Unknown (for individuals).',
            },
            lookup_id: {
              type: 'string',
              description: 'Your organization\'s external identifier / lookup ID for this constituent.',
            },
          },
          required: ['type'],
        },
      },
      {
        name: 'update_constituent',
        description: 'Update profile fields on an existing constituent by ID. Only include fields to change — unspecified fields remain unchanged.',
        inputSchema: {
          type: 'object',
          properties: {
            constituent_id: {
              type: 'string',
              description: 'Constituent ID to update.',
            },
            first: {
              type: 'string',
              description: 'Updated first name.',
            },
            last: {
              type: 'string',
              description: 'Updated last name.',
            },
            gender: {
              type: 'string',
              description: 'Updated gender: Male, Female, Unknown.',
            },
            birthdate: {
              type: 'string',
              description: 'Updated date of birth in YYYY-MM-DD format.',
            },
            lookup_id: {
              type: 'string',
              description: 'Updated external lookup ID.',
            },
            inactive: {
              type: 'boolean',
              description: 'Set to true to mark the constituent as inactive.',
            },
          },
          required: ['constituent_id'],
        },
      },
      {
        name: 'search_constituents',
        description: 'Search constituents by name, email, phone, or lookup ID using free-text search across the Raiser\'s Edge NXT database.',
        inputSchema: {
          type: 'object',
          properties: {
            search_text: {
              type: 'string',
              description: 'Free-text search query — matches against name, email, phone, and lookup ID.',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 50, max: 500).',
            },
          },
          required: ['search_text'],
        },
      },
      {
        name: 'list_constituent_addresses',
        description: 'List all address records for a specific constituent, including primary and secondary addresses with type and seasonal flags.',
        inputSchema: {
          type: 'object',
          properties: {
            constituent_id: {
              type: 'string',
              description: 'Constituent ID to retrieve addresses for.',
            },
          },
          required: ['constituent_id'],
        },
      },
      {
        name: 'list_constituent_phones',
        description: 'List all phone number records for a specific constituent, including type (home, mobile, work) and primary flag.',
        inputSchema: {
          type: 'object',
          properties: {
            constituent_id: {
              type: 'string',
              description: 'Constituent ID to retrieve phone numbers for.',
            },
          },
          required: ['constituent_id'],
        },
      },
      {
        name: 'list_constituent_emails',
        description: 'List all email addresses on file for a specific constituent, including type and primary flag.',
        inputSchema: {
          type: 'object',
          properties: {
            constituent_id: {
              type: 'string',
              description: 'Constituent ID to retrieve email addresses for.',
            },
          },
          required: ['constituent_id'],
        },
      },
      {
        name: 'list_gifts',
        description: 'List gifts (donations) with optional filters for constituent, fund, date range, and gift type. Supports pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            constituent_id: {
              type: 'string',
              description: 'Filter gifts by donor constituent ID.',
            },
            fund_id: {
              type: 'string',
              description: 'Filter gifts by fund ID.',
            },
            campaign_id: {
              type: 'string',
              description: 'Filter gifts by campaign ID.',
            },
            appeal_id: {
              type: 'string',
              description: 'Filter gifts by appeal ID.',
            },
            gift_type: {
              type: 'string',
              description: 'Filter by gift type: Gift, Pledge, RecurringGift, RecurringGiftPayment, StockGiftAndProperty, GiftInKind, Other.',
            },
            date_added: {
              type: 'string',
              description: 'Filter gifts added on or after this date (ISO 8601 format YYYY-MM-DD).',
            },
            limit: {
              type: 'number',
              description: 'Maximum gifts to return per call (default: 500, max: 500).',
            },
            offset: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'get_gift',
        description: 'Get full details of a single gift record by gift ID, including amount, date, fund, campaign, appeal, and acknowledgment status.',
        inputSchema: {
          type: 'object',
          properties: {
            gift_id: {
              type: 'string',
              description: 'Unique gift ID.',
            },
          },
          required: ['gift_id'],
        },
      },
      {
        name: 'create_gift',
        description: 'Create a new gift (donation) record in Raiser\'s Edge NXT for a constituent, linked to a fund and optional campaign or appeal.',
        inputSchema: {
          type: 'object',
          properties: {
            constituent_id: {
              type: 'string',
              description: 'Constituent ID of the donor making the gift.',
            },
            amount: {
              type: 'number',
              description: 'Gift amount in the account\'s base currency.',
            },
            gift_type: {
              type: 'string',
              description: 'Gift type: Gift (default), Pledge, RecurringGift, GiftInKind, StockGiftAndProperty.',
            },
            date: {
              type: 'string',
              description: 'Gift date in ISO 8601 format YYYY-MM-DD (default: today).',
            },
            fund_id: {
              type: 'string',
              description: 'Fund ID to allocate this gift to.',
            },
            campaign_id: {
              type: 'string',
              description: 'Campaign ID associated with this gift.',
            },
            appeal_id: {
              type: 'string',
              description: 'Appeal ID associated with this gift.',
            },
            acknowledgement_status: {
              type: 'string',
              description: 'Acknowledgement status: Acknowledged, ToBeAcknowledged, DoNotAcknowledge.',
            },
            post_status: {
              type: 'string',
              description: 'GL post status: Posted, NotPosted, DoNotPost.',
            },
          },
          required: ['constituent_id', 'amount', 'gift_type', 'fund_id'],
        },
      },
      {
        name: 'update_gift',
        description: 'Update fields on an existing gift record by gift ID. Only include fields to change.',
        inputSchema: {
          type: 'object',
          properties: {
            gift_id: {
              type: 'string',
              description: 'Gift ID to update.',
            },
            amount: {
              type: 'number',
              description: 'Updated gift amount.',
            },
            date: {
              type: 'string',
              description: 'Updated gift date in YYYY-MM-DD format.',
            },
            acknowledgement_status: {
              type: 'string',
              description: 'Updated acknowledgement status: Acknowledged, ToBeAcknowledged, DoNotAcknowledge.',
            },
            post_status: {
              type: 'string',
              description: 'Updated GL post status: Posted, NotPosted, DoNotPost.',
            },
          },
          required: ['gift_id'],
        },
      },
      {
        name: 'list_funds',
        description: 'List fundraising funds in Raiser\'s Edge NXT with optional active/inactive filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            include_inactive: {
              type: 'boolean',
              description: 'Include inactive funds (default: false).',
            },
            limit: {
              type: 'number',
              description: 'Maximum funds to return (default: 500, max: 500).',
            },
            offset: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'get_fund',
        description: 'Get details of a specific fund by fund ID, including description, start/end dates, and GL account information.',
        inputSchema: {
          type: 'object',
          properties: {
            fund_id: {
              type: 'string',
              description: 'Fund ID to retrieve.',
            },
          },
          required: ['fund_id'],
        },
      },
      {
        name: 'list_campaigns',
        description: 'List fundraising campaigns in Raiser\'s Edge NXT with optional filter for active/inactive status and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            include_inactive: {
              type: 'boolean',
              description: 'Include inactive campaigns (default: false).',
            },
            limit: {
              type: 'number',
              description: 'Maximum campaigns to return (default: 500, max: 500).',
            },
            offset: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Get details of a specific campaign by campaign ID, including goal amount, start/end dates, and description.',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Campaign ID to retrieve.',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_appeals',
        description: 'List fundraising appeals in Raiser\'s Edge NXT. Appeals are specific solicitations tied to campaigns.',
        inputSchema: {
          type: 'object',
          properties: {
            include_inactive: {
              type: 'boolean',
              description: 'Include inactive appeals (default: false).',
            },
            limit: {
              type: 'number',
              description: 'Maximum appeals to return (default: 500, max: 500).',
            },
            offset: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0).',
            },
          },
        },
      },
      {
        name: 'get_appeal',
        description: 'Get details of a specific appeal by appeal ID, including description, campaign linkage, and mailing information.',
        inputSchema: {
          type: 'object',
          properties: {
            appeal_id: {
              type: 'string',
              description: 'Appeal ID to retrieve.',
            },
          },
          required: ['appeal_id'],
        },
      },
      {
        name: 'list_gift_types',
        description: 'List all available gift types configured in the Raiser\'s Edge NXT environment for use when creating gift records.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_constituent_giving_summary',
        description: 'Get a summary of a constituent\'s total giving history: lifetime giving, last gift amount, last gift date, and largest gift.',
        inputSchema: {
          type: 'object',
          properties: {
            constituent_id: {
              type: 'string',
              description: 'Constituent ID to retrieve the giving summary for.',
            },
          },
          required: ['constituent_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_constituents':
          return this.listConstituents(args);
        case 'get_constituent':
          return this.getConstituent(args);
        case 'create_constituent':
          return this.createConstituent(args);
        case 'update_constituent':
          return this.updateConstituent(args);
        case 'search_constituents':
          return this.searchConstituents(args);
        case 'list_constituent_addresses':
          return this.listConstituentAddresses(args);
        case 'list_constituent_phones':
          return this.listConstituentPhones(args);
        case 'list_constituent_emails':
          return this.listConstituentEmails(args);
        case 'list_gifts':
          return this.listGifts(args);
        case 'get_gift':
          return this.getGift(args);
        case 'create_gift':
          return this.createGift(args);
        case 'update_gift':
          return this.updateGift(args);
        case 'list_funds':
          return this.listFunds(args);
        case 'get_fund':
          return this.getFund(args);
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'get_campaign':
          return this.getCampaign(args);
        case 'list_appeals':
          return this.listAppeals(args);
        case 'get_appeal':
          return this.getAppeal(args);
        case 'list_gift_types':
          return this.listGiftTypes();
        case 'get_constituent_giving_summary':
          return this.getConstituentGivingSummary(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── OAuth2 token refresh ───────────────────────────────────────────────────

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken || !this.clientId || !this.clientSecret) {
      throw new Error('Cannot refresh token: refreshToken, clientId, and clientSecret are required');
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const response = await this.fetchWithRetry('https://oauth2.sky.blackbaud.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      throw new Error(`Blackbaud token refresh failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; refresh_token?: string };
    this.accessToken = data.access_token;
    if (data.refresh_token) this.refreshToken = data.refresh_token;
  }

  // ── HTTP helpers ──────────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Bb-Api-Subscription-Key': this.subscriptionKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async bbGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';
    let response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'GET',
      headers: this.headers,
    });

    // Attempt token refresh on 401 if refresh credentials are available
    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
        method: 'GET',
        headers: this.headers,
      });
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bbPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    let response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bbPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    let response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(body),
      });
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Constituent methods ───────────────────────────────────────────────────

  private async listConstituents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 500),
    };
    if (args.offset) params['offset'] = String(args.offset);
    if (args.sort_token) params['sort_token'] = args.sort_token as string;
    if (typeof args.include_inactive === 'boolean') params['include_inactive'] = String(args.include_inactive);
    return this.bbGet('/constituent/v1/constituents', params);
  }

  private async getConstituent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.constituent_id) return { content: [{ type: 'text', text: 'constituent_id is required' }], isError: true };
    return this.bbGet(`/constituent/v1/constituents/${encodeURIComponent(args.constituent_id as string)}`);
  }

  private async createConstituent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.type) return { content: [{ type: 'text', text: 'type is required (Individual or Organization)' }], isError: true };
    const body: Record<string, unknown> = { type: args.type };
    if (args.first) body['first'] = args.first;
    if (args.last) body['last'] = args.last;
    if (args.name) body['name'] = args.name;
    if (args.lookup_id) body['lookup_id'] = args.lookup_id;
    if (args.gender) body['gender'] = args.gender;
    if (args.birthdate) body['birthdate'] = { d: parseInt((args.birthdate as string).split('-')[2]), m: parseInt((args.birthdate as string).split('-')[1]), y: parseInt((args.birthdate as string).split('-')[0]) };
    if (args.email) body['email'] = { address: args.email, type: 'Email', do_not_email: false, primary: true };
    if (args.phone) body['phone'] = { number: args.phone, type: 'Home', primary: true };
    return this.bbPost('/constituent/v1/constituents', body);
  }

  private async updateConstituent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.constituent_id) return { content: [{ type: 'text', text: 'constituent_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.first) body['first'] = args.first;
    if (args.last) body['last'] = args.last;
    if (args.gender) body['gender'] = args.gender;
    if (args.lookup_id) body['lookup_id'] = args.lookup_id;
    if (typeof args.inactive === 'boolean') body['inactive'] = args.inactive;
    if (args.birthdate) body['birthdate'] = { d: parseInt((args.birthdate as string).split('-')[2]), m: parseInt((args.birthdate as string).split('-')[1]), y: parseInt((args.birthdate as string).split('-')[0]) };
    return this.bbPatch(`/constituent/v1/constituents/${encodeURIComponent(args.constituent_id as string)}`, body);
  }

  private async searchConstituents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.search_text) return { content: [{ type: 'text', text: 'search_text is required' }], isError: true };
    const params: Record<string, string> = {
      search_text: args.search_text as string,
      limit: String((args.limit as number) || 50),
    };
    return this.bbGet('/constituent/v1/constituents/search', params);
  }

  private async listConstituentAddresses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.constituent_id) return { content: [{ type: 'text', text: 'constituent_id is required' }], isError: true };
    return this.bbGet(`/constituent/v1/constituents/${encodeURIComponent(args.constituent_id as string)}/addresses`);
  }

  private async listConstituentPhones(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.constituent_id) return { content: [{ type: 'text', text: 'constituent_id is required' }], isError: true };
    return this.bbGet(`/constituent/v1/constituents/${encodeURIComponent(args.constituent_id as string)}/phones`);
  }

  private async listConstituentEmails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.constituent_id) return { content: [{ type: 'text', text: 'constituent_id is required' }], isError: true };
    return this.bbGet(`/constituent/v1/constituents/${encodeURIComponent(args.constituent_id as string)}/emailaddresses`);
  }

  // ── Gift methods ──────────────────────────────────────────────────────────

  private async listGifts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 500),
    };
    if (args.constituent_id) params['constituent_id'] = args.constituent_id as string;
    if (args.fund_id) params['fund_id'] = args.fund_id as string;
    if (args.campaign_id) params['campaign_id'] = args.campaign_id as string;
    if (args.appeal_id) params['appeal_id'] = args.appeal_id as string;
    if (args.gift_type) params['gift_type'] = args.gift_type as string;
    if (args.date_added) params['date_added'] = args.date_added as string;
    if (args.offset) params['offset'] = String(args.offset);
    return this.bbGet('/gift/v1/gifts', params);
  }

  private async getGift(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.gift_id) return { content: [{ type: 'text', text: 'gift_id is required' }], isError: true };
    return this.bbGet(`/gift/v1/gifts/${encodeURIComponent(args.gift_id as string)}`);
  }

  private async createGift(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.constituent_id || args.amount === undefined || !args.gift_type || !args.fund_id) {
      return { content: [{ type: 'text', text: 'constituent_id, amount, gift_type, and fund_id are required' }], isError: true };
    }
    const today = new Date();
    const body: Record<string, unknown> = {
      constituent_id: args.constituent_id,
      amount: { value: args.amount },
      type: args.gift_type,
      date: args.date || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
      gift_splits: [
        {
          fund_id: args.fund_id,
          amount: { value: args.amount },
          ...(args.campaign_id ? { campaign_id: args.campaign_id } : {}),
          ...(args.appeal_id ? { appeal_id: args.appeal_id } : {}),
        },
      ],
    };
    if (args.acknowledgement_status) body['acknowledgements'] = { status: args.acknowledgement_status };
    if (args.post_status) body['post_status'] = args.post_status;
    return this.bbPost('/gift/v1/gifts', body);
  }

  private async updateGift(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.gift_id) return { content: [{ type: 'text', text: 'gift_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.amount !== undefined) body['amount'] = { value: args.amount };
    if (args.date) body['date'] = args.date;
    if (args.acknowledgement_status) body['acknowledgements'] = { status: args.acknowledgement_status };
    if (args.post_status) body['post_status'] = args.post_status;
    return this.bbPatch(`/gift/v1/gifts/${encodeURIComponent(args.gift_id as string)}`, body);
  }

  // ── Fund, Campaign, Appeal methods ───────────────────────────────────────

  private async listFunds(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 500),
    };
    if (args.offset) params['offset'] = String(args.offset);
    if (typeof args.include_inactive === 'boolean') params['include_inactive'] = String(args.include_inactive);
    return this.bbGet('/fundraising/v1/funds', params);
  }

  private async getFund(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fund_id) return { content: [{ type: 'text', text: 'fund_id is required' }], isError: true };
    return this.bbGet(`/fundraising/v1/funds/${encodeURIComponent(args.fund_id as string)}`);
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 500),
    };
    if (args.offset) params['offset'] = String(args.offset);
    if (typeof args.include_inactive === 'boolean') params['include_inactive'] = String(args.include_inactive);
    return this.bbGet('/fundraising/v1/campaigns', params);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.bbGet(`/fundraising/v1/campaigns/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async listAppeals(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 500),
    };
    if (args.offset) params['offset'] = String(args.offset);
    if (typeof args.include_inactive === 'boolean') params['include_inactive'] = String(args.include_inactive);
    return this.bbGet('/fundraising/v1/appeals', params);
  }

  private async getAppeal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.appeal_id) return { content: [{ type: 'text', text: 'appeal_id is required' }], isError: true };
    return this.bbGet(`/fundraising/v1/appeals/${encodeURIComponent(args.appeal_id as string)}`);
  }

  private async listGiftTypes(): Promise<ToolResult> {
    // Gift types in SKY API v1 are a static enum — no dedicated list endpoint exists.
    // Return the known valid values as documented in the SKY API Gift entity schema.
    const giftTypes = [
      'Donation', 'Pledge', 'PledgePayment', 'RecurringGift', 'RecurringGiftPayment',
      'GiftInKind', 'StockGiftAndProperty', 'Other', 'PlannedGift',
    ];
    return {
      content: [{ type: 'text', text: JSON.stringify({ gift_types: giftTypes }, null, 2) }],
      isError: false,
    };
  }

  private async getConstituentGivingSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.constituent_id) return { content: [{ type: 'text', text: 'constituent_id is required' }], isError: true };
    return this.bbGet(`/constituent/v1/constituents/${encodeURIComponent(args.constituent_id as string)}/givingsummary/latest`);
  }
}
