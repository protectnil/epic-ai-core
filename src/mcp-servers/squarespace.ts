/**
 * Squarespace MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Squarespace MCP server was found on GitHub or in Squarespace's developer documentation.
//
// Base URL: https://api.squarespace.com/1.0
// Auth: Bearer token in Authorization header — API key from Settings > Advanced > Developer API Keys, or OAuth2 access token
// Docs: https://developers.squarespace.com/commerce-apis/overview
// Rate limits: Not publicly documented; use conservative request pacing

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SquarespaceConfig {
  apiKey: string;
  baseUrl?: string;
}

export class SquarespaceMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SquarespaceConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.squarespace.com/1.0';
  }

  static catalog() {
    return {
      name: 'squarespace',
      displayName: 'Squarespace',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'squarespace', 'ecommerce', 'orders', 'products', 'inventory', 'customers',
        'profiles', 'transactions', 'webhooks', 'store', 'commerce', 'website',
      ],
      toolNames: [
        'get_site_info', 'list_orders', 'get_order', 'fulfill_order',
        'list_products', 'get_product', 'create_product', 'update_product', 'delete_product',
        'list_inventory', 'update_inventory', 'list_profiles', 'get_profile',
        'list_transactions', 'list_webhook_subscriptions', 'create_webhook_subscription', 'delete_webhook_subscription',
      ],
      description: 'Squarespace Commerce API: manage orders, products, inventory, customer profiles, and transactions for a Squarespace store.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_site_info',
        description: 'Retrieve basic information about the Squarespace site including title, timezone, and language settings',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_orders',
        description: 'List store orders with optional filters for fulfillment status, date range, and pagination cursor',
        inputSchema: {
          type: 'object',
          properties: {
            fulfillmentStatus: {
              type: 'string',
              description: 'Filter by fulfillment status: PENDING, FULFILLED, CANCELED (default: all)',
            },
            modifiedAfter: {
              type: 'string',
              description: 'Return orders modified after this ISO 8601 datetime (e.g. 2026-01-01T00:00:00Z)',
            },
            modifiedBefore: {
              type: 'string',
              description: 'Return orders modified before this ISO 8601 datetime',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response for fetching the next page',
            },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Get detailed information about a specific order by its order ID including line items and fulfillment data',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'Squarespace order ID (UUID format)',
            },
          },
          required: ['order_id'],
        },
      },
      {
        name: 'fulfill_order',
        description: 'Mark an order or specific line items as fulfilled and optionally send a shipment notification to the customer',
        inputSchema: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'Squarespace order ID to fulfill',
            },
            shipments: {
              type: 'array',
              description: 'Array of shipment objects with trackingNumber, trackingUrl, carrierName, and lineItems',
            },
            sendNotification: {
              type: 'boolean',
              description: 'Send shipment notification email to the customer (default: true)',
            },
          },
          required: ['order_id', 'shipments'],
        },
      },
      {
        name: 'list_products',
        description: 'List all products in the Squarespace store with optional type filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by product type: PHYSICAL, DIGITAL, SERVICE, GIFT_CARD (default: all)',
            },
            modifiedAfter: {
              type: 'string',
              description: 'Return products modified after this ISO 8601 datetime',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_product',
        description: 'Get full details of a specific product including variants, pricing, and stock levels',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Squarespace product ID (UUID format)',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a new physical, digital, or service product in the Squarespace store',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Product type: PHYSICAL, DIGITAL, SERVICE, GIFT_CARD',
            },
            name: {
              type: 'string',
              description: 'Product display name',
            },
            description: {
              type: 'string',
              description: 'Product description (supports HTML)',
            },
            variants: {
              type: 'array',
              description: 'Array of variant objects with sku, priceMoney (amount, currency), and stockLevel',
            },
          },
          required: ['type', 'name', 'variants'],
        },
      },
      {
        name: 'update_product',
        description: 'Update an existing product name, description, or other attributes by product ID',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Squarespace product ID to update',
            },
            name: {
              type: 'string',
              description: 'Updated product name',
            },
            description: {
              type: 'string',
              description: 'Updated product description',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'delete_product',
        description: 'Delete a product from the Squarespace store by product ID — this action is irreversible',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Squarespace product ID to delete',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'list_inventory',
        description: 'List inventory levels for product variants with optional filter for unlimited-stock variants',
        inputSchema: {
          type: 'object',
          properties: {
            variantIds: {
              type: 'string',
              description: 'Comma-separated variant IDs to query (default: all variants)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'update_inventory',
        description: 'Adjust inventory quantity for one or more product variants using absolute or delta updates',
        inputSchema: {
          type: 'object',
          properties: {
            increments: {
              type: 'array',
              description: 'Array of inventory increment objects with variantId, quantity (positive or negative), and type: ABSOLUTE or RELATIVE',
            },
          },
          required: ['increments'],
        },
      },
      {
        name: 'list_profiles',
        description: 'List customer profiles (accounts, mailing list subscribers, and donors) with optional filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter by profile type: customer, subscriber, donor (default: all)',
            },
            modifiedAfter: {
              type: 'string',
              description: 'Return profiles modified after this ISO 8601 datetime',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'get_profile',
        description: 'Get detailed information about a specific customer profile by profile ID',
        inputSchema: {
          type: 'object',
          properties: {
            profile_id: {
              type: 'string',
              description: 'Squarespace customer profile ID (UUID format)',
            },
          },
          required: ['profile_id'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List financial transactions for orders and donations with optional date range filter',
        inputSchema: {
          type: 'object',
          properties: {
            modifiedAfter: {
              type: 'string',
              description: 'Return transactions after this ISO 8601 datetime',
            },
            modifiedBefore: {
              type: 'string',
              description: 'Return transactions before this ISO 8601 datetime',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'list_webhook_subscriptions',
        description: 'List all active webhook subscriptions configured for the Squarespace site',
        inputSchema: {
          type: 'object',
          properties: {
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
        },
      },
      {
        name: 'create_webhook_subscription',
        description: 'Subscribe to Squarespace events (orders, inventory, profiles) by registering a webhook endpoint URL',
        inputSchema: {
          type: 'object',
          properties: {
            endpointUrl: {
              type: 'string',
              description: 'HTTPS URL to receive webhook POST requests',
            },
            topics: {
              type: 'array',
              description: 'Array of event topics: order.create, order.update, inventory.update, profile.create, profile.update',
            },
          },
          required: ['endpointUrl', 'topics'],
        },
      },
      {
        name: 'delete_webhook_subscription',
        description: 'Remove a webhook subscription by its subscription ID to stop receiving event notifications',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'Webhook subscription ID to delete',
            },
          },
          required: ['webhook_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_site_info': return this.getSiteInfo();
        case 'list_orders': return this.listOrders(args);
        case 'get_order': return this.getOrder(args);
        case 'fulfill_order': return this.fulfillOrder(args);
        case 'list_products': return this.listProducts(args);
        case 'get_product': return this.getProduct(args);
        case 'create_product': return this.createProduct(args);
        case 'update_product': return this.updateProduct(args);
        case 'delete_product': return this.deleteProduct(args);
        case 'list_inventory': return this.listInventory(args);
        case 'update_inventory': return this.updateInventory(args);
        case 'list_profiles': return this.listProfiles(args);
        case 'get_profile': return this.getProfile(args);
        case 'list_transactions': return this.listTransactions(args);
        case 'list_webhook_subscriptions': return this.listWebhookSubscriptions(args);
        case 'create_webhook_subscription': return this.createWebhookSubscription(args);
        case 'delete_webhook_subscription': return this.deleteWebhookSubscription(args);
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
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
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

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async getSiteInfo(): Promise<ToolResult> {
    return this.apiGet('/site');
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.fulfillmentStatus) params.fulfillmentStatus = args.fulfillmentStatus as string;
    if (args.modifiedAfter) params.modifiedAfter = args.modifiedAfter as string;
    if (args.modifiedBefore) params.modifiedBefore = args.modifiedBefore as string;
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet('/commerce/orders', params);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id) return { content: [{ type: 'text', text: 'order_id is required' }], isError: true };
    return this.apiGet(`/commerce/orders/${encodeURIComponent(args.order_id as string)}`);
  }

  private async fulfillOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.order_id || !args.shipments) return { content: [{ type: 'text', text: 'order_id and shipments are required' }], isError: true };
    const body: Record<string, unknown> = { shipments: args.shipments };
    if (typeof args.sendNotification === 'boolean') body.sendNotification = args.sendNotification;
    return this.apiPost(`/commerce/orders/${encodeURIComponent(args.order_id as string)}/fulfillments`, body);
  }

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.type) params.type = args.type as string;
    if (args.modifiedAfter) params.modifiedAfter = args.modifiedAfter as string;
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet('/commerce/products', params);
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    return this.apiGet(`/commerce/products/${encodeURIComponent(args.product_id as string)}`);
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.type || !args.name || !args.variants) return { content: [{ type: 'text', text: 'type, name, and variants are required' }], isError: true };
    const body: Record<string, unknown> = {
      type: args.type,
      name: args.name,
      variants: args.variants,
    };
    if (args.description) body.description = args.description;
    return this.apiPost('/commerce/products', body);
  }

  private async updateProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body.name = args.name;
    if (args.description) body.description = args.description;
    return this.apiPost(`/commerce/products/${encodeURIComponent(args.product_id as string)}`, body);
  }

  private async deleteProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    return this.apiDelete(`/commerce/products/${encodeURIComponent(args.product_id as string)}`);
  }

  private async listInventory(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.variantIds) params.variantIds = args.variantIds as string;
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet('/commerce/inventory', params);
  }

  private async updateInventory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.increments) return { content: [{ type: 'text', text: 'increments is required' }], isError: true };
    return this.apiPost('/commerce/inventory', { increments: args.increments });
  }

  private async listProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.filter) params.filter = args.filter as string;
    if (args.modifiedAfter) params.modifiedAfter = args.modifiedAfter as string;
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet('/profiles', params);
  }

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.profile_id) return { content: [{ type: 'text', text: 'profile_id is required' }], isError: true };
    return this.apiGet(`/profiles/${encodeURIComponent(args.profile_id as string)}`);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.modifiedAfter) params.modifiedAfter = args.modifiedAfter as string;
    if (args.modifiedBefore) params.modifiedBefore = args.modifiedBefore as string;
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet('/commerce/transactions', params);
  }

  private async listWebhookSubscriptions(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.cursor) params.cursor = args.cursor as string;
    return this.apiGet('/webhook_subscriptions', params);
  }

  private async createWebhookSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.endpointUrl || !args.topics) return { content: [{ type: 'text', text: 'endpointUrl and topics are required' }], isError: true };
    return this.apiPost('/webhook_subscriptions', { endpointUrl: args.endpointUrl, topics: args.topics });
  }

  private async deleteWebhookSubscription(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.webhook_id) return { content: [{ type: 'text', text: 'webhook_id is required' }], isError: true };
    return this.apiDelete(`/webhook_subscriptions/${encodeURIComponent(args.webhook_id as string)}`);
  }
}
