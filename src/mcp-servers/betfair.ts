/**
 * Betfair MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Betfair MCP server was found on GitHub.
// The Betfair Exchange Streaming API (stream-api.betfair.com:443/api) is an SSL socket
// connection using CRLF-delimited JSON messages (op: authenticate, marketSubscription,
// orderSubscription, heartbeat). The REST Exchange API (api.betfair.com) provides
// listEventTypes, listMarketCatalogue, listMarketBook, placeOrders, cancelOrders, etc.
// Our adapter covers 8 tools across both surfaces.
//
// Base URL (Streaming): https://stream-api.betfair.com:443/api
// Base URL (REST Exchange): https://api.betfair.com/exchange/betting/json-rpc/v1
// Auth: Session token (X-Authentication header) + application key (X-Application header)
// Docs: https://docs.developer.betfair.com/display/1smk3cen4v3lu3yomq5qye0ni/
// Rate limits: Varies by tier. REST: ~5 req/sec default. Streaming: persistent SSL socket.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BetfairConfig {
  /** Betfair session token obtained from Betfair login API */
  sessionToken: string;
  /** Application key from MyBetfair developer section */
  appKey: string;
  /** Optional base URL override for REST Exchange API */
  restBaseUrl?: string;
  /** Optional base URL override for Streaming API */
  streamBaseUrl?: string;
}

export class BetfairMCPServer extends MCPAdapterBase {
  private readonly sessionToken: string;
  private readonly appKey: string;
  private readonly restBaseUrl: string;
  private readonly streamBaseUrl: string;

  constructor(config: BetfairConfig) {
    super();
    this.sessionToken = config.sessionToken;
    this.appKey = config.appKey;
    this.restBaseUrl = config.restBaseUrl ?? 'https://api.betfair.com/exchange/betting/json-rpc/v1';
    this.streamBaseUrl = config.streamBaseUrl ?? 'https://stream-api.betfair.com:443/api';
  }

  static catalog() {
    return {
      name: 'betfair',
      displayName: 'Betfair',
      version: '1.0.0',
      category: 'gaming',
      keywords: [
        'betfair', 'betting', 'sports', 'exchange', 'odds', 'horse racing', 'football',
        'markets', 'wager', 'gambling', 'live betting', 'in-play', 'streaming', 'orders',
        'bets', 'runners', 'event', 'market subscription', 'price ladder',
      ],
      toolNames: [
        'list_event_types', 'list_markets', 'get_market_book', 'list_market_catalogue',
        'place_orders', 'cancel_orders', 'list_current_orders', 'stream_subscribe_markets',
      ],
      description: 'Betfair Exchange API — browse sports events and markets, get live odds and market books, place and cancel bets, list current orders, and subscribe to streaming market updates.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_event_types',
        description: 'List all Betfair event types (e.g. Horse Racing, Football, Tennis) with their IDs',
        inputSchema: {
          type: 'object',
          properties: {
            text_query: {
              type: 'string',
              description: 'Optional text filter to narrow results (e.g. "Horse Racing")',
            },
            locale: {
              type: 'string',
              description: 'Language locale for response labels (e.g. en, fr, de)',
            },
          },
        },
      },
      {
        name: 'list_markets',
        description: 'List Betfair markets matching a filter — returns market IDs, names, status, and start times',
        inputSchema: {
          type: 'object',
          properties: {
            event_type_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by event type IDs (e.g. ["1"] for Soccer)',
            },
            event_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific event IDs',
            },
            market_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific market IDs',
            },
            country_codes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by ISO 3166-1 alpha-2 country codes (e.g. ["GB", "IE"])',
            },
            market_types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by market types (e.g. ["MATCH_ODDS", "NEXT_GOAL"])',
            },
            in_play_only: {
              type: 'boolean',
              description: 'If true return only in-play markets',
            },
            text_query: {
              type: 'string',
              description: 'Text search to filter market names',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return (default 10, max 1000)',
            },
          },
        },
      },
      {
        name: 'get_market_book',
        description: 'Get live prices, traded volumes, and available-to-back/lay offers for one or more Betfair markets',
        inputSchema: {
          type: 'object',
          properties: {
            market_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of market IDs to retrieve book data for (max 5 per call)',
            },
            price_projection: {
              type: 'array',
              items: { type: 'string' },
              description: 'Price data to include: EX_BEST_OFFERS, EX_ALL_OFFERS, EX_TRADED, SP_TRADED, SP_PROJECTED (default: EX_BEST_OFFERS)',
            },
            order_projection: {
              type: 'string',
              description: 'Orders to include: ALL, EXECUTABLE, EXECUTION_COMPLETE (default: ALL)',
            },
            match_projection: {
              type: 'string',
              description: 'Matched bets: NO_ROLLUP, ROLLED_UP_BY_PRICE, ROLLED_UP_BY_AVG_PRICE',
            },
          },
          required: ['market_ids'],
        },
      },
      {
        name: 'list_market_catalogue',
        description: 'Get descriptive market information including runner names, event details, and market rules',
        inputSchema: {
          type: 'object',
          properties: {
            market_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of market IDs to describe',
            },
            event_type_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by event type IDs',
            },
            include_runners: {
              type: 'boolean',
              description: 'Include runner (selection) names and metadata (default: true)',
            },
            include_event: {
              type: 'boolean',
              description: 'Include parent event details (default: true)',
            },
            max_results: {
              type: 'number',
              description: 'Maximum catalogue entries to return (default 10, max 1000)',
            },
          },
        },
      },
      {
        name: 'place_orders',
        description: 'Place one or more bets (back or lay) on a Betfair Exchange market',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: 'The market ID to place bets on',
            },
            instructions: {
              type: 'array',
              description: 'Array of bet instructions to place',
              items: {
                type: 'object',
                properties: {
                  selection_id: { type: 'number', description: 'Runner/selection ID' },
                  side: { type: 'string', description: 'BACK or LAY' },
                  order_type: { type: 'string', description: 'LIMIT, LIMIT_ON_CLOSE, or MARKET_ON_CLOSE' },
                  size: { type: 'number', description: 'Stake amount in account currency' },
                  price: { type: 'number', description: 'Decimal odds (e.g. 2.5)' },
                  persistence_type: { type: 'string', description: 'LAPSE, PERSIST, or MARKET_ON_CLOSE' },
                },
                required: ['selection_id', 'side', 'order_type', 'size', 'price'],
              },
            },
            customer_ref: {
              type: 'string',
              description: 'Optional customer reference (max 32 chars) for idempotency',
            },
          },
          required: ['market_id', 'instructions'],
        },
      },
      {
        name: 'cancel_orders',
        description: 'Cancel one or more unmatched (EXECUTABLE) bets on a Betfair Exchange market',
        inputSchema: {
          type: 'object',
          properties: {
            market_id: {
              type: 'string',
              description: 'Market ID — required unless cancelling by bet IDs across all markets',
            },
            instructions: {
              type: 'array',
              description: 'Array of cancel instructions; omit to cancel all unmatched bets on the market',
              items: {
                type: 'object',
                properties: {
                  bet_id: { type: 'string', description: 'Bet ID to cancel' },
                  size_reduction: { type: 'number', description: 'Partial cancel — reduces remaining size by this value' },
                },
                required: ['bet_id'],
              },
            },
            customer_ref: {
              type: 'string',
              description: 'Optional customer reference for the cancel operation',
            },
          },
        },
      },
      {
        name: 'list_current_orders',
        description: 'List your current open and recently settled orders on Betfair Exchange',
        inputSchema: {
          type: 'object',
          properties: {
            bet_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific bet IDs',
            },
            market_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by market IDs',
            },
            order_projection: {
              type: 'string',
              description: 'EXECUTABLE (unmatched) or EXECUTION_COMPLETE (settled/fully matched)',
            },
            date_range_from: {
              type: 'string',
              description: 'ISO 8601 start date for order date range filter',
            },
            date_range_to: {
              type: 'string',
              description: 'ISO 8601 end date for order date range filter',
            },
            order_by: {
              type: 'string',
              description: 'Sort: BY_BET, BY_MARKET, BY_MATCH_TIME, BY_PLACE_TIME, BY_SETTLED_TIME, BY_VOID_TIME',
            },
            from_record: {
              type: 'number',
              description: 'Record index to start from (pagination offset)',
            },
            record_count: {
              type: 'number',
              description: 'Number of records to return (default 1000, max 1000)',
            },
          },
        },
      },
      {
        name: 'stream_subscribe_markets',
        description: 'Build a market subscription message for the Betfair Streaming API SSL socket — returns the JSON payload to send for real-time market price streaming',
        inputSchema: {
          type: 'object',
          properties: {
            market_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of market IDs to subscribe to',
            },
            event_type_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Subscribe to all markets for these event type IDs',
            },
            country_codes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Subscribe to markets in these countries (ISO 3166-1 alpha-2)',
            },
            market_types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Subscribe to specific market types (e.g. MATCH_ODDS)',
            },
            data_fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Data fields: EX_BEST_OFFERS, EX_ALL_OFFERS, EX_TRADED, EX_LTP, EX_MARKET_DEF, SP_TRADED, SP_PROJECTED',
            },
            heartbeat_ms: {
              type: 'number',
              description: 'Heartbeat interval in milliseconds (500–5000)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_event_types':
          return this.listEventTypes(args);
        case 'list_markets':
          return this.listMarkets(args);
        case 'get_market_book':
          return this.getMarketBook(args);
        case 'list_market_catalogue':
          return this.listMarketCatalogue(args);
        case 'place_orders':
          return this.placeOrders(args);
        case 'cancel_orders':
          return this.cancelOrders(args);
        case 'list_current_orders':
          return this.listCurrentOrders(args);
        case 'stream_subscribe_markets':
          return this.streamSubscribeMarkets(args);
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

  private authHeaders(): Record<string, string> {
    return {
      'X-Authentication': this.sessionToken,
      'X-Application': this.appKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async rpcCall(method: string, params: Record<string, unknown>): Promise<ToolResult> {
    const body = JSON.stringify([{ jsonrpc: '2.0', method: `SportsAPING/v1.0/${method}`, params, id: 1 }]);
    const response = await this.fetchWithRetry(this.restBaseUrl, {
      method: 'POST',
      headers: this.authHeaders(),
      body,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Betfair returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEventTypes(args: Record<string, unknown>): Promise<ToolResult> {
    const filter: Record<string, unknown> = {};
    if (args.text_query) filter.textQuery = args.text_query;
    const params: Record<string, unknown> = { filter };
    if (args.locale) params.locale = args.locale;
    return this.rpcCall('listEventTypes', params);
  }

  private async listMarkets(args: Record<string, unknown>): Promise<ToolResult> {
    const filter: Record<string, unknown> = {};
    if (args.event_type_ids) filter.eventTypeIds = args.event_type_ids;
    if (args.event_ids) filter.eventIds = args.event_ids;
    if (args.market_ids) filter.marketIds = args.market_ids;
    if (args.country_codes) filter.countryCodes = args.country_codes;
    if (args.market_types) filter.marketTypes = args.market_types;
    if (args.in_play_only !== undefined) filter.inPlayOnly = args.in_play_only;
    if (args.text_query) filter.textQuery = args.text_query;
    const params: Record<string, unknown> = {
      filter,
      sort: 'FIRST_TO_START',
      maxResults: (args.max_results as number) ?? 10,
      marketProjection: ['COMPETITION', 'EVENT', 'EVENT_TYPE', 'MARKET_START_TIME', 'RUNNER_DESCRIPTION'],
    };
    return this.rpcCall('listMarketCatalogue', params);
  }

  private async getMarketBook(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_ids || !Array.isArray(args.market_ids) || args.market_ids.length === 0) {
      return { content: [{ type: 'text', text: 'market_ids is required and must be a non-empty array' }], isError: true };
    }
    const priceProjection: Record<string, unknown> = {
      priceData: Array.isArray(args.price_projection) ? args.price_projection : ['EX_BEST_OFFERS'],
    };
    const params: Record<string, unknown> = {
      marketIds: args.market_ids,
      priceProjection,
    };
    if (args.order_projection) params.orderProjection = args.order_projection;
    if (args.match_projection) params.matchProjection = args.match_projection;
    return this.rpcCall('listMarketBook', params);
  }

  private async listMarketCatalogue(args: Record<string, unknown>): Promise<ToolResult> {
    const filter: Record<string, unknown> = {};
    if (args.market_ids) filter.marketIds = args.market_ids;
    if (args.event_type_ids) filter.eventTypeIds = args.event_type_ids;
    const marketProjection: string[] = [];
    if (args.include_event !== false) marketProjection.push('EVENT', 'EVENT_TYPE', 'COMPETITION');
    if (args.include_runners !== false) marketProjection.push('RUNNER_DESCRIPTION', 'RUNNER_METADATA');
    marketProjection.push('MARKET_START_TIME', 'MARKET_DESCRIPTION');
    const params: Record<string, unknown> = {
      filter,
      marketProjection,
      maxResults: (args.max_results as number) ?? 10,
    };
    return this.rpcCall('listMarketCatalogue', params);
  }

  private async placeOrders(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.market_id) return { content: [{ type: 'text', text: 'market_id is required' }], isError: true };
    if (!Array.isArray(args.instructions) || args.instructions.length === 0) {
      return { content: [{ type: 'text', text: 'instructions must be a non-empty array' }], isError: true };
    }
    const instructions = (args.instructions as Record<string, unknown>[]).map(inst => ({
      selectionId: inst.selection_id,
      side: inst.side,
      orderType: inst.order_type,
      limitOrder: {
        size: inst.size,
        price: inst.price,
        persistenceType: inst.persistence_type ?? 'LAPSE',
      },
    }));
    const params: Record<string, unknown> = { marketId: args.market_id, instructions };
    if (args.customer_ref) params.customerRef = args.customer_ref;
    return this.rpcCall('placeOrders', params);
  }

  private async cancelOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.market_id) params.marketId = args.market_id;
    if (Array.isArray(args.instructions) && args.instructions.length > 0) {
      params.instructions = (args.instructions as Record<string, unknown>[]).map(inst => ({
        betId: inst.bet_id,
        ...(inst.size_reduction !== undefined ? { sizeReduction: inst.size_reduction } : {}),
      }));
    }
    if (args.customer_ref) params.customerRef = args.customer_ref;
    return this.rpcCall('cancelOrders', params);
  }

  private async listCurrentOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.bet_ids) params.betIds = args.bet_ids;
    if (args.market_ids) params.marketIds = args.market_ids;
    if (args.order_projection) params.orderProjection = args.order_projection;
    if (args.date_range_from || args.date_range_to) {
      params.dateRange = {
        ...(args.date_range_from ? { from: args.date_range_from } : {}),
        ...(args.date_range_to ? { to: args.date_range_to } : {}),
      };
    }
    if (args.order_by) params.orderBy = args.order_by;
    if (args.from_record !== undefined) params.fromRecord = args.from_record;
    if (args.record_count !== undefined) params.recordCount = args.record_count;
    return this.rpcCall('listCurrentOrders', params);
  }

  private async streamSubscribeMarkets(args: Record<string, unknown>): Promise<ToolResult> {
    const marketFilter: Record<string, unknown> = {};
    if (args.market_ids) marketFilter.marketIds = args.market_ids;
    if (args.event_type_ids) marketFilter.eventTypeIds = args.event_type_ids;
    if (args.country_codes) marketFilter.countryCodes = args.country_codes;
    if (args.market_types) marketFilter.marketTypes = args.market_types;

    const marketDataFilter: Record<string, unknown> = {};
    if (Array.isArray(args.data_fields) && args.data_fields.length > 0) {
      marketDataFilter.fields = args.data_fields;
    }

    const message: Record<string, unknown> = {
      op: 'marketSubscription',
      id: 1,
      marketFilter,
      marketDataFilter,
    };
    if (args.heartbeat_ms !== undefined) message.heartbeatMs = args.heartbeat_ms;

    const info = {
      description: 'Market subscription message for Betfair Streaming API (stream-api.betfair.com:443/api). Send this JSON followed by \\r\\n over the SSL socket connection.',
      streamEndpoint: this.streamBaseUrl,
      subscriptionMessage: message,
      note: 'Before sending this message you must first send an authentication message: {"op":"authentication","id":0,"session":"<sessionToken>","appKey":"<appKey>"}',
    };
    return { content: [{ type: 'text', text: this.truncate(info) }], isError: false };
  }
}
