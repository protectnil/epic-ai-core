/**
 * TomTom MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/tomtom-international/tomtom-mcp — transport: stdio + remote streamable-HTTP (https://mcp.tomtom.com/maps), auth: API key
// TomTom publishes an official MCP server (tomtom-international/tomtom-mcp, launched July 2025, actively maintained).
// TomTom Maps backend tools (10): tomtom-geocode, tomtom-reverse-geocode, tomtom-fuzzy-search,
//   tomtom-poi-search, tomtom-nearby-search, tomtom-calculate-route, tomtom-waypoint-optimize,
//   tomtom-calculate-reachable-range, tomtom-traffic-incidents, tomtom-static-image, tomtom-map-tile
// Orbis Maps backend adds: tomtom-ev-routing, tomtom-ev-search, tomtom-search-along-route,
//   tomtom-area-search, tomtom-data-viz (interactive map visualization)
// Our adapter covers: 10 tools (REST). Vendor MCP covers: 11+ tools (TomTom Maps) + Orbis extras.
// Recommendation: use-both — MCP covers geocode/reverse/fuzzy-search/nearby-search/ev-routing/area-search/data-viz
//   not replicated in this REST adapter. Our REST adapter covers batch_geocode/search_along_route which
//   the base MCP Maps backend does not expose. Full coverage requires union of both.
// Integration: use-both
// MCP-sourced tools (7): tomtom-geocode, tomtom-reverse-geocode, tomtom-fuzzy-search, tomtom-poi-search,
//   tomtom-nearby-search, tomtom-calculate-route, tomtom-calculate-reachable-range,
//   tomtom-traffic-incidents, tomtom-static-image, tomtom-map-tile (+ Orbis: ev-routing, ev-search, area-search, data-viz)
// REST-sourced tools (2 unique): batch_geocode, search_along_route (not in MCP Maps backend)
// Combined coverage: 12+ tools (MCP: 10+ + REST unique: 2)
//
// Base URL: https://api.tomtom.com
// Auth: API key passed as query parameter: ?key={API_KEY}
// Docs: https://developer.tomtom.com/
// Rate limits: 5 QPS for non-tile APIs; 1,000 QPS for tile APIs.
//              Free plan: 50,000 tile requests/day, 2,500 non-tile requests/day.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TomTomConfig {
  apiKey: string;
  baseUrl?: string;
}

export class TomTomMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TomTomConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.tomtom.com';
  }

  static catalog() {
    return {
      name: 'tomtom',
      displayName: 'TomTom',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'tomtom', 'maps', 'geocoding', 'routing', 'navigation', 'traffic',
        'directions', 'location', 'geospatial', 'reverse geocode', 'search',
        'points of interest', 'poi', 'waypoints', 'ev routing',
      ],
      toolNames: [
        'geocode',
        'reverse_geocode',
        'search_poi',
        'calculate_route',
        'calculate_reachable_range',
        'get_traffic_incidents',
        'get_traffic_flow',
        'batch_geocode',
        'search_along_route',
        'get_map_tile_url',
      ],
      description: 'TomTom location platform: geocode addresses, reverse-geocode coordinates, search points of interest, calculate routes with traffic, and retrieve live traffic incidents.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'geocode',
        description: 'Convert a street address or place name into geographic coordinates (latitude/longitude) with address components',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Address or place name to geocode (e.g. "1600 Amphitheatre Pkwy, Mountain View, CA")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 5, max: 100)',
            },
            country_set: {
              type: 'string',
              description: 'Comma-separated ISO 3166-1 alpha-2 country codes to restrict results (e.g. "US,CA")',
            },
            language: {
              type: 'string',
              description: 'Language for result labels in IETF format (e.g. en-US, fr-FR — default: en-US)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'reverse_geocode',
        description: 'Convert geographic coordinates (latitude, longitude) into a human-readable address and location details',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude in decimal degrees (e.g. 37.4224764)',
            },
            lon: {
              type: 'number',
              description: 'Longitude in decimal degrees (e.g. -122.0842499)',
            },
            language: {
              type: 'string',
              description: 'Language for result labels (e.g. en-US — default: en-US)',
            },
            return_speed_limit: {
              type: 'boolean',
              description: 'Include speed limit information for the road nearest the coordinates (default: false)',
            },
          },
          required: ['lat', 'lon'],
        },
      },
      {
        name: 'search_poi',
        description: 'Search for points of interest (restaurants, gas stations, hotels, etc.) near a location by keyword or category',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term (e.g. "coffee shop", "hospital", "EV charging")',
            },
            lat: {
              type: 'number',
              description: 'Center latitude for proximity search (decimal degrees)',
            },
            lon: {
              type: 'number',
              description: 'Center longitude for proximity search (decimal degrees)',
            },
            radius: {
              type: 'number',
              description: 'Search radius in meters (default: 5000, max: 50000)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 10, max: 100)',
            },
            country_set: {
              type: 'string',
              description: 'Comma-separated ISO 3166-1 alpha-2 country codes (e.g. "US")',
            },
            language: {
              type: 'string',
              description: 'Result language in IETF format (default: en-US)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'calculate_route',
        description: 'Calculate a driving, walking, cycling, or truck route between two or more waypoints with optional departure time and traffic',
        inputSchema: {
          type: 'object',
          properties: {
            origin: {
              type: 'string',
              description: 'Origin as "lat,lon" (e.g. "40.7128,-74.0060")',
            },
            destination: {
              type: 'string',
              description: 'Destination as "lat,lon"',
            },
            waypoints: {
              type: 'string',
              description: 'Colon-separated intermediate waypoints as "lat,lon:lat,lon" (optional)',
            },
            travel_mode: {
              type: 'string',
              description: 'Travel mode: car, truck, pedestrian, bicycle, bus, van (default: car)',
            },
            depart_at: {
              type: 'string',
              description: 'Departure time in ISO 8601 for traffic-aware routing (e.g. 2026-03-25T09:00:00)',
            },
            avoid: {
              type: 'string',
              description: 'Comma-separated features to avoid: tollRoads, motorways, ferries, unpavedRoads',
            },
            route_type: {
              type: 'string',
              description: 'Optimization: fastest (default), shortest, eco, thrilling',
            },
          },
          required: ['origin', 'destination'],
        },
      },
      {
        name: 'calculate_reachable_range',
        description: 'Calculate the reachable area (isochrone) from a starting point within a given time or distance budget',
        inputSchema: {
          type: 'object',
          properties: {
            origin: {
              type: 'string',
              description: 'Starting point as "lat,lon"',
            },
            time_budget_seconds: {
              type: 'number',
              description: 'Maximum travel time in seconds (use this OR distance_budget_meters)',
            },
            distance_budget_meters: {
              type: 'number',
              description: 'Maximum travel distance in meters (use this OR time_budget_seconds)',
            },
            travel_mode: {
              type: 'string',
              description: 'Travel mode: car, pedestrian, bicycle (default: car)',
            },
          },
          required: ['origin'],
        },
      },
      {
        name: 'get_traffic_incidents',
        description: 'Get live traffic incidents (accidents, road closures, construction) in a bounding box area',
        inputSchema: {
          type: 'object',
          properties: {
            bounding_box: {
              type: 'string',
              description: 'Area as "minLon,minLat,maxLon,maxLat" (e.g. "-74.1,40.6,-73.9,40.8")',
            },
            language: {
              type: 'string',
              description: 'Language for incident descriptions (default: en-US)',
            },
            category_filter: {
              type: 'string',
              description: 'Comma-separated incident category numbers to filter (0=Unknown, 1=Accident, 2=Fog, 4=Dangerous Conditions, 8=Rain, 16=Ice, 32=Jam, 64=Lane Closed, 128=Road Closed, 256=Road Works)',
            },
          },
          required: ['bounding_box'],
        },
      },
      {
        name: 'get_traffic_flow',
        description: 'Get current traffic flow speed and free-flow speed for a specific road segment or location',
        inputSchema: {
          type: 'object',
          properties: {
            lat: {
              type: 'number',
              description: 'Latitude of the road segment (decimal degrees)',
            },
            lon: {
              type: 'number',
              description: 'Longitude of the road segment (decimal degrees)',
            },
          },
          required: ['lat', 'lon'],
        },
      },
      {
        name: 'batch_geocode',
        description: 'Geocode multiple addresses in a single request, returning coordinates for each input address',
        inputSchema: {
          type: 'object',
          properties: {
            addresses: {
              type: 'string',
              description: 'JSON array string of address strings to geocode (e.g. ["123 Main St, New York", "456 Oak Ave, Chicago"])',
            },
            language: {
              type: 'string',
              description: 'Result language in IETF format (default: en-US)',
            },
          },
          required: ['addresses'],
        },
      },
      {
        name: 'search_along_route',
        description: 'Search for points of interest (fuel, food, charging) along a planned route within a detour distance',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'POI search term (e.g. "gas station", "EV charging station", "restaurant")',
            },
            route_points: {
              type: 'string',
              description: 'JSON array of "lat,lon" strings representing the route polyline',
            },
            max_detour_seconds: {
              type: 'number',
              description: 'Maximum acceptable detour time in seconds (default: 300)',
            },
            limit: {
              type: 'number',
              description: 'Maximum POIs to return (default: 10)',
            },
          },
          required: ['query', 'route_points'],
        },
      },
      {
        name: 'get_map_tile_url',
        description: 'Build a TomTom raster or vector map tile URL for a given zoom level and tile coordinates for display in a map viewer',
        inputSchema: {
          type: 'object',
          properties: {
            tile_type: {
              type: 'string',
              description: 'Tile type: basic (road map), hybrid (satellite + roads), labels, night (default: basic)',
            },
            zoom: {
              type: 'number',
              description: 'Zoom level 0–22 (default: 12)',
            },
            x: {
              type: 'number',
              description: 'Tile X coordinate',
            },
            y: {
              type: 'number',
              description: 'Tile Y coordinate',
            },
            format: {
              type: 'string',
              description: 'Tile format: png, pbf (vector) (default: png)',
            },
          },
          required: ['zoom', 'x', 'y'],
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
        case 'search_poi':
          return this.searchPoi(args);
        case 'calculate_route':
          return this.calculateRoute(args);
        case 'calculate_reachable_range':
          return this.calculateReachableRange(args);
        case 'get_traffic_incidents':
          return this.getTrafficIncidents(args);
        case 'get_traffic_flow':
          return this.getTrafficFlow(args);
        case 'batch_geocode':
          return this.batchGeocode(args);
        case 'search_along_route':
          return this.searchAlongRoute(args);
        case 'get_map_tile_url':
          return this.getMapTileUrl(args);
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

  private async ttGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    params.key = this.apiKey;
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

  private async ttPost(path: string, body: unknown, params: Record<string, string> = {}): Promise<ToolResult> {
    params.key = this.apiKey;
    const qs = new URLSearchParams(params).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, {
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

  private async geocode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 5) };
    if (args.country_set) params.countrySet = args.country_set as string;
    if (args.language) params.language = args.language as string;
    return this.ttGet(`/search/2/geocode/${encodeURIComponent(args.query as string)}.json`, params);
  }

  private async reverseGeocode(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined || args.lon === undefined) return { content: [{ type: 'text', text: 'lat and lon are required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.language) params.language = args.language as string;
    if (typeof args.return_speed_limit === 'boolean') params.returnSpeedLimit = String(args.return_speed_limit);
    return this.ttGet(`/search/2/reverseGeocode/${encodeURIComponent(args.lat as string)},${encodeURIComponent(args.lon as string)}.json`, params);
  }

  private async searchPoi(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = { limit: String((args.limit as number) ?? 10) };
    if (args.lat !== undefined && args.lon !== undefined) {
      params.lat = String(args.lat);
      params.lon = String(args.lon);
    }
    if (args.radius) params.radius = String(args.radius);
    if (args.country_set) params.countrySet = args.country_set as string;
    if (args.language) params.language = args.language as string;
    return this.ttGet(`/search/2/poiSearch/${encodeURIComponent(args.query as string)}.json`, params);
  }

  private async calculateRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin || !args.destination) return { content: [{ type: 'text', text: 'origin and destination are required' }], isError: true };
    let routePoints = `${encodeURIComponent(args.origin as string)}:${encodeURIComponent(args.destination as string)}`;
    if (args.waypoints) routePoints = `${encodeURIComponent(args.origin as string)}:${encodeURIComponent(args.waypoints as string)}:${encodeURIComponent(args.destination as string)}`;
    const params: Record<string, string> = {
      travelMode: (args.travel_mode as string) ?? 'car',
      routeType: (args.route_type as string) ?? 'fastest',
    };
    if (args.depart_at) params.departAt = args.depart_at as string;
    if (args.avoid) params.avoid = args.avoid as string;
    return this.ttGet(`/routing/1/calculateRoute/${encodeURIComponent(routePoints)}/json`, params);
  }

  private async calculateReachableRange(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin) return { content: [{ type: 'text', text: 'origin is required' }], isError: true };
    const params: Record<string, string> = {
      travelMode: (args.travel_mode as string) ?? 'car',
    };
    if (args.time_budget_seconds) params.timeBudgetInSec = String(args.time_budget_seconds);
    if (args.distance_budget_meters) params.distanceBudgetInMeters = String(args.distance_budget_meters);
    return this.ttGet(`/routing/1/calculateReachableRange/${encodeURIComponent(args.origin as string)}/json`, params);
  }

  private async getTrafficIncidents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bounding_box) return { content: [{ type: 'text', text: 'bounding_box is required' }], isError: true };
    const params: Record<string, string> = {
      bbox: args.bounding_box as string,
    };
    if (args.language) params.language = args.language as string;
    if (args.category_filter) params.categoryFilter = args.category_filter as string;
    return this.ttGet('/traffic/services/5/incidentDetails', params);
  }

  private async getTrafficFlow(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined || args.lon === undefined) return { content: [{ type: 'text', text: 'lat and lon are required' }], isError: true };
    return this.ttGet(`/traffic/services/4/flowSegmentData/absolute/10/json`, {
      point: `${encodeURIComponent(args.lat as string)},${encodeURIComponent(args.lon as string)}`,
    });
  }

  private async batchGeocode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.addresses) return { content: [{ type: 'text', text: 'addresses is required' }], isError: true };
    let addresses: string[];
    try { addresses = JSON.parse(args.addresses as string); } catch { return { content: [{ type: 'text', text: 'addresses must be a valid JSON array string' }], isError: true }; }
    const batchItems = addresses.map(addr => ({ query: `/geocode/${encodeURIComponent(addr)}.json` }));
    const params: Record<string, string> = {};
    if (args.language) params.language = args.language as string;
    return this.ttPost('/search/2/batch/sync.json', { batchItems }, params);
  }

  private async searchAlongRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query || !args.route_points) return { content: [{ type: 'text', text: 'query and route_points are required' }], isError: true };
    let route: string[];
    try { route = JSON.parse(args.route_points as string); } catch { return { content: [{ type: 'text', text: 'route_points must be a valid JSON array string' }], isError: true }; }
    const routeCoordinates = route.map(pt => {
      const [lat, lon] = pt.split(',');
      return { lat: parseFloat(lat), lon: parseFloat(lon) };
    });
    const body = {
      route: { points: routeCoordinates },
    };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 10),
      maxDetourTime: String((args.max_detour_seconds as number) ?? 300),
    };
    return this.ttPost(`/search/2/searchAlongRoute/${encodeURIComponent(args.query as string)}.json`, body, params);
  }

  private getMapTileUrl(args: Record<string, unknown>): ToolResult {
    const tileType = (args.tile_type as string) ?? 'basic';
    const zoom = (args.zoom as number) ?? 12;
    const x = args.x as number;
    const y = args.y as number;
    const format = (args.format as string) ?? 'png';
    if (x === undefined || y === undefined) return { content: [{ type: 'text', text: 'zoom, x, and y are required' }], isError: true };
    const url = `${this.baseUrl}/map/1/tile/${tileType}/main/${zoom}/${x}/${y}.${format}?key=${this.apiKey}`;
    return { content: [{ type: 'text', text: JSON.stringify({ tile_url: url }) }], isError: false };
  }
}
