/**
 * DropX MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. DropX (dropx.io) has not published an official MCP server.
//
// Base URL: http://dropx.io/api/v1
// Auth: API key passed as query parameter `api_key` on every request.
// Docs: http://dropx.io (Swagger: http://dropx.io/dropx-swagger.yaml)
// Rate limits: Not publicly documented.
// Note: dropX.io provides programmatic access to e-commerce intelligence data.
//   Core operations: product search by title or URL (with provider filtering),
//   product details by ID, and API usage stats.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DropXConfig {
  apiKey: string;
  baseUrl?: string;
}

export class DropXMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: DropXConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://dropx.io/api/v1';
  }

  static catalog() {
    return {
      name: 'dropx',
      displayName: 'DropX',
      version: '1.0.0',
      category: 'ecommerce' as const,
      keywords: [
        'dropx', 'ecommerce', 'e-commerce', 'product', 'intelligence', 'price',
        'search', 'comparison', 'amazon', 'flipkart', 'retail', 'marketplace',
        'product data', 'link search', 'title search', 'similar products',
      ],
      toolNames: [
        'get_products_by_ids',
        'search_by_link',
        'search_by_link_v2',
        'search_by_title',
        'search_by_title_v2',
        'title_search',
        'get_usage',
      ],
      description: 'Access dropX.io e-commerce intelligence: search for products by title or URL across providers (Amazon, Flipkart, etc.), retrieve product details by ID, and check API usage.',
      author: 'protectnil',
    };
  }

  private async request(method: string, path: string): Promise<ToolResult> {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${path}${sep}api_key=${encodeURIComponent(this.apiKey)}`;
    try {
      const resp = await this.fetchWithRetry(url, {
        method,
        headers: { 'Accept': 'application/json' },
      });
      const text = await resp.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!resp.ok) {
        return { content: [{ type: 'text', text: `HTTP ${resp.status}: ${text}` }], isError: true };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
    } catch (err) {
      return { content: [{ type: 'text', text: String(err) }], isError: true };
    }
  }

  private qs(params: Record<string, string | undefined>): string {
    const parts = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    return parts.length ? '?' + parts.join('&') : '';
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Product Lookup ─────────────────────────────────────────────────────
      {
        name: 'get_products_by_ids',
        description: 'Get product details for one or more products by providing their product IDs',
        inputSchema: {
          type: 'object',
          properties: {
            pids: { type: 'string', description: 'Comma-separated list of product IDs to look up' },
          },
          required: ['pids'],
        },
      },
      // ── Link-Based Search ──────────────────────────────────────────────────
      {
        name: 'search_by_link',
        description: 'Search for similar products by providing a link to any e-commerce product page (v1)',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL of the product page to find similar products for (must be URL-encoded)' },
            providers: { type: 'string', description: 'Comma-separated list of e-commerce providers to search (e.g. www.amazon.in,www.flipkart.com)' },
          },
          required: ['url'],
        },
      },
      {
        name: 'search_by_link_v2',
        description: 'Search for similar products by providing a link to any e-commerce product page (v2 — improved accuracy)',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL of the product page to find similar products for (must be URL-encoded)' },
            providers: { type: 'string', description: 'Comma-separated list of e-commerce providers to search (e.g. www.amazon.in,www.flipkart.com)' },
          },
          required: ['url'],
        },
      },
      // ── Title-Based Search ─────────────────────────────────────────────────
      {
        name: 'search_by_title',
        description: 'Search for products using a title or keyword across e-commerce providers (v1)',
        inputSchema: {
          type: 'object',
          properties: {
            term: { type: 'string', description: 'Search term or product title to search for' },
            providers: { type: 'string', description: 'Comma-separated list of e-commerce providers to search (e.g. www.amazon.in,www.flipkart.com)' },
          },
          required: ['term'],
        },
      },
      {
        name: 'search_by_title_v2',
        description: 'Search for products using a title or keyword across e-commerce providers (v2 — improved results)',
        inputSchema: {
          type: 'object',
          properties: {
            term: { type: 'string', description: 'Search term or product title to search for' },
            providers: { type: 'string', description: 'Comma-separated list of e-commerce providers to search (e.g. www.amazon.in,www.flipkart.com)' },
          },
          required: ['term'],
        },
      },
      {
        name: 'title_search',
        description: 'Simple title-based product search without provider filtering',
        inputSchema: {
          type: 'object',
          properties: {
            term: { type: 'string', description: 'Search terms or product title to search for online' },
          },
          required: ['term'],
        },
      },
      // ── Account ────────────────────────────────────────────────────────────
      {
        name: 'get_usage',
        description: 'Get API usage details and quota information for the current account',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const a = args as Record<string, string>;
    switch (name) {
      case 'get_products_by_ids': {
        const qs = this.qs({ pids: a.pids });
        return this.request('GET', `/products/${qs}`);
      }
      case 'search_by_link': {
        const qs = this.qs({ url: a.url, providers: a.providers });
        return this.request('GET', `/products/link-search${qs}`);
      }
      case 'search_by_link_v2': {
        const qs = this.qs({ url: a.url, providers: a.providers });
        return this.request('GET', `/products/link-search-v2${qs}`);
      }
      case 'search_by_title': {
        const qs = this.qs({ term: a.term, providers: a.providers });
        return this.request('GET', `/products/search${qs}`);
      }
      case 'search_by_title_v2': {
        const qs = this.qs({ term: a.term, providers: a.providers });
        return this.request('GET', `/products/search-v2${qs}`);
      }
      case 'title_search': {
        const qs = this.qs({ term: a.term });
        return this.request('GET', `/products/title-search${qs}`);
      }
      case 'get_usage':
        return this.request('GET', '/users/usage');
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  }
}
