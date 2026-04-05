/**
 * Zoho CRM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Multiple community implementations exist (Mgabr90/zoho-mcp-server, ampcome-mcps/zoho-crm-mcp,
// CDataSoftware/zoho-crm-mcp-server-by-cdata) but none are official Zoho-published MCP servers.
// Zoho MCP (zoho.com/mcp) is a Zoho-hosted MCP platform for all Zoho products (CRM, Desk, etc.)
// but does not publish a standalone open-source CRM MCP server.
//
// Base URL: https://www.zohoapis.com/crm/v8 (US region default)
// Regional alternatives:
//   EU: https://www.zohoapis.eu/crm/v8
//   IN: https://www.zohoapis.in/crm/v8
//   AU: https://www.zohoapis.com.au/crm/v8
//   JP: https://www.zohoapis.jp/crm/v8
//   CA: https://www.zohoapis.ca/crm/v8
// Sandbox: replace "www" with "sandbox" (e.g. https://sandbox.zohoapis.com/crm/v8)
// Auth: OAuth2 Bearer token (Zoho-oauthtoken header)
// Docs: https://www.zoho.com/crm/developer/docs/api/v8/
// Rate limits: 5,000 credits/day (Free), 25,000 credits/day (Standard and up). List=1 credit, Search=1 credit.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ZohoCRMConfig {
  /** OAuth2 access token obtained via Zoho OAuth2 flow. */
  accessToken: string;
  /** Override the API base URL (e.g. for EU or sandbox). Default: https://www.zohoapis.com/crm/v8 */
  baseUrl?: string;
}

export class ZohoCRMMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ZohoCRMConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://www.zohoapis.com/crm/v8';
  }

  static catalog() {
    return {
      name: 'zoho-crm',
      displayName: 'Zoho CRM',
      version: '1.0.0',
      category: 'crm' as const,
      keywords: [
        'zoho', 'crm', 'lead', 'contact', 'account', 'deal', 'opportunity',
        'task', 'call', 'meeting', 'note', 'pipeline', 'convert', 'tag',
        'module', 'record', 'sales', 'funnel',
      ],
      toolNames: [
        'list_records', 'get_record', 'create_record', 'update_record', 'delete_record',
        'search_records',
        'get_related_records',
        'create_note', 'list_notes',
        'convert_lead',
        'list_modules', 'get_module',
        'list_tags', 'create_tag', 'add_tags_to_record',
        'list_pipelines',
        'list_users',
      ],
      description: 'Manage Zoho CRM records across all modules (Leads, Contacts, Accounts, Deals), convert leads, manage notes, tags, pipelines, and related records.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Records (CRUD) ───────────────────────────────────────────────────────
      {
        name: 'list_records',
        description: 'List records from any Zoho CRM module with optional field selection, sorting, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals, Tasks, Calls, Meetings, Activities.',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated field API names to return. Omit to return default fields.',
            },
            sort_by: {
              type: 'string',
              description: 'Field API name to sort results by.',
            },
            sort_order: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Records per page, max 200 (default: 200).',
            },
          },
          required: ['module'],
        },
      },
      {
        name: 'get_record',
        description: 'Get a single record from a Zoho CRM module by record ID with optional field selection.',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals, Tasks, Calls, Meetings.',
            },
            record_id: {
              type: 'string',
              description: 'Zoho CRM record ID.',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated field API names to return.',
            },
          },
          required: ['module', 'record_id'],
        },
      },
      {
        name: 'create_record',
        description: 'Create a new record in a Zoho CRM module with the provided field values.',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals, Tasks, Calls, Meetings.',
            },
            data: {
              type: 'object',
              description: 'Record field values as key-value pairs. Field names must match the module\'s API names.',
            },
            trigger: {
              type: 'array',
              description: 'Workflow triggers to fire: workflow, approval, blueprint (default: all).',
              items: { type: 'string' },
            },
          },
          required: ['module', 'data'],
        },
      },
      {
        name: 'update_record',
        description: 'Update an existing Zoho CRM record by ID with only the fields that need changing.',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals, Tasks, Calls, Meetings.',
            },
            record_id: {
              type: 'string',
              description: 'Zoho CRM record ID to update.',
            },
            data: {
              type: 'object',
              description: 'Fields to update as key-value pairs. Only include fields you want to change.',
            },
          },
          required: ['module', 'record_id', 'data'],
        },
      },
      {
        name: 'delete_record',
        description: 'Delete a record from a Zoho CRM module by record ID. This action moves the record to the recycle bin.',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals, Tasks, Calls, Meetings.',
            },
            record_id: {
              type: 'string',
              description: 'Zoho CRM record ID to delete.',
            },
          },
          required: ['module', 'record_id'],
        },
      },
      // ── Search ───────────────────────────────────────────────────────────────
      {
        name: 'search_records',
        description: 'Search Zoho CRM records by criteria expression, email, phone, word, or COQL query.',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals, Tasks, Calls, Meetings.',
            },
            criteria: {
              type: 'string',
              description: 'Field-based criteria, e.g. "(Last_Name:equals:Smith)". Use this OR email/phone/word/coql, not combined.',
            },
            email: {
              type: 'string',
              description: 'Search by exact email address.',
            },
            phone: {
              type: 'string',
              description: 'Search by exact phone number.',
            },
            word: {
              type: 'string',
              description: 'Keyword search across all text fields.',
            },
            coql: {
              type: 'string',
              description: 'COQL query string (SQL-like, e.g. "SELECT id,Last_Name FROM Leads WHERE Last_Name = \'Smith\'").',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Records per page, max 200 (default: 200).',
            },
          },
          required: ['module'],
        },
      },
      // ── Related Records ──────────────────────────────────────────────────────
      {
        name: 'get_related_records',
        description: 'Retrieve records related to a specific Zoho CRM record, such as Notes, Attachments, Contacts, or Deals.',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Parent module API name (e.g. Contacts, Accounts, Deals).',
            },
            record_id: {
              type: 'string',
              description: 'Parent record ID.',
            },
            related_list: {
              type: 'string',
              description: 'Related list API name: Notes, Attachments, Contacts, Deals, Activities, Emails.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Records per page, max 200 (default: 200).',
            },
          },
          required: ['module', 'record_id', 'related_list'],
        },
      },
      // ── Notes ────────────────────────────────────────────────────────────────
      {
        name: 'create_note',
        description: 'Create a note and attach it to a Zoho CRM record (Contact, Lead, Deal, Account, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            parent_module: {
              type: 'string',
              description: 'Module API name of the parent record: Leads, Contacts, Accounts, Deals.',
            },
            parent_id: {
              type: 'string',
              description: 'Record ID of the parent record to attach the note to.',
            },
            note_title: {
              type: 'string',
              description: 'Title of the note.',
            },
            note_content: {
              type: 'string',
              description: 'Body content of the note.',
            },
          },
          required: ['parent_module', 'parent_id', 'note_content'],
        },
      },
      {
        name: 'list_notes',
        description: 'List notes in Zoho CRM with optional filtering by parent module and record ID.',
        inputSchema: {
          type: 'object',
          properties: {
            parent_module: {
              type: 'string',
              description: 'Filter notes by parent module: Leads, Contacts, Accounts, Deals.',
            },
            parent_id: {
              type: 'string',
              description: 'Filter notes by parent record ID.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Notes per page, max 200 (default: 200).',
            },
          },
        },
      },
      // ── Lead Conversion ──────────────────────────────────────────────────────
      {
        name: 'convert_lead',
        description: 'Convert a Zoho CRM Lead into a Contact and optionally a linked Account and Deal.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: {
              type: 'string',
              description: 'Record ID of the Lead to convert.',
            },
            overwrite: {
              type: 'boolean',
              description: 'Overwrite existing Contact/Account fields with lead data (default: false).',
            },
            notify_lead_owner: {
              type: 'boolean',
              description: 'Notify the lead owner of the conversion (default: true).',
            },
            notify_new_entity_owner: {
              type: 'boolean',
              description: 'Notify the new Contact/Account owner (default: true).',
            },
            accounts: {
              type: 'object',
              description: 'Account data for conversion. Provide id to link existing, or name to create new.',
            },
            contacts: {
              type: 'object',
              description: 'Contact data overrides during conversion.',
            },
            deals: {
              type: 'object',
              description: 'Deal data to create during conversion. Requires Deal_Name and Stage fields.',
            },
          },
          required: ['lead_id'],
        },
      },
      // ── Modules ──────────────────────────────────────────────────────────────
      {
        name: 'list_modules',
        description: 'List all modules available in the Zoho CRM organization with metadata and API names.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_module',
        description: 'Get full metadata for a specific Zoho CRM module including all field definitions.',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name to retrieve metadata for.',
            },
          },
          required: ['module'],
        },
      },
      // ── Tags ─────────────────────────────────────────────────────────────────
      {
        name: 'list_tags',
        description: 'List all tags available in a Zoho CRM module.',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name to list tags for: Leads, Contacts, Accounts, Deals.',
            },
          },
          required: ['module'],
        },
      },
      {
        name: 'create_tag',
        description: 'Create a new tag in a Zoho CRM module for organizing and filtering records.',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name to create the tag in: Leads, Contacts, Accounts, Deals.',
            },
            name: {
              type: 'string',
              description: 'Tag name to create.',
            },
          },
          required: ['module', 'name'],
        },
      },
      {
        name: 'add_tags_to_record',
        description: 'Add one or more tags to a Zoho CRM record by record ID.',
        inputSchema: {
          type: 'object',
          properties: {
            module: {
              type: 'string',
              description: 'Module API name: Leads, Contacts, Accounts, Deals.',
            },
            record_id: {
              type: 'string',
              description: 'Record ID to tag.',
            },
            tag_names: {
              type: 'array',
              description: 'Array of tag name strings to add to the record.',
              items: { type: 'string' },
            },
          },
          required: ['module', 'record_id', 'tag_names'],
        },
      },
      // ── Pipelines ────────────────────────────────────────────────────────────
      {
        name: 'list_pipelines',
        description: 'List all sales pipelines for a specific Deals module layout in Zoho CRM, including stages and probabilities.',
        inputSchema: {
          type: 'object',
          properties: {
            layout_id: {
              type: 'string',
              description: 'The unique ID of the Deals module layout to fetch pipelines for. Required by Zoho CRM API. Use get_module to retrieve layout IDs.',
            },
          },
          required: ['layout_id'],
        },
      },
      // ── Users ────────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List Zoho CRM users with optional filtering by user type and active status.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'User type filter: AllUsers, ActiveUsers, DeactiveUsers, ConfirmedUsers, AdminUsers, ActiveConfirmedAdmins.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Users per page, max 200 (default: 200).',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_records':        return await this.listRecords(args);
        case 'get_record':          return await this.getRecord(args);
        case 'create_record':       return await this.createRecord(args);
        case 'update_record':       return await this.updateRecord(args);
        case 'delete_record':       return await this.deleteRecord(args);
        case 'search_records':      return await this.searchRecords(args);
        case 'get_related_records': return await this.getRelatedRecords(args);
        case 'create_note':         return await this.createNote(args);
        case 'list_notes':          return await this.listNotes(args);
        case 'convert_lead':        return await this.convertLead(args);
        case 'list_modules':        return await this.listModules();
        case 'get_module':          return await this.getModule(args);
        case 'list_tags':           return await this.listTags(args);
        case 'create_tag':          return await this.createTag(args);
        case 'add_tags_to_record':  return await this.addTagsToRecord(args);
        case 'list_pipelines':      return await this.listPipelines(args);
        case 'list_users':          return await this.listUsers(args);
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

  // ── Private helpers ─────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      Authorization: `Zoho-oauthtoken ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Zoho CRM API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }

    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const module = args.module as string;
    if (!module) return { content: [{ type: 'text', text: 'module is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.fields) params.set('fields', args.fields as string);
    if (args.sort_by) params.set('sort_by', args.sort_by as string);
    if (args.sort_order) params.set('sort_order', args.sort_order as string);
    params.set('page', String((args.page as number) || 1));
    params.set('per_page', String((args.per_page as number) || 200));
    return this.request('GET', `/${encodeURIComponent(module)}?${params.toString()}`);
  }

  private async getRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const module = args.module as string;
    const recordId = args.record_id as string;
    if (!module || !recordId) {
      return { content: [{ type: 'text', text: 'module and record_id are required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.fields) params.set('fields', args.fields as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request('GET', `/${encodeURIComponent(module)}/${encodeURIComponent(recordId)}${qs}`);
  }

  private async createRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const module = args.module as string;
    const data = args.data as Record<string, unknown>;
    if (!module || !data) {
      return { content: [{ type: 'text', text: 'module and data are required' }], isError: true };
    }
    const body: Record<string, unknown> = { data: [data] };
    if (args.trigger) body.trigger = args.trigger;
    return this.request('POST', `/${encodeURIComponent(module)}`, body);
  }

  private async updateRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const module = args.module as string;
    const recordId = args.record_id as string;
    const data = args.data as Record<string, unknown>;
    if (!module || !recordId || !data) {
      return { content: [{ type: 'text', text: 'module, record_id, and data are required' }], isError: true };
    }
    const body = { data: [{ id: recordId, ...data }] };
    return this.request('PUT', `/${encodeURIComponent(module)}/${encodeURIComponent(recordId)}`, body);
  }

  private async deleteRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const module = args.module as string;
    const recordId = args.record_id as string;
    if (!module || !recordId) {
      return { content: [{ type: 'text', text: 'module and record_id are required' }], isError: true };
    }
    return this.request('DELETE', `/${encodeURIComponent(module)}/${encodeURIComponent(recordId)}`);
  }

  private async searchRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const module = args.module as string;
    if (!module) return { content: [{ type: 'text', text: 'module is required' }], isError: true };

    // COQL uses a separate endpoint
    if (args.coql) {
      return this.request('POST', '/coql', { select_query: args.coql });
    }

    const params = new URLSearchParams();
    if (args.criteria) params.set('criteria', args.criteria as string);
    if (args.email) params.set('email', args.email as string);
    if (args.phone) params.set('phone', args.phone as string);
    if (args.word) params.set('word', args.word as string);
    params.set('page', String((args.page as number) || 1));
    params.set('per_page', String((args.per_page as number) || 200));
    return this.request('GET', `/${encodeURIComponent(module)}/search?${params.toString()}`);
  }

  private async getRelatedRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const module = args.module as string;
    const recordId = args.record_id as string;
    const relatedList = args.related_list as string;
    if (!module || !recordId || !relatedList) {
      return { content: [{ type: 'text', text: 'module, record_id, and related_list are required' }], isError: true };
    }
    const params = new URLSearchParams();
    params.set('page', String((args.page as number) || 1));
    params.set('per_page', String((args.per_page as number) || 200));
    return this.request('GET', `/${encodeURIComponent(module)}/${encodeURIComponent(recordId)}/${encodeURIComponent(relatedList)}?${params.toString()}`);
  }

  private async createNote(args: Record<string, unknown>): Promise<ToolResult> {
    const parentModule = args.parent_module as string;
    const parentId = args.parent_id as string;
    const noteContent = args.note_content as string;
    if (!parentModule || !parentId || !noteContent) {
      return { content: [{ type: 'text', text: 'parent_module, parent_id, and note_content are required' }], isError: true };
    }
    const noteData: Record<string, unknown> = {
      Note_Content: noteContent,
      Parent_Id: { id: parentId },
      $se_module: parentModule,
    };
    if (args.note_title) noteData.Note_Title = args.note_title;
    return this.request('POST', '/Notes', { data: [noteData] });
  }

  private async listNotes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page', String((args.page as number) || 1));
    params.set('per_page', String((args.per_page as number) || 200));
    if (args.parent_module && args.parent_id) {
      return this.request('GET', `/${encodeURIComponent(args.parent_module as string)}/${encodeURIComponent(args.parent_id as string)}/Notes?${params.toString()}`);
    }
    return this.request('GET', `/Notes?${params.toString()}`);
  }

  private async convertLead(args: Record<string, unknown>): Promise<ToolResult> {
    const leadId = args.lead_id as string;
    if (!leadId) return { content: [{ type: 'text', text: 'lead_id is required' }], isError: true };

    const conversionData: Record<string, unknown> = {};
    if (args.overwrite !== undefined) conversionData.overwrite = args.overwrite;
    if (args.notify_lead_owner !== undefined) conversionData.notify_lead_owner = args.notify_lead_owner;
    if (args.notify_new_entity_owner !== undefined) conversionData.notify_new_entity_owner = args.notify_new_entity_owner;
    if (args.accounts) conversionData.Accounts = args.accounts;
    if (args.contacts) conversionData.Contacts = args.contacts;
    if (args.deals) conversionData.Deals = args.deals;

    return this.request('POST', `/Leads/${encodeURIComponent(leadId)}/actions/convert`, {
      data: [conversionData],
    });
  }

  private async listModules(): Promise<ToolResult> {
    return this.request('GET', '/settings/modules');
  }

  private async getModule(args: Record<string, unknown>): Promise<ToolResult> {
    const module = args.module as string;
    if (!module) return { content: [{ type: 'text', text: 'module is required' }], isError: true };
    return this.request('GET', `/settings/modules/${encodeURIComponent(module)}`);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const module = args.module as string;
    if (!module) return { content: [{ type: 'text', text: 'module is required' }], isError: true };
    const params = new URLSearchParams({ module });
    return this.request('GET', `/settings/tags?${params.toString()}`);
  }

  private async createTag(args: Record<string, unknown>): Promise<ToolResult> {
    const module = args.module as string;
    const name = args.name as string;
    if (!module || !name) {
      return { content: [{ type: 'text', text: 'module and name are required' }], isError: true };
    }
    // module is a required QUERY parameter per Zoho CRM API v8 docs
    const params = new URLSearchParams({ module });
    return this.request('POST', `/settings/tags?${params.toString()}`, {
      tags: [{ name }],
    });
  }

  private async addTagsToRecord(args: Record<string, unknown>): Promise<ToolResult> {
    const module = args.module as string;
    const recordId = args.record_id as string;
    const tagNames = args.tag_names as string[];
    if (!module || !recordId || !tagNames || !tagNames.length) {
      return { content: [{ type: 'text', text: 'module, record_id, and tag_names are required' }], isError: true };
    }
    // Tags are passed as a JSON body with a "tags" array per Zoho CRM API v8 docs
    const body = {
      tags: tagNames.map((name: string) => ({ name })),
    };
    return this.request('POST', `/${encodeURIComponent(module)}/${encodeURIComponent(recordId)}/actions/add_tags`, body);
  }

  private async listPipelines(args: Record<string, unknown>): Promise<ToolResult> {
    const layoutId = args.layout_id as string;
    if (!layoutId) {
      return { content: [{ type: 'text', text: 'layout_id is required' }], isError: true };
    }
    const params = new URLSearchParams({ layout_id: layoutId });
    return this.request('GET', `/settings/pipeline?${params.toString()}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('type', (args.type as string) || 'AllUsers');
    params.set('page', String((args.page as number) || 1));
    params.set('per_page', String((args.per_page as number) || 200));
    return this.request('GET', `/users?${params.toString()}`);
  }
}
