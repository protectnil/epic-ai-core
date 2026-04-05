/**
 * Census MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Census (getcensus.com / Fivetran Activations) MCP server was found on GitHub or the MCP registry.
// Community implementations exist but are not maintained by Census/Fivetran.
// This adapter covers: 14 tools (syncs, sources, destinations, models, webhooks, sync runs).
// Recommendation: Use this adapter for all Census reverse ETL integrations.
//
// NOTE: Census was acquired by Fivetran. The API domain remains app.getcensus.com and the
// developer docs have moved to developers.getcensus.com (hosted by Fivetran). Endpoints are unchanged.
// NOTE: The list_models tool uses GET /api/v1/sources/{source_id}/models which is DEPRECATED by Census.
// The vendor recommends migrating to the Datasets API. This tool is preserved for backward compatibility
// but callers should plan to migrate to list_datasets when that tool is added.
//
// Base URL: https://app.getcensus.com/api/v1
// Auth: Bearer token (workspace access token from Census workspace settings)
//       Authorization: Bearer <workspace_token>
// Docs: https://developers.getcensus.com/api-reference/introduction/overview
// Rate limits: Not publicly documented. Census recommends polling sync runs at reasonable intervals.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CensusConfig {
  apiToken: string;
  baseUrl?: string;
}

export class CensusMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: CensusConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl ?? 'https://app.getcensus.com/api/v1';
  }

  static catalog() {
    return {
      name: 'census',
      displayName: 'Census',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'census', 'reverse etl', 'sync', 'data warehouse', 'salesforce', 'hubspot',
        'destination', 'source', 'model', 'connector', 'pipeline', 'customer data',
        'snowflake', 'bigquery', 'redshift', 'dbt', 'activation',
      ],
      toolNames: [
        'list_syncs', 'get_sync', 'create_sync', 'update_sync', 'delete_sync',
        'trigger_sync', 'list_sync_runs', 'get_sync_run',
        'list_sources', 'get_source',
        'list_destinations', 'get_destination',
        'list_models', 'list_webhooks',
      ],
      description: 'Census reverse ETL: manage syncs from data warehouse to SaaS destinations, trigger sync runs, inspect sources, destinations, and models.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_syncs',
        description: 'List all Census reverse ETL syncs in the workspace with their configuration and current status',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of syncs per page (default: 25, max: 100)',
            },
            order: {
              type: 'string',
              description: 'Sort order: asc or desc (default: desc)',
            },
          },
        },
      },
      {
        name: 'get_sync',
        description: 'Get full configuration and status details for a specific Census sync by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            sync_id: {
              type: 'number',
              description: 'Census sync ID (integer)',
            },
          },
          required: ['sync_id'],
        },
      },
      {
        name: 'create_sync',
        description: 'Create a new Census reverse ETL sync from a source model to a destination object with field mappings',
        inputSchema: {
          type: 'object',
          properties: {
            label: {
              type: 'string',
              description: 'Human-readable label for the sync',
            },
            source_attributes: {
              type: 'object',
              description: 'Source configuration object: { connection_id, object: { type, id } } where type is "model" or "table"',
            },
            destination_attributes: {
              type: 'object',
              description: 'Destination configuration object: { connection_id, object: { object_full_name } }',
            },
            mappings: {
              type: 'array',
              description: 'Array of field mapping objects: [{ from: { type, data }, to: { type, data }, is_primary_identifier }]',
            },
            trigger: {
              type: 'string',
              description: 'Trigger type: schedule, api_trigger (default: api_trigger)',
            },
            schedule_frequency: {
              type: 'string',
              description: 'Schedule frequency if trigger is schedule: quarter_hour, hour, day, week',
            },
          },
          required: ['label', 'source_attributes', 'destination_attributes', 'mappings'],
        },
      },
      {
        name: 'update_sync',
        description: 'Update the configuration, schedule, or mappings of an existing Census sync',
        inputSchema: {
          type: 'object',
          properties: {
            sync_id: {
              type: 'number',
              description: 'Census sync ID to update',
            },
            label: {
              type: 'string',
              description: 'New label for the sync',
            },
            trigger: {
              type: 'string',
              description: 'Trigger type: schedule or api_trigger',
            },
            schedule_frequency: {
              type: 'string',
              description: 'Schedule frequency: quarter_hour, hour, day, week',
            },
            paused: {
              type: 'boolean',
              description: 'Pause (true) or unpause (false) the sync',
            },
          },
          required: ['sync_id'],
        },
      },
      {
        name: 'delete_sync',
        description: 'Permanently delete a Census sync and all its run history',
        inputSchema: {
          type: 'object',
          properties: {
            sync_id: {
              type: 'number',
              description: 'Census sync ID to delete',
            },
          },
          required: ['sync_id'],
        },
      },
      {
        name: 'trigger_sync',
        description: 'Manually trigger an immediate run of a Census sync; returns the sync run ID to poll for status',
        inputSchema: {
          type: 'object',
          properties: {
            sync_id: {
              type: 'number',
              description: 'Census sync ID to trigger',
            },
            force_full_sync: {
              type: 'boolean',
              description: 'Force a full re-sync of all records, ignoring incremental state (default: false). Note: not supported for Append syncs.',
            },
          },
          required: ['sync_id'],
        },
      },
      {
        name: 'list_sync_runs',
        description: 'List historical runs for a Census sync with status, records processed, and error counts',
        inputSchema: {
          type: 'object',
          properties: {
            sync_id: {
              type: 'number',
              description: 'Census sync ID to list runs for',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of runs per page (default: 25, max: 100)',
            },
            order: {
              type: 'string',
              description: 'Sort order: asc or desc (default: desc — most recent first)',
            },
          },
          required: ['sync_id'],
        },
      },
      {
        name: 'get_sync_run',
        description: 'Get details and metrics for a specific Census sync run including records processed, rejected, and error messages',
        inputSchema: {
          type: 'object',
          properties: {
            sync_id: {
              type: 'number',
              description: 'Census sync ID that owns the run',
            },
            sync_run_id: {
              type: 'number',
              description: 'Census sync run ID',
            },
          },
          required: ['sync_id', 'sync_run_id'],
        },
      },
      {
        name: 'list_sources',
        description: 'List all data source connections configured in the Census workspace (warehouses, databases)',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of sources per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_source',
        description: 'Get connection details and status for a specific Census data source by connection ID',
        inputSchema: {
          type: 'object',
          properties: {
            connection_id: {
              type: 'number',
              description: 'Census source connection ID',
            },
          },
          required: ['connection_id'],
        },
      },
      {
        name: 'list_destinations',
        description: 'List all destination connections in the Census workspace (CRMs, ad platforms, databases)',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of destinations per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_destination',
        description: 'Get connection details and available objects for a specific Census destination by connection ID',
        inputSchema: {
          type: 'object',
          properties: {
            connection_id: {
              type: 'number',
              description: 'Census destination connection ID',
            },
          },
          required: ['connection_id'],
        },
      },
      {
        name: 'list_models',
        description: 'List SQL/dbt models for a specific Census source connection (DEPRECATED by vendor — use Datasets API when available)',
        inputSchema: {
          type: 'object',
          properties: {
            source_id: {
              type: 'number',
              description: 'Census source connection ID (required — models are scoped per source)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of models per page (default: 25, max: 100)',
            },
          },
          required: ['source_id'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured in the Census workspace for sync run event notifications (returns name, description, events, and endpoint URL)',
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
        case 'list_syncs':
          return this.listSyncs(args);
        case 'get_sync':
          return this.getSync(args);
        case 'create_sync':
          return this.createSync(args);
        case 'update_sync':
          return this.updateSync(args);
        case 'delete_sync':
          return this.deleteSync(args);
        case 'trigger_sync':
          return this.triggerSync(args);
        case 'list_sync_runs':
          return this.listSyncRuns(args);
        case 'get_sync_run':
          return this.getSyncRun(args);
        case 'list_sources':
          return this.listSources(args);
        case 'get_source':
          return this.getSource(args);
        case 'list_destinations':
          return this.listDestinations(args);
        case 'get_destination':
          return this.getDestination(args);
        case 'list_models':
          return this.listModels(args);
        case 'list_webhooks':
          return this.listWebhooks(args);
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
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async censusGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} — ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async censusPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} — ${errBody}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async censusPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} — ${errBody}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async censusDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async listSyncs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    if (args.order) params.order = args.order as string;
    return this.censusGet('/syncs', params);
  }

  private async getSync(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sync_id) return { content: [{ type: 'text', text: 'sync_id is required' }], isError: true };
    return this.censusGet(`/syncs/${encodeURIComponent(args.sync_id as string)}`);
  }

  private async createSync(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.label || !args.source_attributes || !args.destination_attributes || !args.mappings) {
      return { content: [{ type: 'text', text: 'label, source_attributes, destination_attributes, and mappings are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      label: args.label,
      source_attributes: args.source_attributes,
      destination_attributes: args.destination_attributes,
      mappings: args.mappings,
      trigger: args.trigger ?? 'api_trigger',
    };
    if (args.schedule_frequency) body.schedule_frequency = args.schedule_frequency;
    return this.censusPost('/syncs', body);
  }

  private async updateSync(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sync_id) return { content: [{ type: 'text', text: 'sync_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.label !== undefined) body.label = args.label;
    if (args.trigger !== undefined) body.trigger = args.trigger;
    if (args.schedule_frequency !== undefined) body.schedule_frequency = args.schedule_frequency;
    if (args.paused !== undefined) body.paused = args.paused;
    return this.censusPatch(`/syncs/${encodeURIComponent(args.sync_id as string)}`, body);
  }

  private async deleteSync(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sync_id) return { content: [{ type: 'text', text: 'sync_id is required' }], isError: true };
    return this.censusDelete(`/syncs/${encodeURIComponent(args.sync_id as string)}`);
  }

  private async triggerSync(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sync_id) return { content: [{ type: 'text', text: 'sync_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (typeof args.force_full_sync === 'boolean') params.force_full_sync = String(args.force_full_sync);
    const qs = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const path = `/syncs/${encodeURIComponent(args.sync_id as string)}/trigger${qs}`;
    return this.censusPost(path, {});
  }

  private async listSyncRuns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sync_id) return { content: [{ type: 'text', text: 'sync_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    if (args.order) params.order = args.order as string;
    return this.censusGet(`/syncs/${encodeURIComponent(args.sync_id as string)}/sync_runs`, params);
  }

  private async getSyncRun(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sync_id || !args.sync_run_id) return { content: [{ type: 'text', text: 'sync_id and sync_run_id are required' }], isError: true };
    return this.censusGet(`/syncs/${encodeURIComponent(args.sync_id as string)}/sync_runs/${encodeURIComponent(args.sync_run_id as string)}`);
  }

  private async listSources(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    return this.censusGet('/sources', params);
  }

  private async getSource(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connection_id) return { content: [{ type: 'text', text: 'connection_id is required' }], isError: true };
    return this.censusGet(`/sources/${encodeURIComponent(args.connection_id as string)}`);
  }

  private async listDestinations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    return this.censusGet('/destinations', params);
  }

  private async getDestination(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connection_id) return { content: [{ type: 'text', text: 'connection_id is required' }], isError: true };
    return this.censusGet(`/destinations/${encodeURIComponent(args.connection_id as string)}`);
  }

  private async listModels(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.source_id) return { content: [{ type: 'text', text: 'source_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.page) params.page = String(args.page);
    if (args.per_page) params.per_page = String(args.per_page);
    return this.censusGet(`/sources/${encodeURIComponent(args.source_id as string)}/models`, params);
  }

  private async listWebhooks(_args: Record<string, unknown>): Promise<ToolResult> {
    return this.censusGet('/webhooks', {});
  }
}
