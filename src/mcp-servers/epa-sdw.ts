/**
 * EPA Safe Drinking Water (SDW) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official EPA SDW MCP server was found on GitHub or the MCP registry.
//
// Base URL: https://echodata.epa.gov/echo
// Auth: No authentication required — public US government API.
// Docs: https://echo.epa.gov/tools/web-services
// Source: Enforcement and Compliance History Online (ECHO), EPA OECA
// API covers: Safe Drinking Water Act (SDWA) public water systems via SDWIS database.
// Workflow: call search_water_systems → get QID → paginate with get_paginated_results → download with download_water_systems.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EpaSdwConfig {
  baseUrl?: string;
}

export class EpaSdwMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: EpaSdwConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://echodata.epa.gov/echo';
  }

  static catalog() {
    return {
      name: 'epa-sdw',
      displayName: 'EPA Safe Drinking Water (ECHO SDW)',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'EPA', 'safe drinking water', 'SDWA', 'SDWIS', 'public water system',
        'drinking water', 'water quality', 'violations', 'compliance', 'ECHO',
        'enforcement', 'water system', 'contaminant', 'lead', 'copper',
      ],
      toolNames: [
        'search_water_systems',
        'get_paginated_results',
        'download_water_systems',
        'get_metadata',
      ],
      description: 'EPA ECHO Safe Drinking Water Act (SDWA) REST services: search public water systems, retrieve compliance and violation data, paginate results, and download CSV exports from the SDWIS database.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_water_systems',
        description: 'Search EPA public water systems regulated under the Safe Drinking Water Act. Returns a query ID (QID) for pagination plus summary statistics. Use get_paginated_results with the QID to retrieve actual records.',
        inputSchema: {
          type: 'object',
          properties: {
            p_fn: {
              type: 'string',
              description: 'Facility/system name filter (case-insensitive, partial match supported)',
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
            p_systyp: {
              type: 'string',
              description: 'Type of public water system: CWS=Community water system, NCWS=Non-community water system, NTNCWS=Non-transient non-community, TNCWS=Transient non-community',
            },
            p_swtyp: {
              type: 'string',
              description: 'Source water type: SW=Surface water, GW=Ground water, GU=Ground water under surface water influence, SWP=Purchased surface water, GWP=Purchased ground water',
            },
            p_act: {
              type: 'string',
              description: 'Active systems flag: Y=active only, N=inactive only',
            },
            p_cs: {
              type: 'string',
              description: 'Current violations filter: M=Monitoring and Reporting, H=Health-based, O=Other',
            },
            p_health: {
              type: 'string',
              description: 'Health-based violation flag: Y to include systems with health-based violations',
            },
            p_sv: {
              type: 'string',
              description: 'Serious Violator flag: Y to include facilities with unresolved serious violations',
            },
            p_pbale: {
              type: 'string',
              description: 'Lead Action Level Exceedance flag: Y to select systems with at least one lead action level exceedance',
            },
            p_cuale: {
              type: 'string',
              description: 'Copper Action Level Exceedance flag: Y to select systems with at least one copper action level exceedance',
            },
            p_pid: {
              type: 'string',
              description: 'Nine-digit permit IDs — up to 2000 comma-separated values',
            },
            p_ico: {
              type: 'string',
              description: 'Indian Country flag: Y or N to restrict to facilities inside/outside Indian country',
            },
            p_fea: {
              type: 'string',
              description: 'Formal enforcement actions indicator: W=within date range, N=not within date range',
            },
            p_feay: {
              type: 'number',
              description: 'Years range (1-5) for formal enforcement action date range',
            },
            p_iea: {
              type: 'string',
              description: 'Informal enforcement actions date range indicator: W=within, N=not within',
            },
            p_ieay: {
              type: 'number',
              description: 'Years range (1-5) for informal enforcement action date range',
            },
            p_ysl: {
              type: 'string',
              description: 'Last facility inspection date range indicator: W=within, N=not within',
            },
            p_ysly: {
              type: 'string',
              description: 'Number of years (1-5) since last facility inspection',
            },
            p_idt1: {
              type: 'string',
              description: 'Beginning of date range for most recent facility inspection (MM/DD/YYYY)',
            },
            p_idt2: {
              type: 'string',
              description: 'End of date range for most recent facility inspection (MM/DD/YYYY)',
            },
            p_qiv: {
              type: 'string',
              description: 'Quarters in noncompliance limiter',
            },
            p_owop: {
              type: 'string',
              description: 'Owner/Operator code filter',
            },
            p_popsv: {
              type: 'string',
              description: 'Estimated average daily population served: LE500=500 or less, etc.',
            },
            p_qs: {
              type: 'string',
              description: 'Quick Search — city, state, and/or zip code combined',
            },
            p_sfs: {
              type: 'string',
              description: 'Single Facility Search — facility name or program system identifier',
            },
            queryset: {
              type: 'number',
              description: 'Query limiter — maximum total records returned',
            },
            responseset: {
              type: 'number',
              description: 'Response set limiter — records per page (default 100)',
            },
            qcolumns: {
              type: 'string',
              description: 'Comma-separated column IDs to customize output fields',
            },
          },
        },
      },
      {
        name: 'get_paginated_results',
        description: 'Paginate through water system results from a prior search. Requires a QID returned by search_water_systems. Use pageno to step through pages.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from a prior search_water_systems call (valid ~30 minutes)',
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
              description: 'Enter Y to sort descending on the column specified in newsort',
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
        name: 'download_water_systems',
        description: 'Generate a CSV download of water system results matching a prior search query. Requires a QID returned by search_water_systems.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from a prior search_water_systems call (valid ~30 minutes)',
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
        description: 'Retrieve metadata for the EPA ECHO SDW service — lists all available output columns with their IDs and definitions for use with the qcolumns parameter.',
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
        case 'search_water_systems':
          return this.searchWaterSystems(args);
        case 'get_paginated_results':
          return this.getPaginatedResults(args);
        case 'download_water_systems':
          return this.downloadWaterSystems(args);
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

  private async searchWaterSystems(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildStringParams(args, [
      'p_fn', 'p_ct', 'p_st', 'p_zip', 'p_co', 'p_fips', 'p_reg', 'p_systyp',
      'p_swtyp', 'p_act', 'p_cs', 'p_health', 'p_sv', 'p_pbale', 'p_cuale',
      'p_pid', 'p_ico', 'p_fea', 'p_feay', 'p_iea', 'p_ieay', 'p_ysl', 'p_ysly',
      'p_idt1', 'p_idt2', 'p_qiv', 'p_owop', 'p_popsv', 'p_qs', 'p_sfs',
      'p_mr', 'p_other', 'p_pn', 'p_pbv', 'p_cuv', 'p_lcrv', 'p_rc350v',
      'p_feaa', 'p_ieaa', 'p_qis', 'p_pfead1', 'p_pfead2', 'p_pfeat',
      'p_ss5yr', 'p_sdc', 'p_ysla', 'p_cms_flag', 'p_trb', 'p_pswpol', 'p_pswvio',
      'queryset', 'responseset', 'qcolumns',
    ]);
    return this.echoGet('sdw_rest_services.get_systems', params);
  }

  private async getPaginatedResults(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) {
      return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    }
    const params = this.buildStringParams(args, ['qid', 'pageno', 'newsort', 'descending', 'qcolumns']);
    return this.echoGet('sdw_rest_services.get_qid', params);
  }

  private async downloadWaterSystems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) {
      return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    }
    const params = this.buildStringParams(args, ['qid', 'qcolumns']);
    params.output = 'CSV';
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/sdw_rest_services.get_download?${qs}`;
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
    return this.echoGet('sdw_rest_services.metadata', {});
  }
}
