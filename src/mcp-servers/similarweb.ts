/**
 * Similarweb MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.similarweb.com/ — transport: streamable-HTTP (vendor-hosted), auth: api-key header
// Our adapter covers: 12 tools (REST API v1 website traffic operations). Vendor MCP covers: 10+ tools
//   (Traffic and Engagement, Traffic Sources, Website Rank, Subdomains, Deduplicated Audience, Leading Folders,
//   Popular Pages, PPC Spend, SERP Players, SERP Clicks, plus app metrics).
// Recommendation: use-both — vendor MCP (https://mcp.similarweb.com/) exposes app metrics and SERP tools
//   not in our REST adapter; our REST adapter exposes global-rank, country-rank, category-rank, referrals,
//   organic-search-keywords, paid-search-keywords, top-sites endpoints not confirmed in vendor MCP.
//   Use vendor MCP for primary integration; use this adapter for air-gapped deployments and REST-only tools.
//   MCP-sourced tools (confirmed): Traffic and Engagement, Traffic Sources, Website Rank, Subdomains,
//   Deduplicated Audience, Leading Folders, Popular Pages, PPC Spend, SERP Players, SERP Clicks.
//   REST-sourced tools (12): get_total_visits, get_desktop_visits, get_mobile_visits, get_global_rank,
//   get_country_rank, get_category_rank, get_traffic_sources, get_referrals, get_organic_search_keywords,
//   get_paid_search_keywords, get_audience_geography, get_top_sites.
//
// Base URL: https://api.similarweb.com/v1
// Auth: REST API v1 — api_key as query parameter (api_key=YOUR_KEY). Vendor MCP uses api-key HTTP header.
// Docs: https://developers.similarweb.com/docs/similarweb-web-traffic-api
// Rate limits: 10 requests/second. Returns HTTP 429 when exceeded. Enterprise customers
//              may negotiate higher limits with their account manager.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SimilarwebConfig {
  apiKey: string;
  baseUrl?: string;
}

export class SimilarwebMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SimilarwebConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.similarweb.com/v1';
  }

  static catalog() {
    return {
      name: 'similarweb',
      displayName: 'Similarweb',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'similarweb', 'traffic', 'web analytics', 'competitor', 'ranking', 'visit', 'audience',
        'engagement', 'bounce rate', 'referral', 'keyword', 'market intelligence', 'digital',
      ],
      toolNames: [
        'get_total_visits', 'get_desktop_visits', 'get_mobile_visits',
        'get_global_rank', 'get_country_rank', 'get_category_rank',
        'get_traffic_sources', 'get_referrals', 'get_organic_search_keywords',
        'get_paid_search_keywords', 'get_audience_geography', 'get_top_sites',
      ],
      description: 'Similarweb digital intelligence: website traffic estimates, global rankings, audience geography, traffic sources, referrals, and keyword analytics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_total_visits',
        description: 'Get total estimated monthly visits (desktop + mobile) for a website with historical trend data',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to analyze (e.g. example.com, without https://)',
            },
            start_date: {
              type: 'string',
              description: 'Start month for data in YYYY-MM format (e.g. 2024-01)',
            },
            end_date: {
              type: 'string',
              description: 'End month for data in YYYY-MM format (e.g. 2024-06)',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code to filter data (e.g. us, gb, de — default: worldwide)',
            },
            granularity: {
              type: 'string',
              description: 'Data granularity: monthly or weekly (default: monthly)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_desktop_visits',
        description: 'Get estimated desktop-only monthly visits for a website with trend data',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to analyze (e.g. example.com)',
            },
            start_date: {
              type: 'string',
              description: 'Start month in YYYY-MM format',
            },
            end_date: {
              type: 'string',
              description: 'End month in YYYY-MM format',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: worldwide)',
            },
            granularity: {
              type: 'string',
              description: 'Data granularity: monthly or weekly (default: monthly)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_mobile_visits',
        description: 'Get estimated mobile web-only monthly visits for a website with trend data',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to analyze (e.g. example.com)',
            },
            start_date: {
              type: 'string',
              description: 'Start month in YYYY-MM format',
            },
            end_date: {
              type: 'string',
              description: 'End month in YYYY-MM format',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: worldwide)',
            },
            granularity: {
              type: 'string',
              description: 'Data granularity: monthly or weekly (default: monthly)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_global_rank',
        description: 'Get the global Similarweb ranking for a website (position by total visits worldwide)',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to get global rank for',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_country_rank',
        description: 'Get country-specific traffic rankings for a website across all countries',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to get country rankings for',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_category_rank',
        description: 'Get the website\'s ranking within its primary category (e.g. Business & Industry, News & Media)',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to get category rank for',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_traffic_sources',
        description: 'Get traffic source breakdown for a website: direct, referrals, search, social, mail, display ads',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to analyze traffic sources for',
            },
            start_date: {
              type: 'string',
              description: 'Start month in YYYY-MM format',
            },
            end_date: {
              type: 'string',
              description: 'End month in YYYY-MM format',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: worldwide)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_referrals',
        description: 'Get the top referring websites (domains) sending traffic to a target website',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to get referring sites for',
            },
            start_date: {
              type: 'string',
              description: 'Start month in YYYY-MM format',
            },
            end_date: {
              type: 'string',
              description: 'End month in YYYY-MM format',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: worldwide)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of referring domains to return (default: 10, max: 50)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_organic_search_keywords',
        description: 'Get top organic search keywords driving traffic to a website with traffic share estimates',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to get organic keywords for',
            },
            start_date: {
              type: 'string',
              description: 'Start month in YYYY-MM format',
            },
            end_date: {
              type: 'string',
              description: 'End month in YYYY-MM format',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: worldwide)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of keywords to return (default: 10, max: 50)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_paid_search_keywords',
        description: 'Get top paid search (PPC) keywords driving traffic to a website',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to get paid search keywords for',
            },
            start_date: {
              type: 'string',
              description: 'Start month in YYYY-MM format',
            },
            end_date: {
              type: 'string',
              description: 'End month in YYYY-MM format',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: worldwide)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of keywords (default: 10, max: 50)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_audience_geography',
        description: 'Get the geographic distribution of a website\'s visitors by country with traffic share percentages',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to get geographic breakdown for',
            },
            start_date: {
              type: 'string',
              description: 'Start month in YYYY-MM format',
            },
            end_date: {
              type: 'string',
              description: 'End month in YYYY-MM format',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_top_sites',
        description: 'Get the top-ranked websites globally or by category based on Similarweb traffic data',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Category slug to filter top sites (e.g. "computers_electronics_and_technology" — optional for global top)',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code to get top sites for a specific country (optional)',
            },
            limit: {
              type: 'number',
              description: 'Number of top sites to return (default: 10, max: 50)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_total_visits':
          return this.getTotalVisits(args);
        case 'get_desktop_visits':
          return this.getDesktopVisits(args);
        case 'get_mobile_visits':
          return this.getMobileVisits(args);
        case 'get_global_rank':
          return this.getGlobalRank(args);
        case 'get_country_rank':
          return this.getCountryRank(args);
        case 'get_category_rank':
          return this.getCategoryRank(args);
        case 'get_traffic_sources':
          return this.getTrafficSources(args);
        case 'get_referrals':
          return this.getReferrals(args);
        case 'get_organic_search_keywords':
          return this.getOrganicSearchKeywords(args);
        case 'get_paid_search_keywords':
          return this.getPaidSearchKeywords(args);
        case 'get_audience_geography':
          return this.getAudienceGeography(args);
        case 'get_top_sites':
          return this.getTopSites(args);
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

  private async swGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const allParams = { ...params, api_key: this.apiKey };
    const qs = new URLSearchParams(allParams).toString();
    const url = `${this.baseUrl}${path}?${qs}`;
    const response = await this.fetchWithRetry(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildTrafficParams(args: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {};
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    if (args.country) params.country = args.country as string;
    if (args.granularity) params.granularity = args.granularity as string;
    return params;
  }

  private async getTotalVisits(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.swGet(`/website/${encodeURIComponent(args.domain as string)}/total-traffic-and-engagement/visits`, this.buildTrafficParams(args));
  }

  private async getDesktopVisits(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.swGet(`/website/${encodeURIComponent(args.domain as string)}/traffic-and-engagement/visits`, this.buildTrafficParams(args));
  }

  private async getMobileVisits(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.swGet(`/website/${encodeURIComponent(args.domain as string)}/mobile-web/visits`, this.buildTrafficParams(args));
  }

  private async getGlobalRank(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.swGet(`/website/${encodeURIComponent(args.domain as string)}/global-rank/global-rank`);
  }

  private async getCountryRank(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.swGet(`/website/${encodeURIComponent(args.domain as string)}/geo/traffic-by-country`);
  }

  private async getCategoryRank(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.swGet(`/website/${encodeURIComponent(args.domain as string)}/category-rank/category-rank`);
  }

  private async getTrafficSources(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.swGet(`/website/${encodeURIComponent(args.domain as string)}/traffic-sources/overview-share`, this.buildTrafficParams(args));
  }

  private async getReferrals(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const params = { ...this.buildTrafficParams(args), limit: String((args.limit as number) || 10) };
    return this.swGet(`/website/${encodeURIComponent(args.domain as string)}/traffic-sources/referrals`, params);
  }

  private async getOrganicSearchKeywords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const params = { ...this.buildTrafficParams(args), limit: String((args.limit as number) || 10) };
    return this.swGet(`/website/${encodeURIComponent(args.domain as string)}/search-keywords/organic-search-keywords`, params);
  }

  private async getPaidSearchKeywords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const params = { ...this.buildTrafficParams(args), limit: String((args.limit as number) || 10) };
    return this.swGet(`/website/${encodeURIComponent(args.domain as string)}/search-keywords/paid-search-keywords`, params);
  }

  private async getAudienceGeography(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    return this.swGet(`/website/${encodeURIComponent(args.domain as string)}/geo/traffic-by-country`, params);
  }

  private async getTopSites(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 10),
    };
    if (args.country) params.country = args.country as string;
    if (args.category) params.category = args.category as string;
    return this.swGet('/website/topsite', params);
  }
}
