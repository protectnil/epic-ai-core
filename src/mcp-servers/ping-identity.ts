/**
 * Ping Identity PingOne MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/pingidentity/pingone-mcp-server — transport: stdio, auth: OAuth2 PKCE / Device Code Flow
// Published by pingidentity org (official). Actively maintained (v0.0.2, 2025-11). Read-only by default.
// Our adapter covers: 20 tools (core identity management). Vendor MCP covers: environment, user, population, group mgmt.
// Recommendation: use-both — vendor MCP exposes environment listing and MFA device tools not in our REST adapter;
//                 our adapter adds create/update/delete write operations and risk evaluations not in vendor MCP (read-only by default).
// MCP-sourced tools: list_configured_environments, list_pingone_environments, get_pingone_environment,
//   list_pingone_environment_resources, get_pingone_environment_activity, list_pingone_users, get_pingone_user,
//   get_pingone_user_sessions, list_pingone_user_mfa_devices, get_pingone_user_mfa_device,
//   list_pingone_populations, get_pingone_population, list_pingone_groups, get_pingone_group,
//   list_pingone_users_in_group, list_pingone_users_in_multiple_groups, get_pingone_user_group_memberships
// REST-sourced tools (write + risk): create_user, update_user, delete_user, create_group, add_user_to_group,
//   remove_user_from_group, list_applications, get_application, list_sign_on_policies, get_sign_on_policy,
//   create_risk_evaluation, update_risk_evaluation, list_sessions, delete_session
//
// Base URL: https://api.pingone.com/v1/environments/{environmentId}
// Auth: Bearer token (OAuth2 client credentials or worker app token)
// Docs: https://apidocs.pingidentity.com/pingone/main/v1/api/
// Rate limits: Not publicly documented; standard REST throttling applies.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PingIdentityConfig {
  bearerToken: string;
  environmentId: string;
  baseUrl?: string;
}

export class PingIdentityMCPServer extends MCPAdapterBase {
  private readonly bearerToken: string;
  private readonly environmentId: string;
  private readonly baseUrl: string;

  constructor(config: PingIdentityConfig) {
    super();
    this.bearerToken = config.bearerToken;
    this.environmentId = config.environmentId;
    const rawBase = config.baseUrl || 'https://api.pingone.com';
    this.baseUrl = rawBase.replace(/\/v\d+\/?$/, '');
  }

  static catalog() {
    return {
      name: 'ping-identity',
      displayName: 'Ping Identity (PingOne)',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: ['ping', 'pingone', 'pingidentity', 'identity', 'iam', 'sso', 'mfa', 'risk', 'user', 'group', 'population', 'application', 'session', 'authentication'],
      toolNames: [
        'list_users', 'get_user', 'create_user', 'update_user', 'delete_user',
        'list_groups', 'get_group', 'create_group', 'add_user_to_group', 'remove_user_from_group',
        'list_populations', 'get_population',
        'list_applications', 'get_application',
        'list_sign_on_policies', 'get_sign_on_policy',
        'create_risk_evaluation', 'update_risk_evaluation',
        'list_sessions', 'delete_session',
      ],
      description: 'Ping Identity PingOne IAM: manage users, groups, populations, applications, sign-on policies, risk evaluations, and active sessions.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List users in the PingOne environment with optional SCIM filter, sort order, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum users to return (default: 100)',
            },
            filter: {
              type: 'string',
              description: 'SCIM filter expression (e.g. email eq "user@example.com" or username sw "john")',
            },
            order: {
              type: 'string',
              description: 'Sort field and direction (e.g. "username" or "createdAt -1")',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve full profile details for a specific PingOne user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'PingOne user UUID',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new PingOne user in the environment with email, username, and population assignment',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'User email address (must be unique)',
            },
            username: {
              type: 'string',
              description: 'Username (must be unique within the environment)',
            },
            given_name: {
              type: 'string',
              description: 'User first name',
            },
            family_name: {
              type: 'string',
              description: 'User last name',
            },
            population_id: {
              type: 'string',
              description: 'Population UUID to assign the user to',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the user account is enabled (default: true)',
            },
          },
          required: ['email', 'username'],
        },
      },
      {
        name: 'update_user',
        description: 'Update fields on an existing PingOne user account such as name, email, or enabled status',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'PingOne user UUID to update',
            },
            email: {
              type: 'string',
              description: 'New email address',
            },
            given_name: {
              type: 'string',
              description: 'New first name',
            },
            family_name: {
              type: 'string',
              description: 'New last name',
            },
            enabled: {
              type: 'boolean',
              description: 'Enable or disable the user account',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Permanently delete a PingOne user account by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'PingOne user UUID to delete',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'List groups in the PingOne environment with optional SCIM filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum groups to return (default: 100)',
            },
            filter: {
              type: 'string',
              description: 'SCIM filter expression (e.g. name sw "admin")',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_group',
        description: 'Retrieve details of a PingOne group by group ID including membership count and description',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'PingOne group UUID',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'create_group',
        description: 'Create a new PingOne group with a name and optional description',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Group name (must be unique in the environment)',
            },
            description: {
              type: 'string',
              description: 'Optional group description',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'add_user_to_group',
        description: 'Add a PingOne user to a group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'PingOne group UUID',
            },
            user_id: {
              type: 'string',
              description: 'PingOne user UUID to add to the group',
            },
          },
          required: ['group_id', 'user_id'],
        },
      },
      {
        name: 'remove_user_from_group',
        description: 'Remove a PingOne user from a group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'PingOne group UUID',
            },
            user_id: {
              type: 'string',
              description: 'PingOne user UUID to remove from the group',
            },
          },
          required: ['group_id', 'user_id'],
        },
      },
      {
        name: 'list_populations',
        description: 'List populations in the PingOne environment (populations segment users into groups)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum populations to return (default: 100)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_population',
        description: 'Retrieve details of a PingOne population by population ID',
        inputSchema: {
          type: 'object',
          properties: {
            population_id: {
              type: 'string',
              description: 'PingOne population UUID',
            },
          },
          required: ['population_id'],
        },
      },
      {
        name: 'list_applications',
        description: 'List applications registered in the PingOne environment with optional filter',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum applications to return (default: 100)',
            },
            filter: {
              type: 'string',
              description: 'SCIM filter expression (e.g. name sw "My App")',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_application',
        description: 'Retrieve full configuration details of a PingOne application by application ID',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'PingOne application UUID',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_sign_on_policies',
        description: 'List sign-on policies configured in the PingOne environment',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum policies to return (default: 100)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_sign_on_policy',
        description: 'Retrieve details of a specific PingOne sign-on policy by policy ID',
        inputSchema: {
          type: 'object',
          properties: {
            policy_id: {
              type: 'string',
              description: 'PingOne sign-on policy UUID',
            },
          },
          required: ['policy_id'],
        },
      },
      {
        name: 'create_risk_evaluation',
        description: 'Submit a PingOne Protect risk evaluation for an authentication event with user and IP details',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'PingOne user UUID for the authentication event',
            },
            user_type: {
              type: 'string',
              description: 'User type identifier (default: PING_ONE)',
            },
            ip: {
              type: 'string',
              description: 'IP address of the authentication event',
            },
            risk_policy_set_id: {
              type: 'string',
              description: 'Risk policy set UUID to apply (omit to use the environment default)',
            },
            user_agent: {
              type: 'string',
              description: 'Browser or client user-agent string for device fingerprinting',
            },
          },
          required: ['user_id', 'ip'],
        },
      },
      {
        name: 'update_risk_evaluation',
        description: 'Update a PingOne Protect risk evaluation with the final authentication outcome',
        inputSchema: {
          type: 'object',
          properties: {
            risk_evaluation_id: {
              type: 'string',
              description: 'Risk evaluation UUID returned from create_risk_evaluation',
            },
            completion_status: {
              type: 'string',
              description: 'Final outcome: SUCCESS or FAILED',
            },
          },
          required: ['risk_evaluation_id', 'completion_status'],
        },
      },
      {
        name: 'list_sessions',
        description: 'List all active sessions for a specific PingOne user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'PingOne user UUID whose sessions to list',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_session',
        description: 'Terminate a specific PingOne user session by user ID and session ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'PingOne user UUID who owns the session',
            },
            session_id: {
              type: 'string',
              description: 'Session UUID to terminate',
            },
          },
          required: ['user_id', 'session_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_users':
          return await this.listUsers(args);
        case 'get_user':
          return await this.getUser(args);
        case 'create_user':
          return await this.createUser(args);
        case 'update_user':
          return await this.updateUser(args);
        case 'delete_user':
          return await this.deleteUser(args);
        case 'list_groups':
          return await this.listGroups(args);
        case 'get_group':
          return await this.getGroup(args);
        case 'create_group':
          return await this.createGroup(args);
        case 'add_user_to_group':
          return await this.addUserToGroup(args);
        case 'remove_user_from_group':
          return await this.removeUserFromGroup(args);
        case 'list_populations':
          return await this.listPopulations(args);
        case 'get_population':
          return await this.getPopulation(args);
        case 'list_applications':
          return await this.listApplications(args);
        case 'get_application':
          return await this.getApplication(args);
        case 'list_sign_on_policies':
          return await this.listSignOnPolicies(args);
        case 'get_sign_on_policy':
          return await this.getSignOnPolicy(args);
        case 'create_risk_evaluation':
          return await this.createRiskEvaluation(args);
        case 'update_risk_evaluation':
          return await this.updateRiskEvaluation(args);
        case 'list_sessions':
          return await this.listSessions(args);
        case 'delete_session':
          return await this.deleteSession(args);
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private envPath(path: string): string {
    return `${this.baseUrl}/v1/environments/${encodeURIComponent(this.environmentId)}/${path}`;
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(url: string, init?: RequestInit): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers(), ...init });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"status":"success"}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String(args.limit ?? 100));
    if (args.filter) params.set('filter', args.filter as string);
    if (args.order) params.set('order', args.order as string);
    if (args.cursor) params.set('cursor', args.cursor as string);
    return this.fetchJson(this.envPath(`users?${params}`));
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(this.envPath(`users/${encodeURIComponent(args.user_id as string)}`));
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      email: args.email,
      username: args.username,
    };
    if (args.given_name || args.family_name) {
      body.name = { given: args.given_name, family: args.family_name };
    }
    if (args.population_id) body.population = { id: args.population_id };
    if (args.enabled !== undefined) body.enabled = args.enabled;
    return this.fetchJson(this.envPath('users'), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const { user_id, ...rest } = args;
    const body: Record<string, unknown> = {};
    if (rest.email) body.email = rest.email;
    if (rest.given_name || rest.family_name) {
      body.name = { given: rest.given_name, family: rest.family_name };
    }
    if (rest.enabled !== undefined) body.enabled = rest.enabled;
    return this.fetchJson(this.envPath(`users/${encodeURIComponent(user_id as string)}`), {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(this.envPath(`users/${encodeURIComponent(args.user_id as string)}`), {
      method: 'DELETE',
    });
  }

  // ── Groups ────────────────────────────────────────────────────────────────

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String(args.limit ?? 100));
    if (args.filter) params.set('filter', args.filter as string);
    return this.fetchJson(this.envPath(`groups?${params}`));
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(this.envPath(`groups/${encodeURIComponent(args.group_id as string)}`));
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { name: args.name };
    if (args.description) body.description = args.description;
    return this.fetchJson(this.envPath('groups'), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async addUserToGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const body = { type: 'DIRECT' };
    return this.fetchJson(
      this.envPath(`groups/${encodeURIComponent(args.group_id as string)}/users/${encodeURIComponent(args.user_id as string)}`),
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  private async removeUserFromGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(
      this.envPath(`groups/${encodeURIComponent(args.group_id as string)}/users/${encodeURIComponent(args.user_id as string)}`),
      { method: 'DELETE' },
    );
  }

  // ── Populations ───────────────────────────────────────────────────────────

  private async listPopulations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String(args.limit ?? 100));
    return this.fetchJson(this.envPath(`populations?${params}`));
  }

  private async getPopulation(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(this.envPath(`populations/${encodeURIComponent(args.population_id as string)}`));
  }

  // ── Applications ──────────────────────────────────────────────────────────

  private async listApplications(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String(args.limit ?? 100));
    if (args.filter) params.set('filter', args.filter as string);
    return this.fetchJson(this.envPath(`applications?${params}`));
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(this.envPath(`applications/${encodeURIComponent(args.application_id as string)}`));
  }

  // ── Sign-On Policies ──────────────────────────────────────────────────────

  private async listSignOnPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String(args.limit ?? 100));
    return this.fetchJson(this.envPath(`signOnPolicies?${params}`));
  }

  private async getSignOnPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(this.envPath(`signOnPolicies/${encodeURIComponent(args.policy_id as string)}`));
  }

  // ── Risk Evaluations ──────────────────────────────────────────────────────

  private async createRiskEvaluation(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      event: {
        user: { id: args.user_id, type: args.user_type ?? 'PING_ONE' },
        ip: args.ip,
        ...(args.user_agent ? { sdk: { signals: { data: args.user_agent } } } : {}),
      },
    };
    if (args.risk_policy_set_id) body.riskPolicySet = { id: args.risk_policy_set_id };
    return this.fetchJson(this.envPath('riskEvaluations'), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async updateRiskEvaluation(args: Record<string, unknown>): Promise<ToolResult> {
    const body = { completionStatus: args.completion_status };
    return this.fetchJson(
      this.envPath(`riskEvaluations/${encodeURIComponent(args.risk_evaluation_id as string)}`),
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  private async listSessions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) {
      return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    }
    return this.fetchJson(this.envPath(`users/${encodeURIComponent(args.user_id as string)}/sessions`));
  }

  private async deleteSession(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(
      this.envPath(`users/${encodeURIComponent(args.user_id as string)}/sessions/${encodeURIComponent(args.session_id as string)}`),
      { method: 'DELETE' },
    );
  }
}
