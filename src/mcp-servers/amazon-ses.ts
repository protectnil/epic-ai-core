/**
 * Amazon SES MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/aws-samples/sample-for-amazon-ses-mcp — AWS sample, not production-ready.
//   transport: stdio, auth: AWS credentials, maintained by aws-samples (2025).
//   Community alternative: https://github.com/omd01/aws-ses-mcp (plain send only).
// Our adapter covers: 16 tools (send, identities, templates, suppression, account, configuration sets).
//   Vendor sample covers full SESv2 API surface via Smithy Java.
// Recommendation: Use this adapter for REST-native integrations with full operational coverage.
//   Vendor sample is Java-only and not recommended for production use per AWS.
//
// Base URL: https://email.{region}.amazonaws.com (e.g. https://email.us-east-1.amazonaws.com)
// Auth: AWS Signature Version 4 (SigV4) — service: ses, action via POST path
// Docs: https://docs.aws.amazon.com/ses/latest/APIReference-V2/Welcome.html
// Rate limits: Default 14 messages/sec sending rate; varies by account and region.
//   Quota increases available via AWS Support.

import { createHmac, createHash } from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AmazonSESConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  baseUrl?: string;
}

export class AmazonSESMCPServer extends MCPAdapterBase {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly baseUrl: string;

  constructor(config: AmazonSESConfig) {
    super();
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region ?? 'us-east-1';
    this.baseUrl = config.baseUrl ?? `https://email.${this.region}.amazonaws.com`;
  }

  static catalog() {
    return {
      name: 'amazon-ses',
      displayName: 'Amazon SES',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'ses', 'amazon ses', 'email', 'send email', 'transactional email', 'bulk email',
        'aws email', 'email identity', 'email template', 'suppression list', 'bounce',
        'complaint', 'deliverability', 'configuration set', 'sending quota',
      ],
      toolNames: [
        'send_email', 'send_bulk_email',
        'list_email_identities', 'get_email_identity', 'create_email_identity', 'delete_email_identity',
        'list_email_templates', 'get_email_template', 'create_email_template', 'update_email_template', 'delete_email_template',
        'list_suppressed_destinations', 'get_suppressed_destination', 'put_suppressed_destination', 'delete_suppressed_destination',
        'get_account',
      ],
      description: 'Amazon SES v2 cloud email: send transactional and bulk emails, manage identities, templates, suppression lists, and account sending quotas.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_email',
        description: 'Send a transactional email with simple content (subject + body) or using a template, with optional CC, BCC, and reply-to',
        inputSchema: {
          type: 'object',
          properties: {
            from_address: {
              type: 'string',
              description: 'Verified sender email address or "Name <email>" format',
            },
            to_addresses: {
              type: 'string',
              description: 'Comma-separated recipient email addresses',
            },
            subject: {
              type: 'string',
              description: 'Email subject line (required if not using a template)',
            },
            body_text: {
              type: 'string',
              description: 'Plain text body (at least one of body_text or body_html required)',
            },
            body_html: {
              type: 'string',
              description: 'HTML body content',
            },
            cc_addresses: {
              type: 'string',
              description: 'Comma-separated CC addresses (optional)',
            },
            bcc_addresses: {
              type: 'string',
              description: 'Comma-separated BCC addresses (optional)',
            },
            reply_to_addresses: {
              type: 'string',
              description: 'Comma-separated reply-to addresses (optional)',
            },
            configuration_set_name: {
              type: 'string',
              description: 'SES configuration set name for tracking and routing rules (optional)',
            },
          },
          required: ['from_address', 'to_addresses'],
        },
      },
      {
        name: 'send_bulk_email',
        description: 'Send a bulk email campaign using a template to multiple recipients with per-recipient template data',
        inputSchema: {
          type: 'object',
          properties: {
            from_address: {
              type: 'string',
              description: 'Verified sender email address',
            },
            template_name: {
              type: 'string',
              description: 'Name of the SES template to use',
            },
            default_template_data: {
              type: 'string',
              description: 'JSON object of default template variable values (e.g. {"name":"Customer"})',
            },
            bulk_email_entries: {
              type: 'string',
              description: 'JSON array of destination objects with fields: to_addresses (array), replacement_template_data (JSON string)',
            },
            configuration_set_name: {
              type: 'string',
              description: 'SES configuration set name (optional)',
            },
          },
          required: ['from_address', 'template_name', 'bulk_email_entries'],
        },
      },
      {
        name: 'list_email_identities',
        description: 'List all verified email identities (addresses and domains) in the SES account',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of results per page (max 1000, default: 100)',
            },
            next_token: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_email_identity',
        description: 'Get verification status, DKIM settings, and tags for a specific email identity',
        inputSchema: {
          type: 'object',
          properties: {
            email_identity: {
              type: 'string',
              description: 'Email address or domain name to retrieve (e.g. example.com or user@example.com)',
            },
          },
          required: ['email_identity'],
        },
      },
      {
        name: 'create_email_identity',
        description: 'Add and begin verification of an email address or domain identity in SES',
        inputSchema: {
          type: 'object',
          properties: {
            email_identity: {
              type: 'string',
              description: 'Email address or domain to verify (e.g. example.com)',
            },
            dkim_signing_enabled: {
              type: 'boolean',
              description: 'Enable DKIM signing for this identity (default: true)',
            },
          },
          required: ['email_identity'],
        },
      },
      {
        name: 'delete_email_identity',
        description: 'Remove a verified email identity from SES — email address or entire domain',
        inputSchema: {
          type: 'object',
          properties: {
            email_identity: {
              type: 'string',
              description: 'Email address or domain to delete from SES',
            },
          },
          required: ['email_identity'],
        },
      },
      {
        name: 'list_email_templates',
        description: 'List all email templates stored in SES with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: {
              type: 'number',
              description: 'Number of templates per page (max 100, default: 10)',
            },
            next_token: {
              type: 'string',
              description: 'Pagination token from previous response',
            },
          },
        },
      },
      {
        name: 'get_email_template',
        description: 'Get the full content (subject, HTML body, text body) of an SES email template by name',
        inputSchema: {
          type: 'object',
          properties: {
            template_name: {
              type: 'string',
              description: 'Template name to retrieve',
            },
          },
          required: ['template_name'],
        },
      },
      {
        name: 'create_email_template',
        description: 'Create a new SES email template with subject, HTML body, and plain-text body',
        inputSchema: {
          type: 'object',
          properties: {
            template_name: {
              type: 'string',
              description: 'Unique template name (alphanumeric and hyphens)',
            },
            subject: {
              type: 'string',
              description: 'Template subject line — supports {{variable}} substitution',
            },
            html_part: {
              type: 'string',
              description: 'HTML body — supports {{variable}} substitution',
            },
            text_part: {
              type: 'string',
              description: 'Plain text body — supports {{variable}} substitution',
            },
          },
          required: ['template_name', 'subject'],
        },
      },
      {
        name: 'update_email_template',
        description: 'Update an existing SES email template subject, HTML body, or text body',
        inputSchema: {
          type: 'object',
          properties: {
            template_name: {
              type: 'string',
              description: 'Name of the template to update',
            },
            subject: {
              type: 'string',
              description: 'New subject line',
            },
            html_part: {
              type: 'string',
              description: 'New HTML body',
            },
            text_part: {
              type: 'string',
              description: 'New plain text body',
            },
          },
          required: ['template_name'],
        },
      },
      {
        name: 'delete_email_template',
        description: 'Delete an SES email template by name',
        inputSchema: {
          type: 'object',
          properties: {
            template_name: {
              type: 'string',
              description: 'Name of the template to delete',
            },
          },
          required: ['template_name'],
        },
      },
      {
        name: 'list_suppressed_destinations',
        description: 'List email addresses in the account-level suppression list with optional reason and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            reasons: {
              type: 'string',
              description: 'Filter by suppression reason: BOUNCE, COMPLAINT (comma-separated)',
            },
            start_date: {
              type: 'string',
              description: 'ISO 8601 start date filter (e.g. 2024-01-01T00:00:00Z)',
            },
            end_date: {
              type: 'string',
              description: 'ISO 8601 end date filter',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (max 100, default: 100)',
            },
            next_token: {
              type: 'string',
              description: 'Pagination token',
            },
          },
        },
      },
      {
        name: 'get_suppressed_destination',
        description: 'Get suppression details (reason and timestamp) for a specific email address',
        inputSchema: {
          type: 'object',
          properties: {
            email_address: {
              type: 'string',
              description: 'Email address to look up in the suppression list',
            },
          },
          required: ['email_address'],
        },
      },
      {
        name: 'put_suppressed_destination',
        description: 'Manually add an email address to the SES account-level suppression list',
        inputSchema: {
          type: 'object',
          properties: {
            email_address: {
              type: 'string',
              description: 'Email address to suppress',
            },
            reason: {
              type: 'string',
              description: 'Suppression reason: BOUNCE or COMPLAINT',
            },
          },
          required: ['email_address', 'reason'],
        },
      },
      {
        name: 'delete_suppressed_destination',
        description: 'Remove an email address from the SES account-level suppression list',
        inputSchema: {
          type: 'object',
          properties: {
            email_address: {
              type: 'string',
              description: 'Email address to remove from the suppression list',
            },
          },
          required: ['email_address'],
        },
      },
      {
        name: 'get_account',
        description: 'Get SES account details including sending quota, sending rate, sandbox status, and enforcement status',
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
        case 'send_email':
          return this.sendEmail(args);
        case 'send_bulk_email':
          return this.sendBulkEmail(args);
        case 'list_email_identities':
          return this.listEmailIdentities(args);
        case 'get_email_identity':
          return this.getEmailIdentity(args);
        case 'create_email_identity':
          return this.createEmailIdentity(args);
        case 'delete_email_identity':
          return this.deleteEmailIdentity(args);
        case 'list_email_templates':
          return this.listEmailTemplates(args);
        case 'get_email_template':
          return this.getEmailTemplate(args);
        case 'create_email_template':
          return this.createEmailTemplate(args);
        case 'update_email_template':
          return this.updateEmailTemplate(args);
        case 'delete_email_template':
          return this.deleteEmailTemplate(args);
        case 'list_suppressed_destinations':
          return this.listSuppressedDestinations(args);
        case 'get_suppressed_destination':
          return this.getSuppressedDestination(args);
        case 'put_suppressed_destination':
          return this.putSuppressedDestination(args);
        case 'delete_suppressed_destination':
          return this.deleteSuppressedDestination(args);
        case 'get_account':
          return this.getAccount();
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

  // ---- SigV4 signing ----

  private sign(
    method: string,
    path: string,
    query: string,
    headers: Record<string, string>,
    body: string,
  ): Record<string, string> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);

    headers['x-amz-date'] = amzDate;
    headers['host'] = new URL(this.baseUrl).hostname;

    const signedHeaderKeys = Object.keys(headers).sort().map(k => k.toLowerCase());
    const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${headers[k]}\n`).join('');
    const signedHeadersStr = signedHeaderKeys.join(';');

    const payloadHash = createHash('sha256').update(body).digest('hex');
    headers['x-amz-content-sha256'] = payloadHash;

    const canonicalRequest = [
      method,
      path,
      query,
      canonicalHeaders,
      signedHeadersStr,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/ses/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const hmac = (key: Buffer | string, data: string): Buffer =>
      createHmac('sha256', key).update(data).digest();

    const signingKey = hmac(
      hmac(
        hmac(
          hmac(`AWS4${this.secretAccessKey}`, dateStamp),
          this.region,
        ),
        'ses',
      ),
      'aws4_request',
    );

    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

    return headers;
  }

  private async sesRequest(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string>,
  ): Promise<ToolResult> {
    const query = queryParams ? new URLSearchParams(queryParams).toString() : '';
    const bodyStr = body ? JSON.stringify(body) : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const signedHeaders = this.sign(method, path, query, headers, bodyStr);
    const url = `${this.baseUrl}${path}${query ? '?' + query : ''}`;

    const response = await this.fetchWithRetry(url, {
      method,
      headers: signedHeaders,
      body: bodyStr || undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }

    let data: unknown;
    const ct = response.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      data = await response.json();
    } else {
      data = { status: response.status, body: await response.text() };
    }

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ---- Tool implementations ----

  private async sendEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from_address || !args.to_addresses) {
      return { content: [{ type: 'text', text: 'from_address and to_addresses are required' }], isError: true };
    }
    if (!args.subject && !args.body_text && !args.body_html) {
      return { content: [{ type: 'text', text: 'subject and at least one of body_text or body_html are required' }], isError: true };
    }

    const toList = (args.to_addresses as string).split(',').map(s => s.trim());
    const body: Record<string, unknown> = {
      FromEmailAddress: args.from_address,
      Destination: { ToAddresses: toList },
      Content: {
        Simple: {
          Subject: { Data: args.subject ?? '', Charset: 'UTF-8' },
          Body: {} as Record<string, unknown>,
        },
      },
    };

    const simpleBody = (body.Content as Record<string, unknown>).Simple as Record<string, unknown>;
    const bodyContent = simpleBody.Body as Record<string, unknown>;
    if (args.body_text) bodyContent.Text = { Data: args.body_text, Charset: 'UTF-8' };
    if (args.body_html) bodyContent.Html = { Data: args.body_html, Charset: 'UTF-8' };

    if (args.cc_addresses) {
      (body.Destination as Record<string, unknown>).CcAddresses = (args.cc_addresses as string).split(',').map(s => s.trim());
    }
    if (args.bcc_addresses) {
      (body.Destination as Record<string, unknown>).BccAddresses = (args.bcc_addresses as string).split(',').map(s => s.trim());
    }
    if (args.reply_to_addresses) {
      body.ReplyToAddresses = (args.reply_to_addresses as string).split(',').map(s => s.trim());
    }
    if (args.configuration_set_name) {
      body.ConfigurationSetName = args.configuration_set_name;
    }

    return this.sesRequest('POST', '/v2/email/outbound-emails', body);
  }

  private async sendBulkEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from_address || !args.template_name || !args.bulk_email_entries) {
      return { content: [{ type: 'text', text: 'from_address, template_name, and bulk_email_entries are required' }], isError: true };
    }
    let entries: unknown;
    try {
      entries = JSON.parse(args.bulk_email_entries as string);
    } catch {
      return { content: [{ type: 'text', text: 'bulk_email_entries must be a valid JSON array' }], isError: true };
    }
    const body: Record<string, unknown> = {
      FromEmailAddress: args.from_address,
      DefaultContent: {
        Template: {
          TemplateName: args.template_name,
          TemplateData: (args.default_template_data as string) ?? '{}',
        },
      },
      BulkEmailEntries: entries,
    };
    if (args.configuration_set_name) body.ConfigurationSetName = args.configuration_set_name;
    return this.sesRequest('POST', '/v2/email/outbound-bulk-emails', body);
  }

  private async listEmailIdentities(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      PageSize: String((args.page_size as number) ?? 100),
    };
    if (args.next_token) params.NextToken = args.next_token as string;
    return this.sesRequest('GET', '/v2/email/identities', undefined, params);
  }

  private async getEmailIdentity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email_identity) return { content: [{ type: 'text', text: 'email_identity is required' }], isError: true };
    return this.sesRequest('GET', `/v2/email/identities/${encodeURIComponent(args.email_identity as string)}`);
  }

  private async createEmailIdentity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email_identity) return { content: [{ type: 'text', text: 'email_identity is required' }], isError: true };
    const body: Record<string, unknown> = { EmailIdentity: args.email_identity };
    if (typeof args.dkim_signing_enabled === 'boolean') {
      body.DkimSigningAttributes = { NextSigningKeyLength: 'RSA_2048_BIT' };
    }
    return this.sesRequest('POST', '/v2/email/identities', body);
  }

  private async deleteEmailIdentity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email_identity) return { content: [{ type: 'text', text: 'email_identity is required' }], isError: true };
    return this.sesRequest('DELETE', `/v2/email/identities/${encodeURIComponent(args.email_identity as string)}`);
  }

  private async listEmailTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      PageSize: String((args.page_size as number) ?? 10),
    };
    if (args.next_token) params.NextToken = args.next_token as string;
    return this.sesRequest('GET', '/v2/email/templates', undefined, params);
  }

  private async getEmailTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_name) return { content: [{ type: 'text', text: 'template_name is required' }], isError: true };
    return this.sesRequest('GET', `/v2/email/templates/${encodeURIComponent(args.template_name as string)}`);
  }

  private async createEmailTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_name || !args.subject) {
      return { content: [{ type: 'text', text: 'template_name and subject are required' }], isError: true };
    }
    const templateContent: Record<string, string> = {
      Subject: args.subject as string,
    };
    if (args.html_part) templateContent.Html = args.html_part as string;
    if (args.text_part) templateContent.Text = args.text_part as string;
    return this.sesRequest('POST', '/v2/email/templates', {
      TemplateName: args.template_name,
      TemplateContent: templateContent,
    });
  }

  private async updateEmailTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_name) return { content: [{ type: 'text', text: 'template_name is required' }], isError: true };
    const templateContent: Record<string, string> = {};
    if (args.subject) templateContent.Subject = args.subject as string;
    if (args.html_part) templateContent.Html = args.html_part as string;
    if (args.text_part) templateContent.Text = args.text_part as string;
    return this.sesRequest('PUT', `/v2/email/templates/${encodeURIComponent(args.template_name as string)}`, {
      TemplateContent: templateContent,
    });
  }

  private async deleteEmailTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_name) return { content: [{ type: 'text', text: 'template_name is required' }], isError: true };
    return this.sesRequest('DELETE', `/v2/email/templates/${encodeURIComponent(args.template_name as string)}`);
  }

  private async listSuppressedDestinations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      PageSize: String((args.page_size as number) ?? 100),
    };
    if (args.reasons) params.Reason = args.reasons as string;
    if (args.start_date) params.StartDate = args.start_date as string;
    if (args.end_date) params.EndDate = args.end_date as string;
    if (args.next_token) params.NextToken = args.next_token as string;
    return this.sesRequest('GET', '/v2/email/suppression/addresses', undefined, params);
  }

  private async getSuppressedDestination(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email_address) return { content: [{ type: 'text', text: 'email_address is required' }], isError: true };
    return this.sesRequest('GET', `/v2/email/suppression/addresses/${encodeURIComponent(args.email_address as string)}`);
  }

  private async putSuppressedDestination(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email_address || !args.reason) {
      return { content: [{ type: 'text', text: 'email_address and reason are required' }], isError: true };
    }
    return this.sesRequest('PUT', '/v2/email/suppression/addresses', {
      EmailAddress: args.email_address,
      Reason: args.reason,
    });
  }

  private async deleteSuppressedDestination(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email_address) return { content: [{ type: 'text', text: 'email_address is required' }], isError: true };
    return this.sesRequest('DELETE', `/v2/email/suppression/addresses/${encodeURIComponent(args.email_address as string)}`);
  }

  private async getAccount(): Promise<ToolResult> {
    return this.sesRequest('GET', '/v2/email/account');
  }
}
