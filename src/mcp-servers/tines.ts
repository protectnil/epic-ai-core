/**
 * Tines MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: Tines can host MCP servers built on its storyboard (https://www.tines.com/docs/actions/templates/mcp-server/)
// However, there is no pre-built Tines MCP server on GitHub that exposes Tines management
// operations (stories, actions, credentials, audit logs) as tools. Tines builds outbound MCP
// servers; it does not publish an inbound management MCP server.
// This adapter wraps the Tines REST API v1 for platform management.
//
// Base URL: https://{tenant}.tines.com/api/v1  (tenant-specific subdomain required)
// Auth: API key in X-User-Token header, or Bearer token in Authorization header
// Docs: https://www.tines.com/api/welcome/
// Rate limits: 400 req/min for records endpoint; webhooks limited to 1,000 req/min per path,
//              2,500 req/min per tenant.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TinesConfig {
  apiKey: string;
  tenantUrl: string; // e.g. https://myorg.tines.com
}

export class TinesMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TinesConfig) {
    super();
    this.apiKey = config.apiKey;
    // Normalize: strip trailing slash, append /api/v1
    this.baseUrl = config.tenantUrl.replace(/\/$/, '') + '/api/v1';
  }

  static catalog() {
    return {
      name: 'tines',
      displayName: 'Tines',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'tines', 'automation', 'soar', 'security automation', 'workflow',
        'stories', 'actions', 'webhooks', 'playbooks', 'no-code',
        'credentials', 'audit', 'events', 'orchestration',
      ],
      toolNames: [
        'list_stories',
        'get_story',
        'create_story',
        'update_story',
        'delete_story',
        'list_actions',
        'get_action',
        'list_action_events',
        'list_action_logs',
        'list_credentials',
        'get_credential',
        'list_audit_logs',
        'list_teams',
        'get_team',
        'list_resources',
        'get_resource',
      ],
      description: 'Tines security automation platform: manage stories (playbooks), actions, credentials, teams, and retrieve audit logs and action event history.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_stories',
        description: 'List all stories (automation playbooks) in the Tines tenant with optional team and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'number',
              description: 'Filter stories by team ID',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 500)',
            },
          },
        },
      },
      {
        name: 'get_story',
        description: 'Get full details for a specific story (playbook) by story ID, including its action graph',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: {
              type: 'number',
              description: 'The story ID to retrieve',
            },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'create_story',
        description: 'Create a new Tines story (automation playbook) in a specified team',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the story',
            },
            team_id: {
              type: 'number',
              description: 'Team ID to create the story under',
            },
            description: {
              type: 'string',
              description: 'Optional description explaining the story purpose',
            },
          },
          required: ['name', 'team_id'],
        },
      },
      {
        name: 'update_story',
        description: 'Update a story name, description, or enabled/disabled status',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: {
              type: 'number',
              description: 'The story ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated story name',
            },
            description: {
              type: 'string',
              description: 'Updated story description',
            },
            disabled: {
              type: 'boolean',
              description: 'Set true to disable the story, false to enable it',
            },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'delete_story',
        description: 'Delete a story and all its actions permanently. This action is irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: {
              type: 'number',
              description: 'The story ID to delete',
            },
          },
          required: ['story_id'],
        },
      },
      {
        name: 'list_actions',
        description: 'List all actions (steps) in the tenant or filtered by story ID with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            story_id: {
              type: 'number',
              description: 'Filter actions by parent story ID',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_action',
        description: 'Get full configuration details for a specific action by action ID',
        inputSchema: {
          type: 'object',
          properties: {
            action_id: {
              type: 'number',
              description: 'The action ID to retrieve',
            },
          },
          required: ['action_id'],
        },
      },
      {
        name: 'list_action_events',
        description: 'List events emitted by a specific action, showing execution history and payloads',
        inputSchema: {
          type: 'object',
          properties: {
            action_id: {
              type: 'number',
              description: 'The action ID to retrieve events for',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
          },
          required: ['action_id'],
        },
      },
      {
        name: 'list_action_logs',
        description: 'List execution logs for a specific action, showing run timestamps and outcomes',
        inputSchema: {
          type: 'object',
          properties: {
            action_id: {
              type: 'number',
              description: 'The action ID to retrieve logs for',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
          },
          required: ['action_id'],
        },
      },
      {
        name: 'list_credentials',
        description: 'List all credentials (API keys, OAuth tokens, HTTP request credentials) stored in Tines',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'number',
              description: 'Filter credentials by team ID',
            },
            credential_type: {
              type: 'string',
              description: 'Filter by type: aws, google, http_request, jwt, oauth2 (default: all)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_credential',
        description: 'Get configuration details for a specific credential by credential ID',
        inputSchema: {
          type: 'object',
          properties: {
            credential_id: {
              type: 'number',
              description: 'The credential ID to retrieve',
            },
          },
          required: ['credential_id'],
        },
      },
      {
        name: 'list_audit_logs',
        description: 'List audit log entries for all user operations in the Tines tenant with date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20, max: 500)',
            },
            start_at: {
              type: 'string',
              description: 'Filter logs after this ISO 8601 timestamp (e.g. 2026-01-01T00:00:00Z)',
            },
            end_at: {
              type: 'string',
              description: 'Filter logs before this ISO 8601 timestamp',
            },
          },
        },
      },
      {
        name: 'list_teams',
        description: 'List all teams in the Tines tenant with member counts',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_team',
        description: 'Get details for a specific team by team ID, including members and story count',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'number',
              description: 'The team ID to retrieve',
            },
          },
          required: ['team_id'],
        },
      },
      {
        name: 'list_resources',
        description: 'List global resources (shared data stores used across stories) in the tenant',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'get_resource',
        description: 'Get the name, slug, and value for a specific global resource by resource ID',
        inputSchema: {
          type: 'object',
          properties: {
            resource_id: {
              type: 'number',
              description: 'The resource ID to retrieve',
            },
          },
          required: ['resource_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_stories':
          return this.listStories(args);
        case 'get_story':
          return this.getStory(args);
        case 'create_story':
          return this.createStory(args);
        case 'update_story':
          return this.updateStory(args);
        case 'delete_story':
          return this.deleteStory(args);
        case 'list_actions':
          return this.listActions(args);
        case 'get_action':
          return this.getAction(args);
        case 'list_action_events':
          return this.listActionEvents(args);
        case 'list_action_logs':
          return this.listActionLogs(args);
        case 'list_credentials':
          return this.listCredentials(args);
        case 'get_credential':
          return this.getCredential(args);
        case 'list_audit_logs':
          return this.listAuditLogs(args);
        case 'list_teams':
          return this.listTeams(args);
        case 'get_team':
          return this.getTeam(args);
        case 'list_resources':
          return this.listResources(args);
        case 'get_resource':
          return this.getResource(args);
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
      'X-User-Token': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async tinesGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async tinesPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async tinesPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async tinesDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async listStories(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    };
    if (args.team_id) params.team_id = String(args.team_id);
    return this.tinesGet('/stories', params);
  }

  private async getStory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.story_id) return { content: [{ type: 'text', text: 'story_id is required' }], isError: true };
    return this.tinesGet(`/stories/${encodeURIComponent(args.story_id as string)}`);
  }

  private async createStory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.team_id) return { content: [{ type: 'text', text: 'name and team_id are required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name, team_id: args.team_id };
    if (args.description) body.description = args.description;
    return this.tinesPost('/stories', body);
  }

  private async updateStory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.story_id) return { content: [{ type: 'text', text: 'story_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    if (typeof args.disabled === 'boolean') body.disabled = args.disabled;
    return this.tinesPut(`/stories/${encodeURIComponent(args.story_id as string)}`, body);
  }

  private async deleteStory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.story_id) return { content: [{ type: 'text', text: 'story_id is required' }], isError: true };
    return this.tinesDelete(`/stories/${encodeURIComponent(args.story_id as string)}`);
  }

  private async listActions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    };
    if (args.story_id) params.story_id = String(args.story_id);
    return this.tinesGet('/actions', params);
  }

  private async getAction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.action_id) return { content: [{ type: 'text', text: 'action_id is required' }], isError: true };
    return this.tinesGet(`/actions/${encodeURIComponent(args.action_id as string)}`);
  }

  private async listActionEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.action_id) return { content: [{ type: 'text', text: 'action_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    };
    return this.tinesGet(`/actions/${encodeURIComponent(args.action_id as string)}/events`, params);
  }

  private async listActionLogs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.action_id) return { content: [{ type: 'text', text: 'action_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    };
    return this.tinesGet(`/actions/${encodeURIComponent(args.action_id as string)}/logs`, params);
  }

  private async listCredentials(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    };
    if (args.team_id) params.team_id = String(args.team_id);
    if (args.credential_type) params.credential_type = args.credential_type as string;
    return this.tinesGet('/user_credentials', params);
  }

  private async getCredential(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.credential_id) return { content: [{ type: 'text', text: 'credential_id is required' }], isError: true };
    return this.tinesGet(`/user_credentials/${encodeURIComponent(args.credential_id as string)}`);
  }

  private async listAuditLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    };
    if (args.start_at) params.start_at = args.start_at as string;
    if (args.end_at) params.end_at = args.end_at as string;
    return this.tinesGet('/audit_logs', params);
  }

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tinesGet('/teams', {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    });
  }

  private async getTeam(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.team_id) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    return this.tinesGet(`/teams/${encodeURIComponent(args.team_id as string)}`);
  }

  private async listResources(args: Record<string, unknown>): Promise<ToolResult> {
    return this.tinesGet('/resources', {
      page: String((args.page as number) ?? 1),
      per_page: String((args.per_page as number) ?? 20),
    });
  }

  private async getResource(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.resource_id) return { content: [{ type: 'text', text: 'resource_id is required' }], isError: true };
    return this.tinesGet(`/resources/${encodeURIComponent(args.resource_id as string)}`);
  }
}
