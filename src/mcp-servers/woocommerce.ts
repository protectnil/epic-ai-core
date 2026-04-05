/**
 * WooCommerce MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developer.woocommerce.com/docs/features/mcp/ — transport: stdio (via @automattic/mcp-wordpress-remote proxy),
//   auth: WooCommerce API key (consumer_key + consumer_secret). Developer preview as of 2026-03; bridges to the WordPress Abilities API,
//   not the WooCommerce REST API directly. Tool count not disclosed; covers core product/order/customer operations.
//   Community MCP: github.com/techspawn/woocommerce-mcp-server (82 stars, ~8 commits, not officially maintained).
// Our adapter covers: 30 tools (full REST API surface). Recommendation: use-rest-api — the official Automattic MCP is in developer
//   preview and routes through a local proxy; our REST adapter provides direct, stable access to all wc/v3 endpoints without a proxy.
//
// Base URL: https://{your-store.com}/wp-json/wc/v3
// Auth: HTTP Basic Auth — consumer_key as username, consumer_secret as password
// Docs: https://woocommerce.github.io/woocommerce-rest-api-docs/
// Rate limits: Governed by WordPress/server config; no published WooCommerce-specific rate limit

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WooCommerceConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export class WooCommerceMCPServer extends MCPAdapterBase {
  private readonly storeUrl: string;
  private readonly consumerKey: string;
  private readonly consumerSecret: string;

  constructor(config: WooCommerceConfig) {
    super();
    // Strip trailing slash from storeUrl
    this.storeUrl = config.storeUrl.replace(/\/$/, '');
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
  }

  static catalog() {
    return {
      name: 'woocommerce',
      displayName: 'WooCommerce',
      version: '1.0.0',
      category: 'commerce',
      keywords: ['woocommerce', 'wordpress', 'ecommerce', 'products', 'orders', 'customers', 'coupons', 'shipping', 'taxes', 'inventory', 'refunds'],
      toolNames: [
        'list_products', 'get_product', 'create_product', 'update_product', 'delete_product',
        'list_product_variations', 'get_product_variation',
        'list_orders', 'get_order', 'create_order', 'update_order', 'delete_order',
        'list_order_notes', 'create_order_note',
        'list_order_refunds', 'create_order_refund',
        'list_customers', 'get_customer', 'create_customer', 'update_customer', 'delete_customer',
        'list_coupons', 'get_coupon', 'create_coupon', 'update_coupon', 'delete_coupon',
        'list_shipping_zones', 'get_shipping_zone',
        'get_system_status', 'list_payment_gateways',
      ],
      description: 'WooCommerce store management: products, orders, customers, coupons, shipping zones, payment gateways, and store system status.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_products',
        description: 'List WooCommerce products with optional filters for status, type, category, and search term',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: any, draft, pending, private, publish (default: any)' },
            type: { type: 'string', description: 'Filter by type: simple, grouped, external, variable (default: all)' },
            category: { type: 'string', description: 'Filter by category slug' },
            search: { type: 'string', description: 'Search products by name or SKU' },
            stock_status: { type: 'string', description: 'Filter by stock: instock, outofstock, onbackorder' },
            per_page: { type: 'number', description: 'Results per page (default: 20, max: 100)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Get full details for a specific WooCommerce product by product ID',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'number', description: 'WooCommerce product ID' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a new WooCommerce product with name, type, price, and status',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Product name' },
            type: { type: 'string', description: 'Product type: simple, variable, grouped, external (default: simple)' },
            regular_price: { type: 'string', description: 'Regular price as string (e.g. "19.99")' },
            sale_price: { type: 'string', description: 'Sale price as string (optional)' },
            description: { type: 'string', description: 'Full product description (HTML allowed)' },
            short_description: { type: 'string', description: 'Short product description' },
            sku: { type: 'string', description: 'Product SKU (stock keeping unit)' },
            status: { type: 'string', description: 'Product status: draft, pending, private, publish (default: publish)' },
            manage_stock: { type: 'boolean', description: 'Enable stock management for this product' },
            stock_quantity: { type: 'number', description: 'Stock quantity when manage_stock is true' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_product',
        description: 'Update fields on an existing WooCommerce product by product ID',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'number', description: 'WooCommerce product ID to update' },
            name: { type: 'string', description: 'Updated product name' },
            regular_price: { type: 'string', description: 'Updated regular price' },
            sale_price: { type: 'string', description: 'Updated sale price' },
            status: { type: 'string', description: 'Updated status: draft, publish, private' },
            stock_quantity: { type: 'number', description: 'Updated stock quantity' },
            description: { type: 'string', description: 'Updated product description' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'delete_product',
        description: 'Delete a WooCommerce product by product ID (moves to trash by default)',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'number', description: 'WooCommerce product ID to delete' },
            force: { type: 'boolean', description: 'Permanently delete instead of trashing (default: false)' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'list_product_variations',
        description: 'List all variations for a variable WooCommerce product',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'number', description: 'Parent variable product ID' },
            per_page: { type: 'number', description: 'Results per page (default: 20)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'get_product_variation',
        description: 'Get details for a specific variation of a variable WooCommerce product',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: { type: 'number', description: 'Parent variable product ID' },
            variation_id: { type: 'number', description: 'Variation ID' },
          },
          required: ['product_id', 'variation_id'],
        },
      },
      {
        name: 'list_orders',
        description: 'List WooCommerce orders with optional status, date range, and customer filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: any, pending, processing, on-hold, completed, cancelled, refunded, failed (default: any)' },
            customer: { type: 'number', description: 'Filter by customer ID' },
            after: { type: 'string', description: 'Only return orders created after this ISO 8601 date' },
            before: { type: 'string', description: 'Only return orders created before this ISO 8601 date' },
            per_page: { type: 'number', description: 'Results per page (default: 20, max: 100)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
            orderby: { type: 'string', description: 'Sort by: date, id, include, title, slug (default: date)' },
            order: { type: 'string', description: 'Sort direction: asc or desc (default: desc)' },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Get full details for a specific WooCommerce order by order ID',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'number', description: 'WooCommerce order ID' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'create_order',
        description: 'Create a new WooCommerce order with line items, customer, and billing/shipping address',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Order status: pending, processing, on-hold, completed (default: pending)' },
            customer_id: { type: 'number', description: 'Existing customer ID (0 for guest orders)' },
            payment_method: { type: 'string', description: 'Payment method ID (e.g. bacs, cheque, paypal)' },
            billing: { type: 'object', description: 'Billing address object (first_name, last_name, email, address_1, city, state, postcode, country)' },
            shipping: { type: 'object', description: 'Shipping address object' },
            line_items: { type: 'array', description: 'Array of line item objects with product_id, variation_id, and quantity' },
          },
        },
      },
      {
        name: 'update_order',
        description: 'Update status or fields on an existing WooCommerce order',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'number', description: 'WooCommerce order ID to update' },
            status: { type: 'string', description: 'New order status: pending, processing, on-hold, completed, cancelled, refunded' },
            customer_note: { type: 'string', description: 'Customer-facing note on the order' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'delete_order',
        description: 'Delete a WooCommerce order by order ID',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'number', description: 'WooCommerce order ID to delete' },
            force: { type: 'boolean', description: 'Permanently delete instead of trashing (default: false)' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'list_order_notes',
        description: 'List notes on a WooCommerce order (customer-facing and internal)',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'number', description: 'WooCommerce order ID' },
            type: { type: 'string', description: 'Filter by type: any, customer, internal (default: any)' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'create_order_note',
        description: 'Add a note to a WooCommerce order, optionally visible to the customer',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'number', description: 'WooCommerce order ID' },
            note: { type: 'string', description: 'Note content' },
            customer_note: { type: 'boolean', description: 'Whether the note is visible to the customer (default: false)' },
          },
          required: ['order_id', 'note'],
        },
      },
      {
        name: 'list_order_refunds',
        description: 'List refunds for a specific WooCommerce order',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'number', description: 'WooCommerce order ID' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'create_order_refund',
        description: 'Create a refund for a WooCommerce order with optional line items and amounts',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: { type: 'number', description: 'WooCommerce order ID to refund' },
            amount: { type: 'string', description: 'Refund amount as string (e.g. "10.00"). Leave blank to refund all.' },
            reason: { type: 'string', description: 'Reason for the refund' },
            api_refund: { type: 'boolean', description: 'Whether to process a refund via payment gateway (default: true)' },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'list_customers',
        description: 'List WooCommerce customers with optional search, role, and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search by name, username, or email' },
            role: { type: 'string', description: 'Filter by WordPress role: all, administrator, editor, author, contributor, subscriber, customer (default: customer)' },
            per_page: { type: 'number', description: 'Results per page (default: 20, max: 100)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get details and order history for a specific WooCommerce customer by customer ID',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'number', description: 'WooCommerce customer ID' },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new WooCommerce customer account with email, name, and password',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Customer email address' },
            first_name: { type: 'string', description: 'Customer first name' },
            last_name: { type: 'string', description: 'Customer last name' },
            username: { type: 'string', description: 'WordPress username (auto-generated from email if omitted)' },
            password: { type: 'string', description: 'Customer password (auto-generated if omitted)' },
          },
          required: ['email'],
        },
      },
      {
        name: 'update_customer',
        description: 'Update fields for an existing WooCommerce customer',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'number', description: 'WooCommerce customer ID to update' },
            email: { type: 'string', description: 'Updated email' },
            first_name: { type: 'string', description: 'Updated first name' },
            last_name: { type: 'string', description: 'Updated last name' },
            billing: { type: 'object', description: 'Updated billing address object' },
            shipping: { type: 'object', description: 'Updated shipping address object' },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'delete_customer',
        description: 'Delete a WooCommerce customer by customer ID',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: { type: 'number', description: 'WooCommerce customer ID to delete' },
            force: { type: 'boolean', description: 'Required — must be true (WooCommerce requires force: true for customer deletion)' },
            reassign: { type: 'number', description: 'Reassign posts to this user ID after deletion (optional)' },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'list_coupons',
        description: 'List WooCommerce coupons with optional search and date filters',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search by coupon code' },
            per_page: { type: 'number', description: 'Results per page (default: 20)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
          },
        },
      },
      {
        name: 'get_coupon',
        description: 'Get details for a specific WooCommerce coupon by coupon ID',
        inputSchema: {
          type: 'object',
          properties: {
            coupon_id: { type: 'number', description: 'WooCommerce coupon ID' },
          },
          required: ['coupon_id'],
        },
      },
      {
        name: 'create_coupon',
        description: 'Create a new WooCommerce coupon with a code, discount type, and amount',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Coupon code (unique, case-insensitive)' },
            discount_type: { type: 'string', description: 'Discount type: percent, fixed_cart, fixed_product (default: fixed_cart)' },
            amount: { type: 'string', description: 'Coupon amount as string (e.g. "10" for 10% or $10 off)' },
            individual_use: { type: 'boolean', description: 'Cannot be used with other coupons (default: false)' },
            usage_limit: { type: 'number', description: 'Maximum number of times coupon can be used (0 = unlimited)' },
            expiry_date: { type: 'string', description: 'Coupon expiry date in YYYY-MM-DD format' },
          },
          required: ['code'],
        },
      },
      {
        name: 'update_coupon',
        description: 'Update fields on an existing WooCommerce coupon',
        inputSchema: {
          type: 'object',
          properties: {
            coupon_id: { type: 'number', description: 'WooCommerce coupon ID to update' },
            code: { type: 'string', description: 'Updated coupon code' },
            amount: { type: 'string', description: 'Updated discount amount' },
            expiry_date: { type: 'string', description: 'Updated expiry date in YYYY-MM-DD format' },
            usage_limit: { type: 'number', description: 'Updated maximum usage limit' },
          },
          required: ['coupon_id'],
        },
      },
      {
        name: 'delete_coupon',
        description: 'Delete a WooCommerce coupon by coupon ID',
        inputSchema: {
          type: 'object',
          properties: {
            coupon_id: { type: 'number', description: 'WooCommerce coupon ID to delete' },
            force: { type: 'boolean', description: 'Permanently delete instead of trashing (default: false)' },
          },
          required: ['coupon_id'],
        },
      },
      {
        name: 'list_shipping_zones',
        description: 'List all WooCommerce shipping zones configured in the store',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_shipping_zone',
        description: 'Get details and shipping methods for a specific WooCommerce shipping zone',
        inputSchema: {
          type: 'object',
          properties: {
            zone_id: { type: 'number', description: 'WooCommerce shipping zone ID' },
          },
          required: ['zone_id'],
        },
      },
      {
        name: 'get_system_status',
        description: 'Get WooCommerce system status including WordPress version, database, and plugin information',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_payment_gateways',
        description: 'List all payment gateways configured on the WooCommerce store with enabled status',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_products': return this.listProducts(args);
        case 'get_product': return this.getProduct(args);
        case 'create_product': return this.createProduct(args);
        case 'update_product': return this.updateProduct(args);
        case 'delete_product': return this.deleteProduct(args);
        case 'list_product_variations': return this.listProductVariations(args);
        case 'get_product_variation': return this.getProductVariation(args);
        case 'list_orders': return this.listOrders(args);
        case 'get_order': return this.getOrder(args);
        case 'create_order': return this.createOrder(args);
        case 'update_order': return this.updateOrder(args);
        case 'delete_order': return this.deleteOrder(args);
        case 'list_order_notes': return this.listOrderNotes(args);
        case 'create_order_note': return this.createOrderNote(args);
        case 'list_order_refunds': return this.listOrderRefunds(args);
        case 'create_order_refund': return this.createOrderRefund(args);
        case 'list_customers': return this.listCustomers(args);
        case 'get_customer': return this.getCustomer(args);
        case 'create_customer': return this.createCustomer(args);
        case 'update_customer': return this.updateCustomer(args);
        case 'delete_customer': return this.deleteCustomer(args);
        case 'list_coupons': return this.listCoupons(args);
        case 'get_coupon': return this.getCoupon(args);
        case 'create_coupon': return this.createCoupon(args);
        case 'update_coupon': return this.updateCoupon(args);
        case 'delete_coupon': return this.deleteCoupon(args);
        case 'list_shipping_zones': return this.listShippingZones();
        case 'get_shipping_zone': return this.getShippingZone(args);
        case 'get_system_status': return this.getSystemStatus();
        case 'list_payment_gateways': return this.listPaymentGateways();
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

  private get baseUrl(): string {
    return `${this.storeUrl}/wp-json/wc/v3`;
  }

  private get authHeader(): string {
    return `Basic ${btoa(`${this.consumerKey}:${this.consumerSecret}`)}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    };
  }


  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
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

  private async put(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    };
    if (args.status) params.status = args.status as string;
    if (args.type) params.type = args.type as string;
    if (args.category) params.category = args.category as string;
    if (args.search) params.search = args.search as string;
    if (args.stock_status) params.stock_status = args.stock_status as string;
    return this.get('/products', params);
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    return this.get(`/products/${encodeURIComponent(args.product_id as string)}`);
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.post('/products', args);
  }

  private async updateProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    const { product_id, ...body } = args;
    return this.put(`/products/${product_id}`, body);
  }

  private async deleteProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.force) params.force = String(args.force);
    return this.del(`/products/${encodeURIComponent(args.product_id as string)}`, params);
  }

  private async listProductVariations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    };
    return this.get(`/products/${encodeURIComponent(args.product_id as string)}/variations`, params);
  }

  private async getProductVariation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id || !args.variation_id) {
      return { content: [{ type: 'text', text: 'product_id and variation_id are required' }], isError: true };
    }
    return this.get(`/products/${encodeURIComponent(args.product_id as string)}/variations/${encodeURIComponent(args.variation_id as string)}`);
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    };
    if (args.status) params.status = args.status as string;
    if (args.customer) params.customer = String(args.customer);
    if (args.after) params.after = args.after as string;
    if (args.before) params.before = args.before as string;
    if (args.orderby) params.orderby = args.orderby as string;
    if (args.order) params.order = args.order as string;
    return this.get('/orders', params);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    return this.get(`/orders/${encodeURIComponent(args.order_id as string)}`);
  }

  private async createOrder(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/orders', args);
  }

  private async updateOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    const { order_id, ...body } = args;
    return this.put(`/orders/${order_id}`, body);
  }

  private async deleteOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.force) params.force = String(args.force);
    return this.del(`/orders/${encodeURIComponent(args.order_id as string)}`, params);
  }

  private async listOrderNotes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.type) params.type = args.type as string;
    return this.get(`/orders/${encodeURIComponent(args.order_id as string)}/notes`, params);
  }

  private async createOrderNote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id || !args.note) {
      return { content: [{ type: 'text', text: 'order_id and note are required' }], isError: true };
    }
    const body: Record<string, unknown> = { note: args.note };
    if (typeof args.customer_note === 'boolean') body.customer_note = args.customer_note;
    return this.post(`/orders/${encodeURIComponent(args.order_id as string)}/notes`, body);
  }

  private async listOrderRefunds(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    return this.get(`/orders/${encodeURIComponent(args.order_id as string)}/refunds`);
  }

  private async createOrderRefund(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.amount) body.amount = args.amount;
    if (args.reason) body.reason = args.reason;
    if (typeof args.api_refund === 'boolean') body.api_refund = args.api_refund;
    return this.post(`/orders/${encodeURIComponent(args.order_id as string)}/refunds`, body);
  }

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
      role: (args.role as string) ?? 'customer',
    };
    if (args.search) params.search = args.search as string;
    return this.get('/customers', params);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    return this.get(`/customers/${encodeURIComponent(args.customer_id as string)}`);
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email) return { content: [{ type: 'text', text: 'email is required' }], isError: true };
    return this.post('/customers', args);
  }

  private async updateCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const { customer_id, ...body } = args;
    return this.put(`/customers/${customer_id}`, body);
  }

  private async deleteCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const params: Record<string, string> = { force: 'true' };
    if (args.reassign) params.reassign = String(args.reassign);
    return this.del(`/customers/${encodeURIComponent(args.customer_id as string)}`, params);
  }

  private async listCoupons(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) ?? 20),
      page: String((args.page as number) ?? 1),
    };
    if (args.search) params.search = args.search as string;
    return this.get('/coupons', params);
  }

  private async getCoupon(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.coupon_id) return { content: [{ type: 'text', text: 'coupon_id is required' }], isError: true };
    return this.get(`/coupons/${encodeURIComponent(args.coupon_id as string)}`);
  }

  private async createCoupon(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.code) return { content: [{ type: 'text', text: 'code is required' }], isError: true };
    return this.post('/coupons', args);
  }

  private async updateCoupon(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.coupon_id) return { content: [{ type: 'text', text: 'coupon_id is required' }], isError: true };
    const { coupon_id, ...body } = args;
    return this.put(`/coupons/${coupon_id}`, body);
  }

  private async deleteCoupon(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.coupon_id) return { content: [{ type: 'text', text: 'coupon_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.force) params.force = String(args.force);
    return this.del(`/coupons/${encodeURIComponent(args.coupon_id as string)}`, params);
  }

  private async listShippingZones(): Promise<ToolResult> {
    return this.get('/shipping/zones');
  }

  private async getShippingZone(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.zone_id === undefined) return { content: [{ type: 'text', text: 'zone_id is required' }], isError: true };
    return this.get(`/shipping/zones/${encodeURIComponent(args.zone_id as string)}`);
  }

  private async getSystemStatus(): Promise<ToolResult> {
    return this.get('/system_status');
  }

  private async listPaymentGateways(): Promise<ToolResult> {
    return this.get('/payment_gateways');
  }
}
