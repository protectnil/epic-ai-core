/**
 * NYTimes Movie Reviews MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.nytimes.com/svc/movies/v2
// Auth: api-key query parameter appended to every request URL
// Docs: https://developer.nytimes.com/docs/movie-reviews-api/1/overview
// Rate limits: 500 requests/day, 5 requests/minute

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NytimesMovieReviewsConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NytimesMovieReviewsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NytimesMovieReviewsConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.nytimes.com/svc/movies/v2';
  }

  static catalog() {
    return {
      name: 'nytimes-movie-reviews',
      displayName: 'NYTimes Movie Reviews',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'nytimes', 'new york times', 'movie', 'film', 'review', 'critic',
        'critics pick', 'movie review', 'nyt', 'cinema', 'box office',
        'film review', 'reviewer', 'manohla dargis', 'a.o. scott',
      ],
      toolNames: [
        'search_movie_reviews',
        'get_movie_reviews',
        'get_critics',
      ],
      description: 'New York Times Movie Reviews API: search NYT movie reviews by keyword, get Critics\' Picks currently in theaters, and retrieve reviewer profiles.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_movie_reviews',
        description: 'Search New York Times movie reviews by keyword — returns reviews matching movie title or indexed terms, with optional filters for critics-pick status, reviewer name, and publication/opening dates',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords matching movie title and indexed terms. Wrap in single quotes for exact match (e.g. \'28 days later\'). Multiple terms without quotes use OR search.',
            },
            critics_pick: {
              type: 'string',
              description: 'Limit results to NYT Critics\' Picks: Y (only picks), N (only non-picks). Omit for all reviews.',
              enum: ['Y', 'N'],
            },
            reviewer: {
              type: 'string',
              description: 'Limit results to a specific reviewer by name (e.g. "Manohla Dargis")',
            },
            publication_date: {
              type: 'string',
              description: 'Single date YYYY-MM-DD or date range YYYY-MM-DD;YYYY-MM-DD. Filters by first publication date in The Times.',
            },
            opening_date: {
              type: 'string',
              description: 'Single date YYYY-MM-DD or date range YYYY-MM-DD;YYYY-MM-DD. Filters by movie opening date in the New York region.',
            },
            offset: {
              type: 'integer',
              description: 'Pagination offset — positive integer, multiple of 20 (default: 20)',
            },
            order: {
              type: 'string',
              description: 'Sort order: by-title (alphabetical), by-publication-date (reverse chronological), by-opening-date (reverse chronological). Default: by-publication-date.',
            },
          },
        },
      },
      {
        name: 'get_movie_reviews',
        description: 'Get a list of New York Times movie reviews — retrieve all reviews or only current NYT Critics\' Picks in theaters',
        inputSchema: {
          type: 'object',
          properties: {
            resource_type: {
              type: 'string',
              description: 'Type of reviews to retrieve: "all" for all reviews including Critics\' Picks, "picks" for only NYT Critics\' Picks currently in theaters',
              enum: ['all', 'picks'],
            },
            offset: {
              type: 'integer',
              description: 'Pagination offset — positive integer, multiple of 20 (default: 20)',
            },
            order: {
              type: 'string',
              description: 'Sort order: by-title, by-publication-date, or by-opening-date (default: by-publication-date)',
              enum: ['by-title', 'by-publication-date', 'by-opening-date'],
            },
          },
          required: ['resource_type'],
        },
      },
      {
        name: 'get_critics',
        description: 'Get profiles of New York Times movie critics — retrieve all critics, full-time or part-time staff, or a specific reviewer by name',
        inputSchema: {
          type: 'object',
          properties: {
            resource_type: {
              type: 'string',
              description: 'Which critics to retrieve: "all" for all NYT reviewers, "full-time" for full-time staff critics, "part-time" for part-time critics, or a specific reviewer\'s name (e.g. "Manohla Dargis")',
            },
          },
          required: ['resource_type'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_movie_reviews': return this.searchMovieReviews(args);
        case 'get_movie_reviews':    return this.getMovieReviews(args);
        case 'get_critics':          return this.getCritics(args);
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

  private async searchMovieReviews(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.query)            params['query']            = args.query as string;
    if (args.critics_pick)     params['critics-pick']     = args.critics_pick as string;
    if (args.reviewer)         params['reviewer']         = args.reviewer as string;
    if (args.publication_date) params['publication-date'] = args.publication_date as string;
    if (args.opening_date)     params['opening-date']     = args.opening_date as string;
    if (args.offset != null)   params['offset']           = String(args.offset);
    if (args.order)            params['order']            = args.order as string;
    return this.request('/reviews/search.json', params);
  }

  private async getMovieReviews(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.resource_type) {
      return { content: [{ type: 'text', text: 'resource_type is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.offset != null) params['offset'] = String(args.offset);
    if (args.order)          params['order']  = args.order as string;
    return this.request(`/reviews/${args.resource_type as string}.json`, params);
  }

  private async getCritics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.resource_type) {
      return { content: [{ type: 'text', text: 'resource_type is required' }], isError: true };
    }
    return this.request(`/critics/${encodeURIComponent(args.resource_type as string)}.json`);
  }
}
