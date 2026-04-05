/**
 * Alpha Vantage MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/alphavantage/alpha_vantage_mcp — transport: streamable-HTTP
//   Hosted endpoint: https://mcp.alphavantage.co/mcp?apikey=YOUR_API_KEY
//   Vendor MCP covers: 116 tools (full API surface via Progressive Tool Discovery).
// Recommendation: Use vendor MCP for full coverage. Use this adapter for air-gapped
//   deployments or environments where an npm runtime MCP dependency is not permitted.
//   Our adapter covers the 20 most commonly needed financial data endpoints.
//
// Base URL: https://www.alphavantage.co/query
// Auth: apikey query parameter (no header — appended to every request URL)
// Docs: https://www.alphavantage.co/documentation/
// Rate limits: Free tier: 25 requests/day. Premium: varies by plan (up to unlimited/min)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AlphaVantageConfig {
  apiKey: string;
  baseUrl?: string;
}

export class AlphaVantageMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AlphaVantageConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://www.alphavantage.co/query';
  }

  static catalog() {
    return {
      name: 'alpha-vantage',
      displayName: 'Alpha Vantage',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'alpha vantage', 'alphavantage', 'stock', 'equity', 'forex', 'fx',
        'cryptocurrency', 'crypto', 'market data', 'financial data', 'time series',
        'technical indicator', 'rsi', 'macd', 'sma', 'ema', 'bbands',
        'fundamental', 'earnings', 'balance sheet', 'income statement', 'cash flow',
        'nasdaq', 'nyse', 'quote', 'intraday', 'daily', 'weekly', 'monthly',
      ],
      toolNames: [
        'get_stock_quote',
        'get_intraday_series',
        'get_daily_series',
        'get_weekly_series',
        'get_monthly_series',
        'get_company_overview',
        'get_earnings',
        'get_income_statement',
        'get_balance_sheet',
        'get_cash_flow',
        'get_fx_rate',
        'get_fx_daily',
        'get_fx_intraday',
        'get_crypto_daily',
        'get_crypto_exchange_rate',
        'get_rsi',
        'get_macd',
        'get_sma',
        'get_market_status',
      ],
      description: 'Alpha Vantage financial market data: stock quotes, time series, forex rates, cryptocurrency prices, fundamental data (earnings, income statements), and technical indicators.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Equity — Quotes & Time Series ──────────────────────────────────────
      {
        name: 'get_stock_quote',
        description: 'Get the latest price quote for a stock ticker — price, change, change percent, volume, and market cap',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL, MSFT, GOOGL)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_intraday_series',
        description: 'Get intraday OHLCV time series for a stock at 1, 5, 15, 30, or 60 minute intervals — up to 30 days of history',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            interval: {
              type: 'string',
              description: 'Time interval: 1min, 5min, 15min, 30min, or 60min (default: 5min)',
            },
            outputsize: {
              type: 'string',
              description: 'Data size: compact (latest 100 data points) or full (30 days, default: compact)',
            },
            month: {
              type: 'string',
              description: 'Specific month to retrieve in YYYY-MM format (premium feature, e.g. 2024-01)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_daily_series',
        description: 'Get daily OHLCV time series for a stock — adjusted or unadjusted, up to 20 years of history',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            adjusted: {
              type: 'boolean',
              description: 'Return split/dividend adjusted prices (default: true)',
            },
            outputsize: {
              type: 'string',
              description: 'Data size: compact (latest 100 trading days) or full (20+ years, default: compact)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_weekly_series',
        description: 'Get weekly OHLCV time series for a stock with up to 20 years of history',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            adjusted: {
              type: 'boolean',
              description: 'Return split/dividend adjusted prices (default: true)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_monthly_series',
        description: 'Get monthly OHLCV time series for a stock with up to 20 years of history',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Stock ticker symbol (e.g. AAPL)',
            },
            adjusted: {
              type: 'boolean',
              description: 'Return split/dividend adjusted prices (default: true)',
            },
          },
          required: ['symbol'],
        },
      },
      // ── Fundamentals ───────────────────────────────────────────────────────
      {
        name: 'get_company_overview',
        description: 'Get company fundamentals — description, sector, industry, PE ratio, EPS, dividend yield, 52-week high/low, and market cap',
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
        name: 'get_earnings',
        description: 'Get quarterly and annual EPS earnings history and estimates for a stock ticker',
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
        name: 'get_income_statement',
        description: 'Get annual and quarterly income statement data — revenue, gross profit, EBITDA, net income for a stock',
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
        name: 'get_balance_sheet',
        description: 'Get annual and quarterly balance sheet data — total assets, liabilities, equity, cash, and debt for a stock',
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
        name: 'get_cash_flow',
        description: 'Get annual and quarterly cash flow statement data — operating, investing, and financing cash flows for a stock',
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
      // ── Forex (FX) ─────────────────────────────────────────────────────────
      {
        name: 'get_fx_rate',
        description: 'Get the current real-time exchange rate between two currencies (e.g. USD to EUR)',
        inputSchema: {
          type: 'object',
          properties: {
            from_currency: {
              type: 'string',
              description: 'Source currency code (e.g. USD, EUR, GBP, JPY)',
            },
            to_currency: {
              type: 'string',
              description: 'Target currency code (e.g. EUR, JPY, GBP)',
            },
          },
          required: ['from_currency', 'to_currency'],
        },
      },
      {
        name: 'get_fx_daily',
        description: 'Get daily OHLCV time series for a forex currency pair (e.g. EUR/USD) with up to 20 years of history',
        inputSchema: {
          type: 'object',
          properties: {
            from_symbol: {
              type: 'string',
              description: 'Base currency code (e.g. EUR)',
            },
            to_symbol: {
              type: 'string',
              description: 'Quote currency code (e.g. USD)',
            },
            outputsize: {
              type: 'string',
              description: 'Data size: compact (latest 100 trading days) or full (20+ years, default: compact)',
            },
          },
          required: ['from_symbol', 'to_symbol'],
        },
      },
      {
        name: 'get_fx_intraday',
        description: 'Get intraday OHLCV time series for a forex currency pair at 1, 5, 15, 30, or 60 minute intervals',
        inputSchema: {
          type: 'object',
          properties: {
            from_symbol: {
              type: 'string',
              description: 'Base currency code (e.g. EUR)',
            },
            to_symbol: {
              type: 'string',
              description: 'Quote currency code (e.g. USD)',
            },
            interval: {
              type: 'string',
              description: 'Time interval: 1min, 5min, 15min, 30min, or 60min (default: 5min)',
            },
            outputsize: {
              type: 'string',
              description: 'Data size: compact (latest 100 data points) or full (default: compact)',
            },
          },
          required: ['from_symbol', 'to_symbol'],
        },
      },
      // ── Cryptocurrency ─────────────────────────────────────────────────────
      {
        name: 'get_crypto_exchange_rate',
        description: 'Get the current real-time exchange rate for a cryptocurrency (e.g. BTC to USD)',
        inputSchema: {
          type: 'object',
          properties: {
            from_currency: {
              type: 'string',
              description: 'Cryptocurrency symbol (e.g. BTC, ETH, SOL)',
            },
            to_currency: {
              type: 'string',
              description: 'Target fiat or crypto currency (e.g. USD, EUR, BTC)',
            },
          },
          required: ['from_currency', 'to_currency'],
        },
      },
      {
        name: 'get_crypto_daily',
        description: 'Get daily OHLCV time series for a cryptocurrency in a target currency (e.g. BTC/USD daily history)',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Cryptocurrency symbol (e.g. BTC, ETH)',
            },
            market: {
              type: 'string',
              description: 'Target market/currency (e.g. USD, EUR, CNY)',
            },
          },
          required: ['symbol', 'market'],
        },
      },
      // ── Technical Indicators ───────────────────────────────────────────────
      {
        name: 'get_rsi',
        description: 'Get the Relative Strength Index (RSI) technical indicator for a stock or currency pair',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Ticker symbol (e.g. AAPL, MSFT)',
            },
            interval: {
              type: 'string',
              description: 'Time interval: 1min, 5min, 15min, 30min, 60min, daily, weekly, monthly (default: daily)',
            },
            time_period: {
              type: 'number',
              description: 'Number of data points used to calculate RSI (default: 14)',
            },
            series_type: {
              type: 'string',
              description: 'Price type to use: close, open, high, low (default: close)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_macd',
        description: 'Get the Moving Average Convergence Divergence (MACD) indicator — MACD line, signal line, and histogram',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Ticker symbol (e.g. AAPL)',
            },
            interval: {
              type: 'string',
              description: 'Time interval: 1min, 5min, 15min, 30min, 60min, daily, weekly, monthly (default: daily)',
            },
            series_type: {
              type: 'string',
              description: 'Price type to use: close, open, high, low (default: close)',
            },
            fastperiod: {
              type: 'number',
              description: 'Fast EMA period (default: 12)',
            },
            slowperiod: {
              type: 'number',
              description: 'Slow EMA period (default: 26)',
            },
            signalperiod: {
              type: 'number',
              description: 'Signal line period (default: 9)',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_sma',
        description: 'Get the Simple Moving Average (SMA) for a stock — commonly used for trend analysis',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Ticker symbol (e.g. AAPL)',
            },
            interval: {
              type: 'string',
              description: 'Time interval: 1min, 5min, 15min, 30min, 60min, daily, weekly, monthly (default: daily)',
            },
            time_period: {
              type: 'number',
              description: 'Number of data points used to calculate SMA (e.g. 20 for 20-day SMA, default: 20)',
            },
            series_type: {
              type: 'string',
              description: 'Price type to use: close, open, high, low (default: close)',
            },
          },
          required: ['symbol'],
        },
      },
      // ── Market Status ──────────────────────────────────────────────────────
      {
        name: 'get_market_status',
        description: 'Get the current open/closed status of major global stock exchanges (US, UK, EU, Asia, etc.)',
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
        case 'get_stock_quote':         return this.getStockQuote(args);
        case 'get_intraday_series':     return this.getIntradaySeries(args);
        case 'get_daily_series':        return this.getDailySeries(args);
        case 'get_weekly_series':       return this.getWeeklySeries(args);
        case 'get_monthly_series':      return this.getMonthlySeries(args);
        case 'get_company_overview':    return this.getCompanyOverview(args);
        case 'get_earnings':            return this.getEarnings(args);
        case 'get_income_statement':    return this.getIncomeStatement(args);
        case 'get_balance_sheet':       return this.getBalanceSheet(args);
        case 'get_cash_flow':           return this.getCashFlow(args);
        case 'get_fx_rate':             return this.getFxRate(args);
        case 'get_fx_daily':            return this.getFxDaily(args);
        case 'get_fx_intraday':         return this.getFxIntraday(args);
        case 'get_crypto_exchange_rate':return this.getCryptoExchangeRate(args);
        case 'get_crypto_daily':        return this.getCryptoDaily(args);
        case 'get_rsi':                 return this.getRsi(args);
        case 'get_macd':                return this.getMacd(args);
        case 'get_sma':                 return this.getSma(args);
        case 'get_market_status':       return this.getMarketStatus();
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

  private async query(params: Record<string, string>): Promise<ToolResult> {
    const qs = new URLSearchParams({ ...params, apikey: this.apiKey }).toString();
    const response = await this.fetchWithRetry(`${this.baseUrl}?${qs}`, {});
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as Record<string, unknown>;
    // Alpha Vantage returns errors in the body with a "Note" or "Information" key
    if (data['Note']) {
      return {
        content: [{ type: 'text', text: `Alpha Vantage rate limit: ${data['Note']}` }],
        isError: true,
      };
    }
    if (data['Information']) {
      return {
        content: [{ type: 'text', text: `Alpha Vantage info: ${data['Information']}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Equity methods ─────────────────────────────────────────────────────────

  private async getStockQuote(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    return this.query({ function: 'GLOBAL_QUOTE', symbol: args.symbol as string });
  }

  private async getIntradaySeries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const params: Record<string, string> = {
      function: 'TIME_SERIES_INTRADAY',
      symbol: args.symbol as string,
      interval: (args.interval as string) ?? '5min',
      outputsize: (args.outputsize as string) ?? 'compact',
    };
    if (args.month) params.month = args.month as string;
    return this.query(params);
  }

  private async getDailySeries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const fn = (args.adjusted as boolean) === false ? 'TIME_SERIES_DAILY' : 'TIME_SERIES_DAILY_ADJUSTED';
    return this.query({
      function: fn,
      symbol: args.symbol as string,
      outputsize: (args.outputsize as string) ?? 'compact',
    });
  }

  private async getWeeklySeries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const fn = (args.adjusted as boolean) === false ? 'TIME_SERIES_WEEKLY' : 'TIME_SERIES_WEEKLY_ADJUSTED';
    return this.query({ function: fn, symbol: args.symbol as string });
  }

  private async getMonthlySeries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const fn = (args.adjusted as boolean) === false ? 'TIME_SERIES_MONTHLY' : 'TIME_SERIES_MONTHLY_ADJUSTED';
    return this.query({ function: fn, symbol: args.symbol as string });
  }

  // ── Fundamental methods ────────────────────────────────────────────────────

  private async getCompanyOverview(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    return this.query({ function: 'OVERVIEW', symbol: args.symbol as string });
  }

  private async getEarnings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    return this.query({ function: 'EARNINGS', symbol: args.symbol as string });
  }

  private async getIncomeStatement(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    return this.query({ function: 'INCOME_STATEMENT', symbol: args.symbol as string });
  }

  private async getBalanceSheet(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    return this.query({ function: 'BALANCE_SHEET', symbol: args.symbol as string });
  }

  private async getCashFlow(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    return this.query({ function: 'CASH_FLOW', symbol: args.symbol as string });
  }

  // ── Forex methods ──────────────────────────────────────────────────────────

  private async getFxRate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from_currency || !args.to_currency) {
      return { content: [{ type: 'text', text: 'from_currency and to_currency are required' }], isError: true };
    }
    return this.query({
      function: 'CURRENCY_EXCHANGE_RATE',
      from_currency: args.from_currency as string,
      to_currency: args.to_currency as string,
    });
  }

  private async getFxDaily(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from_symbol || !args.to_symbol) {
      return { content: [{ type: 'text', text: 'from_symbol and to_symbol are required' }], isError: true };
    }
    return this.query({
      function: 'FX_DAILY',
      from_symbol: args.from_symbol as string,
      to_symbol: args.to_symbol as string,
      outputsize: (args.outputsize as string) ?? 'compact',
    });
  }

  private async getFxIntraday(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from_symbol || !args.to_symbol) {
      return { content: [{ type: 'text', text: 'from_symbol and to_symbol are required' }], isError: true };
    }
    return this.query({
      function: 'FX_INTRADAY',
      from_symbol: args.from_symbol as string,
      to_symbol: args.to_symbol as string,
      interval: (args.interval as string) ?? '5min',
      outputsize: (args.outputsize as string) ?? 'compact',
    });
  }

  // ── Crypto methods ─────────────────────────────────────────────────────────

  private async getCryptoExchangeRate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from_currency || !args.to_currency) {
      return { content: [{ type: 'text', text: 'from_currency and to_currency are required' }], isError: true };
    }
    return this.query({
      function: 'CURRENCY_EXCHANGE_RATE',
      from_currency: args.from_currency as string,
      to_currency: args.to_currency as string,
    });
  }

  private async getCryptoDaily(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol || !args.market) {
      return { content: [{ type: 'text', text: 'symbol and market are required' }], isError: true };
    }
    return this.query({
      function: 'DIGITAL_CURRENCY_DAILY',
      symbol: args.symbol as string,
      market: args.market as string,
    });
  }

  // ── Technical indicator methods ────────────────────────────────────────────

  private async getRsi(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    return this.query({
      function: 'RSI',
      symbol: args.symbol as string,
      interval: (args.interval as string) ?? 'daily',
      time_period: String((args.time_period as number) ?? 14),
      series_type: (args.series_type as string) ?? 'close',
    });
  }

  private async getMacd(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    const params: Record<string, string> = {
      function: 'MACD',
      symbol: args.symbol as string,
      interval: (args.interval as string) ?? 'daily',
      series_type: (args.series_type as string) ?? 'close',
    };
    if (args.fastperiod)   params.fastperiod   = String(args.fastperiod);
    if (args.slowperiod)   params.slowperiod   = String(args.slowperiod);
    if (args.signalperiod) params.signalperiod = String(args.signalperiod);
    return this.query(params);
  }

  private async getSma(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol) return { content: [{ type: 'text', text: 'symbol is required' }], isError: true };
    return this.query({
      function: 'SMA',
      symbol: args.symbol as string,
      interval: (args.interval as string) ?? 'daily',
      time_period: String((args.time_period as number) ?? 20),
      series_type: (args.series_type as string) ?? 'close',
    });
  }

  // ── Market status ──────────────────────────────────────────────────────────

  private async getMarketStatus(): Promise<ToolResult> {
    return this.query({ function: 'MARKET_STATUS' });
  }
}
