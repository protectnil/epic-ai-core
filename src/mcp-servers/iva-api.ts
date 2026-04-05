/**
 * IVA API (Entertainment Express) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official IVA API MCP server was found on GitHub, npm, or the IVA developer portal.
// No community-maintained Entertainment Express MCP server appears in major MCP registries.
// Our adapter covers: 20 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no vendor MCP exists. Build this REST wrapper for all deployments.
//
// Base URL: https://ee.iva-api.com
// Auth: API Key — pass as header "Ocp-Apim-Subscription-Key" AND query param "subscription-Key"
//   Obtain key at: https://developer.iva-entertainment.com
// Docs: https://developer.iva-entertainment.com/docs/v2/getting-started
// Rate limits: Varies by subscription tier. Requests must include Accept: application/json header.
// Note: The apis.guru spec (swagger.json) for iva-api.com/2.0 has empty paths{} — spec is a stub.
//   Endpoints implemented below from official IVA developer portal documentation.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IvaApiConfig {
  apiKey: string;
  baseUrl?: string;
}

export class IvaApiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: IvaApiConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://ee.iva-api.com';
  }

  static catalog() {
    return {
      name: 'iva-api',
      displayName: 'IVA API (Entertainment Express)',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'iva', 'entertainment', 'movie', 'movies', 'tv', 'television', 'show', 'series',
        'film', 'cinema', 'trailer', 'video', 'content discovery', 'media metadata',
        'cast', 'crew', 'actor', 'director', 'genre', 'release', 'box office',
        'streaming', 'vod', 'entertainment express', 'videodetective',
        'search movies', 'search tv', 'entertainment api',
      ],
      toolNames: [
        'search_movies',
        'get_movie',
        'get_movie_images',
        'get_movie_videos',
        'get_movie_releases',
        'get_movie_cast_crew',
        'get_movie_alternate_titles',
        'search_tv_shows',
        'get_tv_show',
        'get_tv_show_images',
        'get_tv_show_seasons',
        'get_tv_season',
        'get_tv_episode',
        'get_tv_show_cast_crew',
        'search_people',
        'get_person',
        'get_person_filmography',
        'search_all',
        'get_genres',
        'get_companies',
      ],
      description: 'IVA Entertainment Express API: discover and retrieve rich metadata for movies, TV shows, seasons, episodes, cast/crew, trailers, images, and release information.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Movies ────────────────────────────────────────────────────────────
      {
        name: 'search_movies',
        description: 'Search for movies by title keyword — returns matching films with IDs, titles, release years, and overview',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Movie title keyword to search for (e.g. "The Dark Knight", "Inception")',
            },
            page: {
              type: 'number',
              description: 'Page number for paginated results (default: 1)',
            },
            take: {
              type: 'number',
              description: 'Number of results per page (default: 10, max: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_movie',
        description: 'Get full metadata for a specific movie by IVA movie ID — title, synopsis, runtime, rating, release date, genres, and more',
        inputSchema: {
          type: 'object',
          properties: {
            movie_id: {
              type: 'number',
              description: 'IVA numeric movie ID (from search_movies results)',
            },
          },
          required: ['movie_id'],
        },
      },
      {
        name: 'get_movie_images',
        description: 'Get poster, backdrop, and promotional images for a movie by IVA movie ID',
        inputSchema: {
          type: 'object',
          properties: {
            movie_id: {
              type: 'number',
              description: 'IVA numeric movie ID',
            },
          },
          required: ['movie_id'],
        },
      },
      {
        name: 'get_movie_videos',
        description: 'Get trailers, clips, featurettes, and other video content for a movie — includes YouTube/streaming URLs',
        inputSchema: {
          type: 'object',
          properties: {
            movie_id: {
              type: 'number',
              description: 'IVA numeric movie ID',
            },
          },
          required: ['movie_id'],
        },
      },
      {
        name: 'get_movie_releases',
        description: 'Get theatrical, digital, DVD, and streaming release dates for a movie across different countries',
        inputSchema: {
          type: 'object',
          properties: {
            movie_id: {
              type: 'number',
              description: 'IVA numeric movie ID',
            },
            country_code: {
              type: 'string',
              description: 'ISO 2-letter country code to filter releases (e.g. US, GB, AU — omit for all countries)',
            },
          },
          required: ['movie_id'],
        },
      },
      {
        name: 'get_movie_cast_crew',
        description: 'Get the full cast (actors, character names) and crew (director, writer, producer) for a movie',
        inputSchema: {
          type: 'object',
          properties: {
            movie_id: {
              type: 'number',
              description: 'IVA numeric movie ID',
            },
          },
          required: ['movie_id'],
        },
      },
      {
        name: 'get_movie_alternate_titles',
        description: 'Get alternate and localized titles for a movie in different countries and languages',
        inputSchema: {
          type: 'object',
          properties: {
            movie_id: {
              type: 'number',
              description: 'IVA numeric movie ID',
            },
          },
          required: ['movie_id'],
        },
      },
      // ── TV Shows ──────────────────────────────────────────────────────────
      {
        name: 'search_tv_shows',
        description: 'Search for TV shows and series by title keyword — returns matching shows with IDs, titles, and overview',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'TV show title keyword to search for (e.g. "Breaking Bad", "Succession")',
            },
            page: {
              type: 'number',
              description: 'Page number for paginated results (default: 1)',
            },
            take: {
              type: 'number',
              description: 'Number of results per page (default: 10, max: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_tv_show',
        description: 'Get full metadata for a TV show by IVA show ID — title, synopsis, status, network, first air date, genres, and season count',
        inputSchema: {
          type: 'object',
          properties: {
            show_id: {
              type: 'number',
              description: 'IVA numeric TV show ID (from search_tv_shows results)',
            },
          },
          required: ['show_id'],
        },
      },
      {
        name: 'get_tv_show_images',
        description: 'Get poster, banner, and backdrop images for a TV show',
        inputSchema: {
          type: 'object',
          properties: {
            show_id: {
              type: 'number',
              description: 'IVA numeric TV show ID',
            },
          },
          required: ['show_id'],
        },
      },
      {
        name: 'get_tv_show_seasons',
        description: 'List all seasons for a TV show including season numbers, episode counts, and air dates',
        inputSchema: {
          type: 'object',
          properties: {
            show_id: {
              type: 'number',
              description: 'IVA numeric TV show ID',
            },
          },
          required: ['show_id'],
        },
      },
      {
        name: 'get_tv_season',
        description: 'Get details for a specific season of a TV show — episode list with titles, air dates, and overviews',
        inputSchema: {
          type: 'object',
          properties: {
            show_id: {
              type: 'number',
              description: 'IVA numeric TV show ID',
            },
            season_number: {
              type: 'number',
              description: 'Season number (e.g. 1 for Season 1)',
            },
          },
          required: ['show_id', 'season_number'],
        },
      },
      {
        name: 'get_tv_episode',
        description: 'Get metadata for a specific TV episode — title, synopsis, air date, runtime, guest cast, and director',
        inputSchema: {
          type: 'object',
          properties: {
            show_id: {
              type: 'number',
              description: 'IVA numeric TV show ID',
            },
            season_number: {
              type: 'number',
              description: 'Season number',
            },
            episode_number: {
              type: 'number',
              description: 'Episode number within the season',
            },
          },
          required: ['show_id', 'season_number', 'episode_number'],
        },
      },
      {
        name: 'get_tv_show_cast_crew',
        description: 'Get the series regular cast and crew (creators, showrunners, directors) for a TV show',
        inputSchema: {
          type: 'object',
          properties: {
            show_id: {
              type: 'number',
              description: 'IVA numeric TV show ID',
            },
          },
          required: ['show_id'],
        },
      },
      // ── People ────────────────────────────────────────────────────────────
      {
        name: 'search_people',
        description: 'Search for actors, directors, writers, and other entertainment industry people by name',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Person name to search for (e.g. "Christopher Nolan", "Meryl Streep")',
            },
            page: {
              type: 'number',
              description: 'Page number for paginated results (default: 1)',
            },
            take: {
              type: 'number',
              description: 'Number of results per page (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_person',
        description: 'Get biography, birthdate, birthplace, and profile image for an entertainment industry person',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'number',
              description: 'IVA numeric person ID (from search_people results)',
            },
          },
          required: ['person_id'],
        },
      },
      {
        name: 'get_person_filmography',
        description: 'Get the complete filmography for a person — all movies and TV shows they have acted in or worked on',
        inputSchema: {
          type: 'object',
          properties: {
            person_id: {
              type: 'number',
              description: 'IVA numeric person ID',
            },
          },
          required: ['person_id'],
        },
      },
      // ── Cross-entity search ───────────────────────────────────────────────
      {
        name: 'search_all',
        description: 'Search across movies, TV shows, and people simultaneously — returns mixed results sorted by relevance',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term to match against movies, TV shows, and people',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            take: {
              type: 'number',
              description: 'Results per page (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      // ── Reference data ────────────────────────────────────────────────────
      {
        name: 'get_genres',
        description: 'Get the list of all entertainment genres used in IVA API metadata — ID and name pairs for movies and TV',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_companies',
        description: 'Search for production companies and studios by name — returns company IDs and names used in movie/TV metadata',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Company name to search for (e.g. "Warner Bros", "Netflix", "A24")',
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
        case 'search_movies':              return this.searchMovies(args);
        case 'get_movie':                  return this.getMovie(args);
        case 'get_movie_images':           return this.getMovieImages(args);
        case 'get_movie_videos':           return this.getMovieVideos(args);
        case 'get_movie_releases':         return this.getMovieReleases(args);
        case 'get_movie_cast_crew':        return this.getMovieCastCrew(args);
        case 'get_movie_alternate_titles': return this.getMovieAlternateTitles(args);
        case 'search_tv_shows':            return this.searchTvShows(args);
        case 'get_tv_show':                return this.getTvShow(args);
        case 'get_tv_show_images':         return this.getTvShowImages(args);
        case 'get_tv_show_seasons':        return this.getTvShowSeasons(args);
        case 'get_tv_season':              return this.getTvSeason(args);
        case 'get_tv_episode':             return this.getTvEpisode(args);
        case 'get_tv_show_cast_crew':      return this.getTvShowCastCrew(args);
        case 'search_people':              return this.searchPeople(args);
        case 'get_person':                 return this.getPerson(args);
        case 'get_person_filmography':     return this.getPersonFilmography(args);
        case 'search_all':                 return this.searchAll(args);
        case 'get_genres':                 return this.getGenres();
        case 'get_companies':              return this.getCompanies(args);
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

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    params['subscription-Key'] = this.apiKey;
    const qs = '?' + new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Movie methods ──────────────────────────────────────────────────────────

  private async searchMovies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      title: args.query as string,
      skip: String(((args.page as number ?? 1) - 1) * (args.take as number ?? 10)),
      take: String(args.take as number ?? 10),
    };
    return this.get('/Movies/Search', params);
  }

  private async getMovie(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.movie_id) return { content: [{ type: 'text', text: 'movie_id is required' }], isError: true };
    return this.get(`/Movies/${encodeURIComponent(String(args.movie_id))}`);
  }

  private async getMovieImages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.movie_id) return { content: [{ type: 'text', text: 'movie_id is required' }], isError: true };
    return this.get(`/Movies/${encodeURIComponent(String(args.movie_id))}/Images`);
  }

  private async getMovieVideos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.movie_id) return { content: [{ type: 'text', text: 'movie_id is required' }], isError: true };
    return this.get(`/Movies/${encodeURIComponent(String(args.movie_id))}/Videos`);
  }

  private async getMovieReleases(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.movie_id) return { content: [{ type: 'text', text: 'movie_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.country_code) params.countryCode = args.country_code as string;
    return this.get(`/Movies/${encodeURIComponent(String(args.movie_id))}/Releases`, params);
  }

  private async getMovieCastCrew(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.movie_id) return { content: [{ type: 'text', text: 'movie_id is required' }], isError: true };
    return this.get(`/Movies/${encodeURIComponent(String(args.movie_id))}/CastCrew`);
  }

  private async getMovieAlternateTitles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.movie_id) return { content: [{ type: 'text', text: 'movie_id is required' }], isError: true };
    return this.get(`/Movies/${encodeURIComponent(String(args.movie_id))}/AlternateTitles`);
  }

  // ── TV Show methods ────────────────────────────────────────────────────────

  private async searchTvShows(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      title: args.query as string,
      skip: String(((args.page as number ?? 1) - 1) * (args.take as number ?? 10)),
      take: String(args.take as number ?? 10),
    };
    return this.get('/Shows/Search', params);
  }

  private async getTvShow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.show_id) return { content: [{ type: 'text', text: 'show_id is required' }], isError: true };
    return this.get(`/Shows/${encodeURIComponent(String(args.show_id))}`);
  }

  private async getTvShowImages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.show_id) return { content: [{ type: 'text', text: 'show_id is required' }], isError: true };
    return this.get(`/Shows/${encodeURIComponent(String(args.show_id))}/Images`);
  }

  private async getTvShowSeasons(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.show_id) return { content: [{ type: 'text', text: 'show_id is required' }], isError: true };
    return this.get(`/Shows/${encodeURIComponent(String(args.show_id))}/Seasons`);
  }

  private async getTvSeason(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.show_id) return { content: [{ type: 'text', text: 'show_id is required' }], isError: true };
    if (args.season_number == null) return { content: [{ type: 'text', text: 'season_number is required' }], isError: true };
    return this.get(`/Shows/${encodeURIComponent(String(args.show_id))}/Seasons/${encodeURIComponent(String(args.season_number))}`);
  }

  private async getTvEpisode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.show_id) return { content: [{ type: 'text', text: 'show_id is required' }], isError: true };
    if (args.season_number == null) return { content: [{ type: 'text', text: 'season_number is required' }], isError: true };
    if (args.episode_number == null) return { content: [{ type: 'text', text: 'episode_number is required' }], isError: true };
    return this.get(
      `/Shows/${encodeURIComponent(String(args.show_id))}/Seasons/${encodeURIComponent(String(args.season_number))}/Episodes/${encodeURIComponent(String(args.episode_number))}`,
    );
  }

  private async getTvShowCastCrew(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.show_id) return { content: [{ type: 'text', text: 'show_id is required' }], isError: true };
    return this.get(`/Shows/${encodeURIComponent(String(args.show_id))}/CastCrew`);
  }

  // ── People methods ─────────────────────────────────────────────────────────

  private async searchPeople(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      name: args.query as string,
      skip: String(((args.page as number ?? 1) - 1) * (args.take as number ?? 10)),
      take: String(args.take as number ?? 10),
    };
    return this.get('/People/Search', params);
  }

  private async getPerson(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.person_id) return { content: [{ type: 'text', text: 'person_id is required' }], isError: true };
    return this.get(`/People/${encodeURIComponent(String(args.person_id))}`);
  }

  private async getPersonFilmography(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.person_id) return { content: [{ type: 'text', text: 'person_id is required' }], isError: true };
    return this.get(`/People/${encodeURIComponent(String(args.person_id))}/Filmography`);
  }

  // ── Cross-entity & Reference ───────────────────────────────────────────────

  private async searchAll(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      title: args.query as string,
      skip: String(((args.page as number ?? 1) - 1) * (args.take as number ?? 10)),
      take: String(args.take as number ?? 10),
    };
    return this.get('/Search', params);
  }

  private async getGenres(): Promise<ToolResult> {
    return this.get('/Genres');
  }

  private async getCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = { name: args.query as string };
    return this.get('/Companies/Search', params);
  }
}
