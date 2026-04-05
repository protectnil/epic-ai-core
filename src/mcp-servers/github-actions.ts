/**
 * GitHub Actions MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/github/github-mcp-server — transport: stdio (Docker/Go binary) and
//   streamable-HTTP (remote), auth: Personal Access Token or GitHub App. Vendor-published, actively
//   maintained (v0.29.0, March 2026). Actions toolset exposes 4 consolidated tools: actions_get,
//   actions_list, actions_run_trigger, get_job_logs.
// Our adapter covers: 22 tools (CI/CD operations). Vendor MCP Actions toolset covers: 4 consolidated tools.
// Recommendation: use-both — our adapter's 22 fine-grained tools cover operations the 4-tool MCP Actions
//   toolset does not expose individually (secrets CRUD, variables CRUD, self-hosted runners, per-job log
//   download, artifact management). MCP's actions_run_trigger covers workflow dispatch which we don't expose.
//   Use vendor MCP for workflow dispatch and high-level listing; use this adapter for fine-grained
//   secrets/variables/runners management and air-gapped deployments.
//
// Integration: use-both
// MCP-sourced tools (4): actions_get, actions_list, actions_run_trigger, get_job_logs
// REST-sourced tools (22): list_workflows, get_workflow, enable_workflow, disable_workflow,
//   list_workflow_runs, get_workflow_run, rerun_workflow, cancel_workflow_run, delete_workflow_run,
//   list_workflow_jobs, get_workflow_job, download_job_logs, list_artifacts, get_artifact,
//   delete_artifact, list_secrets, create_or_update_secret, delete_secret, list_variables,
//   create_or_update_variable, delete_variable, list_self_hosted_runners
// Combined coverage: 26 tools (MCP: 4 + REST: 22 - shared: 0)
//
// Base URL: https://api.github.com
// Auth: Bearer token (Personal Access Token or GitHub App installation token) in Authorization header
//       Header: X-GitHub-Api-Version: 2022-11-28 required on all requests
// Docs: https://docs.github.com/en/rest/actions
// Rate limits: 5,000 req/hr for authenticated requests; 15,000 req/hr for GitHub Apps

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GitHubActionsConfig {
  apiToken: string;
  baseUrl?: string;
}

export class GitHubActionsMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: GitHubActionsConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.github.com';
  }

  static catalog() {
    return {
      name: 'github-actions',
      displayName: 'GitHub Actions',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'github', 'actions', 'ci', 'cd', 'cicd', 'pipeline', 'workflow', 'runner',
        'artifact', 'secret', 'variable', 'job', 'deploy', 'build', 'test', 'automation',
      ],
      toolNames: [
        'list_workflows', 'get_workflow', 'enable_workflow', 'disable_workflow',
        'list_workflow_runs', 'get_workflow_run', 'rerun_workflow', 'cancel_workflow_run',
        'delete_workflow_run', 'list_workflow_jobs', 'get_workflow_job', 'download_job_logs',
        'list_artifacts', 'get_artifact', 'delete_artifact',
        'list_secrets', 'create_or_update_secret', 'delete_secret',
        'list_variables', 'create_or_update_variable', 'delete_variable',
        'list_self_hosted_runners',
      ],
      description: 'GitHub Actions CI/CD: manage workflows, runs, jobs, artifacts, secrets, variables, and self-hosted runners.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workflows',
        description: 'List all workflows in a GitHub repository, including their state and file path',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
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
        name: 'get_workflow',
        description: 'Get a specific workflow by ID or filename from a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            workflow_id: {
              type: 'string',
              description: 'Workflow ID (number) or filename (e.g. main.yml)',
            },
          },
          required: ['owner', 'repo', 'workflow_id'],
        },
      },
      {
        name: 'enable_workflow',
        description: 'Enable a disabled GitHub Actions workflow so it can be triggered',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            workflow_id: {
              type: 'string',
              description: 'Workflow ID (number) or filename (e.g. main.yml)',
            },
          },
          required: ['owner', 'repo', 'workflow_id'],
        },
      },
      {
        name: 'disable_workflow',
        description: 'Disable a GitHub Actions workflow to prevent it from being triggered',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            workflow_id: {
              type: 'string',
              description: 'Workflow ID (number) or filename (e.g. main.yml)',
            },
          },
          required: ['owner', 'repo', 'workflow_id'],
        },
      },
      {
        name: 'list_workflow_runs',
        description: 'List workflow runs for a repository or specific workflow, with optional filters for branch, status, and date',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            workflow_id: {
              type: 'string',
              description: 'Optional workflow ID or filename to filter runs by a specific workflow',
            },
            branch: {
              type: 'string',
              description: 'Filter runs by branch name',
            },
            status: {
              type: 'string',
              description: 'Filter by status: queued, in_progress, completed, waiting, requested, pending',
            },
            conclusion: {
              type: 'string',
              description: 'Filter by conclusion: success, failure, cancelled, skipped, timed_out, action_required',
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
        name: 'get_workflow_run',
        description: 'Get details for a specific GitHub Actions workflow run including status, conclusion, and timing',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            run_id: {
              type: 'number',
              description: 'Unique identifier of the workflow run',
            },
          },
          required: ['owner', 'repo', 'run_id'],
        },
      },
      {
        name: 'rerun_workflow',
        description: 'Re-run all jobs or only failed jobs in a GitHub Actions workflow run',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            run_id: {
              type: 'number',
              description: 'Unique identifier of the workflow run to re-run',
            },
            failed_jobs_only: {
              type: 'boolean',
              description: 'Re-run only failed jobs instead of all jobs (default: false)',
            },
          },
          required: ['owner', 'repo', 'run_id'],
        },
      },
      {
        name: 'cancel_workflow_run',
        description: 'Cancel an in-progress GitHub Actions workflow run',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            run_id: {
              type: 'number',
              description: 'Unique identifier of the workflow run to cancel',
            },
          },
          required: ['owner', 'repo', 'run_id'],
        },
      },
      {
        name: 'delete_workflow_run',
        description: 'Delete a completed GitHub Actions workflow run and its associated logs',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            run_id: {
              type: 'number',
              description: 'Unique identifier of the workflow run to delete',
            },
          },
          required: ['owner', 'repo', 'run_id'],
        },
      },
      {
        name: 'list_workflow_jobs',
        description: 'List jobs for a workflow run, with optional filter for in-progress or completed jobs',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            run_id: {
              type: 'number',
              description: 'Unique identifier of the workflow run',
            },
            filter: {
              type: 'string',
              description: 'Filter jobs: latest (most recent attempt), all (every attempt) (default: latest)',
            },
          },
          required: ['owner', 'repo', 'run_id'],
        },
      },
      {
        name: 'get_workflow_job',
        description: 'Get details for a specific job in a GitHub Actions workflow run, including step results',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            job_id: {
              type: 'number',
              description: 'Unique identifier of the job',
            },
          },
          required: ['owner', 'repo', 'job_id'],
        },
      },
      {
        name: 'download_job_logs',
        description: 'Get the log URL for a specific GitHub Actions job (returns redirect URL to log download)',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            job_id: {
              type: 'number',
              description: 'Unique identifier of the job to retrieve logs for',
            },
          },
          required: ['owner', 'repo', 'job_id'],
        },
      },
      {
        name: 'list_artifacts',
        description: 'List artifacts for a repository or specific workflow run, with optional name filter',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            run_id: {
              type: 'number',
              description: 'Optional: filter artifacts by workflow run ID',
            },
            name: {
              type: 'string',
              description: 'Optional: filter artifacts by name',
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
        name: 'get_artifact',
        description: 'Get metadata for a specific GitHub Actions artifact by artifact ID',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            artifact_id: {
              type: 'number',
              description: 'Unique identifier of the artifact',
            },
          },
          required: ['owner', 'repo', 'artifact_id'],
        },
      },
      {
        name: 'delete_artifact',
        description: 'Delete a GitHub Actions artifact by artifact ID',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            artifact_id: {
              type: 'number',
              description: 'Unique identifier of the artifact to delete',
            },
          },
          required: ['owner', 'repo', 'artifact_id'],
        },
      },
      {
        name: 'list_secrets',
        description: 'List repository or organization Actions secrets (names only — values are never returned by the API)',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name (omit to list organization-level secrets)',
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
          required: ['owner'],
        },
      },
      {
        name: 'create_or_update_secret',
        description: 'Create or update an encrypted Actions secret in a repository. Requires the repo public key for encryption.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            secret_name: {
              type: 'string',
              description: 'Name of the secret (alphanumeric and underscores only)',
            },
            encrypted_value: {
              type: 'string',
              description: 'Base64-encoded encrypted value (encrypted with the repo public key using libsodium sealed box)',
            },
            key_id: {
              type: 'string',
              description: 'ID of the public key used to encrypt the secret value',
            },
          },
          required: ['owner', 'repo', 'secret_name', 'encrypted_value', 'key_id'],
        },
      },
      {
        name: 'delete_secret',
        description: 'Delete an Actions secret from a repository by secret name',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            secret_name: {
              type: 'string',
              description: 'Name of the secret to delete',
            },
          },
          required: ['owner', 'repo', 'secret_name'],
        },
      },
      {
        name: 'list_variables',
        description: 'List Actions variables for a repository or organization (values are returned, unlike secrets)',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name (omit to list organization-level variables)',
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
          required: ['owner'],
        },
      },
      {
        name: 'create_or_update_variable',
        description: 'Create or update a non-secret Actions variable in a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            name: {
              type: 'string',
              description: 'Variable name (alphanumeric and underscores, must start with a letter or underscore)',
            },
            value: {
              type: 'string',
              description: 'Value for the variable (plain text, not encrypted)',
            },
          },
          required: ['owner', 'repo', 'name', 'value'],
        },
      },
      {
        name: 'delete_variable',
        description: 'Delete an Actions variable from a repository by variable name',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name',
            },
            name: {
              type: 'string',
              description: 'Name of the variable to delete',
            },
          },
          required: ['owner', 'repo', 'name'],
        },
      },
      {
        name: 'list_self_hosted_runners',
        description: 'List self-hosted runners registered to a repository or organization with their status and labels',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (username or organization)',
            },
            repo: {
              type: 'string',
              description: 'Repository name (omit to list organization-level runners)',
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
          required: ['owner'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_workflows':
          return this.listWorkflows(args);
        case 'get_workflow':
          return this.getWorkflow(args);
        case 'enable_workflow':
          return this.enableWorkflow(args);
        case 'disable_workflow':
          return this.disableWorkflow(args);
        case 'list_workflow_runs':
          return this.listWorkflowRuns(args);
        case 'get_workflow_run':
          return this.getWorkflowRun(args);
        case 'rerun_workflow':
          return this.rerunWorkflow(args);
        case 'cancel_workflow_run':
          return this.cancelWorkflowRun(args);
        case 'delete_workflow_run':
          return this.deleteWorkflowRun(args);
        case 'list_workflow_jobs':
          return this.listWorkflowJobs(args);
        case 'get_workflow_job':
          return this.getWorkflowJob(args);
        case 'download_job_logs':
          return this.downloadJobLogs(args);
        case 'list_artifacts':
          return this.listArtifacts(args);
        case 'get_artifact':
          return this.getArtifact(args);
        case 'delete_artifact':
          return this.deleteArtifact(args);
        case 'list_secrets':
          return this.listSecrets(args);
        case 'create_or_update_secret':
          return this.createOrUpdateSecret(args);
        case 'delete_secret':
          return this.deleteSecret(args);
        case 'list_variables':
          return this.listVariables(args);
        case 'create_or_update_variable':
          return this.createOrUpdateVariable(args);
        case 'delete_variable':
          return this.deleteVariable(args);
        case 'list_self_hosted_runners':
          return this.listSelfHostedRunners(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  private async ghGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ghPost(path: string, body?: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // 204 No Content — return success indicator
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: 204 }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ghPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204 || response.status === 201) {
      const text = response.status === 201 ? await response.text() : '';
      const result = text ? JSON.parse(text) : { success: true, status: response.status };
      return { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ghDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  private async listWorkflows(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo) return { content: [{ type: 'text', text: 'owner and repo are required' }], isError: true };
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 30),
      page: String((args.page as number) || 1),
    };
    return this.ghGet(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/workflows`, params);
  }

  private async getWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || !args.workflow_id) return { content: [{ type: 'text', text: 'owner, repo, and workflow_id are required' }], isError: true };
    return this.ghGet(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/workflows/${encodeURIComponent(args.workflow_id as string)}`);
  }

  private async enableWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || !args.workflow_id) return { content: [{ type: 'text', text: 'owner, repo, and workflow_id are required' }], isError: true };
    return this.ghPut(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/workflows/${encodeURIComponent(args.workflow_id as string)}/enable`, {});
  }

  private async disableWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || !args.workflow_id) return { content: [{ type: 'text', text: 'owner, repo, and workflow_id are required' }], isError: true };
    return this.ghPut(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/workflows/${encodeURIComponent(args.workflow_id as string)}/disable`, {});
  }

  private async listWorkflowRuns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo) return { content: [{ type: 'text', text: 'owner and repo are required' }], isError: true };
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 30),
      page: String((args.page as number) || 1),
    };
    if (args.branch) params.branch = args.branch as string;
    if (args.status) params.status = args.status as string;
    if (args.conclusion) params.conclusion = args.conclusion as string;

    const basePath = args.workflow_id
      ? `/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/workflows/${encodeURIComponent(args.workflow_id as string)}/runs`
      : `/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/runs`;
    return this.ghGet(basePath, params);
  }

  private async getWorkflowRun(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || args.run_id === undefined) return { content: [{ type: 'text', text: 'owner, repo, and run_id are required' }], isError: true };
    return this.ghGet(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/runs/${encodeURIComponent(args.run_id as string)}`);
  }

  private async rerunWorkflow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || args.run_id === undefined) return { content: [{ type: 'text', text: 'owner, repo, and run_id are required' }], isError: true };
    if (args.failed_jobs_only) {
      return this.ghPost(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/runs/${encodeURIComponent(args.run_id as string)}/rerun-failed-jobs`);
    }
    return this.ghPost(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/runs/${encodeURIComponent(args.run_id as string)}/rerun`);
  }

  private async cancelWorkflowRun(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || args.run_id === undefined) return { content: [{ type: 'text', text: 'owner, repo, and run_id are required' }], isError: true };
    return this.ghPost(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/runs/${encodeURIComponent(args.run_id as string)}/cancel`);
  }

  private async deleteWorkflowRun(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || args.run_id === undefined) return { content: [{ type: 'text', text: 'owner, repo, and run_id are required' }], isError: true };
    return this.ghDelete(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/runs/${encodeURIComponent(args.run_id as string)}`);
  }

  private async listWorkflowJobs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || args.run_id === undefined) return { content: [{ type: 'text', text: 'owner, repo, and run_id are required' }], isError: true };
    const params: Record<string, string> = {
      filter: (args.filter as string) || 'latest',
    };
    return this.ghGet(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/runs/${encodeURIComponent(args.run_id as string)}/jobs`, params);
  }

  private async getWorkflowJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || args.job_id === undefined) return { content: [{ type: 'text', text: 'owner, repo, and job_id are required' }], isError: true };
    return this.ghGet(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/jobs/${encodeURIComponent(args.job_id as string)}`);
  }

  private async downloadJobLogs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || args.job_id === undefined) return { content: [{ type: 'text', text: 'owner, repo, and job_id are required' }], isError: true };
    // This endpoint returns a 302 redirect to the log download URL — capture the Location header
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/jobs/${encodeURIComponent(args.job_id as string)}/logs`,
      { method: 'GET', headers: this.headers, redirect: 'manual' },
    );
    if (response.status === 302) {
      const location = response.headers.get('Location');
      return { content: [{ type: 'text', text: JSON.stringify({ log_download_url: location }) }], isError: false };
    }
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ message: 'Unexpected response status', status: response.status }) }], isError: false };
  }

  private async listArtifacts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo) return { content: [{ type: 'text', text: 'owner and repo are required' }], isError: true };
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 30),
      page: String((args.page as number) || 1),
    };
    if (args.name) params.name = args.name as string;

    const basePath = args.run_id
      ? `/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/runs/${encodeURIComponent(args.run_id as string)}/artifacts`
      : `/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/artifacts`;
    return this.ghGet(basePath, params);
  }

  private async getArtifact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || args.artifact_id === undefined) return { content: [{ type: 'text', text: 'owner, repo, and artifact_id are required' }], isError: true };
    return this.ghGet(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/artifacts/${encodeURIComponent(args.artifact_id as string)}`);
  }

  private async deleteArtifact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || args.artifact_id === undefined) return { content: [{ type: 'text', text: 'owner, repo, and artifact_id are required' }], isError: true };
    return this.ghDelete(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/artifacts/${encodeURIComponent(args.artifact_id as string)}`);
  }

  private async listSecrets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner) return { content: [{ type: 'text', text: 'owner is required' }], isError: true };
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 30),
      page: String((args.page as number) || 1),
    };
    const path = args.repo
      ? `/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/secrets`
      : `/orgs/${encodeURIComponent(args.owner as string)}/actions/secrets`;
    return this.ghGet(path, params);
  }

  private async createOrUpdateSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || !args.secret_name || !args.encrypted_value || !args.key_id) {
      return { content: [{ type: 'text', text: 'owner, repo, secret_name, encrypted_value, and key_id are required' }], isError: true };
    }
    return this.ghPut(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/secrets/${encodeURIComponent(args.secret_name as string)}`, {
      encrypted_value: args.encrypted_value,
      key_id: args.key_id,
    });
  }

  private async deleteSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || !args.secret_name) return { content: [{ type: 'text', text: 'owner, repo, and secret_name are required' }], isError: true };
    return this.ghDelete(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/secrets/${encodeURIComponent(args.secret_name as string)}`);
  }

  private async listVariables(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner) return { content: [{ type: 'text', text: 'owner is required' }], isError: true };
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 30),
      page: String((args.page as number) || 1),
    };
    const path = args.repo
      ? `/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/variables`
      : `/orgs/${encodeURIComponent(args.owner as string)}/actions/variables`;
    return this.ghGet(path, params);
  }

  private async createOrUpdateVariable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || !args.name || args.value === undefined) {
      return { content: [{ type: 'text', text: 'owner, repo, name, and value are required' }], isError: true };
    }
    // Try PATCH (update) first, fall back to POST (create)
    const path = `/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/variables/${encodeURIComponent(args.name as string)}`;
    const patchResponse = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: args.name, value: args.value }),
    });
    if (patchResponse.status === 404) {
      // Variable does not exist — create it
      return this.ghPost(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/variables`, { name: args.name, value: args.value });
    }
    if (!patchResponse.ok) {
      return { content: [{ type: 'text', text: `API error: ${patchResponse.status} ${patchResponse.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: patchResponse.status }) }], isError: false };
  }

  private async deleteVariable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner || !args.repo || !args.name) return { content: [{ type: 'text', text: 'owner, repo, and name are required' }], isError: true };
    return this.ghDelete(`/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/variables/${encodeURIComponent(args.name as string)}`);
  }

  private async listSelfHostedRunners(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.owner) return { content: [{ type: 'text', text: 'owner is required' }], isError: true };
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) || 30),
      page: String((args.page as number) || 1),
    };
    const path = args.repo
      ? `/repos/${encodeURIComponent(args.owner as string)}/${encodeURIComponent(args.repo as string)}/actions/runners`
      : `/orgs/${encodeURIComponent(args.owner as string)}/actions/runners`;
    return this.ghGet(path, params);
  }
}
