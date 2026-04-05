/**
 * Help Scout MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no MCP server published by Help Scout themselves.
// Community MCP: https://github.com/drewburchfield/help-scout-mcp-server — transport: stdio,
//   auth: OAuth2 client credentials. Actively maintained (v1.7.0 released 2026-03-25).
//   ~10 tools (searchConversations, comprehensiveConversationSearch, advancedConversationSearch,
//   structuredConversationFilter, listCustomers, searchCustomersByEmail, getCustomer,
//   getCustomerContacts, listOrganizations, getOrganization, getOrganizationMembers,
//   getOrganizationConversations, getThreads). NOT published by Help Scout (community author).
//   Fails criterion 1 (not official vendor MCP) — use-rest-api decision.
// Our adapter covers: 20 tools. Community MCP covers: ~13 tools (read-only; no write operations).
// Recommendation: use-rest-api. Our REST adapter covers write operations (create, update, delete,
//   reply, note, webhooks) that the community MCP does not expose.
//
// Base URL: https://api.helpscout.net/v2
// Auth: OAuth2 Client Credentials — POST https://api.helpscout.net/v2/oauth2/token
//   with grant_type=client_credentials, client_id, client_secret (x-www-form-urlencoded).
//   Then use: Authorization: Bearer {access_token}. Token expires in 7200s.
// Docs: https://developer.helpscout.com/mailbox-api/
// Rate limits: 60 req/min for most endpoints; 200 req/min for reporting endpoints.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HelpScoutConfig {
  /** OAuth2 client_id from Help Scout app settings. */
  clientId: string;
  /** OAuth2 client_secret from Help Scout app settings. */
  clientSecret: string;
  /** Optional base URL override (default: https://api.helpscout.net/v2). */
  baseUrl?: string;
}

export class HelpScoutMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: HelpScoutConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = (config.baseUrl ?? 'https://api.helpscout.net/v2').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'help-scout',
      displayName: 'Help Scout',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'help scout', 'helpscout', 'customer support', 'support ticket', 'inbox',
        'mailbox', 'conversation', 'customer', 'email support', 'help desk',
        'thread', 'reply', 'note', 'tag', 'webhook', 'user', 'agent',
      ],
      toolNames: [
        'list_conversations', 'get_conversation', 'create_conversation', 'update_conversation',
        'delete_conversation', 'search_conversations', 'reply_to_conversation', 'add_note_to_conversation',
        'list_mailboxes', 'get_mailbox',
        'list_customers', 'get_customer', 'create_customer', 'update_customer',
        'list_users', 'get_user',
        'list_tags',
        'list_webhooks', 'create_webhook', 'delete_webhook',
      ],
      description: 'Manage Help Scout customer support: conversations, replies, notes, customers, mailboxes, users, tags, and webhooks via the Mailbox API v2.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_conversations',
        description: 'List conversations with optional filters for mailbox, status, tag, assigned user, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            mailbox: { type: 'number', description: 'Filter by mailbox ID.' },
            status: { type: 'string', description: 'Filter by status: active, pending, closed, spam (default: active).' },
            tag: { type: 'string', description: 'Filter by tag slug.' },
            assigned_to: { type: 'number', description: 'Filter by assigned user ID.' },
            query: { type: 'string', description: 'Full-text search query across subject and body.' },
            sortField: { type: 'string', description: 'Sort by: createdAt, customerEmail, mailboxId, modifiedAt, number, score, status, subject, waitingSince (default: createdAt).' },
            sortOrder: { type: 'string', description: 'Sort direction: asc or desc (default: desc).' },
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
          },
        },
      },
      {
        name: 'get_conversation',
        description: 'Get full details of a specific Help Scout conversation including threads and customer info.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'number', description: 'The Help Scout conversation ID.' },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'create_conversation',
        description: 'Create a new conversation in a Help Scout mailbox with an initial customer thread.',
        inputSchema: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Conversation subject line.' },
            mailboxId: { type: 'number', description: 'ID of the mailbox to create the conversation in.' },
            type: { type: 'string', description: 'Conversation type: email (default) or chat.' },
            status: { type: 'string', description: 'Initial status: active, pending, closed (default: active).' },
            customer: { type: 'object', description: 'Customer object with required email field and optional firstName, lastName.' },
            threads: { type: 'array', description: 'Initial thread objects. Each requires type (customer or message) and text.', items: { type: 'object' } },
            tags: { type: 'array', description: 'Tag slugs to apply to the conversation.', items: { type: 'string' } },
          },
          required: ['subject', 'mailboxId', 'customer'],
        },
      },
      {
        name: 'update_conversation',
        description: 'Update a conversation status, assignee, subject, or tags in Help Scout.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'number', description: 'The conversation ID to update.' },
            status: { type: 'string', description: 'New status: active, pending, closed, spam.' },
            assignTo: { type: 'number', description: 'User ID to assign the conversation to (0 to unassign).' },
            subject: { type: 'string', description: 'New conversation subject.' },
            tags: { type: 'array', description: 'Replacement set of tag slugs (replaces all existing tags).', items: { type: 'string' } },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'delete_conversation',
        description: 'Permanently delete a Help Scout conversation by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'number', description: 'The conversation ID to delete.' },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'search_conversations',
        description: 'Search conversations using a full-text query string across subject and body text.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string.' },
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
          },
          required: ['query'],
        },
      },
      {
        name: 'reply_to_conversation',
        description: 'Send a reply to a Help Scout conversation (visible to the customer), optionally CC/BCC additional recipients.',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'number', description: 'The conversation ID to reply to.' },
            text: { type: 'string', description: 'Plain text body of the reply.' },
            user: { type: 'number', description: 'ID of the agent sending the reply.' },
            cc: { type: 'array', description: 'Email addresses to CC.', items: { type: 'string' } },
            bcc: { type: 'array', description: 'Email addresses to BCC.', items: { type: 'string' } },
          },
          required: ['conversation_id', 'text'],
        },
      },
      {
        name: 'add_note_to_conversation',
        description: 'Add an internal note to a Help Scout conversation (not visible to the customer).',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: { type: 'number', description: 'The conversation ID to add a note to.' },
            text: { type: 'string', description: 'Plain text body of the note.' },
            user: { type: 'number', description: 'ID of the agent creating the note.' },
          },
          required: ['conversation_id', 'text'],
        },
      },
      {
        name: 'list_mailboxes',
        description: 'List all Help Scout mailboxes (inboxes) in the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
          },
        },
      },
      {
        name: 'get_mailbox',
        description: 'Get details of a specific Help Scout mailbox by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            mailbox_id: { type: 'number', description: 'The mailbox ID.' },
          },
          required: ['mailbox_id'],
        },
      },
      {
        name: 'list_customers',
        description: 'List Help Scout customers with optional filters for email, first name, or last name.',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: { type: 'string', description: 'Filter by first name.' },
            lastName: { type: 'string', description: 'Filter by last name.' },
            email: { type: 'string', description: 'Filter by email address.' },
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get full profile of a Help Scout customer including emails, phones, addresses, and social profiles.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'number', description: 'The customer ID.' },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer record in Help Scout with contact information.',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: { type: 'string', description: 'Customer first name.' },
            lastName: { type: 'string', description: 'Customer last name.' },
            emails: { type: 'array', description: 'Array of email objects with value and type (home, work, other).', items: { type: 'object' } },
            phones: { type: 'array', description: 'Array of phone objects with value and type.', items: { type: 'object' } },
            organization: { type: 'string', description: 'Company or organization name.' },
            jobTitle: { type: 'string', description: 'Job title.' },
          },
        },
      },
      {
        name: 'update_customer',
        description: 'Update an existing Help Scout customer profile fields.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'number', description: 'The customer ID to update.' },
            firstName: { type: 'string', description: 'New first name.' },
            lastName: { type: 'string', description: 'New last name.' },
            organization: { type: 'string', description: 'New organization name.' },
            jobTitle: { type: 'string', description: 'New job title.' },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List all users (agents) in the Help Scout account with their roles and statuses.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details of a specific Help Scout user by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'number', description: 'The user ID.' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all conversation tags available in the Help Scout account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number for pagination (default: 1).' },
          },
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all configured webhooks in the Help Scout account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a new Help Scout webhook to receive events for conversations, customers, and satisfaction ratings.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'HTTPS URL to receive webhook POST requests.' },
            events: { type: 'array', description: 'Event types to subscribe to (e.g. ["convo.created","convo.status","customer.created"]).', items: { type: 'string' } },
            secret: { type: 'string', description: 'Secret key for HMAC-SHA1 webhook signature validation.' },
          },
          required: ['url', 'events'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a Help Scout webhook by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: { type: 'number', description: 'The webhook ID to delete.' },
          },
          required: ['webhook_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_conversations':       return await this.listConversations(args);
        case 'get_conversation':         return await this.getConversation(args);
        case 'create_conversation':      return await this.createConversation(args);
        case 'update_conversation':      return await this.updateConversation(args);
        case 'delete_conversation':      return await this.deleteConversation(args);
        case 'search_conversations':     return await this.searchConversations(args);
        case 'reply_to_conversation':    return await this.replyToConversation(args);
        case 'add_note_to_conversation': return await this.addNoteToConversation(args);
        case 'list_mailboxes':           return await this.listMailboxes(args);
        case 'get_mailbox':              return await this.getMailbox(args);
        case 'list_customers':           return await this.listCustomers(args);
        case 'get_customer':             return await this.getCustomer(args);
        case 'create_customer':          return await this.createCustomer(args);
        case 'update_customer':          return await this.updateCustomer(args);
        case 'list_users':               return await this.listUsers(args);
        case 'get_user':                 return await this.getUser(args);
        case 'list_tags':                return await this.listTags(args);
        case 'list_webhooks':            return await this.listWebhooks();
        case 'create_webhook':           return await this.createWebhook(args);
        case 'delete_webhook':           return await this.deleteWebhook(args);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`Help Scout OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async buildHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async hsGet(path: string): Promise<ToolResult> {
    const headers = await this.buildHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async hsPost(path: string, body: unknown): Promise<ToolResult> {
    const headers = await this.buildHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    const text = await response.text();
    if (!text.trim()) {
      const location = response.headers.get('Location') ?? '';
      return { content: [{ type: 'text', text: JSON.stringify({ status: 'created', location }) }], isError: false };
    }
    return { content: [{ type: 'text', text: this.truncate(JSON.parse(text)) }], isError: false };
  }

  private async hsPatch(path: string, body: unknown): Promise<ToolResult> {
    const headers = await this.buildHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'updated' }) }], isError: false };
  }

  private async hsDelete(path: string): Promise<ToolResult> {
    const headers = await this.buildHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'deleted' }) }], isError: false };
  }

  // ---------------------------------------------------------------------------
  // Tool implementations
  // ---------------------------------------------------------------------------

  private async listConversations(args: Record<string, unknown>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (args.mailbox) p.set('mailbox', String(args.mailbox));
    if (args.status) p.set('status', args.status as string);
    if (args.tag) p.set('tag', args.tag as string);
    if (args.assigned_to) p.set('assignedTo', String(args.assigned_to));
    if (args.query) p.set('query', args.query as string);
    if (args.sortField) p.set('sortField', args.sortField as string);
    if (args.sortOrder) p.set('sortOrder', args.sortOrder as string);
    if (args.page) p.set('page', String(args.page));
    const qs = p.toString();
    return this.hsGet(`/conversations${qs ? `?${qs}` : ''}`);
  }

  private async getConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as number;
    if (!id) return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    return this.hsGet(`/conversations/${id}`);
  }

  private async createConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const subject = args.subject as string;
    const mailboxId = args.mailboxId as number;
    const customer = args.customer;
    if (!subject || !mailboxId || !customer) {
      return { content: [{ type: 'text', text: 'subject, mailboxId, and customer are required' }], isError: true };
    }
    const body: Record<string, unknown> = { subject, mailboxId, customer };
    if (args.type) body.type = args.type;
    if (args.status) body.status = args.status;
    if (args.threads) body.threads = args.threads;
    if (args.tags) body.tags = args.tags;
    return this.hsPost('/conversations', body);
  }

  private async updateConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as number;
    if (!id) return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.assignTo !== undefined) body.assignTo = args.assignTo;
    if (args.subject) body.subject = args.subject;
    if (args.tags) body.tags = args.tags;
    return this.hsPatch(`/conversations/${id}`, body);
  }

  private async deleteConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as number;
    if (!id) return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    return this.hsDelete(`/conversations/${id}`);
  }

  private async searchConversations(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const p = new URLSearchParams({ query });
    if (args.page) p.set('page', String(args.page));
    return this.hsGet(`/conversations?${p.toString()}`);
  }

  private async replyToConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as number;
    const text = args.text as string;
    if (!id || !text) return { content: [{ type: 'text', text: 'conversation_id and text are required' }], isError: true };
    const body: Record<string, unknown> = { text };
    if (args.user) body.user = { id: args.user };
    if (args.cc) body.cc = args.cc;
    if (args.bcc) body.bcc = args.bcc;
    return this.hsPost(`/conversations/${id}/reply`, body);
  }

  private async addNoteToConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as number;
    const text = args.text as string;
    if (!id || !text) return { content: [{ type: 'text', text: 'conversation_id and text are required' }], isError: true };
    const body: Record<string, unknown> = { text };
    if (args.user) body.user = { id: args.user };
    return this.hsPost(`/conversations/${id}/notes`, body);
  }

  private async listMailboxes(args: Record<string, unknown>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (args.page) p.set('page', String(args.page));
    const qs = p.toString();
    return this.hsGet(`/mailboxes${qs ? `?${qs}` : ''}`);
  }

  private async getMailbox(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.mailbox_id as number;
    if (!id) return { content: [{ type: 'text', text: 'mailbox_id is required' }], isError: true };
    return this.hsGet(`/mailboxes/${id}`);
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (args.firstName) p.set('firstName', args.firstName as string);
    if (args.lastName) p.set('lastName', args.lastName as string);
    if (args.email) p.set('email', args.email as string);
    if (args.page) p.set('page', String(args.page));
    const qs = p.toString();
    return this.hsGet(`/customers${qs ? `?${qs}` : ''}`);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.customer_id as number;
    if (!id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    return this.hsGet(`/customers/${id}`);
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.firstName) body.firstName = args.firstName;
    if (args.lastName) body.lastName = args.lastName;
    if (args.emails) body.emails = args.emails;
    if (args.phones) body.phones = args.phones;
    if (args.organization) body.organization = args.organization;
    if (args.jobTitle) body.jobTitle = args.jobTitle;
    return this.hsPost('/customers', body);
  }

  private async updateCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.customer_id as number;
    if (!id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.firstName) body.firstName = args.firstName;
    if (args.lastName) body.lastName = args.lastName;
    if (args.organization) body.organization = args.organization;
    if (args.jobTitle) body.jobTitle = args.jobTitle;
    return this.hsPatch(`/customers/${id}`, body);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (args.page) p.set('page', String(args.page));
    const qs = p.toString();
    return this.hsGet(`/users${qs ? `?${qs}` : ''}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.user_id as number;
    if (!id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.hsGet(`/users/${id}`);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (args.page) p.set('page', String(args.page));
    const qs = p.toString();
    return this.hsGet(`/tags${qs ? `?${qs}` : ''}`);
  }

  private async listWebhooks(): Promise<ToolResult> {
    return this.hsGet('/webhooks');
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const url = args.url as string;
    const events = args.events;
    if (!url || !Array.isArray(events)) return { content: [{ type: 'text', text: 'url and events are required' }], isError: true };
    const body: Record<string, unknown> = { url, events, state: 'enabled' };
    if (args.secret) body.secret = args.secret;
    return this.hsPost('/webhooks', body);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.webhook_id as number;
    if (!id) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    return this.hsDelete(`/webhooks/${id}`);
  }
}
