/**
 * Royal Mail Click & Drop MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Royal Mail Click & Drop MCP server was found on GitHub or the MCP registry.
// This adapter covers: 10 tools (orders, manifests, labels, version).
// Recommendation: Use this adapter for all Royal Mail Click & Drop integrations.
//
// Base URL: https://api.clickanddrop.royalmail.com/api/v1
// Auth: Bearer token — Authorization: Bearer <apiToken>
// Docs: https://developer.royalmail.net/node/2861
// Rate limits: Not publicly documented by Royal Mail.
// OpenAPI spec: https://api.apis.guru/v2/specs/royalmail.com/click-and-drop/1.0.0/swagger.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RoyalMailClickAndDropConfig {
  apiToken: string;
  baseUrl?: string;
}

export class RoyalMailClickAndDropMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: RoyalMailClickAndDropConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl ?? 'https://api.clickanddrop.royalmail.com/api/v1';
  }

  static catalog() {
    return {
      name: 'royalmail-click-and-drop',
      displayName: 'Royal Mail Click & Drop',
      version: '1.0.0',
      category: 'logistics',
      keywords: [
        'royal mail', 'click and drop', 'shipping', 'parcel', 'tracking',
        'manifest', 'label', 'order', 'uk mail', 'postage', 'courier',
        'dispatch', 'delivery', 'channelshipper',
      ],
      toolNames: [
        'list_orders', 'list_orders_full', 'create_orders', 'get_orders',
        'get_orders_full', 'get_order_label', 'set_order_status', 'delete_orders',
        'create_manifest', 'get_manifest', 'retry_manifest', 'get_version',
      ],
      description: 'Royal Mail Click & Drop: create and manage shipping orders, generate labels, manifest parcels for dispatch, and track order status.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_orders',
        description: 'Retrieve a pageable list of Royal Mail Click & Drop orders with basic fields',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of orders per page (default: 50, max: 100)',
            },
            status: {
              type: 'string',
              description: 'Filter by order status (e.g. Open, Labelled, Manifested, Dispatched)',
            },
          },
        },
      },
      {
        name: 'list_orders_full',
        description: 'Retrieve a pageable list of Royal Mail Click & Drop orders including full order details and line items',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of orders per page (default: 50, max: 100)',
            },
          },
        },
      },
      {
        name: 'create_orders',
        description: 'Create one or more new Royal Mail Click & Drop shipping orders with recipient address, service, and parcel details',
        inputSchema: {
          type: 'object',
          properties: {
            orders: {
              type: 'array',
              description: 'Array of order objects to create. Each must include recipient address, service, and parcel weight.',
              items: {
                type: 'object',
                properties: {
                  orderReference: { type: 'string', description: 'Your unique reference for this order' },
                  recipient: {
                    type: 'object',
                    description: 'Recipient contact and address details',
                    properties: {
                      name: { type: 'string' },
                      addressLine1: { type: 'string' },
                      city: { type: 'string' },
                      postcode: { type: 'string' },
                      countryCode: { type: 'string', description: 'ISO 3166-1 alpha-2 country code (e.g. GB, US)' },
                    },
                  },
                  service: {
                    type: 'object',
                    description: 'Royal Mail service details',
                    properties: {
                      serviceCode: { type: 'string', description: 'Royal Mail service code (e.g. CRL1CB for 1st Class, TPN1CB for Tracked 24)' },
                    },
                  },
                  parcels: {
                    type: 'array',
                    description: 'Array of parcels in this order',
                    items: {
                      type: 'object',
                      properties: {
                        weight: { type: 'number', description: 'Parcel weight in grams' },
                      },
                    },
                  },
                },
              },
            },
          },
          required: ['orders'],
        },
      },
      {
        name: 'get_orders',
        description: 'Retrieve one or more specific Royal Mail Click & Drop orders by their order identifiers',
        inputSchema: {
          type: 'object',
          properties: {
            orderIdentifiers: {
              type: 'string',
              description: 'Comma-separated list of order identifiers (orderIds or orderReferences)',
            },
          },
          required: ['orderIdentifiers'],
        },
      },
      {
        name: 'get_orders_full',
        description: 'Retrieve full details including line items for specific Royal Mail Click & Drop orders by their identifiers',
        inputSchema: {
          type: 'object',
          properties: {
            orderIdentifiers: {
              type: 'string',
              description: 'Comma-separated list of order identifiers',
            },
          },
          required: ['orderIdentifiers'],
        },
      },
      {
        name: 'get_order_label',
        description: 'Retrieve a PDF label (and any associated documents) for a Royal Mail Click & Drop order as base64-encoded content',
        inputSchema: {
          type: 'object',
          properties: {
            orderIdentifiers: {
              type: 'string',
              description: 'Order identifier for the label to retrieve',
            },
          },
          required: ['orderIdentifiers'],
        },
      },
      {
        name: 'set_order_status',
        description: 'Update the status of one or more Royal Mail Click & Drop orders (e.g. mark as dispatched)',
        inputSchema: {
          type: 'object',
          properties: {
            orderIdentifiers: {
              type: 'array',
              description: 'List of order identifiers to update',
              items: { type: 'string' },
            },
            status: {
              type: 'string',
              description: 'New status to set (e.g. Dispatched, Cancelled)',
            },
          },
          required: ['orderIdentifiers', 'status'],
        },
      },
      {
        name: 'delete_orders',
        description: 'Delete one or more Royal Mail Click & Drop orders by their identifiers (only Open/unlabelled orders can be deleted)',
        inputSchema: {
          type: 'object',
          properties: {
            orderIdentifiers: {
              type: 'string',
              description: 'Comma-separated list of order identifiers to delete',
            },
          },
          required: ['orderIdentifiers'],
        },
      },
      {
        name: 'create_manifest',
        description: 'Manifest (close) all labelled Royal Mail orders ready for collection/dispatch, generating a manifest document',
        inputSchema: {
          type: 'object',
          properties: {
            orderIdentifiers: {
              type: 'array',
              description: 'Optional list of specific order identifiers to include in the manifest; omit to manifest all pending orders',
              items: { type: 'string' },
            },
          },
        },
      },
      {
        name: 'get_manifest',
        description: 'Retrieve the status and documentation URL for a previously created Royal Mail manifest by its GUID',
        inputSchema: {
          type: 'object',
          properties: {
            manifestGuid: {
              type: 'string',
              description: 'Manifest GUID returned from create_manifest',
            },
          },
          required: ['manifestGuid'],
        },
      },
      {
        name: 'retry_manifest',
        description: 'Retry a failed Royal Mail manifest operation by its GUID',
        inputSchema: {
          type: 'object',
          properties: {
            manifestGuid: {
              type: 'string',
              description: 'Manifest GUID to retry',
            },
          },
          required: ['manifestGuid'],
        },
      },
      {
        name: 'get_version',
        description: 'Get the current API version details for the Royal Mail Click & Drop service',
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
        case 'list_orders':
          return this.listOrders(args);
        case 'list_orders_full':
          return this.listOrdersFull(args);
        case 'create_orders':
          return this.createOrders(args);
        case 'get_orders':
          return this.getOrders(args);
        case 'get_orders_full':
          return this.getOrdersFull(args);
        case 'get_order_label':
          return this.getOrderLabel(args);
        case 'set_order_status':
          return this.setOrderStatus(args);
        case 'delete_orders':
          return this.deleteOrders(args);
        case 'create_manifest':
          return this.createManifest(args);
        case 'get_manifest':
          return this.getManifest(args);
        case 'retry_manifest':
          return this.retryManifest(args);
        case 'get_version':
          return this.getVersion();
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

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async rmGet(path: string, query?: Record<string, string | number | undefined>): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) params.set(k, String(v));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders });
    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async rmPost(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errBody}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async rmPut(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.authHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errBody}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ success: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async rmDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errBody}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, deleted: true }) }], isError: false };
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    return this.rmGet('/orders', {
      page: args.page as number | undefined,
      pageSize: args.pageSize as number | undefined,
      status: args.status as string | undefined,
    });
  }

  private async listOrdersFull(args: Record<string, unknown>): Promise<ToolResult> {
    return this.rmGet('/orders/full', {
      page: args.page as number | undefined,
      pageSize: args.pageSize as number | undefined,
    });
  }

  private async createOrders(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orders) {
      return { content: [{ type: 'text', text: 'orders array is required' }], isError: true };
    }
    return this.rmPost('/orders', args.orders);
  }

  private async getOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.orderIdentifiers as string;
    if (!ids) return { content: [{ type: 'text', text: 'orderIdentifiers is required' }], isError: true };
    return this.rmGet(`/orders/${encodeURIComponent(ids)}`);
  }

  private async getOrdersFull(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.orderIdentifiers as string;
    if (!ids) return { content: [{ type: 'text', text: 'orderIdentifiers is required' }], isError: true };
    return this.rmGet(`/orders/${encodeURIComponent(ids)}/full`);
  }

  private async getOrderLabel(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.orderIdentifiers as string;
    if (!ids) return { content: [{ type: 'text', text: 'orderIdentifiers is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/orders/${encodeURIComponent(ids)}/label`, {
      method: 'GET',
      headers: { ...this.authHeaders, Accept: 'application/pdf' },
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errBody}` }], isError: true };
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const preview = `PDF label retrieved. Size: ${buffer.byteLength} bytes. Base64 (first 200 chars): ${base64.slice(0, 200)}...`;
    return { content: [{ type: 'text', text: preview }], isError: false };
  }

  private async setOrderStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderIdentifiers || !args.status) {
      return { content: [{ type: 'text', text: 'orderIdentifiers and status are required' }], isError: true };
    }
    return this.rmPut('/orders/status', { orderIdentifiers: args.orderIdentifiers, status: args.status });
  }

  private async deleteOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.orderIdentifiers as string;
    if (!ids) return { content: [{ type: 'text', text: 'orderIdentifiers is required' }], isError: true };
    return this.rmDelete(`/orders/${encodeURIComponent(ids)}`);
  }

  private async createManifest(args: Record<string, unknown>): Promise<ToolResult> {
    const body = args.orderIdentifiers ? { orderIdentifiers: args.orderIdentifiers } : {};
    return this.rmPost('/manifests', body);
  }

  private async getManifest(args: Record<string, unknown>): Promise<ToolResult> {
    const guid = args.manifestGuid as string;
    if (!guid) return { content: [{ type: 'text', text: 'manifestGuid is required' }], isError: true };
    return this.rmGet(`/manifests/${encodeURIComponent(guid)}`);
  }

  private async retryManifest(args: Record<string, unknown>): Promise<ToolResult> {
    const guid = args.manifestGuid as string;
    if (!guid) return { content: [{ type: 'text', text: 'manifestGuid is required' }], isError: true };
    return this.rmPost(`/manifests/${encodeURIComponent(guid)}/retry`, {});
  }

  private async getVersion(): Promise<ToolResult> {
    return this.rmGet('/version');
  }
}
