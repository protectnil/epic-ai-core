/**
 * Owler MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.owler.com
// Auth: user_key header (API Access Key)
// Docs: https://developers.owler.com
// Spec: https://api.apis.guru/v2/specs/owler.com/1.0.0/swagger.json
// Rate limits: Varies by plan. Free tier is heavily restricted.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OwlerConfig {
  apiKey: string;
  baseUrl?: string;
}

export class OwlerMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OwlerConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.owler.com';
  }

  static catalog() {
    return {
      name: 'owler',
      displayName: 'Owler',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'owler', 'company data', 'company search', 'competitor analysis',
        'business intelligence', 'company profile', 'startup', 'funding',
        'acquisition', 'revenue', 'employee count', 'ceo', 'company news',
        'company feed', 'market intelligence', 'b2b data', 'company lookup',
      ],
      toolNames: [
        'search_companies',
        'search_companies_basic',
        'search_companies_fuzzy',
        'get_company_by_id',
        'get_company_by_url',
        'get_company_premium_by_id',
        'get_company_premium_by_url',
        'get_competitors_by_id',
        'get_competitors_by_url',
        'get_competitors_premium_by_id',
        'get_competitors_premium_by_url',
        'get_feeds_by_company_ids',
        'get_feeds_by_company_urls',
      ],
      description: 'Owler company intelligence: search companies by name, website, or ticker; retrieve full company profiles (funding, acquisitions, CEO, revenue, employee count); get competitor lists; and stream company news feeds.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Company Search ─────────────────────────────────────────────────────
      {
        name: 'search_companies',
        description: 'Search for companies by name, website, ticker, or PermID and return matching results with basic company details (up to 30 results)',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search term — company name, website domain, stock ticker, or PermID',
            },
            fields: {
              type: 'array',
              description: 'Fields to search against: name, website, ticker, permid. Searches all fields if omitted.',
              items: { type: 'string', enum: ['name', 'website', 'ticker', 'permid'] },
            },
            limit: {
              type: 'string',
              description: 'Number of results to return (default 10, max 30)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'search_companies_basic',
        description: 'Basic company search by name, website, ticker, or PermID — returns lightweight results with company_id, name, website, and HQ address',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search term',
            },
            fields: {
              type: 'array',
              description: 'Fields to search: name, website, ticker, permid',
              items: { type: 'string', enum: ['name', 'website', 'ticker', 'permid'] },
            },
            limit: {
              type: 'string',
              description: 'Number of results to return (default 10, max 30)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'search_companies_fuzzy',
        description: 'Fuzzy company search by name, address, or phone — tolerates misspellings and partial matches (up to 30 results)',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search term',
            },
            fields: {
              type: 'array',
              description: 'Fields to search: name, website, ticker, permid, address, phone (required)',
              items: { type: 'string', enum: ['name', 'website', 'ticker', 'permid', 'address', 'phone'] },
            },
            limit: {
              type: 'string',
              description: 'Number of results to return (default 10, max 30)',
            },
          },
          required: ['q', 'fields'],
        },
      },
      // ── Company Data ───────────────────────────────────────────────────────
      {
        name: 'get_company_by_id',
        description: 'Get complete company profile by Owler company ID — name, description, type, CEO, revenue, employee count, funding rounds, acquisitions, sectors, and social links',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Owler company ID (numeric string, obtained from search results)',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'get_company_by_url',
        description: 'Get complete company profile by website domain — same data as get_company_by_id but looked up via domain (e.g. "apple.com")',
        inputSchema: {
          type: 'object',
          properties: {
            website: {
              type: 'string',
              description: 'Company website domain (e.g. apple.com, microsoft.com)',
            },
          },
          required: ['website'],
        },
      },
      {
        name: 'get_company_premium_by_id',
        description: 'Get full premium company profile by company ID (requires premium API access) — includes all standard fields plus extended premium data',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Owler company ID',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'get_company_premium_by_url',
        description: 'Get full premium company profile by website domain (requires premium API access)',
        inputSchema: {
          type: 'object',
          properties: {
            website: {
              type: 'string',
              description: 'Company website domain (e.g. salesforce.com)',
            },
          },
          required: ['website'],
        },
      },
      // ── Competitor Data ────────────────────────────────────────────────────
      {
        name: 'get_competitors_by_id',
        description: 'Get the top 3 competitors for a company by Owler company ID — includes competitor name, website, logo, and profile URL',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Owler company ID',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'get_competitors_by_url',
        description: 'Get the top 3 competitors for a company by website domain',
        inputSchema: {
          type: 'object',
          properties: {
            website: {
              type: 'string',
              description: 'Company website domain (e.g. stripe.com)',
            },
          },
          required: ['website'],
        },
      },
      {
        name: 'get_competitors_premium_by_id',
        description: 'Get the full paginated competitor list for a company by ID (requires premium access — returns up to 50 competitors per page)',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'Owler company ID',
            },
            pagination_id: {
              type: 'string',
              description: 'Pagination token from previous response. Use "*" for first request.',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'get_competitors_premium_by_url',
        description: 'Get the full paginated competitor list for a company by website domain (requires premium access — returns up to 50 competitors per page)',
        inputSchema: {
          type: 'object',
          properties: {
            website: {
              type: 'string',
              description: 'Company website domain',
            },
            pagination_id: {
              type: 'string',
              description: 'Pagination token from previous response. Use "*" for first request.',
            },
          },
          required: ['website'],
        },
      },
      // ── Feeds ──────────────────────────────────────────────────────────────
      {
        name: 'get_feeds_by_company_ids',
        description: 'Get news, press releases, funding announcements, acquisitions, and blog posts for up to 150 companies by Owler company IDs',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'array',
              description: 'Array of Owler company IDs (up to 150)',
              items: { type: 'string' },
            },
            category: {
              type: 'array',
              description: 'Filter by category: NEWS, PRESS, FUNDING, ACQUISITION, PEOPLE, BLOG, VIDEOS. Returns all categories if omitted.',
              items: { type: 'string', enum: ['NEWS', 'PRESS', 'FUNDING', 'ACQUISITION', 'PEOPLE', 'BLOG', 'VIDEOS'] },
            },
            limit: {
              type: 'string',
              description: 'Number of results (default 10, max 100)',
            },
            pagination_id: {
              type: 'string',
              description: 'Pagination token from previous response (use "*" for first request)',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_feeds_by_company_urls',
        description: 'Get news, press releases, funding announcements, and other feeds for up to 10 companies by their website domains',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'array',
              description: 'Array of company website domains (up to 10, e.g. ["tesla.com", "rivian.com"])',
              items: { type: 'string' },
            },
            category: {
              type: 'array',
              description: 'Filter by category: NEWS, PRESS, FUNDING, ACQUISITION, PEOPLE, BLOG, VIDEOS',
              items: { type: 'string', enum: ['NEWS', 'PRESS', 'FUNDING', 'ACQUISITION', 'PEOPLE', 'BLOG', 'VIDEOS'] },
            },
            limit: {
              type: 'string',
              description: 'Number of results (default 10, max 100)',
            },
            pagination_id: {
              type: 'string',
              description: 'Pagination token from previous response (use "*" for first request)',
            },
          },
          required: ['domain'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_companies':              return this.searchCompanies(args);
        case 'search_companies_basic':        return this.searchCompaniesBasic(args);
        case 'search_companies_fuzzy':        return this.searchCompaniesFuzzy(args);
        case 'get_company_by_id':             return this.getCompanyById(args);
        case 'get_company_by_url':            return this.getCompanyByUrl(args);
        case 'get_company_premium_by_id':     return this.getCompanyPremiumById(args);
        case 'get_company_premium_by_url':    return this.getCompanyPremiumByUrl(args);
        case 'get_competitors_by_id':         return this.getCompetitorsById(args);
        case 'get_competitors_by_url':        return this.getCompetitorsByUrl(args);
        case 'get_competitors_premium_by_id': return this.getCompetitorsPremiumById(args);
        case 'get_competitors_premium_by_url':return this.getCompetitorsPremiumByUrl(args);
        case 'get_feeds_by_company_ids':      return this.getFeedsByCompanyIds(args);
        case 'get_feeds_by_company_urls':     return this.getFeedsByCompanyUrls(args);
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

  private async get(path: string, params: Record<string, string | string[]> = {}): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, v);
      } else {
        url.searchParams.set(key, value);
      }
    }
    const response = await this.fetchWithRetry(url.toString(), {
      headers: { user_key: this.apiKey, Accept: 'application/json' },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Owler API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Company search methods ─────────────────────────────────────────────────

  private async searchCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string | string[]> = { q: args.q as string };
    if (args.fields) params.fields = args.fields as string[];
    if (args.limit)  params.limit  = args.limit as string;
    return this.get('/v1/company/search', params);
  }

  private async searchCompaniesBasic(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string | string[]> = { q: args.q as string };
    if (args.fields) params.fields = args.fields as string[];
    if (args.limit)  params.limit  = args.limit as string;
    return this.get('/v1/company/basicsearch', params);
  }

  private async searchCompaniesFuzzy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q)      return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    if (!args.fields) return { content: [{ type: 'text', text: 'fields is required' }], isError: true };
    const params: Record<string, string | string[]> = {
      q: args.q as string,
      fields: args.fields as string[],
    };
    if (args.limit) params.limit = args.limit as string;
    return this.get('/v1/company/fuzzysearch', params);
  }

  // ── Company data methods ───────────────────────────────────────────────────

  private async getCompanyById(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    return this.get(`/v1/company/id/${encodeURIComponent(args.companyId as string)}`);
  }

  private async getCompanyByUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.website) return { content: [{ type: 'text', text: 'website is required' }], isError: true };
    return this.get(`/v1/company/url/${encodeURIComponent(args.website as string)}`);
  }

  private async getCompanyPremiumById(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    return this.get(`/v1/companypremium/id/${encodeURIComponent(args.companyId as string)}`);
  }

  private async getCompanyPremiumByUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.website) return { content: [{ type: 'text', text: 'website is required' }], isError: true };
    return this.get(`/v1/companypremium/url/${encodeURIComponent(args.website as string)}`);
  }

  // ── Competitor methods ─────────────────────────────────────────────────────

  private async getCompetitorsById(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    return this.get(`/v1/company/competitor/id/${encodeURIComponent(args.companyId as string)}`);
  }

  private async getCompetitorsByUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.website) return { content: [{ type: 'text', text: 'website is required' }], isError: true };
    return this.get(`/v1/company/competitor/url/${encodeURIComponent(args.website as string)}`);
  }

  private async getCompetitorsPremiumById(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.pagination_id) params.pagination_id = args.pagination_id as string;
    return this.get(`/v1/company/competitorpremium/id/${encodeURIComponent(args.companyId as string)}`, params);
  }

  private async getCompetitorsPremiumByUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.website) return { content: [{ type: 'text', text: 'website is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.pagination_id) params.pagination_id = args.pagination_id as string;
    return this.get(`/v1/company/competitorpremium/url/${encodeURIComponent(args.website as string)}`, params);
  }

  // ── Feed methods ───────────────────────────────────────────────────────────

  private async getFeedsByCompanyIds(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.company_id) return { content: [{ type: 'text', text: 'company_id is required' }], isError: true };
    const params: Record<string, string | string[]> = { company_id: args.company_id as string[] };
    if (args.category)     params.category     = args.category as string[];
    if (args.limit)        params.limit        = args.limit as string;
    if (args.pagination_id)params.pagination_id= args.pagination_id as string;
    return this.get('/v1/feed', params);
  }

  private async getFeedsByCompanyUrls(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const params: Record<string, string | string[]> = { domain: args.domain as string[] };
    if (args.category)     params.category     = args.category as string[];
    if (args.limit)        params.limit        = args.limit as string;
    if (args.pagination_id)params.pagination_id= args.pagination_id as string;
    return this.get('/v1/feed/url', params);
  }
}
