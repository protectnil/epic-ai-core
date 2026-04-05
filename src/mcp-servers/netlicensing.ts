/**
 * NetLicensing MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official Labs64 NetLicensing vendor MCP exists as of 2026-03.
//   Community: None found.
//   Our adapter covers: 14 tools across products, product modules, license templates, licensees,
//     licenses, transactions, tokens, and utility endpoints.
//
// Base URL: https://go.netlicensing.io/core/v2/rest
// Auth: HTTP Basic Auth (username:password) or Bearer token in Authorization header
// Docs: https://netlicensing.io/wiki/restful-api
// Rate limits: Not publicly documented. Contact support@netlicensing.com for enterprise limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NetLicensingConfig {
  username: string;
  password: string;
  /** Optional base URL override (default: https://go.netlicensing.io/core/v2/rest) */
  baseUrl?: string;
}

export class NetlicensingMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor(config: NetLicensingConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl ?? 'https://go.netlicensing.io/core/v2/rest';
  }

  static catalog() {
    return {
      name: 'netlicensing',
      displayName: 'NetLicensing',
      version: '1.0.0',
      category: 'commerce',
      keywords: [
        'netlicensing', 'license', 'licensing', 'software-license', 'entitlement',
        'subscription', 'product', 'module', 'token', 'validation', 'transaction',
        'drm', 'saas', 'monetization', 'usage', 'quota', 'trial',
      ],
      toolNames: [
        'list_products', 'create_product', 'get_product', 'update_product', 'delete_product',
        'list_product_modules', 'create_product_module', 'get_product_module', 'update_product_module',
        'list_license_templates', 'create_license_template', 'get_license_template',
        'list_licensees', 'create_licensee', 'get_licensee', 'update_licensee', 'validate_licensee',
        'list_licenses', 'create_license', 'get_license', 'update_license',
        'list_transactions', 'get_transaction',
        'list_tokens', 'create_token',
        'list_license_types', 'list_licensing_models',
      ],
      description: 'NetLicensing software license management: manage products, modules, license templates, licensees, licenses, transactions, and tokens. Supports validation, subscription, and usage-based licensing models.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_products',
        description: 'List all products in the NetLicensing vendor account with their numbers, names, and active status',
        inputSchema: {
          type: 'object',
          properties: {
            active: { type: 'boolean', description: 'Filter by active status (true = active only, false = inactive only, omit = all)' },
          },
        },
      },
      {
        name: 'create_product',
        description: 'Create a new product in NetLicensing to represent a software product or service offering',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Product display name' },
            number: { type: 'string', description: 'Optional unique product number (auto-generated if omitted)' },
            active: { type: 'boolean', description: 'Whether the product is active (default: true)' },
            description: { type: 'string', description: 'Product description' },
            version: { type: 'string', description: 'Product version string' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_product',
        description: 'Get details of a specific NetLicensing product by its product number',
        inputSchema: {
          type: 'object',
          properties: {
            product_number: { type: 'string', description: 'Product number (e.g. "P001")' },
          },
          required: ['product_number'],
        },
      },
      {
        name: 'update_product',
        description: 'Update an existing NetLicensing product (name, active status, description)',
        inputSchema: {
          type: 'object',
          properties: {
            product_number: { type: 'string', description: 'Product number to update' },
            name: { type: 'string', description: 'New product name' },
            active: { type: 'boolean', description: 'Active status' },
            description: { type: 'string', description: 'New product description' },
            version: { type: 'string', description: 'New version string' },
          },
          required: ['product_number'],
        },
      },
      {
        name: 'delete_product',
        description: 'Delete a NetLicensing product by its product number',
        inputSchema: {
          type: 'object',
          properties: {
            product_number: { type: 'string', description: 'Product number to delete' },
          },
          required: ['product_number'],
        },
      },
      {
        name: 'list_product_modules',
        description: 'List all product modules in the NetLicensing account (modules define licensing models per product)',
        inputSchema: {
          type: 'object',
          properties: {
            active: { type: 'boolean', description: 'Filter by active status' },
          },
        },
      },
      {
        name: 'create_product_module',
        description: 'Create a product module for a NetLicensing product, assigning a licensing model (e.g. Subscription, Try-and-Buy)',
        inputSchema: {
          type: 'object',
          properties: {
            product_number: { type: 'string', description: 'Product number this module belongs to' },
            name: { type: 'string', description: 'Module name' },
            number: { type: 'string', description: 'Optional unique module number' },
            active: { type: 'boolean', description: 'Whether the module is active (default: true)' },
            licensing_model: { type: 'string', description: 'Licensing model: Subscription, TryAndBuy, Rental, Floating, MultiFeature, PayPerUse, PricingTable, NodeLocked, Quota' },
          },
          required: ['product_number', 'name', 'licensing_model'],
        },
      },
      {
        name: 'get_product_module',
        description: 'Get details of a specific NetLicensing product module by its module number',
        inputSchema: {
          type: 'object',
          properties: {
            module_number: { type: 'string', description: 'Product module number' },
          },
          required: ['module_number'],
        },
      },
      {
        name: 'update_product_module',
        description: 'Update a NetLicensing product module (name, active status, or licensing model)',
        inputSchema: {
          type: 'object',
          properties: {
            module_number: { type: 'string', description: 'Product module number to update' },
            name: { type: 'string', description: 'New module name' },
            active: { type: 'boolean', description: 'Active status' },
            licensing_model: { type: 'string', description: 'New licensing model' },
          },
          required: ['module_number'],
        },
      },
      {
        name: 'list_license_templates',
        description: 'List all license templates in the NetLicensing account (templates define reusable license configurations)',
        inputSchema: {
          type: 'object',
          properties: {
            active: { type: 'boolean', description: 'Filter by active status' },
          },
        },
      },
      {
        name: 'create_license_template',
        description: 'Create a license template for a product module in NetLicensing to define licensable features',
        inputSchema: {
          type: 'object',
          properties: {
            module_number: { type: 'string', description: 'Product module number this template belongs to' },
            name: { type: 'string', description: 'Template name' },
            number: { type: 'string', description: 'Optional unique template number' },
            active: { type: 'boolean', description: 'Whether the template is active (default: true)' },
            automatic: { type: 'boolean', description: 'Auto-assign to new licensees (default: false)' },
            hidden: { type: 'boolean', description: 'Hide from licensees (default: false)' },
            price: { type: 'number', description: 'License price (0 for free)' },
            currency: { type: 'string', description: 'Currency code (e.g. EUR, USD)' },
          },
          required: ['module_number', 'name'],
        },
      },
      {
        name: 'get_license_template',
        description: 'Get details of a specific NetLicensing license template by its template number',
        inputSchema: {
          type: 'object',
          properties: {
            template_number: { type: 'string', description: 'License template number' },
          },
          required: ['template_number'],
        },
      },
      {
        name: 'list_licensees',
        description: 'List all licensees (end-users or customers) in the NetLicensing account',
        inputSchema: {
          type: 'object',
          properties: {
            active: { type: 'boolean', description: 'Filter by active status' },
          },
        },
      },
      {
        name: 'create_licensee',
        description: 'Create a new licensee (end-user/customer) in NetLicensing to assign licenses to',
        inputSchema: {
          type: 'object',
          properties: {
            product_number: { type: 'string', description: 'Product number this licensee is associated with' },
            number: { type: 'string', description: 'Optional unique licensee number (customer ID or username)' },
            active: { type: 'boolean', description: 'Whether the licensee is active (default: true)' },
            name: { type: 'string', description: 'Licensee display name' },
          },
          required: ['product_number'],
        },
      },
      {
        name: 'get_licensee',
        description: 'Get details of a specific NetLicensing licensee by their licensee number',
        inputSchema: {
          type: 'object',
          properties: {
            licensee_number: { type: 'string', description: 'Licensee number' },
          },
          required: ['licensee_number'],
        },
      },
      {
        name: 'update_licensee',
        description: 'Update a NetLicensing licensee (name, active status, or custom properties)',
        inputSchema: {
          type: 'object',
          properties: {
            licensee_number: { type: 'string', description: 'Licensee number to update' },
            active: { type: 'boolean', description: 'Active status' },
            name: { type: 'string', description: 'New licensee name' },
          },
          required: ['licensee_number'],
        },
      },
      {
        name: 'validate_licensee',
        description: 'Validate a licensee\'s license entitlements for a product — checks if licenses are active and not expired',
        inputSchema: {
          type: 'object',
          properties: {
            licensee_number: { type: 'string', description: 'Licensee number to validate' },
            product_number: { type: 'string', description: 'Optional product number to validate against a specific product' },
          },
          required: ['licensee_number'],
        },
      },
      {
        name: 'list_licenses',
        description: 'List all licenses in the NetLicensing account, with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            active: { type: 'boolean', description: 'Filter by active status' },
          },
        },
      },
      {
        name: 'create_license',
        description: 'Create (grant) a license for a licensee based on a license template',
        inputSchema: {
          type: 'object',
          properties: {
            licensee_number: { type: 'string', description: 'Licensee number to assign the license to' },
            template_number: { type: 'string', description: 'License template number to base the license on' },
            number: { type: 'string', description: 'Optional unique license number' },
            active: { type: 'boolean', description: 'Whether the license is active (default: true)' },
            hidden: { type: 'boolean', description: 'Hide from licensee self-service portal (default: false)' },
          },
          required: ['licensee_number', 'template_number'],
        },
      },
      {
        name: 'get_license',
        description: 'Get details of a specific NetLicensing license by its license number',
        inputSchema: {
          type: 'object',
          properties: {
            license_number: { type: 'string', description: 'License number' },
          },
          required: ['license_number'],
        },
      },
      {
        name: 'update_license',
        description: 'Update an existing NetLicensing license (active status or custom properties)',
        inputSchema: {
          type: 'object',
          properties: {
            license_number: { type: 'string', description: 'License number to update' },
            active: { type: 'boolean', description: 'Active status' },
            hidden: { type: 'boolean', description: 'Hidden status' },
          },
          required: ['license_number'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List all transactions in the NetLicensing account (records of license grants, renewals, cancellations)',
        inputSchema: {
          type: 'object',
          properties: {
            active: { type: 'boolean', description: 'Filter by active status' },
            source: { type: 'string', description: 'Filter by transaction source: SHOP, API (default: all)' },
            status: { type: 'string', description: 'Filter by status: CANCELLED, CLOSED, PENDING (default: all)' },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Get details of a specific NetLicensing transaction by its transaction number',
        inputSchema: {
          type: 'object',
          properties: {
            transaction_number: { type: 'string', description: 'Transaction number' },
          },
          required: ['transaction_number'],
        },
      },
      {
        name: 'list_tokens',
        description: 'List all active API tokens and shop tokens in the NetLicensing account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_token',
        description: 'Create a new API token or shop token for NetLicensing API access',
        inputSchema: {
          type: 'object',
          properties: {
            token_type: { type: 'string', description: 'Token type: APIKEY (for API access) or SHOP (for shop URLs)' },
            licensee_number: { type: 'string', description: 'Licensee number (required for SHOP tokens to generate shop URLs)' },
            private_key: { type: 'string', description: 'Optional private key for SHOP tokens (for HMAC-signed shop URLs)' },
          },
          required: ['token_type'],
        },
      },
      {
        name: 'list_license_types',
        description: 'List all available license types supported by NetLicensing (FEATURE, TIMEVOLUME, FLOATING, QUANTITY, etc.)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_licensing_models',
        description: 'List all supported licensing models in NetLicensing (Subscription, TryAndBuy, Rental, Floating, etc.)',
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
        case 'list_products': return this.listProducts(args);
        case 'create_product': return this.createProduct(args);
        case 'get_product': return this.getProduct(args);
        case 'update_product': return this.updateProduct(args);
        case 'delete_product': return this.deleteProduct(args);
        case 'list_product_modules': return this.listProductModules(args);
        case 'create_product_module': return this.createProductModule(args);
        case 'get_product_module': return this.getProductModule(args);
        case 'update_product_module': return this.updateProductModule(args);
        case 'list_license_templates': return this.listLicenseTemplates(args);
        case 'create_license_template': return this.createLicenseTemplate(args);
        case 'get_license_template': return this.getLicenseTemplate(args);
        case 'list_licensees': return this.listLicensees(args);
        case 'create_licensee': return this.createLicensee(args);
        case 'get_licensee': return this.getLicensee(args);
        case 'update_licensee': return this.updateLicensee(args);
        case 'validate_licensee': return this.validateLicensee(args);
        case 'list_licenses': return this.listLicenses(args);
        case 'create_license': return this.createLicense(args);
        case 'get_license': return this.getLicense(args);
        case 'update_license': return this.updateLicense(args);
        case 'list_transactions': return this.listTransactions(args);
        case 'get_transaction': return this.getTransaction(args);
        case 'list_tokens': return this.listTokens();
        case 'create_token': return this.createToken(args);
        case 'list_license_types': return this.listLicenseTypes();
        case 'list_licensing_models': return this.listLicensingModels();
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

  private headers(): Record<string, string> {
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  private buildUrl(path: string, params: Record<string, string | boolean | undefined> = {}): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const queryString = qs.toString();
    return `${this.baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
  }

  private async request(
    method: string,
    path: string,
    queryParams: Record<string, string | boolean | undefined> = {},
    formParams?: Record<string, string | boolean | number | undefined>,
  ): Promise<ToolResult> {
    const url = this.buildUrl(path, queryParams);
    const init: RequestInit = { method, headers: this.headers() };
    if (formParams && method !== 'GET' && method !== 'DELETE') {
      const form = new URLSearchParams();
      for (const [k, v] of Object.entries(formParams)) {
        if (v !== undefined) form.set(k, String(v));
      }
      init.body = form.toString();
    }
    const response = await this.fetchWithRetry(url, init);
    if (response.status === 204) return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`NetLicensing returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listProducts(args: Record<string, unknown>): Promise<ToolResult> {
    const q: Record<string, string | boolean | undefined> = {};
    if (args.active !== undefined) q.active = args.active as boolean;
    return this.request('GET', '/product', q);
  }

  private async createProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const form: Record<string, string | boolean | number | undefined> = { name: args.name as string };
    if (args.number) form.number = args.number as string;
    if (args.active !== undefined) form.active = args.active as boolean;
    if (args.description) form.description = args.description as string;
    if (args.version) form.version = args.version as string;
    return this.request('POST', '/product', {}, form);
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_number) return { content: [{ type: 'text', text: 'product_number is required' }], isError: true };
    return this.request('GET', `/product/${encodeURIComponent(args.product_number as string)}`);
  }

  private async updateProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_number) return { content: [{ type: 'text', text: 'product_number is required' }], isError: true };
    const form: Record<string, string | boolean | number | undefined> = {};
    if (args.name) form.name = args.name as string;
    if (args.active !== undefined) form.active = args.active as boolean;
    if (args.description) form.description = args.description as string;
    if (args.version) form.version = args.version as string;
    return this.request('POST', `/product/${encodeURIComponent(args.product_number as string)}`, {}, form);
  }

  private async deleteProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_number) return { content: [{ type: 'text', text: 'product_number is required' }], isError: true };
    return this.request('DELETE', `/product/${encodeURIComponent(args.product_number as string)}`);
  }

  private async listProductModules(args: Record<string, unknown>): Promise<ToolResult> {
    const q: Record<string, string | boolean | undefined> = {};
    if (args.active !== undefined) q.active = args.active as boolean;
    return this.request('GET', '/productmodule', q);
  }

  private async createProductModule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_number) return { content: [{ type: 'text', text: 'product_number is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    if (!args.licensing_model) return { content: [{ type: 'text', text: 'licensing_model is required' }], isError: true };
    const form: Record<string, string | boolean | number | undefined> = {
      productNumber: args.product_number as string,
      name: args.name as string,
      licensingModel: args.licensing_model as string,
    };
    if (args.number) form.number = args.number as string;
    if (args.active !== undefined) form.active = args.active as boolean;
    return this.request('POST', '/productmodule', {}, form);
  }

  private async getProductModule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.module_number) return { content: [{ type: 'text', text: 'module_number is required' }], isError: true };
    return this.request('GET', `/productmodule/${encodeURIComponent(args.module_number as string)}`);
  }

  private async updateProductModule(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.module_number) return { content: [{ type: 'text', text: 'module_number is required' }], isError: true };
    const form: Record<string, string | boolean | number | undefined> = {};
    if (args.name) form.name = args.name as string;
    if (args.active !== undefined) form.active = args.active as boolean;
    if (args.licensing_model) form.licensingModel = args.licensing_model as string;
    return this.request('POST', `/productmodule/${encodeURIComponent(args.module_number as string)}`, {}, form);
  }

  private async listLicenseTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const q: Record<string, string | boolean | undefined> = {};
    if (args.active !== undefined) q.active = args.active as boolean;
    return this.request('GET', '/licensetemplate', q);
  }

  private async createLicenseTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.module_number) return { content: [{ type: 'text', text: 'module_number is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const form: Record<string, string | boolean | number | undefined> = {
      productModuleNumber: args.module_number as string,
      name: args.name as string,
    };
    if (args.number) form.number = args.number as string;
    if (args.active !== undefined) form.active = args.active as boolean;
    if (args.automatic !== undefined) form.automatic = args.automatic as boolean;
    if (args.hidden !== undefined) form.hidden = args.hidden as boolean;
    if (args.price !== undefined) form.price = args.price as number;
    if (args.currency) form.currency = args.currency as string;
    return this.request('POST', '/licensetemplate', {}, form);
  }

  private async getLicenseTemplate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.template_number) return { content: [{ type: 'text', text: 'template_number is required' }], isError: true };
    return this.request('GET', `/licensetemplate/${encodeURIComponent(args.template_number as string)}`);
  }

  private async listLicensees(args: Record<string, unknown>): Promise<ToolResult> {
    const q: Record<string, string | boolean | undefined> = {};
    if (args.active !== undefined) q.active = args.active as boolean;
    return this.request('GET', '/licensee', q);
  }

  private async createLicensee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_number) return { content: [{ type: 'text', text: 'product_number is required' }], isError: true };
    const form: Record<string, string | boolean | number | undefined> = {
      productNumber: args.product_number as string,
    };
    if (args.number) form.number = args.number as string;
    if (args.active !== undefined) form.active = args.active as boolean;
    if (args.name) form.name = args.name as string;
    return this.request('POST', '/licensee', {}, form);
  }

  private async getLicensee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.licensee_number) return { content: [{ type: 'text', text: 'licensee_number is required' }], isError: true };
    return this.request('GET', `/licensee/${encodeURIComponent(args.licensee_number as string)}`);
  }

  private async updateLicensee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.licensee_number) return { content: [{ type: 'text', text: 'licensee_number is required' }], isError: true };
    const form: Record<string, string | boolean | number | undefined> = {};
    if (args.active !== undefined) form.active = args.active as boolean;
    if (args.name) form.name = args.name as string;
    return this.request('POST', `/licensee/${encodeURIComponent(args.licensee_number as string)}`, {}, form);
  }

  private async validateLicensee(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.licensee_number) return { content: [{ type: 'text', text: 'licensee_number is required' }], isError: true };
    const q: Record<string, string | boolean | undefined> = {};
    if (args.product_number) q.productNumber = args.product_number as string;
    return this.request('POST', `/licensee/${encodeURIComponent(args.licensee_number as string)}/validate`, q);
  }

  private async listLicenses(args: Record<string, unknown>): Promise<ToolResult> {
    const q: Record<string, string | boolean | undefined> = {};
    if (args.active !== undefined) q.active = args.active as boolean;
    return this.request('GET', '/license', q);
  }

  private async createLicense(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.licensee_number) return { content: [{ type: 'text', text: 'licensee_number is required' }], isError: true };
    if (!args.template_number) return { content: [{ type: 'text', text: 'template_number is required' }], isError: true };
    const form: Record<string, string | boolean | number | undefined> = {
      licenseeNumber: args.licensee_number as string,
      licenseTemplateNumber: args.template_number as string,
    };
    if (args.number) form.number = args.number as string;
    if (args.active !== undefined) form.active = args.active as boolean;
    if (args.hidden !== undefined) form.hidden = args.hidden as boolean;
    return this.request('POST', '/license', {}, form);
  }

  private async getLicense(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.license_number) return { content: [{ type: 'text', text: 'license_number is required' }], isError: true };
    return this.request('GET', `/license/${encodeURIComponent(args.license_number as string)}`);
  }

  private async updateLicense(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.license_number) return { content: [{ type: 'text', text: 'license_number is required' }], isError: true };
    const form: Record<string, string | boolean | number | undefined> = {};
    if (args.active !== undefined) form.active = args.active as boolean;
    if (args.hidden !== undefined) form.hidden = args.hidden as boolean;
    return this.request('POST', `/license/${encodeURIComponent(args.license_number as string)}`, {}, form);
  }

  private async listTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const q: Record<string, string | boolean | undefined> = {};
    if (args.active !== undefined) q.active = args.active as boolean;
    if (args.source) q.source = args.source as string;
    if (args.status) q.status = args.status as string;
    return this.request('GET', '/transaction', q);
  }

  private async getTransaction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.transaction_number) return { content: [{ type: 'text', text: 'transaction_number is required' }], isError: true };
    return this.request('GET', `/transaction/${encodeURIComponent(args.transaction_number as string)}`);
  }

  private async listTokens(): Promise<ToolResult> {
    return this.request('GET', '/token');
  }

  private async createToken(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.token_type) return { content: [{ type: 'text', text: 'token_type is required' }], isError: true };
    const form: Record<string, string | boolean | number | undefined> = {
      tokenType: args.token_type as string,
    };
    if (args.licensee_number) form.licenseeNumber = args.licensee_number as string;
    if (args.private_key) form.privateKey = args.private_key as string;
    return this.request('POST', '/token', {}, form);
  }

  private async listLicenseTypes(): Promise<ToolResult> {
    return this.request('GET', '/utility/licenseTypes');
  }

  private async listLicensingModels(): Promise<ToolResult> {
    return this.request('GET', '/utility/licensingModels');
  }
}
