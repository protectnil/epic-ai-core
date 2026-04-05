/**
 * BC Geocoder MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official vendor MCP server exists for this API.
// Our adapter covers: 8 tools (addresses, intersections, sites, occupants, parcels).
//   No community MCP implementations found. Use this adapter for full coverage.
// Recommendation: Use this adapter. It is the only MCP implementation available.
//
// Base URL: https://geocoder.api.gov.bc.ca
// Auth: API key passed as query parameter `apikey` on every request
// Docs: https://www2.gov.bc.ca/gov/content?id=118DD57CD9674D57BDBD511C2E78DC0D
// Rate limits: Contact DataBC — https://dpdd.atlassian.net/servicedesk/customer/portal/1/group/7/
// API keys: Acquire at https://api.gov.bc.ca/devportal/api-directory/273 with GitHub or IDIR account

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GovBcCaGeocoderConfig {
  apiKey: string;
  /** Optional base URL override (default: https://geocoder.api.gov.bc.ca) */
  baseUrl?: string;
}

export class GovBcCaGeocoderMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: GovBcCaGeocoderConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://geocoder.api.gov.bc.ca';
  }

  static catalog() {
    return {
      name: 'gov-bc-ca-geocoder',
      displayName: 'BC Geocoder (Government of British Columbia)',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'geocoder', 'geocoding', 'british columbia', 'bc', 'canada', 'government',
        'address', 'civic', 'intersection', 'site', 'occupant', 'parcel',
        'reverse geocode', 'coordinates', 'latitude', 'longitude', 'proximity',
        'location', 'open data', 'spatial',
      ],
      toolNames: [
        'geocode_addresses',
        'get_intersections_near',
        'get_nearest_intersection',
        'get_intersections_within',
        'get_intersection_by_id',
        'get_sites_near',
        'get_nearest_site',
        'get_site_by_id',
      ],
      description: 'BC Government geocoder for address cleaning, correction, geocoding, reverse geocoding, and proximity lookups for civic addresses, intersections, sites, and occupants in British Columbia.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'geocode_addresses',
        description: 'Geocode and standardize a BC civic or intersection address — returns matched addresses with coordinates and confidence scores',
        inputSchema: {
          type: 'object',
          properties: {
            address_string: {
              type: 'string',
              description: 'Civic or intersection address as a single string (e.g. "525 Superior Street, Victoria, BC")',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return (default: 1)',
            },
            auto_complete: {
              type: 'boolean',
              description: 'If true, treat addressString as a partial address requiring completion (default: false)',
            },
            location_descriptor: {
              type: 'string',
              description: 'Nature of address location: any, accessPoint, frontDoorPoint, parcelPoint, rooftopPoint, or routingPoint (default: any)',
            },
            output_srs: {
              type: 'number',
              description: 'EPSG code for output geometry SRS: 4326, 4269, 3005, 26907-26911 (default: 4326)',
            },
          },
        },
      },
      {
        name: 'get_intersections_near',
        description: 'Find BC road intersections near a given coordinate point within a specified distance',
        inputSchema: {
          type: 'object',
          properties: {
            point: {
              type: 'string',
              description: 'Coordinate point as "longitude,latitude" in WGS84 (e.g. "-123.3656,48.4284")',
            },
            max_distance: {
              type: 'number',
              description: 'Maximum search radius in metres (default: 100)',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of intersections to return (default: 5)',
            },
            output_srs: {
              type: 'number',
              description: 'EPSG code for output geometry SRS (default: 4326)',
            },
          },
          required: ['point'],
        },
      },
      {
        name: 'get_nearest_intersection',
        description: 'Find the single nearest BC road intersection to a given coordinate point',
        inputSchema: {
          type: 'object',
          properties: {
            point: {
              type: 'string',
              description: 'Coordinate point as "longitude,latitude" in WGS84 (e.g. "-123.3656,48.4284")',
            },
            max_distance: {
              type: 'number',
              description: 'Maximum search radius in metres (default: 100)',
            },
            min_degree: {
              type: 'number',
              description: 'Minimum number of roads at the intersection (default: 3)',
            },
            output_srs: {
              type: 'number',
              description: 'EPSG code for output geometry SRS (default: 4326)',
            },
          },
          required: ['point'],
        },
      },
      {
        name: 'get_intersections_within',
        description: 'Find BC road intersections within a bounding box',
        inputSchema: {
          type: 'object',
          properties: {
            bbox: {
              type: 'string',
              description: 'Bounding box as "minLon,minLat,maxLon,maxLat" in WGS84 (e.g. "-123.4,48.4,-123.3,48.5")',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of intersections to return (default: 5)',
            },
            min_degree: {
              type: 'number',
              description: 'Minimum number of roads at each intersection',
            },
            output_srs: {
              type: 'number',
              description: 'EPSG code for output geometry SRS (default: 4326)',
            },
          },
          required: ['bbox'],
        },
      },
      {
        name: 'get_intersection_by_id',
        description: 'Retrieve a specific BC road intersection by its intersection ID',
        inputSchema: {
          type: 'object',
          properties: {
            intersection_id: {
              type: 'string',
              description: 'BC intersection ID (e.g. from a prior intersections search)',
            },
            output_srs: {
              type: 'number',
              description: 'EPSG code for output geometry SRS (default: 4326)',
            },
          },
          required: ['intersection_id'],
        },
      },
      {
        name: 'get_sites_near',
        description: 'Find BC address sites near a given coordinate point within a specified distance',
        inputSchema: {
          type: 'object',
          properties: {
            point: {
              type: 'string',
              description: 'Coordinate point as "longitude,latitude" in WGS84 (e.g. "-123.3656,48.4284")',
            },
            max_distance: {
              type: 'number',
              description: 'Maximum search radius in metres (default: 100)',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of sites to return (default: 5)',
            },
            location_descriptor: {
              type: 'string',
              description: 'Nature of address location: any, accessPoint, frontDoorPoint, parcelPoint, rooftopPoint, or routingPoint (default: any)',
            },
            output_srs: {
              type: 'number',
              description: 'EPSG code for output geometry SRS (default: 4326)',
            },
          },
          required: ['point'],
        },
      },
      {
        name: 'get_nearest_site',
        description: 'Find the single nearest BC address site to a given coordinate point',
        inputSchema: {
          type: 'object',
          properties: {
            point: {
              type: 'string',
              description: 'Coordinate point as "longitude,latitude" in WGS84 (e.g. "-123.3656,48.4284")',
            },
            max_distance: {
              type: 'number',
              description: 'Maximum search radius in metres (default: 100)',
            },
            location_descriptor: {
              type: 'string',
              description: 'Nature of address location: any, accessPoint, frontDoorPoint, parcelPoint, rooftopPoint, or routingPoint (default: any)',
            },
            output_srs: {
              type: 'number',
              description: 'EPSG code for output geometry SRS (default: 4326)',
            },
          },
          required: ['point'],
        },
      },
      {
        name: 'get_site_by_id',
        description: 'Retrieve a specific BC address site by its site ID',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'BC site ID (e.g. from a prior address search)',
            },
            output_srs: {
              type: 'number',
              description: 'EPSG code for output geometry SRS (default: 4326)',
            },
          },
          required: ['site_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'geocode_addresses':
          return this.geocodeAddresses(args);
        case 'get_intersections_near':
          return this.getIntersectionsNear(args);
        case 'get_nearest_intersection':
          return this.getNearestIntersection(args);
        case 'get_intersections_within':
          return this.getIntersectionsWithin(args);
        case 'get_intersection_by_id':
          return this.getIntersectionById(args);
        case 'get_sites_near':
          return this.getSitesNear(args);
        case 'get_nearest_site':
          return this.getNearestSite(args);
        case 'get_site_by_id':
          return this.getSiteById(args);
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
    const qs = new URLSearchParams({ apikey: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    return `${this.baseUrl}${path}?${qs.toString()}`;
  }

  private async apiFetch(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`BC Geocoder returned non-JSON (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async geocodeAddresses(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.address_string) params.addressString = args.address_string as string;
    if (args.max_results !== undefined) params.maxResults = String(args.max_results);
    if (args.auto_complete !== undefined) params.autoComplete = String(args.auto_complete);
    if (args.location_descriptor) params.locationDescriptor = args.location_descriptor as string;
    if (args.output_srs !== undefined) params.outputSRS = String(args.output_srs);
    return this.apiFetch('/addresses.json', params);
  }

  private async getIntersectionsNear(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.point) return { content: [{ type: 'text', text: 'point is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      point: args.point as string,
      outputSRS: String((args.output_srs as number) ?? 4326),
    };
    if (args.max_distance !== undefined) params.maxDistance = String(args.max_distance);
    if (args.max_results !== undefined) params.maxResults = String(args.max_results);
    return this.apiFetch('/intersections/near.json', params);
  }

  private async getNearestIntersection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.point) return { content: [{ type: 'text', text: 'point is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      point: args.point as string,
    };
    if (args.max_distance !== undefined) params.maxDistance = String(args.max_distance);
    if (args.min_degree !== undefined) params.minDegree = String(args.min_degree);
    if (args.output_srs !== undefined) params.outputSRS = String(args.output_srs);
    return this.apiFetch('/intersections/nearest.json', params);
  }

  private async getIntersectionsWithin(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bbox) return { content: [{ type: 'text', text: 'bbox is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      bbox: args.bbox as string,
    };
    if (args.max_results !== undefined) params.maxResults = String(args.max_results);
    if (args.min_degree !== undefined) params.minDegree = String(args.min_degree);
    if (args.output_srs !== undefined) params.outputSRS = String(args.output_srs);
    return this.apiFetch('/intersections/within.json', params);
  }

  private async getIntersectionById(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.intersection_id) return { content: [{ type: 'text', text: 'intersection_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.output_srs !== undefined) params.outputSRS = String(args.output_srs);
    return this.apiFetch(`/intersections/${encodeURIComponent(args.intersection_id as string)}.json`, params);
  }

  private async getSitesNear(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.point) return { content: [{ type: 'text', text: 'point is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      point: args.point as string,
    };
    if (args.max_distance !== undefined) params.maxDistance = String(args.max_distance);
    if (args.max_results !== undefined) params.maxResults = String(args.max_results);
    if (args.location_descriptor) params.locationDescriptor = args.location_descriptor as string;
    if (args.output_srs !== undefined) params.outputSRS = String(args.output_srs);
    return this.apiFetch('/sites/near.json', params);
  }

  private async getNearestSite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.point) return { content: [{ type: 'text', text: 'point is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      point: args.point as string,
    };
    if (args.max_distance !== undefined) params.maxDistance = String(args.max_distance);
    if (args.location_descriptor) params.locationDescriptor = args.location_descriptor as string;
    if (args.output_srs !== undefined) params.outputSRS = String(args.output_srs);
    return this.apiFetch('/sites/nearest.json', params);
  }

  private async getSiteById(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.output_srs !== undefined) params.outputSRS = String(args.output_srs);
    return this.apiFetch(`/sites/${encodeURIComponent(args.site_id as string)}.json`, params);
  }
}
