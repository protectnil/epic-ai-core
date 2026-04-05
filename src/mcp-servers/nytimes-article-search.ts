/**
 * NYTimes Article Search MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// No official vendor MCP available.
// Base URL: https://api.nytimes.com/svc/search/v2
// Auth: api-key query parameter appended to every request URL
// Docs: https://developer.nytimes.com/docs/articlesearch-product/1/overview
// Rate limits: 10 requests/minute, 4000 requests/day
// Coverage: Full-text search of NYT articles from September 18, 1851 to present

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NYTimesArticleSearchConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NYTimesArticleSearchMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NYTimesArticleSearchConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.nytimes.com/svc/search/v2';
  }

  static catalog() {
    return {
      name: 'nytimes-article-search',
      displayName: 'NYTimes Article Search',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'new york times', 'nytimes', 'nyt', 'newspaper', 'news', 'article',
        'article search', 'journalism', 'media', 'press', 'headline', 'byline',
        'news search', 'archive', 'editorial', 'reporting', 'story', 'publication',
        'full text search', 'lucene', 'facets', 'news desk', 'section',
      ],
      toolNames: [
        'search_articles',
      ],
      description: 'Search New York Times articles from September 18, 1851 to today. Returns headlines, abstracts, lead paragraphs, bylines, publication dates, multimedia links, and article metadata. Supports Lucene filter queries, date ranges, sorting, and faceted search.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_articles',
        description: 'Search New York Times articles from 1851 to today by keyword, date range, section, or any Lucene filter. Returns headlines, abstracts, lead paragraphs, bylines, publication dates, and links.',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query term. Searches article body, headline, and byline (e.g. "climate change", "Supreme Court").',
            },
            fq: {
              type: 'string',
              description: 'Filtered search query using Lucene syntax with optional field labels (e.g. \'news_desk:"Sports"\', \'section_name:"Health" AND glocations:"NEW YORK CITY"\').',
            },
            begin_date: {
              type: 'string',
              description: 'Restrict results to articles published on or after this date. Format: YYYYMMDD (e.g. "20240101").',
            },
            end_date: {
              type: 'string',
              description: 'Restrict results to articles published on or before this date. Format: YYYYMMDD (e.g. "20241231").',
            },
            sort: {
              type: 'string',
              description: 'Sort order for results. Options: "newest" or "oldest". Default: relevance to query term.',
              enum: ['newest', 'oldest'],
            },
            fl: {
              type: 'string',
              description: 'Comma-delimited list of fields to return (e.g. "headline,byline,pub_date,web_url"). Default fields: web_url, snippet, lead_paragraph, abstract, source, headline, keywords, pub_date, document_type, byline, type_of_material.',
            },
            hl: {
              type: 'boolean',
              description: 'Enable query term highlighting in headline and lead_paragraph fields (default: false).',
            },
            page: {
              type: 'integer',
              description: 'Page of results (0–10). Each page contains 10 articles. Page 0 = articles 0–9, page 1 = articles 10–19 (default: 0).',
              minimum: 0,
              maximum: 10,
            },
            facet_field: {
              type: 'string',
              description: 'Comma-delimited list of facet fields to include in the response. Valid values: section_name, document_type, type_of_material, source, day_of_week.',
            },
            facet_filter: {
              type: 'boolean',
              description: 'When true, facet counts respect applied filters (fq, date range). Requires at least one facet_field (default: false).',
            },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_articles': return this.searchArticles(args);
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

  private async searchArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ 'api-key': this.apiKey });

    if (args.q)            params.set('q',            args.q as string);
    if (args.fq)           params.set('fq',           args.fq as string);
    if (args.begin_date)   params.set('begin_date',   args.begin_date as string);
    if (args.end_date)     params.set('end_date',      args.end_date as string);
    if (args.sort)         params.set('sort',          args.sort as string);
    if (args.fl)           params.set('fl',            args.fl as string);
    if (args.hl != null)   params.set('hl',            String(args.hl));
    if (args.page != null) params.set('page',          String(args.page));
    if (args.facet_field)  params.set('facet_field',   args.facet_field as string);
    if (args.facet_filter != null) params.set('facet_filter', String(args.facet_filter));

    const url = `${this.baseUrl}/articlesearch.json?${params.toString()}`;
    const response = await this.fetchWithRetry(url, {});

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as Record<string, unknown>;

    if ((data as Record<string, unknown>).fault) {
      const fault = (data as Record<string, unknown>).fault as Record<string, unknown>;
      return {
        content: [{ type: 'text', text: `NYTimes API error: ${JSON.stringify(fault)}` }],
        isError: true,
      };
    }

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
