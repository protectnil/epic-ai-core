/**
 * Twitch MCP Server
 * Twitch Helix API adapter for streams, users, channels, and clips
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface TwitchConfig {
  accessToken: string;
  clientId: string;
}

export class TwitchMCPServer {
  private readonly baseUrl = 'https://api.twitch.tv/helix';
  private readonly headers: Record<string, string>;

  constructor(config: TwitchConfig) {
    this.headers = {
      Authorization: `Bearer ${config.accessToken}`,
      'Client-ID': config.clientId,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_streams',
        description: 'Get live streams matching optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            user_login: { type: 'string', description: 'Username to filter streams by' },
            game_id: { type: 'string', description: 'Game ID to filter streams by' },
            language: { type: 'string', description: 'Language code to filter streams by' },
            first: { type: 'number', description: 'Maximum number of results (max: 100)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
          },
        },
      },
      {
        name: 'get_users',
        description: 'Get information about one or more Twitch users by login or ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'User ID (comma-separated for multiple)' },
            login: { type: 'string', description: 'Username (comma-separated for multiple)' },
          },
        },
      },
      {
        name: 'get_channels',
        description: 'Get channel information for a broadcaster',
        inputSchema: {
          type: 'object',
          properties: {
            broadcaster_id: { type: 'string', description: 'Broadcaster user ID' },
          },
          required: ['broadcaster_id'],
        },
      },
      {
        name: 'search_channels',
        description: 'Search for channels by query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string' },
            first: { type: 'number', description: 'Maximum number of results (max: 100)' },
            live_only: { type: 'boolean', description: 'Only return live channels' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_clips',
        description: 'Get clips for a broadcaster, game, or by clip ID',
        inputSchema: {
          type: 'object',
          properties: {
            broadcaster_id: { type: 'string', description: 'Broadcaster ID to get clips for' },
            game_id: { type: 'string', description: 'Game ID to get clips for' },
            id: { type: 'string', description: 'Clip ID' },
            first: { type: 'number', description: 'Maximum number of results (max: 100)' },
            after: { type: 'string', description: 'Cursor for forward pagination' },
            started_at: { type: 'string', description: 'Start of date range (RFC3339)' },
            ended_at: { type: 'string', description: 'End of date range (RFC3339)' },
          },
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
          return await this.getChannels(args.broadcaster_id as string);
        case 'search_channels':
          return await this.searchChannels(args);
        case 'get_clips':
          return await this.getClips(args);
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

  private async getStreams(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.user_login) params.append('user_login', args.user_login as string);
    if (args.game_id) params.append('game_id', args.game_id as string);
    if (args.language) params.append('language', args.language as string);
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    const response = await fetch(`${this.baseUrl}/streams?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Twitch API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.id) params.append('id', args.id as string);
    if (args.login) params.append('login', args.login as string);
    const response = await fetch(`${this.baseUrl}/users?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Twitch API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getChannels(broadcasterId: string): Promise<ToolResult> {
    const params = new URLSearchParams({ broadcaster_id: broadcasterId });
    const response = await fetch(`${this.baseUrl}/channels?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Twitch API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async searchChannels(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ query: args.query as string });
    if (args.first) params.append('first', String(args.first));
    if (args.live_only !== undefined) params.append('live_only', String(args.live_only));
    if (args.after) params.append('after', args.after as string);
    const response = await fetch(`${this.baseUrl}/search/channels?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Twitch API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getClips(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.broadcaster_id) params.append('broadcaster_id', args.broadcaster_id as string);
    if (args.game_id) params.append('game_id', args.game_id as string);
    if (args.id) params.append('id', args.id as string);
    if (args.first) params.append('first', String(args.first));
    if (args.after) params.append('after', args.after as string);
    if (args.started_at) params.append('started_at', args.started_at as string);
    if (args.ended_at) params.append('ended_at', args.ended_at as string);
    const response = await fetch(`${this.baseUrl}/clips?${params}`, { method: 'GET', headers: this.headers });
    if (!response.ok) throw new Error(`Twitch API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
