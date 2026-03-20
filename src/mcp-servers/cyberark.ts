/**
 * CyberArk MCP Server
 * Provides access to CyberArk REST API endpoints for privileged access management
 */

import { ToolDefinition, ToolResult } from './types.js';

interface CyberArkConfig {
  username: string;
  password: string;
  baseUrl: string;
  /** Finding #16: Configurable token TTL in milliseconds. Default: 7.5 hours (27,000,000 ms). */
  tokenTtlMs?: number;
}

const DEFAULT_TOKEN_TTL_MS = 27_000_000; // 7.5 hours

export class CyberArkMCPServer {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;
  // Finding #16: token TTL is configurable, not a hardcoded magic number
  private readonly tokenTtlMs: number;
  private authToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: CyberArkConfig) {
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl;
    this.tokenTtlMs = config.tokenTtlMs ?? DEFAULT_TOKEN_TTL_MS;
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.authToken && this.tokenExpiry > now) {
      return this.authToken;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/Cyberark/Logon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.username,
          password: this.password,
        }),
      });

      if (!response.ok) {
        throw new Error(`CyberArk authentication failed: ${response.statusText}`);
      }

      const data = (await response.json()) as string;
      this.authToken = data;
      // Finding #16: use configurable TTL
      this.tokenExpiry = now + this.tokenTtlMs;
      return this.authToken;
    } catch (error) {
      throw new Error(
        `Failed to obtain CyberArk auth token: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Finding #16: On 401, clear token and re-authenticate once, then retry.
   */
  private async withReauth<T>(fn: (token: string) => Promise<T>): Promise<T> {
    let token = await this.getOrRefreshToken();
    try {
      return await fn(token);
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        this.authToken = null;
        this.tokenExpiry = 0;
        token = await this.getOrRefreshToken();
        return await fn(token);
      }
      throw error;
    }
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_accounts',
        description: 'List privileged accounts managed in CyberArk',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search filter for account names or properties',
            },
            safe_name: {
              type: 'string',
              description: 'Filter by safe name',
            },
            include_privileged_only: {
              type: 'boolean',
              description: 'Include only privileged accounts (default: true)',
            },
            limit: {
              type: 'number',
              description: 'Maximum accounts to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_account',
        description: 'Get detailed information about a specific account',
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
        name: 'list_safes',
        description: 'List safes (vaults) in CyberArk',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search filter for safe names',
            },
            limit: {
              type: 'number',
              description: 'Maximum safes to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_session_recordings',
        description: 'Get privileged session recordings and activity logs',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Filter by account ID',
            },
            user_name: {
              type: 'string',
              description: 'Filter by username who accessed the account',
            },
            start_date: {
              type: 'string',
              description: 'Start date for session recordings (ISO 8601 format)',
            },
            end_date: {
              type: 'string',
              description: 'End date for session recordings (ISO 8601 format)',
            },
            limit: {
              type: 'number',
              description: 'Maximum recordings to return (default: 50)',
            },
          },
        },
      },
      {
        name: 'retrieve_credential',
        description: 'Retrieve a credential from a managed account',
        inputSchema: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Account identifier to retrieve credentials from',
            },
            reason: {
              type: 'string',
              description: 'Reason for credential retrieval (audit trail)',
            },
            ticket_id: {
              type: 'string',
              description: 'Optional ticket ID for credential request',
            },
          },
          required: ['account_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      return await this.withReauth(async (token) => {
        switch (name) {
          case 'list_accounts': {
            const search = args.search as string | undefined;
            const safeName = args.safe_name as string | undefined;
            const includePrivilegedOnly = (args.include_privileged_only as boolean) ?? true;
            const limit = (args.limit as number) || 100;

            let url = `${this.baseUrl}/accounts?includePrivilegedOnly=${includePrivilegedOnly}&limit=${limit}`;
            if (search) {
              url += `&search=${encodeURIComponent(search)}`;
            }
            if (safeName) {
              url += `&safeName=${encodeURIComponent(safeName)}`;
            }

            const response = await fetch(url, {
              method: 'GET',
              headers: this.cyberArkHeaders(token),
            });

            if (!response.ok) {
              return {
                content: [{ type: 'text', text: `Failed to list accounts: ${response.statusText}` }],
                isError: true,
              };
            }

            // Finding #19
            let data: unknown;
            try {
              data = await response.json();
            } catch {
              throw new Error(`CyberArk returned non-JSON response (HTTP ${response.status})`);
            }
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
          }

          case 'get_account': {
            const accountId = args.account_id as string;
            if (!accountId) {
              return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
            }

            const response = await fetch(
              `${this.baseUrl}/accounts/${encodeURIComponent(accountId)}`,
              { method: 'GET', headers: this.cyberArkHeaders(token) }
            );

            if (!response.ok) {
              return {
                content: [{ type: 'text', text: `Failed to get account: ${response.statusText}` }],
                isError: true,
              };
            }

            // Finding #19
            let data: unknown;
            try {
              data = await response.json();
            } catch {
              throw new Error(`CyberArk returned non-JSON response (HTTP ${response.status})`);
            }
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
          }

          case 'list_safes': {
            const search = args.search as string | undefined;
            const limit = (args.limit as number) || 100;

            let url = `${this.baseUrl}/safes?limit=${limit}`;
            if (search) {
              url += `&search=${encodeURIComponent(search)}`;
            }

            const response = await fetch(url, {
              method: 'GET',
              headers: this.cyberArkHeaders(token),
            });

            if (!response.ok) {
              return {
                content: [{ type: 'text', text: `Failed to list safes: ${response.statusText}` }],
                isError: true,
              };
            }

            // Finding #19
            let data: unknown;
            try {
              data = await response.json();
            } catch {
              throw new Error(`CyberArk returned non-JSON response (HTTP ${response.status})`);
            }
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
          }

          case 'get_session_recordings': {
            const accountId = args.account_id as string | undefined;
            const userName = args.user_name as string | undefined;
            const startDate = args.start_date as string | undefined;
            const endDate = args.end_date as string | undefined;
            const limit = (args.limit as number) || 50;

            let url = `${this.baseUrl}/recordings?limit=${limit}`;
            if (accountId) url += `&accountId=${encodeURIComponent(accountId)}`;
            if (userName) url += `&userName=${encodeURIComponent(userName)}`;
            if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
            if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

            const response = await fetch(url, {
              method: 'GET',
              headers: this.cyberArkHeaders(token),
            });

            if (!response.ok) {
              return {
                content: [{ type: 'text', text: `Failed to get session recordings: ${response.statusText}` }],
                isError: true,
              };
            }

            // Finding #19
            let data: unknown;
            try {
              data = await response.json();
            } catch {
              throw new Error(`CyberArk returned non-JSON response (HTTP ${response.status})`);
            }
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
          }

          case 'retrieve_credential': {
            const accountId = args.account_id as string;
            const reason = args.reason as string | undefined;
            const ticketId = args.ticket_id as string | undefined;

            if (!accountId) {
              return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
            }

            const requestBody: Record<string, unknown> = {};
            if (reason) requestBody.reason = reason;
            if (ticketId) requestBody.ticketId = ticketId;

            const response = await fetch(
              `${this.baseUrl}/accounts/${encodeURIComponent(accountId)}/password/retrieve`,
              {
                method: 'POST',
                headers: this.cyberArkHeaders(token),
                body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
              }
            );

            if (!response.ok) {
              return {
                content: [{ type: 'text', text: `Failed to retrieve credential: ${response.statusText}` }],
                isError: true,
              };
            }

            // Finding #19
            let data: unknown;
            try {
              data = await response.json();
            } catch {
              throw new Error(`CyberArk returned non-JSON response (HTTP ${response.status})`);
            }
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
          }

          default:
            return {
              content: [{ type: 'text', text: `Unknown tool: ${name}` }],
              isError: true,
            };
        }
      });
    } catch (error) {
      return {
        content: [{ type: 'text', text: String(`Tool execution failed: ${error instanceof Error ? error.message : String(error)}`) }],
        isError: true,
      };
    }
  }

  /**
   * Finding #23: CyberArk's Logon endpoint returns a bare session token string (not "Bearer <token>").
   * The Authorization header is intentionally sent as the raw token value — this is the documented
   * CyberArk PVWA REST API authentication format.
   */
  private cyberArkHeaders(token: string): Record<string, string> {
    return {
      Authorization: token,
      'Content-Type': 'application/json',
    };
  }
}
