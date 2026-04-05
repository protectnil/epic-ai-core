/**
 * Brightcove MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Brightcove MCP server was found on GitHub, npm, or the Brightcove developer portal.
// No community-maintained Brightcove MCP server appears in major MCP registries.
// Our adapter covers: 24 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no vendor MCP exists. Build this REST wrapper for all deployments.
//
// Base URL: https://cms.api.brightcove.com/v1 (CMS API)
//           https://ingest.api.brightcove.com/v1 (Dynamic Ingest API)
//           https://players.api.brightcove.com/v2 (Players API)
// Auth: OAuth2 client credentials
//       POST https://oauth.brightcove.com/v4/access_token
//       Basic auth with Base64(client_id:client_secret). Returns bearer token.
//       Tokens expire in ~300 seconds (5 minutes). Adapter refreshes proactively.
// Docs: https://apis.support.brightcove.com/cms/
//       https://apis.support.brightcove.com/dynamic-ingest/
//       https://apis.support.brightcove.com/player-management/
// Rate limits: CMS API ~20 req/10s write, ~100 req/10s read. Dynamic Ingest: varies by plan.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BrightcoveConfig {
  clientId: string;
  clientSecret: string;
  accountId: string;
  baseUrl?: string;
  ingestBaseUrl?: string;
  playersBaseUrl?: string;
}

export class BrightcoveMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly accountId: string;
  private readonly baseUrl: string;
  private readonly ingestBaseUrl: string;
  private readonly playersBaseUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: BrightcoveConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.accountId = config.accountId;
    this.baseUrl = config.baseUrl ?? 'https://cms.api.brightcove.com/v1';
    this.ingestBaseUrl = config.ingestBaseUrl ?? 'https://ingest.api.brightcove.com/v1';
    this.playersBaseUrl = config.playersBaseUrl ?? 'https://players.api.brightcove.com/v2';
  }

  static catalog() {
    return {
      name: 'brightcove',
      displayName: 'Brightcove',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'brightcove', 'video', 'enterprise video', 'video platform', 'vod', 'live video',
        'playlist', 'video management', 'ingest', 'player', 'media', 'streaming',
        'video analytics', 'video hosting', 'content delivery',
      ],
      toolNames: [
        'list_videos', 'get_video', 'create_video', 'update_video', 'delete_video',
        'search_videos',
        'get_video_sources', 'get_video_images',
        'list_playlists', 'get_playlist', 'create_playlist', 'update_playlist', 'delete_playlist',
        'get_videos_in_playlist',
        'ingest_video',
        'list_players', 'get_player', 'create_player', 'update_player',
        'list_folders', 'get_folder', 'create_folder',
        'get_video_count', 'get_playlist_count',
      ],
      description: 'Brightcove enterprise video platform: manage videos, playlists, ingest media, configure players, and organize content in folders.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Videos ────────────────────────────────────────────────────────────
      {
        name: 'list_videos',
        description: 'List videos in the Brightcove account with optional sort, state filter, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max videos to return (default: 20, max: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: {
              type: 'string',
              description: 'Sort field: name, reference_id, created_at, published_at, updated_at, schedule.starts_at (prefix with - for DESC, default: -updated_at)',
            },
            state: {
              type: 'string',
              description: 'Filter by state: ACTIVE, INACTIVE (default: returns both)',
            },
            folder_id: { type: 'string', description: 'Filter videos in a specific folder ID' },
          },
        },
      },
      {
        name: 'get_video',
        description: 'Get full metadata for a specific Brightcove video by video ID',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: { type: 'string', description: 'Brightcove video ID' },
          },
          required: ['video_id'],
        },
      },
      {
        name: 'create_video',
        description: 'Create a new video metadata record in Brightcove (without uploading media — use ingest_video to add sources)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Video title/name (required)' },
            description: { type: 'string', description: 'Short description (max 250 characters)' },
            long_description: { type: 'string', description: 'Full description of the video' },
            reference_id: { type: 'string', description: 'Optional unique reference ID for your system' },
            tags: {
              type: 'string',
              description: 'Comma-separated tags for the video (e.g. "sports,highlights,2026")',
            },
            state: {
              type: 'string',
              description: 'Initial state: ACTIVE or INACTIVE (default: ACTIVE)',
            },
            schedule_starts_at: {
              type: 'string',
              description: 'ISO 8601 datetime to schedule video activation',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_video',
        description: 'Update video metadata including name, description, tags, state, and custom fields',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: { type: 'string', description: 'Brightcove video ID to update' },
            name: { type: 'string', description: 'Updated video title' },
            description: { type: 'string', description: 'Updated short description' },
            long_description: { type: 'string', description: 'Updated full description' },
            tags: { type: 'string', description: 'Updated comma-separated tags (replaces existing tags)' },
            state: { type: 'string', description: 'Updated state: ACTIVE or INACTIVE' },
            reference_id: { type: 'string', description: 'Updated reference ID' },
          },
          required: ['video_id'],
        },
      },
      {
        name: 'delete_video',
        description: 'Delete a Brightcove video and all its associated sources and renditions permanently',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: { type: 'string', description: 'Brightcove video ID to delete' },
          },
          required: ['video_id'],
        },
      },
      {
        name: 'search_videos',
        description: 'Search videos using Brightcove search syntax — by name, tags, date range, or custom fields',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query using Brightcove syntax (e.g. "name:interview tags:sports updated_at:2024-01-01..")',
            },
            limit: { type: 'number', description: 'Max results to return (default: 20, max: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: { type: 'string', description: 'Sort field with optional - prefix for DESC (default: -updated_at)' },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_video_sources',
        description: 'Get all renditions and source URLs for a Brightcove video including MP4, HLS, and DASH manifests',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: { type: 'string', description: 'Brightcove video ID' },
          },
          required: ['video_id'],
        },
      },
      {
        name: 'get_video_images',
        description: 'Get thumbnail and poster image URLs for a Brightcove video',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: { type: 'string', description: 'Brightcove video ID' },
          },
          required: ['video_id'],
        },
      },
      // ── Playlists ─────────────────────────────────────────────────────────
      {
        name: 'list_playlists',
        description: 'List all playlists in the Brightcove account with type, video count, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max playlists to return (default: 20, max: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: { type: 'string', description: 'Sort field with optional - prefix for DESC (default: -updated_at)' },
          },
        },
      },
      {
        name: 'get_playlist',
        description: 'Get metadata for a specific Brightcove playlist by playlist ID',
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Brightcove playlist ID' },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'create_playlist',
        description: 'Create a new manual or smart (ACTIVATED_OLDEST_TO_NEWEST etc.) playlist in Brightcove',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Playlist name' },
            type: {
              type: 'string',
              description: 'Playlist type: EXPLICIT (manual), ACTIVATED_OLDEST_TO_NEWEST, ACTIVATED_NEWEST_TO_OLDEST, ALPHABETICAL, PLAYS_TOTAL, PLAYS_TRAILING_WEEK, START_DATE_OLDEST_TO_NEWEST, START_DATE_NEWEST_TO_OLDEST',
            },
            video_ids: {
              type: 'string',
              description: 'Comma-separated video IDs for EXPLICIT playlists (ordered)',
            },
            description: { type: 'string', description: 'Optional playlist description' },
            search: {
              type: 'string',
              description: 'Smart playlist search query (for non-EXPLICIT types)',
            },
            limit: {
              type: 'number',
              description: 'Max videos in smart playlist (default: 100, max: 100)',
            },
          },
          required: ['name', 'type'],
        },
      },
      {
        name: 'update_playlist',
        description: 'Update playlist metadata, type, or video list for an existing Brightcove playlist',
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Playlist ID to update' },
            name: { type: 'string', description: 'Updated playlist name' },
            description: { type: 'string', description: 'Updated description' },
            video_ids: { type: 'string', description: 'Updated comma-separated video IDs (EXPLICIT playlists only)' },
            search: { type: 'string', description: 'Updated smart playlist search query' },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'delete_playlist',
        description: 'Delete a Brightcove playlist (does not delete the videos in it)',
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Playlist ID to delete' },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'get_videos_in_playlist',
        description: 'Get the ordered list of videos in a specific Brightcove playlist with metadata',
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Playlist ID to retrieve videos from' },
            limit: { type: 'number', description: 'Max videos to return (default: 20, max: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['playlist_id'],
        },
      },
      // ── Dynamic Ingest ─────────────────────────────────────────────────────
      {
        name: 'ingest_video',
        description: 'Ingest (upload) a video into Brightcove by pulling from a public URL — creates renditions via the Dynamic Ingest API',
        inputSchema: {
          type: 'object',
          properties: {
            video_id: {
              type: 'string',
              description: 'Existing Brightcove video ID to attach the ingested file to (create via create_video first)',
            },
            url: {
              type: 'string',
              description: 'Publicly accessible URL of the video file to ingest (MP4, MOV, MXF, etc.)',
            },
            profile: {
              type: 'string',
              description: 'Ingest profile name (e.g. "multi-platform-standard-static", "high-resolution" — default: account default profile)',
            },
            capture_images: {
              type: 'boolean',
              description: 'Auto-generate poster and thumbnail from video (default: true)',
            },
            priority: {
              type: 'string',
              description: 'Ingest priority: low or normal (default: normal)',
            },
          },
          required: ['video_id', 'url'],
        },
      },
      // ── Players ────────────────────────────────────────────────────────────
      {
        name: 'list_players',
        description: 'List all Brightcove players configured in the account with embed codes and settings',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max players to return (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_player',
        description: 'Get configuration and embed details for a specific Brightcove player by player ID',
        inputSchema: {
          type: 'object',
          properties: {
            player_id: { type: 'string', description: 'Brightcove player ID' },
          },
          required: ['player_id'],
        },
      },
      {
        name: 'create_player',
        description: 'Create a new Brightcove player with optional name, description, and initial configuration',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Player name' },
            description: { type: 'string', description: 'Player description' },
            autoadvance: {
              type: 'number',
              description: 'Seconds before advancing to next video in a playlist (0 = off)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_player',
        description: 'Update configuration for an existing Brightcove player including name and description',
        inputSchema: {
          type: 'object',
          properties: {
            player_id: { type: 'string', description: 'Player ID to update' },
            name: { type: 'string', description: 'Updated player name' },
            description: { type: 'string', description: 'Updated description' },
          },
          required: ['player_id'],
        },
      },
      // ── Folders ────────────────────────────────────────────────────────────
      {
        name: 'list_folders',
        description: 'List all folders in the Brightcove account for video organization',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max folders to return (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_folder',
        description: 'Get details for a specific Brightcove folder including video count',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'string', description: 'Folder ID to retrieve' },
          },
          required: ['folder_id'],
        },
      },
      {
        name: 'create_folder',
        description: 'Create a new folder in Brightcove for organizing video content',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Folder name (must be unique within the account)' },
          },
          required: ['name'],
        },
      },
      // ── Counts ─────────────────────────────────────────────────────────────
      {
        name: 'get_video_count',
        description: 'Get total count of videos in the account matching an optional search query',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Optional search query using Brightcove search syntax' },
            folder_id: { type: 'string', description: 'Count videos in a specific folder' },
          },
        },
      },
      {
        name: 'get_playlist_count',
        description: 'Get total count of playlists in the Brightcove account',
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
        case 'list_videos':            return this.listVideos(args);
        case 'get_video':              return this.getVideo(args);
        case 'create_video':           return this.createVideo(args);
        case 'update_video':           return this.updateVideo(args);
        case 'delete_video':           return this.deleteVideo(args);
        case 'search_videos':          return this.searchVideos(args);
        case 'get_video_sources':      return this.getVideoSources(args);
        case 'get_video_images':       return this.getVideoImages(args);
        case 'list_playlists':         return this.listPlaylists(args);
        case 'get_playlist':           return this.getPlaylist(args);
        case 'create_playlist':        return this.createPlaylist(args);
        case 'update_playlist':        return this.updatePlaylist(args);
        case 'delete_playlist':        return this.deletePlaylist(args);
        case 'get_videos_in_playlist': return this.getVideosInPlaylist(args);
        case 'ingest_video':           return this.ingestVideo(args);
        case 'list_players':           return this.listPlayers(args);
        case 'get_player':             return this.getPlayer(args);
        case 'create_player':          return this.createPlayer(args);
        case 'update_player':          return this.updatePlayer(args);
        case 'list_folders':           return this.listFolders(args);
        case 'get_folder':             return this.getFolder(args);
        case 'create_folder':          return this.createFolder(args);
        case 'get_video_count':        return this.getVideoCount(args);
        case 'get_playlist_count':     return this.getPlaylistCount();
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;

    const response = await this.fetchWithRetry('https://oauth.brightcove.com/v4/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) throw new Error(`Brightcove OAuth token request failed: ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    // Tokens expire in ~300s (5 min); refresh 60s early
    this.tokenExpiry = now + ((data.expires_in ?? 300) - 60) * 1000;
    return this.bearerToken;
  }

  private async cmsGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${this.baseUrl}/accounts/${this.accountId}${path}${qs}`;
    const response = await this.fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cmsPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const url = `${this.baseUrl}/accounts/${this.accountId}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cmsPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const url = `${this.baseUrl}/accounts/${this.accountId}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cmsDelete(path: string): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const url = `${this.baseUrl}/accounts/${this.accountId}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async ingestPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const url = `${this.ingestBaseUrl}/accounts/${this.accountId}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async playersGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${this.playersBaseUrl}/accounts/${this.accountId}${path}${qs}`;
    const response = await this.fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async playersPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const url = `${this.playersBaseUrl}/accounts/${this.accountId}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async playersPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const url = `${this.playersBaseUrl}/accounts/${this.accountId}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ──────────────────────────────────────────────────

  private async listVideos(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
      sort: (args.sort as string) ?? '-updated_at',
    };
    if (args.state) params.state = args.state as string;
    if (args.folder_id) params.folder_id = args.folder_id as string;
    return this.cmsGet('/videos', params);
  }

  private async getVideo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    return this.cmsGet(`/videos/${encodeURIComponent(args.video_id as string)}`);
  }

  private async createVideo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      state: (args.state as string) ?? 'ACTIVE',
    };
    if (args.description) body.description = args.description;
    if (args.long_description) body.long_description = args.long_description;
    if (args.reference_id) body.reference_id = args.reference_id;
    if (args.tags) body.tags = (args.tags as string).split(',').map(t => t.trim());
    if (args.schedule_starts_at) body.schedule = { starts_at: args.schedule_starts_at };
    return this.cmsPost('/videos', body);
  }

  private async updateVideo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.long_description) body.long_description = args.long_description;
    if (args.state) body.state = args.state;
    if (args.reference_id) body.reference_id = args.reference_id;
    if (args.tags) body.tags = (args.tags as string).split(',').map(t => t.trim());
    return this.cmsPatch(`/videos/${encodeURIComponent(args.video_id as string)}`, body);
  }

  private async deleteVideo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    return this.cmsDelete(`/videos/${encodeURIComponent(args.video_id as string)}`);
  }

  private async searchVideos(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string> = {
      q: args.q as string,
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
      sort: (args.sort as string) ?? '-updated_at',
    };
    return this.cmsGet('/videos', params);
  }

  private async getVideoSources(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    return this.cmsGet(`/videos/${encodeURIComponent(args.video_id as string)}/sources`);
  }

  private async getVideoImages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id) return { content: [{ type: 'text', text: 'video_id is required' }], isError: true };
    return this.cmsGet(`/videos/${encodeURIComponent(args.video_id as string)}/images`);
  }

  private async listPlaylists(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
      sort: (args.sort as string) ?? '-updated_at',
    };
    return this.cmsGet('/playlists', params);
  }

  private async getPlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.playlist_id) return { content: [{ type: 'text', text: 'playlist_id is required' }], isError: true };
    return this.cmsGet(`/playlists/${encodeURIComponent(args.playlist_id as string)}`);
  }

  private async createPlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.type) {
      return { content: [{ type: 'text', text: 'name and type are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      type: args.type,
    };
    if (args.description) body.description = args.description;
    if (args.video_ids) body.video_ids = (args.video_ids as string).split(',').map(id => id.trim());
    if (args.search) body.search = args.search;
    if (args.limit) body.limit = args.limit;
    return this.cmsPost('/playlists', body);
  }

  private async updatePlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.playlist_id) return { content: [{ type: 'text', text: 'playlist_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.video_ids) body.video_ids = (args.video_ids as string).split(',').map(id => id.trim());
    if (args.search) body.search = args.search;
    return this.cmsPatch(`/playlists/${encodeURIComponent(args.playlist_id as string)}`, body);
  }

  private async deletePlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.playlist_id) return { content: [{ type: 'text', text: 'playlist_id is required' }], isError: true };
    return this.cmsDelete(`/playlists/${encodeURIComponent(args.playlist_id as string)}`);
  }

  private async getVideosInPlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.playlist_id) return { content: [{ type: 'text', text: 'playlist_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    return this.cmsGet(`/playlists/${encodeURIComponent(args.playlist_id as string)}/videos`, params);
  }

  private async ingestVideo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.video_id || !args.url) {
      return { content: [{ type: 'text', text: 'video_id and url are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      master: { url: args.url },
      capture_images: typeof args.capture_images === 'boolean' ? args.capture_images : true,
      priority: (args.priority as string) ?? 'normal',
    };
    if (args.profile) body.profile = args.profile;
    return this.ingestPost(`/videos/${encodeURIComponent(args.video_id as string)}/ingest-requests`, body);
  }

  private async listPlayers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    return this.playersGet('/players', params);
  }

  private async getPlayer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.player_id) return { content: [{ type: 'text', text: 'player_id is required' }], isError: true };
    return this.playersGet(`/players/${encodeURIComponent(args.player_id as string)}`);
  }

  private async createPlayer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    const config: Record<string, unknown> = {};
    if (args.autoadvance != null) config.autoadvance = args.autoadvance;
    if (Object.keys(config).length) body.configuration = config;
    return this.playersPost('/players', body);
  }

  private async updatePlayer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.player_id) return { content: [{ type: 'text', text: 'player_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    return this.playersPatch(`/players/${encodeURIComponent(args.player_id as string)}`, body);
  }

  private async listFolders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 20),
      offset: String((args.offset as number) ?? 0),
    };
    return this.cmsGet('/folders', params);
  }

  private async getFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folder_id) return { content: [{ type: 'text', text: 'folder_id is required' }], isError: true };
    return this.cmsGet(`/folders/${encodeURIComponent(args.folder_id as string)}`);
  }

  private async createFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.cmsPost('/folders', { name: args.name });
  }

  private async getVideoCount(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.q) params.q = args.q as string;
    if (args.folder_id) params.folder_id = args.folder_id as string;
    return this.cmsGet('/counts/videos', params);
  }

  private async getPlaylistCount(): Promise<ToolResult> {
    return this.cmsGet('/counts/playlists');
  }
}
