/**
 * NYTimes Top Stories MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official NYTimes Top Stories MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 1 tool. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.nytimes.com/svc/topstories/v2
// Auth: api-key query parameter appended to every request URL
// Docs: https://developer.nytimes.com/docs/top-stories-product/1/overview
// Spec: https://api.apis.guru/v2/specs/nytimes.com/top_stories/2.0.0/openapi.json
// Rate limits: 500 requests/day, 5 requests/minute

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NytimesTopStoriesConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NytimesTopStoriesMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NytimesTopStoriesConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.nytimes.com/svc/topstories/v2';
  }

  static catalog() {
    return {
      name: 'nytimes-top-stories',
      displayName: 'NYTimes Top Stories',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'nytimes', 'new york times', 'nyt', 'top stories', 'breaking news',
        'news', 'articles', 'headlines', 'media', 'journalism', 'press',
        'home', 'world', 'politics', 'business', 'technology', 'science',
        'health', 'sports', 'arts', 'opinion', 'national', 'front page',
        'section', 'latest news', 'current events',
      ],
      toolNames: [
        'get_top_stories',
      ],
      description: 'New York Times Top Stories API: retrieve the current top articles and associated images for any NYT section (home, world, politics, business, technology, science, health, sports, arts, and more).',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_top_stories',
        description: 'Get the top stories currently on a New York Times section page, including article abstracts, bylines, publication dates, multimedia, and web URLs',
        inputSchema: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              description: 'The NYT section to retrieve top stories for. Valid values: home, opinion, world, national, politics, upshot, nyregion, business, technology, science, health, sports, arts, books, movies, theater, sundayreview, fashion, tmagazine, food, travel, magazine, realestate, automobiles, obituaries, insider',
              enum: [
                'home', 'opinion', 'world', 'national', 'politics', 'upshot',
                'nyregion', 'business', 'technology', 'science', 'health', 'sports',
                'arts', 'books', 'movies', 'theater', 'sundayreview', 'fashion',
                'tmagazine', 'food', 'travel', 'magazine', 'realestate',
                'automobiles', 'obituaries', 'insider',
              ],
            },
          },
          required: ['section'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_top_stories': return this.getTopStories(args);
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

  private async getTopStories(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.section) {
      return { content: [{ type: 'text', text: 'section is required' }], isError: true };
    }
    return this.request(`/${encodeURIComponent(args.section as string)}.json`);
  }
}
