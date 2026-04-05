/**
 * Sophos Central MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Sophos Central MCP server was found on GitHub or the Sophos developer portal.
// This adapter wraps the Sophos Central Partner/Tenant API v1 directly.
//
// Base URL: https://api.central.sophos.com (global whoami endpoint)
//   Regional API URLs are auto-detected via GET /whoami/v1 and cached per instance.
//   Tenant-scoped calls use: https://api-{region}.central.sophos.com
// Auth: OAuth2 client credentials — POST https://id.sophos.com/api/oauth2/v2/token
//   X-Tenant-ID header required on all tenant-scoped calls.
// Docs: https://developer.sophos.com/apis
// Rate limits: Not publicly documented; contact Sophos support for tenant-specific limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

const SOPHOS_GLOBAL_URL = 'https://api.central.sophos.com';
const SOPHOS_TOKEN_URL = 'https://id.sophos.com/api/oauth2/v2/token';

interface SophosConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  /**
   * Optional explicit regional base URL (e.g. https://api-us01.central.sophos.com).
   * When omitted the adapter calls GET /whoami/v1 on first invocation to auto-detect
   * the correct regional URL and caches the result for the lifetime of the instance.
   */
  dataRegion?: string;
}

interface WhoamiResponse {
  id: string;
  idType: string;
  apiHosts?: {
    global?: string;
    dataRegion?: string;
  };
}

export class SophosMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tenantId: string;
  private readonly dataRegionOverride: string | undefined;

  private resolvedRegionalUrl: string | null = null;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: SophosConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.tenantId = config.tenantId;
    this.dataRegionOverride = config.dataRegion;
  }

  static catalog() {
    return {
      name: 'sophos',
      displayName: 'Sophos',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['sophos', 'central', 'endpoint', 'antivirus', 'edr', 'alert', 'threat', 'isolate', 'tamper', 'scan', 'policy', 'xdr', 'intercept'],
      toolNames: [
        'list_alerts', 'get_alert', 'acknowledge_alert',
        'list_endpoints', 'get_endpoint', 'isolate_endpoint',
        'get_endpoint_tamper_protection', 'update_endpoint_tamper_protection',
        'scan_endpoint', 'list_endpoint_groups', 'get_account_health_check',
      ],
      description: 'Sophos Central endpoint security: manage alerts, endpoints, isolation, tamper protection, scanning, and endpoint groups across your tenant.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_alerts',
        description: 'List security alerts with optional filters for severity, category, and status — returns threat detections and policy violations',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 50, max: 100)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination cursor token from a previous response to fetch the next page',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: critical, high, medium, low',
            },
            category: {
              type: 'string',
              description: 'Filter by alert category (e.g. malware, pua, exploits, policy)',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'Get full details for a specific Sophos Central alert including product, severity, and recommended actions',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Unique alert identifier (UUID)',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'acknowledge_alert',
        description: 'Acknowledge a Sophos Central alert to indicate it has been reviewed and actioned',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Unique alert identifier (UUID) to acknowledge',
            },
            message: {
              type: 'string',
              description: 'Optional message explaining why the alert is being acknowledged',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'list_endpoints',
        description: 'List managed endpoints (computers and servers) with optional filters for health status, type, and OS platform',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of endpoints to return (default: 50, max: 500)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination cursor token from a previous response',
            },
            healthStatus: {
              type: 'string',
              description: 'Filter by health status: good, bad, suspicious, unknown',
            },
            type: {
              type: 'string',
              description: 'Filter by endpoint type: computer, server, securityVm',
            },
            tamperProtectionEnabled: {
              type: 'boolean',
              description: 'Filter by tamper protection state (true or false)',
            },
            lockdownStatus: {
              type: 'string',
              description: 'Filter by isolation status: isolated, notIsolated',
            },
          },
        },
      },
      {
        name: 'get_endpoint',
        description: 'Get detailed information about a specific endpoint including health, OS, assigned policies, and last active time',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Unique endpoint identifier (UUID)',
            },
          },
          required: ['endpoint_id'],
        },
      },
      {
        name: 'isolate_endpoint',
        description: 'Isolate or de-isolate an endpoint from the network — use to contain a compromised machine',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Unique endpoint identifier (UUID) to isolate or de-isolate',
            },
            isolationEnabled: {
              type: 'boolean',
              description: 'Set to true to isolate the endpoint, false to remove isolation (default: true)',
            },
            comment: {
              type: 'string',
              description: 'Optional comment explaining the reason for isolation',
            },
          },
          required: ['endpoint_id'],
        },
      },
      {
        name: 'get_endpoint_tamper_protection',
        description: 'Get the tamper protection status and one-time password for a specific endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Unique endpoint identifier (UUID)',
            },
          },
          required: ['endpoint_id'],
        },
      },
      {
        name: 'update_endpoint_tamper_protection',
        description: 'Enable or disable tamper protection on a specific endpoint to prevent unauthorized uninstallation',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Unique endpoint identifier (UUID)',
            },
            enabled: {
              type: 'boolean',
              description: 'Set to true to enable tamper protection, false to disable it',
            },
          },
          required: ['endpoint_id', 'enabled'],
        },
      },
      {
        name: 'scan_endpoint',
        description: 'Trigger an on-demand malware scan on a specific endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint_id: {
              type: 'string',
              description: 'Unique endpoint identifier (UUID) to scan',
            },
          },
          required: ['endpoint_id'],
        },
      },
      {
        name: 'list_endpoint_groups',
        description: 'List endpoint groups with their member counts and assigned policy information',
        inputSchema: {
          type: 'object',
          properties: {
            groupType: {
              type: 'string',
              description: 'Filter by group type: computer, server (default: all types)',
            },
            pageToken: {
              type: 'string',
              description: 'Pagination cursor token from a previous response',
            },
          },
        },
      },
      {
        name: 'get_account_health_check',
        description: 'Run an account health check to identify configuration issues with protection, policy, exclusions, and tamper protection',
        inputSchema: {
          type: 'object',
          properties: {
            checks: {
              type: 'string',
              description: 'Comma-separated check categories to run: protection, policy, exclusions, tamperProtection (default: all)',
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
        case 'acknowledge_alert':
          return await this.acknowledgeAlert(args);
        case 'list_endpoints':
          return await this.listEndpoints(args);
        case 'get_endpoint':
          return await this.getEndpoint(args);
        case 'isolate_endpoint':
          return await this.isolateEndpoint(args);
        case 'get_endpoint_tamper_protection':
          return await this.getEndpointTamperProtection(args);
        case 'update_endpoint_tamper_protection':
          return await this.updateEndpointTamperProtection(args);
        case 'scan_endpoint':
          return await this.scanEndpoint(args);
        case 'list_endpoint_groups':
          return await this.listEndpointGroups(args);
        case 'get_account_health_check':
          return await this.getAccountHealthCheck(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  /**
   * OAuth2 client credentials flow — token cached and refreshed 60s before expiry.
   */
  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const response = await this.fetchWithRetry(SOPHOS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'token',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Sophos OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  /**
   * Resolves the regional API base URL via /whoami/v1 and caches the result.
   */
  private async getRegionalUrl(): Promise<string> {
    if (this.dataRegionOverride) {
      return this.dataRegionOverride.replace(/\/$/, '');
    }
    if (this.resolvedRegionalUrl) {
      return this.resolvedRegionalUrl;
    }

    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${SOPHOS_GLOBAL_URL}/whoami/v1`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Sophos whoami failed (HTTP ${response.status}): ${response.statusText}. Provide dataRegion in config.`);
    }

    const whoami = await response.json() as WhoamiResponse;
    const regional = whoami.apiHosts?.dataRegion;
    if (!regional) {
      throw new Error('Sophos whoami did not return apiHosts.dataRegion. Provide dataRegion in config.');
    }

    this.resolvedRegionalUrl = regional.replace(/\/$/, '');
    return this.resolvedRegionalUrl;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': this.tenantId,
      'Content-Type': 'application/json',
    };
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    const baseUrl = await this.getRegionalUrl();
    const headers = await this.authHeaders();
    const limit = (args.limit as number) ?? 50;
    let url = `${baseUrl}/common/v1/alerts?limit=${limit}`;
    if (args.pageToken) url += `&pageToken=${encodeURIComponent(args.pageToken as string)}`;
    if (args.severity) url += `&severity=${encodeURIComponent(args.severity as string)}`;
    if (args.category) url += `&category=${encodeURIComponent(args.category as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list alerts: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const alertId = args.alert_id as string;
    if (!alertId) {
      return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    }
    const baseUrl = await this.getRegionalUrl();
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${baseUrl}/common/v1/alerts/${encodeURIComponent(alertId)}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get alert: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async acknowledgeAlert(args: Record<string, unknown>): Promise<ToolResult> {
    const alertId = args.alert_id as string;
    if (!alertId) {
      return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    }
    const baseUrl = await this.getRegionalUrl();
    const headers = await this.authHeaders();
    const body: Record<string, string> = { action: 'acknowledge' };
    if (args.message) body.message = args.message as string;

    const response = await this.fetchWithRetry(`${baseUrl}/common/v1/alerts/${encodeURIComponent(alertId)}/actions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to acknowledge alert: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
    const baseUrl = await this.getRegionalUrl();
    const headers = await this.authHeaders();
    const limit = (args.limit as number) ?? 50;
    let url = `${baseUrl}/endpoint/v1/endpoints?pageSize=${limit}`;
    if (args.pageToken) url += `&pageToken=${encodeURIComponent(args.pageToken as string)}`;
    if (args.healthStatus) url += `&healthStatus=${encodeURIComponent(args.healthStatus as string)}`;
    if (args.type) url += `&type=${encodeURIComponent(args.type as string)}`;
    if (typeof args.tamperProtectionEnabled === 'boolean') url += `&tamperProtectionEnabled=${encodeURIComponent(String(args.tamperProtectionEnabled))}`;
    if (args.lockdownStatus) url += `&lockdownStatus=${encodeURIComponent(args.lockdownStatus as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list endpoints: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointId = args.endpoint_id as string;
    if (!endpointId) {
      return { content: [{ type: 'text', text: 'endpoint_id is required' }], isError: true };
    }
    const baseUrl = await this.getRegionalUrl();
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${baseUrl}/endpoint/v1/endpoints/${encodeURIComponent(endpointId)}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get endpoint: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async isolateEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointId = args.endpoint_id as string;
    if (!endpointId) {
      return { content: [{ type: 'text', text: 'endpoint_id is required' }], isError: true };
    }
    const isolationEnabled = args.isolationEnabled !== false;
    const baseUrl = await this.getRegionalUrl();
    const headers = await this.authHeaders();
    const body: Record<string, unknown> = { isolationEnabled };
    if (args.comment) body.comment = args.comment as string;

    const response = await this.fetchWithRetry(`${baseUrl}/endpoint/v1/endpoints/${encodeURIComponent(endpointId)}/isolation`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to isolate endpoint: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getEndpointTamperProtection(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointId = args.endpoint_id as string;
    if (!endpointId) {
      return { content: [{ type: 'text', text: 'endpoint_id is required' }], isError: true };
    }
    const baseUrl = await this.getRegionalUrl();
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${baseUrl}/endpoint/v1/endpoints/${encodeURIComponent(endpointId)}/tamper-protection`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get tamper protection: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateEndpointTamperProtection(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointId = args.endpoint_id as string;
    const enabled = args.enabled as boolean;
    if (!endpointId) {
      return { content: [{ type: 'text', text: 'endpoint_id is required' }], isError: true };
    }
    if (typeof enabled !== 'boolean') {
      return { content: [{ type: 'text', text: 'enabled (boolean) is required' }], isError: true };
    }
    const baseUrl = await this.getRegionalUrl();
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${baseUrl}/endpoint/v1/endpoints/${encodeURIComponent(endpointId)}/tamper-protection`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ enabled }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to update tamper protection: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async scanEndpoint(args: Record<string, unknown>): Promise<ToolResult> {
    const endpointId = args.endpoint_id as string;
    if (!endpointId) {
      return { content: [{ type: 'text', text: 'endpoint_id is required' }], isError: true };
    }
    const baseUrl = await this.getRegionalUrl();
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${baseUrl}/endpoint/v1/endpoints/${encodeURIComponent(endpointId)}/scans`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to trigger scan: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEndpointGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const baseUrl = await this.getRegionalUrl();
    const headers = await this.authHeaders();
    let url = `${baseUrl}/endpoint/v1/endpoint-groups`;
    const params: string[] = [];
    if (args.groupType) params.push(`groupType=${encodeURIComponent(args.groupType as string)}`);
    if (args.pageToken) params.push(`pageToken=${encodeURIComponent(args.pageToken as string)}`);
    if (params.length > 0) url += '?' + params.join('&');

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to list endpoint groups: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getAccountHealthCheck(args: Record<string, unknown>): Promise<ToolResult> {
    const baseUrl = await this.getRegionalUrl();
    const headers = await this.authHeaders();
    let url = `${baseUrl}/account-health-check/v1/health-check`;
    if (args.checks) url += `?checks=${encodeURIComponent(args.checks as string)}`;

    const response = await this.fetchWithRetry(url, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Failed to get account health check: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
