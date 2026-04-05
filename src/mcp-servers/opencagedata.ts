/**
 * OpenCage Geocoder MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official vendor MCP server exists for OpenCage Geocoder.
// Our adapter covers: 4 tools (forward geocode, reverse geocode, batch geocode, status check).
// Recommendation: Use this adapter for comprehensive geocoding coverage.
//
// Base URL: https://api.opencagedata.com/geocode
// Auth: API key passed as query parameter `key` on every request
// Docs: https://opencagedata.com/api
// Rate limits: Free tier 2,500 requests/day. Paid tiers vary.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenCageConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.opencagedata.com/geocode) */
  baseUrl?: string;
}

export class OpencagedataMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenCageConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.opencagedata.com/geocode';
  }

  static catalog() {
    return {
      name: 'opencagedata',
      displayName: 'OpenCage Geocoder',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'opencage', 'geocoding', 'reverse geocoding', 'forward geocoding',
        'coordinates', 'latitude', 'longitude', 'address', 'location',
        'geolocation', 'mapping', 'place', 'country', 'city', 'postcode',
      ],
      toolNames: [
        'geocode_forward', 'geocode_reverse', 'geocode_batch', 'geocode_with_options',
      ],
      description: 'OpenCage worldwide forward and reverse geocoding — convert addresses to coordinates and coordinates to addresses with confidence scores, bounding boxes, and rich annotations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'geocode_forward',
        description: 'Convert a place name, address, or postal code to latitude/longitude coordinates — returns results with confidence scores, bounding boxes, and address components',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Address, place name, or postal code to geocode (e.g. "Brandenburg Gate, Berlin", "SW1A 2AA", "Paris, France")',
            },
            countrycode: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 two-letter country code to limit results (e.g. us, gb, de)',
            },
            language: {
              type: 'string',
              description: 'IETF language code for response text (e.g. en, es, pt-BR)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return (default 10, max 100)',
            },
            min_confidence: {
              type: 'integer',
              description: 'Only return results with confidence >= this value (1-10)',
            },
            no_annotations: {
              type: 'boolean',
              description: 'When true, skip annotations to reduce response size (default false)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'geocode_reverse',
        description: 'Convert latitude/longitude coordinates to a human-readable address — returns address components, country, postcode, and confidence score',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude in decimal degrees (e.g. 52.5163)',
            },
            longitude: {
              type: 'number',
              description: 'Longitude in decimal degrees (e.g. 13.3779)',
            },
            language: {
              type: 'string',
              description: 'IETF language code for response text (e.g. en, fr, de)',
            },
            no_annotations: {
              type: 'boolean',
              description: 'When true, skip annotations to reduce response size (default false)',
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'geocode_batch',
        description: 'Geocode multiple queries in one call — returns results array for each query string provided (up to 100 per request)',
        inputSchema: {
          type: 'object',
          properties: {
            queries: {
              type: 'array',
              description: 'List of addresses, place names, or "lat,lng" strings to geocode (max 100)',
              items: { type: 'string' },
            },
            language: {
              type: 'string',
              description: 'IETF language code for all responses (e.g. en)',
            },
            no_annotations: {
              type: 'boolean',
              description: 'When true, skip annotations to reduce response size',
            },
            limit: {
              type: 'integer',
              description: 'Maximum results per query (default 1 for batch, max 10)',
            },
          },
          required: ['queries'],
        },
      },
      {
        name: 'geocode_with_options',
        description: 'Geocode a query with full control over all OpenCage API options — supports bounds bias, proximity bias, road info, deduplication, and pretty printing',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Address, place name, coordinates ("lat,lng"), or postal code to geocode',
            },
            bounds: {
              type: 'string',
              description: 'Bounding box bias as "min_lng,min_lat,max_lng,max_lat" (e.g. "-0.56,51.28,0.27,51.69" for London)',
            },
            proximity: {
              type: 'string',
              description: 'Bias results toward "lat,lng" coordinates (e.g. "51.5,-0.1")',
            },
            countrycode: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code to restrict results',
            },
            language: {
              type: 'string',
              description: 'IETF language code for response text',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results (default 10, max 100)',
            },
            min_confidence: {
              type: 'integer',
              description: 'Minimum confidence threshold 1-10',
            },
            no_annotations: {
              type: 'boolean',
              description: 'Skip annotations in response',
            },
            no_dedupe: {
              type: 'boolean',
              description: 'When true, do not deduplicate results',
            },
            roadinfo: {
              type: 'boolean',
              description: 'When true, match nearest road and include roadinfo annotation',
            },
            address_only: {
              type: 'boolean',
              description: 'When true, include only address details in formatted field',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'geocode_forward':
          return this.geocodeForward(args);
        case 'geocode_reverse':
          return this.geocodeReverse(args);
        case 'geocode_batch':
          return this.geocodeBatch(args);
        case 'geocode_with_options':
          return this.geocodeWithOptions(args);
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
    const qs = new URLSearchParams({ key: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    return `${this.baseUrl}${path}?${qs.toString()}`;
  }

  private async fetchApi(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`OpenCage returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async geocodeForward(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string | undefined> = { q: args.query as string };
    if (args.countrycode) params.countrycode = args.countrycode as string;
    if (args.language) params.language = args.language as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.min_confidence !== undefined) params.min_confidence = String(args.min_confidence);
    if (args.no_annotations !== undefined) params.no_annotations = args.no_annotations ? '1' : '0';
    return this.fetchApi('/v1/json', params);
  }

  private async geocodeReverse(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.latitude === undefined || args.longitude === undefined) {
      return { content: [{ type: 'text', text: 'latitude and longitude are required' }], isError: true };
    }
    const params: Record<string, string | undefined> = {
      q: `${args.latitude},${args.longitude}`,
    };
    if (args.language) params.language = args.language as string;
    if (args.no_annotations !== undefined) params.no_annotations = args.no_annotations ? '1' : '0';
    return this.fetchApi('/v1/json', params);
  }

  private async geocodeBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.queries || !Array.isArray(args.queries) || args.queries.length === 0) {
      return { content: [{ type: 'text', text: 'queries array is required and must not be empty' }], isError: true };
    }
    const queries = args.queries as string[];
    const results: unknown[] = [];
    for (const q of queries.slice(0, 100)) {
      const params: Record<string, string | undefined> = { q };
      if (args.language) params.language = args.language as string;
      if (args.no_annotations !== undefined) params.no_annotations = args.no_annotations ? '1' : '0';
      if (args.limit !== undefined) params.limit = String(args.limit);
      const url = this.buildUrl('/v1/json', params);
      const response = await this.fetchWithRetry(url, { method: 'GET' });
      if (!response.ok) {
        results.push({ query: q, error: `${response.status} ${response.statusText}` });
        continue;
      }
      try {
        const data = await response.json();
        results.push({ query: q, data });
      } catch {
        results.push({ query: q, error: 'non-JSON response' });
      }
    }
    return { content: [{ type: 'text', text: this.truncate(results) }], isError: false };
  }

  private async geocodeWithOptions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string | undefined> = { q: args.query as string };
    if (args.bounds) params.bounds = args.bounds as string;
    if (args.proximity) params.proximity = args.proximity as string;
    if (args.countrycode) params.countrycode = args.countrycode as string;
    if (args.language) params.language = args.language as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.min_confidence !== undefined) params.min_confidence = String(args.min_confidence);
    if (args.no_annotations !== undefined) params.no_annotations = args.no_annotations ? '1' : '0';
    if (args.no_dedupe !== undefined) params.no_dedupe = args.no_dedupe ? '1' : '0';
    if (args.roadinfo !== undefined) params.roadinfo = args.roadinfo ? '1' : '0';
    if (args.address_only !== undefined) params.address_only = args.address_only ? '1' : '0';
    return this.fetchApi('/v1/json', params);
  }
}
