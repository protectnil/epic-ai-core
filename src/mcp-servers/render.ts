/**
 * Render MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/render-oss/render-mcp-server — transport: stdio, auth: API key
// Actively maintained by Render (last commit Mar 18, 2026).
// Recommendation: use-both — MCP and REST adapter each expose unique tools not covered by the other.
//
// Integration: use-both
// MCP-sourced tools (4): [list_workspaces, select_workspace, get_selected_workspace,
//   query_render_postgres (read-only SQL against hosted Postgres), get_metrics]
// REST-sourced tools (26): [list_services, get_service, create_service, update_service,
//   delete_service, trigger_deploy, list_deploys, get_deploy, cancel_deploy, rollback_deploy,
//   list_env_vars, update_env_vars, list_custom_domains, add_custom_domain, remove_custom_domain,
//   suspend_service, resume_service, scale_service, list_jobs, create_job, get_job,
//   list_postgres, get_postgres, list_redis, get_redis, retrieve_logs]
// Combined coverage: 30 tools (MCP: 5 + REST: 26 - shared: 1 [list_logs/retrieve_logs overlap])
//
// Base URL: https://api.render.com/v1
// Auth: Bearer token — set Authorization: Bearer <API_KEY>
// Docs: https://api-docs.render.com/reference/introduction
//       https://render.com/docs/api
// Rate limits: Not publicly documented; Render enforces per-account rate limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RenderConfig {
  apiKey: string;
  baseUrl?: string;
}

export class RenderMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: RenderConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.render.com/v1';
  }

  static catalog() {
    return {
      name: 'render',
      displayName: 'Render',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: [
        'render', 'deploy', 'hosting', 'web-service', 'static-site', 'cron-job',
        'background-worker', 'postgres', 'redis', 'database', 'logs', 'scaling',
        'custom-domain', 'environment-variables', 'blueprint',
      ],
      toolNames: [
        'list_services', 'get_service', 'create_service', 'update_service', 'delete_service',
        'trigger_deploy', 'list_deploys', 'get_deploy', 'cancel_deploy', 'rollback_deploy',
        'list_env_vars', 'update_env_vars',
        'list_custom_domains', 'add_custom_domain', 'remove_custom_domain',
        'suspend_service', 'resume_service', 'scale_service',
        'list_jobs', 'create_job', 'get_job',
        'list_postgres', 'get_postgres',
        'list_redis', 'get_redis',
        'retrieve_logs',
      ],
      description: 'Render cloud platform: manage web services, deploys, environment variables, custom domains, databases (Postgres, Redis), one-off jobs, scaling, and service logs via REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Services ──────────────────────────────────────────────────────
      {
        name: 'list_services',
        description: 'List all services in the Render account with optional filters by type, name, region, and environment',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by type: web_service, private_service, background_worker, cron_job, static_site',
            },
            name: { type: 'string', description: 'Filter by name substring match' },
            region: { type: 'string', description: 'Filter by deployment region (e.g. oregon, ohio, frankfurt)' },
            env: { type: 'string', description: 'Filter by runtime environment: docker, elixir, go, node, python, ruby, rust, static' },
            limit: { type: 'number', description: 'Max results to return (default: 20, max: 100)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
        },
      },
      {
        name: 'get_service',
        description: 'Retrieve full details for a specific Render service by its service ID',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID (e.g. srv-abc123)' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'create_service',
        description: 'Create a new Render service (web service, background worker, cron job, or static site) from a Git repo',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Service type: web_service, private_service, background_worker, cron_job, static_site',
            },
            name: { type: 'string', description: 'Name for the new service' },
            ownerId: { type: 'string', description: 'Owner ID (user or team) for the service' },
            repo: { type: 'string', description: 'Git repository URL' },
            autoDeploy: { type: 'string', description: 'Enable auto-deploy on push: yes or no (default: yes)' },
            branch: { type: 'string', description: 'Branch to deploy from (default: main)' },
            buildCommand: { type: 'string', description: 'Shell command to build the service' },
            startCommand: { type: 'string', description: 'Shell command to start the service (web/private/worker)' },
            plan: { type: 'string', description: 'Instance plan: free, starter, standard, pro, pro_plus, pro_max, pro_ultra' },
            region: { type: 'string', description: 'Deployment region: oregon, ohio, frankfurt, singapore' },
            envVars: {
              type: 'array',
              description: 'Initial environment variables array [{key, value}]',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
          },
          required: ['type', 'name', 'ownerId'],
        },
      },
      {
        name: 'update_service',
        description: 'Update configuration of an existing Render service (name, build command, plan, auto-deploy, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID to update' },
            name: { type: 'string', description: 'New display name for the service' },
            autoDeploy: { type: 'string', description: 'Auto-deploy setting: yes or no' },
            branch: { type: 'string', description: 'Branch to deploy from' },
            buildCommand: { type: 'string', description: 'Updated build command' },
            startCommand: { type: 'string', description: 'Updated start command' },
            plan: { type: 'string', description: 'Updated instance plan' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'delete_service',
        description: 'Permanently delete a Render service and all its deploys. This action is irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID to delete' },
          },
          required: ['service_id'],
        },
      },
      // ── Deploys ───────────────────────────────────────────────────────
      {
        name: 'trigger_deploy',
        description: 'Trigger a new deploy for a Render service, optionally targeting a specific commit SHA or clearing the build cache',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID to deploy' },
            commit_id: { type: 'string', description: 'Specific commit SHA to deploy (omit for latest)' },
            clear_cache: { type: 'string', description: 'Clear build cache: do_not_clear (default) or clear' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'list_deploys',
        description: 'List deploy history for a Render service with status, commit info, and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID' },
            limit: { type: 'number', description: 'Max deploys to return (default: 20, max: 100)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'get_deploy',
        description: 'Retrieve details and status for a specific deploy of a Render service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID' },
            deploy_id: { type: 'string', description: 'Deploy ID (e.g. dep-abc123)' },
          },
          required: ['service_id', 'deploy_id'],
        },
      },
      {
        name: 'cancel_deploy',
        description: 'Cancel a deploy that is currently in progress for a Render service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID' },
            deploy_id: { type: 'string', description: 'Deploy ID to cancel' },
          },
          required: ['service_id', 'deploy_id'],
        },
      },
      {
        name: 'rollback_deploy',
        description: 'Roll back a Render service to a previous successful deploy',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID' },
            deploy_id: { type: 'string', description: 'Deploy ID of the previous deploy to roll back to' },
          },
          required: ['service_id', 'deploy_id'],
        },
      },
      // ── Environment variables ─────────────────────────────────────────
      {
        name: 'list_env_vars',
        description: 'List all environment variables for a Render service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'update_env_vars',
        description: 'Replace all environment variables for a Render service. This is a full replacement — include all desired variables.',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID' },
            env_vars: {
              type: 'array',
              description: 'Complete set of environment variables [{key, value}] to set',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string', description: 'Environment variable key' },
                  value: { type: 'string', description: 'Environment variable value' },
                },
              },
            },
          },
          required: ['service_id', 'env_vars'],
        },
      },
      // ── Custom domains ────────────────────────────────────────────────
      {
        name: 'list_custom_domains',
        description: 'List all custom domains configured for a Render service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'add_custom_domain',
        description: 'Add a custom domain to a Render service. DNS verification required after adding.',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID' },
            name: { type: 'string', description: 'Custom domain name (e.g. www.example.com)' },
          },
          required: ['service_id', 'name'],
        },
      },
      {
        name: 'remove_custom_domain',
        description: 'Remove a custom domain from a Render service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID' },
            domain_name: { type: 'string', description: 'Custom domain name to remove' },
          },
          required: ['service_id', 'domain_name'],
        },
      },
      // ── Scaling and lifecycle ─────────────────────────────────────────
      {
        name: 'suspend_service',
        description: 'Suspend a Render service, stopping all running instances and billing',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID to suspend' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'resume_service',
        description: 'Resume a previously suspended Render service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID to resume' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'scale_service',
        description: 'Scale the instance count of a Render service up or down',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID to scale' },
            numInstances: { type: 'number', description: 'Target number of running instances (min: 1)' },
          },
          required: ['service_id', 'numInstances'],
        },
      },
      // ── One-off jobs ──────────────────────────────────────────────────
      {
        name: 'list_jobs',
        description: 'List one-off jobs (ad-hoc commands) that have been run on a Render service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID' },
            status: { type: 'string', description: 'Filter by status: pending, running, succeeded, failed' },
            limit: { type: 'number', description: 'Max jobs to return (default: 20)' },
            cursor: { type: 'string', description: 'Pagination cursor' },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'create_job',
        description: 'Create and run a one-off job (ad-hoc shell command) on a Render service instance',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID to run the job on' },
            startCommand: { type: 'string', description: 'Shell command to execute as the one-off job' },
            planId: { type: 'string', description: 'Optional instance plan ID for the job' },
          },
          required: ['service_id', 'startCommand'],
        },
      },
      {
        name: 'get_job',
        description: 'Retrieve the status and output details of a specific one-off job on a Render service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: { type: 'string', description: 'Render service ID' },
            job_id: { type: 'string', description: 'Job ID to retrieve' },
          },
          required: ['service_id', 'job_id'],
        },
      },
      // ── PostgreSQL databases ───────────────────────────────────────────
      {
        name: 'list_postgres',
        description: 'List all PostgreSQL databases in the Render account with status and connection info',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter databases by name substring' },
            limit: { type: 'number', description: 'Max results (default: 20, max: 100)' },
            cursor: { type: 'string', description: 'Pagination cursor' },
          },
        },
      },
      {
        name: 'get_postgres',
        description: 'Retrieve full details for a specific Render PostgreSQL database by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            postgres_id: { type: 'string', description: 'Render PostgreSQL database ID (e.g. dpg-abc123)' },
          },
          required: ['postgres_id'],
        },
      },
      // ── Redis databases ────────────────────────────────────────────────
      {
        name: 'list_redis',
        description: 'List all Redis instances in the Render account with status and connection info',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter Redis instances by name substring' },
            limit: { type: 'number', description: 'Max results (default: 20, max: 100)' },
            cursor: { type: 'string', description: 'Pagination cursor' },
          },
        },
      },
      {
        name: 'get_redis',
        description: 'Retrieve full details for a specific Render Redis instance by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            redis_id: { type: 'string', description: 'Render Redis instance ID (e.g. red-abc123)' },
          },
          required: ['redis_id'],
        },
      },
      // ── Logs ─────────────────────────────────────────────────────────
      {
        name: 'retrieve_logs',
        description: 'Retrieve recent log output for a Render service or database with optional time range and text filter',
        inputSchema: {
          type: 'object',
          properties: {
            resource_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'One or more Render resource IDs to retrieve logs for (services, databases)',
            },
            start_time: { type: 'string', description: 'ISO 8601 start time (e.g. 2026-01-01T00:00:00Z)' },
            end_time: { type: 'string', description: 'ISO 8601 end time (default: now)' },
            text: { type: 'string', description: 'Text string to filter log lines (case-sensitive)' },
            level: { type: 'string', description: 'Log level filter: debug, info, warning, error' },
            limit: { type: 'number', description: 'Max log lines to return (default: 100, max: 2000)' },
            direction: { type: 'string', description: 'Cursor direction: forward or backward (default: backward)' },
          },
          required: ['resource_ids'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_services':
          return await this.listServices(args);
        case 'get_service':
          return await this.getService(args);
        case 'create_service':
          return await this.createService(args);
        case 'update_service':
          return await this.updateService(args);
        case 'delete_service':
          return await this.deleteService(args);
        case 'trigger_deploy':
          return await this.triggerDeploy(args);
        case 'list_deploys':
          return await this.listDeploys(args);
        case 'get_deploy':
          return await this.getDeploy(args);
        case 'cancel_deploy':
          return await this.cancelDeploy(args);
        case 'rollback_deploy':
          return await this.rollbackDeploy(args);
        case 'list_env_vars':
          return await this.listEnvVars(args);
        case 'update_env_vars':
          return await this.updateEnvVars(args);
        case 'list_custom_domains':
          return await this.listCustomDomains(args);
        case 'add_custom_domain':
          return await this.addCustomDomain(args);
        case 'remove_custom_domain':
          return await this.removeCustomDomain(args);
        case 'suspend_service':
          return await this.serviceAction(args, 'suspend');
        case 'resume_service':
          return await this.serviceAction(args, 'resume');
        case 'scale_service':
          return await this.scaleService(args);
        case 'list_jobs':
          return await this.listJobs(args);
        case 'create_job':
          return await this.createJob(args);
        case 'get_job':
          return await this.getJob(args);
        case 'list_postgres':
          return await this.listPostgres(args);
        case 'get_postgres':
          return await this.getPostgres(args);
        case 'list_redis':
          return await this.listRedis(args);
        case 'get_redis':
          return await this.getRedisInstance(args);
        case 'retrieve_logs':
          return await this.retrieveLogs(args);
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
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async httpGet(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const url = params ? `${this.baseUrl}${path}?${params.toString()}` : `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Render API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Render API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Render API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Render API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async httpDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Render API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ limit: String((args.limit as number) ?? 20) });
    if (args.type) params.set('type', args.type as string);
    if (args.name) params.set('name', args.name as string);
    if (args.region) params.set('region', args.region as string);
    if (args.env) params.set('env', args.env as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.httpGet('/services', params);
  }

  private async getService(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpGet(`/services/${encodeURIComponent(args.service_id as string)}`);
  }

  private async createService(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      type: args.type,
      name: args.name,
      ownerId: args.ownerId,
    };
    if (args.repo) body.repo = args.repo;
    if (args.autoDeploy) body.autoDeploy = args.autoDeploy;
    if (args.branch) body.branch = args.branch;
    if (args.buildCommand) body.buildCommand = args.buildCommand;
    if (args.startCommand) body.startCommand = args.startCommand;
    if (args.plan) body.plan = args.plan;
    if (args.region) body.region = args.region;
    if (args.envVars) body.envVars = args.envVars;
    return this.httpPost('/services', body);
  }

  private async updateService(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceId = args.service_id as string;
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.autoDeploy) body.autoDeploy = args.autoDeploy;
    if (args.branch) body.branch = args.branch;
    if (args.buildCommand) body.buildCommand = args.buildCommand;
    if (args.startCommand) body.startCommand = args.startCommand;
    if (args.plan) body.plan = args.plan;
    return this.httpPatch(`/services/${serviceId}`, body);
  }

  private async deleteService(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpDelete(`/services/${encodeURIComponent(args.service_id as string)}`);
  }

  private async triggerDeploy(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.clear_cache) body.clearCache = args.clear_cache;
    if (args.commit_id) body.commitId = args.commit_id;
    return this.httpPost(`/services/${encodeURIComponent(args.service_id as string)}/deploys`, body);
  }

  private async listDeploys(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ limit: String((args.limit as number) ?? 20) });
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.httpGet(`/services/${encodeURIComponent(args.service_id as string)}/deploys`, params);
  }

  private async getDeploy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpGet(`/services/${encodeURIComponent(args.service_id as string)}/deploys/${encodeURIComponent(args.deploy_id as string)}`);
  }

  private async cancelDeploy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(`/services/${encodeURIComponent(args.service_id as string)}/deploys/${encodeURIComponent(args.deploy_id as string)}/cancel`, {});
  }

  private async rollbackDeploy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(`/services/${encodeURIComponent(args.service_id as string)}/rollback`, { deployId: args.deploy_id });
  }

  private async listEnvVars(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpGet(`/services/${encodeURIComponent(args.service_id as string)}/env-vars`);
  }

  private async updateEnvVars(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPut(`/services/${encodeURIComponent(args.service_id as string)}/env-vars`, args.env_vars);
  }

  private async listCustomDomains(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpGet(`/services/${encodeURIComponent(args.service_id as string)}/custom-domains`);
  }

  private async addCustomDomain(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(`/services/${encodeURIComponent(args.service_id as string)}/custom-domains`, { name: args.name });
  }

  private async removeCustomDomain(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpDelete(`/services/${encodeURIComponent(args.service_id as string)}/custom-domains/${encodeURIComponent(args.domain_name as string)}`);
  }

  private async serviceAction(args: Record<string, unknown>, action: 'suspend' | 'resume'): Promise<ToolResult> {
    return this.httpPost(`/services/${encodeURIComponent(args.service_id as string)}/${action}`, {});
  }

  private async scaleService(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpPost(`/services/${encodeURIComponent(args.service_id as string)}/scale`, { numInstances: args.numInstances });
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ limit: String((args.limit as number) ?? 20) });
    if (args.status) params.set('status', args.status as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.httpGet(`/services/${encodeURIComponent(args.service_id as string)}/jobs`, params);
  }

  private async createJob(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { startCommand: args.startCommand };
    if (args.planId) body.planId = args.planId;
    return this.httpPost(`/services/${encodeURIComponent(args.service_id as string)}/jobs`, body);
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpGet(`/services/${encodeURIComponent(args.service_id as string)}/jobs/${encodeURIComponent(args.job_id as string)}`);
  }

  private async listPostgres(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ limit: String((args.limit as number) ?? 20) });
    if (args.name) params.set('name', args.name as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.httpGet('/postgres', params);
  }

  private async getPostgres(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpGet(`/postgres/${encodeURIComponent(args.postgres_id as string)}`);
  }

  private async listRedis(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ limit: String((args.limit as number) ?? 20) });
    if (args.name) params.set('name', args.name as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.httpGet('/redis', params);
  }

  private async getRedisInstance(args: Record<string, unknown>): Promise<ToolResult> {
    return this.httpGet(`/redis/${encodeURIComponent(args.redis_id as string)}`);
  }

  private async retrieveLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const resourceIds = args.resource_ids as string[];
    const params = new URLSearchParams();
    for (const id of resourceIds) params.append('resource', id);
    if (args.start_time) params.set('startTime', args.start_time as string);
    if (args.end_time) params.set('endTime', args.end_time as string);
    if (args.text) params.set('text', args.text as string);
    if (args.level) params.set('level', args.level as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.direction) params.set('direction', args.direction as string);
    return this.httpGet('/logs', params);
  }
}
