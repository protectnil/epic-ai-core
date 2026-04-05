/**
 * Cisco Meraki MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official Cisco Meraki vendor MCP server exists as of March 2026.
// Our adapter covers: 12 tools across organizations, networks, devices, and clients.
// Community MCP servers: None found for Meraki Dashboard API.
// Recommendation: Use this adapter. No community alternatives exist.
//
// Base URL: https://api.meraki.com/api/v1
// Auth: API key passed as X-Cisco-Meraki-API-Key header on every request
// Docs: https://developer.cisco.com/meraki/api-v1/
// Rate limits: 10 requests/second per org. 429 responses include Retry-After header.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MerakiConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.meraki.com/api/v1) */
  baseUrl?: string;
}

export class MerakiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MerakiConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.meraki.com/api/v1';
  }

  static catalog() {
    return {
      name: 'meraki',
      displayName: 'Cisco Meraki',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'meraki', 'cisco', 'networking', 'cloud', 'wifi', 'wireless', 'network',
        'organization', 'device', 'firewall', 'switch', 'access-point', 'security',
        'dashboard', 'client', 'vlan', 'topology', 'firmware', 'monitoring',
      ],
      toolNames: [
        'list_organizations', 'get_organization',
        'list_organization_networks', 'create_organization_network',
        'get_network', 'update_network',
        'get_network_devices', 'get_network_clients',
        'get_device', 'reboot_device',
        'get_organization_device_statuses',
        'get_network_firmware_upgrades',
      ],
      description: 'Cisco Meraki cloud-managed networking — manage organizations, networks, devices, clients, and firmware across your entire Meraki infrastructure via the Dashboard API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_organizations',
        description: 'List all Meraki organizations the API key has access to',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_organization',
        description: 'Get details for a specific Meraki organization by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Meraki organization ID',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'list_organization_networks',
        description: 'List all networks in a Meraki organization, with optional tag and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Meraki organization ID',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated network tags to filter by',
            },
            per_page: {
              type: 'number',
              description: 'Number of entries per page (max 1000)',
            },
            starting_after: {
              type: 'string',
              description: 'Pagination cursor — return results after this network ID',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'create_organization_network',
        description: 'Create a new network in a Meraki organization',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Meraki organization ID',
            },
            name: {
              type: 'string',
              description: 'Name for the new network',
            },
            product_types: {
              type: 'array',
              items: { type: 'string' },
              description: "Product types to include in the network (e.g. ['appliance', 'switch', 'wireless'])",
            },
            time_zone: {
              type: 'string',
              description: "Time zone for the network (e.g. 'America/Los_Angeles')",
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags to assign to the network',
            },
            notes: {
              type: 'string',
              description: 'Optional notes about the network',
            },
          },
          required: ['organization_id', 'name', 'product_types'],
        },
      },
      {
        name: 'get_network',
        description: 'Get details for a specific Meraki network by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            network_id: {
              type: 'string',
              description: 'Meraki network ID',
            },
          },
          required: ['network_id'],
        },
      },
      {
        name: 'update_network',
        description: 'Update settings for a Meraki network — rename, change timezone, tags, or enrollment string',
        inputSchema: {
          type: 'object',
          properties: {
            network_id: {
              type: 'string',
              description: 'Meraki network ID',
            },
            name: {
              type: 'string',
              description: 'New name for the network',
            },
            time_zone: {
              type: 'string',
              description: "New time zone (e.g. 'America/New_York')",
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'New tag list for the network',
            },
            notes: {
              type: 'string',
              description: 'Updated notes for the network',
            },
          },
          required: ['network_id'],
        },
      },
      {
        name: 'get_network_devices',
        description: 'List all devices (APs, switches, appliances) in a Meraki network',
        inputSchema: {
          type: 'object',
          properties: {
            network_id: {
              type: 'string',
              description: 'Meraki network ID',
            },
          },
          required: ['network_id'],
        },
      },
      {
        name: 'get_network_clients',
        description: 'List clients that have connected to a Meraki network, with optional time range and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            network_id: {
              type: 'string',
              description: 'Meraki network ID',
            },
            timespan: {
              type: 'number',
              description: 'Timespan in seconds to look back for clients (max 2592000 / 30 days)',
            },
            per_page: {
              type: 'number',
              description: 'Number of entries per page (max 1000)',
            },
            statuses: {
              type: 'string',
              description: "Filter by client status: 'Online' or 'Offline'",
            },
            mac: {
              type: 'string',
              description: 'Filter by client MAC address',
            },
            ip: {
              type: 'string',
              description: 'Filter by client IPv4 address',
            },
          },
          required: ['network_id'],
        },
      },
      {
        name: 'get_device',
        description: 'Get details for a specific Meraki device by its serial number',
        inputSchema: {
          type: 'object',
          properties: {
            serial: {
              type: 'string',
              description: 'Meraki device serial number (e.g. Q2XX-XXXX-XXXX)',
            },
          },
          required: ['serial'],
        },
      },
      {
        name: 'reboot_device',
        description: 'Reboot a Meraki device by its serial number',
        inputSchema: {
          type: 'object',
          properties: {
            serial: {
              type: 'string',
              description: 'Meraki device serial number',
            },
          },
          required: ['serial'],
        },
      },
      {
        name: 'get_organization_device_statuses',
        description: 'List the online/offline status of every Meraki device across an organization, with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            organization_id: {
              type: 'string',
              description: 'Meraki organization ID',
            },
            network_ids: {
              type: 'string',
              description: 'Comma-separated network IDs to filter by',
            },
            statuses: {
              type: 'string',
              description: "Filter by status: 'online', 'alerting', 'offline', or 'dormant'",
            },
            product_types: {
              type: 'string',
              description: "Filter by product type (e.g. 'appliance,switch,wireless')",
            },
            per_page: {
              type: 'number',
              description: 'Number of entries per page (max 1000)',
            },
          },
          required: ['organization_id'],
        },
      },
      {
        name: 'get_network_firmware_upgrades',
        description: 'Get firmware upgrade information and scheduled upgrades for all products in a Meraki network',
        inputSchema: {
          type: 'object',
          properties: {
            network_id: {
              type: 'string',
              description: 'Meraki network ID',
            },
          },
          required: ['network_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_organizations':
          return this.listOrganizations();
        case 'get_organization':
          return this.getOrganization(args);
        case 'list_organization_networks':
          return this.listOrganizationNetworks(args);
        case 'create_organization_network':
          return this.createOrganizationNetwork(args);
        case 'get_network':
          return this.getNetwork(args);
        case 'update_network':
          return this.updateNetwork(args);
        case 'get_network_devices':
          return this.getNetworkDevices(args);
        case 'get_network_clients':
          return this.getNetworkClients(args);
        case 'get_device':
          return this.getDevice(args);
        case 'reboot_device':
          return this.rebootDevice(args);
        case 'get_organization_device_statuses':
          return this.getOrganizationDeviceStatuses(args);
        case 'get_network_firmware_upgrades':
          return this.getNetworkFirmwareUpgrades(args);
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

  private get headers(): Record<string, string> {
    return {
      'X-Cisco-Meraki-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async request(method: string, path: string, params: Record<string, string | undefined> = {}, body?: unknown): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const url = `${this.baseUrl}${path}${qs.toString() ? `?${qs.toString()}` : ''}`;
    const init: RequestInit = { method, headers: this.headers };
    if (body !== undefined) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Meraki API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listOrganizations(): Promise<ToolResult> {
    return this.request('GET', '/organizations');
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    return this.request('GET', `/organizations/${encodeURIComponent(args.organization_id as string)}`);
  }

  private async listOrganizationNetworks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.tags) params.tags = args.tags as string;
    if (args.per_page) params.perPage = String(args.per_page);
    if (args.starting_after) params.startingAfter = args.starting_after as string;
    return this.request('GET', `/organizations/${encodeURIComponent(args.organization_id as string)}/networks`, params);
  }

  private async createOrganizationNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!args.product_types) return { content: [{ type: 'text', text: 'product_types is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      productTypes: args.product_types,
    };
    if (args.time_zone) body.timeZone = args.time_zone;
    if (args.tags) body.tags = args.tags;
    if (args.notes) body.notes = args.notes;
    return this.request('POST', `/organizations/${encodeURIComponent(args.organization_id as string)}/networks`, {}, body);
  }

  private async getNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.network_id) return { content: [{ type: 'text', text: 'network_id is required' }], isError: true };
    return this.request('GET', `/networks/${encodeURIComponent(args.network_id as string)}`);
  }

  private async updateNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.network_id) return { content: [{ type: 'text', text: 'network_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.time_zone) body.timeZone = args.time_zone;
    if (args.tags) body.tags = args.tags;
    if (args.notes) body.notes = args.notes;
    return this.request('PUT', `/networks/${encodeURIComponent(args.network_id as string)}`, {}, body);
  }

  private async getNetworkDevices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.network_id) return { content: [{ type: 'text', text: 'network_id is required' }], isError: true };
    return this.request('GET', `/networks/${encodeURIComponent(args.network_id as string)}/devices`);
  }

  private async getNetworkClients(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.network_id) return { content: [{ type: 'text', text: 'network_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.timespan) params.timespan = String(args.timespan);
    if (args.per_page) params.perPage = String(args.per_page);
    if (args.statuses) params.statuses = args.statuses as string;
    if (args.mac) params.mac = args.mac as string;
    if (args.ip) params.ip = args.ip as string;
    return this.request('GET', `/networks/${encodeURIComponent(args.network_id as string)}/clients`, params);
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serial) return { content: [{ type: 'text', text: 'serial is required' }], isError: true };
    return this.request('GET', `/devices/${encodeURIComponent(args.serial as string)}`);
  }

  private async rebootDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serial) return { content: [{ type: 'text', text: 'serial is required' }], isError: true };
    return this.request('POST', `/devices/${encodeURIComponent(args.serial as string)}/reboot`);
  }

  private async getOrganizationDeviceStatuses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organization_id) return { content: [{ type: 'text', text: 'organization_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.network_ids) params.networkIds = args.network_ids as string;
    if (args.statuses) params.statuses = args.statuses as string;
    if (args.product_types) params.productTypes = args.product_types as string;
    if (args.per_page) params.perPage = String(args.per_page);
    return this.request('GET', `/organizations/${encodeURIComponent(args.organization_id as string)}/devices/statuses`, params);
  }

  private async getNetworkFirmwareUpgrades(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.network_id) return { content: [{ type: 'text', text: 'network_id is required' }], isError: true };
    return this.request('GET', `/networks/${encodeURIComponent(args.network_id as string)}/firmwareUpgrades`);
  }
}
