/**
 * Mailchimp MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Mailchimp/Intuit MCP server was found on GitHub, npm, or Mailchimp developer docs.
// Multiple community adapters exist (AgentX-ai/mailchimp-mcp, BusyBee3333/mailchimp-mcp-2026-complete,
// alien-lifestyles/mailchimp-mcp, Apify/mailchimp-mcp-server) but none are published or
// officially maintained by Mailchimp or Intuit. All fail the "official" criterion.
// Our adapter covers: 18 tools. Vendor MCP: None.
// Recommendation: use-rest-api — no official MCP exists; REST adapter is the primary integration.
//
// Base URL: https://{dc}.api.mailchimp.com/3.0
//   The datacenter (dc) is the suffix of the API key after the last dash.
//   Example: key ending in "-us6" → dc = us6 → base = https://us6.api.mailchimp.com/3.0
//   Pass dc or baseUrl explicitly; otherwise the adapter derives dc from the API key format.
// Auth: HTTP Basic with username="anystring" and password={apiKey}
//       OAuth2 Bearer token is also accepted via the same Authorization header.
// Docs: https://mailchimp.com/developer/marketing/api/
//       https://mailchimp.com/developer/marketing/docs/fundamentals/
// Rate limits: ~10 simultaneous connections per account; 120 req/min recommended maximum

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';
import { createHash } from 'node:crypto';

interface MailchimpConfig {
  /** Mailchimp Marketing API key (format: <key>-<dc>, e.g. abc123-us6). */
  apiKey: string;
  /** Explicit datacenter code (e.g. us6). Derived from apiKey suffix if omitted. */
  dc?: string;
  /** Full base URL override. Takes precedence over dc derivation. */
  baseUrl?: string;
}

export class MailchimpMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MailchimpConfig) {
    super();
    this.apiKey = config.apiKey;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/$/, '');
    } else if (config.dc) {
      this.baseUrl = `https://${config.dc}.api.mailchimp.com/3.0`;
    } else {
      const dcMatch = config.apiKey.match(/-([a-z0-9]+)$/);
      if (!dcMatch) {
        throw new Error('Mailchimp datacenter could not be determined. Provide dc or baseUrl in config.');
      }
      this.baseUrl = `https://${dcMatch[1]}.api.mailchimp.com/3.0`;
    }
  }

  static catalog() {
    return {
      name: 'mailchimp',
      displayName: 'Mailchimp',
      version: '1.0.0',
      category: 'communication',
      keywords: ['mailchimp', 'email', 'marketing', 'campaign', 'audience', 'list', 'subscriber', 'newsletter', 'automation', 'template', 'segment', 'journey'],
      toolNames: [
        'list_audiences', 'get_audience', 'list_members', 'get_member', 'add_or_update_member', 'archive_member',
        'list_campaigns', 'get_campaign', 'create_campaign', 'send_campaign', 'schedule_campaign', 'cancel_campaign',
        'get_campaign_report',
        'list_templates', 'get_template',
        'list_segments', 'create_segment',
        'trigger_customer_journey',
      ],
      description: 'Mailchimp email marketing: manage audiences, members, campaigns, templates, segments, and customer journeys.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Audiences (Lists) ──────────────────────────────────────────────────
      {
        name: 'list_audiences',
        description: 'List all Mailchimp audiences (mailing lists) in the account with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of audiences to return (default: 10, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_audience',
        description: 'Get details and statistics for a specific Mailchimp audience by list ID',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'string', description: 'The unique ID for the Mailchimp audience (list)' },
          },
          required: ['list_id'],
        },
      },
      // ── Members ────────────────────────────────────────────────────────────
      {
        name: 'list_members',
        description: 'List subscribers in a Mailchimp audience with optional status and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'string', description: 'The unique ID for the Mailchimp audience' },
            status: { type: 'string', description: 'Filter by subscription status: subscribed, unsubscribed, cleaned, pending, transactional' },
            count: { type: 'number', description: 'Number of members to return (default: 10, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'get_member',
        description: 'Get profile and subscription data for a specific audience member by email address',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'string', description: 'The unique ID for the Mailchimp audience' },
            email_address: { type: 'string', description: 'Member email address to look up' },
          },
          required: ['list_id', 'email_address'],
        },
      },
      {
        name: 'add_or_update_member',
        description: 'Add a new subscriber or update an existing one in a Mailchimp audience (upsert by email)',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'string', description: 'The unique ID for the Mailchimp audience' },
            email_address: { type: 'string', description: 'Email address to add or update' },
            status: { type: 'string', description: 'Subscription status: subscribed, unsubscribed, cleaned, pending' },
            merge_fields: { type: 'object', description: 'Merge tag values, e.g. { "FNAME": "Jane", "LNAME": "Doe" }' },
            tags: { type: 'array', description: 'Array of tag name strings to apply to the member' },
          },
          required: ['list_id', 'email_address', 'status'],
        },
      },
      {
        name: 'archive_member',
        description: 'Archive (soft-delete) a subscriber from a Mailchimp audience by email address',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'string', description: 'The unique ID for the Mailchimp audience' },
            email_address: { type: 'string', description: 'Email address of the member to archive' },
          },
          required: ['list_id', 'email_address'],
        },
      },
      // ── Campaigns ──────────────────────────────────────────────────────────
      {
        name: 'list_campaigns',
        description: 'List email campaigns in the Mailchimp account with optional status, type, and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of campaigns to return (default: 10, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            status: { type: 'string', description: 'Filter by status: save, paused, schedule, sending, sent' },
            type: { type: 'string', description: 'Filter by type: regular, plaintext, absplit, rss, variate' },
            list_id: { type: 'string', description: 'Filter campaigns sent to a specific audience ID' },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Get full details of a specific Mailchimp campaign including settings, recipients, and status',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: { type: 'string', description: 'The unique ID for the campaign' },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'create_campaign',
        description: 'Create a new email campaign in Mailchimp with type, audience, subject, and sender settings',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Campaign type: regular, plaintext, absplit, rss, variate' },
            list_id: { type: 'string', description: 'Audience ID to send the campaign to' },
            subject_line: { type: 'string', description: 'Email subject line' },
            from_name: { type: 'string', description: 'Sender display name' },
            reply_to: { type: 'string', description: 'Reply-to email address' },
            preview_text: { type: 'string', description: 'Preview text shown in email client inbox rows' },
            template_id: { type: 'number', description: 'Optional template ID to base the campaign on' },
          },
          required: ['type', 'list_id', 'subject_line', 'from_name', 'reply_to'],
        },
      },
      {
        name: 'send_campaign',
        description: 'Send a Mailchimp campaign that is in ready-to-send state immediately',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: { type: 'string', description: 'The unique ID for the campaign to send' },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'schedule_campaign',
        description: 'Schedule a Mailchimp campaign for delivery at a specific UTC date and time',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: { type: 'string', description: 'The unique ID for the campaign to schedule' },
            schedule_time: { type: 'string', description: 'UTC datetime to send the campaign (ISO 8601, e.g. 2026-04-01T14:00:00Z)' },
            timewarp: { type: 'boolean', description: 'Use timewarp send (deliver at schedule_time in each recipient\'s local timezone; default: false)' },
          },
          required: ['campaign_id', 'schedule_time'],
        },
      },
      {
        name: 'cancel_campaign',
        description: 'Cancel a scheduled or currently-sending Mailchimp campaign',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: { type: 'string', description: 'The unique ID for the campaign to cancel' },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'get_campaign_report',
        description: 'Retrieve send performance report for a campaign including opens, clicks, bounces, and unsubscribes',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: { type: 'string', description: 'The unique ID for the campaign' },
          },
          required: ['campaign_id'],
        },
      },
      // ── Templates ──────────────────────────────────────────────────────────
      {
        name: 'list_templates',
        description: 'List email templates available in the Mailchimp account with optional type filter',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of templates to return (default: 10, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            type: { type: 'string', description: 'Template type: user, base, gallery' },
          },
        },
      },
      {
        name: 'get_template',
        description: 'Get details for a specific Mailchimp email template by ID',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'The numeric template ID' },
          },
          required: ['template_id'],
        },
      },
      // ── Segments ───────────────────────────────────────────────────────────
      {
        name: 'list_segments',
        description: 'List segments in a Mailchimp audience with optional type filter (static or saved)',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'string', description: 'The unique ID for the Mailchimp audience' },
            count: { type: 'number', description: 'Number of segments to return (default: 10, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            type: { type: 'string', description: 'Segment type: saved or static' },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'create_segment',
        description: 'Create a new static or conditional segment within a Mailchimp audience',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'string', description: 'The unique ID for the Mailchimp audience' },
            name: { type: 'string', description: 'Name for the new segment' },
            static_segment: { type: 'array', description: 'Array of email addresses to include in a static segment' },
            options: { type: 'object', description: 'Conditions object for a conditional segment (match and conditions fields)' },
          },
          required: ['list_id', 'name'],
        },
      },
      // ── Customer Journeys ──────────────────────────────────────────────────
      {
        name: 'trigger_customer_journey',
        description: 'Trigger a Customer Journey API step for a contact, enrolling them into an automation flow',
        inputSchema: {
          type: 'object',
          properties: {
            journey_id: { type: 'number', description: 'The Customer Journey ID' },
            step_id: { type: 'number', description: 'The journey step ID that acts as the trigger' },
            email_address: { type: 'string', description: 'Email address of the contact to enroll in the journey' },
          },
          required: ['journey_id', 'step_id', 'email_address'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_audiences':          return await this.listAudiences(args);
        case 'get_audience':            return await this.getAudience(args);
        case 'list_members':            return await this.listMembers(args);
        case 'get_member':              return await this.getMember(args);
        case 'add_or_update_member':    return await this.addOrUpdateMember(args);
        case 'archive_member':          return await this.archiveMember(args);
        case 'list_campaigns':          return await this.listCampaigns(args);
        case 'get_campaign':            return await this.getCampaign(args);
        case 'create_campaign':         return await this.createCampaign(args);
        case 'send_campaign':           return await this.sendCampaign(args);
        case 'schedule_campaign':       return await this.scheduleCampaign(args);
        case 'cancel_campaign':         return await this.cancelCampaign(args);
        case 'get_campaign_report':     return await this.getCampaignReport(args);
        case 'list_templates':          return await this.listTemplates(args);
        case 'get_template':            return await this.getTemplate(args);
        case 'list_segments':           return await this.listSegments(args);
        case 'create_segment':          return await this.createSegment(args);
        case 'trigger_customer_journey': return await this.triggerCustomerJourney(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeader(): string {
    return 'Basic ' + Buffer.from(`anystring:${this.apiKey}`).toString('base64');
  }

  private get reqHeaders(): Record<string, string> {
    return {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private subscriberHash(email: string): string {
    return createHash('md5').update(email.toLowerCase()).digest('hex');
  }

  private async fetch(url: string, opts: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { ...opts, headers: { ...this.reqHeaders, ...(opts.headers as Record<string, string> ?? {}) } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAudiences(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.count !== undefined) params.set('count', String(args.count));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    return this.fetch(`${this.baseUrl}/lists${params.toString() ? '?' + params.toString() : ''}`);
  }

  private async getAudience(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id) return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    return this.fetch(`${this.baseUrl}/lists/${encodeURIComponent(args.list_id as string)}`);
  }

  private async listMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id) return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.count !== undefined) params.set('count', String(args.count));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    return this.fetch(
      `${this.baseUrl}/lists/${encodeURIComponent(args.list_id as string)}/members${params.toString() ? '?' + params.toString() : ''}`,
    );
  }

  private async getMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id || !args.email_address) {
      return { content: [{ type: 'text', text: 'list_id and email_address are required' }], isError: true };
    }
    const hash = this.subscriberHash(args.email_address as string);
    return this.fetch(`${this.baseUrl}/lists/${encodeURIComponent(args.list_id as string)}/members/${hash}`);
  }

  private async addOrUpdateMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id || !args.email_address || !args.status) {
      return { content: [{ type: 'text', text: 'list_id, email_address, and status are required' }], isError: true };
    }
    const hash = this.subscriberHash(args.email_address as string);
    const body: Record<string, unknown> = {
      email_address: args.email_address,
      status_if_new: args.status,
      status: args.status,
    };
    if (args.merge_fields) body.merge_fields = args.merge_fields;
    if (args.tags && Array.isArray(args.tags)) {
      body.tags = (args.tags as string[]).map((t) => ({ name: t, status: 'active' }));
    }
    return this.fetch(
      `${this.baseUrl}/lists/${encodeURIComponent(args.list_id as string)}/members/${hash}`,
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  private async archiveMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id || !args.email_address) {
      return { content: [{ type: 'text', text: 'list_id and email_address are required' }], isError: true };
    }
    const hash = this.subscriberHash(args.email_address as string);
    return this.fetch(
      `${this.baseUrl}/lists/${encodeURIComponent(args.list_id as string)}/members/${hash}`,
      { method: 'DELETE' },
    );
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.count !== undefined) params.set('count', String(args.count));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.status) params.set('status', args.status as string);
    if (args.type) params.set('type', args.type as string);
    if (args.list_id) params.set('list_id', args.list_id as string);
    return this.fetch(`${this.baseUrl}/campaigns${params.toString() ? '?' + params.toString() : ''}`);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.fetch(`${this.baseUrl}/campaigns/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async createCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.type || !args.list_id || !args.subject_line || !args.from_name || !args.reply_to) {
      return { content: [{ type: 'text', text: 'type, list_id, subject_line, from_name, and reply_to are required' }], isError: true };
    }
    const settings: Record<string, unknown> = {
      subject_line: args.subject_line,
      from_name: args.from_name,
      reply_to: args.reply_to,
    };
    if (args.preview_text) settings.preview_text = args.preview_text;
    if (args.template_id) settings.template_id = args.template_id;
    const body: Record<string, unknown> = {
      type: args.type,
      recipients: { list_id: args.list_id },
      settings,
    };
    return this.fetch(`${this.baseUrl}/campaigns`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async sendCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.fetch(
      `${this.baseUrl}/campaigns/${encodeURIComponent(args.campaign_id as string)}/actions/send`,
      { method: 'POST' },
    );
  }

  private async scheduleCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id || !args.schedule_time) {
      return { content: [{ type: 'text', text: 'campaign_id and schedule_time are required' }], isError: true };
    }
    const body: Record<string, unknown> = { schedule_time: args.schedule_time };
    if (args.timewarp !== undefined) body.timewarp = args.timewarp;
    return this.fetch(
      `${this.baseUrl}/campaigns/${encodeURIComponent(args.campaign_id as string)}/actions/schedule`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async cancelCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.fetch(
      `${this.baseUrl}/campaigns/${encodeURIComponent(args.campaign_id as string)}/actions/cancel-send`,
      { method: 'POST' },
    );
  }

  private async getCampaignReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.fetch(`${this.baseUrl}/reports/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.count !== undefined) params.set('count', String(args.count));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.type) params.set('type', args.type as string);
    return this.fetch(`${this.baseUrl}/templates${params.toString() ? '?' + params.toString() : ''}`);
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_id) return { content: [{ type: 'text', text: 'template_id is required' }], isError: true };
    return this.fetch(`${this.baseUrl}/templates/${encodeURIComponent(String(args.template_id))}`);
  }

  private async listSegments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id) return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.count !== undefined) params.set('count', String(args.count));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.type) params.set('type', args.type as string);
    return this.fetch(
      `${this.baseUrl}/lists/${encodeURIComponent(args.list_id as string)}/segments${params.toString() ? '?' + params.toString() : ''}`,
    );
  }

  private async createSegment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id || !args.name) {
      return { content: [{ type: 'text', text: 'list_id and name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name };
    if (args.static_segment) body.static_segment = args.static_segment;
    if (args.options) body.options = args.options;
    return this.fetch(
      `${this.baseUrl}/lists/${encodeURIComponent(args.list_id as string)}/segments`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async triggerCustomerJourney(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.journey_id || !args.step_id || !args.email_address) {
      return { content: [{ type: 'text', text: 'journey_id, step_id, and email_address are required' }], isError: true };
    }
    return this.fetch(
      `${this.baseUrl}/customer-journeys/journeys/${encodeURIComponent(String(args.journey_id))}/steps/${encodeURIComponent(String(args.step_id))}/actions/trigger`,
      { method: 'POST', body: JSON.stringify({ email_address: args.email_address }) },
    );
  }
}
