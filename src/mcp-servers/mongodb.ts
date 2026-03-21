/** MongoDB MCP Server
 * MongoDB Atlas Data API document operations
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface MongoDBConfig {
  appId: string;
  apiKey: string;
  dataSource: string;
  database: string;
}

export class MongoDBMCPServer {
  private config: MongoDBConfig;
  private baseUrl: string;

  constructor(config: MongoDBConfig) {
    this.config = config;
    this.baseUrl = `https://data.mongodb-api.com/app/${config.appId}/endpoint/data/v1`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'find',
        description: 'Find documents in a MongoDB collection',
        inputSchema: {
          type: 'object',
          properties: {
            collection: { type: 'string', description: 'Collection name' },
            filter: { type: 'object', description: 'Query filter document' },
            projection: { type: 'object', description: 'Fields to include or exclude' },
            sort: { type: 'object', description: 'Sort order' },
            limit: { type: 'number', description: 'Maximum number of documents to return' },
            skip: { type: 'number', description: 'Number of documents to skip' },
            database: { type: 'string', description: 'Database name override' },
          },
          required: ['collection'],
        },
      },
      {
        name: 'insert_one',
        description: 'Insert a single document into a collection',
        inputSchema: {
          type: 'object',
          properties: {
            collection: { type: 'string', description: 'Collection name' },
            document: { type: 'object', description: 'Document to insert' },
            database: { type: 'string', description: 'Database name override' },
          },
          required: ['collection', 'document'],
        },
      },
      {
        name: 'update_one',
        description: 'Update the first document matching a filter',
        inputSchema: {
          type: 'object',
          properties: {
            collection: { type: 'string', description: 'Collection name' },
            filter: { type: 'object', description: 'Query filter to match document' },
            update: { type: 'object', description: 'Update operations to apply' },
            upsert: { type: 'boolean', description: 'Insert if no document matches (default false)' },
            database: { type: 'string', description: 'Database name override' },
          },
          required: ['collection', 'filter', 'update'],
        },
      },
      {
        name: 'delete_one',
        description: 'Delete the first document matching a filter',
        inputSchema: {
          type: 'object',
          properties: {
            collection: { type: 'string', description: 'Collection name' },
            filter: { type: 'object', description: 'Query filter to match document' },
            database: { type: 'string', description: 'Database name override' },
          },
          required: ['collection', 'filter'],
        },
      },
      {
        name: 'aggregate',
        description: 'Run an aggregation pipeline on a collection',
        inputSchema: {
          type: 'object',
          properties: {
            collection: { type: 'string', description: 'Collection name' },
            pipeline: { type: 'array', description: 'Aggregation pipeline stages', items: { type: 'object' } },
            database: { type: 'string', description: 'Database name override' },
          },
          required: ['collection', 'pipeline'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'api-key': this.config.apiKey,
    };

    const database = String(args.database ?? this.config.database);

    try {
      let endpoint: string;
      let body: unknown;

      switch (name) {
        case 'find': {
          endpoint = 'action/find';
          body = {
            dataSource: this.config.dataSource,
            database,
            collection: args.collection,
            filter: args.filter ?? {},
            projection: args.projection,
            sort: args.sort,
            limit: args.limit,
            skip: args.skip,
          };
          break;
        }
        case 'insert_one': {
          endpoint = 'action/insertOne';
          body = {
            dataSource: this.config.dataSource,
            database,
            collection: args.collection,
            document: args.document,
          };
          break;
        }
        case 'update_one': {
          endpoint = 'action/updateOne';
          body = {
            dataSource: this.config.dataSource,
            database,
            collection: args.collection,
            filter: args.filter,
            update: args.update,
            upsert: args.upsert ?? false,
          };
          break;
        }
        case 'delete_one': {
          endpoint = 'action/deleteOne';
          body = {
            dataSource: this.config.dataSource,
            database,
            collection: args.collection,
            filter: args.filter,
          };
          break;
        }
        case 'aggregate': {
          endpoint = 'action/aggregate';
          body = {
            dataSource: this.config.dataSource,
            database,
            collection: args.collection,
            pipeline: args.pipeline,
          };
          break;
        }
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2) }],
            isError: true,
          };
      }

      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = { status: response.status, statusText: response.statusText };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        isError: !response.ok,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: String(err) }, null, 2) }],
        isError: true,
      };
    }
  }
}
