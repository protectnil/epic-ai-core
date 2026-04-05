/**
 * 1Forge Finance APIs MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official 1Forge MCP server was found on GitHub. We build a full REST wrapper
// for complete Finance API coverage.
//
// Base URL: https://1forge.com/forex-quotes
// Auth: API key query parameter (api_key)
// Docs: https://1forge.com/forex-data-api/api-documentation
// Spec: https://api.apis.guru/v2/specs/1forge.com/0.0.1/swagger.json
// Category: finance
// Rate limits: Depends on plan — free tier: 1,000 requests/day

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OneForgeConfig {
  apiKey: string;
  baseUrl?: string;
}

export class OneForgeMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OneForgeConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://1forge.com/forex-quotes';
  }

  static catalog() {
    return {
      name: '1forge',
      displayName: '1Forge Finance APIs',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        '1forge', 'forex', 'fx', 'currency', 'exchange rate', 'quotes',
        'foreign exchange', 'stock', 'realtime quotes', 'financial data',
        'market data', 'currency pairs', 'symbols',
      ],
      toolNames: ['get_quotes', 'get_symbols'],
      description: '1Forge Finance APIs: fetch real-time forex quotes and retrieve the list of available currency pair symbols.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_quotes',
        description: 'Get real-time forex quotes for all available currency pair symbols from 1Forge',
        inputSchema: {
          type: 'object',
          properties: {
            pairs: {
              type: 'string',
              description: 'Comma-separated list of currency pairs to quote (e.g., EURUSD,GBPUSD,USDJPY). If omitted, returns all available quotes.',
            },
          },
        },
      },
      {
        name: 'get_symbols',
        description: 'Get the list of all available forex currency pair symbols for which 1Forge provides real-time quotes',
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
        case 'get_quotes':   return this.getQuotes(args);
        case 'get_symbols':  return this.getSymbols();
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

  private async request(path: string): Promise<ToolResult> {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${path}${separator}api_key=${encodeURIComponent(this.apiKey)}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getQuotes(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.pairs) {
      return this.request(`/quotes?pairs=${encodeURIComponent(args.pairs as string)}`);
    }
    return this.request('/quotes');
  }

  private async getSymbols(): Promise<ToolResult> {
    return this.request('/symbols');
  }
}
