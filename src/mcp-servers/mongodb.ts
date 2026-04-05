/**
 * MongoDB Atlas Data API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/mongodb-js/mongodb-mcp-server (renamed to mongodb-mcp-server on npm) — transport: stdio, auth: connection string + Atlas API credentials
// The official MongoDB MCP server is actively maintained by MongoDB (mongodb-js org). npm package
// @mongodb-js/mongodb-mcp-server deprecated and renamed to mongodb-mcp-server. Current as of 2026.
// It exposes 30+ tools: database tools (find, aggregate, count, insert-one, insert-many, update-one,
//   update-many, delete-one, delete-many, create-index, drop-index, rename-collection, create-collection,
//   drop-collection, drop-database, list-databases, list-collections, collection-indexes, db-stats, explain, export)
//   plus Atlas management tools (atlas-list-orgs, atlas-list-projects, atlas-create-project,
//   atlas-list-clusters, atlas-inspect-cluster, atlas-create-free-cluster, atlas-connect-cluster,
//   atlas-list-db-users, atlas-create-db-user, atlas-create-access-list, atlas-inspect-access-list,
//   atlas-list-alerts, atlas-get-performance-advisor) + local Atlas tools.
// Recommendation: use-both — vendor MCP has Atlas management tools and advanced DB tools (explain, export,
//   create-index, drop-index, collection-schema, db-stats, list-databases, list-collections, rename-collection,
//   create-collection, drop-collection, drop-database) not covered by Data API.
//   Our REST adapter covers the Data API HTTPS surface (no driver, no npm, firewall-friendly, air-gapped).
// NOTE: The MongoDB Atlas Data API (app-services endpoint) reached End-of-Life in September 2025.
// This adapter targets the legacy Data API v1 for existing deployments still using it.
// New deployments should use the official MCP server with a connection string.
//
// Base URL: https://data.mongodb-api.com/app/{appId}/endpoint/data/v1
// Auth: api-key header
// Docs: https://www.mongodb.com/docs/api/doc/atlas-data-api-v1/
// Rate limits: Not documented; subject to Atlas App Services tier limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MongoDBConfig {
  appId: string;
  apiKey: string;
  dataSource: string;
  database: string;
  /** Override base URL (optional) */
  baseUrl?: string;
}

export class MongoDBMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly dataSource: string;
  private readonly database: string;
  private readonly baseUrl: string;

  constructor(config: MongoDBConfig) {
    super();
    this.apiKey = config.apiKey;
    this.dataSource = config.dataSource;
    this.database = config.database;
    this.baseUrl = config.baseUrl ?? `https://data.mongodb-api.com/app/${config.appId}/endpoint/data/v1`;
  }

  static catalog() {
    return {
      name: 'mongodb',
      displayName: 'MongoDB',
      version: '1.0.0',
      category: 'data' as const,
      keywords: [
        'mongodb', 'atlas', 'nosql', 'document-database', 'find', 'aggregate',
        'insert', 'update', 'delete', 'collection', 'database', 'data-api',
        'pipeline', 'filter', 'query',
      ],
      toolNames: [
        'find', 'find_one', 'insert_one', 'insert_many', 'update_one', 'update_many',
        'delete_one', 'delete_many', 'aggregate', 'count_documents',
      ],
      description: 'MongoDB Atlas Data API: find, insert, update, delete, and aggregate documents in Atlas collections over HTTPS without a MongoDB driver.',
      author: 'protectnil' as const,
    };
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'api-key': this.apiKey,
    };
  }

  private async doAction(endpoint: string, payload: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: !response.ok,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'find',
        description: 'Query multiple documents from a MongoDB collection with optional filter, projection, sort, limit, and skip.',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Collection name to query',
            },
            filter: {
              type: 'object',
              description: 'MongoDB query filter document (default: {} — returns all documents)',
            },
            projection: {
              type: 'object',
              description: 'Fields to include (1) or exclude (0), e.g. { "name": 1, "_id": 0 } (optional)',
            },
            sort: {
              type: 'object',
              description: 'Sort specification, e.g. { "createdAt": -1 } for descending (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of documents to return (optional)',
            },
            skip: {
              type: 'number',
              description: 'Number of documents to skip for pagination (optional)',
            },
            database: {
              type: 'string',
              description: 'Database name override (defaults to configured database)',
            },
          },
          required: ['collection'],
        },
      },
      {
        name: 'find_one',
        description: 'Find the first document in a MongoDB collection matching a filter. Returns null if no document matches.',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Collection name to query',
            },
            filter: {
              type: 'object',
              description: 'MongoDB query filter document (default: {} — returns first document)',
            },
            projection: {
              type: 'object',
              description: 'Fields to include or exclude (optional)',
            },
            database: {
              type: 'string',
              description: 'Database name override (optional)',
            },
          },
          required: ['collection'],
        },
      },
      {
        name: 'insert_one',
        description: 'Insert a single document into a MongoDB collection. Returns the inserted document ID.',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Collection name to insert into',
            },
            document: {
              type: 'object',
              description: 'Document object to insert',
            },
            database: {
              type: 'string',
              description: 'Database name override (optional)',
            },
          },
          required: ['collection', 'document'],
        },
      },
      {
        name: 'insert_many',
        description: 'Insert multiple documents into a MongoDB collection in a single request. Returns inserted document IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Collection name to insert into',
            },
            documents: {
              type: 'array',
              description: 'Array of document objects to insert',
              items: { type: 'object' },
            },
            database: {
              type: 'string',
              description: 'Database name override (optional)',
            },
          },
          required: ['collection', 'documents'],
        },
      },
      {
        name: 'update_one',
        description: 'Update the first document matching a filter in a MongoDB collection. Supports upsert.',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Collection name',
            },
            filter: {
              type: 'object',
              description: 'Query filter to match the document to update',
            },
            update: {
              type: 'object',
              description: 'Update operator document, e.g. { "$set": { "status": "active" } } or { "$inc": { "count": 1 } }',
            },
            upsert: {
              type: 'boolean',
              description: 'Insert a new document if no document matches the filter (default: false)',
            },
            database: {
              type: 'string',
              description: 'Database name override (optional)',
            },
          },
          required: ['collection', 'filter', 'update'],
        },
      },
      {
        name: 'update_many',
        description: 'Update all documents matching a filter in a MongoDB collection. Supports upsert.',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Collection name',
            },
            filter: {
              type: 'object',
              description: 'Query filter to match documents to update',
            },
            update: {
              type: 'object',
              description: 'Update operator document, e.g. { "$set": { "archived": true } }',
            },
            upsert: {
              type: 'boolean',
              description: 'Insert a new document if no documents match the filter (default: false)',
            },
            database: {
              type: 'string',
              description: 'Database name override (optional)',
            },
          },
          required: ['collection', 'filter', 'update'],
        },
      },
      {
        name: 'delete_one',
        description: 'Delete the first document matching a filter from a MongoDB collection.',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Collection name',
            },
            filter: {
              type: 'object',
              description: 'Query filter to match the document to delete',
            },
            database: {
              type: 'string',
              description: 'Database name override (optional)',
            },
          },
          required: ['collection', 'filter'],
        },
      },
      {
        name: 'delete_many',
        description: 'Delete all documents matching a filter from a MongoDB collection. Use with caution — no undo.',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Collection name',
            },
            filter: {
              type: 'object',
              description: 'Query filter to match documents to delete. Must be explicitly provided — empty filter {} deletes all documents.',
            },
            database: {
              type: 'string',
              description: 'Database name override (optional)',
            },
          },
          required: ['collection', 'filter'],
        },
      },
      {
        name: 'aggregate',
        description: 'Run an aggregation pipeline on a MongoDB collection. Supports all pipeline stages: $match, $group, $sort, $lookup, $project, $unwind, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Collection name to aggregate',
            },
            pipeline: {
              type: 'array',
              description: 'Array of aggregation pipeline stage objects, e.g. [{ "$match": { "status": "active" } }, { "$group": { "_id": "$category", "count": { "$sum": 1 } } }]',
              items: { type: 'object' },
            },
            database: {
              type: 'string',
              description: 'Database name override (optional)',
            },
          },
          required: ['collection', 'pipeline'],
        },
      },
      {
        name: 'count_documents',
        description: 'Count documents in a MongoDB collection matching an optional filter. Implemented via aggregate $count pipeline (Atlas Data API has no dedicated count endpoint).',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Collection name',
            },
            filter: {
              type: 'object',
              description: 'Query filter document (default: {} — counts all documents)',
            },
            database: {
              type: 'string',
              description: 'Database name override (optional)',
            },
          },
          required: ['collection'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'find':
          return await this.find(args);
        case 'find_one':
          return await this.findOne(args);
        case 'insert_one':
          return await this.insertOne(args);
        case 'insert_many':
          return await this.insertMany(args);
        case 'update_one':
          return await this.updateOne(args);
        case 'update_many':
          return await this.updateMany(args);
        case 'delete_one':
          return await this.deleteOne(args);
        case 'delete_many':
          return await this.deleteMany(args);
        case 'aggregate':
          return await this.aggregate(args);
        case 'count_documents':
          return await this.countDocuments(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }

  private resolveDatabase(args: Record<string, unknown>): string {
    return args.database ? String(args.database) : this.database;
  }

  private basePayload(args: Record<string, unknown>): Record<string, unknown> {
    return {
      dataSource: this.dataSource,
      database: this.resolveDatabase(args),
      collection: args.collection,
    };
  }

  private async find(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = {
      ...this.basePayload(args),
      filter: args.filter ?? {},
    };
    if (args.projection !== undefined) payload.projection = args.projection;
    if (args.sort !== undefined) payload.sort = args.sort;
    if (args.limit !== undefined) payload.limit = args.limit;
    if (args.skip !== undefined) payload.skip = args.skip;
    return this.doAction('action/find', payload);
  }

  private async findOne(args: Record<string, unknown>): Promise<ToolResult> {
    const payload: Record<string, unknown> = {
      ...this.basePayload(args),
      filter: args.filter ?? {},
    };
    if (args.projection !== undefined) payload.projection = args.projection;
    return this.doAction('action/findOne', payload);
  }

  private async insertOne(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doAction('action/insertOne', {
      ...this.basePayload(args),
      document: args.document,
    });
  }

  private async insertMany(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doAction('action/insertMany', {
      ...this.basePayload(args),
      documents: args.documents,
    });
  }

  private async updateOne(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doAction('action/updateOne', {
      ...this.basePayload(args),
      filter: args.filter,
      update: args.update,
      upsert: args.upsert ?? false,
    });
  }

  private async updateMany(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doAction('action/updateMany', {
      ...this.basePayload(args),
      filter: args.filter,
      update: args.update,
      upsert: args.upsert ?? false,
    });
  }

  private async deleteOne(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doAction('action/deleteOne', {
      ...this.basePayload(args),
      filter: args.filter,
    });
  }

  private async deleteMany(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doAction('action/deleteMany', {
      ...this.basePayload(args),
      filter: args.filter,
    });
  }

  private async aggregate(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doAction('action/aggregate', {
      ...this.basePayload(args),
      pipeline: args.pipeline,
    });
  }

  private async countDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    // The Atlas Data API v1 has no action/count endpoint. Count is performed via
    // the aggregate endpoint using a $match + $count pipeline.
    const filter = args.filter ?? {};
    const pipeline = [
      { $match: filter },
      { $count: 'count' },
    ];
    return this.doAction('action/aggregate', {
      ...this.basePayload(args),
      pipeline,
    });
  }
}
