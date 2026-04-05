/**
 * SendGrid MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official Twilio/SendGrid MCP server for the SendGrid email API was found on GitHub.
//
// Base URL: https://api.sendgrid.com/v3
// Auth: Bearer token — Authorization: Bearer {API_KEY}
//       Generate API keys in SendGrid App → Settings → API Keys.
// Docs: https://www.twilio.com/docs/sendgrid/api-reference
// Rate limits: 600 requests/min per API key (varies by plan). /mail/send has its own sending limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SendGridConfig {
  apiKey: string;
  baseUrl?: string;
}

export class SendGridMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SendGridConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.sendgrid.com/v3';
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'sendgrid',
      displayName: 'SendGrid',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: [
        'sendgrid', 'twilio', 'email', 'transactional email', 'send', 'template',
        'suppression', 'bounce', 'unsubscribe', 'spam', 'block', 'contact',
        'marketing', 'statistics', 'stats', 'inbound parse',
      ],
      toolNames: [
        'send_email',
        'list_templates', 'get_template', 'create_template', 'delete_template',
        'get_stats', 'get_category_stats',
        'list_suppressions_global', 'delete_suppression_global',
        'list_bounces', 'delete_bounce',
        'list_blocks', 'delete_block',
        'list_spam_reports', 'delete_spam_report',
        'list_unsubscribe_groups', 'get_unsubscribe_group', 'create_unsubscribe_group',
        'list_contacts', 'upsert_contacts', 'delete_contacts',
        'list_sender_identities', 'create_sender_identity',
      ],
      description:
        'Send transactional email and manage SendGrid resources: templates, suppressions (bounces, blocks, spam, ' +
        'global unsubscribes), delivery statistics, unsubscribe groups, marketing contacts, and sender identities.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_email',
        description:
          'Send a transactional email via SendGrid. Supports dynamic templates, HTML/text content, multiple recipients, and reply-to.',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient email address',
            },
            to_name: {
              type: 'string',
              description: 'Recipient display name (optional)',
            },
            from: {
              type: 'string',
              description: 'Sender email address (must be a verified sender in SendGrid)',
            },
            from_name: {
              type: 'string',
              description: 'Sender display name (optional)',
            },
            reply_to: {
              type: 'string',
              description: 'Reply-to email address (optional)',
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
            },
            html_content: {
              type: 'string',
              description: 'HTML body of the email',
            },
            text_content: {
              type: 'string',
              description: 'Plain-text body of the email',
            },
            template_id: {
              type: 'string',
              description:
                'SendGrid dynamic template ID (d-...). When set, overrides html_content and text_content.',
            },
            dynamic_template_data: {
              type: 'object',
              description:
                'Key-value pairs for dynamic template variable substitution (used with template_id)',
            },
            categories: {
              type: 'array',
              description: 'Array of category strings for filtering stats (max 10)',
              items: { type: 'string' },
            },
            send_at: {
              type: 'number',
              description: 'Unix timestamp to schedule delivery. Omit for immediate send.',
            },
          },
          required: ['to', 'from', 'subject'],
        },
      },
      {
        name: 'list_templates',
        description:
          'List dynamic transactional email templates in SendGrid with pagination. Filter by generation type.',
        inputSchema: {
          type: 'object',
          properties: {
            generations: {
              type: 'string',
              description:
                'Filter by template generation: legacy or dynamic (default: dynamic)',
            },
            page_size: {
              type: 'number',
              description: 'Number of templates per page (max 200, default: 10)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_template',
        description:
          'Retrieve a single SendGrid transactional template and its active version by template ID.',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'The SendGrid template ID (e.g. d-abc123)',
            },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'create_template',
        description:
          'Create a new transactional email template in SendGrid with a name and generation type.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Template name (must be unique within the account)',
            },
            generation: {
              type: 'string',
              description: 'Template generation: legacy or dynamic (default: dynamic)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_template',
        description:
          'Permanently delete a SendGrid transactional template and all its versions.',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'The SendGrid template ID to delete',
            },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'get_stats',
        description:
          'Retrieve global email delivery statistics (requests, delivered, opens, clicks, bounces, spam, unsubscribes) for a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (default: today)',
            },
            aggregated_by: {
              type: 'string',
              description: 'Aggregation period: day, week, or month (default: day)',
            },
          },
          required: ['start_date'],
        },
      },
      {
        name: 'get_category_stats',
        description:
          'Retrieve email delivery statistics broken down by category for a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (required)',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            categories: {
              type: 'array',
              description: 'Array of category names to filter by',
              items: { type: 'string' },
            },
            aggregated_by: {
              type: 'string',
              description: 'Aggregation period: day, week, or month (default: day)',
            },
          },
          required: ['start_date'],
        },
      },
      {
        name: 'list_suppressions_global',
        description:
          'List all email addresses on the global unsubscribe suppression list, with optional time range and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'number',
              description: 'Unix timestamp — return suppressions added after this time',
            },
            end_time: {
              type: 'number',
              description: 'Unix timestamp — return suppressions added before this time',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (max 500, default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
      {
        name: 'delete_suppression_global',
        description:
          'Remove an email address from the global unsubscribe suppression list.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to remove from global suppressions',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'list_bounces',
        description:
          'List email addresses on the bounce list, with optional time range and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'number',
              description: 'Unix timestamp — return bounces added after this time',
            },
            end_time: {
              type: 'number',
              description: 'Unix timestamp — return bounces added before this time',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (max 500, default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
      {
        name: 'delete_bounce',
        description: 'Remove an email address from the bounce list.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to remove from the bounce list',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'list_blocks',
        description:
          'List email addresses on the block list (addresses that failed with a 5xx error), with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'number',
              description: 'Unix timestamp — return blocks added after this time',
            },
            end_time: {
              type: 'number',
              description: 'Unix timestamp — return blocks added before this time',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (max 500, default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
      {
        name: 'delete_block',
        description: 'Remove an email address from the block list.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to remove from the block list',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'list_spam_reports',
        description:
          'List email addresses that reported messages as spam, with optional time range and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'number',
              description: 'Unix timestamp — return spam reports added after this time',
            },
            end_time: {
              type: 'number',
              description: 'Unix timestamp — return spam reports before this time',
            },
            limit: {
              type: 'number',
              description: 'Number of results to return (max 500, default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
      {
        name: 'delete_spam_report',
        description: 'Remove an email address from the spam report list.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to remove from the spam report list',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'list_unsubscribe_groups',
        description:
          'List all unsubscribe groups (suppression groups) configured in the SendGrid account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_unsubscribe_group',
        description:
          'Get details and suppressed addresses for a specific SendGrid unsubscribe group by group ID.',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'number',
              description: 'The unsubscribe group ID',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'create_unsubscribe_group',
        description:
          'Create a new unsubscribe group (suppression group) so recipients can opt out of specific email categories.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the unsubscribe group (max 30 characters)',
            },
            description: {
              type: 'string',
              description: 'Description shown to recipients on the unsubscribe page (max 100 characters)',
            },
            is_default: {
              type: 'boolean',
              description: 'Whether this group is selected by default on the unsubscribe page (default: false)',
            },
          },
          required: ['name', 'description'],
        },
      },
      {
        name: 'list_contacts',
        description:
          'Search marketing contacts in SendGrid by email address or return all contacts with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'SGQL query string to filter contacts, e.g. "email LIKE \'%@example.com\'" (optional, returns all if omitted)',
            },
            page_size: {
              type: 'number',
              description: 'Number of contacts per page (default: 50)',
            },
          },
        },
      },
      {
        name: 'upsert_contacts',
        description:
          'Add or update marketing contacts in SendGrid. Accepts up to 30,000 contacts per request.',
        inputSchema: {
          type: 'object',
          properties: {
            contacts: {
              type: 'array',
              description:
                'Array of contact objects. Each must have an email field and can include first_name, last_name, and custom_fields.',
              items: { type: 'object' },
            },
            list_ids: {
              type: 'array',
              description: 'Array of list IDs to add the contacts to',
              items: { type: 'string' },
            },
          },
          required: ['contacts'],
        },
      },
      {
        name: 'delete_contacts',
        description:
          'Delete marketing contacts from SendGrid by contact ID or delete all contacts.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              description: 'Array of contact IDs to delete',
              items: { type: 'string' },
            },
            delete_all_contacts: {
              type: 'boolean',
              description: 'If true, deletes all contacts in the account. Use with caution.',
            },
          },
        },
      },
      {
        name: 'list_sender_identities',
        description:
          'List all verified sender identities configured in the SendGrid account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_sender_identity',
        description:
          'Create a new sender identity in SendGrid. The sender must be verified before use.',
        inputSchema: {
          type: 'object',
          properties: {
            nickname: {
              type: 'string',
              description: 'A label for this sender identity (not shown to recipients)',
            },
            from_email: {
              type: 'string',
              description: 'The from email address for this sender identity',
            },
            from_name: {
              type: 'string',
              description: 'The from display name for this sender identity',
            },
            reply_to: {
              type: 'string',
              description: 'Reply-to email address',
            },
            address: {
              type: 'string',
              description: 'Physical mailing address (required by CAN-SPAM)',
            },
            city: { type: 'string', description: 'City for the mailing address' },
            country: { type: 'string', description: 'Country for the mailing address' },
          },
          required: ['nickname', 'from_email', 'address', 'city', 'country'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_email':
          return await this.sendEmail(args);
        case 'list_templates':
          return await this.listTemplates(args);
        case 'get_template':
          return await this.getTemplate(args);
        case 'create_template':
          return await this.createTemplate(args);
        case 'delete_template':
          return await this.deleteTemplate(args);
        case 'get_stats':
          return await this.getStats(args);
        case 'get_category_stats':
          return await this.getCategoryStats(args);
        case 'list_suppressions_global':
          return await this.listSuppressionsGlobal(args);
        case 'delete_suppression_global':
          return await this.deleteSuppressionGlobal(args);
        case 'list_bounces':
          return await this.listBounces(args);
        case 'delete_bounce':
          return await this.deleteBounce(args);
        case 'list_blocks':
          return await this.listBlocks(args);
        case 'delete_block':
          return await this.deleteBlock(args);
        case 'list_spam_reports':
          return await this.listSpamReports(args);
        case 'delete_spam_report':
          return await this.deleteSpamReport(args);
        case 'list_unsubscribe_groups':
          return await this.listUnsubscribeGroups();
        case 'get_unsubscribe_group':
          return await this.getUnsubscribeGroup(args);
        case 'create_unsubscribe_group':
          return await this.createUnsubscribeGroup(args);
        case 'list_contacts':
          return await this.listContacts(args);
        case 'upsert_contacts':
          return await this.upsertContacts(args);
        case 'delete_contacts':
          return await this.deleteContacts(args);
        case 'list_sender_identities':
          return await this.listSenderIdentities();
        case 'create_sender_identity':
          return await this.createSenderIdentity(args);
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

    // 204 No Content is a success with no body
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
            text: `SendGrid API error ${response.status} ${response.statusText}: ${errText}`,
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

  private async sendEmail(args: Record<string, unknown>): Promise<ToolResult> {
    const to = args.to as string;
    const from = args.from as string;
    const subject = args.subject as string;
    if (!to || !from || !subject) {
      return {
        content: [{ type: 'text', text: 'to, from, and subject are required' }],
        isError: true,
      };
    }

    const personalization: Record<string, unknown> = {
      to: [{ email: to, ...(args.to_name ? { name: args.to_name } : {}) }],
    };
    if (args.dynamic_template_data) {
      personalization.dynamic_template_data = args.dynamic_template_data;
    }

    const body: Record<string, unknown> = {
      personalizations: [personalization],
      from: { email: from, ...(args.from_name ? { name: args.from_name } : {}) },
      subject,
    };

    if (args.reply_to) body.reply_to = { email: args.reply_to };
    if (args.template_id) body.template_id = args.template_id;
    if (args.categories) body.categories = args.categories;
    if (args.send_at) body.send_at = args.send_at;

    const content: Array<{ type: string; value: string }> = [];
    if (args.text_content) content.push({ type: 'text/plain', value: args.text_content as string });
    if (args.html_content) content.push({ type: 'text/html', value: args.html_content as string });
    if (content.length > 0) body.content = content;

    return this.request('POST', '/mail/send', body);
  }

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('generations', (args.generations as string) ?? 'dynamic');
    if (args.page_size) params.set('page_size', String(args.page_size as number));
    if (args.page_token) params.set('page_token', args.page_token as string);
    return this.request('GET', '/templates', undefined, params);
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const templateId = args.template_id as string;
    if (!templateId) {
      return { content: [{ type: 'text', text: 'template_id is required' }], isError: true };
    }
    return this.request('GET', `/templates/${encodeURIComponent(templateId)}`);
  }

  private async createTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    return this.request('POST', '/templates', {
      name,
      generation: (args.generation as string) ?? 'dynamic',
    });
  }

  private async deleteTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const templateId = args.template_id as string;
    if (!templateId) {
      return { content: [{ type: 'text', text: 'template_id is required' }], isError: true };
    }
    return this.request('DELETE', `/templates/${encodeURIComponent(templateId)}`);
  }

  private async getStats(args: Record<string, unknown>): Promise<ToolResult> {
    const startDate = args.start_date as string;
    if (!startDate) {
      return { content: [{ type: 'text', text: 'start_date is required' }], isError: true };
    }
    const params = new URLSearchParams({ start_date: startDate });
    if (args.end_date) params.set('end_date', args.end_date as string);
    if (args.aggregated_by) params.set('aggregated_by', args.aggregated_by as string);
    return this.request('GET', '/stats', undefined, params);
  }

  private async getCategoryStats(args: Record<string, unknown>): Promise<ToolResult> {
    const startDate = args.start_date as string;
    if (!startDate) {
      return { content: [{ type: 'text', text: 'start_date is required' }], isError: true };
    }
    const params = new URLSearchParams({ start_date: startDate });
    if (args.end_date) params.set('end_date', args.end_date as string);
    if (args.aggregated_by) params.set('aggregated_by', args.aggregated_by as string);
    if (Array.isArray(args.categories)) {
      for (const cat of args.categories as string[]) {
        params.append('categories', cat);
      }
    }
    return this.request('GET', '/categories/stats', undefined, params);
  }

  private suppressionParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.start_time) params.set('start_time', String(args.start_time as number));
    if (args.end_time) params.set('end_time', String(args.end_time as number));
    if (args.limit) params.set('limit', String(args.limit as number));
    if (args.offset) params.set('offset', String(args.offset as number));
    return params;
  }

  private async listSuppressionsGlobal(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/suppression/unsubscribes', undefined, this.suppressionParams(args));
  }

  private async deleteSuppressionGlobal(args: Record<string, unknown>): Promise<ToolResult> {
    const email = args.email as string;
    if (!email) {
      return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    }
    return this.request('DELETE', `/asm/suppressions/global/${encodeURIComponent(email)}`);
  }

  private async listBounces(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/suppression/bounces', undefined, this.suppressionParams(args));
  }

  private async deleteBounce(args: Record<string, unknown>): Promise<ToolResult> {
    const email = args.email as string;
    if (!email) {
      return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    }
    return this.request('DELETE', `/suppression/bounces/${encodeURIComponent(email)}`);
  }

  private async listBlocks(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/suppression/blocks', undefined, this.suppressionParams(args));
  }

  private async deleteBlock(args: Record<string, unknown>): Promise<ToolResult> {
    const email = args.email as string;
    if (!email) {
      return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    }
    return this.request('DELETE', `/suppression/blocks/${encodeURIComponent(email)}`);
  }

  private async listSpamReports(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/suppression/spam_reports', undefined, this.suppressionParams(args));
  }

  private async deleteSpamReport(args: Record<string, unknown>): Promise<ToolResult> {
    const email = args.email as string;
    if (!email) {
      return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    }
    return this.request('DELETE', `/suppression/spam_reports/${encodeURIComponent(email)}`);
  }

  private async listUnsubscribeGroups(): Promise<ToolResult> {
    return this.request('GET', '/asm/groups');
  }

  private async getUnsubscribeGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const groupId = args.group_id as number;
    if (groupId === undefined || groupId === null) {
      return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    }
    return this.request('GET', `/asm/groups/${groupId}`);
  }

  private async createUnsubscribeGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    const description = args.description as string;
    if (!name || !description) {
      return {
        content: [{ type: 'text', text: 'name and description are required' }],
        isError: true,
      };
    }
    return this.request('POST', '/asm/groups', {
      name,
      description,
      is_default: typeof args.is_default === 'boolean' ? args.is_default : false,
    });
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.query) {
      // Use the search endpoint for filtered queries
      return this.request('POST', '/marketing/contacts/search', {
        query: args.query as string,
        ...(args.page_size ? { page_size: args.page_size } : {}),
      });
    }
    const params = new URLSearchParams();
    if (args.page_size) params.set('page_size', String(args.page_size as number));
    return this.request('GET', '/marketing/contacts', undefined, params.toString() ? params : undefined);
  }

  private async upsertContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const contacts = args.contacts as unknown[];
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return {
        content: [{ type: 'text', text: 'contacts array is required and must be non-empty' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { contacts };
    if (args.list_ids) body.list_ids = args.list_ids;
    return this.request('PUT', '/marketing/contacts', body);
  }

  private async deleteContacts(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.delete_all_contacts === true) {
      return this.request('DELETE', '/marketing/contacts', undefined,
        new URLSearchParams({ delete_all_contacts: 'true' }));
    }
    const ids = args.ids as string[];
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'Either ids array or delete_all_contacts: true is required',
          },
        ],
        isError: true,
      };
    }
    return this.request('DELETE', '/marketing/contacts', undefined,
      new URLSearchParams({ ids: ids.join(',') }));
  }

  private async listSenderIdentities(): Promise<ToolResult> {
    return this.request('GET', '/senders');
  }

  private async createSenderIdentity(args: Record<string, unknown>): Promise<ToolResult> {
    const nickname = args.nickname as string;
    const from_email = args.from_email as string;
    const address = args.address as string;
    const city = args.city as string;
    const country = args.country as string;
    if (!nickname || !from_email || !address || !city || !country) {
      return {
        content: [
          {
            type: 'text',
            text: 'nickname, from_email, address, city, and country are required',
          },
        ],
        isError: true,
      };
    }
    const body: Record<string, unknown> = {
      nickname,
      from: { email: from_email, ...(args.from_name ? { name: args.from_name } : {}) },
      address,
      city,
      country,
    };
    if (args.reply_to) body.reply_to = { email: args.reply_to };
    return this.request('POST', '/senders', body);
  }
}
