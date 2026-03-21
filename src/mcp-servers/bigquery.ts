/** BigQuery MCP Server
 * Google BigQuery analytics and data warehouse operations
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface BigQueryConfig {
  token: string;
  projectId: string;
}

export class BigQueryMCPServer {
  private config: BigQueryConfig;
  private baseUrl: string;

  constructor(config: BigQueryConfig) {
    this.config = config;
    this.baseUrl = 'https://bigquery.googleapis.com/bigquery/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query',
        description: 'Run a synchronous BigQuery SQL query',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'SQL query string' },
            projectId: { type: 'string', description: 'Project ID override' },
            useLegacySql: { type: 'boolean', description: 'Use legacy SQL dialect (default false)' },
            maxResults: { type: 'number', description: 'Maximum number of rows to return' },
            timeoutMs: { type: 'number', description: 'Query timeout in milliseconds' },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_datasets',
        description: 'List all datasets in a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID override' },
            filter: { type: 'string', description: 'Filter expression for datasets' },
            maxResults: { type: 'number', description: 'Maximum number of datasets to return' },
          },
        },
      },
      {
        name: 'list_tables',
        description: 'List tables within a dataset',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID' },
            projectId: { type: 'string', description: 'Project ID override' },
            maxResults: { type: 'number', description: 'Maximum number of tables to return' },
          },
          required: ['datasetId'],
        },
      },
      {
        name: 'get_table',
        description: 'Get metadata and schema for a specific table',
        inputSchema: {
          type: 'object',
          properties: {
            datasetId: { type: 'string', description: 'Dataset ID' },
            tableId: { type: 'string', description: 'Table ID' },
            projectId: { type: 'string', description: 'Project ID override' },
          },
          required: ['datasetId', 'tableId'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List recent query jobs in a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID override' },
            stateFilter: { type: 'string', description: 'Filter by job state: done, pending, running' },
            maxResults: { type: 'number', description: 'Maximum number of jobs to return' },
            allUsers: { type: 'boolean', description: 'Include jobs from all users' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = String(args.projectId ?? this.config.projectId);
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
    };

    try {
      let url: string;
      let method: string;
      let body: unknown;

      switch (name) {
        case 'query': {
          url = `${this.baseUrl}/projects/${projectId}/queries`;
          method = 'POST';
          body = {
            query: args.query,
            useLegacySql: args.useLegacySql ?? false,
            maxResults: args.maxResults ?? 1000,
            timeoutMs: args.timeoutMs ?? 30000,
          };
          break;
        }
        case 'list_datasets': {
          const params = new URLSearchParams();
          if (args.filter) params.set('filter', String(args.filter));
          if (args.maxResults) params.set('maxResults', String(args.maxResults));
          url = `${this.baseUrl}/projects/${projectId}/datasets?${params}`;
          method = 'GET';
          break;
        }
        case 'list_tables': {
          const params = new URLSearchParams();
          if (args.maxResults) params.set('maxResults', String(args.maxResults));
          url = `${this.baseUrl}/projects/${projectId}/datasets/${args.datasetId}/tables?${params}`;
          method = 'GET';
          break;
        }
        case 'get_table': {
          url = `${this.baseUrl}/projects/${projectId}/datasets/${args.datasetId}/tables/${args.tableId}`;
          method = 'GET';
          break;
        }
        case 'list_jobs': {
          const params = new URLSearchParams();
          if (args.stateFilter) params.set('stateFilter', String(args.stateFilter));
          if (args.maxResults) params.set('maxResults', String(args.maxResults));
          if (args.allUsers) params.set('allUsers', 'true');
          url = `${this.baseUrl}/projects/${projectId}/jobs?${params}`;
          method = 'GET';
          break;
        }
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }

      const response = await fetch(url!, {
        method: method!,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = { status: response.status, statusText: response.statusText };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        isError: !response.ok,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
