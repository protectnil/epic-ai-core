/**
 * HERE Technologies MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official HERE Technologies MCP server was found on GitHub or the HERE Developer portal.
//
// Base URLs (per HERE service):
//   Geocoding & Search: https://geocode.search.hereapi.com/v1
//   Reverse Geocoding:  https://revgeocode.search.hereapi.com/v1
//   Routing:            https://router.hereapi.com/v8
//   Isoline Routing:    https://isoline.router.hereapi.com/v8
//   Matrix Routing:     https://matrix.router.hereapi.com/v8
// Auth: API key passed as ?apiKey=<key> query parameter on all requests
// Docs: https://developer.here.com/documentation
// Rate limits: Free tier 250,000 transactions/month; paid tiers vary by plan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HereConfig {
  apiKey: string;
  geocodeBaseUrl?: string;
  routingBaseUrl?: string;
  isolineBaseUrl?: string;
  matrixBaseUrl?: string;
}

export class HereMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly geocodeBaseUrl: string;
  private readonly routingBaseUrl: string;
  private readonly isolineBaseUrl: string;
  private readonly matrixBaseUrl: string;

  constructor(config: HereConfig) {
    super();
    this.apiKey = config.apiKey;
    this.geocodeBaseUrl = config.geocodeBaseUrl || 'https://geocode.search.hereapi.com/v1';
    this.routingBaseUrl = config.routingBaseUrl || 'https://router.hereapi.com/v8';
    this.isolineBaseUrl = config.isolineBaseUrl || 'https://isoline.router.hereapi.com/v8';
    this.matrixBaseUrl = config.matrixBaseUrl || 'https://matrix.router.hereapi.com/v8';
  }

  static catalog() {
    return {
      name: 'here',
      displayName: 'HERE Technologies',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'here', 'here technologies', 'maps', 'location', 'geocoding', 'routing',
        'navigation', 'directions', 'isoline', 'matrix routing', 'geofencing',
        'place search', 'address lookup', 'coordinates', 'lat lng',
      ],
      toolNames: [
        'geocode', 'reverse_geocode', 'search_places', 'lookup_place',
        'calculate_route', 'calculate_isoline', 'calculate_matrix',
      ],
      description: 'HERE Technologies location and routing: geocode addresses, reverse geocode coordinates, search places, calculate turn-by-turn routes, isolines (reachability zones), and origin-destination matrices.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'geocode',
        description: 'Convert a free-text address or place name to geographic coordinates (latitude/longitude)',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Free-form address or place name query (e.g. "200 S Mathilda Ave, Sunnyvale, CA")',
            },
            lang: {
              type: 'string',
              description: 'BCP 47 language code for result labels (default: en-US)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 5, max: 20)',
            },
            at: {
              type: 'string',
              description: 'Coordinate bias point as "lat,lng" to prioritize nearby results (e.g. "37.3861,122.0839")',
            },
            countryCode: {
              type: 'string',
              description: 'ISO 3166-1 alpha-3 country code to restrict results (e.g. USA, GBR, DEU)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'reverse_geocode',
        description: 'Convert geographic coordinates to a human-readable address or place name',
        inputSchema: {
          type: 'object',
          properties: {
            at: {
              type: 'string',
              description: 'Coordinates to reverse geocode as "lat,lng" (e.g. "37.3861,-122.0839")',
            },
            lang: {
              type: 'string',
              description: 'BCP 47 language code for the response (default: en-US)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 1, max: 20)',
            },
          },
          required: ['at'],
        },
      },
      {
        name: 'search_places',
        description: 'Search for points of interest, businesses, or venues by category or text near a location',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query for place name or category (e.g. "coffee shop", "hospital")',
            },
            at: {
              type: 'string',
              description: 'Search center coordinates as "lat,lng" (required unless using in parameter)',
            },
            in: {
              type: 'string',
              description: 'Bounding box or circle to constrain results (e.g. "circle:37.38,-122.08,r=5000")',
            },
            categories: {
              type: 'string',
              description: 'Comma-separated HERE category IDs to filter results (e.g. 100-1000-0000)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 20, max: 100)',
            },
            lang: {
              type: 'string',
              description: 'BCP 47 language code for result labels (default: en-US)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'lookup_place',
        description: 'Retrieve detailed information about a specific HERE place by its HERE ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'HERE place ID (obtained from a geocode or search_places result)',
            },
            lang: {
              type: 'string',
              description: 'BCP 47 language code for the response (default: en-US)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'calculate_route',
        description: 'Calculate a turn-by-turn route between two or more waypoints with transport mode, departure time, and optimization options',
        inputSchema: {
          type: 'object',
          properties: {
            origin: {
              type: 'string',
              description: 'Starting coordinates as "lat,lng" (e.g. "37.3861,-122.0839")',
            },
            destination: {
              type: 'string',
              description: 'Ending coordinates as "lat,lng" (e.g. "37.7749,-122.4194")',
            },
            transportMode: {
              type: 'string',
              description: 'Transport mode: car, truck, pedestrian, bicycle, scooter, taxi, bus (default: car)',
            },
            departureTime: {
              type: 'string',
              description: 'ISO 8601 departure time for time-aware routing (e.g. 2026-04-01T09:00:00)',
            },
            return: {
              type: 'string',
              description: 'Comma-separated response sections: summary, polyline, actions, instructions, turnByTurnActions (default: summary)',
            },
            avoid: {
              type: 'string',
              description: 'Features to avoid: tollRoad, controlledAccessHighway, ferry, tunnel, dirtRoad (comma-separated)',
            },
            routingMode: {
              type: 'string',
              description: 'Routing optimization: fast (default) or short',
            },
          },
          required: ['origin', 'destination'],
        },
      },
      {
        name: 'calculate_isoline',
        description: 'Calculate a reachability polygon (isoline) showing all areas reachable within a given time or distance from an origin',
        inputSchema: {
          type: 'object',
          properties: {
            origin: {
              type: 'string',
              description: 'Starting point coordinates as "lat,lng" (e.g. "37.3861,-122.0839")',
            },
            range_type: {
              type: 'string',
              description: 'Isoline range type: time (seconds) or distance (meters)',
            },
            range_value: {
              type: 'number',
              description: 'Isoline range value — seconds for time-based (e.g. 1800 = 30 min), meters for distance-based',
            },
            transportMode: {
              type: 'string',
              description: 'Transport mode: car, truck, pedestrian, bicycle (default: car)',
            },
            departureTime: {
              type: 'string',
              description: 'ISO 8601 departure time for traffic-aware isoline calculation',
            },
            optimizeFor: {
              type: 'string',
              description: 'Optimization objective: balanced (default) or quality',
            },
          },
          required: ['origin', 'range_type', 'range_value'],
        },
      },
      {
        name: 'calculate_matrix',
        description: 'Calculate a travel time and distance matrix for multiple origins and destinations in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            origins: {
              type: 'array',
              description: 'Array of origin coordinate strings as "lat,lng" (max 15 for synchronous mode)',
            },
            destinations: {
              type: 'array',
              description: 'Array of destination coordinate strings as "lat,lng" (max 15 for synchronous mode)',
            },
            transportMode: {
              type: 'string',
              description: 'Transport mode: car, truck, pedestrian, bicycle (default: car)',
            },
            departureTime: {
              type: 'string',
              description: 'ISO 8601 departure time for traffic-aware calculations',
            },
            routingMode: {
              type: 'string',
              description: 'Routing optimization: fast (default) or short',
            },
          },
          required: ['origins', 'destinations'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'geocode':
          return this.geocode(args);
        case 'reverse_geocode':
          return this.reverseGeocode(args);
        case 'search_places':
          return this.searchPlaces(args);
        case 'lookup_place':
          return this.lookupPlace(args);
        case 'calculate_route':
          return this.calculateRoute(args);
        case 'calculate_isoline':
          return this.calculateIsoline(args);
        case 'calculate_matrix':
          return this.calculateMatrix(args);
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

  private async hereGet(baseUrl: string, path: string, params: Record<string, string>): Promise<ToolResult> {
    params['apiKey'] = this.apiKey;
    const qs = new URLSearchParams(params).toString();
    const url = `${baseUrl}${path}?${qs}`;
    const response = await this.fetchWithRetry(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async herePost(baseUrl: string, path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const url = `${baseUrl}${path}?apiKey=${encodeURIComponent(this.apiKey)}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async geocode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string> = { q: args.q as string };
    if (args.lang) params.lang = args.lang as string;
    if (args.limit) params.limit = String(args.limit);
    if (args.at) params.at = args.at as string;
    if (args.countryCode) params.in = `countryCode:${encodeURIComponent(args.countryCode as string)}`;
    return this.hereGet(this.geocodeBaseUrl, '/geocode', params);
  }

  private async reverseGeocode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.at) return { content: [{ type: 'text', text: 'at is required' }], isError: true };
    const params: Record<string, string> = { at: args.at as string };
    if (args.lang) params.lang = args.lang as string;
    if (args.limit) params.limit = String(args.limit);
    return this.hereGet('https://revgeocode.search.hereapi.com/v1', '/revgeocode', params);
  }

  private async searchPlaces(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string> = { q: args.q as string };
    if (args.at) params.at = args.at as string;
    if (args.in) params.in = args.in as string;
    if (args.categories) params.categories = args.categories as string;
    if (args.limit) params.limit = String(args.limit);
    if (args.lang) params.lang = args.lang as string;
    return this.hereGet(this.geocodeBaseUrl, '/browse', params);
  }

  private async lookupPlace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string> = { id: args.id as string };
    if (args.lang) params.lang = args.lang as string;
    return this.hereGet(this.geocodeBaseUrl, '/lookup', params);
  }

  private async calculateRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin || !args.destination) {
      return { content: [{ type: 'text', text: 'origin and destination are required' }], isError: true };
    }
    const params: Record<string, string> = {
      origin: args.origin as string,
      destination: args.destination as string,
      transportMode: (args.transportMode as string) || 'car',
      return: (args.return as string) || 'summary',
    };
    if (args.departureTime) params.departureTime = args.departureTime as string;
    if (args.routingMode) params.routingMode = args.routingMode as string;
    if (args.avoid) params['avoid[features]'] = args.avoid as string;
    return this.hereGet(this.routingBaseUrl, '/routes', params);
  }

  private async calculateIsoline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin || !args.range_type || args.range_value === undefined) {
      return { content: [{ type: 'text', text: 'origin, range_type, and range_value are required' }], isError: true };
    }
    const params: Record<string, string> = {
      origin: args.origin as string,
      transportMode: (args.transportMode as string) || 'car',
      [`range[type]`]: args.range_type as string,
      [`range[values]`]: String(args.range_value),
    };
    if (args.departureTime) params.departureTime = args.departureTime as string;
    if (args.optimizeFor) params.optimizeFor = args.optimizeFor as string;
    return this.hereGet(this.isolineBaseUrl, '/isolines', params);
  }

  private async calculateMatrix(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origins || !args.destinations) {
      return { content: [{ type: 'text', text: 'origins and destinations are required' }], isError: true };
    }
    const origins = (args.origins as string[]).map((coord: string) => ({ lat: parseFloat(coord.split(',')[0]), lng: parseFloat(coord.split(',')[1]) }));
    const destinations = (args.destinations as string[]).map((coord: string) => ({ lat: parseFloat(coord.split(',')[0]), lng: parseFloat(coord.split(',')[1]) }));

    const body: Record<string, unknown> = {
      origins,
      destinations,
      regionDefinition: { type: 'world' },
      routingMode: (args.routingMode as string) || 'fast',
      transportMode: (args.transportMode as string) || 'car',
    };
    if (args.departureTime) body.departureTime = args.departureTime;
    return this.herePost(this.matrixBaseUrl, '/matrix', body);
  }
}
