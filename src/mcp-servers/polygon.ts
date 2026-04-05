/**
 * Polygon MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Polygon MCP server was found on GitHub. We build a full REST wrapper
// for complete API coverage.
//
// Base URL: https://api.polygon.io
// Auth: API key via query param `apiKey`
// Docs: https://polygon.io/docs/
// Spec: https://api.apis.guru/v2/specs/polygon.io/1.0.0/swagger.json
// Category: finance
// Rate limits: Free tier — 5 req/min. Paid tiers up to unlimited. See https://polygon.io/dashboard

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PolygonConfig {
  apiKey: string;
  baseUrl?: string;
}

export class PolygonMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: PolygonConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.polygon.io';
  }

  static catalog() {
    return {
      name: 'polygon',
      displayName: 'Polygon.io',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'polygon', 'stocks', 'finance', 'market data', 'equities', 'forex',
        'currency', 'historic', 'trades', 'quotes', 'aggregates', 'companies',
        'financial', 'ticker', 'stock market', 'trading',
      ],
      toolNames: [
        'list_companies',
        'list_currencies',
        'get_historic_aggregates',
        'get_historic_forex_ticks',
        'get_historic_quotes',
        'get_historic_trades',
        'get_last_currency_trade',
        'get_last_stock_trade',
        'get_last_currency_quote',
        'get_last_stock_quote',
      ],
      description: 'Polygon.io financial market data: list companies and currencies, retrieve historic aggregates, forex ticks, quotes, and trades, and get real-time last trade/quote for stocks and currency pairs.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Reference Data ─────────────────────────────────────────────────────
      {
        name: 'list_companies',
        description: 'List all companies available on Polygon.io with optional sorting and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            sort: {
              type: 'string',
              description: 'Field to sort by. Prefix with `-` for descending order (e.g. `-marketcap`)',
            },
            perpage: {
              type: 'number',
              description: 'Number of results per page for pagination',
            },
            page: {
              type: 'number',
              description: 'Page number to return (1-based)',
            },
          },
        },
      },
      {
        name: 'list_currencies',
        description: 'List all currency symbols available on Polygon.io for forex trading',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Historic Data ──────────────────────────────────────────────────────
      {
        name: 'get_historic_aggregates',
        description: 'Get historic aggregate bar data (OHLCV) for a stock symbol over a specific date. Size can be `second` or `minute`.',
        inputSchema: {
          type: 'object',
          properties: {
            size: {
              type: 'string',
              description: 'Aggregation size: `second` or `minute`',
            },
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format',
            },
            offset: {
              type: 'integer',
              description: 'Timestamp offset for pagination (Unix ms timestamp)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return (max: 10000)',
            },
          },
          required: ['size', 'symbol', 'date'],
        },
      },
      {
        name: 'get_historic_forex_ticks',
        description: 'Get historic tick data for a forex currency pair on a specific date',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'From currency symbol (e.g. USD)',
            },
            to: {
              type: 'string',
              description: 'To currency symbol (e.g. EUR)',
            },
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format',
            },
            offset: {
              type: 'integer',
              description: 'Timestamp offset for pagination (Unix ms timestamp)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return (max: 10000)',
            },
          },
          required: ['from', 'to', 'date'],
        },
      },
      {
        name: 'get_historic_quotes',
        description: 'Get historic NBBO (National Best Bid and Offer) quotes for a stock symbol on a specific date',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format',
            },
            offset: {
              type: 'integer',
              description: 'Timestamp offset for pagination (Unix ms timestamp)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return (max: 10000)',
            },
          },
          required: ['symbol', 'date'],
        },
      },
      {
        name: 'get_historic_trades',
        description: 'Get historic trade-level tick data for a stock symbol on a specific date',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format',
            },
            offset: {
              type: 'integer',
              description: 'Timestamp offset for pagination (Unix ms timestamp)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return (max: 10000)',
            },
          },
          required: ['symbol', 'date'],
        },
      },
      // ── Last Trade/Quote ───────────────────────────────────────────────────
      {
        name: 'get_last_currency_trade',
        description: 'Get the most recent trade for a forex currency pair',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'From currency symbol (e.g. USD)',
            },
            to: {
              type: 'string',
              description: 'To currency symbol (e.g. EUR)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_last_stock_trade',
        description: 'Get the most recent trade for a stock ticker symbol',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_last_currency_quote',
        description: 'Get the most recent bid/ask quote for a forex currency pair',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'From currency symbol (e.g. USD)',
            },
            to: {
              type: 'string',
              description: 'To currency symbol (e.g. EUR)',
            },
          },
          required: ['from', 'to'],
        },
      },
      {
        name: 'get_last_stock_quote',
        description: 'Get the most recent NBBO bid/ask quote for a stock ticker symbol',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
          },
          required: ['symbol'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_companies':           return this.listCompanies(args);
        case 'list_currencies':          return this.listCurrencies();
        case 'get_historic_aggregates':  return this.getHistoricAggregates(args);
        case 'get_historic_forex_ticks': return this.getHistoricForexTicks(args);
        case 'get_historic_quotes':      return this.getHistoricQuotes(args);
        case 'get_historic_trades':      return this.getHistoricTrades(args);
        case 'get_last_currency_trade':  return this.getLastCurrencyTrade(args);
        case 'get_last_stock_trade':     return this.getLastStockTrade(args);
        case 'get_last_currency_quote':  return this.getLastCurrencyQuote(args);
        case 'get_last_stock_quote':     return this.getLastStockQuote(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildUrl(path: string, params: Record<string, unknown> = {}): string {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('apiKey', this.apiKey);
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        url.searchParams.set(key, String(val));
      }
    }
    return url.toString();
  }

  private async request(path: string, params: Record<string, unknown> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Reference Data ─────────────────────────────────────────────────────────

  private async listCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.sort)    params['sort']    = args.sort;
    if (args.perpage) params['perpage'] = args.perpage;
    if (args.page)    params['page']    = args.page;
    return this.request('/v1/companies', params);
  }

  private async listCurrencies(): Promise<ToolResult> {
    return this.request('/v1/currencies');
  }

  // ── Historic Data ──────────────────────────────────────────────────────────

  private async getHistoricAggregates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.size || !args.symbol || !args.date) {
      return { content: [{ type: 'text', text: 'size, symbol, and date are required' }], isError: true };
    }
    const params: Record<string, unknown> = {};
    if (args.offset !== undefined) params['offset'] = args.offset;
    if (args.limit  !== undefined) params['limit']  = args.limit;
    return this.request(
      `/v1/historic/agg/${encodeURIComponent(args.size as string)}/${encodeURIComponent(args.symbol as string)}/${encodeURIComponent(args.date as string)}`,
      params,
    );
  }

  private async getHistoricForexTicks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to || !args.date) {
      return { content: [{ type: 'text', text: 'from, to, and date are required' }], isError: true };
    }
    const params: Record<string, unknown> = {};
    if (args.offset !== undefined) params['offset'] = args.offset;
    if (args.limit  !== undefined) params['limit']  = args.limit;
    return this.request(
      `/v1/historic/forex/${encodeURIComponent(args.from as string)}/${encodeURIComponent(args.to as string)}/${encodeURIComponent(args.date as string)}`,
      params,
    );
  }

  private async getHistoricQuotes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol || !args.date) {
      return { content: [{ type: 'text', text: 'symbol and date are required' }], isError: true };
    }
    const params: Record<string, unknown> = {};
    if (args.offset !== undefined) params['offset'] = args.offset;
    if (args.limit  !== undefined) params['limit']  = args.limit;
    return this.request(
      `/v1/historic/quotes/${encodeURIComponent(args.symbol as string)}/${encodeURIComponent(args.date as string)}`,
      params,
    );
  }

  private async getHistoricTrades(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol || !args.date) {
      return { content: [{ type: 'text', text: 'symbol and date are required' }], isError: true };
    }
    const params: Record<string, unknown> = {};
    if (args.offset !== undefined) params['offset'] = args.offset;
    if (args.limit  !== undefined) params['limit']  = args.limit;
    return this.request(
      `/v1/historic/trades/${encodeURIComponent(args.symbol as string)}/${encodeURIComponent(args.date as string)}`,
      params,
    );
  }

  // ── Last Trade/Quote ───────────────────────────────────────────────────────

  private async getLastCurrencyTrade(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to) {
      return { content: [{ type: 'text', text: 'from and to are required' }], isError: true };
    }
    return this.request(
      `/v1/last/currencies/${encodeURIComponent(args.from as string)}/${encodeURIComponent(args.to as string)}`,
    );
  }

  private async getLastStockTrade(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) {
      return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    }
    return this.request(`/v1/last/stocks/${encodeURIComponent(args.symbol as string)}`);
  }

  private async getLastCurrencyQuote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to) {
      return { content: [{ type: 'text', text: 'from and to are required' }], isError: true };
    }
    return this.request(
      `/v1/last_quote/currencies/${encodeURIComponent(args.from as string)}/${encodeURIComponent(args.to as string)}`,
    );
  }

  private async getLastStockQuote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) {
      return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    }
    return this.request(`/v1/last_quote/stocks/${encodeURIComponent(args.symbol as string)}`);
  }
}
