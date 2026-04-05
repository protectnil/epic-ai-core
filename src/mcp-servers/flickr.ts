/**
 * Flickr MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official Flickr MCP server was found on GitHub.
//
// Base URL: https://api.flickr.com/services
// Auth: API Key — pass api_key as query parameter (read operations).
//       OAuth 1.0a required for write operations (upload, favorites, etc.).
// Docs: https://www.flickr.com/services/api/
// Rate limits: ~3600 requests/hour per API key for free accounts.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FlickrConfig {
  apiKey: string;
  baseUrl?: string;
}

export class FlickrMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: FlickrConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.flickr.com/services';
  }

  static catalog() {
    return {
      name: 'flickr',
      displayName: 'Flickr',
      version: '1.0.0',
      category: 'media' as const,
      keywords: [
        'flickr', 'photo', 'image', 'photography', 'album', 'photoset',
        'gallery', 'people', 'groups', 'favorites', 'tags', 'search',
        'exif', 'sizes', 'licenses', 'upload', 'media',
      ],
      toolNames: [
        'search_photos',
        'get_photo_info',
        'get_photo_sizes',
        'get_photo_exif',
        'get_person_info',
        'get_person_photos',
        'get_favorites',
        'get_photoset_photos',
        'list_photosets',
        'get_gallery_photos',
        'get_group_info',
        'get_group_photos',
        'get_licenses',
      ],
      description:
        'Search and browse Flickr photos, albums, galleries, and groups. Retrieve photo metadata, ' +
        'EXIF data, available sizes, user profiles, favorites, and licensing information.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_photos',
        description:
          'Search Flickr photos by text, tags, user, date range, or license. Returns photo IDs, titles, and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Free-text search query against titles, descriptions, and tags',
            },
            tags: {
              type: 'string',
              description: 'Comma-delimited list of tags to search for',
            },
            user_id: {
              type: 'string',
              description: 'Flickr user NSID to limit search to a specific user',
            },
            license: {
              type: 'string',
              description: 'Comma-separated license IDs (e.g. "1,2,3"). Use get_licenses to list available IDs.',
            },
            sort: {
              type: 'string',
              description: 'Sort order: date-posted-asc, date-posted-desc, date-taken-asc, date-taken-desc, interestingness-asc, interestingness-desc, relevance',
            },
            min_upload_date: {
              type: 'string',
              description: 'Minimum upload date as Unix timestamp',
            },
            max_upload_date: {
              type: 'string',
              description: 'Maximum upload date as Unix timestamp',
            },
            min_taken_date: {
              type: 'string',
              description: 'Minimum taken date in MySQL datetime format (YYYY-MM-DD HH:MM:SS)',
            },
            max_taken_date: {
              type: 'string',
              description: 'Maximum taken date in MySQL datetime format (YYYY-MM-DD HH:MM:SS)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 500, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number to retrieve (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_photo_info',
        description:
          'Retrieve full metadata for a Flickr photo by its ID: title, description, dates, tags, owner, and visibility.',
        inputSchema: {
          type: 'object',
          properties: {
            photo_id: {
              type: 'string',
              description: 'Flickr photo ID',
            },
          },
          required: ['photo_id'],
        },
      },
      {
        name: 'get_photo_sizes',
        description:
          'Get all available sizes (URLs, dimensions) for a Flickr photo. Returns original, square, thumbnail, small, medium, large sizes.',
        inputSchema: {
          type: 'object',
          properties: {
            photo_id: {
              type: 'string',
              description: 'Flickr photo ID',
            },
          },
          required: ['photo_id'],
        },
      },
      {
        name: 'get_photo_exif',
        description:
          'Retrieve EXIF/IPTC/XMP metadata embedded in a Flickr photo (camera model, lens, exposure, ISO, GPS, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            photo_id: {
              type: 'string',
              description: 'Flickr photo ID',
            },
          },
          required: ['photo_id'],
        },
      },
      {
        name: 'get_person_info',
        description:
          'Get public profile information for a Flickr user: display name, location, photo count, and pro status.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Flickr user NSID (e.g. "12345678@N00")',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_person_photos',
        description:
          'List public photos uploaded by a specific Flickr user, with optional date and content-type filters.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Flickr user NSID',
            },
            safe_search: {
              type: 'number',
              description: 'Safe search setting: 1=safe, 2=moderate, 3=restricted',
            },
            min_upload_date: {
              type: 'string',
              description: 'Minimum upload date as Unix timestamp',
            },
            max_upload_date: {
              type: 'string',
              description: 'Maximum upload date as Unix timestamp',
            },
            content_type: {
              type: 'number',
              description: 'Content type filter: 1=photos only, 2=screenshots only, 3=other, 4=all',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 500, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_favorites',
        description:
          'Retrieve the public favorites list for a Flickr user.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Flickr user NSID whose favorites to retrieve',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 500, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_photoset_photos',
        description:
          'List all photos in a Flickr photoset (album) by photoset ID and owner.',
        inputSchema: {
          type: 'object',
          properties: {
            photoset_id: {
              type: 'string',
              description: 'Flickr photoset (album) ID',
            },
            user_id: {
              type: 'string',
              description: 'NSID of the owner of the photoset',
            },
            per_page: {
              type: 'number',
              description: 'Number of photos per page (max 500, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['photoset_id', 'user_id'],
        },
      },
      {
        name: 'list_photosets',
        description:
          'List all photosets (albums) created by a Flickr user.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Flickr user NSID',
            },
            per_page: {
              type: 'number',
              description: 'Number of photosets per page (max 500, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_gallery_photos',
        description:
          'Retrieve all photos in a Flickr gallery by gallery ID.',
        inputSchema: {
          type: 'object',
          properties: {
            gallery_id: {
              type: 'string',
              description: 'Flickr gallery ID',
            },
            per_page: {
              type: 'number',
              description: 'Number of photos per page (max 500, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['gallery_id'],
        },
      },
      {
        name: 'get_group_info',
        description:
          'Retrieve public profile information for a Flickr group: name, description, member count, and rules.',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Flickr group NSID or group URL alias',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_group_photos',
        description:
          'List photos in a Flickr group pool, with optional tag filtering.',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Flickr group NSID',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated list of tags to filter group pool photos',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 500, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_licenses',
        description:
          'Retrieve the full list of photo licenses available on Flickr with their IDs, names, and URLs.',
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
        case 'search_photos':
          return await this.searchPhotos(args);
        case 'get_photo_info':
          return await this.getPhotoInfo(args);
        case 'get_photo_sizes':
          return await this.getPhotoSizes(args);
        case 'get_photo_exif':
          return await this.getPhotoExif(args);
        case 'get_person_info':
          return await this.getPersonInfo(args);
        case 'get_person_photos':
          return await this.getPersonPhotos(args);
        case 'get_favorites':
          return await this.getFavorites(args);
        case 'get_photoset_photos':
          return await this.getPhotosetPhotos(args);
        case 'list_photosets':
          return await this.listPhotosets(args);
        case 'get_gallery_photos':
          return await this.getGalleryPhotos(args);
        case 'get_group_info':
          return await this.getGroupInfo(args);
        case 'get_group_photos':
          return await this.getGroupPhotos(args);
        case 'get_licenses':
          return await this.getLicenses();
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

  private baseParams(method: string): URLSearchParams {
    return new URLSearchParams({
      method,
      api_key: this.apiKey,
      format: 'json',
      nojsoncallback: '1',
    });
  }

  private async request(params: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}/rest?${params.toString()}`;
    const response = await this.fetchWithRetry(url, { method: 'GET' });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Flickr API error ${response.status} ${response.statusText}: ${errText}`,
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
        content: [{ type: 'text', text: this.truncate(txt) }],
        isError: false,
      };
    }

    // Flickr wraps errors in the JSON body with stat: "fail"
    if (data && typeof data === 'object' && (data as Record<string, unknown>).stat === 'fail') {
      const err = data as Record<string, unknown>;
      return {
        content: [
          {
            type: 'text',
            text: `Flickr API error ${err.code}: ${err.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async searchPhotos(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.baseParams('flickr.photos.search');
    if (args.text) params.set('text', args.text as string);
    if (args.tags) params.set('tags', args.tags as string);
    if (args.user_id) params.set('user_id', args.user_id as string);
    if (args.license) params.set('license', args.license as string);
    if (args.sort) params.set('sort', args.sort as string);
    if (args.min_upload_date) params.set('min_upload_date', args.min_upload_date as string);
    if (args.max_upload_date) params.set('max_upload_date', args.max_upload_date as string);
    if (args.min_taken_date) params.set('min_taken_date', args.min_taken_date as string);
    if (args.max_taken_date) params.set('max_taken_date', args.max_taken_date as string);
    if (args.per_page) params.set('per_page', String(args.per_page as number));
    if (args.page) params.set('page', String(args.page as number));
    return this.request(params);
  }

  private async getPhotoInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const photoId = args.photo_id as string;
    if (!photoId) {
      return { content: [{ type: 'text', text: 'photo_id is required' }], isError: true };
    }
    const params = this.baseParams('flickr.photos.getInfo');
    params.set('photo_id', photoId);
    return this.request(params);
  }

  private async getPhotoSizes(args: Record<string, unknown>): Promise<ToolResult> {
    const photoId = args.photo_id as string;
    if (!photoId) {
      return { content: [{ type: 'text', text: 'photo_id is required' }], isError: true };
    }
    const params = this.baseParams('flickr.photos.getSizes');
    params.set('photo_id', photoId);
    return this.request(params);
  }

  private async getPhotoExif(args: Record<string, unknown>): Promise<ToolResult> {
    const photoId = args.photo_id as string;
    if (!photoId) {
      return { content: [{ type: 'text', text: 'photo_id is required' }], isError: true };
    }
    const params = this.baseParams('flickr.photos.getExif');
    params.set('photo_id', photoId);
    return this.request(params);
  }

  private async getPersonInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    const params = this.baseParams('flickr.people.getInfo');
    params.set('user_id', userId);
    return this.request(params);
  }

  private async getPersonPhotos(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    const params = this.baseParams('flickr.people.getPhotos');
    params.set('user_id', userId);
    if (args.safe_search) params.set('safe_search', String(args.safe_search as number));
    if (args.min_upload_date) params.set('min_upload_date', args.min_upload_date as string);
    if (args.max_upload_date) params.set('max_upload_date', args.max_upload_date as string);
    if (args.content_type) params.set('content_type', String(args.content_type as number));
    if (args.per_page) params.set('per_page', String(args.per_page as number));
    if (args.page) params.set('page', String(args.page as number));
    return this.request(params);
  }

  private async getFavorites(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    const params = this.baseParams('flickr.favorites.getList');
    params.set('user_id', userId);
    if (args.per_page) params.set('per_page', String(args.per_page as number));
    if (args.page) params.set('page', String(args.page as number));
    return this.request(params);
  }

  private async getPhotosetPhotos(args: Record<string, unknown>): Promise<ToolResult> {
    const photosetId = args.photoset_id as string;
    const userId = args.user_id as string;
    if (!photosetId || !userId) {
      return { content: [{ type: 'text', text: 'photoset_id and user_id are required' }], isError: true };
    }
    const params = this.baseParams('flickr.photosets.getPhotos');
    params.set('photoset_id', photosetId);
    params.set('user_id', userId);
    if (args.per_page) params.set('per_page', String(args.per_page as number));
    if (args.page) params.set('page', String(args.page as number));
    return this.request(params);
  }

  private async listPhotosets(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as string;
    if (!userId) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    const params = this.baseParams('flickr.photosets.getList');
    params.set('user_id', userId);
    if (args.per_page) params.set('per_page', String(args.per_page as number));
    if (args.page) params.set('page', String(args.page as number));
    return this.request(params);
  }

  private async getGalleryPhotos(args: Record<string, unknown>): Promise<ToolResult> {
    const galleryId = args.gallery_id as string;
    if (!galleryId) {
      return { content: [{ type: 'text', text: 'gallery_id is required' }], isError: true };
    }
    const params = this.baseParams('flickr.galleries.getPhotos');
    params.set('gallery_id', galleryId);
    if (args.per_page) params.set('per_page', String(args.per_page as number));
    if (args.page) params.set('page', String(args.page as number));
    return this.request(params);
  }

  private async getGroupInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const groupId = args.group_id as string;
    if (!groupId) {
      return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    }
    const params = this.baseParams('flickr.groups.getInfo');
    params.set('group_id', groupId);
    return this.request(params);
  }

  private async getGroupPhotos(args: Record<string, unknown>): Promise<ToolResult> {
    const groupId = args.group_id as string;
    if (!groupId) {
      return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    }
    const params = this.baseParams('flickr.groups.pools.getPhotos');
    params.set('group_id', groupId);
    if (args.tags) params.set('tags', args.tags as string);
    if (args.per_page) params.set('per_page', String(args.per_page as number));
    if (args.page) params.set('page', String(args.page as number));
    return this.request(params);
  }

  private async getLicenses(): Promise<ToolResult> {
    const params = this.baseParams('flickr.photos.licenses.getInfo');
    return this.request(params);
  }
}
