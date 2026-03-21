/**
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

export class JiraMCPServer {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: { instance: string; email: string; api_token: string }) {
    this.baseUrl = `https://${config.instance}.atlassian.net/rest/api/3`;
    this.authHeader = 'Basic ' + Buffer.from(`${config.email}:${config.api_token}`).toString('base64');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_issues',
        description: 'List issues in a Jira project',
        inputSchema: {
          type: 'object',
          properties: {
            project_key: { type: 'string', description: 'The project key' },
            max_results: { type: 'number', description: 'Maximum number of results', default: 50 },
            start_at: { type: 'number', description: 'Starting index', default: 0 },
          },
          required: ['project_key'],
        },
      },
      {
        name: 'get_issue',
        description: 'Get a specific Jira issue by key',
        inputSchema: {
          type: 'object',
          properties: {
            issue_key: { type: 'string', description: 'The issue key (e.g. PROJ-123)' },
          },
          required: ['issue_key'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            project_key: { type: 'string', description: 'The project key' },
            summary: { type: 'string', description: 'Issue summary' },
            issue_type: { type: 'string', description: 'Issue type (e.g. Bug, Task, Story)', default: 'Task' },
            description: { type: 'string', description: 'Issue description' },
            priority: { type: 'string', description: 'Priority (e.g. High, Medium, Low)' },
          },
          required: ['project_key', 'summary', 'issue_type'],
        },
      },
      {
        name: 'search_jql',
        description: 'Search Jira issues using JQL',
        inputSchema: {
          type: 'object',
          properties: {
            jql: { type: 'string', description: 'JQL query string' },
            max_results: { type: 'number', description: 'Maximum number of results', default: 50 },
            start_at: { type: 'number', description: 'Starting index', default: 0 },
            fields: { type: 'array', items: { type: 'string' }, description: 'Fields to return' },
          },
          required: ['jql'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all accessible Jira projects',
        inputSchema: {
          type: 'object',
          properties: {
            max_results: { type: 'number', description: 'Maximum number of results', default: 50 },
            start_at: { type: 'number', description: 'Starting index', default: 0 },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      let url: string;
      let method = 'GET';
      let body: unknown;

      switch (name) {
        case 'list_issues': {
          const params = new URLSearchParams({
            jql: `project = ${args.project_key}`,
            maxResults: String(args.max_results ?? 50),
            startAt: String(args.start_at ?? 0),
          });
          url = `${this.baseUrl}/search?${params}`;
          break;
        }
        case 'get_issue': {
          url = `${this.baseUrl}/issue/${args.issue_key}`;
          break;
        }
        case 'create_issue': {
          url = `${this.baseUrl}/issue`;
          method = 'POST';
          body = {
            fields: {
              project: { key: args.project_key },
              summary: args.summary,
              issuetype: { name: args.issue_type },
              ...(args.description ? { description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: args.description }] }] } } : {}),
              ...(args.priority ? { priority: { name: args.priority } } : {}),
            },
          };
          break;
        }
        case 'search_jql': {
          const params = new URLSearchParams({
            jql: String(args.jql),
            maxResults: String(args.max_results ?? 50),
            startAt: String(args.start_at ?? 0),
          });
          if (args.fields && Array.isArray(args.fields)) {
            params.set('fields', (args.fields as string[]).join(','));
          }
          url = `${this.baseUrl}/search?${params}`;
          break;
        }
        case 'list_projects': {
          const params = new URLSearchParams({
            maxResults: String(args.max_results ?? 50),
            startAt: String(args.start_at ?? 0),
          });
          url = `${this.baseUrl}/project/search?${params}`;
          break;
        }
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
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
