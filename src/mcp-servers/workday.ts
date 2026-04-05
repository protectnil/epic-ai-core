/**
 * Workday MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CDataSoftware/workday-mcp-server-by-cdata — read-only JDBC bridge
//   requiring a CData license. Transport: stdio. Auth: CData JDBC driver credentials.
//   No official MCP server from Workday Inc. as of 2026-03 (MCP support announced at DevCon 2025,
//   not yet released). Our adapter uses the native Workday REST API directly.
// Recommendation: Use CData MCP for read-only BI/reporting use cases. Use this adapter for full
//   CRUD access against the Workday REST API without a CData license.
//
// Base URL: Tenant-specific — caller must supply the ccx/api base URL from their Workday tenant.
//   Example: https://wd5-impl-services1.workday.com/ccx/api
//   Endpoint pattern: /{service}/{version}/{tenant}/{resource}
//   Services used: staffing (v5+), timeTracking (v3+), payrollInterface (v1), recruiting (v1)
// Auth: OAuth2 Bearer — obtain token from the Token Endpoint in Workday's "View API Clients" report.
//   Workday uses tenant-specific token endpoints; the caller must supply an access_token.
// Docs: https://community.workday.com/sites/default/files/file-hosting/restapi/index.html
// Rate limits: Not publicly documented; Workday recommends avoiding concurrent burst requests.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WorkdayConfig {
  /** Full ccx/api base URL, e.g. "https://wd5-impl-services1.workday.com/ccx/api" */
  baseUrl: string;
  /** Workday tenant name, e.g. "mycompany_prd1" */
  tenant: string;
  /** OAuth2 Bearer access token obtained from the Workday token endpoint */
  accessToken: string;
}

export class WorkdayMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly tenant: string;
  private readonly accessToken: string;

  constructor(config: WorkdayConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.tenant = config.tenant;
    this.accessToken = config.accessToken;
  }

  static catalog() {
    return {
      name: 'workday',
      displayName: 'Workday',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: ['workday', 'hcm', 'hr', 'worker', 'employee', 'payroll', 'recruiting', 'position', 'organization', 'time-off', 'staffing'],
      toolNames: [
        'list_workers', 'get_worker', 'list_organizations', 'get_organization',
        'list_positions', 'get_position',
        'list_job_requisitions', 'get_job_requisition',
        'get_worker_time_off', 'list_time_off_types',
        'list_payroll_results',
      ],
      description: 'HR and workforce management: list workers, organizations, positions, job requisitions, payroll results, and time-off entries via the Workday REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workers',
        description: 'List workers from Workday Staffing with optional name search and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of workers to return (default: 100)' },
            offset: { type: 'number', description: 'Number of records to skip for pagination (default: 0)' },
            search: { type: 'string', description: 'Filter workers by name (optional)' },
          },
        },
      },
      {
        name: 'get_worker',
        description: 'Get full details for a single Workday worker by Worker ID, including position, compensation, and employment status',
        inputSchema: {
          type: 'object',
          properties: {
            worker_id: { type: 'string', description: 'Workday Worker ID (WID reference string)' },
          },
          required: ['worker_id'],
        },
      },
      {
        name: 'list_organizations',
        description: 'List Workday organizations — supervisory orgs, cost centers, companies — with optional type filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Organization type filter: SUPERVISORY, COST_CENTER, COMPANY (optional)' },
            limit: { type: 'number', description: 'Maximum number of organizations to return (default: 100)' },
            offset: { type: 'number', description: 'Number of records to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Get details for a single Workday organization by organization ID including members and hierarchy',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: { type: 'string', description: 'Workday organization ID (WID)' },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'list_positions',
        description: 'List open and filled positions in Workday with optional status filter, useful for headcount planning',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by position status: OPEN or FILLED (optional — returns all if omitted)' },
            limit: { type: 'number', description: 'Maximum number of positions to return (default: 100)' },
            offset: { type: 'number', description: 'Number of records to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_position',
        description: 'Get full details for a single Workday position by position ID including job profile and organization',
        inputSchema: {
          type: 'object',
          properties: {
            position_id: { type: 'string', description: 'Workday position ID (WID)' },
          },
          required: ['position_id'],
        },
      },
      {
        name: 'list_job_requisitions',
        description: 'List job requisitions in Workday Recruiting with optional status filter, including title, hiring manager, and target hire date',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by requisition status: OPEN, FILLED, CANCELLED (optional)' },
            limit: { type: 'number', description: 'Maximum number of requisitions to return (default: 100)' },
            offset: { type: 'number', description: 'Number of records to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_job_requisition',
        description: 'Get full details for a single Workday job requisition by requisition ID including job profile and candidates',
        inputSchema: {
          type: 'object',
          properties: {
            requisition_id: { type: 'string', description: 'Workday job requisition ID (WID)' },
          },
          required: ['requisition_id'],
        },
      },
      {
        name: 'get_worker_time_off',
        description: 'Retrieve time-off entries for a Workday worker via the Time Tracking service, with optional date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            worker_id: { type: 'string', description: 'Workday Worker ID' },
            start_date: { type: 'string', description: 'Start of date range (YYYY-MM-DD) (optional)' },
            end_date: { type: 'string', description: 'End of date range (YYYY-MM-DD) (optional)' },
          },
          required: ['worker_id'],
        },
      },
      {
        name: 'list_time_off_types',
        description: 'List available time-off types configured in Workday for a tenant (e.g. Vacation, Sick, Parental Leave)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of time-off types to return (default: 100)' },
            offset: { type: 'number', description: 'Number of records to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'list_payroll_results',
        description: 'Retrieve payroll run results for a date range via Workday Payroll Interface, with optional worker filter',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string', description: 'Payroll period start date (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'Payroll period end date (YYYY-MM-DD)' },
            worker_id: { type: 'string', description: 'Filter results to a specific worker ID (optional)' },
            limit: { type: 'number', description: 'Maximum number of results to return (default: 100)' },
            offset: { type: 'number', description: 'Number of records to skip for pagination (default: 0)' },
          },
          required: ['start_date', 'end_date'],
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
        case 'list_organizations':
          return await this.listOrganizations(args);
        case 'get_organization':
          return await this.getOrganization(args);
        case 'list_positions':
          return await this.listPositions(args);
        case 'get_position':
          return await this.getPosition(args);
        case 'list_job_requisitions':
          return await this.listJobRequisitions(args);
        case 'get_job_requisition':
          return await this.getJobRequisition(args);
        case 'get_worker_time_off':
          return await this.getWorkerTimeOff(args);
        case 'list_time_off_types':
          return await this.listTimeOffTypes(args);
        case 'list_payroll_results':
          return await this.listPayrollResults(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private serviceUrl(service: string, version: string, resource: string): string {
    return `${this.baseUrl}/${service}/${version}/${this.tenant}/${resource}`;
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchJson(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders() });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Workday API error: HTTP ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json().catch(() => { throw new Error(`Workday returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listWorkers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    let url = this.serviceUrl('staffing', 'v5', `workers?limit=${limit}&offset=${offset}`);
    if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;
    return this.fetchJson(url);
  }

  private async getWorker(args: Record<string, unknown>): Promise<ToolResult> {
    const url = this.serviceUrl('staffing', 'v5', `workers/${encodeURIComponent(args.worker_id as string)}`);
    return this.fetchJson(url);
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    let url = this.serviceUrl('staffing', 'v5', `organizations?limit=${limit}&offset=${offset}`);
    if (args.type) url += `&type=${encodeURIComponent(args.type as string)}`;
    return this.fetchJson(url);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    const url = this.serviceUrl('staffing', 'v5', `organizations/${encodeURIComponent(args.organization_id as string)}`);
    return this.fetchJson(url);
  }

  private async listPositions(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    let url = this.serviceUrl('staffing', 'v5', `positions?limit=${limit}&offset=${offset}`);
    if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;
    return this.fetchJson(url);
  }

  private async getPosition(args: Record<string, unknown>): Promise<ToolResult> {
    const url = this.serviceUrl('staffing', 'v5', `positions/${encodeURIComponent(args.position_id as string)}`);
    return this.fetchJson(url);
  }

  private async listJobRequisitions(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    let url = this.serviceUrl('recruiting', 'v1', `jobRequisitions?limit=${limit}&offset=${offset}`);
    if (args.status) url += `&status=${encodeURIComponent(args.status as string)}`;
    return this.fetchJson(url);
  }

  private async getJobRequisition(args: Record<string, unknown>): Promise<ToolResult> {
    const url = this.serviceUrl('recruiting', 'v1', `jobRequisitions/${encodeURIComponent(args.requisition_id as string)}`);
    return this.fetchJson(url);
  }

  private async getWorkerTimeOff(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.start_date) params.push(`startDate=${encodeURIComponent(args.start_date as string)}`);
    if (args.end_date) params.push(`endDate=${encodeURIComponent(args.end_date as string)}`);
    const qs = params.length > 0 ? `?${params.join('&')}` : '';
    const url = this.serviceUrl('timeTracking', 'v3', `workers/${encodeURIComponent(args.worker_id as string)}/timeOffEntries${qs}`);
    return this.fetchJson(url);
  }

  private async listTimeOffTypes(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    const url = this.serviceUrl('timeTracking', 'v3', `timeOffTypes?limit=${limit}&offset=${offset}`);
    return this.fetchJson(url);
  }

  private async listPayrollResults(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    let url = this.serviceUrl('payrollInterface', 'v1', `payrollResults?startDate=${encodeURIComponent(args.start_date as string)}&endDate=${encodeURIComponent(args.end_date as string)}&limit=${limit}&offset=${offset}`);
    if (args.worker_id) url += `&worker=${encodeURIComponent(args.worker_id as string)}`;
    return this.fetchJson(url);
  }
}
