/**
 * Vimeo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Vimeo MCP server was found on GitHub or npm. Community wrappers exist (viasocket.com,
//   lobehub.com) but no vendor-published MCP server found on GitHub or npm.
//
// Base URL: https://api.vimeo.com
// Auth: OAuth2 Bearer token (access_token). Personal Access Tokens supported for server-side use.
// Docs: https://developer.vimeo.com/api/reference
// Rate limits: 600 requests per 10 minutes per user. Exceeding returns HTTP 429 — retry with Retry-After header.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VimeoConfig {
  accessToken: string;
  baseUrl?: string;
}

export class VimeoMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: VimeoConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.vimeo.com';
  }

  static catalog() {
    return {
      name: 'vimeo',
      displayName: 'Vimeo',
      version: '1.0.0',
      category: 'misc',
      keywords: ['vimeo', 'video', 'upload', 'streaming', 'media', 'player', 'embed', 'channel', 'showcase', 'album', 'analytics', 'privacy', 'transcoding'],
      toolNames: [
        'list_videos', 'get_video', 'search_videos', 'delete_video',
        'update_video', 'get_video_analytics',
        'list_showcases', 'get_showcase', 'create_showcase', 'update_showcase',
        'list_showcase_videos', 'add_video_to_showcase',
        'list_folders', 'get_me', 'list_comments',
      ],
      description: 'Vimeo video platform: list and search videos, manage showcases and folders, retrieve analytics, update privacy settings, and handle video metadata for professional video hosting.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_videos',
        description: 'List videos in the authenticated user\'s Vimeo library with optional filters for privacy, sort, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Number of videos per page (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: alphabetical, date, default, duration, last_user_action_event_date, likes, modified_time, plays (default: date)',
            },
            direction: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
            filter: {
              type: 'string',
              description: 'Filter videos: app_only, embeddable, featured, playable (default: playable)',
            },
          },
        },
      },
      {
        name: 'get_video',
        description: 'Get complete metadata for a specific Vimeo video by video ID including title, description, privacy, and embed code',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'number',
              description: 'Numeric Vimeo video ID (e.g. 123456789)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return to reduce response size',
            },
          },
          required: ['video_id'],
        },
      },
      {
        name: 'search_videos',
        description: 'Search public Vimeo videos by keyword with optional filters for category, duration, and upload date',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            filter: {
              type: 'string',
              description: 'Content filter: CC, CC-BY, CC-BY-NC, CC-BY-NC-ND, CC-BY-NC-SA, CC-BY-ND, CC-BY-SA, CC0, or leave blank for all',
            },
            sort: {
              type: 'string',
              description: 'Sort: alphabetical, comments, date, duration, likes, plays, relevant (default: relevant)',
            },
            direction: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'delete_video',
        description: 'Permanently delete a video from Vimeo by video ID — this action cannot be undone',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'number',
              description: 'Numeric Vimeo video ID to delete',
            },
          },
          required: ['video_id'],
        },
      },
      {
        name: 'update_video',
        description: 'Update metadata for a Vimeo video including title, description, privacy settings, tags, and password',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'number',
              description: 'Numeric Vimeo video ID to update',
            },
            name: {
              type: 'string',
              description: 'New video title',
            },
            description: {
              type: 'string',
              description: 'New video description (HTML or plain text)',
            },
            privacy_view: {
              type: 'string',
              description: 'Privacy setting: anybody, contacts, disable, nobody, password, unlisted, users (default: anybody)',
            },
            privacy_password: {
              type: 'string',
              description: 'Password for password-protected videos (required when privacy_view is password)',
            },
            privacy_embed: {
              type: 'string',
              description: 'Embed privacy: public, private, whitelist (default: public)',
            },
            license: {
              type: 'string',
              description: 'Content license: by, by-nc, by-nc-nd, by-nc-sa, by-nd, by-sa, cc0, or leave empty for all rights reserved',
            },
          },
          required: ['video_id'],
        },
      },
      {
        name: 'get_video_analytics',
        description: 'Retrieve play count, view, and engagement analytics for a specific Vimeo video',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'number',
              description: 'Numeric Vimeo video ID',
            },
            dimension: {
              type: 'string',
              description: 'Analytics dimension: country, device_type, embed_domain, total (default: total)',
            },
            from: {
              type: 'string',
              description: 'Start date for analytics range (YYYY-MM-DD, default: 30 days ago)',
            },
            to: {
              type: 'string',
              description: 'End date for analytics range (YYYY-MM-DD, default: today)',
            },
          },
          required: ['video_id'],
        },
      },
      {
        name: 'list_showcases',
        description: 'List showcases (formerly albums) in the authenticated user\'s Vimeo account',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Showcases per page (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            sort: {
              type: 'string',
              description: 'Sort: alphabetical, date, duration, videos (default: date)',
            },
          },
        },
      },
      {
        name: 'get_showcase',
        description: 'Get metadata and settings for a specific Vimeo showcase by user ID and showcase ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Vimeo user ID or "me" for the authenticated user',
            },
            showcase_id: {
              type: 'number',
              description: 'Numeric Vimeo showcase ID',
            },
          },
          required: ['showcase_id'],
        },
      },
      {
        name: 'create_showcase',
        description: 'Create a new showcase (album) in the authenticated user\'s Vimeo account with title and privacy settings',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Showcase name/title',
            },
            description: {
              type: 'string',
              description: 'Showcase description',
            },
            privacy: {
              type: 'string',
              description: 'Showcase privacy: anybody, embed_only, nobody, password (default: anybody)',
            },
            password: {
              type: 'string',
              description: 'Password if privacy is set to password',
            },
            sort: {
              type: 'string',
              description: 'Default video sort in showcase: added_first, added_last, alphabetical, arranged, comments, likes, newest, oldest, plays (default: arranged)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_showcase',
        description: 'Update the name, description, privacy, or sort order of an existing Vimeo showcase',
        inputSchema: {
          type: 'object',
          properties: {
            showcase_id: {
              type: 'number',
              description: 'Numeric Vimeo showcase ID to update',
            },
            name: {
              type: 'string',
              description: 'New showcase name',
            },
            description: {
              type: 'string',
              description: 'New showcase description',
            },
            privacy: {
              type: 'string',
              description: 'Showcase privacy: anybody, embed_only, nobody, password',
            },
          },
          required: ['showcase_id'],
        },
      },
      {
        name: 'list_showcase_videos',
        description: 'List all videos contained in a specific Vimeo showcase',
        inputSchema: {
          type: 'object',
          properties: {
            showcase_id: {
              type: 'number',
              description: 'Numeric Vimeo showcase ID',
            },
            per_page: {
              type: 'number',
              description: 'Videos per page (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['showcase_id'],
        },
      },
      {
        name: 'add_video_to_showcase',
        description: 'Add an existing video to a Vimeo showcase by video ID and showcase ID',
        inputSchema: {
          type: 'object',
          properties: {
            showcase_id: {
              type: 'number',
              description: 'Numeric Vimeo showcase ID',
            },
            video_id: {
              type: 'number',
              description: 'Numeric Vimeo video ID to add',
            },
          },
          required: ['showcase_id', 'video_id'],
        },
      },
      {
        name: 'list_folders',
        description: 'List folders (projects) in the authenticated user\'s Vimeo account for organizing videos',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Folders per page (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_me',
        description: 'Get the authenticated user\'s Vimeo account information including name, bio, storage quota, and plan details',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_comments',
        description: 'List comments on a specific Vimeo video with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'number',
              description: 'Numeric Vimeo video ID',
            },
            per_page: {
              type: 'number',
              description: 'Comments per page (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            direction: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: asc)',
            },
          },
          required: ['video_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_videos':
          return this.listVideos(args);
        case 'get_video':
          return this.getVideo(args);
        case 'search_videos':
          return this.searchVideos(args);
        case 'delete_video':
          return this.deleteVideo(args);
        case 'update_video':
          return this.updateVideo(args);
        case 'get_video_analytics':
          return this.getVideoAnalytics(args);
        case 'list_showcases':
          return this.listShowcases(args);
        case 'get_showcase':
          return this.getShowcase(args);
        case 'create_showcase':
          return this.createShowcase(args);
        case 'update_showcase':
          return this.updateShowcase(args);
        case 'list_showcase_videos':
          return this.listShowcaseVideos(args);
        case 'add_video_to_showcase':
          return this.addVideoToShowcase(args);
        case 'list_folders':
          return this.listFolders(args);
        case 'get_me':
          return this.getMe();
        case 'list_comments':
          return this.listComments(args);
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

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.vimeo.*+json;version=3.4',
    };
  }

  private async vimeoGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async vimeoPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async vimeoPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async vimeoDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'deleted' }) }], isError: false };
  }

  private async vimeoPut(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'PUT', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'added' }) }], isError: false };
  }

  private async listVideos(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
      page: String((args.page as number) || 1),
      sort: (args.sort as string) || 'date',
      direction: (args.direction as string) || 'desc',
    };
    if (args.filter) params.filter = args.filter as string;
    return this.vimeoGet('/me/videos', params);
  }

  private async getVideo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.fields) params.fields = args.fields as string;
    return this.vimeoGet(`/videos/${encodeURIComponent(args.video_id as string)}`, params);
  }

  private async searchVideos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      query: args.query as string,
      per_page: String((args.per_page as number) || 25),
      page: String((args.page as number) || 1),
      sort: (args.sort as string) || 'relevant',
      direction: (args.direction as string) || 'desc',
    };
    if (args.filter) params.filter = args.filter as string;
    return this.vimeoGet('/videos', params);
  }

  private async deleteVideo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    return this.vimeoDelete(`/videos/${encodeURIComponent(args.video_id as string)}`);
  }

  private async updateVideo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.license) body.license = args.license;
    if (args.privacy_view || args.privacy_password || args.privacy_embed) {
      const privacy: Record<string, unknown> = {};
      if (args.privacy_view) privacy.view = args.privacy_view;
      if (args.privacy_password) privacy.password = args.privacy_password;
      if (args.privacy_embed) privacy.embed = args.privacy_embed;
      body.privacy = privacy;
    }
    return this.vimeoPatch(`/videos/${encodeURIComponent(args.video_id as string)}`, body);
  }

  private async getVideoAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    const params: Record<string, string> = {
      dimension: (args.dimension as string) || 'total',
    };
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    return this.vimeoGet(`/videos/${encodeURIComponent(args.video_id as string)}/analytics`, params);
  }

  private async listShowcases(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
      page: String((args.page as number) || 1),
      sort: (args.sort as string) || 'date',
    };
    return this.vimeoGet('/me/albums', params);
  }

  private async getShowcase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.showcase_id) return { content: [{ type: 'text', text: 'showcase_id is required' }], isError: true };
    const user = (args.user_id as string) || 'me';
    return this.vimeoGet(`/users/${user}/albums/${encodeURIComponent(args.showcase_id as string)}`);
  }

  private async createShowcase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    if (args.privacy) body.privacy = args.privacy;
    if (args.password) body.password = args.password;
    if (args.sort) body.sort = args.sort;
    return this.vimeoPost('/me/albums', body);
  }

  private async updateShowcase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.showcase_id) return { content: [{ type: 'text', text: 'showcase_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.privacy) body.privacy = args.privacy;
    return this.vimeoPatch(`/me/albums/${encodeURIComponent(args.showcase_id as string)}`, body);
  }

  private async listShowcaseVideos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.showcase_id) return { content: [{ type: 'text', text: 'showcase_id is required' }], isError: true };
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
      page: String((args.page as number) || 1),
    };
    return this.vimeoGet(`/me/albums/${encodeURIComponent(args.showcase_id as string)}/videos`, params);
  }

  private async addVideoToShowcase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.showcase_id || !args.video_id) return { content: [{ type: 'text', text: 'showcase_id and video_id are required' }], isError: true };
    return this.vimeoPut(`/me/albums/${encodeURIComponent(args.showcase_id as string)}/videos/${encodeURIComponent(args.video_id as string)}`);
  }

  private async listFolders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
      page: String((args.page as number) || 1),
    };
    return this.vimeoGet('/me/projects', params);
  }

  private async getMe(): Promise<ToolResult> {
    return this.vimeoGet('/me');
  }

  private async listComments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 25),
      page: String((args.page as number) || 1),
      direction: (args.direction as string) || 'asc',
    };
    return this.vimeoGet(`/videos/${encodeURIComponent(args.video_id as string)}/comments`, params);
  }
}
