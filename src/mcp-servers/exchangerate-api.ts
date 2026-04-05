/**
 * ExchangeRate-API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. ExchangeRate-API has not published an official MCP server.
//
// Base URL (v6, authenticated): https://v6.exchangerate-api.com/v6/{api_key}
// Base URL (v4, no auth):       https://api.exchangerate-api.com/v4
// Auth (v6): API key embedded in URL path — no header required
//   Get a key at: https://www.exchangerate-api.com/
// Auth (v4): None — free public endpoint, latest rates only
// Docs: https://www.exchangerate-api.com/docs/documentation
// Rate limits: Free plan ~1,500 requests/month; paid plans higher.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ExchangeRateApiConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class ExchangeRateApiMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly v6Base: string;
  private readonly v4Base: string;

  constructor(config: ExchangeRateApiConfig = {}) {
    super();
    this.apiKey = config.apiKey ?? '';
    this.v6Base = config.baseUrl
      ? config.baseUrl
      : `https://v6.exchangerate-api.com/v6/${this.apiKey}`;
    this.v4Base = 'https://api.exchangerate-api.com/v4';
  }

  static catalog() {
    return {
      name: 'exchangerate-api',
      displayName: 'ExchangeRate-API',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'exchange rate', 'currency', 'forex', 'conversion', 'rates',
        'finance', 'international', 'ISO 4217',
      ],
      toolNames: [
        'get_latest_rates',
        'get_latest_rates_free',
        'convert_pair',
        'convert_amount',
        'get_enriched_pair',
        'get_historical_rates',
        'list_supported_codes',
        'get_quota',
      ],
      description: 'Fetch live and historical currency exchange rates, convert between currency pairs, and retrieve supported currency codes via the ExchangeRate-API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_latest_rates',
        description: 'Retrieve the latest exchange rates for all supported currencies relative to a base currency (requires API key)',
        inputSchema: {
          type: 'object',
          properties: {
            base_currency: { type: 'string', description: 'ISO 4217 base currency code (e.g. USD, EUR, GBP)' },
          },
          required: ['base_currency'],
        },
      },
      {
        name: 'get_latest_rates_free',
        description: 'Retrieve the latest exchange rates using the free unauthenticated v4 endpoint — no API key required, returns all rates for the given base currency',
        inputSchema: {
          type: 'object',
          properties: {
            base_currency: { type: 'string', description: 'ISO 4217 base currency code (e.g. USD, EUR, GBP)' },
          },
          required: ['base_currency'],
        },
      },
      {
        name: 'convert_pair',
        description: 'Get the exchange rate between a specific base and target currency pair (requires API key)',
        inputSchema: {
          type: 'object',
          properties: {
            base_currency: { type: 'string', description: 'ISO 4217 base currency code (e.g. USD)' },
            target_currency: { type: 'string', description: 'ISO 4217 target currency code (e.g. EUR)' },
          },
          required: ['base_currency', 'target_currency'],
        },
      },
      {
        name: 'convert_amount',
        description: 'Convert a specific monetary amount from one currency to another (requires API key)',
        inputSchema: {
          type: 'object',
          properties: {
            base_currency: { type: 'string', description: 'ISO 4217 source currency code (e.g. USD)' },
            target_currency: { type: 'string', description: 'ISO 4217 target currency code (e.g. JPY)' },
            amount: { type: 'number', description: 'Amount to convert' },
          },
          required: ['base_currency', 'target_currency', 'amount'],
        },
      },
      {
        name: 'get_enriched_pair',
        description: 'Get enriched data for a currency pair including rate, inverse rate, and metadata (requires API key)',
        inputSchema: {
          type: 'object',
          properties: {
            base_currency: { type: 'string', description: 'ISO 4217 base currency code' },
            target_currency: { type: 'string', description: 'ISO 4217 target currency code' },
          },
          required: ['base_currency', 'target_currency'],
        },
      },
      {
        name: 'get_historical_rates',
        description: 'Retrieve historical exchange rates for a base currency on a specific date (requires API key)',
        inputSchema: {
          type: 'object',
          properties: {
            base_currency: { type: 'string', description: 'ISO 4217 base currency code' },
            year: { type: 'integer', description: 'Year (e.g. 2024)' },
            month: { type: 'integer', description: 'Month as integer (1-12)' },
            day: { type: 'integer', description: 'Day as integer (1-31)' },
          },
          required: ['base_currency', 'year', 'month', 'day'],
        },
      },
      {
        name: 'list_supported_codes',
        description: 'List all currency codes and names supported by ExchangeRate-API (requires API key)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_quota',
        description: 'Check the remaining API request quota for the current billing period (requires API key)',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_latest_rates':
          return await this.getLatestRates(args);
        case 'get_latest_rates_free':
          return await this.getLatestRatesFree(args);
        case 'convert_pair':
          return await this.convertPair(args);
        case 'convert_amount':
          return await this.convertAmount(args);
        case 'get_enriched_pair':
          return await this.getEnrichedPair(args);
        case 'get_historical_rates':
          return await this.getHistoricalRates(args);
        case 'list_supported_codes':
          return await this.listSupportedCodes();
        case 'get_quota':
          return await this.getQuota();
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text', text: `Error calling ${name}: ${msg}` }], isError: true };
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async fetchV6(path: string): Promise<ToolResult> {
    const url = `${this.v6Base}${path}`;
    const res = await this.fetchWithRetry(url, { headers: { 'Accept': 'application/json' } });
    const text = await res.text();
    const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n… [truncated]' : text;
    if (!res.ok) {
      return { content: [{ type: 'text', text: `HTTP ${res.status}: ${truncated}` }], isError: true };
    }
    // v6 API embeds result:"error" in a 200 response for bad keys
    try {
      const json = JSON.parse(text) as { result?: string; 'error-type'?: string };
      if (json.result === 'error') {
        return { content: [{ type: 'text', text: truncated }], isError: true };
      }
    } catch {
      // not JSON — return raw
    }
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getLatestRates(args: Record<string, unknown>): Promise<ToolResult> {
    const base = encodeURIComponent(String(args.base_currency).toUpperCase());
    return this.fetchV6(`/latest/${base}`);
  }

  private async getLatestRatesFree(args: Record<string, unknown>): Promise<ToolResult> {
    const base = encodeURIComponent(String(args.base_currency).toUpperCase());
    const url = `${this.v4Base}/latest/${base}`;
    const res = await this.fetchWithRetry(url, { headers: { 'Accept': 'application/json' } });
    const text = await res.text();
    const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n… [truncated]' : text;
    if (!res.ok) {
      return { content: [{ type: 'text', text: `HTTP ${res.status}: ${truncated}` }], isError: true };
    }
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async convertPair(args: Record<string, unknown>): Promise<ToolResult> {
    const base = encodeURIComponent(String(args.base_currency).toUpperCase());
    const target = encodeURIComponent(String(args.target_currency).toUpperCase());
    return this.fetchV6(`/pair/${base}/${target}`);
  }

  private async convertAmount(args: Record<string, unknown>): Promise<ToolResult> {
    const base = encodeURIComponent(String(args.base_currency).toUpperCase());
    const target = encodeURIComponent(String(args.target_currency).toUpperCase());
    const amount = encodeURIComponent(String(args.amount));
    return this.fetchV6(`/pair/${base}/${target}/${amount}`);
  }

  private async getEnrichedPair(args: Record<string, unknown>): Promise<ToolResult> {
    const base = encodeURIComponent(String(args.base_currency).toUpperCase());
    const target = encodeURIComponent(String(args.target_currency).toUpperCase());
    return this.fetchV6(`/enriched/${base}/${target}`);
  }

  private async getHistoricalRates(args: Record<string, unknown>): Promise<ToolResult> {
    const base = encodeURIComponent(String(args.base_currency).toUpperCase());
    const year = encodeURIComponent(String(args.year));
    const month = encodeURIComponent(String(args.month));
    const day = encodeURIComponent(String(args.day));
    return this.fetchV6(`/history/${base}/${year}/${month}/${day}`);
  }

  private async listSupportedCodes(): Promise<ToolResult> {
    return this.fetchV6('/codes');
  }

  private async getQuota(): Promise<ToolResult> {
    return this.fetchV6('/quota');
  }
}
