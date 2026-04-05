/**
 * Mercedes-Benz Dealer MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Mercedes-Benz Dealer MCP server was found on GitHub.
// We build a REST wrapper for the Dealer Search API.
//
// Base URL: https://api.mercedes-benz.com/dealer_tryout/v1
// Auth: OAuth2 Bearer token (passed in config)
// Docs: https://developer.mercedes-benz.com/apis/dealer_tryout
// Rate limits: Not publicly specified; standard API throttling applies.
// Spec: https://api.apis.guru/v2/specs/mercedes-benz.com/dealer/1.0/swagger.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MercedesBenzDealerConfig {
  apiKey: string;
  baseUrl?: string;
}

export class MercedesBenzDealerMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MercedesBenzDealerConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.mercedes-benz.com/dealer_tryout/v1';
  }

  static catalog() {
    return {
      name: 'mercedes-benz-dealer',
      displayName: 'Mercedes-Benz Dealer',
      version: '1.0.0',
      category: 'automotive',
      keywords: [
        'mercedes-benz', 'mercedes', 'benz', 'automotive', 'dealer', 'dealership',
        'dealer search', 'dealer locator', 'showroom', 'service center', 'sales',
        'daimler', 'smart', 'dealer network', 'car dealer', 'dealer finder',
        'country', 'geo search', 'radius search',
      ],
      toolNames: [
        'list_countries',
        'search_dealers',
        'get_dealer',
      ],
      description: 'Mercedes-Benz Dealer API: search for dealers by location, country, brand, and activity. Retrieve dealer details including address, services, and contact information.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_countries',
        description: 'List all countries where Mercedes-Benz dealers are present.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Page index to return (1-based, default: 1)',
            },
            pageSize: {
              type: 'integer',
              description: 'Number of results per page (default: 25)',
            },
          },
          required: [],
        },
      },
      {
        name: 'search_dealers',
        description: 'Search for Mercedes-Benz dealers. Supports geo-radius search, filtering by country, city, brand, activity type, and legal name.',
        inputSchema: {
          type: 'object',
          properties: {
            dealerIds: {
              type: 'string',
              description: 'Comma-separated list of specific dealer IDs (GS IDs, e.g. GS0000857,GS0017621)',
            },
            latitude: {
              type: 'number',
              description: 'Latitude for geo-radius search center point',
            },
            longitude: {
              type: 'number',
              description: 'Longitude for geo-radius search center point',
            },
            radiusValue: {
              type: 'integer',
              description: 'Radius value for geo search (used with radiusUnit, latitude, longitude)',
            },
            radiusUnit: {
              type: 'string',
              description: 'Unit for the radius search: KM or MILES',
            },
            countryIsoCode: {
              type: 'string',
              description: 'Two-letter ISO country code to filter dealers by country (e.g. DE, US, GB)',
            },
            city: {
              type: 'string',
              description: 'City name to filter dealers by address city',
            },
            legalName: {
              type: 'string',
              description: 'Search by dealer name (applies to legalName and nameAddition fields)',
            },
            brand: {
              type: 'string',
              description: 'Filter by brand: MB (Mercedes-Benz) or SMT (Smart)',
            },
            productGroup: {
              type: 'string',
              description: 'Filter by product group',
            },
            activity: {
              type: 'string',
              description: 'Filter by dealer activity: PARTS (spare parts), SALES (new vehicles), or SERVICE (maintenance/repair)',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in response (e.g. dealers(dealerId,address,legalName))',
            },
            page: {
              type: 'integer',
              description: 'Page index to return (1-based, default: 1)',
            },
            pageSize: {
              type: 'integer',
              description: 'Number of results per page (default: 25)',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_dealer',
        description: 'Retrieve details for a specific Mercedes-Benz dealer by their GS dealer ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dealerId: {
              type: 'string',
              description: 'The dealer GS ID (business key), e.g. GS0000857',
            },
            fields: {
              type: 'string',
              description: 'Comma-separated list of fields to include in response (e.g. dealerId,address,legalName)',
            },
          },
          required: ['dealerId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_countries': return this.listCountries(args);
        case 'search_dealers': return this.searchDealers(args);
        case 'get_dealer':     return this.getDealer(args);
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

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const errText = await response.text();
      return {
        content: [{ type: 'text', text: `API error ${response.status}: ${errText.slice(0, 500)}` }],
        isError: true,
      };
    }
    const data: unknown = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ───────────────────────────────────────────────────

  private async listCountries(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args['page'])     params['page']     = String(args['page']);
    if (args['pageSize']) params['pageSize'] = String(args['pageSize']);
    return this.get('/countries', params);
  }

  private async searchDealers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args['dealerIds'])      params['dealerIds']      = String(args['dealerIds']);
    if (args['latitude']  != null) params['latitude']   = String(args['latitude']);
    if (args['longitude'] != null) params['longitude']  = String(args['longitude']);
    if (args['radiusValue'] != null) params['radiusValue'] = String(args['radiusValue']);
    if (args['radiusUnit'])     params['radiusUnit']     = String(args['radiusUnit']);
    if (args['countryIsoCode']) params['countryIsoCode'] = String(args['countryIsoCode']);
    if (args['city'])           params['city']           = String(args['city']);
    if (args['legalName'])      params['legalName']      = String(args['legalName']);
    if (args['brand'])          params['brand']          = String(args['brand']);
    if (args['productGroup'])   params['productGroup']   = String(args['productGroup']);
    if (args['activity'])       params['activity']       = String(args['activity']);
    if (args['fields'])         params['fields']         = String(args['fields']);
    if (args['page'])           params['page']           = String(args['page']);
    if (args['pageSize'])       params['pageSize']       = String(args['pageSize']);
    return this.get('/dealers', params);
  }

  private async getDealer(args: Record<string, unknown>): Promise<ToolResult> {
    const dealerId = String(args['dealerId'] ?? '');
    if (!dealerId) return { content: [{ type: 'text', text: 'dealerId is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args['fields']) params['fields'] = String(args['fields']);
    return this.get(`/dealers/${encodeURIComponent(dealerId)}`, params);
  }
}
