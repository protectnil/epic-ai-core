/**
 * O2 Czech Republic Mobility API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official O2 Czech Republic Mobility MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 2 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://developer.o2.cz/mobility/sandbox/api
// Auth: None documented (sandbox API, open access)
// Docs: https://developer.o2.cz/portal/vop
// Spec: https://api.apis.guru/v2/specs/o2.cz/mobility/1.2.0/swagger.json
// Rate limits: Not publicly documented
// NOTE: Mobility (Transit) API provides time-aggregated data on movement between basic
// residential units in the Czech Republic, based on mobile station movement in the O2 network.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface O2CzMobilityConfig {
  baseUrl?: string;
}

export class O2CzMobilityMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: O2CzMobilityConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://developer.o2.cz/mobility/sandbox/api';
  }

  static catalog() {
    return {
      name: 'o2-cz-mobility',
      displayName: 'O2 CZ Mobility API',
      version: '1.0.0',
      category: 'analytics',
      keywords: [
        'o2', 'o2-cz', 'czech', 'czech republic', 'mobility', 'transit',
        'movement', 'travel', 'commute', 'origin', 'destination',
        'mobile', 'telecom', 'population', 'analytics', 'residential',
        'aggregated', 'flow', 'od-matrix', 'od matrix', 'from-to',
      ],
      toolNames: ['get_transit', 'get_info'],
      description: 'O2 Czech Republic Mobility API: query time-aggregated transit data representing movement of people between basic residential units in the Czech Republic, based on O2 mobile network data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_transit',
        description: 'Get count of people moving between two basic residential units (from to). Optionally filter by occurrence type at source (fromType) and destination (toType): 1=transit, 2=visit, 0=both. Set uniques=1 to count only unique individuals, 0 for all movements.',
        inputSchema: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Source basic residential unit ID (e.g. "127752")',
            },
            to: {
              type: 'string',
              description: 'Destination basic residential unit ID (e.g. "127761")',
            },
            uniques: {
              type: 'string',
              description: 'Count all movements (0) or only unique individuals (1)',
            },
            fromType: {
              type: 'string',
              description: 'Occurrence type at source: 1=transit, 2=visit, 0=both (optional)',
            },
            toType: {
              type: 'string',
              description: 'Occurrence type at destination: 1=transit, 2=visit, 0=both (optional)',
            },
          },
          required: ['from', 'to', 'uniques'],
        },
      },
      {
        name: 'get_info',
        description: 'Get version and data freshness information about the Mobility API application and backend.',
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
        case 'get_transit':
          return this.getTransit(args);
        case 'get_info':
          return this.getInfo();
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

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'No data available (204): the platform could not serve data for this request (differential privacy restriction or no data found).' }], isError: false };
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getTransit(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to || args.uniques === undefined || args.uniques === null || args.uniques === '') {
      return { content: [{ type: 'text', text: 'from, to, and uniques are required' }], isError: true };
    }
    const params = new URLSearchParams({ uniques: String(args.uniques) });
    if (args.fromType !== undefined && args.fromType !== '') params.set('fromType', String(args.fromType));
    if (args.toType !== undefined && args.toType !== '') params.set('toType', String(args.toType));
    return this.apiGet(`/transit/${encodeURIComponent(String(args.from))}/${encodeURIComponent(String(args.to))}?${params}`);
  }

  private async getInfo(): Promise<ToolResult> {
    return this.apiGet('/info');
  }
}
