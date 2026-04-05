/**
 * SwaggerHub MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// SwaggerHub Registry API — manage APIs, domains, projects, integrations, and templates
// hosted on SwaggerHub SaaS (https://api.swaggerhub.com).
//
// Base URL: https://api.swaggerhub.com
// Auth: API key in the Authorization header (find it at https://app.swaggerhub.com/settings/apiKey)
// Docs: https://app.swaggerhub.com/apis-docs/swagger-hub/registry-api/
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SwaggerHubConfig {
  /**
   * SwaggerHub API key.
   * Find it at https://app.swaggerhub.com/settings/apiKey
   */
  apiKey: string;
  /**
   * Override the base URL (e.g. for SwaggerHub On-Premise).
   * Defaults to https://api.swaggerhub.com
   */
  baseUrl?: string;
}

export class SwaggerHubMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SwaggerHubConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://api.swaggerhub.com';
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- APIs ---
      {
        name: 'search_apis',
        description: 'Search all public and private APIs accessible to the authenticated user on SwaggerHub, with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Free-text search query' },
            limit: { type: 'number', description: 'Maximum results to return (default: 10)' },
            page: { type: 'number', description: 'Page number for pagination (0-based, default: 0)' },
            state: { type: 'string', description: 'Filter by lifecycle state: UNPUBLISHED, PUBLISHED, ANY (default: ANY)' },
            visibility: { type: 'string', description: 'Filter by visibility: PUBLIC, PRIVATE (default: PUBLIC)' },
          },
        },
      },
      {
        name: 'get_owner_apis',
        description: 'List all APIs belonging to a specific SwaggerHub owner (user or organization).',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub user or organization name' },
            limit: { type: 'number', description: 'Maximum results to return (default: 10)' },
            page: { type: 'number', description: 'Page number (0-based, default: 0)' },
          },
          required: ['owner'],
        },
      },
      {
        name: 'get_api_versions',
        description: 'List all versions of a specific API owned by the given owner on SwaggerHub.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub user or organization name' },
            api: { type: 'string', description: 'API name (slug)' },
          },
          required: ['owner', 'api'],
        },
      },
      {
        name: 'get_api_definition',
        description: 'Get the OpenAPI definition (JSON) for a specific version of a SwaggerHub API.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub user or organization name' },
            api: { type: 'string', description: 'API name (slug)' },
            version: { type: 'string', description: 'API version string (e.g. "1.0.0")' },
          },
          required: ['owner', 'api', 'version'],
        },
      },
      {
        name: 'save_api_definition',
        description: 'Create or update an API definition on SwaggerHub under the given owner, API name, and version.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub user or organization name' },
            api: { type: 'string', description: 'API name (slug)' },
            version: { type: 'string', description: 'API version string' },
            definition: { type: 'string', description: 'OpenAPI definition as a JSON or YAML string' },
            isPrivate: { type: 'boolean', description: 'If true, the API will be private (default: false)' },
            force: { type: 'boolean', description: 'If true, overwrite existing definition (default: false)' },
          },
          required: ['owner', 'api', 'version', 'definition'],
        },
      },
      {
        name: 'delete_api',
        description: 'Delete an entire API and all its versions from SwaggerHub.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub user or organization name' },
            api: { type: 'string', description: 'API name (slug)' },
          },
          required: ['owner', 'api'],
        },
      },
      {
        name: 'delete_api_version',
        description: 'Delete a specific version of an API from SwaggerHub.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub user or organization name' },
            api: { type: 'string', description: 'API name (slug)' },
            version: { type: 'string', description: 'API version string to delete' },
          },
          required: ['owner', 'api', 'version'],
        },
      },
      {
        name: 'set_api_lifecycle',
        description: 'Publish or unpublish a specific API version on SwaggerHub to control its lifecycle state.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub user or organization name' },
            api: { type: 'string', description: 'API name (slug)' },
            version: { type: 'string', description: 'API version string' },
            published: { type: 'boolean', description: 'true to publish, false to unpublish' },
          },
          required: ['owner', 'api', 'version', 'published'],
        },
      },
      // --- Domains ---
      {
        name: 'search_domains',
        description: 'Search all domains accessible to the authenticated user on SwaggerHub.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Free-text search query' },
            limit: { type: 'number', description: 'Maximum results to return (default: 10)' },
            page: { type: 'number', description: 'Page number (0-based, default: 0)' },
          },
        },
      },
      {
        name: 'get_domain_definition',
        description: 'Get the OpenAPI definition for a specific version of a SwaggerHub domain.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub user or organization name' },
            domain: { type: 'string', description: 'Domain name (slug)' },
            version: { type: 'string', description: 'Domain version string' },
          },
          required: ['owner', 'domain', 'version'],
        },
      },
      // --- Integrations ---
      {
        name: 'list_integrations',
        description: 'List all integrations configured for a specific API version on SwaggerHub.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub user or organization name' },
            api: { type: 'string', description: 'API name (slug)' },
            version: { type: 'string', description: 'API version string' },
          },
          required: ['owner', 'api', 'version'],
        },
      },
      {
        name: 'execute_integration',
        description: 'Trigger execution of an integration configured for a SwaggerHub API version (e.g. sync to GitHub).',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub user or organization name' },
            api: { type: 'string', description: 'API name (slug)' },
            version: { type: 'string', description: 'API version string' },
            integrationId: { type: 'string', description: 'Integration ID to execute' },
          },
          required: ['owner', 'api', 'version', 'integrationId'],
        },
      },
      // --- Projects ---
      {
        name: 'list_projects',
        description: 'List all projects belonging to a SwaggerHub organization.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub organization name' },
          },
          required: ['owner'],
        },
      },
      {
        name: 'get_project',
        description: 'Get details of a specific SwaggerHub project including its APIs and domains.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub organization name' },
            projectId: { type: 'string', description: 'Project ID' },
          },
          required: ['owner', 'projectId'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new project within a SwaggerHub organization.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'SwaggerHub organization name' },
            name: { type: 'string', description: 'Project name' },
            description: { type: 'string', description: 'Project description' },
            apis: { type: 'array', items: { type: 'object' }, description: 'Optional array of API references to add to the project' },
            domains: { type: 'array', items: { type: 'object' }, description: 'Optional array of domain references to add to the project' },
          },
          required: ['owner', 'name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_apis': return await this.searchApis(args);
        case 'get_owner_apis': return await this.getOwnerApis(args);
        case 'get_api_versions': return await this.getApiVersions(args);
        case 'get_api_definition': return await this.getApiDefinition(args);
        case 'save_api_definition': return await this.saveApiDefinition(args);
        case 'delete_api': return await this.deleteApi(args);
        case 'delete_api_version': return await this.deleteApiVersion(args);
        case 'set_api_lifecycle': return await this.setApiLifecycle(args);
        case 'search_domains': return await this.searchDomains(args);
        case 'get_domain_definition': return await this.getDomainDefinition(args);
        case 'list_integrations': return await this.listIntegrations(args);
        case 'execute_integration': return await this.executeIntegration(args);
        case 'list_projects': return await this.listProjects(args);
        case 'get_project': return await this.getProject(args);
        case 'create_project': return await this.createProject(args);
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

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async apiPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildQuery(params: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      }
    }
    return parts.length ? '?' + parts.join('&') : '';
  }

  private async searchApis(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({
      query: args.query,
      limit: args.limit ?? 10,
      page: args.page ?? 0,
      state: args.state,
      visibility: args.visibility,
    });
    return this.apiGet(`/apis${qs}`);
  }

  private async getOwnerApis(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    if (!owner) return { content: [{ type: 'text', text: 'owner is required' }], isError: true };
    const qs = this.buildQuery({ limit: args.limit ?? 10, page: args.page ?? 0 });
    return this.apiGet(`/apis/${encodeURIComponent(owner)}${qs}`);
  }

  private async getApiVersions(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    const api = args.api as string;
    if (!owner || !api) return { content: [{ type: 'text', text: 'owner and api are required' }], isError: true };
    return this.apiGet(`/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}`);
  }

  private async getApiDefinition(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    const api = args.api as string;
    const version = args.version as string;
    if (!owner || !api || !version) return { content: [{ type: 'text', text: 'owner, api, and version are required' }], isError: true };
    return this.apiGet(`/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/swagger.json`);
  }

  private async saveApiDefinition(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    const api = args.api as string;
    const version = args.version as string;
    const definition = args.definition as string;
    if (!owner || !api || !version || !definition) {
      return { content: [{ type: 'text', text: 'owner, api, version, and definition are required' }], isError: true };
    }
    const qs = this.buildQuery({ isPrivate: args.isPrivate, force: args.force, version });
    const response = await this.fetchWithRetry(`${this.baseUrl}/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}${qs}`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: definition,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text || JSON.stringify({ success: true }) }], isError: false };
  }

  private async deleteApi(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    const api = args.api as string;
    if (!owner || !api) return { content: [{ type: 'text', text: 'owner and api are required' }], isError: true };
    return this.apiDelete(`/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}`);
  }

  private async deleteApiVersion(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    const api = args.api as string;
    const version = args.version as string;
    if (!owner || !api || !version) return { content: [{ type: 'text', text: 'owner, api, and version are required' }], isError: true };
    return this.apiDelete(`/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}`);
  }

  private async setApiLifecycle(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    const api = args.api as string;
    const version = args.version as string;
    const published = args.published as boolean;
    if (!owner || !api || !version || published === undefined) {
      return { content: [{ type: 'text', text: 'owner, api, version, and published are required' }], isError: true };
    }
    return this.apiPut(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/settings/lifecycle`,
      { published }
    );
  }

  private async searchDomains(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery({ query: args.query, limit: args.limit ?? 10, page: args.page ?? 0 });
    return this.apiGet(`/domains${qs}`);
  }

  private async getDomainDefinition(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    const domain = args.domain as string;
    const version = args.version as string;
    if (!owner || !domain || !version) return { content: [{ type: 'text', text: 'owner, domain, and version are required' }], isError: true };
    return this.apiGet(`/domains/${encodeURIComponent(owner)}/${encodeURIComponent(domain)}/${encodeURIComponent(version)}/domain.json`);
  }

  private async listIntegrations(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    const api = args.api as string;
    const version = args.version as string;
    if (!owner || !api || !version) return { content: [{ type: 'text', text: 'owner, api, and version are required' }], isError: true };
    return this.apiGet(`/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/integrations`);
  }

  private async executeIntegration(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    const api = args.api as string;
    const version = args.version as string;
    const integrationId = args.integrationId as string;
    if (!owner || !api || !version || !integrationId) {
      return { content: [{ type: 'text', text: 'owner, api, version, and integrationId are required' }], isError: true };
    }
    return this.apiPost(
      `/apis/${encodeURIComponent(owner)}/${encodeURIComponent(api)}/${encodeURIComponent(version)}/integrations/${encodeURIComponent(integrationId)}/execute`,
      {}
    );
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    if (!owner) return { content: [{ type: 'text', text: 'owner is required' }], isError: true };
    return this.apiGet(`/projects/${encodeURIComponent(owner)}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    const projectId = args.projectId as string;
    if (!owner || !projectId) return { content: [{ type: 'text', text: 'owner and projectId are required' }], isError: true };
    return this.apiGet(`/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectId)}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    const owner = args.owner as string;
    const name = args.name as string;
    if (!owner || !name) return { content: [{ type: 'text', text: 'owner and name are required' }], isError: true };
    const body: Record<string, unknown> = { name };
    if (args.description) body.description = args.description;
    if (args.apis) body.apis = args.apis;
    if (args.domains) body.domains = args.domains;
    return this.apiPost(`/projects/${encodeURIComponent(owner)}`, body);
  }

  static catalog() {
    return {
      name: 'swaggerhub',
      displayName: 'SwaggerHub',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['swaggerhub', 'openapi', 'api-design', 'swagger', 'smartbear'],
      toolNames: [
        'search_apis', 'get_owner_apis', 'get_api_versions', 'get_api_definition',
        'save_api_definition', 'delete_api', 'delete_api_version', 'set_api_lifecycle',
        'search_domains', 'get_domain_definition', 'list_integrations', 'execute_integration',
        'list_projects', 'get_project', 'create_project',
      ],
      description: 'SwaggerHub adapter for the Epic AI Intelligence Platform — manage APIs, domains, projects, and integrations on SwaggerHub.',
      author: 'protectnil' as const,
    };
  }
}
