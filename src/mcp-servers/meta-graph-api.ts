/**
 * Meta Graph API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28. No official Meta Graph API MCP server from Meta Inc.
// Community servers exist (hashcott/meta-ads-mcp-server, brijr/meta-mcp, serkanhaslak/meta-mcp) but
// cover only the Marketing/Ads API, not the full Graph API surface (Pages, Instagram, Users, Posts,
// Photos, Videos, Comments, Reactions, Search).
// Recommendation: Use this adapter for full Graph API coverage.
//
// Base URL: https://graph.facebook.com/v25.0 (v25.0 released Feb 18, 2026 — current latest)
// Auth: access_token query parameter or Bearer token in Authorization header. Meta recommends
//       passing the access_token as a query parameter for Graph API calls (user token or page token).
//       Our adapter passes access_token as a query parameter via URLSearchParams — correct.
// Docs: https://developers.facebook.com/docs/graph-api/
// Rate limits: App-level rate limiting: 200 calls per hour per user per app (standard tier);
//              Marketing API: BUC-based (Billion Units of Computation) — varies by tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MetaGraphAPIConfig {
  accessToken: string;
  baseUrl?: string;
}

export class MetaGraphAPIMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: MetaGraphAPIConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://graph.facebook.com/v25.0';
  }

  static catalog() {
    return {
      name: 'meta-graph-api',
      displayName: 'Meta Graph API',
      version: '1.0.0',
      category: 'social',
      keywords: [
        'meta', 'facebook', 'instagram', 'graph api', 'page', 'post', 'photo',
        'video', 'feed', 'comment', 'like', 'reaction', 'account', 'user',
        'social media', 'advertising', 'ig media', 'ig user',
      ],
      toolNames: [
        'get_object', 'get_me', 'get_user',
        'get_page', 'get_page_feed', 'create_page_post', 'get_page_photos', 'get_page_videos',
        'get_post', 'get_post_comments', 'create_comment', 'get_post_reactions',
        'get_ig_user', 'get_ig_media', 'get_ig_user_media', 'get_ig_mentions',
        'search_pages', 'get_accounts',
      ],
      description: 'Meta Graph API: access Facebook Pages, posts, photos, videos, comments, reactions, and Instagram content for connected accounts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_object',
        description: 'Fetch any Meta Graph API node by its ID with optional field selection — use for any object type not covered by a dedicated tool',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Graph API node ID (e.g. page ID, post ID, user ID, photo ID)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to return (e.g. id,name,about,fan_count)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_me',
        description: 'Get the profile of the current authenticated user or app — returns id, name, email, and requested fields',
        inputSchema: {
          type: 'object',
          properties: {
            fields: {
              type: 'string',
              description: 'Comma-separated list of profile fields to return (default: id,name,email)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get a Facebook user profile by user ID with optional field selection',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Facebook user ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return (e.g. id,name,picture,location)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_page',
        description: 'Get detailed information about a Facebook Page by its ID or username',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Facebook Page ID or page username',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return (default: id,name,about,fan_count,website,phone,category)',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'get_page_feed',
        description: 'Retrieve the published posts from a Facebook Page feed with optional pagination and limit',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Facebook Page ID',
            },
            fields: {
              type: 'string',
              description: 'Fields to return per post (default: id,message,created_time,permalink_url)',
            },
            limit: {
              type: 'number',
              description: 'Number of posts to return (default: 10, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response (after field in paging.cursors)',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'create_page_post',
        description: 'Publish a new text post to a Facebook Page using a Page access token',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Facebook Page ID to post to',
            },
            message: {
              type: 'string',
              description: 'Text content of the post',
            },
            link: {
              type: 'string',
              description: 'Optional URL to attach as a link preview',
            },
            published: {
              type: 'boolean',
              description: 'Whether to publish immediately (true) or save as unpublished draft (false, default: true)',
            },
          },
          required: ['page_id', 'message'],
        },
      },
      {
        name: 'get_page_photos',
        description: 'List photos uploaded to a Facebook Page with optional type filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Facebook Page ID',
            },
            type: {
              type: 'string',
              description: 'Photo type filter: uploaded (page-uploaded), tagged (page-tagged), profile (default: uploaded)',
            },
            fields: {
              type: 'string',
              description: 'Fields per photo (default: id,name,created_time,images)',
            },
            limit: {
              type: 'number',
              description: 'Number of photos to return (default: 10, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'get_page_videos',
        description: 'List videos uploaded to a Facebook Page with optional field selection and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: {
              type: 'string',
              description: 'Facebook Page ID',
            },
            fields: {
              type: 'string',
              description: 'Fields per video (default: id,title,description,created_time,length)',
            },
            limit: {
              type: 'number',
              description: 'Number of videos to return (default: 10, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'get_post',
        description: 'Get a specific Facebook post by its ID with optional field selection',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'Facebook post ID (format: pageId_postId)',
            },
            fields: {
              type: 'string',
              description: 'Fields to return (default: id,message,created_time,permalink_url,likes.summary(true),comments.summary(true))',
            },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'get_post_comments',
        description: 'Retrieve comments on a Facebook post with optional summary totals and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'Facebook post ID',
            },
            fields: {
              type: 'string',
              description: 'Fields per comment (default: id,message,from,created_time)',
            },
            limit: {
              type: 'number',
              description: 'Number of comments to return (default: 25, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            summary: {
              type: 'boolean',
              description: 'Include total_count summary for comments (default: false)',
            },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'create_comment',
        description: 'Post a comment on a Facebook post, photo, or video by object ID',
        inputSchema: {
          type: 'object',
          properties: {
            object_id: {
              type: 'string',
              description: 'ID of the post, photo, or video to comment on',
            },
            message: {
              type: 'string',
              description: 'Text content of the comment',
            },
          },
          required: ['object_id', 'message'],
        },
      },
      {
        name: 'get_post_reactions',
        description: 'Get reaction counts and type breakdown (LIKE, LOVE, HAHA, WOW, SAD, ANGRY) for a Facebook post',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'Facebook post ID',
            },
            type: {
              type: 'string',
              description: 'Filter by reaction type: LIKE, LOVE, HAHA, WOW, SAD, ANGRY (omit for all types)',
            },
            limit: {
              type: 'number',
              description: 'Number of individual reactions to return (default: 25)',
            },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'get_ig_user',
        description: 'Get an Instagram Business or Creator account profile linked to a Facebook Page',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram User ID (IG User node ID, not the username)',
            },
            fields: {
              type: 'string',
              description: 'Fields to return (default: id,username,name,biography,followers_count,media_count,website)',
            },
          },
          required: ['ig_user_id'],
        },
      },
      {
        name: 'get_ig_media',
        description: 'Get details for a specific Instagram media item by its IG Media ID',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'IG Media ID',
            },
            fields: {
              type: 'string',
              description: 'Fields to return (default: id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count)',
            },
          },
          required: ['media_id'],
        },
      },
      {
        name: 'get_ig_user_media',
        description: 'List media (posts, reels, stories) for an Instagram Business or Creator account with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram User ID',
            },
            fields: {
              type: 'string',
              description: 'Fields per media item (default: id,caption,media_type,media_url,permalink,timestamp)',
            },
            limit: {
              type: 'number',
              description: 'Number of media items to return (default: 12, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['ig_user_id'],
        },
      },
      {
        name: 'get_ig_mentions',
        description: 'Get Instagram media where the account has been @mentioned or tagged by other users',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram User ID of the account to check mentions for',
            },
            fields: {
              type: 'string',
              description: 'Fields per mention (default: id,caption,media_type,permalink,timestamp)',
            },
            limit: {
              type: 'number',
              description: 'Number of mentions to return (default: 10)',
            },
          },
          required: ['ig_user_id'],
        },
      },
      {
        name: 'search_pages',
        description: 'Search for public Facebook Pages by name or keyword with optional type filter',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search keyword or page name',
            },
            type: {
              type: 'string',
              description: 'Object type to search: page (default: page)',
            },
            fields: {
              type: 'string',
              description: 'Fields to return per result (default: id,name,category,fan_count)',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (default: 10, max: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_accounts',
        description: 'Get the Facebook Pages and Instagram accounts that the authenticated user manages (me/accounts)',
        inputSchema: {
          type: 'object',
          properties: {
            fields: {
              type: 'string',
              description: 'Fields per account (default: id,name,access_token,category,tasks)',
            },
            limit: {
              type: 'number',
              description: 'Number of accounts to return (default: 25)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_object':
          return this.getObject(args);
        case 'get_me':
          return this.getMe(args);
        case 'get_user':
          return this.getUser(args);
        case 'get_page':
          return this.getPage(args);
        case 'get_page_feed':
          return this.getPageFeed(args);
        case 'create_page_post':
          return this.createPagePost(args);
        case 'get_page_photos':
          return this.getPagePhotos(args);
        case 'get_page_videos':
          return this.getPageVideos(args);
        case 'get_post':
          return this.getPost(args);
        case 'get_post_comments':
          return this.getPostComments(args);
        case 'create_comment':
          return this.createComment(args);
        case 'get_post_reactions':
          return this.getPostReactions(args);
        case 'get_ig_user':
          return this.getIgUser(args);
        case 'get_ig_media':
          return this.getIgMedia(args);
        case 'get_ig_user_media':
          return this.getIgUserMedia(args);
        case 'get_ig_mentions':
          return this.getIgMentions(args);
        case 'search_pages':
          return this.searchPages(args);
        case 'get_accounts':
          return this.getAccounts(args);
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

  private async graphGet(path: string, params: Record<string, string>): Promise<ToolResult> {
    params.access_token = this.accessToken;
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${path}?${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Meta returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async graphPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    body.access_token = this.accessToken;
    const url = `${this.baseUrl}/${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Meta returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getObject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.fields) params.fields = args.fields as string;
    return this.graphGet(args.id as string, params);
  }

  private async getMe(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,name,email',
    };
    return this.graphGet('me', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,name,picture,location',
    };
    return this.graphGet(args.user_id as string, params);
  }

  private async getPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.page_id) return { content: [{ type: 'text', text: 'page_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,name,about,fan_count,website,phone,category',
    };
    return this.graphGet(args.page_id as string, params);
  }

  private async getPageFeed(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.page_id) return { content: [{ type: 'text', text: 'page_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,message,created_time,permalink_url',
      limit: String((args.limit as number) || 10),
    };
    if (args.after) params.after = args.after as string;
    return this.graphGet(`${encodeURIComponent(args.page_id as string)}/feed`, params);
  }

  private async createPagePost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.page_id || !args.message) return { content: [{ type: 'text', text: 'page_id and message are required' }], isError: true };
    const body: Record<string, unknown> = { message: args.message };
    if (args.link) body.link = args.link;
    if (typeof args.published === 'boolean') body.published = args.published;
    return this.graphPost(`${encodeURIComponent(args.page_id as string)}/feed`, body);
  }

  private async getPagePhotos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.page_id) return { content: [{ type: 'text', text: 'page_id is required' }], isError: true };
    const params: Record<string, string> = {
      type: (args.type as string) || 'uploaded',
      fields: (args.fields as string) || 'id,name,created_time,images',
      limit: String((args.limit as number) || 10),
    };
    if (args.after) params.after = args.after as string;
    return this.graphGet(`${encodeURIComponent(args.page_id as string)}/photos`, params);
  }

  private async getPageVideos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.page_id) return { content: [{ type: 'text', text: 'page_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,title,description,created_time,length',
      limit: String((args.limit as number) || 10),
    };
    if (args.after) params.after = args.after as string;
    return this.graphGet(`${encodeURIComponent(args.page_id as string)}/videos`, params);
  }

  private async getPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,message,created_time,permalink_url,likes.summary(true),comments.summary(true)',
    };
    return this.graphGet(args.post_id as string, params);
  }

  private async getPostComments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,message,from,created_time',
      limit: String((args.limit as number) || 25),
    };
    if (args.after) params.after = args.after as string;
    if (args.summary) params.summary = 'true';
    return this.graphGet(`${encodeURIComponent(args.post_id as string)}/comments`, params);
  }

  private async createComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.object_id || !args.message) return { content: [{ type: 'text', text: 'object_id and message are required' }], isError: true };
    return this.graphPost(`${encodeURIComponent(args.object_id as string)}/comments`, { message: args.message });
  }

  private async getPostReactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 25),
      summary: 'total_count',
    };
    if (args.type) params.type = args.type as string;
    return this.graphGet(`${encodeURIComponent(args.post_id as string)}/reactions`, params);
  }

  private async getIgUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id) return { content: [{ type: 'text', text: 'ig_user_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,username,name,biography,followers_count,media_count,website',
    };
    return this.graphGet(args.ig_user_id as string, params);
  }

  private async getIgMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.media_id) return { content: [{ type: 'text', text: 'media_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
    };
    return this.graphGet(args.media_id as string, params);
  }

  private async getIgUserMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id) return { content: [{ type: 'text', text: 'ig_user_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,caption,media_type,media_url,permalink,timestamp',
      limit: String((args.limit as number) || 12),
    };
    if (args.after) params.after = args.after as string;
    return this.graphGet(`${encodeURIComponent(args.ig_user_id as string)}/media`, params);
  }

  private async getIgMentions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id) return { content: [{ type: 'text', text: 'ig_user_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,caption,media_type,permalink,timestamp',
      limit: String((args.limit as number) || 10),
    };
    return this.graphGet(`${encodeURIComponent(args.ig_user_id as string)}/tags`, params);
  }

  private async searchPages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      q: args.query as string,
      type: (args.type as string) || 'page',
      fields: (args.fields as string) || 'id,name,category,fan_count',
      limit: String((args.limit as number) || 10),
    };
    return this.graphGet('search', params);
  }

  private async getAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,name,access_token,category,tasks',
      limit: String((args.limit as number) || 25),
    };
    return this.graphGet('me/accounts', params);
  }
}
