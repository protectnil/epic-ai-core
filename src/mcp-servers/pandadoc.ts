/**
 * PandaDoc MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developers.pandadoc.com/mcp — PandaDoc ships an official hosted MCP
// server (streamable-HTTP, accessed via mcp-remote). Auth: API-Key header. The vendor docs at
// https://github.com/pandadoc/pandadoc-mcp-server return 404 — no separate GitHub repo exists;
// the server is hosted at the URL above. Coverage: document creation, sending, tracking,
// template management, contacts, and workflow automation via natural-language instructions.
// Transport: streamable-HTTP. Maintained: yes (active as of 2026-03 per developer.pandadoc.com).
// Recommendation: use-both — the hosted MCP is primarily a developer-assistant/API-exploration
// server that also executes operations; our REST adapter provides direct programmatic control
// over all document, template, contact, and webhook operations for air-gapped or automated use.
//
// Base URL: https://api.pandadoc.com/public/v1
// Auth: Two modes:
//   API Key  — Authorization: API-Key {key}
//   OAuth2   — Authorization: Bearer {access_token}
// Docs: https://developers.pandadoc.com/reference/about
// Rate limits: 100 req/min on sandbox; production limits not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';
import type { AdapterCatalogEntry } from '../federation/AdapterCatalog.js';

interface PandaDocConfig {
  apiKey?: string;       // API-Key auth: "API-Key {key}"
  accessToken?: string;  // OAuth2 Bearer auth: "Bearer {token}"
  baseUrl?: string;
}

export class PandaDocMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: PandaDocConfig) {
    super();
    if (!config.apiKey && !config.accessToken) {
      throw new Error('PandaDocMCPServer requires either apiKey or accessToken');
    }
    this.authHeader = config.accessToken
      ? `Bearer ${config.accessToken}`
      : `API-Key ${config.apiKey}`;
    this.baseUrl = config.baseUrl || 'https://api.pandadoc.com/public/v1';
  }

  static catalog(): AdapterCatalogEntry {
    return {
      name: 'pandadoc',
      displayName: 'PandaDoc',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'pandadoc', 'document', 'esign', 'e-signature', 'contract', 'proposal',
        'template', 'recipient', 'signing', 'quote', 'send', 'approve',
        'contact', 'webhook', 'form', 'field', 'token',
      ],
      toolNames: [
        'list_documents', 'get_document', 'create_document_from_template',
        'create_document_from_pdf', 'send_document', 'delete_document',
        'download_document', 'get_document_status',
        'list_document_fields', 'update_document_fields',
        'get_document_session',
        'list_templates', 'get_template', 'delete_template',
        'list_contacts', 'get_contact', 'create_contact', 'update_contact', 'delete_contact',
        'list_webhook_subscriptions', 'create_webhook_subscription', 'delete_webhook_subscription',
      ],
      description: 'Document management and e-signatures: create, send, and track documents and contracts. Manage templates, contacts, and webhook subscriptions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_documents',
        description: 'List PandaDoc documents with optional filters for status, tag, search query, and sort order.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'number',
              description: 'Filter by status code: 0=draft, 1=sent, 2=completed, 3=uploaded, 4=error, 5=viewed, 6=waiting_approval, 7=approved, 8=rejected, 9=waiting_pay, 10=paid, 11=voided, 12=declined',
            },
            tag: {
              type: 'string',
              description: 'Filter documents by tag label',
            },
            q: {
              type: 'string',
              description: 'Search query to filter documents by name',
            },
            count: {
              type: 'number',
              description: 'Number of documents per page (default: 50, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            order_by: {
              type: 'string',
              description: 'Sort field: name, status, date_created, date_modified, date_completed',
            },
            asc: {
              type: 'boolean',
              description: 'Sort ascending (true) or descending (false, default)',
            },
          },
        },
      },
      {
        name: 'get_document',
        description: 'Get detailed status and metadata for a specific PandaDoc document including recipients and fields.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'PandaDoc document UUID',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'get_document_status',
        description: 'Get only the status of a PandaDoc document (lightweight check without full detail).',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'PandaDoc document UUID',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'create_document_from_template',
        description: 'Create a new PandaDoc document from an existing template with recipients and optional field pre-fill.',
        inputSchema: {
          type: 'object',
          properties: {
            template_uuid: {
              type: 'string',
              description: 'UUID of the PandaDoc template to use',
            },
            name: {
              type: 'string',
              description: 'Name for the new document',
            },
            recipients: {
              type: 'array',
              description: 'Array of recipient objects, each with: email (required), role (required), first_name, last_name, phone',
              items: { type: 'object' },
            },
            tokens: {
              type: 'array',
              description: 'Array of token objects for field substitution, each with: name, value',
              items: { type: 'object' },
            },
            fields: {
              type: 'object',
              description: 'Object mapping field identifiers to their value objects for pre-filling',
            },
            metadata: {
              type: 'object',
              description: 'Custom key-value metadata to attach to the document',
            },
          },
          required: ['template_uuid', 'name', 'recipients'],
        },
      },
      {
        name: 'create_document_from_pdf',
        description: 'Create a new PandaDoc document from a remote PDF URL with optional recipients and form field parsing.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new document',
            },
            url: {
              type: 'string',
              description: 'Publicly accessible URL to the PDF file',
            },
            recipients: {
              type: 'array',
              description: 'Array of recipient objects, each with: email, role, first_name, last_name',
              items: { type: 'object' },
            },
            parse_form_fields: {
              type: 'boolean',
              description: 'Parse PDF form fields as PandaDoc fields (default: false)',
            },
            metadata: {
              type: 'object',
              description: 'Custom key-value metadata to attach to the document',
            },
          },
          required: ['name', 'url'],
        },
      },
      {
        name: 'send_document',
        description: 'Send a draft PandaDoc document to its recipients for viewing and signing via email.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'PandaDoc document UUID to send',
            },
            message: {
              type: 'string',
              description: 'Optional message to include in the send notification email',
            },
            silent: {
              type: 'boolean',
              description: 'If true, transition document to sent without sending email notifications (default: false)',
            },
            subject: {
              type: 'string',
              description: 'Custom email subject line for the send notification',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'delete_document',
        description: 'Permanently delete a PandaDoc document. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'PandaDoc document UUID to delete',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'download_document',
        description: 'Get the download URL for a completed PandaDoc document PDF.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'PandaDoc document UUID to download',
            },
            protected: {
              type: 'boolean',
              description: 'If true, returns a digitally sealed PDF (default: false)',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'get_document_session',
        description: 'Create a session link for a recipient to view or sign a document without email authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'PandaDoc document UUID',
            },
            recipient_email: {
              type: 'string',
              description: 'Email address of the recipient to generate the session for',
            },
            lifetime: {
              type: 'number',
              description: 'Session lifetime in seconds (default: 3600)',
            },
          },
          required: ['document_id', 'recipient_email'],
        },
      },
      {
        name: 'list_document_fields',
        description: 'List all fields in a PandaDoc document to discover field identifiers before filling them.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'PandaDoc document UUID',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'update_document_fields',
        description: 'Update the values of fields in an existing PandaDoc document.',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'PandaDoc document UUID',
            },
            fields: {
              type: 'object',
              description: 'Object mapping field identifiers to their new value objects',
            },
          },
          required: ['document_id', 'fields'],
        },
      },
      {
        name: 'list_templates',
        description: 'List available PandaDoc templates with optional search query and tag filter.',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query to filter templates by name',
            },
            tag: {
              type: 'string',
              description: 'Filter templates by tag',
            },
            count: {
              type: 'number',
              description: 'Number of templates per page (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_template',
        description: 'Get details and fields of a specific PandaDoc template by UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            template_uuid: {
              type: 'string',
              description: 'PandaDoc template UUID',
            },
          },
          required: ['template_uuid'],
        },
      },
      {
        name: 'delete_template',
        description: 'Permanently delete a PandaDoc template by UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            template_uuid: {
              type: 'string',
              description: 'PandaDoc template UUID to delete',
            },
          },
          required: ['template_uuid'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List PandaDoc contacts in the workspace with optional search query.',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query to filter contacts by name or email',
            },
            count: {
              type: 'number',
              description: 'Number of contacts per page (default: 50)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get a single PandaDoc contact by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'PandaDoc contact ID',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in PandaDoc for use as a document recipient.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Contact email address (unique identifier)',
            },
            first_name: {
              type: 'string',
              description: 'Contact first name',
            },
            last_name: {
              type: 'string',
              description: 'Contact last name',
            },
            phone: {
              type: 'string',
              description: 'Contact phone number',
            },
            company: {
              type: 'string',
              description: 'Contact company name',
            },
            job_title: {
              type: 'string',
              description: 'Contact job title',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update an existing PandaDoc contact by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'PandaDoc contact ID to update',
            },
            email: {
              type: 'string',
              description: 'Updated email address',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            phone: {
              type: 'string',
              description: 'Updated phone number',
            },
            company: {
              type: 'string',
              description: 'Updated company name',
            },
            job_title: {
              type: 'string',
              description: 'Updated job title',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Delete a PandaDoc contact by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'PandaDoc contact ID to delete',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'list_webhook_subscriptions',
        description: 'List all configured PandaDoc webhook subscriptions in the workspace.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_webhook_subscription',
        description: 'Create a PandaDoc webhook subscription to receive notifications for document events.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Descriptive name for this webhook subscription',
            },
            url: {
              type: 'string',
              description: 'HTTPS endpoint URL to receive webhook POST payloads',
            },
            triggers: {
              type: 'array',
              description: 'Array of event triggers: document_state_changed, document_updated, document_completed, recipient_completed, document_deleted, template_created, template_updated, template_deleted',
            },
            payload: {
              type: 'array',
              description: 'Array of payload fields to include: products, fields, metadata, tokens (default: all)',
            },
          },
          required: ['name', 'url', 'triggers'],
        },
      },
      {
        name: 'delete_webhook_subscription',
        description: 'Delete a PandaDoc webhook subscription by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'PandaDoc webhook subscription ID to delete',
            },
          },
          required: ['webhook_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_documents':
          return await this.listDocuments(args);
        case 'get_document':
          return await this.getDocument(args);
        case 'get_document_status':
          return await this.getDocumentStatus(args);
        case 'create_document_from_template':
          return await this.createDocumentFromTemplate(args);
        case 'create_document_from_pdf':
          return await this.createDocumentFromPdf(args);
        case 'send_document':
          return await this.sendDocument(args);
        case 'delete_document':
          return await this.deleteDocument(args);
        case 'download_document':
          return await this.downloadDocument(args);
        case 'get_document_session':
          return await this.getDocumentSession(args);
        case 'list_document_fields':
          return await this.listDocumentFields(args);
        case 'update_document_fields':
          return await this.updateDocumentFields(args);
        case 'list_templates':
          return await this.listTemplates(args);
        case 'get_template':
          return await this.getTemplate(args);
        case 'delete_template':
          return await this.deleteTemplate(args);
        case 'list_contacts':
          return await this.listContacts(args);
        case 'get_contact':
          return await this.getContact(args);
        case 'create_contact':
          return await this.createContact(args);
        case 'update_contact':
          return await this.updateContact(args);
        case 'delete_contact':
          return await this.deleteContact(args);
        case 'list_webhook_subscriptions':
          return await this.listWebhookSubscriptions();
        case 'create_webhook_subscription':
          return await this.createWebhookSubscription(args);
        case 'delete_webhook_subscription':
          return await this.deleteWebhookSubscription(args);
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

  // ─── Private helpers ──────────────────────────────────────────────────────

  private get reqHeaders(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      ...options,
      headers: { ...this.reqHeaders, ...(options.headers as Record<string, string> || {}) },
    });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `PandaDoc API error: ${response.status} ${response.statusText}${errBody ? ' — ' + errBody : ''}` }],
        isError: true,
      };
    }
    // Some endpoints return 204 No Content
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content returned)' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ─── Tool implementations ─────────────────────────────────────────────────

  private async listDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status !== undefined) params.set('status', String(args.status));
    if (args.tag) params.set('tag', args.tag as string);
    if (args.q) params.set('q', args.q as string);
    if (args.count) params.set('count', String(args.count));
    if (args.page) params.set('page', String(args.page));
    if (args.order_by) params.set('order_by', args.order_by as string);
    if (typeof args.asc === 'boolean') params.set('asc', String(args.asc));
    return this.fetchJson(`${this.baseUrl}/documents?${params}`);
  }

  private async getDocument(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/documents/${encodeURIComponent(args.document_id as string)}/details`);
  }

  private async getDocumentStatus(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/documents/${encodeURIComponent(args.document_id as string)}`);
  }

  private async createDocumentFromTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      template_uuid: args.template_uuid,
      name: args.name,
      recipients: args.recipients,
    };
    if (args.tokens) body.tokens = args.tokens;
    if (args.fields) body.fields = args.fields;
    if (args.metadata) body.metadata = args.metadata;
    return this.fetchJson(`${this.baseUrl}/documents`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async createDocumentFromPdf(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      name: args.name,
      url: args.url,
    };
    if (args.recipients) body.recipients = args.recipients;
    if (typeof args.parse_form_fields === 'boolean') body.parse_form_fields = args.parse_form_fields;
    if (args.metadata) body.metadata = args.metadata;
    return this.fetchJson(`${this.baseUrl}/documents`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async sendDocument(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.message) body.message = args.message;
    if (typeof args.silent === 'boolean') body.silent = args.silent;
    if (args.subject) body.subject = args.subject;
    return this.fetchJson(
      `${this.baseUrl}/documents/${encodeURIComponent(args.document_id as string)}/send`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async deleteDocument(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/documents/${encodeURIComponent(args.document_id as string)}`,
      { method: 'DELETE', headers: this.reqHeaders },
    );
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Failed to delete document: ${response.status} ${response.statusText}${errBody ? ' — ' + errBody : ''}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: 'Document deleted successfully' }], isError: false };
  }

  private async downloadDocument(args: Record<string, unknown>): Promise<ToolResult> {
    const endpoint = args.protected ? 'download-protected' : 'download';
    return this.fetchJson(`${this.baseUrl}/documents/${encodeURIComponent(args.document_id as string)}/${endpoint}`);
  }

  private async getDocumentSession(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { recipient: args.recipient_email };
    if (args.lifetime) body.lifetime = args.lifetime;
    return this.fetchJson(
      `${this.baseUrl}/documents/${encodeURIComponent(args.document_id as string)}/session`,
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async listDocumentFields(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/documents/${encodeURIComponent(args.document_id as string)}/fields`);
  }

  private async updateDocumentFields(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(
      `${this.baseUrl}/documents/${encodeURIComponent(args.document_id as string)}/fields`,
      { method: 'PUT', body: JSON.stringify({ fields: args.fields }) },
    );
  }

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.q) params.set('q', args.q as string);
    if (args.tag) params.set('tag', args.tag as string);
    if (args.count) params.set('count', String(args.count));
    if (args.page) params.set('page', String(args.page));
    return this.fetchJson(`${this.baseUrl}/templates?${params}`);
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/templates/${encodeURIComponent(args.template_uuid as string)}/details`);
  }

  private async deleteTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/templates/${encodeURIComponent(args.template_uuid as string)}`,
      { method: 'DELETE', headers: this.reqHeaders },
    );
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Failed to delete template: ${response.status} ${response.statusText}${errBody ? ' — ' + errBody : ''}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: 'Template deleted successfully' }], isError: false };
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.q) params.set('q', args.q as string);
    if (args.count) params.set('count', String(args.count));
    if (args.page) params.set('page', String(args.page));
    return this.fetchJson(`${this.baseUrl}/contacts?${params}`);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { email: args.email };
    if (args.first_name) body.first_name = args.first_name;
    if (args.last_name) body.last_name = args.last_name;
    if (args.phone) body.phone = args.phone;
    if (args.company) body.company = args.company;
    if (args.job_title) body.job_title = args.job_title;
    return this.fetchJson(`${this.baseUrl}/contacts`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    const { contact_id, ...fields } = args;
    return this.fetchJson(`${this.baseUrl}/contacts/${encodeURIComponent(contact_id as string)}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
  }

  private async deleteContact(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/contacts/${encodeURIComponent(args.contact_id as string)}`,
      { method: 'DELETE', headers: this.reqHeaders },
    );
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Failed to delete contact: ${response.status} ${response.statusText}${errBody ? ' — ' + errBody : ''}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: 'Contact deleted successfully' }], isError: false };
  }

  private async listWebhookSubscriptions(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/webhook-subscriptions`);
  }

  private async createWebhookSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      name: args.name,
      url: args.url,
      triggers: args.triggers,
    };
    if (args.payload) body.payload = args.payload;
    return this.fetchJson(`${this.baseUrl}/webhook-subscriptions`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteWebhookSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/webhook-subscriptions/${encodeURIComponent(args.webhook_id as string)}`,
      { method: 'DELETE', headers: this.reqHeaders },
    );
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Failed to delete webhook subscription: ${response.status} ${response.statusText}${errBody ? ' — ' + errBody : ''}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: 'Webhook subscription deleted successfully' }], isError: false };
  }
}
