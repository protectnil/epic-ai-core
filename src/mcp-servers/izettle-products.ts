/**
 * iZettle Product Library API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official iZettle/Zettle Product Library MCP server was found on GitHub.
// We build a full REST wrapper for complete Product Library API coverage.
//
// Base URL: https://products.izettle.com
// Auth: OAuth2 Bearer token (Zettle OAuth2 — https://developer.zettle.com/docs/api/authentication)
// Docs: https://developer.zettle.com/docs/api/product-library/
// Spec: https://api.apis.guru/v2/specs/izettle.com/products/1.0.0/openapi.json
// Category: commerce
// Rate limits: See Zettle developer docs

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IZettleProductsConfig {
  accessToken: string;
  baseUrl?: string;
}

export class IZettleProductsMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: IZettleProductsConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://products.izettle.com';
  }

  static catalog() {
    return {
      name: 'izettle-products',
      displayName: 'iZettle Product Library',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'izettle', 'zettle', 'paypal', 'pos', 'point-of-sale', 'products',
        'inventory', 'catalog', 'categories', 'discounts', 'images',
        'tax', 'tax-rates', 'library', 'merchant', 'retail', 'variants',
        'sku', 'barcode', 'pricing', 'e-commerce',
      ],
      toolNames: [
        'get_library',
        'get_all_products',
        'get_all_products_v2',
        'count_products',
        'get_product',
        'create_product',
        'update_product',
        'delete_product',
        'delete_products',
        'create_product_slug',
        'get_all_options',
        'get_categories',
        'create_categories',
        'delete_category',
        'rename_category',
        'get_all_discounts',
        'get_discount',
        'create_discount',
        'update_discount',
        'delete_discount',
        'get_all_image_urls',
        'import_library',
        'get_import_status',
        'get_import_status_by_uuid',
        'get_tax_rates',
        'get_tax_rate',
        'create_tax_rates',
        'update_tax_rate',
        'delete_tax_rate',
        'get_tax_settings',
        'set_taxation_mode',
        'get_product_count_for_taxes',
      ],
      description: 'iZettle (Zettle by PayPal) Product Library API: manage products, variants, categories, discounts, images, tax rates, and bulk import for merchant point-of-sale catalogs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Library ------------------------------------------------------------
      {
        name: 'get_library',
        description: 'Get the full product library for an organization, including products, discounts, and categories. Supports pagination and event-log-based delta sync.',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to retrieve the library for',
            },
            eventLogUuid: {
              type: 'string',
              description: 'Event log UUID for delta sync — returns only items changed since this event',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of items to return',
            },
            offset: {
              type: 'integer',
              description: 'Number of items to skip for pagination',
            },
            all: {
              type: 'boolean',
              description: 'If true, include deleted items in the response',
            },
          },
          required: ['organizationUuid'],
        },
      },
      // -- Products -----------------------------------------------------------
      {
        name: 'get_all_products',
        description: 'Get all products in the POS (point-of-sale) product library for an organization',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to retrieve products for',
            },
          },
          required: ['organizationUuid'],
        },
      },
      {
        name: 'get_all_products_v2',
        description: 'Get all products (v2) for an organization with optional sort order',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to retrieve products for',
            },
            sort: {
              type: 'string',
              description: 'Sort order for the results (e.g. name ASC)',
            },
          },
          required: ['organizationUuid'],
        },
      },
      {
        name: 'count_products',
        description: 'Get the total count of all products in the organization catalog',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to count products for',
            },
          },
          required: ['organizationUuid'],
        },
      },
      {
        name: 'get_product',
        description: 'Get a single product by its UUID from the organization product library',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID that owns the product',
            },
            productUuid: {
              type: 'string',
              description: 'Product UUID to retrieve',
            },
          },
          required: ['organizationUuid', 'productUuid'],
        },
      },
      {
        name: 'create_product',
        description: 'Create a new product in the organization product library with variants, pricing, and categories',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to create the product under',
            },
            name: {
              type: 'string',
              description: 'Product name',
            },
            description: {
              type: 'string',
              description: 'Product description',
            },
            imageLookupKeys: {
              type: 'array',
              description: 'Array of image lookup keys to attach to the product',
              items: { type: 'string' },
            },
            category: {
              type: 'object',
              description: 'Category object with uuid field to assign the product to',
            },
            variants: {
              type: 'array',
              description: 'Array of product variant objects (price, cost, barcode, sku, options)',
              items: { type: 'object' },
            },
            taxExempt: {
              type: 'boolean',
              description: 'If true, the product is exempt from taxes',
            },
            unitName: {
              type: 'string',
              description: 'Unit of measure name (e.g. kg, pcs)',
            },
            vatPercentage: {
              type: 'number',
              description: 'VAT percentage to apply to this product',
            },
            returnEntity: {
              type: 'boolean',
              description: 'If true, return the created product object in the response',
            },
          },
          required: ['organizationUuid', 'name'],
        },
      },
      {
        name: 'update_product',
        description: 'Update an existing product in the organization library (v2 endpoint)',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID that owns the product',
            },
            productUuid: {
              type: 'string',
              description: 'Product UUID to update',
            },
            name: {
              type: 'string',
              description: 'Updated product name',
            },
            description: {
              type: 'string',
              description: 'Updated product description',
            },
            category: {
              type: 'object',
              description: 'Updated category object with uuid field',
            },
            variants: {
              type: 'array',
              description: 'Updated array of product variant objects',
              items: { type: 'object' },
            },
            taxExempt: {
              type: 'boolean',
              description: 'Updated tax exemption status',
            },
            vatPercentage: {
              type: 'number',
              description: 'Updated VAT percentage',
            },
          },
          required: ['organizationUuid', 'productUuid'],
        },
      },
      {
        name: 'delete_product',
        description: 'Delete a single product from the organization product library by UUID',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID that owns the product',
            },
            productUuid: {
              type: 'string',
              description: 'Product UUID to delete',
            },
          },
          required: ['organizationUuid', 'productUuid'],
        },
      },
      {
        name: 'delete_products',
        description: 'Delete multiple products by UUID in a single request',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID that owns the products',
            },
            uuids: {
              type: 'array',
              description: 'Array of product UUIDs to delete',
              items: { type: 'string' },
            },
          },
          required: ['organizationUuid', 'uuids'],
        },
      },
      {
        name: 'create_product_slug',
        description: 'Create an online slug for a product (used for online store URLs)',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID that owns the product',
            },
            productUuid: {
              type: 'string',
              description: 'Product UUID to create a slug for',
            },
            slug: {
              type: 'string',
              description: 'Desired URL slug for the product',
            },
          },
          required: ['organizationUuid'],
        },
      },
      {
        name: 'get_all_options',
        description: 'Get all product variant options (e.g. Size, Color) defined in the organization library',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to retrieve options for',
            },
          },
          required: ['organizationUuid'],
        },
      },
      // -- Categories ---------------------------------------------------------
      {
        name: 'get_categories',
        description: 'Get all product categories (v2) for the organization',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to retrieve categories for',
            },
          },
          required: ['organizationUuid'],
        },
      },
      {
        name: 'create_categories',
        description: 'Create one or more product categories in the organization library',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to create categories under',
            },
            categories: {
              type: 'array',
              description: 'Array of category objects to create (each with a name field)',
              items: { type: 'object' },
            },
          },
          required: ['organizationUuid', 'categories'],
        },
      },
      {
        name: 'delete_category',
        description: 'Delete a product category from the organization library by UUID',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID that owns the category',
            },
            categoryUuid: {
              type: 'string',
              description: 'Category UUID to delete',
            },
          },
          required: ['organizationUuid', 'categoryUuid'],
        },
      },
      {
        name: 'rename_category',
        description: 'Rename an existing product category by UUID',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID that owns the category',
            },
            categoryUuid: {
              type: 'string',
              description: 'Category UUID to rename',
            },
            name: {
              type: 'string',
              description: 'New name for the category',
            },
          },
          required: ['organizationUuid', 'categoryUuid', 'name'],
        },
      },
      // -- Discounts ----------------------------------------------------------
      {
        name: 'get_all_discounts',
        description: 'Get all discounts defined in the organization product library',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to retrieve discounts for',
            },
          },
          required: ['organizationUuid'],
        },
      },
      {
        name: 'get_discount',
        description: 'Get a single discount by UUID from the organization library',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID that owns the discount',
            },
            discountUuid: {
              type: 'string',
              description: 'Discount UUID to retrieve',
            },
          },
          required: ['organizationUuid', 'discountUuid'],
        },
      },
      {
        name: 'create_discount',
        description: 'Create a new discount in the organization library (percentage or amount-based)',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to create the discount under',
            },
            name: {
              type: 'string',
              description: 'Display name for the discount',
            },
            description: {
              type: 'string',
              description: 'Description of the discount',
            },
            percentage: {
              type: 'number',
              description: 'Discount percentage (e.g. 10.0 for 10% off)',
            },
            amount: {
              type: 'object',
              description: 'Fixed amount discount object with currencyId and amount fields',
            },
            imageLookupKeys: {
              type: 'array',
              description: 'Array of image lookup keys to attach to the discount',
              items: { type: 'string' },
            },
          },
          required: ['organizationUuid', 'name'],
        },
      },
      {
        name: 'update_discount',
        description: 'Update an existing discount in the organization library',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID that owns the discount',
            },
            discountUuid: {
              type: 'string',
              description: 'Discount UUID to update',
            },
            name: {
              type: 'string',
              description: 'Updated display name',
            },
            description: {
              type: 'string',
              description: 'Updated description',
            },
            percentage: {
              type: 'number',
              description: 'Updated discount percentage',
            },
            amount: {
              type: 'object',
              description: 'Updated fixed amount discount object',
            },
          },
          required: ['organizationUuid', 'discountUuid'],
        },
      },
      {
        name: 'delete_discount',
        description: 'Delete a discount from the organization product library by UUID',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID that owns the discount',
            },
            discountUuid: {
              type: 'string',
              description: 'Discount UUID to delete',
            },
          },
          required: ['organizationUuid', 'discountUuid'],
        },
      },
      // -- Images -------------------------------------------------------------
      {
        name: 'get_all_image_urls',
        description: 'Get all product image URLs for the organization (returns image lookup keys and their hosted URLs)',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to retrieve image URLs for',
            },
          },
          required: ['organizationUuid'],
        },
      },
      // -- Import -------------------------------------------------------------
      {
        name: 'import_library',
        description: 'Bulk import products, categories, and discounts into the organization library (v2)',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to import into',
            },
            products: {
              type: 'array',
              description: 'Array of product objects to import',
              items: { type: 'object' },
            },
            categories: {
              type: 'array',
              description: 'Array of category objects to import',
              items: { type: 'object' },
            },
            discounts: {
              type: 'array',
              description: 'Array of discount objects to import',
              items: { type: 'object' },
            },
          },
          required: ['organizationUuid'],
        },
      },
      {
        name: 'get_import_status',
        description: 'Get the status of the latest bulk library import for the organization',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID to get import status for',
            },
          },
          required: ['organizationUuid'],
        },
      },
      {
        name: 'get_import_status_by_uuid',
        description: 'Get the status of a specific bulk library import job by import UUID',
        inputSchema: {
          type: 'object',
          properties: {
            organizationUuid: {
              type: 'string',
              description: 'Organization UUID that owns the import job',
            },
            importUuid: {
              type: 'string',
              description: 'Import job UUID to check status for',
            },
          },
          required: ['organizationUuid', 'importUuid'],
        },
      },
      // -- Tax Rates ----------------------------------------------------------
      {
        name: 'get_tax_rates',
        description: 'Get all tax rates configured for the merchant account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_tax_rate',
        description: 'Get a single tax rate by UUID',
        inputSchema: {
          type: 'object',
          properties: {
            taxRateUuid: {
              type: 'string',
              description: 'Tax rate UUID to retrieve',
            },
          },
          required: ['taxRateUuid'],
        },
      },
      {
        name: 'create_tax_rates',
        description: 'Create one or more tax rates for the merchant account',
        inputSchema: {
          type: 'object',
          properties: {
            taxRates: {
              type: 'array',
              description: 'Array of tax rate objects to create (each with label and percentage fields)',
              items: { type: 'object' },
            },
          },
          required: ['taxRates'],
        },
      },
      {
        name: 'update_tax_rate',
        description: 'Update an existing tax rate by UUID',
        inputSchema: {
          type: 'object',
          properties: {
            taxRateUuid: {
              type: 'string',
              description: 'Tax rate UUID to update',
            },
            label: {
              type: 'string',
              description: 'Updated label for the tax rate',
            },
            percentage: {
              type: 'number',
              description: 'Updated tax percentage',
            },
          },
          required: ['taxRateUuid'],
        },
      },
      {
        name: 'delete_tax_rate',
        description: 'Delete a tax rate by UUID (cannot delete tax rates currently assigned to products)',
        inputSchema: {
          type: 'object',
          properties: {
            taxRateUuid: {
              type: 'string',
              description: 'Tax rate UUID to delete',
            },
          },
          required: ['taxRateUuid'],
        },
      },
      {
        name: 'get_tax_settings',
        description: 'Get the current taxation mode settings for the merchant account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'set_taxation_mode',
        description: 'Set the taxation mode for the merchant account (EXCLUSIVE = tax added on top, INCLUSIVE = tax included in price)',
        inputSchema: {
          type: 'object',
          properties: {
            taxationMode: {
              type: 'string',
              description: 'Taxation mode to set: EXCLUSIVE or INCLUSIVE',
              enum: ['EXCLUSIVE', 'INCLUSIVE'],
            },
          },
          required: ['taxationMode'],
        },
      },
      {
        name: 'get_product_count_for_taxes',
        description: 'Get the count of products assigned to each tax rate in the merchant account',
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
        case 'get_library':                 return this.getLibrary(args);
        case 'get_all_products':            return this.getAllProducts(args);
        case 'get_all_products_v2':         return this.getAllProductsV2(args);
        case 'count_products':              return this.countProducts(args);
        case 'get_product':                 return this.getProduct(args);
        case 'create_product':              return this.createProduct(args);
        case 'update_product':              return this.updateProduct(args);
        case 'delete_product':              return this.deleteProduct(args);
        case 'delete_products':             return this.deleteProducts(args);
        case 'create_product_slug':         return this.createProductSlug(args);
        case 'get_all_options':             return this.getAllOptions(args);
        case 'get_categories':              return this.getCategories(args);
        case 'create_categories':           return this.createCategories(args);
        case 'delete_category':             return this.deleteCategory(args);
        case 'rename_category':             return this.renameCategory(args);
        case 'get_all_discounts':           return this.getAllDiscounts(args);
        case 'get_discount':                return this.getDiscount(args);
        case 'create_discount':             return this.createDiscount(args);
        case 'update_discount':             return this.updateDiscount(args);
        case 'delete_discount':             return this.deleteDiscount(args);
        case 'get_all_image_urls':          return this.getAllImageUrls(args);
        case 'import_library':              return this.importLibrary(args);
        case 'get_import_status':           return this.getImportStatus(args);
        case 'get_import_status_by_uuid':   return this.getImportStatusByUuid(args);
        case 'get_tax_rates':               return this.getTaxRates();
        case 'get_tax_rate':                return this.getTaxRate(args);
        case 'create_tax_rates':            return this.createTaxRates(args);
        case 'update_tax_rate':             return this.updateTaxRate(args);
        case 'delete_tax_rate':             return this.deleteTaxRate(args);
        case 'get_tax_settings':            return this.getTaxSettings();
        case 'set_taxation_mode':           return this.setTaxationMode(args);
        case 'get_product_count_for_taxes': return this.getProductCountForTaxes();
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

  // -- Private helpers -------------------------------------------------------

  private get authHeader(): string {
    return `Bearer ${this.accessToken}`;
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    queryParams?: Record<string, string>,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const qs = new URLSearchParams(queryParams).toString();
      url = `${url}?${qs}`;
    }
    const init: RequestInit = {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // -- Library ---------------------------------------------------------------

  private async getLibrary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid is required' }], isError: true };
    }
    const query: Record<string, string> = {};
    if (args.eventLogUuid) query.eventLogUuid = String(args.eventLogUuid);
    if (args.limit !== undefined) query.limit = String(args.limit);
    if (args.offset !== undefined) query.offset = String(args.offset);
    if (args.all !== undefined) query.all = String(args.all);
    return this.request('GET', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/library`, undefined, query);
  }

  // -- Products --------------------------------------------------------------

  private async getAllProducts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid is required' }], isError: true };
    }
    return this.request('GET', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/products`);
  }

  private async getAllProductsV2(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid is required' }], isError: true };
    }
    const query: Record<string, string> = {};
    if (args.sort) query.sort = String(args.sort);
    return this.request('GET', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/products/v2`, undefined, query);
  }

  private async countProducts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid is required' }], isError: true };
    }
    return this.request('GET', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/products/v2/count`);
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !args.productUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid and productUuid are required' }], isError: true };
    }
    return this.request('GET', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/products/${encodeURIComponent(args.productUuid as string)}`);
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !args.name) {
      return { content: [{ type: 'text', text: 'organizationUuid and name are required' }], isError: true };
    }
    const { organizationUuid, returnEntity, ...body } = args;
    const query: Record<string, string> = {};
    if (returnEntity !== undefined) query.returnEntity = String(returnEntity);
    return this.request('POST', `/organizations/${encodeURIComponent(organizationUuid as string)}/products`, body as Record<string, unknown>, query);
  }

  private async updateProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !args.productUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid and productUuid are required' }], isError: true };
    }
    const { organizationUuid, productUuid, ...body } = args;
    return this.request('PUT', `/organizations/${encodeURIComponent(organizationUuid as string)}/products/v2/${encodeURIComponent(productUuid as string)}`, body as Record<string, unknown>);
  }

  private async deleteProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !args.productUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid and productUuid are required' }], isError: true };
    }
    return this.request('DELETE', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/products/${encodeURIComponent(args.productUuid as string)}`);
  }

  private async deleteProducts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !Array.isArray(args.uuids) || args.uuids.length === 0) {
      return { content: [{ type: 'text', text: 'organizationUuid and uuids (non-empty array) are required' }], isError: true };
    }
    const query: Record<string, string> = { uuid: (args.uuids as string[]).join(',') };
    return this.request('DELETE', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/products`, undefined, query);
  }

  private async createProductSlug(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid is required' }], isError: true };
    }
    const { organizationUuid, ...body } = args;
    return this.request('POST', `/organizations/${encodeURIComponent(organizationUuid as string)}/products/online/slug`, body as Record<string, unknown>);
  }

  private async getAllOptions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid is required' }], isError: true };
    }
    return this.request('GET', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/products/options`);
  }

  // -- Categories ------------------------------------------------------------

  private async getCategories(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid is required' }], isError: true };
    }
    return this.request('GET', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/categories/v2`);
  }

  private async createCategories(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !args.categories) {
      return { content: [{ type: 'text', text: 'organizationUuid and categories are required' }], isError: true };
    }
    return this.request('POST', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/categories/v2`, { categories: args.categories } as Record<string, unknown>);
  }

  private async deleteCategory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !args.categoryUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid and categoryUuid are required' }], isError: true };
    }
    return this.request('DELETE', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/categories/v2/${encodeURIComponent(args.categoryUuid as string)}`);
  }

  private async renameCategory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !args.categoryUuid || !args.name) {
      return { content: [{ type: 'text', text: 'organizationUuid, categoryUuid, and name are required' }], isError: true };
    }
    const { organizationUuid, categoryUuid, ...body } = args;
    return this.request('PATCH', `/organizations/${encodeURIComponent(organizationUuid as string)}/categories/v2/${encodeURIComponent(categoryUuid as string)}`, body as Record<string, unknown>);
  }

  // -- Discounts -------------------------------------------------------------

  private async getAllDiscounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid is required' }], isError: true };
    }
    return this.request('GET', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/discounts`);
  }

  private async getDiscount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !args.discountUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid and discountUuid are required' }], isError: true };
    }
    return this.request('GET', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/discounts/${encodeURIComponent(args.discountUuid as string)}`);
  }

  private async createDiscount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !args.name) {
      return { content: [{ type: 'text', text: 'organizationUuid and name are required' }], isError: true };
    }
    const { organizationUuid, ...body } = args;
    return this.request('POST', `/organizations/${encodeURIComponent(organizationUuid as string)}/discounts`, body as Record<string, unknown>);
  }

  private async updateDiscount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !args.discountUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid and discountUuid are required' }], isError: true };
    }
    const { organizationUuid, discountUuid, ...body } = args;
    return this.request('PUT', `/organizations/${encodeURIComponent(organizationUuid as string)}/discounts/${encodeURIComponent(discountUuid as string)}`, body as Record<string, unknown>);
  }

  private async deleteDiscount(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !args.discountUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid and discountUuid are required' }], isError: true };
    }
    return this.request('DELETE', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/discounts/${encodeURIComponent(args.discountUuid as string)}`);
  }

  // -- Images ----------------------------------------------------------------

  private async getAllImageUrls(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid is required' }], isError: true };
    }
    return this.request('GET', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/images`);
  }

  // -- Import ----------------------------------------------------------------

  private async importLibrary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid is required' }], isError: true };
    }
    const { organizationUuid, ...body } = args;
    return this.request('POST', `/organizations/${encodeURIComponent(organizationUuid as string)}/import/v2`, body as Record<string, unknown>);
  }

  private async getImportStatus(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid is required' }], isError: true };
    }
    return this.request('GET', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/import/status`);
  }

  private async getImportStatusByUuid(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.organizationUuid || !args.importUuid) {
      return { content: [{ type: 'text', text: 'organizationUuid and importUuid are required' }], isError: true };
    }
    return this.request('GET', `/organizations/${encodeURIComponent(args.organizationUuid as string)}/import/status/${encodeURIComponent(args.importUuid as string)}`);
  }

  // -- Tax Rates -------------------------------------------------------------

  private async getTaxRates(): Promise<ToolResult> {
    return this.request('GET', '/v1/taxes');
  }

  private async getTaxRate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.taxRateUuid) {
      return { content: [{ type: 'text', text: 'taxRateUuid is required' }], isError: true };
    }
    return this.request('GET', `/v1/taxes/${encodeURIComponent(args.taxRateUuid as string)}`);
  }

  private async createTaxRates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.taxRates) {
      return { content: [{ type: 'text', text: 'taxRates is required' }], isError: true };
    }
    return this.request('POST', '/v1/taxes', { taxRates: args.taxRates } as Record<string, unknown>);
  }

  private async updateTaxRate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.taxRateUuid) {
      return { content: [{ type: 'text', text: 'taxRateUuid is required' }], isError: true };
    }
    const { taxRateUuid, ...body } = args;
    return this.request('PUT', `/v1/taxes/${encodeURIComponent(taxRateUuid as string)}`, body as Record<string, unknown>);
  }

  private async deleteTaxRate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.taxRateUuid) {
      return { content: [{ type: 'text', text: 'taxRateUuid is required' }], isError: true };
    }
    return this.request('DELETE', `/v1/taxes/${encodeURIComponent(args.taxRateUuid as string)}`);
  }

  private async getTaxSettings(): Promise<ToolResult> {
    return this.request('GET', '/v1/taxes/settings');
  }

  private async setTaxationMode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.taxationMode) {
      return { content: [{ type: 'text', text: 'taxationMode is required' }], isError: true };
    }
    return this.request('PUT', '/v1/taxes/settings', { taxationMode: args.taxationMode } as Record<string, unknown>);
  }

  private async getProductCountForTaxes(): Promise<ToolResult> {
    return this.request('GET', '/v1/taxes/count');
  }
}
