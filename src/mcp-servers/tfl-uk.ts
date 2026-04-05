/**
 * Transport for London (TfL) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — TfL has not published an official MCP server.
// Community MCP: None found on GitHub or npmjs.org for TfL.
// Our adapter wraps the TfL Unified API covering lines, arrivals, bike points, air quality,
// disruptions, journey planning, stop points, and road status.
//
// Base URL: https://api.digital.tfl.gov.uk (OpenAPI spec server) / https://api.tfl.gov.uk (primary)
// Auth: Optional — app_id and app_key query params. Unauthenticated calls are rate-limited.
//   Register at: https://api-portal.tfl.gov.uk/signup
// Docs: https://api.tfl.gov.uk  |  https://api-portal.tfl.gov.uk
// Rate limits: Authenticated ~500 req/min; unauthenticated ~50 req/min
// Note: TfL API uses https://api.tfl.gov.uk (not api.digital.tfl.gov.uk) for most endpoints.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TflUkConfig {
  appId?: string;
  appKey?: string;
  baseUrl?: string;
}

export class TflUkMCPServer extends MCPAdapterBase {
  private readonly appId: string | undefined;
  private readonly appKey: string | undefined;
  private readonly baseUrl: string;

  constructor(config: TflUkConfig = {}) {
    super();
    this.appId   = config.appId;
    this.appKey  = config.appKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.tfl.gov.uk').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'tfl-uk',
      displayName: 'Transport for London (TfL)',
      version: '1.0.0',
      category: 'travel' as const,
      keywords: [
        'tfl', 'transport for london', 'london', 'tube', 'underground', 'bus', 'rail',
        'overground', 'elizabeth line', 'dlr', 'tram', 'cable car', 'bike', 'cycling',
        'santander cycles', 'arrivals', 'departures', 'journey planner', 'disruption',
        'line status', 'stop points', 'road', 'traffic', 'air quality', 'uk transit',
      ],
      toolNames: [
        'get_line_status',
        'get_arrivals',
        'get_departures',
        'search_stop_points',
        'get_stop_point',
        'plan_journey',
        'get_air_quality',
        'get_bike_points',
        'search_bike_points',
        'get_road_status',
        'get_line_route',
        'get_accident_stats',
      ],
      description: 'Transport for London Unified API: real-time line status, arrivals, departures, journey planning, bike points, road status, and air quality across all TfL modes.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_line_status',
        description: 'Get current status and disruption information for one or more TfL lines (tube, overground, elizabeth line, dlr, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Comma-separated line IDs (e.g. "central,jubilee,elizabeth" or "all" for all lines). Line IDs: bakerloo, central, circle, district, elizabeth, hammersmith-city, jubilee, metropolitan, northern, piccadilly, victoria, waterloo-city, dlr, overground, tram, cable-car',
            },
            detail: {
              type: 'boolean',
              description: 'Include detailed disruption information (default: false)',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_arrivals',
        description: 'Get real-time arrival predictions for a specific stop point (bus stop, tube station, etc.) on TfL services',
        inputSchema: {
          type: 'object',
          properties: {
            stopPointId: {
              type: 'string',
              description: 'TfL stop point ID (e.g. 940GZZLUOXC for Oxford Circus, or a NaptanId like 490000173A)',
            },
            lineId: {
              type: 'string',
              description: 'Optional line ID to filter arrivals (e.g. "central", "N55"). Omit for all lines at stop.',
            },
          },
          required: ['stopPointId'],
        },
      },
      {
        name: 'get_departures',
        description: 'Get timetabled and real-time departures from a stop point for a specific TfL line',
        inputSchema: {
          type: 'object',
          properties: {
            lineId: {
              type: 'string',
              description: 'TfL line ID (e.g. "central", "55", "overground")',
            },
            stopPointId: {
              type: 'string',
              description: 'TfL stop point ID for the departure stop',
            },
          },
          required: ['lineId', 'stopPointId'],
        },
      },
      {
        name: 'search_stop_points',
        description: 'Search TfL stop points (stations, bus stops) by name keyword across all transport modes',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Name or partial name to search for (e.g. "Oxford Circus", "Liverpool Street", "Paddington")',
            },
            modes: {
              type: 'string',
              description: 'Comma-separated transport modes to filter by (e.g. "tube,bus,elizabeth-line"). Omit for all modes.',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return (default: 25)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_stop_point',
        description: 'Get detailed information about a specific TfL stop point including lines served, accessibility, and facilities',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'TfL stop point ID or NaptanId (e.g. 940GZZLUOXC)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'plan_journey',
        description: 'Plan a journey between two locations in London using TfL services — returns routes with times, fares, and mode details',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Origin location — can be a postcode (e.g. EC2R 8AH), NaptanId, address, or lat,lon coordinate (e.g. 51.5074,-0.1278)',
            },
            to: {
              type: 'string',
              description: 'Destination location — same format as from',
            },
            via: {
              type: 'string',
              description: 'Optional intermediate point in same format as from/to',
            },
            time: {
              type: 'string',
              description: 'Travel time in HHmm format (e.g. 0930). Combined with timeIs.',
            },
            timeIs: {
              type: 'string',
              description: 'Whether time is for Departing or Arriving (default: Departing)',
            },
            journeyPreference: {
              type: 'string',
              description: 'Route preference: LeastInterchange, LeastTime, or LeastWalking (default: LeastTime)',
            },
            mode: {
              type: 'string',
              description: 'Comma-separated transport modes to include (e.g. "tube,bus,walking"). Omit for all.',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_air_quality',
        description: 'Get London air quality data feed including current pollution levels and health advice from TfL',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_bike_points',
        description: 'Get all Santander Cycles bike point locations in London with current bike and dock availability',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'search_bike_points',
        description: 'Search Santander Cycles bike points near a location by name or landmark',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term for nearby landmark or street name (e.g. "St. James", "Waterloo", "Aldgate")',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_road_status',
        description: 'Get current road status and disruption information for major TfL-managed roads in London',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Comma-separated road IDs or "all". Major roads: A1, A2, A3, A4, A5, A10, A11, A12, A13, A20, A21, A23, A24, A40, A41, A406 (North Circular), A205 (South Circular), A316',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_line_route',
        description: 'Get the full route sequence (ordered list of stations/stops) for a TfL line',
        inputSchema: {
          type: 'object',
          properties: {
            lineId: {
              type: 'string',
              description: 'TfL line ID (e.g. "central", "jubilee", "elizabeth", "dlr", "overground")',
            },
            serviceTypes: {
              type: 'string',
              description: 'Service types to include: Regular, Night, or both (comma-separated). Default: Regular',
            },
          },
          required: ['lineId'],
        },
      },
      {
        name: 'get_accident_stats',
        description: 'Get accident statistics for London roads for a given year from TfL',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Year to retrieve accident statistics for (e.g. 2023)',
            },
          },
          required: ['year'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_line_status':       return this.getLineStatus(args);
        case 'get_arrivals':          return this.getArrivals(args);
        case 'get_departures':        return this.getDepartures(args);
        case 'search_stop_points':    return this.searchStopPoints(args);
        case 'get_stop_point':        return this.getStopPoint(args);
        case 'plan_journey':          return this.planJourney(args);
        case 'get_air_quality':       return this.getAirQuality();
        case 'get_bike_points':       return this.getBikePoints();
        case 'search_bike_points':    return this.searchBikePoints(args);
        case 'get_road_status':       return this.getRoadStatus(args);
        case 'get_line_route':        return this.getLineRoute(args);
        case 'get_accident_stats':    return this.getAccidentStats(args);
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

  private authParams(): Record<string, string> {
    const p: Record<string, string> = {};
    if (this.appId)  p.app_id  = this.appId;
    if (this.appKey) p.app_key = this.appKey;
    return p;
  }

  private async tflGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const merged = { ...this.authParams(), ...params };
    const qs = Object.keys(merged).length > 0 ? '?' + new URLSearchParams(merged).toString() : '';
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'EpicAI-TfL-Adapter/1.0' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `TfL API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getLineStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ids) return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    const detail = args.detail ? '/Detail' : '';
    return this.tflGet(`/Line/${encodeURIComponent(args.ids as string)}/Status${detail}`);
  }

  private async getArrivals(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stopPointId) return { content: [{ type: 'text', text: 'stopPointId is required' }], isError: true };
    const lineSegment = args.lineId ? `/${encodeURIComponent(args.lineId as string)}` : '';
    return this.tflGet(`/StopPoint/${encodeURIComponent(args.stopPointId as string)}/Arrivals${lineSegment}`);
  }

  private async getDepartures(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.lineId || !args.stopPointId) {
      return { content: [{ type: 'text', text: 'lineId and stopPointId are required' }], isError: true };
    }
    return this.tflGet(`/Line/${encodeURIComponent(args.lineId as string)}/Arrivals/${encodeURIComponent(args.stopPointId as string)}`);
  }

  private async searchStopPoints(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.modes) params.modes = args.modes as string;
    if (args.maxResults !== undefined) params.maxResults = String(args.maxResults);
    return this.tflGet(`/StopPoint/Search/${encodeURIComponent(args.query as string)}`, params);
  }

  private async getStopPoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.tflGet(`/StopPoint/${encodeURIComponent(args.id as string)}`);
  }

  private async planJourney(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to) {
      return { content: [{ type: 'text', text: 'from and to are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.via)               params.via               = args.via as string;
    if (args.time)              params.time              = args.time as string;
    if (args.timeIs)            params.timeIs            = args.timeIs as string;
    if (args.journeyPreference) params.journeyPreference = args.journeyPreference as string;
    if (args.mode)              params.mode              = args.mode as string;
    return this.tflGet(
      `/Journey/JourneyResults/${encodeURIComponent(args.from as string)}/to/${encodeURIComponent(args.to as string)}`,
      params,
    );
  }

  private async getAirQuality(): Promise<ToolResult> {
    return this.tflGet('/AirQuality');
  }

  private async getBikePoints(): Promise<ToolResult> {
    return this.tflGet('/BikePoint');
  }

  private async searchBikePoints(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.tflGet('/BikePoint/Search', { query: args.query as string });
  }

  private async getRoadStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ids) return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    return this.tflGet(`/Road/${encodeURIComponent(args.ids as string)}/Status`);
  }

  private async getLineRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.lineId) return { content: [{ type: 'text', text: 'lineId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.serviceTypes) params.serviceTypes = args.serviceTypes as string;
    return this.tflGet(`/Line/${encodeURIComponent(args.lineId as string)}/Route/Sequence/all`, params);
  }

  private async getAccidentStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.year === undefined) return { content: [{ type: 'text', text: 'year is required' }], isError: true };
    return this.tflGet(`/AccidentStats/${encodeURIComponent(String(args.year))}`);
  }
}
