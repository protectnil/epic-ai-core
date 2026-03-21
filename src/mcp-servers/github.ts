/**
 * GitHub MCP Server
 * Provides access to GitHub REST API for repository, issue, and code management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface GitHubConfig {
  token: string;
  baseUrl?: string;
}

export class GitHubMCPServer {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: GitHubConfig) {
    this.token = config.token;
    this.baseUrl = config.baseUrl || 'https://api.github.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_repos',
        description: 'List repositories for the authenticated user or a specific owner',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (user or org). Omit to list authenticated user repos.',
            },
            type: {
              type: 'string',
              description: 'Repository type: all, owner, member (default: owner)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 30)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_repo',
        description: 'Get details of a specific repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (user or org)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'list_issues',
        description: 'List issues for a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (user or org)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            state: {
              type: 'string',
              description: 'Issue state: open, closed, all (default: open)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 30)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new issue in a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (user or org)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            title: {
              type: 'string',
              description: 'Issue title',
            },
            body: {
              type: 'string',
              description: 'Issue body (Markdown supported)',
            },
            labels: {
              type: 'array',
              description: 'Array of label names to apply',
            },
            assignees: {
              type: 'array',
              description: 'Array of GitHub usernames to assign',
            },
          },
          required: ['owner', 'repo', 'title'],
        },
      },
      {
        name: 'search_code',
        description: 'Search for code across GitHub repositories',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query (supports GitHub code search syntax)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 30)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['q'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_repos': {
          const owner = args.owner as string | undefined;
          const type = (args.type as string) || 'owner';
          const perPage = (args.per_page as number) || 30;
          const page = (args.page as number) || 1;

          const url = owner
            ? `${this.baseUrl}/users/${encodeURIComponent(owner)}/repos?type=${type}&per_page=${perPage}&page=${page}`
            : `${this.baseUrl}/user/repos?type=${type}&per_page=${perPage}&page=${page}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list repos: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitHub returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_repo': {
          const owner = args.owner as string;
          const repo = args.repo as string;

          if (!owner || !repo) {
            return {
              content: [{ type: 'text', text: 'owner and repo are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get repo: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitHub returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_issues': {
          const owner = args.owner as string;
          const repo = args.repo as string;

          if (!owner || !repo) {
            return {
              content: [{ type: 'text', text: 'owner and repo are required' }],
              isError: true,
            };
          }

          const state = (args.state as string) || 'open';
          const perPage = (args.per_page as number) || 30;
          const page = (args.page as number) || 1;

          const response = await fetch(
            `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=${state}&per_page=${perPage}&page=${page}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list issues: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitHub returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_issue': {
          const owner = args.owner as string;
          const repo = args.repo as string;
          const title = args.title as string;

          if (!owner || !repo || !title) {
            return {
              content: [{ type: 'text', text: 'owner, repo, and title are required' }],
              isError: true,
            };
          }

          const body: Record<string, unknown> = { title };
          if (args.body) body.body = args.body;
          if (args.labels) body.labels = args.labels;
          if (args.assignees) body.assignees = args.assignees;

          const response = await fetch(
            `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create issue: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitHub returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_code': {
          const q = args.q as string;

          if (!q) {
            return {
              content: [{ type: 'text', text: 'q (search query) is required' }],
              isError: true,
            };
          }

          const perPage = (args.per_page as number) || 30;
          const page = (args.page as number) || 1;

          const response = await fetch(
            `${this.baseUrl}/search/code?q=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search code: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`GitHub returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
}
