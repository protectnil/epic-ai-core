/**
 * Dialpad MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Dialpad's "Dialtone MCP Server" (github.com/dialpad/dialtone) is a design-system UI component
// search tool, NOT a Dialpad API integration MCP. No official Dialpad API MCP server found on GitHub.
// Our adapter covers: 18 tools. Vendor MCP covers: 0 tools (Dialtone is UI/design-system only).
// Recommendation: use-rest-api — no official Dialpad API MCP server exists.
//
// Base URL: https://dialpad.com/api/v2
// Auth: Bearer token (API key sent as Authorization: Bearer {apiKey})
// Docs: https://developers.dialpad.com/reference
// Rate limits: 20 requests/second per company; per-endpoint limits (e.g. 1200/min for most list endpoints)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DialpadConfig {
  apiKey: string;
  baseUrl?: string;
}

export class DialpadMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: DialpadConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://dialpad.com/api/v2';
  }

  static catalog() {
    return {
      name: 'dialpad',
      displayName: 'Dialpad',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'dialpad', 'voip', 'phone', 'call', 'sms', 'messaging', 'business communications',
        'contact center', 'ai calling', 'voice', 'user management', 'analytics',
        'dialpad ai', 'uccaas',
      ],
      toolNames: [
        'list_users', 'get_user', 'get_current_user',
        'list_calls', 'get_call', 'initiate_call',
        'send_sms', 'list_sms',
        'list_contacts', 'get_contact', 'create_contact', 'update_contact', 'delete_contact',
        'initiate_stats_export', 'get_stats_result',
        'list_departments', 'get_department',
        'list_numbers', 'get_number',
      ],
      description: 'Dialpad AI business communications: manage calls, SMS, contacts, users, departments, phone numbers, and retrieve call analytics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List users in the Dialpad company with optional filters for state and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            state: {
              type: 'string',
              description: 'Filter by user state: active, suspended, deleted (default: active)',
            },
            email: {
              type: 'string',
              description: 'Filter users by email address (exact match)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get detailed information about a specific Dialpad user by their user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Dialpad user ID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_current_user',
        description: 'Get the profile and account information for the currently authenticated Dialpad user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_calls',
        description: 'List recent calls with optional filters for direction, type, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of calls to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            started_after: {
              type: 'number',
              description: 'Filter calls started after this Unix timestamp (milliseconds)',
            },
            started_before: {
              type: 'number',
              description: 'Filter calls started before this Unix timestamp (milliseconds)',
            },
            direction: {
              type: 'string',
              description: 'Filter by call direction: inbound or outbound',
            },
            call_type: {
              type: 'string',
              description: 'Filter by call type: voip, pstn',
            },
          },
        },
      },
      {
        name: 'get_call',
        description: 'Get detailed information about a specific call by call ID, including recording and transcript metadata',
        inputSchema: {
          type: 'object',
          properties: {
            call_id: {
              type: 'string',
              description: 'Dialpad call ID',
            },
          },
          required: ['call_id'],
        },
      },
      {
        name: 'initiate_call',
        description: 'Initiate an outbound call from a Dialpad user or number to a destination phone number',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number: {
              type: 'string',
              description: 'Destination phone number in E.164 format (e.g. +12025551234)',
            },
            user_id: {
              type: 'string',
              description: 'ID of the Dialpad user initiating the call',
            },
            outbound_caller_id: {
              type: 'string',
              description: 'Caller ID phone number to display to the recipient in E.164 format',
            },
          },
          required: ['phone_number', 'user_id'],
        },
      },
      {
        name: 'send_sms',
        description: 'Send an SMS or MMS message from a Dialpad number to one or more recipients',
        inputSchema: {
          type: 'object',
          properties: {
            to_numbers: {
              type: 'string',
              description: 'Comma-separated list of destination phone numbers in E.164 format',
            },
            text: {
              type: 'string',
              description: 'Text content of the SMS message (max 1600 characters)',
            },
            from_number: {
              type: 'string',
              description: 'Dialpad phone number to send from in E.164 format',
            },
            user_id: {
              type: 'string',
              description: 'ID of the user sending the message',
            },
          },
          required: ['to_numbers', 'text', 'user_id'],
        },
      },
      {
        name: 'list_sms',
        description: 'List SMS/MMS messages with optional filters for direction, phone number, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            created_after: {
              type: 'number',
              description: 'Filter messages created after this Unix timestamp (milliseconds)',
            },
            direction: {
              type: 'string',
              description: 'Filter by direction: inbound or outbound',
            },
          },
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts in the Dialpad company directory with optional search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of contacts to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            search: {
              type: 'string',
              description: 'Search query to filter contacts by name, email, or phone',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get detailed information about a specific Dialpad contact by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Dialpad contact ID',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in the Dialpad company directory',
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
            phone_numbers: {
              type: 'string',
              description: 'Comma-separated list of phone numbers in E.164 format',
            },
            email: {
              type: 'string',
              description: 'Contact email address',
            },
            company_name: {
              type: 'string',
              description: 'Contact company or organization name',
            },
            job_title: {
              type: 'string',
              description: 'Contact job title',
            },
          },
          required: ['first_name'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update an existing Dialpad contact by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Dialpad contact ID to update',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            phone_numbers: {
              type: 'string',
              description: 'Updated comma-separated list of phone numbers in E.164 format',
            },
            email: {
              type: 'string',
              description: 'Updated email address',
            },
            company_name: {
              type: 'string',
              description: 'Updated company name',
            },
            job_title: {
              type: 'string',
              description: 'Updated job title',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Delete a contact from the Dialpad company directory by contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'Dialpad contact ID to delete',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'initiate_stats_export',
        description: 'Initiate async export of Dialpad call or messaging statistics for a date range; returns an export ID to poll with get_stats_result',
        inputSchema: {
          type: 'object',
          properties: {
            stat_type: {
              type: 'string',
              description: 'Type of statistics to export: calls, sms, voicemail (required)',
            },
            export_type: {
              type: 'string',
              description: 'Export format: stats (aggregated) or records (one row per call/message)',
            },
            days_ago_start: {
              type: 'number',
              description: 'Start of date range as number of days ago (e.g. 7 for one week ago). Use 0 for today.',
            },
            days_ago_end: {
              type: 'number',
              description: 'End of date range as number of days ago (e.g. 0 for today)',
            },
            is_today: {
              type: 'boolean',
              description: 'Query real-time tables refreshed every 30 minutes (overrides days_ago params)',
            },
            target_id: {
              type: 'string',
              description: 'Filter by specific target (office, department, call center, or user ID)',
            },
            office_id: {
              type: 'string',
              description: 'Filter by office ID (overridden by target_id if both provided)',
            },
            timezone: {
              type: 'string',
              description: 'Timezone for date grouping as tz database name (e.g. America/New_York). Default: UTC',
            },
          },
          required: ['stat_type'],
        },
      },
      {
        name: 'get_stats_result',
        description: 'Retrieve the CSV result of a previously initiated Dialpad stats export by export ID; poll until status is done',
        inputSchema: {
          type: 'object',
          properties: {
            export_id: {
              type: 'string',
              description: 'Export ID returned by initiate_stats_export',
            },
          },
          required: ['export_id'],
        },
      },
      {
        name: 'list_departments',
        description: 'List departments (call centers, groups) in the Dialpad company with member counts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of departments to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_department',
        description: 'Get detailed information about a specific Dialpad department by department ID',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: {
              type: 'string',
              description: 'Dialpad department ID',
            },
          },
          required: ['department_id'],
        },
      },
      {
        name: 'list_numbers',
        description: 'List phone numbers assigned to the Dialpad company with type and assignment details',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of phone numbers to return (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_number',
        description: 'Get details about a specific Dialpad phone number including assignment and capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            number_id: {
              type: 'string',
              description: 'Dialpad phone number ID',
            },
          },
          required: ['number_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'get_current_user':
          return this.getCurrentUser();
        case 'list_calls':
          return this.listCalls(args);
        case 'get_call':
          return this.getCall(args);
        case 'initiate_call':
          return this.initiateCall(args);
        case 'send_sms':
          return this.sendSms(args);
        case 'list_sms':
          return this.listSms(args);
        case 'list_contacts':
          return this.listContacts(args);
        case 'get_contact':
          return this.getContact(args);
        case 'create_contact':
          return this.createContact(args);
        case 'update_contact':
          return this.updateContact(args);
        case 'delete_contact':
          return this.deleteContact(args);
        case 'initiate_stats_export':
          return this.initiateStatsExport(args);
        case 'get_stats_result':
          return this.getStatsResult(args);
        case 'list_departments':
          return this.listDepartments(args);
        case 'get_department':
          return this.getDepartment(args);
        case 'list_numbers':
          return this.listNumbers(args);
        case 'get_number':
          return this.getNumber(args);
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
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async dialpadGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async dialpadPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async dialpadPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async dialpadDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (response.status === 204 || response.ok) {
      return { content: [{ type: 'text', text: 'Deleted successfully' }], isError: false };
    }
    return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.state) params.state = args.state as string;
    if (args.email) params.email = args.email as string;
    return this.dialpadGet('/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.dialpadGet(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async getCurrentUser(): Promise<ToolResult> {
    return this.dialpadGet('/users/me');
  }

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.started_after) params.started_after = String(args.started_after);
    if (args.started_before) params.started_before = String(args.started_before);
    if (args.direction) params.direction = args.direction as string;
    if (args.call_type) params.call_type = args.call_type as string;
    return this.dialpadGet('/calls', params);
  }

  private async getCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_id) return { content: [{ type: 'text', text: 'call_id is required' }], isError: true };
    return this.dialpadGet(`/calls/${encodeURIComponent(args.call_id as string)}`);
  }

  private async initiateCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number || !args.user_id) {
      return { content: [{ type: 'text', text: 'phone_number and user_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      phone_number: args.phone_number,
      user_id: args.user_id,
    };
    if (args.outbound_caller_id) body.outbound_caller_id = args.outbound_caller_id;
    return this.dialpadPost('/calls', body);
  }

  private async sendSms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to_numbers || !args.text || !args.user_id) {
      return { content: [{ type: 'text', text: 'to_numbers, text, and user_id are required' }], isError: true };
    }
    const toList = (args.to_numbers as string).split(',').map(n => n.trim());
    const body: Record<string, unknown> = {
      to_numbers: toList,
      text: args.text,
      user_id: args.user_id,
    };
    if (args.from_number) body.from_number = args.from_number;
    return this.dialpadPost('/sms', body);
  }

  private async listSms(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.created_after) params.created_after = String(args.created_after);
    if (args.direction) params.direction = args.direction as string;
    return this.dialpadGet('/sms', params);
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.search) params.search = args.search as string;
    return this.dialpadGet('/contacts', params);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.dialpadGet(`/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name) return { content: [{ type: 'text', text: 'first_name is required' }], isError: true };
    const body: Record<string, unknown> = { first_name: args.first_name };
    if (args.last_name) body.last_name = args.last_name;
    if (args.phone_numbers) body.phones = (args.phone_numbers as string).split(',').map(p => ({ phone_number: p.trim() }));
    if (args.email) body.emails = [{ email: args.email }];
    if (args.company_name) body.company_name = args.company_name;
    if (args.job_title) body.job_title = args.job_title;
    return this.dialpadPost('/contacts', body);
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.first_name) body.first_name = args.first_name;
    if (args.last_name) body.last_name = args.last_name;
    if (args.phone_numbers) body.phones = (args.phone_numbers as string).split(',').map(p => ({ phone_number: p.trim() }));
    if (args.email) body.emails = [{ email: args.email }];
    if (args.company_name) body.company_name = args.company_name;
    if (args.job_title) body.job_title = args.job_title;
    return this.dialpadPatch(`/contacts/${encodeURIComponent(args.contact_id as string)}`, body);
  }

  private async deleteContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.dialpadDelete(`/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async initiateStatsExport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stat_type) {
      return { content: [{ type: 'text', text: 'stat_type is required' }], isError: true };
    }
    const body: Record<string, unknown> = { stat_type: args.stat_type };
    if (args.export_type) body.export_type = args.export_type;
    if (args.days_ago_start !== undefined) body.days_ago_start = args.days_ago_start;
    if (args.days_ago_end !== undefined) body.days_ago_end = args.days_ago_end;
    if (args.is_today !== undefined) body.is_today = args.is_today;
    if (args.target_id) body.target_id = args.target_id;
    if (args.office_id) body.office_id = args.office_id;
    if (args.timezone) body.timezone = args.timezone;
    return this.dialpadPost('/stats', body);
  }

  private async getStatsResult(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.export_id) {
      return { content: [{ type: 'text', text: 'export_id is required' }], isError: true };
    }
    return this.dialpadGet(`/stats/${encodeURIComponent(args.export_id as string)}`);
  }

  private async listDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    return this.dialpadGet('/departments', params);
  }

  private async getDepartment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.department_id) return { content: [{ type: 'text', text: 'department_id is required' }], isError: true };
    return this.dialpadGet(`/departments/${encodeURIComponent(args.department_id as string)}`);
  }

  private async listNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { limit: String((args.limit as number) || 25) };
    if (args.cursor) params.cursor = args.cursor as string;
    return this.dialpadGet('/numbers', params);
  }

  private async getNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.number_id) return { content: [{ type: 'text', text: 'number_id is required' }], isError: true };
    return this.dialpadGet(`/numbers/${encodeURIComponent(args.number_id as string)}`);
  }
}
