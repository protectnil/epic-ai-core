/**
 * Panther Labs MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/panther-labs/mcp-panther — transport: stdio, auth: X-API-Key
// Our adapter covers: 17 tools (REST API operations). Vendor MCP covers: 40+ tools (alerts,
// detections, queries via GraphQL, schemas, metrics, users).
// Recommendation: use-both — MCP exposes GraphQL-backed tools (query_data_lake, get_table_schema,
// list_databases, list_database_tables, rule metrics, severity metrics) not available in REST API.
// REST adapter covers saved-query CRUD, log-source management, and policy management not in MCP.
//
// Integration: use-both
// MCP-sourced tools: query_data_lake, get_table_schema, list_databases, list_database_tables,
//   get_rule_alert_metrics, get_severity_alert_metrics, get_bytes_processed_metrics
// REST-sourced tools (this adapter): list_alerts, get_alert, update_alert_status,
//   bulk_update_alert_status, list_detections, get_detection, enable_detection, disable_detection,
//   list_log_sources, get_log_source, list_saved_queries, get_saved_query, list_users, get_user,
//   list_schemas, get_schema
// Combined coverage: 23+ tools (MCP: 40+ + REST: 17 - shared: varies)
//
// NOTE: The REST API base URL already includes /v1 (e.g. https://api.{tenant}.runpanther.net/v1).
// All paths in this adapter are relative to that base — do NOT include /v1 in paths.
//
// Base URL: https://api.{YOUR_PANTHER_DOMAIN}.runpanther.net/v1 (SaaS)
//           For self-hosted: https://{your-panther-host}/v1
// Auth: X-API-Key header. Generate token in Panther Console: gear icon → API Tokens.
// Docs: https://docs.panther.com/panther-developer-workflows/api/rest
// Rate limits: Not publicly documented; Panther applies per-tenant limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';
import type { AdapterCatalogEntry } from '../federation/AdapterCatalog.js';

interface PantherConfig {
  apiToken: string;
  baseUrl: string;  // Required — customer-specific Panther domain; no universal default
}

export class PantherMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: PantherConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog(): AdapterCatalogEntry {
    return {
      name: 'panther',
      displayName: 'Panther',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'panther', 'siem', 'soc', 'alert', 'detection', 'rule', 'log',
        'query', 'data-lake', 'sql', 'threat', 'hunting', 'compliance',
        'log-source', 'cloud-security', 'triage', 'investigation',
      ],
      toolNames: [
        'list_alerts', 'get_alert', 'update_alert_status', 'bulk_update_alert_status',
        'list_detections', 'get_detection', 'enable_detection', 'disable_detection',
        'list_log_sources', 'get_log_source',
        'list_saved_queries', 'get_saved_query',
        'list_users', 'get_user',
        'list_schemas', 'get_schema',
      ],
      description: 'Cloud SIEM: triage and update alerts, manage detection rules, manage saved SQL queries, and manage log sources, users, and schemas.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List Panther alerts with optional filters for status, severity, rule ID, and creation time window.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'array',
              description: 'Filter by alert status array: OPEN, TRIAGED, CLOSED, RESOLVED',
            },
            severity: {
              type: 'array',
              description: 'Filter by severity array: CRITICAL, HIGH, MEDIUM, LOW, INFO',
            },
            rule_id: {
              type: 'string',
              description: 'Filter alerts by the detection rule ID that triggered them',
            },
            created_at_after: {
              type: 'string',
              description: 'Return alerts created after this ISO 8601 timestamp',
            },
            created_at_before: {
              type: 'string',
              description: 'Return alerts created before this ISO 8601 timestamp',
            },
            page_size: {
              type: 'number',
              description: 'Number of alerts per page (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response nextCursor field',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Retrieve full details for a specific Panther alert by ID including events, rule metadata, and assignee.',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Panther alert ID',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'update_alert_status',
        description: 'Update the status, assignee, quality, or context tags of a single Panther alert.',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Panther alert ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: OPEN, TRIAGED, CLOSED, or RESOLVED',
            },
            assignee: {
              type: 'string',
              description: 'User ID to assign the alert to (optional)',
            },
            quality: {
              type: 'string',
              description: 'Alert quality classification: NOISE, FALSE_POSITIVE, or TRUE_POSITIVE (optional)',
            },
          },
          required: ['alert_id', 'status'],
        },
      },
      {
        name: 'bulk_update_alert_status',
        description: 'Update the status of multiple Panther alerts at once by alert ID array.',
        inputSchema: {
          type: 'object',
          properties: {
            alert_ids: {
              type: 'array',
              description: 'Array of Panther alert IDs to update',
            },
            status: {
              type: 'string',
              description: 'New status for all specified alerts: OPEN, TRIAGED, CLOSED, or RESOLVED',
            },
          },
          required: ['alert_ids', 'status'],
        },
      },
      {
        name: 'list_detections',
        description: 'List Panther detection rules with optional filters for enabled state, severity, and name substring.',
        inputSchema: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Filter by enabled (true) or disabled (false) state',
            },
            severity: {
              type: 'array',
              description: 'Filter by severity array: CRITICAL, HIGH, MEDIUM, LOW, INFO',
            },
            name_contains: {
              type: 'string',
              description: 'Filter rules whose name contains this string (case-insensitive)',
            },
            page_size: {
              type: 'number',
              description: 'Number of detections per page (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_detection',
        description: 'Get full details for a specific Panther detection rule by ID including Python body and tests.',
        inputSchema: {
          type: 'object',
          properties: {
            detection_id: {
              type: 'string',
              description: 'Panther detection rule ID',
            },
          },
          required: ['detection_id'],
        },
      },
      {
        name: 'enable_detection',
        description: 'Enable a disabled Panther detection rule so it starts generating alerts.',
        inputSchema: {
          type: 'object',
          properties: {
            detection_id: {
              type: 'string',
              description: 'Panther detection rule ID to enable',
            },
          },
          required: ['detection_id'],
        },
      },
      {
        name: 'disable_detection',
        description: 'Disable an active Panther detection rule to stop it from generating alerts.',
        inputSchema: {
          type: 'object',
          properties: {
            detection_id: {
              type: 'string',
              description: 'Panther detection rule ID to disable',
            },
          },
          required: ['detection_id'],
        },
      },
      {
        name: 'list_log_sources',
        description: 'List configured log sources in Panther with pagination support.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of log sources per page (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_log_source',
        description: 'Get details for a specific Panther log source by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            log_source_id: {
              type: 'string',
              description: 'Panther log source ID',
            },
          },
          required: ['log_source_id'],
        },
      },
      {
        name: 'list_saved_queries',
        description: 'List saved SQL queries (scheduled queries) in Panther with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of saved queries per page (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_saved_query',
        description: 'Get a specific saved/scheduled Panther data lake query by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            query_id: {
              type: 'string',
              description: 'Panther saved query ID',
            },
          },
          required: ['query_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List Panther users in the organization with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of users per page (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details for a specific Panther user by ID including role and permissions.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Panther user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_schemas',
        description: 'List log schemas configured in Panther for use in detection rules and queries.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of schemas per page (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_schema',
        description: 'Get the full field definition for a specific Panther log schema by name.',
        inputSchema: {
          type: 'object',
          properties: {
            schema_name: {
              type: 'string',
              description: 'Panther schema name (e.g. AWS.CloudTrail, Custom.MySchema)',
            },
          },
          required: ['schema_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_alerts':
          return await this.listAlerts(args);
        case 'get_alert':
          return await this.getAlert(args);
        case 'update_alert_status':
          return await this.updateAlertStatus(args);
        case 'bulk_update_alert_status':
          return await this.bulkUpdateAlertStatus(args);
        case 'list_detections':
          return await this.listDetections(args);
        case 'get_detection':
          return await this.getDetection(args);
        case 'enable_detection':
          return await this.setDetectionEnabled(args.detection_id as string, true);
        case 'disable_detection':
          return await this.setDetectionEnabled(args.detection_id as string, false);
        case 'list_log_sources':
          return await this.listLogSources(args);
        case 'get_log_source':
          return await this.getLogSource(args);
        case 'list_saved_queries':
          return await this.listSavedQueries(args);
        case 'get_saved_query':
          return await this.getSavedQuery(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'list_schemas':
          return await this.listSchemas(args);
        case 'get_schema':
          return await this.getSchema(args);
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

  // ─── Private helpers ──────────────────────────────────────────────────────

  private get reqHeaders(): Record<string, string> {
    return {
      'X-API-Key': this.apiToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchGet(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${params && params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.reqHeaders });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `Panther API error (HTTP ${response.status}): ${response.statusText}${errText ? ' — ' + errText : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchPatch(path: string, body: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers: this.reqHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `Panther API error (HTTP ${response.status}): ${response.statusText}${errText ? ' — ' + errText : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildPaginationParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.page_size) params.set('pageSize', String(args.page_size));
    if (args.cursor) params.set('cursor', args.cursor as string);
    return params;
  }

  // ─── Tool implementations ─────────────────────────────────────────────────

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    if (Array.isArray(args.status)) {
      for (const s of args.status) params.append('status', s as string);
    } else if (args.status) {
      params.set('status', args.status as string);
    }
    if (Array.isArray(args.severity)) {
      for (const s of args.severity) params.append('severity', s as string);
    } else if (args.severity) {
      params.set('severity', args.severity as string);
    }
    if (args.rule_id) params.set('ruleId', args.rule_id as string);
    if (args.created_at_after) params.set('createdAtAfter', args.created_at_after as string);
    if (args.created_at_before) params.set('createdAtBefore', args.created_at_before as string);
    return this.fetchGet('/alerts', params);
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet(`/alerts/${encodeURIComponent(args.alert_id as string)}`);
  }

  private async updateAlertStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { status: args.status };
    if (args.assignee) body.assignee = args.assignee;
    if (args.quality) body.quality = args.quality;
    return this.fetchPatch(`/alerts/${encodeURIComponent(args.alert_id as string)}`, body);
  }

  private async bulkUpdateAlertStatus(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchPatch('/alerts', {
      ids: args.alert_ids,
      status: args.status,
    });
  }

  private async listDetections(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    if (typeof args.enabled === 'boolean') params.set('enabled', String(args.enabled));
    if (Array.isArray(args.severity)) {
      for (const s of args.severity) params.append('severity', s as string);
    } else if (args.severity) {
      params.set('severity', args.severity as string);
    }
    if (args.name_contains) params.set('nameContains', args.name_contains as string);
    return this.fetchGet('/detections', params);
  }

  private async getDetection(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet(`/detections/${encodeURIComponent(args.detection_id as string)}`);
  }

  private async setDetectionEnabled(detectionId: string, enabled: boolean): Promise<ToolResult> {
    return this.fetchPatch(`/detections/${encodeURIComponent(detectionId)}`, { enabled });
  }

  private async listLogSources(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    return this.fetchGet('/log-sources', params);
  }

  private async getLogSource(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet(`/log-sources/${encodeURIComponent(args.log_source_id as string)}`);
  }

  private async listSavedQueries(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    return this.fetchGet('/queries', params);
  }

  private async getSavedQuery(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet(`/queries/${encodeURIComponent(args.query_id as string)}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    return this.fetchGet('/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async listSchemas(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    return this.fetchGet('/schemas', params);
  }

  private async getSchema(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet(`/schemas/${encodeURIComponent(args.schema_name as string)}`);
  }
}
