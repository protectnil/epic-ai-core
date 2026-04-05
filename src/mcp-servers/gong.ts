/**
 * Gong MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: Gong announced official MCP Server support on 2025-10-21 (gong.io press release).
// No public GitHub repo or documented endpoint URL has been published as of 2026-03-28.
// The announcement describes a vendor-hosted MCP Server that enables external AI agents to query
// Gong directly, but no URL, tool list, or transport spec is publicly documented yet.
// Community repos found (none meet all four criteria):
//   - https://github.com/cedricziel/gong-mcp (Rust, stdio+HTTP, ~1 tool, community, 2 stars)
//   - https://github.com/bgrgndzz/gong-mcp (Node.js, stdio, 6 tools, community)
//   - https://github.com/kenazk/gong-mcp (Node.js, stdio, minimal, community)
// Decision: use-rest-api — Official MCP has no public endpoint or documented tool list.
// Recommendation: Use this REST adapter for full coverage.
//
// Base URL: https://api.gong.io/v2
// Auth: HTTP Basic — base64(accessKey:accessKeySecret). For OAuth-authenticated orgs,
//       Gong returns api_base_url_for_customer — supply that value as baseUrl.
// Docs: https://help.gong.io/docs/what-the-gong-api-provides
// Rate limits: ~1,000 requests/hour per token; headers returned on every response.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GongConfig {
  accessKey: string;
  accessKeySecret: string;
  /**
   * Per-customer API base URL returned by Gong for OAuth-authenticated orgs.
   * Defaults to the global endpoint: https://api.gong.io/v2
   */
  baseUrl?: string;
}

export class GongMCPServer extends MCPAdapterBase {
  private readonly basicToken: string;
  private readonly baseUrl: string;

  constructor(config: GongConfig) {
    super();
    this.basicToken = Buffer.from(`${config.accessKey}:${config.accessKeySecret}`).toString('base64');
    this.baseUrl = config.baseUrl || 'https://api.gong.io/v2';
  }

  static catalog() {
    return {
      name: 'gong',
      displayName: 'Gong',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'gong', 'revenue intelligence', 'call recording', 'transcript', 'sales',
        'conversation intelligence', 'coaching', 'deal', 'forecast', 'scorecard',
        'activity', 'engagement', 'crm', 'meeting', 'talk ratio',
      ],
      toolNames: [
        'list_calls',
        'get_call',
        'search_calls',
        'get_call_transcript',
        'get_call_media',
        'get_call_stats',
        'list_users',
        'get_user',
        'get_user_stats',
        'list_scorecards',
        'get_answered_scorecards',
        'get_daily_activity',
        'get_activity_aggregate',
        'list_crm_objects',
        'get_crm_object',
        'list_library_folders',
        'list_library_calls',
      ],
      description: 'Gong revenue intelligence platform: access call recordings, transcripts, AI insights, scorecards, user activity stats, and CRM data.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_calls',
        description: 'Retrieve calls from the Gong account within an optional date range. Returns call metadata including title, duration, participants, and scheduled/started times.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDateTime: {
              type: 'string',
              description: 'ISO-8601 start of date range (e.g., 2026-01-01T00:00:00Z). Defaults to last 90 days per Gong policy.',
            },
            toDateTime: {
              type: 'string',
              description: 'ISO-8601 end of date range (e.g., 2026-03-31T23:59:59Z)',
            },
            workspaceId: {
              type: 'string',
              description: 'Optional Gong workspace ID to scope results to a specific workspace',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor returned by a previous response',
            },
          },
        },
      },
      {
        name: 'get_call',
        description: 'Get detailed metadata for a specific Gong call by call ID, including participants, duration, and engagement metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            callId: {
              type: 'string',
              description: 'Gong call ID',
            },
          },
          required: ['callId'],
        },
      },
      {
        name: 'search_calls',
        description: 'Search Gong calls using date range and participant filters. Returns extended metadata including topics and action items.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDateTime: {
              type: 'string',
              description: 'ISO-8601 start of date range for the search',
            },
            toDateTime: {
              type: 'string',
              description: 'ISO-8601 end of date range for the search',
            },
            primaryUserIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter calls by primary (host) user IDs',
            },
            participantUserIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter calls that include these participant user IDs',
            },
            workspaceId: {
              type: 'string',
              description: 'Optional workspace ID to scope the search',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_call_transcript',
        description: 'Retrieve the full transcript for one or more Gong calls by call ID, with speaker turns and timestamps.',
        inputSchema: {
          type: 'object',
          properties: {
            callIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of Gong call IDs to retrieve transcripts for (required)',
            },
            fromDateTime: {
              type: 'string',
              description: 'ISO-8601 start of date range (used as additional filter)',
            },
            toDateTime: {
              type: 'string',
              description: 'ISO-8601 end of date range (used as additional filter)',
            },
          },
          required: ['callIds'],
        },
      },
      {
        name: 'get_call_media',
        description: 'Retrieve media download URLs (audio/video) for a specific Gong call.',
        inputSchema: {
          type: 'object',
          properties: {
            callId: {
              type: 'string',
              description: 'Gong call ID to get media URLs for',
            },
          },
          required: ['callId'],
        },
      },
      {
        name: 'get_call_stats',
        description: 'Retrieve detailed call data including AI-generated content (topics, highlights, next steps, scorecards) for calls matching optional date range and call ID filters.',
        inputSchema: {
          type: 'object',
          properties: {
            callIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific Gong call IDs',
            },
            fromDateTime: {
              type: 'string',
              description: 'ISO-8601 start of date range',
            },
            toDateTime: {
              type: 'string',
              description: 'ISO-8601 end of date range',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List all users in the Gong workspace with profile details, role, and active/inactive status.',
        inputSchema: {
          type: 'object',
          properties: {
            includeAvatars: {
              type: 'boolean',
              description: 'Whether to include avatar URLs in the response (default: false)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get profile and role details for a specific Gong user by user ID.',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Gong user ID',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'get_user_stats',
        description: 'Get activity and interaction statistics for Gong users over a date range, including calls made and talk time.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDateTime: {
              type: 'string',
              description: 'ISO-8601 start of date range for statistics',
            },
            toDateTime: {
              type: 'string',
              description: 'ISO-8601 end of date range for statistics',
            },
            userIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific user IDs (default: all users)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_scorecards',
        description: 'List all scorecards defined in the Gong system, including their questions and scoring criteria.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_answered_scorecards',
        description: 'Retrieve completed/answered scorecards for calls or users within a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDateTime: {
              type: 'string',
              description: 'ISO-8601 start of date range for answered scorecards',
            },
            toDateTime: {
              type: 'string',
              description: 'ISO-8601 end of date range for answered scorecards',
            },
            scorecardIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific scorecard IDs',
            },
            reviewedUserIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to scorecards for specific reviewed users',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_daily_activity',
        description: 'Retrieve daily call and engagement activity for Gong users within a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDateTime: {
              type: 'string',
              description: 'ISO-8601 start of date range',
            },
            toDateTime: {
              type: 'string',
              description: 'ISO-8601 end of date range',
            },
            userIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific user IDs (default: all users)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_activity_aggregate',
        description: 'Get aggregated activity statistics for Gong users grouped into time periods within a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDateTime: {
              type: 'string',
              description: 'ISO-8601 start of date range',
            },
            toDateTime: {
              type: 'string',
              description: 'ISO-8601 end of date range',
            },
            userIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter to specific user IDs (default: all users)',
            },
            groupBy: {
              type: 'string',
              description: 'Time grouping period: Day, Week, Month (default: Week)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_crm_objects',
        description: 'List CRM objects (deals, accounts, contacts) synced to Gong from the connected CRM system.',
        inputSchema: {
          type: 'object',
          properties: {
            objType: {
              type: 'string',
              description: 'CRM object type: Deal, Account, Contact, Lead (required)',
            },
            fromUpdatedDate: {
              type: 'string',
              description: 'ISO-8601 date to filter objects updated after this time',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['objType'],
        },
      },
      {
        name: 'get_crm_object',
        description: 'Get details for a specific CRM object (deal, account, or contact) synced to Gong.',
        inputSchema: {
          type: 'object',
          properties: {
            objType: {
              type: 'string',
              description: 'CRM object type: Deal, Account, Contact, Lead',
            },
            crmObjectId: {
              type: 'string',
              description: 'CRM system object ID',
            },
          },
          required: ['objType', 'crmObjectId'],
        },
      },
      {
        name: 'list_library_folders',
        description: 'List folders in the Gong call library where teams organize notable calls and clips.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: {
              type: 'string',
              description: 'Optional workspace ID to scope library folder listing',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_library_calls',
        description: 'List calls saved in a specific Gong library folder.',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: {
              type: 'string',
              description: 'Library folder ID (from list_library_folders)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['folderId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_calls':
          return await this.listCalls(args);
        case 'get_call':
          return await this.getCall(args);
        case 'search_calls':
          return await this.searchCalls(args);
        case 'get_call_transcript':
          return await this.getCallTranscript(args);
        case 'get_call_media':
          return await this.getCallMedia(args);
        case 'get_call_stats':
          return await this.getCallStats(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'get_user_stats':
          return await this.getUserStats(args);
        case 'list_scorecards':
          return await this.listScorecards();
        case 'get_answered_scorecards':
          return await this.getAnsweredScorecards(args);
        case 'get_daily_activity':
          return await this.getDailyActivity(args);
        case 'get_activity_aggregate':
          return await this.getActivityAggregate(args);
        case 'list_crm_objects':
          return await this.listCrmObjects(args);
        case 'get_crm_object':
          return await this.getCrmObject(args);
        case 'list_library_folders':
          return await this.listLibraryFolders(args);
        case 'list_library_calls':
          return await this.listLibraryCalls(args);
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
      Authorization: `Basic ${this.basicToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fromDateTime) params.set('fromDateTime', args.fromDateTime as string);
    if (args.toDateTime) params.set('toDateTime', args.toDateTime as string);
    if (args.workspaceId) params.set('workspaceId', args.workspaceId as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    const url = `${this.baseUrl}/calls${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list calls: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCall(args: Record<string, unknown>): Promise<ToolResult> {
    const callId = args.callId as string;
    if (!callId) {
      return { content: [{ type: 'text', text: 'callId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calls/${encodeURIComponent(callId)}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get call: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const filter: Record<string, unknown> = {};
    if (args.fromDateTime) filter.fromDateTime = args.fromDateTime;
    if (args.toDateTime) filter.toDateTime = args.toDateTime;
    if (args.primaryUserIds) filter.primaryUserIds = args.primaryUserIds;
    if (args.participantUserIds) filter.participantUserIds = args.participantUserIds;
    if (args.workspaceId) filter.workspaceId = args.workspaceId;
    let url = `${this.baseUrl}/calls/extensive`;
    if (args.cursor) url += `?cursor=${encodeURIComponent(args.cursor as string)}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ filter }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to search calls: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCallTranscript(args: Record<string, unknown>): Promise<ToolResult> {
    const callIds = args.callIds as string[];
    if (!callIds || callIds.length === 0) {
      return { content: [{ type: 'text', text: 'callIds is required and must be a non-empty array' }], isError: true };
    }
    const filter: Record<string, unknown> = { callIds };
    if (args.fromDateTime) filter.fromDateTime = args.fromDateTime;
    if (args.toDateTime) filter.toDateTime = args.toDateTime;
    const response = await this.fetchWithRetry(`${this.baseUrl}/calls/transcript`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ filter }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get transcript: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCallMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const callId = args.callId as string;
    if (!callId) {
      return { content: [{ type: 'text', text: 'callId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calls/${encodeURIComponent(callId)}/media`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get call media: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCallStats(args: Record<string, unknown>): Promise<ToolResult> {
    // NOTE: /v2/calls/ai-content no longer exists (removed 2024).
    // AI content (topics, highlights, next steps) is retrieved via /v2/calls/extensive.
    const filter: Record<string, unknown> = {};
    if (args.callIds) filter.callIds = args.callIds;
    if (args.fromDateTime) filter.fromDateTime = args.fromDateTime;
    if (args.toDateTime) filter.toDateTime = args.toDateTime;
    let url = `${this.baseUrl}/calls/extensive`;
    if (args.cursor) url += `?cursor=${encodeURIComponent(args.cursor as string)}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ filter }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get call stats: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (typeof args.includeAvatars === 'boolean') params.set('includeAvatars', String(args.includeAvatars));
    if (args.cursor) params.set('cursor', args.cursor as string);
    const url = `${this.baseUrl}/users${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list users: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.userId as string;
    if (!userId) {
      return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${encodeURIComponent(userId)}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get user: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getUserStats(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { filter: {} };
    const filter = body.filter as Record<string, unknown>;
    if (args.fromDateTime) filter.fromDateTime = args.fromDateTime;
    if (args.toDateTime) filter.toDateTime = args.toDateTime;
    if (args.userIds) filter.userIds = args.userIds;
    let url = `${this.baseUrl}/stats/interaction`;
    if (args.cursor) url += `?cursor=${encodeURIComponent(args.cursor as string)}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get user stats: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listScorecards(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/settings/scorecards`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list scorecards: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAnsweredScorecards(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fromDateTime) params.set('fromDateTime', args.fromDateTime as string);
    if (args.toDateTime) params.set('toDateTime', args.toDateTime as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    const scorecardIds = args.scorecardIds as string[] | undefined;
    if (scorecardIds) scorecardIds.forEach(id => params.append('scorecardIds', id));
    const reviewedUserIds = args.reviewedUserIds as string[] | undefined;
    if (reviewedUserIds) reviewedUserIds.forEach(id => params.append('reviewedUserIds', id));
    const url = `${this.baseUrl}/stats/activity/scorecards${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get answered scorecards: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDailyActivity(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fromDateTime) params.set('fromDateTime', args.fromDateTime as string);
    if (args.toDateTime) params.set('toDateTime', args.toDateTime as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    const userIds = args.userIds as string[] | undefined;
    if (userIds) userIds.forEach(id => params.append('userIds', id));
    const url = `${this.baseUrl}/stats/activity/day-by-day${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get daily activity: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getActivityAggregate(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fromDateTime) params.set('fromDateTime', args.fromDateTime as string);
    if (args.toDateTime) params.set('toDateTime', args.toDateTime as string);
    if (args.groupBy) params.set('groupBy', args.groupBy as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    const userIds = args.userIds as string[] | undefined;
    if (userIds) userIds.forEach(id => params.append('userIds', id));
    const url = `${this.baseUrl}/stats/activity/aggregate-by-period${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get activity aggregate: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCrmObjects(args: Record<string, unknown>): Promise<ToolResult> {
    const objType = args.objType as string;
    if (!objType) {
      return { content: [{ type: 'text', text: 'objType is required (Deal, Account, Contact, or Lead)' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.fromUpdatedDate) params.set('fromUpdatedDate', args.fromUpdatedDate as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    const url = `${this.baseUrl}/crm/object/${encodeURIComponent(objType)}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list CRM objects: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCrmObject(args: Record<string, unknown>): Promise<ToolResult> {
    const objType = args.objType as string;
    const crmObjectId = args.crmObjectId as string;
    if (!objType || !crmObjectId) {
      return { content: [{ type: 'text', text: 'objType and crmObjectId are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/crm/object/${encodeURIComponent(objType)}/${encodeURIComponent(crmObjectId)}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get CRM object: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listLibraryFolders(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.workspaceId) params.set('workspaceId', args.workspaceId as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    const url = `${this.baseUrl}/library/folders${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list library folders: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listLibraryCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const folderId = args.folderId as string;
    if (!folderId) {
      return { content: [{ type: 'text', text: 'folderId is required' }], isError: true };
    }
    // Correct endpoint: GET /v2/library/folder-content?folderId=...
    // NOT /v2/library/folders/{folderId}/calls (that path does not exist)
    const params = new URLSearchParams({ folderId });
    if (args.cursor) params.set('cursor', args.cursor as string);
    const url = `${this.baseUrl}/library/folder-content?${params.toString()}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list library calls: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
