/**
 * Mandrill (Mandrillapp) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://mandrillapp.com/api/1.0
// Auth: All requests require a "key" field in the JSON POST body (Mandrill API key)
// All endpoints are POST, accepting JSON body, returning JSON
// Docs: https://mandrillapp.com/api/docs/
// Rate limits: Not publicly specified; Mandrill enforces per-account sending quotas

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MandrillConfig {
  apiKey: string;
}

export class MandrillappMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://mandrillapp.com/api/1.0';

  constructor(config: MandrillConfig) {
    super();
    this.apiKey = config.apiKey;
  }

  static catalog() {
    return {
      name: 'mandrillapp',
      displayName: 'Mandrill',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'mandrill', 'mailchimp', 'transactional email', 'email delivery', 'smtp',
        'send email', 'email template', 'email tracking', 'bounce', 'reject',
        'suppression', 'webhook', 'sender', 'subaccount', 'tag', 'inbound',
      ],
      toolNames: [
        'send_message', 'send_template',
        'search_messages', 'get_message_info',
        'list_templates', 'render_template',
        'list_senders', 'get_sender_info',
        'list_rejects', 'add_reject', 'delete_reject',
        'list_tags', 'get_tag_info',
        'list_subaccounts', 'get_user_info',
      ],
      description: 'Mandrill transactional email: send messages and templates, search delivery history, manage senders, handle rejection lists, track tags, and manage subaccounts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_message',
        description: 'Send a transactional email message through Mandrill with full recipient, content, and tracking control',
        inputSchema: {
          type: 'object',
          properties: {
            from_email: {
              type: 'string',
              description: 'Sender email address',
            },
            from_name: {
              type: 'string',
              description: 'Sender display name',
            },
            to: {
              type: 'array',
              description: 'List of recipients. Each item: { email, name?, type? } where type is "to", "cc", or "bcc"',
              items: { type: 'object' },
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
            },
            html: {
              type: 'string',
              description: 'HTML body content',
            },
            text: {
              type: 'string',
              description: 'Plain-text body content',
            },
            tags: {
              type: 'array',
              description: 'Tags to categorize this message (max 5)',
              items: { type: 'string' },
            },
            subaccount: {
              type: 'string',
              description: 'Subaccount ID to send this message from',
            },
            track_opens: {
              type: 'boolean',
              description: 'Enable open tracking (default: account setting)',
            },
            track_clicks: {
              type: 'boolean',
              description: 'Enable click tracking (default: account setting)',
            },
            async: {
              type: 'boolean',
              description: 'Enable async sending — returns immediately without waiting for MTA response (default: false)',
            },
            send_at: {
              type: 'string',
              description: 'UTC timestamp to schedule send (format: YYYY-MM-DD HH:MM:SS)',
            },
            bcc_address: {
              type: 'string',
              description: 'BCC address to receive a copy of every message',
            },
          },
          required: ['from_email', 'to', 'subject'],
        },
      },
      {
        name: 'send_template',
        description: 'Send a Mandrill template-based transactional email with merge variable substitution',
        inputSchema: {
          type: 'object',
          properties: {
            template_name: {
              type: 'string',
              description: 'Slug name of the template to use',
            },
            template_content: {
              type: 'array',
              description: 'Template content blocks: [{ name, content }]',
              items: { type: 'object' },
            },
            from_email: {
              type: 'string',
              description: 'Sender email (overrides template default)',
            },
            to: {
              type: 'array',
              description: 'Recipient list: [{ email, name?, type? }]',
              items: { type: 'object' },
            },
            subject: {
              type: 'string',
              description: 'Subject line (overrides template default)',
            },
            global_merge_vars: {
              type: 'array',
              description: 'Global merge variables: [{ name, content }]',
              items: { type: 'object' },
            },
            merge_vars: {
              type: 'array',
              description: 'Per-recipient merge variables: [{ rcpt, vars: [{ name, content }] }]',
              items: { type: 'object' },
            },
            tags: {
              type: 'array',
              description: 'Tags to categorize this message',
              items: { type: 'string' },
            },
            async: {
              type: 'boolean',
              description: 'Enable async sending',
            },
          },
          required: ['template_name', 'template_content', 'to'],
        },
      },
      {
        name: 'search_messages',
        description: 'Search Mandrill message history using a query string with optional date and sender filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search terms — supports Mandrill query syntax (e.g. "email:test@example.com")',
            },
            date_from: {
              type: 'string',
              description: 'Start date filter (format: YYYY-MM-DD)',
            },
            date_to: {
              type: 'string',
              description: 'End date filter (format: YYYY-MM-DD)',
            },
            tags: {
              type: 'array',
              description: 'Filter by tags',
              items: { type: 'string' },
            },
            senders: {
              type: 'array',
              description: 'Filter by sender email addresses',
              items: { type: 'string' },
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25, max: 1000)',
            },
          },
        },
      },
      {
        name: 'get_message_info',
        description: 'Get full details and delivery status for a single message by its Mandrill ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Mandrill message ID (_id field from send response)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_templates',
        description: 'List all email templates in the Mandrill account, optionally filtered by label',
        inputSchema: {
          type: 'object',
          properties: {
            label: {
              type: 'string',
              description: 'Filter templates by this label',
            },
          },
        },
      },
      {
        name: 'render_template',
        description: 'Render a Mandrill template with given content and merge variables and return the rendered HTML',
        inputSchema: {
          type: 'object',
          properties: {
            template_name: {
              type: 'string',
              description: 'Slug name of the template to render',
            },
            template_content: {
              type: 'array',
              description: 'Template content blocks: [{ name, content }]',
              items: { type: 'object' },
            },
            merge_vars: {
              type: 'array',
              description: 'Merge variables for rendering: [{ name, content }]',
              items: { type: 'object' },
            },
          },
          required: ['template_name', 'template_content'],
        },
      },
      {
        name: 'list_senders',
        description: 'List all sending addresses that have been used with this Mandrill account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_sender_info',
        description: 'Get detailed sending statistics for a specific sender email address',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Sender email address to get info for',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'list_rejects',
        description: 'List rejection entries (bounces, complaints, unsubscribes) for the account',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Filter by specific email address',
            },
            include_expired: {
              type: 'boolean',
              description: 'Include entries that have expired and no longer block sending (default: false)',
            },
            subaccount: {
              type: 'string',
              description: 'Filter to a specific subaccount',
            },
          },
        },
      },
      {
        name: 'add_reject',
        description: 'Add an email address to the rejection blacklist to prevent future sends',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to blacklist',
            },
            comment: {
              type: 'string',
              description: 'Optional note explaining why this address was rejected',
            },
            subaccount: {
              type: 'string',
              description: 'Subaccount to add the rejection to',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'delete_reject',
        description: 'Remove an email address from the rejection blacklist so it can receive mail again',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to remove from the rejection list',
            },
            subaccount: {
              type: 'string',
              description: 'Subaccount to delete the rejection from',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all tags used in the Mandrill account with aggregate statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_tag_info',
        description: 'Get detailed delivery statistics for a specific Mandrill tag',
        inputSchema: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: 'Tag name to get stats for',
            },
          },
          required: ['tag'],
        },
      },
      {
        name: 'list_subaccounts',
        description: 'List all subaccounts on the Mandrill account with their sending statistics',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Optional search prefix to filter subaccounts by ID',
            },
          },
        },
      },
      {
        name: 'get_user_info',
        description: 'Get information about the Mandrill account including sending limits, reputation, and stats',
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
        case 'send_message':         return this.sendMessage(args);
        case 'send_template':        return this.sendTemplate(args);
        case 'search_messages':      return this.searchMessages(args);
        case 'get_message_info':     return this.getMessageInfo(args);
        case 'list_templates':       return this.listTemplates(args);
        case 'render_template':      return this.renderTemplate(args);
        case 'list_senders':         return this.listSenders();
        case 'get_sender_info':      return this.getSenderInfo(args);
        case 'list_rejects':         return this.listRejects(args);
        case 'add_reject':           return this.addReject(args);
        case 'delete_reject':        return this.deleteReject(args);
        case 'list_tags':            return this.listTags();
        case 'get_tag_info':         return this.getTagInfo(args);
        case 'list_subaccounts':     return this.listSubaccounts(args);
        case 'get_user_info':        return this.getUserInfo();
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

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const payload = { ...body, key: this.apiKey };
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from_email || !args.to || !args.subject) {
      return { content: [{ type: 'text', text: 'from_email, to, and subject are required' }], isError: true };
    }
    const message: Record<string, unknown> = {
      from_email: args.from_email,
      to: args.to,
      subject: args.subject,
    };
    if (args.from_name) message.from_name = args.from_name;
    if (args.html) message.html = args.html;
    if (args.text) message.text = args.text;
    if (args.tags) message.tags = args.tags;
    if (args.subaccount) message.subaccount = args.subaccount;
    if (typeof args.track_opens === 'boolean') message.track_opens = args.track_opens;
    if (typeof args.track_clicks === 'boolean') message.track_clicks = args.track_clicks;
    if (args.bcc_address) message.bcc_address = args.bcc_address;

    const body: Record<string, unknown> = { message };
    if (typeof args.async === 'boolean') body.async = args.async;
    if (args.send_at) body.send_at = args.send_at;

    return this.apiPost('/messages/send.json', body);
  }

  private async sendTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_name || !args.template_content || !args.to) {
      return { content: [{ type: 'text', text: 'template_name, template_content, and to are required' }], isError: true };
    }
    const message: Record<string, unknown> = { to: args.to };
    if (args.from_email) message.from_email = args.from_email;
    if (args.subject) message.subject = args.subject;
    if (args.global_merge_vars) message.global_merge_vars = args.global_merge_vars;
    if (args.merge_vars) message.merge_vars = args.merge_vars;
    if (args.tags) message.tags = args.tags;

    const body: Record<string, unknown> = {
      template_name: args.template_name,
      template_content: args.template_content,
      message,
    };
    if (typeof args.async === 'boolean') body.async = args.async;

    return this.apiPost('/messages/send-template.json', body);
  }

  private async searchMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.query) body.query = args.query;
    if (args.date_from) body.date_from = args.date_from;
    if (args.date_to) body.date_to = args.date_to;
    if (args.tags) body.tags = args.tags;
    if (args.senders) body.senders = args.senders;
    if (args.limit) body.limit = args.limit;
    return this.apiPost('/messages/search.json', body);
  }

  private async getMessageInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiPost('/messages/info.json', { id: args.id });
  }

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.label) body.label = args.label;
    return this.apiPost('/templates/list.json', body);
  }

  private async renderTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_name || !args.template_content) {
      return { content: [{ type: 'text', text: 'template_name and template_content are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      template_name: args.template_name,
      template_content: args.template_content,
    };
    if (args.merge_vars) body.merge_vars = args.merge_vars;
    return this.apiPost('/templates/render.json', body);
  }

  private async listSenders(): Promise<ToolResult> {
    return this.apiPost('/senders/list.json', {});
  }

  private async getSenderInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.address) return { content: [{ type: 'text', text: 'address is required' }], isError: true };
    return this.apiPost('/senders/info.json', { address: args.address });
  }

  private async listRejects(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.email) body.email = args.email;
    if (typeof args.include_expired === 'boolean') body.include_expired = args.include_expired;
    if (args.subaccount) body.subaccount = args.subaccount;
    return this.apiPost('/rejects/list.json', body);
  }

  private async addReject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const body: Record<string, unknown> = { email: args.email };
    if (args.comment) body.comment = args.comment;
    if (args.subaccount) body.subaccount = args.subaccount;
    return this.apiPost('/rejects/add.json', body);
  }

  private async deleteReject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const body: Record<string, unknown> = { email: args.email };
    if (args.subaccount) body.subaccount = args.subaccount;
    return this.apiPost('/rejects/delete.json', body);
  }

  private async listTags(): Promise<ToolResult> {
    return this.apiPost('/tags/list.json', {});
  }

  private async getTagInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tag) return { content: [{ type: 'text', text: 'tag is required' }], isError: true };
    return this.apiPost('/tags/info.json', { tag: args.tag });
  }

  private async listSubaccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.q) body.q = args.q;
    return this.apiPost('/subaccounts/list.json', body);
  }

  private async getUserInfo(): Promise<ToolResult> {
    return this.apiPost('/users/info.json', {});
  }
}
