/**
 * Mist MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Mist (Juniper Mist AI) MCP server was found on GitHub.
// Our adapter covers: 12 tools (sites, devices, inventory, stats, alarms, WLANs).
//
// Base URL: https://api.mist.com (US), https://api.eu.mist.com (EU), https://api.gc1.mist.com (GCP)
// Auth: API token passed as header "Authorization: Token <apiToken>"
//   or Basic auth (email:password) for session-based flows.
// Docs: https://api.mist.com/api/v1/docs/Home (Mist account required)
// Rate limits: Contact Juniper/Mist sales for limits. Applies per org.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MistConfig {
  apiToken: string;
  /** Optional base URL override (default: https://api.mist.com) */
  baseUrl?: string;
}

export class MistMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: MistConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl ?? 'https://api.mist.com';
  }

  static catalog() {
    return {
      name: 'mist',
      displayName: 'Juniper Mist AI',
      version: '1.0.0',
      category: 'iot',
      keywords: [
        'mist', 'juniper', 'wireless', 'wifi', 'access-point', 'wlan', 'ssid',
        'network', 'iot', 'site', 'device', 'inventory', 'ap', 'switch', 'gateway',
        'mxedge', 'alarm', 'stats', 'topology', 'client', 'rf', 'cloud-managed',
      ],
      toolNames: [
        'list_org_sites', 'get_org_site',
        'list_site_devices', 'get_site_device', 'update_site_device',
        'list_org_inventory', 'get_org_devices_stats',
        'list_site_wlans', 'get_site_device_iot_port',
        'list_org_alarms', 'get_site_stats', 'list_device_models',
      ],
      description: 'Juniper Mist AI platform — manage wireless sites, access points, switches, IoT devices, inventory, alarms, and real-time stats across cloud-managed networks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_org_sites',
        description: 'List all sites for an organization — returns site IDs, names, addresses, and timezone settings',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization UUID (e.g. 9777c1a0-1234-5678-abcd-000000000001)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_org_site',
        description: 'Get details for a specific site within an organization — returns configuration, location, and RF settings',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization UUID',
            },
            site_id: {
              type: 'string',
              description: 'Site UUID to retrieve',
            },
          },
          required: ['org_id', 'site_id'],
        },
      },
      {
        name: 'list_site_devices',
        description: 'List all devices (APs, switches, gateways) at a site — returns device IDs, MACs, models, and status',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Site UUID',
            },
            type: {
              type: 'string',
              description: 'Device type filter: ap, switch, gateway (omit for all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_site_device',
        description: 'Get full configuration and status of a specific device at a site by device ID',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Site UUID',
            },
            device_id: {
              type: 'string',
              description: 'Device UUID to retrieve',
            },
          },
          required: ['site_id', 'device_id'],
        },
      },
      {
        name: 'update_site_device',
        description: 'Update configuration of a device at a site — supports renaming, changing map position, or updating notes',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Site UUID',
            },
            device_id: {
              type: 'string',
              description: 'Device UUID to update',
            },
            name: {
              type: 'string',
              description: 'New device name',
            },
            notes: {
              type: 'string',
              description: 'Notes or comments for the device',
            },
            map_id: {
              type: 'string',
              description: 'Map UUID to place the device on',
            },
            x: {
              type: 'number',
              description: 'X coordinate on the map (pixels)',
            },
            y: {
              type: 'number',
              description: 'Y coordinate on the map (pixels)',
            },
          },
          required: ['site_id', 'device_id'],
        },
      },
      {
        name: 'list_org_inventory',
        description: 'List all devices in the organization inventory — shows claimed devices, serial numbers, MACs, and site assignments',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization UUID',
            },
            type: {
              type: 'string',
              description: 'Filter by device type: ap, switch, gateway, mxedge (omit for all)',
            },
            unassigned: {
              type: 'boolean',
              description: 'If true, return only unassigned devices not yet placed at a site',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_org_devices_stats',
        description: 'Get real-time status and statistics for all devices across an organization — includes uptime, connected clients, and health',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization UUID',
            },
            type: {
              type: 'string',
              description: 'Filter by device type: ap, switch, gateway (omit for all)',
            },
            status: {
              type: 'string',
              description: 'Filter by status: all, connected, disconnected, restarting, upgrading (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'list_site_wlans',
        description: 'List all WLANs (wireless networks / SSIDs) configured at a site',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Site UUID',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_site_device_iot_port',
        description: 'Get the IoT port configuration for a specific device — returns GPIO pin assignments and BLE settings',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Site UUID',
            },
            device_id: {
              type: 'string',
              description: 'Device UUID',
            },
          },
          required: ['site_id', 'device_id'],
        },
      },
      {
        name: 'list_org_alarms',
        description: 'List active alarms for an organization — returns alarm type, severity, affected site, and timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            org_id: {
              type: 'string',
              description: 'Organization UUID',
            },
            group: {
              type: 'string',
              description: 'Filter by alarm group (e.g. infrastructure, marvis)',
            },
            severity: {
              type: 'string',
              description: 'Filter by severity: warn, critical (omit for all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
          },
          required: ['org_id'],
        },
      },
      {
        name: 'get_site_stats',
        description: 'Get current statistics for a site — returns connected device count, client count, and health score',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Site UUID',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_device_models',
        description: 'List all Mist-supported device models — returns model names, capabilities, and hardware specs for APs, switches, and gateways',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by device type: ap, switch, gateway (omit for all)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_org_sites':
          return this.listOrgSites(args);
        case 'get_org_site':
          return this.getOrgSite(args);
        case 'list_site_devices':
          return this.listSiteDevices(args);
        case 'get_site_device':
          return this.getSiteDevice(args);
        case 'update_site_device':
          return this.updateSiteDevice(args);
        case 'list_org_inventory':
          return this.listOrgInventory(args);
        case 'get_org_devices_stats':
          return this.getOrgDevicesStats(args);
        case 'list_site_wlans':
          return this.listSiteWlans(args);
        case 'get_site_device_iot_port':
          return this.getSiteDeviceIotPort(args);
        case 'list_org_alarms':
          return this.listOrgAlarms(args);
        case 'get_site_stats':
          return this.getSiteStats(args);
        case 'list_device_models':
          return this.listDeviceModels(args);
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

  private async apiFetch(path: string, method = 'GET', body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Token ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
    const options: RequestInit = { method, headers };
    if (body !== undefined) options.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, options);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Mist API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildQs(params: Record<string, unknown>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  private async listOrgSites(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    const qs = this.buildQs({ limit: args.limit, page: args.page });
    return this.apiFetch(`/api/v1/orgs/${encodeURIComponent(args.org_id as string)}/sites${qs}`);
  }

  private async getOrgSite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.apiFetch(`/api/v1/orgs/${encodeURIComponent(args.org_id as string)}/sites/${encodeURIComponent(args.site_id as string)}`);
  }

  private async listSiteDevices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const qs = this.buildQs({ type: args.type, limit: args.limit, page: args.page });
    return this.apiFetch(`/api/v1/sites/${encodeURIComponent(args.site_id as string)}/devices${qs}`);
  }

  private async getSiteDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.apiFetch(`/api/v1/sites/${encodeURIComponent(args.site_id as string)}/devices/${encodeURIComponent(args.device_id as string)}`);
  }

  private async updateSiteDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.notes !== undefined) body.notes = args.notes;
    if (args.map_id !== undefined) body.map_id = args.map_id;
    if (args.x !== undefined) body.x = args.x;
    if (args.y !== undefined) body.y = args.y;
    return this.apiFetch(
      `/api/v1/sites/${encodeURIComponent(args.site_id as string)}/devices/${encodeURIComponent(args.device_id as string)}`,
      'PUT',
      body,
    );
  }

  private async listOrgInventory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    const qs = this.buildQs({ type: args.type, unassigned: args.unassigned, limit: args.limit });
    return this.apiFetch(`/api/v1/orgs/${encodeURIComponent(args.org_id as string)}/inventory${qs}`);
  }

  private async getOrgDevicesStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    const qs = this.buildQs({ type: args.type, status: args.status, limit: args.limit });
    return this.apiFetch(`/api/v1/orgs/${encodeURIComponent(args.org_id as string)}/stats/devices${qs}`);
  }

  private async listSiteWlans(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.apiFetch(`/api/v1/sites/${encodeURIComponent(args.site_id as string)}/wlans`);
  }

  private async getSiteDeviceIotPort(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.apiFetch(`/api/v1/sites/${encodeURIComponent(args.site_id as string)}/devices/${encodeURIComponent(args.device_id as string)}/iot`);
  }

  private async listOrgAlarms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.org_id) return { content: [{ type: 'text', text: 'org_id is required' }], isError: true };
    const qs = this.buildQs({ group: args.group, severity: args.severity, limit: args.limit, page: args.page });
    return this.apiFetch(`/api/v1/orgs/${encodeURIComponent(args.org_id as string)}/alarms${qs}`);
  }

  private async getSiteStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.apiFetch(`/api/v1/sites/${encodeURIComponent(args.site_id as string)}/stats`);
  }

  private async listDeviceModels(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQs({ type: args.type });
    return this.apiFetch(`/api/v1/const/device_models${qs}`);
  }
}
