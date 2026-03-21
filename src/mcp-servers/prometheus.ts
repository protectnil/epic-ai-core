/**
 * Prometheus MCP Server
 * Prometheus HTTP API adapter for metrics querying and target inspection
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface PrometheusConfig {
  host: string;
  bearerToken?: string;
}

export class PrometheusMCPServer {
  private config: PrometheusConfig;
  private baseUrl: string;

  constructor(config: PrometheusConfig) {
    this.config = config;
    this.baseUrl = `http://${config.host}:9090/api/v1`;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.bearerToken) {
      h['Authorization'] = `Bearer ${this.config.bearerToken}`;
    }
    return h;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query',
        description: 'Execute an instant PromQL query at a single point in time',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'PromQL expression to evaluate',
            },
            time: {
              type: 'string',
              description: 'Evaluation timestamp (Unix timestamp or RFC3339, defaults to now)',
            },
            timeout: {
              type: 'string',
              description: 'Evaluation timeout (e.g. 30s)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'query_range',
        description: 'Execute a PromQL query over a time range and return a matrix result',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'PromQL expression to evaluate',
            },
            start: {
              type: 'string',
              description: 'Start of range (Unix timestamp or RFC3339)',
            },
            end: {
              type: 'string',
              description: 'End of range (Unix timestamp or RFC3339)',
            },
            step: {
              type: 'string',
              description: 'Query resolution step width (e.g. 15s, 1m)',
            },
            timeout: {
              type: 'string',
              description: 'Evaluation timeout (e.g. 30s)',
            },
          },
          required: ['query', 'start', 'end', 'step'],
        },
      },
      {
        name: 'list_label_names',
        description: 'Return the list of label names present in the TSDB',
        inputSchema: {
          type: 'object',
          properties: {
            match: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional series selectors to restrict the set of series searched',
            },
            start: {
              type: 'string',
              description: 'Start of time range (Unix timestamp or RFC3339)',
            },
            end: {
              type: 'string',
              description: 'End of time range (Unix timestamp or RFC3339)',
            },
          },
          required: [],
        },
      },
      {
        name: 'list_label_values',
        description: 'Return the list of values for a specific label name',
        inputSchema: {
          type: 'object',
          properties: {
            labelName: {
              type: 'string',
              description: 'The label name whose values to retrieve',
            },
            match: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional series selectors to restrict the set of series searched',
            },
            start: {
              type: 'string',
              description: 'Start of time range',
            },
            end: {
              type: 'string',
              description: 'End of time range',
            },
          },
          required: ['labelName'],
        },
      },
      {
        name: 'list_targets',
        description: 'Return current state of all Prometheus scrape targets',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              enum: ['active', 'dropped', 'any'],
              description: 'Filter targets by state (active, dropped, or any)',
            },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query': {
          const params = new URLSearchParams();
          params.set('query', String(args.query));
          if (args.time) params.set('time', String(args.time));
          if (args.timeout) params.set('timeout', String(args.timeout));
          const response = await fetch(`${this.baseUrl}/query?${params}`, {
            headers: this.headers(),
          });
          const data = await response.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'query_range': {
          const params = new URLSearchParams();
          params.set('query', String(args.query));
          params.set('start', String(args.start));
          params.set('end', String(args.end));
          params.set('step', String(args.step));
          if (args.timeout) params.set('timeout', String(args.timeout));
          const response = await fetch(`${this.baseUrl}/query_range?${params}`, {
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

        case 'list_label_names': {
          const params = new URLSearchParams();
          if (Array.isArray(args.match)) {
            (args.match as string[]).forEach((m) => params.append('match[]', m));
          }
          if (args.start) params.set('start', String(args.start));
          if (args.end) params.set('end', String(args.end));
          const response = await fetch(`${this.baseUrl}/labels?${params}`, {
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

        case 'list_label_values': {
          const params = new URLSearchParams();
          if (Array.isArray(args.match)) {
            (args.match as string[]).forEach((m) => params.append('match[]', m));
          }
          if (args.start) params.set('start', String(args.start));
          if (args.end) params.set('end', String(args.end));
          const response = await fetch(
            `${this.baseUrl}/label/${encodeURIComponent(String(args.labelName))}/values?${params}`,
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

        case 'list_targets': {
          const params = new URLSearchParams();
          if (args.state) params.set('state', String(args.state));
          const response = await fetch(`${this.baseUrl}/targets?${params}`, {
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
