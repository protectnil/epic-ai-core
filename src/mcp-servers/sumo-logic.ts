/**
 * Sumo Logic MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None published by Sumo Logic as of 2026-03. Community servers exist
// (samwang0723/mcp-sumologic, vinit-devops/sumologic_mcp) but none are official.
// Sumo Logic's own MCP server is in limited beta (Dojo AI hub) with no public release date.
// Our adapter covers: 18 tools (core operations). No official vendor MCP to migrate to.
//
// Base URL: https://api.{region}.sumologic.com/api  (US1: https://api.sumologic.com/api)
// Auth: Basic auth — Base64(accessId:accessKey) in Authorization header
// Docs: https://api.sumologic.com/docs/  |  https://help.sumologic.com/docs/api/
// Rate limits: 4 requests/second per access key; 10 in-flight requests max; 429 on breach

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SumoLogicConfig {
  accessId: string;
  accessKey: string;
  /** Region subdomain: us2, eu, jp, de, ca, au, kr, in, fed. Omit for US1 (default). */
  region?: string;
  baseUrl?: string;
}

export class SumoLogicMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: SumoLogicConfig) {
    super();
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/$/, '');
    } else if (config.region) {
      this.baseUrl = `https://api.${config.region}.sumologic.com/api`;
    } else {
      this.baseUrl = 'https://api.sumologic.com/api';
    }
    this.authHeader = `Basic ${Buffer.from(`${config.accessId}:${config.accessKey}`).toString('base64')}`;
  }

  static catalog() {
    return {
      name: 'sumo-logic',
      displayName: 'Sumo Logic',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: ['sumo', 'sumologic', 'log', 'search', 'monitor', 'alert', 'dashboard', 'collector', 'source', 'field', 'scheduled', 'ingest', 'siem', 'observability'],
      toolNames: [
        'create_search_job', 'get_search_job_status', 'get_search_results', 'delete_search_job',
        'list_collectors', 'get_collector', 'list_sources', 'get_source',
        'search_monitors', 'get_monitor', 'create_monitor', 'update_monitor',
        'list_dashboards', 'get_dashboard',
        'list_users', 'get_user',
        'list_fields', 'list_log_searches',
      ],
      description: 'Log search, monitors, alerts, dashboards, collectors, and user management for Sumo Logic observability platform.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Search Jobs ──────────────────────────────────────────────────────────
      {
        name: 'create_search_job',
        description: 'Create an async log search job in Sumo Logic. Returns a job ID; poll get_search_job_status until state is DONE GATHERING RESULTS, then call get_search_results.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Sumo Logic query string (e.g. "_sourceCategory=prod/app | count by host")' },
            from: { type: 'string', description: 'Start time in ISO 8601 format or epoch milliseconds (e.g. "2024-01-01T00:00:00Z")' },
            to: { type: 'string', description: 'End time in ISO 8601 format or epoch milliseconds' },
            timezone: { type: 'string', description: 'IANA timezone for the search window (default: "UTC")' },
            byReceiptTime: { type: 'boolean', description: 'If true, search by receipt time instead of message time (default: false)' },
          },
          required: ['query', 'from', 'to'],
        },
      },
      {
        name: 'get_search_job_status',
        description: 'Poll the status of a Sumo Logic search job. Returns state (GATHERING RESULTS, DONE GATHERING RESULTS, CANCELLED, FORCE PAUSED) and record/message counts.',
        inputSchema: {
          type: 'object',
          properties: {
            search_id: { type: 'string', description: 'Search job ID returned by create_search_job' },
          },
          required: ['search_id'],
        },
      },
      {
        name: 'get_search_results',
        description: 'Retrieve messages or records from a completed Sumo Logic search job. Call after get_search_job_status returns DONE GATHERING RESULTS. Use type=records for aggregate queries.',
        inputSchema: {
          type: 'object',
          properties: {
            search_id: { type: 'string', description: 'Search job ID' },
            type: { type: 'string', description: 'Result type: messages (default) or records (for aggregate/count queries)' },
            offset: { type: 'number', description: 'Result offset for pagination (default: 0)' },
            limit: { type: 'number', description: 'Maximum results to return (default: 100, max: 10000)' },
          },
          required: ['search_id'],
        },
      },
      {
        name: 'delete_search_job',
        description: 'Cancel and delete a Sumo Logic search job to release resources. Call when done with a job or if results are no longer needed.',
        inputSchema: {
          type: 'object',
          properties: {
            search_id: { type: 'string', description: 'Search job ID to cancel and delete' },
          },
          required: ['search_id'],
        },
      },
      // ── Collectors ───────────────────────────────────────────────────────────
      {
        name: 'list_collectors',
        description: 'List Sumo Logic Installed and Hosted Collectors with pagination and optional name filter.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum collectors to return (default: 100, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            filter: { type: 'string', description: 'Filter by name (partial match)' },
          },
        },
      },
      {
        name: 'get_collector',
        description: 'Get full details of a specific Sumo Logic collector including OS version, alive status, and last seen time.',
        inputSchema: {
          type: 'object',
          properties: {
            collector_id: { type: 'number', description: 'Numeric collector ID' },
          },
          required: ['collector_id'],
        },
      },
      // ── Sources ──────────────────────────────────────────────────────────────
      {
        name: 'list_sources',
        description: 'List all sources configured under a Sumo Logic collector.',
        inputSchema: {
          type: 'object',
          properties: {
            collector_id: { type: 'number', description: 'Numeric collector ID' },
          },
          required: ['collector_id'],
        },
      },
      {
        name: 'get_source',
        description: 'Get details of a specific source under a Sumo Logic collector, including source category, host, and path configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            collector_id: { type: 'number', description: 'Numeric collector ID' },
            source_id: { type: 'number', description: 'Numeric source ID' },
          },
          required: ['collector_id', 'source_id'],
        },
      },
      // ── Monitors ─────────────────────────────────────────────────────────────
      {
        name: 'search_monitors',
        description: 'Search Sumo Logic monitors in the monitors library by name or query string. Returns matching monitors with their IDs and paths.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query to filter monitors by name (optional; omit to list all)' },
            limit: { type: 'number', description: 'Maximum monitors to return (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_monitor',
        description: 'Get full details of a specific Sumo Logic monitor including trigger conditions and notification settings.',
        inputSchema: {
          type: 'object',
          properties: {
            monitor_id: { type: 'string', description: 'Monitor ID (UUID)' },
          },
          required: ['monitor_id'],
        },
      },
      {
        name: 'create_monitor',
        description: 'Create a new Sumo Logic monitor (alert rule) for log or metrics data. Requires a parent folder ID to place the monitor in.',
        inputSchema: {
          type: 'object',
          properties: {
            parent_id: { type: 'string', description: 'ID of the parent folder in the monitors library to create the monitor under (required)' },
            name: { type: 'string', description: 'Display name for the monitor' },
            description: { type: 'string', description: 'Optional description' },
            monitor_type: { type: 'string', description: 'Monitor type: Logs or Metrics' },
            queries: { type: 'array', description: 'Array of query objects with rowId and query fields', items: { type: 'object' } },
            triggers: { type: 'array', description: 'Array of trigger condition objects', items: { type: 'object' } },
            notifications: { type: 'array', description: 'Array of notification configuration objects', items: { type: 'object' } },
            is_disabled: { type: 'boolean', description: 'Create monitor in disabled state (default: false)' },
          },
          required: ['parent_id', 'name', 'monitor_type', 'queries', 'triggers'],
        },
      },
      {
        name: 'update_monitor',
        description: 'Update an existing Sumo Logic monitor — name, queries, triggers, or enabled/disabled state.',
        inputSchema: {
          type: 'object',
          properties: {
            monitor_id: { type: 'string', description: 'Monitor ID (UUID)' },
            name: { type: 'string', description: 'Updated display name' },
            description: { type: 'string', description: 'Updated description' },
            is_disabled: { type: 'boolean', description: 'Enable or disable the monitor' },
            triggers: { type: 'array', description: 'Updated array of trigger condition objects', items: { type: 'object' } },
            notifications: { type: 'array', description: 'Updated array of notification configuration objects', items: { type: 'object' } },
          },
          required: ['monitor_id'],
        },
      },
      // ── Dashboards ───────────────────────────────────────────────────────────
      {
        name: 'list_dashboards',
        description: 'List Sumo Logic dashboards with optional folder filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum dashboards to return (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            folder_id: { type: 'string', description: 'Filter to dashboards in this folder ID' },
          },
        },
      },
      {
        name: 'get_dashboard',
        description: 'Get full details of a specific Sumo Logic dashboard including panels and layout.',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard_id: { type: 'string', description: 'Dashboard ID' },
          },
          required: ['dashboard_id'],
        },
      },
      // ── Users ────────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List Sumo Logic users with optional email search and role filter.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum users to return (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            email: { type: 'string', description: 'Filter by email address (exact or partial match)' },
            sort_by: { type: 'string', description: 'Sort field: firstName, lastName, email (default: firstName)' },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details of a specific Sumo Logic user including roles and last login time.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID' },
          },
          required: ['user_id'],
        },
      },
      // ── Fields ───────────────────────────────────────────────────────────────
      {
        name: 'list_fields',
        description: 'List custom log fields configured in Sumo Logic for log enrichment and parsing.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Log Searches ─────────────────────────────────────────────────────────
      {
        name: 'list_log_searches',
        description: 'List all saved log searches in the Sumo Logic content library, including scheduled searches. Paginate with limit/token.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum results to return (default: 50, max: 100)' },
            token: { type: 'string', description: 'Pagination token from previous response (omit for first page)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_search_job':
          return await this.createSearchJob(args);
        case 'get_search_job_status':
          return await this.getSearchJobStatus(args);
        case 'get_search_results':
          return await this.getSearchResults(args);
        case 'delete_search_job':
          return await this.deleteSearchJob(args);
        case 'list_collectors':
          return await this.listCollectors(args);
        case 'get_collector':
          return await this.getCollector(args);
        case 'list_sources':
          return await this.listSources(args);
        case 'get_source':
          return await this.getSource(args);
        case 'search_monitors':
          return await this.searchMonitors(args);
        case 'get_monitor':
          return await this.getMonitor(args);
        case 'create_monitor':
          return await this.createMonitor(args);
        case 'update_monitor':
          return await this.updateMonitor(args);
        case 'list_dashboards':
          return await this.listDashboards(args);
        case 'get_dashboard':
          return await this.getDashboard(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'list_fields':
          return await this.listFields();
        case 'list_log_searches':
          return await this.listLogSearches(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { return { content: [{ type: 'text', text: `Non-JSON response (HTTP ${response.status})` }], isError: true }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
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
    let data: unknown;
    try { data = await response.json(); } catch { return { content: [{ type: 'text', text: `Non-JSON response (HTTP ${response.status})` }], isError: true }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { return { content: [{ type: 'text', text: `Non-JSON response (HTTP ${response.status})` }], isError: true }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, status: response.status }) }], isError: false };
  }

  private async createSearchJob(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiPost('/v1/search/jobs', {
      query: args.query as string,
      from: args.from,
      to: args.to,
      timezone: (args.timezone as string) ?? 'UTC',
      byReceiptTime: (args.byReceiptTime as boolean) ?? false,
    });
  }

  private async getSearchJobStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.search_id as string);
    return this.apiGet(`/v1/search/jobs/${id}`);
  }

  private async getSearchResults(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.search_id as string);
    const type = (args.type as string) === 'records' ? 'records' : 'messages';
    const params = new URLSearchParams({
      offset: String((args.offset as number) ?? 0),
      limit: String((args.limit as number) ?? 100),
    });
    return this.apiGet(`/v1/search/jobs/${id}/${type}?${params}`);
  }

  private async deleteSearchJob(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.search_id as string);
    return this.apiDelete(`/v1/search/jobs/${id}`);
  }

  private async listCollectors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.filter) params.set('filter', args.filter as string);
    return this.apiGet(`/v1/collectors?${params}`);
  }

  private async getCollector(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/v1/collectors/${encodeURIComponent(String(args.collector_id))}`);
  }

  private async listSources(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/v1/collectors/${encodeURIComponent(String(args.collector_id))}/sources`);
  }

  private async getSource(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(
      `/v1/collectors/${encodeURIComponent(String(args.collector_id))}/sources/${encodeURIComponent(String(args.source_id))}`
    );
  }

  private async searchMonitors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.query) params.set('query', args.query as string);
    return this.apiGet(`/v1/monitors/search?${params}`);
  }

  private async getMonitor(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/v1/monitors/${encodeURIComponent(args.monitor_id as string)}`);
  }

  private async createMonitor(args: Record<string, unknown>): Promise<ToolResult> {
    const parentId = encodeURIComponent(args.parent_id as string);
    return this.apiPost(`/v1/monitors?parentId=${parentId}`, {
      type: 'MonitorsLibraryMonitor',
      name: args.name,
      description: args.description,
      monitorType: args.monitor_type,
      queries: args.queries,
      triggers: args.triggers,
      notifications: args.notifications ?? [],
      isDisabled: args.is_disabled ?? false,
    });
  }

  private async updateMonitor(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.monitor_id as string);
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body['name'] = args.name;
    if (args.description !== undefined) body['description'] = args.description;
    if (args.is_disabled !== undefined) body['isDisabled'] = args.is_disabled;
    if (args.triggers !== undefined) body['triggers'] = args.triggers;
    if (args.notifications !== undefined) body['notifications'] = args.notifications;
    return this.apiPut(`/v1/monitors/${id}`, body);
  }

  private async listDashboards(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.folder_id) params.set('parentId', args.folder_id as string);
    return this.apiGet(`/v1/dashboards?${params}`);
  }

  private async getDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/v1/dashboards/${encodeURIComponent(args.dashboard_id as string)}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 100),
      offset: String((args.offset as number) ?? 0),
    });
    if (args.email) params.set('email', args.email as string);
    if (args.sort_by) params.set('sortBy', args.sort_by as string);
    return this.apiGet(`/v1/users?${params}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/v1/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listFields(): Promise<ToolResult> {
    return this.apiGet('/v1/fields');
  }

  private async listLogSearches(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) ?? 50),
    });
    if (args.token) params.set('token', args.token as string);
    return this.apiGet(`/v1/logSearches?${params}`);
  }
}
