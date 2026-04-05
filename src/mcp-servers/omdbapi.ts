/**
 * OMDb (Open Movie Database) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official OMDb MCP server was found on GitHub or the OMDb developer portal.
// Our adapter covers: 3 tools (search by title, search by IMDb ID, search/list movies).
// Recommendation: Use this adapter. No community or vendor MCP available.
//
// Base URL: https://www.omdbapi.com
// Auth: API key passed as query parameter `apikey` on every request
//   Free tier: 1,000 daily requests. Patron tier: 100,000+ requests/day.
//   Register at: https://www.omdbapi.com/apikey.aspx
// Docs: https://www.omdbapi.com/#usage
// Rate limits: Free tier 1,000 req/day. Paid tiers vary.
// License: Content under CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OmdbApiConfig {
  /** OMDb API key (register at https://www.omdbapi.com/apikey.aspx) */
  apiKey: string;
  /** Optional base URL override (default: https://www.omdbapi.com) */
  baseUrl?: string;
}

export class OmdbApiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OmdbApiConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://www.omdbapi.com';
  }

  static catalog() {
    return {
      name: 'omdbapi',
      displayName: 'OMDb',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'omdb', 'movie', 'film', 'television', 'tv', 'series', 'imdb', 'cinema',
        'episode', 'season', 'actor', 'director', 'plot', 'rating', 'rotten-tomatoes',
        'metacritic', 'box-office', 'awards', 'oscars', 'genre', 'release',
        'poster', 'streaming', 'entertainment', 'media', 'database',
      ],
      toolNames: [
        'get_movie_by_title',
        'get_movie_by_id',
        'search_movies',
      ],
      description: 'Open Movie Database — look up movies, TV series, and episodes by title or IMDb ID, or search by keyword with optional year and type filters.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_movie_by_title',
        description: 'Get full details for a movie, TV series, or episode by exact title — returns plot, cast, director, ratings (IMDb, Rotten Tomatoes, Metacritic), box office, awards, and poster URL',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Movie or TV series title to look up (e.g. "The Dark Knight", "Breaking Bad")',
            },
            year: {
              type: 'integer',
              description: 'Year of release to disambiguate titles with the same name (e.g. 2008)',
            },
            type: {
              type: 'string',
              description: 'Type of result: movie, series, or episode (default: any)',
              enum: ['movie', 'series', 'episode'],
            },
            plot: {
              type: 'string',
              description: 'Plot length: "short" (default) or "full"',
              enum: ['short', 'full'],
            },
            tomatoes: {
              type: 'boolean',
              description: 'Include Rotten Tomatoes rating details (default: false)',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_movie_by_id',
        description: 'Get full details for a movie, TV series, or episode by IMDb ID — returns plot, cast, director, ratings, box office, awards, and poster URL',
        inputSchema: {
          type: 'object',
          properties: {
            imdb_id: {
              type: 'string',
              description: 'Valid IMDb ID (e.g. "tt0468569" for The Dark Knight)',
            },
            plot: {
              type: 'string',
              description: 'Plot length: "short" (default) or "full"',
              enum: ['short', 'full'],
            },
            tomatoes: {
              type: 'boolean',
              description: 'Include Rotten Tomatoes rating details (default: false)',
            },
          },
          required: ['imdb_id'],
        },
      },
      {
        name: 'search_movies',
        description: 'Search for movies, TV series, or episodes by keyword — returns a paginated list of matching titles with IMDb IDs, years, and types',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keyword or partial title (e.g. "batman", "star wars")',
            },
            type: {
              type: 'string',
              description: 'Filter by type: movie, series, or episode (default: any)',
              enum: ['movie', 'series', 'episode'],
            },
            year: {
              type: 'integer',
              description: 'Filter by year of release (e.g. 1999)',
            },
            page: {
              type: 'integer',
              description: 'Page number for paginated results (default: 1, each page returns up to 10 results)',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_movie_by_title': return this.getMovieByTitle(args);
        case 'get_movie_by_id':    return this.getMovieById(args);
        case 'search_movies':      return this.searchMovies(args);
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

  private buildUrl(params: Record<string, string | number | boolean | undefined>): string {
    const qs = new URLSearchParams({ apikey: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    return `${this.baseUrl}/?${qs.toString()}`;
  }

  private async fetchApi(params: Record<string, string | number | boolean | undefined>): Promise<ToolResult> {
    const url = this.buildUrl(params);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`OMDb returned non-JSON (HTTP ${response.status})`); }
    // OMDb returns { Response: "False", Error: "..." } on logical errors
    if (typeof data === 'object' && data !== null && (data as Record<string, unknown>).Response === 'False') {
      const errMsg = (data as Record<string, unknown>).Error as string ?? 'OMDb returned an error';
      return { content: [{ type: 'text', text: `OMDb error: ${errMsg}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getMovieByTitle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.title) return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    const params: Record<string, string | number | boolean | undefined> = {
      t: args.title as string,
    };
    if (args.year)    params.y        = args.year    as number;
    if (args.type)    params.type     = args.type    as string;
    if (args.plot)    params.plot     = args.plot    as string;
    if (args.tomatoes !== undefined) params.tomatoes = args.tomatoes as boolean;
    return this.fetchApi(params);
  }

  private async getMovieById(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.imdb_id) return { content: [{ type: 'text', text: 'imdb_id is required' }], isError: true };
    const params: Record<string, string | number | boolean | undefined> = {
      i: args.imdb_id as string,
    };
    if (args.plot)    params.plot     = args.plot    as string;
    if (args.tomatoes !== undefined) params.tomatoes = args.tomatoes as boolean;
    return this.fetchApi(params);
  }

  private async searchMovies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string | number | boolean | undefined> = {
      s: args.query as string,
    };
    if (args.type) params.type = args.type as string;
    if (args.year) params.y    = args.year as number;
    if (args.page) params.page = args.page as number;
    return this.fetchApi(params);
  }
}
