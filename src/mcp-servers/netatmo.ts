/**
 * Netatmo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Netatmo MCP server was found on GitHub. We build a full REST wrapper
// for complete Netatmo API coverage.
//
// Base URL: https://api.netatmo.net/api
// Auth: OAuth2 Bearer token (code flow or password flow)
// Docs: https://dev.netatmo.com/dev/resources/technical/reference
// Spec: https://api.apis.guru/v2/specs/netatmo.net/1.1.5/openapi.json
// Category: iot
// Rate limits: See Netatmo developer docs — typically 500 req/hour per user

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NetatmoConfig {
  accessToken: string;
  baseUrl?: string;
}

export class NetatmoMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: NetatmoConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.netatmo.net/api';
  }

  static catalog() {
    return {
      name: 'netatmo',
      displayName: 'Netatmo',
      version: '1.0.0',
      category: 'iot',
      keywords: [
        'netatmo', 'iot', 'smart home', 'weather station', 'thermostat',
        'home coach', 'air quality', 'temperature', 'humidity', 'co2',
        'pressure', 'wind', 'rain', 'camera', 'security', 'presence',
        'smart thermostat', 'schedule', 'webhook', 'energy',
      ],
      toolNames: [
        'add_webhook',
        'drop_webhook',
        'create_new_schedule',
        'get_device_list',
        'get_camera_picture',
        'get_events_until',
        'get_home_coach_data',
        'get_home_data',
        'get_last_event_of',
        'get_measure',
        'get_next_events',
        'get_public_data',
        'get_stations_data',
        'get_thermostats_data',
        'get_therm_state',
        'get_user',
        'get_partner_devices',
        'set_persons_away',
        'set_persons_home',
        'set_therm_point',
        'switch_schedule',
        'sync_schedule',
      ],
      description: 'Netatmo smart home IoT API: read weather station data, manage thermostats and schedules, access home security cameras and events, query public weather data, and control presence detection.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Webhooks ───────────────────────────────────────────────────────────
      {
        name: 'add_webhook',
        description: 'Register a webhook URL to receive real-time Netatmo event notifications for a specific app type',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The HTTPS URL to send webhook event notifications to',
            },
            app_type: {
              type: 'string',
              description: 'Netatmo app type for which to register the webhook (e.g., app_security)',
            },
          },
          required: ['url', 'app_type'],
        },
      },
      {
        name: 'drop_webhook',
        description: 'Unregister the previously registered webhook for a specific Netatmo app type',
        inputSchema: {
          type: 'object',
          properties: {
            app_type: {
              type: 'string',
              description: 'Netatmo app type for which to drop the webhook',
            },
          },
          required: ['app_type'],
        },
      },
      // ── Thermostat ─────────────────────────────────────────────────────────
      {
        name: 'create_new_schedule',
        description: 'Create a new thermostat heating schedule for a Netatmo thermostat module',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'The thermostat device (relay) ID',
            },
            module_id: {
              type: 'string',
              description: 'The thermostat module ID',
            },
            name: {
              type: 'string',
              description: 'Name for the new schedule',
            },
            timetable: {
              type: 'array',
              description: 'Array of schedule slots defining temperature setpoints at different time offsets (m_offset from Monday 00:00)',
            },
            zones: {
              type: 'array',
              description: 'Array of temperature zones with id, name, and temp fields',
            },
          },
          required: ['device_id', 'module_id'],
        },
      },
      // ── Device / Data ──────────────────────────────────────────────────────
      {
        name: 'get_device_list',
        description: 'Get the list of all Netatmo devices and their modules for a given app type',
        inputSchema: {
          type: 'object',
          properties: {
            app_type: {
              type: 'string',
              description: 'Netatmo app type to filter devices (e.g., app_thermostat, app_station)',
            },
            device_id: {
              type: 'string',
              description: 'Optional specific device ID to retrieve',
            },
            get_favorites: {
              type: 'boolean',
              description: 'If true, include devices marked as favorites',
            },
          },
        },
      },
      {
        name: 'get_camera_picture',
        description: 'Get a picture snapshot from a Netatmo security camera by image ID and key',
        inputSchema: {
          type: 'object',
          properties: {
            image_id: {
              type: 'string',
              description: 'The image ID from a camera event',
            },
            key: {
              type: 'string',
              description: 'The encryption key for the image',
            },
          },
          required: ['image_id', 'key'],
        },
      },
      {
        name: 'get_events_until',
        description: 'Get all Netatmo home security events up to and including a specific event ID',
        inputSchema: {
          type: 'object',
          properties: {
            home_id: {
              type: 'string',
              description: 'The Netatmo home ID to retrieve events for',
            },
            event_id: {
              type: 'string',
              description: 'The oldest event ID — retrieve all events up to this event',
            },
          },
          required: ['home_id', 'event_id'],
        },
      },
      {
        name: 'get_home_coach_data',
        description: 'Get indoor air quality data from a Netatmo Home Coach device (CO2, temperature, humidity, noise, pressure)',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Optional Home Coach device ID to retrieve data for a specific device',
            },
          },
        },
      },
      {
        name: 'get_home_data',
        description: 'Get home security data including camera status, persons detected, and recent events',
        inputSchema: {
          type: 'object',
          properties: {
            home_id: {
              type: 'string',
              description: 'Optional specific home ID to retrieve data for',
            },
            size: {
              type: 'integer',
              description: 'Number of events to return (default: 30)',
            },
          },
        },
      },
      {
        name: 'get_last_event_of',
        description: 'Get the most recent Netatmo home security event for a specific person',
        inputSchema: {
          type: 'object',
          properties: {
            home_id: {
              type: 'string',
              description: 'The home ID to search for events in',
            },
            person_id: {
              type: 'string',
              description: 'The person ID to get the last event for',
            },
            offset: {
              type: 'integer',
              description: 'Optional offset for pagination',
            },
          },
          required: ['home_id', 'person_id'],
        },
      },
      {
        name: 'get_measure',
        description: 'Get historical measurements from a Netatmo weather station or thermostat module (temperature, humidity, CO2, pressure, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'The main device (station or thermostat relay) ID',
            },
            module_id: {
              type: 'string',
              description: 'Optional module ID for an indoor/outdoor module or thermostat',
            },
            scale: {
              type: 'string',
              description: 'Time scale for measurements: 30min, 1hour, 3hours, 1day, 1week, 1month, or max',
            },
            type: {
              type: 'array',
              description: 'Array of measurement types to retrieve: Temperature, Humidity, CO2, Pressure, Noise, Rain, WindStrength, WindAngle, GustStrength, GustAngle, min_temp, max_temp, etc.',
            },
            date_begin: {
              type: 'integer',
              description: 'Start timestamp (Unix epoch) for the measurement range',
            },
            date_end: {
              type: 'string',
              description: 'End timestamp (Unix epoch) or "last" for the most recent measurement',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of measurements to return (max 1024)',
            },
            optimize: {
              type: 'boolean',
              description: 'If true, optimize data by returning compressed format',
            },
            real_time: {
              type: 'boolean',
              description: 'If true, return real-time measurements (only valid for 5min and 30min scales)',
            },
          },
          required: ['device_id', 'scale', 'type'],
        },
      },
      {
        name: 'get_next_events',
        description: 'Get the next page of Netatmo home security events after a specified event ID',
        inputSchema: {
          type: 'object',
          properties: {
            home_id: {
              type: 'string',
              description: 'The home ID to retrieve events for',
            },
            event_id: {
              type: 'string',
              description: 'The most recent event ID already retrieved — fetch events after this ID',
            },
            size: {
              type: 'integer',
              description: 'Number of events to return (default: 30)',
            },
          },
          required: ['home_id', 'event_id'],
        },
      },
      {
        name: 'get_public_data',
        description: 'Get public Netatmo weather station data within a geographic bounding box (lat/lon NE and SW corners)',
        inputSchema: {
          type: 'object',
          properties: {
            lat_ne: {
              type: 'number',
              description: 'Latitude of the northeast corner of the bounding box',
            },
            lon_ne: {
              type: 'number',
              description: 'Longitude of the northeast corner of the bounding box',
            },
            lat_sw: {
              type: 'number',
              description: 'Latitude of the southwest corner of the bounding box',
            },
            lon_sw: {
              type: 'number',
              description: 'Longitude of the southwest corner of the bounding box',
            },
            required_data: {
              type: 'array',
              description: 'Optional array of data types to filter stations: temperature, humidity, pressure, wind, rain',
            },
            filter: {
              type: 'boolean',
              description: 'If true, filter out stations with abnormal data',
            },
          },
          required: ['lat_ne', 'lon_ne', 'lat_sw', 'lon_sw'],
        },
      },
      {
        name: 'get_stations_data',
        description: 'Get data from all Netatmo weather stations in the user\'s account (temperature, humidity, CO2, pressure, noise, rain, wind)',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Optional specific weather station device ID',
            },
            get_favorites: {
              type: 'boolean',
              description: 'If true, include weather stations marked as favorites',
            },
          },
        },
      },
      {
        name: 'get_thermostats_data',
        description: 'Get data from all Netatmo thermostat devices in the user\'s account (current temperature, setpoint, heating mode, schedule)',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Optional specific thermostat relay device ID',
            },
          },
        },
      },
      {
        name: 'get_therm_state',
        description: 'Get the current state of a Netatmo thermostat module (setpoint mode, temperature, heating status)',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'The thermostat relay device ID',
            },
            module_id: {
              type: 'string',
              description: 'The thermostat module ID',
            },
          },
          required: ['device_id', 'module_id'],
        },
      },
      {
        name: 'get_user',
        description: 'Get the Netatmo user account information (name, email, unit preferences, timezone)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_partner_devices',
        description: 'Get devices associated with a partner app in the Netatmo ecosystem',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Presence / Security ────────────────────────────────────────────────
      {
        name: 'set_persons_away',
        description: 'Mark one or all persons in a Netatmo home as away, affecting camera motion detection and presence rules',
        inputSchema: {
          type: 'object',
          properties: {
            home_id: {
              type: 'string',
              description: 'The home ID to update person presence for',
            },
            person_id: {
              type: 'string',
              description: 'Optional person ID to mark as away. If omitted, marks all persons as away.',
            },
          },
          required: ['home_id'],
        },
      },
      {
        name: 'set_persons_home',
        description: 'Mark one or more persons in a Netatmo home as home',
        inputSchema: {
          type: 'object',
          properties: {
            home_id: {
              type: 'string',
              description: 'The home ID to update person presence for',
            },
            person_ids: {
              type: 'string',
              description: 'Comma-separated list of person IDs to mark as home',
            },
          },
          required: ['home_id', 'person_ids'],
        },
      },
      // ── Thermostat Control ─────────────────────────────────────────────────
      {
        name: 'set_therm_point',
        description: 'Set the thermostat setpoint — change the heating mode (schedule, away, manual, HG frost-guard, off) or set a manual temperature',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'The thermostat relay device ID',
            },
            module_id: {
              type: 'string',
              description: 'The thermostat module ID',
            },
            setpoint_mode: {
              type: 'string',
              description: 'Thermostat mode: program (follow schedule), away, hg (frost guard), manual, off, or max',
            },
            setpoint_endtime: {
              type: 'integer',
              description: 'Optional Unix timestamp when manual/away mode should end and resume the schedule',
            },
            setpoint_temp: {
              type: 'number',
              description: 'Manual temperature setpoint in Celsius (only used when setpoint_mode is manual)',
            },
          },
          required: ['device_id', 'module_id', 'setpoint_mode'],
        },
      },
      {
        name: 'switch_schedule',
        description: 'Switch the active heating schedule for a Netatmo thermostat module',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'The thermostat relay device ID',
            },
            module_id: {
              type: 'string',
              description: 'The thermostat module ID',
            },
            schedule_id: {
              type: 'string',
              description: 'The ID of the schedule to activate',
            },
          },
          required: ['device_id', 'module_id', 'schedule_id'],
        },
      },
      {
        name: 'sync_schedule',
        description: 'Sync (update) an existing thermostat heating schedule with a new timetable and zone configuration',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'The thermostat relay device ID',
            },
            module_id: {
              type: 'string',
              description: 'The thermostat module ID',
            },
            schedule_id: {
              type: 'string',
              description: 'The schedule ID to update',
            },
            name: {
              type: 'string',
              description: 'New name for the schedule',
            },
            timetable: {
              type: 'array',
              description: 'Updated array of timetable slots (m_offset from Monday 00:00 and zone_id)',
            },
            zones: {
              type: 'array',
              description: 'Updated array of zones with id, name, and temp fields',
            },
          },
          required: ['device_id', 'module_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'add_webhook':          return this.get('/addwebhook', args);
        case 'drop_webhook':         return this.get('/dropwebhook', args);
        case 'create_new_schedule':  return this.post('/createnewschedule', args);
        case 'get_device_list':      return this.get('/devicelist', args);
        case 'get_camera_picture':   return this.get('/getcamerapicture', args);
        case 'get_events_until':     return this.get('/geteventsuntil', args);
        case 'get_home_coach_data':  return this.get('/gethomecoachsdata', args);
        case 'get_home_data':        return this.get('/gethomedata', args);
        case 'get_last_event_of':    return this.get('/getlasteventof', args);
        case 'get_measure':          return this.get('/getmeasure', args);
        case 'get_next_events':      return this.get('/getnextevents', args);
        case 'get_public_data':      return this.get('/getpublicdata', args);
        case 'get_stations_data':    return this.get('/getstationsdata', args);
        case 'get_thermostats_data': return this.get('/getthermostatsdata', args);
        case 'get_therm_state':      return this.get('/getthermstate', args);
        case 'get_user':             return this.get('/getuser', {});
        case 'get_partner_devices':  return this.get('/partnerdevices', {});
        case 'set_persons_away':     return this.post('/setpersonsaway', args);
        case 'set_persons_home':     return this.post('/setpersonshome', args);
        case 'set_therm_point':      return this.post('/setthermpoint', args);
        case 'switch_schedule':      return this.post('/switchschedule', args);
        case 'sync_schedule':        return this.post('/syncschedule', args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeader(): string {
    return `Bearer ${this.accessToken}`;
  }

  private buildQueryString(params: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v.join(','))}`);
      } else {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      }
    }
    return parts.length > 0 ? `?${parts.join('&')}` : '';
  }

  private async get(path: string, params: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQueryString(params);
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, params: Record<string, unknown>): Promise<ToolResult> {
    // Netatmo POST endpoints accept query parameters, not a JSON body
    const qs = this.buildQueryString(params);
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
