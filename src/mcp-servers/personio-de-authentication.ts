/**
 * Personio Authentication MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.personio.de/v1
// Auth: client_id + client_secret query parameters to obtain a JWT bearer token
// Docs: https://developer.personio.de/reference/auth
// Spec: https://api.apis.guru/v2/specs/personio.de/authentication/1.0/openapi.json
// Rate limits: Not publicly documented; standard enterprise HR API limits apply.
// Note: This adapter implements the authentication flow only. For employee/absence/
//   attendance data, use the personio-de-personnel adapter (separate spec).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PersonioAuthConfig {
  clientId?: string;
  clientSecret?: string;
  baseUrl?: string;
}

export class PersonioDeAuthenticationMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  constructor(config: PersonioAuthConfig) {
    super();
    this.clientId     = config.clientId     || '';
    this.clientSecret = config.clientSecret || '';
    this.baseUrl      = config.baseUrl      || 'https://api.personio.de/v1';
  }

  static catalog() {
    return {
      name: 'personio-de-authentication',
      displayName: 'Personio Authentication',
      version: '1.0.0',
      category: 'hr',
      keywords: [
        'personio', 'hr', 'human resources', 'authentication', 'token', 'jwt',
        'bearer token', 'oauth', 'personio auth', 'api token', 'personio login',
        'access token', 'credentials', 'personio api', 'hris',
      ],
      toolNames: [
        'request_auth_token',
      ],
      description: 'Personio HR platform authentication: obtain a JWT bearer token using client credentials. This token is required for all other Personio API calls (employees, attendance, absences, etc.).',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'request_auth_token',
        description: 'Request a Personio JWT authentication token using client credentials. The returned token must be passed as a Bearer token in the Authorization header for all subsequent Personio API requests.',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'Client ID from the Personio API credentials file. Uses the adapter-level clientId if not provided.',
            },
            client_secret: {
              type: 'string',
              description: 'Client secret from the Personio API credentials file. Uses the adapter-level clientSecret if not provided.',
            },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'request_auth_token': return this.requestAuthToken(args);
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

  // ── Auth methods ───────────────────────────────────────────────────────────

  private async requestAuthToken(args: Record<string, unknown>): Promise<ToolResult> {
    const clientId     = (args.client_id     as string | undefined) || this.clientId;
    const clientSecret = (args.client_secret as string | undefined) || this.clientSecret;

    if (!clientId)     return { content: [{ type: 'text', text: 'client_id is required (provide in args or adapter config)' }], isError: true };
    if (!clientSecret) return { content: [{ type: 'text', text: 'client_secret is required (provide in args or adapter config)' }], isError: true };

    const url = new URL(`${this.baseUrl}/auth`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);

    const response = await this.fetchWithRetry(url.toString(), {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Personio auth error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
