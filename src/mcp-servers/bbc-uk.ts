/**
 * BBC Radio & Music Services MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official BBC vendor MCP server found.
//   No community MCP servers found for BBC Radio & Music Services API.
// Our adapter covers: 10 tools (broadcasts, podcasts, radio programmes, music popular tracks/artists/playlists, categories, networks, recommendations, homepage experience).
//   Recommendation: Use this adapter for BBC Radio & Music content discovery.
//
// Base URL: https://rms.api.bbc.co.uk
// Auth: Bearer token (X-Authentication-Provider + Authorization header) or API key depending on endpoint
// Docs: https://rms.api.bbc.co.uk/docs
// Rate limits: Contact BBC for developer access.
// Note: Personalised endpoints (/my/*) require OAuth bearer token. Public endpoints are open.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BBCUKConfig {
  apiKey?: string;
  bearerToken?: string;
  /** Optional base URL override (default: https://rms.api.bbc.co.uk) */
  baseUrl?: string;
}

export class BBCUKMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly bearerToken: string;
  private readonly baseUrl: string;

  constructor(config: BBCUKConfig) {
    super();
    this.apiKey = config.apiKey ?? '';
    this.bearerToken = config.bearerToken ?? '';
    this.baseUrl = config.baseUrl ?? 'https://rms.api.bbc.co.uk';
  }

  static catalog() {
    return {
      name: 'bbc-uk',
      displayName: 'BBC Radio & Music',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'bbc', 'radio', 'music', 'podcast', 'broadcast', 'uk', 'iplayer',
        'artist', 'playlist', 'track', 'popular', 'network', 'category',
        'programme', 'live', 'on-demand', 'streaming',
      ],
      toolNames: [
        'get_broadcasts', 'get_podcasts', 'get_podcast_episodes', 'get_radio_programmes',
        'get_popular_tracks', 'get_popular_artists', 'get_popular_playlists',
        'get_categories', 'get_radio_networks', 'get_homepage_experience',
      ],
      description: 'BBC Radio & Music Services API — discover BBC radio broadcasts, podcasts, radio programmes, popular music tracks/artists/playlists, categories, and networks across BBC UK services.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_broadcasts',
        description: 'Get BBC radio and TV broadcast listings — past, present, and upcoming scheduled broadcasts',
        inputSchema: {
          type: 'object',
          properties: {
            pid: {
              type: 'string',
              description: 'Filter by specific broadcast PID',
            },
            offset: {
              type: 'integer',
              description: 'Pagination offset — number of results to skip (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Number of results to return (default: 10, max: 48)',
            },
          },
        },
      },
      {
        name: 'get_podcasts',
        description: 'Browse all available BBC podcasts — list podcast series with metadata',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'integer',
              description: 'Pagination offset (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Number of results (default: 10, max: 48)',
            },
          },
        },
      },
      {
        name: 'get_podcast_episodes',
        description: 'Get episodes for a specific BBC podcast series by PID',
        inputSchema: {
          type: 'object',
          properties: {
            pid: {
              type: 'string',
              description: 'Podcast series PID (e.g. p02nq0gn for Desert Island Discs)',
            },
            offset: {
              type: 'integer',
              description: 'Pagination offset (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Number of episodes to return (default: 10, max: 48)',
            },
          },
          required: ['pid'],
        },
      },
      {
        name: 'get_radio_programmes',
        description: 'Browse available BBC radio programmes — series and episodes available on BBC iPlayer Radio',
        inputSchema: {
          type: 'object',
          properties: {
            pid: {
              type: 'string',
              description: 'Filter by specific programme PID',
            },
            network_id: {
              type: 'string',
              description: 'Filter by BBC radio network ID (e.g. bbc_radio_four)',
            },
            offset: {
              type: 'integer',
              description: 'Pagination offset (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Number of results (default: 10, max: 48)',
            },
          },
        },
      },
      {
        name: 'get_popular_tracks',
        description: 'Get the most popular music tracks currently trending on BBC Radio services',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'integer',
              description: 'Pagination offset (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Number of tracks (default: 10, max: 48)',
            },
          },
        },
      },
      {
        name: 'get_popular_artists',
        description: 'Get the most popular music artists currently trending on BBC Radio services',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'integer',
              description: 'Pagination offset (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Number of artists (default: 10, max: 48)',
            },
          },
        },
      },
      {
        name: 'get_popular_playlists',
        description: 'Get the most popular music playlists currently featured on BBC Radio services',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'integer',
              description: 'Pagination offset (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Number of playlists (default: 10, max: 48)',
            },
          },
        },
      },
      {
        name: 'get_categories',
        description: 'List BBC Radio & Music content categories — genres and topic categories used to classify content',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Get a specific category by ID',
            },
          },
        },
      },
      {
        name: 'get_radio_networks',
        description: 'Get BBC radio network information — list of all BBC national and local radio networks with metadata',
        inputSchema: {
          type: 'object',
          properties: {
            preset: {
              type: 'boolean',
              description: 'Return only preset/main networks (default: false)',
            },
            international: {
              type: 'boolean',
              description: 'Include international networks (default: false)',
            },
          },
        },
      },
      {
        name: 'get_homepage_experience',
        description: 'Get the BBC iPlayer Radio homepage experience — featured content, collections, and editorial picks',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_broadcasts':
          return this.getBroadcasts(args);
        case 'get_podcasts':
          return this.getPodcasts(args);
        case 'get_podcast_episodes':
          return this.getPodcastEpisodes(args);
        case 'get_radio_programmes':
          return this.getRadioProgrammes(args);
        case 'get_popular_tracks':
          return this.getPopularTracks(args);
        case 'get_popular_artists':
          return this.getPopularArtists(args);
        case 'get_popular_playlists':
          return this.getPopularPlaylists(args);
        case 'get_categories':
          return this.getCategories(args);
        case 'get_radio_networks':
          return this.getRadioNetworks(args);
        case 'get_homepage_experience':
          return this.getHomepageExperience(args);
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

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
      headers['X-Authentication-Provider'] = 'idv5';
    }
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  private buildUrl(path: string, params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const query = qs.toString();
    return `${this.baseUrl}${path}${query ? '?' + query : ''}`;
  }

  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`BBC Radio & Music returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildPaginationParams(args: Record<string, unknown>): Record<string, string | undefined> {
    const params: Record<string, string | undefined> = {};
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.limit !== undefined) params.limit = String(args.limit);
    return params;
  }

  private async getBroadcasts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    if (args.pid) {
      return this.get(`/broadcasts/${encodeURIComponent(args.pid as string)}`, params);
    }
    return this.get('/broadcasts', params);
  }

  private async getPodcasts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    return this.get('/podcasts', params);
  }

  private async getPodcastEpisodes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pid) return { content: [{ type: 'text', text: 'pid is required' }], isError: true };
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    return this.get(`/podcasts/${encodeURIComponent(args.pid as string)}/episodes`, params);
  }

  private async getRadioProgrammes(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    if (args.network_id) params.network_id = args.network_id as string;
    if (args.pid) {
      return this.get(`/radio/programmes/${encodeURIComponent(args.pid as string)}`, params);
    }
    return this.get('/radio/programmes', params);
  }

  private async getPopularTracks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    return this.get('/music/popular/tracks', params);
  }

  private async getPopularArtists(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    return this.get('/music/popular/artists', params);
  }

  private async getPopularPlaylists(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = { ...this.buildPaginationParams(args) };
    return this.get('/music/popular/playlists', params);
  }

  private async getCategories(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id) {
      return this.get(`/categories/${encodeURIComponent(args.id as string)}`);
    }
    return this.get('/categories');
  }

  private async getRadioNetworks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.preset !== undefined) params.preset = String(args.preset);
    if (args.international !== undefined) params.international = String(args.international);
    return this.get('/radio/networks.json', params);
  }

  private async getHomepageExperience(_args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/experience/homepage');
  }
}
