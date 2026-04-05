/**
 * FedEx MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28.
// No official FedEx MCP server published by FedEx was found on GitHub or the FedEx Developer Portal.
// A "FedEx MCP Server" appears in the Pipedream/awesome-mcp-servers aggregator list but is a
// Pipedream-hosted connector, not a vendor-published MCP server. Not eligible per protocol criteria.
//
// Base URL: https://apis.fedex.com  (production)
// Auth: OAuth2 client credentials — POST /oauth/token with client_id and client_secret
//       Access token expires after 3600 seconds (1 hour); this adapter refreshes 60 seconds early
// Docs: https://developer.fedex.com/api/en-us/home.html
// Rate limits: Not published; tokens expire after 1 hour; FedEx recommends reuse until expiration

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FedExConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;           // default: https://apis.fedex.com
  accountNumber?: string;     // FedEx account number for shipment billing
}

export class FedExMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly accountNumber: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: FedExConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://apis.fedex.com';
    this.accountNumber = config.accountNumber || '';
  }

  static catalog() {
    return {
      name: 'fedex',
      displayName: 'FedEx',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'fedex', 'shipping', 'tracking', 'freight', 'courier', 'parcel',
        'label', 'rate', 'package', 'delivery', 'logistics', 'ltl',
        'overnight', 'ground', 'express', 'pickup', 'shipment', 'transit',
      ],
      toolNames: [
        'track_shipment', 'track_multiple',
        'get_rates', 'validate_address',
        'create_shipment', 'cancel_shipment',
        'schedule_pickup', 'cancel_pickup', 'get_pickup_availability',
        'list_service_types', 'get_service_availability',
        'create_return_shipment', 'get_shipment_documents',
      ],
      description: 'FedEx shipping and logistics: track packages, get shipping rates, create and cancel shipments, schedule pickups, and validate addresses.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'track_shipment',
        description: 'Track a single FedEx shipment by tracking number with full event history and estimated delivery',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_number: {
              type: 'string',
              description: 'FedEx tracking number (12–22 digits, e.g. 449044304137821)',
            },
            include_detailed_scans: {
              type: 'boolean',
              description: 'Include all individual scan events in the response (default: true)',
            },
          },
          required: ['tracking_number'],
        },
      },
      {
        name: 'track_multiple',
        description: 'Track up to 30 FedEx shipments in a single request by tracking number',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_numbers: {
              type: 'array',
              description: 'Array of FedEx tracking numbers to track (max: 30)',
            },
          },
          required: ['tracking_numbers'],
        },
      },
      {
        name: 'get_rates',
        description: 'Get shipping rate quotes for a package between origin and destination with service options and transit time',
        inputSchema: {
          type: 'object',
          properties: {
            origin_postal_code: {
              type: 'string',
              description: 'Origin ZIP/postal code (e.g. 90210)',
            },
            origin_country_code: {
              type: 'string',
              description: 'Origin country ISO 2-letter code (e.g. US)',
            },
            destination_postal_code: {
              type: 'string',
              description: 'Destination ZIP/postal code',
            },
            destination_country_code: {
              type: 'string',
              description: 'Destination country ISO 2-letter code (e.g. US, CA, GB)',
            },
            weight_value: {
              type: 'number',
              description: 'Package weight value',
            },
            weight_units: {
              type: 'string',
              description: 'Weight units: LB (default) or KG',
            },
            length: {
              type: 'number',
              description: 'Package length in inches (or cm if dimensions_units is CM)',
            },
            width: {
              type: 'number',
              description: 'Package width',
            },
            height: {
              type: 'number',
              description: 'Package height',
            },
            dimensions_units: {
              type: 'string',
              description: 'Dimension units: IN (default) or CM',
            },
            service_type: {
              type: 'string',
              description: 'Specific service to rate (e.g. FEDEX_GROUND, PRIORITY_OVERNIGHT, FEDEX_2_DAY). Omit for all services.',
            },
          },
          required: ['origin_postal_code', 'origin_country_code', 'destination_postal_code', 'destination_country_code', 'weight_value'],
        },
      },
      {
        name: 'validate_address',
        description: 'Validate and standardize a shipping address with FedEx address validation service',
        inputSchema: {
          type: 'object',
          properties: {
            street_lines: {
              type: 'array',
              description: 'Array of street address lines (e.g. ["123 Main St", "Suite 400"])',
            },
            city: {
              type: 'string',
              description: 'City name',
            },
            state_or_province: {
              type: 'string',
              description: 'State or province code (e.g. CA, TX, ON)',
            },
            postal_code: {
              type: 'string',
              description: 'ZIP or postal code',
            },
            country_code: {
              type: 'string',
              description: 'ISO 2-letter country code (e.g. US)',
            },
          },
          required: ['street_lines', 'postal_code', 'country_code'],
        },
      },
      {
        name: 'create_shipment',
        description: 'Create a new FedEx shipment and generate a shipping label with tracking number',
        inputSchema: {
          type: 'object',
          properties: {
            service_type: {
              type: 'string',
              description: 'FedEx service: FEDEX_GROUND, PRIORITY_OVERNIGHT, FEDEX_2_DAY, STANDARD_OVERNIGHT, FIRST_OVERNIGHT, FEDEX_EXPRESS_SAVER',
            },
            shipper_name: {
              type: 'string',
              description: 'Shipper full name or company name',
            },
            shipper_phone: {
              type: 'string',
              description: 'Shipper phone number',
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
              description: 'Shipper state/province code',
            },
            shipper_postal_code: {
              type: 'string',
              description: 'Shipper ZIP/postal code',
            },
            shipper_country_code: {
              type: 'string',
              description: 'Shipper country ISO 2-letter code',
            },
            recipient_name: {
              type: 'string',
              description: 'Recipient full name or company name',
            },
            recipient_phone: {
              type: 'string',
              description: 'Recipient phone number',
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
              description: 'Recipient state/province code',
            },
            recipient_postal_code: {
              type: 'string',
              description: 'Recipient ZIP/postal code',
            },
            recipient_country_code: {
              type: 'string',
              description: 'Recipient country ISO 2-letter code',
            },
            weight_value: {
              type: 'number',
              description: 'Package weight',
            },
            weight_units: {
              type: 'string',
              description: 'Weight units: LB (default) or KG',
            },
            label_format: {
              type: 'string',
              description: 'Label output format: PDF (default), PNG, ZPLII',
            },
          },
          required: [
            'service_type',
            'shipper_name', 'shipper_address', 'shipper_city', 'shipper_state', 'shipper_postal_code', 'shipper_country_code',
            'recipient_name', 'recipient_address', 'recipient_city', 'recipient_state', 'recipient_postal_code', 'recipient_country_code',
            'weight_value',
          ],
        },
      },
      {
        name: 'cancel_shipment',
        description: 'Cancel a FedEx shipment by tracking number before it is picked up',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_number: {
              type: 'string',
              description: 'FedEx tracking number of the shipment to cancel',
            },
          },
          required: ['tracking_number'],
        },
      },
      {
        name: 'schedule_pickup',
        description: 'Schedule a FedEx pickup for packages at an address on a specified date',
        inputSchema: {
          type: 'object',
          properties: {
            carrier_code: {
              type: 'string',
              description: 'FedEx carrier: FDXE (Express, default), FDXG (Ground), FXSP (SmartPost)',
            },
            pickup_date: {
              type: 'string',
              description: 'Pickup date in YYYY-MM-DD format',
            },
            ready_time: {
              type: 'string',
              description: 'Time packages will be ready in HH:MM format (24-hour, e.g. 14:30)',
            },
            company_close_time: {
              type: 'string',
              description: 'Latest time for pickup in HH:MM format (24-hour)',
            },
            address: {
              type: 'string',
              description: 'Pickup street address',
            },
            city: {
              type: 'string',
              description: 'Pickup city',
            },
            state: {
              type: 'string',
              description: 'Pickup state/province code',
            },
            postal_code: {
              type: 'string',
              description: 'Pickup ZIP/postal code',
            },
            country_code: {
              type: 'string',
              description: 'Pickup country ISO 2-letter code',
            },
            package_count: {
              type: 'number',
              description: 'Number of packages to pick up (default: 1)',
            },
          },
          required: ['pickup_date', 'ready_time', 'company_close_time', 'address', 'city', 'postal_code', 'country_code'],
        },
      },
      {
        name: 'cancel_pickup',
        description: 'Cancel a previously scheduled FedEx pickup by confirmation code',
        inputSchema: {
          type: 'object',
          properties: {
            pickup_confirmation_code: {
              type: 'string',
              description: 'Pickup confirmation code returned when the pickup was scheduled',
            },
            carrier_code: {
              type: 'string',
              description: 'FedEx carrier: FDXE (Express, default), FDXG (Ground)',
            },
            scheduled_date: {
              type: 'string',
              description: 'Scheduled pickup date in YYYY-MM-DD format',
            },
            location: {
              type: 'string',
              description: 'FedEx location code (optional, from schedule_pickup response)',
            },
          },
          required: ['pickup_confirmation_code', 'scheduled_date'],
        },
      },
      {
        name: 'get_pickup_availability',
        description: 'Check FedEx pickup availability at an address for a specific carrier and date',
        inputSchema: {
          type: 'object',
          properties: {
            carrier_code: {
              type: 'string',
              description: 'FedEx carrier to check: FDXE (Express), FDXG (Ground)',
            },
            pickup_date: {
              type: 'string',
              description: 'Pickup date in YYYY-MM-DD format',
            },
            postal_code: {
              type: 'string',
              description: 'ZIP/postal code for the pickup location',
            },
            country_code: {
              type: 'string',
              description: 'ISO 2-letter country code (e.g. US)',
            },
          },
          required: ['carrier_code', 'pickup_date', 'postal_code', 'country_code'],
        },
      },
      {
        name: 'list_service_types',
        description: 'List all available FedEx service types and their descriptions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_service_availability',
        description: 'Check which FedEx services are available between two locations on a given ship date',
        inputSchema: {
          type: 'object',
          properties: {
            origin_postal_code: {
              type: 'string',
              description: 'Origin ZIP/postal code',
            },
            origin_country_code: {
              type: 'string',
              description: 'Origin country ISO 2-letter code',
            },
            destination_postal_code: {
              type: 'string',
              description: 'Destination ZIP/postal code',
            },
            destination_country_code: {
              type: 'string',
              description: 'Destination country ISO 2-letter code',
            },
            ship_date: {
              type: 'string',
              description: 'Ship date in YYYY-MM-DD format (default: today)',
            },
          },
          required: ['origin_postal_code', 'origin_country_code', 'destination_postal_code', 'destination_country_code'],
        },
      },
      {
        name: 'create_return_shipment',
        description: 'Create a FedEx return shipment label to bring a package back to the shipper',
        inputSchema: {
          type: 'object',
          properties: {
            original_tracking_number: {
              type: 'string',
              description: 'Tracking number of the original outbound shipment to create a return for',
            },
            return_type: {
              type: 'string',
              description: 'Return type: PRINT_RETURN_LABEL (default) or EMAIL_LABEL',
            },
            rma_number: {
              type: 'string',
              description: 'RMA or return authorization number to print on the label (optional)',
            },
          },
          required: ['original_tracking_number'],
        },
      },
      {
        name: 'get_shipment_documents',
        description: 'Retrieve shipping documents (labels, customs forms, manifests) for a FedEx shipment',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_number: {
              type: 'string',
              description: 'FedEx tracking number of the shipment',
            },
            document_type: {
              type: 'string',
              description: 'Document type: LABEL (default), CUSTOMS_DECLARATION, MANIFEST',
            },
            format: {
              type: 'string',
              description: 'Output format: PDF (default), PNG, ZPLII',
            },
          },
          required: ['tracking_number'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'track_shipment':
          return this.trackShipment(args);
        case 'track_multiple':
          return this.trackMultiple(args);
        case 'get_rates':
          return this.getRates(args);
        case 'validate_address':
          return this.validateAddress(args);
        case 'create_shipment':
          return this.createShipment(args);
        case 'cancel_shipment':
          return this.cancelShipment(args);
        case 'schedule_pickup':
          return this.schedulePickup(args);
        case 'cancel_pickup':
          return this.cancelPickup(args);
        case 'get_pickup_availability':
          return this.getPickupAvailability(args);
        case 'list_service_types':
          return this.listServiceTypes();
        case 'get_service_availability':
          return this.getServiceAvailability(args);
        case 'create_return_shipment':
          return this.createReturnShipment(args);
        case 'get_shipment_documents':
          return this.getShipmentDocuments(args);
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
    const response = await this.fetchWithRetry(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
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


  private async fedexPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-locale': 'en_US',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ errors: [{ message: response.statusText }] }));
      return { content: [{ type: 'text', text: `API error: ${response.status} ${JSON.stringify(err)}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async fedexDelete(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',  // FedEx cancel uses PUT with a body
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-locale': 'en_US',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ errors: [{ message: response.statusText }] }));
      return { content: [{ type: 'text', text: `API error: ${response.status} ${JSON.stringify(err)}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async trackShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracking_number) return { content: [{ type: 'text', text: 'tracking_number is required' }], isError: true };
    const body = {
      includeDetailedScans: args.include_detailed_scans !== false,
      trackingInfo: [{ trackingNumberInfo: { trackingNumber: args.tracking_number } }],
    };
    return this.fedexPost('/track/v1/trackingnumbers', body);
  }

  private async trackMultiple(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracking_numbers) return { content: [{ type: 'text', text: 'tracking_numbers is required' }], isError: true };
    const numbers = args.tracking_numbers as string[];
    const body = {
      includeDetailedScans: true,
      trackingInfo: numbers.map(n => ({ trackingNumberInfo: { trackingNumber: n } })),
    };
    return this.fedexPost('/track/v1/trackingnumbers', body);
  }

  private async getRates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin_postal_code || !args.origin_country_code || !args.destination_postal_code || !args.destination_country_code || !args.weight_value) {
      return { content: [{ type: 'text', text: 'origin_postal_code, origin_country_code, destination_postal_code, destination_country_code, and weight_value are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      accountNumber: { value: this.accountNumber },
      requestedShipment: {
        shipper: { address: { postalCode: args.origin_postal_code, countryCode: args.origin_country_code } },
        recipient: { address: { postalCode: args.destination_postal_code, countryCode: args.destination_country_code } },
        requestedPackageLineItems: [{
          weight: { units: (args.weight_units as string) || 'LB', value: args.weight_value },
          ...(args.length && args.width && args.height ? {
            dimensions: {
              length: args.length, width: args.width, height: args.height,
              units: (args.dimensions_units as string) || 'IN',
            },
          } : {}),
        }],
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        rateRequestType: ['ACCOUNT', 'LIST'],
      },
    };
    if (args.service_type) (body.requestedShipment as Record<string, unknown>).serviceType = args.service_type;
    return this.fedexPost('/rate/v1/rates/quotes', body);
  }

  private async validateAddress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.street_lines || !args.postal_code || !args.country_code) {
      return { content: [{ type: 'text', text: 'street_lines, postal_code, and country_code are required' }], isError: true };
    }
    const body = {
      addressesToValidate: [{
        address: {
          streetLines: args.street_lines,
          city: args.city || '',
          stateOrProvinceCode: args.state_or_province || '',
          postalCode: args.postal_code,
          countryCode: args.country_code,
        },
      }],
    };
    return this.fedexPost('/address/v1/addresses/resolve', body);
  }

  private async createShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_type || !args.shipper_name || !args.shipper_address || !args.recipient_name || !args.recipient_address || !args.weight_value) {
      return { content: [{ type: 'text', text: 'service_type, shipper details, recipient details, and weight_value are required' }], isError: true };
    }
    const body = {
      labelResponseOptions: 'URL_ONLY',
      accountNumber: { value: this.accountNumber },
      requestedShipment: {
        shipper: {
          contact: { personName: args.shipper_name, phoneNumber: args.shipper_phone || '' },
          address: {
            streetLines: [args.shipper_address],
            city: args.shipper_city || '',
            stateOrProvinceCode: args.shipper_state || '',
            postalCode: args.shipper_postal_code,
            countryCode: args.shipper_country_code,
          },
        },
        recipients: [{
          contact: { personName: args.recipient_name, phoneNumber: args.recipient_phone || '' },
          address: {
            streetLines: [args.recipient_address],
            city: args.recipient_city || '',
            stateOrProvinceCode: args.recipient_state || '',
            postalCode: args.recipient_postal_code,
            countryCode: args.recipient_country_code,
          },
        }],
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        serviceType: args.service_type,
        packagingType: 'YOUR_PACKAGING',
        requestedPackageLineItems: [{
          weight: { units: (args.weight_units as string) || 'LB', value: args.weight_value },
        }],
        labelSpecification: {
          labelFormatType: 'COMMON2D',
          imageType: (args.label_format as string) || 'PDF',
        },
      },
    };
    return this.fedexPost('/ship/v1/shipments', body);
  }

  private async cancelShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracking_number) return { content: [{ type: 'text', text: 'tracking_number is required' }], isError: true };
    const body = {
      accountNumber: { value: this.accountNumber },
      trackingNumber: args.tracking_number,
      deletionControl: 'DELETE_ALL_PACKAGES',
    };
    return this.fedexDelete('/ship/v1/shipments/cancel', body);
  }

  private async schedulePickup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pickup_date || !args.ready_time || !args.company_close_time || !args.address || !args.city || !args.postal_code || !args.country_code) {
      return { content: [{ type: 'text', text: 'pickup_date, ready_time, company_close_time, address, city, postal_code, and country_code are required' }], isError: true };
    }
    const body = {
      associatedAccountNumber: { value: this.accountNumber },
      originDetail: {
        readyDateTimestamp: `${args.pickup_date as string}T${args.ready_time as string}:00`,
        customerCloseTime: args.company_close_time,
        pickupLocation: {
          address: {
            streetLines: [args.address],
            city: args.city,
            postalCode: args.postal_code,
            countryCode: args.country_code,
          },
        },
      },
      pickupServiceCategory: (args.carrier_code as string) || 'FDXE',
      packageCount: (args.package_count as number) || 1,
    };
    return this.fedexPost('/pickup/v1/pickups', body);
  }

  private async cancelPickup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pickup_confirmation_code || !args.scheduled_date) {
      return { content: [{ type: 'text', text: 'pickup_confirmation_code and scheduled_date are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      associatedAccountNumber: { value: this.accountNumber },
      pickupConfirmationCode: args.pickup_confirmation_code,
      scheduledDate: args.scheduled_date,
      carrierCode: (args.carrier_code as string) || 'FDXE',
    };
    if (args.location) body.location = args.location;
    return this.fedexPost('/pickup/v1/pickups/cancel', body);
  }

  private async getPickupAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.carrier_code || !args.pickup_date || !args.postal_code || !args.country_code) {
      return { content: [{ type: 'text', text: 'carrier_code, pickup_date, postal_code, and country_code are required' }], isError: true };
    }
    const body = {
      pickupAddress: { postalCode: args.postal_code, countryCode: args.country_code },
      pickupRequestType: ['SAME_DAY', 'FUTURE_DAY'],
      dispatchDate: args.pickup_date,
      numberOfBusinessDays: 1,
      carriers: [args.carrier_code],
    };
    return this.fedexPost('/pickup/v1/pickups/availabilities', body);
  }

  private listServiceTypes(): ToolResult {
    const services = {
      express: ['FIRST_OVERNIGHT', 'PRIORITY_OVERNIGHT', 'STANDARD_OVERNIGHT', 'FEDEX_2_DAY_AM', 'FEDEX_2_DAY', 'FEDEX_EXPRESS_SAVER'],
      ground: ['FEDEX_GROUND', 'FEDEX_HOME_DELIVERY'],
      freight: ['FEDEX_FREIGHT_PRIORITY', 'FEDEX_FREIGHT_ECONOMY'],
      international: ['INTERNATIONAL_PRIORITY', 'INTERNATIONAL_ECONOMY', 'INTERNATIONAL_FIRST'],
    };
    return { content: [{ type: 'text', text: JSON.stringify(services, null, 2) }], isError: false };
  }

  private async getServiceAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin_postal_code || !args.origin_country_code || !args.destination_postal_code || !args.destination_country_code) {
      return { content: [{ type: 'text', text: 'origin and destination postal codes and country codes are required' }], isError: true };
    }
    const body = {
      origin: { postalCode: args.origin_postal_code, countryCode: args.origin_country_code },
      destination: { postalCode: args.destination_postal_code, countryCode: args.destination_country_code },
      shipDate: args.ship_date || new Date().toISOString().split('T')[0],
      carrierCodes: ['FDXE', 'FDXG'],
    };
    return this.fedexPost('/availability/v1/transittimes', body);
  }

  private async createReturnShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.original_tracking_number) return { content: [{ type: 'text', text: 'original_tracking_number is required' }], isError: true };
    const body: Record<string, unknown> = {
      associatedAccountNumber: { value: this.accountNumber },
      returnedShipmentDetail: {
        returnType: (args.return_type as string) || 'PRINT_RETURN_LABEL',
        rma: args.rma_number ? { number: args.rma_number } : undefined,
      },
      trackingNumber: args.original_tracking_number,
    };
    return this.fedexPost('/ship/v1/shipments/returnlabel', body);
  }

  private async getShipmentDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracking_number) return { content: [{ type: 'text', text: 'tracking_number is required' }], isError: true };
    const body = {
      accountNumber: { value: this.accountNumber },
      trackingNumber: args.tracking_number,
      documentType: (args.document_type as string) || 'LABEL',
      documentFormat: (args.format as string) || 'PDF',
    };
    return this.fedexPost('/ship/v1/shipments/documents', body);
  }
}
