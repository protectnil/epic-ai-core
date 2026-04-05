/**
 * Twitch MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28. Twitch (the company) has not published an official MCP server.
// Community MCP: https://github.com/mtane0412/twitch-mcp-server — transport: stdio, auth: Client ID + App access token (OAuth2).
//   This is a community server by @mtane0412, NOT published or maintained by Twitch Inc.
//   Covers ~10 core read-only Helix operations. Our adapter covers 18 tools with broader write/moderation coverage.
//   Per protocol, community forks do not qualify as "official MCP server" — use-rest-api applies.
// Our adapter covers: 18 tools (streams, users, channels, clips, games, videos, schedule, search, chat, bits, subscriptions, moderators, polls, predictions).
// Recommendation: use-rest-api — no official Twitch MCP exists. Our adapter provides superior coverage.
//
// Base URL: https://api.twitch.tv/helix
// Auth: OAuth2 app access token (Bearer) + Client-ID header required on every request.
//       Token endpoint: POST https://id.twitch.tv/oauth2/token?client_id=...&client_secret=...&grant_type=client_credentials
// Docs: https://dev.twitch.tv/docs/api/reference
// Rate limits: 800 points per minute (app access token). Most GET endpoints cost 1 point.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TwitchConfig {
  clientId: string;
  /** App access token (Bearer). Obtain via OAuth2 client_credentials flow. */
  accessToken: string;
  baseUrl?: string;
}

export class TwitchMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: TwitchConfig) {
    super();
    this.clientId = config.clientId;
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://api.twitch.tv/helix';
  }

  static catalog() {
    return {
      name: 'twitch',
      displayName: 'Twitch',
      version: '1.0.0',
      category: 'social' as const,
      keywords: ['twitch', 'stream', 'live', 'gaming', 'broadcaster', 'channel', 'clip', 'helix', 'esports', 'subscription', 'chat', 'eventsub'],
      toolNames: [
        'get_streams', 'get_users', 'get_channels', 'search_channels', 'search_categories',
        'get_clips', 'create_clip', 'get_games', 'get_top_games', 'get_videos',
        'get_channel_schedule', 'get_chat_settings', 'get_chatters', 'get_subscriptions',
        'get_bits_leaderboard', 'get_moderators', 'get_polls', 'get_predictions',
      ],
      description: 'Twitch Helix API: live streams, users, channels, clips, games, videos, schedules, subscriptions, chat, bits, moderators, polls, predictions, and EventSub.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_streams',
        description: 'Get currently live streams with optional filters for user, game, language, and viewer count. Returns stream title, viewer count, game, and thumbnail.',
        inputSchema: {
          type: 'object',
          properties: {
            user_login: { type: 'string', description: 'Filter by broadcaster login name (comma-separated for multiple, max 100)' },
            user_id: { type: 'string', description: 'Filter by user ID (comma-separated for multiple, max 100)' },
            game_id: { type: 'string', description: 'Filter by game/category ID' },
            language: { type: 'string', description: 'Filter by stream language (ISO 639-1 code, e.g. "en", "es")' },
            type: { type: 'string', description: 'Stream type: all or live (default: all)' },
            first: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
            before: { type: 'string', description: 'Cursor for backward pagination' },
          },
        },
      },
      {
        name: 'get_users',
        description: 'Get Twitch user profiles by login name or user ID. Returns display name, profile image, broadcaster type, and account creation date.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID (repeat param or comma-separated, max 100)' },
            login: { type: 'string', description: 'Username/login (repeat param or comma-separated, max 100)' },
          },
        },
      },
      {
        name: 'get_channels',
        description: 'Get channel information for a broadcaster including title, game, language, and content classification labels.',
        inputSchema: {
          type: 'object',
          properties: {
            broadcaster_id: { type: 'string', description: 'Broadcaster user ID (required)' },
          },
          required: ['broadcaster_id'],
        },
      },
      {
        name: 'search_channels',
        description: 'Search for channels by name or keyword with optional filter for live-only results. Returns channel name, game, live status, and thumbnail.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string' },
            live_only: { type: 'boolean', description: 'If true, return only currently live channels (default: false)' },
            first: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_categories',
        description: 'Search for games and categories by name. Returns game ID, name, and box art URL.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string (game or category name)' },
            first: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_clips',
        description: 'Get clips for a broadcaster, game, or by specific clip ID with optional date range filter.',
        inputSchema: {
          type: 'object',
          properties: {
            broadcaster_id: { type: 'string', description: 'Broadcaster ID to get clips for' },
            game_id: { type: 'string', description: 'Game ID to get clips for' },
            id: { type: 'string', description: 'Specific clip ID (comma-separated for multiple)' },
            started_at: { type: 'string', description: 'Start of date range (RFC3339 format, e.g. 2025-01-01T00:00:00Z)' },
            ended_at: { type: 'string', description: 'End of date range (RFC3339 format)' },
            is_featured: { type: 'boolean', description: 'If true, return only featured clips' },
            first: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
            before: { type: 'string', description: 'Cursor for backward pagination' },
          },
        },
      },
      {
        name: 'create_clip',
        description: 'Create a clip from a broadcaster\'s live stream. Returns the clip ID and edit URL. Requires user access token with clips:edit scope.',
        inputSchema: {
          type: 'object',
          properties: {
            broadcaster_id: { type: 'string', description: 'Broadcaster user ID whose stream to clip' },
            has_delay: { type: 'boolean', description: 'If true, includes the stream delay in the clip (default: false)' },
          },
          required: ['broadcaster_id'],
        },
      },
      {
        name: 'get_games',
        description: 'Get game/category information by ID or name. Returns game name, box art URL, and IGDB ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Game ID (comma-separated for multiple, max 100)' },
            name: { type: 'string', description: 'Game name (comma-separated for multiple, max 100)' },
            igdb_id: { type: 'string', description: 'IGDB ID (comma-separated for multiple, max 100)' },
          },
        },
      },
      {
        name: 'get_top_games',
        description: 'Get the most popular games/categories on Twitch sorted by current viewer count.',
        inputSchema: {
          type: 'object',
          properties: {
            first: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
            before: { type: 'string', description: 'Cursor for backward pagination' },
          },
        },
      },
      {
        name: 'get_videos',
        description: 'Get videos (VODs, highlights, uploads) for a user, game, or by specific video IDs with filtering by type and period.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Video ID (comma-separated for multiple, max 100)' },
            user_id: { type: 'string', description: 'User ID to get videos for' },
            game_id: { type: 'string', description: 'Game ID to get videos for' },
            language: { type: 'string', description: 'Filter by video language (ISO 639-1 code)' },
            period: { type: 'string', description: 'Filter by period: all, day, week, month (default: all)' },
            sort: { type: 'string', description: 'Sort order: time, trending, views (default: time)' },
            type: { type: 'string', description: 'Video type: all, archive, highlight, upload (default: all)' },
            first: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
            before: { type: 'string', description: 'Cursor for backward pagination' },
          },
        },
      },
      {
        name: 'get_channel_schedule',
        description: 'Get a channel\'s streaming schedule segments including time, game, and recurrence settings.',
        inputSchema: {
          type: 'object',
          properties: {
            broadcaster_id: { type: 'string', description: 'Broadcaster user ID' },
            id: { type: 'string', description: 'Specific segment IDs (comma-separated, max 100)' },
            start_time: { type: 'string', description: 'Start time for schedule (RFC3339 format)' },
            utc_offset: { type: 'string', description: 'UTC offset in minutes (e.g. "60" for UTC+1)' },
            first: { type: 'number', description: 'Maximum segments to return (default: 20, max: 25)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
          },
          required: ['broadcaster_id'],
        },
      },
      {
        name: 'get_chat_settings',
        description: 'Get the chat settings for a broadcaster\'s channel including slow mode, follower-only mode, and subscriber-only settings.',
        inputSchema: {
          type: 'object',
          properties: {
            broadcaster_id: { type: 'string', description: 'Broadcaster user ID' },
            moderator_id: { type: 'string', description: 'Moderator user ID (required to view non-follower delay settings)' },
          },
          required: ['broadcaster_id'],
        },
      },
      {
        name: 'get_chatters',
        description: 'Get the list of users currently in a broadcaster\'s chat room. Requires moderator:read:chatters scope.',
        inputSchema: {
          type: 'object',
          properties: {
            broadcaster_id: { type: 'string', description: 'Broadcaster user ID' },
            moderator_id: { type: 'string', description: 'Moderator user ID (must match the access token owner)' },
            first: { type: 'number', description: 'Maximum results to return (default: 100, max: 1000)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
          },
          required: ['broadcaster_id', 'moderator_id'],
        },
      },
      {
        name: 'get_subscriptions',
        description: 'Get a list of users subscribed to a broadcaster\'s channel. Requires channel:read:subscriptions scope.',
        inputSchema: {
          type: 'object',
          properties: {
            broadcaster_id: { type: 'string', description: 'Broadcaster user ID' },
            user_id: { type: 'string', description: 'Filter by specific user IDs (comma-separated, max 100)' },
            first: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
          },
          required: ['broadcaster_id'],
        },
      },
      {
        name: 'get_bits_leaderboard',
        description: 'Get the bits leaderboard for a broadcaster showing top cheerers. Optionally filter by time period and specific user.',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of results to return (default: 10, max: 100)' },
            period: { type: 'string', description: 'Leaderboard period: day, week, month, year, all (default: all)' },
            started_at: { type: 'string', description: 'Start of period (RFC3339, only for day/week/month/year)' },
            user_id: { type: 'string', description: 'User ID to show rank for (returns rank even if outside top count)' },
          },
        },
      },
      {
        name: 'get_moderators',
        description: 'Get the list of moderators for a broadcaster\'s channel. Requires channel:read:moderators scope.',
        inputSchema: {
          type: 'object',
          properties: {
            broadcaster_id: { type: 'string', description: 'Broadcaster user ID' },
            user_id: { type: 'string', description: 'Filter by specific user IDs (comma-separated, max 100)' },
            first: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
          },
          required: ['broadcaster_id'],
        },
      },
      {
        name: 'get_polls',
        description: 'Get polls (all or by specific IDs) for a broadcaster\'s channel from the last 90 days. Requires channel:read:polls scope.',
        inputSchema: {
          type: 'object',
          properties: {
            broadcaster_id: { type: 'string', description: 'Broadcaster user ID' },
            id: { type: 'string', description: 'Filter by specific poll IDs (comma-separated, max 20)' },
            first: { type: 'number', description: 'Maximum results to return (default: 20, max: 20)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
          },
          required: ['broadcaster_id'],
        },
      },
      {
        name: 'get_predictions',
        description: 'Get Channel Points predictions for a broadcaster\'s channel from the last 90 days, including outcomes and point totals. Requires channel:read:predictions scope.',
        inputSchema: {
          type: 'object',
          properties: {
            broadcaster_id: { type: 'string', description: 'Broadcaster user ID' },
            id: { type: 'string', description: 'Filter by specific prediction IDs (comma-separated, max 25)' },
            first: { type: 'number', description: 'Maximum results to return (default: 20, max: 25)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
          },
          required: ['broadcaster_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_streams':
          return await this.getStreams(args);
        case 'get_users':
          return await this.getUsers(args);
        case 'get_channels':
          return await this.getChannels(args);
        case 'search_channels':
          return await this.searchChannels(args);
        case 'search_categories':
          return await this.searchCategories(args);
        case 'get_clips':
          return await this.getClips(args);
        case 'create_clip':
          return await this.createClip(args);
        case 'get_games':
          return await this.getGames(args);
        case 'get_top_games':
          return await this.getTopGames(args);
        case 'get_videos':
          return await this.getVideos(args);
        case 'get_channel_schedule':
          return await this.getChannelSchedule(args);
        case 'get_chat_settings':
          return await this.getChatSettings(args);
        case 'get_chatters':
          return await this.getChatters(args);
        case 'get_subscriptions':
          return await this.getSubscriptions(args);
        case 'get_bits_leaderboard':
          return await this.getBitsLeaderboard(args);
        case 'get_moderators':
          return await this.getModerators(args);
        case 'get_polls':
          return await this.getPolls(args);
        case 'get_predictions':
          return await this.getPredictions(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Client-ID': this.clientId,
      'Content-Type': 'application/json',
    };
  }

  private async helixGet(path: string, params: URLSearchParams): Promise<ToolResult> {
    const qs = params.toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Twitch API error ${response.status}: ${errText}` }], isError: true };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Twitch returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async helixPost(path: string, body: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Twitch API error ${response.status}: ${errText}` }], isError: true };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Twitch returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getStreams(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.user_login) params.append('user_login', args.user_login as string);
    if (args.user_id) params.append('user_id', args.user_id as string);
    if (args.game_id) params.append('game_id', args.game_id as string);
    if (args.language) params.append('language', args.language as string);
    if (args.type) params.append('type', args.type as string);
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    if (args.before) params.append('before', args.before as string);
    return this.helixGet('/streams', params);
  }

  private async getUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.id) params.append('id', args.id as string);
    if (args.login) params.append('login', args.login as string);
    return this.helixGet('/users', params);
  }

  private async getChannels(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ broadcaster_id: args.broadcaster_id as string });
    return this.helixGet('/channels', params);
  }

  private async searchChannels(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ query: args.query as string });
    if (args.live_only !== undefined) params.append('live_only', String(args.live_only));
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    return this.helixGet('/search/channels', params);
  }

  private async searchCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ query: args.query as string });
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    return this.helixGet('/search/categories', params);
  }

  private async getClips(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.broadcaster_id) params.append('broadcaster_id', args.broadcaster_id as string);
    if (args.game_id) params.append('game_id', args.game_id as string);
    if (args.id) params.append('id', args.id as string);
    if (args.started_at) params.append('started_at', args.started_at as string);
    if (args.ended_at) params.append('ended_at', args.ended_at as string);
    if (args.is_featured !== undefined) params.append('is_featured', String(args.is_featured));
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    if (args.before) params.append('before', args.before as string);
    return this.helixGet('/clips', params);
  }

  private async createClip(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ broadcaster_id: args.broadcaster_id as string });
    if (args.has_delay !== undefined) params.append('has_delay', String(args.has_delay));
    return this.helixPost(`/clips?${params.toString()}`, {});
  }

  private async getGames(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.id) params.append('id', args.id as string);
    if (args.name) params.append('name', args.name as string);
    if (args.igdb_id) params.append('igdb_id', args.igdb_id as string);
    return this.helixGet('/games', params);
  }

  private async getTopGames(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    if (args.before) params.append('before', args.before as string);
    return this.helixGet('/games/top', params);
  }

  private async getVideos(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.id) params.append('id', args.id as string);
    if (args.user_id) params.append('user_id', args.user_id as string);
    if (args.game_id) params.append('game_id', args.game_id as string);
    if (args.language) params.append('language', args.language as string);
    if (args.period) params.append('period', args.period as string);
    if (args.sort) params.append('sort', args.sort as string);
    if (args.type) params.append('type', args.type as string);
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    if (args.before) params.append('before', args.before as string);
    return this.helixGet('/videos', params);
  }

  private async getChannelSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ broadcaster_id: args.broadcaster_id as string });
    if (args.id) params.append('id', args.id as string);
    if (args.start_time) params.append('start_time', args.start_time as string);
    if (args.utc_offset) params.append('utc_offset', args.utc_offset as string);
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    return this.helixGet('/schedule', params);
  }

  private async getChatSettings(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ broadcaster_id: args.broadcaster_id as string });
    if (args.moderator_id) params.append('moderator_id', args.moderator_id as string);
    return this.helixGet('/chat/settings', params);
  }

  private async getChatters(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      broadcaster_id: args.broadcaster_id as string,
      moderator_id: args.moderator_id as string,
    });
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    return this.helixGet('/chat/chatters', params);
  }

  private async getSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ broadcaster_id: args.broadcaster_id as string });
    if (args.user_id) params.append('user_id', args.user_id as string);
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    return this.helixGet('/subscriptions', params);
  }

  private async getBitsLeaderboard(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.count) params.append('count', String(args.count));
    if (args.period) params.append('period', args.period as string);
    if (args.started_at) params.append('started_at', args.started_at as string);
    if (args.user_id) params.append('user_id', args.user_id as string);
    return this.helixGet('/bits/leaderboard', params);
  }

  private async getModerators(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ broadcaster_id: args.broadcaster_id as string });
    if (args.user_id) params.append('user_id', args.user_id as string);
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    return this.helixGet('/moderation/moderators', params);
  }

  private async getPolls(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ broadcaster_id: args.broadcaster_id as string });
    if (args.id) params.append('id', args.id as string);
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    return this.helixGet('/polls', params);
  }

  private async getPredictions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ broadcaster_id: args.broadcaster_id as string });
    if (args.id) params.append('id', args.id as string);
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    return this.helixGet('/predictions', params);
  }
}
