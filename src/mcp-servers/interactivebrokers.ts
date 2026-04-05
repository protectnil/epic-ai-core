/**
 * Interactive Brokers MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Interactive Brokers has not published an official MCP server.
//
// Base URL: https://www.interactivebrokers.com/tradingapi/v1
// Auth: Cookie-based session auth (cookieAuth) — session established via OAuth flow.
//   OAuth endpoints: POST /oauth/request_token, POST /oauth/access_token, POST /oauth/live_session_token
// Docs: https://www.interactivebrokers.co.uk/webtradingapi/swagger.yaml
// Rate limits: Not publicly documented. IBKR enforces per-account server-side limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface InteractiveBrokersConfig {
  accessToken: string;
  accessTokenSecret?: string;
  baseUrl?: string;
}

export class InteractiveBrokersMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: InteractiveBrokersConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://www.interactivebrokers.com/tradingapi/v1';
  }

  static catalog() {
    return {
      name: 'interactivebrokers',
      displayName: 'Interactive Brokers',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'interactive brokers', 'ibkr', 'trading', 'brokerage', 'stocks', 'orders',
        'positions', 'portfolio', 'market data', 'securities', 'finance', 'investment',
        'equities', 'forex', 'options', 'futures', 'margin', 'account',
      ],
      toolNames: [
        'list_accounts',
        'get_account_summary',
        'get_account_positions',
        'get_account_trades',
        'list_open_orders',
        'get_order',
        'place_order',
        'modify_order',
        'cancel_order',
        'check_order_impact',
        'get_market_data_snapshot',
        'get_exchange_components',
        'get_security_definition',
        'get_request_token',
        'get_access_token',
        'get_live_session_token',
      ],
      description: 'Trade and manage brokerage accounts via the Interactive Brokers Web API: accounts, orders, positions, market data, and OAuth session management.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Accounts ──────────────────────────────────────────────────────────
      {
        name: 'list_accounts',
        description: 'List all brokerage accounts associated with the current session',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Account number to filter by' },
          },
          required: ['account'],
        },
      },
      {
        name: 'get_account_summary',
        description: 'Get account values summary including net liquidation value, cash, and margin details',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Account number' },
          },
          required: ['account'],
        },
      },
      {
        name: 'get_account_positions',
        description: 'Get all open positions in the specified account, including symbol, quantity, and market value',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Account number' },
          },
          required: ['account'],
        },
      },
      {
        name: 'get_account_trades',
        description: 'Get trade history for the specified account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Account number' },
          },
          required: ['account'],
        },
      },
      // ── Orders ────────────────────────────────────────────────────────────
      {
        name: 'list_open_orders',
        description: 'List all open orders for the specified account',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Account number' },
          },
          required: ['account'],
        },
      },
      {
        name: 'get_order',
        description: 'Get details of a specific order by customer order ID',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Account number' },
            customer_order_id: { type: 'string', description: 'The customer-assigned order ID' },
          },
          required: ['account', 'customer_order_id'],
        },
      },
      {
        name: 'place_order',
        description: 'Place a new order for a security. Specify contract by ContractId OR by Ticker+ListingExchange+InstrumentType (stocks) OR Ticker+Currency+InstrumentType (FX)',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Account number' },
            ContractId: { type: 'number', description: 'IB internal contract identifier (alternative to Ticker-based spec)' },
            Ticker: { type: 'string', description: 'Symbol identifying the trading product' },
            InstrumentType: { type: 'string', description: 'Instrument type (e.g. STK for stocks, CASH for FX)' },
            ListingExchange: { type: 'string', description: 'Exchange where stock is listed (for InstrumentType=STK)' },
            Currency: { type: 'string', description: 'Currency for FX pair (for InstrumentType=CASH)' },
            Side: { type: 'number', description: 'Order side: 1=Buy, 2=Sell' },
            Quantity: { type: 'number', description: 'Number of contracts or shares' },
            OrderType: { type: 'string', description: 'Order type: MKT, LMT, STP, STP LMT' },
            Price: { type: 'number', description: 'Limit price for LMT and STP LMT orders' },
            AuxPrice: { type: 'number', description: 'Stop price for STP and STP LMT orders' },
            TimeInForce: { type: 'string', description: 'Time in force: DAY, GTC, IOC, GTD' },
            CustomerOrderId: { type: 'string', description: 'Customer-assigned order ID for tracking' },
          },
          required: ['account', 'Side', 'Quantity', 'OrderType', 'TimeInForce'],
        },
      },
      {
        name: 'modify_order',
        description: 'Modify an existing open order by customer order ID — change price, quantity, or order type',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Account number' },
            customer_order_id: { type: 'string', description: 'The customer-assigned order ID to modify' },
            Price: { type: 'number', description: 'New limit price' },
            AuxPrice: { type: 'number', description: 'New stop price' },
            Quantity: { type: 'number', description: 'New quantity' },
            TimeInForce: { type: 'string', description: 'New time in force' },
          },
          required: ['account', 'customer_order_id'],
        },
      },
      {
        name: 'cancel_order',
        description: 'Cancel an open order by customer order ID',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Account number' },
            customer_order_id: { type: 'string', description: 'The customer-assigned order ID to cancel' },
          },
          required: ['account', 'customer_order_id'],
        },
      },
      {
        name: 'check_order_impact',
        description: 'Check the margin and commission impact of a hypothetical order before placing it',
        inputSchema: {
          type: 'object',
          properties: {
            account: { type: 'string', description: 'Account number' },
            ContractId: { type: 'number', description: 'IB internal contract identifier' },
            Ticker: { type: 'string', description: 'Symbol of the trading product' },
            InstrumentType: { type: 'string', description: 'Instrument type (STK, CASH, etc.)' },
            ListingExchange: { type: 'string', description: 'Exchange for stocks' },
            Currency: { type: 'string', description: 'Currency for FX' },
            Side: { type: 'number', description: '1=Buy, 2=Sell' },
            Quantity: { type: 'number', description: 'Number of contracts or shares' },
            OrderType: { type: 'string', description: 'Order type: MKT, LMT, STP, STP LMT' },
            Price: { type: 'number', description: 'Order price' },
            AuxPrice: { type: 'number', description: 'Stop price for STP orders' },
            TimeInForce: { type: 'string', description: 'Time in force: DAY, GTC, IOC' },
            CustomerOrderId: { type: 'string', description: 'Optional customer order ID' },
          },
          required: ['account', 'Side', 'Quantity', 'OrderType', 'TimeInForce'],
        },
      },
      // ── Market Data ───────────────────────────────────────────────────────
      {
        name: 'get_market_data_snapshot',
        description: 'Get a real-time market data snapshot for one or more securities by contract ID',
        inputSchema: {
          type: 'object',
          properties: {
            conids: { type: 'string', description: 'Comma-separated list of contract IDs (e.g. "265598,8314")' },
            fields: { type: 'string', description: 'Comma-separated field codes to retrieve (e.g. "31,84,86" for last, bid, ask)' },
          },
          required: ['conids'],
        },
      },
      {
        name: 'get_exchange_components',
        description: 'Get exchange components (constituent symbols) for an index or exchange',
        inputSchema: {
          type: 'object',
          properties: {
            exchange: { type: 'string', description: 'Exchange or index name (e.g. "NDX" for NASDAQ-100)' },
          },
          required: ['exchange'],
        },
      },
      // ── Security Definition ───────────────────────────────────────────────
      {
        name: 'get_security_definition',
        description: 'Look up security definition details including contract ID, exchanges, and instrument metadata',
        inputSchema: {
          type: 'object',
          properties: {
            symbols: { type: 'string', description: 'Comma-separated list of ticker symbols to look up' },
          },
          required: ['symbols'],
        },
      },
      // ── OAuth ─────────────────────────────────────────────────────────────
      {
        name: 'get_request_token',
        description: 'Obtain an OAuth request token to begin the IBKR OAuth authorization flow',
        inputSchema: {
          type: 'object',
          properties: {
            oauth_callback: { type: 'string', description: 'OAuth callback URL' },
          },
        },
      },
      {
        name: 'get_access_token',
        description: 'Exchange an authorized OAuth request token for an access token',
        inputSchema: {
          type: 'object',
          properties: {
            oauth_token: { type: 'string', description: 'Authorized OAuth request token' },
            oauth_verifier: { type: 'string', description: 'OAuth verifier from the callback' },
          },
          required: ['oauth_token', 'oauth_verifier'],
        },
      },
      {
        name: 'get_live_session_token',
        description: 'Obtain a live session token required for brokerage API calls (used after access token)',
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
        case 'list_accounts':            return await this.listAccounts(args);
        case 'get_account_summary':      return await this.getAccountSummary(args);
        case 'get_account_positions':    return await this.getAccountPositions(args);
        case 'get_account_trades':       return await this.getAccountTrades(args);
        case 'list_open_orders':         return await this.listOpenOrders(args);
        case 'get_order':                return await this.getOrder(args);
        case 'place_order':              return await this.placeOrder(args);
        case 'modify_order':             return await this.modifyOrder(args);
        case 'cancel_order':             return await this.cancelOrder(args);
        case 'check_order_impact':       return await this.checkOrderImpact(args);
        case 'get_market_data_snapshot': return await this.getMarketDataSnapshot(args);
        case 'get_exchange_components':  return await this.getExchangeComponents(args);
        case 'get_security_definition':  return await this.getSecurityDefinition(args);
        case 'get_request_token':        return await this.getRequestToken(args);
        case 'get_access_token':         return await this.getAccessToken(args);
        case 'get_live_session_token':   return await this.getLiveSessionToken();
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

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async ibRequest(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `IBKR API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `IBKR returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  // ── Account methods ────────────────────────────────────────────────────────

  private async listAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const account = args['account'] as string;
    return this.ibRequest(this.url(`/accounts?account=${encodeURIComponent(account)}`));
  }

  private async getAccountSummary(args: Record<string, unknown>): Promise<ToolResult> {
    const account = args['account'] as string;
    return this.ibRequest(this.url(`/accounts/${encodeURIComponent(account)}/summary`));
  }

  private async getAccountPositions(args: Record<string, unknown>): Promise<ToolResult> {
    const account = args['account'] as string;
    return this.ibRequest(this.url(`/accounts/${encodeURIComponent(account)}/positions`));
  }

  private async getAccountTrades(args: Record<string, unknown>): Promise<ToolResult> {
    const account = args['account'] as string;
    return this.ibRequest(this.url(`/accounts/${encodeURIComponent(account)}/trades`));
  }

  // ── Order methods ─────────────────────────────────────────────────────────

  private async listOpenOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const account = args['account'] as string;
    return this.ibRequest(this.url(`/accounts/${encodeURIComponent(account)}/orders`));
  }

  private async getOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const account = args['account'] as string;
    const orderId = args['customer_order_id'] as string;
    return this.ibRequest(this.url(`/accounts/${encodeURIComponent(account)}/orders/${encodeURIComponent(orderId)}`));
  }

  private async placeOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const account = args['account'] as string;
    const { account: _a, ...body } = args;
    return this.ibRequest(
      this.url(`/accounts/${encodeURIComponent(account)}/orders`),
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async modifyOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const account = args['account'] as string;
    const orderId = args['customer_order_id'] as string;
    const { account: _a, customer_order_id: _o, ...body } = args;
    return this.ibRequest(
      this.url(`/accounts/${encodeURIComponent(account)}/orders/${encodeURIComponent(orderId)}`),
      { method: 'PUT', body: JSON.stringify(body) },
    );
  }

  private async cancelOrder(args: Record<string, unknown>): Promise<ToolResult> {
    const account = args['account'] as string;
    const orderId = args['customer_order_id'] as string;
    return this.ibRequest(
      this.url(`/accounts/${encodeURIComponent(account)}/orders/${encodeURIComponent(orderId)}`),
      { method: 'DELETE' },
    );
  }

  private async checkOrderImpact(args: Record<string, unknown>): Promise<ToolResult> {
    const account = args['account'] as string;
    const { account: _a, ...body } = args;
    return this.ibRequest(
      this.url(`/accounts/${encodeURIComponent(account)}/order_impact`),
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  // ── Market Data methods ────────────────────────────────────────────────────

  private async getMarketDataSnapshot(args: Record<string, unknown>): Promise<ToolResult> {
    const conids = args['conids'] as string;
    const fields = args['fields'] as string | undefined;
    let url = this.url(`/marketdata/snapshot?conids=${encodeURIComponent(conids)}`);
    if (fields) url += `&fields=${encodeURIComponent(fields)}`;
    return this.ibRequest(url);
  }

  private async getExchangeComponents(args: Record<string, unknown>): Promise<ToolResult> {
    const exchange = args['exchange'] as string;
    return this.ibRequest(this.url(`/marketdata/exchange_components?exchange=${encodeURIComponent(exchange)}`));
  }

  // ── Security Definition ───────────────────────────────────────────────────

  private async getSecurityDefinition(args: Record<string, unknown>): Promise<ToolResult> {
    const symbols = args['symbols'] as string;
    return this.ibRequest(this.url(`/secdef?symbols=${encodeURIComponent(symbols)}`));
  }

  // ── OAuth methods ─────────────────────────────────────────────────────────

  private async getRequestToken(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args['oauth_callback']) body['oauth_callback'] = args['oauth_callback'];
    return this.ibRequest(this.url('/oauth/request_token'), { method: 'POST', body: JSON.stringify(body) });
  }

  private async getAccessToken(args: Record<string, unknown>): Promise<ToolResult> {
    return this.ibRequest(
      this.url('/oauth/access_token'),
      { method: 'POST', body: JSON.stringify(args) },
    );
  }

  private async getLiveSessionToken(): Promise<ToolResult> {
    return this.ibRequest(this.url('/oauth/live_session_token'), { method: 'POST', body: JSON.stringify({}) });
  }
}
