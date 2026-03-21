/**
 * SentinelOne MCP Server
 * Provides access to SentinelOne REST API endpoints for threat management and agent control
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface SentinelOneConfig {
  apiToken: string;
  instance: string;
  baseUrl?: string;
}

export class SentinelOneMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: SentinelOneConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || `https://${config.instance}.sentinelone.net`;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_threats',
        description: 'List threats with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of threats to return (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of threats to skip for pagination',
            },
            status: {
              type: 'string',
              description: 'Filter by threat status (active, resolved, dismissed)',
            },
            classification: {
              type: 'string',
              description: 'Filter by threat classification',
            },
          },
        },
      },
      {
        name: 'get_threat',
        description: 'Get detailed information about a specific threat',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'Unique threat identifier',
            },
          },
          required: ['threat_id'],
        },
      },
      {
        name: 'list_agents',
        description: 'List agents with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of agents to return (default: 50)',
            },
            skip: {
              type: 'number',
              description: 'Number of agents to skip for pagination',
            },
            health_status: {
              type: 'string',
              description: 'Filter by health status (healthy, unhealthy)',
            },
            os_type: {
              type: 'string',
              description: 'Filter by OS type (windows, linux, macos)',
            },
          },
        },
      },
      {
        name: 'get_agent',
        description: 'Get detailed information about a specific agent',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'Unique agent identifier',
            },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'mitigate_threat',
        description: 'Execute mitigation actions on a threat',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'Unique threat identifier',
            },
            action: {
              type: 'string',
              description: 'Action to perform (kill, quarantine, remediate, rollback)',
            },
          },
          required: ['threat_id', 'action'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `ApiToken ${this.apiToken}`,
        'Content-Type': 'application/json',
      };

      switch (name) {
        case 'list_threats': {
          const limit = (args.limit as number) || 50;
          const skip = (args.skip as number) || 0;
          const status = args.status as string | undefined;
          const classification = args.classification as string | undefined;

          let url = `${this.baseUrl}/web/api/v2.1/threats?limit=${limit}&skip=${skip}`;
          if (status) url += `&status=${encodeURIComponent(status)}`;
          if (classification) url += `&classification=${encodeURIComponent(classification)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list threats: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`SentinelOne returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_threat': {
          const threatId = args.threat_id as string;
          if (!threatId) {
            return { content: [{ type: 'text', text: 'threat_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/web/api/v2.1/threats/${encodeURIComponent(threatId)}`,
            { method: 'GET', headers }
          );

          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get threat: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`SentinelOne returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'list_agents': {
          const limit = (args.limit as number) || 50;
          const skip = (args.skip as number) || 0;
          const healthStatus = args.health_status as string | undefined;
          const osType = args.os_type as string | undefined;

          let url = `${this.baseUrl}/web/api/v2.1/agents?limit=${limit}&skip=${skip}`;
          if (healthStatus) url += `&healthStatus=${encodeURIComponent(healthStatus)}`;
          if (osType) url += `&osType=${encodeURIComponent(osType)}`;

          const response = await fetch(url, { method: 'GET', headers });

          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to list agents: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`SentinelOne returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'get_agent': {
          const agentId = args.agent_id as string;
          if (!agentId) {
            return { content: [{ type: 'text', text: 'agent_id is required' }], isError: true };
          }

          const response = await fetch(
            `${this.baseUrl}/web/api/v2.1/agents/${encodeURIComponent(agentId)}`,
            { method: 'GET', headers }
          );

          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to get agent: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`SentinelOne returned non-JSON response (HTTP ${response.status})`);
          }
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
        }

        case 'mitigate_threat': {
          const threatId = args.threat_id as string;
          const action = args.action as string;

          if (!threatId || !action) {
            return {
              content: [{ type: 'text', text: 'threat_id and action are required' }],
              isError: true,
            };
          }

          const response = await fetch(
            `${this.baseUrl}/web/api/v2.1/threats/${encodeURIComponent(threatId)}/mitigate`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({ action }),
            }
          );

          if (response.status === 401) {
            throw new Error('Auth token expired. Provide a new token.');
          }

          if (!response.ok) {
            return {
              content: [{ type: 'text', text: `Failed to mitigate threat: ${response.statusText}` }],
              isError: true,
            };
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new Error(`SentinelOne returned non-JSON response (HTTP ${response.status})`);
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
