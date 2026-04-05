/**
 * Close CRM MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.close.com/mcp — transport: streamable-HTTP, auth: OAuth 2.0 (DCR).
//   Published by Close.com (official). Actively maintained. 57 tools (as of 2026-01-26).
//   Covers all read/write/destructive scopes: leads, contacts, opportunities, activities,
//   templates, smart views, pipelines, aggregations, scheduling links, and more.
//   Also: github.com/ShiftEngineering/mcp-close-server — community adapter (stdio, API key, 3 tools).
//   Community adapter is NOT official — only 3 tools, small repo (3 stars). Not a substitute.
// Our adapter covers: 19 tools (API-key-based CRUD for leads, contacts, opportunities, activities, tasks).
// Recommendation: use-both
//   MCP (mcp.close.com) adds: activity_search, aggregation, close_product_knowledge_search,
//     fetch_sms_template, find_email_templates, find_lead_smart_views, find_lead_statuses,
//     find_opportunities, find_pipelines_and_opportunity_statuses, find_scheduling_links,
//     fetch_contact, fetch_email_template, fetch_lead, fetch_lead_smart_view, fetch_lead_status,
//     fetch_opportunity, fetch_opportunity_status, fetch_pipeline_and_opportunity_statuses,
//     and 38+ additional read/write/destructive tools not available via REST adapter.
//   REST adapter adds: API-key-based access without OAuth browser flow, air-gapped deployments,
//     scripted/CI integrations. Our tools: search_leads, get_lead, create_lead, update_lead,
//     delete_lead, list_contacts, get_contact, create_contact, update_contact, delete_contact,
//     list_opportunities, get_opportunity, create_opportunity, update_opportunity, delete_opportunity,
//     list_activities, list_tasks, create_task, update_task.
//
// Integration: use-both
// MCP-sourced tools (57): all tools from mcp.close.com (OAuth required)
// REST-sourced tools (19): search_leads, get_lead, create_lead, update_lead, delete_lead,
//   list_contacts, get_contact, create_contact, update_contact, delete_contact,
//   list_opportunities, get_opportunity, create_opportunity, update_opportunity, delete_opportunity,
//   list_activities, list_tasks, create_task, update_task
// Combined coverage: use MCP for full 57-tool coverage; use REST for API-key/air-gapped scenarios.
//
// Base URL: https://api.close.com/api/v1
// Auth: HTTP Basic — API key as username, empty string as password.
//   Header: Authorization: Basic base64(api_key:)
//   Source: https://developer.close.com/topics/authentication/
// Docs: https://developer.close.com/
// Rate limits: Per-endpoint-group limits at organization level. Not fully publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CloseCRMConfig {
  apiKey: string;
  /**
   * Base URL for the Close API.
   * Defaults to https://api.close.com/api/v1
   */
  baseUrl?: string;
}

export class CloseCRMMCPServer extends MCPAdapterBase {
  private readonly basicToken: string;
  private readonly baseUrl: string;

  constructor(config: CloseCRMConfig) {
    super();
    // Close uses HTTP Basic auth: API key as username, empty string as password.
    this.basicToken = Buffer.from(`${config.apiKey}:`).toString('base64');
    this.baseUrl = (config.baseUrl || 'https://api.close.com/api/v1').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'close-crm',
      displayName: 'Close CRM',
      version: '1.0.0',
      category: 'crm' as const,
      keywords: ['close', 'crm', 'lead', 'contact', 'opportunity', 'deal', 'sales', 'pipeline', 'activity', 'call', 'email', 'task'],
      toolNames: [
        'search_leads', 'get_lead', 'create_lead', 'update_lead', 'delete_lead',
        'list_contacts', 'get_contact', 'create_contact', 'update_contact', 'delete_contact',
        'list_opportunities', 'get_opportunity', 'create_opportunity', 'update_opportunity', 'delete_opportunity',
        'list_activities', 'list_tasks', 'create_task', 'update_task',
      ],
      description: 'Manage Close CRM leads, contacts, opportunities, activities, and tasks. Full CRUD operations via the REST API.',
      author: 'protectnil' as const,
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Basic ${this.basicToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchJSON(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...options });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Close returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private buildQS(args: Record<string, unknown>, keys: string[]): string {
    const parts: string[] = [];
    for (const key of keys) {
      if (args[key] !== undefined && args[key] !== null) {
        parts.push(`${key}=${encodeURIComponent(String(args[key]))}`);
      }
    }
    return parts.length > 0 ? `?${parts.join('&')}` : '';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_leads',
        description: 'Search and list leads (companies/accounts) in Close CRM with optional text query, pagination, and field selection.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string to filter leads by name or other text fields.' },
            _limit: { type: 'number', description: 'Maximum number of leads to return (default: 100, max: 1000 per request).' },
            _skip: { type: 'number', description: 'Number of leads to skip for pagination.' },
            _fields: { type: 'string', description: 'Comma-separated list of fields to include in the response.' },
          },
        },
      },
      {
        name: 'get_lead',
        description: 'Retrieve a single lead (company/account) by its Close CRM lead ID with all fields.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: { type: 'string', description: 'Close CRM lead ID (e.g. lead_abc123).' },
          },
          required: ['lead_id'],
        },
      },
      {
        name: 'create_lead',
        description: 'Create a new lead (company/account) in Close CRM with optional contacts, addresses, and custom fields.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Lead (company) name.' },
            url: { type: 'string', description: 'Company website URL.' },
            description: { type: 'string', description: 'Lead description or notes.' },
            status_id: { type: 'string', description: 'Lead status ID.' },
            contacts: {
              type: 'array',
              description: 'Contacts to create and associate with this lead.',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  title: { type: 'string' },
                  emails: { type: 'array', items: { type: 'object' } },
                  phones: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_lead',
        description: 'Update fields on an existing Close CRM lead — name, description, status, URL, or custom fields.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: { type: 'string', description: 'Close CRM lead ID to update.' },
            name: { type: 'string', description: 'New lead name (optional).' },
            url: { type: 'string', description: 'New company website URL (optional).' },
            description: { type: 'string', description: 'New lead description (optional).' },
            status_id: { type: 'string', description: 'New lead status ID (optional).' },
          },
          required: ['lead_id'],
        },
      },
      {
        name: 'delete_lead',
        description: 'Permanently delete a lead and all associated data from Close CRM. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: { type: 'string', description: 'Close CRM lead ID to delete.' },
          },
          required: ['lead_id'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts in Close CRM with optional filter by lead ID and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: { type: 'string', description: 'Filter contacts by lead ID.' },
            _limit: { type: 'number', description: 'Maximum number of contacts to return (default: 100).' },
            _skip: { type: 'number', description: 'Number of contacts to skip for pagination.' },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve a single contact record from Close CRM by contact ID.',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'Close CRM contact ID.' },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in Close CRM. Contacts belong to a lead — if lead_id is omitted a new lead is auto-created.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Contact full name.' },
            lead_id: { type: 'string', description: 'Lead ID to associate the contact with (optional, creates new lead if omitted).' },
            title: { type: 'string', description: 'Contact job title (optional).' },
            emails: { type: 'array', description: 'Array of email objects: [{email: "...", type: "work"}].', items: { type: 'object' } },
            phones: { type: 'array', description: 'Array of phone objects: [{phone: "...", type: "work"}].', items: { type: 'object' } },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update fields on an existing Close CRM contact — name, title, email addresses, or phone numbers.',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'Close CRM contact ID to update.' },
            name: { type: 'string', description: 'New contact name (optional).' },
            title: { type: 'string', description: 'New contact title (optional).' },
            emails: { type: 'array', description: 'New array of email objects (optional).', items: { type: 'object' } },
            phones: { type: 'array', description: 'New array of phone objects (optional).', items: { type: 'object' } },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Permanently delete a contact from Close CRM by contact ID.',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'Close CRM contact ID to delete.' },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'list_opportunities',
        description: 'List opportunities (deals) in Close CRM with optional filters for lead, user, status type, and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: { type: 'string', description: 'Filter opportunities by lead ID.' },
            user_id: { type: 'string', description: 'Filter opportunities by owner user ID.' },
            status_type: { type: 'string', description: 'Filter by status type: "active", "won", or "lost".' },
            date_created__gt: { type: 'string', description: 'Filter opportunities created after this ISO-8601 date.' },
            date_created__lt: { type: 'string', description: 'Filter opportunities created before this ISO-8601 date.' },
            date_won__gt: { type: 'string', description: 'Filter by won date after this ISO-8601 date.' },
            date_won__lt: { type: 'string', description: 'Filter by won date before this ISO-8601 date.' },
            _limit: { type: 'number', description: 'Maximum number of results to return.' },
            _skip: { type: 'number', description: 'Number of results to skip for pagination.' },
          },
        },
      },
      {
        name: 'get_opportunity',
        description: 'Retrieve a single opportunity (deal) from Close CRM by opportunity ID.',
        inputSchema: {
          type: 'object',
          properties: {
            opportunity_id: { type: 'string', description: 'Close CRM opportunity ID.' },
          },
          required: ['opportunity_id'],
        },
      },
      {
        name: 'create_opportunity',
        description: 'Create a new opportunity (deal) in Close CRM for a given lead with value, confidence, and close date.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: { type: 'string', description: 'Lead ID to associate the opportunity with.' },
            note: { type: 'string', description: 'Notes about the opportunity.' },
            confidence: { type: 'number', description: 'Win probability as a percentage (0–100).' },
            value: { type: 'number', description: 'Opportunity value in the base currency unit (e.g. cents for USD).' },
            value_period: { type: 'string', description: 'Revenue period: "one_time", "monthly", "annual".' },
            status_id: { type: 'string', description: 'Opportunity status ID (uses org default active status if omitted).' },
            close_date: { type: 'string', description: 'Expected close date in YYYY-MM-DD format.' },
            user_id: { type: 'string', description: 'Owner user ID (defaults to the authenticated user).' },
          },
          required: ['lead_id'],
        },
      },
      {
        name: 'update_opportunity',
        description: 'Update fields on an existing Close CRM opportunity — note, confidence, value, status, or close date.',
        inputSchema: {
          type: 'object',
          properties: {
            opportunity_id: { type: 'string', description: 'Close CRM opportunity ID to update.' },
            note: { type: 'string', description: 'New notes about the opportunity (optional).' },
            confidence: { type: 'number', description: 'New win probability percentage 0–100 (optional).' },
            value: { type: 'number', description: 'New opportunity value in base currency unit (optional).' },
            status_id: { type: 'string', description: 'New opportunity status ID (optional).' },
            close_date: { type: 'string', description: 'New expected close date YYYY-MM-DD (optional).' },
          },
          required: ['opportunity_id'],
        },
      },
      {
        name: 'delete_opportunity',
        description: 'Permanently delete an opportunity from Close CRM by opportunity ID.',
        inputSchema: {
          type: 'object',
          properties: {
            opportunity_id: { type: 'string', description: 'Close CRM opportunity ID to delete.' },
          },
          required: ['opportunity_id'],
        },
      },
      {
        name: 'list_activities',
        description: 'List activity log entries in Close CRM — calls, emails, SMS, notes, and meetings. Filter by lead, user, type, or date range.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: { type: 'string', description: 'Filter activities by lead ID.' },
            user_id: { type: 'string', description: 'Filter activities by user ID.' },
            _type: { type: 'string', description: 'Activity type to filter by: "Call", "Email", "Note", "Meeting", "SMS".' },
            date_created__gt: { type: 'string', description: 'Filter activities created after this ISO-8601 datetime.' },
            date_created__lt: { type: 'string', description: 'Filter activities created before this ISO-8601 datetime.' },
            activity_at__gt: { type: 'string', description: 'Filter by activity timestamp after this ISO-8601 datetime.' },
            activity_at__lt: { type: 'string', description: 'Filter by activity timestamp before this ISO-8601 datetime.' },
            _limit: { type: 'number', description: 'Maximum number of results to return.' },
            _skip: { type: 'number', description: 'Number of results to skip for pagination.' },
            _order_by: { type: 'string', description: 'Field to sort by, prefix with "-" for descending (e.g. "-date_created").' },
          },
        },
      },
      {
        name: 'list_tasks',
        description: 'List tasks in Close CRM with optional filters for lead, assignee, completion status, and due date range.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: { type: 'string', description: 'Filter tasks by lead ID.' },
            assigned_to: { type: 'string', description: 'Filter tasks by assigned user ID.' },
            is_complete: { type: 'boolean', description: 'Filter by completion status: true = complete, false = incomplete.' },
            due_date__gte: { type: 'string', description: 'Filter tasks due on or after this date (YYYY-MM-DD).' },
            due_date__lte: { type: 'string', description: 'Filter tasks due on or before this date (YYYY-MM-DD).' },
            _limit: { type: 'number', description: 'Maximum number of results to return.' },
            _skip: { type: 'number', description: 'Number of results to skip for pagination.' },
          },
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in Close CRM for a lead with assigned user, due date, and text description.',
        inputSchema: {
          type: 'object',
          properties: {
            lead_id: { type: 'string', description: 'Lead ID to associate the task with.' },
            text: { type: 'string', description: 'Task description text.' },
            assigned_to: { type: 'string', description: 'User ID to assign the task to (optional, defaults to authenticated user).' },
            date: { type: 'string', description: 'Due date in YYYY-MM-DD format (optional).' },
            is_complete: { type: 'boolean', description: 'Whether the task is already complete (default: false).' },
          },
          required: ['lead_id', 'text'],
        },
      },
      {
        name: 'update_task',
        description: 'Update an existing task in Close CRM — text, due date, assigned user, or completion status.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Close CRM task ID to update.' },
            text: { type: 'string', description: 'New task description text (optional).' },
            assigned_to: { type: 'string', description: 'New assigned user ID (optional).' },
            date: { type: 'string', description: 'New due date in YYYY-MM-DD format (optional).' },
            is_complete: { type: 'boolean', description: 'Mark task as complete or incomplete (optional).' },
          },
          required: ['task_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_leads':
          return this.searchLeads(args);
        case 'get_lead':
          return this.getLead(args);
        case 'create_lead':
          return this.createLead(args);
        case 'update_lead':
          return this.updateLead(args);
        case 'delete_lead':
          return this.deleteLead(args);
        case 'list_contacts':
          return this.listContacts(args);
        case 'get_contact':
          return this.getContact(args);
        case 'create_contact':
          return this.createContact(args);
        case 'update_contact':
          return this.updateContact(args);
        case 'delete_contact':
          return this.deleteContact(args);
        case 'list_opportunities':
          return this.listOpportunities(args);
        case 'get_opportunity':
          return this.getOpportunity(args);
        case 'create_opportunity':
          return this.createOpportunity(args);
        case 'update_opportunity':
          return this.updateOpportunity(args);
        case 'delete_opportunity':
          return this.deleteOpportunity(args);
        case 'list_activities':
          return this.listActivities(args);
        case 'list_tasks':
          return this.listTasks(args);
        case 'create_task':
          return this.createTask(args);
        case 'update_task':
          return this.updateTask(args);
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

  private async searchLeads(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQS(args, ['query', '_limit', '_skip', '_fields']);
    return this.fetchJSON(`${this.baseUrl}/lead/${qs}`);
  }

  private async getLead(args: Record<string, unknown>): Promise<ToolResult> {
    const leadId = args.lead_id as string;
    if (!leadId) return { content: [{ type: 'text', text: 'lead_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/lead/${encodeURIComponent(leadId)}/`);
  }

  private async createLead(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };

    const body: Record<string, unknown> = { name: args.name };
    if (args.url) body.url = args.url;
    if (args.description) body.description = args.description;
    if (args.contacts) body.contacts = args.contacts;
    if (args.status_id) body.status_id = args.status_id;

    return this.fetchJSON(`${this.baseUrl}/lead/`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateLead(args: Record<string, unknown>): Promise<ToolResult> {
    const leadId = args.lead_id as string;
    if (!leadId) return { content: [{ type: 'text', text: 'lead_id is required' }], isError: true };

    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.url !== undefined) body.url = args.url;
    if (args.description !== undefined) body.description = args.description;
    if (args.status_id) body.status_id = args.status_id;

    return this.fetchJSON(`${this.baseUrl}/lead/${encodeURIComponent(leadId)}/`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async deleteLead(args: Record<string, unknown>): Promise<ToolResult> {
    const leadId = args.lead_id as string;
    if (!leadId) return { content: [{ type: 'text', text: 'lead_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/lead/${encodeURIComponent(leadId)}/`, { method: 'DELETE' });
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQS(args, ['lead_id', '_limit', '_skip']);
    return this.fetchJSON(`${this.baseUrl}/contact/${qs}`);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    const contactId = args.contact_id as string;
    if (!contactId) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/contact/${encodeURIComponent(contactId)}/`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };

    const body: Record<string, unknown> = { name: args.name };
    if (args.lead_id) body.lead_id = args.lead_id;
    if (args.title) body.title = args.title;
    if (args.emails) body.emails = args.emails;
    if (args.phones) body.phones = args.phones;

    return this.fetchJSON(`${this.baseUrl}/contact/`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    const contactId = args.contact_id as string;
    if (!contactId) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };

    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.title !== undefined) body.title = args.title;
    if (args.emails) body.emails = args.emails;
    if (args.phones) body.phones = args.phones;

    return this.fetchJSON(`${this.baseUrl}/contact/${encodeURIComponent(contactId)}/`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async deleteContact(args: Record<string, unknown>): Promise<ToolResult> {
    const contactId = args.contact_id as string;
    if (!contactId) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/contact/${encodeURIComponent(contactId)}/`, { method: 'DELETE' });
  }

  private async listOpportunities(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQS(args, [
      'lead_id', 'user_id', 'status_type',
      'date_created__gt', 'date_created__lt',
      'date_won__gt', 'date_won__lt',
      '_limit', '_skip',
    ]);
    return this.fetchJSON(`${this.baseUrl}/opportunity/${qs}`);
  }

  private async getOpportunity(args: Record<string, unknown>): Promise<ToolResult> {
    const opportunityId = args.opportunity_id as string;
    if (!opportunityId) return { content: [{ type: 'text', text: 'opportunity_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/opportunity/${encodeURIComponent(opportunityId)}/`);
  }

  private async createOpportunity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.lead_id) return { content: [{ type: 'text', text: 'lead_id is required' }], isError: true };

    const body: Record<string, unknown> = { lead_id: args.lead_id };
    if (args.note) body.note = args.note;
    if (typeof args.confidence === 'number') body.confidence = args.confidence;
    if (typeof args.value === 'number') body.value = args.value;
    if (args.value_period) body.value_period = args.value_period;
    if (args.status_id) body.status_id = args.status_id;
    if (args.close_date) body.close_date = args.close_date;
    if (args.user_id) body.user_id = args.user_id;

    return this.fetchJSON(`${this.baseUrl}/opportunity/`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateOpportunity(args: Record<string, unknown>): Promise<ToolResult> {
    const opportunityId = args.opportunity_id as string;
    if (!opportunityId) return { content: [{ type: 'text', text: 'opportunity_id is required' }], isError: true };

    const body: Record<string, unknown> = {};
    if (args.note !== undefined) body.note = args.note;
    if (typeof args.confidence === 'number') body.confidence = args.confidence;
    if (typeof args.value === 'number') body.value = args.value;
    if (args.status_id) body.status_id = args.status_id;
    if (args.close_date) body.close_date = args.close_date;

    return this.fetchJSON(`${this.baseUrl}/opportunity/${encodeURIComponent(opportunityId)}/`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async deleteOpportunity(args: Record<string, unknown>): Promise<ToolResult> {
    const opportunityId = args.opportunity_id as string;
    if (!opportunityId) return { content: [{ type: 'text', text: 'opportunity_id is required' }], isError: true };
    return this.fetchJSON(`${this.baseUrl}/opportunity/${encodeURIComponent(opportunityId)}/`, { method: 'DELETE' });
  }

  private async listActivities(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQS(args, [
      'lead_id', 'user_id', '_type',
      'date_created__gt', 'date_created__lt',
      'activity_at__gt', 'activity_at__lt',
      '_limit', '_skip', '_order_by',
    ]);
    return this.fetchJSON(`${this.baseUrl}/activity/${qs}`);
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQS(args, [
      'lead_id', 'assigned_to', 'is_complete',
      'due_date__gte', 'due_date__lte',
      '_limit', '_skip',
    ]);
    return this.fetchJSON(`${this.baseUrl}/task/${qs}`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    const leadId = args.lead_id as string;
    const text = args.text as string;
    if (!leadId || !text) return { content: [{ type: 'text', text: 'lead_id and text are required' }], isError: true };

    const body: Record<string, unknown> = { lead_id: leadId, text };
    if (args.assigned_to) body.assigned_to = args.assigned_to;
    if (args.date) body.date = args.date;
    if (args.is_complete !== undefined) body.is_complete = args.is_complete;

    return this.fetchJSON(`${this.baseUrl}/task/`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateTask(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.task_id as string;
    if (!taskId) return { content: [{ type: 'text', text: 'task_id is required' }], isError: true };

    const body: Record<string, unknown> = {};
    if (args.text !== undefined) body.text = args.text;
    if (args.assigned_to !== undefined) body.assigned_to = args.assigned_to;
    if (args.date !== undefined) body.date = args.date;
    if (args.is_complete !== undefined) body.is_complete = args.is_complete;

    return this.fetchJSON(`${this.baseUrl}/task/${encodeURIComponent(taskId)}/`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
}
