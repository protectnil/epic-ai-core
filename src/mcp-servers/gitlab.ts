/**
 * GitLab MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://docs.gitlab.com/user/gitlab_duo/model_context_protocol/mcp_server/
//   Transport: streamable-HTTP (recommended) and stdio (via mcp-remote proxy). Auth: OAuth 2.0.
//   Actively maintained by GitLab (vendor-official). Requires GitLab Duo subscription.
//   GitLab official MCP covers: ~13 tools (get_mcp_server_version, create_issue, get_issue,
//     create_merge_request, get_merge_request, get_merge_request_commits,
//     get_merge_request_changes, create_workitem_note, get_workitem_notes, list_labels,
//     manage_pipeline, list_jobs_for_pipeline, semantic_code_search).
// Our adapter covers: 24 tools (projects, issues, MRs, pipelines, jobs, commits, branches,
//   members, releases, tags, file contents, MR comments).
//
// Integration: use-both
//   MCP-sourced tools (1): [semantic_code_search]
//   REST-sourced tools (24): [list_projects, get_project, search_projects, list_issues,
//     get_issue, create_issue, update_issue, list_merge_requests, get_merge_request,
//     create_merge_request, add_mr_note, list_pipelines, get_pipeline, cancel_pipeline,
//     list_pipeline_jobs, get_job_log, list_commits, get_commit, list_branches, get_branch,
//     list_releases, list_tags, get_file, list_members]
//   Shared (covered by both, route through MCP): create_issue, get_issue,
//     create_merge_request, get_merge_request, manage_pipeline (cancel_pipeline overlap)
//   Combined coverage: 25 tools (MCP: 13 + REST: 24 - shared: ~5 = 25 unique)
//
// Base URL: https://gitlab.com/api/v4 (self-hosted: https://{host}/api/v4)
// Auth: PRIVATE-TOKEN header (Personal Access Token or Project/Group Access Token)
// Docs: https://docs.gitlab.com/api/rest/
// Rate limits: 2,000 req/min (authenticated user); varies for tokens

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GitLabConfig {
  privateToken: string;
  baseUrl?: string;
}

export class GitLabMCPServer extends MCPAdapterBase {
  private readonly privateToken: string;
  private readonly baseUrl: string;

  constructor(config: GitLabConfig) {
    super();
    this.privateToken = config.privateToken;
    this.baseUrl = (config.baseUrl ?? 'https://gitlab.com/api/v4').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'gitlab',
      displayName: 'GitLab',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'gitlab', 'git', 'repository', 'project', 'issue', 'merge request', 'mr',
        'pipeline', 'ci', 'cd', 'job', 'commit', 'branch', 'release', 'tag',
        'runner', 'member', 'namespace', 'group', 'devops', 'code review',
        'self-hosted', 'version control',
      ],
      toolNames: [
        'list_projects', 'get_project', 'search_projects',
        'list_issues', 'get_issue', 'create_issue', 'update_issue',
        'list_merge_requests', 'get_merge_request', 'create_merge_request', 'add_mr_note',
        'list_pipelines', 'get_pipeline', 'cancel_pipeline',
        'list_pipeline_jobs', 'get_job_log',
        'list_commits', 'get_commit',
        'list_branches', 'get_branch',
        'list_releases', 'list_tags',
        'get_file', 'list_members',
      ],
      description: 'Source control and DevOps: manage projects, issues, merge requests, pipelines, jobs, commits, branches, releases, and members.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List GitLab projects accessible to the authenticated user with optional search, ownership, and membership filters',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Filter projects by name or path substring',
            },
            owned: {
              type: 'boolean',
              description: 'Limit to projects owned by the authenticated user (default: false)',
            },
            membership: {
              type: 'boolean',
              description: 'Limit to projects the user is a member of (default: false)',
            },
            visibility: {
              type: 'string',
              description: 'Filter by visibility: public, internal, private',
            },
            order_by: {
              type: 'string',
              description: 'Order by: id, name, path, created_at, updated_at, last_activity_at, similarity (default: created_at)',
            },
            sort: {
              type: 'string',
              description: 'Sort order: asc or desc (default: desc)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details of a specific GitLab project including namespace, description, statistics, and settings',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID (numeric) or URL-encoded namespace/path (e.g. group%2Fproject)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'search_projects',
        description: 'Search for GitLab projects by name or path across all accessible projects',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search term to match against project name, path, or description',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['search'],
        },
      },
      {
        name: 'list_issues',
        description: 'List issues for a GitLab project with optional filters for state, labels, assignee, and milestone',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            state: {
              type: 'string',
              description: 'Issue state: opened, closed, all (default: opened)',
            },
            labels: {
              type: 'string',
              description: 'Comma-separated label names to filter by (e.g. "bug,critical")',
            },
            assignee_id: {
              type: 'number',
              description: 'Filter by assignee user ID',
            },
            milestone: {
              type: 'string',
              description: 'Filter by milestone title',
            },
            search: {
              type: 'string',
              description: 'Search issues by title and description',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_issue',
        description: 'Get full details of a specific issue by its IID (project-internal issue number)',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            issue_iid: {
              type: 'number',
              description: 'Internal issue number (IID) within the project',
            },
          },
          required: ['project_id', 'issue_iid'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new issue in a GitLab project with title, description, labels, and assignees',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            title: {
              type: 'string',
              description: 'Issue title',
            },
            description: {
              type: 'string',
              description: 'Issue description (Markdown supported)',
            },
            labels: {
              type: 'string',
              description: 'Comma-separated list of label names to assign',
            },
            assignee_ids: {
              type: 'array',
              description: 'Array of user IDs to assign to the issue',
              items: { type: 'number' },
            },
            milestone_id: {
              type: 'number',
              description: 'Milestone ID to associate with the issue',
            },
          },
          required: ['project_id', 'title'],
        },
      },
      {
        name: 'update_issue',
        description: 'Update an existing issue: change title, description, state, labels, assignees, or milestone',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            issue_iid: {
              type: 'number',
              description: 'Internal issue number (IID) within the project',
            },
            title: {
              type: 'string',
              description: 'Updated issue title',
            },
            description: {
              type: 'string',
              description: 'Updated issue description (Markdown supported)',
            },
            state_event: {
              type: 'string',
              description: 'State transition: close or reopen',
            },
            labels: {
              type: 'string',
              description: 'Comma-separated replacement label names',
            },
            assignee_ids: {
              type: 'array',
              description: 'Replacement array of user IDs to assign',
              items: { type: 'number' },
            },
          },
          required: ['project_id', 'issue_iid'],
        },
      },
      {
        name: 'list_merge_requests',
        description: 'List merge requests for a project with optional filters for state, source/target branch, labels, and author',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            state: {
              type: 'string',
              description: 'MR state: opened, closed, locked, merged, all (default: opened)',
            },
            source_branch: {
              type: 'string',
              description: 'Filter by source branch name',
            },
            target_branch: {
              type: 'string',
              description: 'Filter by target branch name',
            },
            labels: {
              type: 'string',
              description: 'Comma-separated label names to filter by',
            },
            author_id: {
              type: 'number',
              description: 'Filter by author user ID',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_merge_request',
        description: 'Get full details of a specific merge request by IID, including diff stats, approvals, and pipeline status',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            merge_request_iid: {
              type: 'number',
              description: 'Internal MR number (IID) within the project',
            },
          },
          required: ['project_id', 'merge_request_iid'],
        },
      },
      {
        name: 'create_merge_request',
        description: 'Create a new merge request from a source branch into a target branch with title and description',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            title: {
              type: 'string',
              description: 'Merge request title',
            },
            source_branch: {
              type: 'string',
              description: 'Branch to merge from',
            },
            target_branch: {
              type: 'string',
              description: 'Branch to merge into (e.g. main)',
            },
            description: {
              type: 'string',
              description: 'MR description (Markdown supported)',
            },
            assignee_id: {
              type: 'number',
              description: 'User ID to assign the MR to',
            },
            labels: {
              type: 'string',
              description: 'Comma-separated label names to apply',
            },
            draft: {
              type: 'boolean',
              description: 'Create as a draft (work in progress) merge request (default: false)',
            },
          },
          required: ['project_id', 'title', 'source_branch', 'target_branch'],
        },
      },
      {
        name: 'add_mr_note',
        description: 'Add a comment (note) to a merge request for code review discussion',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            merge_request_iid: {
              type: 'number',
              description: 'Internal MR number (IID) within the project',
            },
            body: {
              type: 'string',
              description: 'Comment text (Markdown supported)',
            },
          },
          required: ['project_id', 'merge_request_iid', 'body'],
        },
      },
      {
        name: 'list_pipelines',
        description: 'List CI/CD pipelines for a project with optional filters for status, ref, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            status: {
              type: 'string',
              description: 'Pipeline status: created, waiting_for_resource, preparing, pending, running, success, failed, canceled, skipped, manual, scheduled',
            },
            ref: {
              type: 'string',
              description: 'Filter by branch or tag name',
            },
            sha: {
              type: 'string',
              description: 'Filter by commit SHA',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_pipeline',
        description: 'Get full details of a specific pipeline by ID, including status, duration, and trigger info',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            pipeline_id: {
              type: 'number',
              description: 'Numeric pipeline ID',
            },
          },
          required: ['project_id', 'pipeline_id'],
        },
      },
      {
        name: 'cancel_pipeline',
        description: 'Cancel a running pipeline by project and pipeline ID — stops all queued and running jobs',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            pipeline_id: {
              type: 'number',
              description: 'Numeric pipeline ID to cancel',
            },
          },
          required: ['project_id', 'pipeline_id'],
        },
      },
      {
        name: 'list_pipeline_jobs',
        description: 'List all jobs in a specific pipeline with their status, name, stage, and duration',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            pipeline_id: {
              type: 'number',
              description: 'Numeric pipeline ID',
            },
            scope: {
              type: 'string',
              description: 'Filter by job status: created, pending, running, failed, success, canceled, skipped, manual',
            },
          },
          required: ['project_id', 'pipeline_id'],
        },
      },
      {
        name: 'get_job_log',
        description: 'Get the raw log output for a specific CI/CD job — useful for diagnosing build failures',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            job_id: {
              type: 'number',
              description: 'Numeric job ID',
            },
          },
          required: ['project_id', 'job_id'],
        },
      },
      {
        name: 'list_commits',
        description: 'List commits in a project on a specified branch or ref with optional path and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            ref_name: {
              type: 'string',
              description: 'Branch, tag, or commit SHA to list commits from (default: default branch)',
            },
            path: {
              type: 'string',
              description: 'Filter commits that changed this file path',
            },
            since: {
              type: 'string',
              description: 'Only commits after this ISO 8601 datetime',
            },
            until: {
              type: 'string',
              description: 'Only commits before this ISO 8601 datetime',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_commit',
        description: 'Get details of a specific commit by SHA, including message, author, and changed file statistics',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            sha: {
              type: 'string',
              description: 'Full commit SHA',
            },
          },
          required: ['project_id', 'sha'],
        },
      },
      {
        name: 'list_branches',
        description: 'List branches in a GitLab project with optional search filter',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            search: {
              type: 'string',
              description: 'Filter branches by name substring',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_branch',
        description: 'Get details of a specific branch including the latest commit SHA and protection status',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            branch: {
              type: 'string',
              description: 'Branch name',
            },
          },
          required: ['project_id', 'branch'],
        },
      },
      {
        name: 'list_releases',
        description: 'List releases for a GitLab project, sorted by release date descending',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_tags',
        description: 'List repository tags for a GitLab project with optional search filter',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            search: {
              type: 'string',
              description: 'Filter tags by name substring',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_file',
        description: 'Get the contents of a file from a GitLab repository; content is returned Base64-encoded in the response',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            file_path: {
              type: 'string',
              description: 'URL-encoded path to the file (e.g. src%2Findex.ts or src/index.ts)',
            },
            ref: {
              type: 'string',
              description: 'Branch name, tag, or commit SHA (default: HEAD)',
            },
          },
          required: ['project_id', 'file_path', 'ref'],
        },
      },
      {
        name: 'list_members',
        description: 'List members of a GitLab project with their access level and joined date',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or URL-encoded namespace/path',
            },
            query: {
              type: 'string',
              description: 'Filter members by username or name substring',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['project_id'],
        },
      },
    ];
  }

  private get authHeaders(): Record<string, string> {
    return {
      'PRIVATE-TOKEN': this.privateToken,
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
        content: [{ type: 'text', text: `GitLab API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getText(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `GitLab API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const text = await response.text();
    return {
      content: [{ type: 'text', text: this.truncate(text) }],
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
        content: [{ type: 'text', text: `GitLab API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async put(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `GitLab API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private p(projectId: string): string {
    return `/projects/${encodeURIComponent(projectId)}`;
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    });
    if (args.search) params.set('search', args.search as string);
    if (args.owned) params.set('owned', 'true');
    if (args.membership) params.set('membership', 'true');
    if (args.visibility) params.set('visibility', args.visibility as string);
    if (args.order_by) params.set('order_by', args.order_by as string);
    if (args.sort) params.set('sort', args.sort as string);
    return this.get(`/projects?${params}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    if (!id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.get(this.p(id));
  }

  private async searchProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const search = args.search as string;
    if (!search) return { content: [{ type: 'text', text: 'search is required' }], isError: true };
    const params = new URLSearchParams({
      search,
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    });
    return this.get(`/projects?${params}`);
  }

  private async listIssues(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    if (!id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params = new URLSearchParams({
      state: (args.state as string) ?? 'opened',
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    });
    if (args.labels) params.set('labels', args.labels as string);
    if (args.assignee_id) params.set('assignee_id', String(args.assignee_id));
    if (args.milestone) params.set('milestone', args.milestone as string);
    if (args.search) params.set('search', args.search as string);
    return this.get(`${this.p(id)}/issues?${params}`);
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const iid = args.issue_iid as number;
    if (!id || !iid) return { content: [{ type: 'text', text: 'project_id and issue_iid are required' }], isError: true };
    return this.get(`${this.p(id)}/issues/${iid}`);
  }

  private async createIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const title = args.title as string;
    if (!id || !title) return { content: [{ type: 'text', text: 'project_id and title are required' }], isError: true };
    const body: Record<string, unknown> = { title };
    if (args.description) body.description = args.description;
    if (args.labels) body.labels = args.labels;
    if (args.assignee_ids) body.assignee_ids = args.assignee_ids;
    if (args.milestone_id) body.milestone_id = args.milestone_id;
    return this.post(`${this.p(id)}/issues`, body);
  }

  private async updateIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const iid = args.issue_iid as number;
    if (!id || !iid) return { content: [{ type: 'text', text: 'project_id and issue_iid are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.description) body.description = args.description;
    if (args.state_event) body.state_event = args.state_event;
    if (args.labels) body.labels = args.labels;
    if (args.assignee_ids) body.assignee_ids = args.assignee_ids;
    return this.put(`${this.p(id)}/issues/${iid}`, body);
  }

  private async listMergeRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    if (!id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params = new URLSearchParams({
      state: (args.state as string) ?? 'opened',
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    });
    if (args.source_branch) params.set('source_branch', args.source_branch as string);
    if (args.target_branch) params.set('target_branch', args.target_branch as string);
    if (args.labels) params.set('labels', args.labels as string);
    if (args.author_id) params.set('author_id', String(args.author_id));
    return this.get(`${this.p(id)}/merge_requests?${params}`);
  }

  private async getMergeRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const iid = args.merge_request_iid as number;
    if (!id || !iid) return { content: [{ type: 'text', text: 'project_id and merge_request_iid are required' }], isError: true };
    return this.get(`${this.p(id)}/merge_requests/${iid}`);
  }

  private async createMergeRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const title = args.title as string;
    const sourceBranch = args.source_branch as string;
    const targetBranch = args.target_branch as string;
    if (!id || !title || !sourceBranch || !targetBranch) {
      return { content: [{ type: 'text', text: 'project_id, title, source_branch, and target_branch are required' }], isError: true };
    }
    const body: Record<string, unknown> = { title, source_branch: sourceBranch, target_branch: targetBranch };
    if (args.description) body.description = args.description;
    if (args.assignee_id) body.assignee_id = args.assignee_id;
    if (args.labels) body.labels = args.labels;
    if (typeof args.draft === 'boolean' && args.draft) body.title = `Draft: ${title}`;
    return this.post(`${this.p(id)}/merge_requests`, body);
  }

  private async addMrNote(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const iid = args.merge_request_iid as number;
    const body = args.body as string;
    if (!id || !iid || !body) return { content: [{ type: 'text', text: 'project_id, merge_request_iid, and body are required' }], isError: true };
    return this.post(`${this.p(id)}/merge_requests/${iid}/notes`, { body });
  }

  private async listPipelines(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    if (!id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params = new URLSearchParams({
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    });
    if (args.status) params.set('status', args.status as string);
    if (args.ref) params.set('ref', args.ref as string);
    if (args.sha) params.set('sha', args.sha as string);
    return this.get(`${this.p(id)}/pipelines?${params}`);
  }

  private async getPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const pipelineId = args.pipeline_id as number;
    if (!id || !pipelineId) return { content: [{ type: 'text', text: 'project_id and pipeline_id are required' }], isError: true };
    return this.get(`${this.p(id)}/pipelines/${pipelineId}`);
  }

  private async cancelPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const pipelineId = args.pipeline_id as number;
    if (!id || !pipelineId) return { content: [{ type: 'text', text: 'project_id and pipeline_id are required' }], isError: true };
    return this.post(`${this.p(id)}/pipelines/${pipelineId}/cancel`, {});
  }

  private async listPipelineJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const pipelineId = args.pipeline_id as number;
    if (!id || !pipelineId) return { content: [{ type: 'text', text: 'project_id and pipeline_id are required' }], isError: true };
    const params = new URLSearchParams();
    if (args.scope) params.set('scope[]', args.scope as string);
    const qs = params.toString() ? `?${params}` : '';
    return this.get(`${this.p(id)}/pipelines/${pipelineId}/jobs${qs}`);
  }

  private async getJobLog(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const jobId = args.job_id as number;
    if (!id || !jobId) return { content: [{ type: 'text', text: 'project_id and job_id are required' }], isError: true };
    return this.getText(`${this.p(id)}/jobs/${jobId}/trace`);
  }

  private async listCommits(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    if (!id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params = new URLSearchParams({
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    });
    if (args.ref_name) params.set('ref_name', args.ref_name as string);
    if (args.path) params.set('path', args.path as string);
    if (args.since) params.set('since', args.since as string);
    if (args.until) params.set('until', args.until as string);
    return this.get(`${this.p(id)}/repository/commits?${params}`);
  }

  private async getCommit(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const sha = args.sha as string;
    if (!id || !sha) return { content: [{ type: 'text', text: 'project_id and sha are required' }], isError: true };
    return this.get(`${this.p(id)}/repository/commits/${encodeURIComponent(sha)}`);
  }

  private async listBranches(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    if (!id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params = new URLSearchParams({
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    });
    if (args.search) params.set('search', args.search as string);
    return this.get(`${this.p(id)}/repository/branches?${params}`);
  }

  private async getBranch(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const branch = args.branch as string;
    if (!id || !branch) return { content: [{ type: 'text', text: 'project_id and branch are required' }], isError: true };
    return this.get(`${this.p(id)}/repository/branches/${encodeURIComponent(branch)}`);
  }

  private async listReleases(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    if (!id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params = new URLSearchParams({
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    });
    return this.get(`${this.p(id)}/releases?${params}`);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    if (!id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params = new URLSearchParams({
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    });
    if (args.search) params.set('search', args.search as string);
    return this.get(`${this.p(id)}/repository/tags?${params}`);
  }

  private async getFile(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    const filePath = args.file_path as string;
    const ref = args.ref as string;
    if (!id || !filePath || !ref) return { content: [{ type: 'text', text: 'project_id, file_path, and ref are required' }], isError: true };
    const encodedPath = filePath.includes('%') ? filePath : encodeURIComponent(filePath);
    return this.get(`${this.p(id)}/repository/files/${encodedPath}?ref=${encodeURIComponent(ref)}`);
  }

  private async listMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.project_id as string;
    if (!id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params = new URLSearchParams({
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    });
    if (args.query) params.set('query', args.query as string);
    return this.get(`${this.p(id)}/members?${params}`);
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects':      return await this.listProjects(args);
        case 'get_project':        return await this.getProject(args);
        case 'search_projects':    return await this.searchProjects(args);
        case 'list_issues':        return await this.listIssues(args);
        case 'get_issue':          return await this.getIssue(args);
        case 'create_issue':       return await this.createIssue(args);
        case 'update_issue':       return await this.updateIssue(args);
        case 'list_merge_requests':return await this.listMergeRequests(args);
        case 'get_merge_request':  return await this.getMergeRequest(args);
        case 'create_merge_request':return await this.createMergeRequest(args);
        case 'add_mr_note':        return await this.addMrNote(args);
        case 'list_pipelines':     return await this.listPipelines(args);
        case 'get_pipeline':       return await this.getPipeline(args);
        case 'cancel_pipeline':    return await this.cancelPipeline(args);
        case 'list_pipeline_jobs': return await this.listPipelineJobs(args);
        case 'get_job_log':        return await this.getJobLog(args);
        case 'list_commits':       return await this.listCommits(args);
        case 'get_commit':         return await this.getCommit(args);
        case 'list_branches':      return await this.listBranches(args);
        case 'get_branch':         return await this.getBranch(args);
        case 'list_releases':      return await this.listReleases(args);
        case 'list_tags':          return await this.listTags(args);
        case 'get_file':           return await this.getFile(args);
        case 'list_members':       return await this.listMembers(args);
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
