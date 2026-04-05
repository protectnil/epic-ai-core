/**
 * Cribl MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://docs.cribl.io/copilot/cribl-mcp-server/ — transport: streamable-HTTP (port 3030), auth: X-API-Key header
//   Vendor-official (Cribl Inc.); 7 tools (cribl_getSystemMetrics, cribl_listWorkerGroups, cribl_getSources,
//   cribl_getDestinations, cribl_listDatasets, cribl_getSavedSearches, cribl_runSearchQuery).
//   Fails the 10+ tools threshold — does NOT qualify for use-vendor-mcp.
//   Community MCP also exists: https://github.com/pebbletek/cribl-mcp — stdio, 8 tools, last release Apr 2025.
// Our adapter covers: 24 tools (full pipeline, route, source, destination, lookup, pack, version, search coverage).
// Recommendation: use-rest-api — official MCP has only 7 tools (threshold is 10+); REST adapter provides broader coverage.
//
// Base URL: https://{workspaceName}-{organizationId}.cribl.cloud  (Cribl.Cloud)
//           https://cribl.example.com:9000                         (on-prem)
//   Adapter appends /api/v1 automatically.
// Auth: OAuth2 client credentials (Cribl.Cloud: POST https://login.cribl.cloud/oauth/token)
//       OR pre-obtained Bearer token (on-prem via /api/v1/auth/login)
// Docs: https://docs.cribl.io/cribl-as-code/api-reference/
// Rate limits: Not officially published; Cribl.Cloud enforces per-workspace throttling

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CriblConfig {
  /**
   * Base URL for the Cribl instance.
   * Cribl.Cloud: https://{workspaceName}-{organizationId}.cribl.cloud
   * On-prem: https://cribl.example.com:9000
   * The adapter appends /api/v1 automatically.
   */
  baseUrl: string;
  /** Client ID for Cribl.Cloud OAuth2 client_credentials flow. */
  clientId?: string;
  /** Client secret for Cribl.Cloud OAuth2 client_credentials flow. */
  clientSecret?: string;
  /** Pre-obtained Bearer token (on-prem or pre-fetched cloud token). */
  bearerToken?: string;
}

export class CriblMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private bearerToken: string | undefined;
  private tokenExpiry: number = 0;

  constructor(config: CriblConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.bearerToken = config.bearerToken;
  }

  static catalog() {
    return {
      name: 'cribl',
      displayName: 'Cribl',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: [
        'cribl', 'stream', 'edge', 'lake', 'logstream', 'pipeline', 'route', 'source',
        'destination', 'input', 'output', 'worker', 'worker group', 'fleet', 'pack',
        'lookup', 'parser', 'function', 'metrics', 'search', 'commit', 'deploy',
        'data pipeline', 'log routing', 'observability pipeline',
      ],
      toolNames: [
        'list_worker_groups', 'get_worker_group', 'list_workers',
        'list_pipelines', 'get_pipeline', 'create_pipeline', 'update_pipeline', 'delete_pipeline',
        'get_routes', 'update_routes',
        'list_sources', 'get_source',
        'list_destinations', 'get_destination',
        'list_lookups', 'get_lookup',
        'list_packs', 'install_pack',
        'get_system_metrics', 'get_system_info',
        'commit_config', 'deploy_config',
        'search_jobs', 'get_search_job_results',
      ],
      description: 'Cribl observability pipeline management: configure pipelines, routes, sources, destinations, lookups, packs, monitor metrics, run searches, and manage worker groups across Stream, Edge, and Lake deployments.',
      author: 'protectnil' as const,
    };
  }

  /**
   * Obtain or return a cached Bearer token.
   * Cribl.Cloud: POST https://login.cribl.cloud/oauth/token (client_credentials).
   * On-prem: pass bearerToken directly (obtained via /api/v1/auth/login externally).
   */
  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;
    // If a static token was set and we have no expiry tracking, use it
    if (this.bearerToken && this.tokenExpiry === 0) return this.bearerToken;

    if (this.clientId && this.clientSecret) {
      const resp = await this.fetchWithRetry('https://login.cribl.cloud/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          audience: 'https://api.cribl.cloud',
        }),
      });
      if (!resp.ok) throw new Error(`Cribl OAuth2 failed: ${resp.status} ${resp.statusText}`);
      let data: unknown;
      try { data = await resp.json(); } catch {
        throw new Error(`Cribl OAuth2 returned non-JSON (HTTP ${resp.status})`);
      }
      const d = data as Record<string, unknown>;
      this.bearerToken = d.access_token as string;
      this.tokenExpiry = now + ((d.expires_in as number) - 60) * 1000;
      return this.bearerToken;
    }

    throw new Error('CriblMCPServer: provide either bearerToken or clientId + clientSecret');
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    const init: RequestInit = { method, headers };
    if (body !== undefined) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1${path}`, init);
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Cribl returned non-JSON response (HTTP ${response.status})`);
    }
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_worker_groups',
        description: 'List all Worker Groups or Fleets configured in the Cribl deployment',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_worker_group',
        description: 'Get configuration and status details for a specific Cribl Worker Group or Fleet by name',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
          },
          required: ['group'],
        },
      },
      {
        name: 'list_workers',
        description: 'List worker nodes in a Worker Group with hostname, status, and connection details',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
          },
          required: ['group'],
        },
      },
      {
        name: 'list_pipelines',
        description: 'List all data processing pipelines configured for a specific Worker Group or Fleet',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name (e.g. default)' },
          },
          required: ['group'],
        },
      },
      {
        name: 'get_pipeline',
        description: 'Fetch the full configuration of a specific pipeline including functions and settings',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
            pipeline_id: { type: 'string', description: 'Pipeline ID to retrieve' },
          },
          required: ['group', 'pipeline_id'],
        },
      },
      {
        name: 'create_pipeline',
        description: 'Create a new data processing pipeline in a Worker Group with specified functions',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
            pipeline_id: { type: 'string', description: 'Unique ID for the new pipeline' },
            config: {
              type: 'object',
              description: 'Pipeline configuration object including functions array and description',
            },
          },
          required: ['group', 'pipeline_id', 'config'],
        },
      },
      {
        name: 'update_pipeline',
        description: 'Update an existing pipeline configuration in a Worker Group by replacing its definition',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
            pipeline_id: { type: 'string', description: 'Pipeline ID to update' },
            config: {
              type: 'object',
              description: 'Updated pipeline configuration object',
            },
          },
          required: ['group', 'pipeline_id', 'config'],
        },
      },
      {
        name: 'delete_pipeline',
        description: 'Delete a pipeline from a Worker Group by pipeline ID',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
            pipeline_id: { type: 'string', description: 'Pipeline ID to delete' },
          },
          required: ['group', 'pipeline_id'],
        },
      },
      {
        name: 'get_routes',
        description: 'Get the full routes configuration object for a Worker Group, showing all routing rules in order',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
          },
          required: ['group'],
        },
      },
      {
        name: 'update_routes',
        description: 'Replace the entire routes configuration for a Worker Group with a new ordered list',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
            routes: {
              type: 'array',
              description: 'Ordered array of route objects with id, name, filter, pipeline, output, and enabled fields',
            },
          },
          required: ['group', 'routes'],
        },
      },
      {
        name: 'list_sources',
        description: 'List all configured sources (inputs) for a Worker Group with type and enabled status',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
          },
          required: ['group'],
        },
      },
      {
        name: 'get_source',
        description: 'Get full configuration for a specific source (input) in a Worker Group by source ID',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
            source_id: { type: 'string', description: 'Source ID to retrieve' },
          },
          required: ['group', 'source_id'],
        },
      },
      {
        name: 'list_destinations',
        description: 'List all configured destinations (outputs) for a Worker Group with type and enabled status',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
          },
          required: ['group'],
        },
      },
      {
        name: 'get_destination',
        description: 'Get full configuration for a specific destination (output) in a Worker Group by destination ID',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
            destination_id: { type: 'string', description: 'Destination ID to retrieve' },
          },
          required: ['group', 'destination_id'],
        },
      },
      {
        name: 'list_lookups',
        description: 'List all lookup tables configured for a Worker Group used in pipeline enrichment',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
          },
          required: ['group'],
        },
      },
      {
        name: 'get_lookup',
        description: 'Get metadata and configuration for a specific lookup table in a Worker Group',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
            lookup_id: { type: 'string', description: 'Lookup table ID to retrieve' },
          },
          required: ['group', 'lookup_id'],
        },
      },
      {
        name: 'list_packs',
        description: 'List all installed Cribl Packs in a Worker Group with name, version, and status',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
          },
          required: ['group'],
        },
      },
      {
        name: 'install_pack',
        description: 'Install a Cribl Pack from a URL or registry into a Worker Group',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
            source: {
              type: 'string',
              description: 'Pack source: URL to a .crbl pack archive or a registry pack identifier',
            },
          },
          required: ['group', 'source'],
        },
      },
      {
        name: 'get_system_metrics',
        description: 'Retrieve system-level throughput, CPU, memory, and queue metrics from a Worker Group or leader',
        inputSchema: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'Worker Group name to query. Omit to query the leader node.',
            },
          },
        },
      },
      {
        name: 'get_system_info',
        description: 'Retrieve system information including Cribl version, build, and license details for a Worker Group',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group name. Omit to query the leader node.' },
          },
        },
      },
      {
        name: 'commit_config',
        description: 'Commit staged configuration changes to version control for a Worker Group with a commit message',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name' },
            message: { type: 'string', description: 'Commit message describing the configuration changes' },
          },
          required: ['group', 'message'],
        },
      },
      {
        name: 'deploy_config',
        description: 'Deploy a committed configuration version to a Worker Group; omit version to deploy latest commit',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name to deploy to' },
            version: {
              type: 'string',
              description: 'Commit hash or version tag to deploy. Omit to deploy the latest commit.',
            },
          },
          required: ['group'],
        },
      },
      {
        name: 'search_jobs',
        description: 'Run a Cribl Search query job against a dataset and return a job ID handle',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name for the search dataset' },
            query: { type: 'string', description: 'CRIBL SPL query string to execute' },
            earliest: { type: 'string', description: 'Relative or absolute start time (e.g. -1h, -24h)' },
            latest: { type: 'string', description: 'Relative or absolute end time (e.g. now)' },
            limit: { type: 'number', description: 'Max results to return (default: 1000)' },
          },
          required: ['group', 'query'],
        },
      },
      {
        name: 'get_search_job_results',
        description: 'Retrieve results from a completed Cribl Search job by job ID',
        inputSchema: {
          type: 'object',
          properties: {
            group: { type: 'string', description: 'Worker Group or Fleet name for the search' },
            job_id: { type: 'string', description: 'Search job ID returned by search_jobs' },
          },
          required: ['group', 'job_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_worker_groups':
          return this.listWorkerGroups();
        case 'get_worker_group':
          return this.getWorkerGroup(args);
        case 'list_workers':
          return this.listWorkers(args);
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
        case 'get_routes':
          return this.getRoutes(args);
        case 'update_routes':
          return this.updateRoutes(args);
        case 'list_sources':
          return this.listSources(args);
        case 'get_source':
          return this.getSource(args);
        case 'list_destinations':
          return this.listDestinations(args);
        case 'get_destination':
          return this.getDestination(args);
        case 'list_lookups':
          return this.listLookups(args);
        case 'get_lookup':
          return this.getLookup(args);
        case 'list_packs':
          return this.listPacks(args);
        case 'install_pack':
          return this.installPack(args);
        case 'get_system_metrics':
          return this.getSystemMetrics(args);
        case 'get_system_info':
          return this.getSystemInfo(args);
        case 'commit_config':
          return this.commitConfig(args);
        case 'deploy_config':
          return this.deployConfig(args);
        case 'search_jobs':
          return this.searchJobs(args);
        case 'get_search_job_results':
          return this.getSearchJobResults(args);
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

  private async listWorkerGroups(): Promise<ToolResult> {
    return this.request('GET', '/master/groups');
  }

  private async getWorkerGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    if (!group) return { content: [{ type: 'text', text: 'group is required' }], isError: true };
    return this.request('GET', `/master/groups/${encodeURIComponent(group)}`);
  }

  private async listWorkers(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    if (!group) return { content: [{ type: 'text', text: 'group is required' }], isError: true };
    return this.request('GET', `/master/workers?group=${encodeURIComponent(group)}`);
  }

  private async listPipelines(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    if (!group) return { content: [{ type: 'text', text: 'group is required' }], isError: true };
    return this.request('GET', `/m/${encodeURIComponent(group)}/pipelines`);
  }

  private async getPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    const pipelineId = args.pipeline_id as string;
    if (!group || !pipelineId) return { content: [{ type: 'text', text: 'group and pipeline_id are required' }], isError: true };
    return this.request('GET', `/m/${encodeURIComponent(group)}/pipelines/${encodeURIComponent(pipelineId)}`);
  }

  private async createPipeline(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    const pipelineId = args.pipeline_id as string;
    const config = args.config as Record<string, unknown>;
    if (!group || !pipelineId || !config) return { content: [{ type: 'text', text: 'group, pipeline_id, and config are required' }], isError: true };
    return this.request('POST', `/m/${encodeURIComponent(group)}/pipelines`, { id: pipelineId, ...config });
  }

  private async updatePipeline(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    const pipelineId = args.pipeline_id as string;
    const config = args.config as Record<string, unknown>;
    if (!group || !pipelineId || !config) return { content: [{ type: 'text', text: 'group, pipeline_id, and config are required' }], isError: true };
    return this.request('PATCH', `/m/${encodeURIComponent(group)}/pipelines/${encodeURIComponent(pipelineId)}`, config);
  }

  private async deletePipeline(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    const pipelineId = args.pipeline_id as string;
    if (!group || !pipelineId) return { content: [{ type: 'text', text: 'group and pipeline_id are required' }], isError: true };
    return this.request('DELETE', `/m/${encodeURIComponent(group)}/pipelines/${encodeURIComponent(pipelineId)}`);
  }

  private async getRoutes(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    if (!group) return { content: [{ type: 'text', text: 'group is required' }], isError: true };
    return this.request('GET', `/m/${encodeURIComponent(group)}/routes`);
  }

  private async updateRoutes(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    const routes = args.routes as unknown[];
    if (!group || !routes) return { content: [{ type: 'text', text: 'group and routes are required' }], isError: true };
    return this.request('PATCH', `/m/${encodeURIComponent(group)}/routes`, { routes });
  }

  private async listSources(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    if (!group) return { content: [{ type: 'text', text: 'group is required' }], isError: true };
    return this.request('GET', `/m/${encodeURIComponent(group)}/system/inputs`);
  }

  private async getSource(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    const sourceId = args.source_id as string;
    if (!group || !sourceId) return { content: [{ type: 'text', text: 'group and source_id are required' }], isError: true };
    return this.request('GET', `/m/${encodeURIComponent(group)}/system/inputs/${encodeURIComponent(sourceId)}`);
  }

  private async listDestinations(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    if (!group) return { content: [{ type: 'text', text: 'group is required' }], isError: true };
    return this.request('GET', `/m/${encodeURIComponent(group)}/system/outputs`);
  }

  private async getDestination(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    const destinationId = args.destination_id as string;
    if (!group || !destinationId) return { content: [{ type: 'text', text: 'group and destination_id are required' }], isError: true };
    return this.request('GET', `/m/${encodeURIComponent(group)}/system/outputs/${encodeURIComponent(destinationId)}`);
  }

  private async listLookups(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    if (!group) return { content: [{ type: 'text', text: 'group is required' }], isError: true };
    return this.request('GET', `/m/${encodeURIComponent(group)}/lookups`);
  }

  private async getLookup(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    const lookupId = args.lookup_id as string;
    if (!group || !lookupId) return { content: [{ type: 'text', text: 'group and lookup_id are required' }], isError: true };
    return this.request('GET', `/m/${encodeURIComponent(group)}/lookups/${encodeURIComponent(lookupId)}`);
  }

  private async listPacks(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    if (!group) return { content: [{ type: 'text', text: 'group is required' }], isError: true };
    return this.request('GET', `/m/${encodeURIComponent(group)}/packs`);
  }

  private async installPack(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    const source = args.source as string;
    if (!group || !source) return { content: [{ type: 'text', text: 'group and source are required' }], isError: true };
    return this.request('POST', `/m/${encodeURIComponent(group)}/packs`, { source });
  }

  private async getSystemMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string | undefined;
    const path = group
      ? `/m/${encodeURIComponent(group)}/system/metrics`
      : '/system/metrics';
    return this.request('GET', path);
  }

  private async getSystemInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string | undefined;
    const path = group
      ? `/m/${encodeURIComponent(group)}/system/info`
      : '/system/info';
    return this.request('GET', path);
  }

  private async commitConfig(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    const message = args.message as string;
    if (!group || !message) return { content: [{ type: 'text', text: 'group and message are required' }], isError: true };
    return this.request('POST', `/m/${encodeURIComponent(group)}/version/commit`, { message });
  }

  private async deployConfig(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    if (!group) return { content: [{ type: 'text', text: 'group is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.version) body.version = args.version;
    return this.request('POST', `/m/${encodeURIComponent(group)}/version/deploy`, body);
  }

  private async searchJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    const query = args.query as string;
    if (!group || !query) return { content: [{ type: 'text', text: 'group and query are required' }], isError: true };
    const body: Record<string, unknown> = { query };
    if (args.earliest) body.earliest = args.earliest;
    if (args.latest) body.latest = args.latest;
    if (args.limit) body.limit = args.limit;
    return this.request('POST', `/m/${encodeURIComponent(group)}/search/jobs`, body);
  }

  private async getSearchJobResults(args: Record<string, unknown>): Promise<ToolResult> {
    const group = args.group as string;
    const jobId = args.job_id as string;
    if (!group || !jobId) return { content: [{ type: 'text', text: 'group and job_id are required' }], isError: true };
    return this.request('GET', `/m/${encodeURIComponent(group)}/search/jobs/${encodeURIComponent(jobId)}/results`);
  }
}
