/**
 * Buffer MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Buffer MCP server was found on GitHub, npm, or Buffer's developer docs.
// Community implementations exist (tn819/buffer-mcp, ahernan2/buffer-mcp) but are not published by
// Buffer Inc., are unmaintained, and cover only subsets of the API. Decision: use-rest-api.
//
// Base URL: https://api.bufferapp.com/1
// Auth: OAuth2 Bearer token (access_token passed as Authorization: Bearer header)
// Docs: https://buffer.com/developers/api
// Rate limits: 60 authenticated requests per user per minute (HTTP 429 on excess)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BufferConfig {
  accessToken: string;
  baseUrl?: string;
}

export class BufferMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: BufferConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.bufferapp.com/1';
  }

  static catalog() {
    return {
      name: 'buffer',
      displayName: 'Buffer',
      version: '1.0.0',
      category: 'social',
      keywords: [
        'buffer', 'social media', 'scheduling', 'posts', 'twitter', 'facebook', 'linkedin',
        'instagram', 'mastodon', 'queue', 'publish', 'updates', 'profiles', 'analytics',
      ],
      toolNames: [
        'get_user', 'list_profiles', 'get_profile',
        'get_profile_schedules', 'update_profile_schedules',
        'list_pending_updates', 'list_sent_updates',
        'get_update', 'create_update', 'update_update', 'delete_update',
        'reorder_updates', 'shuffle_updates',
        'share_update', 'move_update_to_top',
        'get_interactions',
      ],
      description: 'Buffer social media scheduling: manage profiles, queue and publish updates, reorder queues, and retrieve analytics across Twitter, Facebook, LinkedIn, Instagram, and Mastodon.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_user',
        description: 'Get the authenticated Buffer user account details including plan, timezone, and connected profile count',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_profiles',
        description: 'List all social media profiles connected to the authenticated Buffer account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_profile',
        description: 'Get details of a specific Buffer social media profile by profile ID',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'The Buffer profile ID (from list_profiles)',
            },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'get_profile_schedules',
        description: 'Get the posting schedule (scheduled times) for a specific Buffer social profile',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'The Buffer profile ID',
            },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'update_profile_schedules',
        description: 'Set or update the posting schedule (days and times) for a specific Buffer social profile',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'The Buffer profile ID',
            },
            schedules: {
              type: 'string',
              description: 'JSON-encoded array of schedule objects with days (array of day names) and times (array of HH:MM strings), e.g. [{"days":["mon","wed"],"times":["09:00","17:00"]}]',
            },
          },
          required: ['profile_id', 'schedules'],
        },
      },
      {
        name: 'list_pending_updates',
        description: 'List all pending (queued, not yet published) updates for a Buffer social profile',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'The Buffer profile ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            count: {
              type: 'number',
              description: 'Number of updates to return (default: 100, max: 100)',
            },
            since: {
              type: 'number',
              description: 'Unix timestamp — only return updates after this time (optional)',
            },
            utc: {
              type: 'boolean',
              description: 'If true, return timestamps in UTC (default: false — uses profile timezone)',
            },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'list_sent_updates',
        description: 'List previously published (sent) updates for a Buffer social profile with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'The Buffer profile ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            count: {
              type: 'number',
              description: 'Number of sent updates to return (default: 100, max: 100)',
            },
            since: {
              type: 'number',
              description: 'Unix timestamp — only return updates sent after this time (optional)',
            },
            utc: {
              type: 'boolean',
              description: 'If true, return timestamps in UTC',
            },
            filter: {
              type: 'string',
              description: 'Filter updates: "all" returns everything; "default" excludes replies not posted via Buffer (default: "default")',
            },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'get_update',
        description: 'Get the full details of a specific Buffer update (post) by its update ID',
        inputSchema: {
          type: 'object',
          properties: {
            update_id: {
              type: 'string',
              description: 'The Buffer update ID',
            },
          },
          required: ['update_id'],
        },
      },
      {
        name: 'create_update',
        description: 'Create and queue a new social media post to one or more Buffer profiles, with optional scheduling',
        inputSchema: {
          type: 'object',
          properties: {
            profile_ids: {
              type: 'string',
              description: 'Comma-separated list of Buffer profile IDs to post to (e.g. "abc123,def456")',
            },
            text: {
              type: 'string',
              description: 'The text content of the social media post',
            },
            now: {
              type: 'boolean',
              description: 'If true, publish immediately instead of queuing (default: false)',
            },
            top: {
              type: 'boolean',
              description: 'If true, add to the top of the queue instead of the end (default: false)',
            },
            scheduled_at: {
              type: 'string',
              description: 'ISO 8601 datetime to schedule the post (e.g. 2026-04-01T14:00:00Z). Overrides queue position.',
            },
            shorten: {
              type: 'boolean',
              description: 'Whether to auto-shorten URLs in the post text (default: true)',
            },
          },
          required: ['profile_ids', 'text'],
        },
      },
      {
        name: 'update_update',
        description: 'Edit the text or scheduled time of an existing pending Buffer update',
        inputSchema: {
          type: 'object',
          properties: {
            update_id: {
              type: 'string',
              description: 'The Buffer update ID to edit',
            },
            text: {
              type: 'string',
              description: 'New text content for the post',
            },
            scheduled_at: {
              type: 'string',
              description: 'New ISO 8601 scheduled datetime (e.g. 2026-04-01T14:00:00Z)',
            },
            now: {
              type: 'boolean',
              description: 'If true, publish immediately (default: false)',
            },
          },
          required: ['update_id'],
        },
      },
      {
        name: 'delete_update',
        description: 'Delete a pending Buffer update from the queue — cannot delete already-published posts',
        inputSchema: {
          type: 'object',
          properties: {
            update_id: {
              type: 'string',
              description: 'The Buffer update ID to delete',
            },
          },
          required: ['update_id'],
        },
      },
      {
        name: 'reorder_updates',
        description: 'Reorder pending updates in a Buffer profile queue by specifying the new order of update IDs',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'The Buffer profile ID',
            },
            order: {
              type: 'string',
              description: 'Comma-separated list of update IDs in the desired new order',
            },
            offset: {
              type: 'number',
              description: 'Position offset (0-based) to start reordering from (default: 0)',
            },
            utc: {
              type: 'boolean',
              description: 'If true, return rescheduled timestamps in UTC (default: false)',
            },
          },
          required: ['profile_id', 'order'],
        },
      },
      {
        name: 'shuffle_updates',
        description: 'Randomly shuffle the order of pending updates in a Buffer profile queue',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'The Buffer profile ID whose queue to shuffle',
            },
            count: {
              type: 'number',
              description: 'Number of updates to include in the shuffle (default: all pending)',
            },
            utc: {
              type: 'boolean',
              description: 'Return timestamps in UTC (default: false)',
            },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'share_update',
        description: 'Immediately publish a pending Buffer update, bypassing the queue schedule',
        inputSchema: {
          type: 'object',
          properties: {
            update_id: {
              type: 'string',
              description: 'The update ID to share (publish) immediately',
            },
          },
          required: ['update_id'],
        },
      },
      {
        name: 'move_update_to_top',
        description: 'Move a pending Buffer update to the top of the queue so it publishes next',
        inputSchema: {
          type: 'object',
          properties: {
            update_id: {
              type: 'string',
              description: 'The update ID to move to the top of the queue',
            },
          },
          required: ['update_id'],
        },
      },
      {
        name: 'get_interactions',
        description: 'Get social interaction analytics (likes, retweets, clicks, comments) for a specific sent update',
        inputSchema: {
          type: 'object',
          properties: {
            update_id: {
              type: 'string',
              description: 'The sent update ID to retrieve interactions for',
            },
            event: {
              type: 'string',
              description: 'Filter by interaction type: retweet, like, comment, mention, click (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            count: {
              type: 'number',
              description: 'Number of interactions per page (default: 20, max: 100)',
            },
          },
          required: ['update_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_user':
          return this.getUser();
        case 'list_profiles':
          return this.listProfiles();
        case 'get_profile':
          return this.getProfile(args);
        case 'get_profile_schedules':
          return this.getProfileSchedules(args);
        case 'update_profile_schedules':
          return this.updateProfileSchedules(args);
        case 'list_pending_updates':
          return this.listPendingUpdates(args);
        case 'list_sent_updates':
          return this.listSentUpdates(args);
        case 'get_update':
          return this.getUpdate(args);
        case 'create_update':
          return this.createUpdate(args);
        case 'update_update':
          return this.updateUpdate(args);
        case 'delete_update':
          return this.deleteUpdate(args);
        case 'reorder_updates':
          return this.reorderUpdates(args);
        case 'shuffle_updates':
          return this.shuffleUpdates(args);
        case 'share_update':
          return this.shareUpdate(args);
        case 'move_update_to_top':
          return this.moveUpdateToTop(args);
        case 'get_interactions':
          return this.getInteractions(args);
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
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  private async bufferGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}.json${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bufferPost(path: string, body: Record<string, string> = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}.json`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: new URLSearchParams(body).toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getUser(): Promise<ToolResult> {
    return this.bufferGet('/user');
  }

  private async listProfiles(): Promise<ToolResult> {
    return this.bufferGet('/profiles');
  }

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id) return { content: [{ type: 'text', text: 'profile_id is required' }], isError: true };
    return this.bufferGet(`/profiles/${encodeURIComponent(args.profile_id as string)}`);
  }

  private async getProfileSchedules(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id) return { content: [{ type: 'text', text: 'profile_id is required' }], isError: true };
    return this.bufferGet(`/profiles/${encodeURIComponent(args.profile_id as string)}/schedules`);
  }

  private async updateProfileSchedules(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id || !args.schedules) return { content: [{ type: 'text', text: 'profile_id and schedules are required' }], isError: true };
    const url = `${this.baseUrl}/profiles/${encodeURIComponent(args.profile_id as string)}/schedules/update.json`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: new URLSearchParams({ schedules: args.schedules as string }).toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPendingUpdates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id) return { content: [{ type: 'text', text: 'profile_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.count) params.count = String(args.count);
    if (args.since) params.since = String(args.since);
    if (typeof args.utc === 'boolean') params.utc = args.utc ? 'true' : 'false';
    return this.bufferGet(`/profiles/${encodeURIComponent(args.profile_id as string)}/updates/pending`, params);
  }

  private async listSentUpdates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id) return { content: [{ type: 'text', text: 'profile_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.count) params.count = String(args.count);
    if (args.since) params.since = String(args.since);
    if (typeof args.utc === 'boolean') params.utc = args.utc ? 'true' : 'false';
    if (args.filter) params.filter = args.filter as string;
    return this.bufferGet(`/profiles/${encodeURIComponent(args.profile_id as string)}/updates/sent`, params);
  }

  private async getUpdate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.update_id) return { content: [{ type: 'text', text: 'update_id is required' }], isError: true };
    return this.bufferGet(`/updates/${encodeURIComponent(args.update_id as string)}`);
  }

  private async createUpdate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_ids || !args.text) return { content: [{ type: 'text', text: 'profile_ids and text are required' }], isError: true };
    const body: Record<string, string> = { text: args.text as string };
    const ids = (args.profile_ids as string).split(',').map(s => s.trim());
    ids.forEach((id, i) => { body[`profile_ids[${i}]`] = id; });
    if (typeof args.now === 'boolean') body.now = args.now ? 'true' : 'false';
    if (typeof args.top === 'boolean') body.top = args.top ? 'true' : 'false';
    if (args.scheduled_at) body.scheduled_at = args.scheduled_at as string;
    if (typeof args.shorten === 'boolean') body.shorten = args.shorten ? 'true' : 'false';
    return this.bufferPost('/updates/create', body);
  }

  private async updateUpdate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.update_id) return { content: [{ type: 'text', text: 'update_id is required' }], isError: true };
    const body: Record<string, string> = {};
    if (args.text) body.text = args.text as string;
    if (args.scheduled_at) body.scheduled_at = args.scheduled_at as string;
    if (typeof args.now === 'boolean') body.now = args.now ? 'true' : 'false';
    return this.bufferPost(`/updates/${encodeURIComponent(args.update_id as string)}/update`, body);
  }

  private async deleteUpdate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.update_id) return { content: [{ type: 'text', text: 'update_id is required' }], isError: true };
    return this.bufferPost(`/updates/${encodeURIComponent(args.update_id as string)}/destroy`);
  }

  private async reorderUpdates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id || !args.order) return { content: [{ type: 'text', text: 'profile_id and order are required' }], isError: true };
    const body: Record<string, string> = {};
    const ids = (args.order as string).split(',').map(s => s.trim());
    ids.forEach((id, i) => { body[`order[${i}]`] = id; });
    if (args.offset) body.offset = String(args.offset);
    if (typeof args.utc === 'boolean') body.utc = args.utc ? 'true' : 'false';
    return this.bufferPost(`/profiles/${encodeURIComponent(args.profile_id as string)}/updates/reorder`, body);
  }

  private async shuffleUpdates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id) return { content: [{ type: 'text', text: 'profile_id is required' }], isError: true };
    const body: Record<string, string> = {};
    if (args.count) body.count = String(args.count);
    if (typeof args.utc === 'boolean') body.utc = args.utc ? 'true' : 'false';
    return this.bufferPost(`/profiles/${encodeURIComponent(args.profile_id as string)}/updates/shuffle`, body);
  }

  private async shareUpdate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.update_id) return { content: [{ type: 'text', text: 'update_id is required' }], isError: true };
    return this.bufferPost(`/updates/${encodeURIComponent(args.update_id as string)}/share`);
  }

  private async moveUpdateToTop(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.update_id) return { content: [{ type: 'text', text: 'update_id is required' }], isError: true };
    return this.bufferPost(`/updates/${encodeURIComponent(args.update_id as string)}/move_to_top`);
  }

  private async getInteractions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.update_id) return { content: [{ type: 'text', text: 'update_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.event) params.event = args.event as string;
    if (args.page) params.page = String(args.page);
    if (args.count) params.count = String(args.count);
    return this.bufferGet(`/updates/${encodeURIComponent(args.update_id as string)}/interactions`, params);
  }
}
