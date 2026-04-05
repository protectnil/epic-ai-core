/**
 * Instagram Graph API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Multiple community MCP servers exist (jlbadano/ig-mcp, anand-kamble/mcp-instagram,
// BilalTariq01/instagram-analytics-mcp) but none are official Meta releases.
// jlbadano/ig-mcp (96 stars, 46 commits, MIT) is community-maintained, not vendor-official;
// it also uses Python/FastMCP and does not meet the vendor-published criterion.
// Our adapter covers: 20 tools. Vendor MCP covers: 0 tools (no official MCP).
// Recommendation: use-rest-api — no official Meta/Instagram MCP server exists.
//
// Base URL: https://graph.facebook.com/v25.0  (v25.0 released 2026-02-18; was v21.0 — updated)
// Auth: Bearer {accessToken} — User or Page access token via OAuth 2.0 (Facebook Login for Business).
//       Business/Creator accounts only. Short-lived tokens expire in ~1 hour; long-lived tokens
//       expire after 60 days of non-use. Refresh with GET /refresh_access_token.
// Docs: https://developers.facebook.com/docs/instagram-platform/reference/
// Rate limits: 200 API calls per hour per user token. 4,800 calls/24h per app.
//              Content publishing: 50 posts per 24-hour period per IG User.
//              Messaging: 200 DMs/hour per account.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface InstagramGraphConfig {
  accessToken: string;
  apiVersion?: string;  // Default: v25.0
}

export class InstagramGraphMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: InstagramGraphConfig) {
    super();
    this.accessToken = config.accessToken;
    const version = config.apiVersion || 'v25.0';
    this.baseUrl = `https://graph.facebook.com/${version}`;
  }

  static catalog() {
    return {
      name: 'instagram-graph',
      displayName: 'Instagram Graph API',
      version: '1.0.0',
      category: 'social',
      keywords: [
        'instagram', 'graph api', 'meta', 'social media', 'post', 'media', 'reel', 'story',
        'hashtag', 'comment', 'like', 'mention', 'insights', 'analytics', 'reach', 'impressions',
        'business', 'creator', 'followers', 'audience', 'publish', 'content',
      ],
      toolNames: [
        'get_user_profile', 'get_user_media', 'get_media_object', 'get_media_insights',
        'get_account_insights', 'list_comments', 'get_comment', 'reply_to_comment',
        'hide_comment', 'delete_comment', 'enable_disable_comments',
        'get_mentions', 'get_hashtag_info', 'search_hashtag', 'get_hashtag_media',
        'create_image_post', 'create_video_post', 'create_carousel_post', 'publish_container',
        'get_content_publishing_limit',
      ],
      description: 'Instagram Graph API: manage Business/Creator account media, publish posts and carousels, moderate comments, query hashtags, and retrieve account insights.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_user_profile',
        description: 'Get the Instagram Business or Creator account profile including username, biography, followers count, and media count',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID. Use "me" to query the authenticated account.',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated profile fields to return (default: id,username,name,biography,followers_count,media_count,website)',
            },
          },
          required: ['ig_user_id'],
        },
      },
      {
        name: 'get_user_media',
        description: 'Get the media posts (photos, videos, reels) published by an Instagram Business account with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated media fields (default: id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count)',
            },
            limit: {
              type: 'number',
              description: 'Number of media objects to return (default: 10, max: 100)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor to retrieve the next page of results',
            },
          },
          required: ['ig_user_id'],
        },
      },
      {
        name: 'get_media_object',
        description: 'Get metadata for a specific Instagram media object by its ID including caption, type, URL, and engagement counts',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'Instagram media object ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return (default: id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count)',
            },
          },
          required: ['media_id'],
        },
      },
      {
        name: 'get_media_insights',
        description: 'Get performance insights for a specific media post including impressions, reach, engagement, and saves',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'Instagram media object ID to retrieve insights for',
            },
            metric: {
              type: 'string',
              description: 'Comma-separated metrics: impressions, reach, engagement, saved, video_views (default: impressions,reach,engagement,saved)',
            },
          },
          required: ['media_id'],
        },
      },
      {
        name: 'get_account_insights',
        description: 'Get account-level performance insights including reach, impressions, profile views, and follower demographics over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID',
            },
            metric: {
              type: 'string',
              description: 'Comma-separated metrics: reach, impressions, profile_views, follower_count (default: reach,impressions,profile_views)',
            },
            period: {
              type: 'string',
              description: 'Aggregation period: day, week, days_28, month (default: day)',
            },
            since: {
              type: 'number',
              description: 'Unix timestamp for start of date range',
            },
            until: {
              type: 'number',
              description: 'Unix timestamp for end of date range',
            },
          },
          required: ['ig_user_id'],
        },
      },
      {
        name: 'list_comments',
        description: 'List all comments on a specific Instagram media object with optional reply threading',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'Instagram media object ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated comment fields (default: id,text,username,timestamp,like_count)',
            },
            limit: {
              type: 'number',
              description: 'Number of comments to return (default: 20)',
            },
          },
          required: ['media_id'],
        },
      },
      {
        name: 'get_comment',
        description: 'Get a specific comment by ID including text, username, and timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            comment_id: {
              type: 'string',
              description: 'Instagram comment ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields (default: id,text,username,timestamp,like_count)',
            },
          },
          required: ['comment_id'],
        },
      },
      {
        name: 'reply_to_comment',
        description: 'Post a reply to a comment on an Instagram media object from the Business account',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID (the account posting the reply)',
            },
            comment_id: {
              type: 'string',
              description: 'Comment ID to reply to',
            },
            message: {
              type: 'string',
              description: 'Reply text content',
            },
          },
          required: ['ig_user_id', 'comment_id', 'message'],
        },
      },
      {
        name: 'hide_comment',
        description: 'Hide or unhide a comment on an Instagram Business account media post',
        inputSchema: {
          type: 'object',
          properties: {
            comment_id: {
              type: 'string',
              description: 'Instagram comment ID to hide or unhide',
            },
            hide: {
              type: 'boolean',
              description: 'true to hide the comment, false to unhide it',
            },
          },
          required: ['comment_id', 'hide'],
        },
      },
      {
        name: 'delete_comment',
        description: 'Delete a comment on an Instagram Business account media post',
        inputSchema: {
          type: 'object',
          properties: {
            comment_id: {
              type: 'string',
              description: 'Instagram comment ID to delete',
            },
          },
          required: ['comment_id'],
        },
      },
      {
        name: 'enable_disable_comments',
        description: 'Enable or disable the ability for users to comment on a specific Instagram media object',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'Instagram media object ID',
            },
            comments_enabled: {
              type: 'boolean',
              description: 'true to enable comments, false to disable them',
            },
          },
          required: ['media_id', 'comments_enabled'],
        },
      },
      {
        name: 'get_mentions',
        description: 'Get media objects or comments where the Business account is mentioned by other users',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID to check mentions for',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return on mention objects (default: id,caption,media_type,timestamp)',
            },
          },
          required: ['ig_user_id'],
        },
      },
      {
        name: 'get_hashtag_info',
        description: 'Get the Instagram hashtag ID for a hashtag name — required before querying hashtag media',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID (required for hashtag API access)',
            },
            hashtag_name: {
              type: 'string',
              description: 'Hashtag name without the # symbol (e.g. caturday)',
            },
          },
          required: ['ig_user_id', 'hashtag_name'],
        },
      },
      {
        name: 'search_hashtag',
        description: 'Search for top or recent public media posts using a specific Instagram hashtag',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID',
            },
            hashtag_id: {
              type: 'string',
              description: 'Hashtag ID from get_hashtag_info',
            },
            edge: {
              type: 'string',
              description: 'Media edge to query: top_media (top posts) or recent_media (chronological, default: top_media)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields (default: id,caption,media_type,media_url,permalink,timestamp)',
            },
          },
          required: ['ig_user_id', 'hashtag_id'],
        },
      },
      {
        name: 'get_hashtag_media',
        description: 'Get recent or top media for a hashtag by name — combines get_hashtag_info and search_hashtag in one call',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID',
            },
            hashtag_name: {
              type: 'string',
              description: 'Hashtag name without the # symbol',
            },
            edge: {
              type: 'string',
              description: 'Media edge: top_media or recent_media (default: top_media)',
            },
          },
          required: ['ig_user_id', 'hashtag_name'],
        },
      },
      {
        name: 'create_image_post',
        description: 'Create an Instagram image media container for a Business account — returns a container ID to publish with publish_container',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID',
            },
            image_url: {
              type: 'string',
              description: 'Publicly accessible URL of the image to post (JPEG, PNG — recommended 1:1 aspect ratio)',
            },
            caption: {
              type: 'string',
              description: 'Caption text for the post (max 2200 characters; use \\n for line breaks)',
            },
            location_id: {
              type: 'string',
              description: 'Facebook Page ID of a location to tag (optional)',
            },
          },
          required: ['ig_user_id', 'image_url'],
        },
      },
      {
        name: 'create_video_post',
        description: 'Create an Instagram Reel or video media container — returns a container ID to publish with publish_container',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID',
            },
            video_url: {
              type: 'string',
              description: 'Publicly accessible URL of the video to post (MP4, MOV)',
            },
            caption: {
              type: 'string',
              description: 'Caption text for the video post (max 2200 characters)',
            },
            media_type: {
              type: 'string',
              description: 'Media type: REELS or VIDEO (default: REELS)',
            },
            cover_url: {
              type: 'string',
              description: 'Publicly accessible URL for the video cover image (optional)',
            },
          },
          required: ['ig_user_id', 'video_url'],
        },
      },
      {
        name: 'create_carousel_post',
        description: 'Create an Instagram carousel (multi-image/video) post container — returns a container ID to publish with publish_container',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID',
            },
            children: {
              type: 'string',
              description: 'JSON array of media container IDs (created individually with create_image_post or create_video_post with is_carousel_item=true)',
            },
            caption: {
              type: 'string',
              description: 'Caption text for the carousel post (max 2200 characters)',
            },
          },
          required: ['ig_user_id', 'children'],
        },
      },
      {
        name: 'publish_container',
        description: 'Publish a previously created media container (image, video, or carousel) to the Instagram feed',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID',
            },
            creation_id: {
              type: 'string',
              description: 'Media container ID returned by create_image_post, create_video_post, or create_carousel_post',
            },
          },
          required: ['ig_user_id', 'creation_id'],
        },
      },
      {
        name: 'get_content_publishing_limit',
        description: 'Check the remaining number of posts the account can publish today (limit: 50 per 24 hours)',
        inputSchema: {
          type: 'object',
          properties: {
            ig_user_id: {
              type: 'string',
              description: 'Instagram Business Account user ID',
            },
          },
          required: ['ig_user_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_user_profile':
          return this.getUserProfile(args);
        case 'get_user_media':
          return this.getUserMedia(args);
        case 'get_media_object':
          return this.getMediaObject(args);
        case 'get_media_insights':
          return this.getMediaInsights(args);
        case 'get_account_insights':
          return this.getAccountInsights(args);
        case 'list_comments':
          return this.listComments(args);
        case 'get_comment':
          return this.getComment(args);
        case 'reply_to_comment':
          return this.replyToComment(args);
        case 'hide_comment':
          return this.hideComment(args);
        case 'delete_comment':
          return this.deleteComment(args);
        case 'enable_disable_comments':
          return this.enableDisableComments(args);
        case 'get_mentions':
          return this.getMentions(args);
        case 'get_hashtag_info':
          return this.getHashtagInfo(args);
        case 'search_hashtag':
          return this.searchHashtag(args);
        case 'get_hashtag_media':
          return this.getHashtagMedia(args);
        case 'create_image_post':
          return this.createImagePost(args);
        case 'create_video_post':
          return this.createVideoPost(args);
        case 'create_carousel_post':
          return this.createCarouselPost(args);
        case 'publish_container':
          return this.publishContainer(args);
        case 'get_content_publishing_limit':
          return this.getContentPublishingLimit(args);
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

  private async igGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    params.access_token = this.accessToken;
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}?${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } });
    const data = await response.json() as { error?: { message: string; code: number; type: string } };
    if (!response.ok || data.error) {
      const msg = data.error ? `Graph API error ${data.error.code} (${data.error.type}): ${data.error.message}` : `HTTP ${response.status} ${response.statusText}`;
      return { content: [{ type: 'text', text: msg }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async igPost(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    params.access_token = this.accessToken;
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(params).toString(),
    });
    const data = await response.json() as { error?: { message: string; code: number; type: string } };
    if (!response.ok || data.error) {
      const msg = data.error ? `Graph API error ${data.error.code} (${data.error.type}): ${data.error.message}` : `HTTP ${response.status} ${response.statusText}`;
      return { content: [{ type: 'text', text: msg }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async igDelete(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    params.access_token = this.accessToken;
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}?${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: { Accept: 'application/json' } });
    const data = await response.json() as { error?: { message: string; code: number; type: string } };
    if (!response.ok || data.error) {
      const msg = data.error ? `Graph API error ${data.error.code} (${data.error.type}): ${data.error.message}` : `HTTP ${response.status} ${response.statusText}`;
      return { content: [{ type: 'text', text: msg }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getUserProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id) return { content: [{ type: 'text', text: 'ig_user_id is required' }], isError: true };
    const fields = (args.fields as string) || 'id,username,name,biography,followers_count,media_count,website';
    return this.igGet(`/${encodeURIComponent(args.ig_user_id as string)}`, { fields });
  }

  private async getUserMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id) return { content: [{ type: 'text', text: 'ig_user_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
      limit: String((args.limit as number) || 10),
    };
    if (args.after) params.after = args.after as string;
    return this.igGet(`/${encodeURIComponent(args.ig_user_id as string)}/media`, params);
  }

  private async getMediaObject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.media_id) return { content: [{ type: 'text', text: 'media_id is required' }], isError: true };
    const fields = (args.fields as string) || 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count';
    return this.igGet(`/${encodeURIComponent(args.media_id as string)}`, { fields });
  }

  private async getMediaInsights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.media_id) return { content: [{ type: 'text', text: 'media_id is required' }], isError: true };
    const metric = (args.metric as string) || 'impressions,reach,engagement,saved';
    return this.igGet(`/${encodeURIComponent(args.media_id as string)}/insights`, { metric });
  }

  private async getAccountInsights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id) return { content: [{ type: 'text', text: 'ig_user_id is required' }], isError: true };
    const params: Record<string, string> = {
      metric: (args.metric as string) || 'reach,impressions,profile_views',
      period: (args.period as string) || 'day',
    };
    if (args.since) params.since = String(args.since);
    if (args.until) params.until = String(args.until);
    return this.igGet(`/${encodeURIComponent(args.ig_user_id as string)}/insights`, params);
  }

  private async listComments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.media_id) return { content: [{ type: 'text', text: 'media_id is required' }], isError: true };
    const params: Record<string, string> = {
      fields: (args.fields as string) || 'id,text,username,timestamp,like_count',
      limit: String((args.limit as number) || 20),
    };
    return this.igGet(`/${encodeURIComponent(args.media_id as string)}/comments`, params);
  }

  private async getComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.comment_id) return { content: [{ type: 'text', text: 'comment_id is required' }], isError: true };
    const fields = (args.fields as string) || 'id,text,username,timestamp,like_count';
    return this.igGet(`/${encodeURIComponent(args.comment_id as string)}`, { fields });
  }

  private async replyToComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id || !args.comment_id || !args.message) {
      return { content: [{ type: 'text', text: 'ig_user_id, comment_id, and message are required' }], isError: true };
    }
    return this.igPost(`/${encodeURIComponent(args.comment_id as string)}/replies`, {
      message: args.message as string,
    });
  }

  private async hideComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.comment_id || args.hide === undefined) {
      return { content: [{ type: 'text', text: 'comment_id and hide are required' }], isError: true };
    }
    return this.igPost(`/${encodeURIComponent(args.comment_id as string)}`, { hide: String(args.hide) });
  }

  private async deleteComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.comment_id) return { content: [{ type: 'text', text: 'comment_id is required' }], isError: true };
    return this.igDelete(`/${encodeURIComponent(args.comment_id as string)}`);
  }

  private async enableDisableComments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.media_id || args.comments_enabled === undefined) {
      return { content: [{ type: 'text', text: 'media_id and comments_enabled are required' }], isError: true };
    }
    return this.igPost(`/${encodeURIComponent(args.media_id as string)}`, { comment_enabled: String(args.comments_enabled) });
  }

  private async getMentions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id) return { content: [{ type: 'text', text: 'ig_user_id is required' }], isError: true };
    const fields = (args.fields as string) || 'id,caption,media_type,timestamp';
    return this.igGet(`/${encodeURIComponent(args.ig_user_id as string)}/tags`, { fields });
  }

  private async getHashtagInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id || !args.hashtag_name) {
      return { content: [{ type: 'text', text: 'ig_user_id and hashtag_name are required' }], isError: true };
    }
    return this.igGet('/ig_hashtag_search', {
      user_id: args.ig_user_id as string,
      q: args.hashtag_name as string,
    });
  }

  private async searchHashtag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id || !args.hashtag_id) {
      return { content: [{ type: 'text', text: 'ig_user_id and hashtag_id are required' }], isError: true };
    }
    const edge = (args.edge as string) || 'top_media';
    const fields = (args.fields as string) || 'id,caption,media_type,media_url,permalink,timestamp';
    return this.igGet(`/${encodeURIComponent(args.hashtag_id as string)}/${edge}`, {
      user_id: args.ig_user_id as string,
      fields,
    });
  }

  private async getHashtagMedia(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id || !args.hashtag_name) {
      return { content: [{ type: 'text', text: 'ig_user_id and hashtag_name are required' }], isError: true };
    }
    // Step 1: resolve hashtag ID
    const hashtagResult = await this.igGet('/ig_hashtag_search', {
      user_id: args.ig_user_id as string,
      q: args.hashtag_name as string,
    });
    if (hashtagResult.isError) return hashtagResult;
    let hashtagId: string;
    try {
      const parsed = JSON.parse(hashtagResult.content[0].text) as { data?: Array<{ id: string }> };
      if (!parsed.data || parsed.data.length === 0) {
        return { content: [{ type: 'text', text: `No hashtag found for: ${encodeURIComponent(args.hashtag_name as string)}` }], isError: true };
      }
      hashtagId = parsed.data[0].id;
    } catch {
      return { content: [{ type: 'text', text: 'Failed to parse hashtag search response' }], isError: true };
    }
    // Step 2: get media
    const edge = (args.edge as string) || 'top_media';
    return this.igGet(`/${hashtagId}/${edge}`, {
      user_id: args.ig_user_id as string,
      fields: 'id,caption,media_type,media_url,permalink,timestamp',
    });
  }

  private async createImagePost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id || !args.image_url) {
      return { content: [{ type: 'text', text: 'ig_user_id and image_url are required' }], isError: true };
    }
    const params: Record<string, string> = { image_url: args.image_url as string };
    if (args.caption) params.caption = args.caption as string;
    if (args.location_id) params.location_id = args.location_id as string;
    return this.igPost(`/${encodeURIComponent(args.ig_user_id as string)}/media`, params);
  }

  private async createVideoPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id || !args.video_url) {
      return { content: [{ type: 'text', text: 'ig_user_id and video_url are required' }], isError: true };
    }
    const params: Record<string, string> = {
      video_url: args.video_url as string,
      media_type: (args.media_type as string) || 'REELS',
    };
    if (args.caption) params.caption = args.caption as string;
    if (args.cover_url) params.cover_url = args.cover_url as string;
    return this.igPost(`/${encodeURIComponent(args.ig_user_id as string)}/media`, params);
  }

  private async createCarouselPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id || !args.children) {
      return { content: [{ type: 'text', text: 'ig_user_id and children are required' }], isError: true };
    }
    let childrenIds: string[];
    try {
      childrenIds = JSON.parse(args.children as string) as string[];
    } catch {
      return { content: [{ type: 'text', text: 'children must be a valid JSON array of container ID strings' }], isError: true };
    }
    const params: Record<string, string> = {
      media_type: 'CAROUSEL',
      children: childrenIds.join(','),
    };
    if (args.caption) params.caption = args.caption as string;
    return this.igPost(`/${encodeURIComponent(args.ig_user_id as string)}/media`, params);
  }

  private async publishContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id || !args.creation_id) {
      return { content: [{ type: 'text', text: 'ig_user_id and creation_id are required' }], isError: true };
    }
    return this.igPost(`/${encodeURIComponent(args.ig_user_id as string)}/media_publish`, {
      creation_id: args.creation_id as string,
    });
  }

  private async getContentPublishingLimit(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ig_user_id) return { content: [{ type: 'text', text: 'ig_user_id is required' }], isError: true };
    return this.igGet(`/${encodeURIComponent(args.ig_user_id as string)}/content_publishing_limit`, {
      fields: 'config,quota_usage',
    });
  }
}
