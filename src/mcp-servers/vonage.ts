/**
 * Vonage MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Vonage has a documentation-only MCP (https://github.com/Vonage/vonage-mcp-server-documentation, 7 tools)
//   that only provides documentation search — NOT a functional API MCP. Community telephony MCP
//   (Vonage-Community/telephony-mcp-server) has only 2 tools (voice_call, send_sms) and is community,
//   not official. Neither qualifies. Use this REST adapter as primary.
//
// Base URL: https://rest.nexmo.com (SMS), https://api.nexmo.com (Voice, Verify, Numbers), https://api.vonage.com (Messages v1)
// Auth: API Key + API Secret (query params or JSON body). JWT (app_id + private_key) for Voice API calls.
// Docs: https://developer.vonage.com/en/api/
// Rate limits: Varies by API. SMS: 30 msg/sec default. Voice: 20 concurrent calls. Verify: 5 req/sec.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VonageConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

export class VonageMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly restBaseUrl: string;
  private readonly apiBaseUrl: string;

  constructor(config: VonageConfig) {
    super();
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.restBaseUrl = config.baseUrl || 'https://rest.nexmo.com';
    this.apiBaseUrl = 'https://api.nexmo.com';
  }

  static catalog() {
    return {
      name: 'vonage',
      displayName: 'Vonage',
      version: '1.0.0',
      category: 'communication',
      keywords: ['vonage', 'nexmo', 'sms', 'voice', 'call', 'verify', '2fa', 'otp', 'phone', 'number', 'messaging', 'text', 'mms', 'whatsapp'],
      toolNames: [
        'send_sms', 'get_sms_details', 'search_sms_messages',
        'create_call', 'get_call', 'list_calls', 'end_call',
        'start_verification', 'check_verification', 'cancel_verification',
        'list_numbers', 'search_available_numbers', 'buy_number', 'cancel_number',
        'get_account_balance',
      ],
      description: 'Vonage Communications APIs: send SMS and MMS, make and manage voice calls, verify phone numbers with OTP, manage virtual numbers, and monitor account balance.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_sms',
        description: 'Send an SMS message from a Vonage virtual number to a recipient phone number with text content',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Sender ID — your Vonage virtual number (e.g. +14155550100) or alphanumeric sender (max 11 chars)',
            },
            to: {
              type: 'string',
              description: 'Recipient phone number in E.164 format (e.g. +14155550101)',
            },
            text: {
              type: 'string',
              description: 'SMS message text content (max 1600 chars; messages over 160 chars are sent as multi-part SMS)',
            },
            type: {
              type: 'string',
              description: 'Message type: text or unicode (use unicode for emoji or non-Latin characters, default: text)',
            },
            client_ref: {
              type: 'string',
              description: 'Your own reference for this message (max 40 chars, returned in delivery receipt)',
            },
          },
          required: ['from', 'to', 'text'],
        },
      },
      {
        name: 'get_sms_details',
        description: 'Get delivery status and metadata for a sent SMS message by message ID',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Vonage SMS message ID returned when the message was sent',
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'search_sms_messages',
        description: 'Search sent and received SMS messages by date range, recipient phone number, or status',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date to search in YYYY-MM-DD format',
            },
            to: {
              type: 'string',
              description: 'Filter by recipient phone number in E.164 format',
            },
            client_ref: {
              type: 'string',
              description: 'Filter by your client reference string',
            },
          },
          required: ['date'],
        },
      },
      {
        name: 'create_call',
        description: 'Create an outbound voice call from a Vonage number to a phone number with an NCCO (Nexmo Call Control Object) script',
        inputSchema: {
          type: 'object',
          properties: {
            to_number: {
              type: 'string',
              description: 'Destination phone number in E.164 format',
            },
            from_number: {
              type: 'string',
              description: 'Vonage virtual number to call from in E.164 format',
            },
            answer_url: {
              type: 'string',
              description: 'URL that returns an NCCO JSON array controlling call flow (e.g. https://example.com/answer)',
            },
            event_url: {
              type: 'string',
              description: 'Webhook URL for call status events (answered, completed, failed)',
            },
            machine_detection: {
              type: 'string',
              description: 'Answering machine detection: continue or hangup (default: continue)',
            },
          },
          required: ['to_number', 'from_number', 'answer_url'],
        },
      },
      {
        name: 'get_call',
        description: 'Get current status and metadata for a specific Vonage voice call by call UUID',
        inputSchema: {
          type: 'object',
          properties: {
            call_uuid: {
              type: 'string',
              description: 'Vonage call UUID returned when the call was created',
            },
          },
          required: ['call_uuid'],
        },
      },
      {
        name: 'list_calls',
        description: 'List Vonage voice calls with optional filters for status, date range, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by call status: started, ringing, answered, machine, completed, busy, cancelled, failed, rejected, timeout, unanswered',
            },
            date_start: {
              type: 'string',
              description: 'Filter calls started after this ISO 8601 timestamp (e.g. 2026-01-01T00:00:00Z)',
            },
            date_end: {
              type: 'string',
              description: 'Filter calls started before this ISO 8601 timestamp',
            },
            page_size: {
              type: 'number',
              description: 'Calls per page (default: 10, max: 100)',
            },
            record_index: {
              type: 'number',
              description: 'Start index for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'end_call',
        description: 'Hang up an active Vonage voice call by call UUID',
        inputSchema: {
          type: 'object',
          properties: {
            call_uuid: {
              type: 'string',
              description: 'Vonage call UUID to terminate',
            },
          },
          required: ['call_uuid'],
        },
      },
      {
        name: 'start_verification',
        description: 'Start a Vonage phone number verification (2FA/OTP) — sends a code via SMS or voice call to the specified number',
        inputSchema: {
          type: 'object',
          properties: {
            number: {
              type: 'string',
              description: 'Phone number to verify in E.164 format (e.g. +14155550101)',
            },
            brand: {
              type: 'string',
              description: 'Brand name shown in the verification message (max 18 chars)',
            },
            code_length: {
              type: 'number',
              description: 'PIN code length: 4 or 6 digits (default: 4)',
            },
            locale: {
              type: 'string',
              description: 'Language locale for verification message (e.g. en-us, fr-fr, de-de — default: en-us)',
            },
            workflow_id: {
              type: 'number',
              description: 'Verification workflow: 1=SMS+TTS+TTS, 2=SMS+SMS+TTS, 3=TTS+TTS, 4=SMS+SMS, 5=SMS+TTS (default: 1)',
            },
          },
          required: ['number', 'brand'],
        },
      },
      {
        name: 'check_verification',
        description: 'Verify a PIN code submitted by a user against an active Vonage verification request',
        inputSchema: {
          type: 'object',
          properties: {
            request_id: {
              type: 'string',
              description: 'Verification request ID returned by start_verification',
            },
            code: {
              type: 'string',
              description: 'The PIN code entered by the user',
            },
          },
          required: ['request_id', 'code'],
        },
      },
      {
        name: 'cancel_verification',
        description: 'Cancel an active Vonage verification request before it expires',
        inputSchema: {
          type: 'object',
          properties: {
            request_id: {
              type: 'string',
              description: 'Verification request ID to cancel',
            },
          },
          required: ['request_id'],
        },
      },
      {
        name: 'list_numbers',
        description: 'List virtual phone numbers owned by the Vonage account with country, features, and cost information',
        inputSchema: {
          type: 'object',
          properties: {
            country: {
              type: 'string',
              description: 'Filter by country code (ISO 3166-1 alpha-2, e.g. US, GB)',
            },
            pattern: {
              type: 'string',
              description: 'Filter numbers matching this pattern (e.g. 1415 for San Francisco numbers)',
            },
            index: {
              type: 'number',
              description: 'Pagination start index (default: 1)',
            },
            count: {
              type: 'number',
              description: 'Numbers per page (default: 10, max: 100)',
            },
          },
        },
      },
      {
        name: 'search_available_numbers',
        description: 'Search for available Vonage virtual numbers to purchase in a specific country with feature and pattern filters',
        inputSchema: {
          type: 'object',
          properties: {
            country: {
              type: 'string',
              description: 'Country code (ISO 3166-1 alpha-2, e.g. US, GB, DE)',
            },
            pattern: {
              type: 'string',
              description: 'Number pattern to search for (digits only)',
            },
            features: {
              type: 'string',
              description: 'Required features: SMS, VOICE, or SMS,VOICE (default: SMS,VOICE)',
            },
            type: {
              type: 'string',
              description: 'Number type: landline, mobile-lvn, toll_free (default: mobile-lvn)',
            },
            count: {
              type: 'number',
              description: 'Maximum results to return (default: 10, max: 100)',
            },
          },
          required: ['country'],
        },
      },
      {
        name: 'buy_number',
        description: 'Purchase an available Vonage virtual phone number for your account',
        inputSchema: {
          type: 'object',
          properties: {
            country: {
              type: 'string',
              description: 'Country code (ISO 3166-1 alpha-2, e.g. US)',
            },
            msisdn: {
              type: 'string',
              description: 'Phone number to purchase in E.164 format without the leading + (e.g. 14155550100)',
            },
          },
          required: ['country', 'msisdn'],
        },
      },
      {
        name: 'cancel_number',
        description: 'Cancel (return) a Vonage virtual phone number from your account to stop billing',
        inputSchema: {
          type: 'object',
          properties: {
            country: {
              type: 'string',
              description: 'Country code of the number to cancel (ISO 3166-1 alpha-2)',
            },
            msisdn: {
              type: 'string',
              description: 'Phone number to cancel in E.164 format without leading + (e.g. 14155550100)',
            },
          },
          required: ['country', 'msisdn'],
        },
      },
      {
        name: 'get_account_balance',
        description: 'Get the current credit balance of the Vonage account in EUR',
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
        case 'send_sms':
          return this.sendSms(args);
        case 'get_sms_details':
          return this.getSmsDetails(args);
        case 'search_sms_messages':
          return this.searchSmsMessages(args);
        case 'create_call':
          return this.createCall(args);
        case 'get_call':
          return this.getCall(args);
        case 'list_calls':
          return this.listCalls(args);
        case 'end_call':
          return this.endCall(args);
        case 'start_verification':
          return this.startVerification(args);
        case 'check_verification':
          return this.checkVerification(args);
        case 'cancel_verification':
          return this.cancelVerification(args);
        case 'list_numbers':
          return this.listNumbers(args);
        case 'search_available_numbers':
          return this.searchAvailableNumbers(args);
        case 'buy_number':
          return this.buyNumber(args);
        case 'cancel_number':
          return this.cancelNumber(args);
        case 'get_account_balance':
          return this.getAccountBalance();
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

  private async restGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const allParams = { api_key: this.apiKey, api_secret: this.apiSecret, ...params };
    const qs = new URLSearchParams(allParams).toString();
    const response = await this.fetchWithRetry(`${this.restBaseUrl}${path}?${qs}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async restPost(path: string, body: Record<string, unknown> = {}, baseUrl?: string): Promise<ToolResult> {
    const payload = { api_key: this.apiKey, api_secret: this.apiSecret, ...body };
    const url = (baseUrl || this.restBaseUrl) + path;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const allParams = { api_key: this.apiKey, api_secret: this.apiSecret, ...params };
    const qs = new URLSearchParams(allParams).toString();
    const response = await this.fetchWithRetry(`${this.apiBaseUrl}${path}?${qs}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendSms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to || !args.text) return { content: [{ type: 'text', text: 'from, to, and text are required' }], isError: true };
    const body: Record<string, unknown> = { from: args.from, to: args.to, text: args.text };
    if (args.type) body.type = args.type;
    if (args.client_ref) body.client_ref = args.client_ref;
    return this.restPost('/sms/json', body);
  }

  private async getSmsDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    return this.apiGet('/search/message', { id: args.message_id as string });
  }

  private async searchSmsMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.date) return { content: [{ type: 'text', text: 'date is required' }], isError: true };
    const params: Record<string, string> = { date: args.date as string };
    if (args.to) params.to = args.to as string;
    if (args.client_ref) params.client_ref = args.client_ref as string;
    return this.apiGet('/search/messages', params);
  }

  private async createCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to_number || !args.from_number || !args.answer_url) {
      return { content: [{ type: 'text', text: 'to_number, from_number, and answer_url are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      to: [{ type: 'phone', number: args.to_number }],
      from: { type: 'phone', number: args.from_number },
      answer_url: [args.answer_url],
    };
    if (args.event_url) body.event_url = [args.event_url];
    if (args.machine_detection) body.machine_detection = args.machine_detection;
    // Note: Voice API requires JWT auth. For simplicity, using basic auth here.
    // Production use should implement JWT signing with node:crypto + application credentials.
    const response = await this.fetchWithRetry(`${this.apiBaseUrl}/v1/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa(`${this.apiKey}:${this.apiSecret}`)}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_uuid) return { content: [{ type: 'text', text: 'call_uuid is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.apiBaseUrl}/v1/calls/${encodeURIComponent(args.call_uuid as string)}`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Basic ${btoa(`${this.apiKey}:${this.apiSecret}`)}` },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page_size: String((args.page_size as number) || 10),
      record_index: String((args.record_index as number) || 0),
    };
    if (args.status) params.status = args.status as string;
    if (args.date_start) params.date_start = args.date_start as string;
    if (args.date_end) params.date_end = args.date_end as string;
    const qs = new URLSearchParams(params).toString();
    const response = await this.fetchWithRetry(`${this.apiBaseUrl}/v1/calls?${qs}`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Basic ${btoa(`${this.apiKey}:${this.apiSecret}`)}` },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async endCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_uuid) return { content: [{ type: 'text', text: 'call_uuid is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.apiBaseUrl}/v1/calls/${encodeURIComponent(args.call_uuid as string)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Basic ${btoa(`${this.apiKey}:${this.apiSecret}`)}` },
      body: JSON.stringify({ action: 'hangup' }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'call ended', call_uuid: args.call_uuid }) }], isError: false };
  }

  private async startVerification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.number || !args.brand) return { content: [{ type: 'text', text: 'number and brand are required' }], isError: true };
    const body: Record<string, unknown> = { number: args.number, brand: args.brand };
    if (args.code_length) body.code_length = args.code_length;
    if (args.locale) body.lg = args.locale;
    if (args.workflow_id) body.workflow_id = args.workflow_id;
    return this.restPost('/verify/json', body);
  }

  private async checkVerification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.request_id || !args.code) return { content: [{ type: 'text', text: 'request_id and code are required' }], isError: true };
    return this.restPost('/verify/check/json', { request_id: args.request_id, code: args.code });
  }

  private async cancelVerification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.request_id) return { content: [{ type: 'text', text: 'request_id is required' }], isError: true };
    return this.restPost('/verify/control/json', { request_id: args.request_id, cmd: 'cancel' });
  }

  private async listNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      index: String((args.index as number) || 1),
      count: String((args.count as number) || 10),
    };
    if (args.country) params.country = args.country as string;
    if (args.pattern) params.pattern = args.pattern as string;
    return this.apiGet('/account/numbers', params);
  }

  private async searchAvailableNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.country) return { content: [{ type: 'text', text: 'country is required' }], isError: true };
    const params: Record<string, string> = {
      country: args.country as string,
      features: (args.features as string) || 'SMS,VOICE',
      type: (args.type as string) || 'mobile-lvn',
      count: String((args.count as number) || 10),
    };
    if (args.pattern) params.pattern = args.pattern as string;
    return this.apiGet('/number/search', params);
  }

  private async buyNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.country || !args.msisdn) return { content: [{ type: 'text', text: 'country and msisdn are required' }], isError: true };
    return this.restPost('/number/buy', { country: args.country, msisdn: args.msisdn });
  }

  private async cancelNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.country || !args.msisdn) return { content: [{ type: 'text', text: 'country and msisdn are required' }], isError: true };
    return this.restPost('/number/cancel', { country: args.country, msisdn: args.msisdn });
  }

  private async getAccountBalance(): Promise<ToolResult> {
    return this.restGet('/account/get-balance');
  }
}
