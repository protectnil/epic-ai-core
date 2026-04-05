/**
 * EPA ECHO Clean Water Act (CWA) REST Services MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28 — no official EPA ECHO MCP server exists.
// Our adapter covers: 10 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no official MCP exists.
//
// Base URL: https://echodata.epa.gov/echo
// Auth: None required — public API with no authentication.
// Docs: https://echo.epa.gov/tools/web-services
// Source: EPA ECHO (Enforcement and Compliance History Online) ICIS-NPDES database
// Rate limits: Not published. Reasonable request rates recommended.
// Data: Regulated facilities under the Clean Water Act (CWA) / NPDES program.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EPACWAConfig {
  baseUrl?: string;
}

export class EPACWAMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: EPACWAConfig = {}) {
    super();
    this.baseUrl = (config.baseUrl || 'https://echodata.epa.gov/echo').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'epa-cwa',
      displayName: 'EPA ECHO Clean Water Act',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'epa', 'echo', 'clean-water-act', 'cwa', 'npdes', 'water-quality',
        'compliance', 'enforcement', 'facilities', 'permits', 'discharge',
        'pollution', 'icis', 'watershed', 'pollutants', 'government',
      ],
      toolNames: [
        'search_cwa_facilities',
        'get_cwa_facility_info',
        'get_cwa_map_data',
        'get_cwa_qid_results',
        'get_cwa_download',
        'get_cwa_geojson',
        'get_cwa_info_clusters',
        'get_cwa_metadata',
        'lookup_cwa_parameters',
        'lookup_npdes_parameters',
      ],
      description: 'EPA Enforcement and Compliance History Online (ECHO) — Clean Water Act REST services: search NPDES-regulated facilities, retrieve compliance and enforcement data, map facilities, and look up CWA parameters and pollutants.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_cwa_facilities',
        description: 'Search for CWA/NPDES-regulated facilities by location, permit status, compliance status, or other criteria. Returns a query ID (QID) and summary stats for use with get_cwa_qid_results.',
        inputSchema: {
          type: 'object',
          properties: {
            p_fn: {
              type: 'string',
              description: 'Facility name (full or partial)',
            },
            p_sa: {
              type: 'string',
              description: 'Facility street address',
            },
            p_ct: {
              type: 'string',
              description: 'Facility city name',
            },
            p_co: {
              type: 'string',
              description: 'Facility county name',
            },
            p_st: {
              type: 'string',
              description: 'Two-letter state abbreviation (e.g. "CA", "TX")',
            },
            p_zip: {
              type: 'string',
              description: 'Facility zip code',
            },
            p_npdes: {
              type: 'string',
              description: 'NPDES permit ID',
            },
            p_act: {
              type: 'string',
              description: 'Active/inactive status: "Y" for active, "N" for inactive',
            },
            p_pen: {
              type: 'string',
              description: 'Penalty amount filter (e.g. ">10000")',
            },
            output: {
              type: 'string',
              description: 'Output format: "JSON" (default) or "XML"',
            },
          },
        },
      },
      {
        name: 'get_cwa_facility_info',
        description: 'Get detailed facility information or geographic cluster summaries for CWA-regulated sites. Self-contained endpoint that returns facility arrays or state/county/zip cluster stats.',
        inputSchema: {
          type: 'object',
          properties: {
            p_fn: {
              type: 'string',
              description: 'Facility name filter',
            },
            p_st: {
              type: 'string',
              description: 'Two-letter state abbreviation',
            },
            p_ct: {
              type: 'string',
              description: 'Facility city name',
            },
            p_co: {
              type: 'string',
              description: 'County name',
            },
            p_zip: {
              type: 'string',
              description: 'Zip code',
            },
            p_npdes: {
              type: 'string',
              description: 'NPDES permit ID',
            },
            p_act: {
              type: 'string',
              description: 'Active/inactive: "Y" or "N"',
            },
            output: {
              type: 'string',
              description: 'Output format: "JSON" (default) or "XML"',
            },
          },
        },
      },
      {
        name: 'get_cwa_map_data',
        description: 'Get clustered geographic coordinates of CWA facilities for map rendering. Use a QID from search_cwa_facilities to zoom/pan over facility locations.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID returned by search_cwa_facilities (valid ~30 minutes)',
            },
            p_id: {
              type: 'string',
              description: 'Cluster ID to drill into (returned in previous map calls)',
            },
            output: {
              type: 'string',
              description: 'Output format: "JSON" (default) or "XML"',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_cwa_qid_results',
        description: 'Paginate through facility results using a QID from search_cwa_facilities. Returns arrays of facility records.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from search_cwa_facilities (valid ~30 minutes)',
            },
            pageno: {
              type: 'number',
              description: 'Page number (default 1)',
            },
            output: {
              type: 'string',
              description: 'Output format: "JSON" (default) or "XML"',
            },
            qcolumns: {
              type: 'string',
              description: 'Comma-separated column IDs to include in output (see get_cwa_metadata for available columns)',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_cwa_download',
        description: 'Generate a CSV download of facility records matching a QID from search_cwa_facilities',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from search_cwa_facilities (valid ~30 minutes)',
            },
            qcolumns: {
              type: 'string',
              description: 'Comma-separated column IDs to include in the CSV download',
            },
            output: {
              type: 'string',
              description: 'Output format: "CSV" (default) or "JSON"',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_cwa_geojson',
        description: 'Get facility locations in GeoJSON format using a QID from search_cwa_facilities',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from search_cwa_facilities (valid ~30 minutes)',
            },
            qcolumns: {
              type: 'string',
              description: 'Comma-separated column IDs for GeoJSON feature properties',
            },
          },
          required: ['qid'],
        },
      },
      {
        name: 'get_cwa_info_clusters',
        description: 'Get summary cluster statistics (state, county, or zip level) for facilities matching search criteria',
        inputSchema: {
          type: 'object',
          properties: {
            p_st: {
              type: 'string',
              description: 'Two-letter state abbreviation',
            },
            p_ct: {
              type: 'string',
              description: 'City name',
            },
            p_co: {
              type: 'string',
              description: 'County name',
            },
            output: {
              type: 'string',
              description: 'Output format: "JSON" (default) or "XML"',
            },
          },
        },
      },
      {
        name: 'get_cwa_metadata',
        description: 'Get metadata for available CWA output columns — returns column IDs, names, and descriptions for use with qcolumns parameter',
        inputSchema: {
          type: 'object',
          properties: {
            output: {
              type: 'string',
              description: 'Output format: "JSON" (default) or "XML"',
            },
          },
        },
      },
      {
        name: 'lookup_cwa_parameters',
        description: 'Look up Clean Water Act parameter codes and names (pollutant codes used in NPDES permits)',
        inputSchema: {
          type: 'object',
          properties: {
            output: {
              type: 'string',
              description: 'Output format: "JSON" (default) or "XML"',
            },
          },
        },
      },
      {
        name: 'lookup_npdes_parameters',
        description: 'Look up NPDES-specific parameter codes for use in facility searches and compliance queries',
        inputSchema: {
          type: 'object',
          properties: {
            output: {
              type: 'string',
              description: 'Output format: "JSON" (default) or "XML"',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_cwa_facilities':
          return this.get('/cwa_rest_services.get_facilities', args);
        case 'get_cwa_facility_info':
          return this.get('/cwa_rest_services.get_facility_info', args);
        case 'get_cwa_map_data':
          return this.get('/cwa_rest_services.get_map', args);
        case 'get_cwa_qid_results':
          return this.get('/cwa_rest_services.get_qid', args);
        case 'get_cwa_download':
          return this.get('/cwa_rest_services.get_download', args);
        case 'get_cwa_geojson':
          return this.get('/cwa_rest_services.get_geojson', args);
        case 'get_cwa_info_clusters':
          return this.get('/cwa_rest_services.get_info_clusters', args);
        case 'get_cwa_metadata':
          return this.get('/cwa_rest_services.metadata', args);
        case 'lookup_cwa_parameters':
          return this.get('/rest_lookups.cwa_parameters', args);
        case 'lookup_npdes_parameters':
          return this.get('/rest_lookups.npdes_parameters', args);
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

  private async get(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    // Default to JSON output unless caller specifies otherwise
    params.output = 'JSON';
    for (const [k, v] of Object.entries(args)) {
      if (v !== undefined && v !== null) {
        params[k] = String(v);
      }
    }
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}?${qs}`;
    const response = await this.fetchWithRetry(url, {});
    if (!response.ok) {
      const text = await response.text();
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText} — ${text.slice(0, 500)}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
