/**
 * Sophos Central MCP Server
 * Provides access to Sophos Central REST API endpoints for alert and endpoint management
 */

import { ToolDefinition, ToolResult } from './types.js';

interface SophosConfig {
  bearerToken: string;
  tenantId: string;
  baseUrl?: string;
}

export class SophosMCPServer {
  private readonly bearerToken: string;
  private readonly tenantId: string;
  private readonly baseUrl: string;

  constructor(config: SophosConfig) {
    this.bearerToken = config.bearerToken;
    this.tenantId = config.tenantId;
    this.baseUrl = config.baseUrl || 'https://api.central.sophos.com';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List security alerts with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 50)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token for retrieving next page',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity (critical, high, medium, low)',
            },
            status: {
              type: 'string',
              description: 'Filter by status (active, acknowledged, resolved)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get detailed information about a specific alert',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Unique alert identifier',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'list_endpoints',
        description: 'List endpoints managed by Sophos Central',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of endpoints to return (default: 50)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination token for retrieving next page',
            },
            health_status: {
              type: 'string',
              description: 'Filter by health status (good, bad, suspicious)',
            },
            type: {
              type: 'string',
              description: 'Filter by endpoint type (computer, server)',
            },
          },
        },
      },
      {
        name: 'get_endpoint',
        description: 'Get detailed information about a specific endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Unique endpoint identifier',
            },
          },
          required: ['endpoint_id'],
        },
      },
      {
        name: 'isolate_endpoint',
        description: 'Isolate an endpoint from network communication',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Unique endpoint identifier',
            },
            isolation_enabled: {
              type: 'boolean',
              description: 'Whether to enable or disable isolation (default: true)',
            },
          },
          required: ['endpoint_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.bearerToken}`,
        'X-Tenant-ID': this.tenantId,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_alerts': {
          const limit = (args.limit as number) || 50;
          const pageToken = args.pageToken as string | undefined;
          const severity = args.severity as string | undefined;
          const status = args.status as string | undefined;

          let url = `${this.baseUrl}/common/v1/alerts?limit=${limit}`;
          if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
          if (severity) url += `&severity=${encodeURIComponent(severity)}`;
          if (status) url += `&status=${encodeURIComponent(status)}`;

          const response = await fetch(url, { method: 'GET', headers });

          // Finding #21: Static bearer token — on 401 throw clear error (no auto-refresh possible)
          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list alerts: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Sophos returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_alert': {
          const alertId = args.alert_id as string;
          if (!alertId) {
            return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
          }

          const response = await fetch(`${this.baseUrl}/common/v1/alerts/${encodeURIComponent(alertId)}`, {
            method: 'GET',
            headers,
          });

          // Finding #21
          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get alert: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Sophos returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_endpoints': {
          const limit = (args.limit as number) || 50;
          const pageToken = args.pageToken as string | undefined;
          const healthStatus = args.health_status as string | undefined;
          const type = args.type as string | undefined;

          let url = `${this.baseUrl}/endpoint/v1/endpoints?limit=${limit}`;
          if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
          if (healthStatus) url += `&healthStatus=${encodeURIComponent(healthStatus)}`;
          if (type) url += `&type=${encodeURIComponent(type)}`;

          const response = await fetch(url, { method: 'GET', headers });

          // Finding #21
          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list endpoints: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Sophos returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_endpoint': {
          const endpointId = args.endpoint_id as string;
          if (!endpointId) {
            return { content: [{ type: 'text', text: 'endpoint_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/endpoint/v1/endpoints/${encodeURIComponent(endpointId)}`,
            { method: 'GET', headers }
          );

          // Finding #21
          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get endpoint: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Sophos returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'isolate_endpoint': {
          const endpointId = args.endpoint_id as string;
          const isolationEnabled = args.isolation_enabled !== false;

          if (!endpointId) {
            return { content: [{ type: 'text', text: 'endpoint_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/endpoint/v1/endpoints/${encodeURIComponent(endpointId)}/isolation`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ isolationEnabled }),
            }
          );

          // Finding #21
          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to isolate endpoint: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Sophos returned non-JSON response (HTTP ${response.status})`);
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
