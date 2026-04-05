/**
 * EPA ECHO (Enforcement and Compliance History Online) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// No official vendor MCP server exists for EPA ECHO.
// This adapter covers all 8 ECHO REST endpoints for facility search, compliance, and enforcement data.
// Base URL: https://echodata.epa.gov/echo
// Auth: None required — public EPA data API
// Docs: https://echo.epa.gov/tools/web-services
// Source: https://ofmpub.epa.gov/echo/swaggerx.swagger_json?p_prefix=ECHO
// Data: CAA, CWA, RCRA, SDWA compliance and enforcement for 1M+ regulated US facilities
//
// Recommended usage: call get_facilities or get_facility_info to search, then use the
// returned QID with get_qid (paginate), get_map (spatial clusters), or get_download (CSV export).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EpaEchoConfig {
  /** Optional base URL override (default: https://echodata.epa.gov/echo) */
  baseUrl?: string;
}

export class EpaEchoMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: EpaEchoConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://echodata.epa.gov/echo';
  }

  static catalog() {
    return {
      name: 'epa-echo',
      displayName: 'EPA ECHO Compliance & Enforcement',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'epa', 'echo', 'compliance', 'enforcement', 'facility', 'environment',
        'clean air act', 'caa', 'clean water act', 'cwa', 'rcra', 'sdwa',
        'drinking water', 'hazardous waste', 'permit', 'violation', 'inspection',
        'penalty', 'government', 'regulation', 'npdes', 'air quality', 'water',
      ],
      toolNames: [
        'search_facilities',
        'get_facility_info',
        'get_qid_results',
        'get_map_clusters',
        'get_geojson',
        'get_info_clusters',
        'download_facilities',
        'get_metadata',
      ],
      description: 'EPA Enforcement and Compliance History Online (ECHO) — search and retrieve compliance and enforcement data for 1M+ facilities regulated under Clean Air Act, Clean Water Act, RCRA hazardous waste, and Safe Drinking Water Act.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_facilities',
        description: 'Search EPA ECHO for regulated facilities across all media (air, water, hazardous waste). Returns summary statistics and a query ID (QID) for paginating results via get_qid_results.',
        inputSchema: {
          type: 'object',
          properties: {
            p_fn: {
              type: 'string',
              description: 'Facility name filter (partial or full, case-insensitive)',
            },
            p_sa: {
              type: 'string',
              description: 'Facility street address (partial or complete)',
            },
            p_ct: {
              type: 'string',
              description: 'City name filter (single city, case-insensitive)',
            },
            p_co: {
              type: 'string',
              description: 'County name filter (use with p_st)',
            },
            p_st: {
              type: 'string',
              description: 'State filter — one or more USPS postal abbreviations (e.g. "MA", "CA,TX")',
            },
            p_zip: {
              type: 'string',
              description: '5-digit ZIP code filter — one or more comma-separated ZIP codes',
            },
            p_fips: {
              type: 'string',
              description: '5-character FIPS code filter',
            },
            p_reg: {
              type: 'string',
              description: 'EPA Region filter — single value 01 through 10',
            },
            p_sic: {
              type: 'string',
              description: 'Standard Industrial Classification (SIC) code filter (4-digit)',
            },
            p_ncs: {
              type: 'string',
              description: 'North American Industry Classification System (NAICS) code filter (2-6 digits)',
            },
            p_med: {
              type: 'string',
              description: 'Filter by media: A=Air, W=Water, R=RCRA, D=Drinking Water, E=EPCRA, etc.',
            },
            p_act: {
              type: 'string',
              description: 'Active permits/facilities flag: Y=active only, N=inactive only',
            },
            p_maj: {
              type: 'string',
              description: 'Major facility flag: Y to restrict to major facilities only',
            },
            p_lat: {
              type: 'number',
              description: 'Latitude in decimal degrees for proximity search (use with p_long and p_radius)',
            },
            p_long: {
              type: 'number',
              description: 'Longitude in decimal degrees for proximity search',
            },
            p_radius: {
              type: 'number',
              description: 'Search radius in miles (up to 100) for proximity search around p_lat/p_long',
            },
            p_c1lat: {
              type: 'number',
              description: 'Latitude of first corner of bounding box',
            },
            p_c1lon: {
              type: 'number',
              description: 'Longitude of first corner of bounding box',
            },
            p_c2lat: {
              type: 'number',
              description: 'Latitude of second corner of bounding box',
            },
            p_c2lon: {
              type: 'number',
              description: 'Longitude of second corner of bounding box',
            },
            p_huc: {
              type: 'string',
              description: '2-, 4-, 6-, or 8-character watershed HUC code',
            },
            p_fea: {
              type: 'string',
              description: 'Formal enforcement actions filter: W=within date range, N=not within date range',
            },
            p_feay: {
              type: 'number',
              description: 'Years (1-5) for formal enforcement action date range',
            },
            p_iea: {
              type: 'string',
              description: 'Informal enforcement actions filter: W=within date range, N=not within date range',
            },
            p_cs: {
              type: 'string',
              description: 'Compliance status limiter: 2=In Violation, 3=Significant Violation, 4=High Priority Violation',
            },
            p_qiv: {
              type: 'string',
              description: 'Quarters in noncompliance filter',
            },
            p_impw: {
              type: 'string',
              description: 'Discharging into impaired waters flag: Y to limit to such facilities',
            },
            p_qs: {
              type: 'string',
              description: 'Quick search — enter city, state, and/or ZIP code as free text',
            },
            queryset: {
              type: 'number',
              description: 'Limit the total number of records returned',
            },
            responseset: {
              type: 'number',
              description: 'Number of records per page (default varies)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_facility_info',
        description: 'Enhanced facility search returning either state/county/ZIP cluster summaries or an array of individual facility records with detailed compliance data. Accepts the same filters as search_facilities.',
        inputSchema: {
          type: 'object',
          properties: {
            p_fn: {
              type: 'string',
              description: 'Facility name filter (partial or full, case-insensitive)',
            },
            p_sa: {
              type: 'string',
              description: 'Facility street address (partial or complete)',
            },
            p_ct: {
              type: 'string',
              description: 'City name filter',
            },
            p_co: {
              type: 'string',
              description: 'County name filter (use with p_st)',
            },
            p_st: {
              type: 'string',
              description: 'State filter — USPS postal abbreviation(s)',
            },
            p_zip: {
              type: 'string',
              description: '5-digit ZIP code filter',
            },
            p_fips: {
              type: 'string',
              description: '5-character FIPS code filter',
            },
            p_reg: {
              type: 'string',
              description: 'EPA Region filter (01-10)',
            },
            p_sic: {
              type: 'string',
              description: 'SIC code filter (4-digit)',
            },
            p_ncs: {
              type: 'string',
              description: 'NAICS code filter (2-6 digits)',
            },
            p_lat: {
              type: 'number',
              description: 'Latitude for proximity search',
            },
            p_long: {
              type: 'number',
              description: 'Longitude for proximity search',
            },
            p_radius: {
              type: 'number',
              description: 'Search radius in miles (up to 100)',
            },
            xmin: {
              type: 'number',
              description: 'Minimum longitude of bounding box',
            },
            ymin: {
              type: 'number',
              description: 'Minimum latitude of bounding box',
            },
            xmax: {
              type: 'number',
              description: 'Maximum longitude of bounding box',
            },
            ymax: {
              type: 'number',
              description: 'Maximum latitude of bounding box',
            },
            p_act: {
              type: 'string',
              description: 'Active permits/facilities flag: Y or N',
            },
            p_maj: {
              type: 'string',
              description: 'Major facility flag: Y for major facilities only',
            },
            p_med: {
              type: 'string',
              description: 'Media filter: A=Air, W=Water, R=RCRA, D=Drinking Water',
            },
            responseset: {
              type: 'number',
              description: 'Number of records per page',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_qid_results',
        description: 'Paginate through facility results using a Query ID (QID) returned from search_facilities. Use pageno to step through pages.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID (QID) from a previous search_facilities call. Required.',
            },
            pageno: {
              type: 'number',
              description: 'Page number to retrieve (1-based). Default: 1.',
            },
            newsort: {
              type: 'number',
              description: 'Column number to sort results by',
            },
            descending: {
              type: 'string',
              description: 'Sort descending flag: Y to sort descending',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_map_clusters',
        description: 'Retrieve clustered and individual facility map coordinates for a QID — used to render spatial results on a map. Optionally filter to a bounding box.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID (QID) from a previous search_facilities call. Required.',
            },
            p_id: {
              type: 'string',
              description: 'Facility identifier for single-facility map view',
            },
            c1_lat: {
              type: 'number',
              description: 'Latitude of first corner of bounding box for map view',
            },
            c1_long: {
              type: 'number',
              description: 'Longitude of first corner of bounding box for map view',
            },
            c2_lat: {
              type: 'number',
              description: 'Latitude of second corner of bounding box for map view',
            },
            c2_long: {
              type: 'number',
              description: 'Longitude of second corner of bounding box for map view',
            },
            tablelist: {
              type: 'string',
              description: 'Table list flag: Y to include first page of facility results',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_geojson',
        description: 'Retrieve GeoJSON-formatted facility locations for a QID — suitable for mapping in GIS tools or web maps',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID (QID) from a previous search_facilities call. Required.',
            },
            newsort: {
              type: 'number',
              description: 'Column number to sort results by',
            },
            descending: {
              type: 'string',
              description: 'Sort descending flag: Y to sort descending',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_info_clusters',
        description: 'Retrieve info cluster data (geographic cluster summaries) for a QID — returns cluster centroids with facility counts',
        inputSchema: {
          type: 'object',
          properties: {
            p_qid: {
              type: 'string',
              description: 'Query ID (QID) from a previous search_facilities call. Required.',
            },
          },
          required: ['p_qid'],
        },
      },
      {
        name: 'download_facilities',
        description: 'Generate a CSV file of facility data for a QID — returns downloadable compliance and enforcement data for all matching facilities',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID (QID) from a previous search_facilities call. Required.',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_metadata',
        description: 'Retrieve ECHO metadata — lists all available output column IDs and their definitions, used to customize search result columns via the qcolumns parameter',
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
        case 'search_facilities':
          return this.searchFacilities(args);
        case 'get_facility_info':
          return this.getFacilityInfo(args);
        case 'get_qid_results':
          return this.getQidResults(args);
        case 'get_map_clusters':
          return this.getMapClusters(args);
        case 'get_geojson':
          return this.getGeojson(args);
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

  private buildUrl(path: string, params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, v);
    }
    const query = qs.toString();
    return `${this.baseUrl}${path}${query ? '?' + query : ''}`;
  }

  private async fetchGet(path: string, params: Record<string, string | undefined>): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json') || contentType.includes('text/json')) {
      let data: unknown;
      try { data = await response.json(); } catch { throw new Error(`EPA ECHO returned non-JSON (HTTP ${response.status})`); }
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private strOpt(val: unknown): string | undefined {
    return val !== undefined && val !== null ? String(val) : undefined;
  }

  private async searchFacilities(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet('/echo_rest_services.get_facilities', {
      p_fn: this.strOpt(args.p_fn),
      p_sa: this.strOpt(args.p_sa),
      p_ct: this.strOpt(args.p_ct),
      p_co: this.strOpt(args.p_co),
      p_st: this.strOpt(args.p_st),
      p_zip: this.strOpt(args.p_zip),
      p_fips: this.strOpt(args.p_fips),
      p_reg: this.strOpt(args.p_reg),
      p_sic: this.strOpt(args.p_sic),
      p_ncs: this.strOpt(args.p_ncs),
      p_med: this.strOpt(args.p_med),
      p_act: this.strOpt(args.p_act),
      p_maj: this.strOpt(args.p_maj),
      p_lat: this.strOpt(args.p_lat),
      p_long: this.strOpt(args.p_long),
      p_radius: this.strOpt(args.p_radius),
      p_c1lat: this.strOpt(args.p_c1lat),
      p_c1lon: this.strOpt(args.p_c1lon),
      p_c2lat: this.strOpt(args.p_c2lat),
      p_c2lon: this.strOpt(args.p_c2lon),
      p_huc: this.strOpt(args.p_huc),
      p_fea: this.strOpt(args.p_fea),
      p_feay: this.strOpt(args.p_feay),
      p_iea: this.strOpt(args.p_iea),
      p_cs: this.strOpt(args.p_cs),
      p_qiv: this.strOpt(args.p_qiv),
      p_impw: this.strOpt(args.p_impw),
      p_qs: this.strOpt(args.p_qs),
      queryset: this.strOpt(args.queryset),
      responseset: this.strOpt(args.responseset),
      output: 'JSON',
    });
  }

  private async getFacilityInfo(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet('/echo_rest_services.get_facility_info', {
      p_fn: this.strOpt(args.p_fn),
      p_sa: this.strOpt(args.p_sa),
      p_ct: this.strOpt(args.p_ct),
      p_co: this.strOpt(args.p_co),
      p_st: this.strOpt(args.p_st),
      p_zip: this.strOpt(args.p_zip),
      p_fips: this.strOpt(args.p_fips),
      p_reg: this.strOpt(args.p_reg),
      p_sic: this.strOpt(args.p_sic),
      p_ncs: this.strOpt(args.p_ncs),
      p_lat: this.strOpt(args.p_lat),
      p_long: this.strOpt(args.p_long),
      p_radius: this.strOpt(args.p_radius),
      xmin: this.strOpt(args.xmin),
      ymin: this.strOpt(args.ymin),
      xmax: this.strOpt(args.xmax),
      ymax: this.strOpt(args.ymax),
      p_act: this.strOpt(args.p_act),
      p_maj: this.strOpt(args.p_maj),
      p_med: this.strOpt(args.p_med),
      responseset: this.strOpt(args.responseset),
      output: 'JSON',
    });
  }

  private async getQidResults(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    return this.fetchGet('/echo_rest_services.get_qid', {
      qid: args.qid as string,
      pageno: this.strOpt(args.pageno),
      newsort: this.strOpt(args.newsort),
      descending: this.strOpt(args.descending),
      output: 'JSON',
    });
  }

  private async getMapClusters(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    return this.fetchGet('/echo_rest_services.get_map', {
      qid: args.qid as string,
      p_id: this.strOpt(args.p_id),
      c1_lat: this.strOpt(args.c1_lat),
      c1_long: this.strOpt(args.c1_long),
      c2_lat: this.strOpt(args.c2_lat),
      c2_long: this.strOpt(args.c2_long),
      tablelist: this.strOpt(args.tablelist),
      output: 'JSON',
    });
  }

  private async getGeojson(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    return this.fetchGet('/echo_rest_services.get_geojson', {
      qid: args.qid as string,
      newsort: this.strOpt(args.newsort),
      descending: this.strOpt(args.descending),
    });
  }

  private async getInfoClusters(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.p_qid) return { content: [{ type: 'text', text: 'p_qid is required' }], isError: true };
    return this.fetchGet('/echo_rest_services.get_info_clusters', {
      p_qid: args.p_qid as string,
      output: 'JSON',
    });
  }

  private async downloadFacilities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    return this.fetchGet('/echo_rest_services.get_download', {
      qid: args.qid as string,
    });
  }

  private async getMetadata(): Promise<ToolResult> {
    return this.fetchGet('/echo_rest_services.metadata', {
      output: 'JSON',
    });
  }
}
