/**
 * BeeZUP MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official BeeZUP MCP server was found on GitHub.
// Our adapter covers 10 tools across the most important BeeZUP Merchant API surfaces:
//   orders (list, get, change, harvest), channel catalogs (list, get, products, export),
//   stores (list, get), and analytics (reports by channel, category, product).
//
// Base URL: https://api.beezup.com
// Auth: API key in header Ocp-Apim-Subscription-Key
// Docs: https://api-docs.beezup.com/
// Rate limits: Contact BeeZUP. Batch operations max 100 items per call.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BeezupConfig {
  /** BeeZUP API subscription key (Ocp-Apim-Subscription-Key header) */
  apiKey: string;
  /** Optional base URL override (default: https://api.beezup.com) */
  baseUrl?: string;
}

export class BeezupMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: BeezupConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.beezup.com';
  }

  static catalog() {
    return {
      name: 'beezup',
      displayName: 'BeeZUP',
      version: '1.0.0',
      category: 'ecommerce',
      keywords: [
        'beezup', 'ecommerce', 'marketplace', 'orders', 'channel', 'catalog', 'products',
        'feed', 'export', 'merchant', 'channel catalog', 'analytics', 'store', 'inventory',
        'repricing', 'optimisation', 'amazon', 'ebay', 'google shopping',
      ],
      toolNames: [
        'list_orders', 'get_order', 'change_order_status', 'harvest_orders',
        'list_channel_catalogs', 'get_channel_catalog', 'list_channel_catalog_products',
        'export_channel_catalog_products', 'list_stores', 'get_analytics_report_by_channel',
      ],
      description: 'BeeZUP Merchant API — manage marketplace orders across platforms (Amazon, eBay, etc.), configure and export channel catalog product feeds, manage stores, and pull analytics reports.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_orders',
        description: 'Get a paginated list of all BeeZUP marketplace orders with full Order and Order Item properties',
        inputSchema: {
          type: 'object',
          properties: {
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of orders per page (default: 25, max: 100)',
            },
            marketplace_technical_code: {
              type: 'string',
              description: 'Filter by marketplace technical code (e.g. "Amazon", "Ebay")',
            },
            account_id: {
              type: 'number',
              description: 'Filter by marketplace account ID',
            },
            begin_period_utc_date: {
              type: 'string',
              description: 'ISO 8601 start date filter for order creation date',
            },
            end_period_utc_date: {
              type: 'string',
              description: 'ISO 8601 end date filter for order creation date',
            },
            order_status_beez_up_type: {
              type: 'string',
              description: 'Filter by BeeZUP order status (e.g. "Waiting", "Shipping", "Shipped")',
            },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Get full Order and Order Item properties for a specific BeeZUP order',
        inputSchema: {
          type: 'object',
          properties: {
            marketplace_technical_code: {
              type: 'string',
              description: 'Marketplace technical code (e.g. "Amazon", "Ebay")',
            },
            account_id: {
              type: 'number',
              description: 'Marketplace account ID',
            },
            beez_up_order_id: {
              type: 'string',
              description: 'BeeZUP order ID',
            },
          },
          required: ['marketplace_technical_code', 'account_id', 'beez_up_order_id'],
        },
      },
      {
        name: 'change_order_status',
        description: 'Change a marketplace order status — accept, ship, refund, or cancel an order on BeeZUP',
        inputSchema: {
          type: 'object',
          properties: {
            marketplace_technical_code: {
              type: 'string',
              description: 'Marketplace technical code (e.g. "Amazon")',
            },
            account_id: {
              type: 'number',
              description: 'Marketplace account ID',
            },
            beez_up_order_id: {
              type: 'string',
              description: 'BeeZUP order ID',
            },
            change_order_type: {
              type: 'string',
              description: 'Action to perform: accept, ship, refund, cancel, unknown',
            },
            test_mode: {
              type: 'boolean',
              description: 'If true, run in test mode — no actual change sent to the marketplace',
            },
            order_merchant_id: {
              type: 'string',
              description: 'Your internal merchant order reference ID',
            },
            order_merchant_ecommerce_software_name: {
              type: 'string',
              description: 'Name of your e-commerce software (e.g. "Shopify", "Magento")',
            },
          },
          required: ['marketplace_technical_code', 'account_id', 'beez_up_order_id', 'change_order_type'],
        },
      },
      {
        name: 'harvest_orders',
        description: 'Send a harvest request to synchronise orders from all or a specific marketplace account',
        inputSchema: {
          type: 'object',
          properties: {
            marketplace_technical_code: {
              type: 'string',
              description: 'Marketplace technical code — if provided with account_id, harvest only that account; omit to harvest all',
            },
            account_id: {
              type: 'number',
              description: 'Account ID — required if marketplace_technical_code is provided',
            },
          },
        },
      },
      {
        name: 'list_channel_catalogs',
        description: 'List all your BeeZUP channel catalogs — each catalog is a configured product feed for a specific marketplace channel',
        inputSchema: {
          type: 'object',
          properties: {
            store_id: {
              type: 'string',
              description: 'Filter channel catalogs by store ID',
            },
          },
        },
      },
      {
        name: 'get_channel_catalog',
        description: 'Get detailed information for a specific BeeZUP channel catalog including settings, column mappings, and status',
        inputSchema: {
          type: 'object',
          properties: {
            channel_catalog_id: {
              type: 'string',
              description: 'Channel catalog ID',
            },
          },
          required: ['channel_catalog_id'],
        },
      },
      {
        name: 'list_channel_catalog_products',
        description: 'Get a list of products in a BeeZUP channel catalog with their status, overrides, and exclusion reason',
        inputSchema: {
          type: 'object',
          properties: {
            channel_catalog_id: {
              type: 'string',
              description: 'Channel catalog ID',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of products per page (default: 25, max: 100)',
            },
            product_state: {
              type: 'string',
              description: 'Filter by product state: Enabled, Disabled, Uncategorized, DisabledByRules, NotMatchingCatalog',
            },
            channel_catalog_product_state: {
              type: 'string',
              description: 'Filter by channel catalog product state',
            },
          },
          required: ['channel_catalog_id'],
        },
      },
      {
        name: 'export_channel_catalog_products',
        description: 'Request an export of channel catalog product information as a downloadable file',
        inputSchema: {
          type: 'object',
          properties: {
            channel_catalog_id: {
              type: 'string',
              description: 'Channel catalog ID to export products from',
            },
            format: {
              type: 'string',
              description: 'Export file format: csv, tsv, xml (default: csv)',
            },
            product_state: {
              type: 'string',
              description: 'Filter exported products by state: Enabled, Disabled, Uncategorized',
            },
          },
          required: ['channel_catalog_id'],
        },
      },
      {
        name: 'list_stores',
        description: 'List all BeeZUP stores in your account with their IDs and configuration',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_analytics_report_by_channel',
        description: 'Get a BeeZUP analytics performance report broken down by channel for a given store and date range',
        inputSchema: {
          type: 'object',
          properties: {
            store_id: {
              type: 'string',
              description: 'Store ID to pull the report for',
            },
            begin_period_utc_date: {
              type: 'string',
              description: 'ISO 8601 start date for the report period',
            },
            end_period_utc_date: {
              type: 'string',
              description: 'ISO 8601 end date for the report period',
            },
            channel_id: {
              type: 'string',
              description: 'Optional: filter the report to a specific channel ID',
            },
            category_id: {
              type: 'string',
              description: 'Optional: filter the report to a specific catalog category ID',
            },
            page_number: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            page_size: {
              type: 'number',
              description: 'Number of rows per page (default: 25)',
            },
          },
          required: ['store_id', 'begin_period_utc_date', 'end_period_utc_date'],
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
        case 'change_order_status':
          return this.changeOrderStatus(args);
        case 'harvest_orders':
          return this.harvestOrders(args);
        case 'list_channel_catalogs':
          return this.listChannelCatalogs(args);
        case 'get_channel_catalog':
          return this.getChannelCatalog(args);
        case 'list_channel_catalog_products':
          return this.listChannelCatalogProducts(args);
        case 'export_channel_catalog_products':
          return this.exportChannelCatalogProducts(args);
        case 'list_stores':
          return this.listStores();
        case 'get_analytics_report_by_channel':
          return this.getAnalyticsReportByChannel(args);
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

  private authHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
      'Ocp-Apim-Subscription-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...extra,
    };
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`BeeZUP returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    const ct = response.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      try { data = await response.json(); } catch { throw new Error(`BeeZUP returned non-JSON (HTTP ${response.status})`); }
    } else {
      data = { status: response.status, message: 'Success (no JSON body)' };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      pageNumber: (args.page_number as number) ?? 1,
      pageSize: (args.page_size as number) ?? 25,
    };
    if (args.marketplace_technical_code) body.marketplaceTechnicalCode = args.marketplace_technical_code;
    if (args.account_id !== undefined) body.accountId = args.account_id;
    if (args.begin_period_utc_date) body.beginPeriodUtcDate = args.begin_period_utc_date;
    if (args.end_period_utc_date) body.endPeriodUtcDate = args.end_period_utc_date;
    if (args.order_status_beez_up_type) body.orderStatusBeezUPType = args.order_status_beez_up_type;
    return this.post('/orders/v3/list/full', body);
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.marketplace_technical_code) return { content: [{ type: 'text', text: 'marketplace_technical_code is required' }], isError: true };
    if (args.account_id === undefined) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    if (!args.beez_up_order_id) return { content: [{ type: 'text', text: 'beez_up_order_id is required' }], isError: true };
    const path = `/orders/v3/${encodeURIComponent(args.marketplace_technical_code as string)}/${encodeURIComponent(String(args.account_id))}/${encodeURIComponent(args.beez_up_order_id as string)}`;
    return this.get(path);
  }

  private async changeOrderStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.marketplace_technical_code) return { content: [{ type: 'text', text: 'marketplace_technical_code is required' }], isError: true };
    if (args.account_id === undefined) return { content: [{ type: 'text', text: 'account_id is required' }], isError: true };
    if (!args.beez_up_order_id) return { content: [{ type: 'text', text: 'beez_up_order_id is required' }], isError: true };
    if (!args.change_order_type) return { content: [{ type: 'text', text: 'change_order_type is required (accept, ship, refund, cancel, unknown)' }], isError: true };
    const path = `/orders/v3/${encodeURIComponent(args.marketplace_technical_code as string)}/${encodeURIComponent(String(args.account_id))}/${encodeURIComponent(args.beez_up_order_id as string)}/${encodeURIComponent(args.change_order_type as string)}`;
    const body: Record<string, unknown> = {};
    if (args.test_mode !== undefined) body.testMode = args.test_mode;
    if (args.order_merchant_id) body.order_MerchantOrderId = args.order_merchant_id;
    if (args.order_merchant_ecommerce_software_name) body.order_Merchant_ECommerceSoftwareName = args.order_merchant_ecommerce_software_name;
    return this.post(path, body);
  }

  private async harvestOrders(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.marketplace_technical_code && args.account_id !== undefined) {
      const path = `/orders/v3/${encodeURIComponent(args.marketplace_technical_code as string)}/${encodeURIComponent(String(args.account_id))}/harvest`;
      return this.post(path, {});
    }
    return this.post('/orders/v3/harvest', {});
  }

  private async listChannelCatalogs(args: Record<string, unknown>): Promise<ToolResult> {
    let path = '/v2/user/channelCatalogs/';
    if (args.store_id) path += `?storeId=${encodeURIComponent(args.store_id as string)}`;
    return this.get(path);
  }

  private async getChannelCatalog(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_catalog_id) return { content: [{ type: 'text', text: 'channel_catalog_id is required' }], isError: true };
    return this.get(`/v2/user/channelCatalogs/${encodeURIComponent(args.channel_catalog_id as string)}`);
  }

  private async listChannelCatalogProducts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_catalog_id) return { content: [{ type: 'text', text: 'channel_catalog_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      pageNumber: (args.page_number as number) ?? 1,
      pageSize: (args.page_size as number) ?? 25,
    };
    if (args.product_state) body.productState = args.product_state;
    if (args.channel_catalog_product_state) body.channelCatalogProductState = args.channel_catalog_product_state;
    return this.post(`/v2/user/channelCatalogs/${encodeURIComponent(args.channel_catalog_id as string)}/products`, body);
  }

  private async exportChannelCatalogProducts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.channel_catalog_id) return { content: [{ type: 'text', text: 'channel_catalog_id is required' }], isError: true };
    const body: Record<string, unknown> = {
      format: (args.format as string) ?? 'csv',
    };
    if (args.product_state) body.productState = args.product_state;
    return this.post(`/v2/user/channelCatalogs/${encodeURIComponent(args.channel_catalog_id as string)}/products/export`, body);
  }

  private async listStores(): Promise<ToolResult> {
    return this.get('/v2/user/customer/stores');
  }

  private async getAnalyticsReportByChannel(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.store_id) return { content: [{ type: 'text', text: 'store_id is required' }], isError: true };
    if (!args.begin_period_utc_date) return { content: [{ type: 'text', text: 'begin_period_utc_date is required' }], isError: true };
    if (!args.end_period_utc_date) return { content: [{ type: 'text', text: 'end_period_utc_date is required' }], isError: true };
    const body: Record<string, unknown> = {
      beginPeriodUtcDate: args.begin_period_utc_date,
      endPeriodUtcDate: args.end_period_utc_date,
      pageNumber: (args.page_number as number) ?? 1,
      pageSize: (args.page_size as number) ?? 25,
    };
    if (args.channel_id) body.channelId = args.channel_id;
    if (args.category_id) body.catalogCategoryId = args.category_id;
    return this.post(`/v2/user/analytics/${encodeURIComponent(args.store_id as string)}/reports/bychannel`, body);
  }
}
