/**
 * Monte Carlo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://integrations.getmontecarlo.com/mcp/ — transport: streamable-HTTP (vendor-hosted), auth: MCP-scoped API key pair
// Docs: https://docs.getmontecarlo.com/docs/mcp-server — actively maintained (public preview confirmed 2025, updated 2026-03)
// Our adapter covers: 11 tools (tables, incidents, monitors, lineage, warehouses, metrics, SQL rule monitor, mute, field health, raw GraphQL).
// Vendor MCP covers: 15 tools (getAlerts, updateAlert, setAlertOwner, createOrUpdateAlertComment, getQueriesForTable,
//   getQueryData, createValidationMonitorMac, getValidationPredicates, getTable, search, getDomains,
//   getTableLineage, testConnection, getUser, getCurrentTime).
// NOTE: The vendor MCP requires MCP-scoped credentials (different key pair from standard API keys).
//   This adapter uses standard x-mcd-id / x-mcd-token headers — suitable for programmatic API access.
// Recommendation: use-both — MCP has 9 unique tools (alerts, queries, validation, search, domains,
//   testConnection, getUser, getCurrentTime) not in this adapter. This adapter has 10 unique tools
//   (get_incidents, get_monitors, get_warehouses, update_incident_status, get_table_metrics,
//   create_sql_rule_monitor, mute_table, get_field_health, run_graphql_query, get_tables with full fields)
//   not covered by the vendor MCP. Full coverage requires the union of both.
// Integration: use-both
// MCP-sourced tools (9): getAlerts, updateAlert, setAlertOwner, createOrUpdateAlertComment,
//   getQueriesForTable, getQueryData, createValidationMonitorMac, getValidationPredicates,
//   search, getDomains, testConnection, getUser, getCurrentTime
// REST-sourced tools (11): get_tables, get_incidents, get_monitors, get_table_lineage, get_warehouses,
//   update_incident_status, get_table_metrics, create_sql_rule_monitor, mute_table, get_field_health,
//   run_graphql_query
// Combined coverage: 24 tools (MCP: 15 + REST: 11 - shared: 2 [getTable≈get_tables, getTableLineage≈get_table_lineage])
//
// Base URL: https://api.getmontecarlo.com/graphql
// Auth: x-mcd-id and x-mcd-token headers (create at getmontecarlo.com → Settings → API)
// Docs: https://docs.getmontecarlo.com/docs/api
// Rate limits: Not publicly documented; contact Monte Carlo support for limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MonteCarloConfig {
  mcdId: string;
  mcdToken: string;
  /** Override GraphQL endpoint. Defaults to https://api.getmontecarlo.com/graphql */
  baseUrl?: string;
}

export class MonteCarloMCPServer extends MCPAdapterBase {
  private readonly mcdId: string;
  private readonly mcdToken: string;
  private readonly baseUrl: string;

  constructor(config: MonteCarloConfig) {
    super();
    this.mcdId = config.mcdId;
    this.mcdToken = config.mcdToken;
    this.baseUrl = config.baseUrl ?? 'https://api.getmontecarlo.com/graphql';
  }

  static catalog() {
    return {
      name: 'monte-carlo',
      displayName: 'Monte Carlo',
      version: '1.0.0',
      category: 'data' as const,
      keywords: [
        'monte-carlo', 'data-observability', 'data-quality', 'data-reliability',
        'incidents', 'monitors', 'freshness', 'volume', 'lineage', 'schema',
        'field-health', 'sql-rule', 'warehouse', 'mcon', 'pipeline-observability',
      ],
      toolNames: [
        'get_tables', 'get_incidents', 'get_monitors', 'get_table_lineage',
        'get_warehouses', 'update_incident_status', 'get_table_metrics',
        'create_sql_rule_monitor', 'mute_table', 'get_field_health',
        'run_graphql_query',
      ],
      description: 'Monte Carlo data observability: monitor data quality, manage incidents, query table lineage and field health, and configure SQL-rule monitors.',
      author: 'protectnil' as const,
    };
  }

  private async graphql(query: string, variables?: Record<string, unknown>): Promise<Response> {
    return fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'x-mcd-id': this.mcdId,
        'x-mcd-token': this.mcdToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
  }

  private async runGraphql(query: string, variables?: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.graphql(query, variables);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Monte Carlo API error ${response.status}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_tables',
        description: 'List tables monitored by Monte Carlo, optionally filtered by warehouse, database, or full table identifier. Supports cursor pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            dwId: {
              type: 'string',
              description: 'Data warehouse UUID to filter by (optional)',
            },
            fullTableId: {
              type: 'string',
              description: 'Filter by full table identifier, e.g. "project:dataset.table" (optional)',
            },
            first: {
              type: 'number',
              description: 'Number of tables to return (default: 25, max: 1000)',
            },
            after: {
              type: 'string',
              description: 'Cursor for pagination from a previous response (optional)',
            },
          },
        },
      },
      {
        name: 'get_incidents',
        description: 'Retrieve data quality incidents detected by Monte Carlo, with optional filters for status, type, and time range.',
        inputSchema: {
          type: 'object',
          properties: {
            startTime: {
              type: 'string',
              description: 'ISO 8601 timestamp — return incidents created after this time (optional)',
            },
            endTime: {
              type: 'string',
              description: 'ISO 8601 timestamp — return incidents created before this time (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: no_action, investigating, fixed, expected, false_positive (optional)',
            },
            incidentType: {
              type: 'string',
              description: 'Filter by incident type: anomaly, schema_change, deleted_table, unchanged_size, custom_rule_anomaly (optional)',
            },
            first: {
              type: 'number',
              description: 'Number of incidents to return (default: 25)',
            },
            after: {
              type: 'string',
              description: 'Cursor for pagination (optional)',
            },
          },
        },
      },
      {
        name: 'get_monitors',
        description: 'List data quality monitors configured in Monte Carlo, with optional filters by monitor type and table.',
        inputSchema: {
          type: 'object',
          properties: {
            monitorType: {
              type: 'string',
              description: 'Filter by monitor type: freshness, volume, field_health, dimension_tracking, sql_rule, json_schema, custom_sql (optional)',
            },
            fullTableId: {
              type: 'string',
              description: 'Filter monitors for a specific full table identifier (optional)',
            },
            first: {
              type: 'number',
              description: 'Number of monitors to return (default: 25)',
            },
            after: {
              type: 'string',
              description: 'Cursor for pagination (optional)',
            },
          },
        },
      },
      {
        name: 'get_table_lineage',
        description: 'Retrieve upstream and downstream data lineage for a specific table by MCON — shows pipeline dependencies and data flow.',
        inputSchema: {
          type: 'object',
          properties: {
            mcon: {
              type: 'string',
              description: 'Monte Carlo Object Name (MCON) — globally unique table identifier in the format mcon://...',
            },
            direction: {
              type: 'string',
              description: 'Lineage direction: upstream, downstream, or both (default: both)',
            },
            hops: {
              type: 'number',
              description: 'Number of lineage hops to traverse (default: 1, max: 5)',
            },
          },
          required: ['mcon'],
        },
      },
      {
        name: 'get_warehouses',
        description: 'List the data warehouses (connections) registered in Monte Carlo with their connection type and status.',
        inputSchema: {
          type: 'object',
          properties: {
            first: {
              type: 'number',
              description: 'Number of warehouses to return (default: 25)',
            },
          },
        },
      },
      {
        name: 'update_incident_status',
        description: 'Update the status of a Monte Carlo data incident — mark it as investigating, fixed, expected, or false_positive.',
        inputSchema: {
          type: 'object',
          properties: {
            incidentId: {
              type: 'string',
              description: 'UUID of the incident to update',
            },
            status: {
              type: 'string',
              description: 'New status: investigating, fixed, expected, false_positive, or no_action',
            },
            comment: {
              type: 'string',
              description: 'Optional comment to attach to the status change',
            },
          },
          required: ['incidentId', 'status'],
        },
      },
      {
        name: 'get_table_metrics',
        description: 'Retrieve recent data quality metrics for a table — row count history, freshness timestamps, and schema change events.',
        inputSchema: {
          type: 'object',
          properties: {
            mcon: {
              type: 'string',
              description: 'Monte Carlo Object Name (MCON) of the table',
            },
            metricType: {
              type: 'string',
              description: 'Metric type to retrieve: row_count, byte_count, freshness (default: row_count)',
            },
            startTime: {
              type: 'string',
              description: 'ISO 8601 start time for the metric window (optional)',
            },
            endTime: {
              type: 'string',
              description: 'ISO 8601 end time for the metric window (optional)',
            },
          },
          required: ['mcon'],
        },
      },
      {
        name: 'create_sql_rule_monitor',
        description: 'Create a custom SQL rule monitor in Monte Carlo that alerts when a query result crosses a threshold.',
        inputSchema: {
          type: 'object',
          properties: {
            dwId: {
              type: 'string',
              description: 'Data warehouse UUID to run the SQL rule against',
            },
            sql: {
              type: 'string',
              description: 'SQL query whose result is evaluated. The query must return a single numeric value.',
            },
            comparator: {
              type: 'string',
              description: 'Threshold comparator: GT (greater than), LT (less than), GTE, LTE, EQ, NEQ (default: GT)',
            },
            threshold: {
              type: 'number',
              description: 'Numeric threshold value the SQL result is compared against',
            },
            name: {
              type: 'string',
              description: 'Display name for the monitor (optional)',
            },
            scheduleConfig: {
              type: 'object',
              description: 'Optional schedule config: { "schedulingIntervalInMinutes": 60 } (default: daily)',
            },
          },
          required: ['dwId', 'sql', 'comparator', 'threshold'],
        },
      },
      {
        name: 'mute_table',
        description: 'Mute or unmute a table in Monte Carlo to suppress incident notifications for a period.',
        inputSchema: {
          type: 'object',
          properties: {
            mcon: {
              type: 'string',
              description: 'Monte Carlo Object Name (MCON) of the table to mute or unmute',
            },
            mute: {
              type: 'boolean',
              description: 'true to mute (suppress notifications), false to unmute (default: true)',
            },
          },
          required: ['mcon'],
        },
      },
      {
        name: 'get_field_health',
        description: 'Retrieve field-level health metrics for a table — null rate, distinct count, and distribution statistics per column.',
        inputSchema: {
          type: 'object',
          properties: {
            mcon: {
              type: 'string',
              description: 'Monte Carlo Object Name (MCON) of the table',
            },
            field: {
              type: 'string',
              description: 'Column name to filter results to a specific field (optional — returns all fields if omitted)',
            },
            first: {
              type: 'number',
              description: 'Number of field health records to return (default: 50)',
            },
          },
          required: ['mcon'],
        },
      },
      {
        name: 'run_graphql_query',
        description: 'Execute an arbitrary GraphQL query or mutation against the Monte Carlo API. Use for advanced operations not covered by other tools.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'GraphQL query or mutation string',
            },
            variables: {
              type: 'object',
              description: 'Optional variables object for the GraphQL operation',
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
        case 'get_tables':
          return await this.getTables(args);
        case 'get_incidents':
          return await this.getIncidents(args);
        case 'get_monitors':
          return await this.getMonitors(args);
        case 'get_table_lineage':
          return await this.getTableLineage(args);
        case 'get_warehouses':
          return await this.getWarehouses(args);
        case 'update_incident_status':
          return await this.updateIncidentStatus(args);
        case 'get_table_metrics':
          return await this.getTableMetrics(args);
        case 'create_sql_rule_monitor':
          return await this.createSqlRuleMonitor(args);
        case 'mute_table':
          return await this.muteTable(args);
        case 'get_field_health':
          return await this.getFieldHealth(args);
        case 'run_graphql_query':
          return await this.runGraphqlQuery(args);
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

  private async getTables(args: Record<string, unknown>): Promise<ToolResult> {
    const query = `
      query GetTables($first: Int, $after: String, $dwId: UUID, $fullTableId: String) {
        getTables(first: $first, after: $after, dwId: $dwId, fullTableId: $fullTableId) {
          edges {
            node {
              mcon
              fullTableId
              displayName
              warehouse { uuid name connectionType }
              tableStats { lastUpdatedTime rowCount }
            }
          }
          pageInfo { endCursor hasNextPage }
        }
      }
    `;
    const variables: Record<string, unknown> = { first: (args.first as number) ?? 25 };
    if (args.dwId) variables.dwId = args.dwId;
    if (args.fullTableId) variables.fullTableId = args.fullTableId;
    if (args.after) variables.after = args.after;
    return this.runGraphql(query, variables);
  }

  private async getIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const query = `
      query GetIncidents($first: Int, $after: String, $startTime: DateTime, $endTime: DateTime, $status: String, $incidentType: String) {
        getIncidents(first: $first, after: $after, startTime: $startTime, endTime: $endTime, status: $status, incidentType: $incidentType) {
          edges {
            node {
              incidentId
              status
              incidentType
              startTime
              endTime
              normalizedStatus
              affectedTables { fullTableId mcon }
            }
          }
          pageInfo { endCursor hasNextPage }
        }
      }
    `;
    const variables: Record<string, unknown> = { first: (args.first as number) ?? 25 };
    if (args.after) variables.after = args.after;
    if (args.startTime) variables.startTime = args.startTime;
    if (args.endTime) variables.endTime = args.endTime;
    if (args.status) variables.status = args.status;
    if (args.incidentType) variables.incidentType = args.incidentType;
    return this.runGraphql(query, variables);
  }

  private async getMonitors(args: Record<string, unknown>): Promise<ToolResult> {
    const query = `
      query GetMonitors($first: Int, $after: String, $monitorType: String, $fullTableId: String) {
        getMonitors(first: $first, after: $after, monitorType: $monitorType, fullTableId: $fullTableId) {
          edges {
            node {
              uuid
              monitorType
              name
              description
              status
              fullTableId
              createdTime
              updatedTime
            }
          }
          pageInfo { endCursor hasNextPage }
        }
      }
    `;
    const variables: Record<string, unknown> = { first: (args.first as number) ?? 25 };
    if (args.after) variables.after = args.after;
    if (args.monitorType) variables.monitorType = args.monitorType;
    if (args.fullTableId) variables.fullTableId = args.fullTableId;
    return this.runGraphql(query, variables);
  }

  private async getTableLineage(args: Record<string, unknown>): Promise<ToolResult> {
    const mcon = args.mcon as string;
    if (!mcon) return { content: [{ type: 'text', text: 'mcon is required' }], isError: true };
    const query = `
      query GetTableLineage($mcon: String!, $direction: String, $hops: Int) {
        getTableLineage(mcon: $mcon, direction: $direction, hops: $hops) {
          nodes { mcon objectType displayName fullTableId }
          edges { source destination }
        }
      }
    `;
    return this.runGraphql(query, {
      mcon,
      direction: (args.direction as string) ?? 'both',
      hops: (args.hops as number) ?? 1,
    });
  }

  private async getWarehouses(args: Record<string, unknown>): Promise<ToolResult> {
    const query = `
      query GetWarehouses($first: Int) {
        getWarehouses(first: $first) {
          edges {
            node { uuid name connectionType createdOn updatedOn }
          }
        }
      }
    `;
    return this.runGraphql(query, { first: (args.first as number) ?? 25 });
  }

  private async updateIncidentStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const incidentId = args.incidentId as string;
    const status = args.status as string;
    if (!incidentId || !status) {
      return { content: [{ type: 'text', text: 'incidentId and status are required' }], isError: true };
    }
    const mutation = `
      mutation UpdateIncidentStatus($incidentId: UUID!, $status: String!, $comment: String) {
        updateIncidentStatus(incidentId: $incidentId, status: $status, comment: $comment) {
          incident {
            incidentId
            status
            normalizedStatus
          }
        }
      }
    `;
    const variables: Record<string, unknown> = { incidentId, status };
    if (args.comment) variables.comment = args.comment;
    return this.runGraphql(mutation, variables);
  }

  private async getTableMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const mcon = args.mcon as string;
    if (!mcon) return { content: [{ type: 'text', text: 'mcon is required' }], isError: true };
    const metricType = (args.metricType as string) ?? 'row_count';
    const query = `
      query GetTableMetrics($mcon: String!, $metricType: String, $startTime: DateTime, $endTime: DateTime) {
        getTableMetrics(mcon: $mcon, metricType: $metricType, startTime: $startTime, endTime: $endTime) {
          edges {
            node {
              metricName
              metricValue
              measurementTimestamp
            }
          }
        }
      }
    `;
    const variables: Record<string, unknown> = { mcon, metricType };
    if (args.startTime) variables.startTime = args.startTime;
    if (args.endTime) variables.endTime = args.endTime;
    return this.runGraphql(query, variables);
  }

  private async createSqlRuleMonitor(args: Record<string, unknown>): Promise<ToolResult> {
    const dwId = args.dwId as string;
    const sql = args.sql as string;
    const comparator = args.comparator as string;
    const threshold = args.threshold as number;
    if (!dwId || !sql || !comparator || threshold === undefined) {
      return { content: [{ type: 'text', text: 'dwId, sql, comparator, and threshold are required' }], isError: true };
    }
    const mutation = `
      mutation CreateSqlRuleMonitor($dwId: UUID!, $sql: String!, $comparator: String!, $threshold: Float!, $name: String, $scheduleConfig: ScheduleConfigInput) {
        createSqlRuleMonitor(
          dwId: $dwId
          sql: $sql
          comparator: $comparator
          threshold: $threshold
          name: $name
          scheduleConfig: $scheduleConfig
        ) {
          monitor {
            uuid
            monitorType
            name
            status
          }
        }
      }
    `;
    const variables: Record<string, unknown> = { dwId, sql, comparator, threshold };
    if (args.name) variables.name = args.name;
    if (args.scheduleConfig) variables.scheduleConfig = args.scheduleConfig;
    return this.runGraphql(mutation, variables);
  }

  private async muteTable(args: Record<string, unknown>): Promise<ToolResult> {
    const mcon = args.mcon as string;
    if (!mcon) return { content: [{ type: 'text', text: 'mcon is required' }], isError: true };
    const mute = (args.mute as boolean) ?? true;
    const mutation = `
      mutation MuteTable($mcon: String!, $mute: Boolean!) {
        muteTable(mcon: $mcon, mute: $mute) {
          tableObject { mcon isMuted }
        }
      }
    `;
    return this.runGraphql(mutation, { mcon, mute });
  }

  private async getFieldHealth(args: Record<string, unknown>): Promise<ToolResult> {
    const mcon = args.mcon as string;
    if (!mcon) return { content: [{ type: 'text', text: 'mcon is required' }], isError: true };
    const query = `
      query GetFieldHealth($mcon: String!, $field: String, $first: Int) {
        getFieldHealthMetrics(mcon: $mcon, field: $field, first: $first) {
          edges {
            node {
              fieldName
              metricName
              metricValue
              measurementTimestamp
            }
          }
        }
      }
    `;
    const variables: Record<string, unknown> = { mcon, first: (args.first as number) ?? 50 };
    if (args.field) variables.field = args.field;
    return this.runGraphql(query, variables);
  }

  private async runGraphqlQuery(args: Record<string, unknown>): Promise<ToolResult> {
    const queryStr = args.query as string;
    if (!queryStr) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.runGraphql(queryStr, args.variables as Record<string, unknown> | undefined);
  }
}
