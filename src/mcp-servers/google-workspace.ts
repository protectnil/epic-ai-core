/**
 * Google Workspace MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 for the Workspace productivity suite (Gmail, Drive, Docs, Sheets, Calendar).
// Google announced official MCP support for Google Cloud services (BigQuery, GCE, GKE, Maps, YouTube) in Dec 2025
// (https://cloud.google.com/blog/products/ai-machine-learning/announcing-official-mcp-support-for-google-services),
// but that does NOT cover the Workspace productivity APIs. No official Google-published MCP server exists for
// Gmail/Drive/Docs/Sheets/Calendar. Community forks only (e.g. epaproditus/google-workspace-mcp-server,
// taylorwilsdon/google_workspace_mcp) — none are published by Google.
// Our adapter covers: 18 tools. Vendor MCP covers: 0 tools (N/A).
// Recommendation: use-rest-api — no official vendor MCP exists for Workspace productivity APIs.
//
// Base URLs:
//   Drive:    https://www.googleapis.com/drive/v3
//   Docs:     https://docs.googleapis.com/v1
//   Sheets:   https://sheets.googleapis.com/v4
//   Calendar: https://www.googleapis.com/calendar/v3
//   Gmail:    https://gmail.googleapis.com/gmail/v1
// Auth: OAuth2 Bearer token (access_token with appropriate Workspace scopes)
// Docs: https://developers.google.com/workspace
// Rate limits: Gmail 250 quota units/second per user; Sheets 300 req/min; Drive 20,000 req/100s/user

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoogleWorkspaceConfig {
  accessToken: string;
}

export class GoogleWorkspaceMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly driveBase = 'https://www.googleapis.com/drive/v3';
  private readonly docsBase = 'https://docs.googleapis.com/v1';
  private readonly sheetsBase = 'https://sheets.googleapis.com/v4';
  private readonly calendarBase = 'https://www.googleapis.com/calendar/v3';
  private readonly gmailBase = 'https://gmail.googleapis.com/gmail/v1';

  constructor(config: GoogleWorkspaceConfig) {
    super();
    this.accessToken = config.accessToken;
  }

  static catalog() {
    return {
      name: 'google-workspace',
      displayName: 'Google Workspace',
      version: '1.0.0',
      category: 'collaboration' as const,
      keywords: [
        'google', 'workspace', 'gmail', 'docs', 'sheets', 'calendar', 'drive',
        'email', 'spreadsheet', 'document', 'event', 'meeting', 'gsuite',
      ],
      toolNames: [
        'list_drive_files', 'search_drive_files', 'get_drive_file',
        'create_document', 'get_document', 'append_document_text',
        'get_spreadsheet', 'get_spreadsheet_values', 'update_spreadsheet_values', 'append_spreadsheet_values',
        'list_calendar_events', 'create_calendar_event', 'get_calendar_event', 'delete_calendar_event',
        'list_gmail_messages', 'get_gmail_message', 'search_gmail_messages', 'create_gmail_draft',
      ],
      description: 'Access Gmail, Google Drive, Docs, Sheets, and Calendar. Search files, read/write documents and spreadsheets, manage calendar events and email.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Drive ────────────────────────────────────────────────────────────────
      {
        name: 'list_drive_files',
        description: 'List files and folders in Google Drive with optional folder filter, MIME type filter, and sort order.',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: {
              type: 'string',
              description: "Parent folder ID to list (default: 'root').",
            },
            page_size: {
              type: 'number',
              description: 'Number of files to return (default: 50, max: 1000).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous list_drive_files response.',
            },
            order_by: {
              type: 'string',
              description: "Sort order, e.g. 'modifiedTime desc', 'name'.",
            },
          },
        },
      },
      {
        name: 'search_drive_files',
        description: 'Search Google Drive using Drive query syntax for full-text search, MIME type, owner, and modification filters.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: "Drive search query, e.g. \"fullText contains 'budget' and mimeType='application/vnd.google-apps.spreadsheet'\".",
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 50).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous search_drive_files response.',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_drive_file',
        description: 'Get metadata for a specific Google Drive file or folder by its file ID, including owners, sharing status, and web link.',
        inputSchema: {
          type: 'object',
          properties: {
            file_id: {
              type: 'string',
              description: 'The Google Drive file ID.',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to return (default: id,name,mimeType,size,modifiedTime,webViewLink,owners,shared).',
            },
          },
          required: ['file_id'],
        },
      },
      // ── Docs ─────────────────────────────────────────────────────────────────
      {
        name: 'create_document',
        description: 'Create a new Google Docs document with optional initial text content.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Document title.',
            },
            content: {
              type: 'string',
              description: 'Initial text content to insert into the document body (optional).',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'get_document',
        description: 'Retrieve the full content and structure of a Google Docs document by its document ID.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'The Google Docs document ID (same as the Drive file ID).',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'append_document_text',
        description: 'Append text to the end of a Google Docs document using the batchUpdate API.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'The Google Docs document ID.',
            },
            text: {
              type: 'string',
              description: 'Text to append at the end of the document body.',
            },
          },
          required: ['document_id', 'text'],
        },
      },
      // ── Sheets ────────────────────────────────────────────────────────────────
      {
        name: 'get_spreadsheet',
        description: 'Get metadata and sheet names for a Google Sheets spreadsheet by spreadsheet ID.',
        inputSchema: {
          type: 'object',
          properties: {
            spreadsheet_id: {
              type: 'string',
              description: 'The Google Sheets spreadsheet ID.',
            },
          },
          required: ['spreadsheet_id'],
        },
      },
      {
        name: 'get_spreadsheet_values',
        description: 'Read cell values from a range in a Google Sheets spreadsheet using A1 notation.',
        inputSchema: {
          type: 'object',
          properties: {
            spreadsheet_id: {
              type: 'string',
              description: 'The Google Sheets spreadsheet ID.',
            },
            range: {
              type: 'string',
              description: "A1 notation range, e.g. 'Sheet1!A1:D10' or 'A:Z' for the whole sheet.",
            },
            major_dimension: {
              type: 'string',
              description: "Primary dimension for results: 'ROWS' (default) or 'COLUMNS'.",
            },
          },
          required: ['spreadsheet_id', 'range'],
        },
      },
      {
        name: 'update_spreadsheet_values',
        description: 'Write values to a range in a Google Sheets spreadsheet, overwriting existing cell contents.',
        inputSchema: {
          type: 'object',
          properties: {
            spreadsheet_id: {
              type: 'string',
              description: 'The Google Sheets spreadsheet ID.',
            },
            range: {
              type: 'string',
              description: "A1 notation range to write to, e.g. 'Sheet1!A1:C3'.",
            },
            values: {
              type: 'array',
              description: 'Array of rows, each row is an array of cell values, e.g. [[\"Name\",\"Score\"],[\"Alice\",95]].',
              items: { type: 'array' },
            },
            value_input_option: {
              type: 'string',
              description: "How to interpret input values: 'RAW' (literal, default) or 'USER_ENTERED' (parsed like UI input).",
            },
          },
          required: ['spreadsheet_id', 'range', 'values'],
        },
      },
      {
        name: 'append_spreadsheet_values',
        description: 'Append rows of data to a Google Sheets spreadsheet, inserting after the last row of existing data.',
        inputSchema: {
          type: 'object',
          properties: {
            spreadsheet_id: {
              type: 'string',
              description: 'The Google Sheets spreadsheet ID.',
            },
            range: {
              type: 'string',
              description: "A1 notation range indicating the sheet to append to, e.g. 'Sheet1!A1'.",
            },
            values: {
              type: 'array',
              description: 'Array of rows to append, each row is an array of cell values.',
              items: { type: 'array' },
            },
            value_input_option: {
              type: 'string',
              description: "How to interpret input: 'RAW' (default) or 'USER_ENTERED'.",
            },
          },
          required: ['spreadsheet_id', 'range', 'values'],
        },
      },
      // ── Calendar ──────────────────────────────────────────────────────────────
      {
        name: 'list_calendar_events',
        description: 'List events from a Google Calendar within an optional time range. Returns upcoming events sorted by start time.',
        inputSchema: {
          type: 'object',
          properties: {
            calendar_id: {
              type: 'string',
              description: "Calendar ID to query (default: 'primary' for the user's main calendar).",
            },
            time_min: {
              type: 'string',
              description: 'ISO 8601 lower bound for event start time (default: now).',
            },
            time_max: {
              type: 'string',
              description: 'ISO 8601 upper bound for event start time.',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of events to return (default: 50, max: 2500).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous list_calendar_events response.',
            },
            q: {
              type: 'string',
              description: 'Free-text search query to filter events by summary, description, or location.',
            },
          },
        },
      },
      {
        name: 'create_calendar_event',
        description: 'Create a new event on a Google Calendar with title, start/end times, optional description, location, and attendees.',
        inputSchema: {
          type: 'object',
          properties: {
            calendar_id: {
              type: 'string',
              description: "Calendar ID (default: 'primary').",
            },
            summary: {
              type: 'string',
              description: 'Event title/summary.',
            },
            start: {
              type: 'string',
              description: "Event start time in ISO 8601 format, e.g. '2026-04-01T09:00:00-07:00'.",
            },
            end: {
              type: 'string',
              description: "Event end time in ISO 8601 format, e.g. '2026-04-01T10:00:00-07:00'.",
            },
            description: {
              type: 'string',
              description: 'Event description or notes.',
            },
            location: {
              type: 'string',
              description: 'Physical or virtual location of the event.',
            },
            attendees: {
              type: 'array',
              description: 'Array of attendee email strings, e.g. ["alice@example.com", "bob@example.com"].',
              items: { type: 'string' },
            },
            time_zone: {
              type: 'string',
              description: "IANA timezone for the event, e.g. 'America/New_York' (default: UTC).",
            },
          },
          required: ['summary', 'start', 'end'],
        },
      },
      {
        name: 'get_calendar_event',
        description: 'Retrieve a specific Google Calendar event by calendar ID and event ID.',
        inputSchema: {
          type: 'object',
          properties: {
            calendar_id: {
              type: 'string',
              description: "Calendar ID (default: 'primary').",
            },
            event_id: {
              type: 'string',
              description: 'The Google Calendar event ID.',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'delete_calendar_event',
        description: 'Delete a Google Calendar event by calendar ID and event ID. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            calendar_id: {
              type: 'string',
              description: "Calendar ID (default: 'primary').",
            },
            event_id: {
              type: 'string',
              description: 'The Google Calendar event ID to delete.',
            },
          },
          required: ['event_id'],
        },
      },
      // ── Gmail ─────────────────────────────────────────────────────────────────
      {
        name: 'list_gmail_messages',
        description: 'List Gmail message IDs and thread IDs from the user inbox, optionally filtered by label.',
        inputSchema: {
          type: 'object',
          properties: {
            max_results: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 20, max: 500).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous list_gmail_messages response.',
            },
            label_ids: {
              type: 'array',
              description: "Array of Gmail label IDs to filter by, e.g. ['INBOX', 'UNREAD'].",
              items: { type: 'string' },
            },
          },
        },
      },
      {
        name: 'get_gmail_message',
        description: 'Retrieve the full content of a specific Gmail message by message ID, including headers, body, and attachments metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'The Gmail message ID.',
            },
            format: {
              type: 'string',
              description: "Response format: 'full' (default), 'metadata' (headers only), 'minimal', 'raw'.",
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'search_gmail_messages',
        description: 'Search Gmail messages using Gmail query syntax. Supports from:, to:, subject:, has:attachment, after:, before: and more.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: "Gmail search query, e.g. \"from:alice@example.com subject:invoice after:2026/01/01\".",
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 20, max: 500).',
            },
            page_token: {
              type: 'string',
              description: 'Pagination token from a previous search_gmail_messages response.',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'create_gmail_draft',
        description: 'Create a Gmail draft message with to, subject, and body. Draft is saved but not sent.',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient email address.',
            },
            subject: {
              type: 'string',
              description: 'Email subject line.',
            },
            body: {
              type: 'string',
              description: 'Plain text email body.',
            },
            cc: {
              type: 'string',
              description: 'CC email address(es), comma-separated.',
            },
          },
          required: ['to', 'subject', 'body'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_drive_files':
          return await this.listDriveFiles(args);
        case 'search_drive_files':
          return await this.searchDriveFiles(args);
        case 'get_drive_file':
          return await this.getDriveFile(args);
        case 'create_document':
          return await this.createDocument(args);
        case 'get_document':
          return await this.getDocument(args);
        case 'append_document_text':
          return await this.appendDocumentText(args);
        case 'get_spreadsheet':
          return await this.getSpreadsheet(args);
        case 'get_spreadsheet_values':
          return await this.getSpreadsheetValues(args);
        case 'update_spreadsheet_values':
          return await this.updateSpreadsheetValues(args);
        case 'append_spreadsheet_values':
          return await this.appendSpreadsheetValues(args);
        case 'list_calendar_events':
          return await this.listCalendarEvents(args);
        case 'create_calendar_event':
          return await this.createCalendarEvent(args);
        case 'get_calendar_event':
          return await this.getCalendarEvent(args);
        case 'delete_calendar_event':
          return await this.deleteCalendarEvent(args);
        case 'list_gmail_messages':
          return await this.listGmailMessages(args);
        case 'get_gmail_message':
          return await this.getGmailMessage(args);
        case 'search_gmail_messages':
          return await this.searchGmailMessages(args);
        case 'create_gmail_draft':
          return await this.createGmailDraft(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }


  // ── Drive ──────────────────────────────────────────────────────────────────

  private async listDriveFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const parentId = (args.folder_id as string) ?? 'root';
    params.set('q', `'${parentId}' in parents and trashed = false`);
    params.set('pageSize', String((args.page_size as number) ?? 50));
    params.set('fields', 'nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)');
    if (args.page_token) params.set('pageToken', args.page_token as string);
    if (args.order_by) params.set('orderBy', args.order_by as string);

    const response = await this.fetchWithRetry(`${this.driveBase}/files?${params}`, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async searchDriveFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('q', args.query as string);
    params.set('pageSize', String((args.page_size as number) ?? 50));
    params.set('fields', 'nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)');
    if (args.page_token) params.set('pageToken', args.page_token as string);

    const response = await this.fetchWithRetry(`${this.driveBase}/files?${params}`, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getDriveFile(args: Record<string, unknown>): Promise<ToolResult> {
    const fields = (args.fields as string) ?? 'id,name,mimeType,size,modifiedTime,webViewLink,owners,shared';
    const response = await this.fetchWithRetry(
      `${this.driveBase}/files/${encodeURIComponent(args.file_id as string)}?fields=${encodeURIComponent(fields)}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  // ── Docs ──────────────────────────────────────────────────────────────────

  private async createDocument(args: Record<string, unknown>): Promise<ToolResult> {
    const createResponse = await this.fetchWithRetry(`${this.docsBase}/documents`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify({ title: args.title }),
    });
    if (!createResponse.ok) {
      return { content: [{ type: 'text', text: `API error: ${createResponse.status} ${createResponse.statusText}` }], isError: true };
    }
    const doc = await createResponse.json() as Record<string, unknown>;

    if (args.content && doc.documentId) {
      const batchResponse = await this.fetchWithRetry(`${this.docsBase}/documents/${doc.documentId}:batchUpdate`, {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify({
          requests: [{ insertText: { location: { index: 1 }, text: args.content } }],
        }),
      });
      if (!batchResponse.ok) {
        return { content: [{ type: 'text', text: `Document created (${doc.documentId}) but content insert failed: ${batchResponse.status} ${batchResponse.statusText}` }], isError: true };
      }
    }

    return { content: [{ type: 'text', text: JSON.stringify(doc, null, 2) }], isError: false };
  }

  private async getDocument(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.docsBase}/documents/${encodeURIComponent(args.document_id as string)}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async appendDocumentText(args: Record<string, unknown>): Promise<ToolResult> {
    // Get document to find the end index
    const docResponse = await this.fetchWithRetry(`${this.docsBase}/documents/${encodeURIComponent(args.document_id as string)}`, {
      headers: this.authHeaders,
    });
    if (!docResponse.ok) {
      return { content: [{ type: 'text', text: `API error fetching document: ${docResponse.status} ${docResponse.statusText}` }], isError: true };
    }
    const doc = await docResponse.json() as { body?: { content?: Array<{ endIndex?: number }> } };
    const content = doc.body?.content ?? [];
    const endIndex = (content[content.length - 1]?.endIndex ?? 1) - 1;

    const batchResponse = await this.fetchWithRetry(`${this.docsBase}/documents/${encodeURIComponent(args.document_id as string)}:batchUpdate`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify({
        requests: [{ insertText: { location: { index: endIndex }, text: args.text } }],
      }),
    });
    if (!batchResponse.ok) {
      return { content: [{ type: 'text', text: `API error: ${batchResponse.status} ${batchResponse.statusText}` }], isError: true };
    }
    const result = await batchResponse.json();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
  }

  // ── Sheets ────────────────────────────────────────────────────────────────

  private async getSpreadsheet(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.sheetsBase}/spreadsheets/${encodeURIComponent(args.spreadsheet_id as string)}?fields=spreadsheetId,properties,sheets.properties`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getSpreadsheetValues(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('majorDimension', (args.major_dimension as string) ?? 'ROWS');

    const response = await this.fetchWithRetry(
      `${this.sheetsBase}/spreadsheets/${encodeURIComponent(args.spreadsheet_id as string)}/values/${encodeURIComponent(args.range as string)}?${params}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async updateSpreadsheetValues(args: Record<string, unknown>): Promise<ToolResult> {
    const valueInputOption = (args.value_input_option as string) ?? 'RAW';
    const response = await this.fetchWithRetry(
      `${this.sheetsBase}/spreadsheets/${encodeURIComponent(args.spreadsheet_id as string)}/values/${encodeURIComponent(args.range as string)}?valueInputOption=${valueInputOption}`,
      {
        method: 'PUT',
        headers: this.authHeaders,
        body: JSON.stringify({ range: args.range, majorDimension: 'ROWS', values: args.values }),
      },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async appendSpreadsheetValues(args: Record<string, unknown>): Promise<ToolResult> {
    const valueInputOption = (args.value_input_option as string) ?? 'RAW';
    const response = await this.fetchWithRetry(
      `${this.sheetsBase}/spreadsheets/${encodeURIComponent(args.spreadsheet_id as string)}/values/${encodeURIComponent(args.range as string)}:append?valueInputOption=${valueInputOption}&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify({ range: args.range, majorDimension: 'ROWS', values: args.values }),
      },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  // ── Calendar ──────────────────────────────────────────────────────────────

  private async listCalendarEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = (args.calendar_id as string) ?? 'primary';
    const params = new URLSearchParams();
    params.set('singleEvents', 'true');
    params.set('orderBy', 'startTime');
    params.set('maxResults', String((args.max_results as number) ?? 50));
    params.set('timeMin', (args.time_min as string) ?? new Date().toISOString());
    if (args.time_max) params.set('timeMax', args.time_max as string);
    if (args.page_token) params.set('pageToken', args.page_token as string);
    if (args.q) params.set('q', args.q as string);

    const response = await this.fetchWithRetry(
      `${this.calendarBase}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createCalendarEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = (args.calendar_id as string) ?? 'primary';
    const timeZone = (args.time_zone as string) ?? 'UTC';

    const body: Record<string, unknown> = {
      summary: args.summary,
      start: { dateTime: args.start, timeZone },
      end: { dateTime: args.end, timeZone },
    };
    if (args.description) body.description = args.description;
    if (args.location) body.location = args.location;
    if (args.attendees) {
      body.attendees = (args.attendees as string[]).map((email) => ({ email }));
    }

    const response = await this.fetchWithRetry(
      `${this.calendarBase}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async getCalendarEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = (args.calendar_id as string) ?? 'primary';
    const response = await this.fetchWithRetry(
      `${this.calendarBase}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(args.event_id as string)}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async deleteCalendarEvent(args: Record<string, unknown>): Promise<ToolResult> {
    const calendarId = (args.calendar_id as string) ?? 'primary';
    const response = await this.fetchWithRetry(
      `${this.calendarBase}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(args.event_id as string)}`,
      { method: 'DELETE', headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, event_id: args.event_id }) }], isError: false };
  }

  // ── Gmail ─────────────────────────────────────────────────────────────────

  private async listGmailMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('maxResults', String((args.max_results as number) ?? 20));
    if (args.page_token) params.set('pageToken', args.page_token as string);
    if (args.label_ids) {
      for (const label of args.label_ids as string[]) {
        params.append('labelIds', label);
      }
    }

    const response = await this.fetchWithRetry(
      `${this.gmailBase}/users/me/messages?${params}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getGmailMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const format = (args.format as string) ?? 'full';
    const response = await this.fetchWithRetry(
      `${this.gmailBase}/users/me/messages/${encodeURIComponent(args.message_id as string)}?format=${format}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async searchGmailMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('q', args.query as string);
    params.set('maxResults', String((args.max_results as number) ?? 20));
    if (args.page_token) params.set('pageToken', args.page_token as string);

    const response = await this.fetchWithRetry(
      `${this.gmailBase}/users/me/messages?${params}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createGmailDraft(args: Record<string, unknown>): Promise<ToolResult> {
    // Build RFC 2822 email message — header values must NOT be URL-encoded
    const lines: string[] = [
      `To: ${args.to as string}`,
      `Subject: ${args.subject as string}`,
    ];
    if (args.cc) lines.push(`Cc: ${args.cc as string}`);
    lines.push('Content-Type: text/plain; charset=utf-8', '', args.body as string);

    const rawMessage = lines.join('\r\n');
    // base64url encode
    const encoded = Buffer.from(rawMessage).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await this.fetchWithRetry(`${this.gmailBase}/users/me/drafts`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify({ message: { raw: encoded } }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }
}
