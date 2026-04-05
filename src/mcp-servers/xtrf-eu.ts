/**
 * XTRF Translation Management System MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
//
// Base URL: https://presentation.s.xtrf.eu/home-api
// Auth: X-AUTH-ACCESS-TOKEN header with a valid XTRF API access token
//   Obtain via POST /customers/persons/accessToken or configured in XTRF admin.
// Docs: https://www.xtrf.eu/
// Spec: https://api.apis.guru/v2/specs/xtrf.eu/2.0/openapi.json
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface XtrfConfig {
  /** XTRF API access token */
  accessToken: string;
  baseUrl?: string;
}

const TRUNCATE = 10 * 1024;

export class XtrfEuMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: XtrfConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://presentation.s.xtrf.eu/home-api').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'xtrf-eu',
      displayName: 'XTRF Translation Management',
      version: '1.0.0',
      category: 'productivity' as const,
      keywords: [
        'xtrf', 'translation', 'localization', 'tms', 'project management',
        'language service provider', 'lsp', 'customers', 'vendors', 'projects',
        'jobs', 'invoices', 'finance', 'quotes', 'files', 'workflow',
      ],
      toolNames: [
        'list_customers', 'get_customer', 'create_customer', 'update_customer',
        'list_customer_persons', 'get_customer_person',
        'list_projects', 'get_project', 'create_project',
        'get_project_finance', 'get_project_files',
        'get_job', 'update_job_dates', 'update_job_status', 'assign_job_vendor',
        'list_customer_invoices', 'get_customer_invoice',
        'list_provider_invoices', 'get_provider_invoice',
        'upload_file',
        'list_dictionaries',
        'get_license',
      ],
      description: 'XTRF Translation Management System: manage translation projects, customers, vendors, jobs, invoices, and files via the v2 Home API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_customers',
        description: 'List all customers with their names and IDs',
        inputSchema: {
          type: 'object',
          properties: {
            pageNumber: { type: 'number', description: 'Page number for pagination (0-based)' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get detailed information for a specific customer',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: { type: 'number', description: 'Customer ID' },
          },
          required: ['customerId'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Customer company name' },
            fullName: { type: 'string', description: 'Full legal name' },
            countryCode: { type: 'string', description: 'ISO country code (e.g. US, GB)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_customer',
        description: 'Update an existing customer',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: { type: 'number', description: 'Customer ID' },
            name: { type: 'string', description: 'Customer name' },
            fullName: { type: 'string', description: 'Full legal name' },
          },
          required: ['customerId'],
        },
      },
      {
        name: 'list_customer_persons',
        description: 'List all contact persons for customers',
        inputSchema: {
          type: 'object',
          properties: {
            pageNumber: { type: 'number', description: 'Page number (0-based)' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
        },
      },
      {
        name: 'get_customer_person',
        description: 'Get details for a specific customer contact person',
        inputSchema: {
          type: 'object',
          properties: {
            personId: { type: 'number', description: 'Person ID' },
          },
          required: ['personId'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all translation projects',
        inputSchema: {
          type: 'object',
          properties: {
            pageNumber: { type: 'number', description: 'Page number (0-based)' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get full details for a specific project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'Project ID' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new translation project',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name' },
            customerId: { type: 'number', description: 'Customer ID' },
            sourceLanguageCode: { type: 'string', description: 'Source language code (e.g. en-US)' },
            targetLanguageCodes: { type: 'array', items: { type: 'string' }, description: 'Target language codes' },
          },
          required: ['name', 'customerId'],
        },
      },
      {
        name: 'get_project_finance',
        description: 'Get financial details for a project (budget, costs, revenue)',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'Project ID' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'get_project_files',
        description: 'List all files associated with a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'number', description: 'Project ID' },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'get_job',
        description: 'Get details for a specific translation job',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: { type: 'number', description: 'Job ID' },
          },
          required: ['jobId'],
        },
      },
      {
        name: 'update_job_dates',
        description: 'Update start/deadline dates for a job',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: { type: 'number', description: 'Job ID' },
            startDate: { type: 'string', description: 'Start date (ISO 8601)' },
            deadline: { type: 'string', description: 'Deadline (ISO 8601)' },
          },
          required: ['jobId'],
        },
      },
      {
        name: 'update_job_status',
        description: 'Change the status of a job (e.g. start, finish, cancel)',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: { type: 'number', description: 'Job ID' },
            status: { type: 'string', description: 'New status (e.g. OPEN, STARTED, CLOSED, CANCELLED)' },
          },
          required: ['jobId', 'status'],
        },
      },
      {
        name: 'assign_job_vendor',
        description: 'Assign a vendor (translator/provider) to a job',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: { type: 'number', description: 'Job ID' },
            vendorId: { type: 'number', description: 'Vendor/provider person ID' },
          },
          required: ['jobId', 'vendorId'],
        },
      },
      {
        name: 'list_customer_invoices',
        description: 'List customer invoices',
        inputSchema: {
          type: 'object',
          properties: {
            pageNumber: { type: 'number', description: 'Page number (0-based)' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
        },
      },
      {
        name: 'get_customer_invoice',
        description: 'Get details for a specific customer invoice',
        inputSchema: {
          type: 'object',
          properties: {
            invoiceId: { type: 'number', description: 'Invoice ID' },
          },
          required: ['invoiceId'],
        },
      },
      {
        name: 'list_provider_invoices',
        description: 'List provider (vendor) invoices',
        inputSchema: {
          type: 'object',
          properties: {
            pageNumber: { type: 'number', description: 'Page number (0-based)' },
            pageSize: { type: 'number', description: 'Items per page' },
          },
        },
      },
      {
        name: 'get_provider_invoice',
        description: 'Get details for a specific provider invoice',
        inputSchema: {
          type: 'object',
          properties: {
            invoiceId: { type: 'number', description: 'Invoice ID' },
          },
          required: ['invoiceId'],
        },
      },
      {
        name: 'upload_file',
        description: 'Upload a file to XTRF for use in projects',
        inputSchema: {
          type: 'object',
          properties: {
            fileName: { type: 'string', description: 'File name' },
            fileContent: { type: 'string', description: 'Base64-encoded file content' },
          },
          required: ['fileName', 'fileContent'],
        },
      },
      {
        name: 'list_dictionaries',
        description: 'List all available dictionary entries (active items from reference data)',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Dictionary type (e.g. language, specialization, currency)' },
          },
        },
      },
      {
        name: 'get_license',
        description: 'Get the current XTRF license information',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const result = await this._dispatch(name, args);
      const text = JSON.stringify(result);
      return {
        content: [{ type: 'text', text: text.length > TRUNCATE ? text.slice(0, TRUNCATE) + '…[truncated]' : text }],
        isError: false,
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }

  private async _fetch(path: string, options: RequestInit = {}): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchWithRetry(url, {
      ...options,
      headers: {
        'X-AUTH-ACCESS-TOKEN': this.accessToken,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`XTRF API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  private _qs(params: Record<string, unknown>): string {
    const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
    return p.length ? '?' + p.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : '';
  }

  private async _dispatch(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'list_customers': {
        const qs = this._qs({ pageNumber: args.pageNumber, pageSize: args.pageSize });
        return this._fetch(`/customers${qs}`);
      }
      case 'get_customer':
        return this._fetch(`/customers/${args.customerId}`);
      case 'create_customer':
        return this._fetch('/customers', { method: 'POST', body: JSON.stringify({ name: args.name, fullName: args.fullName, countryCode: args.countryCode }) });
      case 'update_customer':
        return this._fetch(`/customers/${args.customerId}`, { method: 'PUT', body: JSON.stringify({ name: args.name, fullName: args.fullName }) });
      case 'list_customer_persons': {
        const qs = this._qs({ pageNumber: args.pageNumber, pageSize: args.pageSize });
        return this._fetch(`/customers/persons${qs}`);
      }
      case 'get_customer_person':
        return this._fetch(`/customers/persons/${args.personId}`);
      case 'list_projects': {
        const qs = this._qs({ pageNumber: args.pageNumber, pageSize: args.pageSize });
        return this._fetch(`/projects/ids${qs}`);
      }
      case 'get_project':
        return this._fetch(`/projects/${args.projectId}`);
      case 'create_project':
        return this._fetch('/projects', { method: 'POST', body: JSON.stringify({ name: args.name, customerId: args.customerId, sourceLanguageCode: args.sourceLanguageCode, targetLanguageCodes: args.targetLanguageCodes }) });
      case 'get_project_finance':
        return this._fetch(`/projects/${args.projectId}/finance`);
      case 'get_project_files':
        return this._fetch(`/projects/${args.projectId}/files`);
      case 'get_job':
        return this._fetch(`/jobs/${args.jobId}`);
      case 'update_job_dates':
        return this._fetch(`/jobs/${args.jobId}/dates`, { method: 'PUT', body: JSON.stringify({ startDate: args.startDate, deadline: args.deadline }) });
      case 'update_job_status':
        return this._fetch(`/jobs/${args.jobId}/status`, { method: 'PUT', body: JSON.stringify({ status: args.status }) });
      case 'assign_job_vendor':
        return this._fetch(`/jobs/${args.jobId}/vendor`, { method: 'PUT', body: JSON.stringify({ vendorId: args.vendorId }) });
      case 'list_customer_invoices': {
        const qs = this._qs({ pageNumber: args.pageNumber, pageSize: args.pageSize });
        return this._fetch(`/accounting/customers/invoices${qs}`);
      }
      case 'get_customer_invoice':
        return this._fetch(`/accounting/customers/invoices/${args.invoiceId}`);
      case 'list_provider_invoices': {
        const qs = this._qs({ pageNumber: args.pageNumber, pageSize: args.pageSize });
        return this._fetch(`/accounting/providers/invoices${qs}`);
      }
      case 'get_provider_invoice':
        return this._fetch(`/accounting/providers/invoices/${args.invoiceId}`);
      case 'upload_file':
        return this._fetch('/files', { method: 'POST', body: JSON.stringify({ fileName: args.fileName, fileContent: args.fileContent }) });
      case 'list_dictionaries': {
        if (args.type) {
          return this._fetch(`/dictionaries/${args.type}/active`);
        }
        return this._fetch('/dictionaries/active');
      }
      case 'get_license':
        return this._fetch('/license');
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
