/**
 * Enode MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Enode MCP server was found on GitHub or the Enode Developer Portal.
//
// Base URL: https://enode-api.production.enode.io
// Auth: OAuth2 Client Credentials — POST /oauth2/token with client_id + client_secret.
//   Bearer token required in Authorization header for all API calls.
//   Token endpoint: https://oauth.production.enode.io/oauth2/token
// Docs: https://docs.enode.io/
// Rate limits: Not publicly documented; standard OAuth2 token expiry applies (3600s).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EnodeConfig {
  /** OAuth2 client ID from Enode developer portal */
  clientId: string;
  /** OAuth2 client secret from Enode developer portal */
  clientSecret: string;
  /** Optional API base URL override (default: https://enode-api.production.enode.io) */
  baseUrl?: string;
  /** Optional OAuth2 token URL override (default: https://oauth.production.enode.io/oauth2/token) */
  tokenUrl?: string;
}

export class EnodeMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: EnodeConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl ?? 'https://enode-api.production.enode.io';
    this.tokenUrl = config.tokenUrl ?? 'https://oauth.production.enode.io/oauth2/token';
  }

  static catalog() {
    return {
      name: 'enode',
      displayName: 'Enode',
      version: '1.0.0',
      category: 'iot',
      keywords: [
        'enode', 'ev', 'electric vehicle', 'smart charging', 'charger', 'vehicle',
        'iot', 'energy', 'charging location', 'smart grid', 'fleet', 'odometer',
        'battery', 'charge state', 'webhook', 'firehose', 'telematics',
      ],
      toolNames: [
        'list_vehicles', 'get_vehicle', 'get_vehicle_charge_state',
        'get_vehicle_information', 'get_vehicle_location', 'get_vehicle_odometer',
        'control_vehicle_charging', 'get_smart_charging_policy', 'update_smart_charging_policy',
        'watch_vehicle',
        'list_chargers', 'get_charger', 'control_charger_charging',
        'list_charging_locations', 'get_charging_location',
        'create_charging_location', 'update_charging_location', 'delete_charging_location',
        'get_charging_statistics',
        'get_my_user', 'link_user', 'unlink_user', 'deauthorize_user', 'disconnect_vendor',
        'check_service_readiness', 'check_available_vendors',
        'update_firehose_webhook', 'test_firehose_webhook',
      ],
      description: 'EV and smart charging management: control vehicles and chargers, manage charging locations, query charge state and location, configure smart charging policies, and handle user linking.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_vehicles',
        description: 'List all electric vehicles linked to the Enode account with optional field filtering',
        inputSchema: {
          type: 'object',
          properties: {
            fields: {
              type: 'string',
              description: 'Comma-separated vehicle fields to include in response (e.g. id,chargeState,information)',
            },
          },
        },
      },
      {
        name: 'get_vehicle',
        description: 'Get full details of a single electric vehicle by its vehicle ID',
        inputSchema: {
          type: 'object',
          properties: {
            vehicle_id: {
              type: 'string',
              description: 'Unique Enode vehicle ID',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields to include in response (default: all)',
            },
          },
          required: ['vehicle_id'],
        },
      },
      {
        name: 'get_vehicle_charge_state',
        description: 'Get the current battery and charge state of a vehicle including charge level, range, and plug status',
        inputSchema: {
          type: 'object',
          properties: {
            vehicle_id: {
              type: 'string',
              description: 'Unique Enode vehicle ID',
            },
          },
          required: ['vehicle_id'],
        },
      },
      {
        name: 'get_vehicle_information',
        description: 'Get static vehicle information including make, model, year, and capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            vehicle_id: {
              type: 'string',
              description: 'Unique Enode vehicle ID',
            },
          },
          required: ['vehicle_id'],
        },
      },
      {
        name: 'get_vehicle_location',
        description: 'Get the current GPS location coordinates of a vehicle',
        inputSchema: {
          type: 'object',
          properties: {
            vehicle_id: {
              type: 'string',
              description: 'Unique Enode vehicle ID',
            },
          },
          required: ['vehicle_id'],
        },
      },
      {
        name: 'get_vehicle_odometer',
        description: 'Get the current odometer reading of a vehicle in kilometers',
        inputSchema: {
          type: 'object',
          properties: {
            vehicle_id: {
              type: 'string',
              description: 'Unique Enode vehicle ID',
            },
          },
          required: ['vehicle_id'],
        },
      },
      {
        name: 'control_vehicle_charging',
        description: 'Start or stop charging for a specific electric vehicle',
        inputSchema: {
          type: 'object',
          properties: {
            vehicle_id: {
              type: 'string',
              description: 'Unique Enode vehicle ID',
            },
            action: {
              type: 'string',
              description: 'Charging action to perform: START or STOP',
            },
          },
          required: ['vehicle_id', 'action'],
        },
      },
      {
        name: 'get_smart_charging_policy',
        description: 'Get the smart charging policy for a vehicle including schedule, deadline, and enabled status',
        inputSchema: {
          type: 'object',
          properties: {
            vehicle_id: {
              type: 'string',
              description: 'Unique Enode vehicle ID',
            },
          },
          required: ['vehicle_id'],
        },
      },
      {
        name: 'update_smart_charging_policy',
        description: 'Update the smart charging policy for a vehicle, setting deadline and enabling or disabling smart charging',
        inputSchema: {
          type: 'object',
          properties: {
            vehicle_id: {
              type: 'string',
              description: 'Unique Enode vehicle ID',
            },
            is_enabled: {
              type: 'boolean',
              description: 'Whether to enable smart charging for this vehicle',
            },
            deadline: {
              type: 'string',
              description: 'Target time to complete charging by in HH:MM format (e.g. 07:00)',
            },
          },
          required: ['vehicle_id'],
        },
      },
      {
        name: 'watch_vehicle',
        description: 'Start watching a vehicle for property changes, subscribing to real-time updates via webhooks',
        inputSchema: {
          type: 'object',
          properties: {
            vehicle_id: {
              type: 'string',
              description: 'Unique Enode vehicle ID',
            },
            properties: {
              type: 'array',
              description: 'Array of vehicle properties to watch (e.g. ["chargeState", "location"])',
            },
          },
          required: ['vehicle_id'],
        },
      },
      {
        name: 'list_chargers',
        description: 'List all EV chargers linked to the Enode account with optional field filtering',
        inputSchema: {
          type: 'object',
          properties: {
            fields: {
              type: 'string',
              description: 'Comma-separated charger fields to include in response (default: all)',
            },
          },
        },
      },
      {
        name: 'get_charger',
        description: 'Get full details of a single EV charger by its charger ID',
        inputSchema: {
          type: 'object',
          properties: {
            charger_id: {
              type: 'string',
              description: 'Unique Enode charger ID',
            },
          },
          required: ['charger_id'],
        },
      },
      {
        name: 'control_charger_charging',
        description: 'Start or stop charging on a specific EV charger',
        inputSchema: {
          type: 'object',
          properties: {
            charger_id: {
              type: 'string',
              description: 'Unique Enode charger ID',
            },
            action: {
              type: 'string',
              description: 'Charging action to perform: START or STOP',
            },
          },
          required: ['charger_id', 'action'],
        },
      },
      {
        name: 'list_charging_locations',
        description: 'List all configured charging locations (home, workplace, etc.) for the account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_charging_location',
        description: 'Get details of a specific charging location by ID including coordinates and name',
        inputSchema: {
          type: 'object',
          properties: {
            charging_location_id: {
              type: 'string',
              description: 'Unique Enode charging location ID',
            },
          },
          required: ['charging_location_id'],
        },
      },
      {
        name: 'create_charging_location',
        description: 'Create a new named charging location with GPS coordinates for smart charging geofencing',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable name for the location (e.g. "Home", "Office")',
            },
            latitude: {
              type: 'number',
              description: 'Latitude coordinate of the charging location',
            },
            longitude: {
              type: 'number',
              description: 'Longitude coordinate of the charging location',
            },
          },
          required: ['name', 'latitude', 'longitude'],
        },
      },
      {
        name: 'update_charging_location',
        description: 'Update the name or coordinates of an existing charging location',
        inputSchema: {
          type: 'object',
          properties: {
            charging_location_id: {
              type: 'string',
              description: 'Unique Enode charging location ID',
            },
            name: {
              type: 'string',
              description: 'New name for the charging location',
            },
            latitude: {
              type: 'number',
              description: 'Updated latitude coordinate',
            },
            longitude: {
              type: 'number',
              description: 'Updated longitude coordinate',
            },
          },
          required: ['charging_location_id'],
        },
      },
      {
        name: 'delete_charging_location',
        description: 'Delete a charging location by ID, removing it from smart charging geofencing',
        inputSchema: {
          type: 'object',
          properties: {
            charging_location_id: {
              type: 'string',
              description: 'Unique Enode charging location ID to delete',
            },
          },
          required: ['charging_location_id'],
        },
      },
      {
        name: 'get_charging_statistics',
        description: 'Get aggregated charging energy and cost statistics for a date range with optional vehicle and location filters',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Start date for statistics in ISO 8601 format (e.g. 2024-01-01)',
            },
            end_date: {
              type: 'string',
              description: 'End date for statistics in ISO 8601 format (defaults to current date)',
            },
            resolution: {
              type: 'string',
              description: 'Time resolution for grouping: day, week, month (default: day)',
            },
            vehicle_id: {
              type: 'string',
              description: 'Optional vehicle ID to filter statistics to one vehicle',
            },
            charging_location_id: {
              type: 'string',
              description: 'Optional charging location ID to filter statistics to one location',
            },
          },
          required: ['start_date'],
        },
      },
      {
        name: 'get_my_user',
        description: 'Get information about the currently authenticated Enode API user or client',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'link_user',
        description: 'Generate a link URL for a user to connect their EV or charger account to a specific vendor',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Your platform user ID to associate the linked vehicle or charger with',
            },
            vendor: {
              type: 'string',
              description: 'Vehicle or charger vendor to link (e.g. TESLA, AUDI, BMW, WALLBOX)',
            },
            user_name: {
              type: 'string',
              description: 'Display name for the user shown in the OAuth flow',
            },
            link_multiple: {
              type: 'boolean',
              description: 'Allow linking multiple vehicles from this vendor (default: false)',
            },
          },
          required: ['user_id', 'vendor'],
        },
      },
      {
        name: 'unlink_user',
        description: 'Unlink a user and remove all their linked vehicles and chargers from the platform',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Platform user ID to unlink and remove',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'deauthorize_user',
        description: 'Revoke the Enode authorization for a user without deleting their vehicle data',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Platform user ID to deauthorize',
            },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'disconnect_vendor',
        description: 'Disconnect a specific vendor integration from a user account (e.g. remove TESLA access)',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Platform user ID whose vendor connection to remove',
            },
            vendor: {
              type: 'string',
              description: 'Vendor name to disconnect (e.g. TESLA, AUDI, BMW, WALLBOX)',
            },
          },
          required: ['user_id', 'vendor'],
        },
      },
      {
        name: 'check_service_readiness',
        description: 'Check whether the Enode API service is ready to accept requests',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'check_available_vendors',
        description: 'List all EV and charger vendors available for user linking via the Enode platform',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update_firehose_webhook',
        description: 'Configure or update the firehose webhook URL and signing secret for real-time event delivery',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'HTTPS URL to deliver webhook events to',
            },
            secret: {
              type: 'string',
              description: 'HMAC signing secret for webhook payload verification',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'test_firehose_webhook',
        description: 'Send a test event to the configured firehose webhook URL to verify connectivity',
        inputSchema: {
          type: 'object',
          properties: {},
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
        case 'get_vehicle_charge_state':
          return this.getVehicleChargeState(args);
        case 'get_vehicle_information':
          return this.getVehicleInformation(args);
        case 'get_vehicle_location':
          return this.getVehicleLocation(args);
        case 'get_vehicle_odometer':
          return this.getVehicleOdometer(args);
        case 'control_vehicle_charging':
          return this.controlVehicleCharging(args);
        case 'get_smart_charging_policy':
          return this.getSmartChargingPolicy(args);
        case 'update_smart_charging_policy':
          return this.updateSmartChargingPolicy(args);
        case 'watch_vehicle':
          return this.watchVehicle(args);
        case 'list_chargers':
          return this.listChargers(args);
        case 'get_charger':
          return this.getCharger(args);
        case 'control_charger_charging':
          return this.controlChargerCharging(args);
        case 'list_charging_locations':
          return this.listChargingLocations();
        case 'get_charging_location':
          return this.getChargingLocation(args);
        case 'create_charging_location':
          return this.createChargingLocation(args);
        case 'update_charging_location':
          return this.updateChargingLocation(args);
        case 'delete_charging_location':
          return this.deleteChargingLocation(args);
        case 'get_charging_statistics':
          return this.getChargingStatistics(args);
        case 'get_my_user':
          return this.getMyUser();
        case 'link_user':
          return this.linkUser(args);
        case 'unlink_user':
          return this.unlinkUser(args);
        case 'deauthorize_user':
          return this.deauthorizeUser(args);
        case 'disconnect_vendor':
          return this.disconnectVendor(args);
        case 'check_service_readiness':
          return this.checkServiceReadiness();
        case 'check_available_vendors':
          return this.checkAvailableVendors();
        case 'update_firehose_webhook':
          return this.updateFirehoseWebhook(args);
        case 'test_firehose_webhook':
          return this.testFirehoseWebhook();
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
    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async request(method: string, path: string, body?: unknown, params?: Record<string, string | undefined>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) qs.set(k, v);
      }
      const str = qs.toString();
      if (str) url += `?${str}`;
    }
    const init: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: 204 }) }], isError: false };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `Enode returned non-JSON (HTTP ${response.status})` }], isError: true };
    }
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listVehicles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.fields) params['field[]'] = args.fields as string;
    return this.request('GET', '/vehicles', undefined, params);
  }

  private async getVehicle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vehicle_id) return { content: [{ type: 'text', text: 'vehicle_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.fields) params['field[]'] = args.fields as string;
    return this.request('GET', `/vehicles/${encodeURIComponent(args.vehicle_id as string)}`, undefined, params);
  }

  private async getVehicleChargeState(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vehicle_id) return { content: [{ type: 'text', text: 'vehicle_id is required' }], isError: true };
    return this.request('GET', `/vehicles/${encodeURIComponent(args.vehicle_id as string)}/charge-state`);
  }

  private async getVehicleInformation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vehicle_id) return { content: [{ type: 'text', text: 'vehicle_id is required' }], isError: true };
    return this.request('GET', `/vehicles/${encodeURIComponent(args.vehicle_id as string)}/information`);
  }

  private async getVehicleLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vehicle_id) return { content: [{ type: 'text', text: 'vehicle_id is required' }], isError: true };
    return this.request('GET', `/vehicles/${encodeURIComponent(args.vehicle_id as string)}/location`);
  }

  private async getVehicleOdometer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vehicle_id) return { content: [{ type: 'text', text: 'vehicle_id is required' }], isError: true };
    return this.request('GET', `/vehicles/${encodeURIComponent(args.vehicle_id as string)}/odometer`);
  }

  private async controlVehicleCharging(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vehicle_id) return { content: [{ type: 'text', text: 'vehicle_id is required' }], isError: true };
    if (!args.action) return { content: [{ type: 'text', text: 'action is required (START or STOP)' }], isError: true };
    return this.request('POST', `/vehicles/${encodeURIComponent(args.vehicle_id as string)}/charging`, { action: args.action });
  }

  private async getSmartChargingPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vehicle_id) return { content: [{ type: 'text', text: 'vehicle_id is required' }], isError: true };
    return this.request('GET', `/vehicles/${encodeURIComponent(args.vehicle_id as string)}/smart-charging-policy`);
  }

  private async updateSmartChargingPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vehicle_id) return { content: [{ type: 'text', text: 'vehicle_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.is_enabled !== undefined) body.isEnabled = args.is_enabled;
    if (args.deadline !== undefined) body.deadline = args.deadline;
    return this.request('PUT', `/vehicles/${encodeURIComponent(args.vehicle_id as string)}/smart-charging-policy`, body);
  }

  private async watchVehicle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vehicle_id) return { content: [{ type: 'text', text: 'vehicle_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.properties !== undefined) body.properties = args.properties;
    return this.request('POST', `/vehicles/${encodeURIComponent(args.vehicle_id as string)}/watch`, body);
  }

  private async listChargers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.fields) params['field[]'] = args.fields as string;
    return this.request('GET', '/chargers', undefined, params);
  }

  private async getCharger(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.charger_id) return { content: [{ type: 'text', text: 'charger_id is required' }], isError: true };
    return this.request('GET', `/chargers/${encodeURIComponent(args.charger_id as string)}`);
  }

  private async controlChargerCharging(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.charger_id) return { content: [{ type: 'text', text: 'charger_id is required' }], isError: true };
    if (!args.action) return { content: [{ type: 'text', text: 'action is required (START or STOP)' }], isError: true };
    return this.request('POST', `/chargers/${encodeURIComponent(args.charger_id as string)}/charging`, { action: args.action });
  }

  private async listChargingLocations(): Promise<ToolResult> {
    return this.request('GET', '/charging-locations');
  }

  private async getChargingLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.charging_location_id) return { content: [{ type: 'text', text: 'charging_location_id is required' }], isError: true };
    return this.request('GET', `/charging-locations/${encodeURIComponent(args.charging_location_id as string)}`);
  }

  private async createChargingLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || args.latitude === undefined || args.longitude === undefined) {
      return { content: [{ type: 'text', text: 'name, latitude, and longitude are required' }], isError: true };
    }
    return this.request('POST', '/charging-locations', {
      name: args.name,
      latitude: args.latitude,
      longitude: args.longitude,
    });
  }

  private async updateChargingLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.charging_location_id) return { content: [{ type: 'text', text: 'charging_location_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.latitude !== undefined) body.latitude = args.latitude;
    if (args.longitude !== undefined) body.longitude = args.longitude;
    return this.request('PUT', `/charging-locations/${encodeURIComponent(args.charging_location_id as string)}`, body);
  }

  private async deleteChargingLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.charging_location_id) return { content: [{ type: 'text', text: 'charging_location_id is required' }], isError: true };
    return this.request('DELETE', `/charging-locations/${encodeURIComponent(args.charging_location_id as string)}`);
  }

  private async getChargingStatistics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.start_date) return { content: [{ type: 'text', text: 'start_date is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      startDate: args.start_date as string,
      endDate: args.end_date as string | undefined,
      resolution: args.resolution as string | undefined,
      vehicleId: args.vehicle_id as string | undefined,
      chargingLocationId: args.charging_location_id as string | undefined,
    };
    return this.request('GET', '/statistics/charging', undefined, params);
  }

  private async getMyUser(): Promise<ToolResult> {
    return this.request('GET', '/me');
  }

  private async linkUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id || !args.vendor) return { content: [{ type: 'text', text: 'user_id and vendor are required' }], isError: true };
    const body: Record<string, unknown> = { vendor: args.vendor };
    if (args.user_name !== undefined) body.userName = args.user_name;
    if (args.link_multiple !== undefined) body.linkMultiple = args.link_multiple;
    return this.request('POST', `/users/${encodeURIComponent(args.user_id as string)}/link`, body);
  }

  private async unlinkUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.request('DELETE', `/users/${encodeURIComponent(args.user_id as string)}`);
  }

  private async deauthorizeUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    return this.request('DELETE', `/users/${encodeURIComponent(args.user_id as string)}/authorization`);
  }

  private async disconnectVendor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id || !args.vendor) return { content: [{ type: 'text', text: 'user_id and vendor are required' }], isError: true };
    return this.request('DELETE', `/me/vendors/${encodeURIComponent(args.vendor as string)}`);
  }

  private async checkServiceReadiness(): Promise<ToolResult> {
    return this.request('GET', '/health/ready');
  }

  private async checkAvailableVendors(): Promise<ToolResult> {
    return this.request('GET', '/health/vendors');
  }

  private async updateFirehoseWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.url) return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    const body: Record<string, unknown> = { url: args.url };
    if (args.secret !== undefined) body.secret = args.secret;
    return this.request('PUT', '/webhooks/firehose', body);
  }

  private async testFirehoseWebhook(): Promise<ToolResult> {
    return this.request('POST', '/webhooks/firehose/test');
  }
}
