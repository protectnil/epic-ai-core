/**
 * Conjur MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official CyberArk Conjur MCP server was found on GitHub or the CyberArk Marketplace.
//
// Base URL: https://<your-conjur-host> (self-hosted; no fixed base URL)
// Auth: Two-step — first authenticate with Basic auth (username + API key) to receive a short-lived
//   access token, then use that token as: Authorization: Token token="<base64_encoded_token>"
//   The adapter accepts a pre-obtained access token OR performs the authenticate step automatically.
// Docs: https://docs.conjur.org/Latest/en/Content/Developer/Conjur_API.htm
// Rate limits: Not publicly documented; self-hosted rate limits depend on server configuration.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ConjurConfig {
  /** Base URL of the Conjur server (e.g. https://conjur.example.com) */
  baseUrl: string;
  /** Organization account name */
  account: string;
  /** Pre-obtained Conjur access token (base64 encoded). If provided, login/apiKey are not needed. */
  accessToken?: string;
  /** Conjur login (username or host/host-id) for automatic authentication */
  login?: string;
  /** Conjur API key for automatic authentication */
  apiKey?: string;
}

export class ConjurMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly account: string;
  private accessToken: string | null;
  private readonly login: string | null;
  private readonly apiKey: string | null;

  constructor(config: ConjurConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.account = config.account;
    this.accessToken = config.accessToken ?? null;
    this.login = config.login ?? null;
    this.apiKey = config.apiKey ?? null;
  }

  static catalog() {
    return {
      name: 'conjur',
      displayName: 'CyberArk Conjur',
      version: '1.0.0',
      category: 'identity',
      keywords: [
        'conjur', 'cyberark', 'secrets', 'secret management', 'vault', 'credential',
        'policy', 'rbac', 'role', 'permission', 'privilege', 'resource', 'identity',
        'variable', 'api key', 'rotation', 'host factory', 'certificate', 'pki',
        'authentication', 'access token', 'zero trust', 'privileged access',
      ],
      toolNames: [
        'authenticate',
        'get_login_api_key',
        'rotate_api_key',
        'change_password',
        'get_secret',
        'set_secret',
        'get_secrets_batch',
        'list_resources',
        'get_resource',
        'get_role',
        'add_role_member',
        'remove_role_member',
        'load_policy',
        'update_policy',
        'extend_policy',
        'get_public_keys',
        'create_host',
        'create_host_factory_tokens',
        'revoke_host_factory_token',
        'sign_certificate',
        'list_authenticators',
        'get_server_info',
        'get_server_health',
        'get_whoami',
      ],
      description: 'CyberArk Conjur secrets management: fetch and store secrets, manage policies, roles, and resources, authenticate users and hosts, and control privileged access.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'authenticate',
        description: 'Authenticate with a Conjur login and API key to obtain a short-lived access token for subsequent requests',
        inputSchema: {
          type: 'object',
          properties: {
            login: {
              type: 'string',
              description: 'URL-encoded Conjur login. For users: user ID. For hosts: host/<host-id>',
            },
            api_key: {
              type: 'string',
              description: 'Conjur API key for the specified login',
            },
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
          },
          required: ['login', 'api_key'],
        },
      },
      {
        name: 'get_login_api_key',
        description: 'Get the Conjur API key for a user by authenticating with HTTP Basic auth (username and password)',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
          },
        },
      },
      {
        name: 'rotate_api_key',
        description: 'Rotate the API key for a role (user or host), immediately invalidating the old key',
        inputSchema: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              description: 'Role specifier in kind:identifier format (e.g. user:alice, host:myapp). Defaults to own role.',
            },
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
          },
        },
      },
      {
        name: 'change_password',
        description: 'Change the password for the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            new_password: {
              type: 'string',
              description: 'New password to set for the authenticated user',
            },
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
          },
          required: ['new_password'],
        },
      },
      {
        name: 'get_secret',
        description: 'Fetch the value of a Conjur secret variable by account, kind, and identifier',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'URL-encoded variable ID (e.g. myapp/database/password)',
            },
            kind: {
              type: 'string',
              description: 'Resource kind — almost always "variable" (default: variable)',
            },
            version: {
              type: 'number',
              description: 'Specific version to retrieve (Conjur keeps last 20 versions; default: latest)',
            },
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'set_secret',
        description: 'Store or update the value of a Conjur secret variable',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'URL-encoded variable ID (e.g. myapp/database/password)',
            },
            value: {
              type: 'string',
              description: 'Secret value to store in the variable',
            },
            kind: {
              type: 'string',
              description: 'Resource kind — almost always "variable" (default: variable)',
            },
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
          },
          required: ['identifier', 'value'],
        },
      },
      {
        name: 'get_secrets_batch',
        description: 'Fetch multiple secret variable values in a single request using comma-separated variable IDs',
        inputSchema: {
          type: 'object',
          properties: {
            variable_ids: {
              type: 'string',
              description: 'Comma-delimited, URL-encoded resource IDs of the variables to fetch (e.g. myaccount:variable:db/pass,myaccount:variable:api/key)',
            },
          },
          required: ['variable_ids'],
        },
      },
      {
        name: 'list_resources',
        description: 'List Conjur resources within an account with optional filters for kind, search, pagination, and role',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
            kind: {
              type: 'string',
              description: 'Filter by resource type: user, host, layer, group, policy, variable, webservice',
            },
            search: {
              type: 'string',
              description: 'Filter resources by name using this search term',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset — start at this item number (default: 0)',
            },
            count: {
              type: 'boolean',
              description: 'If true, return only the count of matching resources (default: false)',
            },
            role: {
              type: 'string',
              description: 'Retrieve resources visible to a different role (e.g. host:myapp)',
            },
          },
        },
      },
      {
        name: 'get_resource',
        description: 'Get details of a single Conjur resource including permitted roles and privilege checks',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
            kind: {
              type: 'string',
              description: 'Resource kind: user, host, layer, group, policy, variable, webservice',
            },
            identifier: {
              type: 'string',
              description: 'Resource identifier (e.g. myapp/database)',
            },
            permitted_roles: {
              type: 'boolean',
              description: 'If true, list roles that have the named privilege on this resource',
            },
            privilege: {
              type: 'string',
              description: 'Privilege level to check or filter on (e.g. read, execute, update)',
            },
            check: {
              type: 'boolean',
              description: 'If true, check whether the authenticated role has the specified privilege',
            },
            role: {
              type: 'string',
              description: 'Role to check privilege for (used with check=true)',
            },
          },
          required: ['kind', 'identifier'],
        },
      },
      {
        name: 'get_role',
        description: 'Get role information including memberships, members, and role graph for a Conjur role',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
            kind: {
              type: 'string',
              description: 'Role kind: user, host, layer, group, policy',
            },
            identifier: {
              type: 'string',
              description: 'Role identifier',
            },
            all: {
              type: 'boolean',
              description: 'If true, return all role memberships expanded recursively',
            },
            memberships: {
              type: 'boolean',
              description: 'If true, return direct role memberships (not recursively expanded)',
            },
            members: {
              type: 'boolean',
              description: 'If true, return list of members of this role',
            },
            search: {
              type: 'string',
              description: 'Filter members by this search term',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of members to return (default: 25)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset for members list (default: 0)',
            },
          },
          required: ['kind', 'identifier'],
        },
      },
      {
        name: 'add_role_member',
        description: 'Grant role membership to another role, giving it all privileges of the target role',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
            kind: {
              type: 'string',
              description: 'Target role kind: user, host, layer, group, policy',
            },
            identifier: {
              type: 'string',
              description: 'Target role identifier',
            },
            member: {
              type: 'string',
              description: 'Role to add as a member, in kind:identifier format (e.g. host:myapp)',
            },
          },
          required: ['kind', 'identifier', 'member'],
        },
      },
      {
        name: 'remove_role_member',
        description: 'Revoke role membership from a role, removing its inherited privileges',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
            kind: {
              type: 'string',
              description: 'Target role kind: user, host, layer, group, policy',
            },
            identifier: {
              type: 'string',
              description: 'Target role identifier',
            },
            member: {
              type: 'string',
              description: 'Role to remove from membership, in kind:identifier format (e.g. host:myapp)',
            },
          },
          required: ['kind', 'identifier', 'member'],
        },
      },
      {
        name: 'load_policy',
        description: 'Load or replace a Conjur policy document, creating or replacing all defined resources and roles',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
            identifier: {
              type: 'string',
              description: 'Policy ID to load into (use "root" for top-level policy)',
            },
            policy: {
              type: 'string',
              description: 'YAML policy document content defining resources, roles, and permissions',
            },
          },
          required: ['identifier', 'policy'],
        },
      },
      {
        name: 'update_policy',
        description: 'Partially update an existing Conjur policy by adding or modifying specific resources and permissions',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
            identifier: {
              type: 'string',
              description: 'Policy ID to update',
            },
            policy: {
              type: 'string',
              description: 'YAML policy document fragment with changes to apply',
            },
          },
          required: ['identifier', 'policy'],
        },
      },
      {
        name: 'extend_policy',
        description: 'Extend an existing Conjur policy by appending new resources, roles, or permissions without replacing existing ones',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
            identifier: {
              type: 'string',
              description: 'Policy ID to extend',
            },
            policy: {
              type: 'string',
              description: 'YAML policy document fragment to append to the existing policy',
            },
          },
          required: ['identifier', 'policy'],
        },
      },
      {
        name: 'get_public_keys',
        description: 'Get all public SSH keys stored for a resource (user or host)',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
            kind: {
              type: 'string',
              description: 'Resource kind: user or host',
            },
            identifier: {
              type: 'string',
              description: 'Resource identifier (username or host ID)',
            },
          },
          required: ['kind', 'identifier'],
        },
      },
      {
        name: 'create_host',
        description: 'Create a new host identity using a Host Factory token for automated host enrollment',
        inputSchema: {
          type: 'object',
          properties: {
            host_id: {
              type: 'string',
              description: 'Identifier for the new host (e.g. myapp-instance-001)',
            },
            host_factory_token: {
              type: 'string',
              description: 'Host Factory token authorizing creation of this host',
            },
            annotations: {
              type: 'object',
              description: 'Key-value annotations to attach to the host (e.g. {"aws/region": "us-east-1"})',
            },
          },
          required: ['host_id', 'host_factory_token'],
        },
      },
      {
        name: 'create_host_factory_tokens',
        description: 'Create one or more time-limited Host Factory tokens for automated host enrollment',
        inputSchema: {
          type: 'object',
          properties: {
            host_factory: {
              type: 'string',
              description: 'Host factory resource ID (e.g. myaccount:host_factory:myapp)',
            },
            expiration: {
              type: 'string',
              description: 'Token expiration in ISO 8601 format (e.g. 2024-12-31T23:59:59Z)',
            },
            count: {
              type: 'number',
              description: 'Number of tokens to create (default: 1)',
            },
            cidr: {
              type: 'array',
              description: 'List of CIDR ranges that may use this token (e.g. ["192.168.1.0/24"])',
            },
          },
          required: ['host_factory', 'expiration'],
        },
      },
      {
        name: 'revoke_host_factory_token',
        description: 'Revoke a Host Factory token immediately, preventing any further host creation with it',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'The Host Factory token to revoke',
            },
          },
          required: ['token'],
        },
      },
      {
        name: 'sign_certificate',
        description: 'Get a signed TLS certificate from a configured Conjur Certificate Authority service',
        inputSchema: {
          type: 'object',
          properties: {
            account: {
              type: 'string',
              description: 'Organization account name (defaults to configured account)',
            },
            service_id: {
              type: 'string',
              description: 'Name of the Certificate Authority service configured in Conjur',
            },
            csr: {
              type: 'string',
              description: 'PEM-encoded Certificate Signing Request (CSR)',
            },
            ttl: {
              type: 'string',
              description: 'Certificate validity duration (e.g. P1D for 1 day, PT1H for 1 hour)',
            },
          },
          required: ['service_id', 'csr', 'ttl'],
        },
      },
      {
        name: 'list_authenticators',
        description: 'List all configured authenticators on the Conjur server and their enabled/disabled status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_server_info',
        description: 'Get basic information about the Conjur Enterprise server including version and configuration',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_server_health',
        description: 'Get health status of the Conjur server including database connectivity and service availability',
        inputSchema: {
          type: 'object',
          properties: {
            remote: {
              type: 'string',
              description: 'Optional hostname of a remote Conjur Enterprise server to check health for',
            },
          },
        },
      },
      {
        name: 'get_whoami',
        description: 'Get information about the currently authenticated client including role, account, and client IP',
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
        case 'authenticate':
          return this.authenticate(args);
        case 'get_login_api_key':
          return this.getLoginApiKey(args);
        case 'rotate_api_key':
          return this.rotateApiKey(args);
        case 'change_password':
          return this.changePassword(args);
        case 'get_secret':
          return this.getSecret(args);
        case 'set_secret':
          return this.setSecret(args);
        case 'get_secrets_batch':
          return this.getSecretsBatch(args);
        case 'list_resources':
          return this.listResources(args);
        case 'get_resource':
          return this.getResource(args);
        case 'get_role':
          return this.getRole(args);
        case 'add_role_member':
          return this.addRoleMember(args);
        case 'remove_role_member':
          return this.removeRoleMember(args);
        case 'load_policy':
          return this.loadPolicy(args);
        case 'update_policy':
          return this.updatePolicy(args);
        case 'extend_policy':
          return this.extendPolicy(args);
        case 'get_public_keys':
          return this.getPublicKeys(args);
        case 'create_host':
          return this.createHost(args);
        case 'create_host_factory_tokens':
          return this.createHostFactoryTokens(args);
        case 'revoke_host_factory_token':
          return this.revokeHostFactoryToken(args);
        case 'sign_certificate':
          return this.signCertificate(args);
        case 'list_authenticators':
          return this.listAuthenticators();
        case 'get_server_info':
          return this.getServerInfo();
        case 'get_server_health':
          return this.getServerHealth(args);
        case 'get_whoami':
          return this.getWhoami();
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

  private tokenHeader(): Record<string, string> {
    if (!this.accessToken) throw new Error('No access token available. Call authenticate first.');
    return {
      'Authorization': `Token token="${this.accessToken}"`,
      'Content-Type': 'application/json',
    };
  }

  private acct(args: Record<string, unknown>): string {
    return (args.account as string | undefined) ?? this.account;
  }

  private async request(
    method: string,
    path: string,
    options: {
      headers?: Record<string, string>;
      body?: string;
      params?: Record<string, string | undefined>;
    } = {},
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (options.params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(options.params)) {
        if (v !== undefined) qs.set(k, v);
      }
      const str = qs.toString();
      if (str) url += `?${str}`;
    }
    const response = await this.fetchWithRetry(url, {
      method,
      headers: options.headers ?? this.tokenHeader(),
      body: options.body,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: 204 }) }], isError: false };
    }
    const text = await response.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { content: [{ type: 'text', text: this.truncate(parsed) }], isError: false };
  }

  private async authenticate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.login || !args.api_key) return { content: [{ type: 'text', text: 'login and api_key are required' }], isError: true };
    const account = this.acct(args);
    const login = encodeURIComponent(args.login as string);
    const response = await this.fetchWithRetry(`${this.baseUrl}/authn/${encodeURIComponent(account)}/${login}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: args.api_key as string,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Authentication failed: ${response.status} ${response.statusText}` }], isError: true };
    }
    const token = await response.text();
    this.accessToken = token.trim();
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, token_obtained: true }) }], isError: false };
  }

  private async getLoginApiKey(args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.login || !this.apiKey) {
      return { content: [{ type: 'text', text: 'login and apiKey must be configured in ConjurConfig for this operation' }], isError: true };
    }
    const account = this.acct(args);
    const response = await this.fetchWithRetry(`${this.baseUrl}/authn/${encodeURIComponent(account)}/login`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${this.login}:${this.apiKey}`)}`,
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const apiKey = await response.text();
    return { content: [{ type: 'text', text: JSON.stringify({ api_key: apiKey.trim() }) }], isError: false };
  }

  private async rotateApiKey(args: Record<string, unknown>): Promise<ToolResult> {
    const account = this.acct(args);
    const params: Record<string, string | undefined> = {};
    if (args.role) params.role = args.role as string;
    return this.request('PUT', `/authn/${encodeURIComponent(account)}/api_key`, { params });
  }

  private async changePassword(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.new_password) return { content: [{ type: 'text', text: 'new_password is required' }], isError: true };
    const account = this.acct(args);
    return this.request('PUT', `/authn/${encodeURIComponent(account)}/password`, {
      headers: { ...this.tokenHeader(), 'Content-Type': 'text/plain' },
      body: args.new_password as string,
    });
  }

  private async getSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    const account = this.acct(args);
    const kind = (args.kind as string | undefined) ?? 'variable';
    const params: Record<string, string | undefined> = {};
    if (args.version !== undefined) params.version = String(args.version);
    return this.request('GET', `/secrets/${encodeURIComponent(account)}/${encodeURIComponent(kind)}/${encodeURIComponent(args.identifier as string)}`, { params });
  }

  private async setSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier || args.value === undefined) return { content: [{ type: 'text', text: 'identifier and value are required' }], isError: true };
    const account = this.acct(args);
    const kind = (args.kind as string | undefined) ?? 'variable';
    return this.request('POST', `/secrets/${encodeURIComponent(account)}/${encodeURIComponent(kind)}/${encodeURIComponent(args.identifier as string)}`, {
      headers: { ...this.tokenHeader(), 'Content-Type': 'application/octet-stream' },
      body: args.value as string,
    });
  }

  private async getSecretsBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.variable_ids) return { content: [{ type: 'text', text: 'variable_ids is required' }], isError: true };
    return this.request('GET', '/secrets', { params: { variable_ids: args.variable_ids as string } });
  }

  private async listResources(args: Record<string, unknown>): Promise<ToolResult> {
    const account = this.acct(args);
    const params: Record<string, string | undefined> = {
      kind: args.kind as string | undefined,
      search: args.search as string | undefined,
      limit: args.limit !== undefined ? String(args.limit) : undefined,
      offset: args.offset !== undefined ? String(args.offset) : undefined,
      count: args.count !== undefined ? String(args.count) : undefined,
      role: args.role as string | undefined,
      acting_as: args.acting_as as string | undefined,
    };
    return this.request('GET', `/resources/${encodeURIComponent(account)}`, { params });
  }

  private async getResource(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.kind || !args.identifier) return { content: [{ type: 'text', text: 'kind and identifier are required' }], isError: true };
    const account = this.acct(args);
    const params: Record<string, string | undefined> = {
      permitted_roles: args.permitted_roles !== undefined ? String(args.permitted_roles) : undefined,
      privilege: args.privilege as string | undefined,
      check: args.check !== undefined ? String(args.check) : undefined,
      role: args.role as string | undefined,
    };
    return this.request('GET', `/resources/${encodeURIComponent(account)}/${encodeURIComponent(args.kind as string)}/${encodeURIComponent(args.identifier as string)}`, { params });
  }

  private async getRole(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.kind || !args.identifier) return { content: [{ type: 'text', text: 'kind and identifier are required' }], isError: true };
    const account = this.acct(args);
    const params: Record<string, string | undefined> = {
      all: args.all !== undefined ? String(args.all) : undefined,
      memberships: args.memberships !== undefined ? String(args.memberships) : undefined,
      members: args.members !== undefined ? String(args.members) : undefined,
      search: args.search as string | undefined,
      limit: args.limit !== undefined ? String(args.limit) : undefined,
      offset: args.offset !== undefined ? String(args.offset) : undefined,
    };
    return this.request('GET', `/roles/${encodeURIComponent(account)}/${encodeURIComponent(args.kind as string)}/${encodeURIComponent(args.identifier as string)}`, { params });
  }

  private async addRoleMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.kind || !args.identifier || !args.member) return { content: [{ type: 'text', text: 'kind, identifier, and member are required' }], isError: true };
    const account = this.acct(args);
    const params: Record<string, string | undefined> = { members: 'true', member: args.member as string };
    return this.request('POST', `/roles/${encodeURIComponent(account)}/${encodeURIComponent(args.kind as string)}/${encodeURIComponent(args.identifier as string)}`, { params });
  }

  private async removeRoleMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.kind || !args.identifier || !args.member) return { content: [{ type: 'text', text: 'kind, identifier, and member are required' }], isError: true };
    const account = this.acct(args);
    const params: Record<string, string | undefined> = { members: 'true', member: args.member as string };
    return this.request('DELETE', `/roles/${encodeURIComponent(account)}/${encodeURIComponent(args.kind as string)}/${encodeURIComponent(args.identifier as string)}`, { params });
  }

  private async loadPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier || !args.policy) return { content: [{ type: 'text', text: 'identifier and policy are required' }], isError: true };
    const account = this.acct(args);
    return this.request('PUT', `/policies/${encodeURIComponent(account)}/policy/${encodeURIComponent(args.identifier as string)}`, {
      headers: { ...this.tokenHeader(), 'Content-Type': 'application/x-yaml' },
      body: args.policy as string,
    });
  }

  private async updatePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier || !args.policy) return { content: [{ type: 'text', text: 'identifier and policy are required' }], isError: true };
    const account = this.acct(args);
    return this.request('PATCH', `/policies/${encodeURIComponent(account)}/policy/${encodeURIComponent(args.identifier as string)}`, {
      headers: { ...this.tokenHeader(), 'Content-Type': 'application/x-yaml' },
      body: args.policy as string,
    });
  }

  private async extendPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier || !args.policy) return { content: [{ type: 'text', text: 'identifier and policy are required' }], isError: true };
    const account = this.acct(args);
    return this.request('POST', `/policies/${encodeURIComponent(account)}/policy/${encodeURIComponent(args.identifier as string)}`, {
      headers: { ...this.tokenHeader(), 'Content-Type': 'application/x-yaml' },
      body: args.policy as string,
    });
  }

  private async getPublicKeys(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.kind || !args.identifier) return { content: [{ type: 'text', text: 'kind and identifier are required' }], isError: true };
    const account = this.acct(args);
    return this.request('GET', `/public_keys/${encodeURIComponent(account)}/${encodeURIComponent(args.kind as string)}/${encodeURIComponent(args.identifier as string)}`);
  }

  private async createHost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.host_id || !args.host_factory_token) return { content: [{ type: 'text', text: 'host_id and host_factory_token are required' }], isError: true };
    const body = new URLSearchParams();
    body.set('id', args.host_id as string);
    if (args.annotations) body.set('annotations', JSON.stringify(args.annotations));
    const response = await this.fetchWithRetry(`${this.baseUrl}/host_factories/hosts`, {
      method: 'POST',
      headers: {
        'Authorization': `Token token="${args.host_factory_token as string}"`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { content: [{ type: 'text', text: this.truncate(parsed) }], isError: false };
  }

  private async createHostFactoryTokens(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.host_factory || !args.expiration) return { content: [{ type: 'text', text: 'host_factory and expiration are required' }], isError: true };
    const body = new URLSearchParams();
    body.set('host_factory', args.host_factory as string);
    body.set('expiration', args.expiration as string);
    if (args.count !== undefined) body.set('count', String(args.count));
    if (args.cidr !== undefined) body.set('cidr', JSON.stringify(args.cidr));
    const headers = { ...this.tokenHeader(), 'Content-Type': 'application/x-www-form-urlencoded' };
    const response = await this.fetchWithRetry(`${this.baseUrl}/host_factory_tokens`, {
      method: 'POST',
      headers,
      body: body.toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { content: [{ type: 'text', text: this.truncate(parsed) }], isError: false };
  }

  private async revokeHostFactoryToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.token) return { content: [{ type: 'text', text: 'token is required' }], isError: true };
    return this.request('DELETE', `/host_factory_tokens/${encodeURIComponent(args.token as string)}`);
  }

  private async signCertificate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id || !args.csr || !args.ttl) return { content: [{ type: 'text', text: 'service_id, csr, and ttl are required' }], isError: true };
    const account = this.acct(args);
    const body = new URLSearchParams();
    body.set('csr', args.csr as string);
    body.set('ttl', args.ttl as string);
    const headers = { ...this.tokenHeader(), 'Content-Type': 'application/x-www-form-urlencoded' };
    const response = await this.fetchWithRetry(`${this.baseUrl}/ca/${encodeURIComponent(account)}/${encodeURIComponent(args.service_id as string)}/sign`, {
      method: 'POST',
      headers,
      body: body.toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async listAuthenticators(): Promise<ToolResult> {
    return this.request('GET', '/authenticators');
  }

  private async getServerInfo(): Promise<ToolResult> {
    return this.request('GET', '/info');
  }

  private async getServerHealth(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.remote) {
      return this.request('GET', `/remote_health/${encodeURIComponent(args.remote as string)}`);
    }
    return this.request('GET', '/health');
  }

  private async getWhoami(): Promise<ToolResult> {
    return this.request('GET', '/whoami');
  }
}
