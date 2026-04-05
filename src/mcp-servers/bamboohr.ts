/**
 * BambooHR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official BambooHR MCP server was found on GitHub, npmjs.com, or BambooHR's developer portal.
// Community servers exist (encoreshao/bamboohr-mcp, evrimalacan/mcp-bamboohr, zuharz/bamboo-mcp-unofficial,
// a-isakov/bamboohr-mcp) but none are vendor-official, actively maintained with 10+ tools, or on a
// published transport. All are community-authored, low-star, and insufficient for production use per
// the four MCP criteria. Our adapter covers: 26 tools.
// Recommendation: use-rest-api — use this REST wrapper for all deployments.
//
// Base URL: https://api.bamboohr.com/api/gateway.php/{companyDomain}/v1
// Auth: HTTP Basic — API key as username, any non-empty string as password (e.g. "x")
//       Generate API keys: BambooHR → your name (lower left) → API Keys
//       All requests must include Accept: application/json (default response is XML)
// Docs: https://documentation.bamboohr.com/docs
// Rate limits: Not publicly documented; BambooHR enforces per-key limits — implement backoff on 429

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BambooHRConfig {
  /** Your BambooHR subdomain, e.g. "mycompany" from mycompany.bamboohr.com */
  companyDomain: string;
  /** BambooHR API key (used as the HTTP Basic Auth username) */
  apiKey: string;
}

export class BambooHRMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BambooHRConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = `https://api.bamboohr.com/api/gateway.php/${encodeURIComponent(config.companyDomain)}/v1`;
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.apiKey}:x`).toString('base64')}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_employee_directory',
        description: 'Retrieve the full employee directory with basic profile info for all active employees.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_employee',
        description: 'Get detailed profile for a specific employee by ID with selectable fields like name, job title, department, email, hire date.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'BambooHR employee ID' },
            fields: {
              type: 'string',
              description: 'Comma-separated field names to return (default: firstName,lastName,jobTitle,department,workEmail,hireDate,employmentHistoryStatus,location)',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'add_employee',
        description: 'Create a new employee record in BambooHR with required name and optional hire date, department, job title, and email.',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: { type: 'string', description: 'Employee first name' },
            last_name: { type: 'string', description: 'Employee last name' },
            hire_date: { type: 'string', description: 'Hire date (YYYY-MM-DD)' },
            department: { type: 'string', description: 'Department name' },
            job_title: { type: 'string', description: 'Job title' },
            work_email: { type: 'string', description: 'Work email address' },
          },
          required: ['first_name', 'last_name'],
        },
      },
      {
        name: 'update_employee',
        description: 'Update one or more fields on an existing employee record by employee ID.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'BambooHR employee ID to update' },
            fields: {
              type: 'object',
              description: 'Key-value pairs of BambooHR field names and new values, e.g. { "jobTitle": "Senior Engineer" }',
            },
          },
          required: ['employee_id', 'fields'],
        },
      },
      {
        name: 'list_changed_employees',
        description: 'Get employee IDs whose records changed after a given timestamp — useful for incremental sync. Filter by inserted, updated, or deleted.',
        inputSchema: {
          type: 'object',
          properties: {
            since: { type: 'string', description: 'ISO 8601 timestamp; returns employees changed after this time' },
            type: { type: 'string', description: 'Change type filter: inserted, updated, deleted (optional)' },
          },
          required: ['since'],
        },
      },
      {
        name: 'list_time_off_requests',
        description: 'List time off requests within a date range, optionally filtered by employee ID, status (approved/denied/requested/canceled), or type.',
        inputSchema: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start of date range (YYYY-MM-DD)' },
            end: { type: 'string', description: 'End of date range (YYYY-MM-DD)' },
            employee_id: { type: 'string', description: 'Filter to a specific employee ID (optional)' },
            status: { type: 'string', description: 'Filter by status: approved, denied, superseded, requested, canceled (optional)' },
            type: { type: 'string', description: 'Filter by time off type ID (optional)' },
          },
          required: ['start', 'end'],
        },
      },
      {
        name: 'get_time_off_policies',
        description: 'Retrieve all time off types and policies defined in BambooHR, including accrual rules and balance tracking settings.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_employee_time_off_balances',
        description: 'Get all time off balances for a specific employee calculated as of a given date.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'BambooHR employee ID' },
            end: { type: 'string', description: 'Calculate balances as of this date (YYYY-MM-DD, default: today)' },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'create_time_off_request',
        description: 'Submit a time off request for an employee with type, date range, and optional note.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'BambooHR employee ID' },
            time_off_type_id: { type: 'number', description: 'Time off type ID from get_time_off_policies' },
            start: { type: 'string', description: 'First day of time off (YYYY-MM-DD)' },
            end: { type: 'string', description: 'Last day of time off (YYYY-MM-DD)' },
            note: { type: 'string', description: 'Optional note for the request' },
          },
          required: ['employee_id', 'time_off_type_id', 'start', 'end'],
        },
      },
      {
        name: 'approve_time_off_request',
        description: 'Approve or deny a pending time off request by request ID.',
        inputSchema: {
          type: 'object',
          properties: {
            request_id: { type: 'string', description: 'Time off request ID' },
            status: { type: 'string', description: 'New status: approved or denied' },
            note: { type: 'string', description: 'Optional note explaining the decision' },
          },
          required: ['request_id', 'status'],
        },
      },
      {
        name: 'run_custom_report',
        description: 'Run a custom report against BambooHR employee data, returning specified fields with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Report title (for reference only, not stored)' },
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'BambooHR field names to include, e.g. ["firstName","lastName","department","jobTitle","salary"]',
            },
            filters: { type: 'object', description: 'Optional BambooHR filter criteria object' },
          },
          required: ['title', 'fields'],
        },
      },
      {
        name: 'get_employee_files',
        description: 'List file categories and files stored in an employee\'s document folder in BambooHR.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'BambooHR employee ID' },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'get_company_files',
        description: 'List all company-level files and their categories stored in BambooHR.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_training_types',
        description: 'List all employee training types defined in BambooHR, including required and optional training categories.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_employee_training',
        description: 'List training records for a specific employee, showing completion status, dates, and renewal requirements.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'BambooHR employee ID' },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_benefits_plans',
        description: 'List all benefit plan deduction types configured in the BambooHR account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_employee_benefits',
        description: 'Get benefit enrollment and deduction records for a specific employee.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'BambooHR employee ID' },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'get_employee_job_info',
        description: 'Get job history entries for an employee including titles, departments, locations, and effective dates.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'BambooHR employee ID' },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'get_employee_compensation',
        description: 'Get compensation history for an employee including salary, pay type, pay rate, and effective dates.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'BambooHR employee ID' },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'get_employee_dependents',
        description: 'Get dependent records for a specific employee (spouse, children, etc.) used for benefits enrollment.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'BambooHR employee ID' },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'get_employee_emergency_contacts',
        description: 'Get emergency contact records for a specific employee.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'BambooHR employee ID' },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_jobs',
        description: 'List open job postings in BambooHR Hiring (ATS), optionally filtered by status or department.',
        inputSchema: {
          type: 'object',
          properties: {
            status_id: { type: 'number', description: 'Filter by job status ID (optional)' },
            department_id: { type: 'number', description: 'Filter by department ID (optional)' },
          },
        },
      },
      {
        name: 'list_applicants',
        description: 'List applicants for a specific job posting in BambooHR Hiring, with optional status filter.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'number', description: 'Job posting ID from list_jobs' },
            status_id: { type: 'number', description: 'Filter by applicant status ID (optional)' },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List all webhooks configured in the BambooHR account with their monitored fields and endpoint URLs.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_meta_fields',
        description: 'Retrieve all available employee fields and their metadata (field IDs, types, aliases) for use in reports and employee queries.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_meta_tables',
        description: 'Retrieve all tabular data fields (tables) available in BambooHR such as job info, compensation, and education tables.',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_employee_directory':
          return this.getEmployeeDirectory();
        case 'get_employee':
          return this.getEmployee(args);
        case 'add_employee':
          return this.addEmployee(args);
        case 'update_employee':
          return this.updateEmployee(args);
        case 'list_changed_employees':
          return this.listChangedEmployees(args);
        case 'list_time_off_requests':
          return this.listTimeOffRequests(args);
        case 'get_time_off_policies':
          return this.getTimeOffPolicies();
        case 'get_employee_time_off_balances':
          return this.getEmployeeTimeOffBalances(args);
        case 'create_time_off_request':
          return this.createTimeOffRequest(args);
        case 'approve_time_off_request':
          return this.approveTimeOffRequest(args);
        case 'run_custom_report':
          return this.runCustomReport(args);
        case 'get_employee_files':
          return this.getEmployeeFiles(args);
        case 'get_company_files':
          return this.getCompanyFiles();
        case 'list_training_types':
          return this.listTrainingTypes();
        case 'list_employee_training':
          return this.listEmployeeTraining(args);
        case 'list_benefits_plans':
          return this.listBenefitsPlans();
        case 'get_employee_benefits':
          return this.getEmployeeBenefits(args);
        case 'get_employee_job_info':
          return this.getEmployeeJobInfo(args);
        case 'get_employee_compensation':
          return this.getEmployeeCompensation(args);
        case 'get_employee_dependents':
          return this.getEmployeeDependents(args);
        case 'get_employee_emergency_contacts':
          return this.getEmployeeEmergencyContacts(args);
        case 'list_jobs':
          return this.listJobs(args);
        case 'list_applicants':
          return this.listApplicants(args);
        case 'list_webhooks':
          return this.listWebhooks();
        case 'get_meta_fields':
          return this.getMetaFields();
        case 'get_meta_tables':
          return this.getMetaTables();
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

  private async getEmployeeDirectory(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/employees/directory`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get employee directory: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employee_id as string;
    if (!employeeId) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    const fields = (args.fields as string) || 'firstName,lastName,jobTitle,department,workEmail,hireDate,employmentHistoryStatus,location';
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/employees/${encodeURIComponent(employeeId)}?fields=${encodeURIComponent(fields)}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get employee: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async addEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name) {
      return { content: [{ type: 'text', text: 'first_name and last_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { firstName: args.first_name, lastName: args.last_name };
    if (args.hire_date) body.hireDate = args.hire_date;
    if (args.department) body.department = args.department;
    if (args.job_title) body.jobTitle = args.job_title;
    if (args.work_email) body.workEmail = args.work_email;
    const response = await this.fetchWithRetry(`${this.baseUrl}/employees/`, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to add employee: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const location = response.headers.get('Location') || '';
    return { content: [{ type: 'text', text: JSON.stringify({ created: true, location }) }], isError: false };
  }

  private async updateEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employee_id as string;
    const fields = args.fields as Record<string, unknown>;
    if (!employeeId || !fields) {
      return { content: [{ type: 'text', text: 'employee_id and fields are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/employees/${encodeURIComponent(employeeId)}`,
      { method: 'POST', headers: this.headers, body: JSON.stringify(fields) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to update employee: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ updated: true, employee_id: employeeId }) }], isError: false };
  }

  private async listChangedEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const since = args.since as string;
    if (!since) return { content: [{ type: 'text', text: 'since is required' }], isError: true };
    let url = `${this.baseUrl}/employees/changed?since=${encodeURIComponent(since)}`;
    if (args.type) url += `&type=${encodeURIComponent(args.type as string)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list changed employees: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listTimeOffRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const start = args.start as string;
    const end = args.end as string;
    if (!start || !end) return { content: [{ type: 'text', text: 'start and end dates are required' }], isError: true };
    let url = `${this.baseUrl}/time_off/requests?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    if (args.employee_id) url += `&employeeId=${encodeURIComponent(args.employee_id as string)}`;
    if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;
    if (args.type) url += `&type=${encodeURIComponent(args.type as string)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list time off requests: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getTimeOffPolicies(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/meta/time_off/types/`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get time off policies: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getEmployeeTimeOffBalances(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employee_id as string;
    if (!employeeId) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    let url = `${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/time_off/calculator`;
    if (args.end) url += `?end=${encodeURIComponent(args.end as string)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get time off balances: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createTimeOffRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const { employee_id, time_off_type_id, start, end, note } = args;
    if (!employee_id || time_off_type_id === undefined || !start || !end) {
      return { content: [{ type: 'text', text: 'employee_id, time_off_type_id, start, and end are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      timeOffTypeId: time_off_type_id,
      start,
      end,
      ...(note ? { note } : {}),
    };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/employees/${encodeURIComponent(employee_id as string)}/time_off/request`,
      { method: 'PUT', headers: this.headers, body: JSON.stringify(body) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to create time off request: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ created: true }));
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async approveTimeOffRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const requestId = args.request_id as string;
    const status = args.status as string;
    if (!requestId || !status) {
      return { content: [{ type: 'text', text: 'request_id and status are required' }], isError: true };
    }
    const body: Record<string, unknown> = { status };
    if (args.note) body.note = args.note;
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/time_off/requests/${encodeURIComponent(requestId)}/status`,
      { method: 'PUT', headers: this.headers, body: JSON.stringify(body) },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to update time off request: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ updated: true, request_id: requestId, status }) }], isError: false };
  }

  private async runCustomReport(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args.title as string;
    const fields = args.fields as string[];
    if (!title || !fields || fields.length === 0) {
      return { content: [{ type: 'text', text: 'title and fields are required' }], isError: true };
    }
    const body: Record<string, unknown> = { title, fields: fields.map(f => ({ id: f })) };
    if (args.filters) body.filters = args.filters;
    const response = await this.fetchWithRetry(`${this.baseUrl}/reports/custom?format=json`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to run custom report: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getEmployeeFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employee_id as string;
    if (!employeeId) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/files/view/`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get employee files: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getCompanyFiles(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/files/view/`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get company files: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listTrainingTypes(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/training/type`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list training types: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listEmployeeTraining(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employee_id as string;
    if (!employeeId) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/training/record/employee/${encodeURIComponent(employeeId)}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list employee training: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listBenefitsPlans(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/benefits/settings/deduction_types/all`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list benefit plans: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getEmployeeBenefits(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employee_id as string;
    if (!employeeId) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/benefits/deductions`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get employee benefits: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getEmployeeJobInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employee_id as string;
    if (!employeeId) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/tables/jobInfo`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get employee job info: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getEmployeeCompensation(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employee_id as string;
    if (!employeeId) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/tables/compensation`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get employee compensation: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getEmployeeDependents(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employee_id as string;
    if (!employeeId) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/tables/dependents`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get employee dependents: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getEmployeeEmergencyContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employee_id as string;
    if (!employeeId) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/employees/${encodeURIComponent(employeeId)}/tables/emergencyContacts`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get emergency contacts: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status_id) params.set('statusId', String(args.status_id));
    if (args.department_id) params.set('departmentId', String(args.department_id));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/applicant_tracking/jobs${qs}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list jobs: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listApplicants(args: Record<string, unknown>): Promise<ToolResult> {
    const jobId = args.job_id as number;
    if (!jobId) return { content: [{ type: 'text', text: 'job_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.status_id) params.set('statusId', String(args.status_id));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/applicant_tracking/jobs/${jobId}/applicants${qs}`,
      { method: 'GET', headers: this.headers },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list applicants: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listWebhooks(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/webhooks`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list webhooks: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getMetaFields(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/meta/fields/`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get meta fields: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getMetaTables(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/meta/tables/`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get meta tables: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  static catalog() {
    return {
      name: 'bamboohr',
      displayName: 'BambooHR',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: ['bamboohr', 'hris', 'hr', 'employees', 'human-resources', 'time-off', 'benefits', 'payroll', 'onboarding', 'ats', 'training'],
      toolNames: [
        'get_employee_directory', 'get_employee', 'add_employee', 'update_employee',
        'list_changed_employees', 'list_time_off_requests', 'get_time_off_policies',
        'get_employee_time_off_balances', 'create_time_off_request', 'approve_time_off_request',
        'run_custom_report', 'get_employee_files', 'get_company_files',
        'list_training_types', 'list_employee_training', 'list_benefits_plans',
        'get_employee_benefits', 'get_employee_job_info', 'get_employee_compensation',
        'get_employee_dependents', 'get_employee_emergency_contacts',
        'list_jobs', 'list_applicants', 'list_webhooks', 'get_meta_fields', 'get_meta_tables',
      ],
      description: 'HR management: employees, time-off, benefits, training, compensation, applicant tracking, and custom reports.',
      author: 'protectnil' as const,
    };
  }
}
