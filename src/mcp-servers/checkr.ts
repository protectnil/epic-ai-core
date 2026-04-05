/**
 * Checkr MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.checkr.com/ (production), https://mcp.checkr-staging.com/ (staging)
// Docs: https://docs.checkr.com/mcp/ — transport: streamable-HTTP, auth: OAuth Dynamic Client Registration
// Vendor MCP is official (published by Checkr Inc.) and actively maintained (2025-2026).
// Vendor MCP covers: ~4 read-only tools (get_candidate, get_candidates_table, get_report,
//   get_screening_details). REST API covers write operations (create_candidate, create_report,
//   create_invitation, create_adverse_action, create_geo) not exposed by the MCP.
// Vendor MCP FAILS criterion 3: exposes only ~4 tools (< 10 threshold). Use REST adapter.
// Recommendation: use-rest-api — vendor MCP covers only read-only subset (< 10 tools);
//   REST adapter provides full CRUD coverage including create/write operations.
//
// Base URL: https://api.checkr.com/v1
// Auth: HTTP Basic — API key as username, empty password (Base64 encoded)
// Docs: https://docs.checkr.com/
// Rate limits: Not publicly documented; Checkr applies per-account throttling

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CheckrConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CheckrMCPServer extends MCPAdapterBase {
  private readonly authHeader: string;
  private readonly baseUrl: string;

  constructor(config: CheckrConfig) {
    super();
    // Checkr Basic auth: API key as username, empty password
    const credentials = Buffer.from(`${config.apiKey}:`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.baseUrl = config.baseUrl || 'https://api.checkr.com/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_candidate',
        description: 'Create a new candidate record in Checkr to begin the background check process',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: {
              type: 'string',
              description: 'Candidate first name',
            },
            last_name: {
              type: 'string',
              description: 'Candidate last name',
            },
            email: {
              type: 'string',
              description: 'Candidate email address (used for invitation delivery)',
            },
            phone: {
              type: 'string',
              description: 'Candidate phone number',
            },
            zipcode: {
              type: 'string',
              description: 'Candidate zip/postal code',
            },
            driver_license_number: {
              type: 'string',
              description: 'Driver license number (required for MVR screenings)',
            },
            driver_license_state: {
              type: 'string',
              description: 'Two-letter US state code for the driver license',
            },
            work_locations: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of work location objects with country, state, and city fields',
            },
          },
          required: ['first_name', 'last_name', 'email'],
        },
      },
      {
        name: 'get_candidate',
        description: 'Retrieve full details for a specific candidate by their Checkr candidate ID',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'The Checkr candidate ID',
            },
          },
          required: ['candidate_id'],
        },
      },
      {
        name: 'list_candidates',
        description: 'List all candidates in the account with optional filtering by email and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max: 100, default: 25)',
            },
            email: {
              type: 'string',
              description: 'Filter candidates by email address',
            },
          },
        },
      },
      {
        name: 'create_report',
        description: 'Create a background check report for a candidate using a specified screening package',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'The Checkr candidate ID to run the report for',
            },
            package: {
              type: 'string',
              description: 'Background check package slug (e.g. tasker_standard, driver_pro)',
            },
            node: {
              type: 'string',
              description: 'Node (work location) custom ID — required for compliance in multi-location accounts',
            },
          },
          required: ['candidate_id', 'package'],
        },
      },
      {
        name: 'get_report',
        description: 'Retrieve the current status and results of a specific background check report',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'The Checkr report ID',
            },
          },
          required: ['report_id'],
        },
      },
      {
        name: 'list_reports',
        description: 'List background check reports with optional filters for candidate ID or report status',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'Filter reports by candidate ID',
            },
            status: {
              type: 'string',
              description: 'Filter by report status: pending, complete, suspended, dispute, pre_adverse_action, post_adverse_action',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max: 100, default: 25)',
            },
          },
        },
      },
      {
        name: 'list_packages',
        description: 'List all background check packages available in the account with their included screenings',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'create_invitation',
        description: 'Send a candidate invitation email for self-service background check data collection',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'The Checkr candidate ID to invite',
            },
            package: {
              type: 'string',
              description: 'Background check package slug for the invitation',
            },
          },
          required: ['candidate_id', 'package'],
        },
      },
      {
        name: 'get_invitation',
        description: 'Retrieve the current status of a specific candidate invitation by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            invitation_id: {
              type: 'string',
              description: 'The Checkr invitation ID to retrieve',
            },
          },
          required: ['invitation_id'],
        },
      },
      {
        name: 'list_invitations',
        description: 'List candidate invitations with optional filters for candidate ID and status',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'Filter invitations by candidate ID',
            },
            status: {
              type: 'string',
              description: 'Filter by invitation status: pending, completed, expired',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (max: 100, default: 25)',
            },
          },
        },
      },
      {
        name: 'create_geo',
        description: 'Create a geo (work location) to enforce state-specific adverse action compliance requirements',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the geo (e.g. "California Warehouse")',
            },
            country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. US)',
            },
            state: {
              type: 'string',
              description: 'Two-letter US state code (e.g. CA)',
            },
            city: {
              type: 'string',
              description: 'City name for the work location',
            },
          },
          required: ['name', 'country'],
        },
      },
      {
        name: 'list_geos',
        description: 'List all geos (work locations) defined in the account for compliance routing',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_geo',
        description: 'Retrieve details of a specific geo (work location) by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            geo_id: {
              type: 'string',
              description: 'The Checkr geo ID to retrieve',
            },
          },
          required: ['geo_id'],
        },
      },
      {
        name: 'list_adverse_actions',
        description: 'List adverse action records with optional filters for candidate ID and current status',
        inputSchema: {
          type: 'object',
          properties: {
            candidate_id: {
              type: 'string',
              description: 'Filter adverse actions by candidate ID',
            },
            status: {
              type: 'string',
              description: 'Filter by adverse action status: pre_notice, post_notice, dispute',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
          },
        },
      },
      {
        name: 'create_adverse_action',
        description: 'Initiate a pre-adverse or post-adverse action notice against a candidate report',
        inputSchema: {
          type: 'object',
          properties: {
            report_id: {
              type: 'string',
              description: 'The Checkr report ID to initiate adverse action on',
            },
            post_notice_scheduled_at: {
              type: 'string',
              description: 'ISO 8601 datetime to schedule automatic post-notice delivery (optional)',
            },
          },
          required: ['report_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_candidate':
          return await this.createCandidate(args);
        case 'get_candidate':
          return await this.getCandidate(args);
        case 'list_candidates':
          return await this.listCandidates(args);
        case 'create_report':
          return await this.createReport(args);
        case 'get_report':
          return await this.getReport(args);
        case 'list_reports':
          return await this.listReports(args);
        case 'list_packages':
          return await this.listPackages(args);
        case 'create_invitation':
          return await this.createInvitation(args);
        case 'get_invitation':
          return await this.getInvitation(args);
        case 'list_invitations':
          return await this.listInvitations(args);
        case 'create_geo':
          return await this.createGeo(args);
        case 'list_geos':
          return await this.listGeos(args);
        case 'get_geo':
          return await this.getGeo(args);
        case 'list_adverse_actions':
          return await this.listAdverseActions(args);
        case 'create_adverse_action':
          return await this.createAdverseAction(args);
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

  private get reqHeaders(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async checkrGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.reqHeaders });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Checkr API error (HTTP ${response.status}): ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Checkr returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async checkrPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.reqHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Checkr API error (HTTP ${response.status}): ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Checkr returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildQueryString(params: Record<string, string | number | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  private async createCandidate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name || !args.email) {
      return { content: [{ type: 'text', text: 'first_name, last_name, and email are required' }], isError: true };
    }
    return this.checkrPost('/candidates', args as Record<string, unknown>);
  }

  private async getCandidate(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.candidate_id as string;
    if (!id) return { content: [{ type: 'text', text: 'candidate_id is required' }], isError: true };
    return this.checkrGet(`/candidates/${encodeURIComponent(id)}`);
  }

  private async listCandidates(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({
      page: args.page as number,
      per_page: args.per_page as number,
      email: args.email as string,
    });
    return this.checkrGet(`/candidates${qs}`);
  }

  private async createReport(args: Record<string, unknown>): Promise<ToolResult> {
    const candidateId = args.candidate_id as string;
    const pkg = args.package as string;
    if (!candidateId || !pkg) {
      return { content: [{ type: 'text', text: 'candidate_id and package are required' }], isError: true };
    }
    const body: Record<string, unknown> = { candidate_id: candidateId, package: pkg };
    if (args.node) body.node = args.node;
    return this.checkrPost('/reports', body);
  }

  private async getReport(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.report_id as string;
    if (!id) return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    return this.checkrGet(`/reports/${encodeURIComponent(id)}`);
  }

  private async listReports(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({
      candidate_id: args.candidate_id as string,
      status: args.status as string,
      page: args.page as number,
      per_page: args.per_page as number,
    });
    return this.checkrGet(`/reports${qs}`);
  }

  private async listPackages(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({
      page: args.page as number,
      per_page: args.per_page as number,
    });
    return this.checkrGet(`/packages${qs}`);
  }

  private async createInvitation(args: Record<string, unknown>): Promise<ToolResult> {
    const candidateId = args.candidate_id as string;
    const pkg = args.package as string;
    if (!candidateId || !pkg) {
      return { content: [{ type: 'text', text: 'candidate_id and package are required' }], isError: true };
    }
    return this.checkrPost('/invitations', { candidate_id: candidateId, package: pkg });
  }

  private async getInvitation(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.invitation_id as string;
    if (!id) return { content: [{ type: 'text', text: 'invitation_id is required' }], isError: true };
    return this.checkrGet(`/invitations/${encodeURIComponent(id)}`);
  }

  private async listInvitations(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({
      candidate_id: args.candidate_id as string,
      status: args.status as string,
      page: args.page as number,
      per_page: args.per_page as number,
    });
    return this.checkrGet(`/invitations${qs}`);
  }

  private async createGeo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.country) {
      return { content: [{ type: 'text', text: 'name and country are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, country: args.country };
    if (args.state) body.state = args.state;
    if (args.city) body.city = args.city;
    return this.checkrPost('/geos', body);
  }

  private async listGeos(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({
      page: args.page as number,
      per_page: args.per_page as number,
    });
    return this.checkrGet(`/geos${qs}`);
  }

  private async getGeo(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.geo_id as string;
    if (!id) return { content: [{ type: 'text', text: 'geo_id is required' }], isError: true };
    return this.checkrGet(`/geos/${encodeURIComponent(id)}`);
  }

  private async listAdverseActions(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString({
      candidate_id: args.candidate_id as string,
      status: args.status as string,
      page: args.page as number,
      per_page: args.per_page as number,
    });
    return this.checkrGet(`/adverse_actions${qs}`);
  }

  private async createAdverseAction(args: Record<string, unknown>): Promise<ToolResult> {
    const reportId = args.report_id as string;
    if (!reportId) return { content: [{ type: 'text', text: 'report_id is required' }], isError: true };
    const body: Record<string, unknown> = { report_id: reportId };
    if (args.post_notice_scheduled_at) body.post_notice_scheduled_at = args.post_notice_scheduled_at;
    return this.checkrPost('/adverse_actions', body);
  }

  static catalog() {
    return {
      name: 'checkr',
      displayName: 'Checkr',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: ['checkr'],
      toolNames: ['create_candidate', 'get_candidate', 'list_candidates', 'create_report', 'get_report', 'list_reports', 'list_packages', 'create_invitation', 'get_invitation', 'list_invitations', 'create_geo', 'list_geos', 'get_geo', 'list_adverse_actions', 'create_adverse_action'],
      description: 'Checkr adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
