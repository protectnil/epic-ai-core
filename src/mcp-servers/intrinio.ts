/**
 * Intrinio MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Intrinio MCP server was found on GitHub or npm.
//
// Base URL: https://api-v2.intrinio.com
// Auth: Authorization: Bearer {apiKey} header (preferred), or ?api_key={apiKey} query param.
//       Public key authentication also supported via X-Authorization-Public-Key header for
//       client-side/untrusted environments.
// Docs: https://docs.intrinio.com/documentation/api_v2/getting_started
// Rate limits: 429 status on limit exceeded. Daily request limits vary by subscription plan and
//              data feed. Limits reset at midnight Eastern time.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IntrinioConfig {
  apiKey: string;
  baseUrl?: string;
}

export class IntrinioMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: IntrinioConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api-v2.intrinio.com';
  }

  static catalog() {
    return {
      name: 'intrinio',
      displayName: 'Intrinio',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'intrinio', 'stock', 'financial data', 'fundamentals', 'securities', 'prices',
        'earnings', 'dividends', 'options', 'esg', 'economic', 'forex', 'crypto',
        'institutional', 'insider', 'filing', 'news', 'market data', 'technical', 'sma', 'rsi',
      ],
      toolNames: [
        'get_security', 'search_securities', 'get_security_price', 'get_security_prices',
        'get_company', 'search_companies', 'get_company_financials', 'get_company_news',
        'get_standardized_financials', 'get_income_statement', 'get_balance_sheet', 'get_cash_flow_statement',
        'get_earnings', 'get_dividends', 'get_insider_transactions', 'get_institutional_ownership',
        'get_options_chain', 'get_options_stats', 'get_sma', 'get_rsi',
        'get_economic_index', 'search_economic_indices', 'get_data_tags',
      ],
      description: 'Intrinio financial data feeds: securities, company fundamentals, prices, earnings, dividends, options, insider/institutional data, technical indicators, and economic indices.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_security',
        description: 'Get detailed information for a security by ticker or Intrinio ID including exchange, type, and identifiers',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol, CUSIP, FIGI, ISIN, or Intrinio security ID (e.g. AAPL)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'search_securities',
        description: 'Search for securities by name or ticker across all supported exchanges and asset types',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Company name or ticker fragment to search (e.g. Apple, AAPL)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_security_price',
        description: 'Get the latest real-time or end-of-day price for a security including OHLCV and adjusted close',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio security ID (e.g. AAPL)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_security_prices',
        description: 'Get historical daily price data for a security over a date range with OHLCV and adjusted prices',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio security ID (e.g. AAPL)',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (optional)',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (optional — defaults to today)',
            },
            frequency: {
              type: 'string',
              description: 'Price frequency: daily, weekly, monthly, quarterly, yearly (default: daily)',
            },
            page_size: {
              type: 'number',
              description: 'Number of price records per page (default: 100, max: 10000)',
            },
            next_page: {
              type: 'string',
              description: 'Pagination token from previous response (optional)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_company',
        description: 'Get company profile data including SIC code, CIK, address, employees, and fiscal year end',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol, CIK, or Intrinio company ID (e.g. AAPL)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'search_companies',
        description: 'Search for companies by name or keyword across all Intrinio-covered companies',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Company name or keyword to search (e.g. Apple)',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25, max: 100)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_company_financials',
        description: 'Get all reported financial statements for a company including income, balance sheet, and cash flow filings',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio company ID (e.g. AAPL)',
            },
            report_type: {
              type: 'string',
              description: 'Filing type: annual (10-K) or quarterly (10-Q, default: quarterly)',
            },
            page_size: {
              type: 'number',
              description: 'Number of filings per page (default: 10)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_company_news',
        description: 'Get recent news articles for a company from Intrinio news feeds',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio company ID (e.g. AAPL)',
            },
            page_size: {
              type: 'number',
              description: 'Number of news articles per page (default: 10, max: 100)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_standardized_financials',
        description: 'Get standardized (as-reported, normalized) financial data for a filing using Intrinio data tags',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Intrinio financial statement (filing) ID',
            },
            page_size: {
              type: 'number',
              description: 'Number of line items per page (default: 100)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_income_statement',
        description: 'Get income statement data for a company including revenue, operating income, net income, and EPS',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio company ID (e.g. AAPL)',
            },
            type: {
              type: 'string',
              description: 'Statement type: reported or standardized (default: reported)',
            },
            period: {
              type: 'string',
              description: 'Reporting period: FY (annual) or Q1–Q4 (quarterly, optional)',
            },
            fiscal_year: {
              type: 'number',
              description: 'Fiscal year (e.g. 2024, optional — returns latest if omitted)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (default: 10)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_balance_sheet',
        description: 'Get balance sheet data for a company including assets, liabilities, and shareholders equity',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio company ID (e.g. AAPL)',
            },
            type: {
              type: 'string',
              description: 'Statement type: reported or standardized (default: reported)',
            },
            period: {
              type: 'string',
              description: 'Reporting period: FY or Q1–Q4 (optional)',
            },
            fiscal_year: {
              type: 'number',
              description: 'Fiscal year (optional — returns latest if omitted)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (default: 10)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_cash_flow_statement',
        description: 'Get cash flow statement data including operating, investing, and financing activities',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio company ID (e.g. AAPL)',
            },
            type: {
              type: 'string',
              description: 'Statement type: reported or standardized (default: reported)',
            },
            period: {
              type: 'string',
              description: 'Reporting period: FY or Q1–Q4 (optional)',
            },
            fiscal_year: {
              type: 'number',
              description: 'Fiscal year (optional — returns latest if omitted)',
            },
            page_size: {
              type: 'number',
              description: 'Number of records per page (default: 10)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_earnings',
        description: 'Get historical EPS surprise results (Zacks) including actual, estimated, surprise, and announcement dates for a security',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio security ID (e.g. AAPL)',
            },
            page_size: {
              type: 'number',
              description: 'Number of quarterly earnings periods to return (default: 10)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_dividends',
        description: 'Get historical dividend adjustments for a security including ex-dates, dividend amounts, and split factors',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio security ID (e.g. AAPL)',
            },
            page_size: {
              type: 'number',
              description: 'Number of dividend records per page (default: 100)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_insider_transactions',
        description: 'Get SEC Form 4 insider transaction filings for a company including buys, sells, and amounts',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio company ID (e.g. AAPL)',
            },
            start_date: {
              type: 'string',
              description: 'Start date filter in YYYY-MM-DD format (optional)',
            },
            end_date: {
              type: 'string',
              description: 'End date filter in YYYY-MM-DD format (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of transactions per page (default: 100)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_institutional_ownership',
        description: 'Get institutional ownership data for a security from 13-F filings including top holders and percent held',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio security ID (e.g. AAPL)',
            },
            page_size: {
              type: 'number',
              description: 'Number of institutional holders per page (default: 100)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_options_chain',
        description: 'Get the full options chain for a security including calls and puts at all strikes for an expiration date',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              description: 'Equity ticker symbol (e.g. AAPL)',
            },
            expiration: {
              type: 'string',
              description: 'Expiration date in YYYY-MM-DD format',
            },
            strike: {
              type: 'number',
              description: 'Filter by specific strike price (optional)',
            },
            type: {
              type: 'string',
              description: 'Filter by option type: call or put (optional — returns both if omitted)',
            },
          },
          required: ['symbol', 'expiration'],
        },
      },
      {
        name: 'get_options_stats',
        description: 'Get realtime options market stats including put/call ratio, open interest, and implied volatility for a security',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol (e.g. AAPL)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_sma',
        description: 'Get Simple Moving Average (SMA) technical indicator values for a security over a specified period',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio security ID (e.g. AAPL)',
            },
            period: {
              type: 'number',
              description: 'SMA period in trading days (e.g. 20, 50, 200 — default: 20)',
            },
            price_key: {
              type: 'string',
              description: 'Price field to use: open, high, low, close, volume (default: close)',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of indicator values per page (default: 100)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_rsi',
        description: 'Get Relative Strength Index (RSI) technical indicator values for a security over a specified period',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Ticker symbol or Intrinio security ID (e.g. AAPL)',
            },
            period: {
              type: 'number',
              description: 'RSI period in trading days (default: 14)',
            },
            price_key: {
              type: 'string',
              description: 'Price field to use: open, high, low, close (default: close)',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of indicator values per page (default: 100)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_economic_index',
        description: 'Get historical data for an economic index such as GDP, unemployment rate, or CPI by Intrinio index ID',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Intrinio economic index ID (e.g. $GDP for US GDP, $UNRATE for unemployment rate)',
            },
            start_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format (optional)',
            },
            end_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of data points per page (default: 100)',
            },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'search_economic_indices',
        description: 'Search for economic indices available on Intrinio by name or keyword',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term for economic index name (e.g. "unemployment", "consumer price")',
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 25)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_data_tags',
        description: 'Get available Intrinio data tags for standardized financial statements — used to identify field names for get_standardized_financials',
        inputSchema: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: 'Filter by tag name or partial match (optional)',
            },
            statement_code: {
              type: 'string',
              description: 'Filter by statement: income_statement, balance_sheet_statement, cash_flow_statement (optional)',
            },
            type: {
              type: 'string',
              description: 'Filter by data type: dimension, factor, industry, metric (optional)',
            },
            page_size: {
              type: 'number',
              description: 'Number of tags per page (default: 100)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_security':
          return this.getSecurity(args);
        case 'search_securities':
          return this.searchSecurities(args);
        case 'get_security_price':
          return this.getSecurityPrice(args);
        case 'get_security_prices':
          return this.getSecurityPrices(args);
        case 'get_company':
          return this.getCompany(args);
        case 'search_companies':
          return this.searchCompanies(args);
        case 'get_company_financials':
          return this.getCompanyFinancials(args);
        case 'get_company_news':
          return this.getCompanyNews(args);
        case 'get_standardized_financials':
          return this.getStandardizedFinancials(args);
        case 'get_income_statement':
          return this.getFinancialStatement(args, 'income_statement');
        case 'get_balance_sheet':
          return this.getFinancialStatement(args, 'balance_sheet_statement');
        case 'get_cash_flow_statement':
          return this.getFinancialStatement(args, 'cash_flow_statement');
        case 'get_earnings':
          return this.getEarnings(args);
        case 'get_dividends':
          return this.getDividends(args);
        case 'get_insider_transactions':
          return this.getInsiderTransactions(args);
        case 'get_institutional_ownership':
          return this.getInstitutionalOwnership(args);
        case 'get_options_chain':
          return this.getOptionsChain(args);
        case 'get_options_stats':
          return this.getOptionsStats(args);
        case 'get_sma':
          return this.getTechnicalIndicator(args, 'sma');
        case 'get_rsi':
          return this.getTechnicalIndicator(args, 'rsi');
        case 'get_economic_index':
          return this.getEconomicIndex(args);
        case 'search_economic_indices':
          return this.searchEconomicIndices(args);
        case 'get_data_tags':
          return this.getDataTags(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
    };
  }

  private async intrinioGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errBody || response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSecurity(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    return this.intrinioGet(`/securities/${encodeURIComponent(args.identifier as string)}`);
  }

  private async searchSecurities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.intrinioGet('/securities/search', {
      query: args.query as string,
      page_size: String((args.page_size as number) || 25),
    });
  }

  private async getSecurityPrice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    return this.intrinioGet(`/securities/${encodeURIComponent(args.identifier as string)}/prices/realtime`);
  }

  private async getSecurityPrices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    const params: Record<string, string> = {
      frequency: (args.frequency as string) || 'daily',
      page_size: String((args.page_size as number) || 100),
    };
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    if (args.next_page) params.next_page = args.next_page as string;
    return this.intrinioGet(`/securities/${encodeURIComponent(args.identifier as string)}/prices`, params);
  }

  private async getCompany(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    return this.intrinioGet(`/companies/${encodeURIComponent(args.identifier as string)}`);
  }

  private async searchCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.intrinioGet('/companies/search', {
      query: args.query as string,
      page_size: String((args.page_size as number) || 25),
    });
  }

  private async getCompanyFinancials(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    const params: Record<string, string> = {
      report_type: (args.report_type as string) || 'quarterly',
      page_size: String((args.page_size as number) || 10),
    };
    return this.intrinioGet(`/companies/${encodeURIComponent(args.identifier as string)}/fundamentals`, params);
  }

  private async getCompanyNews(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    return this.intrinioGet(`/companies/${encodeURIComponent(args.identifier as string)}/news`, {
      page_size: String((args.page_size as number) || 10),
    });
  }

  private async getStandardizedFinancials(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.intrinioGet(`/fundamentals/${encodeURIComponent(args.id as string)}/standardized_financials`, {
      page_size: String((args.page_size as number) || 100),
    });
  }

  private async getFinancialStatement(args: Record<string, unknown>, statementCode: string): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    const params: Record<string, string> = {
      statement_code: statementCode,
      type: (args.type as string) || 'reported',
      page_size: String((args.page_size as number) || 10),
    };
    if (args.period) params.fiscal_period = args.period as string;
    if (args.fiscal_year) params.fiscal_year = String(args.fiscal_year);
    return this.intrinioGet(`/companies/${encodeURIComponent(args.identifier as string)}/fundamentals`, params);
  }

  private async getEarnings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    return this.intrinioGet(`/securities/${encodeURIComponent(args.identifier as string)}/zacks/eps_surprises`, {
      page_size: String((args.page_size as number) || 10),
    });
  }

  private async getDividends(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    return this.intrinioGet(`/securities/${encodeURIComponent(args.identifier as string)}/prices/adjustments/dividends`, {
      page_size: String((args.page_size as number) || 100),
    });
  }

  private async getInsiderTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    const params: Record<string, string> = {
      page_size: String((args.page_size as number) || 100),
    };
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    return this.intrinioGet(`/companies/${encodeURIComponent(args.identifier as string)}/insider_transaction_filings`, params);
  }

  private async getInstitutionalOwnership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    return this.intrinioGet(`/securities/${encodeURIComponent(args.identifier as string)}/institutional_ownership`, {
      page_size: String((args.page_size as number) || 100),
    });
  }

  private async getOptionsChain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.symbol || !args.expiration) {
      return { content: [{ type: 'text', text: 'symbol and expiration are required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.strike) params.strike = String(args.strike);
    if (args.type) params.type = args.type as string;
    return this.intrinioGet(
      `/options/chain/${encodeURIComponent(args.symbol as string)}/${encodeURIComponent(args.expiration as string)}/realtime`,
      params,
    );
  }

  private async getOptionsStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    return this.intrinioGet(`/options/prices/${encodeURIComponent(args.identifier as string)}/realtime/stats`);
  }

  private async getTechnicalIndicator(args: Record<string, unknown>, indicator: string): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    const params: Record<string, string> = {
      period: String((args.period as number) || (indicator === 'rsi' ? 14 : 20)),
      price_key: (args.price_key as string) || 'close',
      page_size: String((args.page_size as number) || 100),
    };
    if (args.start_date) params.start_date = args.start_date as string;
    return this.intrinioGet(`/securities/${encodeURIComponent(args.identifier as string)}/prices/technicals/${indicator}`, params);
  }

  private async getEconomicIndex(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.identifier) return { content: [{ type: 'text', text: 'identifier is required' }], isError: true };
    const params: Record<string, string> = {
      page_size: String((args.page_size as number) || 100),
    };
    if (args.start_date) params.start_date = args.start_date as string;
    if (args.end_date) params.end_date = args.end_date as string;
    return this.intrinioGet(`/indices/economic/${encodeURIComponent(args.identifier as string)}/historical_data/level`, params);
  }

  private async searchEconomicIndices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.intrinioGet('/indices/economic/search', {
      query: args.query as string,
      page_size: String((args.page_size as number) || 25),
    });
  }

  private async getDataTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      page_size: String((args.page_size as number) || 100),
    };
    if (args.tag) params.tag = args.tag as string;
    if (args.statement_code) params.statement_code = args.statement_code as string;
    if (args.type) params.type = args.type as string;
    return this.intrinioGet('/data_tags', params);
  }
}
