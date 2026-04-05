/**
 * DHL MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official DHL-maintained MCP server was found on GitHub. Community tool (benbonn/utapimcp)
// exposes only 1 tool (track-shipment), not officially maintained by DHL.
// Our adapter covers: 11 tools. Vendor MCP covers: 1 tool (tracking only).
// Recommendation: use-rest-api — community MCP has only 1 tool vs our 11.
//
// NOTE: This adapter spans THREE separate DHL APIs with DIFFERENT base URLs and auth:
//
// [1] DHL Shipment Tracking - Unified
//     Base URL: https://api.dhl.com
//     Auth: DHL-API-Key header (developer portal subscription key from developer.dhl.com)
//     Docs: https://developer.dhl.com/api-reference/shipment-tracking
//     Rate limits: 250 calls/day at 1 call/5 sec (development tier); higher on request
//     Tools: track_shipment, get_shipment_events
//
// [2] DHL Location Finder - Unified
//     Base URL: https://api.dhl.com
//     Auth: DHL-API-Key header (same developer portal subscription key)
//     Docs: https://developer.dhl.com/api-reference/location-finder
//     Rate limits: 500 calls/day (development tier)
//     Tools: find_service_points, get_service_point
//
// [3] DHL Express - MyDHL API
//     Base URL: https://express.api.dhl.com/mydhlapi
//     Auth: BasicAuth (Authorization: Basic base64(username:password)) — credentials provided by DHL
//           Express consultant, separate from developer portal key
//     Docs: https://developer.dhl.com/api-reference/mydhl-api-dhl-express
//     Rate limits: 500 calls/day (test); production limits plan-dependent
//     Tools: get_rate_quote, get_transit_times, create_shipment, cancel_shipment,
//            create_pickup, cancel_pickup, get_capabilities

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DHLConfig {
  apiKey: string;          // Developer portal subscription key (Tracking + Location Finder APIs)
  expressUsername?: string; // DHL Express MyDHL API BasicAuth username (from DHL Express consultant)
  expressPassword?: string; // DHL Express MyDHL API BasicAuth password (from DHL Express consultant)
  baseUrl?: string;
}

export class DHLMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly expressUsername: string;
  private readonly expressPassword: string;
  private readonly baseUrl: string;
  private readonly expressBaseUrl: string;

  constructor(config: DHLConfig) {
    super();
    this.apiKey = config.apiKey;
    this.expressUsername = config.expressUsername || '';
    this.expressPassword = config.expressPassword || '';
    this.baseUrl = config.baseUrl || 'https://api.dhl.com';
    this.expressBaseUrl = 'https://express.api.dhl.com/mydhlapi';
  }

  static catalog() {
    return {
      name: 'dhl',
      displayName: 'DHL',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'dhl', 'shipping', 'shipment', 'tracking', 'parcel', 'courier', 'logistics',
        'freight', 'delivery', 'waybill', 'express', 'international shipping',
        'package tracking', 'location finder', 'service point',
      ],
      toolNames: [
        'track_shipment', 'get_shipment_events',
        'find_service_points', 'get_service_point',
        'get_rate_quote', 'get_transit_times',
        'create_shipment', 'cancel_shipment',
        'create_pickup', 'cancel_pickup',
        'get_capabilities',
      ],
      description: 'DHL international shipping: track shipments, find service points, get rate quotes, transit times, create and cancel shipments and pickups.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'track_shipment',
        description: 'Track one or more DHL shipments by tracking number, returning current status and full event history',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_number: {
              type: 'string',
              description: 'DHL tracking number (waybill number). For multiple, separate with commas (max 10).',
            },
            service: {
              type: 'string',
              description: 'DHL service to use: express (DHL Express), ecommerce (DHL eCommerce), dgf (DHL Global Forwarding), freight (DHL Freight), parcel (DHL Parcel). Omit to auto-detect.',
            },
            language: {
              type: 'string',
              description: 'Language code for event descriptions (e.g. en, de, fr). Default: en',
            },
          },
          required: ['tracking_number'],
        },
      },
      {
        name: 'get_shipment_events',
        description: 'Retrieve the complete checkpoint event timeline for a DHL shipment with timestamps and location details',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_number: {
              type: 'string',
              description: 'DHL tracking number for which to retrieve events',
            },
            language: {
              type: 'string',
              description: 'Language code for event descriptions (default: en)',
            },
          },
          required: ['tracking_number'],
        },
      },
      {
        name: 'find_service_points',
        description: 'Find DHL service points (drop-off locations, DHL Express service points, parcel lockers) near a given address or coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. US, DE, GB)',
            },
            address_line: {
              type: 'string',
              description: 'Street address for proximity search',
            },
            city: {
              type: 'string',
              description: 'City name for the search',
            },
            postal_code: {
              type: 'string',
              description: 'Postal/ZIP code for proximity search',
            },
            latitude: {
              type: 'number',
              description: 'Latitude coordinate for geo-based search',
            },
            longitude: {
              type: 'number',
              description: 'Longitude coordinate for geo-based search',
            },
            radius: {
              type: 'number',
              description: 'Search radius in kilometers (default: 5, max: 50)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of service points to return (default: 10, max: 50)',
            },
            service_type: {
              type: 'string',
              description: 'Filter by service type: locker, servicepoint, all (default: all)',
            },
          },
          required: ['country_code'],
        },
      },
      {
        name: 'get_service_point',
        description: 'Get detailed information about a specific DHL service point by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: {
              type: 'string',
              description: 'DHL location/service point ID',
            },
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. DE)',
            },
          },
          required: ['location_id', 'country_code'],
        },
      },
      {
        name: 'get_rate_quote',
        description: 'Get DHL Express shipping rate quotes for a shipment between origin and destination with specified weight and dimensions',
        inputSchema: {
          type: 'object',
          properties: {
            origin_country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 origin country code (e.g. US)',
            },
            origin_postal_code: {
              type: 'string',
              description: 'Origin postal/ZIP code',
            },
            destination_country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 destination country code (e.g. DE)',
            },
            destination_postal_code: {
              type: 'string',
              description: 'Destination postal/ZIP code',
            },
            weight: {
              type: 'number',
              description: 'Shipment weight in kilograms',
            },
            length: {
              type: 'number',
              description: 'Package length in centimeters',
            },
            width: {
              type: 'number',
              description: 'Package width in centimeters',
            },
            height: {
              type: 'number',
              description: 'Package height in centimeters',
            },
            planned_date: {
              type: 'string',
              description: 'Planned ship date in YYYY-MM-DD format (default: today)',
            },
            is_customs_declarable: {
              type: 'boolean',
              description: 'Whether the shipment requires customs declaration (default: false)',
            },
          },
          required: ['origin_country', 'destination_country', 'weight'],
        },
      },
      {
        name: 'get_transit_times',
        description: 'Get estimated transit times for DHL shipment between origin and destination for a planned ship date',
        inputSchema: {
          type: 'object',
          properties: {
            origin_country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 origin country code',
            },
            origin_postal_code: {
              type: 'string',
              description: 'Origin postal/ZIP code',
            },
            destination_country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 destination country code',
            },
            destination_postal_code: {
              type: 'string',
              description: 'Destination postal/ZIP code',
            },
            planned_date: {
              type: 'string',
              description: 'Planned ship date in YYYY-MM-DD format',
            },
          },
          required: ['origin_country', 'destination_country', 'planned_date'],
        },
      },
      {
        name: 'create_shipment',
        description: 'Create a new DHL Express shipment and generate a waybill and shipping label',
        inputSchema: {
          type: 'object',
          properties: {
            planned_date: {
              type: 'string',
              description: 'Planned shipment date in YYYY-MM-DD format',
            },
            account_number: {
              type: 'string',
              description: 'DHL account number to bill the shipment to',
            },
            service_code: {
              type: 'string',
              description: 'DHL product/service code (e.g. P for DHL EXPRESS WORLDWIDE)',
            },
            origin_contact_name: {
              type: 'string',
              description: 'Sender full name',
            },
            origin_company: {
              type: 'string',
              description: 'Sender company name',
            },
            origin_phone: {
              type: 'string',
              description: 'Sender phone number',
            },
            origin_email: {
              type: 'string',
              description: 'Sender email address',
            },
            origin_address: {
              type: 'string',
              description: 'Sender street address',
            },
            origin_city: {
              type: 'string',
              description: 'Sender city',
            },
            origin_postal_code: {
              type: 'string',
              description: 'Sender postal/ZIP code',
            },
            origin_country: {
              type: 'string',
              description: 'Sender ISO 3166-1 alpha-2 country code',
            },
            destination_contact_name: {
              type: 'string',
              description: 'Recipient full name',
            },
            destination_company: {
              type: 'string',
              description: 'Recipient company name',
            },
            destination_phone: {
              type: 'string',
              description: 'Recipient phone number',
            },
            destination_email: {
              type: 'string',
              description: 'Recipient email address',
            },
            destination_address: {
              type: 'string',
              description: 'Recipient street address',
            },
            destination_city: {
              type: 'string',
              description: 'Recipient city',
            },
            destination_postal_code: {
              type: 'string',
              description: 'Recipient postal/ZIP code',
            },
            destination_country: {
              type: 'string',
              description: 'Recipient ISO 3166-1 alpha-2 country code',
            },
            weight: {
              type: 'number',
              description: 'Package weight in kilograms',
            },
            content_description: {
              type: 'string',
              description: 'Brief description of shipment contents',
            },
          },
          required: [
            'planned_date', 'account_number', 'service_code',
            'origin_contact_name', 'origin_address', 'origin_city', 'origin_postal_code', 'origin_country',
            'destination_contact_name', 'destination_address', 'destination_city', 'destination_postal_code', 'destination_country',
            'weight',
          ],
        },
      },
      {
        name: 'cancel_shipment',
        description: 'Cancel an existing DHL Express shipment by waybill number before it has been picked up',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_tracking_number: {
              type: 'string',
              description: 'Waybill/tracking number of the shipment to cancel',
            },
          },
          required: ['shipment_tracking_number'],
        },
      },
      {
        name: 'create_pickup',
        description: 'Schedule a DHL Express courier pickup at an address for a specified date and time window',
        inputSchema: {
          type: 'object',
          properties: {
            account_number: {
              type: 'string',
              description: 'DHL account number',
            },
            pickup_date: {
              type: 'string',
              description: 'Pickup date in YYYY-MM-DD format',
            },
            ready_time: {
              type: 'string',
              description: 'Time packages will be ready for pickup in HH:MM format (e.g. 09:00)',
            },
            close_time: {
              type: 'string',
              description: 'Latest time for pickup in HH:MM format (e.g. 17:00)',
            },
            contact_name: {
              type: 'string',
              description: 'Contact person name at pickup location',
            },
            phone: {
              type: 'string',
              description: 'Contact phone number at pickup location',
            },
            address: {
              type: 'string',
              description: 'Pickup street address',
            },
            city: {
              type: 'string',
              description: 'Pickup city',
            },
            postal_code: {
              type: 'string',
              description: 'Pickup postal/ZIP code',
            },
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code of pickup location',
            },
            pieces: {
              type: 'number',
              description: 'Number of packages to be picked up (default: 1)',
            },
            weight: {
              type: 'number',
              description: 'Total weight in kilograms of all packages',
            },
          },
          required: ['account_number', 'pickup_date', 'ready_time', 'close_time', 'contact_name', 'phone', 'address', 'city', 'country_code', 'weight'],
        },
      },
      {
        name: 'cancel_pickup',
        description: 'Cancel a previously scheduled DHL Express courier pickup by confirmation number',
        inputSchema: {
          type: 'object',
          properties: {
            dispatch_confirmation_number: {
              type: 'string',
              description: 'DHL pickup confirmation number to cancel',
            },
            origin_country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code of the pickup location',
            },
          },
          required: ['dispatch_confirmation_number', 'origin_country'],
        },
      },
      {
        name: 'get_capabilities',
        description: 'Check available DHL Express services and capabilities for a given origin-destination country pair',
        inputSchema: {
          type: 'object',
          properties: {
            origin_country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 origin country code',
            },
            origin_postal_code: {
              type: 'string',
              description: 'Origin postal/ZIP code',
            },
            destination_country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 destination country code',
            },
            destination_postal_code: {
              type: 'string',
              description: 'Destination postal/ZIP code',
            },
            planned_date: {
              type: 'string',
              description: 'Planned ship date in YYYY-MM-DD format',
            },
          },
          required: ['origin_country', 'destination_country'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'track_shipment':
          return this.trackShipment(args);
        case 'get_shipment_events':
          return this.getShipmentEvents(args);
        case 'find_service_points':
          return this.findServicePoints(args);
        case 'get_service_point':
          return this.getServicePoint(args);
        case 'get_rate_quote':
          return this.getRateQuote(args);
        case 'get_transit_times':
          return this.getTransitTimes(args);
        case 'create_shipment':
          return this.createShipment(args);
        case 'cancel_shipment':
          return this.cancelShipment(args);
        case 'create_pickup':
          return this.createPickup(args);
        case 'cancel_pickup':
          return this.cancelPickup(args);
        case 'get_capabilities':
          return this.getCapabilities(args);
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

  // Used by Tracking Unified and Location Finder Unified (developer portal subscription key)
  private get authHeader(): Record<string, string> {
    return {
      'DHL-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  // Used by DHL Express MyDHL API (BasicAuth with username:password from DHL consultant)
  private get expressAuthHeader(): Record<string, string> {
    const credentials = Buffer.from(`${this.expressUsername}:${this.expressPassword}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }

  private async trackShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracking_number) {
      return { content: [{ type: 'text', text: 'tracking_number is required' }], isError: true };
    }
    const params = new URLSearchParams({ trackingNumber: args.tracking_number as string });
    if (args.service) params.set('service', args.service as string);
    if (args.language) params.set('language', args.language as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/track/shipments?${params}`, {
      headers: this.authHeader,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getShipmentEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracking_number) {
      return { content: [{ type: 'text', text: 'tracking_number is required' }], isError: true };
    }
    const params = new URLSearchParams({ trackingNumber: args.tracking_number as string });
    if (args.language) params.set('language', args.language as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/track/shipments?${params}`, {
      headers: this.authHeader,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as { shipments?: Array<{ events?: unknown[] }> };
    const events = data?.shipments?.[0]?.events || data;
    return { content: [{ type: 'text', text: this.truncate(events) }], isError: false };
  }

  private async findServicePoints(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.country_code) {
      return { content: [{ type: 'text', text: 'country_code is required' }], isError: true };
    }
    const params = new URLSearchParams({ countryCode: args.country_code as string });
    if (args.address_line) params.set('addressLine', args.address_line as string);
    if (args.city) params.set('cityName', args.city as string);
    if (args.postal_code) params.set('postalCode', args.postal_code as string);
    if (args.latitude) params.set('latitude', String(args.latitude));
    if (args.longitude) params.set('longitude', String(args.longitude));
    if (args.radius) params.set('radius', String(args.radius));
    if (args.limit) params.set('limit', String(args.limit));
    if (args.service_type && args.service_type !== 'all') params.set('serviceType', args.service_type as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/location-finder/v1/find-by-address?${params}`, {
      headers: this.authHeader,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getServicePoint(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location_id || !args.country_code) {
      return { content: [{ type: 'text', text: 'location_id and country_code are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/location-finder/v1/locations/${encodeURIComponent(args.location_id as string)}?countryCode=${encodeURIComponent(args.country_code as string)}`,
      { headers: this.authHeader },
    );
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getRateQuote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin_country || !args.destination_country || !args.weight) {
      return { content: [{ type: 'text', text: 'origin_country, destination_country, and weight are required' }], isError: true };
    }
    const params = new URLSearchParams({
      accountNumber: '',
      originCountryCode: args.origin_country as string,
      destinationCountryCode: args.destination_country as string,
      weight: String(args.weight),
      plannedShippingDateAndTime: `${(args.planned_date as string) || new Date().toISOString().split('T')[0]}T12:00:00 GMT+00:00`,
      isCustomsDeclarable: String(args.is_customs_declarable || false),
      unitOfMeasurement: 'metric',
    });
    if (args.origin_postal_code) params.set('originPostalCode', args.origin_postal_code as string);
    if (args.destination_postal_code) params.set('destinationPostalCode', args.destination_postal_code as string);
    if (args.length) params.set('length', String(args.length));
    if (args.width) params.set('width', String(args.width));
    if (args.height) params.set('height', String(args.height));

    const response = await this.fetchWithRetry(`${this.expressBaseUrl}/rates?${params}`, { headers: this.expressAuthHeader });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getTransitTimes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin_country || !args.destination_country || !args.planned_date) {
      return { content: [{ type: 'text', text: 'origin_country, destination_country, and planned_date are required' }], isError: true };
    }
    const params = new URLSearchParams({
      originCountryCode: args.origin_country as string,
      destinationCountryCode: args.destination_country as string,
      plannedShippingDateAndTime: `${encodeURIComponent(args.planned_date as string)}T12:00:00 GMT+00:00`,
      isCustomsDeclarable: 'false',
      unitOfMeasurement: 'metric',
      weight: '1',
    });
    if (args.origin_postal_code) params.set('originPostalCode', args.origin_postal_code as string);
    if (args.destination_postal_code) params.set('destinationPostalCode', args.destination_postal_code as string);

    const response = await this.fetchWithRetry(`${this.expressBaseUrl}/rates?${params}`, { headers: this.expressAuthHeader });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createShipment(args: Record<string, unknown>): Promise<ToolResult> {
    const required = [
      'planned_date', 'account_number', 'service_code',
      'origin_contact_name', 'origin_address', 'origin_city', 'origin_postal_code', 'origin_country',
      'destination_contact_name', 'destination_address', 'destination_city', 'destination_postal_code', 'destination_country',
      'weight',
    ];
    for (const field of required) {
      if (!args[field]) {
        return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
      }
    }
    const body = {
      plannedShippingDateAndTime: `${encodeURIComponent(args.planned_date as string)}T12:00:00 GMT+00:00`,
      pickup: { isRequested: false },
      productCode: args.service_code,
      accounts: [{ typeCode: 'shipper', number: args.account_number }],
      content: {
        packages: [{ weight: args.weight, dimensions: { length: 10, width: 10, height: 10 } }],
        isCustomsDeclarable: false,
        description: args.content_description || 'General merchandise',
        unitOfMeasurement: 'metric',
      },
      shipper: {
        name: args.origin_contact_name,
        phone: args.origin_phone || '',
        email: args.origin_email || '',
        address: {
          streetLines: [args.origin_address],
          city: args.origin_city,
          postalCode: args.origin_postal_code,
          countryCode: args.origin_country,
        },
        company: args.origin_company || '',
      },
      consignee: {
        name: args.destination_contact_name,
        phone: args.destination_phone || '',
        email: args.destination_email || '',
        address: {
          streetLines: [args.destination_address],
          city: args.destination_city,
          postalCode: args.destination_postal_code,
          countryCode: args.destination_country,
        },
        company: args.destination_company || '',
      },
    };
    const response = await this.fetchWithRetry(`${this.expressBaseUrl}/shipments`, {
      method: 'POST',
      headers: this.expressAuthHeader,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cancelShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_tracking_number) {
      return { content: [{ type: 'text', text: 'shipment_tracking_number is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.expressBaseUrl}/shipments/${encodeURIComponent(args.shipment_tracking_number as string)}`, {
      method: 'DELETE',
      headers: this.expressAuthHeader,
    });
    if (response.status === 204 || response.ok) {
      return { content: [{ type: 'text', text: `Shipment ${encodeURIComponent(args.shipment_tracking_number as string)} cancelled successfully` }], isError: false };
    }
    return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
  }

  private async createPickup(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['account_number', 'pickup_date', 'ready_time', 'close_time', 'contact_name', 'phone', 'address', 'city', 'country_code', 'weight'];
    for (const field of required) {
      if (!args[field]) {
        return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
      }
    }
    const body = {
      plannedPickupDateAndTime: `${encodeURIComponent(args.pickup_date as string)}T${encodeURIComponent(args.ready_time as string)}:00 GMT+00:00`,
      closeTime: args.close_time,
      location: 'reception',
      accounts: [{ typeCode: 'shipper', number: args.account_number }],
      specialInstructions: [],
      customer: {
        shipperDetails: {
          postalAddress: {
            streetLines: [args.address],
            city: args.city,
            postalCode: args.postal_code || '',
            countryCode: args.country_code,
          },
          contactInformation: {
            phone: args.phone,
            fullName: args.contact_name,
          },
        },
      },
      shipmentDetails: [
        {
          packages: [{ weight: { value: args.weight, unitOfMeasurement: 'kg' }, dimensions: { length: 10, width: 10, height: 10, unitOfMeasurement: 'cm' } }],
          productCode: 'P',
          isCustomsDeclarable: false,
          unitOfMeasurement: 'metric',
        },
      ],
    };
    const response = await this.fetchWithRetry(`${this.expressBaseUrl}/pickups`, {
      method: 'POST',
      headers: this.expressAuthHeader,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cancelPickup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.dispatch_confirmation_number || !args.origin_country) {
      return { content: [{ type: 'text', text: 'dispatch_confirmation_number and origin_country are required' }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.expressBaseUrl}/pickups/${encodeURIComponent(args.dispatch_confirmation_number as string)}?originCountryCode=${encodeURIComponent(args.origin_country as string)}`,
      { method: 'DELETE', headers: this.expressAuthHeader },
    );
    if (response.status === 204 || response.ok) {
      return { content: [{ type: 'text', text: `Pickup ${encodeURIComponent(args.dispatch_confirmation_number as string)} cancelled successfully` }], isError: false };
    }
    return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
  }

  private async getCapabilities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin_country || !args.destination_country) {
      return { content: [{ type: 'text', text: 'origin_country and destination_country are required' }], isError: true };
    }
    const params = new URLSearchParams({
      originCountryCode: args.origin_country as string,
      destinationCountryCode: args.destination_country as string,
      plannedShippingDateAndTime: `${(args.planned_date as string) || new Date().toISOString().split('T')[0]}T12:00:00 GMT+00:00`,
      isCustomsDeclarable: 'false',
      unitOfMeasurement: 'metric',
      weight: '1',
    });
    if (args.origin_postal_code) params.set('originPostalCode', args.origin_postal_code as string);
    if (args.destination_postal_code) params.set('destinationPostalCode', args.destination_postal_code as string);

    const response = await this.fetchWithRetry(`${this.expressBaseUrl}/rates?${params}`, { headers: this.expressAuthHeader });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
