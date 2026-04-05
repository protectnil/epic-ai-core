/**
 * VictorOps MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official VictorOps MCP server was found on GitHub.
// Note: VictorOps was rebranded to Splunk On-Call in 2021. The REST API remains compatible.
//
// Base URL: https://api.victorops.com
// Auth: API ID + API Key — pass as X-VO-Api-Id and X-VO-Api-Key headers
// Docs: https://portal.victorops.com/public/api-docs.html
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VictorOpsConfig {
  apiId: string;
  apiKey: string;
}

export class VictorOpsMCPServer extends MCPAdapterBase {
  private readonly apiId: string;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.victorops.com';

  constructor(config: VictorOpsConfig) {
    super();
    this.apiId = config.apiId;
    this.apiKey = config.apiKey;
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Incidents ────────────────────────────────────────────────────────────
      {
        name: 'list_incidents',
        description: 'Get current open incidents with status, severity, and routing key details',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_incident',
        description: 'Create a new incident and page the on-call team',
        inputSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Incident summary/message' },
            details: { type: 'string', description: 'Detailed description of the incident' },
            routing_key: { type: 'string', description: 'Routing key to determine which team is paged' },
            is_multi_responder: { type: 'boolean', description: 'Allow multiple responders (default: false)' },
          },
          required: ['summary', 'routing_key'],
        },
      },
      {
        name: 'acknowledge_incidents',
        description: 'Acknowledge one or more incidents by incident number',
        inputSchema: {
          type: 'object',
          properties: {
            incident_numbers: { type: 'array', items: { type: 'number' }, description: 'Incident numbers to acknowledge' },
            username: { type: 'string', description: 'Username acknowledging the incidents' },
            message: { type: 'string', description: 'Acknowledgment message' },
          },
          required: ['incident_numbers', 'username'],
        },
      },
      {
        name: 'resolve_incidents',
        description: 'Resolve one or more incidents by incident number',
        inputSchema: {
          type: 'object',
          properties: {
            incident_numbers: { type: 'array', items: { type: 'number' }, description: 'Incident numbers to resolve' },
            username: { type: 'string', description: 'Username resolving the incidents' },
            message: { type: 'string', description: 'Resolution message' },
          },
          required: ['incident_numbers', 'username'],
        },
      },
      {
        name: 'reroute_incidents',
        description: 'Reroute one or more incidents to different escalation policies or users',
        inputSchema: {
          type: 'object',
          properties: {
            incident_numbers: { type: 'array', items: { type: 'number' }, description: 'Incident numbers to reroute' },
            targets: {
              type: 'array',
              description: 'Routing targets: [{ type: "EscalationPolicy" | "User", slug: "policy_slug_or_username" }]',
              items: { type: 'object' },
            },
            from_username: { type: 'string', description: 'Username initiating the reroute' },
          },
          required: ['incident_numbers', 'targets'],
        },
      },
      {
        name: 'acknowledge_user_incidents',
        description: 'Acknowledge all incidents for which a specific user was paged',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username to acknowledge incidents for' },
          },
          required: ['username'],
        },
      },
      {
        name: 'resolve_user_incidents',
        description: 'Resolve all incidents for which a specific user was paged',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username to resolve incidents for' },
          },
          required: ['username'],
        },
      },
      // ── On-Call ──────────────────────────────────────────────────────────────
      {
        name: 'get_oncall_users',
        description: 'Get the list of users currently on-call for each team',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'take_oncall',
        description: 'Take on-call duty from another user for a specific policy',
        inputSchema: {
          type: 'object',
          properties: {
            policy: { type: 'string', description: 'Escalation policy slug' },
            from_user: { type: 'string', description: 'Username to take on-call from' },
            to_user: { type: 'string', description: 'Username taking on-call' },
          },
          required: ['policy', 'from_user', 'to_user'],
        },
      },
      // ── Teams ────────────────────────────────────────────────────────────────
      {
        name: 'list_teams',
        description: 'List all teams in the VictorOps organization',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_team',
        description: 'Get details for a specific team including members and admins',
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug' },
          },
          required: ['team'],
        },
      },
      {
        name: 'create_team',
        description: 'Create a new team',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Team name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_team',
        description: 'Delete a team by slug',
        inputSchema: {
          type: 'object',
          properties: {
            team: { type: 'string', description: 'Team slug to delete' },
          },
          required: ['team'],
        },
      },
      // ── Routing Keys ─────────────────────────────────────────────────────────
      {
        name: 'list_routing_keys',
        description: 'List all routing keys and their associated escalation policies/teams',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Escalation Policies ──────────────────────────────────────────────────
      {
        name: 'list_escalation_policies',
        description: 'List all escalation policies with their steps and timeouts',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Maintenance Mode ─────────────────────────────────────────────────────
      {
        name: 'get_maintenance_mode',
        description: "Get the organization's current maintenance mode state",
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'start_maintenance_mode',
        description: 'Start maintenance mode for specific routing keys to suppress alerts',
        inputSchema: {
          type: 'object',
          properties: {
            routing_keys: { type: 'array', items: { type: 'string' }, description: 'Routing keys to put into maintenance mode' },
            message: { type: 'string', description: 'Reason for maintenance mode' },
          },
          required: ['routing_keys'],
        },
      },
      {
        name: 'end_maintenance_mode',
        description: 'End maintenance mode for a specific maintenance mode ID',
        inputSchema: {
          type: 'object',
          properties: {
            maintenance_mode_id: { type: 'number', description: 'Maintenance mode ID to end' },
          },
          required: ['maintenance_mode_id'],
        },
      },
      // ── Overrides ────────────────────────────────────────────────────────────
      {
        name: 'list_overrides',
        description: 'List all scheduled on-call overrides',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_override',
        description: 'Create a scheduled on-call override',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username who will take the override' },
            policy_slug: { type: 'string', description: 'Escalation policy slug' },
            start: { type: 'string', description: 'Override start time (ISO 8601)' },
            end: { type: 'string', description: 'Override end time (ISO 8601)' },
          },
          required: ['username', 'policy_slug', 'start', 'end'],
        },
      },
      {
        name: 'delete_override',
        description: 'Delete a scheduled override',
        inputSchema: {
          type: 'object',
          properties: {
            public_id: { type: 'string', description: 'Override public ID' },
          },
          required: ['public_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_incidents': return await this.listIncidents();
        case 'create_incident': return await this.createIncident(args);
        case 'acknowledge_incidents': return await this.acknowledgeIncidents(args);
        case 'resolve_incidents': return await this.resolveIncidents(args);
        case 'reroute_incidents': return await this.rerouteIncidents(args);
        case 'acknowledge_user_incidents': return await this.acknowledgeUserIncidents(args);
        case 'resolve_user_incidents': return await this.resolveUserIncidents(args);
        case 'get_oncall_users': return await this.getOncallUsers();
        case 'take_oncall': return await this.takeOncall(args);
        case 'list_teams': return await this.listTeams();
        case 'get_team': return await this.getTeam(args);
        case 'create_team': return await this.createTeam(args);
        case 'delete_team': return await this.deleteTeam(args);
        case 'list_routing_keys': return await this.listRoutingKeys();
        case 'list_escalation_policies': return await this.listEscalationPolicies();
        case 'get_maintenance_mode': return await this.getMaintenanceMode();
        case 'start_maintenance_mode': return await this.startMaintenanceMode(args);
        case 'end_maintenance_mode': return await this.endMaintenanceMode(args);
        case 'list_overrides': return await this.listOverrides();
        case 'create_override': return await this.createOverride(args);
        case 'delete_override': return await this.deleteOverride(args);
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
      'X-VO-Api-Id': this.apiId,
      'X-VO-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }


  private async fetchJSON(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers, ...init });
    let data: unknown;
    try { data = await response.json(); } catch { data = { status: response.status, statusText: response.statusText }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: !response.ok };
  }

  private async listIncidents(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/incidents`);
  }

  private async createIncident(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      summary: args.summary,
      routingKey: args.routing_key,
    };
    if (args.details) body.details = args.details;
    if (args.is_multi_responder) body.isMultiResponder = args.is_multi_responder;
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/incidents`, { method: 'POST', body: JSON.stringify(body) });
  }

  private async acknowledgeIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/incidents/ack`, {
      method: 'PATCH',
      body: JSON.stringify({ incidentNumbers: args.incident_numbers, userName: args.username, message: args.message ?? '' }),
    });
  }

  private async resolveIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/incidents/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ incidentNumbers: args.incident_numbers, userName: args.username, message: args.message ?? '' }),
    });
  }

  private async rerouteIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/incidents/reroute`, {
      method: 'POST',
      body: JSON.stringify({ incidentNumbers: args.incident_numbers, targets: args.targets, fromUsername: args.from_username }),
    });
  }

  private async acknowledgeUserIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/incidents/byUser/ack`, {
      method: 'PATCH',
      body: JSON.stringify({ userName: args.username }),
    });
  }

  private async resolveUserIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/incidents/byUser/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ userName: args.username }),
    });
  }

  private async getOncallUsers(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/oncall/current`);
  }

  private async takeOncall(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/policies/${encodeURIComponent(String(args.policy))}/oncall/user`, {
      method: 'PATCH',
      body: JSON.stringify({ fromUser: args.from_user, toUser: args.to_user }),
    });
  }

  private async listTeams(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/team`);
  }

  private async getTeam(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/team/${encodeURIComponent(String(args.team))}`);
  }

  private async createTeam(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/team`, { method: 'POST', body: JSON.stringify({ name: args.name }) });
  }

  private async deleteTeam(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/team/${encodeURIComponent(String(args.team))}`, { method: 'DELETE' });
  }

  private async listRoutingKeys(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/org/routing-keys`);
  }

  private async listEscalationPolicies(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/policies`);
  }

  private async getMaintenanceMode(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/maintenancemode`);
  }

  private async startMaintenanceMode(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/maintenancemode/start`, {
      method: 'POST',
      body: JSON.stringify({ routingKeys: args.routing_keys, message: args.message ?? '' }),
    });
  }

  private async endMaintenanceMode(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/maintenancemode/${args.maintenance_mode_id}/end`, { method: 'PUT', body: '{}' });
  }

  private async listOverrides(): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/overrides`);
  }

  private async createOverride(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/overrides`, {
      method: 'POST',
      body: JSON.stringify({
        username: args.username,
        policySlug: args.policy_slug,
        start: args.start,
        end: args.end,
      }),
    });
  }

  private async deleteOverride(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJSON(`${this.baseUrl}/api-public/v1/overrides/${encodeURIComponent(String(args.public_id))}`, { method: 'DELETE' });
  }

  static catalog() {
    return {
      name: 'victorops',
      displayName: 'VictorOps (Splunk On-Call)',
      version: '1.0.0',
      category: 'observability' as const,
      keywords: ['victorops', 'splunk-on-call', 'oncall', 'incidents', 'alerting', 'paging', 'escalation', 'maintenance'],
      toolNames: [
        'list_incidents', 'create_incident', 'acknowledge_incidents', 'resolve_incidents',
        'reroute_incidents', 'acknowledge_user_incidents', 'resolve_user_incidents',
        'get_oncall_users', 'take_oncall', 'list_teams', 'get_team', 'create_team', 'delete_team',
        'list_routing_keys', 'list_escalation_policies',
        'get_maintenance_mode', 'start_maintenance_mode', 'end_maintenance_mode',
        'list_overrides', 'create_override', 'delete_override',
      ],
      description: 'VictorOps (Splunk On-Call): manage incidents, acknowledge and resolve alerts, control on-call schedules, routing keys, and maintenance mode.',
      author: 'protectnil' as const,
    };
  }
}
