/**
 * Fauna MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official Fauna MCP server was found on GitHub or in the Fauna documentation.
// A community listing exists in awesome-mcp-servers but is not published by Fauna Inc.
//
// Base URL: https://db.fauna.com  (Core HTTP API — query and schema management)
// Auth: Bearer token (Fauna secret key scoped to a database) in Authorization header
// Docs: https://docs.fauna.com/fauna/current/reference/http/reference/core-api/
// Rate limits: Varies by plan; Fauna enforces read/write ops quotas per billing period, not per-minute rate limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FaunaConfig {
  secret: string;           // Fauna secret key (e.g. fn... or a database-scoped key)
  baseUrl?: string;         // override, default: https://db.fauna.com
  apiVersion?: string;      // FQL version header value (default: 10)
}

export class FaunaMCPServer extends MCPAdapterBase {
  private readonly secret: string;
  private readonly baseUrl: string;
  private readonly apiVersion: string;

  constructor(config: FaunaConfig) {
    super();
    this.secret = config.secret;
    this.baseUrl = config.baseUrl || 'https://db.fauna.com';
    this.apiVersion = config.apiVersion || '10';
  }

  static catalog() {
    return {
      name: 'fauna',
      displayName: 'Fauna',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'fauna', 'faunadb', 'fql', 'serverless', 'database', 'document',
        'relational', 'nosql', 'temporal', 'collection', 'index', 'query',
        'schema', 'transaction', 'globally distributed', 'document-relational',
      ],
      toolNames: [
        'query',
        'list_collections', 'get_collection',
        'list_indexes',
        'get_schema', 'push_schema', 'pull_schema',
        'get_staged_schema_status', 'commit_staged_schema', 'abandon_staged_schema',
        'list_databases', 'create_database', 'delete_database',
        'list_keys', 'create_key', 'delete_key',
      ],
      description: 'Fauna serverless document-relational database: run FQL queries, manage collections, indexes, schema, databases, and access keys.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query',
        description: 'Run an arbitrary FQL (Fauna Query Language v10) expression against the configured database',
        inputSchema: {
          type: 'object',
          properties: {
            fql: {
              type: 'string',
              description: 'FQL v10 expression to execute (e.g. Collection.all().toArray())',
            },
            arguments: {
              type: 'object',
              description: 'Optional named arguments for parameterized FQL queries',
            },
            timeout_ms: {
              type: 'number',
              description: 'Query timeout in milliseconds (default: 5000)',
            },
            linearized: {
              type: 'boolean',
              description: 'Require a linearized read for strong consistency (default: false)',
            },
          },
          required: ['fql'],
        },
      },
      {
        name: 'list_collections',
        description: 'List all collections in the Fauna database with name and document count',
        inputSchema: {
          type: 'object',
          properties: {
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response to get the next page',
            },
            page_size: {
              type: 'number',
              description: 'Number of collections per page (default: 64, max: 64)',
            },
          },
        },
      },
      {
        name: 'get_collection',
        description: 'Get the schema, constraints, and metadata for a specific Fauna collection by name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Collection name (e.g. Product)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_indexes',
        description: 'List all indexes defined in the Fauna database with their terms, values, and build status',
        inputSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              description: 'Filter indexes to a specific collection name (default: all collections)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_schema',
        description: 'Retrieve the active FSL schema files from the Fauna database as text',
        inputSchema: {
          type: 'object',
          properties: {
            staged: {
              type: 'boolean',
              description: 'Retrieve the staged (pending) schema instead of active schema (default: false)',
            },
          },
        },
      },
      {
        name: 'push_schema',
        description: 'Push FSL schema definitions to Fauna — stages the schema for review before committing',
        inputSchema: {
          type: 'object',
          properties: {
            fsl: {
              type: 'string',
              description: 'FSL schema content to push (e.g. collection Product { name: String })',
            },
            staged: {
              type: 'boolean',
              description: 'Stage schema for review (true, default) or apply immediately as unsafe migration (false)',
            },
          },
          required: ['fsl'],
        },
      },
      {
        name: 'pull_schema',
        description: 'Pull the current active schema from Fauna as FSL file content for local inspection',
        inputSchema: {
          type: 'object',
          properties: {
            staged: {
              type: 'boolean',
              description: 'Pull the staged schema instead of the active schema (default: false)',
            },
          },
        },
      },
      {
        name: 'get_staged_schema_status',
        description: 'Get the status of a pending staged schema migration including index build progress and diff',
        inputSchema: {
          type: 'object',
          properties: {
            diff: {
              type: 'boolean',
              description: 'Include a diff between staged and active schema in the response (default: true)',
            },
          },
        },
      },
      {
        name: 'commit_staged_schema',
        description: 'Commit a staged schema migration to make it the active schema in the Fauna database',
        inputSchema: {
          type: 'object',
          properties: {
            version: {
              type: 'string',
              description: 'Schema version string from get_staged_schema_status to prevent concurrent modification',
            },
          },
          required: ['version'],
        },
      },
      {
        name: 'abandon_staged_schema',
        description: 'Abandon a pending staged schema migration and revert to the current active schema',
        inputSchema: {
          type: 'object',
          properties: {
            version: {
              type: 'string',
              description: 'Schema version string from get_staged_schema_status',
            },
          },
          required: ['version'],
        },
      },
      {
        name: 'list_databases',
        description: 'List child databases within the current database scope',
        inputSchema: {
          type: 'object',
          properties: {
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of databases per page (default: 64)',
            },
          },
        },
      },
      {
        name: 'create_database',
        description: 'Create a new child database within the current Fauna database scope',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new database (alphanumeric and underscores)',
            },
            protected: {
              type: 'boolean',
              description: 'Prevent accidental deletion by requiring explicit unprotection before delete (default: false)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_database',
        description: 'Delete a child database and all its data permanently — cannot be undone',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the child database to delete',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_keys',
        description: 'List all access keys in the current database scope with their role and expiration',
        inputSchema: {
          type: 'object',
          properties: {
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'create_key',
        description: 'Create a new Fauna access key with a specified role for a database',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Role to assign: admin (full access), server (read/write), client (read-only), or a custom role name',
            },
            database: {
              type: 'string',
              description: 'Child database to scope the key to (default: current database)',
            },
          },
          required: ['role'],
        },
      },
      {
        name: 'delete_key',
        description: 'Delete an access key from the Fauna database by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            key_id: {
              type: 'string',
              description: 'ID of the access key to delete',
            },
          },
          required: ['key_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query':
          return this.runQuery(args);
        case 'list_collections':
          return this.listCollections(args);
        case 'get_collection':
          return this.getCollection(args);
        case 'list_indexes':
          return this.listIndexes(args);
        case 'get_schema':
          return this.getSchema(args);
        case 'push_schema':
          return this.pushSchema(args);
        case 'pull_schema':
          return this.pullSchema(args);
        case 'get_staged_schema_status':
          return this.getStagedSchemaStatus(args);
        case 'commit_staged_schema':
          return this.commitStagedSchema(args);
        case 'abandon_staged_schema':
          return this.abandonStagedSchema(args);
        case 'list_databases':
          return this.listDatabases(args);
        case 'create_database':
          return this.createDatabase(args);
        case 'delete_database':
          return this.deleteDatabase(args);
        case 'list_keys':
          return this.listKeys(args);
        case 'create_key':
          return this.createKey(args);
        case 'delete_key':
          return this.deleteKey(args);
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
      'Authorization': `Bearer ${this.secret}`,
      'Content-Type': 'application/json',
      'X-Format': 'simple',
      'X-Fauna-Version': this.apiVersion,
    };
  }

  private async faunaPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      return { content: [{ type: 'text', text: `API error: ${response.status} ${JSON.stringify(err)}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async faunaGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      return { content: [{ type: 'text', text: `API error: ${response.status} ${JSON.stringify(err)}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // The Fauna Core HTTP API uses a single /query/1 endpoint for all FQL execution
  private async runQuery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fql) return { content: [{ type: 'text', text: 'fql is required' }], isError: true };
    const body: Record<string, unknown> = { query: args.fql };
    if (args.arguments) body.arguments = args.arguments;
    if (args.timeout_ms) body.query_timeout_ms = args.timeout_ms;
    if (typeof args.linearized === 'boolean') body.linearized = args.linearized;
    return this.faunaPost('/query/1', body);
  }

  private async listCollections(args: Record<string, unknown>): Promise<ToolResult> {
    // FQL v10 uses Collection.all() to enumerate collections
    const body: Record<string, unknown> = { query: 'Collection.all().pageSize(64).toArray()' };
    if (args.after) body.query = `Collection.all().after("${encodeURIComponent(args.after as string)}").pageSize(${(args.page_size as number) || 64}).toArray()`;
    return this.faunaPost('/query/1', body);
  }

  private async getCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.faunaPost('/query/1', { query: `Collection.byName("${encodeURIComponent(args.name as string)}")` });
  }

  private async listIndexes(args: Record<string, unknown>): Promise<ToolResult> {
    let fql: string;
    if (args.collection) {
      fql = `Collection.byName("${encodeURIComponent(args.collection as string)}").indexes()`;
    } else {
      fql = 'Collection.all().flatMap(c => c.indexes().toArray()).toArray()';
    }
    return this.faunaPost('/query/1', { query: fql });
  }

  private async getSchema(args: Record<string, unknown>): Promise<ToolResult> {
    const staged = args.staged ? 'staged' : 'active';
    return this.faunaGet(`/schema/1/files?version=${staged}`);
  }

  private async pushSchema(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fsl) return { content: [{ type: 'text', text: 'fsl is required' }], isError: true };
    const staged = args.staged !== false;
    return this.faunaPost(`/schema/1/update?staged=${staged}`, { files: [{ path: 'main.fsl', content: args.fsl }] });
  }

  private async pullSchema(args: Record<string, unknown>): Promise<ToolResult> {
    const staged = args.staged ? 'staged' : 'active';
    return this.faunaGet(`/schema/1/files?version=${staged}&include_content=true`);
  }

  private async getStagedSchemaStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const diff = args.diff !== false ? '&format=tagged' : '';
    return this.faunaGet(`/schema/1/staged/status${diff}`);
  }

  private async commitStagedSchema(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.version) return { content: [{ type: 'text', text: 'version is required' }], isError: true };
    return this.faunaPost(`/schema/1/staged/commit?version=${encodeURIComponent(args.version as string)}`, {});
  }

  private async abandonStagedSchema(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.version) return { content: [{ type: 'text', text: 'version is required' }], isError: true };
    return this.faunaPost(`/schema/1/staged/abandon?version=${encodeURIComponent(args.version as string)}`, {});
  }

  private async listDatabases(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) || 64;
    let fql = `Database.all().pageSize(${pageSize}).toArray()`;
    if (args.after) fql = `Database.all().after("${encodeURIComponent(args.after as string)}").pageSize(${pageSize}).toArray()`;
    return this.faunaPost('/query/1', { query: fql });
  }

  private async createDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const prot = args.protected ? ', protected: true' : '';
    return this.faunaPost('/query/1', { query: `Database.create({ name: "${encodeURIComponent(args.name as string)}"${prot} })` });
  }

  private async deleteDatabase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.faunaPost('/query/1', { query: `Database.byName("${encodeURIComponent(args.name as string)}").delete()` });
  }

  private async listKeys(args: Record<string, unknown>): Promise<ToolResult> {
    let fql = 'Key.all().toArray()';
    if (args.after) fql = `Key.all().after("${encodeURIComponent(args.after as string)}").toArray()`;
    return this.faunaPost('/query/1', { query: fql });
  }

  private async createKey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.role) return { content: [{ type: 'text', text: 'role is required' }], isError: true };
    const db = args.database ? `, database: Database.byName("${encodeURIComponent(args.database as string)}")` : '';
    return this.faunaPost('/query/1', { query: `Key.create({ role: "${encodeURIComponent(args.role as string)}"${db} })` });
  }

  private async deleteKey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.key_id) return { content: [{ type: 'text', text: 'key_id is required' }], isError: true };
    return this.faunaPost('/query/1', { query: `Key.byId("${encodeURIComponent(args.key_id as string)}").delete()` });
  }
}
