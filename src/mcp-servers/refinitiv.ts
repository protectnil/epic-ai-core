/**
 * Refinitiv (LSEG) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: LSEG operates a managed/hosted MCP server (not a public open-source repo with enumerable tools).
//   LSEG announced their managed MCP server for Microsoft Copilot Studio in Oct 2025 (press.lseg.com).
//   No public GitHub repo or npm package with a documented tool list was found as of 2026-03-28.
//   The managed MCP is available to LSEG enterprise customers via Microsoft Copilot Studio integration only —
//   it is NOT independently deployable, does not meet criteria 1 (public repo) or 3 (tool count verifiable).
// Our adapter covers: 11 tools. Vendor MCP covers: unknown (not publicly enumerable).
// Recommendation: use-rest-api — no independently deployable official MCP with a verifiable tool list found.
//
// Base URL: https://api.refinitiv.com
// Auth: OAuth2 client credentials (v2) — POST https://api.refinitiv.com/auth/oauth2/v2/token
//   Access tokens expire in 5 minutes. Refresh tokens are not issued in v2 client credentials flow.
// Docs: https://developers.lseg.com/en/api-catalog/refinitiv-data-platform/refinitiv-data-platform-apis
// Rate limits: 5 req/s, 10,000 req/day; response volume 50 MB/min, 5 GB/day (Eikon/RDP tier)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface RefinitivConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class RefinitivMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: RefinitivConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.refinitiv.com';
  }

  static catalog() {
    return {
      name: 'refinitiv',
      displayName: 'Refinitiv (LSEG)',
      version: '1.0.0',
      category: 'finance',
      keywords: ['refinitiv', 'LSEG', 'Reuters', 'financial data', 'pricing', 'ESG', 'news', 'equities', 'bonds', 'RDP', 'Thomson Reuters'],
      toolNames: [
        'get_pricing_snapshot', 'get_historical_pricing',
        'search_securities', 'get_security_details',
        'get_esg_scores', 'get_esg_full',
        'search_news', 'get_news_story',
        'get_estimates', 'get_ownership',
        'get_fundamental_summary',
      ],
      description: 'Refinitiv (LSEG) financial data: equity pricing, ESG scores, news, analyst estimates, ownership data, and company fundamentals via Refinitiv Data Platform.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_pricing_snapshot',
        description: 'Get current real-time or delayed price snapshot for one or more instruments including bid, ask, last, and volume',
        inputSchema: {
          type: 'object',
          properties: {
            universe: { type: 'string', description: 'Comma-separated RIC codes for instruments (e.g. AAPL.O,MSFT.O,TSLA.O)' },
            fields: { type: 'string', description: 'Comma-separated fields to return (e.g. BID,ASK,TRDPRC_1,ACVOL_UNS — default: all basic fields)' },
          },
          required: ['universe'],
        },
      },
      {
        name: 'get_historical_pricing',
        description: 'Get historical OHLCV pricing data for an instrument over a date range with configurable interval',
        inputSchema: {
          type: 'object',
          properties: {
            universe: { type: 'string', description: 'RIC code for the instrument (e.g. AAPL.O)' },
            interval: { type: 'string', description: 'Data interval: P1D (daily), P7D (weekly), P1M (monthly), PT1H (hourly), PT1M (1-minute)' },
            start: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
            end: { type: 'string', description: 'End date in YYYY-MM-DD format (default: today)' },
            fields: { type: 'string', description: 'Fields to return (e.g. TRDPRC_1,HIGH_1,LOW_1,OPEN_PRC,ACVOL_UNS)' },
            count: { type: 'number', description: 'Maximum number of data points to return (max: 10000)' },
          },
          required: ['universe', 'interval'],
        },
      },
      {
        name: 'search_securities',
        description: 'Search for securities by company name or ticker with market and asset type filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Company name or ticker search query' },
            assetClass: { type: 'string', description: 'Filter by asset class: Equity, ETF, Fund, Index, FixedIncome, Commodity' },
            exchange: { type: 'string', description: 'Filter by exchange code (e.g. NSQ for NASDAQ, NYS for NYSE)' },
            limit: { type: 'number', description: 'Maximum results to return (max: 25, default: 10)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_security_details',
        description: 'Get detailed reference data for a security including company description, SIC code, and exchange listing',
        inputSchema: {
          type: 'object',
          properties: {
            universe: { type: 'string', description: 'RIC code for the instrument (e.g. AAPL.O)' },
            fields: { type: 'string', description: 'Specific fields to return (default: standard reference set)' },
          },
          required: ['universe'],
        },
      },
      {
        name: 'get_esg_scores',
        description: 'Get ESG (Environmental, Social, Governance) composite scores and sub-scores for a company by RIC',
        inputSchema: {
          type: 'object',
          properties: {
            universe: { type: 'string', description: 'RIC code or company identifier (e.g. AAPL.O)' },
            start: { type: 'string', description: 'Start year for historical ESG data (YYYY)' },
            end: { type: 'string', description: 'End year for historical ESG data (YYYY — default: latest)' },
          },
          required: ['universe'],
        },
      },
      {
        name: 'get_esg_full',
        description: 'Get full ESG disclosure data with 400+ individual ESG metrics and scores for a company',
        inputSchema: {
          type: 'object',
          properties: {
            universe: { type: 'string', description: 'RIC code or company identifier (e.g. AAPL.O)' },
            start: { type: 'string', description: 'Start year for ESG data (YYYY)' },
            end: { type: 'string', description: 'End year for ESG data (YYYY — default: latest)' },
          },
          required: ['universe'],
        },
      },
      {
        name: 'search_news',
        description: 'Search Refinitiv news headlines by keyword, RIC code, or date range',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'News search query or keywords (e.g. "Apple earnings" or RIC code AAPL.O)' },
            dateFrom: { type: 'string', description: 'Start date for news search in ISO 8601 format (e.g. 2026-01-01T00:00:00Z)' },
            dateTo: { type: 'string', description: 'End date for news search in ISO 8601 format (default: now)' },
            limit: { type: 'number', description: 'Maximum news items to return (max: 100, default: 20)' },
            cursor: { type: 'string', description: 'Pagination cursor from a previous response' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_news_story',
        description: 'Retrieve the full text body of a specific news story by its Refinitiv story ID',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: { type: 'string', description: 'Refinitiv news story ID (from search_news results)' },
          },
          required: ['storyId'],
        },
      },
      {
        name: 'get_estimates',
        description: 'Get analyst consensus earnings estimates for a company including EPS, revenue, and EBITDA forecasts',
        inputSchema: {
          type: 'object',
          properties: {
            universe: { type: 'string', description: 'RIC code for the company (e.g. AAPL.O)' },
            period: { type: 'string', description: 'Forecast period: Annual or Interim (default: Annual)' },
            count: { type: 'number', description: 'Number of forward periods (default: 3)' },
          },
          required: ['universe'],
        },
      },
      {
        name: 'get_ownership',
        description: 'Get consolidated institutional investor ownership data for a company via RIC code, including top holders',
        inputSchema: {
          type: 'object',
          properties: {
            universe: { type: 'string', description: 'RIC code for the company (e.g. AAPL.O)' },
            limit: { type: 'number', description: 'Maximum number of owners to return (max: 100, default: 25)' },
          },
          required: ['universe'],
        },
      },
      {
        name: 'get_fundamental_summary',
        description: 'Get key financial ratios and fundamental data for a company including P/E, market cap, and dividend yield',
        inputSchema: {
          type: 'object',
          properties: {
            universe: { type: 'string', description: 'RIC code or comma-separated RIC codes (e.g. AAPL.O,MSFT.O)' },
            fields: { type: 'string', description: 'Comma-separated fundamental fields (e.g. TR.PERatio,TR.MarketCap,TR.DividendYield)' },
          },
          required: ['universe'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_pricing_snapshot': return this.getPricingSnapshot(args);
        case 'get_historical_pricing': return this.getHistoricalPricing(args);
        case 'search_securities': return this.searchSecurities(args);
        case 'get_security_details': return this.getSecurityDetails(args);
        case 'get_esg_scores': return this.getEsgScores(args);
        case 'get_esg_full': return this.getEsgFull(args);
        case 'search_news': return this.searchNews(args);
        case 'get_news_story': return this.getNewsStory(args);
        case 'get_estimates': return this.getEstimates(args);
        case 'get_ownership': return this.getOwnership(args);
        case 'get_fundamental_summary': return this.getFundamentalSummary(args);
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
    if (this.bearerToken && this.tokenExpiry > now) return this.bearerToken;

    const response = await this.fetchWithRetry(`${this.baseUrl}/auth/oauth2/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!response.ok) throw new Error(`OAuth2 token request failed: ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    // Tokens expire in 300s; refresh 60s early
    const expiresIn = data.expires_in ?? 300;
    this.tokenExpiry = now + (expiresIn - 60) * 1000;
    return this.bearerToken;
  }

  private async get(path: string, params?: Record<string, string>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getPricingSnapshot(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.universe) return { content: [{ type: 'text', text: 'universe is required' }], isError: true };
    const params: Record<string, string> = { universe: args.universe as string };
    if (args.fields) params.fields = args.fields as string;
    return this.get('/data/pricing/snapshots/v1', params);
  }

  private async getHistoricalPricing(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.universe || !args.interval) return { content: [{ type: 'text', text: 'universe and interval are required' }], isError: true };
    const params: Record<string, string> = {
      universe: args.universe as string,
      interval: args.interval as string,
    };
    if (args.start) params.start = args.start as string;
    if (args.end) params.end = args.end as string;
    if (args.fields) params.fields = args.fields as string;
    if (args.count) params.count = String(args.count);
    return this.get('/data/historical-pricing/v1/views/interday-summaries', params);
  }

  private async searchSecurities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = { query: args.query as string };
    if (args.assetClass) params.assetClass = args.assetClass as string;
    if (args.exchange) params.exchange = args.exchange as string;
    if (args.limit) params.limit = String(args.limit);
    return this.get('/data/search/v1', params);
  }

  private async getSecurityDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.universe) return { content: [{ type: 'text', text: 'universe is required' }], isError: true };
    const params: Record<string, string> = { universe: args.universe as string };
    if (args.fields) params.fields = args.fields as string;
    return this.get('/data/fundamentals/v1/views/equity-standard', params);
  }

  private async getEsgScores(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.universe) return { content: [{ type: 'text', text: 'universe is required' }], isError: true };
    const params: Record<string, string> = { universe: args.universe as string };
    if (args.start) params.start = args.start as string;
    if (args.end) params.end = args.end as string;
    return this.get('/data/environmental-social-governance/v1/views/scores', params);
  }

  private async getEsgFull(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.universe) return { content: [{ type: 'text', text: 'universe is required' }], isError: true };
    const params: Record<string, string> = { universe: args.universe as string };
    if (args.start) params.start = args.start as string;
    if (args.end) params.end = args.end as string;
    return this.get('/data/environmental-social-governance/v1/views/scores-full', params);
  }

  private async searchNews(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    const params: Record<string, string> = {
      query: args.query as string,
      limit: String((args.limit as number) || 20),
    };
    if (args.dateFrom) params.dateFrom = args.dateFrom as string;
    if (args.dateTo) params.dateTo = args.dateTo as string;
    if (args.cursor) params.cursor = args.cursor as string;
    return this.get('/data/news/v1/headlines', params);
  }

  private async getNewsStory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.storyId) return { content: [{ type: 'text', text: 'storyId is required' }], isError: true };
    return this.get(`/data/news/v1/stories/${encodeURIComponent(args.storyId as string)}`);
  }

  private async getEstimates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.universe) return { content: [{ type: 'text', text: 'universe is required' }], isError: true };
    const params: Record<string, string> = {
      universe: args.universe as string,
      period: (args.period as string) || 'Annual',
    };
    if (args.count) params.count = String(args.count);
    return this.get('/data/estimates/v3/bulk-summary/universe', params);
  }

  private async getOwnership(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.universe) return { content: [{ type: 'text', text: 'universe is required' }], isError: true };
    const params: Record<string, string> = { universe: args.universe as string };
    if (args.limit) params.limit = String(args.limit);
    // Verified endpoint: /data/ownership/v1/views/consolidated/investors (LSEG Developer docs)
    return this.get('/data/ownership/v1/views/consolidated/investors', params);
  }

  private async getFundamentalSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.universe) return { content: [{ type: 'text', text: 'universe is required' }], isError: true };
    const defaultFields = 'TR.PERatio,TR.MarketCap,TR.DividendYield,TR.PriceToBVPerShare,TR.EVToEBITDA,TR.RevenueActValue,TR.NetIncome';
    const params: Record<string, string> = {
      universe: args.universe as string,
      fields: (args.fields as string) || defaultFields,
    };
    return this.get('/data/fundamental-and-reference/v1', params);
  }
}
