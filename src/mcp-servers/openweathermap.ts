/**
 * OpenWeatherMap MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official OpenWeatherMap MCP server exists.
//   Community server (github.com/robertn702/mcp-openweathermap) exists but is not published
//   by OpenWeather Ltd.; not an official vendor MCP. 11 tools, not actively maintained by vendor.
// Our adapter covers: 11 tools. Vendor MCP covers: 0 tools (no official MCP).
// Recommendation: use-rest-api — no official vendor MCP server exists.
//
// Base URL: https://api.openweathermap.org (data endpoints)
//           https://tile.openweathermap.org (weather map tile endpoint — different domain)
// Auth: API key passed as `appid` query parameter on every request
// Docs: https://openweathermap.org/api
//       https://openweathermap.org/current  (current weather)
//       https://openweathermap.org/forecast5  (5-day forecast)
//       https://openweathermap.org/api/one-call-3  (One Call API 3.0)
//       https://openweathermap.org/api/geocoding-api  (geocoding)
//       https://openweathermap.org/api/air-pollution  (air pollution)
//       https://openweathermap.org/api/weathermaps  (weather map tiles)
// Rate limits: Free tier — 60 calls/min, 1,000,000 calls/month. Paid tiers higher.
//              One Call API 3.0 billed per call beyond 1,000/day free allowance.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenWeatherMapConfig {
  apiKey: string;
  baseUrl?: string;
}

export class OpenWeatherMapMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenWeatherMapConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openweathermap.org';
  }

  static catalog() {
    return {
      name: 'openweathermap',
      displayName: 'OpenWeatherMap',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'openweathermap', 'weather', 'forecast', 'temperature', 'humidity', 'wind',
        'precipitation', 'climate', 'meteorology', 'air quality', 'pollution', 'uv index',
        'geocoding', 'coordinates', 'alerts', 'historical weather',
      ],
      toolNames: [
        'get_current_weather', 'get_forecast', 'get_one_call',
        'get_historical_weather', 'get_air_pollution', 'get_air_pollution_forecast',
        'geocode_city', 'reverse_geocode', 'geocode_zip',
        'get_weather_alerts', 'get_weather_map_tile_url',
      ],
      description: 'OpenWeatherMap: current conditions, hourly/daily forecasts, historical data, air quality, UV index, geocoding, and weather alerts by coordinates or city name.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_current_weather',
        description: 'Get current weather conditions for a location by city name or geographic coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location (preferred over city name for accuracy)',
            },
            lon: {
              type: 'number',
              description: 'Longitude of the location',
            },
            city: {
              type: 'string',
              description: 'City name (e.g. "London", "New York,US"). Use lat/lon for precision.',
            },
            units: {
              type: 'string',
              description: 'Unit system: standard (Kelvin), metric (Celsius), imperial (Fahrenheit) — default: metric',
            },
            lang: {
              type: 'string',
              description: 'Language code for weather descriptions (e.g. en, es, fr, de — default: en)',
            },
          },
        },
      },
      {
        name: 'get_forecast',
        description: 'Get 5-day / 3-hour step weather forecast for a location by coordinates or city name',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location',
            },
            lon: {
              type: 'number',
              description: 'Longitude of the location',
            },
            city: {
              type: 'string',
              description: 'City name (e.g. "Tokyo"). Use lat/lon for precision.',
            },
            cnt: {
              type: 'number',
              description: 'Number of 3-hour intervals to return (max: 40, default: 40 = 5 days)',
            },
            units: {
              type: 'string',
              description: 'Unit system: standard, metric, or imperial (default: metric)',
            },
            lang: {
              type: 'string',
              description: 'Language code for descriptions (default: en)',
            },
          },
        },
      },
      {
        name: 'get_one_call',
        description: 'Get comprehensive weather data including current, minutely, hourly, daily forecasts, and alerts for coordinates (One Call API 3.0)',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location',
            },
            lon: {
              type: 'number',
              description: 'Longitude of the location',
            },
            exclude: {
              type: 'string',
              description: 'Comma-separated data blocks to exclude: current, minutely, hourly, daily, alerts (e.g. "minutely,alerts")',
            },
            units: {
              type: 'string',
              description: 'Unit system: standard, metric, or imperial (default: metric)',
            },
            lang: {
              type: 'string',
              description: 'Language code for descriptions (default: en)',
            },
          },
          required: ['lat', 'lon'],
        },
      },
      {
        name: 'get_historical_weather',
        description: 'Get historical weather data for a specific timestamp and location using One Call API 3.0 time machine',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location',
            },
            lon: {
              type: 'number',
              description: 'Longitude of the location',
            },
            dt: {
              type: 'number',
              description: 'Unix timestamp (UTC) for the historical data point — must be within past 5 days on free tier',
            },
            units: {
              type: 'string',
              description: 'Unit system: standard, metric, or imperial (default: metric)',
            },
          },
          required: ['lat', 'lon', 'dt'],
        },
      },
      {
        name: 'get_air_pollution',
        description: 'Get current air pollution data including AQI, CO, NO, NO2, O3, SO2, PM2.5, PM10, and NH3 for coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location',
            },
            lon: {
              type: 'number',
              description: 'Longitude of the location',
            },
          },
          required: ['lat', 'lon'],
        },
      },
      {
        name: 'get_air_pollution_forecast',
        description: 'Get hourly air pollution forecast for the next 5 days including AQI and pollutant concentrations',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location',
            },
            lon: {
              type: 'number',
              description: 'Longitude of the location',
            },
          },
          required: ['lat', 'lon'],
        },
      },
      {
        name: 'geocode_city',
        description: 'Convert a city name or address to geographic coordinates (latitude/longitude) — supports country codes',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'City name, optionally with state and country (e.g. "London", "Austin,TX,US", "Paris,FR")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (max: 5, default: 1)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'reverse_geocode',
        description: 'Convert latitude and longitude coordinates to city name, country, and state information',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude to reverse geocode',
            },
            lon: {
              type: 'number',
              description: 'Longitude to reverse geocode',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of location results (max: 5, default: 1)',
            },
          },
          required: ['lat', 'lon'],
        },
      },
      {
        name: 'geocode_zip',
        description: 'Convert a ZIP code and country to geographic coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            zip: {
              type: 'string',
              description: 'ZIP/postal code with country code (e.g. "10001,US", "SW1A1AA,GB")',
            },
          },
          required: ['zip'],
        },
      },
      {
        name: 'get_weather_alerts',
        description: 'Get active weather alerts and warnings for a location using One Call API — returns government and national agency alerts',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location',
            },
            lon: {
              type: 'number',
              description: 'Longitude of the location',
            },
            lang: {
              type: 'string',
              description: 'Language code for alert text (default: en)',
            },
          },
          required: ['lat', 'lon'],
        },
      },
      {
        name: 'get_weather_map_tile_url',
        description: 'Generate a weather map tile URL for a given layer, zoom level, and tile coordinates — for rendering weather overlays',
        inputSchema: {
          type: 'object',
          properties: {
            layer: {
              type: 'string',
              description: 'Map layer type: temp_new, precipitation_new, clouds_new, wind_new, pressure_new',
            },
            z: {
              type: 'number',
              description: 'Zoom level (0–18)',
            },
            x: {
              type: 'number',
              description: 'X tile coordinate',
            },
            y: {
              type: 'number',
              description: 'Y tile coordinate',
            },
          },
          required: ['layer', 'z', 'x', 'y'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_current_weather':
          return this.getCurrentWeather(args);
        case 'get_forecast':
          return this.getForecast(args);
        case 'get_one_call':
          return this.getOneCall(args);
        case 'get_historical_weather':
          return this.getHistoricalWeather(args);
        case 'get_air_pollution':
          return this.getAirPollution(args);
        case 'get_air_pollution_forecast':
          return this.getAirPollutionForecast(args);
        case 'geocode_city':
          return this.geocodeCity(args);
        case 'reverse_geocode':
          return this.reverseGeocode(args);
        case 'geocode_zip':
          return this.geocodeZip(args);
        case 'get_weather_alerts':
          return this.getWeatherAlerts(args);
        case 'get_weather_map_tile_url':
          return this.getWeatherMapTileUrl(args);
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

  private async owmGet(path: string, params: Record<string, string>): Promise<ToolResult> {
    params.appid = this.apiKey;
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}?${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private resolveLocation(args: Record<string, unknown>): { params: Record<string, string>; error?: ToolResult } {
    const params: Record<string, string> = {};
    if (args.lat !== undefined && args.lon !== undefined) {
      params.lat = String(args.lat);
      params.lon = String(args.lon);
    } else if (args.city) {
      params.q = args.city as string;
    } else {
      return {
        params: {},
        error: { content: [{ type: 'text', text: 'Provide either lat+lon or city' }], isError: true },
      };
    }
    return { params };
  }

  private async getCurrentWeather(args: Record<string, unknown>): Promise<ToolResult> {
    const { params, error } = this.resolveLocation(args);
    if (error) return error;
    params.units = (args.units as string) ?? 'metric';
    if (args.lang) params.lang = args.lang as string;
    return this.owmGet('/data/2.5/weather', params);
  }

  private async getForecast(args: Record<string, unknown>): Promise<ToolResult> {
    const { params, error } = this.resolveLocation(args);
    if (error) return error;
    params.units = (args.units as string) ?? 'metric';
    if (args.cnt) params.cnt = String(args.cnt);
    if (args.lang) params.lang = args.lang as string;
    return this.owmGet('/data/2.5/forecast', params);
  }

  private async getOneCall(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined || args.lon === undefined) {
      return { content: [{ type: 'text', text: 'lat and lon are required' }], isError: true };
    }
    const params: Record<string, string> = {
      lat: String(args.lat),
      lon: String(args.lon),
      units: (args.units as string) ?? 'metric',
    };
    if (args.exclude) params.exclude = args.exclude as string;
    if (args.lang) params.lang = args.lang as string;
    return this.owmGet('/data/3.0/onecall', params);
  }

  private async getHistoricalWeather(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined || args.lon === undefined || !args.dt) {
      return { content: [{ type: 'text', text: 'lat, lon, and dt are required' }], isError: true };
    }
    const params: Record<string, string> = {
      lat: String(args.lat),
      lon: String(args.lon),
      dt: String(args.dt),
      units: (args.units as string) ?? 'metric',
    };
    return this.owmGet('/data/3.0/onecall/timemachine', params);
  }

  private async getAirPollution(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined || args.lon === undefined) {
      return { content: [{ type: 'text', text: 'lat and lon are required' }], isError: true };
    }
    return this.owmGet('/data/2.5/air_pollution', { lat: String(args.lat), lon: String(args.lon) });
  }

  private async getAirPollutionForecast(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined || args.lon === undefined) {
      return { content: [{ type: 'text', text: 'lat and lon are required' }], isError: true };
    }
    return this.owmGet('/data/2.5/air_pollution/forecast', { lat: String(args.lat), lon: String(args.lon) });
  }

  private async geocodeCity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string> = {
      q: args.q as string,
      limit: String((args.limit as number) ?? 1),
    };
    return this.owmGet('/geo/1.0/direct', params);
  }

  private async reverseGeocode(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined || args.lon === undefined) {
      return { content: [{ type: 'text', text: 'lat and lon are required' }], isError: true };
    }
    const params: Record<string, string> = {
      lat: String(args.lat),
      lon: String(args.lon),
      limit: String((args.limit as number) ?? 1),
    };
    return this.owmGet('/geo/1.0/reverse', params);
  }

  private async geocodeZip(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zip) return { content: [{ type: 'text', text: 'zip is required' }], isError: true };
    return this.owmGet('/geo/1.0/zip', { zip: args.zip as string });
  }

  private async getWeatherAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined || args.lon === undefined) {
      return { content: [{ type: 'text', text: 'lat and lon are required' }], isError: true };
    }
    const params: Record<string, string> = {
      lat: String(args.lat),
      lon: String(args.lon),
      exclude: 'current,minutely,hourly,daily',
    };
    if (args.lang) params.lang = args.lang as string;
    return this.owmGet('/data/3.0/onecall', params);
  }

  private async getWeatherMapTileUrl(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.layer || args.z === undefined || args.x === undefined || args.y === undefined) {
      return { content: [{ type: 'text', text: 'layer, z, x, and y are required' }], isError: true };
    }
    // Weather map tiles use tile.openweathermap.org, not api.openweathermap.org
    const url = `https://tile.openweathermap.org/map/${encodeURIComponent(args.layer as string)}/${encodeURIComponent(args.z as string)}/${encodeURIComponent(args.x as string)}/${encodeURIComponent(args.y as string)}.png?appid=${this.apiKey}`;
    return {
      content: [{ type: 'text', text: JSON.stringify({ tile_url: url }, null, 2) }],
      isError: false,
    };
  }
}
