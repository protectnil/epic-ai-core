/**
 * Rotten Tomatoes MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Rotten Tomatoes MCP server was found on GitHub or the MCP registry.
// This adapter covers: 12 tools (movie lists, movie details, cast, clips, reviews, similar, DVDs, search).
// Recommendation: Use this adapter for all Rotten Tomatoes integrations.
//
// Base URL: http://api.rottentomatoes.com/api/public/v1.0
// Auth: API key passed as query parameter: apikey=<apiKey>
// Docs: http://developer.rottentomatoes.com/docs/read/Home
// Rate limits: Historically 10,000 calls/day on free tier.
// Note: The Rotten Tomatoes public API has been deprecated/limited for new registrations.
//       Existing API keys continue to function for documented endpoints.
// OpenAPI spec: https://api.apis.guru/v2/specs/rottentomatoes.com/1.0/swagger.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RottenTomatoesConfig {
  apiKey: string;
  baseUrl?: string;
}

export class RottenTomatoesMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: RottenTomatoesConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'http://api.rottentomatoes.com/api/public/v1.0';
  }

  static catalog() {
    return {
      name: 'rottentomatoes',
      displayName: 'Rotten Tomatoes',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'rotten tomatoes', 'movies', 'film', 'reviews', 'ratings', 'tomatometer',
        'audience score', 'box office', 'dvd', 'cast', 'clips', 'trailers',
        'media', 'entertainment', 'cinema',
      ],
      toolNames: [
        'get_movies_box_office', 'get_movies_in_theaters', 'get_movies_opening',
        'get_movies_upcoming', 'get_dvd_top_rentals', 'get_dvd_current_releases',
        'get_dvd_new_releases', 'get_dvd_upcoming',
        'search_movies', 'get_movie', 'get_movie_cast', 'get_movie_reviews',
        'get_movie_similar', 'get_movie_clips', 'get_movie_alias',
      ],
      description: 'Rotten Tomatoes: search movies, get Tomatometer ratings, reviews, cast, box office data, DVD releases, and similar film recommendations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_movies_box_office',
        description: 'Get the current box office movies ranked by weekend gross with Tomatometer scores',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of results to return (default: 10, max: 50)',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code for box office data (default: us)',
            },
          },
        },
      },
      {
        name: 'get_movies_in_theaters',
        description: 'Get movies currently playing in theaters with their Tomatometer scores',
        inputSchema: {
          type: 'object',
          properties: {
            page_limit: {
              type: 'number',
              description: 'Number of results per page (default: 16)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: us)',
            },
          },
        },
      },
      {
        name: 'get_movies_opening',
        description: 'Get movies opening in theaters this week',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of results to return (default: 16)',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: us)',
            },
          },
        },
      },
      {
        name: 'get_movies_upcoming',
        description: 'Get movies scheduled for upcoming theatrical release with expected release dates',
        inputSchema: {
          type: 'object',
          properties: {
            page_limit: {
              type: 'number',
              description: 'Number of results per page (default: 16)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: us)',
            },
          },
        },
      },
      {
        name: 'get_dvd_top_rentals',
        description: 'Get the current top DVD rental titles',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of results to return (default: 10)',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: us)',
            },
          },
        },
      },
      {
        name: 'get_dvd_current_releases',
        description: 'Get DVDs currently available for purchase or rental',
        inputSchema: {
          type: 'object',
          properties: {
            page_limit: {
              type: 'number',
              description: 'Number of results per page (default: 16)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: us)',
            },
          },
        },
      },
      {
        name: 'get_dvd_new_releases',
        description: 'Get DVDs that were recently released for home video',
        inputSchema: {
          type: 'object',
          properties: {
            page_limit: {
              type: 'number',
              description: 'Number of results per page (default: 16)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: us)',
            },
          },
        },
      },
      {
        name: 'get_dvd_upcoming',
        description: 'Get movies with upcoming DVD release dates',
        inputSchema: {
          type: 'object',
          properties: {
            page_limit: {
              type: 'number',
              description: 'Number of results per page (default: 16)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: us)',
            },
          },
        },
      },
      {
        name: 'search_movies',
        description: 'Search the Rotten Tomatoes database for movies by title keyword',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query — movie title or keyword to search for',
            },
            page_limit: {
              type: 'number',
              description: 'Number of results per page (default: 10)',
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
        name: 'get_movie',
        description: 'Get detailed information for a specific movie by its Rotten Tomatoes ID, including Tomatometer score, synopsis, and rating',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Rotten Tomatoes movie ID (numeric string, e.g. 770672122)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_movie_cast',
        description: 'Get the full cast and crew list for a specific movie by its Rotten Tomatoes ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Rotten Tomatoes movie ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_movie_reviews',
        description: 'Get critic reviews for a specific movie with review text, publication, and fresh/rotten rating',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Rotten Tomatoes movie ID',
            },
            review_type: {
              type: 'string',
              description: 'Type of reviews to return: all, top_critic, or dvd (default: top_critic)',
            },
            page_limit: {
              type: 'number',
              description: 'Number of reviews per page (default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            country: {
              type: 'string',
              description: 'Two-letter country code (default: us)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_movie_similar',
        description: 'Get a list of movies similar to a specific movie based on Rotten Tomatoes recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Rotten Tomatoes movie ID',
            },
            limit: {
              type: 'number',
              description: 'Number of similar movies to return (default: 5)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_movie_clips',
        description: 'Get video clips and trailers for a specific movie from Rotten Tomatoes',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Rotten Tomatoes movie ID',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_movie_alias',
        description: 'Look up a Rotten Tomatoes movie by an external ID alias such as an IMDb ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'External movie ID to look up (e.g. IMDb ID like tt0120338)',
            },
            type: {
              type: 'string',
              description: 'Type of the external ID (e.g. imdb for IMDb IDs)',
            },
          },
          required: ['id', 'type'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_movies_box_office':
          return this.rtGet('/lists/movies/box_office.json', args);
        case 'get_movies_in_theaters':
          return this.rtGet('/lists/movies/in_theaters.json', args);
        case 'get_movies_opening':
          return this.rtGet('/lists/movies/opening.json', args);
        case 'get_movies_upcoming':
          return this.rtGet('/lists/movies/upcoming.json', args);
        case 'get_dvd_top_rentals':
          return this.rtGet('/lists/dvds/top_rentals.json', args);
        case 'get_dvd_current_releases':
          return this.rtGet('/lists/dvds/current_releases.json', args);
        case 'get_dvd_new_releases':
          return this.rtGet('/lists/dvds/new_releases.json', args);
        case 'get_dvd_upcoming':
          return this.rtGet('/lists/dvds/upcoming.json', args);
        case 'search_movies':
          return this.searchMovies(args);
        case 'get_movie':
          return this.getMovie(args);
        case 'get_movie_cast':
          return this.getMovieCast(args);
        case 'get_movie_reviews':
          return this.getMovieReviews(args);
        case 'get_movie_similar':
          return this.getMovieSimilar(args);
        case 'get_movie_clips':
          return this.getMovieClips(args);
        case 'get_movie_alias':
          return this.getMovieAlias(args);
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

  private async rtGet(path: string, params: Record<string, unknown> = {}): Promise<ToolResult> {
    const query = new URLSearchParams({ apikey: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) query.set(k, String(v));
    }
    const url = `${this.baseUrl}${path}?${query.toString()}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchMovies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q (search query) is required' }], isError: true };
    return this.rtGet('/movies.json', args);
  }

  private async getMovie(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.rtGet(`/movies/${encodeURIComponent(id)}.json`);
  }

  private async getMovieCast(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.rtGet(`/movies/${encodeURIComponent(id)}/cast.json`);
  }

  private async getMovieReviews(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id: _id, ...rest } = args;
    return this.rtGet(`/movies/${encodeURIComponent(id)}/reviews.json`, rest);
  }

  private async getMovieSimilar(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const { id: _id, ...rest } = args;
    return this.rtGet(`/movies/${encodeURIComponent(id)}/similar.json`, rest);
  }

  private async getMovieClips(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.rtGet(`/movies/${encodeURIComponent(id)}/clips.json`);
  }

  private async getMovieAlias(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.type) {
      return { content: [{ type: 'text', text: 'id and type are required' }], isError: true };
    }
    return this.rtGet('/movie_alias.json', { id: args.id, type: args.type });
  }
}
