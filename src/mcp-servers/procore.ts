/**
 * Procore MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Procore MCP server was found in the Procore GitHub org. Third-party community implementations exist.
//
// Base URL: https://api.procore.com
// Auth: OAuth2 client credentials — POST https://login.procore.com/oauth/token, Bearer token in Authorization header
// Docs: https://developers.procore.com/reference/rest/authentication
// Rate limits: Not publicly documented; 429 returned on excess

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ProcoreConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  authUrl?: string;
}

export class ProcoreMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly authUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: ProcoreConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.procore.com';
    this.authUrl = config.authUrl || 'https://login.procore.com';
  }

  static catalog() {
    return {
      name: 'procore',
      displayName: 'Procore',
      version: '1.0.0',
      category: 'misc',
      keywords: ['procore', 'construction', 'project management', 'rfi', 'submittal', 'daily log', 'punch list', 'budget', 'drawings'],
      toolNames: [
        'list_projects', 'get_project',
        'list_rfis', 'get_rfi', 'create_rfi',
        'list_submittals', 'get_submittal',
        'list_observations', 'create_observation',
        'list_daily_log_headers',
        'list_companies', 'get_company',
      ],
      description: 'Procore construction management: manage projects, RFIs, submittals, observations, and daily log headers.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'List all Procore projects in a company with optional status and keyword filters',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'number', description: 'Procore company ID' },
            status: { type: 'string', description: 'Filter by status: Active, Inactive, All (default: Active)' },
            per_page: { type: 'number', description: 'Results per page (max: 100, default: 30)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_project',
        description: 'Get full details for a specific Procore project including address, stage, and budget',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'number', description: 'Procore company ID' },
            project_id: { type: 'number', description: 'Procore project ID' },
          },
          required: ['company_id', 'project_id'],
        },
      },
      {
        name: 'list_rfis',
        description: 'List RFIs for a Procore project with optional status, assignee, and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Procore project ID' },
            status: { type: 'string', description: 'Filter by status: open, closed, pending, draft' },
            per_page: { type: 'number', description: 'Results per page (max: 100, default: 30)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_rfi',
        description: 'Get full details of a specific RFI including questions, answers, and attachments',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Procore project ID' },
            rfi_id: { type: 'number', description: 'RFI ID' },
          },
          required: ['project_id', 'rfi_id'],
        },
      },
      {
        name: 'create_rfi',
        description: 'Create a new RFI in a Procore project with subject, question, and optional assignee',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Procore project ID' },
            subject: { type: 'string', description: 'RFI subject/title' },
            question: { type: 'string', description: 'The RFI question or request for information' },
            assignee_id: { type: 'number', description: 'User ID of the RFI assignee' },
            due_date: { type: 'string', description: 'Due date for the RFI response in YYYY-MM-DD format' },
            specification_section: { type: 'string', description: 'Specification section reference (e.g. 03-3000)' },
          },
          required: ['project_id', 'subject', 'question'],
        },
      },
      {
        name: 'list_submittals',
        description: 'List submittals for a Procore project with optional status and specification section filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Procore project ID' },
            status: { type: 'string', description: 'Filter by status: draft, pending_review, revise_and_resubmit, approved, etc.' },
            per_page: { type: 'number', description: 'Results per page (max: 100, default: 30)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'get_submittal',
        description: 'Get full details for a specific submittal including revision history and approval status',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Procore project ID' },
            submittal_id: { type: 'number', description: 'Submittal ID' },
          },
          required: ['project_id', 'submittal_id'],
        },
      },
      {
        name: 'list_observations',
        description: 'List observation items (quality/safety issues) across a Procore company with optional project, status, and type filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Filter by Procore project ID' },
            status: { type: 'string', description: 'Filter by status: initiated, ready_for_review, not_accepted, closed' },
            type_id: { type: 'number', description: 'Filter by observation type ID' },
            per_page: { type: 'number', description: 'Results per page (max: 100, default: 30)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'create_observation',
        description: 'Create a new observation item for quality or safety tracking in a Procore project',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Procore project ID' },
            name: { type: 'string', description: 'Observation title/name' },
            description: { type: 'string', description: 'Detailed description of the observation' },
            type_id: { type: 'number', description: 'Observation type ID' },
            assignee_id: { type: 'number', description: 'User ID to assign the observation to' },
            due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
            priority: { type: 'string', description: 'Priority: high, medium, low' },
          },
          required: ['project_id', 'name'],
        },
      },
      {
        name: 'list_daily_log_headers',
        description: 'List daily log headers for a Procore project with optional date range filters, returning completion and distribution status',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'number', description: 'Procore project ID' },
            start_date: { type: 'string', description: 'Start of date range in YYYY-MM-DD format' },
            end_date: { type: 'string', description: 'End of date range in YYYY-MM-DD format' },
            per_page: { type: 'number', description: 'Results per page (max: 100, default: 30)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_companies',
        description: 'List all companies accessible to the authenticated Procore user',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: { type: 'number', description: 'Results per page (max: 100, default: 30)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_company',
        description: 'Get details for a specific Procore company including address, logo, and settings',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: { type: 'number', description: 'Procore company ID' },
          },
          required: ['company_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects': return this.listProjects(args);
        case 'get_project': return this.getProject(args);
        case 'list_rfis': return this.listRfis(args);
        case 'get_rfi': return this.getRfi(args);
        case 'create_rfi': return this.createRfi(args);
        case 'list_submittals': return this.listSubmittals(args);
        case 'get_submittal': return this.getSubmittal(args);
        case 'list_observations': return this.listObservations(args);
        case 'create_observation': return this.createObservation(args);
        case 'list_daily_log_headers': return this.listDailyLogHeaders(args);
        case 'list_companies': return this.listCompanies(args);
        case 'get_company': return this.getCompany(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;

    const response = await this.fetchWithRetry(`${this.authUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!response.ok) throw new Error(`OAuth2 token request failed: ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.company_id) return { content: [{ type: 'text', text: 'company_id is required' }], isError: true };
    const params: Record<string, string> = { company_id: String(args.company_id) };
    if (args.status) params.status = args.status as string;
    if (args.per_page) params.per_page = String(args.per_page);
    if (args.page) params.page = String(args.page);
    return this.get('/rest/v1.0/projects', params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.company_id || !args.project_id) return { content: [{ type: 'text', text: 'company_id and project_id are required' }], isError: true };
    return this.get(`/rest/v1.0/projects/${encodeURIComponent(args.project_id as string)}`, { company_id: String(args.company_id) });
  }

  private async listRfis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.status) params['filters[status]'] = args.status as string;
    if (args.per_page) params.per_page = String(args.per_page);
    if (args.page) params.page = String(args.page);
    return this.get(`/rest/v1.0/projects/${encodeURIComponent(args.project_id as string)}/rfis`, params);
  }

  private async getRfi(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.rfi_id) return { content: [{ type: 'text', text: 'project_id and rfi_id are required' }], isError: true };
    return this.get(`/rest/v1.0/projects/${encodeURIComponent(args.project_id as string)}/rfis/${encodeURIComponent(args.rfi_id as string)}`);
  }

  private async createRfi(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.subject || !args.question) return { content: [{ type: 'text', text: 'project_id, subject, and question are required' }], isError: true };
    const rfi: Record<string, unknown> = { subject: args.subject, question: args.question };
    if (args.assignee_id) rfi.assignee_id = args.assignee_id;
    if (args.due_date) rfi.due_date = args.due_date;
    if (args.specification_section) rfi.specification_section = args.specification_section;
    return this.post(`/rest/v1.0/projects/${encodeURIComponent(args.project_id as string)}/rfis`, { rfi });
  }

  private async listSubmittals(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.status) params['filters[status]'] = args.status as string;
    if (args.per_page) params.per_page = String(args.per_page);
    if (args.page) params.page = String(args.page);
    return this.get(`/rest/v1.0/projects/${encodeURIComponent(args.project_id as string)}/submittals`, params);
  }

  private async getSubmittal(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.submittal_id) return { content: [{ type: 'text', text: 'project_id and submittal_id are required' }], isError: true };
    return this.get(`/rest/v1.0/projects/${encodeURIComponent(args.project_id as string)}/submittals/${encodeURIComponent(args.submittal_id as string)}`);
  }

  private async listObservations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.project_id) params['filters[project_id]'] = String(args.project_id);
    if (args.status) params['filters[status]'] = args.status as string;
    if (args.type_id) params['filters[type_id]'] = String(args.type_id);
    if (args.per_page) params.per_page = String(args.per_page);
    if (args.page) params.page = String(args.page);
    return this.get('/rest/v1.0/observations/items', params);
  }

  private async createObservation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id || !args.name) return { content: [{ type: 'text', text: 'project_id and name are required' }], isError: true };
    const observation: Record<string, unknown> = { name: args.name, project_id: args.project_id };
    if (args.description) observation.description = args.description;
    if (args.type_id) observation.type_id = args.type_id;
    if (args.assignee_id) observation.assignee_id = args.assignee_id;
    if (args.due_date) observation.due_date = args.due_date;
    if (args.priority) observation.priority = args.priority;
    return this.post('/rest/v1.0/observations/items', { observation });
  }

  private async listDailyLogHeaders(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    if (args.per_page) params.per_page = String(args.per_page);
    if (args.page) params.page = String(args.page);
    return this.get(`/rest/v1.0/projects/${encodeURIComponent(args.project_id as string)}/daily_log_headers/index`, params);
  }

  private async listCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.per_page) params.per_page = String(args.per_page);
    if (args.page) params.page = String(args.page);
    return this.get('/rest/v1.0/companies', params);
  }

  private async getCompany(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.company_id) return { content: [{ type: 'text', text: 'company_id is required' }], isError: true };
    return this.get(`/rest/v1.0/companies/${encodeURIComponent(args.company_id as string)}`);
  }
}
