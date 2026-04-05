/**
 * RingCentral MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// RingCentral App Connect (appconnect.labs.ringcentral.com/mcp/) is a CRM integration bridge
// (alpha), not a RingCentral platform API MCP server — it exposes only CRM/call-log bridge tools,
// not the full RingEX API surface. No official vendor MCP for the RingEX REST API found.
// Our adapter covers: 20 tools. Vendor MCP covers: 0 tools (none found for RingEX API).
// Recommendation: use-rest-api
//
// Base URL: https://platform.ringcentral.com/restapi/v1.0
// Auth: OAuth2 client credentials — POST https://platform.ringcentral.com/restapi/oauth/token
//   with Basic auth header (Base64 clientId:clientSecret), body: grant_type=client_credentials
// Docs: https://developers.ringcentral.com/api-reference
// Rate limits: Varies by endpoint group; plan-dependent. 429 on exceeded limits.
// NOTE: send_fax uses multipart/form-data (not JSON) per RingCentral Fax API docs.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RingCentralConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class RingCentralMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: RingCentralConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://platform.ringcentral.com/restapi/v1.0';
  }

  static catalog() {
    return {
      name: 'ringcentral',
      displayName: 'RingCentral',
      version: '1.0.0',
      category: 'communication',
      keywords: ['ringcentral', 'sms', 'voip', 'phone', 'call', 'fax', 'voicemail', 'message', 'call log', 'extension', 'meeting', 'telephony', 'ucaas'],
      toolNames: [
        'get_account_info', 'list_extensions', 'get_extension',
        'list_call_logs', 'get_call_log',
        'list_messages', 'get_message', 'delete_message', 'send_sms',
        'list_voicemails', 'get_voicemail',
        'list_meetings', 'create_meeting', 'get_meeting', 'delete_meeting',
        'list_fax_messages', 'send_fax',
        'list_contacts', 'get_contact', 'create_contact',
      ],
      description: 'RingCentral unified communications: send SMS/fax, manage calls, voicemails, meetings, extensions, and contacts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_account_info',
        description: 'Get information about the RingCentral account including name, status, and service plan',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_extensions',
        description: 'List all extensions in the RingCentral account with optional type and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by extension type: User, Department, Announcement, Voicemail, etc.',
            },
            status: {
              type: 'string',
              description: 'Filter by status: Enabled, Disabled, NotActivated (default: all)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 100, max: 1000)',
            },
          },
        },
      },
      {
        name: 'get_extension',
        description: 'Get details for a specific RingCentral extension by extension ID',
        inputSchema: {
          type: 'object',
          properties: {
            extension_id: {
              type: 'string',
              description: 'Extension ID (use ~ for the current user\'s extension)',
            },
          },
          required: ['extension_id'],
        },
      },
      {
        name: 'list_call_logs',
        description: 'List call log records for an extension with optional date range and direction filters',
        inputSchema: {
          type: 'object',
          properties: {
            extension_id: {
              type: 'string',
              description: 'Extension ID to query (default: ~ for current user)',
            },
            direction: {
              type: 'string',
              description: 'Filter by direction: Inbound or Outbound',
            },
            type: {
              type: 'string',
              description: 'Filter by call type: Voice or Fax',
            },
            date_from: {
              type: 'string',
              description: 'Start date/time in ISO 8601 format (e.g. 2026-01-01T00:00:00Z)',
            },
            date_to: {
              type: 'string',
              description: 'End date/time in ISO 8601 format',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 100, max: 1000)',
            },
          },
        },
      },
      {
        name: 'get_call_log',
        description: 'Get a specific call log record by call log ID',
        inputSchema: {
          type: 'object',
          properties: {
            call_log_id: {
              type: 'string',
              description: 'Call log record ID',
            },
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
          },
          required: ['call_log_id'],
        },
      },
      {
        name: 'list_messages',
        description: 'List messages (SMS, fax, voicemail) for an extension with optional type and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
            message_type: {
              type: 'string',
              description: 'Filter by type: SMS, Fax, VoiceMail, Text (default: all)',
            },
            read_status: {
              type: 'string',
              description: 'Filter by status: Read or Unread',
            },
            date_from: {
              type: 'string',
              description: 'Start date/time in ISO 8601 format',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_message',
        description: 'Get a specific message (SMS, fax, voicemail) by message ID',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Message ID to retrieve',
            },
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a message from the RingCentral message store by message ID',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Message ID to delete',
            },
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'send_sms',
        description: 'Send an SMS or MMS text message from a RingCentral number to one or more recipients',
        inputSchema: {
          type: 'object',
          properties: {
            from_number: {
              type: 'string',
              description: 'Sender phone number in E.164 format (e.g. +16505551234)',
            },
            to_numbers: {
              type: 'string',
              description: 'Comma-separated recipient phone numbers in E.164 format',
            },
            text: {
              type: 'string',
              description: 'SMS message text content (max 1000 characters)',
            },
            extension_id: {
              type: 'string',
              description: 'Extension ID to send from (default: ~ for current user)',
            },
          },
          required: ['from_number', 'to_numbers', 'text'],
        },
      },
      {
        name: 'list_voicemails',
        description: 'List voicemail messages for an extension with optional read status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
            read_status: {
              type: 'string',
              description: 'Filter by read status: Read or Unread',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_voicemail',
        description: 'Get details and metadata for a specific voicemail message by ID',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Voicemail message ID',
            },
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'list_meetings',
        description: 'List scheduled RingCentral Video/Meetings for an extension',
        inputSchema: {
          type: 'object',
          properties: {
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
          },
        },
      },
      {
        name: 'create_meeting',
        description: 'Create a new RingCentral meeting with topic, schedule, and password options',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Meeting topic/title',
            },
            start_time: {
              type: 'string',
              description: 'Meeting start time in ISO 8601 format (e.g. 2026-04-01T14:00:00Z)',
            },
            duration: {
              type: 'number',
              description: 'Meeting duration in minutes (default: 60)',
            },
            password: {
              type: 'string',
              description: 'Optional meeting password for participants',
            },
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
          },
          required: ['topic'],
        },
      },
      {
        name: 'get_meeting',
        description: 'Get details for a specific RingCentral meeting by meeting ID',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Meeting ID to retrieve',
            },
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
          },
          required: ['meeting_id'],
        },
      },
      {
        name: 'delete_meeting',
        description: 'Delete a scheduled RingCentral meeting by meeting ID',
        inputSchema: {
          type: 'object',
          properties: {
            meeting_id: {
              type: 'string',
              description: 'Meeting ID to delete',
            },
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
          },
          required: ['meeting_id'],
        },
      },
      {
        name: 'list_fax_messages',
        description: 'List fax messages for an extension with optional read status and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
            read_status: {
              type: 'string',
              description: 'Filter by status: Read or Unread',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'send_fax',
        description: 'Send a fax message from a RingCentral number to one or more recipients with a cover page',
        inputSchema: {
          type: 'object',
          properties: {
            to_numbers: {
              type: 'string',
              description: 'Comma-separated recipient fax numbers in E.164 format',
            },
            cover_page_text: {
              type: 'string',
              description: 'Cover page text content for the fax',
            },
            extension_id: {
              type: 'string',
              description: 'Extension ID to send from (default: ~ for current user)',
            },
          },
          required: ['to_numbers'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List personal contacts for a RingCentral extension with optional name and phone search',
        inputSchema: {
          type: 'object',
          properties: {
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
            search_string: {
              type: 'string',
              description: 'Search contacts by name or phone number',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get details for a specific RingCentral personal contact by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Contact ID to retrieve',
            },
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new personal contact for a RingCentral extension',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Contact first name',
            },
            last_name: {
              type: 'string',
              description: 'Contact last name',
            },
            email: {
              type: 'string',
              description: 'Contact email address',
            },
            business_phone: {
              type: 'string',
              description: 'Business phone number in E.164 format',
            },
            mobile_phone: {
              type: 'string',
              description: 'Mobile phone number in E.164 format',
            },
            company: {
              type: 'string',
              description: 'Company name',
            },
            extension_id: {
              type: 'string',
              description: 'Extension ID (default: ~ for current user)',
            },
          },
          required: ['first_name', 'last_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account_info':
          return this.getAccountInfo();
        case 'list_extensions':
          return this.listExtensions(args);
        case 'get_extension':
          return this.getExtension(args);
        case 'list_call_logs':
          return this.listCallLogs(args);
        case 'get_call_log':
          return this.getCallLog(args);
        case 'list_messages':
          return this.listMessages(args);
        case 'get_message':
          return this.getMessage(args);
        case 'delete_message':
          return this.deleteMessage(args);
        case 'send_sms':
          return this.sendSms(args);
        case 'list_voicemails':
          return this.listVoicemails(args);
        case 'get_voicemail':
          return this.getVoicemail(args);
        case 'list_meetings':
          return this.listMeetings(args);
        case 'create_meeting':
          return this.createMeeting(args);
        case 'get_meeting':
          return this.getMeeting(args);
        case 'delete_meeting':
          return this.deleteMeeting(args);
        case 'list_fax_messages':
          return this.listFaxMessages(args);
        case 'send_fax':
          return this.sendFax(args);
        case 'list_contacts':
          return this.listContacts(args);
        case 'get_contact':
          return this.getContact(args);
        case 'create_contact':
          return this.createContact(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry('https://platform.ringcentral.com/restapi/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private extPath(extensionId: string | undefined): string {
    return `/account/~/extension/${extensionId || '~'}`;
  }

  private async getAccountInfo(): Promise<ToolResult> {
    return this.apiGet('/account/~');
  }

  private async listExtensions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.type) params.set('type', args.type as string);
    if (args.status) params.set('status', args.status as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('perPage', String(args.per_page));
    const qs = params.toString();
    return this.apiGet(`/account/~/extension${qs ? '?' + qs : ''}`);
  }

  private async getExtension(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.extension_id) return { content: [{ type: 'text', text: 'extension_id is required' }], isError: true };
    return this.apiGet(`/account/~/extension/${encodeURIComponent(args.extension_id as string)}`);
  }

  private async listCallLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.direction) params.set('direction', args.direction as string);
    if (args.type) params.set('type', args.type as string);
    if (args.date_from) params.set('dateFrom', args.date_from as string);
    if (args.date_to) params.set('dateTo', args.date_to as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('perPage', String(args.per_page));
    const extId = args.extension_id as string | undefined;
    const qs = params.toString();
    return this.apiGet(`${this.extPath(extId)}/call-log${qs ? '?' + qs : ''}`);
  }

  private async getCallLog(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_log_id) return { content: [{ type: 'text', text: 'call_log_id is required' }], isError: true };
    const extId = args.extension_id as string | undefined;
    return this.apiGet(`${this.extPath(extId)}/call-log/${encodeURIComponent(args.call_log_id as string)}`);
  }

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.message_type) params.set('messageType', args.message_type as string);
    if (args.read_status) params.set('readStatus', args.read_status as string);
    if (args.date_from) params.set('dateFrom', args.date_from as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('perPage', String(args.per_page));
    const extId = args.extension_id as string | undefined;
    const qs = params.toString();
    return this.apiGet(`${this.extPath(extId)}/message-store${qs ? '?' + qs : ''}`);
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    const extId = args.extension_id as string | undefined;
    return this.apiGet(`${this.extPath(extId)}/message-store/${encodeURIComponent(args.message_id as string)}`);
  }

  private async deleteMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    const extId = args.extension_id as string | undefined;
    return this.apiDelete(`${this.extPath(extId)}/message-store/${encodeURIComponent(args.message_id as string)}`);
  }

  private async sendSms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from_number || !args.to_numbers || !args.text) {
      return { content: [{ type: 'text', text: 'from_number, to_numbers, and text are required' }], isError: true };
    }
    const toList = (args.to_numbers as string).split(',').map(n => ({ phoneNumber: n.trim() }));
    const extId = args.extension_id as string | undefined;
    return this.apiPost(`${this.extPath(extId)}/sms`, {
      from: { phoneNumber: args.from_number },
      to: toList,
      text: args.text,
    });
  }

  private async listVoicemails(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ messageType: 'VoiceMail' });
    if (args.read_status) params.set('readStatus', args.read_status as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('perPage', String(args.per_page));
    const extId = args.extension_id as string | undefined;
    return this.apiGet(`${this.extPath(extId)}/message-store?${params.toString()}`);
  }

  private async getVoicemail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    const extId = args.extension_id as string | undefined;
    return this.apiGet(`${this.extPath(extId)}/message-store/${encodeURIComponent(args.message_id as string)}`);
  }

  private async listMeetings(args: Record<string, unknown>): Promise<ToolResult> {
    const extId = args.extension_id as string | undefined;
    return this.apiGet(`${this.extPath(extId)}/meeting`);
  }

  private async createMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.topic) return { content: [{ type: 'text', text: 'topic is required' }], isError: true };
    const extId = args.extension_id as string | undefined;
    const body: Record<string, unknown> = {
      topic: args.topic,
      meetingType: 'Scheduled',
      duration: (args.duration as number) || 60,
    };
    if (args.start_time) body.schedule = { startTime: args.start_time };
    if (args.password) body.password = args.password;
    return this.apiPost(`${this.extPath(extId)}/meeting`, body);
  }

  private async getMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.meeting_id) return { content: [{ type: 'text', text: 'meeting_id is required' }], isError: true };
    const extId = args.extension_id as string | undefined;
    return this.apiGet(`${this.extPath(extId)}/meeting/${encodeURIComponent(args.meeting_id as string)}`);
  }

  private async deleteMeeting(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.meeting_id) return { content: [{ type: 'text', text: 'meeting_id is required' }], isError: true };
    const extId = args.extension_id as string | undefined;
    return this.apiDelete(`${this.extPath(extId)}/meeting/${encodeURIComponent(args.meeting_id as string)}`);
  }

  private async listFaxMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({ messageType: 'Fax' });
    if (args.read_status) params.set('readStatus', args.read_status as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('perPage', String(args.per_page));
    const extId = args.extension_id as string | undefined;
    return this.apiGet(`${this.extPath(extId)}/message-store?${params.toString()}`);
  }

  private async sendFax(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to_numbers) return { content: [{ type: 'text', text: 'to_numbers is required' }], isError: true };
    const toList = (args.to_numbers as string).split(',').map(n => ({ phoneNumber: n.trim() }));
    const extId = args.extension_id as string | undefined;
    // Fax API requires multipart/form-data per RingCentral docs
    const jsonPart: Record<string, unknown> = { to: toList };
    if (args.cover_page_text) jsonPart.coverPageText = args.cover_page_text;
    const formData = new FormData();
    formData.append('json', new Blob([JSON.stringify(jsonPart)], { type: 'application/json' }), 'request.json');
    const headers = await this.authHeaders();
    // Remove Content-Type to let fetch set multipart boundary automatically
    delete (headers as Record<string, string>)['Content-Type'];
    const response = await this.fetchWithRetry(`${this.baseUrl}${this.extPath(extId)}/fax`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.search_string) params.set('searchString', args.search_string as string);
    if (args.page) params.set('page', String(args.page));
    if (args.per_page) params.set('perPage', String(args.per_page));
    const extId = args.extension_id as string | undefined;
    const qs = params.toString();
    return this.apiGet(`${this.extPath(extId)}/address-book/contact${qs ? '?' + qs : ''}`);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    const extId = args.extension_id as string | undefined;
    return this.apiGet(`${this.extPath(extId)}/address-book/contact/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name) {
      return { content: [{ type: 'text', text: 'first_name and last_name are required' }], isError: true };
    }
    const extId = args.extension_id as string | undefined;
    const body: Record<string, unknown> = {
      firstName: args.first_name,
      lastName: args.last_name,
    };
    if (args.email) body.email = args.email;
    if (args.business_phone) body.businessPhone = args.business_phone;
    if (args.mobile_phone) body.mobilePhone = args.mobile_phone;
    if (args.company) body.company = args.company;
    return this.apiPost(`${this.extPath(extId)}/address-book/contact`, body);
  }
}
