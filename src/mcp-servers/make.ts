/**
 * Make MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developers.make.com/mcp-server — transport: Streamable HTTP + SSE (cloud-hosted), auth: OAuth2 or MCP token
// Our adapter covers: 14 tools (scenarios, executions, connections, hooks, data stores, teams). Vendor MCP covers: dynamic
// tools (user's active/on-demand scenarios as callable tools + management tools for scenarios, connections, hooks, data stores,
// teams, orgs). The vendor MCP's tool list is dynamically generated from the user's account — tool names are not enumerable
// without a live connection. Management tools cover the same domain as our REST adapter; scenario-as-tool execution is MCP-only.
// Recommendation: use-both — the vendor MCP uniquely exposes user scenarios as callable tools (not available in REST API).
// Our REST adapter covers programmatic scenario lifecycle management (create, update, delete, inspect logs) for air-gapped or
// automation contexts. Shared management operations (list_scenarios, run_scenario) are routed through vendor MCP when available.
// Integration: use-both
// MCP-sourced tools: user's active/on-demand scenarios as tools (dynamic, account-specific)
// REST-sourced tools (14): list_scenarios, get_scenario, create_scenario, update_scenario, delete_scenario, run_scenario,
//   list_executions, get_execution, list_connections, get_connection, verify_connection, list_hooks, list_data_stores, list_teams
//
// Base URL: https://{zone}.make.com/api/v2 (zone examples: us1, eu2, us2 — from your account URL)
// Auth: Bearer API token (generated in Make > Profile > API Access)
// Docs: https://developers.make.com/api-documentation
// Rate limits: Core 60 req/min, Pro 120/min, Teams 240/min, Enterprise 1,000/min. HTTP 429 on exceed.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MakeConfig {
  apiToken: string;
  zone?: string;     // e.g. "us1", "eu2" — defaults to us1
  baseUrl?: string;  // full override: https://eu2.make.com/api/v2
  teamId?: number;   // default team ID for team-scoped operations
}

export class MakeMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly teamId: number | undefined;

  constructor(config: MakeConfig) {
    super();
    this.token = config.apiToken;
    this.teamId = config.teamId;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/$/, '');
    } else {
      const zone = config.zone ?? 'us1';
      this.baseUrl = `https://${zone}.make.com/api/v2`;
    }
  }

  static catalog() {
    return {
      name: 'make',
      displayName: 'Make',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'make', 'make.com', 'integromat', 'automation', 'workflow', 'scenario', 'trigger',
        'execution', 'no-code', 'low-code', 'integration', 'connection', 'webhook', 'hook',
        'data store', 'team', 'organization', 'schedule',
      ],
      toolNames: [
        'list_scenarios', 'get_scenario', 'create_scenario', 'update_scenario', 'delete_scenario',
        'run_scenario', 'list_executions', 'get_execution',
        'list_connections', 'get_connection', 'verify_connection',
        'list_hooks', 'list_data_stores',
        'list_teams',
      ],
      description: 'Make (formerly Integromat) visual automation platform: manage and trigger scenarios, inspect execution history, manage connections, webhooks, and data stores via REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_scenarios',
        description: 'List automation scenarios in a team with optional status and folder filters',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'number',
              description: 'Team ID to list scenarios for (uses configured default if omitted)',
            },
            folder_id: {
              type: 'number',
              description: 'Filter scenarios to a specific folder ID',
            },
            is_active: {
              type: 'boolean',
              description: 'Filter by active (true) or inactive (false) scenarios',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of scenarios to return (default: 10, max: 10000)',
            },
            offset: {
              type: 'number',
              description: 'Number of scenarios to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_scenario',
        description: 'Get full details of a single Make scenario including blueprint, scheduling, and connection references',
        inputSchema: {
          type: 'object',
          properties: {
            scenario_id: {
              type: 'number',
              description: 'Scenario ID to retrieve',
            },
          },
          required: ['scenario_id'],
        },
      },
      {
        name: 'create_scenario',
        description: 'Create a new automation scenario in a team from a blueprint JSON definition',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'number',
              description: 'Team ID to create the scenario in (uses configured default if omitted)',
            },
            name: {
              type: 'string',
              description: 'Human-readable scenario name',
            },
            blueprint: {
              type: 'string',
              description: 'Scenario blueprint as a JSON string (the flow definition)',
            },
            folder_id: {
              type: 'number',
              description: 'Folder ID to place the scenario in',
            },
            scheduling: {
              type: 'string',
              description: 'Scheduling config as a JSON string: {"type":"interval","interval":15}',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_scenario',
        description: 'Update an existing scenario — rename, move to a folder, change scheduling, or update the blueprint',
        inputSchema: {
          type: 'object',
          properties: {
            scenario_id: {
              type: 'number',
              description: 'Scenario ID to update',
            },
            name: {
              type: 'string',
              description: 'New scenario name',
            },
            is_active: {
              type: 'boolean',
              description: 'Activate (true) or deactivate (false) the scenario',
            },
            folder_id: {
              type: 'number',
              description: 'New folder ID to move the scenario to',
            },
            scheduling: {
              type: 'string',
              description: 'New scheduling config as a JSON string',
            },
          },
          required: ['scenario_id'],
        },
      },
      {
        name: 'delete_scenario',
        description: 'Delete a Make scenario permanently — all execution history will be lost',
        inputSchema: {
          type: 'object',
          properties: {
            scenario_id: {
              type: 'number',
              description: 'Scenario ID to delete',
            },
          },
          required: ['scenario_id'],
        },
      },
      {
        name: 'run_scenario',
        description: 'Trigger an on-demand execution of a scenario with optional input data',
        inputSchema: {
          type: 'object',
          properties: {
            scenario_id: {
              type: 'number',
              description: 'Scenario ID to run',
            },
            data: {
              type: 'string',
              description: 'Input data for the scenario as a JSON string (passed to the first module)',
            },
            responsive: {
              type: 'boolean',
              description: 'If true, wait for execution to complete and return the output (default: false = fire and forget)',
            },
          },
          required: ['scenario_id'],
        },
      },
      {
        name: 'list_executions',
        description: 'List execution history for a scenario with status, duration, and operation count',
        inputSchema: {
          type: 'object',
          properties: {
            scenario_id: {
              type: 'number',
              description: 'Scenario ID to list executions for',
            },
            status: {
              type: 'string',
              description: 'Filter by execution status: success, warning, error, timeout',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of executions to return (default: 10, max: 10000)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
          required: ['scenario_id'],
        },
      },
      {
        name: 'get_execution',
        description: 'Get detailed log and output of a specific scenario execution by scenario ID and execution ID',
        inputSchema: {
          type: 'object',
          properties: {
            scenario_id: {
              type: 'number',
              description: 'Scenario ID that owns the execution',
            },
            execution_id: {
              type: 'string',
              description: 'Execution ID to retrieve (hex string, e.g. cc1c49323b344687a324888762206003)',
            },
          },
          required: ['scenario_id', 'execution_id'],
        },
      },
      {
        name: 'list_connections',
        description: 'List all saved app connections in a team that scenarios use to authenticate with external services',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'number',
              description: 'Team ID to list connections for (uses configured default if omitted)',
            },
            type: {
              type: 'string',
              description: 'Filter by connection type/app name (e.g. google, slack, hubspot)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of connections to return (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_connection',
        description: 'Get details of a specific connection by ID including the app type and account it connects to',
        inputSchema: {
          type: 'object',
          properties: {
            connection_id: {
              type: 'number',
              description: 'Connection ID to retrieve',
            },
          },
          required: ['connection_id'],
        },
      },
      {
        name: 'verify_connection',
        description: 'Test whether a connection\'s credentials are still valid by calling the connected app API',
        inputSchema: {
          type: 'object',
          properties: {
            connection_id: {
              type: 'number',
              description: 'Connection ID to verify',
            },
          },
          required: ['connection_id'],
        },
      },
      {
        name: 'list_hooks',
        description: 'List all webhooks (instant triggers) in a team — shows the webhook URL and which scenario it feeds',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'number',
              description: 'Team ID to list hooks for (uses configured default if omitted)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of hooks to return (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_data_stores',
        description: 'List data stores in a team — key-value storage used by scenarios to persist state between runs',
        inputSchema: {
          type: 'object',
          properties: {
            team_id: {
              type: 'number',
              description: 'Team ID to list data stores for (uses configured default if omitted)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of data stores to return (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'list_teams',
        description: 'List all teams in an organization that the API token has access to',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'number',
              description: 'Organization ID to list teams for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of teams to return (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_scenarios':
          return this.listScenarios(args);
        case 'get_scenario':
          return this.getScenario(args);
        case 'create_scenario':
          return this.createScenario(args);
        case 'update_scenario':
          return this.updateScenario(args);
        case 'delete_scenario':
          return this.deleteScenario(args);
        case 'run_scenario':
          return this.runScenario(args);
        case 'list_executions':
          return this.listExecutions(args);
        case 'get_execution':
          return this.getExecution(args);
        case 'list_connections':
          return this.listConnections(args);
        case 'get_connection':
          return this.getConnection(args);
        case 'verify_connection':
          return this.verifyConnection(args);
        case 'list_hooks':
          return this.listHooks(args);
        case 'list_data_stores':
          return this.listDataStores(args);
        case 'list_teams':
          return this.listTeams(args);
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
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private resolveTeamId(args: Record<string, unknown>): number | undefined {
    return (args.team_id as number | undefined) ?? this.teamId;
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
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
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
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
    const data = await response.json().catch(() => ({ deleted: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listScenarios(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = this.resolveTeamId(args);
    if (!teamId) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    const params = new URLSearchParams({ teamId: String(teamId) });
    if (args.folder_id) params.set('folderId', String(args.folder_id));
    if (typeof args.is_active === 'boolean') params.set('isActive', String(args.is_active));
    params.set('pg[limit]', String((args.limit as number) ?? 10));
    params.set('pg[offset]', String((args.offset as number) ?? 0));
    return this.apiGet(`/scenarios?${params.toString()}`);
  }

  private async getScenario(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.scenario_id) return { content: [{ type: 'text', text: 'scenario_id is required' }], isError: true };
    return this.apiGet(`/scenarios/${encodeURIComponent(args.scenario_id as string)}`);
  }

  private async createScenario(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const teamId = this.resolveTeamId(args);
    if (!teamId) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };

    const body: Record<string, unknown> = { teamId, name: args.name };
    if (args.blueprint) {
      try { body.blueprint = JSON.parse(args.blueprint as string); } catch { body.blueprint = args.blueprint; }
    }
    if (args.folder_id) body.folderId = args.folder_id;
    if (args.scheduling) {
      try { body.scheduling = JSON.parse(args.scheduling as string); } catch { body.scheduling = args.scheduling; }
    }
    return this.apiPost('/scenarios', body);
  }

  private async updateScenario(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.scenario_id) return { content: [{ type: 'text', text: 'scenario_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (typeof args.is_active === 'boolean') body.isActive = args.is_active;
    if (args.folder_id !== undefined) body.folderId = args.folder_id;
    if (args.scheduling) {
      try { body.scheduling = JSON.parse(args.scheduling as string); } catch { body.scheduling = args.scheduling; }
    }
    return this.apiPatch(`/scenarios/${encodeURIComponent(args.scenario_id as string)}`, body);
  }

  private async deleteScenario(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.scenario_id) return { content: [{ type: 'text', text: 'scenario_id is required' }], isError: true };
    return this.apiDelete(`/scenarios/${encodeURIComponent(args.scenario_id as string)}`);
  }

  private async runScenario(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.scenario_id) return { content: [{ type: 'text', text: 'scenario_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.data) {
      try { body.data = JSON.parse(args.data as string); } catch { body.data = args.data; }
    }
    if (typeof args.responsive === 'boolean') body.responsive = args.responsive;
    return this.apiPost(`/scenarios/${encodeURIComponent(args.scenario_id as string)}/run`, body);
  }

  private async listExecutions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.scenario_id) return { content: [{ type: 'text', text: 'scenario_id is required' }], isError: true };
    const params = new URLSearchParams({ scenarioId: String(args.scenario_id) });
    if (args.status) params.set('status', args.status as string);
    params.set('pg[limit]', String((args.limit as number) ?? 10));
    params.set('pg[offset]', String((args.offset as number) ?? 0));
    return this.apiGet(`/scenarios/${encodeURIComponent(args.scenario_id as string)}/logs?${params.toString()}`);
  }

  private async getExecution(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.scenario_id) return { content: [{ type: 'text', text: 'scenario_id is required' }], isError: true };
    if (!args.execution_id) return { content: [{ type: 'text', text: 'execution_id is required' }], isError: true };
    return this.apiGet(`/scenarios/${encodeURIComponent(args.scenario_id as string)}/logs/${encodeURIComponent(args.execution_id as string)}`);
  }

  private async listConnections(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = this.resolveTeamId(args);
    if (!teamId) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    const params = new URLSearchParams({ teamId: String(teamId) });
    if (args.type) params.set('type', args.type as string);
    params.set('pg[limit]', String((args.limit as number) ?? 10));
    params.set('pg[offset]', String((args.offset as number) ?? 0));
    return this.apiGet(`/connections?${params.toString()}`);
  }

  private async getConnection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connection_id) return { content: [{ type: 'text', text: 'connection_id is required' }], isError: true };
    return this.apiGet(`/connections/${encodeURIComponent(args.connection_id as string)}`);
  }

  private async verifyConnection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.connection_id) return { content: [{ type: 'text', text: 'connection_id is required' }], isError: true };
    return this.apiPost(`/connections/${encodeURIComponent(args.connection_id as string)}/test`, {});
  }

  private async listHooks(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = this.resolveTeamId(args);
    if (!teamId) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    const params = new URLSearchParams({ teamId: String(teamId) });
    params.set('pg[limit]', String((args.limit as number) ?? 10));
    params.set('pg[offset]', String((args.offset as number) ?? 0));
    return this.apiGet(`/hooks?${params.toString()}`);
  }

  private async listDataStores(args: Record<string, unknown>): Promise<ToolResult> {
    const teamId = this.resolveTeamId(args);
    if (!teamId) return { content: [{ type: 'text', text: 'team_id is required' }], isError: true };
    const params = new URLSearchParams({ teamId: String(teamId) });
    params.set('pg[limit]', String((args.limit as number) ?? 10));
    params.set('pg[offset]', String((args.offset as number) ?? 0));
    return this.apiGet(`/data-stores?${params.toString()}`);
  }

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.organization_id) params.set('organizationId', String(args.organization_id));
    params.set('pg[limit]', String((args.limit as number) ?? 10));
    params.set('pg[offset]', String((args.offset as number) ?? 0));
    return this.apiGet(`/teams?${params.toString()}`);
  }
}
