/**
 * Microsoft Sentinel MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://learn.microsoft.com/en-us/azure/sentinel/datalake/sentinel-mcp-overview — transport: streamable-HTTP, auth: Microsoft Entra ID
// Microsoft publishes three hosted MCP tool collections (public preview, announced 2026):
//   - Data exploration: search_tables, run_kql_query, list_sentinel_workspaces, analyze_user_entity, analyze_url_entity
//   - Triage: ListIncidents, GetIncidentById, ListAlerts, RunAdvancedHuntingQuery, GetDefenderFileInfo,
//             ListDefenderMachinesByVulnerability, ListDefenderVulnerabilitiesBySoftware (~7-10 tools)
//   - Security Copilot agent creation (separate collection)
// The MCP server is READ-ONLY and query-focused (Defender portal data lake). It does NOT expose:
//   create/update/delete incidents, manage watchlists, manage bookmarks, manage alert rules, manage entities via CRUD.
// Our adapter covers: 23 tools (full CRUD via SecurityInsights REST API — create/update/delete incidents,
//   manage watchlists + items, bookmarks, entities, alert rules). These write operations are unique to our adapter.
// Integration: use-both — MCP has data lake / Defender query tools our REST adapter lacks; our REST adapter
//   has full CRUD write operations the MCP lacks.
// MCP-sourced tools: data exploration (search_tables, run_kql_query, list_sentinel_workspaces, entity analyzers),
//   triage queries (ListIncidents read-only, GetIncidentById, ListAlerts, RunAdvancedHuntingQuery, etc.)
// REST-sourced tools: create_incident, update_incident, delete_incident, add_incident_comment,
//   create_watchlist, upsert_watchlist_item, delete_watchlist_item, create_bookmark, list_alert_rules,
//   get_alert_rule, and all remaining CRUD operations.
//
// Base URL: https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/
//            providers/Microsoft.OperationalInsights/workspaces/{workspaceName}
//            /providers/Microsoft.SecurityInsights/
// Log Analytics Query URL: https://api.loganalytics.azure.com/v1/workspaces/{workspaceId}/query
// Auth: Bearer token — Azure AD / Entra ID OAuth2 access token with Sentinel Contributor or Reader role.
//       Use Azure CLI: `az account get-access-token --resource https://management.azure.com`
// Docs: https://learn.microsoft.com/en-us/rest/api/securityinsights/
// API Version: 2024-09-01 (stable)
// Rate limits: Azure ARM throttles at 1,200 reads/hr and 1,200 writes/hr per subscription.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_NAME_RE = /^[a-zA-Z0-9_\-. ]+$/;

function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
}

interface SentinelConfig {
  subscriptionId: string;
  resourceGroup: string;
  workspaceName: string;
  /** Azure AD / Entra ID Bearer token with Sentinel role. */
  bearerToken: string;
  /** Log Analytics workspace GUID — required for run_hunting_query. If omitted, workspaceName is used. */
  workspaceId?: string;
}

export class SentinelMCPServer extends MCPAdapterBase {
  private readonly armBase: string;
  private readonly siBase: string;
  private readonly queryBase: string;
  private readonly headers: Record<string, string>;

  constructor(config: SentinelConfig) {
    super();
    if (!UUID_RE.test(config.subscriptionId)) {
      throw new Error('SentinelMCPServer: subscriptionId must be a valid UUID');
    }
    if (!SAFE_NAME_RE.test(config.resourceGroup)) {
      throw new Error('SentinelMCPServer: resourceGroup contains invalid characters');
    }
    if (!SAFE_NAME_RE.test(config.workspaceName)) {
      throw new Error('SentinelMCPServer: workspaceName contains invalid characters');
    }

    this.armBase =
      `https://management.azure.com/subscriptions/${config.subscriptionId}` +
      `/resourceGroups/${config.resourceGroup}` +
      `/providers/Microsoft.OperationalInsights/workspaces/${config.workspaceName}`;

    this.siBase = `${this.armBase}/providers/Microsoft.SecurityInsights`;

    // Log Analytics query endpoint uses workspace GUID or name
    const wsRef = config.workspaceId ?? config.workspaceName;
    this.queryBase = `https://api.loganalytics.azure.com/v1/workspaces/${encodeURIComponent(wsRef)}/query`;

    this.headers = {
      Authorization: `Bearer ${config.bearerToken}`,
      'Content-Type': 'application/json',
    };
  }

  private withApiVersion(url: string, version = '2024-09-01'): string {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}api-version=${version}`;
  }

  static catalog() {
    return {
      name: 'sentinel',
      displayName: 'Microsoft Sentinel',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'sentinel', 'microsoft sentinel', 'azure sentinel', 'SIEM', 'SOAR',
        'incident', 'alert', 'KQL', 'hunting', 'watchlist', 'bookmark',
        'analytic rule', 'threat intelligence', 'entity', 'SecurityInsights',
        'Log Analytics',
      ],
      toolNames: [
        'list_incidents', 'get_incident', 'create_incident', 'update_incident', 'delete_incident',
        'list_incident_alerts', 'list_incident_entities', 'list_incident_comments', 'add_incident_comment',
        'list_alert_rules', 'get_alert_rule',
        'run_hunting_query',
        'list_watchlists', 'get_watchlist', 'create_watchlist',
        'list_watchlist_items', 'upsert_watchlist_item', 'delete_watchlist_item',
        'list_bookmarks', 'get_bookmark', 'create_bookmark',
        'list_entities', 'get_entity',
      ],
      description:
        'Manage Microsoft Sentinel incidents, alerts, analytic rules, watchlists, bookmarks, and entities. ' +
        'Execute KQL hunting queries against Log Analytics. Full SecurityInsights REST API coverage.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_incidents',
        description:
          'List Microsoft Sentinel incidents with optional OData filter, sort, and result limit.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description:
                "OData $filter expression, e.g. \"properties/status eq 'New'\" or \"properties/severity eq 'High'\"",
            },
            orderby: {
              type: 'string',
              description:
                "OData $orderby expression, e.g. \"properties/createdTimeUtc desc\"",
            },
            top: {
              type: 'number',
              description: 'Maximum number of incidents to return (default: 50)',
            },
            skip_token: {
              type: 'string',
              description: 'Pagination skip token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_incident',
        description:
          'Get full details, severity, status, and assignment for a specific Sentinel incident by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The Sentinel incident ID (GUID or name)',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'create_incident',
        description:
          'Create a new Sentinel incident with title, severity, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description:
                'GUID for the new incident. If omitted, a random UUID will be generated.',
            },
            title: {
              type: 'string',
              description: 'Incident title',
            },
            severity: {
              type: 'string',
              description: 'Incident severity: High, Medium, Low, or Informational',
            },
            status: {
              type: 'string',
              description: 'Incident status: New, Active, or Closed (default: New)',
            },
            description: {
              type: 'string',
              description: 'Incident description',
            },
            classification: {
              type: 'string',
              description:
                'Closing classification when status is Closed: Undetermined, TruePositive, BenignPositive, FalsePositive',
            },
            classification_reason: {
              type: 'string',
              description: 'Reason for the classification (used with classification)',
            },
          },
          required: ['title', 'severity'],
        },
      },
      {
        name: 'update_incident',
        description:
          'Update a Sentinel incident — change status, severity, assignment, or close with classification.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The Sentinel incident ID to update',
            },
            title: {
              type: 'string',
              description: 'New title for the incident',
            },
            severity: {
              type: 'string',
              description: 'New severity: High, Medium, Low, or Informational',
            },
            status: {
              type: 'string',
              description: 'New status: New, Active, or Closed',
            },
            description: {
              type: 'string',
              description: 'Updated description',
            },
            classification: {
              type: 'string',
              description:
                'Closing classification: Undetermined, TruePositive, BenignPositive, FalsePositive',
            },
            classification_reason: {
              type: 'string',
              description: 'Reason for the classification',
            },
            owner_object_id: {
              type: 'string',
              description: 'Azure AD object ID of the user to assign the incident to',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'delete_incident',
        description:
          'Delete a Microsoft Sentinel incident by ID. This action is irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The Sentinel incident ID to delete',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'list_incident_alerts',
        description:
          'List all alerts associated with a specific Sentinel incident.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The Sentinel incident ID',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'list_incident_entities',
        description:
          'List all entities (hosts, users, IPs, files) associated with a specific Sentinel incident.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The Sentinel incident ID',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'list_incident_comments',
        description:
          'List all analyst comments on a Sentinel incident.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The Sentinel incident ID',
            },
          },
          required: ['incident_id'],
        },
      },
      {
        name: 'add_incident_comment',
        description:
          'Add an analyst comment to a Sentinel incident.',
        inputSchema: {
          type: 'object',
          properties: {
            incident_id: {
              type: 'string',
              description: 'The Sentinel incident ID',
            },
            comment: {
              type: 'string',
              description: 'Comment text to add to the incident',
            },
          },
          required: ['incident_id', 'comment'],
        },
      },
      {
        name: 'list_alert_rules',
        description:
          'List all analytic alert rules in the Sentinel workspace with optional OData filter.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression to filter alert rules',
            },
            top: {
              type: 'number',
              description: 'Maximum number of alert rules to return',
            },
          },
        },
      },
      {
        name: 'get_alert_rule',
        description:
          'Get configuration and details for a specific Sentinel analytic alert rule by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            rule_id: {
              type: 'string',
              description: 'The analytic alert rule ID',
            },
          },
          required: ['rule_id'],
        },
      },
      {
        name: 'run_hunting_query',
        description:
          'Execute a KQL (Kusto Query Language) hunting query against the Sentinel Log Analytics workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'KQL query string to execute',
            },
            timespan: {
              type: 'string',
              description:
                'ISO 8601 timespan for the query, e.g. "PT24H" for 24 hours, "P7D" for 7 days (default: PT24H)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_watchlists',
        description:
          'List all watchlists in the Sentinel workspace with optional name filter.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter watchlists by name substring',
            },
          },
        },
      },
      {
        name: 'get_watchlist',
        description:
          'Get metadata and configuration for a specific Sentinel watchlist by alias.',
        inputSchema: {
          type: 'object',
          properties: {
            watchlist_alias: {
              type: 'string',
              description: 'The watchlist alias (short name)',
            },
          },
          required: ['watchlist_alias'],
        },
      },
      {
        name: 'create_watchlist',
        description:
          'Create a new Sentinel watchlist with a name, alias, source type, and optional CSV content.',
        inputSchema: {
          type: 'object',
          properties: {
            watchlist_alias: {
              type: 'string',
              description: 'Unique alias (short name) for the watchlist',
            },
            display_name: {
              type: 'string',
              description: 'Human-readable display name',
            },
            source: {
              type: 'string',
              description: 'Data source description for the watchlist',
            },
            provider: {
              type: 'string',
              description: 'Provider name for the watchlist',
            },
            items_search_key: {
              type: 'string',
              description: 'The column name to use as the search key for watchlist items',
            },
            raw_content: {
              type: 'string',
              description: 'CSV content to pre-populate the watchlist items',
            },
          },
          required: ['watchlist_alias', 'display_name', 'items_search_key'],
        },
      },
      {
        name: 'list_watchlist_items',
        description:
          'List all items in a Sentinel watchlist by alias.',
        inputSchema: {
          type: 'object',
          properties: {
            watchlist_alias: {
              type: 'string',
              description: 'The watchlist alias',
            },
          },
          required: ['watchlist_alias'],
        },
      },
      {
        name: 'upsert_watchlist_item',
        description:
          'Add or update an item in a Sentinel watchlist by alias and item ID.',
        inputSchema: {
          type: 'object',
          properties: {
            watchlist_alias: {
              type: 'string',
              description: 'The watchlist alias',
            },
            watchlist_item_id: {
              type: 'string',
              description: 'GUID for the watchlist item. If new, provide a fresh UUID.',
            },
            properties: {
              type: 'object',
              description: 'Key-value properties for the watchlist item (column name → value)',
            },
          },
          required: ['watchlist_alias', 'watchlist_item_id', 'properties'],
        },
      },
      {
        name: 'delete_watchlist_item',
        description:
          'Delete a specific item from a Sentinel watchlist.',
        inputSchema: {
          type: 'object',
          properties: {
            watchlist_alias: {
              type: 'string',
              description: 'The watchlist alias',
            },
            watchlist_item_id: {
              type: 'string',
              description: 'The watchlist item ID to delete',
            },
          },
          required: ['watchlist_alias', 'watchlist_item_id'],
        },
      },
      {
        name: 'list_bookmarks',
        description:
          'List all investigation bookmarks in the Sentinel workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression to filter bookmarks',
            },
          },
        },
      },
      {
        name: 'get_bookmark',
        description:
          'Get details for a specific Sentinel investigation bookmark by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            bookmark_id: {
              type: 'string',
              description: 'The bookmark GUID',
            },
          },
          required: ['bookmark_id'],
        },
      },
      {
        name: 'create_bookmark',
        description:
          'Create an investigation bookmark in Sentinel to save a KQL query result for later review.',
        inputSchema: {
          type: 'object',
          properties: {
            bookmark_id: {
              type: 'string',
              description: 'GUID for the new bookmark',
            },
            display_name: {
              type: 'string',
              description: 'Display name for the bookmark',
            },
            query: {
              type: 'string',
              description: 'KQL query associated with the bookmark',
            },
            query_result: {
              type: 'string',
              description: 'Query result to save with the bookmark (optional)',
            },
            notes: {
              type: 'string',
              description: 'Analyst notes for the bookmark',
            },
          },
          required: ['bookmark_id', 'display_name', 'query'],
        },
      },
      {
        name: 'list_entities',
        description:
          'List entities (hosts, users, IPs, files, etc.) in the Sentinel workspace with optional filter.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression to filter entities',
            },
            top: {
              type: 'number',
              description: 'Maximum number of entities to return',
            },
          },
        },
      },
      {
        name: 'get_entity',
        description:
          'Get details and insights for a specific Sentinel entity by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'The entity GUID',
            },
          },
          required: ['entity_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_incidents':
          return await this.listIncidents(args);
        case 'get_incident':
          return await this.getIncident(args);
        case 'create_incident':
          return await this.createOrUpdateIncident(args, true);
        case 'update_incident':
          return await this.createOrUpdateIncident(args, false);
        case 'delete_incident':
          return await this.deleteIncident(args);
        case 'list_incident_alerts':
          return await this.listIncidentAlerts(args);
        case 'list_incident_entities':
          return await this.listIncidentEntities(args);
        case 'list_incident_comments':
          return await this.listIncidentComments(args);
        case 'add_incident_comment':
          return await this.addIncidentComment(args);
        case 'list_alert_rules':
          return await this.listAlertRules(args);
        case 'get_alert_rule':
          return await this.getAlertRule(args);
        case 'run_hunting_query':
          return await this.runHuntingQuery(args);
        case 'list_watchlists':
          return await this.listWatchlists(args);
        case 'get_watchlist':
          return await this.getWatchlist(args);
        case 'create_watchlist':
          return await this.createWatchlist(args);
        case 'list_watchlist_items':
          return await this.listWatchlistItems(args);
        case 'upsert_watchlist_item':
          return await this.upsertWatchlistItem(args);
        case 'delete_watchlist_item':
          return await this.deleteWatchlistItem(args);
        case 'list_bookmarks':
          return await this.listBookmarks(args);
        case 'get_bookmark':
          return await this.getBookmark(args);
        case 'create_bookmark':
          return await this.createBookmark(args);
        case 'list_entities':
          return await this.listEntities(args);
        case 'get_entity':
          return await this.getEntity(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async armGet(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const baseUrl = this.withApiVersion(`${this.siBase}${path}`);
    const qs = params && params.toString() ? `&${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${baseUrl}${qs}`, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Sentinel API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Sentinel returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async armPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = this.withApiVersion(`${this.siBase}${path}`);
    const response = await this.fetchWithRetry(url, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Sentinel API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Sentinel returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async armPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = this.withApiVersion(`${this.siBase}${path}`);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Sentinel API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Sentinel returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async armDelete(path: string): Promise<ToolResult> {
    const url = this.withApiVersion(`${this.siBase}${path}`);
    const response = await this.fetchWithRetry(url, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (response.status === 204 || response.status === 200) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ status: response.status, message: 'Deleted' }) }],
        isError: false,
      };
    }

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Sentinel API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ status: response.status, message: 'Success' }) }],
      isError: false,
    };
  }

  private async listIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('$filter', escapeOData(args.filter as string));
    if (args.orderby) params.set('$orderby', args.orderby as string);
    if (args.top) params.set('$top', String(args.top as number));
    if (args.skip_token) params.set('$skipToken', args.skip_token as string);
    return this.armGet('/incidents', params.toString() ? params : undefined);
  }

  private async getIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) {
      return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    }
    return this.armGet(`/incidents/${encodeURIComponent(incidentId)}`);
  }

  private async createOrUpdateIncident(
    args: Record<string, unknown>,
    isCreate: boolean,
  ): Promise<ToolResult> {
    const incidentId = args.incident_id as string | undefined;
    const title = args.title as string | undefined;
    const severity = args.severity as string | undefined;

    if (isCreate && (!title || !severity)) {
      return {
        content: [{ type: 'text', text: 'title and severity are required to create an incident' }],
        isError: true,
      };
    }
    if (!isCreate && !incidentId) {
      return { content: [{ type: 'text', text: 'incident_id is required to update an incident' }], isError: true };
    }

    // For create, generate a UUID if not provided
    const id = incidentId ?? crypto.randomUUID();

    const properties: Record<string, unknown> = {};
    if (title) properties.title = title;
    if (severity) properties.severity = severity;
    properties.status = (args.status as string) ?? (isCreate ? 'New' : undefined);
    if (args.description) properties.description = args.description;
    if (args.classification) properties.classification = args.classification;
    if (args.classification_reason) properties.classificationReason = args.classification_reason;
    if (args.owner_object_id) {
      properties.owner = { objectId: args.owner_object_id };
    }

    // Remove undefined values
    for (const key of Object.keys(properties)) {
      if (properties[key] === undefined) delete properties[key];
    }

    return this.armPut(`/incidents/${encodeURIComponent(id)}`, { properties });
  }

  private async deleteIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) {
      return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    }
    return this.armDelete(`/incidents/${encodeURIComponent(incidentId)}`);
  }

  private async listIncidentAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) {
      return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    }
    return this.armPost(`/incidents/${encodeURIComponent(incidentId)}/alerts`, {});
  }

  private async listIncidentEntities(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) {
      return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    }
    return this.armPost(`/incidents/${encodeURIComponent(incidentId)}/entities`, {});
  }

  private async listIncidentComments(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    if (!incidentId) {
      return { content: [{ type: 'text', text: 'incident_id is required' }], isError: true };
    }
    return this.armGet(`/incidents/${encodeURIComponent(incidentId)}/comments`);
  }

  private async addIncidentComment(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incident_id as string;
    const comment = args.comment as string;
    if (!incidentId || !comment) {
      return {
        content: [{ type: 'text', text: 'incident_id and comment are required' }],
        isError: true,
      };
    }
    const commentId = crypto.randomUUID();
    return this.armPut(`/incidents/${encodeURIComponent(incidentId)}/comments/${commentId}`, {
      properties: { message: comment },
    });
  }

  private async listAlertRules(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('$filter', escapeOData(args.filter as string));
    if (args.top) params.set('$top', String(args.top as number));
    return this.armGet('/alertRules', params.toString() ? params : undefined);
  }

  private async getAlertRule(args: Record<string, unknown>): Promise<ToolResult> {
    const ruleId = args.rule_id as string;
    if (!ruleId) {
      return { content: [{ type: 'text', text: 'rule_id is required' }], isError: true };
    }
    return this.armGet(`/alertRules/${encodeURIComponent(ruleId)}`);
  }

  private async runHuntingQuery(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }

    const requestBody: Record<string, unknown> = {
      query,
      timespan: (args.timespan as string) ?? 'PT24H',
    };

    const response = await this.fetchWithRetry(this.queryBase, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `Log Analytics query error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Log Analytics returned non-JSON response (HTTP ${response.status})`);
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listWatchlists(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) {
      params.set('$filter', `contains(name,'${escapeOData(args.filter as string)}')`);
    }
    return this.armGet('/watchlists', params.toString() ? params : undefined);
  }

  private async getWatchlist(args: Record<string, unknown>): Promise<ToolResult> {
    const alias = args.watchlist_alias as string;
    if (!alias) {
      return { content: [{ type: 'text', text: 'watchlist_alias is required' }], isError: true };
    }
    return this.armGet(`/watchlists/${encodeURIComponent(alias)}`);
  }

  private async createWatchlist(args: Record<string, unknown>): Promise<ToolResult> {
    const alias = args.watchlist_alias as string;
    const displayName = args.display_name as string;
    const itemsSearchKey = args.items_search_key as string;
    if (!alias || !displayName || !itemsSearchKey) {
      return {
        content: [
          {
            type: 'text',
            text: 'watchlist_alias, display_name, and items_search_key are required',
          },
        ],
        isError: true,
      };
    }
    const properties: Record<string, unknown> = {
      displayName,
      itemsSearchKey,
      provider: (args.provider as string) ?? 'Microsoft',
      source: (args.source as string) ?? 'Local file',
    };
    if (args.raw_content) properties.rawContent = args.raw_content;
    return this.armPut(`/watchlists/${encodeURIComponent(alias)}`, { properties });
  }

  private async listWatchlistItems(args: Record<string, unknown>): Promise<ToolResult> {
    const alias = args.watchlist_alias as string;
    if (!alias) {
      return { content: [{ type: 'text', text: 'watchlist_alias is required' }], isError: true };
    }
    return this.armGet(`/watchlists/${encodeURIComponent(alias)}/watchlistItems`);
  }

  private async upsertWatchlistItem(args: Record<string, unknown>): Promise<ToolResult> {
    const alias = args.watchlist_alias as string;
    const itemId = args.watchlist_item_id as string;
    const properties = args.properties as Record<string, unknown>;
    if (!alias || !itemId || !properties) {
      return {
        content: [
          {
            type: 'text',
            text: 'watchlist_alias, watchlist_item_id, and properties are required',
          },
        ],
        isError: true,
      };
    }
    return this.armPut(
      `/watchlists/${encodeURIComponent(alias)}/watchlistItems/${encodeURIComponent(itemId)}`,
      { properties: { itemsKeyValue: properties } },
    );
  }

  private async deleteWatchlistItem(args: Record<string, unknown>): Promise<ToolResult> {
    const alias = args.watchlist_alias as string;
    const itemId = args.watchlist_item_id as string;
    if (!alias || !itemId) {
      return {
        content: [{ type: 'text', text: 'watchlist_alias and watchlist_item_id are required' }],
        isError: true,
      };
    }
    return this.armDelete(
      `/watchlists/${encodeURIComponent(alias)}/watchlistItems/${encodeURIComponent(itemId)}`,
    );
  }

  private async listBookmarks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('$filter', escapeOData(args.filter as string));
    return this.armGet('/bookmarks', params.toString() ? params : undefined);
  }

  private async getBookmark(args: Record<string, unknown>): Promise<ToolResult> {
    const bookmarkId = args.bookmark_id as string;
    if (!bookmarkId) {
      return { content: [{ type: 'text', text: 'bookmark_id is required' }], isError: true };
    }
    return this.armGet(`/bookmarks/${encodeURIComponent(bookmarkId)}`);
  }

  private async createBookmark(args: Record<string, unknown>): Promise<ToolResult> {
    const bookmarkId = args.bookmark_id as string;
    const displayName = args.display_name as string;
    const query = args.query as string;
    if (!bookmarkId || !displayName || !query) {
      return {
        content: [{ type: 'text', text: 'bookmark_id, display_name, and query are required' }],
        isError: true,
      };
    }
    const properties: Record<string, unknown> = { displayName, query };
    if (args.query_result) properties.queryResult = args.query_result;
    if (args.notes) properties.notes = args.notes;
    return this.armPut(`/bookmarks/${encodeURIComponent(bookmarkId)}`, { properties });
  }

  private async listEntities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('$filter', escapeOData(args.filter as string));
    if (args.top) params.set('$top', String(args.top as number));
    return this.armGet('/entities', params.toString() ? params : undefined);
  }

  private async getEntity(args: Record<string, unknown>): Promise<ToolResult> {
    const entityId = args.entity_id as string;
    if (!entityId) {
      return { content: [{ type: 'text', text: 'entity_id is required' }], isError: true };
    }
    return this.armGet(`/entities/${encodeURIComponent(entityId)}`);
  }
}
