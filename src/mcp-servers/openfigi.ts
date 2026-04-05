/**
 * OpenFIGI MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. OpenFIGI has not published an official MCP server.
//
// Base URL: https://api.openfigi.com/v1
// Auth: Optional API key via X-OPENFIGI-APIKEY header. Without key, rate limits apply.
// Docs: https://openfigi.com/api
// Rate limits: Unauthenticated: 25 req/min. Authenticated: higher limits.
// Spec: https://api.apis.guru/v2/specs/openfigi.com/1.4.0/openapi.json (OpenAPI 3.0)

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenFIGIConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class OpenFIGIMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenFIGIConfig = {}) {
    super();
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || 'https://api.openfigi.com/v1';
  }

  static catalog() {
    return {
      name: 'openfigi',
      displayName: 'OpenFIGI',
      version: '1.0.0',
      category: 'finance' as const,
      keywords: [
        'figi', 'financial instruments', 'securities', 'identifier', 'isin', 'cusip', 'sedol',
        'ticker', 'bloomberg', 'mapping', 'equities', 'bonds', 'derivatives', 'open data',
      ],
      toolNames: [
        'map_identifiers',
        'get_mapping_values',
      ],
      description: 'Map third-party financial instrument identifiers (ISIN, CUSIP, SEDOL, ticker, etc.) to FIGIs and retrieve valid enum values for mapping fields via the OpenFIGI API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'map_identifiers',
        description: 'Map one or more third-party financial instrument identifiers (ISIN, CUSIP, SEDOL, ticker, etc.) to FIGIs. Submit a batch of up to 100 mapping jobs. Each job requires idType and idValue; optional filters include exchCode, micCode, currency, marketSecDes, securityType, securityType2.',
        inputSchema: {
          type: 'object',
          properties: {
            jobs: {
              type: 'array',
              description: 'Array of mapping job objects. Each must have idType and idValue.',
              items: {
                type: 'object',
                properties: {
                  idType: {
                    type: 'string',
                    description: 'Identifier type. Examples: ID_ISIN, ID_CUSIP, ID_SEDOL, TICKER, ID_BB_GLOBAL, ID_WERTPAPIER, BASE_TICKER, OCC_SYMBOL',
                  },
                  idValue: {
                    type: 'string',
                    description: 'The identifier value (e.g. US0378331005 for an ISIN)',
                  },
                  exchCode: {
                    type: 'string',
                    description: 'Optional exchange code filter (e.g. US, LN)',
                  },
                  micCode: {
                    type: 'string',
                    description: 'Optional MIC (Market Identifier Code) filter',
                  },
                  currency: {
                    type: 'string',
                    description: 'Optional currency filter (e.g. USD, EUR)',
                  },
                  marketSecDes: {
                    type: 'string',
                    description: 'Optional market sector description filter',
                  },
                  securityType: {
                    type: 'string',
                    description: 'Optional security type filter',
                  },
                  securityType2: {
                    type: 'string',
                    description: 'Optional secondary security type filter (required for BASE_TICKER or ID_EXCH_SYMBOL in v3)',
                  },
                  includeUnlistedEquities: {
                    type: 'boolean',
                    description: 'Include unlisted equities in results',
                  },
                },
                required: ['idType', 'idValue'],
              },
            },
          },
          required: ['jobs'],
        },
      },
      {
        name: 'get_mapping_values',
        description: 'Retrieve valid enum values for a specific OpenFIGI mapping field. Use this to discover valid exchCode, micCode, currency, marketSecDes, securityType, securityType2, or idType values.',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'The field name to get values for. One of: idType, exchCode, micCode, currency, marketSecDes, securityType, securityType2',
              enum: ['idType', 'exchCode', 'micCode', 'currency', 'marketSecDes', 'securityType', 'securityType2'],
            },
          },
          required: ['key'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'map_identifiers':    return await this.mapIdentifiers(args);
        case 'get_mapping_values': return await this.getMappingValues(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Error calling ${name}: ${message}` }],
        isError: true,
      };
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.apiKey) {
      headers['X-OPENFIGI-APIKEY'] = this.apiKey;
    }
    return headers;
  }

  private async mapIdentifiers(args: Record<string, unknown>): Promise<ToolResult> {
    const jobs = args.jobs;
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return {
        content: [{ type: 'text', text: 'Missing or empty required parameter: jobs (must be a non-empty array)' }],
        isError: true,
      };
    }
    const url = `${this.baseUrl}/mapping`;
    const res = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(jobs),
    });
    const text = await res.text();
    const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n...[truncated]' : text;
    return {
      content: [{ type: 'text', text: truncated }],
      isError: !res.ok,
    };
  }

  private async getMappingValues(args: Record<string, unknown>): Promise<ToolResult> {
    const key = args.key;
    if (!key) {
      return {
        content: [{ type: 'text', text: 'Missing required parameter: key' }],
        isError: true,
      };
    }
    const url = `${this.baseUrl}/mapping/values/${encodeURIComponent(String(key))}`;
    const res = await this.fetchWithRetry(url, {
      headers: this.buildHeaders(),
    });
    const text = await res.text();
    const truncated = text.length > 10240 ? text.slice(0, 10240) + '\n...[truncated]' : text;
    return {
      content: [{ type: 'text', text: truncated }],
      isError: !res.ok,
    };
  }
}
