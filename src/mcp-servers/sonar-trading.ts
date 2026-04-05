/**
 * Sonar Trading MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Sonar Trading MCP server was found on GitHub.
//
// Base URL: https://sonar.trading/api/v1/
// Auth: None required — all endpoints are publicly accessible
// Docs: https://sonar.trading/api/
// Rate limits: Not publicly documented; use responsibly

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SonarTradingConfig {
  /** Base URL override (default: https://sonar.trading/api/v1/) */
  baseUrl?: string;
}

export class SonarTradingMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: SonarTradingConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://sonar.trading/api/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'convert_currency',
        description: 'Convert an amount from one currency to one or more target currencies using live exchange rates.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Source currency code (e.g. USD, EUR, BTC)',
            },
            to: {
              type: 'string',
              description: 'Comma-separated list of target currency codes (e.g. EUR,GBP,BTC)',
            },
            amount: {
              type: 'number',
              description: 'Amount to convert (default: 1)',
            },
            decimal_places: {
              type: 'number',
              description: 'Number of decimal places in the result (default: 2)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'list_country_currencies',
        description: 'List all fiat currencies of countries available via the Sonar Trading service, with names in the specified language.',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: 'Language code for currency names (e.g. en, de, fr — default: en)',
            },
          },
        },
      },
      {
        name: 'list_digital_currencies',
        description: 'List all digital/crypto currencies available via the Sonar Trading service, with names in the specified language.',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: 'Language code for currency names (e.g. en, de, fr — default: en)',
            },
          },
        },
      },
      {
        name: 'get_historical_rate',
        description: 'Retrieve the historical exchange rate between two currencies on a specific date.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Source currency code (e.g. USD, EUR, BTC)',
            },
            to: {
              type: 'string',
              description: 'Target currency code (e.g. EUR, GBP)',
            },
            date: {
              type: 'string',
              description: 'Date for the historical rate in YYYY-MM-DD format (e.g. 2024-01-15)',
            },
            amount: {
              type: 'number',
              description: 'Amount to convert at the historical rate (default: 1)',
            },
            decimal_places: {
              type: 'number',
              description: 'Number of decimal places in the result (default: 2)',
            },
          },
          required: ['from', 'to', 'date'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'convert_currency':
          return await this.convertCurrency(args);
        case 'list_country_currencies':
          return await this.listCountryCurrencies(args);
        case 'list_digital_currencies':
          return await this.listDigitalCurrencies(args);
        case 'get_historical_rate':
          return await this.getHistoricalRate(args);
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

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {});
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Sonar Trading API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Sonar Trading returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async convertCurrency(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to) {
      return { content: [{ type: 'text', text: 'from and to are required' }], isError: true };
    }
    const params = new URLSearchParams({
      from: args.from as string,
      to: args.to as string,
    });
    if (args.amount != null) params.set('amount', String(args.amount));
    if (args.decimal_places != null) params.set('decimal_places', String(args.decimal_places));
    return this.get(`convert?${params.toString()}`);
  }

  private async listCountryCurrencies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.language) params.set('language', args.language as string);
    const qs = params.toString();
    return this.get(`country/currencies${qs ? '?' + qs : ''}`);
  }

  private async listDigitalCurrencies(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.language) params.set('language', args.language as string);
    const qs = params.toString();
    return this.get(`digital/currencies${qs ? '?' + qs : ''}`);
  }

  private async getHistoricalRate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to || !args.date) {
      return { content: [{ type: 'text', text: 'from, to, and date are required' }], isError: true };
    }
    const params = new URLSearchParams({
      from: args.from as string,
      to: args.to as string,
      date: args.date as string,
    });
    if (args.amount != null) params.set('amount', String(args.amount));
    if (args.decimal_places != null) params.set('decimal_places', String(args.decimal_places));
    return this.get(`history?${params.toString()}`);
  }

  static catalog() {
    return {
      name: 'sonar-trading',
      displayName: 'Sonar Trading',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: ['sonar-trading', 'currency', 'exchange', 'forex', 'crypto', 'convert', 'rate', 'historical'],
      toolNames: ['convert_currency', 'list_country_currencies', 'list_digital_currencies', 'get_historical_rate'],
      description: 'Sonar Trading currency adapter: convert currencies, list fiat and digital currencies, and retrieve historical exchange rates.',
      author: 'protectnil' as const,
    };
  }
}
