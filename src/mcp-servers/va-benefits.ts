/**
 * VA Benefits Intake MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official VA.gov Benefits Intake MCP server was found on GitHub. We build a full REST wrapper
// for digitally submitting VA benefits claim documents for Veterans Service Organizations (VSOs),
// agencies, and Veterans directly to the VBA claims intake process.
//
// Base URL: https://api.va.gov/services/vba_documents/v1
// Sandbox:  https://sandbox-api.va.gov/services/vba_documents/v1
// Auth: API key in header "apikey" — request at https://developer.va.gov/apply
// Docs: https://developer.va.gov/explore/api/benefits-intake
// Spec: https://api.apis.guru/v2/specs/va.gov/benefits/1.0.0/openapi.json
// Category: government
// Rate limits: Not publicly documented; standard retry backoff recommended
//
// Supported claim types: Compensation, Pension/Survivors Benefits, Education, Fiduciary,
//   Insurance, Veteran Readiness & Employment (VRE), Board of Veteran Appeals (BVA)
//
// Upload flow:
//   1. POST /uploads  -> returns guid + presigned S3 location URL (valid 15 min)
//   2. PUT  {location} -> multipart/form-data with PDF + attachments + metadata JSON
//   3. GET  /uploads/{guid} -> poll for status (pending/uploaded/received/processing/success/vbms/error/expired)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VABenefitsConfig {
  apiKey: string;
  sandbox?: boolean;
  baseUrl?: string;
}

export class VABenefitsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: VABenefitsConfig) {
    super();
    this.apiKey = config.apiKey;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    } else if (config.sandbox) {
      this.baseUrl = 'https://sandbox-api.va.gov/services/vba_documents/v1';
    } else {
      this.baseUrl = 'https://api.va.gov/services/vba_documents/v1';
    }
  }

  static catalog() {
    return {
      name: 'va-benefits',
      displayName: 'VA Benefits Intake',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'va', 'veterans affairs', 'benefits', 'vba', 'claims', 'intake',
        'compensation', 'pension', 'education', 'insurance', 'fiduciary',
        'veteran', 'vso', 'disability', 'service-connected', 'upload',
        'document submission', 'pdf', 'claim status', 'vbms', 'efolder',
        'government', 'federal', 'vre', 'board of veterans appeals', 'bva',
      ],
      toolNames: [
        'get_upload_location',
        'get_upload_status',
        'get_bulk_upload_status',
        'validate_document',
        'download_submission',
      ],
      description: 'VA Benefits Intake API: digitally submit VA benefits claim documents (PDFs) for Veterans directly to VBA claims intake, and track submission status through the processing pipeline.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_upload_location',
        description: 'Initiate a VA benefits document submission. Returns a unique submission GUID and a presigned S3 upload location URL valid for 15 minutes. Use the returned location URL to PUT the actual PDF document package in the next step.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_upload_status',
        description: 'Get the current processing status of a previously submitted VA benefits document package by its GUID. Status values: pending (no document yet), uploaded (received, not yet validated), received (VA has it, date of receipt established), processing (being validated and routed), success (in VA mail handling system), vbms (loaded into Veteran eFolder), error (failed — check error details), expired (upload window missed).',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Submission GUID returned by get_upload_location',
            },
            statusOverride: {
              type: 'string',
              description: 'Sandbox only: override status to simulate processing stages. Values: pending, uploaded, received, processing, success, vbms, error',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_bulk_upload_status',
        description: 'Get a bulk status report for multiple VA benefits document submissions. Returns cached status data (updated hourly). Use get_upload_status for real-time status on a specific GUID.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of submission GUIDs to check status for',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'validate_document',
        description: 'Validate a PDF document against VA system file requirements before submitting it. Checks: valid PDF format, no user password, file size under 100 MB, page size under 21x21 inches. Use this before uploading to catch errors early.',
        inputSchema: {
          type: 'object',
          properties: {
            documentBase64: {
              type: 'string',
              description: 'Base64-encoded PDF document content to validate',
            },
          },
          required: ['documentBase64'],
        },
      },
      {
        name: 'download_submission',
        description: 'Download a zip archive of the submitted document package as processed by the VA server. Useful for verifying what was received and debugging submission issues.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Submission GUID to download',
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
        case 'get_upload_location':  return this.getUploadLocation();
        case 'get_upload_status':    return this.getUploadStatus(args);
        case 'get_bulk_upload_status': return this.getBulkUploadStatus(args);
        case 'validate_document':    return this.validateDocument(args);
        case 'download_submission':  return this.downloadSubmission(args);
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

  // -- Private helpers -------------------------------------------------------


  private async request(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body?: Record<string, unknown>,
    extraHeaders?: Record<string, string>,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      apikey: this.apiKey,
      Accept: 'application/json',
      ...extraHeaders,
    };
    const init: RequestInit = { method, headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('zip') || contentType.includes('octet-stream')) {
      return { content: [{ type: 'text', text: `Binary download: ${response.headers.get('content-length') || 'unknown'} bytes. Use the location URL to download directly.` }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // -- Tool implementations --------------------------------------------------

  private async getUploadLocation(): Promise<ToolResult> {
    return this.request('POST', '/uploads');
  }

  private async getUploadStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const extraHeaders: Record<string, string> = {};
    if (args.statusOverride) {
      extraHeaders['Status-Override'] = args.statusOverride as string;
    }
    return this.request('GET', `/uploads/${encodeURIComponent(args.id as string)}`, undefined, extraHeaders);
  }

  private async getBulkUploadStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ids || !Array.isArray(args.ids) || args.ids.length === 0) {
      return { content: [{ type: 'text', text: 'ids array is required' }], isError: true };
    }
    return this.request('POST', '/uploads/report', { ids: args.ids });
  }

  private async validateDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.documentBase64) {
      return { content: [{ type: 'text', text: 'documentBase64 is required' }], isError: true };
    }
    // The validate endpoint expects a raw PDF upload; we pass the base64 value
    // as the document field for API consumers that have already encoded the PDF.
    return this.request('POST', '/uploads/validate_document', { document: args.documentBase64 });
  }

  private async downloadSubmission(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/uploads/${encodeURIComponent(args.id as string)}/download`);
  }
}
