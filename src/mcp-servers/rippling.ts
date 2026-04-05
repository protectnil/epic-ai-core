/**
 * Rippling MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// rocketsciencegg/rippling-mcp-server is a third-party adapter (Rocket Science Group), NOT
// published by Rippling (the vendor). bifrost-mcp/rippling-mcp is also community-built.
// Neither qualifies as an official vendor MCP. No Rippling-published MCP server found.
// Our adapter covers: 16 tools. Vendor MCP covers: 0 (no official vendor MCP).
// Recommendation: use-rest-api
//
// Base URL: https://rest.ripplingapis.com (primary REST API)
// Auth: Bearer token — static API token generated in Rippling > Tools > Developer > API Tokens.
//   Tokens are long-lived (expire after 30 days of inactivity). Pass as Authorization: Bearer {token}.
//   NOT OAuth2 client credentials — Rippling's REST API v1 uses static bearer tokens only.
// Docs: https://developer.rippling.com/documentation/rest-api
// Rate limits: Not publicly documented; standard 429 responses on limit exceeded

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RipplingConfig {
  apiToken: string;
  baseUrl?: string;
}

export class RipplingMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: RipplingConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://rest.ripplingapis.com';
  }

  static catalog() {
    return {
      name: 'rippling',
      displayName: 'Rippling',
      version: '1.0.0',
      category: 'misc',
      keywords: ['rippling', 'hr', 'hris', 'payroll', 'employee', 'workforce', 'benefits', 'department', 'leave', 'pto', 'onboarding', 'offboarding', 'it', 'device management'],
      toolNames: [
        'list_employees', 'get_employee', 'list_departments', 'get_department',
        'list_leave_requests', 'get_leave_request', 'list_leave_types',
        'list_groups', 'get_group', 'list_group_members',
        'get_company', 'list_employment_types',
        'list_time_off_balances', 'list_work_locations',
        'list_custom_fields', 'list_teams',
      ],
      description: 'Rippling HR/IT platform: query employees, departments, payroll groups, leave requests, time-off balances, and company structure.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_employees',
        description: 'List all employees (workers) in the company with optional department, status, and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: {
              type: 'string',
              description: 'Filter by department ID',
            },
            employment_type: {
              type: 'string',
              description: 'Filter by employment type: EMPLOYEE, CONTRACTOR (default: all)',
            },
            employment_status: {
              type: 'string',
              description: 'Filter by status: EMPLOYED, TERMINATED (default: EMPLOYED)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_employee',
        description: 'Get full profile details for a specific Rippling employee by their ID',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'Employee ID to retrieve',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_departments',
        description: 'List all departments in the Rippling company hierarchy',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_department',
        description: 'Get details for a specific Rippling department by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            department_id: {
              type: 'string',
              description: 'Department ID to retrieve',
            },
          },
          required: ['department_id'],
        },
      },
      {
        name: 'list_leave_requests',
        description: 'List leave requests for the company with optional status, employee, and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'Filter by employee ID',
            },
            status: {
              type: 'string',
              description: 'Filter by status: PENDING, APPROVED, DENIED, CANCELLED (default: all)',
            },
            start_date: {
              type: 'string',
              description: 'Filter requests starting on or after this date (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'Filter requests ending on or before this date (YYYY-MM-DD)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_leave_request',
        description: 'Get details for a specific leave request by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            leave_request_id: {
              type: 'string',
              description: 'Leave request ID to retrieve',
            },
          },
          required: ['leave_request_id'],
        },
      },
      {
        name: 'list_leave_types',
        description: 'List all leave policy types configured in the Rippling company (e.g. PTO, sick, bereavement)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_groups',
        description: 'List all groups (security groups, distribution lists, app access groups) in the Rippling account',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get details and metadata for a specific Rippling group by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Group ID to retrieve',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'list_group_members',
        description: 'List all members (employees) belonging to a specific Rippling group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Group ID to list members for',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_company',
        description: 'Get information about the current Rippling company including name, address, and work locations',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_employment_types',
        description: 'List employment types configured in the Rippling company (e.g. full-time, part-time, contractor)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_time_off_balances',
        description: 'List time-off balances for employees showing accrued and available PTO hours',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'Filter by specific employee ID',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_work_locations',
        description: 'List all work locations registered in the Rippling company account',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'list_custom_fields',
        description: 'List all custom employee fields configured for the Rippling company',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_teams',
        description: 'List all teams in the Rippling company with their managers and members',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_employees':
          return this.listEmployees(args);
        case 'get_employee':
          return this.getEmployee(args);
        case 'list_departments':
          return this.listDepartments(args);
        case 'get_department':
          return this.getDepartment(args);
        case 'list_leave_requests':
          return this.listLeaveRequests(args);
        case 'get_leave_request':
          return this.getLeaveRequest(args);
        case 'list_leave_types':
          return this.listLeaveTypes(args);
        case 'list_groups':
          return this.listGroups(args);
        case 'get_group':
          return this.getGroup(args);
        case 'list_group_members':
          return this.listGroupMembers(args);
        case 'get_company':
          return this.getCompany();
        case 'list_employment_types':
          return this.listEmploymentTypes();
        case 'list_time_off_balances':
          return this.listTimeOffBalances(args);
        case 'list_work_locations':
          return this.listWorkLocations(args);
        case 'list_custom_fields':
          return this.listCustomFields();
        case 'list_teams':
          return this.listTeams(args);
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
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const headers = this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildQs(params: Record<string, string | number | undefined>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) p.set(k, String(v));
    }
    const s = p.toString();
    return s ? '?' + s : '';
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/workers' + this.buildQs({
      departmentId: args.department_id as string,
      employmentType: args.employment_type as string,
      employmentStatus: args.employment_status as string,
      limit: args.limit as number,
      offset: args.offset as number,
    }));
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.employee_id) return { content: [{ type: 'text', text: 'employee_id is required' }], isError: true };
    return this.apiGet(`/workers/${encodeURIComponent(args.employee_id as string)}`);
  }

  private async listDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/departments' + this.buildQs({ limit: args.limit as number, offset: args.offset as number }));
  }

  private async getDepartment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.department_id) return { content: [{ type: 'text', text: 'department_id is required' }], isError: true };
    return this.apiGet(`/departments/${encodeURIComponent(args.department_id as string)}`);
  }

  private async listLeaveRequests(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/leave-requests' + this.buildQs({
      employeeId: args.employee_id as string,
      status: args.status as string,
      startDate: args.start_date as string,
      endDate: args.end_date as string,
      limit: args.limit as number,
      offset: args.offset as number,
    }));
  }

  private async getLeaveRequest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.leave_request_id) return { content: [{ type: 'text', text: 'leave_request_id is required' }], isError: true };
    return this.apiGet(`/leave-requests/${encodeURIComponent(args.leave_request_id as string)}`);
  }

  private async listLeaveTypes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/leave-types' + this.buildQs({ limit: args.limit as number }));
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/groups' + this.buildQs({ limit: args.limit as number, offset: args.offset as number }));
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.apiGet(`/groups/${encodeURIComponent(args.group_id as string)}`);
  }

  private async listGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.apiGet(`/groups/${encodeURIComponent(args.group_id as string)}/members` + this.buildQs({ limit: args.limit as number, offset: args.offset as number }));
  }

  private async getCompany(): Promise<ToolResult> {
    return this.apiGet('/companies/current');
  }

  private async listEmploymentTypes(): Promise<ToolResult> {
    return this.apiGet('/employment-types');
  }

  private async listTimeOffBalances(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/time-off-balances' + this.buildQs({
      employeeId: args.employee_id as string,
      limit: args.limit as number,
      offset: args.offset as number,
    }));
  }

  private async listWorkLocations(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/work-locations' + this.buildQs({ limit: args.limit as number }));
  }

  private async listCustomFields(): Promise<ToolResult> {
    return this.apiGet('/custom-fields');
  }

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/teams' + this.buildQs({ limit: args.limit as number, offset: args.offset as number }));
  }
}
