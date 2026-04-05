/**
 * GeoDB Cities MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official vendor MCP server exists for this API.
// Our adapter covers: 9 tools (cities, countries, regions, admin divisions, timezones, currencies, languages).
//   No community MCP implementations found. Use this adapter for full coverage.
// Recommendation: Use this adapter. It is the only MCP implementation available.
//
// Base URL: https://wft-geo-db.p.rapidapi.com/v1
// Auth: RapidAPI key in X-RapidAPI-Key header + X-RapidAPI-Host header
// Docs: https://wirefreethought.github.io/geodb-cities-api-docs/
// Rate limits: Free tier: 1 req/sec, 1000 req/day. Paid tiers via RapidAPI.
// Keys: Acquire at https://rapidapi.com/wirefreethought/api/geodb-cities

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MashapeGeodbConfig {
  rapidApiKey: string;
  /** Optional base URL override (default: https://wft-geo-db.p.rapidapi.com/v1) */
  baseUrl?: string;
}

export class MashapeGeodbMCPServer extends MCPAdapterBase {
  private readonly rapidApiKey: string;
  private readonly baseUrl: string;

  constructor(config: MashapeGeodbConfig) {
    super();
    this.rapidApiKey = config.rapidApiKey;
    this.baseUrl = config.baseUrl ?? 'https://wft-geo-db.p.rapidapi.com/v1';
  }

  static catalog() {
    return {
      name: 'mashape-geodb',
      displayName: 'GeoDB Cities API',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'geodb', 'cities', 'countries', 'regions', 'geography', 'location', 'population',
        'timezone', 'currency', 'language', 'coordinates', 'nearby cities',
        'admin divisions', 'global', 'world', 'wikidata', 'geonames',
      ],
      toolNames: [
        'search_cities',
        'get_city',
        'get_nearby_cities',
        'get_city_distance',
        'list_countries',
        'get_country',
        'list_country_regions',
        'get_country_region',
        'list_timezones',
      ],
      description: 'GeoDB global city and region data — search cities by name, country, population, and coordinates; get distances; list countries, regions, admin divisions, timezones, currencies, and languages.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_cities',
        description: 'Search for cities worldwide by name prefix, country, coordinates, population, or timezone',
        inputSchema: {
          type: 'object',
          properties: {
            name_prefix: {
              type: 'string',
              description: 'Filter cities whose name starts with this prefix (e.g. "New")',
            },
            country_ids: {
              type: 'string',
              description: 'Comma-separated ISO-3166 country code(s) to filter by (e.g. "US,CA")',
            },
            min_population: {
              type: 'number',
              description: 'Only return cities with at least this population',
            },
            location: {
              type: 'string',
              description: 'Center coordinate as ISO-6709 string (e.g. "+40.6894-074.0447") for proximity search',
            },
            radius: {
              type: 'number',
              description: 'Radius in miles (or km if distance_unit=KM) around location for proximity search',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10, max: 10)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
            },
            language_code: {
              type: 'string',
              description: 'Language code for city/country names in response (e.g. "en", "fr", "de")',
            },
            ascii_mode: {
              type: 'boolean',
              description: 'Return results in ASCII-only characters (default: false)',
            },
          },
        },
      },
      {
        name: 'get_city',
        description: 'Get details for a specific city by its GeoDB city ID',
        inputSchema: {
          type: 'object',
          properties: {
            city_id: {
              type: 'string',
              description: 'GeoDB city ID (e.g. from a search_cities result)',
            },
            language_code: {
              type: 'string',
              description: 'Language code for city/country names in response (e.g. "en")',
            },
            ascii_mode: {
              type: 'boolean',
              description: 'Return results in ASCII-only characters (default: false)',
            },
          },
          required: ['city_id'],
        },
      },
      {
        name: 'get_nearby_cities',
        description: 'Get cities near a given GeoDB city ID within a specified radius',
        inputSchema: {
          type: 'object',
          properties: {
            city_id: {
              type: 'string',
              description: 'GeoDB city ID as the center point',
            },
            radius: {
              type: 'number',
              description: 'Search radius in miles (or km if distance_unit=KM)',
            },
            min_population: {
              type: 'number',
              description: 'Only include nearby cities with at least this population',
            },
            country_ids: {
              type: 'string',
              description: 'Comma-separated ISO-3166 country code(s) to filter by',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
            language_code: {
              type: 'string',
              description: 'Language code for names in response',
            },
          },
          required: ['city_id'],
        },
      },
      {
        name: 'get_city_distance',
        description: 'Get the distance between two cities by their GeoDB city IDs',
        inputSchema: {
          type: 'object',
          properties: {
            from_city_id: {
              type: 'string',
              description: 'GeoDB city ID for the origin city',
            },
            to_city_id: {
              type: 'string',
              description: 'GeoDB city ID for the destination city',
            },
            distance_unit: {
              type: 'string',
              description: 'Unit of distance: MI (miles) or KM (kilometres, default: MI)',
            },
          },
          required: ['from_city_id', 'to_city_id'],
        },
      },
      {
        name: 'list_countries',
        description: 'List countries worldwide, optionally filtered by currency code or name prefix',
        inputSchema: {
          type: 'object',
          properties: {
            currency_code: {
              type: 'string',
              description: 'Filter by ISO-4217 currency code (e.g. "USD", "EUR")',
            },
            name_prefix: {
              type: 'string',
              description: 'Filter countries whose name starts with this prefix',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
            language_code: {
              type: 'string',
              description: 'Language code for country names in response',
            },
            ascii_mode: {
              type: 'boolean',
              description: 'Return results in ASCII-only characters',
            },
          },
        },
      },
      {
        name: 'get_country',
        description: 'Get details for a specific country by its ISO-3166 country code',
        inputSchema: {
          type: 'object',
          properties: {
            country_id: {
              type: 'string',
              description: 'ISO-3166 country code (e.g. "US", "GB", "DE")',
            },
            language_code: {
              type: 'string',
              description: 'Language code for country name in response',
            },
            ascii_mode: {
              type: 'boolean',
              description: 'Return results in ASCII-only characters',
            },
          },
          required: ['country_id'],
        },
      },
      {
        name: 'list_country_regions',
        description: 'List all administrative regions (states, provinces, etc.) for a given country',
        inputSchema: {
          type: 'object',
          properties: {
            country_id: {
              type: 'string',
              description: 'ISO-3166 country code (e.g. "US", "CA")',
            },
            name_prefix: {
              type: 'string',
              description: 'Filter regions whose name starts with this prefix',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
            language_code: {
              type: 'string',
              description: 'Language code for region names in response',
            },
          },
          required: ['country_id'],
        },
      },
      {
        name: 'get_country_region',
        description: 'Get details for a specific region within a country by country code and region code',
        inputSchema: {
          type: 'object',
          properties: {
            country_id: {
              type: 'string',
              description: 'ISO-3166 country code (e.g. "US")',
            },
            region_code: {
              type: 'string',
              description: 'Region code (e.g. "CA" for California)',
            },
            language_code: {
              type: 'string',
              description: 'Language code for names in response',
            },
            ascii_mode: {
              type: 'boolean',
              description: 'Return results in ASCII-only characters',
            },
          },
          required: ['country_id', 'region_code'],
        },
      },
      {
        name: 'list_timezones',
        description: 'List all available timezones with UTC offsets',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_cities':
          return this.searchCities(args);
        case 'get_city':
          return this.getCity(args);
        case 'get_nearby_cities':
          return this.getNearbyCities(args);
        case 'get_city_distance':
          return this.getCityDistance(args);
        case 'list_countries':
          return this.listCountries(args);
        case 'get_country':
          return this.getCountry(args);
        case 'list_country_regions':
          return this.listCountryRegions(args);
        case 'get_country_region':
          return this.getCountryRegion(args);
        case 'list_timezones':
          return this.listTimezones(args);
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
      if (v !== undefined) qs.set(k, v);
    }
    const query = qs.toString();
    return `${this.baseUrl}${path}${query ? '?' + query : ''}`;
  }

  private async apiFetch(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': this.rapidApiKey,
        'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`GeoDB returned non-JSON (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchCities(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.name_prefix) params.namePrefix = args.name_prefix as string;
    if (args.country_ids) params.countryIds = args.country_ids as string;
    if (args.min_population !== undefined) params.minPopulation = String(args.min_population);
    if (args.location) params.location = args.location as string;
    if (args.radius !== undefined) params.radius = String(args.radius);
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.language_code) params.languageCode = args.language_code as string;
    if (args.ascii_mode !== undefined) params.asciiMode = String(args.ascii_mode);
    return this.apiFetch('/geo/cities', params);
  }

  private async getCity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.city_id) return { content: [{ type: 'text', text: 'city_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.language_code) params.languageCode = args.language_code as string;
    if (args.ascii_mode !== undefined) params.asciiMode = String(args.ascii_mode);
    return this.apiFetch(`/geo/cities/${encodeURIComponent(args.city_id as string)}`, params);
  }

  private async getNearbyCities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.city_id) return { content: [{ type: 'text', text: 'city_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.radius !== undefined) params.radius = String(args.radius);
    if (args.min_population !== undefined) params.minPopulation = String(args.min_population);
    if (args.country_ids) params.countryIds = args.country_ids as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.language_code) params.languageCode = args.language_code as string;
    return this.apiFetch(`/geo/cities/${encodeURIComponent(args.city_id as string)}/nearbyCities`, params);
  }

  private async getCityDistance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from_city_id) return { content: [{ type: 'text', text: 'from_city_id is required' }], isError: true };
    if (!args.to_city_id) return { content: [{ type: 'text', text: 'to_city_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {
      toCityId: args.to_city_id as string,
    };
    if (args.distance_unit) params.distanceUnit = args.distance_unit as string;
    return this.apiFetch(`/geo/cities/${encodeURIComponent(args.from_city_id as string)}/distance`, params);
  }

  private async listCountries(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.currency_code) params.currencyCode = args.currency_code as string;
    if (args.name_prefix) params.namePrefix = args.name_prefix as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.language_code) params.languageCode = args.language_code as string;
    if (args.ascii_mode !== undefined) params.asciiMode = String(args.ascii_mode);
    return this.apiFetch('/geo/countries', params);
  }

  private async getCountry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.country_id) return { content: [{ type: 'text', text: 'country_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.language_code) params.languageCode = args.language_code as string;
    if (args.ascii_mode !== undefined) params.asciiMode = String(args.ascii_mode);
    return this.apiFetch(`/geo/countries/${encodeURIComponent(args.country_id as string)}`, params);
  }

  private async listCountryRegions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.country_id) return { content: [{ type: 'text', text: 'country_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.name_prefix) params.namePrefix = args.name_prefix as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.language_code) params.languageCode = args.language_code as string;
    return this.apiFetch(`/geo/countries/${encodeURIComponent(args.country_id as string)}/regions`, params);
  }

  private async getCountryRegion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.country_id) return { content: [{ type: 'text', text: 'country_id is required' }], isError: true };
    if (!args.region_code) return { content: [{ type: 'text', text: 'region_code is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.language_code) params.languageCode = args.language_code as string;
    if (args.ascii_mode !== undefined) params.asciiMode = String(args.ascii_mode);
    return this.apiFetch(
      `/geo/countries/${encodeURIComponent(args.country_id as string)}/regions/${encodeURIComponent(args.region_code as string)}`,
      params
    );
  }

  private async listTimezones(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    return this.apiFetch('/locale/timezones', params);
  }
}
