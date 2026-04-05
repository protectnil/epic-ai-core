/**
 * Traccar MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official vendor MCP server exists for Traccar.
//   Community: None published.
//   Our adapter covers: 12 tools (devices, positions, geofences, groups, drivers, reports, sessions, users, notifications, commands, server info, statistics).
//   No community MCP servers cover Traccar.
// Recommendation: Use this adapter. No community alternatives exist.
//
// Base URL: Configurable — Traccar is self-hosted. Default demo: https://demo.traccar.org/api
// Auth: HTTP Basic auth (email + password) on every request
// Docs: https://www.traccar.org/traccar-api/
// Rate limits: Determined by server configuration. No hard limits by default on self-hosted instances.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TraccarConfig {
  email: string;
  password: string;
  /** Base URL of the Traccar server API (default: https://demo.traccar.org/api) */
  baseUrl?: string;
}

export class TraccarMCPServer extends MCPAdapterBase {
  private readonly email: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor(config: TraccarConfig) {
    super();
    this.email = config.email;
    this.password = config.password;
    this.baseUrl = config.baseUrl ?? 'https://demo.traccar.org/api';
  }

  static catalog() {
    return {
      name: 'traccar',
      displayName: 'Traccar',
      version: '1.0.0',
      category: 'iot',
      keywords: [
        'traccar', 'gps', 'tracking', 'fleet', 'iot', 'location', 'geofence',
        'device', 'vehicle', 'position', 'route', 'telemetry', 'driver',
        'report', 'notification', 'real-time', 'open-source',
      ],
      toolNames: [
        'list_devices', 'get_positions', 'list_geofences',
        'list_groups', 'list_drivers', 'get_server_info',
        'get_session', 'list_users', 'get_report_route',
        'get_report_trips', 'get_report_summary', 'list_notifications',
      ],
      description: 'Traccar open-source GPS tracking — list devices, query real-time and historical positions, manage geofences, drivers, groups, and run fleet reports.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_devices',
        description: 'Fetch the list of tracked devices (vehicles, assets, phones) — supports filtering by user, specific IDs, or unique IDs',
        inputSchema: {
          type: 'object',
          properties: {
            all: {
              type: 'boolean',
              description: 'Return all devices (admin only)',
            },
            user_id: {
              type: 'number',
              description: 'Filter devices belonging to a specific user ID',
            },
            id: {
              type: 'number',
              description: 'Fetch a specific device by numeric ID',
            },
            unique_id: {
              type: 'string',
              description: 'Fetch a specific device by its IMEI or unique identifier string',
            },
          },
        },
      },
      {
        name: 'get_positions',
        description: 'Fetch GPS positions — current position for a device, or historical positions within a time range',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'number',
              description: 'Device ID to fetch positions for',
            },
            from: {
              type: 'string',
              description: 'Start of time range in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)',
            },
            to: {
              type: 'string',
              description: 'End of time range in ISO 8601 format (e.g. 2024-01-02T00:00:00Z)',
            },
            id: {
              type: 'number',
              description: 'Fetch a specific position by ID',
            },
          },
        },
      },
      {
        name: 'list_geofences',
        description: 'Fetch all geofences (virtual boundaries) — supports filtering by user, device, or group',
        inputSchema: {
          type: 'object',
          properties: {
            all: {
              type: 'boolean',
              description: 'Return all geofences (admin only)',
            },
            user_id: {
              type: 'number',
              description: 'Filter geofences for a specific user ID',
            },
            device_id: {
              type: 'number',
              description: 'Filter geofences linked to a specific device ID',
            },
            group_id: {
              type: 'number',
              description: 'Filter geofences linked to a specific group ID',
            },
          },
        },
      },
      {
        name: 'list_groups',
        description: 'Fetch all device groups — supports filtering by user',
        inputSchema: {
          type: 'object',
          properties: {
            all: {
              type: 'boolean',
              description: 'Return all groups (admin only)',
            },
            user_id: {
              type: 'number',
              description: 'Filter groups belonging to a specific user ID',
            },
          },
        },
      },
      {
        name: 'list_drivers',
        description: 'Fetch all registered drivers — supports filtering by user, device, or group',
        inputSchema: {
          type: 'object',
          properties: {
            all: {
              type: 'boolean',
              description: 'Return all drivers (admin only)',
            },
            user_id: {
              type: 'number',
              description: 'Filter drivers for a specific user ID',
            },
            device_id: {
              type: 'number',
              description: 'Filter drivers linked to a specific device ID',
            },
            group_id: {
              type: 'number',
              description: 'Filter drivers linked to a specific group ID',
            },
          },
        },
      },
      {
        name: 'get_server_info',
        description: 'Fetch Traccar server configuration and version information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_session',
        description: 'Fetch the current session information for the authenticated user, or validate a session token',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'Optional session token to validate',
            },
          },
        },
      },
      {
        name: 'list_users',
        description: 'Fetch all users (admin only)',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: {
              type: 'string',
              description: 'Filter by a specific email or user identifier',
            },
          },
        },
      },
      {
        name: 'get_report_route',
        description: 'Fetch a route report — all GPS positions within a time period for specified devices or groups',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'array',
              items: { type: 'number' },
              description: 'List of device IDs to include in the report',
            },
            group_id: {
              type: 'array',
              items: { type: 'number' },
              description: 'List of group IDs to include in the report',
            },
            from: {
              type: 'string',
              description: 'Report start time in ISO 8601 format (e.g. 2024-01-01T00:00:00Z)',
            },
            to: {
              type: 'string',
              description: 'Report end time in ISO 8601 format (e.g. 2024-01-02T00:00:00Z)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_report_trips',
        description: 'Fetch a trips report — list of trips (start/stop, distance, duration) within a time period for devices or groups',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'array',
              items: { type: 'number' },
              description: 'List of device IDs to include in the report',
            },
            group_id: {
              type: 'array',
              items: { type: 'number' },
              description: 'List of group IDs to include in the report',
            },
            from: {
              type: 'string',
              description: 'Report start time in ISO 8601 format',
            },
            to: {
              type: 'string',
              description: 'Report end time in ISO 8601 format',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_report_summary',
        description: 'Fetch a summary report — aggregate distance, average speed, max speed, and engine hours per device within a time period',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'array',
              items: { type: 'number' },
              description: 'List of device IDs to include in the report',
            },
            group_id: {
              type: 'array',
              items: { type: 'number' },
              description: 'List of group IDs to include in the report',
            },
            from: {
              type: 'string',
              description: 'Report start time in ISO 8601 format',
            },
            to: {
              type: 'string',
              description: 'Report end time in ISO 8601 format',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'list_notifications',
        description: 'Fetch notification rules configured for the server — supports filtering by user, device, or group',
        inputSchema: {
          type: 'object',
          properties: {
            all: {
              type: 'boolean',
              description: 'Return all notifications (admin only)',
            },
            user_id: {
              type: 'number',
              description: 'Filter notifications for a specific user ID',
            },
            device_id: {
              type: 'number',
              description: 'Filter notifications for a specific device ID',
            },
            group_id: {
              type: 'number',
              description: 'Filter notifications for a specific group ID',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_devices':         return this.listDevices(args);
        case 'get_positions':        return this.getPositions(args);
        case 'list_geofences':       return this.listGeofences(args);
        case 'list_groups':          return this.listGroups(args);
        case 'list_drivers':         return this.listDrivers(args);
        case 'get_server_info':      return this.getServerInfo();
        case 'get_session':          return this.getSession(args);
        case 'list_users':           return this.listUsers(args);
        case 'get_report_route':     return this.getReportRoute(args);
        case 'get_report_trips':     return this.getReportTrips(args);
        case 'get_report_summary':   return this.getReportSummary(args);
        case 'list_notifications':   return this.listNotifications(args);
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

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.email}:${this.password}`).toString('base64');
  }

  private buildUrl(path: string, params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.append(k, v);
    }
    const query = qs.toString();
    return `${this.baseUrl}${path}${query ? '?' + query : ''}`;
  }

  private async fetchApi(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader(),
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Traccar returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listDevices(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.all) params.all = 'true';
    if (args.user_id !== undefined) params.userId = String(args.user_id);
    if (args.id !== undefined) params.id = String(args.id);
    if (args.unique_id !== undefined) params.uniqueId = args.unique_id as string;
    return this.fetchApi('/devices', params);
  }

  private async getPositions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.device_id !== undefined) params.deviceId = String(args.device_id);
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    if (args.id !== undefined) params.id = String(args.id);
    return this.fetchApi('/positions', params);
  }

  private async listGeofences(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.all) params.all = 'true';
    if (args.user_id !== undefined) params.userId = String(args.user_id);
    if (args.device_id !== undefined) params.deviceId = String(args.device_id);
    if (args.group_id !== undefined) params.groupId = String(args.group_id);
    return this.fetchApi('/geofences', params);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.all) params.all = 'true';
    if (args.user_id !== undefined) params.userId = String(args.user_id);
    return this.fetchApi('/groups', params);
  }

  private async listDrivers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.all) params.all = 'true';
    if (args.user_id !== undefined) params.userId = String(args.user_id);
    if (args.device_id !== undefined) params.deviceId = String(args.device_id);
    if (args.group_id !== undefined) params.groupId = String(args.group_id);
    return this.fetchApi('/drivers', params);
  }

  private async getServerInfo(): Promise<ToolResult> {
    return this.fetchApi('/server');
  }

  private async getSession(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.token) params.token = args.token as string;
    return this.fetchApi('/session', params);
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.user_id) params.userId = args.user_id as string;
    return this.fetchApi('/users', params);
  }

  private buildReportParams(args: Record<string, unknown>): Record<string, string | undefined> {
    const params: Record<string, string | undefined> = {};
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    if (Array.isArray(args.device_id)) {
      for (const id of args.device_id) params.deviceId = String(id);
    }
    if (Array.isArray(args.group_id)) {
      for (const id of args.group_id) params.groupId = String(id);
    }
    return params;
  }

  private async getReportRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to) {
      return { content: [{ type: 'text', text: 'from and to are required' }], isError: true };
    }
    return this.fetchApi('/reports/route', this.buildReportParams(args));
  }

  private async getReportTrips(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to) {
      return { content: [{ type: 'text', text: 'from and to are required' }], isError: true };
    }
    return this.fetchApi('/reports/trips', this.buildReportParams(args));
  }

  private async getReportSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to) {
      return { content: [{ type: 'text', text: 'from and to are required' }], isError: true };
    }
    return this.fetchApi('/reports/summary', this.buildReportParams(args));
  }

  private async listNotifications(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.all) params.all = 'true';
    if (args.user_id !== undefined) params.userId = String(args.user_id);
    if (args.device_id !== undefined) params.deviceId = String(args.device_id);
    if (args.group_id !== undefined) params.groupId = String(args.group_id);
    return this.fetchApi('/notifications', params);
  }
}
