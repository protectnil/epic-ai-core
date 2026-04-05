/**
 * EPA DFR (Detailed Facility Report) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official EPA DFR MCP server found on GitHub or the MCP registry.
//
// Base URL: https://echodata.epa.gov/echo
// Auth: No authentication required — public API.
// Docs: https://echo.epa.gov/tools/web-services
// Note: All endpoints accept GET requests with query parameters.
//       Primary endpoint: get_dfr returns the full Detailed Facility Report.
//       p_id is the EPA Facility Registry System REGISTRY_ID (required for facility endpoints).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EpaDfrConfig {
  baseUrl?: string;
}

export class EpaDfrMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: EpaDfrConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://echodata.epa.gov/echo';
  }

  static catalog() {
    return {
      name: 'epa-dfr',
      displayName: 'EPA Detailed Facility Report (DFR)',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'EPA', 'environment', 'compliance', 'enforcement', 'facility',
        'ECHO', 'DFR', 'air quality', 'water quality', 'RCRA', 'CWA',
        'SDWA', 'TRI', 'pollution', 'hazardous waste', 'permits',
        'inspection', 'violation', 'government', 'open data',
      ],
      toolNames: [
        'get_facility_report',
        'get_air_compliance',
        'get_air_quality',
        'get_water_quality',
        'get_compliance_summary',
        'get_enforcement_summary',
        'get_formal_actions',
        'get_inspections',
        'get_permits',
        'get_rcra_compliance',
      ],
      description: 'EPA ECHO Detailed Facility Report: retrieve compliance, enforcement, air/water quality, permits, inspections, and pollutant data for any regulated US facility.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_facility_report',
        description: 'Retrieve the full EPA Detailed Facility Report (DFR) for a facility — includes compliance history, enforcement actions, permits, air/water quality, and TRI releases in a single call',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'EPA Facility Registry System REGISTRY_ID or facility identifier from the regulated program (e.g. "110000350229")',
            },
            p_system: {
              type: 'string',
              description: 'System acronym filter (e.g. "AIR", "CWA", "RCRA", "SDWA", "TRI") — leave blank for all systems',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON (default) or CSV',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'get_air_compliance',
        description: 'Retrieve EPA air compliance data for a facility — includes air program inspection history, violations, and permit status',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'EPA Facility Registry System REGISTRY_ID',
            },
            p_system: {
              type: 'string',
              description: 'System acronym filter',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON or CSV (default: JSON)',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'get_air_quality',
        description: 'Retrieve air quality data for a facility from EPA ECHO — includes nearby monitor readings and air quality index information',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'EPA Facility Registry System REGISTRY_ID',
            },
            p_system: {
              type: 'string',
              description: 'System acronym filter',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON or CSV (default: JSON)',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'get_water_quality',
        description: 'Retrieve water quality data for a facility from EPA ECHO — includes nearby water body assessments and impairment information',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'EPA Facility Registry System REGISTRY_ID',
            },
            p_system: {
              type: 'string',
              description: 'System acronym filter',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON or CSV (default: JSON)',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'get_compliance_summary',
        description: 'Retrieve an EPA compliance summary for a facility — includes 5-year compliance monitoring history across all regulated programs',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'EPA Facility Registry System REGISTRY_ID',
            },
            p_system: {
              type: 'string',
              description: 'System acronym filter',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON or CSV (default: JSON)',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'get_enforcement_summary',
        description: 'Retrieve EPA enforcement summary for a facility — includes penalties, formal actions, and enforcement history',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'EPA Facility Registry System REGISTRY_ID',
            },
            p_system: {
              type: 'string',
              description: 'System acronym filter',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON or CSV (default: JSON)',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'get_formal_actions',
        description: 'Retrieve formal enforcement actions for a facility — includes civil and criminal cases, compliance orders, and penalty amounts',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'EPA Facility Registry System REGISTRY_ID',
            },
            p_system: {
              type: 'string',
              description: 'System acronym filter',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON or CSV (default: JSON)',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'get_inspections',
        description: 'Retrieve inspection history for a facility — includes inspection dates, types, findings, and compliance status across all EPA programs',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'EPA Facility Registry System REGISTRY_ID',
            },
            p_system: {
              type: 'string',
              description: 'System acronym filter',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON or CSV (default: JSON)',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'get_permits',
        description: 'Retrieve permit information for a facility — includes active and historical permits across air, water, and hazardous waste programs',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'EPA Facility Registry System REGISTRY_ID',
            },
            p_system: {
              type: 'string',
              description: 'System acronym filter',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON or CSV (default: JSON)',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'get_rcra_compliance',
        description: 'Retrieve RCRA (hazardous waste) compliance data for a facility — includes violation history, corrective actions, and handler status',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'EPA Facility Registry System REGISTRY_ID',
            },
            p_system: {
              type: 'string',
              description: 'System acronym filter',
            },
            output: {
              type: 'string',
              description: 'Output format: JSON or CSV (default: JSON)',
            },
          },
          required: ['p_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_facility_report':
          return this.getFacilityReport(args);
        case 'get_air_compliance':
          return this.callDfrEndpoint('dfr_rest_services.get_air_compliance', args);
        case 'get_air_quality':
          return this.callDfrEndpoint('dfr_rest_services.get_air_quality', args);
        case 'get_water_quality':
          return this.callDfrEndpoint('dfr_rest_services.get_water_quality', args);
        case 'get_compliance_summary':
          return this.callDfrEndpoint('dfr_rest_services.get_compliance_summary', args);
        case 'get_enforcement_summary':
          return this.callDfrEndpoint('dfr_rest_services.get_enforcement_summary', args);
        case 'get_formal_actions':
          return this.callDfrEndpoint('dfr_rest_services.get_formal_actions', args);
        case 'get_inspections':
          return this.callDfrEndpoint('dfr_rest_services.get_inspections', args);
        case 'get_permits':
          return this.callDfrEndpoint('dfr_rest_services.get_permits', args);
        case 'get_rcra_compliance':
          return this.callDfrEndpoint('dfr_rest_services.get_rcra_compliance', args);
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

  private buildParams(args: Record<string, unknown>): URLSearchParams {
    const params = new URLSearchParams();
    if (args.p_id) params.set('p_id', String(args.p_id));
    if (args.p_system) params.set('p_system', String(args.p_system));
    params.set('output', String(args.output ?? 'JSON'));
    return params;
  }

  private async getFacilityReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.p_id) {
      return { content: [{ type: 'text', text: 'p_id is required' }], isError: true };
    }
    return this.callDfrEndpoint('dfr_rest_services.get_dfr', args);
  }

  private async callDfrEndpoint(endpoint: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.p_id) {
      return { content: [{ type: 'text', text: 'p_id is required' }], isError: true };
    }
    const params = this.buildParams(args);
    const url = `${this.baseUrl}/${endpoint}?${params.toString()}`;
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
}
