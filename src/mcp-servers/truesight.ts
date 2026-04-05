/**
 * TrueSight (BMC Hardware Sentry) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official BMC TrueSight MCP server was found on GitHub or BMC Developer Portal.
//
// Base URL: https://{hostname}:{port}/tsws/10.0/api (default: https://localhost:8043/tsws/10.0/api)
// Auth: Bearer token — obtained from TrueSight Presentation Server login endpoint.
// Spec: https://api.apis.guru/v2/specs/truesight.local/11.1.00/openapi.json
// Docs: https://community.bmc.com/s/group/0F93n000000PlUtCAK/sentry-software
// Rate limits: Not publicly documented.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TrueSightConfig {
  /** Bearer token from TrueSight Presentation Server authentication */
  accessToken: string;
  /** Hostname of the TrueSight server (default: localhost) */
  hostname?: string;
  /** Port of the TrueSight server (default: 8043) */
  port?: number;
  /** Full base URL override — overrides hostname/port if provided */
  baseUrl?: string;
}

export class TrueSightMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: TrueSightConfig) {
    super();
    this.accessToken = config.accessToken;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    } else {
      const hostname = config.hostname ?? 'localhost';
      const port = config.port ?? 8043;
      this.baseUrl = `https://${hostname}:${port}/tsws/10.0/api`;
    }
  }

  static catalog() {
    return {
      name: 'truesight',
      displayName: 'BMC TrueSight Hardware Sentry',
      version: '1.0.0',
      category: 'observability',
      keywords: [
        'truesight', 'bmc', 'hardware sentry', 'infrastructure monitoring', 'observability',
        'device monitoring', 'server monitoring', 'energy usage', 'hardware inventory',
        'network monitoring', 'datacenter', 'iot', 'agent', 'service monitoring',
        'parameter history', 'heating margin', 'rediscover', 'reinitialize',
      ],
      toolNames: [
        'list_devices', 'get_devices_summary', 'get_device', 'get_device_monitors',
        'get_device_agent', 'get_agent_devices', 'get_device_parameter_history',
        'get_device_energy_usage',
        'list_applications', 'get_application',
        'list_services', 'get_service',
        'list_groups', 'get_group', 'update_group_energy_cost',
        'get_history', 'search_devices', 'get_heating_margin_devices',
        'collect_now', 'rediscover_device', 'reinitialize_device',
        'remove_device', 'reset_device_error_count',
      ],
      description: 'BMC Hardware Sentry TrueSight Presentation Server — monitor hardware devices, servers, applications, and services. Query parameter history, energy usage, heating margins, and trigger operational actions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_devices',
        description: 'Get summarized information about all hardware devices monitored by TrueSight',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Filter devices belonging to a specific group ID',
            },
          },
        },
      },
      {
        name: 'get_devices_summary',
        description: 'Get overall aggregated summary statistics for all monitored devices (counts, statuses, alerts)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_device',
        description: 'Get detailed information about a specific monitored device including status, parameters, and alerts',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to retrieve details for',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'get_device_monitors',
        description: 'Get the list of monitors (KMs — Knowledge Modules) running on a specific device',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to retrieve monitors for',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'get_device_agent',
        description: 'Get detailed information about the monitoring agent managing a specific device',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID whose agent to retrieve',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'get_agent_devices',
        description: 'Get a list of all devices monitored by a specific agent',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID that represents the agent to list devices for',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'get_device_parameter_history',
        description: 'Get historical time-series data for a specific parameter (metric) on a device over a given period',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to retrieve parameter history for',
            },
            parameter_name: {
              type: 'string',
              description: 'Parameter name (metric) to retrieve history for (e.g. CPULoad, TemperatureCelsius)',
            },
            start_time: {
              type: 'string',
              description: 'Start of the time range in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'End of the time range in ISO 8601 format',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'get_device_energy_usage',
        description: 'Get energy consumption data (watts, kWh, cost) for a device over a specified time period',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to retrieve energy usage for',
            },
            start_time: {
              type: 'string',
              description: 'Start of the period in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'End of the period in ISO 8601 format',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'list_applications',
        description: 'Get summarized information about all monitored applications in TrueSight',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_application',
        description: 'Get detailed monitoring information for a specific application by application ID',
        inputSchema: {
          type: 'object',
          properties: {
            application_id: {
              type: 'string',
              description: 'Application ID to retrieve details for',
            },
          },
          required: ['application_id'],
        },
      },
      {
        name: 'list_services',
        description: 'Get summarized information about all monitored services in TrueSight',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_service',
        description: 'Get detailed monitoring information for a specific service by service ID',
        inputSchema: {
          type: 'object',
          properties: {
            service_id: {
              type: 'string',
              description: 'Service ID to retrieve details for',
            },
          },
          required: ['service_id'],
        },
      },
      {
        name: 'list_groups',
        description: 'Get all group summaries — groups organize devices into logical collections for monitoring and reporting',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_group',
        description: 'Get detailed information about a specific device group including its devices and aggregated status',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Group ID to retrieve details for',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'update_group_energy_cost',
        description: 'Update the energy cost parameters (cost per kWh, carbon footprint) for a specific group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Group ID to update energy cost for',
            },
            cost_per_kwh: {
              type: 'number',
              description: 'Energy cost in local currency per kilowatt-hour',
            },
            carbon_kg_per_kwh: {
              type: 'number',
              description: 'Carbon footprint in kg CO2 per kilowatt-hour',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_history',
        description: 'Get historical monitoring data for a specific group, application, or service over a time range',
        inputSchema: {
          type: 'object',
          properties: {
            entity_id: {
              type: 'string',
              description: 'ID of the group, application, or service to retrieve history for',
            },
            entity_type: {
              type: 'string',
              description: 'Type of entity: group, application, or service',
            },
            start_time: {
              type: 'string',
              description: 'Start of the time range in ISO 8601 format',
            },
            end_time: {
              type: 'string',
              description: 'End of the time range in ISO 8601 format',
            },
          },
        },
      },
      {
        name: 'search_devices',
        description: 'Search for monitored devices by name, model, manufacturer, or serial number',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term to match against device name, model, manufacturer, or serial number',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_heating_margin_devices',
        description: 'Get heating margin values for all monitored devices — indicates thermal headroom before overheating',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'collect_now',
        description: 'Trigger an immediate data collection on a specific device without waiting for the next scheduled poll',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to trigger collection on',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'rediscover_device',
        description: 'Trigger a new discovery scan on a device to detect configuration or component changes',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to rediscover',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'reinitialize_device',
        description: 'Send a Reinitialize KM command to a device to restart the Knowledge Module without removing it',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to reinitialize',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'remove_device',
        description: 'Remove a device instance from the TrueSight monitoring environment',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID to remove from monitoring',
            },
          },
          required: ['device_id'],
        },
      },
      {
        name: 'reset_device_error_count',
        description: 'Reset the error count parameter on a device to clear accumulated error metrics',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device ID whose error count to reset',
            },
          },
          required: ['device_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_devices': return this.listDevices(args);
        case 'get_devices_summary': return this.getDevicesSummary();
        case 'get_device': return this.getDevice(args);
        case 'get_device_monitors': return this.getDeviceMonitors(args);
        case 'get_device_agent': return this.getDeviceAgent(args);
        case 'get_agent_devices': return this.getAgentDevices(args);
        case 'get_device_parameter_history': return this.getDeviceParameterHistory(args);
        case 'get_device_energy_usage': return this.getDeviceEnergyUsage(args);
        case 'list_applications': return this.listApplications();
        case 'get_application': return this.getApplication(args);
        case 'list_services': return this.listServices();
        case 'get_service': return this.getService(args);
        case 'list_groups': return this.listGroups();
        case 'get_group': return this.getGroup(args);
        case 'update_group_energy_cost': return this.updateGroupEnergyCost(args);
        case 'get_history': return this.getHistory(args);
        case 'search_devices': return this.searchDevices(args);
        case 'get_heating_margin_devices': return this.getHeatingMarginDevices();
        case 'collect_now': return this.collectNow(args);
        case 'rediscover_device': return this.rediscoverDevice(args);
        case 'reinitialize_device': return this.reinitializeDevice(args);
        case 'remove_device': return this.removeDevice(args);
        case 'reset_device_error_count': return this.resetDeviceErrorCount(args);
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
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private buildQuery(params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const str = qs.toString();
    return str ? `?${str}` : '';
  }

  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${this.buildQuery(params)}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`TrueSight returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { success: true }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { data = { updated: true }; }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      groupId: args.group_id as string | undefined,
    };
    return this.get('/hardware/devices', params);
  }

  private async getDevicesSummary(): Promise<ToolResult> {
    return this.get('/hardware/devices-summary');
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.get(`/hardware/devices/${encodeURIComponent(args.device_id as string)}`);
  }

  private async getDeviceMonitors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.get(`/hardware/device-monitors/${encodeURIComponent(args.device_id as string)}`);
  }

  private async getDeviceAgent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.get(`/hardware/devices/${encodeURIComponent(args.device_id as string)}/agent`);
  }

  private async getAgentDevices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.get(`/hardware/devices/${encodeURIComponent(args.device_id as string)}/agent-devices`);
  }

  private async getDeviceParameterHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      parameterName: args.parameter_name as string | undefined,
      startTime: args.start_time as string | undefined,
      endTime: args.end_time as string | undefined,
    };
    return this.get(`/hardware/devices/${encodeURIComponent(args.device_id as string)}/parameter-history`, params);
  }

  private async getDeviceEnergyUsage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      startTime: args.start_time as string | undefined,
      endTime: args.end_time as string | undefined,
    };
    return this.get(`/hardware/energy-usage/${encodeURIComponent(args.device_id as string)}`, params);
  }

  private async listApplications(): Promise<ToolResult> {
    return this.get('/hardware/applications');
  }

  private async getApplication(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.application_id) return { content: [{ type: 'text', text: 'application_id is required' }], isError: true };
    return this.get(`/hardware/applications/${encodeURIComponent(args.application_id as string)}`);
  }

  private async listServices(): Promise<ToolResult> {
    return this.get('/hardware/services');
  }

  private async getService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: 'text', text: 'service_id is required' }], isError: true };
    return this.get(`/hardware/services/${encodeURIComponent(args.service_id as string)}`);
  }

  private async listGroups(): Promise<ToolResult> {
    return this.get('/hardware/groups');
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.get(`/hardware/groups/${encodeURIComponent(args.group_id as string)}`);
  }

  private async updateGroupEnergyCost(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.cost_per_kwh !== undefined) body.costPerKwh = args.cost_per_kwh;
    if (args.carbon_kg_per_kwh !== undefined) body.carbonKgPerKwh = args.carbon_kg_per_kwh;
    return this.put(`/hardware/groups/${encodeURIComponent(args.group_id as string)}`, body);
  }

  private async getHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      entityId: args.entity_id as string | undefined,
      entityType: args.entity_type as string | undefined,
      startTime: args.start_time as string | undefined,
      endTime: args.end_time as string | undefined,
    };
    return this.get('/hardware/history', params);
  }

  private async searchDevices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.get('/hardware/search-devices', { query: args.query as string });
  }

  private async getHeatingMarginDevices(): Promise<ToolResult> {
    return this.get('/hardware/heating-margin-devices');
  }

  private async collectNow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.post(`/hardware/actions/${encodeURIComponent(args.device_id as string)}/collect-now`);
  }

  private async rediscoverDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.post(`/hardware/actions/${encodeURIComponent(args.device_id as string)}/rediscover`);
  }

  private async reinitializeDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.post(`/hardware/actions/${encodeURIComponent(args.device_id as string)}/reinitialize`);
  }

  private async removeDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.post(`/hardware/actions/${encodeURIComponent(args.device_id as string)}/remove`);
  }

  private async resetDeviceErrorCount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.device_id) return { content: [{ type: 'text', text: 'device_id is required' }], isError: true };
    return this.post(`/hardware/actions/${encodeURIComponent(args.device_id as string)}/reset-error-count`);
  }
}
