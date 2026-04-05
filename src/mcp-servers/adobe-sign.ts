/**
 * Adobe Acrobat Sign MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Adobe Acrobat Sign REST API v6
// Base URL: region-specific (e.g. https://api.na1.adobesign.com for North America)
//   Other regions: eu1, au1, jp1, in1
// Auth: OAuth2 Bearer token — obtain via Adobe Sign OAuth2 flow
// Docs: https://secure.adobesign.com/public/docs/restapi/v6
// Rate limits: 18 requests/second per integration key; varies by plan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AdobeSignConfig {
  accessToken: string;
  baseUrl?: string;
}

export class AdobeSignMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: AdobeSignConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://api.na1.adobesign.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'adobe-sign',
      displayName: 'Adobe Acrobat Sign',
      version: '1.0.0',
      category: 'collaboration',
      keywords: ['adobe', 'sign', 'acrobat', 'esignature', 'electronic signature', 'agreement', 'document', 'contract', 'pdf', 'digital signature'],
      toolNames: [
        'create_agreement', 'get_agreement', 'list_agreements', 'cancel_agreement',
        'get_signing_url', 'send_reminder', 'list_templates', 'get_template',
        'create_agreement_from_template', 'get_audit_trail', 'list_widgets',
        'get_agreement_documents', 'download_document', 'list_library_documents',
      ],
      description: 'Adobe Acrobat Sign eSignature platform: create and manage agreements, send documents for signature, track status, retrieve audit trails, and work with templates and library documents.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_agreement',
        description: 'Create a new agreement (document) in Adobe Sign and send it to one or more recipients for signing',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name/title of the agreement',
            },
            recipient_email: {
              type: 'string',
              description: 'Email address of the signer (for single-recipient agreements)',
            },
            recipient_emails: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of signer email addresses for multi-signer agreements (overrides recipient_email)',
            },
            transient_document_id: {
              type: 'string',
              description: 'Transient document ID from a prior file upload to use as the agreement document',
            },
            signing_type: {
              type: 'string',
              description: 'Signature type: ESIGN (electronic) or WRITTEN (wet ink) (default: ESIGN)',
            },
            state: {
              type: 'string',
              description: 'Initial state: IN_PROCESS (send immediately) or DRAFT (save for later) (default: IN_PROCESS)',
            },
            message: {
              type: 'string',
              description: 'Message to include in the signature request email (optional)',
            },
            cc_emails: {
              type: 'array',
              items: { type: 'string' },
              description: 'Email addresses to CC on the signature request (optional)',
            },
          },
          required: ['name', 'transient_document_id'],
        },
      },
      {
        name: 'get_agreement',
        description: 'Get the details, status, and metadata for a specific Adobe Sign agreement',
        inputSchema: {
          type: 'object',
          properties: {
            agreement_id: {
              type: 'string',
              description: 'Adobe Sign agreement ID',
            },
          },
          required: ['agreement_id'],
        },
      },
      {
        name: 'list_agreements',
        description: 'List agreements in the Adobe Sign account, with optional filters for status or date range',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of agreements to return per page (default: 20, max: 100)',
            },
            query: {
              type: 'string',
              description: 'Search query to filter agreements by name or participant email (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by agreement status: OUT_FOR_SIGNATURE, SIGNED, CANCELLED, EXPIRED, DRAFT, WAITING_FOR_REVIEW (optional)',
            },
            start_date: {
              type: 'string',
              description: 'Filter agreements created on or after this ISO 8601 date (optional)',
            },
            end_date: {
              type: 'string',
              description: 'Filter agreements created on or before this ISO 8601 date (optional)',
            },
          },
        },
      },
      {
        name: 'cancel_agreement',
        description: 'Cancel an in-flight Adobe Sign agreement that has not yet been fully signed',
        inputSchema: {
          type: 'object',
          properties: {
            agreement_id: {
              type: 'string',
              description: 'Adobe Sign agreement ID to cancel',
            },
            comment: {
              type: 'string',
              description: 'Reason for cancellation, included in notifications to participants (optional)',
            },
            notify_signer: {
              type: 'boolean',
              description: 'Send cancellation notification to the signer (default: false)',
            },
          },
          required: ['agreement_id'],
        },
      },
      {
        name: 'get_signing_url',
        description: 'Get the signing URL for a recipient to sign an agreement in-browser without email',
        inputSchema: {
          type: 'object',
          properties: {
            agreement_id: {
              type: 'string',
              description: 'Adobe Sign agreement ID',
            },
          },
          required: ['agreement_id'],
        },
      },
      {
        name: 'send_reminder',
        description: 'Send a reminder email to pending signers of an agreement',
        inputSchema: {
          type: 'object',
          properties: {
            agreement_id: {
              type: 'string',
              description: 'Adobe Sign agreement ID',
            },
            comment: {
              type: 'string',
              description: 'Custom message to include in the reminder email (optional)',
            },
            recipient_emails: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific recipient email addresses to remind (omit to remind all pending signers)',
            },
          },
          required: ['agreement_id'],
        },
      },
      {
        name: 'list_templates',
        description: 'List reusable document templates in the Adobe Sign account library',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of templates to return per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_template',
        description: 'Get details and metadata for a specific Adobe Sign document template',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'Adobe Sign library document (template) ID',
            },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'create_agreement_from_template',
        description: 'Create a new agreement using an existing Adobe Sign library document template',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: {
              type: 'string',
              description: 'Adobe Sign library document (template) ID to use',
            },
            name: {
              type: 'string',
              description: 'Name/title of the new agreement',
            },
            recipient_email: {
              type: 'string',
              description: 'Email address of the signer',
            },
            recipient_emails: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of signer email addresses for multi-signer agreements (overrides recipient_email)',
            },
            state: {
              type: 'string',
              description: 'Initial state: IN_PROCESS (send immediately) or DRAFT (default: IN_PROCESS)',
            },
            message: {
              type: 'string',
              description: 'Message to include in the signature request email (optional)',
            },
          },
          required: ['template_id', 'name'],
        },
      },
      {
        name: 'get_audit_trail',
        description: 'Get the audit trail PDF for a completed or in-progress agreement, showing all events and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            agreement_id: {
              type: 'string',
              description: 'Adobe Sign agreement ID',
            },
          },
          required: ['agreement_id'],
        },
      },
      {
        name: 'list_widgets',
        description: 'List web form widgets (embeddable signing experiences) in the Adobe Sign account',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of widgets to return per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_agreement_documents',
        description: 'List all documents (including signed final document) associated with an agreement',
        inputSchema: {
          type: 'object',
          properties: {
            agreement_id: {
              type: 'string',
              description: 'Adobe Sign agreement ID',
            },
          },
          required: ['agreement_id'],
        },
      },
      {
        name: 'download_document',
        description: 'Download the combined signed PDF for a completed agreement',
        inputSchema: {
          type: 'object',
          properties: {
            agreement_id: {
              type: 'string',
              description: 'Adobe Sign agreement ID',
            },
            document_id: {
              type: 'string',
              description: 'Specific document ID to download (omit to download the combined signed PDF)',
            },
          },
          required: ['agreement_id'],
        },
      },
      {
        name: 'list_library_documents',
        description: 'List all library documents (templates and forms) available in the Adobe Sign account',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of library documents to return per page (default: 20, max: 100)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_agreement':
          return this.createAgreement(args);
        case 'get_agreement':
          return this.getAgreement(args);
        case 'list_agreements':
          return this.listAgreements(args);
        case 'cancel_agreement':
          return this.cancelAgreement(args);
        case 'get_signing_url':
          return this.getSigningUrl(args);
        case 'send_reminder':
          return this.sendReminder(args);
        case 'list_templates':
          return this.listTemplates(args);
        case 'get_template':
          return this.getTemplate(args);
        case 'create_agreement_from_template':
          return this.createAgreementFromTemplate(args);
        case 'get_audit_trail':
          return this.getAuditTrail(args);
        case 'list_widgets':
          return this.listWidgets(args);
        case 'get_agreement_documents':
          return this.getAgreementDocuments(args);
        case 'download_document':
          return this.downloadDocument(args);
        case 'list_library_documents':
          return this.listLibraryDocuments(args);
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

  private authHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const result = text ? JSON.parse(text) : { success: true };
    return { content: [{ type: 'text', text: this.truncate(result) }], isError: false };
  }

  private buildPageParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.cursor) params.set('cursor', args.cursor as string);
    if (args.page_size) params.set('pageSize', String(args.page_size));
    return params;
  }

  private buildParticipantSets(recipientEmail: unknown, recipientEmails: unknown): Record<string, unknown>[] {
    const emails: string[] = Array.isArray(recipientEmails)
      ? (recipientEmails as string[])
      : recipientEmail
        ? [recipientEmail as string]
        : [];
    return emails.map((email, index) => ({
      memberInfos: [{ email }],
      order: index + 1,
      role: 'SIGNER',
    }));
  }

  private async createAgreement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.transient_document_id) {
      return { content: [{ type: 'text', text: 'name and transient_document_id are required' }], isError: true };
    }
    const participantSets = this.buildParticipantSets(args.recipient_email, args.recipient_emails);
    const body: Record<string, unknown> = {
      name: args.name,
      fileInfos: [{ transientDocumentId: args.transient_document_id }],
      participantSetsInfo: participantSets,
      signatureType: (args.signing_type as string) || 'ESIGN',
      state: (args.state as string) || 'IN_PROCESS',
    };
    if (args.message) body.message = args.message;
    if (args.cc_emails) {
      body.ccs = (args.cc_emails as string[]).map(email => ({ email }));
    }
    return this.apiPost('/api/rest/v6/agreements', body);
  }

  private async getAgreement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agreement_id) return { content: [{ type: 'text', text: 'agreement_id is required' }], isError: true };
    return this.apiGet(`/api/rest/v6/agreements/${encodeURIComponent(args.agreement_id as string)}`);
  }

  private async listAgreements(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    if (args.query) params.set('query', args.query as string);
    if (args.status) params.set('status', args.status as string);
    if (args.start_date) params.set('startDate', args.start_date as string);
    if (args.end_date) params.set('endDate', args.end_date as string);
    return this.apiGet(`/api/rest/v6/agreements?${params.toString()}`);
  }

  private async cancelAgreement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agreement_id) return { content: [{ type: 'text', text: 'agreement_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      value: 'CANCEL',
    };
    if (args.comment) body.comment = args.comment;
    if (args.notify_signer !== undefined) body.notifySigner = args.notify_signer;
    return this.apiPut(`/api/rest/v6/agreements/${encodeURIComponent(args.agreement_id as string)}/state`, body);
  }

  private async getSigningUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agreement_id) return { content: [{ type: 'text', text: 'agreement_id is required' }], isError: true };
    return this.apiGet(`/api/rest/v6/agreements/${encodeURIComponent(args.agreement_id as string)}/signingUrls`);
  }

  private async sendReminder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agreement_id) return { content: [{ type: 'text', text: 'agreement_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      agreementId: args.agreement_id,
      status: 'ACTIVE',
    };
    if (args.comment) body.note = args.comment;
    if (Array.isArray(args.recipient_emails) && args.recipient_emails.length > 0) {
      body.recipientParticipantIds = args.recipient_emails;
    }
    return this.apiPost('/api/rest/v6/reminders', body);
  }

  private async listTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    return this.apiGet(`/api/rest/v6/libraryDocuments?${params.toString()}`);
  }

  private async getTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_id) return { content: [{ type: 'text', text: 'template_id is required' }], isError: true };
    return this.apiGet(`/api/rest/v6/libraryDocuments/${encodeURIComponent(args.template_id as string)}`);
  }

  private async createAgreementFromTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_id || !args.name) {
      return { content: [{ type: 'text', text: 'template_id and name are required' }], isError: true };
    }
    const participantSets = this.buildParticipantSets(args.recipient_email, args.recipient_emails);
    const body: Record<string, unknown> = {
      name: args.name,
      fileInfos: [{ libraryDocumentId: args.template_id }],
      participantSetsInfo: participantSets,
      signatureType: 'ESIGN',
      state: (args.state as string) || 'IN_PROCESS',
    };
    if (args.message) body.message = args.message;
    return this.apiPost('/api/rest/v6/agreements', body);
  }

  private async getAuditTrail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agreement_id) return { content: [{ type: 'text', text: 'agreement_id is required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/api/rest/v6/agreements/${encodeURIComponent(args.agreement_id as string)}/auditTrail`,
      { headers: this.authHeaders() },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // Audit trail returns a PDF — return metadata about it rather than raw binary
    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length') || 'unknown';
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          audit_trail_url: `${this.baseUrl}/api/rest/v6/agreements/${args.agreement_id}/auditTrail`,
          content_type: contentType,
          size_bytes: contentLength,
          note: 'Audit trail is a PDF. Use the URL with a Bearer token to download the binary.',
        }, null, 2),
      }],
      isError: false,
    };
  }

  private async listWidgets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    return this.apiGet(`/api/rest/v6/widgets?${params.toString()}`);
  }

  private async getAgreementDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agreement_id) return { content: [{ type: 'text', text: 'agreement_id is required' }], isError: true };
    return this.apiGet(`/api/rest/v6/agreements/${encodeURIComponent(args.agreement_id as string)}/documents`);
  }

  private async downloadDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.agreement_id) return { content: [{ type: 'text', text: 'agreement_id is required' }], isError: true };
    const agreementId = encodeURIComponent(args.agreement_id as string);
    const path = args.document_id
      ? `/api/rest/v6/agreements/${agreementId}/documents/${encodeURIComponent(args.document_id as string)}`
      : `/api/rest/v6/agreements/${agreementId}/combinedDocument`;
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length') || 'unknown';
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          download_url: `${this.baseUrl}${path}`,
          content_type: contentType,
          size_bytes: contentLength,
          note: 'Document is a PDF binary. Use the download_url with a Bearer token Authorization header to retrieve it.',
        }, null, 2),
      }],
      isError: false,
    };
  }

  private async listLibraryDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPageParams(args);
    return this.apiGet(`/api/rest/v6/libraryDocuments?${params.toString()}`);
  }
}
