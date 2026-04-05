/**
 * Visual Crossing Weather MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
//   No official Visual Crossing MCP server was found on GitHub or npm.
//   Community weather MCP servers exist but none specifically for Visual Crossing.
//
// Our adapter covers: 5 tools (timeline forecast, timeline with dates, historical weather,
//   weather forecast, weather history query) matching the full public REST API surface.
// Recommendation: Use this adapter for all Visual Crossing weather data access.
//
// Base URL: https://weather.visualcrossing.com
// Auth: API key passed as query parameter `key` on every request
// Docs: https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/
// Spec: https://api.apis.guru/v2/specs/visualcrossing.com/weather/4.6/openapi.json
// Rate limits: Free tier 1,000 result records/day. Paid tiers scale to millions. See pricing page.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VisualCrossingWeatherConfig {
  apiKey: string;
  /** Optional base URL override (default: https://weather.visualcrossing.com) */
  baseUrl?: string;
}

function truncate(text: string): string {
  return text.length > 10_000
    ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
    : text;
}

export class VisualCrossingWeatherMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: VisualCrossingWeatherConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://weather.visualcrossing.com').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'visualcrossing-weather',
      displayName: 'Visual Crossing Weather',
      version: '1.0.0',
      category: 'data' as const,
      keywords: [
        'visual crossing', 'weather', 'forecast', 'historical weather', 'climate',
        'temperature', 'precipitation', 'humidity', 'wind', 'timeline',
        'meteorology', 'weather data', 'weather api', 'weather history',
        'daily forecast', 'hourly forecast', 'alerts', 'conditions',
      ],
      toolNames: [
        'get_timeline_weather',
        'get_timeline_weather_from_date',
        'get_timeline_weather_date_range',
        'get_weather_forecast',
        'get_weather_history',
      ],
      description: 'Visual Crossing Weather API: 15-day forecasts, historical weather records, and hourly/daily timeline data for any location worldwide by address, city, or coordinates.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_timeline_weather',
        description: 'Get the 15-day weather forecast and current conditions for a location. Returns daily and hourly data, alerts, and current conditions for any address, city, or lat/lon coordinates.',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location as address, city name, or "latitude,longitude" (e.g. "London,UK", "40.7128,-74.0060", "New York, NY")',
            },
            unitGroup: {
              type: 'string',
              description: 'Unit system for results: us (Fahrenheit, mph), metric (Celsius, km/h), uk (Celsius, mph), base (Kelvin, m/s). Default: us',
            },
            include: {
              type: 'string',
              description: 'Data sections to include (comma-separated): days, hours, alerts, current, events, obs, remote, fcst, stats, statsfcst. Default: days,hours',
            },
            contentType: {
              type: 'string',
              description: 'Output format: json (default) or csv',
            },
            lang: {
              type: 'string',
              description: 'Language code for weather condition descriptions (e.g. en, de, fr, es, pt, zh, ja). Default: en',
            },
          },
          required: ['location'],
        },
      },
      {
        name: 'get_timeline_weather_from_date',
        description: 'Get weather data for a location starting from a specific date. Returns historical data (past dates) or forecast data (future dates) with daily and hourly breakdown.',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location as address, city name, or "latitude,longitude" (e.g. "London,UK", "40.7128,-74.0060")',
            },
            startdate: {
              type: 'string',
              description: 'Start date in ISO 8601 format (e.g. 2024-01-15) or epoch timestamp',
            },
            unitGroup: {
              type: 'string',
              description: 'Unit system: us (Fahrenheit), metric (Celsius), uk, base (Kelvin). Default: us',
            },
            include: {
              type: 'string',
              description: 'Data sections to include (comma-separated): days, hours, alerts, current, events. Default: days,hours',
            },
            contentType: {
              type: 'string',
              description: 'Output format: json (default) or csv',
            },
            lang: {
              type: 'string',
              description: 'Language code for weather descriptions (e.g. en, de, fr). Default: en',
            },
          },
          required: ['location', 'startdate'],
        },
      },
      {
        name: 'get_timeline_weather_date_range',
        description: 'Get weather data for a location over a specific date range. Seamlessly returns historical records for past dates and forecast data for future dates.',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location as address, city name, or "latitude,longitude" (e.g. "Paris, France", "51.5074,-0.1278")',
            },
            startdate: {
              type: 'string',
              description: 'Start date in ISO 8601 format (e.g. 2024-01-01)',
            },
            enddate: {
              type: 'string',
              description: 'End date in ISO 8601 format (e.g. 2024-01-31)',
            },
            unitGroup: {
              type: 'string',
              description: 'Unit system: us (Fahrenheit), metric (Celsius), uk, base (Kelvin). Default: us',
            },
            include: {
              type: 'string',
              description: 'Data sections to include (comma-separated): days, hours, alerts, current, events. Default: days,hours',
            },
            contentType: {
              type: 'string',
              description: 'Output format: json (default) or csv',
            },
            lang: {
              type: 'string',
              description: 'Language code for weather descriptions (e.g. en, de, fr). Default: en',
            },
          },
          required: ['location', 'startdate', 'enddate'],
        },
      },
      {
        name: 'get_weather_forecast',
        description: 'Get up to 15-day weather forecast for one or more locations. Supports aggregated hourly intervals and multiple output formats.',
        inputSchema: {
          type: 'object',
          properties: {
            locations: {
              type: 'string',
              description: 'One or more location addresses or lat/lon pairs, pipe-separated (e.g. "London,UK|Paris,France" or "40.71,-74.00")',
            },
            aggregateHours: {
              type: 'number',
              description: 'Time interval for data aggregation in hours: 1, 6, 12, or 24 (daily). Default: 24',
            },
            unitGroup: {
              type: 'string',
              description: 'Unit system: us (Fahrenheit), metric (Celsius), uk, base (Kelvin). Default: us',
            },
            contentType: {
              type: 'string',
              description: 'Output format: json (default) or csv',
            },
            shortColumnNames: {
              type: 'boolean',
              description: 'Use abbreviated column names in CSV output (default: false)',
            },
          },
        },
      },
      {
        name: 'get_weather_history',
        description: 'Retrieve historical weather records for a location over a date/time range. Suitable for climate analysis, event weather lookup, and trend reporting.',
        inputSchema: {
          type: 'object',
          properties: {
            locations: {
              type: 'string',
              description: 'One or more location addresses or lat/lon pairs, pipe-separated (e.g. "Chicago,IL" or "41.88,-87.63")',
            },
            startDateTime: {
              type: 'string',
              description: 'Start date/time in ISO 8601 format (e.g. 2023-07-04T00:00:00)',
            },
            endDateTime: {
              type: 'string',
              description: 'End date/time in ISO 8601 format (e.g. 2023-07-04T23:59:59)',
            },
            aggregateHours: {
              type: 'number',
              description: 'Time interval for data aggregation in hours: 1, 6, 12, or 24 (daily). Default: 24',
            },
            unitGroup: {
              type: 'string',
              description: 'Unit system: us (Fahrenheit), metric (Celsius), uk, base (Kelvin). Default: us',
            },
            contentType: {
              type: 'string',
              description: 'Output format: json (default) or csv',
            },
            includeNormals: {
              type: 'boolean',
              description: 'Include historical normal values alongside observed data (default: false)',
            },
            maxStations: {
              type: 'number',
              description: 'Maximum number of weather stations to use for the query (default: service decides)',
            },
            maxDistance: {
              type: 'number',
              description: 'Maximum distance (km) from the location to search for weather stations',
            },
            shortColumnNames: {
              type: 'boolean',
              description: 'Use abbreviated column names in CSV output (default: false)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_timeline_weather':           return this.getTimelineWeather(args);
        case 'get_timeline_weather_from_date': return this.getTimelineWeatherFromDate(args);
        case 'get_timeline_weather_date_range': return this.getTimelineWeatherDateRange(args);
        case 'get_weather_forecast':           return this.getWeatherForecast(args);
        case 'get_weather_history':            return this.getWeatherHistory(args);
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

  // ── HTTP helpers ──────────────────────────────────────────────────────────

  private buildUrl(path: string, params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams({ key: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    return `${this.baseUrl}${path}?${qs.toString()}`;
  }

  private async fetchWeather(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ' — ' + errText : ''}` }],
        isError: true,
      };
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      let data: unknown;
      try { data = await response.json(); } catch { return { content: [{ type: 'text', text: `Visual Crossing returned non-JSON (HTTP ${response.status})` }], isError: true }; }
      return { content: [{ type: 'text', text: truncate(JSON.stringify(data, null, 2)) }], isError: false };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: truncate(text) }], isError: false };
  }

  // ── Timeline endpoints ────────────────────────────────────────────────────

  private async getTimelineWeather(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location) return { content: [{ type: 'text', text: 'location is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      unitGroup: (args.unitGroup as string) ?? 'us',
      include: (args.include as string) ?? 'days,hours',
      contentType: (args.contentType as string) ?? 'json',
      lang: (args.lang as string) ?? 'en',
    };
    return this.fetchWeather(
      `/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(args.location as string)}`,
      params,
    );
  }

  private async getTimelineWeatherFromDate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location) return { content: [{ type: 'text', text: 'location is required' }], isError: true };
    if (!args.startdate) return { content: [{ type: 'text', text: 'startdate is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      unitGroup: (args.unitGroup as string) ?? 'us',
      include: (args.include as string) ?? 'days,hours',
      contentType: (args.contentType as string) ?? 'json',
      lang: (args.lang as string) ?? 'en',
    };
    return this.fetchWeather(
      `/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(args.location as string)}/${encodeURIComponent(args.startdate as string)}`,
      params,
    );
  }

  private async getTimelineWeatherDateRange(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location) return { content: [{ type: 'text', text: 'location is required' }], isError: true };
    if (!args.startdate) return { content: [{ type: 'text', text: 'startdate is required' }], isError: true };
    if (!args.enddate) return { content: [{ type: 'text', text: 'enddate is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      unitGroup: (args.unitGroup as string) ?? 'us',
      include: (args.include as string) ?? 'days,hours',
      contentType: (args.contentType as string) ?? 'json',
      lang: (args.lang as string) ?? 'en',
    };
    return this.fetchWeather(
      `/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(args.location as string)}/${encodeURIComponent(args.startdate as string)}/${encodeURIComponent(args.enddate as string)}`,
      params,
    );
  }

  // ── Legacy weatherdata endpoints ──────────────────────────────────────────

  private async getWeatherForecast(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      contentType: (args.contentType as string) ?? 'json',
      unitGroup: (args.unitGroup as string) ?? 'us',
    };
    if (args.locations !== undefined) params.locations = args.locations as string;
    if (args.aggregateHours !== undefined) params.aggregateHours = String(args.aggregateHours);
    if (args.shortColumnNames !== undefined) params.shortColumnNames = String(args.shortColumnNames);
    return this.fetchWeather('/VisualCrossingWebServices/rest/services/weatherdata/forecast', params);
  }

  private async getWeatherHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {
      contentType: (args.contentType as string) ?? 'json',
      unitGroup: (args.unitGroup as string) ?? 'us',
    };
    if (args.locations !== undefined) params.locations = args.locations as string;
    if (args.startDateTime !== undefined) params.startDateTime = args.startDateTime as string;
    if (args.endDateTime !== undefined) params.endDateTime = args.endDateTime as string;
    if (args.aggregateHours !== undefined) params.aggregateHours = String(args.aggregateHours);
    if (args.includeNormals !== undefined) params.includeNormals = String(args.includeNormals);
    if (args.maxStations !== undefined) params.maxStations = String(args.maxStations);
    if (args.maxDistance !== undefined) params.maxDistance = String(args.maxDistance);
    if (args.shortColumnNames !== undefined) params.shortColumnNames = String(args.shortColumnNames);
    return this.fetchWeather('/VisualCrossingWebServices/rest/services/weatherdata/history', params);
  }
}
