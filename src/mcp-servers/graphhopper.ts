/**
 * GraphHopper Directions API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://graphhopper.com/api/1
// Auth: API key passed as query param ?key=<apiKey>
// Docs: https://docs.graphhopper.com/
// Endpoints: Routing, Matrix, Geocoding, Isochrone, Map Matching, Route Optimization, Cluster

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GraphHopperConfig {
  apiKey: string;
  baseUrl?: string; // default: https://graphhopper.com/api/1
}

export class GraphHopperMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: GraphHopperConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://graphhopper.com/api/1';
  }

  static catalog() {
    return {
      name: 'graphhopper',
      displayName: 'GraphHopper Directions API',
      version: '1.0.0',
      category: 'travel',
      keywords: [
        'graphhopper', 'routing', 'directions', 'navigation', 'geocoding',
        'isochrone', 'matrix', 'map matching', 'route optimization', 'vrp',
        'vehicle routing', 'cluster', 'travel', 'distance', 'gps', 'turn-by-turn',
        'snap to road', 'logistics', 'delivery', 'openstreetmap',
      ],
      toolNames: [
        'get_route',
        'post_route',
        'get_matrix',
        'post_matrix',
        'get_geocode',
        'get_isochrone',
        'post_map_match',
        'solve_vrp',
        'solve_cluster',
        'get_route_info',
      ],
      description: 'GraphHopper Directions API: route planning, turn-by-turn navigation, geocoding, isochrones, distance matrices, map matching, and vehicle routing optimization.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_route',
        description: 'Calculate a route between two or more points. Returns distance, duration, turn-by-turn instructions, and geometry.',
        inputSchema: {
          type: 'object',
          properties: {
            point: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of "lat,lng" strings for waypoints (minimum 2, e.g. ["48.8566,2.3522","51.5074,-0.1278"])',
            },
            vehicle: {
              type: 'string',
              description: 'Vehicle profile: car, bike, foot, hike, mtb, racingbike, scooter, truck, small_truck (default: car)',
            },
            locale: {
              type: 'string',
              description: 'Language for turn instructions (e.g. en, de, fr — default: en)',
            },
            instructions: {
              type: 'boolean',
              description: 'Include turn-by-turn instructions (default: true)',
            },
            calc_points: {
              type: 'boolean',
              description: 'Include route geometry points (default: true)',
            },
            points_encoded: {
              type: 'boolean',
              description: 'Return geometry as encoded polyline (default: true)',
            },
            elevation: {
              type: 'boolean',
              description: 'Include elevation data in route geometry (default: false)',
            },
            optimize: {
              type: 'boolean',
              description: 'Optimize waypoint order (default: false)',
            },
            weighting: {
              type: 'string',
              description: 'Routing weighting: fastest, shortest, short_fastest (default: fastest)',
            },
          },
          required: ['point'],
        },
      },
      {
        name: 'post_route',
        description: 'Calculate a route using POST body — supports flexible/custom routing parameters including turn costs and custom models.',
        inputSchema: {
          type: 'object',
          properties: {
            points: {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'number' },
              },
              description: 'Array of [longitude, latitude] coordinate pairs (e.g. [[2.3522,48.8566],[-0.1278,51.5074]])',
            },
            vehicle: {
              type: 'string',
              description: 'Vehicle profile: car, bike, foot, hike, mtb, racingbike, scooter, truck, small_truck (default: car)',
            },
            locale: {
              type: 'string',
              description: 'Language for turn instructions (default: en)',
            },
            instructions: {
              type: 'boolean',
              description: 'Include turn-by-turn instructions (default: true)',
            },
            calc_points: {
              type: 'boolean',
              description: 'Include geometry points (default: true)',
            },
            elevation: {
              type: 'boolean',
              description: 'Include 3D elevation data (default: false)',
            },
            ch: {
              type: 'object',
              description: 'Contraction Hierarchies settings — set {"disable":true} to enable flexible routing features',
            },
            weighting: {
              type: 'string',
              description: 'Routing weighting: fastest, shortest, short_fastest (default: fastest)',
            },
          },
          required: ['points'],
        },
      },
      {
        name: 'get_matrix',
        description: 'Calculate a distance/time matrix between many origins and destinations. Returns all-pairs travel times and distances.',
        inputSchema: {
          type: 'object',
          properties: {
            point: {
              type: 'array',
              items: { type: 'string' },
              description: 'Symmetric matrix: array of "lat,lng" points used as both origins and destinations',
            },
            from_point: {
              type: 'array',
              items: { type: 'string' },
              description: 'Asymmetric matrix: array of "lat,lng" origin points',
            },
            to_point: {
              type: 'array',
              items: { type: 'string' },
              description: 'Asymmetric matrix: array of "lat,lng" destination points',
            },
            vehicle: {
              type: 'string',
              description: 'Vehicle profile (default: car)',
            },
            out_array: {
              type: 'array',
              items: { type: 'string' },
              description: 'What to return: times, distances, weights (default: times)',
            },
          },
          required: [],
        },
      },
      {
        name: 'post_matrix',
        description: 'Calculate a distance/time matrix via POST — supports larger matrices and more configuration options.',
        inputSchema: {
          type: 'object',
          properties: {
            from_points: {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'number' },
              },
              description: 'Origin coordinates as [longitude, latitude] pairs',
            },
            to_points: {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'number' },
              },
              description: 'Destination coordinates as [longitude, latitude] pairs',
            },
            vehicle: {
              type: 'string',
              description: 'Vehicle profile (default: car)',
            },
            out_arrays: {
              type: 'array',
              items: { type: 'string' },
              description: 'Which matrices to return: times, distances, weights',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_geocode',
        description: 'Forward geocoding: convert an address or place name to coordinates. Also supports reverse geocoding from lat/lng.',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Address or place name to geocode (e.g. "Berlin, Germany" or "1600 Pennsylvania Ave")',
            },
            reverse: {
              type: 'boolean',
              description: 'Set to true for reverse geocoding (converts coordinates to address). Requires point param.',
            },
            point: {
              type: 'string',
              description: 'Reference "lat,lng" to bias results or for reverse geocoding',
            },
            locale: {
              type: 'string',
              description: 'Preferred language for results (e.g. en, de, fr)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            provider: {
              type: 'string',
              description: 'Geocoding provider: default, nominatim, opencagedata',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_isochrone',
        description: 'Calculate an isochrone (reachability area) around a point — returns a polygon showing all areas reachable within a given time or distance.',
        inputSchema: {
          type: 'object',
          properties: {
            point: {
              type: 'string',
              description: 'Center point as "lat,lng" (e.g. "48.8566,2.3522")',
            },
            time_limit: {
              type: 'number',
              description: 'Maximum travel time in seconds (e.g. 600 for 10 minutes)',
            },
            distance_limit: {
              type: 'number',
              description: 'Maximum travel distance in meters (alternative to time_limit)',
            },
            vehicle: {
              type: 'string',
              description: 'Vehicle profile: car, bike, foot, etc. (default: car)',
            },
            buckets: {
              type: 'number',
              description: 'Number of concentric isochrone rings to return (default: 1, max: 20)',
            },
            reverse_flow: {
              type: 'boolean',
              description: 'Calculate which points can reach center (arrival isochrone), vs points reachable from center (default: false)',
            },
          },
          required: ['point'],
        },
      },
      {
        name: 'post_map_match',
        description: 'Snap a GPS track to the road network (map matching). Converts raw GPS coordinates to actual road path.',
        inputSchema: {
          type: 'object',
          properties: {
            points: {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'number' },
              },
              description: 'GPS track points as [longitude, latitude] arrays (minimum 2)',
            },
            vehicle: {
              type: 'string',
              description: 'Vehicle profile to match road type (default: car)',
            },
            gps_accuracy: {
              type: 'number',
              description: 'GPS accuracy in meters — affects snapping tolerance (default: 40)',
            },
          },
          required: ['points'],
        },
      },
      {
        name: 'solve_vrp',
        description: 'Solve a Vehicle Routing Problem (VRP) — optimize routes for a fleet of vehicles visiting multiple locations with constraints.',
        inputSchema: {
          type: 'object',
          properties: {
            vehicles: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of vehicle objects with id, start_address, type_id, and optional end_address',
            },
            vehicle_types: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of vehicle type objects with type_id, profile (car, bike, foot, truck), and capacity',
            },
            services: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of service/stop objects with id, address (lat/lng), duration, and optional time_windows',
            },
            shipments: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of shipment objects with id, pickup and delivery addresses',
            },
            objectives: {
              type: 'array',
              items: { type: 'object' },
              description: 'Optimization objectives (e.g. minimize transport_time or completion_time)',
            },
          },
          required: ['vehicles'],
        },
      },
      {
        name: 'solve_cluster',
        description: 'Solve a clustering problem — group a set of customer locations into a specified number of clusters, minimizing total distance.',
        inputSchema: {
          type: 'object',
          properties: {
            num_clusters: {
              type: 'number',
              description: 'Number of clusters (groups) to create',
            },
            customers: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of customer objects with id and address (lat/lng)',
            },
            vehicles: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of vehicle/territory objects with capacity constraints',
            },
          },
          required: ['num_clusters', 'customers'],
        },
      },
      {
        name: 'get_route_info',
        description: 'Get GraphHopper routing coverage information — returns supported vehicle profiles and capabilities for the current API key.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_route':       return this.getRoute(args);
        case 'post_route':      return this.postRoute(args);
        case 'get_matrix':      return this.getMatrix(args);
        case 'post_matrix':     return this.postMatrix(args);
        case 'get_geocode':     return this.getGeocode(args);
        case 'get_isochrone':   return this.getIsochrone(args);
        case 'post_map_match':  return this.postMapMatch(args);
        case 'solve_vrp':       return this.solveVRP(args);
        case 'solve_cluster':   return this.solveCluster(args);
        case 'get_route_info':  return this.getRouteInfo();
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

  private async get(path: string, params: Record<string, string | string[]> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    qs.set('key', this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) {
        for (const item of v) qs.append(k, item);
      } else {
        qs.set(k, v);
      }
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?key=${encodeURIComponent(this.apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ─────────────────────────────────────────────────────

  private async getRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.point || !Array.isArray(args.point) || args.point.length < 2) {
      return { content: [{ type: 'text', text: 'point array with at least 2 waypoints is required' }], isError: true };
    }
    const params: Record<string, string | string[]> = {
      point: args.point as string[],
    };
    if (args.vehicle)         params.vehicle          = String(args.vehicle);
    if (args.locale)          params.locale           = String(args.locale);
    if (args.instructions !== undefined) params.instructions = String(args.instructions);
    if (args.calc_points !== undefined)  params.calc_points  = String(args.calc_points);
    if (args.points_encoded !== undefined) params.points_encoded = String(args.points_encoded);
    if (args.elevation !== undefined)    params.elevation    = String(args.elevation);
    if (args.optimize !== undefined)     params.optimize     = String(args.optimize);
    if (args.weighting)       params.weighting        = String(args.weighting);
    return this.get('/route', params);
  }

  private async postRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.points || !Array.isArray(args.points) || args.points.length < 2) {
      return { content: [{ type: 'text', text: 'points array with at least 2 coordinate pairs is required' }], isError: true };
    }
    return this.post('/route', args as Record<string, unknown>);
  }

  private async getMatrix(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | string[]> = {};
    if (args.point)       params.point       = args.point as string[];
    if (args.from_point)  params.from_point  = args.from_point as string[];
    if (args.to_point)    params.to_point    = args.to_point as string[];
    if (args.vehicle)     params.vehicle     = String(args.vehicle);
    if (args.out_array)   params.out_array   = args.out_array as string[];
    return this.get('/matrix', params);
  }

  private async postMatrix(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/matrix', args as Record<string, unknown>);
  }

  private async getGeocode(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.q)        params.q        = String(args.q);
    if (args.reverse !== undefined) params.reverse = String(args.reverse);
    if (args.point)    params.point    = String(args.point);
    if (args.locale)   params.locale   = String(args.locale);
    if (args.limit)    params.limit    = String(args.limit);
    if (args.provider) params.provider = String(args.provider);
    return this.get('/geocode', params);
  }

  private async getIsochrone(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.point) {
      return { content: [{ type: 'text', text: 'point is required (format: "lat,lng")' }], isError: true };
    }
    const params: Record<string, string> = {
      point: String(args.point),
    };
    if (args.time_limit !== undefined)     params.time_limit     = String(args.time_limit);
    if (args.distance_limit !== undefined) params.distance_limit = String(args.distance_limit);
    if (args.vehicle)                      params.vehicle        = String(args.vehicle);
    if (args.buckets !== undefined)        params.buckets        = String(args.buckets);
    if (args.reverse_flow !== undefined)   params.reverse_flow   = String(args.reverse_flow);
    return this.get('/isochrone', params);
  }

  private async postMapMatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.points || !Array.isArray(args.points) || args.points.length < 2) {
      return { content: [{ type: 'text', text: 'points array with at least 2 GPS coordinates is required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      points: args.points,
    };
    if (args.vehicle)      body.vehicle      = args.vehicle;
    if (args.gps_accuracy) body.gps_accuracy = args.gps_accuracy;
    return this.post('/match', body);
  }

  private async solveVRP(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.vehicles || !Array.isArray(args.vehicles) || args.vehicles.length === 0) {
      return { content: [{ type: 'text', text: 'vehicles array is required' }], isError: true };
    }
    return this.post('/vrp', args as Record<string, unknown>);
  }

  private async solveCluster(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.num_clusters || !args.customers) {
      return { content: [{ type: 'text', text: 'num_clusters and customers are required' }], isError: true };
    }
    return this.post('/cluster', args as Record<string, unknown>);
  }

  private async getRouteInfo(): Promise<ToolResult> {
    return this.get('/route/info');
  }
}
