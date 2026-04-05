/**
 * SimplyRETS MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Base URL: https://api.simplyrets.com
// Auth: HTTP Basic Authentication (username:password, trial: simplyrets:simplyrets)
// Docs: https://docs.simplyrets.com / https://simplyrets.com
// Rate limits: Vary by plan; defaults to 20 results per request, max 500
// Endpoints: /properties (MLS listings), /properties/{mlsId}, /openhouses, /openhouses/{openHouseKey}

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SimplyRetsConfig {
  username: string;
  password: string;
  baseUrl?: string;
}

export class SimplyRetsMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor(config: SimplyRetsConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl || 'https://api.simplyrets.com';
  }

  static catalog() {
    return {
      name: 'simplyrets',
      displayName: 'SimplyRETS',
      version: '1.0.0',
      category: 'realestate',
      keywords: [
        'simplyrets', 'mls', 'real-estate', 'listings', 'properties',
        'openhouses', 'rets', 'residential', 'rental', 'realty',
      ],
      toolNames: [
        'search_listings',
        'get_listing',
        'search_openhouses',
        'get_openhouse',
      ],
      description: 'SimplyRETS MLS API: search real estate listings, get property details, and find open houses via RETS data feeds.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_listings',
        description: 'Search MLS real estate listings with filters for price, bedrooms, bathrooms, area, property type, city, postal code, and more',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Keyword search across listing ID, street number/name, MLS area, city, subdivision, and postal code' },
            status: { type: 'string', description: 'Listing status: Active, Pending, Closed, ActiveUnderContract, Hold, Withdrawn, Expired, ComingSoon (default: Active)' },
            type: { type: 'string', description: 'Property type: residential, rental, multifamily, condominium, commercial, land, farm (default: residential,rental)' },
            minprice: { type: 'number', description: 'Minimum list price in USD' },
            maxprice: { type: 'number', description: 'Maximum list price in USD' },
            minbeds: { type: 'number', description: 'Minimum number of bedrooms' },
            maxbeds: { type: 'number', description: 'Maximum number of bedrooms' },
            minbaths: { type: 'number', description: 'Minimum number of bathrooms' },
            maxbaths: { type: 'number', description: 'Maximum number of bathrooms' },
            minarea: { type: 'number', description: 'Minimum living area in square feet' },
            maxarea: { type: 'number', description: 'Maximum living area in square feet' },
            minyear: { type: 'number', description: 'Minimum year built' },
            maxdom: { type: 'number', description: 'Maximum days on market' },
            cities: { type: 'string', description: 'Comma-separated city names to filter by (case-insensitive)' },
            postalCodes: { type: 'string', description: 'Comma-separated postal codes / ZIP codes to filter by' },
            neighborhoods: { type: 'string', description: 'Comma-separated neighborhood/subdivision names to filter by' },
            counties: { type: 'string', description: 'Comma-separated county names to filter by' },
            water: { type: 'string', description: 'Filter waterfront listings: true (any waterfront), false (non-waterfront), or specific water body name' },
            sort: { type: 'string', description: 'Sort order: listprice, -listprice, listdate, -listdate, beds, -beds, baths, -baths' },
            limit: { type: 'number', description: 'Number of listings to return (default: 20, max: 500)' },
            offset: { type: 'number', description: 'Pagination offset — number of listings to skip (default: 0)' },
            vendor: { type: 'string', description: 'Vendor (MLS) ID for multi-MLS apps' },
          },
        },
      },
      {
        name: 'get_listing',
        description: 'Get full details for a single MLS listing by its MLS ID',
        inputSchema: {
          type: 'object',
          properties: {
            mlsId: { type: 'string', description: 'The MLS ID of the listing to retrieve' },
            vendor: { type: 'string', description: 'Vendor (MLS) ID for multi-MLS apps' },
          },
          required: ['mlsId'],
        },
      },
      {
        name: 'search_openhouses',
        description: 'Search for upcoming open houses with filters for date, city, postal code, bedrooms, and price',
        inputSchema: {
          type: 'object',
          properties: {
            startdate: { type: 'string', description: 'Filter open houses on or after this date (ISO 8601 format, e.g. 2026-04-01T00:00:00Z)' },
            enddate: { type: 'string', description: 'Filter open houses on or before this date (ISO 8601 format)' },
            cities: { type: 'string', description: 'Comma-separated city names to filter by' },
            postalCodes: { type: 'string', description: 'Comma-separated postal codes to filter by' },
            minprice: { type: 'number', description: 'Minimum property list price in USD' },
            maxprice: { type: 'number', description: 'Maximum property list price in USD' },
            minbeds: { type: 'number', description: 'Minimum number of bedrooms' },
            minbaths: { type: 'number', description: 'Minimum number of bathrooms' },
            type: { type: 'string', description: 'Property type: residential, rental, multifamily, condominium, commercial, land, farm' },
            limit: { type: 'number', description: 'Number of open houses to return (default: 20, max: 500)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            vendor: { type: 'string', description: 'Vendor (MLS) ID for multi-MLS apps' },
          },
        },
      },
      {
        name: 'get_openhouse',
        description: 'Get full details for a single open house event by its open house key',
        inputSchema: {
          type: 'object',
          properties: {
            openHouseKey: { type: 'string', description: 'The unique open house key to retrieve' },
            vendor: { type: 'string', description: 'Vendor (MLS) ID for multi-MLS apps' },
          },
          required: ['openHouseKey'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_listings': return this.searchListings(args);
        case 'get_listing': return this.getListing(args);
        case 'search_openhouses': return this.searchOpenhouses(args);
        case 'get_openhouse': return this.getOpenhouse(args);
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

  private get authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64');
  }

  private buildParams(args: Record<string, unknown>, keys: string[]): URLSearchParams {
    const params = new URLSearchParams();
    for (const key of keys) {
      const val = args[key];
      if (val === undefined || val === null) continue;
      if (typeof val === 'string' && val.includes(',') &&
        ['cities', 'postalCodes', 'neighborhoods', 'counties'].includes(key)) {
        for (const part of val.split(',')) {
          const trimmed = part.trim();
          if (trimmed) params.append(key, trimmed);
        }
      } else {
        params.append(key, String(val));
      }
    }
    return params;
  }

  private async get(path: string, params: URLSearchParams): Promise<ToolResult> {
    const qs = params.toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchListings(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, [
      'q', 'status', 'type', 'minprice', 'maxprice',
      'minbeds', 'maxbeds', 'minbaths', 'maxbaths',
      'minarea', 'maxarea', 'minyear', 'maxdom',
      'cities', 'postalCodes', 'neighborhoods', 'counties',
      'water', 'sort', 'limit', 'offset', 'vendor',
    ]);
    return this.get('/properties', params);
  }

  private async getListing(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.mlsId) {
      return { content: [{ type: 'text', text: 'mlsId is required' }], isError: true };
    }
    const params = this.buildParams(args, ['vendor']);
    return this.get(`/properties/${encodeURIComponent(args.mlsId as string)}`, params);
  }

  private async searchOpenhouses(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, [
      'startdate', 'enddate', 'cities', 'postalCodes',
      'minprice', 'maxprice', 'minbeds', 'minbaths',
      'type', 'limit', 'offset', 'vendor',
    ]);
    return this.get('/openhouses', params);
  }

  private async getOpenhouse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.openHouseKey) {
      return { content: [{ type: 'text', text: 'openHouseKey is required' }], isError: true };
    }
    const params = this.buildParams(args, ['vendor']);
    return this.get(`/openhouses/${encodeURIComponent(args.openHouseKey as string)}`, params);
  }
}
