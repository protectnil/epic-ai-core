/**
 * VAT API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official VAT API MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 9 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://vatapi.com/v1
// Auth: Apikey header with API key from vatapi.com subscription
//   Docs: https://vatapi.com/documentation
// Rate limits: Subscription plan based; check remaining requests via usage-check endpoint

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface VatApiConfig {
  apiKey: string;
  baseUrl?: string;
}

export class VatApiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: VatApiConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://vatapi.com/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'validate_vat_number',
        description: 'Validate a VAT number against official EU VIES database. Returns validity status, company name, and registered address when valid.',
        inputSchema: {
          type: 'object',
          properties: {
            vatid: {
              type: 'string',
              description: 'The VAT number to validate (e.g., GB123456789). Include country prefix.',
            },
          },
          required: ['vatid'],
        },
      },
      {
        name: 'get_vat_rates_by_country_code',
        description: 'Retrieve current VAT rates for a country by its 2-letter ISO country code. Returns standard, reduced, super-reduced, and parking rates.',
        inputSchema: {
          type: 'object',
          properties: {
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code (e.g., DE, FR, GB)',
            },
          },
          required: ['country_code'],
        },
      },
      {
        name: 'get_vat_rates_by_ip',
        description: 'Retrieve current VAT rates for the country detected from an IP address. Returns standard, reduced, super-reduced, and parking rates.',
        inputSchema: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'IPv4 address to look up (e.g., 82.130.52.234)',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'get_all_vat_rates',
        description: 'Retrieve current VAT rates for all EU member states in a single call. Returns standard, reduced, super-reduced, and parking rates for each country.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'convert_price',
        description: 'Convert a price to or from its VAT-inclusive amount for a specific country and rate type. Useful for e-commerce checkout and invoice calculations.',
        inputSchema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'The price amount to convert',
            },
            country_code: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code for the applicable VAT rates',
            },
            rate: {
              type: 'string',
              description: 'VAT rate type to apply: standard, reduced, super_reduced, or parking',
            },
          },
          required: ['amount', 'country_code'],
        },
      },
      {
        name: 'convert_currency',
        description: 'Convert a monetary amount between two currencies using current exchange rates. Returns converted amount and exchange rate used.',
        inputSchema: {
          type: 'object',
          properties: {
            currency_from: {
              type: 'string',
              description: 'ISO 4217 source currency code (e.g., USD)',
            },
            currency_to: {
              type: 'string',
              description: 'ISO 4217 target currency code (e.g., EUR)',
            },
            amount: {
              type: 'number',
              description: 'Amount to convert',
            },
          },
          required: ['currency_from', 'currency_to', 'amount'],
        },
      },
      {
        name: 'create_invoice',
        description: 'Create a VAT-compliant invoice with automatic VAT calculation. Returns a formatted invoice with VAT breakdown suitable for EU compliance.',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'object',
              description: 'Invoice recipient details (name, address, vat_id)',
            },
            items: {
              type: 'array',
              description: 'Line items array, each with description, quantity, and unit_price',
            },
            country_code: {
              type: 'string',
              description: 'Destination country ISO code to determine applicable VAT rate',
            },
            currency_code: {
              type: 'string',
              description: 'ISO 4217 currency code for the invoice (default: EUR)',
            },
            date: {
              type: 'string',
              description: 'Invoice date in YYYY-MM-DD format (default: today)',
            },
          },
          required: ['to', 'items', 'country_code'],
        },
      },
      {
        name: 'get_invoice',
        description: 'Retrieve a previously created VAT invoice by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'number',
              description: 'The invoice ID returned by create_invoice',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'check_api_usage',
        description: 'Check remaining API requests on the current subscription plan. Returns requests used, remaining quota, and reset date.',
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
        case 'validate_vat_number':
          return await this.validateVatNumber(args);
        case 'get_vat_rates_by_country_code':
          return await this.getVatRatesByCountryCode(args);
        case 'get_vat_rates_by_ip':
          return await this.getVatRatesByIp(args);
        case 'get_all_vat_rates':
          return await this.getAllVatRates();
        case 'convert_price':
          return await this.convertPrice(args);
        case 'convert_currency':
          return await this.convertCurrency(args);
        case 'create_invoice':
          return await this.createInvoice(args);
        case 'get_invoice':
          return await this.getInvoice(args);
        case 'check_api_usage':
          return await this.checkApiUsage();
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

  private async request(path: string, method = 'GET', body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Apikey: this.apiKey,
      'Content-Type': 'application/json',
      Response: 'application/json',
    };

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `VAT API error ${response.status}: ${errText}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`VAT API returned non-JSON response (HTTP ${response.status})`);
    }

    const text = JSON.stringify(data, null, 2);
    const truncated =
      text.length > 10_000
        ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
        : text;

    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async validateVatNumber(args: Record<string, unknown>): Promise<ToolResult> {
    const vatid = args.vatid as string;
    if (!vatid) return { content: [{ type: 'text', text: 'vatid is required' }], isError: true };
    return this.request(`/vat-number-check?vatid=${encodeURIComponent(vatid)}`);
  }

  private async getVatRatesByCountryCode(args: Record<string, unknown>): Promise<ToolResult> {
    const code = args.country_code as string;
    if (!code) return { content: [{ type: 'text', text: 'country_code is required' }], isError: true };
    return this.request(`/country-code-check?code=${encodeURIComponent(code)}`);
  }

  private async getVatRatesByIp(args: Record<string, unknown>): Promise<ToolResult> {
    const address = args.address as string;
    if (!address) return { content: [{ type: 'text', text: 'address is required' }], isError: true };
    return this.request(`/ip-check?address=${encodeURIComponent(address)}`);
  }

  private async getAllVatRates(): Promise<ToolResult> {
    return this.request('/vat-rates');
  }

  private async convertPrice(args: Record<string, unknown>): Promise<ToolResult> {
    const amount = args.amount as number;
    const countryCode = args.country_code as string;
    if (amount === undefined || amount === null) {
      return { content: [{ type: 'text', text: 'amount is required' }], isError: true };
    }
    if (!countryCode) {
      return { content: [{ type: 'text', text: 'country_code is required' }], isError: true };
    }
    let path = `/vat-price?amount=${encodeURIComponent(amount)}&country_code=${encodeURIComponent(countryCode)}`;
    if (args.rate) path += `&rate=${encodeURIComponent(args.rate as string)}`;
    return this.request(path);
  }

  private async convertCurrency(args: Record<string, unknown>): Promise<ToolResult> {
    const from = args.currency_from as string;
    const to = args.currency_to as string;
    const amount = args.amount as number;
    if (!from || !to || amount === undefined) {
      return { content: [{ type: 'text', text: 'currency_from, currency_to, and amount are required' }], isError: true };
    }
    return this.request(
      `/currency-conversion?currency_from=${encodeURIComponent(from)}&currency_to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`
    );
  }

  private async createInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to || !args.items || !args.country_code) {
      return { content: [{ type: 'text', text: 'to, items, and country_code are required' }], isError: true };
    }
    return this.request('/invoice', 'POST', args);
  }

  private async getInvoice(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.invoice_id as number;
    if (id === undefined || id === null) {
      return { content: [{ type: 'text', text: 'invoice_id is required' }], isError: true };
    }
    return this.request(`/invoice/${encodeURIComponent(id)}`);
  }

  private async checkApiUsage(): Promise<ToolResult> {
    return this.request('/usage-check');
  }

  static catalog() {
    return {
      name: 'vatapi',
      displayName: 'VAT API',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'vat', 'tax', 'eu tax', 'vat compliance', 'vat validation',
        'vat rates', 'invoice', 'eu vat', 'currency conversion',
        'business tax', 'finance', 'europe', 'VIES', 'tax calculation',
      ],
      toolNames: [
        'validate_vat_number', 'get_vat_rates_by_country_code',
        'get_vat_rates_by_ip', 'get_all_vat_rates', 'convert_price',
        'convert_currency', 'create_invoice', 'get_invoice', 'check_api_usage',
      ],
      description: 'VAT API adapter for the Epic AI Intelligence Platform — EU VAT number validation, VAT rate lookup by country or IP, price/currency conversion, and VAT-compliant invoice generation.',
      author: 'protectnil' as const,
    };
  }
}
