/**
 * Dynatrace MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/dynatrace-oss/dynatrace-mcp — transport: stdio (npx @dynatrace-oss/dynatrace-mcp-server),
//   auth: OAuth2 Authorization Code Flow (browser) or Platform Token or OAuth2 client credentials.
//   Published by dynatrace-oss (Dynatrace open-source org). Joined GitHub MCP Registry September 2025.
//   Actively maintained (commits confirmed through 2025-Q4). Vendor MCP tool count: 9 confirmed tools:
//   execute_dql (Run DQL), explain_dql (Explain DQL), nl_to_dql (NL to DQL), query_problems,
//   get_problem_by_id, get_vulnerabilities, get_k8s_events, send_event, ask_dynatrace.
// Decision: use-both — MCP has 9 tools (DQL/AI/Davis-powered) with no equivalent in the classic REST v2 API.
//   Our REST adapter covers 14 tools (entities, metrics, problems, events, settings, SLOs, releases, DQL*)
//   targeting the classic Environment API v2 for air-gapped/token-auth deployments.
//   * NOTE: execute_dql in our adapter uses the Dynatrace Grail Platform API
//     (https://{environmentId}.apps.dynatrace.com/platform/storage/query/v1/query:execute), which is a
//     DIFFERENT base URL from the classic /api/v2 base. See execute_dql implementation for details.
//   Shared tools: execute_dql (both MCP and our adapter target DQL/Grail, different auth/transport).
//   MCP-only: explain_dql, nl_to_dql, query_problems, get_problem_by_id, get_vulnerabilities, get_k8s_events,
//     send_event, ask_dynatrace (Davis AI / Copilot capabilities not available via classic REST API).
//   REST-only: list_entities, get_entity, query_metrics, list_metric_descriptors, list_problems,
//     get_problem, close_problem, list_events, create_event, get_settings_objects, list_slos, get_slo,
//     list_releases (classic Environment API v2 direct access).
// Integration: use-both
// MCP-sourced tools (9): execute_dql, explain_dql, nl_to_dql, query_problems, get_problem_by_id,
//   get_vulnerabilities, get_k8s_events, send_event, ask_dynatrace
// REST-sourced tools (13): list_entities, get_entity, query_metrics, list_metric_descriptors,
//   list_problems, get_problem, close_problem, list_events, create_event, get_settings_objects,
//   list_slos, get_slo, list_releases
// Combined coverage: 22 tools (MCP: 9 + REST: 13; execute_dql shared but REST version uses classic token auth)
// Our adapter covers: 14 tools. Vendor MCP covers: 9 tools.
//
// Base URL: https://{environmentId}.live.dynatrace.com/api/v2
//   Managed: https://{host}/e/{environmentId}/api/v2
// Auth: API token via Authorization: Api-Token {token} header
// Docs: https://docs.dynatrace.com/docs/dynatrace-api
// Rate limits: 50 req/s per token (default); varies by endpoint

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DynatraceConfig {
  environmentId: string;
  apiToken: string;
  /** Override for Dynatrace Managed deployments: https://your-host/e/ENV_ID */
  baseUrl?: string;
  /**
   * Override for the Dynatrace Platform (Grail) base URL used by execute_dql.
   * Defaults to https://{environmentId}.apps.dynatrace.com/platform/storage/query/v1
   * Required for Managed deployments: https://your-host/e/{environmentId}/platform/storage/query/v1
   */
  platformUrl?: string;
}

export class DynatraceMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly platformUrl: string;

  constructor(config: DynatraceConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl
      ? config.baseUrl.replace(/\/$/, '')
      : `https://${config.environmentId}.live.dynatrace.com/api/v2`;
    this.platformUrl = config.platformUrl
      ? config.platformUrl.replace(/\/$/, '')
      : `https://${config.environmentId}.apps.dynatrace.com/platform/storage/query/v1`;
  }

  static catalog() {
    return {
      name: 'dynatrace',
      displayName: 'Dynatrace',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: [
        'dynatrace', 'dt', 'observability', 'apm', 'monitoring', 'entities',
        'metrics', 'problems', 'alerts', 'davis', 'dql', 'traces', 'logs',
        'kubernetes', 'k8s', 'events', 'settings', 'slo', 'vulnerabilities',
        'security', 'release', 'synthetic',
      ],
      toolNames: [
        'list_entities', 'get_entity', 'query_metrics', 'list_metric_descriptors',
        'list_problems', 'get_problem', 'close_problem', 'list_events',
        'create_event', 'get_settings_objects', 'list_slos', 'get_slo',
        'list_releases', 'execute_dql',
      ],
      description: 'Dynatrace full-stack observability: query entities, metrics, problems, events, SLOs, releases, settings, and execute DQL queries against Dynatrace Grail.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_entities',
        description: 'List Dynatrace monitored entities filtered by type, tag, management zone, or entity selector expression',
        inputSchema: {
          type: 'object',
          properties: {
            entitySelector: {
              type: 'string',
              description: 'Dynatrace entity selector (e.g. type("HOST"),tag("production") or type("SERVICE"),healthState("UNHEALTHY"))',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated additional fields to include (e.g. properties,tags,managementZones,fromRelationships)',
            },
            from: {
              type: 'string',
              description: 'Start of the requested timeframe (e.g. now-1h, ISO 8601). Default: now-3d',
            },
            to: {
              type: 'string',
              description: 'End of the requested timeframe (e.g. now). Default: now',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 500, default 50)',
            },
            nextPageKey: {
              type: 'string',
              description: 'Cursor token for next page from a previous response',
            },
          },
          required: ['entitySelector'],
        },
      },
      {
        name: 'get_entity',
        description: 'Retrieve full details for a single Dynatrace monitored entity by its entity ID (e.g. HOST-ABC123, SERVICE-DEF456)',
        inputSchema: {
          type: 'object',
          properties: {
            entityId: {
              type: 'string',
              description: 'The entity ID (e.g. HOST-1234567890ABCDEF, SERVICE-1234567890ABCDEF)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated additional fields (e.g. properties,tags,managementZones,toRelationships,fromRelationships)',
            },
          },
          required: ['entityId'],
        },
      },
      {
        name: 'query_metrics',
        description: 'Query Dynatrace metric data points using a metric selector, time range, and optional entity scope',
        inputSchema: {
          type: 'object',
          properties: {
            metricSelector: {
              type: 'string',
              description: 'Metric selector expression (e.g. builtin:host.cpu.usage:avg, builtin:service.errors.total:sum)',
            },
            from: {
              type: 'string',
              description: 'Start of the query time range (e.g. now-1h, now-24h, ISO 8601 timestamp)',
            },
            to: {
              type: 'string',
              description: 'End of the query time range (e.g. now, ISO 8601). Defaults to now.',
            },
            resolution: {
              type: 'string',
              description: 'Query resolution step (e.g. 1m, 5m, 1h, Inf for total aggregation)',
            },
            entitySelector: {
              type: 'string',
              description: 'Scope the metric query to specific entities (e.g. type("HOST"),tag("production"))',
            },
            mzSelector: {
              type: 'string',
              description: 'Limit results to entities within a specific management zone (e.g. mzName("Production"))',
            },
          },
          required: ['metricSelector', 'from'],
        },
      },
      {
        name: 'list_metric_descriptors',
        description: 'List available Dynatrace metric descriptors with optional text search and entity type filter',
        inputSchema: {
          type: 'object',
          properties: {
            metricSelector: {
              type: 'string',
              description: 'Metric selector or prefix to filter (e.g. builtin:host or custom:*)',
            },
            text: {
              type: 'string',
              description: 'Free-text search across metric names and display names',
            },
            entityType: {
              type: 'string',
              description: 'Filter to metrics for this entity type (e.g. HOST, SERVICE, PROCESS_GROUP_INSTANCE)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 500, default 100)',
            },
            nextPageKey: {
              type: 'string',
              description: 'Cursor token for next page',
            },
          },
        },
      },
      {
        name: 'list_problems',
        description: 'List Dynatrace Davis AI problems with optional filters for status, impact level, severity, and time range',
        inputSchema: {
          type: 'object',
          properties: {
            problemSelector: {
              type: 'string',
              description: 'Problem selector (e.g. status("open"), impactLevel("APPLICATION"), severityLevel("PERFORMANCE"))',
            },
            entitySelector: {
              type: 'string',
              description: 'Filter problems affecting specific entities (e.g. type("SERVICE"),tag("prod"))',
            },
            from: {
              type: 'string',
              description: 'Start of time range (e.g. now-24h). Default: now-2h',
            },
            to: {
              type: 'string',
              description: 'End of time range. Default: now',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 50, default 50)',
            },
            nextPageKey: {
              type: 'string',
              description: 'Cursor token for next page',
            },
            fields: {
              type: 'string',
              description: 'Additional fields to return (e.g. evidenceDetails,recentComments,impactedEntities)',
            },
          },
        },
      },
      {
        name: 'get_problem',
        description: 'Get full details for a single Dynatrace Davis AI problem by its problem ID, including root cause and impacted entities',
        inputSchema: {
          type: 'object',
          properties: {
            problemId: {
              type: 'string',
              description: 'The problem ID (e.g. -1234567890123456789)',
            },
            fields: {
              type: 'string',
              description: 'Additional fields (e.g. evidenceDetails,recentComments,impactedEntities,linkedProblemInfo)',
            },
          },
          required: ['problemId'],
        },
      },
      {
        name: 'close_problem',
        description: 'Manually close an open Dynatrace Davis AI problem with an optional closing comment',
        inputSchema: {
          type: 'object',
          properties: {
            problemId: {
              type: 'string',
              description: 'The problem ID to close',
            },
            message: {
              type: 'string',
              description: 'Closing comment explaining the resolution (optional)',
            },
          },
          required: ['problemId'],
        },
      },
      {
        name: 'list_events',
        description: 'List Dynatrace events with optional filter by event type, entity selector, and time range',
        inputSchema: {
          type: 'object',
          properties: {
            eventType: {
              type: 'string',
              description: 'Event type filter (e.g. CUSTOM_ANNOTATION, DEPLOYMENT, AVAILABILITY_EVENT, PERFORMANCE_EVENT)',
            },
            entitySelector: {
              type: 'string',
              description: 'Filter events for specific entities (e.g. type("SERVICE"),tag("prod"))',
            },
            from: {
              type: 'string',
              description: 'Start of time range (e.g. now-1h, ISO 8601). Default: now-2h',
            },
            to: {
              type: 'string',
              description: 'End of time range. Default: now',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 1000, default 50)',
            },
            nextPageKey: {
              type: 'string',
              description: 'Cursor token for next page',
            },
          },
        },
      },
      {
        name: 'create_event',
        description: 'Ingest a custom event or deployment annotation into Dynatrace for correlation with metrics and problems',
        inputSchema: {
          type: 'object',
          properties: {
            eventType: {
              type: 'string',
              description: 'Event type: CUSTOM_ANNOTATION, CUSTOM_DEPLOYMENT, CUSTOM_INFO, CUSTOM_CONFIGURATION, MARKED_FOR_TERMINATION',
            },
            title: {
              type: 'string',
              description: 'Event title or annotation',
            },
            entitySelector: {
              type: 'string',
              description: 'Target entities for this event (e.g. type("SERVICE"),tag("prod"))',
            },
            properties: {
              type: 'object',
              description: 'Additional key-value properties to attach to the event',
            },
            startTime: {
              type: 'number',
              description: 'Event start time in Unix milliseconds (defaults to now)',
            },
            endTime: {
              type: 'number',
              description: 'Event end time in Unix milliseconds (defaults to startTime)',
            },
          },
          required: ['eventType', 'title'],
        },
      },
      {
        name: 'get_settings_objects',
        description: 'Retrieve Dynatrace Settings 2.0 configuration objects for a given schema ID',
        inputSchema: {
          type: 'object',
          properties: {
            schemaIds: {
              type: 'string',
              description: 'Comma-separated settings schema IDs (e.g. builtin:anomaly-detection.services,builtin:alerting.profile)',
            },
            scope: {
              type: 'string',
              description: 'Limit results to a specific scope (e.g. HOST-ABC123, environment)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to include (e.g. objectId,scope,schemaVersion,value)',
            },
            nextPageKey: {
              type: 'string',
              description: 'Cursor token for next page',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 500, default 100)',
            },
          },
          required: ['schemaIds'],
        },
      },
      {
        name: 'list_slos',
        description: 'List Dynatrace Service Level Objectives (SLOs) with optional filter by name and evaluation status',
        inputSchema: {
          type: 'object',
          properties: {
            sloSelector: {
              type: 'string',
              description: 'SLO selector (e.g. name("checkout SLO"))',
            },
            from: {
              type: 'string',
              description: 'Evaluation start time (e.g. now-7d). Default: now-4w',
            },
            to: {
              type: 'string',
              description: 'Evaluation end time. Default: now',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 10000, default 50)',
            },
            nextPageKey: {
              type: 'string',
              description: 'Cursor token for next page',
            },
            sort: {
              type: 'string',
              description: 'Sort order (e.g. +name, -evaluatedPercentage)',
            },
          },
        },
      },
      {
        name: 'get_slo',
        description: 'Get full evaluation details for a single Dynatrace SLO by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            sloId: {
              type: 'string',
              description: 'The SLO UUID',
            },
            from: {
              type: 'string',
              description: 'Evaluation start time (e.g. now-7d)',
            },
            to: {
              type: 'string',
              description: 'Evaluation end time',
            },
          },
          required: ['sloId'],
        },
      },
      {
        name: 'list_releases',
        description: 'List Dynatrace release events with optional filter by stage, product, and version',
        inputSchema: {
          type: 'object',
          properties: {
            releasesSelector: {
              type: 'string',
              description: 'Release selector (e.g. stage("production"), product("my-service"))',
            },
            from: {
              type: 'string',
              description: 'Start of time range (e.g. now-7d)',
            },
            to: {
              type: 'string',
              description: 'End of time range',
            },
            nextPageKey: {
              type: 'string',
              description: 'Cursor token for next page',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results per page (max 1000, default 50)',
            },
          },
        },
      },
      {
        name: 'execute_dql',
        description: 'Execute a Dynatrace Query Language (DQL) statement to retrieve logs, metrics, events, spans, or entity data from Grail',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'DQL query string (e.g. fetch logs | filter loglevel == "ERROR" | limit 100)',
            },
            defaultTimeframeStart: {
              type: 'string',
              description: 'Default query timeframe start (e.g. now-1h, ISO 8601)',
            },
            defaultTimeframeEnd: {
              type: 'string',
              description: 'Default query timeframe end (e.g. now)',
            },
            maxResultRecords: {
              type: 'number',
              description: 'Maximum number of result records (default 1000, max 200000)',
            },
            timezone: {
              type: 'string',
              description: 'Timezone for time functions in the query (e.g. UTC, America/New_York)',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_entities':
          return await this.listEntities(args);
        case 'get_entity':
          return await this.getEntity(args);
        case 'query_metrics':
          return await this.queryMetrics(args);
        case 'list_metric_descriptors':
          return await this.listMetricDescriptors(args);
        case 'list_problems':
          return await this.listProblems(args);
        case 'get_problem':
          return await this.getProblem(args);
        case 'close_problem':
          return await this.closeProblem(args);
        case 'list_events':
          return await this.listEvents(args);
        case 'create_event':
          return await this.createEvent(args);
        case 'get_settings_objects':
          return await this.getSettingsObjects(args);
        case 'list_slos':
          return await this.listSlos(args);
        case 'get_slo':
          return await this.getSlo(args);
        case 'list_releases':
          return await this.listReleases(args);
        case 'execute_dql':
          return await this.executeDql(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Api-Token ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetch2(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders, ...init });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}${errBody ? ': ' + errBody.slice(0, 500) : ''}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Dynatrace returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEntities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.entitySelector) params.set('entitySelector', String(args.entitySelector));
    if (args.fields) params.set('fields', String(args.fields));
    if (args.from) params.set('from', String(args.from));
    if (args.to) params.set('to', String(args.to));
    if (args.pageSize) params.set('pageSize', String(args.pageSize));
    if (args.nextPageKey) params.set('nextPageKey', String(args.nextPageKey));
    return this.fetch2(`${this.baseUrl}/entities?${params}`);
  }

  private async getEntity(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fields) params.set('fields', String(args.fields));
    const qs = params.toString() ? `?${params}` : '';
    return this.fetch2(`${this.baseUrl}/entities/${encodeURIComponent(String(args.entityId))}${qs}`);
  }

  private async queryMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('metricSelector', String(args.metricSelector));
    params.set('from', String(args.from));
    if (args.to) params.set('to', String(args.to));
    if (args.resolution) params.set('resolution', String(args.resolution));
    if (args.entitySelector) params.set('entitySelector', String(args.entitySelector));
    if (args.mzSelector) params.set('mzSelector', String(args.mzSelector));
    return this.fetch2(`${this.baseUrl}/metrics/query?${params}`);
  }

  private async listMetricDescriptors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.metricSelector) params.set('metricSelector', String(args.metricSelector));
    if (args.text) params.set('text', String(args.text));
    if (args.entityType) params.set('entityType', String(args.entityType));
    if (args.pageSize) params.set('pageSize', String(args.pageSize));
    if (args.nextPageKey) params.set('nextPageKey', String(args.nextPageKey));
    return this.fetch2(`${this.baseUrl}/metrics?${params}`);
  }

  private async listProblems(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.problemSelector) params.set('problemSelector', String(args.problemSelector));
    if (args.entitySelector) params.set('entitySelector', String(args.entitySelector));
    if (args.from) params.set('from', String(args.from));
    if (args.to) params.set('to', String(args.to));
    if (args.pageSize) params.set('pageSize', String(args.pageSize));
    if (args.nextPageKey) params.set('nextPageKey', String(args.nextPageKey));
    if (args.fields) params.set('fields', String(args.fields));
    return this.fetch2(`${this.baseUrl}/problems?${params}`);
  }

  private async getProblem(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.fields) params.set('fields', String(args.fields));
    const qs = params.toString() ? `?${params}` : '';
    return this.fetch2(`${this.baseUrl}/problems/${encodeURIComponent(String(args.problemId))}${qs}`);
  }

  private async closeProblem(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.message) body.message = args.message;
    return this.fetch2(
      `${this.baseUrl}/problems/${encodeURIComponent(String(args.problemId))}/close`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.eventType) params.set('eventType', String(args.eventType));
    if (args.entitySelector) params.set('entitySelector', String(args.entitySelector));
    if (args.from) params.set('from', String(args.from));
    if (args.to) params.set('to', String(args.to));
    if (args.pageSize) params.set('pageSize', String(args.pageSize));
    if (args.nextPageKey) params.set('nextPageKey', String(args.nextPageKey));
    return this.fetch2(`${this.baseUrl}/events?${params}`);
  }

  private async createEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      eventType: args.eventType,
      title: args.title,
    };
    if (args.entitySelector) body.entitySelector = args.entitySelector;
    if (args.properties) body.properties = args.properties;
    if (args.startTime) body.startTime = args.startTime;
    if (args.endTime) body.endTime = args.endTime;
    return this.fetch2(`${this.baseUrl}/events/ingest`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async getSettingsObjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('schemaIds', String(args.schemaIds));
    if (args.scope) params.set('scope', String(args.scope));
    if (args.fields) params.set('fields', String(args.fields));
    if (args.nextPageKey) params.set('nextPageKey', String(args.nextPageKey));
    if (args.pageSize) params.set('pageSize', String(args.pageSize));
    return this.fetch2(`${this.baseUrl}/settings/objects?${params}`);
  }

  private async listSlos(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.sloSelector) params.set('sloSelector', String(args.sloSelector));
    if (args.from) params.set('from', String(args.from));
    if (args.to) params.set('to', String(args.to));
    if (args.pageSize) params.set('pageSize', String(args.pageSize));
    if (args.nextPageKey) params.set('nextPageKey', String(args.nextPageKey));
    if (args.sort) params.set('sort', String(args.sort));
    return this.fetch2(`${this.baseUrl}/slo?${params}`);
  }

  private async getSlo(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.from) params.set('from', String(args.from));
    if (args.to) params.set('to', String(args.to));
    return this.fetch2(`${this.baseUrl}/slo/${encodeURIComponent(String(args.sloId))}?${params}`);
  }

  private async listReleases(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.releasesSelector) params.set('releasesSelector', String(args.releasesSelector));
    if (args.from) params.set('from', String(args.from));
    if (args.to) params.set('to', String(args.to));
    if (args.nextPageKey) params.set('nextPageKey', String(args.nextPageKey));
    if (args.pageSize) params.set('pageSize', String(args.pageSize));
    return this.fetch2(`${this.baseUrl}/releases?${params}`);
  }

  private async executeDql(args: Record<string, unknown>): Promise<ToolResult> {
    // DQL queries use the Dynatrace Platform (Grail) API, NOT the classic /api/v2 endpoint.
    // Correct endpoint: POST {platformUrl}/query:execute
    // Docs: https://developer.dynatrace.com/platform-services/services/storage/
    // The API is async: POST to start query, then poll GET /query:poll?request-token={token}.
    // requestTimeout requests inline delivery; if not done in time, we poll once.
    const body: Record<string, unknown> = {
      query: args.query,
      requestTimeout: 25000,
    };
    if (args.defaultTimeframeStart) body.defaultTimeframeStart = args.defaultTimeframeStart;
    if (args.defaultTimeframeEnd) body.defaultTimeframeEnd = args.defaultTimeframeEnd;
    if (args.maxResultRecords) body.maxResultRecords = args.maxResultRecords;
    if (args.timezone) body.timezone = args.timezone;

    const startResponse = await this.fetchWithRetry(`${this.platformUrl}/query:execute`, {
      method: 'POST',
      headers: { ...this.authHeaders },
      body: JSON.stringify(body),
    });
    if (!startResponse.ok) {
      let errBody = '';
      try { errBody = await startResponse.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `DQL execute error ${startResponse.status} ${startResponse.statusText}${errBody ? ': ' + errBody.slice(0, 500) : ''}` }],
        isError: true,
      };
    }
    let startData: Record<string, unknown>;
    try { startData = await startResponse.json() as Record<string, unknown>; } catch {
      throw new Error(`Dynatrace returned non-JSON response from DQL execute (HTTP ${startResponse.status})`);
    }
    // If state is SUCCEEDED the result is already inline
    if ((startData.state as string) === 'SUCCEEDED') {
      return { content: [{ type: 'text', text: this.truncate(startData) }], isError: false };
    }
    const requestToken = startData.requestToken as string | undefined;
    if (!requestToken) {
      return { content: [{ type: 'text', text: this.truncate(startData) }], isError: false };
    }
    // Poll once for result
    const pollResponse = await this.fetchWithRetry(
      `${this.platformUrl}/query:poll?request-token=${encodeURIComponent(requestToken)}`,
      { headers: this.authHeaders },
    );
    if (!pollResponse.ok) {
      let errBody = '';
      try { errBody = await pollResponse.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `DQL poll error ${pollResponse.status} ${pollResponse.statusText}${errBody ? ': ' + errBody.slice(0, 500) : ''}` }],
        isError: true,
      };
    }
    let pollData: unknown;
    try { pollData = await pollResponse.json(); } catch {
      throw new Error(`Dynatrace returned non-JSON response from DQL poll (HTTP ${pollResponse.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(pollData) }], isError: false };
  }
}
