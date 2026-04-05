/**
 * Samsara MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Samsara MCP server was found on GitHub. Third-party implementations
// exist via Pipedream and viaSocket but are not maintained by Samsara.
//
// Base URL: https://api.samsara.com
// Auth: Bearer token in Authorization header
// Docs: https://developers.samsara.com/docs/rest-api-overview
// Rate limits: Per-endpoint limits apply (e.g. 25 req/sec for list vehicles,
//   5 req/sec for safety score, 5 req/sec for alert configurations).
//   Global organizational limits also apply. See docs for per-endpoint details.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SamsaraConfig {
  apiToken: string;
  baseUrl?: string;
}

export class SamsaraMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: SamsaraConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.samsara.com';
  }

  static catalog() {
    return {
      name: 'samsara',
      displayName: 'Samsara',
      version: '1.0.0',
      category: 'misc',
      keywords: ['samsara', 'fleet', 'telematics', 'vehicle', 'driver', 'gps', 'tracking', 'eld', 'hos', 'route', 'safety', 'asset', 'dispatch', 'logistics', 'connected operations'],
      toolNames: [
        'list_vehicles', 'get_vehicle', 'get_vehicle_locations', 'get_vehicle_stats',
        'list_drivers', 'get_driver', 'update_driver',
        'list_hos_logs', 'get_driver_safety_score',
        'list_routes', 'get_route', 'create_route', 'update_route', 'delete_route',
        'list_assets', 'get_asset', 'get_asset_locations',
        'list_alerts', 'get_alert',
        'list_tags', 'get_tag',
      ],
      description: 'Samsara fleet management: track vehicles and assets, manage drivers and HOS logs, monitor safety scores, and manage routes.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_vehicles',
        description: 'List all vehicles in the Samsara fleet with optional tag and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag_ids: {
              type: 'string',
              description: 'Comma-separated tag IDs to filter vehicles by',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (default: 512, max: 512)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response endCursor field',
            },
          },
        },
      },
      {
        name: 'get_vehicle',
        description: 'Get details for a specific Samsara vehicle by its ID including make, model, and VIN',
        inputSchema: {
          type: 'object',
          properties: {
            vehicle_id: {
              type: 'string',
              description: 'Vehicle ID to retrieve',
            },
          },
          required: ['vehicle_id'],
        },
      },
      {
        name: 'get_vehicle_locations',
        description: 'Get the most recent GPS location for one or more Samsara vehicles',
        inputSchema: {
          type: 'object',
          properties: {
            vehicle_ids: {
              type: 'string',
              description: 'Comma-separated vehicle IDs (omit for all vehicles)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_vehicle_stats',
        description: 'Get vehicle statistics (fuel, engine hours, odometer) for one or more vehicles over a time range',
        inputSchema: {
          type: 'object',
          properties: {
            vehicle_ids: {
              type: 'string',
              description: 'Comma-separated vehicle IDs',
            },
            types: {
              type: 'string',
              description: 'Comma-separated stat types: engineStates, fuelPercents, obdOdometerMeters, gps, engineHours',
            },
            start_time: {
              type: 'string',
              description: 'Start of time range in RFC 3339 format (e.g. 2026-03-01T00:00:00Z)',
            },
            end_time: {
              type: 'string',
              description: 'End of time range in RFC 3339 format',
            },
          },
          required: ['types'],
        },
      },
      {
        name: 'list_drivers',
        description: 'List all drivers in the Samsara account with optional tag and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            tag_ids: {
              type: 'string',
              description: 'Comma-separated tag IDs to filter drivers',
            },
            driver_activation_status: {
              type: 'string',
              description: 'Filter by status: active or deactivated (default: active)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results per page (default: 512)',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_driver',
        description: 'Get profile and details for a specific Samsara driver by their driver ID',
        inputSchema: {
          type: 'object',
          properties: {
            driver_id: {
              type: 'string',
              description: 'Driver ID to retrieve',
            },
          },
          required: ['driver_id'],
        },
      },
      {
        name: 'update_driver',
        description: 'Update driver profile fields such as name, license, and ELD settings in Samsara',
        inputSchema: {
          type: 'object',
          properties: {
            driver_id: {
              type: 'string',
              description: 'Driver ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated driver full name',
            },
            phone: {
              type: 'string',
              description: 'Updated driver phone number',
            },
            license_number: {
              type: 'string',
              description: 'Updated driver license number',
            },
            license_state: {
              type: 'string',
              description: 'Updated driver license state (2-letter abbreviation)',
            },
          },
          required: ['driver_id'],
        },
      },
      {
        name: 'list_hos_logs',
        description: 'List Hours of Service (HOS) duty status logs for drivers with date range and driver filters',
        inputSchema: {
          type: 'object',
          properties: {
            driver_ids: {
              type: 'string',
              description: 'Comma-separated driver IDs to filter',
            },
            start_time: {
              type: 'string',
              description: 'Start of time range in RFC 3339 format',
            },
            end_time: {
              type: 'string',
              description: 'End of time range in RFC 3339 format',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_driver_safety_score',
        description: 'Get the safety score and harsh events summary for a specific driver over a time period',
        inputSchema: {
          type: 'object',
          properties: {
            driver_id: {
              type: 'string',
              description: 'Driver ID to retrieve safety score for',
            },
            start_ms: {
              type: 'number',
              description: 'Start of scoring period as Unix timestamp in milliseconds',
            },
            end_ms: {
              type: 'number',
              description: 'End of scoring period as Unix timestamp in milliseconds',
            },
          },
          required: ['driver_id', 'start_ms', 'end_ms'],
        },
      },
      {
        name: 'list_routes',
        description: 'List dispatch routes in Samsara with optional driver, vehicle, and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            driver_id: {
              type: 'string',
              description: 'Filter by driver ID',
            },
            vehicle_id: {
              type: 'string',
              description: 'Filter by vehicle ID',
            },
            start_time: {
              type: 'string',
              description: 'Filter routes starting after this RFC 3339 datetime',
            },
            end_time: {
              type: 'string',
              description: 'Filter routes starting before this RFC 3339 datetime',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_route',
        description: 'Get details for a specific Samsara dispatch route by its route ID',
        inputSchema: {
          type: 'object',
          properties: {
            route_id: {
              type: 'string',
              description: 'Route ID to retrieve',
            },
          },
          required: ['route_id'],
        },
      },
      {
        name: 'create_route',
        description: 'Create a new dispatch route in Samsara with stops, driver, and vehicle assignments',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the route',
            },
            driver_id: {
              type: 'string',
              description: 'ID of the driver assigned to this route',
            },
            vehicle_id: {
              type: 'string',
              description: 'ID of the vehicle assigned to this route',
            },
            scheduled_start_ms: {
              type: 'number',
              description: 'Scheduled route start time as Unix timestamp in milliseconds',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_route',
        description: 'Update an existing Samsara dispatch route name, driver, or vehicle assignment',
        inputSchema: {
          type: 'object',
          properties: {
            route_id: {
              type: 'string',
              description: 'Route ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated route name',
            },
            driver_id: {
              type: 'string',
              description: 'Updated driver ID assignment',
            },
            vehicle_id: {
              type: 'string',
              description: 'Updated vehicle ID assignment',
            },
          },
          required: ['route_id'],
        },
      },
      {
        name: 'delete_route',
        description: 'Delete a Samsara dispatch route by its route ID',
        inputSchema: {
          type: 'object',
          properties: {
            route_id: {
              type: 'string',
              description: 'Route ID to delete',
            },
          },
          required: ['route_id'],
        },
      },
      {
        name: 'list_assets',
        description: 'List non-vehicle tracked assets (trailers, equipment) in the Samsara account',
        inputSchema: {
          type: 'object',
          properties: {
            tag_ids: {
              type: 'string',
              description: 'Comma-separated tag IDs to filter assets',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_asset',
        description: 'Get details for a specific Samsara tracked asset by its asset ID',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Asset ID to retrieve',
            },
          },
          required: ['asset_id'],
        },
      },
      {
        name: 'get_asset_locations',
        description: 'Get the most recent GPS location for tracked assets in the Samsara fleet',
        inputSchema: {
          type: 'object',
          properties: {
            asset_ids: {
              type: 'string',
              description: 'Comma-separated asset IDs (omit for all assets)',
            },
          },
        },
      },
      {
        name: 'list_alerts',
        description: 'List Samsara alert configurations with optional filters for IDs and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Comma-separated alert configuration IDs to filter by',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return',
            },
          },
        },
      },
      {
        name: 'get_alert',
        description: 'List triggered alert incidents in Samsara with optional time range and alert configuration ID filters',
        inputSchema: {
          type: 'object',
          properties: {
            alert_configuration_id: {
              type: 'string',
              description: 'Filter by alert configuration ID',
            },
            start_time: {
              type: 'string',
              description: 'Start of time range in RFC 3339 format',
            },
            end_time: {
              type: 'string',
              description: 'End of time range in RFC 3339 format',
            },
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_tags',
        description: 'List all organizational tags in the Samsara account for grouping vehicles, drivers, and assets',
        inputSchema: {
          type: 'object',
          properties: {
            after: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_tag',
        description: 'Get details and member list for a specific Samsara tag by its tag ID',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: {
              type: 'string',
              description: 'Tag ID to retrieve',
            },
          },
          required: ['tag_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_vehicles':
          return this.listVehicles(args);
        case 'get_vehicle':
          return this.getVehicle(args);
        case 'get_vehicle_locations':
          return this.getVehicleLocations(args);
        case 'get_vehicle_stats':
          return this.getVehicleStats(args);
        case 'list_drivers':
          return this.listDrivers(args);
        case 'get_driver':
          return this.getDriver(args);
        case 'update_driver':
          return this.updateDriver(args);
        case 'list_hos_logs':
          return this.listHosLogs(args);
        case 'get_driver_safety_score':
          return this.getDriverSafetyScore(args);
        case 'list_routes':
          return this.listRoutes(args);
        case 'get_route':
          return this.getRoute(args);
        case 'create_route':
          return this.createRoute(args);
        case 'update_route':
          return this.updateRoute(args);
        case 'delete_route':
          return this.deleteRoute(args);
        case 'list_assets':
          return this.listAssets(args);
        case 'get_asset':
          return this.getAsset(args);
        case 'get_asset_locations':
          return this.getAssetLocations(args);
        case 'list_alerts':
          return this.listAlerts(args);
        case 'get_alert':
          return this.getAlert(args);
        case 'list_tags':
          return this.listTags(args);
        case 'get_tag':
          return this.getTag(args);
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
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private buildQs(params: Record<string, string | number | undefined>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) p.set(k, String(v));
    }
    const s = p.toString();
    return s ? '?' + s : '';
  }

  private async listVehicles(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/fleet/vehicles' + this.buildQs({ tagIds: args.tag_ids as string, limit: args.limit as number, after: args.after as string }));
  }

  private async getVehicle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vehicle_id) return { content: [{ type: 'text', text: 'vehicle_id is required' }], isError: true };
    return this.apiGet(`/fleet/vehicles/${encodeURIComponent(args.vehicle_id as string)}`);
  }

  private async getVehicleLocations(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/fleet/vehicles/locations' + this.buildQs({ vehicleIds: args.vehicle_ids as string, after: args.after as string }));
  }

  private async getVehicleStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.types) return { content: [{ type: 'text', text: 'types is required' }], isError: true };
    return this.apiGet('/fleet/vehicles/stats' + this.buildQs({
      types: args.types as string,
      vehicleIds: args.vehicle_ids as string,
      startTime: args.start_time as string,
      endTime: args.end_time as string,
    }));
  }

  private async listDrivers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/fleet/drivers' + this.buildQs({
      tagIds: args.tag_ids as string,
      driverActivationStatus: args.driver_activation_status as string,
      limit: args.limit as number,
      after: args.after as string,
    }));
  }

  private async getDriver(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.driver_id) return { content: [{ type: 'text', text: 'driver_id is required' }], isError: true };
    return this.apiGet(`/fleet/drivers/${encodeURIComponent(args.driver_id as string)}`);
  }

  private async updateDriver(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.driver_id) return { content: [{ type: 'text', text: 'driver_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.phone) body.phone = args.phone;
    if (args.license_number) body.licenseNumber = args.license_number;
    if (args.license_state) body.licenseState = args.license_state;
    return this.apiPatch(`/fleet/drivers/${encodeURIComponent(args.driver_id as string)}`, body);
  }

  private async listHosLogs(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/fleet/hos/logs' + this.buildQs({
      driverIds: args.driver_ids as string,
      startTime: args.start_time as string,
      endTime: args.end_time as string,
      after: args.after as string,
    }));
  }

  private async getDriverSafetyScore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.driver_id || !args.start_ms || !args.end_ms) {
      return { content: [{ type: 'text', text: 'driver_id, start_ms, and end_ms are required' }], isError: true };
    }
    // Legacy API endpoint (v1): /v1/fleet/drivers/{driverId}/safety/score
    return this.apiGet(`/v1/fleet/drivers/${encodeURIComponent(args.driver_id as string)}/safety/score?startMs=${encodeURIComponent(String(args.start_ms))}&endMs=${encodeURIComponent(String(args.end_ms))}`);
  }

  private async listRoutes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/fleet/routes' + this.buildQs({
      driverId: args.driver_id as string,
      vehicleId: args.vehicle_id as string,
      startTime: args.start_time as string,
      endTime: args.end_time as string,
      after: args.after as string,
    }));
  }

  private async getRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.route_id) return { content: [{ type: 'text', text: 'route_id is required' }], isError: true };
    return this.apiGet(`/fleet/routes/${encodeURIComponent(args.route_id as string)}`);
  }

  private async createRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.driver_id) body.driverId = args.driver_id;
    if (args.vehicle_id) body.vehicleId = args.vehicle_id;
    if (args.scheduled_start_ms) body.scheduledStartMs = args.scheduled_start_ms;
    return this.apiPost('/fleet/routes', body);
  }

  private async updateRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.route_id) return { content: [{ type: 'text', text: 'route_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.driver_id) body.driverId = args.driver_id;
    if (args.vehicle_id) body.vehicleId = args.vehicle_id;
    return this.apiPatch(`/fleet/routes/${encodeURIComponent(args.route_id as string)}`, body);
  }

  private async deleteRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.route_id) return { content: [{ type: 'text', text: 'route_id is required' }], isError: true };
    return this.apiDelete(`/fleet/routes/${encodeURIComponent(args.route_id as string)}`);
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/fleet/assets' + this.buildQs({ tagIds: args.tag_ids as string, after: args.after as string }));
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.asset_id) return { content: [{ type: 'text', text: 'asset_id is required' }], isError: true };
    return this.apiGet(`/fleet/assets/${encodeURIComponent(args.asset_id as string)}`);
  }

  private async getAssetLocations(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/fleet/assets/locations' + this.buildQs({ assetIds: args.asset_ids as string }));
  }

  private async listAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    // Samsara Alerts API: GET /alerts/configurations
    return this.apiGet('/alerts/configurations' + this.buildQs({ ids: args.ids as string, after: args.after as string, limit: args.limit as number }));
  }

  private async getAlert(args: Record<string, unknown>): Promise<ToolResult> {
    // Samsara Alerts API: GET /alerts/incidents (triggered alert events)
    return this.apiGet('/alerts/incidents' + this.buildQs({
      alertConfigurationId: args.alert_configuration_id as string,
      startTime: args.start_time as string,
      endTime: args.end_time as string,
      after: args.after as string,
    }));
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/tags' + this.buildQs({ after: args.after as string }));
  }

  private async getTag(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tag_id) return { content: [{ type: 'text', text: 'tag_id is required' }], isError: true };
    return this.apiGet(`/tags/${encodeURIComponent(args.tag_id as string)}`);
  }
}
