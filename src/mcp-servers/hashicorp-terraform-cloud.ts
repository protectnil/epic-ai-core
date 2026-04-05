/**
 * HashiCorp Terraform Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/hashicorp/terraform-mcp-server — transport: stdio + streamable-HTTP, auth: API token
// The official Terraform MCP (actively maintained, v0.4+, 20+ tools) covers Terraform Registry provider/module
// discovery, private registry, AND HCP Terraform workspace/run/variable-set/tags/stacks operations.
// Our adapter covers: 25 tools (full run lifecycle, state, teams, policy sets, variable CRUD).
// Recommendation: use-both — MCP has search_providers, get_provider_details, get_latest_provider_version,
//   search_modules, get_module_details, list_stacks, get_stack_details and registry-private tools not in REST API.
//   REST adapter has list_organizations, get_organization, list_runs, get_run, apply_run, discard_run,
//   cancel_run, get_current_state_version, list_state_versions, list_teams, get_team, list_policy_sets,
//   create_workspace_variable, update_workspace_variable, delete_workspace_variable not covered by MCP.
//
// Integration: use-both
// MCP-sourced tools (via hashicorp/terraform-mcp-server): search_providers, get_provider_details,
//   get_latest_provider_version, search_modules, get_module_details, list_terraform_orgs,
//   list_terraform_projects, list_workspaces, get_workspace_details, create_workspace, update_workspace,
//   delete_workspace_safely, list_runs (MCP), get_run_details, create_run (MCP), action_run,
//   list_variable_sets (MCP), create_variable_set, create_variable_in_variable_set,
//   delete_variable_in_variable_set, attach_variable_set_to_workspaces, detach_variable_set_from_workspaces,
//   list_workspace_variables (MCP), create_workspace_tags, read_workspace_tags, list_stacks, get_stack_details,
//   search_private_modules
// REST-sourced tools (this adapter, unique): list_organizations, get_organization, apply_run, discard_run,
//   cancel_run, get_current_state_version, list_state_versions, list_teams, get_team, list_policy_sets,
//   create_workspace_variable, update_workspace_variable, delete_workspace_variable
//
// Base URL: https://app.terraform.io (HCP Terraform) or https://tfe.example.com (TFE)
// Auth: Bearer token via Authorization header. Content-Type: application/vnd.api+json (JSON:API).
// Docs: https://developer.hashicorp.com/terraform/cloud-docs/api-docs
// Rate limits: 30 req/s per token (HCP Terraform cloud); no documented limit for TFE.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TerraformCloudConfig {
  /** HCP Terraform or Terraform Enterprise API token. */
  token: string;
  /** Base URL. Defaults to https://app.terraform.io for HCP Terraform cloud. */
  baseUrl?: string;
}

export class HashicorpTerraformCloudMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: TerraformCloudConfig) {
    super();
    this.token = config.token;
    this.baseUrl = (config.baseUrl ?? 'https://app.terraform.io').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'hashicorp-terraform-cloud',
      displayName: 'HashiCorp Terraform Cloud',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: [
        'terraform', 'hcp', 'terraform cloud', 'infrastructure', 'iac',
        'workspace', 'run', 'plan', 'apply', 'state', 'variable', 'organization',
        'team', 'project', 'policy', 'sentinel', 'variable-set',
      ],
      toolNames: [
        'list_organizations', 'get_organization', 'list_workspaces', 'get_workspace',
        'create_workspace', 'update_workspace', 'list_runs', 'get_run', 'create_run',
        'apply_run', 'discard_run', 'cancel_run', 'get_current_state_version',
        'list_state_versions', 'list_workspace_variables', 'create_workspace_variable',
        'update_workspace_variable', 'delete_workspace_variable',
        'list_teams', 'get_team', 'list_projects', 'get_project',
        'list_variable_sets', 'list_policy_sets',
      ],
      description: 'Manage HCP Terraform Cloud: workspaces, runs, state, variables, teams, projects, and policy sets via the full REST API v2.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_organizations',
        description: 'List all Terraform Cloud organizations accessible with the current token, with pagination support.',
        inputSchema: {
          type: 'object',
          properties: {
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 20, max: 100).' },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Get details and settings for a specific Terraform Cloud organization.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'The organization name.' },
          },
          required: ['organization'],
        },
      },
      {
        name: 'list_workspaces',
        description: 'List all workspaces in a Terraform Cloud organization, with optional name search and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'The organization name.' },
            search: { type: 'string', description: 'Filter workspaces by name substring.' },
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 20, max: 100).' },
          },
          required: ['organization'],
        },
      },
      {
        name: 'get_workspace',
        description: 'Get full details for a specific Terraform Cloud workspace by organization and workspace name.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'The organization name.' },
            workspace: { type: 'string', description: 'The workspace name.' },
          },
          required: ['organization', 'workspace'],
        },
      },
      {
        name: 'create_workspace',
        description: 'Create a new workspace in a Terraform Cloud organization with configurable execution mode and VCS settings.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'The organization name.' },
            name: { type: 'string', description: 'Unique workspace name within the organization.' },
            description: { type: 'string', description: 'Optional description for the workspace.' },
            executionMode: { type: 'string', description: 'Execution mode: remote (default), local, or agent.' },
            autoApply: { type: 'boolean', description: 'Automatically apply after a successful plan (default: false).' },
            terraformVersion: { type: 'string', description: 'Terraform version to use (e.g. "1.6.0"). Defaults to latest.' },
            workingDirectory: { type: 'string', description: 'Working directory relative to the repository root.' },
          },
          required: ['organization', 'name'],
        },
      },
      {
        name: 'update_workspace',
        description: 'Update settings for an existing Terraform Cloud workspace such as description, execution mode, or Terraform version.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID (ws-xxxxxxxxxxxxxxxx).' },
            description: { type: 'string', description: 'New workspace description.' },
            autoApply: { type: 'boolean', description: 'Enable or disable auto-apply after successful plans.' },
            executionMode: { type: 'string', description: 'Execution mode: remote, local, or agent.' },
            terraformVersion: { type: 'string', description: 'Terraform version to use (e.g. "1.6.0").' },
            workingDirectory: { type: 'string', description: 'Working directory relative to the repository root.' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'list_runs',
        description: 'List runs for a specific Terraform Cloud workspace, with optional status filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID (ws-xxxxxxxxxxxxxxxx).' },
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 20, max: 100).' },
            filterStatus: { type: 'string', description: 'Comma-separated run statuses: pending, planning, planned, applying, applied, errored, canceled, discarded.' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'get_run',
        description: 'Get full details and current status of a specific Terraform Cloud run.',
        inputSchema: {
          type: 'object',
          properties: {
            runId: { type: 'string', description: 'The run ID (run-xxxxxxxxxxxxxxxx).' },
          },
          required: ['runId'],
        },
      },
      {
        name: 'create_run',
        description: 'Create a new Terraform run (plan and optional apply) in a workspace. Supports destroy runs and speculative plan-only runs.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID to run in.' },
            message: { type: 'string', description: 'Message describing this run.' },
            isDestroy: { type: 'boolean', description: 'Create a destroy run (default: false).' },
            autoApply: { type: 'boolean', description: 'Auto-apply after successful plan, overriding workspace setting.' },
            planOnly: { type: 'boolean', description: 'Speculative plan-only run that cannot be applied (default: false).' },
            targetAddrs: { type: 'array', description: 'List of resource addresses to target (e.g. ["aws_instance.web"]).', items: { type: 'string' } },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'apply_run',
        description: 'Apply a Terraform run that is in the "planned" state, confirming execution of the plan.',
        inputSchema: {
          type: 'object',
          properties: {
            runId: { type: 'string', description: 'The run ID to apply (must be in planned state).' },
            comment: { type: 'string', description: 'Optional comment explaining why this run is being applied.' },
          },
          required: ['runId'],
        },
      },
      {
        name: 'discard_run',
        description: 'Discard a Terraform run in "planned" or "policy_checked" state without applying it.',
        inputSchema: {
          type: 'object',
          properties: {
            runId: { type: 'string', description: 'The run ID to discard.' },
            comment: { type: 'string', description: 'Optional comment explaining why this run is being discarded.' },
          },
          required: ['runId'],
        },
      },
      {
        name: 'cancel_run',
        description: 'Cancel a Terraform run that is currently in a planning or applying state.',
        inputSchema: {
          type: 'object',
          properties: {
            runId: { type: 'string', description: 'The run ID to cancel.' },
            comment: { type: 'string', description: 'Optional comment explaining why this run is being canceled.' },
          },
          required: ['runId'],
        },
      },
      {
        name: 'get_current_state_version',
        description: 'Get the latest state version for a workspace, including resource counts and outputs.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID (ws-xxxxxxxxxxxxxxxx).' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'list_state_versions',
        description: 'List state versions for a workspace ordered by creation time. Requires workspace name and organization name (not IDs), with pagination support.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceName: { type: 'string', description: 'The workspace name (not the ID). Required by the API filter.' },
            organization: { type: 'string', description: 'The organization name that owns the workspace. Required by the API filter.' },
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 20, max: 100).' },
          },
          required: ['workspaceName', 'organization'],
        },
      },
      {
        name: 'list_workspace_variables',
        description: 'List all Terraform and environment variables configured for a workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID (ws-xxxxxxxxxxxxxxxx).' },
          },
          required: ['workspaceId'],
        },
      },
      {
        name: 'create_workspace_variable',
        description: 'Create a new Terraform or environment variable on a workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID (ws-xxxxxxxxxxxxxxxx).' },
            key: { type: 'string', description: 'Variable name.' },
            value: { type: 'string', description: 'Variable value.' },
            category: { type: 'string', description: 'Variable type: terraform (Terraform variable) or env (environment variable).' },
            description: { type: 'string', description: 'Optional description of the variable.' },
            sensitive: { type: 'boolean', description: 'If true, the value is write-only and will not be returned in reads (default: false).' },
            hcl: { type: 'boolean', description: 'If true, the value is parsed as HCL (default: false).' },
          },
          required: ['workspaceId', 'key', 'value', 'category'],
        },
      },
      {
        name: 'update_workspace_variable',
        description: 'Update the value, description, or sensitivity of an existing workspace variable.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID (ws-xxxxxxxxxxxxxxxx).' },
            variableId: { type: 'string', description: 'The variable ID (var-xxxxxxxxxxxxxxxx).' },
            key: { type: 'string', description: 'New variable name.' },
            value: { type: 'string', description: 'New variable value.' },
            description: { type: 'string', description: 'New description.' },
            sensitive: { type: 'boolean', description: 'Whether the variable should be sensitive (write-only).' },
            hcl: { type: 'boolean', description: 'Whether the value should be parsed as HCL.' },
          },
          required: ['workspaceId', 'variableId'],
        },
      },
      {
        name: 'delete_workspace_variable',
        description: 'Delete a variable from a Terraform Cloud workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            workspaceId: { type: 'string', description: 'The workspace ID (ws-xxxxxxxxxxxxxxxx).' },
            variableId: { type: 'string', description: 'The variable ID (var-xxxxxxxxxxxxxxxx).' },
          },
          required: ['workspaceId', 'variableId'],
        },
      },
      {
        name: 'list_teams',
        description: 'List all teams in a Terraform Cloud organization with their permissions and membership counts.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'The organization name.' },
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 20, max: 100).' },
          },
          required: ['organization'],
        },
      },
      {
        name: 'get_team',
        description: 'Get details for a specific Terraform Cloud team by team ID.',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'The team ID (team-xxxxxxxxxxxxxxxx).' },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all projects in a Terraform Cloud organization for workspace grouping and access control.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'The organization name.' },
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 20, max: 100).' },
          },
          required: ['organization'],
        },
      },
      {
        name: 'get_project',
        description: 'Get details for a specific Terraform Cloud project by project ID.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'The project ID (prj-xxxxxxxxxxxxxxxx).' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'list_variable_sets',
        description: 'List variable sets in a Terraform Cloud organization that can be applied globally or to specific workspaces.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'The organization name.' },
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 20, max: 100).' },
          },
          required: ['organization'],
        },
      },
      {
        name: 'list_policy_sets',
        description: 'List policy sets (Sentinel/OPA policy groups) in a Terraform Cloud organization, showing which workspaces they apply to.',
        inputSchema: {
          type: 'object',
          properties: {
            organization: { type: 'string', description: 'The organization name.' },
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1).' },
            pageSize: { type: 'number', description: 'Results per page (default: 20, max: 100).' },
          },
          required: ['organization'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_organizations':
          return await this.listOrganizations(args);
        case 'get_organization':
          return await this.getOrganization(args);
        case 'list_workspaces':
          return await this.listWorkspaces(args);
        case 'get_workspace':
          return await this.getWorkspace(args);
        case 'create_workspace':
          return await this.createWorkspace(args);
        case 'update_workspace':
          return await this.updateWorkspace(args);
        case 'list_runs':
          return await this.listRuns(args);
        case 'get_run':
          return await this.getRun(args);
        case 'create_run':
          return await this.createRun(args);
        case 'apply_run':
          return await this.applyRun(args);
        case 'discard_run':
          return await this.discardRun(args);
        case 'cancel_run':
          return await this.cancelRun(args);
        case 'get_current_state_version':
          return await this.getCurrentStateVersion(args);
        case 'list_state_versions':
          return await this.listStateVersions(args);
        case 'list_workspace_variables':
          return await this.listWorkspaceVariables(args);
        case 'create_workspace_variable':
          return await this.createWorkspaceVariable(args);
        case 'update_workspace_variable':
          return await this.updateWorkspaceVariable(args);
        case 'delete_workspace_variable':
          return await this.deleteWorkspaceVariable(args);
        case 'list_teams':
          return await this.listTeams(args);
        case 'get_team':
          return await this.getTeam(args);
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'list_variable_sets':
          return await this.listVariableSets(args);
        case 'list_policy_sets':
          return await this.listPolicySets(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/vnd.api+json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${body}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }],
        isError: true,
      };
    }
    // Some POST actions return 200 with body, others return 200/202 with no body
    const text = await response.text();
    if (!text.trim()) {
      return { content: [{ type: 'text', text: JSON.stringify({ status: 'success' }) }], isError: false };
    }
    return { content: [{ type: 'text', text: this.truncate(JSON.parse(text)) }], isError: false };
  }

  private async apiPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'deleted' }) }], isError: false };
  }

  private buildPageParams(args: Record<string, unknown>): URLSearchParams {
    const p = new URLSearchParams();
    if (args.pageNumber) p.append('page[number]', String(args.pageNumber));
    if (args.pageSize) p.append('page[size]', String(args.pageSize));
    return p;
  }

  private qs(params: URLSearchParams): string {
    const s = params.toString();
    return s ? `?${s}` : '';
  }

  // ---------------------------------------------------------------------------
  // Tool implementations
  // ---------------------------------------------------------------------------

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const p = this.buildPageParams(args);
    return this.apiGet(`/api/v2/organizations${this.qs(p)}`);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    if (!org) return { content: [{ type: 'text', text: 'organization is required' }], isError: true };
    return this.apiGet(`/api/v2/organizations/${encodeURIComponent(org)}`);
  }

  private async listWorkspaces(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    if (!org) return { content: [{ type: 'text', text: 'organization is required' }], isError: true };
    const p = this.buildPageParams(args);
    if (args.search) p.append('search[name]', args.search as string);
    return this.apiGet(`/api/v2/organizations/${encodeURIComponent(org)}/workspaces${this.qs(p)}`);
  }

  private async getWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const ws = args.workspace as string;
    if (!org || !ws) return { content: [{ type: 'text', text: 'organization and workspace are required' }], isError: true };
    return this.apiGet(`/api/v2/organizations/${encodeURIComponent(org)}/workspaces/${encodeURIComponent(ws)}`);
  }

  private async createWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    const name = args.name as string;
    if (!org || !name) return { content: [{ type: 'text', text: 'organization and name are required' }], isError: true };
    const attrs: Record<string, unknown> = { name };
    if (args.description) attrs.description = args.description;
    if (args.executionMode) attrs['execution-mode'] = args.executionMode;
    if (typeof args.autoApply === 'boolean') attrs['auto-apply'] = args.autoApply;
    if (args.terraformVersion) attrs['terraform-version'] = args.terraformVersion;
    if (args.workingDirectory) attrs['working-directory'] = args.workingDirectory;
    return this.apiPost(`/api/v2/organizations/${encodeURIComponent(org)}/workspaces`, {
      data: { type: 'workspaces', attributes: attrs },
    });
  }

  private async updateWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    const wsId = args.workspaceId as string;
    if (!wsId) return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
    const attrs: Record<string, unknown> = {};
    if (args.description) attrs.description = args.description;
    if (typeof args.autoApply === 'boolean') attrs['auto-apply'] = args.autoApply;
    if (args.executionMode) attrs['execution-mode'] = args.executionMode;
    if (args.terraformVersion) attrs['terraform-version'] = args.terraformVersion;
    if (args.workingDirectory) attrs['working-directory'] = args.workingDirectory;
    return this.apiPatch(`/api/v2/workspaces/${encodeURIComponent(wsId)}`, {
      data: { type: 'workspaces', id: wsId, attributes: attrs },
    });
  }

  private async listRuns(args: Record<string, unknown>): Promise<ToolResult> {
    const wsId = args.workspaceId as string;
    if (!wsId) return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
    const p = this.buildPageParams(args);
    if (args.filterStatus) p.append('filter[status]', args.filterStatus as string);
    return this.apiGet(`/api/v2/workspaces/${encodeURIComponent(wsId)}/runs${this.qs(p)}`);
  }

  private async getRun(args: Record<string, unknown>): Promise<ToolResult> {
    const runId = args.runId as string;
    if (!runId) return { content: [{ type: 'text', text: 'runId is required' }], isError: true };
    return this.apiGet(`/api/v2/runs/${encodeURIComponent(runId)}`);
  }

  private async createRun(args: Record<string, unknown>): Promise<ToolResult> {
    const wsId = args.workspaceId as string;
    if (!wsId) return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
    const attrs: Record<string, unknown> = {};
    if (args.message) attrs.message = args.message;
    if (typeof args.isDestroy === 'boolean') attrs['is-destroy'] = args.isDestroy;
    if (typeof args.autoApply === 'boolean') attrs['auto-apply'] = args.autoApply;
    if (typeof args.planOnly === 'boolean') attrs['plan-only'] = args.planOnly;
    if (Array.isArray(args.targetAddrs)) attrs['target-addrs'] = args.targetAddrs;
    return this.apiPost('/api/v2/runs', {
      data: {
        type: 'runs',
        attributes: attrs,
        relationships: { workspace: { data: { type: 'workspaces', id: wsId } } },
      },
    });
  }

  private async applyRun(args: Record<string, unknown>): Promise<ToolResult> {
    const runId = args.runId as string;
    if (!runId) return { content: [{ type: 'text', text: 'runId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.comment) body.comment = args.comment;
    return this.apiPost(`/api/v2/runs/${encodeURIComponent(runId)}/actions/apply`, body);
  }

  private async discardRun(args: Record<string, unknown>): Promise<ToolResult> {
    const runId = args.runId as string;
    if (!runId) return { content: [{ type: 'text', text: 'runId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.comment) body.comment = args.comment;
    return this.apiPost(`/api/v2/runs/${encodeURIComponent(runId)}/actions/discard`, body);
  }

  private async cancelRun(args: Record<string, unknown>): Promise<ToolResult> {
    const runId = args.runId as string;
    if (!runId) return { content: [{ type: 'text', text: 'runId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.comment) body.comment = args.comment;
    return this.apiPost(`/api/v2/runs/${encodeURIComponent(runId)}/actions/cancel`, body);
  }

  private async getCurrentStateVersion(args: Record<string, unknown>): Promise<ToolResult> {
    const wsId = args.workspaceId as string;
    if (!wsId) return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
    return this.apiGet(`/api/v2/workspaces/${encodeURIComponent(wsId)}/current-state-version`);
  }

  private async listStateVersions(args: Record<string, unknown>): Promise<ToolResult> {
    const wsName = args.workspaceName as string;
    const org = args.organization as string;
    // The API requires filter[workspace][name] (workspace name, NOT id) and filter[organization][name].
    if (!wsName || !org) return { content: [{ type: 'text', text: 'workspaceName and organization are required' }], isError: true };
    const p = this.buildPageParams(args);
    p.append('filter[workspace][name]', wsName);
    p.append('filter[organization][name]', org);
    return this.apiGet(`/api/v2/state-versions${this.qs(p)}`);
  }

  private async listWorkspaceVariables(args: Record<string, unknown>): Promise<ToolResult> {
    const wsId = args.workspaceId as string;
    if (!wsId) return { content: [{ type: 'text', text: 'workspaceId is required' }], isError: true };
    return this.apiGet(`/api/v2/workspaces/${encodeURIComponent(wsId)}/vars`);
  }

  private async createWorkspaceVariable(args: Record<string, unknown>): Promise<ToolResult> {
    const wsId = args.workspaceId as string;
    const key = args.key as string;
    const value = args.value as string;
    const category = args.category as string;
    if (!wsId || !key || !value || !category) {
      return { content: [{ type: 'text', text: 'workspaceId, key, value, and category are required' }], isError: true };
    }
    const attrs: Record<string, unknown> = { key, value, category };
    if (args.description) attrs.description = args.description;
    if (typeof args.sensitive === 'boolean') attrs.sensitive = args.sensitive;
    if (typeof args.hcl === 'boolean') attrs.hcl = args.hcl;
    return this.apiPost(`/api/v2/workspaces/${encodeURIComponent(wsId)}/vars`, {
      data: {
        type: 'vars',
        attributes: attrs,
        relationships: { workspace: { data: { type: 'workspaces', id: wsId } } },
      },
    });
  }

  private async updateWorkspaceVariable(args: Record<string, unknown>): Promise<ToolResult> {
    const wsId = args.workspaceId as string;
    const varId = args.variableId as string;
    if (!wsId || !varId) return { content: [{ type: 'text', text: 'workspaceId and variableId are required' }], isError: true };
    const attrs: Record<string, unknown> = {};
    if (args.key) attrs.key = args.key;
    if (args.value !== undefined) attrs.value = args.value;
    if (args.description) attrs.description = args.description;
    if (typeof args.sensitive === 'boolean') attrs.sensitive = args.sensitive;
    if (typeof args.hcl === 'boolean') attrs.hcl = args.hcl;
    return this.apiPatch(`/api/v2/workspaces/${encodeURIComponent(wsId)}/vars/${encodeURIComponent(varId)}`, {
      data: { type: 'vars', id: varId, attributes: attrs },
    });
  }

  private async deleteWorkspaceVariable(args: Record<string, unknown>): Promise<ToolResult> {
    const wsId = args.workspaceId as string;
    const varId = args.variableId as string;
    if (!wsId || !varId) return { content: [{ type: 'text', text: 'workspaceId and variableId are required' }], isError: true };
    return this.apiDelete(`/api/v2/workspaces/${encodeURIComponent(wsId)}/vars/${encodeURIComponent(varId)}`);
  }

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    if (!org) return { content: [{ type: 'text', text: 'organization is required' }], isError: true };
    const p = this.buildPageParams(args);
    return this.apiGet(`/api/v2/organizations/${encodeURIComponent(org)}/teams${this.qs(p)}`);
  }

  private async getTeam(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = args.teamId as string;
    if (!teamId) return { content: [{ type: 'text', text: 'teamId is required' }], isError: true };
    return this.apiGet(`/api/v2/teams/${encodeURIComponent(teamId)}`);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    if (!org) return { content: [{ type: 'text', text: 'organization is required' }], isError: true };
    const p = this.buildPageParams(args);
    return this.apiGet(`/api/v2/organizations/${encodeURIComponent(org)}/projects${this.qs(p)}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = args.projectId as string;
    if (!projectId) return { content: [{ type: 'text', text: 'projectId is required' }], isError: true };
    return this.apiGet(`/api/v2/projects/${encodeURIComponent(projectId)}`);
  }

  private async listVariableSets(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    if (!org) return { content: [{ type: 'text', text: 'organization is required' }], isError: true };
    const p = this.buildPageParams(args);
    return this.apiGet(`/api/v2/organizations/${encodeURIComponent(org)}/varsets${this.qs(p)}`);
  }

  private async listPolicySets(args: Record<string, unknown>): Promise<ToolResult> {
    const org = args.organization as string;
    if (!org) return { content: [{ type: 'text', text: 'organization is required' }], isError: true };
    const p = this.buildPageParams(args);
    return this.apiGet(`/api/v2/organizations/${encodeURIComponent(org)}/policy-sets${this.qs(p)}`);
  }
}
