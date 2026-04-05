/**
 * ADP MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CDataSoftware/adp-mcp-server-by-cdata — read-only JDBC bridge requiring a CData license.
// Our adapter serves the direct OAuth2 REST API use case for ADP Workforce Now without CData dependency.
// Recommendation: Use the CData MCP server for broad schema exploration. Use this adapter for direct OAuth2 REST access.
//
// Base URL: https://api.adp.com
// Auth: OAuth2 client_credentials flow
//   Token endpoint: https://accounts.adp.com/auth/oauth/v2/token
//   Note: ADP production requires mutual TLS (mTLS). Pass a pre-obtained accessToken for mTLS environments.
// Docs: https://developers.adp.com/build/api-explorer/hcm-offrg-wfn
// Rate limits: Not publicly documented; ADP enforces quotas per API product subscription

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ADPConfig {
  clientId: string;
  clientSecret: string;
  /** Override production base URL; useful for sandbox testing */
  baseUrl?: string;
  /** Pre-obtained Bearer access token (if you manage token refresh or mTLS externally) */
  accessToken?: string;
}

export class ADPMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private cachedToken: string;
  private tokenExpiry: number = 0;

  constructor(config: ADPConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = (config.baseUrl || 'https://api.adp.com').replace(/\/$/, '');
    this.cachedToken = config.accessToken || '';
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.tokenExpiry > now) {
      return this.cachedToken;
    }

    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
    const response = await this.fetchWithRetry('https://accounts.adp.com/auth/oauth/v2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`ADP token request failed: HTTP ${response.status} ${response.statusText}`);
    }

    let tokenData: { access_token?: string; expires_in?: number };
    try {
      tokenData = await response.json() as { access_token?: string; expires_in?: number };
    } catch {
      throw new Error('ADP returned non-JSON token response');
    }

    if (!tokenData.access_token) {
      throw new Error('ADP token response did not include access_token');
    }

    this.cachedToken = tokenData.access_token;
    // Refresh 60 seconds early; default to 1 hour if expires_in not provided
    this.tokenExpiry = now + ((tokenData.expires_in ?? 3600) - 60) * 1000;
    return this.cachedToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workers',
        description: 'List workers from ADP Workforce Now with optional OData filter and pagination. Returns Associate OID, name, department, job title, and employment status.',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: 'Maximum workers to return (default: 100, max: 100 per ADP limits)',
            },
            skip: {
              type: 'number',
              description: 'Records to skip for pagination using $skip (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'OData filter string (e.g., "workers/workAssignments/jobCode/codeValue eq \'ENG\'")',
            },
          },
        },
      },
      {
        name: 'get_worker',
        description: 'Get full details for a single ADP worker by their Associate OID (AOID), including job, compensation, and contact info.',
        inputSchema: {
          type: 'object',
          properties: {
            aoid: {
              type: 'string',
              description: 'The ADP Associate OID (unique worker identifier)',
            },
          },
          required: ['aoid'],
        },
      },
      {
        name: 'get_workers_meta',
        description: 'Retrieve metadata for the Workers v2 API, including available fields and their data types.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_worker_time_off_requests',
        description: 'Retrieve time-off requests for a specific ADP worker by AOID with optional date range filter.',
        inputSchema: {
          type: 'object',
          properties: {
            aoid: {
              type: 'string',
              description: 'The ADP Associate OID of the worker',
            },
            start_date: {
              type: 'string',
              description: 'Start date for the query (YYYY-MM-DD)',
            },
            end_date: {
              type: 'string',
              description: 'End date for the query (YYYY-MM-DD)',
            },
          },
          required: ['aoid'],
        },
      },
      {
        name: 'get_worker_leave_requests',
        description: 'Retrieve leave of absence requests for a specific ADP worker by AOID.',
        inputSchema: {
          type: 'object',
          properties: {
            aoid: {
              type: 'string',
              description: 'The ADP Associate OID of the worker',
            },
          },
          required: ['aoid'],
        },
      },
      {
        name: 'get_payroll_data',
        description: 'Retrieve payroll data from ADP Pay Data Input v1 API, including earnings, deductions, and net pay with optional OData filter.',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: 'Maximum payroll records to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0)',
            },
            filter: {
              type: 'string',
              description: 'OData filter string to narrow payroll results',
            },
          },
        },
      },
      {
        name: 'list_pay_statements',
        description: 'List pay statements (pay stubs) for a specific worker by AOID, showing gross pay, deductions, and net pay per period.',
        inputSchema: {
          type: 'object',
          properties: {
            aoid: {
              type: 'string',
              description: 'The ADP Associate OID of the worker',
            },
            top: {
              type: 'number',
              description: 'Maximum pay statements to return (default: 25)',
            },
            skip: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0)',
            },
          },
          required: ['aoid'],
        },
      },
      {
        name: 'list_organization_departments',
        description: 'List departments and organizational units in ADP Workforce Now.',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: 'Maximum departments to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_job_classifications',
        description: 'List job codes and classifications defined in ADP Workforce Now.',
        inputSchema: {
          type: 'object',
          properties: {
            top: {
              type: 'number',
              description: 'Maximum job classifications to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_worker_benefits',
        description: 'List benefit enrollments for a specific ADP worker by AOID, including health, dental, and retirement plans.',
        inputSchema: {
          type: 'object',
          properties: {
            aoid: {
              type: 'string',
              description: 'The ADP Associate OID of the worker',
            },
          },
          required: ['aoid'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_workers':
          return await this.listWorkers(args);
        case 'get_worker':
          return await this.getWorker(args);
        case 'get_workers_meta':
          return await this.getWorkersMeta(args);
        case 'get_worker_time_off_requests':
          return await this.getWorkerTimeOffRequests(args);
        case 'get_worker_leave_requests':
          return await this.getWorkerLeaveRequests(args);
        case 'get_payroll_data':
          return await this.getPayrollData(args);
        case 'list_pay_statements':
          return await this.listPayStatements(args);
        case 'list_organization_departments':
          return await this.listOrganizationDepartments(args);
        case 'list_job_classifications':
          return await this.listJobClassifications(args);
        case 'list_worker_benefits':
          return await this.listWorkerBenefits(args);
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

  private async fetch(url: string): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
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
        content: [{ type: 'text', text: `ADP API error HTTP ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ADP returned non-JSON response (HTTP ${response.status})`); }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listWorkers(args: Record<string, unknown>): Promise<ToolResult> {
    const top = (args.top as number) || 100;
    const skip = (args.skip as number) || 0;
    let url = `${this.baseUrl}/hr/v2/workers?$top=${top}&$skip=${skip}`;
    if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;
    return this.fetch(url);
  }

  private async getWorker(args: Record<string, unknown>): Promise<ToolResult> {
    const aoid = args.aoid as string;
    if (!aoid) return { content: [{ type: 'text', text: 'aoid is required' }], isError: true };
    return this.fetch(`${this.baseUrl}/hr/v2/workers/${encodeURIComponent(aoid)}`);
  }

  private async getWorkersMeta(_args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetch(`${this.baseUrl}/hr/v2/workers/meta`);
  }

  private async getWorkerTimeOffRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const aoid = args.aoid as string;
    if (!aoid) return { content: [{ type: 'text', text: 'aoid is required' }], isError: true };
    let url = `${this.baseUrl}/time/v2/workers/${encodeURIComponent(aoid)}/time-off-details/time-off-requests`;
    const params: string[] = [];
    if (args.start_date) params.push(`startDate=${encodeURIComponent(args.start_date as string)}`);
    if (args.end_date) params.push(`endDate=${encodeURIComponent(args.end_date as string)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.fetch(url);
  }

  private async getWorkerLeaveRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const aoid = args.aoid as string;
    if (!aoid) return { content: [{ type: 'text', text: 'aoid is required' }], isError: true };
    return this.fetch(`${this.baseUrl}/time/v2/workers/${encodeURIComponent(aoid)}/leave-requests`);
  }

  private async getPayrollData(args: Record<string, unknown>): Promise<ToolResult> {
    const top = (args.top as number) || 100;
    const skip = (args.skip as number) || 0;
    let url = `${this.baseUrl}/payroll/v1/paydata?$top=${top}&$skip=${skip}`;
    if (args.filter) url += `&$filter=${encodeURIComponent(args.filter as string)}`;
    return this.fetch(url);
  }

  private async listPayStatements(args: Record<string, unknown>): Promise<ToolResult> {
    const aoid = args.aoid as string;
    if (!aoid) return { content: [{ type: 'text', text: 'aoid is required' }], isError: true };
    const top = (args.top as number) || 25;
    const skip = (args.skip as number) || 0;
    return this.fetch(`${this.baseUrl}/payroll/v1/workers/${encodeURIComponent(aoid)}/pay-statements?$top=${top}&$skip=${skip}`);
  }

  private async listOrganizationDepartments(args: Record<string, unknown>): Promise<ToolResult> {
    const top = (args.top as number) || 100;
    const skip = (args.skip as number) || 0;
    return this.fetch(`${this.baseUrl}/hr/v2/organization-departments?$top=${top}&$skip=${skip}`);
  }

  private async listJobClassifications(args: Record<string, unknown>): Promise<ToolResult> {
    const top = (args.top as number) || 100;
    const skip = (args.skip as number) || 0;
    return this.fetch(`${this.baseUrl}/hr/v2/worker-management/job-classifications?$top=${top}&$skip=${skip}`);
  }

  private async listWorkerBenefits(args: Record<string, unknown>): Promise<ToolResult> {
    const aoid = args.aoid as string;
    if (!aoid) return { content: [{ type: 'text', text: 'aoid is required' }], isError: true };
    return this.fetch(`${this.baseUrl}/benefits/v2/workers/${encodeURIComponent(aoid)}/enrollments`);
  }

  static catalog() {
    return {
      name: 'adp',
      displayName: 'ADP',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['adp'],
      toolNames: ['list_workers', 'get_worker', 'get_workers_meta', 'get_worker_time_off_requests', 'get_worker_leave_requests', 'get_payroll_data', 'list_pay_statements', 'list_organization_departments', 'list_job_classifications', 'list_worker_benefits'],
      description: 'ADP adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
