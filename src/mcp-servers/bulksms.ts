/**
 * BulkSMS MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28. BulkSMS (the company) has not published an official MCP server.
// Community MCP: None found. No community MCP server for the BulkSMS API exists on GitHub or npm.
// Our adapter covers: 15 tools (send messages, retrieve messages, show message, related received messages,
//   send by GET, get profile, list/create/read/update/delete webhooks, list/create blocked numbers,
//   transfer credits, pre-sign attachment).
// Recommendation: use-rest-api — no official or community BulkSMS MCP exists. Our adapter provides full coverage.
//
// Base URL: https://api.bulksms.com/v1
// Auth: HTTP Basic Auth. Username + password OR token-id + token-secret, Base64-encoded.
//       Preemptively send Authorization header on every request (do not wait for 401).
//       API tokens created at: Settings > Developer Settings > API Tokens in the BulkSMS web app.
// Docs: https://www.bulksms.com/developer/json/v1/
// Rate limits: Contact BulkSMS for current quota limits. Quota info available via get_profile.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BulkSMSConfig {
  /** Base64-encoded "username:password" or "token-id:token-secret" for Basic Auth */
  credentials: string;
  /** Optional base URL override (default: https://api.bulksms.com/v1) */
  baseUrl?: string;
}

export class BulkSMSMCPServer extends MCPAdapterBase {
  private readonly credentials: string;
  private readonly baseUrl: string;

  constructor(config: BulkSMSConfig) {
    super();
    this.credentials = config.credentials;
    this.baseUrl = config.baseUrl ?? 'https://api.bulksms.com/v1';
  }

  static catalog() {
    return {
      name: 'bulksms',
      displayName: 'BulkSMS',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: [
        'bulksms', 'sms', 'text', 'message', 'messaging', 'bulk', 'notification',
        'phone', 'mobile', 'communication', 'webhook', 'delivery', 'report',
        'credits', 'sender', 'recipient', 'two-way', 'inbound', 'outbound',
      ],
      toolNames: [
        'send_messages',
        'send_message_get',
        'retrieve_messages',
        'show_message',
        'list_related_received_messages',
        'get_profile',
        'list_webhooks',
        'create_webhook',
        'read_webhook',
        'update_webhook',
        'delete_webhook',
        'list_blocked_numbers',
        'create_blocked_number',
        'transfer_credits',
        'pre_sign_attachment',
      ],
      description: 'BulkSMS API: send SMS messages in bulk, retrieve sent and received messages, manage webhooks for delivery reports, block numbers, transfer credits, and upload MMS attachments.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_messages',
        description: 'Send one or more SMS messages to one or more recipients — supports scheduling, custom sender ID, encoding, and deduplication',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of message objects. Each must include "to" (phone number or array of numbers) and "body" (message text). Optional fields: from (sender id), encoding (TEXT/UNICODE/BINARY), routingGroup (STANDARD/PREMIUM/ECONOMY), deliveryReports (ALL/NONE/ERRORS), longMessageMaxParts, userSuppliedId, protocolId, messageClass.',
            },
            deduplication_id: {
              type: 'number',
              description: 'Prevents duplicate submissions if the same request is retried. Supply a unique integer per logical submission.',
            },
            auto_unicode: {
              type: 'boolean',
              description: 'Automatically use UNICODE encoding if the body contains non-GSM characters (default: false)',
            },
            schedule_date: {
              type: 'string',
              description: 'ISO 8601 date-time to schedule the message for future delivery (e.g. 2026-04-01T09:00:00Z)',
            },
            schedule_description: {
              type: 'string',
              description: 'A label for the scheduled submission, shown in the BulkSMS web app',
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'send_message_get',
        description: 'Send a single SMS message via a simple GET request — suitable for quick integrations and testing',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient phone number in international format (e.g. +27831234567)',
            },
            body: {
              type: 'string',
              description: 'The SMS message text to send',
            },
            deduplication_id: {
              type: 'number',
              description: 'Optional integer to prevent duplicate submissions on retry',
            },
          },
          required: ['to', 'body'],
        },
      },
      {
        name: 'retrieve_messages',
        description: 'Retrieve sent and received SMS messages with optional filters — sorted by submission time',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 1000)',
            },
            filter: {
              type: 'string',
              description: 'Filter messages by field values. Format: "field==value" (e.g. "type==SENT", "status.type==DELIVERED"). Multiple filters separated by comma.',
            },
            sort_order: {
              type: 'string',
              description: 'Sort order for results: ASCENDING or DESCENDING (default: ASCENDING)',
            },
          },
        },
      },
      {
        name: 'show_message',
        description: 'Retrieve details of a specific message by its ID — includes delivery status, cost, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The unique message ID assigned by BulkSMS',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_related_received_messages',
        description: 'List inbound (received) SMS messages that are replies to a specific sent message',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the sent message to find replies for',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_profile',
        description: 'Get the profile of the authenticated BulkSMS account — includes credit balance, quota, and account details',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured on the BulkSMS account — webhooks receive delivery reports and inbound messages',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a new webhook to receive delivery report notifications or inbound message events',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'A unique text identifier for this webhook',
            },
            url: {
              type: 'string',
              description: 'The HTTPS URL that BulkSMS will POST events to',
            },
            trigger_scope: {
              type: 'string',
              description: 'When to trigger: SENT (delivery reports for sent messages), RECEIVED (inbound messages)',
            },
            active: {
              type: 'boolean',
              description: 'Whether this webhook is active (default: true)',
            },
            contact_email_address: {
              type: 'string',
              description: 'Email address to notify if the webhook fails repeatedly',
            },
            invoke_option: {
              type: 'string',
              description: 'How to batch events: ONE (one event per POST) or MANY (array of events per POST, default: MANY)',
            },
            on_web_app: {
              type: 'boolean',
              description: 'Whether to show this webhook in the BulkSMS web app (default: false)',
            },
          },
          required: ['name', 'url', 'trigger_scope'],
        },
      },
      {
        name: 'read_webhook',
        description: 'Get the configuration details of a specific webhook by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The webhook ID to retrieve',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_webhook',
        description: 'Update the configuration of an existing webhook',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The webhook ID to update',
            },
            name: {
              type: 'string',
              description: 'New unique text identifier for the webhook',
            },
            url: {
              type: 'string',
              description: 'New HTTPS URL for the webhook',
            },
            trigger_scope: {
              type: 'string',
              description: 'When to trigger: SENT or RECEIVED',
            },
            active: {
              type: 'boolean',
              description: 'Whether the webhook is active',
            },
            contact_email_address: {
              type: 'string',
              description: 'Email address for failure notifications',
            },
            invoke_option: {
              type: 'string',
              description: 'Batching mode: ONE or MANY',
            },
            on_web_app: {
              type: 'boolean',
              description: 'Whether to show in the BulkSMS web app',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook by ID — this action is permanent and cannot be undone',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The webhook ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_blocked_numbers',
        description: 'List phone numbers that are blocked from receiving messages on this account',
        inputSchema: {
          type: 'object',
          properties: {
            min_id: {
              type: 'number',
              description: 'Return only blocked numbers with an ID greater than this value (for pagination)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of blocked numbers to return',
            },
          },
        },
      },
      {
        name: 'create_blocked_number',
        description: 'Block one or more phone numbers from receiving messages sent from this account',
        inputSchema: {
          type: 'object',
          properties: {
            phone_numbers: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of phone numbers in international format to block (e.g. ["+27831234567"])',
            },
          },
          required: ['phone_numbers'],
        },
      },
      {
        name: 'transfer_credits',
        description: 'Transfer SMS credits from this account to another BulkSMS account',
        inputSchema: {
          type: 'object',
          properties: {
            to_user_id: {
              type: 'number',
              description: 'The numeric user ID of the recipient account',
            },
            to_username: {
              type: 'string',
              description: 'The username of the recipient account (must match to_user_id)',
            },
            credits: {
              type: 'number',
              description: 'The number of credits to transfer',
            },
            comment_on_from: {
              type: 'string',
              description: 'Optional note shown on the credit history of this (sending) account (max 100 chars)',
            },
            comment_on_to: {
              type: 'string',
              description: 'Optional note shown on the credit history of the recipient account (max 100 chars)',
            },
          },
          required: ['to_user_id', 'to_username', 'credits'],
        },
      },
      {
        name: 'pre_sign_attachment',
        description: 'Get a pre-signed upload URL for attaching a file (image, audio, video) to an RMM (Rich Media Messaging) SMS',
        inputSchema: {
          type: 'object',
          properties: {
            media_type: {
              type: 'string',
              description: 'MIME type of the file to upload (e.g. image/jpeg, audio/mp3, video/mp4)',
            },
            file_extension: {
              type: 'string',
              description: 'File extension of the attachment (e.g. jpg, mp3, mp4)',
            },
          },
          required: ['media_type', 'file_extension'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_messages':
          return this.sendMessages(args);
        case 'send_message_get':
          return this.sendMessageGet(args);
        case 'retrieve_messages':
          return this.retrieveMessages(args);
        case 'show_message':
          return this.showMessage(args);
        case 'list_related_received_messages':
          return this.listRelatedReceivedMessages(args);
        case 'get_profile':
          return this.getProfile();
        case 'list_webhooks':
          return this.listWebhooks();
        case 'create_webhook':
          return this.createWebhook(args);
        case 'read_webhook':
          return this.readWebhook(args);
        case 'update_webhook':
          return this.updateWebhook(args);
        case 'delete_webhook':
          return this.deleteWebhook(args);
        case 'list_blocked_numbers':
          return this.listBlockedNumbers(args);
        case 'create_blocked_number':
          return this.createBlockedNumber(args);
        case 'transfer_credits':
          return this.transferCredits(args);
        case 'pre_sign_attachment':
          return this.preSignAttachment(args);
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

  private buildHeaders(): Record<string, string> {
    return {
      'Authorization': `Basic ${this.credentials}`,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params: Record<string, string | number | undefined> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const query = qs.toString();
    const url = `${this.baseUrl}${path}${query ? `?${query}` : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) {
      let errText = `API error: ${response.status} ${response.statusText}`;
      try { const e = await response.json(); errText += ` — ${JSON.stringify(e)}`; } catch { /* ignore */ }
      return { content: [{ type: 'text', text: errText }], isError: true };
    }
    if (response.status === 204) return { content: [{ type: 'text', text: 'OK (no content)' }], isError: false };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`BulkSMS API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown, params: Record<string, string | number | undefined> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const query = qs.toString();
    const url = `${this.baseUrl}${path}${query ? `?${query}` : ''}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let errText = `API error: ${response.status} ${response.statusText}`;
      try { const e = await response.json(); errText += ` — ${JSON.stringify(e)}`; } catch { /* ignore */ }
      return { content: [{ type: 'text', text: errText }], isError: true };
    }
    if (response.status === 204) return { content: [{ type: 'text', text: 'OK (no content)' }], isError: false };
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`BulkSMS API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.buildHeaders() });
    if (!response.ok) {
      let errText = `API error: ${response.status} ${response.statusText}`;
      try { const e = await response.json(); errText += ` — ${JSON.stringify(e)}`; } catch { /* ignore */ }
      return { content: [{ type: 'text', text: errText }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Deleted successfully' }], isError: false };
  }

  private async sendMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messages) return { content: [{ type: 'text', text: 'messages is required' }], isError: true };
    const queryParams: Record<string, string | number | undefined> = {};
    if (args.deduplication_id !== undefined) queryParams['deduplication-id'] = args.deduplication_id as number;
    if (args.auto_unicode !== undefined) queryParams['auto-unicode'] = String(args.auto_unicode);
    if (args.schedule_date) queryParams['schedule-date'] = args.schedule_date as string;
    if (args.schedule_description) queryParams['schedule-description'] = args.schedule_description as string;
    return this.post('/messages', args.messages, queryParams);
  }

  private async sendMessageGet(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to) return { content: [{ type: 'text', text: 'to is required' }], isError: true };
    if (!args.body) return { content: [{ type: 'text', text: 'body is required' }], isError: true };
    const params: Record<string, string | number | undefined> = {
      to: args.to as string,
      body: args.body as string,
    };
    if (args.deduplication_id !== undefined) params['deduplication-id'] = args.deduplication_id as number;
    return this.get('/messages/send', params);
  }

  private async retrieveMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {};
    if (args.limit !== undefined) params.limit = args.limit as number;
    if (args.filter) params.filter = args.filter as string;
    if (args.sort_order) params.sortOrder = args.sort_order as string;
    return this.get('/messages', params);
  }

  private async showMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/messages/${encodeURIComponent(args.id as string)}`);
  }

  private async listRelatedReceivedMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/messages/${encodeURIComponent(args.id as string)}/relatedReceivedMessages`);
  }

  private async getProfile(): Promise<ToolResult> {
    return this.get('/profile');
  }

  private async listWebhooks(): Promise<ToolResult> {
    return this.get('/webhooks');
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    if (!args.trigger_scope) return { content: [{ type: 'text', text: 'trigger_scope is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      url: args.url,
      triggerScope: args.trigger_scope,
    };
    if (args.active !== undefined) body.active = args.active;
    if (args.contact_email_address) body.contactEmailAddress = args.contact_email_address;
    if (args.invoke_option) body.invokeOption = args.invoke_option;
    if (args.on_web_app !== undefined) body.onWebApp = args.on_web_app;
    return this.post('/webhooks', body);
  }

  private async readWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get(`/webhooks/${encodeURIComponent(args.id as string)}`);
  }

  private async updateWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.url) body.url = args.url;
    if (args.trigger_scope) body.triggerScope = args.trigger_scope;
    if (args.active !== undefined) body.active = args.active;
    if (args.contact_email_address) body.contactEmailAddress = args.contact_email_address;
    if (args.invoke_option) body.invokeOption = args.invoke_option;
    if (args.on_web_app !== undefined) body.onWebApp = args.on_web_app;
    return this.post(`/webhooks/${encodeURIComponent(args.id as string)}`, body);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.del(`/webhooks/${encodeURIComponent(args.id as string)}`);
  }

  private async listBlockedNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | undefined> = {};
    if (args.min_id !== undefined) params['min-id'] = args.min_id as number;
    if (args.limit !== undefined) params.limit = args.limit as number;
    return this.get('/blocked-numbers', params);
  }

  private async createBlockedNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_numbers || !Array.isArray(args.phone_numbers)) {
      return { content: [{ type: 'text', text: 'phone_numbers must be a non-empty array' }], isError: true };
    }
    const body = (args.phone_numbers as string[]).map(n => ({ phoneNumber: n }));
    return this.post('/blocked-numbers', body);
  }

  private async transferCredits(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.to_user_id === undefined) return { content: [{ type: 'text', text: 'to_user_id is required' }], isError: true };
    if (!args.to_username) return { content: [{ type: 'text', text: 'to_username is required' }], isError: true };
    if (args.credits === undefined) return { content: [{ type: 'text', text: 'credits is required' }], isError: true };
    const body: Record<string, unknown> = {
      toUserId: args.to_user_id,
      toUsername: args.to_username,
      credits: args.credits,
    };
    if (args.comment_on_from) body.commentOnFrom = args.comment_on_from;
    if (args.comment_on_to) body.commentOnTo = args.comment_on_to;
    return this.post('/credit/transfer', body);
  }

  private async preSignAttachment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.media_type) return { content: [{ type: 'text', text: 'media_type is required' }], isError: true };
    if (!args.file_extension) return { content: [{ type: 'text', text: 'file_extension is required' }], isError: true };
    return this.post('/rmm/pre-sign-attachment', {
      mediaType: args.media_type,
      fileExtension: args.file_extension,
    });
  }
}
