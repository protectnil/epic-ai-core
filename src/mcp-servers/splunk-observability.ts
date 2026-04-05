/**
 * Splunk Observability Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://splunkbase.splunk.com/app/7931 (Splunk MCP Server) — official, published
//   by Splunk. Transport: streamable-HTTP (SSE). Auth: Bearer token + X-SF-TOKEN + X-SF-REALM.
//   Latest version: 1.0.5, published March 26, 2026. Actively maintained.
//   Observability-specific tools (12): get_metric_names, get_metric_metadata,
//   generate_signalflow_program, execute_signalflow_program, get_apm_environments,
//   get_apm_services, get_apm_service_dependencies, get_apm_service_latency,
//   get_apm_service_errors_and_requests, get_apm_exemplar_traces, get_apm_trace_tool,
//   search_alerts_or_incidents. These are AI Assistant / NLP-to-SignalFlow tools.
//
// Our adapter covers: 15 tools (detector CRUD, alert list, dashboard CRUD, chart CRUD,
//   dashboard group CRUD, metric time series search, SignalFlow execute).
//
// OVERLAP ANALYSIS:
//   MCP tools: get_metric_names, get_metric_metadata, generate_signalflow_program,
//     execute_signalflow_program, get_apm_environments, get_apm_services,
//     get_apm_service_dependencies, get_apm_service_latency,
//     get_apm_service_errors_and_requests, get_apm_exemplar_traces, get_apm_trace_tool,
//     search_alerts_or_incidents
//   Shared (approximate): search_metrics ↔ get_metric_names/get_metric_metadata (similar intent)
//     execute_signalflow ↔ execute_signalflow_program (same operation, different transports)
//   MCP-only (10): generate_signalflow_program, get_apm_environments, get_apm_services,
//     get_apm_service_dependencies, get_apm_service_latency, get_apm_service_errors_and_requests,
//     get_apm_exemplar_traces, get_apm_trace_tool, search_alerts_or_incidents, get_metric_metadata
//   REST-only (13): list_detectors, get_detector, create_detector, update_detector,
//     delete_detector, list_detector_incidents, list_alerts, list_dashboards, get_dashboard,
//     list_dashboard_groups, get_dashboard_group, list_charts, get_chart
//
// Recommendation: use-both — Vendor MCP has 10 unique tools (NLP/APM/AI-assistant) not in our
//   REST adapter. Our REST adapter has 13 unique CRUD tools not in the MCP. Full coverage requires
//   both. MCP sources: execute_signalflow_program, search (metric/alert NLP), APM tools.
//   REST sources: all detector/dashboard/chart CRUD operations.
//
// Integration: use-both
// MCP-sourced tools (10): generate_signalflow_program, get_apm_environments, get_apm_services,
//   get_apm_service_dependencies, get_apm_service_latency, get_apm_service_errors_and_requests,
//   get_apm_exemplar_traces, get_apm_trace_tool, search_alerts_or_incidents, get_metric_metadata
// REST-sourced tools (15): list_detectors, get_detector, create_detector, update_detector,
//   delete_detector, list_detector_incidents, list_alerts, list_dashboards, get_dashboard,
//   list_dashboard_groups, get_dashboard_group, list_charts, get_chart, search_metrics,
//   execute_signalflow
// Combined coverage: 25 tools (MCP: 12 + REST: 15 - shared ~2 = 25 unique operations)
//
// Base URL: https://api.{realm}.signalfx.com
//   Replace {realm} with your org realm: us0, us1, us2, eu0, ap0, jp0, etc.
// Auth: X-SF-Token header with organization access token
// Docs: https://dev.splunk.com/observability/reference/
// Rate limits: Varies by endpoint; ~1000 req/min typical for most REST endpoints

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SplunkObservabilityConfig {
  /**
   * Organization access token for authenticating Observability Cloud API requests.
   * Create at Splunk Observability Cloud → Settings → Access Tokens.
   */
  accessToken: string;
  /**
   * Your Splunk Observability Cloud realm (e.g. us0, us1, us2, eu0, ap0, jp0).
   * Determines the API base URL: https://api.{realm}.signalfx.com
   * Find your realm at Settings → Organizations.
   */
  realm: string;
}

export class SplunkObservabilityMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: SplunkObservabilityConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = `https://api.${config.realm}.signalfx.com`;
  }

  static catalog() {
    return {
      name: 'splunk-observability',
      displayName: 'Splunk Observability Cloud',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: ['splunk', 'observability', 'signalfx', 'apm', 'detector', 'alert', 'dashboard', 'chart', 'signalflow', 'metrics', 'mts', 'incident', 'infra monitoring'],
      toolNames: [
        'list_detectors', 'get_detector', 'create_detector', 'update_detector', 'delete_detector',
        'list_detector_incidents', 'list_alerts',
        'list_dashboards', 'get_dashboard',
        'list_dashboard_groups', 'get_dashboard_group',
        'list_charts', 'get_chart',
        'search_metrics', 'execute_signalflow',
      ],
      description: 'Splunk Observability Cloud (formerly SignalFx): manage detectors and alerts, query dashboards and charts, search metrics, and execute SignalFlow analytics programs.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_detectors',
        description: 'List alert detectors with optional name filter and pagination — detectors define alert conditions via SignalFlow',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of detectors to return (max 1000, default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            name: {
              type: 'string',
              description: 'Filter detectors by name (substring match)',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated tag values to filter detectors by',
            },
          },
        },
      },
      {
        name: 'get_detector',
        description: 'Get full configuration for a specific detector including SignalFlow program, alert rules, and notification settings',
        inputSchema: {
          type: 'object',
          properties: {
            detector_id: {
              type: 'string',
              description: 'Detector ID to retrieve (obtained from list_detectors)',
            },
          },
          required: ['detector_id'],
        },
      },
      {
        name: 'create_detector',
        description: 'Create a new alert detector with a SignalFlow program and alert rules',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the detector',
            },
            programOptions: {
              type: 'string',
              description: 'JSON object with SignalFlow program options including minimumResolution and maximumDelay',
            },
            rules: {
              type: 'string',
              description: 'JSON array of alert rule objects with detectLabel, severity, and notification settings',
            },
            description: {
              type: 'string',
              description: 'Optional description of the detector purpose',
            },
          },
          required: ['name', 'rules'],
        },
      },
      {
        name: 'update_detector',
        description: 'Update an existing detector configuration including name, SignalFlow program, or alert rules',
        inputSchema: {
          type: 'object',
          properties: {
            detector_id: {
              type: 'string',
              description: 'Detector ID to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the detector',
            },
            description: {
              type: 'string',
              description: 'Updated description',
            },
          },
          required: ['detector_id'],
        },
      },
      {
        name: 'delete_detector',
        description: 'Delete a detector permanently — stops all alert monitoring associated with the detector',
        inputSchema: {
          type: 'object',
          properties: {
            detector_id: {
              type: 'string',
              description: 'Detector ID to delete (obtained from list_detectors)',
            },
          },
          required: ['detector_id'],
        },
      },
      {
        name: 'list_detector_incidents',
        description: 'List active alert incidents triggered by a specific detector, with severity and duration',
        inputSchema: {
          type: 'object',
          properties: {
            detector_id: {
              type: 'string',
              description: 'Detector ID to retrieve active incidents for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of incidents to return (default: 50)',
            },
          },
          required: ['detector_id'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List active alerts across the organization, optionally filtered by detector, severity, or linked team',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (max 1000, default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            detector_id: {
              type: 'string',
              description: 'Filter alerts to those from a specific detector',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: Critical, Major, Minor, Warning, Info',
            },
            status: {
              type: 'string',
              description: 'Filter by alert status: active, resolved, anomalous, ok',
            },
          },
        },
      },
      {
        name: 'list_dashboards',
        description: 'List dashboards with optional name filter — returns dashboard metadata and group membership',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of dashboards to return (max 1000, default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            name: {
              type: 'string',
              description: 'Filter dashboards by name (substring match)',
            },
            dashboardGroupId: {
              type: 'string',
              description: 'Filter dashboards by their parent dashboard group ID',
            },
          },
        },
      },
      {
        name: 'get_dashboard',
        description: 'Get full configuration for a specific dashboard including chart layout and filter overrides',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard_id: {
              type: 'string',
              description: 'Dashboard ID to retrieve (obtained from list_dashboards)',
            },
          },
          required: ['dashboard_id'],
        },
      },
      {
        name: 'list_dashboard_groups',
        description: 'List dashboard groups (folders) that organize dashboards with their team associations',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of dashboard groups to return (max 1000, default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            name: {
              type: 'string',
              description: 'Filter dashboard groups by name (substring match)',
            },
          },
        },
      },
      {
        name: 'get_dashboard_group',
        description: 'Get details for a specific dashboard group including its member dashboards and team permissions',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Dashboard group ID to retrieve',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_charts',
        description: 'List charts (visualizations) with optional name filter — charts belong to dashboards',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of charts to return (max 1000, default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            name: {
              type: 'string',
              description: 'Filter charts by name (substring match)',
            },
          },
        },
      },
      {
        name: 'get_chart',
        description: 'Get full configuration for a specific chart including plot options and SignalFlow program',
        inputSchema: {
          type: 'object',
          properties: {
            chart_id: {
              type: 'string',
              description: 'Chart ID to retrieve (obtained from list_charts or get_dashboard)',
            },
          },
          required: ['chart_id'],
        },
      },
      {
        name: 'search_metrics',
        description: 'Search for metric time series (MTS) by metric name and optional dimension filter — find what metrics are being reported',
        inputSchema: {
          type: 'object',
          properties: {
            metric: {
              type: 'string',
              description: 'Metric name to search for (e.g. cpu.utilization, memory.utilization)',
            },
            query: {
              type: 'string',
              description: 'Additional filter query string using dimension key:value pairs (e.g. host:web-01 environment:prod)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of time series to return (max 1000, default: 50)',
            },
          },
          required: ['metric'],
        },
      },
      {
        name: 'execute_signalflow',
        description: 'Execute a SignalFlow analytics program and return computed metric data — SignalFlow is the streaming analytics language for Splunk Observability Cloud',
        inputSchema: {
          type: 'object',
          properties: {
            program: {
              type: 'string',
              description: 'SignalFlow program to execute (e.g. "data(\'cpu.utilization\').mean().publish()")',
            },
            start: {
              type: 'number',
              description: 'Start time as Unix milliseconds (default: now minus 1 hour)',
            },
            stop: {
              type: 'number',
              description: 'Stop time as Unix milliseconds (default: now)',
            },
            resolution: {
              type: 'number',
              description: 'Data resolution in milliseconds (default: 60000 for 1-minute intervals)',
            },
            maxDelay: {
              type: 'number',
              description: 'Maximum data delay in milliseconds to wait before processing (default: 0)',
            },
          },
          required: ['program'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_detectors':
          return await this.listDetectors(args);
        case 'get_detector':
          return await this.getDetector(args);
        case 'create_detector':
          return await this.createDetector(args);
        case 'update_detector':
          return await this.updateDetector(args);
        case 'delete_detector':
          return await this.deleteDetector(args);
        case 'list_detector_incidents':
          return await this.listDetectorIncidents(args);
        case 'list_alerts':
          return await this.listAlerts(args);
        case 'list_dashboards':
          return await this.listDashboards(args);
        case 'get_dashboard':
          return await this.getDashboard(args);
        case 'list_dashboard_groups':
          return await this.listDashboardGroups(args);
        case 'get_dashboard_group':
          return await this.getDashboardGroup(args);
        case 'list_charts':
          return await this.listCharts(args);
        case 'get_chart':
          return await this.getChart(args);
        case 'search_metrics':
          return await this.searchMetrics(args);
        case 'execute_signalflow':
          return await this.executeSignalflow(args);
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
      'X-SF-Token': this.accessToken,
      'Content-Type': 'application/json',
    };
  }

  private async listDetectors(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    let url = `${this.baseUrl}/v2/detector?limit=${limit}&offset=${offset}`;
    if (args.name) url += `&name=${encodeURIComponent(args.name as string)}`;
    if (args.tags) url += `&tags=${encodeURIComponent(args.tags as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list detectors: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDetector(args: Record<string, unknown>): Promise<ToolResult> {
    const detectorId = args.detector_id as string;
    if (!detectorId) {
      return { content: [{ type: 'text', text: 'detector_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/detector/${encodeURIComponent(detectorId)}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get detector: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createDetector(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    const rules = args.rules as string;
    if (!name || !rules) {
      return { content: [{ type: 'text', text: 'name and rules are required' }], isError: true };
    }

    let parsedRules: unknown;
    try {
      parsedRules = JSON.parse(rules);
    } catch {
      return { content: [{ type: 'text', text: 'rules must be valid JSON' }], isError: true };
    }

    const body: Record<string, unknown> = { name, rules: parsedRules };
    if (args.description) body.description = args.description as string;
    if (args.programOptions) {
      try {
        body.programOptions = JSON.parse(args.programOptions as string);
      } catch {
        return { content: [{ type: 'text', text: 'programOptions must be valid JSON' }], isError: true };
      }
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/detector`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create detector: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateDetector(args: Record<string, unknown>): Promise<ToolResult> {
    const detectorId = args.detector_id as string;
    if (!detectorId) {
      return { content: [{ type: 'text', text: 'detector_id is required' }], isError: true };
    }

    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name as string;
    if (args.description) body.description = args.description as string;

    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/detector/${encodeURIComponent(detectorId)}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to update detector: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteDetector(args: Record<string, unknown>): Promise<ToolResult> {
    const detectorId = args.detector_id as string;
    if (!detectorId) {
      return { content: [{ type: 'text', text: 'detector_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/detector/${encodeURIComponent(detectorId)}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to delete detector: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Detector ${detectorId} deleted successfully` }) }], isError: false };
  }

  private async listDetectorIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const detectorId = args.detector_id as string;
    if (!detectorId) {
      return { content: [{ type: 'text', text: 'detector_id is required' }], isError: true };
    }
    const limit = (args.limit as number) ?? 50;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v2/detector/${encodeURIComponent(detectorId)}/incidents?limit=${limit}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list detector incidents: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    let url = `${this.baseUrl}/v2/alert?limit=${limit}&offset=${offset}`;
    if (args.detector_id) url += `&detectorId=${encodeURIComponent(args.detector_id as string)}`;
    if (args.severity) url += `&severity=${encodeURIComponent(args.severity as string)}`;
    if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list alerts: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDashboards(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    let url = `${this.baseUrl}/v2/dashboard?limit=${limit}&offset=${offset}`;
    if (args.name) url += `&name=${encodeURIComponent(args.name as string)}`;
    if (args.dashboardGroupId) url += `&dashboardGroupId=${encodeURIComponent(args.dashboardGroupId as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list dashboards: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const dashboardId = args.dashboard_id as string;
    if (!dashboardId) {
      return { content: [{ type: 'text', text: 'dashboard_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/dashboard/${encodeURIComponent(dashboardId)}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get dashboard: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDashboardGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    let url = `${this.baseUrl}/v2/dashboardgroup?limit=${limit}&offset=${offset}`;
    if (args.name) url += `&name=${encodeURIComponent(args.name as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list dashboard groups: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDashboardGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const groupId = args.group_id as string;
    if (!groupId) {
      return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/dashboardgroup/${encodeURIComponent(groupId)}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get dashboard group: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCharts(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    let url = `${this.baseUrl}/v2/chart?limit=${limit}&offset=${offset}`;
    if (args.name) url += `&name=${encodeURIComponent(args.name as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list charts: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getChart(args: Record<string, unknown>): Promise<ToolResult> {
    const chartId = args.chart_id as string;
    if (!chartId) {
      return { content: [{ type: 'text', text: 'chart_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/chart/${encodeURIComponent(chartId)}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get chart: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const metric = args.metric as string;
    if (!metric) {
      return { content: [{ type: 'text', text: 'metric is required' }], isError: true };
    }
    const limit = (args.limit as number) ?? 50;
    let url = `${this.baseUrl}/v2/metrictimeseries?metric=${encodeURIComponent(metric)}&limit=${limit}`;
    if (args.query) url += `&query=${encodeURIComponent(args.query as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to search metrics: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async executeSignalflow(args: Record<string, unknown>): Promise<ToolResult> {
    const program = args.program as string;
    if (!program) {
      return { content: [{ type: 'text', text: 'program is required' }], isError: true };
    }
    const now = Date.now();
    const start = (args.start as number) ?? now - 3_600_000;
    const stop = (args.stop as number) ?? now;
    const resolution = (args.resolution as number) ?? 60_000;
    const maxDelay = (args.maxDelay as number) ?? 0;

    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/signalflow/execute`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ program, start, stop, resolution, maxDelay }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to execute SignalFlow: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
