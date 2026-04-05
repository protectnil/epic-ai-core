/**
 * Opto 22 groov View Public API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Opto 22 groov MCP server was found on GitHub or npm.
//
// Base URL: https://{groov-host}/api  (groov View host set via config.groovHost)
// Auth: API key passed as query parameter `api_key` on every authenticated request
// Docs: http://developer.opto22.com
// Rate limits: Not documented by vendor.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Opto22GroovConfig {
  /** Hostname or IP address of the groov View server */
  groovHost: string;
  /** API key for authentication (passed as api_key query parameter) */
  apiKey: string;
  /** Optional full base URL override (default: https://{groovHost}/api) */
  baseUrl?: string;
}

export class Opto22GroovMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: Opto22GroovConfig) {
    super();
    this.baseUrl = config.baseUrl ?? `https://${config.groovHost}/api`;
    this.apiKey = config.apiKey;
  }

  static catalog() {
    return {
      name: 'opto22-groov',
      displayName: 'Opto 22 groov View',
      version: '1.0.0',
      category: 'iot',
      keywords: [
        'opto22', 'groov', 'groov-view', 'hmi', 'scada', 'iot', 'industrial',
        'data-store', 'tags', 'automation', 'controller', 'plc', 'sensor',
        'actuator', 'logging', 'monitoring', 'whoami',
      ],
      toolNames: [
        'get_groov_info', 'get_current_user',
        'list_devices', 'list_device_tags',
        'list_all_tags', 'read_tag', 'batch_read_tags', 'write_tag',
        'download_log_json', 'download_log_text',
      ],
      description: 'groov View HMI/SCADA: list data store devices and tags, read/write tag values in bulk or individually, and download event logs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // Info & Identity
      {
        name: 'get_groov_info',
        description: 'Get information about the groov View server including version — no authentication required',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_current_user',
        description: 'Get the username, role, email, and API key of the currently authenticated groov View user',
        inputSchema: { type: 'object', properties: {} },
      },
      // Data Store — Devices
      {
        name: 'list_devices',
        description: 'List all data store devices configured in the groov View project — authorized for admins and editors',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_device_tags',
        description: 'List all tags associated with a specific data store device by its numeric device ID',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'number',
              description: 'Numeric ID of the data store device (obtained from list_devices)',
            },
          },
          required: ['device_id'],
        },
      },
      // Data Store — Tags
      {
        name: 'list_all_tags',
        description: 'List all data store tags defined in the groov View project with their IDs and type information',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'read_tag',
        description: 'Read the current value of a single tag by its numeric tag ID, with optional array index and element count',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: {
              type: 'number',
              description: 'Numeric ID of the tag to read (obtained from list_all_tags or list_device_tags)',
            },
            index: {
              type: 'number',
              description: 'For array tags, the table index to start reading at (default: 0)',
            },
            count: {
              type: 'number',
              description: 'For array tags, number of elements to read (default: 1)',
            },
          },
          required: ['tag_id'],
        },
      },
      {
        name: 'batch_read_tags',
        description: 'Read current values for multiple tags in a single request by providing an array of tag references',
        inputSchema: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              description: 'Array of tag reference objects — each must include a numeric id field (e.g. [{"id": 42}, {"id": 7}])',
              items: {
                type: 'object',
                description: 'Tag reference with required id field and optional index/count for array tags',
              },
            },
          },
          required: ['tags'],
        },
      },
      {
        name: 'write_tag',
        description: 'Write a new value to a tag by its numeric tag ID; for array tags specify an optional index',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: {
              type: 'number',
              description: 'Numeric ID of the tag to write (obtained from list_all_tags or list_device_tags)',
            },
            value: {
              type: 'string',
              description: 'Value to write — must be a string, number, or boolean (passed as string here, e.g. "true", "42", "hello")',
            },
            index: {
              type: 'number',
              description: 'For array tags, the index to write the value to (default: 0)',
            },
          },
          required: ['tag_id', 'value'],
        },
      },
      // Logging
      {
        name: 'download_log_json',
        description: 'Download the groov View event log in JSON format with optional minimum log level, timestamp filter, and text search',
        inputSchema: {
          type: 'object',
          properties: {
            minimum_log_level: {
              type: 'string',
              description: 'Minimum log verbosity to include: TRACE, DEBUG, INFO, WARN, ERROR, FATAL (default: INFO)',
            },
            last_timestamp: {
              type: 'number',
              description: 'Earliest log entry to include as milliseconds since Unix epoch (default: 0 = all entries)',
            },
            filter: {
              type: 'string',
              description: 'Optional text string to search for in log entries',
            },
          },
        },
      },
      {
        name: 'download_log_text',
        description: 'Download the groov View event log as plain text with optional minimum log level, timestamp filter, and text search',
        inputSchema: {
          type: 'object',
          properties: {
            minimum_log_level: {
              type: 'string',
              description: 'Minimum log verbosity to include: TRACE, DEBUG, INFO, WARN, ERROR, FATAL (default: INFO)',
            },
            last_timestamp: {
              type: 'number',
              description: 'Earliest log entry to include as milliseconds since Unix epoch (default: 0 = all entries)',
            },
            filter: {
              type: 'string',
              description: 'Optional text string to search for in log entries',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_groov_info':      return this.getGroovInfo();
        case 'get_current_user':    return this.getCurrentUser();
        case 'list_devices':        return this.listDevices();
        case 'list_device_tags':    return this.listDeviceTags(args);
        case 'list_all_tags':       return this.listAllTags();
        case 'read_tag':            return this.readTag(args);
        case 'batch_read_tags':     return this.batchReadTags(args);
        case 'write_tag':           return this.writeTag(args);
        case 'download_log_json':   return this.downloadLogJson(args);
        case 'download_log_text':   return this.downloadLogText(args);
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

  private buildUrl(path: string, params: Record<string, string | number | undefined> = {}, withAuth = true): string {
    const qs = new URLSearchParams();
    if (withAuth) qs.set('api_key', this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    return `${this.baseUrl}${path}?${qs.toString()}`;
  }

  private async getJson(path: string, params: Record<string, string | number | undefined> = {}, withAuth = true): Promise<ToolResult> {
    const url = this.buildUrl(path, params, withAuth);
    const response = await this.fetchWithRetry(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async postJson(path: string, body: unknown): Promise<ToolResult> {
    const url = this.buildUrl(path);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getText(path: string, params: Record<string, string | number | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { headers: { 'Accept': 'text/plain' } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getGroovInfo(): Promise<ToolResult> {
    // /info requires no auth per spec
    return this.getJson('/info', {}, false);
  }

  private async getCurrentUser(): Promise<ToolResult> {
    return this.getJson('/whoami');
  }

  private async listDevices(): Promise<ToolResult> {
    return this.getJson('/v1/data-store/devices');
  }

  private async listDeviceTags(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.device_id === undefined) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.getJson(`/v1/data-store/devices/${encodeURIComponent(String(args.device_id))}/tags`);
  }

  private async listAllTags(): Promise<ToolResult> {
    return this.getJson('/v1/data-store/tags');
  }

  private async readTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.tag_id === undefined) return { content: [{ type: 'text', text: 'tag_id is required' }], isError: true };
    const params: Record<string, number | undefined> = {
      index: args.index as number | undefined,
      count: args.count as number | undefined,
    };
    return this.getJson(`/v1/data-store/read/${encodeURIComponent(String(args.tag_id))}`, params);
  }

  private async batchReadTags(args: Record<string, unknown>): Promise<ToolResult> {
    if (!Array.isArray(args.tags)) return { content: [{ type: 'text', text: 'tags must be an array' }], isError: true };
    return this.postJson('/v1/data-store/read', args.tags);
  }

  private async writeTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.tag_id === undefined) return { content: [{ type: 'text', text: 'tag_id is required' }], isError: true };
    if (args.value === undefined) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    // write_tag uses POST with query params per the OpenAPI spec
    const qs = new URLSearchParams({ api_key: this.apiKey, value: String(args.value) });
    if (args.index !== undefined) qs.set('index', String(args.index));
    const url = `${this.baseUrl}/v1/data-store/write/${encodeURIComponent(String(args.tag_id))}?${qs.toString()}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async downloadLogJson(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {
      'minimum-log-level': (args.minimum_log_level as string | undefined) ?? 'INFO',
      'last-timestamp': args.last_timestamp as number | undefined,
      filter: args.filter as string | undefined,
    };
    return this.getJson('/v1/logging/groovLogs.json', params);
  }

  private async downloadLogText(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {
      'minimum-log-level': (args.minimum_log_level as string | undefined) ?? 'INFO',
      'last-timestamp': args.last_timestamp as number | undefined,
      filter: args.filter as string | undefined,
    };
    return this.getText('/v1/logging/groovLogs.txt', params);
  }
}
