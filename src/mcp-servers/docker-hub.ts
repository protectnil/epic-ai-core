/**
 * Docker Hub MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/docker/hub-mcp — transport: stdio and streamable-HTTP, auth: PAT token
// Published by Docker Inc. (official). Actively maintained (2025). Exposes 13 tools.
// Our adapter covers: 14 tools. Vendor MCP covers: 13 tools.
// Recommendation: use-both — our adapter has tools not in the vendor MCP (delete_repository,
//   delete_tag, list_organization_members, list_organization_groups, list_access_tokens,
//   list_audit_logs, get_repository_vulnerabilities [UNVERIFIED — see note below]);
//   vendor MCP has tools not in our adapter (checkRepository, checkRepositoryTag,
//   dockerHardenedImages, getPersonalNamespace, listAllNamespacesMemberOf, updateRepositoryInfo).
//
// Integration: use-both
// MCP-sourced tools (6): checkRepository, checkRepositoryTag, dockerHardenedImages,
//   getPersonalNamespace, listAllNamespacesMemberOf, updateRepositoryInfo
// REST-sourced tools (8): delete_repository, delete_tag, list_organization_members,
//   list_organization_groups, list_access_tokens, list_audit_logs, get_tag,
//   get_repository_vulnerabilities [UNVERIFIED]
// Shared (6): list_repositories≈listRepositoriesByNamespace, get_repository≈getRepositoryInfo,
//   create_repository≈createRepository, list_tags≈listRepositoryTags, get_tag≈getRepositoryTag,
//   search_repositories≈search
// Combined coverage: 14 REST + 6 MCP-only = 20 operations total
//
// NOTE on get_repository_vulnerabilities: the path
//   /v2/repositories/{ns}/{repo}/tags/{tag}/vulnerabilities/ is NOT listed in the official
//   Docker Hub API reference at docs.docker.com/reference/api/hub/latest/. Vulnerability data
//   is available via Docker Scout (separate product/API), not the Hub REST API v2. This tool
//   is marked UNVERIFIED and left in place as a fallback — callers should expect 404.
//
// Base URL: https://hub.docker.com/v2
// Auth: Bearer token — Authorization: Bearer {token} (obtain via POST /v2/users/login)
// Docs: https://docs.docker.com/reference/api/hub/latest/
// Rate limits: Not officially documented; aggressive polling may trigger 429 responses.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DockerHubConfig {
  token: string;
  baseUrl?: string;
}

export class DockerHubMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: DockerHubConfig) {
    super();
    this.token = config.token;
    this.baseUrl = config.baseUrl ?? 'https://hub.docker.com/v2';
  }

  static catalog() {
    return {
      name: 'docker-hub',
      displayName: 'Docker Hub',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: [
        'docker', 'hub', 'container', 'image', 'repository', 'tag', 'namespace',
        'organization', 'registry', 'pull', 'push', 'vulnerability', 'scan',
      ],
      toolNames: [
        'list_repositories', 'get_repository', 'create_repository', 'delete_repository',
        'list_tags', 'get_tag', 'delete_tag',
        'search_repositories', 'list_namespaces',
        'list_organization_members', 'list_organization_groups',
        'get_repository_vulnerabilities',
        'list_access_tokens', 'list_audit_logs',
      ],
      description: 'Docker Hub operations: manage repositories, tags, organizations, access tokens, and audit logs via the Docker Hub REST API v2.',
      author: 'protectnil',
    };
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_repositories',
        description: 'List repositories for a Docker Hub namespace (username or organization) with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Docker Hub namespace — username or organization name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
          required: ['namespace'],
        },
      },
      {
        name: 'get_repository',
        description: 'Get details for a specific Docker Hub repository including pull count, star count, and description',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Docker Hub namespace (username or organization)',
            },
            repository: {
              type: 'string',
              description: 'Repository name',
            },
          },
          required: ['namespace', 'repository'],
        },
      },
      {
        name: 'create_repository',
        description: 'Create a new repository in a Docker Hub namespace',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Docker Hub namespace (username or organization)',
            },
            name: {
              type: 'string',
              description: 'Repository name (lowercase, alphanumeric and hyphens)',
            },
            description: {
              type: 'string',
              description: 'Short description of the repository',
            },
            is_private: {
              type: 'boolean',
              description: 'Whether to create a private repository (default: false)',
            },
          },
          required: ['namespace', 'name'],
        },
      },
      {
        name: 'delete_repository',
        description: 'Delete a repository from Docker Hub permanently (irreversible)',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Docker Hub namespace',
            },
            repository: {
              type: 'string',
              description: 'Repository name to delete',
            },
          },
          required: ['namespace', 'repository'],
        },
      },
      {
        name: 'list_tags',
        description: 'List tags for a Docker Hub repository with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Docker Hub namespace',
            },
            repository: {
              type: 'string',
              description: 'Repository name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
            name: {
              type: 'string',
              description: 'Filter tags by name prefix',
            },
          },
          required: ['namespace', 'repository'],
        },
      },
      {
        name: 'get_tag',
        description: 'Get details for a specific tag in a Docker Hub repository including digest, size, and architecture',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Docker Hub namespace',
            },
            repository: {
              type: 'string',
              description: 'Repository name',
            },
            tag: {
              type: 'string',
              description: 'Tag name (e.g. latest, 1.0.0)',
            },
          },
          required: ['namespace', 'repository', 'tag'],
        },
      },
      {
        name: 'delete_tag',
        description: 'Delete a specific tag from a Docker Hub repository',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Docker Hub namespace',
            },
            repository: {
              type: 'string',
              description: 'Repository name',
            },
            tag: {
              type: 'string',
              description: 'Tag name to delete',
            },
          },
          required: ['namespace', 'repository', 'tag'],
        },
      },
      {
        name: 'search_repositories',
        description: 'Search Docker Hub repositories by keyword with optional type filter',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
            type: {
              type: 'string',
              description: 'Filter by type: image or plugin',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_namespaces',
        description: 'List all namespaces the authenticated user has access to (personal and organizations)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_organization_members',
        description: 'List members of a Docker Hub organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'Organization name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
          required: ['organization'],
        },
      },
      {
        name: 'list_organization_groups',
        description: 'List teams/groups within a Docker Hub organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'Organization name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
          required: ['organization'],
        },
      },
      {
        name: 'get_repository_vulnerabilities',
        description: 'Get vulnerability scan results for a repository tag using Docker Scout/Hub scanning',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Docker Hub namespace',
            },
            repository: {
              type: 'string',
              description: 'Repository name',
            },
            tag: {
              type: 'string',
              description: 'Tag name to check vulnerabilities for (default: latest)',
            },
          },
          required: ['namespace', 'repository'],
        },
      },
      {
        name: 'list_access_tokens',
        description: 'List personal access tokens for the authenticated Docker Hub user',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'list_audit_logs',
        description: 'List audit log events for a Docker Hub organization with optional action and actor filters',
        inputSchema: {
          type: 'object',
          properties: {
            organization: {
              type: 'string',
              description: 'Organization name to retrieve audit logs for',
            },
            action: {
              type: 'string',
              description: 'Filter by action type (e.g. repo.push, repo.delete, team.create)',
            },
            actor: {
              type: 'string',
              description: 'Filter by actor username who performed the action',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 25, max: 100)',
            },
          },
          required: ['organization'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_repositories':
          return await this.listRepositories(args);
        case 'get_repository':
          return await this.getRepository(args);
        case 'create_repository':
          return await this.createRepository(args);
        case 'delete_repository':
          return await this.deleteRepository(args);
        case 'list_tags':
          return await this.listTags(args);
        case 'get_tag':
          return await this.getTag(args);
        case 'delete_tag':
          return await this.deleteTag(args);
        case 'search_repositories':
          return await this.searchRepositories(args);
        case 'list_namespaces':
          return await this.listNamespaces();
        case 'list_organization_members':
          return await this.listOrganizationMembers(args);
        case 'list_organization_groups':
          return await this.listOrganizationGroups(args);
        case 'get_repository_vulnerabilities':
          return await this.getRepositoryVulnerabilities(args);
        case 'list_access_tokens':
          return await this.listAccessTokens(args);
        case 'list_audit_logs':
          return await this.listAuditLogs(args);
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

  private async fetch(url: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      ...options,
      headers: { ...this.headers, ...(options?.headers as Record<string, string> ?? {}) },
    });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Docker Hub API error ${response.status} ${response.statusText}: ${errBody}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Docker Hub returned non-JSON response (HTTP ${response.status})`);
    }
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listRepositories(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 25),
    });
    return this.fetch(`${this.baseUrl}/repositories/${encodeURIComponent(args.namespace as string)}/?${params}`);
  }

  private async getRepository(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetch(`${this.baseUrl}/repositories/${encodeURIComponent(args.namespace as string)}/${encodeURIComponent(args.repository as string)}/`);
  }

  private async createRepository(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      namespace: args.namespace,
      name: args.name,
      is_private: (args.is_private as boolean) ?? false,
    };
    if (args.description) body.description = args.description;
    return this.fetch(`${this.baseUrl}/repositories/`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async deleteRepository(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetch(`${this.baseUrl}/repositories/${encodeURIComponent(args.namespace as string)}/${encodeURIComponent(args.repository as string)}/`, { method: 'DELETE' });
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 25),
    });
    if (args.name) params.set('name', args.name as string);
    return this.fetch(`${this.baseUrl}/repositories/${encodeURIComponent(args.namespace as string)}/${encodeURIComponent(args.repository as string)}/tags?${params}`);
  }

  private async getTag(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetch(`${this.baseUrl}/repositories/${encodeURIComponent(args.namespace as string)}/${encodeURIComponent(args.repository as string)}/tags/${encodeURIComponent(args.tag as string)}/`);
  }

  private async deleteTag(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetch(`${this.baseUrl}/repositories/${encodeURIComponent(args.namespace as string)}/${encodeURIComponent(args.repository as string)}/tags/${encodeURIComponent(args.tag as string)}/`, { method: 'DELETE' });
  }

  private async searchRepositories(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      query: String(args.query),
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 25),
    });
    if (args.type) params.set('type', args.type as string);
    return this.fetch(`${this.baseUrl}/search/repositories/?${params}`);
  }

  private async listNamespaces(): Promise<ToolResult> {
    return this.fetch(`${this.baseUrl}/namespaces/`);
  }

  private async listOrganizationMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 25),
    });
    return this.fetch(`${this.baseUrl}/orgs/${encodeURIComponent(args.organization as string)}/members/?${params}`);
  }

  private async listOrganizationGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 25),
    });
    return this.fetch(`${this.baseUrl}/orgs/${encodeURIComponent(args.organization as string)}/groups/?${params}`);
  }

  private async getRepositoryVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const tag = (args.tag as string) ?? 'latest';
    return this.fetch(`${this.baseUrl}/repositories/${encodeURIComponent(args.namespace as string)}/${encodeURIComponent(args.repository as string)}/tags/${tag}/vulnerabilities/`);
  }

  private async listAccessTokens(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 25),
    });
    return this.fetch(`${this.baseUrl}/access-tokens/?${params}`);
  }

  private async listAuditLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      page: String((args.page as number) ?? 1),
      page_size: String((args.page_size as number) ?? 25),
    });
    if (args.action) params.set('action', args.action as string);
    if (args.actor) params.set('actor', args.actor as string);
    return this.fetch(`${this.baseUrl}/orgs/${encodeURIComponent(args.organization as string)}/audit-logs/?${params}`);
  }
}
