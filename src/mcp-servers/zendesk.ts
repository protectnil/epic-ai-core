/**
 * Zendesk MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Zendesk MCP server was found on GitHub or npm as of March 2026.
//
// Base URL: https://{subdomain}.zendesk.com/api/v2
// Auth: Basic auth with email/token format — "email@example.com/token:{api_token}" Base64-encoded
// Docs: https://developer.zendesk.com/api-reference/
// Rate limits: 700 req/min (Enterprise), 400 req/min (Professional), 200 req/min (Team/Essential)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ZendeskConfig {
  /** Agent email address used for authentication. */
  email: string;
  /** Zendesk API token (generated in Admin > Apps & Integrations > APIs > Zendesk API). */
  apiToken: string;
  /** Zendesk subdomain (the part before .zendesk.com). */
  subdomain: string;
  /** Override the base URL (optional). */
  baseUrl?: string;
}

export class ZendeskMCPServer extends MCPAdapterBase {
  private readonly email: string;
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: ZendeskConfig) {
    super();
    this.email = config.email;
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || `https://${config.subdomain}.zendesk.com/api/v2`;
  }

  static catalog() {
    return {
      name: 'zendesk',
      displayName: 'Zendesk',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'zendesk', 'ticket', 'support', 'helpdesk', 'customer-service',
        'agent', 'organization', 'group', 'macro', 'satisfaction', 'csat',
        'comment', 'user', 'view', 'sla',
      ],
      toolNames: [
        'list_tickets', 'get_ticket', 'create_ticket', 'update_ticket', 'delete_ticket',
        'add_comment', 'list_ticket_comments',
        'search_tickets',
        'list_users', 'get_user', 'create_user', 'update_user',
        'list_organizations', 'get_organization', 'create_organization',
        'list_groups', 'get_group',
        'list_macros', 'apply_macro',
        'list_views',
        'list_satisfaction_ratings',
      ],
      description: 'Manage Zendesk support tickets, users, organizations, groups, macros, views, and CSAT satisfaction ratings.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Tickets ──────────────────────────────────────────────────────────────
      {
        name: 'list_tickets',
        description: 'List Zendesk support tickets with optional status filtering and cursor-based pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by ticket status: new, open, pending, hold, solved, closed.',
            },
            sort_by: {
              type: 'string',
              description: 'Sort field: created_at, updated_at, priority, status (default: created_at).',
            },
            sort_order: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc).',
            },
            page: {
              type: 'number',
              description: 'Page number for offset pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Tickets per page, max 100 (default: 25).',
            },
          },
        },
      },
      {
        name: 'get_ticket',
        description: 'Retrieve full details for a single Zendesk ticket by numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'Numeric Zendesk ticket ID.',
            },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'create_ticket',
        description: 'Create a new Zendesk support ticket with subject, description, requester, priority, and tags.',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Ticket subject line.',
            },
            body: {
              type: 'string',
              description: 'Initial comment/description body for the ticket.',
            },
            requester_email: {
              type: 'string',
              description: 'Email address of the requester.',
            },
            requester_name: {
              type: 'string',
              description: 'Display name of the requester (used if creating a new user).',
            },
            priority: {
              type: 'string',
              description: 'Ticket priority: low, normal, high, urgent.',
            },
            type: {
              type: 'string',
              description: 'Ticket type: problem, incident, question, task.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tag strings to apply to the ticket.',
            },
            assignee_id: {
              type: 'number',
              description: 'Agent ID to assign the ticket to.',
            },
            group_id: {
              type: 'number',
              description: 'Group ID to assign the ticket to.',
            },
            custom_fields: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of custom field objects: [{id: number, value: string}].',
            },
          },
          required: ['subject', 'body'],
        },
      },
      {
        name: 'update_ticket',
        description: 'Update an existing Zendesk ticket — change status, priority, assignee, tags, or subject.',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'Numeric Zendesk ticket ID to update.',
            },
            status: {
              type: 'string',
              description: 'Updated status: new, open, pending, hold, solved, closed.',
            },
            priority: {
              type: 'string',
              description: 'Updated priority: low, normal, high, urgent.',
            },
            assignee_id: {
              type: 'number',
              description: 'Agent ID to assign the ticket to.',
            },
            group_id: {
              type: 'number',
              description: 'Group ID to assign the ticket to.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Replace the full tag list with these tags.',
            },
            subject: {
              type: 'string',
              description: 'Updated ticket subject.',
            },
            custom_fields: {
              type: 'array',
              items: { type: 'object' },
              description: 'Custom field objects to update: [{id: number, value: string}].',
            },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'delete_ticket',
        description: 'Permanently delete a Zendesk ticket by ID. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'Numeric Zendesk ticket ID to delete.',
            },
          },
          required: ['ticket_id'],
        },
      },
      // ── Comments ─────────────────────────────────────────────────────────────
      {
        name: 'add_comment',
        description: 'Add a public or private (internal) comment to an existing Zendesk ticket.',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'Numeric Zendesk ticket ID to comment on.',
            },
            body: {
              type: 'string',
              description: 'Comment body text.',
            },
            public: {
              type: 'boolean',
              description: 'True for public comment visible to requester, false for internal note (default: true).',
            },
            author_id: {
              type: 'number',
              description: 'Agent ID authoring the comment (defaults to authenticated user).',
            },
          },
          required: ['ticket_id', 'body'],
        },
      },
      {
        name: 'list_ticket_comments',
        description: 'List all comments (public and internal notes) for a Zendesk ticket in chronological order.',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'Numeric Zendesk ticket ID to retrieve comments for.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Comments per page, max 100 (default: 25).',
            },
          },
          required: ['ticket_id'],
        },
      },
      // ── Search ───────────────────────────────────────────────────────────────
      {
        name: 'search_tickets',
        description: 'Search Zendesk using Zendesk search syntax across tickets, users, and organizations.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Zendesk search query, e.g. "type:ticket status:open priority:high tags:billing".',
            },
            sort_by: {
              type: 'string',
              description: 'Sort field: created_at, updated_at, priority, status.',
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
              description: 'Results per page, max 100 (default: 25).',
            },
          },
          required: ['query'],
        },
      },
      // ── Users ────────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List Zendesk users (agents and end users) with optional role filtering and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Filter by role: end-user, agent, admin.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Users per page, max 100 (default: 25).',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve full profile details for a single Zendesk user by numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Numeric Zendesk user ID.',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new Zendesk end user or agent with name, email, and optional role.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the new user.',
            },
            email: {
              type: 'string',
              description: 'Email address for the new user.',
            },
            role: {
              type: 'string',
              description: 'User role: end-user, agent, or admin (default: end-user).',
            },
            organization_id: {
              type: 'number',
              description: 'Organization ID to associate the user with.',
            },
            phone: {
              type: 'string',
              description: 'Phone number for the user.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tag strings to apply to the user.',
            },
          },
          required: ['name', 'email'],
        },
      },
      {
        name: 'update_user',
        description: 'Update an existing Zendesk user\'s name, email, role, or organization.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'number',
              description: 'Numeric Zendesk user ID to update.',
            },
            name: {
              type: 'string',
              description: 'Updated display name.',
            },
            email: {
              type: 'string',
              description: 'Updated email address.',
            },
            role: {
              type: 'string',
              description: 'Updated role: end-user, agent, or admin.',
            },
            organization_id: {
              type: 'number',
              description: 'Updated organization ID.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Updated tag list.',
            },
          },
          required: ['user_id'],
        },
      },
      // ── Organizations ────────────────────────────────────────────────────────
      {
        name: 'list_organizations',
        description: 'List all Zendesk organizations with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Organizations per page, max 100 (default: 25).',
            },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Retrieve full details for a single Zendesk organization by numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'number',
              description: 'Numeric Zendesk organization ID.',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'create_organization',
        description: 'Create a new Zendesk organization with a name and optional domain names and tags.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Organization name.',
            },
            domain_names: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of email domain strings associated with this organization.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tag strings to apply to the organization.',
            },
            notes: {
              type: 'string',
              description: 'Internal notes about the organization.',
            },
          },
          required: ['name'],
        },
      },
      // ── Groups ───────────────────────────────────────────────────────────────
      {
        name: 'list_groups',
        description: 'List all Zendesk agent groups available in the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Groups per page, max 100 (default: 25).',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Retrieve details for a specific Zendesk agent group by numeric ID.',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'number',
              description: 'Numeric Zendesk group ID.',
            },
          },
          required: ['group_id'],
        },
      },
      // ── Macros ───────────────────────────────────────────────────────────────
      {
        name: 'list_macros',
        description: 'List all Zendesk macros available to the current user, including shared and personal macros.',
        inputSchema: {
          type: 'object',
          properties: {
            access: {
              type: 'string',
              description: 'Filter by macro access level: personal, shared, account (default: all).',
            },
            active: {
              type: 'boolean',
              description: 'Filter to only active macros (default: true).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Macros per page, max 100 (default: 25).',
            },
          },
        },
      },
      {
        name: 'apply_macro',
        description: 'Show the results of applying a Zendesk macro to a ticket without saving changes.',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'Numeric Zendesk ticket ID to apply the macro to.',
            },
            macro_id: {
              type: 'number',
              description: 'Numeric Zendesk macro ID to apply.',
            },
          },
          required: ['ticket_id', 'macro_id'],
        },
      },
      // ── Views ────────────────────────────────────────────────────────────────
      {
        name: 'list_views',
        description: 'List all active Zendesk ticket views available to the current agent.',
        inputSchema: {
          type: 'object',
          properties: {
            access: {
              type: 'string',
              description: 'Filter by view access: personal, shared, account (default: all).',
            },
            active: {
              type: 'boolean',
              description: 'Filter to only active views (default: true).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Views per page, max 100 (default: 25).',
            },
          },
        },
      },
      // ── Satisfaction Ratings ─────────────────────────────────────────────────
      {
        name: 'list_satisfaction_ratings',
        description: 'List Zendesk CSAT satisfaction ratings with optional filters for score and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            score: {
              type: 'string',
              description: 'Filter by score: offered, unoffered, good, bad, good_with_comment, bad_with_comment.',
            },
            start_time: {
              type: 'number',
              description: 'Unix timestamp — only return ratings created after this time.',
            },
            end_time: {
              type: 'number',
              description: 'Unix timestamp — only return ratings created before this time.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per_page: {
              type: 'number',
              description: 'Ratings per page, max 100 (default: 25).',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_tickets':              return await this.listTickets(args);
        case 'get_ticket':                return await this.getTicket(args);
        case 'create_ticket':             return await this.createTicket(args);
        case 'update_ticket':             return await this.updateTicket(args);
        case 'delete_ticket':             return await this.deleteTicket(args);
        case 'add_comment':               return await this.addComment(args);
        case 'list_ticket_comments':      return await this.listTicketComments(args);
        case 'search_tickets':            return await this.searchTickets(args);
        case 'list_users':                return await this.listUsers(args);
        case 'get_user':                  return await this.getUser(args);
        case 'create_user':               return await this.createUser(args);
        case 'update_user':               return await this.updateUser(args);
        case 'list_organizations':        return await this.listOrganizations(args);
        case 'get_organization':          return await this.getOrganization(args);
        case 'create_organization':       return await this.createOrganization(args);
        case 'list_groups':               return await this.listGroups(args);
        case 'get_group':                 return await this.getGroup(args);
        case 'list_macros':               return await this.listMacros(args);
        case 'apply_macro':               return await this.applyMacro(args);
        case 'list_views':                return await this.listViews(args);
        case 'list_satisfaction_ratings': return await this.listSatisfactionRatings(args);
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

  private get authHeader(): string {
    const credentials = Buffer.from(`${this.email}/token:${this.apiToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
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
        content: [{ type: 'text', text: `Zendesk API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }

    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private paginationParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return params;
  }

  private async listTickets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.status) params.set('status', args.status as string);
    if (args.sort_by) params.set('sort_by', args.sort_by as string);
    if (args.sort_order) params.set('sort_order', args.sort_order as string);
    const qs = params.toString();
    return this.request('GET', `/tickets${qs ? `?${qs}` : ''}`);
  }

  private async getTicket(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.ticket_id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'ticket_id is required' }], isError: true };
    }
    return this.request('GET', `/tickets/${id}`);
  }

  private async createTicket(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.subject || !args.body) {
      return { content: [{ type: 'text', text: 'subject and body are required' }], isError: true };
    }
    const ticket: Record<string, unknown> = {
      subject: args.subject,
      comment: { body: args.body },
    };
    if (args.requester_email) {
      ticket.requester = { email: args.requester_email, name: args.requester_name ?? args.requester_email };
    }
    if (args.priority) ticket.priority = args.priority;
    if (args.type) ticket.type = args.type;
    if (args.tags) ticket.tags = args.tags;
    if (args.assignee_id) ticket.assignee_id = args.assignee_id;
    if (args.group_id) ticket.group_id = args.group_id;
    if (args.custom_fields) ticket.custom_fields = args.custom_fields;
    return this.request('POST', '/tickets', { ticket });
  }

  private async updateTicket(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.ticket_id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'ticket_id is required' }], isError: true };
    }
    const ticket: Record<string, unknown> = {};
    if (args.status !== undefined) ticket.status = args.status;
    if (args.priority !== undefined) ticket.priority = args.priority;
    if (args.assignee_id !== undefined) ticket.assignee_id = args.assignee_id;
    if (args.group_id !== undefined) ticket.group_id = args.group_id;
    if (args.tags !== undefined) ticket.tags = args.tags;
    if (args.subject !== undefined) ticket.subject = args.subject;
    if (args.custom_fields !== undefined) ticket.custom_fields = args.custom_fields;
    return this.request('PUT', `/tickets/${id}`, { ticket });
  }

  private async deleteTicket(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.ticket_id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'ticket_id is required' }], isError: true };
    }
    return this.request('DELETE', `/tickets/${id}`);
  }

  private async addComment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.ticket_id as number;
    const body = args.body as string;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'ticket_id is required' }], isError: true };
    }
    if (!body) {
      return { content: [{ type: 'text', text: 'body is required' }], isError: true };
    }
    const comment: Record<string, unknown> = {
      body,
      public: args.public !== undefined ? args.public : true,
    };
    if (args.author_id !== undefined) comment.author_id = args.author_id;
    return this.request('PUT', `/tickets/${id}`, { ticket: { comment } });
  }

  private async listTicketComments(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.ticket_id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'ticket_id is required' }], isError: true };
    }
    const params = this.paginationParams(args);
    const qs = params.toString();
    return this.request('GET', `/tickets/${id}/comments${qs ? `?${qs}` : ''}`);
  }

  private async searchTickets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    const params = new URLSearchParams({ query: args.query as string });
    if (args.sort_by) params.set('sort_by', args.sort_by as string);
    if (args.sort_order) params.set('sort_order', args.sort_order as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.request('GET', `/search?${params.toString()}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.role) params.set('role', args.role as string);
    const qs = params.toString();
    return this.request('GET', `/users${qs ? `?${qs}` : ''}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.user_id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    return this.request('GET', `/users/${id}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.email) {
      return { content: [{ type: 'text', text: 'name and email are required' }], isError: true };
    }
    const user: Record<string, unknown> = { name: args.name, email: args.email };
    if (args.role) user.role = args.role;
    if (args.organization_id) user.organization_id = args.organization_id;
    if (args.phone) user.phone = args.phone;
    if (args.tags) user.tags = args.tags;
    return this.request('POST', '/users', { user });
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.user_id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    const user: Record<string, unknown> = {};
    if (args.name !== undefined) user.name = args.name;
    if (args.email !== undefined) user.email = args.email;
    if (args.role !== undefined) user.role = args.role;
    if (args.organization_id !== undefined) user.organization_id = args.organization_id;
    if (args.tags !== undefined) user.tags = args.tags;
    return this.request('PUT', `/users/${id}`, { user });
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    const qs = params.toString();
    return this.request('GET', `/organizations${qs ? `?${qs}` : ''}`);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.organization_id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    }
    return this.request('GET', `/organizations/${id}`);
  }

  private async createOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    const organization: Record<string, unknown> = { name: args.name };
    if (args.domain_names) organization.domain_names = args.domain_names;
    if (args.tags) organization.tags = args.tags;
    if (args.notes) organization.notes = args.notes;
    return this.request('POST', '/organizations', { organization });
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    const qs = params.toString();
    return this.request('GET', `/groups${qs ? `?${qs}` : ''}`);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.group_id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    }
    return this.request('GET', `/groups/${id}`);
  }

  private async listMacros(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.access) params.set('access', args.access as string);
    if (args.active !== undefined) params.set('active', String(args.active));
    const qs = params.toString();
    return this.request('GET', `/macros${qs ? `?${qs}` : ''}`);
  }

  private async applyMacro(args: Record<string, unknown>): Promise<ToolResult> {
    const ticketId = args.ticket_id as number;
    const macroId = args.macro_id as number;
    if (!ticketId || !macroId) {
      return { content: [{ type: 'text', text: 'ticket_id and macro_id are required' }], isError: true };
    }
    return this.request('GET', `/tickets/${ticketId}/macros/${macroId}/apply`);
  }

  private async listViews(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.access) params.set('access', args.access as string);
    if (args.active !== undefined) params.set('active', String(args.active));
    const qs = params.toString();
    return this.request('GET', `/views${qs ? `?${qs}` : ''}`);
  }

  private async listSatisfactionRatings(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.paginationParams(args);
    if (args.score) params.set('score', args.score as string);
    if (args.start_time) params.set('start_time', String(args.start_time));
    if (args.end_time) params.set('end_time', String(args.end_time));
    const qs = params.toString();
    return this.request('GET', `/satisfaction_ratings${qs ? `?${qs}` : ''}`);
  }
}
