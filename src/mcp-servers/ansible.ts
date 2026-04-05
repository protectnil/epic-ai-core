/**
 * Ansible Automation Platform MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/ansible/aap-mcp-server — transport: streamable-HTTP (/mcp endpoint), auth: Bearer AAP token
// The ansible/aap-mcp-server generates tools from AAP OpenAPI specifications dynamically.
// Tool count varies by AAP version and user permissions; it covers EDA, Controller, Gateway,
// and Galaxy surfaces. Actively maintained by Ansible (last commit: 2026-03-26). 10+ tools.
// MCP meets all 4 criteria — official, maintained, 10+ tools, streamable-HTTP — and is a
// superset of our REST adapter. Decision: use-vendor-mcp for full AAP surface coverage.
// Our adapter provides a curated REST wrapper for the core Controller API operations — suitable
// for air-gapped deployments or environments where the vendor MCP server cannot be installed.
//
// Base URL: https://{your-controller-host}/api/v2 (controller hostname required in config)
// Auth: Bearer token (create in AAP UI under User Tokens or via /api/v2/tokens/)
// Docs: https://docs.ansible.com/automation-controller/latest/html/controllerapi/index.html
// Rate limits: Not documented; governed by AAP controller instance capacity

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AnsibleConfig {
  /** Base URL of the AAP controller host, e.g. https://controller.example.com */
  baseUrl: string;
  /** OAuth2 / Personal Access Token from the AAP controller */
  token: string;
}

export class AnsibleMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: AnsibleConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Job Templates ---
      {
        name: 'list_job_templates',
        description: 'List all job templates on the AAP controller with optional name search and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 20)' },
            search: { type: 'string', description: 'Search term to filter job templates by name' },
          },
        },
      },
      {
        name: 'get_job_template',
        description: 'Get details of a specific AAP job template by its numeric ID including playbook, inventory, and credential configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Numeric ID of the job template to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'launch_job_template',
        description: 'Launch a job template by its numeric ID. Optionally override inventory, extra_vars, limit, or job_tags at launch time.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Numeric ID of the job template to launch' },
            extra_vars: { type: 'string', description: 'JSON or YAML string of extra variables to pass to the playbook' },
            limit: { type: 'string', description: 'Comma-separated list of hosts or groups to limit the run to' },
            job_tags: { type: 'string', description: 'Comma-separated list of playbook tags to run' },
            skip_tags: { type: 'string', description: 'Comma-separated list of playbook tags to skip' },
            inventory: { type: 'number', description: 'Numeric ID of an inventory to override the template default' },
            credential: { type: 'number', description: 'Numeric ID of a credential to override the template default' },
          },
          required: ['id'],
        },
      },
      // --- Jobs ---
      {
        name: 'list_jobs',
        description: 'List recent AAP jobs with optional filtering by status, job template, or inventory.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by job status: new, pending, waiting, running, successful, failed, error, canceled' },
            job_template: { type: 'number', description: 'Filter by numeric job template ID' },
            inventory: { type: 'number', description: 'Filter by numeric inventory ID' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 20)' },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Retrieve the status and details of a specific AAP job by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Numeric ID of the job to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'cancel_job',
        description: 'Cancel a running or pending AAP job by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Numeric ID of the job to cancel' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_job_stdout',
        description: 'Retrieve the console output (stdout) of an AAP job by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Numeric ID of the job to retrieve output for' },
          },
          required: ['id'],
        },
      },
      // --- Workflow Job Templates ---
      {
        name: 'list_workflow_job_templates',
        description: 'List all workflow job templates on the AAP controller with optional name search and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 20)' },
            search: { type: 'string', description: 'Search term to filter workflow job templates by name' },
          },
        },
      },
      {
        name: 'launch_workflow_job',
        description: 'Launch a workflow job template by its numeric ID with optional extra_vars override.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Numeric ID of the workflow job template to launch' },
            extra_vars: { type: 'string', description: 'JSON or YAML string of extra variables to pass to the workflow' },
            limit: { type: 'string', description: 'Comma-separated limit of hosts or groups' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_workflow_jobs',
        description: 'List recent workflow job runs with optional filtering by status or workflow job template.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: new, pending, waiting, running, successful, failed, error, canceled' },
            workflow_job_template: { type: 'number', description: 'Filter by numeric workflow job template ID' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 20)' },
          },
        },
      },
      // --- Inventories ---
      {
        name: 'list_inventories',
        description: 'List all inventories on the AAP controller with optional name search and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 20)' },
            search: { type: 'string', description: 'Search term to filter inventories by name' },
          },
        },
      },
      {
        name: 'get_inventory',
        description: 'Get details of a specific AAP inventory by its numeric ID including host counts and variable configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Numeric ID of the inventory to retrieve' },
          },
          required: ['id'],
        },
      },
      // --- Hosts ---
      {
        name: 'list_hosts',
        description: 'List AAP hosts, optionally scoped to a specific inventory, with optional name search.',
        inputSchema: {
          type: 'object',
          properties: {
            inventory_id: { type: 'number', description: 'Numeric inventory ID to scope the host list. Omit to list all hosts.' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 20)' },
            search: { type: 'string', description: 'Search term to filter hosts by name' },
          },
        },
      },
      // --- Groups ---
      {
        name: 'list_groups',
        description: 'List host groups in an AAP inventory with optional name search.',
        inputSchema: {
          type: 'object',
          properties: {
            inventory_id: { type: 'number', description: 'Numeric inventory ID to scope the group list' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 20)' },
            search: { type: 'string', description: 'Search term to filter groups by name' },
          },
          required: ['inventory_id'],
        },
      },
      // --- Projects ---
      {
        name: 'list_projects',
        description: 'List all SCM projects configured on the AAP controller with optional name search.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 20)' },
            search: { type: 'string', description: 'Search term to filter projects by name' },
          },
        },
      },
      {
        name: 'sync_project',
        description: 'Trigger an SCM update (git pull) for an AAP project by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Numeric ID of the project to sync from SCM' },
          },
          required: ['id'],
        },
      },
      // --- Credentials ---
      {
        name: 'list_credentials',
        description: 'List all credentials configured on the AAP controller with optional name search and credential type filter.',
        inputSchema: {
          type: 'object',
          properties: {
            credential_type: { type: 'number', description: 'Filter by numeric credential type ID (e.g. SSH, Vault, AWS)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 20)' },
            search: { type: 'string', description: 'Search term to filter credentials by name' },
          },
        },
      },
      {
        name: 'get_credential',
        description: 'Get details of a specific AAP credential by its numeric ID (password and secret fields are redacted by the API).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Numeric ID of the credential to retrieve' },
          },
          required: ['id'],
        },
      },
      // --- Schedules ---
      {
        name: 'list_schedules',
        description: 'List all schedules configured on the AAP controller for job templates and workflow job templates.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 20)' },
            search: { type: 'string', description: 'Search term to filter schedules by name' },
          },
        },
      },
      // --- Organizations ---
      {
        name: 'list_organizations',
        description: 'List all organizations on the AAP controller with optional name search.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 20)' },
            search: { type: 'string', description: 'Search term to filter organizations by name' },
          },
        },
      },
      // --- Users ---
      {
        name: 'list_users',
        description: 'List all users on the AAP controller with optional username search.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 20)' },
            search: { type: 'string', description: 'Search term to filter users by username' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_job_templates': return await this.listJobTemplates(args);
        case 'get_job_template': return await this.getJobTemplate(args);
        case 'launch_job_template': return await this.launchJobTemplate(args);
        case 'list_jobs': return await this.listJobs(args);
        case 'get_job': return await this.getJob(args);
        case 'cancel_job': return await this.cancelJob(args);
        case 'get_job_stdout': return await this.getJobStdout(args);
        case 'list_workflow_job_templates': return await this.listWorkflowJobTemplates(args);
        case 'launch_workflow_job': return await this.launchWorkflowJob(args);
        case 'list_workflow_jobs': return await this.listWorkflowJobs(args);
        case 'list_inventories': return await this.listInventories(args);
        case 'get_inventory': return await this.getInventory(args);
        case 'list_hosts': return await this.listHosts(args);
        case 'list_groups': return await this.listGroups(args);
        case 'list_projects': return await this.listProjects(args);
        case 'sync_project': return await this.syncProject(args);
        case 'list_credentials': return await this.listCredentials(args);
        case 'get_credential': return await this.getCredential(args);
        case 'list_schedules': return await this.listSchedules(args);
        case 'list_organizations': return await this.listOrganizations(args);
        case 'list_users': return await this.listUsers(args);
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
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private buildPagedUrl(base: string, args: Record<string, unknown>, extraParams?: Record<string, string>): string {
    const page = (args.page as number) ?? 1;
    const pageSize = (args.page_size as number) ?? 20;
    let url = `${base}?page=${page}&page_size=${pageSize}`;
    if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        url += `&${k}=${encodeURIComponent(v)}`;
      }
    }
    return url;
  }

  private async listJobTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(this.buildPagedUrl('/api/v2/job_templates/', args));
  }

  private async getJobTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/api/v2/job_templates/${id}/`);
  }

  private async launchJobTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.extra_vars) body.extra_vars = args.extra_vars;
    if (args.limit) body.limit = args.limit;
    if (args.job_tags) body.job_tags = args.job_tags;
    if (args.skip_tags) body.skip_tags = args.skip_tags;
    if (args.inventory) body.inventory = args.inventory;
    if (args.credential) body.credential = args.credential;
    return this.apiPost(`/api/v2/job_templates/${id}/launch/`, body);
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const extra: Record<string, string> = {};
    if (args.status) extra.status = args.status as string;
    if (args.job_template) extra.job_template = String(args.job_template);
    if (args.inventory) extra.inventory = String(args.inventory);
    return this.apiGet(this.buildPagedUrl('/api/v2/jobs/', args, extra));
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/api/v2/jobs/${id}/`);
  }

  private async cancelJob(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiPost(`/api/v2/jobs/${id}/cancel/`, {});
  }

  private async getJobStdout(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v2/jobs/${id}/stdout/?format=txt`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'text/plain' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const truncated = text.length > 10_000 ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]` : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listWorkflowJobTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(this.buildPagedUrl('/api/v2/workflow_job_templates/', args));
  }

  private async launchWorkflowJob(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.extra_vars) body.extra_vars = args.extra_vars;
    if (args.limit) body.limit = args.limit;
    return this.apiPost(`/api/v2/workflow_job_templates/${id}/launch/`, body);
  }

  private async listWorkflowJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const extra: Record<string, string> = {};
    if (args.status) extra.status = args.status as string;
    if (args.workflow_job_template) extra.workflow_job_template = String(args.workflow_job_template);
    return this.apiGet(this.buildPagedUrl('/api/v2/workflow_jobs/', args, extra));
  }

  private async listInventories(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(this.buildPagedUrl('/api/v2/inventories/', args));
  }

  private async getInventory(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/api/v2/inventories/${id}/`);
  }

  private async listHosts(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.inventory_id) {
      return this.apiGet(this.buildPagedUrl(`/api/v2/inventories/${encodeURIComponent(args.inventory_id as string)}/hosts/`, args));
    }
    return this.apiGet(this.buildPagedUrl('/api/v2/hosts/', args));
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const inventoryId = args.inventory_id as number;
    if (!inventoryId) return { content: [{ type: 'text', text: 'inventory_id is required' }], isError: true };
    return this.apiGet(this.buildPagedUrl(`/api/v2/inventories/${inventoryId}/groups/`, args));
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(this.buildPagedUrl('/api/v2/projects/', args));
  }

  private async syncProject(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v2/projects/${id}/update/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown = { success: true, message: `Project ${id} sync triggered` };
    if (response.status !== 204) {
      try { data = await response.json(); } catch { /* 204 No Content */ }
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listCredentials(args: Record<string, unknown>): Promise<ToolResult> {
    const extra: Record<string, string> = {};
    if (args.credential_type) extra.credential_type = String(args.credential_type);
    return this.apiGet(this.buildPagedUrl('/api/v2/credentials/', args, extra));
  }

  private async getCredential(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/api/v2/credentials/${id}/`);
  }

  private async listSchedules(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(this.buildPagedUrl('/api/v2/schedules/', args));
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(this.buildPagedUrl('/api/v2/organizations/', args));
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(this.buildPagedUrl('/api/v2/users/', args));
  }

  static catalog() {
    return {
      name: 'ansible',
      displayName: 'Ansible',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['ansible'],
      toolNames: ['list_job_templates', 'get_job_template', 'launch_job_template', 'list_jobs', 'get_job', 'cancel_job', 'get_job_stdout', 'list_workflow_job_templates', 'launch_workflow_job', 'list_workflow_jobs', 'list_inventories', 'get_inventory', 'list_hosts', 'list_groups', 'list_projects', 'sync_project', 'list_credentials', 'get_credential', 'list_schedules', 'list_organizations', 'list_users'],
      description: 'Ansible adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
