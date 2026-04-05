/**
 * Onfido MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Onfido (now Entrust Identity Verification) MCP server was found on GitHub.
// Onfido publishes official client SDKs (Python, PHP, Java, Node) but no MCP server.
// Our adapter covers: 22 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official MCP exists.
//
// Base URL: https://api.eu.onfido.com/v3.6  (EU region — default)
//   US region: https://api.us.onfido.com/v3.6
//   CA region: https://api.ca.onfido.com/v3.6
//   Note: api.onfido.com was deprecated in API v3.6; always use region-specific URLs.
// Auth: API token in Authorization header as "Token token=<API_TOKEN>"
//   Tokens are generated in the Onfido Dashboard under Developer Tools > API Tokens
// Docs: https://documentation.identity.entrust.com/api/latest/index.html
// Rate limits: Not publicly documented; use exponential backoff on 429 responses

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OnfidoConfig {
  apiToken: string;
  baseUrl?: string;
}

export class OnfidoMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: OnfidoConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl || 'https://api.eu.onfido.com/v3.6').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'onfido',
      displayName: 'Onfido',
      version: '1.0.0',
      category: 'identity',
      keywords: [
        'onfido', 'entrust', 'identity', 'verification', 'kyc', 'know-your-customer',
        'document', 'passport', 'id-check', 'biometric', 'face', 'liveness',
        'applicant', 'check', 'report', 'workflow', 'sdk-token', 'watchlist',
      ],
      toolNames: [
        'create_applicant', 'get_applicant', 'list_applicants', 'update_applicant', 'delete_applicant',
        'generate_sdk_token',
        'list_documents', 'get_document',
        'create_check', 'get_check', 'list_checks', 'resume_check',
        'list_reports', 'get_report', 'resume_report', 'cancel_report',
        'create_workflow_run', 'get_workflow_run', 'list_workflow_runs',
        'list_webhooks', 'create_webhook', 'delete_webhook',
      ],
      description: 'Onfido identity verification (KYC): create applicants, run document and biometric checks, manage workflow runs, retrieve reports, and configure webhooks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_applicant',
        description: 'Create a new Onfido applicant record — required before any document upload or check',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: "Applicant's first (given) name",
            },
            last_name: {
              type: 'string',
              description: "Applicant's last (family) name",
            },
            email: {
              type: 'string',
              description: "Applicant's email address (optional but recommended)",
            },
            dob: {
              type: 'string',
              description: "Date of birth in YYYY-MM-DD format (optional)",
            },
            country: {
              type: 'string',
              description: "Applicant's country of residence as ISO 3166-1 alpha-3 code (e.g. GBR, USA)",
            },
          },
          required: ['first_name', 'last_name'],
        },
      },
      {
        name: 'get_applicant',
        description: 'Retrieve details of a specific Onfido applicant by their applicant ID',
        inputSchema: {
          type: 'object',
          properties: {
            applicant_id: {
              type: 'string',
              description: 'Onfido applicant UUID',
            },
          },
          required: ['applicant_id'],
        },
      },
      {
        name: 'list_applicants',
        description: 'List all applicants in the account with optional pagination and include-deleted filter',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
            include_deleted: {
              type: 'boolean',
              description: 'Include soft-deleted applicants in results (default: false)',
            },
          },
        },
      },
      {
        name: 'update_applicant',
        description: "Update an applicant's personal details such as name, email, or date of birth",
        inputSchema: {
          type: 'object',
          properties: {
            applicant_id: {
              type: 'string',
              description: 'Onfido applicant UUID to update',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name',
            },
            email: {
              type: 'string',
              description: 'Updated email address',
            },
            dob: {
              type: 'string',
              description: 'Updated date of birth in YYYY-MM-DD format',
            },
          },
          required: ['applicant_id'],
        },
      },
      {
        name: 'delete_applicant',
        description: 'Soft-delete an Onfido applicant and all their associated documents and checks (GDPR erasure)',
        inputSchema: {
          type: 'object',
          properties: {
            applicant_id: {
              type: 'string',
              description: 'Onfido applicant UUID to delete',
            },
          },
          required: ['applicant_id'],
        },
      },
      {
        name: 'generate_sdk_token',
        description: 'Generate a short-lived SDK token (90 min) for an applicant to use with the Onfido Web or Mobile SDK',
        inputSchema: {
          type: 'object',
          properties: {
            applicant_id: {
              type: 'string',
              description: 'Applicant UUID the token is scoped to',
            },
            referrer: {
              type: 'string',
              description: 'Allowed referrer URL pattern for web SDK tokens (e.g. https://yourapp.com/*)',
            },
            application_id: {
              type: 'string',
              description: 'Mobile app bundle ID for iOS/Android SDK tokens (e.g. com.example.app)',
            },
          },
          required: ['applicant_id'],
        },
      },
      {
        name: 'list_documents',
        description: 'List all documents uploaded for a specific applicant',
        inputSchema: {
          type: 'object',
          properties: {
            applicant_id: {
              type: 'string',
              description: 'Applicant UUID to list documents for',
            },
          },
          required: ['applicant_id'],
        },
      },
      {
        name: 'get_document',
        description: 'Get metadata for a specific document uploaded to an applicant record',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'string',
              description: 'Document UUID',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'create_check',
        description: 'Create an identity check for an applicant — triggers selected report types (document, facial_similarity, watchlist, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            applicant_id: {
              type: 'string',
              description: 'Applicant UUID to run the check on',
            },
            report_names: {
              type: 'string',
              description: 'Comma-separated report types: document, facial_similarity_photo, facial_similarity_video, known_faces, right_to_work, watchlist_standard, watchlist_enhanced',
            },
            document_ids: {
              type: 'string',
              description: 'Comma-separated document UUIDs to include in the check (optional — uses all applicant documents if omitted)',
            },
            consider: {
              type: 'string',
              description: 'Comma-separated report names to be treated as pending (forces manual review)',
            },
          },
          required: ['applicant_id', 'report_names'],
        },
      },
      {
        name: 'get_check',
        description: 'Retrieve the status and result of a specific Onfido check by its check ID',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'Check UUID',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'list_checks',
        description: 'List all checks for a specific applicant with their status and results',
        inputSchema: {
          type: 'object',
          properties: {
            applicant_id: {
              type: 'string',
              description: 'Applicant UUID to list checks for',
            },
          },
          required: ['applicant_id'],
        },
      },
      {
        name: 'resume_check',
        description: 'Resume a paused check — used when a check is in the paused state awaiting additional input',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'Check UUID to resume',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'list_reports',
        description: 'List all reports belonging to a specific check with their result and breakdown',
        inputSchema: {
          type: 'object',
          properties: {
            check_id: {
              type: 'string',
              description: 'Check UUID to list reports for',
            },
          },
          required: ['check_id'],
        },
      },
      {
        name: 'get_report',
        description: 'Get full details of a specific report including breakdown, result, and sub-results',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'Report UUID',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'resume_report',
        description: 'Resume a paused report that is awaiting additional data or manual review input',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'Report UUID to resume',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'cancel_report',
        description: 'Cancel an in-progress report — sets its status to cancelled and halts processing',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'Report UUID to cancel',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'create_workflow_run',
        description: 'Start a Workflow Run — initiates an identity verification workflow for a specific applicant using a configured workflow',
        inputSchema: {
          type: 'object',
          properties: {
            applicant_id: {
              type: 'string',
              description: 'Applicant UUID to run the workflow for',
            },
            workflow_id: {
              type: 'string',
              description: 'Workflow UUID from your Onfido Dashboard Studio configuration',
            },
            custom_data: {
              type: 'string',
              description: 'JSON-encoded custom data object to pass into the workflow as key-value pairs',
            },
          },
          required: ['applicant_id', 'workflow_id'],
        },
      },
      {
        name: 'get_workflow_run',
        description: 'Get the current status and output of a specific workflow run',
        inputSchema: {
          type: 'object',
          properties: {
            workflow_run_id: {
              type: 'string',
              description: 'Workflow run UUID',
            },
          },
          required: ['workflow_run_id'],
        },
      },
      {
        name: 'list_workflow_runs',
        description: 'List workflow runs with optional filters for status and applicant',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: processing, awaiting_input, approved, declined, review, abandoned, error',
            },
            applicant_id: {
              type: 'string',
              description: 'Filter by applicant UUID',
            },
          },
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all configured webhooks for the Onfido account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_webhook',
        description: 'Register a new webhook endpoint to receive Onfido event notifications (check completion, report updates)',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'HTTPS URL to receive webhook POST requests',
            },
            events: {
              type: 'string',
              description: 'Comma-separated event types to subscribe to: check.completed, report.completed, workflow_run.completed, etc. (omit to subscribe to all events)',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the webhook is active on creation (default: true)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook endpoint from the Onfido account by its webhook ID',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'Webhook UUID to delete',
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
        case 'create_applicant':
          return this.createApplicant(args);
        case 'get_applicant':
          return this.getApplicant(args);
        case 'list_applicants':
          return this.listApplicants(args);
        case 'update_applicant':
          return this.updateApplicant(args);
        case 'delete_applicant':
          return this.deleteApplicant(args);
        case 'generate_sdk_token':
          return this.generateSdkToken(args);
        case 'list_documents':
          return this.listDocuments(args);
        case 'get_document':
          return this.getDocument(args);
        case 'create_check':
          return this.createCheck(args);
        case 'get_check':
          return this.getCheck(args);
        case 'list_checks':
          return this.listChecks(args);
        case 'resume_check':
          return this.resumeCheck(args);
        case 'list_reports':
          return this.listReports(args);
        case 'get_report':
          return this.getReport(args);
        case 'resume_report':
          return this.resumeReport(args);
        case 'cancel_report':
          return this.cancelReport(args);
        case 'create_workflow_run':
          return this.createWorkflowRun(args);
        case 'get_workflow_run':
          return this.getWorkflowRun(args);
        case 'list_workflow_runs':
          return this.listWorkflowRuns(args);
        case 'list_webhooks':
          return this.listWebhooks();
        case 'create_webhook':
          return this.createWebhook(args);
        case 'delete_webhook':
          return this.deleteWebhook(args);
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
      Authorization: `Token token=${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${text}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async postAction(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async createApplicant(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name) return { content: [{ type: 'text', text: 'first_name and last_name are required' }], isError: true };
    const body: Record<string, unknown> = { first_name: args.first_name, last_name: args.last_name };
    if (args.email) body.email = args.email;
    if (args.dob) body.dob = args.dob;
    if (args.country) body.location = { country_of_residence: args.country };
    return this.post('/applicants', body);
  }

  private async getApplicant(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.applicant_id) return { content: [{ type: 'text', text: 'applicant_id is required' }], isError: true };
    return this.get(`/applicants/${encodeURIComponent(args.applicant_id as string)}`);
  }

  private async listApplicants(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    };
    if (typeof args.include_deleted === 'boolean') params.include_deleted = String(args.include_deleted);
    return this.get('/applicants', params);
  }

  private async updateApplicant(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.applicant_id) return { content: [{ type: 'text', text: 'applicant_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.first_name) body.first_name = args.first_name;
    if (args.last_name) body.last_name = args.last_name;
    if (args.email) body.email = args.email;
    if (args.dob) body.dob = args.dob;
    return this.put(`/applicants/${encodeURIComponent(args.applicant_id as string)}`, body);
  }

  private async deleteApplicant(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.applicant_id) return { content: [{ type: 'text', text: 'applicant_id is required' }], isError: true };
    return this.del(`/applicants/${encodeURIComponent(args.applicant_id as string)}`);
  }

  private async generateSdkToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.applicant_id) return { content: [{ type: 'text', text: 'applicant_id is required' }], isError: true };
    const body: Record<string, unknown> = { applicant_id: args.applicant_id };
    if (args.referrer) body.referrer = args.referrer;
    if (args.application_id) body.application_id = args.application_id;
    return this.post('/sdk_token', body);
  }

  private async listDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.applicant_id) return { content: [{ type: 'text', text: 'applicant_id is required' }], isError: true };
    return this.get('/documents', { applicant_id: args.applicant_id as string });
  }

  private async getDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.document_id) return { content: [{ type: 'text', text: 'document_id is required' }], isError: true };
    return this.get(`/documents/${encodeURIComponent(args.document_id as string)}`);
  }

  private async createCheck(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.applicant_id || !args.report_names) return { content: [{ type: 'text', text: 'applicant_id and report_names are required' }], isError: true };
    const reportNames = (args.report_names as string).split(',').map((r: string) => r.trim());
    const body: Record<string, unknown> = { applicant_id: args.applicant_id, report_names: reportNames };
    if (args.document_ids) {
      body.document_ids = (args.document_ids as string).split(',').map((d: string) => d.trim());
    }
    if (args.consider) {
      body.consider = (args.consider as string).split(',').map((c: string) => c.trim());
    }
    return this.post('/checks', body);
  }

  private async getCheck(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.check_id) return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    return this.get(`/checks/${encodeURIComponent(args.check_id as string)}`);
  }

  private async listChecks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.applicant_id) return { content: [{ type: 'text', text: 'applicant_id is required' }], isError: true };
    return this.get('/checks', { applicant_id: args.applicant_id as string });
  }

  private async resumeCheck(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.check_id) return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    return this.postAction(`/checks/${encodeURIComponent(args.check_id as string)}/resume`);
  }

  private async listReports(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.check_id) return { content: [{ type: 'text', text: 'check_id is required' }], isError: true };
    return this.get(`/checks/${encodeURIComponent(args.check_id as string)}/reports`);
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.report_id) return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    return this.get(`/reports/${encodeURIComponent(args.report_id as string)}`);
  }

  private async resumeReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.report_id) return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    return this.postAction(`/reports/${encodeURIComponent(args.report_id as string)}/resume`);
  }

  private async cancelReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.report_id) return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    return this.postAction(`/reports/${encodeURIComponent(args.report_id as string)}/cancel`);
  }

  private async createWorkflowRun(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.applicant_id || !args.workflow_id) return { content: [{ type: 'text', text: 'applicant_id and workflow_id are required' }], isError: true };
    const body: Record<string, unknown> = { applicant_id: args.applicant_id, workflow_id: args.workflow_id };
    if (args.custom_data) {
      try { body.custom_data = JSON.parse(args.custom_data as string); } catch { body.custom_data = args.custom_data; }
    }
    return this.post('/workflow_runs', body);
  }

  private async getWorkflowRun(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workflow_run_id) return { content: [{ type: 'text', text: 'workflow_run_id is required' }], isError: true };
    return this.get(`/workflow_runs/${encodeURIComponent(args.workflow_run_id as string)}`);
  }

  private async listWorkflowRuns(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    };
    if (args.status) params.status = args.status as string;
    if (args.applicant_id) params.applicant_id = args.applicant_id as string;
    return this.get('/workflow_runs', params);
  }

  private async listWebhooks(): Promise<ToolResult> {
    return this.get('/webhooks');
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const body: Record<string, unknown> = { url: args.url };
    if (args.events) {
      body.events = (args.events as string).split(',').map((e: string) => e.trim());
    }
    if (typeof args.enabled === 'boolean') body.enabled = args.enabled;
    return this.post('/webhooks', body);
  }

  private async deleteWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_id) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    return this.del(`/webhooks/${encodeURIComponent(args.webhook_id as string)}`);
  }
}
