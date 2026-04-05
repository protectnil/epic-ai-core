/**
 * Microsoft Graph MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/microsoft/EnterpriseMCP — transport: streamable-HTTP, auth: delegated OAuth2
// The Microsoft EnterpriseMCP server exposes 3 tools (suggest_queries, get, list_properties) using
// delegated permissions only. It is read-only and does not support send_mail, create_event,
// reply_to_message, or file upload operations.
// Community servers (elyxlz/microsoft-mcp, Softeria/ms-365-mcp-server, eesb99/office365-mcp-server)
// exist but are not officially maintained by Microsoft.
// Recommendation: Use microsoft/EnterpriseMCP for interactive read-only scenarios.
//   Use this adapter for service-to-service automation with delegated or app-only tokens.
//
// Base URL: https://graph.microsoft.com/v1.0
//   National clouds: https://graph.microsoft.us/v1.0 (US Gov), https://graph.microsoft.de/v1.0 (DE)
// Auth: Bearer token (delegated user token from MSAL or OAuth2 auth code flow)
//   App-only tokens work for mail/calendar only with Mail.Read application permission.
// Docs: https://learn.microsoft.com/en-us/graph/api/overview?view=graph-rest-1.0
// Rate limits: Per-resource throttling. Service limit 10,000 requests/10 min per tenant.
// Note: $search and $filter are mutually exclusive on messages/events endpoints.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MicrosoftGraphConfig {
  accessToken: string;
  baseUrl?: string;
}

export class MicrosoftGraphMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: MicrosoftGraphConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://graph.microsoft.com/v1.0').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'microsoft-graph',
      displayName: 'Microsoft Graph',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: [
        'microsoft', 'graph', 'outlook', 'mail', 'email', 'calendar', 'events',
        'onedrive', 'sharepoint', 'files', 'office365', 'm365', 'search',
        'contacts', 'people', 'presence', 'teams', 'tasks', 'planner',
      ],
      toolNames: [
        'list_messages', 'get_message', 'send_mail', 'reply_to_message',
        'move_message', 'delete_message', 'list_mail_folders',
        'list_events', 'get_event', 'create_event', 'update_event', 'delete_event',
        'list_files', 'get_file_metadata', 'search_content',
        'list_contacts', 'get_presence', 'list_people',
      ],
      description: 'Access Microsoft 365 via Graph API: read and send Outlook mail, manage calendar events, list OneDrive files, search across M365 content, query contacts and presence.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_messages',
        description: 'List email messages from the authenticated user\'s mailbox folder. Supports OData $filter, $search (mutually exclusive), $top, $skip, and $select.',
        inputSchema: {
          type: 'object',
          properties: {
            folder: {
              type: 'string',
              description: 'Mailbox folder name (default: inbox). Well-known names: inbox, sentitems, drafts, deleteditems, junkemail.',
            },
            top: {
              type: 'number',
              description: 'Number of messages to return (max 999, default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Number of messages to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "isRead eq false" or "importance eq \'high\'"). Cannot be combined with search.',
            },
            search: {
              type: 'string',
              description: 'KQL search query string (e.g. "from:alice@contoso.com"). Cannot be combined with filter.',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return (e.g. id,subject,from,receivedDateTime,isRead)',
            },
          },
        },
      },
      {
        name: 'get_message',
        description: 'Get a single email message by its ID from the authenticated user\'s mailbox.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'Message ID',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'send_mail',
        description: 'Send an email on behalf of the authenticated user via Microsoft Graph.',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Email subject line',
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
              description: 'Array of CC recipient email address strings (optional)',
            },
            bcc_recipients: {
              type: 'array',
              description: 'Array of BCC recipient email address strings (optional)',
            },
            save_to_sent_items: {
              type: 'boolean',
              description: 'Save a copy in Sent Items (default: true)',
            },
          },
          required: ['subject', 'body', 'to_recipients'],
        },
      },
      {
        name: 'reply_to_message',
        description: 'Reply to an email message in the authenticated user\'s mailbox.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'ID of the message to reply to',
            },
            comment: {
              type: 'string',
              description: 'Reply body text',
            },
            replyAll: {
              type: 'boolean',
              description: 'Reply to all recipients (default: false)',
            },
          },
          required: ['messageId', 'comment'],
        },
      },
      {
        name: 'move_message',
        description: 'Move an email message to a different folder in the authenticated user\'s mailbox.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'Message ID to move',
            },
            destinationFolderId: {
              type: 'string',
              description: 'Destination folder ID or well-known name (e.g. inbox, deleteditems, junkemail)',
            },
          },
          required: ['messageId', 'destinationFolderId'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete an email message from the authenticated user\'s mailbox (moves to Deleted Items).',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'Message ID to delete',
            },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'list_mail_folders',
        description: 'List mail folders in the authenticated user\'s mailbox, including well-known and custom folders.',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: 'Maximum number of folders to return (default: 50)',
            },
            includeHiddenFolders: {
              type: 'boolean',
              description: 'Include hidden folders (default: false)',
            },
          },
        },
      },
      {
        name: 'list_events',
        description: 'List calendar events for the authenticated user. Supports calendarView (time-range query), OData $filter, $top, $skip, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: 'Number of events to return (max 999, default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Number of events to skip for pagination. Not used when start/end are provided.',
            },
            skip_token: {
              type: 'string',
              description: 'Pagination $skipToken from @odata.nextLink (used with calendarView / start+end)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression. Not used when start/end are provided.',
            },
            start: {
              type: 'string',
              description: 'Start of time range (ISO 8601) for calendarView. Must be paired with end.',
            },
            end: {
              type: 'string',
              description: 'End of time range (ISO 8601) for calendarView. Must be paired with start.',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return (e.g. id,subject,start,end,organizer)',
            },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get a single calendar event by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'Calendar event ID',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'create_event',
        description: 'Create a new calendar event on the authenticated user\'s default calendar.',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'Event title/subject',
            },
            start: {
              type: 'string',
              description: 'Start datetime in ISO 8601 format (e.g. 2026-04-01T10:00:00)',
            },
            end: {
              type: 'string',
              description: 'End datetime in ISO 8601 format',
            },
            timeZone: {
              type: 'string',
              description: 'IANA time zone name (e.g. America/New_York, default: UTC)',
            },
            body: {
              type: 'string',
              description: 'Event body/description text',
            },
            attendees: {
              type: 'array',
              description: 'Array of attendee email address strings',
            },
            location: {
              type: 'string',
              description: 'Event location display name',
            },
            isOnlineMeeting: {
              type: 'boolean',
              description: 'Create as a Teams online meeting (default: false)',
            },
          },
          required: ['subject', 'start', 'end'],
        },
      },
      {
        name: 'update_event',
        description: 'Update an existing calendar event — change subject, time, location, or attendees.',
        inputSchema: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'Calendar event ID to update',
            },
            subject: {
              type: 'string',
              description: 'New subject',
            },
            start: {
              type: 'string',
              description: 'New start datetime in ISO 8601 format',
            },
            end: {
              type: 'string',
              description: 'New end datetime in ISO 8601 format',
            },
            timeZone: {
              type: 'string',
              description: 'IANA time zone name (e.g. America/New_York)',
            },
            body: {
              type: 'string',
              description: 'New event body/description text',
            },
            location: {
              type: 'string',
              description: 'New event location display name',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'delete_event',
        description: 'Delete a calendar event from the authenticated user\'s calendar.',
        inputSchema: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'Calendar event ID to delete',
            },
          },
          required: ['eventId'],
        },
      },
      {
        name: 'list_files',
        description: 'List files and folders in OneDrive. Omit item_id to list root. Specify item_id to list a folder\'s children.',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'Drive item ID of a folder to list. Omit to list root.',
            },
            top: {
              type: 'number',
              description: 'Number of items to return (max 999, default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Number of items to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "file ne null" to show only files)',
            },
          },
        },
      },
      {
        name: 'get_file_metadata',
        description: 'Get metadata for a specific file or folder in OneDrive by its item ID.',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: {
              type: 'string',
              description: 'OneDrive item ID',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return (e.g. id,name,size,webUrl,createdDateTime)',
            },
          },
          required: ['item_id'],
        },
      },
      {
        name: 'search_content',
        description: 'Search across Microsoft 365 content including mail, files, SharePoint sites, and calendar events using KQL syntax.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string (KQL syntax, e.g. "budget filetype:xlsx" or "project proposal")',
            },
            entity_types: {
              type: 'array',
              description: 'Content types to search: message, driveItem, listItem, site, event (default: [message, driveItem])',
            },
            from: {
              type: 'number',
              description: 'Result offset for pagination (default: 0)',
            },
            size: {
              type: 'number',
              description: 'Number of results per page (max 500, default: 25)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List personal contacts from the authenticated user\'s Outlook contacts folder.',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'OData $filter expression (e.g. "displayName eq \'Alice\'")',
            },
            select: {
              type: 'string',
              description: 'Comma-separated properties to return (e.g. id,displayName,emailAddresses,mobilePhone)',
            },
            top: {
              type: 'number',
              description: 'Maximum contacts to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'get_presence',
        description: 'Get the Microsoft Teams presence status for a user (Available, Busy, Away, DoNotDisturb, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Object ID or UPN of the user to check presence for',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'list_people',
        description: 'List people relevant to the authenticated user (frequent collaborators) ordered by relevance. Useful for contact discovery.',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search term to filter people by name or email',
            },
            top: {
              type: 'number',
              description: 'Maximum number of people to return (default: 20)',
            },
          },
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
        case 'list_messages':
          return await this.listMessages(args, headers);
        case 'get_message':
          return await this.getMessage(args, headers);
        case 'send_mail':
          return await this.sendMail(args, headers);
        case 'reply_to_message':
          return await this.replyToMessage(args, headers);
        case 'move_message':
          return await this.moveMessage(args, headers);
        case 'delete_message':
          return await this.deleteMessage(args, headers);
        case 'list_mail_folders':
          return await this.listMailFolders(args, headers);
        case 'list_events':
          return await this.listEvents(args, headers);
        case 'get_event':
          return await this.getEvent(args, headers);
        case 'create_event':
          return await this.createEvent(args, headers);
        case 'update_event':
          return await this.updateEvent(args, headers);
        case 'delete_event':
          return await this.deleteEvent(args, headers);
        case 'list_files':
          return await this.listFiles(args, headers);
        case 'get_file_metadata':
          return await this.getFileMetadata(args, headers);
        case 'search_content':
          return await this.searchContent(args, headers);
        case 'list_contacts':
          return await this.listContacts(args, headers);
        case 'get_presence':
          return await this.getPresence(args, headers);
        case 'list_people':
          return await this.listPeople(args, headers);
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

  private async graphGet(url: string, headers: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Graph API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async graphPost(url: string, headers: Record<string, string>, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Graph API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async graphPatch(url: string, headers: Record<string, string>, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Graph API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async graphDelete(url: string, headers: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Graph API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async listMessages(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const folder = (args.folder as string) || 'inbox';
    const top = (args.top as number) || 20;
    const skip = (args.skip as number) || 0;
    let url = `${this.baseUrl}/me/mailFolders/${encodeURIComponent(folder)}/messages?$top=${top}&$skip=${skip}`;
    if (args.search && args.filter) {
      return { content: [{ type: 'text', text: '$search and $filter are mutually exclusive' }], isError: true };
    }
    if (args.search) {
      url += `&$search=${encodeURIComponent(`"${encodeURIComponent(args.search as string)}"`)}`;
    } else if (args.filter) {
      url += `&$filter=${encodeURIComponent(args.filter as string)}`;
    }
    if (args.select) url += `&$select=${encodeURIComponent(args.select as string)}`;
    return this.graphGet(url, headers);
  }

  private async getMessage(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    if (!messageId) return { content: [{ type: 'text', text: 'messageId is required' }], isError: true };
    let url = `${this.baseUrl}/me/messages/${encodeURIComponent(messageId)}`;
    if (args.select) url += `?$select=${encodeURIComponent(args.select as string)}`;
    return this.graphGet(url, headers);
  }

  private async sendMail(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const subject = args.subject as string;
    const body = args.body as string;
    const toRecipients = args.to_recipients as string[];
    if (!subject || !body || !toRecipients || toRecipients.length === 0) {
      return { content: [{ type: 'text', text: 'subject, body, and to_recipients are required' }], isError: true };
    }
    const bodyType = (args.body_type as string) || 'Text';
    const saveToSentItems = typeof args.save_to_sent_items === 'boolean' ? args.save_to_sent_items : true;
    const message: Record<string, unknown> = {
      subject,
      body: { contentType: bodyType, content: body },
      toRecipients: toRecipients.map((addr) => ({ emailAddress: { address: addr } })),
    };
    if (args.cc_recipients) {
      message.ccRecipients = (args.cc_recipients as string[]).map((addr) => ({ emailAddress: { address: addr } }));
    }
    if (args.bcc_recipients) {
      message.bccRecipients = (args.bcc_recipients as string[]).map((addr) => ({ emailAddress: { address: addr } }));
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/me/sendMail`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, saveToSentItems }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Graph API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  private async replyToMessage(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    const comment = args.comment as string;
    if (!messageId || !comment) return { content: [{ type: 'text', text: 'messageId and comment are required' }], isError: true };
    const action = args.replyAll ? 'replyAll' : 'reply';
    const response = await this.fetchWithRetry(`${this.baseUrl}/me/messages/${encodeURIComponent(messageId)}/${action}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ comment }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Graph API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async moveMessage(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    const destinationFolderId = args.destinationFolderId as string;
    if (!messageId || !destinationFolderId) {
      return { content: [{ type: 'text', text: 'messageId and destinationFolderId are required' }], isError: true };
    }
    return this.graphPost(`${this.baseUrl}/me/messages/${encodeURIComponent(messageId)}/move`, headers, { destinationId: destinationFolderId });
  }

  private async deleteMessage(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const messageId = args.messageId as string;
    if (!messageId) return { content: [{ type: 'text', text: 'messageId is required' }], isError: true };
    return this.graphDelete(`${this.baseUrl}/me/messages/${encodeURIComponent(messageId)}`, headers);
  }

  private async listMailFolders(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const top = (args.top as number) || 50;
    let url = `${this.baseUrl}/me/mailFolders?$top=${top}`;
    if (args.includeHiddenFolders) url += '&includeHiddenFolders=true';
    return this.graphGet(url, headers);
  }

  private async listEvents(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const top = (args.top as number) || 20;
    let url: string;
    if (args.start && args.end) {
      url = `${this.baseUrl}/me/calendarView?startDateTime=${encodeURIComponent(args.start as string)}&endDateTime=${encodeURIComponent(args.end as string)}&$top=${top}`;
      if (args.skip_token) url += `&$skipToken=${encodeURIComponent(args.skip_token as string)}`;
    } else {
      const skip = (args.skip as number) || 0;
      url = `${this.baseUrl}/me/events?$top=${top}&$skip=${skip}`;
      if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;
    }
    if (args.select) url += `&$select=${encodeURIComponent(args.select as string)}`;
    const reqHeaders = { ...headers, Prefer: 'outlook.timezone="UTC"' };
    return this.graphGet(url, reqHeaders);
  }

  private async getEvent(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const eventId = args.eventId as string;
    if (!eventId) return { content: [{ type: 'text', text: 'eventId is required' }], isError: true };
    let url = `${this.baseUrl}/me/events/${encodeURIComponent(eventId)}`;
    if (args.select) url += `?$select=${encodeURIComponent(args.select as string)}`;
    return this.graphGet(url, headers);
  }

  private async createEvent(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const { subject, start, end } = args;
    if (!subject || !start || !end) {
      return { content: [{ type: 'text', text: 'subject, start, and end are required' }], isError: true };
    }
    const timeZone = (args.timeZone as string) || 'UTC';
    const body: Record<string, unknown> = {
      subject,
      start: { dateTime: start, timeZone },
      end: { dateTime: end, timeZone },
    };
    if (args.body) body.body = { contentType: 'Text', content: args.body };
    if (args.location) body.location = { displayName: args.location };
    if (args.isOnlineMeeting) body.isOnlineMeeting = true;
    if (args.attendees) {
      body.attendees = (args.attendees as string[]).map((email) => ({
        emailAddress: { address: email },
        type: 'required',
      }));
    }
    return this.graphPost(`${this.baseUrl}/me/events`, headers, body);
  }

  private async updateEvent(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const eventId = args.eventId as string;
    if (!eventId) return { content: [{ type: 'text', text: 'eventId is required' }], isError: true };
    const timeZone = (args.timeZone as string) || 'UTC';
    const patch: Record<string, unknown> = {};
    if (args.subject) patch.subject = args.subject;
    if (args.start) patch.start = { dateTime: args.start, timeZone };
    if (args.end) patch.end = { dateTime: args.end, timeZone };
    if (args.body) patch.body = { contentType: 'Text', content: args.body };
    if (args.location) patch.location = { displayName: args.location };
    return this.graphPatch(`${this.baseUrl}/me/events/${encodeURIComponent(eventId)}`, headers, patch);
  }

  private async deleteEvent(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const eventId = args.eventId as string;
    if (!eventId) return { content: [{ type: 'text', text: 'eventId is required' }], isError: true };
    return this.graphDelete(`${this.baseUrl}/me/events/${encodeURIComponent(eventId)}`, headers);
  }

  private async listFiles(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const top = (args.top as number) || 20;
    const skip = (args.skip as number) || 0;
    const itemId = args.item_id as string | undefined;
    let url = itemId
      ? `${this.baseUrl}/me/drive/items/${encodeURIComponent(itemId)}/children?$top=${top}&$skip=${skip}`
      : `${this.baseUrl}/me/drive/root/children?$top=${top}&$skip=${skip}`;
    if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;
    return this.graphGet(url, headers);
  }

  private async getFileMetadata(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const itemId = args.item_id as string;
    if (!itemId) return { content: [{ type: 'text', text: 'item_id is required' }], isError: true };
    let url = `${this.baseUrl}/me/drive/items/${encodeURIComponent(itemId)}`;
    if (args.select) url += `?$select=${encodeURIComponent(args.select as string)}`;
    return this.graphGet(url, headers);
  }

  private async searchContent(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const query = args.query as string;
    if (!query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const entityTypes = (args.entity_types as string[]) || ['message', 'driveItem'];
    const from = (args.from as number) || 0;
    const size = (args.size as number) || 25;
    return this.graphPost(`${this.baseUrl}/search/query`, headers, {
      requests: [{ entityTypes, query: { queryString: query }, from, size }],
    });
  }

  private async listContacts(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const top = (args.top as number) || 50;
    let url = `${this.baseUrl}/me/contacts?$top=${top}`;
    if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;
    if (args.select) url += `&$select=${encodeURIComponent(args.select as string)}`;
    return this.graphGet(url, headers);
  }

  private async getPresence(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const userId = args.userId as string;
    if (!userId) return { content: [{ type: 'text', text: 'userId is required' }], isError: true };
    return this.graphGet(`${this.baseUrl}/users/${encodeURIComponent(userId)}/presence`, headers);
  }

  private async listPeople(args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const top = (args.top as number) || 20;
    let url = `${this.baseUrl}/me/people?$top=${top}`;
    if (args.search) url += `&$search=${encodeURIComponent(args.search as string)}`;
    return this.graphGet(url, headers);
  }
}
