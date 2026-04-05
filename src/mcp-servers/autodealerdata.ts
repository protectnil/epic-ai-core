/**
 * AutoDealerData (CIS Automotive) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official AutoDealerData / CIS Automotive MCP server was found on GitHub.
// We build a full REST wrapper covering automotive inventory, supply data, sales analytics,
// market share, vehicle listings, pricing, and VIN decoding.
//
// Base URL: https://api.autodealerdata.com
// Auth: API key credentials → GET /getToken?apiID=&apiKey= → JWT; JWT passed as query param
// Docs: https://autodealerdata.com/APIQuickStart
// Rate limits: Plan-dependent; Developer plan or greater required for most endpoints

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AutoDealerDataConfig {
  apiID: string;
  apiKey: string;
  baseUrl?: string;
}

export class AutoDealerDataMCPServer extends MCPAdapterBase {
  private readonly apiID: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  private jwt: string | null = null;
  private jwtExpiry: number = 0;

  constructor(config: AutoDealerDataConfig) {
    super();
    this.apiID   = config.apiID;
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.autodealerdata.com';
  }

  static catalog() {
    return {
      name: 'autodealerdata',
      displayName: 'AutoDealerData (CIS Automotive)',
      version: '1.0.0',
      category: 'automotive',
      keywords: [
        'autodealerdata', 'cis automotive', 'automotive', 'car dealer', 'vehicle inventory',
        'days supply', 'days to sell', 'car listings', 'vehicle listings', 'auto market',
        'market share', 'brand sales', 'region sales', 'vin decode', 'vehicle history',
        'list price', 'sale price', 'vehicle valuation', 'new cars', 'used cars',
        'dealer lookup', 'dealership', 'auto intelligence', 'automotive data',
      ],
      toolNames: [
        'get_token',
        'get_brands',
        'get_regions',
        'get_models',
        'get_inactive_models',
        'get_days_supply',
        'get_days_to_sell',
        'get_list_price',
        'get_sale_price',
        'get_sale_price_histogram',
        'get_top_models',
        'get_region_market_share',
        'get_region_brand_market_share',
        'get_model_year_distribution',
        'get_region_daily_sales',
        'get_region_sales',
        'get_dealers',
        'get_dealers_by_id',
        'get_dealers_by_region',
        'get_listings',
        'search_listings',
        'get_listings_by_date',
        'get_listings_by_region',
        'get_listings_by_region_and_date',
        'get_listings_by_zipcode',
        'get_listings_by_zipcode_and_date',
        'get_similar_sale_price',
        'get_valuation',
        'decode_vin',
        'get_vehicle_history',
        'check_vehicle_seen',
      ],
      description: 'CIS Automotive API: dealer inventory, supply analytics, sales data, market share, vehicle listings, pricing stats, VIN decode, and vehicle history reports.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Authentication ------------------------------------------------------
      {
        name: 'get_token',
        description: 'Obtain a JWT from API credentials — required before calling any other endpoint',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      // -- Static/Reference Data -----------------------------------------------
      {
        name: 'get_brands',
        description: 'List all supported vehicle brand names used as arguments in other endpoints',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_regions',
        description: 'List all supported region names (e.g. REGION_STATE_CA) used as arguments in other endpoints',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_models',
        description: 'List active vehicle model names for a given brand — use returned names with other endpoints',
        inputSchema: {
          type: 'object',
          properties: {
            brandName: { type: 'string', description: 'Vehicle brand name (e.g. Toyota, Ford, BMW)' },
          },
          required: ['brandName'],
        },
      },
      {
        name: 'get_inactive_models',
        description: 'List all model names for a brand including discontinued models',
        inputSchema: {
          type: 'object',
          properties: {
            brandName: { type: 'string', description: 'Vehicle brand name' },
          },
          required: ['brandName'],
        },
      },
      // -- Supply & Demand Analytics -------------------------------------------
      {
        name: 'get_days_supply',
        description: 'Get days of supply (average, median, stddev) remaining on dealer lots for a brand and region',
        inputSchema: {
          type: 'object',
          properties: {
            brandName:  { type: 'string', description: 'Vehicle brand name (e.g. Toyota)' },
            regionName: { type: 'string', description: 'Region name (default: REGION_STATE_CA)' },
          },
          required: ['brandName'],
        },
      },
      {
        name: 'get_days_to_sell',
        description: 'Get average/median days a vehicle spends on dealer lots before selling for a brand and region',
        inputSchema: {
          type: 'object',
          properties: {
            brandName:  { type: 'string', description: 'Vehicle brand name' },
            regionName: { type: 'string', description: 'Region name (default: REGION_STATE_CA)' },
          },
          required: ['brandName'],
        },
      },
      // -- Pricing Analytics ---------------------------------------------------
      {
        name: 'get_list_price',
        description: 'Get statistical summary of new vehicle ask (list) prices for a brand and region',
        inputSchema: {
          type: 'object',
          properties: {
            brandName:  { type: 'string', description: 'Vehicle brand name' },
            regionName: { type: 'string', description: 'Region name (default: REGION_STATE_CA)' },
          },
          required: ['brandName'],
        },
      },
      {
        name: 'get_sale_price',
        description: 'Get statistical summary of new vehicle sale prices for a brand and region',
        inputSchema: {
          type: 'object',
          properties: {
            brandName:  { type: 'string', description: 'Vehicle brand name' },
            regionName: { type: 'string', description: 'Region name (default: REGION_STATE_CA)' },
          },
          required: ['brandName'],
        },
      },
      {
        name: 'get_sale_price_histogram',
        description: 'Get a histogram of sale prices for new vehicles broken down by model',
        inputSchema: {
          type: 'object',
          properties: {
            modelName:  { type: 'string', description: 'Vehicle model name (e.g. Camry)' },
            brandName:  { type: 'string', description: 'Vehicle brand name' },
            regionName: { type: 'string', description: 'Region name (default: REGION_STATE_CA)' },
          },
          required: ['modelName', 'brandName'],
        },
      },
      // -- Market Share & Sales ------------------------------------------------
      {
        name: 'get_top_models',
        description: 'Get the top-selling vehicle models in a given region by sales volume',
        inputSchema: {
          type: 'object',
          properties: {
            regionName: { type: 'string', description: 'Region name (default: REGION_STATE_CA)' },
          },
          required: ['regionName'],
        },
      },
      {
        name: 'get_region_market_share',
        description: 'Get market share percentages for all brands in a given region',
        inputSchema: {
          type: 'object',
          properties: {
            regionName: { type: 'string', description: 'Region name' },
          },
          required: ['regionName'],
        },
      },
      {
        name: 'get_region_brand_market_share',
        description: 'Get market share for a specific brand in a specific region',
        inputSchema: {
          type: 'object',
          properties: {
            brandName:  { type: 'string', description: 'Vehicle brand name' },
            regionName: { type: 'string', description: 'Region name' },
          },
          required: ['brandName', 'regionName'],
        },
      },
      {
        name: 'get_model_year_distribution',
        description: 'Get used vehicle market share broken down by model year for a specific model',
        inputSchema: {
          type: 'object',
          properties: {
            modelName:  { type: 'string', description: 'Vehicle model name' },
            brandName:  { type: 'string', description: 'Vehicle brand name' },
            regionName: { type: 'string', description: 'Region name (default: REGION_STATE_CA)' },
          },
          required: ['modelName', 'brandName'],
        },
      },
      {
        name: 'get_region_daily_sales',
        description: 'Get brand sales volume for a region on a specific day',
        inputSchema: {
          type: 'object',
          properties: {
            brandName:  { type: 'string', description: 'Vehicle brand name' },
            regionName: { type: 'string', description: 'Region name' },
            day:        { type: 'string', description: 'Date in YYYY-MM-DD format' },
          },
          required: ['brandName', 'regionName', 'day'],
        },
      },
      {
        name: 'get_region_sales',
        description: 'Get brand sales volume for a region for a specific month (Premium plan required)',
        inputSchema: {
          type: 'object',
          properties: {
            brandName:  { type: 'string', description: 'Vehicle brand name' },
            regionName: { type: 'string', description: 'Region name' },
            month:      { type: 'string', description: 'Month in YYYY-MM format' },
          },
          required: ['brandName', 'regionName', 'month'],
        },
      },
      // -- Dealer Lookup -------------------------------------------------------
      {
        name: 'get_dealers',
        description: 'Get dealership info (name, address, state, zip) for dealers near a zip code prefix (Premium)',
        inputSchema: {
          type: 'object',
          properties: {
            zipCode: { type: 'string', description: 'First 4-5 digits of a US zip code (e.g. 9270 matches 92700-92709)' },
          },
          required: ['zipCode'],
        },
      },
      {
        name: 'get_dealers_by_id',
        description: 'Get dealership details by dealer ID (Premium)',
        inputSchema: {
          type: 'object',
          properties: {
            dealerID: { type: 'string', description: 'Dealer ID as returned by get_dealers or get_listings' },
          },
          required: ['dealerID'],
        },
      },
      {
        name: 'get_dealers_by_region',
        description: 'Get all dealerships in a region with pagination (Premium)',
        inputSchema: {
          type: 'object',
          properties: {
            regionName: { type: 'string', description: 'Region name' },
            page:       { type: 'number', description: 'Page number for pagination (default: 1)' },
          },
          required: ['regionName'],
        },
      },
      // -- Vehicle Listings ----------------------------------------------------
      {
        name: 'get_listings',
        description: 'Get vehicle listings for a specific dealer by dealer ID with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            dealerID: { type: 'string', description: 'Dealer ID' },
            page:     { type: 'number', description: 'Page number (default: 1)' },
            newCars:  { type: 'boolean', description: 'True for new vehicles, false for used (default: true)' },
          },
          required: ['dealerID'],
        },
      },
      {
        name: 'search_listings',
        description: 'Flexible listing search by dealer, zip, coordinates, region, brand, model, year, mileage, or date range',
        inputSchema: {
          type: 'object',
          properties: {
            dealerID:       { type: 'string',  description: 'Filter by dealer ID' },
            zipCode:        { type: 'string',  description: 'Filter by zip code' },
            latitude:       { type: 'number',  description: 'Latitude for radius search' },
            longitude:      { type: 'number',  description: 'Longitude for radius search' },
            radius:         { type: 'number',  description: 'Search radius in miles (used with lat/lon)' },
            regionName:     { type: 'string',  description: 'Filter by region name' },
            brandName:      { type: 'string',  description: 'Filter by brand' },
            modelName:      { type: 'string',  description: 'Filter by model' },
            modelYear:      { type: 'string',  description: 'Filter by model year (e.g. 2024)' },
            mileageLow:     { type: 'number',  description: 'Minimum mileage filter' },
            mileageHigh:    { type: 'number',  description: 'Maximum mileage filter' },
            startDate:      { type: 'string',  description: 'Listing start date YYYY-MM-DD' },
            endDate:        { type: 'string',  description: 'Listing end date YYYY-MM-DD' },
            daysBack:       { type: 'number',  description: 'Number of days back to search' },
            page:           { type: 'number',  description: 'Page number (default: 1)' },
            newCars:        { type: 'boolean', description: 'True for new, false for used (default: true)' },
            extendedSearch: { type: 'boolean', description: 'Enable extended search for broader results' },
          },
          required: [],
        },
      },
      {
        name: 'get_listings_by_date',
        description: 'Get vehicle listings for a dealer filtered by a date range',
        inputSchema: {
          type: 'object',
          properties: {
            dealerID:  { type: 'string',  description: 'Dealer ID' },
            startDate: { type: 'string',  description: 'Start date YYYY-MM-DD' },
            endDate:   { type: 'string',  description: 'End date YYYY-MM-DD' },
            page:      { type: 'number',  description: 'Page number (default: 1)' },
            newCars:   { type: 'boolean', description: 'True for new, false for used' },
          },
          required: ['dealerID', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_listings_by_region',
        description: 'Get vehicle listings across a region filtered by model and lookback window',
        inputSchema: {
          type: 'object',
          properties: {
            regionName: { type: 'string',  description: 'Region name' },
            modelName:  { type: 'string',  description: 'Model name filter' },
            daysBack:   { type: 'number',  description: 'Number of days back to include' },
            page:       { type: 'number',  description: 'Page number (default: 1)' },
            newCars:    { type: 'boolean', description: 'True for new, false for used' },
          },
          required: ['regionName'],
        },
      },
      {
        name: 'get_listings_by_region_and_date',
        description: 'Get vehicle listings for a region filtered by model and date range',
        inputSchema: {
          type: 'object',
          properties: {
            regionName: { type: 'string',  description: 'Region name' },
            modelName:  { type: 'string',  description: 'Model name filter' },
            startDate:  { type: 'string',  description: 'Start date YYYY-MM-DD' },
            endDate:    { type: 'string',  description: 'End date YYYY-MM-DD' },
            page:       { type: 'number',  description: 'Page number (default: 1)' },
            newCars:    { type: 'boolean', description: 'True for new, false for used' },
          },
          required: ['regionName', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_listings_by_zipcode',
        description: 'Get vehicle listings near a zip code with optional model filter',
        inputSchema: {
          type: 'object',
          properties: {
            zipCode:   { type: 'string',  description: 'US zip code' },
            page:      { type: 'number',  description: 'Page number (default: 1)' },
            newCars:   { type: 'boolean', description: 'True for new, false for used' },
            modelName: { type: 'string',  description: 'Optional model name filter' },
          },
          required: ['zipCode'],
        },
      },
      {
        name: 'get_listings_by_zipcode_and_date',
        description: 'Get vehicle listings near a zip code filtered by date range and optional model',
        inputSchema: {
          type: 'object',
          properties: {
            zipCode:   { type: 'string',  description: 'US zip code' },
            startDate: { type: 'string',  description: 'Start date YYYY-MM-DD' },
            endDate:   { type: 'string',  description: 'End date YYYY-MM-DD' },
            page:      { type: 'number',  description: 'Page number (default: 1)' },
            newCars:   { type: 'boolean', description: 'True for new, false for used' },
            modelName: { type: 'string',  description: 'Optional model name filter' },
          },
          required: ['zipCode', 'startDate', 'endDate'],
        },
      },
      // -- Valuation & Vehicle Reports -----------------------------------------
      {
        name: 'get_similar_sale_price',
        description: 'Get a simple market report of comparable vehicle sale prices by VIN (Premium)',
        inputSchema: {
          type: 'object',
          properties: {
            vin:        { type: 'string',  description: '17-character Vehicle Identification Number' },
            regionName: { type: 'string',  description: 'Region to compare within (default: REGION_STATE_CA)' },
            daysBack:   { type: 'number',  description: 'Lookback window in days (default: 90)' },
            sameYear:   { type: 'boolean', description: 'Restrict comparison to same model year (default: true)' },
          },
          required: ['vin'],
        },
      },
      {
        name: 'get_valuation',
        description: 'Get a comprehensive vehicle market valuation report over arbitrary locations by VIN (Premium)',
        inputSchema: {
          type: 'object',
          properties: {
            vin:            { type: 'string',  description: '17-character Vehicle Identification Number' },
            dealerID:       { type: 'string',  description: 'Dealer ID for location context' },
            zipCode:        { type: 'string',  description: 'Zip code for location context' },
            latitude:       { type: 'number',  description: 'Latitude for radius-based comparison' },
            longitude:      { type: 'number',  description: 'Longitude for radius-based comparison' },
            radius:         { type: 'number',  description: 'Radius in miles' },
            regionName:     { type: 'string',  description: 'Region name for comparison' },
            mileageLow:     { type: 'number',  description: 'Minimum mileage for comparable vehicles' },
            mileageHigh:    { type: 'number',  description: 'Maximum mileage for comparable vehicles' },
            startDate:      { type: 'string',  description: 'Start date YYYY-MM-DD' },
            endDate:        { type: 'string',  description: 'End date YYYY-MM-DD' },
            daysBack:       { type: 'number',  description: 'Lookback window in days' },
            newCars:        { type: 'boolean', description: 'True for new, false for used' },
            extendedSearch: { type: 'boolean', description: 'Enable extended search' },
            sameYear:       { type: 'boolean', description: 'Restrict to same model year' },
          },
          required: ['vin'],
        },
      },
      {
        name: 'decode_vin',
        description: 'Decode a VIN to get vehicle specifications and optionally retrieve NHTSA recall information',
        inputSchema: {
          type: 'object',
          properties: {
            vin:           { type: 'string',  description: '17-character Vehicle Identification Number' },
            passEmpty:     { type: 'boolean', description: 'Include fields with empty values in response (default: false)' },
            includeRecall: { type: 'boolean', description: 'Include NHTSA recall data in response (default: false)' },
          },
          required: ['vin'],
        },
      },
      {
        name: 'get_vehicle_history',
        description: 'Get vehicle history report by VIN including ownership and accident data (Premium)',
        inputSchema: {
          type: 'object',
          properties: {
            vin: { type: 'string', description: '17-character Vehicle Identification Number' },
          },
          required: ['vin'],
        },
      },
      {
        name: 'check_vehicle_seen',
        description: 'Check whether a VIN appeared in the automotive market on or after a specified date',
        inputSchema: {
          type: 'object',
          properties: {
            vin:       { type: 'string', description: '17-character Vehicle Identification Number' },
            afterDate: { type: 'string', description: 'Date threshold in YYYY-MM-DD format' },
          },
          required: ['vin', 'afterDate'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_token':                        return this.getTokenTool();
        case 'get_brands':                       return this.get('/getBrands', {});
        case 'get_regions':                      return this.get('/getRegions', {});
        case 'get_models':                       return this.get('/getModels', this.pick(args, ['brandName']));
        case 'get_inactive_models':              return this.get('/getInactiveModels', this.pick(args, ['brandName']));
        case 'get_days_supply':                  return this.get('/daysSupply', this.pick(args, ['brandName', 'regionName']));
        case 'get_days_to_sell':                 return this.get('/daysToSell', this.pick(args, ['brandName', 'regionName']));
        case 'get_list_price':                   return this.get('/listPrice', this.pick(args, ['brandName', 'regionName']));
        case 'get_sale_price':                   return this.get('/salePrice', this.pick(args, ['brandName', 'regionName']));
        case 'get_sale_price_histogram':         return this.get('/salePriceHistogram', this.pick(args, ['modelName', 'brandName', 'regionName']));
        case 'get_top_models':                   return this.get('/topModels', this.pick(args, ['regionName']));
        case 'get_region_market_share':          return this.get('/getRegionMarketShare', this.pick(args, ['regionName']));
        case 'get_region_brand_market_share':    return this.get('/getRegionBrandMarketShare', this.pick(args, ['brandName', 'regionName']));
        case 'get_model_year_distribution':      return this.get('/modelYearDist', this.pick(args, ['modelName', 'brandName', 'regionName']));
        case 'get_region_daily_sales':           return this.get('/regionDailySales', this.pick(args, ['brandName', 'regionName', 'day']));
        case 'get_region_sales':                 return this.get('/regionSales', this.pick(args, ['brandName', 'regionName', 'month']));
        case 'get_dealers':                      return this.get('/getDealers', this.pick(args, ['zipCode']));
        case 'get_dealers_by_id':                return this.get('/getDealersByID', this.pick(args, ['dealerID']));
        case 'get_dealers_by_region':            return this.get('/getDealersByRegion', this.pick(args, ['regionName', 'page']));
        case 'get_listings':                     return this.get('/listings', this.pick(args, ['dealerID', 'page', 'newCars']));
        case 'search_listings':                  return this.get('/listings2', this.pick(args, ['dealerID', 'zipCode', 'latitude', 'longitude', 'radius', 'regionName', 'brandName', 'modelName', 'modelYear', 'mileageLow', 'mileageHigh', 'startDate', 'endDate', 'daysBack', 'page', 'newCars', 'extendedSearch']));
        case 'get_listings_by_date':             return this.get('/listingsByDate', this.pick(args, ['dealerID', 'startDate', 'endDate', 'page', 'newCars']));
        case 'get_listings_by_region':           return this.get('/listingsByRegion', this.pick(args, ['regionName', 'modelName', 'daysBack', 'page', 'newCars']));
        case 'get_listings_by_region_and_date':  return this.get('/listingsByRegionAndDate', this.pick(args, ['regionName', 'modelName', 'startDate', 'endDate', 'page', 'newCars']));
        case 'get_listings_by_zipcode':          return this.get('/listingsByZipCode', this.pick(args, ['zipCode', 'page', 'newCars', 'modelName']));
        case 'get_listings_by_zipcode_and_date': return this.get('/listingsByZipCodeAndDate', this.pick(args, ['zipCode', 'startDate', 'endDate', 'page', 'newCars', 'modelName']));
        case 'get_similar_sale_price':           return this.get('/similarSalePrice', this.pick(args, ['vin', 'regionName', 'daysBack', 'sameYear']));
        case 'get_valuation':                    return this.get('/valuation', this.pick(args, ['vin', 'dealerID', 'zipCode', 'latitude', 'longitude', 'radius', 'regionName', 'mileageLow', 'mileageHigh', 'startDate', 'endDate', 'daysBack', 'newCars', 'extendedSearch', 'sameYear']));
        case 'decode_vin':                       return this.get('/vinDecode', this.pick(args, ['vin', 'passEmpty', 'includeRecall']));
        case 'get_vehicle_history':              return this.get('/vehicleHistory', this.pick(args, ['vin']));
        case 'check_vehicle_seen':               return this.get('/vehicleSeen', this.pick(args, ['vin', 'afterDate']));
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

  // -- JWT management ---------------------------------------------------------

  private async getOrRefreshJWT(): Promise<string> {
    const now = Date.now();
    if (this.jwt && this.jwtExpiry > now) {
      return this.jwt;
    }
    const qs = new URLSearchParams({ apiID: this.apiID, apiKey: this.apiKey }).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}/getToken?${qs}`, {});
    if (!response.ok) {
      throw new Error(`JWT request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { jwt?: string; token?: string; data?: string };
    const token = data.jwt || data.token || data.data;
    if (!token) {
      throw new Error(`No JWT in response: ${JSON.stringify(data).slice(0, 200)}`);
    }
    this.jwt = token;
    // Cache for 55 minutes (JWTs from this API are session-scoped)
    this.jwtExpiry = now + 55 * 60 * 1000;
    return this.jwt;
  }

  private async getTokenTool(): Promise<ToolResult> {
    this.jwt = null;
    this.jwtExpiry = 0;
    const token = await this.getOrRefreshJWT();
    return {
      content: [{ type: 'text', text: JSON.stringify({ jwt: token }) }],
      isError: false,
    };
  }

  // -- Helpers ----------------------------------------------------------------

  private pick(args: Record<string, unknown>, keys: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const key of keys) {
      if (args[key] !== undefined && args[key] !== null && args[key] !== '') {
        out[key] = String(args[key]);
      }
    }
    return out;
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const jwt = await this.getOrRefreshJWT();
    const allParams = { jwt, ...params };
    const qs = new URLSearchParams(allParams).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, {});
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API error ${response.status}: ${body.slice(0, 500)}`);
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }
}
