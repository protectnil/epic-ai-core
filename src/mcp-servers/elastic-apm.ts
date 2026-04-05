/**
 * Elastic APM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/elastic/mcp-server-elasticsearch — official Elastic MCP server
//   targets Elasticsearch directly (transport: stdio/SSE/streamable-HTTP, auth: API key or Basic).
//   Last release: v0.4.6 (Oct 24, 2025). Tools: list_indices, get_mappings, search, esql, get_shards
//   (5 tools — Elasticsearch index/search only, no APM-specific coverage).
//   No dedicated Elastic APM MCP server exists from Elastic as of 2026-03-28.
// Our adapter: 14 tools targeting the Kibana APM REST API for full APM observability coverage.
// Recommendation: use-rest-api — no official APM MCP server exists. The Elasticsearch MCP server
//   exposes only 5 generic index/search tools with no APM coverage.
//
// IMPORTANT: Most Kibana APM UI endpoints live under /internal/apm/ (not /api/apm/).
// Only these paths are public API (/api/apm/):
//   POST /api/apm/services/{serviceName}/annotation
//   GET  /api/apm/services/{serviceName}/annotation/search
//   GET  /api/apm/settings/agent-configuration
//   PUT  /api/apm/settings/agent-configuration
//   DELETE /api/apm/settings/agent-configuration
// All other APM UI paths (services list, transactions, errors, traces, service instances)
// are /internal/apm/ routes. These are internal APIs — not covered by Kibana's public API SLA
// and will be restricted in Kibana 9.0. Tools using these paths are marked accordingly.
//
// Base URL: https://{kibana-host}:{port}  (self-hosted) or Elastic Cloud Kibana URL
// Auth: API key — "ApiKey {base64(id:api_key)}" or Basic — "Basic {base64(user:pass)}"
// Docs: https://www.elastic.co/docs/api/doc/kibana/group/endpoint-apm-annotations
//   https://www.elastic.co/docs/api/doc/kibana/operation/operation-getagentconfigurations
//   https://github.com/elastic/kibana/issues/152578 (internal APM route inventory)
// Rate limits: Not publicly documented; governed by Elasticsearch cluster capacity
// Note: All mutating requests require the kbn-xsrf: true header

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ElasticAPMConfig {
  kibanaUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

export class ElasticAPMMCPServer extends MCPAdapterBase {
  private readonly kibanaUrl: string;
  private readonly authHeader: string;

  constructor(config: ElasticAPMConfig) {
    super();
    this.kibanaUrl = config.kibanaUrl.replace(/\/$/, '');
    if (config.apiKey) {
      this.authHeader = `ApiKey ${config.apiKey}`;
    } else if (config.username && config.password) {
      this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    } else {
      throw new Error('ElasticAPMMCPServer requires either apiKey or username+password');
    }
  }

  static catalog() {
    return {
      name: 'elastic-apm',
      displayName: 'Elastic APM',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: [
        'elastic', 'apm', 'kibana', 'observability', 'tracing', 'spans',
        'transactions', 'errors', 'services', 'latency', 'throughput',
        'dependencies', 'annotations', 'agent-config', 'rum',
      ],
      toolNames: [
        'list_services', 'get_service_details', 'get_service_dependencies',
        'list_transactions', 'get_transaction_details', 'list_error_groups',
        'get_error_group', 'list_traces', 'get_trace', 'list_service_nodes',
        'create_annotation', 'list_annotations', 'list_agent_configs',
        'create_agent_config',
      ],
      description: 'Elastic APM full observability: list services, transactions, errors, traces, dependencies, annotations, and manage APM agent remote configurations via Kibana APM API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_services',
        description: 'List all APM-instrumented services reporting to this Kibana instance within a time range, with optional environment filter',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format (e.g. 2026-03-01T00:00:00.000Z)',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format (e.g. 2026-03-24T23:59:59.999Z)',
            },
            environment: {
              type: 'string',
              description: 'Filter by APM environment name (e.g. production, staging). Omit for all environments.',
            },
          },
          required: ['start', 'end'],
        },
      },
      {
        name: 'get_service_details',
        description: 'Get transaction group statistics (latency, throughput, error rate) for a specific APM service within a time range',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name',
            },
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (optional)',
            },
          },
          required: ['service_name', 'start', 'end'],
        },
      },
      {
        name: 'get_service_dependencies',
        description: 'Get downstream service dependencies and their latency, throughput, and error rate for an APM service',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name',
            },
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (optional)',
            },
          },
          required: ['service_name', 'start', 'end'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List transaction groups with performance statistics (latency, throughput, error rate, impact) for an APM service',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name',
            },
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            transaction_type: {
              type: 'string',
              description: 'Transaction type filter (e.g. request, worker, scheduled, messaging)',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (optional)',
            },
          },
          required: ['service_name', 'start', 'end'],
        },
      },
      {
        name: 'get_transaction_details',
        description: 'Get detailed statistics for a specific transaction group in an APM service including percentile latency breakdown',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name',
            },
            transaction_name: {
              type: 'string',
              description: 'The transaction group name (e.g. GET /api/users)',
            },
            transaction_type: {
              type: 'string',
              description: 'Transaction type (e.g. request, worker)',
            },
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (optional)',
            },
          },
          required: ['service_name', 'transaction_name', 'start', 'end'],
        },
      },
      {
        name: 'list_error_groups',
        description: 'List error groups (unique errors by type and message) for an APM service with occurrence count and last seen timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name',
            },
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (optional)',
            },
          },
          required: ['service_name', 'start', 'end'],
        },
      },
      {
        name: 'get_error_group',
        description: 'Get details for a specific APM error group including stack trace samples and occurrence timeline',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name',
            },
            group_id: {
              type: 'string',
              description: 'Error group ID (hash)',
            },
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (optional)',
            },
          },
          required: ['service_name', 'group_id', 'start', 'end'],
        },
      },
      {
        name: 'list_traces',
        description: 'Search APM traces (distributed trace samples) across all services within a time range with optional query filter',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            query: {
              type: 'string',
              description: 'KQL query to filter traces (e.g. service.name: "checkout" and transaction.result: "HTTP 5xx")',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (optional)',
            },
          },
          required: ['start', 'end'],
        },
      },
      {
        name: 'get_trace',
        description: 'Get a complete distributed trace waterfall by trace ID, showing all spans across all services',
        inputSchema: {
          type: 'object',
          properties: {
            trace_id: {
              type: 'string',
              description: 'The distributed trace ID (128-bit hex string)',
            },
          },
          required: ['trace_id'],
        },
      },
      {
        name: 'list_service_nodes',
        description: 'List individual service instances (nodes) for an APM service showing per-instance metrics',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name',
            },
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (optional)',
            },
          },
          required: ['service_name', 'start', 'end'],
        },
      },
      {
        name: 'create_annotation',
        description: 'Create a deployment annotation on an APM service timeline to mark a release, deploy, or notable event',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name to annotate',
            },
            service_version: {
              type: 'string',
              description: 'The service version being deployed or annotated',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (e.g. production)',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp for the annotation (defaults to current time if omitted)',
            },
            message: {
              type: 'string',
              description: 'Human-readable annotation message describing the event (optional)',
            },
          },
          required: ['service_name', 'service_version', 'environment'],
        },
      },
      {
        name: 'list_annotations',
        description: 'List deployment annotations for an APM service within an optional time range',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'The APM service name',
            },
            start: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format (optional)',
            },
            end: {
              type: 'string',
              description: 'End of time range in ISO 8601 format (optional)',
            },
            environment: {
              type: 'string',
              description: 'APM environment name (optional)',
            },
          },
          required: ['service_name'],
        },
      },
      {
        name: 'list_agent_configs',
        description: 'List all APM agent remote configurations stored in Kibana for dynamic agent tuning without redeploy',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'Filter configurations by service name (optional)',
            },
            environment: {
              type: 'string',
              description: 'Filter configurations by environment (optional)',
            },
          },
        },
      },
      {
        name: 'create_agent_config',
        description: 'Create or update an APM agent remote configuration for dynamic tuning of APM agent settings without redeployment',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'Target service name for this configuration',
            },
            environment: {
              type: 'string',
              description: 'Target environment (optional; omit to apply to all environments)',
            },
            settings: {
              type: 'object',
              description: 'Key-value map of agent settings (e.g. {"transaction_sample_rate": "0.1", "log_level": "warn"})',
            },
          },
          required: ['service_name', 'settings'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_services':
          return await this.listServices(args);
        case 'get_service_details':
          return await this.getServiceDetails(args);
        case 'get_service_dependencies':
          return await this.getServiceDependencies(args);
        case 'list_transactions':
          return await this.listTransactions(args);
        case 'get_transaction_details':
          return await this.getTransactionDetails(args);
        case 'list_error_groups':
          return await this.listErrorGroups(args);
        case 'get_error_group':
          return await this.getErrorGroup(args);
        case 'list_traces':
          return await this.listTraces(args);
        case 'get_trace':
          return await this.getTrace(args);
        case 'list_service_nodes':
          return await this.listServiceNodes(args);
        case 'create_annotation':
          return await this.createAnnotation(args);
        case 'list_annotations':
          return await this.listAnnotations(args);
        case 'list_agent_configs':
          return await this.listAgentConfigs(args);
        case 'create_agent_config':
          return await this.createAgentConfig(args);
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

  private getHeaders(mutating = false): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
    if (mutating) h['kbn-xsrf'] = 'true';
    return h;
  }


  private async kfetch(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, init ?? {});
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Kibana API error ${response.status} ${response.statusText}${errBody ? ': ' + errBody.slice(0, 500) : ''}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Kibana returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildServiceUrl(service_name: string, path: string, args: Record<string, unknown>, extra?: Record<string, string>): string {
    const params = new URLSearchParams();
    params.set('start', String(args.start));
    params.set('end', String(args.end));
    if (args.environment) params.set('environment', String(args.environment));
    if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return `${this.kibanaUrl}/internal/apm/services/${encodeURIComponent(service_name)}/${path}?${params}`;
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.start || !args.end) {
      return { content: [{ type: 'text', text: 'start and end are required' }], isError: true };
    }
    const params = new URLSearchParams({ start: String(args.start), end: String(args.end) });
    if (args.environment) params.set('environment', String(args.environment));
    return this.kfetch(`${this.kibanaUrl}/internal/apm/services?${params}`, { headers: this.getHeaders() });
  }

  private async getServiceDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_name || !args.start || !args.end) {
      return { content: [{ type: 'text', text: 'service_name, start, and end are required' }], isError: true };
    }
    const url = this.buildServiceUrl(String(args.service_name), 'transaction_groups/main_statistics', args);
    return this.kfetch(url, { headers: this.getHeaders() });
  }

  private async getServiceDependencies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_name || !args.start || !args.end) {
      return { content: [{ type: 'text', text: 'service_name, start, and end are required' }], isError: true };
    }
    const url = this.buildServiceUrl(String(args.service_name), 'dependencies', args);
    return this.kfetch(url, { headers: this.getHeaders() });
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_name || !args.start || !args.end) {
      return { content: [{ type: 'text', text: 'service_name, start, and end are required' }], isError: true };
    }
    const extra: Record<string, string> = {};
    if (args.transaction_type) extra['transactionType'] = String(args.transaction_type);
    const url = this.buildServiceUrl(String(args.service_name), 'transactions/groups/main_statistics', args, extra);
    return this.kfetch(url, { headers: this.getHeaders() });
  }

  private async getTransactionDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_name || !args.transaction_name || !args.start || !args.end) {
      return { content: [{ type: 'text', text: 'service_name, transaction_name, start, and end are required' }], isError: true };
    }
    const extra: Record<string, string> = { transactionName: String(args.transaction_name) };
    if (args.transaction_type) extra['transactionType'] = String(args.transaction_type);
    const url = this.buildServiceUrl(String(args.service_name), 'transaction_groups/detailed_statistics', args, extra);
    return this.kfetch(url, { headers: this.getHeaders() });
  }

  private async listErrorGroups(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_name || !args.start || !args.end) {
      return { content: [{ type: 'text', text: 'service_name, start, and end are required' }], isError: true };
    }
    const url = this.buildServiceUrl(String(args.service_name), 'errors/groups/main_statistics', args);
    return this.kfetch(url, { headers: this.getHeaders() });
  }

  private async getErrorGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_name || !args.group_id || !args.start || !args.end) {
      return { content: [{ type: 'text', text: 'service_name, group_id, start, and end are required' }], isError: true };
    }
    const extra: Record<string, string> = { groupId: String(args.group_id) };
    const url = this.buildServiceUrl(String(args.service_name), 'errors/groups/detailed_statistics', args, extra);
    return this.kfetch(url, { headers: this.getHeaders() });
  }

  private async listTraces(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.start || !args.end) {
      return { content: [{ type: 'text', text: 'start and end are required' }], isError: true };
    }
    const params = new URLSearchParams({ start: String(args.start), end: String(args.end) });
    if (args.query) params.set('query', String(args.query));
    if (args.environment) params.set('environment', String(args.environment));
    return this.kfetch(`${this.kibanaUrl}/internal/apm/traces/find?${params}`, { headers: this.getHeaders() });
  }

  private async getTrace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.trace_id) {
      return { content: [{ type: 'text', text: 'trace_id is required' }], isError: true };
    }
    return this.kfetch(
      `${this.kibanaUrl}/internal/apm/traces/${encodeURIComponent(String(args.trace_id))}`,
      { headers: this.getHeaders() },
    );
  }

  private async listServiceNodes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_name || !args.start || !args.end) {
      return { content: [{ type: 'text', text: 'service_name, start, and end are required' }], isError: true };
    }
    const url = this.buildServiceUrl(String(args.service_name), 'service_overview_instances/main_statistics', args);
    return this.kfetch(url, { headers: this.getHeaders() });
  }

  private async createAnnotation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_name || !args.service_version || !args.environment) {
      return { content: [{ type: 'text', text: 'service_name, service_version, and environment are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      '@timestamp': args.timestamp ?? new Date().toISOString(),
      service: {
        name: args.service_name,
        version: args.service_version,
        environment: args.environment,
      },
    };
    if (args.message) body.message = args.message;
    return this.kfetch(
      `${this.kibanaUrl}/api/apm/services/${encodeURIComponent(String(args.service_name))}/annotation`,
      { method: 'POST', headers: this.getHeaders(true), body: JSON.stringify(body) },
    );
  }

  private async listAnnotations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_name) {
      return { content: [{ type: 'text', text: 'service_name is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.start) params.set('start', String(args.start));
    if (args.end) params.set('end', String(args.end));
    if (args.environment) params.set('environment', String(args.environment));
    return this.kfetch(
      `${this.kibanaUrl}/api/apm/services/${encodeURIComponent(String(args.service_name))}/annotation/search?${params}`,
      { headers: this.getHeaders() },
    );
  }

  private async listAgentConfigs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.service_name) params.set('service.name', String(args.service_name));
    if (args.environment) params.set('service.environment', String(args.environment));
    const qs = params.toString() ? `?${params}` : '';
    return this.kfetch(
      `${this.kibanaUrl}/api/apm/settings/agent-configuration${qs}`,
      { headers: this.getHeaders() },
    );
  }

  private async createAgentConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_name || !args.settings) {
      return { content: [{ type: 'text', text: 'service_name and settings are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      service: { name: args.service_name },
      settings: args.settings,
    };
    if (args.environment) (body.service as Record<string, unknown>)['environment'] = args.environment;
    return this.kfetch(
      `${this.kibanaUrl}/api/apm/settings/agent-configuration`,
      { method: 'PUT', headers: this.getHeaders(true), body: JSON.stringify(body) },
    );
  }
}
