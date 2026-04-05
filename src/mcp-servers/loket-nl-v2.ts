/**
 * Loket.nl V2 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Loket.nl has not published an official MCP server.
//
// Base URL: https://api.loket.nl/v2
// Auth: OAuth2 Bearer token — Authorization: Bearer <access_token>
//   All endpoints require a valid OAuth2 token issued by Loket.nl.
//   Employer-scoped endpoints require an employerId path parameter.
//   Employee-scoped endpoints require both employerId and employeeId.
// Docs: https://developer.loket.nl/
// Rate limits: Not publicly documented. Loket.nl enforces per-token limits server-side.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LoketNlV2Config {
  accessToken: string;
  baseUrl?: string;
}

export class LoketNlV2MCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: LoketNlV2Config) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.loket.nl/v2';
  }

  static catalog() {
    return {
      name: 'loket-nl-v2',
      displayName: 'Loket.nl HR',
      version: '1.0.0',
      category: 'hr' as const,
      keywords: [
        'loket', 'loket.nl', 'hr', 'payroll', 'employee', 'employer', 'netherlands',
        'dutch', 'absence', 'leave', 'department', 'salary', 'contract', 'workforce',
        'human resources', 'payroll administration', 'onboarding', 'offboarding',
      ],
      toolNames: [
        'list_employers',
        'get_employer',
        'get_employer_dashboard',
        'list_employees',
        'get_employee',
        'update_employee',
        'list_departments',
        'get_department',
        'create_department',
        'list_absences',
        'get_absence',
        'create_absence',
        'get_absence_overview',
        'list_leave_balances',
        'list_leave_types',
        'list_leave_requests',
        'list_payroll_administrations',
        'list_contract_codes',
        'create_contract_code',
        'get_employee_notes',
        'create_employee_note',
        'list_leave_policies',
        'get_leave_balance_grouped',
        'get_company_information',
        'list_providers',
      ],
      description: 'Manage Loket.nl HR: employers, employees, absences, leave balances, departments, payroll administrations, and contract codes via the Loket.nl V2 REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Providers / Employers ─────────────────────────────────────────────
      {
        name: 'list_providers',
        description: 'List all providers accessible to the authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_employers',
        description: 'List all employers accessible to the authenticated user, with optional pagination and filtering',
        inputSchema: {
          type: 'object',
          properties: {
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1)' },
            pageSize: { type: 'number', description: 'Number of results per page (default: 25)' },
            filter: { type: 'string', description: 'OData filter expression to narrow results' },
            orderBy: { type: 'string', description: 'OData orderBy expression for sorting' },
          },
        },
      },
      {
        name: 'get_employer',
        description: 'Get details of a specific employer by their employer ID',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The Loket.nl employer ID' },
          },
          required: ['employer_id'],
        },
      },
      {
        name: 'get_employer_dashboard',
        description: 'Get the dashboard summary for a specific employer, including key HR metrics',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The Loket.nl employer ID' },
          },
          required: ['employer_id'],
        },
      },
      // ── Employees ─────────────────────────────────────────────────────────
      {
        name: 'list_employees',
        description: 'List employees for an employer, with optional pagination and filtering',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The employer ID to list employees for' },
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1)' },
            pageSize: { type: 'number', description: 'Number of results per page (default: 25)' },
            filter: { type: 'string', description: 'OData filter expression to narrow results' },
            orderBy: { type: 'string', description: 'OData orderBy expression for sorting' },
          },
          required: ['employer_id'],
        },
      },
      {
        name: 'get_employee',
        description: 'Get full details of a specific employee by their employee ID',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'The Loket.nl employee ID' },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'update_employee',
        description: 'Update details of an existing employee record by employee ID',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'The Loket.nl employee ID to update' },
            payload: { type: 'object', description: 'Fields to update on the employee record (JSON object matching Loket.nl employee schema)', properties: {} },
          },
          required: ['employee_id', 'payload'],
        },
      },
      // ── Departments ───────────────────────────────────────────────────────
      {
        name: 'list_departments',
        description: 'List departments for an employer, with optional pagination and filtering',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The employer ID to list departments for' },
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1)' },
            pageSize: { type: 'number', description: 'Number of results per page (default: 25)' },
            filter: { type: 'string', description: 'OData filter expression to narrow results' },
            orderBy: { type: 'string', description: 'OData orderBy expression for sorting' },
          },
          required: ['employer_id'],
        },
      },
      {
        name: 'get_department',
        description: 'Get details of a specific department by department ID',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: { type: 'string', description: 'The Loket.nl department ID' },
          },
          required: ['department_id'],
        },
      },
      {
        name: 'create_department',
        description: 'Create a new department under an employer',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The employer ID to create the department under' },
            payload: { type: 'object', description: 'Department fields (JSON object matching Loket.nl department schema)', properties: {} },
          },
          required: ['employer_id', 'payload'],
        },
      },
      // ── Absences ──────────────────────────────────────────────────────────
      {
        name: 'list_absences',
        description: 'List absences for a specific employee, with optional pagination and filtering',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'The employee ID to list absences for' },
            pageNumber: { type: 'number', description: 'Page number for pagination (default: 1)' },
            pageSize: { type: 'number', description: 'Number of results per page (default: 25)' },
            filter: { type: 'string', description: 'OData filter expression to narrow results' },
            orderBy: { type: 'string', description: 'OData orderBy expression for sorting' },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'get_absence',
        description: 'Get details of a specific absence record by absence ID',
        inputSchema: {
          type: 'object',
          properties: {
            absence_id: { type: 'string', description: 'The Loket.nl absence ID' },
          },
          required: ['absence_id'],
        },
      },
      {
        name: 'create_absence',
        description: 'Create a new absence record for an employee',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'The employee ID to create the absence for' },
            payload: { type: 'object', description: 'Absence fields (JSON object matching Loket.nl absence schema)', properties: {} },
          },
          required: ['employee_id', 'payload'],
        },
      },
      {
        name: 'get_absence_overview',
        description: 'Get an absence overview for an employee within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'The employee ID' },
            start_date: { type: 'string', description: 'Start date of the overview period (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'End date of the overview period (YYYY-MM-DD)' },
          },
          required: ['employee_id'],
        },
      },
      // ── Leave ─────────────────────────────────────────────────────────────
      {
        name: 'list_leave_balances',
        description: 'List leave balances for all employees of an employer, optionally filtered by leave type and reference date',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The employer ID' },
            reference_date: { type: 'string', description: 'Reference date for balance calculation (YYYY-MM-DD, default: today)' },
            leave_type: { type: 'string', description: 'Filter by leave type code' },
            pageNumber: { type: 'number', description: 'Page number for pagination' },
            pageSize: { type: 'number', description: 'Results per page' },
          },
          required: ['employer_id'],
        },
      },
      {
        name: 'get_leave_balance_grouped',
        description: 'Get leave balances grouped by a field (e.g. department) for an employer',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The employer ID' },
            group_by: { type: 'string', description: 'Field to group results by (e.g. department)' },
            reference_date: { type: 'string', description: 'Reference date for balance calculation (YYYY-MM-DD)' },
            leave_type: { type: 'string', description: 'Filter by leave type code' },
            pageNumber: { type: 'number', description: 'Page number for pagination' },
            pageSize: { type: 'number', description: 'Results per page' },
          },
          required: ['employer_id'],
        },
      },
      {
        name: 'list_leave_types',
        description: 'List available leave types for an employer',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The employer ID' },
            pageNumber: { type: 'number', description: 'Page number for pagination' },
            pageSize: { type: 'number', description: 'Results per page' },
          },
          required: ['employer_id'],
        },
      },
      {
        name: 'list_leave_requests',
        description: 'List pending and historical leave requests for all employees under an employer',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The employer ID' },
            pageNumber: { type: 'number', description: 'Page number for pagination' },
            pageSize: { type: 'number', description: 'Results per page' },
            filter: { type: 'string', description: 'OData filter expression to narrow results' },
            orderBy: { type: 'string', description: 'OData orderBy expression for sorting' },
          },
          required: ['employer_id'],
        },
      },
      {
        name: 'list_leave_policies',
        description: 'List leave policies defined for an employer',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The employer ID' },
            pageNumber: { type: 'number', description: 'Page number for pagination' },
            pageSize: { type: 'number', description: 'Results per page' },
          },
          required: ['employer_id'],
        },
      },
      // ── Payroll ───────────────────────────────────────────────────────────
      {
        name: 'list_payroll_administrations',
        description: 'List payroll administrations for an employer',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The employer ID' },
            pageNumber: { type: 'number', description: 'Page number for pagination' },
            pageSize: { type: 'number', description: 'Results per page' },
            filter: { type: 'string', description: 'OData filter expression to narrow results' },
            orderBy: { type: 'string', description: 'OData orderBy expression for sorting' },
          },
          required: ['employer_id'],
        },
      },
      // ── Contracts ─────────────────────────────────────────────────────────
      {
        name: 'list_contract_codes',
        description: 'List contract codes for an employer',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The employer ID' },
            pageNumber: { type: 'number', description: 'Page number for pagination' },
            pageSize: { type: 'number', description: 'Results per page' },
            filter: { type: 'string', description: 'OData filter expression to narrow results' },
            orderBy: { type: 'string', description: 'OData orderBy expression for sorting' },
          },
          required: ['employer_id'],
        },
      },
      {
        name: 'create_contract_code',
        description: 'Create a new contract code under an employer',
        inputSchema: {
          type: 'object',
          properties: {
            employer_id: { type: 'string', description: 'The employer ID to create the contract code under' },
            payload: { type: 'object', description: 'Contract code fields (JSON object matching Loket.nl contract code schema)', properties: {} },
          },
          required: ['employer_id', 'payload'],
        },
      },
      // ── Employee Notes ────────────────────────────────────────────────────
      {
        name: 'get_employee_notes',
        description: 'List notes for a specific employee',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'The employee ID' },
            pageNumber: { type: 'number', description: 'Page number for pagination' },
            pageSize: { type: 'number', description: 'Results per page' },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'create_employee_note',
        description: 'Create a new note for an employee',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: { type: 'string', description: 'The employee ID to attach the note to' },
            payload: { type: 'object', description: 'Note fields (JSON object matching Loket.nl note schema)', properties: {} },
          },
          required: ['employee_id', 'payload'],
        },
      },
      // ── Utility ───────────────────────────────────────────────────────────
      {
        name: 'get_company_information',
        description: 'Look up company information by Dutch Chamber of Commerce (KvK) number',
        inputSchema: {
          type: 'object',
          properties: {
            chamber_of_commerce_number: { type: 'string', description: 'The Dutch Chamber of Commerce registration number (KvK-nummer)' },
          },
          required: ['chamber_of_commerce_number'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_providers':             return await this.listProviders();
        case 'list_employers':             return await this.listEmployers(args);
        case 'get_employer':               return await this.getEmployer(args);
        case 'get_employer_dashboard':     return await this.getEmployerDashboard(args);
        case 'list_employees':             return await this.listEmployees(args);
        case 'get_employee':               return await this.getEmployee(args);
        case 'update_employee':            return await this.updateEmployee(args);
        case 'list_departments':           return await this.listDepartments(args);
        case 'get_department':             return await this.getDepartment(args);
        case 'create_department':          return await this.createDepartment(args);
        case 'list_absences':              return await this.listAbsences(args);
        case 'get_absence':                return await this.getAbsence(args);
        case 'create_absence':             return await this.createAbsence(args);
        case 'get_absence_overview':       return await this.getAbsenceOverview(args);
        case 'list_leave_balances':        return await this.listLeaveBalances(args);
        case 'get_leave_balance_grouped':  return await this.getLeaveBalanceGrouped(args);
        case 'list_leave_types':           return await this.listLeaveTypes(args);
        case 'list_leave_requests':        return await this.listLeaveRequests(args);
        case 'list_leave_policies':        return await this.listLeavePolicies(args);
        case 'list_payroll_administrations': return await this.listPayrollAdministrations(args);
        case 'list_contract_codes':        return await this.listContractCodes(args);
        case 'create_contract_code':       return await this.createContractCode(args);
        case 'get_employee_notes':         return await this.getEmployeeNotes(args);
        case 'create_employee_note':       return await this.createEmployeeNote(args);
        case 'get_company_information':    return await this.getCompanyInformation(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private buildPaginationParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.pageNumber) params.set('pageNumber', String(args.pageNumber));
    if (args.pageSize)   params.set('pageSize', String(args.pageSize));
    if (args.filter)     params.set('filter', args.filter as string);
    if (args.orderBy)    params.set('orderBy', args.orderBy as string);
    return params;
  }

  private qs(params: URLSearchParams): string {
    const s = params.toString();
    return s ? `?${s}` : '';
  }

  private async loketRequest(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Loket.nl API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Loket.nl returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Providers / Employers ──────────────────────────────────────────────────

  private async listProviders(): Promise<ToolResult> {
    return this.loketRequest(`${this.baseUrl}/providers`);
  }

  private async listEmployers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildPaginationParams(args);
    return this.loketRequest(`${this.baseUrl}/providers/employers${this.qs(params)}`);
  }

  private async getEmployer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    return this.loketRequest(`${this.baseUrl}/providers/employers/${id}`);
  }

  private async getEmployerDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    return this.loketRequest(`${this.baseUrl}/providers/employers/${id}/dashboard`);
  }

  // ── Employees ──────────────────────────────────────────────────────────────

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    const params = this.buildPaginationParams(args);
    return this.loketRequest(`${this.baseUrl}/providers/employers/${id}/employees${this.qs(params)}`);
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employee_id as string);
    return this.loketRequest(`${this.baseUrl}/providers/employers/employees/${id}`);
  }

  private async updateEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employee_id as string);
    return this.loketRequest(
      `${this.baseUrl}/providers/employers/employees/${id}`,
      { method: 'PUT', body: JSON.stringify(args.payload) },
    );
  }

  // ── Departments ────────────────────────────────────────────────────────────

  private async listDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    const params = this.buildPaginationParams(args);
    return this.loketRequest(`${this.baseUrl}/providers/employers/${id}/departments${this.qs(params)}`);
  }

  private async getDepartment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.department_id as string);
    return this.loketRequest(`${this.baseUrl}/providers/employers/departments/${id}`);
  }

  private async createDepartment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    return this.loketRequest(
      `${this.baseUrl}/providers/employers/${id}/departments`,
      { method: 'POST', body: JSON.stringify(args.payload) },
    );
  }

  // ── Absences ───────────────────────────────────────────────────────────────

  private async listAbsences(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employee_id as string);
    const params = this.buildPaginationParams(args);
    return this.loketRequest(`${this.baseUrl}/providers/employers/employees/${id}/absences${this.qs(params)}`);
  }

  private async getAbsence(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.absence_id as string);
    return this.loketRequest(`${this.baseUrl}/providers/employers/employees/absences/${id}`);
  }

  private async createAbsence(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employee_id as string);
    return this.loketRequest(
      `${this.baseUrl}/providers/employers/employees/${id}/absences`,
      { method: 'POST', body: JSON.stringify(args.payload) },
    );
  }

  private async getAbsenceOverview(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employee_id as string);
    const params = new URLSearchParams();
    if (args.start_date) params.set('startDate', args.start_date as string);
    if (args.end_date)   params.set('endDate', args.end_date as string);
    return this.loketRequest(`${this.baseUrl}/providers/employers/employees/${id}/absences/overview${this.qs(params)}`);
  }

  // ── Leave ──────────────────────────────────────────────────────────────────

  private async listLeaveBalances(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    const params = this.buildPaginationParams(args);
    if (args.reference_date) params.set('referenceDate', args.reference_date as string);
    if (args.leave_type)     params.set('leaveType', args.leave_type as string);
    return this.loketRequest(`${this.baseUrl}/providers/employers/${id}/leavebalances${this.qs(params)}`);
  }

  private async getLeaveBalanceGrouped(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    const params = this.buildPaginationParams(args);
    if (args.reference_date) params.set('referenceDate', args.reference_date as string);
    if (args.leave_type)     params.set('leaveType', args.leave_type as string);
    if (args.group_by)       params.set('groupBy', args.group_by as string);
    return this.loketRequest(`${this.baseUrl}/providers/employers/${id}/leavebalances/grouped${this.qs(params)}`);
  }

  private async listLeaveTypes(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    const params = this.buildPaginationParams(args);
    return this.loketRequest(`${this.baseUrl}/providers/employers/${id}/leavetypes${this.qs(params)}`);
  }

  private async listLeaveRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    const params = this.buildPaginationParams(args);
    return this.loketRequest(`${this.baseUrl}/providers/employers/${id}/employees/employments/leaverequests${this.qs(params)}`);
  }

  private async listLeavePolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    const params = this.buildPaginationParams(args);
    return this.loketRequest(`${this.baseUrl}/providers/employers/${id}/leavePolicies${this.qs(params)}`);
  }

  // ── Payroll ────────────────────────────────────────────────────────────────

  private async listPayrollAdministrations(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    const params = this.buildPaginationParams(args);
    return this.loketRequest(`${this.baseUrl}/providers/employers/${id}/payrolladministrations${this.qs(params)}`);
  }

  // ── Contracts ──────────────────────────────────────────────────────────────

  private async listContractCodes(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    const params = this.buildPaginationParams(args);
    return this.loketRequest(`${this.baseUrl}/providers/employers/${id}/contractcodes${this.qs(params)}`);
  }

  private async createContractCode(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employer_id as string);
    return this.loketRequest(
      `${this.baseUrl}/providers/employers/${id}/contractcodes`,
      { method: 'POST', body: JSON.stringify(args.payload) },
    );
  }

  // ── Employee Notes ─────────────────────────────────────────────────────────

  private async getEmployeeNotes(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employee_id as string);
    const params = this.buildPaginationParams(args);
    return this.loketRequest(`${this.baseUrl}/providers/employers/employees/${id}/notes${this.qs(params)}`);
  }

  private async createEmployeeNote(args: Record<string, unknown>): Promise<ToolResult> {
    const id = encodeURIComponent(args.employee_id as string);
    return this.loketRequest(
      `${this.baseUrl}/providers/employers/employees/${id}/notes`,
      { method: 'POST', body: JSON.stringify(args.payload) },
    );
  }

  // ── Utility ────────────────────────────────────────────────────────────────

  private async getCompanyInformation(args: Record<string, unknown>): Promise<ToolResult> {
    const kvk = encodeURIComponent(args.chamber_of_commerce_number as string);
    return this.loketRequest(`${this.baseUrl}/chamberofcommerce/${kvk}/companyinformation`);
  }
}
