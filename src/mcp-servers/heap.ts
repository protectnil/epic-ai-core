/**
 * Heap MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Heap MCP server was found on GitHub or npmjs. A Pipedream-hosted Heap
// integration exists at mcp.pipedream.com/app/heap but is third-party, not vendor-official.
// Our adapter covers: 5 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official vendor MCP exists.
//
// Base URL: https://heapanalytics.com/api
// Auth: app_id passed as a field in the JSON request body — no Authorization header for
//       server-side track/identify/add_user_properties/add_account_properties APIs.
//       The User Deletion API uses a separate 2-step flow: POST /api/auth with Basic auth
//       (app_id:api_key) to obtain an access_token, then Bearer token on
//       POST /api/public/v0/user_deletion. The authToken config field should be a
//       pre-acquired access_token (Bearer) for the deletion API.
// Docs: https://developers.heap.io/reference/server-side-apis-overview
// Rate limits: Not publicly documented; Heap recommends batching events where possible

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HeapConfig {
  appId: string;
  authToken?: string;  // Required only for the User Deletion API
  baseUrl?: string;
}

export class HeapMCPServer extends MCPAdapterBase {
  private readonly appId: string;
  private readonly authToken: string | null;
  private readonly baseUrl: string;

  constructor(config: HeapConfig) {
    super();
    this.appId = config.appId;
    this.authToken = config.authToken ?? null;
    this.baseUrl = config.baseUrl || 'https://heapanalytics.com/api';
  }

  static catalog() {
    return {
      name: 'heap',
      displayName: 'Heap',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'heap', 'analytics', 'product analytics', 'auto-capture', 'events', 'user properties',
        'behavioral data', 'funnel', 'session', 'identity', 'track', 'pageview',
      ],
      toolNames: [
        'track_event', 'add_user_properties', 'add_account_properties',
        'identify_user', 'delete_user',
      ],
      description: 'Heap auto-capture product analytics: track server-side events, enrich user and account properties, associate identities, and manage user data deletion.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'track_event',
        description: 'Send a custom server-side event to Heap with optional event properties, tied to a user identity',
        inputSchema: {
          type: 'object',
          properties: {
            identity: {
              type: 'string',
              description: 'The user identity string (case-sensitive, max 255 chars). Required unless user_id is provided.',
            },
            user_id: {
              type: 'number',
              description: 'Heap numeric user ID. Use either identity or user_id, not both.',
            },
            event: {
              type: 'string',
              description: 'Name of the event to track (e.g. "Completed Purchase", "Submitted Form")',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp for the event (default: current time)',
            },
            properties: {
              type: 'object',
              description: 'Key-value map of event properties. Values must be strings or numbers.',
            },
          },
          required: ['event'],
        },
      },
      {
        name: 'add_user_properties',
        description: 'Set or update user-level properties on an identified user without requiring an active session',
        inputSchema: {
          type: 'object',
          properties: {
            identity: {
              type: 'string',
              description: 'The user identity string to attach properties to (case-sensitive, max 255 chars)',
            },
            properties: {
              type: 'object',
              description: 'Key-value map of user properties to set (e.g. plan, signup_date, total_spend). Values must be strings or numbers.',
            },
          },
          required: ['identity', 'properties'],
        },
      },
      {
        name: 'add_account_properties',
        description: 'Set or update account-level properties on a Heap account (requires Heap Accounts feature)',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'The account ID to attach properties to',
            },
            properties: {
              type: 'object',
              description: 'Key-value map of account properties (e.g. plan, mrr, industry). Values must be strings or numbers.',
            },
          },
          required: ['account_id', 'properties'],
        },
      },
      {
        name: 'identify_user',
        description: 'Associate an anonymous Heap user with a known identity string, merging their behavioral history',
        inputSchema: {
          type: 'object',
          properties: {
            identity: {
              type: 'string',
              description: 'The canonical identity string to assign (e.g. email or internal user ID)',
            },
            anonymous_id: {
              type: 'string',
              description: 'Optional Heap anonymous user ID to merge into the identity',
            },
            properties: {
              type: 'object',
              description: 'Optional user properties to set at the time of identification',
            },
          },
          required: ['identity'],
        },
      },
      {
        name: 'delete_user',
        description: 'Delete a user and all associated event data from Heap (irreversible). Requires authToken config.',
        inputSchema: {
          type: 'object',
          properties: {
            identity: {
              type: 'string',
              description: 'The identity string of the user to delete',
            },
          },
          required: ['identity'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'track_event':
          return this.trackEvent(args);
        case 'add_user_properties':
          return this.addUserProperties(args);
        case 'add_account_properties':
          return this.addAccountProperties(args);
        case 'identify_user':
          return this.identifyUser(args);
        case 'delete_user':
          return this.deleteUser(args);
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

  private async post(endpoint: string, body: Record<string, unknown>, bearerToken?: string): Promise<ToolResult> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    // Heap returns 200 with empty body on success for most endpoints
    let data: unknown = { success: true };
    const text = await response.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async trackEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event) {
      return { content: [{ type: 'text', text: 'event is required' }], isError: true };
    }
    if (!args.identity && !args.user_id) {
      return { content: [{ type: 'text', text: 'identity or user_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      app_id: this.appId,
      event: args.event,
    };
    if (args.identity) body.identity = args.identity;
    if (args.user_id) body.user_id = args.user_id;
    if (args.timestamp) body.timestamp = args.timestamp;
    if (args.properties) body.properties = args.properties;
    return this.post('track', body);
  }

  private async addUserProperties(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identity) {
      return { content: [{ type: 'text', text: 'identity is required' }], isError: true };
    }
    if (!args.properties) {
      return { content: [{ type: 'text', text: 'properties is required' }], isError: true };
    }
    return this.post('add_user_properties', {
      app_id: this.appId,
      identity: args.identity,
      properties: args.properties,
    });
  }

  private async addAccountProperties(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.account_id) {
      return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    }
    if (!args.properties) {
      return { content: [{ type: 'text', text: 'properties is required' }], isError: true };
    }
    return this.post('add_account_properties', {
      app_id: this.appId,
      account_id: args.account_id,
      properties: args.properties,
    });
  }

  private async identifyUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identity) {
      return { content: [{ type: 'text', text: 'identity is required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      app_id: this.appId,
      identity: args.identity,
    };
    if (args.anonymous_id) body.anonymous_id = args.anonymous_id;
    if (args.properties) body.properties = args.properties;
    return this.post('identify', body);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identity) {
      return { content: [{ type: 'text', text: 'identity is required' }], isError: true };
    }
    if (!this.authToken) {
      return { content: [{ type: 'text', text: 'authToken is required for user deletion — configure HeapMCPServer with authToken' }], isError: true };
    }
    return this.post('public/v0/user_deletion', {
      app_id: this.appId,
      users: [{ identity: args.identity }],
    }, this.authToken);
  }
}
