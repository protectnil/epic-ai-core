/**
 * Tomorrow.io MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Tomorrow.io MCP server was found on GitHub or the Tomorrow.io developer portal.
//
// Base URL: https://api.tomorrow.io/v4
// Auth: API key passed as query parameter: ?apikey={API_KEY}
//       Also accepted in Authorization header: apikey {API_KEY}
// Docs: https://docs.tomorrow.io/reference/welcome
// Rate limits: Free plan — 500 req/day, 25 req/hour. Paid plans vary. HTTP 429 on breach.
//              Rate limiting is enforced per IP address.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TomorrowIOConfig {
  apiKey: string;
  baseUrl?: string;
}

export class TomorrowIOMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TomorrowIOConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.tomorrow.io/v4';
  }

  static catalog() {
    return {
      name: 'tomorrow-io',
      displayName: 'Tomorrow.io',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'tomorrow.io', 'weather', 'forecast', 'climate', 'meteorology',
        'temperature', 'precipitation', 'humidity', 'wind', 'realtime weather',
        'weather api', 'weather data', 'timelines', 'alerts',
      ],
      toolNames: [
        'get_realtime_weather',
        'get_forecast',
        'get_weather_history',
        'get_weather_timeline',
        'get_weather_map',
        'list_weather_alerts',
        'get_weather_alert',
        'get_air_quality',
        'get_pollen',
        'get_fire_index',
      ],
      description: 'Tomorrow.io weather API: retrieve real-time conditions, hourly/daily forecasts, historical data, weather alerts, air quality, pollen, and fire index for any location.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_realtime_weather',
        description: 'Get current real-time weather conditions for a location including temperature, humidity, wind, and precipitation',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location as coordinates "lat,lon" (e.g. "40.7128,-74.0060"), city name, or postal code',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated data fields to return (e.g. "temperature,humidity,windSpeed,precipitationProbability")',
            },
            units: {
              type: 'string',
              description: 'Unit system: metric (Celsius, m/s) or imperial (Fahrenheit, mph) — default: metric',
            },
          },
          required: ['location'],
        },
      },
      {
        name: 'get_forecast',
        description: 'Get hourly or daily weather forecast for a location up to 15 days ahead with temperature, precipitation, and wind data',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location as "lat,lon" coordinates, city name, or postal code',
            },
            timesteps: {
              type: 'string',
              description: 'Forecast resolution: 1h (hourly) or 1d (daily) — default: 1h',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated fields (e.g. "temperature,precipitationProbability,windSpeed,weatherCode")',
            },
            units: {
              type: 'string',
              description: 'Unit system: metric or imperial (default: metric)',
            },
            start_time: {
              type: 'string',
              description: 'Forecast start time in ISO 8601 format (default: now)',
            },
            end_time: {
              type: 'string',
              description: 'Forecast end time in ISO 8601 format (default: 6 hours from now for 1h, 5 days for 1d)',
            },
          },
          required: ['location'],
        },
      },
      {
        name: 'get_weather_history',
        description: 'Get historical weather data for a location from up to 6 years ago at hourly or daily resolution',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location as "lat,lon" coordinates, city name, or postal code',
            },
            start_time: {
              type: 'string',
              description: 'Start of historical period in ISO 8601 format (e.g. 2025-01-01T00:00:00Z)',
            },
            end_time: {
              type: 'string',
              description: 'End of historical period in ISO 8601 format',
            },
            timesteps: {
              type: 'string',
              description: 'Data resolution: 1h (hourly) or 1d (daily) — default: 1d',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated weather fields to retrieve (e.g. "temperature,precipitation")',
            },
            units: {
              type: 'string',
              description: 'Unit system: metric or imperial (default: metric)',
            },
          },
          required: ['location', 'start_time', 'end_time'],
        },
      },
      {
        name: 'get_weather_timeline',
        description: 'Retrieve a multi-timestep weather timeline combining past, current, and forecast data in a single call',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location as "lat,lon" coordinates, city name, or postal code',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated weather data fields to include in the timeline',
            },
            timesteps: {
              type: 'string',
              description: 'Comma-separated timestep resolutions: current, 1m, 5m, 15m, 30m, 1h, 1d (default: 1h)',
            },
            start_time: {
              type: 'string',
              description: 'Timeline start in ISO 8601 or relative string "now" (default: now)',
            },
            end_time: {
              type: 'string',
              description: 'Timeline end in ISO 8601 format',
            },
            units: {
              type: 'string',
              description: 'Unit system: metric or imperial (default: metric)',
            },
            timezone: {
              type: 'string',
              description: 'IANA timezone for output timestamps (e.g. America/New_York — default: UTC)',
            },
          },
          required: ['location', 'fields'],
        },
      },
      {
        name: 'get_weather_map',
        description: 'Get a weather map tile image for a specific weather field, zoom level, and XYZ tile coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              description: 'Weather data field to visualize: precipitationIntensity, temperature, windSpeed, humidity, cloudCover',
            },
            zoom: {
              type: 'number',
              description: 'Map zoom level 1-12 (default: 5)',
            },
            x: {
              type: 'number',
              description: 'Tile X coordinate for the zoom level (default: 2)',
            },
            y: {
              type: 'number',
              description: 'Tile Y coordinate for the zoom level (default: 3)',
            },
            timestamp: {
              type: 'string',
              description: 'ISO 8601 timestamp for the tile (default: current time)',
            },
          },
          required: ['field'],
        },
      },
      {
        name: 'list_weather_alerts',
        description: 'List active weather alerts for a location, including severe weather warnings, watches, and advisories',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location as "lat,lon" coordinates, city name, or postal code',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of alerts to return (default: 10)',
            },
          },
          required: ['location'],
        },
      },
      {
        name: 'get_weather_alert',
        description: 'Get full details for a specific weather alert by alert ID, including affected area and severity',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Weather alert ID from a list_weather_alerts response',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'get_air_quality',
        description: 'Get current and forecast air quality index (AQI), PM2.5, PM10, ozone, and pollutant levels for a location',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location as "lat,lon" coordinates, city name, or postal code',
            },
            timesteps: {
              type: 'string',
              description: 'Data resolution: current, 1h, or 1d (default: current)',
            },
            units: {
              type: 'string',
              description: 'Unit system: metric or imperial (default: metric)',
            },
          },
          required: ['location'],
        },
      },
      {
        name: 'get_pollen',
        description: 'Get pollen index and counts by type (tree, grass, weed) for a location with allergy risk levels',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location as "lat,lon" coordinates, city name, or postal code',
            },
            timesteps: {
              type: 'string',
              description: 'Data resolution: 1h or 1d (default: 1d)',
            },
          },
          required: ['location'],
        },
      },
      {
        name: 'get_fire_index',
        description: 'Get fire weather index and fire risk level for a location based on temperature, humidity, wind, and drought conditions',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location as "lat,lon" coordinates, city name, or postal code',
            },
            timesteps: {
              type: 'string',
              description: 'Data resolution: 1h or 1d (default: 1d)',
            },
            units: {
              type: 'string',
              description: 'Unit system: metric or imperial (default: metric)',
            },
          },
          required: ['location'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_realtime_weather':
          return this.getRealtimeWeather(args);
        case 'get_forecast':
          return this.getForecast(args);
        case 'get_weather_history':
          return this.getWeatherHistory(args);
        case 'get_weather_timeline':
          return this.getWeatherTimeline(args);
        case 'get_weather_map':
          return this.getWeatherMap(args);
        case 'list_weather_alerts':
          return this.listWeatherAlerts(args);
        case 'get_weather_alert':
          return this.getWeatherAlert(args);
        case 'get_air_quality':
          return this.getAirQuality(args);
        case 'get_pollen':
          return this.getPollen(args);
        case 'get_fire_index':
          return this.getFireIndex(args);
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

  private async tomorrowGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    params.apikey = this.apiKey;
    const qs = new URLSearchParams(params).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async tomorrowPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?apikey=${encodeURIComponent(this.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRealtimeWeather(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location) return { content: [{ type: 'text', text: 'location is required' }], isError: true };
    const params: Record<string, string> = { location: args.location as string };
    if (args.fields) params.fields = args.fields as string;
    if (args.units) params.units = args.units as string;
    return this.tomorrowGet('/weather/realtime', params);
  }

  private async getForecast(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location) return { content: [{ type: 'text', text: 'location is required' }], isError: true };
    const params: Record<string, string> = {
      location: args.location as string,
      timesteps: (args.timesteps as string) ?? '1h',
    };
    if (args.fields) params.fields = args.fields as string;
    if (args.units) params.units = args.units as string;
    if (args.start_time) params.startTime = args.start_time as string;
    if (args.end_time) params.endTime = args.end_time as string;
    return this.tomorrowGet('/weather/forecast', params);
  }

  private async getWeatherHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location || !args.start_time || !args.end_time) {
      return { content: [{ type: 'text', text: 'location, start_time, and end_time are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      location: args.location,
      startTime: args.start_time,
      endTime: args.end_time,
      timesteps: [(args.timesteps as string) ?? '1d'],
    };
    if (args.fields) body.fields = (args.fields as string).split(',').map(f => f.trim());
    if (args.units) body.units = args.units;
    return this.tomorrowPost('/historical', body);
  }

  private async getWeatherTimeline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location || !args.fields) return { content: [{ type: 'text', text: 'location and fields are required' }], isError: true };
    const body: Record<string, unknown> = {
      location: args.location,
      fields: (args.fields as string).split(',').map(f => f.trim()),
      timesteps: args.timesteps ? (args.timesteps as string).split(',').map(t => t.trim()) : ['1h'],
    };
    if (args.start_time) body.startTime = args.start_time;
    if (args.end_time) body.endTime = args.end_time;
    if (args.units) body.units = args.units;
    if (args.timezone) body.timezone = args.timezone;
    return this.tomorrowPost('/timelines', body);
  }

  private async getWeatherMap(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.field) return { content: [{ type: 'text', text: 'field is required' }], isError: true };
    const zoom = (args.zoom as number) ?? 5;
    const x = (args.x as number) ?? 2;
    const y = (args.y as number) ?? 3;
    const params: Record<string, string> = { field: args.field as string };
    if (args.timestamp) params.timestamp = args.timestamp as string;
    return this.tomorrowGet(`/map/tile/${encodeURIComponent(zoom)}/${encodeURIComponent(x)}/${encodeURIComponent(y)}`, params);
  }

  private async listWeatherAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location) return { content: [{ type: 'text', text: 'location is required' }], isError: true };
    const params: Record<string, string> = { location: args.location as string };
    if (args.limit) params.limit = String(args.limit);
    return this.tomorrowGet('/alerts/v2', params);
  }

  private async getWeatherAlert(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alert_id) return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    return this.tomorrowGet(`/alerts/v2/${encodeURIComponent(args.alert_id as string)}`);
  }

  private async getAirQuality(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location) return { content: [{ type: 'text', text: 'location is required' }], isError: true };
    const body: Record<string, unknown> = {
      location: args.location,
      fields: ['epaIndex', 'particulateMatter25', 'particulateMatter10', 'ozone', 'carbonMonoxide', 'nitrogenDioxide'],
      timesteps: [(args.timesteps as string) ?? 'current'],
    };
    if (args.units) body.units = args.units;
    return this.tomorrowPost('/timelines', body);
  }

  private async getPollen(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location) return { content: [{ type: 'text', text: 'location is required' }], isError: true };
    const body: Record<string, unknown> = {
      location: args.location,
      fields: ['treeIndex', 'grassIndex', 'weedIndex', 'treeSpecies', 'grassSpecies', 'weedSpecies'],
      timesteps: [(args.timesteps as string) ?? '1d'],
    };
    return this.tomorrowPost('/timelines', body);
  }

  private async getFireIndex(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location) return { content: [{ type: 'text', text: 'location is required' }], isError: true };
    const body: Record<string, unknown> = {
      location: args.location,
      fields: ['fireIndex'],
      timesteps: [(args.timesteps as string) ?? '1d'],
    };
    if (args.units) body.units = args.units;
    return this.tomorrowPost('/timelines', body);
  }
}
