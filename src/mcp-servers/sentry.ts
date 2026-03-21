/**
 * Sentry MCP Server
 * Sentry API v0 — issues, events, projects, and resolution.
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

export class SentryMCPServer {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: {
    token: string;
  }) {
    this.baseUrl = 'https://sentry.io/api/0';
    this.headers = {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_issues',
        description: 'List issues for a Sentry project',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'Organization slug',
            },
            project_slug: {
              type: 'string',
              description: 'Project slug',
            },
            query: {
              type: 'string',
              description: 'Sentry issue search query (e.g., "is:unresolved assigned:me")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['organization_slug', 'project_slug'],
        },
      },
      {
        name: 'get_issue',
        description: 'Get full details for a specific Sentry issue',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: {
              type: 'string',
              description: 'The Sentry issue ID',
            },
          },
          required: ['issue_id'],
        },
      },
      {
        name: 'list_events',
        description: 'List events (occurrences) for a specific Sentry issue',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: {
              type: 'string',
              description: 'The Sentry issue ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['issue_id'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects in a Sentry organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_slug: {
              type: 'string',
              description: 'Organization slug',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['organization_slug'],
        },
      },
      {
        name: 'resolve_issue',
        description: 'Mark a Sentry issue as resolved',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: {
              type: 'string',
              description: 'The Sentry issue ID to resolve',
            },
          },
          required: ['issue_id'],
        },
      },
    ];
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_issues':
          return await this.listIssues(
            args.organization_slug as string,
            args.project_slug as string,
            args.query as string | undefined,
            args.limit as number | undefined,
            args.cursor as string | undefined
          );
        case 'get_issue':
          return await this.getIssue(args.issue_id as string);
        case 'list_events':
          return await this.listEvents(
            args.issue_id as string,
            args.limit as number | undefined,
            args.cursor as string | undefined
          );
        case 'list_projects':
          return await this.listProjects(
            args.organization_slug as string,
            args.cursor as string | undefined
          );
        case 'resolve_issue':
          return await this.resolveIssue(args.issue_id as string);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async listIssues(
    organizationSlug: string,
    projectSlug: string,
    query?: string,
    limit?: number,
    cursor?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    params.append('limit', String(limit || 25));
    if (cursor) params.append('cursor', cursor);

    const response = await fetch(
      `${this.baseUrl}/projects/${organizationSlug}/${projectSlug}/issues/?${params}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Sentry returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getIssue(issueId: string): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/issues/${issueId}/`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Sentry returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listEvents(
    issueId: string,
    limit?: number,
    cursor?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('limit', String(limit || 25));
    if (cursor) params.append('cursor', cursor);

    const response = await fetch(
      `${this.baseUrl}/issues/${issueId}/events/?${params}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Sentry returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listProjects(
    organizationSlug: string,
    cursor?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);

    const response = await fetch(
      `${this.baseUrl}/organizations/${organizationSlug}/projects/?${params}`,
      { method: 'GET', headers: this.headers }
    );

    if (!response.ok) {
      throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Sentry returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async resolveIssue(issueId: string): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/issues/${issueId}/`,
      {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({ status: 'resolved' }),
      }
    );

    if (!response.ok) {
      throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Sentry returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
