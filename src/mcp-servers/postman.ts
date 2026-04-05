/**
 * Postman MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/postmanlabs/postman-mcp-server — transport: streamable-HTTP (remote at
//   mcp.postman.com) or stdio (local @postman/postman-mcp-server npm package), auth: Bearer API key or OAuth2.
//   Actively maintained — latest release v2.8.4 on 2026-03-19. Full mode exposes 100+ tools.
// Our adapter covers: 20 tools (core API operations via API key). Vendor MCP covers: 100+ tools (full API).
// Recommendation: Use vendor MCP for full coverage with OAuth2. Use this adapter for API-key deployments,
//   CI/CD automation, and air-gapped environments.
//
// Base URL: https://api.getpostman.com
// Auth: API Key via X-API-Key header — generate from Postman > Account Settings > API Keys
// Docs: https://learning.postman.com/docs/developer/postman-api/intro-api/
// Rate limits: 300 requests/minute per API key (free plans may be lower)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PostmanConfig {
  apiKey: string;
  baseUrl?: string;
}

export class PostmanMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: PostmanConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.getpostman.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'postman',
      displayName: 'Postman',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['postman', 'api', 'collection', 'environment', 'monitor', 'mock', 'workspace', 'testing', 'rest'],
      toolNames: [
        'list_workspaces', 'get_workspace', 'list_collections', 'get_collection',
        'create_collection', 'update_collection', 'delete_collection',
        'list_environments', 'get_environment', 'create_environment', 'update_environment', 'delete_environment',
        'list_monitors', 'get_monitor', 'run_monitor',
        'list_mocks', 'get_mock', 'list_apis', 'get_api', 'get_authenticated_user',
      ],
      description: 'Manage Postman workspaces, collections, environments, monitors, mocks, and APIs via the Postman REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workspaces',
        description: 'List all Postman workspaces accessible by the API key, optionally filtered by type',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by workspace type: personal, team, private, public, partner (optional)',
            },
          },
        },
      },
      {
        name: 'get_workspace',
        description: 'Get full details for a specific Postman workspace including its collections and environments',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'The workspace ID (UUID)',
            },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'list_collections',
        description: 'List all collections in the account, optionally filtered by workspace ID',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'Filter collections by workspace ID (optional)',
            },
          },
        },
      },
      {
        name: 'get_collection',
        description: 'Get the full definition of a Postman collection including all requests, folders, and responses',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: {
              type: 'string',
              description: 'The collection UID (e.g. 12345678-abcd-1234-efgh-5678ijkl)',
            },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'create_collection',
        description: 'Create a new Postman collection in a specified workspace with optional description',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'The workspace ID to create the collection in',
            },
            name: {
              type: 'string',
              description: 'Name of the new collection',
            },
            description: {
              type: 'string',
              description: 'Description for the collection (optional)',
            },
          },
          required: ['workspace', 'name'],
        },
      },
      {
        name: 'update_collection',
        description: 'Update the name or description of an existing Postman collection',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: {
              type: 'string',
              description: 'The collection UID to update',
            },
            name: {
              type: 'string',
              description: 'New name for the collection (optional)',
            },
            description: {
              type: 'string',
              description: 'New description for the collection (optional)',
            },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'delete_collection',
        description: 'Delete a Postman collection permanently by its collection UID',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: {
              type: 'string',
              description: 'The collection UID to delete',
            },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'list_environments',
        description: 'List all environments in the account, optionally filtered by workspace ID',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'Filter environments by workspace ID (optional)',
            },
          },
        },
      },
      {
        name: 'get_environment',
        description: 'Get the full definition of a Postman environment including all variables and their values',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'The environment UID',
            },
          },
          required: ['environment_id'],
        },
      },
      {
        name: 'create_environment',
        description: 'Create a new Postman environment in a workspace with optional initial variables',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'The workspace ID to create the environment in',
            },
            name: {
              type: 'string',
              description: 'Name of the new environment',
            },
            values: {
              type: 'array',
              description: 'Array of variable objects with key, value, enabled, and type fields (optional)',
            },
          },
          required: ['workspace', 'name'],
        },
      },
      {
        name: 'update_environment',
        description: 'Update an existing Postman environment name or variables',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'The environment UID to update',
            },
            name: {
              type: 'string',
              description: 'New name for the environment (optional)',
            },
            values: {
              type: 'array',
              description: 'New array of variable objects replacing existing variables (optional)',
            },
          },
          required: ['environment_id'],
        },
      },
      {
        name: 'delete_environment',
        description: 'Delete a Postman environment permanently by its environment UID',
        inputSchema: {
          type: 'object',
          properties: {
            environment_id: {
              type: 'string',
              description: 'The environment UID to delete',
            },
          },
          required: ['environment_id'],
        },
      },
      {
        name: 'list_monitors',
        description: 'List all monitors in the account, optionally filtered by workspace ID',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'Filter monitors by workspace ID (optional)',
            },
          },
        },
      },
      {
        name: 'get_monitor',
        description: 'Get details and last-run information for a specific Postman monitor',
        inputSchema: {
          type: 'object',
          properties: {
            monitor_id: {
              type: 'string',
              description: 'The monitor UID',
            },
          },
          required: ['monitor_id'],
        },
      },
      {
        name: 'run_monitor',
        description: 'Trigger an immediate run of a Postman monitor outside its scheduled time',
        inputSchema: {
          type: 'object',
          properties: {
            monitor_id: {
              type: 'string',
              description: 'The monitor UID to run',
            },
          },
          required: ['monitor_id'],
        },
      },
      {
        name: 'list_mocks',
        description: 'List all mock servers in the account, optionally filtered by workspace ID',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'Filter mock servers by workspace ID (optional)',
            },
          },
        },
      },
      {
        name: 'get_mock',
        description: 'Get details for a specific Postman mock server including its URL and configuration',
        inputSchema: {
          type: 'object',
          properties: {
            mock_id: {
              type: 'string',
              description: 'The mock server UID',
            },
          },
          required: ['mock_id'],
        },
      },
      {
        name: 'list_apis',
        description: 'List all API definitions in a Postman workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace: {
              type: 'string',
              description: 'The workspace ID to list APIs from',
            },
          },
          required: ['workspace'],
        },
      },
      {
        name: 'get_api',
        description: 'Get details for a specific Postman API definition including schema and version info',
        inputSchema: {
          type: 'object',
          properties: {
            api_id: {
              type: 'string',
              description: 'The API ID',
            },
          },
          required: ['api_id'],
        },
      },
      {
        name: 'get_authenticated_user',
        description: 'Get profile information and usage statistics for the authenticated Postman API key owner',
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
        case 'list_workspaces':
          return await this.listWorkspaces(args);
        case 'get_workspace':
          return await this.getWorkspace(args);
        case 'list_collections':
          return await this.listCollections(args);
        case 'get_collection':
          return await this.getCollection(args);
        case 'create_collection':
          return await this.createCollection(args);
        case 'update_collection':
          return await this.updateCollection(args);
        case 'delete_collection':
          return await this.deleteCollection(args);
        case 'list_environments':
          return await this.listEnvironments(args);
        case 'get_environment':
          return await this.getEnvironment(args);
        case 'create_environment':
          return await this.createEnvironment(args);
        case 'update_environment':
          return await this.updateEnvironment(args);
        case 'delete_environment':
          return await this.deleteEnvironment(args);
        case 'list_monitors':
          return await this.listMonitors(args);
        case 'get_monitor':
          return await this.getMonitor(args);
        case 'run_monitor':
          return await this.runMonitor(args);
        case 'list_mocks':
          return await this.listMocks(args);
        case 'get_mock':
          return await this.getMock(args);
        case 'list_apis':
          return await this.listApis(args);
        case 'get_api':
          return await this.getApi(args);
        case 'get_authenticated_user':
          return await this.getAuthenticatedUser();
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

  private get headers(): Record<string, string> {
    return {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async fetchJSON(url: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...options });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `Postman API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 500)}` : ''}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Postman returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listWorkspaces(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}/workspaces`;
    if (args.type) url += `?type=${encodeURIComponent(args.type as string)}`;
    return this.fetchJSON(url);
  }

  private async getWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.workspace_id as string;
    if (!id) return { content: [{ type: 'text', text: 'workspace_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/workspaces/${encodeURIComponent(id)}`);
  }

  private async listCollections(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}/collections`;
    if (args.workspace) url += `?workspace=${encodeURIComponent(args.workspace as string)}`;
    return this.fetchJSON(url);
  }

  private async getCollection(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.collection_id as string;
    if (!id) return { content: [{ type: 'text', text: 'collection_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/collections/${encodeURIComponent(id)}`);
  }

  private async createCollection(args: Record<string, unknown>): Promise<ToolResult> {
    const workspace = args.workspace as string;
    const name = args.name as string;
    if (!workspace || !name) return { content: [{ type: 'text', text: 'workspace and name are required' }], isError: true };
    const info: Record<string, unknown> = {
      name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    };
    if (args.description) info.description = args.description as string;
    const body = { collection: { info } };
    return this.fetchJSON(
      `${this.baseUrl}/collections?workspace=${encodeURIComponent(workspace)}`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async updateCollection(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.collection_id as string;
    if (!id) return { content: [{ type: 'text', text: 'collection_id is required' }], isError: true };
    const info: Record<string, unknown> = {};
    if (args.name) info.name = args.name as string;
    if (args.description) info.description = args.description as string;
    const body = { collection: { info } };
    return this.fetchJSON(
      `${this.baseUrl}/collections/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  private async deleteCollection(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.collection_id as string;
    if (!id) return { content: [{ type: 'text', text: 'collection_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/collections/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}/environments`;
    if (args.workspace) url += `?workspace=${encodeURIComponent(args.workspace as string)}`;
    return this.fetchJSON(url);
  }

  private async getEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.environment_id as string;
    if (!id) return { content: [{ type: 'text', text: 'environment_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/environments/${encodeURIComponent(id)}`);
  }

  private async createEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const workspace = args.workspace as string;
    const name = args.name as string;
    if (!workspace || !name) return { content: [{ type: 'text', text: 'workspace and name are required' }], isError: true };
    const body = { environment: { name, values: args.values ?? [] } };
    return this.fetchJSON(
      `${this.baseUrl}/environments?workspace=${encodeURIComponent(workspace)}`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async updateEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.environment_id as string;
    if (!id) return { content: [{ type: 'text', text: 'environment_id is required' }], isError: true };
    const env: Record<string, unknown> = {};
    if (args.name) env.name = args.name as string;
    if (args.values) env.values = args.values;
    const body = { environment: env };
    return this.fetchJSON(
      `${this.baseUrl}/environments/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  private async deleteEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.environment_id as string;
    if (!id) return { content: [{ type: 'text', text: 'environment_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/environments/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  private async listMonitors(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}/monitors`;
    if (args.workspace) url += `?workspace=${encodeURIComponent(args.workspace as string)}`;
    return this.fetchJSON(url);
  }

  private async getMonitor(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.monitor_id as string;
    if (!id) return { content: [{ type: 'text', text: 'monitor_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/monitors/${encodeURIComponent(id)}`);
  }

  private async runMonitor(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.monitor_id as string;
    if (!id) return { content: [{ type: 'text', text: 'monitor_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/monitors/${encodeURIComponent(id)}/run`, { method: 'POST', body: '{}' });
  }

  private async listMocks(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}/mocks`;
    if (args.workspace) url += `?workspace=${encodeURIComponent(args.workspace as string)}`;
    return this.fetchJSON(url);
  }

  private async getMock(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.mock_id as string;
    if (!id) return { content: [{ type: 'text', text: 'mock_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/mocks/${encodeURIComponent(id)}`);
  }

  private async listApis(args: Record<string, unknown>): Promise<ToolResult> {
    const workspace = args.workspace as string;
    if (!workspace) return { content: [{ type: 'text', text: 'workspace is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/apis?workspace=${encodeURIComponent(workspace)}`);
  }

  private async getApi(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.api_id as string;
    if (!id) return { content: [{ type: 'text', text: 'api_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/apis/${encodeURIComponent(id)}`);
  }

  private async getAuthenticatedUser(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/me`);
  }
}
