/**
 * Intel Product Catalogue MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Intel Product Catalogue MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 4 tools (product list, product info, ordering info, codenames).
// Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://productapi.intel.com
// Auth: Basic auth (username + password) AND client_id header (both required per spec)
// Docs: https://productapi.intel.com/swagger.json
// Rate limits: Not publicly documented. Contact pim.360.team@intel.com for credentials and limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IntelProductCatalogueConfig {
  /** Basic auth username */
  username: string;
  /** Basic auth password */
  password: string;
  /** Client ID header value */
  clientId: string;
  /** Optional base URL override (default: https://productapi.intel.com) */
  baseUrl?: string;
}

export class IntelProductCatalogueMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly clientId: string;
  private readonly baseUrl: string;

  constructor(config: IntelProductCatalogueConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.clientId = config.clientId;
    this.baseUrl = config.baseUrl ?? 'https://productapi.intel.com';
  }

  static catalog() {
    return {
      name: 'intel-product-catalogue',
      displayName: 'Intel Product Catalogue',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'intel', 'product', 'catalogue', 'catalog', 'processor', 'cpu', 'xeon',
        'core', 'atom', 'chipset', 'memory', 'storage', 'server', 'networking',
        'ethernet', 'wireless', 'graphics', 'specifications', 'specs', 'sku',
        'ordering', 'codename', 'ark', 'pim', 'hardware',
      ],
      toolNames: [
        'list_products',
        'get_product_info',
        'get_ordering_info',
        'get_codenames',
      ],
      description: 'Intel Product Catalogue (PIM): list and search Intel processors, chipsets, and hardware by category or product ID, retrieve full tech specs, ordering codes, and product codenames.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_products',
        description: 'List Intel products by category or product ID with optional spec highlights, sorting, and filters — supports pagination for processors, chipsets, networking, memory, and more',
        inputSchema: {
          type: 'object',
          properties: {
            locale_geo_id: {
              type: 'string',
              description: 'Locale and geo code for localised data (e.g. en-US, de-DE, ja-JP, zh-CN). Required.',
            },
            category_id: {
              type: 'string',
              description: 'Filter by category ID(s) as JSON array, e.g. ["873"]. Categories: Processors=873, Server=1201, Mini PCs=98414, Wireless=59485, Ethernet=36773, Fabric=70021, Memory/Storage=35125, Chipsets=53, Graphics=80939. Either category_id or product_id is required.',
            },
            product_id: {
              type: 'string',
              description: 'Filter by product ID(s) as JSON array, e.g. ["123003"]. Either category_id or product_id is required.',
            },
            highlights: {
              type: 'string',
              description: 'Specification fields to include in response as JSON array, e.g. ["CoreCount","StatusCodeText"].',
            },
            sort: {
              type: 'string',
              description: 'Sort criteria as JSON array of objects, e.g. [{"field":"name","order":"ASC"}]. Any spec key or "name" can be used as field.',
            },
            filters: {
              type: 'string',
              description: 'Spec-based filters as JSON array, e.g. [{"type":"specvalue","name":"ThreadCount","gteq":"4"}]. Operators: eq, neq, lteq, gteq, swc, nswc, cts, ncts.',
            },
            per_page: {
              type: 'number',
              description: 'Number of products per page (default: 10)',
            },
            page_no: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['locale_geo_id'],
        },
      },
      {
        name: 'get_product_info',
        description: 'Get complete technical specifications, media assets, and variant references for up to 40 Intel products by product ID — returns full tech spec array with all spec labels and values',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Product ID(s) as JSON array, e.g. ["223","224"]. Maximum 40 products per request.',
            },
            locale_geo_id: {
              type: 'string',
              description: 'Locale and geo code for localised data (e.g. en-US, de-DE, zh-CN).',
            },
            include_reference: {
              type: 'string',
              description: 'Set to "true" to include variant and compatible product references in the result (default: false)',
            },
          },
          required: ['product_id', 'locale_geo_id'],
        },
      },
      {
        name: 'get_ordering_info',
        description: 'Get ordering codes and purchasing information for Intel products by product ID — returns ordering code attributes such as part numbers and OrderingCode values',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Product ID(s) as JSON array, e.g. ["123003"].',
            },
            locale_geo_id: {
              type: 'string',
              description: 'Locale and geo code for localised data (e.g. en-US, de-DE, zh-CN).',
            },
          },
          required: ['product_id', 'locale_geo_id'],
        },
      },
      {
        name: 'get_codenames',
        description: 'Get the full list of Intel product codenames (e.g. Tunnel Creek, Ice Lake, Alder Lake) with codename IDs, types, and URL-friendly text — returns all codenames with no pagination',
        inputSchema: {
          type: 'object',
          properties: {
            locale_geo_id: {
              type: 'string',
              description: 'Locale and geo code for localised data (e.g. en-US, de-DE, zh-CN).',
            },
          },
          required: ['locale_geo_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_products':
          return this.listProducts(args);
        case 'get_product_info':
          return this.getProductInfo(args);
        case 'get_ordering_info':
          return this.getOrderingInfo(args);
        case 'get_codenames':
          return this.getCodenames(args);
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

  private authHeaders(): Record<string, string> {
    return {
      'Authorization': `Basic ${btoa(`${this.username}:${this.password}`)}`,
      'client_id': this.clientId,
      'Content-Type': 'application/json',
    };
  }

  private async fetchGet(path: string, params: Record<string, string | number | undefined>): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const url = `${this.baseUrl}${path}?${qs.toString()}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Intel Product Catalogue returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.locale_geo_id) {
      return { content: [{ type: 'text', text: 'locale_geo_id is required' }], isError: true };
    }
    if (!args.category_id && !args.product_id) {
      return { content: [{ type: 'text', text: 'Either category_id or product_id is required' }], isError: true };
    }
    const params: Record<string, string | number | undefined> = {
      locale_geo_id: args.locale_geo_id as string,
    };
    if (args.category_id) params.category_id = args.category_id as string;
    if (args.product_id) params.product_id = args.product_id as string;
    if (args.highlights) params.highlights = args.highlights as string;
    if (args.sort) params.sort = args.sort as string;
    if (args.filters) params.filters = args.filters as string;
    if (args.per_page !== undefined) params.per_page = args.per_page as number;
    if (args.page_no !== undefined) params.page_no = args.page_no as number;
    return this.fetchGet('/api/products/get-products', params);
  }

  private async getProductInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) {
      return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    }
    if (!args.locale_geo_id) {
      return { content: [{ type: 'text', text: 'locale_geo_id is required' }], isError: true };
    }
    const params: Record<string, string | number | undefined> = {
      product_id: args.product_id as string,
      locale_geo_id: args.locale_geo_id as string,
    };
    if (args.include_reference) params.include_reference = args.include_reference as string;
    return this.fetchGet('/api/products/get-products-info', params);
  }

  private async getOrderingInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) {
      return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    }
    if (!args.locale_geo_id) {
      return { content: [{ type: 'text', text: 'locale_geo_id is required' }], isError: true };
    }
    const params: Record<string, string | number | undefined> = {
      product_id: args.product_id as string,
      locale_geo_id: args.locale_geo_id as string,
    };
    return this.fetchGet('/api/products/get-ordering-info', params);
  }

  private async getCodenames(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.locale_geo_id) {
      return { content: [{ type: 'text', text: 'locale_geo_id is required' }], isError: true };
    }
    const params: Record<string, string | number | undefined> = {
      locale_geo_id: args.locale_geo_id as string,
    };
    return this.fetchGet('/api/products/get-codename', params);
  }
}
