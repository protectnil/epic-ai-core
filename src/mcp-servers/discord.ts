/**
 * Discord MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28. Discord Inc. has not published an official MCP server.
//   Community servers exist (e.g. github.com/v-fol/mcp-discord, github.com/barryyip0625/mcp-discord,
//   github.com/SaseQ/discord-mcp) but none are published by Discord and none meet the 4 criteria
//   for vendor MCP preference (not official). Researched 2026-03-28.
// Our adapter covers: 20 tools (guilds, channels, messages, members, roles, webhooks).
//   Use this adapter for full bot-token REST API access.
//
// Base URL: https://discord.com/api/v10
// Auth: Bot token — Authorization: Bot {botToken}
// Docs: https://discord.com/developers/docs/reference
// Rate limits: Per-route buckets enforced by Discord; global limit 50 req/s per token.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DiscordConfig {
  botToken: string;
  baseUrl?: string;
}

export class DiscordMCPServer extends MCPAdapterBase {
  private readonly botToken: string;
  private readonly baseUrl: string;

  constructor(config: DiscordConfig) {
    super();
    this.botToken = config.botToken;
    this.baseUrl = config.baseUrl ?? 'https://discord.com/api/v10';
  }

  static catalog() {
    return {
      name: 'discord',
      displayName: 'Discord',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: [
        'discord', 'bot', 'guild', 'server', 'channel', 'message', 'role',
        'webhook', 'member', 'thread', 'reaction', 'collaboration', 'chat',
      ],
      toolNames: [
        'list_guilds', 'get_guild', 'list_channels', 'get_channel',
        'create_channel', 'delete_channel', 'send_message', 'get_message',
        'get_messages', 'edit_message', 'delete_message', 'pin_message',
        'add_reaction', 'get_guild_members', 'get_guild_member',
        'list_guild_roles', 'create_guild_role', 'delete_guild_role',
        'list_webhooks', 'execute_webhook',
      ],
      description: 'Discord bot operations: manage guilds, channels, messages, roles, members, and webhooks via the Discord REST API v10.',
      author: 'protectnil',
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bot ${this.botToken}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_guilds',
        description: 'List guilds (servers) the bot is a member of, with optional pagination by guild ID',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of guilds to return (default: 100, max: 200)',
            },
            after: {
              type: 'string',
              description: 'Guild ID to paginate after (returns guilds with ID > this value)',
            },
            before: {
              type: 'string',
              description: 'Guild ID to paginate before (returns guilds with ID < this value)',
            },
          },
        },
      },
      {
        name: 'get_guild',
        description: 'Get details for a specific Discord guild including member count, features, and settings',
        inputSchema: {
          type: 'object',
          properties: {
            guild_id: {
              type: 'string',
              description: 'The guild (server) snowflake ID',
            },
            with_counts: {
              type: 'boolean',
              description: 'Include approximate member and presence counts (default: false)',
            },
          },
          required: ['guild_id'],
        },
      },
      {
        name: 'list_channels',
        description: 'List all channels in a Discord guild including text, voice, category, and thread channels',
        inputSchema: {
          type: 'object',
          properties: {
            guild_id: {
              type: 'string',
              description: 'The guild (server) snowflake ID',
            },
          },
          required: ['guild_id'],
        },
      },
      {
        name: 'get_channel',
        description: 'Get details for a specific Discord channel including type, topic, and permissions',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel snowflake ID',
            },
          },
          required: ['channel_id'],
        },
      },
      {
        name: 'create_channel',
        description: 'Create a new text, voice, or category channel in a guild',
        inputSchema: {
          type: 'object',
          properties: {
            guild_id: {
              type: 'string',
              description: 'The guild (server) snowflake ID',
            },
            name: {
              type: 'string',
              description: 'Channel name (1-100 characters, no spaces for text channels)',
            },
            type: {
              type: 'number',
              description: 'Channel type: 0=text, 2=voice, 4=category, 5=announcement, 15=forum (default: 0)',
            },
            topic: {
              type: 'string',
              description: 'Channel topic (max 1024 characters, text/announcement only)',
            },
            parent_id: {
              type: 'string',
              description: 'ID of the parent category channel',
            },
            position: {
              type: 'number',
              description: 'Sorting position of the channel',
            },
          },
          required: ['guild_id', 'name'],
        },
      },
      {
        name: 'delete_channel',
        description: 'Delete a channel or close a private message from a guild (requires MANAGE_CHANNELS permission)',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel snowflake ID to delete',
            },
          },
          required: ['channel_id'],
        },
      },
      {
        name: 'send_message',
        description: 'Send a message to a Discord channel with optional TTS, embeds, and reply threading',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel snowflake ID to send the message to',
            },
            content: {
              type: 'string',
              description: 'The message text content (up to 2000 characters)',
            },
            tts: {
              type: 'boolean',
              description: 'Whether to send as text-to-speech (default: false)',
            },
            message_reference: {
              type: 'object',
              description: 'Object with message_id to reply to a specific message',
            },
          },
          required: ['channel_id', 'content'],
        },
      },
      {
        name: 'get_message',
        description: 'Get a single message by ID from a channel',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel snowflake ID',
            },
            message_id: {
              type: 'string',
              description: 'The message snowflake ID',
            },
          },
          required: ['channel_id', 'message_id'],
        },
      },
      {
        name: 'get_messages',
        description: 'Retrieve a list of messages from a Discord channel with optional pagination by message ID',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel snowflake ID',
            },
            limit: {
              type: 'number',
              description: 'Number of messages to return (default: 50, max: 100)',
            },
            before: {
              type: 'string',
              description: 'Message ID — return messages before this ID',
            },
            after: {
              type: 'string',
              description: 'Message ID — return messages after this ID',
            },
            around: {
              type: 'string',
              description: 'Message ID — return messages around this ID',
            },
          },
          required: ['channel_id'],
        },
      },
      {
        name: 'edit_message',
        description: 'Edit the content or embeds of a message previously sent by the bot',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel snowflake ID',
            },
            message_id: {
              type: 'string',
              description: 'The message snowflake ID to edit',
            },
            content: {
              type: 'string',
              description: 'New message text content (up to 2000 characters)',
            },
          },
          required: ['channel_id', 'message_id', 'content'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a message from a channel (bot can delete own messages or any with MANAGE_MESSAGES)',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel snowflake ID',
            },
            message_id: {
              type: 'string',
              description: 'The message snowflake ID to delete',
            },
          },
          required: ['channel_id', 'message_id'],
        },
      },
      {
        name: 'pin_message',
        description: 'Pin a message in a channel (requires MANAGE_MESSAGES permission, max 50 pins per channel)',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel snowflake ID',
            },
            message_id: {
              type: 'string',
              description: 'The message snowflake ID to pin',
            },
          },
          required: ['channel_id', 'message_id'],
        },
      },
      {
        name: 'add_reaction',
        description: 'Add an emoji reaction to a message in a channel',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel snowflake ID',
            },
            message_id: {
              type: 'string',
              description: 'The message snowflake ID',
            },
            emoji: {
              type: 'string',
              description: 'URL-encoded emoji: unicode emoji (e.g. 👍 → %F0%9F%91%8D) or custom emoji name:id format',
            },
          },
          required: ['channel_id', 'message_id', 'emoji'],
        },
      },
      {
        name: 'get_guild_members',
        description: 'List members of a Discord guild with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            guild_id: {
              type: 'string',
              description: 'The guild (server) snowflake ID',
            },
            limit: {
              type: 'number',
              description: 'Number of members to return (default: 100, max: 1000)',
            },
            after: {
              type: 'string',
              description: 'User snowflake ID to paginate after',
            },
          },
          required: ['guild_id'],
        },
      },
      {
        name: 'get_guild_member',
        description: 'Get details for a specific member of a guild including roles and nickname',
        inputSchema: {
          type: 'object',
          properties: {
            guild_id: {
              type: 'string',
              description: 'The guild (server) snowflake ID',
            },
            user_id: {
              type: 'string',
              description: 'The user snowflake ID',
            },
          },
          required: ['guild_id', 'user_id'],
        },
      },
      {
        name: 'list_guild_roles',
        description: 'List all roles defined in a Discord guild including permissions and color settings',
        inputSchema: {
          type: 'object',
          properties: {
            guild_id: {
              type: 'string',
              description: 'The guild (server) snowflake ID',
            },
          },
          required: ['guild_id'],
        },
      },
      {
        name: 'create_guild_role',
        description: 'Create a new role in a guild with optional name, color, permissions, and hoisting',
        inputSchema: {
          type: 'object',
          properties: {
            guild_id: {
              type: 'string',
              description: 'The guild (server) snowflake ID',
            },
            name: {
              type: 'string',
              description: 'Role name (default: "new role")',
            },
            color: {
              type: 'number',
              description: 'RGB color value as integer (e.g. 0xFF0000 for red, default: 0)',
            },
            hoist: {
              type: 'boolean',
              description: 'Whether to display role members separately in the sidebar (default: false)',
            },
            mentionable: {
              type: 'boolean',
              description: 'Whether the role can be @mentioned by all members (default: false)',
            },
            permissions: {
              type: 'string',
              description: 'Bitwise permission string (e.g. "8" for Administrator)',
            },
          },
          required: ['guild_id'],
        },
      },
      {
        name: 'delete_guild_role',
        description: 'Delete a role from a guild (requires MANAGE_ROLES permission)',
        inputSchema: {
          type: 'object',
          properties: {
            guild_id: {
              type: 'string',
              description: 'The guild (server) snowflake ID',
            },
            role_id: {
              type: 'string',
              description: 'The role snowflake ID to delete',
            },
          },
          required: ['guild_id', 'role_id'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhooks for a guild or a specific channel',
        inputSchema: {
          type: 'object',
          properties: {
            guild_id: {
              type: 'string',
              description: 'Guild snowflake ID — returns all webhooks for the guild',
            },
            channel_id: {
              type: 'string',
              description: 'Channel snowflake ID — returns webhooks for this channel only',
            },
          },
        },
      },
      {
        name: 'execute_webhook',
        description: 'Execute a webhook to post a message to the webhook\'s channel',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'The webhook snowflake ID',
            },
            webhook_token: {
              type: 'string',
              description: 'The webhook token',
            },
            content: {
              type: 'string',
              description: 'Message text content (up to 2000 characters)',
            },
            username: {
              type: 'string',
              description: 'Override the default webhook username for this message',
            },
            avatar_url: {
              type: 'string',
              description: 'Override the default webhook avatar URL for this message',
            },
            tts: {
              type: 'boolean',
              description: 'Whether to send as text-to-speech (default: false)',
            },
          },
          required: ['webhook_id', 'webhook_token', 'content'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_guilds':
          return await this.listGuilds(args);
        case 'get_guild':
          return await this.getGuild(args);
        case 'list_channels':
          return await this.listChannels(args);
        case 'get_channel':
          return await this.getChannel(args);
        case 'create_channel':
          return await this.createChannel(args);
        case 'delete_channel':
          return await this.deleteChannel(args);
        case 'send_message':
          return await this.sendMessage(args);
        case 'get_message':
          return await this.getMessage(args);
        case 'get_messages':
          return await this.getMessages(args);
        case 'edit_message':
          return await this.editMessage(args);
        case 'delete_message':
          return await this.deleteMessage(args);
        case 'pin_message':
          return await this.pinMessage(args);
        case 'add_reaction':
          return await this.addReaction(args);
        case 'get_guild_members':
          return await this.getGuildMembers(args);
        case 'get_guild_member':
          return await this.getGuildMember(args);
        case 'list_guild_roles':
          return await this.listGuildRoles(args);
        case 'create_guild_role':
          return await this.createGuildRole(args);
        case 'delete_guild_role':
          return await this.deleteGuildRole(args);
        case 'list_webhooks':
          return await this.listWebhooks(args);
        case 'execute_webhook':
          return await this.executeWebhook(args);
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

  private async request(path: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...this.headers, ...(options?.headers as Record<string, string> ?? {}) },
    });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Discord API error ${response.status} ${response.statusText}: ${errBody}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Discord returned non-JSON response (HTTP ${response.status})`);
    }
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listGuilds(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 100));
    if (args.after) params.set('after', args.after as string);
    if (args.before) params.set('before', args.before as string);
    return this.request(`/users/@me/guilds?${params}`);
  }

  private async getGuild(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.with_counts) params.set('with_counts', 'true');
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/guilds/${encodeURIComponent(args.guild_id as string)}${qs}`);
  }

  private async listChannels(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/guilds/${encodeURIComponent(args.guild_id as string)}/channels`);
  }

  private async getChannel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/channels/${encodeURIComponent(args.channel_id as string)}`);
  }

  private async createChannel(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name, type: (args.type as number) ?? 0 };
    if (args.topic) body.topic = args.topic;
    if (args.parent_id) body.parent_id = args.parent_id;
    if (args.position !== undefined) body.position = args.position;
    return this.request(`/guilds/${encodeURIComponent(args.guild_id as string)}/channels`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteChannel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/channels/${encodeURIComponent(args.channel_id as string)}`, { method: 'DELETE' });
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      content: args.content,
      tts: (args.tts as boolean) ?? false,
    };
    if (args.message_reference) body.message_reference = args.message_reference;
    return this.request(`/channels/${encodeURIComponent(args.channel_id as string)}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/channels/${encodeURIComponent(args.channel_id as string)}/messages/${encodeURIComponent(args.message_id as string)}`);
  }

  private async getMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    if (args.before) params.set('before', args.before as string);
    if (args.after) params.set('after', args.after as string);
    if (args.around) params.set('around', args.around as string);
    return this.request(`/channels/${encodeURIComponent(args.channel_id as string)}/messages?${params}`);
  }

  private async editMessage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/channels/${encodeURIComponent(args.channel_id as string)}/messages/${encodeURIComponent(args.message_id as string)}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: args.content }),
    });
  }

  private async deleteMessage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/channels/${encodeURIComponent(args.channel_id as string)}/messages/${encodeURIComponent(args.message_id as string)}`, { method: 'DELETE' });
  }

  private async pinMessage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/channels/${encodeURIComponent(args.channel_id as string)}/messages/pins/${encodeURIComponent(args.message_id as string)}`, { method: 'PUT' });
  }

  private async addReaction(args: Record<string, unknown>): Promise<ToolResult> {
    const emoji = encodeURIComponent(args.emoji as string);
    return this.request(`/channels/${encodeURIComponent(args.channel_id as string)}/messages/${encodeURIComponent(args.message_id as string)}/reactions/${emoji}/@me`, { method: 'PUT' });
  }

  private async getGuildMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 100));
    if (args.after) params.set('after', args.after as string);
    return this.request(`/guilds/${encodeURIComponent(args.guild_id as string)}/members?${params}`);
  }

  private async getGuildMember(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/guilds/${encodeURIComponent(args.guild_id as string)}/members/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listGuildRoles(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/guilds/${encodeURIComponent(args.guild_id as string)}/roles`);
  }

  private async createGuildRole(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.color !== undefined) body.color = args.color;
    if (args.hoist !== undefined) body.hoist = args.hoist;
    if (args.mentionable !== undefined) body.mentionable = args.mentionable;
    if (args.permissions) body.permissions = args.permissions;
    return this.request(`/guilds/${encodeURIComponent(args.guild_id as string)}/roles`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteGuildRole(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/guilds/${encodeURIComponent(args.guild_id as string)}/roles/${encodeURIComponent(args.role_id as string)}`, { method: 'DELETE' });
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.channel_id) {
      return this.request(`/channels/${encodeURIComponent(args.channel_id as string)}/webhooks`);
    }
    if (args.guild_id) {
      return this.request(`/guilds/${encodeURIComponent(args.guild_id as string)}/webhooks`);
    }
    return {
      content: [{ type: 'text', text: 'Either guild_id or channel_id is required' }],
      isError: true,
    };
  }

  private async executeWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      content: args.content,
      tts: (args.tts as boolean) ?? false,
    };
    if (args.username) body.username = args.username;
    if (args.avatar_url) body.avatar_url = args.avatar_url;
    // Webhooks use token auth in URL, not bot token header
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/webhooks/${encodeURIComponent(args.webhook_id as string)}/${encodeURIComponent(args.webhook_token as string)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Discord API error ${response.status} ${response.statusText}: ${errBody}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Discord returned non-JSON response (HTTP ${response.status})`);
    }
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }
}
