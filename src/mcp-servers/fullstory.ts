/**
 * FullStory MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: Announced in beta by FullStory (https://www.fullstory.com/blog/fullstory-mcp/) — no public GitHub
//   repo or npm package published as of 2026-03-28. Beta is vendor-hosted/invite-only; not publicly accessible.
//   Transport: unknown (not yet publicly documented). MCP fails criteria 1 (no public repo/package).
// Our adapter covers: 14 tools. Vendor MCP: tool count unknown (private beta).
// Recommendation: use-rest-api — vendor MCP is not publicly available; REST adapter is the only accessible integration.
//
// Base URL: https://api.fullstory.com
// Auth: API key via Authorization header as "Basic {YOUR_API_KEY}" — the raw API key is passed
//       directly as the value (NOT base64 encoded). See https://developer.fullstory.com/server/authentication/
// Docs: https://developer.fullstory.com/
// Rate limits: Endpoint-specific; 429 response includes Retry-After header. Server events: quota per org/month.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FullStoryConfig {
  apiKey: string;
  baseUrl?: string;
}

export class FullStoryMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: FullStoryConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.fullstory.com';
  }

  static catalog() {
    return {
      name: 'fullstory',
      displayName: 'FullStory',
      version: '1.0.0',
      category: 'observability',
      keywords: [
        'fullstory', 'session replay', 'digital experience', 'analytics', 'user session',
        'heatmap', 'funnel', 'segment', 'event', 'user identity', 'rage click',
        'error click', 'dxa', 'product analytics', 'session recording',
      ],
      toolNames: [
        'get_user',
        'upsert_user',
        'delete_user',
        'list_sessions',
        'get_session_summary',
        'create_event',
        'create_events_batch',
        'list_segments',
        'get_segment',
        'list_exports',
        'get_export',
        'create_export',
        'get_data_export_bundles',
        'upsert_users_batch',
      ],
      description: 'FullStory digital experience analytics: manage users, capture custom events, retrieve session data, and export behavioral analytics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_user',
        description: 'Retrieve a FullStory user profile and custom properties by user ID or device ID',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Your application user ID as passed to FullStory.identify()',
            },
            device_id: {
              type: 'string',
              description: 'FullStory device ID (alternative to uid — use one or the other)',
            },
          },
        },
      },
      {
        name: 'upsert_user',
        description: 'Create or update a FullStory user profile with custom properties and display name',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Your application user ID to associate with this profile',
            },
            display_name: {
              type: 'string',
              description: 'Human-readable display name for the user in FullStory UI',
            },
            email: {
              type: 'string',
              description: 'User email address',
            },
            properties: {
              type: 'object',
              description: 'Custom user properties as key-value pairs (values can be string, number, boolean, or date)',
            },
          },
          required: ['uid'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a FullStory user and all associated session data by user ID (GDPR right to erasure)',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Your application user ID to delete from FullStory',
            },
          },
          required: ['uid'],
        },
      },
      {
        name: 'list_sessions',
        description: 'Retrieve a list of session replay URLs for a specific user; uid or email is required, limit defaults to 20',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Your application user ID (as passed to FS.identify) — required if email not provided',
            },
            email: {
              type: 'string',
              description: 'User email address — required if uid not provided (URL-encoded automatically)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of sessions to return (default: 20)',
            },
          },
          required: ['uid'],
        },
      },
      {
        name: 'get_session_summary',
        description: 'Get an AI-generated summary of a specific session replay including key user actions and frustration signals',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'FullStory session ID to summarize',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'create_event',
        description: 'Send a single custom server-side event to FullStory for a specific user session',
        inputSchema: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              description: 'User identity object with uid field (e.g. {"uid": "user123"})',
            },
            session: {
              type: 'object',
              description: 'Session context object (e.g. {"use_most_recent": true})',
            },
            context: {
              type: 'object',
              description: 'Request context including page URL and timestamp',
            },
            events: {
              type: 'array',
              description: 'Array of event objects, each with name and properties fields',
            },
          },
          required: ['user', 'events'],
        },
      },
      {
        name: 'create_events_batch',
        description: 'Send a batch of up to 1,000 custom server-side events to FullStory in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            requests: {
              type: 'array',
              description: 'Array of event request objects, each containing user, session, context, and events fields',
            },
          },
          required: ['requests'],
        },
      },
      {
        name: 'list_segments',
        description: 'List all user segments defined in FullStory with their IDs, names, and descriptions',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by segment type: user, session (default: returns all)',
            },
          },
        },
      },
      {
        name: 'get_segment',
        description: 'Retrieve detailed definition and metadata for a specific FullStory segment by ID',
        inputSchema: {
          type: 'object',
          properties: {
            segment_id: {
              type: 'string',
              description: 'FullStory segment ID',
            },
          },
          required: ['segment_id'],
        },
      },
      {
        name: 'list_exports',
        description: 'List all data export jobs with their status, type, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by export type: user, session, event (optional)',
            },
          },
        },
      },
      {
        name: 'get_export',
        description: 'Get the status and download URL for a specific data export job by export ID',
        inputSchema: {
          type: 'object',
          properties: {
            export_id: {
              type: 'string',
              description: 'FullStory data export job ID',
            },
          },
          required: ['export_id'],
        },
      },
      {
        name: 'create_export',
        description: 'Create a new data export job for users, sessions, or events within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Export type: user, session, event',
            },
            start: {
              type: 'string',
              description: 'Start of export date range in ISO 8601 format (e.g. 2026-03-01T00:00:00Z)',
            },
            end: {
              type: 'string',
              description: 'End of export date range in ISO 8601 format (e.g. 2026-03-24T23:59:59Z)',
            },
            segment_id: {
              type: 'string',
              description: 'Optional segment ID to scope the export to a specific user or session segment',
            },
          },
          required: ['type', 'start', 'end'],
        },
      },
      {
        name: 'get_data_export_bundles',
        description: 'Retrieve the list of available data export bundle files for download from a completed export job',
        inputSchema: {
          type: 'object',
          properties: {
            export_id: {
              type: 'string',
              description: 'Completed FullStory data export job ID',
            },
          },
          required: ['export_id'],
        },
      },
      {
        name: 'upsert_users_batch',
        description: 'Create or update up to 50,000 user profiles in a single batch import operation',
        inputSchema: {
          type: 'object',
          properties: {
            requests: {
              type: 'array',
              description: 'Array of user upsert objects, each with uid, display_name, email, and properties',
            },
          },
          required: ['requests'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_user':
          return this.getUser(args);
        case 'upsert_user':
          return this.upsertUser(args);
        case 'delete_user':
          return this.deleteUser(args);
        case 'list_sessions':
          return this.listSessions(args);
        case 'get_session_summary':
          return this.getSessionSummary(args);
        case 'create_event':
          return this.createEvent(args);
        case 'create_events_batch':
          return this.createEventsBatch(args);
        case 'list_segments':
          return this.listSegments(args);
        case 'get_segment':
          return this.getSegment(args);
        case 'list_exports':
          return this.listExports(args);
        case 'get_export':
          return this.getExport(args);
        case 'create_export':
          return this.createExport(args);
        case 'get_data_export_bundles':
          return this.getDataExportBundles(args);
        case 'upsert_users_batch':
          return this.upsertUsersBatch(args);
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

  private get authHeader(): string {
    // FullStory auth: "Basic {YOUR_API_KEY}" — raw API key passed directly, NOT base64 encoded.
    // See: https://developer.fullstory.com/server/authentication/
    return `Basic ${this.apiKey}`;
  }


  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: 'accepted' }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.uid && !args.device_id) {
      return { content: [{ type: 'text', text: 'uid or device_id is required' }], isError: true };
    }
    const param = args.uid
      ? `uid=${encodeURIComponent(args.uid as string)}`
      : `device_id=${encodeURIComponent(args.device_id as string)}`;
    return this.apiGet(`/v2/users?${param}`);
  }

  private async upsertUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.uid) {
      return { content: [{ type: 'text', text: 'uid is required' }], isError: true };
    }
    const body: Record<string, unknown> = { uid: args.uid };
    if (args.display_name) body.display_name = args.display_name;
    if (args.email) body.email = args.email;
    if (args.properties) body.properties = args.properties;
    return this.apiPost('/v2/users', body);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.uid) {
      return { content: [{ type: 'text', text: 'uid is required' }], isError: true };
    }
    return this.apiDelete(`/v2/users?uid=${encodeURIComponent(args.uid as string)}`);
  }

  private async listSessions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.uid && !args.email) {
      return { content: [{ type: 'text', text: 'uid or email is required' }], isError: true };
    }
    // Correct path is /sessions/v2 (NOT /v2/sessions). See: https://developer.fullstory.com/anywhere/activation/ai-session-summary-api/
    const params = new URLSearchParams();
    if (args.uid) params.set('uid', args.uid as string);
    if (args.email) params.set('email', encodeURIComponent(args.email as string));
    if (args.limit) params.set('limit', String(args.limit));
    return this.apiGet(`/sessions/v2?${params.toString()}`);
  }

  private async getSessionSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) {
      return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/sessions/${encodeURIComponent(args.session_id as string)}/summary`);
  }

  private async createEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user || !args.events) {
      return { content: [{ type: 'text', text: 'user and events are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      user: args.user,
      events: args.events,
    };
    if (args.session) body.session = args.session;
    if (args.context) body.context = args.context;
    return this.apiPost('/v2/events', body);
  }

  private async createEventsBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.requests) {
      return { content: [{ type: 'text', text: 'requests array is required' }], isError: true };
    }
    return this.apiPost('/v2/events/batch', { requests: args.requests });
  }

  private async listSegments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.type) params.set('type', args.type as string);
    const qs = params.toString();
    return this.apiGet(`/v2/segments${qs ? '?' + qs : ''}`);
  }

  private async getSegment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.segment_id) {
      return { content: [{ type: 'text', text: 'segment_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/segments/${encodeURIComponent(args.segment_id as string)}`);
  }

  private async listExports(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.type) params.set('type', args.type as string);
    const qs = params.toString();
    return this.apiGet(`/v2/exports${qs ? '?' + qs : ''}`);
  }

  private async getExport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.export_id) {
      return { content: [{ type: 'text', text: 'export_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/exports/${encodeURIComponent(args.export_id as string)}`);
  }

  private async createExport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.type || !args.start || !args.end) {
      return { content: [{ type: 'text', text: 'type, start, and end are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      type: args.type,
      time_range: { start: args.start, end: args.end },
    };
    if (args.segment_id) body.segment_id = args.segment_id;
    return this.apiPost('/v2/exports', body);
  }

  private async getDataExportBundles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.export_id) {
      return { content: [{ type: 'text', text: 'export_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/exports/${encodeURIComponent(args.export_id as string)}/bundles`);
  }

  private async upsertUsersBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.requests) {
      return { content: [{ type: 'text', text: 'requests array is required' }], isError: true };
    }
    return this.apiPost('/v2/users/batch', { requests: args.requests });
  }
}
