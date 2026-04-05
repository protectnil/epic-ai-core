/**
 * DocuSign MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.docusign.com — vendor-hosted, transport: streamable-HTTP, auth: Bearer
//   (Beta as of 2026-03-28. Documented at https://developers.docusign.com/platform/mcp-server/.)
//   Third-party adapters also exist: luthersystems/mcp-server-docusign (Python, stdio),
//   thisdot/docusign-navigator-mcp (Navigator API only, streamable-HTTP).
// Our adapter covers: 16 tools (envelopes, templates, recipients, tabs, documents, folders,
//   users, signing views). Vendor MCP covers: tool count not publicly enumerated (beta, developer
//   preview covers eSignature, Navigator, Maestro, Connected Fields API groups).
// Recommendation: use-rest-api. The vendor MCP is in beta with no published tool list or
//   stable contract; our REST adapter provides verified, stable eSignature v2.1 coverage.
//   Revisit use-vendor-mcp once the vendor MCP exits beta and publishes a stable tool manifest.
//
// Base URL: https://{basePath}/restapi/v2.1 (account-specific — obtain basePath from GET
//   https://account.docusign.com/oauth/userinfo after authentication)
// Auth: Bearer token — obtain via JWT Grant (server-to-server) or Authorization Code flow
// Docs: https://developers.docusign.com/docs/esign-rest-api/reference/
// Rate limits: Burst limit varies by plan; contact DocuSign support for production limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DocuSignConfig {
  accessToken: string;
  basePath: string;     // e.g. "na1.docusign.net" — obtain from /oauth/userinfo
  accountId: string;
  baseUrl?: string;     // optional full override — bypasses basePath construction
}

export class DocuSignMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly accountId: string;

  constructor(config: DocuSignConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? `https://${config.basePath}/restapi/v2.1`;
    this.accountId = config.accountId;
  }

  static catalog() {
    return {
      name: 'docusign',
      displayName: 'DocuSign',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'docusign', 'esignature', 'signature', 'envelope', 'signing', 'contract',
        'document', 'template', 'recipient', 'signer', 'legal', 'agreement',
      ],
      toolNames: [
        'list_envelopes', 'get_envelope', 'create_envelope', 'update_envelope',
        'void_envelope', 'resend_envelope',
        'list_envelope_recipients', 'update_envelope_recipients',
        'get_envelope_documents', 'list_envelope_tabs',
        'create_envelope_view', 'list_templates', 'get_template',
        'list_folders', 'list_users', 'get_user',
      ],
      description: 'DocuSign eSignature operations: create and manage envelopes, templates, recipients, documents, and signing views via the DocuSign REST API v2.1.',
      author: 'protectnil',
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private get acctBase(): string {
    return `${this.baseUrl}/accounts/${encodeURIComponent(this.accountId)}`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_envelopes',
        description: 'List envelopes for the account with optional filters for status, date range, search text, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            from_date: {
              type: 'string',
              description: 'Only return envelopes on or after this date (ISO 8601, e.g. 2025-01-01T00:00:00Z)',
            },
            to_date: {
              type: 'string',
              description: 'Only return envelopes on or before this date (ISO 8601)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: created, sent, delivered, signed, completed, declined, voided',
            },
            count: {
              type: 'number',
              description: 'Maximum number of envelopes to return (default: 100)',
            },
            start_position: {
              type: 'number',
              description: 'Zero-based start index for pagination (default: 0)',
            },
            search_text: {
              type: 'string',
              description: 'Free-text search across envelope subject and sender name',
            },
            folder_ids: {
              type: 'string',
              description: 'Comma-separated folder IDs to limit the search',
            },
          },
        },
      },
      {
        name: 'get_envelope',
        description: 'Get full details for a specific envelope by ID including status, timestamps, and sender info',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID',
            },
          },
          required: ['envelope_id'],
        },
      },
      {
        name: 'create_envelope',
        description: 'Create and optionally send an envelope (document package for signing). Set status to "sent" to deliver immediately or "created" for draft.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Envelope status: "sent" to send immediately, "created" to save as draft',
            },
            email_subject: {
              type: 'string',
              description: 'Subject line for the signing request email',
            },
            email_blurb: {
              type: 'string',
              description: 'Body text for the signing request email',
            },
            documents: {
              type: 'array',
              description: 'Array of document objects. Each needs documentId, name, and documentBase64 (base64-encoded content).',
              items: { type: 'object' },
            },
            recipients: {
              type: 'object',
              description: 'Recipients object with signers, carbonCopies, etc. Signers need email, name, recipientId, routingOrder.',
            },
            template_id: {
              type: 'string',
              description: 'Template ID to create envelope from a template instead of raw documents',
            },
          },
          required: ['status', 'email_subject'],
        },
      },
      {
        name: 'update_envelope',
        description: 'Update an existing envelope — change status, notification settings, or resend',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID',
            },
            status: {
              type: 'string',
              description: 'New status: sent, voided',
            },
            voided_reason: {
              type: 'string',
              description: 'Required when setting status to voided',
            },
            email_subject: {
              type: 'string',
              description: 'Updated email subject line',
            },
          },
          required: ['envelope_id'],
        },
      },
      {
        name: 'void_envelope',
        description: 'Void (cancel) a sent but not yet completed envelope with a required reason',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID to void',
            },
            voided_reason: {
              type: 'string',
              description: 'Reason for voiding the envelope (required by DocuSign)',
            },
          },
          required: ['envelope_id', 'voided_reason'],
        },
      },
      {
        name: 'resend_envelope',
        description: 'Resend reminder notifications to all pending recipients of an envelope',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID to resend',
            },
          },
          required: ['envelope_id'],
        },
      },
      {
        name: 'list_envelope_recipients',
        description: 'List all recipients (signers, CCs, viewers, etc.) for an envelope with their current status',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID',
            },
            include_tabs: {
              type: 'boolean',
              description: 'Include tab information for each recipient (default: false)',
            },
          },
          required: ['envelope_id'],
        },
      },
      {
        name: 'update_envelope_recipients',
        description: 'Add, update, or replace recipients on an existing envelope before it is completed',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID',
            },
            signers: {
              type: 'array',
              description: 'Array of signer objects to add or update (each needs email, name, recipientId)',
              items: { type: 'object' },
            },
            carbon_copies: {
              type: 'array',
              description: 'Array of carbon copy recipient objects to add or update',
              items: { type: 'object' },
            },
          },
          required: ['envelope_id'],
        },
      },
      {
        name: 'get_envelope_documents',
        description: 'List all documents attached to an envelope with document IDs and names',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID',
            },
          },
          required: ['envelope_id'],
        },
      },
      {
        name: 'list_envelope_tabs',
        description: 'List all tabs (signature fields, date fields, text fields, etc.) for a recipient in an envelope',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID',
            },
            recipient_id: {
              type: 'string',
              description: 'The recipient ID to list tabs for',
            },
          },
          required: ['envelope_id', 'recipient_id'],
        },
      },
      {
        name: 'create_envelope_view',
        description: 'Create a recipient signing view URL (embedded signing) for a specific signer',
        inputSchema: {
          type: 'object',
          properties: {
            envelope_id: {
              type: 'string',
              description: 'The DocuSign envelope UUID',
            },
            return_url: {
              type: 'string',
              description: 'URL to redirect the signer to after signing',
            },
            recipient_email: {
              type: 'string',
              description: 'Email address of the recipient to generate the view for',
            },
            recipient_name: {
              type: 'string',
              description: 'Name of the recipient',
            },
            client_user_id: {
              type: 'string',
              description: 'Unique identifier for the embedded signer (must match the one set on the envelope recipient)',
            },
          },
          required: ['envelope_id', 'return_url', 'recipient_email', 'recipient_name', 'client_user_id'],
        },
      },
      {
        name: 'list_templates',
        description: 'List envelope templates available in the account with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Maximum number of templates to return (default: 100)',
            },
            start_position: {
              type: 'number',
              description: 'Zero-based start index for pagination',
            },
            search_text: {
              type: 'string',
              description: 'Filter templates by name',
            },
            folder: {
              type: 'string',
              description: 'Filter templates by folder name',
            },
          },
        },
      },
      {
        name: 'get_template',
        description: 'Get details for a specific envelope template by ID',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'The DocuSign template UUID',
            },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'list_folders',
        description: 'List envelope folders for the account to organize and filter envelopes',
        inputSchema: {
          type: 'object',
          properties: {
            template_type: {
              type: 'string',
              description: 'Filter folders by type: templates or envelopes',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List users in the DocuSign account with optional filters for name and email',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Maximum number of users to return (default: 100)',
            },
            start_position: {
              type: 'number',
              description: 'Zero-based start index for pagination',
            },
            email: {
              type: 'string',
              description: 'Filter by email address',
            },
            user_name: {
              type: 'string',
              description: 'Filter by username',
            },
            status: {
              type: 'string',
              description: 'Filter by user status: active, created, closed',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get profile and settings for a specific DocuSign account user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The DocuSign user UUID',
            },
          },
          required: ['user_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_envelopes':
          return await this.listEnvelopes(args);
        case 'get_envelope':
          return await this.getEnvelope(args);
        case 'create_envelope':
          return await this.createEnvelope(args);
        case 'update_envelope':
          return await this.updateEnvelope(args);
        case 'void_envelope':
          return await this.voidEnvelope(args);
        case 'resend_envelope':
          return await this.resendEnvelope(args);
        case 'list_envelope_recipients':
          return await this.listEnvelopeRecipients(args);
        case 'update_envelope_recipients':
          return await this.updateEnvelopeRecipients(args);
        case 'get_envelope_documents':
          return await this.getEnvelopeDocuments(args);
        case 'list_envelope_tabs':
          return await this.listEnvelopeTabs(args);
        case 'create_envelope_view':
          return await this.createEnvelopeView(args);
        case 'list_templates':
          return await this.listTemplates(args);
        case 'get_template':
          return await this.getTemplate(args);
        case 'list_folders':
          return await this.listFolders(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async request(path: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.acctBase}${path}`, {
      ...options,
      headers: { ...this.headers, ...(options?.headers as Record<string, string> ?? {}) },
    });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `DocuSign API error ${response.status} ${response.statusText}: ${errBody}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`DocuSign returned non-JSON response (HTTP ${response.status})`);
    }
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listEnvelopes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.from_date) params.set('from_date', args.from_date as string);
    if (args.to_date) params.set('to_date', args.to_date as string);
    if (args.status) params.set('status', args.status as string);
    if (args.count) params.set('count', String(args.count));
    if (args.start_position !== undefined) params.set('start_position', String(args.start_position));
    if (args.search_text) params.set('search_text', args.search_text as string);
    if (args.folder_ids) params.set('folder_ids', args.folder_ids as string);
    return this.request(`/envelopes?${params}`);
  }

  private async getEnvelope(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/envelopes/${encodeURIComponent(args.envelope_id as string)}`);
  }

  private async createEnvelope(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      status: args.status,
      emailSubject: args.email_subject,
    };
    if (args.email_blurb) body.emailBlurb = args.email_blurb;
    if (args.documents) body.documents = args.documents;
    if (args.recipients) body.recipients = args.recipients;
    if (args.template_id) {
      body.templateId = args.template_id;
    }
    return this.request('/envelopes', { method: 'POST', body: JSON.stringify(body) });
  }

  private async updateEnvelope(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.voided_reason) body.voidedReason = args.voided_reason;
    if (args.email_subject) body.emailSubject = args.email_subject;
    return this.request(`/envelopes/${encodeURIComponent(args.envelope_id as string)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async voidEnvelope(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/envelopes/${encodeURIComponent(args.envelope_id as string)}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'voided', voidedReason: args.voided_reason }),
    });
  }

  private async resendEnvelope(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      `/envelopes/${encodeURIComponent(args.envelope_id as string)}?resend_envelope=true`,
      { method: 'PUT', body: JSON.stringify({}) },
    );
  }

  private async listEnvelopeRecipients(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.include_tabs) params.set('include_tabs', 'true');
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/envelopes/${encodeURIComponent(args.envelope_id as string)}/recipients${qs}`);
  }

  private async updateEnvelopeRecipients(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.signers) body.signers = args.signers;
    if (args.carbon_copies) body.carbonCopies = args.carbon_copies;
    return this.request(`/envelopes/${encodeURIComponent(args.envelope_id as string)}/recipients`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async getEnvelopeDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/envelopes/${encodeURIComponent(args.envelope_id as string)}/documents`);
  }

  private async listEnvelopeTabs(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      `/envelopes/${encodeURIComponent(args.envelope_id as string)}/recipients/${encodeURIComponent(args.recipient_id as string)}/tabs`,
    );
  }

  private async createEnvelopeView(args: Record<string, unknown>): Promise<ToolResult> {
    const body = {
      returnUrl: args.return_url,
      authenticationMethod: 'none',
      email: args.recipient_email,
      userName: args.recipient_name,
      clientUserId: args.client_user_id,
    };
    return this.request(`/envelopes/${encodeURIComponent(args.envelope_id as string)}/views/recipient`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.count) params.set('count', String(args.count));
    if (args.start_position !== undefined) params.set('start_position', String(args.start_position));
    if (args.search_text) params.set('search_text', args.search_text as string);
    if (args.folder) params.set('folder', args.folder as string);
    return this.request(`/templates?${params}`);
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/templates/${encodeURIComponent(args.template_id as string)}`);
  }

  private async listFolders(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.template_type) params.set('template_type', args.template_type as string);
    const qs = params.toString() ? `?${params}` : '';
    return this.request(`/folders${qs}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.count) params.set('count', String(args.count));
    if (args.start_position !== undefined) params.set('start_position', String(args.start_position));
    if (args.email) params.set('email', args.email as string);
    if (args.user_name) params.set('user_name', args.user_name as string);
    if (args.status) params.set('status', args.status as string);
    return this.request(`/users?${params}`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`/users/${encodeURIComponent(args.user_id as string)}`);
  }
}
