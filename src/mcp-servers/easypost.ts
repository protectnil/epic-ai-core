/**
 * EasyPost MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official EasyPost MCP server was found on GitHub or the EasyPost developer portal.
// Third-party aggregator mcpbundles.com lists an EasyPost MCP (9 read-only list tools) but
// this is NOT an official EasyPost-published server and covers fewer operations than our adapter.
//
// Base URL: https://api.easypost.com/v2
// Auth: HTTP Basic Authentication — API key as the username, empty string as the password.
//       Test keys begin with "EZTKtest_"; production keys begin with "EZTK".
// Docs: https://docs.easypost.com/
//       https://docs.easypost.com/docs/authentication
// Rate limits: 5 req/s on Index endpoints (list_*). Dynamic load-based limits on buy/rate endpoints.
//              Exceeding limits returns HTTP 429.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EasyPostConfig {
  apiKey: string;
  baseUrl?: string;
}

export class EasyPostMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: EasyPostConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.easypost.com/v2';
  }

  static catalog() {
    return {
      name: 'easypost',
      displayName: 'EasyPost',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'easypost', 'shipping', 'carrier', 'label', 'shipment', 'tracking', 'tracker',
        'address verification', 'rate', 'parcel', 'customs', 'pickup', 'batch',
        'usps', 'ups', 'fedex', 'dhl', 'multi-carrier', 'logistics', 'postage',
      ],
      toolNames: [
        'verify_address', 'create_shipment', 'get_shipment', 'list_shipments',
        'buy_shipment', 'get_rates', 'create_tracker', 'get_tracker', 'list_trackers',
        'create_pickup', 'get_pickup', 'buy_pickup', 'cancel_pickup',
        'create_batch', 'get_batch', 'list_batches', 'add_shipments_to_batch', 'buy_batch',
        'create_customs_info', 'list_carriers',
      ],
      description: 'EasyPost multi-carrier shipping: verify addresses, rate shop, buy labels, track packages, schedule pickups, and manage batches across USPS, UPS, FedEx, DHL, and 100+ carriers.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'verify_address',
        description: 'Verify and standardize a shipping address; returns corrected address and deliverability status',
        inputSchema: {
          type: 'object',
          properties: {
            street1: {
              type: 'string',
              description: 'Primary street address line',
            },
            street2: {
              type: 'string',
              description: 'Secondary address line (apt, suite, unit)',
            },
            city: {
              type: 'string',
              description: 'City name',
            },
            state: {
              type: 'string',
              description: 'State or province abbreviation e.g. CA, NY',
            },
            zip: {
              type: 'string',
              description: 'ZIP or postal code',
            },
            country: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (default: US)',
            },
            company: {
              type: 'string',
              description: 'Company name at the address',
            },
            name: {
              type: 'string',
              description: 'Recipient name at the address',
            },
            phone: {
              type: 'string',
              description: 'Phone number for the address',
            },
          },
          required: ['street1'],
        },
      },
      {
        name: 'create_shipment',
        description: 'Create a shipment between a to/from address and parcel; returns rates from all eligible carriers',
        inputSchema: {
          type: 'object',
          properties: {
            to_address: {
              type: 'string',
              description: 'JSON object with to-address fields: name, street1, city, state, zip, country',
            },
            from_address: {
              type: 'string',
              description: 'JSON object with from-address fields: name, street1, city, state, zip, country',
            },
            parcel: {
              type: 'string',
              description: 'JSON object with parcel dimensions: length, width, height (inches), weight (oz)',
            },
            customs_info: {
              type: 'string',
              description: 'Customs info object ID (EZci_...) for international shipments',
            },
            carrier_accounts: {
              type: 'string',
              description: 'Comma-separated carrier account IDs to restrict rate shopping',
            },
            reference: {
              type: 'string',
              description: 'Optional reference string for your own tracking',
            },
          },
          required: ['to_address', 'from_address', 'parcel'],
        },
      },
      {
        name: 'get_shipment',
        description: 'Retrieve full details of a shipment by EasyPost shipment ID including rates and label URL',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'string',
              description: 'EasyPost shipment ID (shp_...)',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'list_shipments',
        description: 'List shipments with optional date range, purchase status, and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            purchased: {
              type: 'boolean',
              description: 'Filter to only purchased (true) or only unpurchased (false) shipments',
            },
            before_id: {
              type: 'string',
              description: 'Pagination cursor: return shipments created before this shipment ID',
            },
            after_id: {
              type: 'string',
              description: 'Pagination cursor: return shipments created after this shipment ID',
            },
            start_datetime: {
              type: 'string',
              description: 'Return shipments created on or after this ISO 8601 datetime',
            },
            end_datetime: {
              type: 'string',
              description: 'Return shipments created on or before this ISO 8601 datetime',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 20, max: 100)',
            },
          },
        },
      },
      {
        name: 'buy_shipment',
        description: 'Purchase a shipping label for a shipment by selecting a rate; returns label URL and tracking number',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'string',
              description: 'EasyPost shipment ID to buy a label for (shp_...)',
            },
            rate_id: {
              type: 'string',
              description: 'Rate ID to purchase (rate_...) obtained from create_shipment or get_rates',
            },
            insurance: {
              type: 'number',
              description: 'Insurance amount in USD (optional; insures the shipment up to this value)',
            },
          },
          required: ['shipment_id', 'rate_id'],
        },
      },
      {
        name: 'get_rates',
        description: 'Regenerate and return updated carrier rates for an existing shipment',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'string',
              description: 'EasyPost shipment ID to refresh rates for (shp_...)',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'create_tracker',
        description: 'Create a standalone tracker for a carrier tracking number without an EasyPost shipment',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_code: {
              type: 'string',
              description: 'Carrier-issued tracking number to track',
            },
            carrier: {
              type: 'string',
              description: 'Carrier name to associate e.g. USPS, UPS, FedEx, DHL (auto-detected if omitted)',
            },
          },
          required: ['tracking_code'],
        },
      },
      {
        name: 'get_tracker',
        description: 'Retrieve current tracking status and history for a tracker by EasyPost tracker ID',
        inputSchema: {
          type: 'object',
          properties: {
            tracker_id: {
              type: 'string',
              description: 'EasyPost tracker ID (trk_...)',
            },
          },
          required: ['tracker_id'],
        },
      },
      {
        name: 'list_trackers',
        description: 'List trackers with optional carrier, status, and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_code: {
              type: 'string',
              description: 'Filter by carrier tracking number',
            },
            carrier: {
              type: 'string',
              description: 'Filter by carrier name e.g. USPS, UPS, FedEx',
            },
            before_id: {
              type: 'string',
              description: 'Pagination cursor: return trackers created before this tracker ID',
            },
            after_id: {
              type: 'string',
              description: 'Pagination cursor: return trackers created after this tracker ID',
            },
            start_datetime: {
              type: 'string',
              description: 'Return trackers created on or after this ISO 8601 datetime',
            },
            end_datetime: {
              type: 'string',
              description: 'Return trackers created on or before this ISO 8601 datetime',
            },
            page_size: {
              type: 'number',
              description: 'Number of results (default: 30, max: 100)',
            },
          },
        },
      },
      {
        name: 'create_pickup',
        description: 'Schedule a carrier pickup at a specified address for one or more purchased shipments',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_ids: {
              type: 'string',
              description: 'Comma-separated list of shipment IDs (shp_...) to include in the pickup',
            },
            address: {
              type: 'string',
              description: 'JSON address object for the pickup location: name, street1, city, state, zip',
            },
            min_datetime: {
              type: 'string',
              description: 'Earliest acceptable pickup datetime in ISO 8601 format',
            },
            max_datetime: {
              type: 'string',
              description: 'Latest acceptable pickup datetime in ISO 8601 format',
            },
            instructions: {
              type: 'string',
              description: 'Special pickup instructions for the carrier driver',
            },
          },
          required: ['shipment_ids', 'address', 'min_datetime', 'max_datetime'],
        },
      },
      {
        name: 'get_pickup',
        description: 'Retrieve details of a carrier pickup including status and available time windows',
        inputSchema: {
          type: 'object',
          properties: {
            pickup_id: {
              type: 'string',
              description: 'EasyPost pickup ID (pickup_...)',
            },
          },
          required: ['pickup_id'],
        },
      },
      {
        name: 'buy_pickup',
        description: 'Confirm and purchase a pickup window by selecting a carrier and rate from the pickup',
        inputSchema: {
          type: 'object',
          properties: {
            pickup_id: {
              type: 'string',
              description: 'EasyPost pickup ID (pickup_...)',
            },
            carrier: {
              type: 'string',
              description: 'Carrier name for the pickup e.g. USPS, UPS',
            },
            service: {
              type: 'string',
              description: 'Service level for the pickup e.g. NextDayAir, Priority',
            },
          },
          required: ['pickup_id', 'carrier', 'service'],
        },
      },
      {
        name: 'cancel_pickup',
        description: 'Cancel a scheduled pickup that has not yet been completed',
        inputSchema: {
          type: 'object',
          properties: {
            pickup_id: {
              type: 'string',
              description: 'EasyPost pickup ID to cancel (pickup_...)',
            },
          },
          required: ['pickup_id'],
        },
      },
      {
        name: 'create_batch',
        description: 'Create a batch to group multiple shipments for bulk label generation and scan form creation',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_ids: {
              type: 'string',
              description: 'Comma-separated list of purchased shipment IDs (shp_...) to add to the batch',
            },
            reference: {
              type: 'string',
              description: 'Optional reference label for the batch',
            },
          },
        },
      },
      {
        name: 'get_batch',
        description: 'Retrieve status and details of a batch by EasyPost batch ID',
        inputSchema: {
          type: 'object',
          properties: {
            batch_id: {
              type: 'string',
              description: 'EasyPost batch ID (batch_...)',
            },
          },
          required: ['batch_id'],
        },
      },
      {
        name: 'list_batches',
        description: 'List all batches with pagination; supports before_id cursor and page_size filters',
        inputSchema: {
          type: 'object',
          properties: {
            before_id: {
              type: 'string',
              description: 'Pagination cursor: return batches created before this ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of batches per page (default: 20)',
            },
          },
        },
      },
      {
        name: 'add_shipments_to_batch',
        description: 'Add one or more purchased shipments to an existing batch',
        inputSchema: {
          type: 'object',
          properties: {
            batch_id: {
              type: 'string',
              description: 'EasyPost batch ID to add shipments to (batch_...)',
            },
            shipment_ids: {
              type: 'string',
              description: 'Comma-separated list of shipment IDs to add (shp_...)',
            },
          },
          required: ['batch_id', 'shipment_ids'],
        },
      },
      {
        name: 'buy_batch',
        description: 'Purchase labels for all unpurchased shipments in a batch; optionally specify label format (PDF, ZPL, EPL2, PNG)',
        inputSchema: {
          type: 'object',
          properties: {
            batch_id: {
              type: 'string',
              description: 'EasyPost batch ID to purchase (batch_...)',
            },
            label_format: {
              type: 'string',
              description: 'Label format: PDF, ZPL, EPL2, PNG (default: PDF)',
            },
          },
          required: ['batch_id'],
        },
      },
      {
        name: 'create_customs_info',
        description: 'Create a customs info object for international shipments with item descriptions, values, and HS codes',
        inputSchema: {
          type: 'object',
          properties: {
            eel_pfc: {
              type: 'string',
              description: 'EEL / PFC number for US exports e.g. NOEEI 30.37(a)',
            },
            contents_type: {
              type: 'string',
              description: 'Contents type: gift, merchandise, returned_goods, documents, sample',
            },
            contents_explanation: {
              type: 'string',
              description: 'Free-text description of the package contents',
            },
            restriction_type: {
              type: 'string',
              description: 'Restriction type: none, other, quarantine, sanitary_phytosanitary',
            },
            non_delivery_option: {
              type: 'string',
              description: 'Action on delivery failure: abandon or return (default: return)',
            },
            customs_items: {
              type: 'string',
              description: 'JSON array of customs item objects: {description, quantity, weight, value, origin_country, hs_tariff_number}',
            },
          },
          required: ['contents_type', 'customs_items'],
        },
      },
      {
        name: 'list_carriers',
        description: 'List carrier accounts connected to the EasyPost account with type and credentials summary',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'verify_address': return this.verifyAddress(args);
        case 'create_shipment': return this.createShipment(args);
        case 'get_shipment': return this.getShipment(args);
        case 'list_shipments': return this.listShipments(args);
        case 'buy_shipment': return this.buyShipment(args);
        case 'get_rates': return this.getRates(args);
        case 'create_tracker': return this.createTracker(args);
        case 'get_tracker': return this.getTracker(args);
        case 'list_trackers': return this.listTrackers(args);
        case 'create_pickup': return this.createPickup(args);
        case 'get_pickup': return this.getPickup(args);
        case 'buy_pickup': return this.buyPickup(args);
        case 'cancel_pickup': return this.cancelPickup(args);
        case 'create_batch': return this.createBatch(args);
        case 'get_batch': return this.getBatch(args);
        case 'list_batches': return this.listBatches(args);
        case 'add_shipments_to_batch': return this.addShipmentsToBatch(args);
        case 'buy_batch': return this.buyBatch(args);
        case 'create_customs_info': return this.createCustomsInfo(args);
        case 'list_carriers': return this.listCarriers();
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
    // EasyPost uses HTTP Basic auth: API key as username, empty password
    return `Basic ${btoa(`${this.apiKey}:`)}`;
  }

  private async epGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async epPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }


  private parseJson(value: unknown, fieldName: string): { ok: true; data: unknown } | { ok: false; result: ToolResult } {
    if (typeof value !== 'string') return { ok: true, data: value };
    try {
      return { ok: true, data: JSON.parse(value) };
    } catch {
      return { ok: false, result: { content: [{ type: 'text', text: `${fieldName} must be a valid JSON string` }], isError: true } };
    }
  }

  private async verifyAddress(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.street1) return { content: [{ type: 'text', text: 'street1 is required' }], isError: true };
    const address: Record<string, unknown> = { street1: args.street1 };
    if (args.street2) address.street2 = args.street2;
    if (args.city) address.city = args.city;
    if (args.state) address.state = args.state;
    if (args.zip) address.zip = args.zip;
    if (args.country) address.country = args.country;
    if (args.company) address.company = args.company;
    if (args.name) address.name = args.name;
    if (args.phone) address.phone = args.phone;
    return this.epPost('/addresses', { address, verify: ['delivery'] });
  }

  private async createShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to_address || !args.from_address || !args.parcel) {
      return { content: [{ type: 'text', text: 'to_address, from_address, and parcel are required' }], isError: true };
    }
    const toAddr = this.parseJson(args.to_address, 'to_address');
    if (!toAddr.ok) return toAddr.result;
    const fromAddr = this.parseJson(args.from_address, 'from_address');
    if (!fromAddr.ok) return fromAddr.result;
    const parcel = this.parseJson(args.parcel, 'parcel');
    if (!parcel.ok) return parcel.result;

    const shipment: Record<string, unknown> = {
      to_address: toAddr.data,
      from_address: fromAddr.data,
      parcel: parcel.data,
    };
    if (args.customs_info) shipment.customs_info = { id: args.customs_info };
    if (args.reference) shipment.reference = args.reference;
    if (args.carrier_accounts) {
      shipment.carrier_accounts = (args.carrier_accounts as string).split(',').map(id => ({ id: id.trim() }));
    }
    return this.epPost('/shipments', { shipment });
  }

  private async getShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    return this.epGet(`/shipments/${encodeURIComponent(args.shipment_id as string)}`);
  }

  private async listShipments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { page_size: String((args.page_size as number) ?? 20) };
    if (typeof args.purchased === 'boolean') params.purchased = String(args.purchased);
    if (args.before_id) params.before_id = args.before_id as string;
    if (args.after_id) params.after_id = args.after_id as string;
    if (args.start_datetime) params.start_datetime = args.start_datetime as string;
    if (args.end_datetime) params.end_datetime = args.end_datetime as string;
    return this.epGet('/shipments', params);
  }

  private async buyShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id || !args.rate_id) return { content: [{ type: 'text', text: 'shipment_id and rate_id are required' }], isError: true };
    const body: Record<string, unknown> = { rate: { id: args.rate_id } };
    if (typeof args.insurance === 'number') body.insurance = args.insurance;
    return this.epPost(`/shipments/${encodeURIComponent(args.shipment_id as string)}/buy`, body);
  }

  private async getRates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    return this.epPost(`/shipments/${encodeURIComponent(args.shipment_id as string)}/rates`, {});
  }

  private async createTracker(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracking_code) return { content: [{ type: 'text', text: 'tracking_code is required' }], isError: true };
    const tracker: Record<string, unknown> = { tracking_code: args.tracking_code };
    if (args.carrier) tracker.carrier = args.carrier;
    return this.epPost('/trackers', { tracker });
  }

  private async getTracker(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracker_id) return { content: [{ type: 'text', text: 'tracker_id is required' }], isError: true };
    return this.epGet(`/trackers/${encodeURIComponent(args.tracker_id as string)}`);
  }

  private async listTrackers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { page_size: String((args.page_size as number) ?? 30) };
    if (args.tracking_code) params.tracking_code = args.tracking_code as string;
    if (args.carrier) params.carrier = args.carrier as string;
    if (args.before_id) params.before_id = args.before_id as string;
    if (args.after_id) params.after_id = args.after_id as string;
    if (args.start_datetime) params.start_datetime = args.start_datetime as string;
    if (args.end_datetime) params.end_datetime = args.end_datetime as string;
    return this.epGet('/trackers', params);
  }

  private async createPickup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_ids || !args.address || !args.min_datetime || !args.max_datetime) {
      return { content: [{ type: 'text', text: 'shipment_ids, address, min_datetime, and max_datetime are required' }], isError: true };
    }
    const addrParsed = this.parseJson(args.address, 'address');
    if (!addrParsed.ok) return addrParsed.result;
    const shipments = (args.shipment_ids as string).split(',').map(id => ({ id: id.trim() }));
    const pickup: Record<string, unknown> = {
      address: addrParsed.data,
      shipments,
      min_datetime: args.min_datetime,
      max_datetime: args.max_datetime,
    };
    if (args.instructions) pickup.instructions = args.instructions;
    return this.epPost('/pickups', { pickup });
  }

  private async getPickup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pickup_id) return { content: [{ type: 'text', text: 'pickup_id is required' }], isError: true };
    return this.epGet(`/pickups/${encodeURIComponent(args.pickup_id as string)}`);
  }

  private async buyPickup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pickup_id || !args.carrier || !args.service) {
      return { content: [{ type: 'text', text: 'pickup_id, carrier, and service are required' }], isError: true };
    }
    return this.epPost(`/pickups/${encodeURIComponent(args.pickup_id as string)}/buy`, {
      carrier: args.carrier,
      service: args.service,
    });
  }

  private async cancelPickup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pickup_id) return { content: [{ type: 'text', text: 'pickup_id is required' }], isError: true };
    return this.epPost(`/pickups/${encodeURIComponent(args.pickup_id as string)}/cancel`, {});
  }

  private async createBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const batch: Record<string, unknown> = {};
    if (args.shipment_ids) {
      batch.shipments = (args.shipment_ids as string).split(',').map(id => ({ id: id.trim() }));
    }
    if (args.reference) batch.reference = args.reference;
    return this.epPost('/batches', { batch });
  }

  private async getBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.batch_id) return { content: [{ type: 'text', text: 'batch_id is required' }], isError: true };
    return this.epGet(`/batches/${encodeURIComponent(args.batch_id as string)}`);
  }

  private async listBatches(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = { page_size: String((args.page_size as number) ?? 20) };
    if (args.before_id) params.before_id = args.before_id as string;
    return this.epGet('/batches', params);
  }

  private async addShipmentsToBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.batch_id || !args.shipment_ids) {
      return { content: [{ type: 'text', text: 'batch_id and shipment_ids are required' }], isError: true };
    }
    const shipments = (args.shipment_ids as string).split(',').map(id => ({ id: id.trim() }));
    return this.epPost(`/batches/${encodeURIComponent(args.batch_id as string)}/add_shipments`, { shipments });
  }

  private async buyBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.batch_id) return { content: [{ type: 'text', text: 'batch_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.label_format) body.label_format = args.label_format;
    return this.epPost(`/batches/${encodeURIComponent(args.batch_id as string)}/buy`, body);
  }

  private async createCustomsInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.contents_type || !args.customs_items) {
      return { content: [{ type: 'text', text: 'contents_type and customs_items are required' }], isError: true };
    }
    const itemsParsed = this.parseJson(args.customs_items, 'customs_items');
    if (!itemsParsed.ok) return itemsParsed.result;
    const customs_info: Record<string, unknown> = {
      contents_type: args.contents_type,
      customs_items: itemsParsed.data,
    };
    if (args.eel_pfc) customs_info.eel_pfc = args.eel_pfc;
    if (args.contents_explanation) customs_info.contents_explanation = args.contents_explanation;
    if (args.restriction_type) customs_info.restriction_type = args.restriction_type;
    if (args.non_delivery_option) customs_info.non_delivery_option = args.non_delivery_option;
    return this.epPost('/customs_infos', { customs_info });
  }

  private async listCarriers(): Promise<ToolResult> {
    return this.epGet('/carrier_accounts');
  }
}
