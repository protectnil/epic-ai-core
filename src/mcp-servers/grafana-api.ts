/**
 * Grafana API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/grafana/mcp-grafana — transport: stdio/streamable-HTTP, auth: service account token
// The official Grafana MCP server is actively maintained (latest release v0.11.1, Feb 2025) and covers 60+ tools
// across dashboards, Prometheus, Loki, Tempo, Pyroscope, incidents, OnCall, Sift, alerting, and annotations.
// Our adapter covers: 19 tools (REST provisioning API). Vendor MCP covers: 60+ tools.
//
// Integration: use-both
// MCP-sourced tools (unique to vendor MCP, not in REST provisioning API):
//   query_prometheus, query_prometheus_histogram, list_prometheus_metric_names, list_prometheus_metric_metadata,
//   list_prometheus_label_names, list_prometheus_label_values, query_loki_logs, query_loki_patterns,
//   query_loki_stats, list_loki_label_names, list_loki_label_values, list_incidents, get_incident,
//   create_incident, add_activity_to_incident, list_oncall_schedules, get_oncall_shift,
//   get_current_oncall_users, list_oncall_teams, list_oncall_users, get_sift_investigation,
//   get_sift_analysis, list_sift_investigations, find_error_pattern_logs, find_slow_requests,
//   get_dashboard_summary, get_dashboard_property, get_dashboard_panel_queries, search_folders,
//   get_datasource_by_name, run_panel_query, generate_deeplink, get_panel_image, get_assertions,
//   get_annotation_tags, update_annotation, fetch_pyroscope_profile, list_pyroscope_profile_types,
//   list_pyroscope_label_names, list_pyroscope_label_values
// REST-sourced tools (our adapter — provisioning API operations not in vendor MCP):
//   create_or_update_dashboard, delete_dashboard, list_folders, get_folder,
//   list_alert_rules, get_alert_rule, create_alert_rule, update_alert_rule, delete_alert_rule,
//   list_contact_points, list_silences, create_silence
// Shared tools (exist in both, MCP takes priority):
//   search_dashboards, get_dashboard, create_folder, list_datasources, get_datasource,
//   list_annotations, create_annotation, list_alert_rules (alerting provisioning vs unified alerting)
// Combined coverage: 19 REST tools + 40+ MCP-only tools = full provisioning + observability
// Recommendation: use-both — the vendor MCP covers observability queries (Prometheus, Loki, Tempo, Pyroscope,
//   incidents, OnCall, Sift) which our REST adapter cannot reach. Our REST adapter covers the provisioning API
//   (create/update/delete dashboards, folders, alert rules, silences, contact points) which the vendor MCP
//   does not expose. Full coverage requires both transports.
//
// Base URL: https://{instance}.grafana.net/api (Grafana Cloud) or https://{host}/api (self-hosted)
// Auth: Bearer service account token (Authorization: Bearer <token>)
// Docs: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/
// Rate limits: Not officially documented; Grafana Cloud applies per-org limits. Self-hosted: no default limit.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GrafanaAPIConfig {
  serviceAccountToken: string;
  /** For Grafana Cloud: instance slug (used to build https://{instance}.grafana.net). For self-hosted: full host (e.g. grafana.mycompany.com). */
  instance: string;
  /** Override the full base URL (e.g. http://localhost:3000/api). Takes precedence over instance. */
  baseUrl?: string;
}

export class GrafanaAPIMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: GrafanaAPIConfig) {
    super();
    this.token = config.serviceAccountToken;
    this.baseUrl = config.baseUrl
      ? config.baseUrl.replace(/\/$/, '')
      : `https://${config.instance}.grafana.net/api`;
  }

  static catalog() {
    return {
      name: 'grafana-api',
      displayName: 'Grafana',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: [
        'grafana', 'dashboard', 'alert', 'datasource', 'annotation', 'folder',
        'alerting', 'provisioning', 'contact-point', 'silence', 'notification', 'observability',
      ],
      toolNames: [
        'search_dashboards', 'get_dashboard', 'create_or_update_dashboard', 'delete_dashboard',
        'list_folders', 'create_folder', 'get_folder',
        'list_datasources', 'get_datasource',
        'list_alert_rules', 'get_alert_rule', 'create_alert_rule', 'update_alert_rule', 'delete_alert_rule',
        'list_contact_points',
        'list_silences', 'create_silence',
        'list_annotations', 'create_annotation',
      ],
      description: 'Manage Grafana dashboards, folders, datasources, alert rules, contact points, silences, and annotations via the HTTP provisioning API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Dashboards ────────────────────────────────────────────────────────
      {
        name: 'search_dashboards',
        description: 'Search Grafana dashboards and folders by title query, tag, type, or folder UID. Returns matching items with UID, title, and URL.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search string matched against dashboard title.',
            },
            tag: {
              type: 'string',
              description: 'Filter results by tag.',
            },
            type: {
              type: 'string',
              description: "Filter by type: 'dash-db' (dashboards only) or 'dash-folder' (folders only). Omit for both.",
            },
            folder_uid: {
              type: 'string',
              description: 'Restrict results to a specific folder by UID.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 100).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
        },
      },
      {
        name: 'get_dashboard',
        description: 'Retrieve the full JSON model of a Grafana dashboard by its UID, including all panels, variables, and settings.',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Dashboard UID.',
            },
          },
          required: ['uid'],
        },
      },
      {
        name: 'create_or_update_dashboard',
        description: 'Create a new Grafana dashboard or update an existing one by posting its full JSON model. Set overwrite to true to replace an existing dashboard.',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard: {
              type: 'object',
              description: 'Full Grafana dashboard JSON model. Must include "title". Omit "id" for new dashboards.',
            },
            folder_uid: {
              type: 'string',
              description: 'UID of the folder to save the dashboard into (optional).',
            },
            overwrite: {
              type: 'boolean',
              description: 'Set to true to overwrite an existing dashboard with the same UID (default: false).',
            },
            message: {
              type: 'string',
              description: 'Commit message describing the change (optional).',
            },
          },
          required: ['dashboard'],
        },
      },
      {
        name: 'delete_dashboard',
        description: 'Delete a Grafana dashboard by UID. All panels and alerts within the dashboard are also deleted.',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Dashboard UID to delete.',
            },
          },
          required: ['uid'],
        },
      },
      // ── Folders ───────────────────────────────────────────────────────────
      {
        name: 'list_folders',
        description: 'List all dashboard folders in Grafana. Returns folder UIDs, titles, and IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of folders to return (default: 100).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
          },
        },
      },
      {
        name: 'create_folder',
        description: 'Create a new folder in Grafana for organizing dashboards.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Display name for the new folder.',
            },
            uid: {
              type: 'string',
              description: 'Optional custom UID for the folder (auto-generated if omitted).',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_folder',
        description: 'Get details for a specific Grafana folder by its UID, including dashboard count and permissions.',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Folder UID.',
            },
          },
          required: ['uid'],
        },
      },
      // ── Datasources ───────────────────────────────────────────────────────
      {
        name: 'list_datasources',
        description: 'List all datasources configured in Grafana, including type, UID, URL, and default flag.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_datasource',
        description: 'Get detailed configuration for a specific Grafana datasource by its numeric ID or UID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Datasource numeric ID or UID string.',
            },
          },
          required: ['id'],
        },
      },
      // ── Alert Rules ───────────────────────────────────────────────────────
      {
        name: 'list_alert_rules',
        description: 'List Grafana Unified Alerting rules via the provisioning API. Filter by folder UID or rule group name.',
        inputSchema: {
          type: 'object',
          properties: {
            folder_uid: {
              type: 'string',
              description: 'Filter alert rules by folder UID.',
            },
            group: {
              type: 'string',
              description: 'Filter alert rules by rule group name.',
            },
          },
        },
      },
      {
        name: 'get_alert_rule',
        description: 'Get the full configuration of a specific Grafana alert rule by its UID.',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Alert rule UID.',
            },
          },
          required: ['uid'],
        },
      },
      {
        name: 'create_alert_rule',
        description: 'Create a new Grafana Unified Alerting rule via the provisioning API. Requires full rule JSON body.',
        inputSchema: {
          type: 'object',
          properties: {
            rule: {
              type: 'object',
              description: 'Full Grafana alert rule object including title, condition, data, folderUID, and ruleGroup.',
            },
          },
          required: ['rule'],
        },
      },
      {
        name: 'update_alert_rule',
        description: 'Update an existing Grafana alert rule by UID using the provisioning API.',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Alert rule UID to update.',
            },
            rule: {
              type: 'object',
              description: 'Updated alert rule object. All fields are replaced.',
            },
          },
          required: ['uid', 'rule'],
        },
      },
      {
        name: 'delete_alert_rule',
        description: 'Delete a Grafana Unified Alerting rule by its UID via the provisioning API.',
        inputSchema: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              description: 'Alert rule UID to delete.',
            },
          },
          required: ['uid'],
        },
      },
      // ── Contact Points ────────────────────────────────────────────────────
      {
        name: 'list_contact_points',
        description: 'List all Grafana Unified Alerting contact points (notification channels: email, Slack, PagerDuty, webhook, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter contact points by name (optional).',
            },
          },
        },
      },
      // ── Silences ──────────────────────────────────────────────────────────
      {
        name: 'list_silences',
        description: 'List Grafana Unified Alerting silences. Silences suppress alert notifications without stopping alert evaluation.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter silences by label matcher (optional).',
            },
          },
        },
      },
      {
        name: 'create_silence',
        description: 'Create a new Grafana alerting silence to suppress notifications matching specific label matchers for a time range.',
        inputSchema: {
          type: 'object',
          properties: {
            matchers: {
              type: 'array',
              description: 'Array of label matchers: [{ name, value, isEqual, isRegex }].',
              items: { type: 'object' },
            },
            starts_at: {
              type: 'string',
              description: 'ISO 8601 start time for the silence.',
            },
            ends_at: {
              type: 'string',
              description: 'ISO 8601 end time for the silence.',
            },
            comment: {
              type: 'string',
              description: 'Human-readable reason for the silence.',
            },
            created_by: {
              type: 'string',
              description: "Creator name or identifier (default: 'epic-ai').",
            },
          },
          required: ['matchers', 'starts_at', 'ends_at', 'comment'],
        },
      },
      // ── Annotations ───────────────────────────────────────────────────────
      {
        name: 'list_annotations',
        description: 'List Grafana annotations, optionally filtered by dashboard UID, time range, or tags.',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard_uid: {
              type: 'string',
              description: 'Filter annotations scoped to a specific dashboard UID.',
            },
            from: {
              type: 'number',
              description: 'Start of time range as Unix timestamp in milliseconds.',
            },
            to: {
              type: 'number',
              description: 'End of time range as Unix timestamp in milliseconds.',
            },
            tags: {
              type: 'array',
              description: 'Filter by tags; returns annotations that have ALL specified tags.',
              items: { type: 'string' },
            },
            limit: {
              type: 'number',
              description: 'Maximum number of annotations to return (default: 100).',
            },
          },
        },
      },
      {
        name: 'create_annotation',
        description: 'Create a Grafana annotation to mark a point or range in time on dashboards. Optionally scope to a specific dashboard and panel.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Annotation text/description.',
            },
            tags: {
              type: 'array',
              description: 'Array of tag strings to attach to the annotation.',
              items: { type: 'string' },
            },
            time: {
              type: 'number',
              description: 'Unix timestamp in milliseconds for the annotation (default: now).',
            },
            time_end: {
              type: 'number',
              description: 'Unix timestamp in milliseconds for end of a range annotation (optional).',
            },
            dashboard_uid: {
              type: 'string',
              description: 'Dashboard UID to scope the annotation to a specific dashboard.',
            },
            panel_id: {
              type: 'number',
              description: 'Panel ID within the dashboard to scope the annotation.',
            },
          },
          required: ['text'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_dashboards':
          return await this.searchDashboards(args);
        case 'get_dashboard':
          return await this.getDashboard(args);
        case 'create_or_update_dashboard':
          return await this.createOrUpdateDashboard(args);
        case 'delete_dashboard':
          return await this.deleteDashboard(args);
        case 'list_folders':
          return await this.listFolders(args);
        case 'create_folder':
          return await this.createFolder(args);
        case 'get_folder':
          return await this.getFolder(args);
        case 'list_datasources':
          return await this.listDatasources();
        case 'get_datasource':
          return await this.getDatasource(args);
        case 'list_alert_rules':
          return await this.listAlertRules(args);
        case 'get_alert_rule':
          return await this.getAlertRule(args);
        case 'create_alert_rule':
          return await this.createAlertRule(args);
        case 'update_alert_rule':
          return await this.updateAlertRule(args);
        case 'delete_alert_rule':
          return await this.deleteAlertRule(args);
        case 'list_contact_points':
          return await this.listContactPoints(args);
        case 'list_silences':
          return await this.listSilences(args);
        case 'create_silence':
          return await this.createSilence(args);
        case 'list_annotations':
          return await this.listAnnotations(args);
        case 'create_annotation':
          return await this.createAnnotation(args);
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
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async searchDashboards(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('query', args.query as string);
    if (args.tag) params.set('tag', args.tag as string);
    if (args.type) params.set('type', args.type as string);
    if (args.folder_uid) params.set('folderUIDs', args.folder_uid as string);
    params.set('limit', String((args.limit as number) ?? 100));
    params.set('page', String((args.page as number) ?? 1));

    const response = await this.fetchWithRetry(`${this.baseUrl}/search?${params}`, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/dashboards/uid/${encodeURIComponent(args.uid as string)}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createOrUpdateDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      dashboard: args.dashboard,
      overwrite: args.overwrite ?? false,
    };
    if (args.folder_uid) body.folderUid = args.folder_uid;
    if (args.message) body.message = args.message;

    const response = await this.fetchWithRetry(`${this.baseUrl}/dashboards/db`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async deleteDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/dashboards/uid/${encodeURIComponent(args.uid as string)}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listFolders(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 100));
    params.set('page', String((args.page as number) ?? 1));

    const response = await this.fetchWithRetry(`${this.baseUrl}/folders?${params}`, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async createFolder(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { title: args.title };
    if (args.uid) body.uid = args.uid;

    const response = await this.fetchWithRetry(`${this.baseUrl}/folders`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getFolder(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/folders/${encodeURIComponent(args.uid as string)}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listDatasources(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/datasources`, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getDatasource(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/datasources/uid/${encodeURIComponent(args.id as string)}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      // Fall back to numeric ID path
      const response2 = await this.fetchWithRetry(`${this.baseUrl}/datasources/${encodeURIComponent(args.id as string)}`, {
        headers: this.authHeaders,
      });
      if (!response2.ok) {
        return { content: [{ type: 'text', text: `API error: ${response2.status} ${response2.statusText}` }], isError: true };
      }
      const data2 = await response2.json();
      return { content: [{ type: 'text', text: JSON.stringify(data2, null, 2) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listAlertRules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.folder_uid) params.set('folderUID', args.folder_uid as string);
    if (args.group) params.set('group', args.group as string);
    const qs = params.toString() ? `?${params}` : '';

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/provisioning/alert-rules${qs}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getAlertRule(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/provisioning/alert-rules/${encodeURIComponent(args.uid as string)}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async createAlertRule(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/provisioning/alert-rules`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(args.rule),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async updateAlertRule(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/provisioning/alert-rules/${encodeURIComponent(args.uid as string)}`, {
      method: 'PUT',
      headers: this.authHeaders,
      body: JSON.stringify(args.rule),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async deleteAlertRule(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/provisioning/alert-rules/${encodeURIComponent(args.uid as string)}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, uid: args.uid }) }], isError: false };
  }

  private async listContactPoints(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.name) params.set('name', args.name as string);
    const qs = params.toString() ? `?${params}` : '';

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/provisioning/contact-points${qs}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listSilences(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', args.filter as string);
    const qs = params.toString() ? `?${params}` : '';

    const response = await this.fetchWithRetry(`${this.baseUrl}/alertmanager/grafana/api/v2/silences${qs}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createSilence(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      matchers: args.matchers,
      startsAt: args.starts_at,
      endsAt: args.ends_at,
      comment: args.comment,
      createdBy: (args.created_by as string) ?? 'epic-ai',
    };

    const response = await this.fetchWithRetry(`${this.baseUrl}/alertmanager/grafana/api/v2/silences`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listAnnotations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.dashboard_uid) params.set('dashboardUID', args.dashboard_uid as string);
    if (args.from) params.set('from', String(args.from));
    if (args.to) params.set('to', String(args.to));
    if (args.tags) {
      for (const tag of args.tags as string[]) {
        params.append('tags', tag);
      }
    }
    params.set('limit', String((args.limit as number) ?? 100));

    const response = await this.fetchWithRetry(`${this.baseUrl}/annotations?${params}`, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createAnnotation(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      text: args.text,
      time: (args.time as number) ?? Date.now(),
    };
    if (args.tags) body.tags = args.tags;
    if (args.time_end) body.timeEnd = args.time_end;
    if (args.dashboard_uid) body.dashboardUID = args.dashboard_uid;
    if (args.panel_id) body.panelId = args.panel_id;

    const response = await this.fetchWithRetry(`${this.baseUrl}/annotations`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
