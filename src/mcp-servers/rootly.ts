/**
 * Rootly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/Rootly-AI-Labs/Rootly-MCP-server — transport: streamable-HTTP, SSE, stdio, auth: API token
// Vendor MCP covers: 101 tools (16 custom + 85 OpenAPI-generated, full API surface). Our adapter covers: 18 tools.
// MCP actively maintained — last commit 2026-03-21, Apache-2.0.
// Also available as hosted endpoint and Cloudflare Worker. Documented at https://docs.rootly.com/integrations/mcp-server
// Recommendation: use-vendor-mcp — Vendor MCP exposes 101 tools vs our 18; strict superset of REST API.
// NOTE: Vendor MCP (https://github.com/Rootly-AI-Labs/Rootly-MCP-server) exposes 101 tools — superset of REST API.
// Prefer vendor MCP. This adapter retained for air-gapped deployments.
//
// Base URL: https://api.rootly.com
// Auth: Bearer token — generate in Rootly Settings → API Tokens
// Docs: https://docs.rootly.com/api-reference
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RootlyConfig {
  apiToken: string;
  /** Override base URL if needed (default: https://api.rootly.com) */
  baseUrl?: string;
}

export class RootlyMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: RootlyConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.rootly.com';
  }

  static catalog() {
    return {
      name: 'rootly',
      displayName: 'Rootly',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: ['rootly', 'incident', 'alert', 'sre', 'retrospective', 'postmortem', 'on-call', 'severity', 'workflow', 'service', 'environment'],
      toolNames: [
        'list_incidents', 'get_incident', 'create_incident', 'update_incident', 'resolve_incident',
        'add_incident_event',
        'list_retrospectives', 'get_retrospective',
        'list_teams', 'list_services', 'list_environments', 'list_severities',
        'list_alerts', 'list_workflows',
        'list_functionalities', 'list_incident_types',
        'list_schedules', 'list_on_calls',
      ],
      description: 'Incident management: create, update, resolve incidents; manage retrospectives, alerts, teams, services, severities, environments, and on-call schedules.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Incidents ────────────────────────────────────────────────────────────
      {
        name: 'list_incidents',
        description: 'List Rootly incidents with optional filters for status, severity, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: started, mitigated, resolved',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity slug (e.g. critical, high, medium, low)',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of incidents per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve full details of a single Rootly incident by its ID including timeline, teams, and services',
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
        description: 'Declare a new incident in Rootly with title, severity, summary, and optional team and service assignments',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the incident',
            },
            severity: {
              type: 'string',
              description: 'Severity slug (e.g. critical, high, medium, low)',
            },
            summary: {
              type: 'string',
              description: 'Brief summary of the incident',
            },
            team_ids: {
              type: 'array',
              description: 'Array of team IDs to assign to the incident',
              items: { type: 'string' },
            },
            service_ids: {
              type: 'array',
              description: 'Array of service IDs affected by the incident',
              items: { type: 'string' },
            },
            environment_ids: {
              type: 'array',
              description: 'Array of environment IDs affected by the incident',
              items: { type: 'string' },
            },
            labels: {
              type: 'array',
              description: 'Array of label strings to attach',
              items: { type: 'string' },
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_incident',
        description: 'Update an existing Rootly incident: change title, severity, summary, or status',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident to update',
            },
            title: {
              type: 'string',
              description: 'Updated title',
            },
            severity: {
              type: 'string',
              description: 'Updated severity slug',
            },
            summary: {
              type: 'string',
              description: 'Updated summary',
            },
            status: {
              type: 'string',
              description: 'Updated status: started, mitigated, resolved',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'resolve_incident',
        description: 'Mark a Rootly incident as resolved with an optional resolution summary',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident to resolve',
            },
            summary: {
              type: 'string',
              description: 'Optional resolution summary or post-mortem notes',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'add_incident_event',
        description: 'Add a timeline event or note to a Rootly incident for real-time communication during response',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The unique ID of the incident',
            },
            message: {
              type: 'string',
              description: 'Text content of the timeline event',
            },
          },
          required: ['incident_id', 'message'],
        },
      },
      // ── Retrospectives ───────────────────────────────────────────────────────
      {
        name: 'list_retrospectives',
        description: 'List retrospective reports for resolved Rootly incidents with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'Filter retrospectives by incident ID',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of retrospectives per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_retrospective',
        description: 'Retrieve a single Rootly retrospective report by its ID including action items and lessons learned',
        inputSchema: {
          type: 'object',
          properties: {
            retrospective_id: {
              type: 'string',
              description: 'The unique ID of the retrospective',
            },
          },
          required: ['retrospective_id'],
        },
      },
      // ── Teams ────────────────────────────────────────────────────────────────
      {
        name: 'list_teams',
        description: 'List all teams configured in Rootly with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of teams per page (default: 25)',
            },
          },
        },
      },
      // ── Services ─────────────────────────────────────────────────────────────
      {
        name: 'list_services',
        description: 'List all services registered in Rootly (used for incident impact mapping)',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of services per page (default: 25)',
            },
          },
        },
      },
      // ── Environments ─────────────────────────────────────────────────────────
      {
        name: 'list_environments',
        description: 'List all environments configured in Rootly (e.g. production, staging, development)',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of environments per page (default: 25)',
            },
          },
        },
      },
      // ── Severities ───────────────────────────────────────────────────────────
      {
        name: 'list_severities',
        description: 'List all severity levels configured in Rootly with their slugs and descriptions',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of severities per page (default: 25)',
            },
          },
        },
      },
      // ── Alerts ───────────────────────────────────────────────────────────────
      {
        name: 'list_alerts',
        description: 'List incident alerts in Rootly with optional filter by incident ID',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'Filter alerts by incident ID',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of alerts per page (default: 25)',
            },
          },
        },
      },
      // ── Workflows ────────────────────────────────────────────────────────────
      {
        name: 'list_workflows',
        description: 'List automation workflows configured in Rootly that trigger on incident lifecycle events',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of workflows per page (default: 25)',
            },
          },
        },
      },
      // ── Functionalities ──────────────────────────────────────────────────────
      {
        name: 'list_functionalities',
        description: 'List Rootly functionalities — sub-components of services used for fine-grained incident impact tracking',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of functionalities per page (default: 25)',
            },
          },
        },
      },
      // ── Incident Types ───────────────────────────────────────────────────────
      {
        name: 'list_incident_types',
        description: 'List incident type classifications configured in Rootly (e.g. security, infrastructure, data)',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of incident types per page (default: 25)',
            },
          },
        },
      },
      // ── Schedules ────────────────────────────────────────────────────────────
      {
        name: 'list_schedules',
        description: 'List on-call schedules configured in Rootly with rotation details and team assignments',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of schedules per page (default: 25)',
            },
          },
        },
      },
      // ── On-Call ──────────────────────────────────────────────────────────────
      {
        name: 'list_on_calls',
        description: 'List current on-call assignments in Rootly showing who is on-call per schedule right now',
        inputSchema: {
          type: 'object',
          properties: {
            schedule_id: {
              type: 'string',
              description: 'Filter on-call assignments by schedule ID',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of on-call entries per page (default: 25)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_incidents':       return this.listIncidents(args);
        case 'get_incident':         return this.getIncident(args);
        case 'create_incident':      return this.createIncident(args);
        case 'update_incident':      return this.updateIncident(args);
        case 'resolve_incident':     return this.resolveIncident(args);
        case 'add_incident_event':   return this.addIncidentEvent(args);
        case 'list_retrospectives':  return this.listRetrospectives(args);
        case 'get_retrospective':    return this.getRetrospective(args);
        case 'list_teams':           return this.listCollection('teams', args);
        case 'list_services':        return this.listCollection('services', args);
        case 'list_environments':    return this.listCollection('environments', args);
        case 'list_severities':      return this.listCollection('severities', args);
        case 'list_alerts':          return this.listAlerts(args);
        case 'list_workflows':       return this.listCollection('workflows', args);
        case 'list_functionalities': return this.listCollection('functionalities', args);
        case 'list_incident_types':  return this.listCollection('incident_types', args);
        case 'list_schedules':       return this.listCollection('schedules', args);
        case 'list_on_calls':        return this.listOnCalls(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    };
  }

  private buildPageParams(args: Record<string, unknown>): URLSearchParams {
    const p = new URLSearchParams();
    if (args.page_number !== undefined) p.set('page[number]', String(args.page_number));
    if (args.page_size !== undefined) p.set('page[size]', String(args.page_size));
    return p;
  }

  private async fetchJson(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    if (!response.ok) {
      let detail: unknown;
      try { detail = await response.json(); } catch { detail = await response.text(); }
      return {
        content: [{ type: 'text', text: `Rootly API error ${response.status} ${response.statusText}: ${JSON.stringify(detail)}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listCollection(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    const qs = p.toString();
    return this.fetchJson(`${this.baseUrl}/v1/${resource}${qs ? '?' + qs : ''}`);
  }

  private async listIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    if (args.status) p.set('filter[status]', args.status as string);
    if (args.severity) p.set('filter[severity]', args.severity as string);
    const qs = p.toString();
    return this.fetchJson(`${this.baseUrl}/v1/incidents${qs ? '?' + qs : ''}`);
  }

  private async getIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.incident_id as string;
    if (!id) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/v1/incidents/${encodeURIComponent(id)}`);
  }

  private async createIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args.title as string;
    if (!title) return { content: [{ type: 'text', text: 'title is required' }], isError: true };

    const attributes: Record<string, unknown> = { title };
    if (args.severity) attributes.severity_slug = args.severity;
    if (args.summary) attributes.summary = args.summary;
    if (args.labels) attributes.labels = args.labels;

    const relationships: Record<string, unknown> = {};
    if (args.team_ids) {
      relationships.teams = { data: (args.team_ids as string[]).map(id => ({ type: 'teams', id })) };
    }
    if (args.service_ids) {
      relationships.services = { data: (args.service_ids as string[]).map(id => ({ type: 'services', id })) };
    }
    if (args.environment_ids) {
      relationships.environments = { data: (args.environment_ids as string[]).map(id => ({ type: 'environments', id })) };
    }

    const body: Record<string, unknown> = {
      data: {
        type: 'incidents',
        attributes,
        ...(Object.keys(relationships).length > 0 ? { relationships } : {}),
      },
    };

    return this.fetchJson(`${this.baseUrl}/v1/incidents`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.incident_id as string;
    if (!id) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };

    const attributes: Record<string, unknown> = {};
    if (args.title) attributes.title = args.title;
    if (args.severity) attributes.severity_slug = args.severity;
    if (args.summary) attributes.summary = args.summary;
    if (args.status) attributes.status = args.status;

    const body = { data: { type: 'incidents', id, attributes } };
    return this.fetchJson(`${this.baseUrl}/v1/incidents/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  private async resolveIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.incident_id as string;
    if (!id) return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };

    const attributes: Record<string, unknown> = { status: 'resolved' };
    if (args.summary) attributes.summary = args.summary;

    const body = { data: { type: 'incidents', id, attributes } };
    return this.fetchJson(`${this.baseUrl}/v1/incidents/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  private async addIncidentEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const incident_id = args.incident_id as string;
    const message = args.message as string;
    if (!incident_id || !message) {
      return { content: [{ type: 'text', text: 'incident_id and message are required' }], isError: true };
    }
    const body = { data: { type: 'incident_events', attributes: { message } } };
    return this.fetchJson(`${this.baseUrl}/v1/incidents/${encodeURIComponent(incident_id)}/incident_events`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async listRetrospectives(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    if (args.incident_id) p.set('filter[incident_id]', args.incident_id as string);
    const qs = p.toString();
    return this.fetchJson(`${this.baseUrl}/v1/retrospectives${qs ? '?' + qs : ''}`);
  }

  private async getRetrospective(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.retrospective_id as string;
    if (!id) return { content: [{ type: 'text', text: 'retrospective_id is required' }], isError: true };
    return this.fetchJson(`${this.baseUrl}/v1/retrospectives/${encodeURIComponent(id)}`);
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    if (args.incident_id) p.set('filter[incident_id]', args.incident_id as string);
    const qs = p.toString();
    return this.fetchJson(`${this.baseUrl}/v1/alerts${qs ? '?' + qs : ''}`);
  }

  private async listOnCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    if (args.schedule_id) p.set('filter[schedule_id]', args.schedule_id as string);
    const qs = p.toString();
    return this.fetchJson(`${this.baseUrl}/v1/on_calls${qs ? '?' + qs : ''}`);
  }
}
