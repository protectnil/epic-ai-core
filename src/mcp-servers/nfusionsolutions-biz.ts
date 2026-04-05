/**
 * nFusion Solutions MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official nFusion Solutions MCP server was found on GitHub.
//
// Base URL: https://api.nfusionsolutions.biz
// Auth: token query parameter (API key required on all requests)
// Docs: https://nfusionsolutions.com/data-feeds/
// Rate limits: Not publicly documented; contact nFusion for enterprise limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NFusionSolutionsConfig {
  token: string;
  baseUrl?: string;
}

export class NFusionSolutionsMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: NFusionSolutionsConfig) {
    super();
    this.token = config.token;
    this.baseUrl = config.baseUrl || 'https://api.nfusionsolutions.biz';
  }

  static catalog() {
    return {
      name: 'nfusionsolutions-biz',
      displayName: 'nFusion Solutions Market Data',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'nfusion', 'nfusionsolutions', 'precious metals', 'gold', 'silver', 'platinum', 'palladium',
        'spot price', 'metal price', 'bullion', 'commodity price', 'benchmark price',
        'gold price', 'silver price', 'metal spot', 'gold benchmark', 'silver benchmark',
        'currency rate', 'fx rate', 'forex', 'exchange rate', 'metal ratio',
        'gold silver ratio', 'historical price', 'market data', 'commodity data',
      ],
      toolNames: [
        'get_currency_history',
        'list_supported_currency_pairs_history',
        'get_currency_rate',
        'list_supported_currency_pairs_rate',
        'get_currency_summary',
        'list_supported_currency_pairs_summary',
        'get_metal_benchmark_history',
        'get_metal_benchmark_summary',
        'list_supported_benchmark_metals',
        'get_metal_spot_history',
        'get_metal_spot_performance',
        'get_metal_spot_annual_performance',
        'get_metal_spot_ratio_history',
        'get_metal_spot_ratio_summary',
        'get_metal_spot_summary',
        'list_supported_spot_metals',
        'list_supported_currencies_for_metals',
      ],
      description: 'nFusion Solutions precious metals and currency market data: real-time spot prices, benchmark prices, historical rates, and performance analytics for gold, silver, platinum, palladium, and 100+ currencies.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Currency Rates ─────────────────────────────────────────────────────
      {
        name: 'get_currency_history',
        description: 'Get historical exchange rates for one or more currency pairs over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            pairs: {
              type: 'string',
              description: 'Comma-separated list of currency pairs (e.g. USD/EUR,USD/GBP)',
            },
            start: {
              type: 'string',
              description: 'Start date in ISO 8601 format (e.g. 2024-01-01)',
            },
            end: {
              type: 'string',
              description: 'End date in ISO 8601 format (e.g. 2024-12-31)',
            },
            interval: {
              type: 'string',
              description: 'Data interval (e.g. day, hour)',
            },
          },
          required: ['pairs'],
        },
      },
      {
        name: 'list_supported_currency_pairs_history',
        description: 'Get the list of currency pairs supported by the historical rates endpoint',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_currency_rate',
        description: 'Get the latest mid-market exchange rate for one or more currency pairs',
        inputSchema: {
          type: 'object',
          properties: {
            pairs: {
              type: 'string',
              description: 'Comma-separated list of currency pairs (e.g. USD/EUR,USD/GBP)',
            },
          },
          required: ['pairs'],
        },
      },
      {
        name: 'list_supported_currency_pairs_rate',
        description: 'Get the list of currency pairs supported by the live rate endpoint',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_currency_summary',
        description: 'Get the latest summary (open, high, low, close, mid rate) for one or more currency pairs',
        inputSchema: {
          type: 'object',
          properties: {
            pairs: {
              type: 'string',
              description: 'Comma-separated list of currency pairs (e.g. USD/EUR,USD/GBP)',
            },
          },
          required: ['pairs'],
        },
      },
      {
        name: 'list_supported_currency_pairs_summary',
        description: 'Get the list of currency pairs supported by the summary endpoint',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      // ── Metals — Benchmark ─────────────────────────────────────────────────
      {
        name: 'get_metal_benchmark_history',
        description: 'Get historical benchmark (official fixing) prices for precious metals such as the LBMA Gold Fix',
        inputSchema: {
          type: 'object',
          properties: {
            metals: {
              type: 'string',
              description: 'Comma-separated list of metal symbols (e.g. XAU,XAG for gold and silver)',
            },
            start: {
              type: 'string',
              description: 'Start date in ISO 8601 format (e.g. 2024-01-01)',
            },
            end: {
              type: 'string',
              description: 'End date in ISO 8601 format (e.g. 2024-12-31)',
            },
            interval: {
              type: 'string',
              description: 'Data interval (e.g. day)',
            },
            historicalfx: {
              type: 'boolean',
              description: 'Use historical FX rates for currency conversion (true) or current rates (false)',
            },
            currency: {
              type: 'string',
              description: 'Currency for price conversion, defaults to USD (e.g. EUR, GBP)',
            },
            unitofmeasure: {
              type: 'string',
              description: 'Unit of weight: mg, g, kg, gr, oz, toz (troy ounce, default), ct, dwt',
            },
          },
          required: ['metals'],
        },
      },
      {
        name: 'get_metal_benchmark_summary',
        description: 'Get the latest benchmark prices for precious metals including the most recent official fixing price',
        inputSchema: {
          type: 'object',
          properties: {
            metals: {
              type: 'string',
              description: 'Comma-separated list of metal symbols (e.g. XAU,XAG for gold and silver)',
            },
            currency: {
              type: 'string',
              description: 'Currency for price conversion, defaults to USD (e.g. EUR, GBP)',
            },
            unitofmeasure: {
              type: 'string',
              description: 'Unit of weight: mg, g, kg, gr, oz, toz (troy ounce, default), ct, dwt',
            },
          },
          required: ['metals'],
        },
      },
      {
        name: 'list_supported_benchmark_metals',
        description: 'Get the list of metals supported by the benchmark price endpoints',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      // ── Metals — Spot ──────────────────────────────────────────────────────
      {
        name: 'get_metal_spot_history',
        description: 'Get historical spot prices for precious metals (gold, silver, platinum, palladium) over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            metals: {
              type: 'string',
              description: 'Comma-separated list of metal symbols (e.g. XAU,XAG,XPT,XPD)',
            },
            start: {
              type: 'string',
              description: 'Start date in ISO 8601 format (e.g. 2024-01-01)',
            },
            end: {
              type: 'string',
              description: 'End date in ISO 8601 format (e.g. 2024-12-31)',
            },
            interval: {
              type: 'string',
              description: 'Data interval (e.g. day, hour)',
            },
            historicalfx: {
              type: 'boolean',
              description: 'Use historical FX rates for currency conversion',
            },
            currency: {
              type: 'string',
              description: 'Currency for price conversion, defaults to USD',
            },
            unitofmeasure: {
              type: 'string',
              description: 'Unit of weight: mg, g, kg, gr, oz, toz (troy ounce, default), ct, dwt',
            },
          },
          required: ['metals'],
        },
      },
      {
        name: 'get_metal_spot_performance',
        description: 'Get historical performance metrics (percent change over periods) for precious metals spot prices',
        inputSchema: {
          type: 'object',
          properties: {
            metals: {
              type: 'string',
              description: 'Comma-separated list of metal symbols (e.g. XAU,XAG)',
            },
            currency: {
              type: 'string',
              description: 'Currency for price conversion, defaults to USD',
            },
            unitofmeasure: {
              type: 'string',
              description: 'Unit of weight: mg, g, kg, gr, oz, toz (troy ounce, default), ct, dwt',
            },
          },
          required: ['metals'],
        },
      },
      {
        name: 'get_metal_spot_annual_performance',
        description: 'Get historical annual performance (year-over-year returns) for precious metals spot prices',
        inputSchema: {
          type: 'object',
          properties: {
            metals: {
              type: 'string',
              description: 'Comma-separated list of metal symbols (e.g. XAU,XAG)',
            },
            currency: {
              type: 'string',
              description: 'Currency for price conversion, defaults to USD',
            },
            unitofmeasure: {
              type: 'string',
              description: 'Unit of weight: mg, g, kg, gr, oz, toz (troy ounce, default), ct, dwt',
            },
            years: {
              type: 'number',
              description: 'Number of years of annual performance data to return',
            },
          },
          required: ['metals'],
        },
      },
      {
        name: 'get_metal_spot_ratio_history',
        description: 'Get historical ratio prices between two precious metals (e.g. gold/silver ratio) over a date range',
        inputSchema: {
          type: 'object',
          properties: {
            pairs: {
              type: 'string',
              description: 'Comma-separated list of metal ratio pairs (e.g. XAU/XAG for gold-to-silver ratio)',
            },
            start: {
              type: 'string',
              description: 'Start date in ISO 8601 format (e.g. 2024-01-01)',
            },
            end: {
              type: 'string',
              description: 'End date in ISO 8601 format (e.g. 2024-12-31)',
            },
            interval: {
              type: 'string',
              description: 'Data interval (e.g. day, hour)',
            },
          },
          required: ['pairs'],
        },
      },
      {
        name: 'get_metal_spot_ratio_summary',
        description: 'Get the latest spot ratio summary between two precious metals (e.g. current gold/silver ratio)',
        inputSchema: {
          type: 'object',
          properties: {
            pairs: {
              type: 'string',
              description: 'Comma-separated list of metal ratio pairs (e.g. XAU/XAG)',
            },
          },
          required: ['pairs'],
        },
      },
      {
        name: 'get_metal_spot_summary',
        description: 'Get the latest spot price summary for precious metals including bid, ask, open, high, low, and close',
        inputSchema: {
          type: 'object',
          properties: {
            metals: {
              type: 'string',
              description: 'Comma-separated list of metal symbols (e.g. XAU,XAG,XPT,XPD)',
            },
            currency: {
              type: 'string',
              description: 'Currency for price conversion, defaults to USD',
            },
            unitofmeasure: {
              type: 'string',
              description: 'Unit of weight: mg, g, kg, gr, oz, toz (troy ounce, default), ct, dwt',
            },
          },
          required: ['metals'],
        },
      },
      {
        name: 'list_supported_spot_metals',
        description: 'Get the list of metals (gold, silver, platinum, palladium, etc.) supported by the spot price endpoints',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'list_supported_currencies_for_metals',
        description: 'Get the list of currencies available for metal price conversion (e.g. USD, EUR, GBP, JPY)',
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
        case 'get_currency_history':                   return this.getCurrencyHistory(args);
        case 'list_supported_currency_pairs_history':  return this.listSupportedCurrencyPairsHistory();
        case 'get_currency_rate':                      return this.getCurrencyRate(args);
        case 'list_supported_currency_pairs_rate':     return this.listSupportedCurrencyPairsRate();
        case 'get_currency_summary':                   return this.getCurrencySummary(args);
        case 'list_supported_currency_pairs_summary':  return this.listSupportedCurrencyPairsSummary();
        case 'get_metal_benchmark_history':            return this.getMetalBenchmarkHistory(args);
        case 'get_metal_benchmark_summary':            return this.getMetalBenchmarkSummary(args);
        case 'list_supported_benchmark_metals':        return this.listSupportedBenchmarkMetals();
        case 'get_metal_spot_history':                 return this.getMetalSpotHistory(args);
        case 'get_metal_spot_performance':             return this.getMetalSpotPerformance(args);
        case 'get_metal_spot_annual_performance':      return this.getMetalSpotAnnualPerformance(args);
        case 'get_metal_spot_ratio_history':           return this.getMetalSpotRatioHistory(args);
        case 'get_metal_spot_ratio_summary':           return this.getMetalSpotRatioSummary(args);
        case 'get_metal_spot_summary':                 return this.getMetalSpotSummary(args);
        case 'list_supported_spot_metals':             return this.listSupportedSpotMetals();
        case 'list_supported_currencies_for_metals':   return this.listSupportedCurrenciesForMetals();
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

  private async get(path: string, params?: Record<string, string | number | boolean>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('token', this.token);
    url.searchParams.set('format', 'json');
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.set(k, String(v));
        }
      }
    }
    const response = await this.fetchWithRetry(url.toString(), {});
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Currency implementations ───────────────────────────────────────────────

  private async getCurrencyHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pairs) {
      return { content: [{ type: 'text', text: 'pairs is required' }], isError: true };
    }
    const params: Record<string, string> = { pairs: args.pairs as string };
    if (args.start)    params.start    = args.start as string;
    if (args.end)      params.end      = args.end as string;
    if (args.interval) params.interval = args.interval as string;
    return this.get('/api/v1/Currencies/history', params);
  }

  private async listSupportedCurrencyPairsHistory(): Promise<ToolResult> {
    return this.get('/api/v1/Currencies/history/supported');
  }

  private async getCurrencyRate(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pairs) {
      return { content: [{ type: 'text', text: 'pairs is required' }], isError: true };
    }
    return this.get('/api/v1/Currencies/rate', { pairs: args.pairs as string });
  }

  private async listSupportedCurrencyPairsRate(): Promise<ToolResult> {
    return this.get('/api/v1/Currencies/rate/supported');
  }

  private async getCurrencySummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pairs) {
      return { content: [{ type: 'text', text: 'pairs is required' }], isError: true };
    }
    return this.get('/api/v1/Currencies/summary', { pairs: args.pairs as string });
  }

  private async listSupportedCurrencyPairsSummary(): Promise<ToolResult> {
    return this.get('/api/v1/Currencies/summary/supported');
  }

  // ── Metal benchmark implementations ───────────────────────────────────────

  private async getMetalBenchmarkHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.metals) {
      return { content: [{ type: 'text', text: 'metals is required' }], isError: true };
    }
    const params: Record<string, string | boolean> = { metals: args.metals as string };
    if (args.start)         params.start         = args.start as string;
    if (args.end)           params.end           = args.end as string;
    if (args.interval)      params.interval      = args.interval as string;
    if (args.historicalfx !== undefined) params.historicalfx = args.historicalfx as boolean;
    if (args.currency)      params.currency      = args.currency as string;
    if (args.unitofmeasure) params.unitofmeasure = args.unitofmeasure as string;
    return this.get('/api/v1/Metals/benchmark/history', params);
  }

  private async getMetalBenchmarkSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.metals) {
      return { content: [{ type: 'text', text: 'metals is required' }], isError: true };
    }
    const params: Record<string, string> = { metals: args.metals as string };
    if (args.currency)      params.currency      = args.currency as string;
    if (args.unitofmeasure) params.unitofmeasure = args.unitofmeasure as string;
    return this.get('/api/v1/Metals/benchmark/summary', params);
  }

  private async listSupportedBenchmarkMetals(): Promise<ToolResult> {
    return this.get('/api/v1/Metals/benchmark/supported');
  }

  // ── Metal spot implementations ─────────────────────────────────────────────

  private async getMetalSpotHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.metals) {
      return { content: [{ type: 'text', text: 'metals is required' }], isError: true };
    }
    const params: Record<string, string | boolean> = { metals: args.metals as string };
    if (args.start)         params.start         = args.start as string;
    if (args.end)           params.end           = args.end as string;
    if (args.interval)      params.interval      = args.interval as string;
    if (args.historicalfx !== undefined) params.historicalfx = args.historicalfx as boolean;
    if (args.currency)      params.currency      = args.currency as string;
    if (args.unitofmeasure) params.unitofmeasure = args.unitofmeasure as string;
    return this.get('/api/v1/Metals/spot/history', params);
  }

  private async getMetalSpotPerformance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.metals) {
      return { content: [{ type: 'text', text: 'metals is required' }], isError: true };
    }
    const params: Record<string, string> = { metals: args.metals as string };
    if (args.currency)      params.currency      = args.currency as string;
    if (args.unitofmeasure) params.unitofmeasure = args.unitofmeasure as string;
    return this.get('/api/v1/Metals/spot/performance', params);
  }

  private async getMetalSpotAnnualPerformance(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.metals) {
      return { content: [{ type: 'text', text: 'metals is required' }], isError: true };
    }
    const params: Record<string, string | number> = { metals: args.metals as string };
    if (args.currency)      params.currency      = args.currency as string;
    if (args.unitofmeasure) params.unitofmeasure = args.unitofmeasure as string;
    if (args.years)         params.years         = args.years as number;
    return this.get('/api/v1/Metals/spot/performance/annual', params);
  }

  private async getMetalSpotRatioHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pairs) {
      return { content: [{ type: 'text', text: 'pairs is required' }], isError: true };
    }
    const params: Record<string, string> = { pairs: args.pairs as string };
    if (args.start)    params.start    = args.start as string;
    if (args.end)      params.end      = args.end as string;
    if (args.interval) params.interval = args.interval as string;
    return this.get('/api/v1/Metals/spot/ratio/history', params);
  }

  private async getMetalSpotRatioSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pairs) {
      return { content: [{ type: 'text', text: 'pairs is required' }], isError: true };
    }
    return this.get('/api/v1/Metals/spot/ratio/summary', { pairs: args.pairs as string });
  }

  private async getMetalSpotSummary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.metals) {
      return { content: [{ type: 'text', text: 'metals is required' }], isError: true };
    }
    const params: Record<string, string> = { metals: args.metals as string };
    if (args.currency)      params.currency      = args.currency as string;
    if (args.unitofmeasure) params.unitofmeasure = args.unitofmeasure as string;
    return this.get('/api/v1/Metals/spot/summary', params);
  }

  private async listSupportedSpotMetals(): Promise<ToolResult> {
    return this.get('/api/v1/Metals/spot/supported');
  }

  private async listSupportedCurrenciesForMetals(): Promise<ToolResult> {
    return this.get('/api/v1/Metals/supported/currency');
  }
}
