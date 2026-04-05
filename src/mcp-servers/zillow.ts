/**
 * Zillow MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// Community MCP servers exist (sap156/zillow-mcp-server, rohitsingh-iitd/zillow-mcp-server) but are not official Zillow Group implementations.
// Zillow Group deprecated its original free Data API in 2020 and migrated data access to the Bridge Interactive platform.
//
// Base URL: https://api.bridgedataoutput.com/api/v2
// Auth: Bearer token (API key obtained from Zillow Group / Bridge Interactive developer portal)
// Docs: https://bridgedataoutput.com/docs/platform/API/bridge | https://www.zillowgroup.com/developers/
// Rate limits: ~1,000 requests/day per dataset (Zillow terms of service); all requests must be dynamic — no local caching
// Note: Zillow's terms prohibit storing retrieved data locally. Requests must be real-time.
//
// ⚠️  ENDPOINT NOTE: Old Zestimate endpoints (/zestimates, /rental_zestimates) were DEPRECATED January 2022.
//   Current Zestimate endpoint: /zestimates_v2/zestimate (both property and rental Zestimates in one response).
//   Source: https://www.bridgeinteractive.com/new-zestimate-api-now-available/
//   get_price_history (/updatedPropertyDetails) — UNVERIFIED, from deprecated Zillow API, not confirmed in Bridge docs.
//   get_market_stats — uses OData Property endpoint with $select for aggregate stats — UNVERIFIED pattern.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ZillowConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ZillowMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ZillowConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.bridgedataoutput.com/api/v2';
  }

  static catalog() {
    return {
      name: 'zillow',
      displayName: 'Zillow',
      version: '1.0.0',
      category: 'misc',
      keywords: ['zillow', 'real-estate', 'property', 'zestimate', 'listing', 'mls', 'homes', 'rental', 'mortgage', 'bridge-interactive', 'housing-market'],
      toolNames: [
        'search_properties', 'get_property', 'get_zestimate', 'get_zestimates_by_address',
        'get_rental_zestimate', 'search_listings', 'get_listing',
        'get_public_records', 'search_public_records',
        'get_market_stats', 'get_price_history',
        'search_rentals', 'get_rental_listing',
        'calculate_mortgage',
      ],
      description: 'Zillow / Bridge Interactive real estate data: property search, Zestimates, listings, public records, market stats, rental data, and mortgage calculations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_properties',
        description: 'Search real estate properties by location, price range, bedrooms, and other filters via Bridge Interactive API',
        inputSchema: {
          type: 'object',
          properties: {
            near: { type: 'string', description: 'Location to search near: city+state (e.g. "Seattle,WA"), zip code, or address' },
            min_price: { type: 'number', description: 'Minimum property list price in USD' },
            max_price: { type: 'number', description: 'Maximum property list price in USD' },
            min_beds: { type: 'number', description: 'Minimum number of bedrooms' },
            max_beds: { type: 'number', description: 'Maximum number of bedrooms' },
            min_baths: { type: 'number', description: 'Minimum number of bathrooms' },
            property_type: { type: 'string', description: 'Property type: Residential, Condominium, Townhouse, MultiFamily, Land, Commercial (default: Residential)' },
            status: { type: 'string', description: 'Listing status: Active, Pending, Closed (default: Active)' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 200)' },
            offset: { type: 'number', description: 'Number of results to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_property',
        description: 'Get full property details from the Bridge Interactive database by property ID or MLS number',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Bridge Interactive property ID' },
            dataset: { type: 'string', description: 'Bridge dataset name (provided by Zillow Group / MLS agreement)' },
          },
          required: ['property_id'],
        },
      },
      {
        name: 'get_zestimate',
        description: 'Get the Zillow Zestimate (AI home value estimate) for a property by ZPID (Zillow Property ID)',
        inputSchema: {
          type: 'object',
          properties: {
            zpid: { type: 'string', description: 'Zillow Property ID (ZPID) — find via search_properties or get_public_records' },
          },
          required: ['zpid'],
        },
      },
      {
        name: 'get_zestimates_by_address',
        description: 'Look up the Zillow Zestimate for a property by its street address',
        inputSchema: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Street address of the property (e.g. "1600 Pennsylvania Ave NW")' },
            city: { type: 'string', description: 'City name (e.g. "Washington")' },
            state: { type: 'string', description: 'Two-letter state code (e.g. DC)' },
            zip: { type: 'string', description: 'ZIP code (e.g. 20500)' },
          },
          required: ['address'],
        },
      },
      {
        name: 'get_rental_zestimate',
        description: 'Get the Zillow Rent Zestimate (estimated monthly rental value) for a property by ZPID',
        inputSchema: {
          type: 'object',
          properties: {
            zpid: { type: 'string', description: 'Zillow Property ID (ZPID)' },
          },
          required: ['zpid'],
        },
      },
      {
        name: 'search_listings',
        description: 'Search active MLS listings with filters for location, price, size, and listing type',
        inputSchema: {
          type: 'object',
          properties: {
            near: { type: 'string', description: 'Location: city+state, zip code, or address' },
            min_price: { type: 'number', description: 'Minimum list price in USD' },
            max_price: { type: 'number', description: 'Maximum list price in USD' },
            min_sqft: { type: 'number', description: 'Minimum square footage' },
            max_sqft: { type: 'number', description: 'Maximum square footage' },
            min_beds: { type: 'number', description: 'Minimum bedrooms' },
            min_baths: { type: 'number', description: 'Minimum bathrooms' },
            days_on_market: { type: 'number', description: 'Maximum days on market (e.g. 30 for new listings)' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 200)' },
            offset: { type: 'number', description: 'Number of results to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_listing',
        description: 'Get full MLS listing details for a specific property by listing key or MLS number',
        inputSchema: {
          type: 'object',
          properties: {
            listing_key: { type: 'string', description: 'MLS listing key or unique listing identifier' },
            dataset: { type: 'string', description: 'Bridge dataset name for the MLS' },
          },
          required: ['listing_key'],
        },
      },
      {
        name: 'get_public_records',
        description: 'Get public records data for a property by address including ownership, tax assessment, and deed history',
        inputSchema: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Street address of the property' },
            city: { type: 'string', description: 'City name' },
            state: { type: 'string', description: 'Two-letter state code' },
            zip: { type: 'string', description: 'ZIP code' },
          },
          required: ['address', 'state'],
        },
      },
      {
        name: 'search_public_records',
        description: 'Search public property records by location, owner name, or APN (Assessor Parcel Number)',
        inputSchema: {
          type: 'object',
          properties: {
            near: { type: 'string', description: 'Location: city+state or zip code' },
            owner_name: { type: 'string', description: 'Property owner name to search for' },
            apn: { type: 'string', description: 'Assessor Parcel Number (APN) for the property' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20)' },
            offset: { type: 'number', description: 'Number of results to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_market_stats',
        description: 'Get housing market statistics for a zip code or city: median prices, days on market, and inventory levels',
        inputSchema: {
          type: 'object',
          properties: {
            zip: { type: 'string', description: 'ZIP code to get market stats for' },
            city: { type: 'string', description: 'City name (used when zip is not provided)' },
            state: { type: 'string', description: 'Two-letter state code (required if using city)' },
            property_type: { type: 'string', description: 'Property type to filter stats: SingleFamily, Condo, Townhouse (default: all)' },
          },
        },
      },
      {
        name: 'get_price_history',
        description: 'Get sale and listing price history for a specific property by ZPID',
        inputSchema: {
          type: 'object',
          properties: {
            zpid: { type: 'string', description: 'Zillow Property ID (ZPID)' },
          },
          required: ['zpid'],
        },
      },
      {
        name: 'search_rentals',
        description: 'Search rental listings by location, price range, and bedroom count',
        inputSchema: {
          type: 'object',
          properties: {
            near: { type: 'string', description: 'Location: city+state or zip code' },
            min_price: { type: 'number', description: 'Minimum monthly rent in USD' },
            max_price: { type: 'number', description: 'Maximum monthly rent in USD' },
            min_beds: { type: 'number', description: 'Minimum number of bedrooms (0 = studio)' },
            max_beds: { type: 'number', description: 'Maximum number of bedrooms' },
            property_type: { type: 'string', description: 'Rental type: Apartment, House, Condo, Townhouse (default: all)' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 200)' },
            offset: { type: 'number', description: 'Number of results to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_rental_listing',
        description: 'Get full details for a specific rental listing by listing ID',
        inputSchema: {
          type: 'object',
          properties: {
            listing_id: { type: 'string', description: 'Rental listing ID from search_rentals' },
          },
          required: ['listing_id'],
        },
      },
      {
        name: 'calculate_mortgage',
        description: 'Calculate monthly mortgage payment, total interest, and amortization for a given loan amount and rate',
        inputSchema: {
          type: 'object',
          properties: {
            home_price: { type: 'number', description: 'Total home purchase price in USD' },
            down_payment: { type: 'number', description: 'Down payment amount in USD (default: 20% of home_price)' },
            loan_term_years: { type: 'number', description: 'Loan term in years: 10, 15, 20, 30 (default: 30)' },
            annual_interest_rate: { type: 'number', description: 'Annual interest rate as a percentage (e.g. 6.5 for 6.5%)' },
            property_tax_annual: { type: 'number', description: 'Annual property tax in USD (optional, included in total payment)' },
            hoa_monthly: { type: 'number', description: 'Monthly HOA fee in USD (optional, included in total payment)' },
            home_insurance_annual: { type: 'number', description: 'Annual home insurance in USD (optional, included in total payment)' },
          },
          required: ['home_price', 'annual_interest_rate'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_properties': return this.searchProperties(args);
        case 'get_property': return this.getProperty(args);
        case 'get_zestimate': return this.getZestimate(args);
        case 'get_zestimates_by_address': return this.getZestimatesByAddress(args);
        case 'get_rental_zestimate': return this.getRentalZestimate(args);
        case 'search_listings': return this.searchListings(args);
        case 'get_listing': return this.getListing(args);
        case 'get_public_records': return this.getPublicRecords(args);
        case 'search_public_records': return this.searchPublicRecords(args);
        case 'get_market_stats': return this.getMarketStats(args);
        case 'get_price_history': return this.getPriceHistory(args);
        case 'search_rentals': return this.searchRentals(args);
        case 'get_rental_listing': return this.getRentalListing(args);
        case 'calculate_mortgage': return this.calculateMortgage(args);
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

  private get headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}` };
  }


  private async get(path: string, params: Record<string, string>): Promise<ToolResult> {
    // Always include access_token as query param per Bridge API spec
    params.access_token = this.apiKey;
    const qs = new URLSearchParams(params).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildLocationFilter(args: Record<string, unknown>): string {
    // Bridge API uses OData-style $filter for geo queries
    const parts: string[] = [];
    if (args.near) parts.push(`geo.distance(Coordinates,geography'POINT(${encodeURIComponent(args.near as string)})') le 10`);
    if (args.min_price) parts.push(`ListPrice ge ${encodeURIComponent(args.min_price as string)}`);
    if (args.max_price) parts.push(`ListPrice le ${encodeURIComponent(args.max_price as string)}`);
    if (args.min_beds) parts.push(`BedroomsTotal ge ${encodeURIComponent(args.min_beds as string)}`);
    if (args.max_beds) parts.push(`BedroomsTotal le ${encodeURIComponent(args.max_beds as string)}`);
    if (args.min_baths) parts.push(`BathroomsTotalInteger ge ${encodeURIComponent(args.min_baths as string)}`);
    if (args.min_sqft) parts.push(`LivingArea ge ${encodeURIComponent(args.min_sqft as string)}`);
    if (args.max_sqft) parts.push(`LivingArea le ${encodeURIComponent(args.max_sqft as string)}`);
    if (args.property_type) parts.push(`PropertyType eq '${encodeURIComponent(args.property_type as string)}'`);
    if (args.status) parts.push(`StandardStatus eq '${encodeURIComponent(args.status as string)}'`);
    if (args.days_on_market) parts.push(`DaysOnMarket le ${encodeURIComponent(args.days_on_market as string)}`);
    return parts.join(' and ');
  }

  private async searchProperties(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      '$top': String((args.limit as number) ?? 20),
      '$skip': String((args.offset as number) ?? 0),
    };
    const filter = this.buildLocationFilter({ ...args, status: args.status ?? 'Active' });
    if (filter) params['$filter'] = filter;
    return this.get('/OData/Property', params);
  }

  private async getProperty(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.property_id) return { content: [{ type: 'text', text: 'property_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.dataset) params.dataset = args.dataset as string;
    return this.get(`/OData/Property('${encodeURIComponent(args.property_id as string)}')`, params);
  }

  private async getZestimate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zpid) return { content: [{ type: 'text', text: 'zpid is required' }], isError: true };
    // Updated endpoint per Bridge Interactive (Oct 2021): /zestimates was deprecated Jan 2022
    return this.get('/zestimates_v2/zestimate', { zpid: args.zpid as string });
  }

  private async getZestimatesByAddress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.address) return { content: [{ type: 'text', text: 'address is required' }], isError: true };
    const params: Record<string, string> = { address: args.address as string };
    if (args.city) params.city = args.city as string;
    if (args.state) params.state = args.state as string;
    if (args.zip) params.zip = args.zip as string;
    // Updated endpoint per Bridge Interactive (Oct 2021): /zestimates was deprecated Jan 2022
    return this.get('/zestimates_v2/zestimate', params);
  }

  private async getRentalZestimate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zpid) return { content: [{ type: 'text', text: 'zpid is required' }], isError: true };
    // Rental Zestimates are now included in the unified zestimates_v2 response (field: rental.zestimate)
    // /rental_zestimates was deprecated Jan 2022 along with the old /zestimates endpoint
    return this.get('/zestimates_v2/zestimate', { zpid: args.zpid as string });
  }

  private async searchListings(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      '$top': String((args.limit as number) ?? 20),
      '$skip': String((args.offset as number) ?? 0),
    };
    const filter = this.buildLocationFilter({ ...args, status: 'Active' });
    if (filter) params['$filter'] = filter;
    return this.get('/OData/Property', params);
  }

  private async getListing(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.listing_key) return { content: [{ type: 'text', text: 'listing_key is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.dataset) params.dataset = args.dataset as string;
    return this.get(`/OData/Property('${encodeURIComponent(args.listing_key as string)}')`, params);
  }

  private async getPublicRecords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.address || !args.state) {
      return { content: [{ type: 'text', text: 'address and state are required' }], isError: true };
    }
    const params: Record<string, string> = {
      address: args.address as string,
      state: args.state as string,
    };
    if (args.city) params.city = args.city as string;
    if (args.zip) params.zip = args.zip as string;
    return this.get('/pro/byaddress', params);
  }

  private async searchPublicRecords(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      '$top': String((args.limit as number) ?? 20),
      '$skip': String((args.offset as number) ?? 0),
    };
    const filters: string[] = [];
    if (args.near) filters.push(`geo.distance(Coordinates,geography'POINT(${encodeURIComponent(args.near as string)})') le 5`);
    if (args.owner_name) filters.push(`OwnerName1 eq '${encodeURIComponent(args.owner_name as string)}'`);
    if (args.apn) filters.push(`APN eq '${encodeURIComponent(args.apn as string)}'`);
    if (filters.length > 0) params['$filter'] = filters.join(' and ');
    return this.get('/OData/AssessorParcel', params);
  }

  private async getMarketStats(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    const filters: string[] = [];
    if (args.zip) filters.push(`PostalCode eq '${encodeURIComponent(args.zip as string)}'`);
    if (args.city && args.state) {
      filters.push(`City eq '${encodeURIComponent(args.city as string)}'`);
      filters.push(`StateOrProvince eq '${encodeURIComponent(args.state as string)}'`);
    }
    if (args.property_type) filters.push(`PropertyType eq '${encodeURIComponent(args.property_type as string)}'`);
    if (filters.length > 0) params['$filter'] = filters.join(' and ');
    params['$select'] = 'MedianListPrice,MedianDaysOnMarket,ActiveListingCount,MedianPriceSqFt';
    return this.get('/OData/Property', params);
  }

  private async getPriceHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zpid) return { content: [{ type: 'text', text: 'zpid is required' }], isError: true };
    return this.get('/updatedPropertyDetails', { zpid: args.zpid as string });
  }

  private async searchRentals(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      '$top': String((args.limit as number) ?? 20),
      '$skip': String((args.offset as number) ?? 0),
    };
    const filters: string[] = [];
    if (args.near) filters.push(`geo.distance(Coordinates,geography'POINT(${encodeURIComponent(args.near as string)})') le 10`);
    if (args.min_price) filters.push(`ListPrice ge ${encodeURIComponent(args.min_price as string)}`);
    if (args.max_price) filters.push(`ListPrice le ${encodeURIComponent(args.max_price as string)}`);
    if (args.min_beds) filters.push(`BedroomsTotal ge ${encodeURIComponent(args.min_beds as string)}`);
    if (args.max_beds) filters.push(`BedroomsTotal le ${encodeURIComponent(args.max_beds as string)}`);
    if (args.property_type) filters.push(`PropertySubType eq '${encodeURIComponent(args.property_type as string)}'`);
    filters.push("PropertyType eq 'ResidentialLease'");
    if (filters.length > 0) params['$filter'] = filters.join(' and ');
    return this.get('/OData/Property', params);
  }

  private async getRentalListing(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.listing_id) return { content: [{ type: 'text', text: 'listing_id is required' }], isError: true };
    return this.get(`/OData/Property('${encodeURIComponent(args.listing_id as string)}')`, {});
  }

  private async calculateMortgage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.home_price || args.annual_interest_rate === undefined) {
      return { content: [{ type: 'text', text: 'home_price and annual_interest_rate are required' }], isError: true };
    }

    const homePrice = args.home_price as number;
    const downPayment = (args.down_payment as number) ?? homePrice * 0.20;
    const loanAmount = homePrice - downPayment;
    const termYears = (args.loan_term_years as number) ?? 30;
    const annualRate = args.annual_interest_rate as number;
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = termYears * 12;

    let monthlyPrincipalInterest: number;
    if (monthlyRate === 0) {
      monthlyPrincipalInterest = loanAmount / numPayments;
    } else {
      monthlyPrincipalInterest =
        (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
    }

    const propertyTaxMonthly = ((args.property_tax_annual as number) ?? 0) / 12;
    const hoaMonthly = (args.hoa_monthly as number) ?? 0;
    const insuranceMonthly = ((args.home_insurance_annual as number) ?? 0) / 12;
    const totalMonthly = monthlyPrincipalInterest + propertyTaxMonthly + hoaMonthly + insuranceMonthly;
    const totalInterest = monthlyPrincipalInterest * numPayments - loanAmount;
    const totalCost = loanAmount + totalInterest;

    const result = {
      inputs: {
        home_price: homePrice,
        down_payment: downPayment,
        loan_amount: loanAmount,
        loan_term_years: termYears,
        annual_interest_rate: `${annualRate}%`,
      },
      monthly_payment: {
        principal_and_interest: Math.round(monthlyPrincipalInterest * 100) / 100,
        property_tax: Math.round(propertyTaxMonthly * 100) / 100,
        hoa: Math.round(hoaMonthly * 100) / 100,
        home_insurance: Math.round(insuranceMonthly * 100) / 100,
        total: Math.round(totalMonthly * 100) / 100,
      },
      totals: {
        total_interest_paid: Math.round(totalInterest * 100) / 100,
        total_loan_cost: Math.round(totalCost * 100) / 100,
        total_with_down_payment: Math.round((totalCost + downPayment) * 100) / 100,
      },
    };

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false };
  }
}
