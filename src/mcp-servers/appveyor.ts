/**
 * AppVeyor MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Base URL: https://ci.appveyor.com/api
// Auth: Bearer API token (from AppVeyor account settings → API Keys)
// Docs: https://www.appveyor.com/docs/api/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AppVeyorConfig {
  /** AppVeyor API token. Obtain from https://ci.appveyor.com/api-token */
  apiToken: string;
  /** Override base URL for on-premise AppVeyor. Defaults to https://ci.appveyor.com/api */
  baseUrl?: string;
}

export class AppVeyorMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: AppVeyorConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://ci.appveyor.com/api';
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Projects ---
      {
        name: 'list_projects',
        description: 'List all AppVeyor projects accessible to the authenticated user.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_project',
        description: 'Add a new project to AppVeyor from a repository provider.',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryProvider: { type: 'string', description: 'Repository provider: gitHub, bitBucket, gitLab, vso, gitHubEnterprise, gitLabCE, etc.' },
            repositoryName: { type: 'string', description: 'owner/repo name (e.g. myorg/myrepo)' },
          },
          required: ['repositoryProvider', 'repositoryName'],
        },
      },
      {
        name: 'get_project_last_build',
        description: 'Get details of the most recent build for a project.',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'AppVeyor account name' },
            projectSlug: { type: 'string', description: 'Project slug identifier' },
          },
          required: ['accountName', 'projectSlug'],
        },
      },
      {
        name: 'get_project_last_branch_build',
        description: 'Get the most recent build for a specific branch of a project.',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'AppVeyor account name' },
            projectSlug: { type: 'string', description: 'Project slug identifier' },
            buildBranch: { type: 'string', description: 'Branch name' },
          },
          required: ['accountName', 'projectSlug', 'buildBranch'],
        },
      },
      {
        name: 'get_project_build_by_version',
        description: 'Get a specific build by its version string.',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'AppVeyor account name' },
            projectSlug: { type: 'string', description: 'Project slug identifier' },
            buildVersion: { type: 'string', description: 'Build version string (e.g. 1.0.23)' },
          },
          required: ['accountName', 'projectSlug', 'buildVersion'],
        },
      },
      {
        name: 'get_project_history',
        description: 'Get build history for a project with optional branch filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'AppVeyor account name' },
            projectSlug: { type: 'string', description: 'Project slug identifier' },
            recordsNumber: { type: 'number', description: 'Number of history records to return (default: 20)' },
            startBuildId: { type: 'number', description: 'Start pagination from this build ID' },
            branch: { type: 'string', description: 'Filter by branch name' },
          },
          required: ['accountName', 'projectSlug'],
        },
      },
      {
        name: 'get_project_deployments',
        description: 'Get all deployments for a project.',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'AppVeyor account name' },
            projectSlug: { type: 'string', description: 'Project slug identifier' },
          },
          required: ['accountName', 'projectSlug'],
        },
      },
      {
        name: 'get_project_settings',
        description: 'Get settings configuration for a project.',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'AppVeyor account name' },
            projectSlug: { type: 'string', description: 'Project slug identifier' },
          },
          required: ['accountName', 'projectSlug'],
        },
      },
      {
        name: 'get_project_environment_variables',
        description: 'Get environment variables configured for a project.',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'AppVeyor account name' },
            projectSlug: { type: 'string', description: 'Project slug identifier' },
          },
          required: ['accountName', 'projectSlug'],
        },
      },
      {
        name: 'delete_project',
        description: 'Delete a project from AppVeyor. Irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'AppVeyor account name' },
            projectSlug: { type: 'string', description: 'Project slug identifier' },
          },
          required: ['accountName', 'projectSlug'],
        },
      },
      {
        name: 'delete_project_build_cache',
        description: 'Clear the build cache for a project.',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'AppVeyor account name' },
            projectSlug: { type: 'string', description: 'Project slug identifier' },
          },
          required: ['accountName', 'projectSlug'],
        },
      },
      // --- Builds ---
      {
        name: 'start_build',
        description: 'Start a new build on a branch, optionally at a specific commit with custom environment variables.',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'AppVeyor account name' },
            projectSlug: { type: 'string', description: 'Project slug identifier' },
            branch: { type: 'string', description: 'Branch to build' },
            commitId: { type: 'string', description: 'Specific commit SHA to build' },
            environmentVariables: { type: 'object', description: 'Key-value environment variables for this build' },
          },
          required: ['accountName', 'projectSlug'],
        },
      },
      {
        name: 'cancel_build',
        description: 'Cancel a running build by account, project slug, and build version.',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'AppVeyor account name' },
            projectSlug: { type: 'string', description: 'Project slug identifier' },
            buildVersion: { type: 'string', description: 'Build version to cancel' },
          },
          required: ['accountName', 'projectSlug', 'buildVersion'],
        },
      },
      {
        name: 're_run_build',
        description: 'Re-run a previous build by its internal build ID.',
        inputSchema: {
          type: 'object',
          properties: {
            buildId: { type: 'string', description: 'Internal build ID to re-run' },
          },
          required: ['buildId'],
        },
      },
      // --- Build Jobs ---
      {
        name: 'get_build_artifacts',
        description: 'List all artifacts produced by a build job.',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: { type: 'string', description: 'Build job ID' },
          },
          required: ['jobId'],
        },
      },
      {
        name: 'get_build_log',
        description: 'Download the console log for a build job.',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: { type: 'string', description: 'Build job ID' },
          },
          required: ['jobId'],
        },
      },
      // --- Environments ---
      {
        name: 'list_environments',
        description: 'List all deployment environments configured in the AppVeyor account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_environment',
        description: 'Add a new deployment environment.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Environment name' },
            provider: { type: 'string', description: 'Deployment provider: ftp, webDeploy, azureCS, azureBlob, s3, azure, nuget, environment, etc.' },
            settings: { type: 'object', description: 'Provider-specific settings object' },
          },
          required: ['name', 'provider'],
        },
      },
      {
        name: 'get_environment_settings',
        description: 'Get settings for a deployment environment by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            deploymentEnvironmentId: { type: 'number', description: 'Deployment environment ID' },
          },
          required: ['deploymentEnvironmentId'],
        },
      },
      {
        name: 'get_environment_deployments',
        description: 'Get deployment history for a deployment environment.',
        inputSchema: {
          type: 'object',
          properties: {
            deploymentEnvironmentId: { type: 'number', description: 'Deployment environment ID' },
          },
          required: ['deploymentEnvironmentId'],
        },
      },
      {
        name: 'delete_environment',
        description: 'Delete a deployment environment.',
        inputSchema: {
          type: 'object',
          properties: {
            deploymentEnvironmentId: { type: 'number', description: 'Deployment environment ID to delete' },
          },
          required: ['deploymentEnvironmentId'],
        },
      },
      // --- Deployments ---
      {
        name: 'get_deployment',
        description: 'Get details of a specific deployment by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            deploymentId: { type: 'number', description: 'Deployment ID' },
          },
          required: ['deploymentId'],
        },
      },
      {
        name: 'start_deployment',
        description: 'Start a deployment of a specific build version to a named environment.',
        inputSchema: {
          type: 'object',
          properties: {
            environmentName: { type: 'string', description: 'Target deployment environment name' },
            accountName: { type: 'string', description: 'AppVeyor account name' },
            projectSlug: { type: 'string', description: 'Project slug identifier' },
            buildVersion: { type: 'string', description: 'Build version to deploy' },
            buildJobId: { type: 'string', description: 'Specific build job ID (optional)' },
          },
          required: ['environmentName', 'accountName', 'projectSlug', 'buildVersion'],
        },
      },
      {
        name: 'cancel_deployment',
        description: 'Cancel a running deployment by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            deploymentId: { type: 'number', description: 'Deployment ID to cancel' },
          },
          required: ['deploymentId'],
        },
      },
      // --- Users & Roles ---
      {
        name: 'get_users',
        description: 'Get all users in the AppVeyor account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'invite_user',
        description: 'Invite a new user to the AppVeyor account by email.',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email address to invite' },
            roleId: { type: 'number', description: 'Role ID to assign' },
          },
          required: ['email'],
        },
      },
      {
        name: 'get_collaborators',
        description: 'Get all project-level collaborators in the account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_roles',
        description: 'Get all roles defined in the AppVeyor account.',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects': return await this.apiGet('/projects');
        case 'add_project': return await this.addProject(args);
        case 'get_project_last_build': return await this.getProjectLastBuild(args);
        case 'get_project_last_branch_build': return await this.getProjectLastBranchBuild(args);
        case 'get_project_build_by_version': return await this.getProjectBuildByVersion(args);
        case 'get_project_history': return await this.getProjectHistory(args);
        case 'get_project_deployments': return await this.apiGet(`/projects/${args.accountName}/${args.projectSlug}/deployments`);
        case 'get_project_settings': return await this.apiGet(`/projects/${args.accountName}/${args.projectSlug}/settings`);
        case 'get_project_environment_variables': return await this.apiGet(`/projects/${args.accountName}/${args.projectSlug}/settings/environment-variables`);
        case 'delete_project': return await this.apiDelete(`/projects/${args.accountName}/${args.projectSlug}`);
        case 'delete_project_build_cache': return await this.apiDelete(`/projects/${args.accountName}/${args.projectSlug}/buildcache`);
        case 'start_build': return await this.startBuild(args);
        case 'cancel_build': return await this.apiDelete(`/builds/${args.accountName}/${args.projectSlug}/${encodeURIComponent(args.buildVersion as string)}`);
        case 're_run_build': return await this.apiPut('/builds', { buildId: args.buildId });
        case 'get_build_artifacts': return await this.apiGet(`/buildjobs/${encodeURIComponent(args.jobId as string)}/artifacts`);
        case 'get_build_log': return await this.apiGet(`/buildjobs/${encodeURIComponent(args.jobId as string)}/log`);
        case 'list_environments': return await this.apiGet('/environments');
        case 'add_environment': return await this.addEnvironment(args);
        case 'get_environment_settings': return await this.apiGet(`/environments/${args.deploymentEnvironmentId}/settings`);
        case 'get_environment_deployments': return await this.apiGet(`/environments/${args.deploymentEnvironmentId}/deployments`);
        case 'delete_environment': return await this.apiDelete(`/environments/${args.deploymentEnvironmentId}`);
        case 'get_deployment': return await this.apiGet(`/deployments/${args.deploymentId}`);
        case 'start_deployment': return await this.startDeployment(args);
        case 'cancel_deployment': return await this.apiPut('/deployments/stop', { deploymentId: args.deploymentId });
        case 'get_users': return await this.apiGet('/users');
        case 'invite_user': return await this.inviteUser(args);
        case 'get_collaborators': return await this.apiGet('/collaborators');
        case 'get_roles': return await this.apiGet('/roles');
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

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    if (response.status === 204) return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'PUT', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    if (response.status === 204) return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    try { const data = await response.json(); return { content: [{ type: 'text', text: this.truncate(data) }], isError: false }; }
    catch { return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false }; }
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async addProject(args: Record<string, unknown>): Promise<ToolResult> {
    const { repositoryProvider, repositoryName } = args;
    if (!repositoryProvider || !repositoryName) return { content: [{ type: 'text', text: 'repositoryProvider and repositoryName are required' }], isError: true };
    return this.apiPost('/projects', { repositoryProvider, repositoryName });
  }

  private async getProjectLastBuild(args: Record<string, unknown>): Promise<ToolResult> {
    const { accountName, projectSlug } = args;
    if (!accountName || !projectSlug) return { content: [{ type: 'text', text: 'accountName and projectSlug are required' }], isError: true };
    return this.apiGet(`/projects/${accountName}/${projectSlug}`);
  }

  private async getProjectLastBranchBuild(args: Record<string, unknown>): Promise<ToolResult> {
    const { accountName, projectSlug, buildBranch } = args;
    if (!accountName || !projectSlug || !buildBranch) return { content: [{ type: 'text', text: 'accountName, projectSlug, and buildBranch are required' }], isError: true };
    return this.apiGet(`/projects/${accountName}/${projectSlug}/branch/${encodeURIComponent(buildBranch as string)}`);
  }

  private async getProjectBuildByVersion(args: Record<string, unknown>): Promise<ToolResult> {
    const { accountName, projectSlug, buildVersion } = args;
    if (!accountName || !projectSlug || !buildVersion) return { content: [{ type: 'text', text: 'accountName, projectSlug, and buildVersion are required' }], isError: true };
    return this.apiGet(`/projects/${accountName}/${projectSlug}/build/${encodeURIComponent(buildVersion as string)}`);
  }

  private async getProjectHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const { accountName, projectSlug } = args;
    if (!accountName || !projectSlug) return { content: [{ type: 'text', text: 'accountName and projectSlug are required' }], isError: true };
    const records = (args.recordsNumber as number) ?? 20;
    let url = `/projects/${accountName}/${projectSlug}/history?recordsNumber=${records}`;
    if (args.startBuildId) url += `&startBuildId=${args.startBuildId}`;
    if (args.branch) url += `&branch=${encodeURIComponent(args.branch as string)}`;
    return this.apiGet(url);
  }

  private async startBuild(args: Record<string, unknown>): Promise<ToolResult> {
    const { accountName, projectSlug } = args;
    if (!accountName || !projectSlug) return { content: [{ type: 'text', text: 'accountName and projectSlug are required' }], isError: true };
    const body: Record<string, unknown> = { accountName, projectSlug };
    if (args.branch) body.branch = args.branch;
    if (args.commitId) body.commitId = args.commitId;
    if (args.environmentVariables) body.environmentVariables = args.environmentVariables;
    return this.apiPost('/builds', body);
  }

  private async addEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const { name, provider } = args;
    if (!name || !provider) return { content: [{ type: 'text', text: 'name and provider are required' }], isError: true };
    const body: Record<string, unknown> = { name, provider };
    if (args.settings) body.settings = args.settings;
    return this.apiPost('/environments', body);
  }

  private async startDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    const { environmentName, accountName, projectSlug, buildVersion } = args;
    if (!environmentName || !accountName || !projectSlug || !buildVersion) return { content: [{ type: 'text', text: 'environmentName, accountName, projectSlug, and buildVersion are required' }], isError: true };
    const body: Record<string, unknown> = { environmentName, accountName, projectSlug, buildVersion };
    if (args.buildJobId) body.buildJobId = args.buildJobId;
    return this.apiPost('/deployments', body);
  }

  private async inviteUser(args: Record<string, unknown>): Promise<ToolResult> {
    const { email } = args;
    if (!email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const body: Record<string, unknown> = { email };
    if (args.roleId) body.roleId = args.roleId;
    return this.apiPost('/users/invitations', body);
  }

  static catalog() {
    return {
      name: 'appveyor',
      displayName: 'AppVeyor',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['appveyor', 'ci', 'cd', 'continuous-integration', 'build', 'devops', 'windows'],
      toolNames: [
        'list_projects', 'add_project', 'get_project_last_build', 'get_project_last_branch_build',
        'get_project_build_by_version', 'get_project_history', 'get_project_deployments',
        'get_project_settings', 'get_project_environment_variables', 'delete_project', 'delete_project_build_cache',
        'start_build', 'cancel_build', 're_run_build', 'get_build_artifacts', 'get_build_log',
        'list_environments', 'add_environment', 'get_environment_settings', 'get_environment_deployments', 'delete_environment',
        'get_deployment', 'start_deployment', 'cancel_deployment',
        'get_users', 'invite_user', 'get_collaborators', 'get_roles',
      ],
      description: 'AppVeyor CI/CD adapter — manage projects, trigger builds, deploy artifacts, and administer environments for Windows-hosted continuous integration.',
      author: 'protectnil' as const,
    };
  }
}
