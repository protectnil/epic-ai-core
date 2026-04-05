/**
 * Klaviyo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developers.klaviyo.com/en/docs/klaviyo_mcp_server — transport: streamable-HTTP (remote) + stdio (local), auth: Private API key
// Klaviyo publishes an official MCP server (remote-hosted, GA August 2025). No public GitHub repo — vendor-hosted only.
// Our adapter covers: 22 tools. Vendor MCP covers: 18 tools.
// Recommendation: use-both — each side has unique tools the other lacks.
//   MCP-only tools (6): assign_template_to_campaign_message, get_catalog_items, subscribe_profile_to_marketing,
//     unsubscribe_profile_from_marketing, get_campaign_report, get_flow_report
//   REST-only tools (10): list_lists, get_list, create_list, list_segments, get_segment, list_profiles,
//     get_profile_by_email, update_flow_status, list_metrics, list_templates
//   Shared tools (12): get_campaigns/list_campaigns, get_campaign, create_campaign, get_events/create_event,
//     get_metrics/get_metric, get_profile, create_profile, update_profile, list_flows/get_flow,
//     get_email_template/get_template, create_email_template, get_account_details
//
// Base URL: https://a.klaviyo.com/api
// Auth: Private API key in Authorization header as "Klaviyo-API-Key {key}"
//   Private keys have prefix pk_. Generate in Klaviyo account > Settings > API Keys.
//   Public keys (site IDs) are for client-side only — do NOT use here.
// Docs: https://developers.klaviyo.com/en/reference/api_overview
// Rate limits: Tiered by endpoint — burst and steady limits vary per endpoint (e.g. Get Campaigns: 10/s burst, 150/m steady).
//   Monitor 429 responses and respect the Retry-After header.
//   API revision: Use header "revision: 2026-01-15" (current stable as of 2026-03).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface KlaviyoConfig {
  apiKey: string;
  baseUrl?: string;
  revision?: string;
}

export class KlaviyoMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly revision: string;

  constructor(config: KlaviyoConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://a.klaviyo.com/api';
    this.revision = config.revision || '2026-01-15';
  }

  static catalog() {
    return {
      name: 'klaviyo',
      displayName: 'Klaviyo',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: [
        'klaviyo', 'email', 'sms', 'marketing', 'campaign', 'list', 'segment',
        'flow', 'automation', 'profile', 'subscriber', 'metrics', 'events',
        'template', 'ecommerce', 'push-notification', 'audience',
      ],
      toolNames: [
        'list_campaigns', 'get_campaign', 'create_campaign', 'update_campaign',
        'list_lists', 'get_list', 'create_list',
        'list_segments', 'get_segment',
        'list_profiles', 'get_profile', 'create_profile', 'update_profile',
        'get_profile_by_email',
        'list_flows', 'get_flow', 'update_flow_status',
        'list_metrics', 'get_metric',
        'create_event',
        'list_templates', 'get_template',
      ],
      description: 'Klaviyo email and SMS marketing: campaigns, lists, segments, profiles, flows, metrics, events, and templates for e-commerce and marketing automation.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_campaigns',
        description: 'List Klaviyo email or SMS campaigns with optional filters for status and channel type',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Filter by channel: email, sms (default: all channels)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: draft, scheduled, sent, cancelled (default: all)',
            },
            page_cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response next link',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 50)',
            },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Get full details for a specific Klaviyo campaign by ID including audience, schedule, and send statistics',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Campaign ID from list_campaigns',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'create_campaign',
        description: 'Create a new Klaviyo email or SMS campaign with a name, channel, and audience list or segment',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Campaign name',
            },
            channel: {
              type: 'string',
              description: 'Channel to send on: email or sms',
            },
            list_id: {
              type: 'string',
              description: 'Klaviyo list ID to send the campaign to (use list_id or segment_id)',
            },
            segment_id: {
              type: 'string',
              description: 'Klaviyo segment ID to send the campaign to (use list_id or segment_id)',
            },
            subject: {
              type: 'string',
              description: 'Email subject line (email campaigns only)',
            },
            from_email: {
              type: 'string',
              description: 'Sender email address (email campaigns only)',
            },
            from_name: {
              type: 'string',
              description: 'Sender name displayed in recipients inbox (email campaigns only)',
            },
          },
          required: ['name', 'channel'],
        },
      },
      {
        name: 'update_campaign',
        description: 'Update the name, subject, or send settings for an existing Klaviyo campaign in draft status',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Campaign ID to update',
            },
            name: {
              type: 'string',
              description: 'New campaign name',
            },
            subject: {
              type: 'string',
              description: 'New email subject line',
            },
            from_name: {
              type: 'string',
              description: 'New sender name',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_lists',
        description: 'List all Klaviyo subscriber lists with their names, opt-in type, and profile counts',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_list',
        description: 'Get details for a specific Klaviyo list including profile count, opt-in settings, and associated flows',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: {
              type: 'string',
              description: 'List ID from list_lists',
            },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'create_list',
        description: 'Create a new Klaviyo subscriber list with a name and optional double opt-in setting',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the new list',
            },
            opt_in_process: {
              type: 'string',
              description: 'Opt-in process: single or double (default: single)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_segments',
        description: 'List all Klaviyo segments with their definition type and profile counts',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_segment',
        description: 'Get details for a specific Klaviyo segment including its definition conditions and estimated profile count',
        inputSchema: {
          type: 'object',
          properties: {
            segment_id: {
              type: 'string',
              description: 'Segment ID from list_segments',
            },
          },
          required: ['segment_id'],
        },
      },
      {
        name: 'list_profiles',
        description: 'List Klaviyo profiles (subscribers/contacts) with optional email filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter expression (e.g. equals(email,"user@example.com") or contains(first_name,"John"))',
            },
            page_cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 100)',
            },
            sort: {
              type: 'string',
              description: 'Sort field with optional direction prefix (e.g. -created for descending)',
            },
          },
        },
      },
      {
        name: 'get_profile',
        description: 'Get full profile data for a Klaviyo subscriber by profile ID including custom properties and subscription status',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'Profile ID from list_profiles',
            },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'create_profile',
        description: 'Create or upsert a Klaviyo profile by email or phone with optional custom properties and subscription consent',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Profile email address (required if phone_number not provided)',
            },
            phone_number: {
              type: 'string',
              description: 'Profile phone number in E.164 format (required if email not provided)',
            },
            first_name: {
              type: 'string',
              description: 'Profile first name',
            },
            last_name: {
              type: 'string',
              description: 'Profile last name',
            },
            title: {
              type: 'string',
              description: 'Profile job title',
            },
            organization: {
              type: 'string',
              description: 'Profile organization or company name',
            },
            location: {
              type: 'object',
              description: 'Location object with address, city, region, country, zip fields',
            },
            properties: {
              type: 'object',
              description: 'Custom profile properties as a key-value object',
            },
          },
        },
      },
      {
        name: 'update_profile',
        description: 'Update properties for an existing Klaviyo profile by profile ID including custom fields and contact info',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'Profile ID to update',
            },
            email: {
              type: 'string',
              description: 'New email address for the profile',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            phone_number: {
              type: 'string',
              description: 'Updated phone number in E.164 format',
            },
            properties: {
              type: 'object',
              description: 'Updated custom profile properties as a key-value object',
            },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'get_profile_by_email',
        description: 'Look up a Klaviyo profile by email address and return the profile ID and full details',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to search for',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'list_flows',
        description: 'List Klaviyo automation flows with their trigger type, status, and number of actions',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: live, draft, archived, manual (default: all)',
            },
            page_cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 50)',
            },
          },
        },
      },
      {
        name: 'get_flow',
        description: 'Get details for a specific Klaviyo flow including trigger, status, actions, and associated lists or metrics',
        inputSchema: {
          type: 'object',
          properties: {
            flow_id: {
              type: 'string',
              description: 'Flow ID from list_flows',
            },
          },
          required: ['flow_id'],
        },
      },
      {
        name: 'update_flow_status',
        description: 'Update the status of a Klaviyo flow to live, draft, or archived',
        inputSchema: {
          type: 'object',
          properties: {
            flow_id: {
              type: 'string',
              description: 'Flow ID to update',
            },
            status: {
              type: 'string',
              description: 'New status: live, draft, or archived',
            },
          },
          required: ['flow_id', 'status'],
        },
      },
      {
        name: 'list_metrics',
        description: 'List all Klaviyo metrics (event types) available in the account including built-in and custom metrics',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 50)',
            },
          },
        },
      },
      {
        name: 'get_metric',
        description: 'Get details for a specific Klaviyo metric by ID including its integration source and event count',
        inputSchema: {
          type: 'object',
          properties: {
            metric_id: {
              type: 'string',
              description: 'Metric ID from list_metrics',
            },
          },
          required: ['metric_id'],
        },
      },
      {
        name: 'create_event',
        description: 'Create a custom event (track) in Klaviyo for a profile identified by email or phone with optional event properties',
        inputSchema: {
          type: 'object',
          properties: {
            metric_name: {
              type: 'string',
              description: 'Name of the metric/event to track (e.g. Placed Order, Viewed Product)',
            },
            email: {
              type: 'string',
              description: 'Profile email address to associate with this event',
            },
            phone_number: {
              type: 'string',
              description: 'Profile phone number in E.164 format (use if no email)',
            },
            properties: {
              type: 'object',
              description: 'Event-specific properties as a key-value object (e.g. order_id, revenue, items)',
            },
            value: {
              type: 'number',
              description: 'Numeric value associated with the event (e.g. order revenue)',
            },
            time: {
              type: 'string',
              description: 'ISO 8601 timestamp when the event occurred (default: now)',
            },
          },
          required: ['metric_name'],
        },
      },
      {
        name: 'list_templates',
        description: 'List Klaviyo email templates with their names, type, and last modified dates',
        inputSchema: {
          type: 'object',
          properties: {
            page_cursor: {
              type: 'string',
              description: 'Cursor for pagination from a previous response',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 100)',
            },
            sort: {
              type: 'string',
              description: 'Sort by field (e.g. -updated for most recently updated first)',
            },
          },
        },
      },
      {
        name: 'get_template',
        description: 'Get the HTML content and metadata for a specific Klaviyo email template by ID',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'Template ID from list_templates',
            },
          },
          required: ['template_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_campaigns':
          return this.listCampaigns(args);
        case 'get_campaign':
          return this.getCampaign(args);
        case 'create_campaign':
          return this.createCampaign(args);
        case 'update_campaign':
          return this.updateCampaign(args);
        case 'list_lists':
          return this.listLists(args);
        case 'get_list':
          return this.getList(args);
        case 'create_list':
          return this.createList(args);
        case 'list_segments':
          return this.listSegments(args);
        case 'get_segment':
          return this.getSegment(args);
        case 'list_profiles':
          return this.listProfiles(args);
        case 'get_profile':
          return this.getProfile(args);
        case 'create_profile':
          return this.createProfile(args);
        case 'update_profile':
          return this.updateProfile(args);
        case 'get_profile_by_email':
          return this.getProfileByEmail(args);
        case 'list_flows':
          return this.listFlows(args);
        case 'get_flow':
          return this.getFlow(args);
        case 'update_flow_status':
          return this.updateFlowStatus(args);
        case 'list_metrics':
          return this.listMetrics(args);
        case 'get_metric':
          return this.getMetric(args);
        case 'create_event':
          return this.createEvent(args);
        case 'list_templates':
          return this.listTemplates(args);
        case 'get_template':
          return this.getTemplate(args);
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
      Authorization: `Klaviyo-API-Key ${this.apiKey}`,
      'Content-Type': 'application/json',
      revision: this.revision,
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[size]': String((args.page_size as number) ?? 20),
    };
    const filters: string[] = [];
    if (args.channel) filters.push(`equals(messages.channel,"${encodeURIComponent(args.channel as string)}")`);
    if (args.status) filters.push(`equals(status,"${encodeURIComponent(args.status as string)}")`);
    if (filters.length) params.filter = filters.join(',');
    if (args.page_cursor) params['page[cursor]'] = args.page_cursor as string;
    return this.apiGet('/campaigns', params);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    return this.apiGet(`/campaigns/${encodeURIComponent(args.campaign_id as string)}`);
  }

  private async createCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.channel) return { content: [{ type: 'text', text: 'name and channel are required' }], isError: true };
    const attributes: Record<string, unknown> = {
      name: args.name,
      channel: args.channel,
    };
    if (args.subject) attributes.subject = args.subject;
    if (args.from_email) attributes.from_email = args.from_email;
    if (args.from_name) attributes.from_name = args.from_name;

    const relationships: Record<string, unknown> = {};
    if (args.list_id) {
      relationships.list = { data: { type: 'list', id: args.list_id } };
    } else if (args.segment_id) {
      relationships.segment = { data: { type: 'segment', id: args.segment_id } };
    }

    const body: Record<string, unknown> = {
      data: { type: 'campaign', attributes },
    };
    if (Object.keys(relationships).length) body.data = { ...(body.data as Record<string, unknown>), relationships };

    return this.apiPost('/campaigns', body);
  }

  private async updateCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.campaign_id) return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    const attributes: Record<string, unknown> = {};
    if (args.name) attributes.name = args.name;
    if (args.subject) attributes.subject = args.subject;
    if (args.from_name) attributes.from_name = args.from_name;
    const body = { data: { type: 'campaign', id: args.campaign_id, attributes } };
    return this.apiPatch(`/campaigns/${encodeURIComponent(args.campaign_id as string)}`, body);
  }

  private async listLists(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[size]': String((args.page_size as number) ?? 20),
    };
    if (args.page_cursor) params['page[cursor]'] = args.page_cursor as string;
    return this.apiGet('/lists', params);
  }

  private async getList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.list_id) return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    return this.apiGet(`/lists/${encodeURIComponent(args.list_id as string)}`);
  }

  private async createList(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const attributes: Record<string, unknown> = { name: args.name };
    if (args.opt_in_process) attributes.opt_in_process = args.opt_in_process;
    const body = { data: { type: 'list', attributes } };
    return this.apiPost('/lists', body);
  }

  private async listSegments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[size]': String((args.page_size as number) ?? 20),
    };
    if (args.page_cursor) params['page[cursor]'] = args.page_cursor as string;
    return this.apiGet('/segments', params);
  }

  private async getSegment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.segment_id) return { content: [{ type: 'text', text: 'segment_id is required' }], isError: true };
    return this.apiGet(`/segments/${encodeURIComponent(args.segment_id as string)}`);
  }

  private async listProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[size]': String((args.page_size as number) ?? 20),
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.page_cursor) params['page[cursor]'] = args.page_cursor as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/profiles', params);
  }

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id) return { content: [{ type: 'text', text: 'profile_id is required' }], isError: true };
    return this.apiGet(`/profiles/${encodeURIComponent(args.profile_id as string)}`);
  }

  private async createProfile(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = {};
    if (args.email) attributes.email = args.email;
    if (args.phone_number) attributes.phone_number = args.phone_number;
    if (args.first_name) attributes.first_name = args.first_name;
    if (args.last_name) attributes.last_name = args.last_name;
    if (args.title) attributes.title = args.title;
    if (args.organization) attributes.organization = args.organization;
    if (args.location) attributes.location = args.location;
    if (args.properties) attributes.properties = args.properties;
    const body = { data: { type: 'profile', attributes } };
    return this.apiPost('/profiles', body);
  }

  private async updateProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id) return { content: [{ type: 'text', text: 'profile_id is required' }], isError: true };
    const attributes: Record<string, unknown> = {};
    if (args.email) attributes.email = args.email;
    if (args.first_name) attributes.first_name = args.first_name;
    if (args.last_name) attributes.last_name = args.last_name;
    if (args.phone_number) attributes.phone_number = args.phone_number;
    if (args.properties) attributes.properties = args.properties;
    const body = { data: { type: 'profile', id: args.profile_id, attributes } };
    return this.apiPatch(`/profiles/${encodeURIComponent(args.profile_id as string)}`, body);
  }

  private async getProfileByEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const params: Record<string, string> = {
      filter: `equals(email,"${encodeURIComponent(args.email as string)}")`,
    };
    return this.apiGet('/profiles', params);
  }

  private async listFlows(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[size]': String((args.page_size as number) ?? 20),
    };
    if (args.status) params.filter = `equals(status,"${encodeURIComponent(args.status as string)}")`;
    if (args.page_cursor) params['page[cursor]'] = args.page_cursor as string;
    return this.apiGet('/flows', params);
  }

  private async getFlow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.flow_id) return { content: [{ type: 'text', text: 'flow_id is required' }], isError: true };
    return this.apiGet(`/flows/${encodeURIComponent(args.flow_id as string)}`);
  }

  private async updateFlowStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.flow_id || !args.status) return { content: [{ type: 'text', text: 'flow_id and status are required' }], isError: true };
    const body = { data: { type: 'flow', id: args.flow_id, attributes: { status: args.status } } };
    return this.apiPatch(`/flows/${encodeURIComponent(args.flow_id as string)}`, body);
  }

  private async listMetrics(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[size]': String((args.page_size as number) ?? 20),
    };
    if (args.page_cursor) params['page[cursor]'] = args.page_cursor as string;
    return this.apiGet('/metrics', params);
  }

  private async getMetric(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.metric_id) return { content: [{ type: 'text', text: 'metric_id is required' }], isError: true };
    return this.apiGet(`/metrics/${encodeURIComponent(args.metric_id as string)}`);
  }

  private async createEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.metric_name) return { content: [{ type: 'text', text: 'metric_name is required' }], isError: true };

    const profile: Record<string, unknown> = {};
    if (args.email) profile.email = args.email;
    if (args.phone_number) profile.phone_number = args.phone_number;

    const attributes: Record<string, unknown> = {
      metric: { data: { type: 'metric', attributes: { name: args.metric_name } } },
      profile: { data: { type: 'profile', attributes: profile } },
    };
    if (args.properties) attributes.properties = args.properties;
    if (typeof args.value === 'number') attributes.value = args.value;
    if (args.time) attributes.time = args.time;

    const body = { data: { type: 'event', attributes } };
    return this.apiPost('/events', body);
  }

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[size]': String((args.page_size as number) ?? 20),
    };
    if (args.page_cursor) params['page[cursor]'] = args.page_cursor as string;
    if (args.sort) params.sort = args.sort as string;
    return this.apiGet('/templates', params);
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_id) return { content: [{ type: 'text', text: 'template_id is required' }], isError: true };
    return this.apiGet(`/templates/${encodeURIComponent(args.template_id as string)}`);
  }
}
