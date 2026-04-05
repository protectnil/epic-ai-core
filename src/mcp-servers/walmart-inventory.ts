/**
 * Walmart Inventory MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Spec: https://api.apis.guru/v2/specs/walmart.com/inventory/1.0.0/openapi.json
// Base URL: https://marketplace.walmartapis.com
// Auth: WM_SEC.ACCESS_TOKEN header (OAuth2 bearer) + WM_QOS.CORRELATION_ID + WM_SVC.NAME
// Docs: https://developer.walmart.com/api/us/mp/inventory
// Category: ecommerce
// Tools: get_inventory, update_inventory, get_multinode_inventory_all_skus,
//        get_multinode_inventory_by_sku, update_multinode_inventory,
//        get_wfs_inventory, bulk_update_inventory

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WalmartInventoryConfig {
  accessToken: string;
  channelType?: string;
  baseUrl?: string;
}

export class WalmartInventoryMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly channelType: string;
  private readonly baseUrl: string;

  constructor(config: WalmartInventoryConfig) {
    super();
    this.accessToken = config.accessToken;
    this.channelType = config.channelType ?? '';
    this.baseUrl = config.baseUrl ?? 'https://marketplace.walmartapis.com';
  }

  static catalog() {
    return {
      name: 'walmart-inventory',
      displayName: 'Walmart Inventory',
      version: '1.0.0',
      category: 'ecommerce',
      keywords: [
        'walmart', 'inventory', 'marketplace', 'seller', 'sku', 'stock',
        'fulfillment', 'wfs', 'ship-node', 'bulk', 'multi-node', 'ecommerce',
      ],
      toolNames: [
        'get_inventory', 'update_inventory',
        'get_multinode_inventory_all_skus', 'get_multinode_inventory_by_sku',
        'update_multinode_inventory', 'get_wfs_inventory', 'bulk_update_inventory',
      ],
      description: 'Walmart Marketplace Inventory API: get and update item inventory levels for single-node and multi-node fulfillment, WFS inventory, and bulk feed updates.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_inventory',
        description: 'Get inventory quantity for a single Walmart Marketplace item by SKU, optionally filtered to a specific ship node',
        inputSchema: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              description: 'Seller-assigned SKU for the item (required)',
            },
            shipNode: {
              type: 'string',
              description: 'Ship node ID to filter inventory; omit for total inventory across all nodes',
            },
          },
          required: ['sku'],
        },
      },
      {
        name: 'update_inventory',
        description: 'Update inventory quantity for a single Walmart Marketplace item by SKU at one or all ship nodes',
        inputSchema: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              description: 'Seller-assigned SKU for the item (required)',
            },
            shipNode: {
              type: 'string',
              description: 'Ship node ID to update inventory at; omit to update default node',
            },
            quantity: {
              type: 'number',
              description: 'New inventory quantity (required)',
            },
            unit: {
              type: 'string',
              description: 'Unit of measure for the quantity (default: EACH)',
            },
          },
          required: ['sku', 'quantity'],
        },
      },
      {
        name: 'get_multinode_inventory_all_skus',
        description: 'Get inventory levels across all ship nodes for all seller SKUs on Walmart Marketplace, with pagination support',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of SKUs to return per page (max: 50)',
            },
            nextCursor: {
              type: 'string',
              description: 'Pagination cursor returned from a previous call to retrieve the next page',
            },
          },
        },
      },
      {
        name: 'get_multinode_inventory_by_sku',
        description: 'Get inventory levels at all ship nodes for a specific seller SKU on Walmart Marketplace',
        inputSchema: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              description: 'Seller-assigned SKU for the item (required)',
            },
            shipNode: {
              type: 'string',
              description: 'Filter results to a specific ship node ID',
            },
          },
          required: ['sku'],
        },
      },
      {
        name: 'update_multinode_inventory',
        description: 'Update inventory quantities for a specific SKU across one or more ship nodes on Walmart Marketplace',
        inputSchema: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              description: 'Seller-assigned SKU for the item (required)',
            },
            inventoryList: {
              type: 'array',
              description: 'List of ship node inventory objects, each containing shipNode and quantity fields (required)',
              items: {
                type: 'object',
              },
            },
          },
          required: ['sku', 'inventoryList'],
        },
      },
      {
        name: 'get_wfs_inventory',
        description: 'Get Walmart Fulfillment Services (WFS) inventory levels for items fulfilled by Walmart, with optional SKU and date range filters',
        inputSchema: {
          type: 'object',
          properties: {
            sku: {
              type: 'string',
              description: 'Filter by seller-assigned SKU',
            },
            fromModifiedDate: {
              type: 'string',
              description: 'Filter by last modified date range start (ISO 8601 format)',
            },
            toModifiedDate: {
              type: 'string',
              description: 'Filter by last modified date range end (ISO 8601 format)',
            },
            limit: {
              type: 'number',
              description: 'Number of SKUs to return (max: 300)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip before returning results (for pagination)',
            },
          },
        },
      },
      {
        name: 'bulk_update_inventory',
        description: 'Submit a bulk inventory update feed for multiple Walmart Marketplace items via multipart form upload',
        inputSchema: {
          type: 'object',
          properties: {
            feedType: {
              type: 'string',
              description: 'Feed type for the bulk update (e.g., inventory) (required)',
            },
            shipNode: {
              type: 'string',
              description: 'Ship node for which inventory is being updated in a multi-node setup',
            },
            feedContent: {
              type: 'string',
              description: 'XML or JSON feed content string for the bulk inventory update (required)',
            },
          },
          required: ['feedType', 'feedContent'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_inventory':
          return await this.getInventory(args);
        case 'update_inventory':
          return await this.updateInventory(args);
        case 'get_multinode_inventory_all_skus':
          return await this.getMultinodeInventoryAllSkus(args);
        case 'get_multinode_inventory_by_sku':
          return await this.getMultinodeInventoryBySku(args);
        case 'update_multinode_inventory':
          return await this.updateMultinodeInventory(args);
        case 'get_wfs_inventory':
          return await this.getWfsInventory(args);
        case 'bulk_update_inventory':
          return await this.bulkUpdateInventory(args);
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
    const headers: Record<string, string> = {
      'WM_SEC.ACCESS_TOKEN': this.accessToken,
      'WM_QOS.CORRELATION_ID': `epic-ai-${Date.now()}`,
      'WM_SVC.NAME': 'epic-ai-walmart-inventory',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.channelType) {
      headers['WM_CONSUMER.CHANNEL.TYPE'] = this.channelType;
    }
    return headers;
  }


  private async fetchJson(url: string, options: RequestInit = {}): Promise<unknown> {
    const response = await this.fetchWithRetry(url, { ...options, headers: this.requestHeaders() });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Walmart API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    return response.json();
  }

  private async getInventory(args: Record<string, unknown>): Promise<ToolResult> {
    const sku = args.sku as string;
    if (!sku) {
      return { content: [{ type: 'text', text: 'sku is required' }], isError: true };
    }
    const params = new URLSearchParams({ sku });
    if (args.shipNode) params.set('shipNode', args.shipNode as string);
    const data = await this.fetchJson(`${this.baseUrl}/v3/inventory?${params}`);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateInventory(args: Record<string, unknown>): Promise<ToolResult> {
    const sku = args.sku as string;
    const quantity = args.quantity as number;
    if (!sku || quantity === undefined) {
      return { content: [{ type: 'text', text: 'sku and quantity are required' }], isError: true };
    }
    const params = new URLSearchParams({ sku });
    if (args.shipNode) params.set('shipNode', args.shipNode as string);
    const body = {
      sku,
      quantity: {
        unit: (args.unit as string) ?? 'EACH',
        amount: quantity,
      },
    };
    const data = await this.fetchJson(`${this.baseUrl}/v3/inventory?${params}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getMultinodeInventoryAllSkus(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.nextCursor) params.set('nextCursor', args.nextCursor as string);
    const url = `${this.baseUrl}/v3/inventories${params.toString() ? '?' + params : ''}`;
    const data = await this.fetchJson(url);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getMultinodeInventoryBySku(args: Record<string, unknown>): Promise<ToolResult> {
    const sku = args.sku as string;
    if (!sku) {
      return { content: [{ type: 'text', text: 'sku is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.shipNode) params.set('shipNode', args.shipNode as string);
    const url = `${this.baseUrl}/v3/inventories/${encodeURIComponent(sku)}${params.toString() ? '?' + params : ''}`;
    const data = await this.fetchJson(url);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async updateMultinodeInventory(args: Record<string, unknown>): Promise<ToolResult> {
    const sku = args.sku as string;
    const inventoryList = args.inventoryList as unknown[];
    if (!sku || !inventoryList) {
      return { content: [{ type: 'text', text: 'sku and inventoryList are required' }], isError: true };
    }
    const body = { sku, inventories: { inventory: inventoryList } };
    const data = await this.fetchJson(`${this.baseUrl}/v3/inventories/${encodeURIComponent(sku)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getWfsInventory(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.sku) params.set('sku', args.sku as string);
    if (args.fromModifiedDate) params.set('fromModifiedDate', args.fromModifiedDate as string);
    if (args.toModifiedDate) params.set('toModifiedDate', args.toModifiedDate as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    const url = `${this.baseUrl}/v3/fulfillment/inventory${params.toString() ? '?' + params : ''}`;
    const data = await this.fetchJson(url);
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async bulkUpdateInventory(args: Record<string, unknown>): Promise<ToolResult> {
    const feedType = args.feedType as string;
    const feedContent = args.feedContent as string;
    if (!feedType || !feedContent) {
      return { content: [{ type: 'text', text: 'feedType and feedContent are required' }], isError: true };
    }
    const params = new URLSearchParams({ feedType });
    if (args.shipNode) params.set('shipNode', args.shipNode as string);
    const formData = new FormData();
    formData.append('file', new Blob([feedContent], { type: 'application/octet-stream' }), 'inventory-feed');
    const headers = this.requestHeaders();
    delete headers['Content-Type'];
    const response = await this.fetchWithRetry(`${this.baseUrl}/v3/feeds?${params}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Walmart API error: ${response.status} ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
