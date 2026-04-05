/**
 * Authentiq Connect MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Authentiq MCP server was found on GitHub.
// We build a REST wrapper covering OAuth2/OIDC authorization, token exchange,
// client registration/management, and user profile retrieval.
//
// Base URL: https://connect.authentiq.io
// Auth: Multiple schemes — client_registration_token (Authorization header) for client mgmt;
//       OAuth2 authorization_code / implicit / password / client_credentials for end-user flows
// Docs: https://developers.authentiq.com
// Rate limits: Not publicly documented; standard OAuth2 provider limits apply

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AuthentiqConfig {
  /** Bearer token for client registration/management (client_registration_token scheme) */
  registrationToken?: string;
  /** OAuth2 client_id for token/userinfo calls */
  clientId?: string;
  /** OAuth2 client_secret for confidential client flows */
  clientSecret?: string;
  baseUrl?: string;
}

export class AuthentiqMCPServer extends MCPAdapterBase {
  private readonly registrationToken: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  constructor(config: AuthentiqConfig) {
    super();
    this.registrationToken = config.registrationToken || '';
    this.clientId          = config.clientId || '';
    this.clientSecret      = config.clientSecret || '';
    this.baseUrl           = config.baseUrl || 'https://connect.authentiq.io';
  }

  static catalog() {
    return {
      name: 'authentiq',
      displayName: 'Authentiq Connect',
      version: '1.0.0',
      category: 'identity',
      keywords: [
        'authentiq', 'oauth2', 'oidc', 'openid connect', 'identity', 'authentication',
        'authorization', 'token', 'id token', 'access token', 'userinfo', 'sso',
        'client registration', 'oauth client', 'login', 'sign in', 'session',
        'jwt', 'bearer', 'scope', 'consent', 'profile', 'email', 'phone',
      ],
      toolNames: [
        'build_authorize_url',
        'exchange_token',
        'get_userinfo',
        'list_clients',
        'register_client',
        'get_client',
        'update_client',
        'delete_client',
        'get_session_iframe_url',
      ],
      description: 'Authentiq Connect OAuth 2.0 and OpenID Connect: build authorization URLs, exchange tokens, retrieve user profiles, and manage OAuth2 clients.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Authorization -------------------------------------------------------
      {
        name: 'build_authorize_url',
        description: 'Build an OAuth2/OIDC authorization URL for redirecting users to authenticate via Authentiq Connect',
        inputSchema: {
          type: 'object',
          properties: {
            client_id:     { type: 'string', description: 'Registered OAuth2 client ID' },
            response_type: { type: 'string', description: 'OAuth2 response type: code, token, or id_token (default: code)' },
            redirect_uri:  { type: 'string', description: 'Callback URL registered with the client' },
            scope:         { type: 'string', description: 'Space-separated scopes: oidc, email, phone, address, aq:name, aq:location, aq:push' },
            state:         { type: 'string', description: 'Opaque value to maintain state between request and callback (CSRF protection)' },
            nonce:         { type: 'string', description: 'String value to associate client session with ID Token (replay protection)' },
            display:       { type: 'string', description: 'How the authorization server displays the UI: page, popup, touch, or wap' },
            prompt:        { type: 'string', description: 'Space-delimited values: none, login, consent, select_account' },
            max_age:       { type: 'number', description: 'Maximum age in seconds of allowable authentication' },
            ui_locales:    { type: 'string', description: 'Preferred languages for the UI (space-separated BCP 47 tags)' },
            response_mode: { type: 'string', description: 'How the result is returned: query or fragment' },
          },
          required: ['client_id', 'response_type', 'redirect_uri'],
        },
      },
      // -- Token Exchange -------------------------------------------------------
      {
        name: 'exchange_token',
        description: 'Exchange an authorization code or credentials for an access token and ID token via the token endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            grant_type:    { type: 'string', description: 'OAuth2 grant type: authorization_code, client_credentials, or password' },
            code:          { type: 'string', description: 'Authorization code received from the authorization endpoint (for authorization_code grant)' },
            redirect_uri:  { type: 'string', description: 'Must match the redirect_uri used in the authorization request' },
            client_id:     { type: 'string', description: 'OAuth2 client ID (can be provided instead of Authorization header)' },
            client_secret: { type: 'string', description: 'OAuth2 client secret (can be provided instead of Authorization header)' },
            username:      { type: 'string', description: 'Resource owner username (for password grant)' },
            password:      { type: 'string', description: 'Resource owner password (for password grant)' },
            scope:         { type: 'string', description: 'Requested scopes (for client_credentials grant)' },
          },
          required: ['grant_type'],
        },
      },
      // -- User Info ------------------------------------------------------------
      {
        name: 'get_userinfo',
        description: 'Retrieve the authenticated user profile claims using a valid access token',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: { type: 'string', description: 'OAuth2 access token obtained from exchange_token' },
          },
          required: ['access_token'],
        },
      },
      // -- Client Management ---------------------------------------------------
      {
        name: 'list_clients',
        description: 'List all OAuth2 clients registered under this account (requires registration token)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'register_client',
        description: 'Register a new OAuth2 client application with Authentiq Connect',
        inputSchema: {
          type: 'object',
          properties: {
            client_name:      { type: 'string', description: 'Human-readable name for the client application' },
            redirect_uris:    { type: 'string', description: 'JSON array of allowed redirect URIs (e.g. ["https://app.example.com/callback"])' },
            grant_types:      { type: 'string', description: 'JSON array of grant types: authorization_code, implicit, client_credentials, password' },
            response_types:   { type: 'string', description: 'JSON array of response types: code, token, id_token' },
            scope:            { type: 'string', description: 'Space-separated default requested scopes' },
            token_endpoint_auth_method: { type: 'string', description: 'Client authentication method: client_secret_basic, client_secret_post, or none' },
            client_uri:       { type: 'string', description: 'URL of the client home page' },
            logo_uri:         { type: 'string', description: 'URL of the client logo image' },
            contacts:         { type: 'string', description: 'JSON array of contact email addresses for this client' },
            policy_uri:       { type: 'string', description: 'URL of the client privacy policy' },
            tos_uri:          { type: 'string', description: 'URL of the client terms of service' },
          },
          required: ['client_name', 'redirect_uris'],
        },
      },
      {
        name: 'get_client',
        description: 'Retrieve configuration and metadata for a registered OAuth2 client by ID',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The OAuth2 client ID to retrieve' },
          },
          required: ['client_id'],
        },
      },
      {
        name: 'update_client',
        description: 'Update configuration for a registered OAuth2 client (requires registration token or client credentials)',
        inputSchema: {
          type: 'object',
          properties: {
            client_id:        { type: 'string', description: 'The OAuth2 client ID to update' },
            client_name:      { type: 'string', description: 'Updated human-readable name' },
            redirect_uris:    { type: 'string', description: 'Updated JSON array of allowed redirect URIs' },
            grant_types:      { type: 'string', description: 'Updated JSON array of grant types' },
            response_types:   { type: 'string', description: 'Updated JSON array of response types' },
            scope:            { type: 'string', description: 'Updated default requested scopes' },
            token_endpoint_auth_method: { type: 'string', description: 'Updated client authentication method' },
            client_uri:       { type: 'string', description: 'Updated client home page URL' },
            logo_uri:         { type: 'string', description: 'Updated client logo URL' },
            contacts:         { type: 'string', description: 'Updated JSON array of contact emails' },
            policy_uri:       { type: 'string', description: 'Updated privacy policy URL' },
            tos_uri:          { type: 'string', description: 'Updated terms of service URL' },
          },
          required: ['client_id'],
        },
      },
      {
        name: 'delete_client',
        description: 'Delete a registered OAuth2 client application permanently (requires registration token)',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The OAuth2 client ID to delete' },
          },
          required: ['client_id'],
        },
      },
      // -- Session Iframe -------------------------------------------------------
      {
        name: 'get_session_iframe_url',
        description: 'Get the URL for the RP-initiated session management iframe for a client',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'The OAuth2 client ID for the session iframe' },
          },
          required: ['client_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'build_authorize_url':   return this.buildAuthorizeUrl(args);
        case 'exchange_token':        return this.exchangeToken(args);
        case 'get_userinfo':          return this.getUserinfo(args);
        case 'list_clients':          return this.listClients();
        case 'register_client':       return this.registerClient(args);
        case 'get_client':            return this.getClient(args);
        case 'update_client':         return this.updateClient(args);
        case 'delete_client':         return this.deleteClient(args);
        case 'get_session_iframe_url':return this.getSessionIframeUrl(args);
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

  // -- Tool implementations ---------------------------------------------------

  private buildAuthorizeUrl(args: Record<string, unknown>): ToolResult {
    const params: Record<string, string> = {};
    const fields = ['client_id', 'response_type', 'redirect_uri', 'scope', 'state', 'nonce',
                    'display', 'prompt', 'max_age', 'ui_locales', 'response_mode'];
    for (const f of fields) {
      if (args[f] !== undefined && args[f] !== null && args[f] !== '') {
        params[f] = String(args[f]);
      }
    }
    const url = `${this.baseUrl}/authorize?${new URLSearchParams(params).toString()}`;
    return {
      content: [{ type: 'text', text: JSON.stringify({ authorize_url: url, params }) }],
      isError: false,
    };
  }

  private async exchangeToken(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, string> = {};
    const fields = ['grant_type', 'code', 'redirect_uri', 'client_id', 'client_secret',
                    'username', 'password', 'scope'];
    for (const f of fields) {
      if (args[f] !== undefined && args[f] !== null && args[f] !== '') {
        body[f] = String(args[f]);
      }
    }
    const clientId     = String(args.client_id     || this.clientId);
    const clientSecret = String(args.client_secret || this.clientSecret);
    const authHeader   = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await this.fetchWithRetry(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Token exchange failed ${response.status}: ${text.slice(0, 500)}`);
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async getUserinfo(args: Record<string, unknown>): Promise<ToolResult> {
    const accessToken = String(args.access_token);
    const response = await this.fetchWithRetry(`${this.baseUrl}/userinfo`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Userinfo request failed ${response.status}: ${text.slice(0, 500)}`);
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async listClients(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/client`, {
      headers: this.registrationHeaders(),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`List clients failed ${response.status}: ${text.slice(0, 500)}`);
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async registerClient(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.buildClientBody(args);
    const response = await this.fetchWithRetry(`${this.baseUrl}/client`, {
      method: 'POST',
      headers: { ...this.registrationHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Register client failed ${response.status}: ${text.slice(0, 500)}`);
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async getClient(args: Record<string, unknown>): Promise<ToolResult> {
    const clientId = String(args.client_id);
    const response = await this.fetchWithRetry(`${this.baseUrl}/client/${encodeURIComponent(clientId)}`, {
      headers: this.registrationHeaders(),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Get client failed ${response.status}: ${text.slice(0, 500)}`);
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async updateClient(args: Record<string, unknown>): Promise<ToolResult> {
    const clientId = String(args.client_id);
    const body = this.buildClientBody(args);
    const response = await this.fetchWithRetry(`${this.baseUrl}/client/${encodeURIComponent(clientId)}`, {
      method: 'PUT',
      headers: { ...this.registrationHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Update client failed ${response.status}: ${text.slice(0, 500)}`);
    }
    const data = await response.json().catch(() => ({ updated: true }));
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async deleteClient(args: Record<string, unknown>): Promise<ToolResult> {
    const clientId = String(args.client_id);
    const response = await this.fetchWithRetry(`${this.baseUrl}/client/${encodeURIComponent(clientId)}`, {
      method: 'DELETE',
      headers: this.registrationHeaders(),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Delete client failed ${response.status}: ${text.slice(0, 500)}`);
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ deleted: true, client_id: clientId }) }],
      isError: false,
    };
  }

  private getSessionIframeUrl(args: Record<string, unknown>): ToolResult {
    const clientId = String(args.client_id);
    const url = `${this.baseUrl}/${encodeURIComponent(clientId)}/iframe`;
    return {
      content: [{ type: 'text', text: JSON.stringify({ iframe_url: url, client_id: clientId }) }],
      isError: false,
    };
  }

  // -- Helpers ----------------------------------------------------------------

  private registrationHeaders(): Record<string, string> {
    if (this.registrationToken) {
      return { 'Authorization': `Bearer ${this.registrationToken}` };
    }
    return {};
  }

  private buildClientBody(args: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    const stringFields = ['client_name', 'scope', 'token_endpoint_auth_method',
                          'client_uri', 'logo_uri', 'policy_uri', 'tos_uri'];
    const jsonFields   = ['redirect_uris', 'grant_types', 'response_types', 'contacts'];

    for (const f of stringFields) {
      if (args[f] !== undefined && args[f] !== null && args[f] !== '') {
        body[f] = String(args[f]);
      }
    }
    for (const f of jsonFields) {
      if (args[f] !== undefined && args[f] !== null && args[f] !== '') {
        try {
          body[f] = JSON.parse(String(args[f]));
        } catch {
          body[f] = [String(args[f])];
        }
      }
    }
    return body;
  }

}
