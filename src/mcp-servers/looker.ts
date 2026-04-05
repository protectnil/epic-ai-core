/**
 * Looker MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/googleapis/genai-toolbox — transport: stdio, auth: client_id + client_secret
// Google publishes the "MCP Toolbox for Databases" (googleapis/genai-toolbox) which includes a prebuilt Looker
// integration. Last release: v0.28.0 (2026-03-02), actively maintained. MCP tool count: 30+ Looker-specific tools
// (get_models, get_explores, get_dimensions, get_measures, get_filters, get_parameters, query, query_sql,
//  query_url, get_looks, run_look, make_look, get_dashboards, run_dashboard, make_dashboard,
//  add_dashboard_element, add_dashboard_filter, generate_embed_url, health_pulse, health_analyze, health_vacuum,
//  dev_mode, get_projects, get_project_files, get_project_file, create_project_file, update_project_file,
//  delete_project_file, get_connections, get_connection_schemas, get_connection_databases, and more).
// Our adapter covers: 18 tools (core Looks, Dashboards, Queries, Explores, Folders, Users, ScheduledPlans).
// Recommendation: use-both — the MCP toolbox covers LookML authoring, SQL generation, and health checks that
//   our REST adapter doesn't implement. Our REST adapter covers user management, folder navigation, and
//   scheduled plans that the MCP toolbox doesn't expose. Full coverage requires both.
//
// Integration: use-both
// MCP-sourced tools (unique to MCP): [get_models, query_sql, query_url, health_pulse, health_analyze,
//   health_vacuum, dev_mode, get_projects, get_project_files, get_project_file, create_project_file,
//   update_project_file, delete_project_file, get_connections, get_connection_schemas, get_dimensions,
//   get_measures, get_filters, get_parameters, get_connection_databases, add_dashboard_element,
//   add_dashboard_filter, generate_embed_url, run_dashboard]
// REST-sourced tools (unique to our adapter): [create_look, update_look, list_folders, get_folder,
//   list_users, get_current_user, list_scheduled_plans]
// Shared (in both MCP and REST): [list_looks/get_looks, get_look, run_look, list_dashboards/get_dashboards,
//   get_dashboard, search_dashboards, run_inline_query/query, create_query, run_query_by_id,
//   list_explores/get_explores, get_explore, make_look, make_dashboard]
//
// Base URL: https://{instance}:19999  (on-premises)  or  https://{instance}.cloud.looker.com  (GCC)
// Auth: Looker API 4.0 login — POST /api/4.0/login with client_id + client_secret as form body;
//       returns access token. Authorization header format: "token {access_token}" (NOT "Bearer").
//       API 3.1 was removed in Looker 23.18.
// Docs: https://docs.cloud.google.com/looker/docs/reference/looker-api/latest
//       https://docs.cloud.google.com/looker/docs/api-auth
// Rate limits: Not publicly documented; governed by instance configuration (default ~10 req/s)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LookerConfig {
  /** Looker API client ID from the Admin > API Keys panel. */
  clientId: string;
  /** Looker API client secret from the Admin > API Keys panel. */
  clientSecret: string;
  /**
   * Base URL of the Looker instance including port if required.
   * On-premises example:  https://mycompany.looker.com:19999
   * Looker (Google Cloud core): https://mycompany.cloud.looker.com
   */
  baseUrl: string;
}

export class LookerMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: LookerConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'looker',
      displayName: 'Looker',
      version: '1.0.0',
      category: 'data',
      keywords: ['looker', 'bi', 'business-intelligence', 'dashboard', 'look', 'explore', 'query', 'lookml', 'report', 'analytics', 'google-cloud'],
      toolNames: [
        'list_looks', 'get_look', 'create_look', 'update_look', 'run_look',
        'list_dashboards', 'get_dashboard', 'search_dashboards',
        'run_inline_query', 'create_query', 'run_query_by_id',
        'list_explores', 'get_explore',
        'list_folders', 'get_folder',
        'list_users', 'get_current_user',
        'list_scheduled_plans',
      ],
      description: 'Looker BI: run Looks and queries, browse dashboards and Explores, manage folders and users, schedule data deliveries.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Looks ──────────────────────────────────────────────────────────────
      {
        name: 'list_looks',
        description: 'List saved Looks (named queries) in the Looker instance with optional pagination and field selection',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of Looks to return (default: 20, max: 500)' },
            offset: { type: 'number', description: 'Number of Looks to skip for pagination (default: 0)' },
            fields: { type: 'string', description: 'Comma-separated list of response fields to include (e.g. id,title,description)' },
          },
        },
      },
      {
        name: 'get_look',
        description: 'Get metadata for a specific Look by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            look_id: { type: 'number', description: 'Numeric Looker Look ID' },
            fields: { type: 'string', description: 'Comma-separated list of response fields to include' },
          },
          required: ['look_id'],
        },
      },
      {
        name: 'create_look',
        description: 'Create a new saved Look from an existing Looker query ID',
        inputSchema: {
          type: 'object',
          properties: {
            query_id: { type: 'number', description: 'Numeric Looker query ID to base the Look on' },
            title: { type: 'string', description: 'Title for the new Look' },
            description: { type: 'string', description: 'Optional description for the Look' },
            space_id: { type: 'number', description: 'Folder/space ID to save the Look in (defaults to personal folder)' },
            is_public: { type: 'boolean', description: 'Whether the Look is publicly visible (default: false)' },
          },
          required: ['query_id', 'title'],
        },
      },
      {
        name: 'update_look',
        description: 'Update an existing Look — title, description, folder, public status, or soft-delete',
        inputSchema: {
          type: 'object',
          properties: {
            look_id: { type: 'number', description: 'Numeric Looker Look ID to update' },
            title: { type: 'string', description: 'New title for the Look' },
            description: { type: 'string', description: 'New description for the Look' },
            deleted: { type: 'boolean', description: 'Set true to soft-delete; false to restore a deleted Look' },
            is_public: { type: 'boolean', description: 'Whether the Look is publicly visible' },
          },
          required: ['look_id'],
        },
      },
      {
        name: 'run_look',
        description: 'Execute a saved Look and return query results in the specified format',
        inputSchema: {
          type: 'object',
          properties: {
            look_id: { type: 'number', description: 'Numeric Looker Look ID to run' },
            result_format: { type: 'string', description: 'Output format: json (default), csv, json_detail, txt, html, md' },
            limit: { type: 'number', description: 'Row limit (default: 500, max: 5000)' },
            apply_formatting: { type: 'boolean', description: 'Apply number and date formatting (default: false)' },
          },
          required: ['look_id'],
        },
      },
      // ── Dashboards ─────────────────────────────────────────────────────────
      {
        name: 'list_dashboards',
        description: 'List all dashboards in the Looker instance with optional pagination and field selection',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of dashboards to return (default: 20)' },
            fields: { type: 'string', description: 'Comma-separated list of response fields to include' },
          },
        },
      },
      {
        name: 'get_dashboard',
        description: 'Get full details of a specific Looker dashboard by ID, including tiles and filters',
        inputSchema: {
          type: 'object',
          properties: {
            dashboard_id: { type: 'string', description: 'Dashboard ID (numeric string or slug)' },
            fields: { type: 'string', description: 'Comma-separated list of response fields to include' },
          },
          required: ['dashboard_id'],
        },
      },
      {
        name: 'search_dashboards',
        description: 'Search dashboards by title, folder, creator, or other criteria',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Filter by dashboard title (case-insensitive partial match)' },
            folder_id: { type: 'string', description: 'Filter dashboards in a specific folder ID' },
            limit: { type: 'number', description: 'Maximum number of results (default: 20)' },
            fields: { type: 'string', description: 'Comma-separated list of response fields to include' },
          },
        },
      },
      // ── Queries ────────────────────────────────────────────────────────────
      {
        name: 'run_inline_query',
        description: 'Run an ad-hoc query against a Looker Explore and return results without saving',
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string', description: 'LookML model name (e.g. ecommerce)' },
            view: { type: 'string', description: 'Explore (view) name within the model (e.g. orders)' },
            fields: { type: 'array', description: 'Array of fully-qualified field names to include (e.g. ["orders.count","orders.created_date"])' },
            filters: { type: 'object', description: 'Key-value filter pairs (e.g. {"orders.status": "complete"})' },
            limit: { type: 'string', description: 'Row limit as a string (default: "500")' },
            result_format: { type: 'string', description: 'Output format: json (default), json_detail, csv' },
            sorts: { type: 'array', description: 'Array of sort strings (e.g. ["orders.count desc"])' },
          },
          required: ['model', 'view', 'fields'],
        },
      },
      {
        name: 'create_query',
        description: 'Create and persist a Looker query object, returning a query ID that can be referenced later',
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string', description: 'LookML model name' },
            view: { type: 'string', description: 'Explore (view) name within the model' },
            fields: { type: 'array', description: 'Array of fully-qualified field names to include' },
            filters: { type: 'object', description: 'Key-value filter pairs' },
            limit: { type: 'string', description: 'Row limit as a string (default: "500")' },
            sorts: { type: 'array', description: 'Array of sort strings' },
          },
          required: ['model', 'view', 'fields'],
        },
      },
      {
        name: 'run_query_by_id',
        description: 'Run a previously created Looker query by its query ID and return results',
        inputSchema: {
          type: 'object',
          properties: {
            query_id: { type: 'number', description: 'Numeric Looker query ID to run' },
            result_format: { type: 'string', description: 'Output format: json (default), json_detail, csv, txt' },
            limit: { type: 'number', description: 'Row limit override (default: uses query setting)' },
          },
          required: ['query_id'],
        },
      },
      // ── Explores ───────────────────────────────────────────────────────────
      {
        name: 'list_explores',
        description: 'List all Explores available in a specific LookML model',
        inputSchema: {
          type: 'object',
          properties: {
            model_name: { type: 'string', description: 'LookML model name to list Explores for' },
            fields: { type: 'string', description: 'Comma-separated list of response fields to include' },
          },
          required: ['model_name'],
        },
      },
      {
        name: 'get_explore',
        description: 'Get the full field and filter metadata for a specific LookML model Explore',
        inputSchema: {
          type: 'object',
          properties: {
            model_name: { type: 'string', description: 'LookML model name' },
            explore_name: { type: 'string', description: 'Explore name within the model' },
            fields: { type: 'string', description: 'Comma-separated list of response fields to include' },
          },
          required: ['model_name', 'explore_name'],
        },
      },
      // ── Folders ────────────────────────────────────────────────────────────
      {
        name: 'list_folders',
        description: 'List top-level Looker folders with optional search filters',
        inputSchema: {
          type: 'object',
          properties: {
            fields: { type: 'string', description: 'Comma-separated list of response fields to include' },
          },
        },
      },
      {
        name: 'get_folder',
        description: 'Get details of a specific Looker folder, including its child folders and contents',
        inputSchema: {
          type: 'object',
          properties: {
            folder_id: { type: 'string', description: 'Folder ID to retrieve' },
            fields: { type: 'string', description: 'Comma-separated list of response fields to include' },
          },
          required: ['folder_id'],
        },
      },
      // ── Users ──────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List all Looker users with optional pagination and field selection',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of users to return (default: 20)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            fields: { type: 'string', description: 'Comma-separated list of response fields to include' },
          },
        },
      },
      {
        name: 'get_current_user',
        description: 'Get the profile of the currently authenticated Looker API user',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Scheduled Plans ────────────────────────────────────────────────────
      {
        name: 'list_scheduled_plans',
        description: 'List scheduled delivery plans for Looks or dashboards with optional filter by user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'number', description: 'Filter scheduled plans owned by this user ID (omit to return your own plans)' },
            all_users: { type: 'boolean', description: 'Set true to return plans for all users (requires admin; default: false)' },
            fields: { type: 'string', description: 'Comma-separated list of response fields to include' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_looks':            return await this.listLooks(args);
        case 'get_look':              return await this.getLook(args);
        case 'create_look':           return await this.createLook(args);
        case 'update_look':           return await this.updateLook(args);
        case 'run_look':              return await this.runLook(args);
        case 'list_dashboards':       return await this.listDashboards(args);
        case 'get_dashboard':         return await this.getDashboard(args);
        case 'search_dashboards':     return await this.searchDashboards(args);
        case 'run_inline_query':      return await this.runInlineQuery(args);
        case 'create_query':          return await this.createQuery(args);
        case 'run_query_by_id':       return await this.runQueryById(args);
        case 'list_explores':         return await this.listExplores(args);
        case 'get_explore':           return await this.getExplore(args);
        case 'list_folders':          return await this.listFolders(args);
        case 'get_folder':            return await this.getFolder(args);
        case 'list_users':            return await this.listUsers(args);
        case 'get_current_user':      return await this.getCurrentUser();
        case 'list_scheduled_plans':  return await this.listScheduledPlans(args);
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

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/api/4.0/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`Looker authentication failed: ${response.status} ${response.statusText}`);
    }
    const tokenData = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = tokenData.access_token;
    this.tokenExpiresAt = now + tokenData.expires_in * 1000;
    return this.accessToken;
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string): Promise<unknown> {
    const h = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: h });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} — ${path}`);
    }
    return response.json();
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const h = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} — ${path}`);
    }
    return response.json();
  }

  private async patch(path: string, body: unknown): Promise<unknown> {
    const h = await this.headers();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} — ${path}`);
    }
    return response.json();
  }

  private ok(data: unknown): ToolResult {
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listLooks(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 20;
    const offset = (args.offset as number) ?? 0;
    let path = `/api/4.0/looks?limit=${limit}&offset=${offset}`;
    if (args.fields) path += `&fields=${encodeURIComponent(args.fields as string)}`;
    return this.ok(await this.get(path));
  }

  private async getLook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.look_id) return { content: [{ type: 'text', text: 'look_id is required' }], isError: true };
    let path = `/api/4.0/looks/${encodeURIComponent(args.look_id as number)}`;
    if (args.fields) path += `?fields=${encodeURIComponent(args.fields as string)}`;
    return this.ok(await this.get(path));
  }

  private async createLook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query_id || !args.title) {
      return { content: [{ type: 'text', text: 'query_id and title are required' }], isError: true };
    }
    const body: Record<string, unknown> = { query_id: args.query_id, title: args.title };
    if (args.description) body.description = args.description;
    if (args.space_id) body.folder = { id: String(args.space_id) };
    if (args.is_public !== undefined) body.is_public = args.is_public;
    return this.ok(await this.post('/api/4.0/looks', body));
  }

  private async updateLook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.look_id) return { content: [{ type: 'text', text: 'look_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.title !== undefined) body.title = args.title;
    if (args.description !== undefined) body.description = args.description;
    if (args.deleted !== undefined) body.deleted = args.deleted;
    if (args.is_public !== undefined) body.is_public = args.is_public;
    return this.ok(await this.patch(`/api/4.0/looks/${encodeURIComponent(args.look_id as number)}`, body));
  }

  private async runLook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.look_id) return { content: [{ type: 'text', text: 'look_id is required' }], isError: true };
    const fmt = (args.result_format as string) ?? 'json';
    let path = `/api/4.0/looks/${encodeURIComponent(args.look_id as number)}/run/${encodeURIComponent(fmt)}`;
    const params: string[] = [];
    if (args.limit) params.push(`limit=${encodeURIComponent(args.limit as number)}`);
    if (args.apply_formatting) params.push(`apply_formatting=${String(args.apply_formatting)}`);
    if (params.length) path += `?${params.join('&')}`;
    return this.ok(await this.get(path));
  }

  private async listDashboards(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 20;
    let path = `/api/4.0/dashboards?limit=${limit}`;
    if (args.fields) path += `&fields=${encodeURIComponent(args.fields as string)}`;
    return this.ok(await this.get(path));
  }

  private async getDashboard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.dashboard_id) return { content: [{ type: 'text', text: 'dashboard_id is required' }], isError: true };
    let path = `/api/4.0/dashboards/${encodeURIComponent(args.dashboard_id as string)}`;
    if (args.fields) path += `?fields=${encodeURIComponent(args.fields as string)}`;
    return this.ok(await this.get(path));
  }

  private async searchDashboards(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.title) params.set('title', args.title as string);
    if (args.folder_id) params.set('folder_id', args.folder_id as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.fields) params.set('fields', args.fields as string);
    const path = `/api/4.0/dashboards/search${params.toString() ? '?' + params.toString() : ''}`;
    return this.ok(await this.get(path));
  }

  private async runInlineQuery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model || !args.view || !args.fields) {
      return { content: [{ type: 'text', text: 'model, view, and fields are required' }], isError: true };
    }
    const fmt = (args.result_format as string) ?? 'json';
    const body: Record<string, unknown> = {
      model: args.model,
      view: args.view,
      fields: args.fields,
      limit: (args.limit as string) ?? '500',
    };
    if (args.filters) body.filters = args.filters;
    if (args.sorts) body.sorts = args.sorts;
    return this.ok(await this.post(`/api/4.0/queries/run/${encodeURIComponent(fmt)}`, body));
  }

  private async createQuery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model || !args.view || !args.fields) {
      return { content: [{ type: 'text', text: 'model, view, and fields are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      model: args.model,
      view: args.view,
      fields: args.fields,
      limit: (args.limit as string) ?? '500',
    };
    if (args.filters) body.filters = args.filters;
    if (args.sorts) body.sorts = args.sorts;
    return this.ok(await this.post('/api/4.0/queries', body));
  }

  private async runQueryById(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query_id) return { content: [{ type: 'text', text: 'query_id is required' }], isError: true };
    const fmt = (args.result_format as string) ?? 'json';
    let path = `/api/4.0/queries/${encodeURIComponent(args.query_id as number)}/run/${encodeURIComponent(fmt)}`;
    if (args.limit) path += `?limit=${encodeURIComponent(args.limit as number)}`;
    return this.ok(await this.get(path));
  }

  private async listExplores(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model_name) return { content: [{ type: 'text', text: 'model_name is required' }], isError: true };
    let path = `/api/4.0/lookml_models/${encodeURIComponent(args.model_name as string)}/explores`;
    if (args.fields) path += `?fields=${encodeURIComponent(args.fields as string)}`;
    return this.ok(await this.get(path));
  }

  private async getExplore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.model_name || !args.explore_name) {
      return { content: [{ type: 'text', text: 'model_name and explore_name are required' }], isError: true };
    }
    let path = `/api/4.0/lookml_models/${encodeURIComponent(args.model_name as string)}/explores/${encodeURIComponent(args.explore_name as string)}`;
    if (args.fields) path += `?fields=${encodeURIComponent(args.fields as string)}`;
    return this.ok(await this.get(path));
  }

  private async listFolders(args: Record<string, unknown>): Promise<ToolResult> {
    let path = '/api/4.0/folders';
    if (args.fields) path += `?fields=${encodeURIComponent(args.fields as string)}`;
    return this.ok(await this.get(path));
  }

  private async getFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folder_id) return { content: [{ type: 'text', text: 'folder_id is required' }], isError: true };
    let path = `/api/4.0/folders/${encodeURIComponent(args.folder_id as string)}`;
    if (args.fields) path += `?fields=${encodeURIComponent(args.fields as string)}`;
    return this.ok(await this.get(path));
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 20;
    const offset = (args.offset as number) ?? 0;
    let path = `/api/4.0/users?limit=${limit}&offset=${offset}`;
    if (args.fields) path += `&fields=${encodeURIComponent(args.fields as string)}`;
    return this.ok(await this.get(path));
  }

  private async getCurrentUser(): Promise<ToolResult> {
    return this.ok(await this.get('/api/4.0/user'));
  }

  private async listScheduledPlans(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.user_id) params.set('user_id', String(args.user_id));
    if (args.all_users) params.set('all_users', 'true');
    if (args.fields) params.set('fields', args.fields as string);
    const path = `/api/4.0/scheduled_plans${params.toString() ? '?' + params.toString() : ''}`;
    return this.ok(await this.get(path));
  }
}
