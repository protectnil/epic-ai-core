/**
 * Fastly MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/fastly/mcp — transport: stdio/HTTP/SSE, auth: Fastly CLI token (wraps CLI)
// Our adapter covers: 22 tools (direct REST API). Vendor MCP covers: 8 tools (CLI wrapper surface).
// Vendor MCP fails the 10+ tools criterion (exposes only 8 meta-tools: fastly_list_commands,
//   fastly_describe, fastly_execute, current_time, fastly_result_read, fastly_result_query,
//   fastly_result_summary, fastly_result_list). Latest release: v0.1.9 (Sep 2025, within 6 months).
// Recommendation: use-rest-api — vendor MCP wraps CLI with only 8 meta-tools (fails 10+ criterion).
//   Our REST adapter provides direct, typed API access without CLI dependency.
//   Note: if CLI-surface breadth is needed for non-CI use cases, supplement with vendor MCP.
//
// Base URL: https://api.fastly.com
// Auth: Fastly-Key header (API token)
// Docs: https://www.fastly.com/documentation/reference/api/
// Rate limits: Read (GET/HEAD): 6,000 req/min; Single-URL and surrogate key purges: avg 100,000/hr per customer

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FastlyConfig {
  apiToken: string;
  baseUrl?: string;
}

export class FastlyMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: FastlyConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.fastly.com';
  }

  static catalog() {
    return {
      name: 'fastly',
      displayName: 'Fastly',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'fastly', 'cdn', 'edge', 'cache', 'purge', 'vcl', 'waf', 'compute',
        'origin', 'backend', 'domain', 'service', 'tls', 'ssl', 'delivery',
        'content delivery', 'edge compute', 'surrogate key', 'rate limiting',
        'acl', 'dictionary', 'logging', 'stats', 'analytics',
      ],
      toolNames: [
        'list_services', 'get_service', 'create_service', 'update_service', 'delete_service',
        'list_service_versions', 'clone_service_version', 'activate_service_version',
        'list_domains', 'create_domain', 'delete_domain',
        'list_backends', 'create_backend', 'update_backend', 'delete_backend',
        'purge_url', 'purge_surrogate_key', 'purge_all',
        'get_service_stats', 'list_acls', 'list_dictionaries', 'list_logging_endpoints',
      ],
      description: 'Fastly edge CDN: manage services, versions, domains, backends, VCL, purge cache by URL or surrogate key, and retrieve real-time traffic stats.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_services',
        description: 'List all Fastly services in the account with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of services per page (max: 20, default: 20)',
            },
            direction: {
              type: 'string',
              description: 'Sort direction: ascend (default) or descend',
            },
            sort: {
              type: 'string',
              description: 'Field to sort by: created (default), updated, name',
            },
          },
        },
      },
      {
        name: 'get_service',
        description: 'Get details for a specific Fastly service including active version, domains, and type',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Fastly service ID (alphanumeric, e.g. SU1Z0isxPaozGVKXdv0eY)',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'create_service',
        description: 'Create a new Fastly CDN service with a name and type',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new service',
            },
            type: {
              type: 'string',
              description: 'Service type: vcl (default, VCL-based) or wasm (Compute@Edge)',
            },
            comment: {
              type: 'string',
              description: 'Optional description or comment for the service',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_service',
        description: 'Update a Fastly service name or comment',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'ID of the service to update',
            },
            name: {
              type: 'string',
              description: 'New name for the service',
            },
            comment: {
              type: 'string',
              description: 'Updated comment/description',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'delete_service',
        description: 'Delete a Fastly service and all its versions permanently',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'ID of the service to delete',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'list_service_versions',
        description: 'List all configuration versions for a Fastly service with active and locked status',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to list versions for',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'clone_service_version',
        description: 'Clone an existing service version to create a new editable version with identical configuration',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID containing the version to clone',
            },
            version_id: {
              type: 'number',
              description: 'Version number to clone (e.g. 5)',
            },
          },
          required: ['service_id', 'version_id'],
        },
      },
      {
        name: 'activate_service_version',
        description: 'Activate a service version to make it live at the edge (validates and deploys)',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID containing the version to activate',
            },
            version_id: {
              type: 'number',
              description: 'Version number to activate',
            },
          },
          required: ['service_id', 'version_id'],
        },
      },
      {
        name: 'list_domains',
        description: 'List all domains configured on a specific version of a Fastly service',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to list domains for',
            },
            version_id: {
              type: 'number',
              description: 'Service version number to query',
            },
          },
          required: ['service_id', 'version_id'],
        },
      },
      {
        name: 'create_domain',
        description: 'Add a domain to a Fastly service version',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to add the domain to',
            },
            version_id: {
              type: 'number',
              description: 'Service version number (must be unlocked/editable)',
            },
            name: {
              type: 'string',
              description: 'Domain name to add (e.g. www.example.com)',
            },
            comment: {
              type: 'string',
              description: 'Optional comment for this domain entry',
            },
          },
          required: ['service_id', 'version_id', 'name'],
        },
      },
      {
        name: 'delete_domain',
        description: 'Remove a domain from a Fastly service version',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID containing the domain',
            },
            version_id: {
              type: 'number',
              description: 'Service version number',
            },
            domain_name: {
              type: 'string',
              description: 'Domain name to remove (e.g. www.example.com)',
            },
          },
          required: ['service_id', 'version_id', 'domain_name'],
        },
      },
      {
        name: 'list_backends',
        description: 'List all origin backends configured on a Fastly service version with address and port',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to list backends for',
            },
            version_id: {
              type: 'number',
              description: 'Service version number',
            },
          },
          required: ['service_id', 'version_id'],
        },
      },
      {
        name: 'create_backend',
        description: 'Add an origin backend server to a Fastly service version with address, port, and SSL settings',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to add the backend to',
            },
            version_id: {
              type: 'number',
              description: 'Service version number (must be editable)',
            },
            name: {
              type: 'string',
              description: 'Name for the backend (e.g. origin-server-1)',
            },
            address: {
              type: 'string',
              description: 'Hostname or IP address of the origin server',
            },
            port: {
              type: 'number',
              description: 'Port on the origin server (default: 80, or 443 if use_ssl is true)',
            },
            use_ssl: {
              type: 'boolean',
              description: 'Use TLS/SSL when connecting to the origin (default: false)',
            },
            ssl_hostname: {
              type: 'string',
              description: 'SNI hostname for TLS certificate validation (required when use_ssl is true)',
            },
          },
          required: ['service_id', 'version_id', 'name', 'address'],
        },
      },
      {
        name: 'update_backend',
        description: 'Update an origin backend configuration on a Fastly service version',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID containing the backend',
            },
            version_id: {
              type: 'number',
              description: 'Service version number',
            },
            backend_name: {
              type: 'string',
              description: 'Current name of the backend to update',
            },
            address: {
              type: 'string',
              description: 'New origin hostname or IP address',
            },
            port: {
              type: 'number',
              description: 'New origin port',
            },
            use_ssl: {
              type: 'boolean',
              description: 'Enable or disable TLS to origin',
            },
          },
          required: ['service_id', 'version_id', 'backend_name'],
        },
      },
      {
        name: 'delete_backend',
        description: 'Remove an origin backend from a Fastly service version',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID containing the backend',
            },
            version_id: {
              type: 'number',
              description: 'Service version number',
            },
            backend_name: {
              type: 'string',
              description: 'Name of the backend to remove',
            },
          },
          required: ['service_id', 'version_id', 'backend_name'],
        },
      },
      {
        name: 'purge_url',
        description: 'Purge a specific URL from the Fastly edge cache to force re-fetching from origin',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Full URL to purge (e.g. https://www.example.com/image.png)',
            },
            soft: {
              type: 'boolean',
              description: 'Soft purge — marks as stale (serves stale while revalidating) instead of hard delete (default: false)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'purge_surrogate_key',
        description: 'Purge all cached objects tagged with a surrogate key (Surrogate-Key or xkey header) from Fastly edge',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to purge within',
            },
            surrogate_key: {
              type: 'string',
              description: 'Surrogate key tag to purge (space-separated for multiple keys)',
            },
            soft: {
              type: 'boolean',
              description: 'Soft purge — mark stale instead of hard delete (default: false)',
            },
          },
          required: ['service_id', 'surrogate_key'],
        },
      },
      {
        name: 'purge_all',
        description: 'Purge all cached content for a Fastly service — use with caution, all objects will be re-fetched',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to purge all cached objects for',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'get_service_stats',
        description: 'Get real-time or historical traffic statistics for a Fastly service (requests, bandwidth, cache hit rate)',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to retrieve stats for',
            },
            from: {
              type: 'string',
              description: 'Start time as Unix timestamp or relative string (e.g. 1h, 1d)',
            },
            to: {
              type: 'string',
              description: 'End time as Unix timestamp or "now" (default: now)',
            },
            by: {
              type: 'string',
              description: 'Time grouping: minute, hour (default), day',
            },
            region: {
              type: 'string',
              description: 'Filter by Fastly POP region (default: all regions)',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'list_acls',
        description: 'List all ACLs (Access Control Lists) on a Fastly service version for IP-based traffic rules',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to list ACLs for',
            },
            version_id: {
              type: 'number',
              description: 'Service version number',
            },
          },
          required: ['service_id', 'version_id'],
        },
      },
      {
        name: 'list_dictionaries',
        description: 'List all edge dictionaries (key-value stores) on a Fastly service version',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to list dictionaries for',
            },
            version_id: {
              type: 'number',
              description: 'Service version number',
            },
          },
          required: ['service_id', 'version_id'],
        },
      },
      {
        name: 'list_logging_endpoints',
        description: 'List all logging endpoints configured on a Fastly service version (S3, GCS, Splunk, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to list logging endpoints for',
            },
            version_id: {
              type: 'number',
              description: 'Service version number',
            },
            type: {
              type: 'string',
              description: 'Filter by logging type: s3, gcs, bigquery, splunk, syslog, https, kafka (default: all)',
            },
          },
          required: ['service_id', 'version_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_services':
          return this.listServices(args);
        case 'get_service':
          return this.getService(args);
        case 'create_service':
          return this.createService(args);
        case 'update_service':
          return this.updateService(args);
        case 'delete_service':
          return this.deleteService(args);
        case 'list_service_versions':
          return this.listServiceVersions(args);
        case 'clone_service_version':
          return this.cloneServiceVersion(args);
        case 'activate_service_version':
          return this.activateServiceVersion(args);
        case 'list_domains':
          return this.listDomains(args);
        case 'create_domain':
          return this.createDomain(args);
        case 'delete_domain':
          return this.deleteDomain(args);
        case 'list_backends':
          return this.listBackends(args);
        case 'create_backend':
          return this.createBackend(args);
        case 'update_backend':
          return this.updateBackend(args);
        case 'delete_backend':
          return this.deleteBackend(args);
        case 'purge_url':
          return this.purgeUrl(args);
        case 'purge_surrogate_key':
          return this.purgeSurrogateKey(args);
        case 'purge_all':
          return this.purgeAll(args);
        case 'get_service_stats':
          return this.getServiceStats(args);
        case 'list_acls':
          return this.listAcls(args);
        case 'list_dictionaries':
          return this.listDictionaries(args);
        case 'list_logging_endpoints':
          return this.listLoggingEndpoints(args);
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

  private get headers(): Record<string, string> {
    return {
      'Fastly-Key': this.apiToken,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async fastlyGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fastlyPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fastlyPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fastlyDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ status: 'ok' }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      per_page: String(Math.min((args.per_page as number) || 20, 20)),
    };
    if (args.direction) params.direction = args.direction as string;
    if (args.sort) params.sort = args.sort as string;
    return this.fastlyGet('/service', params);
  }

  private async getService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    return this.fastlyGet(`/service/${encodeURIComponent(args.service_id as string)}`);
  }

  private async createService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name, type: (args.type as string) || 'vcl' };
    if (args.comment) body.comment = args.comment;
    return this.fastlyPost('/service', body);
  }

  private async updateService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.comment) body.comment = args.comment;
    return this.fastlyPut(`/service/${encodeURIComponent(args.service_id as string)}`, body);
  }

  private async deleteService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    return this.fastlyDelete(`/service/${encodeURIComponent(args.service_id as string)}`);
  }

  private async listServiceVersions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    return this.fastlyGet(`/service/${encodeURIComponent(args.service_id as string)}/version`);
  }

  private async cloneServiceVersion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.version_id) return { content: [{ type: 'text', text: 'service_id and version_id are required' }], isError: true };
    return this.fastlyPut(`/service/${encodeURIComponent(args.service_id as string)}/version/${encodeURIComponent(args.version_id as string)}/clone`, {});
  }

  private async activateServiceVersion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.version_id) return { content: [{ type: 'text', text: 'service_id and version_id are required' }], isError: true };
    return this.fastlyPut(`/service/${encodeURIComponent(args.service_id as string)}/version/${encodeURIComponent(args.version_id as string)}/activate`, {});
  }

  private async listDomains(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.version_id) return { content: [{ type: 'text', text: 'service_id and version_id are required' }], isError: true };
    return this.fastlyGet(`/service/${encodeURIComponent(args.service_id as string)}/version/${encodeURIComponent(args.version_id as string)}/domain`);
  }

  private async createDomain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.version_id || !args.name) return { content: [{ type: 'text', text: 'service_id, version_id, and name are required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.comment) body.comment = args.comment;
    return this.fastlyPost(`/service/${encodeURIComponent(args.service_id as string)}/version/${encodeURIComponent(args.version_id as string)}/domain`, body);
  }

  private async deleteDomain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.version_id || !args.domain_name) return { content: [{ type: 'text', text: 'service_id, version_id, and domain_name are required' }], isError: true };
    return this.fastlyDelete(`/service/${encodeURIComponent(args.service_id as string)}/version/${encodeURIComponent(args.version_id as string)}/domain/${encodeURIComponent(args.domain_name as string)}`);
  }

  private async listBackends(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.version_id) return { content: [{ type: 'text', text: 'service_id and version_id are required' }], isError: true };
    return this.fastlyGet(`/service/${encodeURIComponent(args.service_id as string)}/version/${encodeURIComponent(args.version_id as string)}/backend`);
  }

  private async createBackend(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.version_id || !args.name || !args.address) {
      return { content: [{ type: 'text', text: 'service_id, version_id, name, and address are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name: args.name, address: args.address };
    if (args.port) body.port = args.port;
    if (typeof args.use_ssl === 'boolean') body.use_ssl = args.use_ssl;
    if (args.ssl_hostname) body.ssl_sni_hostname = args.ssl_hostname;
    return this.fastlyPost(`/service/${encodeURIComponent(args.service_id as string)}/version/${encodeURIComponent(args.version_id as string)}/backend`, body);
  }

  private async updateBackend(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.version_id || !args.backend_name) {
      return { content: [{ type: 'text', text: 'service_id, version_id, and backend_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.address) body.address = args.address;
    if (args.port) body.port = args.port;
    if (typeof args.use_ssl === 'boolean') body.use_ssl = args.use_ssl;
    return this.fastlyPut(`/service/${encodeURIComponent(args.service_id as string)}/version/${encodeURIComponent(args.version_id as string)}/backend/${encodeURIComponent(args.backend_name as string)}`, body);
  }

  private async deleteBackend(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.version_id || !args.backend_name) {
      return { content: [{ type: 'text', text: 'service_id, version_id, and backend_name are required' }], isError: true };
    }
    return this.fastlyDelete(`/service/${encodeURIComponent(args.service_id as string)}/version/${encodeURIComponent(args.version_id as string)}/backend/${encodeURIComponent(args.backend_name as string)}`);
  }

  private async purgeUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    // Fastly API: POST /purge/{cached_url} on api.fastly.com
    // The URL path after /purge/ is the full URL to purge (including scheme).
    const headers: Record<string, string> = { ...this.headers };
    if (args.soft) headers['Fastly-Soft-Purge'] = '1';
    const response = await this.fetchWithRetry(`${this.baseUrl}/purge/${encodeURIComponent(args.url as string)}`, { method: 'POST', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Purge error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ status: 'purged' }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async purgeSurrogateKey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.surrogate_key) return { content: [{ type: 'text', text: 'service_id and surrogate_key are required' }], isError: true };
    // Fastly API: POST /service/{service_id}/purge/{surrogate_key} for a single key
    const headers: Record<string, string> = { ...this.headers };
    if (args.soft) headers['Fastly-Soft-Purge'] = '1';
    const response = await this.fetchWithRetry(`${this.baseUrl}/service/${encodeURIComponent(args.service_id as string)}/purge/${encodeURIComponent(args.surrogate_key as string)}`, { method: 'POST', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Purge error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ status: 'purged' }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async purgeAll(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    return this.fastlyPost(`/service/${encodeURIComponent(args.service_id as string)}/purge_all`, {});
  }

  private async getServiceStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    const params: Record<string, string> = { by: (args.by as string) || 'hour' };
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    if (args.region) params.region = args.region as string;
    return this.fastlyGet(`/stats/service/${encodeURIComponent(args.service_id as string)}`, params);
  }

  private async listAcls(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.version_id) return { content: [{ type: 'text', text: 'service_id and version_id are required' }], isError: true };
    return this.fastlyGet(`/service/${encodeURIComponent(args.service_id as string)}/version/${encodeURIComponent(args.version_id as string)}/acl`);
  }

  private async listDictionaries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.version_id) return { content: [{ type: 'text', text: 'service_id and version_id are required' }], isError: true };
    return this.fastlyGet(`/service/${encodeURIComponent(args.service_id as string)}/version/${encodeURIComponent(args.version_id as string)}/dictionary`);
  }

  private async listLoggingEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.version_id) return { content: [{ type: 'text', text: 'service_id and version_id are required' }], isError: true };
    const type = (args.type as string) || 's3';
    return this.fastlyGet(`/service/${encodeURIComponent(args.service_id as string)}/version/${encodeURIComponent(args.version_id as string)}/logging/${type}`);
  }
}
