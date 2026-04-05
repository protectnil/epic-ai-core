/**
 * Taxrates.io MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. No official MCP server published by taxrates.io.
//
// Base URL: https://api.taxrates.io/api
// Auth: API key passed as query parameter `domain` (your registered domain/API key identifier).
//       Authenticate using the domain associated with your taxrates.io account.
//       Sign up and get credentials at: https://taxrates.io
// Docs: https://taxrates.io/api-documentation/
// Rate limits: Enforced per account. 429 = rate limit exceeded — cache responses at checkout.
//
// Covers 181 countries, 14,000+ US sales tax, VAT, and GST rates.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TaxRatesConfig {
  /** Your taxrates.io domain/API key identifier (passed as `domain` query param) */
  domain: string;
  /** Optional base URL override (default: https://api.taxrates.io/api) */
  baseUrl?: string;
}

export class TaxRatesMCPServer extends MCPAdapterBase {
  private readonly domain: string;
  private readonly baseUrl: string;

  constructor(config: TaxRatesConfig) {
    super();
    this.domain = config.domain;
    this.baseUrl = config.baseUrl ?? 'https://api.taxrates.io/api';
  }

  static catalog() {
    return {
      name: 'taxrates',
      displayName: 'Taxrates.io',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'tax', 'taxes', 'vat', 'gst', 'sales tax', 'tax rates', 'tax compliance',
        'taxrates', 'finance', 'ecommerce', 'checkout', 'billing', 'international',
        'country tax', 'us sales tax', 'product tax', 'ip geolocation tax',
      ],
      toolNames: [
        'get_tax_rates_by_country',
        'get_tax_rates_by_ip',
        'get_all_tax_rates',
      ],
      description: 'Taxrates.io: retrieve global tax rates (VAT, GST, US sales tax) for 181 countries by country code, IP address, or full account catalog. Supports product-level tax codes and US ZIP-level granularity.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_tax_rates_by_country',
        description: 'Get all tax rates (VAT, GST, sales tax) for a country identified by its ISO 3166-1 alpha-2 country code, with optional ZIP code for US state/county/city rates and product code for category-specific rates',
        inputSchema: {
          type: 'object',
          properties: {
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g. US, GB, DE, FR)',
            },
            zip: {
              type: 'string',
              description: 'ZIP/postal code for US state and local sales tax lookup (e.g. 71642)',
            },
            filter: {
              type: 'string',
              description: 'Filter by tax type: CombinedRate, StateRate, CountyRate, CityRate, SpecialRate (US only)',
            },
            product_codes: {
              type: 'string',
              description: 'Product code for category-specific tax rate (e.g. C010=services, C011=downloaded software, C012=downloaded books, C018=SaaS)',
            },
            province: {
              type: 'string',
              description: 'Province or state name for sub-national tax lookup',
            },
            date: {
              type: 'string',
              description: 'Date for historical tax rate lookup (YYYY-MM-DD format, e.g. 2024-01-15)',
            },
          },
          required: ['country_code'],
        },
      },
      {
        name: 'get_tax_rates_by_ip',
        description: 'Get tax rates for a country automatically detected from an IP address — useful at checkout to determine applicable taxes without requiring the customer to select their country',
        inputSchema: {
          type: 'object',
          properties: {
            ip: {
              type: 'string',
              description: 'IPv4 or IPv6 address to geolocate for tax rates (e.g. 86.139.70.49). If omitted, uses the caller\'s IP.',
            },
            zip: {
              type: 'string',
              description: 'ZIP/postal code for US state and local sales tax granularity',
            },
            filter: {
              type: 'string',
              description: 'Filter by tax type: CombinedRate, StateRate, CountyRate, CityRate, SpecialRate (US only)',
            },
            product_code: {
              type: 'string',
              description: 'Product code for category-specific tax rate (e.g. C010, C011, C012, C018)',
            },
          },
        },
      },
      {
        name: 'get_all_tax_rates',
        description: 'Retrieve all tax rates configured on the account across all enabled countries — supports pagination via cursor and filtering by tax type or product code',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Filter by tax type (e.g. CombinedRate, StateRate, CountyRate)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor returned in prior response to fetch the next page',
            },
            product_code: {
              type: 'string',
              description: 'Product code to filter rates (e.g. C010, C011, C012, C018, C021, C022)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_tax_rates_by_country':
          return await this.getTaxRatesByCountry(args);
        case 'get_tax_rates_by_ip':
          return await this.getTaxRatesByIp(args);
        case 'get_all_tax_rates':
          return await this.getAllTaxRates(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Taxrates.io error: ${message}` }],
        isError: true,
      };
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async getTaxRatesByCountry(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/v1/tax/countrycode`);
    url.searchParams.set('domain', this.domain);
    url.searchParams.set('country_code', String(args['country_code'] ?? ''));
    if (args['zip']) url.searchParams.set('zip', String(args['zip']));
    if (args['filter']) url.searchParams.set('filter', String(args['filter']));
    if (args['product_codes']) url.searchParams.set('product_codes[]', String(args['product_codes']));
    if (args['province']) url.searchParams.set('province ', String(args['province']));
    if (args['date']) url.searchParams.set('date', String(args['date']));
    return this.get(url.toString());
  }

  private async getTaxRatesByIp(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/v1/tax/ip`);
    url.searchParams.set('domain', this.domain);
    if (args['ip']) url.searchParams.set('ip', String(args['ip']));
    if (args['zip']) url.searchParams.set('zip', String(args['zip']));
    if (args['filter']) url.searchParams.set('filter', String(args['filter']));
    if (args['product_code']) url.searchParams.set('product_code', String(args['product_code']));
    return this.get(url.toString());
  }

  private async getAllTaxRates(args: Record<string, unknown>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}/v3/tax/rates`);
    url.searchParams.set('domain', this.domain);
    if (args['filter']) url.searchParams.set('filter', String(args['filter']));
    if (args['cursor']) url.searchParams.set('cursor', String(args['cursor']));
    if (args['product_code']) url.searchParams.set('Product_code', String(args['product_code']));
    return this.get(url.toString());
  }

  private async get(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const text = await response.text();
    const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n[truncated]' : text;
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `HTTP ${response.status}: ${truncated}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }
}
