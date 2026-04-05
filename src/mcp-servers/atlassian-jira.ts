/**
 * Atlassian Jira MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/atlassian/mcp-atlassian — transport: stdio, auth: OAuth2/PAT
//   Covers: Jira + Confluence combined. Actively maintained (2025).
// Our adapter covers: 18 core Jira tools (issues, projects, sprints, comments, transitions, search).
// Recommendation: Use official MCP for full coverage. Use this adapter for air-gapped or specific Jira-only deployments.
//
// Base URL: https://{your-domain}.atlassian.net
// Auth: Basic auth (email:apiToken base64) or OAuth2 Bearer token
// Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
// Rate limits: REST API v3 — 10 requests/second per user, 300 concurrent requests

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AtlassianJiraConfig {
  /** Atlassian account email (for Basic auth) */
  email?: string;
  /** Atlassian API token (for Basic auth) or OAuth2 Bearer token */
  apiToken: string;
  /** Jira Cloud domain, e.g. "mycompany.atlassian.net" */
  domain: string;
  /** Auth type: "basic" (email + apiToken) or "bearer" (OAuth2 token). Default: basic */
  authType?: 'basic' | 'bearer';
}

export class AtlassianJiraMCPServer extends MCPAdapterBase {
  private readonly email: string;
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly authType: 'basic' | 'bearer';

  constructor(config: AtlassianJiraConfig) {
    super();
    this.email = config.email ?? '';
    this.apiToken = config.apiToken;
    this.baseUrl = `https://${config.domain}/rest/api/3`;
    this.authType = config.authType ?? 'basic';
  }

  static catalog() {
    return {
      name: 'atlassian-jira',
      displayName: 'Atlassian Jira',
      version: '1.0.0',
      category: 'productivity',
      keywords: [
        'jira', 'atlassian', 'issue', 'ticket', 'sprint', 'project', 'backlog',
        'agile', 'scrum', 'kanban', 'epic', 'story', 'bug', 'task', 'comment',
        'transition', 'workflow', 'board', 'filter', 'search', 'jql',
      ],
      toolNames: [
        'search_issues', 'get_issue', 'create_issue', 'update_issue', 'delete_issue',
        'list_projects', 'get_project',
        'add_comment', 'get_comments',
        'get_transitions', 'transition_issue',
        'assign_issue',
        'list_fields',
        'get_myself',
        'get_issue_types',
        'list_filters', 'get_filter',
        'get_issue_changelog',
      ],
      description: 'Atlassian Jira issue tracking: search with JQL, create and update issues, manage sprints, add comments, transition workflows, and list projects and fields.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_issues',
        description: 'Search Jira issues using JQL with optional field selection and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            jql: {
              type: 'string',
              description: 'JQL query string (e.g. "project = MYPROJ AND status = Open AND assignee = currentUser()")',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return (e.g. summary,status,assignee,priority). Default: summary,status,assignee,priority,issuetype',
            },
            max_results: {
              type: 'number',
              description: 'Maximum issues to return (default: 50, max: 100)',
            },
            start_at: {
              type: 'number',
              description: 'Index of first result for pagination (default: 0)',
            },
          },
          required: ['jql'],
        },
      },
      {
        name: 'get_issue',
        description: 'Get a single Jira issue by issue key or ID including summary, status, assignee, and comments',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id_or_key: {
              type: 'string',
              description: 'Issue key (e.g. PROJ-123) or numeric ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return (default: all fields)',
            },
          },
          required: ['issue_id_or_key'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new Jira issue with project, issue type, summary, and optional description',
        inputSchema: {
          type: 'object',
          properties: {
            project_key: {
              type: 'string',
              description: 'Project key to create the issue in (e.g. PROJ)',
            },
            issue_type: {
              type: 'string',
              description: 'Issue type name: Bug, Task, Story, Epic, Sub-task (default: Task)',
            },
            summary: {
              type: 'string',
              description: 'Issue summary/title',
            },
            description: {
              type: 'string',
              description: 'Issue description in plain text (will be converted to Atlassian Document Format)',
            },
            assignee_account_id: {
              type: 'string',
              description: 'Atlassian account ID of the assignee',
            },
            priority: {
              type: 'string',
              description: 'Priority name: Highest, High, Medium, Low, Lowest',
            },
            labels: {
              type: 'array',
              description: 'Array of label strings to add to the issue',
            },
          },
          required: ['project_key', 'summary'],
        },
      },
      {
        name: 'update_issue',
        description: 'Update an existing Jira issue fields such as summary, description, priority, or assignee',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id_or_key: {
              type: 'string',
              description: 'Issue key (e.g. PROJ-123) or numeric ID',
            },
            summary: {
              type: 'string',
              description: 'New summary text',
            },
            description: {
              type: 'string',
              description: 'New description in plain text',
            },
            assignee_account_id: {
              type: 'string',
              description: 'New assignee Atlassian account ID',
            },
            priority: {
              type: 'string',
              description: 'New priority: Highest, High, Medium, Low, Lowest',
            },
          },
          required: ['issue_id_or_key'],
        },
      },
      {
        name: 'delete_issue',
        description: 'Delete a Jira issue by issue key or ID (irreversible)',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id_or_key: {
              type: 'string',
              description: 'Issue key (e.g. PROJ-123) or numeric ID to delete',
            },
          },
          required: ['issue_id_or_key'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all Jira projects visible to the authenticated user with optional search',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to filter projects by name or key',
            },
            max_results: {
              type: 'number',
              description: 'Maximum projects to return (default: 50)',
            },
            start_at: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details of a specific Jira project by its key or ID including lead and issue types',
        inputSchema: {
          type: 'object',
          properties: {
            project_id_or_key: {
              type: 'string',
              description: 'Project key (e.g. PROJ) or numeric ID',
            },
          },
          required: ['project_id_or_key'],
        },
      },
      {
        name: 'add_comment',
        description: 'Add a comment to a Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id_or_key: {
              type: 'string',
              description: 'Issue key (e.g. PROJ-123) to comment on',
            },
            body: {
              type: 'string',
              description: 'Comment text in plain text format',
            },
          },
          required: ['issue_id_or_key', 'body'],
        },
      },
      {
        name: 'get_comments',
        description: 'Get all comments on a Jira issue with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id_or_key: {
              type: 'string',
              description: 'Issue key (e.g. PROJ-123)',
            },
            max_results: {
              type: 'number',
              description: 'Maximum comments to return (default: 50)',
            },
            start_at: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['issue_id_or_key'],
        },
      },
      {
        name: 'get_transitions',
        description: 'Get available workflow transitions for a Jira issue (e.g. To Do → In Progress → Done)',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id_or_key: {
              type: 'string',
              description: 'Issue key (e.g. PROJ-123)',
            },
          },
          required: ['issue_id_or_key'],
        },
      },
      {
        name: 'transition_issue',
        description: 'Move a Jira issue through its workflow by applying a transition (e.g. move to In Progress or Done)',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id_or_key: {
              type: 'string',
              description: 'Issue key (e.g. PROJ-123)',
            },
            transition_id: {
              type: 'string',
              description: 'Transition ID from get_transitions (e.g. "21" for In Progress)',
            },
          },
          required: ['issue_id_or_key', 'transition_id'],
        },
      },
      {
        name: 'assign_issue',
        description: 'Assign a Jira issue to a user by their Atlassian account ID',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id_or_key: {
              type: 'string',
              description: 'Issue key (e.g. PROJ-123)',
            },
            account_id: {
              type: 'string',
              description: 'Atlassian account ID of the user to assign. Use null to unassign.',
            },
          },
          required: ['issue_id_or_key'],
        },
      },
      {
        name: 'list_fields',
        description: 'List all Jira fields including custom fields with their IDs and types',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_myself',
        description: 'Get the profile and account details of the currently authenticated Jira user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_issue_types',
        description: 'Get all issue types available in a Jira project or across the account',
        inputSchema: {
          type: 'object',
          properties: {
            project_id_or_key: {
              type: 'string',
              description: 'Optional project key to get issue types for that project only',
            },
          },
        },
      },
      {
        name: 'list_filters',
        description: 'List saved Jira filters accessible to the current user',
        inputSchema: {
          type: 'object',
          properties: {
            my_filters: {
              type: 'boolean',
              description: 'Return only filters owned by the current user (default: false)',
            },
          },
        },
      },
      {
        name: 'get_filter',
        description: 'Get details of a specific Jira saved filter including its JQL query',
        inputSchema: {
          type: 'object',
          properties: {
            filter_id: {
              type: 'string',
              description: 'Filter ID (numeric string)',
            },
          },
          required: ['filter_id'],
        },
      },
      {
        name: 'get_issue_changelog',
        description: 'Get the change history for a Jira issue showing field changes over time',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id_or_key: {
              type: 'string',
              description: 'Issue key (e.g. PROJ-123)',
            },
            max_results: {
              type: 'number',
              description: 'Maximum changelog entries to return (default: 50)',
            },
            start_at: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['issue_id_or_key'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_issues': return this.searchIssues(args);
        case 'get_issue': return this.getIssue(args);
        case 'create_issue': return this.createIssue(args);
        case 'update_issue': return this.updateIssue(args);
        case 'delete_issue': return this.deleteIssue(args);
        case 'list_projects': return this.listProjects(args);
        case 'get_project': return this.getProject(args);
        case 'add_comment': return this.addComment(args);
        case 'get_comments': return this.getComments(args);
        case 'get_transitions': return this.getTransitions(args);
        case 'transition_issue': return this.transitionIssue(args);
        case 'assign_issue': return this.assignIssue(args);
        case 'list_fields': return this.listFields();
        case 'get_myself': return this.getMyself();
        case 'get_issue_types': return this.getIssueTypes(args);
        case 'list_filters': return this.listFilters(args);
        case 'get_filter': return this.getFilter(args);
        case 'get_issue_changelog': return this.getIssueChangelog(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private authHeader(): string {
    if (this.authType === 'bearer') {
      return `Bearer ${this.apiToken}`;
    }
    return `Basic ${Buffer.from(`${this.email}:${this.apiToken}`).toString('base64')}`;
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': this.authHeader(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private buildUrl(path: string, params: Record<string, unknown> = {}): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const q = qs.toString();
    return `${this.baseUrl}${path}${q ? '?' + q : ''}`;
  }

  private async get(path: string, params: Record<string, unknown> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.buildUrl(path, params), { headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { status: 'ok' };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { status: 'ok' };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'deleted' }) }], isError: false };
  }

  private textToADF(text: string): unknown {
    return {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    };
  }

  private async searchIssues(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.jql) return { content: [{ type: 'text', text: 'jql is required' }], isError: true };
    const fields = (args.fields as string) ?? 'summary,status,assignee,priority,issuetype';
    return this.post('/search', {
      jql: args.jql,
      fields: fields.split(',').map((f: string) => f.trim()),
      maxResults: (args.max_results as number) ?? 50,
      startAt: (args.start_at as number) ?? 0,
    });
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id_or_key) return { content: [{ type: 'text', text: 'issue_id_or_key is required' }], isError: true };
    const params: Record<string, unknown> = {};
    if (args.fields) params['fields'] = args.fields;
    return this.get(`/issue/${encodeURIComponent(args.issue_id_or_key as string)}`, params);
  }

  private async createIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_key) return { content: [{ type: 'text', text: 'project_key is required' }], isError: true };
    if (!args.summary) return { content: [{ type: 'text', text: 'summary is required' }], isError: true };
    const fields: Record<string, unknown> = {
      project: { key: args.project_key },
      summary: args.summary,
      issuetype: { name: (args.issue_type as string) ?? 'Task' },
    };
    if (args.description) fields['description'] = this.textToADF(args.description as string);
    if (args.assignee_account_id) fields['assignee'] = { accountId: args.assignee_account_id };
    if (args.priority) fields['priority'] = { name: args.priority };
    if (args.labels) fields['labels'] = args.labels;
    return this.post('/issue', { fields });
  }

  private async updateIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id_or_key) return { content: [{ type: 'text', text: 'issue_id_or_key is required' }], isError: true };
    const fields: Record<string, unknown> = {};
    if (args.summary) fields['summary'] = args.summary;
    if (args.description) fields['description'] = this.textToADF(args.description as string);
    if (args.assignee_account_id) fields['assignee'] = { accountId: args.assignee_account_id };
    if (args.priority) fields['priority'] = { name: args.priority };
    return this.put(`/issue/${encodeURIComponent(args.issue_id_or_key as string)}`, { fields });
  }

  private async deleteIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id_or_key) return { content: [{ type: 'text', text: 'issue_id_or_key is required' }], isError: true };
    return this.del(`/issue/${encodeURIComponent(args.issue_id_or_key as string)}`);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {
      maxResults: (args.max_results as number) ?? 50,
      startAt: (args.start_at as number) ?? 0,
    };
    if (args.query) params['query'] = args.query;
    return this.get('/project/search', params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id_or_key) return { content: [{ type: 'text', text: 'project_id_or_key is required' }], isError: true };
    return this.get(`/project/${encodeURIComponent(args.project_id_or_key as string)}`);
  }

  private async addComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id_or_key) return { content: [{ type: 'text', text: 'issue_id_or_key is required' }], isError: true };
    if (!args.body) return { content: [{ type: 'text', text: 'body is required' }], isError: true };
    return this.post(`/issue/${encodeURIComponent(args.issue_id_or_key as string)}/comment`, {
      body: this.textToADF(args.body as string),
    });
  }

  private async getComments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id_or_key) return { content: [{ type: 'text', text: 'issue_id_or_key is required' }], isError: true };
    return this.get(`/issue/${encodeURIComponent(args.issue_id_or_key as string)}/comment`, {
      maxResults: (args.max_results as number) ?? 50,
      startAt: (args.start_at as number) ?? 0,
    });
  }

  private async getTransitions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id_or_key) return { content: [{ type: 'text', text: 'issue_id_or_key is required' }], isError: true };
    return this.get(`/issue/${encodeURIComponent(args.issue_id_or_key as string)}/transitions`);
  }

  private async transitionIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id_or_key) return { content: [{ type: 'text', text: 'issue_id_or_key is required' }], isError: true };
    if (!args.transition_id) return { content: [{ type: 'text', text: 'transition_id is required' }], isError: true };
    return this.post(`/issue/${encodeURIComponent(args.issue_id_or_key as string)}/transitions`, {
      transition: { id: args.transition_id },
    });
  }

  private async assignIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id_or_key) return { content: [{ type: 'text', text: 'issue_id_or_key is required' }], isError: true };
    return this.put(`/issue/${encodeURIComponent(args.issue_id_or_key as string)}/assignee`, {
      accountId: args.account_id ?? null,
    });
  }

  private async listFields(): Promise<ToolResult> {
    return this.get('/field');
  }

  private async getMyself(): Promise<ToolResult> {
    return this.get('/myself');
  }

  private async getIssueTypes(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.project_id_or_key) {
      return this.get(`/project/${encodeURIComponent(args.project_id_or_key as string)}/statuses`);
    }
    return this.get('/issuetype');
  }

  private async listFilters(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.my_filters) return this.get('/filter/my');
    return this.get('/filter/favourite');
  }

  private async getFilter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.filter_id) return { content: [{ type: 'text', text: 'filter_id is required' }], isError: true };
    return this.get(`/filter/${encodeURIComponent(args.filter_id as string)}`);
  }

  private async getIssueChangelog(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id_or_key) return { content: [{ type: 'text', text: 'issue_id_or_key is required' }], isError: true };
    return this.get(`/issue/${encodeURIComponent(args.issue_id_or_key as string)}/changelog`, {
      maxResults: (args.max_results as number) ?? 50,
      startAt: (args.start_at as number) ?? 0,
    });
  }
}
