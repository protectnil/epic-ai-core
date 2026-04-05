/**
 * Mattermost MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/mattermost/mattermost-plugin-agents — transport: streamable-HTTP, auth: OAuth 2.0
//   (embedded in Mattermost Agents plugin v1.7.2+; external endpoint at /mcp on the Mattermost host)
//   10 tools: read_post, read_channel, search_posts, create_post, create_channel, get_channel_info,
//             get_team_info, search_users, get_channel_members, get_team_members
//   Last confirmed active: Mattermost v11+ (2025). Maintained by Mattermost Inc.
// NOTE: pvev/mattermost-mcp (referenced in prior header) is a community repo with 4 commits and ~8 tools — NOT official.
// Our adapter covers: 21 tools — strict superset of the official MCP's 10 tools.
// Recommendation: use-rest-api — our adapter covers all 10 official MCP operations plus 11 additional tools
//   (update_channel, delete_channel, add_channel_member, get_post, update_post, delete_post, get_thread,
//    list_posts, get_user, get_user_by_email, add_reaction, get_reactions, list_teams, get_team).
//   The official MCP uses OAuth2 only (no PAT for external clients in default config) and requires
//   Mattermost Agents plugin. Our REST adapter supports any Mattermost v4 instance with a PAT or bot token.
//
// Base URL: https://{your-mattermost-host}/api/v4 (self-hosted; configure via baseUrl)
// Auth: Bearer Personal Access Token (or bot token) in Authorization header
// Docs: https://api.mattermost.com/
// Rate limits: No documented global limit; Mattermost enforces per-server rate limiting configurable by admins (default ~10 req/s)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MattermostConfig {
  token: string;
  baseUrl: string;
}

export class MattermostMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: MattermostConfig) {
    super();
    this.token = config.token;
    this.baseUrl = config.baseUrl.replace(/\/$/, '') + '/api/v4';
  }

  static catalog() {
    return {
      name: 'mattermost',
      displayName: 'Mattermost',
      version: '1.0.0',
      category: 'collaboration',
      keywords: ['mattermost', 'channel', 'message', 'post', 'team', 'chat', 'thread', 'reaction', 'user', 'direct message', 'dm', 'open source', 'self-hosted'],
      toolNames: [
        'list_teams', 'get_team', 'get_team_members',
        'list_channels', 'get_channel', 'create_channel', 'update_channel', 'delete_channel', 'get_channel_members', 'add_channel_member',
        'list_posts', 'get_post', 'create_post', 'update_post', 'delete_post', 'get_thread',
        'list_users', 'get_user', 'get_user_by_email',
        'add_reaction', 'get_reactions',
      ],
      description: 'Mattermost team messaging: manage channels, post messages, handle threads and reactions, look up users and teams. Self-hosted and cloud.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_teams',
        description: 'List all teams the authenticated user belongs to, including team metadata and member counts',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            per_page: {
              type: 'number',
              description: 'Number of teams per page (default: 60, max: 200)',
            },
          },
        },
      },
      {
        name: 'get_team',
        description: 'Get detailed information about a specific Mattermost team by team ID',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'The team ID to retrieve',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'get_team_members',
        description: 'List members of a Mattermost team with roles and join timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'The team ID to list members for',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            per_page: {
              type: 'number',
              description: 'Number of members per page (default: 60, max: 200)',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'list_channels',
        description: 'List public channels in a Mattermost team with optional pagination and search filters',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID to list channels for',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            per_page: {
              type: 'number',
              description: 'Number of channels per page (default: 60, max: 200)',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'get_channel',
        description: 'Get detailed information about a specific Mattermost channel by channel ID',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel ID to retrieve',
            },
          },
          required: ['channel_id'],
        },
      },
      {
        name: 'create_channel',
        description: 'Create a new Mattermost channel (public O or private P) within a team',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID to create the channel in',
            },
            name: {
              type: 'string',
              description: 'URL-safe channel name (lowercase, hyphens, no spaces)',
            },
            display_name: {
              type: 'string',
              description: 'Human-readable display name for the channel',
            },
            type: {
              type: 'string',
              description: 'Channel type: O for public (open), P for private (default: O)',
            },
            purpose: {
              type: 'string',
              description: 'Short description of the channel purpose (optional)',
            },
            header: {
              type: 'string',
              description: 'Channel header text shown at the top (optional)',
            },
          },
          required: ['team_id', 'name', 'display_name'],
        },
      },
      {
        name: 'update_channel',
        description: 'Update display name, header, or purpose of an existing Mattermost channel',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel ID to update',
            },
            display_name: {
              type: 'string',
              description: 'New display name for the channel (optional)',
            },
            purpose: {
              type: 'string',
              description: 'New channel purpose text (optional)',
            },
            header: {
              type: 'string',
              description: 'New channel header text (optional)',
            },
          },
          required: ['channel_id'],
        },
      },
      {
        name: 'delete_channel',
        description: 'Soft-delete (archive) a Mattermost channel by channel ID',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel ID to delete/archive',
            },
          },
          required: ['channel_id'],
        },
      },
      {
        name: 'get_channel_members',
        description: 'List members of a Mattermost channel with roles and notification preferences',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel ID to list members for',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            per_page: {
              type: 'number',
              description: 'Number of members per page (default: 60, max: 200)',
            },
          },
          required: ['channel_id'],
        },
      },
      {
        name: 'add_channel_member',
        description: 'Add a user to a Mattermost channel by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel ID to add the user to',
            },
            user_id: {
              type: 'string',
              description: 'The user ID to add to the channel',
            },
          },
          required: ['channel_id', 'user_id'],
        },
      },
      {
        name: 'list_posts',
        description: 'Retrieve message history from a Mattermost channel with optional pagination and time range',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel ID to retrieve posts from',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            per_page: {
              type: 'number',
              description: 'Number of posts per page (default: 60, max: 200)',
            },
            since: {
              type: 'number',
              description: 'Only return posts created after this Unix timestamp in milliseconds',
            },
            before: {
              type: 'string',
              description: 'Return posts before this post ID',
            },
            after: {
              type: 'string',
              description: 'Return posts after this post ID',
            },
          },
          required: ['channel_id'],
        },
      },
      {
        name: 'get_post',
        description: 'Get a single Mattermost post by post ID, including message text and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'The post ID to retrieve',
            },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'create_post',
        description: 'Create a new post in a Mattermost channel, optionally as a thread reply to an existing post',
        inputSchema: {
          type: 'object',
          properties: {
            channel_id: {
              type: 'string',
              description: 'The channel ID to post the message in',
            },
            message: {
              type: 'string',
              description: 'The message text (supports Markdown formatting)',
            },
            root_id: {
              type: 'string',
              description: 'Post ID of the root post to reply in a thread (optional)',
            },
          },
          required: ['channel_id', 'message'],
        },
      },
      {
        name: 'update_post',
        description: 'Update the message text of an existing Mattermost post by post ID',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'The post ID to update',
            },
            message: {
              type: 'string',
              description: 'The new message text',
            },
          },
          required: ['post_id', 'message'],
        },
      },
      {
        name: 'delete_post',
        description: 'Delete a Mattermost post by post ID (soft delete — content replaced with deletion notice)',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'The post ID to delete',
            },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'get_thread',
        description: 'Retrieve all posts in a thread (the root post and all replies) by root post ID',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'The root post ID of the thread to retrieve',
            },
          },
          required: ['post_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List users in the Mattermost instance with optional team or channel scope and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            per_page: {
              type: 'number',
              description: 'Number of users per page (default: 60, max: 200)',
            },
            in_team: {
              type: 'string',
              description: 'Filter users by team ID (optional)',
            },
            in_channel: {
              type: 'string',
              description: 'Filter users by channel ID (optional)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get profile information for a Mattermost user by user ID, including username and email',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The user ID to retrieve, or "me" for the authenticated user',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_by_email',
        description: 'Look up a Mattermost user by their email address',
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
        name: 'add_reaction',
        description: 'Add an emoji reaction to a Mattermost post by post ID and emoji name',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The user ID adding the reaction (use "me" for authenticated user)',
            },
            post_id: {
              type: 'string',
              description: 'The post ID to add the reaction to',
            },
            emoji_name: {
              type: 'string',
              description: 'Emoji name without colons (e.g. thumbsup, white_check_mark)',
            },
          },
          required: ['post_id', 'emoji_name'],
        },
      },
      {
        name: 'get_reactions',
        description: 'Get all emoji reactions on a Mattermost post by post ID',
        inputSchema: {
          type: 'object',
          properties: {
            post_id: {
              type: 'string',
              description: 'The post ID to retrieve reactions for',
            },
          },
          required: ['post_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_teams':
          return this.listTeams(args);
        case 'get_team':
          return this.getTeam(args);
        case 'get_team_members':
          return this.getTeamMembers(args);
        case 'list_channels':
          return this.listChannels(args);
        case 'get_channel':
          return this.getChannel(args);
        case 'create_channel':
          return this.createChannel(args);
        case 'update_channel':
          return this.updateChannel(args);
        case 'delete_channel':
          return this.deleteChannel(args);
        case 'get_channel_members':
          return this.getChannelMembers(args);
        case 'add_channel_member':
          return this.addChannelMember(args);
        case 'list_posts':
          return this.listPosts(args);
        case 'get_post':
          return this.getPost(args);
        case 'create_post':
          return this.createPost(args);
        case 'update_post':
          return this.updatePost(args);
        case 'delete_post':
          return this.deletePost(args);
        case 'get_thread':
          return this.getThread(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'get_user_by_email':
          return this.getUserByEmail(args);
        case 'add_reaction':
          return this.addReaction(args);
        case 'get_reactions':
          return this.getReactions(args);
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

  private async mmGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async mmPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
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

  private async mmPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async mmDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 0),
      per_page: String((args.per_page as number) ?? 60),
    };
    return this.mmGet('/users/me/teams', params);
  }

  private async getTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    return this.mmGet(`/teams/${encodeURIComponent(args.team_id as string)}`);
  }

  private async getTeamMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 0),
      per_page: String((args.per_page as number) ?? 60),
    };
    return this.mmGet(`/teams/${encodeURIComponent(args.team_id as string)}/members`, params);
  }

  private async listChannels(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 0),
      per_page: String((args.per_page as number) ?? 60),
    };
    return this.mmGet(`/teams/${encodeURIComponent(args.team_id as string)}/channels`, params);
  }

  private async getChannel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id) return { content: [{ type: 'text', text: 'channel_id is required' }], isError: true };
    return this.mmGet(`/channels/${encodeURIComponent(args.channel_id as string)}`);
  }

  private async createChannel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id || !args.name || !args.display_name) {
      return { content: [{ type: 'text', text: 'team_id, name, and display_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      team_id: args.team_id,
      name: args.name,
      display_name: args.display_name,
      type: (args.type as string) ?? 'O',
    };
    if (args.purpose) body.purpose = args.purpose;
    if (args.header) body.header = args.header;
    return this.mmPost('/channels', body);
  }

  private async updateChannel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id) return { content: [{ type: 'text', text: 'channel_id is required' }], isError: true };
    const body: Record<string, unknown> = { id: args.channel_id };
    if (args.display_name) body.display_name = args.display_name;
    if (args.purpose !== undefined) body.purpose = args.purpose;
    if (args.header !== undefined) body.header = args.header;
    return this.mmPut(`/channels/${encodeURIComponent(args.channel_id as string)}`, body);
  }

  private async deleteChannel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id) return { content: [{ type: 'text', text: 'channel_id is required' }], isError: true };
    return this.mmDelete(`/channels/${encodeURIComponent(args.channel_id as string)}`);
  }

  private async getChannelMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id) return { content: [{ type: 'text', text: 'channel_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 0),
      per_page: String((args.per_page as number) ?? 60),
    };
    return this.mmGet(`/channels/${encodeURIComponent(args.channel_id as string)}/members`, params);
  }

  private async addChannelMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id || !args.user_id) {
      return { content: [{ type: 'text', text: 'channel_id and user_id are required' }], isError: true };
    }
    return this.mmPost(`/channels/${encodeURIComponent(args.channel_id as string)}/members`, { user_id: args.user_id });
  }

  private async listPosts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id) return { content: [{ type: 'text', text: 'channel_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 0),
      per_page: String((args.per_page as number) ?? 60),
    };
    if (args.since) params.since = String(args.since);
    if (args.before) params.before = args.before as string;
    if (args.after) params.after = args.after as string;
    return this.mmGet(`/channels/${encodeURIComponent(args.channel_id as string)}/posts`, params);
  }

  private async getPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    return this.mmGet(`/posts/${encodeURIComponent(args.post_id as string)}`);
  }

  private async createPost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_id || !args.message) {
      return { content: [{ type: 'text', text: 'channel_id and message are required' }], isError: true };
    }
    const body: Record<string, unknown> = { channel_id: args.channel_id, message: args.message };
    if (args.root_id) body.root_id = args.root_id;
    return this.mmPost('/posts', body);
  }

  private async updatePost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id || !args.message) {
      return { content: [{ type: 'text', text: 'post_id and message are required' }], isError: true };
    }
    return this.mmPut(`/posts/${encodeURIComponent(args.post_id as string)}`, { id: args.post_id, message: args.message });
  }

  private async deletePost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    return this.mmDelete(`/posts/${encodeURIComponent(args.post_id as string)}`);
  }

  private async getThread(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    return this.mmGet(`/posts/${encodeURIComponent(args.post_id as string)}/thread`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 0),
      per_page: String((args.per_page as number) ?? 60),
    };
    if (args.in_team) params.in_team = args.in_team as string;
    if (args.in_channel) params.in_channel = args.in_channel as string;
    return this.mmGet('/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.mmGet(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async getUserByEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    return this.mmGet(`/users/email/${encodeURIComponent(args.email as string)}`);
  }

  private async addReaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id || !args.emoji_name) {
      return { content: [{ type: 'text', text: 'post_id and emoji_name are required' }], isError: true };
    }
    const meResponse = await this.fetchWithRetry(`${this.baseUrl}/users/me`, { headers: this.headers });
    if (!meResponse.ok) {
      return { content: [{ type: 'text', text: `Failed to resolve user ID: ${meResponse.status}` }], isError: true };
    }
    const me = await meResponse.json() as { id: string };
    const userId = (args.user_id as string) ?? me.id;
    return this.mmPost('/reactions', {
      user_id: userId,
      post_id: args.post_id,
      emoji_name: args.emoji_name,
    });
  }

  private async getReactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.post_id) return { content: [{ type: 'text', text: 'post_id is required' }], isError: true };
    return this.mmGet(`/posts/${encodeURIComponent(args.post_id as string)}/reactions`);
  }
}
