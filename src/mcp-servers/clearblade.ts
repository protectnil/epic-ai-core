/**
 * ClearBlade MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official ClearBlade MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 20 tools (users, devices, data, messaging, edges, code services, admin).
// Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://platform.clearblade.com
// Auth: ClearBlade-UserToken header (obtained via authenticate_user or authenticate_developer).
//   Developer auth: POST /admin/auth with {username, password} → returns dev_token.
//   User auth: POST /api/v/1/user/auth with {email, password} → returns user_token.
//   Device auth: POST /api/v/2/devices/{SystemKey}/auth → returns device_token.
// Docs: https://docs.clearblade.com/v/4/static/api/openapi.yaml
// Rate limits: Not publicly documented; depends on platform edition and deployment.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ClearBladeConfig {
  userToken: string;
  /** Optional base URL override (default: https://platform.clearblade.com) */
  baseUrl?: string;
}

export class ClearBladeMCPServer extends MCPAdapterBase {
  private readonly userToken: string;
  private readonly baseUrl: string;

  constructor(config: ClearBladeConfig) {
    super();
    this.userToken = config.userToken;
    this.baseUrl = config.baseUrl ?? 'https://platform.clearblade.com';
  }

  static catalog() {
    return {
      name: 'clearblade',
      displayName: 'ClearBlade',
      version: '1.0.0',
      category: 'iot',
      keywords: [
        'clearblade', 'iot', 'edge', 'devices', 'messaging', 'mqtt', 'data',
        'collections', 'code-services', 'triggers', 'timers', 'users',
        'deployments', 'adapters', 'webhooks', 'real-time', 'platform',
        'industrial-iot', 'iiot', 'streams', 'buckets', 'files',
      ],
      toolNames: [
        'authenticate_user', 'authenticate_developer',
        'get_user_info', 'list_users', 'register_user',
        'get_collection_data', 'create_collection_data', 'update_collection_data', 'delete_collection_data',
        'list_devices', 'get_device', 'create_device', 'update_device', 'delete_device',
        'publish_message', 'get_message_history',
        'execute_code_service',
        'list_edges', 'get_edge',
        'get_platform_info',
      ],
      description: 'ClearBlade IoT platform: manage devices, collections (data), code services, messaging (MQTT), edges, users, deployments, triggers, and system administration on the ClearBlade platform.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'authenticate_user',
        description: 'Authenticate a ClearBlade user with email and password for a given system — returns a user token for subsequent API calls',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key identifying the system/tenant',
            },
            email: {
              type: 'string',
              description: 'User email address',
            },
            password: {
              type: 'string',
              description: 'User password',
            },
          },
          required: ['system_key', 'email', 'password'],
        },
      },
      {
        name: 'authenticate_developer',
        description: 'Authenticate a ClearBlade developer account — returns a developer token with admin privileges',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Developer account email/username',
            },
            password: {
              type: 'string',
              description: 'Developer account password',
            },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'get_user_info',
        description: 'Get information about the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_users',
        description: 'List all users in a ClearBlade system with optional query filtering',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key',
            },
            query: {
              type: 'string',
              description: 'JSON query object to filter users',
            },
          },
          required: ['system_key'],
        },
      },
      {
        name: 'register_user',
        description: 'Register a new user in a ClearBlade system',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key',
            },
            email: {
              type: 'string',
              description: 'New user email address',
            },
            password: {
              type: 'string',
              description: 'New user password',
            },
          },
          required: ['system_key', 'email', 'password'],
        },
      },
      {
        name: 'get_collection_data',
        description: 'Query data rows from a ClearBlade collection by collection ID with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: {
              type: 'string',
              description: 'ID of the collection to query',
            },
            query: {
              type: 'string',
              description: 'JSON-encoded ClearBlade query object to filter rows',
            },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'create_collection_data',
        description: 'Insert new data rows into a ClearBlade collection by collection ID',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: {
              type: 'string',
              description: 'ID of the collection to insert into',
            },
            data: {
              type: 'object',
              description: 'Key-value pairs representing the new row(s) to insert',
            },
          },
          required: ['collection_id', 'data'],
        },
      },
      {
        name: 'update_collection_data',
        description: 'Update existing data rows in a ClearBlade collection matching a query',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: {
              type: 'string',
              description: 'ID of the collection to update',
            },
            query: {
              type: 'string',
              description: 'JSON-encoded ClearBlade query to identify rows to update',
            },
            updates: {
              type: 'object',
              description: 'Key-value pairs of fields to update',
            },
          },
          required: ['collection_id', 'query', 'updates'],
        },
      },
      {
        name: 'delete_collection_data',
        description: 'Delete data rows from a ClearBlade collection matching a query',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: {
              type: 'string',
              description: 'ID of the collection to delete from',
            },
            query: {
              type: 'string',
              description: 'JSON-encoded ClearBlade query to identify rows to delete (required to prevent accidental full-table delete)',
            },
          },
          required: ['collection_id', 'query'],
        },
      },
      {
        name: 'list_devices',
        description: 'List all registered IoT devices in a ClearBlade system with optional query filtering',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key',
            },
            query: {
              type: 'string',
              description: 'JSON-encoded ClearBlade query to filter devices',
            },
          },
          required: ['system_key'],
        },
      },
      {
        name: 'get_device',
        description: 'Get detailed information about a specific IoT device by name',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key',
            },
            device_name: {
              type: 'string',
              description: 'Name of the device to retrieve',
            },
          },
          required: ['system_key', 'device_name'],
        },
      },
      {
        name: 'create_device',
        description: 'Register a new IoT device in a ClearBlade system',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key',
            },
            device_name: {
              type: 'string',
              description: 'Unique name for the new device',
            },
            attributes: {
              type: 'object',
              description: 'Optional device attributes (key-value pairs)',
            },
          },
          required: ['system_key', 'device_name'],
        },
      },
      {
        name: 'update_device',
        description: 'Update attributes or configuration for an existing IoT device',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key',
            },
            device_name: {
              type: 'string',
              description: 'Name of the device to update',
            },
            updates: {
              type: 'object',
              description: 'Key-value pairs of device attributes to update',
            },
          },
          required: ['system_key', 'device_name', 'updates'],
        },
      },
      {
        name: 'delete_device',
        description: 'Delete an IoT device from a ClearBlade system',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key',
            },
            device_name: {
              type: 'string',
              description: 'Name of the device to delete',
            },
          },
          required: ['system_key', 'device_name'],
        },
      },
      {
        name: 'publish_message',
        description: 'Publish a message to a ClearBlade messaging topic (MQTT-style pub/sub)',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key',
            },
            topic: {
              type: 'string',
              description: 'Messaging topic to publish to (e.g. "devices/sensor1/readings")',
            },
            payload: {
              type: 'string',
              description: 'Message payload as a string or JSON string',
            },
          },
          required: ['system_key', 'topic', 'payload'],
        },
      },
      {
        name: 'get_message_history',
        description: 'Retrieve historical messages from the ClearBlade messaging system for a given system',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key',
            },
            query: {
              type: 'string',
              description: 'Optional JSON query to filter message history',
            },
          },
          required: ['system_key'],
        },
      },
      {
        name: 'execute_code_service',
        description: 'Execute a ClearBlade code service (serverless function) by name and return the result',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key where the service lives',
            },
            service_name: {
              type: 'string',
              description: 'Name of the code service to execute',
            },
            params: {
              type: 'object',
              description: 'Optional key-value parameters to pass to the code service',
            },
          },
          required: ['system_key', 'service_name'],
        },
      },
      {
        name: 'list_edges',
        description: 'List all edge nodes registered in a ClearBlade system (edge computing nodes)',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key',
            },
          },
          required: ['system_key'],
        },
      },
      {
        name: 'get_edge',
        description: 'Get detailed information about a specific ClearBlade edge node by name',
        inputSchema: {
          type: 'object',
          properties: {
            system_key: {
              type: 'string',
              description: 'ClearBlade system key',
            },
            edge_name: {
              type: 'string',
              description: 'Name of the edge node to retrieve',
            },
          },
          required: ['system_key', 'edge_name'],
        },
      },
      {
        name: 'get_platform_info',
        description: 'Get general information about the ClearBlade platform instance (version, status)',
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
        case 'authenticate_user': return this.authenticateUser(args);
        case 'authenticate_developer': return this.authenticateDeveloper(args);
        case 'get_user_info': return this.getUserInfo();
        case 'list_users': return this.listUsers(args);
        case 'register_user': return this.registerUser(args);
        case 'get_collection_data': return this.getCollectionData(args);
        case 'create_collection_data': return this.createCollectionData(args);
        case 'update_collection_data': return this.updateCollectionData(args);
        case 'delete_collection_data': return this.deleteCollectionData(args);
        case 'list_devices': return this.listDevices(args);
        case 'get_device': return this.getDevice(args);
        case 'create_device': return this.createDevice(args);
        case 'update_device': return this.updateDevice(args);
        case 'delete_device': return this.deleteDevice(args);
        case 'publish_message': return this.publishMessage(args);
        case 'get_message_history': return this.getMessageHistory(args);
        case 'execute_code_service': return this.executeCodeService(args);
        case 'list_edges': return this.listEdges(args);
        case 'get_edge': return this.getEdge(args);
        case 'get_platform_info': return this.getPlatformInfo();
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

  private authHeaders(): Record<string, string> {
    return {
      'ClearBlade-UserToken': this.userToken,
      'Content-Type': 'application/json',
    };
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string>,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const qs = new URLSearchParams(queryParams);
      url += `?${qs.toString()}`;
    }
    const response = await this.fetchWithRetry(url, {
      method,
      headers: this.authHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `ClearBlade returned non-JSON (HTTP ${response.status})` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async authenticateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    if (!args.password) return { content: [{ type: 'text', text: 'password is required' }], isError: true };
    const url = `${this.baseUrl}/api/v/1/user/auth`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'ClearBlade-SystemKey': args.system_key as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: args.email, password: args.password }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      return { content: [{ type: 'text', text: 'Non-JSON response from authenticate_user' }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async authenticateDeveloper(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username) return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    if (!args.password) return { content: [{ type: 'text', text: 'password is required' }], isError: true };
    const url = `${this.baseUrl}/admin/auth`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: args.username, password: args.password }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      return { content: [{ type: 'text', text: 'Non-JSON response from authenticate_developer' }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getUserInfo(): Promise<ToolResult> {
    return this.request('GET', '/api/v/1/user/info');
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    const queryParams: Record<string, string> = {};
    if (args.query) queryParams.query = args.query as string;
    return this.request('GET', `/admin/user/${encodeURIComponent(args.system_key as string)}`, undefined, queryParams);
  }

  private async registerUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    if (!args.password) return { content: [{ type: 'text', text: 'password is required' }], isError: true };
    const url = `${this.baseUrl}/api/v/1/user/reg`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'ClearBlade-SystemKey': args.system_key as string,
        'ClearBlade-UserToken': this.userToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: args.email, password: args.password }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      return { content: [{ type: 'text', text: 'Non-JSON response from register_user' }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCollectionData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id) return { content: [{ type: 'text', text: 'collection_id is required' }], isError: true };
    const queryParams: Record<string, string> = {};
    if (args.query) queryParams.query = args.query as string;
    return this.request('GET', `/api/v/1/data/${encodeURIComponent(args.collection_id as string)}`, undefined, queryParams);
  }

  private async createCollectionData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id) return { content: [{ type: 'text', text: 'collection_id is required' }], isError: true };
    if (!args.data) return { content: [{ type: 'text', text: 'data is required' }], isError: true };
    return this.request('POST', `/api/v/1/data/${encodeURIComponent(args.collection_id as string)}`, args.data);
  }

  private async updateCollectionData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id) return { content: [{ type: 'text', text: 'collection_id is required' }], isError: true };
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    if (!args.updates) return { content: [{ type: 'text', text: 'updates is required' }], isError: true };
    const body = { query: args.query, $set: args.updates };
    return this.request('PUT', `/api/v/1/data/${encodeURIComponent(args.collection_id as string)}`, body);
  }

  private async deleteCollectionData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id) return { content: [{ type: 'text', text: 'collection_id is required' }], isError: true };
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const queryParams: Record<string, string> = { query: args.query as string };
    return this.request('DELETE', `/api/v/1/data/${encodeURIComponent(args.collection_id as string)}`, undefined, queryParams);
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    const queryParams: Record<string, string> = {};
    if (args.query) queryParams.query = args.query as string;
    return this.request('GET', `/api/v/2/devices/${encodeURIComponent(args.system_key as string)}`, undefined, queryParams);
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    if (!args.device_name) return { content: [{ type: 'text', text: 'device_name is required' }], isError: true };
    return this.request('GET', `/admin/devices/${encodeURIComponent(args.system_key as string)}/${encodeURIComponent(args.device_name as string)}`);
  }

  private async createDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    if (!args.device_name) return { content: [{ type: 'text', text: 'device_name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.device_name };
    if (args.attributes && typeof args.attributes === 'object') {
      Object.assign(body, args.attributes);
    }
    return this.request('POST', `/admin/devices/${encodeURIComponent(args.system_key as string)}/${encodeURIComponent(args.device_name as string)}`, body);
  }

  private async updateDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    if (!args.device_name) return { content: [{ type: 'text', text: 'device_name is required' }], isError: true };
    if (!args.updates) return { content: [{ type: 'text', text: 'updates is required' }], isError: true };
    return this.request('PUT', `/admin/devices/${encodeURIComponent(args.system_key as string)}/${encodeURIComponent(args.device_name as string)}`, args.updates);
  }

  private async deleteDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    if (!args.device_name) return { content: [{ type: 'text', text: 'device_name is required' }], isError: true };
    return this.request('DELETE', `/admin/devices/${encodeURIComponent(args.system_key as string)}/${encodeURIComponent(args.device_name as string)}`);
  }

  private async publishMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    if (!args.topic) return { content: [{ type: 'text', text: 'topic is required' }], isError: true };
    if (!args.payload) return { content: [{ type: 'text', text: 'payload is required' }], isError: true };
    const body = { topic: args.topic, payload: args.payload };
    return this.request('POST', `/api/v/1/message/${encodeURIComponent(args.system_key as string)}/publish`, body);
  }

  private async getMessageHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    const queryParams: Record<string, string> = {};
    if (args.query) queryParams.query = args.query as string;
    return this.request('GET', `/api/v/1/message/${encodeURIComponent(args.system_key as string)}`, undefined, queryParams);
  }

  private async executeCodeService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    if (!args.service_name) return { content: [{ type: 'text', text: 'service_name is required' }], isError: true };
    const body = args.params ?? {};
    return this.request(
      'POST',
      `/api/v/1/code/${encodeURIComponent(args.system_key as string)}/${encodeURIComponent(args.service_name as string)}`,
      body,
    );
  }

  private async listEdges(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    return this.request('GET', `/api/v/3/edges/${encodeURIComponent(args.system_key as string)}`);
  }

  private async getEdge(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.system_key) return { content: [{ type: 'text', text: 'system_key is required' }], isError: true };
    if (!args.edge_name) return { content: [{ type: 'text', text: 'edge_name is required' }], isError: true };
    return this.request('GET', `/api/v/3/edges/${encodeURIComponent(args.system_key as string)}/${encodeURIComponent(args.edge_name as string)}`);
  }

  private async getPlatformInfo(): Promise<ToolResult> {
    return this.request('GET', '/api/about');
  }
}
