/**
 * Flexport MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Flexport MCP server was found on GitHub or npm.
//
// Base URL: https://api.flexport.com
// Auth: OAuth2 client credentials — POST /oauth/token with JSON body:
//       {client_id, client_secret, audience:"https://api.flexport.com", grant_type:"client_credentials"}
//       Returns a Bearer token (JWT) with 24-hour lifespan. Max 10 token requests/day.
// Docs: https://apidocs.flexport.com/v3/ | https://developers.flexport.com/
// Rate limits: Not publicly documented; Flexport recommends exponential backoff on 429.
// Note: create_purchase_order and update_purchase_order use API v3 (POST semantics).
//       update_purchase_order is POST /v3/purchase_orders/{id} (full-replace), not PATCH.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface FlexportConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class FlexportMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: FlexportConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.flexport.com';
  }

  static catalog() {
    return {
      name: 'flexport',
      displayName: 'Flexport',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'flexport', 'freight', 'logistics', 'shipping', 'supply chain', 'cargo',
        'ocean', 'air freight', 'customs', 'booking', 'shipment', 'purchase order',
        'container', 'trade', 'import', 'export', 'global logistics', 'forwarder',
      ],
      toolNames: [
        'list_shipments',
        'get_shipment',
        'list_bookings',
        'get_booking',
        'create_booking',
        'list_booking_line_items',
        'list_purchase_orders',
        'get_purchase_order',
        'create_purchase_order',
        'update_purchase_order',
        'list_documents',
        'get_document',
        'list_commercial_invoices',
        'get_commercial_invoice',
        'list_customs_entries',
        'get_customs_entry',
        'list_products',
        'get_product',
      ],
      description: 'Flexport global freight and logistics: manage shipments, bookings, purchase orders, documents, customs entries, and commercial invoices.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_shipments',
        description: 'List all Flexport shipments with optional filters for status, transport mode, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by shipment status: pre_booked, booked, in_transit, arrived, delivered (optional)',
            },
            transport_mode: {
              type: 'string',
              description: 'Filter by mode: ocean, air, truck, rail (optional)',
            },
            per: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_shipment',
        description: 'Retrieve detailed information about a specific Flexport shipment by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'number',
              description: 'Numeric Flexport shipment ID',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'list_bookings',
        description: 'List all freight bookings with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            per: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_booking',
        description: 'Retrieve detailed information about a specific Flexport booking by ID',
        inputSchema: {
          type: 'object',
          properties: {
            booking_id: {
              type: 'number',
              description: 'Numeric Flexport booking ID',
            },
          },
          required: ['booking_id'],
        },
      },
      {
        name: 'create_booking',
        description: 'Create a new freight booking in Flexport with cargo, route, and incoterm details',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Internal reference name for the booking',
            },
            incoterm: {
              type: 'string',
              description: 'Trade incoterm: EXW, FOB, CFR, CIF, DAP, DDP (required)',
            },
            transport_mode: {
              type: 'string',
              description: 'Transport mode: ocean, air, truck, rail',
            },
            origin_port: {
              type: 'string',
              description: 'UN/LOCODE of origin port (e.g. CNSHA for Shanghai)',
            },
            destination_port: {
              type: 'string',
              description: 'UN/LOCODE of destination port (e.g. USLAX for Los Angeles)',
            },
            cargo_ready_date: {
              type: 'string',
              description: 'Date cargo is ready to ship in ISO 8601 format (YYYY-MM-DD)',
            },
          },
          required: ['incoterm'],
        },
      },
      {
        name: 'list_booking_line_items',
        description: 'List line items (cargo details) associated with a specific booking',
        inputSchema: {
          type: 'object',
          properties: {
            booking_id: {
              type: 'number',
              description: 'Booking ID to list line items for',
            },
          },
          required: ['booking_id'],
        },
      },
      {
        name: 'list_purchase_orders',
        description: 'List all purchase orders with optional status and supplier filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by PO status: open, in_progress, completed, cancelled (optional)',
            },
            per: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_purchase_order',
        description: 'Retrieve detailed information about a specific purchase order by ID',
        inputSchema: {
          type: 'object',
          properties: {
            purchase_order_id: {
              type: 'number',
              description: 'Numeric Flexport purchase order ID',
            },
          },
          required: ['purchase_order_id'],
        },
      },
      {
        name: 'create_purchase_order',
        description: 'Create a new purchase order in Flexport for supply chain tracking',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'PO number or reference name',
            },
            buyer_entity_id: {
              type: 'number',
              description: 'Flexport entity ID of the buyer',
            },
            seller_entity_id: {
              type: 'number',
              description: 'Flexport entity ID of the seller/supplier',
            },
            incoterm: {
              type: 'string',
              description: 'Trade incoterm: EXW, FOB, CFR, CIF, DAP, DDP',
            },
            expected_departure_date: {
              type: 'string',
              description: 'Expected cargo departure date in ISO 8601 format (YYYY-MM-DD)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_purchase_order',
        description: 'Update an existing purchase order status or details in Flexport',
        inputSchema: {
          type: 'object',
          properties: {
            purchase_order_id: {
              type: 'number',
              description: 'Numeric Flexport purchase order ID to update',
            },
            status: {
              type: 'string',
              description: 'New PO status: open, in_progress, completed, cancelled',
            },
            expected_departure_date: {
              type: 'string',
              description: 'Updated expected departure date in ISO 8601 format',
            },
          },
          required: ['purchase_order_id'],
        },
      },
      {
        name: 'list_documents',
        description: 'List all documents associated with a shipment such as bills of lading, packing lists, and invoices',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'number',
              description: 'Flexport shipment ID to list documents for',
            },
            document_type: {
              type: 'string',
              description: 'Filter by document type: bill_of_lading, packing_list, commercial_invoice, certificate_of_origin (optional)',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'get_document',
        description: 'Retrieve metadata and download URL for a specific Flexport document by ID',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: {
              type: 'number',
              description: 'Numeric Flexport document ID',
            },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'list_commercial_invoices',
        description: 'List commercial invoices associated with a shipment for customs clearance',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'number',
              description: 'Flexport shipment ID to list commercial invoices for',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'get_commercial_invoice',
        description: 'Retrieve a specific commercial invoice by ID including line items and declared values',
        inputSchema: {
          type: 'object',
          properties: {
            commercial_invoice_id: {
              type: 'number',
              description: 'Numeric Flexport commercial invoice ID',
            },
          },
          required: ['commercial_invoice_id'],
        },
      },
      {
        name: 'list_customs_entries',
        description: 'List customs entries for a shipment including entry numbers and clearance status',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'number',
              description: 'Flexport shipment ID to list customs entries for',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'get_customs_entry',
        description: 'Retrieve detailed information about a specific customs entry including duties and fees',
        inputSchema: {
          type: 'object',
          properties: {
            customs_entry_id: {
              type: 'number',
              description: 'Numeric Flexport customs entry ID',
            },
          },
          required: ['customs_entry_id'],
        },
      },
      {
        name: 'list_products',
        description: 'List products (commodity records) in the Flexport product catalog with HS codes and descriptions',
        inputSchema: {
          type: 'object',
          properties: {
            per: {
              type: 'number',
              description: 'Results per page (default: 20, max: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Retrieve a specific product record by ID including HS code, country of origin, and valuation',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'number',
              description: 'Numeric Flexport product ID',
            },
          },
          required: ['product_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_shipments':
          return this.listShipments(args);
        case 'get_shipment':
          return this.getShipment(args);
        case 'list_bookings':
          return this.listBookings(args);
        case 'get_booking':
          return this.getBooking(args);
        case 'create_booking':
          return this.createBooking(args);
        case 'list_booking_line_items':
          return this.listBookingLineItems(args);
        case 'list_purchase_orders':
          return this.listPurchaseOrders(args);
        case 'get_purchase_order':
          return this.getPurchaseOrder(args);
        case 'create_purchase_order':
          return this.createPurchaseOrder(args);
        case 'update_purchase_order':
          return this.updatePurchaseOrder(args);
        case 'list_documents':
          return this.listDocuments(args);
        case 'get_document':
          return this.getDocument(args);
        case 'list_commercial_invoices':
          return this.listCommercialInvoices(args);
        case 'get_commercial_invoice':
          return this.getCommercialInvoice(args);
        case 'list_customs_entries':
          return this.listCustomsEntries(args);
        case 'get_customs_entry':
          return this.getCustomsEntry(args);
        case 'list_products':
          return this.listProducts(args);
        case 'get_product':
          return this.getProduct(args);
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: this.baseUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    // Flexport tokens live 24h; refresh 60s early
    this.tokenExpiry = now + ((data.expires_in ?? 86400) - 60) * 1000;
    return this.bearerToken;
  }


  private async apiGet(path: string): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Flexport-Version': '2',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>, version = '2'): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Flexport-Version': version,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }


  private async listShipments(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.status) params.set('f.shipment_status', args.status as string);
    if (args.transport_mode) params.set('f.transportation_mode', args.transport_mode as string);
    params.set('per', String((args.per as number) || 20));
    params.set('page', String((args.page as number) || 1));
    return this.apiGet(`/v2/shipments?${params.toString()}`);
  }

  private async getShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) {
      return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/shipments/${encodeURIComponent(args.shipment_id as string)}`);
  }

  private async listBookings(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      per: String((args.per as number) || 20),
      page: String((args.page as number) || 1),
    });
    return this.apiGet(`/v2/bookings?${params.toString()}`);
  }

  private async getBooking(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.booking_id) {
      return { content: [{ type: 'text', text: 'booking_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/bookings/${encodeURIComponent(args.booking_id as string)}`);
  }

  private async createBooking(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.incoterm) {
      return { content: [{ type: 'text', text: 'incoterm is required' }], isError: true };
    }
    const body: Record<string, unknown> = { incoterm: args.incoterm };
    if (args.name) body.name = args.name;
    if (args.transport_mode) body.transportation_mode = args.transport_mode;
    if (args.origin_port) body.origin_port = { id: args.origin_port };
    if (args.destination_port) body.destination_port = { id: args.destination_port };
    if (args.cargo_ready_date) body.cargo_ready_date = args.cargo_ready_date;
    return this.apiPost('/v2/bookings', body);
  }

  private async listBookingLineItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.booking_id) {
      return { content: [{ type: 'text', text: 'booking_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/booking_line_items?f.booking_id=${encodeURIComponent(args.booking_id as string)}`);
  }

  private async listPurchaseOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      per: String((args.per as number) || 20),
      page: String((args.page as number) || 1),
    });
    if (args.status) params.set('f.status', args.status as string);
    return this.apiGet(`/v2/purchase_orders?${params.toString()}`);
  }

  private async getPurchaseOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.purchase_order_id) {
      return { content: [{ type: 'text', text: 'purchase_order_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/purchase_orders/${encodeURIComponent(args.purchase_order_id as string)}`);
  }

  private async createPurchaseOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) {
      return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    }
    // Flexport v3 API: POST /v3/purchase_orders (create, or update if PO exists with same name)
    const body: Record<string, unknown> = { name: args.name };
    if (args.incoterm) body.incoterm = args.incoterm;
    if (args.expected_departure_date) body.expected_departure_date = args.expected_departure_date;
    if (args.buyer_entity_id) body.buyer = { id: args.buyer_entity_id };
    if (args.seller_entity_id) body.seller = { id: args.seller_entity_id };
    return this.apiPost('/v3/purchase_orders', body, '3');
  }

  private async updatePurchaseOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.purchase_order_id) {
      return { content: [{ type: 'text', text: 'purchase_order_id is required' }], isError: true };
    }
    // Flexport v3 API: update is a full-replace POST (not PATCH) to /v3/purchase_orders/{id}
    const body: Record<string, unknown> = {};
    if (args.status) body.status = args.status;
    if (args.expected_departure_date) body.expected_departure_date = args.expected_departure_date;
    return this.apiPost(`/v3/purchase_orders/${encodeURIComponent(args.purchase_order_id as string)}`, body, '3');
  }

  private async listDocuments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) {
      return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    }
    const params = new URLSearchParams({ 'f.shipment_id': String(args.shipment_id) });
    if (args.document_type) params.set('f.document_type', args.document_type as string);
    return this.apiGet(`/v2/documents?${params.toString()}`);
  }

  private async getDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.document_id) {
      return { content: [{ type: 'text', text: 'document_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/documents/${encodeURIComponent(args.document_id as string)}`);
  }

  private async listCommercialInvoices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) {
      return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/commercial_invoices?f.shipment_id=${encodeURIComponent(args.shipment_id as string)}`);
  }

  private async getCommercialInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.commercial_invoice_id) {
      return { content: [{ type: 'text', text: 'commercial_invoice_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/commercial_invoices/${encodeURIComponent(args.commercial_invoice_id as string)}`);
  }

  private async listCustomsEntries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) {
      return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/customs_entries?f.shipment_id=${encodeURIComponent(args.shipment_id as string)}`);
  }

  private async getCustomsEntry(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customs_entry_id) {
      return { content: [{ type: 'text', text: 'customs_entry_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/customs_entries/${encodeURIComponent(args.customs_entry_id as string)}`);
  }

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams({
      per: String((args.per as number) || 20),
      page: String((args.page as number) || 1),
    });
    return this.apiGet(`/v2/products?${params.toString()}`);
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) {
      return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    }
    return this.apiGet(`/v2/products/${encodeURIComponent(args.product_id as string)}`);
  }
}
