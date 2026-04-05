/**
 * LotaData MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official LotaData MCP server found.
// Our adapter covers: 4 tools (search events, get event, search places, get place).
// Recommendation: Use this adapter for full LotaData API coverage.
//
// Base URL: https://api2.lotadata.com/v2
// Auth: API key passed as query parameter `api_key` on every request
// Docs: https://www.lotadata.com/docs
// Rate limits: Not publicly documented — contact LotaData for enterprise limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LotaDataConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api2.lotadata.com/v2) */
  baseUrl?: string;
}

export class LotaDataMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LotaDataConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api2.lotadata.com/v2';
  }

  static catalog() {
    return {
      name: 'lotadata',
      displayName: 'LotaData',
      version: '1.0.0',
      category: 'analytics',
      keywords: [
        'lotadata', 'events', 'activities', 'places', 'venues', 'geocoded',
        'location', 'analytics', 'geo', 'local', 'discovery', 'category',
        'concert', 'sports', 'entertainment', 'landmarks', 'regions',
      ],
      toolNames: [
        'search_events',
        'get_event',
        'search_places',
        'get_place',
      ],
      description: 'LotaData global geocoded events and activities API — search and discover local events, venues, landmarks, and places by location, category, date, and keyword.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_events',
        description: 'Search for event occurrences in an area — returns events matching location, category, date range, or keyword filters',
        inputSchema: {
          type: 'object',
          properties: {
            fieldset: {
              type: 'string',
              description: 'Level of detail to return: summary, context, or detail (default: summary)',
            },
            q: {
              type: 'string',
              description: 'Text query matching titles, descriptions, tags, and category names',
            },
            name: {
              type: 'string',
              description: 'Match on event or place name',
            },
            category: {
              type: 'string',
              description: 'Comma-separated list of EventCategory IDs (Tier 1) to filter by',
            },
            activity: {
              type: 'string',
              description: 'Activity type ID to filter by (complements category)',
            },
            ambience: {
              type: 'string',
              description: 'Ambience ID to filter by',
            },
            genre: {
              type: 'string',
              description: 'Genre ID to filter by',
            },
            from_day: {
              type: 'string',
              description: 'Filter events starting on or after this date (YYYY-MM-DD, e.g. 2025-10-16)',
            },
            to_day: {
              type: 'string',
              description: 'Filter events starting on or before this date (YYYY-MM-DD, e.g. 2025-10-20)',
            },
            center: {
              type: 'string',
              description: 'Origin point for geographic search as "latitude,longitude" (e.g. "37.7749,-122.4194")',
            },
            radius: {
              type: 'integer',
              description: 'Distance from origin in meters (use with center)',
            },
            within: {
              type: 'string',
              description: 'Search within a specific geopolitical place ID',
            },
            capacity_min: {
              type: 'number',
              description: 'Minimum venue capacity',
            },
            capacity_max: {
              type: 'number',
              description: 'Maximum venue capacity',
            },
            offset: {
              type: 'integer',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return (default: 10)',
            },
          },
          required: ['fieldset'],
        },
      },
      {
        name: 'get_event',
        description: 'Get full details for a specific event by its LotaData event ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'LotaData event @id',
            },
            fieldset: {
              type: 'string',
              description: 'Level of detail to return: summary, context, or detail (default: detail)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_places',
        description: 'Search for venues, landmarks, and regions — filter by category, location, address components, or capacity',
        inputSchema: {
          type: 'object',
          properties: {
            fieldset: {
              type: 'string',
              description: 'Level of detail to return: summary, context, or detail (default: summary)',
            },
            name: {
              type: 'string',
              description: 'Match on place name',
            },
            exact: {
              type: 'boolean',
              description: 'Require exact name match (default: false)',
            },
            category: {
              type: 'string',
              description: 'Comma-separated PlaceCategory IDs (Tier 1) to filter by',
            },
            type: {
              type: 'string',
              description: 'Specific PlaceType to filter by',
            },
            street: {
              type: 'string',
              description: 'Street address or street name component',
            },
            locality: {
              type: 'string',
              description: 'City, town, or neighborhood',
            },
            region: {
              type: 'string',
              description: 'Region or state',
            },
            postal_code: {
              type: 'string',
              description: 'Postal or zip code',
            },
            country: {
              type: 'string',
              description: 'Country name or code',
            },
            center: {
              type: 'string',
              description: 'Origin point for geographic search as "latitude,longitude" (e.g. "37.7749,-122.4194")',
            },
            radius: {
              type: 'integer',
              description: 'Distance from origin in meters (use with center)',
            },
            within: {
              type: 'string',
              description: 'Search within a specific geopolitical place ID',
            },
            capacity_min: {
              type: 'number',
              description: 'Minimum venue capacity',
            },
            capacity_max: {
              type: 'number',
              description: 'Maximum venue capacity',
            },
            offset: {
              type: 'integer',
              description: 'Number of results to skip for pagination (default: 0)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return (default: 10)',
            },
          },
          required: ['fieldset'],
        },
      },
      {
        name: 'get_place',
        description: 'Get full details for a specific place (venue, landmark, or region) by its LotaData place ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'LotaData place @id',
            },
            fieldset: {
              type: 'string',
              description: 'Level of detail to return: summary, context, or detail (default: detail)',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_events':
          return this.searchEvents(args);
        case 'get_event':
          return this.getEvent(args);
        case 'search_places':
          return this.searchPlaces(args);
        case 'get_place':
          return this.getPlace(args);
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
    const qs = new URLSearchParams({ api_key: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    return `${this.baseUrl}${path}?${qs.toString()}`;
  }

  private async fetch(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`LotaData returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fieldset) return { content: [{ type: 'text', text: 'fieldset is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      fieldset: args.fieldset as string,
    };
    const optionalStrings: Array<keyof typeof args> = ['q', 'name', 'category', 'activity', 'ambience', 'genre', 'from_day', 'to_day', 'center', 'within'];
    for (const key of optionalStrings) {
      if (args[key] !== undefined) params[key as string] = String(args[key]);
    }
    if (args.radius !== undefined) params.radius = String(args.radius);
    if (args.capacity_min !== undefined) params.capacity_min = String(args.capacity_min);
    if (args.capacity_max !== undefined) params.capacity_max = String(args.capacity_max);
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.limit !== undefined) params.limit = String(args.limit);
    return this.fetch('/events', params);
  }

  private async getEvent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.fieldset) params.fieldset = args.fieldset as string;
    return this.fetch(`/events/${encodeURIComponent(args.id as string)}`, params);
  }

  private async searchPlaces(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fieldset) return { content: [{ type: 'text', text: 'fieldset is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      fieldset: args.fieldset as string,
    };
    const optionalStrings: Array<keyof typeof args> = ['name', 'category', 'type', 'street', 'locality', 'region', 'postal_code', 'country', 'center', 'within'];
    for (const key of optionalStrings) {
      if (args[key] !== undefined) params[key as string] = String(args[key]);
    }
    if (args.exact !== undefined) params.exact = String(args.exact);
    if (args.radius !== undefined) params.radius = String(args.radius);
    if (args.capacity_min !== undefined) params.capacity_min = String(args.capacity_min);
    if (args.capacity_max !== undefined) params.capacity_max = String(args.capacity_max);
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.limit !== undefined) params.limit = String(args.limit);
    return this.fetch('/places', params);
  }

  private async getPlace(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.fieldset) params.fieldset = args.fieldset as string;
    return this.fetch(`/places/${encodeURIComponent(args.id as string)}`, params);
  }
}
