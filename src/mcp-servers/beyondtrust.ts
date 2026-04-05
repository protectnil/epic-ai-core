/**
 * BeyondTrust Password Safe MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — BeyondTrust has private "preview" MCP servers for
//   Remote Support and Password Safe (community.beyondtrust.com, authenticated users only), but
//   no publicly available MCP server on GitHub or npmjs.com. The preview requires BeyondTrust
//   account login and is not open to the public; it does not meet the "official published" criterion.
//   transport: N/A, auth: N/A
// Our adapter covers: 17 tools. Vendor MCP covers: unknown (preview, not accessible).
// Recommendation: use-rest-api — no public MCP server available. Use this REST wrapper.
//
// Base URL: https://{host}/BeyondTrust/api/public/v3  (on-premises or cloud)
// Auth: PS-Auth header — API key + RunAs username + password (in square brackets).
//       Format: PS-Auth key={apiKey}; runas={username}; pwd=[{password}];
//       Authenticate with POST /Auth/SignAppIn; the response sets an ASP.NET_SessionId cookie
//       that must be passed on all subsequent requests. Always call POST /Auth/Signout when done.
// Docs: https://docs.beyondtrust.com/bips/docs/welcome-to-password-safe
//       https://docs.beyondtrust.com/bips/reference
//       https://docs.beyondtrust.com/bips/v24.3/docs/password-safe-api
// Rate limits: Not publicly documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BeyondTrustConfig {
  /** API registration key from BeyondInsight */
  apiKey: string;
  /** RunAs username — a BeyondInsight user granted permission to use this API key */
  username: string;
  /** RunAs user password */
  password: string;
  /** Full base URL including host, e.g. "https://ps.example.com/BeyondTrust/api/public/v3" */
  baseUrl: string;
}

export class BeyondTrustMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor(config: BeyondTrustConfig) {
    super();
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl;
  }

  private psAuthHeader(): string {
    return `PS-Auth key=${this.apiKey}; runas=${this.username}; pwd=[${this.password}];`;
  }

  private async signIn(): Promise<string> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/Auth/SignAppIn`, {
      method: 'POST',
      headers: { Authorization: this.psAuthHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(null),
    });
    if (!response.ok) {
      throw new Error(`PS-Auth sign-in failed: ${response.status} ${response.statusText}`);
    }
    const setCookie = response.headers.get('set-cookie') ?? '';
    const match = setCookie.match(/ASP\.NET_SessionId=([^;]+)/);
    if (!match) {
      throw new Error('PS-Auth sign-in succeeded but ASP.NET_SessionId cookie not found in response');
    }
    return match[1];
  }

  private async signOut(sessionId: string): Promise<void> {
    await this.fetchWithRetry(`${this.baseUrl}/Auth/Signout`, {
      method: 'POST',
      headers: { Authorization: this.psAuthHeader(), 'Content-Type': 'application/json', Cookie: `ASP.NET_SessionId=${sessionId}` },
      body: JSON.stringify(null),
    }).catch(() => { /* best-effort sign-out */ });
  }

  private makeHeaders(sessionId: string): Record<string, string> {
    return {
      Authorization: this.psAuthHeader(),
      'Content-Type': 'application/json',
      Cookie: `ASP.NET_SessionId=${sessionId}`,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_managed_systems',
        description: 'List managed systems (servers, databases, network devices) registered in Password Safe with optional name filter.',
        inputSchema: {
          type: 'object',
          properties: {
            system_name: { type: 'string', description: 'Filter by system name (partial match, optional)' },
            limit: { type: 'number', description: 'Maximum systems to return (default: 100)' },
            offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_managed_system',
        description: 'Get detailed configuration for a specific managed system by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            system_id: { type: 'number', description: 'Managed system ID' },
          },
          required: ['system_id'],
        },
      },
      {
        name: 'list_managed_accounts',
        description: 'List managed accounts (credentials) in Password Safe, optionally filtered by system name or account name.',
        inputSchema: {
          type: 'object',
          properties: {
            system_name: { type: 'string', description: 'Filter by managed system name (optional)' },
            account_name: { type: 'string', description: 'Filter by account name (optional)' },
            limit: { type: 'number', description: 'Maximum accounts to return (default: 100)' },
            offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_managed_account',
        description: 'Get details of a specific managed account by its ID including system association and account type.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'number', description: 'Managed account ID' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'create_credential_request',
        description: 'Submit a credential access request for a managed account. Returns a request ID for use with retrieve_credential and checkin_request.',
        inputSchema: {
          type: 'object',
          properties: {
            system_id: { type: 'number', description: 'Managed system ID' },
            account_id: { type: 'number', description: 'Managed account ID' },
            duration_minutes: { type: 'number', description: 'Requested checkout duration in minutes (default: 60, max: per policy)' },
            reason: { type: 'string', description: 'Reason for the credential access request' },
            access_type: {
              type: 'string',
              description: 'Access type: View (retrieve password) or RDP, SSH, App for session access (default: View)',
            },
          },
          required: ['system_id', 'account_id'],
        },
      },
      {
        name: 'retrieve_credential',
        description: 'Retrieve the plaintext credential (password) for an approved credential request by request ID.',
        inputSchema: {
          type: 'object',
          properties: {
            request_id: { type: 'number', description: 'Credential request ID from create_credential_request' },
          },
          required: ['request_id'],
        },
      },
      {
        name: 'checkin_request',
        description: 'Check in (release) a credential request by ID, optionally specifying a reason. This releases the credential back to rotation.',
        inputSchema: {
          type: 'object',
          properties: {
            request_id: { type: 'number', description: 'Credential request ID to check in' },
            reason: { type: 'string', description: 'Optional reason for early check-in' },
          },
          required: ['request_id'],
        },
      },
      {
        name: 'list_requests',
        description: 'List credential access requests with optional filters for status, user, system, and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: pending, approved, denied, active, expired, checked-in (optional)' },
            user_name: { type: 'string', description: 'Filter by requesting username (optional)' },
            system_name: { type: 'string', description: 'Filter by managed system name (optional)' },
            start_date: { type: 'string', description: 'Filter by start date ISO 8601 (optional)' },
            end_date: { type: 'string', description: 'Filter by end date ISO 8601 (optional)' },
            limit: { type: 'number', description: 'Maximum requests to return (default: 100)' },
            offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_request',
        description: 'Get detailed information about a specific credential access request by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            request_id: { type: 'number', description: 'Request ID' },
          },
          required: ['request_id'],
        },
      },
      {
        name: 'approve_request',
        description: 'Approve a pending credential access request. Requires approver permissions in BeyondInsight.',
        inputSchema: {
          type: 'object',
          properties: {
            request_id: { type: 'number', description: 'Request ID to approve' },
            reason: { type: 'string', description: 'Optional reason for approval' },
          },
          required: ['request_id'],
        },
      },
      {
        name: 'deny_request',
        description: 'Deny a pending credential access request with an optional reason.',
        inputSchema: {
          type: 'object',
          properties: {
            request_id: { type: 'number', description: 'Request ID to deny' },
            reason: { type: 'string', description: 'Optional reason for denial' },
          },
          required: ['request_id'],
        },
      },
      {
        name: 'list_sessions',
        description: 'List privileged session recordings with optional filters for status, user, system, and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by session status: active, completed, failed, pending (optional)' },
            user_name: { type: 'string', description: 'Filter by username (optional)' },
            start_date: { type: 'string', description: 'Filter by start date ISO 8601 (optional)' },
            end_date: { type: 'string', description: 'Filter by end date ISO 8601 (optional)' },
            limit: { type: 'number', description: 'Maximum sessions to return (default: 100)' },
            offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_session',
        description: 'Get detailed information about a specific privileged session recording by session ID.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Session ID' },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'list_access_policies',
        description: 'List Password Safe access policies controlling credential checkout, session recording, and approval workflows.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum policies to return (default: 100)' },
            offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'list_users',
        description: 'List BeyondInsight users with optional filter by username or group membership.',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Filter by username (partial match, optional)' },
            group_id: { type: 'number', description: 'Filter by BeyondInsight group ID (optional)' },
            limit: { type: 'number', description: 'Maximum users to return (default: 100)' },
            offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'rotate_credential',
        description: 'Trigger an immediate password rotation for a managed account, generating a new credential per the account\'s password policy.',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: { type: 'number', description: 'Managed account ID to rotate' },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_password_policies',
        description: 'List password complexity and rotation policies configured in Password Safe.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum policies to return (default: 100)' },
            offset: { type: 'number', description: 'Offset for pagination (default: 0)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const sessionId = await this.signIn();
      try {
        switch (name) {
          case 'list_managed_systems': return await this.listManagedSystems(args, sessionId);
          case 'get_managed_system': return await this.getManagedSystem(args, sessionId);
          case 'list_managed_accounts': return await this.listManagedAccounts(args, sessionId);
          case 'get_managed_account': return await this.getManagedAccount(args, sessionId);
          case 'create_credential_request': return await this.createCredentialRequest(args, sessionId);
          case 'retrieve_credential': return await this.retrieveCredential(args, sessionId);
          case 'checkin_request': return await this.checkinRequest(args, sessionId);
          case 'list_requests': return await this.listRequests(args, sessionId);
          case 'get_request': return await this.getRequest(args, sessionId);
          case 'approve_request': return await this.approveRequest(args, sessionId);
          case 'deny_request': return await this.denyRequest(args, sessionId);
          case 'list_sessions': return await this.listSessions(args, sessionId);
          case 'get_session': return await this.getSession(args, sessionId);
          case 'list_access_policies': return await this.listAccessPolicies(args, sessionId);
          case 'list_users': return await this.listUsers(args, sessionId);
          case 'rotate_credential': return await this.rotateCredential(args, sessionId);
          case 'list_password_policies': return await this.listPasswordPolicies(args, sessionId);
          default:
            return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
        }
      } finally {
        await this.signOut(sessionId);
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async listManagedSystems(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    const limit = (args.limit as number) || 100;
    const offset = (args.offset as number) || 0;
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    if (args.system_name) params.set('systemName', String(args.system_name));
    const response = await this.fetchWithRetry(`${this.baseUrl}/ManagedSystems?${params.toString()}`, { method: 'GET', headers: this.makeHeaders(sessionId) });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list managed systems: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getManagedSystem(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    if (!args.system_id) return { content: [{ type: 'text', text: 'system_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/ManagedSystems/${encodeURIComponent(args.system_id as string)}`, { method: 'GET', headers: this.makeHeaders(sessionId) });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to get managed system: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listManagedAccounts(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) || 100));
    params.set('offset', String((args.offset as number) || 0));
    if (args.system_name) params.set('systemName', String(args.system_name));
    if (args.account_name) params.set('accountName', String(args.account_name));
    const response = await this.fetchWithRetry(`${this.baseUrl}/ManagedAccounts?${params.toString()}`, { method: 'GET', headers: this.makeHeaders(sessionId) });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list managed accounts: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getManagedAccount(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/ManagedAccounts/${encodeURIComponent(args.account_id as string)}`, { method: 'GET', headers: this.makeHeaders(sessionId) });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to get managed account: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async createCredentialRequest(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    if (!args.system_id || !args.account_id) {
      return { content: [{ type: 'text', text: 'system_id and account_id are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      SystemID: args.system_id,
      AccountID: args.account_id,
      DurationMinutes: (args.duration_minutes as number) || 60,
      AccessType: (args.access_type as string) || 'View',
    };
    if (args.reason) body.Reason = args.reason;
    const response = await this.fetchWithRetry(`${this.baseUrl}/Requests`, {
      method: 'POST',
      headers: this.makeHeaders(sessionId),
      body: JSON.stringify(body),
    });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to create request: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async retrieveCredential(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    if (!args.request_id) return { content: [{ type: 'text', text: 'request_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/Credentials/${encodeURIComponent(args.request_id as string)}`, { method: 'GET', headers: this.makeHeaders(sessionId) });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to retrieve credential: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async checkinRequest(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    if (!args.request_id) return { content: [{ type: 'text', text: 'request_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.reason) body.Reason = args.reason;
    const response = await this.fetchWithRetry(`${this.baseUrl}/Requests/${encodeURIComponent(args.request_id as string)}/Checkin`, {
      method: 'PUT',
      headers: this.makeHeaders(sessionId),
      body: JSON.stringify(body),
    });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to check in request: ${response.status} ${response.statusText}` }], isError: true };
    return { content: [{ type: 'text', text: JSON.stringify({ checked_in: true, request_id: args.request_id }) }], isError: false };
  }

  private async listRequests(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) || 100));
    params.set('offset', String((args.offset as number) || 0));
    if (args.status) params.set('status', String(args.status));
    if (args.user_name) params.set('userName', String(args.user_name));
    if (args.system_name) params.set('systemName', String(args.system_name));
    if (args.start_date) params.set('startDate', String(args.start_date));
    if (args.end_date) params.set('endDate', String(args.end_date));
    const response = await this.fetchWithRetry(`${this.baseUrl}/Requests?${params.toString()}`, { method: 'GET', headers: this.makeHeaders(sessionId) });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list requests: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getRequest(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    if (!args.request_id) return { content: [{ type: 'text', text: 'request_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/Requests/${encodeURIComponent(args.request_id as string)}`, { method: 'GET', headers: this.makeHeaders(sessionId) });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to get request: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async approveRequest(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    if (!args.request_id) return { content: [{ type: 'text', text: 'request_id is required' }], isError: true };
    const body: Record<string, unknown> = { Status: 'Approved' };
    if (args.reason) body.Reason = args.reason;
    const response = await this.fetchWithRetry(`${this.baseUrl}/Requests/${encodeURIComponent(args.request_id as string)}`, {
      method: 'PUT',
      headers: this.makeHeaders(sessionId),
      body: JSON.stringify(body),
    });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to approve request: ${response.status} ${response.statusText}` }], isError: true };
    return { content: [{ type: 'text', text: JSON.stringify({ approved: true, request_id: args.request_id }) }], isError: false };
  }

  private async denyRequest(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    if (!args.request_id) return { content: [{ type: 'text', text: 'request_id is required' }], isError: true };
    const body: Record<string, unknown> = { Status: 'Denied' };
    if (args.reason) body.Reason = args.reason;
    const response = await this.fetchWithRetry(`${this.baseUrl}/Requests/${encodeURIComponent(args.request_id as string)}`, {
      method: 'PUT',
      headers: this.makeHeaders(sessionId),
      body: JSON.stringify(body),
    });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to deny request: ${response.status} ${response.statusText}` }], isError: true };
    return { content: [{ type: 'text', text: JSON.stringify({ denied: true, request_id: args.request_id }) }], isError: false };
  }

  private async listSessions(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) || 100));
    params.set('offset', String((args.offset as number) || 0));
    if (args.status) params.set('status', String(args.status));
    if (args.user_name) params.set('userName', String(args.user_name));
    if (args.start_date) params.set('startDate', String(args.start_date));
    if (args.end_date) params.set('endDate', String(args.end_date));
    const response = await this.fetchWithRetry(`${this.baseUrl}/Sessions?${params.toString()}`, { method: 'GET', headers: this.makeHeaders(sessionId) });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list sessions: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async getSession(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/Sessions/${encodeURIComponent(String(args.session_id))}`,
      { method: 'GET', headers: this.makeHeaders(sessionId) },
    );
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to get session: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listAccessPolicies(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) || 100));
    params.set('offset', String((args.offset as number) || 0));
    const response = await this.fetchWithRetry(`${this.baseUrl}/AccessPolicies?${params.toString()}`, { method: 'GET', headers: this.makeHeaders(sessionId) });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list access policies: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listUsers(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) || 100));
    params.set('offset', String((args.offset as number) || 0));
    if (args.username) params.set('username', String(args.username));
    if (args.group_id) params.set('groupId', String(args.group_id));
    const response = await this.fetchWithRetry(`${this.baseUrl}/Users?${params.toString()}`, { method: 'GET', headers: this.makeHeaders(sessionId) });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list users: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async rotateCredential(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    if (!args.account_id) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/ManagedAccounts/${encodeURIComponent(args.account_id as string)}/Credentials/Change`, {
      method: 'POST',
      headers: this.makeHeaders(sessionId),
      body: JSON.stringify(null),
    });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to rotate credential: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json().catch(() => ({ rotated: true, account_id: args.account_id }));
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listPasswordPolicies(args: Record<string, unknown>, sessionId: string): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) || 100));
    params.set('offset', String((args.offset as number) || 0));
    const response = await this.fetchWithRetry(`${this.baseUrl}/PasswordPolicies?${params.toString()}`, { method: 'GET', headers: this.makeHeaders(sessionId) });
    if (!response.ok) return { content: [{ type: 'text', text: `Failed to list password policies: ${response.status} ${response.statusText}` }], isError: true };
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  static catalog() {
    return {
      name: 'beyondtrust',
      displayName: 'BeyondTrust Password Safe',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: ['beyondtrust', 'pam', 'privileged-access', 'password-safe', 'credential-management', 'zero-trust', 'session-recording', 'least-privilege'],
      toolNames: [
        'list_managed_systems', 'get_managed_system', 'list_managed_accounts', 'get_managed_account',
        'create_credential_request', 'retrieve_credential', 'checkin_request',
        'list_requests', 'get_request', 'approve_request', 'deny_request',
        'list_sessions', 'get_session', 'list_access_policies',
        'list_users', 'rotate_credential', 'list_password_policies',
      ],
      description: 'Privileged Access Management: credential requests, check-out/check-in, session recording, approval workflows, and managed account rotation.',
      author: 'protectnil' as const,
    };
  }
}
