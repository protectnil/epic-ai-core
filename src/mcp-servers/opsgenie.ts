/**
 * Opsgenie MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Atlassian-published Opsgenie MCP server exists.
// Community implementations found (NOT official, NOT endorsed):
//   - https://github.com/giantswarm/mcp-opsgenie — transport: stdio/SSE/streamable-HTTP; ~6 tools (alerts, teams); not published by Atlassian
//   - https://github.com/burakdirin/mcp-opsgenie — npm: mcp-opsgenie; community only
// Neither qualifies as an official MCP server. Decision: use-rest-api.
// Note: Atlassian ended new Opsgenie sales on 2025-06-04; end-of-support is 2027-04-05.
// Customers may migrate to Jira Service Management (see jira-service-management.ts).
// Our adapter covers: 25 tools (alerts, incidents, schedules, teams, users, escalations, heartbeats, services).
// Recommendation: Use this adapter. No official MCP exists. Community MCP servers have far fewer tools.
//
// Base URL: https://api.opsgenie.com (EU: https://api.eu.opsgenie.com)
// Auth: GenieKey API key — Authorization: GenieKey {apiKey}
// Docs: https://docs.opsgenie.com/docs/api-overview
// Rate limits: Not publicly documented; contact Atlassian support for current limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpsgenieConfig {
  apiKey: string;
  /** Override for EU instance: https://api.eu.opsgenie.com */
  baseUrl?: string;
}

export class OpsgenieMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpsgenieConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.opsgenie.com';
  }

  static catalog() {
    return {
      name: 'opsgenie',
      displayName: 'Opsgenie',
      version: '1.0.0',
      category: 'observability',
      keywords: ['opsgenie', 'atlassian', 'alert', 'incident', 'on-call', 'schedule', 'escalation', 'heartbeat', 'team', 'paging'],
      toolNames: [
        'list_alerts', 'get_alert', 'create_alert', 'acknowledge_alert', 'close_alert',
        'add_alert_note', 'snooze_alert', 'assign_alert',
        'list_incidents', 'get_incident', 'create_incident', 'close_incident',
        'list_schedules', 'get_schedule', 'get_on_call',
        'list_teams', 'get_team',
        'list_users', 'get_user',
        'list_escalations', 'get_escalation',
        'list_heartbeats', 'ping_heartbeat',
        'list_services',
      ],
      description: 'Opsgenie alert and incident management: create, acknowledge, close, and annotate alerts; manage on-call schedules, teams, users, escalations, heartbeats, and services.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List Opsgenie alerts with optional query filter, sort field, and pagination offset',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter alerts, e.g. "status: open AND priority: P1"',
            },
            offset: {
              type: 'number',
              description: 'Pagination start index (default: 0; max offset+limit ≤ 20000)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20, max: 100)',
            },
            sort: {
              type: 'string',
              description: 'Sort field: createdAt, updatedAt, tinyId, alias, message, status, acknowledged, isSeen, snoozed, count, lastOccurredAt, source, owner, priority',
            },
            order: {
              type: 'string',
              description: 'Sort order: asc or desc (default: desc)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get full details of a specific Opsgenie alert by its ID, tiny ID, or alias',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Alert ID, tiny ID (numeric), or alias string',
            },
            identifierType: {
              type: 'string',
              description: 'Identifier type: id, tiny, or alias (default: id)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'create_alert',
        description: 'Create a new Opsgenie alert with message, priority, tags, and optional responders',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Alert message/title (required, max 130 characters)',
            },
            alias: {
              type: 'string',
              description: 'Client-defined unique identifier for deduplication (max 512 characters)',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the alert (max 15000 characters)',
            },
            priority: {
              type: 'string',
              description: 'Alert priority: P1, P2, P3, P4, P5 (default: P3)',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings to attach to the alert',
            },
            entity: {
              type: 'string',
              description: 'Domain/entity of the alert, e.g. server name or application',
            },
            source: {
              type: 'string',
              description: 'Origin of the alert (default: API)',
            },
            note: {
              type: 'string',
              description: 'Additional note to attach at creation time',
            },
          },
          required: ['message'],
        },
      },
      {
        name: 'acknowledge_alert',
        description: 'Acknowledge an Opsgenie alert to signal it is being worked on (async, returns HTTP 202)',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Alert ID, tiny ID, or alias',
            },
            identifierType: {
              type: 'string',
              description: 'Identifier type: id, tiny, or alias (default: id)',
            },
            note: {
              type: 'string',
              description: 'Optional note to attach when acknowledging',
            },
            source: {
              type: 'string',
              description: 'Source of the acknowledge action',
            },
            user: {
              type: 'string',
              description: 'Display name of the user acknowledging the alert',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'close_alert',
        description: 'Close an Opsgenie alert to mark it as resolved (async, returns HTTP 202)',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Alert ID, tiny ID, or alias',
            },
            identifierType: {
              type: 'string',
              description: 'Identifier type: id, tiny, or alias (default: id)',
            },
            note: {
              type: 'string',
              description: 'Optional note to attach when closing',
            },
            source: {
              type: 'string',
              description: 'Source of the close action',
            },
            user: {
              type: 'string',
              description: 'Display name of the user closing the alert',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'add_alert_note',
        description: 'Add a text note to an existing Opsgenie alert for context or communication',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Alert ID, tiny ID, or alias',
            },
            identifierType: {
              type: 'string',
              description: 'Identifier type: id, tiny, or alias (default: id)',
            },
            note: {
              type: 'string',
              description: 'Note text to add to the alert (max 25000 characters)',
            },
            source: {
              type: 'string',
              description: 'Source of the note',
            },
            user: {
              type: 'string',
              description: 'Display name of the user adding the note',
            },
          },
          required: ['identifier', 'note'],
        },
      },
      {
        name: 'snooze_alert',
        description: 'Snooze an Opsgenie alert until a specified end time to suppress notifications temporarily',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Alert ID, tiny ID, or alias',
            },
            identifierType: {
              type: 'string',
              description: 'Identifier type: id, tiny, or alias (default: id)',
            },
            endTime: {
              type: 'string',
              description: 'ISO 8601 datetime string for when the snooze ends, e.g. 2026-03-25T09:00:00Z',
            },
            note: {
              type: 'string',
              description: 'Optional note to attach when snoozing',
            },
            user: {
              type: 'string',
              description: 'Display name of the user snoozing the alert',
            },
          },
          required: ['identifier', 'endTime'],
        },
      },
      {
        name: 'assign_alert',
        description: 'Assign an Opsgenie alert to a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Alert ID, tiny ID, or alias',
            },
            identifierType: {
              type: 'string',
              description: 'Identifier type: id, tiny, or alias (default: id)',
            },
            ownerUsername: {
              type: 'string',
              description: 'Username or email of the user to assign the alert to',
            },
            note: {
              type: 'string',
              description: 'Optional note to attach when assigning',
            },
            user: {
              type: 'string',
              description: 'Display name of the user performing the assignment',
            },
          },
          required: ['identifier', 'ownerUsername'],
        },
      },
      {
        name: 'list_incidents',
        description: 'List Opsgenie incidents with optional query filter and pagination (Standard/Enterprise plans only)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query, e.g. "status: open"',
            },
            offset: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20, max: 100)',
            },
            sort: {
              type: 'string',
              description: 'Sort field: createdAt, updatedAt, or tinyId',
            },
            order: {
              type: 'string',
              description: 'Sort order: asc or desc (default: desc)',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Get full details of a specific Opsgenie incident by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Incident ID or tiny ID',
            },
            identifierType: {
              type: 'string',
              description: 'Identifier type: id or tiny (default: id)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'create_incident',
        description: 'Create a new Opsgenie incident with message, priority, and optional tags',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Incident message/title (required)',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the incident',
            },
            priority: {
              type: 'string',
              description: 'Incident priority: P1, P2, P3, P4, P5 (default: P3)',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings to attach to the incident',
            },
          },
          required: ['message'],
        },
      },
      {
        name: 'close_incident',
        description: 'Close an Opsgenie incident to mark it as resolved',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Incident ID or tiny ID',
            },
            identifierType: {
              type: 'string',
              description: 'Identifier type: id or tiny (default: id)',
            },
            note: {
              type: 'string',
              description: 'Optional note to attach when closing',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'list_schedules',
        description: 'List all on-call schedules in Opsgenie with optional rotation expansion',
        inputSchema: {
          type: 'object',
          properties: {
            expand: {
              type: 'string',
              description: 'Comma-separated list of fields to expand: rotation',
            },
          },
        },
      },
      {
        name: 'get_schedule',
        description: 'Get full details of a specific Opsgenie on-call schedule including rotations',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Schedule name or ID',
            },
            identifierType: {
              type: 'string',
              description: 'Identifier type: id or name (default: id)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_on_call',
        description: 'Get the current on-call participants for a specific Opsgenie schedule',
        inputSchema: {
          type: 'object',
          properties: {
            scheduleIdentifier: {
              type: 'string',
              description: 'Schedule name or ID',
            },
            scheduleIdentifierType: {
              type: 'string',
              description: 'Identifier type: id or name (default: id)',
            },
            flat: {
              type: 'boolean',
              description: 'When true, return a flat list of participants instead of grouped by rotation',
            },
          },
          required: ['scheduleIdentifier'],
        },
      },
      {
        name: 'list_teams',
        description: 'List all teams in the Opsgenie account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_team',
        description: 'Get details of a specific Opsgenie team including members and routing rules',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Team name or team ID',
            },
            identifierType: {
              type: 'string',
              description: 'Identifier type: id or name (default: id)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'list_users',
        description: 'List users in the Opsgenie account with optional search query and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term to filter users by name or email',
            },
            offset: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20, max: 100)',
            },
            sort: {
              type: 'string',
              description: 'Sort field: username, fullName, or insertedAt',
            },
            order: {
              type: 'string',
              description: 'Sort order: asc or desc (default: asc)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details of a specific Opsgenie user by their username or user ID',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'User ID or username (email address)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'list_escalations',
        description: 'List all escalation policies defined in the Opsgenie account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_escalation',
        description: 'Get details of a specific Opsgenie escalation policy by name or ID',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Escalation policy name or ID',
            },
            identifierType: {
              type: 'string',
              description: 'Identifier type: id or name (default: id)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'list_heartbeats',
        description: 'List all heartbeat monitors configured in the Opsgenie account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'ping_heartbeat',
        description: 'Send a heartbeat ping for a named Opsgenie heartbeat monitor to signal it is alive',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the heartbeat monitor to ping',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_services',
        description: 'List services in the Opsgenie account (Standard/Enterprise plans only)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term to filter services by name',
            },
            offset: {
              type: 'number',
              description: 'Pagination start index (default: 0)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20, max: 100)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_alerts':
          return await this.listAlerts(args);
        case 'get_alert':
          return await this.getAlert(args);
        case 'create_alert':
          return await this.createAlert(args);
        case 'acknowledge_alert':
          return await this.acknowledgeAlert(args);
        case 'close_alert':
          return await this.closeAlert(args);
        case 'add_alert_note':
          return await this.addAlertNote(args);
        case 'snooze_alert':
          return await this.snoozeAlert(args);
        case 'assign_alert':
          return await this.assignAlert(args);
        case 'list_incidents':
          return await this.listIncidents(args);
        case 'get_incident':
          return await this.getIncident(args);
        case 'create_incident':
          return await this.createIncident(args);
        case 'close_incident':
          return await this.closeIncident(args);
        case 'list_schedules':
          return await this.listSchedules(args);
        case 'get_schedule':
          return await this.getSchedule(args);
        case 'get_on_call':
          return await this.getOnCall(args);
        case 'list_teams':
          return await this.listTeams();
        case 'get_team':
          return await this.getTeam(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'list_escalations':
          return await this.listEscalations();
        case 'get_escalation':
          return await this.getEscalation(args);
        case 'list_heartbeats':
          return await this.listHeartbeats();
        case 'ping_heartbeat':
          return await this.pingHeartbeat(args);
        case 'list_services':
          return await this.listServices(args);
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

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `GenieKey ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private qs(params: URLSearchParams): string {
    const s = params.toString();
    return s ? '?' + s : '';
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', String(args.query));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.sort) params.set('sort', String(args.sort));
    if (args.order) params.set('order', String(args.order));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/alerts${this.qs(params)}`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.identifierType) params.set('identifierType', String(args.identifierType));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/alerts/${encodeURIComponent(String(args.identifier))}${this.qs(params)}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async createAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { message: args.message };
    if (args.alias) body.alias = args.alias;
    if (args.description) body.description = args.description;
    if (args.priority) body.priority = args.priority;
    if (args.tags) body.tags = args.tags;
    if (args.entity) body.entity = args.entity;
    if (args.source) body.source = args.source;
    if (args.note) body.note = args.note;
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/alerts`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async acknowledgeAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.identifierType) params.set('identifierType', String(args.identifierType));
    const body: Record<string, unknown> = {};
    if (args.note) body.note = args.note;
    if (args.source) body.source = args.source;
    if (args.user) body.user = args.user;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/alerts/${encodeURIComponent(String(args.identifier))}/acknowledge${this.qs(params)}`,
      { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body) }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async closeAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.identifierType) params.set('identifierType', String(args.identifierType));
    const body: Record<string, unknown> = {};
    if (args.note) body.note = args.note;
    if (args.source) body.source = args.source;
    if (args.user) body.user = args.user;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/alerts/${encodeURIComponent(String(args.identifier))}/close${this.qs(params)}`,
      { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body) }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async addAlertNote(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.identifierType) params.set('identifierType', String(args.identifierType));
    const body: Record<string, unknown> = { note: args.note };
    if (args.source) body.source = args.source;
    if (args.user) body.user = args.user;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/alerts/${encodeURIComponent(String(args.identifier))}/notes${this.qs(params)}`,
      { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body) }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async snoozeAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.identifierType) params.set('identifierType', String(args.identifierType));
    const body: Record<string, unknown> = { endTime: args.endTime };
    if (args.note) body.note = args.note;
    if (args.user) body.user = args.user;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/alerts/${encodeURIComponent(String(args.identifier))}/snooze${this.qs(params)}`,
      { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body) }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async assignAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.identifierType) params.set('identifierType', String(args.identifierType));
    const body: Record<string, unknown> = {
      owner: { username: args.ownerUsername },
    };
    if (args.note) body.note = args.note;
    if (args.user) body.user = args.user;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/alerts/${encodeURIComponent(String(args.identifier))}/assign${this.qs(params)}`,
      { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body) }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', String(args.query));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.sort) params.set('sort', String(args.sort));
    if (args.order) params.set('order', String(args.order));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/incidents${this.qs(params)}`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.identifierType) params.set('identifierType', String(args.identifierType));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/incidents/${encodeURIComponent(String(args.identifier))}${this.qs(params)}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async createIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { message: args.message };
    if (args.description) body.description = args.description;
    if (args.priority) body.priority = args.priority;
    if (args.tags) body.tags = args.tags;
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/incidents/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async closeIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.identifierType) params.set('identifierType', String(args.identifierType));
    const body: Record<string, unknown> = {};
    if (args.note) body.note = args.note;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/incidents/${encodeURIComponent(String(args.identifier))}/close${this.qs(params)}`,
      { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body) }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listSchedules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.expand) params.set('expand', String(args.expand));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/schedules${this.qs(params)}`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.identifierType) params.set('identifierType', String(args.identifierType));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/schedules/${encodeURIComponent(String(args.identifier))}${this.qs(params)}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getOnCall(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.scheduleIdentifierType) params.set('scheduleIdentifierType', String(args.scheduleIdentifierType));
    if (typeof args.flat === 'boolean') params.set('flat', String(args.flat));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/schedules/${encodeURIComponent(String(args.scheduleIdentifier))}/on-calls${this.qs(params)}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listTeams(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/teams`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getTeam(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.identifierType) params.set('identifierType', String(args.identifierType));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/teams/${encodeURIComponent(String(args.identifier))}${this.qs(params)}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', String(args.query));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.sort) params.set('sort', String(args.sort));
    if (args.order) params.set('order', String(args.order));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/users${this.qs(params)}`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/users/${encodeURIComponent(String(args.identifier))}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listEscalations(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/escalations`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async getEscalation(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.identifierType) params.set('identifierType', String(args.identifierType));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/escalations/${encodeURIComponent(String(args.identifier))}${this.qs(params)}`,
      { headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listHeartbeats(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/heartbeats`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async pingHeartbeat(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/heartbeats/${encodeURIComponent(String(args.name))}/ping`,
      { method: 'GET', headers: this.getHeaders() }
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', String(args.query));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/services${this.qs(params)}`, { headers: this.getHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(await response.json()) }], isError: false };
  }
}
