/**
 * Hightouch MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Hightouch MCP server was found on GitHub (github.com/hightouchio) or npmjs.com.
// Recommendation: use-rest-api — no vendor MCP exists.
//
// Base URL: https://api.hightouch.com/api/v1
// Auth: Bearer token — Authorization: Bearer <api_key>
//       API key must be created by an Admin user in Hightouch workspace Settings > API keys
// Docs: https://hightouch.com/docs/api-reference
// Rate limits: 200 requests per 10 seconds per workspace
//
// Our adapter covers: 11 tools (core read + trigger operations). Vendor MCP covers: 0 tools (none).
// Vendor REST API exposes 32 endpoints total. Our adapter covers the core sync/model/source/destination
// read operations plus sync run history and trigger. Not yet implemented: PATCH update operations
// (update_sync, update_model, update_source, update_destination), POST create operations
// (create_sync, create_model, create_source, create_destination), trigger_sync_by_slug
// (POST /syncs/trigger with syncSlug body param), Decision Engine flows/messages, Event Contracts,
// and IDR (Identity Resolution) run operations.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HightouchConfig {
  apiKey: string;
  baseUrl?: string;
}

export class HightouchMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: HightouchConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.hightouch.com/api/v1';
  }

  static catalog() {
    return {
      name: 'hightouch',
      displayName: 'Hightouch',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'hightouch', 'reverse etl', 'data sync', 'data activation', 'sync',
        'warehouse', 'destination', 'model', 'source', 'etl pipeline',
      ],
      toolNames: [
        'list_syncs', 'get_sync', 'trigger_sync', 'list_sync_runs', 'get_sync_run',
        'list_models', 'get_model', 'list_sources', 'get_source',
        'list_destinations', 'get_destination',
      ],
      description: 'Hightouch reverse ETL: list and inspect syncs, models, sources, and destinations; trigger sync runs and monitor sync execution status.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_syncs',
        description: 'List all syncs in the Hightouch workspace with optional filters for model or destination',
        inputSchema: {
          type: 'object',
          properties: {
            modelId: {
              type: 'number',
              description: 'Filter syncs by model ID',
            },
            destinationId: {
              type: 'number',
              description: 'Filter syncs by destination ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of syncs to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            orderBy: {
              type: 'string',
              description: 'Field to sort by: id, name, createdAt, updatedAt (default: id)',
            },
          },
        },
      },
      {
        name: 'get_sync',
        description: 'Retrieve detailed configuration of a specific Hightouch sync by sync ID',
        inputSchema: {
          type: 'object',
          properties: {
            sync_id: {
              type: 'number',
              description: 'Numeric Hightouch sync ID',
            },
          },
          required: ['sync_id'],
        },
      },
      {
        name: 'trigger_sync',
        description: 'Manually trigger a sync run for a specific sync, with option for full re-sync',
        inputSchema: {
          type: 'object',
          properties: {
            sync_id: {
              type: 'number',
              description: 'Numeric Hightouch sync ID to trigger',
            },
            full_resync: {
              type: 'boolean',
              description: 'If true, re-syncs all records instead of only changed ones (default: false)',
            },
          },
          required: ['sync_id'],
        },
      },
      {
        name: 'list_sync_runs',
        description: 'List historical sync runs for a specific sync, showing status and record counts',
        inputSchema: {
          type: 'object',
          properties: {
            sync_id: {
              type: 'number',
              description: 'Numeric Hightouch sync ID to retrieve runs for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of runs to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            orderBy: {
              type: 'string',
              description: 'Sort runs by: id, startedAt, finishedAt (default: startedAt descending)',
            },
          },
          required: ['sync_id'],
        },
      },
      {
        name: 'get_sync_run',
        description: 'Retrieve the status and statistics of a specific sync run by sync ID and run ID',
        inputSchema: {
          type: 'object',
          properties: {
            sync_id: {
              type: 'number',
              description: 'Numeric Hightouch sync ID',
            },
            sync_request_id: {
              type: 'number',
              description: 'Numeric sync request (run) ID',
            },
          },
          required: ['sync_id', 'sync_request_id'],
        },
      },
      {
        name: 'list_models',
        description: 'List all models (SQL queries or dbt models) defined in the Hightouch workspace',
        inputSchema: {
          type: 'object',
          properties: {
            sourceId: {
              type: 'number',
              description: 'Filter models by source ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of models to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            orderBy: {
              type: 'string',
              description: 'Field to sort by: id, name, createdAt, updatedAt (default: id)',
            },
          },
        },
      },
      {
        name: 'get_model',
        description: 'Retrieve detailed configuration of a specific Hightouch model including its SQL query or dbt reference',
        inputSchema: {
          type: 'object',
          properties: {
            model_id: {
              type: 'number',
              description: 'Numeric Hightouch model ID',
            },
          },
          required: ['model_id'],
        },
      },
      {
        name: 'list_sources',
        description: 'List all data sources (warehouses) connected to the Hightouch workspace',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of sources to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_source',
        description: 'Retrieve configuration details of a specific Hightouch data source by source ID',
        inputSchema: {
          type: 'object',
          properties: {
            source_id: {
              type: 'number',
              description: 'Numeric Hightouch source ID',
            },
          },
          required: ['source_id'],
        },
      },
      {
        name: 'list_destinations',
        description: 'List all sync destinations (CRMs, ad platforms, data tools) connected to the Hightouch workspace',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of destinations to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_destination',
        description: 'Retrieve configuration details of a specific Hightouch destination by destination ID',
        inputSchema: {
          type: 'object',
          properties: {
            destination_id: {
              type: 'number',
              description: 'Numeric Hightouch destination ID',
            },
          },
          required: ['destination_id'],
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
        case 'trigger_sync':
          return this.triggerSync(args);
        case 'list_sync_runs':
          return this.listSyncRuns(args);
        case 'get_sync_run':
          return this.getSyncRun(args);
        case 'list_models':
          return this.listModels(args);
        case 'get_model':
          return this.getModel(args);
        case 'list_sources':
          return this.listSources(args);
        case 'get_source':
          return this.getSource(args);
        case 'list_destinations':
          return this.listDestinations(args);
        case 'get_destination':
          return this.getDestination(args);
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
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSyncs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.modelId) params.modelId = String(args.modelId);
    if (args.destinationId) params.destinationId = String(args.destinationId);
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    if (args.orderBy) params.orderBy = args.orderBy as string;
    return this.get('/syncs', params);
  }

  private async getSync(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sync_id) return { content: [{ type: 'text', text: 'sync_id is required' }], isError: true };
    return this.get(`/syncs/${encodeURIComponent(args.sync_id as string)}`);
  }

  private async triggerSync(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sync_id) return { content: [{ type: 'text', text: 'sync_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (typeof args.full_resync === 'boolean') body.fullResync = args.full_resync;
    return this.post(`/syncs/${encodeURIComponent(args.sync_id as string)}/trigger`, body);
  }

  private async listSyncRuns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sync_id) return { content: [{ type: 'text', text: 'sync_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    if (args.orderBy) params.orderBy = args.orderBy as string;
    return this.get(`/syncs/${encodeURIComponent(args.sync_id as string)}/sync-requests`, params);
  }

  private async getSyncRun(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sync_id || !args.sync_request_id) {
      return { content: [{ type: 'text', text: 'sync_id and sync_request_id are required' }], isError: true };
    }
    return this.get(`/syncs/${encodeURIComponent(args.sync_id as string)}/sync-requests/${encodeURIComponent(args.sync_request_id as string)}`);
  }

  private async listModels(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.sourceId) params.sourceId = String(args.sourceId);
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    if (args.orderBy) params.orderBy = args.orderBy as string;
    return this.get('/models', params);
  }

  private async getModel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model_id) return { content: [{ type: 'text', text: 'model_id is required' }], isError: true };
    return this.get(`/models/${encodeURIComponent(args.model_id as string)}`);
  }

  private async listSources(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    return this.get('/sources', params);
  }

  private async getSource(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.source_id) return { content: [{ type: 'text', text: 'source_id is required' }], isError: true };
    return this.get(`/sources/${encodeURIComponent(args.source_id as string)}`);
  }

  private async listDestinations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    if (args.offset) params.offset = String(args.offset);
    return this.get('/destinations', params);
  }

  private async getDestination(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.destination_id) return { content: [{ type: 'text', text: 'destination_id is required' }], isError: true };
    return this.get(`/destinations/${encodeURIComponent(args.destination_id as string)}`);
  }
}
