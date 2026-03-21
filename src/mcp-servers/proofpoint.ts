/**
 * Proofpoint Threat Protection REST API MCP Server Wrapper
 * REST API: https://tap-api-v2.proofpoint.com
 * Auth: Basic authentication (service_principal:secret)
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

interface ProofpointAuthConfig {
  servicePrincipal: string;
  secret: string;
  /** API base URL. Defaults to the Proofpoint TAP production endpoint. */
  baseUrl?: string;
}

const PROOFPOINT_DEFAULT_BASE_URL = 'https://tap-api-v2.proofpoint.com';

export class ProofpointMCPServer {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: ProofpointAuthConfig) {
    this.baseUrl = config.baseUrl ?? PROOFPOINT_DEFAULT_BASE_URL;
    const credentials = Buffer.from(
      `${config.servicePrincipal}:${config.secret}`
    ).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  private async request(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `Proofpoint API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_clicks_blocked',
        description:
          'Retrieve list of clicks that were blocked by Proofpoint',
        inputSchema: {
          type: 'object',
          properties: {
            sinceSeconds: {
              type: 'number',
              description:
                'Return clicks after this time (seconds since epoch)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
              default: 100,
            },
          },
        },
      },
      {
        name: 'list_messages_blocked',
        description: 'Retrieve list of messages that were blocked',
        inputSchema: {
          type: 'object',
          properties: {
            sinceSeconds: {
              type: 'number',
              description: 'Return messages after this time (seconds since epoch)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
              default: 100,
            },
            threatType: {
              type: 'string',
              enum: ['malware', 'phish', 'spam', 'impostor'],
              description: 'Filter by threat type',
            },
          },
        },
      },
      {
        name: 'get_campaign',
        description:
          'Retrieve details about a specific malware or phishing campaign',
        inputSchema: {
          type: 'object',
          properties: {
            campaign_id: {
              type: 'string',
              description: 'Unique identifier for the campaign',
            },
          },
          required: ['campaign_id'],
        },
      },
      {
        name: 'list_forensics',
        description:
          'Retrieve forensic logs for security events (clicks and messages)',
        inputSchema: {
          type: 'object',
          properties: {
            event_type: {
              type: 'string',
              enum: ['click', 'message', 'attachment'],
              description: 'Type of forensic event',
            },
            sinceSeconds: {
              type: 'number',
              description: 'Return events after this time (seconds since epoch)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
              default: 100,
            },
          },
        },
      },
      {
        name: 'get_threat_detail',
        description: 'Get detailed threat intelligence for a specific threat',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: {
              type: 'string',
              description: 'Unique threat identifier (malware hash, etc.)',
            },
          },
          required: ['threat_id'],
        },
      },
    ];
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    try {
      let result: unknown;

      switch (name) {
        case 'list_clicks_blocked': {
          const params = new URLSearchParams();
          if (args.sinceSeconds) params.append('sinceSeconds', String(args.sinceSeconds));
          params.append('limit', String(args.limit || 100));
          result = await this.request(`/v2/siem/clicks/blocked?${params.toString()}`);
          break;
        }

        case 'list_messages_blocked': {
          const params = new URLSearchParams();
          if (args.sinceSeconds) params.append('sinceSeconds', String(args.sinceSeconds));
          if (args.threatType) params.append('threatType', String(args.threatType));
          params.append('limit', String(args.limit || 100));
          result = await this.request(`/v2/siem/messages/blocked?${params.toString()}`);
          break;
        }

        case 'get_campaign':
          result = await this.request(`/v2/campaigns/${encodeURIComponent(String(args.campaign_id))}`);
          break;

        case 'list_forensics': {
          const params = new URLSearchParams();
          if (args.event_type) params.append('type', String(args.event_type));
          if (args.sinceSeconds) params.append('sinceSeconds', String(args.sinceSeconds));
          params.append('limit', String(args.limit || 100));
          result = await this.request(`/v2/siem/forensics?${params.toString()}`);
          break;
        }

        case 'get_threat_detail': {
          const params = new URLSearchParams();
          params.append('id', String(args.threat_id));
          result = await this.request(`/v2/threat?${params.toString()}`);
          break;
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
}
