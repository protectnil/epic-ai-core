/**
 * OpenSTF (Smartphone Test Farm) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found.
// Our adapter covers: 10 tools (devices, user devices, remote connect, access tokens, user profile).
// Recommendation: Use this adapter. No official or community MCP server exists.
//
// Base URL: Configurable — STF is self-hosted. Default: http://openstf.local/api/v1
// Auth: API key passed as Bearer token in Authorization header
// Docs: https://github.com/openstf/stf
// Rate limits: Self-hosted — no published rate limits; depends on instance configuration.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenSTFConfig {
  accessToken: string;
  /** Base URL of your STF instance (default: http://openstf.local/api/v1) */
  baseUrl?: string;
}

export class OpenSTFMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: OpenSTFConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'http://openstf.local/api/v1';
  }

  static catalog() {
    return {
      name: 'openstf',
      displayName: 'OpenSTF (Smartphone Test Farm)',
      version: '1.0.0',
      category: 'engineering',
      keywords: [
        'openstf', 'stf', 'smartphone', 'android', 'device', 'mobile', 'testing',
        'farm', 'remote', 'connect', 'adb', 'automation', 'qa', 'mobile-testing',
      ],
      toolNames: [
        'list_devices', 'get_device',
        'list_user_devices', 'get_user_device', 'add_user_device', 'delete_user_device',
        'remote_connect_device', 'remote_disconnect_device',
        'get_user', 'list_access_tokens',
      ],
      description: 'Control and manage real Android devices on a Smartphone Test Farm — list devices, allocate to users, and establish remote ADB connections.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_devices',
        description: 'List all devices in the STF farm including disconnected and offline devices',
        inputSchema: {
          type: 'object',
          properties: {
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in response (e.g. "serial,model,version")',
            },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Get detailed information about a single device by its serial number',
        inputSchema: {
          type: 'object',
          properties: {
            serial: {
              type: 'string',
              description: 'Device serial number (e.g. "emulator-5554" or ADB serial)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in response',
            },
          },
          required: ['serial'],
        },
      },
      {
        name: 'list_user_devices',
        description: 'List all devices currently allocated to the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in response',
            },
          },
        },
      },
      {
        name: 'get_user_device',
        description: 'Get information about a specific device allocated to the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            serial: {
              type: 'string',
              description: 'Device serial number',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in response',
            },
          },
          required: ['serial'],
        },
      },
      {
        name: 'add_user_device',
        description: 'Allocate a device from the STF farm to the authenticated user for exclusive use',
        inputSchema: {
          type: 'object',
          properties: {
            serial: {
              type: 'string',
              description: 'Device serial number to allocate',
            },
            timeout: {
              type: 'number',
              description: 'Auto-release timeout in milliseconds — device releases if idle for this duration (defaults to provider group timeout)',
            },
          },
          required: ['serial'],
        },
      },
      {
        name: 'delete_user_device',
        description: 'Release a device back to the STF farm, removing it from the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            serial: {
              type: 'string',
              description: 'Device serial number to release',
            },
          },
          required: ['serial'],
        },
      },
      {
        name: 'remote_connect_device',
        description: 'Request a remote ADB connection URL for a device allocated to the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            serial: {
              type: 'string',
              description: 'Device serial number to connect to remotely via ADB',
            },
          },
          required: ['serial'],
        },
      },
      {
        name: 'remote_disconnect_device',
        description: 'Terminate the remote ADB connection for a device allocated to the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            serial: {
              type: 'string',
              description: 'Device serial number to disconnect from remote ADB session',
            },
          },
          required: ['serial'],
        },
      },
      {
        name: 'get_user',
        description: 'Get the profile information of the currently authenticated STF user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_access_tokens',
        description: 'List the titles of all valid access tokens for the authenticated user',
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
        case 'list_devices':
          return this.listDevices(args);
        case 'get_device':
          return this.getDevice(args);
        case 'list_user_devices':
          return this.listUserDevices(args);
        case 'get_user_device':
          return this.getUserDevice(args);
        case 'add_user_device':
          return this.addUserDevice(args);
        case 'delete_user_device':
          return this.deleteUserDevice(args);
        case 'remote_connect_device':
          return this.remoteConnectDevice(args);
        case 'remote_disconnect_device':
          return this.remoteDisconnectDevice(args);
        case 'get_user':
          return this.getUser();
        case 'list_access_tokens':
          return this.listAccessTokens();
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
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private buildUrl(path: string, params: Record<string, string | undefined> = {}): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const query = qs.toString();
    return `${this.baseUrl}${path}${query ? '?' + query : ''}`;
  }

  private async fetchGet(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`STF returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchPost(path: string, body: unknown): Promise<ToolResult> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ' — ' + errText : ''}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: 'ok' }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fetchDelete(path: string): Promise<ToolResult> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: 'deleted' }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.fields) params.fields = args.fields as string;
    return this.fetchGet('/devices', params);
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serial) return { content: [{ type: 'text', text: 'serial is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.fields) params.fields = args.fields as string;
    return this.fetchGet(`/devices/${encodeURIComponent(args.serial as string)}`, params);
  }

  private async listUserDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.fields) params.fields = args.fields as string;
    return this.fetchGet('/user/devices', params);
  }

  private async getUserDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serial) return { content: [{ type: 'text', text: 'serial is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.fields) params.fields = args.fields as string;
    return this.fetchGet(`/user/devices/${encodeURIComponent(args.serial as string)}`, params);
  }

  private async addUserDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serial) return { content: [{ type: 'text', text: 'serial is required' }], isError: true };
    const body: Record<string, unknown> = { serial: args.serial as string };
    if (args.timeout !== undefined) body.timeout = args.timeout as number;
    return this.fetchPost('/user/devices', body);
  }

  private async deleteUserDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serial) return { content: [{ type: 'text', text: 'serial is required' }], isError: true };
    return this.fetchDelete(`/user/devices/${encodeURIComponent(args.serial as string)}`);
  }

  private async remoteConnectDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serial) return { content: [{ type: 'text', text: 'serial is required' }], isError: true };
    return this.fetchPost(`/user/devices/${encodeURIComponent(args.serial as string)}/remoteConnect`, {});
  }

  private async remoteDisconnectDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serial) return { content: [{ type: 'text', text: 'serial is required' }], isError: true };
    return this.fetchDelete(`/user/devices/${encodeURIComponent(args.serial as string)}/remoteConnect`);
  }

  private async getUser(): Promise<ToolResult> {
    return this.fetchGet('/user');
  }

  private async listAccessTokens(): Promise<ToolResult> {
    return this.fetchGet('/user/accessTokens');
  }
}
