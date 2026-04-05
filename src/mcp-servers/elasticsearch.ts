/**
 * Elasticsearch MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/elastic/mcp-server-elasticsearch — transport: stdio, streamable-HTTP, auth: API key or Basic
// NOTE: npm package @elastic/mcp-server-elasticsearch v0.3.1 is deprecated; current release is v0.4.6 (Oct 2025) via Docker.
//   For Elasticsearch 9.2+ and Serverless, the hosted Elastic Agent Builder MCP endpoint supersedes the standalone server.
//   Official MCP tools (5): list_indices, get_mappings, search, esql, get_shards — read-only, no write/management ops.
// Our adapter covers: 18 tools (full CRUD + cluster management). Vendor MCP covers: 5 tools (read/search only).
// Recommendation: use-both — Vendor MCP exposes esql and get_shards not in our REST adapter; our REST adapter covers
//   write ops (index_document, update_document, delete_document, bulk, create_index, delete_index, put_mapping,
//   update_index_settings, reindex) and cluster management not in the MCP. Use vendor MCP for read/search; REST adapter
//   for all write and management operations.
//
// Base URL: https://{host}:{port}  (self-hosted) or Elastic Cloud endpoint URL
// Auth: API key — "ApiKey {base64(id:api_key)}" or Basic — "Basic {base64(user:pass)}"
// Docs: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/rest-apis.html
//   https://www.elastic.co/docs/api/doc/elasticsearch/v8/
// Rate limits: Not externally documented; governed by cluster circuit breakers and thread pool capacity

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ElasticsearchConfig {
  baseUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

export class ElasticsearchMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string | null;

  constructor(config: ElasticsearchConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    if (config.apiKey) {
      this.authHeader = `ApiKey ${config.apiKey}`;
    } else if (config.username && config.password) {
      this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    } else {
      this.authHeader = null;
    }
  }

  static catalog() {
    return {
      name: 'elasticsearch',
      displayName: 'Elasticsearch',
      version: '1.0.0',
      category: 'data' as const,
      keywords: [
        'elasticsearch', 'elastic', 'es', 'search', 'index', 'indices',
        'query', 'dsl', 'full-text', 'aggregation', 'mapping', 'cluster',
        'shard', 'snapshot', 'reindex', 'bulk', 'document', 'logs',
        'metrics', 'vector', 'knn',
      ],
      toolNames: [
        'search', 'get_document', 'index_document', 'update_document',
        'delete_document', 'bulk', 'list_indices', 'create_index',
        'delete_index', 'get_mappings', 'put_mapping', 'get_index_settings',
        'update_index_settings', 'get_cluster_health', 'get_cluster_stats',
        'list_aliases', 'reindex', 'get_index_stats',
      ],
      description: 'Elasticsearch full API: search, index documents, manage indices, mappings, aliases, cluster health, snapshots, and reindex operations across Elasticsearch 8.x clusters.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search',
        description: 'Execute an Elasticsearch Query DSL search against one or more indices with optional aggregations, pagination, and field filtering',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name, comma-separated list, or wildcard pattern (e.g. logs-*, .alerts-*)',
            },
            query: {
              type: 'object',
              description: 'Elasticsearch Query DSL object (e.g. {"match":{"message":"error"}} or {"bool":{"filter":[...]}})',
            },
            size: {
              type: 'number',
              description: 'Number of hits to return (default: 10, max: 10000)',
            },
            from: {
              type: 'number',
              description: 'Starting offset for pagination (default: 0)',
            },
            sort: {
              type: 'array',
              description: 'Sort criteria array (e.g. [{"@timestamp":{"order":"desc"}}])',
            },
            _source: {
              type: 'array',
              description: 'Fields to include in each hit (default: all fields)',
            },
            aggs: {
              type: 'object',
              description: 'Aggregations definition object for analytics and faceting',
            },
            track_total_hits: {
              type: 'boolean',
              description: 'Return exact hit count (default: true; set false for large datasets)',
            },
          },
          required: ['index', 'query'],
        },
      },
      {
        name: 'get_document',
        description: 'Retrieve a single Elasticsearch document by index name and document ID',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name',
            },
            id: {
              type: 'string',
              description: 'Document _id',
            },
            _source: {
              type: 'array',
              description: 'Fields to include (optional; returns all fields by default)',
            },
          },
          required: ['index', 'id'],
        },
      },
      {
        name: 'index_document',
        description: 'Index (create or replace) a document in Elasticsearch; auto-generates ID if not provided',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name',
            },
            id: {
              type: 'string',
              description: 'Document ID (omit to auto-generate)',
            },
            document: {
              type: 'object',
              description: 'Document body to index',
            },
            pipeline: {
              type: 'string',
              description: 'Ingest pipeline ID to apply on indexing (optional)',
            },
            refresh: {
              type: 'string',
              description: 'Refresh policy: true (immediate), false (none), or wait_for (wait for next refresh)',
            },
          },
          required: ['index', 'document'],
        },
      },
      {
        name: 'update_document',
        description: 'Partially update an existing Elasticsearch document using a doc partial object or a Painless script',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name',
            },
            id: {
              type: 'string',
              description: 'Document _id to update',
            },
            doc: {
              type: 'object',
              description: 'Partial document fields to merge into the existing document',
            },
            script: {
              type: 'object',
              description: 'Painless script object for scripted update (e.g. {"source":"ctx._source.count += params.inc","params":{"inc":1}})',
            },
            retry_on_conflict: {
              type: 'number',
              description: 'Number of times to retry on version conflict (default: 0)',
            },
          },
          required: ['index', 'id'],
        },
      },
      {
        name: 'delete_document',
        description: 'Delete a single Elasticsearch document by index name and document ID',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name',
            },
            id: {
              type: 'string',
              description: 'Document _id to delete',
            },
            refresh: {
              type: 'string',
              description: 'Refresh policy: true, false, or wait_for',
            },
          },
          required: ['index', 'id'],
        },
      },
      {
        name: 'bulk',
        description: 'Execute bulk index, create, update, and delete operations in a single request for high-throughput ingestion',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Default index for operations that do not specify one (optional)',
            },
            operations: {
              type: 'array',
              description: 'Array of alternating action/source pairs. Each action is {index|create|update|delete:{_index,_id}}; each source is the document body.',
            },
            refresh: {
              type: 'string',
              description: 'Refresh policy: true, false, or wait_for',
            },
          },
          required: ['operations'],
        },
      },
      {
        name: 'list_indices',
        description: 'List Elasticsearch indices with health status, document count, and store size using the _cat/indices API',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Index name pattern (e.g. logs-*, _all). Default: * (all indices)',
            },
            health: {
              type: 'string',
              description: 'Filter by health: green, yellow, or red (optional)',
            },
            s: {
              type: 'string',
              description: 'Sort column (e.g. index, docs.count, store.size). Default: index',
            },
          },
        },
      },
      {
        name: 'create_index',
        description: 'Create a new Elasticsearch index with optional settings (shards, replicas) and mappings',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name to create',
            },
            settings: {
              type: 'object',
              description: 'Index settings (e.g. {"number_of_shards":1,"number_of_replicas":1})',
            },
            mappings: {
              type: 'object',
              description: 'Index mappings (e.g. {"properties":{"@timestamp":{"type":"date"},"message":{"type":"text"}}})',
            },
            aliases: {
              type: 'object',
              description: 'Index aliases to create with the index (optional)',
            },
          },
          required: ['index'],
        },
      },
      {
        name: 'delete_index',
        description: 'Delete one or more Elasticsearch indices by name or pattern — this operation is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name, comma-separated list, or wildcard pattern to delete',
            },
            allow_no_indices: {
              type: 'boolean',
              description: 'Do not fail if no indices match the pattern (default: true)',
            },
          },
          required: ['index'],
        },
      },
      {
        name: 'get_mappings',
        description: 'Retrieve field mapping definitions for one or more Elasticsearch indices',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name, comma-separated list, or wildcard (e.g. logs-*, _all)',
            },
          },
          required: ['index'],
        },
      },
      {
        name: 'put_mapping',
        description: 'Add new field mappings to an existing Elasticsearch index (cannot change existing field types)',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name or comma-separated list to update',
            },
            properties: {
              type: 'object',
              description: 'New field mappings to add (e.g. {"new_field":{"type":"keyword"},"other":{"type":"long"}})',
            },
          },
          required: ['index', 'properties'],
        },
      },
      {
        name: 'get_index_settings',
        description: 'Retrieve the current settings for one or more Elasticsearch indices including shard count, replicas, and custom settings',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name or pattern (e.g. logs-*, _all)',
            },
            setting_name: {
              type: 'string',
              description: 'Specific setting to retrieve (e.g. index.number_of_replicas). Omit for all settings.',
            },
          },
          required: ['index'],
        },
      },
      {
        name: 'update_index_settings',
        description: 'Update dynamic settings on an existing Elasticsearch index such as replica count, refresh interval, and max result window',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name or pattern to update',
            },
            settings: {
              type: 'object',
              description: 'Dynamic settings to update (e.g. {"index":{"number_of_replicas":2,"refresh_interval":"30s"}})',
            },
          },
          required: ['index', 'settings'],
        },
      },
      {
        name: 'get_cluster_health',
        description: 'Return cluster health status (green/yellow/red), node count, shard counts, and pending tasks',
        inputSchema: {
          type: 'object',
          properties: {
            level: {
              type: 'string',
              description: 'Detail level: cluster (default), indices, or shards',
            },
            index: {
              type: 'string',
              description: 'Limit health check to specific indices (optional)',
            },
            wait_for_status: {
              type: 'string',
              description: 'Wait until cluster reaches this status before returning: green, yellow, or red',
            },
          },
        },
      },
      {
        name: 'get_cluster_stats',
        description: 'Return detailed cluster statistics including node metrics, JVM heap, OS info, and index totals',
        inputSchema: {
          type: 'object',
          properties: {
            node_id: {
              type: 'string',
              description: 'Comma-separated node IDs or node names to filter stats (optional; default: all nodes)',
            },
          },
        },
      },
      {
        name: 'list_aliases',
        description: 'List all index aliases with their target indices, filter definitions, and routing values',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Alias name or pattern to filter (e.g. logs-current, *-write). Omit for all aliases.',
            },
            index: {
              type: 'string',
              description: 'Limit to aliases on this index or pattern (optional)',
            },
          },
        },
      },
      {
        name: 'reindex',
        description: 'Copy documents from a source index to a destination index with optional query filter and script transform',
        inputSchema: {
          type: 'object',
          properties: {
            source_index: {
              type: 'string',
              description: 'Source index, alias, or data stream to copy from',
            },
            dest_index: {
              type: 'string',
              description: 'Destination index to copy documents into',
            },
            query: {
              type: 'object',
              description: 'Elasticsearch query DSL to filter which source documents to copy (optional)',
            },
            script: {
              type: 'object',
              description: 'Painless script to transform each document during reindex (optional)',
            },
            conflicts: {
              type: 'string',
              description: 'Conflict handling: abort (default, stop on conflict) or proceed (skip conflicting docs)',
            },
          },
          required: ['source_index', 'dest_index'],
        },
      },
      {
        name: 'get_index_stats',
        description: 'Return detailed indexing, search, merge, and cache statistics for one or more indices',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name or pattern (e.g. logs-*, _all)',
            },
            metric: {
              type: 'string',
              description: 'Specific metric group to return (e.g. search, indexing, store, merge). Omit for all metrics.',
            },
          },
          required: ['index'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search':
          return await this.search(args);
        case 'get_document':
          return await this.getDocument(args);
        case 'index_document':
          return await this.indexDocument(args);
        case 'update_document':
          return await this.updateDocument(args);
        case 'delete_document':
          return await this.deleteDocument(args);
        case 'bulk':
          return await this.bulk(args);
        case 'list_indices':
          return await this.listIndices(args);
        case 'create_index':
          return await this.createIndex(args);
        case 'delete_index':
          return await this.deleteIndex(args);
        case 'get_mappings':
          return await this.getMappings(args);
        case 'put_mapping':
          return await this.putMapping(args);
        case 'get_index_settings':
          return await this.getIndexSettings(args);
        case 'update_index_settings':
          return await this.updateIndexSettings(args);
        case 'get_cluster_health':
          return await this.getClusterHealth(args);
        case 'get_cluster_stats':
          return await this.getClusterStats(args);
        case 'list_aliases':
          return await this.listAliases(args);
        case 'reindex':
          return await this.reindex(args);
        case 'get_index_stats':
          return await this.getIndexStats(args);
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

  private getHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authHeader) h['Authorization'] = this.authHeader;
    return h;
  }


  private async esfetch(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.getHeaders(), ...init });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Elasticsearch error ${response.status} ${response.statusText}${errBody ? ': ' + errBody.slice(0, 500) : ''}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Elasticsearch returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async search(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.index || !args.query) {
      return { content: [{ type: 'text', text: 'index and query are required' }], isError: true };
    }
    const body: Record<string, unknown> = { query: args.query };
    if (args.size !== undefined) body.size = args.size;
    if (args.from !== undefined) body.from = args.from;
    if (args.sort) body.sort = args.sort;
    if (args._source) body._source = args._source;
    if (args.aggs) body.aggs = args.aggs;
    if (args.track_total_hits !== undefined) body.track_total_hits = args.track_total_hits;
    return this.esfetch(
      `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_search`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async getDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.index || !args.id) {
      return { content: [{ type: 'text', text: 'index and id are required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args._source) params.set('_source', (args._source as string[]).join(','));
    const qs = params.toString() ? `?${params}` : '';
    return this.esfetch(
      `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_doc/${encodeURIComponent(String(args.id))}${qs}`,
    );
  }

  private async indexDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.index || !args.document) {
      return { content: [{ type: 'text', text: 'index and document are required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.pipeline) params.set('pipeline', String(args.pipeline));
    if (args.refresh) params.set('refresh', String(args.refresh));
    const qs = params.toString() ? `?${params}` : '';
    const url = args.id
      ? `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_doc/${encodeURIComponent(String(args.id))}${qs}`
      : `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_doc${qs}`;
    return this.esfetch(url, {
      method: args.id ? 'PUT' : 'POST',
      body: JSON.stringify(args.document),
    });
  }

  private async updateDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.index || !args.id) {
      return { content: [{ type: 'text', text: 'index and id are required' }], isError: true };
    }
    if (!args.doc && !args.script) {
      return { content: [{ type: 'text', text: 'Either doc or script is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.doc) body.doc = args.doc;
    if (args.script) body.script = args.script;
    const params = new URLSearchParams();
    if (args.retry_on_conflict !== undefined) params.set('retry_on_conflict', String(args.retry_on_conflict));
    const qs = params.toString() ? `?${params}` : '';
    return this.esfetch(
      `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_update/${encodeURIComponent(String(args.id))}${qs}`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async deleteDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.index || !args.id) {
      return { content: [{ type: 'text', text: 'index and id are required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.refresh) params.set('refresh', String(args.refresh));
    const qs = params.toString() ? `?${params}` : '';
    return this.esfetch(
      `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_doc/${encodeURIComponent(String(args.id))}${qs}`,
      { method: 'DELETE' },
    );
  }

  private async bulk(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.operations || !Array.isArray(args.operations)) {
      return { content: [{ type: 'text', text: 'operations array is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.refresh) params.set('refresh', String(args.refresh));
    const qs = params.toString() ? `?${params}` : '';
    const baseUrl = args.index
      ? `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_bulk${qs}`
      : `${this.baseUrl}/_bulk${qs}`;
    // Bulk format: NDJSON — each operation is two lines: action then source
    const ndjson = (args.operations as unknown[])
      .map((op) => JSON.stringify(op))
      .join('\n') + '\n';
    const headers = { ...this.getHeaders(), 'Content-Type': 'application/x-ndjson' };
    return this.esfetch(baseUrl, { method: 'POST', headers, body: ndjson } as RequestInit);
  }

  private async listIndices(args: Record<string, unknown>): Promise<ToolResult> {
    const pattern = args.pattern ? String(args.pattern) : '*';
    const params = new URLSearchParams({ format: 'json', v: 'true' });
    if (args.health) params.set('health', String(args.health));
    if (args.s) params.set('s', String(args.s));
    return this.esfetch(
      `${this.baseUrl}/_cat/indices/${encodeURIComponent(pattern)}?${params}`,
    );
  }

  private async createIndex(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.index) {
      return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.settings) body.settings = args.settings;
    if (args.mappings) body.mappings = args.mappings;
    if (args.aliases) body.aliases = args.aliases;
    return this.esfetch(
      `${this.baseUrl}/${encodeURIComponent(String(args.index))}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  private async deleteIndex(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.index) {
      return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.allow_no_indices !== undefined) params.set('allow_no_indices', String(args.allow_no_indices));
    const qs = params.toString() ? `?${params}` : '';
    return this.esfetch(
      `${this.baseUrl}/${encodeURIComponent(String(args.index))}${qs}`,
      { method: 'DELETE' },
    );
  }

  private async getMappings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.index) {
      return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    }
    return this.esfetch(
      `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_mapping`,
    );
  }

  private async putMapping(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.index || !args.properties) {
      return { content: [{ type: 'text', text: 'index and properties are required' }], isError: true };
    }
    return this.esfetch(
      `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_mapping`,
      { method: 'PUT', body: JSON.stringify({ properties: args.properties }) },
    );
  }

  private async getIndexSettings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.index) {
      return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    }
    const settingPath = args.setting_name ? `/${encodeURIComponent(String(args.setting_name))}` : '';
    return this.esfetch(
      `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_settings${settingPath}`,
    );
  }

  private async updateIndexSettings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.index || !args.settings) {
      return { content: [{ type: 'text', text: 'index and settings are required' }], isError: true };
    }
    return this.esfetch(
      `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_settings`,
      { method: 'PUT', body: JSON.stringify(args.settings) },
    );
  }

  private async getClusterHealth(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.level) params.set('level', String(args.level));
    if (args.wait_for_status) params.set('wait_for_status', String(args.wait_for_status));
    const indexPath = args.index ? `/${encodeURIComponent(String(args.index))}` : '';
    return this.esfetch(`${this.baseUrl}/_cluster/health${indexPath}?${params}`);
  }

  private async getClusterStats(args: Record<string, unknown>): Promise<ToolResult> {
    const nodePath = args.node_id ? `/nodes/${encodeURIComponent(String(args.node_id))}` : '';
    return this.esfetch(`${this.baseUrl}/_cluster/stats${nodePath}`);
  }

  private async listAliases(args: Record<string, unknown>): Promise<ToolResult> {
    const indexPath = args.index ? `/${encodeURIComponent(String(args.index))}` : '';
    const aliasPath = args.name ? `/${encodeURIComponent(String(args.name))}` : '';
    return this.esfetch(`${this.baseUrl}${indexPath}/_alias${aliasPath}`);
  }

  private async reindex(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.source_index || !args.dest_index) {
      return { content: [{ type: 'text', text: 'source_index and dest_index are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      source: { index: args.source_index },
      dest: { index: args.dest_index },
    };
    if (args.query) (body.source as Record<string, unknown>).query = args.query;
    if (args.script) body.script = args.script;
    if (args.conflicts) body.conflicts = args.conflicts;
    return this.esfetch(`${this.baseUrl}/_reindex`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async getIndexStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.index) {
      return { content: [{ type: 'text', text: 'index is required' }], isError: true };
    }
    const metricPath = args.metric ? `/${encodeURIComponent(String(args.metric))}` : '';
    return this.esfetch(
      `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_stats${metricPath}`,
    );
  }
}
