/**
 * New York Times Geographic API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — NYT has not published an official MCP server for the Geographic API.
// Community MCP: None found.
// Our adapter covers: 4 tools (query places, search by name, search by coordinates, search by bounding box).
// Recommendation: use-rest-api — no official or community MCP exists.
//
// Base URL: https://api.nytimes.com/svc/semantic/v2/geocodes
// Auth: API key passed as query param `api-key`. Obtain at https://developer.nytimes.com/signup
// Spec: https://api.apis.guru/v2/specs/nytimes.com/geo_api/1.0.0/openapi.json
// Docs: https://developer.nytimes.com/docs/geo-products/1/overview
// Rate limits: 10 req/min, 4000 req/day per NYT developer plan defaults.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NYTimesGeoApiConfig {
  apiKey: string;
  baseUrl?: string;
}

export class NYTimesGeoApiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NYTimesGeoApiConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.nytimes.com/svc/semantic/v2/geocodes').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'nytimes-geo-api',
      displayName: 'New York Times Geographic API',
      version: '1.0.0',
      category: 'media' as const,
      keywords: [
        'new york times', 'nytimes', 'nyt', 'geographic', 'geo', 'geocode',
        'location', 'places', 'geonames', 'coordinates', 'latitude', 'longitude',
        'semantic', 'controlled vocabulary', 'media', 'news',
      ],
      toolNames: [
        'query_places',
        'search_places_by_name',
        'search_places_by_coordinates',
        'search_places_by_bounding_box',
      ],
      description: 'Search NYT geographic place data linked to GeoNames: query locations by name, coordinates, or bounding box with optional faceting and sorting.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'query_places',
        description: 'Query the NYT Geographic API with arbitrary parameters — supports name, latitude, longitude, bounding box, keyword query, filter, date range, facets, sort, limit, and offset',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'A displayable name for the place to search for',
            },
            query: {
              type: 'string',
              description: 'Keyword search across web_description, event_name, and venue_name. Wrap in quotes for AND searches.',
            },
            filter: {
              type: 'string',
              description: 'Filter search results based on facets (e.g. class_name:Countries)',
            },
            latitude: {
              type: 'string',
              description: 'Latitude of the place to search near',
            },
            longitude: {
              type: 'string',
              description: 'Longitude of the place to search near',
            },
            elevation: {
              type: 'number',
              description: 'Elevation of the place in meters',
            },
            sw: {
              type: 'string',
              description: 'Southwest corner of bounding box as "latitude,longitude". Requires ne parameter.',
            },
            ne: {
              type: 'string',
              description: 'Northeast corner of bounding box as "latitude,longitude". Requires sw parameter.',
            },
            date_range: {
              type: 'string',
              description: 'Date range filter in format YYYY-MM-DD:YYYY-MM-DD',
            },
            facets: {
              type: 'number',
              description: 'Set to 1 to include facet counts in response (default: 0)',
            },
            sort: {
              type: 'string',
              description: 'Sort order, e.g. "name+asc" or "dist+asc" for spatial searches',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Starting point of the result set for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'search_places_by_name',
        description: 'Search NYT geographic places by display name with optional limit and offset',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The display name of the place to search for (e.g. "Paris", "New York")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'search_places_by_coordinates',
        description: 'Search NYT geographic places near a latitude/longitude coordinate pair',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'string',
              description: 'Latitude coordinate (decimal degrees, e.g. "40.7128")',
            },
            longitude: {
              type: 'string',
              description: 'Longitude coordinate (decimal degrees, e.g. "-74.0060")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 20)',
            },
            sort: {
              type: 'string',
              description: 'Sort by distance: "dist+asc" (nearest first) or "dist+desc"',
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'search_places_by_bounding_box',
        description: 'Search NYT geographic places within a rectangular bounding box defined by SW and NE corners',
        inputSchema: {
          type: 'object',
          properties: {
            sw: {
              type: 'string',
              description: 'Southwest corner as "latitude,longitude" (e.g. "40.4774,-74.2591")',
            },
            ne: {
              type: 'string',
              description: 'Northeast corner as "latitude,longitude" (e.g. "40.9176,-73.7004")',
            },
            query: {
              type: 'string',
              description: 'Optional keyword to filter places within the bounding box',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['sw', 'ne'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query_places':
          return this.queryPlaces(args);
        case 'search_places_by_name':
          return this.searchPlacesByName(args);
        case 'search_places_by_coordinates':
          return this.searchPlacesByCoordinates(args);
        case 'search_places_by_bounding_box':
          return this.searchPlacesByBoundingBox(args);
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

  private async nytGet(params: Record<string, string>): Promise<ToolResult> {
    const allParams = { ...params, 'api-key': this.apiKey };
    const qs = new URLSearchParams(allParams).toString();
    const url = `${this.baseUrl}/query.json?${qs}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'User-Agent': 'EpicAI-NYTimesGeo-Adapter/1.0' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `NYT Geo API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async queryPlaces(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.name) params.name = args.name as string;
    if (args.query) params.query = args.query as string;
    if (args.filter) params.filter = args.filter as string;
    if (args.latitude) params.latitude = args.latitude as string;
    if (args.longitude) params.longitude = args.longitude as string;
    if (args.elevation !== undefined) params.elevation = String(args.elevation);
    if (args.sw) params.sw = args.sw as string;
    if (args.ne) params.ne = args.ne as string;
    if (args.date_range) params.date_range = args.date_range as string;
    if (args.facets !== undefined) params.facets = String(args.facets);
    if (args.sort) params.sort = args.sort as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    return this.nytGet(params);
  }

  private async searchPlacesByName(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const params: Record<string, string> = { name: args.name as string };
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    return this.nytGet(params);
  }

  private async searchPlacesByCoordinates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.latitude || !args.longitude) {
      return { content: [{ type: 'text', text: 'latitude and longitude are required' }], isError: true };
    }
    const params: Record<string, string> = {
      latitude: args.latitude as string,
      longitude: args.longitude as string,
    };
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.sort) params.sort = args.sort as string;
    return this.nytGet(params);
  }

  private async searchPlacesByBoundingBox(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sw || !args.ne) {
      return { content: [{ type: 'text', text: 'sw and ne bounding box corners are required' }], isError: true };
    }
    const params: Record<string, string> = {
      sw: args.sw as string,
      ne: args.ne as string,
    };
    if (args.query) params.query = args.query as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    return this.nytGet(params);
  }
}
