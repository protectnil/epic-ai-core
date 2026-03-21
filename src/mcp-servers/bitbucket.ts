/**
 * Bitbucket MCP Server
 * Provides access to Bitbucket Cloud REST API 2.0 for repository, pull request, and pipeline management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface BitbucketConfig {
  username: string;
  appPassword: string;
  baseUrl?: string;
}

export class BitbucketMCPServer {
  private readonly username: string;
  private readonly appPassword: string;
  private readonly baseUrl: string;

  constructor(config: BitbucketConfig) {
    this.username = config.username;
    this.appPassword = config.appPassword;
    this.baseUrl = config.baseUrl || 'https://api.bitbucket.org/2.0';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_repositories',
        description: 'List repositories for a workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'Workspace slug or UUID',
            },
            pagelen: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['workspace'],
        },
      },
      {
        name: 'get_repository',
        description: 'Get details of a specific Bitbucket repository',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'Workspace slug or UUID',
            },
            repo_slug: {
              type: 'string',
              description: 'Repository slug',
            },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'list_pull_requests',
        description: 'List pull requests for a repository',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'Workspace slug or UUID',
            },
            repo_slug: {
              type: 'string',
              description: 'Repository slug',
            },
            state: {
              type: 'string',
              description: 'Pull request state: OPEN, MERGED, DECLINED, SUPERSEDED (default: OPEN)',
            },
            pagelen: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'create_pull_request',
        description: 'Create a new pull request in a Bitbucket repository',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'Workspace slug or UUID',
            },
            repo_slug: {
              type: 'string',
              description: 'Repository slug',
            },
            title: {
              type: 'string',
              description: 'Pull request title',
            },
            source_branch: {
              type: 'string',
              description: 'Source branch name',
            },
            destination_branch: {
              type: 'string',
              description: 'Destination branch name (default: main)',
            },
            description: {
              type: 'string',
              description: 'Pull request description',
            },
            close_source_branch: {
              type: 'boolean',
              description: 'Whether to close the source branch after merge',
            },
          },
          required: ['workspace', 'repo_slug', 'title', 'source_branch'],
        },
      },
      {
        name: 'list_pipelines',
        description: 'List pipelines for a repository',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'Workspace slug or UUID',
            },
            repo_slug: {
              type: 'string',
              description: 'Repository slug',
            },
            pagelen: {
              type: 'number',
              description: 'Number of results per page (max 100, default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const authHeader = `Basic ${btoa(`${this.username}:${this.appPassword}`)}`;
      const headers: Record<string, string> = {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_repositories': {
          const workspace = args.workspace as string;

          if (!workspace) {
            return {
              content: [{ type: 'text', text: 'workspace is required' }],
              isError: true,
            };
          }

          const pagelen = (args.pagelen as number) || 10;
          const page = (args.page as number) || 1;

          const response = await fetch(
            `${this.baseUrl}/repositories/${encodeURIComponent(workspace)}?pagelen=${pagelen}&page=${page}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list repositories: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bitbucket returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_repository': {
          const workspace = args.workspace as string;
          const repoSlug = args.repo_slug as string;

          if (!workspace || !repoSlug) {
            return {
              content: [{ type: 'text', text: 'workspace and repo_slug are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get repository: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bitbucket returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_pull_requests': {
          const workspace = args.workspace as string;
          const repoSlug = args.repo_slug as string;

          if (!workspace || !repoSlug) {
            return {
              content: [{ type: 'text', text: 'workspace and repo_slug are required' }],
              isError: true,
            };
          }

          const state = (args.state as string) || 'OPEN';
          const pagelen = (args.pagelen as number) || 10;
          const page = (args.page as number) || 1;

          const response = await fetch(
            `${this.baseUrl}/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}/pullrequests?state=${state}&pagelen=${pagelen}&page=${page}`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list pull requests: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bitbucket returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_pull_request': {
          const workspace = args.workspace as string;
          const repoSlug = args.repo_slug as string;
          const title = args.title as string;
          const sourceBranch = args.source_branch as string;

          if (!workspace || !repoSlug || !title || !sourceBranch) {
            return {
              content: [{ type: 'text', text: 'workspace, repo_slug, title, and source_branch are required' }],
              isError: true,
            };
          }

          const destinationBranch = (args.destination_branch as string) || 'main';

          const body: Record<string, unknown> = {
            title,
            source: { branch: { name: sourceBranch } },
            destination: { branch: { name: destinationBranch } },
          };
          if (args.description) body.description = args.description;
          if (typeof args.close_source_branch === 'boolean') body.close_source_branch = args.close_source_branch;

          const response = await fetch(
            `${this.baseUrl}/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}/pullrequests`,
            { method: 'POST', headers, body: JSON.stringify(body) }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to create pull request: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bitbucket returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_pipelines': {
          const workspace = args.workspace as string;
          const repoSlug = args.repo_slug as string;

          if (!workspace || !repoSlug) {
            return {
              content: [{ type: 'text', text: 'workspace and repo_slug are required' }],
              isError: true,
            };
          }

          const pagelen = (args.pagelen as number) || 10;
          const page = (args.page as number) || 1;

          const response = await fetch(
            `${this.baseUrl}/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repoSlug)}/pipelines?pagelen=${pagelen}&page=${page}&sort=-created_on`,
            { method: 'GET', headers }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list pipelines: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Bitbucket returned non-JSON response (HTTP ${response.status})`); }
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
