/**
 * NewsAPI Global News Aggregation MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official NewsAPI MCP server was found on GitHub or npm.
//
// Base URL: https://newsapi.org/v2
// Auth: API key via X-Api-Key header (recommended) or apiKey query parameter
// Docs: https://newsapi.org/docs
// Rate limits: Developer (free) plan — 100 requests/day, articles delayed 24 hours, dev-only use.
//              Paid plans: higher limits, real-time articles, production use.
//              Top-headlines max 100 results/request; everything endpoint max 100 results/request.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NewsAPIConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NewsAPIMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NewsAPIConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://newsapi.org/v2';
  }

  static catalog() {
    return {
      name: 'newsapi',
      displayName: 'NewsAPI',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'newsapi', 'news', 'headlines', 'articles', 'journalism', 'media', 'press',
        'breaking news', 'global news', 'rss', 'aggregation', 'sources', 'publisher',
      ],
      toolNames: [
        'get_top_headlines',
        'search_articles',
        'list_sources',
      ],
      description: 'NewsAPI global news aggregation: fetch top headlines by country and category, search historical articles by keyword and source, and list available news publishers.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_top_headlines',
        description: 'Fetch live top headlines by country, category, or source with optional keyword search',
        inputSchema: {
          type: 'object',
          properties: {
            country: {
              type: 'string',
              description: 'Two-letter ISO 3166-1 country code to filter headlines (e.g. us, gb, de, fr, au). Cannot be combined with sources.',
            },
            category: {
              type: 'string',
              description: 'News category: business, entertainment, general, health, science, sports, technology. Cannot be combined with sources.',
            },
            sources: {
              type: 'string',
              description: 'Comma-separated source IDs to filter by (e.g. bbc-news,cnn). Cannot be combined with country or category.',
            },
            q: {
              type: 'string',
              description: 'Keywords to search for within headline and description',
            },
            page_size: {
              type: 'number',
              description: 'Number of articles per page (default: 20, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'search_articles',
        description: 'Search all news articles by keyword with optional source, language, date range, and sort order filters',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Keywords or phrases to search. Supports AND, OR, NOT operators and exact phrases in quotes.',
            },
            sources: {
              type: 'string',
              description: 'Comma-separated source IDs to restrict search to (e.g. bbc-news,reuters)',
            },
            domains: {
              type: 'string',
              description: 'Comma-separated domains to restrict search to (e.g. bbc.co.uk,techcrunch.com)',
            },
            exclude_domains: {
              type: 'string',
              description: 'Comma-separated domains to exclude from results',
            },
            from: {
              type: 'string',
              description: 'Oldest article date in ISO 8601 format (e.g. 2026-01-01 or 2026-01-01T00:00:00)',
            },
            to: {
              type: 'string',
              description: 'Newest article date in ISO 8601 format (e.g. 2026-03-24)',
            },
            language: {
              type: 'string',
              description: 'Two-letter language code: ar, de, en, es, fr, he, it, nl, no, pt, ru, sv, ud, zh (default: all)',
            },
            sort_by: {
              type: 'string',
              description: 'Sort order: relevancy (most relevant first), popularity (most popular sources first), publishedAt (newest first, default)',
            },
            page_size: {
              type: 'number',
              description: 'Number of articles per page (default: 100, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'list_sources',
        description: 'List available news sources and publishers filterable by category, language, and country',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter sources by category: business, entertainment, general, health, science, sports, technology',
            },
            language: {
              type: 'string',
              description: 'Filter sources by language code: ar, de, en, es, fr, he, it, nl, no, pt, ru, sv, ud, zh',
            },
            country: {
              type: 'string',
              description: 'Filter sources by two-letter country code (e.g. us, gb, de)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_top_headlines':
          return this.getTopHeadlines(args);
        case 'search_articles':
          return this.searchArticles(args);
        case 'list_sources':
          return this.listSources(args);
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
      'X-Api-Key': this.apiKey,
      'Accept': 'application/json',
    };
  }

  private async newsGet(path: string, params: Record<string, string>): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as { status?: string; code?: string; message?: string };
    if (data.status === 'error') {
      return {
        content: [{ type: 'text', text: `NewsAPI error [${data.code}]: ${data.message}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getTopHeadlines(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.country) params.country = args.country as string;
    if (args.category) params.category = args.category as string;
    if (args.sources) params.sources = args.sources as string;
    if (args.q) params.q = args.q as string;
    params.pageSize = String((args.page_size as number) || 20);
    params.page = String((args.page as number) || 1);
    return this.newsGet('/top-headlines', params);
  }

  private async searchArticles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q (search query) is required' }], isError: true };
    const params: Record<string, string> = { q: args.q as string };
    if (args.sources) params.sources = args.sources as string;
    if (args.domains) params.domains = args.domains as string;
    if (args.exclude_domains) params.excludeDomains = args.exclude_domains as string;
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    if (args.language) params.language = args.language as string;
    if (args.sort_by) params.sortBy = args.sort_by as string;
    params.pageSize = String((args.page_size as number) || 20);
    params.page = String((args.page as number) || 1);
    return this.newsGet('/everything', params);
  }

  private async listSources(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.category) params.category = args.category as string;
    if (args.language) params.language = args.language as string;
    if (args.country) params.country = args.country as string;
    return this.newsGet('/top-headlines/sources', params);
  }
}
