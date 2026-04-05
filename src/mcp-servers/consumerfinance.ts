/**
 * Consumer Financial Protection Bureau MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Consumer Financial Protection Bureau MCP server was found on GitHub as of 2026-03-28.
// Our adapter covers: 6 tools. Vendor MCP covers: 0 tools (none exists).
// Recommendation: use-rest-api — no official MCP server exists.
//
// Base URL: https://api.consumerfinance.gov
// Auth: None — public API, no authentication required
// Docs: https://cfpb.github.io/api/hmda/
// Rate limits: Not documented. Public API; standard fair-use expected.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ConsumerFinanceConfig {
  /** Optional base URL override (default: https://api.consumerfinance.gov) */
  baseUrl?: string;
}

export class ConsumerFinanceMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: ConsumerFinanceConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'https://api.consumerfinance.gov';
  }

  static catalog() {
    return {
      name: 'consumerfinance',
      displayName: 'Consumer Financial Protection Bureau',
      version: '1.0.0',
      category: 'government',
      keywords: [
        'consumerfinance', 'cfpb', 'hmda', 'mortgage', 'home-mortgage', 'lending',
        'financial-protection', 'government', 'federal', 'loan', 'disclosure',
        'housing', 'regulation', 'consumer', 'financial', 'bureau',
      ],
      toolNames: [
        'list_datasets', 'get_dataset', 'get_hmda_dataset',
        'get_hmda_concept', 'query_hmda_slice', 'get_hmda_slice_metadata',
      ],
      description: 'CFPB public HMDA (Home Mortgage Disclosure Act) data: query mortgage loan records, dataset metadata, slice exploration, and concept definitions.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_datasets',
        description: 'List all datasets available from the CFPB public data API including HMDA mortgage disclosure data',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_dataset',
        description: 'Get metadata about a specific CFPB dataset by name, including its description and available slices',
        inputSchema: {
          type: 'object',
          properties: {
            dataset: {
              type: 'string',
              description: 'Name of the dataset (e.g. hmda)',
            },
          },
          required: ['dataset'],
        },
      },
      {
        name: 'get_hmda_dataset',
        description: 'Get metadata for the HMDA (Home Mortgage Disclosure Act) dataset including available slices and concepts',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_hmda_concept',
        description: 'Get information about a specific HMDA data concept such as loan type, action taken, or applicant race',
        inputSchema: {
          type: 'object',
          properties: {
            concept: {
              type: 'string',
              description: 'Name of the HMDA concept to retrieve (e.g. loan_type, action_taken, applicant_race)',
            },
          },
          required: ['concept'],
        },
      },
      {
        name: 'query_hmda_slice',
        description: 'Query a HMDA data slice with SQL-style filters, grouping, ordering, and pagination for mortgage loan data',
        inputSchema: {
          type: 'object',
          properties: {
            slice: {
              type: 'string',
              description: 'Name of the HMDA slice to query (e.g. hmda_lar)',
            },
            select: {
              type: 'string',
              description: 'Comma-separated fields to return (default: all fields)',
            },
            where: {
              type: 'string',
              description: 'SQL WHERE-style filter conditions (e.g. "state_code = CA AND action_taken = 1")',
            },
            group: {
              type: 'string',
              description: 'Comma-separated fields to group by for aggregated summaries',
            },
            order_by: {
              type: 'string',
              description: 'Comma-separated fields to order by, optionally with ASC or DESC (e.g. "state_code ASC")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 100, use 0 for no limit)',
            },
            offset: {
              type: 'number',
              description: 'Number of records to skip for pagination (default: 0)',
            },
          },
          required: ['slice'],
        },
      },
      {
        name: 'get_hmda_slice_metadata',
        description: 'Get metadata for a specific HMDA data slice including available fields, data types, and descriptions',
        inputSchema: {
          type: 'object',
          properties: {
            slice: {
              type: 'string',
              description: 'Name of the HMDA slice (e.g. hmda_lar)',
            },
          },
          required: ['slice'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_datasets':
          return this.listDatasets();
        case 'get_dataset':
          return this.getDataset(args);
        case 'get_hmda_dataset':
          return this.getHmdaDataset();
        case 'get_hmda_concept':
          return this.getHmdaConcept(args);
        case 'query_hmda_slice':
          return this.queryHmdaSlice(args);
        case 'get_hmda_slice_metadata':
          return this.getHmdaSliceMetadata(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        content: [{ type: 'text', text: `CFPB API returned non-JSON (HTTP ${response.status})` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async listDatasets(): Promise<ToolResult> {
    return this.get('/data');
  }

  private async getDataset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.dataset) {
      return { content: [{ type: 'text', text: 'dataset is required' }], isError: true };
    }
    return this.get(`/data/${encodeURIComponent(args.dataset as string)}`);
  }

  private async getHmdaDataset(): Promise<ToolResult> {
    return this.get('/data/hmda');
  }

  private async getHmdaConcept(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.concept) {
      return { content: [{ type: 'text', text: 'concept is required' }], isError: true };
    }
    return this.get(`/data/hmda/concept/${encodeURIComponent(args.concept as string)}`);
  }

  private async queryHmdaSlice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.slice) {
      return { content: [{ type: 'text', text: 'slice is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.select) params.set('$select', args.select as string);
    if (args.where) params.set('$where', args.where as string);
    if (args.group) params.set('$group', args.group as string);
    if (args.order_by) params.set('$orderBy', args.order_by as string);
    if (args.limit !== undefined) params.set('$limit', String(args.limit));
    if (args.offset !== undefined) params.set('$offset', String(args.offset));
    const qs = params.toString();
    const path = `/data/hmda/slice/${encodeURIComponent(args.slice as string)}${qs ? `?${qs}` : ''}`;
    return this.get(path);
  }

  private async getHmdaSliceMetadata(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.slice) {
      return { content: [{ type: 'text', text: 'slice is required' }], isError: true };
    }
    return this.get(`/data/hmda/slice/${encodeURIComponent(args.slice as string)}/metadata`);
  }
}
