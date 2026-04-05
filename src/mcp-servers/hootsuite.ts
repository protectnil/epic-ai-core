/**
 * Hootsuite MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Community MCP servers exist (github.com/asklokesh/hootsuite-mcp-server,
// github.com/LokiMCPUniverse/hootsuite-mcp-server) but neither is maintained by Hootsuite Inc.
// The official Hootsuite GitHub org (github.com/hootsuite) has no MCP server.
// Our adapter covers: 13 tools. Vendor MCP covers: 0 tools (no official MCP).
// Recommendation: use-rest-api
//
// Base URL: https://platform.hootsuite.com/v1
// Auth: OAuth2 Authorization Code flow. Token endpoint: https://platform.hootsuite.com/oauth2/token
//       Client credentials passed as Basic auth header (clientId:clientSecret base64-encoded).
//       Access tokens expire; use refresh_token grant to renew.
//       This adapter accepts a pre-obtained accessToken via HootsuiteConfig.
// Docs: https://developer.hootsuite.com/docs/getting-started-with-the-rest-api
//       API reference: https://apidocs.hootsuite.com/docs/api/index.html
// Rate limits: 20 requests/second; 100,000 calls/day maximum

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HootsuiteConfig {
  accessToken: string;
  baseUrl?: string;
}

export class HootsuiteMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: HootsuiteConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://platform.hootsuite.com/v1';
  }

  static catalog() {
    return {
      name: 'hootsuite',
      displayName: 'Hootsuite',
      version: '1.0.0',
      category: 'social',
      keywords: [
        'hootsuite', 'social media', 'social media management', 'schedule post',
        'publish', 'twitter', 'facebook', 'instagram', 'linkedin', 'social profile',
        'message scheduling', 'content calendar', 'team', 'organization',
      ],
      toolNames: [
        'get_me', 'list_social_profiles', 'get_social_profile',
        'schedule_message', 'get_message', 'delete_message',
        'get_media_status',
        'list_organizations', 'list_teams', 'get_team', 'list_team_members',
        'list_members', 'get_member',
      ],
      description: 'Hootsuite social media management: schedule and manage posts across social networks, manage social profiles, teams, members, and media uploads.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_me',
        description: 'Retrieve the authenticated Hootsuite user profile including name, email, and organization memberships',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_social_profiles',
        description: 'List all social network profiles connected to the authenticated Hootsuite account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_social_profile',
        description: 'Retrieve details for a specific connected social profile by profile ID',
        inputSchema: {
          type: 'object',
          properties: {
            social_profile_id: {
              type: 'string',
              description: 'Hootsuite social profile ID',
            },
          },
          required: ['social_profile_id'],
        },
      },
      {
        name: 'schedule_message',
        description: 'Schedule a social media post to one or more social profiles at a specified date and time with optional media',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Message text content to post (subject to per-network character limits)',
            },
            socialProfileIds: {
              type: 'array',
              description: 'Array of Hootsuite social profile IDs to post to',
            },
            scheduledSendTime: {
              type: 'string',
              description: 'ISO 8601 UTC datetime to publish the message (e.g. 2026-04-01T14:00:00Z). Omit to post immediately.',
            },
            mediaIds: {
              type: 'array',
              description: 'Array of media IDs to attach to the message (upload media first via Hootsuite)',
            },
            privacy: {
              type: 'string',
              description: 'Privacy setting for applicable networks: PUBLIC or PROTECTED (default: PUBLIC)',
            },
          },
          required: ['text', 'socialProfileIds'],
        },
      },
      {
        name: 'get_message',
        description: 'Retrieve a scheduled or published message by its Hootsuite message ID',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Hootsuite message ID to retrieve',
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a scheduled message from Hootsuite before it is published (cannot delete already-published posts)',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Hootsuite message ID to delete',
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'get_media_status',
        description: 'Check the processing status of an uploaded media file. Status READY means it can be attached to a message.',
        inputSchema: {
          type: 'object',
          properties: {
            media_id: {
              type: 'string',
              description: 'Hootsuite media ID to check status for',
            },
          },
          required: ['media_id'],
        },
      },
      {
        name: 'list_organizations',
        description: 'List all Hootsuite organizations the authenticated user belongs to',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_teams',
        description: 'List all teams within a Hootsuite organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Hootsuite organization ID to list teams for',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'get_team',
        description: 'Retrieve details of a Hootsuite team including name, logo, and membership information',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Hootsuite team ID',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'list_team_members',
        description: 'List all members belonging to a specific Hootsuite team',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Hootsuite team ID to list members for',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'list_members',
        description: 'List all members of a Hootsuite organization with roles and account details',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Hootsuite organization ID to list members for',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'get_member',
        description: 'Retrieve profile details for a specific Hootsuite organization member by member ID',
        inputSchema: {
          type: 'object',
          properties: {
            member_id: {
              type: 'string',
              description: 'Hootsuite member ID',
            },
          },
          required: ['member_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_me':
          return this.getMe();
        case 'list_social_profiles':
          return this.listSocialProfiles();
        case 'get_social_profile':
          return this.getSocialProfile(args);
        case 'schedule_message':
          return this.scheduleMessage(args);
        case 'get_message':
          return this.getMessage(args);
        case 'delete_message':
          return this.deleteMessage(args);
        case 'get_media_status':
          return this.getMediaStatus(args);
        case 'list_organizations':
          return this.listOrganizations();
        case 'list_teams':
          return this.listTeams(args);
        case 'get_team':
          return this.getTeam(args);
        case 'list_team_members':
          return this.listTeamMembers(args);
        case 'list_members':
          return this.listMembers(args);
        case 'get_member':
          return this.getMember(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async hootGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async hootPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async hootDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  private async getMe(): Promise<ToolResult> {
    return this.hootGet('/me');
  }

  private async listSocialProfiles(): Promise<ToolResult> {
    return this.hootGet('/me/socialProfiles');
  }

  private async getSocialProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.social_profile_id) {
      return { content: [{ type: 'text', text: 'social_profile_id is required' }], isError: true };
    }
    return this.hootGet(`/socialProfiles/${encodeURIComponent(args.social_profile_id as string)}`);
  }

  private async scheduleMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.text || !args.socialProfileIds) {
      return { content: [{ type: 'text', text: 'text and socialProfileIds are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      text: args.text,
      socialProfileIds: args.socialProfileIds,
    };
    if (args.scheduledSendTime) body.scheduledSendTime = args.scheduledSendTime;
    if (args.mediaIds) body.media = (args.mediaIds as string[]).map((id: string) => ({ id }));
    if (args.privacy) body.privacy = args.privacy;
    return this.hootPost('/messages', body);
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) {
      return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    }
    return this.hootGet(`/messages/${encodeURIComponent(args.message_id as string)}`);
  }

  private async deleteMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) {
      return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    }
    return this.hootDelete(`/messages/${encodeURIComponent(args.message_id as string)}`);
  }

  private async getMediaStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.media_id) {
      return { content: [{ type: 'text', text: 'media_id is required' }], isError: true };
    }
    return this.hootGet(`/media/${encodeURIComponent(args.media_id as string)}`);
  }

  private async listOrganizations(): Promise<ToolResult> {
    return this.hootGet('/me/organizations');
  }

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) {
      return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    }
    return this.hootGet(`/organizations/${encodeURIComponent(args.organization_id as string)}/teams`);
  }

  private async getTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id) {
      return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    }
    return this.hootGet(`/teams/${encodeURIComponent(args.team_id as string)}`);
  }

  private async listTeamMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id) {
      return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    }
    return this.hootGet(`/teams/${encodeURIComponent(args.team_id as string)}/members`);
  }

  private async listMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) {
      return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    }
    return this.hootGet(`/organizations/${encodeURIComponent(args.organization_id as string)}/members`);
  }

  private async getMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.member_id) {
      return { content: [{ type: 'text', text: 'member_id is required' }], isError: true };
    }
    return this.hootGet(`/members/${encodeURIComponent(args.member_id as string)}`);
  }
}
