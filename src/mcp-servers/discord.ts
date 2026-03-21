/**
 * Discord MCP Server
 * Discord REST API v10 adapter for reading and sending messages across guilds
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface DiscordConfig {
  botToken: string;
}

export class DiscordMCPServer {
  private readonly baseUrl = 'https://discord.com/api/v10';
  private readonly headers: Record<string, string>;

  constructor(config: DiscordConfig) {
    this.headers = {
      Authorization: `Bot ${config.botToken}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_guilds',
        description: 'List guilds (servers) the bot is a member of',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of guilds to return (default: 100, max: 200)',
            },
            after: {
              type: 'string',
              description: 'Guild ID to paginate after',
            },
          },
        },
      },
      {
        name: 'list_channels',
        description: 'List all channels in a Discord guild',
        inputSchema: {
          type: 'object',
          properties: {
            guildId: {
              type: 'string',
              description: 'The guild (server) ID',
            },
          },
          required: ['guildId'],
        },
      },
      {
        name: 'send_message',
        description: 'Send a message to a Discord channel',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'The channel ID to send the message to',
            },
            content: {
              type: 'string',
              description: 'The message text content',
            },
            tts: {
              type: 'boolean',
              description: 'Whether to send the message as text-to-speech (default: false)',
            },
          },
          required: ['channelId', 'content'],
        },
      },
      {
        name: 'get_messages',
        description: 'Retrieve messages from a Discord channel',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'The channel ID to retrieve messages from',
            },
            limit: {
              type: 'number',
              description: 'Number of messages to return (default: 50, max: 100)',
            },
            before: {
              type: 'string',
              description: 'Message ID to retrieve messages before',
            },
            after: {
              type: 'string',
              description: 'Message ID to retrieve messages after',
            },
          },
          required: ['channelId'],
        },
      },
      {
        name: 'get_guild_members',
        description: 'List members of a Discord guild',
        inputSchema: {
          type: 'object',
          properties: {
            guildId: {
              type: 'string',
              description: 'The guild (server) ID',
            },
            limit: {
              type: 'number',
              description: 'Number of members to return (default: 100, max: 1000)',
            },
            after: {
              type: 'string',
              description: 'User ID to paginate after',
            },
          },
          required: ['guildId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_guilds':
          return await this.listGuilds(
            args.limit as number | undefined,
            args.after as string | undefined
          );
        case 'list_channels':
          return await this.listChannels(args.guildId as string);
        case 'send_message':
          return await this.sendMessage(
            args.channelId as string,
            args.content as string,
            args.tts as boolean | undefined
          );
        case 'get_messages':
          return await this.getMessages(
            args.channelId as string,
            args.limit as number | undefined,
            args.before as string | undefined,
            args.after as string | undefined
          );
        case 'get_guild_members':
          return await this.getGuildMembers(
            args.guildId as string,
            args.limit as number | undefined,
            args.after as string | undefined
          );
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

  private async listGuilds(limit?: number, after?: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(limit ?? 100));
    if (after) params.append('after', after);

    const response = await fetch(
      `${this.baseUrl}/users/@me/guilds?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Discord returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listChannels(guildId: string): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/guilds/${guildId}/channels`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Discord returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async sendMessage(channelId: string, content: string, tts?: boolean): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ content, tts: tts ?? false }),
      }
    );
    if (!response.ok) throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Discord returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getMessages(
    channelId: string,
    limit?: number,
    before?: string,
    after?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(limit ?? 50));
    if (before) params.append('before', before);
    if (after) params.append('after', after);

    const response = await fetch(
      `${this.baseUrl}/channels/${channelId}/messages?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Discord returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getGuildMembers(
    guildId: string,
    limit?: number,
    after?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(limit ?? 100));
    if (after) params.append('after', after);

    const response = await fetch(
      `${this.baseUrl}/guilds/${guildId}/members?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Discord returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
