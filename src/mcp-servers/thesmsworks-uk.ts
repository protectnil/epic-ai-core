/**
 * The SMS Works MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official The SMS Works MCP server found on GitHub.
//
// Base URL: https://api.thesmsworks.co.uk/v1
// Auth: JWT token — Authorization: {JWT}
//       Obtain JWT via POST /auth/token with API key + secret from dashboard.
// Docs: https://thesmsworks.co.uk/api-docs
// Rate limits: Determined by account plan; check dashboard.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TheSMSWorksConfig {
  jwt: string;
  baseUrl?: string;
}

export class TheSMSWorksUKMCPServer extends MCPAdapterBase {
  private readonly jwt: string;
  private readonly baseUrl: string;

  constructor(config: TheSMSWorksConfig) {
    super();
    this.jwt = config.jwt;
    this.baseUrl = config.baseUrl ?? 'https://api.thesmsworks.co.uk/v1';
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: this.jwt,
      'Content-Type': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'thesmsworks-uk',
      displayName: 'The SMS Works',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: [
        'sms', 'text message', 'uk sms', 'bulk sms', 'send sms', 'flash sms',
        'batch sms', 'scheduled sms', 'inbox', 'credits', 'thesmsworks',
      ],
      toolNames: [
        'send_message',
        'schedule_message',
        'send_flash_message',
        'get_message',
        'delete_message',
        'query_messages',
        'query_failed_messages',
        'query_inbox',
        'list_scheduled_messages',
        'cancel_scheduled_message',
        'send_batch',
        'schedule_batch',
        'send_batch_any',
        'get_batch',
        'cancel_scheduled_batch',
        'get_credit_balance',
        'test_connection',
        'get_error_details',
      ],
      description:
        'Send and manage SMS messages in the UK via The SMS Works API: single messages, flash SMS, ' +
        'scheduled delivery, batch sending, inbox querying, failed message analysis, credit balance, ' +
        'and error code lookup.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_message',
        description: 'Send a single SMS message immediately via The SMS Works API.',
        inputSchema: {
          type: 'object',
          properties: {
            sender: {
              type: 'string',
              description: 'The sender name or number (max 11 alphanumeric chars or 15 digits)',
            },
            destination: {
              type: 'string',
              description: 'Recipient phone number in international format (e.g. 447700900000)',
            },
            content: {
              type: 'string',
              description: 'The text content of the SMS message (max 459 chars for multi-part)',
            },
            tag: {
              type: 'string',
              description: 'Optional tag to label the message for filtering',
            },
            ttl: {
              type: 'number',
              description: 'Time-to-live in minutes. Message expires if not delivered within this period.',
            },
            responseemail: {
              type: 'array',
              description: 'Array of email addresses to notify on delivery receipt',
              items: { type: 'string' },
            },
          },
          required: ['sender', 'destination', 'content'],
        },
      },
      {
        name: 'schedule_message',
        description: 'Schedule a single SMS message for future delivery.',
        inputSchema: {
          type: 'object',
          properties: {
            sender: {
              type: 'string',
              description: 'The sender name or number',
            },
            destination: {
              type: 'string',
              description: 'Recipient phone number in international format',
            },
            content: {
              type: 'string',
              description: 'The text content of the SMS message',
            },
            schedule: {
              type: 'string',
              description: 'ISO 8601 datetime for when the message should be sent (e.g. 2026-04-01T10:00:00)',
            },
            tag: {
              type: 'string',
              description: 'Optional tag to label the message',
            },
            ttl: {
              type: 'number',
              description: 'Time-to-live in minutes after the scheduled time',
            },
          },
          required: ['sender', 'destination', 'content', 'schedule'],
        },
      },
      {
        name: 'send_flash_message',
        description: 'Send a flash SMS that appears directly on the recipient\'s screen without being stored.',
        inputSchema: {
          type: 'object',
          properties: {
            sender: {
              type: 'string',
              description: 'The sender name or number',
            },
            destination: {
              type: 'string',
              description: 'Recipient phone number in international format',
            },
            content: {
              type: 'string',
              description: 'The text content of the flash SMS message',
            },
            tag: {
              type: 'string',
              description: 'Optional tag to label the message',
            },
          },
          required: ['sender', 'destination', 'content'],
        },
      },
      {
        name: 'get_message',
        description: 'Retrieve a single sent message by its message ID.',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: {
              type: 'string',
              description: 'The ID of the message to retrieve',
            },
          },
          required: ['messageid'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a message from the account by message ID.',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: {
              type: 'string',
              description: 'The ID of the message to delete',
            },
          },
          required: ['messageid'],
        },
      },
      {
        name: 'query_messages',
        description: 'Query sent messages using filters such as status, tag, sender, destination, or date range.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by message status: SENT, DELIVERED, FAILED, EXPIRED, etc.',
            },
            credits: {
              type: 'number',
              description: 'Filter by credit cost of message',
            },
            destination: {
              type: 'string',
              description: 'Filter by destination phone number',
            },
            sender: {
              type: 'string',
              description: 'Filter by sender name or number',
            },
            keyword: {
              type: 'string',
              description: 'Filter by keyword in message content',
            },
            from: {
              type: 'string',
              description: 'Start of date range (ISO 8601)',
            },
            to: {
              type: 'string',
              description: 'End of date range (ISO 8601)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of messages to return',
            },
          },
        },
      },
      {
        name: 'query_failed_messages',
        description: 'Query messages that failed to deliver, with optional filters for analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Failure status code to filter by',
            },
            destination: {
              type: 'string',
              description: 'Filter by destination phone number',
            },
            sender: {
              type: 'string',
              description: 'Filter by sender',
            },
            from: {
              type: 'string',
              description: 'Start of date range (ISO 8601)',
            },
            to: {
              type: 'string',
              description: 'End of date range (ISO 8601)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return',
            },
          },
        },
      },
      {
        name: 'query_inbox',
        description: 'Query inbound messages (SMS replies) received into the account inbox.',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Filter inbox messages by keyword',
            },
            from: {
              type: 'string',
              description: 'Start of date range (ISO 8601)',
            },
            to: {
              type: 'string',
              description: 'End of date range (ISO 8601)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of inbox messages to return',
            },
          },
        },
      },
      {
        name: 'list_scheduled_messages',
        description: 'List all messages currently scheduled for future delivery.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'cancel_scheduled_message',
        description: 'Cancel a scheduled message before it is sent.',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: {
              type: 'string',
              description: 'The ID of the scheduled message to cancel',
            },
          },
          required: ['messageid'],
        },
      },
      {
        name: 'send_batch',
        description: 'Send the same SMS message to multiple recipients in a single batch.',
        inputSchema: {
          type: 'object',
          properties: {
            sender: {
              type: 'string',
              description: 'The sender name or number',
            },
            destinations: {
              type: 'array',
              description: 'Array of recipient phone numbers in international format',
              items: { type: 'string' },
            },
            content: {
              type: 'string',
              description: 'The text content of the SMS message',
            },
            tag: {
              type: 'string',
              description: 'Optional tag to label the batch',
            },
            ttl: {
              type: 'number',
              description: 'Time-to-live in minutes',
            },
          },
          required: ['sender', 'destinations', 'content'],
        },
      },
      {
        name: 'schedule_batch',
        description: 'Schedule a batch SMS message to multiple recipients for future delivery.',
        inputSchema: {
          type: 'object',
          properties: {
            sender: {
              type: 'string',
              description: 'The sender name or number',
            },
            destinations: {
              type: 'array',
              description: 'Array of recipient phone numbers in international format',
              items: { type: 'string' },
            },
            content: {
              type: 'string',
              description: 'The text content of the SMS message',
            },
            schedule: {
              type: 'string',
              description: 'ISO 8601 datetime for delivery',
            },
            tag: {
              type: 'string',
              description: 'Optional tag to label the batch',
            },
          },
          required: ['sender', 'destinations', 'content', 'schedule'],
        },
      },
      {
        name: 'send_batch_any',
        description: 'Send a batch where each message can have a different destination and/or content.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of message objects, each with sender, destination, and content fields',
              items: { type: 'object' },
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'get_batch',
        description: 'Retrieve the status and details of a batch by batch ID.',
        inputSchema: {
          type: 'object',
          properties: {
            batchid: {
              type: 'string',
              description: 'The ID of the batch to retrieve',
            },
          },
          required: ['batchid'],
        },
      },
      {
        name: 'cancel_scheduled_batch',
        description: 'Cancel a scheduled batch before it is sent.',
        inputSchema: {
          type: 'object',
          properties: {
            batchid: {
              type: 'string',
              description: 'The ID of the scheduled batch to cancel',
            },
          },
          required: ['batchid'],
        },
      },
      {
        name: 'get_credit_balance',
        description: 'Get the current SMS credit balance for the account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'test_connection',
        description: 'Test the API connection and authentication. Returns a confirmation that the API is reachable.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_error_details',
        description: 'Look up the description and resolution for a specific The SMS Works error code.',
        inputSchema: {
          type: 'object',
          properties: {
            errorcode: {
              type: 'string',
              description: 'The error code to look up (e.g. "MXXX" or numeric error code)',
            },
          },
          required: ['errorcode'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_message':
          return await this.sendMessage(args);
        case 'schedule_message':
          return await this.scheduleMessage(args);
        case 'send_flash_message':
          return await this.sendFlashMessage(args);
        case 'get_message':
          return await this.getMessage(args);
        case 'delete_message':
          return await this.deleteMessage(args);
        case 'query_messages':
          return await this.queryMessages(args);
        case 'query_failed_messages':
          return await this.queryFailedMessages(args);
        case 'query_inbox':
          return await this.queryInbox(args);
        case 'list_scheduled_messages':
          return await this.listScheduledMessages();
        case 'cancel_scheduled_message':
          return await this.cancelScheduledMessage(args);
        case 'send_batch':
          return await this.sendBatch(args);
        case 'schedule_batch':
          return await this.scheduleBatch(args);
        case 'send_batch_any':
          return await this.sendBatchAny(args);
        case 'get_batch':
          return await this.getBatch(args);
        case 'cancel_scheduled_batch':
          return await this.cancelScheduledBatch(args);
        case 'get_credit_balance':
          return await this.getCreditBalance();
        case 'test_connection':
          return await this.testConnection();
        case 'get_error_details':
          return await this.getErrorDetails(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: this.authHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ status: 204, message: 'Success (no content)' }) }],
        isError: false,
      };
    }

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `The SMS Works API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const txt = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: this.truncate(txt || JSON.stringify({ status: response.status })) }],
        isError: false,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private buildMessageBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      sender: args.sender as string,
      destination: args.destination as string,
      content: args.content as string,
    };
    if (args.tag) body.tag = args.tag;
    if (args.ttl) body.ttl = args.ttl;
    if (args.responseemail) body.responseemail = args.responseemail;
    return body;
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sender || !args.destination || !args.content) {
      return { content: [{ type: 'text', text: 'sender, destination, and content are required' }], isError: true };
    }
    return this.request('POST', '/message/send', this.buildMessageBody(args));
  }

  private async scheduleMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sender || !args.destination || !args.content || !args.schedule) {
      return { content: [{ type: 'text', text: 'sender, destination, content, and schedule are required' }], isError: true };
    }
    const body = this.buildMessageBody(args);
    body.schedule = args.schedule;
    return this.request('POST', '/message/schedule', body);
  }

  private async sendFlashMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sender || !args.destination || !args.content) {
      return { content: [{ type: 'text', text: 'sender, destination, and content are required' }], isError: true };
    }
    return this.request('POST', '/message/flash', this.buildMessageBody(args));
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const messageid = args.messageid as string;
    if (!messageid) {
      return { content: [{ type: 'text', text: 'messageid is required' }], isError: true };
    }
    return this.request('GET', `/messages/${encodeURIComponent(messageid)}`);
  }

  private async deleteMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const messageid = args.messageid as string;
    if (!messageid) {
      return { content: [{ type: 'text', text: 'messageid is required' }], isError: true };
    }
    return this.request('DELETE', `/messages/${encodeURIComponent(messageid)}`);
  }

  private buildQueryBody(args: Record<string, unknown>): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    if (args.status) query.status = args.status;
    if (args.credits !== undefined) query.credits = args.credits;
    if (args.destination) query.destination = args.destination;
    if (args.sender) query.sender = args.sender;
    if (args.keyword) query.keyword = args.keyword;
    if (args.from) query.from = args.from;
    if (args.to) query.to = args.to;
    if (args.limit) query.limit = args.limit;
    return query;
  }

  private async queryMessages(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/messages', this.buildQueryBody(args));
  }

  private async queryFailedMessages(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/messages/failed', this.buildQueryBody(args));
  }

  private async queryInbox(args: Record<string, unknown>): Promise<ToolResult> {
    const query: Record<string, unknown> = {};
    if (args.keyword) query.keyword = args.keyword;
    if (args.from) query.from = args.from;
    if (args.to) query.to = args.to;
    if (args.limit) query.limit = args.limit;
    return this.request('POST', '/messages/inbox', query);
  }

  private async listScheduledMessages(): Promise<ToolResult> {
    return this.request('GET', '/messages/schedule');
  }

  private async cancelScheduledMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const messageid = args.messageid as string;
    if (!messageid) {
      return { content: [{ type: 'text', text: 'messageid is required' }], isError: true };
    }
    return this.request('DELETE', `/messages/schedule/${encodeURIComponent(messageid)}`);
  }

  private buildBatchBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      sender: args.sender as string,
      destinations: args.destinations,
      content: args.content as string,
    };
    if (args.tag) body.tag = args.tag;
    if (args.ttl) body.ttl = args.ttl;
    return body;
  }

  private async sendBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sender || !args.destinations || !args.content) {
      return { content: [{ type: 'text', text: 'sender, destinations, and content are required' }], isError: true };
    }
    return this.request('POST', '/batch/send', this.buildBatchBody(args));
  }

  private async scheduleBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sender || !args.destinations || !args.content || !args.schedule) {
      return { content: [{ type: 'text', text: 'sender, destinations, content, and schedule are required' }], isError: true };
    }
    const body = this.buildBatchBody(args);
    body.schedule = args.schedule;
    return this.request('POST', '/batch/schedule', body);
  }

  private async sendBatchAny(args: Record<string, unknown>): Promise<ToolResult> {
    const messages = args.messages as unknown[];
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { content: [{ type: 'text', text: 'messages array is required and must be non-empty' }], isError: true };
    }
    return this.request('POST', '/batch/any', { messages });
  }

  private async getBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const batchid = args.batchid as string;
    if (!batchid) {
      return { content: [{ type: 'text', text: 'batchid is required' }], isError: true };
    }
    return this.request('GET', `/batch/${encodeURIComponent(batchid)}`);
  }

  private async cancelScheduledBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const batchid = args.batchid as string;
    if (!batchid) {
      return { content: [{ type: 'text', text: 'batchid is required' }], isError: true };
    }
    return this.request('DELETE', `/batches/schedule/${encodeURIComponent(batchid)}`);
  }

  private async getCreditBalance(): Promise<ToolResult> {
    return this.request('GET', '/credits/balance');
  }

  private async testConnection(): Promise<ToolResult> {
    return this.request('GET', '/utils/test');
  }

  private async getErrorDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const errorcode = args.errorcode as string;
    if (!errorcode) {
      return { content: [{ type: 'text', text: 'errorcode is required' }], isError: true };
    }
    return this.request('GET', `/utils/errors/${encodeURIComponent(errorcode)}`);
  }
}
