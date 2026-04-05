/**
 * Meshery MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Meshery MCP server was found on GitHub.
//
// Base URL: http://meshery.local (self-hosted; override via config.baseUrl)
// Auth: API key passed as cookie header named "token"
// Docs: https://docs.meshery.io/reference/rest-apis
// Rate limits: Not documented; self-hosted — depends on deployment

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MesheryConfig {
  apiToken: string;
  /** Base URL of Meshery instance (default: http://meshery.local) */
  baseUrl?: string;
}

export class MesheryMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: MesheryConfig) {
    super();
    this.token = config.apiToken;
    this.baseUrl = config.baseUrl ?? 'http://meshery.local';
  }

  static catalog() {
    return {
      name: 'meshery',
      displayName: 'Meshery',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'meshery', 'service mesh', 'kubernetes', 'k8s', 'pattern', 'filter',
        'application', 'deploy', 'performance', 'test', 'grafana', 'prometheus',
        'observability', 'cloud native', 'infrastructure', 'adapter',
      ],
      toolNames: [
        'list_applications', 'get_application', 'deploy_application', 'delete_application_deploy',
        'list_filters', 'get_filter', 'delete_filter',
        'list_patterns', 'get_pattern', 'deploy_pattern', 'delete_pattern', 'delete_pattern_deploy',
        'list_perf_results', 'get_perf_result',
        'get_system_version', 'list_adapters',
        'get_prometheus_config', 'get_grafana_config',
        'list_performance_profiles', 'run_performance_test',
      ],
      description: 'Meshery service mesh management: deploy Kubernetes patterns and applications, manage filters, run performance tests, and configure observability integrations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_applications',
        description: 'List all Meshery application files with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 0)' },
            page_size: { type: 'number', description: 'Number of results per page (default: 10)' },
            search: { type: 'string', description: 'Filter applications by name substring' },
            order: { type: 'string', description: 'Sort order field (e.g. created_at desc)' },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Get a specific Meshery application file by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Application ID (UUID)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'deploy_application',
        description: 'Deploy a Meshery application to the connected Kubernetes cluster',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Application ID to deploy' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_application_deploy',
        description: 'Remove a deployed Meshery application from the Kubernetes cluster',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Application ID to undeploy' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_filters',
        description: 'List all Meshery WASM filters with optional pagination and search',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 0)' },
            page_size: { type: 'number', description: 'Results per page (default: 10)' },
            search: { type: 'string', description: 'Filter by name substring' },
          },
        },
      },
      {
        name: 'get_filter',
        description: 'Get a specific Meshery filter by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter ID (UUID)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_filter',
        description: 'Delete a Meshery filter by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Filter ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_patterns',
        description: 'List all Meshery design patterns with optional pagination and search',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 0)' },
            page_size: { type: 'number', description: 'Results per page (default: 10)' },
            search: { type: 'string', description: 'Filter patterns by name substring' },
            order: { type: 'string', description: 'Sort order field' },
          },
        },
      },
      {
        name: 'get_pattern',
        description: 'Get a specific Meshery design pattern by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Pattern ID (UUID)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'deploy_pattern',
        description: 'Deploy a Meshery design pattern to the connected Kubernetes cluster',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Pattern ID to deploy' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_pattern',
        description: 'Delete a Meshery design pattern by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Pattern ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_pattern_deploy',
        description: 'Undeploy a Meshery design pattern from the Kubernetes cluster',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Pattern ID to undeploy' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_perf_results',
        description: 'List all performance test results stored in Meshery',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 0)' },
            page_size: { type: 'number', description: 'Results per page (default: 10)' },
            search: { type: 'string', description: 'Search within result names' },
            order: { type: 'string', description: 'Sort order (default: created_at desc)' },
          },
        },
      },
      {
        name: 'get_perf_result',
        description: 'Get a single performance test result by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Performance result ID (UUID)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_system_version',
        description: 'Get the current Meshery server version and build information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_adapters',
        description: 'List all registered Meshery service mesh adapters and their status',
        inputSchema: {
          type: 'object',
          properties: {
            adapter: { type: 'string', description: 'Filter by adapter type (e.g. istio, linkerd, consul)' },
          },
        },
      },
      {
        name: 'get_prometheus_config',
        description: 'Get the current Prometheus metrics configuration for Meshery',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_grafana_config',
        description: 'Get the current Grafana configuration and connection status for Meshery',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_performance_profiles',
        description: 'List saved performance test profiles with endpoint, duration, and load configuration',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 0)' },
            page_size: { type: 'number', description: 'Results per page (default: 10)' },
            search: { type: 'string', description: 'Search by profile name' },
          },
        },
      },
      {
        name: 'run_performance_test',
        description: 'Execute a performance test for a saved performance profile',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Performance profile ID to run' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_applications': return this.listApplications(args);
        case 'get_application': return this.getApplication(args);
        case 'deploy_application': return this.deployApplication(args);
        case 'delete_application_deploy': return this.deleteApplicationDeploy(args);
        case 'list_filters': return this.listFilters(args);
        case 'get_filter': return this.getFilter(args);
        case 'delete_filter': return this.deleteFilter(args);
        case 'list_patterns': return this.listPatterns(args);
        case 'get_pattern': return this.getPattern(args);
        case 'deploy_pattern': return this.deployPattern(args);
        case 'delete_pattern': return this.deletePattern(args);
        case 'delete_pattern_deploy': return this.deletePatternDeploy(args);
        case 'list_perf_results': return this.listPerfResults(args);
        case 'get_perf_result': return this.getPerfResult(args);
        case 'get_system_version': return this.getSystemVersion();
        case 'list_adapters': return this.listAdapters(args);
        case 'get_prometheus_config': return this.getPrometheusConfig();
        case 'get_grafana_config': return this.getGrafanaConfig();
        case 'list_performance_profiles': return this.listPerformanceProfiles(args);
        case 'run_performance_test': return this.runPerformanceTest(args);
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

  private headers(): Record<string, string> {
    return {
      'Cookie': `token=${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private buildUrl(path: string, params: Record<string, unknown> = {}): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const q = qs.toString();
    return `${this.baseUrl}${path}${q ? '?' + q : ''}`;
  }

  private async get(path: string, params: Record<string, unknown> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.buildUrl(path, params), { headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ status: 'ok' }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async delete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ status: 'deleted' }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listApplications(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/api/application/', {
      page: args.page ?? 0,
      pagesize: args.page_size ?? 10,
      search: args.search,
      order: args.order,
    });
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/api/application/${encodeURIComponent(args.id as string)}`);
  }

  private async deployApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.post('/api/application/deploy', { id: args.id });
  }

  private async deleteApplicationDeploy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.delete(`/api/application/deploy`);
  }

  private async listFilters(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/api/filter', {
      page: args.page ?? 0,
      pagesize: args.page_size ?? 10,
      search: args.search,
    });
  }

  private async getFilter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/api/filter/${encodeURIComponent(args.id as string)}`);
  }

  private async deleteFilter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.delete(`/api/filter/${encodeURIComponent(args.id as string)}`);
  }

  private async listPatterns(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/api/pattern', {
      page: args.page ?? 0,
      pagesize: args.page_size ?? 10,
      search: args.search,
      order: args.order,
    });
  }

  private async getPattern(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/api/pattern/${encodeURIComponent(args.id as string)}`);
  }

  private async deployPattern(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.post('/api/pattern/deploy', { id: args.id });
  }

  private async deletePattern(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.delete(`/api/pattern/${encodeURIComponent(args.id as string)}`);
  }

  private async deletePatternDeploy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.delete('/api/pattern/deploy');
  }

  private async listPerfResults(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/api/perf/profile/result', {
      page: args.page ?? 0,
      pagesize: args.page_size ?? 10,
      search: args.search,
      order: args.order,
    });
  }

  private async getPerfResult(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/api/perf/profile/result/${encodeURIComponent(args.id as string)}`);
  }

  private async getSystemVersion(): Promise<ToolResult> {
    return this.get('/api/system/version');
  }

  private async listAdapters(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.adapter) params.adapter = args.adapter;
    return this.get('/api/system/adapters', params);
  }

  private async getPrometheusConfig(): Promise<ToolResult> {
    return this.get('/api/telemetry/metrics/config');
  }

  private async getGrafanaConfig(): Promise<ToolResult> {
    return this.get('/api/telemetry/metrics/grafana/config');
  }

  private async listPerformanceProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/api/user/performance/profiles', {
      page: args.page ?? 0,
      pagesize: args.page_size ?? 10,
      search: args.search,
    });
  }

  private async runPerformanceTest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/api/user/performance/profiles/${encodeURIComponent(args.id as string)}/run`);
  }
}
