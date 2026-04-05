/**
 * Storm Glass MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Storm Glass MCP server was found on GitHub or npm.
//
// Base URL: https://api.stormglass.io
// Auth: API key in request header: "Authorization" (value is the API key directly, not "Bearer ...")
// Docs: https://stormglass.io/docs/
// Rate limits: Free tier 10 requests/day. Paid tiers available. See https://stormglass.io/pricing/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface StormGlassConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.stormglass.io) */
  baseUrl?: string;
}

export class StormGlassMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: StormGlassConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.stormglass.io';
  }

  static catalog() {
    return {
      name: 'stormglass',
      displayName: 'Storm Glass',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'stormglass', 'marine', 'weather', 'ocean', 'wave', 'swell', 'wind',
        'water', 'temperature', 'forecast', 'coordinates', 'latitude', 'longitude',
        'sailing', 'surfing', 'fishing', 'navigation', 'maritime', 'sea',
        'hourly', 'meteorology', 'hydrography', 'air-temperature',
      ],
      toolNames: [
        'get_forecast',
      ],
      description: 'Storm Glass Marine Weather API: hourly marine and weather forecasts by coordinates sourced from multiple global meteorological models including NOAA, SMHI, FMI, and FCOO. Provides wave height, swell, wind, air temperature, and water temperature.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_forecast',
        description: 'Get hourly marine weather forecast for a geographic coordinate. Returns wave height, swell direction/height/period, wind direction/speed, air temperature, water temperature, and wave period from multiple global models (NOAA, SMHI, FMI, FCOO, DWD).',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location in decimal degrees. Valid range: -90 to 90. (e.g. 58.7984)',
            },
            lng: {
              type: 'number',
              description: 'Longitude of the location in decimal degrees. Valid range: -180 to 180. (e.g. 17.8081)',
            },
            params: {
              type: 'string',
              description: 'Comma-separated list of parameters to return. Available: waveHeight, waveDirection, wavePeriod, swellHeight, swellDirection, swellPeriod, windSpeed, windDirection, airTemperature, waterTemperature. Omit to receive all available parameters.',
            },
            start: {
              type: 'string',
              description: 'Start time for the forecast window in ISO 8601 format (e.g. "2026-03-28T00:00:00+00:00"). Defaults to current time.',
            },
            end: {
              type: 'string',
              description: 'End time for the forecast window in ISO 8601 format (e.g. "2026-04-04T00:00:00+00:00"). Defaults to 7 days from start.',
            },
            source: {
              type: 'string',
              description: 'Comma-separated list of data sources to include (e.g. "noaa,smhi,fmi,fcoo,dwd"). Omit to include all available sources.',
            },
          },
          required: ['lat', 'lng'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_forecast': return this.getForecast(args);
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

  private async getForecast(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined || args.lng === undefined) {
      return { content: [{ type: 'text', text: 'lat and lng are required' }], isError: true };
    }
    const lat = args.lat as number;
    const lng = args.lng as number;
    if (lat < -90 || lat > 90) {
      return { content: [{ type: 'text', text: 'lat must be between -90 and 90' }], isError: true };
    }
    if (lng < -180 || lng > 180) {
      return { content: [{ type: 'text', text: 'lng must be between -180 and 180' }], isError: true };
    }

    const url = new URL(`${this.baseUrl}/forecast`);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lng', String(lng));
    if (args.params) url.searchParams.set('params', args.params as string);
    if (args.start) url.searchParams.set('start', args.start as string);
    if (args.end) url.searchParams.set('end', args.end as string);
    if (args.source) url.searchParams.set('source', args.source as string);

    const response = await this.fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: this.apiKey,
        Accept: 'application/json',
      },
    });

    if (response.status === 403) {
      return { content: [{ type: 'text', text: 'API error: 403 Forbidden — check your Storm Glass API key' }], isError: true };
    }
    if (response.status === 422) {
      let errText: string;
      try { errText = JSON.stringify(await response.json()); } catch { errText = response.statusText; }
      return { content: [{ type: 'text', text: `API error: 422 Unprocessable Entity — invalid parameters: ${errText}` }], isError: true };
    }
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }

    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Storm Glass returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
