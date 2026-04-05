/**
 * ZoomInfo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP (data): https://www.zoominfo.com/solutions/zoominfo-mcp — ZoomInfo's partner
//   data-access MCP server; transport: HTTP (remote hosted); auth: OAuth 2.0 Dynamic Client
//   Registration (requires ZoomInfo partner program enrollment). Tools include search_contacts,
//   enrich_contacts, search_companies, enrich_companies, find_similar_companies, and more.
//   Not publicly documented as a self-hostable server — available to ZoomInfo partner accounts.
// Note: https://docs.zoominfo.com/mcp is a separate documentation/code-gen MCP (not data access).
// Our adapter covers: 10 tools (search, enrich, intent, news, compliance, technographics).
// Vendor MCP covers: full GTM data surface (search, enrich, intent, lookalike) for partner OAuth2.
// Recommendation: Use vendor partner MCP for OAuth2 partner deployments. Use this adapter for
//   username/password JWT deployments and air-gapped environments.
//
// IMPORTANT: This adapter implements the ZoomInfo Legacy Enterprise API (api-docs.zoominfo.com).
//   The legacy API is currently in the process of being deprecated by ZoomInfo. New development
//   should target the new GTM API at https://api.zoominfo.com/gtm (OAuth2, new endpoint paths).
//   This adapter remains valid for existing username/password integrations until deprecation.
//
// Base URL: https://api.zoominfo.com  (legacy API; new GTM API base: https://api.zoominfo.com/gtm)
// Auth: POST /authenticate with username + password → JWT (60-min TTL, refresh at 55 min)
//   (Legacy auth method. New API uses OAuth2 client credentials.)
// Docs: https://api-docs.zoominfo.com/ (legacy)
//       https://docs.zoominfo.com/docs/general-overview (new GTM API)
// Rate limits: 1,500 requests/min across standard Enrich endpoints; 25 records per enrich call

import { AdapterCatalogEntry } from '../federation/AdapterCatalog.js';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ZoomInfoConfig {
  username: string;
  password: string;
  /** Base URL override. Defaults to https://api.zoominfo.com */
  baseUrl?: string;
}

export class ZoomInfoMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private jwtToken: string | null = null;
  private jwtExpiresAt: number = 0;

  constructor(config: ZoomInfoConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl ?? 'https://api.zoominfo.com';
  }

  static catalog(): AdapterCatalogEntry {
    return {
      name: 'zoominfo',
      displayName: 'ZoomInfo',
      version: '1.0.0',
      category: 'crm',
      keywords: [
        'zoominfo', 'b2b', 'contact', 'enrich', 'enrichment', 'company', 'firmographic',
        'intent', 'buying signal', 'technographic', 'scoop', 'news', 'websights',
        'prospecting', 'lead', 'sales intelligence', 'data enrichment', 'compliance',
      ],
      toolNames: [
        'search_contacts', 'enrich_contact', 'search_companies', 'enrich_company',
        'get_intent_signals', 'enrich_intent', 'search_scoops', 'get_company_news',
        'get_technographics', 'manage_compliance',
      ],
      description: 'B2B sales intelligence: search and enrich contacts and companies with firmographic, technographic, intent, and news data from ZoomInfo.',
      author: 'protectnil',
    };
  }

  /**
   * Authenticates via POST /authenticate and caches the JWT for 55 minutes.
   * ZoomInfo JWTs expire after 60 minutes; we refresh 5 minutes early to avoid races.
   */
  private async getJwt(): Promise<string> {
    if (this.jwtToken && Date.now() < this.jwtExpiresAt) {
      return this.jwtToken;
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });

    if (!response.ok) {
      throw new Error(`ZoomInfo authentication failed: HTTP ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`ZoomInfo /authenticate returned non-JSON (HTTP ${response.status})`);
    }

    const jwt = (data as Record<string, unknown>).jwt as string | undefined;
    if (!jwt) {
      throw new Error('ZoomInfo /authenticate response did not include a jwt field');
    }

    this.jwtToken = jwt;
    this.jwtExpiresAt = Date.now() + 55 * 60 * 1000;
    return jwt;
  }

  /** Build authorized headers for all API calls. */
  private authHeaders(jwt: string): Record<string, string> {
    return {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_contacts',
        description: 'Search ZoomInfo for contacts using firmographic and demographic filters. Returns professional profiles including job title, company, location, and management level.',
        inputSchema: {
          type: 'object',
          properties: {
            matchPersonInput: {
              type: 'array',
              description: 'Array of person match criteria objects (firstName, lastName, companyName, emailAddress).',
            },
            jobTitle: {
              type: 'array',
              description: 'Job titles to filter by (e.g. ["VP of Sales", "CTO"]).',
            },
            managementLevel: {
              type: 'array',
              description: 'Management levels to filter by: C-Level, VP, Director, Manager, Individual Contributor.',
            },
            companyIndustry: {
              type: 'array',
              description: 'Industries to filter by (e.g. ["Software", "Financial Services"]).',
            },
            companyMinEmployees: {
              type: 'number',
              description: 'Minimum employee count at the contact\'s company.',
            },
            companyMaxEmployees: {
              type: 'number',
              description: 'Maximum employee count at the contact\'s company.',
            },
            rpp: {
              type: 'number',
              description: 'Results per page (default: 25, max: 25).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
        },
      },
      {
        name: 'enrich_contact',
        description: 'Enrich up to 25 contact records by email or name+company, returning verified professional data including direct dial, LinkedIn, and job history.',
        inputSchema: {
          type: 'object',
          properties: {
            matchPersonInput: {
              type: 'array',
              description: 'Array of person identifiers to enrich (emailAddress or firstName+lastName+companyName). Up to 25 records per call.',
            },
            outputFields: {
              type: 'array',
              description: 'Specific fields to return, e.g. ["firstName","lastName","jobTitle","email","phone","linkedInUrl"].',
            },
          },
          required: ['matchPersonInput'],
        },
      },
      {
        name: 'search_companies',
        description: 'Search ZoomInfo for companies using industry, location, employee count, revenue, and company type filters.',
        inputSchema: {
          type: 'object',
          properties: {
            companyName: {
              type: 'string',
              description: 'Company name to search for (partial match supported).',
            },
            companyIndustry: {
              type: 'array',
              description: 'Industries to filter by (e.g. ["Technology", "Healthcare"]).',
            },
            companyCountry: {
              type: 'string',
              description: 'HQ country (e.g. "United States", "United Kingdom").',
            },
            companyMinEmployees: {
              type: 'number',
              description: 'Minimum employee count.',
            },
            companyMaxEmployees: {
              type: 'number',
              description: 'Maximum employee count.',
            },
            companyMinRevenue: {
              type: 'number',
              description: 'Minimum annual revenue in USD.',
            },
            companyMaxRevenue: {
              type: 'number',
              description: 'Maximum annual revenue in USD.',
            },
            companyType: {
              type: 'string',
              description: 'Company type: Private, Public, Government, Non-Profit.',
            },
            rpp: {
              type: 'number',
              description: 'Results per page (default: 25, max: 25).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
        },
      },
      {
        name: 'enrich_company',
        description: 'Enrich up to 25 company records by name or domain, returning firmographic data including employee count, revenue, industry, and technographics.',
        inputSchema: {
          type: 'object',
          properties: {
            matchCompanyInput: {
              type: 'array',
              description: 'Array of company identifiers to enrich (companyName or companyWebsite). Up to 25 records per call.',
            },
            outputFields: {
              type: 'array',
              description: 'Specific fields to return, e.g. ["companyName","website","employeeCount","revenue","industry"].',
            },
          },
          required: ['matchCompanyInput'],
        },
      },
      {
        name: 'get_intent_signals',
        description: 'Search for companies showing buying intent signals for specified topics. Requires Intent data add-on. Returns companies actively researching given subjects.',
        inputSchema: {
          type: 'object',
          properties: {
            topics: {
              type: 'array',
              description: 'Intent topics to filter by (e.g. ["CRM Software", "Cloud Security", "Sales Automation"]).',
            },
            companyIndustry: {
              type: 'array',
              description: 'Industries to filter by.',
            },
            companyMinEmployees: {
              type: 'number',
              description: 'Minimum employee count.',
            },
            companyMaxEmployees: {
              type: 'number',
              description: 'Maximum employee count.',
            },
            rpp: {
              type: 'number',
              description: 'Results per page (default: 25).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
          required: ['topics'],
        },
      },
      {
        name: 'enrich_intent',
        description: 'Retrieve intent signals for a specific company by name or domain, returning the topics they are actively researching and recommended contacts.',
        inputSchema: {
          type: 'object',
          properties: {
            companyName: {
              type: 'string',
              description: 'Company name to get intent data for.',
            },
            companyWebsite: {
              type: 'string',
              description: 'Company website domain (e.g. "salesforce.com").',
            },
          },
        },
      },
      {
        name: 'search_scoops',
        description: 'Search for ZoomInfo Scoops — actionable business intelligence events such as leadership changes, funding rounds, expansions, and tech initiatives at target companies.',
        inputSchema: {
          type: 'object',
          properties: {
            companyName: {
              type: 'string',
              description: 'Company name to search scoops for.',
            },
            companyIndustry: {
              type: 'array',
              description: 'Industries to filter by.',
            },
            scoopTopics: {
              type: 'array',
              description: 'Scoop topic categories to filter by (e.g. ["Leadership Change", "Funding", "Expansion"]).',
            },
            rpp: {
              type: 'number',
              description: 'Results per page (default: 25).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
        },
      },
      {
        name: 'get_company_news',
        description: 'Retrieve recent news articles and press releases for a company from ZoomInfo\'s news feed.',
        inputSchema: {
          type: 'object',
          properties: {
            companyName: {
              type: 'string',
              description: 'Company name to fetch news for.',
            },
            companyWebsite: {
              type: 'string',
              description: 'Company website domain (e.g. "microsoft.com").',
            },
            rpp: {
              type: 'number',
              description: 'Results per page (default: 25).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
        },
      },
      {
        name: 'get_technographics',
        description: 'Retrieve technology stack data for a company, showing which software and infrastructure products they use. Requires Technographics add-on.',
        inputSchema: {
          type: 'object',
          properties: {
            matchCompanyInput: {
              type: 'array',
              description: 'Array of company identifiers (companyName or companyWebsite) to get technographic data for.',
            },
            outputFields: {
              type: 'array',
              description: 'Specific technographic fields to return (e.g. ["techProducts","techCategories"]).',
            },
          },
          required: ['matchCompanyInput'],
        },
      },
      {
        name: 'manage_compliance',
        description: 'Check or submit GDPR/CCPA opt-out compliance requests for a contact email address. Use to suppress contacts or verify opt-out status.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'Action to perform: check (verify opt-out status) or suppress (submit opt-out request).',
            },
            emailAddress: {
              type: 'string',
              description: 'Contact email address to check or suppress.',
            },
          },
          required: ['action', 'emailAddress'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const jwt = await this.getJwt();
      const headers = this.authHeaders(jwt);

      switch (name) {
        case 'search_contacts':
          return await this.searchContacts(args, headers);
        case 'enrich_contact':
          return await this.enrichContact(args, headers);
        case 'search_companies':
          return await this.searchCompanies(args, headers);
        case 'enrich_company':
          return await this.enrichCompany(args, headers);
        case 'get_intent_signals':
          return await this.getIntentSignals(args, headers);
        case 'enrich_intent':
          return await this.enrichIntent(args, headers);
        case 'search_scoops':
          return await this.searchScoops(args, headers);
        case 'get_company_news':
          return await this.getCompanyNews(args, headers);
        case 'get_technographics':
          return await this.getTechnographics(args, headers);
        case 'manage_compliance':
          return await this.manageCompliance(args, headers);
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

  private async searchContacts(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.matchPersonInput) body.matchPersonInput = args.matchPersonInput;
    if (args.jobTitle) body.jobTitle = args.jobTitle;
    if (args.managementLevel) body.managementLevel = args.managementLevel;
    if (args.companyIndustry) body.companyIndustry = args.companyIndustry;
    if (args.companyMinEmployees !== undefined) body.companyMinEmployees = args.companyMinEmployees;
    if (args.companyMaxEmployees !== undefined) body.companyMaxEmployees = args.companyMaxEmployees;
    body.rpp = (args.rpp as number) ?? 25;
    body.page = (args.page as number) ?? 1;

    const response = await this.fetchWithRetry(`${this.baseUrl}/search/contact`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to search contacts: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async enrichContact(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.matchPersonInput) {
      return { content: [{ type: 'text', text: 'matchPersonInput is required' }], isError: true };
    }

    const body: Record<string, unknown> = { matchPersonInput: args.matchPersonInput };
    if (args.outputFields) body.outputFields = args.outputFields;

    const response = await this.fetchWithRetry(`${this.baseUrl}/enrich/contact`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to enrich contact: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchCompanies(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.companyName) body.companyName = args.companyName;
    if (args.companyIndustry) body.companyIndustry = args.companyIndustry;
    if (args.companyCountry) body.companyCountry = args.companyCountry;
    if (args.companyMinEmployees !== undefined) body.companyMinEmployees = args.companyMinEmployees;
    if (args.companyMaxEmployees !== undefined) body.companyMaxEmployees = args.companyMaxEmployees;
    if (args.companyMinRevenue !== undefined) body.companyMinRevenue = args.companyMinRevenue;
    if (args.companyMaxRevenue !== undefined) body.companyMaxRevenue = args.companyMaxRevenue;
    if (args.companyType) body.companyType = args.companyType;
    body.rpp = (args.rpp as number) ?? 25;
    body.page = (args.page as number) ?? 1;

    const response = await this.fetchWithRetry(`${this.baseUrl}/search/company`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to search companies: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async enrichCompany(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.matchCompanyInput) {
      return { content: [{ type: 'text', text: 'matchCompanyInput is required' }], isError: true };
    }

    const body: Record<string, unknown> = { matchCompanyInput: args.matchCompanyInput };
    if (args.outputFields) body.outputFields = args.outputFields;

    const response = await this.fetchWithRetry(`${this.baseUrl}/enrich/company`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to enrich company: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getIntentSignals(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.topics || (args.topics as unknown[]).length === 0) {
      return { content: [{ type: 'text', text: 'topics is required and must be a non-empty array' }], isError: true };
    }

    const body: Record<string, unknown> = { topics: args.topics };
    if (args.companyIndustry) body.companyIndustry = args.companyIndustry;
    if (args.companyMinEmployees !== undefined) body.companyMinEmployees = args.companyMinEmployees;
    if (args.companyMaxEmployees !== undefined) body.companyMaxEmployees = args.companyMaxEmployees;
    body.rpp = (args.rpp as number) ?? 25;
    body.page = (args.page as number) ?? 1;

    const response = await this.fetchWithRetry(`${this.baseUrl}/search/intent`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get intent signals: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async enrichIntent(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.companyName) body.companyName = args.companyName;
    if (args.companyWebsite) body.companyWebsite = args.companyWebsite;

    if (!body.companyName && !body.companyWebsite) {
      return { content: [{ type: 'text', text: 'companyName or companyWebsite is required' }], isError: true };
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/enrich/intent`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to enrich intent: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchScoops(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.companyName) body.companyName = args.companyName;
    if (args.companyIndustry) body.companyIndustry = args.companyIndustry;
    if (args.scoopTopics) body.scoopTopics = args.scoopTopics;
    body.rpp = (args.rpp as number) ?? 25;
    body.page = (args.page as number) ?? 1;

    const response = await this.fetchWithRetry(`${this.baseUrl}/search/scoop`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to search scoops: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCompanyNews(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.companyName) body.companyName = args.companyName;
    if (args.companyWebsite) body.companyWebsite = args.companyWebsite;

    if (!body.companyName && !body.companyWebsite) {
      return { content: [{ type: 'text', text: 'companyName or companyWebsite is required' }], isError: true };
    }

    body.rpp = (args.rpp as number) ?? 25;
    body.page = (args.page as number) ?? 1;

    const response = await this.fetchWithRetry(`${this.baseUrl}/search/news`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get company news: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getTechnographics(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    if (!args.matchCompanyInput) {
      return { content: [{ type: 'text', text: 'matchCompanyInput is required' }], isError: true };
    }

    const body: Record<string, unknown> = { matchCompanyInput: args.matchCompanyInput };
    if (args.outputFields) body.outputFields = args.outputFields;

    const response = await this.fetchWithRetry(`${this.baseUrl}/enrich/technographics`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Failed to get technographics: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ZoomInfo returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async manageCompliance(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const action = args.action as string;
    const emailAddress = args.emailAddress as string;

    if (!action || !emailAddress) {
      return { content: [{ type: 'text', text: 'action and emailAddress are required' }], isError: true };
    }

    if (action !== 'check' && action !== 'suppress') {
      return { content: [{ type: 'text', text: 'action must be "check" or "suppress"' }], isError: true };
    }

    const method = action === 'suppress' ? 'POST' : 'GET';
    const url = action === 'suppress'
      ? `${this.baseUrl}/compliance/optout`
      : `${this.baseUrl}/compliance/optout?emailAddress=${encodeURIComponent(emailAddress)}`;

    const fetchOptions: RequestInit = { method, headers };
    if (action === 'suppress') {
      fetchOptions.body = JSON.stringify({ emailAddress });
    }

    const response = await this.fetchWithRetry(url, fetchOptions);

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Compliance ${action} failed: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { data = { status: 'ok' }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
