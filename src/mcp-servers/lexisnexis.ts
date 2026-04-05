/**
 * LexisNexis MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official LexisNexis MCP server was found on GitHub, npmjs.com, or the LexisNexis Developer Portal.
// Our adapter covers: 10 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no qualifying MCP server exists.
//
// Base URL: Enterprise-specific — provided during onboarding (e.g. https://api.lexisnexis.com).
//   The LexisNexis Web Services API (WSAPI) uses an OData-based architecture; the public developer
//   portal at dev.lexisnexis.com requires an approved enterprise account to access endpoint details.
//   Endpoint paths below (/v1/cases/search, /v1/statutes/search, etc.) are representative patterns
//   consistent with the LexisNexis search/retrieve paradigm but CANNOT be fully verified from public
//   docs — they must be validated against the customer-specific API reference provided at onboarding.
//   The WSAPI returns OData JSON responses (fields: @odata.context, @odata.count, value[]).
//   Document retrieval uses OData media link format: Documents(DocumentId='...')/$value
// Auth: OAuth2 client credentials flow (POST /oauth2/token with client_id + client_secret as Basic auth)
// Docs: https://dev.lexisnexis.com/ (public overview); full reference requires enterprise credentials
// Rate limits: Firm-wide throttling enforced server-side. Retry-After headers returned on 429.
//   Academic/research tiers impose additional per-institution query limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LexisNexisConfig {
  /** OAuth2 client ID — obtained from the LexisNexis Developer Portal onboarding. */
  clientId: string;
  /** OAuth2 client secret — obtained from the LexisNexis Developer Portal onboarding. */
  clientSecret: string;
  /**
   * Enterprise base URL — provided during onboarding.
   * Example: https://api.lexisnexis.com
   */
  baseUrl: string;
}

export class LexisNexisMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: LexisNexisConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'lexisnexis',
      displayName: 'LexisNexis',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'lexisnexis', 'legal', 'case law', 'statutes', 'regulations', 'shepards', 'citations',
        'news', 'company intelligence', 'litigation', 'legal research', 'law', 'court',
      ],
      toolNames: [
        'search_cases', 'get_case', 'search_statutes', 'get_statute',
        'search_news', 'get_news_article', 'search_company', 'get_company',
        'get_shepards_report', 'search_secondary_materials',
      ],
      description: 'Search and retrieve LexisNexis legal case law, statutes, news, company profiles, and Shepard\'s citation reports.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_cases',
        description: 'Search LexisNexis legal case law by keyword, citation, or Boolean query with optional jurisdiction and date range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query — supports natural language and Boolean operators (AND, OR, NOT).',
            },
            jurisdiction: {
              type: 'string',
              description: 'Jurisdiction filter, e.g. "US Federal", "California", "New York" (optional).',
            },
            dateFrom: {
              type: 'string',
              description: 'Earliest decision date in YYYY-MM-DD format (optional).',
            },
            dateTo: {
              type: 'string',
              description: 'Latest decision date in YYYY-MM-DD format (optional).',
            },
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 25, max: 100).' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_case',
        description: 'Retrieve the full text and metadata for a specific legal case by its LexisNexis document ID.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'LexisNexis document identifier for the case (returned by search_cases).',
            },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'search_statutes',
        description: 'Search statutes, codes, and regulations in the LexisNexis database by keyword with optional jurisdiction.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for statute or code text.',
            },
            jurisdiction: {
              type: 'string',
              description: 'Jurisdiction, e.g. "US Federal", "Texas", "New York" (optional).',
            },
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 25, max: 100).' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_statute',
        description: 'Retrieve the full text and metadata for a specific statute or regulation by its LexisNexis document ID.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'LexisNexis document identifier for the statute (returned by search_statutes).',
            },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'search_news',
        description: 'Search news articles and press releases in the LexisNexis news database with optional date range and source filters.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query for news content.' },
            dateFrom: { type: 'string', description: 'Earliest publication date in YYYY-MM-DD format (optional).' },
            dateTo: { type: 'string', description: 'Latest publication date in YYYY-MM-DD format (optional).' },
            sources: { type: 'string', description: 'Comma-separated source names to filter by (optional).' },
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 25, max: 100).' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_news_article',
        description: 'Retrieve the full text and metadata of a specific news article by its LexisNexis document ID.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'LexisNexis document identifier for the news article (returned by search_news).',
            },
          },
          required: ['documentId'],
        },
      },
      {
        name: 'search_company',
        description: 'Search LexisNexis company profiles and business intelligence data by company name with optional country filter.',
        inputSchema: {
          type: 'object',
          properties: {
            companyName: { type: 'string', description: 'Name of the company to search for.' },
            country: { type: 'string', description: 'Country of incorporation or headquarters (optional).' },
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 25, max: 100).' },
          },
          required: ['companyName'],
        },
      },
      {
        name: 'get_company',
        description: 'Retrieve full business profile and intelligence data for a company by its LexisNexis company ID.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'LexisNexis company identifier (returned by search_company).',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'get_shepards_report',
        description: "Retrieve a Shepard's Citations report for a legal citation — shows subsequent history, citing decisions, and validity signals.",
        inputSchema: {
          type: 'object',
          properties: {
            citation: {
              type: 'string',
              description: 'Legal citation to Shepardize, e.g. "410 U.S. 113".',
            },
          },
          required: ['citation'],
        },
      },
      {
        name: 'search_secondary_materials',
        description: 'Search LexisNexis secondary legal materials including law reviews, treatises, and practice guides.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query for secondary materials.' },
            jurisdiction: { type: 'string', description: 'Jurisdiction filter (optional).' },
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 25, max: 100).' },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_cases':
          return await this.searchCases(args);
        case 'get_case':
          return await this.getCase(args);
        case 'search_statutes':
          return await this.searchStatutes(args);
        case 'get_statute':
          return await this.getStatute(args);
        case 'search_news':
          return await this.searchNews(args);
        case 'get_news_article':
          return await this.getNewsArticle(args);
        case 'search_company':
          return await this.searchCompany(args);
        case 'get_company':
          return await this.getCompany(args);
        case 'get_shepards_report':
          return await this.getShepardsReport(args);
        case 'search_secondary_materials':
          return await this.searchSecondaryMaterials(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async postSearch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getDoc(path: string): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async searchCases(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body: Record<string, unknown> = {
      query: args.query,
      page: (args.page as number) ?? 1,
      pageSize: (args.pageSize as number) ?? 25,
    };
    if (args.jurisdiction) body.jurisdiction = args.jurisdiction;
    if (args.dateFrom) body.dateFrom = args.dateFrom;
    if (args.dateTo) body.dateTo = args.dateTo;
    return this.postSearch('/v1/cases/search', body);
  }

  private async getCase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.documentId) return { content: [{ type: 'text', text: 'documentId is required' }], isError: true };
    return this.getDoc(`/v1/cases/${encodeURIComponent(args.documentId as string)}`);
  }

  private async searchStatutes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body: Record<string, unknown> = {
      query: args.query,
      page: (args.page as number) ?? 1,
      pageSize: (args.pageSize as number) ?? 25,
    };
    if (args.jurisdiction) body.jurisdiction = args.jurisdiction;
    return this.postSearch('/v1/statutes/search', body);
  }

  private async getStatute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.documentId) return { content: [{ type: 'text', text: 'documentId is required' }], isError: true };
    return this.getDoc(`/v1/statutes/${encodeURIComponent(args.documentId as string)}`);
  }

  private async searchNews(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body: Record<string, unknown> = {
      query: args.query,
      page: (args.page as number) ?? 1,
      pageSize: (args.pageSize as number) ?? 25,
    };
    if (args.dateFrom) body.dateFrom = args.dateFrom;
    if (args.dateTo) body.dateTo = args.dateTo;
    if (args.sources) body.sources = args.sources;
    return this.postSearch('/v1/news/search', body);
  }

  private async getNewsArticle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.documentId) return { content: [{ type: 'text', text: 'documentId is required' }], isError: true };
    return this.getDoc(`/v1/news/${encodeURIComponent(args.documentId as string)}`);
  }

  private async searchCompany(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.companyName) return { content: [{ type: 'text', text: 'companyName is required' }], isError: true };
    const body: Record<string, unknown> = {
      companyName: args.companyName,
      page: (args.page as number) ?? 1,
      pageSize: (args.pageSize as number) ?? 25,
    };
    if (args.country) body.country = args.country;
    return this.postSearch('/v1/companies/search', body);
  }

  private async getCompany(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    return this.getDoc(`/v1/companies/${encodeURIComponent(args.companyId as string)}`);
  }

  private async getShepardsReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.citation) return { content: [{ type: 'text', text: 'citation is required' }], isError: true };
    return this.getDoc(`/v1/shepards?citation=${encodeURIComponent(args.citation as string)}`);
  }

  private async searchSecondaryMaterials(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body: Record<string, unknown> = {
      query: args.query,
      page: (args.page as number) ?? 1,
      pageSize: (args.pageSize as number) ?? 25,
    };
    if (args.jurisdiction) body.jurisdiction = args.jurisdiction;
    return this.postSearch('/v1/secondary/search', body);
  }
}
