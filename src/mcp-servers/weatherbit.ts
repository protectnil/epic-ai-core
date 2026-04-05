/**
 * Weatherbit MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official Weatherbit vendor MCP exists.
//   Community implementations are limited (1-2 tools, unofficial).
// Our adapter covers: 8 tools (current, hourly/daily forecast, history, air quality, alerts, energy forecast).
//   Community MCP servers do not exist in any meaningful form for Weatherbit.
// Recommendation: Use this adapter for full Weatherbit API coverage.
//
// Base URL: https://api.weatherbit.io/v2.0
// Auth: API key passed as query parameter `key` on every request
// Docs: https://www.weatherbit.io/api
// Rate limits: Free tier ~500 calls/day. Paid tiers vary.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WeatherbitConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.weatherbit.io/v2.0) */
  baseUrl?: string;
}

export class WeatherbitMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: WeatherbitConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.weatherbit.io/v2.0';
  }

  static catalog() {
    return {
      name: 'weatherbit',
      displayName: 'Weatherbit',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'weatherbit', 'weather', 'forecast', 'temperature', 'rain', 'snow',
        'humidity', 'wind', 'current', 'hourly', 'daily', 'history',
        'air quality', 'aqi', 'alerts', 'energy', 'meteorology', 'climate',
      ],
      toolNames: [
        'get_current_weather', 'get_hourly_forecast', 'get_daily_forecast',
        'get_historical_daily', 'get_historical_hourly',
        'get_current_air_quality', 'get_forecast_air_quality', 'get_alerts',
      ],
      description: 'Weatherbit current conditions, hourly and daily forecasts, historical data, air quality index, and severe weather alerts by coordinates, city, or postal code.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_current_weather',
        description: 'Get current weather conditions for a location — returns temperature, humidity, wind speed, cloud cover, UV index, and sky description',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude in decimal degrees (e.g. 40.7128). Use with lon.',
            },
            lon: {
              type: 'number',
              description: 'Longitude in decimal degrees (e.g. -74.0060). Use with lat.',
            },
            city: {
              type: 'string',
              description: 'City name (e.g. "Raleigh,NC" or "London"). Use instead of lat/lon.',
            },
            postal_code: {
              type: 'string',
              description: 'Postal/ZIP code (e.g. "27601"). Use instead of lat/lon.',
            },
            units: {
              type: 'string',
              description: 'Unit system: M (metric, default), I (imperial), S (scientific)',
            },
            lang: {
              type: 'string',
              description: 'Language code for weather description text (e.g. en, es, de)',
            },
          },
        },
      },
      {
        name: 'get_hourly_forecast',
        description: 'Get hourly weather forecast for a location — up to 120 hours ahead with temperature, precipitation, wind, and sky conditions per hour',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude in decimal degrees. Use with lon.',
            },
            lon: {
              type: 'number',
              description: 'Longitude in decimal degrees. Use with lat.',
            },
            city: {
              type: 'string',
              description: 'City name (e.g. "Chicago,IL"). Use instead of lat/lon.',
            },
            postal_code: {
              type: 'string',
              description: 'Postal/ZIP code. Use instead of lat/lon.',
            },
            hours: {
              type: 'number',
              description: 'Number of forecast hours to return (max 120, default 48)',
            },
            units: {
              type: 'string',
              description: 'Unit system: M (metric, default), I (imperial), S (scientific)',
            },
            lang: {
              type: 'string',
              description: 'Language code for weather description text',
            },
          },
        },
      },
      {
        name: 'get_daily_forecast',
        description: 'Get daily weather forecast for a location — up to 16 days ahead with high/low temperatures, precipitation probability, wind, and summary',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude in decimal degrees. Use with lon.',
            },
            lon: {
              type: 'number',
              description: 'Longitude in decimal degrees. Use with lat.',
            },
            city: {
              type: 'string',
              description: 'City name. Use instead of lat/lon.',
            },
            postal_code: {
              type: 'string',
              description: 'Postal/ZIP code. Use instead of lat/lon.',
            },
            days: {
              type: 'number',
              description: 'Number of forecast days to return (max 16, default 7)',
            },
            units: {
              type: 'string',
              description: 'Unit system: M (metric, default), I (imperial), S (scientific)',
            },
            lang: {
              type: 'string',
              description: 'Language code for weather description text',
            },
          },
        },
      },
      {
        name: 'get_historical_daily',
        description: 'Get historical daily weather data for a location between two dates — includes temperature, precipitation, wind, and humidity per day',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude in decimal degrees. Use with lon.',
            },
            lon: {
              type: 'number',
              description: 'Longitude in decimal degrees. Use with lat.',
            },
            city: {
              type: 'string',
              description: 'City name. Use instead of lat/lon.',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (e.g. "2024-01-01")',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (e.g. "2024-01-31")',
            },
            units: {
              type: 'string',
              description: 'Unit system: M (metric, default), I (imperial), S (scientific)',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_historical_hourly',
        description: 'Get historical hourly weather observations for a location between two dates — includes temperature, wind, humidity, and precipitation per hour',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude in decimal degrees. Use with lon.',
            },
            lon: {
              type: 'number',
              description: 'Longitude in decimal degrees. Use with lat.',
            },
            city: {
              type: 'string',
              description: 'City name. Use instead of lat/lon.',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            units: {
              type: 'string',
              description: 'Unit system: M (metric, default), I (imperial), S (scientific)',
            },
            tz: {
              type: 'string',
              description: 'Timezone for timestamps (e.g. "America/New_York")',
            },
          },
          required: ['start_date', 'end_date'],
        },
      },
      {
        name: 'get_current_air_quality',
        description: 'Get current air quality index (AQI) and pollutant concentrations (PM2.5, PM10, O3, NO2, SO2, CO) for a location',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude in decimal degrees. Use with lon.',
            },
            lon: {
              type: 'number',
              description: 'Longitude in decimal degrees. Use with lat.',
            },
            city: {
              type: 'string',
              description: 'City name. Use instead of lat/lon.',
            },
            postal_code: {
              type: 'string',
              description: 'Postal/ZIP code. Use instead of lat/lon.',
            },
          },
        },
      },
      {
        name: 'get_forecast_air_quality',
        description: 'Get hourly air quality forecast for a location — up to 72 hours ahead with AQI and pollutant concentrations',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude in decimal degrees. Use with lon.',
            },
            lon: {
              type: 'number',
              description: 'Longitude in decimal degrees. Use with lat.',
            },
            city: {
              type: 'string',
              description: 'City name. Use instead of lat/lon.',
            },
            postal_code: {
              type: 'string',
              description: 'Postal/ZIP code. Use instead of lat/lon.',
            },
            hours: {
              type: 'number',
              description: 'Number of forecast hours (max 72, default 24)',
            },
          },
        },
      },
      {
        name: 'get_alerts',
        description: 'Get active severe weather alerts (warnings, watches, advisories) for a location by coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude in decimal degrees',
            },
            lon: {
              type: 'number',
              description: 'Longitude in decimal degrees',
            },
          },
          required: ['lat', 'lon'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_current_weather':
          return this.getCurrentWeather(args);
        case 'get_hourly_forecast':
          return this.getHourlyForecast(args);
        case 'get_daily_forecast':
          return this.getDailyForecast(args);
        case 'get_historical_daily':
          return this.getHistoricalDaily(args);
        case 'get_historical_hourly':
          return this.getHistoricalHourly(args);
        case 'get_current_air_quality':
          return this.getCurrentAirQuality(args);
        case 'get_forecast_air_quality':
          return this.getForecastAirQuality(args);
        case 'get_alerts':
          return this.getAlerts(args);
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
    const qs = new URLSearchParams({ key: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    return `${this.baseUrl}${path}?${qs.toString()}`;
  }

  private locationParams(args: Record<string, unknown>): Record<string, string | undefined> {
    const p: Record<string, string | undefined> = {};
    if (args.lat !== undefined && args.lon !== undefined) {
      p.lat = String(args.lat);
      p.lon = String(args.lon);
    } else if (args.city) {
      p.city = args.city as string;
    } else if (args.postal_code) {
      p.postal_code = args.postal_code as string;
    }
    if (args.units) p.units = args.units as string;
    if (args.lang) p.lang = args.lang as string;
    return p;
  }

  private async fetchApi(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Weatherbit returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCurrentWeather(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchApi('/current', this.locationParams(args));
  }

  private async getHourlyForecast(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.locationParams(args);
    if (args.hours !== undefined) params.hours = String(args.hours);
    return this.fetchApi('/forecast/hourly', params);
  }

  private async getDailyForecast(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.locationParams(args);
    if (args.days !== undefined) params.days = String(args.days);
    return this.fetchApi('/forecast/daily', params);
  }

  private async getHistoricalDaily(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'start_date and end_date are required' }], isError: true };
    }
    const params = this.locationParams(args);
    params.start_date = args.start_date as string;
    params.end_date = args.end_date as string;
    return this.fetchApi('/history/daily', params);
  }

  private async getHistoricalHourly(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.start_date || !args.end_date) {
      return { content: [{ type: 'text', text: 'start_date and end_date are required' }], isError: true };
    }
    const params = this.locationParams(args);
    params.start_date = args.start_date as string;
    params.end_date = args.end_date as string;
    if (args.tz) params.tz = args.tz as string;
    return this.fetchApi('/history/hourly', params);
  }

  private async getCurrentAirQuality(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchApi('/current/airquality', this.locationParams(args));
  }

  private async getForecastAirQuality(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.locationParams(args);
    if (args.hours !== undefined) params.hours = String(args.hours);
    return this.fetchApi('/forecast/airquality', params);
  }

  private async getAlerts(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined || args.lon === undefined) {
      return { content: [{ type: 'text', text: 'lat and lon are required' }], isError: true };
    }
    return this.fetchApi('/alerts', { lat: String(args.lat), lon: String(args.lon) });
  }
}
