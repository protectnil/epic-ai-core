/**
 * Twilio MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/twilio-labs/mcp — transport: stdio, auth: API key + secret
// Published by Twilio's ETI team under the official twilio-labs GitHub org.
// npm: @twilio-alpha/mcp v0.7.0, last published ~Sept 2025 (within 6 months of 2026-03-28).
// Dynamically exposes 1,400+ Twilio API endpoints from OpenAPI spec across all product APIs.
// Our adapter covers: 20 tools (core messaging, voice, verify, lookup operations).
// Vendor MCP covers: 1,400+ tools (full Twilio API surface via OpenAPI translation).
// Recommendation: use-vendor-mcp — vendor MCP is a strict superset with 70x more coverage.
//   Use this adapter for air-gapped deployments where npm install at runtime is not permitted.
//
// Base URL: https://api.twilio.com/2010-04-01/Accounts/{AccountSid}
//   Verify API: https://verify.twilio.com/v2
//   Lookup API: https://lookups.twilio.com/v2
// Auth: HTTP Basic — username=AccountSid, password=AuthToken
//       (Twilio recommends API key/secret for production; Account SID + Auth Token for dev/test)
// Docs: https://www.twilio.com/docs/usage/api
//       https://www.twilio.com/docs/voice/api
//       https://www.twilio.com/docs/messaging/api
//       https://www.twilio.com/docs/verify/api
//       https://www.twilio.com/docs/lookup/v2-api
// Rate limits: Not globally enforced; Twilio applies per-product and per-account limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  verifyServiceSid?: string;
}

export class TwilioMCPServer extends MCPAdapterBase {
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly verifyServiceSid: string;
  private readonly baseUrl: string;
  private readonly verifyUrl = 'https://verify.twilio.com/v2';
  private readonly lookupsUrl = 'https://lookups.twilio.com/v2';

  constructor(config: TwilioConfig) {
    super();
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.verifyServiceSid = config.verifyServiceSid ?? '';
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  static catalog() {
    return {
      name: 'twilio',
      displayName: 'Twilio',
      version: '2.0.0',
      category: 'communication' as const,
      keywords: [
        'twilio', 'sms', 'mms', 'voice', 'call', 'phone', 'messaging',
        'verify', 'OTP', '2FA', 'lookup', 'recording', 'transcription',
        'conference', 'IVR', 'phone number', 'programmable voice',
      ],
      toolNames: [
        'send_sms',
        'list_messages', 'get_message',
        'make_call', 'list_calls', 'get_call', 'update_call',
        'list_phone_numbers', 'get_phone_number',
        'list_recordings', 'get_recording', 'delete_recording',
        'list_transcriptions', 'get_transcription',
        'list_conferences', 'get_conference', 'list_conference_participants',
        'send_verification', 'check_verification',
        'lookup_phone_number',
      ],
      description: 'Cloud communications: send and receive SMS/MMS, manage voice calls, recordings, conferences, phone numbers, and Verify OTP flows via Twilio REST API.',
      author: 'protectnil' as const,
    };
  }

  // ──────────────────────────────────────────────
  // Auth header builder (Basic auth, reusable)
  // ──────────────────────────────────────────────
  private get authHeaders(): Record<string, string> {
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    return { Authorization: `Basic ${credentials}` };
  }

  // ──────────────────────────────────────────────
  // HTTP helpers — throw on non-OK
  // ──────────────────────────────────────────────
  private async reqForm(url: string, method: string, body?: URLSearchParams): Promise<unknown> {
    const response = await this.fetchWithRetry(url, {
      method,
      headers: { ...this.authHeaders, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body?.toString(),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Twilio API error ${response.status}: ${errText}`);
    }
    return response.json();
  }

  private async reqGet(url: string): Promise<unknown> {
    const response = await this.fetchWithRetry(url, {
      headers: { ...this.authHeaders, Accept: 'application/json' },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Twilio API error ${response.status}: ${errText}`);
    }
    return response.json();
  }

  private async reqDelete(url: string): Promise<void> {
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.authHeaders });
    if (!response.ok && response.status !== 204) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Twilio API error ${response.status}: ${errText}`);
    }
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Messaging ────────────────────────────────
      {
        name: 'send_sms',
        description: 'Send an SMS or MMS message from a Twilio number or messaging service SID to a destination number',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Destination phone number in E.164 format (e.g., "+15551234567")' },
            from: { type: 'string', description: 'Twilio phone number or MessagingServiceSid to send from' },
            body: { type: 'string', description: 'Text content of the SMS/MMS message (max 1600 chars for SMS)' },
            media_url: { type: 'string', description: 'Optional publicly accessible URL of media to include (MMS)' },
          },
          required: ['to', 'from', 'body'],
        },
      },
      {
        name: 'list_messages',
        description: 'List SMS/MMS messages sent or received on the account with optional to/from/date filters and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Filter by destination phone number (E.164 format)' },
            from: { type: 'string', description: 'Filter by source phone number or MessagingServiceSid' },
            date_sent: { type: 'string', description: 'Filter messages sent on this date (YYYY-MM-DD)' },
            page_size: { type: 'number', description: 'Records per page (default: 20, max: 1000)' },
            page: { type: 'number', description: 'Page number for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_message',
        description: 'Retrieve a single SMS/MMS message by its SID, including delivery status and media URLs',
        inputSchema: {
          type: 'object',
          properties: {
            message_sid: { type: 'string', description: 'Twilio message SID (starts with SM or MM)' },
          },
          required: ['message_sid'],
        },
      },
      // ── Voice Calls ──────────────────────────────
      {
        name: 'make_call',
        description: 'Initiate an outbound voice call from a Twilio number to a destination; controls call flow via TwiML URL',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Destination phone number or SIP address in E.164 format' },
            from: { type: 'string', description: 'Twilio phone number to call from (must be owned by the account)' },
            url: { type: 'string', description: 'TwiML-serving URL that controls the call flow (Twilio will fetch this URL)' },
            method: { type: 'string', description: 'HTTP method for the TwiML URL: GET, POST (default: POST)' },
            timeout: { type: 'number', description: 'Seconds to wait for the called party to answer (default: 60)' },
            record: { type: 'boolean', description: 'Whether to record the call (default: false)' },
          },
          required: ['to', 'from', 'url'],
        },
      },
      {
        name: 'list_calls',
        description: 'List voice calls on the account with optional to/from/status filters and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Filter by destination phone number' },
            from: { type: 'string', description: 'Filter by originating phone number' },
            status: { type: 'string', description: 'Filter by call status: queued, ringing, in-progress, completed, failed, busy, no-answer, canceled' },
            start_time: { type: 'string', description: 'Filter calls on or after this date (YYYY-MM-DD)' },
            page_size: { type: 'number', description: 'Records per page (default: 20, max: 1000)' },
          },
        },
      },
      {
        name: 'get_call',
        description: 'Retrieve details for a specific voice call by its SID, including duration, status, and direction',
        inputSchema: {
          type: 'object',
          properties: {
            call_sid: { type: 'string', description: 'Twilio call SID (starts with CA)' },
          },
          required: ['call_sid'],
        },
      },
      {
        name: 'update_call',
        description: 'Modify an in-progress call — redirect to a new TwiML URL or hang up the call',
        inputSchema: {
          type: 'object',
          properties: {
            call_sid: { type: 'string', description: 'Twilio call SID to modify (starts with CA)' },
            status: { type: 'string', description: 'Set to "completed" to hang up, or "canceled" to cancel a queued/ringing call' },
            url: { type: 'string', description: 'New TwiML URL to redirect an in-progress call to' },
            method: { type: 'string', description: 'HTTP method for the new TwiML URL: GET, POST (default: POST)' },
          },
          required: ['call_sid'],
        },
      },
      // ── Phone Numbers ────────────────────────────
      {
        name: 'list_phone_numbers',
        description: 'List Twilio phone numbers owned by this account with optional capability and origin filters',
        inputSchema: {
          type: 'object',
          properties: {
            friendly_name: { type: 'string', description: 'Filter by friendly name (partial match)' },
            phone_number: { type: 'string', description: 'Filter by E.164 phone number (partial match allowed)' },
            sms_enabled: { type: 'boolean', description: 'Filter to only SMS-capable numbers (true/false)' },
            voice_enabled: { type: 'boolean', description: 'Filter to only voice-capable numbers (true/false)' },
            page_size: { type: 'number', description: 'Records per page (default: 20)' },
          },
        },
      },
      {
        name: 'get_phone_number',
        description: 'Retrieve configuration details for a specific Twilio phone number by its SID',
        inputSchema: {
          type: 'object',
          properties: {
            sid: { type: 'string', description: 'Twilio IncomingPhoneNumber SID (starts with PN)' },
          },
          required: ['sid'],
        },
      },
      // ── Recordings ───────────────────────────────
      {
        name: 'list_recordings',
        description: 'List call recordings on the account with optional call SID and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            call_sid: { type: 'string', description: 'Filter recordings for a specific call SID' },
            date_created: { type: 'string', description: 'Filter recordings created on this date (YYYY-MM-DD)' },
            page_size: { type: 'number', description: 'Records per page (default: 20)' },
          },
        },
      },
      {
        name: 'get_recording',
        description: 'Retrieve metadata for a specific call recording by its SID, including duration and media URLs',
        inputSchema: {
          type: 'object',
          properties: {
            recording_sid: { type: 'string', description: 'Twilio recording SID (starts with RE)' },
          },
          required: ['recording_sid'],
        },
      },
      {
        name: 'delete_recording',
        description: 'Permanently delete a call recording by its SID — this action cannot be undone',
        inputSchema: {
          type: 'object',
          properties: {
            recording_sid: { type: 'string', description: 'Twilio recording SID to delete (starts with RE)' },
          },
          required: ['recording_sid'],
        },
      },
      // ── Transcriptions ───────────────────────────
      {
        name: 'list_transcriptions',
        description: 'List transcriptions of recorded calls on the account',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Records per page (default: 20)' },
          },
        },
      },
      {
        name: 'get_transcription',
        description: 'Retrieve the transcription text and metadata for a specific transcription by SID',
        inputSchema: {
          type: 'object',
          properties: {
            transcription_sid: { type: 'string', description: 'Twilio transcription SID (starts with TR)' },
          },
          required: ['transcription_sid'],
        },
      },
      // ── Conferences ──────────────────────────────
      {
        name: 'list_conferences',
        description: 'List conference calls on the account with optional friendly name and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            friendly_name: { type: 'string', description: 'Filter conferences by friendly name (exact match)' },
            status: { type: 'string', description: 'Filter by conference status: init, in-progress, completed' },
            date_created: { type: 'string', description: 'Filter conferences created on this date (YYYY-MM-DD)' },
            page_size: { type: 'number', description: 'Records per page (default: 20)' },
          },
        },
      },
      {
        name: 'get_conference',
        description: 'Retrieve details for a specific conference call by its SID, including current status and participant count',
        inputSchema: {
          type: 'object',
          properties: {
            conference_sid: { type: 'string', description: 'Twilio conference SID (starts with CF)' },
          },
          required: ['conference_sid'],
        },
      },
      {
        name: 'list_conference_participants',
        description: 'List participants currently in a conference call with mute/hold status',
        inputSchema: {
          type: 'object',
          properties: {
            conference_sid: { type: 'string', description: 'Twilio conference SID (starts with CF)' },
            muted: { type: 'boolean', description: 'Filter to only muted participants (true) or unmuted (false)' },
            hold: { type: 'boolean', description: 'Filter to only held participants (true) or active (false)' },
            page_size: { type: 'number', description: 'Records per page (default: 20)' },
          },
          required: ['conference_sid'],
        },
      },
      // ── Verify ───────────────────────────────────
      {
        name: 'send_verification',
        description: 'Send an OTP verification code to a phone number via SMS, WhatsApp, or voice call using Twilio Verify',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Destination phone number in E.164 format to send the OTP to' },
            channel: { type: 'string', description: 'Delivery channel: sms, whatsapp, call, email (default: sms)' },
            service_sid: { type: 'string', description: 'Verify service SID (VAxxxxxxxxxx); uses configured verifyServiceSid if omitted' },
          },
          required: ['to'],
        },
      },
      {
        name: 'check_verification',
        description: 'Verify an OTP code entered by a user against the pending Twilio Verify verification',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'The phone number that received the OTP code (E.164 format)' },
            code: { type: 'string', description: 'The 4-10 digit OTP code entered by the user' },
            service_sid: { type: 'string', description: 'Verify service SID; uses configured verifyServiceSid if omitted' },
          },
          required: ['to', 'code'],
        },
      },
      // ── Lookup ───────────────────────────────────
      {
        name: 'lookup_phone_number',
        description: 'Validate and look up carrier, caller ID, and line type information for any phone number using Twilio Lookup v2',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number: { type: 'string', description: 'Phone number to look up in E.164 or national format' },
            country_code: { type: 'string', description: 'ISO 3166-1 alpha-2 country code for national-format numbers (e.g., US, GB)' },
            fields: { type: 'string', description: 'Comma-separated add-on data packages to fetch: line_type_intelligence, caller_name, sim_swap, call_forwarding' },
          },
          required: ['phone_number'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_sms':                    return await this.sendSms(args);
        case 'list_messages':               return await this.listMessages(args);
        case 'get_message':                 return await this.getMessage(args);
        case 'make_call':                   return await this.makeCall(args);
        case 'list_calls':                  return await this.listCalls(args);
        case 'get_call':                    return await this.getCall(args);
        case 'update_call':                 return await this.updateCall(args);
        case 'list_phone_numbers':          return await this.listPhoneNumbers(args);
        case 'get_phone_number':            return await this.getPhoneNumber(args);
        case 'list_recordings':             return await this.listRecordings(args);
        case 'get_recording':               return await this.getRecording(args);
        case 'delete_recording':            return await this.deleteRecording(args);
        case 'list_transcriptions':         return await this.listTranscriptions(args);
        case 'get_transcription':           return await this.getTranscription(args);
        case 'list_conferences':            return await this.listConferences(args);
        case 'get_conference':              return await this.getConference(args);
        case 'list_conference_participants': return await this.listConferenceParticipants(args);
        case 'send_verification':           return await this.sendVerification(args);
        case 'check_verification':          return await this.checkVerification(args);
        case 'lookup_phone_number':         return await this.lookupPhoneNumber(args);
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

  // ── Private tool methods ──────────────────────

  private async sendSms(args: Record<string, unknown>): Promise<ToolResult> {
    const body = new URLSearchParams({
      To: args.to as string,
      From: args.from as string,
      Body: args.body as string,
    });
    if (args.media_url) body.set('MediaUrl', args.media_url as string);
    const data = await this.reqForm(`${this.baseUrl}/Messages.json`, 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listMessages(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.to) params.set('To', args.to as string);
    if (args.from) params.set('From', args.from as string);
    if (args.date_sent) params.set('DateSent', args.date_sent as string);
    if (args.page_size) params.set('PageSize', String(args.page_size));
    if (args.page) params.set('Page', String(args.page));
    const data = await this.reqGet(`${this.baseUrl}/Messages.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getMessage(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.reqGet(`${this.baseUrl}/Messages/${encodeURIComponent(args.message_sid as string)}.json`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async makeCall(args: Record<string, unknown>): Promise<ToolResult> {
    const body = new URLSearchParams({
      To: args.to as string,
      From: args.from as string,
      Url: args.url as string,
    });
    if (args.method) body.set('Method', args.method as string);
    if (args.timeout) body.set('Timeout', String(args.timeout));
    if (args.record !== undefined) body.set('Record', String(args.record));
    const data = await this.reqForm(`${this.baseUrl}/Calls.json`, 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCalls(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.to) params.set('To', args.to as string);
    if (args.from) params.set('From', args.from as string);
    if (args.status) params.set('Status', args.status as string);
    if (args.start_time) params.set('StartTime', args.start_time as string);
    if (args.page_size) params.set('PageSize', String(args.page_size));
    const data = await this.reqGet(`${this.baseUrl}/Calls.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCall(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.reqGet(`${this.baseUrl}/Calls/${encodeURIComponent(args.call_sid as string)}.json`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateCall(args: Record<string, unknown>): Promise<ToolResult> {
    const sid = args.call_sid as string;
    const body = new URLSearchParams();
    if (args.status) body.set('Status', args.status as string);
    if (args.url) body.set('Url', args.url as string);
    if (args.method) body.set('Method', args.method as string);
    const data = await this.reqForm(`${this.baseUrl}/Calls/${encodeURIComponent(sid)}.json`, 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listPhoneNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.friendly_name) params.set('FriendlyName', args.friendly_name as string);
    if (args.phone_number) params.set('PhoneNumber', args.phone_number as string);
    if (args.sms_enabled !== undefined) params.set('SmsEnabled', String(args.sms_enabled));
    if (args.voice_enabled !== undefined) params.set('VoiceEnabled', String(args.voice_enabled));
    if (args.page_size) params.set('PageSize', String(args.page_size));
    const data = await this.reqGet(`${this.baseUrl}/IncomingPhoneNumbers.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPhoneNumber(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.reqGet(`${this.baseUrl}/IncomingPhoneNumbers/${encodeURIComponent(args.sid as string)}.json`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRecordings(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.call_sid) params.set('CallSid', args.call_sid as string);
    if (args.date_created) params.set('DateCreated', args.date_created as string);
    if (args.page_size) params.set('PageSize', String(args.page_size));
    const data = await this.reqGet(`${this.baseUrl}/Recordings.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRecording(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.reqGet(`${this.baseUrl}/Recordings/${encodeURIComponent(args.recording_sid as string)}.json`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteRecording(args: Record<string, unknown>): Promise<ToolResult> {
    await this.reqDelete(`${this.baseUrl}/Recordings/${encodeURIComponent(args.recording_sid as string)}.json`);
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, sid: args.recording_sid }) }], isError: false };
  }

  private async listTranscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page_size) params.set('PageSize', String(args.page_size));
    const data = await this.reqGet(`${this.baseUrl}/Transcriptions.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getTranscription(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.reqGet(`${this.baseUrl}/Transcriptions/${encodeURIComponent(args.transcription_sid as string)}.json`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listConferences(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.friendly_name) params.set('FriendlyName', args.friendly_name as string);
    if (args.status) params.set('Status', args.status as string);
    if (args.date_created) params.set('DateCreated', args.date_created as string);
    if (args.page_size) params.set('PageSize', String(args.page_size));
    const data = await this.reqGet(`${this.baseUrl}/Conferences.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getConference(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.reqGet(`${this.baseUrl}/Conferences/${encodeURIComponent(args.conference_sid as string)}.json`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listConferenceParticipants(args: Record<string, unknown>): Promise<ToolResult> {
    const sid = args.conference_sid as string;
    const params = new URLSearchParams();
    if (args.muted !== undefined) params.set('Muted', String(args.muted));
    if (args.hold !== undefined) params.set('Hold', String(args.hold));
    if (args.page_size) params.set('PageSize', String(args.page_size));
    const data = await this.reqGet(`${this.baseUrl}/Conferences/${encodeURIComponent(sid)}/Participants.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendVerification(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceSid = (args.service_sid as string) || this.verifyServiceSid;
    if (!serviceSid) {
      return { content: [{ type: 'text', text: 'service_sid is required (or configure verifyServiceSid in constructor)' }], isError: true };
    }
    const body = new URLSearchParams({
      To: args.to as string,
      Channel: (args.channel as string) ?? 'sms',
    });
    const data = await this.reqForm(`${this.verifyUrl}/Services/${encodeURIComponent(serviceSid)}/Verifications`, 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async checkVerification(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceSid = (args.service_sid as string) || this.verifyServiceSid;
    if (!serviceSid) {
      return { content: [{ type: 'text', text: 'service_sid is required (or configure verifyServiceSid in constructor)' }], isError: true };
    }
    const body = new URLSearchParams({
      To: args.to as string,
      Code: args.code as string,
    });
    const data = await this.reqForm(`${this.verifyUrl}/Services/${encodeURIComponent(serviceSid)}/VerificationCheck`, 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async lookupPhoneNumber(args: Record<string, unknown>): Promise<ToolResult> {
    const phone = encodeURIComponent(args.phone_number as string);
    const params = new URLSearchParams();
    if (args.country_code) params.set('CountryCode', args.country_code as string);
    if (args.fields) params.set('Fields', args.fields as string);
    const qs = params.toString() ? `?${params}` : '';
    const data = await this.reqGet(`${this.lookupsUrl}/PhoneNumbers/${phone}${qs}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
