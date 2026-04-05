/**
 * NYTimes Most Popular API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.nytimes.com/svc/mostpopular/v2
// Auth: api-key query parameter appended to every request URL
// Docs: https://developer.nytimes.com/docs/most-popular-product/1/overview
// Rate limits: 500 requests/day, 5 requests/minute

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NytimesMostPopularConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NytimesMostPopularApiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NytimesMostPopularConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.nytimes.com/svc/mostpopular/v2';
  }

  static catalog() {
    return {
      name: 'nytimes-most-popular-api',
      displayName: 'NYTimes Most Popular API',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'nytimes', 'new york times', 'nyt', 'most popular', 'trending',
        'most viewed', 'most emailed', 'most shared', 'viral', 'articles',
        'news', 'popular articles', 'top stories',
      ],
      toolNames: [
        'get_most_emailed',
        'get_most_shared',
        'get_most_viewed',
      ],
      description: 'New York Times Most Popular API: get lists of NYT articles ranked by emails, shares, and views over 1-day, 7-day, or 30-day periods, filterable by section.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_most_emailed',
        description: 'Get the most emailed New York Times articles for a given section and time period (1, 7, or 30 days)',
        inputSchema: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              description: 'NYT section to filter by, or "all-sections" for all sections. Examples: Arts, Business Day, Health, Movies, Opinion, Sports, Technology, U.S., World.',
            },
            time_period: {
              type: 'string',
              description: 'Time period in days: "1" (last day), "7" (last week), or "30" (last month)',
              enum: ['1', '7', '30'],
            },
            offset: {
              type: 'integer',
              description: 'Pagination offset — positive integer, multiple of 20 (default: 20)',
            },
          },
          required: ['section', 'time_period'],
        },
      },
      {
        name: 'get_most_shared',
        description: 'Get the most shared New York Times articles for a given section and time period (1, 7, or 30 days)',
        inputSchema: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              description: 'NYT section to filter by, or "all-sections" for all sections. Examples: Arts, Business Day, Health, Movies, Opinion, Sports, Technology, U.S., World.',
            },
            time_period: {
              type: 'string',
              description: 'Time period in days: "1" (last day), "7" (last week), or "30" (last month)',
              enum: ['1', '7', '30'],
            },
            shared_types: {
              type: 'string',
              description: 'Limit results by sharing method: facebook, twitter, email, permalink, etc.',
              enum: ['digg', 'email', 'facebook', 'mixx', 'myspace', 'permalink', 'timespeople', 'twitter', 'yahoobuzz'],
            },
            offset: {
              type: 'integer',
              description: 'Pagination offset — positive integer, multiple of 20 (default: 20)',
            },
          },
          required: ['section', 'time_period'],
        },
      },
      {
        name: 'get_most_viewed',
        description: 'Get the most viewed New York Times articles for a given section and time period (1, 7, or 30 days)',
        inputSchema: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              description: 'NYT section to filter by, or "all-sections" for all sections. Examples: Arts, Business Day, Health, Movies, Opinion, Sports, Technology, U.S., World.',
            },
            time_period: {
              type: 'string',
              description: 'Time period in days: "1" (last day), "7" (last week), or "30" (last month)',
              enum: ['1', '7', '30'],
            },
            offset: {
              type: 'integer',
              description: 'Pagination offset — positive integer, multiple of 20 (default: 20)',
            },
          },
          required: ['section', 'time_period'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_most_emailed': return this.getMostEmailed(args);
        case 'get_most_shared':  return this.getMostShared(args);
        case 'get_most_viewed':  return this.getMostViewed(args);
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

  private async getMostEmailed(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.section || !args.time_period) {
      return { content: [{ type: 'text', text: 'section and time_period are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.offset != null) params['offset'] = String(args.offset);
    return this.request(`/mostemailed/${encodeURIComponent(args.section as string)}/${args.time_period as string}.json`, params);
  }

  private async getMostShared(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.section || !args.time_period) {
      return { content: [{ type: 'text', text: 'section and time_period are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.shared_types) params['shared-types'] = args.shared_types as string;
    if (args.offset != null) params['offset'] = String(args.offset);
    return this.request(`/mostshared/${encodeURIComponent(args.section as string)}/${args.time_period as string}.json`, params);
  }

  private async getMostViewed(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.section || !args.time_period) {
      return { content: [{ type: 'text', text: 'section and time_period are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.offset != null) params['offset'] = String(args.offset);
    return this.request(`/mostviewed/${encodeURIComponent(args.section as string)}/${args.time_period as string}.json`, params);
  }
}
