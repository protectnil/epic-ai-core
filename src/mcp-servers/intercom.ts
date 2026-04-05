/**
 * Intercom MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/intercom/intercom-mcp-server — transport: streamable-HTTP (remote hosted)
// Officially maintained by Intercom. Limited to US-hosted workspaces only (as of 2026-03).
// Entry point: npx mcp-remote https://mcp.intercom.com/mcp — 6 tools (search/read-only, no write operations):
//   search, fetch, search_conversations, get_conversation, search_contacts, get_contact
// Our adapter covers: 22 tools (full CRUD for conversations, contacts, notes, tags, articles, admins, teams, companies).
// Recommendation: use-both — Vendor MCP 6 tools are read/search-only (US only). Our adapter adds all write operations
//   and covers EU/AU workspaces. MCP-sourced tools (6): search, fetch, search_conversations, get_conversation,
//   search_contacts, get_contact. REST-sourced tools (16 additional): reply_to_conversation, assign_conversation,
//   snooze_conversation, close_conversation, create_contact, update_contact, create_note, list_tags, tag_conversation,
//   untag_conversation, list_articles, get_article, list_admins, get_me, list_teams, list_companies.
//   Use vendor MCP for US-only read access; use this adapter for writes and non-US regions.
//
// Base URL: https://api.intercom.io
// Auth: Authorization: Bearer {access_token}  (Private App or OAuth2 access token)
// Version header: Intercom-Version: 2.15  (current stable as of 2026-03)
// Docs: https://developers.intercom.com/docs/references/rest-api/api.intercom.io/
// Rate limits: 83 req/10 sec (standard); 166 req/10 sec (Business plan)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IntercomConfig {
  accessToken: string;
  apiVersion?: string;
  baseUrl?: string;
}

export class IntercomMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;

  constructor(config: IntercomConfig) {
    super();
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion ?? '2.15';
    this.baseUrl = config.baseUrl ?? 'https://api.intercom.io';
  }

  static catalog() {
    return {
      name: 'intercom',
      displayName: 'Intercom',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: ['intercom', 'customer-support', 'conversation', 'contact', 'lead', 'user', 'chat', 'inbox', 'ticket', 'helpdesk', 'article', 'note', 'tag', 'team'],
      toolNames: [
        'list_conversations', 'get_conversation', 'search_conversations',
        'reply_to_conversation', 'assign_conversation', 'snooze_conversation', 'close_conversation',
        'list_contacts', 'get_contact', 'create_contact', 'update_contact', 'search_contacts',
        'create_note',
        'list_tags', 'tag_conversation', 'untag_conversation',
        'list_articles', 'get_article',
        'list_admins', 'get_me',
        'list_teams',
        'list_companies',
      ],
      description: 'Intercom customer messaging: manage conversations, contacts, notes, tags, articles, admins, teams, and companies. Reply, assign, snooze, and close conversations.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_conversations',
        description: 'List conversations with optional filters for state, assignee admin, and team, with cursor-based pagination',
        inputSchema: {
          type: 'object',
          properties: {
            state: { type: 'string', description: 'Filter by conversation state: open, closed, snoozed, pending (default: all)' },
            assignee_id: { type: 'number', description: 'Filter conversations assigned to this admin ID' },
            team_id: { type: 'number', description: 'Filter conversations assigned to this team ID' },
            per_page: { type: 'number', description: 'Results per page (max 150, default: 20)' },
            starting_after: { type: 'string', description: 'Pagination cursor from a previous response next_page field' },
          },
        },
      },
      {
        name: 'get_conversation',
        description: 'Retrieve full details of a specific conversation by ID including all messages and conversation parts',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'string', description: 'The Intercom conversation ID' },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'search_conversations',
        description: 'Search conversations using field filters and operators (e.g. by contact email, state, or custom attributes)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'object',
              description: 'Search query object. Simple: {"field":"state","operator":"=","value":"open"}. Compound: {"operator":"AND","value":[...conditions]}',
            },
            per_page: { type: 'number', description: 'Results per page (max 150, default: 20)' },
            starting_after: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: ['query'],
        },
      },
      {
        name: 'reply_to_conversation',
        description: 'Reply to a conversation as an admin — send a visible comment to the user or an internal note',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'string', description: 'The Intercom conversation ID to reply to' },
            message_type: { type: 'string', description: 'Reply type: comment (visible to user) or note (internal admin note)' },
            body: { type: 'string', description: 'HTML body of the reply message' },
            admin_id: { type: 'string', description: 'ID of the admin sending the reply' },
          },
          required: ['conversation_id', 'message_type', 'body', 'admin_id'],
        },
      },
      {
        name: 'assign_conversation',
        description: 'Assign a conversation to a specific admin or team using the manage conversation endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'string', description: 'The Intercom conversation ID to assign' },
            admin_id: { type: 'string', description: 'Admin ID performing the assignment action' },
            assignee_id: { type: 'string', description: 'ID of the admin to assign the conversation to (omit to assign to team only)' },
            team_id: { type: 'string', description: 'ID of the team to assign the conversation to' },
          },
          required: ['conversation_id', 'admin_id'],
        },
      },
      {
        name: 'snooze_conversation',
        description: 'Snooze a conversation until a specified Unix timestamp, removing it from the inbox temporarily',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'string', description: 'The Intercom conversation ID to snooze' },
            admin_id: { type: 'string', description: 'ID of the admin performing the snooze action' },
            snoozed_until: { type: 'number', description: 'Unix timestamp (seconds) when the conversation should reappear in the inbox' },
          },
          required: ['conversation_id', 'admin_id', 'snoozed_until'],
        },
      },
      {
        name: 'close_conversation',
        description: 'Close an open conversation, moving it out of the active inbox',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'string', description: 'The Intercom conversation ID to close' },
            admin_id: { type: 'string', description: 'ID of the admin closing the conversation' },
          },
          required: ['conversation_id', 'admin_id'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts (users and leads) in the workspace with cursor-based pagination',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: { type: 'number', description: 'Results per page (max 150, default: 10)' },
            starting_after: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve full details of a contact by Intercom contact ID including custom attributes and tags',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'The Intercom contact ID' },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact (user or anonymous lead) with email, name, phone, or external ID',
        inputSchema: {
          type: 'object',
          properties: {
            role: { type: 'string', description: 'Contact role: user (identified by email or external ID) or lead (anonymous)' },
            email: { type: 'string', description: 'Email address of the contact' },
            name: { type: 'string', description: 'Full name of the contact' },
            phone: { type: 'string', description: 'Phone number of the contact in E.164 format' },
            external_id: { type: 'string', description: 'Your application\'s ID for this contact (maps to user_id in Intercom)' },
            custom_attributes: {
              type: 'object',
              description: 'Key-value map of custom contact attributes to set (keys must be defined in your Intercom workspace)',
            },
          },
          required: ['role'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update an existing contact\'s name, email, phone, or custom attributes by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'The Intercom contact ID to update' },
            name: { type: 'string', description: 'Updated full name of the contact' },
            email: { type: 'string', description: 'Updated email address' },
            phone: { type: 'string', description: 'Updated phone number in E.164 format' },
            custom_attributes: {
              type: 'object',
              description: 'Key-value map of custom attributes to update',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'search_contacts',
        description: 'Search contacts by email, name, phone, external ID, or custom attributes using field filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'object',
              description: 'Search query object. Example: {"field":"email","operator":"=","value":"user@example.com"}',
            },
            per_page: { type: 'number', description: 'Results per page (max 150, default: 10)' },
            starting_after: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_note',
        description: 'Create an internal note on a contact record (visible to admins only, not the contact)',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: { type: 'string', description: 'The Intercom contact ID to attach the note to' },
            body: { type: 'string', description: 'HTML content of the note' },
            admin_id: { type: 'string', description: 'ID of the admin creating the note' },
          },
          required: ['contact_id', 'body'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all tags defined in the Intercom workspace with IDs and names',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'tag_conversation',
        description: 'Add a tag to a conversation by tag ID',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'string', description: 'The Intercom conversation ID to tag' },
            tag_id: { type: 'string', description: 'ID of the tag to apply (from list_tags)' },
            admin_id: { type: 'string', description: 'ID of the admin performing the tag action' },
          },
          required: ['conversation_id', 'tag_id', 'admin_id'],
        },
      },
      {
        name: 'untag_conversation',
        description: 'Remove a tag from a conversation by tag ID',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'string', description: 'The Intercom conversation ID to untag' },
            tag_id: { type: 'string', description: 'ID of the tag to remove (from list_tags)' },
            admin_id: { type: 'string', description: 'ID of the admin performing the untag action' },
          },
          required: ['conversation_id', 'tag_id', 'admin_id'],
        },
      },
      {
        name: 'list_articles',
        description: 'List Help Center articles in the workspace with optional search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Articles per page (default: 15, max: 50)' },
          },
        },
      },
      {
        name: 'get_article',
        description: 'Retrieve full content and metadata of a specific Help Center article by article ID',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: { type: 'string', description: 'The Intercom article ID' },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'list_admins',
        description: 'List all admins (agents) in the Intercom workspace with IDs, names, and email addresses',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_me',
        description: 'Get profile information about the currently authenticated admin (identity check)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_teams',
        description: 'List all teams in the Intercom workspace with team IDs, names, and admin membership',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_companies',
        description: 'List companies in the Intercom workspace with optional pagination and search query',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 15, max: 60)' },
            query: { type: 'string', description: 'Filter companies by name (substring match)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_conversations':
          return await this.listConversations(args);
        case 'get_conversation':
          return await this.getConversation(args);
        case 'search_conversations':
          return await this.searchConversations(args);
        case 'reply_to_conversation':
          return await this.replyToConversation(args);
        case 'assign_conversation':
          return await this.assignConversation(args);
        case 'snooze_conversation':
          return await this.snoozeConversation(args);
        case 'close_conversation':
          return await this.closeConversation(args);
        case 'list_contacts':
          return await this.listContacts(args);
        case 'get_contact':
          return await this.getContact(args);
        case 'create_contact':
          return await this.createContact(args);
        case 'update_contact':
          return await this.updateContact(args);
        case 'search_contacts':
          return await this.searchContacts(args);
        case 'create_note':
          return await this.createNote(args);
        case 'list_tags':
          return await this.listTags();
        case 'tag_conversation':
          return await this.tagConversation(args);
        case 'untag_conversation':
          return await this.untagConversation(args);
        case 'list_articles':
          return await this.listArticles(args);
        case 'get_article':
          return await this.getArticle(args);
        case 'list_admins':
          return await this.listAdmins();
        case 'get_me':
          return await this.getMe();
        case 'list_teams':
          return await this.listTeams();
        case 'list_companies':
          return await this.listCompanies(args);
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

  // ── Private helpers ──────────────────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Intercom-Version': this.apiVersion,
    };
  }

  private async apiGet(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${params && params.toString() ? `?${params}` : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listConversations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.state) params.set('state', args.state as string);
    if (args.assignee_id) params.set('assignee_id', String(args.assignee_id));
    if (args.team_id) params.set('team_id', String(args.team_id));
    if (args.per_page) params.set('per_page', String(args.per_page));
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    return this.apiGet('/conversations', params);
  }

  private async getConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    if (!id) return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    return this.apiGet(`/conversations/${encodeURIComponent(id)}`);
  }

  private async searchConversations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body: Record<string, unknown> = { query: args.query };
    const pagination: Record<string, unknown> = {};
    if (args.per_page) pagination.per_page = args.per_page;
    if (args.starting_after) pagination.starting_after = args.starting_after;
    if (Object.keys(pagination).length) body.pagination = pagination;
    return this.apiPost('/conversations/search', body);
  }

  private async replyToConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    const messageType = args.message_type as string;
    const body = args.body as string;
    const adminId = args.admin_id as string;
    if (!id || !messageType || !body || !adminId) {
      return { content: [{ type: 'text', text: 'conversation_id, message_type, body, and admin_id are required' }], isError: true };
    }
    return this.apiPost(`/conversations/${encodeURIComponent(id)}/reply`, {
      message_type: messageType,
      type: 'admin',
      admin_id: adminId,
      body,
    });
  }

  private async assignConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    const adminId = args.admin_id as string;
    if (!id || !adminId) {
      return { content: [{ type: 'text', text: 'conversation_id and admin_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      message_type: 'assignment',
      type: 'admin',
      admin_id: adminId,
    };
    if (args.assignee_id) body.assignee_id = args.assignee_id;
    if (args.team_id) body.team_id = args.team_id;
    return this.apiPost(`/conversations/${encodeURIComponent(id)}/parts`, body);
  }

  private async snoozeConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    const adminId = args.admin_id as string;
    const snoozedUntil = args.snoozed_until as number;
    if (!id || !adminId || !snoozedUntil) {
      return { content: [{ type: 'text', text: 'conversation_id, admin_id, and snoozed_until are required' }], isError: true };
    }
    return this.apiPost(`/conversations/${encodeURIComponent(id)}/parts`, {
      message_type: 'snoozed',
      type: 'admin',
      admin_id: adminId,
      snoozed_until: snoozedUntil,
    });
  }

  private async closeConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    const adminId = args.admin_id as string;
    if (!id || !adminId) {
      return { content: [{ type: 'text', text: 'conversation_id and admin_id are required' }], isError: true };
    }
    return this.apiPost(`/conversations/${encodeURIComponent(id)}/parts`, {
      message_type: 'close',
      type: 'admin',
      admin_id: adminId,
    });
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.per_page) params.set('per_page', String(args.per_page));
    if (args.starting_after) params.set('starting_after', args.starting_after as string);
    return this.apiGet('/contacts', params);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.contact_id as string;
    if (!id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.apiGet(`/contacts/${encodeURIComponent(id)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const role = args.role as string;
    if (!role) return { content: [{ type: 'text', text: 'role is required' }], isError: true };
    const body: Record<string, unknown> = { role };
    if (args.email) body.email = args.email;
    if (args.name) body.name = args.name;
    if (args.phone) body.phone = args.phone;
    if (args.external_id) body.external_id = args.external_id;
    if (args.custom_attributes) body.custom_attributes = args.custom_attributes;
    return this.apiPost('/contacts', body);
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.contact_id as string;
    if (!id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.email) body.email = args.email;
    if (args.phone) body.phone = args.phone;
    if (args.custom_attributes) body.custom_attributes = args.custom_attributes;
    const response = await this.fetchWithRetry(`${this.baseUrl}/contacts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchContacts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body: Record<string, unknown> = { query: args.query };
    const pagination: Record<string, unknown> = {};
    if (args.per_page) pagination.per_page = args.per_page;
    if (args.starting_after) pagination.starting_after = args.starting_after;
    if (Object.keys(pagination).length) body.pagination = pagination;
    return this.apiPost('/contacts/search', body);
  }

  private async createNote(args: Record<string, unknown>): Promise<ToolResult> {
    const contactId = args.contact_id as string;
    const body = args.body as string;
    if (!contactId || !body) {
      return { content: [{ type: 'text', text: 'contact_id and body are required' }], isError: true };
    }
    const payload: Record<string, unknown> = { body };
    if (args.admin_id) payload.admin_id = args.admin_id;
    return this.apiPost(`/contacts/${encodeURIComponent(contactId)}/notes`, payload);
  }

  private async listTags(): Promise<ToolResult> {
    return this.apiGet('/tags');
  }

  private async tagConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const conversationId = args.conversation_id as string;
    const tagId = args.tag_id as string;
    const adminId = args.admin_id as string;
    if (!conversationId || !tagId || !adminId) {
      return { content: [{ type: 'text', text: 'conversation_id, tag_id, and admin_id are required' }], isError: true };
    }
    return this.apiPost(`/conversations/${encodeURIComponent(conversationId)}/tags`, {
      id: tagId,
      admin_id: adminId,
    });
  }

  private async untagConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const conversationId = args.conversation_id as string;
    const tagId = args.tag_id as string;
    const adminId = args.admin_id as string;
    if (!conversationId || !tagId || !adminId) {
      return { content: [{ type: 'text', text: 'conversation_id, tag_id, and admin_id are required' }], isError: true };
    }
    return this.apiDelete(`/conversations/${encodeURIComponent(conversationId)}/tags/${encodeURIComponent(tagId)}`, {
      admin_id: adminId,
    });
  }

  private async listArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    return this.apiGet('/articles', params);
  }

  private async getArticle(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.article_id as string;
    if (!id) return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    return this.apiGet(`/articles/${encodeURIComponent(id)}`);
  }

  private async listAdmins(): Promise<ToolResult> {
    return this.apiGet('/admins');
  }

  private async getMe(): Promise<ToolResult> {
    return this.apiGet('/me');
  }

  private async listTeams(): Promise<ToolResult> {
    return this.apiGet('/teams');
  }

  private async listCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('per_page', String(args.per_page));
    if (args.query) params.set('name', args.query as string);
    return this.apiGet('/companies', params);
  }
}
