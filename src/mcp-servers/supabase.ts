/**
 * Supabase MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/supabase-community/supabase-mcp — transport: stdio + streamable-HTTP (remote: https://mcp.supabase.com/mcp)
// Actively maintained (launched Apr 2025, actively developed). Official — published by supabase-community (Supabase's official open source org).
// Vendor MCP covers: ~32 tools — database, edge functions, branching, projects, orgs, storage config, docs search.
// Our adapter covers: 15 tools — direct PostgREST data ops (select/insert/update/delete/upsert/rpc), storage objects, auth users, project health.
//
// Integration: use-both
// MCP-sourced tools (27): list_tables, list_extensions, list_migrations, apply_migration, execute_sql, get_logs, get_advisors,
//   get_project_url, get_publishable_keys, generate_typescript_types, list_edge_functions, get_edge_function, deploy_edge_function,
//   list_projects, get_project, create_project, pause_project, restore_project, list_organizations, get_organization,
//   get_cost, confirm_cost, search_docs, create_branch, list_branches, delete_branch, merge_branch, reset_branch, rebase_branch,
//   list_storage_buckets, get_storage_config, update_storage_config
// REST-sourced tools (10): select, insert, update, delete, upsert, rpc, list_storage_objects, list_auth_users, get_auth_user, get_project_health
// Shared (covered by both, MCP takes priority): list_tables, execute_sql, list_projects, get_project, list_storage_buckets
// Combined coverage: 37 tools (MCP: 32 + REST: 15 - shared: 5 — with some rounding due to tool naming differences)
//
// Base URL (data): https://{project}.supabase.co/rest/v1  (PostgREST)
// Base URL (management): https://api.supabase.com/v1
// Auth: Bearer token (anon key or service role key) in Authorization + apikey headers
// Docs: https://supabase.com/docs/reference/api/introduction  |  https://supabase.com/docs/guides/api
// Rate limits: Management API — 120 requests/minute per user per project/org; 429 on breach

import { ToolDefinition, ToolResult } from './types.js';

interface SupabaseConfig {
  /** Supabase project ref (e.g. "abcdefghijklmnop") */
  project: string;
  /** Anon public key for client-level access (respects RLS) */
  anonKey: string;
  /** Service role key for admin access (bypasses RLS). Required for management operations. */
  serviceRoleKey?: string;
  /** Supabase Management API personal access token. Required for management tools. */
  managementToken?: string;
  /** Override the data base URL (default: https://{project}.supabase.co/rest/v1) */
  baseUrl?: string;
}

export class SupabaseMCPServer {
  private readonly project: string;
  private readonly anonKey: string;
  private readonly serviceRoleKey: string | undefined;
  private readonly managementToken: string | undefined;
  private readonly dataBaseUrl: string;
  private readonly mgmtBaseUrl = 'https://api.supabase.com/v1';

  constructor(config: SupabaseConfig) {
    this.project = config.project;
    this.anonKey = config.anonKey;
    this.serviceRoleKey = config.serviceRoleKey;
    this.managementToken = config.managementToken;
    this.dataBaseUrl = config.baseUrl ?? `https://${config.project}.supabase.co/rest/v1`;
  }

  static catalog() {
    return {
      name: 'supabase',
      displayName: 'Supabase',
      version: '1.0.0',
      category: 'data' as const,
      keywords: ['supabase', 'postgres', 'database', 'storage', 'auth', 'realtime', 'rpc', 'sql', 'table', 'row', 'rls', 'edge function', 'migration'],
      toolNames: [
        'select', 'insert', 'update', 'delete', 'upsert', 'rpc',
        'list_tables', 'execute_sql',
        'list_storage_buckets', 'list_storage_objects',
        'list_auth_users', 'get_auth_user',
        'list_projects', 'get_project',
        'get_project_health',
      ],
      description: 'Supabase PostgREST data operations (select/insert/update/delete/rpc), schema inspection, storage, auth user management, and project health.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── PostgREST Data ───────────────────────────────────────────────────────
      {
        name: 'select',
        description: 'Query rows from a Supabase table using PostgREST filters, column selection, ordering, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table or view name' },
            select: { type: 'string', description: 'Columns to select, supports joins (e.g. "*, orders(id, total)"). Default: *' },
            filters: { type: 'object', description: 'Key-value pairs for equality filters (e.g. {"status": "active", "user_id": "abc"})' },
            order: { type: 'string', description: 'Order expression (e.g. "created_at.desc", "name.asc.nullslast")' },
            limit: { type: 'number', description: 'Maximum rows to return (default: 100)' },
            offset: { type: 'number', description: 'Row offset for pagination (default: 0)' },
            use_service_role: { type: 'boolean', description: 'Use service role key to bypass Row Level Security (default: false)' },
          },
          required: ['table'],
        },
      },
      {
        name: 'insert',
        description: 'Insert one or more rows into a Supabase table. Returns the inserted rows.',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            rows: { type: 'array', description: 'Array of row objects to insert', items: { type: 'object' } },
            on_conflict: { type: 'string', description: 'Conflict resolution: ignore (skip duplicates) or update (upsert on conflict)' },
            use_service_role: { type: 'boolean', description: 'Use service role key to bypass Row Level Security (default: false)' },
          },
          required: ['table', 'rows'],
        },
      },
      {
        name: 'update',
        description: 'Update rows in a Supabase table matching filter conditions. Returns updated rows.',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            updates: { type: 'object', description: 'Fields and new values to set' },
            filters: { type: 'object', description: 'Key-value equality filters to identify rows to update' },
            use_service_role: { type: 'boolean', description: 'Use service role key to bypass Row Level Security (default: false)' },
          },
          required: ['table', 'updates', 'filters'],
        },
      },
      {
        name: 'delete',
        description: 'Delete rows from a Supabase table matching filter conditions. Requires at least one filter to prevent accidental full-table delete.',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            filters: { type: 'object', description: 'Key-value equality filters identifying rows to delete (required — at least one filter must be provided)' },
            use_service_role: { type: 'boolean', description: 'Use service role key to bypass Row Level Security (default: false)' },
          },
          required: ['table', 'filters'],
        },
      },
      {
        name: 'upsert',
        description: 'Insert rows into a Supabase table, updating existing rows on primary key conflict (merge-duplicate strategy).',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            rows: { type: 'array', description: 'Array of row objects to upsert', items: { type: 'object' } },
            on_conflict: { type: 'string', description: 'Comma-separated column(s) that define the conflict target (default: primary key)' },
            use_service_role: { type: 'boolean', description: 'Use service role key to bypass Row Level Security (default: false)' },
          },
          required: ['table', 'rows'],
        },
      },
      {
        name: 'rpc',
        description: 'Call a Supabase PostgreSQL database function (stored procedure) via the PostgREST RPC interface.',
        inputSchema: {
          type: 'object',
          properties: {
            fn: { type: 'string', description: 'Function name (must exist in the public schema)' },
            params: { type: 'object', description: 'Key-value parameters passed to the function' },
            use_service_role: { type: 'boolean', description: 'Use service role key to bypass Row Level Security (default: false)' },
          },
          required: ['fn'],
        },
      },
      // ── Schema Inspection ────────────────────────────────────────────────────
      {
        name: 'list_tables',
        description: 'List all tables and views in the Supabase project database via the PostgREST schema introspection endpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            use_service_role: { type: 'boolean', description: 'Use service role key (default: false)' },
          },
        },
      },
      {
        name: 'execute_sql',
        description: 'Execute a raw SQL query via the Supabase Management API. Requires managementToken. Use for DDL, migrations, or complex queries not expressible via PostgREST.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'SQL query to execute against the project database' },
          },
          required: ['query'],
        },
      },
      // ── Storage ──────────────────────────────────────────────────────────────
      {
        name: 'list_storage_buckets',
        description: 'List all storage buckets in the Supabase project, including public/private status and file size limits.',
        inputSchema: {
          type: 'object',
          properties: {
            use_service_role: { type: 'boolean', description: 'Use service role key (default: true for bucket listing)' },
          },
        },
      },
      {
        name: 'list_storage_objects',
        description: 'List objects inside a Supabase storage bucket with optional prefix filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            bucket_id: { type: 'string', description: 'Storage bucket ID or name' },
            prefix: { type: 'string', description: 'Folder prefix to list (default: "" for root)' },
            limit: { type: 'number', description: 'Maximum objects to return (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            use_service_role: { type: 'boolean', description: 'Use service role key to bypass storage policies (default: false)' },
          },
          required: ['bucket_id'],
        },
      },
      // ── Auth Users ───────────────────────────────────────────────────────────
      {
        name: 'list_auth_users',
        description: 'List Supabase Auth users via the Management API. Requires managementToken. Returns email, provider, last sign-in, and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Users per page (default: 50, max: 1000)' },
          },
        },
      },
      {
        name: 'get_auth_user',
        description: 'Get details of a specific Supabase Auth user by ID via the Management API. Requires managementToken.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Auth user UUID' },
          },
          required: ['user_id'],
        },
      },
      // ── Project Management ───────────────────────────────────────────────────
      {
        name: 'list_projects',
        description: 'List all Supabase projects accessible to the management token, with region and status.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_project',
        description: 'Get details of a specific Supabase project including region, status, and database version.',
        inputSchema: {
          type: 'object',
          properties: {
            project_ref: { type: 'string', description: 'Project reference ID (default: the project configured in this adapter)' },
          },
        },
      },
      {
        name: 'get_project_health',
        description: 'Check the health status of all Supabase project services (auth, db, realtime, storage, edge functions).',
        inputSchema: {
          type: 'object',
          properties: {
            project_ref: { type: 'string', description: 'Project reference ID (default: the project configured in this adapter)' },
            services: { type: 'array', description: 'Specific services to check: auth, db, realtime, storage, functions (default: all)', items: { type: 'string' } },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'select':
          return await this.select(args);
        case 'insert':
          return await this.insert(args);
        case 'update':
          return await this.update(args);
        case 'delete':
          return await this.deleteRows(args);
        case 'upsert':
          return await this.upsert(args);
        case 'rpc':
          return await this.rpc(args);
        case 'list_tables':
          return await this.listTables(args);
        case 'execute_sql':
          return await this.executeSql(args);
        case 'list_storage_buckets':
          return await this.listStorageBuckets(args);
        case 'list_storage_objects':
          return await this.listStorageObjects(args);
        case 'list_auth_users':
          return await this.listAuthUsers(args);
        case 'get_auth_user':
          return await this.getAuthUser(args);
        case 'list_projects':
          return await this.listProjects();
        case 'get_project':
          return await this.getProject(args);
        case 'get_project_health':
          return await this.getProjectHealth(args);
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

  private dataHeaders(useServiceRole: boolean): Record<string, string> {
    const key = useServiceRole && this.serviceRoleKey ? this.serviceRoleKey : this.anonKey;
    return {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }

  private mgmtHeaders(): Record<string, string> {
    if (!this.managementToken) {
      throw new Error('managementToken is required for this operation');
    }
    return {
      Authorization: `Bearer ${this.managementToken}`,
      'Content-Type': 'application/json',
    };
  }

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private buildFilterParams(filters: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      params.set(k, `eq.${v}`);
    }
    return params;
  }

  private async postgreFetch(url: string, options: RequestInit): Promise<ToolResult> {
    const response = await fetch(url, options);
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async select(args: Record<string, unknown>): Promise<ToolResult> {
    const useServiceRole = (args.use_service_role as boolean) ?? false;
    const params = new URLSearchParams();
    params.set('select', String(args.select ?? '*'));
    if (args.order) params.set('order', String(args.order));
    if (args.limit !== undefined) params.set('limit', String(args.limit));
    if (args.offset !== undefined) params.set('offset', String(args.offset));
    if (args.filters && typeof args.filters === 'object') {
      for (const [k, v] of Object.entries(args.filters as Record<string, unknown>)) {
        params.set(k, `eq.${v}`);
      }
    }
    return this.postgreFetch(
      `${this.dataBaseUrl}/${encodeURIComponent(args.table as string)}?${params}`,
      { method: 'GET', headers: this.dataHeaders(useServiceRole) }
    );
  }

  private async insert(args: Record<string, unknown>): Promise<ToolResult> {
    const useServiceRole = (args.use_service_role as boolean) ?? false;
    const headers = this.dataHeaders(useServiceRole);
    if (args.on_conflict === 'update') {
      headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
    } else if (args.on_conflict === 'ignore') {
      headers['Prefer'] = 'return=representation,resolution=ignore-duplicates';
    }
    return this.postgreFetch(
      `${this.dataBaseUrl}/${encodeURIComponent(args.table as string)}`,
      { method: 'POST', headers, body: JSON.stringify(args.rows) }
    );
  }

  private async update(args: Record<string, unknown>): Promise<ToolResult> {
    const useServiceRole = (args.use_service_role as boolean) ?? false;
    const params = args.filters && typeof args.filters === 'object'
      ? this.buildFilterParams(args.filters as Record<string, unknown>)
      : new URLSearchParams();
    return this.postgreFetch(
      `${this.dataBaseUrl}/${encodeURIComponent(args.table as string)}?${params}`,
      { method: 'PATCH', headers: this.dataHeaders(useServiceRole), body: JSON.stringify(args.updates) }
    );
  }

  private async deleteRows(args: Record<string, unknown>): Promise<ToolResult> {
    const useServiceRole = (args.use_service_role as boolean) ?? false;
    if (!args.filters || typeof args.filters !== 'object' || Object.keys(args.filters as object).length === 0) {
      return { content: [{ type: 'text', text: 'At least one filter is required for delete operations to prevent accidental full-table deletion.' }], isError: true };
    }
    const params = this.buildFilterParams(args.filters as Record<string, unknown>);
    return this.postgreFetch(
      `${this.dataBaseUrl}/${encodeURIComponent(args.table as string)}?${params}`,
      { method: 'DELETE', headers: this.dataHeaders(useServiceRole) }
    );
  }

  private async upsert(args: Record<string, unknown>): Promise<ToolResult> {
    const useServiceRole = (args.use_service_role as boolean) ?? false;
    const headers = this.dataHeaders(useServiceRole);
    headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
    const url = args.on_conflict
      ? `${this.dataBaseUrl}/${encodeURIComponent(args.table as string)}?on_conflict=${encodeURIComponent(args.on_conflict as string)}`
      : `${this.dataBaseUrl}/${encodeURIComponent(args.table as string)}`;
    return this.postgreFetch(url, { method: 'POST', headers, body: JSON.stringify(args.rows) });
  }

  private async rpc(args: Record<string, unknown>): Promise<ToolResult> {
    const useServiceRole = (args.use_service_role as boolean) ?? false;
    return this.postgreFetch(
      `${this.dataBaseUrl}/rpc/${encodeURIComponent(args.fn as string)}`,
      { method: 'POST', headers: this.dataHeaders(useServiceRole), body: JSON.stringify(args.params ?? {}) }
    );
  }

  private async listTables(args: Record<string, unknown>): Promise<ToolResult> {
    const useServiceRole = (args.use_service_role as boolean) ?? false;
    const headers = this.dataHeaders(useServiceRole);
    headers['Accept'] = 'application/openapi+json';
    const response = await fetch(`${this.dataBaseUrl}/`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { return { content: [{ type: 'text', text: `Non-JSON response (HTTP ${response.status})` }], isError: true }; }
    // Extract just the table definitions from the OpenAPI spec
    const spec = data as { definitions?: Record<string, unknown>; paths?: Record<string, unknown> };
    const summary = {
      tables: Object.keys(spec.definitions ?? {}),
      paths: Object.keys(spec.paths ?? {}),
    };
    return { content: [{ type: 'text', text: this.truncate(summary) }], isError: false };
  }

  private async executeSql(args: Record<string, unknown>): Promise<ToolResult> {
    const ref = this.project;
    const response = await fetch(`${this.mgmtBaseUrl}/projects/${ref}/database/query`, {
      method: 'POST',
      headers: this.mgmtHeaders(),
      body: JSON.stringify({ query: args.query as string }),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async listStorageBuckets(args: Record<string, unknown>): Promise<ToolResult> {
    const useServiceRole = (args.use_service_role as boolean) ?? true;
    const baseStorageUrl = `https://${this.project}.supabase.co/storage/v1`;
    const key = useServiceRole && this.serviceRoleKey ? this.serviceRoleKey : this.anonKey;
    const response = await fetch(`${baseStorageUrl}/bucket`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async listStorageObjects(args: Record<string, unknown>): Promise<ToolResult> {
    const useServiceRole = (args.use_service_role as boolean) ?? false;
    const baseStorageUrl = `https://${this.project}.supabase.co/storage/v1`;
    const key = useServiceRole && this.serviceRoleKey ? this.serviceRoleKey : this.anonKey;
    const response = await fetch(`${baseStorageUrl}/object/list/${encodeURIComponent(args.bucket_id as string)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prefix: (args.prefix as string) ?? '',
        limit: (args.limit as number) ?? 100,
        offset: (args.offset as number) ?? 0,
      }),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async listAuthUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const ref = this.project;
    const page = (args.page as number) ?? 1;
    const perPage = (args.per_page as number) ?? 50;
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    const response = await fetch(`${this.mgmtBaseUrl}/projects/${ref}/auth/users?${params}`, {
      headers: this.mgmtHeaders(),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async getAuthUser(args: Record<string, unknown>): Promise<ToolResult> {
    const ref = this.project;
    const response = await fetch(`${this.mgmtBaseUrl}/projects/${ref}/auth/users/${encodeURIComponent(args.user_id as string)}`, {
      headers: this.mgmtHeaders(),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async listProjects(): Promise<ToolResult> {
    const response = await fetch(`${this.mgmtBaseUrl}/projects`, { headers: this.mgmtHeaders() });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const ref = (args.project_ref as string) ?? this.project;
    const response = await fetch(`${this.mgmtBaseUrl}/projects/${encodeURIComponent(ref)}`, { headers: this.mgmtHeaders() });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async getProjectHealth(args: Record<string, unknown>): Promise<ToolResult> {
    const ref = (args.project_ref as string) ?? this.project;
    const params = new URLSearchParams();
    if (Array.isArray(args.services)) {
      for (const svc of args.services as string[]) params.append('services', svc);
    }
    const query = params.toString() ? `?${params}` : '';
    const response = await fetch(`${this.mgmtBaseUrl}/projects/${encodeURIComponent(ref)}/health${query}`, {
      headers: this.mgmtHeaders(),
    });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }
}
