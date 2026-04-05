/**
 * GitHub MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/github/github-mcp-server — transport: stdio (Docker/Go binary) and
//   streamable-HTTP (remote), auth: Personal Access Token or GitHub App. Vendor-published, actively
//   maintained (v0.29.0, March 2026). Covers 50+ tools across toolsets: repos, issues, pull_requests,
//   actions, context, users, gists, git, labels, notifications, orgs, projects, code_security,
//   dependabot, discussions, secret_protection, security_advisories, stargazers.
// Our adapter covers: 22 tools. Vendor MCP covers: 50+ tools.
// Recommendation: use-both — Vendor MCP covers everything our adapter does plus many more toolsets
//   (projects, orgs, notifications, gists, git operations, code security, dependabot, etc.). Our REST
//   adapter provides air-gapped coverage for the 22 core operations when Docker/Go runtime is
//   unavailable or MCP transport is blocked.
//
// Integration: use-both
// MCP-sourced tools (50+): get_me, list_branches, list_code_scanning_alerts, get_code_scanning_alert,
//   create_or_update_file, create_pull_request_review, create_repository, delete_file, fork_repository,
//   get_code_scanning_alert, get_commit, get_discussion, get_file_contents, get_issue,
//   get_pull_request, get_pull_request_comments, get_pull_request_files, get_pull_request_reviews,
//   get_pull_request_status, get_repo, get_tag, get_user, list_commits, list_discussions,
//   list_issues, list_notifications, list_pull_requests, list_repos, list_tags, list_workflow_runs,
//   list_workflow_run_artifacts, manage_notification_subscription, merge_pull_request,
//   push_files, request_copilot_review, search_code, search_issues, search_repos, search_users,
//   submit_pull_request_review, update_issue, update_pull_request, update_pull_request_branch,
//   actions_get, actions_list, actions_run_trigger, get_job_logs, assign_copilot_to_issue,
//   add_pull_request_review_comment_to_pending_review (and more)
// REST-sourced tools (22): list_repos, get_repo, search_repos, list_issues, get_issue,
//   create_issue, update_issue, add_issue_comment, list_pull_requests, get_pull_request,
//   create_pull_request, list_commits, get_commit, list_branches, get_branch, list_releases,
//   create_release, list_deployments, list_workflow_runs, get_workflow_run, get_file_contents,
//   search_code
// Combined coverage: 50+ tools (MCP: 50+ + REST: 22 - shared: ~14)
//
// Base URL: https://api.github.com
// Auth: Bearer token (Personal Access Token or GitHub App installation token)
// Headers: Accept: application/vnd.github+json, X-GitHub-Api-Version: 2022-11-28
// Docs: https://docs.github.com/en/rest
// Rate limits: 5,000 req/hr (authenticated); 60 req/hr (unauthenticated)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GitHubConfig {
  token: string;
  baseUrl?: string;
}

export class GitHubMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: GitHubConfig) {
    super();
    this.token = config.token;
    this.baseUrl = (config.baseUrl ?? 'https://api.github.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'github',
      displayName: 'GitHub',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'github', 'git', 'repository', 'repo', 'issue', 'pull request', 'pr',
        'commit', 'branch', 'release', 'deployment', 'workflow', 'actions',
        'ci', 'code review', 'open source', 'version control', 'gist',
        'code search', 'file contents', 'comment',
      ],
      toolNames: [
        'list_repos', 'get_repo', 'search_repos',
        'list_issues', 'get_issue', 'create_issue', 'update_issue', 'add_issue_comment',
        'list_pull_requests', 'get_pull_request', 'create_pull_request',
        'list_commits', 'get_commit',
        'list_branches', 'get_branch',
        'list_releases', 'create_release',
        'list_deployments',
        'list_workflow_runs', 'get_workflow_run',
        'get_file_contents', 'search_code',
      ],
      description: 'Source control and collaboration: manage repos, issues, pull requests, branches, releases, deployments, workflow runs, and code search.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_repos',
        description: 'List repositories for the authenticated user or a specific owner (user or organization) with type and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login (user or org). Omit to list authenticated user\'s repos.',
            },
            type: {
              type: 'string',
              description: 'Filter by type: all, owner, member, public, private (default: owner)',
            },
            sort: {
              type: 'string',
              description: 'Sort by: created, updated, pushed, full_name (default: full_name)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 30)',
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
        description: 'Get detailed metadata for a specific repository including stars, forks, topics, and default branch',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login (user or org)',
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
        name: 'search_repos',
        description: 'Search GitHub repositories using GitHub search syntax with filters for language, stars, topics, and more',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query using GitHub search syntax (e.g. "language:typescript stars:>100 topic:mcp")',
            },
            sort: {
              type: 'string',
              description: 'Sort by: stars, forks, help-wanted-issues, updated (default: best match)',
            },
            order: {
              type: 'string',
              description: 'Order: asc or desc (default: desc)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 30)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'list_issues',
        description: 'List issues for a repository with optional filters for state, labels, assignee, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            state: {
              type: 'string',
              description: 'Issue state: open, closed, all (default: open)',
            },
            labels: {
              type: 'string',
              description: 'Comma-separated list of label names to filter by',
            },
            assignee: {
              type: 'string',
              description: 'Filter by assignee login. Use "none" for unassigned.',
            },
            since: {
              type: 'string',
              description: 'Only return issues updated after this ISO 8601 timestamp',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 30)',
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
        name: 'get_issue',
        description: 'Get full details of a specific issue by number, including body, labels, assignees, and comments count',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            issue_number: {
              type: 'number',
              description: 'Issue number within the repository',
            },
          },
          required: ['owner', 'repo', 'issue_number'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new issue in a repository with title, body, labels, and assignees',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            title: {
              type: 'string',
              description: 'Issue title (required)',
            },
            body: {
              type: 'string',
              description: 'Issue body text (Markdown supported)',
            },
            labels: {
              type: 'array',
              description: 'Array of label name strings to apply',
              items: { type: 'string' },
            },
            assignees: {
              type: 'array',
              description: 'Array of GitHub username strings to assign',
              items: { type: 'string' },
            },
            milestone: {
              type: 'number',
              description: 'Milestone number to associate the issue with',
            },
          },
          required: ['owner', 'repo', 'title'],
        },
      },
      {
        name: 'update_issue',
        description: 'Update an existing issue: change title, body, state (open/closed), labels, assignees, or milestone',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            issue_number: {
              type: 'number',
              description: 'Issue number to update',
            },
            title: {
              type: 'string',
              description: 'Updated issue title',
            },
            body: {
              type: 'string',
              description: 'Updated issue body (Markdown supported)',
            },
            state: {
              type: 'string',
              description: 'New state: open or closed',
            },
            labels: {
              type: 'array',
              description: 'Replacement array of label names (replaces existing labels)',
              items: { type: 'string' },
            },
            assignees: {
              type: 'array',
              description: 'Replacement array of assignee logins (replaces existing assignees)',
              items: { type: 'string' },
            },
          },
          required: ['owner', 'repo', 'issue_number'],
        },
      },
      {
        name: 'add_issue_comment',
        description: 'Add a comment to an existing issue or pull request (pull requests share the issues comment API)',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            issue_number: {
              type: 'number',
              description: 'Issue or pull request number',
            },
            body: {
              type: 'string',
              description: 'Comment body text (Markdown supported)',
            },
          },
          required: ['owner', 'repo', 'issue_number', 'body'],
        },
      },
      {
        name: 'list_pull_requests',
        description: 'List pull requests for a repository with optional filters for state, head branch, base branch, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            state: {
              type: 'string',
              description: 'PR state: open, closed, all (default: open)',
            },
            head: {
              type: 'string',
              description: 'Filter by head branch (format: user:branch or just branch)',
            },
            base: {
              type: 'string',
              description: 'Filter by base branch name (e.g. main)',
            },
            sort: {
              type: 'string',
              description: 'Sort by: created, updated, popularity, long-running (default: created)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 30)',
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
        name: 'get_pull_request',
        description: 'Get full details of a specific pull request by number including diff stats, merge status, and review state',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            pull_number: {
              type: 'number',
              description: 'Pull request number within the repository',
            },
          },
          required: ['owner', 'repo', 'pull_number'],
        },
      },
      {
        name: 'create_pull_request',
        description: 'Create a new pull request from a head branch into a base branch with title and body',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            title: {
              type: 'string',
              description: 'Pull request title',
            },
            head: {
              type: 'string',
              description: 'Branch to merge from (format: branch or owner:branch for forks)',
            },
            base: {
              type: 'string',
              description: 'Branch to merge into (e.g. main)',
            },
            body: {
              type: 'string',
              description: 'Pull request description body (Markdown supported)',
            },
            draft: {
              type: 'boolean',
              description: 'Create as a draft pull request (default: false)',
            },
          },
          required: ['owner', 'repo', 'title', 'head', 'base'],
        },
      },
      {
        name: 'list_commits',
        description: 'List commits on a branch or file path with optional author filter and date range',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            sha: {
              type: 'string',
              description: 'Branch name, tag, or commit SHA to list commits from (default: repo default branch)',
            },
            path: {
              type: 'string',
              description: 'Filter commits that changed this file or directory path',
            },
            author: {
              type: 'string',
              description: 'Filter by author login or email',
            },
            since: {
              type: 'string',
              description: 'Only commits after this ISO 8601 timestamp',
            },
            until: {
              type: 'string',
              description: 'Only commits before this ISO 8601 timestamp',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 30)',
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
        name: 'get_commit',
        description: 'Get full details of a specific commit by SHA including changed files, additions, and deletions',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            ref: {
              type: 'string',
              description: 'Commit SHA, branch name, or tag',
            },
          },
          required: ['owner', 'repo', 'ref'],
        },
      },
      {
        name: 'list_branches',
        description: 'List branches in a repository with optional filter for protected branches',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            protected: {
              type: 'boolean',
              description: 'Filter to only return protected branches (default: all branches)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 30)',
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
        name: 'get_branch',
        description: 'Get details of a specific branch including the latest commit SHA and protection rules',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            branch: {
              type: 'string',
              description: 'Branch name',
            },
          },
          required: ['owner', 'repo', 'branch'],
        },
      },
      {
        name: 'list_releases',
        description: 'List releases for a repository sorted by creation date, most recent first',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 30)',
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
        name: 'create_release',
        description: 'Create a new release for a repository, optionally generating release notes automatically',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            tag_name: {
              type: 'string',
              description: 'Tag name for the release (e.g. v1.2.0). Created if it does not exist.',
            },
            name: {
              type: 'string',
              description: 'Release title (defaults to tag name if omitted)',
            },
            body: {
              type: 'string',
              description: 'Release notes or changelog (Markdown supported)',
            },
            draft: {
              type: 'boolean',
              description: 'Create as a draft release not published publicly (default: false)',
            },
            prerelease: {
              type: 'boolean',
              description: 'Mark as a pre-release (default: false)',
            },
            target_commitish: {
              type: 'string',
              description: 'Branch or commit SHA the tag is created from (default: repo default branch)',
            },
            generate_release_notes: {
              type: 'boolean',
              description: 'Auto-generate release notes from merged PRs since last release (default: false)',
            },
          },
          required: ['owner', 'repo', 'tag_name'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List deployments for a repository with optional filters for environment, ref, and task',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            environment: {
              type: 'string',
              description: 'Filter by environment name (e.g. production, staging)',
            },
            ref: {
              type: 'string',
              description: 'Filter by branch name, tag, or SHA',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 30)',
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
        name: 'list_workflow_runs',
        description: 'List GitHub Actions workflow runs for a repository with optional filters for branch, event, and status',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            workflow_id: {
              type: 'string',
              description: 'Workflow filename (e.g. ci.yml) or numeric workflow ID to filter by',
            },
            branch: {
              type: 'string',
              description: 'Filter runs by branch name',
            },
            event: {
              type: 'string',
              description: 'Filter by trigger event: push, pull_request, schedule, workflow_dispatch, etc.',
            },
            status: {
              type: 'string',
              description: 'Filter by status: queued, in_progress, completed, action_required, failure, success, cancelled, skipped',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 30)',
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
        name: 'get_workflow_run',
        description: 'Get details of a specific workflow run by ID including conclusion, duration, and job count',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            run_id: {
              type: 'number',
              description: 'Workflow run ID to retrieve',
            },
          },
          required: ['owner', 'repo', 'run_id'],
        },
      },
      {
        name: 'get_file_contents',
        description: 'Get the contents of a file or directory in a repository; file content is returned Base64-encoded in the response',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner login',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            path: {
              type: 'string',
              description: 'Path to the file or directory within the repository (e.g. src/index.ts)',
            },
            ref: {
              type: 'string',
              description: 'Branch name, tag, or commit SHA to read from (default: repo default branch)',
            },
          },
          required: ['owner', 'repo', 'path'],
        },
      },
      {
        name: 'search_code',
        description: 'Search for code across GitHub repositories using GitHub code search syntax; supports language, repo, and path qualifiers',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Code search query using GitHub syntax (e.g. "useEffect repo:facebook/react language:JavaScript")',
            },
            sort: {
              type: 'string',
              description: 'Sort by: indexed (most recently indexed, default: best match)',
            },
            order: {
              type: 'string',
              description: 'Order: asc or desc (default: desc)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 30)',
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `GitHub API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `GitHub API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async patch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `GitHub API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private r(owner: string, repo: string): string {
    return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  }

  private async listRepos(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string | undefined;
    const type = (args.type as string) ?? 'owner';
    const sort = (args.sort as string) ?? 'full_name';
    const perPage = (args.per_page as number) ?? 30;
    const page = (args.page as number) ?? 1;
    const url = owner
      ? `/users/${encodeURIComponent(owner)}/repos?type=${type}&sort=${sort}&per_page=${perPage}&page=${page}`
      : `/user/repos?type=${type}&sort=${sort}&per_page=${perPage}&page=${page}`;
    return this.get(url);
  }

  private async getRepo(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo } = args as { owner: string; repo: string };
    if (!owner || !repo) return { content: [{ type: 'text', text: 'owner and repo are required' }], isError: true };
    return this.get(this.r(owner, repo));
  }

  private async searchRepos(args: Record<string, unknown>): Promise<ToolResult> {
    const q = args.q as string;
    if (!q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params = new URLSearchParams({ q, per_page: String((args.per_page as number) ?? 30), page: String((args.page as number) ?? 1) });
    if (args.sort) params.set('sort', args.sort as string);
    if (args.order) params.set('order', args.order as string);
    return this.get(`/search/repositories?${params}`);
  }

  private async listIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo } = args as { owner: string; repo: string };
    if (!owner || !repo) return { content: [{ type: 'text', text: 'owner and repo are required' }], isError: true };
    const params = new URLSearchParams({
      state: (args.state as string) ?? 'open',
      per_page: String((args.per_page as number) ?? 30),
      page: String((args.page as number) ?? 1),
    });
    if (args.labels) params.set('labels', args.labels as string);
    if (args.assignee) params.set('assignee', args.assignee as string);
    if (args.since) params.set('since', args.since as string);
    return this.get(`${this.r(owner, repo)}/issues?${params}`);
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, issue_number } = args as { owner: string; repo: string; issue_number: number };
    if (!owner || !repo || !issue_number) return { content: [{ type: 'text', text: 'owner, repo, and issue_number are required' }], isError: true };
    return this.get(`${this.r(owner, repo)}/issues/${issue_number}`);
  }

  private async createIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, title } = args as { owner: string; repo: string; title: string };
    if (!owner || !repo || !title) return { content: [{ type: 'text', text: 'owner, repo, and title are required' }], isError: true };
    const body: Record<string, unknown> = { title };
    if (args.body) body.body = args.body;
    if (args.labels) body.labels = args.labels;
    if (args.assignees) body.assignees = args.assignees;
    if (args.milestone) body.milestone = args.milestone;
    return this.post(`${this.r(owner, repo)}/issues`, body);
  }

  private async updateIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, issue_number } = args as { owner: string; repo: string; issue_number: number };
    if (!owner || !repo || !issue_number) return { content: [{ type: 'text', text: 'owner, repo, and issue_number are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.body) body.body = args.body;
    if (args.state) body.state = args.state;
    if (args.labels) body.labels = args.labels;
    if (args.assignees) body.assignees = args.assignees;
    return this.patch(`${this.r(owner, repo)}/issues/${issue_number}`, body);
  }

  private async addIssueComment(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, issue_number, body } = args as { owner: string; repo: string; issue_number: number; body: string };
    if (!owner || !repo || !issue_number || !body) return { content: [{ type: 'text', text: 'owner, repo, issue_number, and body are required' }], isError: true };
    return this.post(`${this.r(owner, repo)}/issues/${issue_number}/comments`, { body });
  }

  private async listPullRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo } = args as { owner: string; repo: string };
    if (!owner || !repo) return { content: [{ type: 'text', text: 'owner and repo are required' }], isError: true };
    const params = new URLSearchParams({
      state: (args.state as string) ?? 'open',
      per_page: String((args.per_page as number) ?? 30),
      page: String((args.page as number) ?? 1),
    });
    if (args.head) params.set('head', args.head as string);
    if (args.base) params.set('base', args.base as string);
    if (args.sort) params.set('sort', args.sort as string);
    return this.get(`${this.r(owner, repo)}/pulls?${params}`);
  }

  private async getPullRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, pull_number } = args as { owner: string; repo: string; pull_number: number };
    if (!owner || !repo || !pull_number) return { content: [{ type: 'text', text: 'owner, repo, and pull_number are required' }], isError: true };
    return this.get(`${this.r(owner, repo)}/pulls/${pull_number}`);
  }

  private async createPullRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, title, head, base } = args as { owner: string; repo: string; title: string; head: string; base: string };
    if (!owner || !repo || !title || !head || !base) return { content: [{ type: 'text', text: 'owner, repo, title, head, and base are required' }], isError: true };
    const body: Record<string, unknown> = { title, head, base };
    if (args.body) body.body = args.body;
    if (typeof args.draft === 'boolean') body.draft = args.draft;
    return this.post(`${this.r(owner, repo)}/pulls`, body);
  }

  private async listCommits(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo } = args as { owner: string; repo: string };
    if (!owner || !repo) return { content: [{ type: 'text', text: 'owner and repo are required' }], isError: true };
    const params = new URLSearchParams({
      per_page: String((args.per_page as number) ?? 30),
      page: String((args.page as number) ?? 1),
    });
    if (args.sha) params.set('sha', args.sha as string);
    if (args.path) params.set('path', args.path as string);
    if (args.author) params.set('author', args.author as string);
    if (args.since) params.set('since', args.since as string);
    if (args.until) params.set('until', args.until as string);
    return this.get(`${this.r(owner, repo)}/commits?${params}`);
  }

  private async getCommit(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, ref } = args as { owner: string; repo: string; ref: string };
    if (!owner || !repo || !ref) return { content: [{ type: 'text', text: 'owner, repo, and ref are required' }], isError: true };
    return this.get(`${this.r(owner, repo)}/commits/${encodeURIComponent(ref)}`);
  }

  private async listBranches(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo } = args as { owner: string; repo: string };
    if (!owner || !repo) return { content: [{ type: 'text', text: 'owner and repo are required' }], isError: true };
    const params = new URLSearchParams({
      per_page: String((args.per_page as number) ?? 30),
      page: String((args.page as number) ?? 1),
    });
    if (typeof args.protected === 'boolean') params.set('protected', String(args.protected));
    return this.get(`${this.r(owner, repo)}/branches?${params}`);
  }

  private async getBranch(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, branch } = args as { owner: string; repo: string; branch: string };
    if (!owner || !repo || !branch) return { content: [{ type: 'text', text: 'owner, repo, and branch are required' }], isError: true };
    return this.get(`${this.r(owner, repo)}/branches/${encodeURIComponent(branch)}`);
  }

  private async listReleases(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo } = args as { owner: string; repo: string };
    if (!owner || !repo) return { content: [{ type: 'text', text: 'owner and repo are required' }], isError: true };
    const params = new URLSearchParams({
      per_page: String((args.per_page as number) ?? 30),
      page: String((args.page as number) ?? 1),
    });
    return this.get(`${this.r(owner, repo)}/releases?${params}`);
  }

  private async createRelease(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, tag_name } = args as { owner: string; repo: string; tag_name: string };
    if (!owner || !repo || !tag_name) return { content: [{ type: 'text', text: 'owner, repo, and tag_name are required' }], isError: true };
    const body: Record<string, unknown> = { tag_name };
    if (args.name) body.name = args.name;
    if (args.body) body.body = args.body;
    if (typeof args.draft === 'boolean') body.draft = args.draft;
    if (typeof args.prerelease === 'boolean') body.prerelease = args.prerelease;
    if (args.target_commitish) body.target_commitish = args.target_commitish;
    if (typeof args.generate_release_notes === 'boolean') body.generate_release_notes = args.generate_release_notes;
    return this.post(`${this.r(owner, repo)}/releases`, body);
  }

  private async listDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo } = args as { owner: string; repo: string };
    if (!owner || !repo) return { content: [{ type: 'text', text: 'owner and repo are required' }], isError: true };
    const params = new URLSearchParams({
      per_page: String((args.per_page as number) ?? 30),
      page: String((args.page as number) ?? 1),
    });
    if (args.environment) params.set('environment', args.environment as string);
    if (args.ref) params.set('ref', args.ref as string);
    return this.get(`${this.r(owner, repo)}/deployments?${params}`);
  }

  private async listWorkflowRuns(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo } = args as { owner: string; repo: string };
    if (!owner || !repo) return { content: [{ type: 'text', text: 'owner and repo are required' }], isError: true };
    let base = `${this.r(owner, repo)}/actions/runs`;
    if (args.workflow_id) {
      base = `${this.r(owner, repo)}/actions/workflows/${encodeURIComponent(args.workflow_id as string)}/runs`;
    }
    const params = new URLSearchParams({
      per_page: String((args.per_page as number) ?? 30),
      page: String((args.page as number) ?? 1),
    });
    if (args.branch) params.set('branch', args.branch as string);
    if (args.event) params.set('event', args.event as string);
    if (args.status) params.set('status', args.status as string);
    return this.get(`${base}?${params}`);
  }

  private async getWorkflowRun(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, run_id } = args as { owner: string; repo: string; run_id: number };
    if (!owner || !repo || !run_id) return { content: [{ type: 'text', text: 'owner, repo, and run_id are required' }], isError: true };
    return this.get(`${this.r(owner, repo)}/actions/runs/${run_id}`);
  }

  private async getFileContents(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, path } = args as { owner: string; repo: string; path: string };
    if (!owner || !repo || !path) return { content: [{ type: 'text', text: 'owner, repo, and path are required' }], isError: true };
    // path is a multi-segment URL path — encode each segment individually, preserve '/' separators
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    let url = `${this.r(owner, repo)}/contents/${encodedPath}`;
    if (args.ref) url += `?ref=${encodeURIComponent(args.ref as string)}`;
    return this.get(url);
  }

  private async searchCode(args: Record<string, unknown>): Promise<ToolResult> {
    const q = args.q as string;
    if (!q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params = new URLSearchParams({ q, per_page: String((args.per_page as number) ?? 30), page: String((args.page as number) ?? 1) });
    if (args.sort) params.set('sort', args.sort as string);
    if (args.order) params.set('order', args.order as string);
    return this.get(`/search/code?${params}`);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_repos':          return await this.listRepos(args);
        case 'get_repo':            return await this.getRepo(args);
        case 'search_repos':        return await this.searchRepos(args);
        case 'list_issues':         return await this.listIssues(args);
        case 'get_issue':           return await this.getIssue(args);
        case 'create_issue':        return await this.createIssue(args);
        case 'update_issue':        return await this.updateIssue(args);
        case 'add_issue_comment':   return await this.addIssueComment(args);
        case 'list_pull_requests':  return await this.listPullRequests(args);
        case 'get_pull_request':    return await this.getPullRequest(args);
        case 'create_pull_request': return await this.createPullRequest(args);
        case 'list_commits':        return await this.listCommits(args);
        case 'get_commit':          return await this.getCommit(args);
        case 'list_branches':       return await this.listBranches(args);
        case 'get_branch':          return await this.getBranch(args);
        case 'list_releases':       return await this.listReleases(args);
        case 'create_release':      return await this.createRelease(args);
        case 'list_deployments':    return await this.listDeployments(args);
        case 'list_workflow_runs':  return await this.listWorkflowRuns(args);
        case 'get_workflow_run':    return await this.getWorkflowRun(args);
        case 'get_file_contents':   return await this.getFileContents(args);
        case 'search_code':         return await this.searchCode(args);
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
}
