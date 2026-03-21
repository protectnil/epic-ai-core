/**
 * Dynatrace MCP Server
 * Dynatrace Environment API v2 adapter for entity, metric, and problem management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface DynatraceConfig {
  environmentId: string;
  apiToken: string;
}

export class DynatraceMCPServer {
  private config: DynatraceConfig;
  private baseUrl: string;

  constructor(config: DynatraceConfig) {
    this.config = config;
    this.baseUrl = `https://${config.environmentId}.live.dynatrace.com/api/v2`;
  }

  private headers(): Record<string, string> {
    return {
      'Api-Token': this.config.apiToken,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_entities',
        description: 'List monitored entities filtered by type, tag, or management zone',
        inputSchema: {
          type: 'object',
          properties: {
            entitySelector: {
              type: 'string',
              description: 'Dynatrace entity selector expression (e.g. type("HOST"),tag("production"))',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of additional fields to include',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 500)',
            },
          },
          required: ['entitySelector'],
        },
      },
      {
        name: 'get_entity',
        description: 'Retrieve full details for a single monitored entity by its entity ID',
        inputSchema: {
          type: 'object',
          properties: {
            entityId: {
              type: 'string',
              description: 'The entity ID (e.g. HOST-1234567890ABCDEF)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of additional fields to include',
            },
          },
          required: ['entityId'],
        },
      },
      {
        name: 'query_metrics',
        description: 'Query metric data points using a metric selector and resolution',
        inputSchema: {
          type: 'object',
          properties: {
            metricSelector: {
              type: 'string',
              description: 'Metric selector expression (e.g. builtin:host.cpu.usage:avg)',
            },
            from: {
              type: 'string',
              description: 'Start of the query time range (e.g. now-1h, ISO 8601)',
            },
            to: {
              type: 'string',
              description: 'End of the query time range (e.g. now, ISO 8601)',
            },
            resolution: {
              type: 'string',
              description: 'Query resolution (e.g. 1m, 5m, 1h)',
            },
            entitySelector: {
              type: 'string',
              description: 'Scope the metric query to specific entities',
            },
          },
          required: ['metricSelector', 'from'],
        },
      },
      {
        name: 'list_problems',
        description: 'List active or historical problems with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            problemSelector: {
              type: 'string',
              description: 'Problem selector (e.g. status("open"), impactLevel("APPLICATION"))',
            },
            from: {
              type: 'string',
              description: 'Start of time range (e.g. now-24h)',
            },
            to: {
              type: 'string',
              description: 'End of time range',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 50)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_problem',
        description: 'Get full details for a single problem by problem ID',
        inputSchema: {
          type: 'object',
          properties: {
            problemId: {
              type: 'string',
              description: 'The problem ID (e.g. -1234567890123456789)',
            },
          },
          required: ['problemId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_entities': {
          const params = new URLSearchParams();
          if (args.entitySelector) params.set('entitySelector', String(args.entitySelector));
          if (args.fields) params.set('fields', String(args.fields));
          if (args.pageSize) params.set('pageSize', String(args.pageSize));
          const response = await fetch(`${this.baseUrl}/entities?${params}`, {
            headers: this.headers(),
          });
          const data = await response.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_entity': {
          const params = new URLSearchParams();
          if (args.fields) params.set('fields', String(args.fields));
          const response = await fetch(
            `${this.baseUrl}/entities/${encodeURIComponent(String(args.entityId))}?${params}`,
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

        case 'query_metrics': {
          const params = new URLSearchParams();
          params.set('metricSelector', String(args.metricSelector));
          params.set('from', String(args.from));
          if (args.to) params.set('to', String(args.to));
          if (args.resolution) params.set('resolution', String(args.resolution));
          if (args.entitySelector) params.set('entitySelector', String(args.entitySelector));
          const response = await fetch(`${this.baseUrl}/metrics/query?${params}`, {
            headers: this.headers(),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_problems': {
          const params = new URLSearchParams();
          if (args.problemSelector) params.set('problemSelector', String(args.problemSelector));
          if (args.from) params.set('from', String(args.from));
          if (args.to) params.set('to', String(args.to));
          if (args.pageSize) params.set('pageSize', String(args.pageSize));
          const response = await fetch(`${this.baseUrl}/problems?${params}`, {
            headers: this.headers(),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_problem': {
          const response = await fetch(
            `${this.baseUrl}/problems/${encodeURIComponent(String(args.problemId))}`,
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
