/**
 * TruAnon MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official TruAnon MCP server was found on GitHub or the TruAnon developer resources.
//
// Base URL: https://staging.truanon.com (production URL may differ per deployment)
// Auth: Private token passed as a query parameter or header. Service identifier required.
// Docs: https://www.truanon.com/developers
// API: Two-endpoint identity verification API. No OAuth flow — token provided by TruAnon directly.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TruAnonConfig {
  /** Private API token provided by TruAnon */
  privateToken: string;
  /** TruAnon service identifier (typically your root domain, e.g. "example.com") */
  service: string;
  /** Optional base URL override (default: https://staging.truanon.com) */
  baseUrl?: string;
}

export class TruAnonMCPServer extends MCPAdapterBase {
  private readonly privateToken: string;
  private readonly service: string;
  private readonly baseUrl: string;

  constructor(config: TruAnonConfig) {
    super();
    this.privateToken = config.privateToken;
    this.service = config.service;
    this.baseUrl = config.baseUrl ?? 'https://staging.truanon.com';
  }

  static catalog() {
    return {
      name: 'truanon',
      displayName: 'TruAnon',
      version: '1.0.0',
      category: 'identity',
      keywords: [
        'truanon', 'identity', 'verification', 'anonymous', 'privacy',
        'authentication', 'profile', 'token', 'proof', 'member',
        'identity verification', 'user verification', 'trust',
      ],
      toolNames: [
        'get_profile',
        'request_token',
      ],
      description: 'Identity verification via TruAnon Private API. Retrieve confirmed profile data for a member and request proof tokens to let members verify their identity in a popup interface.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_profile',
        description: 'Retrieve confirmed identity profile data for a unique member ID via TruAnon. Returns verified profile fields for the specified member on your service.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The unique username or member ID on your platform to query identity for',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'request_token',
        description: 'Request a Proof token for a member, enabling them to confirm their identity via a TruAnon popup interface. Returns a token object with id, type, active status, and name.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The unique username or member ID on your platform to request a verification token for',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_profile':
          return this.getProfile(args);
        case 'request_token':
          return this.requestToken(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.privateToken}`,
      'Content-Type': 'application/json',
    };
  }

  private buildQuery(params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const str = qs.toString();
    return str ? `?${str}` : '';
  }

  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${this.buildQuery(params)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`TruAnon returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get('/api/get_profile', {
      id: args.id as string,
      service: this.service,
    });
  }

  private async requestToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get('/api/request_token', {
      id: args.id as string,
      service: this.service,
    });
  }
}
