/**
 * FireHydrant MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/firehydrant/firehydrant-mcp — transport: stdio, auth: API token
// Published by FireHydrant, last updated Feb 24, 2026. Documents 4+ tools (incidents-list-incidents,
// incidents-create-incident, alerts-list-alerts, retrospectives). Full tool list not publicly enumerated
// in README; MCP wraps the full TypeScript SDK (350+ API operations).
// Our adapter covers: 18 tools. Vendor MCP covers: breadth of SDK (exact count unconfirmed, likely 20+).
// Recommendation: use-vendor-mcp for full coverage. Use this adapter for air-gapped deployments.
//
// Base URL: https://api.firehydrant.io/v1
// Auth: Bearer token — bot token or user API key via Authorization: Bearer {token}
// Docs: https://docs.firehydrant.com/reference/firehydrant-api
// Rate limits: Not publicly documented per-endpoint

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FireHydrantConfig {
  /** FireHydrant bot token or user API key */
  apiKey: string;
  /** Override base URL (default: https://api.firehydrant.io/v1) */
  baseUrl?: string;
}

export class FireHydrantMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: FireHydrantConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.firehydrant.io/v1').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'firehydrant',
      displayName: 'FireHydrant',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: [
        'firehydrant', 'incident', 'incident management', 'runbook', 'retrospective',
        'postmortem', 'on-call', 'escalation', 'signal', 'alert', 'change event',
        'service catalog', 'reliability', 'sre', 'status page', 'mttr',
      ],
      toolNames: [
        'list_incidents', 'get_incident', 'create_incident', 'update_incident', 'resolve_incident',
        'add_incident_note', 'list_runbooks', 'get_runbook', 'list_services', 'list_environments',
        'list_teams', 'list_change_events', 'create_change_event', 'list_retrospectives',
        'get_retrospective', 'list_on_call_schedules', 'list_signals_alerts', 'get_signals_alert',
      ],
      description: 'FireHydrant incident management: create and manage incidents, run runbooks, track change events, conduct retrospectives, manage on-call schedules, and handle Signals alerts.',
      author: 'protectnil' as const,
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_incidents',
        description: 'List FireHydrant incidents with optional filtering by status, query string, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter incidents by name or description',
            },
            status: {
              type: 'string',
              description: 'Filter by status: open, closed, or all (default: open)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of incidents per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve full details of a specific FireHydrant incident including timeline, milestones, and impacts',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'create_incident',
        description: 'Create a new incident in FireHydrant with name, severity, summary, and optional impacted services',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name/title of the incident',
            },
            summary: {
              type: 'string',
              description: 'Brief summary of what is happening',
            },
            severity: {
              type: 'string',
              description: 'Severity slug (e.g. SEV1, SEV2, SEV3) — must match a severity configured in your account',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the incident',
            },
            impacts: {
              type: 'array',
              description: 'Array of impact objects specifying affected services or environments, each with id and type fields',
              items: { type: 'object', properties: {} },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_incident',
        description: 'Update an existing FireHydrant incident — change name, summary, severity, or description',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident to update',
            },
            name: {
              type: 'string',
              description: 'Updated incident name',
            },
            summary: {
              type: 'string',
              description: 'Updated summary',
            },
            severity: {
              type: 'string',
              description: 'Updated severity slug',
            },
            description: {
              type: 'string',
              description: 'Updated description',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'resolve_incident',
        description: 'Resolve (close) a FireHydrant incident, marking it as remediated',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident to resolve',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'add_incident_note',
        description: 'Add a timeline note to a FireHydrant incident for documentation or status updates',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident',
            },
            body: {
              type: 'string',
              description: 'Text content of the note (supports Markdown)',
            },
          },
          required: ['incident_id', 'body'],
        },
      },
      {
        name: 'list_runbooks',
        description: 'List runbooks configured in FireHydrant with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter runbooks by name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of runbooks per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_runbook',
        description: 'Retrieve full details and steps of a specific FireHydrant runbook by ID',
        inputSchema: {
          type: 'object',
          properties: {
            runbook_id: {
              type: 'string',
              description: 'The unique ID of the runbook',
            },
          },
          required: ['runbook_id'],
        },
      },
      {
        name: 'list_services',
        description: 'List services in the FireHydrant service catalog with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter services by name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of services per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'list_environments',
        description: 'List environments registered in FireHydrant with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter environments by name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of environments per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'list_teams',
        description: 'List teams configured in FireHydrant with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter teams by name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of teams per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'list_change_events',
        description: 'List change events in FireHydrant — deployments, configuration changes, and other infrastructure changes',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter change events by summary',
            },
            start_time: {
              type: 'string',
              description: 'Filter change events after this ISO 8601 timestamp',
            },
            end_time: {
              type: 'string',
              description: 'Filter change events before this ISO 8601 timestamp',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of change events per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'create_change_event',
        description: 'Create a change event in FireHydrant to record a deployment, config change, or other infrastructure event',
        inputSchema: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'Brief description of the change (e.g. "Deployed v2.3.1 to production")',
            },
            description: {
              type: 'string',
              description: 'Detailed description of what changed',
            },
            starts_at: {
              type: 'string',
              description: 'ISO 8601 timestamp when the change started (default: now)',
            },
            ends_at: {
              type: 'string',
              description: 'ISO 8601 timestamp when the change ended',
            },
            service_ids: {
              type: 'array',
              description: 'Array of service IDs affected by this change',
              items: { type: 'string' },
            },
          },
          required: ['summary'],
        },
      },
      {
        name: 'list_retrospectives',
        description: 'List retrospectives (postmortems) in FireHydrant with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by retrospective status: draft, in_progress, completed',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of retrospectives per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_retrospective',
        description: 'Retrieve the full retrospective report for a specific FireHydrant incident including questions and action items',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The incident ID whose retrospective to retrieve',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'list_on_call_schedules',
        description: 'List on-call schedules for a specific FireHydrant team — returns rotations and current on-call members',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'string',
              description: 'Team ID whose on-call schedules to list (required)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of schedules per page (default: 20)',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'list_signals_alerts',
        description: 'List Signals alerts in FireHydrant with optional status and severity filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by alert status: open, acknowledged, resolved',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of alerts per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_signals_alert',
        description: 'Retrieve full details of a specific FireHydrant Signals alert by ID',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'The unique ID of the Signals alert',
            },
          },
          required: ['alert_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const h = this.headers;

      switch (name) {
        case 'list_incidents':
          return this.listIncidents(args, h);
        case 'get_incident':
          return this.getIncident(args, h);
        case 'create_incident':
          return this.createIncident(args, h);
        case 'update_incident':
          return this.updateIncident(args, h);
        case 'resolve_incident':
          return this.resolveIncident(args, h);
        case 'add_incident_note':
          return this.addIncidentNote(args, h);
        case 'list_runbooks':
          return this.listRunbooks(args, h);
        case 'get_runbook':
          return this.getRunbook(args, h);
        case 'list_services':
          return this.listServices(args, h);
        case 'list_environments':
          return this.listEnvironments(args, h);
        case 'list_teams':
          return this.listTeams(args, h);
        case 'list_change_events':
          return this.listChangeEvents(args, h);
        case 'create_change_event':
          return this.createChangeEvent(args, h);
        case 'list_retrospectives':
          return this.listRetrospectives(args, h);
        case 'get_retrospective':
          return this.getRetrospective(args, h);
        case 'list_on_call_schedules':
          return this.listOnCallSchedules(args, h);
        case 'list_signals_alerts':
          return this.listSignalsAlerts(args, h);
        case 'get_signals_alert':
          return this.getSignalsAlert(args, h);
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

  private buildQs(params: URLSearchParams): string {
    const s = params.toString();
    return s ? `?${s}` : '';
  }

  private async get(path: string, h: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, { method: 'GET', headers: h });
  }

  private async post(path: string, body: unknown, h: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  }

  private async patch(path: string, body: unknown, h: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, { method: 'PATCH', headers: h, body: JSON.stringify(body) });
  }

  private async put(path: string, body: unknown, h: Record<string, string>): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, { method: 'PUT', headers: h, body: JSON.stringify(body) });
  }

  private ok(response: Response, label: string): ToolResult | null {
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `${label}: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    return null;
  }

  private async json(response: Response): Promise<ToolResult> {
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listIncidents(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    if (args.status) params.set('status', args.status as string);
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

    const response = await this.get(`/incidents${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list incidents');
    if (err) return err;
    return this.json(response);
  }

  private async getIncident(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };

    const response = await this.get(`/incidents/${encodeURIComponent(incidentId)}`, h);
    const err = this.ok(response, 'Failed to get incident');
    if (err) return err;
    return this.json(response);
  }

  private async createIncident(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };

    const body: Record<string, unknown> = { name };
    if (args.summary) body.summary = args.summary;
    if (args.severity) body.severity = args.severity;
    if (args.description) body.description = args.description;
    if (args.impacts) body.impacts = args.impacts;

    const response = await this.post('/incidents', body, h);
    const err = this.ok(response, 'Failed to create incident');
    if (err) return err;
    return this.json(response);
  }

  private async updateIncident(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };

    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.summary) body.summary = args.summary;
    if (args.severity) body.severity = args.severity;
    if (args.description) body.description = args.description;

    const response = await this.patch(`/incidents/${encodeURIComponent(incidentId)}`, body, h);
    const err = this.ok(response, 'Failed to update incident');
    if (err) return err;
    return this.json(response);
  }

  private async resolveIncident(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };

    const response = await this.put(`/incidents/${encodeURIComponent(incidentId)}/resolve`, {}, h);
    const err = this.ok(response, 'Failed to resolve incident');
    if (err) return err;
    return this.json(response);
  }

  private async addIncidentNote(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    const body_text = args.body as string;
    if (!incidentId || !body_text) return { content: [{ type: 'text', text: 'incident_id and body are required' }], isError: true };

    const response = await this.post(`/incidents/${encodeURIComponent(incidentId)}/notes`, { body: body_text }, h);
    const err = this.ok(response, 'Failed to add note');
    if (err) return err;
    return this.json(response);
  }

  private async listRunbooks(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

    const response = await this.get(`/runbooks${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list runbooks');
    if (err) return err;
    return this.json(response);
  }

  private async getRunbook(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const runbookId = args.runbook_id as string;
    if (!runbookId) return { content: [{ type: 'text', text: 'runbook_id is required' }], isError: true };

    const response = await this.get(`/runbooks/${encodeURIComponent(runbookId)}`, h);
    const err = this.ok(response, 'Failed to get runbook');
    if (err) return err;
    return this.json(response);
  }

  private async listServices(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

    const response = await this.get(`/services${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list services');
    if (err) return err;
    return this.json(response);
  }

  private async listEnvironments(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

    const response = await this.get(`/environments${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list environments');
    if (err) return err;
    return this.json(response);
  }

  private async listTeams(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

    const response = await this.get(`/teams${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list teams');
    if (err) return err;
    return this.json(response);
  }

  private async listChangeEvents(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    if (args.start_time) params.set('start_time', args.start_time as string);
    if (args.end_time) params.set('end_time', args.end_time as string);
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

    const response = await this.get(`/changes/events${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list change events');
    if (err) return err;
    return this.json(response);
  }

  private async createChangeEvent(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const summary = args.summary as string;
    if (!summary) return { content: [{ type: 'text', text: 'summary is required' }], isError: true };

    const body: Record<string, unknown> = { summary };
    if (args.description) body.description = args.description;
    if (args.starts_at) body.starts_at = args.starts_at;
    if (args.ends_at) body.ends_at = args.ends_at;
    if (args.service_ids) body.service_ids = args.service_ids;

    const response = await this.post('/changes/events', body, h);
    const err = this.ok(response, 'Failed to create change event');
    if (err) return err;
    return this.json(response);
  }

  private async listRetrospectives(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

    const response = await this.get(`/post_mortems/reports${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list retrospectives');
    if (err) return err;
    return this.json(response);
  }

  private async getRetrospective(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };

    const response = await this.get(`/incidents/${encodeURIComponent(incidentId)}/retrospective`, h);
    const err = this.ok(response, 'Failed to get retrospective');
    if (err) return err;
    return this.json(response);
  }

  private async listOnCallSchedules(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const teamId = args.team_id as string;
    if (!teamId) return { content: [{ type: 'text', text: 'team_id is required — FireHydrant on-call schedules are per team' }], isError: true };

    const params = new URLSearchParams();
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

    const response = await this.get(`/teams/${encodeURIComponent(teamId)}/on_call_schedules${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list on-call schedules');
    if (err) return err;
    return this.json(response);
  }

  private async listSignalsAlerts(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));

    const response = await this.get(`/alerts${this.buildQs(params)}`, h);
    const err = this.ok(response, 'Failed to list Signals alerts');
    if (err) return err;
    return this.json(response);
  }

  private async getSignalsAlert(args: Record<string, unknown>, h: Record<string, string>): Promise<ToolResult> {
    const alertId = args.alert_id as string;
    if (!alertId) return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };

    const response = await this.get(`/alerts/${encodeURIComponent(alertId)}`, h);
    const err = this.ok(response, 'Failed to get Signals alert');
    if (err) return err;
    return this.json(response);
  }
}
