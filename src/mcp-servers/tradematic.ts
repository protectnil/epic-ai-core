/**
 * Tradematic MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official Tradematic MCP server was found on GitHub. Tradematic Cloud is a trading
// infrastructure platform with a REST API for algorithmic strategy management, order
// execution, backtesting, and market data access.
//
// Base URL: https://api.tradematic.com
// Auth: API key passed as header 'X-API-Key' on every request
// Docs: https://tradematic.cloud / https://tradematic.cloud/sdk/swagger.yaml
// Rate limits: Not publicly documented; subject to plan tier limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TradermaticConfig {
  apiKey: string;
  /** Optional base URL override (default: https://api.tradematic.com) */
  baseUrl?: string;
}

export class TradermaticMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: TradermaticConfig) {
    super();
    this.apiKey  = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.tradematic.com';
  }

  static catalog() {
    return {
      name: 'tradematic',
      displayName: 'Tradematic',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'tradematic', 'trading', 'finance', 'algorithmic', 'strategy', 'backtest',
        'order', 'portfolio', 'account', 'broker', 'stocks', 'forex', 'crypto',
        'signals', 'market data', 'historical data', 'equity', 'positions',
        'autofollow', 'connections', 'connectors', 'symbols', 'markets',
      ],
      toolNames: [
        'list_accounts',
        'get_account',
        'list_orders',
        'place_order',
        'close_all_positions',
        'list_strategies',
        'start_strategy',
        'stop_strategy',
        'list_autofollow_strategies',
        'get_autofollow_strategy',
        'list_markets',
        'list_symbols',
        'get_historical_data',
        'list_connections',
        'create_connection',
        'list_tasks',
        'get_task_status',
        'get_task_performance',
        'get_server_time',
        'ping',
      ],
      description: 'Tradematic Cloud trading infrastructure: manage trading accounts, place and cancel orders, run algorithmic strategies, run backtests, retrieve market data and historical OHLCV, and manage broker connections.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Accounts ────────────────────────────────────────────────────────────
      {
        name: 'list_accounts',
        description: 'List all trading accounts linked to this Tradematic Cloud user',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_account',
        description: 'Get a single trading account by its numeric account ID',
        inputSchema: {
          type: 'object',
          properties: {
            accountid: {
              type: 'integer',
              description: 'Numeric trading account ID',
            },
          },
          required: ['accountid'],
        },
      },
      // ── Orders ──────────────────────────────────────────────────────────────
      {
        name: 'list_orders',
        description: 'Get all open orders for a trading account',
        inputSchema: {
          type: 'object',
          properties: {
            accountid: {
              type: 'integer',
              description: 'Numeric trading account ID',
            },
          },
          required: ['accountid'],
        },
      },
      {
        name: 'place_order',
        description: 'Place a new buy or sell order on a trading account',
        inputSchema: {
          type: 'object',
          properties: {
            accountid: {
              type: 'integer',
              description: 'Numeric trading account ID',
            },
            buy: {
              type: 'string',
              description: '"true" to buy, "false" to sell',
            },
            symbol: {
              type: 'string',
              description: 'Instrument symbol to trade (e.g. AAPL, EURUSD)',
            },
            shares: {
              type: 'string',
              description: 'Number of shares/units to trade',
            },
            price: {
              type: 'string',
              description: 'Limit price (omit for market order)',
            },
            type: {
              type: 'string',
              description: 'Order type (e.g. market, limit)',
            },
          },
          required: ['accountid', 'buy', 'symbol', 'shares'],
        },
      },
      {
        name: 'close_all_positions',
        description: 'Close all open positions for a trading account',
        inputSchema: {
          type: 'object',
          properties: {
            accountid: {
              type: 'integer',
              description: 'Numeric trading account ID',
            },
          },
          required: ['accountid'],
        },
      },
      // ── Strategies ──────────────────────────────────────────────────────────
      {
        name: 'list_strategies',
        description: 'List all active (currently executing) strategies on the cloud',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'start_strategy',
        description: 'Start executing a strategy for a trading account',
        inputSchema: {
          type: 'object',
          properties: {
            strategyid: {
              type: 'string',
              description: 'Strategy ID to start',
            },
            accountid: {
              type: 'string',
              description: 'Account ID to run the strategy on',
            },
          },
          required: ['strategyid', 'accountid'],
        },
      },
      {
        name: 'stop_strategy',
        description: 'Stop an active strategy execution by its strategy ID',
        inputSchema: {
          type: 'object',
          properties: {
            strategyid: {
              type: 'string',
              description: 'ID of the executing strategy to stop',
            },
          },
          required: ['strategyid'],
        },
      },
      // ── Autofollow ──────────────────────────────────────────────────────────
      {
        name: 'list_autofollow_strategies',
        description: 'List all available autofollow strategies (copy-trading strategies)',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_autofollow_strategy',
        description: 'Get details and recent signals for a specific autofollow strategy',
        inputSchema: {
          type: 'object',
          properties: {
            strategyid: {
              type: 'string',
              description: 'Autofollow strategy ID',
            },
            signal_count: {
              type: 'integer',
              description: 'Number of recent trading signals to return (optional)',
            },
          },
          required: ['strategyid'],
        },
      },
      // ── Market Data ─────────────────────────────────────────────────────────
      {
        name: 'list_markets',
        description: 'List all available markets (exchanges/brokers) on Tradematic Cloud',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'list_symbols',
        description: 'List tradable symbols/instruments for a given market, with optional filter',
        inputSchema: {
          type: 'object',
          properties: {
            marketid: {
              type: 'integer',
              description: 'Numeric market ID to list symbols for',
            },
            filter: {
              type: 'integer',
              description: 'Symbol filter type ID (market-specific, e.g. 0=all)',
            },
          },
          required: ['marketid', 'filter'],
        },
      },
      {
        name: 'get_historical_data',
        description: 'Get OHLCV historical data for a symbol over a time range',
        inputSchema: {
          type: 'object',
          properties: {
            symbolid: {
              type: 'integer',
              description: 'Numeric symbol ID',
            },
            tf: {
              type: 'integer',
              description: 'Timeframe in minutes (e.g. 1, 5, 15, 60, 1440)',
            },
            from: {
              type: 'integer',
              description: 'Start of range as Unix timestamp (seconds)',
            },
            to: {
              type: 'integer',
              description: 'End of range as Unix timestamp (seconds)',
            },
          },
          required: ['symbolid', 'tf', 'from', 'to'],
        },
      },
      // ── Connections ─────────────────────────────────────────────────────────
      {
        name: 'list_connections',
        description: 'List all broker/exchange connections configured on this account',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'create_connection',
        description: 'Create a new broker or exchange connection',
        inputSchema: {
          type: 'object',
          properties: {
            connectorid: {
              type: 'string',
              description: 'Connector type ID (see list_connectors)',
            },
            login: {
              type: 'string',
              description: 'Broker login/username',
            },
            password: {
              type: 'string',
              description: 'Broker password',
            },
            host: {
              type: 'string',
              description: 'Broker server host (if applicable)',
            },
            port: {
              type: 'string',
              description: 'Broker server port (if applicable)',
            },
            active: {
              type: 'string',
              description: '"true" to activate the connection immediately',
            },
          },
          required: ['connectorid', 'login', 'password'],
        },
      },
      // ── Task Manager (Backtesting) ───────────────────────────────────────────
      {
        name: 'list_tasks',
        description: 'List all backtest/optimization tasks',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_task_status',
        description: 'Get the current execution status of a backtest or optimization task',
        inputSchema: {
          type: 'object',
          properties: {
            taskid: {
              type: 'string',
              description: 'Task ID to check status for',
            },
          },
          required: ['taskid'],
        },
      },
      {
        name: 'get_task_performance',
        description: 'Get backtest performance statistics (Sharpe, max drawdown, CAGR, etc.) for a completed task',
        inputSchema: {
          type: 'object',
          properties: {
            taskid: {
              type: 'string',
              description: 'Completed task ID',
            },
          },
          required: ['taskid'],
        },
      },
      // ── Utilities ────────────────────────────────────────────────────────────
      {
        name: 'get_server_time',
        description: 'Get the current Tradematic Cloud server time',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'ping',
        description: 'Ping the Tradematic Cloud API to check connectivity and latency',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_accounts':
          return await this._get('/cloud/accounts');

        case 'get_account':
          return await this._get(`/cloud/accounts/${args.accountid}`);

        case 'list_orders':
          return await this._get(`/cloud/accounts/${args.accountid}/orders`);

        case 'place_order': {
          const { accountid, ...rest } = args;
          const order: Record<string, unknown> = {};
          if (rest.buy     != null) order.buy    = String(rest.buy);
          if (rest.symbol  != null) order.symbol = String(rest.symbol);
          if (rest.shares  != null) order.shares = String(rest.shares);
          if (rest.price   != null) order.price  = String(rest.price);
          if (rest.type    != null) order.type   = String(rest.type);
          return await this._post(`/cloud/accounts/${accountid}/orders`, { order });
        }

        case 'close_all_positions':
          return await this._post(`/cloud/accounts/${args.accountid}/closeall`, {});

        case 'list_strategies':
          return await this._get('/cloud/strategies');

        case 'start_strategy':
          return await this._post('/cloud/strategies/start', {
            data: { strategyid: String(args.strategyid), accountid: String(args.accountid) },
          });

        case 'stop_strategy':
          return await this._post(`/cloud/strategies/${args.strategyid}/stop`, {});

        case 'list_autofollow_strategies':
          return await this._get('/autofollow/strategies');

        case 'get_autofollow_strategy': {
          const sid = String(args.strategyid ?? '');
          if (args.signal_count != null) {
            return await this._get(`/autofollow/strategies/${sid}/signals`, {
              count: String(args.signal_count),
            });
          }
          return await this._get(`/autofollow/strategies/${sid}`);
        }

        case 'list_markets':
          return await this._get('/marketdata/markets');

        case 'list_symbols': {
          const params: Record<string, string> = {
            marketid: String(args.marketid ?? ''),
            filter:   String(args.filter   ?? '0'),
          };
          return await this._get('/marketdata/symbols', params);
        }

        case 'get_historical_data': {
          const params: Record<string, string> = {
            tf:   String(args.tf   ?? ''),
            from: String(args.from ?? ''),
            to:   String(args.to   ?? ''),
          };
          return await this._get(`/marketdata/symbols/${args.symbolid}/histdata`, params);
        }

        case 'list_connections':
          return await this._get('/cloud/connections');

        case 'create_connection': {
          const connection: Record<string, unknown> = {};
          if (args.connectorid != null) connection.connectorid = String(args.connectorid);
          if (args.login       != null) connection.login       = String(args.login);
          if (args.password    != null) connection.password    = String(args.password);
          if (args.host        != null) connection.host        = String(args.host);
          if (args.port        != null) connection.port        = String(args.port);
          if (args.active      != null) connection.active      = String(args.active);
          return await this._post('/cloud/connections', { connection });
        }

        case 'list_tasks':
          return await this._get('/taskmanager/tasks');

        case 'get_task_status':
          return await this._get(`/taskmanager/tasks/${args.taskid}/status`);

        case 'get_task_performance':
          return await this._get(`/taskmanager/tasks/${args.taskid}/performance`);

        case 'get_server_time':
          return await this._get('/time');

        case 'ping':
          return await this._get('/ping');

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Tradematic API error: ${message}` }],
        isError: true,
      };
    }
  }

  private async _get(path: string, query: Record<string, string> = {}): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, v);
    }
    return this._request('GET', url.toString());
  }

  private async _post(path: string, body: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    return this._request('POST', url, body);
  }

  private async _request(method: string, url: string, body?: unknown): Promise<ToolResult> {
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Accept':    'application/json',
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await this.fetchWithRetry(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const raw = await response.text();
    const truncated = raw.length > 10240 ? raw.slice(0, 10240) + '\n…[truncated]' : raw;

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `HTTP ${response.status}: ${truncated}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }
}
