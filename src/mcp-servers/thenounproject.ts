/**
 * The Noun Project MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official The Noun Project MCP server found on GitHub.
//
// Base URL: http://api.thenounproject.com
// Auth: OAuth 1.0a — Authorization header (OAuth signature)
//       Generate API keys at https://thenounproject.com/developers/apps/
//       This adapter accepts a pre-signed Authorization header for OAuth 1.0a.
// Docs: https://api.thenounproject.com/documentation.html
// Rate limits: 30 requests/hour on free tier; higher limits on paid plans.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TheNounProjectConfig {
  authHeader: string;
  baseUrl?: string;
}

export class TheNounProjectMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: TheNounProjectConfig) {
    super();
    this.authHeader = config.authHeader;
    this.baseUrl = config.baseUrl ?? 'http://api.thenounproject.com';
  }

  private get reqHeaders(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'thenounproject',
      displayName: 'The Noun Project',
      version: '1.0.0',
      category: 'design' as const,
      keywords: [
        'noun project', 'icons', 'svg icons', 'icon search', 'collections',
        'design assets', 'pictograms', 'symbol', 'iconography', 'creative assets',
      ],
      toolNames: [
        'get_icon_by_id',
        'get_icon_by_term',
        'search_icons',
        'get_recent_icons',
        'get_collection_by_id',
        'get_collection_by_slug',
        'get_collection_icons_by_id',
        'get_collection_icons_by_slug',
        'list_collections',
        'get_user_collections',
        'get_user_collection',
        'get_user_uploads',
        'get_api_usage',
      ],
      description:
        'Search and retrieve icons and collections from The Noun Project: lookup icons by ID or term, ' +
        'browse collections by ID or slug, explore user uploads and collections, and check API quota usage.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_icon_by_id',
        description: 'Retrieve a single icon from The Noun Project by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The numeric ID of the icon to retrieve',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_icon_by_term',
        description: 'Retrieve the most relevant icon for a given search term.',
        inputSchema: {
          type: 'object',
          properties: {
            term: {
              type: 'string',
              description: 'The search term to find an icon for (e.g. "coffee", "airplane")',
            },
          },
          required: ['term'],
        },
      },
      {
        name: 'search_icons',
        description: 'Search for multiple icons matching a term, with optional pagination and filters.',
        inputSchema: {
          type: 'object',
          properties: {
            term: {
              type: 'string',
              description: 'The search term to find icons for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of icons to return (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
            public_domain_only: {
              type: 'number',
              description: 'Set to 1 to return only public domain icons',
            },
          },
          required: ['term'],
        },
      },
      {
        name: 'get_recent_icons',
        description: 'Get the most recently uploaded icons from The Noun Project.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of icons to return (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_collection_by_id',
        description: 'Retrieve metadata for a specific icon collection by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The numeric ID of the collection',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_collection_by_slug',
        description: 'Retrieve metadata for a specific icon collection by its URL slug.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: {
              type: 'string',
              description: 'The URL slug of the collection (e.g. "animals", "food-and-drinks")',
            },
          },
          required: ['slug'],
        },
      },
      {
        name: 'get_collection_icons_by_id',
        description: 'Retrieve all icons within a collection by the collection\'s numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The numeric ID of the collection',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of icons to return',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_collection_icons_by_slug',
        description: 'Retrieve all icons within a collection by the collection\'s URL slug.',
        inputSchema: {
          type: 'object',
          properties: {
            slug: {
              type: 'string',
              description: 'The URL slug of the collection',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of icons to return',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
          required: ['slug'],
        },
      },
      {
        name: 'list_collections',
        description: 'List all public icon collections on The Noun Project, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of collections to return (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_user_collections',
        description: 'Retrieve all collections created by a specific user.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'The numeric ID of the user whose collections to retrieve',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_collection',
        description: 'Retrieve a specific collection belonging to a user by user ID and collection slug.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'The numeric ID of the user',
            },
            slug: {
              type: 'string',
              description: 'The slug of the collection',
            },
          },
          required: ['user_id', 'slug'],
        },
      },
      {
        name: 'get_user_uploads',
        description: 'Retrieve icons uploaded by a specific user, identified by username.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'The username of the creator',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of uploads to return',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_api_usage',
        description: 'Get the current API quota usage and limits for the authenticated account.',
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
        case 'get_icon_by_id':
          return await this.getIconById(args);
        case 'get_icon_by_term':
          return await this.getIconByTerm(args);
        case 'search_icons':
          return await this.searchIcons(args);
        case 'get_recent_icons':
          return await this.getRecentIcons(args);
        case 'get_collection_by_id':
          return await this.getCollectionById(args);
        case 'get_collection_by_slug':
          return await this.getCollectionBySlug(args);
        case 'get_collection_icons_by_id':
          return await this.getCollectionIconsById(args);
        case 'get_collection_icons_by_slug':
          return await this.getCollectionIconsBySlug(args);
        case 'list_collections':
          return await this.listCollections(args);
        case 'get_user_collections':
          return await this.getUserCollections(args);
        case 'get_user_collection':
          return await this.getUserCollection(args);
        case 'get_user_uploads':
          return await this.getUserUploads(args);
        case 'get_api_usage':
          return await this.getApiUsage();
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async request(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const qs = params && params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'GET',
      headers: this.reqHeaders,
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `The Noun Project API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const txt = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: this.truncate(txt || JSON.stringify({ status: response.status })) }],
        isError: false,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private paginationParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.limit !== undefined) params.set('limit', String(args.limit as number));
    if (args.offset !== undefined) params.set('offset', String(args.offset as number));
    return params;
  }

  private async getIconById(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request(`/icon/${encodeURIComponent(String(id))}`);
  }

  private async getIconByTerm(args: Record<string, unknown>): Promise<ToolResult> {
    const term = args.term as string;
    if (!term) {
      return { content: [{ type: 'text', text: 'term is required' }], isError: true };
    }
    return this.request(`/icon/${encodeURIComponent(term)}`);
  }

  private async searchIcons(args: Record<string, unknown>): Promise<ToolResult> {
    const term = args.term as string;
    if (!term) {
      return { content: [{ type: 'text', text: 'term is required' }], isError: true };
    }
    const params = this.paginationParams(args);
    if (args.public_domain_only !== undefined) {
      params.set('public_domain_only', String(args.public_domain_only as number));
    }
    return this.request(`/icons/${encodeURIComponent(term)}`, params);
  }

  private async getRecentIcons(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    return this.request('/icons/recent_uploads', params.toString() ? params : undefined);
  }

  private async getCollectionById(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request(`/collection/${encodeURIComponent(String(id))}`);
  }

  private async getCollectionBySlug(args: Record<string, unknown>): Promise<ToolResult> {
    const slug = args.slug as string;
    if (!slug) {
      return { content: [{ type: 'text', text: 'slug is required' }], isError: true };
    }
    return this.request(`/collection/${encodeURIComponent(slug)}`);
  }

  private async getCollectionIconsById(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const params = this.paginationParams(args);
    return this.request(`/collection/${encodeURIComponent(String(id))}/icons`, params.toString() ? params : undefined);
  }

  private async getCollectionIconsBySlug(args: Record<string, unknown>): Promise<ToolResult> {
    const slug = args.slug as string;
    if (!slug) {
      return { content: [{ type: 'text', text: 'slug is required' }], isError: true };
    }
    const params = this.paginationParams(args);
    return this.request(`/collection/${encodeURIComponent(slug)}/icons`, params.toString() ? params : undefined);
  }

  private async listCollections(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    return this.request('/collections', params.toString() ? params : undefined);
  }

  private async getUserCollections(args: Record<string, unknown>): Promise<ToolResult> {
    const user_id = args.user_id as number;
    if (user_id === undefined || user_id === null) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    return this.request(`/user/${encodeURIComponent(String(user_id))}/collections`);
  }

  private async getUserCollection(args: Record<string, unknown>): Promise<ToolResult> {
    const user_id = args.user_id as number;
    const slug = args.slug as string;
    if (user_id === undefined || user_id === null || !slug) {
      return { content: [{ type: 'text', text: 'user_id and slug are required' }], isError: true };
    }
    return this.request(`/user/${encodeURIComponent(String(user_id))}/collections/${encodeURIComponent(slug)}`);
  }

  private async getUserUploads(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    if (!username) {
      return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    }
    const params = this.paginationParams(args);
    return this.request(`/user/${encodeURIComponent(username)}/uploads`, params.toString() ? params : undefined);
  }

  private async getApiUsage(): Promise<ToolResult> {
    return this.request('/oauth/usage');
  }
}
