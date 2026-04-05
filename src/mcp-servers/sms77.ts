/**
 * sms77 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official sms77.io MCP server was found on GitHub.
//
// Base URL: https://gateway.sms77.io/api
// Auth: API Key — X-Api-Key header
// Docs: https://sms77.io/en/docs/gateway/http-api
// Rate limits: Not published; standard gateway throttling applies.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Sms77Config {
  apiKey: string;
  baseUrl?: string;
}

export class Sms77MCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: Sms77Config) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://gateway.sms77.io/api';
  }

  private get authHeaders(): Record<string, string> {
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'sms77',
      displayName: 'sms77',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: [
        'sms77', 'sms', 'text message', 'messaging', 'telecom', 'voice', 'call',
        'lookup', 'hlr', 'mnp', 'cnam', 'balance', 'pricing', 'contacts',
        'analytics', 'hooks', 'webhooks', 'validate', 'status',
      ],
      toolNames: [
        'send_sms',
        'get_balance',
        'get_analytics',
        'get_pricing',
        'get_status',
        'lookup_number',
        'lookup_hlr',
        'lookup_mnp',
        'lookup_cnam',
        'lookup_format',
        'make_voice_call',
        'validate_for_voice',
        'list_contacts',
        'create_contact',
        'list_hooks',
        'create_hook',
        'delete_hook',
      ],
      description:
        'Send SMS messages and make voice calls via the sms77.io gateway. ' +
        'Lookup phone numbers (HLR, MNP, CNAM, format), retrieve analytics, ' +
        'manage contacts and webhooks, and check account balance and pricing.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_sms',
        description:
          'Send one or multiple SMS messages via the sms77 gateway. Supports plain text, ' +
          'Unicode, flash SMS, and scheduled delivery.',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description:
                'Recipient phone number(s) in E.164 format. Separate multiple with commas.',
            },
            text: {
              type: 'string',
              description: 'Text content of the SMS message',
            },
            from: {
              type: 'string',
              description:
                'Sender ID or phone number (max 11 alphanumeric chars or 16 numeric chars)',
            },
            delay: {
              type: 'string',
              description:
                'Schedule delivery — Unix timestamp or date string (YYYY-MM-DD HH:MM)',
            },
            label: {
              type: 'string',
              description: 'Custom label for analytics grouping (max 100 chars)',
            },
            foreign_id: {
              type: 'string',
              description: 'Your own reference ID attached to the message',
            },
            flash: {
              type: 'number',
              description: 'Set to 1 to send as flash SMS (displayed immediately on screen)',
            },
            unicode: {
              type: 'number',
              description: 'Set to 1 to send Unicode/UTF-8 characters',
            },
          },
          required: ['to', 'text'],
        },
      },
      {
        name: 'get_balance',
        description: 'Retrieve the current credit balance of the sms77 account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_analytics',
        description:
          'Retrieve SMS sending analytics for a date range, grouped by date, label, ' +
          'subaccount, or country.',
        inputSchema: {
          type: 'object',
          properties: {
            start: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (default: 30 days ago)',
            },
            end: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (default: today)',
            },
            label: {
              type: 'string',
              description: 'Filter results to a specific label',
            },
            subaccounts: {
              type: 'string',
              description:
                'Filter by subaccount: main (main account only), all, or a specific subaccount ID',
            },
            group_by: {
              type: 'string',
              description: 'Grouping: date, label, subaccount, or country',
            },
          },
        },
      },
      {
        name: 'get_pricing',
        description:
          'Retrieve current SMS pricing for all countries or a specific country/network.',
        inputSchema: {
          type: 'object',
          properties: {
            country: {
              type: 'string',
              description:
                'ISO 3166-1 alpha-2 country code to get pricing for (e.g. DE, US). Omit for all countries.',
            },
            format: {
              type: 'string',
              description: 'Response format: json or csv (default: json)',
            },
          },
        },
      },
      {
        name: 'get_status',
        description: 'Retrieve the delivery status of a previously sent SMS by message ID.',
        inputSchema: {
          type: 'object',
          properties: {
            msg_id: {
              type: 'string',
              description: 'The sms77 message ID returned when the SMS was sent',
            },
          },
          required: ['msg_id'],
        },
      },
      {
        name: 'lookup_number',
        description:
          'Perform a general number lookup to get number format, HLR, CNAM, and MNP data in one call.',
        inputSchema: {
          type: 'object',
          properties: {
            number: {
              type: 'string',
              description: 'Phone number to look up in E.164 format',
            },
            type: {
              type: 'string',
              description: 'Lookup type: format, hlr, cnam, or mnp (default: format)',
            },
          },
          required: ['number'],
        },
      },
      {
        name: 'lookup_hlr',
        description:
          'Perform a Home Location Register (HLR) lookup to check if a mobile number ' +
          'is active and retrieve carrier information.',
        inputSchema: {
          type: 'object',
          properties: {
            number: {
              type: 'string',
              description: 'Mobile phone number in E.164 format',
            },
          },
          required: ['number'],
        },
      },
      {
        name: 'lookup_mnp',
        description:
          'Perform a Mobile Number Portability (MNP) lookup to identify the current ' +
          'network operator for a ported mobile number.',
        inputSchema: {
          type: 'object',
          properties: {
            number: {
              type: 'string',
              description: 'Mobile phone number in E.164 format',
            },
          },
          required: ['number'],
        },
      },
      {
        name: 'lookup_cnam',
        description:
          'Perform a CNAM (Caller ID Name) lookup to retrieve the registered name ' +
          'for a phone number.',
        inputSchema: {
          type: 'object',
          properties: {
            number: {
              type: 'string',
              description: 'Phone number in E.164 format',
            },
          },
          required: ['number'],
        },
      },
      {
        name: 'lookup_format',
        description:
          'Format and validate a phone number, returning international, national, ' +
          'and E.164 formats along with country and carrier metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            number: {
              type: 'string',
              description: 'Phone number to format and validate',
            },
          },
          required: ['number'],
        },
      },
      {
        name: 'make_voice_call',
        description:
          'Initiate a text-to-speech voice call to a phone number. ' +
          'The provided text is read aloud to the recipient.',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient phone number in E.164 format',
            },
            text: {
              type: 'string',
              description: 'Text to be read aloud to the recipient via TTS',
            },
            from: {
              type: 'string',
              description: 'Caller ID / sender phone number (optional)',
            },
            xml: {
              type: 'number',
              description: 'Set to 1 if text contains SSML/XML markup',
            },
          },
          required: ['to', 'text'],
        },
      },
      {
        name: 'validate_for_voice',
        description:
          'Validate a caller ID number for use with the sms77 Voice API. ' +
          'Sends a PIN to the number and confirms it can be used as caller ID.',
        inputSchema: {
          type: 'object',
          properties: {
            number: {
              type: 'string',
              description: 'Phone number to validate as a caller ID in E.164 format',
            },
            callback: {
              type: 'string',
              description: 'URL to POST the validation result to (optional)',
            },
          },
          required: ['number'],
        },
      },
      {
        name: 'list_contacts',
        description: 'Retrieve all contacts from the sms77 address book.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'Action to perform: read (default)',
            },
          },
        },
      },
      {
        name: 'create_contact',
        description:
          'Create a new contact in the sms77 address book with a name and phone number.',
        inputSchema: {
          type: 'object',
          properties: {
            nick: {
              type: 'string',
              description: 'Display name / nickname for the contact',
            },
            number: {
              type: 'string',
              description: 'Phone number for the contact in E.164 format',
            },
          },
          required: ['nick', 'number'],
        },
      },
      {
        name: 'list_hooks',
        description: 'Retrieve all registered webhooks (hooks) configured on the sms77 account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_hook',
        description:
          'Register a new webhook to receive event notifications from sms77 ' +
          '(e.g. inbound SMS, delivery status).',
        inputSchema: {
          type: 'object',
          properties: {
            target_url: {
              type: 'string',
              description: 'HTTPS URL to POST event payloads to',
            },
            event_type: {
              type: 'string',
              description:
                'Event type to listen for: sms_inbound, dlr (delivery report), ' +
                'voice_call, or tracking (click tracking)',
            },
            request_method: {
              type: 'string',
              description: 'HTTP method for the webhook: POST or GET (default: POST)',
            },
          },
          required: ['target_url', 'event_type'],
        },
      },
      {
        name: 'delete_hook',
        description: 'Delete a registered webhook from the sms77 account by hook ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'The webhook ID to delete',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_sms':
          return await this.sendSms(args);
        case 'get_balance':
          return await this.getBalance();
        case 'get_analytics':
          return await this.getAnalytics(args);
        case 'get_pricing':
          return await this.getPricing(args);
        case 'get_status':
          return await this.getStatus(args);
        case 'lookup_number':
          return await this.lookupNumber(args);
        case 'lookup_hlr':
          return await this.lookupHlr(args);
        case 'lookup_mnp':
          return await this.lookupMnp(args);
        case 'lookup_cnam':
          return await this.lookupCnam(args);
        case 'lookup_format':
          return await this.lookupFormat(args);
        case 'make_voice_call':
          return await this.makeVoiceCall(args);
        case 'validate_for_voice':
          return await this.validateForVoice(args);
        case 'list_contacts':
          return await this.listContacts(args);
        case 'create_contact':
          return await this.createContact(args);
        case 'list_hooks':
          return await this.listHooks();
        case 'create_hook':
          return await this.createHook(args);
        case 'delete_hook':
          return await this.deleteHook(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    params?: URLSearchParams,
  ): Promise<ToolResult> {
    const qs = params && params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method,
      headers: this.authHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `sms77 API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const txt = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: this.truncate(txt || JSON.stringify({ status: response.status })) }],
        isError: false,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async sendSms(args: Record<string, unknown>): Promise<ToolResult> {
    const to = args.to as string;
    const text = args.text as string;
    if (!to || !text) {
      return { content: [{ type: 'text', text: 'to and text are required' }], isError: true };
    }
    const body: Record<string, unknown> = { to, text };
    if (args.from) body.from = args.from;
    if (args.delay) body.delay = args.delay;
    if (args.label) body.label = args.label;
    if (args.foreign_id) body.foreign_id = args.foreign_id;
    if (args.flash !== undefined) body.flash = args.flash;
    if (args.unicode !== undefined) body.unicode = args.unicode;
    return this.request('POST', '/sms', body);
  }

  private async getBalance(): Promise<ToolResult> {
    return this.request('GET', '/balance');
  }

  private async getAnalytics(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.start) params.set('start', args.start as string);
    if (args.end) params.set('end', args.end as string);
    if (args.label) params.set('label', args.label as string);
    if (args.subaccounts) params.set('subaccounts', args.subaccounts as string);
    if (args.group_by) params.set('group_by', args.group_by as string);
    return this.request('GET', '/analytics', undefined, params);
  }

  private async getPricing(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('format', (args.format as string) ?? 'json');
    if (args.country) params.set('country', args.country as string);
    return this.request('GET', '/pricing', undefined, params);
  }

  private async getStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const msgId = args.msg_id as string;
    if (!msgId) {
      return { content: [{ type: 'text', text: 'msg_id is required' }], isError: true };
    }
    const params = new URLSearchParams({ msg_id: msgId });
    return this.request('GET', '/status', undefined, params);
  }

  private async lookupNumber(args: Record<string, unknown>): Promise<ToolResult> {
    const number = args.number as string;
    if (!number) {
      return { content: [{ type: 'text', text: 'number is required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      number,
      type: (args.type as string) ?? 'format',
    };
    return this.request('POST', '/lookup', body);
  }

  private async lookupHlr(args: Record<string, unknown>): Promise<ToolResult> {
    const number = args.number as string;
    if (!number) {
      return { content: [{ type: 'text', text: 'number is required' }], isError: true };
    }
    return this.request('POST', '/lookup/hlr', { number });
  }

  private async lookupMnp(args: Record<string, unknown>): Promise<ToolResult> {
    const number = args.number as string;
    if (!number) {
      return { content: [{ type: 'text', text: 'number is required' }], isError: true };
    }
    return this.request('POST', '/lookup/mnp', { number });
  }

  private async lookupCnam(args: Record<string, unknown>): Promise<ToolResult> {
    const number = args.number as string;
    if (!number) {
      return { content: [{ type: 'text', text: 'number is required' }], isError: true };
    }
    return this.request('POST', '/lookup/cnam', { number });
  }

  private async lookupFormat(args: Record<string, unknown>): Promise<ToolResult> {
    const number = args.number as string;
    if (!number) {
      return { content: [{ type: 'text', text: 'number is required' }], isError: true };
    }
    return this.request('POST', '/lookup/format', { number });
  }

  private async makeVoiceCall(args: Record<string, unknown>): Promise<ToolResult> {
    const to = args.to as string;
    const text = args.text as string;
    if (!to || !text) {
      return { content: [{ type: 'text', text: 'to and text are required' }], isError: true };
    }
    const body: Record<string, unknown> = { to, text };
    if (args.from) body.from = args.from;
    if (args.xml !== undefined) body.xml = args.xml;
    return this.request('POST', '/voice', body);
  }

  private async validateForVoice(args: Record<string, unknown>): Promise<ToolResult> {
    const number = args.number as string;
    if (!number) {
      return { content: [{ type: 'text', text: 'number is required' }], isError: true };
    }
    const body: Record<string, unknown> = { number };
    if (args.callback) body.callback = args.callback;
    return this.request('POST', '/validate_for_voice', body);
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('action', (args.action as string) ?? 'read');
    params.set('json', '1');
    return this.request('GET', '/contacts', undefined, params);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const nick = args.nick as string;
    const number = args.number as string;
    if (!nick || !number) {
      return { content: [{ type: 'text', text: 'nick and number are required' }], isError: true };
    }
    return this.request('POST', '/contacts', { action: 'write', nick, number, json: 1 });
  }

  private async listHooks(): Promise<ToolResult> {
    const params = new URLSearchParams({ action: 'read' });
    return this.request('GET', '/hooks', undefined, params);
  }

  private async createHook(args: Record<string, unknown>): Promise<ToolResult> {
    const target_url = args.target_url as string;
    const event_type = args.event_type as string;
    if (!target_url || !event_type) {
      return {
        content: [{ type: 'text', text: 'target_url and event_type are required' }],
        isError: true,
      };
    }
    return this.request('POST', '/hooks', {
      action: 'subscribe',
      target_url,
      event_type,
      request_method: (args.request_method as string) ?? 'POST',
    });
  }

  private async deleteHook(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('POST', '/hooks', { action: 'unsubscribe', id });
  }
}
