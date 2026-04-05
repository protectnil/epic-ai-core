/**
 * SchoolDigger MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28. SchoolDigger has not published an official MCP server.
// Recommendation: use-rest-api
//
// Base URL: https://api.schooldigger.com
// Auth: appID + appKey passed as query parameters on every request
//       Obtain credentials at: https://developer.schooldigger.com/
// Docs: https://developer.schooldigger.com/
// Rate limits: Not publicly documented; standard throttling applies per API key

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SchoolDiggerConfig {
  appID: string;
  appKey: string;
  baseUrl?: string;
}

export class SchoolDiggerMCPServer extends MCPAdapterBase {
  private readonly appID: string;
  private readonly appKey: string;
  private readonly baseUrl: string;

  constructor(config: SchoolDiggerConfig) {
    super();
    this.appID = config.appID;
    this.appKey = config.appKey;
    this.baseUrl = config.baseUrl || 'https://api.schooldigger.com';
  }

  static catalog() {
    return {
      name: 'schooldigger',
      displayName: 'SchoolDigger',
      version: '1.0.0',
      category: 'education',
      keywords: [
        'schooldigger', 'schools', 'districts', 'education', 'k-12', 'rankings',
        'elementary', 'middle school', 'high school', 'public school', 'charter',
        'magnet', 'school search', 'school ratings', 'school data', 'us schools',
      ],
      toolNames: [
        'search_schools', 'get_school',
        'search_districts', 'get_district',
        'get_school_rankings', 'get_district_rankings',
        'autocomplete_schools', 'autocomplete_districts',
      ],
      description: 'SchoolDigger API: search and rank over 120,000 U.S. schools and 18,500 districts with ratings, enrollment, and boundary data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_schools',
        description: 'Search for U.S. schools by state, name, city, zip, district, level, or proximity',
        inputSchema: {
          type: 'object',
          properties: {
            st: { type: 'string', description: 'Two-character state code (e.g. CA) — required' },
            q: { type: 'string', description: 'Search term matching school name or city' },
            districtID: { type: 'string', description: 'Filter by 7-digit district ID' },
            level: { type: 'string', description: "School level: 'Elementary', 'Middle', or 'High'" },
            city: { type: 'string', description: 'Filter schools in this city' },
            zip: { type: 'string', description: 'Filter schools in this 5-digit zip code' },
            isMagnet: { type: 'boolean', description: 'True = magnet schools only, False = non-magnet only' },
            isCharter: { type: 'boolean', description: 'True = charter schools only, False = non-charter only' },
            isVirtual: { type: 'boolean', description: 'True = virtual schools only, False = non-virtual only' },
            isTitleI: { type: 'boolean', description: 'True = Title I schools only, False = non-Title I only' },
            nearLatitude: { type: 'number', description: 'Latitude for proximity search (use with nearLongitude and distanceMiles)' },
            nearLongitude: { type: 'number', description: 'Longitude for proximity search' },
            distanceMiles: { type: 'number', description: 'Search radius in miles from nearLatitude/nearLongitude' },
            boundaryAddress: { type: 'string', description: 'Full U.S. address to find schools whose boundary includes this location' },
            sortBy: { type: 'string', description: "Sort by: 'schoolname', 'distance', or 'rank'" },
            page: { type: 'number', description: 'Page number (default: 1)' },
            perPage: { type: 'number', description: 'Results per page (max: 50, default: 10)' },
          },
          required: ['st'],
        },
      },
      {
        name: 'get_school',
        description: 'Get detailed profile for a specific U.S. school by its 12-digit SchoolDigger school ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '12-digit SchoolDigger school ID (e.g. 064215006903)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_districts',
        description: 'Search for U.S. school districts by state, name, city, zip, or proximity',
        inputSchema: {
          type: 'object',
          properties: {
            st: { type: 'string', description: 'Two-character state code (e.g. CA) — required' },
            q: { type: 'string', description: 'Search term matching district name or city' },
            city: { type: 'string', description: 'Filter districts in this city' },
            zip: { type: 'string', description: 'Filter districts in this 5-digit zip code' },
            nearLatitude: { type: 'number', description: 'Latitude for proximity search' },
            nearLongitude: { type: 'number', description: 'Longitude for proximity search' },
            distanceMiles: { type: 'number', description: 'Search radius in miles from nearLatitude/nearLongitude' },
            boundaryAddress: { type: 'string', description: 'Full U.S. address to find districts whose boundary includes this location' },
            sortBy: { type: 'string', description: "Sort by: 'districtname', 'distance', or 'rank'" },
            page: { type: 'number', description: 'Page number (default: 1)' },
            perPage: { type: 'number', description: 'Results per page (max: 50, default: 10)' },
          },
          required: ['st'],
        },
      },
      {
        name: 'get_district',
        description: 'Get detailed profile for a specific U.S. school district by its 7-digit SchoolDigger district ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '7-digit SchoolDigger district ID (e.g. 0642150)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_school_rankings',
        description: 'Get ranked list of U.S. schools for a specific state, with optional level and year filters',
        inputSchema: {
          type: 'object',
          properties: {
            st: { type: 'string', description: 'Two-character state code (e.g. CA)' },
            level: { type: 'string', description: "School level: 'Elementary', 'Middle', or 'High'" },
            year: { type: 'number', description: 'Ranking year (leave blank for most recent)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            perPage: { type: 'number', description: 'Results per page (max: 50, default: 10)' },
          },
          required: ['st'],
        },
      },
      {
        name: 'get_district_rankings',
        description: 'Get ranked list of U.S. school districts for a specific state with optional year filter',
        inputSchema: {
          type: 'object',
          properties: {
            st: { type: 'string', description: 'Two-character state code (e.g. CA)' },
            year: { type: 'number', description: 'Ranking year (leave blank for most recent)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            perPage: { type: 'number', description: 'Results per page (max: 50, default: 10)' },
          },
          required: ['st'],
        },
      },
      {
        name: 'autocomplete_schools',
        description: 'Get autocomplete suggestions for U.S. school names by partial search term, with optional state and level filters',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Partial school name search term (e.g. "Lincol")' },
            st: { type: 'string', description: 'Two-character state code to narrow results' },
            level: { type: 'string', description: "School level: 'Elementary', 'Middle', or 'High'" },
            returnCount: { type: 'number', description: 'Number of suggestions to return (1-20, default: 10)' },
          },
          required: ['q'],
        },
      },
      {
        name: 'autocomplete_districts',
        description: 'Get autocomplete suggestions for U.S. school district names by partial search term',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Partial district name search term (e.g. "Lincol")' },
            st: { type: 'string', description: 'Two-character state code to narrow results' },
            returnCount: { type: 'number', description: 'Number of suggestions to return (1-20, default: 10)' },
          },
          required: ['q'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_schools':         return this.searchSchools(args);
        case 'get_school':             return this.getSchool(args);
        case 'search_districts':       return this.searchDistricts(args);
        case 'get_district':           return this.getDistrict(args);
        case 'get_school_rankings':    return this.getSchoolRankings(args);
        case 'get_district_rankings':  return this.getDistrictRankings(args);
        case 'autocomplete_schools':   return this.autocompleteSchools(args);
        case 'autocomplete_districts': return this.autocompleteDistricts(args);
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

  private buildQs(params: Record<string, string | number | boolean | undefined>): string {
    const p = new URLSearchParams({ appID: this.appID, appKey: this.appKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) p.set(k, String(v));
    }
    return '?' + p.toString();
  }

  private async apiGet(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${this.buildQs(params)}`;
    const response = await this.fetchWithRetry(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchSchools(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.st) return { content: [{ type: 'text', text: 'st (state code) is required' }], isError: true };
    return this.apiGet('/v2.0/schools', {
      st:              args.st as string,
      q:               args.q as string,
      districtID:      args.districtID as string,
      level:           args.level as string,
      city:            args.city as string,
      zip:             args.zip as string,
      isMagnet:        args.isMagnet as boolean,
      isCharter:       args.isCharter as boolean,
      isVirtual:       args.isVirtual as boolean,
      isTitleI:        args.isTitleI as boolean,
      nearLatitude:    args.nearLatitude as number,
      nearLongitude:   args.nearLongitude as number,
      distanceMiles:   args.distanceMiles as number,
      boundaryAddress: args.boundaryAddress as string,
      sortBy:          args.sortBy as string,
      page:            args.page as number,
      perPage:         args.perPage as number,
    });
  }

  private async getSchool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/v2.0/schools/${encodeURIComponent(args.id as string)}`);
  }

  private async searchDistricts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.st) return { content: [{ type: 'text', text: 'st (state code) is required' }], isError: true };
    return this.apiGet('/v2.0/districts', {
      st:              args.st as string,
      q:               args.q as string,
      city:            args.city as string,
      zip:             args.zip as string,
      nearLatitude:    args.nearLatitude as number,
      nearLongitude:   args.nearLongitude as number,
      distanceMiles:   args.distanceMiles as number,
      boundaryAddress: args.boundaryAddress as string,
      sortBy:          args.sortBy as string,
      page:            args.page as number,
      perPage:         args.perPage as number,
    });
  }

  private async getDistrict(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/v2.0/districts/${encodeURIComponent(args.id as string)}`);
  }

  private async getSchoolRankings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.st) return { content: [{ type: 'text', text: 'st (state code) is required' }], isError: true };
    return this.apiGet(`/v2.0/rankings/schools/${encodeURIComponent(args.st as string)}`, {
      level:   args.level as string,
      year:    args.year as number,
      page:    args.page as number,
      perPage: args.perPage as number,
    });
  }

  private async getDistrictRankings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.st) return { content: [{ type: 'text', text: 'st (state code) is required' }], isError: true };
    return this.apiGet(`/v2.0/rankings/districts/${encodeURIComponent(args.st as string)}`, {
      year:    args.year as number,
      page:    args.page as number,
      perPage: args.perPage as number,
    });
  }

  private async autocompleteSchools(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q (search term) is required' }], isError: true };
    return this.apiGet('/v2.0/autocomplete/schools', {
      q:           args.q as string,
      st:          args.st as string,
      level:       args.level as string,
      returnCount: args.returnCount as number,
    });
  }

  private async autocompleteDistricts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q (search term) is required' }], isError: true };
    return this.apiGet('/v2.0/autocomplete/districts', {
      q:           args.q as string,
      st:          args.st as string,
      returnCount: args.returnCount as number,
    });
  }
}
