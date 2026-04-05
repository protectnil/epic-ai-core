/**
 * dbt Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/dbt-labs/dbt-mcp — transport: stdio (default) + streamable-HTTP, auth: dbt Cloud service token or user PAT
// Vendor MCP is official (dbt Labs org). Actively maintained — 503 commits, last commit Mar 27, 2026.
// Vendor MCP covers: 24+ tools for dbt Core, dbt Fusion, dbt Platform — CLI, semantic layer, metadata, docs.
// Our adapter covers: 18 tools (REST API v2 — jobs, runs, projects, environments, service tokens, webhooks).
// Integration: use-both — MCP and REST API cover completely non-overlapping capabilities.
// MCP-sourced tools (24): execute_sql, text_to_sql, get_dimensions, get_entities, get_metrics_compiled_sql,
//   list_metrics, list_saved_queries, query_metrics, get_environment_details, get_job_last_run_results,
//   get_model_details, get_model_health, get_model_parents, get_model_performance, get_related_models,
//   get_seed_details, get_semantic_model_details, get_snapshot_details, get_source_details, get_test_details,
//   get_product_doc_pages, search_product_docs, get_mcp_server_branch, get_mcp_server_version
// REST-sourced tools (18): get_account, list_projects, get_project, list_environments, get_environment,
//   list_jobs, get_job, create_job, update_job, delete_job, trigger_job_run, list_runs, get_run,
//   cancel_run, list_run_artifacts, get_run_artifact, list_service_tokens, list_webhooks
// Combined coverage: 42 tools (MCP: 24 + REST: 18 — shared: 0). Use vendor MCP for semantic layer,
// SQL execution, and metadata queries. Use this adapter for headless CI/CD job management, run
// triggering, and artifact retrieval where the dbt CLI/Platform connection is not available.
//
// Base URL: https://cloud.getdbt.com/api/v2
//   EMEA: https://emea.dbt.com/api/v2
//   Single-tenant: https://{prefix}.us1.dbt.com/api/v2
// Auth: Authorization: Token {service_token}  (service tokens recommended for server-to-server)
//   or: Authorization: Token {user_pat}  (personal access tokens for user-scoped access)
// Docs: https://docs.getdbt.com/dbt-cloud/api-v2
//       https://docs.getdbt.com/docs/dbt-cloud-apis/authentication
// Rate limits: Varies by plan. Enterprise: ~3,600 req/hr per token. Developer: lower limits apply.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DbtCloudConfig {
  /** Service token or personal access token */
  serviceToken: string;
  /**
   * Base URL for your dbt Cloud region.
   * US (default): "https://cloud.getdbt.com/api/v2"
   * EMEA: "https://emea.dbt.com/api/v2"
   * Single-tenant: "https://{prefix}.us1.dbt.com/api/v2"
   */
  baseUrl?: string;
  /** dbt Cloud account ID — required for all account-scoped operations */
  accountId: number;
}

export class DbtCloudMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly accountId: number;

  constructor(config: DbtCloudConfig) {
    super();
    this.baseUrl = (config.baseUrl || 'https://cloud.getdbt.com/api/v2').replace(/\/$/, '');
    this.authHeader = `Token ${config.serviceToken}`;
    this.accountId = config.accountId;
  }

  static catalog() {
    return {
      name: 'dbt-cloud',
      displayName: 'dbt Cloud',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['dbt', 'dbt-cloud', 'data-build-tool', 'analytics', 'transform', 'elt', 'sql', 'job', 'run', 'pipeline', 'model', 'semantic-layer'],
      toolNames: [
        'list_projects', 'get_project', 'list_environments', 'get_environment',
        'list_jobs', 'get_job', 'create_job', 'update_job', 'delete_job',
        'trigger_job_run', 'list_runs', 'get_run', 'cancel_run', 'list_run_artifacts',
        'get_run_artifact', 'list_service_tokens', 'list_webhooks', 'get_account',
      ],
      description: 'Manage dbt Cloud jobs, runs, projects, environments, service tokens, and webhooks. Trigger and monitor dbt transformation pipelines via the REST API.',
      author: 'protectnil',
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_account',
        description: 'Retrieve details for the configured dbt Cloud account, including plan, subscription, and feature flags.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_projects',
        description: 'List all dbt Cloud projects for the configured account, with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of projects to return (default: 100).',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Retrieve full details for a specific dbt Cloud project by ID, including repository connection and dbt version.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'dbt Cloud project ID.',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_environments',
        description: 'List dbt Cloud environments for a project, including deployment type and dbt version.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'dbt Cloud project ID to list environments for.',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of environments to return (default: 100).',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_environment',
        description: 'Retrieve details for a specific dbt Cloud environment, including type (development/deployment), dbt version, and credentials.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'dbt Cloud project ID.',
            },
            environment_id: {
              type: 'number',
              description: 'dbt Cloud environment ID.',
            },
          },
          required: ['project_id', 'environment_id'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List all dbt Cloud jobs for the account, with optional project and environment filters.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'Filter jobs by dbt Cloud project ID.',
            },
            environment_id: {
              type: 'number',
              description: 'Filter jobs by dbt Cloud environment ID.',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of jobs to return (default: 100).',
            },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Retrieve the definition and most-recent run status of a specific dbt Cloud job.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'dbt Cloud job ID.',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'create_job',
        description: 'Create a new dbt Cloud job in a project and environment with specified commands and schedule.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'number',
              description: 'dbt Cloud project ID to create the job in.',
            },
            environment_id: {
              type: 'number',
              description: 'dbt Cloud environment ID for the job.',
            },
            name: {
              type: 'string',
              description: 'Human-readable name for the job.',
            },
            execute_steps: {
              type: 'array',
              description: 'List of dbt commands to execute (e.g. ["dbt run", "dbt test"]).',
              items: { type: 'string' },
            },
            dbt_version: {
              type: 'string',
              description: 'dbt version override for this job (e.g. "1.7.0").',
            },
            triggers: {
              type: 'object',
              description: 'Trigger configuration object (e.g. {"github_webhook": false, "schedule": true}).',
            },
            settings: {
              type: 'object',
              description: 'Job settings object (e.g. {"threads": 4, "target_name": "prod"}).',
            },
            schedule: {
              type: 'object',
              description: 'Cron schedule object (e.g. {"cron": "0 * * * *"}).',
            },
            generate_docs: {
              type: 'boolean',
              description: 'Whether to generate documentation for this job (default: false).',
            },
            run_generate_sources: {
              type: 'boolean',
              description: 'Whether to run source freshness checks (default: false).',
            },
          },
          required: ['project_id', 'environment_id', 'name', 'execute_steps'],
        },
      },
      {
        name: 'update_job',
        description: 'Update the definition of an existing dbt Cloud job, including commands, schedule, and settings.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'dbt Cloud job ID to update.',
            },
            name: {
              type: 'string',
              description: 'New name for the job.',
            },
            execute_steps: {
              type: 'array',
              description: 'Replacement list of dbt commands (e.g. ["dbt run", "dbt test"]).',
              items: { type: 'string' },
            },
            dbt_version: {
              type: 'string',
              description: 'dbt version override (e.g. "1.7.0").',
            },
            triggers: {
              type: 'object',
              description: 'Updated trigger configuration object.',
            },
            settings: {
              type: 'object',
              description: 'Updated job settings object.',
            },
            schedule: {
              type: 'object',
              description: 'Updated cron schedule object.',
            },
            generate_docs: {
              type: 'boolean',
              description: 'Whether to generate documentation for this job.',
            },
            run_generate_sources: {
              type: 'boolean',
              description: 'Whether to run source freshness checks.',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'delete_job',
        description: 'Delete a dbt Cloud job definition. This does not cancel any in-progress runs.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'dbt Cloud job ID to delete.',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'trigger_job_run',
        description: 'Trigger a dbt Cloud job to run immediately, with optional overrides for branch, schema, steps, and version.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'number',
              description: 'dbt Cloud job ID to run.',
            },
            cause: {
              type: 'string',
              description: 'Human-readable description of why the run was triggered (default: "Triggered via API").',
            },
            git_branch: {
              type: 'string',
              description: 'Override the git branch to run against.',
            },
            git_sha: {
              type: 'string',
              description: 'Override the exact git commit SHA to run against.',
            },
            schema_override: {
              type: 'string',
              description: 'Override the target schema for this run.',
            },
            dbt_version_override: {
              type: 'string',
              description: 'Override the dbt version for this run.',
            },
            steps_override: {
              type: 'array',
              description: 'Override the list of dbt commands for this run (e.g. ["dbt run", "dbt test"]).',
              items: { type: 'string' },
            },
            target_name_override: {
              type: 'string',
              description: 'Override the target name (e.g. "prod").',
            },
            generate_docs_override: {
              type: 'boolean',
              description: 'Override whether to generate docs for this run.',
            },
            timeout_seconds_override: {
              type: 'number',
              description: 'Override the job timeout in seconds.',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_runs',
        description: 'List dbt Cloud job runs for the account, with optional filters for job, status, environment, and sort order.',
        inputSchema: {
          type: 'object',
          properties: {
            job_definition_id: {
              type: 'number',
              description: 'Filter runs by job ID.',
            },
            environment_id: {
              type: 'number',
              description: 'Filter runs by environment ID.',
            },
            project_id: {
              type: 'number',
              description: 'Filter runs by project ID.',
            },
            status: {
              type: 'number',
              description: 'Filter by run status code: 1=Queued, 2=Starting, 3=Running, 10=Success, 20=Error, 30=Cancelled.',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of runs to return (default: 100).',
            },
            order_by: {
              type: 'string',
              description: 'Field to order results by (e.g. "-created_at" for newest first).',
            },
            include_related: {
              type: 'array',
              description: 'Related objects to include: ["trigger", "job", "debug_logs", "run_steps"].',
              items: { type: 'string' },
            },
          },
        },
      },
      {
        name: 'get_run',
        description: 'Retrieve details and current status of a specific dbt Cloud run, optionally including related objects.',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'number',
              description: 'dbt Cloud run ID.',
            },
            include_related: {
              type: 'array',
              description: 'Related objects to include: ["trigger", "job", "debug_logs", "run_steps", "environment"].',
              items: { type: 'string' },
            },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'cancel_run',
        description: 'Cancel a dbt Cloud run that is currently queued or in progress.',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'number',
              description: 'dbt Cloud run ID to cancel.',
            },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'list_run_artifacts',
        description: 'List all artifacts produced by a completed dbt Cloud run (e.g. manifest.json, run_results.json, catalog.json).',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'number',
              description: 'dbt Cloud run ID.',
            },
            step: {
              type: 'number',
              description: 'Optional run step index to scope artifacts to a specific step.',
            },
          },
          required: ['run_id'],
        },
      },
      {
        name: 'get_run_artifact',
        description: 'Download a specific artifact from a completed dbt Cloud run by path (e.g. "manifest.json", "run_results.json").',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'number',
              description: 'dbt Cloud run ID.',
            },
            path: {
              type: 'string',
              description: 'Artifact path relative to the run (e.g. "manifest.json", "run_results.json", "catalog.json").',
            },
            step: {
              type: 'number',
              description: 'Optional run step index to scope to a specific step.',
            },
          },
          required: ['run_id', 'path'],
        },
      },
      {
        name: 'list_service_tokens',
        description: 'List all service tokens for the dbt Cloud account, including name, state, and permission sets.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0).',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of service tokens to return (default: 100).',
            },
          },
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all outbound webhooks configured for the dbt Cloud account, including event types and endpoint URLs.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'number',
              description: 'dbt Cloud account ID (defaults to the configured accountId).',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account':
          return await this.getAccount();
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'list_environments':
          return await this.listEnvironments(args);
        case 'get_environment':
          return await this.getEnvironment(args);
        case 'list_jobs':
          return await this.listJobs(args);
        case 'get_job':
          return await this.getJob(args);
        case 'create_job':
          return await this.createJob(args);
        case 'update_job':
          return await this.updateJob(args);
        case 'delete_job':
          return await this.deleteJob(args);
        case 'trigger_job_run':
          return await this.triggerJobRun(args);
        case 'list_runs':
          return await this.listRuns(args);
        case 'get_run':
          return await this.getRun(args);
        case 'cancel_run':
          return await this.cancelRun(args);
        case 'list_run_artifacts':
          return await this.listRunArtifacts(args);
        case 'get_run_artifact':
          return await this.getRunArtifact(args);
        case 'list_service_tokens':
          return await this.listServiceTokens(args);
        case 'list_webhooks':
          return await this.listWebhooks(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------


  private async request(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...this.headers, ...(options.headers as Record<string, string> || {}) },
    });

    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `API error: HTTP ${response.status} ${response.statusText}${errBody ? ` — ${errBody.slice(0, 500)}` : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`dbt Cloud returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getAccount(): Promise<ToolResult> {
    return this.request(`/accounts/${this.accountId}/`);
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.offset != null) params.set('offset', String(args.offset as number));
    if (args.limit != null) params.set('limit', String(args.limit as number));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/accounts/${this.accountId}/projects/${qs}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const project_id = args.project_id as number;
    if (!project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    return this.request(`/accounts/${this.accountId}/projects/${project_id}/`);
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    const project_id = args.project_id as number;
    if (!project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.offset != null) params.set('offset', String(args.offset as number));
    if (args.limit != null) params.set('limit', String(args.limit as number));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/accounts/${this.accountId}/projects/${project_id}/environments/${qs}`);
  }

  private async getEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const project_id = args.project_id as number;
    const environment_id = args.environment_id as number;
    if (!project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    if (!environment_id) return { content: [{ type: 'text', text: 'environment_id is required' }], isError: true };
    return this.request(`/accounts/${this.accountId}/projects/${project_id}/environments/${environment_id}/`);
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.project_id != null) params.set('project_id', String(args.project_id as number));
    if (args.environment_id != null) params.set('environment_id', String(args.environment_id as number));
    if (args.offset != null) params.set('offset', String(args.offset as number));
    if (args.limit != null) params.set('limit', String(args.limit as number));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/accounts/${this.accountId}/jobs/${qs}`);
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    const job_id = args.job_id as number;
    if (!job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.request(`/accounts/${this.accountId}/jobs/${job_id}/`);
  }

  private async createJob(args: Record<string, unknown>): Promise<ToolResult> {
    const { project_id, environment_id, name, execute_steps } = args;
    if (!project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    if (!environment_id) return { content: [{ type: 'text', text: 'environment_id is required' }], isError: true };
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!execute_steps) return { content: [{ type: 'text', text: 'execute_steps is required' }], isError: true };

    const body: Record<string, unknown> = {
      project_id, environment_id, name, execute_steps,
      account_id: this.accountId,
    };
    if (args.dbt_version != null) body.dbt_version = args.dbt_version;
    if (args.triggers != null) body.triggers = args.triggers;
    if (args.settings != null) body.settings = args.settings;
    if (args.schedule != null) body.schedule = args.schedule;
    if (typeof args.generate_docs === 'boolean') body.generate_docs = args.generate_docs;
    if (typeof args.run_generate_sources === 'boolean') body.run_generate_sources = args.run_generate_sources;

    return this.request(`/accounts/${this.accountId}/jobs/`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateJob(args: Record<string, unknown>): Promise<ToolResult> {
    const job_id = args.job_id as number;
    if (!job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };

    const body: Record<string, unknown> = { account_id: this.accountId, id: job_id };
    if (args.name != null) body.name = args.name;
    if (args.execute_steps != null) body.execute_steps = args.execute_steps;
    if (args.dbt_version != null) body.dbt_version = args.dbt_version;
    if (args.triggers != null) body.triggers = args.triggers;
    if (args.settings != null) body.settings = args.settings;
    if (args.schedule != null) body.schedule = args.schedule;
    if (typeof args.generate_docs === 'boolean') body.generate_docs = args.generate_docs;
    if (typeof args.run_generate_sources === 'boolean') body.run_generate_sources = args.run_generate_sources;

    return this.request(`/accounts/${this.accountId}/jobs/${job_id}/`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteJob(args: Record<string, unknown>): Promise<ToolResult> {
    const job_id = args.job_id as number;
    if (!job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.request(`/accounts/${this.accountId}/jobs/${job_id}/`, { method: 'DELETE' });
  }

  private async triggerJobRun(args: Record<string, unknown>): Promise<ToolResult> {
    const job_id = args.job_id as number;
    if (!job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };

    const body: Record<string, unknown> = {
      cause: (args.cause as string) || 'Triggered via API',
    };
    if (args.git_branch != null) body.git_branch = args.git_branch;
    if (args.git_sha != null) body.git_sha = args.git_sha;
    if (args.schema_override != null) body.schema_override = args.schema_override;
    if (args.dbt_version_override != null) body.dbt_version_override = args.dbt_version_override;
    if (args.steps_override != null) body.steps_override = args.steps_override;
    if (args.target_name_override != null) body.target_name_override = args.target_name_override;
    if (typeof args.generate_docs_override === 'boolean') body.generate_docs_override = args.generate_docs_override;
    if (args.timeout_seconds_override != null) body.timeout_seconds_override = args.timeout_seconds_override;

    return this.request(`/accounts/${this.accountId}/jobs/${job_id}/run/`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async listRuns(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.job_definition_id != null) params.set('job_definition_id', String(args.job_definition_id as number));
    if (args.environment_id != null) params.set('environment_id', String(args.environment_id as number));
    if (args.project_id != null) params.set('project_id', String(args.project_id as number));
    if (args.status != null) params.set('status', String(args.status as number));
    if (args.offset != null) params.set('offset', String(args.offset as number));
    if (args.limit != null) params.set('limit', String(args.limit as number));
    if (args.order_by != null) params.set('order_by', args.order_by as string);
    if (args.include_related && Array.isArray(args.include_related)) {
      params.set('include_related', (args.include_related as string[]).join(','));
    }
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/accounts/${this.accountId}/runs/${qs}`);
  }

  private async getRun(args: Record<string, unknown>): Promise<ToolResult> {
    const run_id = args.run_id as number;
    if (!run_id) return { content: [{ type: 'text', text: 'run_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.include_related && Array.isArray(args.include_related)) {
      params.set('include_related', (args.include_related as string[]).join(','));
    }
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/accounts/${this.accountId}/runs/${run_id}/${qs}`);
  }

  private async cancelRun(args: Record<string, unknown>): Promise<ToolResult> {
    const run_id = args.run_id as number;
    if (!run_id) return { content: [{ type: 'text', text: 'run_id is required' }], isError: true };
    return this.request(`/accounts/${this.accountId}/runs/${run_id}/cancel/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  private async listRunArtifacts(args: Record<string, unknown>): Promise<ToolResult> {
    const run_id = args.run_id as number;
    if (!run_id) return { content: [{ type: 'text', text: 'run_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.step != null) params.set('step', String(args.step as number));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/accounts/${this.accountId}/runs/${run_id}/artifacts/${qs}`);
  }

  private async getRunArtifact(args: Record<string, unknown>): Promise<ToolResult> {
    const run_id = args.run_id as number;
    const path = args.path as string;
    if (!run_id) return { content: [{ type: 'text', text: 'run_id is required' }], isError: true };
    if (!path) return { content: [{ type: 'text', text: 'path is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.step != null) params.set('step', String(args.step as number));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/accounts/${this.accountId}/runs/${run_id}/artifacts/${path}${qs}`);
  }

  private async listServiceTokens(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.offset != null) params.set('offset', String(args.offset as number));
    if (args.limit != null) params.set('limit', String(args.limit as number));
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/accounts/${this.accountId}/service-tokens/${qs}`);
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = (args.account_id as number) || this.accountId;
    return this.request(`/accounts/${accountId}/webhooks/subscriptions/`);
  }
}
