/**
 * Persona MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official MCP server from Persona (withpersona.com) found on GitHub or npm.
// The github.com/withpersona org does not publish an MCP server.
// Community forks exist (e.g. anton-pt/persona-mcp) but they manage AI personas in Notion, not Persona identity verification.
//
// Base URL: https://api.withpersona.com/api/v1
// Auth: Bearer token — use production key (persona_production_...) or sandbox key (persona_sandbox_...)
//   Pass as: Authorization: Bearer <api_key>
//   Also include: Persona-Version header (API version date, e.g. 2023-01-05)
// Docs: https://docs.withpersona.com/api-introduction
// Rate limits: Not publicly documented; Persona returns HTTP 429 on limit breach

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PersonaConfig {
  apiKey: string;
  apiVersion?: string;  // e.g. "2023-01-05" — defaults to current stable
  baseUrl?: string;
}

export class PersonaMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;

  constructor(config: PersonaConfig) {
    super();
    this.apiKey = config.apiKey;
    this.apiVersion = config.apiVersion || '2023-01-05';
    this.baseUrl = config.baseUrl || 'https://api.withpersona.com/api/v1';
  }

  static catalog() {
    return {
      name: 'persona',
      displayName: 'Persona',
      version: '1.0.0',
      category: 'identity',
      keywords: [
        'persona', 'identity verification', 'kyc', 'know your customer', 'aml',
        'id verification', 'government id', 'liveness', 'biometric', 'inquiry',
        'verification', 'compliance', 'onboarding', 'fraud prevention',
      ],
      toolNames: [
        'list_inquiries', 'get_inquiry', 'create_inquiry', 'resume_inquiry',
        'approve_inquiry', 'decline_inquiry', 'redact_inquiry',
        'list_accounts', 'get_account', 'create_account', 'merge_accounts', 'redact_account',
        'list_verifications', 'get_verification',
        'list_reports', 'get_report',
        'list_cases', 'get_case',
      ],
      description: 'Persona identity verification: manage identity inquiries, accounts, verifications, compliance reports, and fraud cases for KYC/AML onboarding workflows.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_inquiries',
        description: 'List identity verification inquiries with optional filters for status, reference ID, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: created, pending, completed, failed, expired, needs_review, approved, declined (default: all)',
            },
            reference_id: {
              type: 'string',
              description: 'Filter by your internal reference ID',
            },
            account_id: {
              type: 'string',
              description: 'Filter inquiries by account ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 10, max: 100)',
            },
            page_after: {
              type: 'string',
              description: 'Pagination cursor — ID of the last item from the previous page',
            },
          },
        },
      },
      {
        name: 'get_inquiry',
        description: 'Get full details for a specific identity verification inquiry by inquiry ID including verification results',
        inputSchema: {
          type: 'object',
          properties: {
            inquiry_id: {
              type: 'string',
              description: 'Persona inquiry ID (e.g. inq_xxxxxxxxxxxx)',
            },
          },
          required: ['inquiry_id'],
        },
      },
      {
        name: 'create_inquiry',
        description: 'Create a new identity verification inquiry for a user — returns an inquiry ID and session token to embed the Persona flow',
        inputSchema: {
          type: 'object',
          properties: {
            inquiry_template_id: {
              type: 'string',
              description: 'Persona inquiry template ID (e.g. itmpl_xxxxxxxxxxxx) defining verification flow',
            },
            reference_id: {
              type: 'string',
              description: 'Your internal user or applicant identifier to correlate with this inquiry',
            },
            account_id: {
              type: 'string',
              description: 'Existing Persona account ID to associate the inquiry with (optional)',
            },
            fields: {
              type: 'string',
              description: 'JSON object string of prefill fields (e.g. {"name.first":"Jane","name.last":"Doe","email_address":"jane@example.com"})',
            },
          },
          required: ['inquiry_template_id'],
        },
      },
      {
        name: 'resume_inquiry',
        description: 'Generate a new session token to resume an incomplete inquiry for the same user',
        inputSchema: {
          type: 'object',
          properties: {
            inquiry_id: {
              type: 'string',
              description: 'Inquiry ID to resume',
            },
          },
          required: ['inquiry_id'],
        },
      },
      {
        name: 'approve_inquiry',
        description: 'Manually approve an inquiry that is in needs_review or pending status',
        inputSchema: {
          type: 'object',
          properties: {
            inquiry_id: {
              type: 'string',
              description: 'Inquiry ID to approve',
            },
            comment: {
              type: 'string',
              description: 'Internal review comment (optional)',
            },
          },
          required: ['inquiry_id'],
        },
      },
      {
        name: 'decline_inquiry',
        description: 'Manually decline an inquiry that is in needs_review or pending status',
        inputSchema: {
          type: 'object',
          properties: {
            inquiry_id: {
              type: 'string',
              description: 'Inquiry ID to decline',
            },
            comment: {
              type: 'string',
              description: 'Reason for declining (optional, for internal records)',
            },
          },
          required: ['inquiry_id'],
        },
      },
      {
        name: 'redact_inquiry',
        description: 'Redact all PII from an inquiry to comply with data deletion requests — this is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            inquiry_id: {
              type: 'string',
              description: 'Inquiry ID to redact',
            },
          },
          required: ['inquiry_id'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List Persona accounts with optional reference ID filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            reference_id: {
              type: 'string',
              description: 'Filter by your internal reference ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 10, max: 100)',
            },
            page_after: {
              type: 'string',
              description: 'Pagination cursor from previous response',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get full profile for a Persona account including consolidated identity attributes and verification history',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Persona account ID (e.g. act_xxxxxxxxxxxx)',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'create_account',
        description: 'Create a new Persona account to represent a user entity across multiple inquiries',
        inputSchema: {
          type: 'object',
          properties: {
            reference_id: {
              type: 'string',
              description: 'Your internal user identifier to link to this account',
            },
            fields: {
              type: 'string',
              description: 'JSON object string of account attributes (e.g. {"name.first":"Jane","email_address":"jane@example.com"})',
            },
          },
        },
      },
      {
        name: 'merge_accounts',
        description: 'Merge a source account into a target account — combines verification history and attributes',
        inputSchema: {
          type: 'object',
          properties: {
            target_account_id: {
              type: 'string',
              description: 'Account ID to merge into (the surviving account)',
            },
            source_account_id: {
              type: 'string',
              description: 'Account ID to merge from (will be deleted after merge)',
            },
          },
          required: ['target_account_id', 'source_account_id'],
        },
      },
      {
        name: 'redact_account',
        description: 'Redact all PII from a Persona account for GDPR/CCPA compliance — irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Account ID to redact',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_verifications',
        description: 'List individual verification results (government ID, selfie, database) for an inquiry',
        inputSchema: {
          type: 'object',
          properties: {
            inquiry_id: {
              type: 'string',
              description: 'Inquiry ID to list verifications for',
            },
            page_size: {
              type: 'number',
              description: 'Number of results (default: 10, max: 100)',
            },
          },
          required: ['inquiry_id'],
        },
      },
      {
        name: 'get_verification',
        description: 'Get detailed result for a specific verification including extracted data, checks, and confidence scores',
        inputSchema: {
          type: 'object',
          properties: {
            verification_id: {
              type: 'string',
              description: 'Verification ID (e.g. ver_xxxxxxxxxxxx)',
            },
          },
          required: ['verification_id'],
        },
      },
      {
        name: 'list_reports',
        description: 'List compliance and background check reports generated for an account or inquiry',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Account ID to list reports for',
            },
            report_type: {
              type: 'string',
              description: 'Filter by report type (e.g. report/watchlist, report/adverse-media, report/address-lookup)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results (default: 10, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_report',
        description: 'Get full details for a specific compliance report including matched entries and risk signals',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'Persona report ID (e.g. rep_xxxxxxxxxxxx)',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'list_cases',
        description: 'List fraud or compliance cases with optional status and assignee filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: open, resolved (default: open)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results (default: 10, max: 100)',
            },
            page_after: {
              type: 'string',
              description: 'Pagination cursor from previous response',
            },
          },
        },
      },
      {
        name: 'get_case',
        description: 'Get full details for a specific fraud or compliance case including events and linked objects',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'string',
              description: 'Persona case ID (e.g. case_xxxxxxxxxxxx)',
            },
          },
          required: ['case_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_inquiries':
          return this.listInquiries(args);
        case 'get_inquiry':
          return this.getInquiry(args);
        case 'create_inquiry':
          return this.createInquiry(args);
        case 'resume_inquiry':
          return this.resumeInquiry(args);
        case 'approve_inquiry':
          return this.approveInquiry(args);
        case 'decline_inquiry':
          return this.declineInquiry(args);
        case 'redact_inquiry':
          return this.redactInquiry(args);
        case 'list_accounts':
          return this.listAccounts(args);
        case 'get_account':
          return this.getAccount(args);
        case 'create_account':
          return this.createAccount(args);
        case 'merge_accounts':
          return this.mergeAccounts(args);
        case 'redact_account':
          return this.redactAccount(args);
        case 'list_verifications':
          return this.listVerifications(args);
        case 'get_verification':
          return this.getVerification(args);
        case 'list_reports':
          return this.listReports(args);
        case 'get_report':
          return this.getReport(args);
        case 'list_cases':
          return this.listCases(args);
        case 'get_case':
          return this.getCase(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Persona-Version': this.apiVersion,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listInquiries(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[size]': String((args.page_size as number) ?? 10),
    };
    if (args.status) params['filter[status]'] = args.status as string;
    if (args.reference_id) params['filter[reference-id]'] = args.reference_id as string;
    if (args.account_id) params['filter[account-id]'] = args.account_id as string;
    if (args.page_after) params['page[after]'] = args.page_after as string;
    return this.apiGet('/inquiries', params);
  }

  private async getInquiry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.inquiry_id) return { content: [{ type: 'text', text: 'inquiry_id is required' }], isError: true };
    return this.apiGet(`/inquiries/${encodeURIComponent(args.inquiry_id as string)}`);
  }

  private async createInquiry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.inquiry_template_id) {
      return { content: [{ type: 'text', text: 'inquiry_template_id is required' }], isError: true };
    }
    const attributes: Record<string, unknown> = {
      'inquiry-template-id': args.inquiry_template_id,
    };
    if (args.reference_id) attributes['reference-id'] = args.reference_id;
    if (args.account_id) attributes['account-id'] = args.account_id;
    if (args.fields) {
      try {
        attributes.fields = JSON.parse(args.fields as string);
      } catch {
        return { content: [{ type: 'text', text: 'fields must be valid JSON' }], isError: true };
      }
    }
    return this.apiPost('/inquiries', { data: { type: 'inquiry', attributes } });
  }

  private async resumeInquiry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.inquiry_id) return { content: [{ type: 'text', text: 'inquiry_id is required' }], isError: true };
    return this.apiPost(`/inquiries/${encodeURIComponent(args.inquiry_id as string)}/resume`, {});
  }

  private async approveInquiry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.inquiry_id) return { content: [{ type: 'text', text: 'inquiry_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.comment) body.data = { attributes: { comment: args.comment } };
    return this.apiPost(`/inquiries/${encodeURIComponent(args.inquiry_id as string)}/approve`, body);
  }

  private async declineInquiry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.inquiry_id) return { content: [{ type: 'text', text: 'inquiry_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.comment) body.data = { attributes: { comment: args.comment } };
    return this.apiPost(`/inquiries/${encodeURIComponent(args.inquiry_id as string)}/decline`, body);
  }

  private async redactInquiry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.inquiry_id) return { content: [{ type: 'text', text: 'inquiry_id is required' }], isError: true };
    return this.apiDelete(`/inquiries/${encodeURIComponent(args.inquiry_id as string)}`);
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[size]': String((args.page_size as number) ?? 10),
    };
    if (args.reference_id) params['filter[reference-id]'] = args.reference_id as string;
    if (args.page_after) params['page[after]'] = args.page_after as string;
    return this.apiGet('/accounts', params);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.apiGet(`/accounts/${encodeURIComponent(args.account_id as string)}`);
  }

  private async createAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const attributes: Record<string, unknown> = {};
    if (args.reference_id) attributes['reference-id'] = args.reference_id;
    if (args.fields) {
      try {
        attributes.fields = JSON.parse(args.fields as string);
      } catch {
        return { content: [{ type: 'text', text: 'fields must be valid JSON' }], isError: true };
      }
    }
    return this.apiPost('/accounts', { data: { type: 'account', attributes } });
  }

  private async mergeAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.target_account_id || !args.source_account_id) {
      return { content: [{ type: 'text', text: 'target_account_id and source_account_id are required' }], isError: true };
    }
    return this.apiPost(`/accounts/${encodeURIComponent(args.target_account_id as string)}/merge`, {
      data: { type: 'account', id: args.source_account_id },
    });
  }

  private async redactAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.apiDelete(`/accounts/${encodeURIComponent(args.account_id as string)}`);
  }

  private async listVerifications(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.inquiry_id) return { content: [{ type: 'text', text: 'inquiry_id is required' }], isError: true };
    const params: Record<string, string> = {
      'filter[inquiry-id]': args.inquiry_id as string,
      'page[size]': String((args.page_size as number) ?? 10),
    };
    return this.apiGet('/verifications', params);
  }

  private async getVerification(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.verification_id) return { content: [{ type: 'text', text: 'verification_id is required' }], isError: true };
    return this.apiGet(`/verifications/${encodeURIComponent(args.verification_id as string)}`);
  }

  private async listReports(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[size]': String((args.page_size as number) ?? 10),
    };
    if (args.account_id) params['filter[account-id]'] = args.account_id as string;
    if (args.report_type) params['filter[report-type]'] = args.report_type as string;
    return this.apiGet('/reports', params);
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.report_id) return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    return this.apiGet(`/reports/${encodeURIComponent(args.report_id as string)}`);
  }

  private async listCases(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      'page[size]': String((args.page_size as number) ?? 10),
    };
    if (args.status) params['filter[status]'] = args.status as string;
    if (args.page_after) params['page[after]'] = args.page_after as string;
    return this.apiGet('/cases', params);
  }

  private async getCase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.case_id) return { content: [{ type: 'text', text: 'case_id is required' }], isError: true };
    return this.apiGet(`/cases/${encodeURIComponent(args.case_id as string)}`);
  }
}
