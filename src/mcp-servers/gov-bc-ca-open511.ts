/**
 * BC Gov DriveBC Open511 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found — no vendor-published MCP server for this API.
// Our adapter covers: 4 tools (areas, events, jurisdiction, jurisdiction geography).
// Recommendation: Use this adapter for full DriveBC road event coverage.
//
// Base URL: https://api.open511.gov.bc.ca
// Auth: None required — public open data API
// Docs: http://api.open511.gov.bc.ca/help
// License: Open Government License - British Columbia

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GovBcCaOpen511Config {
  /** Optional base URL override (default: https://api.open511.gov.bc.ca) */
  baseUrl?: string;
}

export class GovBcCaOpen511MCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: GovBcCaOpen511Config = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://api.open511.gov.bc.ca';
  }

  static catalog() {
    return {
      name: 'gov-bc-ca-open511',
      displayName: 'BC Gov DriveBC Open511',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'bc', 'british columbia', 'drivebc', 'open511', 'road events', 'traffic',
        'accidents', 'construction', 'incidents', 'weather conditions', 'highway',
        'road closures', 'jurisdiction', 'areas', 'canada', 'government',
      ],
      toolNames: [
        'list_areas',
        'list_events',
        'get_jurisdiction',
        'get_jurisdiction_geography',
      ],
      description: 'DriveBC Open511 API — road events (accidents, construction, special events, weather conditions) in British Columbia, Canada. Filter by severity, type, area, bounding box, or road name.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_areas',
        description: 'List the geographical areas (districts) in British Columbia that can be used to filter road events',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: 'Response format: json or xml (default: json)',
            },
          },
        },
      },
      {
        name: 'list_events',
        description: 'List road events in British Columbia — accidents, construction, special events, weather and road conditions. Filter by status, severity, type, area, bounding box, road name, and date range.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by event status: ALL, ACTIVE, or ARCHIVED (default: ALL)',
            },
            severity: {
              type: 'string',
              description: 'Comma-separated severity filter: MINOR, MODERATE, MAJOR (default: MAJOR)',
            },
            event_type: {
              type: 'string',
              description: 'Comma-separated event type filter: CONSTRUCTION, SPECIAL_EVENT, INCIDENT, WEATHER_CONDITION, ROAD_CONDITION (default: INCIDENT)',
            },
            jurisdiction: {
              type: 'string',
              description: 'Filter by jurisdiction ID from /jurisdiction resource (default: drivebc.ca)',
            },
            road_name: {
              type: 'string',
              description: 'Filter by road name e.g. "Highway 1" or "Highway 99"',
            },
            area_id: {
              type: 'string',
              description: 'Filter by area ID from list_areas e.g. "drivebc.ca/1" for Lower Mainland District',
            },
            bbox: {
              type: 'string',
              description: 'Geographic bounding box: "[min_lon],[min_lat],[max_lon],[max_lat]" in WGS84 e.g. "-123.45,48.99,-122.45,49.49"',
            },
            created: {
              type: 'string',
              description: 'Filter by creation date with ISO 8601 and operator prefix e.g. ">2015-09-01T12:00:00Z"',
            },
            updated: {
              type: 'string',
              description: 'Filter by last updated date with ISO 8601 and operator prefix e.g. ">2015-09-01T12:00:00Z"',
            },
            format: {
              type: 'string',
              description: 'Response format: json or xml (default: json)',
            },
          },
        },
      },
      {
        name: 'get_jurisdiction',
        description: 'Get information about the DriveBC jurisdiction including contact details and API capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: 'Response format: json or xml (default: json)',
            },
          },
        },
      },
      {
        name: 'get_jurisdiction_geography',
        description: 'Get the geographic boundaries of the DriveBC jurisdiction as a GeoJSON geometry',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              description: 'Response format: json or xml (default: json)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_areas':
          return this.listAreas(args);
        case 'list_events':
          return this.listEvents(args);
        case 'get_jurisdiction':
          return this.getJurisdiction(args);
        case 'get_jurisdiction_geography':
          return this.getJurisdictionGeography(args);
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

  private buildUrl(path: string, params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const query = qs.toString();
    return `${this.baseUrl}${path}${query ? '?' + query : ''}`;
  }

  private async doFetch(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Open511 returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listAreas(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.format) params.format = args.format as string;
    return this.doFetch('/areas', params);
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.status) params.status = args.status as string;
    if (args.severity) params.severity = args.severity as string;
    if (args.event_type) params.event_type = args.event_type as string;
    if (args.jurisdiction) params.jurisdiction = args.jurisdiction as string;
    if (args.road_name) params.road_name = args.road_name as string;
    if (args.area_id) params.area_id = args.area_id as string;
    if (args.bbox) params.bbox = args.bbox as string;
    if (args.created) params.created = args.created as string;
    if (args.updated) params.updated = args.updated as string;
    if (args.format) params.format = args.format as string;
    return this.doFetch('/events', params);
  }

  private async getJurisdiction(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.format) params.format = args.format as string;
    return this.doFetch('/jurisdiction', params);
  }

  private async getJurisdictionGeography(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.format) params.format = args.format as string;
    return this.doFetch('/jurisdictiongeography', params);
  }
}
