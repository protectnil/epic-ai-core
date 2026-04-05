/**
 * Merge API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/merge-api/merge-mcp — transport: stdio, auth: API key + account token (env vars)
// Merge publishes an official MCP server (merge-mcp) available via PyPI/uvx. Tools are dynamically generated
// from the Merge API schema based on category (HRIS, ATS, CRM, Ticketing, etc.) and enabled scopes.
// Tool count is dynamic and schema-driven (covers all CRUD operations per model per category).
// Recommendation: use-both — Merge MCP covers individual-category model operations; our REST adapter
// provides cross-category linked-account management, sync status, and force-resync which the Merge MCP
// does not expose as first-class tools (it operates within a single linked account context per config).
// Our adapter covers: 20 tools. Vendor MCP covers: dynamic (schema-driven per category).
//
// Base URL: https://api.merge.dev/api
// Auth: Two-header pattern — Authorization: Bearer {api_key} + X-Account-Token: {account_token}
//       The account_token scopes each request to a specific linked end-user integration.
// Docs: https://docs.merge.dev/hris/, https://docs.merge.dev/ats/, https://docs.merge.dev/crm/,
//       https://docs.merge.dev/ticketing/, https://docs.merge.dev/basics/authentication/
// Rate limits: Launch: 100/min per Linked Account; Professional: 400/min; Enterprise: 600/min

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MergeApiConfig {
  apiKey: string;
  accountToken?: string;  // X-Account-Token — required for linked-account operations
  baseUrl?: string;
}

export class MergeApiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly accountToken: string;
  private readonly baseUrl: string;

  constructor(config: MergeApiConfig) {
    super();
    this.apiKey = config.apiKey;
    this.accountToken = config.accountToken || '';
    this.baseUrl = config.baseUrl || 'https://api.merge.dev/api';
  }

  static catalog() {
    return {
      name: 'merge-api',
      displayName: 'Merge API',
      version: '1.0.0',
      category: 'misc',
      keywords: ['merge', 'unified api', 'hris', 'ats', 'crm', 'accounting', 'ticketing', 'payroll', 'integration', 'aggregator', 'hr', 'human resources', 'applicant tracking'],
      toolNames: [
        'list_linked_accounts',
        'get_linked_account',
        'delete_linked_account',
        'list_employees',
        'get_employee',
        'list_candidates',
        'get_candidate',
        'list_jobs',
        'get_job',
        'list_applications',
        'get_application',
        'list_contacts',
        'get_contact',
        'list_accounts',
        'get_account',
        'list_tickets',
        'get_ticket',
        'create_ticket',
        'list_sync_status',
        'force_resync',
      ],
      description: 'Merge unified API aggregator: access HRIS, ATS, CRM, Accounting, and Ticketing data from hundreds of third-party integrations through a single normalized API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_linked_accounts',
        description: 'List all linked accounts (connected third-party integrations) for the Merge API key with status and integration type',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter by integration category: hris, ats, crm, accounting, ticketing, filestorage (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by link status: complete, incomplete, relink_needed (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response next field',
            },
          },
        },
      },
      {
        name: 'get_linked_account',
        description: 'Get details of a specific linked account including integration name, status, and last sync time',
        inputSchema: {
          type: 'object',
          properties: {
            linked_account_id: {
              type: 'string',
              description: 'The linked account ID to retrieve',
            },
            category: {
              type: 'string',
              description: 'Integration category to query: hris, ats, crm, accounting, ticketing, filestorage (default: hris)',
            },
          },
          required: ['linked_account_id'],
        },
      },
      {
        name: 'delete_linked_account',
        description: 'Delete (unlink) a connected integration linked account by ID — removes the integration and revokes access',
        inputSchema: {
          type: 'object',
          properties: {
            linked_account_id: {
              type: 'string',
              description: 'The linked account ID to delete',
            },
            category: {
              type: 'string',
              description: 'Integration category: hris, ats, crm, accounting, ticketing, filestorage (default: hris)',
            },
          },
          required: ['linked_account_id'],
        },
      },
      {
        name: 'list_employees',
        description: 'List employees from a linked HRIS integration with optional filters for employment status and department',
        inputSchema: {
          type: 'object',
          properties: {
            employment_status: {
              type: 'string',
              description: 'Filter by employment status: ACTIVE, INACTIVE, PENDING (optional)',
            },
            department_id: {
              type: 'string',
              description: 'Filter employees by department ID (optional)',
            },
            modified_after: {
              type: 'string',
              description: 'Only return records modified after this ISO 8601 datetime (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_employee',
        description: 'Get a single employee record from the linked HRIS by Merge employee ID',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'The Merge employee ID to retrieve',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_candidates',
        description: 'List candidates from a linked ATS integration with optional filters for application stage and tags',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Filter candidates by first name (optional)',
            },
            last_name: {
              type: 'string',
              description: 'Filter candidates by last name (optional)',
            },
            modified_after: {
              type: 'string',
              description: 'Only return records modified after this ISO 8601 datetime (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_candidate',
        description: 'Get a single candidate record from the linked ATS by Merge candidate ID',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'The Merge candidate ID to retrieve',
            },
          },
          required: ['candidate_id'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List open and closed job postings from a linked ATS integration with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by job status: OPEN, CLOSED, DRAFT, ARCHIVED, PENDING (optional)',
            },
            modified_after: {
              type: 'string',
              description: 'Only return records modified after this ISO 8601 datetime (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Get a single job posting from the linked ATS by Merge job ID',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'The Merge job ID to retrieve',
            },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_applications',
        description: 'List candidate applications from a linked ATS with optional filters for job and stage',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'Filter applications by job ID (optional)',
            },
            candidate_id: {
              type: 'string',
              description: 'Filter applications by candidate ID (optional)',
            },
            modified_after: {
              type: 'string',
              description: 'Only return records modified after this ISO 8601 datetime (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Get a single application record from the linked ATS by Merge application ID',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'The Merge application ID to retrieve',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List contacts from a linked CRM integration with optional filters for account and modified date',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Filter contacts by CRM account ID (optional)',
            },
            modified_after: {
              type: 'string',
              description: 'Only return records modified after this ISO 8601 datetime (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Get a single contact record from the linked CRM by Merge contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'The Merge contact ID to retrieve',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'list_accounts',
        description: 'List company accounts from a linked CRM integration with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter accounts by company name (partial match, optional)',
            },
            modified_after: {
              type: 'string',
              description: 'Only return records modified after this ISO 8601 datetime (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get a single company account record from the linked CRM by Merge account ID',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The Merge CRM account ID to retrieve',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_tickets',
        description: 'List support tickets from a linked Ticketing integration with optional filters for status, priority, and assignee',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by ticket status: OPEN, CLOSED, IN_PROGRESS, ON_HOLD (optional)',
            },
            priority: {
              type: 'string',
              description: 'Filter by priority: URGENT, HIGH, NORMAL, LOW (optional)',
            },
            assignee_id: {
              type: 'string',
              description: 'Filter by assignee user ID (optional)',
            },
            modified_after: {
              type: 'string',
              description: 'Only return records modified after this ISO 8601 datetime (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_ticket',
        description: 'Get a single support ticket from the linked Ticketing integration by Merge ticket ID',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'string',
              description: 'The Merge ticket ID to retrieve',
            },
          },
          required: ['ticket_id'],
        },
      },
      {
        name: 'create_ticket',
        description: 'Create a new support ticket in the linked Ticketing integration with subject, description, and priority',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Ticket subject or title',
            },
            description: {
              type: 'string',
              description: 'Ticket description or body text (optional)',
            },
            status: {
              type: 'string',
              description: 'Initial ticket status: OPEN, IN_PROGRESS (default: OPEN)',
            },
            priority: {
              type: 'string',
              description: 'Ticket priority: URGENT, HIGH, NORMAL, LOW (default: NORMAL)',
            },
            assignee_id: {
              type: 'string',
              description: 'Merge user ID to assign the ticket to (optional)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_sync_status',
        description: 'List the sync status of all data models for the linked account, showing last sync time and model health',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Integration category to query: hris, ats, crm, accounting, ticketing, filestorage (default: hris)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'force_resync',
        description: 'Force an immediate data resync for all models in the linked account — useful after suspected data drift',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Integration category to resync: hris, ats, crm, accounting, ticketing (required)',
            },
          },
          required: ['category'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_linked_accounts':
          return this.listLinkedAccounts(args);
        case 'get_linked_account':
          return this.getLinkedAccount(args);
        case 'delete_linked_account':
          return this.deleteLinkedAccount(args);
        case 'list_employees':
          return this.listEmployees(args);
        case 'get_employee':
          return this.getEmployee(args);
        case 'list_candidates':
          return this.listCandidates(args);
        case 'get_candidate':
          return this.getCandidate(args);
        case 'list_jobs':
          return this.listJobs(args);
        case 'get_job':
          return this.getJob(args);
        case 'list_applications':
          return this.listApplications(args);
        case 'get_application':
          return this.getApplication(args);
        case 'list_contacts':
          return this.listContacts(args);
        case 'get_contact':
          return this.getContact(args);
        case 'list_accounts':
          return this.listAccounts(args);
        case 'get_account':
          return this.getAccount(args);
        case 'list_tickets':
          return this.listTickets(args);
        case 'get_ticket':
          return this.getTicket(args);
        case 'create_ticket':
          return this.createTicket(args);
        case 'list_sync_status':
          return this.listSyncStatus(args);
        case 'force_resync':
          return this.forceResync(args);
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
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (this.accountToken) {
      h['X-Account-Token'] = this.accountToken;
    }
    return h;
  }

  private async mergeGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async mergePost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async mergeDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = response.status === 204 ? { deleted: true } : await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildListParams(args: Record<string, unknown>, extra?: Record<string, string>): Record<string, string> {
    const params: Record<string, string> = {
      page_size: String((args.page_size as number) ?? 25),
    };
    if (args.cursor) params.cursor = args.cursor as string;
    if (args.modified_after) params.modified_after = args.modified_after as string;
    return { ...params, ...extra };
  }

  private async listLinkedAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    // Merge linked-accounts endpoint is category-scoped: /{category}/v1/linked-accounts
    // The category param is required to select the correct category prefix.
    const category = (args.category as string) || 'hris';
    const params = this.buildListParams(args);
    if (args.status) params.status = args.status as string;
    return this.mergeGet(`/${encodeURIComponent(category)}/v1/linked-accounts`, params);
  }

  private async getLinkedAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.linked_account_id) return { content: [{ type: 'text', text: 'linked_account_id is required' }], isError: true };
    // Merge API retrieves a single linked account by passing id as a query param on the list endpoint.
    const category = (args.category as string) || 'hris';
    const params: Record<string, string> = { id: args.linked_account_id as string };
    return this.mergeGet(`/${encodeURIComponent(category)}/v1/linked-accounts`, params);
  }

  private async deleteLinkedAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.linked_account_id) return { content: [{ type: 'text', text: 'linked_account_id is required' }], isError: true };
    // Merge delete linked account: DELETE /{category}/v1/linked-accounts/{id}
    const category = (args.category as string) || 'hris';
    return this.mergeDelete(`/${encodeURIComponent(category)}/v1/linked-accounts/${encodeURIComponent(args.linked_account_id as string)}`);
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    if (args.employment_status) params.employment_status = args.employment_status as string;
    if (args.department_id) params.department_id = args.department_id as string;
    return this.mergeGet('/hris/v1/employees', params);
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    return this.mergeGet(`/hris/v1/employees/${encodeURIComponent(args.employee_id as string)}`);
  }

  private async listCandidates(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    if (args.first_name) params.first_name = args.first_name as string;
    if (args.last_name) params.last_name = args.last_name as string;
    return this.mergeGet('/ats/v1/candidates', params);
  }

  private async getCandidate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.candidate_id) return { content: [{ type: 'text', text: 'candidate_id is required' }], isError: true };
    return this.mergeGet(`/ats/v1/candidates/${encodeURIComponent(args.candidate_id as string)}`);
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    if (args.status) params.status = args.status as string;
    return this.mergeGet('/ats/v1/jobs', params);
  }

  private async getJob(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.job_id) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    return this.mergeGet(`/ats/v1/jobs/${encodeURIComponent(args.job_id as string)}`);
  }

  private async listApplications(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    if (args.job_id) params.job_id = args.job_id as string;
    if (args.candidate_id) params.candidate_id = args.candidate_id as string;
    return this.mergeGet('/ats/v1/applications', params);
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id) return { content: [{ type: 'text', text: 'application_id is required' }], isError: true };
    return this.mergeGet(`/ats/v1/applications/${encodeURIComponent(args.application_id as string)}`);
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    if (args.account_id) params.account_id = args.account_id as string;
    return this.mergeGet('/crm/v1/contacts', params);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.mergeGet(`/crm/v1/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    if (args.name) params.name = args.name as string;
    return this.mergeGet('/crm/v1/accounts', params);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.mergeGet(`/crm/v1/accounts/${encodeURIComponent(args.account_id as string)}`);
  }

  private async listTickets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildListParams(args);
    if (args.status) params.status = args.status as string;
    if (args.priority) params.priority = args.priority as string;
    if (args.assignee_id) params.assignee_id = args.assignee_id as string;
    return this.mergeGet('/ticketing/v1/tickets', params);
  }

  private async getTicket(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ticket_id) return { content: [{ type: 'text', text: 'ticket_id is required' }], isError: true };
    return this.mergeGet(`/ticketing/v1/tickets/${encodeURIComponent(args.ticket_id as string)}`);
  }

  private async createTicket(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const model: Record<string, unknown> = {
      name: args.name,
      status: (args.status as string) ?? 'OPEN',
      priority: (args.priority as string) ?? 'NORMAL',
    };
    if (args.description) model.description = args.description;
    if (args.assignee_id) model.assignees = [args.assignee_id];
    return this.mergePost('/ticketing/v1/tickets', { model });
  }

  private async listSyncStatus(args: Record<string, unknown>): Promise<ToolResult> {
    // Sync status is category-scoped: GET /{category}/v1/sync-status
    const category = (args.category as string) || 'hris';
    const params = this.buildListParams(args);
    return this.mergeGet(`/${encodeURIComponent(category)}/v1/sync-status`, params);
  }

  private async forceResync(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.category) return { content: [{ type: 'text', text: 'category is required' }], isError: true };
    // Correct endpoint: POST /{category}/v1/sync-status/resync (requires X-Account-Token header)
    return this.mergePost(`/${encodeURIComponent(args.category as string)}/v1/sync-status/resync`, {});
  }
}
