/**
 * Vercel MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.vercel.com — docs: https://vercel.com/docs/agent-resources/vercel-mcp
//   Transport: streamable-HTTP, Auth: OAuth2 user token. Status: Beta (all plans), March 2026.
//   MCP tools (verified): search_documentation, list_teams, list_projects, get_project,
//     list_deployments, get_deployment, get_deployment_logs, get_runtime_logs,
//     check_domain_availability_and_price, buy_domain (10+ tools, meets all 4 criteria).
// Our adapter covers: 20 tools (projects, deployments, domains, env variables, DNS records, teams, logs).
// Integration: use-both
//   MCP-only tools (not in our REST adapter): search_documentation, check_domain_availability_and_price,
//     buy_domain, get_runtime_logs
//   REST-only tools (not in vendor MCP, write operations): create_project, update_project, delete_project,
//     cancel_deployment, add_domain, remove_domain, create_env_var, update_env_var, delete_env_var,
//     list_env_vars, create_dns_record, delete_dns_record, list_dns_records, list_domains, list_team_members
//   Shared (both MCP and REST): list_projects, get_project, list_deployments, get_deployment, get_deployment_logs
// Combined coverage: 24 tools (REST: 20 + MCP-only: 4; shared tools routed through MCP per FederationManager)
//
// Base URL: https://api.vercel.com
// Auth: Bearer token (Vercel personal access token or OAuth2 user token)
//       Include teamId param on all requests for team-scoped operations.
// Docs: https://vercel.com/docs/rest-api
// Rate limits: Default Vercel API rate limits apply. Pagination default: 20, max: 100.
//
// Verified endpoint versions (vercel.com/docs/rest-api):
//   Projects:      v10 (list), v9 (get/update/delete/create)
//   Deployments:   v6 (list), v13 (get), v12 (create), v12 (cancel via PATCH)
//   Domains:       v5 (list), v4 (get/delete), v5 (add)
//   Env Variables: v9 (list/create), v9 (get/update/delete by id)
//   DNS:           v4 (list/create/delete)
//   Teams:         v2 (list), v1 (get members)
//   Checks:        v1 (list/get/create/update)
//   Aliases:       v4 (list), v2 (get/delete), v2 (assign)
//   Logs:          v2 (deployment build logs)
//   Edge Config:   v1 (list, get, list items, get item)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VercelConfig {
  accessToken: string;
  teamId?: string;
  baseUrl?: string;
}

export class VercelMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly teamId: string | undefined;
  private readonly baseUrl: string;

  constructor(config: VercelConfig) {
    super();
    this.accessToken = config.accessToken;
    this.teamId = config.teamId;
    this.baseUrl = config.baseUrl ?? 'https://api.vercel.com';
  }

  static catalog() {
    return {
      name: 'vercel',
      displayName: 'Vercel',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: ['vercel', 'deployment', 'serverless', 'frontend', 'nextjs', 'edge', 'domain', 'env', 'preview', 'production', 'ci-cd', 'alias', 'dns'],
      toolNames: [
        'list_projects', 'get_project', 'create_project', 'update_project', 'delete_project',
        'list_deployments', 'get_deployment', 'cancel_deployment',
        'list_domains', 'add_domain', 'remove_domain',
        'list_env_vars', 'create_env_var', 'update_env_var', 'delete_env_var',
        'list_dns_records', 'create_dns_record', 'delete_dns_record',
        'list_team_members', 'get_deployment_logs',
      ],
      description: 'Vercel platform management: projects, deployments, domains, environment variables, DNS records, teams, and deployment logs via the Vercel REST API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all Vercel projects for the authenticated user or team with framework, git repo, and last deployment info.',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID or slug (overrides config teamId)' },
            limit: { type: 'number', description: 'Maximum number of projects to return (default: 20, max: 100)' },
            from: { type: 'number', description: 'Timestamp in ms to paginate from (returns older items)' },
            search: { type: 'string', description: 'Filter projects by name search string' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get full details of a specific Vercel project including framework, git connection, domain aliases, and environment variable summary.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID or name' },
            teamId: { type: 'string', description: 'Team ID or slug (overrides config teamId)' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new Vercel project with optional git repository connection and framework configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name (must be URL-safe, lowercase, hyphenated)' },
            framework: { type: 'string', description: 'Framework preset: nextjs, nuxtjs, gatsby, svelte, create-react-app, vite, etc.' },
            gitRepository: { type: 'object', description: 'Git repo connection: { type: "github"|"gitlab"|"bitbucket", repo: "owner/repo" }' },
            teamId: { type: 'string', description: 'Team ID or slug to create the project under' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_project',
        description: 'Update a Vercel project\'s name, framework, build command, output directory, or install command.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID or name to update' },
            name: { type: 'string', description: 'New project name' },
            framework: { type: 'string', description: 'Updated framework preset' },
            buildCommand: { type: 'string', description: 'Custom build command override' },
            outputDirectory: { type: 'string', description: 'Build output directory override' },
            installCommand: { type: 'string', description: 'Custom install command override' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'delete_project',
        description: 'Permanently delete a Vercel project and all its deployments, domains, and environment variables. This action is irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID or name to delete' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List deployments with optional filters for project, state, target environment (production/preview), and app name.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Filter by project ID or name' },
            teamId: { type: 'string', description: 'Team ID or slug' },
            state: { type: 'string', description: 'Filter by state: BUILDING, ERROR, INITIALIZING, QUEUED, READY, CANCELED' },
            target: { type: 'string', description: 'Filter by target: production or preview' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            from: { type: 'number', description: 'Timestamp in ms to paginate from (returns older items)' },
          },
        },
      },
      {
        name: 'get_deployment',
        description: 'Get full details of a specific Vercel deployment including build logs URL, aliases, and build/check status.',
        inputSchema: {
          type: 'object',
          properties: {
            deploymentId: { type: 'string', description: 'Deployment ID (dpl_xxx) or deployment URL' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['deploymentId'],
        },
      },
      {
        name: 'cancel_deployment',
        description: 'Cancel a deployment that is in BUILDING or QUEUED state. Has no effect on completed deployments.',
        inputSchema: {
          type: 'object',
          properties: {
            deploymentId: { type: 'string', description: 'Deployment ID (dpl_xxx) to cancel' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['deploymentId'],
        },
      },
      {
        name: 'list_domains',
        description: 'List all custom domains configured in the Vercel account or team with their DNS configuration status and assigned projects.',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID or slug' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            since: { type: 'number', description: 'Unix timestamp in ms — return domains created after this time' },
          },
        },
      },
      {
        name: 'add_domain',
        description: 'Add a custom domain to a Vercel project. Returns DNS configuration instructions if the domain requires setup.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID or name to add the domain to' },
            domain: { type: 'string', description: 'Custom domain name (e.g. example.com or sub.example.com)' },
            redirect: { type: 'string', description: 'If set, redirect this domain to the specified domain' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['projectId', 'domain'],
        },
      },
      {
        name: 'remove_domain',
        description: 'Remove a custom domain from the Vercel account. The domain will no longer route to any Vercel deployment.',
        inputSchema: {
          type: 'object',
          properties: {
            domain: { type: 'string', description: 'Domain name to remove' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['domain'],
        },
      },
      {
        name: 'list_env_vars',
        description: 'List all environment variables for a Vercel project. Returns variable key names, targets (production/preview/development), and whether they are encrypted.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID or name' },
            teamId: { type: 'string', description: 'Team ID or slug' },
            decrypt: { type: 'boolean', description: 'If true, decrypt and return plaintext values (default: false)' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'create_env_var',
        description: 'Create a new environment variable for a Vercel project targeting production, preview, and/or development environments.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID or name' },
            key: { type: 'string', description: 'Environment variable name (e.g. DATABASE_URL)' },
            value: { type: 'string', description: 'Environment variable value' },
            target: { type: 'string', description: 'Comma-separated deployment targets: production, preview, development (default: production,preview,development)' },
            type: { type: 'string', description: 'Variable type: plain (default) or encrypted (stored as secret)' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['projectId', 'key', 'value'],
        },
      },
      {
        name: 'update_env_var',
        description: 'Update the value or target environments of an existing environment variable in a Vercel project.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID or name' },
            envId: { type: 'string', description: 'Environment variable ID (from list_env_vars response)' },
            key: { type: 'string', description: 'Updated environment variable name' },
            value: { type: 'string', description: 'Updated environment variable value' },
            target: { type: 'string', description: 'Comma-separated deployment targets: production, preview, development' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['projectId', 'envId'],
        },
      },
      {
        name: 'delete_env_var',
        description: 'Delete an environment variable from a Vercel project by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID or name' },
            envId: { type: 'string', description: 'Environment variable ID to delete' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['projectId', 'envId'],
        },
      },
      {
        name: 'list_dns_records',
        description: 'List DNS records for a domain managed by Vercel, including A, CNAME, MX, TXT, and other record types.',
        inputSchema: {
          type: 'object',
          properties: {
            domain: { type: 'string', description: 'Domain name whose DNS records to list' },
            teamId: { type: 'string', description: 'Team ID or slug' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
          },
          required: ['domain'],
        },
      },
      {
        name: 'create_dns_record',
        description: 'Create a new DNS record for a domain managed by Vercel. Supports A, AAAA, ALIAS, CAA, CNAME, MX, SRV, TXT record types.',
        inputSchema: {
          type: 'object',
          properties: {
            domain: { type: 'string', description: 'Domain name to add the DNS record to' },
            name: { type: 'string', description: 'Subdomain or record name (use @ for root)' },
            type: { type: 'string', description: 'DNS record type: A, AAAA, ALIAS, CAA, CNAME, MX, SRV, TXT' },
            value: { type: 'string', description: 'Record value (IP address, hostname, etc.)' },
            ttl: { type: 'number', description: 'Time-to-live in seconds (default: 60, min: 60)' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['domain', 'name', 'type', 'value'],
        },
      },
      {
        name: 'delete_dns_record',
        description: 'Delete a DNS record from a domain managed by Vercel by its record ID.',
        inputSchema: {
          type: 'object',
          properties: {
            domain: { type: 'string', description: 'Domain name' },
            recordId: { type: 'string', description: 'DNS record ID to delete' },
            teamId: { type: 'string', description: 'Team ID or slug' },
          },
          required: ['domain', 'recordId'],
        },
      },
      {
        name: 'list_team_members',
        description: 'List all members of a Vercel team with their roles, join date, and user profile details.',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID or slug (required; overrides config teamId)' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 100)' },
            since: { type: 'number', description: 'Unix timestamp in ms — return members who joined after this time' },
          },
          required: ['teamId'],
        },
      },
      {
        name: 'get_deployment_logs',
        description: 'Get build logs for a specific Vercel deployment. Returns log lines with timestamps, log level, and source (build, stdout, stderr).',
        inputSchema: {
          type: 'object',
          properties: {
            deploymentId: { type: 'string', description: 'Deployment ID (dpl_xxx) to fetch logs for' },
            teamId: { type: 'string', description: 'Team ID or slug' },
            limit: { type: 'number', description: 'Maximum log lines to return (default: 100)' },
            follow: { type: 'boolean', description: 'If true, stream logs as they are produced (default: false)' },
          },
          required: ['deploymentId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'create_project':
          return await this.createProject(args);
        case 'update_project':
          return await this.updateProject(args);
        case 'delete_project':
          return await this.deleteProject(args);
        case 'list_deployments':
          return await this.listDeployments(args);
        case 'get_deployment':
          return await this.getDeployment(args);
        case 'cancel_deployment':
          return await this.cancelDeployment(args);
        case 'list_domains':
          return await this.listDomains(args);
        case 'add_domain':
          return await this.addDomain(args);
        case 'remove_domain':
          return await this.removeDomain(args);
        case 'list_env_vars':
          return await this.listEnvVars(args);
        case 'create_env_var':
          return await this.createEnvVar(args);
        case 'update_env_var':
          return await this.updateEnvVar(args);
        case 'delete_env_var':
          return await this.deleteEnvVar(args);
        case 'list_dns_records':
          return await this.listDnsRecords(args);
        case 'create_dns_record':
          return await this.createDnsRecord(args);
        case 'delete_dns_record':
          return await this.deleteDnsRecord(args);
        case 'list_team_members':
          return await this.listTeamMembers(args);
        case 'get_deployment_logs':
          return await this.getDeploymentLogs(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private resolveTeam(args: Record<string, unknown>): string | undefined {
    return (args.teamId as string | undefined) ?? this.teamId;
  }

  private appendTeam(params: URLSearchParams, teamId: string | undefined): void {
    if (teamId) params.set('teamId', teamId);
  }

  private async vercelFetch(method: string, url: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method,
      headers: this.authHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Vercel API error ${response.status}: ${errText}` }], isError: true };
    }

    // 204 No Content — successful delete
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Vercel returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    if (args.limit) params.set('limit', String(args.limit));
    if (args.from) params.set('from', String(args.from));
    if (args.search) params.set('search', args.search as string);
    return this.vercelFetch('GET', `${this.baseUrl}/v10/projects?${params}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    return this.vercelFetch('GET', `${this.baseUrl}/v9/projects/${encodeURIComponent(args.projectId as string)}?${params}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    const body: Record<string, unknown> = { name: args.name };
    if (args.framework) body.framework = args.framework;
    if (args.gitRepository) body.gitRepository = args.gitRepository;
    return this.vercelFetch('POST', `${this.baseUrl}/v9/projects?${params}`, body);
  }

  private async updateProject(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.framework) body.framework = args.framework;
    if (args.buildCommand) body.buildCommand = args.buildCommand;
    if (args.outputDirectory) body.outputDirectory = args.outputDirectory;
    if (args.installCommand) body.installCommand = args.installCommand;
    return this.vercelFetch('PATCH', `${this.baseUrl}/v9/projects/${encodeURIComponent(args.projectId as string)}?${params}`, body);
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    return this.vercelFetch('DELETE', `${this.baseUrl}/v9/projects/${encodeURIComponent(args.projectId as string)}?${params}`);
  }

  private async listDeployments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    if (args.projectId) params.set('projectId', args.projectId as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.from) params.set('from', String(args.from));
    if (args.state) params.set('state', args.state as string);
    if (args.target) params.set('target', args.target as string);
    return this.vercelFetch('GET', `${this.baseUrl}/v6/deployments?${params}`);
  }

  private async getDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    return this.vercelFetch('GET', `${this.baseUrl}/v13/deployments/${encodeURIComponent(args.deploymentId as string)}?${params}`);
  }

  private async cancelDeployment(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    return this.vercelFetch('PATCH', `${this.baseUrl}/v12/deployments/${encodeURIComponent(args.deploymentId as string)}/cancel?${params}`, {});
  }

  private async listDomains(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    if (args.limit) params.set('limit', String(args.limit));
    if (args.since) params.set('since', String(args.since));
    return this.vercelFetch('GET', `${this.baseUrl}/v5/domains?${params}`);
  }

  private async addDomain(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    const body: Record<string, unknown> = { name: args.domain };
    if (args.redirect) body.redirect = args.redirect;
    return this.vercelFetch('POST', `${this.baseUrl}/v9/projects/${encodeURIComponent(args.projectId as string)}/domains?${params}`, body);
  }

  private async removeDomain(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    return this.vercelFetch('DELETE', `${this.baseUrl}/v4/domains/${encodeURIComponent(args.domain as string)}?${params}`);
  }

  private async listEnvVars(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    if (args.decrypt === true) params.set('decrypt', 'true');
    return this.vercelFetch('GET', `${this.baseUrl}/v9/projects/${encodeURIComponent(args.projectId as string)}/env?${params}`);
  }

  private async createEnvVar(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    const targetStr = (args.target as string) ?? 'production,preview,development';
    const targetArr = targetStr.split(',').map((t: string) => t.trim());
    const body: Record<string, unknown> = {
      key: args.key,
      value: args.value,
      target: targetArr,
      type: (args.type as string) ?? 'plain',
    };
    return this.vercelFetch('POST', `${this.baseUrl}/v9/projects/${encodeURIComponent(args.projectId as string)}/env?${params}`, body);
  }

  private async updateEnvVar(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    const body: Record<string, unknown> = {};
    if (args.key) body.key = args.key;
    if (args.value) body.value = args.value;
    if (args.target) body.target = (args.target as string).split(',').map((t: string) => t.trim());
    return this.vercelFetch('PATCH', `${this.baseUrl}/v9/projects/${encodeURIComponent(args.projectId as string)}/env/${encodeURIComponent(args.envId as string)}?${params}`, body);
  }

  private async deleteEnvVar(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    return this.vercelFetch('DELETE', `${this.baseUrl}/v9/projects/${encodeURIComponent(args.projectId as string)}/env/${encodeURIComponent(args.envId as string)}?${params}`);
  }

  private async listDnsRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    if (args.limit) params.set('limit', String(args.limit));
    return this.vercelFetch('GET', `${this.baseUrl}/v4/domains/${encodeURIComponent(args.domain as string)}/records?${params}`);
  }

  private async createDnsRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    const body: Record<string, unknown> = {
      name: args.name,
      type: args.type,
      value: args.value,
    };
    if (args.ttl) body.ttl = args.ttl;
    return this.vercelFetch('POST', `${this.baseUrl}/v4/domains/${encodeURIComponent(args.domain as string)}/records?${params}`, body);
  }

  private async deleteDnsRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    return this.vercelFetch('DELETE', `${this.baseUrl}/v4/domains/${encodeURIComponent(args.domain as string)}/records/${encodeURIComponent(args.recordId as string)}?${params}`);
  }

  private async listTeamMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = this.resolveTeam(args);
    if (!teamId) {
      return { content: [{ type: 'text', text: 'teamId is required (pass as argument or set in config)' }], isError: true };
    }
    const params = new URLSearchParams({ teamId });
    if (args.limit) params.set('limit', String(args.limit));
    if (args.since) params.set('since', String(args.since));
    return this.vercelFetch('GET', `${this.baseUrl}/v1/teams/${encodeURIComponent(teamId)}/members?${params}`);
  }

  private async getDeploymentLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    this.appendTeam(params, this.resolveTeam(args));
    if (args.limit) params.set('limit', String(args.limit));
    if (args.follow !== undefined) params.set('follow', String(args.follow));
    return this.vercelFetch('GET', `${this.baseUrl}/v2/deployments/${encodeURIComponent(args.deploymentId as string)}/events?${params}`);
  }
}
