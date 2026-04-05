/**
 * UPS MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/UPS-API/ups-mcp — transport: stdio, auth: OAuth2 client credentials
// Our adapter covers: 10 tools. Vendor MCP covers: 2 tools (track_shipment, validate_address).
// Recommendation: use-rest-api — MCP fails 2 of 4 protocol criteria: only 2 tools (needs 10+) and
//   last commit July 29, 2025 (8 months before audit; needs commits within 6 months). REST adapter
//   is the authoritative integration with 10-tool coverage vs MCP's 2.
//
// Base URL: https://onlinetools.ups.com/api
// Auth: OAuth2 client credentials — POST https://onlinetools.ups.com/security/v1/oauth/token
//   (Basic auth header: base64(clientId:clientSecret), body: grant_type=client_credentials)
// Docs: https://developer.ups.com/
// Rate limits: Not publicly documented; UPS enforces per-account quotas. Sandbox: https://wwwcie.ups.com/api

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface UPSConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  tokenUrl?: string;
}

export class UPSMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: UPSConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://onlinetools.ups.com/api';
    this.tokenUrl = config.tokenUrl || 'https://onlinetools.ups.com/security/v1/oauth/token';
  }

  static catalog() {
    return {
      name: 'ups',
      displayName: 'UPS',
      version: '1.0.0',
      category: 'misc',
      keywords: ['ups', 'shipping', 'tracking', 'package', 'parcel', 'carrier', 'logistics', 'delivery', 'rate', 'label', 'freight'],
      toolNames: [
        'track_shipment', 'get_rates', 'validate_address', 'create_shipment',
        'void_shipment', 'get_time_in_transit', 'list_pickup_types',
        'schedule_pickup', 'cancel_pickup', 'get_locator',
      ],
      description: 'UPS shipping and logistics: track packages, get rates, validate addresses, create and void shipments, schedule pickups, and find UPS locations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'track_shipment',
        description: 'Track a UPS shipment by tracking number and retrieve current status, location, and delivery estimate',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_number: {
              type: 'string',
              description: 'UPS tracking number (1Z format, e.g. 1Z12345E0205271688)',
            },
            locale: {
              type: 'string',
              description: 'Locale for response content (default: en_US)',
            },
          },
          required: ['tracking_number'],
        },
      },
      {
        name: 'get_rates',
        description: 'Get UPS shipping rates for a package between origin and destination with service and weight parameters',
        inputSchema: {
          type: 'object',
          properties: {
            origin_zip: {
              type: 'string',
              description: 'Origin postal code (5-digit US ZIP)',
            },
            destination_zip: {
              type: 'string',
              description: 'Destination postal code (5-digit US ZIP)',
            },
            destination_country: {
              type: 'string',
              description: 'Destination country code (ISO 3166-1 alpha-2, e.g. US, CA, GB)',
            },
            weight: {
              type: 'number',
              description: 'Package weight in pounds',
            },
            service_code: {
              type: 'string',
              description: 'UPS service code: 01=Next Day Air, 02=2nd Day Air, 03=Ground, 12=3 Day Select, 13=Next Day Air Saver, 14=Next Day Air Early (default: 03)',
            },
            package_type: {
              type: 'string',
              description: 'Package type code: 00=Unknown, 01=UPS Letter, 02=Package, 03=Tube, 04=Pak (default: 02)',
            },
          },
          required: ['origin_zip', 'destination_zip', 'destination_country', 'weight'],
        },
      },
      {
        name: 'validate_address',
        description: 'Validate and standardize a US street address using UPS address validation service',
        inputSchema: {
          type: 'object',
          properties: {
            street: {
              type: 'string',
              description: 'Street address line 1',
            },
            city: {
              type: 'string',
              description: 'City name',
            },
            state: {
              type: 'string',
              description: 'State code (2-letter abbreviation, e.g. CA, TX)',
            },
            postal_code: {
              type: 'string',
              description: 'ZIP or postal code',
            },
            country_code: {
              type: 'string',
              description: 'Country code (ISO 3166-1 alpha-2, default: US)',
            },
          },
          required: ['street', 'city', 'state', 'postal_code'],
        },
      },
      {
        name: 'create_shipment',
        description: 'Create a UPS shipment and generate a shipping label with tracking number for a package',
        inputSchema: {
          type: 'object',
          properties: {
            shipper_name: {
              type: 'string',
              description: 'Name of the shipper',
            },
            shipper_address: {
              type: 'string',
              description: 'Shipper street address',
            },
            shipper_city: {
              type: 'string',
              description: 'Shipper city',
            },
            shipper_state: {
              type: 'string',
              description: 'Shipper state code (2-letter)',
            },
            shipper_zip: {
              type: 'string',
              description: 'Shipper ZIP code',
            },
            shipper_country: {
              type: 'string',
              description: 'Shipper country code (default: US)',
            },
            recipient_name: {
              type: 'string',
              description: 'Name of the recipient',
            },
            recipient_address: {
              type: 'string',
              description: 'Recipient street address',
            },
            recipient_city: {
              type: 'string',
              description: 'Recipient city',
            },
            recipient_state: {
              type: 'string',
              description: 'Recipient state code',
            },
            recipient_zip: {
              type: 'string',
              description: 'Recipient ZIP code',
            },
            recipient_country: {
              type: 'string',
              description: 'Recipient country code (default: US)',
            },
            weight: {
              type: 'number',
              description: 'Package weight in pounds',
            },
            service_code: {
              type: 'string',
              description: 'UPS service code: 01=Next Day Air, 02=2nd Day Air, 03=Ground (default: 03)',
            },
            description: {
              type: 'string',
              description: 'Description of the package contents',
            },
          },
          required: ['shipper_name', 'shipper_address', 'shipper_city', 'shipper_state', 'shipper_zip', 'recipient_name', 'recipient_address', 'recipient_city', 'recipient_state', 'recipient_zip', 'weight'],
        },
      },
      {
        name: 'void_shipment',
        description: 'Void a UPS shipment by shipment identification number to cancel it and release the tracking number',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'string',
              description: 'UPS shipment identification number returned when the shipment was created',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'get_time_in_transit',
        description: 'Get estimated delivery days and dates for UPS services between two postal codes',
        inputSchema: {
          type: 'object',
          properties: {
            origin_zip: {
              type: 'string',
              description: 'Origin ZIP code (5-digit)',
            },
            destination_zip: {
              type: 'string',
              description: 'Destination ZIP code (5-digit)',
            },
            origin_country: {
              type: 'string',
              description: 'Origin country code (ISO 3166-1 alpha-2, default: US)',
            },
            destination_country: {
              type: 'string',
              description: 'Destination country code (ISO 3166-1 alpha-2, default: US)',
            },
            weight: {
              type: 'number',
              description: 'Package weight in pounds (default: 1)',
            },
            ship_date: {
              type: 'string',
              description: 'Ship date in YYYYMMDD format (default: today)',
            },
          },
          required: ['origin_zip', 'destination_zip'],
        },
      },
      {
        name: 'list_pickup_types',
        description: 'List available UPS pickup service types and schedules for a given postal code',
        inputSchema: {
          type: 'object',
          properties: {
            postal_code: {
              type: 'string',
              description: 'ZIP code for pickup location',
            },
            country_code: {
              type: 'string',
              description: 'Country code (default: US)',
            },
          },
          required: ['postal_code'],
        },
      },
      {
        name: 'schedule_pickup',
        description: 'Schedule a UPS package pickup at a given address for a specified date and time window',
        inputSchema: {
          type: 'object',
          properties: {
            pickup_date: {
              type: 'string',
              description: 'Pickup date in YYYYMMDD format',
            },
            ready_time: {
              type: 'string',
              description: 'Earliest pickup time in HHMM 24-hour format (e.g. 0900)',
            },
            close_time: {
              type: 'string',
              description: 'Latest pickup time (close of business) in HHMM 24-hour format (e.g. 1700)',
            },
            address: {
              type: 'string',
              description: 'Street address for pickup',
            },
            city: {
              type: 'string',
              description: 'City for pickup',
            },
            state: {
              type: 'string',
              description: 'State code for pickup',
            },
            postal_code: {
              type: 'string',
              description: 'ZIP code for pickup',
            },
            country_code: {
              type: 'string',
              description: 'Country code (default: US)',
            },
            quantity: {
              type: 'number',
              description: 'Number of packages for pickup (default: 1)',
            },
          },
          required: ['pickup_date', 'ready_time', 'close_time', 'address', 'city', 'state', 'postal_code'],
        },
      },
      {
        name: 'cancel_pickup',
        description: 'Cancel a previously scheduled UPS pickup by confirmation number',
        inputSchema: {
          type: 'object',
          properties: {
            confirmation_number: {
              type: 'string',
              description: 'Pickup confirmation number returned when the pickup was scheduled',
            },
            cancel_date: {
              type: 'string',
              description: 'Cancellation date in YYYYMMDD format (default: today)',
            },
          },
          required: ['confirmation_number'],
        },
      },
      {
        name: 'get_locator',
        description: 'Find nearby UPS Access Points, drop boxes, and customer centers by address or ZIP code',
        inputSchema: {
          type: 'object',
          properties: {
            postal_code: {
              type: 'string',
              description: 'ZIP or postal code to search near',
            },
            country_code: {
              type: 'string',
              description: 'Country code (ISO 3166-1 alpha-2, default: US)',
            },
            location_type: {
              type: 'string',
              description: 'Type of location: AP=Access Point, CVS=Customer Service, UDC=Drop Box (default: AP)',
            },
            max_list: {
              type: 'number',
              description: 'Maximum number of locations to return (default: 10, max: 50)',
            },
          },
          required: ['postal_code'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'track_shipment':
          return this.trackShipment(args);
        case 'get_rates':
          return this.getRates(args);
        case 'validate_address':
          return this.validateAddress(args);
        case 'create_shipment':
          return this.createShipment(args);
        case 'void_shipment':
          return this.voidShipment(args);
        case 'get_time_in_transit':
          return this.getTimeInTransit(args);
        case 'list_pickup_types':
          return this.listPickupTypes(args);
        case 'schedule_pickup':
          return this.schedulePickup(args);
        case 'cancel_pickup':
          return this.cancelPickup(args);
        case 'get_locator':
          return this.getLocator(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }


  private async upsGet(path: string, token: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'transId': `epicai-${Date.now()}`,
        'transactionSrc': 'epicai',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async upsPost(path: string, body: unknown, token: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'transId': `epicai-${Date.now()}`,
        'transactionSrc': 'epicai',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async trackShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracking_number) return { content: [{ type: 'text', text: 'tracking_number is required' }], isError: true };
    const token = await this.getOrRefreshToken();
    const locale = (args.locale as string) || 'en_US';
    return this.upsGet(`/track/v1/details/${encodeURIComponent(args.tracking_number as string)}?locale=${locale}&returnSignature=false`, token);
  }

  private async getRates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin_zip || !args.destination_zip || !args.destination_country || args.weight === undefined) {
      return { content: [{ type: 'text', text: 'origin_zip, destination_zip, destination_country, and weight are required' }], isError: true };
    }
    const token = await this.getOrRefreshToken();
    const body = {
      RateRequest: {
        Request: { RequestOption: 'Shoptimeintransit' },
        Shipment: {
          Shipper: { Address: { PostalCode: args.origin_zip, CountryCode: 'US' } },
          ShipTo: { Address: { PostalCode: args.destination_zip, CountryCode: args.destination_country } },
          Service: { Code: (args.service_code as string) || '03' },
          Package: {
            PackagingType: { Code: (args.package_type as string) || '02' },
            PackageWeight: { UnitOfMeasurement: { Code: 'LBS' }, Weight: String(args.weight) },
          },
        },
      },
    };
    return this.upsPost('/rating/v1/Rate', body, token);
  }

  private async validateAddress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.street || !args.city || !args.state || !args.postal_code) {
      return { content: [{ type: 'text', text: 'street, city, state, and postal_code are required' }], isError: true };
    }
    const token = await this.getOrRefreshToken();
    const body = {
      XAVRequest: {
        Request: { RequestOption: '3' },
        AddressKeyFormat: {
          AddressLine: args.street,
          PoliticalDivision2: args.city,
          PoliticalDivision1: args.state,
          PostcodePrimaryLow: args.postal_code,
          CountryCode: (args.country_code as string) || 'US',
        },
      },
    };
    return this.upsPost('/addressvalidation/v1/3', body, token);
  }

  private async createShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipper_name || !args.shipper_address || !args.shipper_city || !args.shipper_state || !args.shipper_zip ||
        !args.recipient_name || !args.recipient_address || !args.recipient_city || !args.recipient_state || !args.recipient_zip || args.weight === undefined) {
      return { content: [{ type: 'text', text: 'Shipper and recipient address fields and weight are required' }], isError: true };
    }
    const token = await this.getOrRefreshToken();
    const body = {
      ShipmentRequest: {
        Request: { RequestOption: 'novalidate' },
        Shipment: {
          Shipper: {
            Name: args.shipper_name,
            Address: {
              AddressLine: args.shipper_address,
              City: args.shipper_city,
              StateProvinceCode: args.shipper_state,
              PostalCode: args.shipper_zip,
              CountryCode: (args.shipper_country as string) || 'US',
            },
          },
          ShipTo: {
            Name: args.recipient_name,
            Address: {
              AddressLine: args.recipient_address,
              City: args.recipient_city,
              StateProvinceCode: args.recipient_state,
              PostalCode: args.recipient_zip,
              CountryCode: (args.recipient_country as string) || 'US',
            },
          },
          Service: { Code: (args.service_code as string) || '03', Description: 'Ground' },
          Package: {
            Description: (args.description as string) || 'Package',
            PackagingType: { Code: '02' },
            PackageWeight: { UnitOfMeasurement: { Code: 'LBS' }, Weight: String(args.weight) },
          },
        },
        LabelSpecification: { LabelImageFormat: { Code: 'GIF' } },
      },
    };
    return this.upsPost('/shipments/v1/ship', body, token);
  }

  private async voidShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}/shipments/v1/void/cancel/${encodeURIComponent(args.shipment_id as string)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'transId': `epicai-${Date.now()}`,
        'transactionSrc': 'epicai',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getTimeInTransit(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin_zip || !args.destination_zip) {
      return { content: [{ type: 'text', text: 'origin_zip and destination_zip are required' }], isError: true };
    }
    const token = await this.getOrRefreshToken();
    const body = {
      TNTRequest: {
        PickupDate: (args.ship_date as string) || new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        ShipFrom: {
          Address: {
            PostalCode: args.origin_zip,
            CountryCode: (args.origin_country as string) || 'US',
          },
        },
        ShipTo: {
          Address: {
            PostalCode: args.destination_zip,
            CountryCode: (args.destination_country as string) || 'US',
          },
        },
        Weight: {
          UnitOfMeasurement: { Code: 'LBS' },
          Weight: String((args.weight as number) || 1),
        },
      },
    };
    return this.upsPost('/transittimes/v1/transittimes', body, token);
  }

  private async listPickupTypes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.postal_code) return { content: [{ type: 'text', text: 'postal_code is required' }], isError: true };
    const token = await this.getOrRefreshToken();
    const cc = (args.country_code as string) || 'US';
    return this.upsGet(`/pickup/v1/pickups/pickupdatetimeoptions?PostalCode=${encodeURIComponent(args.postal_code as string)}&CountryCode=${cc}&ResidentialIndicator=N`, token);
  }

  private async schedulePickup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pickup_date || !args.ready_time || !args.close_time || !args.address || !args.city || !args.state || !args.postal_code) {
      return { content: [{ type: 'text', text: 'pickup_date, ready_time, close_time, address, city, state, and postal_code are required' }], isError: true };
    }
    const token = await this.getOrRefreshToken();
    const body = {
      PickupCreationRequest: {
        PickupDateInfo: {
          CloseTime: args.close_time,
          ReadyTime: args.ready_time,
          PickupDate: args.pickup_date,
        },
        PickupAddress: {
          AddressLine: args.address,
          City: args.city,
          StateProvince: args.state,
          PostalCode: args.postal_code,
          CountryCode: (args.country_code as string) || 'US',
          ResidentialIndicator: 'N',
        },
        Quantity: String((args.quantity as number) || 1),
      },
    };
    return this.upsPost('/pickup/v1/pickups', body, token);
  }

  private async cancelPickup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.confirmation_number) return { content: [{ type: 'text', text: 'confirmation_number is required' }], isError: true };
    const token = await this.getOrRefreshToken();
    // DELETE /shipments/v2409/pickup/{CancelBy} — PRN (pickup request number) sent in Prn header
    // CancelBy code 02 = Cancel by PRN (confirmation number). Ref: UPS Pickup API v2409.
    const response = await this.fetchWithRetry(`${this.baseUrl}/shipments/v2409/pickup/02`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'transId': `epicai-${Date.now()}`,
        'transactionSrc': 'epicai',
        'Prn': args.confirmation_number as string,
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getLocator(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.postal_code) return { content: [{ type: 'text', text: 'postal_code is required' }], isError: true };
    const token = await this.getOrRefreshToken();
    const body = {
      LocatorRequest: {
        Request: { RequestOption: '1' },
        OriginAddress: {
          AddressKeyFormat: {
            PostcodePrimaryLow: args.postal_code,
            CountryCode: (args.country_code as string) || 'US',
          },
        },
        Translate: { LanguageCode: 'ENG' },
        UnitOfMeasurement: { Code: 'MI' },
        LocationID: (args.location_type as string) || 'AP',
        Option: { OptionType: { Code: '001' } },
        SearchRadius: '50',
        MaximumListSize: String((args.max_list as number) || 10),
      },
    };
    return this.upsPost('/locations/v1/search/availabilities/4', body, token);
  }
}
