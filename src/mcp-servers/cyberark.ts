/**
 * CyberArk Privileged Access Management (PAM) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found for CyberArk PAM (self-hosted PVWA REST API) as of 2026-03-28
//   Community adapter: https://github.com/aaearon/mcp-privilege-cloud (53 tools, Privilege Cloud only,
//   transport: stdio + streamable-HTTP, auth: OAuth2, actively maintained as of 2026-03) — covers
//   Privilege Cloud only, NOT self-hosted PVWA. Does not expose access request confirm/reject or session
//   recordings. Our adapter targets self-hosted PVWA with full PAM operations.
// Our adapter covers: 23 tools. Vendor MCP covers: 53 tools (Privilege Cloud only).
// Recommendation: use-rest-api — community MCP covers Privilege Cloud only; our adapter targets
//   self-hosted PVWA and includes operations (access requests, session recordings) absent from that MCP.
//
// Base URL: https://{pvwa-host}/PasswordVault/API  (self-hosted PVWA)
//           https://{tenant}.privilegecloud.cyberark.com/PasswordVault/API  (Privilege Cloud)
// Auth: Session token via POST /Auth/CyberArk/Logon (returns plain string token, not JSON object).
//   Token is passed as-is in the Authorization header — this is the documented PVWA REST API format.
//   Token TTL: 8 hours by default (configurable via tokenTtlMs). Session is refreshed 60s before expiry.
// Docs: https://docs.cyberark.com/pam-self-hosted/latest/en/content/webservices/implementing%20privileged%20account%20security%20web%20services%20.htm
//       Swagger: https://{pvwa-host}/PasswordVault/swagger/
// Rate limits: Not officially published; governed by PVWA session concurrency limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CyberArkConfig {
  username: string;
  password: string;
  /** Base URL including /PasswordVault/API (e.g. https://pvwa.example.com/PasswordVault/API) */
  baseUrl: string;
  /** Auth method: CyberArk (default), LDAP, RADIUS, or SAML */
  authMethod?: string;
  /** Token TTL in ms. Default: 27,000,000 (7.5 hours — refreshes 60s before 8h expiry) */
  tokenTtlMs?: number;
}

const DEFAULT_TOKEN_TTL_MS = 27_000_000;

export class CyberArkMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private readonly authMethod: string;
  private readonly tokenTtlMs: number;
  private authToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: CyberArkConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authMethod = config.authMethod ?? 'CyberArk';
    this.tokenTtlMs = config.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS;
  }

  static catalog() {
    return {
      name: 'cyberark',
      displayName: 'CyberArk PAM',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: [
        'cyberark', 'pam', 'privileged access', 'pvwa', 'vault', 'safe', 'account',
        'credential', 'password', 'rotation', 'session', 'recording', 'pim', 'psm',
        'cpm', 'platform', 'user', 'group', 'access request', 'checkout', 'check-in',
        'privileged account', 'secret', 'privileged identity management',
      ],
      toolNames: [
        'list_accounts', 'get_account', 'add_account', 'update_account', 'delete_account',
        'retrieve_credential', 'change_credential', 'verify_credential',
        'list_safes', 'get_safe', 'add_safe', 'update_safe',
        'list_safe_members', 'add_safe_member',
        'list_users', 'get_user',
        'list_platforms', 'get_platform',
        'list_pending_requests', 'confirm_request', 'reject_request',
        'get_session_recordings', 'get_recording_activities',
      ],
      description: 'CyberArk PAM privileged access management: manage accounts, safes, credentials, platforms, users, access requests, and PSM session recordings via the PVWA REST API.',
      author: 'protectnil' as const,
    };
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.authToken && this.tokenExpiry > now) return this.authToken;

    const response = await this.fetchWithRetry(`${this.baseUrl}/Auth/${this.authMethod}/Logon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });

    if (!response.ok) {
      throw new Error(`CyberArk authentication failed: ${response.status} ${response.statusText}`);
    }

    // PVWA Logon returns a bare quoted string (e.g. "\"token-value\""), not a JSON object
    const raw = await response.text();
    this.authToken = raw.replace(/^"|"$/g, '');
    this.tokenExpiry = now + this.tokenTtlMs - 60_000;
    return this.authToken;
  }

  private cyberArkHeaders(token: string): Record<string, string> {
    return {
      // The Authorization header receives the raw token — documented PVWA REST API format
      Authorization: token,
      'Content-Type': 'application/json',
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    let token = await this.getOrRefreshToken();
    const doRequest = async (t: string): Promise<Response> => {
      const init: RequestInit = {
        method,
        headers: this.cyberArkHeaders(t),
      };
      if (body !== undefined) init.body = JSON.stringify(body);
      return fetch(`${this.baseUrl}${path}`, init);
    };

    let response = await doRequest(token);

    // Re-authenticate on 401 (expired session)
    if (response.status === 401) {
      this.authToken = null;
      this.tokenExpiry = 0;
      token = await this.getOrRefreshToken();
      response = await doRequest(token);
    }

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try { data = await response.json(); } catch {
      throw new Error(`CyberArk returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_accounts',
        description: 'List privileged accounts in CyberArk vaults with optional filters for safe name, platform, and search term',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Free-text search across account name, address, username, and platform' },
            safe_name: { type: 'string', description: 'Filter accounts to a specific safe name' },
            platform_id: { type: 'string', description: 'Filter by platform ID (e.g. WinServerLocal)' },
            limit: { type: 'number', description: 'Max accounts to return (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: { type: 'string', description: 'Sort field and direction (e.g. "userName asc", "address desc")' },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get detailed information for a specific privileged account by CyberArk account ID',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'CyberArk account ID (numeric string)' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'add_account',
        description: 'Onboard a new privileged account into a CyberArk safe with platform, address, and credential details',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Account name (must be unique within the safe)' },
            address: { type: 'string', description: 'Target system address (hostname, IP, or URL)' },
            user_name: { type: 'string', description: 'Username of the privileged account' },
            platform_id: { type: 'string', description: 'Platform ID managing this account (e.g. WinServerLocal)' },
            safe_name: { type: 'string', description: 'Safe name to store the account in' },
            secret_type: {
              type: 'string',
              description: 'Secret type: password or key (default: password)',
            },
            secret: { type: 'string', description: 'Initial credential value (password or SSH key content)' },
          },
          required: ['name', 'address', 'user_name', 'platform_id', 'safe_name'],
        },
      },
      {
        name: 'update_account',
        description: 'Update account properties (name, address, username, platform) for an existing CyberArk account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'CyberArk account ID to update' },
            operations: {
              type: 'array',
              description: 'JSON Patch operations array: [{op: "replace", path: "/name", value: "newname"}]',
            },
          },
          required: ['account_id', 'operations'],
        },
      },
      {
        name: 'delete_account',
        description: 'Delete a privileged account from a CyberArk safe by account ID — this action is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'CyberArk account ID to delete' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'retrieve_credential',
        description: 'Retrieve the current credential value for a managed account — requires checkout permission and logs to audit trail',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'CyberArk account ID to retrieve the credential for' },
            reason: { type: 'string', description: 'Business justification for credential retrieval (audit trail)' },
            ticket_id: { type: 'string', description: 'Optional ticketing system ID to associate with the request' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'change_credential',
        description: 'Trigger an immediate CPM-managed password change for a privileged account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'CyberArk account ID to change the credential for' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'verify_credential',
        description: 'Trigger a CPM verification of the current credential for a privileged account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'CyberArk account ID to verify the credential for' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_safes',
        description: 'List CyberArk vaults (safes) with optional search filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search filter for safe names' },
            limit: { type: 'number', description: 'Max safes to return (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort: { type: 'string', description: 'Sort by field: safeName or numberOfVersionsRetention' },
          },
        },
      },
      {
        name: 'get_safe',
        description: 'Get details for a specific safe including retention policy, CPM, and membership count',
        inputSchema: {
          type: 'object',
          properties: {
            safe_name: { type: 'string', description: 'Name of the safe to retrieve' },
          },
          required: ['safe_name'],
        },
      },
      {
        name: 'add_safe',
        description: 'Create a new CyberArk safe with specified retention, CPM, and OLAC settings',
        inputSchema: {
          type: 'object',
          properties: {
            safe_name: { type: 'string', description: 'Name for the new safe (must be unique)' },
            description: { type: 'string', description: 'Description of the safe purpose' },
            cpm_name: { type: 'string', description: 'CPM user to manage credentials in this safe' },
            number_of_versions_retention: {
              type: 'number',
              description: 'Number of password versions to retain (default: 5)',
            },
            number_of_days_retention: {
              type: 'number',
              description: 'Number of days to retain password versions',
            },
          },
          required: ['safe_name'],
        },
      },
      {
        name: 'update_safe',
        description: 'Update safe properties including description, CPM assignment, and retention settings',
        inputSchema: {
          type: 'object',
          properties: {
            safe_name: { type: 'string', description: 'Name of the safe to update' },
            description: { type: 'string', description: 'Updated description' },
            cpm_name: { type: 'string', description: 'Updated CPM user assignment' },
            number_of_versions_retention: { type: 'number', description: 'Updated version retention count' },
          },
          required: ['safe_name'],
        },
      },
      {
        name: 'list_safe_members',
        description: 'List all members of a CyberArk safe with their permissions and role assignments',
        inputSchema: {
          type: 'object',
          properties: {
            safe_name: { type: 'string', description: 'Name of the safe to list members for' },
            limit: { type: 'number', description: 'Max members to return (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['safe_name'],
        },
      },
      {
        name: 'add_safe_member',
        description: 'Add a user or group as a member of a CyberArk safe with specified permissions',
        inputSchema: {
          type: 'object',
          properties: {
            safe_name: { type: 'string', description: 'Safe name to add the member to' },
            member_name: { type: 'string', description: 'Username or group name to add as a member' },
            member_type: {
              type: 'string',
              description: 'Member type: User or Group (default: User)',
            },
            permissions: {
              type: 'object',
              description: 'Permissions object with boolean flags: listAccounts, retrieveAccounts, addAccounts, updateAccountContent, updateAccountProperties, viewAuditLog, manageSafe, etc.',
            },
          },
          required: ['safe_name', 'member_name'],
        },
      },
      {
        name: 'list_users',
        description: 'List CyberArk vault users with optional filter for username, user type, and component users',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search filter by username or display name' },
            user_type: {
              type: 'string',
              description: 'Filter by user type: EPVUser, BasicUser, ExternalUser, etc.',
            },
            include_component_users: {
              type: 'boolean',
              description: 'Include CyberArk component users (CPM, PVWA, PSM) in results (default: false)',
            },
            limit: { type: 'number', description: 'Max users to return (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get full details for a specific CyberArk user by user ID including safe memberships and properties',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'number', description: 'CyberArk user ID (numeric)' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_platforms',
        description: 'List CyberArk account management platforms with their configuration and status',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search filter for platform name or ID' },
            active: {
              type: 'boolean',
              description: 'Filter by active status: true for active, false for inactive',
            },
          },
        },
      },
      {
        name: 'get_platform',
        description: 'Get full configuration details for a specific CyberArk platform by platform ID',
        inputSchema: {
          type: 'object',
          properties: {
            platform_id: { type: 'string', description: 'Platform ID to retrieve (e.g. WinServerLocal)' },
          },
          required: ['platform_id'],
        },
      },
      {
        name: 'list_pending_requests',
        description: 'List privileged access requests via PVWA REST API — IncomingRequests (default) for requests awaiting your approval, or MyRequests for your own submitted requests',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Which request queue to retrieve: IncomingRequests (requests pending your approval, default) or MyRequests (your own submitted requests)',
            },
          },
        },
      },
      {
        name: 'confirm_request',
        description: 'Approve a pending privileged access request by request ID to grant access',
        inputSchema: {
          type: 'object',
          properties: {
            request_id: { type: 'string', description: 'Access request ID to approve' },
            reason: { type: 'string', description: 'Reason for approving the request (audit trail)' },
          },
          required: ['request_id'],
        },
      },
      {
        name: 'reject_request',
        description: 'Reject a pending privileged access request by request ID with a reason',
        inputSchema: {
          type: 'object',
          properties: {
            request_id: { type: 'string', description: 'Access request ID to reject' },
            reason: { type: 'string', description: 'Reason for rejecting the request (audit trail)' },
          },
          required: ['request_id'],
        },
      },
      {
        name: 'get_session_recordings',
        description: 'List PSM privileged session recordings with optional filters for account, user, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'string', description: 'Filter recordings by account ID' },
            user_name: { type: 'string', description: 'Filter recordings by the user who connected' },
            safe_name: { type: 'string', description: 'Filter recordings by safe name' },
            from_time: { type: 'number', description: 'Start of time range as epoch seconds' },
            to_time: { type: 'number', description: 'End of time range as epoch seconds' },
            limit: { type: 'number', description: 'Max recordings to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_recording_activities',
        description: 'Get detailed activity events and commands from a specific PSM session recording by recording ID',
        inputSchema: {
          type: 'object',
          properties: {
            recording_id: { type: 'string', description: 'PSM recording ID to retrieve activities for' },
          },
          required: ['recording_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_accounts':
          return this.listAccounts(args);
        case 'get_account':
          return this.getAccount(args);
        case 'add_account':
          return this.addAccount(args);
        case 'update_account':
          return this.updateAccount(args);
        case 'delete_account':
          return this.deleteAccount(args);
        case 'retrieve_credential':
          return this.retrieveCredential(args);
        case 'change_credential':
          return this.changeCredential(args);
        case 'verify_credential':
          return this.verifyCredential(args);
        case 'list_safes':
          return this.listSafes(args);
        case 'get_safe':
          return this.getSafe(args);
        case 'add_safe':
          return this.addSafe(args);
        case 'update_safe':
          return this.updateSafe(args);
        case 'list_safe_members':
          return this.listSafeMembers(args);
        case 'add_safe_member':
          return this.addSafeMember(args);
        case 'list_users':
          return this.listUsers(args);
        case 'get_user':
          return this.getUser(args);
        case 'list_platforms':
          return this.listPlatforms(args);
        case 'get_platform':
          return this.getPlatform(args);
        case 'list_pending_requests':
          return this.listPendingRequests(args);
        case 'confirm_request':
          return this.confirmRequest(args);
        case 'reject_request':
          return this.rejectRequest(args);
        case 'get_session_recordings':
          return this.getSessionRecordings(args);
        case 'get_recording_activities':
          return this.getRecordingActivities(args);
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

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    let url = `/Accounts?limit=${limit}&offset=${offset}`;
    if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;
    if (args.safe_name) url += `&safeName=${encodeURIComponent(args.safe_name as string)}`;
    if (args.platform_id) url += `&platformId=${encodeURIComponent(args.platform_id as string)}`;
    if (args.sort) url += `&sort=${encodeURIComponent(args.sort as string)}`;
    return this.request('GET', url);
  }

  private async getAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args.account_id as string;
    if (!accountId) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.request('GET', `/Accounts/${encodeURIComponent(accountId)}`);
  }

  private async addAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    const address = args.address as string;
    const userName = args.user_name as string;
    const platformId = args.platform_id as string;
    const safeName = args.safe_name as string;
    if (!name || !address || !userName || !platformId || !safeName) {
      return { content: [{ type: 'text', text: 'name, address, user_name, platform_id, and safe_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = { name, address, userName, platformId, safeName };
    if (args.secret_type) body.secretType = args.secret_type;
    if (args.secret) body.secret = args.secret;
    return this.request('POST', '/Accounts', body);
  }

  private async updateAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args.account_id as string;
    const operations = args.operations as unknown[];
    if (!accountId || !operations) return { content: [{ type: 'text', text: 'account_id and operations are required' }], isError: true };
    return this.request('PATCH', `/Accounts/${encodeURIComponent(accountId)}`, operations);
  }

  private async deleteAccount(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args.account_id as string;
    if (!accountId) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.request('DELETE', `/Accounts/${encodeURIComponent(accountId)}`);
  }

  private async retrieveCredential(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args.account_id as string;
    if (!accountId) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.reason) body.reason = args.reason;
    if (args.ticket_id) body.TicketId = args.ticket_id;
    return this.request('POST', `/Accounts/${encodeURIComponent(accountId)}/Password/Retrieve`, body);
  }

  private async changeCredential(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args.account_id as string;
    if (!accountId) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.request('POST', `/Accounts/${encodeURIComponent(accountId)}/Change`, {});
  }

  private async verifyCredential(args: Record<string, unknown>): Promise<ToolResult> {
    const accountId = args.account_id as string;
    if (!accountId) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    return this.request('POST', `/Accounts/${encodeURIComponent(accountId)}/Verify`, {});
  }

  private async listSafes(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    let url = `/Safes?limit=${limit}&offset=${offset}`;
    if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;
    if (args.sort) url += `&sort=${encodeURIComponent(args.sort as string)}`;
    return this.request('GET', url);
  }

  private async getSafe(args: Record<string, unknown>): Promise<ToolResult> {
    const safeName = args.safe_name as string;
    if (!safeName) return { content: [{ type: 'text', text: 'safe_name is required' }], isError: true };
    return this.request('GET', `/Safes/${encodeURIComponent(safeName)}`);
  }

  private async addSafe(args: Record<string, unknown>): Promise<ToolResult> {
    const safeName = args.safe_name as string;
    if (!safeName) return { content: [{ type: 'text', text: 'safe_name is required' }], isError: true };
    const body: Record<string, unknown> = { SafeName: safeName };
    if (args.description) body.Description = args.description;
    if (args.cpm_name) body.ManagingCPM = args.cpm_name;
    if (args.number_of_versions_retention) body.NumberOfVersionsRetention = args.number_of_versions_retention;
    if (args.number_of_days_retention) body.NumberOfDaysRetention = args.number_of_days_retention;
    return this.request('POST', '/Safes', body);
  }

  private async updateSafe(args: Record<string, unknown>): Promise<ToolResult> {
    const safeName = args.safe_name as string;
    if (!safeName) return { content: [{ type: 'text', text: 'safe_name is required' }], isError: true };
    const body: Record<string, unknown> = { SafeName: safeName };
    if (args.description) body.Description = args.description;
    if (args.cpm_name) body.ManagingCPM = args.cpm_name;
    if (args.number_of_versions_retention) body.NumberOfVersionsRetention = args.number_of_versions_retention;
    return this.request('PUT', `/Safes/${encodeURIComponent(safeName)}`, body);
  }

  private async listSafeMembers(args: Record<string, unknown>): Promise<ToolResult> {
    const safeName = args.safe_name as string;
    if (!safeName) return { content: [{ type: 'text', text: 'safe_name is required' }], isError: true };
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    return this.request('GET', `/Safes/${encodeURIComponent(safeName)}/Members?limit=${limit}&offset=${offset}`);
  }

  private async addSafeMember(args: Record<string, unknown>): Promise<ToolResult> {
    const safeName = args.safe_name as string;
    const memberName = args.member_name as string;
    if (!safeName || !memberName) return { content: [{ type: 'text', text: 'safe_name and member_name are required' }], isError: true };
    const body: Record<string, unknown> = {
      MemberName: memberName,
      MemberType: (args.member_type as string) ?? 'User',
    };
    if (args.permissions) body.Permissions = args.permissions;
    return this.request('POST', `/Safes/${encodeURIComponent(safeName)}/Members`, body);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    let url = `/Users?limit=${limit}&offset=${offset}`;
    if (args.search) url += `&search=${encodeURIComponent(args.search as string)}`;
    if (args.user_type) url += `&userType=${encodeURIComponent(args.user_type as string)}`;
    if (args.include_component_users !== undefined) {
      url += `&componentUser=${encodeURIComponent(args.include_component_users as string)}`;
    }
    return this.request('GET', url);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    const userId = args.user_id as number;
    if (userId === undefined || userId === null) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.request('GET', `/Users/${encodeURIComponent(String(userId))}`);
  }

  private async listPlatforms(args: Record<string, unknown>): Promise<ToolResult> {
    let url = '/Platforms?';
    if (args.search) url += `search=${encodeURIComponent(args.search as string)}&`;
    if (args.active !== undefined) url += `Active=${encodeURIComponent(args.active as string)}&`;
    return this.request('GET', url.replace(/[?&]$/, ''));
  }

  private async getPlatform(args: Record<string, unknown>): Promise<ToolResult> {
    const platformId = args.platform_id as string;
    if (!platformId) return { content: [{ type: 'text', text: 'platform_id is required' }], isError: true };
    return this.request('GET', `/Platforms/${encodeURIComponent(platformId)}`);
  }

  private async listPendingRequests(args: Record<string, unknown>): Promise<ToolResult> {
    const filter = (args.filter as string) ?? 'IncomingRequests';
    // IncomingRequests are requests awaiting the current user's approval; MyRequests are the user's own requests
    let url = '/IncomingRequests';
    if (filter === 'MyRequests') {
      url = '/MyRequests';
    }
    return this.request('GET', url);
  }

  private async confirmRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const requestId = args.request_id as string;
    if (!requestId) return { content: [{ type: 'text', text: 'request_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.reason) body.Reason = args.reason;
    return this.request('POST', `/IncomingRequests/${encodeURIComponent(requestId)}/confirm`, body);
  }

  private async rejectRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const requestId = args.request_id as string;
    if (!requestId) return { content: [{ type: 'text', text: 'request_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.reason) body.Reason = args.reason;
    return this.request('POST', `/IncomingRequests/${encodeURIComponent(requestId)}/reject`, body);
  }

  private async getSessionRecordings(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) ?? 50;
    const offset = (args.offset as number) ?? 0;
    let url = `/Recordings?limit=${limit}&offset=${offset}`;
    if (args.account_id) url += `&AccountID=${encodeURIComponent(args.account_id as string)}`;
    if (args.user_name) url += `&UserName=${encodeURIComponent(args.user_name as string)}`;
    if (args.safe_name) url += `&SafeName=${encodeURIComponent(args.safe_name as string)}`;
    if (args.from_time) url += `&FromTime=${encodeURIComponent(args.from_time as string)}`;
    if (args.to_time) url += `&ToTime=${encodeURIComponent(args.to_time as string)}`;
    return this.request('GET', url);
  }

  private async getRecordingActivities(args: Record<string, unknown>): Promise<ToolResult> {
    const recordingId = args.recording_id as string;
    if (!recordingId) return { content: [{ type: 'text', text: 'recording_id is required' }], isError: true };
    return this.request('GET', `/Recordings/${encodeURIComponent(recordingId)}/activities`);
  }
}
