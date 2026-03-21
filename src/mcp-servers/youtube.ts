/**
 * YouTube MCP Server
 * YouTube Data API v3 adapter for search, videos, channels, and playlists
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface YouTubeConfig {
  apiKey?: string;
  accessToken?: string;
}

export class YouTubeMCPServer {
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly apiKey?: string;
  private readonly headers: Record<string, string>;

  constructor(config: YouTubeConfig) {
    this.apiKey = config.apiKey;
    this.headers = { 'Content-Type': 'application/json' };
    if (config.accessToken) {
      this.headers['Authorization'] = `Bearer ${config.accessToken}`;
    }
  }

  private addAuth(params: URLSearchParams): void {
    if (this.apiKey) params.append('key', this.apiKey);
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search',
        description: 'Search YouTube for videos, channels, or playlists',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query' },
            type: { type: 'string', description: 'Resource type: video, channel, or playlist' },
            max_results: { type: 'number', description: 'Number of results (max: 50)' },
            page_token: { type: 'string', description: 'Pagination token' },
            order: { type: 'string', description: 'Sort order: date, rating, relevance, title, viewCount' },
            published_after: { type: 'string', description: 'ISO 8601 datetime for published after filter' },
          },
          required: ['q'],
        },
      },
      {
        name: 'list_videos',
        description: 'List videos by IDs or chart (most popular)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Comma-separated video IDs' },
            chart: { type: 'string', description: 'Chart type: mostPopular' },
            region_code: { type: 'string', description: 'ISO 3166-1 alpha-2 region code' },
            max_results: { type: 'number', description: 'Number of results (max: 50)' },
            page_token: { type: 'string', description: 'Pagination token' },
          },
        },
      },
      {
        name: 'get_video',
        description: 'Get detailed information about a specific video',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'YouTube video ID' },
            parts: { type: 'string', description: 'Comma-separated parts: snippet,statistics,contentDetails' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_channels',
        description: 'List channels by ID, username, or the authenticated user\'s channel',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Comma-separated channel IDs' },
            for_username: { type: 'string', description: 'Channel username' },
            mine: { type: 'boolean', description: 'Return the authenticated user\'s channel' },
            max_results: { type: 'number', description: 'Number of results (max: 50)' },
            page_token: { type: 'string', description: 'Pagination token' },
          },
        },
      },
      {
        name: 'list_playlists',
        description: 'List playlists by channel ID or the authenticated user\'s playlists',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: { type: 'string', description: 'Channel ID to list playlists for' },
            id: { type: 'string', description: 'Comma-separated playlist IDs' },
            mine: { type: 'boolean', description: 'Return the authenticated user\'s playlists' },
            max_results: { type: 'number', description: 'Number of results (max: 50)' },
            page_token: { type: 'string', description: 'Pagination token' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search':
          return await this.search(args);
        case 'list_videos':
          return await this.listVideos(args);
        case 'get_video':
          return await this.getVideo(args);
        case 'list_channels':
          return await this.listChannels(args);
        case 'list_playlists':
          return await this.listPlaylists(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async search(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet', q: args.q as string });
    if (args.type) params.append('type', args.type as string);
    if (args.max_results) params.append('maxResults', String(args.max_results));
    if (args.page_token) params.append('pageToken', args.page_token as string);
    if (args.order) params.append('order', args.order as string);
    if (args.published_after) params.append('publishedAfter', args.published_after as string);
    this.addAuth(params);
    const response = await fetch(`${this.baseUrl}/search?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listVideos(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet,statistics' });
    if (args.id) params.append('id', args.id as string);
    if (args.chart) params.append('chart', args.chart as string);
    if (args.region_code) params.append('regionCode', args.region_code as string);
    if (args.max_results) params.append('maxResults', String(args.max_results));
    if (args.page_token) params.append('pageToken', args.page_token as string);
    this.addAuth(params);
    const response = await fetch(`${this.baseUrl}/videos?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getVideo(args: Record<string, unknown>): Promise<ToolResult> {
    const parts = (args.parts as string | undefined) ?? 'snippet,statistics,contentDetails';
    const params = new URLSearchParams({ part: parts, id: args.id as string });
    this.addAuth(params);
    const response = await fetch(`${this.baseUrl}/videos?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listChannels(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet,statistics' });
    if (args.id) params.append('id', args.id as string);
    if (args.for_username) params.append('forUsername', args.for_username as string);
    if (args.mine) params.append('mine', String(args.mine));
    if (args.max_results) params.append('maxResults', String(args.max_results));
    if (args.page_token) params.append('pageToken', args.page_token as string);
    this.addAuth(params);
    const response = await fetch(`${this.baseUrl}/channels?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listPlaylists(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ part: 'snippet,contentDetails' });
    if (args.channel_id) params.append('channelId', args.channel_id as string);
    if (args.id) params.append('id', args.id as string);
    if (args.mine) params.append('mine', String(args.mine));
    if (args.max_results) params.append('maxResults', String(args.max_results));
    if (args.page_token) params.append('pageToken', args.page_token as string);
    this.addAuth(params);
    const response = await fetch(`${this.baseUrl}/playlists?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
