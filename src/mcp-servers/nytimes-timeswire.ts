/**
 * NYTimes Times Newswire MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official NYTimes Times Newswire MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 3 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.nytimes.com/svc/news/v3
// Auth: api-key query parameter appended to every request URL
// Docs: https://developer.nytimes.com/docs/timeswire-product/1/overview
// Spec: https://api.apis.guru/v2/specs/nytimes.com/timeswire/3.0.0/openapi.json
// Rate limits: 500 requests/day, 5 requests/minute

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NytimesTimeswireConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NytimesTimeswireMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NytimesTimeswireConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.nytimes.com/svc/news/v3';
  }

  static catalog() {
    return {
      name: 'nytimes-timeswire',
      displayName: 'NYTimes Times Newswire',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'nytimes', 'new york times', 'nyt', 'newswire', 'times wire', 'timeswire',
        'live news', 'real-time news', 'breaking news', 'news feed', 'wire service',
        'articles', 'media', 'journalism', 'press', 'iht', 'international herald tribune',
        'news stream', 'published items', 'content feed', 'section news',
      ],
      toolNames: [
        'get_newswire_by_section',
        'get_newswire_by_time_period',
        'get_newswire_article',
      ],
      description: 'New York Times Times Newswire API: get links and metadata for NYT and International NYT articles and blog posts as soon as they are published, filterable by source, section, and recency (up to 24 hours). Also supports fetching metadata for a specific article by URL.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_newswire_by_section',
        description: 'Get the latest New York Times newswire articles for a given source and section, with optional result limit and pagination offset',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'Originating source to filter by: "all" (both NYT and International NYT), "nyt" (New York Times only), or "iht" (International New York Times only)',
              enum: ['all', 'nyt', 'iht'],
            },
            section: {
              type: 'string',
              description: 'Section name to filter by, or "all" for all sections. Use section names from the NYT section list (e.g. Arts, Business, Health, Opinion, Sports, Technology, U.S., World).',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return, between 1 and 20 (default: 20)',
            },
            offset: {
              type: 'integer',
              description: 'Number of results to skip for pagination (default: 0)',
            },
          },
          required: ['source', 'section'],
        },
      },
      {
        name: 'get_newswire_by_time_period',
        description: 'Get New York Times newswire articles published within a recent time window (1–24 hours ago) for a given source and section',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'Originating source to filter by: "all" (both NYT and International NYT), "nyt" (New York Times only), or "iht" (International New York Times only)',
              enum: ['all', 'nyt', 'iht'],
            },
            section: {
              type: 'string',
              description: 'Section name to filter by, or "all" for all sections.',
            },
            time_period: {
              type: 'integer',
              description: 'Number of hours back to look for articles, between 1 and 24',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return, between 1 and 20 (default: 20)',
            },
            offset: {
              type: 'integer',
              description: 'Number of results to skip for pagination (default: 0)',
            },
          },
          required: ['source', 'section', 'time_period'],
        },
      },
      {
        name: 'get_newswire_article',
        description: 'Get metadata for a specific New York Times article by its full URL — returns abstract, byline, section, subsection, publication date, and multimedia',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The complete URL of the NYTimes article to look up (e.g. https://www.nytimes.com/2024/01/01/technology/article-slug.html)',
            },
          },
          required: ['url'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_newswire_by_section':     return this.getNewswireBySection(args);
        case 'get_newswire_by_time_period': return this.getNewswireByTimePeriod(args);
        case 'get_newswire_article':        return this.getNewswireArticle(args);
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

  private async request(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams({ ...params, 'api-key': this.apiKey }).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, {});
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as Record<string, unknown>;
    if (data['status'] === 'ERROR') {
      const errors = Array.isArray(data['errors']) ? (data['errors'] as string[]).join(', ') : String(data['errors']);
      return { content: [{ type: 'text', text: `NYTimes API error: ${errors}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ───────────────────────────────────────────────────

  private async getNewswireBySection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.source || !args.section) {
      return { content: [{ type: 'text', text: 'source and section are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.limit != null)  params['limit']  = String(args.limit);
    if (args.offset != null) params['offset'] = String(args.offset);
    return this.request(
      `/content/${encodeURIComponent(args.source as string)}/${encodeURIComponent(args.section as string)}.json`,
      params,
    );
  }

  private async getNewswireByTimePeriod(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.source || !args.section || args.time_period == null) {
      return { content: [{ type: 'text', text: 'source, section, and time_period are required' }], isError: true };
    }
    const timePeriod = Number(args.time_period);
    if (!Number.isInteger(timePeriod) || timePeriod < 1 || timePeriod > 24) {
      return { content: [{ type: 'text', text: 'time_period must be an integer between 1 and 24' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.limit != null)  params['limit']  = String(args.limit);
    if (args.offset != null) params['offset'] = String(args.offset);
    return this.request(
      `/content/${encodeURIComponent(args.source as string)}/${encodeURIComponent(args.section as string)}/${timePeriod}.json`,
      params,
    );
  }

  private async getNewswireArticle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) {
      return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    }
    return this.request('/content.json', { url: args.url as string });
  }
}
