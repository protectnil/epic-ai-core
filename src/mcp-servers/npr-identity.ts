/**
 * NPR Identity MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. NPR has not published an official MCP server.
//
// Base URL: https://identity.api.npr.org
// Auth: OAuth2 Bearer token — Authorization: Bearer <access_token>
//   Tokens are issued via the NPR Authorization Service (npr.org/authorization).
// Docs: https://dev.npr.org/api/
// Spec: https://api.apis.guru/v2/specs/npr.org/identity/2/swagger.json
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NprIdentityConfig {
  accessToken: string;
  baseUrl?: string;
}

export class NprIdentityMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: NprIdentityConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://identity.api.npr.org';
  }

  static catalog() {
    return {
      name: 'npr-identity',
      displayName: 'NPR Identity',
      version: '1.0.0',
      category: 'media' as const,
      keywords: [
        'npr', 'public radio', 'identity', 'user', 'profile', 'station',
        'following', 'media', 'podcast', 'listening', 'preferences',
      ],
      toolNames: [
        'get_user',
        'delete_user',
        'update_stations',
        'post_following',
        'inherit_from_temp_user',
      ],
      description: 'Manage NPR user identity: retrieve and delete user accounts, update favorite stations, manage following status, and inherit listening data from temporary accounts via the NPR Identity REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- User -------------------------------------------------------------
      {
        name: 'get_user',
        description: 'Get the latest state information about the logged-in NPR user, including profile, listening history, and station preferences',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'delete_user',
        description: "Permanently delete the logged-in user's NPR account and all associated data",
        inputSchema: { type: 'object', properties: {} },
      },
      // -- Stations ---------------------------------------------------------
      {
        name: 'update_stations',
        description: "Update the logged-in user's favorite station(s) by providing an array of NPR station IDs",
        inputSchema: {
          type: 'object',
          properties: {
            station_ids: {
              type: 'array',
              description: "Array of NPR station IDs to set as the user's favorites",
              items: { type: 'integer' },
            },
          },
          required: ['station_ids'],
        },
      },
      // -- Following --------------------------------------------------------
      {
        name: 'post_following',
        description: 'Update the following status of the logged-in user for a particular aggregation (program, podcast, or topic)',
        inputSchema: {
          type: 'object',
          properties: {
            aggregation_id: {
              type: 'integer',
              description: 'The ID of the aggregation (program, podcast, or topic) to follow or unfollow',
            },
            following: {
              type: 'boolean',
              description: 'True to follow the aggregation, false to unfollow',
            },
          },
          required: ['aggregation_id', 'following'],
        },
      },
      // -- Inheritance ------------------------------------------------------
      {
        name: 'inherit_from_temp_user',
        description: "Copy listening data from a temporary user account into the logged-in user's permanent account",
        inputSchema: {
          type: 'object',
          properties: {
            temp_user: {
              type: 'integer',
              description: 'The ID of the temporary user whose listening data should be merged into the current account',
            },
          },
          required: ['temp_user'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_user':
          return await this.getUser();
        case 'delete_user':
          return await this.deleteUser();
        case 'update_stations':
          return await this.updateStations(args);
        case 'post_following':
          return await this.postFollowing(args);
        case 'inherit_from_temp_user':
          return await this.inheritFromTempUser(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${message}` }],
        isError: true,
      };
    }
  }

  // -- Private helpers ------------------------------------------------------

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean>,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (query && Object.keys(query).length > 0) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        params.set(k, String(v));
      }
      url += `?${params.toString()}`;
    }

    const init: RequestInit = { method, headers: this.headers() };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await this.fetchWithRetry(url, init);
    let text = await res.text();
    text = this.truncate(text);

    if (!res.ok) {
      return {
        content: [{ type: 'text', text: `HTTP ${res.status} ${res.statusText}: ${text}` }],
        isError: true,
      };
    }

    return { content: [{ type: 'text', text }], isError: false };
  }

  private async getUser(): Promise<ToolResult> {
    return this.request('GET', '/v2/user');
  }

  private async deleteUser(): Promise<ToolResult> {
    return this.request('DELETE', '/v2/user');
  }

  private async updateStations(args: Record<string, unknown>): Promise<ToolResult> {
    const stationIds = args.station_ids;
    if (!Array.isArray(stationIds) || stationIds.length === 0) {
      return {
        content: [{ type: 'text', text: 'station_ids must be a non-empty array of integers' }],
        isError: true,
      };
    }
    return this.request('PUT', '/v2/stations', stationIds);
  }

  private async postFollowing(args: Record<string, unknown>): Promise<ToolResult> {
    const { aggregation_id, following } = args;
    if (typeof aggregation_id !== 'number') {
      return {
        content: [{ type: 'text', text: 'aggregation_id must be an integer' }],
        isError: true,
      };
    }
    if (typeof following !== 'boolean') {
      return {
        content: [{ type: 'text', text: 'following must be a boolean' }],
        isError: true,
      };
    }
    return this.request('POST', '/v2/following', { aggregationId: aggregation_id, following });
  }

  private async inheritFromTempUser(args: Record<string, unknown>): Promise<ToolResult> {
    const { temp_user } = args;
    if (typeof temp_user !== 'number') {
      return {
        content: [{ type: 'text', text: 'temp_user must be an integer' }],
        isError: true,
      };
    }
    return this.request('POST', '/v2/user/inherit', undefined, { temp_user });
  }
}
