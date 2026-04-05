/**
 * Cisco Meraki MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/CiscoDevNet/meraki-magic-mcp-community — transport: stdio, auth: API key
//   Published under CiscoDevNet org (Cisco-official). Last commit: Nov 20, 2025 (within 6 months).
//   Dynamic mode exposes ~804 API endpoints; manual mode exposes 40 curated tools. Criteria: 4/4 met.
// Community MCP alternatives: https://github.com/kiskander/meraki-mcp-server (subset), https://github.com/paolo-trivi/mcp-meraki (79 tools, community)
// Our adapter covers: 18 tools. Vendor MCP (CiscoDevNet dynamic) covers: ~804 endpoints.
// Recommendation: use-rest-api — the CiscoDevNet MCP is a strict superset of our 18 tools, but it
//   requires the meraki Python SDK at runtime (not air-gapped). This adapter provides controlled
//   scope and air-gapped deployment. Use CiscoDevNet MCP for full 804-endpoint coverage.
//
// Base URL: https://api.meraki.com/api/v1
// Auth: Bearer token — Authorization: Bearer {API_KEY} header (v1 API; X-Cisco-Meraki-API-Key was v0)
// Docs: https://developer.cisco.com/meraki/api-v1/
// Rate limits: 10 requests/second per organization; stricter limits on some endpoints (e.g., 10 req / 5 min for device claiming)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CiscoMerakiConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CiscoMerakiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CiscoMerakiConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.meraki.com/api/v1';
  }

  static catalog() {
    return {
      name: 'cisco-meraki',
      displayName: 'Cisco Meraki',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'meraki', 'cisco', 'network', 'wifi', 'wireless', 'switch', 'firewall', 'appliance',
        'ssid', 'vlan', 'organization', 'dashboard', 'noc', 'infrastructure', 'sd-wan', 'mx', 'ms', 'mr',
      ],
      toolNames: [
        'list_organizations', 'get_organization', 'list_networks', 'get_network',
        'list_devices', 'get_device', 'get_device_status',
        'list_clients', 'get_network_client',
        'list_ssids', 'get_ssid',
        'list_vlans', 'get_vlan',
        'get_organization_uplinks_statuses', 'get_network_alerts_history',
        'list_appliance_ports', 'get_network_firmware_upgrades',
        'get_organization_api_requests_overview',
      ],
      description: 'Cisco Meraki cloud-managed network infrastructure: manage organizations, networks, devices, clients, SSIDs, VLANs, and monitor uplinks and alerts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_organizations',
        description: 'List all Meraki organizations accessible with the configured API key',
        inputSchema: {
          type: 'object',
          properties: {
            perPage: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 1000)',
            },
            startingAfter: {
              type: 'string',
              description: 'Pagination cursor — return results after this organization ID',
            },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Get details for a specific Meraki organization by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'Meraki organization ID (e.g. 123456)',
            },
          },
          required: ['organizationId'],
        },
      },
      {
        name: 'list_networks',
        description: 'List all networks in a Meraki organization, optionally filtered by type or tags',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'Meraki organization ID',
            },
            configTemplateId: {
              type: 'string',
              description: 'Filter by config template ID',
            },
            isBoundToConfigTemplate: {
              type: 'boolean',
              description: 'Return only networks bound (true) or not bound (false) to a config template',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated list of tags to filter by',
            },
            perPage: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 1000)',
            },
            startingAfter: {
              type: 'string',
              description: 'Pagination cursor — return results after this network ID',
            },
          },
          required: ['organizationId'],
        },
      },
      {
        name: 'get_network',
        description: 'Get details and configuration for a specific Meraki network by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            networkId: {
              type: 'string',
              description: 'Meraki network ID (e.g. N_12345678)',
            },
          },
          required: ['networkId'],
        },
      },
      {
        name: 'list_devices',
        description: 'List all devices in a Meraki network with model, serial, MAC, and IP information',
        inputSchema: {
          type: 'object',
          properties: {
            networkId: {
              type: 'string',
              description: 'Meraki network ID',
            },
          },
          required: ['networkId'],
        },
      },
      {
        name: 'get_device',
        description: 'Get configuration and details for a specific Meraki device by serial number',
        inputSchema: {
          type: 'object',
          properties: {
            serial: {
              type: 'string',
              description: 'Device serial number (e.g. Q2XX-XXXX-XXXX)',
            },
          },
          required: ['serial'],
        },
      },
      {
        name: 'get_device_status',
        description: 'Get online/offline status and uplink info for all devices in an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'Meraki organization ID',
            },
            perPage: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 1000)',
            },
            startingAfter: {
              type: 'string',
              description: 'Pagination cursor for next page of results',
            },
            networkIds: {
              type: 'string',
              description: 'Comma-separated list of network IDs to filter results',
            },
            statuses: {
              type: 'string',
              description: 'Filter by status: online, alerting, offline, dormant (comma-separated)',
            },
          },
          required: ['organizationId'],
        },
      },
      {
        name: 'list_clients',
        description: 'List clients connected to a Meraki network within a specified timespan',
        inputSchema: {
          type: 'object',
          properties: {
            networkId: {
              type: 'string',
              description: 'Meraki network ID',
            },
            t0: {
              type: 'string',
              description: 'Start time for the query (ISO 8601 or Unix timestamp)',
            },
            timespan: {
              type: 'number',
              description: 'Timespan in seconds to look back (max: 2592000 = 30 days, default: 86400)',
            },
            perPage: {
              type: 'number',
              description: 'Number of results per page (default: 10, max: 1000)',
            },
            startingAfter: {
              type: 'string',
              description: 'Pagination cursor for next page',
            },
            statuses: {
              type: 'string',
              description: 'Filter by status: Online or Offline (comma-separated)',
            },
          },
          required: ['networkId'],
        },
      },
      {
        name: 'get_network_client',
        description: 'Get detailed information for a specific client device in a network by client ID or MAC',
        inputSchema: {
          type: 'object',
          properties: {
            networkId: {
              type: 'string',
              description: 'Meraki network ID',
            },
            clientId: {
              type: 'string',
              description: 'Client ID or MAC address (e.g. k74272e or 00:11:22:33:44:55)',
            },
          },
          required: ['networkId', 'clientId'],
        },
      },
      {
        name: 'list_ssids',
        description: 'List all SSIDs (wireless networks) configured in a Meraki network',
        inputSchema: {
          type: 'object',
          properties: {
            networkId: {
              type: 'string',
              description: 'Meraki network ID (must be a wireless or combined network)',
            },
          },
          required: ['networkId'],
        },
      },
      {
        name: 'get_ssid',
        description: 'Get configuration details for a specific SSID in a Meraki wireless network',
        inputSchema: {
          type: 'object',
          properties: {
            networkId: {
              type: 'string',
              description: 'Meraki network ID',
            },
            number: {
              type: 'number',
              description: 'SSID number (0-14)',
            },
          },
          required: ['networkId', 'number'],
        },
      },
      {
        name: 'list_vlans',
        description: 'List all VLANs configured on a Meraki MX appliance network',
        inputSchema: {
          type: 'object',
          properties: {
            networkId: {
              type: 'string',
              description: 'Meraki network ID (must contain an MX appliance)',
            },
          },
          required: ['networkId'],
        },
      },
      {
        name: 'get_vlan',
        description: 'Get configuration details for a specific VLAN on a Meraki MX appliance',
        inputSchema: {
          type: 'object',
          properties: {
            networkId: {
              type: 'string',
              description: 'Meraki network ID',
            },
            vlanId: {
              type: 'string',
              description: 'VLAN ID as a string (e.g. "100")',
            },
          },
          required: ['networkId', 'vlanId'],
        },
      },
      {
        name: 'get_organization_uplinks_statuses',
        description: 'Get WAN uplink status for all MX appliances across an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'Meraki organization ID',
            },
            perPage: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 1000)',
            },
            startingAfter: {
              type: 'string',
              description: 'Pagination cursor for next page',
            },
            networkIds: {
              type: 'string',
              description: 'Comma-separated list of network IDs to filter',
            },
          },
          required: ['organizationId'],
        },
      },
      {
        name: 'get_network_alerts_history',
        description: 'Get alert history for a Meraki network including type, severity, and timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            networkId: {
              type: 'string',
              description: 'Meraki network ID',
            },
            perPage: {
              type: 'number',
              description: 'Number of results per page (default: 100, max: 1000)',
            },
            startingAfter: {
              type: 'string',
              description: 'Pagination cursor for next page',
            },
          },
          required: ['networkId'],
        },
      },
      {
        name: 'list_appliance_ports',
        description: 'List the per-port VLAN settings for all ports on a Meraki MX appliance network',
        inputSchema: {
          type: 'object',
          properties: {
            networkId: {
              type: 'string',
              description: 'Meraki network ID containing an MX appliance',
            },
          },
          required: ['networkId'],
        },
      },
      {
        name: 'get_network_firmware_upgrades',
        description: 'Get firmware upgrade status and scheduled upgrades for all devices in a Meraki network',
        inputSchema: {
          type: 'object',
          properties: {
            networkId: {
              type: 'string',
              description: 'Meraki network ID',
            },
          },
          required: ['networkId'],
        },
      },
      {
        name: 'get_organization_api_requests_overview',
        description: 'Get a summary of API request activity for an organization including response codes and top users',
        inputSchema: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'Meraki organization ID',
            },
            t0: {
              type: 'string',
              description: 'Start time for the query (ISO 8601)',
            },
            t1: {
              type: 'string',
              description: 'End time for the query (ISO 8601)',
            },
            timespan: {
              type: 'number',
              description: 'Timespan in seconds (max: 31536000 = 1 year)',
            },
          },
          required: ['organizationId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_organizations':
          return this.listOrganizations(args);
        case 'get_organization':
          return this.getOrganization(args);
        case 'list_networks':
          return this.listNetworks(args);
        case 'get_network':
          return this.getNetwork(args);
        case 'list_devices':
          return this.listDevices(args);
        case 'get_device':
          return this.getDevice(args);
        case 'get_device_status':
          return this.getDeviceStatus(args);
        case 'list_clients':
          return this.listClients(args);
        case 'get_network_client':
          return this.getNetworkClient(args);
        case 'list_ssids':
          return this.listSsids(args);
        case 'get_ssid':
          return this.getSsid(args);
        case 'list_vlans':
          return this.listVlans(args);
        case 'get_vlan':
          return this.getVlan(args);
        case 'get_organization_uplinks_statuses':
          return this.getOrganizationUplinksStatuses(args);
        case 'get_network_alerts_history':
          return this.getNetworkAlertsHistory(args);
        case 'list_appliance_ports':
          return this.listAppliancePorts(args);
        case 'get_network_firmware_upgrades':
          return this.getNetworkFirmwareUpgrades(args);
        case 'get_organization_api_requests_overview':
          return this.getOrganizationApiRequestsOverview(args);
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
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async merakiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Meraki returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listOrganizations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.perPage) params.perPage = String(args.perPage);
    if (args.startingAfter) params.startingAfter = args.startingAfter as string;
    return this.merakiGet('/organizations', params);
  }

  private async getOrganization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationId) return { content: [{ type: 'text', text: 'organizationId is required' }], isError: true };
    return this.merakiGet(`/organizations/${encodeURIComponent(args.organizationId as string)}`);
  }

  private async listNetworks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationId) return { content: [{ type: 'text', text: 'organizationId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.configTemplateId) params.configTemplateId = args.configTemplateId as string;
    if (typeof args.isBoundToConfigTemplate === 'boolean') params.isBoundToConfigTemplate = String(args.isBoundToConfigTemplate);
    if (args.tags) params.tags = args.tags as string;
    if (args.perPage) params.perPage = String(args.perPage);
    if (args.startingAfter) params.startingAfter = args.startingAfter as string;
    return this.merakiGet(`/organizations/${encodeURIComponent(args.organizationId as string)}/networks`, params);
  }

  private async getNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.networkId) return { content: [{ type: 'text', text: 'networkId is required' }], isError: true };
    return this.merakiGet(`/networks/${encodeURIComponent(args.networkId as string)}`);
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.networkId) return { content: [{ type: 'text', text: 'networkId is required' }], isError: true };
    return this.merakiGet(`/networks/${encodeURIComponent(args.networkId as string)}/devices`);
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.serial) return { content: [{ type: 'text', text: 'serial is required' }], isError: true };
    return this.merakiGet(`/devices/${encodeURIComponent(args.serial as string)}`);
  }

  private async getDeviceStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationId) return { content: [{ type: 'text', text: 'organizationId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.perPage) params.perPage = String(args.perPage);
    if (args.startingAfter) params.startingAfter = args.startingAfter as string;
    if (args.networkIds) params['networkIds[]'] = args.networkIds as string;
    if (args.statuses) params['statuses[]'] = args.statuses as string;
    return this.merakiGet(`/organizations/${encodeURIComponent(args.organizationId as string)}/devices/statuses`, params);
  }

  private async listClients(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.networkId) return { content: [{ type: 'text', text: 'networkId is required' }], isError: true };
    const params: Record<string, string> = { timespan: String((args.timespan as number) ?? 86400) };
    if (args.t0) params.t0 = args.t0 as string;
    if (args.perPage) params.perPage = String(args.perPage);
    if (args.startingAfter) params.startingAfter = args.startingAfter as string;
    if (args.statuses) params['statuses[]'] = args.statuses as string;
    return this.merakiGet(`/networks/${encodeURIComponent(args.networkId as string)}/clients`, params);
  }

  private async getNetworkClient(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.networkId || !args.clientId) return { content: [{ type: 'text', text: 'networkId and clientId are required' }], isError: true };
    return this.merakiGet(`/networks/${encodeURIComponent(args.networkId as string)}/clients/${encodeURIComponent(args.clientId as string)}`);
  }

  private async listSsids(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.networkId) return { content: [{ type: 'text', text: 'networkId is required' }], isError: true };
    return this.merakiGet(`/networks/${encodeURIComponent(args.networkId as string)}/wireless/ssids`);
  }

  private async getSsid(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.networkId || args.number === undefined) return { content: [{ type: 'text', text: 'networkId and number are required' }], isError: true };
    return this.merakiGet(`/networks/${encodeURIComponent(args.networkId as string)}/wireless/ssids/${encodeURIComponent(args.number as string)}`);
  }

  private async listVlans(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.networkId) return { content: [{ type: 'text', text: 'networkId is required' }], isError: true };
    return this.merakiGet(`/networks/${encodeURIComponent(args.networkId as string)}/appliance/vlans`);
  }

  private async getVlan(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.networkId || !args.vlanId) return { content: [{ type: 'text', text: 'networkId and vlanId are required' }], isError: true };
    return this.merakiGet(`/networks/${encodeURIComponent(args.networkId as string)}/appliance/vlans/${encodeURIComponent(args.vlanId as string)}`);
  }

  private async getOrganizationUplinksStatuses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationId) return { content: [{ type: 'text', text: 'organizationId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.perPage) params.perPage = String(args.perPage);
    if (args.startingAfter) params.startingAfter = args.startingAfter as string;
    if (args.networkIds) params['networkIds[]'] = args.networkIds as string;
    return this.merakiGet(`/organizations/${encodeURIComponent(args.organizationId as string)}/appliance/uplink/statuses`, params);
  }

  private async getNetworkAlertsHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.networkId) return { content: [{ type: 'text', text: 'networkId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.perPage) params.perPage = String(args.perPage);
    if (args.startingAfter) params.startingAfter = args.startingAfter as string;
    return this.merakiGet(`/networks/${encodeURIComponent(args.networkId as string)}/alerts/history`, params);
  }

  private async listAppliancePorts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.networkId) return { content: [{ type: 'text', text: 'networkId is required' }], isError: true };
    return this.merakiGet(`/networks/${encodeURIComponent(args.networkId as string)}/appliance/ports`);
  }

  private async getNetworkFirmwareUpgrades(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.networkId) return { content: [{ type: 'text', text: 'networkId is required' }], isError: true };
    return this.merakiGet(`/networks/${encodeURIComponent(args.networkId as string)}/firmwareUpgrades`);
  }

  private async getOrganizationApiRequestsOverview(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationId) return { content: [{ type: 'text', text: 'organizationId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.t0) params.t0 = args.t0 as string;
    if (args.t1) params.t1 = args.t1 as string;
    if (args.timespan) params.timespan = String(args.timespan);
    return this.merakiGet(`/organizations/${encodeURIComponent(args.organizationId as string)}/apiRequests/overview`, params);
  }
}
