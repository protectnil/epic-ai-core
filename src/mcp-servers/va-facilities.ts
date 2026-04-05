/**
 * VA Facilities MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official VA Facilities MCP server was found on GitHub or developer.va.gov.
//
// Base URL: https://api.va.gov/services/va_facilities/v0
// Auth: API key passed as HTTP header `apikey` on every request
// Docs: https://developer.va.gov/explore/api/va-facilities
// Rate limits: Standard VA Lighthouse throttling — 429 returned on excess; no published per-minute limit

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VAFacilitiesConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.va.gov/services/va_facilities/v0) */
  baseUrl?: string;
}

export class VAFacilitiesMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: VAFacilitiesConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.va.gov/services/va_facilities/v0';
  }

  static catalog() {
    return {
      name: 'va-facilities',
      displayName: 'VA Facilities',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'va', 'veterans affairs', 'va facilities', 'government', 'veteran', 'hospital',
        'clinic', 'health', 'benefits', 'cemetery', 'vet center', 'military',
        'location', 'near me', 'services', 'wait times', 'hours', 'address',
        'vha', 'vba', 'nca', 'federal',
      ],
      toolNames: [
        'search_facilities',
        'get_facility',
        'get_facility_ids',
      ],
      description: 'Find and retrieve VA health facilities, benefits offices, cemeteries, and Vet Centers by location, ID, state, zip, or bounding box with services and hours.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_facilities',
        description: 'Search VA facilities by location (lat/long, zip, state, bounding box, or VISN), with optional filters for facility type and available services',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Comma-separated list of facility IDs to retrieve (e.g. "vha_688,vha_644"). Can be combined with lat/long for distance sorting.',
            },
            zip: {
              type: 'string',
              description: 'ZIP code to search for nearby facilities (e.g. "80301" or "80301-1000")',
            },
            state: {
              type: 'string',
              description: 'Two-letter state abbreviation to filter facilities (e.g. "CO", "CA", "TX")',
            },
            lat: {
              type: 'number',
              description: 'Latitude in WGS84 decimal degrees for proximity search (requires long parameter)',
            },
            long: {
              type: 'number',
              description: 'Longitude in WGS84 decimal degrees for proximity search (requires lat parameter)',
            },
            bbox: {
              type: 'string',
              description: 'Bounding box as comma-separated "long1,lat1,long2,lat2" in WGS84 (e.g. "-105.4,39.4,-104.5,40.1")',
            },
            visn: {
              type: 'number',
              description: 'VA Veterans Integrated Service Network (VISN) number to filter by',
            },
            type: {
              type: 'string',
              description: 'Facility type filter: health, cemetery, benefits, or vet_center',
            },
            services: {
              type: 'string',
              description: 'Comma-separated list of required services to filter facilities (e.g. "primaryCare,mentalHealth")',
            },
            mobile: {
              type: 'boolean',
              description: 'Filter by mobile facility status: true to return only mobile facilities, false to exclude them',
            },
            page: {
              type: 'number',
              description: 'Page number for paginated results (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Number of results per page (default: 10)',
            },
          },
        },
      },
      {
        name: 'get_facility',
        description: 'Retrieve full details for a single VA facility by its ID, including address, phone, hours, services, and patient wait times',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Facility ID in format prefix_stationNumber — prefix is vha (health), vba (benefits), nca (cemetery), or vc (vet center). Examples: vha_402GA, vba_539GB, nca_063, vc_0872MVC',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_facility_ids',
        description: 'Retrieve all VA facility IDs, optionally filtered by facility type — useful for bulk lookup or enumeration',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Optional facility type filter: health, cemetery, benefits, or vet_center',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_facilities':
          return this.searchFacilities(args);
        case 'get_facility':
          return this.getFacility(args);
        case 'get_facility_ids':
          return this.getFacilityIds(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async request(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const response = await this.fetchWithRetry(url.toString(), {
      headers: {
        'apikey': this.apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async searchFacilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};

    if (args.ids) params['ids'] = args.ids as string;
    if (args.zip) params['zip'] = args.zip as string;
    if (args.state) params['state'] = args.state as string;
    if (args.lat !== undefined) params['lat'] = String(args.lat);
    if (args.long !== undefined) params['long'] = String(args.long);
    if (args.visn !== undefined) params['visn'] = String(args.visn);
    if (args.type) params['type'] = args.type as string;
    if (args.mobile !== undefined) params['mobile'] = String(args.mobile);
    if (args.page !== undefined) params['page'] = String(args.page);
    if (args.per_page !== undefined) params['per_page'] = String(args.per_page);

    // bbox: accept "long1,lat1,long2,lat2" and send as bbox[] repeated params
    // URLSearchParams.set replaces, so for bbox[] we need to append
    const url = new URL(`${this.baseUrl}/facilities`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.append(k, v);
    }
    if (args.services) {
      for (const svc of (args.services as string).split(',').map(s => s.trim())) {
        if (svc) url.searchParams.append('services[]', svc);
      }
    }
    if (args.bbox) {
      for (const val of (args.bbox as string).split(',').map(s => s.trim())) {
        if (val) url.searchParams.append('bbox[]', val);
      }
    }

    const response = await this.fetchWithRetry(url.toString(), {
      headers: {
        'apikey': this.apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async getFacility(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) {
      return {
        content: [{ type: 'text', text: 'id is required' }],
        isError: true,
      };
    }
    const id = encodeURIComponent(args.id as string);
    return this.request(`/facilities/${id}`);
  }

  private async getFacilityIds(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.type) params['type'] = args.type as string;
    return this.request('/ids', Object.keys(params).length > 0 ? params : undefined);
  }
}
