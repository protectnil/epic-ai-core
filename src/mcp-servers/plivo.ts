/**
 * Plivo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Plivo MCP server was found on GitHub or Plivo's developer portal.
//
// Base URL: https://api.plivo.com/v1/Account/{auth_id}
// Auth: HTTP Basic auth — Auth ID as username, Auth Token as password
// Docs: https://plivo.com/docs/account/api/overview
// Rate limits: 300 requests per 5 seconds (per account API overview documentation)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PlivoConfig {
  authId: string;
  authToken: string;
  baseUrl?: string;
}

export class PlivoMCPServer extends MCPAdapterBase {
  private readonly authId: string;
  private readonly authToken: string;
  private readonly baseUrl: string;

  constructor(config: PlivoConfig) {
    super();
    this.authId = config.authId;
    this.authToken = config.authToken;
    this.baseUrl = config.baseUrl || 'https://api.plivo.com/v1';
  }

  static catalog() {
    return {
      name: 'plivo',
      displayName: 'Plivo',
      version: '1.0.0',
      category: 'communication',
      keywords: ['plivo', 'sms', 'voice', 'call', 'phone', 'telephony', 'message', 'number', 'verify', 'otp'],
      toolNames: [
        'send_message', 'get_message', 'list_messages',
        'make_call', 'get_call', 'list_calls', 'hangup_call',
        'list_phone_numbers', 'get_phone_number',
        'list_endpoints', 'get_endpoint', 'create_endpoint', 'update_endpoint', 'delete_endpoint',
        'get_account',
      ],
      description: 'Plivo communications platform: send SMS, make and manage voice calls, manage phone numbers and SIP endpoints.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_message',
        description: 'Send an SMS or MMS message to one or more recipients via Plivo',
        inputSchema: {
          type: 'object',
          properties: {
            src: { type: 'string', description: 'Sender phone number in E.164 format (e.g. +14155551234)' },
            dst: { type: 'string', description: 'Recipient phone number(s) in E.164 format; multiple separated by < (e.g. +14155551234<+14155556789)' },
            text: { type: 'string', description: 'Message body text (up to 160 chars per SMS segment)' },
            type: { type: 'string', description: 'Message type: sms or mms (default: sms)' },
            url: { type: 'string', description: 'Callback URL for delivery status updates' },
          },
          required: ['src', 'dst', 'text'],
        },
      },
      {
        name: 'get_message',
        description: 'Get details and delivery status of a specific Plivo message by message UUID',
        inputSchema: {
          type: 'object',
          properties: {
            message_uuid: { type: 'string', description: 'Unique message UUID returned when the message was sent' },
          },
          required: ['message_uuid'],
        },
      },
      {
        name: 'list_messages',
        description: 'List outbound and inbound messages with optional filters for number, date, and status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of results to return (max: 20, default: 20)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            src: { type: 'string', description: 'Filter by source phone number' },
            dst: { type: 'string', description: 'Filter by destination phone number' },
            message_direction: { type: 'string', description: 'Filter by direction: inbound or outbound' },
            message_state: { type: 'string', description: 'Filter by state: queued, sent, failed, delivered, undelivered, rejected' },
            message_type: { type: 'string', description: 'Filter by type: sms or mms' },
          },
        },
      },
      {
        name: 'make_call',
        description: 'Initiate an outbound voice call from a Plivo number to a destination number',
        inputSchema: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Caller ID in E.164 format (must be a Plivo number or verified caller ID)' },
            to: { type: 'string', description: 'Destination phone number(s) in E.164 format; multiple separated by <' },
            answer_url: { type: 'string', description: 'URL to fetch Plivo XML instructions when the call is answered' },
            answer_method: { type: 'string', description: 'HTTP method for answer_url: GET or POST (default: POST)' },
            time_limit: { type: 'number', description: 'Maximum call duration in seconds (default: 14400)' },
            caller_name: { type: 'string', description: 'Caller name to display (default: account caller ID)' },
          },
          required: ['from', 'to', 'answer_url'],
        },
      },
      {
        name: 'get_call',
        description: 'Get details of a specific Plivo call by call UUID including status and duration',
        inputSchema: {
          type: 'object',
          properties: {
            call_uuid: { type: 'string', description: 'Unique call UUID' },
          },
          required: ['call_uuid'],
        },
      },
      {
        name: 'list_calls',
        description: 'List call records with optional filters for direction, status, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of results (max: 20, default: 20)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            call_direction: { type: 'string', description: 'Filter by direction: inbound or outbound' },
            call_state: { type: 'string', description: 'Filter by state: answered, busy, failed, no-answer, queued, ringing' },
            from_number: { type: 'string', description: 'Filter by caller phone number' },
            to_number: { type: 'string', description: 'Filter by destination phone number' },
          },
        },
      },
      {
        name: 'hangup_call',
        description: 'Hang up an active or queued Plivo call by call UUID',
        inputSchema: {
          type: 'object',
          properties: {
            call_uuid: { type: 'string', description: 'Unique call UUID of the call to hang up' },
          },
          required: ['call_uuid'],
        },
      },
      {
        name: 'list_phone_numbers',
        description: 'List all phone numbers owned by the Plivo account with type and region filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of results (max: 20, default: 20)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            type: { type: 'string', description: 'Filter by number type: local, national, mobile, tollfree' },
            country_iso: { type: 'string', description: 'Filter by country ISO code (e.g. US, GB, IN)' },
          },
        },
      },
      {
        name: 'get_phone_number',
        description: 'Get details for a specific Plivo phone number including SMS and voice capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            number: { type: 'string', description: 'Phone number in E.164 format (without the + prefix, e.g. 14155551234)' },
          },
          required: ['number'],
        },
      },
      {
        name: 'list_endpoints',
        description: 'List all SIP endpoints configured in the Plivo account',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of results (max: 20, default: 20)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_endpoint',
        description: 'Get details for a specific Plivo SIP endpoint by endpoint ID',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: { type: 'string', description: 'Unique endpoint ID' },
          },
          required: ['endpoint_id'],
        },
      },
      {
        name: 'create_endpoint',
        description: 'Create a new SIP endpoint in Plivo for IP phone or softphone registration',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'SIP username for the endpoint (alphanumeric)' },
            password: { type: 'string', description: 'SIP password for the endpoint' },
            alias: { type: 'string', description: 'Friendly display name for the endpoint' },
            app_id: { type: 'string', description: 'Application ID to associate with this endpoint' },
          },
          required: ['username', 'password', 'alias'],
        },
      },
      {
        name: 'update_endpoint',
        description: 'Update an existing Plivo SIP endpoint password, alias, or application assignment',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: { type: 'string', description: 'Unique endpoint ID to update' },
            password: { type: 'string', description: 'New SIP password for the endpoint' },
            alias: { type: 'string', description: 'New friendly display name' },
            app_id: { type: 'string', description: 'New application ID to associate' },
          },
          required: ['endpoint_id'],
        },
      },
      {
        name: 'delete_endpoint',
        description: 'Delete a Plivo SIP endpoint by endpoint ID',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: { type: 'string', description: 'Unique endpoint ID to delete' },
          },
          required: ['endpoint_id'],
        },
      },
      {
        name: 'get_account',
        description: 'Get Plivo account details including name, auth ID, cash credits, and account type',
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
        case 'send_message': return this.sendMessage(args);
        case 'get_message': return this.getMessage(args);
        case 'list_messages': return this.listMessages(args);
        case 'make_call': return this.makeCall(args);
        case 'get_call': return this.getCall(args);
        case 'list_calls': return this.listCalls(args);
        case 'hangup_call': return this.hangupCall(args);
        case 'list_phone_numbers': return this.listPhoneNumbers(args);
        case 'get_phone_number': return this.getPhoneNumber(args);
        case 'list_endpoints': return this.listEndpoints(args);
        case 'get_endpoint': return this.getEndpoint(args);
        case 'create_endpoint': return this.createEndpoint(args);
        case 'update_endpoint': return this.updateEndpoint(args);
        case 'delete_endpoint': return this.deleteEndpoint(args);
        case 'get_account': return this.getAccount();
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

  private get authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.authId}:${this.authToken}`).toString('base64');
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private get accountBase(): string {
    return `${this.baseUrl}/Account/${this.authId}`;
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.accountBase}${path}/${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.accountBase}${path}/`, {
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

  private async patch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.accountBase}${path}/`, {
      method: 'POST',
      headers: { ...this.headers, 'X-HTTP-Method-Override': 'PATCH' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.accountBase}${path}/`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.src || !args.dst || !args.text) return { content: [{ type: 'text', text: 'src, dst, and text are required' }], isError: true };
    const body: Record<string, unknown> = { src: args.src, dst: args.dst, text: args.text };
    if (args.type) body.type = args.type;
    if (args.url) body.url = args.url;
    return this.post('/Message', body);
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_uuid) return { content: [{ type: 'text', text: 'message_uuid is required' }], isError: true };
    return this.get(`/Message/${encodeURIComponent(args.message_uuid as string)}`);
  }

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    };
    if (args.src) params.src = args.src as string;
    if (args.dst) params.dst = args.dst as string;
    if (args.message_direction) params.message_direction = args.message_direction as string;
    if (args.message_state) params.message_state = args.message_state as string;
    if (args.message_type) params.message_type = args.message_type as string;
    return this.get('/Message', params);
  }

  private async makeCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to || !args.answer_url) return { content: [{ type: 'text', text: 'from, to, and answer_url are required' }], isError: true };
    const body: Record<string, unknown> = { from: args.from, to: args.to, answer_url: args.answer_url };
    if (args.answer_method) body.answer_method = args.answer_method;
    if (args.time_limit) body.time_limit = args.time_limit;
    if (args.caller_name) body.caller_name = args.caller_name;
    return this.post('/Call', body);
  }

  private async getCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_uuid) return { content: [{ type: 'text', text: 'call_uuid is required' }], isError: true };
    return this.get(`/Call/${encodeURIComponent(args.call_uuid as string)}`);
  }

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    };
    if (args.call_direction) params.call_direction = args.call_direction as string;
    if (args.call_state) params.call_state = args.call_state as string;
    if (args.from_number) params.from_number = args.from_number as string;
    if (args.to_number) params.to_number = args.to_number as string;
    return this.get('/Call', params);
  }

  private async hangupCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_uuid) return { content: [{ type: 'text', text: 'call_uuid is required' }], isError: true };
    return this.del(`/Call/${encodeURIComponent(args.call_uuid as string)}`);
  }

  private async listPhoneNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    };
    if (args.type) params.type = args.type as string;
    if (args.country_iso) params.country_iso = args.country_iso as string;
    return this.get('/Number', params);
  }

  private async getPhoneNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.number) return { content: [{ type: 'text', text: 'number is required' }], isError: true };
    return this.get(`/Number/${encodeURIComponent(args.number as string)}`);
  }

  private async listEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) || 20),
      offset: String((args.offset as number) || 0),
    };
    return this.get('/Endpoint', params);
  }

  private async getEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpoint_id) return { content: [{ type: 'text', text: 'endpoint_id is required' }], isError: true };
    return this.get(`/Endpoint/${encodeURIComponent(args.endpoint_id as string)}`);
  }

  private async createEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username || !args.password || !args.alias) return { content: [{ type: 'text', text: 'username, password, and alias are required' }], isError: true };
    const body: Record<string, unknown> = { username: args.username, password: args.password, alias: args.alias };
    if (args.app_id) body.app_id = args.app_id;
    return this.post('/Endpoint', body);
  }

  private async updateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpoint_id) return { content: [{ type: 'text', text: 'endpoint_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.password) body.password = args.password;
    if (args.alias) body.alias = args.alias;
    if (args.app_id) body.app_id = args.app_id;
    return this.patch(`/Endpoint/${encodeURIComponent(args.endpoint_id as string)}`, body);
  }

  private async deleteEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpoint_id) return { content: [{ type: 'text', text: 'endpoint_id is required' }], isError: true };
    return this.del(`/Endpoint/${encodeURIComponent(args.endpoint_id as string)}`);
  }

  private async getAccount(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/Account/${this.authId}/`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
