/**
 * Cenit IO MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Cenit IO MCP server was found on GitHub.
//
// Base URL: https://cenit.io/api/v1
// Auth: API key pair — X-User-Access-Key and X-User-Access-Token headers
// Docs: https://cenit.io/api/v1
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CenitConfig {
  accessKey: string;
  accessToken: string;
  baseUrl?: string;
}

export class CenitMCPServer extends MCPAdapterBase {
  private readonly accessKey: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: CenitConfig) {
    super();
    this.accessKey = config.accessKey;
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl ?? 'https://cenit.io/api/v1').replace(/\/$/, '');
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Connections ─────────────────────────────────────────────────────────
      {
        name: 'list_connections',
        description: 'List all API connections configured in Cenit IO',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_or_update_connection',
        description: 'Create or update an API connection in Cenit IO',
        inputSchema: {
          type: 'object',
          properties: {
            connection: { type: 'object', description: 'Connection object (name, url, headers, parameters, etc.)' },
          },
          required: ['connection'],
        },
      },
      {
        name: 'get_connection',
        description: 'Get a specific connection by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Connection ID' } },
          required: ['id'],
        },
      },
      {
        name: 'delete_connection',
        description: 'Delete a connection by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Connection ID to delete' } },
          required: ['id'],
        },
      },
      // ── Connection Roles ─────────────────────────────────────────────────────
      {
        name: 'list_connection_roles',
        description: 'List all connection roles in Cenit IO',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_or_update_connection_role',
        description: 'Create or update a connection role',
        inputSchema: {
          type: 'object',
          properties: {
            connection_role: { type: 'object', description: 'Connection role object' },
          },
          required: ['connection_role'],
        },
      },
      {
        name: 'get_connection_role',
        description: 'Get a specific connection role by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Connection role ID' } },
          required: ['id'],
        },
      },
      {
        name: 'delete_connection_role',
        description: 'Delete a connection role by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Connection role ID to delete' } },
          required: ['id'],
        },
      },
      // ── Data Types ───────────────────────────────────────────────────────────
      {
        name: 'list_data_types',
        description: 'List all data types (schemas) defined in Cenit IO',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_or_update_data_type',
        description: 'Create or update a data type (JSON schema)',
        inputSchema: {
          type: 'object',
          properties: {
            data_type: { type: 'object', description: 'Data type definition object' },
          },
          required: ['data_type'],
        },
      },
      {
        name: 'get_data_type',
        description: 'Get a specific data type by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Data type ID' } },
          required: ['id'],
        },
      },
      {
        name: 'delete_data_type',
        description: 'Delete a data type by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Data type ID to delete' } },
          required: ['id'],
        },
      },
      // ── Flows ────────────────────────────────────────────────────────────────
      {
        name: 'list_flows',
        description: 'List all integration flows in Cenit IO',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_or_update_flow',
        description: 'Create or update an integration flow',
        inputSchema: {
          type: 'object',
          properties: {
            flow: { type: 'object', description: 'Flow definition object (event, translator, connection_role, etc.)' },
          },
          required: ['flow'],
        },
      },
      {
        name: 'get_flow',
        description: 'Get a specific flow by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Flow ID' } },
          required: ['id'],
        },
      },
      {
        name: 'delete_flow',
        description: 'Delete a flow by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Flow ID to delete' } },
          required: ['id'],
        },
      },
      // ── Webhooks ─────────────────────────────────────────────────────────────
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured in Cenit IO',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_or_update_webhook',
        description: 'Create or update a webhook endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            webhook: { type: 'object', description: 'Webhook definition (name, path, method, headers, parameters)' },
          },
          required: ['webhook'],
        },
      },
      {
        name: 'get_webhook',
        description: 'Get a specific webhook by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Webhook ID' } },
          required: ['id'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Webhook ID to delete' } },
          required: ['id'],
        },
      },
      // ── Translators ──────────────────────────────────────────────────────────
      {
        name: 'list_translators',
        description: 'List all data translators (transformers) in Cenit IO',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_translator',
        description: 'Get a specific translator by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Translator ID' } },
          required: ['id'],
        },
      },
      // ── Schedulers ───────────────────────────────────────────────────────────
      {
        name: 'list_schedulers',
        description: 'List all schedulers (cron-based event triggers) in Cenit IO',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_scheduler',
        description: 'Get a specific scheduler by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Scheduler ID' } },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_connections': return await this.listResource('connection');
        case 'create_or_update_connection': return await this.upsertResource('connection', args.connection as Record<string, unknown>);
        case 'get_connection': return await this.getResource('connection', String(args.id));
        case 'delete_connection': return await this.deleteResource('connection', String(args.id));
        case 'list_connection_roles': return await this.listResource('connection_role');
        case 'create_or_update_connection_role': return await this.upsertResource('connection_role', args.connection_role as Record<string, unknown>);
        case 'get_connection_role': return await this.getResource('connection_role', String(args.id));
        case 'delete_connection_role': return await this.deleteResource('connection_role', String(args.id));
        case 'list_data_types': return await this.listResource('data_type/');
        case 'create_or_update_data_type': return await this.upsertResource('data_type/', args.data_type as Record<string, unknown>);
        case 'get_data_type': return await this.getResource('data_type/', String(args.id));
        case 'delete_data_type': return await this.deleteResource('data_type/', String(args.id));
        case 'list_flows': return await this.listResource('flow/');
        case 'create_or_update_flow': return await this.upsertResource('flow/', args.flow as Record<string, unknown>);
        case 'get_flow': return await this.getResource('flow/', String(args.id));
        case 'delete_flow': return await this.deleteResource('flow/', String(args.id));
        case 'list_webhooks': return await this.listResource('webhook/');
        case 'create_or_update_webhook': return await this.upsertResource('webhook/', args.webhook as Record<string, unknown>);
        case 'get_webhook': return await this.getResource('webhook/', String(args.id));
        case 'delete_webhook': return await this.deleteResource('webhook/', String(args.id));
        case 'list_translators': return await this.listResource('translator/');
        case 'get_translator': return await this.getResource('translator/', String(args.id));
        case 'list_schedulers': return await this.listResource('scheduler/');
        case 'get_scheduler': return await this.getResource('scheduler/', String(args.id));
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
      'X-User-Access-Key': this.accessKey,
      'X-User-Access-Token': this.accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async listResource(resource: string): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/setup/${resource}`);
  }

  private async getResource(resource: string, id: string): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/setup/${resource}/${encodeURIComponent(id)}`);
  }

  private async upsertResource(resource: string, body: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/setup/${resource}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteResource(resource: string, id: string): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/setup/${resource}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  static catalog() {
    return {
      name: 'cenit',
      displayName: 'Cenit IO',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['cenit', 'integration', 'etl', 'workflow', 'api', 'connector', 'automation', 'flow', 'webhook'],
      toolNames: [
        'list_connections', 'create_or_update_connection', 'get_connection', 'delete_connection',
        'list_connection_roles', 'create_or_update_connection_role', 'get_connection_role', 'delete_connection_role',
        'list_data_types', 'create_or_update_data_type', 'get_data_type', 'delete_data_type',
        'list_flows', 'create_or_update_flow', 'get_flow', 'delete_flow',
        'list_webhooks', 'create_or_update_webhook', 'get_webhook', 'delete_webhook',
        'list_translators', 'get_translator', 'list_schedulers', 'get_scheduler',
      ],
      description: 'Cenit IO open-source integration platform: manage API connections, data flows, webhooks, translators, and schedulers for enterprise data integration.',
      author: 'protectnil' as const,
    };
  }
}
