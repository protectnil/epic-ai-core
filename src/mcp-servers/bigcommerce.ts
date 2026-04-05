/**
 * BigCommerce MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official BigCommerce-owned MCP server was found on GitHub. Community servers exist
// (isaacgounton/bigcommerce-api-mcp, CDataSoftware/bigcommerce-mcp-server-by-cdata) but
// are not maintained by BigCommerce Inc. and have limited tool coverage.
// This adapter provides full REST v3/v2 coverage as the authoritative integration path.
//
// Base URL: https://api.bigcommerce.com/stores/{storeHash}
// Auth: X-Auth-Token header (store-level API credentials). Obtain from Store Settings →
//       API Accounts → Create API Account. Token is permanent until rotated.
// Docs: https://developer.bigcommerce.com/docs/api
//       https://developer.bigcommerce.com/docs/start/authentication
// Rate limits: Standard stores — 450 requests per 30-second window (~900 req/min).
//              Plus stores — 600 per 30 seconds. Enterprise — custom.
//              Response headers: X-Rate-Limit-Requests-Left, X-Rate-Limit-Time-Reset-Ms.
//              HTTP 429 returned on exhaustion.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BigCommerceConfig {
  apiToken: string;
  storeHash: string;
  baseUrl?: string;
}

export class BigCommerceMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: BigCommerceConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || `https://api.bigcommerce.com/stores/${config.storeHash}`;
  }

  static catalog() {
    return {
      name: 'bigcommerce',
      displayName: 'BigCommerce',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'bigcommerce', 'ecommerce', 'e-commerce', 'store', 'product', 'order',
        'customer', 'cart', 'catalog', 'sku', 'variant', 'inventory', 'coupon',
        'promotion', 'shipping', 'category', 'brand', 'enterprise commerce',
      ],
      toolNames: [
        'list_products',
        'get_product',
        'create_product',
        'update_product',
        'delete_product',
        'list_product_variants',
        'get_product_variant',
        'list_categories',
        'get_category',
        'create_category',
        'list_orders',
        'get_order',
        'update_order',
        'list_order_products',
        'list_customers',
        'get_customer',
        'create_customer',
        'update_customer',
        'delete_customer',
        'list_coupons',
        'create_coupon',
        'delete_coupon',
        'get_store_info',
      ],
      description: 'BigCommerce enterprise e-commerce: manage products, variants, categories, orders, customers, and coupons across your storefront catalog and order management system.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_products',
        description: 'List products in the BigCommerce catalog with optional filters for availability, category, brand, and keyword search. Supports pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            limit: {
              type: 'number',
              description: 'Products per page (default: 50, max: 250).',
            },
            keyword: {
              type: 'string',
              description: 'Filter by keyword matching product name, SKU, or description.',
            },
            availability: {
              type: 'string',
              description: 'Filter by availability: available, disabled, preorder.',
            },
            is_visible: {
              type: 'boolean',
              description: 'Filter to only visible (true) or hidden (false) products.',
            },
            category_id: {
              type: 'number',
              description: 'Filter products by category ID.',
            },
            brand_id: {
              type: 'number',
              description: 'Filter products by brand ID.',
            },
            include: {
              type: 'string',
              description: 'Comma-separated sub-resources to include: variants, images, custom_fields, bulk_pricing_rules, primary_image.',
            },
            sort: {
              type: 'string',
              description: 'Sort field: id, name, sku, price, date_created, date_modified (default: id).',
            },
            direction: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: asc).',
            },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Get full details of a single BigCommerce product by its ID, including pricing, inventory, images, and variants.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'number',
              description: 'Numeric ID of the product.',
            },
            include: {
              type: 'string',
              description: 'Comma-separated sub-resources: variants, images, custom_fields, bulk_pricing_rules, primary_image.',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a new product in the BigCommerce catalog with name, type, pricing, and inventory settings.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Product name.',
            },
            type: {
              type: 'string',
              description: 'Product type: physical (default) or digital.',
            },
            sku: {
              type: 'string',
              description: 'Unique SKU identifier for the product.',
            },
            price: {
              type: 'number',
              description: 'Sale price of the product.',
            },
            weight: {
              type: 'number',
              description: 'Weight of the product (used for shipping calculations).',
            },
            description: {
              type: 'string',
              description: 'Product description (HTML supported).',
            },
            is_visible: {
              type: 'boolean',
              description: 'Whether the product is visible in the storefront (default: true).',
            },
            availability: {
              type: 'string',
              description: 'Availability: available (default), disabled, or preorder.',
            },
            categories: {
              type: 'string',
              description: 'JSON array of category IDs to assign (e.g. "[1, 5, 12]").',
            },
            inventory_level: {
              type: 'number',
              description: 'Inventory quantity for the product.',
            },
            inventory_tracking: {
              type: 'string',
              description: 'Inventory tracking mode: none, product, variant.',
            },
          },
          required: ['name', 'type', 'price', 'weight'],
        },
      },
      {
        name: 'update_product',
        description: 'Update an existing BigCommerce product by ID. Send only the fields to change — unspecified fields are unchanged.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'number',
              description: 'Numeric ID of the product to update.',
            },
            name: {
              type: 'string',
              description: 'New product name.',
            },
            price: {
              type: 'number',
              description: 'New sale price.',
            },
            description: {
              type: 'string',
              description: 'Updated product description (HTML supported).',
            },
            is_visible: {
              type: 'boolean',
              description: 'Visibility in the storefront.',
            },
            availability: {
              type: 'string',
              description: 'Availability: available, disabled, or preorder.',
            },
            inventory_level: {
              type: 'number',
              description: 'Updated inventory quantity.',
            },
            categories: {
              type: 'string',
              description: 'JSON array of category IDs to assign (replaces existing categories).',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'delete_product',
        description: 'Permanently delete a product from the BigCommerce catalog by its ID. This cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'number',
              description: 'Numeric ID of the product to delete.',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'list_product_variants',
        description: 'List all variants of a BigCommerce product (e.g. different sizes and colors) with pricing and inventory per variant.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'number',
              description: 'Product ID to list variants for.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            limit: {
              type: 'number',
              description: 'Variants per page (default: 50, max: 250).',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'get_product_variant',
        description: 'Get details of a specific product variant by product ID and variant ID.',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'number',
              description: 'Product ID containing the variant.',
            },
            variant_id: {
              type: 'number',
              description: 'Variant ID to retrieve.',
            },
          },
          required: ['product_id', 'variant_id'],
        },
      },
      {
        name: 'list_categories',
        description: 'List product categories in the BigCommerce catalog with optional parent filter and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            parent_id: {
              type: 'number',
              description: 'List only subcategories of this parent category ID.',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            limit: {
              type: 'number',
              description: 'Categories per page (default: 50, max: 250).',
            },
            is_visible: {
              type: 'boolean',
              description: 'Filter to visible or hidden categories.',
            },
          },
        },
      },
      {
        name: 'get_category',
        description: 'Get full details of a single product category by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            category_id: {
              type: 'number',
              description: 'Numeric ID of the category.',
            },
          },
          required: ['category_id'],
        },
      },
      {
        name: 'create_category',
        description: 'Create a new product category in the BigCommerce catalog. Optionally nest under a parent category.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the new category.',
            },
            parent_id: {
              type: 'number',
              description: 'Parent category ID for nesting. Use 0 for a root-level category (default: 0).',
            },
            description: {
              type: 'string',
              description: 'Category description (HTML supported).',
            },
            is_visible: {
              type: 'boolean',
              description: 'Whether the category is visible in the storefront (default: true).',
            },
            sort_order: {
              type: 'number',
              description: 'Sort order relative to sibling categories.',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_orders',
        description: 'List BigCommerce orders with optional filters for status, customer, date range, and minimum total. Supports pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            limit: {
              type: 'number',
              description: 'Orders per page (default: 50, max: 250).',
            },
            status_id: {
              type: 'number',
              description: 'Filter by order status ID (0=incomplete, 1=pending, 2=shipped, 3=partially shipped, 5=complete, 7=cancelled, 11=awaiting fulfillment, etc.).',
            },
            customer_id: {
              type: 'number',
              description: 'Filter orders by customer ID.',
            },
            min_date_created: {
              type: 'string',
              description: 'Filter orders created on or after this RFC 2822 date (e.g. "Mon, 20 Jan 2025 00:00:00 +0000").',
            },
            max_date_created: {
              type: 'string',
              description: 'Filter orders created on or before this RFC 2822 date.',
            },
            min_total: {
              type: 'number',
              description: 'Filter orders with a total greater than or equal to this value.',
            },
            sort: {
              type: 'string',
              description: 'Sort field: date_created, date_modified, id, total (default: date_created).',
            },
            direction: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc).',
            },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Get full details of a single BigCommerce order by its ID, including billing, shipping, and product line items.',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'Numeric ID of the order.',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'update_order',
        description: 'Update the status or other fields of an existing BigCommerce order by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'Numeric ID of the order to update.',
            },
            status_id: {
              type: 'number',
              description: 'New order status ID (e.g. 2=shipped, 5=complete, 7=cancelled).',
            },
            staff_notes: {
              type: 'string',
              description: 'Internal staff notes to attach to the order.',
            },
            customer_message: {
              type: 'string',
              description: 'Customer-facing message to add to the order.',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'list_order_products',
        description: 'List the line items (products) in a specific BigCommerce order.',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'Order ID to list products for.',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'list_customers',
        description: 'List BigCommerce customers with optional filters for email, name, company, and registration date. Supports pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            limit: {
              type: 'number',
              description: 'Customers per page (default: 50, max: 250).',
            },
            email: {
              type: 'string',
              description: 'Filter customers by exact email address.',
            },
            first_name: {
              type: 'string',
              description: 'Filter customers by first name (partial match).',
            },
            last_name: {
              type: 'string',
              description: 'Filter customers by last name (partial match).',
            },
            company: {
              type: 'string',
              description: 'Filter customers by company name.',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get full details of a single BigCommerce customer by their customer ID.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'number',
              description: 'Numeric ID of the customer.',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer record in BigCommerce with name, email, and optional phone and company details.',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Customer email address (must be unique in the store).',
            },
            first_name: {
              type: 'string',
              description: 'Customer first name.',
            },
            last_name: {
              type: 'string',
              description: 'Customer last name.',
            },
            phone: {
              type: 'string',
              description: 'Customer phone number.',
            },
            company: {
              type: 'string',
              description: 'Customer company or organization name.',
            },
          },
          required: ['email', 'first_name', 'last_name'],
        },
      },
      {
        name: 'update_customer',
        description: 'Update an existing BigCommerce customer by their ID. Send only the fields to change.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'number',
              description: 'Numeric ID of the customer to update.',
            },
            email: {
              type: 'string',
              description: 'Updated email address.',
            },
            first_name: {
              type: 'string',
              description: 'Updated first name.',
            },
            last_name: {
              type: 'string',
              description: 'Updated last name.',
            },
            phone: {
              type: 'string',
              description: 'Updated phone number.',
            },
            company: {
              type: 'string',
              description: 'Updated company name.',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'delete_customer',
        description: 'Permanently delete a customer record from BigCommerce by their ID.',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'number',
              description: 'Numeric ID of the customer to delete.',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'list_coupons',
        description: 'List discount coupons in the store with optional filters for type, code, and enabled status.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1).',
            },
            limit: {
              type: 'number',
              description: 'Coupons per page (default: 50, max: 250).',
            },
            code: {
              type: 'string',
              description: 'Filter by exact coupon code.',
            },
            type: {
              type: 'string',
              description: 'Filter by discount type: per_item_discount, percentage_discount, per_total_discount, shipping_discount, free_shipping.',
            },
            enabled: {
              type: 'boolean',
              description: 'Filter to enabled (true) or disabled (false) coupons.',
            },
          },
        },
      },
      {
        name: 'create_coupon',
        description: 'Create a new discount coupon in BigCommerce with a code, discount type, amount, and usage limits.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Internal name for the coupon.',
            },
            code: {
              type: 'string',
              description: 'Customer-facing coupon code (case-insensitive at checkout).',
            },
            type: {
              type: 'string',
              description: 'Discount type: per_item_discount, percentage_discount, per_total_discount, shipping_discount, free_shipping.',
            },
            amount: {
              type: 'number',
              description: 'Discount amount (dollar value for fixed types, percentage value for percentage_discount).',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the coupon is active (default: true).',
            },
            max_uses: {
              type: 'number',
              description: 'Maximum total number of times this coupon can be used (0 = unlimited).',
            },
            max_uses_per_customer: {
              type: 'number',
              description: 'Maximum times a single customer can use this coupon (0 = unlimited).',
            },
            min_purchase: {
              type: 'number',
              description: 'Minimum order total required for the coupon to apply.',
            },
            expires: {
              type: 'string',
              description: 'Expiration date/time in ISO 8601 format (e.g. "2026-12-31T23:59:59").',
            },
          },
          required: ['name', 'code', 'type', 'amount'],
        },
      },
      {
        name: 'delete_coupon',
        description: 'Permanently delete a discount coupon from BigCommerce by its coupon ID.',
        inputSchema: {
          type: 'object',
          properties: {
            coupon_id: {
              type: 'number',
              description: 'Numeric ID of the coupon to delete.',
            },
          },
          required: ['coupon_id'],
        },
      },
      {
        name: 'get_store_info',
        description: 'Get BigCommerce store metadata: store name, domain, address, currency, timezone, language, and plan information.',
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
        case 'list_products':
          return this.listProducts(args);
        case 'get_product':
          return this.getProduct(args);
        case 'create_product':
          return this.createProduct(args);
        case 'update_product':
          return this.updateProduct(args);
        case 'delete_product':
          return this.deleteProduct(args);
        case 'list_product_variants':
          return this.listProductVariants(args);
        case 'get_product_variant':
          return this.getProductVariant(args);
        case 'list_categories':
          return this.listCategories(args);
        case 'get_category':
          return this.getCategory(args);
        case 'create_category':
          return this.createCategory(args);
        case 'list_orders':
          return this.listOrders(args);
        case 'get_order':
          return this.getOrder(args);
        case 'update_order':
          return this.updateOrder(args);
        case 'list_order_products':
          return this.listOrderProducts(args);
        case 'list_customers':
          return this.listCustomers(args);
        case 'get_customer':
          return this.getCustomer(args);
        case 'create_customer':
          return this.createCustomer(args);
        case 'update_customer':
          return this.updateCustomer(args);
        case 'delete_customer':
          return this.deleteCustomer(args);
        case 'list_coupons':
          return this.listCoupons(args);
        case 'create_coupon':
          return this.createCoupon(args);
        case 'delete_coupon':
          return this.deleteCoupon(args);
        case 'get_store_info':
          return this.getStoreInfo();
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

  // ── HTTP helpers ──────────────────────────────────────────────────────────

  private get headers(): Record<string, string> {
    return {
      'X-Auth-Token': this.apiToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async bcGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const qs = params && Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bcPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bcPut(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bcDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, status: response.status }) }], isError: false };
  }

  // ── Product methods ───────────────────────────────────────────────────────

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      limit: String((args.limit as number) || 50),
    };
    if (args.keyword) params['keyword'] = args.keyword as string;
    if (args.availability) params['availability'] = args.availability as string;
    if (typeof args.is_visible === 'boolean') params['is_visible'] = String(args.is_visible);
    if (args.category_id) params['categories:in'] = String(args.category_id);
    if (args.brand_id) params['brand_id'] = String(args.brand_id);
    if (args.include) params['include'] = args.include as string;
    if (args.sort) params['sort'] = args.sort as string;
    if (args.direction) params['direction'] = args.direction as string;
    return this.bcGet('/v3/catalog/products', params);
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.include) params['include'] = args.include as string;
    return this.bcGet(`/v3/catalog/products/${encodeURIComponent(args.product_id as string)}`, params);
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || args.price === undefined || args.weight === undefined || !args.type) {
      return { content: [{ type: 'text', text: 'name, type, price, and weight are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      type: args.type,
      price: args.price,
      weight: args.weight,
    };
    if (args.sku) body['sku'] = args.sku;
    if (args.description) body['description'] = args.description;
    if (typeof args.is_visible === 'boolean') body['is_visible'] = args.is_visible;
    if (args.availability) body['availability'] = args.availability;
    if (args.inventory_level !== undefined) body['inventory_level'] = args.inventory_level;
    if (args.inventory_tracking) body['inventory_tracking'] = args.inventory_tracking;
    if (args.categories) {
      try { body['categories'] = JSON.parse(args.categories as string); } catch { /* ignore */ }
    }
    return this.bcPost('/v3/catalog/products', body);
  }

  private async updateProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body['name'] = args.name;
    if (args.price !== undefined) body['price'] = args.price;
    if (args.description) body['description'] = args.description;
    if (typeof args.is_visible === 'boolean') body['is_visible'] = args.is_visible;
    if (args.availability) body['availability'] = args.availability;
    if (args.inventory_level !== undefined) body['inventory_level'] = args.inventory_level;
    if (args.categories) {
      try { body['categories'] = JSON.parse(args.categories as string); } catch { /* ignore */ }
    }
    return this.bcPut(`/v3/catalog/products/${encodeURIComponent(args.product_id as string)}`, body);
  }

  private async deleteProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    return this.bcDelete(`/v3/catalog/products/${encodeURIComponent(args.product_id as string)}`);
  }

  private async listProductVariants(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      limit: String((args.limit as number) || 50),
    };
    return this.bcGet(`/v3/catalog/products/${encodeURIComponent(args.product_id as string)}/variants`, params);
  }

  private async getProductVariant(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id || !args.variant_id) return { content: [{ type: 'text', text: 'product_id and variant_id are required' }], isError: true };
    return this.bcGet(`/v3/catalog/products/${encodeURIComponent(args.product_id as string)}/variants/${encodeURIComponent(args.variant_id as string)}`);
  }

  // ── Category methods ──────────────────────────────────────────────────────

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      limit: String((args.limit as number) || 50),
    };
    if (args.parent_id !== undefined) params['parent_id'] = String(args.parent_id);
    if (typeof args.is_visible === 'boolean') params['is_visible'] = String(args.is_visible);
    return this.bcGet('/v3/catalog/categories', params);
  }

  private async getCategory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.category_id) return { content: [{ type: 'text', text: 'category_id is required' }], isError: true };
    return this.bcGet(`/v3/catalog/categories/${encodeURIComponent(args.category_id as string)}`);
  }

  private async createCategory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = {
      name: args.name,
      parent_id: (args.parent_id as number) ?? 0,
    };
    if (args.description) body['description'] = args.description;
    if (typeof args.is_visible === 'boolean') body['is_visible'] = args.is_visible;
    if (args.sort_order !== undefined) body['sort_order'] = args.sort_order;
    return this.bcPost('/v3/catalog/categories', body);
  }

  // ── Order methods ─────────────────────────────────────────────────────────

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      limit: String((args.limit as number) || 50),
    };
    if (args.status_id !== undefined) params['status_id'] = String(args.status_id);
    if (args.customer_id) params['customer_id'] = String(args.customer_id);
    if (args.min_date_created) params['min_date_created'] = args.min_date_created as string;
    if (args.max_date_created) params['max_date_created'] = args.max_date_created as string;
    if (args.min_total !== undefined) params['min_total'] = String(args.min_total);
    if (args.sort) params['sort'] = args.sort as string;
    if (args.direction) params['direction'] = args.direction as string;
    return this.bcGet('/v2/orders', params);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    return this.bcGet(`/v2/orders/${encodeURIComponent(args.order_id as string)}`);
  }

  private async updateOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.status_id !== undefined) body['status_id'] = args.status_id;
    if (args.staff_notes) body['staff_notes'] = args.staff_notes;
    if (args.customer_message) body['customer_message'] = args.customer_message;
    return this.bcPut(`/v2/orders/${encodeURIComponent(args.order_id as string)}`, body);
  }

  private async listOrderProducts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    return this.bcGet(`/v2/orders/${encodeURIComponent(args.order_id as string)}/products`);
  }

  // ── Customer methods ──────────────────────────────────────────────────────

  private async listCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      limit: String((args.limit as number) || 50),
    };
    if (args.email) params['email'] = args.email as string;
    if (args.first_name) params['first_name'] = args.first_name as string;
    if (args.last_name) params['last_name'] = args.last_name as string;
    if (args.company) params['company'] = args.company as string;
    return this.bcGet('/v3/customers', params);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    return this.bcGet('/v3/customers', { 'id:in': String(args.customer_id) });
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.first_name || !args.last_name) {
      return { content: [{ type: 'text', text: 'email, first_name, and last_name are required' }], isError: true };
    }
    const customer: Record<string, unknown> = {
      email: args.email,
      first_name: args.first_name,
      last_name: args.last_name,
    };
    if (args.phone) customer['phone'] = args.phone;
    if (args.company) customer['company'] = args.company;
    // v3 POST /customers expects a bare JSON array body, not an object wrapper
    const response = await this.fetchWithRetry(`${this.baseUrl}/v3/customers`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify([customer]),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const customer: Record<string, unknown> = { id: args.customer_id };
    if (args.email) customer['email'] = args.email;
    if (args.first_name) customer['first_name'] = args.first_name;
    if (args.last_name) customer['last_name'] = args.last_name;
    if (args.phone) customer['phone'] = args.phone;
    if (args.company) customer['company'] = args.company;

    const response = await this.fetchWithRetry(`${this.baseUrl}/v3/customers`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify([customer]),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    return this.bcDelete(`/v3/customers?id:in=${encodeURIComponent(args.customer_id as string)}`);
  }

  // ── Coupon methods ────────────────────────────────────────────────────────

  private async listCoupons(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page: String((args.page as number) || 1),
      limit: String((args.limit as number) || 50),
    };
    if (args.code) params['code'] = args.code as string;
    if (args.type) params['type'] = args.type as string;
    if (typeof args.enabled === 'boolean') params['enabled'] = String(args.enabled);
    return this.bcGet('/v2/coupons', params);
  }

  private async createCoupon(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.code || !args.type || args.amount === undefined) {
      return { content: [{ type: 'text', text: 'name, code, type, and amount are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      code: args.code,
      type: args.type,
      amount: String(args.amount),
      enabled: typeof args.enabled === 'boolean' ? args.enabled : true,
    };
    if (args.max_uses !== undefined) body['max_uses'] = args.max_uses;
    if (args.max_uses_per_customer !== undefined) body['max_uses_per_customer'] = args.max_uses_per_customer;
    if (args.min_purchase !== undefined) body['min_purchase'] = String(args.min_purchase);
    if (args.expires) body['expires'] = args.expires;
    return this.bcPost('/v2/coupons', body);
  }

  private async deleteCoupon(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.coupon_id) return { content: [{ type: 'text', text: 'coupon_id is required' }], isError: true };
    return this.bcDelete(`/v2/coupons/${encodeURIComponent(args.coupon_id as string)}`);
  }

  // ── Store info ────────────────────────────────────────────────────────────

  private async getStoreInfo(): Promise<ToolResult> {
    return this.bcGet('/v2/store');
  }
}
