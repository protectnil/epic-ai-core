/**
 * Gmail MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/googleworkspace/cli — transport: stdio, auth: OAuth2
// Vendor: Google (official). Last commit: 2026-03. Maintained: yes.
// The official Google Workspace CLI (googleworkspace/cli, Apache-2.0) exposes Gmail and other
// Workspace services via `gws mcp -s gmail` over stdio. Covers 100+ tools dynamically built
// from Google Discovery Service (Drive, Docs, Calendar, Sheets, Chat, Gmail, etc.).
// MCP tool count: 100+ (full Workspace surface). Our adapter covers: 20 tools (Gmail only).
// Decision: use-both — MCP covers full Workspace; our adapter is the Gmail-scoped REST fallback.
//   MCP-sourced (via gws mcp): all 100+ Workspace tools including Gmail
//   REST-sourced (this adapter): list_messages, get_message, search_messages, send_message,
//     reply_to_message, create_draft, list_drafts, get_draft, send_draft, delete_draft,
//     trash_message, delete_message, modify_message_labels, list_threads, get_thread,
//     trash_thread, modify_thread_labels, list_labels, create_label, get_profile
//   Combined coverage: use vendor MCP for full Workspace; this adapter for air-gapped/Gmail-only.
//
// Base URL: https://gmail.googleapis.com/gmail/v1
// Auth: OAuth2 Bearer token (scope: https://mail.google.com/ or gmail.modify / gmail.readonly)
// Docs: https://developers.google.com/workspace/gmail/api/v1/reference
// Rate limits: 250 quota units/second per user; sending is limited per Google Workspace policy.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GmailConfig {
  accessToken: string;
  userId?: string;
}

export class GmailMCPServer extends MCPAdapterBase {
  private readonly baseUrl = 'https://gmail.googleapis.com/gmail/v1';
  private readonly userId: string;
  private readonly token: string;

  constructor(config: GmailConfig) {
    super();
    this.token = config.accessToken;
    this.userId = config.userId ?? 'me';
  }

  static catalog() {
    return {
      name: 'gmail',
      displayName: 'Gmail',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: [
        'gmail', 'google', 'email', 'mail', 'inbox', 'message', 'thread',
        'draft', 'label', 'send', 'search', 'attachment', 'workspace',
      ],
      toolNames: [
        'list_messages',
        'get_message',
        'search_messages',
        'send_message',
        'reply_to_message',
        'create_draft',
        'list_drafts',
        'get_draft',
        'send_draft',
        'delete_draft',
        'trash_message',
        'delete_message',
        'modify_message_labels',
        'list_threads',
        'get_thread',
        'trash_thread',
        'modify_thread_labels',
        'list_labels',
        'create_label',
        'get_profile',
      ],
      description: 'Gmail email management: read, search, send, reply, draft, label, thread, and delete messages. Full Gmail API v1 coverage.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_messages',
        description: 'List messages in the Gmail mailbox with optional label filters and search query. Returns message IDs and thread IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 20, max: 500)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination from a previous response',
            },
            labelIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by label IDs (e.g., ["INBOX", "UNREAD"]). System labels: INBOX, SENT, DRAFT, SPAM, TRASH, UNREAD, STARRED.',
            },
            q: {
              type: 'string',
              description: 'Gmail search query (e.g., "from:user@example.com subject:meeting is:unread")',
            },
            includeSpamTrash: {
              type: 'boolean',
              description: 'Whether to include messages from SPAM and TRASH (default: false)',
            },
          },
        },
      },
      {
        name: 'get_message',
        description: 'Get the full content of a specific Gmail message including headers, body, and attachments metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'Gmail message ID (from list_messages or search_messages)',
            },
            format: {
              type: 'string',
              description: 'Message format: full (default), metadata (headers only), minimal (IDs+labels), raw (RFC 2822)',
            },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'search_messages',
        description: 'Search Gmail messages using Gmail query syntax. Supports operators like from:, to:, subject:, is:unread, has:attachment, after:, before:.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Gmail search query (e.g., "from:boss@company.com subject:Q4 after:2026/01/01")',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20, max: 500)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'send_message',
        description: 'Send a new email message via Gmail. Supports To, CC, BCC, and plain-text or HTML body.',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient email address or comma-separated list',
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
            },
            body: {
              type: 'string',
              description: 'Email body text (plain text)',
            },
            cc: {
              type: 'string',
              description: 'CC email addresses (comma-separated)',
            },
            bcc: {
              type: 'string',
              description: 'BCC email addresses (comma-separated)',
            },
            htmlBody: {
              type: 'boolean',
              description: 'If true, body is sent as text/html instead of text/plain (default: false)',
            },
          },
          required: ['to', 'subject', 'body'],
        },
      },
      {
        name: 'reply_to_message',
        description: 'Reply to an existing Gmail message, threading the reply into the same conversation.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'Gmail message ID to reply to',
            },
            body: {
              type: 'string',
              description: 'Reply body text',
            },
            replyAll: {
              type: 'boolean',
              description: 'If true, reply-all (include all original recipients). Default: false (reply to sender only).',
            },
          },
          required: ['messageId', 'body'],
        },
      },
      {
        name: 'create_draft',
        description: 'Save a new draft email in Gmail. The draft can be sent later via send_draft.',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient email address',
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
            },
            body: {
              type: 'string',
              description: 'Email body text',
            },
            cc: {
              type: 'string',
              description: 'CC email addresses (comma-separated)',
            },
            bcc: {
              type: 'string',
              description: 'BCC email addresses (comma-separated)',
            },
          },
          required: ['to', 'subject', 'body'],
        },
      },
      {
        name: 'list_drafts',
        description: 'List all draft messages in the Gmail mailbox with their IDs and message summaries.',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: {
              type: 'number',
              description: 'Maximum number of drafts to return (default: 20)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination',
            },
            q: {
              type: 'string',
              description: 'Search query to filter drafts',
            },
          },
        },
      },
      {
        name: 'get_draft',
        description: 'Get the full content of a specific Gmail draft by draft ID.',
        inputSchema: {
          type: 'object',
          properties: {
            draftId: {
              type: 'string',
              description: 'Gmail draft ID (from list_drafts)',
            },
            format: {
              type: 'string',
              description: 'Message format: full (default), metadata, minimal, raw',
            },
          },
          required: ['draftId'],
        },
      },
      {
        name: 'send_draft',
        description: 'Send an existing Gmail draft immediately.',
        inputSchema: {
          type: 'object',
          properties: {
            draftId: {
              type: 'string',
              description: 'Gmail draft ID to send',
            },
          },
          required: ['draftId'],
        },
      },
      {
        name: 'delete_draft',
        description: 'Permanently delete a Gmail draft. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            draftId: {
              type: 'string',
              description: 'Gmail draft ID to delete',
            },
          },
          required: ['draftId'],
        },
      },
      {
        name: 'trash_message',
        description: 'Move a Gmail message to Trash. The message can be recovered from Trash within 30 days.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'Gmail message ID to trash',
            },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'delete_message',
        description: 'Permanently delete a Gmail message. This action cannot be undone — prefer trash_message for recoverable deletion.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'Gmail message ID to permanently delete',
            },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'modify_message_labels',
        description: 'Add or remove labels on a Gmail message, including marking as read/unread or starring.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'Gmail message ID to modify',
            },
            addLabelIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Label IDs to add (e.g., ["UNREAD", "STARRED", "INBOX"])',
            },
            removeLabelIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Label IDs to remove (e.g., ["UNREAD"] to mark as read)',
            },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'list_threads',
        description: 'List email threads (conversations) in the Gmail mailbox with optional label and search filters.',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: {
              type: 'number',
              description: 'Maximum number of threads to return (default: 20)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination',
            },
            labelIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by label IDs (e.g., ["INBOX"])',
            },
            q: {
              type: 'string',
              description: 'Gmail search query to filter threads',
            },
          },
        },
      },
      {
        name: 'get_thread',
        description: 'Get all messages in a Gmail thread (conversation) by thread ID.',
        inputSchema: {
          type: 'object',
          properties: {
            threadId: {
              type: 'string',
              description: 'Gmail thread ID (from list_threads or message.threadId)',
            },
            format: {
              type: 'string',
              description: 'Message format: full (default), metadata, minimal',
            },
          },
          required: ['threadId'],
        },
      },
      {
        name: 'trash_thread',
        description: 'Move all messages in a Gmail thread to Trash.',
        inputSchema: {
          type: 'object',
          properties: {
            threadId: {
              type: 'string',
              description: 'Gmail thread ID to move to Trash',
            },
          },
          required: ['threadId'],
        },
      },
      {
        name: 'modify_thread_labels',
        description: 'Add or remove labels on all messages in a Gmail thread (e.g., mark entire thread as read).',
        inputSchema: {
          type: 'object',
          properties: {
            threadId: {
              type: 'string',
              description: 'Gmail thread ID to modify',
            },
            addLabelIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Label IDs to add to all messages in the thread',
            },
            removeLabelIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Label IDs to remove from all messages in the thread',
            },
          },
          required: ['threadId'],
        },
      },
      {
        name: 'list_labels',
        description: 'List all labels in the Gmail mailbox, including system labels (INBOX, SENT, TRASH) and user-created labels.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_label',
        description: 'Create a new custom label in Gmail for organizing messages.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Label name (supports nesting with "/" separator, e.g., "Work/Urgent")',
            },
            messageListVisibility: {
              type: 'string',
              description: 'Whether to show the label in the message list: show (default) or hide',
            },
            labelListVisibility: {
              type: 'string',
              description: 'Whether to show the label in the label list: labelShow (default), labelShowIfUnread, labelHide',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_profile',
        description: 'Get the Gmail profile for the authenticated user, including email address, message count, and history ID.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_messages':
          return await this.listMessages(args);
        case 'get_message':
          return await this.getMessage(args);
        case 'search_messages':
          return await this.searchMessages(args);
        case 'send_message':
          return await this.sendMessage(args);
        case 'reply_to_message':
          return await this.replyToMessage(args);
        case 'create_draft':
          return await this.createDraft(args);
        case 'list_drafts':
          return await this.listDrafts(args);
        case 'get_draft':
          return await this.getDraft(args);
        case 'send_draft':
          return await this.sendDraft(args);
        case 'delete_draft':
          return await this.deleteDraft(args);
        case 'trash_message':
          return await this.trashMessage(args);
        case 'delete_message':
          return await this.deleteMessage(args);
        case 'modify_message_labels':
          return await this.modifyMessageLabels(args);
        case 'list_threads':
          return await this.listThreads(args);
        case 'get_thread':
          return await this.getThread(args);
        case 'trash_thread':
          return await this.trashThread(args);
        case 'modify_thread_labels':
          return await this.modifyThreadLabels(args);
        case 'list_labels':
          return await this.listLabels();
        case 'create_label':
          return await this.createLabel(args);
        case 'get_profile':
          return await this.getProfile();
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private buildRawMessage(fields: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    htmlBody?: boolean;
    inReplyTo?: string;
    references?: string;
  }): string {
    const contentType = fields.htmlBody ? 'text/html' : 'text/plain';
    const lines = [
      `To: ${fields.to}`,
      ...(fields.cc ? [`Cc: ${fields.cc}`] : []),
      ...(fields.bcc ? [`Bcc: ${fields.bcc}`] : []),
      `Subject: ${fields.subject}`,
      `Content-Type: ${contentType}; charset=utf-8`,
      `MIME-Version: 1.0`,
      ...(fields.inReplyTo ? [`In-Reply-To: ${fields.inReplyTo}`] : []),
      ...(fields.references ? [`References: ${fields.references}`] : []),
      '',
      fields.body,
    ];
    return Buffer.from(lines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('maxResults', String((args.maxResults as number) ?? 20));
    if (args.pageToken) params.append('pageToken', args.pageToken as string);
    if (args.q) params.append('q', args.q as string);
    if (args.includeSpamTrash) params.append('includeSpamTrash', 'true');
    const labelIds = args.labelIds as string[] | undefined;
    if (labelIds) labelIds.forEach(id => params.append('labelIds', id));

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/messages?${params}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    if (!messageId) {
      return { content: [{ type: 'text', text: 'messageId is required' }], isError: true };
    }
    const params = new URLSearchParams({ format: (args.format as string) ?? 'full' });
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/messages/${encodeURIComponent(messageId)}?${params}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) {
      return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    }
    const params = new URLSearchParams({ q: query });
    params.append('maxResults', String((args.maxResults as number) ?? 20));
    if (args.pageToken) params.append('pageToken', args.pageToken as string);
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/messages?${params}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to || !args.subject || !args.body) {
      return { content: [{ type: 'text', text: 'to, subject, and body are required' }], isError: true };
    }
    const raw = this.buildRawMessage({
      to: args.to as string,
      subject: args.subject as string,
      body: args.body as string,
      cc: args.cc as string | undefined,
      bcc: args.bcc as string | undefined,
      htmlBody: args.htmlBody as boolean | undefined,
    });
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/messages/send`,
      { method: 'POST', headers: this.headers, body: JSON.stringify({ raw }) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async replyToMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    const body = args.body as string;
    if (!messageId || !body) {
      return { content: [{ type: 'text', text: 'messageId and body are required' }], isError: true };
    }
    // Fetch original message for threading headers
    const orig = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References`,
      { headers: this.headers },
    );
    if (!orig.ok) {
      return { content: [{ type: 'text', text: `Failed to fetch original message: ${orig.status} ${orig.statusText}` }], isError: true };
    }
    const origData = await orig.json() as { payload?: { headers?: Array<{ name: string; value: string }> }; threadId?: string };
    const hdrs: Record<string, string> = {};
    for (const h of origData.payload?.headers ?? []) {
      hdrs[h.name.toLowerCase()] = h.value;
    }
    const toAddresses = args.replyAll
      ? [hdrs['from'], hdrs['to'], hdrs['cc']].filter(Boolean).join(', ')
      : hdrs['from'] ?? '';
    const replySubject = hdrs['subject']?.startsWith('Re:') ? hdrs['subject'] : `Re: ${hdrs['subject'] ?? ''}`;
    const messageIdHeader = hdrs['message-id'] ?? '';
    const references = [hdrs['references'], messageIdHeader].filter(Boolean).join(' ');
    const raw = this.buildRawMessage({
      to: toAddresses,
      subject: replySubject,
      body,
      inReplyTo: messageIdHeader,
      references,
    });
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/messages/send`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ raw, threadId: origData.threadId }),
      },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createDraft(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to || !args.subject || !args.body) {
      return { content: [{ type: 'text', text: 'to, subject, and body are required' }], isError: true };
    }
    const raw = this.buildRawMessage({
      to: args.to as string,
      subject: args.subject as string,
      body: args.body as string,
      cc: args.cc as string | undefined,
      bcc: args.bcc as string | undefined,
    });
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/drafts`,
      { method: 'POST', headers: this.headers, body: JSON.stringify({ message: { raw } }) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDrafts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('maxResults', String((args.maxResults as number) ?? 20));
    if (args.pageToken) params.append('pageToken', args.pageToken as string);
    if (args.q) params.append('q', args.q as string);
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/drafts?${params}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDraft(args: Record<string, unknown>): Promise<ToolResult> {
    const draftId = args.draftId as string;
    if (!draftId) {
      return { content: [{ type: 'text', text: 'draftId is required' }], isError: true };
    }
    const params = new URLSearchParams({ format: (args.format as string) ?? 'full' });
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/drafts/${encodeURIComponent(draftId)}?${params}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendDraft(args: Record<string, unknown>): Promise<ToolResult> {
    const draftId = args.draftId as string;
    if (!draftId) {
      return { content: [{ type: 'text', text: 'draftId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/drafts/send`,
      { method: 'POST', headers: this.headers, body: JSON.stringify({ id: draftId }) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteDraft(args: Record<string, unknown>): Promise<ToolResult> {
    const draftId = args.draftId as string;
    if (!draftId) {
      return { content: [{ type: 'text', text: 'draftId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/drafts/${encodeURIComponent(draftId)}`,
      { method: 'DELETE', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, draftId }) }], isError: false };
  }

  private async trashMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    if (!messageId) {
      return { content: [{ type: 'text', text: 'messageId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/messages/${encodeURIComponent(messageId)}/trash`,
      { method: 'POST', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    if (!messageId) {
      return { content: [{ type: 'text', text: 'messageId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/messages/${encodeURIComponent(messageId)}`,
      { method: 'DELETE', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, messageId }) }], isError: false };
  }

  private async modifyMessageLabels(args: Record<string, unknown>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    if (!messageId) {
      return { content: [{ type: 'text', text: 'messageId is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.addLabelIds) body.addLabelIds = args.addLabelIds;
    if (args.removeLabelIds) body.removeLabelIds = args.removeLabelIds;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/messages/${encodeURIComponent(messageId)}/modify`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listThreads(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('maxResults', String((args.maxResults as number) ?? 20));
    if (args.pageToken) params.append('pageToken', args.pageToken as string);
    if (args.q) params.append('q', args.q as string);
    const labelIds = args.labelIds as string[] | undefined;
    if (labelIds) labelIds.forEach(id => params.append('labelIds', id));
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/threads?${params}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getThread(args: Record<string, unknown>): Promise<ToolResult> {
    const threadId = args.threadId as string;
    if (!threadId) {
      return { content: [{ type: 'text', text: 'threadId is required' }], isError: true };
    }
    const params = new URLSearchParams({ format: (args.format as string) ?? 'full' });
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/threads/${encodeURIComponent(threadId)}?${params}`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async trashThread(args: Record<string, unknown>): Promise<ToolResult> {
    const threadId = args.threadId as string;
    if (!threadId) {
      return { content: [{ type: 'text', text: 'threadId is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/threads/${encodeURIComponent(threadId)}/trash`,
      { method: 'POST', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async modifyThreadLabels(args: Record<string, unknown>): Promise<ToolResult> {
    const threadId = args.threadId as string;
    if (!threadId) {
      return { content: [{ type: 'text', text: 'threadId is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.addLabelIds) body.addLabelIds = args.addLabelIds;
    if (args.removeLabelIds) body.removeLabelIds = args.removeLabelIds;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/threads/${encodeURIComponent(threadId)}/modify`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listLabels(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/labels`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createLabel(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    const body: Record<string, unknown> = { name };
    if (args.messageListVisibility) body.messageListVisibility = args.messageListVisibility;
    if (args.labelListVisibility) body.labelListVisibility = args.labelListVisibility;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/labels`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(body) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getProfile(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/users/${this.userId}/profile`,
      { headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Gmail API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
