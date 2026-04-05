/**
 * Shopify MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://shopify.dev/docs/apps/build/devmcp — transport: stdio, auth: none (dev tool only)
// Shopify ships a Dev MCP server (@shopify/dev-mcp) for developer tooling: doc search and GraphQL schema introspection only.
// Tools: learn_shopify_api, introspect_admin_schema — NO Admin REST CRUD operations.
// Shopify also exposes a Storefront MCP on every store at /api/mcp for read-only storefront queries (Summer '25).
// Neither MCP covers Admin REST CRUD operations (create/update orders, manage inventory, configure webhooks).
// Our adapter covers: 18 tools (Admin REST API surface — products, orders, customers, inventory, fulfillments, webhooks).
// Recommendation: use-rest-api — Dev MCP fails criteria 3 (only 2 tools, not 10+). Our adapter is the correct Admin API integration.
//
// Base URL: https://{store}.myshopify.com/admin/api/2025-01
// Auth: X-Shopify-Access-Token header (private app or custom app access token)
// Docs: https://shopify.dev/docs/api/admin-rest
// Rate limits: 40 requests/min per app per store; replenishes at 2 req/s. 10x higher limit for Shopify Plus stores.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ShopifyConfig {
  store: string;
  accessToken: string;
  apiVersion?: string;
  baseUrl?: string;
}

export class ShopifyMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: ShopifyConfig) {
    super();
    this.accessToken = config.accessToken;
    const version = config.apiVersion ?? '2025-01';
    this.baseUrl = config.baseUrl || `https://${config.store}.myshopify.com/admin/api/${version}`;
  }

  static catalog() {
    return {
      name: 'shopify',
      displayName: 'Shopify',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'shopify', 'ecommerce', 'store', 'product', 'order', 'customer', 'inventory',
        'fulfillment', 'webhook', 'collection', 'variant', 'discount', 'metafield',
        'location', 'shipping', 'cart', 'checkout', 'retail',
      ],
      toolNames: [
        'list_products', 'get_product', 'create_product', 'update_product',
        'list_orders', 'get_order', 'update_order', 'cancel_order',
        'list_customers', 'get_customer', 'create_customer',
        'list_inventory_levels', 'adjust_inventory_level',
        'list_locations', 'list_fulfillments', 'create_fulfillment',
        'list_webhooks', 'create_webhook',
      ],
      description: 'Shopify Admin API: manage products, orders, customers, inventory levels, fulfillments, and webhooks across a Shopify store.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_products',
        description: 'List products from the Shopify store with optional filters for status, vendor, product type, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of products to return (default: 50, max: 250)',
            },
            since_id: {
              type: 'number',
              description: 'Return products with ID greater than this value for cursor-based pagination',
            },
            status: {
              type: 'string',
              description: 'Filter by status: active, archived, draft (default: active)',
            },
            vendor: {
              type: 'string',
              description: 'Filter by vendor name',
            },
            product_type: {
              type: 'string',
              description: 'Filter by product type',
            },
            title: {
              type: 'string',
              description: 'Filter by product title (exact match)',
            },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Retrieve a single Shopify product by its numeric ID including variants, images, and options',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'number',
              description: 'The numeric Shopify product ID',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a new product in the Shopify store with title, description, vendor, status, and tags',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Product title (required)',
            },
            body_html: {
              type: 'string',
              description: 'Product description in HTML',
            },
            vendor: {
              type: 'string',
              description: 'Product vendor name',
            },
            product_type: {
              type: 'string',
              description: 'Product type for categorization',
            },
            status: {
              type: 'string',
              description: 'Product status: active, archived, draft (default: draft)',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated list of tags',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_product',
        description: 'Update fields on an existing Shopify product by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'number',
              description: 'The numeric Shopify product ID to update',
            },
            title: {
              type: 'string',
              description: 'Updated product title',
            },
            body_html: {
              type: 'string',
              description: 'Updated product description in HTML',
            },
            status: {
              type: 'string',
              description: 'Updated status: active, archived, draft',
            },
            tags: {
              type: 'string',
              description: 'Updated comma-separated list of tags',
            },
            vendor: {
              type: 'string',
              description: 'Updated vendor name',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'list_orders',
        description: 'List orders from the Shopify store with optional filters for status, date range, financial status, and fulfillment status',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of orders to return (default: 50, max: 250)',
            },
            status: {
              type: 'string',
              description: 'Filter by order status: open, closed, cancelled, any (default: open)',
            },
            financial_status: {
              type: 'string',
              description: 'Filter by financial status: pending, authorized, partially_paid, paid, partially_refunded, refunded, voided',
            },
            fulfillment_status: {
              type: 'string',
              description: 'Filter by fulfillment status: shipped, partial, unshipped, unfulfilled, any',
            },
            since_id: {
              type: 'number',
              description: 'Return orders with ID greater than this value for cursor-based pagination',
            },
            created_at_min: {
              type: 'string',
              description: 'Return orders created at or after this ISO 8601 timestamp',
            },
            created_at_max: {
              type: 'string',
              description: 'Return orders created at or before this ISO 8601 timestamp',
            },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Retrieve a single Shopify order by its numeric ID including line items, shipping, and payment details',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'The numeric Shopify order ID',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'update_order',
        description: 'Update fields on an existing Shopify order by its numeric ID, such as email, note, or tags',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'The numeric Shopify order ID to update',
            },
            email: {
              type: 'string',
              description: 'Updated customer email address',
            },
            note: {
              type: 'string',
              description: 'Updated order note',
            },
            tags: {
              type: 'string',
              description: 'Updated comma-separated list of tags',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'cancel_order',
        description: 'Cancel a Shopify order with an optional reason and restock flag',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'The numeric Shopify order ID to cancel',
            },
            reason: {
              type: 'string',
              description: 'Cancellation reason: customer, fraud, inventory, declined, other',
            },
            restock: {
              type: 'boolean',
              description: 'Whether to restock the items (default: false)',
            },
            note: {
              type: 'string',
              description: 'Internal note about the cancellation',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'list_customers',
        description: 'List customers from the Shopify store with optional date range, email, and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of customers to return (default: 50, max: 250)',
            },
            since_id: {
              type: 'number',
              description: 'Return customers with ID greater than this value for cursor-based pagination',
            },
            created_at_min: {
              type: 'string',
              description: 'Return customers created at or after this ISO 8601 timestamp',
            },
            created_at_max: {
              type: 'string',
              description: 'Return customers created at or before this ISO 8601 timestamp',
            },
            email: {
              type: 'string',
              description: 'Filter by customer email address',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Retrieve a single Shopify customer by their numeric ID including orders count and addresses',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'number',
              description: 'The numeric Shopify customer ID',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer record in the Shopify store with name, email, and optional address',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Customer email address (required)',
            },
            first_name: {
              type: 'string',
              description: 'Customer first name',
            },
            last_name: {
              type: 'string',
              description: 'Customer last name',
            },
            phone: {
              type: 'string',
              description: 'Customer phone number in E.164 format',
            },
            tags: {
              type: 'string',
              description: 'Comma-separated list of tags',
            },
            note: {
              type: 'string',
              description: 'Internal note about the customer',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'list_inventory_levels',
        description: 'List inventory levels across locations for one or more inventory items or locations',
        inputSchema: {
          type: 'object',
          properties: {
            inventory_item_ids: {
              type: 'string',
              description: 'Comma-separated list of inventory item IDs to filter by',
            },
            location_ids: {
              type: 'string',
              description: 'Comma-separated list of location IDs to filter by',
            },
            limit: {
              type: 'number',
              description: 'Number of inventory levels to return (default: 50, max: 250)',
            },
          },
        },
      },
      {
        name: 'adjust_inventory_level',
        description: 'Adjust inventory quantity for an item at a specific location by a positive or negative delta',
        inputSchema: {
          type: 'object',
          properties: {
            inventory_item_id: {
              type: 'number',
              description: 'The numeric inventory item ID to adjust',
            },
            location_id: {
              type: 'number',
              description: 'The numeric location ID where inventory is held',
            },
            available_adjustment: {
              type: 'number',
              description: 'Quantity to add (positive) or subtract (negative) from available inventory',
            },
          },
          required: ['inventory_item_id', 'location_id', 'available_adjustment'],
        },
      },
      {
        name: 'list_locations',
        description: 'List all active fulfillment locations for the Shopify store',
        inputSchema: {
          type: 'object',
          properties: {
            active: {
              type: 'boolean',
              description: 'Filter by active status: true for active locations only (default: true)',
            },
          },
        },
      },
      {
        name: 'list_fulfillments',
        description: 'List fulfillments for a specific Shopify order showing tracking numbers and fulfillment status',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'The numeric Shopify order ID to list fulfillments for',
            },
            limit: {
              type: 'number',
              description: 'Number of fulfillments to return (default: 50, max: 250)',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'create_fulfillment',
        description: 'Create a fulfillment for a Shopify order with optional tracking number and line item selection',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'The numeric Shopify order ID to fulfill',
            },
            location_id: {
              type: 'number',
              description: 'The location ID from which items are being fulfilled',
            },
            tracking_number: {
              type: 'string',
              description: 'Shipment tracking number',
            },
            tracking_company: {
              type: 'string',
              description: 'Shipping carrier name (e.g., UPS, FedEx, USPS)',
            },
            tracking_url: {
              type: 'string',
              description: 'URL to track the shipment',
            },
            notify_customer: {
              type: 'boolean',
              description: 'Whether to send a shipping notification email to the customer (default: true)',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List webhook subscriptions configured for the Shopify store with their topics and endpoints',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Filter by webhook topic (e.g., orders/create, products/update, inventory_levels/update)',
            },
            limit: {
              type: 'number',
              description: 'Number of webhooks to return (default: 50, max: 250)',
            },
          },
        },
      },
      {
        name: 'create_webhook',
        description: 'Create a webhook subscription to receive event notifications at a specified URL for a Shopify topic',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Webhook topic to subscribe to (e.g., orders/create, products/update, customers/create)',
            },
            address: {
              type: 'string',
              description: 'HTTPS URL that will receive webhook POST requests',
            },
            format: {
              type: 'string',
              description: 'Payload format: json or xml (default: json)',
            },
          },
          required: ['topic', 'address'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_products':
          return await this.listProducts(args);
        case 'get_product':
          return await this.getProduct(args);
        case 'create_product':
          return await this.createProduct(args);
        case 'update_product':
          return await this.updateProduct(args);
        case 'list_orders':
          return await this.listOrders(args);
        case 'get_order':
          return await this.getOrder(args);
        case 'update_order':
          return await this.updateOrder(args);
        case 'cancel_order':
          return await this.cancelOrder(args);
        case 'list_customers':
          return await this.listCustomers(args);
        case 'get_customer':
          return await this.getCustomer(args);
        case 'create_customer':
          return await this.createCustomer(args);
        case 'list_inventory_levels':
          return await this.listInventoryLevels(args);
        case 'adjust_inventory_level':
          return await this.adjustInventoryLevel(args);
        case 'list_locations':
          return await this.listLocations(args);
        case 'list_fulfillments':
          return await this.listFulfillments(args);
        case 'create_fulfillment':
          return await this.createFulfillment(args);
        case 'list_webhooks':
          return await this.listWebhooks(args);
        case 'create_webhook':
          return await this.createWebhook(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private requestHeaders(): Record<string, string> {
    return {
      'X-Shopify-Access-Token': this.accessToken,
      'Content-Type': 'application/json',
    };
  }

  private async fetchJson(url: string, options: RequestInit = {}): Promise<unknown> {
    const response = await this.fetchWithRetry(url, { ...options, headers: this.requestHeaders() });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    return response.json();
  }

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    if (args.since_id) params.set('since_id', String(args.since_id));
    if (args.status) params.set('status', args.status as string);
    if (args.vendor) params.set('vendor', args.vendor as string);
    if (args.product_type) params.set('product_type', args.product_type as string);
    if (args.title) params.set('title', args.title as string);
    const data = await this.fetchJson(`${this.baseUrl}/products.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.product_id as number;
    if (!productId) {
      return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    }
    const data = await this.fetchJson(`${this.baseUrl}/products/${productId}.json`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const title = args.title as string;
    if (!title) {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const product: Record<string, unknown> = { title };
    if (args.body_html) product['body_html'] = args.body_html;
    if (args.vendor) product['vendor'] = args.vendor;
    if (args.product_type) product['product_type'] = args.product_type;
    if (args.status) product['status'] = args.status;
    if (args.tags) product['tags'] = args.tags;
    const data = await this.fetchJson(`${this.baseUrl}/products.json`, {
      method: 'POST',
      body: JSON.stringify({ product }),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateProduct(args: Record<string, unknown>): Promise<ToolResult> {
    const productId = args.product_id as number;
    if (!productId) {
      return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    }
    const product: Record<string, unknown> = { id: productId };
    if (args.title !== undefined) product['title'] = args.title;
    if (args.body_html !== undefined) product['body_html'] = args.body_html;
    if (args.status !== undefined) product['status'] = args.status;
    if (args.tags !== undefined) product['tags'] = args.tags;
    if (args.vendor !== undefined) product['vendor'] = args.vendor;
    const data = await this.fetchJson(`${this.baseUrl}/products/${productId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ product }),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    if (args.status) params.set('status', args.status as string);
    if (args.financial_status) params.set('financial_status', args.financial_status as string);
    if (args.fulfillment_status) params.set('fulfillment_status', args.fulfillment_status as string);
    if (args.since_id) params.set('since_id', String(args.since_id));
    if (args.created_at_min) params.set('created_at_min', args.created_at_min as string);
    if (args.created_at_max) params.set('created_at_max', args.created_at_max as string);
    const data = await this.fetchJson(`${this.baseUrl}/orders.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const orderId = args.order_id as number;
    if (!orderId) {
      return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    }
    const data = await this.fetchJson(`${this.baseUrl}/orders/${orderId}.json`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const orderId = args.order_id as number;
    if (!orderId) {
      return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    }
    const order: Record<string, unknown> = { id: orderId };
    if (args.email !== undefined) order['email'] = args.email;
    if (args.note !== undefined) order['note'] = args.note;
    if (args.tags !== undefined) order['tags'] = args.tags;
    const data = await this.fetchJson(`${this.baseUrl}/orders/${orderId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ order }),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cancelOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const orderId = args.order_id as number;
    if (!orderId) {
      return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {};
    if (args.reason) body['reason'] = args.reason;
    if (args.restock !== undefined) body['restock'] = args.restock;
    if (args.note) body['note'] = args.note;
    const data = await this.fetchJson(`${this.baseUrl}/orders/${orderId}/cancel.json`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    if (args.since_id) params.set('since_id', String(args.since_id));
    if (args.created_at_min) params.set('created_at_min', args.created_at_min as string);
    if (args.created_at_max) params.set('created_at_max', args.created_at_max as string);
    if (args.email) params.set('email', args.email as string);
    const data = await this.fetchJson(`${this.baseUrl}/customers.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const customerId = args.customer_id as number;
    if (!customerId) {
      return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    }
    const data = await this.fetchJson(`${this.baseUrl}/customers/${customerId}.json`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    const email = args.email as string;
    if (!email) {
      return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    }
    const customer: Record<string, unknown> = { email };
    if (args.first_name) customer['first_name'] = args.first_name;
    if (args.last_name) customer['last_name'] = args.last_name;
    if (args.phone) customer['phone'] = args.phone;
    if (args.tags) customer['tags'] = args.tags;
    if (args.note) customer['note'] = args.note;
    const data = await this.fetchJson(`${this.baseUrl}/customers.json`, {
      method: 'POST',
      body: JSON.stringify({ customer }),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listInventoryLevels(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    if (args.inventory_item_ids) params.set('inventory_item_ids', args.inventory_item_ids as string);
    if (args.location_ids) params.set('location_ids', args.location_ids as string);
    const data = await this.fetchJson(`${this.baseUrl}/inventory_levels.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async adjustInventoryLevel(args: Record<string, unknown>): Promise<ToolResult> {
    const inventoryItemId = args.inventory_item_id as number;
    const locationId = args.location_id as number;
    const adjustment = args.available_adjustment as number;
    if (!inventoryItemId || !locationId || adjustment === undefined) {
      return { content: [{ type: 'text', text: 'inventory_item_id, location_id, and available_adjustment are required' }], isError: true };
    }
    const data = await this.fetchJson(`${this.baseUrl}/inventory_levels/adjust.json`, {
      method: 'POST',
      body: JSON.stringify({
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        available_adjustment: adjustment,
      }),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listLocations(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.active !== false) params.set('active', 'true');
    const data = await this.fetchJson(`${this.baseUrl}/locations.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listFulfillments(args: Record<string, unknown>): Promise<ToolResult> {
    const orderId = args.order_id as number;
    if (!orderId) {
      return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    const data = await this.fetchJson(`${this.baseUrl}/orders/${orderId}/fulfillments.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createFulfillment(args: Record<string, unknown>): Promise<ToolResult> {
    const orderId = args.order_id as number;
    if (!orderId) {
      return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    }
    const fulfillment: Record<string, unknown> = {};
    if (args.location_id) fulfillment['location_id'] = args.location_id;
    if (args.tracking_number) fulfillment['tracking_number'] = args.tracking_number;
    if (args.tracking_company) fulfillment['tracking_company'] = args.tracking_company;
    if (args.tracking_url) fulfillment['tracking_url'] = args.tracking_url;
    if (args.notify_customer !== undefined) fulfillment['notify_customer'] = args.notify_customer;
    const data = await this.fetchJson(`${this.baseUrl}/orders/${orderId}/fulfillments.json`, {
      method: 'POST',
      body: JSON.stringify({ fulfillment }),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listWebhooks(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 50));
    if (args.topic) params.set('topic', args.topic as string);
    const data = await this.fetchJson(`${this.baseUrl}/webhooks.json?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createWebhook(args: Record<string, unknown>): Promise<ToolResult> {
    const topic = args.topic as string;
    const address = args.address as string;
    if (!topic || !address) {
      return { content: [{ type: 'text', text: 'topic and address are required' }], isError: true };
    }
    const webhook: Record<string, unknown> = { topic, address, format: (args.format as string) ?? 'json' };
    const data = await this.fetchJson(`${this.baseUrl}/webhooks.json`, {
      method: 'POST',
      body: JSON.stringify({ webhook }),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
