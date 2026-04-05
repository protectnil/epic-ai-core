/**
 * EPA ECHO Enforcement Case MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Base URL: https://echodata.epa.gov/echo
// Auth: No authentication required — public EPA ECHO API
// Docs: https://echo.epa.gov/tools/web-services
// API: EPA Enforcement and Compliance History Online (ECHO) — Enforcement Case Search
// Spec: https://api.apis.guru/v2/specs/epa.gov/case/1.0.0/swagger.json
// Note: Each endpoint exposes both GET and POST — adapter uses GET (query params).
//       Workflow: search_cases → get_cases_paginated (QID) → download_cases (CSV).
//       get_case_info is the enhanced self-contained search endpoint.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EpaCaseConfig {
  baseUrl?: string;
}

export class EpaCaseMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: EpaCaseConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://echodata.epa.gov/echo';
  }

  static catalog() {
    return {
      name: 'epa-case',
      displayName: 'EPA ECHO Enforcement Cases',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'EPA', 'ECHO', 'enforcement', 'compliance', 'case', 'civil', 'criminal',
        'ICIS', 'violation', 'penalty', 'environmental', 'regulation', 'government',
        'Clean Air Act', 'Clean Water Act', 'RCRA', 'CERCLA', 'Superfund',
      ],
      toolNames: [
        'search_cases',
        'get_case_info',
        'get_case_report',
        'get_criminal_case_report',
        'get_cases_paginated',
        'get_case_map',
        'download_cases',
        'get_cases_from_facility',
        'get_facilities_from_case',
        'get_metadata',
        'lookup_law_sections',
      ],
      description: 'Search and retrieve EPA enforcement case data from ECHO (Enforcement and Compliance History Online), including civil and criminal cases, violations, penalties, and compliance history.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_cases',
        description: 'Search EPA enforcement cases (ECHO). Returns a query ID (QID) for pagination and summary statistics. Use get_cases_paginated with the QID to retrieve results.',
        inputSchema: {
          type: 'object',
          properties: {
            p_case_category: {
              type: 'string',
              description: 'Case category codes (e.g. "CAA" Clean Air Act, "CWA" Clean Water Act). Comma-separated.',
            },
            p_case_status: {
              type: 'string',
              description: 'Case status codes to filter by. Comma-separated.',
            },
            p_name: {
              type: 'string',
              description: 'Case name filter. Partial match supported.',
            },
            p_case_number: {
              type: 'string',
              description: 'Case number filter. Enter one or more case numbers.',
            },
            p_from_date: {
              type: 'string',
              description: 'Milestone date range start (MM/DD/YYYY).',
            },
            p_to_date: {
              type: 'string',
              description: 'Milestone date range end (MM/DD/YYYY).',
            },
            p_milestone: {
              type: 'string',
              description: 'Administrative or judicial milestone filter codes.',
            },
            p_milestone_fy: {
              type: 'string',
              description: 'Milestone fiscal year filter (e.g. "2023").',
            },
            p_violation: {
              type: 'string',
              description: 'Violation type code filter. Comma-separated.',
            },
            p_case_lead: {
              type: 'string',
              description: 'Case lead agency: E = EPA, S = State.',
            },
            p_docket_number: {
              type: 'string',
              description: 'DOJ docket number filter.',
            },
            p_activity_number: {
              type: 'string',
              description: 'Case activity number filter.',
            },
            p_case_sens_flg: {
              type: 'string',
              description: 'Include sensitive data flag: Y or N.',
            },
          },
        },
      },
      {
        name: 'get_case_info',
        description: 'Enhanced self-contained enforcement case search returning full case detail records directly, without a separate QID/pagination step.',
        inputSchema: {
          type: 'object',
          properties: {
            p_case_category: {
              type: 'string',
              description: 'Case category codes (e.g. "CAA", "CWA"). Comma-separated.',
            },
            p_case_status: {
              type: 'string',
              description: 'Case status codes to filter by.',
            },
            p_name: {
              type: 'string',
              description: 'Case name filter (partial match supported).',
            },
            p_case_number: {
              type: 'string',
              description: 'Case number filter.',
            },
            p_from_date: {
              type: 'string',
              description: 'Milestone date range start (MM/DD/YYYY).',
            },
            p_to_date: {
              type: 'string',
              description: 'Milestone date range end (MM/DD/YYYY).',
            },
            p_milestone: {
              type: 'string',
              description: 'Administrative or judicial milestone filter.',
            },
            p_milestone_fy: {
              type: 'string',
              description: 'Milestone fiscal year (e.g. "2023").',
            },
            p_case_lead: {
              type: 'string',
              description: 'Case lead agency: E = EPA, S = State.',
            },
            p_docket_number: {
              type: 'string',
              description: 'DOJ docket number filter.',
            },
            p_case_sens_flg: {
              type: 'string',
              description: 'Include sensitive data: Y or N.',
            },
          },
        },
      },
      {
        name: 'get_case_report',
        description: 'Retrieve a detailed civil enforcement case summary report by case number.',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'Case number identifier for the civil enforcement case.',
            },
          },
        },
      },
      {
        name: 'get_criminal_case_report',
        description: 'Retrieve a detailed criminal enforcement case summary report by prosecution summary ID.',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'Numeric prosecution summary identifier for the criminal case.',
            },
          },
        },
      },
      {
        name: 'get_cases_paginated',
        description: 'Paginate through enforcement case results using a Query ID (QID) from search_cases. QIDs expire after ~30 minutes.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID returned by a prior search_cases call.',
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
        name: 'get_case_map',
        description: 'Get geographic map data (clustered and individual facility coordinates) for cases matching a QID.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from a prior search_cases call.',
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
        name: 'download_cases',
        description: 'Generate a CSV download of enforcement case data for a QID.',
        inputSchema: {
          type: 'object',
          properties: {
            qid: {
              type: 'string',
              description: 'Query ID from a prior search_cases call.',
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
        name: 'get_cases_from_facility',
        description: 'Retrieve all enforcement cases associated with a specific regulated facility.',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'Facility identifier (ECHO registry ID or FRS ID).',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'get_facilities_from_case',
        description: 'Retrieve regulated facilities associated with a specific enforcement case.',
        inputSchema: {
          type: 'object',
          properties: {
            p_id: {
              type: 'string',
              description: 'Case identifier to look up associated facilities.',
            },
          },
          required: ['p_id'],
        },
      },
      {
        name: 'get_metadata',
        description: 'Retrieve ECHO enforcement case service metadata — available output columns, their IDs, and definitions.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'lookup_law_sections',
        description: 'Look up ICIS law sections used in enforcement cases, filterable by statute code or search term.',
        inputSchema: {
          type: 'object',
          properties: {
            statute_code: {
              type: 'string',
              description: 'Filter by statute code (e.g. "CAA", "CWA", "RCRA").',
            },
            search_term: {
              type: 'string',
              description: 'Partial or complete search phrase to filter law section names.',
            },
            search_code: {
              type: 'string',
              description: 'Partial or complete law section code to filter by.',
            },
            status_flag: {
              type: 'string',
              description: 'Status flag filter for law sections.',
            },
            sort_order: {
              type: 'string',
              description: 'Sort order for returned results.',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_cases':
          return this.searchCases(args);
        case 'get_case_info':
          return this.getCaseInfo(args);
        case 'get_case_report':
          return this.getCaseReport(args);
        case 'get_criminal_case_report':
          return this.getCriminalCaseReport(args);
        case 'get_cases_paginated':
          return this.getCasesPaginated(args);
        case 'get_case_map':
          return this.getCaseMap(args);
        case 'download_cases':
          return this.downloadCases(args);
        case 'get_cases_from_facility':
          return this.getCasesFromFacility(args);
        case 'get_facilities_from_case':
          return this.getFacilitiesFromCase(args);
        case 'get_metadata':
          return this.getMetadata();
        case 'lookup_law_sections':
          return this.lookupLawSections(args);
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

  private async searchCases(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, [
      'p_case_category', 'p_case_status', 'p_violation', 'p_milestone',
      'p_from_date', 'p_to_date', 'p_milestone_fy', 'p_name', 'p_name_type',
      'p_case_number', 'p_docket_number', 'p_court_docket_number',
      'p_activity_number', 'p_case_lead', 'p_case_sens_flg',
    ]);
    return this.get('case_rest_services.get_cases', params);
  }

  private async getCaseInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, [
      'p_case_category', 'p_case_status', 'p_milestone', 'p_from_date',
      'p_to_date', 'p_milestone_fy', 'p_name', 'p_name_type', 'p_case_number',
      'p_docket_number', 'p_court_docket_number', 'p_activity_number',
      'p_case_lead', 'p_case_sens_flg',
    ]);
    return this.get('case_rest_services.get_case_info', params);
  }

  private async getCaseReport(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['p_id']);
    return this.get('case_rest_services.get_case_report', params);
  }

  private async getCriminalCaseReport(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['p_id']);
    return this.get('case_rest_services.get_crcase_report', params);
  }

  private async getCasesPaginated(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    const params = this.buildParams(args, ['qid', 'pageno', 'newsort', 'descending', 'qcolumns']);
    return this.get('case_rest_services.get_qid', params);
  }

  private async getCaseMap(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    const params = this.buildParams(args, ['qid', 'tablelist', 'c1_lat', 'c1_long', 'c2_lat', 'c2_long']);
    return this.get('case_rest_services.get_map', params);
  }

  private async downloadCases(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.qid) return { content: [{ type: 'text', text: 'qid is required' }], isError: true };
    const params = this.buildParams(args, ['qid', 'qcolumns']);
    params.set('output', 'CSV');
    return this.get('case_rest_services.get_download', params);
  }

  private async getCasesFromFacility(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.p_id) return { content: [{ type: 'text', text: 'p_id is required' }], isError: true };
    const params = this.buildParams(args, ['p_id']);
    return this.get('case_rest_services.get_cases_from_facility', params);
  }

  private async getFacilitiesFromCase(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.p_id) return { content: [{ type: 'text', text: 'p_id is required' }], isError: true };
    const params = this.buildParams(args, ['p_id']);
    return this.get('case_rest_services.get_facilities_from_case', params);
  }

  private async getMetadata(): Promise<ToolResult> {
    const params = new URLSearchParams({ output: 'JSON' });
    return this.get('case_rest_services.metadata', params);
  }

  private async lookupLawSections(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, [
      'statute_code', 'status_flag', 'search_term', 'search_code', 'sort_order',
    ]);
    return this.get('rest_lookups.icis_law_sections', params);
  }
}
