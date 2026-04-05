/**
 * EPA ECHO Clean Air Act MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Base URL: https://echodata.epa.gov/echo
// Auth: No authentication required — public EPA ECHO API
// Docs: https://echo.epa.gov/tools/web-services
// API: EPA Enforcement and Compliance History Online (ECHO) — Clean Air Act (CAA)
// Spec: https://api.apis.guru/v2/specs/epa.gov/air/2019.10.15/swagger.json
// Note: Each endpoint exposes both GET and POST — adapter uses GET (query params).
//       Workflow: search_facilities → get_facilities_paginated (QID) → download_facilities (CSV).
//       get_facility_info is the enhanced self-contained search endpoint.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EpaAirConfig {
  baseUrl?: string;
}

export class EpaAirMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: EpaAirConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://echodata.epa.gov/echo';
  }

  static catalog() {
    return {
      name: 'epa-air',
      displayName: 'EPA ECHO Clean Air Act',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'EPA', 'ECHO', 'Clean Air Act', 'CAA', 'air quality', 'air pollution',
        'ICIS-Air', 'compliance', 'enforcement', 'facility', 'permit', 'emissions',
        'environmental', 'regulation', 'government', 'Title V', 'NESHAP', 'NSPS',
      ],
      toolNames: [
        'search_facilities',
        'get_facility_info',
        'get_facilities_paginated',
        'get_facility_map',
        'get_facility_geojson',
        'get_info_clusters',
        'download_facilities',
        'get_metadata',
      ],
      description: 'Search and retrieve EPA Clean Air Act (CAA) facility compliance and enforcement data from ECHO (Enforcement and Compliance History Online), including facility search, compliance history, emissions, and permits.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_facilities',
        description: 'Search EPA-regulated Clean Air Act facilities (ECHO). Returns a Query ID (QID) for pagination. Use get_facilities_paginated with the QID to retrieve results.',
        inputSchema: {
          type: 'object',
          properties: {
            p_fn: {
              type: 'string',
              description: 'Facility name filter. One or more partial or complete facility names.',
            },
            p_sa: {
              type: 'string',
              description: 'Facility street address (partial match supported).',
            },
            p_ct: {
              type: 'string',
              description: 'Facility city filter.',
            },
            p_co: {
              type: 'string',
              description: 'Facility county filter. Use with p_st.',
            },
            p_st: {
              type: 'string',
              description: 'State abbreviation filter (e.g. "CA", "TX"). Comma-separated for multiple.',
            },
            p_zip: {
              type: 'string',
              description: '5-digit ZIP code filter. Comma-separated for multiple.',
            },
            p_fips: {
              type: 'string',
              description: 'FIPS code filter (5-character Federal Information Processing Standard code).',
            },
            p_reg: {
              type: 'string',
              description: 'EPA Region filter (01 through 10).',
            },
            p_frs: {
              type: 'string',
              description: 'Facility Registry Service (FRS) ID filter (12-digit).',
            },
            p_sic: {
              type: 'string',
              description: 'Standard Industrial Classification (SIC) code filter.',
            },
            p_ncs: {
              type: 'string',
              description: 'NAICS (North American Industry Classification System) code filter.',
            },
            p_lcon: {
              type: 'string',
              description: 'Air Program Local Control Region code filter.',
            },
            p_qnc: {
              type: 'number',
              description: 'Minimum number of quarters in non-compliance.',
            },
          },
        },
      },
      {
        name: 'get_facility_info',
        description: 'Enhanced self-contained Clean Air Act facility search returning full facility detail records or geographic clusters directly, without a separate QID step.',
        inputSchema: {
          type: 'object',
          properties: {
            p_fn: {
              type: 'string',
              description: 'Facility name filter.',
            },
            p_sa: {
              type: 'string',
              description: 'Facility street address.',
            },
            p_ct: {
              type: 'string',
              description: 'Facility city filter.',
            },
            p_co: {
              type: 'string',
              description: 'Facility county filter.',
            },
            p_st: {
              type: 'string',
              description: 'State abbreviation filter.',
            },
            p_zip: {
              type: 'string',
              description: '5-digit ZIP code filter.',
            },
            p_fips: {
              type: 'string',
              description: 'FIPS code filter.',
            },
            p_reg: {
              type: 'string',
              description: 'EPA Region filter (01-10).',
            },
            p_frs: {
              type: 'string',
              description: 'Facility Registry Service ID.',
            },
            p_sic: {
              type: 'string',
              description: 'SIC code filter.',
            },
            p_ncs: {
              type: 'string',
              description: 'NAICS code filter.',
            },
            p_lcon: {
              type: 'string',
              description: 'Air Program Local Control Region code.',
            },
            p_qnc: {
              type: 'number',
              description: 'Minimum quarters in non-compliance.',
            },
          },
        },
      },
      {
        name: 'get_facilities_paginated',
        description: 'Paginate through Clean Air Act facility results using a Query ID (QID) from search_facilities. QIDs expire after ~30 minutes.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID returned by a prior search_facilities call.',
            },
            pageno: {
              type: 'number',
              description: 'Page number to retrieve (default: 1).',
            },
            newsort: {
              type: 'number',
              description: 'Column number to sort results by.',
            },
            descending: {
              type: 'string',
              description: 'Sort descending: Y or N.',
            },
            qcolumns: {
              type: 'string',
              description: 'Comma-separated column IDs to customize output fields.',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_facility_map',
        description: 'Get geographic map data (clustered and individual facility coordinates) for CAA facilities matching a QID.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from a prior search_facilities call.',
            },
            p_id: {
              type: 'string',
              description: 'Facility identifier for single-facility map lookup.',
            },
            tablelist: {
              type: 'string',
              description: 'Y to include first page of facility list alongside map data.',
            },
            c1_lat: {
              type: 'number',
              description: 'Latitude of first corner of bounding box.',
            },
            c1_long: {
              type: 'number',
              description: 'Longitude of first corner of bounding box.',
            },
            c2_lat: {
              type: 'number',
              description: 'Latitude of second corner of bounding box.',
            },
            c2_long: {
              type: 'number',
              description: 'Longitude of second corner of bounding box.',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_facility_geojson',
        description: 'Retrieve GeoJSON formatted facility location data for Clean Air Act facilities matching a QID.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from a prior search_facilities call.',
            },
            newsort: {
              type: 'number',
              description: 'Column number to sort results by.',
            },
            descending: {
              type: 'string',
              description: 'Sort descending: Y or N.',
            },
            qcolumns: {
              type: 'string',
              description: 'Comma-separated column IDs to include.',
            },
            p_pretty_print: {
              type: 'number',
              description: 'Set to 1 to pretty-print GeoJSON output.',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_info_clusters',
        description: 'Retrieve state, county, or ZIP code clusters with summary statistics for CAA facilities matching a QID.',
        inputSchema: {
          type: 'object',
          properties: {
            p_qid: {
              type: 'string',
              description: 'Query ID from a prior search_facilities call.',
            },
            p_pretty_print: {
              type: 'number',
              description: 'Set to 1 to pretty-print output.',
            },
          },
          required: ['p_qid'],
        },
      },
      {
        name: 'download_facilities',
        description: 'Generate a CSV download of Clean Air Act facility data for a QID.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from a prior search_facilities call.',
            },
            qcolumns: {
              type: 'string',
              description: 'Comma-separated column IDs to include in the CSV export.',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_metadata',
        description: 'Retrieve ECHO Clean Air Act service metadata — available output columns, their IDs, and definitions for customizing queries.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_facilities':
          return this.searchFacilities(args);
        case 'get_facility_info':
          return this.getFacilityInfo(args);
        case 'get_facilities_paginated':
          return this.getFacilitiesPaginated(args);
        case 'get_facility_map':
          return this.getFacilityMap(args);
        case 'get_facility_geojson':
          return this.getFacilityGeojson(args);
        case 'get_info_clusters':
          return this.getInfoClusters(args);
        case 'download_facilities':
          return this.downloadFacilities(args);
        case 'get_metadata':
          return this.getMetadata();
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

  private buildParams(args: Record<string, unknown>, keys: string[]): URLSearchParams {
    const params = new URLSearchParams({ output: 'JSON' });
    for (const key of keys) {
      if (args[key] !== undefined && args[key] !== null && args[key] !== '') {
        params.set(key, String(args[key]));
      }
    }
    return params;
  }

  private async get(path: string, params: URLSearchParams): Promise<ToolResult> {
    const url = `${this.baseUrl}/${path}?${params.toString()}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private readonly facilitySearchKeys = [
    'p_fn', 'p_sa', 'p_sa1', 'p_ct', 'p_co', 'p_fips', 'p_st', 'p_zip',
    'p_lcon', 'p_frs', 'p_reg', 'p_sic', 'p_ncs', 'p_qnc',
  ];

  private async searchFacilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, this.facilitySearchKeys);
    return this.get('air_rest_services.get_facilities', params);
  }

  private async getFacilityInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, this.facilitySearchKeys);
    return this.get('air_rest_services.get_facility_info', params);
  }

  private async getFacilitiesPaginated(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    const params = this.buildParams(args, ['qid', 'pageno', 'newsort', 'descending', 'qcolumns']);
    return this.get('air_rest_services.get_qid', params);
  }

  private async getFacilityMap(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    const params = this.buildParams(args, ['qid', 'p_id', 'tablelist', 'c1_lat', 'c1_long', 'c2_lat', 'c2_long']);
    return this.get('air_rest_services.get_map', params);
  }

  private async getFacilityGeojson(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    const params = this.buildParams(args, ['qid', 'newsort', 'descending', 'qcolumns', 'p_pretty_print']);
    return this.get('air_rest_services.get_geojson', params);
  }

  private async getInfoClusters(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.p_qid) return { content: [{ type: 'text', text: 'p_qid is required' }], isError: true };
    const params = this.buildParams(args, ['p_qid', 'p_pretty_print']);
    return this.get('air_rest_services.get_info_clusters', params);
  }

  private async downloadFacilities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    const params = this.buildParams(args, ['qid', 'qcolumns']);
    params.set('output', 'CSV');
    return this.get('air_rest_services.get_download', params);
  }

  private async getMetadata(): Promise<ToolResult> {
    const params = new URLSearchParams({ output: 'JSON' });
    return this.get('air_rest_services.metadata', params);
  }
}
