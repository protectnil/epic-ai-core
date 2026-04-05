/**
 * GeoDataSource MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official GeoDataSource MCP server was found on GitHub.
//
// Base URL: https://api.geodatasource.com
// Auth: API key passed as query parameter `key` on every request
// Docs: https://www.geodatasource.com/web-service
// Rate limits: Depends on plan — Free tier limited; paid plans vary. See https://www.geodatasource.com/pricing

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GeoDataSourceConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.geodatasource.com) */
  baseUrl?: string;
}

export class GeoDataSourceMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: GeoDataSourceConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.geodatasource.com';
  }

  static catalog() {
    return {
      name: 'geodatasource',
      displayName: 'GeoDataSource',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'geodatasource', 'geolocation', 'geocoding', 'latitude', 'longitude',
        'city', 'country', 'region', 'coordinates', 'location', 'geography',
        'reverse geocode', 'place', 'mapping', 'spatial',
      ],
      toolNames: ['lookup_city_by_coordinates'],
      description: 'Reverse geocode latitude/longitude coordinates to city, region, and country information using the GeoDataSource Location Search API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'lookup_city_by_coordinates',
        description: 'Reverse geocode latitude and longitude coordinates to retrieve city name, country, region, and location details — supports JSON or XML response format',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude in decimal degrees (e.g. 40.7128 for New York City)',
            },
            lng: {
              type: 'number',
              description: 'Longitude in decimal degrees (e.g. -74.0060 for New York City)',
            },
            format: {
              type: 'string',
              description: 'Response format: json or xml (default: json)',
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
        case 'lookup_city_by_coordinates':
          return this.lookupCityByCoordinates(args);
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

  private async lookupCityByCoordinates(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined || args.lng === undefined) {
      return { content: [{ type: 'text', text: 'lat and lng are required' }], isError: true };
    }

    const format = (args.format as string) ?? 'json';
    const validFormats = ['json', 'xml'];
    if (!validFormats.includes(format)) {
      return { content: [{ type: 'text', text: `format must be one of: ${validFormats.join(', ')}` }], isError: true };
    }

    const qs = new URLSearchParams({
      key: this.apiKey,
      lat: String(args.lat),
      lng: String(args.lng),
      format,
    });

    const url = `${this.baseUrl}/city?${qs.toString()}`;
    const response = await this.fetchWithRetry(url, { method: 'GET' });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    if (format === 'xml') {
      const text = await response.text();
      const truncated = text.length > 10_000
        ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
        : text;
      return { content: [{ type: 'text', text: truncated }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`GeoDataSource returned non-JSON (HTTP ${response.status})`);
    }

    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
