/**
 * Azure DevOps MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/microsoft/azure-devops-mcp — transport: stdio + streamable-HTTP
//   (Remote MCP in public preview), auth: PAT / Entra ID. Actively maintained (2025-2026 commits).
//   Published as @azure-devops/mcp on npm. 50+ tools across domains: core, work, work-items,
//   repositories, wiki, pipelines, test-plans, search, advanced-security.
//   Meets all 4 MCP criteria: official, maintained, 50+ tools, stdio + streamable-HTTP.
// Our adapter covers: 22 tools (work items, repositories, pull requests, builds, pipelines,
//   releases, sprints, test plans) for air-gapped or PAT-only deployments.
// Recommendation: use-both — the official MCP covers repos/work-items/pipelines/wiki/search/
//   advanced-security with 50+ tools. However, Classic Release Management (VSRM:
//   list_releases, get_release, create_release via vsrm.dev.azure.com) is NOT covered by the
//   official MCP. Our REST adapter is authoritative for release management tools.
//
// Integration: use-both
// MCP-sourced tools (50+): mcp_ado_core_list_projects, mcp_ado_core_list_project_teams,
//   mcp_ado_core_get_identity_ids, mcp_ado_repo_list_repos_by_project,
//   mcp_ado_repo_get_repo_by_name_or_id, mcp_ado_repo_list_branches_by_repo,
//   mcp_ado_repo_list_my_branches_by_repo, mcp_ado_repo_get_branch_by_name,
//   mcp_ado_repo_create_branch, mcp_ado_repo_search_commits,
//   mcp_ado_repo_list_pull_requests_by_repo_or_project, mcp_ado_repo_list_pull_requests_by_commits,
//   mcp_ado_repo_get_pull_request_by_id, mcp_ado_repo_create_pull_request,
//   mcp_ado_repo_update_pull_request, mcp_ado_repo_update_pull_request_reviewers,
//   mcp_ado_repo_list_pull_request_threads, mcp_ado_repo_list_pull_request_thread_comments,
//   mcp_ado_wit_get_work_item, mcp_ado_wit_list_work_items, mcp_ado_wit_create_work_item,
//   mcp_ado_wit_update_work_item, mcp_ado_wit_update_work_items_batch,
//   mcp_ado_wit_add_child_work_items, mcp_ado_wit_work_items_link,
//   mcp_ado_pipelines_create_pipeline, mcp_ado_pipelines_get_builds,
//   mcp_ado_pipelines_get_build_status, mcp_ado_pipelines_get_build_log,
//   mcp_ado_pipelines_get_build_log_by_id, mcp_ado_pipelines_get_build_changes,
//   mcp_ado_pipelines_get_build_definitions, mcp_ado_pipelines_list_runs,
//   mcp_ado_pipelines_run_pipeline, mcp_ado_pipelines_get_run,
//   mcp_ado_pipelines_update_build_stage, mcp_ado_search_code, mcp_ado_search_wiki,
//   mcp_ado_search_workitem, mcp_ado_wiki_list_wikis, mcp_ado_wiki_get_wiki,
//   mcp_ado_wiki_list_pages, mcp_ado_wiki_get_page, mcp_ado_wiki_get_page_content,
//   mcp_ado_wiki_create_or_update_page, mcp_ado_testplan_* (multiple),
//   mcp_ado_advsec_get_alerts, mcp_ado_advsec_get_alert_details
// REST-sourced tools (3 — not covered by MCP): list_releases, get_release, create_release
//   (Classic Release Management via vsrm.dev.azure.com is absent from the official MCP)
// Shared tools (routed through MCP by FederationManager): list_projects, list_repositories,
//   get_repository, list_pull_requests, get_pull_request, create_pull_request,
//   get_work_item, list_work_items, query_work_items, create_work_item, update_work_item,
//   list_iterations, list_iteration_work_items, list_builds, get_build, queue_build,
//   list_pipeline_definitions, get_pipeline_definition, list_test_plans
//
// Base URL: https://dev.azure.com/{organization} (or https://vsrm.dev.azure.com for Release Management)
// Auth: Basic auth with PAT — Authorization: Basic base64(:{pat})
// Docs: https://learn.microsoft.com/en-us/rest/api/azure/devops/?view=azure-devops-rest-7.2
// Rate limits: ~200 req/s per organization; Boards and Git APIs have separate limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AzureDevOpsConfig {
  organization: string;
  personalAccessToken: string;
  baseUrl?: string;
}

function truncate(text: string): string {
  return text.length > 10_000
    ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
    : text;
}

export class AzureDevOpsMCPServer extends MCPAdapterBase {
  private readonly organization: string;
  private readonly pat: string;
  private readonly baseUrl: string;
  private readonly vsrmBaseUrl: string;

  constructor(config: AzureDevOpsConfig) {
    super();
    this.organization = config.organization;
    this.pat = config.personalAccessToken;
    this.baseUrl = (config.baseUrl || 'https://dev.azure.com').replace(/\/$/, '');
    this.vsrmBaseUrl = `https://vsrm.dev.azure.com`;
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`:${this.pat}`).toString('base64')}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'azure-devops',
      displayName: 'Azure DevOps',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['azure devops', 'ado', 'devops', 'work item', 'boards', 'pipeline', 'build', 'release', 'repository', 'pull request', 'sprint', 'git', 'ci cd', 'test plan'],
      toolNames: [
        'list_projects',
        'list_repositories', 'get_repository',
        'list_pull_requests', 'get_pull_request', 'create_pull_request',
        'get_work_item', 'list_work_items', 'query_work_items', 'create_work_item', 'update_work_item',
        'list_iterations', 'list_iteration_work_items',
        'list_builds', 'get_build', 'queue_build',
        'list_pipeline_definitions', 'get_pipeline_definition',
        'list_releases', 'get_release', 'create_release',
        'list_test_plans',
      ],
      description: 'Azure DevOps operations: projects, repos, pull requests, work items, boards, pipelines, builds, releases, and test plans.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Projects ─────────────────────────────────────────────────────────
      {
        name: 'list_projects',
        description: 'List all team projects in the Azure DevOps organization with optional state filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            stateFilter: { type: 'string', description: 'Filter by project state: wellFormed, createPending, deleting, new, all (default: wellFormed)' },
            top: { type: 'number', description: 'Maximum number of projects to return (default: 100)' },
            skip: { type: 'number', description: 'Number of projects to skip for pagination' },
          },
        },
      },
      // ── Repositories ─────────────────────────────────────────────────────
      {
        name: 'list_repositories',
        description: 'List all Git repositories in an Azure DevOps project.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            includeHidden: { type: 'boolean', description: 'Include hidden repositories (default: false)' },
          },
          required: ['project'],
        },
      },
      {
        name: 'get_repository',
        description: 'Get details for a specific Git repository including default branch and remote URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            repositoryId: { type: 'string', description: 'Repository name or ID' },
          },
          required: ['project', 'repositoryId'],
        },
      },
      // ── Pull Requests ────────────────────────────────────────────────────
      {
        name: 'list_pull_requests',
        description: 'List pull requests in a repository with optional status, creator, and reviewer filters.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            repositoryId: { type: 'string', description: 'Repository name or ID' },
            status: { type: 'string', description: 'Filter by status: active, completed, abandoned, all (default: active)' },
            createdBy: { type: 'string', description: 'Filter by creator display name or email' },
            top: { type: 'number', description: 'Maximum number of PRs to return (default: 25)' },
            skip: { type: 'number', description: 'Number of PRs to skip for pagination' },
          },
          required: ['project', 'repositoryId'],
        },
      },
      {
        name: 'get_pull_request',
        description: 'Get details for a specific pull request including reviewers, commits, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            repositoryId: { type: 'string', description: 'Repository name or ID' },
            pullRequestId: { type: 'number', description: 'Pull request ID' },
          },
          required: ['project', 'repositoryId', 'pullRequestId'],
        },
      },
      {
        name: 'create_pull_request',
        description: 'Create a new pull request in a repository.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            repositoryId: { type: 'string', description: 'Repository name or ID' },
            title: { type: 'string', description: 'Pull request title' },
            description: { type: 'string', description: 'Pull request description (Markdown supported)' },
            sourceBranch: { type: 'string', description: 'Source branch ref, e.g. refs/heads/feature/my-feature' },
            targetBranch: { type: 'string', description: 'Target branch ref, e.g. refs/heads/main' },
            reviewers: { type: 'string', description: 'Comma-separated list of reviewer emails or display names' },
            isDraft: { type: 'boolean', description: 'Create as a draft pull request (default: false)' },
          },
          required: ['project', 'repositoryId', 'title', 'sourceBranch', 'targetBranch'],
        },
      },
      // ── Work Items ───────────────────────────────────────────────────────
      {
        name: 'get_work_item',
        description: 'Get a specific work item by ID with all fields.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Work item ID' },
            project: { type: 'string', description: 'Team project name (optional, narrows scope)' },
            expand: { type: 'string', description: 'Expand relations, fields, or links: none, relations, fields, links, all (default: fields)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_work_items',
        description: 'Fetch multiple work items by IDs in a single batch request.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated list of work item IDs, e.g. 1,2,3,100' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return, e.g. System.Title,System.State,System.AssignedTo' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'query_work_items',
        description: 'Execute a WIQL query to find work items by state, type, assignee, or custom conditions.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            wiql: { type: 'string', description: 'WIQL query, e.g. SELECT [System.Id],[System.Title] FROM WorkItems WHERE [System.State] = \'Active\' AND [System.TeamProject] = @project' },
            top: { type: 'number', description: 'Maximum number of work item IDs to return (default: 100)' },
          },
          required: ['project', 'wiql'],
        },
      },
      {
        name: 'create_work_item',
        description: 'Create a new work item (Task, Bug, User Story, Epic, Feature, etc.) in a project.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            type: { type: 'string', description: 'Work item type: Task, Bug, User Story, Epic, Feature, Issue, Test Case' },
            title: { type: 'string', description: 'Work item title' },
            description: { type: 'string', description: 'Description (HTML supported)' },
            assignedTo: { type: 'string', description: 'Display name or email of the person to assign the work item to' },
            priority: { type: 'number', description: 'Priority: 1=Critical, 2=High, 3=Medium, 4=Low' },
            areaPath: { type: 'string', description: 'Area path for the work item, e.g. MyProject\\TeamA' },
            iterationPath: { type: 'string', description: 'Iteration path (sprint), e.g. MyProject\\Sprint 1' },
            tags: { type: 'string', description: 'Semicolon-separated tags, e.g. backend;bug;needs-review' },
          },
          required: ['project', 'type', 'title'],
        },
      },
      {
        name: 'update_work_item',
        description: 'Update fields on an existing work item such as state, assignee, priority, or title.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Work item ID' },
            title: { type: 'string', description: 'New title' },
            state: { type: 'string', description: 'New state, e.g. Active, Resolved, Closed, New' },
            assignedTo: { type: 'string', description: 'Display name or email of the new assignee' },
            priority: { type: 'number', description: 'New priority: 1=Critical, 2=High, 3=Medium, 4=Low' },
            comment: { type: 'string', description: 'Comment to add to the work item history' },
          },
          required: ['id'],
        },
      },
      // ── Iterations / Sprints ─────────────────────────────────────────────
      {
        name: 'list_iterations',
        description: 'List sprint iterations for a team in a project.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            team: { type: 'string', description: 'Team name (default: project default team)' },
            timeFrame: { type: 'string', description: 'Filter by time frame: past, current, future (default: all)' },
          },
          required: ['project'],
        },
      },
      {
        name: 'list_iteration_work_items',
        description: 'List work items assigned to a specific sprint iteration.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            team: { type: 'string', description: 'Team name (default: project default team)' },
            iterationId: { type: 'string', description: 'Iteration GUID or path' },
          },
          required: ['project', 'iterationId'],
        },
      },
      // ── Builds ───────────────────────────────────────────────────────────
      {
        name: 'list_builds',
        description: 'List build runs for a project with optional pipeline, status, and result filters.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            definitionId: { type: 'number', description: 'Filter by pipeline definition ID' },
            statusFilter: { type: 'string', description: 'Filter by build status: inProgress, completed, cancelling, postponed, notStarted, all (default: all)' },
            resultFilter: { type: 'string', description: 'Filter by build result: succeeded, partiallySucceeded, failed, canceled' },
            branchName: { type: 'string', description: 'Filter by branch, e.g. refs/heads/main' },
            top: { type: 'number', description: 'Maximum number of builds to return (default: 25)' },
          },
          required: ['project'],
        },
      },
      {
        name: 'get_build',
        description: 'Get details for a specific build run including timeline, logs, and artifacts.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            buildId: { type: 'number', description: 'Build run ID' },
          },
          required: ['project', 'buildId'],
        },
      },
      {
        name: 'queue_build',
        description: 'Queue (trigger) a new build for a pipeline definition.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            definitionId: { type: 'number', description: 'Pipeline definition ID to queue a build for' },
            sourceBranch: { type: 'string', description: 'Source branch ref, e.g. refs/heads/main (default: pipeline default branch)' },
            parameters: { type: 'string', description: 'JSON string of pipeline parameters key-value pairs' },
          },
          required: ['project', 'definitionId'],
        },
      },
      // ── Pipeline Definitions ──────────────────────────────────────────────
      {
        name: 'list_pipeline_definitions',
        description: 'List pipeline (build) definitions in a project with optional name filter.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            name: { type: 'string', description: 'Filter by pipeline name (supports wildcards)' },
            path: { type: 'string', description: 'Filter by folder path, e.g. \\TeamA' },
          },
          required: ['project'],
        },
      },
      {
        name: 'get_pipeline_definition',
        description: 'Get the full YAML or classic definition for a specific pipeline.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            definitionId: { type: 'number', description: 'Pipeline definition ID' },
          },
          required: ['project', 'definitionId'],
        },
      },
      // ── Releases ──────────────────────────────────────────────────────────
      {
        name: 'list_releases',
        description: 'List release deployments in a project with optional definition and environment filters.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            definitionId: { type: 'number', description: 'Release definition ID' },
            statusFilter: { type: 'string', description: 'Filter by release status: draft, active, abandoned, undefined (default: active)' },
            top: { type: 'number', description: 'Maximum number of releases to return (default: 25)' },
          },
          required: ['project'],
        },
      },
      {
        name: 'get_release',
        description: 'Get details for a specific release including environments and deployment status.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            releaseId: { type: 'number', description: 'Release ID' },
          },
          required: ['project', 'releaseId'],
        },
      },
      {
        name: 'create_release',
        description: 'Create a new release from a release definition.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            definitionId: { type: 'number', description: 'Release definition ID' },
            description: { type: 'string', description: 'Release description or notes' },
            artifactAlias: { type: 'string', description: 'Artifact alias to pin a specific version' },
            artifactVersion: { type: 'string', description: 'Artifact version to use (build ID or tag)' },
          },
          required: ['project', 'definitionId'],
        },
      },
      // ── Test Plans ────────────────────────────────────────────────────────
      {
        name: 'list_test_plans',
        description: 'List test plans in a project with optional owner and active/inactive filter.',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Team project name or ID' },
            owner: { type: 'string', description: 'Filter by test plan owner display name or email' },
            isDeleted: { type: 'boolean', description: 'Include deleted test plans (default: false)' },
          },
          required: ['project'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects':             return this.listProjects(args);
        case 'list_repositories':         return this.listRepositories(args);
        case 'get_repository':            return this.getRepository(args);
        case 'list_pull_requests':        return this.listPullRequests(args);
        case 'get_pull_request':          return this.getPullRequest(args);
        case 'create_pull_request':       return this.createPullRequest(args);
        case 'get_work_item':             return this.getWorkItem(args);
        case 'list_work_items':           return this.listWorkItems(args);
        case 'query_work_items':          return this.queryWorkItems(args);
        case 'create_work_item':          return this.createWorkItem(args);
        case 'update_work_item':          return this.updateWorkItem(args);
        case 'list_iterations':           return this.listIterations(args);
        case 'list_iteration_work_items': return this.listIterationWorkItems(args);
        case 'list_builds':               return this.listBuilds(args);
        case 'get_build':                 return this.getBuild(args);
        case 'queue_build':               return this.queueBuild(args);
        case 'list_pipeline_definitions': return this.listPipelineDefinitions(args);
        case 'get_pipeline_definition':   return this.getPipelineDefinition(args);
        case 'list_releases':             return this.listReleases(args);
        case 'get_release':               return this.getRelease(args);
        case 'create_release':            return this.createRelease(args);
        case 'list_test_plans':           return this.listTestPlans(args);
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async fetchJSON(url: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...options });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Azure DevOps returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private orgUrl(project?: string): string {
    return project
      ? `${this.baseUrl}/${this.organization}/${encodeURIComponent(project)}`
      : `${this.baseUrl}/${this.organization}`;
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.orgUrl()}/_apis/projects?api-version=7.1`;
    if (args.stateFilter) url += `&stateFilter=${encodeURIComponent(String(args.stateFilter))}`;
    if (args.top) url += `&$top=${encodeURIComponent(args.top as string)}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(args.skip as string)}`;
    return this.fetchJSON(url);
  }

  // ── Repositories ──────────────────────────────────────────────────────────

  private async listRepositories(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.orgUrl(args.project as string)}/_apis/git/repositories?api-version=7.1`;
    if (args.includeHidden) url += `&includeHidden=true`;
    return this.fetchJSON(url);
  }

  private async getRepository(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.orgUrl(args.project as string)}/_apis/git/repositories/${encodeURIComponent(String(args.repositoryId))}?api-version=7.1`;
    return this.fetchJSON(url);
  }

  // ── Pull Requests ─────────────────────────────────────────────────────────

  private async listPullRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const project = args.project as string;
    const repo = encodeURIComponent(String(args.repositoryId));
    let url = `${this.orgUrl(project)}/_apis/git/repositories/${repo}/pullrequests?api-version=7.1`;
    url += `&searchCriteria.status=${encodeURIComponent(String(args.status ?? 'active'))}`;
    if (args.createdBy) url += `&searchCriteria.creatorId=${encodeURIComponent(String(args.createdBy))}`;
    if (args.top) url += `&$top=${encodeURIComponent(args.top as string)}`;
    if (args.skip) url += `&$skip=${encodeURIComponent(args.skip as string)}`;
    return this.fetchJSON(url);
  }

  private async getPullRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const project = args.project as string;
    const repo = encodeURIComponent(String(args.repositoryId));
    const prId = args.pullRequestId as number;
    const url = `${this.orgUrl(project)}/_apis/git/repositories/${repo}/pullrequests/${prId}?api-version=7.1`;
    return this.fetchJSON(url);
  }

  private async createPullRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const project = args.project as string;
    const repo = encodeURIComponent(String(args.repositoryId));
    const url = `${this.orgUrl(project)}/_apis/git/repositories/${repo}/pullrequests?api-version=7.1`;
    const body: Record<string, unknown> = {
      title: args.title,
      description: args.description ?? '',
      sourceRefName: args.sourceBranch,
      targetRefName: args.targetBranch,
      isDraft: args.isDraft ?? false,
    };
    if (args.reviewers) {
      body.reviewers = String(args.reviewers).split(',').map(r => ({ uniqueName: r.trim() }));
    }
    return this.fetchJSON(url, { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Work Items ────────────────────────────────────────────────────────────

  private async getWorkItem(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    const expand = (args.expand as string) ?? 'fields';
    const base = args.project
      ? this.orgUrl(args.project as string)
      : this.orgUrl();
    const url = `${base}/_apis/wit/workitems/${id}?api-version=7.1&$expand=${expand}`;
    return this.fetchJSON(url);
  }

  private async listWorkItems(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = String(args.ids);
    let url = `${this.orgUrl()}/_apis/wit/workitems?ids=${encodeURIComponent(ids)}&api-version=7.1`;
    if (args.fields) url += `&fields=${encodeURIComponent(String(args.fields))}`;
    return this.fetchJSON(url);
  }

  private async queryWorkItems(args: Record<string, unknown>): Promise<ToolResult> {
    const project = args.project as string;
    const wiql = args.wiql as string;
    const url = `${this.orgUrl(project)}/_apis/wit/wiql?api-version=7.1${args.top ? `&$top=${encodeURIComponent(args.top as string)}` : ''}`;
    return this.fetchJSON(url, { method: 'POST', body: JSON.stringify({ query: wiql }) });
  }

  private async createWorkItem(args: Record<string, unknown>): Promise<ToolResult> {
    const project = args.project as string;
    const type = encodeURIComponent(String(args.type));
    const url = `${this.orgUrl(project)}/_apis/wit/workitems/$${type}?api-version=7.1`;

    const patchDoc: Array<{ op: string; path: string; value: unknown }> = [
      { op: 'add', path: '/fields/System.Title', value: args.title },
    ];
    if (args.description) patchDoc.push({ op: 'add', path: '/fields/System.Description', value: args.description });
    if (args.assignedTo) patchDoc.push({ op: 'add', path: '/fields/System.AssignedTo', value: args.assignedTo });
    if (args.priority) patchDoc.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: args.priority });
    if (args.areaPath) patchDoc.push({ op: 'add', path: '/fields/System.AreaPath', value: args.areaPath });
    if (args.iterationPath) patchDoc.push({ op: 'add', path: '/fields/System.IterationPath', value: args.iterationPath });
    if (args.tags) patchDoc.push({ op: 'add', path: '/fields/System.Tags', value: args.tags });

    return this.fetchJSON(url, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json-patch+json' },
      body: JSON.stringify(patchDoc),
    } as RequestInit);
  }

  private async updateWorkItem(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    const url = `${this.orgUrl()}/_apis/wit/workitems/${id}?api-version=7.1`;

    const patchDoc: Array<{ op: string; path: string; value: unknown }> = [];
    if (args.title) patchDoc.push({ op: 'replace', path: '/fields/System.Title', value: args.title });
    if (args.state) patchDoc.push({ op: 'replace', path: '/fields/System.State', value: args.state });
    if (args.assignedTo) patchDoc.push({ op: 'replace', path: '/fields/System.AssignedTo', value: args.assignedTo });
    if (args.priority) patchDoc.push({ op: 'replace', path: '/fields/Microsoft.VSTS.Common.Priority', value: args.priority });
    if (args.comment) patchDoc.push({ op: 'add', path: '/fields/System.History', value: args.comment });

    if (patchDoc.length === 0) {
      return { content: [{ type: 'text', text: 'No fields provided to update.' }], isError: true };
    }

    return this.fetchJSON(url, {
      method: 'PATCH',
      headers: { ...this.headers, 'Content-Type': 'application/json-patch+json' },
      body: JSON.stringify(patchDoc),
    } as RequestInit);
  }

  // ── Iterations ────────────────────────────────────────────────────────────

  private async listIterations(args: Record<string, unknown>): Promise<ToolResult> {
    const project = args.project as string;
    const team = args.team ? encodeURIComponent(String(args.team)) : undefined;
    const base = team
      ? `${this.orgUrl(project)}/${team}`
      : this.orgUrl(project);
    let url = `${base}/_apis/work/teamsettings/iterations?api-version=7.1`;
    if (args.timeFrame) url += `&$timeframe=${encodeURIComponent(String(args.timeFrame))}`;
    return this.fetchJSON(url);
  }

  private async listIterationWorkItems(args: Record<string, unknown>): Promise<ToolResult> {
    const project = args.project as string;
    const team = args.team ? encodeURIComponent(String(args.team)) : undefined;
    const iterationId = encodeURIComponent(String(args.iterationId));
    const base = team
      ? `${this.orgUrl(project)}/${team}`
      : this.orgUrl(project);
    const url = `${base}/_apis/work/teamsettings/iterations/${iterationId}/workitems?api-version=7.1`;
    return this.fetchJSON(url);
  }

  // ── Builds ────────────────────────────────────────────────────────────────

  private async listBuilds(args: Record<string, unknown>): Promise<ToolResult> {
    const project = args.project as string;
    const top = (args.top as number) ?? 25;
    let url = `${this.orgUrl(project)}/_apis/build/builds?api-version=7.1&$top=${top}`;
    if (args.definitionId) url += `&definitions=${encodeURIComponent(args.definitionId as string)}`;
    if (args.statusFilter) url += `&statusFilter=${encodeURIComponent(String(args.statusFilter))}`;
    if (args.resultFilter) url += `&resultFilter=${encodeURIComponent(String(args.resultFilter))}`;
    if (args.branchName) url += `&branchName=${encodeURIComponent(String(args.branchName))}`;
    return this.fetchJSON(url);
  }

  private async getBuild(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.orgUrl(args.project as string)}/_apis/build/builds/${encodeURIComponent(args.buildId as string)}?api-version=7.1`;
    return this.fetchJSON(url);
  }

  private async queueBuild(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.orgUrl(args.project as string)}/_apis/build/builds?api-version=7.1`;
    const body: Record<string, unknown> = {
      definition: { id: args.definitionId },
    };
    if (args.sourceBranch) body.sourceBranch = args.sourceBranch;
    if (args.parameters) body.parameters = args.parameters;
    return this.fetchJSON(url, { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Pipeline Definitions ──────────────────────────────────────────────────

  private async listPipelineDefinitions(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.orgUrl(args.project as string)}/_apis/build/definitions?api-version=7.1`;
    if (args.name) url += `&name=${encodeURIComponent(String(args.name))}`;
    if (args.path) url += `&path=${encodeURIComponent(String(args.path))}`;
    return this.fetchJSON(url);
  }

  private async getPipelineDefinition(args: Record<string, unknown>): Promise<ToolResult> {
    const url = `${this.orgUrl(args.project as string)}/_apis/build/definitions/${encodeURIComponent(args.definitionId as string)}?api-version=7.1`;
    return this.fetchJSON(url);
  }

  // ── Releases ──────────────────────────────────────────────────────────────

  private async listReleases(args: Record<string, unknown>): Promise<ToolResult> {
    const project = args.project as string;
    const top = (args.top as number) ?? 25;
    let url = `${this.vsrmBaseUrl}/${this.organization}/${encodeURIComponent(project)}/_apis/release/releases?api-version=7.1&$top=${top}`;
    if (args.definitionId) url += `&definitionId=${encodeURIComponent(args.definitionId as string)}`;
    if (args.statusFilter) url += `&statusFilter=${encodeURIComponent(String(args.statusFilter))}`;
    return this.fetchJSON(url);
  }

  private async getRelease(args: Record<string, unknown>): Promise<ToolResult> {
    const project = encodeURIComponent(String(args.project));
    const url = `${this.vsrmBaseUrl}/${this.organization}/${project}/_apis/release/releases/${encodeURIComponent(args.releaseId as string)}?api-version=7.1`;
    return this.fetchJSON(url);
  }

  private async createRelease(args: Record<string, unknown>): Promise<ToolResult> {
    const project = encodeURIComponent(String(args.project));
    const url = `${this.vsrmBaseUrl}/${this.organization}/${project}/_apis/release/releases?api-version=7.1`;
    const body: Record<string, unknown> = {
      definitionId: args.definitionId,
      description: args.description ?? '',
    };
    if (args.artifactAlias && args.artifactVersion) {
      body.artifacts = [{ alias: args.artifactAlias, instanceReference: { id: args.artifactVersion } }];
    }
    return this.fetchJSON(url, { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Test Plans ────────────────────────────────────────────────────────────

  private async listTestPlans(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.orgUrl(args.project as string)}/_apis/testplan/plans?api-version=7.1`;
    if (args.owner) url += `&owner=${encodeURIComponent(String(args.owner))}`;
    if (args.isDeleted) url += `&isDeleted=true`;
    return this.fetchJSON(url);
  }
}
