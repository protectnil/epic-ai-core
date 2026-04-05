/**
 * Visual Studio Codespaces (VSOnline) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
//   No official Microsoft MCP server for VS Codespaces (online.visualstudio.com) was found on GitHub.
//   Note: Azure DevOps has an official MCP (@azure-devops/mcp); VS Codespaces is a separate product.
//
// Our adapter covers: 15 tools (environments, secrets, locations, agents, SAS tokens, health).
// Recommendation: Use this adapter for full VS Codespaces / GitHub Codespaces REST API access.
//
// Base URL: https://online.visualstudio.com
// Auth: Bearer token (Azure AD / GitHub OAuth) — Authorization: Bearer {token}
// Docs: https://online.visualstudio.com/api/v1/swagger
// Spec: https://api.apis.guru/v2/specs/visualstudio.com/v1/openapi.json
// Rate limits: Standard Azure service limits apply; contact Microsoft for enterprise quotas.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VisualStudioConfig {
  accessToken: string;
  /** Optional base URL override (default: https://online.visualstudio.com) */
  baseUrl?: string;
}

function truncate(text: string): string {
  return text.length > 10_000
    ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
    : text;
}

export class VisualStudioMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: VisualStudioConfig) {
    super();
    this.token = config.accessToken;
    this.baseUrl = (config.baseUrl ?? 'https://online.visualstudio.com').replace(/\/$/, '');
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'visualstudio',
      displayName: 'Visual Studio Codespaces',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: [
        'visual studio', 'codespaces', 'vsonline', 'dev environment', 'cloud ide',
        'remote development', 'devcontainer', 'environment', 'workspace', 'microsoft',
        'github codespaces', 'cloud workspace', 'development box',
      ],
      toolNames: [
        'list_environments', 'get_environment', 'create_environment', 'delete_environment',
        'start_environment', 'shutdown_environment', 'get_environment_state',
        'update_environment_folder',
        'list_secrets', 'create_secret', 'update_secret', 'delete_secret',
        'list_locations', 'get_location',
        'health_check',
      ],
      description: 'Visual Studio Codespaces (VSOnline): create, start, stop, and manage cloud development environments, secrets, and available datacenter locations.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Environments ─────────────────────────────────────────────────────
      {
        name: 'list_environments',
        description: 'List all VS Codespaces environments accessible to the authenticated user, with optional name, plan, and deleted-state filters.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter environments by name (partial match)' },
            planId: { type: 'string', description: 'Filter by billing plan ID' },
            deleted: { type: 'boolean', description: 'Include soft-deleted environments (default: false)' },
          },
        },
      },
      {
        name: 'get_environment',
        description: 'Get full details for a specific VS Codespaces environment by ID, including lifecycle state, SKU, and optional connection info.',
        inputSchema: {
          type: 'object',
          properties: {
            environmentId: { type: 'string', description: 'Environment ID (GUID)' },
            connect: { type: 'boolean', description: 'Include connection info in the response (default: false)' },
          },
          required: ['environmentId'],
        },
      },
      {
        name: 'create_environment',
        description: 'Create a new VS Codespaces cloud development environment with a specified SKU, datacenter location, and optional git repository.',
        inputSchema: {
          type: 'object',
          properties: {
            friendlyName: { type: 'string', description: 'Display name for the environment' },
            planId: { type: 'string', description: 'Billing plan ID to associate with the environment' },
            location: { type: 'string', description: 'Azure datacenter location (e.g. eastus, westeurope)' },
            skuName: { type: 'string', description: 'SKU / machine type name (e.g. standardLinux)' },
            gitRepositoryUrl: { type: 'string', description: 'Git repository URL to clone into the environment' },
            dotfilesRepository: { type: 'string', description: 'Dotfiles repository URL to auto-configure the environment' },
            dotfilesTargetPath: { type: 'string', description: 'Target path for dotfiles in the environment' },
            dotfilesInstallCommand: { type: 'string', description: 'Install command to run after dotfiles are cloned' },
          },
          required: ['friendlyName', 'planId', 'location', 'skuName'],
        },
      },
      {
        name: 'delete_environment',
        description: 'Permanently delete a VS Codespaces environment. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            environmentId: { type: 'string', description: 'Environment ID (GUID) to delete' },
          },
          required: ['environmentId'],
        },
      },
      {
        name: 'start_environment',
        description: 'Start (resume) a suspended or stopped VS Codespaces environment.',
        inputSchema: {
          type: 'object',
          properties: {
            environmentId: { type: 'string', description: 'Environment ID (GUID) to start' },
          },
          required: ['environmentId'],
        },
      },
      {
        name: 'shutdown_environment',
        description: 'Shut down (suspend) a running VS Codespaces environment to stop active compute billing while retaining data.',
        inputSchema: {
          type: 'object',
          properties: {
            environmentId: { type: 'string', description: 'Environment ID (GUID) to shut down' },
          },
          required: ['environmentId'],
        },
      },
      {
        name: 'get_environment_state',
        description: 'Get the current lifecycle state of a VS Codespaces environment (e.g. Available, Shutdown, Starting, Unavailable).',
        inputSchema: {
          type: 'object',
          properties: {
            environmentId: { type: 'string', description: 'Environment ID (GUID)' },
          },
          required: ['environmentId'],
        },
      },
      {
        name: 'update_environment_folder',
        description: 'Update the default working folder path for a VS Codespaces environment.',
        inputSchema: {
          type: 'object',
          properties: {
            environmentId: { type: 'string', description: 'Environment ID (GUID)' },
            folder: { type: 'string', description: 'New working folder path inside the environment (e.g. /workspaces/my-repo)' },
          },
          required: ['environmentId', 'folder'],
        },
      },
      // ── Secrets ──────────────────────────────────────────────────────────
      {
        name: 'list_secrets',
        description: 'List all secrets available for VS Codespaces environments under a billing plan.',
        inputSchema: {
          type: 'object',
          properties: {
            planId: { type: 'string', description: 'Billing plan ID to filter secrets by' },
          },
        },
      },
      {
        name: 'create_secret',
        description: 'Create a new secret to be injected as an environment variable into VS Codespaces environments, with optional repository filters.',
        inputSchema: {
          type: 'object',
          properties: {
            planId: { type: 'string', description: 'Billing plan ID to associate the secret with' },
            name: { type: 'string', description: 'Secret name (becomes the environment variable name)' },
            value: { type: 'string', description: 'Secret value' },
            notes: { type: 'string', description: 'Optional notes about the secret' },
            filters: {
              type: 'array',
              items: { type: 'string' },
              description: 'Repository filters — list of repo URLs where this secret is injected',
            },
          },
          required: ['name', 'value'],
        },
      },
      {
        name: 'update_secret',
        description: 'Update an existing VS Codespaces secret value, notes, or repository filters.',
        inputSchema: {
          type: 'object',
          properties: {
            secretId: { type: 'string', description: 'Secret ID (GUID)' },
            planId: { type: 'string', description: 'Billing plan ID associated with the secret' },
            name: { type: 'string', description: 'Updated secret name (environment variable name)' },
            value: { type: 'string', description: 'Updated secret value' },
            notes: { type: 'string', description: 'Updated notes about the secret' },
            filters: {
              type: 'array',
              items: { type: 'string' },
              description: 'Updated repository filters — list of repo URLs where this secret is injected',
            },
          },
          required: ['secretId'],
        },
      },
      {
        name: 'delete_secret',
        description: 'Delete a VS Codespaces secret permanently.',
        inputSchema: {
          type: 'object',
          properties: {
            secretId: { type: 'string', description: 'Secret ID (GUID) to delete' },
            planId: { type: 'string', description: 'Billing plan ID associated with the secret' },
            scope: { type: 'string', description: 'Scope of the secret deletion (e.g. plan, user)' },
          },
          required: ['secretId'],
        },
      },
      // ── Locations ────────────────────────────────────────────────────────
      {
        name: 'list_locations',
        description: 'List all Azure datacenter locations where VS Codespaces environments can be created, including available SKUs per location.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_location',
        description: 'Get details for a specific VS Codespaces datacenter location including available SKUs and service capabilities.',
        inputSchema: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'Azure datacenter location name (e.g. eastus, westeurope)' },
          },
          required: ['location'],
        },
      },
      // ── Health ───────────────────────────────────────────────────────────
      {
        name: 'health_check',
        description: 'Check the health and availability status of the VS Codespaces service endpoint.',
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
        case 'list_environments':         return this.listEnvironments(args);
        case 'get_environment':           return this.getEnvironment(args);
        case 'create_environment':        return this.createEnvironment(args);
        case 'delete_environment':        return this.deleteEnvironment(args);
        case 'start_environment':         return this.startEnvironment(args);
        case 'shutdown_environment':      return this.shutdownEnvironment(args);
        case 'get_environment_state':     return this.getEnvironmentState(args);
        case 'update_environment_folder': return this.updateEnvironmentFolder(args);
        case 'list_secrets':              return this.listSecrets(args);
        case 'create_secret':             return this.createSecret(args);
        case 'update_secret':             return this.updateSecret(args);
        case 'delete_secret':             return this.deleteSecret(args);
        case 'list_locations':            return this.listLocations();
        case 'get_location':              return this.getLocation(args);
        case 'health_check':              return this.healthCheck();
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

  // ── HTTP helpers ──────────────────────────────────────────────────────────

  private async request(
    method: string,
    path: string,
    params?: Record<string, string | undefined>,
    body?: unknown,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) qs.set(k, v);
      }
      const qstr = qs.toString();
      if (qstr) url += `?${qstr}`;
    }
    const options: RequestInit = { method, headers: this.headers };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(url, options);
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ' — ' + errText : ''}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `VS Codespaces returned non-JSON (HTTP ${response.status})` }], isError: true };
    }
    return { content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  // ── Environments ──────────────────────────────────────────────────────────

  private async listEnvironments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.name !== undefined) params.name = args.name as string;
    if (args.planId !== undefined) params.planId = args.planId as string;
    if (args.deleted !== undefined) params.deleted = String(args.deleted);
    return this.request('GET', '/api/v1/Environments', params);
  }

  private async getEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.environmentId) return { content: [{ type: 'text', text: 'environmentId is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.connect !== undefined) params.connect = String(args.connect);
    return this.request('GET', `/api/v1/Environments/${encodeURIComponent(args.environmentId as string)}`, params);
  }

  private async createEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    for (const field of ['friendlyName', 'planId', 'location', 'skuName']) {
      if (!args[field]) return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
    }
    const body: Record<string, unknown> = {
      friendlyName: args.friendlyName,
      planId: args.planId,
      location: args.location,
      skuName: args.skuName,
    };
    if (args.gitRepositoryUrl) body.seed = { type: 'git', moniker: args.gitRepositoryUrl };
    if (args.dotfilesRepository) {
      body.personalizations = {
        dotfilesRepository: args.dotfilesRepository,
        ...(args.dotfilesTargetPath ? { dotfilesTargetPath: args.dotfilesTargetPath as string } : {}),
        ...(args.dotfilesInstallCommand ? { dotfilesInstallCommand: args.dotfilesInstallCommand as string } : {}),
      };
    }
    return this.request('POST', '/api/v1/Environments', undefined, body);
  }

  private async deleteEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.environmentId) return { content: [{ type: 'text', text: 'environmentId is required' }], isError: true };
    return this.request('DELETE', `/api/v1/Environments/${encodeURIComponent(args.environmentId as string)}`);
  }

  private async startEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.environmentId) return { content: [{ type: 'text', text: 'environmentId is required' }], isError: true };
    return this.request('POST', `/api/v1/Environments/${encodeURIComponent(args.environmentId as string)}/start`);
  }

  private async shutdownEnvironment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.environmentId) return { content: [{ type: 'text', text: 'environmentId is required' }], isError: true };
    return this.request('POST', `/api/v1/Environments/${encodeURIComponent(args.environmentId as string)}/shutdown`);
  }

  private async getEnvironmentState(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.environmentId) return { content: [{ type: 'text', text: 'environmentId is required' }], isError: true };
    return this.request('GET', `/api/v1/Environments/${encodeURIComponent(args.environmentId as string)}/state`);
  }

  private async updateEnvironmentFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.environmentId) return { content: [{ type: 'text', text: 'environmentId is required' }], isError: true };
    if (!args.folder) return { content: [{ type: 'text', text: 'folder is required' }], isError: true };
    return this.request('PATCH', `/api/v1/Environments/${encodeURIComponent(args.environmentId as string)}/folder`, undefined, { folder: args.folder });
  }

  // ── Secrets ───────────────────────────────────────────────────────────────

  private async listSecrets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.planId !== undefined) params.planId = args.planId as string;
    return this.request('GET', '/api/v1/Secrets', params);
  }

  private async createSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!args.value) return { content: [{ type: 'text', text: 'value is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.planId !== undefined) params.planId = args.planId as string;
    const body: Record<string, unknown> = { name: args.name, value: args.value };
    if (args.notes !== undefined) body.notes = args.notes;
    if (args.filters !== undefined) body.filters = args.filters;
    return this.request('POST', '/api/v1/Secrets', params, body);
  }

  private async updateSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.secretId) return { content: [{ type: 'text', text: 'secretId is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.planId !== undefined) params.planId = args.planId as string;
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.value !== undefined) body.value = args.value;
    if (args.notes !== undefined) body.notes = args.notes;
    if (args.filters !== undefined) body.filters = args.filters;
    return this.request('PUT', `/api/v1/Secrets/${encodeURIComponent(args.secretId as string)}`, params, body);
  }

  private async deleteSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.secretId) return { content: [{ type: 'text', text: 'secretId is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.planId !== undefined) params.planId = args.planId as string;
    if (args.scope !== undefined) params.scope = args.scope as string;
    return this.request('DELETE', `/api/v1/Secrets/${encodeURIComponent(args.secretId as string)}`, params);
  }

  // ── Locations ─────────────────────────────────────────────────────────────

  private async listLocations(): Promise<ToolResult> {
    return this.request('GET', '/api/v1/Locations');
  }

  private async getLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location) return { content: [{ type: 'text', text: 'location is required' }], isError: true };
    return this.request('GET', `/api/v1/Locations/${encodeURIComponent(args.location as string)}`);
  }

  // ── Health ────────────────────────────────────────────────────────────────

  private async healthCheck(): Promise<ToolResult> {
    return this.request('GET', '/health');
  }
}
