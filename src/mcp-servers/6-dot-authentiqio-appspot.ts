/**
 * Authentiq MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Authentiq MCP server was found on GitHub or npm.
//
// Base URL: https://6-dot-authentiqio.appspot.com
// Auth: No authentication required for most endpoints (public key operations);
//       push_login_request and scope signing use JWT bodies (application/jwt)
// Docs: https://authentiq.com/developers/
// Rate limits: Not documented

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AuthentiqConfig {
  baseUrl?: string;
}

export class AuthentiqMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: AuthentiqConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://6-dot-authentiqio.appspot.com';
  }

  static catalog() {
    return {
      name: '6-dot-authentiqio-appspot',
      displayName: 'Authentiq',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: ['authentiq', 'identity', 'authentication', 'passwordless', 'jwt', 'key', 'revoke', 'scope', 'verification', 'push-login'],
      toolNames: [
        'register_key',
        'get_key',
        'update_key',
        'bind_key',
        'revoke_key',
        'revoke_key_by_email',
        'push_login_request',
        'create_scope_verification',
        'get_scope_verification',
        'confirm_scope_verification',
        'update_scope_verification',
        'delete_scope_verification',
      ],
      description: 'Authentiq passwordless identity API: register, retrieve, update, bind, and revoke Authentiq ID keys; push login requests; manage scope verification jobs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'register_key',
        description: 'Register a new Authentiq ID using a signed JWT containing sub and devtoken fields',
        inputSchema: {
          type: 'object',
          properties: {
            jwt: {
              type: 'string',
              description: 'Signed JWT with sub (UUID + public signing key) and devtoken (device push token) fields',
            },
          },
          required: ['jwt'],
        },
      },
      {
        name: 'get_key',
        description: 'Retrieve public details of an Authentiq ID by its public key (PK), including status and registration date',
        inputSchema: {
          type: 'object',
          properties: {
            pk: {
              type: 'string',
              description: 'Base64safe-encoded public signing key (the Authentiq ID)',
            },
          },
          required: ['pk'],
        },
      },
      {
        name: 'update_key',
        description: 'Update properties of an existing Authentiq ID by posting a new signed JWT (v5 issuer-signed scope)',
        inputSchema: {
          type: 'object',
          properties: {
            pk: {
              type: 'string',
              description: 'Base64safe-encoded public signing key of the identity to update',
            },
            jwt: {
              type: 'string',
              description: 'Signed JWT with updated identity properties',
            },
          },
          required: ['pk', 'jwt'],
        },
      },
      {
        name: 'bind_key',
        description: 'Bind email and phone to an Authentiq ID by replacing the full object with a signed JWT (PUT operation)',
        inputSchema: {
          type: 'object',
          properties: {
            pk: {
              type: 'string',
              description: 'Base64safe-encoded public signing key of the identity to bind',
            },
            jwt: {
              type: 'string',
              description: 'Signed JWT containing sub, email, and phone hash claims to bind',
            },
          },
          required: ['pk', 'jwt'],
        },
      },
      {
        name: 'revoke_key',
        description: 'Revoke an Authentiq ID using its public key and a revocation secret returned at registration',
        inputSchema: {
          type: 'object',
          properties: {
            pk: {
              type: 'string',
              description: 'Base64safe-encoded public signing key of the identity to revoke',
            },
            secret: {
              type: 'string',
              description: 'Revocation secret returned at registration time',
            },
          },
          required: ['pk', 'secret'],
        },
      },
      {
        name: 'revoke_key_by_email',
        description: 'Revoke an Authentiq ID by email and phone without the secret; sends a verification code by email — call again with the code to complete revocation',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Primary email address associated with the Authentiq ID',
            },
            phone: {
              type: 'string',
              description: 'Primary phone number in international format (e.g. +15551234567)',
            },
            code: {
              type: 'string',
              description: 'Verification code received by email; omit on first call to trigger code send',
            },
          },
          required: ['email', 'phone'],
        },
      },
      {
        name: 'push_login_request',
        description: 'Push a sign-in request to a user device using a signed JWT; optional callback URL for redirect after authentication',
        inputSchema: {
          type: 'object',
          properties: {
            jwt: {
              type: 'string',
              description: 'Signed JWT push login request body',
            },
            callback: {
              type: 'string',
              description: 'Optional redirect callback URL after successful authentication',
            },
          },
          required: ['jwt'],
        },
      },
      {
        name: 'create_scope_verification',
        description: 'Create a new scope verification request using a signed JWT; optional test mode for sandbox testing',
        inputSchema: {
          type: 'object',
          properties: {
            jwt: {
              type: 'string',
              description: 'Signed JWT containing the scope verification request',
            },
            test: {
              type: 'number',
              description: 'Test mode: set to 1 to enable sandbox mode (default: 0 = production)',
            },
          },
          required: ['jwt'],
        },
      },
      {
        name: 'get_scope_verification',
        description: 'Get the current status and content of a scope verification job by its job ID',
        inputSchema: {
          type: 'object',
          properties: {
            job: {
              type: 'string',
              description: 'Scope verification job ID returned by create_scope_verification',
            },
          },
          required: ['job'],
        },
      },
      {
        name: 'confirm_scope_verification',
        description: 'Confirm a scope verification job (user-side acknowledgment of the requested scope claims)',
        inputSchema: {
          type: 'object',
          properties: {
            job: {
              type: 'string',
              description: 'Scope verification job ID to confirm',
            },
          },
          required: ['job'],
        },
      },
      {
        name: 'update_scope_verification',
        description: 'Update a scope verification job: authority signs the JWT with its signature and submits the result',
        inputSchema: {
          type: 'object',
          properties: {
            job: {
              type: 'string',
              description: 'Scope verification job ID to update',
            },
            jwt: {
              type: 'string',
              description: 'Updated signed JWT with authority signature',
            },
          },
          required: ['job', 'jwt'],
        },
      },
      {
        name: 'delete_scope_verification',
        description: 'Delete and cancel a scope verification job by its job ID',
        inputSchema: {
          type: 'object',
          properties: {
            job: {
              type: 'string',
              description: 'Scope verification job ID to delete',
            },
          },
          required: ['job'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'register_key':
          return await this.registerKey(args);
        case 'get_key':
          return await this.getKey(args);
        case 'update_key':
          return await this.updateKey(args);
        case 'bind_key':
          return await this.bindKey(args);
        case 'revoke_key':
          return await this.revokeKey(args);
        case 'revoke_key_by_email':
          return await this.revokeKeyByEmail(args);
        case 'push_login_request':
          return await this.pushLoginRequest(args);
        case 'create_scope_verification':
          return await this.createScopeVerification(args);
        case 'get_scope_verification':
          return await this.getScopeVerification(args);
        case 'confirm_scope_verification':
          return await this.confirmScopeVerification(args);
        case 'update_scope_verification':
          return await this.updateScopeVerification(args);
        case 'delete_scope_verification':
          return await this.deleteScopeVerification(args);
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

  private async registerKey(args: Record<string, unknown>): Promise<ToolResult> {
    const jwt = args.jwt as string;

    const response = await this.fetchWithRetry(`${this.baseUrl}/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/jwt' },
      body: jwt,
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getKey(args: Record<string, unknown>): Promise<ToolResult> {
    const pk = encodeURIComponent(args.pk as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/key/${pk}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async updateKey(args: Record<string, unknown>): Promise<ToolResult> {
    const pk = encodeURIComponent(args.pk as string);
    const jwt = args.jwt as string;

    const response = await this.fetchWithRetry(`${this.baseUrl}/key/${pk}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/jwt' },
      body: jwt,
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async bindKey(args: Record<string, unknown>): Promise<ToolResult> {
    const pk = encodeURIComponent(args.pk as string);
    const jwt = args.jwt as string;

    const response = await this.fetchWithRetry(`${this.baseUrl}/key/${pk}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/jwt' },
      body: jwt,
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async revokeKey(args: Record<string, unknown>): Promise<ToolResult> {
    const pk = encodeURIComponent(args.pk as string);
    const secret = encodeURIComponent(args.secret as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/key/${pk}?secret=${secret}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async revokeKeyByEmail(args: Record<string, unknown>): Promise<ToolResult> {
    const email = encodeURIComponent(args.email as string);
    const phone = encodeURIComponent(args.phone as string);
    const code = args.code as string | undefined;

    let url = `${this.baseUrl}/key?email=${email}&phone=${phone}`;
    if (code) {
      url += `&code=${encodeURIComponent(code)}`;
    }

    const response = await this.fetchWithRetry(url, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async pushLoginRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const jwt = args.jwt as string;
    const callback = args.callback as string | undefined;

    let url = `${this.baseUrl}/login`;
    if (callback) {
      url += `?callback=${encodeURIComponent(callback)}`;
    }

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/jwt' },
      body: jwt,
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async createScopeVerification(args: Record<string, unknown>): Promise<ToolResult> {
    const jwt = args.jwt as string;
    const test = args.test as number | undefined;

    let url = `${this.baseUrl}/scope`;
    if (test !== undefined) {
      url += `?test=${test}`;
    }

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/jwt' },
      body: jwt,
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getScopeVerification(args: Record<string, unknown>): Promise<ToolResult> {
    const job = encodeURIComponent(args.job as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/scope/${job}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  private async confirmScopeVerification(args: Record<string, unknown>): Promise<ToolResult> {
    const job = encodeURIComponent(args.job as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/scope/${job}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async updateScopeVerification(args: Record<string, unknown>): Promise<ToolResult> {
    const job = encodeURIComponent(args.job as string);
    const jwt = args.jwt as string;

    const response = await this.fetchWithRetry(`${this.baseUrl}/scope/${job}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/jwt' },
      body: jwt,
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async deleteScopeVerification(args: Record<string, unknown>): Promise<ToolResult> {
    const job = encodeURIComponent(args.job as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/scope/${job}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
