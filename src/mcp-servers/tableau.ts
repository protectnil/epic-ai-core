/**
 * Tableau MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/tableau/tableau-mcp — transport: stdio + streamable-HTTP, auth: OAuth2 (connected app)
// Published by Salesforce/Tableau. Actively maintained (v1.17.19, last release Mar 2026).
// Vendor MCP covers: 15 tools — list-datasources, list-workbooks, list-views, query-datasource,
//   get-datasource-metadata, get-workbook, get-view-data, get-view-image,
//   list-all-pulse-metric-definitions, list-pulse-metric-definitions-from-definition-ids,
//   list-pulse-metrics-from-metric-definition-id, list-pulse-metrics-from-metric-ids,
//   list-pulse-metric-subscriptions, generate-pulse-metric-value-insight-bundle,
//   generate-pulse-insight-brief, search-content
// Our adapter covers: 21 tools — workbook/view/datasource/project/user/group/job/schedule/flow management
// Recommendation: use-both — MCP has Pulse tools + query/metadata not in our adapter; our adapter
//   has project/user/group/job/schedule/flow management not in MCP. Full coverage requires union.
//
// Integration: use-both
// MCP-sourced tools (15): list-datasources, list-workbooks, list-views, query-datasource,
//   get-datasource-metadata, get-workbook, get-view-data, get-view-image, list-all-pulse-metric-definitions,
//   list-pulse-metric-definitions-from-definition-ids, list-pulse-metrics-from-metric-definition-id,
//   list-pulse-metrics-from-metric-ids, list-pulse-metric-subscriptions,
//   generate-pulse-metric-value-insight-bundle, generate-pulse-insight-brief, search-content
// REST-sourced tools (21): list_workbooks, get_workbook, list_views, get_view, list_datasources,
//   get_datasource, refresh_datasource, list_projects, create_project, list_users, get_user,
//   list_groups, get_group, list_jobs, get_job, cancel_job, list_schedules, get_schedule,
//   list_flows, run_flow, query_views_for_site
// Combined coverage: 37 unique tools (MCP: 16 unique + REST: 21 total; 7 overlapping operations
//   for list_workbooks/list_datasources/list_views/get_workbook/get_view; FederationManager routes
//   shared operations through MCP by default)
//
// Base URL: https://{serverUrl}/api/{apiVersion}
// Auth: Tableau Personal Access Token (PAT) — sign-in via POST /auth/signin → credentials token
// Docs: https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_ref.htm
// Rate limits: Not formally documented; Cloud applies per-site throttling at high request volumes

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TableauConfig {
  /**
   * Hostname or base URL of the Tableau Server or Tableau Cloud site.
   * Examples: "https://10ay.online.tableau.com", "https://mytableauserver.example.com"
   * Do NOT include "/api/{version}" — appended automatically.
   */
  serverUrl: string;
  /** Tableau REST API version string (e.g. "3.21", "3.24"). */
  apiVersion: string;
  /** Personal Access Token name from Tableau user settings. */
  patName: string;
  /** Personal Access Token secret value. */
  patSecret: string;
  /**
   * Content URL (subpath) of the site. Use "" for the Default site on Tableau Server.
   * For Tableau Cloud, use the site name shown in the URL.
   */
  siteContentUrl: string;
}

export class TableauMCPServer extends MCPAdapterBase {
  private readonly serverUrl: string;
  private readonly apiVersion: string;
  private readonly patName: string;
  private readonly patSecret: string;
  private readonly siteContentUrl: string;
  private credentialsToken: string | null = null;
  private siteId: string | null = null;
  private tokenExpiresAt = 0;

  constructor(config: TableauConfig) {
    super();
    this.serverUrl = config.serverUrl.replace(/\/$/, '');
    this.apiVersion = config.apiVersion;
    this.patName = config.patName;
    this.patSecret = config.patSecret;
    this.siteContentUrl = config.siteContentUrl;
  }

  static catalog() {
    return {
      name: 'tableau',
      displayName: 'Tableau',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['tableau', 'dashboard', 'workbook', 'datasource', 'view', 'report', 'bi', 'analytics', 'extract', 'refresh', 'schedule', 'flow', 'prep'],
      toolNames: [
        'list_workbooks', 'get_workbook', 'list_views', 'get_view',
        'list_datasources', 'get_datasource', 'refresh_datasource',
        'list_projects', 'create_project',
        'list_users', 'get_user',
        'list_groups', 'get_group',
        'list_jobs', 'get_job', 'cancel_job',
        'list_schedules', 'get_schedule',
        'list_flows', 'run_flow',
        'query_views_for_site',
      ],
      description: 'Tableau Server and Cloud: workbooks, views, datasources, projects, users, groups, extract refresh jobs, schedules, and Prep flows.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Workbooks ────────────────────────────────────────────────────────────
      {
        name: 'list_workbooks',
        description: 'List workbooks on the Tableau site with pagination and optional filter expression. Returns project, owner, and last published time.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Workbooks per page (max 1000, default: 100)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
            filter: { type: 'string', description: 'Filter expression (e.g. "name:eq:Sales Dashboard", "projectName:eq:Finance")' },
            sort: { type: 'string', description: 'Sort expression (e.g. "name:asc", "updatedAt:desc")' },
          },
        },
      },
      {
        name: 'get_workbook',
        description: 'Get full details of a specific Tableau workbook by LUID, including project, owner, views, and data connections.',
        inputSchema: {
          type: 'object',
          properties: {
            workbook_id: { type: 'string', description: 'Workbook LUID (Locally Unique ID)' },
          },
          required: ['workbook_id'],
        },
      },
      {
        name: 'list_views',
        description: 'List all views (sheets and dashboards) for a specific Tableau workbook.',
        inputSchema: {
          type: 'object',
          properties: {
            workbook_id: { type: 'string', description: 'Workbook LUID' },
          },
          required: ['workbook_id'],
        },
      },
      {
        name: 'get_view',
        description: 'Get details of a specific Tableau view (sheet or dashboard) by LUID, including usage statistics.',
        inputSchema: {
          type: 'object',
          properties: {
            view_id: { type: 'string', description: 'View LUID' },
          },
          required: ['view_id'],
        },
      },
      // ── Data Sources ─────────────────────────────────────────────────────────
      {
        name: 'list_datasources',
        description: 'List published data sources on the Tableau site with pagination and optional filter.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Data sources per page (max 1000, default: 100)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
            filter: { type: 'string', description: 'Filter expression (e.g. "type:eq:tableau", "projectName:eq:Finance")' },
          },
        },
      },
      {
        name: 'get_datasource',
        description: 'Get details of a specific published Tableau data source by LUID, including connection info and certifications.',
        inputSchema: {
          type: 'object',
          properties: {
            datasource_id: { type: 'string', description: 'Data source LUID' },
          },
          required: ['datasource_id'],
        },
      },
      {
        name: 'refresh_datasource',
        description: 'Trigger an immediate extract refresh for a published Tableau data source. Returns a job ID to track via get_job.',
        inputSchema: {
          type: 'object',
          properties: {
            datasource_id: { type: 'string', description: 'Data source LUID to refresh' },
          },
          required: ['datasource_id'],
        },
      },
      // ── Projects ─────────────────────────────────────────────────────────────
      {
        name: 'list_projects',
        description: 'List all projects on the Tableau site with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Projects per page (max 1000, default: 100)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
            filter: { type: 'string', description: 'Filter expression (e.g. "name:eq:Finance")' },
          },
        },
      },
      {
        name: 'create_project',
        description: 'Create a new project on the Tableau site to organize workbooks and data sources.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name' },
            description: { type: 'string', description: 'Optional project description' },
            parent_project_id: { type: 'string', description: 'LUID of parent project for nested project hierarchy (optional)' },
            content_permissions: { type: 'string', description: 'Content permission model: ManagedByOwner (default) or LockedToProject' },
          },
          required: ['name'],
        },
      },
      // ── Users ────────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List users on the Tableau site with pagination and optional filter.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Users per page (max 1000, default: 100)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
            filter: { type: 'string', description: 'Filter expression (e.g. "name:eq:jsmith", "siteRole:eq:SiteAdministratorExplorer")' },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get details of a specific Tableau site user by LUID, including site role and last login time.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User LUID' },
          },
          required: ['user_id'],
        },
      },
      // ── Groups ───────────────────────────────────────────────────────────────
      {
        name: 'list_groups',
        description: 'List all user groups on the Tableau site, including Active Directory groups if configured.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Groups per page (max 1000, default: 100)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
            filter: { type: 'string', description: 'Filter expression (e.g. "name:eq:Analysts")' },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get details of a specific Tableau group including member count and domain source.',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'string', description: 'Group LUID' },
          },
          required: ['group_id'],
        },
      },
      // ── Jobs ─────────────────────────────────────────────────────────────────
      {
        name: 'list_jobs',
        description: 'List background jobs on the Tableau site (extract refreshes, subscriptions, flows) with status filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Jobs per page (max 1000, default: 100)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
            filter: { type: 'string', description: 'Filter expression (e.g. "status:eq:InProgress", "jobType:eq:RefreshExtract")' },
          },
        },
      },
      {
        name: 'get_job',
        description: 'Get the current status and details of a specific Tableau background job by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Job ID returned by refresh or run operations' },
          },
          required: ['job_id'],
        },
      },
      {
        name: 'cancel_job',
        description: 'Cancel a running Tableau background job (extract refresh, subscription, or flow run).',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: { type: 'string', description: 'Job ID to cancel' },
          },
          required: ['job_id'],
        },
      },
      // ── Schedules ────────────────────────────────────────────────────────────
      {
        name: 'list_schedules',
        description: 'List extract refresh schedules on Tableau Server (not available on Tableau Cloud).',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Schedules per page (default: 100)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_schedule',
        description: 'Get details of a specific Tableau Server extract refresh schedule including frequency and associated workbooks.',
        inputSchema: {
          type: 'object',
          properties: {
            schedule_id: { type: 'string', description: 'Schedule ID' },
          },
          required: ['schedule_id'],
        },
      },
      // ── Flows (Tableau Prep) ─────────────────────────────────────────────────
      {
        name: 'list_flows',
        description: 'List published Tableau Prep flows on the site with pagination and optional filter.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Flows per page (max 1000, default: 100)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
            filter: { type: 'string', description: 'Filter expression (e.g. "projectName:eq:ETL")' },
          },
        },
      },
      {
        name: 'run_flow',
        description: 'Trigger an immediate run of a published Tableau Prep flow. Returns a job ID to track via get_job.',
        inputSchema: {
          type: 'object',
          properties: {
            flow_id: { type: 'string', description: 'Flow LUID to run' },
          },
          required: ['flow_id'],
        },
      },
      // ── Site-level Views ─────────────────────────────────────────────────────
      {
        name: 'query_views_for_site',
        description: 'List all views across the entire Tableau site (not scoped to a single workbook) with pagination and filter.',
        inputSchema: {
          type: 'object',
          properties: {
            page_size: { type: 'number', description: 'Views per page (max 1000, default: 100)' },
            page_number: { type: 'number', description: 'Page number (default: 1)' },
            filter: { type: 'string', description: 'Filter expression (e.g. "name:eq:Overview", "viewUrlName:eq:SalesOverview")' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { token, siteId } = await this.getCredentialsToken();
      const headers: Record<string, string> = {
        'X-Tableau-Auth': token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      const base = `${this.apiBase}/sites/${siteId}`;

      switch (name) {
        case 'list_workbooks':
          return await this.paginatedGet(`${base}/workbooks`, args, headers);
        case 'get_workbook':
          return await this.simpleGet(`${base}/workbooks/${encodeURIComponent(args.workbook_id as string)}`, headers);
        case 'list_views':
          return await this.simpleGet(`${base}/workbooks/${encodeURIComponent(args.workbook_id as string)}/views`, headers);
        case 'get_view':
          return await this.simpleGet(`${base}/views/${encodeURIComponent(args.view_id as string)}`, headers);
        case 'list_datasources':
          return await this.paginatedGet(`${base}/datasources`, args, headers);
        case 'get_datasource':
          return await this.simpleGet(`${base}/datasources/${encodeURIComponent(args.datasource_id as string)}`, headers);
        case 'refresh_datasource':
          return await this.simplePost(
            `${base}/datasources/${encodeURIComponent(args.datasource_id as string)}/refresh`,
            {}, headers
          );
        case 'list_projects':
          return await this.paginatedGet(`${base}/projects`, args, headers);
        case 'create_project':
          return await this.createProject(base, args, headers);
        case 'list_users':
          return await this.paginatedGet(`${base}/users`, args, headers);
        case 'get_user':
          return await this.simpleGet(`${base}/users/${encodeURIComponent(args.user_id as string)}`, headers);
        case 'list_groups':
          return await this.paginatedGet(`${base}/groups`, args, headers);
        case 'get_group':
          return await this.simpleGet(`${base}/groups/${encodeURIComponent(args.group_id as string)}`, headers);
        case 'list_jobs':
          return await this.paginatedGet(`${base}/jobs`, args, headers);
        case 'get_job':
          return await this.simpleGet(`${base}/jobs/${encodeURIComponent(args.job_id as string)}`, headers);
        case 'cancel_job':
          return await this.cancelJob(base, args, headers);
        case 'list_schedules':
          return await this.paginatedGet(`${this.apiBase}/schedules`, args, headers);
        case 'get_schedule':
          return await this.simpleGet(`${this.apiBase}/schedules/${encodeURIComponent(args.schedule_id as string)}`, headers);
        case 'list_flows':
          return await this.paginatedGet(`${base}/flows`, args, headers);
        case 'run_flow':
          return await this.simplePost(
            `${base}/flows/${encodeURIComponent(args.flow_id as string)}/run`,
            {}, headers
          );
        case 'query_views_for_site':
          return await this.paginatedGet(`${base}/views`, args, headers);
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

  // ── Private helpers ──────────────────────────────────────────────────────────

  private get apiBase(): string {
    return `${this.serverUrl}/api/${this.apiVersion}`;
  }

  /** Sign in using Personal Access Token; cache for 240 minutes with 60s early renewal. */
  private async getCredentialsToken(): Promise<{ token: string; siteId: string }> {
    const now = Date.now();
    if (this.credentialsToken && this.siteId && now < this.tokenExpiresAt - 60_000) {
      return { token: this.credentialsToken, siteId: this.siteId };
    }

    const response = await this.fetchWithRetry(`${this.apiBase}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        credentials: {
          personalAccessTokenName: this.patName,
          personalAccessTokenSecret: this.patSecret,
          site: { contentUrl: this.siteContentUrl },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Tableau sign-in failed: HTTP ${response.status} ${response.statusText}`);
    }

    let data: { credentials: { token: string; site: { id: string } } };
    try {
      data = await response.json() as { credentials: { token: string; site: { id: string } } };
    } catch {
      throw new Error(`Tableau returned non-JSON response during sign-in (HTTP ${response.status})`);
    }

    this.credentialsToken = data.credentials.token;
    this.siteId = data.credentials.site.id;
    this.tokenExpiresAt = now + 240 * 60 * 1_000;
    return { token: this.credentialsToken, siteId: this.siteId };
  }

  private async simpleGet(url: string, headers: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async simplePost(url: string, body: unknown, headers: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async paginatedGet(url: string, args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) ?? 100;
    const pageNumber = (args.page_number as number) ?? 1;
    let fullUrl = `${url}?pageSize=${pageSize}&pageNumber=${pageNumber}`;
    if (args.filter) fullUrl += `&filter=${encodeURIComponent(args.filter as string)}`;
    if (args.sort) fullUrl += `&sort=${encodeURIComponent(args.sort as string)}`;
    return this.simpleGet(fullUrl, headers);
  }

  private async createProject(base: string, args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      project: {
        name: args.name,
        description: args.description ?? '',
        contentPermissions: (args.content_permissions as string) ?? 'ManagedByOwner',
      },
    };
    if (args.parent_project_id) {
      (body['project'] as Record<string, unknown>)['parentProjectId'] = args.parent_project_id;
    }
    return this.simplePost(`${base}/projects`, body, headers);
  }

  private async cancelJob(base: string, args: Record<string, unknown>, headers: Record<string, string>): Promise<ToolResult> {
    const url = `${base}/jobs/${encodeURIComponent(args.job_id as string)}`;
    // Tableau REST API: PUT with no request body (docs confirmed — response body is also empty, returns 200)
    const response = await this.fetchWithRetry(url, { method: 'PUT', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: HTTP ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
