/**
 * Marketcheck Cars MCP Adapter (via Apigee)
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Marketcheck MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 15 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://marketcheck-prod.apigee.net/v2
// Auth: API key via `api_key` query parameter
//   Register at: https://developer.marketcheck.com
// Docs: https://developer.marketcheck.com/docs
// Rate limits: Depend on plan tier; always include api_key on requests

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MarketcheckCarsConfig {
  apiKey: string;
  baseUrl?: string;
}

export class MarketcheckCarsMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MarketcheckCarsConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://marketcheck-prod.apigee.net/v2';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_active_cars',
        description: 'Search active car listings in the Marketcheck database. Filter by make, model, year, price, mileage, zip code, and radius. Returns current inventory from dealers and private sellers.',
        inputSchema: {
          type: 'object',
          properties: {
            make: { type: 'string', description: 'Vehicle make (e.g., "Toyota", "Ford")' },
            model: { type: 'string', description: 'Vehicle model (e.g., "Camry", "F-150")' },
            year: { type: 'number', description: 'Vehicle model year' },
            trim: { type: 'string', description: 'Vehicle trim level (e.g., "XLE", "Lariat")' },
            zip: { type: 'string', description: 'ZIP code for location-based search' },
            radius: { type: 'number', description: 'Search radius in miles from zip (default: 50)' },
            price_min: { type: 'number', description: 'Minimum listing price in USD' },
            price_max: { type: 'number', description: 'Maximum listing price in USD' },
            miles_min: { type: 'number', description: 'Minimum odometer reading in miles' },
            miles_max: { type: 'number', description: 'Maximum odometer reading in miles' },
            car_type: { type: 'string', description: 'Listing type: used, new, or certified (default: used)' },
            rows: { type: 'number', description: 'Number of results per page, max 50 (default: 10)' },
            start: { type: 'number', description: 'Pagination offset (default: 0)' },
            sort_by: { type: 'string', description: 'Sort field: price, miles, year, or dom (days on market)' },
            sort_order: { type: 'string', description: 'Sort direction: asc or desc (default: asc)' },
          },
        },
      },
      {
        name: 'get_car_listing',
        description: 'Get full details for a specific car listing by Marketcheck listing ID. Returns VIN, price, mileage, dealer info, and vehicle specs.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Marketcheck listing ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_car_listing_extra',
        description: 'Get extended details for a car listing including options, features, and additional attributes.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Marketcheck listing ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_car_listing_media',
        description: 'Get media (photos and videos) for a specific car listing.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Marketcheck listing ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'decode_vin',
        description: 'Decode a Vehicle Identification Number (VIN) to get make, model, year, trim, engine, transmission, and all standard equipment specs.',
        inputSchema: {
          type: 'object',
          properties: {
            vin: { type: 'string', description: '17-character Vehicle Identification Number' },
          },
          required: ['vin'],
        },
      },
      {
        name: 'get_vehicle_history',
        description: 'Get vehicle history for a VIN including ownership count, accident reports, title issues, service records, and odometer readings.',
        inputSchema: {
          type: 'object',
          properties: {
            vin: { type: 'string', description: '17-character Vehicle Identification Number' },
          },
          required: ['vin'],
        },
      },
      {
        name: 'predict_car_price',
        description: 'Get a fair market value (FMV) price prediction for a vehicle based on make, model, year, trim, mileage, and zip code.',
        inputSchema: {
          type: 'object',
          properties: {
            vin: { type: 'string', description: '17-character VIN (preferred for accuracy)' },
            make: { type: 'string', description: 'Vehicle make' },
            model: { type: 'string', description: 'Vehicle model' },
            year: { type: 'number', description: 'Vehicle model year' },
            trim: { type: 'string', description: 'Vehicle trim' },
            miles: { type: 'number', description: 'Current odometer reading in miles' },
            zip: { type: 'string', description: 'ZIP code for regional pricing' },
          },
        },
      },
      {
        name: 'get_dealer',
        description: 'Get details for a specific car dealer by Marketcheck dealer ID, including location, inventory count, and contact info.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Marketcheck dealer ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_dealers',
        description: 'Search car dealers by location, name, or type. Returns dealer profile, inventory count, and ratings.',
        inputSchema: {
          type: 'object',
          properties: {
            zip: { type: 'string', description: 'ZIP code for location-based dealer search' },
            radius: { type: 'number', description: 'Search radius in miles (default: 25)' },
            name: { type: 'string', description: 'Dealer name search string' },
            dealer_type: { type: 'string', description: 'Dealer type: franchise, independent, or all' },
            rows: { type: 'number', description: 'Number of results (default: 10)' },
            start: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_dealer_active_inventory',
        description: 'Get the active vehicle listings for a specific dealer by dealer ID.',
        inputSchema: {
          type: 'object',
          properties: {
            dealer_id: { type: 'string', description: 'Marketcheck dealer ID' },
            rows: { type: 'number', description: 'Number of results (default: 10)' },
            start: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
          required: ['dealer_id'],
        },
      },
      {
        name: 'get_market_stats',
        description: 'Get market statistics for a specific vehicle segment — average price, average mileage, days on market, and supply/demand metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            make: { type: 'string', description: 'Vehicle make' },
            model: { type: 'string', description: 'Vehicle model' },
            year: { type: 'number', description: 'Vehicle model year' },
            trim: { type: 'string', description: 'Vehicle trim' },
            zip: { type: 'string', description: 'ZIP code for regional stats' },
            radius: { type: 'number', description: 'Search radius in miles (default: 50)' },
            car_type: { type: 'string', description: 'Listing type: used, new, or certified' },
          },
        },
      },
      {
        name: 'get_popular_cars',
        description: 'Get a list of popular cars ranked by search activity and sales volume on Marketcheck.',
        inputSchema: {
          type: 'object',
          properties: {
            zip: { type: 'string', description: 'ZIP code for regional popularity' },
            radius: { type: 'number', description: 'Search radius in miles (default: 50)' },
            car_type: { type: 'string', description: 'Listing type: used or new' },
          },
        },
      },
      {
        name: 'search_car_sales',
        description: 'Search historical car sales (sold listings) to analyze actual transaction prices and market trends.',
        inputSchema: {
          type: 'object',
          properties: {
            make: { type: 'string', description: 'Vehicle make' },
            model: { type: 'string', description: 'Vehicle model' },
            year: { type: 'number', description: 'Vehicle model year' },
            zip: { type: 'string', description: 'ZIP code for regional sales data' },
            radius: { type: 'number', description: 'Search radius in miles' },
            rows: { type: 'number', description: 'Number of results (default: 10)' },
            start: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_car_recall',
        description: 'Get NHTSA recall information for a vehicle by VIN. Returns active and past recalls with description and remedy status.',
        inputSchema: {
          type: 'object',
          properties: {
            vin: { type: 'string', description: '17-character Vehicle Identification Number' },
          },
          required: ['vin'],
        },
      },
      {
        name: 'get_vin_specs',
        description: "Get detailed technical specifications for a vehicle VIN using Marketcheck's MDS (Market Data Store) — includes engine, transmission, fuel economy, dimensions, and standard features.",
        inputSchema: {
          type: 'object',
          properties: {
            vin: { type: 'string', description: '17-character Vehicle Identification Number' },
          },
          required: ['vin'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_active_cars':
          return await this.searchActiveCars(args);
        case 'get_car_listing':
          return await this.getCarListing(args);
        case 'get_car_listing_extra':
          return await this.getCarListingExtra(args);
        case 'get_car_listing_media':
          return await this.getCarListingMedia(args);
        case 'decode_vin':
          return await this.decodeVin(args);
        case 'get_vehicle_history':
          return await this.getVehicleHistory(args);
        case 'predict_car_price':
          return await this.predictCarPrice(args);
        case 'get_dealer':
          return await this.getDealer(args);
        case 'search_dealers':
          return await this.searchDealers(args);
        case 'get_dealer_active_inventory':
          return await this.getDealerActiveInventory(args);
        case 'get_market_stats':
          return await this.getMarketStats(args);
        case 'get_popular_cars':
          return await this.getPopularCars(args);
        case 'search_car_sales':
          return await this.searchCarSales(args);
        case 'get_car_recall':
          return await this.getCarRecall(args);
        case 'get_vin_specs':
          return await this.getVinSpecs(args);
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

  private async request(path: string, extraParams: Record<string, string | number | undefined> = {}): Promise<ToolResult> {
    const params = new URLSearchParams({ api_key: this.apiKey });
    for (const [k, v] of Object.entries(extraParams)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    const url = `${this.baseUrl}${path}?${params.toString()}`;
    const response = await this.fetchWithRetry(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'EpicAI-MarketcheckCars-MCP/1.0' },
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `Marketcheck API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Marketcheck returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async searchActiveCars(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('/search/car/active', {
      make: args.make as string,
      model: args.model as string,
      year: args.year as number,
      trim: args.trim as string,
      zip: args.zip as string,
      radius: args.radius as number,
      price_min: args.price_min as number,
      price_max: args.price_max as number,
      miles_min: args.miles_min as number,
      miles_max: args.miles_max as number,
      car_type: args.car_type as string,
      rows: args.rows as number,
      start: args.start as number,
      sort_by: args.sort_by as string,
      sort_order: args.sort_order as string,
    });
  }

  private async getCarListing(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request(`/listing/car/${encodeURIComponent(id)}`);
  }

  private async getCarListingExtra(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request(`/listing/car/${encodeURIComponent(id)}/extra`);
  }

  private async getCarListingMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request(`/listing/car/${encodeURIComponent(id)}/media`);
  }

  private async decodeVin(args: Record<string, unknown>): Promise<ToolResult> {
    const vin = args.vin as string;
    if (!vin) return { content: [{ type: 'text', text: 'vin is required' }], isError: true };
    return this.request(`/decode/car/${encodeURIComponent(vin)}/specs`);
  }

  private async getVehicleHistory(args: Record<string, unknown>): Promise<ToolResult> {
    const vin = args.vin as string;
    if (!vin) return { content: [{ type: 'text', text: 'vin is required' }], isError: true };
    return this.request(`/history/car/${encodeURIComponent(vin)}`);
  }

  private async predictCarPrice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('/predict/car/price', {
      vin: args.vin as string,
      make: args.make as string,
      model: args.model as string,
      year: args.year as number,
      trim: args.trim as string,
      miles: args.miles as number,
      zip: args.zip as string,
    });
  }

  private async getDealer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request(`/dealer/car/${encodeURIComponent(id)}`);
  }

  private async searchDealers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('/dealers/car', {
      zip: args.zip as string,
      radius: args.radius as number,
      name: args.name as string,
      dealer_type: args.dealer_type as string,
      rows: args.rows as number,
      start: args.start as number,
    });
  }

  private async getDealerActiveInventory(args: Record<string, unknown>): Promise<ToolResult> {
    const dealerId = args.dealer_id as string;
    if (!dealerId) return { content: [{ type: 'text', text: 'dealer_id is required' }], isError: true };
    return this.request('/car/dealer/inventory/active', {
      dealer_id: dealerId,
      rows: args.rows as number,
      start: args.start as number,
    });
  }

  private async getMarketStats(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('/stats/car', {
      make: args.make as string,
      model: args.model as string,
      year: args.year as number,
      trim: args.trim as string,
      zip: args.zip as string,
      radius: args.radius as number,
      car_type: args.car_type as string,
    });
  }

  private async getPopularCars(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('/popular/cars', {
      zip: args.zip as string,
      radius: args.radius as number,
      car_type: args.car_type as string,
    });
  }

  private async searchCarSales(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('/sales/car', {
      make: args.make as string,
      model: args.model as string,
      year: args.year as number,
      zip: args.zip as string,
      radius: args.radius as number,
      rows: args.rows as number,
      start: args.start as number,
    });
  }

  private async getCarRecall(args: Record<string, unknown>): Promise<ToolResult> {
    const vin = args.vin as string;
    if (!vin) return { content: [{ type: 'text', text: 'vin is required' }], isError: true };
    return this.request(`/car/recall/${encodeURIComponent(vin)}`);
  }

  private async getVinSpecs(args: Record<string, unknown>): Promise<ToolResult> {
    const vin = args.vin as string;
    if (!vin) return { content: [{ type: 'text', text: 'vin is required' }], isError: true };
    return this.request('/mds/car', { vin });
  }

  static catalog() {
    return {
      name: 'apigee-marketcheck-cars',
      displayName: 'Marketcheck Cars',
      version: '1.0.0',
      category: 'automotive' as const,
      keywords: ['marketcheck', 'cars', 'automotive', 'vehicle', 'vin', 'dealer', 'inventory', 'pricing'],
      toolNames: ['search_active_cars', 'get_car_listing', 'get_car_listing_extra', 'get_car_listing_media', 'decode_vin', 'get_vehicle_history', 'predict_car_price', 'get_dealer', 'search_dealers', 'get_dealer_active_inventory', 'get_market_stats', 'get_popular_cars', 'search_car_sales', 'get_car_recall', 'get_vin_specs'],
      description: 'Marketcheck Cars adapter for the Epic AI Intelligence Platform — search vehicle listings, decode VINs, get market pricing, and access dealer inventory',
      author: 'protectnil' as const,
    };
  }
}
