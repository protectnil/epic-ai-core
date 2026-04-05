/**
 * Atlassian Jira MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/atlassian/atlassian-mcp-server (Atlassian Rovo MCP Server)
//   Remote cloud-hosted endpoint: https://mcp.atlassian.com/v1/sse — transport: streamable-HTTP,
//   auth: OAuth 2.1 (3LO) or org-admin-enabled API token. Covers Jira, Confluence, Compass.
//   Actively maintained by Atlassian (2025–2026). Jira tools: 15 (13 core + 2 beta Teamwork Graph).
//
// Integration: use-both
// MCP-sourced tools (6): getJiraIssueRemoteIssueLinks, getJiraIssueTypeMetaWithFields,
//   getJiraProjectIssueTypesMetadata, lookupJiraAccountId, getTeamworkGraphContext (beta),
//   getTeamworkGraphObject (beta)
// REST-sourced tools (15): list_issues, get_issue, create_issue, update_issue, delete_issue,
//   transition_issue, get_transitions, add_comment, add_worklog, search_jql, list_projects,
//   get_project, list_priorities, get_myself, search_users
// Combined coverage: 21 tools (MCP: 15 + REST: 15 - shared: 9)
//
// Reason: MCP meets all 4 criteria (official, maintained, 10+ tools, streamable-HTTP). Each side
// has unique operations: MCP exposes remote links, issue-type metadata, and Teamwork Graph context;
// REST exposes delete_issue, list_priorities, get_myself, search_users, and get_project. Use both
// for full coverage. MCP requires OAuth 2.1; this REST adapter covers Basic-auth / air-gapped use.
//
// Base URL: https://{instance}.atlassian.net/rest/api/3
// Auth: HTTP Basic — email:api_token (Base64-encoded). API tokens generated at id.atlassian.com.
// Docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
// Rate limits: Not publicly documented; Atlassian throttles at the tenant level

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface JiraConfig {
  /** Atlassian Cloud instance name, e.g. "mycompany" for mycompany.atlassian.net */
  instance: string;
  /** Atlassian account email address */
  email: string;
  /** Atlassian API token (generate at https://id.atlassian.com/manage-profile/security/api-tokens) */
  api_token: string;
}

export class JiraMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: JiraConfig) {
    super();
    this.baseUrl = `https://${config.instance}.atlassian.net/rest/api/3`;
    this.authHeader = `Basic ${Buffer.from(`${config.email}:${config.api_token}`).toString('base64')}`;
  }

  static catalog() {
    return {
      name: 'jira',
      displayName: 'Jira',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['jira', 'atlassian', 'issue', 'ticket', 'bug', 'sprint', 'project', 'backlog', 'agile', 'scrum', 'kanban', 'story', 'epic', 'workflow', 'jql'],
      toolNames: [
        'list_issues',
        'get_issue',
        'create_issue',
        'update_issue',
        'delete_issue',
        'transition_issue',
        'get_transitions',
        'add_comment',
        'add_worklog',
        'search_jql',
        'list_projects',
        'get_project',
        'list_priorities',
        'get_myself',
        'search_users',
      ],
      description: 'Issue and project tracking: create, update, transition, and query Jira issues using JQL; manage projects, priorities, worklogs, and comments.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_issues',
        description: 'List issues in a Jira project with optional pagination, returned in default issue order',
        inputSchema: {
          type: 'object',
          properties: {
            project_key: {
              type: 'string',
              description: 'The Jira project key, e.g. PROJ',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of issues to return (default: 50, max: 100)',
            },
            start_at: {
              type: 'number',
              description: 'Zero-based index of the first issue to return for pagination (default: 0)',
            },
          },
          required: ['project_key'],
        },
      },
      {
        name: 'get_issue',
        description: 'Get full details of a specific Jira issue by its key including fields, comments, and attachments',
        inputSchema: {
          type: 'object',
          properties: {
            issue_key: {
              type: 'string',
              description: 'The issue key, e.g. PROJ-123',
            },
          },
          required: ['issue_key'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new Jira issue with summary, type, description, and optional priority assignment',
        inputSchema: {
          type: 'object',
          properties: {
            project_key: {
              type: 'string',
              description: 'The Jira project key, e.g. PROJ',
            },
            summary: {
              type: 'string',
              description: 'One-line issue summary/title',
            },
            issue_type: {
              type: 'string',
              description: 'Issue type name: Bug, Task, Story, Epic, Subtask (default: Task)',
            },
            description: {
              type: 'string',
              description: 'Detailed description of the issue (plain text)',
            },
            priority: {
              type: 'string',
              description: 'Priority name: Highest, High, Medium, Low, Lowest',
            },
            assignee_account_id: {
              type: 'string',
              description: 'Atlassian account ID of the user to assign the issue to',
            },
          },
          required: ['project_key', 'summary', 'issue_type'],
        },
      },
      {
        name: 'update_issue',
        description: 'Update one or more fields on an existing Jira issue: summary, description, priority, or assignee',
        inputSchema: {
          type: 'object',
          properties: {
            issue_key: {
              type: 'string',
              description: 'The issue key, e.g. PROJ-123',
            },
            summary: {
              type: 'string',
              description: 'New summary text',
            },
            description: {
              type: 'string',
              description: 'New description text (plain text, converted to Atlassian Document Format)',
            },
            priority: {
              type: 'string',
              description: 'New priority name: Highest, High, Medium, Low, Lowest',
            },
            assignee_account_id: {
              type: 'string',
              description: 'Atlassian account ID of the new assignee',
            },
          },
          required: ['issue_key'],
        },
      },
      {
        name: 'delete_issue',
        description: 'Delete a Jira issue permanently by its key (irreversible)',
        inputSchema: {
          type: 'object',
          properties: {
            issue_key: {
              type: 'string',
              description: 'The issue key to delete, e.g. PROJ-123',
            },
          },
          required: ['issue_key'],
        },
      },
      {
        name: 'transition_issue',
        description: 'Move a Jira issue to a new workflow status using a transition ID (e.g. move to In Progress or Done)',
        inputSchema: {
          type: 'object',
          properties: {
            issue_key: {
              type: 'string',
              description: 'The issue key, e.g. PROJ-123',
            },
            transition_id: {
              type: 'string',
              description: 'The numeric transition ID. Use get_transitions to discover available transition IDs for an issue.',
            },
          },
          required: ['issue_key', 'transition_id'],
        },
      },
      {
        name: 'get_transitions',
        description: 'List all available workflow transitions for a Jira issue, returning IDs and target status names',
        inputSchema: {
          type: 'object',
          properties: {
            issue_key: {
              type: 'string',
              description: 'The issue key to get available transitions for, e.g. PROJ-123',
            },
          },
          required: ['issue_key'],
        },
      },
      {
        name: 'add_comment',
        description: 'Add a text comment to a Jira issue, visible to all project members',
        inputSchema: {
          type: 'object',
          properties: {
            issue_key: {
              type: 'string',
              description: 'The issue key, e.g. PROJ-123',
            },
            body: {
              type: 'string',
              description: 'Comment text (plain text)',
            },
          },
          required: ['issue_key', 'body'],
        },
      },
      {
        name: 'add_worklog',
        description: 'Log time spent working on a Jira issue in a human-readable duration format',
        inputSchema: {
          type: 'object',
          properties: {
            issue_key: {
              type: 'string',
              description: 'The issue key, e.g. PROJ-123',
            },
            time_spent: {
              type: 'string',
              description: 'Time spent in Jira duration format, e.g. 2h 30m, 1d, 45m',
            },
            comment: {
              type: 'string',
              description: 'Optional comment describing what was worked on',
            },
          },
          required: ['issue_key', 'time_spent'],
        },
      },
      {
        name: 'search_jql',
        description: 'Search Jira issues using JQL (Jira Query Language) with optional field selection and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            jql: {
              type: 'string',
              description: 'JQL query string, e.g. project = PROJ AND status = "In Progress" ORDER BY created DESC',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50, max: 100)',
            },
            start_at: {
              type: 'number',
              description: 'Zero-based index of the first result for pagination (default: 0)',
            },
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of field names to include in results, e.g. ["summary", "status", "assignee"] (omit for all fields)',
            },
          },
          required: ['jql'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all Jira projects accessible to the authenticated user with key, name, and type',
        inputSchema: {
          type: 'object',
          properties: {
            max_results: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 50)',
            },
            start_at: {
              type: 'number',
              description: 'Zero-based index of the first project for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details for a specific Jira project by key, including description, lead, and issue types',
        inputSchema: {
          type: 'object',
          properties: {
            project_key: {
              type: 'string',
              description: 'The Jira project key, e.g. PROJ',
            },
          },
          required: ['project_key'],
        },
      },
      {
        name: 'list_priorities',
        description: 'List all available issue priority levels configured in the Jira instance',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_myself',
        description: 'Get the profile details of the currently authenticated Jira user including accountId and display name',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_users',
        description: 'Search for Jira users by display name or email to find accountIds for assignment',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search string to match against user display names and email addresses',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of users to return (default: 20)',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_issues':
          return await this.listIssues(args);
        case 'get_issue':
          return await this.getIssue(args);
        case 'create_issue':
          return await this.createIssue(args);
        case 'update_issue':
          return await this.updateIssue(args);
        case 'delete_issue':
          return await this.deleteIssue(args);
        case 'transition_issue':
          return await this.transitionIssue(args);
        case 'get_transitions':
          return await this.getTransitions(args);
        case 'add_comment':
          return await this.addComment(args);
        case 'add_worklog':
          return await this.addWorklog(args);
        case 'search_jql':
          return await this.searchJql(args);
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'list_priorities':
          return await this.listPriorities();
        case 'get_myself':
          return await this.getMyself();
        case 'search_users':
          return await this.searchUsers(args);
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

  private headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchJson(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers(), ...options });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    const out = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: this.truncate(out) }],
      isError: !response.ok,
    };
  }

  /** Build Atlassian Document Format paragraph node from plain text */
  private adf(text: string): Record<string, unknown> {
    return {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    };
  }

  private async listIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      jql: `project = ${encodeURIComponent(args.project_key as string)}`,
      maxResults: String(args.max_results ?? 50),
      startAt: String(args.start_at ?? 0),
    });
    return this.fetchJson(`${this.baseUrl}/search?${params}`);
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const issueKey = args.issue_key as string;
    if (!issueKey) {
      return { content: [{ type: 'text', text: 'issue_key is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/issue/${encodeURIComponent(issueKey)}`);
  }

  private async createIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const fields: Record<string, unknown> = {
      project: { key: args.project_key },
      summary: args.summary,
      issuetype: { name: args.issue_type ?? 'Task' },
    };
    if (args.description) fields.description = this.adf(args.description as string);
    if (args.priority) fields.priority = { name: args.priority };
    if (args.assignee_account_id) fields.assignee = { accountId: args.assignee_account_id };
    return this.fetchJson(`${this.baseUrl}/issue`, {
      method: 'POST',
      body: JSON.stringify({ fields }),
    });
  }

  private async updateIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const issueKey = args.issue_key as string;
    if (!issueKey) {
      return { content: [{ type: 'text', text: 'issue_key is required' }], isError: true };
    }
    const fields: Record<string, unknown> = {};
    if (args.summary !== undefined) fields.summary = args.summary;
    if (args.description !== undefined) fields.description = this.adf(args.description as string);
    if (args.priority !== undefined) fields.priority = { name: args.priority };
    if (args.assignee_account_id !== undefined) fields.assignee = { accountId: args.assignee_account_id };
    const response = await this.fetchWithRetry(`${this.baseUrl}/issue/${encodeURIComponent(issueKey)}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({ fields }),
    });
    if (!response.ok) {
      let errData: unknown;
      try { errData = await response.json(); } catch { errData = response.statusText; }
      return { content: [{ type: 'text', text: `Jira API error: ${response.status} — ${JSON.stringify(errData)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Issue ${issueKey} updated successfully` }], isError: false };
  }

  private async deleteIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const issueKey = args.issue_key as string;
    if (!issueKey) {
      return { content: [{ type: 'text', text: 'issue_key is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/issue/${encodeURIComponent(issueKey)}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to delete issue: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Issue ${issueKey} deleted successfully` }], isError: false };
  }

  private async transitionIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const issueKey = args.issue_key as string;
    const transitionId = args.transition_id as string;
    if (!issueKey || !transitionId) {
      return { content: [{ type: 'text', text: 'issue_key and transition_id are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/issue/${encodeURIComponent(issueKey)}/transitions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ transition: { id: String(transitionId) } }),
    });
    if (!response.ok) {
      let errData: unknown;
      try { errData = await response.json(); } catch { errData = response.statusText; }
      return { content: [{ type: 'text', text: `Transition failed: ${response.status} — ${JSON.stringify(errData)}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Issue ${issueKey} transitioned successfully` }], isError: false };
  }

  private async getTransitions(args: Record<string, unknown>): Promise<ToolResult> {
    const issueKey = args.issue_key as string;
    if (!issueKey) {
      return { content: [{ type: 'text', text: 'issue_key is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/issue/${encodeURIComponent(issueKey)}/transitions`);
  }

  private async addComment(args: Record<string, unknown>): Promise<ToolResult> {
    const issueKey = args.issue_key as string;
    const body = args.body as string;
    if (!issueKey || !body) {
      return { content: [{ type: 'text', text: 'issue_key and body are required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/issue/${encodeURIComponent(issueKey)}/comment`, {
      method: 'POST',
      body: JSON.stringify({ body: this.adf(body) }),
    });
  }

  private async addWorklog(args: Record<string, unknown>): Promise<ToolResult> {
    const issueKey = args.issue_key as string;
    const timeSpent = args.time_spent as string;
    if (!issueKey || !timeSpent) {
      return { content: [{ type: 'text', text: 'issue_key and time_spent are required' }], isError: true };
    }
    const body: Record<string, unknown> = { timeSpent };
    if (args.comment) body.comment = this.adf(args.comment as string);
    return this.fetchJson(`${this.baseUrl}/issue/${encodeURIComponent(issueKey)}/worklog`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async searchJql(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      jql: String(args.jql),
      maxResults: String(args.max_results ?? 50),
      startAt: String(args.start_at ?? 0),
    });
    if (args.fields && Array.isArray(args.fields)) {
      params.set('fields', (args.fields as string[]).join(','));
    }
    return this.fetchJson(`${this.baseUrl}/search?${params}`);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      maxResults: String(args.max_results ?? 50),
      startAt: String(args.start_at ?? 0),
    });
    return this.fetchJson(`${this.baseUrl}/project/search?${params}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const projectKey = args.project_key as string;
    if (!projectKey) {
      return { content: [{ type: 'text', text: 'project_key is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/project/${encodeURIComponent(projectKey)}`);
  }

  private async listPriorities(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/priority`);
  }

  private async getMyself(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/myself`);
  }

  private async searchUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    const params = new URLSearchParams({
      query,
      maxResults: String(args.max_results ?? 20),
    });
    return this.fetchJson(`${this.baseUrl}/user/search?${params}`);
  }
}
