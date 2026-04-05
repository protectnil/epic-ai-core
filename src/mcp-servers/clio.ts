/**
 * Clio MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
//   No official Clio Inc.-published MCP server exists. The Pipedream Connect static endpoint
//   (mcp.pipedream.net/v2) exposes Clio via a third-party proxy — it is NOT published by
//   Clio Inc. and does not qualify as an official vendor MCP. Community project
//   github.com/protomated/legal-context-ce (npm @protomated/legal-context, last published
//   2025-08) bridges Clio documents to Claude Desktop but is unmaintained and not general-purpose.
//
// Our adapter covers: 23 tools. Vendor MCP: None.
// Recommendation: use-rest-api — no qualifying official MCP exists.
//
// Base URL: https://app.clio.com/api/v4 (US/default)
//   Regional variants: eu.app.clio.com, ca.app.clio.com, au.app.clio.com
// Auth: OAuth2 Authorization Code flow — pass the resulting access_token as Bearer token.
// Docs: https://docs.developers.clio.com/clio-manage/api-reference/
// Rate limits: 50 requests per minute (default, peak hours) per access token. Returns HTTP 429
//   with Retry-After header. Off-peak limits are higher. See:
//   https://docs.developers.clio.com/api-docs/clio-manage/rate-limits/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

const CLIO_REGIONAL_BASES: Record<string, string> = {
  us: 'https://app.clio.com',
  eu: 'https://eu.app.clio.com',
  ca: 'https://ca.app.clio.com',
  au: 'https://au.app.clio.com',
};

interface ClioConfig {
  accessToken: string;
  /**
   * Data region: 'us' (default), 'eu', 'ca', or 'au'.
   * Supply baseUrl to override completely (e.g. sandbox environments).
   */
  region?: string;
  baseUrl?: string;
}

export class ClioMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ClioConfig) {
    super();
    this.accessToken = config.accessToken;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    } else {
      const region = config.region || 'us';
      const regionalBase = CLIO_REGIONAL_BASES[region];
      if (!regionalBase) {
        throw new Error(`Unknown Clio region "${region}". Valid values: us, eu, ca, au`);
      }
      this.baseUrl = `${regionalBase}/api/v4`;
    }
  }

  static catalog() {
    return {
      name: 'clio',
      displayName: 'Clio',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: ['clio', 'legal', 'law', 'matter', 'case', 'client', 'billing', 'invoice', 'time-tracking', 'document', 'task', 'contact', 'calendar'],
      toolNames: [
        'get_current_user',
        'list_matters', 'get_matter', 'create_matter', 'update_matter',
        'list_contacts', 'get_contact', 'create_contact', 'update_contact',
        'list_activities', 'create_activity', 'update_activity',
        'list_documents', 'get_document',
        'list_tasks', 'create_task', 'update_task',
        'list_bills', 'get_bill',
        'list_calendar_entries', 'create_calendar_entry',
        'list_notes', 'create_note',
      ],
      description: 'Manage Clio legal practice management: matters, contacts, time entries, billing, documents, tasks, calendar, and notes via the v4 REST API.',
      author: 'protectnil' as const,
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchJSON(url: string, options: RequestInit = {}): Promise<ToolResult> {
    // Clio API requires .json suffix on all endpoints
    const [pathPart, queryPart] = url.split('?');
    const normalizedUrl = pathPart.endsWith('.json') ? url : `${pathPart}.json${queryPart ? `?${queryPart}` : ''}`;
    const response = await this.fetchWithRetry(normalizedUrl, { headers: this.headers, ...options });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Clio returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private buildParams(args: Record<string, unknown>, keys: string[]): URLSearchParams {
    const params = new URLSearchParams();
    for (const key of keys) {
      if (args[key] !== undefined && args[key] !== null) {
        params.set(key, String(args[key]));
      }
    }
    return params;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_current_user',
        description: 'Retrieve the authenticated Clio user account details and firm information.',
        inputSchema: {
          type: 'object',
          properties: {
            fields: { type: 'string', description: 'Comma-separated list of fields to include in the response (optional).' },
          },
        },
      },
      {
        name: 'list_matters',
        description: 'List legal matters with optional filters for status, client, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: open, pending, closed, cancelled.' },
            client_id: { type: 'number', description: 'Filter matters by client contact ID.' },
            limit: { type: 'number', description: 'Maximum matters to return (max: 200, default: 25).' },
            page_token: { type: 'string', description: 'Pagination token from a previous response.' },
            fields: { type: 'string', description: 'Comma-separated list of fields to include.' },
          },
        },
      },
      {
        name: 'get_matter',
        description: 'Retrieve a specific legal matter by its Clio matter ID.',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: { type: 'number', description: 'The Clio matter ID.' },
            fields: { type: 'string', description: 'Comma-separated list of fields to include.' },
          },
          required: ['matter_id'],
        },
      },
      {
        name: 'create_matter',
        description: 'Create a new legal matter in Clio with client, description, status, and billing preferences.',
        inputSchema: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Matter description or case name.' },
            client_id: { type: 'number', description: 'Contact ID for the client associated with this matter.' },
            status: { type: 'string', description: 'Initial status: open, pending, closed, cancelled (default: open).' },
            practice_area_id: { type: 'number', description: 'Practice area ID (optional).' },
            responsible_attorney_id: { type: 'number', description: 'User ID of the responsible attorney (optional).' },
          },
          required: ['description'],
        },
      },
      {
        name: 'update_matter',
        description: 'Update fields on an existing Clio matter — description, status, client, or responsible attorney.',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: { type: 'number', description: 'The Clio matter ID to update.' },
            description: { type: 'string', description: 'New matter description (optional).' },
            status: { type: 'string', description: 'New status: open, pending, closed, cancelled (optional).' },
            responsible_attorney_id: { type: 'number', description: 'New responsible attorney user ID (optional).' },
          },
          required: ['matter_id'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts (clients and other parties) with optional filters for type, name search, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Filter by contact type: Person or Company.' },
            query: { type: 'string', description: 'Search query to filter contacts by name.' },
            limit: { type: 'number', description: 'Maximum contacts to return (max: 200, default: 25).' },
            page_token: { type: 'string', description: 'Pagination token from a previous response.' },
            fields: { type: 'string', description: 'Comma-separated list of fields to include.' },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve a specific Clio contact by their ID including email, phone, and address.',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'number', description: 'The Clio contact ID.' },
            fields: { type: 'string', description: 'Comma-separated list of fields to include.' },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact (Person or Company) in Clio with name, email, phone, and address.',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: { type: 'string', description: 'First name (for Person contacts).' },
            last_name: { type: 'string', description: 'Last name (for Person contacts).' },
            name: { type: 'string', description: 'Company name (for Company contacts).' },
            type: { type: 'string', description: 'Contact type: Person or Company.' },
            email_addresses: { type: 'array', description: 'Array of email address objects: [{name: "Work", address: "..."}].', items: { type: 'object' } },
            phone_numbers: { type: 'array', description: 'Array of phone number objects: [{name: "Work", number: "..."}].', items: { type: 'object' } },
          },
        },
      },
      {
        name: 'update_contact',
        description: 'Update fields on an existing Clio contact — name, email addresses, phone numbers.',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'number', description: 'The Clio contact ID to update.' },
            first_name: { type: 'string', description: 'New first name (optional).' },
            last_name: { type: 'string', description: 'New last name (optional).' },
            email_addresses: { type: 'array', description: 'Updated array of email address objects (optional).', items: { type: 'object' } },
            phone_numbers: { type: 'array', description: 'Updated array of phone number objects (optional).', items: { type: 'object' } },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'list_activities',
        description: 'List time entries and activities logged in Clio with optional filters for matter, user, and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: { type: 'number', description: 'Filter by matter ID.' },
            user_id: { type: 'number', description: 'Filter by user ID.' },
            start_date: { type: 'string', description: 'Return activities on or after this date (YYYY-MM-DD).' },
            end_date: { type: 'string', description: 'Return activities on or before this date (YYYY-MM-DD).' },
            limit: { type: 'number', description: 'Maximum activities to return (max: 200, default: 25).' },
            page_token: { type: 'string', description: 'Pagination token from a previous response.' },
            fields: { type: 'string', description: 'Comma-separated list of fields to include.' },
          },
        },
      },
      {
        name: 'create_activity',
        description: 'Log a new time entry or activity against a matter with quantity, note, and billing code.',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: { type: 'number', description: 'The matter ID to log the activity against.' },
            quantity: { type: 'number', description: 'Time in seconds for time entries, or quantity for flat-fee activities.' },
            note: { type: 'string', description: 'Description of the activity.' },
            date: { type: 'string', description: 'Date the activity occurred (YYYY-MM-DD, defaults to today).' },
            activity_description_id: { type: 'number', description: 'ID of the activity description/billing code to apply (optional).' },
          },
          required: ['matter_id', 'quantity'],
        },
      },
      {
        name: 'update_activity',
        description: 'Update an existing time entry or activity — quantity, note, date, or billing code.',
        inputSchema: {
          type: 'object',
          properties: {
            activity_id: { type: 'number', description: 'The Clio activity ID to update.' },
            quantity: { type: 'number', description: 'New time in seconds or quantity (optional).' },
            note: { type: 'string', description: 'New activity description (optional).' },
            date: { type: 'string', description: 'New activity date (YYYY-MM-DD, optional).' },
          },
          required: ['activity_id'],
        },
      },
      {
        name: 'list_documents',
        description: 'List documents stored in Clio optionally scoped to a matter with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: { type: 'number', description: 'Filter documents by matter ID.' },
            limit: { type: 'number', description: 'Maximum documents to return (max: 200, default: 25).' },
            page_token: { type: 'string', description: 'Pagination token from a previous response.' },
            fields: { type: 'string', description: 'Comma-separated list of fields to include.' },
          },
        },
      },
      {
        name: 'get_document',
        description: 'Retrieve metadata for a specific Clio document by its ID (does not download file content).',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'number', description: 'The Clio document ID.' },
            fields: { type: 'string', description: 'Comma-separated list of fields to include.' },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List tasks assigned in Clio with optional filters for matter, assignee, and completion status.',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: { type: 'number', description: 'Filter tasks by matter ID.' },
            assignee_id: { type: 'number', description: 'Filter tasks by assignee user ID.' },
            status: { type: 'string', description: 'Filter by status: complete or incomplete.' },
            limit: { type: 'number', description: 'Maximum tasks to return (max: 200, default: 25).' },
            page_token: { type: 'string', description: 'Pagination token from a previous response.' },
            fields: { type: 'string', description: 'Comma-separated list of fields to include.' },
          },
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task in Clio with name, matter, assignee, due date, and priority.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Task name.' },
            matter_id: { type: 'number', description: 'Matter ID to associate the task with (optional).' },
            assignee_id: { type: 'number', description: 'User ID to assign the task to (optional).' },
            due_at: { type: 'string', description: 'Due date in ISO 8601 format (optional).' },
            priority: { type: 'string', description: 'Task priority: High, Normal, Low (default: Normal).' },
            description: { type: 'string', description: 'Task description (optional).' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_task',
        description: 'Update an existing Clio task — name, status, due date, assignee, or description.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'number', description: 'The Clio task ID to update.' },
            name: { type: 'string', description: 'New task name (optional).' },
            status: { type: 'string', description: 'New status: complete or incomplete (optional).' },
            due_at: { type: 'string', description: 'New due date in ISO 8601 format (optional).' },
            description: { type: 'string', description: 'New task description (optional).' },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'list_bills',
        description: 'List billing invoices in Clio with optional filters for matter, client, status, and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: { type: 'number', description: 'Filter bills by matter ID.' },
            client_id: { type: 'number', description: 'Filter bills by client contact ID.' },
            status: { type: 'string', description: 'Filter by bill status: draft, awaiting_approval, awaiting_payment, paid, void.' },
            start_date: { type: 'string', description: 'Return bills issued on or after this date (YYYY-MM-DD).' },
            end_date: { type: 'string', description: 'Return bills issued on or before this date (YYYY-MM-DD).' },
            limit: { type: 'number', description: 'Maximum bills to return (max: 200, default: 25).' },
            page_token: { type: 'string', description: 'Pagination token from a previous response.' },
          },
        },
      },
      {
        name: 'get_bill',
        description: 'Retrieve a specific Clio invoice/bill by its ID including line items and totals.',
        inputSchema: {
          type: 'object',
          properties: {
            bill_id: { type: 'number', description: 'The Clio bill (invoice) ID.' },
            fields: { type: 'string', description: 'Comma-separated list of fields to include.' },
          },
          required: ['bill_id'],
        },
      },
      {
        name: 'list_calendar_entries',
        description: 'List calendar events in Clio with optional filters for matter, attendee, and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: { type: 'number', description: 'Filter calendar entries by matter ID.' },
            attendee_id: { type: 'number', description: 'Filter by attendee user ID.' },
            start_at: { type: 'string', description: 'Return events starting on or after this ISO 8601 datetime.' },
            end_at: { type: 'string', description: 'Return events starting on or before this ISO 8601 datetime.' },
            limit: { type: 'number', description: 'Maximum entries to return (max: 200, default: 25).' },
            page_token: { type: 'string', description: 'Pagination token from a previous response.' },
          },
        },
      },
      {
        name: 'create_calendar_entry',
        description: 'Create a new calendar event in Clio with summary, start/end time, calendar owner, and optional matter.',
        inputSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Event title or summary.' },
            start_at: { type: 'string', description: 'Event start time in ISO 8601 format.' },
            end_at: { type: 'string', description: 'Event end time in ISO 8601 format.' },
            calendar_owner_id: { type: 'number', description: 'Calendar ID of the owner (from GET /api/v4/calendars). Required — use the Calendar ID, NOT the User ID.' },
            calendar_owner_type: { type: 'string', description: 'Calendar owner type: User or Contact (default: User).' },
            matter_id: { type: 'number', description: 'Matter ID to associate the event with (optional — link via PATCH after creation if initial POST returns 404).' },
            location: { type: 'string', description: 'Event location (optional).' },
            description: { type: 'string', description: 'Event description or notes (optional).' },
            all_day: { type: 'boolean', description: 'Whether this is an all-day event (default: false).' },
          },
          required: ['summary', 'start_at', 'end_at', 'calendar_owner_id'],
        },
      },
      {
        name: 'list_notes',
        description: 'List notes in Clio with optional filters for matter, contact, and type (Matter or Contact notes).',
        inputSchema: {
          type: 'object',
          properties: {
            matter_id: { type: 'number', description: 'Filter notes by matter ID.' },
            contact_id: { type: 'number', description: 'Filter notes by contact ID.' },
            type: { type: 'string', description: 'Note type: matter or contact (required when filtering by ID).' },
            limit: { type: 'number', description: 'Maximum notes to return (max: 200, default: 25).' },
            page_token: { type: 'string', description: 'Pagination token from a previous response.' },
          },
        },
      },
      {
        name: 'create_note',
        description: 'Create a new note attached to a matter or contact in Clio.',
        inputSchema: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Note subject or title.' },
            detail: { type: 'string', description: 'Note body content.' },
            matter_id: { type: 'number', description: 'Matter ID to attach the note to (use matter_id or contact_id, not both).' },
            contact_id: { type: 'number', description: 'Contact ID to attach the note to (use matter_id or contact_id, not both).' },
          },
          required: ['subject'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_current_user':
          return this.getCurrentUser(args);
        case 'list_matters':
          return this.listMatters(args);
        case 'get_matter':
          return this.getMatter(args);
        case 'create_matter':
          return this.createMatter(args);
        case 'update_matter':
          return this.updateMatter(args);
        case 'list_contacts':
          return this.listContacts(args);
        case 'get_contact':
          return this.getContact(args);
        case 'create_contact':
          return this.createContact(args);
        case 'update_contact':
          return this.updateContact(args);
        case 'list_activities':
          return this.listActivities(args);
        case 'create_activity':
          return this.createActivity(args);
        case 'update_activity':
          return this.updateActivity(args);
        case 'list_documents':
          return this.listDocuments(args);
        case 'get_document':
          return this.getDocument(args);
        case 'list_tasks':
          return this.listTasks(args);
        case 'create_task':
          return this.createTask(args);
        case 'update_task':
          return this.updateTask(args);
        case 'list_bills':
          return this.listBills(args);
        case 'get_bill':
          return this.getBill(args);
        case 'list_calendar_entries':
          return this.listCalendarEntries(args);
        case 'create_calendar_entry':
          return this.createCalendarEntry(args);
        case 'list_notes':
          return this.listNotes(args);
        case 'create_note':
          return this.createNote(args);
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

  private async getCurrentUser(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}/users/who_am_i`;
    if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;
    return this.fetchJSON(url);
  }

  private async listMatters(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['status', 'client_id', 'limit', 'page_token', 'fields']);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/matters${qs ? `?${qs}` : ''}`);
  }

  private async getMatter(args: Record<string, unknown>): Promise<ToolResult> {
    const matterId = args.matter_id as number;
    if (!matterId) return { content: [{ type: 'text', text: 'matter_id is required' }], isError: true };
    let url = `${this.baseUrl}/matters/${matterId}`;
    if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;
    return this.fetchJSON(url);
  }

  private async createMatter(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.description) return { content: [{ type: 'text', text: 'description is required' }], isError: true };

    const matterData: Record<string, unknown> = { description: args.description };
    if (args.client_id) matterData.client = { id: args.client_id };
    if (args.status) matterData.status = args.status;
    if (args.practice_area_id) matterData.practice_area = { id: args.practice_area_id };
    if (args.responsible_attorney_id) matterData.responsible_attorney = { id: args.responsible_attorney_id };

    return this.fetchJSON(`${this.baseUrl}/matters`, {
      method: 'POST',
      body: JSON.stringify({ data: matterData }),
    });
  }

  private async updateMatter(args: Record<string, unknown>): Promise<ToolResult> {
    const matterId = args.matter_id as number;
    if (!matterId) return { content: [{ type: 'text', text: 'matter_id is required' }], isError: true };

    const matterData: Record<string, unknown> = {};
    if (args.description) matterData.description = args.description;
    if (args.status) matterData.status = args.status;
    if (args.responsible_attorney_id) matterData.responsible_attorney = { id: args.responsible_attorney_id };

    return this.fetchJSON(`${this.baseUrl}/matters/${matterId}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: matterData }),
    });
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['type', 'limit', 'page_token', 'query', 'fields']);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/contacts${qs ? `?${qs}` : ''}`);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    const contactId = args.contact_id as number;
    if (!contactId) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    let url = `${this.baseUrl}/contacts/${contactId}`;
    if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;
    return this.fetchJSON(url);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const contactData: Record<string, unknown> = {};
    if (args.type) contactData.type = args.type;
    if (args.first_name) contactData.first_name = args.first_name;
    if (args.last_name) contactData.last_name = args.last_name;
    if (args.name) contactData.name = args.name;
    if (args.email_addresses) contactData.email_addresses = args.email_addresses;
    if (args.phone_numbers) contactData.phone_numbers = args.phone_numbers;

    return this.fetchJSON(`${this.baseUrl}/contacts`, {
      method: 'POST',
      body: JSON.stringify({ data: contactData }),
    });
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    const contactId = args.contact_id as number;
    if (!contactId) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };

    const contactData: Record<string, unknown> = {};
    if (args.first_name) contactData.first_name = args.first_name;
    if (args.last_name) contactData.last_name = args.last_name;
    if (args.email_addresses) contactData.email_addresses = args.email_addresses;
    if (args.phone_numbers) contactData.phone_numbers = args.phone_numbers;

    return this.fetchJSON(`${this.baseUrl}/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: contactData }),
    });
  }

  private async listActivities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['matter_id', 'user_id', 'start_date', 'end_date', 'limit', 'page_token', 'fields']);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/activities${qs ? `?${qs}` : ''}`);
  }

  private async createActivity(args: Record<string, unknown>): Promise<ToolResult> {
    const matterId = args.matter_id as number;
    const quantity = args.quantity as number;
    if (!matterId || quantity === undefined) {
      return { content: [{ type: 'text', text: 'matter_id and quantity are required' }], isError: true };
    }

    const activityData: Record<string, unknown> = {
      matter: { id: matterId },
      quantity,
    };
    if (args.note) activityData.note = args.note;
    if (args.date) activityData.date = args.date;
    if (args.activity_description_id) activityData.activity_description = { id: args.activity_description_id };

    return this.fetchJSON(`${this.baseUrl}/activities`, {
      method: 'POST',
      body: JSON.stringify({ data: activityData }),
    });
  }

  private async updateActivity(args: Record<string, unknown>): Promise<ToolResult> {
    const activityId = args.activity_id as number;
    if (!activityId) return { content: [{ type: 'text', text: 'activity_id is required' }], isError: true };

    const activityData: Record<string, unknown> = {};
    if (args.quantity !== undefined) activityData.quantity = args.quantity;
    if (args.note) activityData.note = args.note;
    if (args.date) activityData.date = args.date;

    return this.fetchJSON(`${this.baseUrl}/activities/${activityId}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: activityData }),
    });
  }

  private async listDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['matter_id', 'limit', 'page_token', 'fields']);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/documents${qs ? `?${qs}` : ''}`);
  }

  private async getDocument(args: Record<string, unknown>): Promise<ToolResult> {
    const documentId = args.document_id as number;
    if (!documentId) return { content: [{ type: 'text', text: 'document_id is required' }], isError: true };
    let url = `${this.baseUrl}/documents/${documentId}`;
    if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;
    return this.fetchJSON(url);
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['matter_id', 'assignee_id', 'status', 'limit', 'page_token', 'fields']);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/tasks${qs ? `?${qs}` : ''}`);
  }

  private async createTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };

    const taskData: Record<string, unknown> = { name: args.name };
    if (args.matter_id) taskData.matter = { id: args.matter_id };
    if (args.assignee_id) taskData.assignees = [{ id: args.assignee_id }];
    if (args.due_at) taskData.due_at = args.due_at;
    if (args.priority) taskData.priority = args.priority;
    if (args.description) taskData.description = args.description;

    return this.fetchJSON(`${this.baseUrl}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ data: taskData }),
    });
  }

  private async updateTask(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.task_id as number;
    if (!taskId) return { content: [{ type: 'text', text: 'task_id is required' }], isError: true };

    const taskData: Record<string, unknown> = {};
    if (args.name) taskData.name = args.name;
    if (args.status) taskData.status = args.status;
    if (args.due_at) taskData.due_at = args.due_at;
    if (args.description) taskData.description = args.description;

    return this.fetchJSON(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ data: taskData }),
    });
  }

  private async listBills(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['matter_id', 'client_id', 'status', 'start_date', 'end_date', 'limit', 'page_token']);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/bills${qs ? `?${qs}` : ''}`);
  }

  private async getBill(args: Record<string, unknown>): Promise<ToolResult> {
    const billId = args.bill_id as number;
    if (!billId) return { content: [{ type: 'text', text: 'bill_id is required' }], isError: true };
    let url = `${this.baseUrl}/bills/${billId}`;
    if (args.fields) url += `?fields=${encodeURIComponent(args.fields as string)}`;
    return this.fetchJSON(url);
  }

  private async listCalendarEntries(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['matter_id', 'attendee_id', 'start_at', 'end_at', 'limit', 'page_token']);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/calendar_entries${qs ? `?${qs}` : ''}`);
  }

  private async createCalendarEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.summary || !args.start_at || !args.end_at || !args.calendar_owner_id) {
      return { content: [{ type: 'text', text: 'summary, start_at, end_at, and calendar_owner_id are required' }], isError: true };
    }

    const entryData: Record<string, unknown> = {
      summary: args.summary,
      start_at: args.start_at,
      end_at: args.end_at,
      calendar_owner: {
        id: args.calendar_owner_id,
        type: (args.calendar_owner_type as string) || 'User',
      },
    };
    if (args.matter_id) entryData.matter = { id: args.matter_id };
    if (args.location) entryData.location = args.location;
    if (args.description) entryData.description = args.description;
    if (args.all_day !== undefined) entryData.all_day = args.all_day;

    return this.fetchJSON(`${this.baseUrl}/calendar_entries`, {
      method: 'POST',
      body: JSON.stringify({ data: entryData }),
    });
  }

  private async listNotes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['matter_id', 'contact_id', 'type', 'limit', 'page_token']);
    const qs = params.toString();
    return this.fetchJSON(`${this.baseUrl}/notes${qs ? `?${qs}` : ''}`);
  }

  private async createNote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subject) return { content: [{ type: 'text', text: 'subject is required' }], isError: true };

    const noteData: Record<string, unknown> = { subject: args.subject };
    if (args.detail) noteData.detail = args.detail;
    if (args.matter_id) noteData.matter = { id: args.matter_id };
    if (args.contact_id) noteData.contact = { id: args.contact_id };

    return this.fetchJSON(`${this.baseUrl}/notes`, {
      method: 'POST',
      body: JSON.stringify({ data: noteData }),
    });
  }
}
