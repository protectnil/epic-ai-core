/**
 * D7 Networks MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official D7 Networks MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 3 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://rest-api.d7networks.com/secure
// Auth: HTTP Basic (username + password)
//   Credentials obtained from D7 Networks account portal
// Docs: https://d7networks.com/docs/Messages/Send_Message/
// Rate limits: Not publicly documented; avoid high-frequency polling

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface D7NetworksConfig {
  username: string;
  password: string;
  baseUrl?: string;
}

export class D7NetworksMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor(config: D7NetworksConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl || 'https://rest-api.d7networks.com/secure';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_balance',
        description: 'Get the current account balance for your D7 Networks SMS account. Returns the available credit balance.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'send_sms',
        description: 'Send a single SMS message to a destination mobile number via D7 Networks. Supports international numbers in E.164 format.',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'number',
              description: 'Destination mobile number (E.164 format without +, e.g. 971562316353)',
            },
            from: {
              type: 'string',
              description: 'Sender ID or originating number (e.g. "SignSMS" or a phone number)',
            },
            content: {
              type: 'string',
              description: 'The text content of the SMS message',
            },
          },
          required: ['to', 'from', 'content'],
        },
      },
      {
        name: 'send_bulk_sms',
        description: 'Send SMS messages in bulk to multiple destination numbers via D7 Networks. Each message in the batch can have different recipients, sender ID, and content.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of message objects to send in batch',
              items: {
                type: 'object',
                properties: {
                  to: {
                    type: 'array',
                    description: 'Array of destination mobile numbers (E.164 format without +)',
                    items: { type: 'string' },
                  },
                  from: {
                    type: 'string',
                    description: 'Sender ID or originating number',
                  },
                  content: {
                    type: 'string',
                    description: 'The text content of the SMS message',
                  },
                },
                required: ['to', 'from', 'content'],
              },
            },
          },
          required: ['messages'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_balance':
          return await this.getBalance();
        case 'send_sms':
          return await this.sendSms(args);
        case 'send_bulk_sms':
          return await this.sendBulkSms(args);
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
    const encoded = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return `Basic ${encoded}`;
  }

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `D7 Networks API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`D7 Networks returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getBalance(): Promise<ToolResult> {
    return this.request('/balance', 'GET');
  }

  private async sendSms(args: Record<string, unknown>): Promise<ToolResult> {
    const to = args.to as number;
    const from = args.from as string;
    const content = args.content as string;

    if (!to || !from || !content) {
      return { content: [{ type: 'text', text: 'to, from, and content are required' }], isError: true };
    }

    return this.request('/send', 'POST', { to, from, content });
  }

  private async sendBulkSms(args: Record<string, unknown>): Promise<ToolResult> {
    const messages = args.messages as Array<{ to: string[]; from: string; content: string }>;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { content: [{ type: 'text', text: 'messages array is required and must not be empty' }], isError: true };
    }

    return this.request('/sendbatch', 'POST', { messages });
  }

  static catalog() {
    return {
      name: 'd7networks',
      displayName: 'D7 Networks',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: ['d7networks', 'sms', 'bulk-sms', 'messaging', 'mobile', 'text-message'],
      toolNames: ['get_balance', 'send_sms', 'send_bulk_sms'],
      description: 'D7 Networks SMS adapter — send single and bulk SMS messages to global mobile numbers and check account balance.',
      author: 'protectnil' as const,
    };
  }
}
