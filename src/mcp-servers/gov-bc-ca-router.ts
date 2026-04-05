/**
 * BC Route Planner (gov.bc.ca/router) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. The BC Route Planner has not published an official MCP server.
//
// Base URL: https://router.api.gov.bc.ca
// Auth: API key — apikey query parameter or header
//   Register at: https://catalogue.data.gov.bc.ca/dataset/bc-route-planner
//   Sandbox: routertst.api.gov.bc.ca (no auth required for testing)
// Docs: https://www2.gov.bc.ca/gov/content?id=9D99E684CCD042CD88FADC51E079B4B5
// Rate limits: Not publicly documented. DataBC enforces per-key limits server-side.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GovBcCaRouterConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class GovBcCaRouterMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: GovBcCaRouterConfig) {
    super();
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || 'https://router.api.gov.bc.ca';
  }

  static catalog() {
    return {
      name: 'gov-bc-ca-router',
      displayName: 'BC Route Planner',
      version: '1.0.0',
      category: 'government' as const,
      keywords: [
        'bc', 'british columbia', 'canada', 'route', 'routing', 'directions',
        'distance', 'travel time', 'road', 'navigation', 'geocoding', 'government',
        'databc', 'commercial vehicle', 'truck route', 'optimal route', 'waypoint',
      ],
      toolNames: [
        'get_route',
        'get_directions',
        'get_distance',
        'get_distance_between_pairs',
        'get_optimal_route',
        'get_optimal_directions',
        'get_truck_route',
        'get_truck_directions',
        'get_truck_distance',
        'get_truck_distance_between_pairs',
        'get_truck_optimal_route',
        'get_truck_optimal_directions',
      ],
      description: 'Plan routes on British Columbia\'s public road network: get directions, distances, travel times, and optimal multi-stop routes for standard and commercial vehicles via the BC Route Planner REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Standard vehicle routes ───────────────────────────────────────────
      {
        name: 'get_route',
        description: 'Get the path and travel time between a series of geographic points on BC\'s road network',
        inputSchema: {
          type: 'object',
          properties: {
            points: { type: 'string', description: 'Comma-separated list of lon,lat coordinate pairs separated by colon. E.g. "-123.36962,48.40892:-123.355745,48.426206"' },
            criteria: { type: 'string', description: 'Routing criteria: "fastest" (default) or "shortest"' },
            distanceUnit: { type: 'string', description: 'Distance unit: "km" (default) or "mi"' },
            outputSRS: { type: 'number', description: 'Output spatial reference system EPSG code (default: 4326)' },
            roundTrip: { type: 'boolean', description: 'Whether to return to the start point (default: false)' },
            departure: { type: 'string', description: 'Departure date/time for time-dependent routing (ISO 8601)' },
            correctSide: { type: 'boolean', description: 'Correct to the right side of the road at start/end (default: false)' },
            disable: { type: 'string', description: 'Comma-separated list of routing features to disable (e.g. "tf,sc,tc")' },
            routeDescription: { type: 'string', description: 'Optional description for the route' },
          },
          required: ['points'],
        },
      },
      {
        name: 'get_directions',
        description: 'Get turn-by-turn directions, path, distance and travel time between a series of geographic points on BC\'s road network',
        inputSchema: {
          type: 'object',
          properties: {
            points: { type: 'string', description: 'Comma-separated lon,lat pairs separated by colon. E.g. "-123.36962,48.40892:-123.355745,48.426206"' },
            criteria: { type: 'string', description: 'Routing criteria: "fastest" (default) or "shortest"' },
            distanceUnit: { type: 'string', description: 'Distance unit: "km" (default) or "mi"' },
            outputSRS: { type: 'number', description: 'Output spatial reference system EPSG code (default: 4326)' },
            roundTrip: { type: 'boolean', description: 'Whether to return to the start point (default: false)' },
            departure: { type: 'string', description: 'Departure date/time for time-dependent routing (ISO 8601)' },
            correctSide: { type: 'boolean', description: 'Correct to the right side of the road at start/end (default: false)' },
            disable: { type: 'string', description: 'Comma-separated routing features to disable' },
            routeDescription: { type: 'string', description: 'Optional description for the route' },
          },
          required: ['points'],
        },
      },
      {
        name: 'get_distance',
        description: 'Get the distance and travel time between two geographic points on BC\'s road network',
        inputSchema: {
          type: 'object',
          properties: {
            points: { type: 'string', description: 'Exactly two lon,lat pairs separated by colon. E.g. "-123.36962,48.40892:-123.355745,48.426206"' },
            criteria: { type: 'string', description: 'Routing criteria: "fastest" (default) or "shortest"' },
            distanceUnit: { type: 'string', description: 'Distance unit: "km" (default) or "mi"' },
            outputSRS: { type: 'number', description: 'Output spatial reference system EPSG code (default: 4326)' },
            roundTrip: { type: 'boolean', description: 'Whether to return to the start point (default: false)' },
            departure: { type: 'string', description: 'Departure date/time for time-dependent routing (ISO 8601)' },
            correctSide: { type: 'boolean', description: 'Correct to the right side of the road at start/end' },
            disable: { type: 'string', description: 'Comma-separated routing features to disable' },
            routeDescription: { type: 'string', description: 'Optional description for the route' },
          },
          required: ['points'],
        },
      },
      {
        name: 'get_distance_between_pairs',
        description: 'Get distance and travel time between each pair of from/to geographic points on BC\'s road network (matrix distance)',
        inputSchema: {
          type: 'object',
          properties: {
            fromPoints: { type: 'string', description: 'Comma-separated lon,lat pairs for origin points, separated by colon' },
            toPoints: { type: 'string', description: 'Comma-separated lon,lat pairs for destination points, separated by colon' },
            criteria: { type: 'string', description: 'Routing criteria: "fastest" (default) or "shortest"' },
            distanceUnit: { type: 'string', description: 'Distance unit: "km" (default) or "mi"' },
            outputSRS: { type: 'number', description: 'Output spatial reference system EPSG code (default: 4326)' },
            departure: { type: 'string', description: 'Departure date/time for time-dependent routing (ISO 8601)' },
            maxPairs: { type: 'number', description: 'Maximum number of origin-destination pairs to return' },
            disable: { type: 'string', description: 'Comma-separated routing features to disable' },
          },
          required: ['fromPoints', 'toPoints'],
        },
      },
      {
        name: 'get_optimal_route',
        description: 'Get the optimal path, distance and travel time between a start point and multiple end points, reordered to minimize total distance or time on BC\'s road network',
        inputSchema: {
          type: 'object',
          properties: {
            points: { type: 'string', description: 'Start point and stop points as lon,lat pairs separated by colon. First point is the start.' },
            criteria: { type: 'string', description: 'Optimization criteria: "fastest" (default) or "shortest"' },
            distanceUnit: { type: 'string', description: 'Distance unit: "km" (default) or "mi"' },
            outputSRS: { type: 'number', description: 'Output spatial reference system EPSG code (default: 4326)' },
            roundTrip: { type: 'boolean', description: 'Whether to return to the start point (default: false)' },
            departure: { type: 'string', description: 'Departure date/time for time-dependent routing (ISO 8601)' },
            disable: { type: 'string', description: 'Comma-separated routing features to disable' },
            routeDescription: { type: 'string', description: 'Optional description for the route' },
          },
          required: ['points'],
        },
      },
      {
        name: 'get_optimal_directions',
        description: 'Get turn-by-turn directions for the optimal reordered path between a start point and multiple stops on BC\'s road network',
        inputSchema: {
          type: 'object',
          properties: {
            points: { type: 'string', description: 'Start point and stop points as lon,lat pairs separated by colon. First point is the start.' },
            criteria: { type: 'string', description: 'Optimization criteria: "fastest" (default) or "shortest"' },
            distanceUnit: { type: 'string', description: 'Distance unit: "km" (default) or "mi"' },
            outputSRS: { type: 'number', description: 'Output spatial reference system EPSG code (default: 4326)' },
            roundTrip: { type: 'boolean', description: 'Whether to return to the start point (default: false)' },
            departure: { type: 'string', description: 'Departure date/time for time-dependent routing (ISO 8601)' },
            disable: { type: 'string', description: 'Comma-separated routing features to disable' },
            routeDescription: { type: 'string', description: 'Optional description for the route' },
          },
          required: ['points'],
        },
      },
      // ── Commercial vehicle (truck) routes ─────────────────────────────────
      {
        name: 'get_truck_route',
        description: 'Get the path and travel time between geographic points for a commercial vehicle on BC\'s road network, respecting truck restrictions',
        inputSchema: {
          type: 'object',
          properties: {
            points: { type: 'string', description: 'Comma-separated lon,lat pairs separated by colon' },
            criteria: { type: 'string', description: 'Routing criteria: "fastest" (default) or "shortest"' },
            distanceUnit: { type: 'string', description: 'Distance unit: "km" (default) or "mi"' },
            outputSRS: { type: 'number', description: 'Output spatial reference system EPSG code (default: 4326)' },
            roundTrip: { type: 'boolean', description: 'Whether to return to the start point (default: false)' },
            truckRouteMultiplier: { type: 'number', description: 'Weight multiplier for truck-designated roads (default: 1.0)' },
            partition: { type: 'string', description: 'Routing partition/dataset to use for truck routing' },
            disable: { type: 'string', description: 'Comma-separated routing features to disable' },
            routeDescription: { type: 'string', description: 'Optional description for the route' },
          },
          required: ['points'],
        },
      },
      {
        name: 'get_truck_directions',
        description: 'Get turn-by-turn directions for a commercial vehicle between geographic points on BC\'s road network',
        inputSchema: {
          type: 'object',
          properties: {
            points: { type: 'string', description: 'Comma-separated lon,lat pairs separated by colon' },
            criteria: { type: 'string', description: 'Routing criteria: "fastest" (default) or "shortest"' },
            distanceUnit: { type: 'string', description: 'Distance unit: "km" (default) or "mi"' },
            outputSRS: { type: 'number', description: 'Output spatial reference system EPSG code (default: 4326)' },
            roundTrip: { type: 'boolean', description: 'Whether to return to the start point (default: false)' },
            truckRouteMultiplier: { type: 'number', description: 'Weight multiplier for truck-designated roads' },
            partition: { type: 'string', description: 'Routing partition/dataset to use' },
            disable: { type: 'string', description: 'Comma-separated routing features to disable' },
            routeDescription: { type: 'string', description: 'Optional description for the route' },
          },
          required: ['points'],
        },
      },
      {
        name: 'get_truck_distance',
        description: 'Get distance and travel time between two geographic points for a commercial vehicle on BC\'s road network',
        inputSchema: {
          type: 'object',
          properties: {
            points: { type: 'string', description: 'Exactly two lon,lat pairs separated by colon' },
            criteria: { type: 'string', description: 'Routing criteria: "fastest" (default) or "shortest"' },
            distanceUnit: { type: 'string', description: 'Distance unit: "km" (default) or "mi"' },
            outputSRS: { type: 'number', description: 'Output spatial reference system EPSG code (default: 4326)' },
            roundTrip: { type: 'boolean', description: 'Whether to return to the start point (default: false)' },
            truckRouteMultiplier: { type: 'number', description: 'Weight multiplier for truck-designated roads' },
            disable: { type: 'string', description: 'Comma-separated routing features to disable' },
            routeDescription: { type: 'string', description: 'Optional description for the route' },
          },
          required: ['points'],
        },
      },
      {
        name: 'get_truck_distance_between_pairs',
        description: 'Get distance and travel time between each pair of from/to geographic points for a commercial vehicle on BC\'s road network',
        inputSchema: {
          type: 'object',
          properties: {
            fromPoints: { type: 'string', description: 'Origin lon,lat pairs separated by colon' },
            toPoints: { type: 'string', description: 'Destination lon,lat pairs separated by colon' },
            criteria: { type: 'string', description: 'Routing criteria: "fastest" (default) or "shortest"' },
            distanceUnit: { type: 'string', description: 'Distance unit: "km" (default) or "mi"' },
            outputSRS: { type: 'number', description: 'Output spatial reference system EPSG code (default: 4326)' },
            departure: { type: 'string', description: 'Departure date/time for time-dependent routing (ISO 8601)' },
            maxPairs: { type: 'number', description: 'Maximum number of origin-destination pairs to return' },
            disable: { type: 'string', description: 'Comma-separated routing features to disable' },
          },
          required: ['fromPoints', 'toPoints'],
        },
      },
      {
        name: 'get_truck_optimal_route',
        description: 'Get the optimal reordered path for a commercial vehicle between a start point and multiple stops on BC\'s road network',
        inputSchema: {
          type: 'object',
          properties: {
            points: { type: 'string', description: 'Start and stop points as lon,lat pairs separated by colon. First point is the start.' },
            criteria: { type: 'string', description: 'Optimization criteria: "fastest" (default) or "shortest"' },
            distanceUnit: { type: 'string', description: 'Distance unit: "km" (default) or "mi"' },
            outputSRS: { type: 'number', description: 'Output spatial reference system EPSG code (default: 4326)' },
            roundTrip: { type: 'boolean', description: 'Whether to return to the start point (default: false)' },
            truckRouteMultiplier: { type: 'number', description: 'Weight multiplier for truck-designated roads' },
            partition: { type: 'string', description: 'Routing partition/dataset to use' },
            disable: { type: 'string', description: 'Comma-separated routing features to disable' },
            routeDescription: { type: 'string', description: 'Optional description for the route' },
          },
          required: ['points'],
        },
      },
      {
        name: 'get_truck_optimal_directions',
        description: 'Get turn-by-turn directions for a commercial vehicle on the optimal reordered path between a start point and multiple stops on BC\'s road network',
        inputSchema: {
          type: 'object',
          properties: {
            points: { type: 'string', description: 'Start and stop points as lon,lat pairs separated by colon. First point is the start.' },
            criteria: { type: 'string', description: 'Optimization criteria: "fastest" (default) or "shortest"' },
            distanceUnit: { type: 'string', description: 'Distance unit: "km" (default) or "mi"' },
            outputSRS: { type: 'number', description: 'Output spatial reference system EPSG code (default: 4326)' },
            roundTrip: { type: 'boolean', description: 'Whether to return to the start point (default: false)' },
            truckRouteMultiplier: { type: 'number', description: 'Weight multiplier for truck-designated roads' },
            partition: { type: 'string', description: 'Routing partition/dataset to use' },
            disable: { type: 'string', description: 'Comma-separated routing features to disable' },
            routeDescription: { type: 'string', description: 'Optional description for the route' },
          },
          required: ['points'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_route':                      return await this.routerRequest('/route.json', args, false);
        case 'get_directions':                 return await this.routerRequest('/directions.json', args, false);
        case 'get_distance':                   return await this.routerRequest('/distance.json', args, false);
        case 'get_distance_between_pairs':     return await this.routerRequest('/distance/betweenPairs.json', args, false, true);
        case 'get_optimal_route':              return await this.routerRequest('/optimalRoute.json', args, false);
        case 'get_optimal_directions':         return await this.routerRequest('/optimalDirections.json', args, false);
        case 'get_truck_route':                return await this.routerRequest('/truck/route.json', args, true);
        case 'get_truck_directions':           return await this.routerRequest('/truck/directions.json', args, true);
        case 'get_truck_distance':             return await this.routerRequest('/truck/distance.json', args, true);
        case 'get_truck_distance_between_pairs': return await this.routerRequest('/truck/distance/betweenPairs.json', args, true, true);
        case 'get_truck_optimal_route':        return await this.routerRequest('/truck/optimalRoute.json', args, true);
        case 'get_truck_optimal_directions':   return await this.routerRequest('/truck/optimalDirections.json', args, true);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildParams(args: Record<string, unknown>, isTruck: boolean, isPairs: boolean): URLSearchParams {
    const params = new URLSearchParams();
    if (this.apiKey) params.set('apikey', this.apiKey);
    if (isPairs) {
      if (args.fromPoints)  params.set('fromPoints', args.fromPoints as string);
      if (args.toPoints)    params.set('toPoints', args.toPoints as string);
      if (args.maxPairs)    params.set('maxPairs', String(args.maxPairs));
    } else {
      if (args.points)      params.set('points', args.points as string);
      if (args.roundTrip !== undefined) params.set('roundTrip', String(args.roundTrip));
    }
    if (args.criteria)     params.set('criteria', args.criteria as string);
    if (args.distanceUnit) params.set('distanceUnit', args.distanceUnit as string);
    if (args.outputSRS)    params.set('outputSRS', String(args.outputSRS));
    if (args.departure)    params.set('departure', args.departure as string);
    if (args.correctSide !== undefined) params.set('correctSide', String(args.correctSide));
    if (args.disable)      params.set('disable', args.disable as string);
    if (args.routeDescription) params.set('routeDescription', args.routeDescription as string);
    if (isTruck) {
      if (args.truckRouteMultiplier) params.set('truckRouteMultiplier', String(args.truckRouteMultiplier));
      if (args.partition)            params.set('partition', args.partition as string);
    }
    return params;
  }

  private async routerRequest(path: string, args: Record<string, unknown>, isTruck: boolean, isPairs = false): Promise<ToolResult> {
    const params = this.buildParams(args, isTruck, isPairs);
    const url = `${this.baseUrl}${path}?${params.toString()}`;
    const response = await this.fetchWithRetry(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `BC Route Planner API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `BC Route Planner returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }
}
