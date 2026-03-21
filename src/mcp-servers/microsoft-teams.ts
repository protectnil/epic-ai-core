/**
 * Microsoft Teams MCP Server
 * Provides access to Microsoft Teams via Graph API for team, channel, and message management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface MicrosoftTeamsConfig {
  accessToken: string;
  baseUrl?: string;
}

export class MicrosoftTeamsMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: MicrosoftTeamsConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://graph.microsoft.com/v1.0';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_teams',
        description: 'List Microsoft Teams that the authenticated user is a member of',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: 'Number of teams to return (max 999, default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Number of teams to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_team',
        description: 'Get details of a specific Microsoft Team',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID)',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'list_channels',
        description: 'List channels in a Microsoft Team',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID)',
            },
            filter: {
              type: 'string',
              description: 'OData filter expression (e.g. membershipType eq \'standard\')',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'send_channel_message',
        description: 'Send a message to a Teams channel',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID)',
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
        description: 'List messages in a Teams channel',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID (group object ID)',
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
              description: 'Pagination skip token from a previous response',
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
        case 'list_teams': {
          const top = (args.top as number) || 20;
          const skip = (args.skip as number) || 0;

          const response = await fetch(
            `${this.baseUrl}/me/joinedTeams?$top=${top}&$skip=${skip}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list teams: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Microsoft Graph returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_team': {
          const teamId = args.team_id as string;

          if (!teamId) {
            return {
              content: [{ type: 'text', text: 'team_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/teams/${encodeURIComponent(teamId)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get team: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Microsoft Graph returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_channels': {
          const teamId = args.team_id as string;

          if (!teamId) {
            return {
              content: [{ type: 'text', text: 'team_id is required' }],
              isError: true,
            };
          }

          let url = `${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels`;
          if (args.filter) url += `?$filter=${encodeURIComponent(args.filter as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list channels: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Microsoft Graph returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'send_channel_message': {
          const teamId = args.team_id as string;
          const channelId = args.channel_id as string;
          const content = args.content as string;

          if (!teamId || !channelId || !content) {
            return {
              content: [{ type: 'text', text: 'team_id, channel_id, and content are required' }],
              isError: true,
            };
          }

          const contentType = (args.content_type as string) || 'text';

          const response = await fetch(
            `${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/messages`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                body: { contentType, content },
              }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to send channel message: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Microsoft Graph returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_channel_messages': {
          const teamId = args.team_id as string;
          const channelId = args.channel_id as string;

          if (!teamId || !channelId) {
            return {
              content: [{ type: 'text', text: 'team_id and channel_id are required' }],
              isError: true,
            };
          }

          const top = (args.top as number) || 20;

          let url = `${this.baseUrl}/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/messages?$top=${top}`;
          if (args.skip_token) url += `&$skipToken=${encodeURIComponent(args.skip_token as string)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list channel messages: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Microsoft Graph returned non-JSON response (HTTP ${response.status})`); }
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
