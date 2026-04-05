/**
 * Pipedrive MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Pipedrive-published MCP server found on GitHub. Multiple community implementations exist
// (WillDent/pipedrive-mcp-server, Wirasm/pipedrive-mcp, iamsamuelfraga/mcp-pipedrive) but none are
// published by Pipedrive Inc. itself.
// Our adapter covers: 28 tools. Vendor MCP covers: 0 tools (no official MCP).
// Recommendation: use-rest-api
//
// Base URL: https://api.pipedrive.com/v2 (v2 for all supported endpoints; v1 used for Notes which are not yet in v2)
// Auth: API token via x-api-token header (from Settings → Personal preferences → API)
// Docs: https://developers.pipedrive.com/docs/api/v1
// Rate limits: 80 req/2s per API token; 100 req/10s for public endpoints

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PipedriveConfig {
  apiToken: string;
  baseUrl?: string;
}

export class PipedriveMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: PipedriveConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.pipedrive.com/v2';
  }

  static catalog() {
    return {
      name: 'pipedrive',
      displayName: 'Pipedrive',
      version: '1.0.0',
      category: 'crm' as const,
      keywords: ['pipedrive', 'crm', 'deal', 'pipeline', 'sales', 'person', 'contact', 'organization', 'lead', 'activity', 'note', 'product'],
      toolNames: [
        'list_deals', 'get_deal', 'create_deal', 'update_deal', 'search_deals',
        'list_persons', 'get_person', 'create_person', 'update_person', 'search_persons',
        'list_organizations', 'get_organization', 'create_organization', 'update_organization', 'search_organizations',
        'list_leads', 'get_lead', 'create_lead', 'update_lead',
        'list_activities', 'create_activity', 'update_activity',
        'list_notes', 'create_note',
        'list_pipelines', 'list_stages',
        'list_products', 'search_items',
      ],
      description: 'Pipedrive CRM: manage deals, persons, organizations, leads, activities, notes, pipelines, and products across your sales pipeline.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_deals',
        description: 'List deals with optional filters for owner, pipeline, stage, person, organization, and status',
        inputSchema: {
          type: 'object',
          properties: {
            owner_id: { type: 'number', description: 'Filter by owner user ID' },
            pipeline_id: { type: 'number', description: 'Filter by pipeline ID' },
            stage_id: { type: 'number', description: 'Filter by stage ID' },
            person_id: { type: 'number', description: 'Filter by person ID' },
            org_id: { type: 'number', description: 'Filter by organization ID' },
            status: { type: 'string', description: 'Filter by status: open, won, lost, deleted (default: open)' },
            limit: { type: 'number', description: 'Results per page (default: 100, max: 500)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: [],
        },
      },
      {
        name: 'get_deal',
        description: 'Retrieve full details of a single Pipedrive deal by deal ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Pipedrive deal ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_deal',
        description: 'Create a new deal in Pipedrive with title, value, and optional associations',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Deal title (required)' },
            value: { type: 'number', description: 'Monetary value of the deal' },
            currency: { type: 'string', description: 'Currency code (e.g. USD, EUR); defaults to company currency' },
            person_id: { type: 'number', description: 'Associated person ID' },
            org_id: { type: 'number', description: 'Associated organization ID' },
            pipeline_id: { type: 'number', description: 'Pipeline ID' },
            stage_id: { type: 'number', description: 'Stage ID within the pipeline' },
            owner_id: { type: 'number', description: 'Owning user ID' },
            expected_close_date: { type: 'string', description: 'Expected close date in YYYY-MM-DD format' },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_deal',
        description: 'Update an existing Pipedrive deal by ID — title, value, stage, status, or close date',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Deal ID to update' },
            title: { type: 'string', description: 'New deal title' },
            value: { type: 'number', description: 'New monetary value' },
            status: { type: 'string', description: 'New status: open, won, lost' },
            stage_id: { type: 'number', description: 'Move to this stage ID' },
            expected_close_date: { type: 'string', description: 'New expected close date in YYYY-MM-DD format' },
            owner_id: { type: 'number', description: 'New owning user ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_deals',
        description: 'Search deals by title, notes, or custom fields using full-text search',
        inputSchema: {
          type: 'object',
          properties: {
            term: { type: 'string', description: 'Search term (minimum 2 characters)' },
            fields: { type: 'string', description: 'Comma-separated fields to search: title, notes, custom_fields' },
            status: { type: 'string', description: 'Filter by status: open, won, lost' },
            limit: { type: 'number', description: 'Results per page (default: 100, max: 500)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: ['term'],
        },
      },
      {
        name: 'list_persons',
        description: 'List persons (contacts) in Pipedrive with optional organization and owner filters',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: { type: 'number', description: 'Filter by organization ID' },
            owner_id: { type: 'number', description: 'Filter by owner user ID' },
            limit: { type: 'number', description: 'Results per page (default: 100, max: 500)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: [],
        },
      },
      {
        name: 'get_person',
        description: 'Retrieve full details of a single Pipedrive person/contact by person ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Pipedrive person ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_person',
        description: 'Create a new person (contact) in Pipedrive with name, email, and phone',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Person full name (required)' },
            email: { type: 'string', description: 'Email address' },
            phone: { type: 'string', description: 'Phone number' },
            org_id: { type: 'number', description: 'Associated organization ID' },
            owner_id: { type: 'number', description: 'Owning user ID' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_person',
        description: 'Update an existing Pipedrive person by ID — name, email, phone, or organization',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Person ID to update' },
            name: { type: 'string', description: 'New full name' },
            email: { type: 'string', description: 'New email address' },
            phone: { type: 'string', description: 'New phone number' },
            org_id: { type: 'number', description: 'New associated organization ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_persons',
        description: 'Search persons by name, email, phone, or notes using Pipedrive full-text search',
        inputSchema: {
          type: 'object',
          properties: {
            term: { type: 'string', description: 'Search term (minimum 2 characters)' },
            fields: { type: 'string', description: 'Comma-separated fields to search: name, email, phone, notes, custom_fields' },
            limit: { type: 'number', description: 'Results per page (default: 100, max: 500)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: ['term'],
        },
      },
      {
        name: 'list_organizations',
        description: 'List organizations in Pipedrive with optional owner filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            owner_id: { type: 'number', description: 'Filter by owner user ID' },
            limit: { type: 'number', description: 'Results per page (default: 100, max: 500)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: [],
        },
      },
      {
        name: 'get_organization',
        description: 'Retrieve full details of a single Pipedrive organization by organization ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Pipedrive organization ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_organization',
        description: 'Create a new organization in Pipedrive with a name and optional address',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Organization name (required)' },
            owner_id: { type: 'number', description: 'Owning user ID' },
            address: { type: 'string', description: 'Organization address' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_organization',
        description: 'Update an existing Pipedrive organization by ID — name, address, or owner',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Organization ID to update' },
            name: { type: 'string', description: 'New organization name' },
            address: { type: 'string', description: 'New address' },
            owner_id: { type: 'number', description: 'New owning user ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_organizations',
        description: 'Search organizations by name, address, or notes using Pipedrive full-text search',
        inputSchema: {
          type: 'object',
          properties: {
            term: { type: 'string', description: 'Search term (minimum 2 characters)' },
            fields: { type: 'string', description: 'Comma-separated fields to search: name, address, notes, custom_fields' },
            limit: { type: 'number', description: 'Results per page (default: 100, max: 500)' },
          },
          required: ['term'],
        },
      },
      {
        name: 'list_leads',
        description: 'List leads in Pipedrive — unqualified contacts before they become deals',
        inputSchema: {
          type: 'object',
          properties: {
            owner_id: { type: 'number', description: 'Filter by owner user ID' },
            limit: { type: 'number', description: 'Results per page (default: 100, max: 500)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: [],
        },
      },
      {
        name: 'get_lead',
        description: 'Retrieve full details of a single Pipedrive lead by lead ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Pipedrive lead UUID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_lead',
        description: 'Create a new lead in Pipedrive with title, linked to a person or organization',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Lead title (required)' },
            person_id: { type: 'number', description: 'Associated person ID' },
            organization_id: { type: 'number', description: 'Associated organization ID' },
            owner_id: { type: 'number', description: 'Owning user ID' },
            value_amount: { type: 'number', description: 'Estimated deal value' },
            value_currency: { type: 'string', description: 'Currency code for the estimated value (e.g. USD)' },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_lead',
        description: 'Update an existing Pipedrive lead by ID — title, value, owner, or linked entities',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Lead UUID to update' },
            title: { type: 'string', description: 'New lead title' },
            owner_id: { type: 'number', description: 'New owning user ID' },
            value_amount: { type: 'number', description: 'New estimated value' },
            value_currency: { type: 'string', description: 'New currency code' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_activities',
        description: 'List activities (calls, meetings, tasks, emails) with filters for deal, person, or org',
        inputSchema: {
          type: 'object',
          properties: {
            owner_id: { type: 'number', description: 'Filter by owner user ID' },
            deal_id: { type: 'number', description: 'Filter by deal ID' },
            person_id: { type: 'number', description: 'Filter by person ID' },
            org_id: { type: 'number', description: 'Filter by organization ID' },
            done: { type: 'boolean', description: 'Filter by completion: true (done), false (pending). Omit for all.' },
            limit: { type: 'number', description: 'Results per page (default: 100, max: 500)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: [],
        },
      },
      {
        name: 'create_activity',
        description: 'Create a new activity (call, meeting, task, email, deadline) in Pipedrive',
        inputSchema: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Activity subject/title (required)' },
            type: { type: 'string', description: 'Activity type: call, meeting, task, email, deadline, lunch (required)' },
            due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
            due_time: { type: 'string', description: 'Due time in HH:MM format (24-hour)' },
            duration: { type: 'string', description: 'Activity duration in HH:MM format' },
            deal_id: { type: 'number', description: 'Link to a deal by ID' },
            person_id: { type: 'number', description: 'Link to a person by ID' },
            org_id: { type: 'number', description: 'Link to an organization by ID' },
            note: { type: 'string', description: 'Activity note or description' },
          },
          required: ['subject', 'type'],
        },
      },
      {
        name: 'update_activity',
        description: 'Update an existing Pipedrive activity — subject, due date, type, or completion status',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Activity ID to update' },
            subject: { type: 'string', description: 'New subject' },
            type: { type: 'string', description: 'New type: call, meeting, task, email, deadline, lunch' },
            due_date: { type: 'string', description: 'New due date in YYYY-MM-DD format' },
            due_time: { type: 'string', description: 'New due time in HH:MM format' },
            done: { type: 'boolean', description: 'Mark the activity as done (true) or pending (false)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_notes',
        description: 'List notes in Pipedrive with optional filters for deal, person, organization, or lead',
        inputSchema: {
          type: 'object',
          properties: {
            deal_id: { type: 'number', description: 'Filter notes by deal ID' },
            person_id: { type: 'number', description: 'Filter notes by person ID' },
            org_id: { type: 'number', description: 'Filter notes by organization ID' },
            lead_id: { type: 'string', description: 'Filter notes by lead UUID' },
            limit: { type: 'number', description: 'Results per page (default: 100, max: 500)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: [],
        },
      },
      {
        name: 'create_note',
        description: 'Create a new note in Pipedrive linked to a deal, person, organization, or lead',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Note content in HTML or plain text (required)' },
            deal_id: { type: 'number', description: 'Link note to a deal by ID' },
            person_id: { type: 'number', description: 'Link note to a person by ID' },
            org_id: { type: 'number', description: 'Link note to an organization by ID' },
            lead_id: { type: 'string', description: 'Link note to a lead by UUID' },
          },
          required: ['content'],
        },
      },
      {
        name: 'list_pipelines',
        description: 'List all sales pipelines in the Pipedrive account',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'list_stages',
        description: 'List all stages in a Pipedrive pipeline',
        inputSchema: {
          type: 'object',
          properties: {
            pipeline_id: { type: 'number', description: 'Filter stages by pipeline ID' },
          },
          required: [],
        },
      },
      {
        name: 'list_products',
        description: 'List products in the Pipedrive product catalog with optional search',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Results per page (default: 100, max: 500)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: [],
        },
      },
      {
        name: 'search_items',
        description: 'Global search across all Pipedrive item types: deals, persons, orgs, leads, products, notes',
        inputSchema: {
          type: 'object',
          properties: {
            term: { type: 'string', description: 'Search term (minimum 2 characters, or 1 with exact_match)' },
            item_types: { type: 'string', description: 'Comma-separated item types: deal, person, organization, product, note, lead' },
            limit: { type: 'number', description: 'Results per page (default: 100, max: 500)' },
            exact_match: { type: 'boolean', description: 'Require exact term match (case-insensitive, default: false)' },
          },
          required: ['term'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_deals': return await this.listDeals(args);
        case 'get_deal': return await this.getDeal(args);
        case 'create_deal': return await this.createDeal(args);
        case 'update_deal': return await this.updateDeal(args);
        case 'search_deals': return await this.searchDeals(args);
        case 'list_persons': return await this.listPersons(args);
        case 'get_person': return await this.getPerson(args);
        case 'create_person': return await this.createPerson(args);
        case 'update_person': return await this.updatePerson(args);
        case 'search_persons': return await this.searchPersons(args);
        case 'list_organizations': return await this.listOrganizations(args);
        case 'get_organization': return await this.getOrganization(args);
        case 'create_organization': return await this.createOrganization(args);
        case 'update_organization': return await this.updateOrganization(args);
        case 'search_organizations': return await this.searchOrganizations(args);
        case 'list_leads': return await this.listLeads(args);
        case 'get_lead': return await this.getLead(args);
        case 'create_lead': return await this.createLead(args);
        case 'update_lead': return await this.updateLead(args);
        case 'list_activities': return await this.listActivities(args);
        case 'create_activity': return await this.createActivity(args);
        case 'update_activity': return await this.updateActivity(args);
        case 'list_notes': return await this.listNotes(args);
        case 'create_note': return await this.createNote(args);
        case 'list_pipelines': return await this.listPipelines();
        case 'list_stages': return await this.listStages(args);
        case 'list_products': return await this.listProducts(args);
        case 'search_items': return await this.searchItems(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      'x-api-token': this.apiToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async get(path: string, params: URLSearchParams): Promise<ToolResult> {
    const qs = params.toString();
    const url = `${this.baseUrl}/${path}${qs ? `?${qs}` : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async patch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Deals ─────────────────────────────────────────────────────────────────

  private async listDeals(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.owner_id !== undefined) params.set('owner_id', String(args.owner_id));
    if (args.pipeline_id !== undefined) params.set('pipeline_id', String(args.pipeline_id));
    if (args.stage_id !== undefined) params.set('stage_id', String(args.stage_id));
    if (args.person_id !== undefined) params.set('person_id', String(args.person_id));
    if (args.org_id !== undefined) params.set('org_id', String(args.org_id));
    if (args.status) params.set('status', args.status as string);
    params.set('limit', String(args.limit ?? 100));
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.get('deals', params);
  }

  private async getDeal(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`deals/${encodeURIComponent(args.id as string)}`, new URLSearchParams());
  }

  private async createDeal(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { title: args.title };
    if (args.value !== undefined) body.value = args.value;
    if (args.currency) body.currency = args.currency;
    if (args.person_id !== undefined) body.person_id = args.person_id;
    if (args.org_id !== undefined) body.org_id = args.org_id;
    if (args.pipeline_id !== undefined) body.pipeline_id = args.pipeline_id;
    if (args.stage_id !== undefined) body.stage_id = args.stage_id;
    if (args.owner_id !== undefined) body.owner_id = args.owner_id;
    if (args.expected_close_date) body.expected_close_date = args.expected_close_date;
    return this.post('deals', body);
  }

  private async updateDeal(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.value !== undefined) body.value = args.value;
    if (args.status) body.status = args.status;
    if (args.stage_id !== undefined) body.stage_id = args.stage_id;
    if (args.expected_close_date) body.expected_close_date = args.expected_close_date;
    if (args.owner_id !== undefined) body.owner_id = args.owner_id;
    return this.patch(`deals/${encodeURIComponent(args.id as string)}`, body);
  }

  private async searchDeals(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ term: args.term as string });
    if (args.fields) params.set('fields', args.fields as string);
    if (args.status) params.set('status', args.status as string);
    params.set('limit', String(args.limit ?? 100));
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.get('deals/search', params);
  }

  // ── Persons ───────────────────────────────────────────────────────────────

  private async listPersons(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.org_id !== undefined) params.set('org_id', String(args.org_id));
    if (args.owner_id !== undefined) params.set('owner_id', String(args.owner_id));
    params.set('limit', String(args.limit ?? 100));
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.get('persons', params);
  }

  private async getPerson(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`persons/${encodeURIComponent(args.id as string)}`, new URLSearchParams());
  }

  private async createPerson(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.email) body.email = [{ value: args.email, primary: true }];
    if (args.phone) body.phone = [{ value: args.phone, primary: true }];
    if (args.org_id !== undefined) body.org_id = args.org_id;
    if (args.owner_id !== undefined) body.owner_id = args.owner_id;
    return this.post('persons', body);
  }

  private async updatePerson(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.email) body.email = [{ value: args.email, primary: true }];
    if (args.phone) body.phone = [{ value: args.phone, primary: true }];
    if (args.org_id !== undefined) body.org_id = args.org_id;
    return this.patch(`persons/${encodeURIComponent(args.id as string)}`, body);
  }

  private async searchPersons(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ term: args.term as string });
    if (args.fields) params.set('fields', args.fields as string);
    params.set('limit', String(args.limit ?? 100));
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.get('persons/search', params);
  }

  // ── Organizations ─────────────────────────────────────────────────────────

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.owner_id !== undefined) params.set('owner_id', String(args.owner_id));
    params.set('limit', String(args.limit ?? 100));
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.get('organizations', params);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`organizations/${encodeURIComponent(args.id as string)}`, new URLSearchParams());
  }

  private async createOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.owner_id !== undefined) body.owner_id = args.owner_id;
    if (args.address) body.address = args.address;
    return this.post('organizations', body);
  }

  private async updateOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.address) body.address = args.address;
    if (args.owner_id !== undefined) body.owner_id = args.owner_id;
    return this.patch(`organizations/${encodeURIComponent(args.id as string)}`, body);
  }

  private async searchOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ term: args.term as string });
    if (args.fields) params.set('fields', args.fields as string);
    params.set('limit', String(args.limit ?? 100));
    return this.get('organizations/search', params);
  }

  // ── Leads ─────────────────────────────────────────────────────────────────

  private async listLeads(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.owner_id !== undefined) params.set('owner_id', String(args.owner_id));
    params.set('limit', String(args.limit ?? 100));
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.get('leads', params);
  }

  private async getLead(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get(`leads/${encodeURIComponent(args.id as string)}`, new URLSearchParams());
  }

  private async createLead(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { title: args.title };
    if (args.person_id !== undefined) body.person_id = args.person_id;
    if (args.organization_id !== undefined) body.organization_id = args.organization_id;
    if (args.owner_id !== undefined) body.owner_id = args.owner_id;
    if (args.value_amount !== undefined) {
      body.value = { amount: args.value_amount, currency: args.value_currency ?? 'USD' };
    }
    return this.post('leads', body);
  }

  private async updateLead(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.owner_id !== undefined) body.owner_id = args.owner_id;
    if (args.value_amount !== undefined) {
      body.value = { amount: args.value_amount, currency: args.value_currency ?? 'USD' };
    }
    return this.patch(`leads/${encodeURIComponent(args.id as string)}`, body);
  }

  // ── Activities ────────────────────────────────────────────────────────────

  private async listActivities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.owner_id !== undefined) params.set('owner_id', String(args.owner_id));
    if (args.deal_id !== undefined) params.set('deal_id', String(args.deal_id));
    if (args.person_id !== undefined) params.set('person_id', String(args.person_id));
    if (args.org_id !== undefined) params.set('org_id', String(args.org_id));
    if (typeof args.done === 'boolean') params.set('done', args.done ? '1' : '0');
    params.set('limit', String(args.limit ?? 100));
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.get('activities', params);
  }

  private async createActivity(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { subject: args.subject, type: args.type };
    if (args.due_date) body.due_date = args.due_date;
    if (args.due_time) body.due_time = args.due_time;
    if (args.duration) body.duration = args.duration;
    if (args.deal_id !== undefined) body.deal_id = args.deal_id;
    if (args.person_id !== undefined) body.person_id = args.person_id;
    if (args.org_id !== undefined) body.org_id = args.org_id;
    if (args.note) body.note = args.note;
    return this.post('activities', body);
  }

  private async updateActivity(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.subject) body.subject = args.subject;
    if (args.type) body.type = args.type;
    if (args.due_date) body.due_date = args.due_date;
    if (args.due_time) body.due_time = args.due_time;
    if (typeof args.done === 'boolean') body.done = args.done ? 1 : 0;
    return this.patch(`activities/${encodeURIComponent(args.id as string)}`, body);
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  private async listNotes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.deal_id !== undefined) params.set('deal_id', String(args.deal_id));
    if (args.person_id !== undefined) params.set('person_id', String(args.person_id));
    if (args.org_id !== undefined) params.set('org_id', String(args.org_id));
    if (args.lead_id) params.set('lead_id', args.lead_id as string);
    params.set('limit', String(args.limit ?? 100));
    if (args.cursor) params.set('cursor', args.cursor as string);
    // Notes API is v1 only — not yet migrated to v2
    const v1Base = this.baseUrl.replace('/v2', '/v1');
    const qs = params.toString();
    const url = `${v1Base}/notes${qs ? `?${qs}` : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createNote(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { content: args.content };
    if (args.deal_id !== undefined) body.deal_id = args.deal_id;
    if (args.person_id !== undefined) body.person_id = args.person_id;
    if (args.org_id !== undefined) body.org_id = args.org_id;
    if (args.lead_id) body.lead_id = args.lead_id;
    // Notes API is v1 only — not yet migrated to v2
    const v1Base = this.baseUrl.replace('/v2', '/v1');
    const response = await this.fetchWithRetry(`${v1Base}/notes`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Pipelines & Stages ────────────────────────────────────────────────────

  private async listPipelines(): Promise<ToolResult> {
    return this.get('pipelines', new URLSearchParams());
  }

  private async listStages(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.pipeline_id !== undefined) params.set('pipeline_id', String(args.pipeline_id));
    return this.get('stages', params);
  }

  // ── Products ──────────────────────────────────────────────────────────────

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String(args.limit ?? 100));
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.get('products', params);
  }

  // ── Global Search ─────────────────────────────────────────────────────────

  private async searchItems(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ term: args.term as string });
    if (args.item_types) params.set('item_types', args.item_types as string);
    params.set('limit', String(args.limit ?? 100));
    if (typeof args.exact_match === 'boolean') params.set('exact_match', String(args.exact_match));
    // itemSearch promoted to v2 stable on 2025-03-13 (GET /api/v2/itemSearch)
    return this.get('itemSearch', params);
  }
}
