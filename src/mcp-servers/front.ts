/**
 * Front MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no vendor-published MCP server exists.
//   Community MCP: https://github.com/zqushair/Frontapp-MCP — not vendor-published, 17 stars,
//   3 commits, no releases. Fails criteria 1 (not official) and criteria 2 (unknown maintenance date).
// Our adapter covers: 18 tools. Community MCP: unknown tool count (not official; not evaluated).
// Recommendation: use-rest-api — no official Front MCP server exists; REST adapter is authoritative.
//
// Base URL: https://api2.frontapp.com
// Auth: Bearer token (API token from Front workspace settings)
//   Format: Authorization: Bearer {token}
// Docs: https://dev.frontapp.com/reference/introduction
// Rate limits: Varies by endpoint; Core API: ~50 req/s per token. Search endpoint: 40% of company rate limit.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FrontConfig {
  apiToken: string;
  baseUrl?: string;
}

export class FrontMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: FrontConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl ?? 'https://api2.frontapp.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'front',
      displayName: 'Front',
      version: '1.0.0',
      category: 'collaboration',
      keywords: [
        'front', 'frontapp', 'customer support', 'shared inbox', 'conversation',
        'helpdesk', 'messaging', 'contact', 'teammate', 'inbox', 'ticket',
        'comment', 'message', 'tag', 'channel', 'draft', 'analytics',
      ],
      toolNames: [
        'list_conversations', 'get_conversation', 'update_conversation', 'search_conversations',
        'list_conversation_messages', 'list_conversation_comments', 'create_comment',
        'send_message', 'create_draft',
        'list_contacts', 'get_contact', 'create_contact', 'update_contact',
        'list_inboxes', 'list_teammates', 'get_teammate',
        'list_tags', 'add_conversation_tag',
      ],
      description: 'Shared inbox and customer communication: manage conversations, messages, comments, contacts, inboxes, teammates, and tags.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_conversations',
        description: 'List conversations with optional filters for status, inbox, tag, or assignee; supports pagination',
        inputSchema: {
          type: 'object',
          properties: {
            inbox_id: {
              type: 'string',
              description: 'Filter by inbox ID (e.g. inb_123)',
            },
            tag_id: {
              type: 'string',
              description: 'Filter by tag ID (e.g. tag_123)',
            },
            teammate_id: {
              type: 'string',
              description: 'Filter by assigned teammate ID (e.g. tea_123)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: open, archived, deleted, all (default: open)',
            },
            limit: {
              type: 'number',
              description: 'Maximum conversations to return (max 100, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_conversation',
        description: 'Get full details of a specific conversation by ID, including status, assignee, inbox, and tags',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID (e.g. cnv_123)',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'update_conversation',
        description: 'Update conversation properties: assign a teammate, change status (open/archived), or update subject',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID (e.g. cnv_123)',
            },
            assignee_id: {
              type: 'string',
              description: 'Teammate ID to assign the conversation to (e.g. tea_123). Pass null to unassign.',
            },
            inbox_id: {
              type: 'string',
              description: 'Move the conversation to this inbox ID (e.g. inb_123)',
            },
            status: {
              type: 'string',
              description: 'New status for the conversation: open, archived, deleted',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'search_conversations',
        description: 'Search conversations using Front query syntax across subject, body, sender, assignee, and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string using Front query syntax (e.g. "subject:invoice is:open")',
            },
            limit: {
              type: 'number',
              description: 'Maximum conversations to return (max 100, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_conversation_messages',
        description: 'List all messages (inbound and outbound) within a specific conversation',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID (e.g. cnv_123)',
            },
            limit: {
              type: 'number',
              description: 'Maximum messages to return (max 100, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'list_conversation_comments',
        description: 'List internal comments (notes visible only to teammates) on a conversation',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID (e.g. cnv_123)',
            },
          },
          required: ['conversation_id'],
        },
      },
      {
        name: 'create_comment',
        description: 'Add an internal comment (private note) to a conversation, visible only to teammates',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID to comment on (e.g. cnv_123)',
            },
            author_id: {
              type: 'string',
              description: 'Teammate ID posting the comment (e.g. tea_123)',
            },
            body: {
              type: 'string',
              description: 'Comment text body',
            },
          },
          required: ['conversation_id', 'author_id', 'body'],
        },
      },
      {
        name: 'send_message',
        description: 'Reply to an existing conversation by sending an outbound message through the specified channel',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID to reply to (e.g. cnv_123)',
            },
            body: {
              type: 'string',
              description: 'Message body text',
            },
            author_id: {
              type: 'string',
              description: 'Teammate ID sending the message (e.g. tea_123). Defaults to API token owner.',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID to send through (e.g. cha_123)',
            },
            subject: {
              type: 'string',
              description: 'Email subject line (for email channel replies)',
            },
          },
          required: ['conversation_id', 'body'],
        },
      },
      {
        name: 'create_draft',
        description: 'Create a draft reply for a conversation without sending it; drafts are saved for later review',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID to create a draft for (e.g. cnv_123)',
            },
            author_id: {
              type: 'string',
              description: 'Teammate ID authoring the draft (e.g. tea_123)',
            },
            body: {
              type: 'string',
              description: 'Draft message body text',
            },
            channel_id: {
              type: 'string',
              description: 'Channel ID for the draft (e.g. cha_123)',
            },
            subject: {
              type: 'string',
              description: 'Subject line for email drafts',
            },
          },
          required: ['conversation_id', 'author_id', 'body'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts in the Front workspace with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum contacts to return (max 100, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get full details of a specific contact by ID, including handles and conversation history',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Contact ID (e.g. crd_123)',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in Front with name, handles (email/phone/etc.), and optional metadata',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the contact',
            },
            handles: {
              type: 'array',
              description: 'Array of contact handle objects, each with "handle" (string) and "source" (email, phone, twitter, etc.)',
              items: { type: 'object' },
            },
            description: {
              type: 'string',
              description: 'Notes or description for the contact',
            },
            is_spammer: {
              type: 'boolean',
              description: 'Mark the contact as a spammer (default: false)',
            },
          },
          required: ['handles'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update an existing contact name, description, spammer status, or add/remove handles',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Contact ID to update (e.g. crd_123)',
            },
            name: {
              type: 'string',
              description: 'Updated display name',
            },
            description: {
              type: 'string',
              description: 'Updated notes or description',
            },
            is_spammer: {
              type: 'boolean',
              description: 'Update spammer flag',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'list_inboxes',
        description: 'List all inboxes accessible to the API token, including channel and team assignments',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_teammates',
        description: 'List all teammates in the Front workspace with their availability and role information',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum teammates to return (max 100, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_teammate',
        description: 'Get details of a specific teammate by ID, including availability, role, and inbox assignments',
        inputSchema: {
          type: 'object',
          properties: {
            teammate_id: {
              type: 'string',
              description: 'Teammate ID (e.g. tea_123)',
            },
          },
          required: ['teammate_id'],
        },
      },
      {
        name: 'list_tags',
        description: 'List all tags defined in the Front workspace, including child tags and usage metadata',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum tags to return (max 100, default: 25)',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'add_conversation_tag',
        description: 'Add one or more tags to a conversation for categorization and routing',
        inputSchema: {
          type: 'object',
          properties: {
            conversation_id: {
              type: 'string',
              description: 'Conversation ID (e.g. cnv_123)',
            },
            tag_ids: {
              type: 'array',
              description: 'Array of tag IDs to add (e.g. ["tag_123", "tag_456"])',
              items: { type: 'string' },
            },
          },
          required: ['conversation_id', 'tag_ids'],
        },
      },
    ];
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Front API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Front API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { success: true }; }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async patch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Front API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { success: true }; }
    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listConversations(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 25;
    const status = (args.status as string) ?? 'open';
    const params = new URLSearchParams({ limit: String(limit), 'q[statuses][]': status });
    if (args.inbox_id) params.set('inbox_id', args.inbox_id as string);
    if (args.tag_id) params.set('tag_id', args.tag_id as string);
    if (args.teammate_id) params.set('teammate_id', args.teammate_id as string);
    if (args.page_token) params.set('page_token', args.page_token as string);
    return this.get(`/conversations?${params}`);
  }

  private async getConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    if (!id) return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    return this.get(`/conversations/${encodeURIComponent(id)}`);
  }

  private async updateConversation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    if (!id) return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if ('assignee_id' in args) body.assignee_id = args.assignee_id;
    if (args.inbox_id) body.inbox_id = args.inbox_id;
    if (args.status) body.status = args.status;
    return this.patch(`/conversations/${encodeURIComponent(id)}`, body);
  }

  private async searchConversations(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const limit = (args.limit as number) ?? 25;
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (args.page_token) params.set('page_token', args.page_token as string);
    return this.get(`/conversations/search?${params}`);
  }

  private async listConversationMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    if (!id) return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    const limit = (args.limit as number) ?? 25;
    const params = new URLSearchParams({ limit: String(limit) });
    if (args.page_token) params.set('page_token', args.page_token as string);
    return this.get(`/conversations/${encodeURIComponent(id)}/messages?${params}`);
  }

  private async listConversationComments(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    if (!id) return { content: [{ type: 'text', text: 'conversation_id is required' }], isError: true };
    return this.get(`/conversations/${encodeURIComponent(id)}/comments`);
  }

  private async createComment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    const authorId = args.author_id as string;
    const body = args.body as string;
    if (!id || !authorId || !body) {
      return { content: [{ type: 'text', text: 'conversation_id, author_id, and body are required' }], isError: true };
    }
    return this.post(`/conversations/${encodeURIComponent(id)}/comments`, { author_id: authorId, body });
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    const body = args.body as string;
    if (!id || !body) {
      return { content: [{ type: 'text', text: 'conversation_id and body are required' }], isError: true };
    }
    const payload: Record<string, unknown> = { body };
    if (args.author_id) payload.author_id = args.author_id;
    if (args.channel_id) payload.channel_id = args.channel_id;
    if (args.subject) payload.subject = args.subject;
    return this.post(`/conversations/${encodeURIComponent(id)}/messages`, payload);
  }

  private async createDraft(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    const authorId = args.author_id as string;
    const body = args.body as string;
    if (!id || !authorId || !body) {
      return { content: [{ type: 'text', text: 'conversation_id, author_id, and body are required' }], isError: true };
    }
    const payload: Record<string, unknown> = { author_id: authorId, body };
    if (args.channel_id) payload.channel_id = args.channel_id;
    if (args.subject) payload.subject = args.subject;
    return this.post(`/conversations/${encodeURIComponent(id)}/drafts`, payload);
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 25;
    const params = new URLSearchParams({ limit: String(limit) });
    if (args.page_token) params.set('page_token', args.page_token as string);
    return this.get(`/contacts?${params}`);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.contact_id as string;
    if (!id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.get(`/contacts/${encodeURIComponent(id)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const handles = args.handles;
    if (!handles || !Array.isArray(handles) || handles.length === 0) {
      return { content: [{ type: 'text', text: 'handles (array) is required' }], isError: true };
    }
    const payload: Record<string, unknown> = { handles };
    if (args.name) payload.name = args.name;
    if (args.description) payload.description = args.description;
    if (typeof args.is_spammer === 'boolean') payload.is_spammer = args.is_spammer;
    return this.post(`/contacts`, payload);
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.contact_id as string;
    if (!id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    const payload: Record<string, unknown> = {};
    if (args.name) payload.name = args.name;
    if (args.description) payload.description = args.description;
    if (typeof args.is_spammer === 'boolean') payload.is_spammer = args.is_spammer;
    return this.patch(`/contacts/${encodeURIComponent(id)}`, payload);
  }

  private async listInboxes(): Promise<ToolResult> {
    return this.get(`/inboxes`);
  }

  private async listTeammates(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 25;
    const params = new URLSearchParams({ limit: String(limit) });
    if (args.page_token) params.set('page_token', args.page_token as string);
    return this.get(`/teammates?${params}`);
  }

  private async getTeammate(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.teammate_id as string;
    if (!id) return { content: [{ type: 'text', text: 'teammate_id is required' }], isError: true };
    return this.get(`/teammates/${encodeURIComponent(id)}`);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 25;
    const params = new URLSearchParams({ limit: String(limit) });
    if (args.page_token) params.set('page_token', args.page_token as string);
    return this.get(`/tags?${params}`);
  }

  private async addConversationTag(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.conversation_id as string;
    const tagIds = args.tag_ids as string[];
    if (!id || !tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
      return { content: [{ type: 'text', text: 'conversation_id and tag_ids (array) are required' }], isError: true };
    }
    return this.post(`/conversations/${encodeURIComponent(id)}/tags`, { tag_ids: tagIds });
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_conversations':          return await this.listConversations(args);
        case 'get_conversation':            return await this.getConversation(args);
        case 'update_conversation':         return await this.updateConversation(args);
        case 'search_conversations':        return await this.searchConversations(args);
        case 'list_conversation_messages':  return await this.listConversationMessages(args);
        case 'list_conversation_comments':  return await this.listConversationComments(args);
        case 'create_comment':              return await this.createComment(args);
        case 'send_message':                return await this.sendMessage(args);
        case 'create_draft':                return await this.createDraft(args);
        case 'list_contacts':               return await this.listContacts(args);
        case 'get_contact':                 return await this.getContact(args);
        case 'create_contact':              return await this.createContact(args);
        case 'update_contact':              return await this.updateContact(args);
        case 'list_inboxes':                return await this.listInboxes();
        case 'list_teammates':              return await this.listTeammates(args);
        case 'get_teammate':                return await this.getTeammate(args);
        case 'list_tags':                   return await this.listTags(args);
        case 'add_conversation_tag':        return await this.addConversationTag(args);
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
}
