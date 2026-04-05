/**
 * Morningstar MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/Morningstar/morningstar-mcp-server — ARCHIVED 2025-09-16 (read-only, no new commits)
//   Note: Development moved outside that repo per the repo notice. A newer Morningstar MCP Server is referenced at
//   https://developer.morningstar.com/direct-web-services/documentation/direct-web-services/morningstar-mcp-server/
//   and at https://www.morningstar.com/business/products/direct-ai-solutions (vendor-hosted, OAuth2 auth).
//   The newer hosted MCP server has no public GitHub repo and tool count is unverified. The archived repo exposed
//   only 2 tools (Morningstar Datapoint Tool, Morningstar Articles Tool) — fails criteria 3 (<10 tools).
// Our adapter covers: 16 tools (securities, portfolio analysis, fund holdings, screening, research).
// Vendor MCP covers: 2 tools verified (archived repo) — newer hosted MCP tool count unverified.
// Recommendation: use-rest-api — the only verifiable MCP (GitHub archived repo) fails criteria 2 (abandoned
//   2025-09-16, >6 months ago) and criteria 3 (<10 tools). The newer hosted MCP has no public tool inventory.
//   This REST adapter is the authoritative integration with full 16-tool coverage.
//
// Base URL: https://www.us-api.morningstar.com (Americas); https://emea-api.morningstar.com (EMEA)
// Auth: OAuth2 username/password — POST /token/oauth returns a Bearer token valid 60 minutes
// Docs: https://developer.morningstar.com/direct-web-services/documentation/
// Rate limits: Not publicly documented — varies by entitlement tier; tokens reusable within 60-min window

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MorningstarConfig {
  username: string;
  password: string;
  region?: 'us' | 'emea';
  baseUrl?: string;
}

export class MorningstarMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: MorningstarConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    } else {
      this.baseUrl = config.region === 'emea'
        ? 'https://emea-api.morningstar.com'
        : 'https://www.us-api.morningstar.com';
    }
  }

  static catalog() {
    return {
      name: 'morningstar',
      displayName: 'Morningstar',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'morningstar', 'investment', 'fund', 'etf', 'stock', 'equity', 'portfolio',
        'performance', 'rating', 'star rating', 'fair value', 'economic moat',
        'screening', 'research', 'analyst', 'holdings', 'nav', 'market cap',
        'asset allocation', 'risk score', 'expense ratio',
      ],
      toolNames: [
        'get_security_datapoints', 'search_securities', 'get_security_details',
        'get_fund_holdings', 'get_fund_performance', 'get_fund_fees',
        'screen_securities', 'get_market_overview',
        'get_portfolio_xray', 'get_portfolio_performance', 'get_portfolio_risk',
        'get_analyst_report', 'get_fair_value_estimate',
        'list_categories', 'get_category_performance', 'get_benchmark_performance',
      ],
      description: 'Morningstar Direct Web Services: security datapoints, fund holdings, portfolio X-Ray, performance, screening, and analyst research for 200,000+ global investments.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_security_datapoints',
        description: 'Fetch one or more datapoints (market cap, star rating, fair value, NAV, EPS, moat) for a list of securities by identifier',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Pipe-separated security identifiers (e.g. AAPL|MSFT|F0GBR050DD) — supports ticker, ISIN, or Morningstar ID',
            },
            datapoints: {
              type: 'string',
              description: 'Pipe-separated datapoint keys to retrieve (e.g. starRatingM255|fairValue|marketCap|nav|expenseRatio|moatM255|epsM255)',
            },
          },
          required: ['ids', 'datapoints'],
        },
      },
      {
        name: 'search_securities',
        description: 'Search for securities by name or ticker across stocks, mutual funds, ETFs, and other asset types',
        inputSchema: {
          type: 'object',
          properties: {
            term: {
              type: 'string',
              description: 'Search term: security name, ticker symbol, or partial name',
            },
            asset_class: {
              type: 'string',
              description: 'Filter by asset class: stock, fund, etf, index, category (default: all)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10, max: 50)',
            },
          },
          required: ['term'],
        },
      },
      {
        name: 'get_security_details',
        description: 'Get comprehensive profile data for a security including name, category, currency, domicile, and key identifiers',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Morningstar security ID, ticker symbol, or ISIN',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_fund_holdings',
        description: 'Retrieve top holdings for a mutual fund or ETF with position weights and security details',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Morningstar fund ID or ISIN for an open-end fund or ETF',
            },
            top_n: {
              type: 'number',
              description: 'Number of top holdings to return (default: 25, max: 100)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_fund_performance',
        description: 'Get trailing and calendar-year performance returns for a fund across multiple time periods',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Morningstar fund ID or ISIN',
            },
            currency: {
              type: 'string',
              description: 'Return currency ISO code (e.g. USD, EUR, GBP — default: fund base currency)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_fund_fees',
        description: 'Get fee structure for a mutual fund or ETF including expense ratio, sales loads, and transaction fees',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Morningstar fund ID or ISIN',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'screen_securities',
        description: 'Screen securities using Morningstar quantitative criteria — filter by star rating, moat, category, market cap, and expense ratio',
        inputSchema: {
          type: 'object',
          properties: {
            universe: {
              type: 'string',
              description: 'Security universe to screen: stock, fund, etf (default: stock)',
            },
            star_rating_min: {
              type: 'number',
              description: 'Minimum Morningstar star rating (1-5)',
            },
            moat: {
              type: 'string',
              description: 'Economic moat filter: wide, narrow, none',
            },
            category: {
              type: 'string',
              description: 'Morningstar category name or ID (e.g. Large Blend, Short-Term Bond)',
            },
            market_cap_min: {
              type: 'number',
              description: 'Minimum market cap in USD millions',
            },
            expense_ratio_max: {
              type: 'number',
              description: 'Maximum expense ratio percentage (e.g. 0.5 for 0.50%)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of screened results (default: 25, max: 100)',
            },
          },
        },
      },
      {
        name: 'get_market_overview',
        description: 'Get a snapshot of current market conditions including index performance and sector returns',
        inputSchema: {
          type: 'object',
          properties: {
            region: {
              type: 'string',
              description: 'Market region: US, EMEA, APAC (default: US)',
            },
          },
        },
      },
      {
        name: 'get_portfolio_xray',
        description: 'Run a Morningstar Portfolio X-Ray on a list of holdings to analyze asset allocation, style box, sector exposure, and overlap',
        inputSchema: {
          type: 'object',
          properties: {
            holdings: {
              type: 'string',
              description: 'JSON array of holdings: [{"id":"AAPL","weight":0.25},{"id":"F0GBR050DD","weight":0.75}] — weights as decimals summing to 1.0',
            },
            currency: {
              type: 'string',
              description: 'Portfolio currency for analysis (default: USD)',
            },
          },
          required: ['holdings'],
        },
      },
      {
        name: 'get_portfolio_performance',
        description: 'Calculate historical performance for a portfolio of holdings over trailing periods (1M, 3M, 1Y, 3Y, 5Y)',
        inputSchema: {
          type: 'object',
          properties: {
            holdings: {
              type: 'string',
              description: 'JSON array of holdings: [{"id":"AAPL","weight":0.5},{"id":"MSFT","weight":0.5}]',
            },
            currency: {
              type: 'string',
              description: 'Return currency (default: USD)',
            },
          },
          required: ['holdings'],
        },
      },
      {
        name: 'get_portfolio_risk',
        description: 'Calculate risk metrics (standard deviation, Sharpe ratio, beta, alpha) for a portfolio of holdings',
        inputSchema: {
          type: 'object',
          properties: {
            holdings: {
              type: 'string',
              description: 'JSON array of holdings: [{"id":"AAPL","weight":0.5},{"id":"MSFT","weight":0.5}]',
            },
            benchmark_id: {
              type: 'string',
              description: 'Benchmark security ID for alpha/beta calculation (default: Morningstar US Market Index)',
            },
            currency: {
              type: 'string',
              description: 'Currency for calculations (default: USD)',
            },
          },
          required: ['holdings'],
        },
      },
      {
        name: 'get_analyst_report',
        description: 'Retrieve Morningstar analyst research text for a stock including investment thesis, bull/bear cases, and uncertainty rating',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Morningstar security ID or ticker for the stock',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_fair_value_estimate',
        description: 'Get the Morningstar analyst fair value estimate and price/fair value ratio for a stock',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Morningstar security ID or ticker',
            },
            currency: {
              type: 'string',
              description: 'Currency for the fair value output (default: security native currency)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_categories',
        description: 'List Morningstar investment categories (e.g. Large Blend, Short-Term Bond) for a given asset class',
        inputSchema: {
          type: 'object',
          properties: {
            asset_class: {
              type: 'string',
              description: 'Asset class: stock, fund, etf (default: fund)',
            },
          },
        },
      },
      {
        name: 'get_category_performance',
        description: 'Get average performance returns for all funds or ETFs within a Morningstar category',
        inputSchema: {
          type: 'object',
          properties: {
            category_id: {
              type: 'string',
              description: 'Morningstar category ID (use list_categories to find IDs)',
            },
            currency: {
              type: 'string',
              description: 'Return currency (default: USD)',
            },
          },
          required: ['category_id'],
        },
      },
      {
        name: 'get_benchmark_performance',
        description: 'Get performance returns for a market benchmark or index over trailing periods',
        inputSchema: {
          type: 'object',
          properties: {
            benchmark_id: {
              type: 'string',
              description: 'Morningstar benchmark ID (e.g. XIUSA04GO for S&P 500)',
            },
            currency: {
              type: 'string',
              description: 'Return currency (default: USD)',
            },
          },
          required: ['benchmark_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_security_datapoints':
          return this.getSecurityDatapoints(args);
        case 'search_securities':
          return this.searchSecurities(args);
        case 'get_security_details':
          return this.getSecurityDetails(args);
        case 'get_fund_holdings':
          return this.getFundHoldings(args);
        case 'get_fund_performance':
          return this.getFundPerformance(args);
        case 'get_fund_fees':
          return this.getFundFees(args);
        case 'screen_securities':
          return this.screenSecurities(args);
        case 'get_market_overview':
          return this.getMarketOverview(args);
        case 'get_portfolio_xray':
          return this.getPortfolioXray(args);
        case 'get_portfolio_performance':
          return this.getPortfolioPerformance(args);
        case 'get_portfolio_risk':
          return this.getPortfolioRisk(args);
        case 'get_analyst_report':
          return this.getAnalystReport(args);
        case 'get_fair_value_estimate':
          return this.getFairValueEstimate(args);
        case 'list_categories':
          return this.listCategories(args);
        case 'get_category_performance':
          return this.getCategoryPerformance(args);
        case 'get_benchmark_performance':
          return this.getBenchmarkPerformance(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }

    const credentials = btoa(`${this.username}:${this.password}`);
    const response = await this.fetchWithRetry(`${this.baseUrl}/token/oauth`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Morningstar OAuth token request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async msGet(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params && Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}${qs}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Morningstar returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async msPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Morningstar returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSecurityDatapoints(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ids || !args.datapoints) return { content: [{ type: 'text', text: 'ids and datapoints are required' }], isError: true };
    const params: Record<string, string> = {
      ids: args.ids as string,
      datapoints: args.datapoints as string,
    };
    return this.msGet('direct/securities/datapoints', params);
  }

  private async searchSecurities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.term) return { content: [{ type: 'text', text: 'term is required' }], isError: true };
    const params: Record<string, string> = {
      term: args.term as string,
      limit: String((args.limit as number) || 10),
    };
    if (args.asset_class) params.assetClass = args.asset_class as string;
    return this.msGet('direct/securities/search', params);
  }

  private async getSecurityDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.msGet(`direct/securities/${encodeURIComponent(args.id as string)}`);
  }

  private async getFundHoldings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string> = {
      topN: String((args.top_n as number) || 25),
    };
    return this.msGet(`direct/securities/${encodeURIComponent(args.id as string)}/holdings`, params);
  }

  private async getFundPerformance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.currency) params.currency = args.currency as string;
    return this.msGet(`direct/securities/${encodeURIComponent(args.id as string)}/performance`, params);
  }

  private async getFundFees(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.msGet(`direct/securities/${encodeURIComponent(args.id as string)}/fees`);
  }

  private async screenSecurities(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      universe: (args.universe as string) || 'stock',
      limit: String((args.limit as number) || 25),
    };
    if (args.star_rating_min) params.starRatingMin = String(args.star_rating_min);
    if (args.moat) params.moat = args.moat as string;
    if (args.category) params.category = args.category as string;
    if (args.market_cap_min) params.marketCapMin = String(args.market_cap_min);
    if (args.expense_ratio_max) params.expenseRatioMax = String(args.expense_ratio_max);
    return this.msGet('direct/securities/screen', params);
  }

  private async getMarketOverview(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      region: (args.region as string) || 'US',
    };
    return this.msGet('direct/market/overview', params);
  }

  private async getPortfolioXray(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.holdings) return { content: [{ type: 'text', text: 'holdings is required' }], isError: true };
    let holdings: unknown;
    try { holdings = JSON.parse(args.holdings as string); } catch {
      return { content: [{ type: 'text', text: 'holdings must be a valid JSON array' }], isError: true };
    }
    const body: Record<string, unknown> = { holdings };
    if (args.currency) body.currency = args.currency;
    return this.msPost('direct/portfolio/xray', body);
  }

  private async getPortfolioPerformance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.holdings) return { content: [{ type: 'text', text: 'holdings is required' }], isError: true };
    let holdings: unknown;
    try { holdings = JSON.parse(args.holdings as string); } catch {
      return { content: [{ type: 'text', text: 'holdings must be a valid JSON array' }], isError: true };
    }
    const body: Record<string, unknown> = { holdings };
    if (args.currency) body.currency = args.currency;
    return this.msPost('direct/portfolio/performance', body);
  }

  private async getPortfolioRisk(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.holdings) return { content: [{ type: 'text', text: 'holdings is required' }], isError: true };
    let holdings: unknown;
    try { holdings = JSON.parse(args.holdings as string); } catch {
      return { content: [{ type: 'text', text: 'holdings must be a valid JSON array' }], isError: true };
    }
    const body: Record<string, unknown> = { holdings };
    if (args.benchmark_id) body.benchmarkId = args.benchmark_id;
    if (args.currency) body.currency = args.currency;
    return this.msPost('direct/portfolio/risk', body);
  }

  private async getAnalystReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.msGet(`direct/securities/${encodeURIComponent(args.id as string)}/analyst-report`);
  }

  private async getFairValueEstimate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.currency) params.currency = args.currency as string;
    return this.msGet(`direct/securities/${encodeURIComponent(args.id as string)}/fair-value`, params);
  }

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      assetClass: (args.asset_class as string) || 'fund',
    };
    return this.msGet('direct/categories', params);
  }

  private async getCategoryPerformance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.category_id) return { content: [{ type: 'text', text: 'category_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.currency) params.currency = args.currency as string;
    return this.msGet(`direct/categories/${encodeURIComponent(args.category_id as string)}/performance`, params);
  }

  private async getBenchmarkPerformance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.benchmark_id) return { content: [{ type: 'text', text: 'benchmark_id is required' }], isError: true };
    const params: Record<string, string> = {};
    if (args.currency) params.currency = args.currency as string;
    return this.msGet(`direct/benchmarks/${encodeURIComponent(args.benchmark_id as string)}/performance`, params);
  }
}
