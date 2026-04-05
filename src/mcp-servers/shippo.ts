/**
 * Shippo MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://docs.goshippo.com/docs/guides_general/mcpserver — transport: stdio, auth: ShippoToken header
// Vendor publishes @shippo/shippo-mcp on npm. Latest: v2.0.8, published 2026-03-18 (10 days ago). Actively maintained.
// MCP covers: addresses, shipments, rates, labels, tracking, carrier accounts, customs, orders, webhooks, batches,
//             manifests, pickups, refunds, service groups, live rates — strictly more than our REST adapter.
// Our adapter covers: 14 tools (core operations). Vendor MCP covers full API surface (20+ operations).
// Recommendation: use-vendor-mcp — MCP is a strict superset of our REST adapter. Prefer vendor MCP for full coverage.
//                 Keep this adapter for air-gapped deployments.
//
// Base URL: https://api.goshippo.com
// Auth: Shippo token — Authorization: ShippoToken <token>
// Docs: https://docs.goshippo.com/shippoapi/public-api/
// Rate limits: Varies by endpoint and HTTP verb. 429 returned when exceeded.
//              GET list endpoints: higher limits. POST (create label): lower limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ShippoConfig {
  apiToken: string;
  baseUrl?: string;
}

export class ShippoMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: ShippoConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.goshippo.com';
  }

  static catalog() {
    return {
      name: 'shippo',
      displayName: 'Shippo',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'shippo', 'shipping', 'label', 'rate', 'carrier', 'tracking', 'parcel', 'address',
        'fulfillment', 'shipment', 'ups', 'fedex', 'usps', 'dhl', 'customs', 'postage',
      ],
      toolNames: [
        'validate_address', 'create_address', 'list_addresses',
        'create_parcel', 'create_shipment', 'get_shipment', 'list_shipments',
        'get_rates', 'purchase_label', 'get_transaction', 'list_transactions',
        'get_tracking_status', 'list_carriers', 'create_customs_declaration',
      ],
      description: 'Shippo shipping API: validate addresses, get multi-carrier rates, purchase labels, track packages, and manage customs declarations across 40+ carriers.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'validate_address',
        description: 'Validate a shipping address and return standardized address data with validation messages',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full name of the recipient' },
            company: { type: 'string', description: 'Company name (optional)' },
            street1: { type: 'string', description: 'Street address line 1' },
            street2: { type: 'string', description: 'Street address line 2 (optional)' },
            city: { type: 'string', description: 'City name' },
            state: { type: 'string', description: 'State or province code (e.g. CA, NY)' },
            zip: { type: 'string', description: 'Postal or ZIP code' },
            country: { type: 'string', description: 'Two-letter ISO country code (e.g. US, GB, DE)' },
            phone: { type: 'string', description: 'Phone number (optional)' },
            email: { type: 'string', description: 'Email address (optional)' },
          },
          required: ['name', 'street1', 'city', 'state', 'zip', 'country'],
        },
      },
      {
        name: 'create_address',
        description: 'Create and store a reusable address object for use in shipments',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full name' },
            company: { type: 'string', description: 'Company name (optional)' },
            street1: { type: 'string', description: 'Street address line 1' },
            street2: { type: 'string', description: 'Street address line 2 (optional)' },
            city: { type: 'string', description: 'City' },
            state: { type: 'string', description: 'State or province code' },
            zip: { type: 'string', description: 'Postal code' },
            country: { type: 'string', description: 'Two-letter ISO country code' },
            phone: { type: 'string', description: 'Phone number (optional)' },
            email: { type: 'string', description: 'Email (optional)' },
          },
          required: ['name', 'street1', 'city', 'state', 'zip', 'country'],
        },
      },
      {
        name: 'list_addresses',
        description: 'List stored address objects with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            results: { type: 'number', description: 'Number of results per page (default: 25, max: 100)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'create_parcel',
        description: 'Create a parcel object with dimensions and weight for rate calculation',
        inputSchema: {
          type: 'object',
          properties: {
            length: { type: 'string', description: 'Parcel length as string (e.g. "10")' },
            width: { type: 'string', description: 'Parcel width as string' },
            height: { type: 'string', description: 'Parcel height as string' },
            distance_unit: { type: 'string', description: 'Unit of measurement: in, cm, mm, ft, m, yd (default: in)' },
            weight: { type: 'string', description: 'Parcel weight as string (e.g. "2.5")' },
            mass_unit: { type: 'string', description: 'Weight unit: oz, lb, g, kg (default: lb)' },
          },
          required: ['length', 'width', 'height', 'weight'],
        },
      },
      {
        name: 'create_shipment',
        description: 'Create a shipment object from address IDs and parcel IDs to retrieve available shipping rates',
        inputSchema: {
          type: 'object',
          properties: {
            address_from: { type: 'string', description: 'Sender address object ID or inline address object JSON string' },
            address_to: { type: 'string', description: 'Recipient address object ID or inline address object JSON string' },
            parcels: {
              type: 'array',
              description: 'Array of parcel object IDs (strings)',
            },
            extra: { type: 'string', description: 'JSON string of extra shipment options (signature, insurance, etc.) — optional' },
          },
          required: ['address_from', 'address_to', 'parcels'],
        },
      },
      {
        name: 'get_shipment',
        description: 'Retrieve a specific shipment and its available rates by shipment object ID',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: { type: 'string', description: 'Shipment object ID' },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'list_shipments',
        description: 'List all shipments with pagination and optional status filter',
        inputSchema: {
          type: 'object',
          properties: {
            results: { type: 'number', description: 'Results per page (default: 25, max: 100)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_rates',
        description: 'Get all available carrier rates for a shipment by shipment ID, optionally filtered by currency',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: { type: 'string', description: 'Shipment object ID to retrieve rates for' },
            currency: { type: 'string', description: 'Currency code for rate amounts (e.g. USD, EUR — default: account currency)' },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'purchase_label',
        description: 'Purchase a shipping label by selecting a specific rate object ID. Returns a transaction with label URL and tracking number.',
        inputSchema: {
          type: 'object',
          properties: {
            rate: { type: 'string', description: 'Rate object ID to purchase (from get_rates response)' },
            label_file_type: { type: 'string', description: 'Label format: PDF, PDF_4x6, PNG, ZPLII (default: PDF)' },
            async: { type: 'boolean', description: 'If true, returns immediately without waiting for label generation (default: false)' },
          },
          required: ['rate'],
        },
      },
      {
        name: 'get_transaction',
        description: 'Retrieve a specific shipping label transaction by transaction ID, including label URL and tracking number',
        inputSchema: {
          type: 'object',
          properties: {
            transaction_id: { type: 'string', description: 'Transaction object ID' },
          },
          required: ['transaction_id'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List all label purchase transactions with optional status and tracking number filters',
        inputSchema: {
          type: 'object',
          properties: {
            results: { type: 'number', description: 'Results per page (default: 25, max: 100)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            tracking_status: { type: 'string', description: 'Filter by tracking status: UNKNOWN, PRE_TRANSIT, TRANSIT, DELIVERED, RETURNED, FAILURE (optional)' },
            object_status: { type: 'string', description: 'Filter by transaction status: WAITING, QUEUED, SUCCESS, ERROR (optional)' },
          },
        },
      },
      {
        name: 'get_tracking_status',
        description: 'Get real-time tracking status and full tracking history for a shipment by carrier and tracking number',
        inputSchema: {
          type: 'object',
          properties: {
            carrier: { type: 'string', description: 'Carrier token: usps, ups, fedex, dhl_express, canada_post, etc.' },
            tracking_number: { type: 'string', description: 'Carrier tracking number' },
          },
          required: ['carrier', 'tracking_number'],
        },
      },
      {
        name: 'list_carriers',
        description: 'List all carrier accounts connected to the Shippo account with their capabilities and status',
        inputSchema: {
          type: 'object',
          properties: {
            results: { type: 'number', description: 'Results per page (default: 25)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'create_customs_declaration',
        description: 'Create a customs declaration for international shipments with item descriptions and values',
        inputSchema: {
          type: 'object',
          properties: {
            contents_type: { type: 'string', description: 'Contents type: DOCUMENTS, GIFT, SAMPLE, MERCHANDISE, HUMANITARIAN_DONATION, RETURN_MERCHANDISE, OTHER' },
            contents_explanation: { type: 'string', description: 'Explanation of contents (required if contents_type is OTHER)' },
            non_delivery_option: { type: 'string', description: 'Non-delivery option: ABANDON or RETURN (default: RETURN)' },
            certify: { type: 'boolean', description: 'Certify that contents declaration is accurate (default: true)' },
            certify_signer: { type: 'string', description: 'Name of person certifying the declaration' },
            items: {
              type: 'array',
              description: 'Array of customs items JSON objects with description, quantity, net_weight, mass_unit, value_amount, value_currency, origin_country',
            },
          },
          required: ['contents_type', 'certify_signer', 'items'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'validate_address':
          return this.validateAddress(args);
        case 'create_address':
          return this.createAddress(args);
        case 'list_addresses':
          return this.listAddresses(args);
        case 'create_parcel':
          return this.createParcel(args);
        case 'create_shipment':
          return this.createShipment(args);
        case 'get_shipment':
          return this.getShipment(args);
        case 'list_shipments':
          return this.listShipments(args);
        case 'get_rates':
          return this.getRates(args);
        case 'purchase_label':
          return this.purchaseLabel(args);
        case 'get_transaction':
          return this.getTransaction(args);
        case 'list_transactions':
          return this.listTransactions(args);
        case 'get_tracking_status':
          return this.getTrackingStatus(args);
        case 'list_carriers':
          return this.listCarriers(args);
        case 'create_customs_declaration':
          return this.createCustomsDeclaration(args);
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
    return {
      'Authorization': `ShippoToken ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async validateAddress(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { ...args, validate: true };
    return this.post('/addresses', body);
  }

  private async createAddress(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/addresses', args as Record<string, unknown>);
  }

  private async listAddresses(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      results: String((args.results as number) || 25),
      page: String((args.page as number) || 1),
    };
    return this.get('/addresses', params);
  }

  private async createParcel(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      length: args.length,
      width: args.width,
      height: args.height,
      distance_unit: (args.distance_unit as string) || 'in',
      weight: args.weight,
      mass_unit: (args.mass_unit as string) || 'lb',
    };
    return this.post('/parcels', body);
  }

  private async createShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.address_from || !args.address_to || !args.parcels) {
      return { content: [{ type: 'text', text: 'address_from, address_to, and parcels are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      address_from: args.address_from,
      address_to: args.address_to,
      parcels: args.parcels,
    };
    if (args.extra) {
      try {
        body.extra = JSON.parse(args.extra as string);
      } catch {
        body.extra = args.extra;
      }
    }
    return this.post('/shipments', body);
  }

  private async getShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    return this.get(`/shipments/${encodeURIComponent(args.shipment_id as string)}`);
  }

  private async listShipments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/shipments', {
      results: String((args.results as number) || 25),
      page: String((args.page as number) || 1),
    });
  }

  private async getRates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.currency) params.currency = args.currency as string;
    return this.get(`/shipments/${encodeURIComponent(args.shipment_id as string)}/rates`, params);
  }

  private async purchaseLabel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.rate) return { content: [{ type: 'text', text: 'rate is required' }], isError: true };
    const body: Record<string, unknown> = {
      rate: args.rate,
      label_file_type: (args.label_file_type as string) || 'PDF',
      async: (args.async as boolean) ?? false,
    };
    return this.post('/transactions', body);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.transaction_id) return { content: [{ type: 'text', text: 'transaction_id is required' }], isError: true };
    return this.get(`/transactions/${encodeURIComponent(args.transaction_id as string)}`);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      results: String((args.results as number) || 25),
      page: String((args.page as number) || 1),
    };
    if (args.tracking_status) params.tracking_status = args.tracking_status as string;
    if (args.object_status) params.object_status = args.object_status as string;
    return this.get('/transactions', params);
  }

  private async getTrackingStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.carrier || !args.tracking_number) {
      return { content: [{ type: 'text', text: 'carrier and tracking_number are required' }], isError: true };
    }
    return this.get(`/tracks/${encodeURIComponent(args.carrier as string)}/${encodeURIComponent(args.tracking_number as string)}`);
  }

  private async listCarriers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/carrier_accounts', {
      results: String((args.results as number) || 25),
      page: String((args.page as number) || 1),
    });
  }

  private async createCustomsDeclaration(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contents_type || !args.certify_signer || !args.items) {
      return { content: [{ type: 'text', text: 'contents_type, certify_signer, and items are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      contents_type: args.contents_type,
      non_delivery_option: (args.non_delivery_option as string) || 'RETURN',
      certify: (args.certify as boolean) ?? true,
      certify_signer: args.certify_signer,
      items: args.items,
    };
    if (args.contents_explanation) body.contents_explanation = args.contents_explanation;
    return this.post('/customs/declarations', body);
  }
}
