/**
 * BeyondTrust MCP Server
 * Provides access to BeyondTrust REST API endpoints for privileged access management and password management
 */

import { ToolDefinition, ToolResult } from './types.js';

interface BeyondTrustConfig {
  apiKey: string;
  baseUrl: string;
}

export class BeyondTrustMCPServer {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BeyondTrustConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_sessions',
        description: 'List privileged user sessions and access requests',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by session status (active, completed, failed, pending)',
            },
            user_id: {
              type: 'string',
              description: 'Filter by user ID',
            },
            start_date: {
              type: 'string',
              description: 'Filter by start date (ISO 8601 format)',
            },
            end_date: {
              type: 'string',
              description: 'Filter by end date (ISO 8601 format)',
            },
            limit: {
              type: 'number',
              description: 'Maximum sessions to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
      {
        name: 'get_session',
        description: 'Get detailed information about a specific session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'Unique session identifier',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'list_credentials',
        description: 'List managed credentials and password vaults',
        inputSchema: {
          type: 'object',
          properties: {
            credential_type: {
              type: 'string',
              description: 'Filter by credential type (database, ssh, windows, etc.)',
            },
            search: {
              type: 'string',
              description: 'Search filter for credential names',
            },
            limit: {
              type: 'number',
              description: 'Maximum credentials to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
      {
        name: 'get_managed_account',
        description: 'Get details of a managed account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Unique account identifier',
            },
          },
          required: ['account_id'],
        },
      },
      {
        name: 'list_policies',
        description: 'List access control policies and approval workflows',
        inputSchema: {
          type: 'object',
          properties: {
            policy_type: {
              type: 'string',
              description: 'Filter by policy type (access_policy, approval_policy, etc.)',
            },
            status: {
              type: 'string',
              description: 'Filter by policy status (active, inactive, archived)',
            },
            limit: {
              type: 'number',
              description: 'Maximum policies to return (default: 100)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_sessions': {
          const status = args.status as string | undefined;
          const userId = args.user_id as string | undefined;
          const startDate = args.start_date as string | undefined;
          const endDate = args.end_date as string | undefined;
          const limit = (args.limit as number) || 100;
          const offset = (args.offset as number) || 0;

          let url = `${this.baseUrl}/sessions?limit=${limit}&offset=${offset}`;
          if (status) {
            url += `&status=${encodeURIComponent(status)}`;
          }
          if (userId) {
            url += `&userId=${encodeURIComponent(userId)}`;
          }
          if (startDate) {
            url += `&startDate=${encodeURIComponent(startDate)}`;
          }
          if (endDate) {
            url += `&endDate=${encodeURIComponent(endDate)}`;
          }

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'X-API-KEY': this.apiKey,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list sessions: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`BeyondTrust returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_session': {
          const sessionId = args.session_id as string;
          if (!sessionId) {
            return {
              content: [{ type: 'text', text: 'session_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/sessions/${encodeURIComponent(sessionId)}`,
            {
              method: 'GET',
              headers: {
                'X-API-KEY': this.apiKey,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get session: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`BeyondTrust returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_credentials': {
          const credentialType = args.credential_type as string | undefined;
          const search = args.search as string | undefined;
          const limit = (args.limit as number) || 100;
          const offset = (args.offset as number) || 0;

          let url = `${this.baseUrl}/credentials?limit=${limit}&offset=${offset}`;
          if (credentialType) {
            url += `&type=${encodeURIComponent(credentialType)}`;
          }
          if (search) {
            url += `&search=${encodeURIComponent(search)}`;
          }

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'X-API-KEY': this.apiKey,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list credentials: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`BeyondTrust returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_managed_account': {
          const accountId = args.account_id as string;
          if (!accountId) {
            return {
              content: [{ type: 'text', text: 'account_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/accounts/${encodeURIComponent(accountId)}`,
            {
              method: 'GET',
              headers: {
                'X-API-KEY': this.apiKey,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get account: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`BeyondTrust returned non-JSON response (HTTP ${response.status})`); }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_policies': {
          const policyType = args.policy_type as string | undefined;
          const status = args.status as string | undefined;
          const limit = (args.limit as number) || 100;
          const offset = (args.offset as number) || 0;

          let url = `${this.baseUrl}/policies?limit=${limit}&offset=${offset}`;
          if (policyType) {
            url += `&type=${encodeURIComponent(policyType)}`;
          }
          if (status) {
            url += `&status=${encodeURIComponent(status)}`;
          }

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'X-API-KEY': this.apiKey,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list policies: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try { data = await response.json(); } catch { throw new Error(`BeyondTrust returned non-JSON response (HTTP ${response.status})`); }
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
