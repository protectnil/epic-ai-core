/**
 * SendGrid MCP Server
 * Adapter for SendGrid v3 API — transactional email, templates, and delivery stats
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface SendGridConfig {
  api_key: string;
}

export class SendGridMCPServer {
  private config: SendGridConfig;
  private baseUrl = 'https://api.sendgrid.com/v3';

  constructor(config: SendGridConfig) {
    this.config = config;
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.api_key}`,
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_email',
        description: 'Send a transactional email through SendGrid.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email address.' },
            to_name: { type: 'string', description: 'Recipient display name.' },
            from: { type: 'string', description: 'Sender email address (must be verified).' },
            from_name: { type: 'string', description: 'Sender display name.' },
            subject: { type: 'string', description: 'Email subject line.' },
            html_content: { type: 'string', description: 'HTML body of the email.' },
            text_content: { type: 'string', description: 'Plain-text body of the email.' },
            template_id: { type: 'string', description: 'SendGrid dynamic template ID (overrides content).' },
            dynamic_template_data: {
              type: 'object',
              description: 'Key-value pairs for dynamic template variable substitution.',
            },
          },
          required: ['to', 'from', 'subject'],
        },
      },
      {
        name: 'list_templates',
        description: 'List dynamic transactional email templates in SendGrid.',
        inputSchema: {
          type: 'object',
          properties: {
            generations: {
              type: 'string',
              enum: ['legacy', 'dynamic'],
              description: 'Filter by template generation type (default: dynamic).',
            },
            page_size: { type: 'number', description: 'Number of templates per page (max 200).' },
          },
          required: [],
        },
      },
      {
        name: 'get_template',
        description: 'Retrieve a single SendGrid template and its active version.',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'string', description: 'The SendGrid template ID.' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'list_suppressions',
        description: 'List email addresses on the global suppression (unsubscribe) list.',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: { type: 'number', description: 'Unix timestamp — return suppressions after this time.' },
            end_time: { type: 'number', description: 'Unix timestamp — return suppressions before this time.' },
            limit: { type: 'number', description: 'Number of results to return (max 500).' },
            offset: { type: 'number', description: 'Offset for pagination.' },
          },
          required: [],
        },
      },
      {
        name: 'get_stats',
        description: 'Retrieve global email delivery statistics for a date range.',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format (required).' },
            end_date: { type: 'string', description: 'End date in YYYY-MM-DD format.' },
            aggregated_by: {
              type: 'string',
              enum: ['day', 'week', 'month'],
              description: 'Aggregation period.',
            },
          },
          required: ['start_date'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_email': {
          const body: Record<string, unknown> = {
            personalizations: [
              {
                to: [{ email: args.to, name: args.to_name }],
                dynamic_template_data: args.dynamic_template_data,
              },
            ],
            from: { email: args.from, name: args.from_name },
            subject: args.subject,
            content: [] as Array<{ type: string; value: string }>,
            template_id: args.template_id,
          };
          if (args.html_content) (body.content as Array<{ type: string; value: string }>).push({ type: 'text/html', value: args.html_content as string });
          if (args.text_content) (body.content as Array<{ type: string; value: string }>).push({ type: 'text/plain', value: args.text_content as string });
          if (!(body.content as unknown[]).length) delete body.content;
          const response = await fetch(`${this.baseUrl}/mail/send`, {
            method: 'POST',
            headers: this.authHeaders,
            body: JSON.stringify(body),
          });
          const text = await response.text();
          const data = text ? JSON.parse(text) : { status: response.status, message: 'Accepted' };
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_templates': {
          const params = new URLSearchParams();
          params.set('generations', (args.generations as string) ?? 'dynamic');
          if (args.page_size) params.set('page_size', String(args.page_size));
          const response = await fetch(`${this.baseUrl}/templates?${params}`, { headers: this.authHeaders });
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_template': {
          const response = await fetch(`${this.baseUrl}/templates/${args.template_id}`, {
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

        case 'list_suppressions': {
          const params = new URLSearchParams();
          if (args.start_time) params.set('start_time', String(args.start_time));
          if (args.end_time) params.set('end_time', String(args.end_time));
          if (args.limit) params.set('limit', String(args.limit));
          if (args.offset) params.set('offset', String(args.offset));
          const response = await fetch(`${this.baseUrl}/suppression/unsubscribes?${params}`, {
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

        case 'get_stats': {
          const params = new URLSearchParams();
          params.set('start_date', args.start_date as string);
          if (args.end_date) params.set('end_date', args.end_date as string);
          if (args.aggregated_by) params.set('aggregated_by', args.aggregated_by as string);
          const response = await fetch(`${this.baseUrl}/stats?${params}`, { headers: this.authHeaders });
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
