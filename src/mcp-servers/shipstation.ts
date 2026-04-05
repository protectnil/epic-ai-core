/**
 * ShipStation MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official ShipStation MCP server found. CData publishes a community read-only MCP (github.com/CDataSoftware/shipstation-mcp-server-by-cdata)
// but it is a third-party JDBC wrapper, not officially maintained by ShipStation/Auctane. Fails criteria 1 and 2.
//
// Base URL: https://ssapi.shipstation.com
// Auth: Basic auth — Authorization: Basic base64(apiKey:apiSecret)
// Docs: https://docs.shipstation.com/
// Rate limits: 40 requests/minute per API Key+Secret pair. Headers: X-Rate-Limit-Limit,
//              X-Rate-Limit-Remaining, X-Rate-Limit-Reset. Returns 429 when exceeded.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ShipStationConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

export class ShipStationMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;

  constructor(config: ShipStationConfig) {
    super();
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl || 'https://ssapi.shipstation.com';
  }

  static catalog() {
    return {
      name: 'shipstation',
      displayName: 'ShipStation',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'shipstation', 'shipping', 'order', 'fulfillment', 'label', 'tracking', 'carrier',
        'warehouse', 'inventory', 'ecommerce', 'ups', 'fedex', 'usps', 'dhl', 'manifest',
      ],
      toolNames: [
        'list_orders', 'get_order', 'create_order', 'update_order', 'delete_order',
        'list_shipments', 'create_shipment_label', 'void_label',
        'get_rates', 'list_carriers', 'list_services', 'list_packages',
        'list_warehouses', 'get_warehouse', 'list_stores',
      ],
      description: 'ShipStation order and shipping management: create and manage orders, generate labels, get carrier rates, track shipments, and manage warehouses and stores.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_orders',
        description: 'List orders with optional filters for status, store, customer, date range, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            order_status: {
              type: 'string',
              description: 'Filter by order status: awaiting_payment, awaiting_shipment, shipped, on_hold, cancelled (optional)',
            },
            store_id: {
              type: 'number',
              description: 'Filter by store ID (optional)',
            },
            customer_name: {
              type: 'string',
              description: 'Filter by customer name (partial match, optional)',
            },
            order_number: {
              type: 'string',
              description: 'Filter by order number (exact or partial, optional)',
            },
            create_date_start: {
              type: 'string',
              description: 'Filter orders created after this date (YYYY-MM-DD, optional)',
            },
            create_date_end: {
              type: 'string',
              description: 'Filter orders created before this date (YYYY-MM-DD, optional)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100, max: 500)',
            },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Retrieve full details of a specific order by its ShipStation order ID',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'ShipStation order ID',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'create_order',
        description: 'Create a new order in ShipStation with customer, item, and shipping details',
        inputSchema: {
          type: 'object',
          properties: {
            order_number: {
              type: 'string',
              description: 'Unique order number (e.g. "ORD-1234")',
            },
            order_date: {
              type: 'string',
              description: 'Order date in ISO 8601 format (e.g. 2024-01-15T10:00:00)',
            },
            order_status: {
              type: 'string',
              description: 'Order status: awaiting_payment, awaiting_shipment, on_hold (default: awaiting_shipment)',
            },
            customer_username: {
              type: 'string',
              description: 'Customer username or email',
            },
            bill_to: {
              type: 'string',
              description: 'Billing address as JSON string with name, street1, city, state, postalCode, country',
            },
            ship_to: {
              type: 'string',
              description: 'Shipping address as JSON string with name, street1, city, state, postalCode, country',
            },
            items: {
              type: 'array',
              description: 'Order line items as array of objects with lineItemKey, sku, name, quantity, unitPrice',
            },
            amount_paid: {
              type: 'number',
              description: 'Total amount paid by customer',
            },
          },
          required: ['order_number', 'order_date', 'bill_to', 'ship_to', 'items'],
        },
      },
      {
        name: 'update_order',
        description: 'Update an existing ShipStation order by order ID — updates status, shipping info, or items',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'ShipStation order ID to update',
            },
            order_status: {
              type: 'string',
              description: 'New order status: awaiting_payment, awaiting_shipment, on_hold, cancelled (optional)',
            },
            ship_to: {
              type: 'string',
              description: 'Updated shipping address as JSON string (optional)',
            },
            items: {
              type: 'array',
              description: 'Updated line items array (optional)',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'delete_order',
        description: 'Delete an order from ShipStation by order ID. Cannot delete shipped orders.',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'ShipStation order ID to delete',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'list_shipments',
        description: 'List shipments with optional filters for order ID, tracking number, and date range',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'Filter by order ID (optional)',
            },
            tracking_number: {
              type: 'string',
              description: 'Filter by tracking number (optional)',
            },
            create_date_start: {
              type: 'string',
              description: 'Start date for shipment creation filter (YYYY-MM-DD, optional)',
            },
            create_date_end: {
              type: 'string',
              description: 'End date for shipment creation filter (YYYY-MM-DD, optional)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Results per page (default: 100, max: 500)',
            },
          },
        },
      },
      {
        name: 'create_shipment_label',
        description: 'Create a shipping label for an order by selecting carrier, service, and package type',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'Order ID to create a label for',
            },
            carrier_code: {
              type: 'string',
              description: 'Carrier code (e.g. fedex, ups, stamps_com, usps, dhl_express)',
            },
            service_code: {
              type: 'string',
              description: 'Service code (e.g. fedex_ground, ups_ground, usps_priority_mail)',
            },
            package_code: {
              type: 'string',
              description: 'Package code (e.g. package, medium_flat_rate_box)',
            },
            weight: {
              type: 'string',
              description: 'Package weight as JSON string: {"value": 2.5, "units": "pounds"}',
            },
            test_label: {
              type: 'boolean',
              description: 'Generate a test label (not charged, no tracking, default: false)',
            },
          },
          required: ['order_id', 'carrier_code', 'service_code', 'package_code', 'weight'],
        },
      },
      {
        name: 'void_label',
        description: 'Void (cancel) a shipping label by shipment ID to prevent charges',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'number',
              description: 'Shipment ID to void the label for',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'get_rates',
        description: 'Get available carrier rates for a shipment with weight, dimensions, and addresses',
        inputSchema: {
          type: 'object',
          properties: {
            carrier_code: {
              type: 'string',
              description: 'Carrier code to get rates from (e.g. fedex, ups, stamps_com)',
            },
            from_postal_code: {
              type: 'string',
              description: 'Origin postal code',
            },
            to_state: {
              type: 'string',
              description: 'Destination state code (e.g. CA)',
            },
            to_country: {
              type: 'string',
              description: 'Destination country code (e.g. US)',
            },
            to_postal_code: {
              type: 'string',
              description: 'Destination postal code',
            },
            weight: {
              type: 'string',
              description: 'Weight as JSON: {"value": 2.5, "units": "pounds"}',
            },
            dimensions: {
              type: 'string',
              description: 'Dimensions as JSON: {"units": "inches", "length": 10, "width": 8, "height": 4} (optional)',
            },
          },
          required: ['carrier_code', 'from_postal_code', 'to_state', 'to_country', 'to_postal_code', 'weight'],
        },
      },
      {
        name: 'list_carriers',
        description: 'List all carrier accounts connected to the ShipStation account with account details',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_services',
        description: 'List all available shipping services for a specific carrier',
        inputSchema: {
          type: 'object',
          properties: {
            carrier_code: {
              type: 'string',
              description: 'Carrier code to list services for (e.g. fedex, ups, stamps_com)',
            },
          },
          required: ['carrier_code'],
        },
      },
      {
        name: 'list_packages',
        description: 'List available package types for a specific carrier',
        inputSchema: {
          type: 'object',
          properties: {
            carrier_code: {
              type: 'string',
              description: 'Carrier code to list packages for (e.g. fedex, ups, stamps_com)',
            },
          },
          required: ['carrier_code'],
        },
      },
      {
        name: 'list_warehouses',
        description: 'List all warehouse locations configured in the ShipStation account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_warehouse',
        description: 'Get details for a specific warehouse by warehouse ID',
        inputSchema: {
          type: 'object',
          properties: {
            warehouse_id: {
              type: 'number',
              description: 'Warehouse ID from list_warehouses',
            },
          },
          required: ['warehouse_id'],
        },
      },
      {
        name: 'list_stores',
        description: 'List all connected sales channel stores with their marketplace and sync status',
        inputSchema: {
          type: 'object',
          properties: {
            show_inactive: {
              type: 'boolean',
              description: 'Include inactive stores in the results (default: false)',
            },
            marketplace_id: {
              type: 'number',
              description: 'Filter by marketplace ID (optional)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_orders':
          return this.listOrders(args);
        case 'get_order':
          return this.getOrder(args);
        case 'create_order':
          return this.createOrder(args);
        case 'update_order':
          return this.updateOrder(args);
        case 'delete_order':
          return this.deleteOrder(args);
        case 'list_shipments':
          return this.listShipments(args);
        case 'create_shipment_label':
          return this.createShipmentLabel(args);
        case 'void_label':
          return this.voidLabel(args);
        case 'get_rates':
          return this.getRates(args);
        case 'list_carriers':
          return this.listCarriers();
        case 'list_services':
          return this.listServices(args);
        case 'list_packages':
          return this.listPackages(args);
        case 'list_warehouses':
          return this.listWarehouses();
        case 'get_warehouse':
          return this.getWarehouse(args);
        case 'list_stores':
          return this.listStores(args);
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
    const credentials = btoa(`${this.apiKey}:${this.apiSecret}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 100),
    };
    if (args.order_status) params.orderStatus = args.order_status as string;
    if (args.store_id) params.storeId = String(args.store_id);
    if (args.customer_name) params.customerName = args.customer_name as string;
    if (args.order_number) params.orderNumber = args.order_number as string;
    if (args.create_date_start) params.createDateStart = args.create_date_start as string;
    if (args.create_date_end) params.createDateEnd = args.create_date_end as string;
    return this.get('/orders', params);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    return this.get(`/orders/${encodeURIComponent(args.order_id as string)}`);
  }

  private async createOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_number || !args.order_date || !args.bill_to || !args.ship_to || !args.items) {
      return { content: [{ type: 'text', text: 'order_number, order_date, bill_to, ship_to, and items are required' }], isError: true };
    }
    let billTo: unknown = args.bill_to;
    let shipTo: unknown = args.ship_to;
    try { billTo = JSON.parse(args.bill_to as string); } catch { /* use as-is */ }
    try { shipTo = JSON.parse(args.ship_to as string); } catch { /* use as-is */ }
    const body: Record<string, unknown> = {
      orderNumber: args.order_number,
      orderDate: args.order_date,
      orderStatus: (args.order_status as string) || 'awaiting_shipment',
      billTo,
      shipTo,
      items: args.items,
    };
    if (args.customer_username) body.customerUsername = args.customer_username;
    if (args.amount_paid !== undefined) body.amountPaid = args.amount_paid;
    return this.post('/orders/createorder', body);
  }

  private async updateOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    const body: Record<string, unknown> = { orderId: args.order_id };
    if (args.order_status) body.orderStatus = args.order_status;
    if (args.ship_to) {
      try { body.shipTo = JSON.parse(args.ship_to as string); } catch { body.shipTo = args.ship_to; }
    }
    if (args.items) body.items = args.items;
    return this.post('/orders/createorder', body);
  }

  private async deleteOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    return this.del(`/orders/${encodeURIComponent(args.order_id as string)}`);
  }

  private async listShipments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      pageSize: String((args.page_size as number) || 100),
    };
    if (args.order_id) params.orderId = String(args.order_id);
    if (args.tracking_number) params.trackingNumber = args.tracking_number as string;
    if (args.create_date_start) params.createDateStart = args.create_date_start as string;
    if (args.create_date_end) params.createDateEnd = args.create_date_end as string;
    return this.get('/shipments', params);
  }

  private async createShipmentLabel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id || !args.carrier_code || !args.service_code || !args.package_code || !args.weight) {
      return { content: [{ type: 'text', text: 'order_id, carrier_code, service_code, package_code, and weight are required' }], isError: true };
    }
    let weight: unknown = args.weight;
    try { weight = JSON.parse(args.weight as string); } catch { /* use as-is */ }
    const body: Record<string, unknown> = {
      orderId: args.order_id,
      carrierCode: args.carrier_code,
      serviceCode: args.service_code,
      packageCode: args.package_code,
      weight,
      testLabel: (args.test_label as boolean) ?? false,
    };
    return this.post('/orders/createlabelfororder', body);
  }

  private async voidLabel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipment_id) return { content: [{ type: 'text', text: 'shipment_id is required' }], isError: true };
    return this.post('/shipments/voidlabel', { shipmentId: args.shipment_id });
  }

  private async getRates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.carrier_code || !args.from_postal_code || !args.to_state || !args.to_country || !args.to_postal_code || !args.weight) {
      return { content: [{ type: 'text', text: 'carrier_code, from_postal_code, to_state, to_country, to_postal_code, and weight are required' }], isError: true };
    }
    let weight: unknown = args.weight;
    let dimensions: unknown = undefined;
    try { weight = JSON.parse(args.weight as string); } catch { /* use as-is */ }
    if (args.dimensions) {
      try { dimensions = JSON.parse(args.dimensions as string); } catch { dimensions = args.dimensions; }
    }
    const body: Record<string, unknown> = {
      carrierCode: args.carrier_code,
      fromPostalCode: args.from_postal_code,
      toState: args.to_state,
      toCountry: args.to_country,
      toPostalCode: args.to_postal_code,
      weight,
    };
    if (dimensions) body.dimensions = dimensions;
    return this.post('/shipments/getrates', body);
  }

  private async listCarriers(): Promise<ToolResult> {
    return this.get('/carriers');
  }

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.carrier_code) return { content: [{ type: 'text', text: 'carrier_code is required' }], isError: true };
    return this.get('/carriers/listservices', { carrierCode: args.carrier_code as string });
  }

  private async listPackages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.carrier_code) return { content: [{ type: 'text', text: 'carrier_code is required' }], isError: true };
    return this.get('/carriers/listpackages', { carrierCode: args.carrier_code as string });
  }

  private async listWarehouses(): Promise<ToolResult> {
    return this.get('/warehouses');
  }

  private async getWarehouse(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.warehouse_id) return { content: [{ type: 'text', text: 'warehouse_id is required' }], isError: true };
    return this.get(`/warehouses/${encodeURIComponent(args.warehouse_id as string)}`);
  }

  private async listStores(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (typeof args.show_inactive === 'boolean') params.showInactive = String(args.show_inactive);
    if (args.marketplace_id) params.marketplaceId = String(args.marketplace_id);
    return this.get('/stores', params);
  }
}
