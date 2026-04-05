/**
 * Polygon.io MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/massive-com/mcp_polygon (formerly polygon-io/mcp_polygon — Polygon.io rebranded to Massive.com)
//   transport: stdio (SSE/streamable-HTTP via MCP_TRANSPORT env var), auth: MASSIVE_API_KEY env var (POLYGON_API_KEY deprecated alias)
//   Actively maintained — last commit Mar 2026. Exposes all Polygon.io API endpoints as MCP tools (35+).
// Our adapter covers: 15 tools (stocks, options, forex, reference data). Vendor MCP covers: 35+ tools (full API).
// Recommendation: Use vendor MCP for full coverage. Use this adapter for air-gapped deployments or selective tool exposure.
//
// Base URL: https://api.polygon.io
// Auth: API key passed as query parameter: ?apiKey=YOUR_KEY
// Docs: https://polygon.io/docs/stocks
// Rate limits: Free tier — 5 req/min. Starter — unlimited req/min (delayed data). Advanced — unlimited (real-time)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PolygonIoConfig {
  apiKey: string;
  baseUrl?: string;
}

export class PolygonIoMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: PolygonIoConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.polygon.io';
  }

  static catalog() {
    return {
      name: 'polygon-io',
      displayName: 'Polygon.io',
      version: '1.0.0',
      category: 'finance',
      keywords: ['polygon', 'stocks', 'options', 'forex', 'crypto', 'market data', 'financial', 'OHLCV', 'ticker', 'trading', 'quotes', 'trades'],
      toolNames: [
        'get_ticker_details', 'search_tickers', 'list_tickers',
        'get_aggregates', 'get_daily_open_close', 'get_previous_close',
        'list_trades', 'list_quotes',
        'get_snapshot_ticker', 'list_gainers_losers',
        'list_options_contracts', 'get_options_contract',
        'list_forex_pairs', 'get_forex_aggregates',
        'get_market_status',
      ],
      description: 'Polygon.io financial market data: stock OHLCV aggregates, ticker details, options contracts, forex rates, crypto, and real-time snapshots.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_ticker_details',
        description: 'Get detailed information about a stock ticker including company name, description, SIC code, and market cap',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: { type: 'string', description: 'Stock ticker symbol (e.g. AAPL, MSFT, TSLA)' },
            date: { type: 'string', description: 'Date for point-in-time details in YYYY-MM-DD format (default: latest)' },
          },
          required: ['ticker'],
        },
      },
      {
        name: 'search_tickers',
        description: 'Search for tickers by company name or keyword with optional market and asset type filters',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search keyword (company name or ticker fragment)' },
            market: { type: 'string', description: 'Filter by market: stocks, crypto, fx, otc (default: stocks)' },
            type: { type: 'string', description: 'Asset type: CS (Common Stock), ETF, FUND, INDEX, CRYPTO, FX' },
            active: { type: 'boolean', description: 'Filter for active (true) or inactive (false) tickers (default: true)' },
            limit: { type: 'number', description: 'Results per page (max: 1000, default: 100)' },
          },
          required: ['search'],
        },
      },
      {
        name: 'list_tickers',
        description: 'List all tickers with filters for market, exchange, type, and active status with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            market: { type: 'string', description: 'Market type: stocks, crypto, fx, otc' },
            exchange: { type: 'string', description: 'Filter by exchange MIC code (e.g. XNAS, XNYS)' },
            type: { type: 'string', description: 'Asset type: CS, ETF, FUND, INDEX, CRYPTO, FX' },
            active: { type: 'boolean', description: 'Include only active tickers (default: true)' },
            limit: { type: 'number', description: 'Results per page (max: 1000, default: 100)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
        },
      },
      {
        name: 'get_aggregates',
        description: 'Get OHLCV aggregate bars for a ticker over a date range with configurable timespan and multiplier',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: { type: 'string', description: 'Stock ticker symbol (e.g. AAPL)' },
            multiplier: { type: 'number', description: 'Timespan multiplier (e.g. 1 for 1-day bars, 5 for 5-minute bars)' },
            timespan: { type: 'string', description: 'Bar timespan: minute, hour, day, week, month, quarter, year' },
            from: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            to: { type: 'string', description: 'End date in YYYY-MM-DD format' },
            adjusted: { type: 'boolean', description: 'Adjust for splits (default: true)' },
            limit: { type: 'number', description: 'Maximum bars to return (max: 50000, default: 5000)' },
            sort: { type: 'string', description: 'Sort order: asc or desc (default: asc)' },
          },
          required: ['ticker', 'multiplier', 'timespan', 'from', 'to'],
        },
      },
      {
        name: 'get_daily_open_close',
        description: 'Get the open, close, high, low, and after-hours prices for a stock on a specific date',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: { type: 'string', description: 'Stock ticker symbol (e.g. AAPL)' },
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
            adjusted: { type: 'boolean', description: 'Adjust for splits (default: true)' },
          },
          required: ['ticker', 'date'],
        },
      },
      {
        name: 'get_previous_close',
        description: 'Get the previous trading day open, close, high, low, and volume for a ticker',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: { type: 'string', description: 'Stock ticker symbol (e.g. AAPL)' },
            adjusted: { type: 'boolean', description: 'Adjust for splits (default: true)' },
          },
          required: ['ticker'],
        },
      },
      {
        name: 'list_trades',
        description: 'List individual trade ticks for a stock ticker on a specific date with optional time range',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: { type: 'string', description: 'Stock ticker symbol (e.g. AAPL)' },
            timestamp: { type: 'string', description: 'Filter trades at or after this timestamp (nanoseconds or ISO 8601)' },
            order: { type: 'string', description: 'Sort order: asc or desc (default: asc)' },
            limit: { type: 'number', description: 'Maximum trades to return (max: 50000, default: 10)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: ['ticker'],
        },
      },
      {
        name: 'list_quotes',
        description: 'List NBBO bid/ask quote ticks for a stock ticker with optional timestamp and pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: { type: 'string', description: 'Stock ticker symbol (e.g. AAPL)' },
            timestamp: { type: 'string', description: 'Filter quotes at or after this timestamp (nanoseconds or ISO 8601)' },
            order: { type: 'string', description: 'Sort order: asc or desc (default: asc)' },
            limit: { type: 'number', description: 'Maximum quotes to return (max: 50000, default: 10)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: ['ticker'],
        },
      },
      {
        name: 'get_snapshot_ticker',
        description: 'Get the real-time snapshot for a stock ticker including day OHLCV, last trade, last quote, and minute bar',
        inputSchema: {
          type: 'object',
          properties: {
            ticker: { type: 'string', description: 'Stock ticker symbol (e.g. AAPL)' },
          },
          required: ['ticker'],
        },
      },
      {
        name: 'list_gainers_losers',
        description: 'Get the top gaining or losing stocks for the current trading day by percent change',
        inputSchema: {
          type: 'object',
          properties: {
            direction: { type: 'string', description: 'gainers or losers (default: gainers)' },
            include_otc: { type: 'boolean', description: 'Include OTC securities (default: false)' },
          },
        },
      },
      {
        name: 'list_options_contracts',
        description: 'List options contracts for an underlying ticker with filters for type, expiry, and strike price',
        inputSchema: {
          type: 'object',
          properties: {
            underlying_ticker: { type: 'string', description: 'Underlying stock ticker symbol (e.g. AAPL)' },
            contract_type: { type: 'string', description: 'Options type: call or put' },
            expiration_date: { type: 'string', description: 'Filter by expiration date in YYYY-MM-DD format' },
            strike_price: { type: 'number', description: 'Filter by exact strike price' },
            limit: { type: 'number', description: 'Results per page (max: 1000, default: 10)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: ['underlying_ticker'],
        },
      },
      {
        name: 'get_options_contract',
        description: 'Get details for a specific options contract by its Polygon options ticker symbol',
        inputSchema: {
          type: 'object',
          properties: {
            options_ticker: { type: 'string', description: 'Options ticker symbol (e.g. O:AAPL230120C00150000)' },
            as_of: { type: 'string', description: 'Point-in-time date in YYYY-MM-DD format (default: latest)' },
          },
          required: ['options_ticker'],
        },
      },
      {
        name: 'list_forex_pairs',
        description: 'List available forex currency pairs with optional search filters and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Base currency code (e.g. USD, EUR)' },
            to: { type: 'string', description: 'Quote currency code (e.g. JPY, GBP)' },
            limit: { type: 'number', description: 'Results per page (max: 1000, default: 100)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
        },
      },
      {
        name: 'get_forex_aggregates',
        description: 'Get OHLCV aggregate bars for a forex currency pair over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            forex_ticker: { type: 'string', description: 'Forex pair ticker (e.g. C:EURUSD, C:USDJPY)' },
            multiplier: { type: 'number', description: 'Timespan multiplier (e.g. 1 for daily bars)' },
            timespan: { type: 'string', description: 'Bar timespan: minute, hour, day, week, month, quarter, year' },
            from: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            to: { type: 'string', description: 'End date in YYYY-MM-DD format' },
            limit: { type: 'number', description: 'Maximum bars to return (max: 50000, default: 120)' },
          },
          required: ['forex_ticker', 'multiplier', 'timespan', 'from', 'to'],
        },
      },
      {
        name: 'get_market_status',
        description: 'Get the current trading status of US stock markets, options, and crypto markets',
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
        case 'get_ticker_details': return this.getTickerDetails(args);
        case 'search_tickers': return this.searchTickers(args);
        case 'list_tickers': return this.listTickers(args);
        case 'get_aggregates': return this.getAggregates(args);
        case 'get_daily_open_close': return this.getDailyOpenClose(args);
        case 'get_previous_close': return this.getPreviousClose(args);
        case 'list_trades': return this.listTrades(args);
        case 'list_quotes': return this.listQuotes(args);
        case 'get_snapshot_ticker': return this.getSnapshotTicker(args);
        case 'list_gainers_losers': return this.listGainersLosers(args);
        case 'list_options_contracts': return this.listOptionsContracts(args);
        case 'get_options_contract': return this.getOptionsContract(args);
        case 'list_forex_pairs': return this.listForexPairs(args);
        case 'get_forex_aggregates': return this.getForexAggregates(args);
        case 'get_market_status': return this.getMarketStatus();
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

  private async fetch(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    params.apiKey = this.apiKey;
    const qs = new URLSearchParams(params).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}?${qs}`, {});
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getTickerDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ticker) return { content: [{ type: 'text', text: 'ticker is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.date) params.date = args.date as string;
    return this.fetch(`/v3/reference/tickers/${encodeURIComponent(args.ticker as string)}`, params);
  }

  private async searchTickers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.search) return { content: [{ type: 'text', text: 'search is required' }], isError: true };
    const params: Record<string, string> = { search: args.search as string };
    if (args.market) params.market = args.market as string;
    if (args.type) params.type = args.type as string;
    if (typeof args.active === 'boolean') params.active = String(args.active);
    if (args.limit) params.limit = String(args.limit);
    return this.fetch('/v3/reference/tickers', params);
  }

  private async listTickers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.market) params.market = args.market as string;
    if (args.exchange) params.exchange = args.exchange as string;
    if (args.type) params.type = args.type as string;
    if (typeof args.active === 'boolean') params.active = String(args.active);
    if (args.limit) params.limit = String(args.limit);
    if (args.cursor) params.cursor = args.cursor as string;
    return this.fetch('/v3/reference/tickers', params);
  }

  private async getAggregates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ticker || !args.multiplier || !args.timespan || !args.from || !args.to) {
      return { content: [{ type: 'text', text: 'ticker, multiplier, timespan, from, and to are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (typeof args.adjusted === 'boolean') params.adjusted = String(args.adjusted);
    if (args.limit) params.limit = String(args.limit);
    if (args.sort) params.sort = args.sort as string;
    return this.fetch(`/v2/aggs/ticker/${encodeURIComponent(args.ticker as string)}/range/${encodeURIComponent(args.multiplier as string)}/${encodeURIComponent(args.timespan as string)}/${encodeURIComponent(args.from as string)}/${encodeURIComponent(args.to as string)}`, params);
  }

  private async getDailyOpenClose(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ticker || !args.date) return { content: [{ type: 'text', text: 'ticker and date are required' }], isError: true };
    const params: Record<string, string> = {};
    if (typeof args.adjusted === 'boolean') params.adjusted = String(args.adjusted);
    return this.fetch(`/v1/open-close/${encodeURIComponent(args.ticker as string)}/${encodeURIComponent(args.date as string)}`, params);
  }

  private async getPreviousClose(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ticker) return { content: [{ type: 'text', text: 'ticker is required' }], isError: true };
    const params: Record<string, string> = {};
    if (typeof args.adjusted === 'boolean') params.adjusted = String(args.adjusted);
    return this.fetch(`/v2/aggs/ticker/${encodeURIComponent(args.ticker as string)}/prev`, params);
  }

  private async listTrades(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ticker) return { content: [{ type: 'text', text: 'ticker is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.timestamp) params.timestamp = args.timestamp as string;
    if (args.order) params.order = args.order as string;
    if (args.limit) params.limit = String(args.limit);
    if (args.cursor) params.cursor = args.cursor as string;
    return this.fetch(`/v3/trades/${encodeURIComponent(args.ticker as string)}`, params);
  }

  private async listQuotes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ticker) return { content: [{ type: 'text', text: 'ticker is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.timestamp) params.timestamp = args.timestamp as string;
    if (args.order) params.order = args.order as string;
    if (args.limit) params.limit = String(args.limit);
    if (args.cursor) params.cursor = args.cursor as string;
    return this.fetch(`/v3/quotes/${encodeURIComponent(args.ticker as string)}`, params);
  }

  private async getSnapshotTicker(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ticker) return { content: [{ type: 'text', text: 'ticker is required' }], isError: true };
    return this.fetch(`/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(args.ticker as string)}`);
  }

  private async listGainersLosers(args: Record<string, unknown>): Promise<ToolResult> {
    const direction = (args.direction as string) || 'gainers';
    const params: Record<string, string> = {};
    if (typeof args.include_otc === 'boolean') params.include_otc = String(args.include_otc);
    return this.fetch(`/v2/snapshot/locale/us/markets/stocks/${direction}`, params);
  }

  private async listOptionsContracts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.underlying_ticker) return { content: [{ type: 'text', text: 'underlying_ticker is required' }], isError: true };
    const params: Record<string, string> = { underlying_ticker: args.underlying_ticker as string };
    if (args.contract_type) params.contract_type = args.contract_type as string;
    if (args.expiration_date) params.expiration_date = args.expiration_date as string;
    if (args.strike_price) params.strike_price = String(args.strike_price);
    if (args.limit) params.limit = String(args.limit);
    if (args.cursor) params.cursor = args.cursor as string;
    return this.fetch('/v3/reference/options/contracts', params);
  }

  private async getOptionsContract(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.options_ticker) return { content: [{ type: 'text', text: 'options_ticker is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.as_of) params.as_of = args.as_of as string;
    return this.fetch(`/v3/reference/options/contracts/${encodeURIComponent(args.options_ticker as string)}`, params);
  }

  private async listForexPairs(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.from) params.from = args.from as string;
    if (args.to) params.to = args.to as string;
    if (args.limit) params.limit = String(args.limit);
    if (args.cursor) params.cursor = args.cursor as string;
    return this.fetch('/v3/reference/tickers', { ...params, market: 'fx' });
  }

  private async getForexAggregates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.forex_ticker || !args.multiplier || !args.timespan || !args.from || !args.to) {
      return { content: [{ type: 'text', text: 'forex_ticker, multiplier, timespan, from, and to are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.limit) params.limit = String(args.limit);
    return this.fetch(`/v2/aggs/ticker/${encodeURIComponent(args.forex_ticker as string)}/range/${encodeURIComponent(args.multiplier as string)}/${encodeURIComponent(args.timespan as string)}/${encodeURIComponent(args.from as string)}/${encodeURIComponent(args.to as string)}`, params);
  }

  private async getMarketStatus(): Promise<ToolResult> {
    return this.fetch('/v1/marketstatus/now');
  }
}
