/**
 * Google Chat MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/googleworkspace/cli — transport: stdio, auth: OAuth2
// The official Google Workspace CLI MCP (googleworkspace/cli, Apache-2.0, active 2026)
// exposes Google Chat and other Workspace services via `gws mcp -s chat` over stdio.
// It covers 100+ tools across all Workspace APIs, dynamically built from the Discovery Service.
// Our adapter covers: 18 tools (spaces, messages, members, reactions, search).
// Recommendation: Use the Workspace CLI MCP for full coverage. Use this adapter for
// air-gapped deployments or when only Chat access is needed without full Workspace setup.
//
// Base URL: https://chat.googleapis.com/v1
// Auth: OAuth2 Bearer access token (scopes: https://www.googleapis.com/auth/chat.messages,
//   https://www.googleapis.com/auth/chat.spaces, https://www.googleapis.com/auth/chat.memberships)
//   or service account with domain-wide delegation (scope: https://www.googleapis.com/auth/chat.bot)
// Docs: https://developers.google.com/workspace/chat/api/reference/rest
// Rate limits: 3,000 queries/min per project; per-user limits apply for user-auth flows

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoogleChatConfig {
  accessToken: string;
  baseUrl?: string;
}

export class GoogleChatMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: GoogleChatConfig) {
    super();
    this.token = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://chat.googleapis.com/v1';
  }

  static catalog() {
    return {
      name: 'google-chat',
      displayName: 'Google Chat',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: [
        'google', 'chat', 'workspace', 'space', 'message', 'thread', 'dm',
        'direct message', 'member', 'reaction', 'emoji', 'google workspace',
        'gchat', 'collaboration', 'notification',
      ],
      toolNames: [
        'list_spaces',
        'get_space',
        'create_space',
        'delete_space',
        'find_direct_message',
        'list_messages',
        'get_message',
        'create_message',
        'update_message',
        'delete_message',
        'list_members',
        'get_member',
        'create_member',
        'delete_member',
        'list_reactions',
        'create_reaction',
        'delete_reaction',
        'list_space_events',
      ],
      description: 'Google Chat workspace messaging: manage spaces, send messages, handle threads, manage memberships, and add emoji reactions.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_spaces',
        description: 'List Google Chat spaces (rooms and DMs) visible to the authenticated user with optional type filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter query: spaceType = "SPACE" | "GROUP_CHAT" | "DIRECT_MESSAGE" (e.g. spaceType = "SPACE")',
            },
            pageSize: {
              type: 'number',
              description: 'Maximum number of spaces to return (default: 100, max: 1000)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response nextPageToken field',
            },
          },
        },
      },
      {
        name: 'get_space',
        description: 'Get details about a specific Google Chat space by resource name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Resource name of the space (e.g. spaces/AAAAAAAAAAA)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_space',
        description: 'Create a named Google Chat space (group chat room) with optional display name and description',
        inputSchema: {
          type: 'object',
          properties: {
            displayName: {
              type: 'string',
              description: 'Display name for the new space (required for SPACE type)',
            },
            spaceType: {
              type: 'string',
              description: 'Type of space: SPACE (named room) or GROUP_CHAT (default: SPACE)',
            },
            externalUserAllowed: {
              type: 'boolean',
              description: 'Allow users outside the Google Workspace organization (default: false)',
            },
          },
          required: ['displayName'],
        },
      },
      {
        name: 'delete_space',
        description: 'Delete a Google Chat space and all its messages and members permanently',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Resource name of the space to delete (e.g. spaces/AAAAAAAAAAA)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'find_direct_message',
        description: 'Find the existing direct message space between the authenticated user and another user',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Resource name of the user to find a DM with (e.g. users/USER_ID)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_messages',
        description: 'List messages in a Google Chat space with optional filters for date range, sender, and thread',
        inputSchema: {
          type: 'object',
          properties: {
            parent: {
              type: 'string',
              description: 'Resource name of the space (e.g. spaces/AAAAAAAAAAA)',
            },
            filter: {
              type: 'string',
              description: 'Filter: createTime > "2025-01-01T00:00:00Z" or thread.name = "spaces/X/threads/Y"',
            },
            pageSize: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 25, max: 1000)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
            showDeleted: {
              type: 'boolean',
              description: 'Include deleted messages in results (default: false)',
            },
            orderBy: {
              type: 'string',
              description: 'Sort order: createTime ASC or createTime DESC (default: createTime ASC)',
            },
          },
          required: ['parent'],
        },
      },
      {
        name: 'get_message',
        description: 'Get a specific Google Chat message by its resource name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Resource name of the message (e.g. spaces/AAAAAAAAAAA/messages/BBBBBBBBBBB)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_message',
        description: 'Send a message to a Google Chat space or thread with optional card attachments and threading',
        inputSchema: {
          type: 'object',
          properties: {
            parent: {
              type: 'string',
              description: 'Resource name of the space to send the message to (e.g. spaces/AAAAAAAAAAA)',
            },
            text: {
              type: 'string',
              description: 'Plain text body of the message',
            },
            thread_name: {
              type: 'string',
              description: 'Resource name of the thread to reply to (e.g. spaces/X/threads/Y)',
            },
            messageReplyOption: {
              type: 'string',
              description: 'How to handle thread replies: REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD or REPLY_MESSAGE_OR_FAIL',
            },
            requestId: {
              type: 'string',
              description: 'Unique client-generated ID for deduplication (idempotency key)',
            },
          },
          required: ['parent', 'text'],
        },
      },
      {
        name: 'update_message',
        description: 'Update the text or cards of an existing Google Chat message',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Resource name of the message to update (e.g. spaces/X/messages/Y)',
            },
            text: {
              type: 'string',
              description: 'New text content for the message',
            },
            updateMask: {
              type: 'string',
              description: 'Comma-separated field paths to update (e.g. text,cards; default: text)',
            },
          },
          required: ['name', 'text'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a Google Chat message by its resource name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Resource name of the message to delete (e.g. spaces/X/messages/Y)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_members',
        description: 'List members of a Google Chat space with optional filter by membership type',
        inputSchema: {
          type: 'object',
          properties: {
            parent: {
              type: 'string',
              description: 'Resource name of the space (e.g. spaces/AAAAAAAAAAA)',
            },
            filter: {
              type: 'string',
              description: 'Filter by role or type: member.type = "HUMAN" | "BOT" or role = "ROLE_MEMBER" | "ROLE_MANAGER"',
            },
            pageSize: {
              type: 'number',
              description: 'Maximum number of members to return (default: 100, max: 1000)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['parent'],
        },
      },
      {
        name: 'get_member',
        description: 'Get membership details for a specific user or app in a Google Chat space',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Resource name of the membership (e.g. spaces/X/members/USER_ID)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_member',
        description: 'Add a user or app to a Google Chat space as a member',
        inputSchema: {
          type: 'object',
          properties: {
            parent: {
              type: 'string',
              description: 'Resource name of the space to add the member to (e.g. spaces/AAAAAAAAAAA)',
            },
            member_name: {
              type: 'string',
              description: 'Resource name of the user to add (e.g. users/USER_ID or users/EMAIL)',
            },
            role: {
              type: 'string',
              description: 'Role for the member: ROLE_MEMBER or ROLE_MANAGER (default: ROLE_MEMBER)',
            },
          },
          required: ['parent', 'member_name'],
        },
      },
      {
        name: 'delete_member',
        description: 'Remove a user from a Google Chat space by membership resource name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Resource name of the membership to remove (e.g. spaces/X/members/USER_ID)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_reactions',
        description: 'List emoji reactions on a specific Google Chat message',
        inputSchema: {
          type: 'object',
          properties: {
            parent: {
              type: 'string',
              description: 'Resource name of the message (e.g. spaces/X/messages/Y)',
            },
            filter: {
              type: 'string',
              description: 'Filter by emoji: emoji.unicode = "1f44d" or emoji.customEmoji.uid = "UID"',
            },
            pageSize: {
              type: 'number',
              description: 'Maximum number of reactions to return (default: 25, max: 200)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['parent'],
        },
      },
      {
        name: 'create_reaction',
        description: 'Add an emoji reaction to a Google Chat message by unicode codepoint or custom emoji',
        inputSchema: {
          type: 'object',
          properties: {
            parent: {
              type: 'string',
              description: 'Resource name of the message to react to (e.g. spaces/X/messages/Y)',
            },
            unicode: {
              type: 'string',
              description: 'Unicode codepoint of the emoji (e.g. "1f44d" for thumbs up)',
            },
          },
          required: ['parent', 'unicode'],
        },
      },
      {
        name: 'delete_reaction',
        description: 'Remove an emoji reaction from a Google Chat message by reaction resource name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Resource name of the reaction to delete (e.g. spaces/X/messages/Y/reactions/Z)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_space_events',
        description: 'List events that occurred in a Google Chat space (message created, member added, etc.) for audit and history',
        inputSchema: {
          type: 'object',
          properties: {
            parent: {
              type: 'string',
              description: 'Resource name of the space (e.g. spaces/AAAAAAAAAAA)',
            },
            filter: {
              type: 'string',
              description: 'Required filter: eventTypes="google.workspace.chat.message.v1.created" (pipe-separated for multiple)',
            },
            pageSize: {
              type: 'number',
              description: 'Maximum number of events to return (default: 25, max: 100)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['parent', 'filter'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_spaces': return this.listSpaces(args);
        case 'get_space': return this.getSpace(args);
        case 'create_space': return this.createSpace(args);
        case 'delete_space': return this.deleteSpace(args);
        case 'find_direct_message': return this.findDirectMessage(args);
        case 'list_messages': return this.listMessages(args);
        case 'get_message': return this.getMessage(args);
        case 'create_message': return this.createMessage(args);
        case 'update_message': return this.updateMessage(args);
        case 'delete_message': return this.deleteMessage(args);
        case 'list_members': return this.listMembers(args);
        case 'get_member': return this.getMember(args);
        case 'create_member': return this.createMember(args);
        case 'delete_member': return this.deleteMember(args);
        case 'list_reactions': return this.listReactions(args);
        case 'create_reaction': return this.createReaction(args);
        case 'delete_reaction': return this.deleteReaction(args);
        case 'list_space_events': return this.listSpaceEvents(args);
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
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}${qs}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patch(path: string, body: Record<string, unknown>, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}${qs}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text || '{"deleted":true}' }], isError: false };
  }

  private async listSpaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { pageSize: String((args.pageSize as number) ?? 100) };
    if (args.filter) params.filter = args.filter as string;
    if (args.pageToken) params.pageToken = args.pageToken as string;
    return this.get('spaces', params);
  }

  private async getSpace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.get(args.name as string);
  }

  private async createSpace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.displayName) return { content: [{ type: 'text', text: 'displayName is required' }], isError: true };
    const body: Record<string, unknown> = {
      displayName: args.displayName,
      spaceType: args.spaceType ?? 'SPACE',
    };
    if (typeof args.externalUserAllowed === 'boolean') body.externalUserAllowed = args.externalUserAllowed;
    return this.post('spaces', body);
  }

  private async deleteSpace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.del(args.name as string);
  }

  private async findDirectMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name (user resource name) is required' }], isError: true };
    return this.get('spaces:findDirectMessage', { name: args.name as string });
  }

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.parent) return { content: [{ type: 'text', text: 'parent is required' }], isError: true };
    const params: Record<string, string> = { pageSize: String((args.pageSize as number) ?? 25) };
    if (args.filter) params.filter = args.filter as string;
    if (args.pageToken) params.pageToken = args.pageToken as string;
    if (typeof args.showDeleted === 'boolean') params.showDeleted = String(args.showDeleted);
    if (args.orderBy) params.orderBy = args.orderBy as string;
    return this.get(`${args.parent as string}/messages`, params);
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.get(args.name as string);
  }

  private async createMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.parent || !args.text) return { content: [{ type: 'text', text: 'parent and text are required' }], isError: true };
    const body: Record<string, unknown> = { text: args.text };
    if (args.thread_name) body.thread = { name: args.thread_name };
    const params: Record<string, string> = {};
    if (args.messageReplyOption) params.messageReplyOption = args.messageReplyOption as string;
    if (args.requestId) params.requestId = args.requestId as string;
    return this.post(`${args.parent as string}/messages`, body, Object.keys(params).length ? params : undefined);
  }

  private async updateMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.text) return { content: [{ type: 'text', text: 'name and text are required' }], isError: true };
    const updateMask = (args.updateMask as string) ?? 'text';
    return this.patch(args.name as string, { text: args.text }, { updateMask });
  }

  private async deleteMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.del(args.name as string);
  }

  private async listMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.parent) return { content: [{ type: 'text', text: 'parent is required' }], isError: true };
    const params: Record<string, string> = { pageSize: String((args.pageSize as number) ?? 100) };
    if (args.filter) params.filter = args.filter as string;
    if (args.pageToken) params.pageToken = args.pageToken as string;
    return this.get(`${args.parent as string}/members`, params);
  }

  private async getMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.get(args.name as string);
  }

  private async createMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.parent || !args.member_name) return { content: [{ type: 'text', text: 'parent and member_name are required' }], isError: true };
    const body: Record<string, unknown> = {
      member: { name: args.member_name, type: 'HUMAN' },
      role: args.role ?? 'ROLE_MEMBER',
    };
    return this.post(`${args.parent as string}/members`, body);
  }

  private async deleteMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.del(args.name as string);
  }

  private async listReactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.parent) return { content: [{ type: 'text', text: 'parent (message resource name) is required' }], isError: true };
    const params: Record<string, string> = { pageSize: String((args.pageSize as number) ?? 25) };
    if (args.filter) params.filter = args.filter as string;
    if (args.pageToken) params.pageToken = args.pageToken as string;
    return this.get(`${args.parent as string}/reactions`, params);
  }

  private async createReaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.parent || !args.unicode) return { content: [{ type: 'text', text: 'parent and unicode are required' }], isError: true };
    return this.post(`${args.parent as string}/reactions`, { emoji: { unicode: args.unicode } });
  }

  private async deleteReaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.del(args.name as string);
  }

  private async listSpaceEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.parent || !args.filter) return { content: [{ type: 'text', text: 'parent and filter are required' }], isError: true };
    const params: Record<string, string> = {
      filter: args.filter as string,
      pageSize: String((args.pageSize as number) ?? 25),
    };
    if (args.pageToken) params.pageToken = args.pageToken as string;
    return this.get(`${args.parent as string}/spaceEvents`, params);
  }
}
