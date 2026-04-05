/**
 * NPR Authorization MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official NPR MCP server was found on GitHub. We build a full REST wrapper
// covering the NPR OAuth2 authorization service endpoints.
//
// Base URL: https://authorization.api.npr.org
// Auth: OAuth2 — this adapter IS the OAuth2 server interface.
//   Endpoints handle device code flow, token creation, and token revocation.
// Docs: https://dev.npr.org/guide/services/authorization/
// Rate limits: Not publicly documented; production use requires NPR API key

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NprAuthorizationConfig {
  baseUrl?: string; // default: https://authorization.api.npr.org
}

export class NprAuthorizationMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: NprAuthorizationConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://authorization.api.npr.org';
  }

  static catalog() {
    return {
      name: 'npr-authorization',
      displayName: 'NPR Authorization',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'npr', 'national public radio', 'oauth2', 'authorization', 'authentication',
        'media', 'public radio', 'token', 'access token', 'refresh token',
        'device code', 'login', 'auth', 'api key', 'oauth',
      ],
      toolNames: [
        'generate_device_code',
        'create_token',
        'revoke_token',
      ],
      description: 'NPR Authorization Service: OAuth2 device code flow initiation, access token creation (authorization code, password, client credentials, refresh), and token revocation.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'generate_device_code',
        description: 'Initiate an OAuth2 device authorization flow for limited-input devices (smart TVs, set-top boxes, etc.). Returns a device_code, user_code, and verification_uri the user visits to authorize.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'The NPR API client ID for your application',
            },
            client_secret: {
              type: 'string',
              description: 'The NPR API client secret for your application',
            },
            scope: {
              type: 'string',
              description: 'Space-separated list of OAuth2 scopes to request (e.g. "identity.readonly identity.write listening.readonly")',
            },
          },
          required: ['client_id', 'client_secret'],
        },
      },
      {
        name: 'create_token',
        description: 'Create a new NPR OAuth2 access token. Supports grant types: authorization_code, device_code, password, client_credentials, refresh_token.',
        inputSchema: {
          type: 'object',
          properties: {
            grant_type: {
              type: 'string',
              description: 'OAuth2 grant type: "authorization_code", "device_code", "password", "client_credentials", or "refresh_token"',
            },
            client_id: {
              type: 'string',
              description: 'The NPR API client ID for your application',
            },
            client_secret: {
              type: 'string',
              description: 'The NPR API client secret for your application',
            },
            code: {
              type: 'string',
              description: 'Authorization code (required for grant_type=authorization_code)',
            },
            redirect_uri: {
              type: 'string',
              description: 'Redirect URI that was used in the authorization request (required for grant_type=authorization_code)',
            },
            username: {
              type: 'string',
              description: 'NPR account username/email (required for grant_type=password)',
            },
            password: {
              type: 'string',
              description: 'NPR account password (required for grant_type=password)',
            },
            service: {
              type: 'string',
              description: 'Third-party auth service name when using social login via password flow (e.g. "facebook")',
            },
            refresh_token: {
              type: 'string',
              description: 'The refresh token to exchange for a new access token (required for grant_type=refresh_token)',
            },
            scope: {
              type: 'string',
              description: 'Space-separated list of OAuth2 scopes to request',
            },
            token_type_hint: {
              type: 'string',
              description: 'Hint about the token type being submitted (e.g. "access_token" or "refresh_token")',
            },
          },
          required: ['grant_type', 'client_id', 'client_secret'],
        },
      },
      {
        name: 'revoke_token',
        description: 'Revoke an existing NPR OAuth2 access or refresh token, invalidating it immediately.',
        inputSchema: {
          type: 'object',
          properties: {
            authorization: {
              type: 'string',
              description: 'Authorization header value in the format "Bearer <access_token>" — the token that authorizes this revocation request',
            },
            token: {
              type: 'string',
              description: 'The token string to revoke (access token or refresh token)',
            },
            token_type_hint: {
              type: 'string',
              description: 'Hint about the token type: "access_token" or "refresh_token"',
            },
          },
          required: ['authorization', 'token'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'generate_device_code': return this.generateDeviceCode(args);
        case 'create_token':         return this.createToken(args);
        case 'revoke_token':         return this.revokeToken(args);
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

  private async postForm(path: string, body: Record<string, string>, headers: Record<string, string> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        ...headers,
      },
      body: new URLSearchParams(body).toString(),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ───────────────────────────────────────────────────

  private async generateDeviceCode(args: Record<string, unknown>): Promise<ToolResult> {
    const client_id = args['client_id'] as string | undefined;
    const client_secret = args['client_secret'] as string | undefined;
    if (!client_id || !client_secret) {
      return { content: [{ type: 'text', text: 'client_id and client_secret are required' }], isError: true };
    }
    const body: Record<string, string> = { client_id, client_secret };
    if (args['scope']) body['scope'] = String(args['scope']);
    return this.postForm('/v2/device', body);
  }

  private async createToken(args: Record<string, unknown>): Promise<ToolResult> {
    const grant_type  = args['grant_type']  as string | undefined;
    const client_id   = args['client_id']   as string | undefined;
    const client_secret = args['client_secret'] as string | undefined;
    if (!grant_type || !client_id || !client_secret) {
      return { content: [{ type: 'text', text: 'grant_type, client_id, and client_secret are required' }], isError: true };
    }
    const body: Record<string, string> = { grant_type, client_id, client_secret };
    const optionals = ['code', 'redirect_uri', 'username', 'password', 'service', 'refresh_token', 'scope', 'token_type_hint'] as const;
    for (const key of optionals) {
      if (args[key]) body[key] = String(args[key]);
    }
    return this.postForm('/v2/token', body);
  }

  private async revokeToken(args: Record<string, unknown>): Promise<ToolResult> {
    const authorization = args['authorization'] as string | undefined;
    const token = args['token'] as string | undefined;
    if (!authorization || !token) {
      return { content: [{ type: 'text', text: 'authorization and token are required' }], isError: true };
    }
    const body: Record<string, string> = { token };
    if (args['token_type_hint']) body['token_type_hint'] = String(args['token_type_hint']);
    return this.postForm('/v2/token/revoke', body, { Authorization: authorization });
  }
}
