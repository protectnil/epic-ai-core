/**
 * OpenFinTech.io MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. OpenFinTech.io has not published an official MCP server.
//
// Base URL: https://api.openfintech.io/v1
// Auth: None required — fully public open database
// Docs: https://openfintech.io / https://docs.openfintech.io
// Rate limits: Not publicly documented.
// Spec: https://api.apis.guru/v2/specs/openfintech.io/2017-08-24/swagger.json (Swagger 2.0)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenFinTechConfig {
  baseUrl?: string;
}

export class OpenFinTechMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: OpenFinTechConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://api.openfintech.io/v1';
  }

  static catalog() {
    return {
      name: 'openfintech',
      displayName: 'OpenFinTech.io',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'fintech', 'finance', 'banks', 'currencies', 'crypto', 'payment providers',
        'payment methods', 'exchangers', 'organizations', 'countries', 'open data',
        'deposit methods', 'merchant industries',
      ],
      toolNames: [
        'list_banks', 'get_bank',
        'list_countries', 'get_country',
        'list_currencies', 'get_currency',
        'list_deposit_methods', 'get_deposit_method',
        'list_exchangers', 'get_exchanger',
        'list_merchant_industries', 'get_merchant_industry',
        'list_organizations', 'get_organization',
        'list_payment_methods', 'get_payment_method',
        'list_payment_providers', 'get_payment_provider',
      ],
      description: 'Access the OpenFinTech.io open database: banks, currencies, countries, payment providers, payment methods, exchangers, organizations, deposit methods, and merchant industries.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Banks ─────────────────────────────────────────────────────────────
      {
        name: 'list_banks',
        description: 'List banks from the OpenFinTech.io database with optional filtering by sort code and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            'filter[sort_code]': { type: 'string', description: 'Filter by bank sort code' },
            sort: { type: 'string', description: 'Sort field: name, -name, code, -code' },
            'page[number]': { type: 'number', description: 'Page number (default: 1)' },
            'page[size]': { type: 'number', description: 'Results per page (max 100, default: 100)' },
          },
        },
      },
      {
        name: 'get_bank',
        description: 'Retrieve a single bank by its ID from the OpenFinTech.io database',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The bank ID' },
          },
          required: ['id'],
        },
      },
      // ── Countries ─────────────────────────────────────────────────────────
      {
        name: 'list_countries',
        description: 'List countries from the OpenFinTech.io database with optional filtering and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            'filter[region]': { type: 'string', description: 'Filter by region (e.g. europe, asia)' },
            sort: { type: 'string', description: 'Sort field: name, -name, area, -area' },
            'page[number]': { type: 'number', description: 'Page number (default: 1)' },
            'page[size]': { type: 'number', description: 'Results per page (max 100, default: 100)' },
          },
        },
      },
      {
        name: 'get_country',
        description: 'Retrieve a single country by its ID from the OpenFinTech.io database',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The country ID or code' },
          },
          required: ['id'],
        },
      },
      // ── Currencies ────────────────────────────────────────────────────────
      {
        name: 'list_currencies',
        description: 'List currencies (national, digital, crypto) from OpenFinTech.io with filtering by type, ISO code, category, or full-text search',
        inputSchema: {
          type: 'object',
          properties: {
            'filter[search]': { type: 'string', description: 'Full text search by name, code, type, ISO alpha3, ISO numeric3' },
            'filter[code_iso_alpha3]': { type: 'string', description: 'Filter by ISO alpha-3 code (e.g. USD, EUR, BTC)' },
            'filter[code_iso_numeric3]': { type: 'string', description: 'Filter by ISO numeric-3 code' },
            'filter[code_estandards_alpha]': { type: 'string', description: 'Filter by estandards alpha code' },
            'filter[currency_type]': { type: 'string', description: 'Filter by currency type (e.g. national, digital, crypto)' },
            'filter[category]': { type: 'string', description: 'Filter by category' },
            sort: { type: 'string', description: 'Sort field: name, -name, code, -code' },
            'page[number]': { type: 'number', description: 'Page number (default: 1)' },
            'page[size]': { type: 'number', description: 'Results per page (max 100, default: 100)' },
          },
        },
      },
      {
        name: 'get_currency',
        description: 'Retrieve a single currency by its ID from the OpenFinTech.io database',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The currency ID or code' },
          },
          required: ['id'],
        },
      },
      // ── Deposit Methods ───────────────────────────────────────────────────
      {
        name: 'list_deposit_methods',
        description: 'List deposit methods from the OpenFinTech.io database with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            sort: { type: 'string', description: 'Sort field: name, -name' },
            'page[number]': { type: 'number', description: 'Page number (default: 1)' },
            'page[size]': { type: 'number', description: 'Results per page (max 100, default: 100)' },
          },
        },
      },
      {
        name: 'get_deposit_method',
        description: 'Retrieve a single deposit method by its ID from the OpenFinTech.io database',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The deposit method ID' },
          },
          required: ['id'],
        },
      },
      // ── Exchangers ────────────────────────────────────────────────────────
      {
        name: 'list_exchangers',
        description: 'List digital currency exchangers from the OpenFinTech.io database',
        inputSchema: {
          type: 'object',
          properties: {
            sort: { type: 'string', description: 'Sort field: name, -name' },
            'page[number]': { type: 'number', description: 'Page number (default: 1)' },
            'page[size]': { type: 'number', description: 'Results per page (max 100, default: 100)' },
          },
        },
      },
      {
        name: 'get_exchanger',
        description: 'Retrieve a single exchanger by its ID from the OpenFinTech.io database',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The exchanger ID' },
          },
          required: ['id'],
        },
      },
      // ── Merchant Industries ───────────────────────────────────────────────
      {
        name: 'list_merchant_industries',
        description: 'List merchant industry classifications from the OpenFinTech.io database',
        inputSchema: {
          type: 'object',
          properties: {
            sort: { type: 'string', description: 'Sort field: name, -name' },
            'page[number]': { type: 'number', description: 'Page number (default: 1)' },
            'page[size]': { type: 'number', description: 'Results per page (max 100, default: 100)' },
          },
        },
      },
      {
        name: 'get_merchant_industry',
        description: 'Retrieve a single merchant industry by its ID from the OpenFinTech.io database',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The merchant industry ID' },
          },
          required: ['id'],
        },
      },
      // ── Organizations ─────────────────────────────────────────────────────
      {
        name: 'list_organizations',
        description: 'List FinTech organizations from the OpenFinTech.io database with optional full-text search and industry filter',
        inputSchema: {
          type: 'object',
          properties: {
            'filter[search]': { type: 'string', description: 'Full text search by id, name, code' },
            'filter[industries]': { type: 'string', description: 'Filter by industry' },
            sort: { type: 'string', description: 'Sort field: name, -name' },
            'page[number]': { type: 'number', description: 'Page number (default: 1)' },
            'page[size]': { type: 'number', description: 'Results per page (max 100, default: 100)' },
          },
        },
      },
      {
        name: 'get_organization',
        description: 'Retrieve a single organization by its ID from the OpenFinTech.io database',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The organization ID' },
          },
          required: ['id'],
        },
      },
      // ── Payment Methods ───────────────────────────────────────────────────
      {
        name: 'list_payment_methods',
        description: 'List payment methods from the OpenFinTech.io database with optional search, processor, and category filters',
        inputSchema: {
          type: 'object',
          properties: {
            'filter[search]': { type: 'string', description: 'Full text search by id, name, code, category' },
            'filter[processor_name]': { type: 'string', description: 'Filter by processor name' },
            'filter[category]': { type: 'string', description: 'Filter by category' },
            sort: { type: 'string', description: 'Sort field: name, -name' },
            'page[number]': { type: 'number', description: 'Page number (default: 1)' },
            'page[size]': { type: 'number', description: 'Results per page (max 100, default: 100)' },
          },
        },
      },
      {
        name: 'get_payment_method',
        description: 'Retrieve a single payment method by its ID from the OpenFinTech.io database',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The payment method ID' },
          },
          required: ['id'],
        },
      },
      // ── Payment Providers ─────────────────────────────────────────────────
      {
        name: 'list_payment_providers',
        description: 'List payment service providers (PSPs) from OpenFinTech.io with optional search, type, sales channel, and feature filters',
        inputSchema: {
          type: 'object',
          properties: {
            'filter[search]': { type: 'string', description: 'Full text search by id, code, name' },
            'filter[types]': { type: 'string', description: 'Filter by provider type' },
            'filter[sales_channels]': { type: 'string', description: 'Filter by sales channel' },
            'filter[features]': { type: 'string', description: 'Filter by feature' },
            sort: { type: 'string', description: 'Sort field: name, -name' },
            'page[number]': { type: 'number', description: 'Page number (default: 1)' },
            'page[size]': { type: 'number', description: 'Results per page (max 100, default: 100)' },
          },
        },
      },
      {
        name: 'get_payment_provider',
        description: 'Retrieve a single payment provider by its ID from the OpenFinTech.io database',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The payment provider ID' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_banks':               return await this.listResource('/banks', args);
        case 'get_bank':                 return await this.getResource('/banks', args);
        case 'list_countries':           return await this.listResource('/countries', args);
        case 'get_country':              return await this.getResource('/countries', args);
        case 'list_currencies':          return await this.listResource('/currencies', args);
        case 'get_currency':             return await this.getResource('/currencies', args);
        case 'list_deposit_methods':     return await this.listResource('/deposit-methods', args);
        case 'get_deposit_method':       return await this.getResource('/deposit-methods', args);
        case 'list_exchangers':          return await this.listResource('/exchangers', args);
        case 'get_exchanger':            return await this.getResource('/exchangers', args);
        case 'list_merchant_industries': return await this.listResource('/merchant-industries', args);
        case 'get_merchant_industry':    return await this.getResource('/merchant-industries', args);
        case 'list_organizations':       return await this.listResource('/organizations', args);
        case 'get_organization':         return await this.getResource('/organizations', args);
        case 'list_payment_methods':     return await this.listResource('/payment-methods', args);
        case 'get_payment_method':       return await this.getResource('/payment-methods', args);
        case 'list_payment_providers':   return await this.listResource('/payment-providers', args);
        case 'get_payment_provider':     return await this.getResource('/payment-providers', args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${message}` }],
        isError: true,
      };
    }
  }

  private async listResource(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(args)) {
      if (val !== undefined && val !== null) {
        params.set(key, String(val));
      }
    }
    const qs = params.toString();
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;
    const res = await this.fetchWithRetry(url, {
      headers: { Accept: 'application/vnd.api+json' },
    });
    const text = await res.text();
    const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n...[truncated]' : text;
    return {
      content: [{ type: 'text', text: truncated }],
      isError: !res.ok,
    };
  }

  private async getResource(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    const { id, ...rest } = args;
    if (!id) {
      return {
        content: [{ type: 'text', text: 'Missing required parameter: id' }],
        isError: true,
      };
    }
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(rest)) {
      if (val !== undefined && val !== null) {
        params.set(key, String(val));
      }
    }
    const qs = params.toString();
    const url = `${this.baseUrl}${path}/${encodeURIComponent(String(id))}${qs ? `?${qs}` : ''}`;
    const res = await this.fetchWithRetry(url, {
      headers: { Accept: 'application/vnd.api+json' },
    });
    const text = await res.text();
    const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n...[truncated]' : text;
    return {
      content: [{ type: 'text', text: truncated }],
      isError: !res.ok,
    };
  }
}
