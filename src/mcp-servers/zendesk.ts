/** Zendesk MCP Server
 * Provides access to Zendesk Support tickets, searches, and users via the Zendesk REST API
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface ZendeskConfig {
  email: string;
  apiToken: string;
  subdomain: string;
  baseUrl?: string;
}

export class ZendeskMCPServer {
  private readonly email: string;
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: ZendeskConfig) {
    this.email = config.email;
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || `https://${config.subdomain}.zendesk.com/api/v2`;
  }

  private get authHeader(): string {
    const credentials = Buffer.from(`${this.email}/token:${this.apiToken}`).toString('base64');
    return `Basic ${credentials}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_tickets',
        description: 'List Zendesk support tickets with optional status filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by ticket status: new, open, pending, hold, solved, closed',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of tickets per page (max 100, default: 25)',
            },
          },
        },
      },
      {
        name: 'get_ticket',
        description: 'Retrieve a single Zendesk ticket by ticket ID',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'number',
              description: 'The numeric Zendesk ticket ID',
            },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'create_ticket',
        description: 'Create a new Zendesk support ticket',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Ticket subject line',
            },
            body: {
              type: 'string',
              description: 'Ticket description / initial comment body',
            },
            requester_email: {
              type: 'string',
              description: 'Email address of the ticket requester',
            },
            priority: {
              type: 'string',
              description: 'Ticket priority: low, normal, high, urgent',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tags to apply to the ticket',
            },
          },
          required: ['subject', 'body'],
        },
      },
      {
        name: 'search_tickets',
        description: 'Search Zendesk tickets using the Zendesk search syntax',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Zendesk search query (e.g. "status:open priority:high type:ticket")',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default: 25)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_users',
        description: 'List Zendesk users (agents and end users) with optional role filtering',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Filter by role: end-user, agent, admin',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of users per page (max 100, default: 25)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_tickets': {
          const params = new URLSearchParams();
          if (args.status) params.set('status', args.status as string);
          if (args.page) params.set('page', String(args.page));
          if (args.per_page) params.set('per_page', String(args.per_page));
          const qs = params.toString();
          const response = await fetch(`${this.baseUrl}/tickets${qs ? `?${qs}` : ''}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list tickets: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zendesk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_ticket': {
          const ticketId = args.ticket_id as number;
          if (ticketId === undefined || ticketId === null) {
            return { content: [{ type: 'text', text: 'ticket_id is required' }], isError: true };
          }
          const response = await fetch(`${this.baseUrl}/tickets/${ticketId}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to get ticket: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zendesk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'create_ticket': {
          const subject = args.subject as string;
          const body = args.body as string;
          if (!subject || !body) {
            return { content: [{ type: 'text', text: 'subject and body are required' }], isError: true };
          }
          const ticket: Record<string, unknown> = {
            subject,
            comment: { body },
          };
          if (args.requester_email) ticket.requester = { email: args.requester_email };
          if (args.priority) ticket.priority = args.priority;
          if (args.tags) ticket.tags = args.tags;
          const response = await fetch(
            `${this.baseUrl}/tickets`,
            { method: 'POST', headers, body: JSON.stringify({ ticket }) }
          );
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to create ticket: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zendesk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_tickets': {
          const query = args.query as string;
          if (!query) {
            return { content: [{ type: 'text', text: 'query is required' }], isError: true };
          }
          const params = new URLSearchParams({ query });
          if (args.page) params.set('page', String(args.page));
          if (args.per_page) params.set('per_page', String(args.per_page));
          const response = await fetch(`${this.baseUrl}/search?${params.toString()}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to search tickets: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zendesk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_users': {
          const params = new URLSearchParams();
          if (args.role) params.set('role', args.role as string);
          if (args.page) params.set('page', String(args.page));
          if (args.per_page) params.set('per_page', String(args.per_page));
          const qs = params.toString();
          const response = await fetch(`${this.baseUrl}/users${qs ? `?${qs}` : ''}`, { method: 'GET', headers });
          if (!response.ok) {
            return { content: [{ type: 'text', text: `Failed to list users: ${response.statusText}` }], isError: true };
          }
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Zendesk returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

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
