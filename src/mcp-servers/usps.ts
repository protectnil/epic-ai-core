/**
 * USPS MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official USPS MCP server was found on GitHub or npm.
// Note: The legacy USPS Web Tools API was retired January 25, 2026. This adapter targets the new v3 platform.
//
// Base URL: https://apis.usps.com
// Auth: OAuth2 client credentials — POST https://apis.usps.com/oauth2/v3/token
// Docs: https://developers.usps.com/
// Rate limits: Default quota ~60 calls/hour per API scope. Test environment: https://apis-tem.usps.com

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface USPSConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  tokenUrl?: string;
}

export class USPSMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly tokenUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: USPSConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://apis.usps.com';
    this.tokenUrl = config.tokenUrl || 'https://apis.usps.com/oauth2/v3/token';
  }

  static catalog() {
    return {
      name: 'usps',
      displayName: 'USPS',
      version: '1.0.0',
      category: 'misc',
      keywords: ['usps', 'postal', 'shipping', 'tracking', 'package', 'mail', 'address', 'rate', 'label', 'delivery', 'priority', 'first class'],
      toolNames: [
        'track_package', 'validate_address', 'standardize_address',
        'get_domestic_prices', 'get_international_prices',
        'get_service_standards', 'lookup_zip_code', 'get_city_state',
        'create_domestic_label', 'get_locations',
      ],
      description: 'USPS postal services: track packages, validate and standardize addresses, get shipping rates and service standards, create labels, and find post office locations.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'track_package',
        description: 'Track a USPS package by tracking number and retrieve current status, location, and delivery events',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_number: {
              type: 'string',
              description: 'USPS tracking number (e.g. 9400111899223397750432)',
            },
          },
          required: ['tracking_number'],
        },
      },
      {
        name: 'validate_address',
        description: 'Validate and verify a US postal address for deliverability using USPS address database',
        inputSchema: {
          type: 'object',
          properties: {
            street_address: {
              type: 'string',
              description: 'Street address line (e.g. 123 Main St)',
            },
            secondary_address: {
              type: 'string',
              description: 'Apartment, suite, or unit number (e.g. Apt 2B)',
            },
            city: {
              type: 'string',
              description: 'City name',
            },
            state: {
              type: 'string',
              description: 'Two-letter state abbreviation (e.g. CA)',
            },
            zip_code: {
              type: 'string',
              description: 'ZIP code (5-digit or ZIP+4, e.g. 90210 or 90210-1234)',
            },
          },
          required: ['street_address', 'city', 'state'],
        },
      },
      {
        name: 'standardize_address',
        description: 'Standardize a US address to USPS delivery-point format and return the corrected address with ZIP+4',
        inputSchema: {
          type: 'object',
          properties: {
            street_address: {
              type: 'string',
              description: 'Street address to standardize',
            },
            city: {
              type: 'string',
              description: 'City name',
            },
            state: {
              type: 'string',
              description: 'Two-letter state abbreviation',
            },
            zip_code: {
              type: 'string',
              description: 'ZIP code (5-digit)',
            },
          },
          required: ['street_address', 'city', 'state'],
        },
      },
      {
        name: 'get_domestic_prices',
        description: 'Get USPS domestic postage prices for a package based on origin/destination ZIP, weight, and dimensions',
        inputSchema: {
          type: 'object',
          properties: {
            origin_zip: {
              type: 'string',
              description: 'Origin 5-digit ZIP code',
            },
            destination_zip: {
              type: 'string',
              description: 'Destination 5-digit ZIP code',
            },
            weight: {
              type: 'number',
              description: 'Package weight in pounds',
            },
            length: {
              type: 'number',
              description: 'Package length in inches',
            },
            width: {
              type: 'number',
              description: 'Package width in inches',
            },
            height: {
              type: 'number',
              description: 'Package height in inches',
            },
            mail_class: {
              type: 'string',
              description: 'Mail class filter: PRIORITY_MAIL, PRIORITY_MAIL_EXPRESS, FIRST_CLASS_PACKAGE_SERVICES, PARCEL_SELECT, GROUND_ADVANTAGE (default: all)',
            },
          },
          required: ['origin_zip', 'destination_zip', 'weight'],
        },
      },
      {
        name: 'get_international_prices',
        description: 'Get USPS international shipping prices for a package to a foreign country by weight and mail class',
        inputSchema: {
          type: 'object',
          properties: {
            origin_zip: {
              type: 'string',
              description: 'Origin 5-digit US ZIP code',
            },
            destination_country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 destination country code (e.g. GB, CA, DE)',
            },
            weight: {
              type: 'number',
              description: 'Package weight in pounds',
            },
            mail_class: {
              type: 'string',
              description: 'Mail class: PRIORITY_MAIL_INTERNATIONAL, FIRST_CLASS_PACKAGE_INTERNATIONAL, PRIORITY_MAIL_EXPRESS_INTERNATIONAL (default: all)',
            },
          },
          required: ['origin_zip', 'destination_country_code', 'weight'],
        },
      },
      {
        name: 'get_service_standards',
        description: 'Get expected USPS delivery days between origin and destination ZIP codes for specified mail classes',
        inputSchema: {
          type: 'object',
          properties: {
            origin_zip: {
              type: 'string',
              description: 'Origin 5-digit ZIP code',
            },
            destination_zip: {
              type: 'string',
              description: 'Destination 5-digit ZIP code',
            },
            mail_class: {
              type: 'string',
              description: 'Mail class: PRIORITY_MAIL, PRIORITY_MAIL_EXPRESS, FIRST_CLASS_PACKAGE_SERVICES, GROUND_ADVANTAGE (default: PRIORITY_MAIL)',
            },
            accept_date: {
              type: 'string',
              description: 'Acceptance date in YYYY-MM-DD format (default: today)',
            },
          },
          required: ['origin_zip', 'destination_zip'],
        },
      },
      {
        name: 'lookup_zip_code',
        description: 'Look up ZIP codes for a city and state combination',
        inputSchema: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: 'City name to look up',
            },
            state: {
              type: 'string',
              description: 'Two-letter state abbreviation',
            },
          },
          required: ['city', 'state'],
        },
      },
      {
        name: 'get_city_state',
        description: 'Look up the city and state for a given US ZIP code',
        inputSchema: {
          type: 'object',
          properties: {
            zip_code: {
              type: 'string',
              description: 'Five-digit US ZIP code to look up',
            },
          },
          required: ['zip_code'],
        },
      },
      {
        name: 'create_domestic_label',
        description: 'Create a USPS domestic shipping label with postage for a package and return the label image',
        inputSchema: {
          type: 'object',
          properties: {
            mail_class: {
              type: 'string',
              description: 'Mail class: PRIORITY_MAIL, PRIORITY_MAIL_EXPRESS, GROUND_ADVANTAGE, FIRST_CLASS_PACKAGE_SERVICES',
            },
            sender_name: {
              type: 'string',
              description: 'Sender full name',
            },
            sender_address: {
              type: 'string',
              description: 'Sender street address',
            },
            sender_city: {
              type: 'string',
              description: 'Sender city',
            },
            sender_state: {
              type: 'string',
              description: 'Sender state code',
            },
            sender_zip: {
              type: 'string',
              description: 'Sender ZIP code',
            },
            recipient_name: {
              type: 'string',
              description: 'Recipient full name',
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
            weight: {
              type: 'number',
              description: 'Package weight in ounces',
            },
            label_format: {
              type: 'string',
              description: 'Label image format: PDF, PNG, ZPL (default: PDF)',
            },
          },
          required: ['mail_class', 'sender_name', 'sender_address', 'sender_city', 'sender_state', 'sender_zip', 'recipient_name', 'recipient_address', 'recipient_city', 'recipient_state', 'recipient_zip', 'weight'],
        },
      },
      {
        name: 'get_locations',
        description: 'Find nearby USPS post offices, approved shippers, and drop-off locations by ZIP code or address',
        inputSchema: {
          type: 'object',
          properties: {
            zip_code: {
              type: 'string',
              description: 'ZIP code to search near',
            },
            radius: {
              type: 'number',
              description: 'Search radius in miles (default: 5, max: 50)',
            },
            location_type: {
              type: 'string',
              description: 'Type of location: POST_OFFICE, APPROVED_SHIPPER, COLLECTION_BOX (default: POST_OFFICE)',
            },
          },
          required: ['zip_code'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'track_package':
          return this.trackPackage(args);
        case 'validate_address':
          return this.validateAddress(args);
        case 'standardize_address':
          return this.standardizeAddress(args);
        case 'get_domestic_prices':
          return this.getDomesticPrices(args);
        case 'get_international_prices':
          return this.getInternationalPrices(args);
        case 'get_service_standards':
          return this.getServiceStandards(args);
        case 'lookup_zip_code':
          return this.lookupZipCode(args);
        case 'get_city_state':
          return this.getCityState(args);
        case 'create_domestic_label':
          return this.createDomesticLabel(args);
        case 'get_locations':
          return this.getLocations(args);
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
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'addresses tracking prices labels locations service-delivery-standards',
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }


  private async uspsGet(path: string, token: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async uspsPost(path: string, body: unknown, token: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async trackPackage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracking_number) return { content: [{ type: 'text', text: 'tracking_number is required' }], isError: true };
    const token = await this.getOrRefreshToken();
    return this.uspsGet(`/tracking/v3/tracking/${encodeURIComponent(args.tracking_number as string)}?expand=DETAIL`, token);
  }

  private async validateAddress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.street_address || !args.city || !args.state) {
      return { content: [{ type: 'text', text: 'street_address, city, and state are required' }], isError: true };
    }
    const token = await this.getOrRefreshToken();
    const params = new URLSearchParams({
      streetAddress: args.street_address as string,
      city: args.city as string,
      state: args.state as string,
    });
    if (args.secondary_address) params.set('secondaryAddress', args.secondary_address as string);
    if (args.zip_code) params.set('ZIPCode', args.zip_code as string);
    return this.uspsGet(`/addresses/v3/address?${params.toString()}`, token);
  }

  private async standardizeAddress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.street_address || !args.city || !args.state) {
      return { content: [{ type: 'text', text: 'street_address, city, and state are required' }], isError: true };
    }
    const token = await this.getOrRefreshToken();
    const params = new URLSearchParams({
      streetAddress: args.street_address as string,
      city: args.city as string,
      state: args.state as string,
    });
    if (args.zip_code) params.set('ZIPCode', args.zip_code as string);
    return this.uspsGet(`/addresses/v3/standardized-address?${params.toString()}`, token);
  }

  private async getDomesticPrices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin_zip || !args.destination_zip || args.weight === undefined) {
      return { content: [{ type: 'text', text: 'origin_zip, destination_zip, and weight are required' }], isError: true };
    }
    const token = await this.getOrRefreshToken();
    const body: Record<string, unknown> = {
      originZIPCode: args.origin_zip,
      destinationZIPCode: args.destination_zip,
      weight: args.weight,
      priceType: 'RETAIL',
    };
    if (args.length) body.length = args.length;
    if (args.width) body.width = args.width;
    if (args.height) body.height = args.height;
    if (args.mail_class) body.mailClass = args.mail_class;
    return this.uspsPost('/prices/v3/base-rates/search', body, token);
  }

  private async getInternationalPrices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin_zip || !args.destination_country_code || args.weight === undefined) {
      return { content: [{ type: 'text', text: 'origin_zip, destination_country_code, and weight are required' }], isError: true };
    }
    const token = await this.getOrRefreshToken();
    const body: Record<string, unknown> = {
      originZIPCode: args.origin_zip,
      destinationCountryCode: args.destination_country_code,
      weight: args.weight,
      priceType: 'RETAIL',
    };
    if (args.mail_class) body.mailClass = args.mail_class;
    return this.uspsPost('/prices/v3/international-base-rates/search', body, token);
  }

  private async getServiceStandards(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin_zip || !args.destination_zip) {
      return { content: [{ type: 'text', text: 'origin_zip and destination_zip are required' }], isError: true };
    }
    const token = await this.getOrRefreshToken();
    const params = new URLSearchParams({
      originZIPCode: args.origin_zip as string,
      destinationZIPCode: args.destination_zip as string,
      mailClass: (args.mail_class as string) || 'PRIORITY_MAIL',
      acceptDate: (args.accept_date as string) || new Date().toISOString().slice(0, 10),
    });
    return this.uspsGet(`/service-delivery-standards/v3/standard-b?${params.toString()}`, token);
  }

  private async lookupZipCode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.city || !args.state) return { content: [{ type: 'text', text: 'city and state are required' }], isError: true };
    const token = await this.getOrRefreshToken();
    // /addresses/v3/zipcode returns ZIP codes for a city+state. /addresses/v3/city-state is the
    // reverse operation (ZIP→city/state) and is used by get_city_state. USPS Addresses API v3.
    const params = new URLSearchParams({ city: args.city as string, state: args.state as string });
    return this.uspsGet(`/addresses/v3/zipcode?${params.toString()}`, token);
  }

  private async getCityState(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zip_code) return { content: [{ type: 'text', text: 'zip_code is required' }], isError: true };
    const token = await this.getOrRefreshToken();
    return this.uspsGet(`/addresses/v3/city-state?ZIPCode=${encodeURIComponent(args.zip_code as string)}`, token);
  }

  private async createDomesticLabel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.mail_class || !args.sender_name || !args.sender_address || !args.sender_city ||
        !args.sender_state || !args.sender_zip || !args.recipient_name || !args.recipient_address ||
        !args.recipient_city || !args.recipient_state || !args.recipient_zip || args.weight === undefined) {
      return { content: [{ type: 'text', text: 'All sender/recipient address fields, mail_class, and weight are required' }], isError: true };
    }
    const token = await this.getOrRefreshToken();
    const body = {
      imageInfo: { imageType: (args.label_format as string) || 'PDF' },
      toAddress: {
        firstName: args.recipient_name,
        streetAddress: args.recipient_address,
        city: args.recipient_city,
        state: args.recipient_state,
        ZIPCode: args.recipient_zip,
      },
      fromAddress: {
        firstName: args.sender_name,
        streetAddress: args.sender_address,
        city: args.sender_city,
        state: args.sender_state,
        ZIPCode: args.sender_zip,
      },
      packageDescription: {
        mailClass: args.mail_class,
        weightUOM: 'oz',
        weight: args.weight,
        priceType: 'RETAIL',
      },
    };
    return this.uspsPost('/labels/v3/label', body, token);
  }

  private async getLocations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.zip_code) return { content: [{ type: 'text', text: 'zip_code is required' }], isError: true };
    const token = await this.getOrRefreshToken();
    const params = new URLSearchParams({
      ZIPCode: args.zip_code as string,
      radius: String((args.radius as number) || 5),
      locationType: (args.location_type as string) || 'POST_OFFICE',
    });
    return this.uspsGet(`/locations/v3/post-office-locations?${params.toString()}`, token);
  }
}
