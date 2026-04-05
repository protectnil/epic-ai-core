/**
 * EPA EFF (Effluent Charting and Reporting) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// No official vendor MCP server exists for EPA EFF.
// This adapter covers the 3 core effluent charting endpoints plus the CWA parameter lookup.
// Base URL: https://echodata.epa.gov/echo
// Auth: None required — public EPA data API
// Docs: https://echo.epa.gov/tools/web-services
// Source: https://ofmpub.epa.gov/echo/swaggerx.swagger_json?p_prefix=EFF
// Data: CWA NPDES discharge monitoring reports, effluent limits, and violations

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EpaEffConfig {
  /** Optional base URL override (default: https://echodata.epa.gov/echo) */
  baseUrl?: string;
}

export class EpaEffMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: EpaEffConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://echodata.epa.gov/echo';
  }

  static catalog() {
    return {
      name: 'epa-eff',
      displayName: 'EPA ECHO Effluent Charting',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'epa', 'echo', 'effluent', 'npdes', 'cwa', 'clean water act', 'discharge',
        'wastewater', 'permit', 'pollution', 'violation', 'monitoring', 'dmr',
        'outfall', 'effluent limits', 'water quality', 'compliance', 'government',
      ],
      toolNames: [
        'get_summary_chart',
        'get_effluent_chart',
        'download_effluent_chart',
        'lookup_cwa_parameters',
      ],
      description: 'EPA Enforcement and Compliance History Online (ECHO) Effluent Charts — retrieve permitted effluent limits, discharge monitoring reports, and NPDES violations for CWA wastewater discharge permits.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_summary_chart',
        description: 'Retrieve a summary matrix of effluent parameters by outfall and overall violation status for an NPDES permit over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'NPDES permit identifier (e.g. "MA0001236"). Required.',
            },
            start_date: {
              type: 'string',
              description: 'Start date in mm/dd/yyyy format for the date range of interest',
            },
            end_date: {
              type: 'string',
              description: 'End date in mm/dd/yyyy format for the date range of interest',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON (default) or XML',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'get_effluent_chart',
        description: 'Retrieve detailed discharge limit, DMR (Discharge Monitoring Report), and NPDES violation data for an NPDES permit — filter by date range, effluent parameter, or outfall',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'NPDES permit identifier (e.g. "MA0001236"). Required.',
            },
            outfall: {
              type: 'string',
              description: 'Three-character outfall code identifying the point of discharge (e.g. "001")',
            },
            parameter_code: {
              type: 'string',
              description: 'Five-digit numeric code identifying the effluent parameter (e.g. "00310" for BOD). Use lookup_cwa_parameters to find codes.',
            },
            start_date: {
              type: 'string',
              description: 'Start date in mm/dd/yyyy format',
            },
            end_date: {
              type: 'string',
              description: 'End date in mm/dd/yyyy format',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON (default) or XML',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'download_effluent_chart',
        description: 'Generate a CSV download of detailed effluent chart data (discharge limits, DMR values, violations) for an NPDES permit — same filters as get_effluent_chart',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'NPDES permit identifier (e.g. "MA0001236"). Required.',
            },
            outfall: {
              type: 'string',
              description: 'Three-character outfall code identifying the point of discharge (e.g. "001")',
            },
            parameter_code: {
              type: 'string',
              description: 'Five-digit numeric code identifying the effluent parameter. Use lookup_cwa_parameters to find codes.',
            },
            start_date: {
              type: 'string',
              description: 'Start date in mm/dd/yyyy format',
            },
            end_date: {
              type: 'string',
              description: 'End date in mm/dd/yyyy format',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'lookup_cwa_parameters',
        description: 'Look up Clean Water Act (CWA) effluent parameter codes and descriptions — use results to filter get_effluent_chart by parameter_code',
        inputSchema: {
          type: 'object',
          properties: {
            search_term: {
              type: 'string',
              description: 'Partial or complete parameter name to search (e.g. "oxygen", "nitrogen", "phosphorus")',
            },
            search_code: {
              type: 'string',
              description: 'Partial or complete parameter code to search (e.g. "003")',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON (default) or XML',
            },
          },
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_summary_chart':
          return this.getSummaryChart(args);
        case 'get_effluent_chart':
          return this.getEffluentChart(args);
        case 'download_effluent_chart':
          return this.downloadEffluentChart(args);
        case 'lookup_cwa_parameters':
          return this.lookupCwaParameters(args);
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
      try { data = await response.json(); } catch { throw new Error(`EPA EFF returned non-JSON (HTTP ${response.status})`); }
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    }
    const text = await response.text();
    return { content: [{ type: 'text', text: this.truncate(text) }], isError: false };
  }

  private async getSummaryChart(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.p_id) return { content: [{ type: 'text', text: 'p_id (NPDES permit ID) is required' }], isError: true };
    return this.fetchGet('/eff_rest_services.get_summary_chart', {
      p_id: args.p_id as string,
      p_start_date: args.start_date as string | undefined,
      p_end_date: args.end_date as string | undefined,
      output: (args.output as string) ?? 'JSON',
    });
  }

  private async getEffluentChart(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.p_id) return { content: [{ type: 'text', text: 'p_id (NPDES permit ID) is required' }], isError: true };
    return this.fetchGet('/eff_rest_services.get_effluent_chart', {
      p_id: args.p_id as string,
      p_outfall: args.outfall as string | undefined,
      p_parameter_code: args.parameter_code as string | undefined,
      p_start_date: args.start_date as string | undefined,
      p_end_date: args.end_date as string | undefined,
      output: (args.output as string) ?? 'JSON',
    });
  }

  private async downloadEffluentChart(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.p_id) return { content: [{ type: 'text', text: 'p_id (NPDES permit ID) is required' }], isError: true };
    return this.fetchGet('/eff_rest_services.download_effluent_chart', {
      p_id: args.p_id as string,
      p_outfall: args.outfall as string | undefined,
      p_parameter_code: args.parameter_code as string | undefined,
      p_start_date: args.start_date as string | undefined,
      p_end_date: args.end_date as string | undefined,
    });
  }

  private async lookupCwaParameters(args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchGet('/rest_lookups.cwa_parameters', {
      p_search_term: args.search_term as string | undefined,
      p_search_code: args.search_code as string | undefined,
      output: (args.output as string) ?? 'JSON',
    });
  }
}
