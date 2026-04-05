/**
 * Webflow MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/webflow/mcp-server — transport: streamable-HTTP (remote) + stdio (local), auth: OAuth2
// Our adapter covers: 20 tools (sites, pages, CMS collections, items, assets, forms, ecommerce).
// Vendor MCP covers: Data API tools (sites, cms, pages, components, scripts, comments, enterprise) + Designer API tools
//   (canvas elements, styles, variables, assets, pages). Last commit: Feb 16, 2026 (actively maintained). Tool modules: 14+.
//   Qualifies: official vendor repo, maintained within 6 months, 10+ tools, streamable-HTTP + stdio transport.
//
// Integration: use-both
//   MCP-sourced tools: Designer API (canvas, elements, styles, variables) — not accessible via REST Data API
//   REST-sourced tools (this adapter, 20): list_sites, get_site, publish_site, list_pages, get_page,
//     list_collections, get_collection, create_collection, list_collection_items, get_collection_item,
//     create_collection_item, update_collection_item, delete_collection_item, publish_collection_items,
//     list_assets, list_asset_folders, list_forms, list_form_submissions, list_products, list_orders
//   Combined coverage: REST adapter for programmatic/air-gapped CMS + Data API access;
//   vendor MCP for Designer API canvas access and natural-language workflows.
//
// Base URL: https://api.webflow.com/v2
// Auth: Bearer token (Site API token or OAuth2 access token)
// Docs: https://developers.webflow.com/data/reference/rest-introduction
// Rate limits: 60 req/min (standard), 120 req/min (CMS/Business/Ecommerce), varies by plan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WebflowConfig {
  apiToken: string;
  baseUrl?: string;
}

export class WebflowMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: WebflowConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.webflow.com/v2';
  }

  static catalog() {
    return {
      name: 'webflow',
      displayName: 'Webflow',
      version: '1.0.0',
      category: 'misc',
      keywords: ['webflow', 'cms', 'website', 'pages', 'collections', 'items', 'assets', 'ecommerce', 'forms', 'publish', 'sites'],
      toolNames: [
        'list_sites', 'get_site', 'publish_site',
        'list_pages', 'get_page',
        'list_collections', 'get_collection', 'create_collection',
        'list_collection_items', 'get_collection_item', 'create_collection_item', 'update_collection_item', 'delete_collection_item', 'publish_collection_items',
        'list_assets', 'list_asset_folders',
        'list_forms', 'list_form_submissions',
        'list_products', 'list_orders',
      ],
      description: 'Webflow website and CMS management: sites, pages, CMS collections and items, assets, forms, ecommerce products and orders.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_sites',
        description: 'List all Webflow sites accessible by the API token',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_site',
        description: 'Get details for a specific Webflow site by site ID',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Webflow site ID' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'publish_site',
        description: 'Publish a Webflow site to one or more domains',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Webflow site ID to publish' },
            domains: { type: 'array', description: 'Array of domain names to publish to (e.g. ["mysite.webflow.io"])' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_pages',
        description: 'List all pages for a Webflow site with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Webflow site ID' },
            limit: { type: 'number', description: 'Maximum number of pages to return (default: 100)' },
            offset: { type: 'number', description: 'Number of pages to skip for pagination (default: 0)' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_page',
        description: 'Get metadata and SEO settings for a specific Webflow page by page ID',
        inputSchema: {
          type: 'object',
          properties: {
            page_id: { type: 'string', description: 'Webflow page ID' },
          },
          required: ['page_id'],
        },
      },
      {
        name: 'list_collections',
        description: 'List all CMS collections for a Webflow site',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Webflow site ID' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_collection',
        description: 'Get schema and field definitions for a specific Webflow CMS collection',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Webflow collection ID' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'create_collection',
        description: 'Create a new CMS collection on a Webflow site with specified fields',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Webflow site ID' },
            display_name: { type: 'string', description: 'Human-readable collection name (e.g. "Blog Posts")' },
            singular_name: { type: 'string', description: 'Singular name for one item (e.g. "Blog Post")' },
            slug: { type: 'string', description: 'URL slug for the collection (e.g. "blog-posts")' },
          },
          required: ['site_id', 'display_name', 'singular_name'],
        },
      },
      {
        name: 'list_collection_items',
        description: 'List items in a Webflow CMS collection with optional filters and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Webflow collection ID' },
            limit: { type: 'number', description: 'Maximum number of items to return (default: 100, max: 100)' },
            offset: { type: 'number', description: 'Number of items to skip for pagination (default: 0)' },
          },
          required: ['collection_id'],
        },
      },
      {
        name: 'get_collection_item',
        description: 'Get a single item from a Webflow CMS collection by item ID',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Webflow collection ID' },
            item_id: { type: 'string', description: 'Webflow collection item ID' },
          },
          required: ['collection_id', 'item_id'],
        },
      },
      {
        name: 'create_collection_item',
        description: 'Create a new item in a Webflow CMS collection',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Webflow collection ID' },
            field_data: { type: 'object', description: 'Key-value map of field slugs to values (e.g. {"name": "My Post", "slug": "my-post"})' },
            is_draft: { type: 'boolean', description: 'Create as draft (true) or staged for publish (false, default)' },
          },
          required: ['collection_id', 'field_data'],
        },
      },
      {
        name: 'update_collection_item',
        description: 'Update fields on an existing Webflow CMS collection item',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Webflow collection ID' },
            item_id: { type: 'string', description: 'Item ID to update' },
            field_data: { type: 'object', description: 'Key-value map of field slugs to new values' },
            is_draft: { type: 'boolean', description: 'Set draft status (default: false)' },
          },
          required: ['collection_id', 'item_id', 'field_data'],
        },
      },
      {
        name: 'delete_collection_item',
        description: 'Delete a Webflow CMS collection item by item ID',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Webflow collection ID' },
            item_id: { type: 'string', description: 'Item ID to delete' },
          },
          required: ['collection_id', 'item_id'],
        },
      },
      {
        name: 'publish_collection_items',
        description: 'Publish or unpublish a list of Webflow CMS collection items to the live site',
        inputSchema: {
          type: 'object',
          properties: {
            collection_id: { type: 'string', description: 'Webflow collection ID' },
            item_ids: { type: 'array', description: 'Array of item IDs to publish' },
          },
          required: ['collection_id', 'item_ids'],
        },
      },
      {
        name: 'list_assets',
        description: 'List all assets (images, files) uploaded to a Webflow site',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Webflow site ID' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_asset_folders',
        description: 'List all asset folders for a Webflow site',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Webflow site ID' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_forms',
        description: 'List all forms on a Webflow site',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Webflow site ID' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_form_submissions',
        description: 'List submissions for a specific Webflow form with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            form_id: { type: 'string', description: 'Webflow form ID' },
            limit: { type: 'number', description: 'Maximum number of submissions to return (default: 100)' },
            offset: { type: 'number', description: 'Number of submissions to skip for pagination (default: 0)' },
          },
          required: ['form_id'],
        },
      },
      {
        name: 'list_products',
        description: 'List ecommerce products in a Webflow site with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Webflow site ID' },
            limit: { type: 'number', description: 'Maximum number of products to return (default: 100)' },
            offset: { type: 'number', description: 'Number of products to skip for pagination (default: 0)' },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'list_orders',
        description: 'List ecommerce orders for a Webflow site with optional status filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: { type: 'string', description: 'Webflow site ID' },
            status: { type: 'string', description: 'Filter by order status: pending, unfulfilled, fulfilled, refunded, disputed, dispute-lost (default: all)' },
            limit: { type: 'number', description: 'Maximum number of orders to return (default: 100)' },
            offset: { type: 'number', description: 'Number of orders to skip for pagination (default: 0)' },
          },
          required: ['site_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_sites': return this.listSites();
        case 'get_site': return this.getSite(args);
        case 'publish_site': return this.publishSite(args);
        case 'list_pages': return this.listPages(args);
        case 'get_page': return this.getPage(args);
        case 'list_collections': return this.listCollections(args);
        case 'get_collection': return this.getCollection(args);
        case 'create_collection': return this.createCollection(args);
        case 'list_collection_items': return this.listCollectionItems(args);
        case 'get_collection_item': return this.getCollectionItem(args);
        case 'create_collection_item': return this.createCollectionItem(args);
        case 'update_collection_item': return this.updateCollectionItem(args);
        case 'delete_collection_item': return this.deleteCollectionItem(args);
        case 'publish_collection_items': return this.publishCollectionItems(args);
        case 'list_assets': return this.listAssets(args);
        case 'list_asset_folders': return this.listAssetFolders(args);
        case 'list_forms': return this.listForms(args);
        case 'list_form_submissions': return this.listFormSubmissions(args);
        case 'list_products': return this.listProducts(args);
        case 'list_orders': return this.listOrders(args);
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
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }


  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers: this.headers });
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

  private async patch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async del(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({ deleted: true }));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listSites(): Promise<ToolResult> {
    return this.get('/sites');
  }

  private async getSite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.get(`/sites/${encodeURIComponent(args.site_id as string)}`);
  }

  private async publishSite(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.domains) body.domains = args.domains;
    return this.post(`/sites/${encodeURIComponent(args.site_id as string)}/publish`, body);
  }

  private async listPages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    const qs = params.toString();
    return this.get(`/sites/${encodeURIComponent(args.site_id as string)}/pages${qs ? '?' + qs : ''}`);
  }

  private async getPage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.page_id) return { content: [{ type: 'text', text: 'page_id is required' }], isError: true };
    return this.get(`/pages/${encodeURIComponent(args.page_id as string)}`);
  }

  private async listCollections(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.get(`/sites/${encodeURIComponent(args.site_id as string)}/collections`);
  }

  private async getCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id) return { content: [{ type: 'text', text: 'collection_id is required' }], isError: true };
    return this.get(`/collections/${encodeURIComponent(args.collection_id as string)}`);
  }

  private async createCollection(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.display_name || !args.singular_name) {
      return { content: [{ type: 'text', text: 'site_id, display_name, and singular_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      displayName: args.display_name,
      singularName: args.singular_name,
    };
    if (args.slug) body.slug = args.slug;
    return this.post(`/sites/${encodeURIComponent(args.site_id as string)}/collections`, body);
  }

  private async listCollectionItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id) return { content: [{ type: 'text', text: 'collection_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    const qs = params.toString();
    return this.get(`/collections/${encodeURIComponent(args.collection_id as string)}/items${qs ? '?' + qs : ''}`);
  }

  private async getCollectionItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id || !args.item_id) {
      return { content: [{ type: 'text', text: 'collection_id and item_id are required' }], isError: true };
    }
    return this.get(`/collections/${encodeURIComponent(args.collection_id as string)}/items/${encodeURIComponent(args.item_id as string)}`);
  }

  private async createCollectionItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id || !args.field_data) {
      return { content: [{ type: 'text', text: 'collection_id and field_data are required' }], isError: true };
    }
    const body: Record<string, unknown> = { fieldData: args.field_data };
    if (typeof args.is_draft === 'boolean') body.isDraft = args.is_draft;
    return this.post(`/collections/${encodeURIComponent(args.collection_id as string)}/items`, body);
  }

  private async updateCollectionItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id || !args.item_id || !args.field_data) {
      return { content: [{ type: 'text', text: 'collection_id, item_id, and field_data are required' }], isError: true };
    }
    const body: Record<string, unknown> = { fieldData: args.field_data };
    if (typeof args.is_draft === 'boolean') body.isDraft = args.is_draft;
    return this.patch(`/collections/${encodeURIComponent(args.collection_id as string)}/items/${encodeURIComponent(args.item_id as string)}`, body);
  }

  private async deleteCollectionItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id || !args.item_id) {
      return { content: [{ type: 'text', text: 'collection_id and item_id are required' }], isError: true };
    }
    return this.del(`/collections/${encodeURIComponent(args.collection_id as string)}/items/${encodeURIComponent(args.item_id as string)}`);
  }

  private async publishCollectionItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.collection_id || !args.item_ids) {
      return { content: [{ type: 'text', text: 'collection_id and item_ids are required' }], isError: true };
    }
    return this.post(`/collections/${encodeURIComponent(args.collection_id as string)}/items/publish`, { itemIds: args.item_ids });
  }

  private async listAssets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.get(`/sites/${encodeURIComponent(args.site_id as string)}/assets`);
  }

  private async listAssetFolders(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.get(`/sites/${encodeURIComponent(args.site_id as string)}/asset_folders`);
  }

  private async listForms(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    return this.get(`/sites/${encodeURIComponent(args.site_id as string)}/forms`);
  }

  private async listFormSubmissions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.form_id) return { content: [{ type: 'text', text: 'form_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    const qs = params.toString();
    return this.get(`/forms/${encodeURIComponent(args.form_id as string)}/submissions${qs ? '?' + qs : ''}`);
  }

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    const qs = params.toString();
    return this.get(`/sites/${encodeURIComponent(args.site_id as string)}/products${qs ? '?' + qs : ''}`);
  }

  private async listOrders(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.status) params.set('status', args.status as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.offset) params.set('offset', String(args.offset));
    const qs = params.toString();
    return this.get(`/sites/${encodeURIComponent(args.site_id as string)}/orders${qs ? '?' + qs : ''}`);
  }
}
