/**
 * BrandLovers MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official BrandLovers MCP server was found on GitHub or the vendor site.
//
// Base URL: https://api.brandlovers.com/marketplace/v1
// Auth: API key passed in the `authorization` header
// Docs: https://raw.githubusercontent.com/brandlovers/marketplace-api-documentation/master/brandlovers-marketplace-api-v1.json
// Spec: https://api.apis.guru/v2/specs/brandlovers.com/1.0.0/swagger.json
// Rate limits: Not publicly documented; subject to seller SLA limits
//
// Category: marketing (marketplace seller operations — product catalog, orders, shipments, tickets)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BrandLoversConfig {
  apiKey: string;
  baseUrl?: string;
}

export class BrandLoversMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BrandLoversConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.brandlovers.com/marketplace/v1';
  }

  static catalog() {
    return {
      name: 'brandlovers',
      displayName: 'BrandLovers',
      version: '1.0.0',
      category: 'marketing',
      keywords: [
        'brandlovers', 'marketplace', 'seller', 'ecommerce', 'product', 'catalog',
        'order', 'shipment', 'ticket', 'customer', 'stock', 'price', 'sku',
        'fulfillment', 'delivery', 'tracking', 'return', 'refund', 'exchange',
        'support', 'retail',
      ],
      toolNames: [
        'list_products', 'get_product', 'create_product', 'update_product',
        'update_product_price', 'update_product_status', 'update_product_stock',
        'bulk_create_products', 'bulk_update_prices', 'bulk_update_stocks',
        'bulk_update_product_status', 'get_product_status',
        'list_products_selling',
        'get_order', 'list_orders',
        'list_orders_new', 'list_orders_approved', 'list_orders_sent',
        'list_orders_partially_sent', 'list_orders_delivered',
        'list_orders_partially_delivered', 'list_orders_canceled',
        'confirm_shipment_sent', 'confirm_shipment_delivered',
        'confirm_shipment_cancel', 'confirm_shipment_return',
        'confirm_shipment_exchange',
        'list_shipments_shipped', 'bulk_update_shipments_shipped',
        'list_shipments_delivered', 'bulk_update_shipments_delivered',
        'list_tickets', 'create_ticket',
        'get_ticket_messages', 'add_ticket_message', 'update_ticket_status',
      ],
      description: 'BrandLovers Marketplace seller API: manage product catalog (create, update, price, stock, status), receive and fulfill orders, track shipments, handle returns and exchanges, and manage customer support tickets.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Products ───────────────────────────────────────────────────────────
      {
        name: 'list_products',
        description: 'List all seller products loaded into the BrandLovers Marketplace with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset (number of items to skip)' },
            limit: { type: 'number', description: 'Maximum number of products to return' },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Get full details of a single product using the seller SKU ID (skuSellerId)',
        inputSchema: {
          type: 'object',
          properties: {
            skuSellerId: { type: 'string', description: "Seller's own SKU identifier for this product" },
          },
          required: ['skuSellerId'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a single new product listing in the BrandLovers Marketplace',
        inputSchema: {
          type: 'object',
          properties: {
            skuSellerId: { type: 'string', description: "Seller's own unique SKU for this product" },
            title: { type: 'string', description: 'Product title/name as it will appear on the marketplace' },
            description: { type: 'string', description: 'Full product description' },
            price: { type: 'number', description: 'Product price in BRL (Brazilian Real)' },
            stock: { type: 'number', description: 'Available inventory quantity' },
            category: { type: 'string', description: 'Product category path (e.g. "Electronics > Phones")' },
            brand: { type: 'string', description: 'Product brand name' },
            ean: { type: 'string', description: 'EAN/barcode of the product' },
            images: { type: 'string', description: 'Comma-separated URLs of product images' },
          },
          required: ['skuSellerId', 'title', 'price', 'stock'],
        },
      },
      {
        name: 'update_product',
        description: 'Update product details (title, description, images, attributes) for an existing SKU',
        inputSchema: {
          type: 'object',
          properties: {
            skuSellerId: { type: 'string', description: "Seller's SKU identifier of the product to update" },
            title: { type: 'string', description: 'Updated product title' },
            description: { type: 'string', description: 'Updated product description' },
            images: { type: 'string', description: 'Comma-separated URLs of product images' },
          },
          required: ['skuSellerId'],
        },
      },
      {
        name: 'update_product_price',
        description: "Update the price of a single product SKU in the seller's catalog",
        inputSchema: {
          type: 'object',
          properties: {
            skuSellerId: { type: 'string', description: "Seller's SKU identifier" },
            price: { type: 'number', description: 'New regular price in BRL' },
            promotionalPrice: { type: 'number', description: 'Optional promotional/sale price in BRL' },
          },
          required: ['skuSellerId', 'price'],
        },
      },
      {
        name: 'update_product_status',
        description: 'Enable or disable a single product listing in the BrandLovers Marketplace',
        inputSchema: {
          type: 'object',
          properties: {
            skuSellerId: { type: 'string', description: "Seller's SKU identifier" },
            status: { type: 'string', description: 'Product status: "enable" or "disable"' },
          },
          required: ['skuSellerId', 'status'],
        },
      },
      {
        name: 'update_product_stock',
        description: "Update the inventory/stock quantity for a single product SKU",
        inputSchema: {
          type: 'object',
          properties: {
            skuSellerId: { type: 'string', description: "Seller's SKU identifier" },
            stock: { type: 'number', description: 'New stock quantity (must be >= 0)' },
          },
          required: ['skuSellerId', 'stock'],
        },
      },
      {
        name: 'bulk_create_products',
        description: 'Load multiple new product definitions into the marketplace in a single request (JSON array as string)',
        inputSchema: {
          type: 'object',
          properties: {
            products: {
              type: 'string',
              description: 'JSON array string of product objects, each with skuSellerId, title, price, stock, and optional fields',
            },
          },
          required: ['products'],
        },
      },
      {
        name: 'bulk_update_prices',
        description: 'Bulk update prices for multiple product SKUs in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            prices: {
              type: 'string',
              description: 'JSON array string of objects with skuSellerId and price fields',
            },
          },
          required: ['prices'],
        },
      },
      {
        name: 'bulk_update_stocks',
        description: 'Bulk update stock quantities for multiple product SKUs in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            stocks: {
              type: 'string',
              description: 'JSON array string of objects with skuSellerId and stock fields',
            },
          },
          required: ['stocks'],
        },
      },
      {
        name: 'bulk_update_product_status',
        description: 'Bulk enable or disable multiple products in the marketplace simultaneously',
        inputSchema: {
          type: 'object',
          properties: {
            statuses: {
              type: 'string',
              description: 'JSON array string of objects with skuSellerId and status ("enable"/"disable") fields',
            },
          },
          required: ['statuses'],
        },
      },
      {
        name: 'get_product_status',
        description: 'Get the marketplace listing status (approved, pending, rejected) for all seller products',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max results to return' },
          },
        },
      },
      {
        name: 'list_products_selling',
        description: 'List products that are currently active and successfully listed for sale in the marketplace',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max results to return' },
          },
        },
      },
      // ── Orders ─────────────────────────────────────────────────────────────
      {
        name: 'get_order',
        description: 'Get full details of a single order including status, items, and shipment information',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'Unique order identifier' },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'list_orders',
        description: 'List all orders with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max orders to return' },
          },
        },
      },
      {
        name: 'list_orders_new',
        description: 'List orders with NEW status — freshly received orders awaiting seller action',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max orders to return' },
          },
        },
      },
      {
        name: 'list_orders_approved',
        description: 'List orders with APPROVED status — payment confirmed and awaiting fulfillment',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max orders to return' },
          },
        },
      },
      {
        name: 'list_orders_sent',
        description: 'List orders that have been fully shipped/sent to customers',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max orders to return' },
          },
        },
      },
      {
        name: 'list_orders_partially_sent',
        description: 'List orders that have been partially shipped (some items sent, some pending)',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max orders to return' },
          },
        },
      },
      {
        name: 'list_orders_delivered',
        description: 'List orders that have been successfully delivered to customers',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max orders to return' },
          },
        },
      },
      {
        name: 'list_orders_partially_delivered',
        description: 'List orders that have been partially delivered (some items delivered, some pending)',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max orders to return' },
          },
        },
      },
      {
        name: 'list_orders_canceled',
        description: 'List orders that have been canceled',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max orders to return' },
          },
        },
      },
      // ── Shipments ──────────────────────────────────────────────────────────
      {
        name: 'confirm_shipment_sent',
        description: 'Update an order with shipment information — mark items as shipped with carrier tracking details',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'Order ID to update with shipment info' },
            trackingNumber: { type: 'string', description: 'Carrier tracking number' },
            carrier: { type: 'string', description: 'Carrier/courier name (e.g. "Correios", "Fedex")' },
            items: {
              type: 'string',
              description: 'JSON array string of shipped item objects with skuSellerId and quantity',
            },
          },
          required: ['orderId', 'trackingNumber'],
        },
      },
      {
        name: 'confirm_shipment_delivered',
        description: 'Confirm that a shipment was delivered to the customer with the actual delivered quantity',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'Order ID' },
            items: {
              type: 'string',
              description: 'JSON array string of delivered item objects with skuSellerId and deliveredQuantity',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'confirm_shipment_cancel',
        description: 'Confirm shipment cancellation or failure to deliver — used when customer requests cancellation or delivery fails',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'Order ID' },
            reason: { type: 'string', description: 'Reason for cancellation or delivery failure' },
            items: {
              type: 'string',
              description: 'JSON array string of item objects with skuSellerId and quantity',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'confirm_shipment_return',
        description: 'Process a return and refund for order items — list all items with quantities to return',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'Order ID' },
            reason: { type: 'string', description: 'Reason for return' },
            items: {
              type: 'string',
              description: 'JSON array string of return item objects with skuSellerId and quantity',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'confirm_shipment_exchange',
        description: 'Confirm item exchange when a delivery fails or when requested by the customer via trouble ticket',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'Order ID' },
            reason: { type: 'string', description: 'Reason for exchange' },
            items: {
              type: 'string',
              description: 'JSON array string of exchange item objects with skuSellerId and quantity',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'list_shipments_shipped',
        description: 'List shipments that have been marked as shipped (in-transit)',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max results to return' },
          },
        },
      },
      {
        name: 'bulk_update_shipments_shipped',
        description: 'Bulk update multiple order shipments to shipped status in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            shipments: {
              type: 'string',
              description: 'JSON array string of shipment update objects with orderId and tracking info',
            },
          },
          required: ['shipments'],
        },
      },
      {
        name: 'list_shipments_delivered',
        description: 'List shipments that have been confirmed as delivered',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max results to return' },
          },
        },
      },
      {
        name: 'bulk_update_shipments_delivered',
        description: 'Bulk confirm multiple shipments as delivered in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            shipments: {
              type: 'string',
              description: 'JSON array string of delivery confirmation objects with orderId and delivered quantities',
            },
          },
          required: ['shipments'],
        },
      },
      // ── Customer Tickets ───────────────────────────────────────────────────
      {
        name: 'list_tickets',
        description: 'List all customer support trouble tickets associated with the seller account',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Max tickets to return' },
          },
        },
      },
      {
        name: 'create_ticket',
        description: 'Create a new customer support trouble ticket',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: { type: 'string', description: 'Order ID this ticket is related to' },
            subject: { type: 'string', description: 'Ticket subject/title' },
            message: { type: 'string', description: 'Initial message body for the ticket' },
            type: { type: 'string', description: 'Ticket type (e.g. "delivery_issue", "return_request", "exchange")' },
          },
          required: ['orderId', 'subject', 'message'],
        },
      },
      {
        name: 'get_ticket_messages',
        description: 'Get all messages in a trouble ticket thread by ticket ID',
        inputSchema: {
          type: 'object',
          properties: {
            ticketId: { type: 'string', description: 'Trouble ticket ID' },
          },
          required: ['ticketId'],
        },
      },
      {
        name: 'add_ticket_message',
        description: 'Add a new reply message to an existing customer trouble ticket',
        inputSchema: {
          type: 'object',
          properties: {
            ticketId: { type: 'string', description: 'Trouble ticket ID' },
            message: { type: 'string', description: 'Message text to add to the ticket thread' },
          },
          required: ['ticketId', 'message'],
        },
      },
      {
        name: 'update_ticket_status',
        description: 'Update the status of a trouble ticket (e.g. mark as resolved, in-progress, or closed)',
        inputSchema: {
          type: 'object',
          properties: {
            ticketId: { type: 'string', description: 'Trouble ticket ID' },
            status: { type: 'string', description: 'New ticket status (e.g. "open", "in_progress", "resolved", "closed")' },
          },
          required: ['ticketId', 'status'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_products':                   return this.listProducts(args);
        case 'get_product':                     return this.getProduct(args);
        case 'create_product':                  return this.createProduct(args);
        case 'update_product':                  return this.updateProduct(args);
        case 'update_product_price':            return this.updateProductPrice(args);
        case 'update_product_status':           return this.updateProductStatus(args);
        case 'update_product_stock':            return this.updateProductStock(args);
        case 'bulk_create_products':            return this.bulkCreateProducts(args);
        case 'bulk_update_prices':              return this.bulkUpdatePrices(args);
        case 'bulk_update_stocks':              return this.bulkUpdateStocks(args);
        case 'bulk_update_product_status':      return this.bulkUpdateProductStatus(args);
        case 'get_product_status':              return this.getProductStatus(args);
        case 'list_products_selling':           return this.listProductsSelling(args);
        case 'get_order':                       return this.getOrder(args);
        case 'list_orders':                     return this.listOrders(args);
        case 'list_orders_new':                 return this.listOrdersByStatus('new', args);
        case 'list_orders_approved':            return this.listOrdersByStatus('approved', args);
        case 'list_orders_sent':                return this.listOrdersByStatus('sent', args);
        case 'list_orders_partially_sent':      return this.listOrdersByStatus('partiallySent', args);
        case 'list_orders_delivered':           return this.listOrdersByStatus('delivered', args);
        case 'list_orders_partially_delivered': return this.listOrdersByStatus('partiallyDelivered', args);
        case 'list_orders_canceled':            return this.listOrdersByStatus('canceled', args);
        case 'confirm_shipment_sent':           return this.confirmShipmentSent(args);
        case 'confirm_shipment_delivered':      return this.confirmShipmentDelivered(args);
        case 'confirm_shipment_cancel':         return this.confirmShipmentCancel(args);
        case 'confirm_shipment_return':         return this.confirmShipmentReturn(args);
        case 'confirm_shipment_exchange':       return this.confirmShipmentExchange(args);
        case 'list_shipments_shipped':          return this.listShipmentsShipped(args);
        case 'bulk_update_shipments_shipped':   return this.bulkUpdateShipmentsShipped(args);
        case 'list_shipments_delivered':        return this.listShipmentsDelivered(args);
        case 'bulk_update_shipments_delivered': return this.bulkUpdateShipmentsDelivered(args);
        case 'list_tickets':                    return this.listTickets(args);
        case 'create_ticket':                   return this.createTicket(args);
        case 'get_ticket_messages':             return this.getTicketMessages(args);
        case 'add_ticket_message':              return this.addTicketMessage(args);
        case 'update_ticket_status':            return this.updateTicketStatus(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    return {
      authorization: this.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private pagingParams(args: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {};
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.limit !== undefined) params.limit = String(args.limit);
    return params;
  }

  private parseJsonArg(value: unknown, fieldName: string): unknown[] | ToolResult {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value as string);
      if (!Array.isArray(parsed)) {
        return { content: [{ type: 'text', text: `${fieldName} must be a JSON array` }], isError: true } as ToolResult;
      }
      return parsed;
    } catch {
      return { content: [{ type: 'text', text: `${fieldName} must be valid JSON` }], isError: true } as ToolResult;
    }
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: this.authHeaders,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown> | unknown[]): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    if (!text) return { content: [{ type: 'text', text: 'Success' }], isError: false };
    try {
      const data = JSON.parse(text);
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    } catch {
      return { content: [{ type: 'text', text: text }], isError: false };
    }
  }

  private async apiPut(path: string, body: Record<string, unknown> | unknown[]): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    if (!text) return { content: [{ type: 'text', text: 'Success' }], isError: false };
    try {
      const data = JSON.parse(text);
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    } catch {
      return { content: [{ type: 'text', text: text }], isError: false };
    }
  }

  // ── Product methods ────────────────────────────────────────────────────────

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/products', this.pagingParams(args));
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.skuSellerId) return { content: [{ type: 'text', text: 'skuSellerId is required' }], isError: true };
    return this.apiGet(`/product/${encodeURIComponent(args.skuSellerId as string)}`);
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.skuSellerId || !args.title || args.price === undefined || args.stock === undefined) {
      return { content: [{ type: 'text', text: 'skuSellerId, title, price, and stock are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      skuSellerId: args.skuSellerId,
      title: args.title,
      price: args.price,
      stock: args.stock,
    };
    if (args.description) body.description = args.description;
    if (args.category) body.category = args.category;
    if (args.brand) body.brand = args.brand;
    if (args.ean) body.ean = args.ean;
    if (args.images) body.images = (args.images as string).split(',').map((u: string) => u.trim());
    return this.apiPost('/product', body);
  }

  private async updateProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.skuSellerId) return { content: [{ type: 'text', text: 'skuSellerId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.description) body.description = args.description;
    if (args.images) body.images = (args.images as string).split(',').map((u: string) => u.trim());
    return this.apiPut(`/product/${encodeURIComponent(args.skuSellerId as string)}`, body);
  }

  private async updateProductPrice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.skuSellerId || args.price === undefined) {
      return { content: [{ type: 'text', text: 'skuSellerId and price are required' }], isError: true };
    }
    const body: Record<string, unknown> = { price: args.price };
    if (args.promotionalPrice !== undefined) body.promotionalPrice = args.promotionalPrice;
    return this.apiPut(`/product/${encodeURIComponent(args.skuSellerId as string)}/prices`, body);
  }

  private async updateProductStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.skuSellerId || !args.status) {
      return { content: [{ type: 'text', text: 'skuSellerId and status are required' }], isError: true };
    }
    return this.apiPut(`/product/${encodeURIComponent(args.skuSellerId as string)}/status`, { status: args.status });
  }

  private async updateProductStock(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.skuSellerId || args.stock === undefined) {
      return { content: [{ type: 'text', text: 'skuSellerId and stock are required' }], isError: true };
    }
    return this.apiPut(`/product/${encodeURIComponent(args.skuSellerId as string)}/stock`, { stock: args.stock });
  }

  private async bulkCreateProducts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.products) return { content: [{ type: 'text', text: 'products is required' }], isError: true };
    const parsed = this.parseJsonArg(args.products, 'products');
    if (!Array.isArray(parsed)) return parsed as ToolResult;
    return this.apiPost('/products', parsed);
  }

  private async bulkUpdatePrices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.prices) return { content: [{ type: 'text', text: 'prices is required' }], isError: true };
    const parsed = this.parseJsonArg(args.prices, 'prices');
    if (!Array.isArray(parsed)) return parsed as ToolResult;
    return this.apiPut('/products/prices', parsed);
  }

  private async bulkUpdateStocks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.stocks) return { content: [{ type: 'text', text: 'stocks is required' }], isError: true };
    const parsed = this.parseJsonArg(args.stocks, 'stocks');
    if (!Array.isArray(parsed)) return parsed as ToolResult;
    return this.apiPut('/products/stocks', parsed);
  }

  private async bulkUpdateProductStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.statuses) return { content: [{ type: 'text', text: 'statuses is required' }], isError: true };
    const parsed = this.parseJsonArg(args.statuses, 'statuses');
    if (!Array.isArray(parsed)) return parsed as ToolResult;
    return this.apiPut('/products/status', parsed);
  }

  private async getProductStatus(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/products/status', this.pagingParams(args));
  }

  private async listProductsSelling(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/products/status/selling', this.pagingParams(args));
  }

  // ── Order methods ──────────────────────────────────────────────────────────

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId) return { content: [{ type: 'text', text: 'orderId is required' }], isError: true };
    return this.apiGet(`/order/${encodeURIComponent(args.orderId as string)}`);
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/orders', this.pagingParams(args));
  }

  private async listOrdersByStatus(status: string, args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet(`/orders/status/${status}`, this.pagingParams(args));
  }

  // ── Shipment methods ───────────────────────────────────────────────────────

  private async confirmShipmentSent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId || !args.trackingNumber) {
      return { content: [{ type: 'text', text: 'orderId and trackingNumber are required' }], isError: true };
    }
    const body: Record<string, unknown> = { trackingNumber: args.trackingNumber };
    if (args.carrier) body.carrier = args.carrier;
    if (args.items) {
      const parsed = this.parseJsonArg(args.items, 'items');
      if (!Array.isArray(parsed)) return parsed as ToolResult;
      body.items = parsed;
    }
    return this.apiPost(`/order/${encodeURIComponent(args.orderId as string)}/shipment/sent`, body);
  }

  private async confirmShipmentDelivered(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId) return { content: [{ type: 'text', text: 'orderId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.items) {
      const parsed = this.parseJsonArg(args.items, 'items');
      if (!Array.isArray(parsed)) return parsed as ToolResult;
      body.items = parsed;
    }
    return this.apiPost(`/order/${encodeURIComponent(args.orderId as string)}/shipment/delivered`, body);
  }

  private async confirmShipmentCancel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId) return { content: [{ type: 'text', text: 'orderId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.reason) body.reason = args.reason;
    if (args.items) {
      const parsed = this.parseJsonArg(args.items, 'items');
      if (!Array.isArray(parsed)) return parsed as ToolResult;
      body.items = parsed;
    }
    return this.apiPost(`/order/${encodeURIComponent(args.orderId as string)}/shipment/cancel`, body);
  }

  private async confirmShipmentReturn(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId) return { content: [{ type: 'text', text: 'orderId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.reason) body.reason = args.reason;
    if (args.items) {
      const parsed = this.parseJsonArg(args.items, 'items');
      if (!Array.isArray(parsed)) return parsed as ToolResult;
      body.items = parsed;
    }
    return this.apiPost(`/order/${encodeURIComponent(args.orderId as string)}/shipment/return`, body);
  }

  private async confirmShipmentExchange(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId) return { content: [{ type: 'text', text: 'orderId is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.reason) body.reason = args.reason;
    if (args.items) {
      const parsed = this.parseJsonArg(args.items, 'items');
      if (!Array.isArray(parsed)) return parsed as ToolResult;
      body.items = parsed;
    }
    return this.apiPost(`/order/${encodeURIComponent(args.orderId as string)}/shipment/exchange`, body);
  }

  private async listShipmentsShipped(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/orders/shipments/shipped', this.pagingParams(args));
  }

  private async bulkUpdateShipmentsShipped(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipments) return { content: [{ type: 'text', text: 'shipments is required' }], isError: true };
    const parsed = this.parseJsonArg(args.shipments, 'shipments');
    if (!Array.isArray(parsed)) return parsed as ToolResult;
    return this.apiPost('/orders/shipments/shipped', parsed);
  }

  private async listShipmentsDelivered(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/orders/shipments/delivered', this.pagingParams(args));
  }

  private async bulkUpdateShipmentsDelivered(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.shipments) return { content: [{ type: 'text', text: 'shipments is required' }], isError: true };
    const parsed = this.parseJsonArg(args.shipments, 'shipments');
    if (!Array.isArray(parsed)) return parsed as ToolResult;
    return this.apiPost('/orders/shipments/delivered', parsed);
  }

  // ── Ticket methods ─────────────────────────────────────────────────────────

  private async listTickets(args: Record<string, unknown>): Promise<ToolResult> {
    return this.apiGet('/tickets', this.pagingParams(args));
  }

  private async createTicket(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId || !args.subject || !args.message) {
      return { content: [{ type: 'text', text: 'orderId, subject, and message are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      orderId: args.orderId,
      subject: args.subject,
      message: args.message,
    };
    if (args.type) body.type = args.type;
    return this.apiPost('/ticket', body);
  }

  private async getTicketMessages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ticketId) return { content: [{ type: 'text', text: 'ticketId is required' }], isError: true };
    return this.apiGet(`/ticket/${encodeURIComponent(args.ticketId as string)}/messages`);
  }

  private async addTicketMessage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ticketId || !args.message) {
      return { content: [{ type: 'text', text: 'ticketId and message are required' }], isError: true };
    }
    return this.apiPost(`/ticket/${encodeURIComponent(args.ticketId as string)}/message`, { message: args.message });
  }

  private async updateTicketStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ticketId || !args.status) {
      return { content: [{ type: 'text', text: 'ticketId and status are required' }], isError: true };
    }
    return this.apiPut(`/ticket/${encodeURIComponent(args.ticketId as string)}/status`, { status: args.status });
  }
}
