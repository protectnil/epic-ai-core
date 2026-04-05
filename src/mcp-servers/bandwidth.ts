/**
 * Bandwidth MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Bandwidth Voice and Messaging REST APIs
// Messaging Base URL: https://messaging.bandwidth.com
// Voice Base URL: https://voice.bandwidth.com
// Auth: HTTP Basic — API token as username, API secret as password
// Docs: https://dev.bandwidth.com
// Rate limits: varies by account tier; see https://dev.bandwidth.com/docs/numbers/rateLimits/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BandwidthConfig {
  accountId: string;
  apiToken: string;
  apiSecret: string;
  messagingBaseUrl?: string;
  voiceBaseUrl?: string;
  numberOrderBaseUrl?: string;
}

export class BandwidthMCPServer extends MCPAdapterBase {
  private readonly accountId: string;
  private readonly authHeader: string;
  private readonly messagingBaseUrl: string;
  private readonly voiceBaseUrl: string;
  private readonly numberOrderBaseUrl: string;

  constructor(config: BandwidthConfig) {
    super();
    this.accountId = config.accountId;
    this.authHeader = `Basic ${btoa(`${config.apiToken}:${config.apiSecret}`)}`;
    this.messagingBaseUrl = (config.messagingBaseUrl || 'https://messaging.bandwidth.com').replace(/\/$/, '');
    this.voiceBaseUrl = (config.voiceBaseUrl || 'https://voice.bandwidth.com').replace(/\/$/, '');
    this.numberOrderBaseUrl = (config.numberOrderBaseUrl || 'https://dashboard.bandwidth.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'bandwidth',
      displayName: 'Bandwidth',
      version: '1.0.0',
      category: 'communication',
      keywords: ['bandwidth', 'sms', 'mms', 'voice', 'phone', 'messaging', 'communications', 'telephony', 'call', 'text', 'did', 'pstn'],
      toolNames: [
        'send_message', 'list_messages', 'get_message',
        'create_call', 'get_call', 'list_calls', 'update_call', 'get_call_recording',
        'list_available_numbers', 'order_phone_number', 'list_phone_numbers',
        'create_messaging_application', 'send_group_message',
      ],
      description: 'Bandwidth voice and messaging platform: send SMS/MMS, manage voice calls and recordings, order and manage phone numbers, and create messaging applications.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_message',
        description: 'Send an SMS or MMS message from a Bandwidth phone number to one or more recipients',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Bandwidth messaging application ID associated with the from number',
            },
            from: {
              type: 'string',
              description: 'Sending phone number in E.164 format (e.g. +12065551234)',
            },
            to: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of recipient phone numbers in E.164 format',
            },
            text: {
              type: 'string',
              description: 'Message body text (for SMS; optional if media is provided)',
            },
            media: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of media URLs for MMS attachments (optional)',
            },
            tag: {
              type: 'string',
              description: 'Custom tag string for tracking and callbacks (optional)',
            },
          },
          required: ['application_id', 'from', 'to'],
        },
      },
      {
        name: 'list_messages',
        description: 'List messages sent or received on the account, with optional filters for date range, status, or direction',
        inputSchema: {
          type: 'object',
          properties: {
            source_tn: {
              type: 'string',
              description: 'Filter by source phone number in E.164 format (optional)',
            },
            destination_tn: {
              type: 'string',
              description: 'Filter by destination phone number in E.164 format (optional)',
            },
            message_status: {
              type: 'string',
              description: 'Filter by message status: RECEIVED, QUEUED, SENDING, SENT, FAILED, DELIVERED, ACCEPTED, UNDELIVERABLE (optional)',
            },
            message_direction: {
              type: 'string',
              description: 'Filter by direction: INBOUND or OUTBOUND (optional)',
            },
            from_date_time: {
              type: 'string',
              description: 'Start of date range in ISO 8601 format (optional)',
            },
            to_date_time: {
              type: 'string',
              description: 'End of date range in ISO 8601 format (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 100, max: 1000)',
            },
          },
        },
      },
      {
        name: 'get_message',
        description: 'Get the status and details of a specific message by its message ID',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: {
              type: 'string',
              description: 'Bandwidth message ID',
            },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'create_call',
        description: 'Initiate an outbound voice call from a Bandwidth phone number to a destination number',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Calling phone number in E.164 format',
            },
            to: {
              type: 'string',
              description: 'Destination phone number in E.164 format',
            },
            application_id: {
              type: 'string',
              description: 'Bandwidth voice application ID that handles call events',
            },
            answer_url: {
              type: 'string',
              description: 'Webhook URL to receive BXML instructions when the call is answered',
            },
            answer_method: {
              type: 'string',
              description: 'HTTP method for the answer webhook: GET or POST (default: POST)',
            },
            call_timeout: {
              type: 'number',
              description: 'Seconds to wait for the callee to answer before timing out (default: 30)',
            },
            machine_detection: {
              type: 'string',
              description: 'Answering machine detection mode: disabled, detect, detectSpeech, detectWordCount (optional)',
            },
            tag: {
              type: 'string',
              description: 'Custom tag string for tracking (optional)',
            },
          },
          required: ['from', 'to', 'application_id', 'answer_url'],
        },
      },
      {
        name: 'get_call',
        description: 'Get the current state and details of an active or completed voice call',
        inputSchema: {
          type: 'object',
          properties: {
            call_id: {
              type: 'string',
              description: 'Bandwidth call ID',
            },
          },
          required: ['call_id'],
        },
      },
      {
        name: 'list_calls',
        description: 'List voice calls for the account, optionally filtered by state or phone number',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Filter by voice application ID (optional)',
            },
            to: {
              type: 'string',
              description: 'Filter by destination phone number in E.164 format (optional)',
            },
            from: {
              type: 'string',
              description: 'Filter by originating phone number in E.164 format (optional)',
            },
            min_start_time: {
              type: 'string',
              description: 'Filter calls started at or after this ISO 8601 datetime (optional)',
            },
            max_start_time: {
              type: 'string',
              description: 'Filter calls started at or before this ISO 8601 datetime (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Maximum number of calls to return (default: 1000)',
            },
          },
        },
      },
      {
        name: 'update_call',
        description: 'Update an active call — transfer, redirect to new BXML, or hang up',
        inputSchema: {
          type: 'object',
          properties: {
            call_id: {
              type: 'string',
              description: 'Bandwidth call ID to update',
            },
            state: {
              type: 'string',
              description: 'New call state: active (redirect), completed (hang up)',
            },
            redirect_url: {
              type: 'string',
              description: 'URL returning new BXML for call redirection (required when state is active)',
            },
            redirect_method: {
              type: 'string',
              description: 'HTTP method for the redirect URL: GET or POST (default: POST)',
            },
          },
          required: ['call_id', 'state'],
        },
      },
      {
        name: 'get_call_recording',
        description: 'Get the recording metadata and download URL for a recorded voice call',
        inputSchema: {
          type: 'object',
          properties: {
            call_id: {
              type: 'string',
              description: 'Bandwidth call ID',
            },
            recording_id: {
              type: 'string',
              description: 'Recording ID (omit to list all recordings for the call)',
            },
          },
          required: ['call_id'],
        },
      },
      {
        name: 'list_available_numbers',
        description: 'Search for available phone numbers to purchase by area code, city, state, or toll-free prefix',
        inputSchema: {
          type: 'object',
          properties: {
            area_code: {
              type: 'string',
              description: 'Three-digit area code to search within (optional)',
            },
            state: {
              type: 'string',
              description: 'Two-letter US state abbreviation (optional)',
            },
            city: {
              type: 'string',
              description: 'City name for geographic search (optional)',
            },
            toll_free: {
              type: 'boolean',
              description: 'Set true to search toll-free numbers instead of local (optional)',
            },
            quantity: {
              type: 'number',
              description: 'Number of results to return (default: 10, max: 5000)',
            },
          },
        },
      },
      {
        name: 'order_phone_number',
        description: 'Purchase one or more available phone numbers for the Bandwidth account',
        inputSchema: {
          type: 'object',
          properties: {
            tn_or_tn_list: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of phone numbers to order in E.164 format (e.g. ["+12065551234"])',
            },
            site_id: {
              type: 'string',
              description: 'Bandwidth sub-account (site) ID to associate the numbers with',
            },
            sip_peer_id: {
              type: 'string',
              description: 'SIP peer (location) ID to assign the ordered numbers to',
            },
          },
          required: ['tn_or_tn_list', 'site_id', 'sip_peer_id'],
        },
      },
      {
        name: 'list_phone_numbers',
        description: 'List phone numbers owned by the Bandwidth account, with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Filter by sub-account (site) ID (optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            size: {
              type: 'number',
              description: 'Number of numbers per page (default: 100, max: 500)',
            },
          },
        },
      },
      {
        name: 'create_messaging_application',
        description: 'Create a new Bandwidth messaging application with webhook URLs for inbound and status events',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Application name',
            },
            msg_callback_url: {
              type: 'string',
              description: 'Webhook URL for inbound message and delivery status callbacks',
            },
          },
          required: ['name', 'msg_callback_url'],
        },
      },
      {
        name: 'send_group_message',
        description: 'Send a group MMS message to multiple recipients, creating a shared conversation thread',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Bandwidth messaging application ID',
            },
            from: {
              type: 'string',
              description: 'Sending phone number in E.164 format',
            },
            to: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of recipient phone numbers in E.164 format (2 or more for a group message)',
            },
            text: {
              type: 'string',
              description: 'Message body text',
            },
            media: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of media attachment URLs (optional)',
            },
            tag: {
              type: 'string',
              description: 'Custom tag string for tracking (optional)',
            },
          },
          required: ['application_id', 'from', 'to', 'text'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_message':
          return this.sendMessage(args);
        case 'list_messages':
          return this.listMessages(args);
        case 'get_message':
          return this.getMessage(args);
        case 'create_call':
          return this.createCall(args);
        case 'get_call':
          return this.getCall(args);
        case 'list_calls':
          return this.listCalls(args);
        case 'update_call':
          return this.updateCall(args);
        case 'get_call_recording':
          return this.getCallRecording(args);
        case 'list_available_numbers':
          return this.listAvailableNumbers(args);
        case 'order_phone_number':
          return this.orderPhoneNumber(args);
        case 'list_phone_numbers':
          return this.listPhoneNumbers(args);
        case 'create_messaging_application':
          return this.createMessagingApplication(args);
        case 'send_group_message':
          return this.sendGroupMessage(args);
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

  private commonHeaders(): Record<string, string> {
    return {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(baseUrl: string, path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${baseUrl}${path}`, {
      headers: this.commonHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(baseUrl: string, path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${baseUrl}${path}`, {
      method: 'POST',
      headers: this.commonHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(baseUrl: string, path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${baseUrl}${path}`, {
      method: 'PUT',
      headers: this.commonHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // 200 returns body; 204 no-content
    const text = await response.text();
    const result = text ? JSON.parse(text) : { success: true };
    return { content: [{ type: 'text', text: this.truncate(result) }], isError: false };
  }

  private async sendMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id || !args.from || !args.to) {
      return { content: [{ type: 'text', text: 'application_id, from, and to are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      applicationId: args.application_id,
      from: args.from,
      to: args.to,
    };
    if (args.text) body.text = args.text;
    if (args.media) body.media = args.media;
    if (args.tag) body.tag = args.tag;
    return this.apiPost(this.messagingBaseUrl, `/api/v2/users/${this.accountId}/messages`, body);
  }

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.source_tn) params.set('sourceTn', args.source_tn as string);
    if (args.destination_tn) params.set('destinationTn', args.destination_tn as string);
    if (args.message_status) params.set('messageStatus', args.message_status as string);
    if (args.message_direction) params.set('messageDirection', args.message_direction as string);
    if (args.from_date_time) params.set('fromDateTime', args.from_date_time as string);
    if (args.to_date_time) params.set('toDateTime', args.to_date_time as string);
    if (args.limit) params.set('limit', String(args.limit));
    return this.apiGet(this.messagingBaseUrl, `/api/v2/users/${this.accountId}/messages/list?${params.toString()}`);
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.message_id) return { content: [{ type: 'text', text: 'message_id is required' }], isError: true };
    const params = new URLSearchParams({ messageId: args.message_id as string });
    return this.apiGet(this.messagingBaseUrl, `/api/v2/users/${this.accountId}/messages/list?${params.toString()}`);
  }

  private async createCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to || !args.application_id || !args.answer_url) {
      return { content: [{ type: 'text', text: 'from, to, application_id, and answer_url are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      from: args.from,
      to: args.to,
      applicationId: args.application_id,
      answerUrl: args.answer_url,
      answerMethod: (args.answer_method as string) || 'POST',
    };
    if (args.call_timeout) body.callTimeout = args.call_timeout;
    if (args.machine_detection) body.machineDetection = { mode: args.machine_detection };
    if (args.tag) body.tag = args.tag;
    return this.apiPost(this.voiceBaseUrl, `/api/v2/accounts/${this.accountId}/calls`, body);
  }

  private async getCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_id) return { content: [{ type: 'text', text: 'call_id is required' }], isError: true };
    return this.apiGet(this.voiceBaseUrl, `/api/v2/accounts/${this.accountId}/calls/${encodeURIComponent(args.call_id as string)}`);
  }

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.application_id) params.set('applicationId', args.application_id as string);
    if (args.to) params.set('to', args.to as string);
    if (args.from) params.set('from', args.from as string);
    if (args.min_start_time) params.set('minStartTime', args.min_start_time as string);
    if (args.max_start_time) params.set('maxStartTime', args.max_start_time as string);
    if (args.page_size) params.set('pageSize', String(args.page_size));
    return this.apiGet(this.voiceBaseUrl, `/api/v2/accounts/${this.accountId}/calls?${params.toString()}`);
  }

  private async updateCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_id || !args.state) {
      return { content: [{ type: 'text', text: 'call_id and state are required' }], isError: true };
    }
    const body: Record<string, unknown> = { state: args.state };
    if (args.redirect_url) body.redirectUrl = args.redirect_url;
    if (args.redirect_method) body.redirectMethod = args.redirect_method;
    return this.apiPut(this.voiceBaseUrl, `/api/v2/accounts/${this.accountId}/calls/${encodeURIComponent(args.call_id as string)}`, body);
  }

  private async getCallRecording(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.call_id) return { content: [{ type: 'text', text: 'call_id is required' }], isError: true };
    const callId = encodeURIComponent(args.call_id as string);
    if (args.recording_id) {
      const recordingId = encodeURIComponent(args.recording_id as string);
      return this.apiGet(this.voiceBaseUrl, `/api/v2/accounts/${this.accountId}/calls/${callId}/recordings/${recordingId}`);
    }
    return this.apiGet(this.voiceBaseUrl, `/api/v2/accounts/${this.accountId}/calls/${callId}/recordings`);
  }

  private async listAvailableNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('quantity', String((args.quantity as number) || 10));
    if (args.area_code) params.set('areaCode', args.area_code as string);
    if (args.state) params.set('state', args.state as string);
    if (args.city) params.set('city', args.city as string);
    if (args.toll_free) params.set('tollFreeVanity', 'true');
    return this.apiGet(this.numberOrderBaseUrl, `/api/accounts/${this.accountId}/availableNumbers?${params.toString()}`);
  }

  private async orderPhoneNumber(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tn_or_tn_list || !args.site_id || !args.sip_peer_id) {
      return { content: [{ type: 'text', text: 'tn_or_tn_list, site_id, and sip_peer_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      TelephoneNumberOrder: {
        SiteId: args.site_id,
        PeerId: args.sip_peer_id,
        ExistingTelephoneNumberOrderType: {
          TelephoneNumberList: {
            TelephoneNumber: Array.isArray(args.tn_or_tn_list)
              ? (args.tn_or_tn_list as string[]).map(tn => tn.replace(/^\+1/, ''))
              : [String(args.tn_or_tn_list).replace(/^\+1/, '')],
          },
        },
      },
    };
    return this.apiPost(this.numberOrderBaseUrl, `/api/accounts/${this.accountId}/orders`, body);
  }

  private async listPhoneNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.site_id) params.set('site', args.site_id as string);
    if (args.page) params.set('page', String(args.page));
    if (args.size) params.set('size', String(args.size));
    return this.apiGet(this.numberOrderBaseUrl, `/api/accounts/${this.accountId}/tns?${params.toString()}`);
  }

  private async createMessagingApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.msg_callback_url) {
      return { content: [{ type: 'text', text: 'name and msg_callback_url are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      applicationName: args.name,
      msgCallbackUrl: args.msg_callback_url,
      requestedCallbackTypes: ['message-delivered', 'message-failed', 'message-received'],
    };
    return this.apiPost(this.numberOrderBaseUrl, `/api/accounts/${this.accountId}/applications`, body);
  }

  private async sendGroupMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id || !args.from || !args.to || !args.text) {
      return { content: [{ type: 'text', text: 'application_id, from, to, and text are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      applicationId: args.application_id,
      from: args.from,
      to: args.to,
      text: args.text,
    };
    if (args.media) body.media = args.media;
    if (args.tag) body.tag = args.tag;
    return this.apiPost(this.messagingBaseUrl, `/api/v2/users/${this.accountId}/messages`, body);
  }
}
