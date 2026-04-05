/**
 * Appsmith MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Appsmith MCP server was found on GitHub or the Appsmith developer portal.
// Appsmith's own product includes an MCP endpoint (mcp.appsmith.com) for connecting external
// tools TO Appsmith-built apps, which is unrelated to managing the Appsmith platform itself.
//
// NOTE: Appsmith's official public API docs (docs.appsmith.com/getting-started/setup/instance-management/api-reference)
// only document 2 monitoring endpoints: GET /api/v1/health and GET /api/v1/app-performance.
// The workspace, application, datasource, and user management endpoints used by this adapter
// are internal APIs derived from Appsmith's open-source codebase — they are not publicly documented
// and may change without notice. All 19 management tools are UNVERIFIED against official docs.
//
// Base URL: https://{your-appsmith-host} (self-hosted) or https://app.appsmith.com (cloud)
// Auth: API key passed as the "x-appsmith-token" header (generated in Profile → API Keys)
// Docs: https://docs.appsmith.com/getting-started/setup/instance-management/api-reference
// Rate limits: Not publicly documented; governed by instance resources

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AppsmithConfig {
  apiKey: string;
  baseUrl?: string;
}

export class AppsmithMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AppsmithConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://app.appsmith.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'appsmith',
      displayName: 'Appsmith',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: [
        'appsmith', 'low-code', 'internal tools', 'admin panel', 'dashboard',
        'workspace', 'application', 'datasource', 'page', 'widget', 'user management',
      ],
      toolNames: [
        'list_workspaces', 'get_workspace', 'create_workspace', 'update_workspace', 'delete_workspace',
        'list_applications', 'get_application', 'create_application', 'delete_application',
        'list_datasources', 'get_datasource', 'delete_datasource',
        'list_workspace_users', 'add_user_to_workspace', 'remove_user_from_workspace',
        'list_users', 'get_user', 'invite_user',
        'get_instance_config',
      ],
      description: 'Manage Appsmith instances: workspaces, applications, datasources, and user access for low-code internal tool deployments.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_workspaces',
        description: 'List all workspaces on the Appsmith instance accessible to the authenticated API key',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of workspaces per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_workspace',
        description: 'Get details of a specific Appsmith workspace by its ID including name, slug, and member list',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'The unique ID of the workspace to retrieve',
            },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'create_workspace',
        description: 'Create a new Appsmith workspace with the given name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the new workspace',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_workspace',
        description: 'Update the name, website, or email of an existing Appsmith workspace',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'The unique ID of the workspace to update',
            },
            name: {
              type: 'string',
              description: 'New display name for the workspace',
            },
            website: {
              type: 'string',
              description: 'Website URL to associate with the workspace',
            },
            email: {
              type: 'string',
              description: 'Contact email for the workspace',
            },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'delete_workspace',
        description: 'Permanently delete an Appsmith workspace and all its applications and datasources',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'The unique ID of the workspace to delete',
            },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'list_applications',
        description: 'List all applications in a workspace, or all applications on the instance if no workspace specified',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'Filter by workspace ID (omit to list all applications)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of applications per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_application',
        description: 'Get detailed information about a specific Appsmith application including pages and configuration',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'The unique ID of the application to retrieve',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'create_application',
        description: 'Create a new Appsmith application in a specified workspace',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the new application',
            },
            workspace_id: {
              type: 'string',
              description: 'ID of the workspace in which to create the application',
            },
          },
          required: ['name', 'workspace_id'],
        },
      },
      {
        name: 'delete_application',
        description: 'Permanently delete an Appsmith application by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'The unique ID of the application to delete',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_datasources',
        description: 'List all datasources in a workspace including connection type and configuration',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'The workspace ID to list datasources from',
            },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'get_datasource',
        description: 'Get configuration details of a specific datasource by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            datasource_id: {
              type: 'string',
              description: 'The unique ID of the datasource to retrieve',
            },
          },
          required: ['datasource_id'],
        },
      },
      {
        name: 'delete_datasource',
        description: 'Delete a datasource from an Appsmith workspace by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            datasource_id: {
              type: 'string',
              description: 'The unique ID of the datasource to delete',
            },
          },
          required: ['datasource_id'],
        },
      },
      {
        name: 'list_workspace_users',
        description: 'List all users who are members of a workspace with their roles',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'The workspace ID to list members for',
            },
          },
          required: ['workspace_id'],
        },
      },
      {
        name: 'add_user_to_workspace',
        description: 'Add a user to a workspace and assign a role: Administrator, Developer, or App Viewer',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'The workspace ID to add the user to',
            },
            username: {
              type: 'string',
              description: 'Email address or username of the user to add',
            },
            role: {
              type: 'string',
              description: 'Role to assign: Administrator, Developer, or App Viewer (default: Developer)',
            },
          },
          required: ['workspace_id', 'username'],
        },
      },
      {
        name: 'remove_user_from_workspace',
        description: 'Remove a user from a workspace, revoking their access to all workspace apps',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'The workspace ID to remove the user from',
            },
            username: {
              type: 'string',
              description: 'Email address or username of the user to remove',
            },
          },
          required: ['workspace_id', 'username'],
        },
      },
      {
        name: 'list_users',
        description: 'List all users registered on the Appsmith instance with account status and roles',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
            page_size: {
              type: 'number',
              description: 'Number of users per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get profile and account details for a specific Appsmith user by their ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'The unique ID of the user to retrieve',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'invite_user',
        description: 'Invite a new user to the Appsmith instance by email with an optional workspace and role assignment',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address of the person to invite',
            },
            workspace_id: {
              type: 'string',
              description: 'Workspace ID to add the user to upon acceptance (optional)',
            },
            role: {
              type: 'string',
              description: 'Workspace role to assign upon acceptance: Administrator, Developer, or App Viewer',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'get_instance_config',
        description: 'Retrieve instance-level configuration including version, feature flags, and email settings',
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
        case 'list_workspaces':
          return this.listWorkspaces(args);
        case 'get_workspace':
          return this.getWorkspace(args);
        case 'create_workspace':
          return this.createWorkspace(args);
        case 'update_workspace':
          return this.updateWorkspace(args);
        case 'delete_workspace':
          return this.deleteWorkspace(args);
        case 'list_applications':
          return this.listApplications(args);
        case 'get_application':
          return this.getApplication(args);
        case 'create_application':
          return this.createApplication(args);
        case 'delete_application':
          return this.deleteApplication(args);
        case 'list_datasources':
          return this.listDatasources(args);
        case 'get_datasource':
          return this.getDatasource(args);
        case 'delete_datasource':
          return this.deleteDatasource(args);
        case 'list_workspace_users':
          return this.listWorkspaceUsers(args);
        case 'add_user_to_workspace':
          return this.addUserToWorkspace(args);
        case 'remove_user_from_workspace':
          return this.removeUserFromWorkspace(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'invite_user':
          return this.inviteUser(args);
        case 'get_instance_config':
          return this.getInstanceConfig();
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
      'x-appsmith-token': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async apiPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listWorkspaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page !== undefined) params.page = String(args.page);
    if (args.page_size !== undefined) params.pageSize = String(args.page_size);
    return this.apiGet('/api/v1/workspaces', params);
  }

  private async getWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workspace_id) return { content: [{ type: 'text', text: 'workspace_id is required' }], isError: true };
    return this.apiGet(`/api/v1/workspaces/${encodeURIComponent(args.workspace_id as string)}`);
  }

  private async createWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.apiPost('/api/v1/workspaces', { name: args.name });
  }

  private async updateWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workspace_id) return { content: [{ type: 'text', text: 'workspace_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.website) body.website = args.website;
    if (args.email) body.email = args.email;
    return this.apiPut(`/api/v1/workspaces/${encodeURIComponent(args.workspace_id as string)}`, body);
  }

  private async deleteWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workspace_id) return { content: [{ type: 'text', text: 'workspace_id is required' }], isError: true };
    return this.apiDelete(`/api/v1/workspaces/${encodeURIComponent(args.workspace_id as string)}`);
  }

  private async listApplications(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.workspace_id) params.workspaceId = args.workspace_id as string;
    if (args.page !== undefined) params.page = String(args.page);
    if (args.page_size !== undefined) params.pageSize = String(args.page_size);
    return this.apiGet('/api/v1/applications', params);
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id) return { content: [{ type: 'text', text: 'application_id is required' }], isError: true };
    return this.apiGet(`/api/v1/applications/${encodeURIComponent(args.application_id as string)}`);
  }

  private async createApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.workspace_id) return { content: [{ type: 'text', text: 'name and workspace_id are required' }], isError: true };
    return this.apiPost('/api/v1/applications', { name: args.name, workspaceId: args.workspace_id });
  }

  private async deleteApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id) return { content: [{ type: 'text', text: 'application_id is required' }], isError: true };
    return this.apiDelete(`/api/v1/applications/${encodeURIComponent(args.application_id as string)}`);
  }

  private async listDatasources(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workspace_id) return { content: [{ type: 'text', text: 'workspace_id is required' }], isError: true };
    return this.apiGet('/api/v1/datasources', { workspaceId: args.workspace_id as string });
  }

  private async getDatasource(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasource_id) return { content: [{ type: 'text', text: 'datasource_id is required' }], isError: true };
    return this.apiGet(`/api/v1/datasources/${encodeURIComponent(args.datasource_id as string)}`);
  }

  private async deleteDatasource(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.datasource_id) return { content: [{ type: 'text', text: 'datasource_id is required' }], isError: true };
    return this.apiDelete(`/api/v1/datasources/${encodeURIComponent(args.datasource_id as string)}`);
  }

  private async listWorkspaceUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workspace_id) return { content: [{ type: 'text', text: 'workspace_id is required' }], isError: true };
    return this.apiGet(`/api/v1/workspaces/${encodeURIComponent(args.workspace_id as string)}/members`);
  }

  private async addUserToWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workspace_id || !args.username) return { content: [{ type: 'text', text: 'workspace_id and username are required' }], isError: true };
    const body: Record<string, unknown> = {
      usernames: [args.username],
      roleName: (args.role as string) ?? 'Developer',
    };
    return this.apiPut(`/api/v1/workspaces/${encodeURIComponent(args.workspace_id as string)}/members`, body);
  }

  private async removeUserFromWorkspace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.workspace_id || !args.username) return { content: [{ type: 'text', text: 'workspace_id and username are required' }], isError: true };
    return this.apiDelete(`/api/v1/workspaces/${encodeURIComponent(args.workspace_id as string)}/members?username=${encodeURIComponent(args.username as string)}`);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.page !== undefined) params.page = String(args.page);
    if (args.page_size !== undefined) params.pageSize = String(args.page_size);
    return this.apiGet('/api/v1/users', params);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet(`/api/v1/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async inviteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const body: Record<string, unknown> = { email: args.email };
    if (args.workspace_id) body.workspaceId = args.workspace_id;
    if (args.role) body.roleName = args.role;
    return this.apiPost('/api/v1/users/invite', body);
  }

  private async getInstanceConfig(): Promise<ToolResult> {
    return this.apiGet('/api/v1/admin/env');
  }
}
