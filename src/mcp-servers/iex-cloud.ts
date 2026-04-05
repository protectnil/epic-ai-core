/**
 * IEX Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official IEX Cloud MCP server was found on GitHub or npm.
// Our adapter covers: 20 tools. Vendor MCP covers: 0 tools.
// Recommendation: use-rest-api — no vendor MCP exists.
//
// *** WARNING: IEX Cloud shut down on August 31, 2024. All API endpoints are offline. ***
// *** This adapter is non-functional against cloud.iexapis.com as of that date.       ***
// *** Retained for reference and potential migration to a compatible successor API.   ***
//
// Base URL: https://cloud.iexapis.com/stable (OFFLINE as of 2024-08-31)
// Auth: API token passed as query parameter (?token=YOUR_TOKEN). Publishable tokens begin with
//       pk_ (safe for client-side). Secret tokens begin with sk_ (server-side only).
// Docs: https://iexcloud.io/docs/api/ (archived — service is shut down)
// Rate limits: Message-based quota system. Free tier: 500,000 messages/month. Paid plans start
//              at 5M messages/month. Each endpoint consumes a documented message credit count.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IEXCloudConfig {
  apiToken: string;
  baseUrl?: string;
}

export class IEXCloudMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: IEXCloudConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://cloud.iexapis.com/stable';
  }

  static catalog() {
    return {
      name: 'iex-cloud',
      displayName: 'IEX Cloud',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'iex', 'iex cloud', 'stock', 'equities', 'quote', 'market data', 'financial data',
        'earnings', 'dividends', 'company', 'fundamentals', 'price', 'ohlc', 'historical',
        'news', 'crypto', 'currency', 'forex', 'sector', 'balance sheet', 'income statement',
      ],
      toolNames: [
        'get_quote', 'get_company', 'get_price', 'get_ohlc', 'get_historical_prices',
        'get_earnings', 'get_dividends', 'get_financials', 'get_balance_sheet', 'get_income_statement',
        'get_cash_flow', 'get_key_stats', 'get_news', 'search_symbols', 'get_logo',
        'list_symbols', 'get_sector_performance', 'get_market_holidays', 'get_exchange_symbols',
        'batch_quotes',
      ],
      description: 'IEX Cloud financial data: real-time and historical stock quotes, company fundamentals, earnings, dividends, financials, news, and market data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_quote',
        description: 'Get real-time quote data for a stock symbol including price, volume, market cap, P/E ratio, and 52-week high/low',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL, TSLA, MSFT)',
            },
            display_percent: {
              type: 'boolean',
              description: 'If true, percentage fields are returned as human-readable strings (default: false)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_company',
        description: 'Get company profile information including description, CEO, sector, industry, employees, and website',
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
        name: 'get_price',
        description: 'Get the latest real-time stock price (single number) for a symbol — lowest message cost',
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
        name: 'get_ohlc',
        description: 'Get the open, high, low, and close (OHLC) prices for a stock for the current or most recent trading day',
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
        name: 'get_historical_prices',
        description: 'Get historical daily price data for a stock over a specified range with OHLCV data',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            range: {
              type: 'string',
              description: 'Date range: 5d, 1m, 3m, 6m, ytd, 1y, 2y, 5y, max (default: 1m)',
            },
            chart_close_only: {
              type: 'boolean',
              description: 'Return close price only to reduce message credits (default: false)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_earnings',
        description: 'Get earnings per share (EPS) data for a stock including actual vs estimated EPS and announcement dates',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            last: {
              type: 'number',
              description: 'Number of most recent quarterly earnings to return (max 4, default: 1)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_dividends',
        description: 'Get historical dividend payment data for a stock including ex-dividend dates, record dates, and payment amounts',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            range: {
              type: 'string',
              description: 'Date range: 5d, 1m, 3m, 6m, ytd, 1y, 2y, 5y (default: 1m)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_financials',
        description: 'Get quarterly or annual income statement and balance sheet highlights for a stock',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            period: {
              type: 'string',
              description: 'Reporting period: annual or quarterly (default: quarterly)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_balance_sheet',
        description: 'Get detailed balance sheet data including assets, liabilities, and shareholders equity for a stock',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            period: {
              type: 'string',
              description: 'Reporting period: annual or quarterly (default: quarterly)',
            },
            last: {
              type: 'number',
              description: 'Number of periods to return (default: 1, max: 4)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_income_statement',
        description: 'Get detailed income statement data including revenue, net income, EBITDA, and EPS for a stock',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            period: {
              type: 'string',
              description: 'Reporting period: annual or quarterly (default: quarterly)',
            },
            last: {
              type: 'number',
              description: 'Number of periods to return (default: 1, max: 4)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_cash_flow',
        description: 'Get cash flow statement data including operating, investing, and financing activities for a stock',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            period: {
              type: 'string',
              description: 'Reporting period: annual or quarterly (default: quarterly)',
            },
            last: {
              type: 'number',
              description: 'Number of periods to return (default: 1, max: 4)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_key_stats',
        description: 'Get key financial statistics for a stock including beta, 52-week range, shares outstanding, float, and TTM metrics',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            stat: {
              type: 'string',
              description: 'Optional: return a single stat by name (e.g. beta, week52high, marketcap)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_news',
        description: 'Get recent news articles for a stock symbol or general market news from IEX Cloud',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol for company-specific news. Omit or use "market" for general market news',
            },
            last: {
              type: 'number',
              description: 'Number of news articles to return (max 50, default: 10)',
            },
          },
        },
      },
      {
        name: 'search_symbols',
        description: 'Search for stock symbols by company name or keyword across all supported exchanges',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Company name or keyword to search (e.g. Apple, electric vehicle)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_logo',
        description: 'Get the company logo URL for a stock symbol',
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
        name: 'list_symbols',
        description: 'List all tradeable symbols available on IEX including symbol, name, exchange, and asset type',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of symbols to return (default: 100)',
            },
          },
        },
      },
      {
        name: 'get_sector_performance',
        description: 'Get performance data for all S&P 500 sectors showing daily percentage change',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_market_holidays',
        description: 'Get upcoming NYSE market trading holidays and half-days for the current or next year',
        inputSchema: {
          type: 'object',
          properties: {
            direction: {
              type: 'string',
              description: 'Direction from today: next or last (default: next)',
            },
            last: {
              type: 'number',
              description: 'Number of holidays to return (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_exchange_symbols',
        description: 'Get all supported symbols for a specific exchange (e.g. NASDAQ, NYSE)',
        inputSchema: {
          type: 'object',
          properties: {
            exchange: {
              type: 'string',
              description: 'Exchange short code (e.g. nasdaq, nyse, otc)',
            },
          },
          required: ['exchange'],
        },
      },
      {
        name: 'batch_quotes',
        description: 'Get quotes for multiple stock symbols in a single API call to minimize message credits',
        inputSchema: {
          type: 'object',
          properties: {
            symbols: {
              type: 'string',
              description: 'Comma-separated list of stock symbols (e.g. AAPL,TSLA,MSFT — max 100)',
            },
            types: {
              type: 'string',
              description: 'Comma-separated data types to include: quote, company, stats, news (default: quote)',
            },
          },
          required: ['symbols'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_quote':
          return this.getQuote(args);
        case 'get_company':
          return this.getCompany(args);
        case 'get_price':
          return this.getPrice(args);
        case 'get_ohlc':
          return this.getOhlc(args);
        case 'get_historical_prices':
          return this.getHistoricalPrices(args);
        case 'get_earnings':
          return this.getEarnings(args);
        case 'get_dividends':
          return this.getDividends(args);
        case 'get_financials':
          return this.getFinancials(args);
        case 'get_balance_sheet':
          return this.getBalanceSheet(args);
        case 'get_income_statement':
          return this.getIncomeStatement(args);
        case 'get_cash_flow':
          return this.getCashFlow(args);
        case 'get_key_stats':
          return this.getKeyStats(args);
        case 'get_news':
          return this.getNews(args);
        case 'search_symbols':
          return this.searchSymbols(args);
        case 'get_logo':
          return this.getLogo(args);
        case 'list_symbols':
          return this.listSymbols(args);
        case 'get_sector_performance':
          return this.getSectorPerformance();
        case 'get_market_holidays':
          return this.getMarketHolidays(args);
        case 'get_exchange_symbols':
          return this.getExchangeSymbols(args);
        case 'batch_quotes':
          return this.batchQuotes(args);
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

  private buildUrl(path: string, params: Record<string, string> = {}): string {
    const qs = new URLSearchParams({ ...params, token: this.apiToken }).toString();
    return `${this.baseUrl}${path}?${qs}`;
  }

  private async iexGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getQuote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.display_percent === true) params.displayPercent = 'true';
    return this.iexGet(`/stock/${encodeURIComponent(args.symbol as string)}/quote`, params);
  }

  private async getCompany(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    return this.iexGet(`/stock/${encodeURIComponent(args.symbol as string)}/company`);
  }

  private async getPrice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    return this.iexGet(`/stock/${encodeURIComponent(args.symbol as string)}/price`);
  }

  private async getOhlc(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    return this.iexGet(`/stock/${encodeURIComponent(args.symbol as string)}/ohlc`);
  }

  private async getHistoricalPrices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const range = (args.range as string) || '1m';
    const params: Record<string, string> = {};
    if (args.chart_close_only === true) params.chartCloseOnly = 'true';
    return this.iexGet(`/stock/${encodeURIComponent(args.symbol as string)}/chart/${range}`, params);
  }

  private async getEarnings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const last = (args.last as number) || 1;
    return this.iexGet(`/stock/${encodeURIComponent(args.symbol as string)}/earnings/${last}`);
  }

  private async getDividends(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const range = (args.range as string) || '1m';
    return this.iexGet(`/stock/${encodeURIComponent(args.symbol as string)}/dividends/${range}`);
  }

  private async getFinancials(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.period) params.period = args.period as string;
    return this.iexGet(`/stock/${encodeURIComponent(args.symbol as string)}/financials`, params);
  }

  private async getBalanceSheet(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.period) params.period = args.period as string;
    if (args.last) params.last = String(args.last);
    return this.iexGet(`/stock/${encodeURIComponent(args.symbol as string)}/balance-sheet`, params);
  }

  private async getIncomeStatement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.period) params.period = args.period as string;
    if (args.last) params.last = String(args.last);
    return this.iexGet(`/stock/${encodeURIComponent(args.symbol as string)}/income`, params);
  }

  private async getCashFlow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.period) params.period = args.period as string;
    if (args.last) params.last = String(args.last);
    return this.iexGet(`/stock/${encodeURIComponent(args.symbol as string)}/cash-flow`, params);
  }

  private async getKeyStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const path = args.stat
      ? `/stock/${encodeURIComponent(args.symbol as string)}/stats/${encodeURIComponent(args.stat as string)}`
      : `/stock/${encodeURIComponent(args.symbol as string)}/stats`;
    return this.iexGet(path);
  }

  private async getNews(args: Record<string, unknown>): Promise<ToolResult> {
    const symbol = (args.symbol as string) || 'market';
    const last = (args.last as number) || 10;
    if (symbol === 'market') {
      return this.iexGet(`/stock/market/news/last/${last}`);
    }
    return this.iexGet(`/stock/${encodeURIComponent(symbol)}/news/last/${last}`);
  }

  private async searchSymbols(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.iexGet(`/search/${encodeURIComponent(args.query as string)}`);
  }

  private async getLogo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    return this.iexGet(`/stock/${encodeURIComponent(args.symbol as string)}/logo`);
  }

  private async listSymbols(args: Record<string, unknown>): Promise<ToolResult> {
    const result = await this.iexGet('/ref-data/symbols');
    if (result.isError) return result;
    // Apply limit to the parsed array if needed
    const limit = (args.limit as number) || 100;
    try {
      const data = JSON.parse(result.content[0].text) as unknown[];
      const sliced = data.slice(0, limit);
      const text = JSON.stringify(sliced, null, 2);
      const truncated = text.length > 10_000
        ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
        : text;
      return { content: [{ type: 'text', text: truncated }], isError: false };
    } catch {
      return result;
    }
  }

  private async getSectorPerformance(): Promise<ToolResult> {
    return this.iexGet('/stock/market/sector-performance');
  }

  private async getMarketHolidays(args: Record<string, unknown>): Promise<ToolResult> {
    const direction = (args.direction as string) || 'next';
    const last = (args.last as number) || 1;
    return this.iexGet(`/ref-data/us/dates/holiday/${direction}/${last}`);
  }

  private async getExchangeSymbols(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.exchange) return { content: [{ type: 'text', text: 'exchange is required' }], isError: true };
    return this.iexGet(`/ref-data/exchange/${encodeURIComponent(args.exchange as string)}/symbols`);
  }

  private async batchQuotes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbols) return { content: [{ type: 'text', text: 'symbols is required' }], isError: true };
    const params: Record<string, string> = {
      symbols: args.symbols as string,
      types: (args.types as string) || 'quote',
    };
    return this.iexGet('/stock/market/batch', params);
  }
}
