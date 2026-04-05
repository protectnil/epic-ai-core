/**
 * ZoomConnect MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: https://www.zoomconnect.com/app/api/rest/v1
// Auth: Two API key headers — email (your account email) and token (your API token).
//       Obtain token from ZoomConnect dashboard → API Settings.
// Docs: https://www.zoomconnect.com/app/api-docs
// Rate limits: Not published; use messagesPerMinute on bulk sends to self-throttle.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ZoomConnectConfig {
  email: string;
  token: string;
  baseUrl?: string;
}

export class ZoomConnectMCPServer extends MCPAdapterBase {
  private readonly email: string;
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: ZoomConnectConfig) {
    super();
    this.email = config.email;
    this.token = config.token;
    this.baseUrl = config.baseUrl ?? 'https://www.zoomconnect.com/app/api/rest/v1';
  }

  private get authHeaders(): Record<string, string> {
    return {
      email: this.email,
      token: this.token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'zoomconnect',
      displayName: 'ZoomConnect',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: [
        'zoomconnect', 'sms', 'bulk sms', 'text message', 'messaging', 'marketing',
        'send sms', 'contact', 'group', 'template', 'campaign', 'recipient',
        'mobile', 'phone', 'balance', 'credits', 'statistics',
      ],
      toolNames: [
        'send_sms',
        'send_sms_bulk',
        'send_sms_url_parameters',
        'get_account_balance',
        'get_account_statistics',
        'list_messages',
        'get_message',
        'delete_message',
        'mark_message_read',
        'mark_message_unread',
        'list_contacts',
        'create_contact',
        'get_contact',
        'delete_contact',
        'list_groups',
        'create_group',
        'get_group',
        'delete_group',
        'add_contact_to_group',
        'remove_contact_from_group',
        'list_templates',
        'get_template',
        'delete_template',
      ],
      description:
        'Send individual and bulk SMS messages via ZoomConnect. Manage contacts, groups, templates, ' +
        'and monitor account balance, statistics, and message history.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_sms',
        description:
          'Send a single SMS message to a recipient phone number via ZoomConnect. ' +
          'Supports scheduled delivery and optional campaign/data-field tagging.',
        inputSchema: {
          type: 'object',
          properties: {
            recipientNumber: {
              type: 'string',
              description: 'Recipient phone number in international format (e.g. +447700900000)',
            },
            message: {
              type: 'string',
              description: 'SMS message body text',
            },
            dateToSend: {
              type: 'string',
              description: 'Scheduled send time in ISO 8601 date-time format (optional, sends immediately if omitted)',
            },
            campaign: {
              type: 'string',
              description: 'Optional campaign label to group this message for reporting',
            },
            dataField: {
              type: 'string',
              description: 'Optional custom data field value stored with the message',
            },
          },
          required: ['recipientNumber', 'message'],
        },
      },
      {
        name: 'send_sms_bulk',
        description:
          'Send multiple SMS messages in a single bulk request. Each message can have its own recipient, ' +
          'content, and scheduled time. Rate-limit delivery with messagesPerMinute.',
        inputSchema: {
          type: 'object',
          properties: {
            sendSmsRequests: {
              type: 'array',
              description:
                'Array of SMS message objects, each with recipientNumber and message. ' +
                'Optional per-item fields: dateToSend, campaign, dataField.',
              items: { type: 'object' },
            },
            defaultDateToSend: {
              type: 'string',
              description: 'Default scheduled send time in ISO 8601 format applied to items with no dateToSend',
            },
            messagesPerMinute: {
              type: 'number',
              description: 'Maximum number of messages to send per minute (optional, for throttling large batches)',
            },
          },
          required: ['sendSmsRequests'],
        },
      },
      {
        name: 'send_sms_url_parameters',
        description:
          'Send a single SMS using URL query parameters instead of a JSON body — ' +
          'useful for quick integrations or webhook-style triggers.',
        inputSchema: {
          type: 'object',
          properties: {
            recipientNumber: {
              type: 'string',
              description: 'Recipient phone number in international format',
            },
            message: {
              type: 'string',
              description: 'SMS message body text',
            },
            dateToSend: {
              type: 'string',
              description: 'Scheduled send time in ISO 8601 format (optional)',
            },
            campaign: {
              type: 'string',
              description: 'Optional campaign label',
            },
            dataField: {
              type: 'string',
              description: 'Optional custom data field value',
            },
          },
          required: ['recipientNumber', 'message'],
        },
      },
      {
        name: 'get_account_balance',
        description: 'Retrieve the current SMS credit balance for the ZoomConnect account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_account_statistics',
        description: 'Retrieve sending statistics for the ZoomConnect account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_messages',
        description:
          'List sent and received messages in the ZoomConnect account with optional filters for type, ' +
          'status, date range, phone numbers, campaign, and read state.',
        inputSchema: {
          type: 'object',
          properties: {
            pageSize: {
              type: 'number',
              description: 'Number of results per page (default: 20)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (0-indexed)',
            },
            type: {
              type: 'string',
              description: 'Filter by message type: SENT or RECEIVED',
            },
            status: {
              type: 'string',
              description: 'Filter by delivery status (e.g. DELIVERED, FAILED)',
            },
            fromDateTimeSent: {
              type: 'string',
              description: 'Filter messages sent on or after this ISO 8601 date-time',
            },
            toDateTimeSent: {
              type: 'string',
              description: 'Filter messages sent on or before this ISO 8601 date-time',
            },
            fromNumber: {
              type: 'string',
              description: 'Filter by sender phone number',
            },
            toNumber: {
              type: 'string',
              description: 'Filter by recipient phone number',
            },
            campaign: {
              type: 'string',
              description: 'Filter by campaign label',
            },
            deleted: {
              type: 'boolean',
              description: 'If true, include deleted messages',
            },
            read: {
              type: 'boolean',
              description: 'Filter by read state (true = read, false = unread)',
            },
          },
        },
      },
      {
        name: 'get_message',
        description: 'Retrieve details of a specific message by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'The ZoomConnect message ID',
            },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a specific message from the ZoomConnect account by message ID.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'The ZoomConnect message ID to delete',
            },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'mark_message_read',
        description: 'Mark a specific message as read by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'The ZoomConnect message ID to mark as read',
            },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'mark_message_unread',
        description: 'Mark a specific message as unread by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'The ZoomConnect message ID to mark as unread',
            },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List all contacts stored in the ZoomConnect account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in ZoomConnect with a phone number and optional name fields.',
        inputSchema: {
          type: 'object',
          properties: {
            contactNumber: {
              type: 'string',
              description: 'Contact phone number in international format',
            },
            firstName: {
              type: 'string',
              description: 'Contact first name (optional)',
            },
            lastName: {
              type: 'string',
              description: 'Contact last name (optional)',
            },
            title: {
              type: 'string',
              description: 'Contact title/honorific (optional)',
            },
          },
          required: ['contactNumber'],
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve a specific contact by their ZoomConnect contact ID.',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: {
              type: 'string',
              description: 'The ZoomConnect contact ID',
            },
          },
          required: ['contactId'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Delete a contact from the ZoomConnect account by contact ID.',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: {
              type: 'string',
              description: 'The ZoomConnect contact ID to delete',
            },
          },
          required: ['contactId'],
        },
      },
      {
        name: 'list_groups',
        description: 'List all contact groups in the ZoomConnect account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_group',
        description: 'Create a new contact group in ZoomConnect for bulk messaging.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new contact group',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_group',
        description: 'Retrieve a specific contact group and its members by group ID.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'The ZoomConnect group ID',
            },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'delete_group',
        description: 'Delete a contact group from the ZoomConnect account by group ID.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'The ZoomConnect group ID to delete',
            },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'add_contact_to_group',
        description: 'Add an existing contact to a group in ZoomConnect.',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: {
              type: 'string',
              description: 'The ZoomConnect contact ID',
            },
            groupId: {
              type: 'string',
              description: 'The ZoomConnect group ID to add the contact to',
            },
          },
          required: ['contactId', 'groupId'],
        },
      },
      {
        name: 'remove_contact_from_group',
        description: 'Remove a contact from a group in ZoomConnect.',
        inputSchema: {
          type: 'object',
          properties: {
            groupId: {
              type: 'string',
              description: 'The ZoomConnect group ID',
            },
            contactId: {
              type: 'string',
              description: 'The ZoomConnect contact ID to remove from the group',
            },
          },
          required: ['groupId', 'contactId'],
        },
      },
      {
        name: 'list_templates',
        description: 'List all SMS message templates saved in the ZoomConnect account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_template',
        description: 'Retrieve a specific SMS template by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: {
              type: 'number',
              description: 'The ZoomConnect template ID',
            },
          },
          required: ['templateId'],
        },
      },
      {
        name: 'delete_template',
        description: 'Delete an SMS template from the ZoomConnect account by template ID.',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: {
              type: 'number',
              description: 'The ZoomConnect template ID to delete',
            },
          },
          required: ['templateId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_sms':
          return await this.sendSms(args);
        case 'send_sms_bulk':
          return await this.sendSmsBulk(args);
        case 'send_sms_url_parameters':
          return await this.sendSmsUrlParameters(args);
        case 'get_account_balance':
          return await this.getAccountBalance();
        case 'get_account_statistics':
          return await this.getAccountStatistics();
        case 'list_messages':
          return await this.listMessages(args);
        case 'get_message':
          return await this.getMessage(args);
        case 'delete_message':
          return await this.deleteMessage(args);
        case 'mark_message_read':
          return await this.markMessageRead(args);
        case 'mark_message_unread':
          return await this.markMessageUnread(args);
        case 'list_contacts':
          return await this.listContacts();
        case 'create_contact':
          return await this.createContact(args);
        case 'get_contact':
          return await this.getContact(args);
        case 'delete_contact':
          return await this.deleteContact(args);
        case 'list_groups':
          return await this.listGroups();
        case 'create_group':
          return await this.createGroup(args);
        case 'get_group':
          return await this.getGroup(args);
        case 'delete_group':
          return await this.deleteGroup(args);
        case 'add_contact_to_group':
          return await this.addContactToGroup(args);
        case 'remove_contact_from_group':
          return await this.removeContactFromGroup(args);
        case 'list_templates':
          return await this.listTemplates();
        case 'get_template':
          return await this.getTemplate(args);
        case 'delete_template':
          return await this.deleteTemplate(args);
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
    params?: URLSearchParams,
  ): Promise<ToolResult> {
    const qs = params && params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
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
            text: `ZoomConnect API error ${response.status} ${response.statusText}: ${errText}`,
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

  private async sendSms(args: Record<string, unknown>): Promise<ToolResult> {
    const recipientNumber = args.recipientNumber as string;
    const message = args.message as string;
    if (!recipientNumber || !message) {
      return {
        content: [{ type: 'text', text: 'recipientNumber and message are required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { recipientNumber, message };
    if (args.dateToSend) body.dateToSend = args.dateToSend;
    if (args.campaign) body.campaign = args.campaign;
    if (args.dataField) body.dataField = args.dataField;
    return this.request('POST', '/sms/send', body);
  }

  private async sendSmsBulk(args: Record<string, unknown>): Promise<ToolResult> {
    const sendSmsRequests = args.sendSmsRequests as unknown[];
    if (!sendSmsRequests || !Array.isArray(sendSmsRequests) || sendSmsRequests.length === 0) {
      return {
        content: [{ type: 'text', text: 'sendSmsRequests array is required and must be non-empty' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { sendSmsRequests };
    if (args.defaultDateToSend) body.defaultDateToSend = args.defaultDateToSend;
    if (args.messagesPerMinute) body.messagesPerMinute = args.messagesPerMinute;
    return this.request('POST', '/sms/send-bulk', body);
  }

  private async sendSmsUrlParameters(args: Record<string, unknown>): Promise<ToolResult> {
    const recipientNumber = args.recipientNumber as string;
    const message = args.message as string;
    if (!recipientNumber || !message) {
      return {
        content: [{ type: 'text', text: 'recipientNumber and message are required' }],
        isError: true,
      };
    }
    const params = new URLSearchParams({ recipientNumber, message });
    if (args.dateToSend) params.set('dateToSend', args.dateToSend as string);
    if (args.campaign) params.set('campaign', args.campaign as string);
    if (args.dataField) params.set('dataField', args.dataField as string);
    return this.request('POST', '/sms/send-url-parameters', undefined, params);
  }

  private async getAccountBalance(): Promise<ToolResult> {
    return this.request('GET', '/account/balance');
  }

  private async getAccountStatistics(): Promise<ToolResult> {
    return this.request('GET', '/account/statistics');
  }

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.pageSize !== undefined) params.set('pageSize', String(args.pageSize as number));
    if (args.page !== undefined) params.set('page', String(args.page as number));
    if (args.type) params.set('type', args.type as string);
    if (args.status) params.set('status', args.status as string);
    if (args.fromDateTimeSent) params.set('fromDateTimeSent', args.fromDateTimeSent as string);
    if (args.toDateTimeSent) params.set('toDateTimeSent', args.toDateTimeSent as string);
    if (args.fromNumber) params.set('fromNumber', args.fromNumber as string);
    if (args.toNumber) params.set('toNumber', args.toNumber as string);
    if (args.campaign) params.set('campaign', args.campaign as string);
    if (args.deleted !== undefined) params.set('deleted', String(args.deleted as boolean));
    if (args.read !== undefined) params.set('read', String(args.read as boolean));
    return this.request('GET', '/messages/all', undefined, params.toString() ? params : undefined);
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    if (!messageId) {
      return { content: [{ type: 'text', text: 'messageId is required' }], isError: true };
    }
    return this.request('GET', `/messages/${encodeURIComponent(messageId)}`);
  }

  private async deleteMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    if (!messageId) {
      return { content: [{ type: 'text', text: 'messageId is required' }], isError: true };
    }
    return this.request('DELETE', `/messages/${encodeURIComponent(messageId)}`);
  }

  private async markMessageRead(args: Record<string, unknown>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    if (!messageId) {
      return { content: [{ type: 'text', text: 'messageId is required' }], isError: true };
    }
    return this.request('PUT', `/messages/${encodeURIComponent(messageId)}/markRead`);
  }

  private async markMessageUnread(args: Record<string, unknown>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    if (!messageId) {
      return { content: [{ type: 'text', text: 'messageId is required' }], isError: true };
    }
    return this.request('PUT', `/messages/${encodeURIComponent(messageId)}/markUnread`);
  }

  private async listContacts(): Promise<ToolResult> {
    return this.request('GET', '/contacts/all');
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const contactNumber = args.contactNumber as string;
    if (!contactNumber) {
      return { content: [{ type: 'text', text: 'contactNumber is required' }], isError: true };
    }
    const body: Record<string, unknown> = { contactNumber };
    if (args.firstName) body.firstName = args.firstName;
    if (args.lastName) body.lastName = args.lastName;
    if (args.title) body.title = args.title;
    return this.request('POST', '/contacts/create', body);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    const contactId = args.contactId as string;
    if (!contactId) {
      return { content: [{ type: 'text', text: 'contactId is required' }], isError: true };
    }
    return this.request('GET', `/contacts/${encodeURIComponent(contactId)}`);
  }

  private async deleteContact(args: Record<string, unknown>): Promise<ToolResult> {
    const contactId = args.contactId as string;
    if (!contactId) {
      return { content: [{ type: 'text', text: 'contactId is required' }], isError: true };
    }
    return this.request('DELETE', `/contacts/${encodeURIComponent(contactId)}`);
  }

  private async listGroups(): Promise<ToolResult> {
    return this.request('GET', '/groups/all');
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    return this.request('POST', '/groups/create', { name });
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const groupId = args.groupId as string;
    if (!groupId) {
      return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
    }
    return this.request('GET', `/groups/${encodeURIComponent(groupId)}`);
  }

  private async deleteGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const groupId = args.groupId as string;
    if (!groupId) {
      return { content: [{ type: 'text', text: 'groupId is required' }], isError: true };
    }
    return this.request('DELETE', `/groups/${encodeURIComponent(groupId)}`);
  }

  private async addContactToGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const contactId = args.contactId as string;
    const groupId = args.groupId as string;
    if (!contactId || !groupId) {
      return { content: [{ type: 'text', text: 'contactId and groupId are required' }], isError: true };
    }
    return this.request('PUT', `/contacts/${encodeURIComponent(contactId)}/addToGroup/${encodeURIComponent(groupId)}`);
  }

  private async removeContactFromGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const groupId = args.groupId as string;
    const contactId = args.contactId as string;
    if (!groupId || !contactId) {
      return { content: [{ type: 'text', text: 'groupId and contactId are required' }], isError: true };
    }
    return this.request('DELETE', `/groups/${encodeURIComponent(groupId)}/removeContact/${encodeURIComponent(contactId)}`);
  }

  private async listTemplates(): Promise<ToolResult> {
    return this.request('GET', '/templates/all');
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const templateId = args.templateId as number;
    if (templateId === undefined || templateId === null) {
      return { content: [{ type: 'text', text: 'templateId is required' }], isError: true };
    }
    return this.request('GET', `/templates/${templateId}`);
  }

  private async deleteTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const templateId = args.templateId as number;
    if (templateId === undefined || templateId === null) {
      return { content: [{ type: 'text', text: 'templateId is required' }], isError: true };
    }
    return this.request('DELETE', `/templates/${templateId}`);
  }
}
