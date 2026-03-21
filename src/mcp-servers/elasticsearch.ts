/**
 * Elasticsearch MCP Server
 * Elasticsearch REST API adapter for search, document, and cluster operations
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface ElasticsearchConfig {
  host: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

export class ElasticsearchMCPServer {
  private config: ElasticsearchConfig;
  private baseUrl: string;

  constructor(config: ElasticsearchConfig) {
    this.config = config;
    this.baseUrl = `https://${config.host}:9200`;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) {
      h['Authorization'] = `ApiKey ${this.config.apiKey}`;
    } else if (this.config.username && this.config.password) {
      const encoded = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      h['Authorization'] = `Basic ${encoded}`;
    }
    return h;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search',
        description: 'Execute a search query against one or more Elasticsearch indices',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name or comma-separated list of indices to search',
            },
            query: {
              type: 'object',
              description: 'Elasticsearch Query DSL object (e.g. { "match": { "field": "value" } })',
            },
            size: {
              type: 'number',
              description: 'Number of hits to return (default 10)',
            },
            from: {
              type: 'number',
              description: 'Starting offset for pagination (default 0)',
            },
            sort: {
              type: 'array',
              description: 'Array of sort criteria objects',
              items: { type: 'object' },
            },
            _source: {
              type: 'array',
              description: 'List of fields to include in the response',
              items: { type: 'string' },
            },
          },
          required: ['index', 'query'],
        },
      },
      {
        name: 'get_document',
        description: 'Retrieve a single document from an index by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            index: {
              type: 'string',
              description: 'Index name',
            },
            id: {
              type: 'string',
              description: 'Document ID',
            },
            _source: {
              type: 'array',
              description: 'List of fields to include in the response',
              items: { type: 'string' },
            },
          },
          required: ['index', 'id'],
        },
      },
      {
        name: 'index_document',
        description: 'Index (create or replace) a document in an Elasticsearch index',
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
              description: 'The document body to index',
            },
          },
          required: ['index', 'document'],
        },
      },
      {
        name: 'list_indices',
        description: 'List all indices with their health, status, and document counts',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Index pattern to filter results (e.g. logs-*, default *)',
            },
            health: {
              type: 'string',
              enum: ['green', 'yellow', 'red'],
              description: 'Filter indices by health status',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_cluster_health',
        description: 'Return the health status and statistics for the Elasticsearch cluster',
        inputSchema: {
          type: 'object',
          properties: {
            level: {
              type: 'string',
              enum: ['cluster', 'indices', 'shards'],
              description: 'Level of detail to return (default cluster)',
            },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search': {
          const body: Record<string, unknown> = { query: args.query };
          if (args.size !== undefined) body['size'] = args.size;
          if (args.from !== undefined) body['from'] = args.from;
          if (args.sort !== undefined) body['sort'] = args.sort;
          if (args._source !== undefined) body['_source'] = args._source;
          const response = await fetch(
            `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_search`,
            {
              method: 'POST',
              headers: this.headers(),
              body: JSON.stringify(body),
            }
          );
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_document': {
          const params = new URLSearchParams();
          if (args._source) params.set('_source', (args._source as string[]).join(','));
          const response = await fetch(
            `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_doc/${encodeURIComponent(String(args.id))}?${params}`,
            { headers: this.headers() }
          );
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'index_document': {
          const url = args.id
            ? `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_doc/${encodeURIComponent(String(args.id))}`
            : `${this.baseUrl}/${encodeURIComponent(String(args.index))}/_doc`;
          const response = await fetch(url, {
            method: args.id ? 'PUT' : 'POST',
            headers: this.headers(),
            body: JSON.stringify(args.document),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_indices': {
          const pattern = args.pattern ? String(args.pattern) : '*';
          const params = new URLSearchParams({ format: 'json', v: 'true' });
          if (args.health) params.set('health', String(args.health));
          const response = await fetch(
            `${this.baseUrl}/_cat/indices/${encodeURIComponent(pattern)}?${params}`,
            { headers: this.headers() }
          );
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_cluster_health': {
          const params = new URLSearchParams();
          if (args.level) params.set('level', String(args.level));
          const response = await fetch(`${this.baseUrl}/_cluster/health?${params}`, {
            headers: this.headers(),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
