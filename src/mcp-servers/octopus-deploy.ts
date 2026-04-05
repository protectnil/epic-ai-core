/**
 * Octopus Deploy MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/OctopusDeploy/mcp-server — transport: stdio, auth: API key (X-Octopus-ApiKey)
// Vendor MCP covers: 15+ tools across toolsets: core, projects, deployments, releases, tasks, tenants,
//   kubernetes, machines, certificates, accounts. Actively maintained — README updated Feb 16, 2026.
//   Write-enabled tools (create_release, deploy_release) require --no-read-only flag.
//   Unique MCP tools include get_deployment_from_url, get_task_from_url, get_task_details,
//   get_tenant_variables, get_missing_tenant_variables (not in our REST adapter).
// Our adapter covers: 18 tools (release orchestration, deployments, projects, environments, spaces, runbooks).
// Recommendation: use-both — MCP has unique URL-parsing and task/tenant variable tools not in our REST
//   adapter. Our REST adapter covers runbooks (run_runbook, list_runbooks) and deployment process which
//   are not in the MCP's core toolsets. Air-gapped/self-hosted deployments use this adapter only.
// Integration: use-both
// MCP-sourced tools (unique): get_deployment_from_url, get_task_from_url, get_task_details,
//   get_tenant_variables, get_missing_tenant_variables, list_releases_for_project (MCP name)
// REST-sourced tools (18): list_spaces, list_projects, get_project, list_environments, get_environment,
//   list_releases, get_release, create_release, list_deployments, get_deployment, create_deployment,
//   list_runbooks, run_runbook, list_tenants, get_tenant, list_deployment_targets,
//   get_deployment_target, get_deployment_process
//
// Base URL: https://{your-instance}.octopus.app (cloud) or https://{your-server} (self-hosted)
//   All space-scoped endpoints use /api/{spaceId}/... — default space uses /api/Spaces-1/...
// Auth: X-Octopus-ApiKey header with API key generated from your Octopus profile
// Docs: https://octopus.com/docs/octopus-rest-api
// Rate limits: Not publicly documented; Octopus Cloud enforces soft limits — use exponential backoff on 429

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OctopusDeployConfig {
  apiKey: string;
  baseUrl: string;
  spaceId?: string;
}

export class OctopusDeployMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly spaceId: string;

  constructor(config: OctopusDeployConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.spaceId = config.spaceId || 'Spaces-1';
  }

  static catalog() {
    return {
      name: 'octopus-deploy',
      displayName: 'Octopus Deploy',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'octopus', 'octopus-deploy', 'deploy', 'release', 'deployment', 'pipeline',
        'ci-cd', 'continuous-delivery', 'environment', 'project', 'runbook',
        'space', 'tenant', 'artifact', 'channel', 'lifecycle',
      ],
      toolNames: [
        'list_spaces', 'list_projects', 'get_project',
        'list_environments', 'get_environment',
        'list_releases', 'get_release', 'create_release',
        'list_deployments', 'get_deployment', 'create_deployment',
        'list_runbooks', 'run_runbook',
        'list_tenants', 'get_tenant',
        'list_deployment_targets', 'get_deployment_target',
        'get_deployment_process',
      ],
      description: 'Octopus Deploy release orchestration: manage projects, create and deploy releases, run runbooks, query environments, tenants, and deployment targets.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_spaces',
        description: 'List all Octopus Deploy spaces available on this instance',
        inputSchema: {
          type: 'object',
          properties: {
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            take: {
              type: 'number',
              description: 'Maximum records to return (default: 30, max: 100)',
            },
          },
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects in the configured Octopus Deploy space, with optional name filter',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter by project name (partial match supported)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
            take: {
              type: 'number',
              description: 'Maximum records to return (default: 30)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get detailed information about a specific Octopus Deploy project by its ID or slug',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID (e.g. Projects-1) or slug',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_environments',
        description: 'List all deployment environments in the space (e.g. Development, Staging, Production)',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter environments by name (partial match)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
            take: {
              type: 'number',
              description: 'Maximum records to return (default: 30)',
            },
          },
        },
      },
      {
        name: 'get_environment',
        description: 'Get details of a specific Octopus Deploy environment by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'Environment ID (e.g. Environments-1)',
            },
          },
          required: ['environment_id'],
        },
      },
      {
        name: 'list_releases',
        description: 'List releases for a specific project, optionally filtered by channel or version',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID or slug to list releases for',
            },
            channel_id: {
              type: 'string',
              description: 'Filter by channel ID (e.g. Channels-1)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
            take: {
              type: 'number',
              description: 'Maximum records to return (default: 30)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_release',
        description: 'Get details of a specific release by its ID, including version, notes, and selected packages',
        inputSchema: {
          type: 'object',
          properties: {
            release_id: {
              type: 'string',
              description: 'Release ID (e.g. Releases-1)',
            },
          },
          required: ['release_id'],
        },
      },
      {
        name: 'create_release',
        description: 'Create a new release for an Octopus Deploy project with a specified version number',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID (e.g. Projects-1) to create the release in',
            },
            version: {
              type: 'string',
              description: 'Version number for the new release (e.g. 1.0.0)',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID to create the release in (uses default channel if omitted)',
            },
            release_notes: {
              type: 'string',
              description: 'Release notes or change description (markdown supported)',
            },
          },
          required: ['project_id', 'version'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List deployments for a release or project, with optional environment and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Filter by project ID (e.g. Projects-1)',
            },
            release_id: {
              type: 'string',
              description: 'Filter by release ID (e.g. Releases-1)',
            },
            environment_id: {
              type: 'string',
              description: 'Filter by environment ID (e.g. Environments-1)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
            take: {
              type: 'number',
              description: 'Maximum records to return (default: 30)',
            },
          },
        },
      },
      {
        name: 'get_deployment',
        description: 'Get full details of a specific deployment including task status, duration, and logs summary',
        inputSchema: {
          type: 'object',
          properties: {
            deployment_id: {
              type: 'string',
              description: 'Deployment ID (e.g. Deployments-1)',
            },
          },
          required: ['deployment_id'],
        },
      },
      {
        name: 'create_deployment',
        description: 'Create a deployment — deploy a specific release to a target environment, optionally scoped to tenants',
        inputSchema: {
          type: 'object',
          properties: {
            release_id: {
              type: 'string',
              description: 'Release ID to deploy (e.g. Releases-1)',
            },
            environment_id: {
              type: 'string',
              description: 'Target environment ID (e.g. Environments-1)',
            },
            tenant_id: {
              type: 'string',
              description: 'Tenant ID for tenant-scoped deployments (e.g. Tenants-1)',
            },
            comments: {
              type: 'string',
              description: 'Optional comments describing why this deployment is being triggered',
            },
            force_package_download: {
              type: 'boolean',
              description: 'Force re-download of packages even if already cached (default: false)',
            },
          },
          required: ['release_id', 'environment_id'],
        },
      },
      {
        name: 'list_runbooks',
        description: 'List runbooks for a project — operational scripts and automated procedures',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID to list runbooks for (e.g. Projects-1)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
            take: {
              type: 'number',
              description: 'Maximum records to return (default: 30)',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'run_runbook',
        description: 'Execute a runbook in a specific environment, optionally scoped to a tenant',
        inputSchema: {
          type: 'object',
          properties: {
            runbook_id: {
              type: 'string',
              description: 'Runbook ID to execute (e.g. Runbooks-1)',
            },
            environment_id: {
              type: 'string',
              description: 'Environment ID to run the runbook against (e.g. Environments-1)',
            },
            tenant_id: {
              type: 'string',
              description: 'Tenant ID to scope the run to (optional)',
            },
            snapshot_id: {
              type: 'string',
              description: 'Published runbook snapshot ID; omit to use the latest published snapshot',
            },
          },
          required: ['runbook_id', 'environment_id'],
        },
      },
      {
        name: 'list_tenants',
        description: 'List tenants in the space with optional name and tag filters for multi-tenant deployments',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter tenants by name (partial match)',
            },
            project_id: {
              type: 'string',
              description: 'Filter by projects the tenant is linked to',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
            take: {
              type: 'number',
              description: 'Maximum records to return (default: 30)',
            },
          },
        },
      },
      {
        name: 'get_tenant',
        description: 'Get details of a specific tenant including linked projects, environments, and tags',
        inputSchema: {
          type: 'object',
          properties: {
            tenant_id: {
              type: 'string',
              description: 'Tenant ID (e.g. Tenants-1)',
            },
          },
          required: ['tenant_id'],
        },
      },
      {
        name: 'list_deployment_targets',
        description: 'List deployment targets (machines, Kubernetes clusters, cloud regions) in the space',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'Filter by environment ID',
            },
            health_status: {
              type: 'string',
              description: 'Filter by health: Healthy, Unhealthy, Unknown, HasWarnings (default: all)',
            },
            is_disabled: {
              type: 'boolean',
              description: 'Filter to disabled targets only (default: returns all)',
            },
            skip: {
              type: 'number',
              description: 'Number of records to skip (default: 0)',
            },
            take: {
              type: 'number',
              description: 'Maximum records to return (default: 30)',
            },
          },
        },
      },
      {
        name: 'get_deployment_target',
        description: 'Get details of a specific deployment target including health status and environment assignments',
        inputSchema: {
          type: 'object',
          properties: {
            machine_id: {
              type: 'string',
              description: 'Deployment target (machine) ID (e.g. Machines-1)',
            },
          },
          required: ['machine_id'],
        },
      },
      {
        name: 'get_deployment_process',
        description: 'Get the deployment process (steps and actions) for a project or release snapshot',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID to retrieve the current deployment process for',
            },
            release_id: {
              type: 'string',
              description: 'Release ID to retrieve the snapshot deployment process for (overrides project_id)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_spaces':
          return this.listSpaces(args);
        case 'list_projects':
          return this.listProjects(args);
        case 'get_project':
          return this.getProject(args);
        case 'list_environments':
          return this.listEnvironments(args);
        case 'get_environment':
          return this.getEnvironment(args);
        case 'list_releases':
          return this.listReleases(args);
        case 'get_release':
          return this.getRelease(args);
        case 'create_release':
          return this.createRelease(args);
        case 'list_deployments':
          return this.listDeployments(args);
        case 'get_deployment':
          return this.getDeployment(args);
        case 'create_deployment':
          return this.createDeployment(args);
        case 'list_runbooks':
          return this.listRunbooks(args);
        case 'run_runbook':
          return this.runRunbook(args);
        case 'list_tenants':
          return this.listTenants(args);
        case 'get_tenant':
          return this.getTenant(args);
        case 'list_deployment_targets':
          return this.listDeploymentTargets(args);
        case 'get_deployment_target':
          return this.getDeploymentTarget(args);
        case 'get_deployment_process':
          return this.getDeploymentProcess(args);
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
      'X-Octopus-ApiKey': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${text}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSpaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 30),
    };
    return this.get('/api/spaces', params);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 30),
    };
    if (args.name) params.name = args.name as string;
    return this.get(`/api/${this.spaceId}/projects`, params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.get(`/api/${this.spaceId}/projects/${encodeURIComponent(args.project_id as string)}`);
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 30),
    };
    if (args.name) params.name = args.name as string;
    return this.get(`/api/${this.spaceId}/environments`, params);
  }

  private async getEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.environment_id) return { content: [{ type: 'text', text: 'environment_id is required' }], isError: true };
    return this.get(`/api/${this.spaceId}/environments/${encodeURIComponent(args.environment_id as string)}`);
  }

  private async listReleases(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 30),
    };
    if (args.channel_id) params.channelId = args.channel_id as string;
    return this.get(`/api/${this.spaceId}/projects/${encodeURIComponent(args.project_id as string)}/releases`, params);
  }

  private async getRelease(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.release_id) return { content: [{ type: 'text', text: 'release_id is required' }], isError: true };
    return this.get(`/api/${this.spaceId}/releases/${encodeURIComponent(args.release_id as string)}`);
  }

  private async createRelease(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.version) return { content: [{ type: 'text', text: 'project_id and version are required' }], isError: true };
    const body: Record<string, unknown> = {
      ProjectId: args.project_id,
      Version: args.version,
    };
    if (args.channel_id) body.ChannelId = args.channel_id;
    if (args.release_notes) body.ReleaseNotes = args.release_notes;
    return this.post(`/api/${this.spaceId}/releases`, body);
  }

  private async listDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 30),
    };
    if (args.project_id) params.projects = args.project_id as string;
    if (args.release_id) params.releases = args.release_id as string;
    if (args.environment_id) params.environments = args.environment_id as string;
    return this.get(`/api/${this.spaceId}/deployments`, params);
  }

  private async getDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deployment_id) return { content: [{ type: 'text', text: 'deployment_id is required' }], isError: true };
    return this.get(`/api/${this.spaceId}/deployments/${encodeURIComponent(args.deployment_id as string)}`);
  }

  private async createDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.release_id || !args.environment_id) return { content: [{ type: 'text', text: 'release_id and environment_id are required' }], isError: true };
    const body: Record<string, unknown> = {
      ReleaseId: args.release_id,
      EnvironmentId: args.environment_id,
    };
    if (args.tenant_id) body.TenantId = args.tenant_id;
    if (args.comments) body.Comments = args.comments;
    if (typeof args.force_package_download === 'boolean') body.ForcePackageDownload = args.force_package_download;
    return this.post(`/api/${this.spaceId}/deployments`, body);
  }

  private async listRunbooks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 30),
    };
    return this.get(`/api/${this.spaceId}/projects/${encodeURIComponent(args.project_id as string)}/runbooks`, params);
  }

  private async runRunbook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.runbook_id || !args.environment_id) return { content: [{ type: 'text', text: 'runbook_id and environment_id are required' }], isError: true };
    const body: Record<string, unknown> = {
      RunbookId: args.runbook_id,
      EnvironmentId: args.environment_id,
    };
    if (args.tenant_id) body.TenantId = args.tenant_id;
    if (args.snapshot_id) body.RunbookSnapshotId = args.snapshot_id;
    return this.post(`/api/${this.spaceId}/runbookRuns`, body);
  }

  private async listTenants(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 30),
    };
    if (args.name) params.name = args.name as string;
    if (args.project_id) params.projectId = args.project_id as string;
    return this.get(`/api/${this.spaceId}/tenants`, params);
  }

  private async getTenant(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant_id) return { content: [{ type: 'text', text: 'tenant_id is required' }], isError: true };
    return this.get(`/api/${this.spaceId}/tenants/${encodeURIComponent(args.tenant_id as string)}`);
  }

  private async listDeploymentTargets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      skip: String((args.skip as number) ?? 0),
      take: String((args.take as number) ?? 30),
    };
    if (args.environment_id) params.environmentIds = args.environment_id as string;
    if (args.health_status) params.healthStatuses = args.health_status as string;
    if (typeof args.is_disabled === 'boolean') params.isDisabled = String(args.is_disabled);
    return this.get(`/api/${this.spaceId}/machines`, params);
  }

  private async getDeploymentTarget(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.machine_id) return { content: [{ type: 'text', text: 'machine_id is required' }], isError: true };
    return this.get(`/api/${this.spaceId}/machines/${encodeURIComponent(args.machine_id as string)}`);
  }

  private async getDeploymentProcess(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.release_id) {
      return this.get(`/api/${this.spaceId}/releases/${encodeURIComponent(args.release_id as string)}/deploymentprocesses`);
    }
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id or release_id is required' }], isError: true };
    return this.get(`/api/${this.spaceId}/deploymentprocesses/deploymentprocess-${encodeURIComponent(args.project_id as string)}`);
  }
}
