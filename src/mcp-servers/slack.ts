/**
 * Slack MCP Server
 * Provides access to Slack Web API for channel, message, and user management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface SlackConfig {
  botToken: string;
  baseUrl?: string;
}

export class SlackMCPServer {
  private readonly botToken: string;
  private readonly baseUrl: string;

  constructor(config: SlackConfig) {
    this.botToken = config.botToken;
    this.baseUrl = config.baseUrl || 'https://slack.com/api';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_channels',
        description: 'List public and private channels in the workspace',
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
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'post_message',
        description: 'Post a message to a Slack channel or user',
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
              description: 'Whether to parse mrkdwn in the message (default: true)',
            },
          },
          required: ['channel', 'text'],
        },
      },
      {
        name: 'list_messages',
        description: 'Retrieve message history from a channel',
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
          },
          required: ['channel'],
        },
      },
      {
        name: 'search_messages',
        description: 'Search messages across the workspace',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string (supports Slack search modifiers)',
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
              description: 'Sort order: score or timestamp (default: score)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_user_info',
        description: 'Get profile and account information for a Slack user',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'string',
              description: 'Slack user ID (e.g. U012AB3CD)',
            },
          },
          required: ['user'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.botToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      };

      switch (name) {
        case 'list_channels': {
          const types = (args.types as string) || 'public_channel';
          const limit = (args.limit as number) || 100;

          let url = `${this.baseUrl}/conversations.list?types=${encodeURIComponent(types)}&limit=${limit}`;
          if (args.cursor) url += `&cursor=${encodeURIComponent(args.cursor as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list channels: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Slack returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'post_message': {
          const channel = args.channel as string;
          const text = args.text as string;

          if (!channel || !text) {
            return {
              content: [{ type: 'text', text: 'channel and text are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { channel, text };
          if (args.thread_ts) body.thread_ts = args.thread_ts;
          if (typeof args.mrkdwn === 'boolean') body.mrkdwn = args.mrkdwn;

          const response = await fetch(`${this.baseUrl}/chat.postMessage`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to post message: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Slack returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_messages': {
          const channel = args.channel as string;

          if (!channel) {
            return {
              content: [{ type: 'text', text: 'channel is required' }],
              isError: true,
            };
          }

          const limit = (args.limit as number) || 20;

          let url = `${this.baseUrl}/conversations.history?channel=${encodeURIComponent(channel)}&limit=${limit}`;
          if (args.oldest) url += `&oldest=${encodeURIComponent(args.oldest as string)}`;
          if (args.latest) url += `&latest=${encodeURIComponent(args.latest as string)}`;
          if (args.cursor) url += `&cursor=${encodeURIComponent(args.cursor as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list messages: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Slack returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_messages': {
          const query = args.query as string;

          if (!query) {
            return {
              content: [{ type: 'text', text: 'query is required' }],
              isError: true,
            };
          }

          const count = (args.count as number) || 20;
          const page = (args.page as number) || 1;
          const sort = (args.sort as string) || 'score';

          const url = `${this.baseUrl}/search.messages?query=${encodeURIComponent(query)}&count=${count}&page=${page}&sort=${sort}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search messages: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Slack returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user_info': {
          const user = args.user as string;

          if (!user) {
            return {
              content: [{ type: 'text', text: 'user is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/users.info?user=${encodeURIComponent(user)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get user info: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Slack returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

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
}
