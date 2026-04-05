/**
 * Magento (Adobe Commerce) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Adobe-published Magento/Adobe Commerce MCP server exists on GitHub or npmjs.com.
// Community-built servers (rafaelstz/adobe-commerce-dev-mcp, Codexpect/adobe-commerce-mcp) use
// GraphQL only and are not published by Adobe — not official. Decision: use-rest-api.
// This adapter covers REST API V1: 18 tools (products, categories, orders, customers, inventory).
//
// Base URL: https://{your-store}/rest/V1  (self-hosted; no single global base URL)
// Auth: Bearer token via POST /V1/integration/admin/token (username + password → token)
//       or long-lived Integration access token from Magento Admin > System > Integrations.
//       For Adobe Commerce as a Cloud Service, IMS OAuth2 is required instead.
// Docs: https://developer.adobe.com/commerce/webapi/rest/
// Rate limits: No global documented limit; site-level configuration.
//              Default page size limit: 300 items/page. Input list limit: 20 entities by default.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MagentoConfig {
  accessToken: string;
  baseUrl: string;  // e.g. https://store.example.com/rest/V1
}

export class MagentoMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: MagentoConfig) {
    super();
    this.token = config.accessToken;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'magento',
      displayName: 'Magento (Adobe Commerce)',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'magento', 'adobe commerce', 'ecommerce', 'e-commerce', 'store', 'product', 'catalog',
        'order', 'customer', 'cart', 'inventory', 'category', 'sku', 'checkout', 'shipment',
        'invoice', 'refund', 'coupon', 'stock',
      ],
      toolNames: [
        'search_products', 'get_product', 'create_product', 'update_product', 'delete_product',
        'list_categories', 'get_category', 'search_orders', 'get_order', 'cancel_order',
        'create_invoice', 'create_shipment', 'create_credit_memo',
        'search_customers', 'get_customer', 'create_customer', 'update_customer',
        'get_stock_item',
      ],
      description: 'Adobe Commerce / Magento 2 store management: browse and manage products, categories, orders, customers, inventory, invoices, and shipments via REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_products',
        description: 'Search the product catalog by SKU, name, price range, category, or custom attributes with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            search_query: {
              type: 'string',
              description: 'Full-text search query against product name and description',
            },
            sku: {
              type: 'string',
              description: 'Filter by exact SKU or SKU prefix',
            },
            category_id: {
              type: 'number',
              description: 'Filter products to a specific category ID',
            },
            status: {
              type: 'number',
              description: 'Product status: 1=Enabled, 2=Disabled (default: no filter)',
            },
            page_size: {
              type: 'number',
              description: 'Number of products per page (default: 20, max: 300)',
            },
            current_page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Get full details for a single product by SKU including attributes, images, stock, and pricing',
        inputSchema: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              description: 'Product SKU (URL-encoded if it contains special characters)',
            },
          },
          required: ['sku'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a new product in the catalog with name, SKU, price, type, and attribute set',
        inputSchema: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              description: 'Unique SKU for the product',
            },
            name: {
              type: 'string',
              description: 'Product display name',
            },
            price: {
              type: 'number',
              description: 'Base price of the product',
            },
            attribute_set_id: {
              type: 'number',
              description: 'Attribute set ID (default: 4 for Default)',
            },
            type_id: {
              type: 'string',
              description: 'Product type: simple, virtual, downloadable, grouped, bundle, configurable (default: simple)',
            },
            status: {
              type: 'number',
              description: 'Product status: 1=Enabled, 2=Disabled (default: 1)',
            },
            visibility: {
              type: 'number',
              description: 'Visibility: 1=Not Visible, 2=Catalog, 3=Search, 4=Catalog+Search (default: 4)',
            },
            weight: {
              type: 'number',
              description: 'Product weight (required for physical products)',
            },
          },
          required: ['sku', 'name', 'price', 'attribute_set_id'],
        },
      },
      {
        name: 'update_product',
        description: 'Update an existing product by SKU — modify name, price, status, stock, or custom attributes',
        inputSchema: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              description: 'SKU of the product to update',
            },
            name: {
              type: 'string',
              description: 'New product name',
            },
            price: {
              type: 'number',
              description: 'New price',
            },
            status: {
              type: 'number',
              description: 'New status: 1=Enabled, 2=Disabled',
            },
            visibility: {
              type: 'number',
              description: 'New visibility: 1=Not Visible, 2=Catalog, 3=Search, 4=Catalog+Search',
            },
          },
          required: ['sku'],
        },
      },
      {
        name: 'delete_product',
        description: 'Delete a product from the catalog by SKU — this action is permanent and cannot be undone',
        inputSchema: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              description: 'SKU of the product to delete',
            },
          },
          required: ['sku'],
        },
      },
      {
        name: 'list_categories',
        description: 'List all product categories in the catalog tree with parent-child relationships',
        inputSchema: {
          type: 'object',
          properties: {
            root_category_id: {
              type: 'number',
              description: 'Start traversal from this category ID (default: root of entire tree)',
            },
            depth: {
              type: 'number',
              description: 'Maximum depth of the category tree to return (default: no limit)',
            },
          },
        },
      },
      {
        name: 'get_category',
        description: 'Get details and product assignments for a specific category by ID',
        inputSchema: {
          type: 'object',
          properties: {
            category_id: {
              type: 'number',
              description: 'Category ID to retrieve',
            },
          },
          required: ['category_id'],
        },
      },
      {
        name: 'search_orders',
        description: 'Search orders by status, customer email, date range, or order ID with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by order status: pending, processing, complete, canceled, closed, holded',
            },
            customer_email: {
              type: 'string',
              description: 'Filter by customer email address',
            },
            date_from: {
              type: 'string',
              description: 'Return orders created on or after this date (ISO 8601: 2024-01-01 00:00:00)',
            },
            date_to: {
              type: 'string',
              description: 'Return orders created on or before this date (ISO 8601: 2024-12-31 23:59:59)',
            },
            page_size: {
              type: 'number',
              description: 'Number of orders per page (default: 20, max: 300)',
            },
            current_page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Get full details of a single order by order ID including items, shipping, payment, and status history',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'Magento order ID (entity_id)',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'cancel_order',
        description: 'Cancel a pending or processing order by order ID — only orders not yet shipped can be canceled',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'Order ID to cancel',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create an invoice for an order to mark it as paid and trigger fulfillment workflow',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'Order ID to invoice',
            },
            capture: {
              type: 'boolean',
              description: 'Capture payment online if supported by payment method (default: false)',
            },
            notify: {
              type: 'boolean',
              description: 'Send invoice email notification to the customer (default: false)',
            },
            comment: {
              type: 'string',
              description: 'Optional comment to include on the invoice',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'create_shipment',
        description: 'Create a shipment for an invoiced order with tracking number and carrier information',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'Order ID to create shipment for',
            },
            carrier_code: {
              type: 'string',
              description: 'Carrier code (e.g. ups, usps, fedex, dhl)',
            },
            title: {
              type: 'string',
              description: 'Carrier display title (e.g. UPS, USPS, FedEx)',
            },
            track_number: {
              type: 'string',
              description: 'Tracking number for the shipment',
            },
            notify: {
              type: 'boolean',
              description: 'Send shipment confirmation email to customer (default: false)',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'create_credit_memo',
        description: 'Create a credit memo (refund) for an invoiced order with optional return-to-stock',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'number',
              description: 'Order ID to refund',
            },
            refund_shipping: {
              type: 'number',
              description: 'Amount to refund for shipping (0 to skip)',
            },
            adjustment_positive: {
              type: 'number',
              description: 'Additional positive adjustment amount to refund',
            },
            adjustment_negative: {
              type: 'number',
              description: 'Fee to deduct from refund (negative adjustment)',
            },
            notify: {
              type: 'boolean',
              description: 'Send credit memo email to customer (default: false)',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'search_customers',
        description: 'Search customers by email, name, group, or creation date with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Filter by customer email address (exact match)',
            },
            firstname: {
              type: 'string',
              description: 'Filter by customer first name',
            },
            lastname: {
              type: 'string',
              description: 'Filter by customer last name',
            },
            group_id: {
              type: 'number',
              description: 'Filter by customer group ID (0=General, 1=Wholesale, etc.)',
            },
            page_size: {
              type: 'number',
              description: 'Number of customers per page (default: 20, max: 300)',
            },
            current_page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_customer',
        description: 'Get full profile details for a customer by customer ID including addresses and group',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'number',
              description: 'Magento customer ID',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'create_customer',
        description: 'Create a new customer account with email, name, and optional password',
        inputSchema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Customer email address (must be unique)',
            },
            firstname: {
              type: 'string',
              description: 'Customer first name',
            },
            lastname: {
              type: 'string',
              description: 'Customer last name',
            },
            group_id: {
              type: 'number',
              description: 'Customer group ID (default: 1=General)',
            },
            store_id: {
              type: 'number',
              description: 'Store view ID the customer belongs to (default: 1)',
            },
            website_id: {
              type: 'number',
              description: 'Website ID the customer belongs to (default: 1)',
            },
          },
          required: ['email', 'firstname', 'lastname'],
        },
      },
      {
        name: 'update_customer',
        description: 'Update an existing customer profile by customer ID — modify name, email, group, or store assignment',
        inputSchema: {
          type: 'object',
          properties: {
            customer_id: {
              type: 'number',
              description: 'Customer ID to update',
            },
            email: {
              type: 'string',
              description: 'New email address',
            },
            firstname: {
              type: 'string',
              description: 'New first name',
            },
            lastname: {
              type: 'string',
              description: 'New last name',
            },
            group_id: {
              type: 'number',
              description: 'New customer group ID',
            },
          },
          required: ['customer_id'],
        },
      },
      {
        name: 'get_stock_item',
        description: 'Get inventory stock information for a product by SKU including quantity, in-stock status, and backorder settings',
        inputSchema: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              description: 'Product SKU to check inventory for',
            },
          },
          required: ['sku'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_products':
          return this.searchProducts(args);
        case 'get_product':
          return this.getProduct(args);
        case 'create_product':
          return this.createProduct(args);
        case 'update_product':
          return this.updateProduct(args);
        case 'delete_product':
          return this.deleteProduct(args);
        case 'list_categories':
          return this.listCategories(args);
        case 'get_category':
          return this.getCategory(args);
        case 'search_orders':
          return this.searchOrders(args);
        case 'get_order':
          return this.getOrder(args);
        case 'cancel_order':
          return this.cancelOrder(args);
        case 'create_invoice':
          return this.createInvoice(args);
        case 'create_shipment':
          return this.createShipment(args);
        case 'create_credit_memo':
          return this.createCreditMemo(args);
        case 'search_customers':
          return this.searchCustomers(args);
        case 'get_customer':
          return this.getCustomer(args);
        case 'create_customer':
          return this.createCustomer(args);
        case 'update_customer':
          return this.updateCustomer(args);
        case 'get_stock_item':
          return this.getStockItem(args);
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
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private buildSearchCriteria(filters: Array<{ field: string; value: unknown; conditionType?: string }>): string {
    const params = new URLSearchParams();
    filters.forEach((f, i) => {
      params.set(`searchCriteria[filterGroups][${i}][filters][0][field]`, f.field);
      params.set(`searchCriteria[filterGroups][${i}][filters][0][value]`, String(f.value));
      params.set(`searchCriteria[filterGroups][${i}][filters][0][conditionType]`, f.conditionType ?? 'eq');
    });
    return params.toString();
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
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

  private async searchProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) ?? 20;
    const currentPage = (args.current_page as number) ?? 1;
    const filters: Array<{ field: string; value: unknown; conditionType?: string }> = [];

    if (args.sku) filters.push({ field: 'sku', value: args.sku, conditionType: 'like' });
    if (args.category_id) filters.push({ field: 'category_id', value: args.category_id });
    if (typeof args.status === 'number') filters.push({ field: 'status', value: args.status });

    let qs = this.buildSearchCriteria(filters);
    qs += `&searchCriteria[pageSize]=${pageSize}&searchCriteria[currentPage]=${currentPage}`;
    if (args.search_query) qs += `&searchCriteria[requestName]=quick_search_container&searchCriteria[filterGroups][99][filters][0][field]=search_term&searchCriteria[filterGroups][99][filters][0][value]=${encodeURIComponent(args.search_query as string)}`;

    return this.apiGet(`/products?${qs}`);
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sku) return { content: [{ type: 'text', text: 'sku is required' }], isError: true };
    return this.apiGet(`/products/${encodeURIComponent(args.sku as string)}`);
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sku || !args.name || args.price === undefined || !args.attribute_set_id) {
      return { content: [{ type: 'text', text: 'sku, name, price, and attribute_set_id are required' }], isError: true };
    }
    const product: Record<string, unknown> = {
      sku: args.sku,
      name: args.name,
      price: args.price,
      attribute_set_id: args.attribute_set_id,
      type_id: (args.type_id as string) ?? 'simple',
      status: (args.status as number) ?? 1,
      visibility: (args.visibility as number) ?? 4,
    };
    if (args.weight !== undefined) product.weight = args.weight;
    return this.apiPost('/products', { product });
  }

  private async updateProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sku) return { content: [{ type: 'text', text: 'sku is required' }], isError: true };
    const product: Record<string, unknown> = { sku: args.sku };
    if (args.name !== undefined) product.name = args.name;
    if (args.price !== undefined) product.price = args.price;
    if (args.status !== undefined) product.status = args.status;
    if (args.visibility !== undefined) product.visibility = args.visibility;
    return this.apiPut(`/products/${encodeURIComponent(args.sku as string)}`, { product });
  }

  private async deleteProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sku) return { content: [{ type: 'text', text: 'sku is required' }], isError: true };
    return this.apiDelete(`/products/${encodeURIComponent(args.sku as string)}`);
  }

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    let path = '/categories';
    const params: string[] = [];
    if (args.root_category_id) params.push(`rootCategoryId=${encodeURIComponent(args.root_category_id as string)}`);
    if (args.depth) params.push(`depth=${encodeURIComponent(args.depth as string)}`);
    if (params.length) path += '?' + params.join('&');
    return this.apiGet(path);
  }

  private async getCategory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.category_id) return { content: [{ type: 'text', text: 'category_id is required' }], isError: true };
    return this.apiGet(`/categories/${encodeURIComponent(args.category_id as string)}`);
  }

  private async searchOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) ?? 20;
    const currentPage = (args.current_page as number) ?? 1;
    const filters: Array<{ field: string; value: unknown; conditionType?: string }> = [];

    if (args.status) filters.push({ field: 'status', value: args.status });
    if (args.customer_email) filters.push({ field: 'customer_email', value: args.customer_email });
    if (args.date_from) filters.push({ field: 'created_at', value: args.date_from, conditionType: 'gteq' });
    if (args.date_to) filters.push({ field: 'created_at', value: args.date_to, conditionType: 'lteq' });

    let qs = this.buildSearchCriteria(filters);
    qs += `&searchCriteria[pageSize]=${pageSize}&searchCriteria[currentPage]=${currentPage}`;
    return this.apiGet(`/orders?${qs}`);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    return this.apiGet(`/orders/${encodeURIComponent(args.order_id as string)}`);
  }

  private async cancelOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    return this.apiPost(`/orders/${encodeURIComponent(args.order_id as string)}/cancel`, {});
  }

  private async createInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (typeof args.capture === 'boolean') body.capture = args.capture;
    if (typeof args.notify === 'boolean') body.notify = args.notify;
    if (args.comment) body.comment = { comment: args.comment };
    return this.apiPost(`/order/${encodeURIComponent(args.order_id as string)}/invoice`, body);
  }

  private async createShipment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (typeof args.notify === 'boolean') body.notify = args.notify;
    if (args.carrier_code && args.track_number) {
      body.tracks = [{
        carrier_code: args.carrier_code,
        title: (args.title as string) ?? String(args.carrier_code),
        track_number: args.track_number,
      }];
    }
    return this.apiPost(`/order/${encodeURIComponent(args.order_id as string)}/ship`, body);
  }

  private async createCreditMemo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    const items: Record<string, unknown> = {};
    if (args.refund_shipping !== undefined) items.shipping_amount = args.refund_shipping;
    if (args.adjustment_positive !== undefined) items.adjustment_positive = args.adjustment_positive;
    if (args.adjustment_negative !== undefined) items.adjustment_negative = args.adjustment_negative;
    if (Object.keys(items).length) body.items = items;
    if (typeof args.notify === 'boolean') body.notify = args.notify;
    return this.apiPost(`/order/${encodeURIComponent(args.order_id as string)}/refund`, body);
  }

  private async searchCustomers(args: Record<string, unknown>): Promise<ToolResult> {
    const pageSize = (args.page_size as number) ?? 20;
    const currentPage = (args.current_page as number) ?? 1;
    const filters: Array<{ field: string; value: unknown; conditionType?: string }> = [];

    if (args.email) filters.push({ field: 'email', value: args.email });
    if (args.firstname) filters.push({ field: 'firstname', value: `%${encodeURIComponent(args.firstname as string)}%`, conditionType: 'like' });
    if (args.lastname) filters.push({ field: 'lastname', value: `%${encodeURIComponent(args.lastname as string)}%`, conditionType: 'like' });
    if (args.group_id !== undefined) filters.push({ field: 'group_id', value: args.group_id });

    let qs = this.buildSearchCriteria(filters);
    qs += `&searchCriteria[pageSize]=${pageSize}&searchCriteria[currentPage]=${currentPage}`;
    return this.apiGet(`/customers/search?${qs}`);
  }

  private async getCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    return this.apiGet(`/customers/${encodeURIComponent(args.customer_id as string)}`);
  }

  private async createCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.email || !args.firstname || !args.lastname) {
      return { content: [{ type: 'text', text: 'email, firstname, and lastname are required' }], isError: true };
    }
    const customer: Record<string, unknown> = {
      email: args.email,
      firstname: args.firstname,
      lastname: args.lastname,
      group_id: (args.group_id as number) ?? 1,
      store_id: (args.store_id as number) ?? 1,
      website_id: (args.website_id as number) ?? 1,
    };
    return this.apiPost('/customers', { customer });
  }

  private async updateCustomer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.customer_id) return { content: [{ type: 'text', text: 'customer_id is required' }], isError: true };
    const customer: Record<string, unknown> = { id: args.customer_id };
    if (args.email !== undefined) customer.email = args.email;
    if (args.firstname !== undefined) customer.firstname = args.firstname;
    if (args.lastname !== undefined) customer.lastname = args.lastname;
    if (args.group_id !== undefined) customer.group_id = args.group_id;
    return this.apiPut(`/customers/${encodeURIComponent(args.customer_id as string)}`, { customer });
  }

  private async getStockItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.sku) return { content: [{ type: 'text', text: 'sku is required' }], isError: true };
    return this.apiGet(`/stockItems/${encodeURIComponent(args.sku as string)}`);
  }
}
