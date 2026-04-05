/**
 * 1Password Events MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official 1Password Events MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 3 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://events.1password.com (default; also .ca, .eu, .ent variants)
// Auth: Authorization: Bearer {jwt_token}
//   JWT token issued by 1Password with specific feature scopes (itemusages, signinattempts)
//   Obtained from 1Password portal: Settings > Developer > Events API
//   Verified from: https://i.1password.com/media/1password-events-reporting/1password-events-api.yaml
// Docs: https://developer.1password.com/docs/events-api/
// Rate limits: Not publicly documented; use cursor-based pagination

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OnePasswordEventsConfig {
  jwtToken: string;
  baseUrl?: string;
}

export class OnePasswordEventsMCPServer extends MCPAdapterBase {
  private readonly jwtToken: string;
  private readonly baseUrl: string;

  constructor(config: OnePasswordEventsConfig) {
    super();
    this.jwtToken = config.jwtToken;
    this.baseUrl = config.baseUrl || 'https://events.1password.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'introspect_token',
        description: 'Introspect the provided Bearer JWT token to verify its validity and inspect granted feature scopes (e.g., itemusages, signinattempts).',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_item_usages',
        description: 'Retrieve item usage events from 1Password — records of when vault items (passwords, secrets) were accessed or used. Requires JWT with itemusages scope. Use cursor for pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response to continue fetching events',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (used when resetting cursor)',
            },
            start_time: {
              type: 'string',
              description: 'ISO 8601 timestamp to start fetching events from (used when resetting cursor, e.g., "2024-01-01T00:00:00Z")',
            },
          },
        },
      },
      {
        name: 'get_sign_in_attempts',
        description: 'Retrieve sign-in attempt events from 1Password — records of authentication attempts including user, IP, country, and success/failure status. Requires JWT with signinattempts scope. Use cursor for pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response to continue fetching events',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (used when resetting cursor)',
            },
            start_time: {
              type: 'string',
              description: 'ISO 8601 timestamp to start fetching events from (used when resetting cursor, e.g., "2024-01-01T00:00:00Z")',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'introspect_token':
          return await this.introspectToken();
        case 'get_item_usages':
          return await this.getItemUsages(args);
        case 'get_sign_in_attempts':
          return await this.getSignInAttempts(args);
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

  private async request(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.jwtToken}`,
      'Content-Type': 'application/json',
    };

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `1Password Events API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`1Password Events API returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async introspectToken(): Promise<ToolResult> {
    return this.request('/api/auth/introspect', 'GET');
  }

  private buildCursorBody(args: Record<string, unknown>): unknown {
    if (args.cursor) {
      return { cursor: args.cursor as string };
    }
    const resetCursor: Record<string, unknown> = {};
    if (args.limit !== undefined) resetCursor.limit = args.limit as number;
    if (args.start_time !== undefined) resetCursor.start_time = args.start_time as string;
    return Object.keys(resetCursor).length > 0 ? resetCursor : {};
  }

  private async getItemUsages(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.buildCursorBody(args);
    return this.request('/api/v1/itemusages', 'POST', body);
  }

  private async getSignInAttempts(args: Record<string, unknown>): Promise<ToolResult> {
    const body = this.buildCursorBody(args);
    return this.request('/api/v1/signinattempts', 'POST', body);
  }

  static catalog() {
    return {
      name: '1password-events',
      displayName: '1Password Events',
      version: '1.0.0',
      category: 'identity' as const,
      keywords: ['1password', 'onepassword', 'events', 'identity', 'audit', 'security'],
      toolNames: ['introspect_token', 'get_item_usages', 'get_sign_in_attempts'],
      description: '1Password Events adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
