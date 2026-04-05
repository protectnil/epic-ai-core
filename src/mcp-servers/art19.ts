/**
 * ART19 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official ART19 MCP server was found on GitHub.
//
// Base URL: https://art19.com
// Auth: Token-based — Authorization: Token token="your-token", credential="your-credential"
// Docs: https://art19.com/swagger_json/external/content.json
// Rate limits: Rate-limited per credential. 429 Too Many Requests with optional Retry-After header.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Art19Config {
  token: string;
  credential: string;
  /** Optional base URL override (default: https://art19.com) */
  baseUrl?: string;
}

export class Art19MCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly credential: string;
  private readonly baseUrl: string;

  constructor(config: Art19Config) {
    super();
    this.token = config.token;
    this.credential = config.credential;
    this.baseUrl = config.baseUrl ?? 'https://art19.com';
  }

  static catalog() {
    return {
      name: 'art19',
      displayName: 'ART19',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'art19', 'podcast', 'audio', 'media', 'episode', 'series', 'season',
        'network', 'rss', 'feed', 'classification', 'genre', 'language', 'rating',
        'credit', 'person', 'image', 'media_asset', 'streaming', 'content',
      ],
      toolNames: [
        'list_series', 'get_series',
        'list_episodes', 'get_episode', 'get_next_episode', 'get_previous_episode',
        'list_seasons', 'get_season',
        'list_networks', 'get_network',
        'list_people', 'get_person',
        'list_classifications', 'get_classification',
        'list_classification_inclusions', 'get_classification_inclusion',
        'list_credits', 'get_credit',
        'list_images', 'get_image',
        'list_media_assets', 'get_media_asset',
      ],
      description: 'ART19 podcast content API: browse series, episodes, seasons, networks, people, classifications, and media assets.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_series',
        description: 'List podcast series with optional pagination and sort; returns series metadata including title, description, and episode count',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: { type: 'number', description: 'Page number (starting at 1)' },
            page_size: { type: 'number', description: 'Results per page (max 100, default 25)' },
            sort: { type: 'string', description: 'Sort field (e.g. created_at, title)' },
          },
        },
      },
      {
        name: 'get_series',
        description: 'Get full details of a specific podcast series by its UUID including title, description, and relationships',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UUID of the series' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_episodes',
        description: 'List podcast episodes with optional pagination and sort; returns episode metadata including title, description, and audio links',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: { type: 'number', description: 'Page number (starting at 1)' },
            page_size: { type: 'number', description: 'Results per page (max 100, default 25)' },
            sort: { type: 'string', description: 'Sort field (e.g. created_at, title, published_at)' },
          },
        },
      },
      {
        name: 'get_episode',
        description: 'Get full details of a specific podcast episode by its UUID including audio URL, duration, and transcript links',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UUID of the episode' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_next_episode',
        description: 'Get the next sibling episode in the same series after the given episode UUID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UUID of the current episode' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_previous_episode',
        description: 'Get the previous sibling episode in the same series before the given episode UUID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UUID of the current episode' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_seasons',
        description: 'List podcast seasons with optional pagination; returns season metadata including season number, title, and series relationship',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: { type: 'number', description: 'Page number (starting at 1)' },
            page_size: { type: 'number', description: 'Results per page (max 100, default 25)' },
            sort: { type: 'string', description: 'Sort field (e.g. created_at, season_number)' },
          },
        },
      },
      {
        name: 'get_season',
        description: 'Get full details of a specific podcast season by its UUID including episode list and series link',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UUID of the season' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_networks',
        description: 'List podcast networks/publishers with optional pagination; returns network metadata including name and member series',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: { type: 'number', description: 'Page number (starting at 1)' },
            page_size: { type: 'number', description: 'Results per page (max 100, default 25)' },
            sort: { type: 'string', description: 'Sort field (e.g. created_at, name)' },
          },
        },
      },
      {
        name: 'get_network',
        description: 'Get full details of a specific podcast network by its UUID including member series and contact information',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UUID of the network' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_people',
        description: 'List people (hosts, guests, producers) associated with podcast content with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: { type: 'number', description: 'Page number (starting at 1)' },
            page_size: { type: 'number', description: 'Results per page (max 100, default 25)' },
            sort: { type: 'string', description: 'Sort field (e.g. created_at, name)' },
          },
        },
      },
      {
        name: 'get_person',
        description: 'Get full details of a specific person by UUID including biography, social links, and content credits',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UUID of the person' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_classifications',
        description: 'List content classifications (genres, languages, ratings, industries) with optional pagination and sort',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: { type: 'number', description: 'Page number (starting at 1)' },
            page_size: { type: 'number', description: 'Results per page (max 100, default 25)' },
            sort: { type: 'string', description: 'Sort field (e.g. created_at, value)' },
          },
        },
      },
      {
        name: 'get_classification',
        description: 'Get details of a specific classification by UUID including type (Genre, Language, MediaRating, etc.) and display name',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UUID of the classification' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_classification_inclusions',
        description: 'List classification inclusions linking classifications to series, episodes, or seasons — filter by classification_id, classified_id, classified_type, or classification_type',
        inputSchema: {
          type: 'object',
          properties: {
            classification_id: { type: 'string', description: 'Filter by classification UUID' },
            classification_type: { type: 'string', description: 'Filter by type: AlternateFeedType, Genre, Industry, Language, MediaRating' },
            classified_id: { type: 'string', description: 'Filter by the classified resource UUID (series, episode, season)' },
            classified_type: { type: 'string', description: 'Filter by classified resource type: Series, Season, Episode' },
            q: { type: 'string', description: 'Search by classification value (case-insensitive)' },
            page_number: { type: 'number', description: 'Page number (starting at 1)' },
            page_size: { type: 'number', description: 'Results per page (max 100, default 25)' },
          },
        },
      },
      {
        name: 'get_classification_inclusion',
        description: 'Get details of a specific classification inclusion by UUID showing the classification-to-resource link',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UUID of the classification inclusion' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_credits',
        description: 'List credits associating people with podcast content (host, guest, producer roles) with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: { type: 'number', description: 'Page number (starting at 1)' },
            page_size: { type: 'number', description: 'Results per page (max 100, default 25)' },
            sort: { type: 'string', description: 'Sort field (e.g. created_at)' },
          },
        },
      },
      {
        name: 'get_credit',
        description: 'Get details of a specific credit by UUID showing person-to-content relationship and role',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UUID of the credit' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_images',
        description: 'List images (artwork, thumbnails) associated with podcast content with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: { type: 'number', description: 'Page number (starting at 1)' },
            page_size: { type: 'number', description: 'Results per page (max 100, default 25)' },
            sort: { type: 'string', description: 'Sort field (e.g. created_at)' },
          },
        },
      },
      {
        name: 'get_image',
        description: 'Get details of a specific image by UUID including CDN URL, dimensions, and associated content',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UUID of the image' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_media_assets',
        description: 'List media assets (audio files, transcripts) for podcast content with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: { type: 'number', description: 'Page number (starting at 1)' },
            page_size: { type: 'number', description: 'Results per page (max 100, default 25)' },
            sort: { type: 'string', description: 'Sort field (e.g. created_at)' },
          },
        },
      },
      {
        name: 'get_media_asset',
        description: 'Get details of a specific media asset by UUID including file URL, duration, encoding format, and associated episode',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'UUID of the media asset' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_series':                       return this.listCollection('/series', args);
        case 'get_series':                        return this.getById('/series', args);
        case 'list_episodes':                     return this.listCollection('/episodes', args);
        case 'get_episode':                       return this.getById('/episodes', args);
        case 'get_next_episode':                  return this.getEpisodeSibling(args, 'next_sibling');
        case 'get_previous_episode':              return this.getEpisodeSibling(args, 'previous_sibling');
        case 'list_seasons':                      return this.listCollection('/seasons', args);
        case 'get_season':                        return this.getById('/seasons', args);
        case 'list_networks':                     return this.listCollection('/networks', args);
        case 'get_network':                       return this.getById('/networks', args);
        case 'list_people':                       return this.listCollection('/people', args);
        case 'get_person':                        return this.getById('/people', args);
        case 'list_classifications':              return this.listCollection('/classifications', args);
        case 'get_classification':                return this.getById('/classifications', args);
        case 'list_classification_inclusions':    return this.listClassificationInclusions(args);
        case 'get_classification_inclusion':      return this.getById('/classification_inclusions', args);
        case 'list_credits':                      return this.listCollection('/credits', args);
        case 'get_credit':                        return this.getById('/credits', args);
        case 'list_images':                       return this.listCollection('/images', args);
        case 'get_image':                         return this.getById('/images', args);
        case 'list_media_assets':                 return this.listCollection('/media_assets', args);
        case 'get_media_asset':                   return this.getById('/media_assets', args);
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

  private headers(): Record<string, string> {
    return {
      'Accept': 'application/vnd.api+json',
      'Authorization': `Token token="${this.token}", credential="${this.credential}"`,
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.headers(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ART19 returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildListPath(basePath: string, args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    if (args.page_number !== undefined) params.set('page[number]', String(args.page_number));
    if (args.page_size !== undefined) params.set('page[size]', String(args.page_size));
    if (args.sort !== undefined) params.set('sort', String(args.sort));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  private async listCollection(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(this.buildListPath(basePath, args));
  }

  private async getById(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.get(`${basePath}/${encodeURIComponent(args.id as string)}`);
  }

  private async getEpisodeSibling(args: Record<string, unknown>, sibling: 'next_sibling' | 'previous_sibling'): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.get(`/episodes/${encodeURIComponent(args.id as string)}/${sibling}`);
  }

  private async listClassificationInclusions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.classification_id !== undefined) params.set('classification_id', String(args.classification_id));
    if (args.classification_type !== undefined) params.set('classification_type', String(args.classification_type));
    if (args.classified_id !== undefined) params.set('classified_id', String(args.classified_id));
    if (args.classified_type !== undefined) params.set('classified_type', String(args.classified_type));
    if (args.q !== undefined) params.set('q', String(args.q));
    if (args.page_number !== undefined) params.set('page[number]', String(args.page_number));
    if (args.page_size !== undefined) params.set('page[size]', String(args.page_size));
    const qs = params.toString();
    return this.get(qs ? `/classification_inclusions?${qs}` : '/classification_inclusions');
  }
}
