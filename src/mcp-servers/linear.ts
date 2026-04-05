/**
 * Linear MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://api.linear.app/mcp — transport: streamable-HTTP + SSE, auth: OAuth 2.1 (dynamic client registration)
// Linear publishes an official hosted MCP server (https://linear.app/docs/mcp). It is actively maintained
// (updated 2025-11). However, available evidence shows it exposes ~4-7 tools (list_issues, get_issue,
// list_teams, create_issue, update_issue, list_projects, create_comment) — below the 10-tool threshold
// required to prefer the vendor MCP over a REST adapter. The official Linear MCP does NOT meet criterion #3.
// Our adapter covers: 17 tools. Vendor MCP covers: ~7 tools (below 10-tool threshold).
// Recommendation: use-rest-api — vendor MCP exists but fails the 10+ tools criterion. Use this adapter.
// Air-gapped deployments also benefit from this adapter over the hosted OAuth MCP.
//
// Base URL: https://api.linear.app/graphql (single GraphQL endpoint)
// Auth: Bearer token (personal API key from Linear Settings → API → Personal API keys)
// Docs: https://developers.linear.app/docs/graphql/working-with-the-graphql-api
// Rate limits: Not publicly documented; enforced server-side with standard 429 responses.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LinearConfig {
  /** Personal API key from Linear Settings → API → Personal API keys. */
  apiKey: string;
}

export class LinearMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly graphqlUrl = 'https://api.linear.app/graphql';

  constructor(config: LinearConfig) {
    super();
    this.apiKey = config.apiKey;
  }

  static catalog() {
    return {
      name: 'linear',
      displayName: 'Linear',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: [
        'linear', 'issue tracker', 'project management', 'sprint', 'cycle', 'roadmap',
        'bug tracking', 'team', 'backlog', 'milestone', 'label', 'comment', 'assignee',
      ],
      toolNames: [
        'list_issues', 'get_issue', 'create_issue', 'update_issue', 'delete_issue',
        'list_projects', 'get_project', 'create_project', 'list_teams', 'get_team',
        'list_cycles', 'get_cycle', 'list_comments', 'create_comment',
        'list_users', 'list_labels', 'search_issues',
      ],
      description: 'Manage Linear issues, projects, teams, cycles, labels, and comments via the Linear GraphQL API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_issues',
        description: 'List Linear issues with optional filters for team, state, assignee, priority, and label, plus pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: { type: 'string', description: 'Filter by team ID (optional).' },
            state: { type: 'string', description: 'Filter by workflow state name, e.g. "In Progress", "Todo", "Done" (optional).' },
            assignee_id: { type: 'string', description: 'Filter by assignee user ID (optional).' },
            priority: { type: 'number', description: 'Filter by priority: 0=no priority, 1=urgent, 2=high, 3=medium, 4=low (optional).' },
            label: { type: 'string', description: 'Filter by label name (optional).' },
            first: { type: 'number', description: 'Number of issues to return (default: 25, max: 100).' },
            after: { type: 'string', description: 'Cursor for forward pagination (from previous response pageInfo.endCursor).' },
          },
        },
      },
      {
        name: 'get_issue',
        description: 'Get a specific Linear issue by ID including description, state, assignee, labels, and comments.',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: { type: 'string', description: 'The issue ID (UUID) or identifier (e.g. "ENG-123").' },
          },
          required: ['issue_id'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new Linear issue in a team with optional description, priority, assignee, labels, and due date.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: { type: 'string', description: 'Team ID to create the issue in.' },
            title: { type: 'string', description: 'Issue title.' },
            description: { type: 'string', description: 'Issue description in Markdown (optional).' },
            priority: { type: 'number', description: 'Priority: 0=no priority, 1=urgent, 2=high, 3=medium, 4=low (optional).' },
            assignee_id: { type: 'string', description: 'Assignee user ID (optional).' },
            label_ids: { type: 'array', description: 'Array of label IDs to apply (optional).', items: { type: 'string' } },
            state_id: { type: 'string', description: 'Workflow state ID (optional; defaults to team default backlog state).' },
            due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format (optional).' },
            cycle_id: { type: 'string', description: 'Cycle ID to add the issue to (optional).' },
          },
          required: ['team_id', 'title'],
        },
      },
      {
        name: 'update_issue',
        description: 'Update an existing Linear issue — change title, description, state, priority, assignee, labels, or due date.',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: { type: 'string', description: 'The issue ID to update.' },
            title: { type: 'string', description: 'New title (optional).' },
            description: { type: 'string', description: 'New description in Markdown (optional).' },
            state_id: { type: 'string', description: 'New workflow state ID (optional).' },
            priority: { type: 'number', description: 'New priority: 0=none, 1=urgent, 2=high, 3=medium, 4=low (optional).' },
            assignee_id: { type: 'string', description: 'New assignee user ID (optional).' },
            label_ids: { type: 'array', description: 'Replacement label ID array (optional).', items: { type: 'string' } },
            due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format, or null to clear (optional).' },
          },
          required: ['issue_id'],
        },
      },
      {
        name: 'delete_issue',
        description: 'Archive (soft-delete) a Linear issue by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: { type: 'string', description: 'The issue ID to archive.' },
          },
          required: ['issue_id'],
        },
      },
      {
        name: 'list_projects',
        description: 'List Linear projects with optional team filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: { type: 'string', description: 'Filter by team ID (optional).' },
            first: { type: 'number', description: 'Number of projects to return (default: 25).' },
            after: { type: 'string', description: 'Cursor for forward pagination (optional).' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get a specific Linear project by ID including description, state, target date, and team.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string', description: 'The project ID.' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new Linear project with optional description, target date, and team membership.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name.' },
            team_ids: { type: 'array', description: 'Array of team IDs to associate with the project.', items: { type: 'string' } },
            description: { type: 'string', description: 'Project description in Markdown (optional).' },
            target_date: { type: 'string', description: 'Target completion date in YYYY-MM-DD format (optional).' },
            state: { type: 'string', description: 'Project state: planned, started, paused, completed, cancelled (optional).' },
          },
          required: ['name', 'team_ids'],
        },
      },
      {
        name: 'list_teams',
        description: 'List all Linear teams the authenticated user belongs to.',
        inputSchema: {
          type: 'object',
          properties: {
            first: { type: 'number', description: 'Number of teams to return (default: 25).' },
          },
        },
      },
      {
        name: 'get_team',
        description: 'Get a specific Linear team by ID including members, workflow states, and settings.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: { type: 'string', description: 'The team ID.' },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'list_cycles',
        description: 'List Linear cycles (sprints) for a team with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: { type: 'string', description: 'The team ID.' },
            first: { type: 'number', description: 'Number of cycles to return (default: 10).' },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'get_cycle',
        description: 'Get a specific Linear cycle by ID including issues and progress metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            cycle_id: { type: 'string', description: 'The cycle ID.' },
          },
          required: ['cycle_id'],
        },
      },
      {
        name: 'list_comments',
        description: 'List comments on a Linear issue with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: { type: 'string', description: 'The issue ID to list comments for.' },
            first: { type: 'number', description: 'Number of comments to return (default: 25).' },
          },
          required: ['issue_id'],
        },
      },
      {
        name: 'create_comment',
        description: 'Add a comment to a Linear issue in Markdown format.',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: { type: 'string', description: 'The issue ID to comment on.' },
            body: { type: 'string', description: 'Comment body in Markdown.' },
          },
          required: ['issue_id', 'body'],
        },
      },
      {
        name: 'list_users',
        description: 'List Linear users (members) in the organization with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            first: { type: 'number', description: 'Number of users to return (default: 50).' },
            after: { type: 'string', description: 'Cursor for forward pagination (optional).' },
          },
        },
      },
      {
        name: 'list_labels',
        description: 'List all issue labels in the organization or within a specific team.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: { type: 'string', description: 'Filter labels by team ID (optional; omit for org-wide labels).' },
            first: { type: 'number', description: 'Number of labels to return (default: 50).' },
          },
        },
      },
      {
        name: 'search_issues',
        description: 'Full-text search across Linear issues by title and description content.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search text to find in issue titles and descriptions.' },
            team_id: { type: 'string', description: 'Restrict search to a specific team ID (optional).' },
            first: { type: 'number', description: 'Number of results to return (default: 25).' },
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
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'create_project':
          return await this.createProject(args);
        case 'list_teams':
          return await this.listTeams(args);
        case 'get_team':
          return await this.getTeam(args);
        case 'list_cycles':
          return await this.listCycles(args);
        case 'get_cycle':
          return await this.getCycle(args);
        case 'list_comments':
          return await this.listComments(args);
        case 'create_comment':
          return await this.createComment(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'list_labels':
          return await this.listLabels(args);
        case 'search_issues':
          return await this.searchIssues(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers

  private async gql(query: string, variables: Record<string, unknown> = {}): Promise<{ data: unknown; errors?: unknown[] }> {
    const response = await this.fetchWithRetry(this.graphqlUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
      throw new Error(`Linear API HTTP error: ${response.status} ${response.statusText}`);
    }
    let body: unknown;
    try { body = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return body as { data: unknown; errors?: unknown[] };
  }

  private result(payload: { data: unknown; errors?: unknown[] }): ToolResult {
    if (payload.errors) {
      return {
        content: [{ type: 'text', text: this.truncate(JSON.stringify(payload.errors, null, 2)) }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(payload.data, null, 2)) }],
      isError: false,
    };
  }

  private async listIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const filter: Record<string, unknown> = {};
    if (args.team_id) filter['team'] = { id: { eq: args.team_id } };
    if (args.state) filter['state'] = { name: { eq: args.state } };
    if (args.assignee_id) filter['assignee'] = { id: { eq: args.assignee_id } };
    if (args.priority !== undefined) filter['priority'] = { eq: args.priority };
    if (args.label) filter['labels'] = { name: { eq: args.label } };

    const payload = await this.gql(
      `query ListIssues($filter: IssueFilter, $first: Int, $after: String) {
        issues(filter: $filter, first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id identifier title priority
            state { name }
            assignee { id name }
            labels { nodes { id name } }
            dueDate createdAt updatedAt
          }
        }
      }`,
      {
        filter: Object.keys(filter).length ? filter : undefined,
        first: (args.first as number) ?? 25,
        after: args.after ?? null,
      },
    );
    return this.result(payload);
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id) return { content: [{ type: 'text', text: 'issue_id is required' }], isError: true };
    const payload = await this.gql(
      `query GetIssue($id: String!) {
        issue(id: $id) {
          id identifier title description priority
          state { name }
          assignee { id name }
          labels { nodes { id name } }
          comments { nodes { id body createdAt user { name } } }
          dueDate createdAt updatedAt
        }
      }`,
      { id: args.issue_id },
    );
    return this.result(payload);
  }

  private async createIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id || !args.title) return { content: [{ type: 'text', text: 'team_id and title are required' }], isError: true };
    const input: Record<string, unknown> = { teamId: args.team_id, title: args.title };
    if (args.description) input.description = args.description;
    if (args.priority !== undefined) input.priority = args.priority;
    if (args.assignee_id) input.assigneeId = args.assignee_id;
    if (args.label_ids) input.labelIds = args.label_ids;
    if (args.state_id) input.stateId = args.state_id;
    if (args.due_date) input.dueDate = args.due_date;
    if (args.cycle_id) input.cycleId = args.cycle_id;
    const payload = await this.gql(
      `mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier title state { name } }
        }
      }`,
      { input },
    );
    return this.result(payload);
  }

  private async updateIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id) return { content: [{ type: 'text', text: 'issue_id is required' }], isError: true };
    const input: Record<string, unknown> = {};
    if (args.title !== undefined) input.title = args.title;
    if (args.description !== undefined) input.description = args.description;
    if (args.state_id !== undefined) input.stateId = args.state_id;
    if (args.priority !== undefined) input.priority = args.priority;
    if (args.assignee_id !== undefined) input.assigneeId = args.assignee_id;
    if (args.label_ids !== undefined) input.labelIds = args.label_ids;
    if (args.due_date !== undefined) input.dueDate = args.due_date;
    const payload = await this.gql(
      `mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue { id identifier title state { name } updatedAt }
        }
      }`,
      { id: args.issue_id, input },
    );
    return this.result(payload);
  }

  private async deleteIssue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id) return { content: [{ type: 'text', text: 'issue_id is required' }], isError: true };
    const payload = await this.gql(
      `mutation ArchiveIssue($id: String!) {
        issueArchive(id: $id) { success }
      }`,
      { id: args.issue_id },
    );
    return this.result(payload);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const filter: Record<string, unknown> = {};
    if (args.team_id) filter['accessibleTeams'] = { id: { eq: args.team_id } };
    const payload = await this.gql(
      `query ListProjects($filter: ProjectFilter, $first: Int, $after: String) {
        projects(filter: $filter, first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { id name description state startDate targetDate }
        }
      }`,
      {
        filter: Object.keys(filter).length ? filter : undefined,
        first: (args.first as number) ?? 25,
        after: args.after ?? null,
      },
    );
    return this.result(payload);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const payload = await this.gql(
      `query GetProject($id: String!) {
        project(id: $id) {
          id name description state startDate targetDate
          teams { nodes { id name } }
          members { nodes { id name } }
        }
      }`,
      { id: args.project_id },
    );
    return this.result(payload);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.team_ids) return { content: [{ type: 'text', text: 'name and team_ids are required' }], isError: true };
    const input: Record<string, unknown> = { name: args.name, teamIds: args.team_ids };
    if (args.description) input.description = args.description;
    if (args.target_date) input.targetDate = args.target_date;
    if (args.state) input.state = args.state;
    const payload = await this.gql(
      `mutation CreateProject($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          success
          project { id name state }
        }
      }`,
      { input },
    );
    return this.result(payload);
  }

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    const payload = await this.gql(
      `query ListTeams($first: Int) {
        teams(first: $first) {
          nodes { id name key description }
        }
      }`,
      { first: (args.first as number) ?? 25 },
    );
    return this.result(payload);
  }

  private async getTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    const payload = await this.gql(
      `query GetTeam($id: String!) {
        team(id: $id) {
          id name key description
          members { nodes { id name } }
          states { nodes { id name type } }
        }
      }`,
      { id: args.team_id },
    );
    return this.result(payload);
  }

  private async listCycles(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    const payload = await this.gql(
      `query ListCycles($teamId: String!, $first: Int) {
        cycles(filter: { team: { id: { eq: $teamId } } }, first: $first) {
          nodes { id number name startsAt endsAt completedAt }
        }
      }`,
      { teamId: args.team_id, first: (args.first as number) ?? 10 },
    );
    return this.result(payload);
  }

  private async getCycle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cycle_id) return { content: [{ type: 'text', text: 'cycle_id is required' }], isError: true };
    const payload = await this.gql(
      `query GetCycle($id: String!) {
        cycle(id: $id) {
          id number name startsAt endsAt completedAt
          issues { nodes { id identifier title state { name } } }
        }
      }`,
      { id: args.cycle_id },
    );
    return this.result(payload);
  }

  private async listComments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id) return { content: [{ type: 'text', text: 'issue_id is required' }], isError: true };
    const payload = await this.gql(
      `query ListComments($id: String!, $first: Int) {
        issue(id: $id) {
          comments(first: $first) {
            nodes { id body createdAt user { id name } }
          }
        }
      }`,
      { id: args.issue_id, first: (args.first as number) ?? 25 },
    );
    return this.result(payload);
  }

  private async createComment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.issue_id || !args.body) return { content: [{ type: 'text', text: 'issue_id and body are required' }], isError: true };
    const payload = await this.gql(
      `mutation CreateComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment { id body createdAt }
        }
      }`,
      { input: { issueId: args.issue_id, body: args.body } },
    );
    return this.result(payload);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const payload = await this.gql(
      `query ListUsers($first: Int, $after: String) {
        users(first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { id name email displayName active }
        }
      }`,
      { first: (args.first as number) ?? 50, after: args.after ?? null },
    );
    return this.result(payload);
  }

  private async listLabels(args: Record<string, unknown>): Promise<ToolResult> {
    const filter: Record<string, unknown> = {};
    if (args.team_id) filter['team'] = { id: { eq: args.team_id } };
    const payload = await this.gql(
      `query ListLabels($filter: IssueLabelFilter, $first: Int) {
        issueLabels(filter: $filter, first: $first) {
          nodes { id name color team { id name } }
        }
      }`,
      {
        filter: Object.keys(filter).length ? filter : undefined,
        first: (args.first as number) ?? 50,
      },
    );
    return this.result(payload);
  }

  private async searchIssues(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const filter: Record<string, unknown> = {
      or: [
        { title: { containsIgnoreCase: args.query } },
        { description: { containsIgnoreCase: args.query } },
      ],
    };
    if (args.team_id) filter['team'] = { id: { eq: args.team_id } };
    const payload = await this.gql(
      `query SearchIssues($filter: IssueFilter, $first: Int) {
        issues(filter: $filter, first: $first) {
          nodes { id identifier title priority state { name } assignee { name } createdAt }
        }
      }`,
      { filter, first: (args.first as number) ?? 25 },
    );
    return this.result(payload);
  }
}
