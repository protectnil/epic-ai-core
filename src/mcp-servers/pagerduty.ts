/**
 * PagerDuty MCP Server
 * Adapter for PagerDuty REST API v2 — incidents, services, and on-call management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface PagerDutyConfig {
  api_key: string;
}

export class PagerDutyMCPServer {
  private config: PagerDutyConfig;
  private baseUrl = 'https://api.pagerduty.com';

  constructor(config: PagerDutyConfig) {
    this.config = config;
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Token token=${this.config.api_key}`,
      Accept: 'application/vnd.pagerduty+json;version=2',
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_incidents',
        description: 'List PagerDuty incidents with optional filters for status, urgency, and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            statuses: {
              type: 'array',
              items: { type: 'string', enum: ['triggered', 'acknowledged', 'resolved'] },
              description: 'Filter by incident status.',
            },
            urgencies: {
              type: 'array',
              items: { type: 'string', enum: ['high', 'low'] },
              description: 'Filter by urgency.',
            },
            limit: { type: 'number', description: 'Maximum number of results (default 25, max 100).' },
            offset: { type: 'number', description: 'Offset for pagination.' },
            since: { type: 'string', description: 'ISO 8601 start date filter.' },
            until: { type: 'string', description: 'ISO 8601 end date filter.' },
          },
          required: [],
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve a single PagerDuty incident by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'The PagerDuty incident ID.' },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'create_incident',
        description: 'Create a new PagerDuty incident.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short summary of the incident.' },
            service_id: { type: 'string', description: 'The ID of the PagerDuty service to associate.' },
            urgency: { type: 'string', enum: ['high', 'low'], description: 'Incident urgency.' },
            body: { type: 'string', description: 'Detailed description of the incident.' },
            escalation_policy_id: { type: 'string', description: 'Optional escalation policy ID.' },
          },
          required: ['title', 'service_id'],
        },
      },
      {
        name: 'list_services',
        description: 'List PagerDuty services.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Filter services by name.' },
            limit: { type: 'number', description: 'Maximum number of results.' },
            offset: { type: 'number', description: 'Offset for pagination.' },
          },
          required: [],
        },
      },
      {
        name: 'list_oncalls',
        description: 'List current on-call entries, optionally filtered by schedule or escalation policy.',
        inputSchema: {
          type: 'object',
          properties: {
            schedule_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by schedule IDs.',
            },
            escalation_policy_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by escalation policy IDs.',
            },
            since: { type: 'string', description: 'ISO 8601 start of on-call window.' },
            until: { type: 'string', description: 'ISO 8601 end of on-call window.' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_incidents': {
          const params = new URLSearchParams();
          if (args.statuses) (args.statuses as string[]).forEach((s) => params.append('statuses[]', s));
          if (args.urgencies) (args.urgencies as string[]).forEach((u) => params.append('urgencies[]', u));
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset) params.set('offset', String(args.offset));
          if (args.since) params.set('since', args.since as string);
          if (args.until) params.set('until', args.until as string);
          const response = await fetch(`${this.baseUrl}/incidents?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_incident': {
          const response = await fetch(`${this.baseUrl}/incidents/${args.incident_id}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_incident': {
          const body: Record<string, unknown> = {
            incident: {
              type: 'incident',
              title: args.title,
              service: { id: args.service_id, type: 'service_reference' },
              urgency: args.urgency ?? 'high',
              body: args.body ? { type: 'incident_body', details: args.body } : undefined,
              escalation_policy: args.escalation_policy_id
                ? { id: args.escalation_policy_id, type: 'escalation_policy_reference' }
                : undefined,
            },
          };
          const response = await fetch(`${this.baseUrl}/incidents`, {
            method: 'POST',
            headers: this.authHeaders,
            body: JSON.stringify(body),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_services': {
          const params = new URLSearchParams();
          if (args.query) params.set('query', args.query as string);
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset) params.set('offset', String(args.offset));
          const response = await fetch(`${this.baseUrl}/services?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_oncalls': {
          const params = new URLSearchParams();
          if (args.schedule_ids) (args.schedule_ids as string[]).forEach((id) => params.append('schedule_ids[]', id));
          if (args.escalation_policy_ids)
            (args.escalation_policy_ids as string[]).forEach((id) => params.append('escalation_policy_ids[]', id));
          if (args.since) params.set('since', args.since as string);
          if (args.until) params.set('until', args.until as string);
          const response = await fetch(`${this.baseUrl}/oncalls?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
}
