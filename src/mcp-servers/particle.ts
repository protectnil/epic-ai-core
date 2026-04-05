/**
 * Particle IoT MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Particle MCP server from Particle Industries (particle-iot GitHub org).
// Community server exists: https://github.com/zradlicz/particle-mcp-server (not from Particle Inc.)
// Our adapter covers: 16 tools (devices, functions, variables, events, products, fleet management).
//
// Base URL: https://api.particle.io/v1
// Auth: Bearer access token in Authorization header (OAuth2 access token from Particle dashboard)
// Docs: https://docs.particle.io/reference/cloud-apis/api/
// Rate limits: 10 req/sec per access token for device-specific calls; burst to 150 req/min

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ParticleConfig {
  accessToken: string;
  baseUrl?: string;
}

export class ParticleMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ParticleConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.particle.io/v1';
  }

  static catalog() {
    return {
      name: 'particle',
      displayName: 'Particle IoT',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'particle', 'iot', 'internet of things', 'device', 'firmware', 'microcontroller',
        'photon', 'argon', 'boron', 'electron', 'fleet', 'webhook', 'event',
        'cloud function', 'cloud variable', 'product', 'sensor', 'embedded',
      ],
      toolNames: [
        'list_devices', 'get_device', 'rename_device',
        'call_function', 'get_variable',
        'list_events', 'publish_event',
        'list_products', 'get_product',
        'list_product_devices', 'get_product_device',
        'list_webhooks', 'get_webhook', 'create_webhook', 'delete_webhook',
        'get_access_token_info',
      ],
      description: 'Particle IoT platform: manage devices and fleets, call cloud functions, read variables, publish and subscribe to events, and configure webhooks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_devices',
        description: 'List all Particle devices (Photon, Argon, Boron, etc.) owned by the authenticated account',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Number of devices per page (default: 25, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Get detailed information for a specific Particle device by device ID including firmware, connectivity, and last seen',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Particle device ID (24-character hex string)',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'rename_device',
        description: 'Rename a Particle device by setting a new human-readable name',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Particle device ID to rename',
            },
            name: {
              type: 'string',
              description: 'New display name for the device',
            },
          },
          required: ['device_id', 'name'],
        },
      },
      {
        name: 'call_function',
        description: 'Call a cloud function registered on a Particle device and return the result — device must be online',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Particle device ID to call the function on',
            },
            function_name: {
              type: 'string',
              description: 'Name of the cloud function to invoke (as registered in firmware)',
            },
            argument: {
              type: 'string',
              description: 'String argument to pass to the function (max 622 bytes)',
            },
          },
          required: ['device_id', 'function_name'],
        },
      },
      {
        name: 'get_variable',
        description: 'Read the current value of a cloud variable from a Particle device — device must be online',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Particle device ID to read the variable from',
            },
            variable_name: {
              type: 'string',
              description: 'Name of the cloud variable to read (as registered in firmware)',
            },
          },
          required: ['device_id', 'variable_name'],
        },
      },
      {
        name: 'list_events',
        description: 'List recent device or product events with optional name prefix filter (server-sent event stream snapshot)',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Filter events by specific device ID (omit for all account events)',
            },
            event_prefix: {
              type: 'string',
              description: 'Filter events by name prefix (e.g. "sensor/" matches "sensor/temp")',
            },
          },
        },
      },
      {
        name: 'publish_event',
        description: 'Publish a Particle event from the cloud to trigger device subscribers or integrations',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Event name to publish (e.g. "temperature_alert")',
            },
            data: {
              type: 'string',
              description: 'Event data payload (max 622 bytes)',
            },
            private: {
              type: 'boolean',
              description: 'Whether to publish as a private event visible only to your account (default: true)',
            },
            ttl: {
              type: 'number',
              description: 'Time-to-live in seconds (default: 60, max: 16777215)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_products',
        description: 'List all Particle product configurations in the authenticated account (fleet management)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_product',
        description: 'Get detailed configuration for a specific Particle product fleet by product ID or slug',
        inputSchema: {
          type: 'object',
          properties: {
            product_id_or_slug: {
              type: 'string',
              description: 'Numeric product ID or product slug string',
            },
          },
          required: ['product_id_or_slug'],
        },
      },
      {
        name: 'list_product_devices',
        description: 'List devices enrolled in a Particle product fleet with optional online status and group filters',
        inputSchema: {
          type: 'object',
          properties: {
            product_id_or_slug: {
              type: 'string',
              description: 'Product ID or slug to list devices for',
            },
            online: {
              type: 'boolean',
              description: 'Filter by online status (true = only online, false = only offline, omit = all)',
            },
            groups: {
              type: 'string',
              description: 'Comma-separated device group names to filter by',
            },
            per_page: {
              type: 'number',
              description: 'Number of devices per page (default: 25)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['product_id_or_slug'],
        },
      },
      {
        name: 'get_product_device',
        description: 'Get details for a specific device within a Particle product fleet by device ID',
        inputSchema: {
          type: 'object',
          properties: {
            product_id_or_slug: {
              type: 'string',
              description: 'Product ID or slug',
            },
            device_id: {
              type: 'string',
              description: 'Device ID to retrieve within the product',
            },
          },
          required: ['product_id_or_slug', 'device_id'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhooks (integrations) configured in the authenticated account or a product',
        inputSchema: {
          type: 'object',
          properties: {
            product_id_or_slug: {
              type: 'string',
              description: 'Scope to a product fleet (omit for personal account webhooks)',
            },
          },
        },
      },
      {
        name: 'get_webhook',
        description: 'Get configuration details for a specific webhook integration by ID',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'Webhook integration ID',
            },
          },
          required: ['webhook_id'],
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a new webhook integration that forwards Particle events to an HTTP endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            event: {
              type: 'string',
              description: 'Event name prefix to trigger the webhook (e.g. "temperature")',
            },
            url: {
              type: 'string',
              description: 'HTTPS URL to POST the event payload to',
            },
            request_type: {
              type: 'string',
              description: 'HTTP method: POST (default), GET, PUT, DELETE',
            },
            device_id: {
              type: 'string',
              description: 'Restrict webhook to events from a specific device ID (optional)',
            },
            product_id_or_slug: {
              type: 'string',
              description: 'Product to create the webhook for (omit for personal account)',
            },
          },
          required: ['event', 'url'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook integration by ID — events will no longer be forwarded to the configured URL',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'Webhook integration ID to delete',
            },
          },
          required: ['webhook_id'],
        },
      },
      {
        name: 'get_access_token_info',
        description: 'Get the Particle account profile for the authenticated user — returns username, account type, and membership info',
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
        case 'rename_device':
          return this.renameDevice(args);
        case 'call_function':
          return this.callFunction(args);
        case 'get_variable':
          return this.getVariable(args);
        case 'list_events':
          return this.listEvents(args);
        case 'publish_event':
          return this.publishEvent(args);
        case 'list_products':
          return this.listProducts();
        case 'get_product':
          return this.getProduct(args);
        case 'list_product_devices':
          return this.listProductDevices(args);
        case 'get_product_device':
          return this.getProductDevice(args);
        case 'list_webhooks':
          return this.listWebhooks(args);
        case 'get_webhook':
          return this.getWebhook(args);
        case 'create_webhook':
          return this.createWebhook(args);
        case 'delete_webhook':
          return this.deleteWebhook(args);
        case 'get_access_token_info':
          return this.getAccessTokenInfo();
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };
  }

  private get jsonHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.jsonHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: new URLSearchParams(body).toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPostJson(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.jsonHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.jsonHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.jsonHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'deleted' }) }], isError: false };
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) ?? 25),
      page: String((args.page as number) ?? 1),
    };
    return this.apiGet('/devices', params);
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.apiGet(`/devices/${encodeURIComponent(args.device_id as string)}`);
  }

  private async renameDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id || !args.name) {
      return { content: [{ type: 'text', text: 'device_id and name are required' }], isError: true };
    }
    return this.apiPut(`/devices/${encodeURIComponent(args.device_id as string)}`, { name: args.name });
  }

  private async callFunction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id || !args.function_name) {
      return { content: [{ type: 'text', text: 'device_id and function_name are required' }], isError: true };
    }
    const body: Record<string, string> = {
      arg: (args.argument as string) ?? '',
    };
    return this.apiPost(`/devices/${encodeURIComponent(args.device_id as string)}/${encodeURIComponent(args.function_name as string)}`, body);
  }

  private async getVariable(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id || !args.variable_name) {
      return { content: [{ type: 'text', text: 'device_id and variable_name are required' }], isError: true };
    }
    return this.apiGet(`/devices/${encodeURIComponent(args.device_id as string)}/${encodeURIComponent(args.variable_name as string)}`);
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    // Particle events are SSE streams; we return the REST endpoint URL for client consumption
    let path = '/events';
    if (args.event_prefix) path += `/${encodeURIComponent(args.event_prefix as string)}`;
    if (args.device_id) {
      path = `/devices/${encodeURIComponent(args.device_id as string)}/events`;
      if (args.event_prefix) path += `/${encodeURIComponent(args.event_prefix as string)}`;
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          stream_url: `${this.baseUrl}${path}`,
          note: 'Particle events are delivered as a Server-Sent Events (SSE) stream. Connect to stream_url with Authorization header to receive live events.',
        }, null, 2),
      }],
      isError: false,
    };
  }

  private async publishEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, string> = {
      name: args.name as string,
      data: (args.data as string) ?? '',
      private: typeof args.private === 'boolean' ? String(args.private) : 'true',
      ttl: String((args.ttl as number) ?? 60),
    };
    return this.apiPost('/devices/events', body);
  }

  private async listProducts(): Promise<ToolResult> {
    return this.apiGet('/products');
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id_or_slug) return { content: [{ type: 'text', text: 'product_id_or_slug is required' }], isError: true };
    return this.apiGet(`/products/${encodeURIComponent(args.product_id_or_slug as string)}`);
  }

  private async listProductDevices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id_or_slug) return { content: [{ type: 'text', text: 'product_id_or_slug is required' }], isError: true };
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) ?? 25),
      page: String((args.page as number) ?? 1),
    };
    if (typeof args.online === 'boolean') params.online = String(args.online);
    if (args.groups) params.groups = args.groups as string;
    return this.apiGet(`/products/${encodeURIComponent(args.product_id_or_slug as string)}/devices`, params);
  }

  private async getProductDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id_or_slug || !args.device_id) {
      return { content: [{ type: 'text', text: 'product_id_or_slug and device_id are required' }], isError: true };
    }
    return this.apiGet(`/products/${encodeURIComponent(args.product_id_or_slug as string)}/devices/${encodeURIComponent(args.device_id as string)}`);
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.product_id_or_slug) {
      return this.apiGet(`/products/${encodeURIComponent(args.product_id_or_slug as string)}/webhooks`);
    }
    return this.apiGet('/webhooks');
  }

  private async getWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_id) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    return this.apiGet(`/webhooks/${encodeURIComponent(args.webhook_id as string)}`);
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event || !args.url) return { content: [{ type: 'text', text: 'event and url are required' }], isError: true };
    const body: Record<string, unknown> = {
      event: args.event,
      url: args.url,
      requestType: (args.request_type as string) ?? 'POST',
    };
    if (args.device_id) body.deviceid = args.device_id;
    const path = args.product_id_or_slug
      ? `/products/${encodeURIComponent(args.product_id_or_slug as string)}/webhooks`
      : '/webhooks';
    return this.apiPostJson(path, body);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_id) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    return this.apiDelete(`/webhooks/${encodeURIComponent(args.webhook_id as string)}`);
  }

  private async getAccessTokenInfo(): Promise<ToolResult> {
    return this.apiGet('/user');
  }
}
