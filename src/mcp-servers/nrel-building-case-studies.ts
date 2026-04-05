/**
 * NREL High Performance Building Database MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official vendor MCP published.
// Our adapter covers the NREL High Performance Building Database API —
//   a U.S. DOE/NREL repository of high-performance and green building case studies.
//
// Base URL: https://developer.nrel.gov/api/building-case-studies
// Auth: api_key query parameter on every request
// Docs: https://developer.nrel.gov/docs/buildings/building-case-studies/
// Rate limits: Free public access. Register at https://developer.nrel.gov/ for an API key.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NrelBuildingCaseStudiesConfig {
  apiKey: string;
  /** Optional base URL override (default: https://developer.nrel.gov/api/building-case-studies) */
  baseUrl?: string;
}

export class NrelBuildingCaseStudiesMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: NrelBuildingCaseStudiesConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://developer.nrel.gov/api/building-case-studies';
  }

  static catalog() {
    return {
      name: 'nrel-building-case-studies',
      displayName: 'NREL High Performance Building Database',
      version: '1.0.0',
      category: 'energy',
      keywords: [
        'nrel', 'building', 'energy', 'green building', 'high performance', 'case study',
        'doe', 'department of energy', 'sustainable', 'leed', 'energy efficiency',
        'building database', 'construction', 'renewable energy', 'architecture',
        'climate region', 'zero energy', 'net zero', 'building projects',
      ],
      toolNames: [
        'list_projects',
        'get_project',
      ],
      description: 'NREL High Performance Building Database: search and retrieve in-depth data on high-performance, green, and energy-efficient building projects across the United States and abroad.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_projects',
        description: 'Get a filterable list of high-performance building projects from the NREL Buildings Database. Filter by city, state, climate region, building type, or search text.',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Full-text search term to filter projects by name, description, or keywords',
            },
            portal: {
              type: 'string',
              description: 'Portal ID to filter projects by a specific program or portal',
            },
            page: {
              type: 'integer',
              description: 'Page number for pagination (default: 1)',
            },
            city: {
              type: 'string',
              description: 'Filter by city name (e.g. "Denver", "Seattle")',
            },
            province: {
              type: 'string',
              description: 'Filter by US state or Canadian province abbreviation (e.g. "CO", "AZ", "BC")',
            },
            region: {
              type: 'string',
              description: 'Filter by ASHRAE climate region integer. Mapping: 256=1A Very Hot Humid, 257=1B Very Hot Dry, 258=2A Hot Humid, 259=2B Hot Dry, 260=3A Warm Humid, 261=3B Warm Dry, 262=3C Warm Marine, 263=4A Mixed Humid, 264=4B Mixed Dry, 265=4C Mixed Marine, 266=5A Cool Humid, 267=5B Cool Dry, 268=5C Cool Marine, 269=6A Cold Humid, 270=6B Cold Dry, 271=7 Very Cold, 272=8 Subarctic',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Get full details for a specific high-performance building project by its NREL project ID — includes building specs, energy performance data, technologies used, and certification details.',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'integer',
              description: 'NREL project ID (integer) as returned in the id field from list_projects',
            },
          },
          required: ['project_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_projects': return this.listProjects(args);
        case 'get_project':   return this.getProject(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private async query(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams({ ...params, api_key: this.apiKey }).toString();
    const url = `${this.baseUrl}${path}?${qs}`;
    const response = await this.fetchWithRetry(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Project methods ────────────────────────────────────────────────────────

  private async listProjects(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.search)   params.search   = args.search   as string;
    if (args.portal)   params.portal   = args.portal   as string;
    if (args.page)     params.page     = String(args.page);
    if (args.city)     params.city     = args.city     as string;
    if (args.province) params.province = args.province as string;
    if (args.region)   params.region   = String(args.region);
    return this.query('/project.json', params);
  }

  private async getProject(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.project_id) {
      return { content: [{ type: 'text', text: 'project_id is required' }], isError: true };
    }
    return this.query(`/project/${args.project_id as number}.json`);
  }
}
