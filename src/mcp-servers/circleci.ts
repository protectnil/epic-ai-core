/**
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

export class CircleCIMCPServer {
  private baseUrl = 'https://circleci.com/api/v2';

  constructor(private config: { circle_token: string }) {}

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_pipelines',
        description: 'List pipelines for a project or organization',
        inputSchema: {
          type: 'object',
          properties: {
            project_slug: { type: 'string', description: 'Project slug (e.g. gh/org/repo)' },
            org_slug: { type: 'string', description: 'Organization slug' },
            page_token: { type: 'string', description: 'Pagination token' },
          },
          required: [],
        },
      },
      {
        name: 'get_pipeline',
        description: 'Get details of a specific CircleCI pipeline',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline_id: { type: 'string', description: 'Pipeline ID' },
          },
          required: ['pipeline_id'],
        },
      },
      {
        name: 'list_workflows',
        description: 'List workflows for a pipeline',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline_id: { type: 'string', description: 'Pipeline ID' },
            page_token: { type: 'string', description: 'Pagination token' },
          },
          required: ['pipeline_id'],
        },
      },
      {
        name: 'get_workflow',
        description: 'Get details of a specific CircleCI workflow',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: { type: 'string', description: 'Workflow ID' },
          },
          required: ['workflow_id'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List jobs for a workflow',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_id: { type: 'string', description: 'Workflow ID' },
            page_token: { type: 'string', description: 'Pagination token' },
          },
          required: ['workflow_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      let url: string;

      const headers = {
        'Circle-Token': this.config.circle_token,
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_pipelines': {
          const params = new URLSearchParams();
          if (args.page_token) params.set('page-token', String(args.page_token));
          if (args.org_slug) {
            url = `${this.baseUrl}/pipeline?org-slug=${encodeURIComponent(String(args.org_slug))}&${params}`;
          } else if (args.project_slug) {
            url = `${this.baseUrl}/project/${args.project_slug}/pipeline?${params}`;
          } else {
            url = `${this.baseUrl}/pipeline?${params}`;
          }
          break;
        }
        case 'get_pipeline': {
          url = `${this.baseUrl}/pipeline/${args.pipeline_id}`;
          break;
        }
        case 'list_workflows': {
          const params = new URLSearchParams();
          if (args.page_token) params.set('page-token', String(args.page_token));
          url = `${this.baseUrl}/pipeline/${args.pipeline_id}/workflow?${params}`;
          break;
        }
        case 'get_workflow': {
          url = `${this.baseUrl}/workflow/${args.workflow_id}`;
          break;
        }
        case 'list_jobs': {
          const params = new URLSearchParams();
          if (args.page_token) params.set('page-token', String(args.page_token));
          url = `${this.baseUrl}/workflow/${args.workflow_id}/job?${params}`;
          break;
        }
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }

      const response = await fetch(url, { headers });

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
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  }
}
