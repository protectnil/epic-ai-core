/**
 * Coralogix MCP Server
 * Coralogix API adapter for log querying, alerts, dashboards, and archive search
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface CoralogixConfig {
  apiKey: string;
}

export class CoralogixMCPServer {
  private config: CoralogixConfig;
  private baseUrl: string;

  constructor(config: CoralogixConfig) {
    this.config = config;
    this.baseUrl = 'https://api.coralogix.com';
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_logs',
        description: 'Query logs using Coralogix DataPrime or Lucene syntax with time range and filter options',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'DataPrime or Lucene query expression',
            },
            startDate: {
              type: 'string',
              description: 'Start of time range (ISO 8601 or Unix ms timestamp)',
            },
            endDate: {
              type: 'string',
              description: 'End of time range (ISO 8601 or Unix ms timestamp)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of log entries to return (default 100)',
            },
            applicationName: {
              type: 'string',
              description: 'Filter by application name',
            },
            subsystemName: {
              type: 'string',
              description: 'Filter by subsystem name',
            },
          },
          required: ['query', 'startDate', 'endDate'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List all configured alerts in the Coralogix account',
        inputSchema: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              enum: ['info', 'warning', 'critical'],
              description: 'Filter alerts by severity level',
            },
            isActive: {
              type: 'boolean',
              description: 'Filter by active/inactive status',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_alert',
        description: 'Retrieve the full definition and status of a single alert by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: {
              type: 'string',
              description: 'The unique identifier of the alert',
            },
          },
          required: ['alertId'],
        },
      },
      {
        name: 'list_dashboards',
        description: 'List all custom dashboards in the Coralogix account',
        inputSchema: {
          type: 'object',
          properties: {
            folder: {
              type: 'string',
              description: 'Filter dashboards by folder name',
            },
          },
          required: [],
        },
      },
      {
        name: 'search_archive',
        description: 'Search cold/archive log storage for historical data beyond the hot tier retention window',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Lucene or DataPrime query expression',
            },
            startDate: {
              type: 'string',
              description: 'Start of archive search range (ISO 8601)',
            },
            endDate: {
              type: 'string',
              description: 'End of archive search range (ISO 8601)',
            },
            applicationName: {
              type: 'string',
              description: 'Filter by application name',
            },
            subsystemName: {
              type: 'string',
              description: 'Filter by subsystem name',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
            },
          },
          required: ['query', 'startDate', 'endDate'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query_logs': {
          const body: Record<string, unknown> = {
            query: args.query,
            metadata: {
              startDate: args.startDate,
              endDate: args.endDate,
              ...(args.limit !== undefined ? { limit: args.limit } : {}),
              ...(args.applicationName ? { applicationName: [args.applicationName] } : {}),
              ...(args.subsystemName ? { subsystemName: [args.subsystemName] } : {}),
            },
          };
          const response = await fetch(`${this.baseUrl}/api/v1/dataprime/query`, {
            method: 'POST',
            headers: this.headers(),
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

        case 'list_alerts': {
          const response = await fetch(`${this.baseUrl}/api/v1/external/alerts`, {
            method: 'GET',
            headers: this.headers(),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          const alerts = data as { alerts?: Array<Record<string, unknown>> };
          let results = alerts.alerts ?? [];
          if (args.severity) {
            results = results.filter(
              (a) => String(a['severity']).toLowerCase() === String(args.severity).toLowerCase()
            );
          }
          if (args.isActive !== undefined) {
            results = results.filter((a) => Boolean(a['isActive']) === Boolean(args.isActive));
          }
          return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }], isError: false };
        }

        case 'get_alert': {
          const response = await fetch(
            `${this.baseUrl}/api/v1/external/alerts/${encodeURIComponent(String(args.alertId))}`,
            { headers: this.headers() }
          );
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_dashboards': {
          const response = await fetch(`${this.baseUrl}/api/v1/external/dashboards`, {
            method: 'GET',
            headers: this.headers(),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          const dashboards = data as { dashboards?: Array<Record<string, unknown>> };
          let results = dashboards.dashboards ?? [];
          if (args.folder) {
            results = results.filter(
              (d) => String(d['folder']).toLowerCase() === String(args.folder).toLowerCase()
            );
          }
          return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }], isError: false };
        }

        case 'search_archive': {
          const body: Record<string, unknown> = {
            query: args.query,
            metadata: {
              startDate: args.startDate,
              endDate: args.endDate,
              ...(args.applicationName ? { applicationName: [args.applicationName] } : {}),
              ...(args.subsystemName ? { subsystemName: [args.subsystemName] } : {}),
              ...(args.limit !== undefined ? { limit: args.limit } : {}),
            },
          };
          const response = await fetch(`${this.baseUrl}/api/v1/dataprime/query`, {
            method: 'POST',
            headers: this.headers(),
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

        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
