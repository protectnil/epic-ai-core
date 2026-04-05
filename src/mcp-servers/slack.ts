/**
 * Slack MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.slack.com — transport: streamable-HTTP, auth: OAuth 2.0 (user token, xoxp-*)
// Vendor MCP announced 2026-02-17. Old archived reference: https://github.com/modelcontextprotocol/servers/tree/main/src/slack (stdio, archived).
// Vendor MCP covers: 10 tools (search, messaging, canvas, user profile).
// Our adapter covers: 20 tools (channel management, messaging, reactions, pins, bookmarks, users).
//
// Integration: use-both
// MCP-sourced tools (4 unique to MCP): [search_messages_and_files, create_canvas, update_canvas, read_canvas]
// REST-sourced tools (14 unique to our adapter): [list_channels, get_channel_info, create_channel, archive_channel,
//   invite_to_channel, update_message, delete_message, add_reaction, remove_reaction, get_reactions,
//   list_users, get_user_info, get_user_by_email, pin_message, list_pins, list_bookmarks]
// Shared tools (6, routed through MCP by default): [post_message, search_messages (as search_messages_and_files),
//   list_messages (as read_channel), get_thread_replies (as read_thread), get_user_info (as read_user_profile),
//   search_messages (as search_channels)]
// Combined coverage: 24 distinct capabilities (MCP: 10 + REST: 20 - shared: ~6)
//
// Base URL: https://slack.com/api
// Auth: Bearer bot token (xoxb-*) or user token (xoxp-*) in Authorization header
// Docs: https://api.slack.com/methods
// Rate limits: Tier 1 (1/min), Tier 2 (20/min), Tier 3 (50/min), Tier 4 (100/min) — varies by method
// Note: search.messages requires a user token (xoxp-*); bot tokens cannot use it.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SlackConfig {
  botToken: string;
  baseUrl?: string;
}

export class SlackMCPServer extends MCPAdapterBase {
  private readonly botToken: string;
  private readonly baseUrl: string;

  constructor(config: SlackConfig) {
    super();
    this.botToken = config.botToken;
    this.baseUrl = config.baseUrl || 'https://slack.com/api';
  }

  static catalog() {
    return {
      name: 'slack',
      displayName: 'Slack',
      version: '1.0.0',
      category: 'collaboration',
      keywords: ['slack', 'channel', 'message', 'chat', 'conversation', 'notification', 'thread', 'reaction', 'user', 'workspace', 'dm', 'direct message'],
      toolNames: [
        'list_channels', 'get_channel_info', 'create_channel', 'archive_channel', 'invite_to_channel',
        'post_message', 'update_message', 'delete_message', 'list_messages', 'get_thread_replies',
        'search_messages', 'add_reaction', 'remove_reaction', 'get_reactions',
        'list_users', 'get_user_info', 'get_user_by_email',
        'pin_message', 'list_pins', 'list_bookmarks',
      ],
      description: 'Slack workspace collaboration: send messages, manage channels, search conversations, handle reactions, pins, and user lookups.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_channels',
        description: 'List public and private channels in the workspace with optional type and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            types: {
              type: 'string',
              description: 'Comma-separated channel types: public_channel, private_channel, mpim, im (default: public_channel)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of channels to return (max 1000, default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response next_cursor field',
            },
            exclude_archived: {
              type: 'boolean',
              description: 'Exclude archived channels from results (default: false)',
            },
          },
        },
      },
      {
        name: 'get_channel_info',
        description: 'Get detailed information about a specific Slack channel by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID (e.g. C012AB3CD)',
            },
            include_locale: {
              type: 'boolean',
              description: 'Include locale information (default: false)',
            },
          },
          required: ['channel'],
        },
      },
      {
        name: 'create_channel',
        description: 'Create a new public or private Slack channel',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the channel (lowercase, no spaces — use hyphens)',
            },
            is_private: {
              type: 'boolean',
              description: 'Create as a private channel (default: false = public)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'archive_channel',
        description: 'Archive a Slack channel so it becomes read-only and hidden from active lists',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID to archive (e.g. C012AB3CD)',
            },
          },
          required: ['channel'],
        },
      },
      {
        name: 'invite_to_channel',
        description: 'Invite one or more users to a Slack channel by user IDs',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID to invite users to',
            },
            users: {
              type: 'string',
              description: 'Comma-separated list of user IDs to invite (e.g. U012AB3CD,U034EF5GH)',
            },
          },
          required: ['channel', 'users'],
        },
      },
      {
        name: 'post_message',
        description: 'Post a message to a Slack channel, group, or user DM with optional thread reply and mrkdwn formatting',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID, channel name (e.g. #general), or user ID for DMs',
            },
            text: {
              type: 'string',
              description: 'Message text (plain text or mrkdwn)',
            },
            thread_ts: {
              type: 'string',
              description: 'Timestamp of the parent message to reply in a thread',
            },
            mrkdwn: {
              type: 'boolean',
              description: 'Whether to parse mrkdwn formatting in the message (default: true)',
            },
            reply_broadcast: {
              type: 'boolean',
              description: 'If replying to a thread, also post to the channel (default: false)',
            },
          },
          required: ['channel', 'text'],
        },
      },
      {
        name: 'update_message',
        description: 'Update the text of an existing Slack message by channel and timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID containing the message',
            },
            ts: {
              type: 'string',
              description: 'Timestamp of the message to update (the ts field)',
            },
            text: {
              type: 'string',
              description: 'New text for the message',
            },
          },
          required: ['channel', 'ts', 'text'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a message from a Slack channel by channel ID and message timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID containing the message',
            },
            ts: {
              type: 'string',
              description: 'Timestamp of the message to delete (the ts field)',
            },
          },
          required: ['channel', 'ts'],
        },
      },
      {
        name: 'list_messages',
        description: 'Retrieve message history from a channel with optional date range and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID to retrieve history from',
            },
            limit: {
              type: 'number',
              description: 'Number of messages to return (max 999, default: 20)',
            },
            oldest: {
              type: 'string',
              description: 'Only return messages after this Unix timestamp',
            },
            latest: {
              type: 'string',
              description: 'Only return messages before this Unix timestamp',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            inclusive: {
              type: 'boolean',
              description: 'Include messages with oldest or latest timestamps (default: false)',
            },
          },
          required: ['channel'],
        },
      },
      {
        name: 'get_thread_replies',
        description: 'Retrieve all replies in a message thread by channel ID and parent message timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID that contains the thread',
            },
            ts: {
              type: 'string',
              description: 'Timestamp of the parent (root) message of the thread',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of replies to return (max 999, default: 20)',
            },
            oldest: {
              type: 'string',
              description: 'Only return messages after this Unix timestamp',
            },
            latest: {
              type: 'string',
              description: 'Only return messages before this Unix timestamp',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['channel', 'ts'],
        },
      },
      {
        name: 'search_messages',
        description: 'Search messages across the workspace using query syntax. Requires a user token (xoxp-*) — bot tokens will receive an error.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string. Supports: in:#channel, from:@user, before/after:YYYY-MM-DD',
            },
            count: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: score (relevance) or timestamp (default: score)',
            },
            sort_dir: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'add_reaction',
        description: 'Add an emoji reaction to a Slack message by channel ID and message timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID where the message was posted',
            },
            timestamp: {
              type: 'string',
              description: 'Timestamp of the message to react to (the ts field from a message)',
            },
            name: {
              type: 'string',
              description: 'Emoji name without colons (e.g. thumbsup, white_check_mark, rocket)',
            },
          },
          required: ['channel', 'timestamp', 'name'],
        },
      },
      {
        name: 'remove_reaction',
        description: 'Remove an emoji reaction from a Slack message',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID where the message was posted',
            },
            timestamp: {
              type: 'string',
              description: 'Timestamp of the message (the ts field)',
            },
            name: {
              type: 'string',
              description: 'Emoji name without colons to remove (e.g. thumbsup)',
            },
          },
          required: ['channel', 'timestamp', 'name'],
        },
      },
      {
        name: 'get_reactions',
        description: 'Get a list of all reactions on a specific Slack message',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID containing the message',
            },
            timestamp: {
              type: 'string',
              description: 'Timestamp of the message (the ts field)',
            },
          },
          required: ['channel', 'timestamp'],
        },
      },
      {
        name: 'list_users',
        description: 'List all users in the Slack workspace with profiles and role information',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (max 999, default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            include_locale: {
              type: 'boolean',
              description: 'Include locale information for each user (default: false)',
            },
            team_id: {
              type: 'string',
              description: 'Team ID to scope results when using an org-level token',
            },
          },
        },
      },
      {
        name: 'get_user_info',
        description: 'Get profile and account information for a Slack user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'string',
              description: 'Slack user ID (e.g. U012AB3CD)',
            },
            include_locale: {
              type: 'boolean',
              description: 'Include locale information (default: false)',
            },
          },
          required: ['user'],
        },
      },
      {
        name: 'get_user_by_email',
        description: 'Look up a Slack user by their email address',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to look up (e.g. user@example.com)',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'pin_message',
        description: 'Pin a message to a Slack channel so it appears in the channel pins',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID where the message is located',
            },
            timestamp: {
              type: 'string',
              description: 'Timestamp of the message to pin (the ts field)',
            },
          },
          required: ['channel', 'timestamp'],
        },
      },
      {
        name: 'list_pins',
        description: 'List all pinned items in a Slack channel',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID to list pins from',
            },
          },
          required: ['channel'],
        },
      },
      {
        name: 'list_bookmarks',
        description: 'List all bookmarks in a Slack channel (links, messages, files pinned to channel header)',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'Channel ID to list bookmarks for',
            },
          },
          required: ['channel_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_channels':
          return this.listChannels(args);
        case 'get_channel_info':
          return this.getChannelInfo(args);
        case 'create_channel':
          return this.createChannel(args);
        case 'archive_channel':
          return this.archiveChannel(args);
        case 'invite_to_channel':
          return this.inviteToChannel(args);
        case 'post_message':
          return this.postMessage(args);
        case 'update_message':
          return this.updateMessage(args);
        case 'delete_message':
          return this.deleteMessage(args);
        case 'list_messages':
          return this.listMessages(args);
        case 'get_thread_replies':
          return this.getThreadReplies(args);
        case 'search_messages':
          return this.searchMessages(args);
        case 'add_reaction':
          return this.addReaction(args);
        case 'remove_reaction':
          return this.removeReaction(args);
        case 'get_reactions':
          return this.getReactions(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user_info':
          return this.getUserInfo(args);
        case 'get_user_by_email':
          return this.getUserByEmail(args);
        case 'pin_message':
          return this.pinMessage(args);
        case 'list_pins':
          return this.listPins(args);
        case 'list_bookmarks':
          return this.listBookmarks(args);
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
      Authorization: `Bearer ${this.botToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    };
  }

  private async slackGet(endpoint: string, params: Record<string, string>): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${endpoint}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Slack returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async slackPost(endpoint: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Slack returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listChannels(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      types: (args.types as string) || 'public_channel',
      limit: String((args.limit as number) || 100),
    };
    if (args.cursor) params.cursor = args.cursor as string;
    if (typeof args.exclude_archived === 'boolean') params.exclude_archived = String(args.exclude_archived);
    return this.slackGet('conversations.list', params);
  }

  private async getChannelInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel) return { content: [{ type: 'text', text: 'channel is required' }], isError: true };
    const params: Record<string, string> = { channel: args.channel as string };
    if (typeof args.include_locale === 'boolean') params.include_locale = String(args.include_locale);
    return this.slackGet('conversations.info', params);
  }

  private async createChannel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (typeof args.is_private === 'boolean') body.is_private = args.is_private;
    return this.slackPost('conversations.create', body);
  }

  private async archiveChannel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel) return { content: [{ type: 'text', text: 'channel is required' }], isError: true };
    return this.slackPost('conversations.archive', { channel: args.channel });
  }

  private async inviteToChannel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel || !args.users) return { content: [{ type: 'text', text: 'channel and users are required' }], isError: true };
    return this.slackPost('conversations.invite', { channel: args.channel, users: args.users });
  }

  private async postMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel || !args.text) return { content: [{ type: 'text', text: 'channel and text are required' }], isError: true };
    const body: Record<string, unknown> = { channel: args.channel, text: args.text };
    if (args.thread_ts) body.thread_ts = args.thread_ts;
    if (typeof args.mrkdwn === 'boolean') body.mrkdwn = args.mrkdwn;
    if (typeof args.reply_broadcast === 'boolean') body.reply_broadcast = args.reply_broadcast;
    return this.slackPost('chat.postMessage', body);
  }

  private async updateMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel || !args.ts || !args.text) return { content: [{ type: 'text', text: 'channel, ts, and text are required' }], isError: true };
    return this.slackPost('chat.update', { channel: args.channel, ts: args.ts, text: args.text });
  }

  private async deleteMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel || !args.ts) return { content: [{ type: 'text', text: 'channel and ts are required' }], isError: true };
    return this.slackPost('chat.delete', { channel: args.channel, ts: args.ts });
  }

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel) return { content: [{ type: 'text', text: 'channel is required' }], isError: true };
    const params: Record<string, string> = {
      channel: args.channel as string,
      limit: String((args.limit as number) || 20),
    };
    if (args.oldest) params.oldest = args.oldest as string;
    if (args.latest) params.latest = args.latest as string;
    if (args.cursor) params.cursor = args.cursor as string;
    if (typeof args.inclusive === 'boolean') params.inclusive = args.inclusive ? '1' : '0';
    return this.slackGet('conversations.history', params);
  }

  private async getThreadReplies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel || !args.ts) return { content: [{ type: 'text', text: 'channel and ts are required' }], isError: true };
    const params: Record<string, string> = {
      channel: args.channel as string,
      ts: args.ts as string,
      limit: String((args.limit as number) || 20),
    };
    if (args.oldest) params.oldest = args.oldest as string;
    if (args.latest) params.latest = args.latest as string;
    if (args.cursor) params.cursor = args.cursor as string;
    return this.slackGet('conversations.replies', params);
  }

  private async searchMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      query: args.query as string,
      count: String((args.count as number) || 20),
      page: String((args.page as number) || 1),
      sort: (args.sort as string) || 'score',
    };
    if (args.sort_dir) params.sort_dir = args.sort_dir as string;
    return this.slackGet('search.messages', params);
  }

  private async addReaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel || !args.timestamp || !args.name) return { content: [{ type: 'text', text: 'channel, timestamp, and name are required' }], isError: true };
    return this.slackPost('reactions.add', { channel: args.channel, timestamp: args.timestamp, name: args.name });
  }

  private async removeReaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel || !args.timestamp || !args.name) return { content: [{ type: 'text', text: 'channel, timestamp, and name are required' }], isError: true };
    return this.slackPost('reactions.remove', { channel: args.channel, timestamp: args.timestamp, name: args.name });
  }

  private async getReactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel || !args.timestamp) return { content: [{ type: 'text', text: 'channel and timestamp are required' }], isError: true };
    const params: Record<string, string> = {
      channel: args.channel as string,
      timestamp: args.timestamp as string,
      full: 'true',
    };
    return this.slackGet('reactions.get', params);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 100) };
    if (args.cursor) params.cursor = args.cursor as string;
    if (typeof args.include_locale === 'boolean') params.include_locale = String(args.include_locale);
    if (args.team_id) params.team_id = args.team_id as string;
    return this.slackGet('users.list', params);
  }

  private async getUserInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user) return { content: [{ type: 'text', text: 'user is required' }], isError: true };
    const params: Record<string, string> = { user: args.user as string };
    if (typeof args.include_locale === 'boolean') params.include_locale = String(args.include_locale);
    return this.slackGet('users.info', params);
  }

  private async getUserByEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    return this.slackGet('users.lookupByEmail', { email: args.email as string });
  }

  private async pinMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel || !args.timestamp) return { content: [{ type: 'text', text: 'channel and timestamp are required' }], isError: true };
    return this.slackPost('pins.add', { channel: args.channel, timestamp: args.timestamp });
  }

  private async listPins(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel) return { content: [{ type: 'text', text: 'channel is required' }], isError: true };
    return this.slackGet('pins.list', { channel: args.channel as string });
  }

  private async listBookmarks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id) return { content: [{ type: 'text', text: 'channel_id is required' }], isError: true };
    return this.slackGet('bookmarks.list', { channel_id: args.channel_id as string });
  }
}
