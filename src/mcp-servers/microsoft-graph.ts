/**
 * Microsoft Graph MCP Server
 * Provides access to Microsoft Graph API v1.0 for mail, calendar, and file management
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface MicrosoftGraphConfig {
  accessToken: string;
  baseUrl?: string;
}

export class MicrosoftGraphMCPServer {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: MicrosoftGraphConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://graph.microsoft.com/v1.0';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_messages',
        description: 'List email messages from the authenticated user\'s mailbox',
        inputSchema: {
          type: 'object',
          properties: {
            folder: {
              type: 'string',
              description: 'Mailbox folder (default: inbox). Supports well-known names: inbox, sentitems, drafts, deleteditems.',
            },
            top: {
              type: 'number',
              description: 'Number of messages to return (max 999, default: 10)',
            },
            skip: {
              type: 'number',
              description: 'Number of messages to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'OData filter expression (e.g. isRead eq false)',
            },
            search: {
              type: 'string',
              description: 'KQL search query string',
            },
          },
        },
      },
      {
        name: 'send_mail',
        description: 'Send an email on behalf of the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Email subject',
            },
            body: {
              type: 'string',
              description: 'Email body content',
            },
            body_type: {
              type: 'string',
              description: 'Body content type: Text or HTML (default: Text)',
            },
            to_recipients: {
              type: 'array',
              description: 'Array of recipient email address strings',
            },
            cc_recipients: {
              type: 'array',
              description: 'Array of CC recipient email address strings',
            },
            save_to_sent_items: {
              type: 'boolean',
              description: 'Whether to save a copy in Sent Items (default: true)',
            },
          },
          required: ['subject', 'body', 'to_recipients'],
        },
      },
      {
        name: 'list_events',
        description: 'List calendar events for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: 'Number of events to return (max 999, default: 10)',
            },
            skip: {
              type: 'number',
              description: 'Number of events to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'OData filter expression (e.g. start/dateTime ge \'2026-01-01T00:00:00\')',
            },
            start: {
              type: 'string',
              description: 'Start of time range (ISO 8601 datetime) for calendarView',
            },
            end: {
              type: 'string',
              description: 'End of time range (ISO 8601 datetime) for calendarView',
            },
          },
        },
      },
      {
        name: 'list_files',
        description: 'List files and folders from OneDrive',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'Drive item ID of a folder to list. Omit to list the root.',
            },
            top: {
              type: 'number',
              description: 'Number of items to return (max 999, default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Number of items to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'search_content',
        description: 'Search across Microsoft 365 content (mail, files, sites)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string (KQL syntax supported)',
            },
            entity_types: {
              type: 'array',
              description: 'Content types to search: message, driveItem, listItem, site, event (default: [message, driveItem])',
            },
            from: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Number of results to return (max 500, default: 25)',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      switch (name) {
        case 'list_messages': {
          const folder = (args.folder as string) || 'inbox';
          const top = (args.top as number) || 10;
          const skip = (args.skip as number) || 0;

          let url = `${this.baseUrl}/me/mailFolders/${encodeURIComponent(folder)}/messages?$top=${top}&$skip=${skip}`;
          if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;
          if (args.search) url += `&$search=${encodeURIComponent(`"${args.search as string}"`)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list messages: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Microsoft Graph returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'send_mail': {
          const subject = args.subject as string;
          const body = args.body as string;
          const toRecipients = args.to_recipients as string[];

          if (!subject || !body || !toRecipients || toRecipients.length === 0) {
            return {
              content: [{ type: 'text', text: 'subject, body, and to_recipients are required' }],
              isError: true,
            };
          }

          const bodyType = (args.body_type as string) || 'Text';
          const saveToSentItems = typeof args.save_to_sent_items === 'boolean' ? args.save_to_sent_items : true;

          const message: Record<string, unknown> = {
            subject,
            body: { contentType: bodyType, content: body },
            toRecipients: toRecipients.map((addr) => ({ emailAddress: { address: addr } })),
          };

          if (args.cc_recipients) {
            message.ccRecipients = (args.cc_recipients as string[]).map((addr) => ({
              emailAddress: { address: addr },
            }));
          }

          const response = await fetch(`${this.baseUrl}/me/sendMail`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ message, saveToSentItems }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to send mail: ${response.statusText}` }],
              isError: true,
            };
          }

          return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }, null, 2) }], isError: false };
        }

        case 'list_events': {
          const top = (args.top as number) || 10;
          const skip = (args.skip as number) || 0;

          let url: string;
          if (args.start && args.end) {
            url = `${this.baseUrl}/me/calendarView?startDateTime=${encodeURIComponent(args.start as string)}&endDateTime=${encodeURIComponent(args.end as string)}&$top=${top}&$skip=${skip}`;
          } else {
            url = `${this.baseUrl}/me/events?$top=${top}&$skip=${skip}`;
            if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;
          }

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list events: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Microsoft Graph returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_files': {
          const top = (args.top as number) || 20;
          const skip = (args.skip as number) || 0;

          const itemId = args.item_id as string | undefined;
          const url = itemId
            ? `${this.baseUrl}/me/drive/items/${encodeURIComponent(itemId)}/children?$top=${top}&$skip=${skip}`
            : `${this.baseUrl}/me/drive/root/children?$top=${top}&$skip=${skip}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list files: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Microsoft Graph returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_content': {
          const query = args.query as string;

          if (!query) {
            return {
              content: [{ type: 'text', text: 'query is required' }],
              isError: true,
            };
          }

          const entityTypes = (args.entity_types as string[]) || ['message', 'driveItem'];
          const from = (args.from as number) || 0;
          const size = (args.size as number) || 25;

          const response = await fetch(`${this.baseUrl}/search/query`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              requests: [
                {
                  entityTypes,
                  query: { queryString: query },
                  from,
                  size,
                },
              ],
            }),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search content: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`Microsoft Graph returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

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
}
