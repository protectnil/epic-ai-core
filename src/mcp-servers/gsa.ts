/**
 * GSA Discovery Market Research MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official GSA MCP server was found on GitHub.
//
// Base URL: https://discovery.gsa.gov
// Auth: None — public API, no authentication required
// Docs: https://discovery.gsa.gov/api/
// Rate limits: Not publicly documented; federal open data API

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GSAConfig {
  apiToken?: string;
  /** Optional base URL override (default: https://discovery.gsa.gov) */
  baseUrl?: string;
}

export class GSAMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: GSAConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://discovery.gsa.gov';
  }

  static catalog() {
    return {
      name: 'gsa',
      displayName: 'GSA Discovery Market Research',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'gsa', 'government', 'federal', 'vendor', 'contract', 'naics',
        'small business', 'set-aside', 'duns', 'fpds', 'acquisition',
        'procurement', 'market research', 'contractor', 'sam',
      ],
      toolNames: [
        'list_vendors', 'get_vendor', 'list_contracts',
        'list_naics', 'get_metadata',
      ],
      description: 'GSA Discovery Market Research: search federal vendors by NAICS code and set-aside, retrieve contract history from FPDS, and look up small business certifications.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_vendors',
        description: 'List federal contractors filtered by NAICS code, set-aside program, and vehicle type',
        inputSchema: {
          type: 'object',
          properties: {
            naics: {
              type: 'string',
              description: 'NAICS code to filter vendors by industry (e.g. 541511 for Custom Computer Programming)',
            },
            setasides: {
              type: 'string',
              description: 'Set-aside program codes (comma-separated): SBA, 8A, HubZone, SDVOSB, WOSB, EDWOSB',
            },
            vehicle: {
              type: 'string',
              description: 'Contract vehicle filter: oasissb, oasis, bmss, hcats, pss, alliant2sb, alliant2',
            },
          },
          required: ['naics'],
        },
      },
      {
        name: 'get_vendor',
        description: 'Get detailed information for a specific federal vendor by their 9-digit DUNS number',
        inputSchema: {
          type: 'object',
          properties: {
            duns: {
              type: 'string',
              description: '9-digit DUNS number of the vendor (e.g. 123456789)',
            },
          },
          required: ['duns'],
        },
      },
      {
        name: 'list_contracts',
        description: 'Get contract history from FPDS for a vendor with optional NAICS and sort filters',
        inputSchema: {
          type: 'object',
          properties: {
            duns: {
              type: 'string',
              description: '9-digit DUNS number of the vendor',
            },
            naics: {
              type: 'string',
              description: 'Filter contracts by NAICS code',
            },
            sort: {
              type: 'string',
              description: 'Field to sort by (e.g. date_signed, obligated_amount)',
            },
            direction: {
              type: 'string',
              description: 'Sort direction: asc or desc (default: desc)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
          },
          required: ['duns'],
        },
      },
      {
        name: 'list_naics',
        description: 'List all NAICS codes relevant to GSA OASIS and other contract vehicles',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_metadata',
        description: 'Get metadata for the most recent SAM and FPDS data loads in the GSA Discovery system',
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
        case 'list_vendors': return this.listVendors(args);
        case 'get_vendor': return this.getVendor(args);
        case 'list_contracts': return this.listContracts(args);
        case 'list_naics': return this.listNaics();
        case 'get_metadata': return this.getMetadata();
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

  private buildUrl(path: string, params: Record<string, unknown> = {}): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const q = qs.toString();
    return `${this.baseUrl}${path}${q ? '?' + q : ''}`;
  }

  private async get(path: string, params: Record<string, unknown> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.buildUrl(path, params), {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listVendors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.naics) return { content: [{ type: 'text', text: 'naics is required' }], isError: true };
    const params: Record<string, unknown> = { naics: args.naics };
    if (args.setasides) params['setasides'] = args.setasides;
    if (args.vehicle) params['vehicle'] = args.vehicle;
    return this.get('/api/vendors/', params);
  }

  private async getVendor(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.duns) return { content: [{ type: 'text', text: 'duns is required' }], isError: true };
    return this.get(`/api/vendor/${encodeURIComponent(args.duns as string)}`);
  }

  private async listContracts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.duns) return { content: [{ type: 'text', text: 'duns is required' }], isError: true };
    const params: Record<string, unknown> = { duns: args.duns };
    if (args.naics) params['naics'] = args.naics;
    if (args.sort) params['sort'] = args.sort;
    if (args.direction) params['direction'] = args.direction;
    if (args.page !== undefined) params['page'] = args.page;
    return this.get('/api/contracts/', params);
  }

  private async listNaics(): Promise<ToolResult> {
    return this.get('/api/naics/');
  }

  private async getMetadata(): Promise<ToolResult> {
    return this.get('/api/metadata/');
  }
}
