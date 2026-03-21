/**
 * Incident.io MCP Server
 * Adapter for Incident.io API v2 — incident lifecycle and role management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface IncidentIoConfig {
  api_key: string;
}

export class IncidentIoMCPServer {
  private config: IncidentIoConfig;
  private baseUrl = 'https://api.incident.io/v2';

  constructor(config: IncidentIoConfig) {
    this.config = config;
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.api_key}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_incidents',
        description: 'List incidents from Incident.io with optional status and severity filters.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['triage', 'active', 'post_incident', 'learning', 'closed'],
              description: 'Filter by incident status.',
            },
            page_size: { type: 'number', description: 'Number of results per page (max 25).' },
            after: { type: 'string', description: 'Pagination cursor — return results after this incident ID.' },
          },
          required: [],
        },
      },
      {
        name: 'get_incident',
        description: 'Retrieve a single Incident.io incident by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: { type: 'string', description: 'The Incident.io incident ID.' },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'create_incident',
        description: 'Create a new incident in Incident.io.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name / title of the incident.' },
            summary: { type: 'string', description: 'Brief description of the incident.' },
            severity_id: { type: 'string', description: 'ID of the severity level to assign.' },
            mode: {
              type: 'string',
              enum: ['real', 'test', 'tutorial'],
              description: 'Incident mode (default: real).',
            },
            idempotency_key: { type: 'string', description: 'Unique key to prevent duplicate creation.' },
          },
          required: ['name', 'idempotency_key'],
        },
      },
      {
        name: 'list_severities',
        description: 'List all configured severity levels in Incident.io.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'list_incident_roles',
        description: 'List all incident roles defined in Incident.io.',
        inputSchema: {
          type: 'object',
          properties: {},
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
          if (args.status) params.set('status', args.status as string);
          if (args.page_size) params.set('page_size', String(args.page_size));
          if (args.after) params.set('after', args.after as string);
          const response = await fetch(`${this.baseUrl}/incidents?${params}`, { headers: this.authHeaders });
          const data = await response.json();
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
            name: args.name,
            summary: args.summary,
            severity: args.severity_id ? { id: args.severity_id } : undefined,
            mode: args.mode ?? 'real',
            idempotency_key: args.idempotency_key,
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

        case 'list_severities': {
          const response = await fetch(`${this.baseUrl}/severities`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_incident_roles': {
          const response = await fetch(`${this.baseUrl}/incident_roles`, { headers: this.authHeaders });
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
