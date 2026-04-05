/**
 * ReadMe MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. ReadMe.io has not published an official MCP server.
//
// Base URL: https://dash.readme.io/api/v1
// Auth: HTTP Basic — username = API key, password = empty string
//   Header: Authorization: Basic base64(<apiKey>:)
// Docs: https://docs.readme.com/main/reference/intro/authentication
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ReadMeConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ReadMeMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ReadMeConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://dash.readme.io/api/v1';
  }

  static catalog() {
    return {
      name: 'readme',
      displayName: 'ReadMe',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: [
        'readme', 'docs', 'documentation', 'developer hub', 'api docs',
        'changelog', 'openapi', 'swagger', 'page', 'category', 'version',
      ],
      toolNames: [
        'get_project',
        'get_api_specification', 'upload_api_specification', 'update_api_specification', 'delete_api_specification',
        'get_category', 'get_category_docs',
        'get_doc', 'create_doc', 'update_doc', 'delete_doc', 'search_docs',
        'get_changelogs', 'get_changelog', 'create_changelog', 'update_changelog', 'delete_changelog',
        'get_custom_pages', 'get_custom_page', 'create_custom_page', 'update_custom_page', 'delete_custom_page',
        'get_versions', 'get_version', 'create_version', 'update_version', 'delete_version',
      ],
      description: 'Manage ReadMe developer hub: API specs, docs pages, changelogs, custom pages, categories, and project versions via the ReadMe REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Project ──────────────────────────────────────────────────────────
      {
        name: 'get_project',
        description: 'Get metadata about the current ReadMe project, including name, subdomain, plan, and version info',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── API Specification ─────────────────────────────────────────────────
      {
        name: 'get_api_specification',
        description: 'Retrieve a list of API specification files uploaded to the ReadMe project',
        inputSchema: {
          type: 'object',
          properties: {
            perPage: { type: 'number', description: 'Number of results per page (default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            version: { type: 'string', description: 'Project version slug to filter by (e.g. v1.0)' },
          },
        },
      },
      {
        name: 'upload_api_specification',
        description: 'Upload a new OpenAPI or Swagger specification file to the ReadMe project',
        inputSchema: {
          type: 'object',
          properties: {
            spec: { type: 'string', description: 'OpenAPI/Swagger spec as a JSON or YAML string' },
            version: { type: 'string', description: 'Project version slug to associate the spec with (e.g. v1.0)' },
          },
          required: ['spec'],
        },
      },
      {
        name: 'update_api_specification',
        description: 'Update an existing API specification file in ReadMe by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'API specification ID' },
            spec: { type: 'string', description: 'Updated OpenAPI/Swagger spec as a JSON or YAML string' },
          },
          required: ['id', 'spec'],
        },
      },
      {
        name: 'delete_api_specification',
        description: 'Delete an API specification file from the ReadMe project by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'API specification ID to delete' },
          },
          required: ['id'],
        },
      },
      // ── Categories ────────────────────────────────────────────────────────
      {
        name: 'get_category',
        description: 'Retrieve a ReadMe category by its slug, including title and type',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Category slug (e.g. getting-started)' },
            version: { type: 'string', description: 'Project version slug (e.g. v1.0)' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'get_category_docs',
        description: 'List all docs pages within a ReadMe category by category slug',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Category slug' },
            version: { type: 'string', description: 'Project version slug (e.g. v1.0)' },
          },
          required: ['slug'],
        },
      },
      // ── Docs ─────────────────────────────────────────────────────────────
      {
        name: 'get_doc',
        description: 'Retrieve a single ReadMe documentation page by its slug, including body content and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Doc page slug (e.g. authentication)' },
            version: { type: 'string', description: 'Project version slug (e.g. v1.0)' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'create_doc',
        description: 'Create a new ReadMe documentation page with title, category, and body content',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Page title' },
            category: { type: 'string', description: 'Category ID the page belongs to' },
            body: { type: 'string', description: 'Page content in ReadMe-flavored Markdown' },
            hidden: { type: 'boolean', description: 'Set to true to hide the page from navigation (default: true)' },
            order: { type: 'number', description: 'Sort order within the category' },
            parentDoc: { type: 'string', description: 'Parent page ID for nested docs (optional)' },
            version: { type: 'string', description: 'Project version slug (e.g. v1.0)' },
          },
          required: ['title', 'category'],
        },
      },
      {
        name: 'update_doc',
        description: 'Update an existing ReadMe documentation page by slug — change title, body, or visibility',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Doc page slug to update' },
            title: { type: 'string', description: 'Updated page title' },
            body: { type: 'string', description: 'Updated page body in ReadMe-flavored Markdown' },
            hidden: { type: 'boolean', description: 'Whether to hide the page from navigation' },
            category: { type: 'string', description: 'Updated category ID' },
            version: { type: 'string', description: 'Project version slug (e.g. v1.0)' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'delete_doc',
        description: 'Delete a ReadMe documentation page by slug',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Doc page slug to delete' },
            version: { type: 'string', description: 'Project version slug (e.g. v1.0)' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'search_docs',
        description: 'Search ReadMe documentation pages by query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string' },
            version: { type: 'string', description: 'Project version slug to search within (e.g. v1.0)' },
          },
          required: ['query'],
        },
      },
      // ── Changelogs ────────────────────────────────────────────────────────
      {
        name: 'get_changelogs',
        description: 'Retrieve a paginated list of all changelog entries for the ReadMe project',
        inputSchema: {
          type: 'object',
          properties: {
            perPage: { type: 'number', description: 'Results per page (default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_changelog',
        description: 'Retrieve a single ReadMe changelog entry by its slug',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Changelog slug' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'create_changelog',
        description: 'Create a new changelog entry in the ReadMe project',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Changelog title' },
            body: { type: 'string', description: 'Changelog content in ReadMe-flavored Markdown' },
            type: { type: 'string', description: 'Entry type: added, changed, deprecated, removed, fixed, security (optional)' },
            hidden: { type: 'boolean', description: 'Whether to hide from the changelog (default: true)' },
          },
          required: ['title', 'body'],
        },
      },
      {
        name: 'update_changelog',
        description: 'Update an existing ReadMe changelog entry by slug',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Changelog slug to update' },
            title: { type: 'string', description: 'Updated title' },
            body: { type: 'string', description: 'Updated body content' },
            type: { type: 'string', description: 'Entry type: added, changed, deprecated, removed, fixed, security' },
            hidden: { type: 'boolean', description: 'Updated visibility' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'delete_changelog',
        description: 'Delete a ReadMe changelog entry by slug',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Changelog slug to delete' },
          },
          required: ['slug'],
        },
      },
      // ── Custom Pages ──────────────────────────────────────────────────────
      {
        name: 'get_custom_pages',
        description: 'Retrieve a paginated list of custom pages in the ReadMe project',
        inputSchema: {
          type: 'object',
          properties: {
            perPage: { type: 'number', description: 'Results per page (default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_custom_page',
        description: 'Retrieve a single ReadMe custom page by slug',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Custom page slug' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'create_custom_page',
        description: 'Create a new custom page in the ReadMe project (HTML or Markdown)',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Page title' },
            body: { type: 'string', description: 'Page body content (Markdown)' },
            html: { type: 'string', description: 'Page body as raw HTML (use instead of body for HTML pages)' },
            hidden: { type: 'boolean', description: 'Whether to hide the page (default: true)' },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_custom_page',
        description: 'Update an existing ReadMe custom page by slug',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Custom page slug to update' },
            title: { type: 'string', description: 'Updated page title' },
            body: { type: 'string', description: 'Updated page body (Markdown)' },
            html: { type: 'string', description: 'Updated page body (HTML)' },
            hidden: { type: 'boolean', description: 'Updated visibility' },
          },
          required: ['slug'],
        },
      },
      {
        name: 'delete_custom_page',
        description: 'Delete a ReadMe custom page by slug',
        inputSchema: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Custom page slug to delete' },
          },
          required: ['slug'],
        },
      },
      // ── Versions ──────────────────────────────────────────────────────────
      {
        name: 'get_versions',
        description: 'List all versions defined in the ReadMe project',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_version',
        description: 'Retrieve a single ReadMe project version by version ID or slug',
        inputSchema: {
          type: 'object',
          properties: {
            versionId: { type: 'string', description: 'Version ID or semver slug (e.g. v1.0)' },
          },
          required: ['versionId'],
        },
      },
      {
        name: 'create_version',
        description: 'Create a new version of the ReadMe project, optionally forking from an existing version',
        inputSchema: {
          type: 'object',
          properties: {
            version: { type: 'string', description: 'Semver version string (e.g. 2.0.0)' },
            from: { type: 'string', description: 'Existing version to fork docs from (e.g. v1.0)' },
            is_stable: { type: 'boolean', description: 'Set as the stable/default version (default: false)' },
            is_hidden: { type: 'boolean', description: 'Hide this version from public navigation (default: false)' },
          },
          required: ['version', 'from'],
        },
      },
      {
        name: 'update_version',
        description: 'Update an existing ReadMe project version — change stability, visibility, or deprecation',
        inputSchema: {
          type: 'object',
          properties: {
            versionId: { type: 'string', description: 'Version ID or semver slug to update' },
            is_stable: { type: 'boolean', description: 'Set as the stable version' },
            is_hidden: { type: 'boolean', description: 'Hide from public navigation' },
            is_deprecated: { type: 'boolean', description: 'Mark version as deprecated' },
          },
          required: ['versionId'],
        },
      },
      {
        name: 'delete_version',
        description: 'Delete a ReadMe project version and all associated docs (irreversible)',
        inputSchema: {
          type: 'object',
          properties: {
            versionId: { type: 'string', description: 'Version ID or semver slug to delete' },
          },
          required: ['versionId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_project':                return await this.getProject();
        case 'get_api_specification':      return await this.getApiSpecification(args);
        case 'upload_api_specification':   return await this.uploadApiSpecification(args);
        case 'update_api_specification':   return await this.updateApiSpecification(args);
        case 'delete_api_specification':   return await this.deleteApiSpecification(args);
        case 'get_category':               return await this.getCategory(args);
        case 'get_category_docs':          return await this.getCategoryDocs(args);
        case 'get_doc':                    return await this.getDoc(args);
        case 'create_doc':                 return await this.createDoc(args);
        case 'update_doc':                 return await this.updateDoc(args);
        case 'delete_doc':                 return await this.deleteDoc(args);
        case 'search_docs':               return await this.searchDocs(args);
        case 'get_changelogs':             return await this.getChangelogs(args);
        case 'get_changelog':              return await this.getChangelog(args);
        case 'create_changelog':           return await this.createChangelog(args);
        case 'update_changelog':           return await this.updateChangelog(args);
        case 'delete_changelog':           return await this.deleteChangelog(args);
        case 'get_custom_pages':           return await this.getCustomPages(args);
        case 'get_custom_page':            return await this.getCustomPage(args);
        case 'create_custom_page':         return await this.createCustomPage(args);
        case 'update_custom_page':         return await this.updateCustomPage(args);
        case 'delete_custom_page':         return await this.deleteCustomPage(args);
        case 'get_versions':              return await this.getVersions();
        case 'get_version':               return await this.getVersion(args);
        case 'create_version':            return await this.createVersion(args);
        case 'update_version':            return await this.updateVersion(args);
        case 'delete_version':            return await this.deleteVersion(args);
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

  private get authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.apiKey}:`).toString('base64');
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async request(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: { ...this.headers, ...extraHeaders },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `ReadMe API error ${response.status}: ${errText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{}' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`ReadMe returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildQuery(params: Record<string, unknown>): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
    }
    const str = q.toString();
    return str ? '?' + str : '';
  }

  // ── Project ───────────────────────────────────────────────────────────────
  private async getProject(): Promise<ToolResult> {
    return this.request('GET', '/');
  }

  // ── API Specification ─────────────────────────────────────────────────────
  private async getApiSpecification(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({ perPage: args.perPage ?? 10, page: args.page ?? 1 });
    const versionHdr: Record<string, string> = args.version ? { 'x-readme-version': String(args.version) } : {};
    return this.request('GET', `/api-specification${qs}`, undefined, versionHdr);
  }

  private async uploadApiSpecification(args: Record<string, unknown>): Promise<ToolResult> {
    const versionHdr: Record<string, string> = args.version ? { 'x-readme-version': String(args.version) } : {};
    return this.request('POST', '/api-specification', { spec: args.spec }, versionHdr);
  }

  private async updateApiSpecification(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('PUT', `/api-specification/${args.id}`, { spec: args.spec });
  }

  private async deleteApiSpecification(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/api-specification/${args.id}`);
  }

  // ── Categories ────────────────────────────────────────────────────────────
  private async getCategory(args: Record<string, unknown>): Promise<ToolResult> {
    const versionHdr: Record<string, string> = args.version ? { 'x-readme-version': String(args.version) } : {};
    return this.request('GET', `/categories/${args.slug}`, undefined, versionHdr);
  }

  private async getCategoryDocs(args: Record<string, unknown>): Promise<ToolResult> {
    const versionHdr: Record<string, string> = args.version ? { 'x-readme-version': String(args.version) } : {};
    return this.request('GET', `/categories/${args.slug}/docs`, undefined, versionHdr);
  }

  // ── Docs ─────────────────────────────────────────────────────────────────
  private async getDoc(args: Record<string, unknown>): Promise<ToolResult> {
    const versionHdr: Record<string, string> = args.version ? { 'x-readme-version': String(args.version) } : {};
    return this.request('GET', `/docs/${args.slug}`, undefined, versionHdr);
  }

  private async createDoc(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      title: args.title,
      category: args.category,
      hidden: args.hidden ?? true,
    };
    if (args.body) body['body'] = args.body;
    if (args.order !== undefined) body['order'] = args.order;
    if (args.parentDoc) body['parentDoc'] = args.parentDoc;
    const versionHdr: Record<string, string> = args.version ? { 'x-readme-version': String(args.version) } : {};
    return this.request('POST', '/docs', body, versionHdr);
  }

  private async updateDoc(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.title !== undefined) body['title'] = args.title;
    if (args.body !== undefined) body['body'] = args.body;
    if (args.hidden !== undefined) body['hidden'] = args.hidden;
    if (args.category !== undefined) body['category'] = args.category;
    const versionHdr: Record<string, string> = args.version ? { 'x-readme-version': String(args.version) } : {};
    return this.request('PUT', `/docs/${args.slug}`, body, versionHdr);
  }

  private async deleteDoc(args: Record<string, unknown>): Promise<ToolResult> {
    const versionHdr: Record<string, string> = args.version ? { 'x-readme-version': String(args.version) } : {};
    return this.request('DELETE', `/docs/${args.slug}`, undefined, versionHdr);
  }

  private async searchDocs(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { search: args.query };
    const versionHdr: Record<string, string> = args.version ? { 'x-readme-version': String(args.version) } : {};
    return this.request('POST', '/docs/search', body, versionHdr);
  }

  // ── Changelogs ────────────────────────────────────────────────────────────
  private async getChangelogs(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({ perPage: args.perPage ?? 10, page: args.page ?? 1 });
    return this.request('GET', `/changelogs${qs}`);
  }

  private async getChangelog(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/changelogs/${args.slug}`);
  }

  private async createChangelog(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { title: args.title, body: args.body, hidden: args.hidden ?? true };
    if (args.type) body['type'] = args.type;
    return this.request('POST', '/changelogs', body);
  }

  private async updateChangelog(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.title !== undefined) body['title'] = args.title;
    if (args.body !== undefined) body['body'] = args.body;
    if (args.type !== undefined) body['type'] = args.type;
    if (args.hidden !== undefined) body['hidden'] = args.hidden;
    return this.request('PUT', `/changelogs/${args.slug}`, body);
  }

  private async deleteChangelog(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/changelogs/${args.slug}`);
  }

  // ── Custom Pages ──────────────────────────────────────────────────────────
  private async getCustomPages(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({ perPage: args.perPage ?? 10, page: args.page ?? 1 });
    return this.request('GET', `/custompages${qs}`);
  }

  private async getCustomPage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/custompages/${args.slug}`);
  }

  private async createCustomPage(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { title: args.title, hidden: args.hidden ?? true };
    if (args.body) body['body'] = args.body;
    if (args.html) body['html'] = args.html;
    return this.request('POST', '/custompages', body);
  }

  private async updateCustomPage(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.title !== undefined) body['title'] = args.title;
    if (args.body !== undefined) body['body'] = args.body;
    if (args.html !== undefined) body['html'] = args.html;
    if (args.hidden !== undefined) body['hidden'] = args.hidden;
    return this.request('PUT', `/custompages/${args.slug}`, body);
  }

  private async deleteCustomPage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/custompages/${args.slug}`);
  }

  // ── Versions ──────────────────────────────────────────────────────────────
  private async getVersions(): Promise<ToolResult> {
    return this.request('GET', '/version');
  }

  private async getVersion(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/version/${args.versionId}`);
  }

  private async createVersion(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { version: args.version, from: args.from };
    if (args.is_stable !== undefined) body['is_stable'] = args.is_stable;
    if (args.is_hidden !== undefined) body['is_hidden'] = args.is_hidden;
    return this.request('POST', '/version', body);
  }

  private async updateVersion(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.is_stable !== undefined) body['is_stable'] = args.is_stable;
    if (args.is_hidden !== undefined) body['is_hidden'] = args.is_hidden;
    if (args.is_deprecated !== undefined) body['is_deprecated'] = args.is_deprecated;
    return this.request('PUT', `/version/${args.versionId}`, body);
  }

  private async deleteVersion(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/version/${args.versionId}`);
  }
}
