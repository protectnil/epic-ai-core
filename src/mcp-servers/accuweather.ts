/**
 * AccuWeather MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: Community implementations only — not an official AccuWeather vendor MCP.
//   https://github.com/TimLukaHorstmann/mcp-weather — transport: stdio, auth: API key, ~2 tools (hourly + daily)
//   https://github.com/adhikasp/mcp-weather — transport: stdio, auth: API key, ~2 tools (hourly)
//   Neither is officially published or maintained by AccuWeather Inc.
// Our adapter covers: 12 tools (locations, current conditions, forecasts, alerts, indices, imagery).
//   Community MCP servers cover 1-2 tools only. Use this adapter for broader coverage.
// Recommendation: Use this adapter. Community MCP servers are too limited.
//
// Base URL: https://dataservice.accuweather.com
// Auth: API key passed as query parameter `apikey` on every request (not a Bearer header)
// Docs: https://developer.accuweather.com/apis
// Rate limits: Free tier ~50 calls/day. Paid tiers vary. Enterprise: contact sales@accuweather.com.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AccuWeatherConfig {
  apiKey: string;
  /** Optional base URL override (default: https://dataservice.accuweather.com) */
  baseUrl?: string;
}

export class AccuWeatherMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AccuWeatherConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://dataservice.accuweather.com';
  }

  static catalog() {
    return {
      name: 'accuweather',
      displayName: 'AccuWeather',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'accuweather', 'weather', 'forecast', 'temperature', 'rain', 'snow',
        'storm', 'severe', 'alert', 'warning', 'humidity', 'wind', 'conditions',
        'hourly', 'daily', 'location', 'climate', 'meteorology',
      ],
      toolNames: [
        'search_locations', 'get_location_by_ip', 'get_location_by_coordinates',
        'get_current_conditions', 'get_hourly_forecast', 'get_daily_forecast',
        'get_minute_cast', 'get_weather_alerts', 'get_alert_details',
        'get_daily_indices', 'list_index_groups', 'get_imagery',
      ],
      description: 'AccuWeather forecasts, current conditions, severe weather alerts, air quality indices, and location lookups by city, coordinates, or IP address.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_locations',
        description: 'Search for AccuWeather location keys by city name, postal code, or country — returns location key needed for forecast calls',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'City name, postal code, or location text to search (e.g. "New York", "10001", "London, UK")',
            },
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code to narrow search (e.g. US, GB, CA)',
            },
            language: {
              type: 'string',
              description: 'Language code for response text (default: en-us)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_location_by_ip',
        description: 'Look up an AccuWeather location key from an IP address using GeoIP',
        inputSchema: {
          type: 'object',
          properties: {
            ip_address: {
              type: 'string',
              description: 'IPv4 or IPv6 address to geolocate (e.g. 203.0.113.45)',
            },
            language: {
              type: 'string',
              description: 'Language code for response text (default: en-us)',
            },
          },
          required: ['ip_address'],
        },
      },
      {
        name: 'get_location_by_coordinates',
        description: 'Look up an AccuWeather location key from latitude and longitude coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude in decimal degrees (e.g. 40.7128)',
            },
            longitude: {
              type: 'number',
              description: 'Longitude in decimal degrees (e.g. -74.0060)',
            },
            language: {
              type: 'string',
              description: 'Language code for response text (default: en-us)',
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'get_current_conditions',
        description: 'Get current weather conditions for a location including temperature, humidity, wind, UV index, and sky conditions',
        inputSchema: {
          type: 'object',
          properties: {
            location_key: {
              type: 'string',
              description: 'AccuWeather location key (obtain via search_locations or get_location_by_coordinates)',
            },
            details: {
              type: 'boolean',
              description: 'Return extended details including visibility, pressure, cloud cover, precipitation (default: false)',
            },
            language: {
              type: 'string',
              description: 'Language code for response text (default: en-us)',
            },
          },
          required: ['location_key'],
        },
      },
      {
        name: 'get_hourly_forecast',
        description: 'Get hourly weather forecast for a location — choose 1, 12, 24, 72, or 120 hour intervals',
        inputSchema: {
          type: 'object',
          properties: {
            location_key: {
              type: 'string',
              description: 'AccuWeather location key',
            },
            hours: {
              type: 'number',
              description: 'Forecast period in hours: 1, 12, 24, 72, or 120 (default: 12)',
            },
            details: {
              type: 'boolean',
              description: 'Include extended details like cloud cover, dew point, and precipitation probability (default: false)',
            },
            metric: {
              type: 'boolean',
              description: 'Return temperature in Celsius (true) or Fahrenheit (false, default)',
            },
            language: {
              type: 'string',
              description: 'Language code for response text (default: en-us)',
            },
          },
          required: ['location_key'],
        },
      },
      {
        name: 'get_daily_forecast',
        description: 'Get daily weather forecast for a location — choose 1, 5, 10, or 15 day intervals',
        inputSchema: {
          type: 'object',
          properties: {
            location_key: {
              type: 'string',
              description: 'AccuWeather location key',
            },
            days: {
              type: 'number',
              description: 'Forecast period in days: 1, 5, 10, or 15 (default: 5)',
            },
            details: {
              type: 'boolean',
              description: 'Include extended details like air quality, UV index, and precipitation probability (default: false)',
            },
            metric: {
              type: 'boolean',
              description: 'Return temperature in Celsius (true) or Fahrenheit (false, default)',
            },
            language: {
              type: 'string',
              description: 'Language code for response text (default: en-us)',
            },
          },
          required: ['location_key'],
        },
      },
      {
        name: 'get_minute_cast',
        description: 'Get minute-by-minute precipitation forecast for the next 2 hours (MinuteCast) for a location',
        inputSchema: {
          type: 'object',
          properties: {
            location_key: {
              type: 'string',
              description: 'AccuWeather location key',
            },
            language: {
              type: 'string',
              description: 'Language code for response text (default: en-us)',
            },
          },
          required: ['location_key'],
        },
      },
      {
        name: 'get_weather_alerts',
        description: 'Get active severe weather alerts (warnings, watches, advisories) for a location',
        inputSchema: {
          type: 'object',
          properties: {
            location_key: {
              type: 'string',
              description: 'AccuWeather location key to check for active alerts',
            },
            details: {
              type: 'boolean',
              description: 'Include full alert text and area descriptions (default: false)',
            },
            language: {
              type: 'string',
              description: 'Language code for response text (default: en-us)',
            },
          },
          required: ['location_key'],
        },
      },
      {
        name: 'get_alert_details',
        description: 'Get full details of a specific weather alert by its alert ID',
        inputSchema: {
          type: 'object',
          properties: {
            alert_id: {
              type: 'string',
              description: 'Alert ID from a get_weather_alerts response',
            },
            language: {
              type: 'string',
              description: 'Language code for response text (default: en-us)',
            },
          },
          required: ['alert_id'],
        },
      },
      {
        name: 'get_daily_indices',
        description: 'Get daily wellness and activity indices for a location (e.g. Running, Lawn Mowing, Migraine, Arthritis)',
        inputSchema: {
          type: 'object',
          properties: {
            location_key: {
              type: 'string',
              description: 'AccuWeather location key',
            },
            days: {
              type: 'number',
              description: 'Number of forecast days for indices: 1, 5, or 10 (default: 1)',
            },
            index_id: {
              type: 'number',
              description: 'Specific index ID to retrieve (omit to get all indices for the location)',
            },
            language: {
              type: 'string',
              description: 'Language code for response text (default: en-us)',
            },
          },
          required: ['location_key'],
        },
      },
      {
        name: 'list_index_groups',
        description: 'List all available AccuWeather index groups and their IDs (Running, Air Quality, UV, Fishing, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: 'Language code for response text (default: en-us)',
            },
          },
        },
      },
      {
        name: 'get_imagery',
        description: 'Get radar and satellite imagery map tiles for a location (returns image URLs)',
        inputSchema: {
          type: 'object',
          properties: {
            location_key: {
              type: 'string',
              description: 'AccuWeather location key',
            },
            type: {
              type: 'string',
              description: 'Imagery type: satellite or radar (default: satellite)',
            },
          },
          required: ['location_key'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_locations':
          return this.searchLocations(args);
        case 'get_location_by_ip':
          return this.getLocationByIp(args);
        case 'get_location_by_coordinates':
          return this.getLocationByCoordinates(args);
        case 'get_current_conditions':
          return this.getCurrentConditions(args);
        case 'get_hourly_forecast':
          return this.getHourlyForecast(args);
        case 'get_daily_forecast':
          return this.getDailyForecast(args);
        case 'get_minute_cast':
          return this.getMinuteCast(args);
        case 'get_weather_alerts':
          return this.getWeatherAlerts(args);
        case 'get_alert_details':
          return this.getAlertDetails(args);
        case 'get_daily_indices':
          return this.getDailyIndices(args);
        case 'list_index_groups':
          return this.listIndexGroups(args);
        case 'get_imagery':
          return this.getImagery(args);
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

  private buildUrl(path: string, params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams({ apikey: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    return `${this.baseUrl}${path}?${qs.toString()}`;
  }

  private async fetch(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`AccuWeather returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchLocations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      q: args.query as string,
      language: (args.language as string) ?? 'en-us',
    };
    if (args.country_code) params.countryCode = args.country_code as string;
    return this.fetch('/locations/v1/cities/search', params);
  }

  private async getLocationByIp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ip_address) return { content: [{ type: 'text', text: 'ip_address is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      q: args.ip_address as string,
      language: (args.language as string) ?? 'en-us',
    };
    return this.fetch('/locations/v1/cities/ipaddress', params);
  }

  private async getLocationByCoordinates(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.latitude === undefined || args.longitude === undefined) {
      return { content: [{ type: 'text', text: 'latitude and longitude are required' }], isError: true };
    }
    const params: Record<string, string | undefined> = {
      q: `${encodeURIComponent(args.latitude as string)},${encodeURIComponent(args.longitude as string)}`,
      language: (args.language as string) ?? 'en-us',
    };
    return this.fetch('/locations/v1/cities/geoposition/search', params);
  }

  private async getCurrentConditions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_key) return { content: [{ type: 'text', text: 'location_key is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      language: (args.language as string) ?? 'en-us',
      details: args.details ? 'true' : 'false',
    };
    return this.fetch(`/currentconditions/v1/${encodeURIComponent(args.location_key as string)}`, params);
  }

  private async getHourlyForecast(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_key) return { content: [{ type: 'text', text: 'location_key is required' }], isError: true };
    const validHours = [1, 12, 24, 72, 120, 240];
    const hours = (args.hours as number) ?? 12;
    const h = validHours.includes(hours) ? hours : 12;
    const params: Record<string, string | undefined> = {
      language: (args.language as string) ?? 'en-us',
      details: args.details ? 'true' : 'false',
      metric: args.metric ? 'true' : 'false',
    };
    return this.fetch(`/forecasts/v1/hourly/${h}hour/${encodeURIComponent(args.location_key as string)}`, params);
  }

  private async getDailyForecast(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_key) return { content: [{ type: 'text', text: 'location_key is required' }], isError: true };
    const validDays = [1, 5, 10, 15, 25, 45];
    const days = (args.days as number) ?? 5;
    const d = validDays.includes(days) ? days : 5;
    const params: Record<string, string | undefined> = {
      language: (args.language as string) ?? 'en-us',
      details: args.details ? 'true' : 'false',
      metric: args.metric ? 'true' : 'false',
    };
    return this.fetch(`/forecasts/v1/daily/${d}day/${encodeURIComponent(args.location_key as string)}`, params);
  }

  private async getMinuteCast(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_key) return { content: [{ type: 'text', text: 'location_key is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      language: (args.language as string) ?? 'en-us',
    };
    return this.fetch(`/forecasts/v1/minute/${encodeURIComponent(args.location_key as string)}`, params);
  }

  private async getWeatherAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_key) return { content: [{ type: 'text', text: 'location_key is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      language: (args.language as string) ?? 'en-us',
      details: args.details ? 'true' : 'false',
    };
    return this.fetch(`/alerts/v1/${encodeURIComponent(args.location_key as string)}`, params);
  }

  private async getAlertDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.alert_id) return { content: [{ type: 'text', text: 'alert_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      language: (args.language as string) ?? 'en-us',
    };
    return this.fetch(`/alerts/v1/${encodeURIComponent(args.alert_id as string)}`, params);
  }

  private async getDailyIndices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_key) return { content: [{ type: 'text', text: 'location_key is required' }], isError: true };
    const validDays = [1, 5, 10];
    const days = (args.days as number) ?? 1;
    const d = validDays.includes(days) ? days : 1;
    const params: Record<string, string | undefined> = {
      language: (args.language as string) ?? 'en-us',
    };
    const base = `/indices/v1/daily/${d}day/${encodeURIComponent(args.location_key as string)}`;
    const path = args.index_id !== undefined ? `${base}/${encodeURIComponent(args.index_id as string)}` : base;
    return this.fetch(path, params);
  }

  private async listIndexGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      language: (args.language as string) ?? 'en-us',
    };
    return this.fetch('/indices/v1/daily/groups', params);
  }

  private async getImagery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_key) return { content: [{ type: 'text', text: 'location_key is required' }], isError: true };
    const type = (args.type as string) ?? 'satellite';
    const validTypes = ['satellite', 'radar'];
    if (!validTypes.includes(type)) {
      return { content: [{ type: 'text', text: `type must be one of: ${validTypes.join(', ')}` }], isError: true };
    }
    return this.fetch(`/imagery/v1/maps/${type}/${encodeURIComponent(args.location_key as string)}`);
  }
}
