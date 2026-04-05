/**
 * Cisco Secure Endpoint MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Cisco Secure Endpoint MCP server was found on GitHub. CiscoDevNet has
// CiscoFMC-MCP-server-community (Firewall Management Center) but not Secure Endpoint/AMP.
//
// Base URL: https://api.amp.cisco.com (NA) | https://api.apjc.amp.cisco.com (APJC) | https://api.eu.amp.cisco.com (EU)
// Auth: OAuth2 client_credentials via XDR/IROH token endpoint. Token cached and refreshed 60s early.
//   Token endpoint (NA): https://visibility.amp.cisco.com/iroh/oauth2/token
//   Authorization: Basic base64(clientId:clientSecret), body: grant_type=client_credentials
// Umbrella Reporting v2 base: https://api.umbrella.com — separate OAuth2 credentials required.
// Docs: https://developer.cisco.com/docs/secure-endpoint/
// Rate limits: Not explicitly published. OAuth2 tokens expire in ~3600s; refresh 60s early.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

const SECURE_ENDPOINT_BASE: Record<string, string> = {
  na:   'https://api.amp.cisco.com',
  apjc: 'https://api.apjc.amp.cisco.com',
  eu:   'https://api.eu.amp.cisco.com',
};

const OAUTH2_TOKEN_ENDPOINT: Record<string, string> = {
  na:   'https://visibility.amp.cisco.com/iroh/oauth2/token',
  apjc: 'https://visibility.apjc.amp.cisco.com/iroh/oauth2/token',
  eu:   'https://visibility.eu.amp.cisco.com/iroh/oauth2/token',
};

const UMBRELLA_BASE_URL = 'https://api.umbrella.com';
const UMBRELLA_TOKEN_ENDPOINT = 'https://api.umbrella.com/auth/v2/oauth2/token';

interface OAuthToken {
  access_token: string;
  expires_at: number; // epoch ms
}

interface CiscoSecureConfig {
  /** ISO region key: 'na' | 'apjc' | 'eu'. Defaults to 'na'. */
  region?: string;
  /** OAuth2 client_id for Secure Endpoint (registered in Cisco XDR). */
  clientId: string;
  /** OAuth2 client_secret for Secure Endpoint. */
  clientSecret: string;
  /** OAuth2 client_id for Umbrella Reporting v2 (optional). */
  umbrellaClientId?: string;
  /** OAuth2 client_secret for Umbrella Reporting v2 (optional). */
  umbrellaClientSecret?: string;
}

export class CiscoSecureMCPServer extends MCPAdapterBase {
  private readonly region: string;
  private readonly secureEndpointBaseUrl: string;
  private readonly tokenEndpoint: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly umbrellaClientId: string | null;
  private readonly umbrellaClientSecret: string | null;

  private secureEndpointToken: OAuthToken | null = null;
  private umbrellaToken: OAuthToken | null = null;

  constructor(config: CiscoSecureConfig) {
    super();
    if (!config.clientId || !config.clientSecret) {
      throw new Error('CiscoSecureMCPServer: clientId and clientSecret are required');
    }
    this.region = config.region ?? 'na';
    this.secureEndpointBaseUrl = SECURE_ENDPOINT_BASE[this.region] ?? SECURE_ENDPOINT_BASE['na'];
    this.tokenEndpoint = OAUTH2_TOKEN_ENDPOINT[this.region] ?? OAUTH2_TOKEN_ENDPOINT['na'];
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.umbrellaClientId = config.umbrellaClientId ?? null;
    this.umbrellaClientSecret = config.umbrellaClientSecret ?? null;
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_computers',
        description: 'List endpoints (computers) registered in Cisco Secure Endpoint with optional hostname filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max number of computers to return (default 50, max 500)' },
            offset: { type: 'number', description: 'Zero-based start offset for pagination' },
            hostname: { type: 'string', description: 'Filter by hostname (partial match)' },
            group_guid: { type: 'string', description: 'Filter by endpoint group GUID' },
          },
        },
      },
      {
        name: 'get_computer',
        description: 'Get details for a specific endpoint by connector GUID, including OS, policy, last seen time, and threat status',
        inputSchema: {
          type: 'object',
          properties: {
            connector_guid: { type: 'string', description: 'Endpoint connector GUID' },
          },
          required: ['connector_guid'],
        },
      },
      {
        name: 'get_computer_trajectory',
        description: 'Get the file and network activity trajectory for a specific endpoint, showing what happened on the host over time',
        inputSchema: {
          type: 'object',
          properties: {
            connector_guid: { type: 'string', description: 'Endpoint connector GUID' },
            q: { type: 'string', description: 'Search query to filter trajectory events (filename, IP, SHA256, etc.)' },
            limit: { type: 'number', description: 'Max events to return (default 500)' },
            start_time: { type: 'string', description: 'ISO 8601 start time to filter trajectory events' },
            end_time: { type: 'string', description: 'ISO 8601 end time to filter trajectory events' },
          },
          required: ['connector_guid'],
        },
      },
      {
        name: 'isolate_computer',
        description: 'Isolate an infected endpoint from the network while maintaining Secure Endpoint cloud connectivity for investigation',
        inputSchema: {
          type: 'object',
          properties: {
            connector_guid: { type: 'string', description: 'Endpoint connector GUID to isolate' },
          },
          required: ['connector_guid'],
        },
      },
      {
        name: 'stop_isolation',
        description: 'De-isolate an endpoint, restoring full network access after an investigation is complete',
        inputSchema: {
          type: 'object',
          properties: {
            connector_guid: { type: 'string', description: 'Endpoint connector GUID to de-isolate' },
          },
          required: ['connector_guid'],
        },
      },
      {
        name: 'list_events',
        description: 'List security events (threats, detections, quarantines) from Cisco Secure Endpoint with optional type and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max events to return (default 50, max 500)' },
            offset: { type: 'number', description: 'Zero-based start offset for pagination' },
            event_type: { type: 'number', description: 'Filter by numeric event type ID' },
            connector_guid: { type: 'string', description: 'Filter events to a specific endpoint' },
            group_guid: { type: 'string', description: 'Filter events to a specific endpoint group' },
            start_date: { type: 'string', description: 'ISO 8601 start date for event filter' },
            end_date: { type: 'string', description: 'ISO 8601 end date for event filter' },
          },
        },
      },
      {
        name: 'list_event_types',
        description: 'List all available Cisco Secure Endpoint event type IDs and their human-readable names',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_groups',
        description: 'List all endpoint groups in Cisco Secure Endpoint, including group names, GUIDs, and policy assignments',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max groups to return (default 50)' },
            offset: { type: 'number', description: 'Zero-based start offset for pagination' },
          },
        },
      },
      {
        name: 'get_group',
        description: 'Get details for a specific endpoint group by GUID, including member count and policy assignment',
        inputSchema: {
          type: 'object',
          properties: {
            group_guid: { type: 'string', description: 'Endpoint group GUID' },
          },
          required: ['group_guid'],
        },
      },
      {
        name: 'list_policies',
        description: 'List all endpoint policies configured in Cisco Secure Endpoint with names, GUIDs, and types',
        inputSchema: {
          type: 'object',
          properties: {
            product: { type: 'string', description: 'Filter by product type: windows | mac | linux | android | ios | network (omit for all)' },
            limit: { type: 'number', description: 'Max policies to return (default 50)' },
            offset: { type: 'number', description: 'Zero-based start offset for pagination' },
          },
        },
      },
      {
        name: 'list_file_lists',
        description: 'List all custom file lists (allow lists and block lists) configured in Cisco Secure Endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Filter by list type: application_blocking | simple_custom_detections (omit for all)' },
          },
        },
      },
      {
        name: 'get_file_list',
        description: 'Get the contents of a specific file list by GUID, returning all SHA256 hashes and associated descriptions',
        inputSchema: {
          type: 'object',
          properties: {
            file_list_guid: { type: 'string', description: 'File list GUID' },
          },
          required: ['file_list_guid'],
        },
      },
      {
        name: 'get_computer_vulnerabilities',
        description: 'Get known vulnerabilities for a specific endpoint based on observed software inventory',
        inputSchema: {
          type: 'object',
          properties: {
            connector_guid: { type: 'string', description: 'Endpoint connector GUID' },
            limit: { type: 'number', description: 'Max vulnerabilities to return (default 50)' },
            offset: { type: 'number', description: 'Zero-based start offset for pagination' },
          },
          required: ['connector_guid'],
        },
      },
      {
        name: 'list_audit_logs',
        description: 'List Cisco Secure Endpoint admin audit log entries for account-level configuration and policy changes',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max audit log entries to return (default 50)' },
            offset: { type: 'number', description: 'Zero-based start offset for pagination' },
          },
        },
      },
      {
        name: 'query_umbrella_dns',
        description: 'Query Cisco Umbrella Reporting v2 DNS activity logs for resolved domains, blocked requests, and security categories',
        inputSchema: {
          type: 'object',
          properties: {
            start_time: { type: 'string', description: 'Start time as Unix epoch seconds' },
            end_time: { type: 'string', description: 'End time as Unix epoch seconds' },
            limit: { type: 'number', description: 'Max records to return (default 100)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_computers':
          return await this.listComputers(args);
        case 'get_computer':
          return await this.getComputer(args);
        case 'get_computer_trajectory':
          return await this.getComputerTrajectory(args);
        case 'isolate_computer':
          return await this.isolateComputer(args);
        case 'stop_isolation':
          return await this.stopIsolation(args);
        case 'list_events':
          return await this.listEvents(args);
        case 'list_event_types':
          return await this.listEventTypes();
        case 'list_groups':
          return await this.listGroups(args);
        case 'get_group':
          return await this.getGroup(args);
        case 'list_policies':
          return await this.listPolicies(args);
        case 'list_file_lists':
          return await this.listFileLists(args);
        case 'get_file_list':
          return await this.getFileList(args);
        case 'get_computer_vulnerabilities':
          return await this.getComputerVulnerabilities(args);
        case 'list_audit_logs':
          return await this.listAuditLogs(args);
        case 'query_umbrella_dns':
          return await this.queryUmbrellaDns(args);
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

  private async getSecureEndpointToken(): Promise<string> {
    const now = Date.now();
    if (this.secureEndpointToken && this.secureEndpointToken.expires_at > now + 60_000) {
      return this.secureEndpointToken.access_token;
    }
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await this.fetchWithRetry(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`Cisco Secure Endpoint OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const tokenData = await response.json() as Record<string, unknown>;
    const accessToken = tokenData['access_token'] as string;
    const expiresIn = (tokenData['expires_in'] as number) ?? 600;
    this.secureEndpointToken = { access_token: accessToken, expires_at: now + (expiresIn - 60) * 1000 };
    return accessToken;
  }

  private async getUmbrellaToken(): Promise<string> {
    if (!this.umbrellaClientId || !this.umbrellaClientSecret) {
      throw new Error('query_umbrella_dns requires umbrellaClientId and umbrellaClientSecret in config');
    }
    const now = Date.now();
    if (this.umbrellaToken && this.umbrellaToken.expires_at > now + 60_000) {
      return this.umbrellaToken.access_token;
    }
    const credentials = Buffer.from(`${this.umbrellaClientId}:${this.umbrellaClientSecret}`).toString('base64');
    const response = await this.fetchWithRetry(UMBRELLA_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`Cisco Umbrella OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const tokenData = await response.json() as Record<string, unknown>;
    const accessToken = tokenData['access_token'] as string;
    const expiresIn = (tokenData['expires_in'] as number) ?? 3600;
    this.umbrellaToken = { access_token: accessToken, expires_at: now + (expiresIn - 60) * 1000 };
    return accessToken;
  }

  private async secureGet(path: string): Promise<ToolResult> {
    const token = await this.getSecureEndpointToken();
    const response = await this.fetchWithRetry(`${this.secureEndpointBaseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Cisco Secure Endpoint API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Cisco Secure Endpoint returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async securePatch(path: string): Promise<ToolResult> {
    const token = await this.getSecureEndpointToken();
    const response = await this.fetchWithRetry(`${this.secureEndpointBaseUrl}${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Cisco Secure Endpoint API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async secureDelete(path: string): Promise<ToolResult> {
    const token = await this.getSecureEndpointToken();
    const response = await this.fetchWithRetry(`${this.secureEndpointBaseUrl}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Cisco Secure Endpoint API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  private async listComputers(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 50;
    const offset = (args.offset as number) || 0;
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (args.hostname) params.set('hostname', args.hostname as string);
    if (args.group_guid) params.set('group_guid[]', args.group_guid as string);
    return this.secureGet(`/v1/computers?${params.toString()}`);
  }

  private async getComputer(args: Record<string, unknown>): Promise<ToolResult> {
    const guid = args.connector_guid as string;
    if (!guid) return { content: [{ type: 'text', text: 'connector_guid is required' }], isError: true };
    return this.secureGet(`/v1/computers/${encodeURIComponent(guid)}`);
  }

  private async getComputerTrajectory(args: Record<string, unknown>): Promise<ToolResult> {
    const guid = args.connector_guid as string;
    if (!guid) return { content: [{ type: 'text', text: 'connector_guid is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.q) params.set('q', args.q as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.start_time) params.set('start_time', args.start_time as string);
    if (args.end_time) params.set('end_time', args.end_time as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.secureGet(`/v1/computers/${encodeURIComponent(guid)}/trajectory${qs}`);
  }

  private async isolateComputer(args: Record<string, unknown>): Promise<ToolResult> {
    const guid = args.connector_guid as string;
    if (!guid) return { content: [{ type: 'text', text: 'connector_guid is required' }], isError: true };
    return this.securePatch(`/v1/computers/${encodeURIComponent(guid)}/isolation`);
  }

  private async stopIsolation(args: Record<string, unknown>): Promise<ToolResult> {
    const guid = args.connector_guid as string;
    if (!guid) return { content: [{ type: 'text', text: 'connector_guid is required' }], isError: true };
    return this.secureDelete(`/v1/computers/${encodeURIComponent(guid)}/isolation`);
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    });
    if (args.event_type !== undefined) params.set('event_type[]', String(args.event_type));
    if (args.connector_guid) params.set('connector_guid[]', args.connector_guid as string);
    if (args.group_guid) params.set('group_guid[]', args.group_guid as string);
    if (args.start_date) params.set('start_date', args.start_date as string);
    if (args.end_date) params.set('end_date', args.end_date as string);
    return this.secureGet(`/v1/events?${params.toString()}`);
  }

  private async listEventTypes(): Promise<ToolResult> {
    return this.secureGet('/v1/event_types');
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    });
    return this.secureGet(`/v1/groups?${params.toString()}`);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const guid = args.group_guid as string;
    if (!guid) return { content: [{ type: 'text', text: 'group_guid is required' }], isError: true };
    return this.secureGet(`/v1/groups/${encodeURIComponent(guid)}`);
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    });
    if (args.product) params.set('product', args.product as string);
    return this.secureGet(`/v1/policies?${params.toString()}`);
  }

  private async listFileLists(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.type) params.set('type', args.type as string);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.secureGet(`/v1/file_lists${qs}`);
  }

  private async getFileList(args: Record<string, unknown>): Promise<ToolResult> {
    const guid = args.file_list_guid as string;
    if (!guid) return { content: [{ type: 'text', text: 'file_list_guid is required' }], isError: true };
    return this.secureGet(`/v1/file_lists/${encodeURIComponent(guid)}/files`);
  }

  private async getComputerVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    const guid = args.connector_guid as string;
    if (!guid) return { content: [{ type: 'text', text: 'connector_guid is required' }], isError: true };
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    });
    return this.secureGet(`/v1/computers/${encodeURIComponent(guid)}/vulnerabilities?${params.toString()}`);
  }

  private async listAuditLogs(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      limit: String((args.limit as number) || 50),
      offset: String((args.offset as number) || 0),
    });
    return this.secureGet(`/v1/audit_logs?${params.toString()}`);
  }

  private async queryUmbrellaDns(args: Record<string, unknown>): Promise<ToolResult> {
    const limit = (args.limit as number) || 100;
    const token = await this.getUmbrellaToken();
    const params = new URLSearchParams({ limit: String(limit) });
    if (args.start_time) params.set('from', args.start_time as string);
    if (args.end_time) params.set('to', args.end_time as string);
    const response = await this.fetchWithRetry(`${UMBRELLA_BASE_URL}/reports/v2/activity/dns?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `Cisco Umbrella Reporting API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => { throw new Error(`Cisco Umbrella returned non-JSON (HTTP ${response.status})`); });
    return { content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }], isError: false };
  }

  static catalog() {
    return {
      name: 'cisco-secure',
      displayName: 'Cisco Secure',
      version: '1.0.0',
      category: 'cybersecurity' as const,
      keywords: ['cisco-secure', 'cisco', 'secure', 'amp', 'endpoint', 'malware', 'edr', 'isolation', 'threat', 'vulnerability', 'umbrella', 'dns', 'event', 'policy', 'filelist'],
      toolNames: ['list_computers', 'get_computer', 'get_computer_trajectory', 'isolate_computer', 'stop_isolation', 'list_events', 'list_event_types', 'list_groups', 'get_group', 'list_policies', 'list_file_lists', 'get_file_list', 'get_computer_vulnerabilities', 'list_audit_logs', 'query_umbrella_dns'],
      description: 'Cisco Secure adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
