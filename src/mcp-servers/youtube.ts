/**
 * YouTube MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Google/YouTube MCP server was found on GitHub or npm as of 2026-03-28.
// Community forks exist (github.com/ZubeidHendricks/youtube-mcp-server) but are not published by Google/YouTube.
//
// Base URL: https://www.googleapis.com/youtube/v3
// Auth: API key (read-only public data) OR OAuth2 Bearer token (user data, write operations)
// Docs: https://developers.google.com/youtube/v3/docs
// Rate limits: 10,000 quota units/day by default. Search costs 100 units; reads cost 1-5 units.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface YouTubeConfig {
  /** API key for public data access (read-only). */
  apiKey?: string;
  /** OAuth2 Bearer token for authenticated/write operations. */
  accessToken?: string;
}

export class YouTubeMCPServer extends MCPAdapterBase {
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly apiKey?: string;
  private readonly accessToken?: string;

  constructor(config: YouTubeConfig) {
    super();
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
  }

  static catalog() {
    return {
      name: 'youtube',
      displayName: 'YouTube',
      version: '1.0.0',
      category: 'social' as const,
      keywords: [
        'youtube', 'video', 'channel', 'playlist', 'search', 'subscribe',
        'comment', 'caption', 'live', 'broadcast', 'stream', 'analytics',
      ],
      toolNames: [
        'search_videos',
        'list_videos', 'get_video', 'rate_video',
        'list_channels', 'get_channel',
        'list_playlists', 'get_playlist', 'create_playlist', 'update_playlist', 'delete_playlist',
        'list_playlist_items', 'add_playlist_item', 'delete_playlist_item',
        'list_subscriptions', 'subscribe_channel', 'unsubscribe_channel',
        'list_comment_threads', 'get_comment_thread', 'insert_comment_thread', 'list_comments',
        'list_captions',
        'list_live_broadcasts', 'get_live_broadcast',
      ],
      description: 'Search YouTube videos, manage channels/playlists/subscriptions, read comments and captions, and interact with live broadcasts via the YouTube Data API v3.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Search ───────────────────────────────────────────────────────────────
      {
        name: 'search_videos',
        description: 'Search YouTube for videos, channels, or playlists matching a query with optional filters for type, order, date, and region.',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query string.',
            },
            type: {
              type: 'string',
              description: 'Resource type to search: video, channel, or playlist (default: video).',
            },
            max_results: {
              type: 'number',
              description: 'Maximum results to return (default: 25, max: 50).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response\'s nextPageToken.',
            },
            order: {
              type: 'string',
              description: 'Sort order: date, rating, relevance, title, videoCount, viewCount (default: relevance).',
            },
            published_after: {
              type: 'string',
              description: 'ISO 8601 datetime — only return results published after this time.',
            },
            published_before: {
              type: 'string',
              description: 'ISO 8601 datetime — only return results published before this time.',
            },
            region_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code to restrict search results.',
            },
            relevance_language: {
              type: 'string',
              description: 'ISO 639-1 language code for preferring results in that language.',
            },
            channel_id: {
              type: 'string',
              description: 'Restrict results to videos from this channel ID.',
            },
            video_duration: {
              type: 'string',
              description: 'Filter by video duration: any, long (>20 min), medium (4-20 min), short (<4 min).',
            },
            safe_search: {
              type: 'string',
              description: 'Safe search setting: moderate, none, or strict (default: moderate).',
            },
          },
          required: ['q'],
        },
      },
      // ── Videos ───────────────────────────────────────────────────────────────
      {
        name: 'list_videos',
        description: 'List videos by IDs or chart (mostPopular), returning snippet, statistics, and content details.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Comma-separated YouTube video IDs.',
            },
            chart: {
              type: 'string',
              description: 'Chart type: mostPopular — returns trending videos for the region.',
            },
            region_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 region code for chart results.',
            },
            video_category_id: {
              type: 'string',
              description: 'YouTube video category ID to filter chart results.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum results to return (default: 25, max: 50).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
        },
      },
      {
        name: 'get_video',
        description: 'Get detailed metadata for a specific YouTube video including snippet, statistics, content details, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'YouTube video ID.',
            },
            parts: {
              type: 'string',
              description: 'Comma-separated resource parts to include: snippet,statistics,contentDetails,status,topicDetails (default: snippet,statistics,contentDetails).',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'rate_video',
        description: 'Add a like or dislike to a YouTube video, or remove an existing rating. Requires OAuth2 token.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'YouTube video ID to rate.',
            },
            rating: {
              type: 'string',
              description: 'Rating to apply: like, dislike, or none (removes existing rating).',
            },
          },
          required: ['id', 'rating'],
        },
      },
      // ── Channels ─────────────────────────────────────────────────────────────
      {
        name: 'list_channels',
        description: 'List YouTube channels by ID, username, or retrieve the authenticated user\'s channel.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Comma-separated channel IDs.',
            },
            for_handle: {
              type: 'string',
              description: 'Channel @handle (e.g. @GoogleDevelopers).',
            },
            mine: {
              type: 'boolean',
              description: 'Return the authenticated user\'s channel. Requires OAuth2 token.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum results to return (default: 25, max: 50).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
        },
      },
      {
        name: 'get_channel',
        description: 'Get full details for a YouTube channel including statistics, branding settings, and content details.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'YouTube channel ID.',
            },
            parts: {
              type: 'string',
              description: 'Comma-separated parts: snippet,statistics,brandingSettings,contentDetails (default: snippet,statistics,contentDetails).',
            },
          },
          required: ['id'],
        },
      },
      // ── Playlists ────────────────────────────────────────────────────────────
      {
        name: 'list_playlists',
        description: 'List YouTube playlists by channel ID, specific IDs, or the authenticated user\'s playlists.',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'Channel ID whose public playlists to list.',
            },
            id: {
              type: 'string',
              description: 'Comma-separated playlist IDs.',
            },
            mine: {
              type: 'boolean',
              description: 'Return the authenticated user\'s playlists. Requires OAuth2 token.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum results to return (default: 25, max: 50).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
        },
      },
      {
        name: 'get_playlist',
        description: 'Get full details for a specific YouTube playlist including snippet, status, and content details.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'YouTube playlist ID.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_playlist',
        description: 'Create a new YouTube playlist on the authenticated user\'s channel. Requires OAuth2 token.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the new playlist.',
            },
            description: {
              type: 'string',
              description: 'Description of the new playlist.',
            },
            privacy_status: {
              type: 'string',
              description: 'Privacy setting: public, unlisted, or private (default: public).',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_playlist',
        description: 'Update a YouTube playlist\'s title, description, or privacy status. Requires OAuth2 token.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'YouTube playlist ID to update.',
            },
            title: {
              type: 'string',
              description: 'Updated playlist title.',
            },
            description: {
              type: 'string',
              description: 'Updated playlist description.',
            },
            privacy_status: {
              type: 'string',
              description: 'Updated privacy setting: public, unlisted, or private.',
            },
          },
          required: ['id', 'title'],
        },
      },
      {
        name: 'delete_playlist',
        description: 'Delete a YouTube playlist permanently. Requires OAuth2 token and ownership of the playlist.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'YouTube playlist ID to delete.',
            },
          },
          required: ['id'],
        },
      },
      // ── Playlist Items ───────────────────────────────────────────────────────
      {
        name: 'list_playlist_items',
        description: 'List videos in a YouTube playlist with pagination support.',
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: {
              type: 'string',
              description: 'Playlist ID to list items from.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum results to return (default: 50, max: 50).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'add_playlist_item',
        description: 'Add a video to a YouTube playlist. Requires OAuth2 token and ownership of the playlist.',
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: {
              type: 'string',
              description: 'Playlist ID to add the video to.',
            },
            video_id: {
              type: 'string',
              description: 'YouTube video ID to add.',
            },
            position: {
              type: 'number',
              description: 'Zero-based position in the playlist where the video will be inserted.',
            },
          },
          required: ['playlist_id', 'video_id'],
        },
      },
      {
        name: 'delete_playlist_item',
        description: 'Remove a video from a YouTube playlist by playlist item ID. Requires OAuth2 token.',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'Playlist item ID (not the video ID) to remove.',
            },
          },
          required: ['item_id'],
        },
      },
      // ── Subscriptions ────────────────────────────────────────────────────────
      {
        name: 'list_subscriptions',
        description: 'List the authenticated user\'s channel subscriptions or a channel\'s subscribers. Requires OAuth2 token.',
        inputSchema: {
          type: 'object',
          properties: {
            mine: {
              type: 'boolean',
              description: 'List subscriptions for the authenticated user (default: true).',
            },
            channel_id: {
              type: 'string',
              description: 'Return subscribers for this channel ID instead.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum results to return (default: 25, max: 50).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
            order: {
              type: 'string',
              description: 'Sort order: alphabetical or relevance or unread (default: relevance).',
            },
          },
        },
      },
      {
        name: 'subscribe_channel',
        description: 'Subscribe the authenticated user to a YouTube channel. Requires OAuth2 token.',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'Channel ID to subscribe to.',
            },
          },
          required: ['channel_id'],
        },
      },
      {
        name: 'unsubscribe_channel',
        description: 'Unsubscribe the authenticated user from a YouTube channel by subscription ID. Requires OAuth2 token.',
        inputSchema: {
          type: 'object',
          properties: {
            subscription_id: {
              type: 'string',
              description: 'Subscription ID to delete (from list_subscriptions).',
            },
          },
          required: ['subscription_id'],
        },
      },
      // ── Comments ─────────────────────────────────────────────────────────────
      {
        name: 'list_comment_threads',
        description: 'List top-level comment threads for a video or channel, including reply counts.',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'Video ID to retrieve comment threads for.',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID to retrieve all comment threads for.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum results to return (default: 20, max: 100).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
            order: {
              type: 'string',
              description: 'Sort order: time or relevance (default: time).',
            },
            search_terms: {
              type: 'string',
              description: 'Filter comments containing this text.',
            },
          },
        },
      },
      {
        name: 'get_comment_thread',
        description: 'Get a specific YouTube comment thread by ID, including the top-level comment and reply count.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Comment thread ID.',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'insert_comment_thread',
        description: 'Post a new top-level comment on a YouTube video. Requires OAuth2 token.',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'Video ID to post the comment on.',
            },
            text: {
              type: 'string',
              description: 'Comment text to post.',
            },
          },
          required: ['video_id', 'text'],
        },
      },
      {
        name: 'list_comments',
        description: 'List replies to a comment thread or all comments for a video, with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            parent_id: {
              type: 'string',
              description: 'Comment thread ID to list replies for.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum results to return (default: 20, max: 100).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
          required: ['parent_id'],
        },
      },
      // ── Captions ─────────────────────────────────────────────────────────────
      {
        name: 'list_captions',
        description: 'List caption tracks available for a YouTube video, including language and track kind.',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'YouTube video ID to list captions for.',
            },
          },
          required: ['video_id'],
        },
      },
      // ── Live Broadcasts ──────────────────────────────────────────────────────
      {
        name: 'list_live_broadcasts',
        description: 'List live broadcasts for the authenticated user, filtered by status. Requires OAuth2 token.',
        inputSchema: {
          type: 'object',
          properties: {
            broadcast_status: {
              type: 'string',
              description: 'Filter by status: active, all, completed, upcoming (default: all).',
            },
            max_results: {
              type: 'number',
              description: 'Maximum results to return (default: 25, max: 50).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response.',
            },
          },
        },
      },
      {
        name: 'get_live_broadcast',
        description: 'Get details for a specific YouTube live broadcast by ID including status and statistics.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Live broadcast ID.',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_videos':         return await this.searchVideos(args);
        case 'list_videos':           return await this.listVideos(args);
        case 'get_video':             return await this.getVideo(args);
        case 'rate_video':            return await this.rateVideo(args);
        case 'list_channels':         return await this.listChannels(args);
        case 'get_channel':           return await this.getChannel(args);
        case 'list_playlists':        return await this.listPlaylists(args);
        case 'get_playlist':          return await this.getPlaylist(args);
        case 'create_playlist':       return await this.createPlaylist(args);
        case 'update_playlist':       return await this.updatePlaylist(args);
        case 'delete_playlist':       return await this.deletePlaylist(args);
        case 'list_playlist_items':   return await this.listPlaylistItems(args);
        case 'add_playlist_item':     return await this.addPlaylistItem(args);
        case 'delete_playlist_item':  return await this.deletePlaylistItem(args);
        case 'list_subscriptions':    return await this.listSubscriptions(args);
        case 'subscribe_channel':     return await this.subscribeChannel(args);
        case 'unsubscribe_channel':   return await this.unsubscribeChannel(args);
        case 'list_comment_threads':  return await this.listCommentThreads(args);
        case 'get_comment_thread':    return await this.getCommentThread(args);
        case 'insert_comment_thread': return await this.insertCommentThread(args);
        case 'list_comments':         return await this.listComments(args);
        case 'list_captions':         return await this.listCaptions(args);
        case 'list_live_broadcasts':  return await this.listLiveBroadcasts(args);
        case 'get_live_broadcast':    return await this.getLiveBroadcast(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private addAuth(params: URLSearchParams): void {
    if (this.apiKey) params.set('key', this.apiKey);
  }

  private authHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.accessToken) h['Authorization'] = `Bearer ${this.accessToken}`;
    return h;
  }


  private async get(endpoint: string, params: URLSearchParams): Promise<ToolResult> {
    this.addAuth(params);
    const response = await this.fetchWithRetry(`${this.baseUrl}/${endpoint}?${params.toString()}`, {
      method: 'GET',
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `YouTube API error ${response.status}: ${errText}` }], isError: true };
    }
    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(endpoint: string, body: unknown, queryParams?: URLSearchParams): Promise<ToolResult> {
    const params = queryParams ?? new URLSearchParams();
    this.addAuth(params);
    const response = await this.fetchWithRetry(`${this.baseUrl}/${endpoint}?${params.toString()}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `YouTube API error ${response.status}: ${errText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(endpoint: string, params: URLSearchParams): Promise<ToolResult> {
    this.addAuth(params);
    const response = await this.fetchWithRetry(`${this.baseUrl}/${endpoint}?${params.toString()}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `YouTube API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
  }

  private async put(endpoint: string, body: unknown, queryParams?: URLSearchParams): Promise<ToolResult> {
    const params = queryParams ?? new URLSearchParams();
    this.addAuth(params);
    const response = await this.fetchWithRetry(`${this.baseUrl}/${endpoint}?${params.toString()}`, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `YouTube API error ${response.status}: ${errText}` }], isError: true };
    }
    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchVideos(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet', q: args.q as string });
    if (args.type) params.set('type', args.type as string);
    if (args.max_results) params.set('maxResults', String(args.max_results));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    if (args.order) params.set('order', args.order as string);
    if (args.published_after) params.set('publishedAfter', args.published_after as string);
    if (args.published_before) params.set('publishedBefore', args.published_before as string);
    if (args.region_code) params.set('regionCode', args.region_code as string);
    if (args.relevance_language) params.set('relevanceLanguage', args.relevance_language as string);
    if (args.channel_id) params.set('channelId', args.channel_id as string);
    if (args.video_duration) params.set('videoDuration', args.video_duration as string);
    if (args.safe_search) params.set('safeSearch', args.safe_search as string);
    return this.get('search', params);
  }

  private async listVideos(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet,statistics,contentDetails' });
    if (args.id) params.set('id', args.id as string);
    if (args.chart) params.set('chart', args.chart as string);
    if (args.region_code) params.set('regionCode', args.region_code as string);
    if (args.video_category_id) params.set('videoCategoryId', args.video_category_id as string);
    if (args.max_results) params.set('maxResults', String(args.max_results));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    return this.get('videos', params);
  }

  private async getVideo(args: Record<string, unknown>): Promise<ToolResult> {
    const parts = (args.parts as string | undefined) ?? 'snippet,statistics,contentDetails';
    const params = new URLSearchParams({ part: parts, id: args.id as string });
    return this.get('videos', params);
  }

  private async rateVideo(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      id: args.id as string,
      rating: args.rating as string,
    });
    this.addAuth(params);
    const response = await this.fetchWithRetry(`${this.baseUrl}/videos/rate?${params.toString()}`, {
      method: 'POST',
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `YouTube API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
  }

  private async listChannels(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet,statistics' });
    if (args.id) params.set('id', args.id as string);
    if (args.for_handle) params.set('forHandle', args.for_handle as string);
    if (args.mine) params.set('mine', String(args.mine));
    if (args.max_results) params.set('maxResults', String(args.max_results));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    return this.get('channels', params);
  }

  private async getChannel(args: Record<string, unknown>): Promise<ToolResult> {
    const parts = (args.parts as string | undefined) ?? 'snippet,statistics,contentDetails';
    const params = new URLSearchParams({ part: parts, id: args.id as string });
    return this.get('channels', params);
  }

  private async listPlaylists(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet,contentDetails' });
    if (args.channel_id) params.set('channelId', args.channel_id as string);
    if (args.id) params.set('id', args.id as string);
    if (args.mine) params.set('mine', String(args.mine));
    if (args.max_results) params.set('maxResults', String(args.max_results));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    return this.get('playlists', params);
  }

  private async getPlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet,contentDetails,status', id: args.id as string });
    return this.get('playlists', params);
  }

  private async createPlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet,status' });
    const body = {
      snippet: { title: args.title, description: args.description ?? '' },
      status: { privacyStatus: (args.privacy_status as string) ?? 'public' },
    };
    return this.post('playlists', body, params);
  }

  private async updatePlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet,status' });
    const body: Record<string, unknown> = {
      id: args.id,
      snippet: { title: args.title, description: args.description ?? '' },
    };
    if (args.privacy_status) body.status = { privacyStatus: args.privacy_status };
    return this.put('playlists', body, params);
  }

  private async deletePlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ id: args.id as string });
    return this.del('playlists', params);
  }

  private async listPlaylistItems(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      playlistId: args.playlist_id as string,
    });
    if (args.max_results) params.set('maxResults', String(args.max_results));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    return this.get('playlistItems', params);
  }

  private async addPlaylistItem(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet' });
    const snippet: Record<string, unknown> = {
      playlistId: args.playlist_id,
      resourceId: { kind: 'youtube#video', videoId: args.video_id },
    };
    if (args.position !== undefined) snippet.position = args.position;
    return this.post('playlistItems', { snippet }, params);
  }

  private async deletePlaylistItem(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ id: args.item_id as string });
    return this.del('playlistItems', params);
  }

  private async listSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet,contentDetails' });
    if (args.channel_id) {
      params.set('channelId', args.channel_id as string);
    } else {
      params.set('mine', 'true');
    }
    if (args.max_results) params.set('maxResults', String(args.max_results));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    if (args.order) params.set('order', args.order as string);
    return this.get('subscriptions', params);
  }

  private async subscribeChannel(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet' });
    const body = {
      snippet: {
        resourceId: { kind: 'youtube#channel', channelId: args.channel_id },
      },
    };
    return this.post('subscriptions', body, params);
  }

  private async unsubscribeChannel(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ id: args.subscription_id as string });
    return this.del('subscriptions', params);
  }

  private async listCommentThreads(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet,replies' });
    if (args.video_id) params.set('videoId', args.video_id as string);
    if (args.channel_id) params.set('allThreadsRelatedToChannelId', args.channel_id as string);
    if (args.max_results) params.set('maxResults', String(args.max_results));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    if (args.order) params.set('order', args.order as string);
    if (args.search_terms) params.set('searchTerms', args.search_terms as string);
    return this.get('commentThreads', params);
  }

  private async getCommentThread(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet,replies', id: args.id as string });
    return this.get('commentThreads', params);
  }

  private async insertCommentThread(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet' });
    const body = {
      snippet: {
        videoId: args.video_id,
        topLevelComment: {
          snippet: { textOriginal: args.text },
        },
      },
    };
    return this.post('commentThreads', body, params);
  }

  private async listComments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet', parentId: args.parent_id as string });
    if (args.max_results) params.set('maxResults', String(args.max_results));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    return this.get('comments', params);
  }

  private async listCaptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet', videoId: args.video_id as string });
    return this.get('captions', params);
  }

  private async listLiveBroadcasts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      part: 'snippet,status,contentDetails',
      broadcastStatus: (args.broadcast_status as string) ?? 'all',
    });
    if (args.max_results) params.set('maxResults', String(args.max_results));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    return this.get('liveBroadcasts', params);
  }

  private async getLiveBroadcast(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      part: 'snippet,status,contentDetails,statistics',
      id: args.id as string,
    });
    return this.get('liveBroadcasts', params);
  }
}
