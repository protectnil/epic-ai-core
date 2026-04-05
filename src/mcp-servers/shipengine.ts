/**
 * ShipEngine MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. ShipEngine has not published an official MCP server.
//
// Base URL: https://api.shipengine.com
// Auth: API Key — API-Key: <api_key> header
// Docs: https://www.shipengine.com/docs/
// Rate limits: Not publicly documented per endpoint. ShipEngine enforces per-account limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ShipEngineConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ShipEngineMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ShipEngineConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.shipengine.com';
  }

  static catalog() {
    return {
      name: 'shipengine',
      displayName: 'ShipEngine',
      version: '1.0.0',
      category: 'logistics' as const,
      keywords: [
        'shipengine', 'shipping', 'label', 'carrier', 'rate', 'tracking', 'shipment',
        'address validation', 'manifest', 'logistics', 'fulfillment', 'package',
      ],
      toolNames: [
        'validate_address',
        'parse_address',
        'list_carriers',
        'get_carrier',
        'list_carrier_services',
        'calculate_rates',
        'estimate_rates',
        'create_label',
        'get_label',
        'void_label',
        'create_return_label',
        'track_label',
        'list_shipments',
        'create_shipment',
        'get_shipment',
        'cancel_shipment',
        'list_package_types',
        'create_package_type',
      ],
      description:
        'Manage shipping across all major carriers via ShipEngine: validate addresses, ' +
        'compare rates, purchase labels, track packages, manage shipments, and create manifests.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Address ───────────────────────────────────────────────────────────
      {
        name: 'validate_address',
        description:
          'Validate one or more mailing addresses. Returns normalized addresses and validation status. ' +
          'Supports addresses worldwide including US, Canada, UK, Australia, and 160+ countries.',
        inputSchema: {
          type: 'object',
          properties: {
            addresses: {
              type: 'array',
              description: 'Array of address objects to validate (required)',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Recipient name' },
                  company_name: { type: 'string', description: 'Company name' },
                  address_line1: { type: 'string', description: 'Street address line 1 (required)' },
                  address_line2: { type: 'string', description: 'Street address line 2' },
                  city_locality: { type: 'string', description: 'City or locality (required)' },
                  state_province: { type: 'string', description: 'State, province, or region' },
                  postal_code: { type: 'string', description: 'Postal or ZIP code' },
                  country_code: { type: 'string', description: 'ISO 3166-1 alpha-2 country code (required, e.g. "US")' },
                },
              },
            },
          },
          required: ['addresses'],
        },
      },
      {
        name: 'parse_address',
        description:
          'Parse a single-line or loosely formatted address string into structured fields. ' +
          'Useful for cleaning free-text address input.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The unstructured address string to parse (required)',
            },
          },
          required: ['text'],
        },
      },
      // ── Carriers ──────────────────────────────────────────────────────────
      {
        name: 'list_carriers',
        description: 'List all carrier accounts connected to your ShipEngine account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_carrier',
        description: 'Get details for a specific carrier account by carrier ID.',
        inputSchema: {
          type: 'object',
          properties: {
            carrier_id: {
              type: 'string',
              description: 'The ShipEngine carrier ID (e.g. "se-28529731")',
            },
          },
          required: ['carrier_id'],
        },
      },
      {
        name: 'list_carrier_services',
        description: 'List all available shipping services for a given carrier.',
        inputSchema: {
          type: 'object',
          properties: {
            carrier_id: {
              type: 'string',
              description: 'The ShipEngine carrier ID',
            },
          },
          required: ['carrier_id'],
        },
      },
      // ── Rates ─────────────────────────────────────────────────────────────
      {
        name: 'calculate_rates',
        description:
          'Calculate shipping rates for a fully specified shipment across one or more carriers. ' +
          'Returns rates sorted by price.',
        inputSchema: {
          type: 'object',
          properties: {
            shipment: {
              type: 'object',
              description: 'Full shipment details including ship_to, ship_from, and packages (required)',
            },
            rate_options: {
              type: 'object',
              description: 'Rate query options such as carrier_ids, service_codes, and package_types',
            },
          },
          required: ['shipment', 'rate_options'],
        },
      },
      {
        name: 'estimate_rates',
        description:
          'Estimate shipping rates with minimal address information (no full address required). ' +
          'Useful for checkout pages where the full address is not yet known.',
        inputSchema: {
          type: 'object',
          properties: {
            from_country_code: {
              type: 'string',
              description: 'Origin country code (e.g. "US")',
            },
            from_postal_code: {
              type: 'string',
              description: 'Origin postal code',
            },
            to_country_code: {
              type: 'string',
              description: 'Destination country code',
            },
            to_postal_code: {
              type: 'string',
              description: 'Destination postal code',
            },
            to_city_locality: {
              type: 'string',
              description: 'Destination city',
            },
            to_state_province: {
              type: 'string',
              description: 'Destination state or province',
            },
            weight: {
              type: 'object',
              description: 'Package weight with value and unit (e.g. { "value": 1.5, "unit": "pound" })',
            },
            dimensions: {
              type: 'object',
              description: 'Package dimensions with unit, length, width, height',
            },
            carrier_ids: {
              type: 'array',
              description: 'Carrier IDs to estimate rates for',
              items: { type: 'string' },
            },
          },
          required: ['from_country_code', 'from_postal_code', 'to_country_code', 'to_postal_code', 'weight'],
        },
      },
      // ── Labels ────────────────────────────────────────────────────────────
      {
        name: 'create_label',
        description:
          'Purchase a shipping label. Returns the label in the requested format (PDF, PNG, ZPL). ' +
          'Requires a full shipment spec with ship_to, ship_from, packages, and carrier/service.',
        inputSchema: {
          type: 'object',
          properties: {
            shipment: {
              type: 'object',
              description: 'Shipment details including ship_to, ship_from, packages, carrier_id, service_code (required)',
            },
            label_format: {
              type: 'string',
              description: 'Output format: pdf, png, or zpl (default: pdf)',
            },
            label_layout: {
              type: 'string',
              description: 'Label layout: 4x6 or letter (default: 4x6)',
            },
          },
          required: ['shipment'],
        },
      },
      {
        name: 'get_label',
        description: 'Retrieve a previously purchased label by label ID.',
        inputSchema: {
          type: 'object',
          properties: {
            label_id: {
              type: 'string',
              description: 'The ShipEngine label ID (e.g. "se-28529731")',
            },
          },
          required: ['label_id'],
        },
      },
      {
        name: 'void_label',
        description:
          'Void (cancel) a label by ID. Voided labels cannot be used for shipping. ' +
          'Refunds are subject to carrier policies.',
        inputSchema: {
          type: 'object',
          properties: {
            label_id: {
              type: 'string',
              description: 'The ShipEngine label ID to void',
            },
          },
          required: ['label_id'],
        },
      },
      {
        name: 'create_return_label',
        description: 'Create a return label for an existing outbound label.',
        inputSchema: {
          type: 'object',
          properties: {
            label_id: {
              type: 'string',
              description: 'The original outbound label ID to create a return for',
            },
            label_format: {
              type: 'string',
              description: 'Output format: pdf, png, or zpl (default: pdf)',
            },
          },
          required: ['label_id'],
        },
      },
      {
        name: 'track_label',
        description: 'Get tracking information for a label by label ID.',
        inputSchema: {
          type: 'object',
          properties: {
            label_id: {
              type: 'string',
              description: 'The ShipEngine label ID to track',
            },
          },
          required: ['label_id'],
        },
      },
      // ── Shipments ─────────────────────────────────────────────────────────
      {
        name: 'list_shipments',
        description: 'List shipments in your ShipEngine account with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_status: {
              type: 'string',
              description: 'Filter by status: pending, processing, label_purchased, cancelled',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (max 500, default: 25)',
            },
            sort_by: {
              type: 'string',
              description: 'Sort field: modified_at or created_at (default: modified_at)',
            },
            sort_dir: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
          },
        },
      },
      {
        name: 'create_shipment',
        description:
          'Create a new shipment record. Shipments can be used to get rates, purchase labels, ' +
          'or batch process labels later.',
        inputSchema: {
          type: 'object',
          properties: {
            shipments: {
              type: 'array',
              description: 'Array of shipment objects each with ship_to, ship_from, and packages (required)',
              items: { type: 'object' },
            },
          },
          required: ['shipments'],
        },
      },
      {
        name: 'get_shipment',
        description: 'Retrieve a specific shipment by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'string',
              description: 'The ShipEngine shipment ID (e.g. "se-28529731")',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'cancel_shipment',
        description: 'Cancel a shipment by ID. Only shipments in pending or processing status can be cancelled.',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'string',
              description: 'The ShipEngine shipment ID to cancel',
            },
          },
          required: ['shipment_id'],
        },
      },
      // ── Package Types ─────────────────────────────────────────────────────
      {
        name: 'list_package_types',
        description: 'List all custom package types defined in your ShipEngine account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_package_type',
        description: 'Create a custom package type (reusable box/envelope dimensions) for your account.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable name for the custom package type (required)',
            },
            description: {
              type: 'string',
              description: 'Optional description of the package type',
            },
            dimensions: {
              type: 'object',
              description: 'Package dimensions object with unit (inch or centimeter), length, width, height (required)',
            },
          },
          required: ['name', 'dimensions'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'validate_address':      return await this.validateAddress(args);
        case 'parse_address':         return await this.parseAddress(args);
        case 'list_carriers':         return await this.listCarriers();
        case 'get_carrier':           return await this.getCarrier(args);
        case 'list_carrier_services': return await this.listCarrierServices(args);
        case 'calculate_rates':       return await this.calculateRates(args);
        case 'estimate_rates':        return await this.estimateRates(args);
        case 'create_label':          return await this.createLabel(args);
        case 'get_label':             return await this.getLabel(args);
        case 'void_label':            return await this.voidLabel(args);
        case 'create_return_label':   return await this.createReturnLabel(args);
        case 'track_label':           return await this.trackLabel(args);
        case 'list_shipments':        return await this.listShipments(args);
        case 'create_shipment':       return await this.createShipment(args);
        case 'get_shipment':          return await this.getShipment(args);
        case 'cancel_shipment':       return await this.cancelShipment(args);
        case 'list_package_types':    return await this.listPackageTypes();
        case 'create_package_type':   return await this.createPackageType(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    return {
      'API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: this.buildHeaders(),
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await this.fetchWithRetry(url, init);

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{
          type: 'text',
          text: `ShipEngine API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}`,
        }],
        isError: true,
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (response.status === 204 || !contentType.includes('application/json')) {
      return { content: [{ type: 'text', text: `Success (HTTP ${response.status})` }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: `ShipEngine returned non-JSON response (HTTP ${response.status})` }],
        isError: true,
      };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Address ────────────────────────────────────────────────────────────────

  private async validateAddress(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/v1/addresses/validate', args.addresses);
  }

  private async parseAddress(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('PUT', '/v1/addresses/recognize', { text: args.text });
  }

  // ── Carriers ───────────────────────────────────────────────────────────────

  private async listCarriers(): Promise<ToolResult> {
    return this.request('GET', '/v1/carriers');
  }

  private async getCarrier(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/v1/carriers/${args.carrier_id}`);
  }

  private async listCarrierServices(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/v1/carriers/${args.carrier_id}/services`);
  }

  // ── Rates ──────────────────────────────────────────────────────────────────

  private async calculateRates(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/v1/rates', {
      shipment: args.shipment,
      rate_options: args.rate_options,
    });
  }

  private async estimateRates(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/v1/rates/estimate', args);
  }

  // ── Labels ─────────────────────────────────────────────────────────────────

  private async createLabel(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { shipment: args.shipment };
    if (args.label_format) body.label_format = args.label_format;
    if (args.label_layout) body.label_layout = args.label_layout;
    return this.request('POST', '/v1/labels', body);
  }

  private async getLabel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/v1/labels/${args.label_id}`);
  }

  private async voidLabel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('PUT', `/v1/labels/${args.label_id}/void`);
  }

  private async createReturnLabel(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.label_format) body.label_format = args.label_format;
    return this.request('POST', `/v1/labels/${args.label_id}/return`, body);
  }

  private async trackLabel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/v1/labels/${args.label_id}/track`);
  }

  // ── Shipments ──────────────────────────────────────────────────────────────

  private async listShipments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.shipment_status) params.set('shipment_status', String(args.shipment_status));
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('page_size', String(args.page_size));
    if (args.sort_by) params.set('sort_by', String(args.sort_by));
    if (args.sort_dir) params.set('sort_dir', String(args.sort_dir));
    const qs = params.toString();
    return this.request('GET', `/v1/shipments${qs ? '?' + qs : ''}`);
  }

  private async createShipment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', '/v1/shipments', { shipments: args.shipments });
  }

  private async getShipment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/v1/shipments/${args.shipment_id}`);
  }

  private async cancelShipment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('PUT', `/v1/shipments/${args.shipment_id}/cancel`);
  }

  // ── Package Types ──────────────────────────────────────────────────────────

  private async listPackageTypes(): Promise<ToolResult> {
    return this.request('GET', '/v1/packages');
  }

  private async createPackageType(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      name: args.name,
      dimensions: args.dimensions,
    };
    if (args.description) body.description = args.description;
    return this.request('POST', '/v1/packages', body);
  }
}
