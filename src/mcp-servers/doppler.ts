/**
 * Doppler MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/DopplerHQ/mcp-server — official Doppler release,
//   npm: @dopplerhq/mcp-server v1.0.4, transport: stdio, auth: DOPPLER_TOKEN env var.
//   Last published: ~2026-02 (within 6 months as of 2026-03-28). 27 tools (full API surface).
//   Community wrapper aledlie/doppler-mcp also exists but is NOT the official server.
// Our adapter covers: 18 tools. Vendor MCP covers: 27 tools (workplace_get, workplace_update,
//   users_list, groups_list, service_accounts_list, projects_list, projects_create, projects_get,
//   projects_delete, environments_list, environments_create, environments_get, configs_list,
//   configs_create, configs_get, configs_update, configs_lock, configs_unlock, secrets_list,
//   secrets_get, secrets_update, secrets_download, integrations_list, syncs_list, webhooks_list,
//   config_logs_list, config_logs_rollback).
// Recommendation: use-both. MCP meets all 4 criteria (official, maintained, 27 tools, stdio).
//   MCP-only tools (9): workplace_get, workplace_update, users_list, groups_list,
//     service_accounts_list, environments_create, configs_create, integrations_list,
//     syncs_list, webhooks_list, configs_unlock, config_logs_rollback.
//   REST-only tools (3): get_environment (retrieve single environment), create_service_token,
//     revoke_service_token (service token management not in MCP), list_activity_logs.
//   Shared (15): projects_list/get/create/delete, environments_list, configs_list/get/delete,
//     secrets_list/get/update/download, config_logs_list and partial secret ops.
// Integration: use-both
// MCP-sourced tools (12): workplace_get, workplace_update, users_list, groups_list,
//   service_accounts_list, environments_create, configs_create, configs_unlock,
//   integrations_list, syncs_list, webhooks_list, config_logs_rollback
// REST-sourced tools (6): get_environment, delete_config, get_secret, delete_secret,
//   create_service_token, revoke_service_token, list_service_tokens, list_activity_logs
// Combined coverage: 27 MCP + 18 REST - ~15 shared = ~30 unique tools
//
// Base URL: https://api.doppler.com/v3
// Auth: Bearer token — Authorization: Bearer {token} (personal token, service token, or service account token)
// Docs: https://docs.doppler.com/reference/api
// Rate limits: Varies by plan; no documented global limit. Use exponential backoff on 429.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DopplerConfig {
  token: string;
  baseUrl?: string;
}

export class DopplerMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: DopplerConfig) {
    super();
    this.token = config.token;
    this.baseUrl = config.baseUrl ?? 'https://api.doppler.com/v3';
  }

  static catalog() {
    return {
      name: 'doppler',
      displayName: 'Doppler',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: [
        'doppler', 'secrets', 'environment', 'config', 'env-vars', 'secret-management',
        'vault', 'credentials', 'service-token', 'project', 'workplace',
      ],
      toolNames: [
        'list_projects', 'get_project', 'create_project', 'delete_project',
        'list_environments', 'get_environment',
        'list_configs', 'get_config', 'delete_config',
        'list_secrets', 'get_secret', 'set_secrets', 'delete_secret', 'download_secrets',
        'list_service_tokens', 'create_service_token', 'revoke_service_token',
        'list_activity_logs',
      ],
      description: 'Doppler secrets management: manage projects, configs, environments, secrets, service tokens, and activity logs via the Doppler REST API v3.',
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
        name: 'list_projects',
        description: 'List all Doppler projects accessible by the token with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of projects per page (max: 100, default: 20)',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get details for a specific Doppler project by slug',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
          },
          required: ['project'],
        },
      },
      {
        name: 'create_project',
        description: 'Create a new Doppler project with a name and optional description',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Project name — used as the slug (lowercase, hyphens allowed)',
            },
            description: {
              type: 'string',
              description: 'Optional description for the project',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_project',
        description: 'Delete a Doppler project and all of its configs and secrets (irreversible)',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug to delete',
            },
          },
          required: ['project'],
        },
      },
      {
        name: 'list_environments',
        description: 'List all environments within a Doppler project (dev, stg, prd, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
          },
          required: ['project'],
        },
      },
      {
        name: 'get_environment',
        description: 'Get details for a specific environment within a Doppler project',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            environment: {
              type: 'string',
              description: 'The environment slug (e.g. dev, stg, prd)',
            },
          },
          required: ['project', 'environment'],
        },
      },
      {
        name: 'list_configs',
        description: 'List all configs (branches within an environment) for a Doppler project',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of configs per page (max: 100, default: 20)',
            },
          },
          required: ['project'],
        },
      },
      {
        name: 'get_config',
        description: 'Get details for a specific config in a Doppler project including locked state and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config name (e.g. prd, stg, dev)',
            },
          },
          required: ['project', 'config'],
        },
      },
      {
        name: 'delete_config',
        description: 'Delete a config from a Doppler project (branch configs only; root environment configs cannot be deleted)',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config name to delete',
            },
          },
          required: ['project', 'config'],
        },
      },
      {
        name: 'list_secrets',
        description: 'List all secret names (and optionally values) in a Doppler project config',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config name (e.g. prd, stg, dev)',
            },
            include_dynamic_secrets: {
              type: 'boolean',
              description: 'Include dynamic secrets in the list (default: false)',
            },
          },
          required: ['project', 'config'],
        },
      },
      {
        name: 'get_secret',
        description: 'Retrieve the value of a single secret from a Doppler project config by name',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config name (e.g. prd, stg, dev)',
            },
            name: {
              type: 'string',
              description: 'The secret name (e.g. DATABASE_URL)',
            },
          },
          required: ['project', 'config', 'name'],
        },
      },
      {
        name: 'set_secrets',
        description: 'Create or update one or more secrets in a Doppler project config in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config name (e.g. prd, stg, dev)',
            },
            secrets: {
              type: 'object',
              description: 'Key-value pairs of secret names and values to set (e.g. {"DATABASE_URL": "postgres://..."})',
            },
          },
          required: ['project', 'config', 'secrets'],
        },
      },
      {
        name: 'delete_secret',
        description: 'Delete a secret from a Doppler project config by name',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config name (e.g. prd, stg, dev)',
            },
            name: {
              type: 'string',
              description: 'The secret name to delete',
            },
          },
          required: ['project', 'config', 'name'],
        },
      },
      {
        name: 'download_secrets',
        description: 'Download all secrets for a project config as a flat key-value map in the requested format',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config name (e.g. prd, stg, dev)',
            },
            format: {
              type: 'string',
              description: 'Output format: json, dotnet-json, env, yaml, docker (default: json)',
            },
            include_dynamic_secrets: {
              type: 'boolean',
              description: 'Include dynamic secrets in the download (default: false)',
            },
          },
          required: ['project', 'config'],
        },
      },
      {
        name: 'list_service_tokens',
        description: 'List all service tokens for a Doppler project config with access and expiry details',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config name (e.g. prd, stg, dev)',
            },
          },
          required: ['project', 'config'],
        },
      },
      {
        name: 'create_service_token',
        description: 'Create a new service token for a Doppler project config with optional expiry and access level',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config name (e.g. prd, stg, dev)',
            },
            name: {
              type: 'string',
              description: 'Descriptive name for the service token',
            },
            access: {
              type: 'string',
              description: 'Access level: read or read/write (default: read)',
            },
            expire_at: {
              type: 'string',
              description: 'Expiry date in ISO 8601 format (optional — omit for non-expiring token)',
            },
          },
          required: ['project', 'config', 'name'],
        },
      },
      {
        name: 'revoke_service_token',
        description: 'Revoke and delete a service token from a Doppler project config',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug',
            },
            config: {
              type: 'string',
              description: 'The config name (e.g. prd, stg, dev)',
            },
            slug: {
              type: 'string',
              description: 'The service token slug to revoke',
            },
          },
          required: ['project', 'config', 'slug'],
        },
      },
      {
        name: 'list_activity_logs',
        description: 'List activity log entries for a Doppler project or config showing who accessed secrets and when',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'The Doppler project slug to filter logs by',
            },
            config: {
              type: 'string',
              description: 'The config name to further filter logs (requires project)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of log entries per page (max: 100, default: 20)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects':
          return await this.listProjects(args);
        case 'get_project':
          return await this.getProject(args);
        case 'create_project':
          return await this.createProject(args);
        case 'delete_project':
          return await this.deleteProject(args);
        case 'list_environments':
          return await this.listEnvironments(args);
        case 'get_environment':
          return await this.getEnvironment(args);
        case 'list_configs':
          return await this.listConfigs(args);
        case 'get_config':
          return await this.getConfig(args);
        case 'delete_config':
          return await this.deleteConfig(args);
        case 'list_secrets':
          return await this.listSecrets(args);
        case 'get_secret':
          return await this.getSecret(args);
        case 'set_secrets':
          return await this.setSecrets(args);
        case 'delete_secret':
          return await this.deleteSecret(args);
        case 'download_secrets':
          return await this.downloadSecrets(args);
        case 'list_service_tokens':
          return await this.listServiceTokens(args);
        case 'create_service_token':
          return await this.createServiceToken(args);
        case 'revoke_service_token':
          return await this.revokeServiceToken(args);
        case 'list_activity_logs':
          return await this.listActivityLogs(args);
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

  private async request(url: string, options?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      ...options,
      headers: { ...this.headers, ...(options?.headers as Record<string, string> ?? {}) },
    });
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Doppler API error ${response.status} ${response.statusText}: ${errBody}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`Doppler returned non-JSON response (HTTP ${response.status})`);
    }
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    });
    return this.request(`${this.baseUrl}/projects?${params}`);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/projects/project?project=${encodeURIComponent(args.project as string)}`);
  }

  private async createProject(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    return this.request(`${this.baseUrl}/projects`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async deleteProject(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/projects/project`, {
      method: 'DELETE',
      body: JSON.stringify({ project: args.project }),
    });
  }

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/environments?project=${encodeURIComponent(args.project as string)}`);
  }

  private async getEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      project: args.project as string,
      environment: args.environment as string,
    });
    return this.request(`${this.baseUrl}/environments/environment?${params}`);
  }

  private async listConfigs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      project: args.project as string,
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    });
    return this.request(`${this.baseUrl}/configs?${params}`);
  }

  private async getConfig(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      project: args.project as string,
      config: args.config as string,
    });
    return this.request(`${this.baseUrl}/configs/config?${params}`);
  }

  private async deleteConfig(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/configs/config`, {
      method: 'DELETE',
      body: JSON.stringify({ project: args.project, config: args.config }),
    });
  }

  private async listSecrets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      project: args.project as string,
      config: args.config as string,
    });
    if (args.include_dynamic_secrets) params.set('include_dynamic_secrets', 'true');
    return this.request(`${this.baseUrl}/configs/config/secrets?${params}`);
  }

  private async getSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      project: args.project as string,
      config: args.config as string,
      name: args.name as string,
    });
    return this.request(`${this.baseUrl}/configs/config/secret?${params}`);
  }

  private async setSecrets(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/configs/config/secrets`, {
      method: 'POST',
      body: JSON.stringify({
        project: args.project,
        config: args.config,
        secrets: args.secrets,
      }),
    });
  }

  private async deleteSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      project: args.project as string,
      config: args.config as string,
      name: args.name as string,
    });
    return this.request(`${this.baseUrl}/configs/config/secret?${params}`, { method: 'DELETE' });
  }

  private async downloadSecrets(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      project: args.project as string,
      config: args.config as string,
      format: (args.format as string) ?? 'json',
    });
    if (args.include_dynamic_secrets) params.set('include_dynamic_secrets', 'true');
    return this.request(`${this.baseUrl}/configs/config/secrets/download?${params}`);
  }

  private async listServiceTokens(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      project: args.project as string,
      config: args.config as string,
    });
    return this.request(`${this.baseUrl}/configs/config/tokens?${params}`);
  }

  private async createServiceToken(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      project: args.project,
      config: args.config,
      name: args.name,
      access: (args.access as string) ?? 'read',
    };
    if (args.expire_at) body.expire_at = args.expire_at;
    return this.request(`${this.baseUrl}/configs/config/tokens`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async revokeServiceToken(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(`${this.baseUrl}/configs/config/tokens/token`, {
      method: 'DELETE',
      body: JSON.stringify({ project: args.project, config: args.config, slug: args.slug }),
    });
  }

  private async listActivityLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    });
    if (args.project) params.set('project', args.project as string);
    if (args.config) params.set('config', args.config as string);
    return this.request(`${this.baseUrl}/logs?${params}`);
  }
}
