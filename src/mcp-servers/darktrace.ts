/**
 * Darktrace MCP Server Wrapper
 * Integrates Darktrace REST API for AI-driven threat detection and response
 * Base URL: https://{instance}.darktrace.com
 * Auth: HMAC signature (public_token + private_token + date-based HMAC-SHA1)
 
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { ToolDefinition, ToolResult } from './types.js';

import * as crypto from 'crypto';

interface DarktraceConfig {
  publicToken: string;
  privateToken: string;
  instance: string;
  baseUrl?: string;
}

export class DarktraceMCPServer {
  private readonly baseUrl: string;
  private readonly publicToken: string;
  private readonly privateToken: string;

  constructor(config: DarktraceConfig) {
    this.baseUrl = config.baseUrl || `https://${config.instance}.darktrace.com`;
    this.publicToken = config.publicToken;
    this.privateToken = config.privateToken;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List security alerts and breaches from Darktrace',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return',
            },
            offset: {
              type: 'number',
              description: 'Number of alerts to skip',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity (critical, high, medium, low)',
            },
            status: {
              type: 'string',
              description: 'Filter by status (acknowledged, unacknowledged, resolved)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get details of a specific alert by ID',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: {
              type: 'string',
              description: 'The alert ID',
            },
          },
          required: ['alertId'],
        },
      },
      {
        name: 'list_devices',
        description: 'List monitored devices and their security status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of devices to return',
            },
            offset: {
              type: 'number',
              description: 'Number of devices to skip',
            },
            status: {
              type: 'string',
              description: 'Filter by device status (active, inactive, suspicious)',
            },
          },
        },
      },
      {
        name: 'get_model_breaches',
        description: 'Get AI model breaches and anomalies detected',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of breaches to return',
            },
            offset: {
              type: 'number',
              description: 'Number of breaches to skip',
            },
            deviceId: {
              type: 'string',
              description: 'Filter by device ID',
            },
          },
        },
      },
      {
        name: 'get_ai_analyst_incidents',
        description: 'Get incidents analyzed by Darktrace AI Analyst',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of incidents to return',
            },
            offset: {
              type: 'number',
              description: 'Number of incidents to skip',
            },
            timespan: {
              type: 'number',
              description: 'Timespan in hours to query (default: 24)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_alerts':
          return await this.listAlerts(args);
        case 'get_alert':
          return await this.getAlert(args);
        case 'list_devices':
          return await this.listDevices(args);
        case 'get_model_breaches':
          return await this.getModelBreaches(args);
        case 'get_ai_analyst_incidents':
          return await this.getAIAnalystIncidents(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  /**
   * Generate HMAC-SHA1 signature for a given endpoint and timestamp.
   * Timestamp is passed in to ensure the same value is used in both the
   * signature and the Authorization header — eliminating a race condition
   * where two separate Date.now() calls could produce different values.
   */
  private generateHMACSignature(endpoint: string, timestamp: number): string {
    const message = `${endpoint}\n${this.publicToken}\n${timestamp}`;
    return crypto
      .createHmac('sha1', this.privateToken)
      .update(message)
      .digest('hex');
  }

  /**
   * Compute timestamp once, then pass it to generateHMACSignature so the
   * signature and Authorization header use the exact same value.
   */
  private getAuthHeaders(endpoint: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateHMACSignature(endpoint, timestamp);

    return {
      'Authorization': `DARKTRACE ${this.publicToken}:${signature}:${timestamp}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    if (args.severity) params.append('severity', String(args.severity));
    if (args.status) params.append('status', String(args.status));

    const endpoint = `/api/v3/alerts?${params.toString()}`;

    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      { method: 'GET', headers: this.getAuthHeaders(endpoint) }
    );

    if (!response.ok) {
      throw new Error(`Darktrace API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Darktrace returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const { alertId } = args;
    if (!alertId) {
      throw new Error('alertId is required');
    }

    const endpoint = `/api/v3/alerts/${encodeURIComponent(String(alertId))}`;

    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      { method: 'GET', headers: this.getAuthHeaders(endpoint) }
    );

    if (!response.ok) {
      throw new Error(`Darktrace API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Darktrace returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    if (args.status) params.append('status', String(args.status));

    const endpoint = `/api/v3/devices?${params.toString()}`;

    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      { method: 'GET', headers: this.getAuthHeaders(endpoint) }
    );

    if (!response.ok) {
      throw new Error(`Darktrace API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Darktrace returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getModelBreaches(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = args.limit || 50;
    const offset = args.offset || 0;

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    if (args.deviceId) params.append('deviceId', String(args.deviceId));

    const endpoint = `/api/v3/breaches?${params.toString()}`;

    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      { method: 'GET', headers: this.getAuthHeaders(endpoint) }
    );

    if (!response.ok) {
      throw new Error(`Darktrace API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Darktrace returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }

  private async getAIAnalystIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    const timespan = args.timespan || 24;

    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    params.append('timespan', String(timespan));

    const endpoint = `/api/v3/incidents?${params.toString()}`;

    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      { method: 'GET', headers: this.getAuthHeaders(endpoint) }
    );

    if (!response.ok) {
      throw new Error(`Darktrace API error: ${response.status} ${response.statusText}`);
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Darktrace returned non-JSON response (HTTP ${response.status})`); }
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      isError: false,
    };
  }
}
