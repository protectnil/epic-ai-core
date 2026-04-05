/**
 * project44 MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official project44 MCP server was found on GitHub or the project44 developer portal.
//
// Base URL: https://na12.api.project44.com (NA region); EU: https://eu12.api.project44.com
// Auth: OAuth2 client credentials — POST /api/v4/oauth2/token, Bearer token in Authorization header
// Docs: https://developers.project44.com/api-reference
// Rate limits: Not publicly documented; contact project44 for tenant-level limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Project44Config {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class Project44MCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: Project44Config) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://na12.api.project44.com';
  }

  static catalog() {
    return {
      name: 'project44',
      displayName: 'project44',
      version: '1.0.0',
      category: 'misc',
      keywords: ['project44', 'supply chain', 'logistics', 'freight', 'shipment tracking', 'LTL', 'truckload', 'ocean', 'visibility', 'ETA'],
      toolNames: [
        'create_ltl_shipment', 'get_ltl_shipment', 'delete_ltl_shipment',
        'create_truckload_shipment', 'get_truckload_shipment', 'update_truckload_shipment', 'delete_truckload_shipment',
        'create_ocean_shipment', 'get_ocean_shipment',
        'create_parcel_shipment',
      ],
      description: 'project44 supply chain visibility: track LTL, truckload, ocean, and parcel shipments with real-time location and predictive ETA.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'create_ltl_shipment',
        description: 'Start tracking an LTL (less-than-truckload) shipment by carrier and reference numbers',
        inputSchema: {
          type: 'object',
          properties: {
            carrier_scac: { type: 'string', description: 'Carrier SCAC code (e.g. FXFE for FedEx Freight)' },
            tracking_number: { type: 'string', description: 'Carrier PRO number or bill of lading number' },
            shipper_reference: { type: 'string', description: 'Optional shipper reference number for identification' },
            pickup_date: { type: 'string', description: 'Shipment pickup date in YYYY-MM-DD format' },
          },
          required: ['carrier_scac', 'tracking_number'],
        },
      },
      {
        name: 'get_ltl_shipment',
        description: 'Get current tracking status and location updates for an LTL shipment by tracking ID',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_id: { type: 'string', description: 'project44 LTL tracking ID returned when the shipment was created' },
          },
          required: ['tracking_id'],
        },
      },
      {
        name: 'delete_ltl_shipment',
        description: 'Stop tracking an LTL shipment and remove it from active tracking',
        inputSchema: {
          type: 'object',
          properties: {
            tracking_id: { type: 'string', description: 'project44 LTL tracking ID to stop tracking' },
          },
          required: ['tracking_id'],
        },
      },
      {
        name: 'create_truckload_shipment',
        description: 'Initialize truckload shipment tracking with carrier, driver, and equipment details',
        inputSchema: {
          type: 'object',
          properties: {
            carrier_dot_number: { type: 'string', description: 'Carrier USDOT number' },
            carrier_scac: { type: 'string', description: 'Carrier SCAC code (alternative to DOT number)' },
            pro_number: { type: 'string', description: 'Pro number or load reference number' },
            shipper_reference_number: { type: 'string', description: 'Shipper load number or reference' },
            pickup_date: { type: 'string', description: 'Scheduled pickup date in YYYY-MM-DD format' },
            destination_city: { type: 'string', description: 'Destination city name' },
            destination_state: { type: 'string', description: 'Destination state code (e.g. TX, CA)' },
            destination_postal_code: { type: 'string', description: 'Destination ZIP/postal code' },
          },
          required: ['pro_number'],
        },
      },
      {
        name: 'get_truckload_shipment',
        description: 'Get real-time location, predictive ETA, and status for a tracked truckload shipment',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: { type: 'string', description: 'project44 truckload shipment ID' },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'update_truckload_shipment',
        description: 'Update stop information or destination details for an active truckload shipment',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: { type: 'string', description: 'project44 truckload shipment ID' },
            destination_city: { type: 'string', description: 'Updated destination city' },
            destination_state: { type: 'string', description: 'Updated destination state code' },
            destination_postal_code: { type: 'string', description: 'Updated destination ZIP/postal code' },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'delete_truckload_shipment',
        description: 'Cancel tracking for a truckload shipment and remove it from active monitoring',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: { type: 'string', description: 'project44 truckload shipment ID to cancel' },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'create_ocean_shipment',
        description: 'Start tracking an ocean freight shipment by container number, bill of lading, or booking reference',
        inputSchema: {
          type: 'object',
          properties: {
            container_number: { type: 'string', description: 'ISO container number (e.g. MSCU1234567)' },
            bill_of_lading: { type: 'string', description: 'Bill of lading number (alternative to container number)' },
            carrier_scac: { type: 'string', description: 'Ocean carrier SCAC code (e.g. MSCU for MSC, MAEU for Maersk)' },
            booking_number: { type: 'string', description: 'Carrier booking/confirmation number' },
          },
        },
      },
      {
        name: 'get_ocean_shipment',
        description: 'Get current port status, vessel location, and ETA for a tracked ocean freight shipment by shipment ID',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: { type: 'string', description: 'project44 ocean shipment ID' },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'create_parcel_shipment',
        description: 'Initialize tracking for a parcel shipment by carrier SCAC and tracking number; returns a shipment ID for subsequent status lookups',
        inputSchema: {
          type: 'object',
          properties: {
            carrier_scac: { type: 'string', description: 'Parcel carrier SCAC (e.g. UPSN, FDXG, USPS)' },
            tracking_number: { type: 'string', description: 'Carrier parcel tracking number' },
          },
          required: ['carrier_scac', 'tracking_number'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_ltl_shipment': return this.createLtlShipment(args);
        case 'get_ltl_shipment': return this.getLtlShipment(args);
        case 'delete_ltl_shipment': return this.deleteLtlShipment(args);
        case 'create_truckload_shipment': return this.createTruckloadShipment(args);
        case 'get_truckload_shipment': return this.getTruckloadShipment(args);
        case 'update_truckload_shipment': return this.updateTruckloadShipment(args);
        case 'delete_truckload_shipment': return this.deleteTruckloadShipment(args);
        case 'create_ocean_shipment': return this.createOceanShipment(args);
        case 'get_ocean_shipment': return this.getOceanShipment(args);
        case 'create_parcel_shipment': return this.createParcelShipment(args);
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
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;

    const response = await this.fetchWithRetry(`${this.baseUrl}/api/v4/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!response.ok) throw new Error(`OAuth2 token request failed: ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async put(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }], isError: false };
  }

  private async createLtlShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.carrier_scac || !args.tracking_number) return { content: [{ type: 'text', text: 'carrier_scac and tracking_number are required' }], isError: true };
    const body: Record<string, unknown> = {
      carrierIdentifier: { type: 'SCAC', value: args.carrier_scac },
      identifiers: [{ type: 'PRO', value: args.tracking_number }],
    };
    if (args.shipper_reference) (body.identifiers as unknown[]).push({ type: 'SHIPPER_REFERENCE', value: args.shipper_reference });
    if (args.pickup_date) body.pickupDate = args.pickup_date;
    return this.post('/api/v4/ltl/trackedshipments', body);
  }

  private async getLtlShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracking_id) return { content: [{ type: 'text', text: 'tracking_id is required' }], isError: true };
    return this.get(`/api/v4/ltl/trackedshipments/${encodeURIComponent(args.tracking_id as string)}`);
  }

  private async deleteLtlShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tracking_id) return { content: [{ type: 'text', text: 'tracking_id is required' }], isError: true };
    return this.del(`/api/v4/ltl/trackedshipments/${encodeURIComponent(args.tracking_id as string)}`);
  }

  private async createTruckloadShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pro_number) return { content: [{ type: 'text', text: 'pro_number is required' }], isError: true };
    const body: Record<string, unknown> = {
      identifiers: [{ type: 'PRO_NUMBER', value: args.pro_number }],
    };
    if (args.carrier_dot_number) body.carrierIdentifier = { type: 'DOT_NUMBER', value: args.carrier_dot_number };
    else if (args.carrier_scac) body.carrierIdentifier = { type: 'SCAC', value: args.carrier_scac };
    if (args.shipper_reference_number) (body.identifiers as unknown[]).push({ type: 'SHIPPER_REF', value: args.shipper_reference_number });
    if (args.pickup_date) body.pickupDate = args.pickup_date;
    if (args.destination_city || args.destination_state || args.destination_postal_code) {
      body.destination = {
        city: args.destination_city,
        state: args.destination_state,
        postalCode: args.destination_postal_code,
        country: 'US',
      };
    }
    return this.post('/api/v4/tl/shipments', body);
  }

  private async getTruckloadShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    return this.get(`/api/v4/tl/shipments/${encodeURIComponent(args.shipment_id as string)}`);
  }

  private async updateTruckloadShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.destination_city || args.destination_state || args.destination_postal_code) {
      body.destination = {
        city: args.destination_city,
        state: args.destination_state,
        postalCode: args.destination_postal_code,
        country: 'US',
      };
    }
    return this.put(`/api/v4/tl/shipments/${encodeURIComponent(args.shipment_id as string)}`, body);
  }

  private async deleteTruckloadShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    return this.del(`/api/v4/tl/shipments/${encodeURIComponent(args.shipment_id as string)}`);
  }

  private async createOceanShipment(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { identifiers: [] };
    if (args.container_number) (body.identifiers as unknown[]).push({ type: 'CONTAINER_NUMBER', value: args.container_number });
    if (args.bill_of_lading) (body.identifiers as unknown[]).push({ type: 'BILL_OF_LADING', value: args.bill_of_lading });
    if (args.booking_number) (body.identifiers as unknown[]).push({ type: 'BOOKING_NUMBER', value: args.booking_number });
    if (args.carrier_scac) body.carrierIdentifier = { type: 'SCAC', value: args.carrier_scac };
    return this.post('/api/v4/ocean/shipments', body);
  }

  private async getOceanShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    return this.get(`/api/v4/ocean/shipments/${encodeURIComponent(args.shipment_id as string)}/statuses`);
  }

  private async createParcelShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.carrier_scac || !args.tracking_number) return { content: [{ type: 'text', text: 'carrier_scac and tracking_number are required' }], isError: true };
    return this.post('/api/v4/parcel/shipments', {
      carrierIdentifier: { type: 'SCAC', value: args.carrier_scac },
      identifiers: [{ type: 'TRACKING_NUMBER', value: args.tracking_number }],
    });
  }
}
