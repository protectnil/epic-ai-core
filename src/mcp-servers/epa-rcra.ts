/**
 * EPA Resource Conservation and Recovery Act (RCRA) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official EPA RCRA MCP server was found on GitHub or the MCP registry.
//
// Base URL: https://echodata.epa.gov/echo
// Auth: No authentication required — public US government API.
// Docs: https://echo.epa.gov/tools/web-services
// Source: Enforcement and Compliance History Online (ECHO), EPA OECA
// API covers: Hazardous waste handlers/facilities regulated under RCRA via RCRAInfo database.
// Workflow: call search_facilities → get QID → paginate with get_paginated_results → download or map as needed.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EpaRcraConfig {
  baseUrl?: string;
}

export class EpaRcraMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: EpaRcraConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://echodata.epa.gov/echo';
  }

  static catalog() {
    return {
      name: 'epa-rcra',
      displayName: 'EPA Resource Conservation and Recovery Act (ECHO RCRA)',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'EPA', 'RCRA', 'hazardous waste', 'RCRAInfo', 'facility', 'compliance',
        'enforcement', 'ECHO', 'waste handler', 'toxic release', 'TRI',
        'environmental compliance', 'waste management', 'violation', 'inspection',
      ],
      toolNames: [
        'search_facilities',
        'get_facility_info',
        'get_paginated_results',
        'get_map_data',
        'get_geojson',
        'get_info_clusters',
        'download_facilities',
        'get_metadata',
      ],
      description: 'EPA ECHO Resource Conservation and Recovery Act (RCRA) REST services: search hazardous waste facilities, retrieve compliance and enforcement data, get map coordinates, and download exports from the RCRAInfo database.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_facilities',
        description: 'Search EPA hazardous waste facilities regulated under RCRA. Returns a query ID (QID) for pagination plus summary statistics. Use get_paginated_results with the QID to retrieve facility records.',
        inputSchema: {
          type: 'object',
          properties: {
            p_fn: {
              type: 'string',
              description: 'Facility name filter (case-insensitive, partial match)',
            },
            p_sa: {
              type: 'string',
              description: 'Facility street address (complete or partial)',
            },
            p_ct: {
              type: 'string',
              description: 'City filter (single city name)',
            },
            p_st: {
              type: 'string',
              description: 'State filter — one or more USPS postal abbreviations (e.g. "CA", "TX,FL")',
            },
            p_zip: {
              type: 'string',
              description: 'ZIP code filter — one or more 5-digit ZIP codes, comma-separated',
            },
            p_co: {
              type: 'string',
              description: 'County name filter — use with p_st',
            },
            p_fips: {
              type: 'string',
              description: 'FIPS code filter — single 5-character Federal Information Processing Standard code',
            },
            p_reg: {
              type: 'string',
              description: 'EPA Region filter — single value 01 through 10',
            },
            p_frs: {
              type: 'string',
              description: 'Facility Registry Service ID — single 12-digit FRS identifier',
            },
            p_sic: {
              type: 'string',
              description: 'Standard Industrial Classification (SIC) code — single 4-digit code',
            },
            p_ncs: {
              type: 'string',
              description: 'North American Industry Classification System (NAICS) code — 2 to 6 digits',
            },
            p_act: {
              type: 'string',
              description: 'Active facilities flag: Y=active only, N=inactive only',
            },
            p_cmps: {
              type: 'string',
              description: 'RCRA current compliance status limiter — one or more keyword codes',
            },
            p_violt: {
              type: 'string',
              description: 'RCRA violation type — one or more Resource Conservation and Recovery Act violation type codes',
            },
            p_des: {
              type: 'string',
              description: 'Universe designation limiter — one or more universe designation codes',
            },
            p_qiv: {
              type: 'string',
              description: 'Quarters in noncompliance limiter',
            },
            p_fea: {
              type: 'string',
              description: 'Formal enforcement actions indicator: W=within date range, N=not within date range',
            },
            p_feay: {
              type: 'number',
              description: 'Years range (1-5) for formal enforcement action date range',
            },
            p_feaa: {
              type: 'string',
              description: 'Agency for formal enforcement actions: E=EPA, S=State, A=All',
            },
            p_iea: {
              type: 'string',
              description: 'Informal enforcement actions date range indicator: W=within, N=not within',
            },
            p_ieay: {
              type: 'number',
              description: 'Years range (1-5) for informal enforcement action date range',
            },
            p_ieaa: {
              type: 'string',
              description: 'Agency for informal enforcement actions: E=EPA, S=State (blank=all)',
            },
            p_ysl: {
              type: 'string',
              description: 'Last facility inspection date range indicator: W=within, N=not within',
            },
            p_ysly: {
              type: 'number',
              description: 'Number of years (1-5) since last facility inspection',
            },
            p_ysla: {
              type: 'string',
              description: 'Facility last inspection code filter',
            },
            p_idt1: {
              type: 'string',
              description: 'Beginning of date range for most recent facility inspection (MM/DD/YYYY)',
            },
            p_idt2: {
              type: 'string',
              description: 'End of date range for most recent facility inspection (MM/DD/YYYY)',
            },
            p_pityp: {
              type: 'string',
              description: 'Inspection type codes (e.g. CAC=Corrective Action Inspection, CAV=Compliance Assistance Visit)',
            },
            p_pfead1: {
              type: 'string',
              description: 'Formal enforcement action date range start (MM/DD/YYYY)',
            },
            p_pfead2: {
              type: 'string',
              description: 'Formal enforcement action date range end (MM/DD/YYYY)',
            },
            p_pfeat: {
              type: 'string',
              description: 'Formal enforcement action (FEA) code filter — one or more three-letter codes',
            },
            p_psncq: {
              type: 'string',
              description: 'Quarters in significant noncompliance limiter',
            },
            p_violy: {
              type: 'number',
              description: 'Years since last violation limiter — enter GTXX format where XX is number of years',
            },
            p_ncv: {
              type: 'string',
              description: 'Number of current violations limiter — enter GTXX format',
            },
            p_fcv: {
              type: 'string',
              description: 'Years of continuing violations limiter — enter GTXX format',
            },
            p_lat: {
              type: 'number',
              description: 'Latitude for spatial search in decimal degrees',
            },
            p_long: {
              type: 'number',
              description: 'Longitude for spatial search in decimal degrees',
            },
            p_radius: {
              type: 'number',
              description: 'Spatial search radius in miles (up to 100)',
            },
            p_c1lat: {
              type: 'number',
              description: 'Latitude of 1st corner of bounding box in decimal degrees',
            },
            p_c1lon: {
              type: 'number',
              description: 'Longitude of 1st corner of bounding box in decimal degrees',
            },
            p_c2lat: {
              type: 'number',
              description: 'Latitude of 2nd corner of bounding box in decimal degrees',
            },
            p_c2lon: {
              type: 'number',
              description: 'Longitude of 2nd corner of bounding box in decimal degrees',
            },
            p_ico: {
              type: 'string',
              description: 'Indian Country flag: Y or N',
            },
            p_huc: {
              type: 'string',
              description: 'Watershed code — 2, 4, 6, or 8-character HUC code, comma-separated',
            },
            p_pid: {
              type: 'string',
              description: 'Nine-digit permit IDs — up to 2000 comma-separated values',
            },
            p_med: {
              type: 'string',
              description: 'Filter by media: A=Air, M=RMP, R=RCRA, W=Water, etc.',
            },
            p_trep: {
              type: 'string',
              description: 'Current TRI reporter limiter',
            },
            p_impw: {
              type: 'string',
              description: 'Discharging into impaired waters flag: Y to limit to such facilities',
            },
            p_pm: {
              type: 'string',
              description: 'Percent minority population limiter',
            },
            p_pd: {
              type: 'string',
              description: 'Population density limiter (per sq mile)',
            },
            p_ejscreen: {
              type: 'string',
              description: 'Enter Y to limit to Census block groups with Environmental Justice Indicators above the 80th percentile',
            },
            p_qs: {
              type: 'string',
              description: 'Quick Search — city, state, and/or zip code combined',
            },
            p_sfs: {
              type: 'string',
              description: 'Single Facility Search — facility name or program system identifier',
            },
            p_usmex: {
              type: 'string',
              description: 'US-Mexico Border Flag: Y/N to restrict to facilities within the US-Mexico border region',
            },
            p_fa: {
              type: 'string',
              description: 'Federal Agency code — 1 or 5-character values, comma-separated',
            },
            p_owop: {
              type: 'string',
              description: 'Owner/Operator code filter',
            },
            p_tribeid: {
              type: 'number',
              description: 'Numeric code for tribe (or list of tribes)',
            },
            p_tribename: {
              type: 'string',
              description: 'Tribe name filter',
            },
            p_tribedist: {
              type: 'number',
              description: 'Proximity to tribal land in miles (0-25)',
            },
            p_pen: {
              type: 'string',
              description: 'Last penalty date qualifier: NEVER, GT1Y, GT2Y, GT3Y, GT4Y, GT5Y, LT1Y',
            },
            p_dwd: {
              type: 'string',
              description: 'Direct water discharges — pounds of toxic chemicals released directly to surface water',
            },
            queryset: {
              type: 'number',
              description: 'Query limiter — maximum total records returned',
            },
            responseset: {
              type: 'number',
              description: 'Response set limiter — records per page (default 100)',
            },
            tablelist: {
              type: 'string',
              description: 'Table List Flag: Y to display first page of facility results',
            },
            summarylist: {
              type: 'string',
              description: 'Summary List Flag: Y to return summary statistics',
            },
            qcolumns: {
              type: 'string',
              description: 'Comma-separated column IDs to customize output fields',
            },
          },
        },
      },
      {
        name: 'get_facility_info',
        description: 'Enhanced RCRA facility search — returns either state/county/zip clusters with summary statistics, or an array of facilities. Self-contained endpoint that does not require a QID workflow.',
        inputSchema: {
          type: 'object',
          properties: {
            p_fn: {
              type: 'string',
              description: 'Facility name filter (case-insensitive, partial match)',
            },
            p_sa: {
              type: 'string',
              description: 'Facility street address',
            },
            p_ct: {
              type: 'string',
              description: 'City filter',
            },
            p_st: {
              type: 'string',
              description: 'State filter — USPS postal abbreviations',
            },
            p_zip: {
              type: 'string',
              description: 'ZIP code filter — 5-digit codes, comma-separated',
            },
            p_fips: {
              type: 'string',
              description: 'FIPS code filter',
            },
            p_reg: {
              type: 'string',
              description: 'EPA Region filter (01-10)',
            },
            p_lat: {
              type: 'number',
              description: 'Latitude for spatial search in decimal degrees',
            },
            p_long: {
              type: 'number',
              description: 'Longitude for spatial search in decimal degrees',
            },
            p_radius: {
              type: 'number',
              description: 'Spatial search radius in miles (up to 100)',
            },
            xmin: {
              type: 'number',
              description: 'Minimum longitude (bounding box) in decimal degrees',
            },
            ymin: {
              type: 'number',
              description: 'Minimum latitude (bounding box) in decimal degrees',
            },
            xmax: {
              type: 'number',
              description: 'Maximum longitude (bounding box) in decimal degrees',
            },
            ymax: {
              type: 'number',
              description: 'Maximum latitude (bounding box) in decimal degrees',
            },
            p_sic: {
              type: 'string',
              description: 'SIC code filter',
            },
            p_act: {
              type: 'string',
              description: 'Active facilities flag: Y or N',
            },
            p_cmps: {
              type: 'string',
              description: 'RCRA current compliance status',
            },
            p_qiv: {
              type: 'string',
              description: 'Quarters in noncompliance limiter',
            },
            p_violt: {
              type: 'string',
              description: 'RCRA violation type codes',
            },
            p_des: {
              type: 'string',
              description: 'Universe designation codes',
            },
            queryset: {
              type: 'number',
              description: 'Query limiter — maximum total records',
            },
            responseset: {
              type: 'number',
              description: 'Records per page',
            },
            summarylist: {
              type: 'string',
              description: 'Summary List Flag: Y to return summary statistics',
            },
            qcolumns: {
              type: 'string',
              description: 'Comma-separated column IDs',
            },
          },
        },
      },
      {
        name: 'get_paginated_results',
        description: 'Paginate through RCRA facility results from a prior search_facilities call. Requires the QID returned by that search.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from a prior search_facilities call (valid ~30 minutes)',
            },
            pageno: {
              type: 'number',
              description: 'Page number to retrieve (default: 1)',
            },
            newsort: {
              type: 'number',
              description: 'Column number to sort results by',
            },
            descending: {
              type: 'string',
              description: 'Enter Y to sort descending on the column in newsort',
            },
            qcolumns: {
              type: 'string',
              description: 'Comma-separated column IDs to customize output fields',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_map_data',
        description: 'Retrieve clustered and individual facility map coordinates for facilities matching a prior search_facilities query. Returns coordinate data for map display.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from a prior search_facilities call',
            },
            p_id: {
              type: 'string',
              description: 'Identifier for the service',
            },
            c1_lat: {
              type: 'number',
              description: 'Latitude of 1st corner of visible map bounding box',
            },
            c1_long: {
              type: 'number',
              description: 'Longitude of 1st corner of visible map bounding box',
            },
            c2_lat: {
              type: 'number',
              description: 'Latitude of 2nd corner of visible map bounding box',
            },
            c2_long: {
              type: 'number',
              description: 'Longitude of 2nd corner of visible map bounding box',
            },
            tablelist: {
              type: 'string',
              description: 'Table List Flag: Y to display first page of facility results',
            },
          },
          required: ['qid', 'p_id'],
        },
      },
      {
        name: 'get_geojson',
        description: 'Retrieve GeoJSON-formatted facility coordinates for facilities matching a prior search_facilities query.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from a prior search_facilities call',
            },
            newsort: {
              type: 'number',
              description: 'Column number to sort results by',
            },
            descending: {
              type: 'string',
              description: 'Enter Y to sort descending',
            },
            qcolumns: {
              type: 'string',
              description: 'Comma-separated column IDs to customize output fields',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_info_clusters',
        description: 'Retrieve state, county, or ZIP cluster summary statistics for facilities matching a prior search_facilities query.',
        inputSchema: {
          type: 'object',
          properties: {
            p_qid: {
              type: 'string',
              description: 'Query ID from a prior search_facilities call',
            },
          },
          required: ['p_qid'],
        },
      },
      {
        name: 'download_facilities',
        description: 'Generate a CSV download of RCRA facility results matching a prior search query. Requires a QID from search_facilities.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from a prior search_facilities call',
            },
            qcolumns: {
              type: 'string',
              description: 'Comma-separated column IDs to customize output fields',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_metadata',
        description: 'Retrieve metadata for the EPA ECHO RCRA service — lists all available output columns with their IDs and definitions for use with the qcolumns parameter.',
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
        case 'get_paginated_results':
          return this.getPaginatedResults(args);
        case 'get_map_data':
          return this.getMapData(args);
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

  private async echoGet(path: string, params: Record<string, string>): Promise<ToolResult> {
    params.output = 'JSON';
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/${path}?${qs}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildStringParams(args: Record<string, unknown>, keys: string[]): Record<string, string> {
    const params: Record<string, string> = {};
    for (const key of keys) {
      if (args[key] !== undefined && args[key] !== null && args[key] !== '') {
        params[key] = String(args[key]);
      }
    }
    return params;
  }

  private async searchFacilities(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildStringParams(args, [
      'p_fn', 'p_sa', 'p_sa1', 'p_ct', 'p_co', 'p_fips', 'p_st', 'p_stdist',
      'p_zip', 'p_frs', 'p_reg', 'p_sic', 'p_ncs', 'p_pen', 'p_c1lat', 'p_c1lon',
      'p_c2lat', 'p_c2lon', 'p_usmex', 'p_sic2', 'p_sic4', 'p_fa', 'p_act',
      'p_fea', 'p_feay', 'p_feaa', 'p_iea', 'p_ieay', 'p_ieaa', 'p_cmps',
      'p_law', 'p_section', 'p_qiv', 'p_impw', 'p_trep', 'p_olr', 'p_oct',
      'p_trichem', 'p_tri_lr_pol', 'p_tri_lr_yr', 'p_tri_lr_amt',
      'p_pm', 'p_pd', 'p_ico', 'p_huc', 'p_wbd', 'p_pid', 'p_med',
      'p_owc', 'p_owd', 'p_opc', 'p_opd',
      'p_ysl', 'p_ysly', 'p_ysla', 'p_qs', 'p_sfs',
      'p_tribeid', 'p_tribename', 'p_tribedist', 'p_owop', 'p_agoo',
      'p_idt1', 'p_idt2', 'p_pityp', 'p_cifdi', 'p_pfead1', 'p_pfead2', 'p_pfeat',
      'p_psncq', 'p_dwd', 'p_violy', 'p_ncv', 'p_fcv', 'p_violt', 'p_des',
      'p_fntype', 'p_pidall', 'p_fac_ico', 'p_icoo', 'p_fac_icos',
      'p_ejscreen', 'p_limit_addr', 'p_lat', 'p_long', 'p_radius',
      'p_decouple', 'p_ejscreen_over80cnt',
      'queryset', 'responseset', 'tablelist', 'maplist', 'summarylist', 'qcolumns',
    ]);
    return this.echoGet('rcra_rest_services.get_facilities', params);
  }

  private async getFacilityInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildStringParams(args, [
      'p_fn', 'p_sa', 'p_sa1', 'p_ct', 'p_co', 'p_fips', 'p_st', 'p_stdist',
      'p_zip', 'p_frs', 'p_reg', 'p_sic', 'p_ncs', 'p_pen',
      'xmin', 'ymin', 'xmax', 'ymax',
      'p_usmex', 'p_sic2', 'p_sic4', 'p_fa', 'p_act',
      'p_fea', 'p_feay', 'p_feaa', 'p_iea', 'p_ieay', 'p_ieaa', 'p_cmps',
      'p_law', 'p_section', 'p_qiv', 'p_impw', 'p_trep', 'p_olr', 'p_oct',
      'p_trichem', 'p_tri_lr_pol', 'p_tri_lr_yr', 'p_tri_lr_amt',
      'p_pm', 'p_pd', 'p_ico', 'p_huc', 'p_wbd', 'p_pid', 'p_med',
      'p_owc', 'p_owd', 'p_opc', 'p_opd',
      'p_ysl', 'p_ysly', 'p_ysla', 'p_qs', 'p_sfs',
      'p_tribeid', 'p_tribename', 'p_tribedist', 'p_owop', 'p_agoo',
      'p_idt1', 'p_idt2', 'p_pityp', 'p_cifdi', 'p_pfead1', 'p_pfead2', 'p_pfeat',
      'p_psncq', 'p_dwd', 'p_violy', 'p_ncv', 'p_fcv', 'p_violt', 'p_des',
      'p_fntype', 'p_pidall', 'p_fac_ico', 'p_icoo', 'p_fac_icos',
      'p_ejscreen', 'p_limit_addr', 'p_lat', 'p_long', 'p_radius',
      'p_decouple', 'p_ejscreen_over80cnt',
      'queryset', 'responseset', 'summarylist', 'qcolumns',
    ]);
    return this.echoGet('rcra_rest_services.get_facility_info', params);
  }

  private async getPaginatedResults(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) {
      return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    }
    const params = this.buildStringParams(args, ['qid', 'pageno', 'newsort', 'descending', 'qcolumns']);
    return this.echoGet('rcra_rest_services.get_qid', params);
  }

  private async getMapData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) {
      return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    }
    if (!args.p_id) {
      return { content: [{ type: 'text', text: 'p_id is required' }], isError: true };
    }
    const params = this.buildStringParams(args, ['qid', 'p_id', 'tablelist', 'c1_lat', 'c1_long', 'c2_lat', 'c2_long']);
    return this.echoGet('rcra_rest_services.get_map', params);
  }

  private async getGeojson(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) {
      return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    }
    const params = this.buildStringParams(args, ['qid', 'newsort', 'descending', 'qcolumns']);
    params.output = 'GEOJSON';
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/rcra_rest_services.get_geojson?${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getInfoClusters(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.p_qid) {
      return { content: [{ type: 'text', text: 'p_qid is required' }], isError: true };
    }
    const params = this.buildStringParams(args, ['p_qid']);
    params.output = 'CSV';
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/rcra_rest_services.get_info_clusters?${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async downloadFacilities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) {
      return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    }
    const params = this.buildStringParams(args, ['qid', 'qcolumns']);
    params.output = 'CSV';
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/rcra_rest_services.get_download?${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async getMetadata(): Promise<ToolResult> {
    return this.echoGet('rcra_rest_services.metadata', {});
  }
}
