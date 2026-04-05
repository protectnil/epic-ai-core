/**
 * Honeycomb MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/honeycombio/honeycomb-mcp — transport: stdio, auth: API key
// Vendor MCP is maintained by Honeycomb (official) but exposes only 8 tools (list_datasets,
// get_columns, run_query, analyze_columns, list_slos, list_triggers, list_markers, list_boards)
// and is restricted to Honeycomb Enterprise customers only.
// Recommendation: use-rest-api — vendor MCP fails the 10+ tools criterion (only 8 tools) and is
// Enterprise-only. Our REST adapter covers all plans and exposes 28 tools including full CRUD
// for datasets, columns, SLOs, triggers, markers, boards, event ingestion, and recipients.
//
// Our adapter covers: 28 tools. Vendor MCP covers: 8 tools (Enterprise-only, fails 10-tool threshold).
//
// Base URL: https://api.honeycomb.io (US default) or https://api.eu1.honeycomb.io (EU region)
// Auth: X-Honeycomb-Team header containing the API key (Ingest or Configuration key).
// Docs: https://docs.honeycomb.io/api/
// Rate limits: Rate-limited per window; headers RateLimit and RateLimit-Policy on each response.
//   Create Query Result: max 10 requests/min. Create Query Result (relational): max 1 request/min.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HoneycombConfig {
  /** Honeycomb API key from Account > Team Settings > API Keys. */
  apiKey: string;
  /** Optional base URL for regional routing. US: https://api.honeycomb.io, EU: https://api.eu1.honeycomb.io. */
  baseUrl?: string;
}

export class HoneycombMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: HoneycombConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.honeycomb.io').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'honeycomb',
      displayName: 'Honeycomb',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: [
        'honeycomb', 'observability', 'tracing', 'events', 'telemetry', 'query',
        'dataset', 'column', 'board', 'slo', 'service level objective', 'trigger',
        'alert', 'marker', 'deploy', 'annotation', 'recipient',
      ],
      toolNames: [
        'list_datasets', 'get_dataset', 'create_dataset', 'delete_dataset',
        'list_columns', 'get_column', 'create_column', 'delete_column',
        'create_query', 'run_query', 'get_query_result',
        'list_boards', 'get_board',
        'list_markers', 'create_marker', 'delete_marker',
        'list_slos', 'get_slo', 'create_slo', 'update_slo', 'delete_slo',
        'list_triggers', 'get_trigger', 'create_trigger', 'update_trigger', 'delete_trigger',
        'list_recipients',
        'send_event',
      ],
      description: 'Manage Honeycomb observability: datasets, queries, columns, boards, SLOs, triggers, markers, events, and recipients via the REST API v1.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_datasets',
        description: 'List all datasets in the Honeycomb environment with their slugs and last write times.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_dataset',
        description: 'Get metadata for a specific Honeycomb dataset including description, slug, and last write time.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug (URL-safe name).' },
          },
          required: ['dataset'],
        },
      },
      {
        name: 'create_dataset',
        description: 'Create a new Honeycomb dataset with an optional description.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Dataset name (will be slugified for use in API calls).' },
            description: { type: 'string', description: 'Optional description of what this dataset contains.' },
            expandJson: { type: 'boolean', description: 'Automatically expand nested JSON fields into top-level columns (default: false).' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_dataset',
        description: 'Delete a Honeycomb dataset and all its data. This is irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug to delete.' },
          },
          required: ['dataset'],
        },
      },
      {
        name: 'list_columns',
        description: 'List all columns (fields) in a Honeycomb dataset with their types and descriptions.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
          },
          required: ['dataset'],
        },
      },
      {
        name: 'get_column',
        description: 'Get details for a specific column in a Honeycomb dataset by column ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            columnId: { type: 'string', description: 'The column ID.' },
          },
          required: ['dataset', 'columnId'],
        },
      },
      {
        name: 'create_column',
        description: 'Create a new column definition in a Honeycomb dataset.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            key_name: { type: 'string', description: 'Column name (matches the field name in your events).' },
            type: { type: 'string', description: 'Column type: string, integer, float, boolean (default: string).' },
            description: { type: 'string', description: 'Optional description of what this column represents.' },
            hidden: { type: 'boolean', description: 'Hide this column from the query builder UI (default: false).' },
          },
          required: ['dataset', 'key_name'],
        },
      },
      {
        name: 'delete_column',
        description: 'Delete a column definition from a Honeycomb dataset by column ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            columnId: { type: 'string', description: 'The column ID to delete.' },
          },
          required: ['dataset', 'columnId'],
        },
      },
      {
        name: 'create_query',
        description: 'Create a query specification against a Honeycomb dataset. Returns a query ID for use with run_query.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug to query.' },
            calculations: { type: 'array', description: 'Calculation objects (e.g. [{"op":"COUNT"},{"op":"P99","column":"duration_ms"}]).' },
            filters: { type: 'array', description: 'Filter objects (e.g. [{"column":"error","op":"=","value":true}]).' },
            filter_combination: { type: 'string', description: 'How to combine filters: AND or OR (default: AND).' },
            breakdowns: { type: 'array', description: 'Column names to group results by (e.g. ["service.name","status_code"]).', items: { type: 'string' } },
            orders: { type: 'array', description: 'Order objects (e.g. [{"op":"COUNT","order":"descending"}]).' },
            havings: { type: 'array', description: 'Having clause objects to filter on aggregated values.' },
            time_range: { type: 'number', description: 'Relative time range in seconds from now (e.g. 3600 for last hour, 86400 for last day).' },
            start_time: { type: 'number', description: 'Absolute start time as Unix epoch seconds (overrides time_range).' },
            end_time: { type: 'number', description: 'Absolute end time as Unix epoch seconds (use with start_time).' },
            granularity: { type: 'number', description: 'Time bucket granularity in seconds for time-series results.' },
            limit: { type: 'number', description: 'Maximum number of result rows (default: 1000, max: 10000).' },
          },
          required: ['dataset', 'calculations'],
        },
      },
      {
        name: 'run_query',
        description: 'Execute a previously created Honeycomb query by ID and create a query result. Poll get_query_result for status.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            query_id: { type: 'string', description: 'The query ID returned by create_query.' },
            disable_series: { type: 'boolean', description: 'Exclude time-series data from results for faster responses (default: false).' },
          },
          required: ['dataset', 'query_id'],
        },
      },
      {
        name: 'get_query_result',
        description: 'Get the result of a running or completed Honeycomb query by result ID. Returns status and data when complete.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            query_result_id: { type: 'string', description: 'The query result ID returned by run_query.' },
          },
          required: ['dataset', 'query_result_id'],
        },
      },
      {
        name: 'list_boards',
        description: 'List all boards in the Honeycomb environment.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_board',
        description: 'Get details of a specific Honeycomb board by ID, including its queries and layout.',
        inputSchema: {
          type: 'object',
          properties: {
            boardId: { type: 'string', description: 'The board ID.' },
          },
          required: ['boardId'],
        },
      },
      {
        name: 'list_markers',
        description: 'List all markers (deploy events, incidents, annotations) for a Honeycomb dataset.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
          },
          required: ['dataset'],
        },
      },
      {
        name: 'create_marker',
        description: 'Create a marker on a Honeycomb dataset to annotate a deploy, incident, or other event on the timeline.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            message: { type: 'string', description: 'Human-readable description of the event (e.g. "Deploy v1.4.2 to production").' },
            type: { type: 'string', description: 'Marker type for visual grouping (e.g. deploy, feature-flag, incident).' },
            url: { type: 'string', description: 'URL for more context (e.g. GitHub release URL, PagerDuty incident).' },
            start_time: { type: 'number', description: 'Start time as Unix epoch seconds (defaults to now).' },
            end_time: { type: 'number', description: 'End time as Unix epoch seconds for range markers (optional).' },
          },
          required: ['dataset', 'message'],
        },
      },
      {
        name: 'delete_marker',
        description: 'Delete a marker from a Honeycomb dataset by marker ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            markerId: { type: 'string', description: 'The marker ID to delete.' },
          },
          required: ['dataset', 'markerId'],
        },
      },
      {
        name: 'list_slos',
        description: 'List all Service Level Objectives (SLOs) defined for a Honeycomb dataset.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
          },
          required: ['dataset'],
        },
      },
      {
        name: 'get_slo',
        description: 'Get details and current compliance status for a specific Honeycomb SLO.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            slo_id: { type: 'string', description: 'The SLO ID.' },
          },
          required: ['dataset', 'slo_id'],
        },
      },
      {
        name: 'create_slo',
        description: 'Create a new SLO on a Honeycomb dataset with a target compliance percentage and time window.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            name: { type: 'string', description: 'SLO name.' },
            description: { type: 'string', description: 'SLO description.' },
            sli: { type: 'object', description: 'SLI (Service Level Indicator) alias referencing a derived column.' },
            target_per_million: { type: 'number', description: 'Target compliance in parts per million (e.g. 999000 = 99.9%).' },
            time_period_days: { type: 'number', description: 'Rolling window in days for SLO compliance (e.g. 30).' },
          },
          required: ['dataset', 'name', 'sli', 'target_per_million', 'time_period_days'],
        },
      },
      {
        name: 'update_slo',
        description: 'Update an existing Honeycomb SLO name, description, target, or time window.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            slo_id: { type: 'string', description: 'The SLO ID to update.' },
            name: { type: 'string', description: 'New SLO name.' },
            description: { type: 'string', description: 'New SLO description.' },
            target_per_million: { type: 'number', description: 'New target in parts per million.' },
            time_period_days: { type: 'number', description: 'New rolling window in days.' },
          },
          required: ['dataset', 'slo_id'],
        },
      },
      {
        name: 'delete_slo',
        description: 'Delete a Honeycomb SLO by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            slo_id: { type: 'string', description: 'The SLO ID to delete.' },
          },
          required: ['dataset', 'slo_id'],
        },
      },
      {
        name: 'list_triggers',
        description: 'List all alert triggers defined for a Honeycomb dataset.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
          },
          required: ['dataset'],
        },
      },
      {
        name: 'get_trigger',
        description: 'Get details for a specific Honeycomb alert trigger including threshold, recipients, and frequency.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            trigger_id: { type: 'string', description: 'The trigger ID.' },
          },
          required: ['dataset', 'trigger_id'],
        },
      },
      {
        name: 'create_trigger',
        description: 'Create a new alert trigger on a Honeycomb dataset with threshold and notification recipients.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            name: { type: 'string', description: 'Trigger name.' },
            description: { type: 'string', description: 'Trigger description.' },
            query_id: { type: 'string', description: 'Query ID to evaluate (created via create_query).' },
            threshold: { type: 'object', description: 'Threshold object with op (>, <, >=, <=) and value fields.' },
            frequency: { type: 'number', description: 'How often to evaluate the trigger in seconds (e.g. 60, 300).' },
            recipients: { type: 'array', description: 'Array of recipient objects with id and type fields.', items: { type: 'object' } },
            alert_type: { type: 'string', description: 'Alert type: on_change (default) or on_true.' },
            enabled: { type: 'boolean', description: 'Whether the trigger is active (default: true).' },
          },
          required: ['dataset', 'name', 'query_id', 'threshold'],
        },
      },
      {
        name: 'update_trigger',
        description: 'Update an existing Honeycomb trigger name, threshold, frequency, or recipient list.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            trigger_id: { type: 'string', description: 'The trigger ID to update.' },
            name: { type: 'string', description: 'New trigger name.' },
            description: { type: 'string', description: 'New trigger description.' },
            threshold: { type: 'object', description: 'New threshold object with op and value fields.' },
            frequency: { type: 'number', description: 'New evaluation frequency in seconds.' },
            recipients: { type: 'array', description: 'New recipient list.', items: { type: 'object' } },
            enabled: { type: 'boolean', description: 'Enable or disable the trigger.' },
          },
          required: ['dataset', 'trigger_id'],
        },
      },
      {
        name: 'delete_trigger',
        description: 'Delete a Honeycomb alert trigger by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug.' },
            trigger_id: { type: 'string', description: 'The trigger ID to delete.' },
          },
          required: ['dataset', 'trigger_id'],
        },
      },
      {
        name: 'list_recipients',
        description: 'List all notification recipients configured in the Honeycomb environment (email, Slack, PagerDuty, webhook).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'send_event',
        description: 'Send a single event to a Honeycomb dataset for immediate ingestion.',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: { type: 'string', description: 'The dataset slug to send the event to.' },
            data: { type: 'object', description: 'Event data as key-value pairs (field names and values).' },
            timestamp: { type: 'string', description: 'ISO 8601 timestamp for the event (defaults to server time).' },
          },
          required: ['dataset', 'data'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_datasets':    return await this.listDatasets();
        case 'get_dataset':      return await this.getDataset(args);
        case 'create_dataset':   return await this.createDataset(args);
        case 'delete_dataset':   return await this.deleteDataset(args);
        case 'list_columns':     return await this.listColumns(args);
        case 'get_column':       return await this.getColumn(args);
        case 'create_column':    return await this.createColumn(args);
        case 'delete_column':    return await this.deleteColumn(args);
        case 'create_query':     return await this.createQuery(args);
        case 'run_query':        return await this.runQuery(args);
        case 'get_query_result': return await this.getQueryResult(args);
        case 'list_boards':      return await this.listBoards();
        case 'get_board':        return await this.getBoard(args);
        case 'list_markers':     return await this.listMarkers(args);
        case 'create_marker':    return await this.createMarker(args);
        case 'delete_marker':    return await this.deleteMarker(args);
        case 'list_slos':        return await this.listSlos(args);
        case 'get_slo':          return await this.getSlo(args);
        case 'create_slo':       return await this.createSlo(args);
        case 'update_slo':       return await this.updateSlo(args);
        case 'delete_slo':       return await this.deleteSlo(args);
        case 'list_triggers':    return await this.listTriggers(args);
        case 'get_trigger':      return await this.getTrigger(args);
        case 'create_trigger':   return await this.createTrigger(args);
        case 'update_trigger':   return await this.updateTrigger(args);
        case 'delete_trigger':   return await this.deleteTrigger(args);
        case 'list_recipients':  return await this.listRecipients();
        case 'send_event':       return await this.sendEvent(args);
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
      'X-Honeycomb-Team': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async hcGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async hcPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async hcPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async hcDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'deleted' }) }], isError: false };
  }

  // Events use a different path structure: POST /1/events/:dataset
  private async hcPostEvent(path: string, body: unknown, timestamp?: string): Promise<ToolResult> {
    const eventHeaders: Record<string, string> = { ...this.headers };
    if (timestamp) eventHeaders['X-Honeycomb-Event-Time'] = timestamp;
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: eventHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'accepted' }) }], isError: false };
  }

  // ---------------------------------------------------------------------------
  // Tool implementations
  // ---------------------------------------------------------------------------

  private async listDatasets(): Promise<ToolResult> {
    return this.hcGet('/1/datasets');
  }

  private async getDataset(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    if (!dataset) return { content: [{ type: 'text', text: 'dataset is required' }], isError: true };
    return this.hcGet(`/1/datasets/${encodeURIComponent(dataset)}`);
  }

  private async createDataset(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name };
    if (args.description) body.description = args.description;
    if (typeof args.expandJson === 'boolean') body.expand_json_depth = args.expandJson ? 1 : 0;
    return this.hcPost('/1/datasets', body);
  }

  private async deleteDataset(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    if (!dataset) return { content: [{ type: 'text', text: 'dataset is required' }], isError: true };
    return this.hcDelete(`/1/datasets/${encodeURIComponent(dataset)}`);
  }

  private async listColumns(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    if (!dataset) return { content: [{ type: 'text', text: 'dataset is required' }], isError: true };
    return this.hcGet(`/1/columns/${encodeURIComponent(dataset)}`);
  }

  private async getColumn(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const columnId = args.columnId as string;
    if (!dataset || !columnId) return { content: [{ type: 'text', text: 'dataset and columnId are required' }], isError: true };
    return this.hcGet(`/1/columns/${encodeURIComponent(dataset)}/${encodeURIComponent(columnId)}`);
  }

  private async createColumn(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const keyName = args.key_name as string;
    if (!dataset || !keyName) return { content: [{ type: 'text', text: 'dataset and key_name are required' }], isError: true };
    const body: Record<string, unknown> = { key_name: keyName };
    if (args.type) body.type = args.type;
    if (args.description) body.description = args.description;
    if (typeof args.hidden === 'boolean') body.hidden = args.hidden;
    return this.hcPost(`/1/columns/${encodeURIComponent(dataset)}`, body);
  }

  private async deleteColumn(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const columnId = args.columnId as string;
    if (!dataset || !columnId) return { content: [{ type: 'text', text: 'dataset and columnId are required' }], isError: true };
    return this.hcDelete(`/1/columns/${encodeURIComponent(dataset)}/${encodeURIComponent(columnId)}`);
  }

  private async createQuery(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const calculations = args.calculations;
    if (!dataset || !calculations) return { content: [{ type: 'text', text: 'dataset and calculations are required' }], isError: true };
    const body: Record<string, unknown> = { calculations };
    if (args.filters) body.filters = args.filters;
    if (args.filter_combination) body.filter_combination = args.filter_combination;
    if (args.breakdowns) body.breakdowns = args.breakdowns;
    if (args.orders) body.orders = args.orders;
    if (args.havings) body.havings = args.havings;
    if (args.time_range) body.time_range = args.time_range;
    if (args.start_time) body.start_time = args.start_time;
    if (args.end_time) body.end_time = args.end_time;
    if (args.granularity) body.granularity = args.granularity;
    if (args.limit) body.limit = args.limit;
    return this.hcPost(`/1/queries/${encodeURIComponent(dataset)}`, body);
  }

  private async runQuery(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const queryId = args.query_id as string;
    if (!dataset || !queryId) return { content: [{ type: 'text', text: 'dataset and query_id are required' }], isError: true };
    const body: Record<string, unknown> = { query_id: queryId };
    if (typeof args.disable_series === 'boolean') body.disable_series = args.disable_series;
    return this.hcPost(`/1/query_results/${encodeURIComponent(dataset)}`, body);
  }

  private async getQueryResult(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const resultId = args.query_result_id as string;
    if (!dataset || !resultId) return { content: [{ type: 'text', text: 'dataset and query_result_id are required' }], isError: true };
    return this.hcGet(`/1/query_results/${encodeURIComponent(dataset)}/${encodeURIComponent(resultId)}`);
  }

  private async listBoards(): Promise<ToolResult> {
    return this.hcGet('/1/boards');
  }

  private async getBoard(args: Record<string, unknown>): Promise<ToolResult> {
    const boardId = args.boardId as string;
    if (!boardId) return { content: [{ type: 'text', text: 'boardId is required' }], isError: true };
    return this.hcGet(`/1/boards/${encodeURIComponent(boardId)}`);
  }

  private async listMarkers(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    if (!dataset) return { content: [{ type: 'text', text: 'dataset is required' }], isError: true };
    return this.hcGet(`/1/markers/${encodeURIComponent(dataset)}`);
  }

  private async createMarker(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const message = args.message as string;
    if (!dataset || !message) return { content: [{ type: 'text', text: 'dataset and message are required' }], isError: true };
    const body: Record<string, unknown> = { message };
    if (args.type) body.type = args.type;
    if (args.url) body.url = args.url;
    if (args.start_time) body.start_time = args.start_time;
    if (args.end_time) body.end_time = args.end_time;
    return this.hcPost(`/1/markers/${encodeURIComponent(dataset)}`, body);
  }

  private async deleteMarker(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const markerId = args.markerId as string;
    if (!dataset || !markerId) return { content: [{ type: 'text', text: 'dataset and markerId are required' }], isError: true };
    return this.hcDelete(`/1/markers/${encodeURIComponent(dataset)}/${encodeURIComponent(markerId)}`);
  }

  private async listSlos(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    if (!dataset) return { content: [{ type: 'text', text: 'dataset is required' }], isError: true };
    return this.hcGet(`/1/slos/${encodeURIComponent(dataset)}`);
  }

  private async getSlo(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const sloId = args.slo_id as string;
    if (!dataset || !sloId) return { content: [{ type: 'text', text: 'dataset and slo_id are required' }], isError: true };
    return this.hcGet(`/1/slos/${encodeURIComponent(dataset)}/${encodeURIComponent(sloId)}`);
  }

  private async createSlo(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const name = args.name as string;
    const sli = args.sli;
    const targetPerMillion = args.target_per_million as number;
    const timePeriodDays = args.time_period_days as number;
    if (!dataset || !name || !sli || targetPerMillion === undefined || timePeriodDays === undefined) {
      return { content: [{ type: 'text', text: 'dataset, name, sli, target_per_million, and time_period_days are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name, sli, target_per_million: targetPerMillion, time_period_days: timePeriodDays };
    if (args.description) body.description = args.description;
    return this.hcPost(`/1/slos/${encodeURIComponent(dataset)}`, body);
  }

  private async updateSlo(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const sloId = args.slo_id as string;
    if (!dataset || !sloId) return { content: [{ type: 'text', text: 'dataset and slo_id are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.target_per_million !== undefined) body.target_per_million = args.target_per_million;
    if (args.time_period_days !== undefined) body.time_period_days = args.time_period_days;
    return this.hcPut(`/1/slos/${encodeURIComponent(dataset)}/${encodeURIComponent(sloId)}`, body);
  }

  private async deleteSlo(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const sloId = args.slo_id as string;
    if (!dataset || !sloId) return { content: [{ type: 'text', text: 'dataset and slo_id are required' }], isError: true };
    return this.hcDelete(`/1/slos/${encodeURIComponent(dataset)}/${encodeURIComponent(sloId)}`);
  }

  private async listTriggers(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    if (!dataset) return { content: [{ type: 'text', text: 'dataset is required' }], isError: true };
    return this.hcGet(`/1/triggers/${encodeURIComponent(dataset)}`);
  }

  private async getTrigger(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const triggerId = args.trigger_id as string;
    if (!dataset || !triggerId) return { content: [{ type: 'text', text: 'dataset and trigger_id are required' }], isError: true };
    return this.hcGet(`/1/triggers/${encodeURIComponent(dataset)}/${encodeURIComponent(triggerId)}`);
  }

  private async createTrigger(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const name = args.name as string;
    const queryId = args.query_id as string;
    const threshold = args.threshold;
    if (!dataset || !name || !queryId || !threshold) {
      return { content: [{ type: 'text', text: 'dataset, name, query_id, and threshold are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name, query_id: queryId, threshold };
    if (args.description) body.description = args.description;
    if (args.frequency) body.frequency = args.frequency;
    if (args.recipients) body.recipients = args.recipients;
    if (args.alert_type) body.alert_type = args.alert_type;
    if (typeof args.enabled === 'boolean') body.enabled = args.enabled;
    return this.hcPost(`/1/triggers/${encodeURIComponent(dataset)}`, body);
  }

  private async updateTrigger(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const triggerId = args.trigger_id as string;
    if (!dataset || !triggerId) return { content: [{ type: 'text', text: 'dataset and trigger_id are required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (args.threshold) body.threshold = args.threshold;
    if (args.frequency) body.frequency = args.frequency;
    if (args.recipients) body.recipients = args.recipients;
    if (typeof args.enabled === 'boolean') body.enabled = args.enabled;
    return this.hcPut(`/1/triggers/${encodeURIComponent(dataset)}/${encodeURIComponent(triggerId)}`, body);
  }

  private async deleteTrigger(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const triggerId = args.trigger_id as string;
    if (!dataset || !triggerId) return { content: [{ type: 'text', text: 'dataset and trigger_id are required' }], isError: true };
    return this.hcDelete(`/1/triggers/${encodeURIComponent(dataset)}/${encodeURIComponent(triggerId)}`);
  }

  private async listRecipients(): Promise<ToolResult> {
    return this.hcGet('/1/recipients');
  }

  private async sendEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const dataset = args.dataset as string;
    const data = args.data;
    if (!dataset || !data) return { content: [{ type: 'text', text: 'dataset and data are required' }], isError: true };
    return this.hcPostEvent(`/1/events/${encodeURIComponent(dataset)}`, data, args.timestamp as string | undefined);
  }
}
