/**
 * Shutterstock MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official Shutterstock MCP server exists as of March 2026.
// Our adapter covers: 12 tools across image search/license, video search/license,
//   audio search/license, contributor lookup, and catalog search.
//   Community servers: none found covering Shutterstock v2 API.
// Recommendation: Use this adapter for full Shutterstock API v2 coverage.
//
// Base URL: https://api.shutterstock.com
// Auth: OAuth2 Bearer token (customer_accessCode) OR Basic auth (clientId:clientSecret).
//   Pass bearer token as `apiToken` OR pass `clientId`+`clientSecret` for basic auth.
// Docs: https://api-reference.shutterstock.com/
// Rate limits: Standard ~250 req/min. Enterprise: contact Shutterstock.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ShutterstockConfig {
  /** OAuth2 Bearer token (preferred) */
  apiToken?: string;
  /** Basic auth client ID */
  clientId?: string;
  /** Basic auth client secret */
  clientSecret?: string;
  /** Optional base URL override (default: https://api.shutterstock.com) */
  baseUrl?: string;
}

export class ShutterstockMCPServer extends MCPAdapterBase {
  private readonly apiToken?: string;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly baseUrl: string;

  constructor(config: ShutterstockConfig) {
    super();
    this.apiToken = config.apiToken;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://api.shutterstock.com';
  }

  static catalog() {
    return {
      name: 'shutterstock',
      displayName: 'Shutterstock',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'shutterstock', 'stock', 'photo', 'image', 'video', 'audio', 'music',
        'license', 'download', 'editorial', 'royalty-free', 'contributor',
        'collection', 'search', 'media', 'footage', 'track', 'sfx',
      ],
      toolNames: [
        'search_images', 'get_image', 'license_images', 'download_image',
        'search_videos', 'get_video', 'license_videos',
        'search_tracks', 'get_track', 'license_tracks',
        'get_contributor', 'search_catalog',
      ],
      description: 'Search and license Shutterstock stock photos, videos, and audio tracks. Supports image/video/audio search, licensing, downloads, contributor info, and catalog search.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_images',
        description: 'Search Shutterstock stock images by keyword, orientation, type, category, or color — returns image metadata and preview URLs',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords (e.g. "mountain sunset", "business meeting")',
            },
            orientation: {
              type: 'string',
              description: 'Image orientation filter: horizontal, vertical, or square',
            },
            image_type: {
              type: 'string',
              description: 'Type of image: photo, illustration, or vector',
            },
            category: {
              type: 'string',
              description: 'Category to filter results (e.g. "Nature", "Business")',
            },
            color: {
              type: 'string',
              description: 'Hex color to find images with similar colors (e.g. "ff0000")',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            safe: {
              type: 'boolean',
              description: 'Enable safe search to exclude explicit content (default: true)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: newest, popular, relevance, or random (default: popular)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_image',
        description: 'Get full metadata for a specific Shutterstock image by ID — description, categories, keywords, and available sizes',
        inputSchema: {
          type: 'object',
          properties: {
            image_id: {
              type: 'string',
              description: 'Shutterstock image ID (e.g. "1234567890")',
            },
            view: {
              type: 'string',
              description: 'Response detail level: minimal or full (default: minimal)',
            },
          },
          required: ['image_id'],
        },
      },
      {
        name: 'license_images',
        description: 'License one or more Shutterstock images — requires a valid subscription. Returns download URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            image_ids: {
              type: 'array',
              description: 'Array of image IDs to license (e.g. ["1234567890"])',
              items: { type: 'string' },
            },
            subscription_id: {
              type: 'string',
              description: 'Subscription ID to use for licensing (from user subscriptions)',
            },
            size: {
              type: 'string',
              description: 'Image size: small, medium, large, huge, or vector (default: huge)',
            },
            format: {
              type: 'string',
              description: 'Image format: jpg or eps (default: jpg)',
            },
          },
          required: ['image_ids'],
        },
      },
      {
        name: 'download_image',
        description: 'Download a previously licensed Shutterstock image by its license ID — returns a direct download URL',
        inputSchema: {
          type: 'object',
          properties: {
            license_id: {
              type: 'string',
              description: 'License ID from a license_images response',
            },
          },
          required: ['license_id'],
        },
      },
      {
        name: 'search_videos',
        description: 'Search Shutterstock stock video footage by keyword, resolution, aspect ratio, and duration',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords (e.g. "aerial city", "slow motion water")',
            },
            resolution: {
              type: 'string',
              description: 'Video resolution filter: 4k, high_definition, or standard_definition',
            },
            aspect_ratio: {
              type: 'string',
              description: 'Video aspect ratio: 4_3, 16_9, or nonstandard',
            },
            duration_from: {
              type: 'number',
              description: 'Minimum clip duration in seconds',
            },
            duration_to: {
              type: 'number',
              description: 'Maximum clip duration in seconds',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: newest, popular, relevance, or random (default: popular)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_video',
        description: 'Get full metadata for a specific Shutterstock video clip by ID — duration, resolution, contributors, and preview URLs',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'Shutterstock video ID',
            },
            view: {
              type: 'string',
              description: 'Response detail level: minimal or full (default: minimal)',
            },
          },
          required: ['video_id'],
        },
      },
      {
        name: 'license_videos',
        description: 'License one or more Shutterstock video clips — requires a valid subscription. Returns download URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            video_ids: {
              type: 'array',
              description: 'Array of video IDs to license',
              items: { type: 'string' },
            },
            subscription_id: {
              type: 'string',
              description: 'Subscription ID to use for licensing',
            },
            size: {
              type: 'string',
              description: 'Video size/resolution: web, sd, hd, or 4k (default: hd)',
            },
          },
          required: ['video_ids'],
        },
      },
      {
        name: 'search_tracks',
        description: 'Search Shutterstock stock music and audio tracks by keyword, genre, mood, instrument, and BPM',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords (e.g. "upbeat corporate", "cinematic dramatic")',
            },
            genre: {
              type: 'array',
              description: 'Genres to filter by (e.g. ["classical", "jazz", "rock"])',
              items: { type: 'string' },
            },
            moods: {
              type: 'array',
              description: 'Moods to filter by (e.g. ["energetic", "calm", "uplifting"])',
              items: { type: 'string' },
            },
            bpm_from: {
              type: 'number',
              description: 'Minimum beats per minute',
            },
            bpm_to: {
              type: 'number',
              description: 'Maximum beats per minute',
            },
            duration_from: {
              type: 'number',
              description: 'Minimum track duration in seconds',
            },
            duration_to: {
              type: 'number',
              description: 'Maximum track duration in seconds',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_track',
        description: 'Get full metadata for a specific Shutterstock audio track by ID — BPM, duration, genre, mood, and preview URL',
        inputSchema: {
          type: 'object',
          properties: {
            track_id: {
              type: 'string',
              description: 'Shutterstock audio track ID',
            },
          },
          required: ['track_id'],
        },
      },
      {
        name: 'license_tracks',
        description: 'License one or more Shutterstock audio tracks — requires a valid subscription. Returns download URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            track_ids: {
              type: 'array',
              description: 'Array of audio track IDs to license',
              items: { type: 'string' },
            },
            subscription_id: {
              type: 'string',
              description: 'Subscription ID to use for licensing',
            },
            license: {
              type: 'string',
              description: 'License type: audio_platform, premier_music_basic, premier_music_extended, premier_music_pro, premier_music_comp, or standard (default: standard)',
            },
          },
          required: ['track_ids'],
        },
      },
      {
        name: 'get_contributor',
        description: 'Get profile details about a Shutterstock contributor (photographer, videographer, or musician) by contributor ID',
        inputSchema: {
          type: 'object',
          properties: {
            contributor_id: {
              type: 'string',
              description: 'Shutterstock contributor ID',
            },
          },
          required: ['contributor_id'],
        },
      },
      {
        name: 'search_catalog',
        description: 'Search across all Shutterstock asset types (images, videos, audio) in catalog collections',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keywords across all media types',
            },
            asset_type: {
              type: 'array',
              description: 'Filter by asset types: image, video, or audio',
              items: { type: 'string' },
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 500)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: newest, popular, or relevance (default: relevance)',
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
        case 'search_images':    return this.searchImages(args);
        case 'get_image':        return this.getImage(args);
        case 'license_images':   return this.licenseImages(args);
        case 'download_image':   return this.downloadImage(args);
        case 'search_videos':    return this.searchVideos(args);
        case 'get_video':        return this.getVideo(args);
        case 'license_videos':   return this.licenseVideos(args);
        case 'search_tracks':    return this.searchTracks(args);
        case 'get_track':        return this.getTrack(args);
        case 'license_tracks':   return this.licenseTracks(args);
        case 'get_contributor':  return this.getContributor(args);
        case 'search_catalog':   return this.searchCatalog(args);
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

  private authHeaders(): Record<string, string> {
    if (this.apiToken) {
      return { Authorization: `Bearer ${this.apiToken}` };
    }
    if (this.clientId && this.clientSecret) {
      const encoded = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      return { Authorization: `Basic ${encoded}` };
    }
    return {};
  }

  private async get(path: string, params: Record<string, string | number | boolean | string[] | undefined> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) {
        for (const item of v) qs.append(k, item);
      } else {
        qs.set(k, String(v));
      }
    }
    const url = `${this.baseUrl}${path}?${qs.toString()}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { ...this.authHeaders(), Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Shutterstock returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Shutterstock returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchImages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.get('/v2/images/search', {
      query: args.query as string,
      orientation: args.orientation as string | undefined,
      image_type: args.image_type as string | undefined,
      category: args.category as string | undefined,
      color: args.color as string | undefined,
      per_page: args.per_page as number | undefined,
      page: args.page as number | undefined,
      safe: args.safe !== false ? 'true' : 'false',
      sort: (args.sort as string) ?? 'popular',
      view: 'minimal',
    });
  }

  private async getImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.image_id) return { content: [{ type: 'text', text: 'image_id is required' }], isError: true };
    return this.get(`/v2/images/${encodeURIComponent(args.image_id as string)}`, {
      view: (args.view as string) ?? 'minimal',
    });
  }

  private async licenseImages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.image_ids || !Array.isArray(args.image_ids) || args.image_ids.length === 0) {
      return { content: [{ type: 'text', text: 'image_ids array is required' }], isError: true };
    }
    const images = (args.image_ids as string[]).map(id => ({
      image_id: id,
      subscription_id: args.subscription_id,
      format: (args.format as string) ?? 'jpg',
      size: (args.size as string) ?? 'huge',
    }));
    return this.post('/v2/images/licenses', { images });
  }

  private async downloadImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.license_id) return { content: [{ type: 'text', text: 'license_id is required' }], isError: true };
    return this.post(`/v2/images/licenses/${encodeURIComponent(args.license_id as string)}/downloads`, {});
  }

  private async searchVideos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.get('/v2/videos/search', {
      query: args.query as string,
      resolution: args.resolution as string | undefined,
      aspect_ratio: args.aspect_ratio as string | undefined,
      duration_from: args.duration_from as number | undefined,
      duration_to: args.duration_to as number | undefined,
      per_page: args.per_page as number | undefined,
      page: args.page as number | undefined,
      sort: (args.sort as string) ?? 'popular',
      view: 'minimal',
    });
  }

  private async getVideo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    return this.get(`/v2/videos/${encodeURIComponent(args.video_id as string)}`, {
      view: (args.view as string) ?? 'minimal',
    });
  }

  private async licenseVideos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_ids || !Array.isArray(args.video_ids) || args.video_ids.length === 0) {
      return { content: [{ type: 'text', text: 'video_ids array is required' }], isError: true };
    }
    const videos = (args.video_ids as string[]).map(id => ({
      video_id: id,
      subscription_id: args.subscription_id,
      size: (args.size as string) ?? 'hd',
    }));
    return this.post('/v2/videos/licenses', { videos });
  }

  private async searchTracks(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | string[] | undefined> = {
      per_page: args.per_page as number | undefined,
      page: args.page as number | undefined,
    };
    if (args.query) params.query = args.query as string;
    if (args.genre && Array.isArray(args.genre)) params['genre[]'] = args.genre as string[];
    if (args.moods && Array.isArray(args.moods)) params['moods[]'] = args.moods as string[];
    if (args.bpm_from !== undefined) params.bpm_from = args.bpm_from as number;
    if (args.bpm_to !== undefined) params.bpm_to = args.bpm_to as number;
    if (args.duration_from !== undefined) params.duration_from = args.duration_from as number;
    if (args.duration_to !== undefined) params.duration_to = args.duration_to as number;
    return this.get('/v2/audio/search', params);
  }

  private async getTrack(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.track_id) return { content: [{ type: 'text', text: 'track_id is required' }], isError: true };
    return this.get(`/v2/audio/${encodeURIComponent(args.track_id as string)}`);
  }

  private async licenseTracks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.track_ids || !Array.isArray(args.track_ids) || args.track_ids.length === 0) {
      return { content: [{ type: 'text', text: 'track_ids array is required' }], isError: true };
    }
    const audio = (args.track_ids as string[]).map(id => ({
      audio_id: id,
      subscription_id: args.subscription_id,
      license: (args.license as string) ?? 'standard',
    }));
    return this.post('/v2/audio/licenses', { audio });
  }

  private async getContributor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contributor_id) return { content: [{ type: 'text', text: 'contributor_id is required' }], isError: true };
    return this.get(`/v2/contributors/${encodeURIComponent(args.contributor_id as string)}`);
  }

  private async searchCatalog(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string | number | string[] | undefined> = {
      query: args.query as string,
      per_page: args.per_page as number | undefined,
      page: args.page as number | undefined,
      sort: (args.sort as string) ?? 'relevance',
    };
    if (args.asset_type && Array.isArray(args.asset_type)) {
      params['asset_type'] = args.asset_type as string[];
    }
    return this.get('/v2/catalog/search', params);
  }
}
