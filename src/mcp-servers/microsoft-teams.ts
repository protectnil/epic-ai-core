/**
 * Microsoft Teams MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/microsoft/mcp (bap-microsoft/MCP-Platform) — transport: streamable-HTTP (REMOTE),
//   auth: delegated OAuth2. Published by Microsoft (bap-microsoft org), actively maintained (2026).
//   The bap-microsoft Teams MCP manages chats, channels, users, and messages via Graph API with
//   server-side filtering, pagination, and token optimization. Exact tool count not publicly disclosed
//   (private enterprise repo behind SSO). Assessed as 10+ tools based on description scope.
//   The prior reference to "microsoft/EnterpriseMCP" (3 tools) is a different, older server — superseded.
// Our adapter covers: 18 tools. Vendor MCP covers: ~10+ tools (estimated from description).
// Recommendation: use-both — the bap-microsoft MCP requires enterprise SSO and delegated-only auth;
//   our adapter covers write operations (create_channel, send messages, create_online_meeting,
//   add_channel_member) and app-only service-principal flows not available in interactive delegated MCP.
//   Use vendor MCP for interactive read scenarios with delegated user tokens.
//
// Base URL: https://graph.microsoft.com/v1.0
// Auth: Bearer token (delegated user token via MSAL OAuth2 auth code flow)
//   App-only tokens require resource-specific consent (RSC) for most Teams endpoints.
// Docs: https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview?view=graph-rest-1.0
// Rate limits: Per-resource throttling. Teams messaging: 4 requests/second per app per tenant.
// Note: /me/joinedTeams does not support $skip. Use $skipToken from @odata.nextLink for pagination.
//   Channel messages: max 50 per page. Chats: list requires Teams.ReadBasic.All permission.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MicrosoftTeamsConfig {
  accessToken: string;
  baseUrl?: string;
}

export class MicrosoftTeamsMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: MicrosoftTeamsConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://graph.microsoft.com/v1.0').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'microsoft-teams',
      displayName: 'Microsoft Teams',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: [
        'teams', 'microsoft', 'channels', 'messages', 'chat', 'chats', 'meetings',
        'video', 'collaboration', 'workspace', 'notifications', 'tabs', 'members',
        'online-meeting', 'transcript', 'm365', 'office365',
      ],
      toolNames: [
        'list_teams', 'get_team', 'list_channels', 'get_channel',
        'create_channel', 'send_channel_message', 'list_channel_messages',
        'get_channel_message', 'reply_to_channel_message',
        'list_channel_members', 'add_channel_member',
        'list_chats', 'get_chat', 'send_chat_message', 'list_chat_messages',
        'list_team_members', 'create_online_meeting', 'list_channel_tabs',
      ],
      description: 'Manage Microsoft Teams via Graph API: list teams and channels, send and read messages, manage chats, handle channel members and tabs, create online meetings, and access team membership.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_teams',
        description: 'List Microsoft Teams joined by the authenticated user. Supports $top and $skipToken for pagination (does not support $skip).',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: 'Number of teams to return (max 999, default: 20)',
            },
            skip_token: {
              type: 'string',
              description: 'Pagination token from @odata.nextLink returned by a previous call',
            },
          },
        },
      },
      {
        name: 'get_team',
        description: 'Get details of a specific Microsoft Team including settings, member settings, and fun settings.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID GUID)',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'list_channels',
        description: 'List all channels in a Microsoft Team. Supports OData $filter for membershipType.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID GUID)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "membershipType eq \'standard\'")',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'get_channel',
        description: 'Get details of a specific channel within a Microsoft Team.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID GUID)',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID',
            },
          },
          required: ['team_id', 'channel_id'],
        },
      },
      {
        name: 'create_channel',
        description: 'Create a new channel in a Microsoft Team. Supports standard, private, and shared channel types.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID GUID)',
            },
            displayName: {
              type: 'string',
              description: 'Channel display name',
            },
            description: {
              type: 'string',
              description: 'Channel description (optional)',
            },
            membershipType: {
              type: 'string',
              description: 'Channel type: standard, private, or shared (default: standard)',
            },
          },
          required: ['team_id', 'displayName'],
        },
      },
      {
        name: 'send_channel_message',
        description: 'Send a message to a Microsoft Teams channel. Supports text and HTML content types.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID GUID)',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID',
            },
            content: {
              type: 'string',
              description: 'Message body content',
            },
            content_type: {
              type: 'string',
              description: 'Content type: text or html (default: text)',
            },
          },
          required: ['team_id', 'channel_id', 'content'],
        },
      },
      {
        name: 'list_channel_messages',
        description: 'List top-level messages in a Teams channel. Max 50 per page. Use skip_token for pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID GUID)',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID',
            },
            top: {
              type: 'number',
              description: 'Number of messages to return (max 50, default: 20)',
            },
            skip_token: {
              type: 'string',
              description: 'Pagination skip token from @odata.nextLink',
            },
          },
          required: ['team_id', 'channel_id'],
        },
      },
      {
        name: 'get_channel_message',
        description: 'Get a specific message from a Teams channel by its message ID.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID GUID)',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID',
            },
            message_id: {
              type: 'string',
              description: 'Message ID',
            },
          },
          required: ['team_id', 'channel_id', 'message_id'],
        },
      },
      {
        name: 'reply_to_channel_message',
        description: 'Send a reply to a specific message thread in a Teams channel.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID GUID)',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID',
            },
            message_id: {
              type: 'string',
              description: 'ID of the parent message to reply to',
            },
            content: {
              type: 'string',
              description: 'Reply body content',
            },
            content_type: {
              type: 'string',
              description: 'Content type: text or html (default: text)',
            },
          },
          required: ['team_id', 'channel_id', 'message_id', 'content'],
        },
      },
      {
        name: 'list_channel_members',
        description: 'List members of a specific channel (for private and shared channels; standard channels inherit team membership).',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID GUID)',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID',
            },
          },
          required: ['team_id', 'channel_id'],
        },
      },
      {
        name: 'add_channel_member',
        description: 'Add a user as a member to a Teams channel (applicable for private and shared channels).',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID GUID)',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID',
            },
            userId: {
              type: 'string',
              description: 'Object ID or UPN of the user to add',
            },
            roles: {
              type: 'array',
              description: 'Optional roles array (e.g. ["owner"] — omit for regular member)',
            },
          },
          required: ['team_id', 'channel_id', 'userId'],
        },
      },
      {
        name: 'list_chats',
        description: 'List all chats the authenticated user is a participant of, including 1:1, group, and meeting chats.',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: 'Number of chats to return (default: 20)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "chatType eq \'oneOnOne\'")',
            },
          },
        },
      },
      {
        name: 'get_chat',
        description: 'Get details of a specific Teams chat by its chat ID.',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID',
            },
          },
          required: ['chat_id'],
        },
      },
      {
        name: 'send_chat_message',
        description: 'Send a message to an existing Teams chat (1:1 or group chat).',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID to send the message to',
            },
            content: {
              type: 'string',
              description: 'Message body content',
            },
            content_type: {
              type: 'string',
              description: 'Content type: text or html (default: text)',
            },
          },
          required: ['chat_id', 'content'],
        },
      },
      {
        name: 'list_chat_messages',
        description: 'List messages in a Teams chat. Supports $top and $skipToken for pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            chat_id: {
              type: 'string',
              description: 'Chat ID',
            },
            top: {
              type: 'number',
              description: 'Number of messages to return (default: 20)',
            },
            skip_token: {
              type: 'string',
              description: 'Pagination skip token from @odata.nextLink',
            },
          },
          required: ['chat_id'],
        },
      },
      {
        name: 'list_team_members',
        description: 'List all members of a Microsoft Team.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID GUID)',
            },
            top: {
              type: 'number',
              description: 'Maximum number of members to return (default: 50)',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'create_online_meeting',
        description: 'Create an online Teams meeting for the authenticated user with subject, start/end times, and optional attendees.',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Meeting subject/title',
            },
            startDateTime: {
              type: 'string',
              description: 'Meeting start datetime in ISO 8601 format (e.g. 2026-04-15T14:00:00Z)',
            },
            endDateTime: {
              type: 'string',
              description: 'Meeting end datetime in ISO 8601 format',
            },
            attendees: {
              type: 'array',
              description: 'Array of attendee email address strings (optional)',
            },
          },
          required: ['subject', 'startDateTime', 'endDateTime'],
        },
      },
      {
        name: 'list_channel_tabs',
        description: 'List tabs pinned in a specific Teams channel.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID GUID)',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID',
            },
          },
          required: ['team_id', 'channel_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_teams':
          return await this.listTeams(args, headers);
        case 'get_team':
          return await this.getTeam(args, headers);
        case 'list_channels':
          return await this.listChannels(args, headers);
        case 'get_channel':
          return await this.getChannel(args, headers);
        case 'create_channel':
          return await this.createChannel(args, headers);
        case 'send_channel_message':
          return await this.sendChannelMessage(args, headers);
        case 'list_channel_messages':
          return await this.listChannelMessages(args, headers);
        case 'get_channel_message':
          return await this.getChannelMessage(args, headers);
        case 'reply_to_channel_message':
          return await this.replyToChannelMessage(args, headers);
        case 'list_channel_members':
          return await this.listChannelMembers(args, headers);
        case 'add_channel_member':
          return await this.addChannelMember(args, headers);
        case 'list_chats':
          return await this.listChats(args, headers);
        case 'get_chat':
          return await this.getChat(args, headers);
        case 'send_chat_message':
          return await this.sendChatMessage(args, headers);
        case 'list_chat_messages':
          return await this.listChatMessages(args, headers);
        case 'list_team_members':
          return await this.listTeamMembers(args, headers);
        case 'create_online_meeting':
          return await this.createOnlineMeeting(args, headers);
        case 'list_channel_tabs':
          return await this.listChannelTabs(args, headers);
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

  private async graphGet(url: string, headers: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Graph API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async graphPost(url: string, headers: Record<string, string>, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Graph API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listTeams(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const top = (args.top as number) || 20;
    let url = `${this.baseUrl}/me/joinedTeams?$top=${top}`;
    if (args.skip_token) url += `&$skipToken=${encodeURIComponent(args.skip_token as string)}`;
    return this.graphGet(url, headers);
  }

  private async getTeam(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    if (!teamId) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    return this.graphGet(`${this.baseUrl}/teams/${encodeURIComponent(teamId)}`, headers);
  }

  private async listChannels(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    if (!teamId) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    let url = `${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels`;
    if (args.filter) url += `?$filter=${encodeURIComponent(args.filter as string)}`;
    return this.graphGet(url, headers);
  }

  private async getChannel(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    const channelId = args.channel_id as string;
    if (!teamId || !channelId) return { content: [{ type: 'text', text: 'team_id and channel_id are required' }], isError: true };
    return this.graphGet(`${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}`, headers);
  }

  private async createChannel(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    const displayName = args.displayName as string;
    if (!teamId || !displayName) return { content: [{ type: 'text', text: 'team_id and displayName are required' }], isError: true };
    const body: Record<string, unknown> = {
      displayName,
      membershipType: (args.membershipType as string) || 'standard',
    };
    if (args.description) body.description = args.description;
    return this.graphPost(`${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels`, headers, body);
  }

  private async sendChannelMessage(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    const channelId = args.channel_id as string;
    const content = args.content as string;
    if (!teamId || !channelId || !content) {
      return { content: [{ type: 'text', text: 'team_id, channel_id, and content are required' }], isError: true };
    }
    return this.graphPost(
      `${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/messages`,
      headers,
      { body: { contentType: (args.content_type as string) || 'text', content } },
    );
  }

  private async listChannelMessages(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    const channelId = args.channel_id as string;
    if (!teamId || !channelId) return { content: [{ type: 'text', text: 'team_id and channel_id are required' }], isError: true };
    const top = Math.min((args.top as number) || 20, 50);
    let url = `${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/messages?$top=${top}`;
    if (args.skip_token) url += `&$skipToken=${encodeURIComponent(args.skip_token as string)}`;
    return this.graphGet(url, headers);
  }

  private async getChannelMessage(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    const channelId = args.channel_id as string;
    const messageId = args.message_id as string;
    if (!teamId || !channelId || !messageId) {
      return { content: [{ type: 'text', text: 'team_id, channel_id, and message_id are required' }], isError: true };
    }
    return this.graphGet(
      `${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}`,
      headers,
    );
  }

  private async replyToChannelMessage(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    const channelId = args.channel_id as string;
    const messageId = args.message_id as string;
    const content = args.content as string;
    if (!teamId || !channelId || !messageId || !content) {
      return { content: [{ type: 'text', text: 'team_id, channel_id, message_id, and content are required' }], isError: true };
    }
    return this.graphPost(
      `${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}/replies`,
      headers,
      { body: { contentType: (args.content_type as string) || 'text', content } },
    );
  }

  private async listChannelMembers(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    const channelId = args.channel_id as string;
    if (!teamId || !channelId) return { content: [{ type: 'text', text: 'team_id and channel_id are required' }], isError: true };
    return this.graphGet(
      `${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/members`,
      headers,
    );
  }

  private async addChannelMember(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    const channelId = args.channel_id as string;
    const userId = args.userId as string;
    if (!teamId || !channelId || !userId) {
      return { content: [{ type: 'text', text: 'team_id, channel_id, and userId are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      '@odata.type': '#microsoft.graph.aadUserConversationMember',
      'user@odata.bind': `${this.baseUrl}/users('${userId}')`,
    };
    if (args.roles) body.roles = args.roles;
    return this.graphPost(
      `${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/members`,
      headers,
      body,
    );
  }

  private async listChats(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const top = (args.top as number) || 20;
    let url = `${this.baseUrl}/me/chats?$top=${top}`;
    if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;
    return this.graphGet(url, headers);
  }

  private async getChat(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const chatId = args.chat_id as string;
    if (!chatId) return { content: [{ type: 'text', text: 'chat_id is required' }], isError: true };
    return this.graphGet(`${this.baseUrl}/chats/${encodeURIComponent(chatId)}`, headers);
  }

  private async sendChatMessage(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const chatId = args.chat_id as string;
    const content = args.content as string;
    if (!chatId || !content) return { content: [{ type: 'text', text: 'chat_id and content are required' }], isError: true };
    return this.graphPost(
      `${this.baseUrl}/chats/${encodeURIComponent(chatId)}/messages`,
      headers,
      { body: { contentType: (args.content_type as string) || 'text', content } },
    );
  }

  private async listChatMessages(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const chatId = args.chat_id as string;
    if (!chatId) return { content: [{ type: 'text', text: 'chat_id is required' }], isError: true };
    const top = (args.top as number) || 20;
    let url = `${this.baseUrl}/chats/${encodeURIComponent(chatId)}/messages?$top=${top}`;
    if (args.skip_token) url += `&$skipToken=${encodeURIComponent(args.skip_token as string)}`;
    return this.graphGet(url, headers);
  }

  private async listTeamMembers(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    if (!teamId) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    const top = (args.top as number) || 50;
    return this.graphGet(`${this.baseUrl}/teams/${encodeURIComponent(teamId)}/members?$top=${top}`, headers);
  }

  private async createOnlineMeeting(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const { subject, startDateTime, endDateTime } = args;
    if (!subject || !startDateTime || !endDateTime) {
      return { content: [{ type: 'text', text: 'subject, startDateTime, and endDateTime are required' }], isError: true };
    }
    const body: Record<string, unknown> = { subject, startDateTime, endDateTime };
    if (args.attendees) {
      body.participants = {
        attendees: (args.attendees as string[]).map((email) => ({
          identity: { user: { id: email } },
          upn: email,
          role: 'attendee',
        })),
      };
    }
    return this.graphPost(`${this.baseUrl}/me/onlineMeetings`, headers, body);
  }

  private async listChannelTabs(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    const channelId = args.channel_id as string;
    if (!teamId || !channelId) return { content: [{ type: 'text', text: 'team_id and channel_id are required' }], isError: true };
    return this.graphGet(
      `${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/tabs`,
      headers,
    );
  }
}
