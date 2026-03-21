/** LangChain API MCP Server
 * LangSmith run, dataset, and project management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface LangChainConfig {
  apiKey: string;
  baseUrl?: string;
}

export class LangChainMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LangChainConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.smith.langchain.com/api/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_runs',
        description: 'List runs in LangSmith',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Filter by project ID' },
            runType: { type: 'string', description: 'Filter by run type (chain, llm, tool)' },
            limit: { type: 'number', description: 'Number of results to return' },
            offset: { type: 'number', description: 'Offset for pagination' },
          },
          required: [],
        },
      },
      {
        name: 'get_run',
        description: 'Get details for a specific run',
        inputSchema: {
          type: 'object',
          properties: {
            runId: { type: 'string', description: 'Run ID' },
          },
          required: ['runId'],
        },
      },
      {
        name: 'list_datasets',
        description: 'List datasets in LangSmith',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of results to return' },
            offset: { type: 'number', description: 'Offset for pagination' },
          },
          required: [],
        },
      },
      {
        name: 'list_projects',
        description: 'List projects in LangSmith',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of results to return' },
            offset: { type: 'number', description: 'Offset for pagination' },
          },
          required: [],
        },
      },
      {
        name: 'get_feedback',
        description: 'Get feedback entries for runs',
        inputSchema: {
          type: 'object',
          properties: {
            runIds: { type: 'array', description: 'Filter by run IDs' },
            key: { type: 'string', description: 'Filter by feedback key' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };

    try {
      let response: Response;

      switch (name) {
        case 'list_runs': {
          const params = new URLSearchParams();
          if (args.projectId !== undefined) params.set('session', String(args.projectId));
          if (args.runType !== undefined) params.set('run_type', String(args.runType));
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          response = await fetch(`${this.baseUrl}/runs?${params}`, { headers });
          break;
        }
        case 'get_run': {
          response = await fetch(`${this.baseUrl}/runs/${args.runId}`, { headers });
          break;
        }
        case 'list_datasets': {
          const params = new URLSearchParams();
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          response = await fetch(`${this.baseUrl}/datasets?${params}`, { headers });
          break;
        }
        case 'list_projects': {
          const params = new URLSearchParams();
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          if (args.offset !== undefined) params.set('offset', String(args.offset));
          response = await fetch(`${this.baseUrl}/sessions?${params}`, { headers });
          break;
        }
        case 'get_feedback': {
          const params = new URLSearchParams();
          if (args.runIds !== undefined) {
            (args.runIds as string[]).forEach((id) => params.append('run', id));
          }
          if (args.key !== undefined) params.set('key', String(args.key));
          if (args.limit !== undefined) params.set('limit', String(args.limit));
          response = await fetch(`${this.baseUrl}/feedback?${params}`, { headers });
          break;
        }
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Non-JSON response (HTTP ${response.status})`);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        isError: false,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
