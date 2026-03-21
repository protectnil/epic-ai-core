/**
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

export class LinearMCPServer {
  private graphqlUrl = 'https://api.linear.app/graphql';

  constructor(private config: { api_key: string }) {}

  private async query(gql: string, variables: Record<string, unknown> = {}): Promise<{ data: unknown; ok: boolean }> {
    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.api_key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query: gql, variables }),
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    return { data, ok: response.ok };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_issues',
        description: 'List Linear issues with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: { type: 'string', description: 'Filter by team ID' },
            state: { type: 'string', description: 'Filter by state name (e.g. In Progress)' },
            first: { type: 'number', description: 'Number of issues to return', default: 25 },
          },
          required: [],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new Linear issue',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: { type: 'string', description: 'Team ID to create the issue in' },
            title: { type: 'string', description: 'Issue title' },
            description: { type: 'string', description: 'Issue description in markdown' },
            priority: { type: 'number', description: 'Priority (0=no, 1=urgent, 2=high, 3=medium, 4=low)' },
            assignee_id: { type: 'string', description: 'Assignee user ID' },
          },
          required: ['team_id', 'title'],
        },
      },
      {
        name: 'get_issue',
        description: 'Get a specific Linear issue by ID',
        inputSchema: {
          type: 'object',
          properties: {
            issue_id: { type: 'string', description: 'The issue ID' },
          },
          required: ['issue_id'],
        },
      },
      {
        name: 'list_projects',
        description: 'List Linear projects',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: { type: 'string', description: 'Filter by team ID' },
            first: { type: 'number', description: 'Number of projects to return', default: 25 },
          },
          required: [],
        },
      },
      {
        name: 'list_cycles',
        description: 'List Linear cycles for a team',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: { type: 'string', description: 'The team ID' },
            first: { type: 'number', description: 'Number of cycles to return', default: 10 },
          },
          required: ['team_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      let result: { data: unknown; ok: boolean };

      switch (name) {
        case 'list_issues': {
          const filter: Record<string, unknown> = {};
          if (args.team_id) filter['team'] = { id: { eq: args.team_id } };
          if (args.state) filter['state'] = { name: { eq: args.state } };
          result = await this.query(
            `query ListIssues($filter: IssueFilter, $first: Int) {
              issues(filter: $filter, first: $first) {
                nodes { id identifier title priority state { name } assignee { name } createdAt updatedAt }
              }
            }`,
            { filter: Object.keys(filter).length ? filter : undefined, first: args.first ?? 25 }
          );
          break;
        }
        case 'create_issue': {
          result = await this.query(
            `mutation CreateIssue($input: IssueCreateInput!) {
              issueCreate(input: $input) { success issue { id identifier title } }
            }`,
            {
              input: {
                teamId: args.team_id,
                title: args.title,
                ...(args.description ? { description: args.description } : {}),
                ...(args.priority !== undefined ? { priority: args.priority } : {}),
                ...(args.assignee_id ? { assigneeId: args.assignee_id } : {}),
              },
            }
          );
          break;
        }
        case 'get_issue': {
          result = await this.query(
            `query GetIssue($id: String!) {
              issue(id: $id) { id identifier title description priority state { name } assignee { name } createdAt updatedAt }
            }`,
            { id: args.issue_id }
          );
          break;
        }
        case 'list_projects': {
          const filter: Record<string, unknown> = {};
          if (args.team_id) filter['team'] = { id: { eq: args.team_id } };
          result = await this.query(
            `query ListProjects($filter: ProjectFilter, $first: Int) {
              projects(filter: $filter, first: $first) {
                nodes { id name description state startDate targetDate }
              }
            }`,
            { filter: Object.keys(filter).length ? filter : undefined, first: args.first ?? 25 }
          );
          break;
        }
        case 'list_cycles': {
          result = await this.query(
            `query ListCycles($teamId: String!, $first: Int) {
              cycles(filter: { team: { id: { eq: $teamId } } }, first: $first) {
                nodes { id number name startsAt endsAt completedAt }
              }
            }`,
            { teamId: args.team_id, first: args.first ?? 10 }
          );
          break;
        }
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
        isError: !result.ok,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      };
    }
  }
}
