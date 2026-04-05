/**
 * Courier MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/trycourier/courier-mcp — transport: streamable-HTTP, auth: API key header
// Published by trycourier (official Courier org, verified github.com/trycourier). Last updated: 2026-03-18.
// Our adapter covers: 18 tools. Vendor MCP covers: 60 tools (full API surface).
// Recommendation: use-vendor-mcp — the official Courier MCP is actively maintained (updated 2026-03-18),
//   exposes 60 tools covering the full API (strict superset of our 18 tools), and supports streamable-HTTP.
//   All 18 of our tools map to equivalent MCP tools; MCP adds 42 more (audiences, automations, bulk,
//   tenants, users/preferences, translations, inbound, audit events, auth tokens, brand create/delete).
//   Keep this REST adapter for air-gapped deployments that cannot reach the hosted MCP endpoint.
// NOTE: Vendor MCP (https://github.com/trycourier/courier-mcp) exposes 60 tools — superset of REST API.
//   Prefer vendor MCP for full coverage. Use this adapter for air-gapped deployments.
//
// Base URL: https://api.courier.com
// Auth: Bearer token (Authorization: Bearer {API_KEY}) — API key from Courier dashboard
// Docs: https://www.courier.com/docs/reference/
// Rate limits: Lists POST /subscriptions: 20 req/min; PUT /lists: 20 req/min;
//              Brands PUT: 200 req/min; Events PUT: 20 req/min. Other endpoints: not specified.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CourierConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CourierMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CourierConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.courier.com';
  }

  static catalog() {
    return {
      name: 'courier',
      displayName: 'Courier',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'courier', 'notification', 'multi-channel', 'email', 'sms', 'push', 'in-app',
        'slack', 'teams', 'send', 'message', 'profile', 'list', 'template', 'brand',
        'automation', 'bulk', 'digest', 'notification infrastructure',
      ],
      toolNames: [
        'send_notification', 'send_to_list',
        'get_message', 'list_messages', 'cancel_message',
        'get_profile', 'upsert_profile', 'merge_profile', 'delete_profile',
        'list_lists', 'get_list', 'create_or_replace_list', 'subscribe_to_list', 'unsubscribe_from_list',
        'list_templates', 'get_template',
        'list_brands', 'get_brand',
      ],
      description: 'Courier multi-channel notifications: send messages via email, SMS, push, and Slack; manage profiles, lists, templates, brands, and message history.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_notification',
        description: 'Send a notification to a recipient via one or more channels using a Courier template or inline content',
        inputSchema: {
          type: 'object',
          properties: {
            recipient_id: {
              type: 'string',
              description: 'Unique recipient identifier (will be created in Courier Profiles if new)',
            },
            template: {
              type: 'string',
              description: 'Courier notification template ID or event name to use',
            },
            email: {
              type: 'string',
              description: 'Recipient email address (overrides profile email for this send)',
            },
            phone_number: {
              type: 'string',
              description: 'Recipient phone number in E.164 format for SMS (e.g. +12125550100)',
            },
            data: {
              type: 'object',
              description: 'Key-value data object passed to template variables (e.g. {"name": "Alice"})',
            },
            channels: {
              type: 'object',
              description: 'Channel-specific overrides object (e.g. {"email": {"subject": "Hello"}})',
            },
          },
          required: ['recipient_id', 'template'],
        },
      },
      {
        name: 'send_to_list',
        description: 'Send a notification to all subscribers in a Courier list using a template, with optional data overrides',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'Courier list ID to broadcast the notification to',
            },
            template: {
              type: 'string',
              description: 'Courier notification template ID',
            },
            data: {
              type: 'object',
              description: 'Key-value data object passed to template variables for all recipients',
            },
          },
          required: ['list_id', 'template'],
        },
      },
      {
        name: 'get_message',
        description: 'Retrieve the delivery status and metadata of a sent notification by Courier message ID',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Courier message ID returned from a send call',
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'list_messages',
        description: 'List sent notification messages with optional filters for recipient, status, channel, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            recipient: {
              type: 'string',
              description: 'Filter messages by recipient ID',
            },
            status: {
              type: 'string',
              description: 'Filter by delivery status: sent, delivered, opened, clicked, failed, undeliverable',
            },
            channel: {
              type: 'string',
              description: 'Filter by channel: email, sms, push, direct_message, webhook',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'cancel_message',
        description: 'Cancel a scheduled or queued notification before it is delivered by message ID',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Courier message ID to cancel',
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'get_profile',
        description: 'Retrieve a recipient profile by ID, including stored channel addresses and custom attributes',
        inputSchema: {
          type: 'object',
          properties: {
            recipient_id: {
              type: 'string',
              description: 'Recipient ID to retrieve the profile for',
            },
          },
          required: ['recipient_id'],
        },
      },
      {
        name: 'upsert_profile',
        description: 'Create or fully replace a recipient profile with channel addresses, name, and custom attributes',
        inputSchema: {
          type: 'object',
          properties: {
            recipient_id: {
              type: 'string',
              description: 'Recipient ID to create or replace',
            },
            email: {
              type: 'string',
              description: 'Email address for the recipient profile',
            },
            phone_number: {
              type: 'string',
              description: 'Phone number in E.164 format for SMS routing',
            },
            full_name: {
              type: 'string',
              description: 'Display name for the recipient',
            },
            locale: {
              type: 'string',
              description: 'BCP 47 locale code for the recipient (e.g. en-US, fr-FR)',
            },
            custom: {
              type: 'object',
              description: 'Additional custom key-value attributes to store on the profile',
            },
          },
          required: ['recipient_id'],
        },
      },
      {
        name: 'merge_profile',
        description: 'Merge (patch) new attributes into an existing recipient profile without replacing existing fields',
        inputSchema: {
          type: 'object',
          properties: {
            recipient_id: {
              type: 'string',
              description: 'Recipient ID to update',
            },
            profile: {
              type: 'object',
              description: 'Partial profile object with only the fields to add or update',
            },
          },
          required: ['recipient_id', 'profile'],
        },
      },
      {
        name: 'delete_profile',
        description: 'Delete a recipient profile and all associated data from Courier by recipient ID',
        inputSchema: {
          type: 'object',
          properties: {
            recipient_id: {
              type: 'string',
              description: 'Recipient ID to delete',
            },
          },
          required: ['recipient_id'],
        },
      },
      {
        name: 'list_lists',
        description: 'List all Courier lists with optional cursor-based pagination for iteration',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response next cursor field',
            },
          },
        },
      },
      {
        name: 'get_list',
        description: 'Retrieve a Courier list by ID including name and subscriber count',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'Courier list ID',
            },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'create_or_replace_list',
        description: 'Create a new Courier list or fully replace an existing list by ID',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'List ID to create or replace (e.g. "product.updates.weekly")',
            },
            name: {
              type: 'string',
              description: 'Human-readable name for the list',
            },
          },
          required: ['list_id', 'name'],
        },
      },
      {
        name: 'subscribe_to_list',
        description: 'Subscribe one or more recipients to a Courier list for future list broadcasts',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'Courier list ID to subscribe recipients to',
            },
            recipients: {
              type: 'array',
              description: 'Array of recipient ID strings to subscribe (e.g. ["user_1", "user_2"])',
            },
          },
          required: ['list_id', 'recipients'],
        },
      },
      {
        name: 'unsubscribe_from_list',
        description: 'Unsubscribe a recipient from a Courier list so they no longer receive list broadcasts',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'Courier list ID to unsubscribe the recipient from',
            },
            recipient_id: {
              type: 'string',
              description: 'Recipient ID to remove from the list',
            },
          },
          required: ['list_id', 'recipient_id'],
        },
      },
      {
        name: 'list_templates',
        description: 'List all notification templates available in the Courier workspace with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_template',
        description: 'Retrieve a Courier notification template by ID with channel content and routing rules',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'Courier template ID (also referred to as event ID)',
            },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'list_brands',
        description: 'List all brands in the Courier workspace used for styling notifications',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_brand',
        description: 'Retrieve a Courier brand by ID including colors, logo, and email layout settings',
        inputSchema: {
          type: 'object',
          properties: {
            brand_id: {
              type: 'string',
              description: 'Courier brand ID',
            },
          },
          required: ['brand_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_notification':
          return this.sendNotification(args);
        case 'send_to_list':
          return this.sendToList(args);
        case 'get_message':
          return this.getMessage(args);
        case 'list_messages':
          return this.listMessages(args);
        case 'cancel_message':
          return this.cancelMessage(args);
        case 'get_profile':
          return this.getProfile(args);
        case 'upsert_profile':
          return this.upsertProfile(args);
        case 'merge_profile':
          return this.mergeProfile(args);
        case 'delete_profile':
          return this.deleteProfile(args);
        case 'list_lists':
          return this.listLists(args);
        case 'get_list':
          return this.getList(args);
        case 'create_or_replace_list':
          return this.createOrReplaceList(args);
        case 'subscribe_to_list':
          return this.subscribeToList(args);
        case 'unsubscribe_from_list':
          return this.unsubscribeFromList(args);
        case 'list_templates':
          return this.listTemplates(args);
        case 'get_template':
          return this.getTemplate(args);
        case 'list_brands':
          return this.listBrands(args);
        case 'get_brand':
          return this.getBrand(args);
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

  // --- Helpers ---

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async courierGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async courierPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async courierPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async courierPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async courierDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  // --- Tool implementations ---

  private async sendNotification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recipient_id || !args.template) {
      return { content: [{ type: 'text', text: 'recipient_id and template are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      message: {
        to: { user_id: args.recipient_id },
        template: args.template,
      },
    };
    const msg = body.message as Record<string, unknown>;
    if (args.email || args.phone_number) {
      const to = msg.to as Record<string, unknown>;
      if (args.email) to.email = args.email;
      if (args.phone_number) to.phone_number = args.phone_number;
    }
    if (args.data) msg.data = args.data;
    if (args.channels) msg.channels = args.channels;
    return this.courierPost('/send', body);
  }

  private async sendToList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id || !args.template) {
      return { content: [{ type: 'text', text: 'list_id and template are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      message: {
        to: { list_id: args.list_id },
        template: args.template,
      },
    };
    if (args.data) (body.message as Record<string, unknown>).data = args.data;
    return this.courierPost('/send', body);
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    return this.courierGet(`/messages/${encodeURIComponent(args.message_id as string)}`);
  }

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.recipient) params.recipient = args.recipient as string;
    if (args.status) params.status = args.status as string;
    if (args.channel) params.channel = args.channel as string;
    if (args.cursor) params.cursor = args.cursor as string;
    return this.courierGet('/messages', params);
  }

  private async cancelMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    return this.courierPost(`/messages/${encodeURIComponent(args.message_id as string)}/cancel`, {});
  }

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recipient_id) return { content: [{ type: 'text', text: 'recipient_id is required' }], isError: true };
    return this.courierGet(`/profiles/${encodeURIComponent(args.recipient_id as string)}`);
  }

  private async upsertProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recipient_id) return { content: [{ type: 'text', text: 'recipient_id is required' }], isError: true };
    const profile: Record<string, unknown> = {};
    if (args.email) profile.email = args.email;
    if (args.phone_number) profile.phone_number = args.phone_number;
    if (args.full_name) profile.name = args.full_name;
    if (args.locale) profile.locale = args.locale;
    if (args.custom && typeof args.custom === 'object') {
      Object.assign(profile, args.custom);
    }
    return this.courierPut(`/profiles/${encodeURIComponent(args.recipient_id as string)}`, { profile });
  }

  private async mergeProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recipient_id || !args.profile) return { content: [{ type: 'text', text: 'recipient_id and profile are required' }], isError: true };
    return this.courierPatch(`/profiles/${encodeURIComponent(args.recipient_id as string)}`, { profile: args.profile });
  }

  private async deleteProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recipient_id) return { content: [{ type: 'text', text: 'recipient_id is required' }], isError: true };
    return this.courierDelete(`/profiles/${encodeURIComponent(args.recipient_id as string)}`);
  }

  private async listLists(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    return this.courierGet('/lists', params);
  }

  private async getList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id) return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    return this.courierGet(`/lists/${encodeURIComponent(args.list_id as string)}`);
  }

  private async createOrReplaceList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id || !args.name) return { content: [{ type: 'text', text: 'list_id and name are required' }], isError: true };
    return this.courierPut(`/lists/${encodeURIComponent(args.list_id as string)}`, { name: args.name });
  }

  private async subscribeToList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id || !args.recipients) return { content: [{ type: 'text', text: 'list_id and recipients are required' }], isError: true };
    const recipients = (args.recipients as string[]).map(id => ({ recipientId: id }));
    return this.courierPost(`/lists/${encodeURIComponent(args.list_id as string)}/subscriptions`, { recipients });
  }

  private async unsubscribeFromList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id || !args.recipient_id) return { content: [{ type: 'text', text: 'list_id and recipient_id are required' }], isError: true };
    return this.courierDelete(`/lists/${encodeURIComponent(args.list_id as string)}/subscriptions/${encodeURIComponent(args.recipient_id as string)}`);
  }

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    return this.courierGet('/notifications', params);
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_id) return { content: [{ type: 'text', text: 'template_id is required' }], isError: true };
    return this.courierGet(`/notifications/${encodeURIComponent(args.template_id as string)}`);
  }

  private async listBrands(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    return this.courierGet('/brands', params);
  }

  private async getBrand(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.brand_id) return { content: [{ type: 'text', text: 'brand_id is required' }], isError: true };
    return this.courierGet(`/brands/${encodeURIComponent(args.brand_id as string)}`);
  }
}
