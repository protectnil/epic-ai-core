/**
 * Zalando MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Zalando MCP server was found on GitHub.
//
// Base URL: https://api.zalando.com
// Auth: None required for public catalog endpoints (read-only shop API)
// Docs: https://docs.zalando.com/
// Rate limits: ~60 req/min per IP for public API

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ZalandoConfig {
  baseUrl?: string;
}

export class ZalandoMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: ZalandoConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://api.zalando.com';
  }

  static catalog() {
    return {
      name: 'zalando',
      displayName: 'Zalando',
      version: '1.0.0',
      category: 'ecommerce' as const,
      keywords: ['zalando', 'fashion', 'ecommerce', 'clothing', 'shoes', 'articles'],
      toolNames: [
        'list_articles',
        'get_article',
        'get_article_media',
        'get_article_reviews',
        'get_article_reviews_summary',
        'list_article_units',
        'get_article_unit',
        'list_brands',
        'get_brand',
        'list_categories',
        'get_category',
        'list_domains',
        'get_recommendations',
        'list_filters',
        'get_filter',
      ],
      description: 'Zalando fashion e-commerce catalog adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_articles',
        description: 'Search and list Zalando articles (products) with optional filters for brand, category, gender, price range, and more.',
        inputSchema: {
          type: 'object',
          properties: {
            brand: { type: 'string', description: 'Filter by brand key (e.g. "AG3" for Adidas)' },
            category: { type: 'string', description: 'Filter by category key' },
            gender: { type: 'string', description: 'Filter by gender: MALE, FEMALE, or NEUTRAL' },
            age_group: { type: 'string', description: 'Filter by age group: adult, child' },
            size: { type: 'string', description: 'Filter by size (e.g. "38", "M", "XL")' },
            price_min: { type: 'number', description: 'Minimum price filter in the local currency' },
            price_max: { type: 'number', description: 'Maximum price filter in the local currency' },
            sale: { type: 'boolean', description: 'Filter for sale items only' },
            q: { type: 'string', description: 'Free-text search query' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 20, max: 200)' },
          },
        },
      },
      {
        name: 'get_article',
        description: 'Retrieve full details for a specific Zalando article by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: { type: 'string', description: 'Zalando article ID (config SKU, e.g. "AD116A083-Q12")' },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'get_article_media',
        description: 'Retrieve media (images, videos) for a specific article.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: { type: 'string', description: 'Zalando article ID' },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'get_article_reviews',
        description: 'Retrieve customer reviews for a specific article.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: { type: 'string', description: 'Zalando article ID (config SKU)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Reviews per page (default: 20)' },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'get_article_reviews_summary',
        description: 'Retrieve the review summary (average rating, count) for a specific article model.',
        inputSchema: {
          type: 'object',
          properties: {
            article_model_id: { type: 'string', description: 'Zalando article model ID (model SKU, e.g. "AD116A083")' },
          },
          required: ['article_model_id'],
        },
      },
      {
        name: 'list_article_units',
        description: 'List all available units (sizes/variants) for a specific article.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: { type: 'string', description: 'Zalando article ID' },
          },
          required: ['article_id'],
        },
      },
      {
        name: 'get_article_unit',
        description: 'Retrieve details for a specific unit (size/variant) of an article.',
        inputSchema: {
          type: 'object',
          properties: {
            article_id: { type: 'string', description: 'Zalando article ID' },
            unit_id: { type: 'string', description: 'Unit ID (simple SKU)' },
          },
          required: ['article_id', 'unit_id'],
        },
      },
      {
        name: 'list_brands',
        description: 'List all available brands on Zalando with optional pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Brands per page (default: 20)' },
          },
        },
      },
      {
        name: 'get_brand',
        description: 'Retrieve details for a specific brand by its key.',
        inputSchema: {
          type: 'object',
          properties: {
            brand_key: { type: 'string', description: 'Brand key (e.g. "AG3" for Adidas)' },
          },
          required: ['brand_key'],
        },
      },
      {
        name: 'list_categories',
        description: 'List product categories available on Zalando with optional filters.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter categories by name (partial match)' },
            type: { type: 'string', description: 'Category type filter' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
          },
        },
      },
      {
        name: 'get_category',
        description: 'Retrieve details for a specific category by its key.',
        inputSchema: {
          type: 'object',
          properties: {
            category_key: { type: 'string', description: 'Category key (e.g. "mens-clothing-shirts")' },
          },
          required: ['category_key'],
        },
      },
      {
        name: 'list_domains',
        description: 'List Zalando domains (localised storefronts) available via the API.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_recommendations',
        description: 'Retrieve article recommendations based on one or more article IDs.',
        inputSchema: {
          type: 'object',
          properties: {
            article_ids: {
              type: 'array',
              description: 'List of article IDs to base recommendations on (1-20 IDs)',
              items: { type: 'string' },
            },
            max_results: { type: 'number', description: 'Maximum number of recommendations to return (default: 6)' },
          },
          required: ['article_ids'],
        },
      },
      {
        name: 'list_filters',
        description: 'List all available search filters for the Zalando catalog.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            page_size: { type: 'number', description: 'Results per page (default: 20)' },
          },
        },
      },
      {
        name: 'get_filter',
        description: 'Retrieve details and possible values for a specific filter.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_name: { type: 'string', description: 'Filter name (e.g. "gender", "size", "brand")' },
          },
          required: ['filter_name'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_articles': return await this.listArticles(args);
        case 'get_article': return await this.getArticle(args);
        case 'get_article_media': return await this.getArticleMedia(args);
        case 'get_article_reviews': return await this.getArticleReviews(args);
        case 'get_article_reviews_summary': return await this.getArticleReviewsSummary(args);
        case 'list_article_units': return await this.listArticleUnits(args);
        case 'get_article_unit': return await this.getArticleUnit(args);
        case 'list_brands': return await this.listBrands(args);
        case 'get_brand': return await this.getBrand(args);
        case 'list_categories': return await this.listCategories(args);
        case 'get_category': return await this.getCategory(args);
        case 'list_domains': return await this.listDomains();
        case 'get_recommendations': return await this.getRecommendations(args);
        case 'list_filters': return await this.listFilters(args);
        case 'get_filter': return await this.getFilter(args);
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
    return { Accept: 'application/json' };
  }


  private async httpGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Zalando API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Zalando returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listArticles(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.brand) params.append('brand', args.brand as string);
    if (args.category) params.append('category', args.category as string);
    if (args.gender) params.append('gender', args.gender as string);
    if (args.age_group) params.append('ageGroup', args.age_group as string);
    if (args.size) params.append('size', args.size as string);
    if (args.price_min !== undefined) params.set('priceRange', `${args.price_min}-${args.price_max ?? ''}`);
    if (args.sale) params.set('sale', 'true');
    if (args.q) params.set('q', args.q as string);
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.httpGet(`/articles${qs}`);
  }

  private async getArticle(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.article_id as string;
    if (!id) return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    return this.httpGet(`/articles/${encodeURIComponent(id)}`);
  }

  private async getArticleMedia(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.article_id as string;
    if (!id) return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    return this.httpGet(`/articles/${encodeURIComponent(id)}/media`);
  }

  private async getArticleReviews(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.article_id as string;
    if (!id) return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    const params = new URLSearchParams({ articleId: id });
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    return this.httpGet(`/article-reviews?${params.toString()}`);
  }

  private async getArticleReviewsSummary(args: Record<string, unknown>): Promise<ToolResult> {
    const modelId = args.article_model_id as string;
    if (!modelId) return { content: [{ type: 'text', text: 'article_model_id is required' }], isError: true };
    return this.httpGet(`/article-reviews-summaries/${encodeURIComponent(modelId)}`);
  }

  private async listArticleUnits(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.article_id as string;
    if (!id) return { content: [{ type: 'text', text: 'article_id is required' }], isError: true };
    return this.httpGet(`/articles/${encodeURIComponent(id)}/units`);
  }

  private async getArticleUnit(args: Record<string, unknown>): Promise<ToolResult> {
    const articleId = args.article_id as string;
    const unitId = args.unit_id as string;
    if (!articleId || !unitId) return { content: [{ type: 'text', text: 'article_id and unit_id are required' }], isError: true };
    return this.httpGet(`/articles/${encodeURIComponent(articleId)}/units/${encodeURIComponent(unitId)}`);
  }

  private async listBrands(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.httpGet(`/brands${qs}`);
  }

  private async getBrand(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.brand_key as string;
    if (!key) return { content: [{ type: 'text', text: 'brand_key is required' }], isError: true };
    return this.httpGet(`/brands/${encodeURIComponent(key)}`);
  }

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.name) params.set('name', args.name as string);
    if (args.type) params.set('type', args.type as string);
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.httpGet(`/categories${qs}`);
  }

  private async getCategory(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.category_key as string;
    if (!key) return { content: [{ type: 'text', text: 'category_key is required' }], isError: true };
    return this.httpGet(`/categories/${encodeURIComponent(key)}`);
  }

  private async listDomains(): Promise<ToolResult> {
    return this.httpGet('/domains');
  }

  private async getRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    const ids = args.article_ids as string[];
    if (!ids || ids.length === 0) return { content: [{ type: 'text', text: 'article_ids is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.max_results) params.set('maxResults', String(args.max_results));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.httpGet(`/recommendations/${ids.map(encodeURIComponent).join(',')}${qs}`);
  }

  private async listFilters(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page));
    if (args.page_size) params.set('pageSize', String(args.page_size));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.httpGet(`/filters${qs}`);
  }

  private async getFilter(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.filter_name as string;
    if (!name) return { content: [{ type: 'text', text: 'filter_name is required' }], isError: true };
    return this.httpGet(`/filters/${encodeURIComponent(name)}`);
  }
}
