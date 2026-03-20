/**
 * VMware Carbon Black Cloud MCP Server
 * Provides access to Carbon Black Cloud REST API endpoints for alert and process management
 */

import { ToolDefinition, ToolResult } from './types.js';

interface CarbonBlackConfig {
  apiKey: string;
  connectorId: string;
  baseUrl?: string;
}

export class CarbonBlackMCPServer {
  // Finding #11: Composed auth token stored as a single value; individual components discarded
  private readonly authToken: string;
  private readonly baseUrl: string;

  constructor(config: CarbonBlackConfig) {
    // Finding #11: compose once in constructor, never store apiKey/connectorId separately
    this.authToken = `${config.apiKey}/${config.connectorId}`;
    this.baseUrl = config.baseUrl || 'https://defense.conferdeploy.net';
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
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity (critical, high, medium, low)',
            },
            status: {
              type: 'string',
              description: 'Filter by alert status (open, resolved, dismissed)',
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
        name: 'search_processes',
        description: 'Search for processes across managed endpoints',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Process search query (process name, path, hash)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
            start_time: {
              type: 'number',
              description: 'Start timestamp for process search',
            },
            end_time: {
              type: 'number',
              description: 'End timestamp for process search',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_watchlists',
        description: 'List configured watchlists for threat detection',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of watchlists to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
      {
        name: 'start_live_response',
        description: 'Initiate a live response session on an endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Unique endpoint/device identifier',
            },
            session_timeout: {
              type: 'number',
              description: 'Session timeout in seconds (default: 300)',
            },
          },
          required: ['device_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      // Finding #11: use the pre-composed authToken
      const headers: Record<string, string> = {
        'X-Auth-Token': this.authToken,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_alerts': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          const severity = args.severity as string | undefined;
          const status = args.status as string | undefined;

          let url = `${this.baseUrl}/api/v7/alerts?limit=${limit}&offset=${offset}`;
          if (severity) {
            url += `&severity=${encodeURIComponent(severity)}`;
          }
          if (status) {
            url += `&status=${encodeURIComponent(status)}`;
          }

          const response = await fetch(url, {
            method: 'GET',
            headers,
          });

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
            throw new Error(`Carbon Black returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_alert': {
          const alertId = args.alert_id as string;
          if (!alertId) {
            return {
              content: [{ type: 'text', text: 'alert_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(`${this.baseUrl}/api/v7/alerts/${encodeURIComponent(alertId)}`, {
            method: 'GET',
            headers,
          });

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
            throw new Error(`Carbon Black returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'search_processes': {
          const query = args.query as string;
          const limit = (args.limit as number) || 50;
          const startTime = args.start_time as number | undefined;
          const endTime = args.end_time as number | undefined;

          if (!query) {
            return {
              content: [{ type: 'text', text: 'query is required' }],
              isError: true,
            };
          }

          const requestBody: Record<string, unknown> = { query, limit };

          if (startTime !== undefined) {
            requestBody.start_time = startTime;
          }
          if (endTime !== undefined) {
            requestBody.end_time = endTime;
          }

          const response = await fetch(`${this.baseUrl}/api/v7/processes/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to search processes: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Carbon Black returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_watchlists': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;

          const response = await fetch(
            `${this.baseUrl}/api/v7/watchlists?limit=${limit}&offset=${offset}`,
            {
              method: 'GET',
              headers,
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list watchlists: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Carbon Black returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'start_live_response': {
          const deviceId = args.device_id as string;
          const sessionTimeout = (args.session_timeout as number) || 300;

          if (!deviceId) {
            return {
              content: [{ type: 'text', text: 'device_id is required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/api/v7/devices/${encodeURIComponent(deviceId)}/live-response/session`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({ session_timeout: sessionTimeout }),
            }
          );

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to start live response: ${response.statusText}` }],
              isError: true,
            };
          }

          // Finding #19
          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`Carbon Black returned non-JSON response (HTTP ${response.status})`);
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
