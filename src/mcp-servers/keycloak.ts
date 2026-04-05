/**
 * Keycloak MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Keycloak MCP server was found on GitHub.
//
// Base URL: http://keycloak.local (configurable; typically https://{host}/auth or https://{host} for Keycloak 17+)
// Auth: Bearer token (OAuth2 access_token). Obtain via POST /realms/{realm}/protocol/openid-connect/token
//   using client_credentials or password grant against the master realm or a service account.
//   The token must belong to a user with realm-admin (or appropriate fine-grained admin) role.
// Docs: https://www.keycloak.org/docs-api/latest/rest-api/
// Rate limits: None published; governed by Keycloak server resources.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface KeycloakConfig {
  /** Bearer access token with admin privileges */
  accessToken: string;
  /**
   * Base URL of the Keycloak server.
   * Keycloak 17+ (Quarkus): https://keycloak.example.com
   * Legacy (WildFly):       https://keycloak.example.com/auth
   */
  baseUrl?: string;
}

export class KeycloakMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: KeycloakConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'http://keycloak.local';
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Realms ────────────────────────────────────────────────────────────
      {
        name: 'get_realm',
        description: 'Get the top-level representation of a realm (name, settings, token lifespans, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name (e.g. master, myrealm)' },
          },
          required: ['realm'],
        },
      },
      {
        name: 'update_realm',
        description: 'Update top-level realm settings (token lifespans, brute-force detection, SMTP, etc.). Only fields provided are updated.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name to update' },
            settings: {
              type: 'object',
              description: 'Partial RealmRepresentation object with fields to update (e.g. { accessTokenLifespan: 300, bruteForceProtected: true })',
            },
          },
          required: ['realm', 'settings'],
        },
      },
      // ── Users ─────────────────────────────────────────────────────────────
      {
        name: 'list_users',
        description: 'List users in a realm with optional filters. Supports pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            search: { type: 'string', description: 'Free-text search across username, email, firstName, lastName' },
            username: { type: 'string', description: 'Filter by exact username' },
            email: { type: 'string', description: 'Filter by email address' },
            firstName: { type: 'string', description: 'Filter by first name' },
            lastName: { type: 'string', description: 'Filter by last name' },
            enabled: { type: 'boolean', description: 'Filter by enabled/disabled status' },
            max: { type: 'number', description: 'Maximum number of results (default 100)' },
            first: { type: 'number', description: 'Pagination offset (default 0)' },
          },
          required: ['realm'],
        },
      },
      {
        name: 'get_user',
        description: 'Get the full representation of a user by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
          },
          required: ['realm', 'userId'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new user in a realm. Username must be unique.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            username: { type: 'string', description: 'Unique username' },
            email: { type: 'string', description: 'Email address' },
            firstName: { type: 'string', description: 'First name' },
            lastName: { type: 'string', description: 'Last name' },
            enabled: { type: 'boolean', description: 'Whether the account is enabled (default true)' },
            emailVerified: { type: 'boolean', description: 'Mark email as verified (default false)' },
            attributes: { type: 'object', description: 'Custom user attributes as key-value pairs' },
            credentials: {
              type: 'array',
              description: 'Initial credentials, e.g. [{ type: "password", value: "secret", temporary: false }]',
            },
          },
          required: ['realm', 'username'],
        },
      },
      {
        name: 'update_user',
        description: 'Update an existing user\'s attributes. Only fields provided are changed.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
            updates: {
              type: 'object',
              description: 'Partial UserRepresentation (e.g. { email, firstName, lastName, enabled, emailVerified, attributes })',
            },
          },
          required: ['realm', 'userId', 'updates'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a user from a realm by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID to delete' },
          },
          required: ['realm', 'userId'],
        },
      },
      {
        name: 'reset_user_password',
        description: 'Set a new password for a user. Set temporary=true to require the user to change it on next login.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
            password: { type: 'string', description: 'New password value' },
            temporary: { type: 'boolean', description: 'If true, user must change password on next login (default false)' },
          },
          required: ['realm', 'userId', 'password'],
        },
      },
      {
        name: 'send_verify_email',
        description: 'Send an email-verification email to the user.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
            clientId: { type: 'string', description: 'Optional: client ID to include in the link' },
            redirectUri: { type: 'string', description: 'Optional: redirect URI after verification' },
          },
          required: ['realm', 'userId'],
        },
      },
      {
        name: 'logout_user',
        description: 'Remove all active sessions for a user, effectively logging them out everywhere.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
          },
          required: ['realm', 'userId'],
        },
      },
      {
        name: 'get_user_sessions',
        description: 'Get all active sessions for a user.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
          },
          required: ['realm', 'userId'],
        },
      },
      // ── Groups ────────────────────────────────────────────────────────────
      {
        name: 'list_groups',
        description: 'Get the top-level group hierarchy for a realm.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            search: { type: 'string', description: 'Optional group name search' },
            max: { type: 'number', description: 'Max results' },
            first: { type: 'number', description: 'Pagination offset' },
          },
          required: ['realm'],
        },
      },
      {
        name: 'create_group',
        description: 'Create a new top-level group in a realm.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            name: { type: 'string', description: 'Group name' },
            attributes: { type: 'object', description: 'Custom group attributes' },
          },
          required: ['realm', 'name'],
        },
      },
      {
        name: 'get_group_members',
        description: 'List users that are members of a group.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            groupId: { type: 'string', description: 'Group UUID' },
            max: { type: 'number', description: 'Max results' },
            first: { type: 'number', description: 'Pagination offset' },
          },
          required: ['realm', 'groupId'],
        },
      },
      {
        name: 'add_user_to_group',
        description: 'Add a user to a group.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
            groupId: { type: 'string', description: 'Group UUID' },
          },
          required: ['realm', 'userId', 'groupId'],
        },
      },
      {
        name: 'remove_user_from_group',
        description: 'Remove a user from a group.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
            groupId: { type: 'string', description: 'Group UUID' },
          },
          required: ['realm', 'userId', 'groupId'],
        },
      },
      // ── Roles ─────────────────────────────────────────────────────────────
      {
        name: 'list_realm_roles',
        description: 'List all roles defined at the realm level.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
          },
          required: ['realm'],
        },
      },
      {
        name: 'create_realm_role',
        description: 'Create a new realm-level role.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            name: { type: 'string', description: 'Role name (must be unique in the realm)' },
            description: { type: 'string', description: 'Human-readable description of the role' },
            composite: { type: 'boolean', description: 'If true, this role aggregates other roles' },
          },
          required: ['realm', 'name'],
        },
      },
      {
        name: 'get_user_role_mappings',
        description: 'Get all realm-level and client-level role mappings for a user.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
          },
          required: ['realm', 'userId'],
        },
      },
      {
        name: 'add_realm_roles_to_user',
        description: 'Add one or more realm-level roles to a user.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
            roles: {
              type: 'array',
              description: 'Array of RoleRepresentation objects: [{ id, name }]',
            },
          },
          required: ['realm', 'userId', 'roles'],
        },
      },
      {
        name: 'remove_realm_roles_from_user',
        description: 'Remove one or more realm-level roles from a user.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
            roles: {
              type: 'array',
              description: 'Array of RoleRepresentation objects to remove: [{ id, name }]',
            },
          },
          required: ['realm', 'userId', 'roles'],
        },
      },
      // ── Clients ───────────────────────────────────────────────────────────
      {
        name: 'list_clients',
        description: 'List clients belonging to a realm.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            clientId: { type: 'string', description: 'Optional: filter by clientId string' },
            max: { type: 'number', description: 'Max results' },
            first: { type: 'number', description: 'Pagination offset' },
          },
          required: ['realm'],
        },
      },
      {
        name: 'get_client',
        description: 'Get the representation of a specific client by its internal UUID.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            id: { type: 'string', description: 'Client internal UUID (not clientId string)' },
          },
          required: ['realm', 'id'],
        },
      },
      {
        name: 'create_client',
        description: 'Create a new client in a realm. clientId must be unique.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            clientId: { type: 'string', description: 'Unique client identifier string' },
            name: { type: 'string', description: 'Display name' },
            description: { type: 'string', description: 'Client description' },
            protocol: { type: 'string', description: 'openid-connect or saml (default openid-connect)' },
            publicClient: { type: 'boolean', description: 'True for public (SPA/mobile) clients' },
            redirectUris: { type: 'array', description: 'Array of allowed redirect URI patterns' },
            webOrigins: { type: 'array', description: 'Array of allowed CORS origins' },
            serviceAccountsEnabled: { type: 'boolean', description: 'Enable service account for client_credentials grant' },
          },
          required: ['realm', 'clientId'],
        },
      },
      {
        name: 'get_client_secret',
        description: 'Get the current client secret for a confidential client.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            id: { type: 'string', description: 'Client internal UUID' },
          },
          required: ['realm', 'id'],
        },
      },
      {
        name: 'regenerate_client_secret',
        description: 'Generate a new client secret for a confidential client, invalidating the old one.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            id: { type: 'string', description: 'Client internal UUID' },
          },
          required: ['realm', 'id'],
        },
      },
      // ── Sessions ──────────────────────────────────────────────────────────
      {
        name: 'delete_session',
        description: 'Remove a specific user session by session ID, logging that session out.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            sessionId: { type: 'string', description: 'Session UUID to delete' },
          },
          required: ['realm', 'sessionId'],
        },
      },
      // ── Brute Force ───────────────────────────────────────────────────────
      {
        name: 'get_brute_force_status',
        description: 'Get brute-force detection status for a user (failed attempts, disabled status, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
          },
          required: ['realm', 'userId'],
        },
      },
      {
        name: 'clear_brute_force_for_user',
        description: 'Clear brute-force login failure records for a specific user, re-enabling their account.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            userId: { type: 'string', description: 'User UUID' },
          },
          required: ['realm', 'userId'],
        },
      },
      // ── Events ────────────────────────────────────────────────────────────
      {
        name: 'get_events',
        description: 'Get login/admin events for a realm with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            realm: { type: 'string', description: 'Realm name' },
            type: { type: 'array', description: 'Filter by event types (e.g. ["LOGIN", "LOGIN_ERROR"])' },
            client: { type: 'string', description: 'Filter by client ID' },
            user: { type: 'string', description: 'Filter by user ID' },
            ipAddress: { type: 'string', description: 'Filter by IP address' },
            dateFrom: { type: 'string', description: 'ISO 8601 start date' },
            dateTo: { type: 'string', description: 'ISO 8601 end date' },
            max: { type: 'number', description: 'Max results (default 100)' },
            first: { type: 'number', description: 'Pagination offset' },
          },
          required: ['realm'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_realm': return await this.getRealm(args);
        case 'update_realm': return await this.updateRealm(args);
        case 'list_users': return await this.listUsers(args);
        case 'get_user': return await this.getUser(args);
        case 'create_user': return await this.createUser(args);
        case 'update_user': return await this.updateUser(args);
        case 'delete_user': return await this.deleteUser(args);
        case 'reset_user_password': return await this.resetUserPassword(args);
        case 'send_verify_email': return await this.sendVerifyEmail(args);
        case 'logout_user': return await this.logoutUser(args);
        case 'get_user_sessions': return await this.getUserSessions(args);
        case 'list_groups': return await this.listGroups(args);
        case 'create_group': return await this.createGroup(args);
        case 'get_group_members': return await this.getGroupMembers(args);
        case 'add_user_to_group': return await this.addUserToGroup(args);
        case 'remove_user_from_group': return await this.removeUserFromGroup(args);
        case 'list_realm_roles': return await this.listRealmRoles(args);
        case 'create_realm_role': return await this.createRealmRole(args);
        case 'get_user_role_mappings': return await this.getUserRoleMappings(args);
        case 'add_realm_roles_to_user': return await this.addRealmRolesToUser(args);
        case 'remove_realm_roles_from_user': return await this.removeRealmRolesFromUser(args);
        case 'list_clients': return await this.listClients(args);
        case 'get_client': return await this.getClient(args);
        case 'create_client': return await this.createClient(args);
        case 'get_client_secret': return await this.getClientSecret(args);
        case 'regenerate_client_secret': return await this.regenerateClientSecret(args);
        case 'delete_session': return await this.deleteSession(args);
        case 'get_brute_force_status': return await this.getBruteForceStatus(args);
        case 'clear_brute_force_for_user': return await this.clearBruteForceForUser(args);
        case 'get_events': return await this.getEvents(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const options: RequestInit = { method, headers: this.headers };
    if (body !== undefined) options.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, options);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Keycloak API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204 || response.status === 201) {
      const location = response.headers.get('Location');
      const msg = location ? `Success. Created resource: ${location}` : 'Success (no content)';
      return { content: [{ type: 'text', text: msg }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Keycloak returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private adminPath(realm: string, sub: string): string {
    return `/admin/realms/${encodeURIComponent(realm)}${sub}`;
  }

  // ── Tool implementations ───────────────────────────────────────────────────

  private async getRealm(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    if (!realm) return { content: [{ type: 'text', text: 'realm is required' }], isError: true };
    return this.request('GET', this.adminPath(realm, ''));
  }

  private async updateRealm(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    if (!realm || !args.settings) return { content: [{ type: 'text', text: 'realm and settings are required' }], isError: true };
    return this.request('PUT', this.adminPath(realm, ''), args.settings);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    if (!realm) return { content: [{ type: 'text', text: 'realm is required' }], isError: true };
    const params = new URLSearchParams();
    for (const key of ['search', 'username', 'email', 'firstName', 'lastName']) {
      if (args[key]) params.set(key, args[key] as string);
    }
    if (args.enabled !== undefined) params.set('enabled', String(args.enabled));
    if (args.max !== undefined) params.set('max', String(args.max));
    if (args.first !== undefined) params.set('first', String(args.first));
    const qs = params.toString();
    return this.request('GET', this.adminPath(realm, `/users${qs ? '?' + qs : ''}`));
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    if (!realm || !userId) return { content: [{ type: 'text', text: 'realm and userId are required' }], isError: true };
    return this.request('GET', this.adminPath(realm, `/users/${encodeURIComponent(userId)}`));
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    if (!realm || !args.username) return { content: [{ type: 'text', text: 'realm and username are required' }], isError: true };
    const body: Record<string, unknown> = { username: args.username };
    for (const key of ['email', 'firstName', 'lastName', 'enabled', 'emailVerified', 'attributes', 'credentials'] as const) {
      if (args[key] !== undefined) body[key] = args[key];
    }
    return this.request('POST', this.adminPath(realm, '/users'), body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    if (!realm || !userId || !args.updates) return { content: [{ type: 'text', text: 'realm, userId, and updates are required' }], isError: true };
    return this.request('PUT', this.adminPath(realm, `/users/${encodeURIComponent(userId)}`), args.updates);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    if (!realm || !userId) return { content: [{ type: 'text', text: 'realm and userId are required' }], isError: true };
    return this.request('DELETE', this.adminPath(realm, `/users/${encodeURIComponent(userId)}`));
  }

  private async resetUserPassword(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    const password = args.password as string;
    if (!realm || !userId || !password) return { content: [{ type: 'text', text: 'realm, userId, and password are required' }], isError: true };
    const body = { type: 'password', value: password, temporary: args.temporary ?? false };
    return this.request('PUT', this.adminPath(realm, `/users/${encodeURIComponent(userId)}/reset-password`), body);
  }

  private async sendVerifyEmail(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    if (!realm || !userId) return { content: [{ type: 'text', text: 'realm and userId are required' }], isError: true };
    const params = new URLSearchParams();
    if (args.clientId) params.set('client_id', args.clientId as string);
    if (args.redirectUri) params.set('redirect_uri', args.redirectUri as string);
    const qs = params.toString();
    return this.request('PUT', this.adminPath(realm, `/users/${encodeURIComponent(userId)}/send-verify-email${qs ? '?' + qs : ''}`));
  }

  private async logoutUser(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    if (!realm || !userId) return { content: [{ type: 'text', text: 'realm and userId are required' }], isError: true };
    return this.request('POST', this.adminPath(realm, `/users/${encodeURIComponent(userId)}/logout`));
  }

  private async getUserSessions(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    if (!realm || !userId) return { content: [{ type: 'text', text: 'realm and userId are required' }], isError: true };
    return this.request('GET', this.adminPath(realm, `/users/${encodeURIComponent(userId)}/sessions`));
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    if (!realm) return { content: [{ type: 'text', text: 'realm is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.search) params.set('search', args.search as string);
    if (args.max !== undefined) params.set('max', String(args.max));
    if (args.first !== undefined) params.set('first', String(args.first));
    const qs = params.toString();
    return this.request('GET', this.adminPath(realm, `/groups${qs ? '?' + qs : ''}`));
  }

  private async createGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    if (!realm || !args.name) return { content: [{ type: 'text', text: 'realm and name are required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.attributes !== undefined) body['attributes'] = args.attributes;
    return this.request('POST', this.adminPath(realm, '/groups'), body);
  }

  private async getGroupMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const groupId = args.groupId as string;
    if (!realm || !groupId) return { content: [{ type: 'text', text: 'realm and groupId are required' }], isError: true };
    const params = new URLSearchParams();
    if (args.max !== undefined) params.set('max', String(args.max));
    if (args.first !== undefined) params.set('first', String(args.first));
    const qs = params.toString();
    return this.request('GET', this.adminPath(realm, `/groups/${encodeURIComponent(groupId)}/members${qs ? '?' + qs : ''}`));
  }

  private async addUserToGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    const groupId = args.groupId as string;
    if (!realm || !userId || !groupId) return { content: [{ type: 'text', text: 'realm, userId, and groupId are required' }], isError: true };
    return this.request('PUT', this.adminPath(realm, `/users/${encodeURIComponent(userId)}/groups/${encodeURIComponent(groupId)}`));
  }

  private async removeUserFromGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    const groupId = args.groupId as string;
    if (!realm || !userId || !groupId) return { content: [{ type: 'text', text: 'realm, userId, and groupId are required' }], isError: true };
    return this.request('DELETE', this.adminPath(realm, `/users/${encodeURIComponent(userId)}/groups/${encodeURIComponent(groupId)}`));
  }

  private async listRealmRoles(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    if (!realm) return { content: [{ type: 'text', text: 'realm is required' }], isError: true };
    return this.request('GET', this.adminPath(realm, '/roles'));
  }

  private async createRealmRole(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    if (!realm || !args.name) return { content: [{ type: 'text', text: 'realm and name are required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.description !== undefined) body['description'] = args.description;
    if (args.composite !== undefined) body['composite'] = args.composite;
    return this.request('POST', this.adminPath(realm, '/roles'), body);
  }

  private async getUserRoleMappings(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    if (!realm || !userId) return { content: [{ type: 'text', text: 'realm and userId are required' }], isError: true };
    return this.request('GET', this.adminPath(realm, `/users/${encodeURIComponent(userId)}/role-mappings`));
  }

  private async addRealmRolesToUser(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    if (!realm || !userId || !args.roles) return { content: [{ type: 'text', text: 'realm, userId, and roles are required' }], isError: true };
    return this.request('POST', this.adminPath(realm, `/users/${encodeURIComponent(userId)}/role-mappings/realm`), args.roles);
  }

  private async removeRealmRolesFromUser(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    if (!realm || !userId || !args.roles) return { content: [{ type: 'text', text: 'realm, userId, and roles are required' }], isError: true };
    return this.request('DELETE', this.adminPath(realm, `/users/${encodeURIComponent(userId)}/role-mappings/realm`), args.roles);
  }

  private async listClients(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    if (!realm) return { content: [{ type: 'text', text: 'realm is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.clientId) params.set('clientId', args.clientId as string);
    if (args.max !== undefined) params.set('max', String(args.max));
    if (args.first !== undefined) params.set('first', String(args.first));
    const qs = params.toString();
    return this.request('GET', this.adminPath(realm, `/clients${qs ? '?' + qs : ''}`));
  }

  private async getClient(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const id = args.id as string;
    if (!realm || !id) return { content: [{ type: 'text', text: 'realm and id are required' }], isError: true };
    return this.request('GET', this.adminPath(realm, `/clients/${encodeURIComponent(id)}`));
  }

  private async createClient(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    if (!realm || !args.clientId) return { content: [{ type: 'text', text: 'realm and clientId are required' }], isError: true };
    const body: Record<string, unknown> = { clientId: args.clientId };
    for (const key of ['name', 'description', 'protocol', 'publicClient', 'redirectUris', 'webOrigins', 'serviceAccountsEnabled'] as const) {
      if (args[key] !== undefined) body[key] = args[key];
    }
    return this.request('POST', this.adminPath(realm, '/clients'), body);
  }

  private async getClientSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const id = args.id as string;
    if (!realm || !id) return { content: [{ type: 'text', text: 'realm and id are required' }], isError: true };
    return this.request('GET', this.adminPath(realm, `/clients/${encodeURIComponent(id)}/client-secret`));
  }

  private async regenerateClientSecret(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const id = args.id as string;
    if (!realm || !id) return { content: [{ type: 'text', text: 'realm and id are required' }], isError: true };
    return this.request('POST', this.adminPath(realm, `/clients/${encodeURIComponent(id)}/client-secret`));
  }

  private async deleteSession(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const sessionId = args.sessionId as string;
    if (!realm || !sessionId) return { content: [{ type: 'text', text: 'realm and sessionId are required' }], isError: true };
    return this.request('DELETE', this.adminPath(realm, `/sessions/${encodeURIComponent(sessionId)}`));
  }

  private async getBruteForceStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    if (!realm || !userId) return { content: [{ type: 'text', text: 'realm and userId are required' }], isError: true };
    return this.request('GET', this.adminPath(realm, `/attack-detection/brute-force/users/${encodeURIComponent(userId)}`));
  }

  private async clearBruteForceForUser(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    const userId = args.userId as string;
    if (!realm || !userId) return { content: [{ type: 'text', text: 'realm and userId are required' }], isError: true };
    return this.request('DELETE', this.adminPath(realm, `/attack-detection/brute-force/users/${encodeURIComponent(userId)}`));
  }

  private async getEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const realm = args.realm as string;
    if (!realm) return { content: [{ type: 'text', text: 'realm is required' }], isError: true };
    const params = new URLSearchParams();
    if (Array.isArray(args.type)) {
      for (const t of args.type as string[]) params.append('type', t);
    }
    for (const key of ['client', 'user', 'ipAddress', 'dateFrom', 'dateTo']) {
      if (args[key]) params.set(key, args[key] as string);
    }
    if (args.max !== undefined) params.set('max', String(args.max));
    if (args.first !== undefined) params.set('first', String(args.first));
    const qs = params.toString();
    return this.request('GET', this.adminPath(realm, `/events${qs ? '?' + qs : ''}`));
  }

  static catalog() {
    return {
      name: 'keycloak',
      displayName: 'Keycloak',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: [
        'keycloak', 'identity', 'iam', 'sso', 'oauth2', 'oidc', 'openid-connect',
        'saml', 'auth', 'authentication', 'authorization', 'users', 'roles',
        'groups', 'clients', 'realm', 'sessions', 'access control', 'rbac',
        'brute force', 'credentials', 'password', 'federation',
      ],
      toolNames: [
        'get_realm', 'update_realm',
        'list_users', 'get_user', 'create_user', 'update_user', 'delete_user',
        'reset_user_password', 'send_verify_email', 'logout_user', 'get_user_sessions',
        'list_groups', 'create_group', 'get_group_members', 'add_user_to_group', 'remove_user_from_group',
        'list_realm_roles', 'create_realm_role', 'get_user_role_mappings',
        'add_realm_roles_to_user', 'remove_realm_roles_from_user',
        'list_clients', 'get_client', 'create_client', 'get_client_secret', 'regenerate_client_secret',
        'delete_session', 'get_brute_force_status', 'clear_brute_force_for_user', 'get_events',
      ],
      description:
        'Keycloak Admin REST API adapter: manage realms, users, groups, roles, clients, sessions, brute-force detection, and events across self-hosted Keycloak identity and access management servers.',
      author: 'protectnil' as const,
    };
  }
}
