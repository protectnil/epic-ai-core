/**
 * Ping Identity MCP Server
 * Provides access to Ping Identity REST API endpoints for identity and access management
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface PingIdentityConfig {
  bearerToken: string;
  baseUrl?: string;
}

export class PingIdentityMCPServer {
  private readonly bearerToken: string;
  private readonly baseUrl: string;

  constructor(config: PingIdentityConfig) {
    this.bearerToken = config.bearerToken;
    // Strip trailing /v1 or /v1/ if caller passes a versioned URL, to avoid double-versioning
    const rawBase = config.baseUrl || 'https://api.pingone.com';
    this.baseUrl = rawBase.replace(/\/v\d+\/?$/, '');
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_users',
        description: 'List users with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of users to skip for pagination',
            },
            filter: {
              type: 'string',
              description: 'Filter expression for users',
            },
            sort: {
              type: 'string',
              description: 'Sort order for results',
            },
          },
        },
      },
      {
        name: 'get_user',
        description: 'Get detailed information about a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Unique user identifier',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'list_policies',
        description: 'List identity and access policies',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of policies to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of policies to skip for pagination',
            },
            policy_type: {
              type: 'string',
              description: 'Filter by policy type (password, mfa, access, etc.)',
            },
          },
        },
      },
      {
        name: 'get_risk_evaluations',
        description: 'Get risk evaluations for users and authentication events',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'User identifier for risk evaluation',
            },
            time_period: {
              type: 'string',
              description: 'Time period to evaluate (e.g., "24h", "7d", "30d")',
            },
            risk_level: {
              type: 'string',
              description: 'Filter by risk level (critical, high, medium, low)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'list_sessions',
        description: 'List active and historical user sessions',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Filter sessions by user ID',
            },
            status: {
              type: 'string',
              description: 'Session status (active, expired, terminated)',
            },
            limit: {
              type: 'number',
              description: 'Maximum sessions to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of sessions to skip for pagination',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_users': {
          const limit = (args.limit as number) || 100;
          const skip = (args.skip as number) || 0;
          const filter = args.filter as string | undefined;
          const sort = args.sort as string | undefined;

          let url = `${this.baseUrl}/v1/users?limit=${limit}&skip=${skip}`;
          if (filter) url += `&filter=${encodeURIComponent(filter)}`;
          if (sort) url += `&sort=${encodeURIComponent(sort)}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list users: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Ping Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_user': {
          const userId = args.user_id as string;
          if (!userId) {
            return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/v1/users/${encodeURIComponent(userId)}`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get user: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Ping Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_policies': {
          const limit = (args.limit as number) || 100;
          const skip = (args.skip as number) || 0;
          const policyType = args.policy_type as string | undefined;

          let url = `${this.baseUrl}/v1/policies?limit=${limit}&skip=${skip}`;
          if (policyType) url += `&type=${encodeURIComponent(policyType)}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list policies: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Ping Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_risk_evaluations': {
          const userId = args.user_id as string | undefined;
          const timePeriod = (args.time_period as string) || '24h';
          const riskLevel = args.risk_level as string | undefined;
          const limit = (args.limit as number) || 50;

          let url = `${this.baseUrl}/v1/risk/evaluations?time_period=${encodeURIComponent(timePeriod)}&limit=${limit}`;
          if (userId) url += `&user_id=${encodeURIComponent(userId)}`;
          if (riskLevel) url += `&risk_level=${encodeURIComponent(riskLevel)}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get risk evaluations: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Ping Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_sessions': {
          const userId = args.user_id as string | undefined;
          const status = args.status as string | undefined;
          const limit = (args.limit as number) || 100;
          const skip = (args.skip as number) || 0;

          let url = `${this.baseUrl}/v1/sessions?limit=${limit}&skip=${skip}`;
          if (userId) url += `&user_id=${encodeURIComponent(userId)}`;
          if (status) url += `&status=${encodeURIComponent(status)}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.bearerToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list sessions: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Ping Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`) }],
        isError: true,
      };
    }
  }
}
