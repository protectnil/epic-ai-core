/**
 * Buildkite MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/buildkite/buildkite-mcp-server — transport: stdio + streamable-HTTP (remote), auth: OAuth2 / API token
// Our adapter covers: 20 tools (pipelines, builds, jobs, agents, organizations, user).
// Vendor MCP covers: 20+ tools (list_builds, get_build, create_build, wait_for_build, list_pipelines, get_pipeline,
//   create_pipeline, update_pipeline, get_job_logs, unblock_job, list_clusters, get_cluster, list_cluster_queues,
//   get_cluster_queue, and more). MCP is actively maintained (523+ commits as of 2026-03-28), official, MIT licensed.
// Recommendation: use-both — vendor MCP adds wait_for_build (polling tool not in REST API), our adapter adds
//   list_organizations, get_organization, list_agents, get_agent, stop_agent, cancel_build, rebuild, retry_job, get_user.
//   Use vendor MCP for interactive/IDE workflows. Use this adapter for automation, air-gapped, and agent-management tools.
//
// Integration: use-both
// MCP-sourced tools (unique): wait_for_build, list_clusters, get_cluster, list_cluster_queues, get_cluster_queue
// REST-sourced tools (unique): list_organizations, get_organization, list_agents, get_agent, stop_agent,
//   cancel_build, rebuild, retry_job, get_user
// Shared: list_builds, get_build, create_build, list_pipelines, get_pipeline, create_pipeline, update_pipeline,
//   delete_pipeline, get_job_logs, unblock_job, list_jobs
//
// Base URL: https://api.buildkite.com/v2
// Auth: Bearer token (API access token from Buildkite account settings → API Access Tokens)
// Docs: https://buildkite.com/docs/apis/rest-api
// Rate limits: Not officially documented; practical limit ~100 req/min per token (not in official docs)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BuildkiteConfig {
  apiToken: string;
  baseUrl?: string;
}

export class BuildkiteMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: BuildkiteConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.buildkite.com/v2';
  }

  static catalog() {
    return {
      name: 'buildkite',
      displayName: 'Buildkite',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'buildkite', 'ci', 'cd', 'pipeline', 'build', 'job', 'agent', 'deploy',
        'continuous integration', 'continuous deployment', 'test', 'artifact',
        'organization', 'cluster', 'queue', 'webhook',
      ],
      toolNames: [
        'list_organizations', 'get_organization',
        'list_pipelines', 'get_pipeline', 'create_pipeline', 'update_pipeline', 'delete_pipeline',
        'list_builds', 'get_build', 'create_build', 'cancel_build', 'rebuild',
        'list_jobs', 'get_job_log', 'retry_job', 'unblock_job',
        'list_agents', 'get_agent', 'stop_agent',
        'get_user',
      ],
      description: 'Buildkite CI/CD: manage pipelines, trigger and monitor builds, inspect job logs, control agents, and query organizations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_organizations',
        description: 'List all organizations accessible by the current API token',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 30, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Get details of a specific Buildkite organization by its slug',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug (URL-friendly name, e.g. "acme-corp")',
            },
          },
          required: ['org_slug'],
        },
      },
      {
        name: 'list_pipelines',
        description: 'List all pipelines in a Buildkite organization with optional search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 30, max: 100)',
            },
          },
          required: ['org_slug'],
        },
      },
      {
        name: 'get_pipeline',
        description: 'Get full details of a specific Buildkite pipeline by organization and pipeline slug',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            pipeline_slug: {
              type: 'string',
              description: 'The pipeline slug (URL-friendly pipeline name)',
            },
          },
          required: ['org_slug', 'pipeline_slug'],
        },
      },
      {
        name: 'create_pipeline',
        description: 'Create a new Buildkite pipeline in an organization with a specified name and repository',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            name: {
              type: 'string',
              description: 'Display name of the new pipeline',
            },
            repository: {
              type: 'string',
              description: 'Git repository URL (e.g. git@github.com:org/repo.git)',
            },
            description: {
              type: 'string',
              description: 'Optional description for the pipeline',
            },
            default_branch: {
              type: 'string',
              description: 'Default branch for the pipeline (default: main)',
            },
          },
          required: ['org_slug', 'name', 'repository'],
        },
      },
      {
        name: 'update_pipeline',
        description: 'Update an existing Buildkite pipeline — change name, description, default branch, or visibility',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            pipeline_slug: {
              type: 'string',
              description: 'The pipeline slug to update',
            },
            name: {
              type: 'string',
              description: 'New display name (optional)',
            },
            description: {
              type: 'string',
              description: 'New description (optional)',
            },
            default_branch: {
              type: 'string',
              description: 'New default branch (optional)',
            },
            visibility: {
              type: 'string',
              description: 'Pipeline visibility: public or private (optional)',
            },
          },
          required: ['org_slug', 'pipeline_slug'],
        },
      },
      {
        name: 'delete_pipeline',
        description: 'Delete a Buildkite pipeline and all its builds — this is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            pipeline_slug: {
              type: 'string',
              description: 'The pipeline slug to delete',
            },
          },
          required: ['org_slug', 'pipeline_slug'],
        },
      },
      {
        name: 'list_builds',
        description: 'List builds across all pipelines or within a specific pipeline, with filters for branch, state, and date',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            pipeline_slug: {
              type: 'string',
              description: 'Filter to a specific pipeline slug (optional — omit for all pipelines)',
            },
            branch: {
              type: 'string',
              description: 'Filter by branch name (optional)',
            },
            state: {
              type: 'string',
              description: 'Filter by build state: running, scheduled, passed, failed, blocked, canceled, canceling, skipped, not_run (optional)',
            },
            created_from: {
              type: 'string',
              description: 'ISO 8601 datetime — only include builds created at or after this time (optional)',
            },
            created_to: {
              type: 'string',
              description: 'ISO 8601 datetime — only include builds created before or at this time (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 30, max: 100)',
            },
          },
          required: ['org_slug'],
        },
      },
      {
        name: 'get_build',
        description: 'Get full details of a specific Buildkite build including steps, jobs, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            pipeline_slug: {
              type: 'string',
              description: 'The pipeline slug',
            },
            build_number: {
              type: 'number',
              description: 'The build number (integer, not the UUID)',
            },
          },
          required: ['org_slug', 'pipeline_slug', 'build_number'],
        },
      },
      {
        name: 'create_build',
        description: 'Trigger a new Buildkite build on a specific branch or commit, with optional environment variables and message',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            pipeline_slug: {
              type: 'string',
              description: 'The pipeline slug to build',
            },
            branch: {
              type: 'string',
              description: 'Branch to build (default: pipeline default branch)',
            },
            commit: {
              type: 'string',
              description: 'Commit SHA to build (default: HEAD)',
            },
            message: {
              type: 'string',
              description: 'Build message to display in the dashboard',
            },
            env: {
              type: 'string',
              description: 'JSON object of environment variable overrides (e.g. {"DEPLOY_ENV":"staging"})',
            },
            meta_data: {
              type: 'string',
              description: 'JSON object of build metadata key-value pairs (optional)',
            },
          },
          required: ['org_slug', 'pipeline_slug'],
        },
      },
      {
        name: 'cancel_build',
        description: 'Cancel a running or scheduled Buildkite build',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            pipeline_slug: {
              type: 'string',
              description: 'The pipeline slug',
            },
            build_number: {
              type: 'number',
              description: 'The build number to cancel',
            },
          },
          required: ['org_slug', 'pipeline_slug', 'build_number'],
        },
      },
      {
        name: 'rebuild',
        description: 'Create a new build from an existing build (retry the same commit and branch)',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            pipeline_slug: {
              type: 'string',
              description: 'The pipeline slug',
            },
            build_number: {
              type: 'number',
              description: 'The build number to rebuild',
            },
          },
          required: ['org_slug', 'pipeline_slug', 'build_number'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List all jobs in a specific Buildkite build with their states and exit codes',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            pipeline_slug: {
              type: 'string',
              description: 'The pipeline slug',
            },
            build_number: {
              type: 'number',
              description: 'The build number',
            },
          },
          required: ['org_slug', 'pipeline_slug', 'build_number'],
        },
      },
      {
        name: 'get_job_log',
        description: 'Retrieve the full log output of a specific job in a Buildkite build',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            pipeline_slug: {
              type: 'string',
              description: 'The pipeline slug',
            },
            build_number: {
              type: 'number',
              description: 'The build number',
            },
            job_id: {
              type: 'string',
              description: 'The job UUID (from list_jobs)',
            },
          },
          required: ['org_slug', 'pipeline_slug', 'build_number', 'job_id'],
        },
      },
      {
        name: 'retry_job',
        description: 'Retry a failed or canceled job in a Buildkite build',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            pipeline_slug: {
              type: 'string',
              description: 'The pipeline slug',
            },
            build_number: {
              type: 'number',
              description: 'The build number containing the job',
            },
            job_id: {
              type: 'string',
              description: 'The job UUID to retry',
            },
          },
          required: ['org_slug', 'pipeline_slug', 'build_number', 'job_id'],
        },
      },
      {
        name: 'unblock_job',
        description: 'Unblock a manual gate (block step) job in a Buildkite build to allow the pipeline to continue',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            pipeline_slug: {
              type: 'string',
              description: 'The pipeline slug',
            },
            build_number: {
              type: 'number',
              description: 'The build number containing the blocked job',
            },
            job_id: {
              type: 'string',
              description: 'The job UUID of the block step to unblock',
            },
            unblocker_uuid: {
              type: 'string',
              description: 'UUID of the user who is unblocking (optional — defaults to token owner)',
            },
          },
          required: ['org_slug', 'pipeline_slug', 'build_number', 'job_id'],
        },
      },
      {
        name: 'list_agents',
        description: 'List active Buildkite agents in an organization with optional hostname and metadata filters',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            hostname: {
              type: 'string',
              description: 'Filter agents by hostname (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 30, max: 100)',
            },
          },
          required: ['org_slug'],
        },
      },
      {
        name: 'get_agent',
        description: 'Get details of a specific Buildkite agent by agent ID including status and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            agent_id: {
              type: 'string',
              description: 'The agent UUID',
            },
          },
          required: ['org_slug', 'agent_id'],
        },
      },
      {
        name: 'stop_agent',
        description: 'Stop a Buildkite agent — optionally forcing it to stop even if it is running a job',
        inputSchema: {
          type: 'object',
          properties: {
            org_slug: {
              type: 'string',
              description: 'The organization slug',
            },
            agent_id: {
              type: 'string',
              description: 'The agent UUID to stop',
            },
            force: {
              type: 'boolean',
              description: 'If true, stop immediately even if a job is running (default: false)',
            },
          },
          required: ['org_slug', 'agent_id'],
        },
      },
      {
        name: 'get_user',
        description: 'Get the user account associated with the current Buildkite API token',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_organizations':
          return this.listOrganizations(args);
        case 'get_organization':
          return this.getOrganization(args);
        case 'list_pipelines':
          return this.listPipelines(args);
        case 'get_pipeline':
          return this.getPipeline(args);
        case 'create_pipeline':
          return this.createPipeline(args);
        case 'update_pipeline':
          return this.updatePipeline(args);
        case 'delete_pipeline':
          return this.deletePipeline(args);
        case 'list_builds':
          return this.listBuilds(args);
        case 'get_build':
          return this.getBuild(args);
        case 'create_build':
          return this.createBuild(args);
        case 'cancel_build':
          return this.cancelBuild(args);
        case 'rebuild':
          return this.rebuild(args);
        case 'list_jobs':
          return this.listJobs(args);
        case 'get_job_log':
          return this.getJobLog(args);
        case 'retry_job':
          return this.retryJob(args);
        case 'unblock_job':
          return this.unblockJob(args);
        case 'list_agents':
          return this.listAgents(args);
        case 'get_agent':
          return this.getAgent(args);
        case 'stop_agent':
          return this.stopAgent(args);
        case 'get_user':
          return this.getUser();
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
      'Content-Type': 'application/json',
    };
  }

  private async bkGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bkPost(path: string, body: Record<string, unknown> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bkPatch(path: string, body: Record<string, unknown> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bkPut(path: string, body: Record<string, unknown> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // Some PUT endpoints return 204 No Content
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bkDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    return this.bkGet('/organizations', params);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug) return { content: [{ type: 'text', text: 'org_slug is required' }], isError: true };
    return this.bkGet(`/organizations/${encodeURIComponent(args.org_slug as string)}`);
  }

  private async listPipelines(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug) return { content: [{ type: 'text', text: 'org_slug is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    return this.bkGet(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines`, params);
  }

  private async getPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.pipeline_slug) return { content: [{ type: 'text', text: 'org_slug and pipeline_slug are required' }], isError: true };
    return this.bkGet(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines/${encodeURIComponent(args.pipeline_slug as string)}`);
  }

  private async createPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.name || !args.repository) return { content: [{ type: 'text', text: 'org_slug, name, and repository are required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name, repository: args.repository };
    if (args.description) body.description = args.description;
    if (args.default_branch) body.default_branch = args.default_branch;
    return this.bkPost(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines`, body);
  }

  private async updatePipeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.pipeline_slug) return { content: [{ type: 'text', text: 'org_slug and pipeline_slug are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.default_branch) body.default_branch = args.default_branch;
    if (args.visibility) body.visibility = args.visibility;
    return this.bkPatch(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines/${encodeURIComponent(args.pipeline_slug as string)}`, body);
  }

  private async deletePipeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.pipeline_slug) return { content: [{ type: 'text', text: 'org_slug and pipeline_slug are required' }], isError: true };
    return this.bkDelete(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines/${encodeURIComponent(args.pipeline_slug as string)}`);
  }

  private async listBuilds(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug) return { content: [{ type: 'text', text: 'org_slug is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.branch) params.branch = args.branch as string;
    if (args.state) params.state = args.state as string;
    if (args.created_from) params.created_from = args.created_from as string;
    if (args.created_to) params.created_to = args.created_to as string;
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    const path = args.pipeline_slug
      ? `/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines/${encodeURIComponent(args.pipeline_slug as string)}/builds`
      : `/organizations/${encodeURIComponent(args.org_slug as string)}/builds`;
    return this.bkGet(path, params);
  }

  private async getBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.pipeline_slug || args.build_number === undefined) {
      return { content: [{ type: 'text', text: 'org_slug, pipeline_slug, and build_number are required' }], isError: true };
    }
    return this.bkGet(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines/${encodeURIComponent(args.pipeline_slug as string)}/builds/${encodeURIComponent(args.build_number as string)}`);
  }

  private async createBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.pipeline_slug) return { content: [{ type: 'text', text: 'org_slug and pipeline_slug are required' }], isError: true };
    const body: Record<string, unknown> = {
      branch: (args.branch as string) || 'main',
      commit: (args.commit as string) || 'HEAD',
    };
    if (args.message) body.message = args.message;
    if (args.env) {
      try { body.env = JSON.parse(args.env as string); } catch { body.env = args.env; }
    }
    if (args.meta_data) {
      try { body.meta_data = JSON.parse(args.meta_data as string); } catch { body.meta_data = args.meta_data; }
    }
    return this.bkPost(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines/${encodeURIComponent(args.pipeline_slug as string)}/builds`, body);
  }

  private async cancelBuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.pipeline_slug || args.build_number === undefined) {
      return { content: [{ type: 'text', text: 'org_slug, pipeline_slug, and build_number are required' }], isError: true };
    }
    return this.bkPut(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines/${encodeURIComponent(args.pipeline_slug as string)}/builds/${encodeURIComponent(args.build_number as string)}/cancel`);
  }

  private async rebuild(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.pipeline_slug || args.build_number === undefined) {
      return { content: [{ type: 'text', text: 'org_slug, pipeline_slug, and build_number are required' }], isError: true };
    }
    return this.bkPut(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines/${encodeURIComponent(args.pipeline_slug as string)}/builds/${encodeURIComponent(args.build_number as string)}/rebuild`);
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.pipeline_slug || args.build_number === undefined) {
      return { content: [{ type: 'text', text: 'org_slug, pipeline_slug, and build_number are required' }], isError: true };
    }
    return this.bkGet(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines/${encodeURIComponent(args.pipeline_slug as string)}/builds/${encodeURIComponent(args.build_number as string)}/jobs`);
  }

  private async getJobLog(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.pipeline_slug || args.build_number === undefined || !args.job_id) {
      return { content: [{ type: 'text', text: 'org_slug, pipeline_slug, build_number, and job_id are required' }], isError: true };
    }
    return this.bkGet(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines/${encodeURIComponent(args.pipeline_slug as string)}/builds/${encodeURIComponent(args.build_number as string)}/jobs/${encodeURIComponent(args.job_id as string)}/log`);
  }

  private async retryJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.pipeline_slug || args.build_number === undefined || !args.job_id) {
      return { content: [{ type: 'text', text: 'org_slug, pipeline_slug, build_number, and job_id are required' }], isError: true };
    }
    return this.bkPut(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines/${encodeURIComponent(args.pipeline_slug as string)}/builds/${encodeURIComponent(args.build_number as string)}/jobs/${encodeURIComponent(args.job_id as string)}/retry`);
  }

  private async unblockJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.pipeline_slug || args.build_number === undefined || !args.job_id) {
      return { content: [{ type: 'text', text: 'org_slug, pipeline_slug, build_number, and job_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.unblocker_uuid) body.unblocker_uuid = args.unblocker_uuid;
    return this.bkPut(`/organizations/${encodeURIComponent(args.org_slug as string)}/pipelines/${encodeURIComponent(args.pipeline_slug as string)}/builds/${encodeURIComponent(args.build_number as string)}/jobs/${encodeURIComponent(args.job_id as string)}/unblock`, body);
  }

  private async listAgents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug) return { content: [{ type: 'text', text: 'org_slug is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.hostname) params.hostname = args.hostname as string;
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    return this.bkGet(`/organizations/${encodeURIComponent(args.org_slug as string)}/agents`, params);
  }

  private async getAgent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.agent_id) return { content: [{ type: 'text', text: 'org_slug and agent_id are required' }], isError: true };
    return this.bkGet(`/organizations/${encodeURIComponent(args.org_slug as string)}/agents/${encodeURIComponent(args.agent_id as string)}`);
  }

  private async stopAgent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_slug || !args.agent_id) return { content: [{ type: 'text', text: 'org_slug and agent_id are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (typeof args.force === 'boolean') body.force = args.force;
    return this.bkPut(`/organizations/${encodeURIComponent(args.org_slug as string)}/agents/${encodeURIComponent(args.agent_id as string)}/stop`, body);
  }

  private async getUser(): Promise<ToolResult> {
    return this.bkGet('/user');
  }
}
