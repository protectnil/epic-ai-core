/**
 * Freshdesk MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28. Freshworks has not published an official MCP server.
//   Community implementations exist (effytech/freshdesk_mcp — community, MIT, ~30 tools, stdio;
//   bcavas/freshdesk-mcp-server — community, 33+ tools, stdio + streamable-HTTP) but are
//   not official Freshworks products. None qualify under the 4-criteria protocol gate.
// Our adapter covers: 26 tools. Vendor MCP covers: 0 tools (no official server).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://{domain}.freshdesk.com/api/v2
//   domain = your Freshdesk subdomain, e.g. "acme" for acme.freshdesk.com
// Auth: HTTP Basic — API key as username, literal "X" as password
//   Authorization: Basic base64("<api_key>:X")
// Docs: https://developers.freshdesk.com/api/
// Rate limits: Growth: 200 req/min (overall); Pro: 400 req/min; Enterprise: 700 req/min
//   Per-endpoint sub-limits apply (e.g., Ticket Create: 80/min on Growth, 160/min on Pro).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FreshdeskConfig {
  apiKey: string;
  domain: string;   // subdomain only, e.g. "acme" for acme.freshdesk.com
  baseUrl?: string; // override full base URL if needed
}

export class FreshdeskMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: FreshdeskConfig) {
    super();
    const credentials = Buffer.from(`${config.apiKey}:X`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.baseUrl = config.baseUrl || `https://${config.domain}.freshdesk.com/api/v2`;
  }

  static catalog() {
    return {
      name: 'freshdesk',
      displayName: 'Freshdesk',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: ['freshdesk', 'freshworks', 'helpdesk', 'support', 'ticket', 'customer support', 'contact', 'agent', 'company', 'group', 'satisfaction', 'csat'],
      toolNames: [
        'list_tickets', 'get_ticket', 'create_ticket', 'update_ticket', 'delete_ticket',
        'search_tickets', 'filter_tickets',
        'reply_to_ticket', 'add_note_to_ticket',
        'list_ticket_conversations',
        'list_contacts', 'get_contact', 'create_contact', 'update_contact', 'search_contacts',
        'list_agents', 'get_agent',
        'list_companies', 'get_company', 'create_company',
        'list_groups', 'get_group',
        'list_products',
        'list_satisfaction_ratings',
        'list_time_entries', 'create_time_entry',
      ],
      description: 'Manage Freshdesk customer support: tickets, conversations, contacts, agents, companies, groups, satisfaction ratings, and time tracking via the Freshdesk REST API v2.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Tickets ───────────────────────────────────────────────────────────
      {
        name: 'list_tickets',
        description: 'List support tickets with optional filters for status, priority, type, requester, and sort order',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'Predefined filter: new_and_my_open, watching, spam, deleted' },
            requester_id: { type: 'number', description: 'Filter by requester ID' },
            email: { type: 'string', description: 'Filter by requester email address' },
            type: { type: 'string', description: 'Filter by ticket type: Question, Incident, Problem, Feature Request' },
            updated_since: { type: 'string', description: 'Return tickets updated after this ISO 8601 timestamp, e.g. 2026-01-01T00:00:00Z' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 30)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            order_by: { type: 'string', description: 'Sort field: created_at, due_by, updated_at, status (default: created_at)' },
            order_type: { type: 'string', description: 'Sort direction: asc or desc (default: desc)' },
          },
        },
      },
      {
        name: 'get_ticket',
        description: 'Get full details of a specific support ticket by ID, including all fields and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshdesk ticket ID' },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'create_ticket',
        description: 'Create a new support ticket with subject, requester email, priority, status, and optional tags',
        inputSchema: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Subject line of the ticket (required)' },
            email: { type: 'string', description: 'Email address of the requester (required)' },
            description: { type: 'string', description: 'HTML body of the ticket description' },
            priority: { type: 'number', description: 'Priority: 1=Low, 2=Medium, 3=High, 4=Urgent (default: 1)' },
            status: { type: 'number', description: 'Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed (default: 2)' },
            type: { type: 'string', description: 'Ticket type: Question, Incident, Problem, Feature Request' },
            tags: { type: 'array', description: 'Array of tag strings to attach', items: { type: 'string' } },
            responder_id: { type: 'number', description: 'Agent ID to assign the ticket to' },
            group_id: { type: 'number', description: 'Group ID to assign the ticket to' },
          },
          required: ['subject', 'email'],
        },
      },
      {
        name: 'update_ticket',
        description: 'Update status, priority, assignment, subject, type, or tags on an existing support ticket',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshdesk ticket ID to update' },
            status: { type: 'number', description: 'New status: 2=Open, 3=Pending, 4=Resolved, 5=Closed' },
            priority: { type: 'number', description: 'New priority: 1=Low, 2=Medium, 3=High, 4=Urgent' },
            subject: { type: 'string', description: 'Updated subject' },
            type: { type: 'string', description: 'New ticket type' },
            tags: { type: 'array', description: 'New set of tags (replaces existing)', items: { type: 'string' } },
            responder_id: { type: 'number', description: 'Agent ID to reassign to' },
            group_id: { type: 'number', description: 'Group ID to reassign to' },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'delete_ticket',
        description: 'Delete a ticket by ID (moves to trash; not permanently destroyed)',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshdesk ticket ID to delete' },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'search_tickets',
        description: 'Search tickets using a query string with field filters, e.g. status:2 AND priority:3',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query, e.g. "status:2 AND priority:3 AND tag:vip"' },
            page: { type: 'number', description: 'Page number (default: 1, max: 10 pages = 300 results)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'filter_tickets',
        description: 'Filter tickets using Freshdesk predefined view queries for saved ticket views',
        inputSchema: {
          type: 'object',
          properties: {
            view_id: { type: 'number', description: 'ID of a saved Freshdesk ticket view to filter by' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['view_id'],
        },
      },
      // ── Conversations ─────────────────────────────────────────────────────
      {
        name: 'reply_to_ticket',
        description: 'Add a public reply to a ticket that is visible to the requester, with optional CC',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshdesk ticket ID' },
            body: { type: 'string', description: 'HTML content of the reply (required)' },
            cc_emails: { type: 'array', description: 'Email addresses to CC on this reply', items: { type: 'string' } },
            bcc_emails: { type: 'array', description: 'Email addresses to BCC on this reply', items: { type: 'string' } },
          },
          required: ['ticket_id', 'body'],
        },
      },
      {
        name: 'add_note_to_ticket',
        description: 'Add an internal note to a ticket (private by default, not visible to the requester)',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshdesk ticket ID' },
            body: { type: 'string', description: 'HTML content of the note (required)' },
            private: { type: 'boolean', description: 'If true, note is private (agents only). Default: true' },
            notify_emails: { type: 'array', description: 'Agent email addresses to notify about this note', items: { type: 'string' } },
          },
          required: ['ticket_id', 'body'],
        },
      },
      {
        name: 'list_ticket_conversations',
        description: 'List all conversations (replies and notes) for a specific ticket',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshdesk ticket ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['ticket_id'],
        },
      },
      // ── Contacts ──────────────────────────────────────────────────────────
      {
        name: 'list_contacts',
        description: 'List contacts with optional filters for email, mobile, or phone number',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Filter by exact email address' },
            mobile: { type: 'string', description: 'Filter by mobile number' },
            phone: { type: 'string', description: 'Filter by phone number' },
            company_id: { type: 'number', description: 'Filter by company ID' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 30)' },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get full details of a contact by ID including all custom fields',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'number', description: 'The Freshdesk contact ID' },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in Freshdesk with name, email, phone, and company',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Contact full name (required)' },
            email: { type: 'string', description: 'Contact email address' },
            phone: { type: 'string', description: 'Contact phone number' },
            mobile: { type: 'string', description: 'Contact mobile number' },
            company_id: { type: 'number', description: 'ID of the company to associate the contact with' },
            job_title: { type: 'string', description: 'Contact job title' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update a contact by ID — change name, email, phone, job title, or company',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'number', description: 'The Freshdesk contact ID to update' },
            name: { type: 'string', description: 'Updated full name' },
            email: { type: 'string', description: 'Updated email address' },
            phone: { type: 'string', description: 'Updated phone number' },
            job_title: { type: 'string', description: 'Updated job title' },
            company_id: { type: 'number', description: 'Updated company ID' },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'search_contacts',
        description: 'Search contacts by name, email, phone, or company using a keyword',
        inputSchema: {
          type: 'object',
          properties: {
            term: { type: 'string', description: 'Search keyword to match against name, email, phone, or mobile (required)' },
          },
          required: ['term'],
        },
      },
      // ── Agents ────────────────────────────────────────────────────────────
      {
        name: 'list_agents',
        description: 'List all support agents in the Freshdesk account with their roles and contact info',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Filter by exact agent email' },
            state: { type: 'string', description: 'Filter by agent state: fulltime or occasional' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30)' },
          },
        },
      },
      {
        name: 'get_agent',
        description: 'Get full details for a specific agent by ID',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: { type: 'number', description: 'The Freshdesk agent ID' },
          },
          required: ['agent_id'],
        },
      },
      // ── Companies ─────────────────────────────────────────────────────────
      {
        name: 'list_companies',
        description: 'List all companies in the Freshdesk account',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 30)' },
          },
        },
      },
      {
        name: 'get_company',
        description: 'Get full details for a company by ID',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'number', description: 'The Freshdesk company ID' },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'create_company',
        description: 'Create a new company record in Freshdesk',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Company name (required)' },
            description: { type: 'string', description: 'Company description' },
            domains: { type: 'array', description: 'Email domains associated with this company (e.g. ["acme.com"])', items: { type: 'string' } },
            account_tier: { type: 'string', description: 'Account tier: Basic, Premium, Enterprise (optional)' },
          },
          required: ['name'],
        },
      },
      // ── Groups ────────────────────────────────────────────────────────────
      {
        name: 'list_groups',
        description: 'List all agent groups in the Freshdesk account',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get full details for a specific agent group by ID, including member agents',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'number', description: 'The Freshdesk group ID' },
          },
          required: ['group_id'],
        },
      },
      // ── Products ──────────────────────────────────────────────────────────
      {
        name: 'list_products',
        description: 'List all products configured in the Freshdesk account (used for multi-product helpdesks)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Satisfaction Ratings ──────────────────────────────────────────────
      {
        name: 'list_satisfaction_ratings',
        description: 'List customer satisfaction (CSAT) ratings, with optional filters for time range and rating value',
        inputSchema: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Start date for ratings in YYYY-MM-DD format' },
            to: { type: 'string', description: 'End date for ratings in YYYY-MM-DD format' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (max 100, default: 30)' },
          },
        },
      },
      // ── Time Entries ──────────────────────────────────────────────────────
      {
        name: 'list_time_entries',
        description: 'List time tracking entries across all tickets, with optional agent and time range filters',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: { type: 'number', description: 'Filter by agent ID' },
            from: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            to: { type: 'string', description: 'End date in YYYY-MM-DD format' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 30)' },
          },
        },
      },
      {
        name: 'create_time_entry',
        description: 'Log a time tracking entry against a specific ticket',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: { type: 'number', description: 'The Freshdesk ticket ID to log time against (required)' },
            time_spent: { type: 'string', description: 'Time spent in HH:MM format, e.g. 01:30 for 1 hour 30 minutes (required)' },
            agent_id: { type: 'number', description: 'Agent ID to assign the time entry to (defaults to current agent)' },
            note: { type: 'string', description: 'Note describing the work done' },
            billable: { type: 'boolean', description: 'Whether this time is billable (default: true)' },
            executed_at: { type: 'string', description: 'When the work was done, ISO 8601 timestamp (default: now)' },
          },
          required: ['ticket_id', 'time_spent'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_tickets':               return await this.listTickets(args);
        case 'get_ticket':                 return await this.getTicket(args);
        case 'create_ticket':              return await this.createTicket(args);
        case 'update_ticket':              return await this.updateTicket(args);
        case 'delete_ticket':              return await this.deleteTicket(args);
        case 'search_tickets':             return await this.searchTickets(args);
        case 'filter_tickets':             return await this.filterTickets(args);
        case 'reply_to_ticket':            return await this.replyToTicket(args);
        case 'add_note_to_ticket':         return await this.addNoteToTicket(args);
        case 'list_ticket_conversations':  return await this.listTicketConversations(args);
        case 'list_contacts':              return await this.listContacts(args);
        case 'get_contact':                return await this.getContact(args);
        case 'create_contact':             return await this.createContact(args);
        case 'update_contact':             return await this.updateContact(args);
        case 'search_contacts':            return await this.searchContacts(args);
        case 'list_agents':                return await this.listAgents(args);
        case 'get_agent':                  return await this.getAgent(args);
        case 'list_companies':             return await this.listCompanies(args);
        case 'get_company':                return await this.getCompany(args);
        case 'create_company':             return await this.createCompany(args);
        case 'list_groups':                return await this.listGroups(args);
        case 'get_group':                  return await this.getGroup(args);
        case 'list_products':              return await this.listProducts();
        case 'list_satisfaction_ratings':  return await this.listSatisfactionRatings(args);
        case 'list_time_entries':          return await this.listTimeEntries(args);
        case 'create_time_entry':          return await this.createTimeEntry(args);
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

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private async fdRequest(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Freshdesk API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    // 204 No Content (delete operations)
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: 204 }) }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Freshdesk returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Tickets ───────────────────────────────────────────────────────────────

  private async listTickets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.filter) params.set('filter', args.filter as string);
    if (args.requester_id) params.set('requester_id', String(args.requester_id));
    if (args.email) params.set('email', args.email as string);
    if (args.type) params.set('type', args.type as string);
    if (args.updated_since) params.set('updated_since', args.updated_since as string);
    if (args.per_page) params.set('per_page', String(args.per_page));
    if (args.page) params.set('page', String(args.page));
    if (args.order_by) params.set('order_by', args.order_by as string);
    if (args.order_type) params.set('order_type', args.order_type as string);
    return this.fdRequest(`${this.baseUrl}/tickets?${params.toString()}`);
  }

  private async getTicket(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fdRequest(`${this.baseUrl}/tickets/${encodeURIComponent(args.ticket_id as string)}`);
  }

  private async createTicket(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      subject: args.subject,
      email: args.email,
      status: (args.status as number) ?? 2,
      priority: (args.priority as number) ?? 1,
    };
    if (args.description) body.description = args.description;
    if (args.type) body.type = args.type;
    if (args.tags) body.tags = args.tags;
    if (args.responder_id) body.responder_id = args.responder_id;
    if (args.group_id) body.group_id = args.group_id;
    return this.fdRequest(`${this.baseUrl}/tickets`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateTicket(args: Record<string, unknown>): Promise<ToolResult> {
    const { ticket_id, ...fields } = args;
    const body: Record<string, unknown> = {};
    if (fields.status !== undefined) body.status = fields.status;
    if (fields.priority !== undefined) body.priority = fields.priority;
    if (fields.subject) body.subject = fields.subject;
    if (fields.type) body.type = fields.type;
    if (fields.tags) body.tags = fields.tags;
    if (fields.responder_id) body.responder_id = fields.responder_id;
    if (fields.group_id) body.group_id = fields.group_id;
    return this.fdRequest(`${this.baseUrl}/tickets/${ticket_id}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  private async deleteTicket(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fdRequest(`${this.baseUrl}/tickets/${encodeURIComponent(args.ticket_id as string)}`, { method: 'DELETE' });
  }

  private async searchTickets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ query: `"${encodeURIComponent(args.query as string)}"` });
    if (args.page) params.set('page', String(args.page));
    return this.fdRequest(`${this.baseUrl}/search/tickets?${params.toString()}`);
  }

  private async filterTickets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    return this.fdRequest(`${this.baseUrl}/tickets/filter?view_id=${encodeURIComponent(args.view_id as string)}&${params.toString()}`);
  }

  // ── Conversations ─────────────────────────────────────────────────────────

  private async replyToTicket(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { body: args.body };
    if (args.cc_emails) body.cc_emails = args.cc_emails;
    if (args.bcc_emails) body.bcc_emails = args.bcc_emails;
    return this.fdRequest(`${this.baseUrl}/tickets/${encodeURIComponent(args.ticket_id as string)}/reply`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async addNoteToTicket(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      body: args.body,
      private: typeof args.private === 'boolean' ? args.private : true,
    };
    if (args.notify_emails) body.notify_emails = args.notify_emails;
    return this.fdRequest(`${this.baseUrl}/tickets/${encodeURIComponent(args.ticket_id as string)}/notes`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async listTicketConversations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    return this.fdRequest(`${this.baseUrl}/tickets/${encodeURIComponent(args.ticket_id as string)}/conversations?${params.toString()}`);
  }

  // ── Contacts ──────────────────────────────────────────────────────────────

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.email) params.set('email', args.email as string);
    if (args.mobile) params.set('mobile', args.mobile as string);
    if (args.phone) params.set('phone', args.phone as string);
    if (args.company_id) params.set('company_id', String(args.company_id));
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fdRequest(`${this.baseUrl}/contacts?${params.toString()}`);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fdRequest(`${this.baseUrl}/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.email) body.email = args.email;
    if (args.phone) body.phone = args.phone;
    if (args.mobile) body.mobile = args.mobile;
    if (args.company_id) body.company_id = args.company_id;
    if (args.job_title) body.job_title = args.job_title;
    return this.fdRequest(`${this.baseUrl}/contacts`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    const { contact_id, ...fields } = args;
    const body: Record<string, unknown> = {};
    if (fields.name) body.name = fields.name;
    if (fields.email) body.email = fields.email;
    if (fields.phone) body.phone = fields.phone;
    if (fields.job_title) body.job_title = fields.job_title;
    if (fields.company_id) body.company_id = fields.company_id;
    return this.fdRequest(`${this.baseUrl}/contacts/${contact_id}`, { method: 'PUT', body: JSON.stringify(body) });
  }

  private async searchContacts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fdRequest(`${this.baseUrl}/contacts/autocomplete?term=${encodeURIComponent(args.term as string)}`);
  }

  // ── Agents ────────────────────────────────────────────────────────────────

  private async listAgents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.email) params.set('email', args.email as string);
    if (args.state) params.set('state', args.state as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fdRequest(`${this.baseUrl}/agents?${params.toString()}`);
  }

  private async getAgent(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fdRequest(`${this.baseUrl}/agents/${encodeURIComponent(args.agent_id as string)}`);
  }

  // ── Companies ─────────────────────────────────────────────────────────────

  private async listCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fdRequest(`${this.baseUrl}/companies?${params.toString()}`);
  }

  private async getCompany(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fdRequest(`${this.baseUrl}/companies/${encodeURIComponent(args.company_id as string)}`);
  }

  private async createCompany(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    if (args.domains) body.domains = args.domains;
    if (args.account_tier) body.account_tier = args.account_tier;
    return this.fdRequest(`${this.baseUrl}/companies`, { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    return this.fdRequest(`${this.baseUrl}/groups?${params.toString()}`);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fdRequest(`${this.baseUrl}/groups/${encodeURIComponent(args.group_id as string)}`);
  }

  // ── Products ──────────────────────────────────────────────────────────────

  private async listProducts(): Promise<ToolResult> {
    return this.fdRequest(`${this.baseUrl}/products`);
  }

  // ── Satisfaction Ratings ──────────────────────────────────────────────────

  private async listSatisfactionRatings(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.from) params.set('from', args.from as string);
    if (args.to) params.set('to', args.to as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fdRequest(`${this.baseUrl}/surveys/satisfaction_ratings?${params.toString()}`);
  }

  // ── Time Entries ──────────────────────────────────────────────────────────

  private async listTimeEntries(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.agent_id) params.set('agent_id', String(args.agent_id));
    if (args.from) params.set('executed_after', args.from as string);
    if (args.to) params.set('executed_before', args.to as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.fdRequest(`${this.baseUrl}/time_entries?${params.toString()}`);
  }

  private async createTimeEntry(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      time_spent: args.time_spent,
      billable: (args.billable as boolean) ?? true,
    };
    if (args.agent_id) body.agent_id = args.agent_id;
    if (args.note) body.note = args.note;
    if (args.executed_at) body.executed_at = args.executed_at;
    return this.fdRequest(
      `${this.baseUrl}/tickets/${encodeURIComponent(args.ticket_id as string)}/time_entries`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }
}
