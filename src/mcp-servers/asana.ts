/**
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

export class AsanaMCPServer {
  private baseUrl = 'https://app.asana.com/api/1.0';

  constructor(private config: { access_token: string }) {}

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_tasks',
        description: 'List tasks in an Asana project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'The project GID' },
            limit: { type: 'number', description: 'Maximum number of results', default: 20 },
            offset: { type: 'string', description: 'Pagination offset token' },
            completed_since: { type: 'string', description: 'ISO 8601 date to filter completed tasks' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_task',
        description: 'Create a new Asana task',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace GID' },
            project_id: { type: 'string', description: 'Project GID to add the task to' },
            name: { type: 'string', description: 'Task name' },
            notes: { type: 'string', description: 'Task description' },
            assignee: { type: 'string', description: 'Assignee GID or email' },
            due_on: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
          },
          required: ['workspace_id', 'name'],
        },
      },
      {
        name: 'get_task',
        description: 'Get a specific Asana task by GID',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'The task GID' },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'list_projects',
        description: 'List Asana projects in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'The workspace GID' },
            limit: { type: 'number', description: 'Maximum number of results', default: 20 },
            offset: { type: 'string', description: 'Pagination offset token' },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'search_tasks',
        description: 'Search for Asana tasks in a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'The workspace GID' },
            text: { type: 'string', description: 'Free-text search query' },
            assignee: { type: 'string', description: 'Filter by assignee GID' },
            projects: { type: 'array', items: { type: 'string' }, description: 'Filter by project GIDs' },
            completed: { type: 'boolean', description: 'Filter by completion status' },
            limit: { type: 'number', description: 'Maximum number of results', default: 20 },
          },
          required: ['workspace_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      let url: string;
      let method = 'GET';
      let body: unknown;

      const headers = {
        Authorization: `Bearer ${this.config.access_token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_tasks': {
          const params = new URLSearchParams({ project: String(args.project_id), limit: String(args.limit ?? 20) });
          if (args.offset) params.set('offset', String(args.offset));
          if (args.completed_since) params.set('completed_since', String(args.completed_since));
          url = `${this.baseUrl}/tasks?${params}`;
          break;
        }
        case 'create_task': {
          url = `${this.baseUrl}/tasks`;
          method = 'POST';
          body = {
            data: {
              workspace: args.workspace_id,
              name: args.name,
              ...(args.project_id ? { projects: [args.project_id] } : {}),
              ...(args.notes ? { notes: args.notes } : {}),
              ...(args.assignee ? { assignee: args.assignee } : {}),
              ...(args.due_on ? { due_on: args.due_on } : {}),
            },
          };
          break;
        }
        case 'get_task': {
          url = `${this.baseUrl}/tasks/${args.task_id}`;
          break;
        }
        case 'list_projects': {
          const params = new URLSearchParams({ workspace: String(args.workspace_id), limit: String(args.limit ?? 20) });
          if (args.offset) params.set('offset', String(args.offset));
          url = `${this.baseUrl}/projects?${params}`;
          break;
        }
        case 'search_tasks': {
          const params = new URLSearchParams({ 'workspace.gid': String(args.workspace_id), limit: String(args.limit ?? 20) });
          if (args.text) params.set('text', String(args.text));
          if (args.assignee) params.set('assignee.any', String(args.assignee));
          if (args.completed !== undefined) params.set('completed', String(args.completed));
          if (args.projects && Array.isArray(args.projects)) {
            params.set('projects.any', (args.projects as string[]).join(','));
          }
          url = `${this.baseUrl}/workspaces/${args.workspace_id}/tasks/search?${params}`;
          break;
        }
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }

      const response = await fetch(url, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
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
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  }
}
