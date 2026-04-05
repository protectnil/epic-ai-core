/**
 * ORNL Daymet MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official ORNL Daymet MCP server was found on GitHub.
// This adapter wraps the Daymet Single Pixel Extraction Tool REST API,
// providing access to daily surface weather data from the Daymet database.
//
// Base URL: https://daymet.ornl.gov/single-pixel
// Auth: None — the Daymet API is publicly accessible with no authentication required
// Docs: https://daymet.ornl.gov/single-pixel/api
// Rate limits: Not formally documented; reasonable use expected per ORNL policy

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OrnlDaymetConfig {
  baseUrl?: string;
}

export class OrnlDaymetMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: OrnlDaymetConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://daymet.ornl.gov/single-pixel';
  }

  static catalog() {
    return {
      name: 'ornl-daymet',
      displayName: 'ORNL Daymet',
      version: '1.0.0',
      category: 'science',
      keywords: [
        'daymet', 'ornl', 'climate', 'weather', 'temperature', 'precipitation',
        'solar radiation', 'humidity', 'snow water equivalent', 'atmospheric pressure',
        'daily surface data', 'meteorology', 'environmental', 'geospatial',
        'latitude', 'longitude', 'historical weather', 'nasa', 'earth data',
      ],
      toolNames: [
        'get_daymet_data',
        'save_daymet_data',
        'visualize_daymet_data',
        'preview_daymet_data',
      ],
      description: 'ORNL Daymet: retrieve daily surface weather data (temperature, precipitation, solar radiation) for a geographic point by lat/lon from the Daymet 1 km grid.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_daymet_data',
        description: 'Download daily Daymet surface weather data as JSON or CSV for a lat/lon point, with optional variable and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location in decimal degrees (required)',
            },
            lon: {
              type: 'number',
              description: 'Longitude of the location in decimal degrees (required)',
            },
            vars: {
              type: 'string',
              description: 'Comma-separated Daymet variables to retrieve: tmax, tmin, prcp, srad, vp, swe, dayl (default: all)',
            },
            years: {
              type: 'string',
              description: 'Comma-separated years to subset, e.g. "2010,2011,2012". Valid range: 1980–2019',
            },
            start: {
              type: 'string',
              description: 'Start date for date range subset in YYYY-MM-DD format',
            },
            end: {
              type: 'string',
              description: 'End date for date range subset in YYYY-MM-DD format',
            },
            format: {
              type: 'string',
              description: 'Response format: json or csv (default: json)',
            },
          },
          required: ['lat', 'lon'],
        },
      },
      {
        name: 'save_daymet_data',
        description: 'Download and save Daymet daily weather data to local machine as JSON or CSV for a lat/lon point',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location in decimal degrees (required)',
            },
            lon: {
              type: 'number',
              description: 'Longitude of the location in decimal degrees (required)',
            },
            vars: {
              type: 'string',
              description: 'Comma-separated Daymet variables: tmax, tmin, prcp, srad, vp, swe, dayl (default: all)',
            },
            years: {
              type: 'string',
              description: 'Comma-separated years to subset, e.g. "2010,2011". Valid range: 1980–2019',
            },
            start: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            end: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            format: {
              type: 'string',
              description: 'Response format: json or csv (default: json)',
            },
          },
          required: ['lat', 'lon'],
        },
      },
      {
        name: 'visualize_daymet_data',
        description: 'Fetch Daymet daily weather data for Plotly visualization for a lat/lon point with optional variable and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location in decimal degrees (required)',
            },
            lon: {
              type: 'number',
              description: 'Longitude of the location in decimal degrees (required)',
            },
            vars: {
              type: 'string',
              description: 'Comma-separated Daymet variables: tmax, tmin, prcp, srad, vp, swe, dayl (default: all)',
            },
            years: {
              type: 'string',
              description: 'Comma-separated years to subset, e.g. "2015,2016". Valid range: 1980–2019',
            },
            start: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            end: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            format: {
              type: 'string',
              description: 'Response format: json or csv (default: json)',
            },
          },
          required: ['lat', 'lon'],
        },
      },
      {
        name: 'preview_daymet_data',
        description: 'Preview Daymet daily weather data in tabular form for a lat/lon point, useful for quick inspection before full download',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the location in decimal degrees (required)',
            },
            lon: {
              type: 'number',
              description: 'Longitude of the location in decimal degrees (required)',
            },
            vars: {
              type: 'string',
              description: 'Comma-separated Daymet variables: tmax, tmin, prcp, srad, vp, swe, dayl (default: all)',
            },
            years: {
              type: 'string',
              description: 'Comma-separated years to subset, e.g. "2018,2019". Valid range: 1980–2019',
            },
            start: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            end: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            format: {
              type: 'string',
              description: 'Response format: json or csv (default: json)',
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
        case 'get_daymet_data':
          return this.fetchDaymetData(args, '/api/data');
        case 'save_daymet_data':
          return this.fetchDaymetData(args, '/send/saveData');
        case 'visualize_daymet_data':
          return this.fetchDaymetData(args, '/visualize');
        case 'preview_daymet_data':
          return this.fetchDaymetData(args, '/preview');
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async fetchDaymetData(args: Record<string, unknown>, path: string): Promise<ToolResult> {
    const lat = args.lat as number;
    const lon = args.lon as number;

    if (lat === undefined || lat === null || lon === undefined || lon === null) {
      return {
        content: [{ type: 'text', text: 'Missing required parameters: lat and lon' }],
        isError: true,
      };
    }

    const format = (args.format as string) ?? 'json';
    const params = new URLSearchParams();
    params.set('lat', String(lat));
    params.set('lon', String(lon));
    params.set('format', format);

    if (args.vars) {
      const varsArr = (args.vars as string).split(',').map((v: string) => v.trim());
      for (const v of varsArr) {
        params.append('vars', v);
      }
    }

    if (args.years) {
      const yearsArr = (args.years as string).split(',').map((y: string) => y.trim());
      for (const y of yearsArr) {
        params.append('years', y);
      }
    }

    if (args.start) {
      params.set('start', args.start as string);
    }

    if (args.end) {
      params.set('end', args.end as string);
    }

    const url = `${this.baseUrl}${path}?${params.toString()}`;

    const response = await this.fetchWithRetry(url, {
      headers: {
        'Accept': format === 'csv' ? 'text/csv' : 'application/json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    let text: string;
    if (format === 'json') {
      const data = await response.json();
      text = JSON.stringify(data, null, 2);
    } else {
      text = await response.text();
    }

    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }
}
