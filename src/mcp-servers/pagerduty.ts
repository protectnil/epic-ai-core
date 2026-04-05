/**
 * PagerDuty MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/PagerDuty/pagerduty-mcp-server — transport: stdio, auth: API token
// PagerDuty ships an official MCP server (Python, open-source, Apache-2.0). Actively maintained as of
// 2026-03 (commits within the last month). Exposes 30+ tools covering incidents, services, schedules,
// teams, log entries, event orchestrations, incident workflows, and status pages.
// Our adapter covers: 20 tools. Vendor MCP covers: 30+ tools.
// Recommendation: use-both — the vendor MCP has unique tools we don't implement (log entries,
// event orchestrations, incident workflows, status pages). Our adapter has unique tools the MCP
// marks write-only or omits (create_incident via REST, add_incident_note, get_alert by ID,
// list_escalation_policies, get_escalation_policy, list_oncalls). Combined coverage preferred.
// Integration: use-both
// MCP-sourced tools (10+): list_log_entries, get_log_entry, list_incident_workflows,
//   get_incident_workflow, start_incident_workflow, list_status_pages, get_status_page_post,
//   create_status_page_post, list_event_orchestrations (and more)
// REST-sourced tools (20): list_incidents, get_incident, create_incident, acknowledge_incident,
//   resolve_incident, update_incident, add_incident_note, list_incident_notes, list_alerts,
//   get_alert, list_services, get_service, list_escalation_policies, get_escalation_policy,
//   list_schedules, get_schedule, list_oncalls, list_users, get_user, list_teams
//
// Base URL: https://api.pagerduty.com
// Auth: API token — Authorization: Token token={api_key}
//       Accept header must be: application/vnd.pagerduty+json;version=2
// Docs: https://developer.pagerduty.com/api-reference
// Rate limits: 960 requests/min per API token (per PagerDuty documentation)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';
import type { AdapterCatalogEntry } from '../federation/AdapterCatalog.js';

interface PagerDutyConfig {
  apiKey: string;
  baseUrl?: string;
  fromEmail?: string;  // Required by PagerDuty for certain write operations (From: header)
}

export class PagerDutyMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fromEmail: string;

  constructor(config: PagerDutyConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.pagerduty.com';
    this.fromEmail = config.fromEmail || '';
  }

  static catalog(): AdapterCatalogEntry {
    return {
      name: 'pagerduty',
      displayName: 'PagerDuty',
      version: '1.0.0',
      category: 'observability',
      keywords: [
        'pagerduty', 'incident', 'alert', 'on-call', 'oncall', 'escalation',
        'page', 'acknowledge', 'resolve', 'schedule', 'service', 'team',
        'user', 'notification', 'ops', 'sre', 'devops', 'reliability',
      ],
      toolNames: [
        'list_incidents', 'get_incident', 'create_incident',
        'acknowledge_incident', 'resolve_incident', 'update_incident',
        'add_incident_note', 'list_incident_notes',
        'list_alerts', 'get_alert',
        'list_services', 'get_service',
        'list_escalation_policies', 'get_escalation_policy',
        'list_schedules', 'get_schedule',
        'list_oncalls',
        'list_users', 'get_user',
        'list_teams',
      ],
      description: 'Incident management: list, create, acknowledge, and resolve incidents. Query on-call schedules, escalation policies, services, teams, and users.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_incidents',
        description: 'List PagerDuty incidents with optional filters for status, urgency, service, team, and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            statuses: {
              type: 'array',
              description: 'Filter by status array: triggered, acknowledged, resolved (default: triggered + acknowledged)',
            },
            urgencies: {
              type: 'array',
              description: 'Filter by urgency array: high, low',
            },
            service_ids: {
              type: 'array',
              description: 'Filter by array of service IDs',
            },
            team_ids: {
              type: 'array',
              description: 'Filter by array of team IDs',
            },
            user_ids: {
              type: 'array',
              description: 'Filter by array of assigned user IDs',
            },
            since: {
              type: 'string',
              description: 'ISO 8601 start date filter (e.g. 2025-01-01T00:00:00Z)',
            },
            until: {
              type: 'string',
              description: 'ISO 8601 end date filter',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 25, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            sort_by: {
              type: 'string',
              description: 'Sort field: incident_number, created_at, resolved_at, urgency (append :asc or :desc)',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve a single PagerDuty incident by ID with full detail including alerts and notes.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'PagerDuty incident ID (e.g. P123ABC)',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'create_incident',
        description: 'Create a new PagerDuty incident on a service with optional urgency, escalation policy, and body detail.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Short summary of the incident',
            },
            service_id: {
              type: 'string',
              description: 'ID of the PagerDuty service to associate the incident with',
            },
            urgency: {
              type: 'string',
              description: 'Incident urgency: high or low (default: high)',
            },
            body: {
              type: 'string',
              description: 'Detailed description of the incident',
            },
            escalation_policy_id: {
              type: 'string',
              description: 'Escalation policy ID to use instead of the service default',
            },
          },
          required: ['title', 'service_id'],
        },
      },
      {
        name: 'acknowledge_incident',
        description: 'Acknowledge a PagerDuty incident, indicating that responder has seen it and is working on it.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'PagerDuty incident ID to acknowledge',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'resolve_incident',
        description: 'Resolve a PagerDuty incident, marking it as fixed and ending all notifications.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'PagerDuty incident ID to resolve',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'update_incident',
        description: 'Update an existing PagerDuty incident to change status, urgency, title, or reassign it.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'PagerDuty incident ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: acknowledged or resolved',
            },
            urgency: {
              type: 'string',
              description: 'New urgency: high or low',
            },
            title: {
              type: 'string',
              description: 'New incident title',
            },
            escalation_policy_id: {
              type: 'string',
              description: 'New escalation policy ID to reassign the incident',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'add_incident_note',
        description: 'Add a text note to a PagerDuty incident for documentation or communication.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'PagerDuty incident ID',
            },
            content: {
              type: 'string',
              description: 'Text content of the note to add',
            },
          },
          required: ['incident_id', 'content'],
        },
      },
      {
        name: 'list_incident_notes',
        description: 'List all notes added to a PagerDuty incident.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'PagerDuty incident ID',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List all alerts (de-duplicated events) for a specific PagerDuty incident.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'PagerDuty incident ID to list alerts for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 25, max: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'get_alert',
        description: 'Get a single alert by ID from a specific PagerDuty incident.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'PagerDuty incident ID',
            },
            alert_id: {
              type: 'string',
              description: 'PagerDuty alert ID',
            },
          },
          required: ['incident_id', 'alert_id'],
        },
      },
      {
        name: 'list_services',
        description: 'List PagerDuty services with optional name search, team filter, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Filter services by name substring',
            },
            team_ids: {
              type: 'array',
              description: 'Filter by array of team IDs',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of services to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
        },
      },
      {
        name: 'get_service',
        description: 'Get a single PagerDuty service by ID including escalation policy and integration details.',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'PagerDuty service ID',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'list_escalation_policies',
        description: 'List PagerDuty escalation policies with optional name filter and team scope.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Filter escalation policies by name',
            },
            team_ids: {
              type: 'array',
              description: 'Filter by array of team IDs',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
        },
      },
      {
        name: 'get_escalation_policy',
        description: 'Get a single PagerDuty escalation policy by ID including all levels and targets.',
        inputSchema: {
          type: 'object',
          properties: {
            escalation_policy_id: {
              type: 'string',
              description: 'PagerDuty escalation policy ID',
            },
          },
          required: ['escalation_policy_id'],
        },
      },
      {
        name: 'list_schedules',
        description: 'List PagerDuty on-call schedules with optional name search.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Filter schedules by name',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
        },
      },
      {
        name: 'get_schedule',
        description: 'Get a single PagerDuty schedule by ID with rendered on-call timeline for a time window.',
        inputSchema: {
          type: 'object',
          properties: {
            schedule_id: {
              type: 'string',
              description: 'PagerDuty schedule ID',
            },
            since: {
              type: 'string',
              description: 'Start of the rendered time range (ISO 8601, default: now)',
            },
            until: {
              type: 'string',
              description: 'End of the rendered time range (ISO 8601, default: now + 1 week)',
            },
          },
          required: ['schedule_id'],
        },
      },
      {
        name: 'list_oncalls',
        description: 'List current on-call users across all schedules or filtered by schedule or escalation policy.',
        inputSchema: {
          type: 'object',
          properties: {
            schedule_ids: {
              type: 'array',
              description: 'Filter by array of schedule IDs',
            },
            escalation_policy_ids: {
              type: 'array',
              description: 'Filter by array of escalation policy IDs',
            },
            user_ids: {
              type: 'array',
              description: 'Filter by array of user IDs',
            },
            since: {
              type: 'string',
              description: 'ISO 8601 start of on-call window',
            },
            until: {
              type: 'string',
              description: 'ISO 8601 end of on-call window',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List PagerDuty users in the account with optional name/email filter and team scope.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Filter users by name or email',
            },
            team_ids: {
              type: 'array',
              description: 'Filter by array of team IDs',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get a single PagerDuty user by ID including contact methods and notification rules.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'PagerDuty user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_teams',
        description: 'List PagerDuty teams in the account with optional name filter.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Filter teams by name',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_incidents':
          return await this.listIncidents(args);
        case 'get_incident':
          return await this.getIncident(args);
        case 'create_incident':
          return await this.createIncident(args);
        case 'acknowledge_incident':
          return await this.updateIncidentStatus(args.incident_id as string, 'acknowledged');
        case 'resolve_incident':
          return await this.updateIncidentStatus(args.incident_id as string, 'resolved');
        case 'update_incident':
          return await this.updateIncident(args);
        case 'add_incident_note':
          return await this.addIncidentNote(args);
        case 'list_incident_notes':
          return await this.listIncidentNotes(args);
        case 'list_alerts':
          return await this.listAlerts(args);
        case 'get_alert':
          return await this.getAlert(args);
        case 'list_services':
          return await this.listServices(args);
        case 'get_service':
          return await this.getService(args);
        case 'list_escalation_policies':
          return await this.listEscalationPolicies(args);
        case 'get_escalation_policy':
          return await this.getEscalationPolicy(args);
        case 'list_schedules':
          return await this.listSchedules(args);
        case 'get_schedule':
          return await this.getSchedule(args);
        case 'list_oncalls':
          return await this.listOncalls(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'list_teams':
          return await this.listTeams(args);
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

  // ─── Private helpers ──────────────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Token token=${this.apiKey}`,
      Accept: 'application/vnd.pagerduty+json;version=2',
      'Content-Type': 'application/json',
    };
    if (this.fromEmail) headers['From'] = this.fromEmail;
    return headers;
  }

  private async fetchJson(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      ...options,
      headers: { ...this.authHeaders, ...(options.headers as Record<string, string> || {}) },
    });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errBody ? ' — ' + errBody : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private appendArrayParam(params: URLSearchParams, key: string, values: unknown): void {
    if (Array.isArray(values)) {
      for (const v of values) params.append(`${key}[]`, String(v));
    }
  }

  // ─── Tool implementations ─────────────────────────────────────────────────

  private async listIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendArrayParam(params, 'statuses', args.statuses);
    this.appendArrayParam(params, 'urgencies', args.urgencies);
    this.appendArrayParam(params, 'service_ids', args.service_ids);
    this.appendArrayParam(params, 'team_ids', args.team_ids);
    this.appendArrayParam(params, 'user_ids', args.user_ids);
    if (args.since) params.set('since', args.since as string);
    if (args.until) params.set('until', args.until as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    if (args.sort_by) params.set('sort_by', args.sort_by as string);
    return this.fetchJson(`${this.baseUrl}/incidents?${params}`);
  }

  private async getIncident(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/incidents/${encodeURIComponent(args.incident_id as string)}`);
  }

  private async createIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      incident: {
        type: 'incident',
        title: args.title,
        service: { id: args.service_id, type: 'service_reference' },
        urgency: (args.urgency as string) ?? 'high',
        body: args.body ? { type: 'incident_body', details: args.body } : undefined,
        escalation_policy: args.escalation_policy_id
          ? { id: args.escalation_policy_id, type: 'escalation_policy_reference' }
          : undefined,
      },
    };
    return this.fetchJson(`${this.baseUrl}/incidents`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateIncidentStatus(incidentId: string, status: string): Promise<ToolResult> {
    const body = {
      incident: { type: 'incident', status },
    };
    return this.fetchJson(`${this.baseUrl}/incidents/${incidentId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async updateIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const { incident_id, escalation_policy_id, ...rest } = args;
    const update: Record<string, unknown> = { type: 'incident' };
    if (rest.status) update.status = rest.status;
    if (rest.urgency) update.urgency = rest.urgency;
    if (rest.title) update.title = rest.title;
    if (escalation_policy_id) {
      update.escalation_policy = { id: escalation_policy_id, type: 'escalation_policy_reference' };
    }
    return this.fetchJson(`${this.baseUrl}/incidents/${incident_id}`, {
      method: 'PUT',
      body: JSON.stringify({ incident: update }),
    });
  }

  private async addIncidentNote(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/incidents/${encodeURIComponent(args.incident_id as string)}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note: { content: args.content } }),
    });
  }

  private async listIncidentNotes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/incidents/${encodeURIComponent(args.incident_id as string)}/notes`);
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    return this.fetchJson(`${this.baseUrl}/incidents/${encodeURIComponent(args.incident_id as string)}/alerts?${params}`);
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/incidents/${encodeURIComponent(args.incident_id as string)}/alerts/${encodeURIComponent(args.alert_id as string)}`);
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    this.appendArrayParam(params, 'team_ids', args.team_ids);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    return this.fetchJson(`${this.baseUrl}/services?${params}`);
  }

  private async getService(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/services/${encodeURIComponent(args.service_id as string)}?include[]=escalation_policies`);
  }

  private async listEscalationPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    this.appendArrayParam(params, 'team_ids', args.team_ids);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    return this.fetchJson(`${this.baseUrl}/escalation_policies?${params}`);
  }

  private async getEscalationPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/escalation_policies/${encodeURIComponent(args.escalation_policy_id as string)}`);
  }

  private async listSchedules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    return this.fetchJson(`${this.baseUrl}/schedules?${params}`);
  }

  private async getSchedule(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.since) params.set('since', args.since as string);
    if (args.until) params.set('until', args.until as string);
    return this.fetchJson(`${this.baseUrl}/schedules/${encodeURIComponent(args.schedule_id as string)}?${params}`);
  }

  private async listOncalls(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendArrayParam(params, 'schedule_ids', args.schedule_ids);
    this.appendArrayParam(params, 'escalation_policy_ids', args.escalation_policy_ids);
    this.appendArrayParam(params, 'user_ids', args.user_ids);
    if (args.since) params.set('since', args.since as string);
    if (args.until) params.set('until', args.until as string);
    return this.fetchJson(`${this.baseUrl}/oncalls?${params}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    this.appendArrayParam(params, 'team_ids', args.team_ids);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    return this.fetchJson(`${this.baseUrl}/users?${params}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/users/${encodeURIComponent(args.user_id as string)}?include[]=contact_methods&include[]=notification_rules`);
  }

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    return this.fetchJson(`${this.baseUrl}/teams?${params}`);
  }
}
