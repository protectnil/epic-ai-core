/**
 * Delinea Secret Server MCP Server
 * Provides access to Delinea Secret Server REST API endpoints for secrets management
 */

import { ToolDefinition, ToolResult } from './types.js';

interface DelineaConfig {
  username: string;
  password: string;
  baseUrl: string;
}

export class DelineaMCPServer {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: DelineaConfig) {
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl;
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    try {
      /**
       * Finding #17: Delinea Secret Server only supports the Resource Owner Password Credentials (ROPC)
       * grant type (grant_type=password) on its /oauth/token endpoint.
       * No machine-to-machine client_credentials endpoint is available.
       * Risk: password is transmitted to the token endpoint on every refresh.
       * Accepted as required by the Delinea API.
       */
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          username: this.username,
          password: this.password,
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`OAuth2 token request failed: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
      };
      this.bearerToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in - 60) * 1000;
      return this.bearerToken;
    } catch (error) {
      throw new Error(
        `Failed to obtain Delinea OAuth2 token: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_secrets',
        description: 'Search for secrets in the vault',
        inputSchema: {
          type: 'object',
          properties: {
            search_text: {
              type: 'string',
              description: 'Text to search for in secret names and metadata',
            },
            secret_type: {
              type: 'string',
              description: 'Filter by secret type (password, key, certificate, etc.)',
            },
            folder_id: {
              type: 'number',
              description: 'Filter by folder ID',
            },
            is_exposed: {
              type: 'boolean',
              description: 'Filter by exposure status',
            },
            take: {
              type: 'number',
              description: 'Maximum results to return (default: 100, max: 1000)',
            },
            skip: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_secret',
        description: 'Get detailed information about a specific secret',
        inputSchema: {
          type: 'object',
          properties: {
            secret_id: {
              type: 'number',
              description: 'Unique secret identifier',
            },
            include_restricted_fields: {
              type: 'boolean',
              description: 'Include restricted/sensitive fields (default: false)',
            },
          },
          required: ['secret_id'],
        },
      },
      {
        name: 'list_folders',
        description: 'List folders/categories in the Secret Server',
        inputSchema: {
          type: 'object',
          properties: {
            parent_folder_id: {
              type: 'number',
              description: 'Filter by parent folder ID',
            },
            search_text: {
              type: 'string',
              description: 'Search for folder names',
            },
            take: {
              type: 'number',
              description: 'Maximum folders to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of folders to skip for pagination',
            },
          },
        },
      },
      {
        name: 'get_secret_audit',
        description: 'Get audit trail and activity logs for a secret',
        inputSchema: {
          type: 'object',
          properties: {
            secret_id: {
              type: 'number',
              description: 'Secret identifier to audit',
            },
            action_type: {
              type: 'string',
              description: 'Filter by action type (viewed, edited, accessed, etc.)',
            },
            start_date: {
              type: 'string',
              description: 'Start date for audit (ISO 8601 format)',
            },
            end_date: {
              type: 'string',
              description: 'End date for audit (ISO 8601 format)',
            },
            take: {
              type: 'number',
              description: 'Maximum audit records to return (default: 100)',
            },
          },
          required: ['secret_id'],
        },
      },
      {
        name: 'list_roles',
        description: 'List user roles and permissions in Secret Server',
        inputSchema: {
          type: 'object',
          properties: {
            search_text: {
              type: 'string',
              description: 'Search for role names',
            },
            take: {
              type: 'number',
              description: 'Maximum roles to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of roles to skip for pagination',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const token = await this.getOrRefreshToken();

      switch (name) {
        case 'search_secrets': {
          const searchText = args.search_text as string | undefined;
          const secretType = args.secret_type as string | undefined;
          const folderId = args.folder_id as number | undefined;
          const isExposed = args.is_exposed as boolean | undefined;
          const take = (args.take as number) || 100;
          const skip = (args.skip as number) || 0;

          let url = `${this.baseUrl}/secrets?take=${take}&skip=${skip}`;
          if (searchText) {
            url += `&searchText=${encodeURIComponent(searchText)}`;
          }
          if (secretType) {
            url += `&secretType=${encodeURIComponent(secretType)}`;
          }
          if (folderId !== undefined) {
            url += `&folderId=${folderId}`;
          }
          if (isExposed !== undefined) {
            url += `&isExposed=${isExposed}`;
          }

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search secrets: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Delinea returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_secret': {
          const secretId = args.secret_id as number;
          const includeRestrictedFields = args.include_restricted_fields as boolean | undefined;

          if (secretId === undefined) {
            return { content: [{ type: 'text', text: 'secret_id is required' }], isError: true };
          }

          let url = `${this.baseUrl}/secrets/${secretId}`;
          if (includeRestrictedFields) {
            url += `?includeRestrictedFields=${includeRestrictedFields}`;
          }

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get secret: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Delinea returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_folders': {
          const parentFolderId = args.parent_folder_id as number | undefined;
          const searchText = args.search_text as string | undefined;
          const take = (args.take as number) || 100;
          const skip = (args.skip as number) || 0;

          let url = `${this.baseUrl}/folders?take=${take}&skip=${skip}`;
          if (parentFolderId !== undefined) {
            url += `&parentFolderId=${parentFolderId}`;
          }
          if (searchText) {
            url += `&searchText=${encodeURIComponent(searchText)}`;
          }

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list folders: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Delinea returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_secret_audit': {
          const secretId = args.secret_id as number;
          const actionType = args.action_type as string | undefined;
          const startDate = args.start_date as string | undefined;
          const endDate = args.end_date as string | undefined;
          const take = (args.take as number) || 100;

          if (secretId === undefined) {
            return { content: [{ type: 'text', text: 'secret_id is required' }], isError: true };
          }

          let url = `${this.baseUrl}/secrets/${secretId}/audit?take=${take}`;
          if (actionType) url += `&actionType=${encodeURIComponent(actionType)}`;
          if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
          if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get secret audit: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Delinea returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_roles': {
          const searchText = args.search_text as string | undefined;
          const take = (args.take as number) || 100;
          const skip = (args.skip as number) || 0;

          let url = `${this.baseUrl}/roles?take=${take}&skip=${skip}`;
          if (searchText) {
            url += `&searchText=${encodeURIComponent(searchText)}`;
          }

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list roles: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Delinea returned non-JSON response (HTTP ${response.status})`);
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
