/**
 * Coralogix MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://coralogix.com/docs/user-guides/mcp-server/overview/ — transport: streamable-HTTP, auth: Bearer API key
// Vendor MCP launched July 2025. Covers: get_logs, get_traces, metrics__instant_query, metrics__range_query,
//   metrics__label_names, metrics__label_values, rum__* (RUM tools), read_dataprime_intro_docs, get_schemas (~9+ tools).
//   MCP is query/observability data-plane only — no alert management, dashboard management, enrichments, SLOs, or webhooks.
// Our adapter covers: 18 tools (management plane). Vendor MCP covers: ~9 tools (query/data plane).
// Recommendation: use-both — MCP and REST API have non-overlapping tool sets requiring both for full coverage.
//   MCP-sourced tools: get_logs, get_traces, metrics queries, RUM queries, read_dataprime_intro_docs, get_schemas.
//   REST-sourced tools (this adapter): query_logs, search_archive, list_alerts, get_alert, create_alert, update_alert,
//     delete_alert, enable_alert, disable_alert, list_dashboards, get_dashboard, list_enrichments, get_enrichment,
//     create_enrichment, delete_enrichment, list_slos, get_slo, list_webhooks.
//   Combined coverage: 18 REST tools + ~9 MCP tools = ~27 tools total (no functional overlap).
//
// Base URL: region-dependent (see REGION_BASE_URLS below)
//   Download the OpenAPI spec: https://api.coralogix.com/mgmt/openapi/latest/openapi.yaml
// Auth: Bearer token — Authorization: Bearer <API_KEY> (personal or team API key)
// Docs: https://coralogix.com/docs/developer-portal/apis/getting-started/getting-started-with-coralogix-apis/
// Rate limits: Not publicly documented; standard cloud API throttling applies

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

/**
 * Coralogix region identifiers mapped to their REST API base URLs.
 * Source: https://coralogix.com/docs/integrations/coralogix-endpoints/
 *
 * Region  Coralogix Domain         AWS Region                    API Base URL
 * ------  -----------------------  ----------------------------  ------------------------------------
 * us1     us1.coralogix.com        us-east-2  (Ohio)             https://api.coralogix.us
 * us2     us2.coralogix.com        us-west-2  (Oregon)           https://api.cx498.coralogix.com
 * eu1     eu1.coralogix.com        eu-west-1  (Ireland)          https://api.coralogix.com
 * eu2     eu2.coralogix.com        eu-north-1 (Stockholm)        https://api.eu2.coralogix.com
 * ap1     ap1.coralogix.com        ap-south-1 (Mumbai)           https://api.coralogix.in
 * ap2     ap2.coralogix.com        ap-southeast-1 (Singapore)    https://api.coralogixsg.com
 * ap3     ap3.coralogix.com        ap-southeast-3 (Jakarta)      https://api.ap3.coralogix.com
 */
const REGION_BASE_URLS: Record<string, string> = {
  us1: 'https://api.coralogix.us',
  us2: 'https://api.cx498.coralogix.com',
  eu1: 'https://api.coralogix.com',
  eu2: 'https://api.eu2.coralogix.com',
  ap1: 'https://api.coralogix.in',
  ap2: 'https://api.coralogixsg.com',
  ap3: 'https://api.ap3.coralogix.com',
};

type CoralogixRegion = 'us1' | 'us2' | 'eu1' | 'eu2' | 'ap1' | 'ap2' | 'ap3';

interface CoralogixConfig {
  apiKey: string;
  /** Coralogix region. Defaults to 'eu1' (EU West, Ireland). */
  region?: CoralogixRegion;
  /** Override base URL directly (for private link or proxy deployments). */
  baseUrl?: string;
}

export class CoralogixMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CoralogixConfig) {
    super();
    this.apiKey = config.apiKey;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/$/, '');
    } else {
      const region = config.region ?? 'eu1';
      const resolved = REGION_BASE_URLS[region];
      if (!resolved) {
        throw new Error(`Unknown Coralogix region: "${region}". Valid regions: ${Object.keys(REGION_BASE_URLS).join(', ')}`);
      }
      this.baseUrl = resolved;
    }
  }

  static catalog() {
    return {
      name: 'coralogix',
      displayName: 'Coralogix',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: ['coralogix', 'logs', 'observability', 'alerts', 'dataprime', 'dashboard', 'enrichment', 'slo', 'archive', 'monitoring'],
      toolNames: [
        'query_logs', 'search_archive',
        'list_alerts', 'get_alert', 'create_alert', 'update_alert', 'delete_alert', 'enable_alert', 'disable_alert',
        'list_dashboards', 'get_dashboard',
        'list_enrichments', 'get_enrichment', 'create_enrichment', 'delete_enrichment',
        'list_slos', 'get_slo',
        'list_webhooks',
      ],
      description: 'Coralogix observability: query logs with DataPrime, manage alerts (v3), dashboards, custom enrichments, SLOs, and outbound webhooks.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_logs',
        description: 'Query logs using Coralogix DataPrime or Lucene syntax with time range, application, and subsystem filters.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'DataPrime or Lucene query expression (e.g. "source logs | filter $l.severity == ERROR", or "kubernetes.pod_name:my-pod")',
            },
            startDate: {
              type: 'string',
              description: 'Start of time range (ISO 8601, e.g. 2026-03-01T00:00:00Z)',
            },
            endDate: {
              type: 'string',
              description: 'End of time range (ISO 8601, e.g. 2026-03-01T01:00:00Z)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of log entries to return (default: 100)',
            },
            applicationName: {
              type: 'string',
              description: 'Filter by application name (e.g. production)',
            },
            subsystemName: {
              type: 'string',
              description: 'Filter by subsystem name (e.g. payment-service)',
            },
          },
          required: ['query', 'startDate', 'endDate'],
        },
      },
      {
        name: 'search_archive',
        description: 'Search cold/archive log storage for historical data beyond the hot tier retention window using DataPrime or Lucene.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'DataPrime or Lucene query expression',
            },
            startDate: {
              type: 'string',
              description: 'Start of archive search range (ISO 8601)',
            },
            endDate: {
              type: 'string',
              description: 'End of archive search range (ISO 8601)',
            },
            applicationName: {
              type: 'string',
              description: 'Filter by application name',
            },
            subsystemName: {
              type: 'string',
              description: 'Filter by subsystem name',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
            },
          },
          required: ['query', 'startDate', 'endDate'],
        },
      },
      {
        name: 'list_alerts',
        description: 'List all alert definitions in the Coralogix account with optional severity and active status filters.',
        inputSchema: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              description: 'Filter by severity: info_or_unspecified, warning, critical (default: all)',
            },
            is_active: {
              type: 'boolean',
              description: 'Filter by active status — true for active, false for inactive',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Retrieve the full definition and configuration of a single Coralogix alert by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Alert unique identifier',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'create_alert',
        description: 'Create a new Coralogix alert definition with name, severity, condition, and notification settings.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Alert name',
            },
            description: {
              type: 'string',
              description: 'Human-readable alert description',
            },
            severity: {
              type: 'string',
              description: 'Alert severity: info_or_unspecified, warning, or critical',
            },
            is_active: {
              type: 'boolean',
              description: 'Whether the alert is active on creation (default: true)',
            },
            condition: {
              type: 'object',
              description: 'Alert condition object per Coralogix v3 alert schema (e.g. { "logsImmediateCondition": {} })',
            },
            notification_group: {
              type: 'object',
              description: 'Optional notification group with webhook and routing settings',
            },
          },
          required: ['name', 'severity', 'condition'],
        },
      },
      {
        name: 'update_alert',
        description: 'Replace (full update) a Coralogix alert definition by ID with new configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Alert unique identifier to update',
            },
            name: {
              type: 'string',
              description: 'New alert name',
            },
            description: {
              type: 'string',
              description: 'New alert description',
            },
            severity: {
              type: 'string',
              description: 'Alert severity: info_or_unspecified, warning, or critical',
            },
            is_active: {
              type: 'boolean',
              description: 'Whether the alert should be active',
            },
            condition: {
              type: 'object',
              description: 'Alert condition object per Coralogix v3 alert schema',
            },
          },
          required: ['alert_id', 'name', 'severity', 'condition'],
        },
      },
      {
        name: 'delete_alert',
        description: 'Permanently delete a Coralogix alert definition by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Alert unique identifier to delete',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'enable_alert',
        description: 'Enable a disabled Coralogix alert by ID, activating its monitoring and notifications.',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Alert unique identifier to enable',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'disable_alert',
        description: 'Disable a Coralogix alert by ID, suspending monitoring without deleting the definition.',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Alert unique identifier to disable',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'list_dashboards',
        description: 'List all custom dashboards in the Coralogix account with optional folder filter.',
        inputSchema: {
          type: 'object',
          properties: {
            folder: {
              type: 'string',
              description: 'Filter dashboards by folder name',
            },
          },
        },
      },
      {
        name: 'get_dashboard',
        description: 'Get the full definition of a specific Coralogix custom dashboard by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard_id: {
              type: 'string',
              description: 'Dashboard unique identifier',
            },
          },
          required: ['dashboard_id'],
        },
      },
      {
        name: 'list_enrichments',
        description: 'List all custom enrichment tables configured in the Coralogix account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_enrichment',
        description: 'Get details of a specific custom enrichment table by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            enrichment_id: {
              type: 'number',
              description: 'Custom enrichment ID (numeric)',
            },
          },
          required: ['enrichment_id'],
        },
      },
      {
        name: 'create_enrichment',
        description: 'Create a new custom enrichment table in Coralogix from a CSV or JSON lookup file uploaded as base64.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Enrichment table name',
            },
            description: {
              type: 'string',
              description: 'Description of the enrichment table',
            },
            file_content: {
              type: 'string',
              description: 'Base64-encoded CSV or JSON content for the enrichment lookup table',
            },
            file_name: {
              type: 'string',
              description: 'Filename for the enrichment data (e.g. ip_lookup.csv)',
            },
          },
          required: ['name', 'file_content', 'file_name'],
        },
      },
      {
        name: 'delete_enrichment',
        description: 'Delete a custom enrichment table from Coralogix by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            enrichment_id: {
              type: 'number',
              description: 'Custom enrichment ID to delete (numeric)',
            },
          },
          required: ['enrichment_id'],
        },
      },
      {
        name: 'list_slos',
        description: 'List all Service Level Objectives (SLOs) configured in the Coralogix account.',
        inputSchema: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'Filter SLOs by service name',
            },
          },
        },
      },
      {
        name: 'get_slo',
        description: 'Get the definition and current status of a specific Coralogix SLO by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            slo_id: {
              type: 'string',
              description: 'SLO unique identifier',
            },
          },
          required: ['slo_id'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all outbound webhook integrations configured in Coralogix for alert notifications.',
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
        case 'query_logs':
          return this.queryLogs(args);
        case 'search_archive':
          return this.searchArchive(args);
        case 'list_alerts':
          return this.listAlerts(args);
        case 'get_alert':
          return this.getAlert(args);
        case 'create_alert':
          return this.createAlert(args);
        case 'update_alert':
          return this.updateAlert(args);
        case 'delete_alert':
          return this.deleteAlert(args);
        case 'enable_alert':
          return this.setAlertActive(args, true);
        case 'disable_alert':
          return this.setAlertActive(args, false);
        case 'list_dashboards':
          return this.listDashboards(args);
        case 'get_dashboard':
          return this.getDashboard(args);
        case 'list_enrichments':
          return this.listEnrichments();
        case 'get_enrichment':
          return this.getEnrichment(args);
        case 'create_enrichment':
          return this.createEnrichment(args);
        case 'delete_enrichment':
          return this.deleteEnrichment(args);
        case 'list_slos':
          return this.listSlos(args);
        case 'get_slo':
          return this.getSlo(args);
        case 'list_webhooks':
          return this.listWebhooks();
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(url: string, init: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Coralogix returned non-JSON response (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async queryLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      query: args.query,
      metadata: {
        startDate: args.startDate,
        endDate: args.endDate,
        ...(args.limit !== undefined ? { limit: args.limit } : {}),
        ...(args.applicationName ? { applicationName: [args.applicationName] } : {}),
        ...(args.subsystemName ? { subsystemName: [args.subsystemName] } : {}),
      },
    };
    return this.fetchJson(`${this.baseUrl}/api/v1/dataprime/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
  }

  private async searchArchive(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      query: args.query,
      metadata: {
        startDate: args.startDate,
        endDate: args.endDate,
        ...(args.applicationName ? { applicationName: [args.applicationName] } : {}),
        ...(args.subsystemName ? { subsystemName: [args.subsystemName] } : {}),
        ...(args.limit !== undefined ? { limit: args.limit } : {}),
      },
    };
    return this.fetchJson(`${this.baseUrl}/api/v1/dataprime/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const result = await this.fetchJson(`${this.baseUrl}/api/v3/alert-defs`, {
      method: 'GET',
      headers: this.headers,
    });
    if (result.isError) return result;
    // Apply client-side filters since the v3 endpoint returns all alerts
    try {
      const parsed = JSON.parse(result.content[0].text) as { alertDefs?: Array<Record<string, unknown>> };
      let alerts = parsed.alertDefs ?? [];
      if (args.severity) {
        alerts = alerts.filter((a) => String(a['severity']).toLowerCase() === String(args.severity).toLowerCase());
      }
      if (args.is_active !== undefined) {
        alerts = alerts.filter((a) => Boolean(a['isActive']) === Boolean(args.is_active));
      }
      return {
        content: [{ type: 'text', text: this.truncate(JSON.stringify({ alertDefs: alerts, total: alerts.length }, null, 2)) }],
        isError: false,
      };
    } catch {
      return result;
    }
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const alertId = args.alert_id as string;
    if (!alertId) {
      return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/api/v3/alert-defs/${encodeURIComponent(alertId)}`, {
      method: 'GET',
      headers: this.headers,
    });
  }

  private async createAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.severity || !args.condition) {
      return { content: [{ type: 'text', text: 'name, severity, and condition are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      severity: args.severity,
      isActive: args.is_active !== false,
      condition: args.condition,
    };
    if (args.description) body.description = args.description;
    if (args.notification_group) body.notificationGroup = args.notification_group;
    return this.fetchJson(`${this.baseUrl}/api/v3/alert-defs`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
  }

  private async updateAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const alertId = args.alert_id as string;
    if (!alertId || !args.name || !args.severity || !args.condition) {
      return { content: [{ type: 'text', text: 'alert_id, name, severity, and condition are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      severity: args.severity,
      condition: args.condition,
    };
    if (args.description) body.description = args.description;
    if (args.is_active !== undefined) body.isActive = args.is_active;
    return this.fetchJson(`${this.baseUrl}/api/v3/alert-defs/${encodeURIComponent(alertId)}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
  }

  private async deleteAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const alertId = args.alert_id as string;
    if (!alertId) {
      return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v3/alert-defs/${encodeURIComponent(alertId)}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, alert_id: alertId }) }], isError: false };
  }

  private async setAlertActive(args: Record<string, unknown>, isActive: boolean): Promise<ToolResult> {
    const alertId = args.alert_id as string;
    if (!alertId) {
      return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/api/v3/alert-defs/${encodeURIComponent(alertId)}/${isActive ? 'enable' : 'disable'}`, {
      method: 'POST',
      headers: this.headers,
      body: '{}',
    });
  }

  private async listDashboards(args: Record<string, unknown>): Promise<ToolResult> {
    const result = await this.fetchJson(`${this.baseUrl}/api/v1/external/dashboards`, {
      method: 'GET',
      headers: this.headers,
    });
    if (result.isError) return result;
    if (args.folder) {
      try {
        const parsed = JSON.parse(result.content[0].text) as { dashboards?: Array<Record<string, unknown>> };
        const filtered = (parsed.dashboards ?? []).filter(
          (d) => String(d['folder']).toLowerCase() === String(args.folder).toLowerCase(),
        );
        return {
          content: [{ type: 'text', text: this.truncate(JSON.stringify({ dashboards: filtered }, null, 2)) }],
          isError: false,
        };
      } catch {
        return result;
      }
    }
    return result;
  }

  private async getDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const dashboardId = args.dashboard_id as string;
    if (!dashboardId) {
      return { content: [{ type: 'text', text: 'dashboard_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/api/v1/external/dashboards/${encodeURIComponent(dashboardId)}`, {
      method: 'GET',
      headers: this.headers,
    });
  }

  private async listEnrichments(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/api/v1/external/custom-enrichments`, {
      method: 'GET',
      headers: this.headers,
    });
  }

  private async getEnrichment(args: Record<string, unknown>): Promise<ToolResult> {
    const enrichmentId = args.enrichment_id as number;
    if (enrichmentId === undefined) {
      return { content: [{ type: 'text', text: 'enrichment_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/api/v1/external/custom-enrichments/${enrichmentId}`, {
      method: 'GET',
      headers: this.headers,
    });
  }

  private async createEnrichment(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    const fileContent = args.file_content as string;
    const fileName = args.file_name as string;
    if (!name || !fileContent || !fileName) {
      return { content: [{ type: 'text', text: 'name, file_content, and file_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name,
      file: { content: fileContent, name: fileName },
    };
    if (args.description) body.description = args.description;
    return this.fetchJson(`${this.baseUrl}/api/v1/external/custom-enrichments`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
  }

  private async deleteEnrichment(args: Record<string, unknown>): Promise<ToolResult> {
    const enrichmentId = args.enrichment_id as number;
    if (enrichmentId === undefined) {
      return { content: [{ type: 'text', text: 'enrichment_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v1/external/custom-enrichments/${enrichmentId}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, enrichment_id: enrichmentId }) }], isError: false };
  }

  private async listSlos(args: Record<string, unknown>): Promise<ToolResult> {
    const result = await this.fetchJson(`${this.baseUrl}/api/v1/slos`, {
      method: 'GET',
      headers: this.headers,
    });
    if (result.isError) return result;
    if (args.service_name) {
      try {
        const parsed = JSON.parse(result.content[0].text) as { SLOs?: Array<Record<string, unknown>> };
        const filtered = (parsed.SLOs ?? []).filter(
          (s) => String(s['serviceName']).toLowerCase() === String(args.service_name).toLowerCase(),
        );
        return {
          content: [{ type: 'text', text: this.truncate(JSON.stringify({ SLOs: filtered }, null, 2)) }],
          isError: false,
        };
      } catch {
        return result;
      }
    }
    return result;
  }

  private async getSlo(args: Record<string, unknown>): Promise<ToolResult> {
    const sloId = args.slo_id as string;
    if (!sloId) {
      return { content: [{ type: 'text', text: 'slo_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/api/v1/slos/${encodeURIComponent(sloId)}`, {
      method: 'GET',
      headers: this.headers,
    });
  }

  private async listWebhooks(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/api/v1/external/integrations`, {
      method: 'GET',
      headers: this.headers,
    });
  }
}
