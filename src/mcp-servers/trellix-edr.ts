/**
 * Trellix EDR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Trellix EDR MCP server was found on GitHub or npm as of 2026-03-28.
//
// Base URL (regional, select by data center):
//   US-West (default): https://api.soc.trellix.com
//   US-East:           https://api.soc.us-east-1.trellix.com
//   EU Frankfurt:      https://api.soc.eu-central-1.trellix.com
//   AP Sydney:         https://api.soc.ap-southeast-2.trellix.com
//   AP Tokyo:          https://api.soc.ap-northeast-1.trellix.com
//   AP Singapore:      https://api.soc.ap-southeast-1.trellix.com
//
// Auth: OAuth2 client_credentials — IAM endpoint: https://iam.manage.trellix.com/iam/v1.1/token
//   Required scope: soc.act.tg
//   Credentials (client_id, client_secret) created at: https://uam.ui.trellix.com/clientcreds.html
//   IMPORTANT: All API calls require TWO auth headers:
//     1. Authorization: Bearer {access_token}  (from IAM token endpoint above)
//     2. x-api-key: {api_key}  (from Trellix on-boarding email or API Access Management page)
//   Content-Type for all requests MUST be: application/vnd.api+json  (not application/json)
// Docs: https://docs.trellix.com/bundle/mvision-endpoint-detection-and-response-product-guide
//       https://developer.manage.trellix.com/mvision/apis/home
// Rate limits: See https://docs.trellix.com/bundle/mvision-endpoint-detection-and-response-product-guide
//   (documented per endpoint in Trellix EDR API rate limits page)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TrellixEDRConfig {
  clientId: string;
  clientSecret: string;
  apiKey: string;
  region?: string;
  baseUrl?: string;
}

const REGION_MAP: Record<string, string> = {
  'us-west':        'https://api.soc.trellix.com',
  'us-east':        'https://api.soc.us-east-1.trellix.com',
  'eu-central':     'https://api.soc.eu-central-1.trellix.com',
  'ap-southeast-2': 'https://api.soc.ap-southeast-2.trellix.com',
  'ap-northeast-1': 'https://api.soc.ap-northeast-1.trellix.com',
  'ap-southeast-1': 'https://api.soc.ap-southeast-1.trellix.com',
};

export class TrellixEDRMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly iamUrl = 'https://iam.manage.trellix.com/iam/v1.1/token';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: TrellixEDRConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.apiKey = config.apiKey;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/$/, '');
    } else {
      this.baseUrl = REGION_MAP[config.region ?? 'us-west'] ?? 'https://api.soc.trellix.com';
    }
  }

  static catalog() {
    return {
      name: 'trellix-edr',
      displayName: 'Trellix EDR',
      version: '2.0.0',
      category: 'cybersecurity' as const,
      keywords: [
        'trellix', 'edr', 'endpoint detection response', 'MVISION', 'mcafee',
        'threat', 'malware', 'alert', 'investigation', 'device', 'endpoint',
        'quarantine', 'isolate', 'response', 'forensics', 'hunt',
      ],
      toolNames: [
        'list_threats', 'get_threat',
        'list_devices', 'get_device',
        'list_investigations', 'get_investigation', 'create_investigation',
        'list_action_history',
        'isolate_device', 'release_device',
        'quarantine_file',
        'list_searches', 'create_search', 'get_search_results',
      ],
      description: 'Endpoint detection and response: manage threats, devices, investigations, and execute response actions via Trellix EDR v2 API.',
      author: 'protectnil' as const,
    };
  }

  // ──────────────────────────────────────────────
  // OAuth2 client credentials — IAM endpoint
  // ──────────────────────────────────────────────
  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now) {
      return this.accessToken;
    }
    const response = await this.fetchWithRetry(this.iamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'soc.act.tg',
      }).toString(),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Trellix IAM token request failed: ${response.status} ${errText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  // ──────────────────────────────────────────────
  // HTTP helper — throws on non-OK
  // ──────────────────────────────────────────────
  private async req(path: string, method = 'GET', body?: unknown): Promise<unknown> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'x-api-key': this.apiKey,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`Trellix EDR API error ${response.status}: ${errText}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : { ok: true };
  }

  // ──────────────────────────────────────────────
  // Truncation helper
  // ──────────────────────────────────────────────
  get tools(): ToolDefinition[] {
    return [
      // ── Threats ──────────────────────────────────
      {
        name: 'list_threats',
        description: 'List threat detections from Trellix EDR monitoring dashboard with optional severity and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            severity: { type: 'string', description: 'Filter by severity: critical, high, medium, low' },
            status: { type: 'string', description: 'Filter by threat status: new, investigating, resolved' },
            filter: { type: 'string', description: 'Additional filter expression (e.g., "hostname:workstation-01")' },
            limit: { type: 'number', description: 'Maximum threats to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_threat',
        description: 'Retrieve full details for a specific threat detection by its Trellix EDR threat ID',
        inputSchema: {
          type: 'object',
          properties: {
            threat_id: { type: 'string', description: 'Trellix EDR threat ID' },
          },
          required: ['threat_id'],
        },
      },
      // ── Devices ──────────────────────────────────
      {
        name: 'list_devices',
        description: 'Search and list endpoints/devices registered with Trellix EDR, filterable by hostname, OS, or connection status',
        inputSchema: {
          type: 'object',
          properties: {
            filter: { type: 'string', description: 'Filter expression (e.g., "hostname:laptop-001" or "status:online" or "os:Windows")' },
            limit: { type: 'number', description: 'Maximum devices to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Retrieve full details for a specific endpoint/device by its Trellix EDR device ID',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'string', description: 'Trellix EDR device/endpoint ID' },
          },
          required: ['device_id'],
        },
      },
      // ── Investigations ───────────────────────────
      {
        name: 'list_investigations',
        description: 'List active and historical investigations in Trellix EDR with optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: open, investigating, resolved, closed' },
            limit: { type: 'number', description: 'Maximum investigations to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_investigation',
        description: 'Retrieve full details, timeline, and associated artifacts for a specific investigation by ID',
        inputSchema: {
          type: 'object',
          properties: {
            investigation_id: { type: 'string', description: 'Trellix EDR investigation ID' },
          },
          required: ['investigation_id'],
        },
      },
      {
        name: 'create_investigation',
        description: 'Create a new investigation in Trellix EDR, optionally linked to a threat or device',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Investigation name or title' },
            threat_id: { type: 'string', description: 'Optional threat ID to associate with this investigation' },
            device_id: { type: 'string', description: 'Optional device ID to scope the investigation' },
            priority: { type: 'string', description: 'Priority: critical, high, medium, low (default: medium)' },
            description: { type: 'string', description: 'Description of the investigation scope and purpose' },
          },
          required: ['name'],
        },
      },
      // ── Action History ───────────────────────────
      {
        name: 'list_action_history',
        description: 'Retrieve the log of completed response actions (isolations, quarantines, cleanups) performed in Trellix EDR',
        inputSchema: {
          type: 'object',
          properties: {
            action_type: { type: 'string', description: 'Filter by action type: isolate, release, quarantine, cleanup' },
            device_id: { type: 'string', description: 'Filter actions performed on a specific device ID' },
            limit: { type: 'number', description: 'Maximum action records to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      // ── Response Actions ─────────────────────────
      {
        name: 'isolate_device',
        description: 'Network-isolate an endpoint to contain a threat — blocks all network traffic while preserving EDR communication',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'string', description: 'Trellix EDR device ID to isolate' },
            comment: { type: 'string', description: 'Reason for isolation (recorded in action history)' },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'release_device',
        description: 'Remove network isolation from a previously isolated endpoint to restore normal connectivity',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'string', description: 'Trellix EDR device ID to release from isolation' },
            comment: { type: 'string', description: 'Reason for releasing isolation (recorded in action history)' },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'quarantine_file',
        description: 'Quarantine a specific file on an endpoint by SHA-256 hash and device ID to stop execution',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'string', description: 'Trellix EDR device ID where the file resides' },
            file_hash: { type: 'string', description: 'SHA-256 hash of the file to quarantine' },
            file_path: { type: 'string', description: 'Full path to the file on the endpoint (for disambiguation)' },
            comment: { type: 'string', description: 'Reason for quarantine (recorded in action history)' },
          },
          required: ['device_id', 'file_hash'],
        },
      },
      // ── Hunt / Search ────────────────────────────
      {
        name: 'list_searches',
        description: 'List previously executed threat hunting searches and their status/results',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by search status: running, completed, failed' },
            limit: { type: 'number', description: 'Maximum searches to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'create_search',
        description: 'Create a new threat hunting search query across endpoints in Trellix EDR',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query expression (e.g., process name, file hash, registry key)' },
            query_type: { type: 'string', description: 'Query type: process, file, network, registry (default: process)' },
            device_ids: {
              type: 'array',
              description: 'Optional array of device IDs to scope the search; searches all devices if omitted',
              items: { type: 'string' },
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_search_results',
        description: 'Retrieve the results of a completed threat hunting search by search ID',
        inputSchema: {
          type: 'object',
          properties: {
            search_id: { type: 'string', description: 'Trellix EDR search ID returned from create_search' },
            limit: { type: 'number', description: 'Maximum result records to return (default: 100)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['search_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_threats':        return await this.listThreats(args);
        case 'get_threat':          return await this.getThreat(args);
        case 'list_devices':        return await this.listDevices(args);
        case 'get_device':          return await this.getDevice(args);
        case 'list_investigations': return await this.listInvestigations(args);
        case 'get_investigation':   return await this.getInvestigation(args);
        case 'create_investigation':return await this.createInvestigation(args);
        case 'list_action_history': return await this.listActionHistory(args);
        case 'isolate_device':      return await this.isolateDevice(args);
        case 'release_device':      return await this.releaseDevice(args);
        case 'quarantine_file':     return await this.quarantineFile(args);
        case 'list_searches':       return await this.listSearches(args);
        case 'create_search':       return await this.createSearch(args);
        case 'get_search_results':  return await this.getSearchResults(args);
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

  // ── Private tool methods ──────────────────────

  private async listThreats(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.severity) params.set('severity', args.severity as string);
    if (args.status) params.set('status', args.status as string);
    if (args.filter) params.set('filter', args.filter as string);
    const data = await this.req(`/edr/v2/threats?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getThreat(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/edr/v2/threats/${encodeURIComponent(args.threat_id as string)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.filter) params.set('filter', args.filter as string);
    const data = await this.req(`/edr/v2/devices?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/edr/v2/devices/${encodeURIComponent(args.device_id as string)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listInvestigations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.status) params.set('status', args.status as string);
    const data = await this.req(`/edr/v2/investigations?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getInvestigation(args: Record<string, unknown>): Promise<ToolResult> {
    const data = await this.req(`/edr/v2/investigations/${encodeURIComponent(args.investigation_id as string)}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createInvestigation(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      name: args.name,
      priority: args.priority ?? 'medium',
    };
    if (args.threat_id) body.threatId = args.threat_id;
    if (args.device_id) body.deviceId = args.device_id;
    if (args.description) body.description = args.description;
    const data = await this.req('/edr/v2/investigations', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listActionHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.action_type) params.set('actionType', args.action_type as string);
    if (args.device_id) params.set('deviceId', args.device_id as string);
    const data = await this.req(`/edr/v2/action-history?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async isolateDevice(args: Record<string, unknown>): Promise<ToolResult> {
    // Network quarantine via host remediation. Action "networkIsolation" isolates the host.
    // Docs: /edr/v2/remediation/host  (POST, Content-Type: application/vnd.api+json)
    const body: Record<string, unknown> = {
      data: {
        type: 'hostRemediation',
        attributes: {
          action: 'networkIsolation',
          hostIds: [args.device_id],
          ...(args.comment ? { comment: args.comment } : {}),
        },
      },
    };
    const data = await this.req('/edr/v2/remediation/host', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async releaseDevice(args: Record<string, unknown>): Promise<ToolResult> {
    // End network quarantine via host remediation. Action "endNetworkIsolation" restores connectivity.
    // Docs: /edr/v2/remediation/host  (POST, Content-Type: application/vnd.api+json)
    const body: Record<string, unknown> = {
      data: {
        type: 'hostRemediation',
        attributes: {
          action: 'endNetworkIsolation',
          hostIds: [args.device_id],
          ...(args.comment ? { comment: args.comment } : {}),
        },
      },
    };
    const data = await this.req('/edr/v2/remediation/host', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async quarantineFile(args: Record<string, unknown>): Promise<ToolResult> {
    // File threat remediation via /edr/v2/remediation/threat
    // Docs: POST /edr/v2/remediation/threat  (Content-Type: application/vnd.api+json)
    const attributes: Record<string, unknown> = {
      action: 'StopAndRemove',
      affectedHostIds: [args.device_id],
      fileHash: args.file_hash,
    };
    if (args.file_path) attributes.filePath = args.file_path;
    if (args.comment) attributes.comment = args.comment;
    const body: Record<string, unknown> = {
      data: {
        type: 'threatRemediation',
        attributes,
      },
    };
    const data = await this.req('/edr/v2/remediation/threat', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSearches(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    if (args.status) params.set('status', args.status as string);
    const data = await this.req(`/edr/v2/searches?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createSearch(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      query: args.query,
      queryType: args.query_type ?? 'process',
    };
    if (args.device_ids) body.deviceIds = args.device_ids;
    const data = await this.req('/edr/v2/searches', 'POST', body);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSearchResults(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 100));
    params.set('offset', String((args.offset as number) ?? 0));
    const data = await this.req(`/edr/v2/searches/${encodeURIComponent(args.search_id as string)}/results?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
