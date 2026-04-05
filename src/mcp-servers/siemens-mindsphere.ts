/**
 * Siemens MindSphere (Insights Hub) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Siemens MindSphere / Insights Hub MCP server was found on GitHub or developer.siemens.com.
//
// Base URL: https://gateway.eu1.mindsphere.io (default; configurable per tenant/region)
//   Regions: eu1 (Europe), us1 (North America), cn1 (China)
// Auth: OAuth2 client credentials — POST /api/technicaltokenmanager/v3/oauth/token
//       Header: X-SPACE-AUTH-KEY: Bearer base64(clientId:clientSecret), Content-Type: application/json
//       Body (JSON): { grant_type, appName, appVersion, hostTenant, userTenant }
//       Tokens expire in 30 minutes; refreshed 60s early per protocol.
// Docs: https://documentation.mindsphere.io/MindSphere/apis/index.html
// Rate limits: Varies by API. Consult tenant-specific documentation.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SiemensMindSphereConfig {
  clientId: string;
  clientSecret: string;
  tenant: string;
  region?: string;    // eu1, us1, cn1 (default: eu1)
  baseUrl?: string;   // override the gateway URL entirely
}

export class SiemensMindSphereMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tenant: string;
  private readonly baseUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: SiemensMindSphereConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.tenant = config.tenant;
    const region = config.region || 'eu1';
    this.baseUrl = config.baseUrl || `https://gateway.${region}.mindsphere.io`;
  }

  static catalog() {
    return {
      name: 'siemens-mindsphere',
      displayName: 'Siemens MindSphere (Insights Hub)',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'siemens', 'mindsphere', 'insights hub', 'iiot', 'industrial iot', 'timeseries',
        'asset', 'aspect', 'sensor', 'telemetry', 'event', 'anomaly', 'predictive', 'ot',
      ],
      toolNames: [
        'list_assets', 'get_asset', 'list_asset_types', 'get_asset_type',
        'list_aspects', 'get_aspect',
        'get_timeseries', 'put_timeseries', 'delete_timeseries',
        'list_events', 'create_event', 'get_event',
      ],
      description: 'Siemens MindSphere (Insights Hub) IIoT platform: manage industrial assets, read and write time series sensor data, query events, and browse asset type hierarchies.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_assets',
        description: 'List industrial assets registered in MindSphere with optional filter by type and name',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'JSON filter string for asset properties (e.g. {"name": "Pump01"}) — optional',
            },
            size: {
              type: 'number',
              description: 'Number of assets to return per page (default: 20, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
            sort: {
              type: 'string',
              description: 'Sort field and direction (e.g. "name,asc" or "createdAt,desc")',
            },
          },
        },
      },
      {
        name: 'get_asset',
        description: 'Retrieve full details for a specific asset by its asset ID',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID (GUID format)',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'list_asset_types',
        description: 'List all asset types defined in the MindSphere tenant with their aspect associations',
        inputSchema: {
          type: 'object',
          properties: {
            size: {
              type: 'number',
              description: 'Number of types to return (default: 20, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_asset_type',
        description: 'Get the full definition of a specific asset type including aspects and variables',
        inputSchema: {
          type: 'object',
          properties: {
            type_id: {
              type: 'string',
              description: 'Asset type ID (e.g. core.basicasset or tenant.MyMachineType)',
            },
          },
          required: ['type_id'],
        },
      },
      {
        name: 'list_aspects',
        description: 'List all aspect types defined in the MindSphere tenant',
        inputSchema: {
          type: 'object',
          properties: {
            size: {
              type: 'number',
              description: 'Number of aspects to return (default: 20, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_aspect',
        description: 'Get the full definition of a specific aspect type including its variables and units',
        inputSchema: {
          type: 'object',
          properties: {
            aspect_id: {
              type: 'string',
              description: 'Aspect type ID (e.g. tenant.TemperatureData)',
            },
          },
          required: ['aspect_id'],
        },
      },
      {
        name: 'get_timeseries',
        description: 'Retrieve time series sensor data for an asset and aspect within a time range',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID (GUID)',
            },
            aspect_name: {
              type: 'string',
              description: 'Aspect name as configured on the asset (e.g. TemperatureData)',
            },
            from: {
              type: 'string',
              description: 'Start of time range in ISO 8601 (e.g. 2024-01-01T00:00:00Z)',
            },
            to: {
              type: 'string',
              description: 'End of time range in ISO 8601 (e.g. 2024-01-02T00:00:00Z)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of data points to return (default: 2000, max: 2000)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated variable names to include (optional — all variables if omitted)',
            },
          },
          required: ['asset_id', 'aspect_name', 'from', 'to'],
        },
      },
      {
        name: 'put_timeseries',
        description: 'Write time series data for an asset and aspect — used for ingesting sensor readings',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID (GUID)',
            },
            aspect_name: {
              type: 'string',
              description: 'Aspect name as configured on the asset',
            },
            data: {
              type: 'array',
              description: 'Array of time series records, each with a _time (ISO 8601) field and variable values',
            },
          },
          required: ['asset_id', 'aspect_name', 'data'],
        },
      },
      {
        name: 'delete_timeseries',
        description: 'Delete time series data for an asset and aspect within a specified time range',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID (GUID)',
            },
            aspect_name: {
              type: 'string',
              description: 'Aspect name',
            },
            from: {
              type: 'string',
              description: 'Start of deletion range in ISO 8601',
            },
            to: {
              type: 'string',
              description: 'End of deletion range in ISO 8601',
            },
          },
          required: ['asset_id', 'aspect_name', 'from', 'to'],
        },
      },
      {
        name: 'list_events',
        description: 'List events for assets with optional filters for asset ID, type, and time range',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'Filter by asset (entity) ID (optional)',
            },
            type_id: {
              type: 'string',
              description: 'Filter by event type ID (optional)',
            },
            from: {
              type: 'string',
              description: 'Start of time range in ISO 8601 (optional)',
            },
            to: {
              type: 'string',
              description: 'End of time range in ISO 8601 (optional)',
            },
            size: {
              type: 'number',
              description: 'Number of events to return (default: 20, max: 200)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 0)',
            },
          },
        },
      },
      {
        name: 'create_event',
        description: 'Create a new event for an asset — used to record alarms, state changes, or maintenance activities',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'Asset ID the event is associated with',
            },
            type_id: {
              type: 'string',
              description: 'Event type ID (must be pre-defined in the tenant)',
            },
            timestamp: {
              type: 'string',
              description: 'Event timestamp in ISO 8601 format',
            },
            description: {
              type: 'string',
              description: 'Human-readable event description (optional)',
            },
            severity: {
              type: 'number',
              description: 'Event severity level: 20 (Error), 30 (Warning), 40 (Information) (optional)',
            },
          },
          required: ['entity_id', 'type_id', 'timestamp'],
        },
      },
      {
        name: 'get_event',
        description: 'Retrieve a specific event by its event ID',
        inputSchema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'Event ID',
            },
          },
          required: ['event_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_assets':
          return this.listAssets(args);
        case 'get_asset':
          return this.getAsset(args);
        case 'list_asset_types':
          return this.listAssetTypes(args);
        case 'get_asset_type':
          return this.getAssetType(args);
        case 'list_aspects':
          return this.listAspects(args);
        case 'get_aspect':
          return this.getAspect(args);
        case 'get_timeseries':
          return this.getTimeseries(args);
        case 'put_timeseries':
          return this.putTimeseries(args);
        case 'delete_timeseries':
          return this.deleteTimeseries(args);
        case 'list_events':
          return this.listEvents(args);
        case 'create_event':
          return this.createEvent(args);
        case 'get_event':
          return this.getEvent(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/technicaltokenmanager/v3/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SPACE-AUTH-KEY': `Bearer ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appName: this.clientId,
        appVersion: '1.0',
        hostTenant: this.tenant,
        userTenant: this.tenant,
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async msGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async msPut(path: string, body: unknown): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: text || '{"status":"ok"}' }], isError: false };
  }

  private async msPost(path: string, body: unknown): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async msDelete(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: '{"deleted":true}' }], isError: false };
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      size: String((args.size as number) || 20),
      page: String((args.page as number) || 0),
    };
    if (args.filter) params.filter = args.filter as string;
    if (args.sort) params.sort = args.sort as string;
    return this.msGet('/api/assetmanagement/v3/assets', params);
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.msGet(`/api/assetmanagement/v3/assets/${encodeURIComponent(args.asset_id as string)}`);
  }

  private async listAssetTypes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.msGet('/api/assetmanagement/v3/assettypes', {
      size: String((args.size as number) || 20),
      page: String((args.page as number) || 0),
    });
  }

  private async getAssetType(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.type_id) return { content: [{ type: 'text', text: 'type_id is required' }], isError: true };
    return this.msGet(`/api/assetmanagement/v3/assettypes/${encodeURIComponent(args.type_id as string)}`);
  }

  private async listAspects(args: Record<string, unknown>): Promise<ToolResult> {
    return this.msGet('/api/assetmanagement/v3/aspecttypes', {
      size: String((args.size as number) || 20),
      page: String((args.page as number) || 0),
    });
  }

  private async getAspect(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.aspect_id) return { content: [{ type: 'text', text: 'aspect_id is required' }], isError: true };
    return this.msGet(`/api/assetmanagement/v3/aspecttypes/${encodeURIComponent(args.aspect_id as string)}`);
  }

  private async getTimeseries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id || !args.aspect_name || !args.from || !args.to) {
      return { content: [{ type: 'text', text: 'asset_id, aspect_name, from, and to are required' }], isError: true };
    }
    const params: Record<string, string> = {
      from: args.from as string,
      to: args.to as string,
      limit: String((args.limit as number) || 2000),
    };
    if (args.select) params.select = args.select as string;
    return this.msGet(`/api/iottimeseries/v3/timeseries/${encodeURIComponent(args.asset_id as string)}/${encodeURIComponent(args.aspect_name as string)}`, params);
  }

  private async putTimeseries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id || !args.aspect_name || !args.data) {
      return { content: [{ type: 'text', text: 'asset_id, aspect_name, and data are required' }], isError: true };
    }
    return this.msPut(`/api/iottimeseries/v3/timeseries/${encodeURIComponent(args.asset_id as string)}/${encodeURIComponent(args.aspect_name as string)}`, args.data);
  }

  private async deleteTimeseries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id || !args.aspect_name || !args.from || !args.to) {
      return { content: [{ type: 'text', text: 'asset_id, aspect_name, from, and to are required' }], isError: true };
    }
    return this.msDelete(`/api/iottimeseries/v3/timeseries/${encodeURIComponent(args.asset_id as string)}/${encodeURIComponent(args.aspect_name as string)}`, {
      from: args.from as string,
      to: args.to as string,
    });
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      size: String((args.size as number) || 20),
      page: String((args.page as number) || 0),
    };
    if (args.entity_id) params.entityId = args.entity_id as string;
    if (args.type_id) params.typeId = args.type_id as string;
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    return this.msGet('/api/eventmanagement/v3/events', params);
  }

  private async createEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entity_id || !args.type_id || !args.timestamp) {
      return { content: [{ type: 'text', text: 'entity_id, type_id, and timestamp are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      entityId: args.entity_id,
      typeId: args.type_id,
      timestamp: args.timestamp,
    };
    if (args.description) body.description = args.description;
    if (args.severity !== undefined) body.severity = args.severity;
    return this.msPost('/api/eventmanagement/v3/events', body);
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.event_id) return { content: [{ type: 'text', text: 'event_id is required' }], isError: true };
    return this.msGet(`/api/eventmanagement/v3/events/${encodeURIComponent(args.event_id as string)}`);
  }
}
