/**
 * Marketo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/alexleventer/marketo-mcp — transport: stdio, auth: OAuth2 client credentials
// This is a COMMUNITY MCP server (not published by Adobe/Marketo). It exposes 4 tools (forms only:
//   get_forms_list, get_form_by_id, clone_form, approve_form) and is not actively maintained
//   (last commit >6 months as of 2026-03-28). Fails criteria 1 (not official) and 2 (unmaintained).
// Our adapter covers: 18 tools. Vendor MCP covers: 4 tools (forms only, community-maintained).
// Recommendation: use-rest-api — no official Marketo MCP server exists as of 2026-03-28.
//   Community MCP (alexleventer/marketo-mcp) is forms-only and unmaintained; our REST adapter is authoritative.
//
// Base URL: Instance-specific. Requires clientId, clientSecret, identityUrl, and restBaseUrl.
//   Example: identityUrl  = https://284-RPR-133.mktorest.com/identity
//            restBaseUrl  = https://284-RPR-133.mktorest.com/rest
// Auth: OAuth2 client_credentials (2-legged).
//   Token endpoint: GET {identityUrl}/oauth/token?grant_type=client_credentials&client_id=...&client_secret=...
//   IMPORTANT: Support for access_token query parameter auth was removed June 30, 2025.
//   This adapter uses Bearer token in Authorization header exclusively.
//   Token TTL is 3600 seconds; adapter refreshes 60 seconds before expiry.
// Docs: https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/rest/rest-api
//       https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/rest/endpoint-reference
//       https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/rest/authentication
// Rate limits: 50,000 API calls per day; 100 calls per 20 seconds per subscription

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MarketoConfig {
  /** OAuth2 client ID from Marketo Admin > LaunchPoint > API Service. */
  clientId: string;
  /** OAuth2 client secret from Marketo Admin > LaunchPoint > API Service. */
  clientSecret: string;
  /** Identity URL from Marketo Admin > Web Services. Format: https://{munchkin}.mktorest.com/identity */
  identityUrl: string;
  /** REST base URL from Marketo Admin > Web Services. Format: https://{munchkin}.mktorest.com/rest */
  restBaseUrl: string;
}

export class MarketoMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly identityUrl: string;
  private readonly restBaseUrl: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: MarketoConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.identityUrl = config.identityUrl.replace(/\/$/, '');
    this.restBaseUrl = config.restBaseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'marketo',
      displayName: 'Marketo',
      version: '1.0.0',
      category: 'crm',
      keywords: ['marketo', 'adobe', 'marketing-automation', 'lead', 'campaign', 'program', 'email', 'form', 'segment', 'smart-list', 'activity', 'nurture', 'b2b'],
      toolNames: [
        'get_leads', 'create_or_update_leads', 'delete_leads', 'describe_lead',
        'list_campaigns', 'get_campaign', 'request_campaign',
        'list_programs', 'get_program',
        'get_lead_activity', 'get_activity_types',
        'list_smart_lists', 'get_smart_list_leads',
        'list_email_templates', 'get_email_template',
        'list_forms', 'get_form',
        'list_custom_objects',
      ],
      description: 'Adobe Marketo Engage: manage leads, trigger campaigns, query programs, activities, smart lists, email templates, and forms via the Marketo REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Leads ──────────────────────────────────────────────────────────────
      {
        name: 'get_leads',
        description: 'Retrieve leads from Marketo filtered by a field type and values (e.g. by email, id, or cookie)',
        inputSchema: {
          type: 'object',
          properties: {
            filter_type: { type: 'string', description: 'Lead field to filter on: email, id, cookie, twitterId, linkedInId, sfdcAccountId (required)' },
            filter_values: { type: 'string', description: 'Comma-separated list of values matching the filter_type field (required)' },
            fields: { type: 'string', description: 'Comma-separated list of lead fields to return (default: id,email,firstName,lastName,company)' },
            next_page_token: { type: 'string', description: 'Pagination token from a prior response nextPageToken field' },
          },
          required: ['filter_type', 'filter_values'],
        },
      },
      {
        name: 'create_or_update_leads',
        description: 'Create or update (upsert) one or more Marketo leads. Deduplicates by email by default.',
        inputSchema: {
          type: 'object',
          properties: {
            leads: { type: 'array', description: 'Array of lead objects. Each may include email, firstName, lastName, company, phone, and any custom field.' },
            action: { type: 'string', description: 'Sync action: createOrUpdate (default), createOnly, updateOnly, createDuplicate' },
            lookup_field: { type: 'string', description: 'Field used for deduplication (default: email)' },
          },
          required: ['leads'],
        },
      },
      {
        name: 'delete_leads',
        description: 'Permanently delete one or more leads from Marketo by their numeric lead IDs',
        inputSchema: {
          type: 'object',
          properties: {
            lead_ids: { type: 'array', description: 'Array of numeric Marketo lead IDs to delete' },
          },
          required: ['lead_ids'],
        },
      },
      {
        name: 'describe_lead',
        description: 'Retrieve the complete field schema for the Marketo lead object, including custom fields and data types',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Campaigns ──────────────────────────────────────────────────────────
      {
        name: 'list_campaigns',
        description: 'List smart campaigns in Marketo with optional filters for triggerable status and program name',
        inputSchema: {
          type: 'object',
          properties: {
            is_triggerable: { type: 'boolean', description: 'Set true to return only campaigns requestable via API (default: all campaigns)' },
            program_name: { type: 'string', description: 'Filter campaigns belonging to a specific program name' },
          },
        },
      },
      {
        name: 'get_campaign',
        description: 'Get details for a single Marketo smart campaign by its numeric campaign ID',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: { type: 'number', description: 'Numeric Marketo smart campaign ID' },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'request_campaign',
        description: 'Trigger a requestable Marketo smart campaign for a list of lead IDs',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: { type: 'number', description: 'Numeric Marketo campaign ID to trigger (must be a requestable API campaign)' },
            lead_ids: { type: 'array', description: 'Array of numeric Marketo lead IDs to run through the campaign' },
          },
          required: ['campaign_id', 'lead_ids'],
        },
      },
      // ── Programs ───────────────────────────────────────────────────────────
      {
        name: 'list_programs',
        description: 'List marketing programs in Marketo with optional type, workspace, and tag filters',
        inputSchema: {
          type: 'object',
          properties: {
            max_return: { type: 'number', description: 'Maximum programs to return (default: 20, max: 200)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            filter_type: { type: 'string', description: 'Filter type: programType, workspace, tag' },
            filter_values: { type: 'string', description: 'Comma-separated values for the filter_type' },
          },
        },
      },
      {
        name: 'get_program',
        description: 'Get full details of a specific Marketo program by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            program_id: { type: 'number', description: 'Numeric Marketo program ID' },
          },
          required: ['program_id'],
        },
      },
      // ── Activities ─────────────────────────────────────────────────────────
      {
        name: 'get_lead_activity',
        description: 'Retrieve the activity history for a specific Marketo lead, optionally filtered by activity type IDs',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: { type: 'number', description: 'Numeric Marketo lead ID to retrieve activity for' },
            activity_type_ids: { type: 'string', description: 'Comma-separated activity type IDs to filter (e.g. 1,2,12). Omit to return all types.' },
            next_page_token: { type: 'string', description: 'Pagination token from a prior response. Omit to default to last 7 days.' },
          },
          required: ['lead_id'],
        },
      },
      {
        name: 'get_activity_types',
        description: 'Get the complete list of Marketo activity types with their numeric IDs and descriptions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Smart Lists ────────────────────────────────────────────────────────
      {
        name: 'list_smart_lists',
        description: 'List static and smart lists in Marketo with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            max_return: { type: 'number', description: 'Maximum lists to return (default: 20, max: 200)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_smart_list_leads',
        description: 'Get the members (lead IDs) of a specific Marketo static or smart list',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'number', description: 'Numeric Marketo list ID to retrieve members from' },
            fields: { type: 'string', description: 'Comma-separated lead fields to include in the response (default: id,email)' },
            next_page_token: { type: 'string', description: 'Pagination token from prior response' },
          },
          required: ['list_id'],
        },
      },
      // ── Email Templates ────────────────────────────────────────────────────
      {
        name: 'list_email_templates',
        description: 'List email templates in the Marketo Design Studio with optional status and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            max_return: { type: 'number', description: 'Maximum templates to return (default: 20, max: 200)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            status: { type: 'string', description: 'Filter by status: draft or approved' },
          },
        },
      },
      {
        name: 'get_email_template',
        description: 'Get details and HTML content of a specific Marketo email template by ID',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'Numeric Marketo email template ID' },
            status: { type: 'string', description: 'Version to retrieve: draft or approved (default: approved)' },
          },
          required: ['template_id'],
        },
      },
      // ── Forms ──────────────────────────────────────────────────────────────
      {
        name: 'list_forms',
        description: 'List landing page forms in the Marketo Design Studio with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            max_return: { type: 'number', description: 'Maximum forms to return (default: 20, max: 200)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            status: { type: 'string', description: 'Filter by status: draft or approved' },
          },
        },
      },
      {
        name: 'get_form',
        description: 'Get details and field definitions of a specific Marketo form by ID',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: { type: 'number', description: 'Numeric Marketo form ID' },
            status: { type: 'string', description: 'Version to retrieve: draft or approved (default: approved)' },
          },
          required: ['form_id'],
        },
      },
      // ── Custom Objects ─────────────────────────────────────────────────────
      {
        name: 'list_custom_objects',
        description: 'List all custom object types defined in the Marketo instance with their field schemas',
        inputSchema: {
          type: 'object',
          properties: {
            api_name: { type: 'string', description: 'Filter to a specific custom object type by API name (e.g. car_c)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_leads':              return await this.getLeads(args);
        case 'create_or_update_leads': return await this.createOrUpdateLeads(args);
        case 'delete_leads':           return await this.deleteLeads(args);
        case 'describe_lead':          return await this.describeLead();
        case 'list_campaigns':         return await this.listCampaigns(args);
        case 'get_campaign':           return await this.getCampaign(args);
        case 'request_campaign':       return await this.requestCampaign(args);
        case 'list_programs':          return await this.listPrograms(args);
        case 'get_program':            return await this.getProgram(args);
        case 'get_lead_activity':      return await this.getLeadActivity(args);
        case 'get_activity_types':     return await this.getActivityTypes();
        case 'list_smart_lists':       return await this.listSmartLists(args);
        case 'get_smart_list_leads':   return await this.getSmartListLeads(args);
        case 'list_email_templates':   return await this.listEmailTemplates(args);
        case 'get_email_template':     return await this.getEmailTemplate(args);
        case 'list_forms':             return await this.listForms(args);
        case 'get_form':               return await this.getForm(args);
        case 'list_custom_objects':    return await this.listCustomObjects(args);
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

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }
    const tokenUrl = `${this.identityUrl}/oauth/token?grant_type=client_credentials&client_id=${encodeURIComponent(this.clientId)}&client_secret=${encodeURIComponent(this.clientSecret)}`;
    const response = await this.fetchWithRetry(tokenUrl, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Marketo OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.cachedToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.cachedToken;
  }

  private async reqHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const headers = await this.reqHeaders();
    const response = await this.fetchWithRetry(`${this.restBaseUrl}${path}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const headers = await this.reqHeaders();
    const response = await this.fetchWithRetry(`${this.restBaseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getLeads(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.filter_type || !args.filter_values) {
      return { content: [{ type: 'text', text: 'filter_type and filter_values are required' }], isError: true };
    }
    const params = new URLSearchParams({
      filterType: args.filter_type as string,
      filterValues: args.filter_values as string,
    });
    if (args.fields) params.set('fields', args.fields as string);
    if (args.next_page_token) params.set('nextPageToken', args.next_page_token as string);
    return this.get(`/v1/leads.json?${params.toString()}`);
  }

  private async createOrUpdateLeads(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.leads || !Array.isArray(args.leads) || (args.leads as unknown[]).length === 0) {
      return { content: [{ type: 'text', text: 'leads array is required and must not be empty' }], isError: true };
    }
    const body: Record<string, unknown> = { input: args.leads };
    if (args.action) body.action = args.action;
    if (args.lookup_field) body.lookupField = args.lookup_field;
    return this.post('/v1/leads.json', body);
  }

  private async deleteLeads(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.lead_ids || !Array.isArray(args.lead_ids) || (args.lead_ids as unknown[]).length === 0) {
      return { content: [{ type: 'text', text: 'lead_ids array is required and must not be empty' }], isError: true };
    }
    const input = (args.lead_ids as number[]).map((id) => ({ id }));
    return this.post('/v1/leads/delete.json', { input });
  }

  private async describeLead(): Promise<ToolResult> {
    return this.get('/v1/leads/describe.json');
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (typeof args.is_triggerable === 'boolean') params.set('isTriggerable', String(args.is_triggerable));
    if (args.program_name) params.set('programName', args.program_name as string);
    return this.get(`/v1/campaigns.json${params.toString() ? '?' + params.toString() : ''}`);
  }

  private async getCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.campaign_id === undefined) {
      return { content: [{ type: 'text', text: 'campaign_id is required' }], isError: true };
    }
    return this.get(`/v1/campaigns/${encodeURIComponent(String(args.campaign_id))}.json`);
  }

  private async requestCampaign(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.campaign_id === undefined || !args.lead_ids || !Array.isArray(args.lead_ids) || (args.lead_ids as unknown[]).length === 0) {
      return { content: [{ type: 'text', text: 'campaign_id and lead_ids array are required' }], isError: true };
    }
    const input = (args.lead_ids as number[]).map((id) => ({ id }));
    return this.post(`/v1/campaigns/${encodeURIComponent(String(args.campaign_id))}/trigger.json`, { input });
  }

  private async listPrograms(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_return !== undefined) params.set('maxReturn', String(args.max_return));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.filter_type) params.set('filterType', args.filter_type as string);
    if (args.filter_values) params.set('filterValues', args.filter_values as string);
    return this.get(`/asset/v1/programs.json${params.toString() ? '?' + params.toString() : ''}`);
  }

  private async getProgram(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.program_id === undefined) {
      return { content: [{ type: 'text', text: 'program_id is required' }], isError: true };
    }
    return this.get(`/asset/v1/program/${encodeURIComponent(String(args.program_id))}.json`);
  }

  private async getLeadActivity(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lead_id === undefined) {
      return { content: [{ type: 'text', text: 'lead_id is required' }], isError: true };
    }
    let pagingToken = args.next_page_token as string | undefined;
    if (!pagingToken) {
      const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00Z';
      const tokenResult = await this.get(`/v1/activities/pagingtoken.json?sinceDatetime=${encodeURIComponent(sinceDate)}`);
      if (tokenResult.isError) return tokenResult;
      const tokenData = JSON.parse(tokenResult.content[0].text) as { nextPageToken: string };
      pagingToken = tokenData.nextPageToken;
    }
    const params = new URLSearchParams({ nextPageToken: pagingToken, leadIds: String(args.lead_id) });
    if (args.activity_type_ids) params.set('activityTypeIds', args.activity_type_ids as string);
    return this.get(`/v1/activities.json?${params.toString()}`);
  }

  private async getActivityTypes(): Promise<ToolResult> {
    return this.get('/v1/activities/types.json');
  }

  private async listSmartLists(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_return !== undefined) params.set('maxReturn', String(args.max_return));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    return this.get(`/asset/v1/staticLists.json${params.toString() ? '?' + params.toString() : ''}`);
  }

  private async getSmartListLeads(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.list_id === undefined) {
      return { content: [{ type: 'text', text: 'list_id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.fields) params.set('fields', args.fields as string);
    if (args.next_page_token) params.set('nextPageToken', args.next_page_token as string);
    return this.get(`/v1/lists/${encodeURIComponent(String(args.list_id))}/leads.json${params.toString() ? '?' + params.toString() : ''}`);
  }

  private async listEmailTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_return !== undefined) params.set('maxReturn', String(args.max_return));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.status) params.set('status', args.status as string);
    return this.get(`/asset/v1/emailTemplates.json${params.toString() ? '?' + params.toString() : ''}`);
  }

  private async getEmailTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.template_id === undefined) {
      return { content: [{ type: 'text', text: 'template_id is required' }], isError: true };
    }
    const status = (args.status as string) ?? 'approved';
    return this.get(`/asset/v1/emailTemplate/${encodeURIComponent(String(args.template_id))}.json?status=${encodeURIComponent(status)}`);
  }

  private async listForms(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.max_return !== undefined) params.set('maxReturn', String(args.max_return));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.status) params.set('status', args.status as string);
    return this.get(`/asset/v1/forms.json${params.toString() ? '?' + params.toString() : ''}`);
  }

  private async getForm(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.form_id === undefined) {
      return { content: [{ type: 'text', text: 'form_id is required' }], isError: true };
    }
    const status = (args.status as string) ?? 'approved';
    return this.get(`/asset/v1/form/${encodeURIComponent(String(args.form_id))}.json?status=${encodeURIComponent(status)}`);
  }

  private async listCustomObjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.api_name) params.set('names', args.api_name as string);
    // Correct endpoint: GET /rest/v1/customobjects.json (not /customobjects/schema.json which is for schema management)
    return this.get(`/v1/customobjects.json${params.toString() ? '?' + params.toString() : ''}`);
  }
}
