/**
 * Stytch MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.stytch.dev/mcp — transport: streamable-HTTP, auth: OAuth2 (Stytch workspace OAuth)
// Vendor MCP covers: 7 tools (workspace management: listProjects, createSecret, createPublicToken,
//   updateConsumerSDKConfig, getProject, listEnvironments, etc. — manages the Stytch dashboard/workspace,
//   NOT the consumer authentication API surface this adapter covers).
// MCP DECISION: use-rest-api. The official Stytch MCP server exists but covers Stytch workspace
//   configuration (project management, secrets, SDK config) — not the consumer auth endpoints
//   (users, magic links, OTPs, sessions) that this adapter implements. The MCP has 7 tools and
//   covers a fully non-overlapping API surface. This adapter is the only integration for consumer
//   auth operations. Fails MCP criteria: exposes <10 tools, covers different API surface.
//
// Base URL: https://api.stytch.com/v1
// Auth: HTTP Basic auth — project_id as username, secret as password (base64 encoded)
// Docs: https://stytch.com/docs/api
// Rate limits: Not publicly documented; contact Stytch support for rate limit details

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface StytchConfig {
  projectId: string;
  secret: string;
  baseUrl?: string;
}

export class StytchMCPServer extends MCPAdapterBase {
  private readonly projectId: string;
  private readonly secret: string;
  private readonly baseUrl: string;

  constructor(config: StytchConfig) {
    super();
    this.projectId = config.projectId;
    this.secret = config.secret;
    this.baseUrl = config.baseUrl || 'https://api.stytch.com/v1';
  }

  static catalog() {
    return {
      name: 'stytch',
      displayName: 'Stytch',
      version: '1.0.0',
      category: 'identity',
      keywords: [
        'stytch', 'authentication', 'auth', 'magic links', 'otp', 'one-time passcode',
        'sessions', 'users', 'passkeys', 'webauthn', 'oauth', 'passwordless', 'identity',
      ],
      toolNames: [
        'list_users', 'get_user', 'create_user', 'update_user', 'delete_user', 'search_users',
        'send_magic_link', 'authenticate_magic_link',
        'send_otp_email', 'send_otp_sms', 'authenticate_otp',
        'get_session', 'list_sessions', 'authenticate_session', 'revoke_session',
        'get_jwks',
      ],
      description: 'Stytch authentication platform: manage users, send and authenticate magic links and OTPs, and validate sessions for passwordless auth flows.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List users in the Stytch project with optional pagination cursor and result limit',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 100, max: 1000)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response for fetching the next page',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Retrieve full profile details for a Stytch user by their user ID including emails, phone numbers, and auth factors',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Stytch user ID (format: user-test-* or user-live-*)',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'create_user',
        description: 'Create a new Stytch user with an email address and optional name attributes',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address for the new user',
            },
            name: {
              type: 'object',
              description: 'Optional name object with first_name, middle_name, last_name fields',
            },
            phone_number: {
              type: 'string',
              description: 'Optional E.164 formatted phone number (e.g. +14155550123)',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'update_user',
        description: 'Update an existing Stytch user profile attributes such as name by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Stytch user ID to update',
            },
            name: {
              type: 'object',
              description: 'Name object with first_name, middle_name, last_name fields to update',
            },
            trusted_metadata: {
              type: 'object',
              description: 'Server-managed metadata key-value map for the user',
            },
            untrusted_metadata: {
              type: 'object',
              description: 'Client-managed metadata key-value map for the user',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'delete_user',
        description: 'Permanently delete a Stytch user and all associated authentication factors by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Stytch user ID to delete',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'search_users',
        description: 'Search for Stytch users by email address, phone number, or other attributes using filter operators',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'object',
              description: 'Search query object with operator (AND/OR) and operands (e.g. {"operator":"AND","operands":[{"filter_name":"email_address","filter_value":["user@example.com"]}]})',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from previous response',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'send_magic_link',
        description: 'Send a magic link email to a user for passwordless authentication — the link contains a one-time token',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to send the magic link to',
            },
            magic_link_url: {
              type: 'string',
              description: 'Callback URL where the magic link token will be appended (must be whitelisted in Stytch dashboard)',
            },
            expiration_minutes: {
              type: 'number',
              description: 'Token expiration time in minutes (default: 60, max: 1440)',
            },
            session_duration_minutes: {
              type: 'number',
              description: 'If set, creates a session of this duration after authentication (min: 5, max: 527040)',
            },
          },
          required: ['email', 'magic_link_url'],
        },
      },
      {
        name: 'authenticate_magic_link',
        description: 'Authenticate a magic link token from the callback URL to verify a user and optionally create a session',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Magic link token extracted from the callback URL query parameter',
            },
            session_duration_minutes: {
              type: 'number',
              description: 'Session duration in minutes to create on successful authentication (min: 5)',
            },
            session_token: {
              type: 'string',
              description: 'Existing session token to extend instead of creating a new session',
            },
          },
          required: ['token'],
        },
      },
      {
        name: 'send_otp_email',
        description: 'Send a one-time passcode (OTP) to a user via email for authentication',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Email address to send the OTP to',
            },
            expiration_minutes: {
              type: 'number',
              description: 'OTP expiration time in minutes (default: 10)',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'send_otp_sms',
        description: 'Send a one-time passcode (OTP) via SMS to a phone number for authentication',
        inputSchema: {
          type: 'object',
          properties: {
            phone_number: {
              type: 'string',
              description: 'E.164 formatted phone number to send OTP to (e.g. +14155550123)',
            },
            expiration_minutes: {
              type: 'number',
              description: 'OTP expiration time in minutes (default: 10)',
            },
          },
          required: ['phone_number'],
        },
      },
      {
        name: 'authenticate_otp',
        description: 'Authenticate a one-time passcode entered by the user — works for both email and SMS OTPs',
        inputSchema: {
          type: 'object',
          properties: {
            method_id: {
              type: 'string',
              description: 'The email_id or phone_id returned by the send OTP response',
            },
            code: {
              type: 'string',
              description: 'The 6-digit OTP code entered by the user',
            },
            session_duration_minutes: {
              type: 'number',
              description: 'Session duration in minutes on successful authentication (min: 5)',
            },
          },
          required: ['method_id', 'code'],
        },
      },
      {
        name: 'get_session',
        description: 'Get details for an active Stytch session by session token or session JWT',
        inputSchema: {
          type: 'object',
          properties: {
            session_token: {
              type: 'string',
              description: 'Opaque session token from authentication response',
            },
            session_jwt: {
              type: 'string',
              description: 'Session JWT from authentication response (short-lived, 5-minute lifetime)',
            },
          },
        },
      },
      {
        name: 'list_sessions',
        description: 'List all active sessions for a specific Stytch user by user ID',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Stytch user ID to list sessions for',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'authenticate_session',
        description: 'Validate an active session token or JWT and return the session and user details — also refreshes the session JWT',
        inputSchema: {
          type: 'object',
          properties: {
            session_token: {
              type: 'string',
              description: 'Opaque session token to validate',
            },
            session_jwt: {
              type: 'string',
              description: 'Session JWT to validate',
            },
            session_duration_minutes: {
              type: 'number',
              description: 'Extend session by this many minutes from now (min: 5)',
            },
          },
        },
      },
      {
        name: 'revoke_session',
        description: 'Immediately revoke a Stytch session by session ID — the user will be logged out',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Session ID to revoke (format: session-test-* or session-live-*)',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'get_jwks',
        description: 'Retrieve the JSON Web Key Set (JWKS) for the Stytch project to verify session JWTs locally',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project ID to retrieve JWKS for (defaults to the configured project)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_users': return this.listUsers(args);
        case 'get_user': return this.getUser(args);
        case 'create_user': return this.createUser(args);
        case 'update_user': return this.updateUser(args);
        case 'delete_user': return this.deleteUser(args);
        case 'search_users': return this.searchUsers(args);
        case 'send_magic_link': return this.sendMagicLink(args);
        case 'authenticate_magic_link': return this.authenticateMagicLink(args);
        case 'send_otp_email': return this.sendOtpEmail(args);
        case 'send_otp_sms': return this.sendOtpSms(args);
        case 'authenticate_otp': return this.authenticateOtp(args);
        case 'get_session': return this.getSession(args);
        case 'list_sessions': return this.listSessions(args);
        case 'authenticate_session': return this.authenticateSession(args);
        case 'revoke_session': return this.revokeSession(args);
        case 'get_jwks': return this.getJwks(args);
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

  private get authHeader(): string {
    return `Basic ${btoa(`${this.projectId}:${this.secret}`)}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
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

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    // Stytch has no GET /users list endpoint. List is done via POST /v1/users/search
    // with an empty query (returns all users). Pagination via cursor and limit in body.
    const body: Record<string, unknown> = { query: {} };
    if (args.limit) body.limit = args.limit;
    if (args.cursor) body.cursor = args.cursor;
    return this.apiPost('/users/search', body);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async createUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const body: Record<string, unknown> = { email: args.email };
    if (args.name) body.name = args.name;
    if (args.phone_number) body.phone_number = args.phone_number;
    return this.apiPost('/users', body);
  }

  private async updateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.trusted_metadata) body.trusted_metadata = args.trusted_metadata;
    if (args.untrusted_metadata) body.untrusted_metadata = args.untrusted_metadata;
    return this.apiPut(`/users/${encodeURIComponent(args.user_id as string)}`, body);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiDelete(`/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async searchUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const body: Record<string, unknown> = { query: args.query };
    if (args.limit) body.limit = args.limit;
    if (args.cursor) body.cursor = args.cursor;
    return this.apiPost('/users/search', body);
  }

  private async sendMagicLink(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.magic_link_url) return { content: [{ type: 'text', text: 'email and magic_link_url are required' }], isError: true };
    const body: Record<string, unknown> = {
      email: args.email,
      magic_link_url: args.magic_link_url,
    };
    if (args.expiration_minutes) body.expiration_minutes = args.expiration_minutes;
    if (args.session_duration_minutes) body.session_duration_minutes = args.session_duration_minutes;
    return this.apiPost('/magic_links/email/send', body);
  }

  private async authenticateMagicLink(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.token) return { content: [{ type: 'text', text: 'token is required' }], isError: true };
    const body: Record<string, unknown> = { token: args.token };
    if (args.session_duration_minutes) body.session_duration_minutes = args.session_duration_minutes;
    if (args.session_token) body.session_token = args.session_token;
    return this.apiPost('/magic_links/authenticate', body);
  }

  private async sendOtpEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    const body: Record<string, unknown> = { email: args.email };
    if (args.expiration_minutes) body.expiration_minutes = args.expiration_minutes;
    return this.apiPost('/otps/email/send', body);
  }

  private async sendOtpSms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.phone_number) return { content: [{ type: 'text', text: 'phone_number is required' }], isError: true };
    const body: Record<string, unknown> = { phone_number: args.phone_number };
    if (args.expiration_minutes) body.expiration_minutes = args.expiration_minutes;
    return this.apiPost('/otps/sms/send', body);
  }

  private async authenticateOtp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.method_id || !args.code) return { content: [{ type: 'text', text: 'method_id and code are required' }], isError: true };
    const body: Record<string, unknown> = { method_id: args.method_id, code: args.code };
    if (args.session_duration_minutes) body.session_duration_minutes = args.session_duration_minutes;
    return this.apiPost('/otps/authenticate', body);
  }

  private async getSession(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.session_token) params.session_token = args.session_token as string;
    if (args.session_jwt) params.session_jwt = args.session_jwt as string;
    return this.apiGet('/sessions', params);
  }

  private async listSessions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.apiGet('/sessions', { user_id: args.user_id as string });
  }

  private async authenticateSession(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.session_token) body.session_token = args.session_token;
    if (args.session_jwt) body.session_jwt = args.session_jwt;
    if (args.session_duration_minutes) body.session_duration_minutes = args.session_duration_minutes;
    return this.apiPost('/sessions/authenticate', body);
  }

  private async revokeSession(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.session_id) return { content: [{ type: 'text', text: 'session_id is required' }], isError: true };
    return this.apiPost('/sessions/revoke', { session_id: args.session_id });
  }

  private async getJwks(args: Record<string, unknown>): Promise<ToolResult> {
    const projectId = (args.project_id as string) || this.projectId;
    return this.apiGet(`/sessions/jwks/${projectId}`);
  }
}
