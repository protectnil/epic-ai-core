/**
 * Gmail MCP Server
 * Gmail API v1 adapter for reading, searching, and sending email
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */
import { ToolDefinition, ToolResult } from './types.js';

interface GmailConfig {
  accessToken: string;
  userId?: string;
}

export class GmailMCPServer {
  private readonly baseUrl = 'https://gmail.googleapis.com/gmail/v1';
  private readonly headers: Record<string, string>;
  private readonly userId: string;

  constructor(config: GmailConfig) {
    this.userId = config.userId ?? 'me';
    this.headers = {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_messages',
        description: 'List messages in the Gmail mailbox',
        inputSchema: {
          type: 'object',
          properties: {
            maxResults: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 20)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination',
            },
            labelIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by label IDs (e.g., ["INBOX", "UNREAD"])',
            },
            q: {
              type: 'string',
              description: 'Gmail search query string',
            },
          },
        },
      },
      {
        name: 'get_message',
        description: 'Get the full content of a specific Gmail message',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'The Gmail message ID',
            },
            format: {
              type: 'string',
              description: 'Message format: full, metadata, minimal, or raw (default: full)',
            },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'send_message',
        description: 'Send an email message via Gmail',
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
              description: 'Plain text email body',
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
        name: 'list_labels',
        description: 'List all labels in the Gmail mailbox',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_messages',
        description: 'Search Gmail messages using Gmail search syntax',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Gmail search query (e.g., "from:user@example.com subject:invoice")',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
            pageToken: {
              type: 'string',
              description: 'Page token for pagination',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_messages':
          return await this.listMessages(
            args.maxResults as number | undefined,
            args.pageToken as string | undefined,
            args.labelIds as string[] | undefined,
            args.q as string | undefined
          );
        case 'get_message':
          return await this.getMessage(
            args.messageId as string,
            args.format as string | undefined
          );
        case 'send_message':
          return await this.sendMessage(
            args.to as string,
            args.subject as string,
            args.body as string,
            args.cc as string | undefined,
            args.bcc as string | undefined
          );
        case 'list_labels':
          return await this.listLabels();
        case 'search_messages':
          return await this.searchMessages(
            args.query as string,
            args.maxResults as number | undefined,
            args.pageToken as string | undefined
          );
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  }

  private async listMessages(
    maxResults?: number,
    pageToken?: string,
    labelIds?: string[],
    q?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('maxResults', String(maxResults ?? 20));
    if (pageToken) params.append('pageToken', pageToken);
    if (labelIds) labelIds.forEach(id => params.append('labelIds', id));
    if (q) params.append('q', q);

    const response = await fetch(
      `${this.baseUrl}/users/${this.userId}/messages?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Gmail returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getMessage(messageId: string, format?: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('format', format ?? 'full');

    const response = await fetch(
      `${this.baseUrl}/users/${this.userId}/messages/${messageId}?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Gmail returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async sendMessage(
    to: string,
    subject: string,
    body: string,
    cc?: string,
    bcc?: string
  ): Promise<ToolResult> {
    const lines = [
      `To: ${to}`,
      ...(cc ? [`Cc: ${cc}`] : []),
      ...(bcc ? [`Bcc: ${bcc}`] : []),
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ];
    const raw = Buffer.from(lines.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(
      `${this.baseUrl}/users/${this.userId}/messages/send`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ raw }),
      }
    );
    if (!response.ok) throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Gmail returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listLabels(): Promise<ToolResult> {
    const response = await fetch(
      `${this.baseUrl}/users/${this.userId}/labels`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Gmail returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async searchMessages(
    query: string,
    maxResults?: number,
    pageToken?: string
  ): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('maxResults', String(maxResults ?? 20));
    if (pageToken) params.append('pageToken', pageToken);

    const response = await fetch(
      `${this.baseUrl}/users/${this.userId}/messages?${params}`,
      { method: 'GET', headers: this.headers }
    );
    if (!response.ok) throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Gmail returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
