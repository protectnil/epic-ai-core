/**
 * Twilio MCP Server
 * Adapter for Twilio REST API 2010-04-01 — SMS, voice calls, and message history
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface TwilioConfig {
  account_sid: string;
  auth_token: string;
}

export class TwilioMCPServer {
  private config: TwilioConfig;

  constructor(config: TwilioConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return `https://api.twilio.com/2010-04-01/Accounts/${this.config.account_sid}`;
  }

  private get authHeaders(): Record<string, string> {
    const credentials = Buffer.from(`${this.config.account_sid}:${this.config.auth_token}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_sms',
        description: 'Send an SMS message via Twilio.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Destination phone number in E.164 format.' },
            from: { type: 'string', description: 'Twilio phone number or messaging service SID.' },
            body: { type: 'string', description: 'Text content of the SMS message.' },
          },
          required: ['to', 'from', 'body'],
        },
      },
      {
        name: 'list_messages',
        description: 'List SMS/MMS messages sent or received on the account.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Filter by destination phone number.' },
            from: { type: 'string', description: 'Filter by source phone number.' },
            date_sent: { type: 'string', description: 'Filter messages sent on this date (YYYY-MM-DD).' },
            page_size: { type: 'number', description: 'Number of records per page (max 1000).' },
          },
          required: [],
        },
      },
      {
        name: 'get_message',
        description: 'Retrieve a single Twilio message by its SID.',
        inputSchema: {
          type: 'object',
          properties: {
            message_sid: { type: 'string', description: 'The Twilio message SID (e.g. SM...).' },
          },
          required: ['message_sid'],
        },
      },
      {
        name: 'list_calls',
        description: 'List voice calls made or received on the account.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Filter by destination phone number.' },
            from: { type: 'string', description: 'Filter by source phone number.' },
            status: {
              type: 'string',
              enum: ['queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer'],
              description: 'Filter by call status.',
            },
            page_size: { type: 'number', description: 'Number of records per page (max 1000).' },
          },
          required: [],
        },
      },
      {
        name: 'make_call',
        description: 'Initiate an outbound voice call via Twilio.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Destination phone number in E.164 format.' },
            from: { type: 'string', description: 'Twilio phone number to call from.' },
            url: { type: 'string', description: 'TwiML URL that controls the call flow.' },
            method: { type: 'string', enum: ['GET', 'POST'], description: 'HTTP method for the TwiML URL.' },
          },
          required: ['to', 'from', 'url'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_sms': {
          const body = new URLSearchParams({
            To: args.to as string,
            From: args.from as string,
            Body: args.body as string,
          });
          const response = await fetch(`${this.baseUrl}/Messages.json`, {
            method: 'POST',
            headers: this.authHeaders,
            body: body.toString(),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_messages': {
          const params = new URLSearchParams();
          if (args.to) params.set('To', args.to as string);
          if (args.from) params.set('From', args.from as string);
          if (args.date_sent) params.set('DateSent', args.date_sent as string);
          if (args.page_size) params.set('PageSize', String(args.page_size));
          const response = await fetch(`${this.baseUrl}/Messages.json?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_message': {
          const response = await fetch(`${this.baseUrl}/Messages/${args.message_sid}.json`, {
            headers: this.authHeaders,
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_calls': {
          const params = new URLSearchParams();
          if (args.to) params.set('To', args.to as string);
          if (args.from) params.set('From', args.from as string);
          if (args.status) params.set('Status', args.status as string);
          if (args.page_size) params.set('PageSize', String(args.page_size));
          const response = await fetch(`${this.baseUrl}/Calls.json?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'make_call': {
          const body = new URLSearchParams({
            To: args.to as string,
            From: args.from as string,
            Url: args.url as string,
          });
          if (args.method) body.set('Method', args.method as string);
          const response = await fetch(`${this.baseUrl}/Calls.json`, {
            method: 'POST',
            headers: this.authHeaders,
            body: body.toString(),
          });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
}
