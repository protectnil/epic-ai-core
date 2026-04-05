/**
 * Gusto MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Gusto-maintained MCP server was found on GitHub or in Gusto documentation.
// (BusyBee3333/gusto-mcp-2026-complete is a 0-star community fork, not official.)
//
// Base URL: https://api.gusto.com (production) / https://api.gusto-demo.com (sandbox/demo)
// Auth: OAuth2 Bearer token — obtain via authorization_code or client_credentials flow.
//       All requests require: Authorization: Bearer {access_token}
//       Token endpoint: POST https://api.gusto.com/oauth/token
// Docs: https://docs.gusto.com/embedded-payroll/reference/
//       https://docs.gusto.com/embedded-payroll/docs/getting-started
// Rate limits: 200 requests per minute per application-user pair (rolling 60-second window).
//              Returns HTTP 429 with Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining headers.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GustoConfig {
  accessToken: string;
  /** Override base URL for demo/sandbox; defaults to production. */
  baseUrl?: string;
}

export class GustoMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: GustoConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl || 'https://api.gusto.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'gusto',
      displayName: 'Gusto',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'gusto', 'payroll', 'hr', 'employees', 'benefits', 'compensation',
        'contractor', 'pay-period', 'pay-stub', 'time-off', 'garnishment',
        'company', 'onboarding', 'w2', 'tax',
      ],
      toolNames: [
        'get_current_user',
        'get_company',
        'list_employees', 'get_employee', 'get_employee_jobs',
        'list_payrolls', 'get_payroll', 'list_pay_periods',
        'list_company_benefits', 'list_employee_benefits',
        'list_contractors', 'get_contractor',
        'list_time_off_requests',
        'list_company_locations',
      ],
      description: 'Manage Gusto payroll, employees, contractors, benefits, pay periods, time off, and company information via the Gusto REST API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_current_user',
        description: 'Retrieve the currently authenticated Gusto user, their roles, and the companies they are associated with.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_company',
        description: 'Retrieve full details for a Gusto company including name, EIN, entity type, primary signatory, and addresses.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company UUID.',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'list_employees',
        description: 'List all employees for a Gusto company. Includes active, onboarding, and optionally terminated employees with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company UUID.',
            },
            terminated: {
              type: 'boolean',
              description: 'Include terminated employees in results (default: false).',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100).',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_employee',
        description: 'Retrieve detailed information for a specific Gusto employee including personal info, jobs, compensations, and home address.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'The Gusto employee UUID.',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'get_employee_jobs',
        description: 'Retrieve all jobs held by a Gusto employee, including job title, location, hire date, and compensation history.',
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'The Gusto employee UUID.',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_payrolls',
        description: 'List payroll runs for a Gusto company. Filter by processing status (unprocessed, processed) and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company UUID.',
            },
            processing_statuses: {
              type: 'string',
              description: "Comma-separated processing statuses to filter by: 'unprocessed', 'processed'.",
            },
            start_date: {
              type: 'string',
              description: 'Filter payrolls with pay periods on or after this date (YYYY-MM-DD).',
            },
            end_date: {
              type: 'string',
              description: 'Filter payrolls with pay periods on or before this date (YYYY-MM-DD).',
            },
            include_off_cycle: {
              type: 'boolean',
              description: 'Include off-cycle payrolls in results (default: false).',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_payroll',
        description: 'Get detailed information for a specific Gusto payroll run, including employee pay stubs, totals, and tax withholdings.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company UUID.',
            },
            payroll_id: {
              type: 'string',
              description: 'The Gusto payroll UUID.',
            },
          },
          required: ['company_id', 'payroll_id'],
        },
      },
      {
        name: 'list_pay_periods',
        description: 'List upcoming and historical pay periods for a Gusto company, with optional date range filter.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company UUID.',
            },
            start_date: {
              type: 'string',
              description: 'Start of the date range to retrieve pay periods for (YYYY-MM-DD).',
            },
            end_date: {
              type: 'string',
              description: 'End of the date range to retrieve pay periods for (YYYY-MM-DD).',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'list_company_benefits',
        description: 'List all benefit plans available to employees in a Gusto company, including health, dental, vision, and 401(k).',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company UUID.',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'list_employee_benefits',
        description: "List all benefit enrollments for a specific Gusto employee, including employee and employer contribution amounts.",
        inputSchema: {
          type: 'object',
          properties: {
            employee_id: {
              type: 'string',
              description: 'The Gusto employee UUID.',
            },
          },
          required: ['employee_id'],
        },
      },
      {
        name: 'list_contractors',
        description: 'List all contractors for a Gusto company, including 1099 contractors with payment and contact details.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company UUID.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            per: {
              type: 'number',
              description: 'Number of results per page (default: 25).',
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'get_contractor',
        description: 'Retrieve details for a specific Gusto contractor, including name, EIN/SSN type, address, and hourly or fixed compensation.',
        inputSchema: {
          type: 'object',
          properties: {
            contractor_id: {
              type: 'string',
              description: 'The Gusto contractor UUID.',
            },
          },
          required: ['contractor_id'],
        },
      },
      {
        name: 'list_time_off_requests',
        description: 'List time off requests for a Gusto company. Filter by employee or approval status.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company UUID.',
            },
            employee_id: {
              type: 'string',
              description: 'Filter time off requests by employee UUID (optional).',
            },
            status: {
              type: 'string',
              description: "Filter by request status: 'pending', 'approved', 'denied' (optional).",
            },
          },
          required: ['company_id'],
        },
      },
      {
        name: 'list_company_locations',
        description: 'List all office and remote work locations registered for a Gusto company.',
        inputSchema: {
          type: 'object',
          properties: {
            company_id: {
              type: 'string',
              description: 'The Gusto company UUID.',
            },
          },
          required: ['company_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_current_user':
          return await this.getCurrentUser();
        case 'get_company':
          return await this.getCompany(args);
        case 'list_employees':
          return await this.listEmployees(args);
        case 'get_employee':
          return await this.getEmployee(args);
        case 'get_employee_jobs':
          return await this.getEmployeeJobs(args);
        case 'list_payrolls':
          return await this.listPayrolls(args);
        case 'get_payroll':
          return await this.getPayroll(args);
        case 'list_pay_periods':
          return await this.listPayPeriods(args);
        case 'list_company_benefits':
          return await this.listCompanyBenefits(args);
        case 'list_employee_benefits':
          return await this.listEmployeeBenefits(args);
        case 'list_contractors':
          return await this.listContractors(args);
        case 'get_contractor':
          return await this.getContractor(args);
        case 'list_time_off_requests':
          return await this.listTimeOffRequests(args);
        case 'list_company_locations':
          return await this.listCompanyLocations(args);
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async getCurrentUser(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/me`, { headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getCompany(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/companies/${encodeURIComponent(args.company_id as string)}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page', String((args.page as number) ?? 1));
    params.set('per', String((args.per as number) ?? 25));
    if (args.terminated === true) params.set('terminated', 'true');

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/companies/${encodeURIComponent(args.company_id as string)}/employees?${params}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/employees/${encodeURIComponent(args.employee_id as string)}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getEmployeeJobs(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/employees/${encodeURIComponent(args.employee_id as string)}/jobs`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listPayrolls(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.processing_statuses) params.set('processing_statuses', args.processing_statuses as string);
    if (args.start_date) params.set('start_date', args.start_date as string);
    if (args.end_date) params.set('end_date', args.end_date as string);
    if (args.include_off_cycle) params.set('include_off_cycle', 'true');
    const qs = params.toString() ? `?${params}` : '';

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/companies/${encodeURIComponent(args.company_id as string)}/payrolls${qs}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getPayroll(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/companies/${encodeURIComponent(args.company_id as string)}/payrolls/${encodeURIComponent(args.payroll_id as string)}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listPayPeriods(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.start_date) params.set('start_date', args.start_date as string);
    if (args.end_date) params.set('end_date', args.end_date as string);
    const qs = params.toString() ? `?${params}` : '';

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/companies/${encodeURIComponent(args.company_id as string)}/pay_periods${qs}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listCompanyBenefits(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/companies/${encodeURIComponent(args.company_id as string)}/company_benefits`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listEmployeeBenefits(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/employees/${encodeURIComponent(args.employee_id as string)}/employee_benefits`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listContractors(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('page', String((args.page as number) ?? 1));
    params.set('per', String((args.per as number) ?? 25));

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/companies/${encodeURIComponent(args.company_id as string)}/contractors?${params}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getContractor(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/contractors/${encodeURIComponent(args.contractor_id as string)}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listTimeOffRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.employee_id) params.set('employee_id', args.employee_id as string);
    if (args.status) params.set('status', args.status as string);
    const qs = params.toString() ? `?${params}` : '';

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/companies/${encodeURIComponent(args.company_id as string)}/time_off_requests${qs}`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listCompanyLocations(args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/v1/companies/${encodeURIComponent(args.company_id as string)}/locations`,
      { headers: this.authHeaders },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }
}
