/**
 * Postmark Server API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Base URL: https://api.postmarkapp.com
// Auth: X-Postmark-Server-Token header (per-server token from Postmark account)
// Docs: https://postmarkapp.com/developer/api/overview

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PostmarkServerConfig {
  /** Postmark server token. Obtain from Postmark account → Server → API Tokens. */
  serverToken: string;
  /** Override base URL. Defaults to https://api.postmarkapp.com */
  baseUrl?: string;
}

export class PostmarkServerMCPServer extends MCPAdapterBase {
  private readonly serverToken: string;
  private readonly baseUrl: string;

  constructor(config: PostmarkServerConfig) {
    super();
    this.serverToken = config.serverToken;
    this.baseUrl = config.baseUrl || 'https://api.postmarkapp.com';
  }

  private get headers(): Record<string, string> {
    return {
      'X-Postmark-Server-Token': this.serverToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Sending ---
      {
        name: 'send_email',
        description: 'Send a single transactional email through Postmark.',
        inputSchema: {
          type: 'object',
          properties: {
            From: { type: 'string', description: 'Sender email address (must be a verified sender signature)' },
            To: { type: 'string', description: 'Recipient email address(es), comma-separated' },
            Subject: { type: 'string', description: 'Email subject line' },
            HtmlBody: { type: 'string', description: 'HTML body of the email' },
            TextBody: { type: 'string', description: 'Plain-text body of the email' },
            ReplyTo: { type: 'string', description: 'Reply-to email address' },
            Cc: { type: 'string', description: 'CC recipients, comma-separated' },
            Bcc: { type: 'string', description: 'BCC recipients, comma-separated' },
            Tag: { type: 'string', description: 'Tag for categorizing this message in stats' },
            TrackOpens: { type: 'boolean', description: 'Enable open tracking for this message' },
            TrackLinks: { type: 'string', description: 'Link tracking mode: None, HtmlAndText, HtmlOnly, TextOnly' },
            MessageStream: { type: 'string', description: 'Message stream ID (default: outbound)' },
          },
          required: ['From', 'To', 'Subject'],
        },
      },
      {
        name: 'send_email_batch',
        description: 'Send a batch of up to 500 emails in a single API call.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of message objects. Each requires From, To, Subject, and HtmlBody or TextBody.',
              items: { type: 'object' },
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'send_email_with_template',
        description: 'Send an email using a pre-defined Postmark template by ID or alias.',
        inputSchema: {
          type: 'object',
          properties: {
            TemplateId: { type: 'number', description: 'Numeric template ID' },
            TemplateAlias: { type: 'string', description: 'Template string alias (use instead of TemplateId)' },
            TemplateModel: { type: 'object', description: 'Key-value substitution variables for the template' },
            From: { type: 'string', description: 'Sender email address' },
            To: { type: 'string', description: 'Recipient email address(es)' },
            ReplyTo: { type: 'string', description: 'Reply-to address' },
            Tag: { type: 'string', description: 'Message tag' },
            TrackOpens: { type: 'boolean', description: 'Enable open tracking' },
            MessageStream: { type: 'string', description: 'Message stream ID' },
          },
          required: ['From', 'To', 'TemplateModel'],
        },
      },
      {
        name: 'send_email_batch_with_templates',
        description: 'Send a batch of template-based emails in one API call.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of templated message objects. Each requires From, To, TemplateModel, and TemplateId or TemplateAlias.',
              items: { type: 'object' },
            },
          },
          required: ['messages'],
        },
      },
      // --- Bounces ---
      {
        name: 'get_delivery_stats',
        description: 'Get delivery statistics summary including total bounces, unique emails, and delivery rate.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_bounces',
        description: 'List bounced emails with optional type, email, tag, and date filters.',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of results to return (max 500, default 25)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
            type: { type: 'string', description: 'Bounce type: HardBounce, SoftBounce, Transient, SpamComplaint, Unsubscribe, etc.' },
            inactive: { type: 'boolean', description: 'Return only inactive/suppressed addresses' },
            emailFilter: { type: 'string', description: 'Partial email address filter' },
            tag: { type: 'string', description: 'Filter by message tag' },
            fromdate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            todate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'get_bounce',
        description: 'Get full details of a single bounce record by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            bounceid: { type: 'number', description: 'Bounce record ID' },
          },
          required: ['bounceid'],
        },
      },
      {
        name: 'activate_bounce',
        description: 'Reactivate a bounced/suppressed email address to allow future sends.',
        inputSchema: {
          type: 'object',
          properties: {
            bounceid: { type: 'number', description: 'Bounce record ID to reactivate' },
          },
          required: ['bounceid'],
        },
      },
      // --- Outbound Messages ---
      {
        name: 'search_outbound_messages',
        description: 'Search sent outbound messages by recipient, sender, tag, status, or date range.',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Results per page (max 500, default 25)' },
            offset: { type: 'number', description: 'Pagination offset' },
            recipient: { type: 'string', description: 'Filter by recipient email' },
            fromemail: { type: 'string', description: 'Filter by sender email' },
            tag: { type: 'string', description: 'Filter by message tag' },
            status: { type: 'string', description: 'Delivery status filter: queued, sent, delivered, hardbounce, softbounce, opened, etc.' },
            fromdate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            todate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'get_outbound_message_details',
        description: 'Get full details of a sent outbound message by message ID.',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: { type: 'string', description: 'Message ID' },
          },
          required: ['messageid'],
        },
      },
      {
        name: 'get_outbound_message_opens',
        description: 'Get open tracking events for a specific outbound message.',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: { type: 'string', description: 'Message ID' },
            count: { type: 'number', description: 'Results per page (default 25)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['messageid'],
        },
      },
      {
        name: 'get_outbound_message_clicks',
        description: 'Get click tracking events for a specific outbound message.',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: { type: 'string', description: 'Message ID' },
            count: { type: 'number', description: 'Results per page (default 25)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
          required: ['messageid'],
        },
      },
      // --- Inbound Messages ---
      {
        name: 'search_inbound_messages',
        description: 'Search received inbound messages by sender, recipient, subject, or date.',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Results per page (max 500, default 25)' },
            offset: { type: 'number', description: 'Pagination offset' },
            recipient: { type: 'string', description: 'Filter by recipient address' },
            fromemail: { type: 'string', description: 'Filter by sender address' },
            subject: { type: 'string', description: 'Filter by subject text' },
            tag: { type: 'string', description: 'Filter by tag' },
            status: { type: 'string', description: 'Status filter: processed, blocked' },
            fromdate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            todate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'get_inbound_message_details',
        description: 'Get full details of a received inbound message by message ID.',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: { type: 'string', description: 'Message ID' },
          },
          required: ['messageid'],
        },
      },
      {
        name: 'retry_inbound_message',
        description: 'Retry processing of a failed inbound message.',
        inputSchema: {
          type: 'object',
          properties: {
            messageid: { type: 'string', description: 'Message ID to retry' },
          },
          required: ['messageid'],
        },
      },
      // --- Templates ---
      {
        name: 'list_templates',
        description: 'List all email templates associated with this Postmark server.',
        inputSchema: {
          type: 'object',
          properties: {
            Count: { type: 'number', description: 'Number of templates to return (default 25)' },
            Offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_template',
        description: 'Get a single email template by its numeric ID or string alias.',
        inputSchema: {
          type: 'object',
          properties: {
            templateIdOrAlias: { type: 'string', description: 'Template numeric ID or string alias' },
          },
          required: ['templateIdOrAlias'],
        },
      },
      {
        name: 'create_template',
        description: 'Create a new email template with Mustache-style variable substitution.',
        inputSchema: {
          type: 'object',
          properties: {
            Name: { type: 'string', description: 'Template name' },
            Subject: { type: 'string', description: 'Email subject (supports {{variable}} syntax)' },
            HtmlBody: { type: 'string', description: 'HTML body with template variables' },
            TextBody: { type: 'string', description: 'Plain-text body with template variables' },
            Alias: { type: 'string', description: 'Unique string alias for the template' },
          },
          required: ['Name', 'Subject'],
        },
      },
      {
        name: 'update_template',
        description: 'Update an existing email template by its ID or alias.',
        inputSchema: {
          type: 'object',
          properties: {
            templateIdOrAlias: { type: 'string', description: 'Template ID or alias to update' },
            Name: { type: 'string', description: 'New template name' },
            Subject: { type: 'string', description: 'New subject' },
            HtmlBody: { type: 'string', description: 'New HTML body' },
            TextBody: { type: 'string', description: 'New plain-text body' },
          },
          required: ['templateIdOrAlias'],
        },
      },
      {
        name: 'delete_template',
        description: 'Delete an email template by its ID or alias.',
        inputSchema: {
          type: 'object',
          properties: {
            templateIdOrAlias: { type: 'string', description: 'Template ID or alias to delete' },
          },
          required: ['templateIdOrAlias'],
        },
      },
      // --- Statistics ---
      {
        name: 'get_outbound_stats',
        description: 'Get outbound overview statistics (sent, delivered, bounced, etc.) with optional tag and date filters.',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter stats by message tag' },
            fromdate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            todate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'get_sent_counts',
        description: 'Get sent email count timeseries, optionally filtered by tag and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by tag' },
            fromdate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            todate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'get_bounce_counts',
        description: 'Get bounce count timeseries, optionally filtered by tag and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by tag' },
            fromdate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            todate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'get_open_counts',
        description: 'Get email open tracking count timeseries.',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by tag' },
            fromdate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            todate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'get_click_counts',
        description: 'Get click tracking count timeseries.',
        inputSchema: {
          type: 'object',
          properties: {
            tag: { type: 'string', description: 'Filter by tag' },
            fromdate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            todate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
        },
      },
      // --- Server Configuration ---
      {
        name: 'get_server_configuration',
        description: 'Get the current Postmark server configuration (name, webhooks, tracking settings, etc.).',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'edit_server_configuration',
        description: 'Edit Postmark server settings including webhook URLs, tracking defaults, and SMTP activation.',
        inputSchema: {
          type: 'object',
          properties: {
            Name: { type: 'string', description: 'Server display name' },
            Color: { type: 'string', description: 'Server color label' },
            RawEmailEnabled: { type: 'boolean', description: 'Store raw email content' },
            SmtpApiActivated: { type: 'boolean', description: 'Enable SMTP API access' },
            InboundHookUrl: { type: 'string', description: 'Webhook URL for inbound message events' },
            BounceHookUrl: { type: 'string', description: 'Webhook URL for bounce notifications' },
            OpenHookUrl: { type: 'string', description: 'Webhook URL for open tracking events' },
            TrackOpens: { type: 'boolean', description: 'Enable open tracking server-wide by default' },
            TrackLinks: { type: 'string', description: 'Default link tracking: None, HtmlAndText, HtmlOnly, TextOnly' },
          },
        },
      },
      // --- Inbound Rules ---
      {
        name: 'list_inbound_rules',
        description: 'List inbound rule triggers used to block/filter incoming email.',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of rules to return (default 25)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'create_inbound_rule',
        description: 'Create an inbound rule to block email from a specific address or domain (e.g. @example.com).',
        inputSchema: {
          type: 'object',
          properties: {
            Rule: { type: 'string', description: 'Email address or domain pattern to block' },
          },
          required: ['Rule'],
        },
      },
      {
        name: 'delete_inbound_rule',
        description: 'Delete an inbound rule trigger by its numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            triggerid: { type: 'number', description: 'Inbound rule trigger ID to delete' },
          },
          required: ['triggerid'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_email': return await this.apiPost('/email', args);
        case 'send_email_batch': return await this.sendBatch(args);
        case 'send_email_with_template': return await this.apiPost('/email/withTemplate', args);
        case 'send_email_batch_with_templates': return await this.sendBatchWithTemplates(args);
        case 'get_delivery_stats': return await this.apiGet('/deliverystats');
        case 'get_bounces': return await this.getBounces(args);
        case 'get_bounce': return await this.apiGet(`/bounces/${args.bounceid}`);
        case 'activate_bounce': return await this.apiPut(`/bounces/${args.bounceid}/activate`, {});
        case 'search_outbound_messages': return await this.searchOutbound(args);
        case 'get_outbound_message_details': return await this.apiGet(`/messages/outbound/${args.messageid}/details`);
        case 'get_outbound_message_opens': return await this.apiGet(`/messages/outbound/opens/${args.messageid}?count=${args.count ?? 25}&offset=${args.offset ?? 0}`);
        case 'get_outbound_message_clicks': return await this.apiGet(`/messages/outbound/clicks/${args.messageid}?count=${args.count ?? 25}&offset=${args.offset ?? 0}`);
        case 'search_inbound_messages': return await this.searchInbound(args);
        case 'get_inbound_message_details': return await this.apiGet(`/messages/inbound/${args.messageid}/details`);
        case 'retry_inbound_message': return await this.apiPut(`/messages/inbound/${args.messageid}/retry`, {});
        case 'list_templates': return await this.apiGet(`/templates?Count=${args.Count ?? 25}&Offset=${args.Offset ?? 0}`);
        case 'get_template': return await this.apiGet(`/templates/${encodeURIComponent(args.templateIdOrAlias as string)}`);
        case 'create_template': return await this.apiPost('/templates', args);
        case 'update_template': return await this.updateTemplate(args);
        case 'delete_template': return await this.apiDelete(`/templates/${encodeURIComponent(args.templateIdOrAlias as string)}`);
        case 'get_outbound_stats': return await this.apiGet(this.buildStatsUrl('/stats/outbound', args));
        case 'get_sent_counts': return await this.apiGet(this.buildStatsUrl('/stats/outbound/sends', args));
        case 'get_bounce_counts': return await this.apiGet(this.buildStatsUrl('/stats/outbound/bounces', args));
        case 'get_open_counts': return await this.apiGet(this.buildStatsUrl('/stats/outbound/opens', args));
        case 'get_click_counts': return await this.apiGet(this.buildStatsUrl('/stats/outbound/clicks', args));
        case 'get_server_configuration': return await this.apiGet('/server');
        case 'edit_server_configuration': return await this.apiPut('/server', args);
        case 'list_inbound_rules': return await this.apiGet(`/triggers/inboundrules?count=${args.count ?? 25}&offset=${args.offset ?? 0}`);
        case 'create_inbound_rule': return await this.apiPost('/triggers/inboundrules', { Rule: args.Rule });
        case 'delete_inbound_rule': return await this.apiDelete(`/triggers/inboundrules/${args.triggerid}`);
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

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'PUT', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    try { const data = await response.json(); return { content: [{ type: 'text', text: this.truncate(data) }], isError: false }; }
    catch { return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false }; }
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private buildStatsUrl(base: string, args: Record<string, unknown>): string {
    const params: string[] = [];
    if (args.tag) params.push(`tag=${encodeURIComponent(args.tag as string)}`);
    if (args.fromdate) params.push(`fromdate=${encodeURIComponent(args.fromdate as string)}`);
    if (args.todate) params.push(`todate=${encodeURIComponent(args.todate as string)}`);
    return params.length ? `${base}?${params.join('&')}` : base;
  }

  private async sendBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const messages = args.messages as unknown[];
    if (!Array.isArray(messages) || messages.length === 0) return { content: [{ type: 'text', text: 'messages array is required and must not be empty' }], isError: true };
    return this.apiPost('/email/batch', messages);
  }

  private async sendBatchWithTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const messages = args.messages as unknown[];
    if (!Array.isArray(messages) || messages.length === 0) return { content: [{ type: 'text', text: 'messages array is required and must not be empty' }], isError: true };
    return this.apiPost('/email/batchWithTemplates', { Messages: messages });
  }

  private async getBounces(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [`count=${args.count ?? 25}`, `offset=${args.offset ?? 0}`];
    if (args.type) params.push(`type=${encodeURIComponent(args.type as string)}`);
    if (args.inactive !== undefined) params.push(`inactive=${args.inactive}`);
    if (args.emailFilter) params.push(`emailFilter=${encodeURIComponent(args.emailFilter as string)}`);
    if (args.tag) params.push(`tag=${encodeURIComponent(args.tag as string)}`);
    if (args.fromdate) params.push(`fromdate=${encodeURIComponent(args.fromdate as string)}`);
    if (args.todate) params.push(`todate=${encodeURIComponent(args.todate as string)}`);
    return this.apiGet(`/bounces?${params.join('&')}`);
  }

  private async searchOutbound(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [`count=${args.count ?? 25}`, `offset=${args.offset ?? 0}`];
    if (args.recipient) params.push(`recipient=${encodeURIComponent(args.recipient as string)}`);
    if (args.fromemail) params.push(`fromemail=${encodeURIComponent(args.fromemail as string)}`);
    if (args.tag) params.push(`tag=${encodeURIComponent(args.tag as string)}`);
    if (args.status) params.push(`status=${encodeURIComponent(args.status as string)}`);
    if (args.fromdate) params.push(`fromdate=${encodeURIComponent(args.fromdate as string)}`);
    if (args.todate) params.push(`todate=${encodeURIComponent(args.todate as string)}`);
    return this.apiGet(`/messages/outbound?${params.join('&')}`);
  }

  private async searchInbound(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [`count=${args.count ?? 25}`, `offset=${args.offset ?? 0}`];
    if (args.recipient) params.push(`recipient=${encodeURIComponent(args.recipient as string)}`);
    if (args.fromemail) params.push(`fromemail=${encodeURIComponent(args.fromemail as string)}`);
    if (args.subject) params.push(`subject=${encodeURIComponent(args.subject as string)}`);
    if (args.tag) params.push(`tag=${encodeURIComponent(args.tag as string)}`);
    if (args.status) params.push(`status=${encodeURIComponent(args.status as string)}`);
    if (args.fromdate) params.push(`fromdate=${encodeURIComponent(args.fromdate as string)}`);
    if (args.todate) params.push(`todate=${encodeURIComponent(args.todate as string)}`);
    return this.apiGet(`/messages/inbound?${params.join('&')}`);
  }

  private async updateTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const { templateIdOrAlias, ...rest } = args;
    if (!templateIdOrAlias) return { content: [{ type: 'text', text: 'templateIdOrAlias is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/templates/${encodeURIComponent(templateIdOrAlias as string)}`, {
      method: 'PUT', headers: this.headers, body: JSON.stringify(rest),
    });
    if (!response.ok) return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  static catalog() {
    return {
      name: 'postmarkapp-server',
      displayName: 'Postmark (Server API)',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: ['postmark', 'email', 'transactional', 'smtp', 'bounce', 'template', 'communication', 'inbound'],
      toolNames: [
        'send_email', 'send_email_batch', 'send_email_with_template', 'send_email_batch_with_templates',
        'get_delivery_stats', 'get_bounces', 'get_bounce', 'activate_bounce',
        'search_outbound_messages', 'get_outbound_message_details', 'get_outbound_message_opens', 'get_outbound_message_clicks',
        'search_inbound_messages', 'get_inbound_message_details', 'retry_inbound_message',
        'list_templates', 'get_template', 'create_template', 'update_template', 'delete_template',
        'get_outbound_stats', 'get_sent_counts', 'get_bounce_counts', 'get_open_counts', 'get_click_counts',
        'get_server_configuration', 'edit_server_configuration',
        'list_inbound_rules', 'create_inbound_rule', 'delete_inbound_rule',
      ],
      description: 'Postmark Server API adapter — send transactional email, manage templates, track bounces/opens/clicks, configure inbound rules, and monitor delivery stats.',
      author: 'protectnil' as const,
    };
  }
}
