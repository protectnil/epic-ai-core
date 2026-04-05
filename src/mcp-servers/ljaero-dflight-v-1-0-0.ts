/**
 * LJAero DFlight MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// DFlight API by LJAero supplies up-to-date UAV preflight assessment data for the US.
// Covers airspace, weather forecasts, NOTAMs/TFRs, special security areas, restricted
// public venues, surface obstacles, aerodromes, and UAS Operating Areas.
// Geographic queries accept point+distance, GeoJSON Polygon, or GeoJSON LineString route.
//
// Base URL: https://dflight-api.ljaero.com
// Auth: x-api-key header (optional per spec, required for production access)
// Docs: https://ljaero.com/solutions/dflight/
// Rate limits: Not publicly documented; plan-dependent

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LjaeroDflightConfig {
  apiKey: string;
  baseUrl?: string; // default: https://dflight-api.ljaero.com
}

export class LjaeroDflightV100MCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LjaeroDflightConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://dflight-api.ljaero.com';
  }

  static catalog() {
    return {
      name: 'ljaero-dflight-v-1-0-0',
      displayName: 'LJAero DFlight',
      version: '1.0.0',
      category: 'aerospace',
      keywords: [
        'drone', 'uav', 'uas', 'preflight', 'airspace', 'dflight', 'ljaero',
        'notam', 'tfr', 'temporary flight restriction', 'aerodrome', 'airport',
        'obstacle', 'weather', 'forecast', 'security area', 'ssa', 'venue',
        'uoa', 'uas operating area', 'geojson', 'compliance', 'part 107',
        'faa', 'laanc', 'flight planning', 'geofence',
      ],
      toolNames: [
        'query_aerodromes_by_distance',
        'query_aerodromes_by_polygon',
        'query_aerodromes_by_route',
        'query_airspace_by_distance',
        'query_airspace_by_polygon',
        'query_airspace_by_route',
        'query_restrictions_by_distance',
        'query_restrictions_by_polygon',
        'query_restrictions_by_route',
        'query_security_areas_by_distance',
        'query_security_areas_by_polygon',
        'query_security_areas_by_route',
        'query_obstacles_by_distance',
        'query_obstacles_by_polygon',
        'query_obstacles_by_route',
        'query_venues_by_distance',
        'query_venues_by_polygon',
        'query_venues_by_route',
        'query_uoa_by_distance',
        'query_uoa_by_polygon',
        'query_uoa_by_route',
        'query_weather_by_distance',
        'query_weather_by_polygon',
        'query_weather_by_route',
      ],
      description: 'LJAero DFlight UAV preflight assessment API: query US airspace, NOTAMs/TFRs, special security areas, restricted venues, obstacles, aerodromes, UAS Operating Areas, and weather forecasts by point/distance, polygon, or route.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Aerodromes ──────────────────────────────────────────────────────────
      {
        name: 'query_aerodromes_by_distance',
        description: 'Retrieve aerodromes (airports, heliports, etc.) within a given distance of a lat/lon point. Use for UAV preflight checks near a launch location.',
        inputSchema: {
          type: 'object',
          properties: {
            latitude:  { type: 'number', description: 'Latitude of the center point in decimal degrees' },
            longitude: { type: 'number', description: 'Longitude of the center point in decimal degrees' },
            distance:  { type: 'number', description: 'Radius in meters around the point to search' },
          },
          required: ['latitude', 'longitude', 'distance'],
        },
      },
      {
        name: 'query_aerodromes_by_polygon',
        description: 'Retrieve aerodromes located within an arbitrary GeoJSON Polygon area.',
        inputSchema: {
          type: 'object',
          properties: {
            poly: {
              type: 'object',
              description: 'GeoJSON Polygon object defining the area of interest (type: "Polygon", coordinates: array of ring arrays)',
            },
          },
          required: ['poly'],
        },
      },
      {
        name: 'query_aerodromes_by_route',
        description: 'Retrieve aerodromes found along a flight route defined as a GeoJSON LineString.',
        inputSchema: {
          type: 'object',
          properties: {
            route: {
              type: 'object',
              description: 'GeoJSON LineString object defining the route (type: "LineString", coordinates: array of [lon, lat] pairs)',
            },
          },
          required: ['route'],
        },
      },
      // ── Airspace ────────────────────────────────────────────────────────────
      {
        name: 'query_airspace_by_distance',
        description: 'Retrieve airspace classifications within a given distance of a lat/lon point. Filter by airspace types (e.g. MAA, MTR, Class B/C/D/E).',
        inputSchema: {
          type: 'object',
          properties: {
            latitude:  { type: 'number', description: 'Latitude of the center point in decimal degrees' },
            longitude: { type: 'number', description: 'Longitude of the center point in decimal degrees' },
            distance:  { type: 'number', description: 'Radius in meters around the point to search' },
            asptypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Airspace type codes to include (e.g. ["MAA","MTR","ClassB"]). Omit to return all types.',
            },
          },
          required: ['latitude', 'longitude', 'distance'],
        },
      },
      {
        name: 'query_airspace_by_polygon',
        description: 'Retrieve airspace classifications within a GeoJSON Polygon area.',
        inputSchema: {
          type: 'object',
          properties: {
            poly: {
              type: 'object',
              description: 'GeoJSON Polygon object defining the area of interest',
            },
            asptypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Airspace type codes to include. Omit to return all types.',
            },
          },
          required: ['poly'],
        },
      },
      {
        name: 'query_airspace_by_route',
        description: 'Retrieve airspace traversed by a route defined as a GeoJSON LineString.',
        inputSchema: {
          type: 'object',
          properties: {
            route: {
              type: 'object',
              description: 'GeoJSON LineString object defining the route',
            },
            asptypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Airspace type codes to include. Omit to return all types.',
            },
          },
          required: ['route'],
        },
      },
      // ── Flight Restrictions (NOTAMs / TFRs) ─────────────────────────────────
      {
        name: 'query_restrictions_by_distance',
        description: 'Retrieve active Temporary Flight Restrictions (TFRs) and NOTAMs within a given distance of a point.',
        inputSchema: {
          type: 'object',
          properties: {
            latitude:  { type: 'number', description: 'Latitude of the center point in decimal degrees' },
            longitude: { type: 'number', description: 'Longitude of the center point in decimal degrees' },
            distance:  { type: 'number', description: 'Radius in meters around the point to search' },
          },
          required: ['latitude', 'longitude', 'distance'],
        },
      },
      {
        name: 'query_restrictions_by_polygon',
        description: 'Retrieve active TFRs and NOTAMs within a GeoJSON Polygon area.',
        inputSchema: {
          type: 'object',
          properties: {
            poly: {
              type: 'object',
              description: 'GeoJSON Polygon object defining the area of interest',
            },
          },
          required: ['poly'],
        },
      },
      {
        name: 'query_restrictions_by_route',
        description: 'Retrieve active TFRs and NOTAMs applicable along a flight route.',
        inputSchema: {
          type: 'object',
          properties: {
            route: {
              type: 'object',
              description: 'GeoJSON LineString object defining the route',
            },
          },
          required: ['route'],
        },
      },
      // ── Special Security Areas (SSA) ─────────────────────────────────────────
      {
        name: 'query_security_areas_by_distance',
        description: 'Retrieve Special Security Areas (Washington DC ADIZ, national defense areas, etc.) within a given distance of a point.',
        inputSchema: {
          type: 'object',
          properties: {
            latitude:  { type: 'number', description: 'Latitude of the center point in decimal degrees' },
            longitude: { type: 'number', description: 'Longitude of the center point in decimal degrees' },
            distance:  { type: 'number', description: 'Radius in meters around the point to search' },
          },
          required: ['latitude', 'longitude', 'distance'],
        },
      },
      {
        name: 'query_security_areas_by_polygon',
        description: 'Retrieve Special Security Areas within a GeoJSON Polygon area.',
        inputSchema: {
          type: 'object',
          properties: {
            poly: {
              type: 'object',
              description: 'GeoJSON Polygon object defining the area of interest',
            },
          },
          required: ['poly'],
        },
      },
      {
        name: 'query_security_areas_by_route',
        description: 'Retrieve Special Security Areas traversed by a route.',
        inputSchema: {
          type: 'object',
          properties: {
            route: {
              type: 'object',
              description: 'GeoJSON LineString object defining the route',
            },
          },
          required: ['route'],
        },
      },
      // ── Surface Obstacles ────────────────────────────────────────────────────
      {
        name: 'query_obstacles_by_distance',
        description: 'Retrieve surface obstacles (towers, buildings, cranes) within a given distance of a point. Critical for low-altitude UAV operations.',
        inputSchema: {
          type: 'object',
          properties: {
            latitude:  { type: 'number', description: 'Latitude of the center point in decimal degrees' },
            longitude: { type: 'number', description: 'Longitude of the center point in decimal degrees' },
            distance:  { type: 'number', description: 'Radius in meters around the point to search' },
          },
          required: ['latitude', 'longitude', 'distance'],
        },
      },
      {
        name: 'query_obstacles_by_polygon',
        description: 'Retrieve surface obstacles within a GeoJSON Polygon area.',
        inputSchema: {
          type: 'object',
          properties: {
            poly: {
              type: 'object',
              description: 'GeoJSON Polygon object defining the area of interest',
            },
          },
          required: ['poly'],
        },
      },
      {
        name: 'query_obstacles_by_route',
        description: 'Retrieve surface obstacles found along a flight route.',
        inputSchema: {
          type: 'object',
          properties: {
            route: {
              type: 'object',
              description: 'GeoJSON LineString object defining the route',
            },
          },
          required: ['route'],
        },
      },
      // ── Restricted Public Venues ─────────────────────────────────────────────
      {
        name: 'query_venues_by_distance',
        description: 'Retrieve restricted public venues (stadiums, arenas, event spaces with drone flight restrictions) within a given distance of a point.',
        inputSchema: {
          type: 'object',
          properties: {
            latitude:  { type: 'number', description: 'Latitude of the center point in decimal degrees' },
            longitude: { type: 'number', description: 'Longitude of the center point in decimal degrees' },
            distance:  { type: 'number', description: 'Radius in meters around the point to search' },
          },
          required: ['latitude', 'longitude', 'distance'],
        },
      },
      {
        name: 'query_venues_by_polygon',
        description: 'Retrieve restricted public venues within a GeoJSON Polygon area.',
        inputSchema: {
          type: 'object',
          properties: {
            poly: {
              type: 'object',
              description: 'GeoJSON Polygon object defining the area of interest',
            },
          },
          required: ['poly'],
        },
      },
      {
        name: 'query_venues_by_route',
        description: 'Retrieve restricted public venues traversed by a route.',
        inputSchema: {
          type: 'object',
          properties: {
            route: {
              type: 'object',
              description: 'GeoJSON LineString object defining the route',
            },
          },
          required: ['route'],
        },
      },
      // ── UAS Operating Areas (UOA) ────────────────────────────────────────────
      {
        name: 'query_uoa_by_distance',
        description: 'Retrieve UAS Operating Areas (designated drone corridors and approved flight zones) within a given distance of a point.',
        inputSchema: {
          type: 'object',
          properties: {
            latitude:  { type: 'number', description: 'Latitude of the center point in decimal degrees' },
            longitude: { type: 'number', description: 'Longitude of the center point in decimal degrees' },
            distance:  { type: 'number', description: 'Radius in meters around the point to search' },
          },
          required: ['latitude', 'longitude', 'distance'],
        },
      },
      {
        name: 'query_uoa_by_polygon',
        description: 'Retrieve UAS Operating Areas within a GeoJSON Polygon area.',
        inputSchema: {
          type: 'object',
          properties: {
            poly: {
              type: 'object',
              description: 'GeoJSON Polygon object defining the area of interest',
            },
          },
          required: ['poly'],
        },
      },
      {
        name: 'query_uoa_by_route',
        description: 'Retrieve UAS Operating Areas along a flight route.',
        inputSchema: {
          type: 'object',
          properties: {
            route: {
              type: 'object',
              description: 'GeoJSON LineString object defining the route',
            },
          },
          required: ['route'],
        },
      },
      // ── Weather Forecast ─────────────────────────────────────────────────────
      {
        name: 'query_weather_by_distance',
        description: 'Retrieve weather forecast values within a given distance of a point for specified weather elements and time periods. Supports wind, visibility, sky cover, precipitation, and more.',
        inputSchema: {
          type: 'object',
          properties: {
            latitude:  { type: 'number', description: 'Latitude of the center point in decimal degrees' },
            longitude: { type: 'number', description: 'Longitude of the center point in decimal degrees' },
            distance:  { type: 'number', description: 'Radius in meters around the point to search' },
            wxtypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Weather element codes to retrieve (e.g. ["VIS","SKY","WIND","TEMP","PRECIP"]). Omit to return all elements.',
            },
            hours: {
              type: 'integer',
              description: 'Number of forecast hours to retrieve (e.g. 2 for next 2 hours)',
            },
          },
          required: ['latitude', 'longitude', 'distance'],
        },
      },
      {
        name: 'query_weather_by_polygon',
        description: 'Retrieve weather forecasts within a GeoJSON Polygon area.',
        inputSchema: {
          type: 'object',
          properties: {
            poly: {
              type: 'object',
              description: 'GeoJSON Polygon object defining the area of interest',
            },
            wxtypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Weather element codes to retrieve. Omit to return all elements.',
            },
            hours: {
              type: 'integer',
              description: 'Number of forecast hours to retrieve',
            },
          },
          required: ['poly'],
        },
      },
      {
        name: 'query_weather_by_route',
        description: 'Retrieve weather forecasts along a flight route for UAV mission planning.',
        inputSchema: {
          type: 'object',
          properties: {
            route: {
              type: 'object',
              description: 'GeoJSON LineString object defining the route',
            },
            wxtypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Weather element codes to retrieve. Omit to return all elements.',
            },
            hours: {
              type: 'integer',
              description: 'Number of forecast hours to retrieve',
            },
          },
          required: ['route'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'query_aerodromes_by_distance':   return this.post('/us/v1/aerodromes/distance-query', { latitude: args.latitude, longitude: args.longitude, distance: args.distance });
        case 'query_aerodromes_by_polygon':    return this.post('/us/v1/aerodromes/polygon-query',  { poly: args.poly });
        case 'query_aerodromes_by_route':      return this.post('/us/v1/aerodromes/route-query',    { route: args.route });
        case 'query_airspace_by_distance':     return this.post('/us/v1/airspace/distance-query',   { latitude: args.latitude, longitude: args.longitude, distance: args.distance, ...(args.asptypes ? { asptypes: args.asptypes } : {}) });
        case 'query_airspace_by_polygon':      return this.post('/us/v1/airspace/polygon-query',    { poly: args.poly, ...(args.asptypes ? { asptypes: args.asptypes } : {}) });
        case 'query_airspace_by_route':        return this.post('/us/v1/airspace/route-query',      { route: args.route, ...(args.asptypes ? { asptypes: args.asptypes } : {}) });
        case 'query_restrictions_by_distance': return this.post('/us/v1/restrictions/distance-query', { latitude: args.latitude, longitude: args.longitude, distance: args.distance });
        case 'query_restrictions_by_polygon':  return this.post('/us/v1/restrictions/polygon-query',  { poly: args.poly });
        case 'query_restrictions_by_route':    return this.post('/us/v1/restrictions/route-query',    { route: args.route });
        case 'query_security_areas_by_distance': return this.post('/us/v1/ssa/distance-query', { latitude: args.latitude, longitude: args.longitude, distance: args.distance });
        case 'query_security_areas_by_polygon':  return this.post('/us/v1/ssa/polygon-query',  { poly: args.poly });
        case 'query_security_areas_by_route':    return this.post('/us/v1/ssa/route-query',    { route: args.route });
        case 'query_obstacles_by_distance':    return this.post('/us/v1/obstacles/distance-query', { latitude: args.latitude, longitude: args.longitude, distance: args.distance });
        case 'query_obstacles_by_polygon':     return this.post('/us/v1/obstacles/polygon-query',  { poly: args.poly });
        case 'query_obstacles_by_route':       return this.post('/us/v1/obstacles/route-query',    { route: args.route });
        case 'query_venues_by_distance':       return this.post('/us/v1/venues/distance-query', { latitude: args.latitude, longitude: args.longitude, distance: args.distance });
        case 'query_venues_by_polygon':        return this.post('/us/v1/venues/polygon-query',  { poly: args.poly });
        case 'query_venues_by_route':          return this.post('/us/v1/venues/route-query',    { route: args.route });
        case 'query_uoa_by_distance':          return this.post('/us/v1/uoa/distance-query', { latitude: args.latitude, longitude: args.longitude, distance: args.distance });
        case 'query_uoa_by_polygon':           return this.post('/us/v1/uoa/polygon-query',  { poly: args.poly });
        case 'query_uoa_by_route':             return this.post('/us/v1/uoa/route-query',    { route: args.route });
        case 'query_weather_by_distance':      return this.post('/us/v1/wx-forecast/distance-query', { latitude: args.latitude, longitude: args.longitude, distance: args.distance, ...(args.wxtypes ? { wxtypes: args.wxtypes } : {}), ...(args.hours !== undefined ? { hours: args.hours } : {}) });
        case 'query_weather_by_polygon':       return this.post('/us/v1/wx-forecast/polygon-query',  { poly: args.poly, ...(args.wxtypes ? { wxtypes: args.wxtypes } : {}), ...(args.hours !== undefined ? { hours: args.hours } : {}) });
        case 'query_weather_by_route':         return this.post('/us/v1/wx-forecast/route-query',    { route: args.route, ...(args.wxtypes ? { wxtypes: args.wxtypes } : {}), ...(args.hours !== undefined ? { hours: args.hours } : {}) });
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

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
