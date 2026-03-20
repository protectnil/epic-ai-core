/**
 * CrowdStrike Identity Protection MCP Server
 * Provides access to CrowdStrike Identity Protection REST API endpoints for identity threat detection
 */

import { ToolDefinition, ToolResult } from './types.js';

interface CrowdStrikeIdentityConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

// Finding #5: FQL injection prevention — escape single quotes in FQL values
function escapeFql(value: string): string {
  return value.replace(/'/g, "\\'");
}

export class CrowdStrikeIdentityMCPServer {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: CrowdStrikeIdentityConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.crowdstrike.com';
  }

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    try {
      const authHeader = btoa(`${this.clientId}:${this.clientSecret}`);
      const response = await fetch(`${this.baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
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
        `Failed to obtain CrowdStrike Identity OAuth2 token: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_identity_detections',
        description: 'List identity-based threats and detections',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of detections to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
            filter: {
              type: 'string',
              description: 'Filter expression for identity detections',
            },
            sort: {
              type: 'string',
              description: 'Sort order for results',
            },
          },
        },
      },
      {
        name: 'get_identity_detection',
        description: 'Get detailed information about a specific identity detection',
        inputSchema: {
          type: 'object',
          properties: {
            detection_id: {
              type: 'string',
              description: 'Unique identity detection identifier',
            },
          },
          required: ['detection_id'],
        },
      },
      {
        name: 'search_compromised_credentials',
        description: 'Search for compromised credentials and credential exposures',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username or email to search for',
            },
            domain: {
              type: 'string',
              description: 'Domain filter for credentials',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
      {
        name: 'get_lateral_movement',
        description: 'Get lateral movement analysis and risk assessment for identity threats',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'Identity entity identifier',
            },
            entity_type: {
              type: 'string',
              description: 'Type of entity (user, service_account, etc.)',
            },
            time_window: {
              type: 'string',
              description: 'Time window for analysis (e.g., "24h", "7d")',
            },
          },
          required: ['entity_id'],
        },
      },
      {
        name: 'list_identity_entities',
        description: 'List identity entities (users, service accounts, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            entity_type: {
              type: 'string',
              description: 'Filter by entity type (user, service_account, privileged_account)',
            },
            risk_level: {
              type: 'string',
              description: 'Filter by risk level (critical, high, medium, low)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of entities to return (default: 50)',
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
      const token = await this.getOrRefreshToken();

      switch (name) {
        case 'list_identity_detections': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          const filter = args.filter as string | undefined;
          const sort = args.sort as string | undefined;

          let url = `${this.baseUrl}/identity-protection/queries/detections/v1?limit=${limit}&offset=${offset}`;
          if (filter) {
            url += `&filter=${encodeURIComponent(filter)}`;
          }
          if (sort) {
            url += `&sort=${encodeURIComponent(sort)}`;
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
              content: [{ type: 'text', text: `Failed to list identity detections: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`CrowdStrike Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_identity_detection': {
          const detectionId = args.detection_id as string;
          if (!detectionId) {
            return {
              content: [{ type: 'text', text: 'detection_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/identity-protection/entities/detections/GET/v1?ids=${encodeURIComponent(detectionId)}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get identity detection: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`CrowdStrike Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_compromised_credentials': {
          const username = args.username as string | undefined;
          const domain = args.domain as string | undefined;
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;

          // Finding #5: use escapeFql() on all user-supplied FQL values
          let filter = '';
          if (username) {
            filter += `username:'${escapeFql(username)}'`;
          }
          if (domain) {
            if (filter) filter += ' AND ';
            filter += `domain:'${escapeFql(domain)}'`;
          }

          let url = `${this.baseUrl}/identity-protection/queries/compromised-credentials/v1?limit=${limit}&offset=${offset}`;
          if (filter) {
            url += `&filter=${encodeURIComponent(filter)}`;
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
              content: [{ type: 'text', text: `Failed to search compromised credentials: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`CrowdStrike Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_lateral_movement': {
          const entityId = args.entity_id as string;
          const entityType = (args.entity_type as string) || 'user';
          const timeWindow = (args.time_window as string) || '24h';

          if (!entityId) {
            return {
              content: [{ type: 'text', text: 'entity_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/identity-protection/entities/lateral-movement/GET/v1?entity_id=${encodeURIComponent(entityId)}&entity_type=${encodeURIComponent(entityType)}&time_window=${encodeURIComponent(timeWindow)}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get lateral movement analysis: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`CrowdStrike Identity returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_identity_entities': {
          const entityType = args.entity_type as string | undefined;
          const riskLevel = args.risk_level as string | undefined;
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;

          // Finding #5: use escapeFql() on all user-supplied FQL values
          let filter = '';
          if (entityType) {
            filter += `entity_type:'${escapeFql(entityType)}'`;
          }
          if (riskLevel) {
            if (filter) filter += ' AND ';
            filter += `risk_level:'${escapeFql(riskLevel)}'`;
          }

          let url = `${this.baseUrl}/identity-protection/queries/entities/v1?limit=${limit}&offset=${offset}`;
          if (filter) {
            url += `&filter=${encodeURIComponent(filter)}`;
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
              content: [{ type: 'text', text: `Failed to list identity entities: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`CrowdStrike Identity returned non-JSON response (HTTP ${response.status})`);
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
