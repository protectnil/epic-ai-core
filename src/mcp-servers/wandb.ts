/** WandB MCP Server
 * Weights & Biases experiment tracking and artifact management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface WandBConfig {
  apiKey: string;
  baseUrl?: string;
}

export class WandBMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: WandBConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.wandb.ai';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_runs',
        description: 'List runs for a project',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            project: { type: 'string', description: 'Project name' },
            perPage: { type: 'number', description: 'Results per page' },
            page: { type: 'number', description: 'Page number' },
          },
          required: ['entity', 'project'],
        },
      },
      {
        name: 'get_run',
        description: 'Get details for a specific run',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity name' },
            project: { type: 'string', description: 'Project name' },
            runId: { type: 'string', description: 'Run ID' },
          },
          required: ['entity', 'project', 'runId'],
        },
      },
      {
        name: 'list_projects',
        description: 'List projects for an entity',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity (user or team) name' },
            perPage: { type: 'number', description: 'Results per page' },
          },
          required: ['entity'],
        },
      },
      {
        name: 'list_artifacts',
        description: 'List artifacts for a project',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity name' },
            project: { type: 'string', description: 'Project name' },
            type: { type: 'string', description: 'Artifact type filter' },
          },
          required: ['entity', 'project'],
        },
      },
      {
        name: 'get_run_metrics',
        description: 'Get metrics history for a specific run',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { type: 'string', description: 'Entity name' },
            project: { type: 'string', description: 'Project name' },
            runId: { type: 'string', description: 'Run ID' },
            keys: { type: 'array', description: 'Metric keys to retrieve' },
          },
          required: ['entity', 'project', 'runId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      let response: Response;

      switch (name) {
        case 'list_runs': {
          const params = new URLSearchParams();
          if (args.perPage !== undefined) params.set('perPage', String(args.perPage));
          if (args.page !== undefined) params.set('page', String(args.page));
          response = await fetch(
            `${this.baseUrl}/api/v1/runs/${args.entity}/${args.project}?${params}`,
            { headers },
          );
          break;
        }
        case 'get_run': {
          response = await fetch(
            `${this.baseUrl}/api/v1/runs/${args.entity}/${args.project}/${args.runId}`,
            { headers },
          );
          break;
        }
        case 'list_projects': {
          const params = new URLSearchParams();
          if (args.perPage !== undefined) params.set('perPage', String(args.perPage));
          response = await fetch(`${this.baseUrl}/api/v1/projects/${args.entity}?${params}`, { headers });
          break;
        }
        case 'list_artifacts': {
          const params = new URLSearchParams();
          if (args.type !== undefined) params.set('type', String(args.type));
          response = await fetch(
            `${this.baseUrl}/api/v1/artifacts/${args.entity}/${args.project}?${params}`,
            { headers },
          );
          break;
        }
        case 'get_run_metrics': {
          const body: Record<string, unknown> = {
            entity: args.entity,
            project: args.project,
            runId: args.runId,
          };
          if (args.keys !== undefined) body.keys = args.keys;
          response = await fetch(`${this.baseUrl}/api/v1/runs/${args.entity}/${args.project}/${args.runId}/history`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
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
