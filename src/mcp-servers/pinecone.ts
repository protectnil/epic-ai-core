/**
 * Pinecone MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Pinecone MCP server was found on GitHub. We build a full REST wrapper
// for complete API coverage.
//
// Base URL (control plane): https://controller.{environment}.pinecone.io
// Base URL (data plane):    https://{index-name}-{project-id}.svc.{environment}.pinecone.io
// Auth: HTTP header `Api-Key: <your-api-key>`
// Docs: https://docs.pinecone.io/
// Spec: https://api.apis.guru/v2/specs/pinecone.io/20230401.1/openapi.json (community)
// Category: ai
// Rate limits: Varies by plan. See https://docs.pinecone.io/reference/limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PineconeConfig {
  apiKey: string;
  environment?: string;
  /** Full index host URL for data-plane operations (e.g. https://my-index-abc123.svc.us-east1-gcp.pinecone.io) */
  indexHost?: string;
}

export class PineconeMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly controllerBase: string;
  private readonly indexHost: string | undefined;

  constructor(config: PineconeConfig) {
    super();
    this.apiKey = config.apiKey;
    const env = config.environment || 'us-east1-gcp';
    this.controllerBase = `https://controller.${env}.pinecone.io`;
    this.indexHost = config.indexHost;
  }

  static catalog() {
    return {
      name: 'pinecone',
      displayName: 'Pinecone',
      version: '1.0.0',
      category: 'ai',
      keywords: [
        'pinecone', 'vector database', 'embeddings', 'similarity search',
        'ai', 'machine learning', 'ml', 'semantic search', 'indexes',
        'collections', 'upsert', 'query', 'nearest neighbor', 'ann',
        'namespace', 'metadata', 'dense vector', 'sparse vector',
      ],
      toolNames: [
        'list_indexes',
        'create_index',
        'describe_index',
        'configure_index',
        'delete_index',
        'list_collections',
        'create_collection',
        'describe_collection',
        'delete_collection',
        'describe_index_stats',
        'upsert_vectors',
        'query_vectors',
        'fetch_vectors',
        'update_vector',
        'delete_vectors',
      ],
      description: 'Pinecone vector database: manage indexes and collections, upsert and query dense/sparse embedding vectors with metadata filtering, and fetch or delete vectors by ID.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Index Management ───────────────────────────────────────────────────
      {
        name: 'list_indexes',
        description: 'List all Pinecone indexes in the current project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_index',
        description: 'Create a new Pinecone vector index with specified dimension, metric, and pod configuration',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Unique name for the index',
            },
            dimension: {
              type: 'integer',
              description: 'Number of dimensions in the vector representation (must match your embeddings)',
            },
            metric: {
              type: 'string',
              description: 'Similarity metric: `cosine` (default), `euclidean`, or `dotproduct`',
            },
            pods: {
              type: 'integer',
              description: 'Number of pods for the index (default: 1)',
            },
            replicas: {
              type: 'integer',
              description: 'Number of replicas for high availability (default: 1)',
            },
            pod_type: {
              type: 'string',
              description: 'Pod type (e.g. p1.x1, p1.x2, p2.x1, s1.x1)',
            },
            metadata_config: {
              type: 'object',
              description: 'Configuration for metadata indexing. Object with `indexed` array of field names to index.',
            },
            source_collection: {
              type: 'string',
              description: 'Name of a collection to create the index from',
            },
          },
          required: ['name', 'dimension'],
        },
      },
      {
        name: 'describe_index',
        description: 'Get the configuration and status of a specific Pinecone index',
        inputSchema: {
          type: 'object',
          properties: {
            indexName: {
              type: 'string',
              description: 'Name of the index to describe',
            },
          },
          required: ['indexName'],
        },
      },
      {
        name: 'configure_index',
        description: 'Update an existing Pinecone index — change replica count or pod type (scale up only)',
        inputSchema: {
          type: 'object',
          properties: {
            indexName: {
              type: 'string',
              description: 'Name of the index to configure',
            },
            replicas: {
              type: 'integer',
              description: 'New desired number of replicas',
            },
            pod_type: {
              type: 'string',
              description: 'New pod type (can only scale up, not down)',
            },
          },
          required: ['indexName'],
        },
      },
      {
        name: 'delete_index',
        description: 'Delete a Pinecone index and all its vectors (irreversible)',
        inputSchema: {
          type: 'object',
          properties: {
            indexName: {
              type: 'string',
              description: 'Name of the index to delete',
            },
          },
          required: ['indexName'],
        },
      },
      // ── Collection Management ──────────────────────────────────────────────
      {
        name: 'list_collections',
        description: 'List all Pinecone collections in the current project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_collection',
        description: 'Create a static snapshot (collection) of an existing Pinecone index for archival or index creation',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Unique name for the collection',
            },
            source: {
              type: 'string',
              description: 'Name of the index to snapshot into this collection',
            },
          },
          required: ['name', 'source'],
        },
      },
      {
        name: 'describe_collection',
        description: 'Get the status and metadata of a specific Pinecone collection',
        inputSchema: {
          type: 'object',
          properties: {
            collectionName: {
              type: 'string',
              description: 'Name of the collection to describe',
            },
          },
          required: ['collectionName'],
        },
      },
      {
        name: 'delete_collection',
        description: 'Delete a Pinecone collection (irreversible)',
        inputSchema: {
          type: 'object',
          properties: {
            collectionName: {
              type: 'string',
              description: 'Name of the collection to delete',
            },
          },
          required: ['collectionName'],
        },
      },
      // ── Index Stats ────────────────────────────────────────────────────────
      {
        name: 'describe_index_stats',
        description: 'Get statistics for a Pinecone index: vector count, dimension, fullness, and per-namespace stats. Requires indexHost in config.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              description: 'Optional metadata filter — only count vectors matching this filter',
            },
          },
        },
      },
      // ── Vector Operations ──────────────────────────────────────────────────
      {
        name: 'upsert_vectors',
        description: 'Insert or update vectors in a Pinecone index. Each vector has an id, values array, and optional metadata. Requires indexHost in config.',
        inputSchema: {
          type: 'object',
          properties: {
            vectors: {
              type: 'array',
              description: 'Array of vector objects. Each must have `id` (string), `values` (number[]), and optional `metadata` (object) and `sparseValues`.',
            },
            namespace: {
              type: 'string',
              description: 'Namespace to write vectors into (default: empty namespace)',
            },
          },
          required: ['vectors'],
        },
      },
      {
        name: 'query_vectors',
        description: 'Query a Pinecone index for the top-K most similar vectors using a query vector or vector ID. Requires indexHost in config.',
        inputSchema: {
          type: 'object',
          properties: {
            topK: {
              type: 'integer',
              description: 'Number of top matching vectors to return',
            },
            vector: {
              type: 'array',
              description: 'Dense query vector (array of numbers). Provide this or `id`, not both.',
            },
            id: {
              type: 'string',
              description: 'ID of an existing vector to use as the query. Alternative to providing `vector`.',
            },
            namespace: {
              type: 'string',
              description: 'Namespace to query (default: empty namespace)',
            },
            filter: {
              type: 'object',
              description: 'Metadata filter to restrict query results (e.g. {"genre": {"$eq": "action"}})',
            },
            includeValues: {
              type: 'boolean',
              description: 'If true, return vector values in results (default: false)',
            },
            includeMetadata: {
              type: 'boolean',
              description: 'If true, return metadata in results (default: false)',
            },
            sparseVector: {
              type: 'object',
              description: 'Sparse query vector for hybrid search. Object with `indices` (number[]) and `values` (number[]).',
            },
          },
          required: ['topK'],
        },
      },
      {
        name: 'fetch_vectors',
        description: 'Fetch vectors by their IDs from a Pinecone index. Returns vector values and metadata. Requires indexHost in config.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              description: 'Array of vector IDs to fetch',
            },
            namespace: {
              type: 'string',
              description: 'Namespace to fetch from (default: empty namespace)',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'update_vector',
        description: "Update an existing vector's values, metadata, or sparse values in a Pinecone index. Requires indexHost in config.",
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID of the vector to update',
            },
            values: {
              type: 'array',
              description: 'New dense vector values (must match index dimension)',
            },
            setMetadata: {
              type: 'object',
              description: 'Metadata key-value pairs to set (merges with existing metadata)',
            },
            sparseValues: {
              type: 'object',
              description: 'New sparse vector data. Object with `indices` (number[]) and `values` (number[]).',
            },
            namespace: {
              type: 'string',
              description: 'Namespace containing the vector (default: empty namespace)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_vectors',
        description: 'Delete vectors from a Pinecone index by IDs, metadata filter, or delete all vectors in a namespace. Requires indexHost in config.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              description: 'Array of vector IDs to delete',
            },
            deleteAll: {
              type: 'boolean',
              description: 'If true, delete all vectors in the specified namespace',
            },
            namespace: {
              type: 'string',
              description: 'Namespace to delete from (default: empty namespace)',
            },
            filter: {
              type: 'object',
              description: 'Metadata filter — delete only vectors matching this filter',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_indexes':         return this.listIndexes();
        case 'create_index':         return this.createIndex(args);
        case 'describe_index':       return this.describeIndex(args);
        case 'configure_index':      return this.configureIndex(args);
        case 'delete_index':         return this.deleteIndex(args);
        case 'list_collections':     return this.listCollections();
        case 'create_collection':    return this.createCollection(args);
        case 'describe_collection':  return this.describeCollection(args);
        case 'delete_collection':    return this.deleteCollection(args);
        case 'describe_index_stats': return this.describeIndexStats(args);
        case 'upsert_vectors':       return this.upsertVectors(args);
        case 'query_vectors':        return this.queryVectors(args);
        case 'fetch_vectors':        return this.fetchVectors(args);
        case 'update_vector':        return this.updateVector(args);
        case 'delete_vectors':       return this.deleteVectors(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    return {
      'Api-Key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async controllerRequest(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const url = `${this.controllerBase}${path}`;
    const init: RequestInit = { method, headers: this.authHeaders };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 202 || response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async dataPlaneRequest(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    if (!this.indexHost) {
      return {
        content: [{ type: 'text', text: 'indexHost is required for data-plane operations (upsert, query, fetch, update, delete vectors, describe_index_stats). Provide it in the constructor config.' }],
        isError: true,
      };
    }
    const url = `${this.indexHost}${path}`;
    const init: RequestInit = { method, headers: this.authHeaders };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Index Management ───────────────────────────────────────────────────────

  private async listIndexes(): Promise<ToolResult> {
    return this.controllerRequest('GET', '/indexes');
  }

  private async createIndex(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.dimension) {
      return { content: [{ type: 'text', text: 'name and dimension are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, dimension: args.dimension };
    if (args.metric)            body['metric']            = args.metric;
    if (args.pods)              body['pods']              = args.pods;
    if (args.replicas)          body['replicas']          = args.replicas;
    if (args.pod_type)          body['pod_type']          = args.pod_type;
    if (args.metadata_config)   body['metadata_config']   = args.metadata_config;
    if (args.source_collection) body['source_collection'] = args.source_collection;
    return this.controllerRequest('POST', '/indexes', body);
  }

  private async describeIndex(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.indexName) {
      return { content: [{ type: 'text', text: 'indexName is required' }], isError: true };
    }
    return this.controllerRequest('GET', `/indexes/${encodeURIComponent(args.indexName as string)}`);
  }

  private async configureIndex(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.indexName) {
      return { content: [{ type: 'text', text: 'indexName is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.replicas !== undefined) body['replicas'] = args.replicas;
    if (args.pod_type)               body['pod_type'] = args.pod_type;
    return this.controllerRequest('PATCH', `/indexes/${encodeURIComponent(args.indexName as string)}`, body);
  }

  private async deleteIndex(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.indexName) {
      return { content: [{ type: 'text', text: 'indexName is required' }], isError: true };
    }
    return this.controllerRequest('DELETE', `/indexes/${encodeURIComponent(args.indexName as string)}`);
  }

  // ── Collection Management ──────────────────────────────────────────────────

  private async listCollections(): Promise<ToolResult> {
    return this.controllerRequest('GET', '/collections');
  }

  private async createCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.source) {
      return { content: [{ type: 'text', text: 'name and source are required' }], isError: true };
    }
    return this.controllerRequest('POST', '/collections', { name: args.name, source: args.source });
  }

  private async describeCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collectionName) {
      return { content: [{ type: 'text', text: 'collectionName is required' }], isError: true };
    }
    return this.controllerRequest('GET', `/collections/${encodeURIComponent(args.collectionName as string)}`);
  }

  private async deleteCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collectionName) {
      return { content: [{ type: 'text', text: 'collectionName is required' }], isError: true };
    }
    return this.controllerRequest('DELETE', `/collections/${encodeURIComponent(args.collectionName as string)}`);
  }

  // ── Index Stats ────────────────────────────────────────────────────────────

  private async describeIndexStats(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.filter) body['filter'] = args.filter;
    return this.dataPlaneRequest('POST', '/describe_index_stats', body);
  }

  // ── Vector Operations ──────────────────────────────────────────────────────

  private async upsertVectors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vectors) {
      return { content: [{ type: 'text', text: 'vectors is required' }], isError: true };
    }
    const body: Record<string, unknown> = { vectors: args.vectors };
    if (args.namespace) body['namespace'] = args.namespace;
    return this.dataPlaneRequest('POST', '/vectors/upsert', body);
  }

  private async queryVectors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.topK) {
      return { content: [{ type: 'text', text: 'topK is required' }], isError: true };
    }
    const body: Record<string, unknown> = { topK: args.topK };
    if (args.vector          !== undefined) body['vector']          = args.vector;
    if (args.id              !== undefined) body['id']              = args.id;
    if (args.namespace       !== undefined) body['namespace']       = args.namespace;
    if (args.filter          !== undefined) body['filter']          = args.filter;
    if (args.includeValues   !== undefined) body['includeValues']   = args.includeValues;
    if (args.includeMetadata !== undefined) body['includeMetadata'] = args.includeMetadata;
    if (args.sparseVector    !== undefined) body['sparseVector']    = args.sparseVector;
    return this.dataPlaneRequest('POST', '/query', body);
  }

  private async fetchVectors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ids) {
      return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    }
    const body: Record<string, unknown> = { ids: args.ids };
    if (args.namespace) body['namespace'] = args.namespace;
    return this.dataPlaneRequest('POST', '/vectors/fetch', body);
  }

  private async updateVector(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const body: Record<string, unknown> = { id: args.id };
    if (args.values       !== undefined) body['values']       = args.values;
    if (args.setMetadata  !== undefined) body['setMetadata']  = args.setMetadata;
    if (args.sparseValues !== undefined) body['sparseValues'] = args.sparseValues;
    if (args.namespace    !== undefined) body['namespace']    = args.namespace;
    return this.dataPlaneRequest('POST', '/vectors/update', body);
  }

  private async deleteVectors(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.ids       !== undefined) body['ids']       = args.ids;
    if (args.deleteAll !== undefined) body['deleteAll'] = args.deleteAll;
    if (args.namespace !== undefined) body['namespace'] = args.namespace;
    if (args.filter    !== undefined) body['filter']    = args.filter;
    return this.dataPlaneRequest('POST', '/vectors/delete', body);
  }
}
