/**
 * Terraform Registry MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/hashicorp/terraform-mcp-server — transport: stdio + streamable-HTTP, auth: TFE_TOKEN env var
// Actively maintained by HashiCorp. Current release: v0.4.0 (2026-03+).
// MCP tool count: 30+ tools across registry (search_providers, get_provider_details, get_latest_provider_version,
//   search_modules, get_module_details, get_latest_module_version, search_policies, get_policy_details),
//   registry-private (search_private_modules, get_private_module_details), and terraform toolset
//   (list_terraform_orgs, list_terraform_projects, list_workspaces, get_workspace_details, create_workspace,
//   update_workspace, delete_workspace_safely, list_runs, get_run_details, create_run, action_run,
//   list_workspace_variables, list_variable_sets, create_variable_set, create_variable_in_variable_set,
//   delete_variable_in_variable_set, attach_variable_set_to_workspaces, detach_variable_set_from_workspaces,
//   create_workspace_tags, read_workspace_tags, get_workspace_policy_sets, attach_policy_set_to_workspace,
//   list_stacks, get_stack_details).
// MCP-only tools (not in this adapter): delete_workspace_safely, action_run, list_variable_sets,
//   create_variable_set, create_variable_in_variable_set, delete_variable_in_variable_set,
//   attach_variable_set_to_workspaces, detach_variable_set_from_workspaces, create_workspace_tags,
//   read_workspace_tags, get_workspace_policy_sets, attach_policy_set_to_workspace, list_stacks,
//   get_stack_details, search_policies, get_policy_details, get_latest_provider_version,
//   get_latest_module_version, get_run_details, get_workspace_details.
// REST-only tools (in this adapter but not in MCP): get_run (maps to get_run_details in MCP),
//   create_workspace_variable, update_workspace_variable, get_current_state_version, list_state_versions,
//   list_private_modules (search_private_modules in MCP), get_private_module, search_public_providers,
//   get_public_provider, get_public_module_versions.
// Recommendation: use-both — MCP covers variable sets, tags, policy sets, stacks, and workspace deletion
//   not in this adapter. This adapter covers state versions, workspace variables CRUD, and public
//   registry provider/module detail lookup not fully covered by the MCP. FederationManager routes
//   shared operations through MCP.
//
// Base URLs:
//   HCP Terraform:     https://app.terraform.io/api/v2
//   Public Registry:   https://registry.terraform.io/v1
//   Private Registry:  https://app.terraform.io/api/v2/organizations/{org}/registry-modules
// Auth: Bearer token (HCP Terraform API token) for Cloud endpoints; no auth for public registry
// Docs: https://developer.hashicorp.com/terraform/cloud-docs/api-docs
//       https://developer.hashicorp.com/terraform/registry/api-docs
// Rate limits: Not formally published; JSON:API endpoints use standard HTTP rate limit headers

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TerraformRegistryConfig {
  /** HCP Terraform / Terraform Enterprise API token */
  token: string;
  /** Organization name (slug) in HCP Terraform */
  organization: string;
  /** Override HCP Terraform API base URL (default: https://app.terraform.io/api/v2) */
  cloudBaseUrl?: string;
}

export class TerraformRegistryMCPServer extends MCPAdapterBase {
  private readonly cloudBaseUrl: string;
  private readonly publicRegistryBaseUrl = 'https://registry.terraform.io/v1';
  private readonly token: string;
  private readonly organization: string;

  constructor(config: TerraformRegistryConfig) {
    super();
    this.token = config.token;
    this.organization = config.organization;
    this.cloudBaseUrl = (config.cloudBaseUrl ?? 'https://app.terraform.io/api/v2').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'terraform-registry',
      displayName: 'Terraform / HCP Terraform',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['terraform', 'hcp', 'hashicorp', 'iac', 'infrastructure', 'workspace', 'run', 'plan', 'apply', 'module', 'provider', 'variable', 'state', 'organization', 'registry'],
      toolNames: [
        'list_workspaces', 'get_workspace', 'create_workspace', 'update_workspace',
        'list_runs', 'get_run', 'create_run', 'apply_run', 'cancel_run', 'discard_run',
        'list_workspace_variables', 'create_workspace_variable', 'update_workspace_variable',
        'list_state_versions', 'get_current_state_version',
        'list_organizations', 'list_projects',
        'list_private_modules', 'get_private_module',
        'search_public_modules', 'get_public_module', 'get_public_module_versions',
        'search_public_providers', 'get_public_provider',
      ],
      description: 'HCP Terraform workspace and run management, variables, state versions, organizations, and Terraform Registry module and provider search.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Workspaces ───────────────────────────────────────────────────────────
      {
        name: 'list_workspaces',
        description: 'List HCP Terraform workspaces in the configured organization with pagination and name search.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Results per page (default: 20, max: 100)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
            search_name: { type: 'string', description: 'Filter workspaces by name substring' },
            search_tags: { type: 'string', description: 'Filter by tag (comma-separated for multiple)' },
          },
        },
      },
      {
        name: 'get_workspace',
        description: 'Get full details of a specific HCP Terraform workspace by name, including Terraform version, execution mode, and resource count.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_name: { type: 'string', description: 'Workspace name (slug)' },
          },
          required: ['workspace_name'],
        },
      },
      {
        name: 'create_workspace',
        description: 'Create a new HCP Terraform workspace in the configured organization.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Workspace name (slug, lowercase, hyphens allowed)' },
            description: { type: 'string', description: 'Human-readable description' },
            terraform_version: { type: 'string', description: 'Terraform version constraint (e.g. "1.7.0", "~> 1.6")' },
            auto_apply: { type: 'boolean', description: 'Automatically apply after successful plan (default: false)' },
            execution_mode: { type: 'string', description: 'Execution mode: remote (default), local, or agent' },
            project_id: { type: 'string', description: 'Project ID to assign the workspace to (optional)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_workspace',
        description: 'Update settings of an existing HCP Terraform workspace — Terraform version, auto-apply, execution mode, or description.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_name: { type: 'string', description: 'Workspace name (slug)' },
            description: { type: 'string', description: 'Updated description' },
            terraform_version: { type: 'string', description: 'Updated Terraform version constraint' },
            auto_apply: { type: 'boolean', description: 'Enable or disable auto-apply' },
            execution_mode: { type: 'string', description: 'Execution mode: remote, local, or agent' },
          },
          required: ['workspace_name'],
        },
      },
      // ── Runs ─────────────────────────────────────────────────────────────────
      {
        name: 'list_runs',
        description: 'List runs for a specific HCP Terraform workspace with pagination and status filter.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace ID (ws-XXXXXXXX)' },
            page_size: { type: 'number', description: 'Results per page (default: 20, max: 100)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
            filter_status: { type: 'string', description: 'Filter by run status (e.g. planned, applying, errored, applied)' },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'get_run',
        description: 'Get full details of a specific HCP Terraform run, including plan status, apply status, cost estimate, and policy check results.',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: { type: 'string', description: 'Run ID (run-XXXXXXXX)' },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'create_run',
        description: 'Create and queue a new Terraform run (plan + optional apply) in a workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace ID to run in (ws-XXXXXXXX)' },
            message: { type: 'string', description: 'Human-readable message explaining the reason for the run (default: "Queued manually via API")' },
            is_destroy: { type: 'boolean', description: 'Create a destroy plan instead of a normal plan (default: false)' },
            auto_apply: { type: 'boolean', description: 'Override workspace auto-apply setting for this run only (optional)' },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'apply_run',
        description: 'Confirm and apply a HCP Terraform run that is in the "needs confirmation" state.',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: { type: 'string', description: 'Run ID to apply (run-XXXXXXXX)' },
            comment: { type: 'string', description: 'Optional comment to record with the apply confirmation' },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'cancel_run',
        description: 'Cancel a HCP Terraform run that is currently planning or applying.',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: { type: 'string', description: 'Run ID to cancel (run-XXXXXXXX)' },
            comment: { type: 'string', description: 'Optional reason for cancellation' },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'discard_run',
        description: 'Discard a HCP Terraform run that has been planned but not yet applied.',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: { type: 'string', description: 'Run ID to discard (run-XXXXXXXX)' },
            comment: { type: 'string', description: 'Optional reason for discarding' },
          },
          required: ['run_id'],
        },
      },
      // ── Variables ────────────────────────────────────────────────────────────
      {
        name: 'list_workspace_variables',
        description: 'List all Terraform and environment variables configured for a specific HCP Terraform workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace ID (ws-XXXXXXXX)' },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'create_workspace_variable',
        description: 'Create a new Terraform or environment variable in a HCP Terraform workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace ID (ws-XXXXXXXX)' },
            key: { type: 'string', description: 'Variable name' },
            value: { type: 'string', description: 'Variable value (will be hidden if sensitive=true)' },
            category: { type: 'string', description: 'Variable category: terraform (Terraform input) or env (environment variable)' },
            description: { type: 'string', description: 'Human-readable description of the variable' },
            sensitive: { type: 'boolean', description: 'Mark as sensitive (value hidden in UI and API, default: false)' },
            hcl: { type: 'boolean', description: 'Parse value as HCL (default: false)' },
          },
          required: ['workspace_id', 'key', 'value', 'category'],
        },
      },
      {
        name: 'update_workspace_variable',
        description: 'Update the value or settings of an existing HCP Terraform workspace variable.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace ID (ws-XXXXXXXX)' },
            variable_id: { type: 'string', description: 'Variable ID (var-XXXXXXXX)' },
            value: { type: 'string', description: 'New variable value' },
            description: { type: 'string', description: 'Updated description' },
            sensitive: { type: 'boolean', description: 'Mark as sensitive' },
          },
          required: ['workspace_id', 'variable_id'],
        },
      },
      // ── State Versions ────────────────────────────────────────────────────────
      {
        name: 'list_state_versions',
        description: 'List state versions (state history) for a HCP Terraform workspace by workspace name.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_name: { type: 'string', description: 'Workspace name (slug) — required by the API filter' },
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['workspace_name'],
        },
      },
      {
        name: 'get_current_state_version',
        description: 'Get the most recent state version for a HCP Terraform workspace, including resource count and serial number.',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: { type: 'string', description: 'Workspace ID (ws-XXXXXXXX)' },
          },
          required: ['workspace_id'],
        },
      },
      // ── Organizations and Projects ────────────────────────────────────────────
      {
        name: 'list_organizations',
        description: 'List all HCP Terraform organizations accessible to the configured API token.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'list_projects',
        description: 'List projects in the configured HCP Terraform organization for workspace organization.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
            filter_name: { type: 'string', description: 'Filter projects by name' },
          },
        },
      },
      // ── Private Registry ──────────────────────────────────────────────────────
      {
        name: 'list_private_modules',
        description: 'List Terraform modules in the HCP Terraform private registry for the configured organization.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
            search_name: { type: 'string', description: 'Filter modules by name substring' },
          },
        },
      },
      {
        name: 'get_private_module',
        description: 'Get details of a specific module in the HCP Terraform private registry, including versions and README.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Module namespace (usually the organization name)' },
            module_name: { type: 'string', description: 'Module name' },
            provider: { type: 'string', description: 'Provider name (e.g. aws, azurerm, google)' },
          },
          required: ['namespace', 'module_name', 'provider'],
        },
      },
      // ── Public Registry ───────────────────────────────────────────────────────
      {
        name: 'search_public_modules',
        description: 'Search the public Terraform Registry (registry.terraform.io) for modules by keyword, provider, or namespace.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search keyword or phrase (e.g. "vpc", "eks", "kubernetes ingress")' },
            provider: { type: 'string', description: 'Filter by provider (e.g. "aws", "azurerm", "google", "kubernetes")' },
            namespace: { type: 'string', description: 'Filter by namespace (e.g. "terraform-aws-modules")' },
            verified: { type: 'boolean', description: 'Limit to partner-verified modules only (default: false)' },
            limit: { type: 'number', description: 'Maximum results (default: 20, max: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_public_module',
        description: 'Get details of a specific module on the public Terraform Registry including README, inputs, outputs, and submodules.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Module namespace (e.g. "terraform-aws-modules")' },
            module_name: { type: 'string', description: 'Module name (e.g. "vpc")' },
            provider: { type: 'string', description: 'Provider name (e.g. "aws")' },
          },
          required: ['namespace', 'module_name', 'provider'],
        },
      },
      {
        name: 'get_public_module_versions',
        description: 'List all available versions of a public Terraform Registry module.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Module namespace' },
            module_name: { type: 'string', description: 'Module name' },
            provider: { type: 'string', description: 'Provider name' },
          },
          required: ['namespace', 'module_name', 'provider'],
        },
      },
      // ── Public Providers ──────────────────────────────────────────────────────
      {
        name: 'search_public_providers',
        description: 'Search the public Terraform Registry for providers by keyword or namespace.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search keyword or phrase (e.g. "aws", "kubernetes", "datadog")' },
            namespace: { type: 'string', description: 'Filter by namespace (e.g. "hashicorp", "datadog")' },
            limit: { type: 'number', description: 'Maximum results (default: 20, max: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['q'],
        },
      },
      {
        name: 'get_public_provider',
        description: 'Get details of a specific Terraform provider on the public registry, including documentation and resource list.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Provider namespace (e.g. "hashicorp", "datadog")' },
            provider_name: { type: 'string', description: 'Provider name (e.g. "aws", "azurerm", "google")' },
          },
          required: ['namespace', 'provider_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
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
        case 'cancel_run':
          return await this.cancelRun(args);
        case 'discard_run':
          return await this.discardRun(args);
        case 'list_workspace_variables':
          return await this.listWorkspaceVariables(args);
        case 'create_workspace_variable':
          return await this.createWorkspaceVariable(args);
        case 'update_workspace_variable':
          return await this.updateWorkspaceVariable(args);
        case 'list_state_versions':
          return await this.listStateVersions(args);
        case 'get_current_state_version':
          return await this.getCurrentStateVersion(args);
        case 'list_organizations':
          return await this.listOrganizations(args);
        case 'list_projects':
          return await this.listProjects(args);
        case 'list_private_modules':
          return await this.listPrivateModules(args);
        case 'get_private_module':
          return await this.getPrivateModule(args);
        case 'search_public_modules':
          return await this.searchPublicModules(args);
        case 'get_public_module':
          return await this.getPublicModule(args);
        case 'get_public_module_versions':
          return await this.getPublicModuleVersions(args);
        case 'search_public_providers':
          return await this.searchPublicProviders(args);
        case 'get_public_provider':
          return await this.getPublicProvider(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────────

  private get cloudHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    };
  }

  private get publicHeaders(): Record<string, string> {
    return { Accept: 'application/json' };
  }

  private async cloudGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.cloudBaseUrl}${path}`, { headers: this.cloudHeaders });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async cloudPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.cloudBaseUrl}${path}`, {
      method: 'POST',
      headers: this.cloudHeaders,
      body: JSON.stringify(body),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async cloudPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.cloudBaseUrl}${path}`, {
      method: 'PATCH',
      headers: this.cloudHeaders,
      body: JSON.stringify(body),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async publicGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.publicRegistryBaseUrl}${path}`, { headers: this.publicHeaders });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private buildPageParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams({
      'page[size]': String(args.page_size ?? 20),
      'page[number]': String(args.page_number ?? 1),
    });
    return params;
  }

  private async listWorkspaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    if (args.search_name) params.set('search[name]', String(args.search_name));
    if (args.search_tags) params.set('search[tags]', String(args.search_tags));
    return this.cloudGet(`/organizations/${this.organization}/workspaces?${params}`);
  }

  private async getWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudGet(`/organizations/${this.organization}/workspaces/${encodeURIComponent(args.workspace_name as string)}`);
  }

  private async createWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    const attrs: Record<string, unknown> = { name: args.name };
    if (args.description) attrs['description'] = args.description;
    if (args.terraform_version) attrs['terraform-version'] = args.terraform_version;
    if (args.auto_apply !== undefined) attrs['auto-apply'] = args.auto_apply;
    if (args.execution_mode) attrs['execution-mode'] = args.execution_mode;

    const body: Record<string, unknown> = { data: { type: 'workspaces', attributes: attrs } };
    if (args.project_id) {
      body['data'] = { ...(body['data'] as object), relationships: { project: { data: { type: 'projects', id: args.project_id } } } };
    }
    return this.cloudPost(`/organizations/${this.organization}/workspaces`, body);
  }

  private async updateWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    const attrs: Record<string, unknown> = {};
    if (args.description !== undefined) attrs['description'] = args.description;
    if (args.terraform_version !== undefined) attrs['terraform-version'] = args.terraform_version;
    if (args.auto_apply !== undefined) attrs['auto-apply'] = args.auto_apply;
    if (args.execution_mode !== undefined) attrs['execution-mode'] = args.execution_mode;
    return this.cloudPatch(
      `/organizations/${this.organization}/workspaces/${encodeURIComponent(args.workspace_name as string)}`,
      { data: { type: 'workspaces', attributes: attrs } }
    );
  }

  private async listRuns(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    if (args.filter_status) params.set('filter[status]', String(args.filter_status));
    return this.cloudGet(`/workspaces/${encodeURIComponent(args.workspace_id as string)}/runs?${params}`);
  }

  private async getRun(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudGet(`/runs/${encodeURIComponent(args.run_id as string)}`);
  }

  private async createRun(args: Record<string, unknown>): Promise<ToolResult> {
    const attrs: Record<string, unknown> = {
      message: (args.message as string) ?? 'Queued manually via API',
      'is-destroy': (args.is_destroy as boolean) ?? false,
    };
    if (args.auto_apply !== undefined) attrs['auto-apply'] = args.auto_apply;
    return this.cloudPost('/runs', {
      data: {
        type: 'runs',
        attributes: attrs,
        relationships: {
          workspace: { data: { type: 'workspaces', id: args.workspace_id } },
        },
      },
    });
  }

  private async applyRun(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudPost(`/runs/${encodeURIComponent(args.run_id as string)}/actions/apply`, {
      comment: (args.comment as string) ?? '',
    });
  }

  private async cancelRun(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudPost(`/runs/${encodeURIComponent(args.run_id as string)}/actions/cancel`, {
      comment: (args.comment as string) ?? '',
    });
  }

  private async discardRun(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudPost(`/runs/${encodeURIComponent(args.run_id as string)}/actions/discard`, {
      comment: (args.comment as string) ?? '',
    });
  }

  private async listWorkspaceVariables(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudGet(`/workspaces/${encodeURIComponent(args.workspace_id as string)}/vars`);
  }

  private async createWorkspaceVariable(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudPost(`/workspaces/${encodeURIComponent(args.workspace_id as string)}/vars`, {
      data: {
        type: 'vars',
        attributes: {
          key: args.key,
          value: args.value,
          category: args.category,
          description: args.description ?? '',
          sensitive: args.sensitive ?? false,
          hcl: args.hcl ?? false,
        },
      },
    });
  }

  private async updateWorkspaceVariable(args: Record<string, unknown>): Promise<ToolResult> {
    const attrs: Record<string, unknown> = {};
    if (args.value !== undefined) attrs['value'] = args.value;
    if (args.description !== undefined) attrs['description'] = args.description;
    if (args.sensitive !== undefined) attrs['sensitive'] = args.sensitive;
    return this.cloudPatch(
      `/workspaces/${encodeURIComponent(args.workspace_id as string)}/vars/${encodeURIComponent(args.variable_id as string)}`,
      { data: { type: 'vars', id: args.variable_id, attributes: attrs } }
    );
  }

  private async listStateVersions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    params.set('filter[workspace][name]', args.workspace_name as string);
    params.set('filter[organization][name]', this.organization);
    return this.cloudGet(`/state-versions?${params}`);
  }

  private async getCurrentStateVersion(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudGet(`/workspaces/${encodeURIComponent(args.workspace_id as string)}/current-state-version`);
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    return this.cloudGet(`/organizations?${params}`);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    if (args.filter_name) params.set('filter[names]', String(args.filter_name));
    return this.cloudGet(`/organizations/${this.organization}/projects?${params}`);
  }

  private async listPrivateModules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    if (args.search_name) params.set('search[name]', String(args.search_name));
    return this.cloudGet(`/organizations/${this.organization}/registry-modules?${params}`);
  }

  private async getPrivateModule(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudGet(
      `/organizations/${this.organization}/registry-modules/private/${encodeURIComponent(args.namespace as string)}/${encodeURIComponent(args.module_name as string)}/${encodeURIComponent(args.provider as string)}`
    );
  }

  private async searchPublicModules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ q: args.q as string });
    if (args.limit != null) params.set('limit', String(args.limit));
    if (args.offset != null) params.set('offset', String(args.offset));
    if (args.provider) params.set('provider', String(args.provider));
    if (args.namespace) params.set('namespace', String(args.namespace));
    if (args.verified != null) params.set('verified', String(args.verified));
    return this.publicGet(`/modules/search?${params}`);
  }

  private async getPublicModule(args: Record<string, unknown>): Promise<ToolResult> {
    return this.publicGet(
      `/modules/${encodeURIComponent(args.namespace as string)}/${encodeURIComponent(args.module_name as string)}/${encodeURIComponent(args.provider as string)}`
    );
  }

  private async getPublicModuleVersions(args: Record<string, unknown>): Promise<ToolResult> {
    return this.publicGet(
      `/modules/${encodeURIComponent(args.namespace as string)}/${encodeURIComponent(args.module_name as string)}/${encodeURIComponent(args.provider as string)}/versions`
    );
  }

  private async searchPublicProviders(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ q: args.q as string });
    if (args.namespace) params.set('namespace', String(args.namespace));
    if (args.limit != null) params.set('limit', String(args.limit));
    if (args.offset != null) params.set('offset', String(args.offset));
    return this.publicGet(`/providers/search?${params}`);
  }

  private async getPublicProvider(args: Record<string, unknown>): Promise<ToolResult> {
    return this.publicGet(
      `/providers/${encodeURIComponent(args.namespace as string)}/${encodeURIComponent(args.provider_name as string)}`
    );
  }
}
