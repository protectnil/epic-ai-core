/**
 * CoinGecko MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://mcp.api.coingecko.com/mcp (public) | https://mcp.pro-api.coingecko.com/mcp (Pro BYOK)
//   — transport: streamable-HTTP, auth: x-cg-pro-api-key header (Pro) or none (public)
//   — Docs: https://docs.coingecko.com/reference/mcp-server — official, actively maintained (last updated 2025-09)
// Our adapter covers: 16 tools (prices, markets, coins, trending, exchanges, NFTs, search).
// Vendor MCP covers: Full API surface including onchain DEX, trending pools, megafilter, and Pro-exclusive tools (40+ tools estimated).
// Recommendation: use-rest-api for air-gapped or programmatic REST usage.
//   Vendor MCP meets all four protocol criteria (official, maintained, 10+ tools, streamable-HTTP).
//   However, vendor MCP is in Beta and our REST adapter provides stable, air-gapped fallback.
//   Decision: use-rest-api (vendor MCP is a strict superset of our adapter — prefer vendor MCP for
//   hosted deployments, keep this adapter as air-gapped fallback per protocol section "When to build a REST API wrapper").
//
// Base URL: https://pro-api.coingecko.com/api/v3 (Pro key)
//           https://api.coingecko.com/api/v3 (Demo/public, lower rate limits)
// Auth: API key via x-cg-pro-api-key header (Pro) or x-cg-demo-api-key header (Demo)
// Docs: https://docs.coingecko.com/v3.0.1/reference/introduction
// Rate limits: Pro — 500 calls/min; Demo — 30 calls/min; Public (no key) — ~10-30 calls/min.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CoinGeckoConfig {
  apiKey: string;
  plan?: 'pro' | 'demo';
  baseUrl?: string;
}

export class CoinGeckoMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly plan: 'pro' | 'demo';
  private readonly baseUrl: string;

  constructor(config: CoinGeckoConfig) {
    super();
    this.apiKey = config.apiKey;
    this.plan = config.plan ?? 'pro';
    this.baseUrl = config.baseUrl || (this.plan === 'pro'
      ? 'https://pro-api.coingecko.com/api/v3'
      : 'https://api.coingecko.com/api/v3');
  }

  static catalog() {
    return {
      name: 'coingecko',
      displayName: 'CoinGecko',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'coingecko', 'crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'price',
        'market', 'coin', 'token', 'defi', 'nft', 'exchange', 'trending',
        'market-cap', 'trading-volume', 'blockchain',
      ],
      toolNames: [
        'get_price', 'get_coin_data', 'list_coins', 'search_coins',
        'get_coins_markets', 'get_market_chart', 'get_ohlc',
        'get_trending', 'get_global_data', 'get_global_defi_data',
        'list_exchanges', 'get_exchange', 'get_exchange_tickers',
        'list_nfts', 'get_nft', 'ping',
      ],
      description: 'CoinGecko crypto market data: real-time prices, market caps, OHLC, trending coins, NFTs, exchanges, and global DeFi statistics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'ping',
        description: 'Check CoinGecko API connectivity and confirm the API key is valid',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_price',
        description: 'Get current prices for one or more coins in specified fiat or crypto currencies with optional market data',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'string',
              description: 'Comma-separated CoinGecko coin IDs (e.g. bitcoin,ethereum,solana)',
            },
            vs_currencies: {
              type: 'string',
              description: 'Comma-separated target currencies (e.g. usd,eur,btc) (default: usd)',
            },
            include_market_cap: {
              type: 'boolean',
              description: 'Include market cap data in response (default: false)',
            },
            include_24hr_vol: {
              type: 'boolean',
              description: 'Include 24-hour trading volume in response (default: false)',
            },
            include_24hr_change: {
              type: 'boolean',
              description: 'Include 24-hour price change percentage in response (default: false)',
            },
            include_last_updated_at: {
              type: 'boolean',
              description: 'Include last-updated Unix timestamp in response (default: false)',
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_coin_data',
        description: 'Get comprehensive data for a coin by ID: price, market cap, supply, links, description, and community stats',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'CoinGecko coin ID (e.g. bitcoin, ethereum, solana)',
            },
            localization: {
              type: 'boolean',
              description: 'Include localized language data (default: false; API default is true but this adapter defaults to false to reduce response size)',
            },
            tickers: {
              type: 'boolean',
              description: 'Include exchange ticker data (default: false; API default is true but this adapter defaults to false to reduce response size)',
            },
            market_data: {
              type: 'boolean',
              description: 'Include detailed market data (default: true)',
            },
            community_data: {
              type: 'boolean',
              description: 'Include community statistics (default: false; API default is true but this adapter defaults to false to reduce response size)',
            },
            developer_data: {
              type: 'boolean',
              description: 'Include developer/GitHub statistics (default: false; API default is true but this adapter defaults to false to reduce response size)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_coins',
        description: 'List all supported coins on CoinGecko with their ID, symbol, and name for use in other calls',
        inputSchema: {
          type: 'object',
          properties: {
            include_platform: {
              type: 'boolean',
              description: 'Include contract address platform data per coin (default: false)',
            },
          },
        },
      },
      {
        name: 'search_coins',
        description: 'Search for coins, exchanges, NFT collections, and categories by name or symbol query',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string (coin name, symbol, or exchange name)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_coins_markets',
        description: 'List coins with market data (price, volume, market cap, change) sorted by market cap or other fields',
        inputSchema: {
          type: 'object',
          properties: {
            vs_currency: {
              type: 'string',
              description: 'Target currency for market data (e.g. usd, eur, btc) (default: usd)',
            },
            ids: {
              type: 'string',
              description: 'Comma-separated coin IDs to filter (omit for all)',
            },
            category: {
              type: 'string',
              description: 'Filter coins by CoinGecko category (e.g. defi, layer-1, meme-token)',
            },
            order: {
              type: 'string',
              description: 'Sort order: market_cap_desc, market_cap_asc, volume_desc, id_asc (default: market_cap_desc)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 250, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            sparkline: {
              type: 'boolean',
              description: 'Include 7-day price sparkline data (default: false)',
            },
            price_change_percentage: {
              type: 'string',
              description: 'Comma-separated intervals for price change % (e.g. 1h,24h,7d,30d)',
            },
          },
        },
      },
      {
        name: 'get_market_chart',
        description: 'Get historical price, market cap, and volume chart data for a coin over a time range',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'CoinGecko coin ID (e.g. bitcoin)',
            },
            vs_currency: {
              type: 'string',
              description: 'Target currency (e.g. usd, eur) (default: usd)',
            },
            days: {
              type: 'string',
              description: 'Number of days of data: 1, 7, 14, 30, 90, 180, 365, or max',
            },
            interval: {
              type: 'string',
              description: 'Data interval: daily or hourly (auto-selected based on days if omitted)',
            },
          },
          required: ['id', 'days'],
        },
      },
      {
        name: 'get_ohlc',
        description: 'Get OHLC (open, high, low, close) candlestick data for a coin in a target currency',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'CoinGecko coin ID (e.g. bitcoin)',
            },
            vs_currency: {
              type: 'string',
              description: 'Target currency (e.g. usd, eur) (default: usd)',
            },
            days: {
              type: 'number',
              description: 'Number of days of OHLC data: 1, 7, 14, 30, 90, 180, or 365',
            },
          },
          required: ['id', 'days'],
        },
      },
      {
        name: 'get_trending',
        description: 'Get trending search results: top 15 coins, top 7 NFTs, and top 6 categories by user searches in the last 24 hours',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_global_data',
        description: 'Get global crypto market statistics: total market cap, volume, BTC dominance, active coins, and markets',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_global_defi_data',
        description: 'Get global DeFi market statistics: DeFi market cap, volume, top coin dominance, and ETH market cap ratio',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_exchanges',
        description: 'List all cryptocurrency exchanges tracked by CoinGecko with volume, trust score, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              description: 'Results per page (max 250, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_exchange',
        description: 'Get detailed information about a specific exchange including volume, trust score, and social links',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'CoinGecko exchange ID (e.g. binance, coinbase, kraken)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_exchange_tickers',
        description: 'Get paginated tickers (trading pairs and prices) for a specific exchange',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'CoinGecko exchange ID (e.g. binance)',
            },
            coin_ids: {
              type: 'string',
              description: 'Comma-separated coin IDs to filter tickers (omit for all)',
            },
            include_exchange_logo: {
              type: 'boolean',
              description: 'Include exchange logo URL in response (default: false)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            depth: {
              type: 'boolean',
              description: 'Include 2% order book depth data (default: false)',
            },
            order: {
              type: 'string',
              description: 'Sort order: trust_score_desc, trade_url (default: trust_score_desc)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_nfts',
        description: 'List NFT collections tracked by CoinGecko with floor price, market cap, and volume data',
        inputSchema: {
          type: 'object',
          properties: {
            order: {
              type: 'string',
              description: 'Sort order: market_cap_usd_desc, market_cap_usd_asc, volume_usd_24h_desc (default: market_cap_usd_desc)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 250, default: 100)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
        },
      },
      {
        name: 'get_nft',
        description: 'Get detailed data for an NFT collection by ID: floor price, market cap, volume, and contract addresses',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'CoinGecko NFT collection ID (e.g. bored-ape-yacht-club, cryptopunks)',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'ping': return this.ping();
        case 'get_price': return this.getPrice(args);
        case 'get_coin_data': return this.getCoinData(args);
        case 'list_coins': return this.listCoins(args);
        case 'search_coins': return this.searchCoins(args);
        case 'get_coins_markets': return this.getCoinsMarkets(args);
        case 'get_market_chart': return this.getMarketChart(args);
        case 'get_ohlc': return this.getOhlc(args);
        case 'get_trending': return this.getTrending();
        case 'get_global_data': return this.getGlobalData();
        case 'get_global_defi_data': return this.getGlobalDefiData();
        case 'list_exchanges': return this.listExchanges(args);
        case 'get_exchange': return this.getExchange(args);
        case 'get_exchange_tickers': return this.getExchangeTickers(args);
        case 'list_nfts': return this.listNfts(args);
        case 'get_nft': return this.getNft(args);
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

  private get authHeader(): Record<string, string> {
    const headerName = this.plan === 'pro' ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key';
    return { [headerName]: this.apiKey };
  }


  private async cgGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${path}${qs ? '?' + qs : ''}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...this.authHeader },
    });
    if (!response.ok) {
      const body = await response.text();
      return { content: [{ type: 'text', text: `API error ${response.status}: ${body}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async ping(): Promise<ToolResult> {
    return this.cgGet('/ping');
  }

  private async getPrice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ids) return { content: [{ type: 'text', text: 'ids is required' }], isError: true };
    const params: Record<string, string> = {
      ids: args.ids as string,
      vs_currencies: (args.vs_currencies as string) ?? 'usd',
    };
    if (typeof args.include_market_cap === 'boolean') params.include_market_cap = String(args.include_market_cap);
    if (typeof args.include_24hr_vol === 'boolean') params.include_24hr_vol = String(args.include_24hr_vol);
    if (typeof args.include_24hr_change === 'boolean') params.include_24hr_change = String(args.include_24hr_change);
    if (typeof args.include_last_updated_at === 'boolean') params.include_last_updated_at = String(args.include_last_updated_at);
    return this.cgGet('/simple/price', params);
  }

  private async getCoinData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string> = {
      localization: String(args.localization ?? false),
      tickers: String(args.tickers ?? false),
      market_data: String(args.market_data ?? true),
      community_data: String(args.community_data ?? false),
      developer_data: String(args.developer_data ?? false),
    };
    return this.cgGet(`/coins/${encodeURIComponent(args.id as string)}`, params);
  }

  private async listCoins(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (typeof args.include_platform === 'boolean') params.include_platform = String(args.include_platform);
    return this.cgGet('/coins/list', params);
  }

  private async searchCoins(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.cgGet('/search', { query: args.query as string });
  }

  private async getCoinsMarkets(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      vs_currency: (args.vs_currency as string) ?? 'usd',
      order: (args.order as string) ?? 'market_cap_desc',
      per_page: String((args.per_page as number) ?? 100),
      page: String((args.page as number) ?? 1),
      sparkline: String(args.sparkline ?? false),
    };
    if (args.ids) params.ids = args.ids as string;
    if (args.category) params.category = args.category as string;
    if (args.price_change_percentage) params.price_change_percentage = args.price_change_percentage as string;
    return this.cgGet('/coins/markets', params);
  }

  private async getMarketChart(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.days) return { content: [{ type: 'text', text: 'id and days are required' }], isError: true };
    const params: Record<string, string> = {
      vs_currency: (args.vs_currency as string) ?? 'usd',
      days: String(args.days),
    };
    if (args.interval) params.interval = args.interval as string;
    return this.cgGet(`/coins/${encodeURIComponent(args.id as string)}/market_chart`, params);
  }

  private async getOhlc(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.days) return { content: [{ type: 'text', text: 'id and days are required' }], isError: true };
    const params: Record<string, string> = {
      vs_currency: (args.vs_currency as string) ?? 'usd',
      days: String(args.days),
    };
    return this.cgGet(`/coins/${encodeURIComponent(args.id as string)}/ohlc`, params);
  }

  private async getTrending(): Promise<ToolResult> {
    return this.cgGet('/search/trending');
  }

  private async getGlobalData(): Promise<ToolResult> {
    return this.cgGet('/global');
  }

  private async getGlobalDefiData(): Promise<ToolResult> {
    return this.cgGet('/global/decentralized_finance_defi');
  }

  private async listExchanges(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      per_page: String((args.per_page as number) ?? 100),
      page: String((args.page as number) ?? 1),
    };
    return this.cgGet('/exchanges', params);
  }

  private async getExchange(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.cgGet(`/exchanges/${encodeURIComponent(args.id as string)}`);
  }

  private async getExchangeTickers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const params: Record<string, string> = {
      page: String((args.page as number) ?? 1),
    };
    if (args.coin_ids) params.coin_ids = args.coin_ids as string;
    if (typeof args.include_exchange_logo === 'boolean') params.include_exchange_logo = String(args.include_exchange_logo);
    if (typeof args.depth === 'boolean') params.depth = String(args.depth);
    if (args.order) params.order = args.order as string;
    return this.cgGet(`/exchanges/${encodeURIComponent(args.id as string)}/tickers`, params);
  }

  private async listNfts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      order: (args.order as string) ?? 'market_cap_usd_desc',
      per_page: String((args.per_page as number) ?? 100),
      page: String((args.page as number) ?? 1),
    };
    return this.cgGet('/nfts/list', params);
  }

  private async getNft(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.cgGet(`/nfts/${encodeURIComponent(args.id as string)}`);
  }
}
