/**
 * Sonatype Nexus Repository MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 for Nexus Repository Manager administration.
//   https://github.com/sonatype/dependency-management-mcp-server exists but covers OSS dependency
//   intelligence only — NOT Nexus repo management. Community MCP https://github.com/brianveltman/sonatype-mcp
//   exists (npm: @brianveltman/sonatype-mcp) but is not published by Sonatype Inc.
// Our adapter covers: 16 tools (repositories, components, assets, security, blob stores, tasks, routing rules).
// Recommendation: use-rest-api — no official Sonatype MCP for repository administration.
//
// Base URL: https://nexus.example.com (self-hosted, no trailing slash; no public SaaS base URL)
// Auth: Basic authentication (username + password encoded as Base64)
// Docs: https://help.sonatype.com/en/rest-apis.html
// Rate limits: Not publicly documented; governed by instance configuration

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SonatypeNexusConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export class SonatypeNexusMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: SonatypeNexusConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
  }

  static catalog() {
    return {
      name: 'sonatype-nexus',
      displayName: 'Sonatype Nexus',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: ['nexus', 'sonatype', 'artifact', 'repository', 'maven', 'npm', 'docker', 'pypi', 'helm', 'package', 'registry', 'artifact management', 'blob store'],
      toolNames: [
        'list_repositories', 'get_repository', 'search_components', 'get_component',
        'delete_component', 'list_assets', 'get_asset', 'delete_asset',
        'list_blob_stores', 'get_blob_store', 'list_users', 'list_roles',
        'list_routing_rules', 'list_tasks', 'run_task', 'get_system_status',
      ],
      description: 'Nexus Repository Manager: manage repositories, search and delete components and assets, administer users, roles, blob stores, tasks, and routing rules.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_repositories',
        description: 'List all repositories configured in Nexus Repository Manager with type, format, and URL',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_repository',
        description: 'Get full configuration details for a specific Nexus repository by name',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryName: {
              type: 'string',
              description: 'Name of the repository to retrieve',
            },
          },
          required: ['repositoryName'],
        },
      },
      {
        name: 'search_components',
        description: 'Search for components (artifacts) across repositories by repository, format, group, name, or version',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Limit search to this repository name',
            },
            format: {
              type: 'string',
              description: 'Repository format: maven2, npm, pypi, docker, helm, raw, yum, apt, rubygems, go, etc.',
            },
            group: {
              type: 'string',
              description: 'Component group (Maven groupId, npm scope, etc.)',
            },
            name: {
              type: 'string',
              description: 'Component name (Maven artifactId, npm package name, etc.)',
            },
            version: {
              type: 'string',
              description: 'Component version string',
            },
            continuationToken: {
              type: 'string',
              description: 'Continuation token returned from a previous search to fetch the next page',
            },
          },
        },
      },
      {
        name: 'get_component',
        description: 'Get full details for a specific component by its Nexus component ID, including all associated assets',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Nexus component ID (obtained from search_components results)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_component',
        description: 'Permanently delete a component and all its associated assets from Nexus (irreversible)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Nexus component ID to delete (obtained from search_components results)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_assets',
        description: 'List individual asset files in a repository with optional pagination via continuation token',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name to list assets from',
            },
            continuationToken: {
              type: 'string',
              description: 'Continuation token from a previous response to fetch the next page of assets',
            },
          },
          required: ['repository'],
        },
      },
      {
        name: 'get_asset',
        description: 'Get details for a specific asset file by its Nexus asset ID including checksum and content type',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Nexus asset ID (obtained from list_assets or search_components results)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_asset',
        description: 'Permanently delete a specific asset file from Nexus by its asset ID (irreversible)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Nexus asset ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_blob_stores',
        description: 'List all blob stores configured in Nexus, showing type, name, and usage statistics',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_blob_store',
        description: 'Get quota status for a specific blob store by name — returns quota limit, used space, and whether quota is violated',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Blob store name to retrieve',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_users',
        description: 'Search for users in Nexus by source or username, returning login, roles, and status',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'User source to filter by: default (local), LDAP, etc. (default: all sources)',
            },
            userId: {
              type: 'string',
              description: 'Filter by partial or full user ID (login name)',
            },
          },
        },
      },
      {
        name: 'list_roles',
        description: 'List all roles defined in Nexus Repository with their privileges and descriptions',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              description: 'Role source to filter by (default: all sources including LDAP mapped roles)',
            },
          },
        },
      },
      {
        name: 'list_routing_rules',
        description: 'List all routing rules that control which repository receives or blocks requests matching a pattern',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_tasks',
        description: 'List all scheduled tasks in Nexus with their type, status, and next scheduled run time',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by task type (e.g. repository.cleanup, blobstore.compact)',
            },
          },
        },
      },
      {
        name: 'run_task',
        description: 'Manually trigger a scheduled task to run immediately by its task ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Task ID to run (obtained from list_tasks results)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_system_status',
        description: 'Get the health and availability status of the Nexus Repository server',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_repositories':
          return await this.listRepositories();
        case 'get_repository':
          return await this.getRepository(args);
        case 'search_components':
          return await this.searchComponents(args);
        case 'get_component':
          return await this.getComponent(args);
        case 'delete_component':
          return await this.deleteComponent(args);
        case 'list_assets':
          return await this.listAssets(args);
        case 'get_asset':
          return await this.getAsset(args);
        case 'delete_asset':
          return await this.deleteAsset(args);
        case 'list_blob_stores':
          return await this.listBlobStores();
        case 'get_blob_store':
          return await this.getBlobStore(args);
        case 'list_users':
          return await this.listUsers(args);
        case 'list_roles':
          return await this.listRoles(args);
        case 'list_routing_rules':
          return await this.listRoutingRules();
        case 'list_tasks':
          return await this.listTasks(args);
        case 'run_task':
          return await this.runTask(args);
        case 'get_system_status':
          return await this.getSystemStatus();
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
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async listRepositories(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/service/rest/v1/repositories`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list repositories: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRepository(args: Record<string, unknown>): Promise<ToolResult> {
    const repositoryName = args.repositoryName as string;
    if (!repositoryName) {
      return { content: [{ type: 'text', text: 'repositoryName is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/service/rest/v1/repositories/${encodeURIComponent(repositoryName)}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get repository: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchComponents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.repository) params.push(`repository=${encodeURIComponent(args.repository as string)}`);
    if (args.format) params.push(`format=${encodeURIComponent(args.format as string)}`);
    if (args.group) params.push(`group=${encodeURIComponent(args.group as string)}`);
    if (args.name) params.push(`name=${encodeURIComponent(args.name as string)}`);
    if (args.version) params.push(`version=${encodeURIComponent(args.version as string)}`);
    if (args.continuationToken) params.push(`continuationToken=${encodeURIComponent(args.continuationToken as string)}`);

    const url = `${this.baseUrl}/service/rest/v1/search${params.length > 0 ? '?' + params.join('&') : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to search components: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getComponent(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/service/rest/v1/components/${encodeURIComponent(id)}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get component: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteComponent(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/service/rest/v1/components/${encodeURIComponent(id)}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to delete component: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Component ${id} deleted successfully` }) }], isError: false };
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const repository = args.repository as string;
    if (!repository) {
      return { content: [{ type: 'text', text: 'repository is required' }], isError: true };
    }
    let url = `${this.baseUrl}/service/rest/v1/assets?repository=${encodeURIComponent(repository)}`;
    if (args.continuationToken) url += `&continuationToken=${encodeURIComponent(args.continuationToken as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list assets: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/service/rest/v1/assets/${encodeURIComponent(id)}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get asset: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteAsset(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/service/rest/v1/assets/${encodeURIComponent(id)}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to delete asset: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Asset ${id} deleted successfully` }) }], isError: false };
  }

  private async listBlobStores(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/service/rest/v1/blobstores`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list blob stores: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getBlobStore(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    // The quota endpoint provides detailed configuration including quota limits
    const response = await this.fetchWithRetry(`${this.baseUrl}/service/rest/v1/blobstores/${encodeURIComponent(name)}/quota-status`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get blob store: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: string[] = [];
    if (args.source) params.push(`source=${encodeURIComponent(args.source as string)}`);
    if (args.userId) params.push(`userId=${encodeURIComponent(args.userId as string)}`);

    const url = `${this.baseUrl}/service/rest/v1/security/users${params.length > 0 ? '?' + params.join('&') : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list users: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRoles(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}/service/rest/v1/security/roles`;
    if (args.source) url += `?source=${encodeURIComponent(args.source as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list roles: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listRoutingRules(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/service/rest/v1/routing-rules`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list routing rules: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    let url = `${this.baseUrl}/service/rest/v1/tasks`;
    if (args.type) url += `?type=${encodeURIComponent(args.type as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list tasks: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async runTask(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/service/rest/v1/tasks/${encodeURIComponent(id)}/run`, { method: 'POST', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to run task: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Task ${id} triggered successfully` }) }], isError: false };
  }

  private async getSystemStatus(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/service/rest/v1/status/check`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get system status: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
