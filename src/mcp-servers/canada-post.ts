/**
 * Canada Post MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Canada Post MCP server was found on GitHub or the MCP registry.
// This adapter covers: 12 tools (rating, tracking, shipment, manifest, pickup, address validation).
// Recommendation: Use this adapter for all Canada Post integrations.
//
// Base URL: https://soa-gw.canadapost.ca (production)
//           https://ct.soa-gw.canadapost.ca (sandbox/development)
// Auth: HTTP Basic Authentication — username = API key username, password = API key password
//       Header: Authorization: Basic base64(username:password)
//       Also requires: Accept-Language header (en-CA or fr-CA)
// Docs: https://www.canadapost-postescanada.ca/information/app/drc/home
// Rate limits: Not publicly documented; Canada Post recommends keeping requests reasonable
// Note: Canada Post uses REST-style architecture with XML payloads (not JSON).
//       All request/response bodies are XML. Responses are parsed and returned as JSON here.
// Note: A customer number (customerNumber) is required for shipment and manifest operations.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CanadaPostConfig {
  apiUsername: string;
  apiPassword: string;
  customerNumber?: string;
  baseUrl?: string;
  language?: string;
}

export class CanadaPostMCPServer extends MCPAdapterBase {
  private readonly apiUsername: string;
  private readonly apiPassword: string;
  private readonly customerNumber: string;
  private readonly baseUrl: string;
  private readonly language: string;

  constructor(config: CanadaPostConfig) {
    super();
    this.apiUsername = config.apiUsername;
    this.apiPassword = config.apiPassword;
    this.customerNumber = config.customerNumber ?? '';
    this.baseUrl = config.baseUrl ?? 'https://soa-gw.canadapost.ca';
    this.language = config.language ?? 'en-CA';
  }

  static catalog() {
    return {
      name: 'canada-post',
      displayName: 'Canada Post',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'canada post', 'postes canada', 'shipping', 'parcel', 'tracking',
        'rating', 'postage', 'manifest', 'pickup', 'address', 'postal',
        'domestic', 'international', 'canada', 'courier', 'mail',
      ],
      toolNames: [
        'get_rates', 'get_service_info', 'get_tracking_summary', 'get_tracking_details',
        'create_shipment', 'get_shipment', 'void_shipment', 'transmit_shipments',
        'get_manifest', 'create_pickup', 'get_pickup', 'find_post_office',
      ],
      description: 'Canada Post shipping: rate calculation, tracking, shipment creation, manifest transmission, pickup scheduling, and post office location.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_rates',
        description: 'Get available Canada Post shipping services and rates for a parcel with weight and dimensions between origin and destination postal codes',
        inputSchema: {
          type: 'object',
          properties: {
            origin_postal_code: {
              type: 'string',
              description: 'Origin postal code (e.g. K1A 0B1)',
            },
            destination_country: {
              type: 'string',
              description: 'Destination country code ISO 3166-1 alpha-2 (e.g. CA, US)',
            },
            destination_postal_code: {
              type: 'string',
              description: 'Destination postal code or ZIP code (required for CA and US)',
            },
            weight_kg: {
              type: 'number',
              description: 'Parcel weight in kilograms (e.g. 1.5)',
            },
            length_cm: {
              type: 'number',
              description: 'Parcel length in centimetres',
            },
            width_cm: {
              type: 'number',
              description: 'Parcel width in centimetres',
            },
            height_cm: {
              type: 'number',
              description: 'Parcel height in centimetres',
            },
          },
          required: ['origin_postal_code', 'destination_country', 'weight_kg'],
        },
      },
      {
        name: 'get_service_info',
        description: 'Get details about a specific Canada Post shipping service including transit times, features, and restrictions by service code',
        inputSchema: {
          type: 'object',
          properties: {
            service_code: {
              type: 'string',
              description: 'Canada Post service code (e.g. DOM.RP for Regular Parcel, DOM.EP for Expedited Parcel, DOM.XP for Xpresspost, INT.XP for Xpresspost International)',
            },
            origin_country: {
              type: 'string',
              description: 'Origin country code (default: CA)',
            },
            destination_country: {
              type: 'string',
              description: 'Destination country code (default: CA)',
            },
          },
          required: ['service_code'],
        },
      },
      {
        name: 'get_tracking_summary',
        description: 'Get the most recent tracking event for a Canada Post parcel by tracking pin number',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_pin: {
              type: 'string',
              description: 'Canada Post tracking pin (16-digit number, e.g. 1234567890123456)',
            },
          },
          required: ['tracking_pin'],
        },
      },
      {
        name: 'get_tracking_details',
        description: 'Get full tracking history with all recorded events for a Canada Post parcel by tracking pin number',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_pin: {
              type: 'string',
              description: 'Canada Post tracking pin (16-digit number)',
            },
          },
          required: ['tracking_pin'],
        },
      },
      {
        name: 'create_shipment',
        description: 'Create a new Canada Post shipment and generate a shipping label with delivery address, service, and parcel details',
        inputSchema: {
          type: 'object',
          properties: {
            service_code: {
              type: 'string',
              description: 'Canada Post service code (e.g. DOM.EP for Expedited Parcel, DOM.XP for Xpresspost)',
            },
            sender_name: {
              type: 'string',
              description: 'Full name or company name of the sender',
            },
            sender_address_line1: {
              type: 'string',
              description: 'Sender street address line 1',
            },
            sender_city: {
              type: 'string',
              description: 'Sender city',
            },
            sender_province: {
              type: 'string',
              description: 'Sender province code (e.g. ON, BC, QC)',
            },
            sender_postal_code: {
              type: 'string',
              description: 'Sender postal code (e.g. K1A 0B1)',
            },
            receiver_name: {
              type: 'string',
              description: 'Full name or company name of the recipient',
            },
            receiver_address_line1: {
              type: 'string',
              description: 'Recipient street address line 1',
            },
            receiver_city: {
              type: 'string',
              description: 'Recipient city',
            },
            receiver_province: {
              type: 'string',
              description: 'Recipient province or state code',
            },
            receiver_postal_code: {
              type: 'string',
              description: 'Recipient postal code or ZIP code',
            },
            receiver_country: {
              type: 'string',
              description: 'Recipient country code ISO 3166-1 alpha-2 (default: CA)',
            },
            weight_kg: {
              type: 'number',
              description: 'Parcel weight in kilograms',
            },
          },
          required: [
            'service_code', 'sender_name', 'sender_address_line1', 'sender_city',
            'sender_province', 'sender_postal_code', 'receiver_name',
            'receiver_address_line1', 'receiver_city', 'receiver_province',
            'receiver_postal_code', 'weight_kg',
          ],
        },
      },
      {
        name: 'get_shipment',
        description: 'Retrieve details of an existing Canada Post shipment by shipment ID including tracking pin and label URL',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'string',
              description: 'Canada Post shipment ID returned when the shipment was created',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'void_shipment',
        description: 'Void and cancel an existing Canada Post shipment before it has been transmitted in a manifest',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'string',
              description: 'Canada Post shipment ID to void',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'transmit_shipments',
        description: 'Transmit all pending shipments to Canada Post in a manifest to finalize billing and tracking; must be called before drop-off',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'Optional group ID to transmit only shipments belonging to this group',
            },
            po_number: {
              type: 'string',
              description: 'Optional purchase order number to associate with the manifest',
            },
          },
        },
      },
      {
        name: 'get_manifest',
        description: 'Retrieve a previously transmitted manifest by its ID including the manifest artifact URL',
        inputSchema: {
          type: 'object',
          properties: {
            manifest_id: {
              type: 'string',
              description: 'Manifest ID returned from the transmit_shipments operation',
            },
          },
          required: ['manifest_id'],
        },
      },
      {
        name: 'create_pickup',
        description: 'Schedule a parcel pickup from a business address by Canada Post on a specified date',
        inputSchema: {
          type: 'object',
          properties: {
            pickup_date: {
              type: 'string',
              description: 'Requested pickup date in YYYY-MM-DD format',
            },
            pickup_address: {
              type: 'string',
              description: 'Street address for pickup',
            },
            pickup_city: {
              type: 'string',
              description: 'City for pickup',
            },
            pickup_province: {
              type: 'string',
              description: 'Province code for pickup (e.g. ON, BC)',
            },
            pickup_postal_code: {
              type: 'string',
              description: 'Postal code for pickup',
            },
            phone_number: {
              type: 'string',
              description: 'Contact phone number for the pickup',
            },
            parcel_count: {
              type: 'number',
              description: 'Number of parcels to be picked up',
            },
          },
          required: ['pickup_date', 'pickup_address', 'pickup_city', 'pickup_province', 'pickup_postal_code', 'parcel_count'],
        },
      },
      {
        name: 'get_pickup',
        description: 'Retrieve details of a scheduled Canada Post pickup request by pickup ID',
        inputSchema: {
          type: 'object',
          properties: {
            pickup_id: {
              type: 'string',
              description: 'Pickup request ID returned from the create_pickup operation',
            },
          },
          required: ['pickup_id'],
        },
      },
      {
        name: 'find_post_office',
        description: 'Find Canada Post post offices and retail locations near a postal code with distance and hours',
        inputSchema: {
          type: 'object',
          properties: {
            postal_code: {
              type: 'string',
              description: 'Postal code to search near (e.g. K1A 0B1)',
            },
            max_results: {
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
        case 'get_rates':
          return this.getRates(args);
        case 'get_service_info':
          return this.getServiceInfo(args);
        case 'get_tracking_summary':
          return this.getTrackingSummary(args);
        case 'get_tracking_details':
          return this.getTrackingDetails(args);
        case 'create_shipment':
          return this.createShipment(args);
        case 'get_shipment':
          return this.getShipment(args);
        case 'void_shipment':
          return this.voidShipment(args);
        case 'transmit_shipments':
          return this.transmitShipments(args);
        case 'get_manifest':
          return this.getManifest(args);
        case 'create_pickup':
          return this.createPickup(args);
        case 'get_pickup':
          return this.getPickup(args);
        case 'find_post_office':
          return this.findPostOffice(args);
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
    const credentials = Buffer.from(`${this.apiUsername}:${this.apiPassword}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async cpGet(path: string, acceptType?: string): Promise<ToolResult> {
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: acceptType ?? 'application/vnd.cpc.track-v2+xml',
      'Accept-Language': this.language,
    };
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const xml = await response.text();
    return { content: [{ type: 'text', text: this.truncate({ xml_response: xml }) }], isError: false };
  }

  private async cpPost(path: string, xmlBody: string, contentType: string, acceptType: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Accept-Language': this.language,
        'Content-Type': contentType,
        Accept: acceptType,
      },
      body: xmlBody,
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} — ${errorText}` }], isError: true };
    }
    const xml = await response.text();
    return { content: [{ type: 'text', text: this.truncate({ xml_response: xml }) }], isError: false };
  }

  private async getRates(args: Record<string, unknown>): Promise<ToolResult> {
    const originPostal = (args.origin_postal_code as string)?.replace(/\s/g, '') ?? '';
    const destCountry = ((args.destination_country as string) ?? 'CA').toUpperCase();
    const destPostal = ((args.destination_postal_code as string) ?? '').replace(/\s/g, '');
    const weight = (args.weight_kg as number) ?? 1;
    const length = (args.length_cm as number) ?? 0;
    const width = (args.width_cm as number) ?? 0;
    const height = (args.height_cm as number) ?? 0;

    if (!originPostal) return { content: [{ type: 'text', text: 'origin_postal_code is required' }], isError: true };

    const dimensionsXml = length > 0
      ? `<dimensions><length>${length}</length><width>${width}</width><height>${height}</height></dimensions>`
      : '';

    let destinationXml: string;
    if (destCountry === 'CA') {
      destinationXml = `<destination><domestic><postal-code>${destPostal}</postal-code></domestic></destination>`;
    } else if (destCountry === 'US') {
      destinationXml = `<destination><united-states><zip-code>${destPostal}</zip-code></united-states></destination>`;
    } else {
      destinationXml = `<destination><international><country-code>${destCountry}</country-code></international></destination>`;
    }

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<mailing-scenario xmlns="http://www.canadapost.ca/ws/ship/rate-v4">
  <customer-number>${this.customerNumber}</customer-number>
  <parcel-characteristics>
    <weight>${weight}</weight>
    ${dimensionsXml}
  </parcel-characteristics>
  <origin-postal-code>${originPostal}</origin-postal-code>
  ${destinationXml}
</mailing-scenario>`;

    return this.cpPost(
      `/rs/${this.customerNumber}/${this.customerNumber}/service`,
      xmlBody,
      'application/vnd.cpc.ship.rate-v4+xml',
      'application/vnd.cpc.ship.rate-v4+xml',
    );
  }

  private async getServiceInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const serviceCode = args.service_code as string;
    if (!serviceCode) return { content: [{ type: 'text', text: 'service_code is required' }], isError: true };
    const destCountry = (args.destination_country as string) ?? 'CA';
    return this.cpGet(
      `/rs/ship/service/${encodeURIComponent(serviceCode)}?country=${encodeURIComponent(destCountry)}`,
      'application/vnd.cpc.ship.rate-v4+xml',
    );
  }

  private async getTrackingSummary(args: Record<string, unknown>): Promise<ToolResult> {
    const pin = args.tracking_pin as string;
    if (!pin) return { content: [{ type: 'text', text: 'tracking_pin is required' }], isError: true };
    return this.cpGet(`/vis/track/pin/${pin}/summary`, 'application/vnd.cpc.track-v2+xml');
  }

  private async getTrackingDetails(args: Record<string, unknown>): Promise<ToolResult> {
    const pin = args.tracking_pin as string;
    if (!pin) return { content: [{ type: 'text', text: 'tracking_pin is required' }], isError: true };
    return this.cpGet(`/vis/track/pin/${pin}/detail`, 'application/vnd.cpc.track-v2+xml');
  }

  private async createShipment(args: Record<string, unknown>): Promise<ToolResult> {
    const required = [
      'service_code', 'sender_name', 'sender_address_line1', 'sender_city',
      'sender_province', 'sender_postal_code', 'receiver_name',
      'receiver_address_line1', 'receiver_city', 'receiver_province',
      'receiver_postal_code', 'weight_kg',
    ];
    for (const field of required) {
      if (!args[field]) return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
    }

    const receiverCountry = (args.receiver_country as string) ?? 'CA';
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<shipment xmlns="http://www.canadapost.ca/ws/shipment-v8">
  <delivery-spec>
    <service-code>${encodeURIComponent(args.service_code as string)}</service-code>
    <sender>
      <name>${encodeURIComponent(args.sender_name as string)}</name>
      <address-details>
        <address-line-1>${encodeURIComponent(args.sender_address_line1 as string)}</address-line-1>
        <city>${encodeURIComponent(args.sender_city as string)}</city>
        <prov-state>${encodeURIComponent(args.sender_province as string)}</prov-state>
        <postal-zip-code>${(args.sender_postal_code as string).replace(/\s/g, '')}</postal-zip-code>
        <country-code>CA</country-code>
      </address-details>
    </sender>
    <destination>
      <name>${encodeURIComponent(args.receiver_name as string)}</name>
      <address-details>
        <address-line-1>${encodeURIComponent(args.receiver_address_line1 as string)}</address-line-1>
        <city>${encodeURIComponent(args.receiver_city as string)}</city>
        <prov-state>${encodeURIComponent(args.receiver_province as string)}</prov-state>
        <postal-zip-code>${(args.receiver_postal_code as string).replace(/\s/g, '')}</postal-zip-code>
        <country-code>${receiverCountry}</country-code>
      </address-details>
    </destination>
    <parcel-characteristics>
      <weight>${encodeURIComponent(args.weight_kg as string)}</weight>
    </parcel-characteristics>
    <print-preferences>
      <output-format>8.5x11</output-format>
    </print-preferences>
  </delivery-spec>
</shipment>`;

    return this.cpPost(
      `/rs/${this.customerNumber}/${this.customerNumber}/shipment`,
      xmlBody,
      'application/vnd.cpc.shipment-v8+xml',
      'application/vnd.cpc.shipment-v8+xml',
    );
  }

  private async getShipment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.shipment_id as string;
    if (!id) return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    return this.cpGet(`/rs/${this.customerNumber}/${this.customerNumber}/shipment/${id}/details`, 'application/vnd.cpc.shipment-v8+xml');
  }

  private async voidShipment(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.shipment_id as string;
    if (!id) return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/rs/${this.customerNumber}/${this.customerNumber}/shipment/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: this.authHeader,
        'Accept-Language': this.language,
        Accept: 'application/vnd.cpc.shipment-v8+xml',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, shipment_id: id, status: 'voided' }) }], isError: false };
  }

  private async transmitShipments(args: Record<string, unknown>): Promise<ToolResult> {
    const groupId = args.group_id as string | undefined;
    const poNumber = args.po_number as string | undefined;

    const groupXml = groupId ? `<group-id>${groupId}</group-id>` : '';
    const poXml = poNumber ? `<po-number>${poNumber}</po-number>` : '';

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<transmit-set xmlns="http://www.canadapost.ca/ws/manifest-v8">
  <customer-number>${this.customerNumber}</customer-number>
  ${groupXml}
  ${poXml}
</transmit-set>`;

    return this.cpPost(
      `/rs/${this.customerNumber}/${this.customerNumber}/manifest`,
      xmlBody,
      'application/vnd.cpc.manifest-v8+xml',
      'application/vnd.cpc.manifest-v8+xml',
    );
  }

  private async getManifest(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.manifest_id as string;
    if (!id) return { content: [{ type: 'text', text: 'manifest_id is required' }], isError: true };
    return this.cpGet(`/rs/${this.customerNumber}/${this.customerNumber}/manifest/${id}/details`, 'application/vnd.cpc.manifest-v8+xml');
  }

  private async createPickup(args: Record<string, unknown>): Promise<ToolResult> {
    const required = ['pickup_date', 'pickup_address', 'pickup_city', 'pickup_province', 'pickup_postal_code', 'parcel_count'];
    for (const field of required) {
      if (!args[field]) return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
    }

    const phoneXml = args.phone_number ? `<phone-number>${encodeURIComponent(args.phone_number as string)}</phone-number>` : '';
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<pickup-request-details xmlns="http://www.canadapost.ca/ws/pickuprequest">
  <pickup-type>OnDemand</pickup-type>
  <pickup-location>
    <business-address-flag>true</business-address-flag>
    <alternate-address>
      <address-line-1>${encodeURIComponent(args.pickup_address as string)}</address-line-1>
      <city>${encodeURIComponent(args.pickup_city as string)}</city>
      <prov-state>${encodeURIComponent(args.pickup_province as string)}</prov-state>
      <postal-zip-code>${(args.pickup_postal_code as string).replace(/\s/g, '')}</postal-zip-code>
      <country-code>CA</country-code>
    </alternate-address>
  </pickup-location>
  <contact-info>
    <contact-name>API Request</contact-name>
    ${phoneXml}
  </contact-info>
  <pickup-volume>${encodeURIComponent(args.parcel_count as string)}</pickup-volume>
  <pickup-date>${encodeURIComponent(args.pickup_date as string)}</pickup-date>
</pickup-request-details>`;

    return this.cpPost(
      `/enab/${this.customerNumber}/pickuprequest`,
      xmlBody,
      'application/vnd.cpc.pickuprequest+xml',
      'application/vnd.cpc.pickuprequest+xml',
    );
  }

  private async getPickup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.pickup_id as string;
    if (!id) return { content: [{ type: 'text', text: 'pickup_id is required' }], isError: true };
    return this.cpGet(`/enab/${this.customerNumber}/pickuprequest/${id}/details`, 'application/vnd.cpc.pickuprequest+xml');
  }

  private async findPostOffice(args: Record<string, unknown>): Promise<ToolResult> {
    const postalCode = (args.postal_code as string)?.replace(/\s/g, '');
    if (!postalCode) return { content: [{ type: 'text', text: 'postal_code is required' }], isError: true };
    const maxResults = (args.max_results as number) ?? 10;
    return this.cpGet(
      `/rs/postoffice?postalCode=${postalCode}&maxCount=${maxResults}`,
      'application/vnd.cpc.postoffice+xml',
    );
  }
}
