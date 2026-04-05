/**
 * HiBob MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/hibobio/hibob-public-mcp — transport: stdio (uvx/Python/FastMCP),
// auth: HIBOB_API_TOKEN env var (Bearer token). Published by HiBob (hibobio org). Only 2 commits
// as of 2026-03-28; tool count cannot be determined (source not publicly readable). Criteria
// assessment: official=yes, maintained=UNCERTAIN (2 commits, no releases), tools=UNKNOWN (<10
// likely), transport=stdio. Fails MCP criteria — too new/sparse to confirm 10+ tools or maintenance.
// Our adapter covers 19 tools with broader REST coverage; use-rest-api is the correct decision.
// Recommendation: Use this REST adapter. Document the official MCP for future re-evaluation.
//
// Base URL: https://api.hibob.com/v1
// Auth: Basic auth — Base64(serviceUserId:token) in Authorization header.
// Docs: https://apidocs.hibob.com/
// Rate limits: Not publicly documented; apply conservative backoff on 429 responses.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HiBobConfig {
  /** Service user ID from Bob Settings > Integrations > Service Users. */
  serviceUserId: string;
  /** Service user token. */
  token: string;
  /** Optional base URL override (default: https://api.hibob.com/v1). */
  baseUrl?: string;
}

export class HiBobMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: HiBobConfig) {
    super();
    const credentials = Buffer.from(`${config.serviceUserId}:${config.token}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.baseUrl = (config.baseUrl ?? 'https://api.hibob.com/v1').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'hibob',
      displayName: 'HiBob',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'hibob', 'bob', 'hr', 'human resources', 'hris', 'employee', 'people',
        'time off', 'pto', 'leave', 'payroll', 'attendance', 'onboarding',
        'document', 'task', 'org chart', 'department', 'site',
      ],
      toolNames: [
        'list_employees', 'get_employee', 'search_employees', 'create_employee', 'update_employee',
        'get_employee_work_details', 'get_employee_employment', 'get_employee_lifecycle',
        'list_time_off_requests', 'submit_time_off_request', 'cancel_time_off_request',
        'get_time_off_balance', 'list_who_is_out', 'list_company_holidays',
        'list_tasks', 'get_employee_tasks', 'complete_task',
        'get_payroll_history',
        'list_fields',
      ],
      description: 'Manage HiBob HR data: employees, time-off requests, tasks, documents, payroll history, and attendance via the Bob API v1.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_employees',
        description: 'Retrieve a list of all employees in the company, optionally including inactive employees.',
        inputSchema: {
          type: 'object',
          properties: {
            showInactive: { type: 'boolean', description: 'Include inactive employees in results (default: false).' },
            humanReadable: { type: 'string', description: 'Return field values in human-readable format: REPLACE (replace IDs) or APPEND (include both).' },
          },
        },
      },
      {
        name: 'get_employee',
        description: 'Read all fields for a specific employee by their employee ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The employee ID.' },
            humanReadable: { type: 'string', description: 'Return field values in human-readable format: REPLACE or APPEND.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_employees',
        description: 'Search employees using field filters and return a custom set of fields per result.',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'array', description: 'Filter objects, each with fieldPath, operator, and values (e.g. [{"fieldPath":"work.department","operator":"=","values":["Engineering"]}]).', items: { type: 'object' } },
            fields: { type: 'array', description: 'Field paths to return for each employee (e.g. ["firstName","lastName","work.department"]).', items: { type: 'string' } },
            showInactive: { type: 'boolean', description: 'Include inactive employees (default: false).' },
            humanReadable: { type: 'string', description: 'Return field values in human-readable format: REPLACE or APPEND.' },
          },
        },
      },
      {
        name: 'create_employee',
        description: 'Create a new employee record in Bob with required name and email fields.',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: { type: 'string', description: 'Employee first name.' },
            lastName: { type: 'string', description: 'Employee last name.' },
            email: { type: 'string', description: 'Employee work email address (must be unique).' },
            site: { type: 'string', description: 'Work site name.' },
            startDate: { type: 'string', description: 'Employment start date (YYYY-MM-DD).' },
            department: { type: 'string', description: 'Department name.' },
            title: { type: 'string', description: 'Job title.' },
          },
          required: ['firstName', 'lastName', 'email'],
        },
      },
      {
        name: 'update_employee',
        description: 'Update fields on an existing employee record in Bob (behaves like PATCH — only sends provided fields).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The employee ID to update.' },
            firstName: { type: 'string', description: 'New first name.' },
            lastName: { type: 'string', description: 'New last name.' },
            email: { type: 'string', description: 'New work email.' },
            title: { type: 'string', description: 'New job title.' },
            site: { type: 'string', description: 'New work site name.' },
            department: { type: 'string', description: 'New department name.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_employee_work_details',
        description: 'Read work details for a specific employee: department, site, employment type, manager, and team.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The employee ID.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_employee_employment',
        description: 'Read employment details for a specific employee: contract type, hire date, probation period, and direct reports.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The employee ID.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_employee_lifecycle',
        description: 'Read the lifecycle history of a specific employee including status changes, termination, and re-hires.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The employee ID.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_time_off_requests',
        description: 'List time-off requests for a specific employee, optionally filtered by date range.',
        inputSchema: {
          type: 'object',
          properties: {
            employeeId: { type: 'string', description: 'The employee ID.' },
            startDate: { type: 'string', description: 'Filter requests starting from this date (YYYY-MM-DD).' },
            endDate: { type: 'string', description: 'Filter requests up to this date (YYYY-MM-DD).' },
          },
          required: ['employeeId'],
        },
      },
      {
        name: 'submit_time_off_request',
        description: 'Submit a new time-off request for an employee.',
        inputSchema: {
          type: 'object',
          properties: {
            employeeId: { type: 'string', description: 'The employee ID.' },
            policyType: { type: 'string', description: 'Time-off policy type (e.g. Vacation, Sick).' },
            startDate: { type: 'string', description: 'Request start date (YYYY-MM-DD).' },
            endDate: { type: 'string', description: 'Request end date (YYYY-MM-DD).' },
            startDatePortion: { type: 'string', description: 'Portion of start day: all_day, morning, or afternoon (default: all_day).' },
            endDatePortion: { type: 'string', description: 'Portion of end day: all_day, morning, or afternoon (default: all_day).' },
            description: { type: 'string', description: 'Optional reason or description for the request.' },
          },
          required: ['employeeId', 'policyType', 'startDate', 'endDate'],
        },
      },
      {
        name: 'cancel_time_off_request',
        description: 'Cancel an existing time-off request for an employee by request ID.',
        inputSchema: {
          type: 'object',
          properties: {
            employeeId: { type: 'string', description: 'The employee ID.' },
            requestId: { type: 'number', description: 'The time-off request ID to cancel.' },
          },
          required: ['employeeId', 'requestId'],
        },
      },
      {
        name: 'get_time_off_balance',
        description: 'Get the current time-off balance for a specific employee across all policies.',
        inputSchema: {
          type: 'object',
          properties: {
            employeeId: { type: 'string', description: 'The employee ID.' },
            policyType: { type: 'string', description: 'Filter by policy type (e.g. Vacation). Omit to get all balances.' },
          },
          required: ['employeeId'],
        },
      },
      {
        name: 'list_who_is_out',
        description: 'List employees who are out of office today or on a specified date due to approved time-off.',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date to check (YYYY-MM-DD). Defaults to today.' },
          },
        },
      },
      {
        name: 'list_company_holidays',
        description: 'Retrieve the company holiday calendar for a given year.',
        inputSchema: {
          type: 'object',
          properties: {
            year: { type: 'number', description: 'Calendar year to retrieve holidays for (e.g. 2026).' },
          },
        },
      },
      {
        name: 'list_tasks',
        description: 'List all open tasks in the organization, optionally filtered by status.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by task status: open, closed (default: open).' },
          },
        },
      },
      {
        name: 'get_employee_tasks',
        description: 'List all tasks assigned to a specific employee.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The employee ID.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'complete_task',
        description: 'Mark a specific task as complete by its task ID.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'The task ID to mark as complete.' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'get_payroll_history',
        description: 'Read payroll history records for a specific employee.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The employee ID.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_fields',
        description: 'List all available fields (including custom fields) defined in the Bob employee schema.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_employees':           return await this.listEmployees(args);
        case 'get_employee':             return await this.getEmployee(args);
        case 'search_employees':         return await this.searchEmployees(args);
        case 'create_employee':          return await this.createEmployee(args);
        case 'update_employee':          return await this.updateEmployee(args);
        case 'get_employee_work_details':   return await this.getEmployeeWorkDetails(args);
        case 'get_employee_employment':     return await this.getEmployeeEmployment(args);
        case 'get_employee_lifecycle':      return await this.getEmployeeLifecycle(args);
        case 'list_time_off_requests':   return await this.listTimeOffRequests(args);
        case 'submit_time_off_request':  return await this.submitTimeOffRequest(args);
        case 'cancel_time_off_request':  return await this.cancelTimeOffRequest(args);
        case 'get_time_off_balance':     return await this.getTimeOffBalance(args);
        case 'list_who_is_out':          return await this.listWhoIsOut(args);
        case 'list_company_holidays':    return await this.listCompanyHolidays(args);
        case 'list_tasks':               return await this.listTasks(args);
        case 'get_employee_tasks':       return await this.getEmployeeTasks(args);
        case 'complete_task':            return await this.completeTask(args);
        case 'get_payroll_history':      return await this.getPayrollHistory(args);
        case 'list_fields':              return await this.listFields();
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async bobGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bobPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    const text = await response.text();
    if (!text.trim()) return { content: [{ type: 'text', text: JSON.stringify({ status: 'success' }) }], isError: false };
    return { content: [{ type: 'text', text: this.truncate(JSON.parse(text)) }], isError: false };
  }

  private async bobPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    const text = await response.text();
    if (!text.trim()) return { content: [{ type: 'text', text: JSON.stringify({ status: 'updated' }) }], isError: false };
    return { content: [{ type: 'text', text: this.truncate(JSON.parse(text)) }], isError: false };
  }

  private async bobDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errBody}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'deleted' }) }], isError: false };
  }

  // ---------------------------------------------------------------------------
  // Tool implementations
  // ---------------------------------------------------------------------------

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (typeof args.showInactive === 'boolean') p.set('showInactive', String(args.showInactive));
    if (args.humanReadable) p.set('humanReadable', args.humanReadable as string);
    const qs = p.toString();
    return this.bobGet(`/people${qs ? `?${qs}` : ''}`);
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const p = new URLSearchParams();
    if (args.humanReadable) p.set('humanReadable', args.humanReadable as string);
    const qs = p.toString();
    return this.bobGet(`/people/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`);
  }

  private async searchEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.filters) body.filters = args.filters;
    if (args.fields) body.fields = args.fields;
    if (typeof args.showInactive === 'boolean') body.showInactive = args.showInactive;
    if (args.humanReadable) body.humanReadable = args.humanReadable;
    return this.bobPost('/people/search', body);
  }

  private async createEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const firstName = args.firstName as string;
    const lastName = args.lastName as string;
    const email = args.email as string;
    if (!firstName || !lastName || !email) {
      return { content: [{ type: 'text', text: 'firstName, lastName, and email are required' }], isError: true };
    }
    const body: Record<string, unknown> = { firstName, surname: lastName, email };
    if (args.site) body.site = args.site;
    if (args.startDate) body.startDate = args.startDate;
    if (args.department) body.department = args.department;
    if (args.title) body.title = args.title;
    return this.bobPost('/people', body);
  }

  private async updateEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.firstName) body.firstName = args.firstName;
    if (args.lastName) body.surname = args.lastName;
    if (args.email) body.email = args.email;
    if (args.title) body.title = args.title;
    if (args.site) body.site = args.site;
    if (args.department) body.department = args.department;
    return this.bobPut(`/people/${encodeURIComponent(id)}`, body);
  }

  private async getEmployeeWorkDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.bobGet(`/people/${encodeURIComponent(id)}/work`);
  }

  private async getEmployeeEmployment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.bobGet(`/people/${encodeURIComponent(id)}/employment`);
  }

  private async getEmployeeLifecycle(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.bobGet(`/people/${encodeURIComponent(id)}/lifecycle`);
  }

  private async listTimeOffRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employeeId as string;
    if (!employeeId) return { content: [{ type: 'text', text: 'employeeId is required' }], isError: true };
    const p = new URLSearchParams();
    if (args.startDate) p.set('startDate', args.startDate as string);
    if (args.endDate) p.set('endDate', args.endDate as string);
    const qs = p.toString();
    return this.bobGet(`/timeoff/employees/${encodeURIComponent(employeeId)}/requests${qs ? `?${qs}` : ''}`);
  }

  private async submitTimeOffRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employeeId as string;
    const policyType = args.policyType as string;
    const startDate = args.startDate as string;
    const endDate = args.endDate as string;
    if (!employeeId || !policyType || !startDate || !endDate) {
      return { content: [{ type: 'text', text: 'employeeId, policyType, startDate, and endDate are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      policyType,
      startDate,
      endDate,
      startDatePortion: (args.startDatePortion as string) ?? 'all_day',
      endDatePortion: (args.endDatePortion as string) ?? 'all_day',
    };
    if (args.description) body.description = args.description;
    return this.bobPost(`/timeoff/employees/${encodeURIComponent(employeeId)}/requests`, body);
  }

  private async cancelTimeOffRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employeeId as string;
    const requestId = args.requestId as number;
    if (!employeeId || !requestId) return { content: [{ type: 'text', text: 'employeeId and requestId are required' }], isError: true };
    return this.bobDelete(`/timeoff/employees/${encodeURIComponent(employeeId)}/requests/${requestId}`);
  }

  private async getTimeOffBalance(args: Record<string, unknown>): Promise<ToolResult> {
    const employeeId = args.employeeId as string;
    if (!employeeId) return { content: [{ type: 'text', text: 'employeeId is required' }], isError: true };
    const p = new URLSearchParams();
    if (args.policyType) p.set('policyType', args.policyType as string);
    const qs = p.toString();
    return this.bobGet(`/timeoff/employees/${encodeURIComponent(employeeId)}/balance${qs ? `?${qs}` : ''}`);
  }

  private async listWhoIsOut(args: Record<string, unknown>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (args.date) p.set('date', args.date as string);
    const qs = p.toString();
    return this.bobGet(`/timeoff/outtoday${qs ? `?${qs}` : ''}`);
  }

  private async listCompanyHolidays(args: Record<string, unknown>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (args.year) p.set('year', String(args.year));
    const qs = p.toString();
    return this.bobGet(`/timeoff/holidays${qs ? `?${qs}` : ''}`);
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const p = new URLSearchParams();
    if (args.status) p.set('status', args.status as string);
    const qs = p.toString();
    return this.bobGet(`/tasks${qs ? `?${qs}` : ''}`);
  }

  private async getEmployeeTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.bobGet(`/tasks/people/${encodeURIComponent(id)}`);
  }

  private async completeTask(args: Record<string, unknown>): Promise<ToolResult> {
    const taskId = args.taskId as string;
    if (!taskId) return { content: [{ type: 'text', text: 'taskId is required' }], isError: true };
    return this.bobPost(`/tasks/${encodeURIComponent(taskId)}/complete`, {});
  }

  private async getPayrollHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.bobGet(`/people/${encodeURIComponent(id)}/salaries`);
  }

  private async listFields(): Promise<ToolResult> {
    return this.bobGet('/company/people/fields');
  }
}
