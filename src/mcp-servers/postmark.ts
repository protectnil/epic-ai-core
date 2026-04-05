/**
 * Postmark MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/ActiveCampaign/postmark-mcp — transport: stdio, auth: Server Token env var
// Our adapter covers: 14 tools (email, templates, bounces, suppressions, stats, servers). Vendor MCP covers: 4 tools (sendEmail, sendEmailWithTemplate, listTemplates, getDeliveryStats).
// MCP criterion check: maintained (last commit Mar 2026) ✓, official ✓, but only 4 tools (fails ≥10 criterion).
// Recommendation: use-rest-api — vendor MCP fails the 10+ tools criterion. Our adapter covers all critical operations.
//
// Base URL: https://api.postmarkapp.com
// Auth: X-Postmark-Server-Token header (per-server API token from Postmark dashboard)
// Docs: https://postmarkapp.com/developer/api/overview
// Rate limits: No hard req/s limit; 429 returned when throttled. Bounce rate must stay below 10%.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PostmarkConfig {
  serverToken: string;
  baseUrl?: string;
}

export class PostmarkMCPServer extends MCPAdapterBase {
  private readonly serverToken: string;
  private readonly baseUrl: string;

  constructor(config: PostmarkConfig) {
    super();
    this.serverToken = config.serverToken;
    this.baseUrl = config.baseUrl || 'https://api.postmarkapp.com';
  }

  static catalog() {
    return {
      name: 'postmark',
      displayName: 'Postmark',
      version: '1.0.0',
      category: 'communication',
      keywords: ['postmark', 'email', 'transactional', 'bounce', 'template', 'smtp', 'delivery', 'suppression', 'webhook'],
      toolNames: [
        'send_email', 'send_email_batch', 'send_email_with_template',
        'list_templates', 'get_template', 'create_template', 'update_template', 'delete_template',
        'list_bounces', 'get_bounce', 'activate_bounce',
        'list_suppressions', 'delete_suppression',
        'get_delivery_stats',
      ],
      description: 'Postmark transactional email: send emails and template messages, manage bounces and suppressions, retrieve delivery statistics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_email',
        description: 'Send a single transactional email via Postmark with HTML and/or text body, attachments, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            From: { type: 'string', description: 'Sender email address (must match a verified sending domain)' },
            To: { type: 'string', description: 'Recipient email address(es); multiple separated by commas' },
            Subject: { type: 'string', description: 'Email subject line' },
            HtmlBody: { type: 'string', description: 'HTML body of the email' },
            TextBody: { type: 'string', description: 'Plain text body of the email' },
            Cc: { type: 'string', description: 'CC recipient(s), comma-separated' },
            Bcc: { type: 'string', description: 'BCC recipient(s), comma-separated' },
            ReplyTo: { type: 'string', description: 'Reply-to email address' },
            Tag: { type: 'string', description: 'Tag for categorizing the message in Postmark stats' },
            TrackOpens: { type: 'boolean', description: 'Enable open tracking (default: false)' },
            TrackLinks: { type: 'string', description: 'Link tracking: None, HtmlAndText, HtmlOnly, TextOnly (default: None)' },
            MessageStream: { type: 'string', description: 'Message stream ID (default: outbound)' },
          },
          required: ['From', 'To', 'Subject'],
        },
      },
      {
        name: 'send_email_batch',
        description: 'Send up to 500 transactional emails in a single API call for efficient bulk delivery',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of email message objects, each with From, To, Subject, and body fields (max 500)',
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'send_email_with_template',
        description: 'Send an email using a pre-built Postmark template with dynamic template model variables',
        inputSchema: {
          type: 'object',
          properties: {
            From: { type: 'string', description: 'Sender email address' },
            To: { type: 'string', description: 'Recipient email address' },
            TemplateId: { type: 'number', description: 'Numeric ID of the Postmark template to use' },
            TemplateAlias: { type: 'string', description: 'Template alias (use instead of TemplateId)' },
            TemplateModel: { type: 'object', description: 'Key-value variables to inject into the template (e.g. {"name": "Alice"})' },
            Tag: { type: 'string', description: 'Tag for categorizing this message in Postmark stats' },
            MessageStream: { type: 'string', description: 'Message stream ID (default: outbound)' },
          },
          required: ['From', 'To'],
        },
      },
      {
        name: 'list_templates',
        description: 'List all email templates in the Postmark server with name, alias, and subject',
        inputSchema: {
          type: 'object',
          properties: {
            Count: { type: 'number', description: 'Number of templates to return (max: 500, default: 100)' },
            Offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            TemplateType: { type: 'string', description: 'Filter by type: Standard or Layout' },
          },
        },
      },
      {
        name: 'get_template',
        description: 'Get details for a specific Postmark email template by ID including HTML and text body',
        inputSchema: {
          type: 'object',
          properties: {
            templateIdOrAlias: { type: 'string', description: 'Numeric template ID or string alias' },
          },
          required: ['templateIdOrAlias'],
        },
      },
      {
        name: 'create_template',
        description: 'Create a new email template in Postmark with HTML body, text body, and subject',
        inputSchema: {
          type: 'object',
          properties: {
            Name: { type: 'string', description: 'Internal display name for the template' },
            Subject: { type: 'string', description: 'Email subject line (can include template variables like {{name}})' },
            HtmlBody: { type: 'string', description: 'HTML body with optional mustache template variables' },
            TextBody: { type: 'string', description: 'Plain text body with optional template variables' },
            Alias: { type: 'string', description: 'Short string alias for referencing the template in API calls' },
            TemplateType: { type: 'string', description: 'Template type: Standard or Layout (default: Standard)' },
          },
          required: ['Name', 'Subject'],
        },
      },
      {
        name: 'update_template',
        description: 'Update an existing Postmark email template subject, body, or alias',
        inputSchema: {
          type: 'object',
          properties: {
            templateIdOrAlias: { type: 'string', description: 'Numeric template ID or string alias to update' },
            Name: { type: 'string', description: 'New display name for the template' },
            Subject: { type: 'string', description: 'New email subject line' },
            HtmlBody: { type: 'string', description: 'New HTML body' },
            TextBody: { type: 'string', description: 'New plain text body' },
            Alias: { type: 'string', description: 'New alias for the template' },
          },
          required: ['templateIdOrAlias'],
        },
      },
      {
        name: 'delete_template',
        description: 'Delete a Postmark email template by ID or alias',
        inputSchema: {
          type: 'object',
          properties: {
            templateIdOrAlias: { type: 'string', description: 'Numeric template ID or string alias to delete' },
          },
          required: ['templateIdOrAlias'],
        },
      },
      {
        name: 'list_bounces',
        description: 'List email bounces with optional filters for type, email, date range, and message stream',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of bounces to return (max: 500, default: 25)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            type: { type: 'string', description: 'Bounce type: HardBounce, SoftBounce, SpamComplaint, Unsubscribe, etc.' },
            emailFilter: { type: 'string', description: 'Filter by recipient email address (partial match)' },
            messageStream: { type: 'string', description: 'Filter by message stream ID (default: outbound)' },
            fromdate: { type: 'string', description: 'Return bounces after this date (YYYY-MM-DD)' },
            todate: { type: 'string', description: 'Return bounces before this date (YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'get_bounce',
        description: 'Get full details for a specific email bounce by bounce ID including raw email headers',
        inputSchema: {
          type: 'object',
          properties: {
            bounceId: { type: 'string', description: 'Numeric bounce ID' },
          },
          required: ['bounceId'],
        },
      },
      {
        name: 'activate_bounce',
        description: 'Reactivate a bounced email address so it can receive future messages from Postmark',
        inputSchema: {
          type: 'object',
          properties: {
            bounceId: { type: 'string', description: 'Numeric bounce ID to reactivate' },
          },
          required: ['bounceId'],
        },
      },
      {
        name: 'list_suppressions',
        description: 'List suppressed email addresses for a message stream with optional email and reason filters',
        inputSchema: {
          type: 'object',
          properties: {
            messageStream: { type: 'string', description: 'Message stream ID to query (default: outbound)' },
            suppressionReason: { type: 'string', description: 'Filter by reason: HardBounce, SpamComplaint, ManualSuppression' },
            emailAddress: { type: 'string', description: 'Filter by specific email address' },
          },
          required: ['messageStream'],
        },
      },
      {
        name: 'delete_suppression',
        description: 'Remove an email address from the Postmark suppression list so it can receive emails again',
        inputSchema: {
          type: 'object',
          properties: {
            messageStream: { type: 'string', description: 'Message stream ID the suppression belongs to' },
            Suppressions: {
              type: 'array',
              description: 'Array of suppression objects with EmailAddress field to remove (e.g. [{"EmailAddress":"user@example.com"}])',
            },
          },
          required: ['messageStream', 'Suppressions'],
        },
      },
      {
        name: 'get_delivery_stats',
        description: 'Get aggregate email delivery statistics including sent, bounced, spam, and open counts',
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
        case 'send_email': return this.sendEmail(args);
        case 'send_email_batch': return this.sendEmailBatch(args);
        case 'send_email_with_template': return this.sendEmailWithTemplate(args);
        case 'list_templates': return this.listTemplates(args);
        case 'get_template': return this.getTemplate(args);
        case 'create_template': return this.createTemplate(args);
        case 'update_template': return this.updateTemplate(args);
        case 'delete_template': return this.deleteTemplate(args);
        case 'list_bounces': return this.listBounces(args);
        case 'get_bounce': return this.getBounce(args);
        case 'activate_bounce': return this.activateBounce(args);
        case 'list_suppressions': return this.listSuppressions(args);
        case 'delete_suppression': return this.deleteSuppression(args);
        case 'get_delivery_stats': return this.getDeliveryStats();
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
      'X-Postmark-Server-Token': this.serverToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string, body?: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { deleted: true };
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.From || !args.To || !args.Subject) return { content: [{ type: 'text', text: 'From, To, and Subject are required' }], isError: true };
    return this.post('/email', args);
  }

  private async sendEmailBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messages) return { content: [{ type: 'text', text: 'messages array is required' }], isError: true };
    return this.post('/email/batch', { Messages: args.messages });
  }

  private async sendEmailWithTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.From || !args.To) return { content: [{ type: 'text', text: 'From and To are required' }], isError: true };
    return this.post('/email/withTemplate', args);
  }

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      Count: String((args.Count as number) || 100),
      Offset: String((args.Offset as number) || 0),
    };
    if (args.TemplateType) params.TemplateType = args.TemplateType as string;
    return this.get('/templates', params);
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.templateIdOrAlias) return { content: [{ type: 'text', text: 'templateIdOrAlias is required' }], isError: true };
    return this.get(`/templates/${encodeURIComponent(args.templateIdOrAlias as string)}`);
  }

  private async createTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.Name || !args.Subject) return { content: [{ type: 'text', text: 'Name and Subject are required' }], isError: true };
    return this.post('/templates', args);
  }

  private async updateTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.templateIdOrAlias) return { content: [{ type: 'text', text: 'templateIdOrAlias is required' }], isError: true };
    const { templateIdOrAlias, ...body } = args;
    return this.put(`/templates/${templateIdOrAlias}`, body);
  }

  private async deleteTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.templateIdOrAlias) return { content: [{ type: 'text', text: 'templateIdOrAlias is required' }], isError: true };
    return this.del(`/templates/${encodeURIComponent(args.templateIdOrAlias as string)}`);
  }

  private async listBounces(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      count: String((args.count as number) || 25),
      offset: String((args.offset as number) || 0),
    };
    if (args.type) params.type = args.type as string;
    if (args.emailFilter) params.emailFilter = args.emailFilter as string;
    if (args.messageStream) params.messageStream = args.messageStream as string;
    if (args.fromdate) params.fromdate = args.fromdate as string;
    if (args.todate) params.todate = args.todate as string;
    return this.get('/bounces', params);
  }

  private async getBounce(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bounceId) return { content: [{ type: 'text', text: 'bounceId is required' }], isError: true };
    return this.get(`/bounces/${encodeURIComponent(args.bounceId as string)}`);
  }

  private async activateBounce(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bounceId) return { content: [{ type: 'text', text: 'bounceId is required' }], isError: true };
    return this.put(`/bounces/${encodeURIComponent(args.bounceId as string)}/activate`, {});
  }

  private async listSuppressions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messageStream) return { content: [{ type: 'text', text: 'messageStream is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.suppressionReason) params.suppressionReason = args.suppressionReason as string;
    if (args.emailAddress) params.emailAddress = args.emailAddress as string;
    return this.get(`/message-streams/${encodeURIComponent(args.messageStream as string)}/suppressions/dump`, params);
  }

  private async deleteSuppression(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.messageStream || !args.Suppressions) return { content: [{ type: 'text', text: 'messageStream and Suppressions are required' }], isError: true };
    return this.post(`/message-streams/${encodeURIComponent(args.messageStream as string)}/suppressions/delete`, { Suppressions: args.Suppressions });
  }

  private async getDeliveryStats(): Promise<ToolResult> {
    return this.get('/deliverystats');
  }
}
