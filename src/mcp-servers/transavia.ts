/**
 * Transavia MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official Transavia MCP server was found on GitHub. Transavia is a Dutch low-cost
// airline that offers a public Airports API via Azure API Management.
// This adapter covers all 5 endpoints of the Airports API v2.
//
// Base URL: https://api.transavia.com/v2/airports
// Auth: API key passed as header 'apikey' OR query param 'subscription-key'
// Docs: https://developer.transavia.com/
// Rate limits: Not publicly documented; subject to Azure APIM subscription tier limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TransaviaConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.transavia.com/v2/airports) */
  baseUrl?: string;
}

export class TransaviaMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TransaviaConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.transavia.com/v2/airports';
  }

  static catalog() {
    return {
      name: 'transavia',
      displayName: 'Transavia',
      version: '1.0.0',
      category: 'travel',
      keywords: [
        'transavia', 'airport', 'airline', 'IATA', 'aviation', 'flight',
        'travel', 'europe', 'netherlands', 'low-cost', 'geo', 'nearest',
        'country', 'coordinates', 'destination',
      ],
      toolNames: [
        'list_airports',
        'get_airport',
        'get_airports_by_country',
        'get_nearest_airports_by_coordinates',
        'get_nearest_airports_by_airport',
      ],
      description: 'Transavia Airports API v2: look up airports by IATA code, country code, or find nearest airports by geographic coordinates or a reference airport.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_airports',
        description: 'Return all airports served by Transavia',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_airport',
        description: 'Get a single airport by its 3-character IATA code (e.g. AMS, CDG, LHR)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: '3-character IATA airport code (e.g. AMS, CDG, LGW)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_airports_by_country',
        description: 'Get airports in one or more countries by 2-character ISO 3166-1 country code (max 3 codes)',
        inputSchema: {
          type: 'object',
          properties: {
            countryCode: {
              type: 'string',
              description: 'Comma-separated list of ISO 3166-1 alpha-2 country codes — max 3 (e.g. NL, FR, DE)',
            },
          },
          required: ['countryCode'],
        },
      },
      {
        name: 'get_nearest_airports_by_coordinates',
        description: 'Find the nearest Transavia airports to a geographic lat/lon coordinate, with optional distance and result limit',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'string',
              description: 'Latitude in decimal degrees (between -90.0 and 90.0)',
            },
            longitude: {
              type: 'string',
              description: 'Longitude in decimal degrees (between -180.0 and 180.0)',
            },
            maxDistanceInKm: {
              type: 'string',
              description: 'Maximum search radius in kilometres (1–500). Defaults to 500 if omitted.',
            },
            limit: {
              type: 'string',
              description: 'Maximum number of airports to return. No limit if omitted.',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_nearest_airports_by_airport',
        description: 'Find airports nearest to a given reference airport IATA code, with optional distance and result limit',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Reference airport IATA code to search from (e.g. AMS)',
            },
            maxDistanceInKm: {
              type: 'string',
              description: 'Maximum search radius in kilometres (1–500). Defaults to 500 if omitted.',
            },
            limit: {
              type: 'string',
              description: 'Maximum number of airports to return. No limit if omitted.',
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
        case 'list_airports':
          return await this._get('/');

        case 'get_airport': {
          const id = String(args.id ?? '');
          return await this._get(`/${encodeURIComponent(id)}`);
        }

        case 'get_airports_by_country': {
          const countryCode = String(args.countryCode ?? '');
          return await this._get(`/countrycode/${encodeURIComponent(countryCode)}`);
        }

        case 'get_nearest_airports_by_coordinates': {
          const params: Record<string, string> = {};
          if (args.latitude       != null) params.latitude         = String(args.latitude);
          if (args.longitude      != null) params.longitude        = String(args.longitude);
          if (args.maxDistanceInKm != null) params.maxDistanceInKm = String(args.maxDistanceInKm);
          if (args.limit          != null) params.limit            = String(args.limit);
          return await this._get('/nearest', params);
        }

        case 'get_nearest_airports_by_airport': {
          const id = String(args.id ?? '');
          const params: Record<string, string> = {};
          if (args.maxDistanceInKm != null) params.maxDistanceInKm = String(args.maxDistanceInKm);
          if (args.limit          != null) params.limit            = String(args.limit);
          return await this._get(`/nearest/${encodeURIComponent(id)}`, params);
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Transavia API error: ${message}` }],
        isError: true,
      };
    }
  }

  private async _get(path: string, query: Record<string, string> = {}): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, v);
    }

    const response = await this.fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: {
        'apikey': this.apiKey,
        'Accept': 'application/json',
      },
    });

    const raw = await response.text();
    const truncated = raw.length > 10240 ? raw.slice(0, 10240) + '\n…[truncated]' : raw;

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `HTTP ${response.status}: ${truncated}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }
}
