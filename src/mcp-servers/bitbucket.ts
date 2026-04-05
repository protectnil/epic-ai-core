/**
 * Atlassian Bitbucket MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28. Atlassian does not publish an official Bitbucket MCP server.
// Community servers found: MatanYemini/bitbucket-mcp, aashari/mcp-server-atlassian-bitbucket (6 generic
// HTTP tools in v2.0, not semantic), jhonymiler/Bitbucket-MCP-Cloud — all third-party, none meet the
// official + 10-tool + maintained criteria. Recommendation: use-rest-api — Use this adapter.
//
// Base URL: https://api.bitbucket.org/2.0
// Auth: HTTP Basic — username + app password (app passwords deprecated June 2026;
//       migrate to OAuth2 access tokens using the same Basic auth format).
// Docs: https://developer.atlassian.com/cloud/bitbucket/rest/
// Rate limits: Not formally published; practical limit ~1,000 req/hr per credential.
// Note: App Passwords are deprecated as of 2025-09-09 and will be fully disabled 2026-06-09.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BitbucketConfig {
  username: string;
  appPassword: string;
  baseUrl?: string;
}

export class BitbucketMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly appPassword: string;
  private readonly baseUrl: string;

  constructor(config: BitbucketConfig) {
    super();
    this.username = config.username;
    this.appPassword = config.appPassword;
    this.baseUrl = config.baseUrl || 'https://api.bitbucket.org/2.0';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_repositories',
        description: 'List repositories for a workspace with optional role filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            role: { type: 'string', description: 'Filter by role: owner, admin, contributor, member (default: all)' },
            q: { type: 'string', description: 'Query filter expression (e.g. scm="git")' },
            sort: { type: 'string', description: 'Sort field (e.g. -updated_on for newest first)' },
            pagelen: { type: 'number', description: 'Results per page (max 100, default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['workspace'],
        },
      },
      {
        name: 'get_repository',
        description: 'Get full details of a specific Bitbucket repository including SCM type, size, and permissions',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'create_repository',
        description: 'Create a new Bitbucket repository in a workspace with configurable SCM type and access level',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug (URL-safe name)' },
            scm: { type: 'string', description: 'Source control type: git or hg (default: git)' },
            is_private: { type: 'boolean', description: 'Whether the repository is private (default: true)' },
            description: { type: 'string', description: 'Repository description' },
            project_key: { type: 'string', description: 'Project key to assign the repository to' },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'delete_repository',
        description: 'Permanently delete a Bitbucket repository — this action is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'list_pull_requests',
        description: 'List pull requests for a repository filtered by state with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            state: { type: 'string', description: 'PR state: OPEN, MERGED, DECLINED, SUPERSEDED (default: OPEN)' },
            q: { type: 'string', description: 'Query filter (e.g. author.uuid="{...}")' },
            sort: { type: 'string', description: 'Sort field (e.g. -updated_on)' },
            pagelen: { type: 'number', description: 'Results per page (max 100, default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'get_pull_request',
        description: 'Get full details of a specific pull request including reviewers, commits, and diff stat',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            pull_request_id: { type: 'number', description: 'Pull request ID number' },
          },
          required: ['workspace', 'repo_slug', 'pull_request_id'],
        },
      },
      {
        name: 'create_pull_request',
        description: 'Create a new pull request from a source branch to a destination branch with optional reviewers',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            title: { type: 'string', description: 'Pull request title' },
            source_branch: { type: 'string', description: 'Source branch name' },
            destination_branch: { type: 'string', description: 'Destination branch name (default: main)' },
            description: { type: 'string', description: 'Pull request description (markdown supported)' },
            close_source_branch: { type: 'boolean', description: 'Close the source branch after merge (default: false)' },
            reviewers: { type: 'string', description: 'Comma-separated list of reviewer UUIDs or account IDs' },
          },
          required: ['workspace', 'repo_slug', 'title', 'source_branch'],
        },
      },
      {
        name: 'merge_pull_request',
        description: 'Merge an open pull request with configurable merge strategy and optional commit message',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            pull_request_id: { type: 'number', description: 'Pull request ID number' },
            merge_strategy: { type: 'string', description: 'Merge strategy: merge_commit, squash, fast_forward (default: merge_commit)' },
            message: { type: 'string', description: 'Custom merge commit message' },
            close_source_branch: { type: 'boolean', description: 'Close source branch after merge' },
          },
          required: ['workspace', 'repo_slug', 'pull_request_id'],
        },
      },
      {
        name: 'decline_pull_request',
        description: 'Decline (reject) an open pull request',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            pull_request_id: { type: 'number', description: 'Pull request ID number' },
          },
          required: ['workspace', 'repo_slug', 'pull_request_id'],
        },
      },
      {
        name: 'list_pr_comments',
        description: 'List comments on a pull request, ordered by creation time',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            pull_request_id: { type: 'number', description: 'Pull request ID number' },
            pagelen: { type: 'number', description: 'Results per page (max 100, default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['workspace', 'repo_slug', 'pull_request_id'],
        },
      },
      {
        name: 'create_pr_comment',
        description: 'Post a comment on a pull request',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            pull_request_id: { type: 'number', description: 'Pull request ID number' },
            content: { type: 'string', description: 'Comment text (markdown supported)' },
          },
          required: ['workspace', 'repo_slug', 'pull_request_id', 'content'],
        },
      },
      {
        name: 'list_branches',
        description: 'List branches for a repository with optional query filter and sort order',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            q: { type: 'string', description: 'Query filter (e.g. name ~ "feature")' },
            sort: { type: 'string', description: 'Sort field (e.g. -target.date for newest first)' },
            pagelen: { type: 'number', description: 'Results per page (max 100, default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'get_branch',
        description: 'Get details of a specific branch including its HEAD commit',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            branch_name: { type: 'string', description: 'Branch name' },
          },
          required: ['workspace', 'repo_slug', 'branch_name'],
        },
      },
      {
        name: 'delete_branch',
        description: 'Delete a branch from a repository',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            branch_name: { type: 'string', description: 'Branch name to delete' },
          },
          required: ['workspace', 'repo_slug', 'branch_name'],
        },
      },
      {
        name: 'list_commits',
        description: 'List commits for a repository or branch with optional path filter',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            revision: { type: 'string', description: 'Branch name, tag, or commit hash to start from' },
            path: { type: 'string', description: 'Filter commits that touched this file path' },
            pagelen: { type: 'number', description: 'Results per page (max 100, default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'get_commit',
        description: 'Get details of a specific commit by its hash including diff stat and parents',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            commit: { type: 'string', description: 'Full or abbreviated commit SHA hash' },
          },
          required: ['workspace', 'repo_slug', 'commit'],
        },
      },
      {
        name: 'list_pipelines',
        description: 'List pipeline runs for a repository sorted by most recent, with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            sort: { type: 'string', description: 'Sort field (default: -created_on for newest first)' },
            pagelen: { type: 'number', description: 'Results per page (max 100, default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'get_pipeline',
        description: 'Get details of a specific pipeline run including state, duration, and trigger',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            pipeline_uuid: { type: 'string', description: 'Pipeline UUID (including curly braces, e.g. {abc-123})' },
          },
          required: ['workspace', 'repo_slug', 'pipeline_uuid'],
        },
      },
      {
        name: 'trigger_pipeline',
        description: 'Trigger a new pipeline run for a branch or commit with optional custom variables',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            branch: { type: 'string', description: 'Branch name to run the pipeline on' },
            commit: { type: 'string', description: 'Specific commit hash to run (overrides branch tip)' },
            pattern: { type: 'string', description: 'Custom pipeline pattern selector (e.g. custom/deploy-staging)' },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'stop_pipeline',
        description: 'Stop a running pipeline build',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            pipeline_uuid: { type: 'string', description: 'Pipeline UUID to stop' },
          },
          required: ['workspace', 'repo_slug', 'pipeline_uuid'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List deployments for a repository across all environments',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            pagelen: { type: 'number', description: 'Results per page (max 100, default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'list_environments',
        description: 'List deployment environments configured for a repository (e.g. staging, production)',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'list_issues',
        description: 'List issues for a repository with optional status and priority filters',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            q: { type: 'string', description: 'Query filter (e.g. status="open" AND priority="major")' },
            sort: { type: 'string', description: 'Sort field (e.g. -updated_on)' },
            pagelen: { type: 'number', description: 'Results per page (max 100, default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'get_issue',
        description: 'Get details of a specific issue by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            issue_id: { type: 'number', description: 'Issue ID number' },
          },
          required: ['workspace', 'repo_slug', 'issue_id'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new issue in a repository with title, priority, kind, and optional assignee',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            title: { type: 'string', description: 'Issue title' },
            content: { type: 'string', description: 'Issue description (markdown supported)' },
            priority: { type: 'string', description: 'Priority: trivial, minor, major, critical, blocker (default: major)' },
            kind: { type: 'string', description: 'Kind: bug, enhancement, proposal, task (default: bug)' },
            assignee: { type: 'string', description: 'Account ID of assignee' },
          },
          required: ['workspace', 'repo_slug', 'title'],
        },
      },
      {
        name: 'update_issue',
        description: 'Update an existing issue status, priority, assignee, or title',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            issue_id: { type: 'number', description: 'Issue ID number' },
            title: { type: 'string', description: 'Updated title' },
            status: { type: 'string', description: 'New status: new, open, resolved, on hold, invalid, duplicate, wontfix, closed' },
            priority: { type: 'string', description: 'Updated priority: trivial, minor, major, critical, blocker' },
            assignee: { type: 'string', description: 'Account ID of new assignee' },
          },
          required: ['workspace', 'repo_slug', 'issue_id'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List webhooks configured for a repository',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
          },
          required: ['workspace', 'repo_slug'],
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a webhook on a repository to receive event notifications at a URL',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            url: { type: 'string', description: 'HTTPS URL to receive webhook payloads' },
            description: { type: 'string', description: 'Human-readable description of the webhook' },
            events: { type: 'string', description: 'Comma-separated event types (e.g. repo:push,pullrequest:created,pullrequest:fulfilled)' },
            active: { type: 'boolean', description: 'Whether the webhook is active (default: true)' },
          },
          required: ['workspace', 'repo_slug', 'url', 'events'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook from a repository by its UUID',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            webhook_uid: { type: 'string', description: 'Webhook UUID to delete' },
          },
          required: ['workspace', 'repo_slug', 'webhook_uid'],
        },
      },
      {
        name: 'list_workspace_members',
        description: 'List all members of a Bitbucket workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            pagelen: { type: 'number', description: 'Results per page (max 100, default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['workspace'],
        },
      },
      {
        name: 'get_src_file',
        description: 'Retrieve the raw content of a file from a repository at a given commit or branch',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            commit: { type: 'string', description: 'Commit hash or branch name' },
            path: { type: 'string', description: 'File path within the repository (e.g. src/main.py)' },
          },
          required: ['workspace', 'repo_slug', 'commit', 'path'],
        },
      },
      {
        name: 'list_src_directory',
        description: 'List files and directories at a path in a repository at a given commit or branch',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: { type: 'string', description: 'Workspace slug or UUID' },
            repo_slug: { type: 'string', description: 'Repository slug' },
            commit: { type: 'string', description: 'Commit hash or branch name' },
            path: { type: 'string', description: 'Directory path (default: root)' },
            pagelen: { type: 'number', description: 'Results per page (max 100, default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['workspace', 'repo_slug', 'commit'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_repositories': return this.listRepositories(args);
        case 'get_repository': return this.getRepository(args);
        case 'create_repository': return this.createRepository(args);
        case 'delete_repository': return this.deleteRepository(args);
        case 'list_pull_requests': return this.listPullRequests(args);
        case 'get_pull_request': return this.getPullRequest(args);
        case 'create_pull_request': return this.createPullRequest(args);
        case 'merge_pull_request': return this.mergePullRequest(args);
        case 'decline_pull_request': return this.declinePullRequest(args);
        case 'list_pr_comments': return this.listPrComments(args);
        case 'create_pr_comment': return this.createPrComment(args);
        case 'list_branches': return this.listBranches(args);
        case 'get_branch': return this.getBranch(args);
        case 'delete_branch': return this.deleteBranch(args);
        case 'list_commits': return this.listCommits(args);
        case 'get_commit': return this.getCommit(args);
        case 'list_pipelines': return this.listPipelines(args);
        case 'get_pipeline': return this.getPipeline(args);
        case 'trigger_pipeline': return this.triggerPipeline(args);
        case 'stop_pipeline': return this.stopPipeline(args);
        case 'list_deployments': return this.listDeployments(args);
        case 'list_environments': return this.listEnvironments(args);
        case 'list_issues': return this.listIssues(args);
        case 'get_issue': return this.getIssue(args);
        case 'create_issue': return this.createIssue(args);
        case 'update_issue': return this.updateIssue(args);
        case 'list_webhooks': return this.listWebhooks(args);
        case 'create_webhook': return this.createWebhook(args);
        case 'delete_webhook': return this.deleteWebhook(args);
        case 'list_workspace_members': return this.listWorkspaceMembers(args);
        case 'get_src_file': return this.getSrcFile(args);
        case 'list_src_directory': return this.listSrcDirectory(args);
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
    return `Basic ${btoa(`${this.username}:${this.appPassword}`)}`;
  }

  private headers(): Record<string, string> {
    return { Authorization: this.authHeader(), 'Content-Type': 'application/json' };
  }

  private async request(url: string, method = 'GET', body?: unknown): Promise<ToolResult> {
    const opts: RequestInit = { method, headers: this.headers() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, opts);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = await response.text(); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private ws(args: Record<string, unknown>): string {
    return encodeURIComponent(args.workspace as string);
  }

  private repo(args: Record<string, unknown>): string {
    return encodeURIComponent(args.repo_slug as string);
  }

  private async listRepositories(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.role) params.set('role', args.role as string);
    if (args.q) params.set('q', args.q as string);
    if (args.sort) params.set('sort', args.sort as string);
    params.set('pagelen', String((args.pagelen as number) ?? 10));
    params.set('page', String((args.page as number) ?? 1));
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}?${params}`);
  }

  private async getRepository(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}`);
  }

  private async createRepository(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { scm: (args.scm as string) ?? 'git', is_private: args.is_private ?? true };
    if (args.description) body.description = args.description;
    if (args.project_key) body.project = { key: args.project_key };
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}`, 'POST', body);
  }

  private async deleteRepository(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Repository deleted successfully' }], isError: false };
  }

  private async listPullRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('state', (args.state as string) ?? 'OPEN');
    if (args.q) params.set('q', args.q as string);
    if (args.sort) params.set('sort', args.sort as string);
    params.set('pagelen', String((args.pagelen as number) ?? 10));
    params.set('page', String((args.page as number) ?? 1));
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/pullrequests?${params}`);
  }

  private async getPullRequest(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/pullrequests/${encodeURIComponent(args.pull_request_id as string)}`);
  }

  private async createPullRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      title: args.title,
      source: { branch: { name: args.source_branch } },
      destination: { branch: { name: (args.destination_branch as string) ?? 'main' } },
    };
    if (args.description) body.description = args.description;
    if (typeof args.close_source_branch === 'boolean') body.close_source_branch = args.close_source_branch;
    if (args.reviewers) {
      body.reviewers = (args.reviewers as string).split(',').map(r => ({ account_id: r.trim() }));
    }
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/pullrequests`, 'POST', body);
  }

  private async mergePullRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { merge_strategy: (args.merge_strategy as string) ?? 'merge_commit' };
    if (args.message) body.message = args.message;
    if (typeof args.close_source_branch === 'boolean') body.close_source_branch = args.close_source_branch;
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/pullrequests/${encodeURIComponent(args.pull_request_id as string)}/merge`, 'POST', body);
  }

  private async declinePullRequest(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/pullrequests/${encodeURIComponent(args.pull_request_id as string)}/decline`, 'POST', {});
  }

  private async listPrComments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('pagelen', String((args.pagelen as number) ?? 10));
    params.set('page', String((args.page as number) ?? 1));
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/pullrequests/${encodeURIComponent(args.pull_request_id as string)}/comments?${params}`);
  }

  private async createPrComment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      `${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/pullrequests/${encodeURIComponent(args.pull_request_id as string)}/comments`,
      'POST',
      { content: { raw: args.content } },
    );
  }

  private async listBranches(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.q) params.set('q', args.q as string);
    if (args.sort) params.set('sort', args.sort as string);
    params.set('pagelen', String((args.pagelen as number) ?? 10));
    params.set('page', String((args.page as number) ?? 1));
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/refs/branches?${params}`);
  }

  private async getBranch(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/refs/branches/${encodeURIComponent(args.branch_name as string)}`);
  }

  private async deleteBranch(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/refs/branches/${encodeURIComponent(args.branch_name as string)}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Branch deleted successfully' }], isError: false };
  }

  private async listCommits(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.path) params.set('path', args.path as string);
    params.set('pagelen', String((args.pagelen as number) ?? 10));
    params.set('page', String((args.page as number) ?? 1));
    const revision = args.revision ? `/${encodeURIComponent(args.revision as string)}` : '';
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/commits${revision}?${params}`);
  }

  private async getCommit(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/commit/${encodeURIComponent(args.commit as string)}`);
  }

  private async listPipelines(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('sort', (args.sort as string) ?? '-created_on');
    params.set('pagelen', String((args.pagelen as number) ?? 10));
    params.set('page', String((args.page as number) ?? 1));
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/pipelines/?${params}`);
  }

  private async getPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/pipelines/${encodeURIComponent(args.pipeline_uuid as string)}`);
  }

  private async triggerPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.branch) body.target = { ref_type: 'branch', type: 'pipeline_ref_target', ref_name: args.branch };
    if (args.commit) body.target = { commit: { hash: args.commit, type: 'commit' }, type: 'pipeline_commit_target' };
    if (args.pattern) {
      body.target = {
        ...((body.target as Record<string, unknown>) ?? {}),
        selector: { type: 'custom', pattern: args.pattern },
      };
    }
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/pipelines/`, 'POST', body);
  }

  private async stopPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/pipelines/${encodeURIComponent(args.pipeline_uuid as string)}/stopPipeline`, 'POST', {});
  }

  private async listDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('pagelen', String((args.pagelen as number) ?? 10));
    params.set('page', String((args.page as number) ?? 1));
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/deployments/?${params}`);
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/environments/`);
  }

  private async listIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.q) params.set('q', args.q as string);
    if (args.sort) params.set('sort', args.sort as string);
    params.set('pagelen', String((args.pagelen as number) ?? 10));
    params.set('page', String((args.page as number) ?? 1));
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/issues?${params}`);
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/issues/${encodeURIComponent(args.issue_id as string)}`);
  }

  private async createIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { title: args.title, priority: (args.priority as string) ?? 'major', kind: (args.kind as string) ?? 'bug' };
    if (args.content) body.content = { raw: args.content };
    if (args.assignee) body.assignee = { account_id: args.assignee };
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/issues`, 'POST', body);
  }

  private async updateIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.status) body.status = args.status;
    if (args.priority) body.priority = args.priority;
    if (args.assignee) body.assignee = { account_id: args.assignee };
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/issues/${encodeURIComponent(args.issue_id as string)}`, 'PUT', body);
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/hooks`);
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const events = (args.events as string).split(',').map(e => e.trim());
    const body: Record<string, unknown> = {
      description: (args.description as string) ?? '',
      url: args.url,
      active: args.active ?? true,
      events,
    };
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/hooks`, 'POST', body);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/hooks/${encodeURIComponent(args.webhook_uid as string)}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Webhook deleted successfully' }], isError: false };
  }

  private async listWorkspaceMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('pagelen', String((args.pagelen as number) ?? 10));
    params.set('page', String((args.page as number) ?? 1));
    return this.request(`${this.baseUrl}/workspaces/${this.ws(args)}/members?${params}`);
  }

  private async getSrcFile(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/src/${encodeURIComponent(args.commit as string)}/${encodeURIComponent(args.path as string)}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const truncated = text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listSrcDirectory(args: Record<string, unknown>): Promise<ToolResult> {
    const path = args.path ? `/${encodeURIComponent(args.path as string)}` : '';
    const params = new URLSearchParams();
    params.set('pagelen', String((args.pagelen as number) ?? 10));
    params.set('page', String((args.page as number) ?? 1));
    return this.request(`${this.baseUrl}/repositories/${this.ws(args)}/${this.repo(args)}/src/${encodeURIComponent(args.commit as string)}${path}?${params}`);
  }

  static catalog() {
    return {
      name: 'bitbucket',
      displayName: 'Bitbucket',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['bitbucket', 'atlassian', 'git', 'repository', 'pull request', 'pipeline', 'branch', 'commit', 'deployment', 'issue', 'webhook', 'ci', 'cd', 'version control'],
      toolNames: ['list_repositories', 'get_repository', 'create_repository', 'delete_repository', 'list_pull_requests', 'get_pull_request', 'create_pull_request', 'merge_pull_request', 'decline_pull_request', 'list_pr_comments', 'create_pr_comment', 'list_branches', 'get_branch', 'delete_branch', 'list_commits', 'get_commit', 'list_pipelines', 'get_pipeline', 'trigger_pipeline', 'stop_pipeline', 'list_deployments', 'list_environments', 'list_issues', 'get_issue', 'create_issue', 'update_issue', 'list_webhooks', 'create_webhook', 'delete_webhook', 'list_workspace_members', 'get_src_file', 'list_src_directory'],
      description: 'Bitbucket Cloud version control: manage repositories, branches, pull requests, pipelines, deployments, issues, and webhooks.',
      author: 'protectnil' as const,
    };
  }
}
