/**
 * Paylocity MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.paylocity.com/api
// Auth: OAuth2 client_credentials flow
//   Token endpoint (production): https://api.paylocity.com/IdentityServer/connect/token
//   Token endpoint (sandbox):    https://apisandbox.paylocity.com/IdentityServer/connect/token
//   Scope: WebLinkAPI
// Docs: https://developer.paylocity.com/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PaylocityConfig {
  clientId: string;
  clientSecret: string;
  /** Override base URL for sandbox testing */
  baseUrl?: string;
  /** Override token URL for sandbox testing */
  tokenUrl?: string;
}

export class PaylocityMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private cachedToken: string = '';
  private tokenExpiry: number = 0;

  constructor(config: PaylocityConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = (config.baseUrl || 'https://api.paylocity.com/api').replace(/\/$/, '');
    this.tokenUrl = config.tokenUrl || 'https://api.paylocity.com/IdentityServer/connect/token';
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.tokenExpiry > now) {
      return this.cachedToken;
    }

    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=WebLinkAPI',
    });

    if (!response.ok) {
      throw new Error(`Paylocity token request failed: HTTP ${response.status} ${response.statusText}`);
    }

    let tokenData: { access_token?: string; expires_in?: number };
    try {
      tokenData = await response.json() as { access_token?: string; expires_in?: number };
    } catch {
      throw new Error('Paylocity returned non-JSON token response');
    }

    if (!tokenData.access_token) {
      throw new Error('Paylocity token response did not include access_token');
    }

    this.cachedToken = tokenData.access_token;
    this.tokenExpiry = now + ((tokenData.expires_in ?? 3600) - 60) * 1000;
    return this.cachedToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_employees',
        description: 'Get all employees for a company in Paylocity. Returns employee IDs, names, departments, and status.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Paylocity company ID',
            },
            pageSize: {
              type: 'number',
              description: 'Number of employees to return per page (default: 100)',
            },
            pageNumber: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['companyId'],
        },
      },
      {
        name: 'get_employee',
        description: 'Get full details for a single Paylocity employee by company ID and employee ID.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Paylocity company ID',
            },
            employeeId: {
              type: 'string',
              description: 'The Paylocity employee ID',
            },
          },
          required: ['companyId', 'employeeId'],
        },
      },
      {
        name: 'get_employee_earnings',
        description: 'Get all earnings records for a specific employee in Paylocity, including earning codes and amounts.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Paylocity company ID',
            },
            employeeId: {
              type: 'string',
              description: 'The Paylocity employee ID',
            },
          },
          required: ['companyId', 'employeeId'],
        },
      },
      {
        name: 'get_pay_statement_summary',
        description: 'Get pay statement summary data for an employee for a specific year, including gross pay and deductions.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Paylocity company ID',
            },
            employeeId: {
              type: 'string',
              description: 'The Paylocity employee ID',
            },
            year: {
              type: 'string',
              description: 'The year for pay statements (e.g., "2024")',
            },
          },
          required: ['companyId', 'employeeId', 'year'],
        },
      },
      {
        name: 'get_pay_statement_details',
        description: 'Get detailed pay statement data for an employee for a specific year, with line-item breakdown of earnings and deductions.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Paylocity company ID',
            },
            employeeId: {
              type: 'string',
              description: 'The Paylocity employee ID',
            },
            year: {
              type: 'string',
              description: 'The year for pay statement details (e.g., "2024")',
            },
            checkDate: {
              type: 'string',
              description: 'Optional specific check date to filter results (YYYY-MM-DD)',
            },
          },
          required: ['companyId', 'employeeId', 'year'],
        },
      },
      {
        name: 'get_employee_direct_deposit',
        description: 'Get all direct deposit accounts configured for a Paylocity employee.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Paylocity company ID',
            },
            employeeId: {
              type: 'string',
              description: 'The Paylocity employee ID',
            },
          },
          required: ['companyId', 'employeeId'],
        },
      },
      {
        name: 'get_company_codes',
        description: 'Get all company codes and descriptions for a specific resource type (e.g., costcenter1, deductions, earnings, taxes, paygrade, positions).',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Paylocity company ID',
            },
            codeResource: {
              type: 'string',
              description: 'Type of company code (e.g., costcenter1, costcenter2, costcenter3, deductions, earnings, taxes, paygrade, positions)',
            },
          },
          required: ['companyId', 'codeResource'],
        },
      },
      {
        name: 'get_employee_local_taxes',
        description: 'Get all local tax records configured for a specific Paylocity employee.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Paylocity company ID',
            },
            employeeId: {
              type: 'string',
              description: 'The Paylocity employee ID',
            },
          },
          required: ['companyId', 'employeeId'],
        },
      },
      {
        name: 'get_custom_fields',
        description: 'Get all custom field definitions for a Paylocity company by category.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Paylocity company ID',
            },
            category: {
              type: 'string',
              description: 'Custom fields category to retrieve',
            },
          },
          required: ['companyId', 'category'],
        },
      },
      {
        name: 'get_employee_sensitive_data',
        description: 'Get sensitive data for a Paylocity employee, such as SSN (masked) and date of birth.',
        inputSchema: {
          type: 'object',
          properties: {
            companyId: {
              type: 'string',
              description: 'The Paylocity company ID',
            },
            employeeId: {
              type: 'string',
              description: 'The Paylocity employee ID',
            },
          },
          required: ['companyId', 'employeeId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_employees':
          return await this.listEmployees(args);
        case 'get_employee':
          return await this.getEmployee(args);
        case 'get_employee_earnings':
          return await this.getEmployeeEarnings(args);
        case 'get_pay_statement_summary':
          return await this.getPayStatementSummary(args);
        case 'get_pay_statement_details':
          return await this.getPayStatementDetails(args);
        case 'get_employee_direct_deposit':
          return await this.getEmployeeDirectDeposit(args);
        case 'get_company_codes':
          return await this.getCompanyCodes(args);
        case 'get_employee_local_taxes':
          return await this.getEmployeeLocalTaxes(args);
        case 'get_custom_fields':
          return await this.getCustomFields(args);
        case 'get_employee_sensitive_data':
          return await this.getEmployeeSensitiveData(args);
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

  private async apiFetch(path: string): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Paylocity API error HTTP ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Paylocity returned non-JSON response (HTTP ${response.status})`); }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listEmployees(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    const pageSize = (args.pageSize as number) || 100;
    const pageNumber = (args.pageNumber as number) || 1;
    return this.apiFetch(`/v2/companies/${encodeURIComponent(companyId)}/employees/?pageSize=${pageSize}&pageNumber=${pageNumber}`);
  }

  private async getEmployee(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const employeeId = args.employeeId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    if (!employeeId) return { content: [{ type: 'text', text: 'employeeId is required' }], isError: true };
    return this.apiFetch(`/v2/companies/${encodeURIComponent(companyId)}/employees/${encodeURIComponent(employeeId)}`);
  }

  private async getEmployeeEarnings(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const employeeId = args.employeeId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    if (!employeeId) return { content: [{ type: 'text', text: 'employeeId is required' }], isError: true };
    return this.apiFetch(`/v2/companies/${encodeURIComponent(companyId)}/employees/${encodeURIComponent(employeeId)}/earnings`);
  }

  private async getPayStatementSummary(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const employeeId = args.employeeId as string;
    const year = args.year as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    if (!employeeId) return { content: [{ type: 'text', text: 'employeeId is required' }], isError: true };
    if (!year) return { content: [{ type: 'text', text: 'year is required' }], isError: true };
    return this.apiFetch(`/v2/companies/${encodeURIComponent(companyId)}/employees/${encodeURIComponent(employeeId)}/paystatement/summary/${encodeURIComponent(year)}`);
  }

  private async getPayStatementDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const employeeId = args.employeeId as string;
    const year = args.year as string;
    const checkDate = args.checkDate as string | undefined;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    if (!employeeId) return { content: [{ type: 'text', text: 'employeeId is required' }], isError: true };
    if (!year) return { content: [{ type: 'text', text: 'year is required' }], isError: true };
    const basePath = `/v2/companies/${encodeURIComponent(companyId)}/employees/${encodeURIComponent(employeeId)}/paystatement/details/${encodeURIComponent(year)}`;
    const path = checkDate ? `${basePath}/${encodeURIComponent(checkDate)}` : basePath;
    return this.apiFetch(path);
  }

  private async getEmployeeDirectDeposit(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const employeeId = args.employeeId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    if (!employeeId) return { content: [{ type: 'text', text: 'employeeId is required' }], isError: true };
    return this.apiFetch(`/v2/companies/${encodeURIComponent(companyId)}/employees/${encodeURIComponent(employeeId)}/directDeposit`);
  }

  private async getCompanyCodes(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const codeResource = args.codeResource as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    if (!codeResource) return { content: [{ type: 'text', text: 'codeResource is required' }], isError: true };
    return this.apiFetch(`/v2/companies/${encodeURIComponent(companyId)}/codes/${encodeURIComponent(codeResource)}`);
  }

  private async getEmployeeLocalTaxes(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const employeeId = args.employeeId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    if (!employeeId) return { content: [{ type: 'text', text: 'employeeId is required' }], isError: true };
    return this.apiFetch(`/v2/companies/${encodeURIComponent(companyId)}/employees/${encodeURIComponent(employeeId)}/localTaxes`);
  }

  private async getCustomFields(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const category = args.category as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    if (!category) return { content: [{ type: 'text', text: 'category is required' }], isError: true };
    return this.apiFetch(`/v2/companies/${encodeURIComponent(companyId)}/customfields/${encodeURIComponent(category)}`);
  }

  private async getEmployeeSensitiveData(args: Record<string, unknown>): Promise<ToolResult> {
    const companyId = args.companyId as string;
    const employeeId = args.employeeId as string;
    if (!companyId) return { content: [{ type: 'text', text: 'companyId is required' }], isError: true };
    if (!employeeId) return { content: [{ type: 'text', text: 'employeeId is required' }], isError: true };
    return this.apiFetch(`/v2/companies/${encodeURIComponent(companyId)}/employees/${encodeURIComponent(employeeId)}/sensitivedata`);
  }

  static catalog() {
    return {
      name: 'paylocity',
      displayName: 'Paylocity',
      version: '1.0.0',
      category: 'hr' as const,
      keywords: ['paylocity', 'hr', 'payroll', 'employees', 'workforce'],
      toolNames: [
        'list_employees',
        'get_employee',
        'get_employee_earnings',
        'get_pay_statement_summary',
        'get_pay_statement_details',
        'get_employee_direct_deposit',
        'get_company_codes',
        'get_employee_local_taxes',
        'get_custom_fields',
        'get_employee_sensitive_data',
      ],
      description: 'Paylocity HR and payroll adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
