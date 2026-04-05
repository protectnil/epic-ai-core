/**
 * CoStar MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official CoStar MCP server was found on GitHub, npm, or CoStar's developer pages.
//
// Base URL: https://api.costar.com  (enterprise partner access only — endpoint paths are contract-specific)
// Auth: API key passed as X-Api-Key header (enterprise partner credentials)
// Docs: https://www.costar.com — CoStar does NOT offer a public developer API. Access requires a
//   signed enterprise partnership agreement with CoStar Group. No public API reference exists.
//   Endpoint paths in this adapter are unverified — confirm all paths with your CoStar account team.
// Rate limits: Not publicly documented; governed by individual partner agreements
//
// IMPORTANT: This adapter is UNVERIFIED. CoStar's API is contract-gated with no public documentation.
// The endpoint paths (/v1/properties, /v1/leases, etc.) are reasonable conventions but cannot be
// confirmed without access to CoStar's partner API docs. This adapter should be treated as a
// template — CoStar partners must verify and correct all paths before use.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CoStarConfig {
  apiKey: string;
  baseUrl?: string;   // override if CoStar provides a tenant-specific base URL
}

export class CoStarMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CoStarConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.costar.com';
  }

  static catalog() {
    return {
      name: 'costar',
      displayName: 'CoStar',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'costar', 'commercial real estate', 'cre', 'property', 'listing', 'lease',
        'sale', 'building', 'market analytics', 'vacancy', 'rent', 'cap rate',
        'tenant', 'landlord', 'broker', 'office', 'retail', 'industrial', 'multifamily',
        'costar group', 'loopnet', 'property search',
      ],
      toolNames: [
        'search_properties', 'get_property', 'list_property_leases', 'get_lease',
        'search_listings', 'get_listing', 'get_market_stats', 'list_markets',
        'search_tenants', 'get_tenant', 'list_comparable_sales', 'get_sale',
        'search_buildings', 'get_building', 'list_contacts', 'get_contact',
      ],
      description: 'CoStar commercial real estate data: search properties, leases, listings, sales comps, market analytics, tenants, and contacts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_properties',
        description: 'Search commercial real estate properties by location, type, size, and availability filters',
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              description: 'Market name or code (e.g. "New York", "Los Angeles")',
            },
            property_type: {
              type: 'string',
              description: 'Property type: Office, Retail, Industrial, Multifamily, Land, Hotel, Healthcare',
            },
            min_size_sf: {
              type: 'number',
              description: 'Minimum rentable building area in square feet',
            },
            max_size_sf: {
              type: 'number',
              description: 'Maximum rentable building area in square feet',
            },
            min_year_built: {
              type: 'number',
              description: 'Minimum year built (e.g. 2000)',
            },
            submarket: {
              type: 'string',
              description: 'Submarket name to narrow geographic results',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50, max: 200)',
            },
            offset: {
              type: 'number',
              description: 'Result offset for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_property',
        description: 'Retrieve full property record by CoStar property ID, including building specs and ownership details',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'CoStar property ID',
            },
          },
          required: ['property_id'],
        },
      },
      {
        name: 'list_property_leases',
        description: 'List active and historical leases for a specific property by property ID',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'CoStar property ID',
            },
            status: {
              type: 'string',
              description: 'Filter by lease status: Active, Expired, All (default: Active)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of leases to return (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Result offset for pagination (default: 0)',
            },
          },
          required: ['property_id'],
        },
      },
      {
        name: 'get_lease',
        description: 'Retrieve a specific lease record by CoStar lease ID, including tenant, term, and rent details',
        inputSchema: {
          type: 'object',
          properties: {
            lease_id: {
              type: 'string',
              description: 'CoStar lease ID',
            },
          },
          required: ['lease_id'],
        },
      },
      {
        name: 'search_listings',
        description: 'Search active for-lease and for-sale commercial listings with space type, price, and market filters',
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              description: 'Market name or code',
            },
            listing_type: {
              type: 'string',
              description: 'Type of listing: ForLease, ForSale (default: ForLease)',
            },
            property_type: {
              type: 'string',
              description: 'Property type: Office, Retail, Industrial, Multifamily, Land, Hotel',
            },
            min_available_sf: {
              type: 'number',
              description: 'Minimum available space in square feet',
            },
            max_asking_rent: {
              type: 'number',
              description: 'Maximum asking rent per square foot per year',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 50, max: 200)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_listing',
        description: 'Retrieve a specific listing record by CoStar listing ID with space details and contact info',
        inputSchema: {
          type: 'object',
          properties: {
            listing_id: {
              type: 'string',
              description: 'CoStar listing ID',
            },
          },
          required: ['listing_id'],
        },
      },
      {
        name: 'get_market_stats',
        description: 'Retrieve market analytics statistics for a CoStar market, including vacancy rate, absorption, and average rent',
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              description: 'Market name or code (e.g. "Chicago", "Dallas/Ft. Worth")',
            },
            property_type: {
              type: 'string',
              description: 'Property type to filter statistics: Office, Retail, Industrial, Multifamily',
            },
            period: {
              type: 'string',
              description: 'Time period for statistics: Q (current quarter), Y (trailing 12 months), 5Y (5-year) (default: Q)',
            },
          },
          required: ['market'],
        },
      },
      {
        name: 'list_markets',
        description: 'List all CoStar market names and codes available in your data subscription',
        inputSchema: {
          type: 'object',
          properties: {
            property_type: {
              type: 'string',
              description: 'Filter markets by covered property type: Office, Retail, Industrial, Multifamily',
            },
          },
        },
      },
      {
        name: 'search_tenants',
        description: 'Search tenants by company name, industry, or leased market to find occupancy details',
        inputSchema: {
          type: 'object',
          properties: {
            company_name: {
              type: 'string',
              description: 'Tenant company name or partial name to search',
            },
            industry: {
              type: 'string',
              description: 'Industry classification (e.g. Technology, Finance, Healthcare)',
            },
            market: {
              type: 'string',
              description: 'Market name or code to scope tenant search geographically',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_tenant',
        description: 'Retrieve full tenant profile by CoStar tenant ID including leased locations and occupancy history',
        inputSchema: {
          type: 'object',
          properties: {
            tenant_id: {
              type: 'string',
              description: 'CoStar tenant ID',
            },
          },
          required: ['tenant_id'],
        },
      },
      {
        name: 'list_comparable_sales',
        description: 'List comparable sale transactions for a property or market with price, cap rate, and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'CoStar property ID to find comps for (optional — use market instead for broad search)',
            },
            market: {
              type: 'string',
              description: 'Market name or code to search sales within',
            },
            property_type: {
              type: 'string',
              description: 'Property type filter: Office, Retail, Industrial, Multifamily',
            },
            min_sale_price: {
              type: 'number',
              description: 'Minimum sale price in USD',
            },
            sold_after: {
              type: 'string',
              description: 'Only return sales recorded after this date (YYYY-MM-DD)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_sale',
        description: 'Retrieve a specific sale transaction record by CoStar sale ID with full pricing and buyer/seller details',
        inputSchema: {
          type: 'object',
          properties: {
            sale_id: {
              type: 'string',
              description: 'CoStar sale transaction ID',
            },
          },
          required: ['sale_id'],
        },
      },
      {
        name: 'search_buildings',
        description: 'Search for specific building records by address, postal code, or building name',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Street address or partial address to match',
            },
            postal_code: {
              type: 'string',
              description: 'Postal/ZIP code to scope building search',
            },
            building_name: {
              type: 'string',
              description: 'Building name or partial name (e.g. "Empire State")',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 25)',
            },
          },
        },
      },
      {
        name: 'get_building',
        description: 'Retrieve building details by CoStar building ID including floor plans, amenities, and ownership',
        inputSchema: {
          type: 'object',
          properties: {
            building_id: {
              type: 'string',
              description: 'CoStar building ID',
            },
          },
          required: ['building_id'],
        },
      },
      {
        name: 'list_contacts',
        description: 'List broker and owner contacts associated with a property or listing for outreach',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: {
              type: 'string',
              description: 'CoStar property ID to retrieve associated contacts for',
            },
            listing_id: {
              type: 'string',
              description: 'CoStar listing ID to retrieve listing broker contacts for',
            },
          },
        },
      },
      {
        name: 'get_contact',
        description: 'Retrieve a specific broker or owner contact record by CoStar contact ID',
        inputSchema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'CoStar contact ID',
            },
          },
          required: ['contact_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_properties':
          return this.searchProperties(args);
        case 'get_property':
          return this.getProperty(args);
        case 'list_property_leases':
          return this.listPropertyLeases(args);
        case 'get_lease':
          return this.getLease(args);
        case 'search_listings':
          return this.searchListings(args);
        case 'get_listing':
          return this.getListing(args);
        case 'get_market_stats':
          return this.getMarketStats(args);
        case 'list_markets':
          return this.listMarkets(args);
        case 'search_tenants':
          return this.searchTenants(args);
        case 'get_tenant':
          return this.getTenant(args);
        case 'list_comparable_sales':
          return this.listComparableSales(args);
        case 'get_sale':
          return this.getSale(args);
        case 'search_buildings':
          return this.searchBuildings(args);
        case 'get_building':
          return this.getBuilding(args);
        case 'list_contacts':
          return this.listContacts(args);
        case 'get_contact':
          return this.getContact(args);
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

  // --- Helpers ---

  private get authHeaders(): Record<string, string> {
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async costarGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // --- Tool implementations ---

  private async searchProperties(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.market) params.market = args.market as string;
    if (args.property_type) params.propertyType = args.property_type as string;
    if (args.min_size_sf) params.minSizeSf = String(args.min_size_sf);
    if (args.max_size_sf) params.maxSizeSf = String(args.max_size_sf);
    if (args.min_year_built) params.minYearBuilt = String(args.min_year_built);
    if (args.submarket) params.submarket = args.submarket as string;
    return this.costarGet('/v1/properties', params);
  }

  private async getProperty(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.property_id) return { content: [{ type: 'text', text: 'property_id is required' }], isError: true };
    return this.costarGet(`/v1/properties/${encodeURIComponent(args.property_id as string)}`);
  }

  private async listPropertyLeases(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.property_id) return { content: [{ type: 'text', text: 'property_id is required' }], isError: true };
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.status) params.status = args.status as string;
    return this.costarGet(`/v1/properties/${encodeURIComponent(args.property_id as string)}/leases`, params);
  }

  private async getLease(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.lease_id) return { content: [{ type: 'text', text: 'lease_id is required' }], isError: true };
    return this.costarGet(`/v1/leases/${encodeURIComponent(args.lease_id as string)}`);
  }

  private async searchListings(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      listingType: (args.listing_type as string) ?? 'ForLease',
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.market) params.market = args.market as string;
    if (args.property_type) params.propertyType = args.property_type as string;
    if (args.min_available_sf) params.minAvailableSf = String(args.min_available_sf);
    if (args.max_asking_rent) params.maxAskingRent = String(args.max_asking_rent);
    return this.costarGet('/v1/listings', params);
  }

  private async getListing(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.listing_id) return { content: [{ type: 'text', text: 'listing_id is required' }], isError: true };
    return this.costarGet(`/v1/listings/${encodeURIComponent(args.listing_id as string)}`);
  }

  private async getMarketStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market) return { content: [{ type: 'text', text: 'market is required' }], isError: true };
    const params: Record<string, string> = {
      market: args.market as string,
      period: (args.period as string) ?? 'Q',
    };
    if (args.property_type) params.propertyType = args.property_type as string;
    return this.costarGet('/v1/markets/stats', params);
  }

  private async listMarkets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.property_type) params.propertyType = args.property_type as string;
    return this.costarGet('/v1/markets', params);
  }

  private async searchTenants(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.company_name) params.companyName = args.company_name as string;
    if (args.industry) params.industry = args.industry as string;
    if (args.market) params.market = args.market as string;
    return this.costarGet('/v1/tenants', params);
  }

  private async getTenant(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant_id) return { content: [{ type: 'text', text: 'tenant_id is required' }], isError: true };
    return this.costarGet(`/v1/tenants/${encodeURIComponent(args.tenant_id as string)}`);
  }

  private async listComparableSales(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 50),
      offset: String((args.offset as number) ?? 0),
    };
    if (args.property_id) params.propertyId = args.property_id as string;
    if (args.market) params.market = args.market as string;
    if (args.property_type) params.propertyType = args.property_type as string;
    if (args.min_sale_price) params.minSalePrice = String(args.min_sale_price);
    if (args.sold_after) params.soldAfter = args.sold_after as string;
    return this.costarGet('/v1/sales', params);
  }

  private async getSale(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sale_id) return { content: [{ type: 'text', text: 'sale_id is required' }], isError: true };
    return this.costarGet(`/v1/sales/${encodeURIComponent(args.sale_id as string)}`);
  }

  private async searchBuildings(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      limit: String((args.limit as number) ?? 25),
    };
    if (args.address) params.address = args.address as string;
    if (args.postal_code) params.postalCode = args.postal_code as string;
    if (args.building_name) params.buildingName = args.building_name as string;
    return this.costarGet('/v1/buildings/search', params);
  }

  private async getBuilding(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.building_id) return { content: [{ type: 'text', text: 'building_id is required' }], isError: true };
    return this.costarGet(`/v1/buildings/${encodeURIComponent(args.building_id as string)}`);
  }

  private async listContacts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.property_id) params.propertyId = args.property_id as string;
    if (args.listing_id) params.listingId = args.listing_id as string;
    return this.costarGet('/v1/contacts', params);
  }

  private async getContact(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contact_id) return { content: [{ type: 'text', text: 'contact_id is required' }], isError: true };
    return this.costarGet(`/v1/contacts/${encodeURIComponent(args.contact_id as string)}`);
  }
}
