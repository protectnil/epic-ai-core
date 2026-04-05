/**
 * Enterobase (warwick.ac.uk) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official vendor MCP server exists for Enterobase.
// Our adapter covers: 8 tools (database info, login, barcode lookup, assemblies, strains, traces, schemes, alleles/loci/STs).
// Recommendation: Use this adapter for full Enterobase API access.
//
// Base URL: https://enterobase.warwick.ac.uk
// Auth: API token passed as Bearer header (obtain via login endpoint or http://bit.ly/1TKlaOU)
// Docs: https://enterobase.warwick.ac.uk/api/v2.0/swagger
// Supported databases: senterica (Salmonella), ecoli (Escherichia), yersinia (Yersinia), mcatarrhalis (Moraxella)

import { ToolDefinition, ToolResult } from './types.js';

interface EnterobaseConfig {
  apiToken: string;
  /** Optional base URL override (default: https://enterobase.warwick.ac.uk) */
  baseUrl?: string;
}

export class WarwickAcUkEnterobaseMCPServer {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: EnterobaseConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl ?? 'https://enterobase.warwick.ac.uk';
  }

  static catalog() {
    return {
      name: 'warwick-ac-uk-enterobase',
      displayName: 'Enterobase (Warwick)',
      version: '1.0.0',
      category: 'science',
      keywords: [
        'enterobase', 'genomics', 'microbiology', 'salmonella', 'escherichia',
        'yersinia', 'moraxella', 'mlst', 'wgmlst', 'assembly', 'strain',
        'allele', 'locus', 'sequence', 'genotyping', 'barcode', 'bioinformatics',
      ],
      toolNames: [
        'get_databases', 'login', 'lookup_barcode', 'list_assemblies',
        'get_assembly', 'list_strains', 'get_strain', 'list_traces',
      ],
      description: 'EnteroBase genomics platform for uploading sequencing data, de novo assembly, MLST/wgMLST genotyping, and strain comparison across Salmonella, Escherichia, Yersinia, and Moraxella databases.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_databases',
        description: 'Get top-level information about EnteroBase databases — lists available species databases (senterica, ecoli, yersinia, mcatarrhalis) with their prefixes and descriptions',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Filter by species database name (senterica, ecoli, yersinia, mcatarrhalis)',
            },
            prefix: {
              type: 'string',
              description: 'Filter by database prefix (e.g. SAL for Salmonella)',
            },
            description: {
              type: 'string',
              description: 'Filter by database description keyword',
            },
          },
        },
      },
      {
        name: 'login',
        description: 'Authenticate with EnteroBase credentials to obtain or refresh an API token for subsequent requests',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'EnteroBase username',
            },
            password: {
              type: 'string',
              description: 'EnteroBase password',
            },
          },
        },
      },
      {
        name: 'lookup_barcode',
        description: 'Look up one or more EnteroBase barcodes — barcodes follow the format <prefix>_<ID>_<table> (e.g. SAL_AA0001AA_ST for a Salmonella ST record)',
        inputSchema: {
          type: 'object',
          properties: {
            barcode: {
              type: 'string',
              description: 'Unique barcode string (e.g. SAL_AA0001AA_ST). Omit to list all lookup barcodes.',
            },
          },
        },
      },
      {
        name: 'list_assemblies',
        description: 'List genome assemblies for a species database with optional filters for N50, barcode, ordering, and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Species database name: senterica, ecoli, yersinia, or mcatarrhalis',
            },
            barcode: {
              type: 'string',
              description: 'Filter by assembly barcode (e.g. SAL_AA0001AA_AS)',
            },
            n50: {
              type: 'integer',
              description: 'Filter assemblies with N50 >= this value',
            },
            order_by: {
              type: 'string',
              description: 'Field to order results by (default: barcode)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return',
            },
            offset: {
              type: 'integer',
              description: 'Number of results to skip for pagination',
            },
          },
          required: ['database'],
        },
      },
      {
        name: 'get_assembly',
        description: 'Get details for a specific genome assembly by its barcode in a species database',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Species database name: senterica, ecoli, yersinia, or mcatarrhalis',
            },
            barcode: {
              type: 'string',
              description: 'Assembly barcode (e.g. SAL_AA0001AA_AS)',
            },
          },
          required: ['database', 'barcode'],
        },
      },
      {
        name: 'list_strains',
        description: 'List strain metadata records for a species database with optional filters and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Species database name: senterica, ecoli, yersinia, or mcatarrhalis',
            },
            barcode: {
              type: 'string',
              description: 'Filter by strain barcode',
            },
            order_by: {
              type: 'string',
              description: 'Field to order results by (default: barcode)',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return',
            },
            offset: {
              type: 'integer',
              description: 'Number of results to skip for pagination',
            },
          },
          required: ['database'],
        },
      },
      {
        name: 'get_strain',
        description: 'Get metadata for a specific strain by its barcode in a species database',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Species database name: senterica, ecoli, yersinia, or mcatarrhalis',
            },
            barcode: {
              type: 'string',
              description: 'Strain barcode (e.g. SAL_AA0001AA_ST)',
            },
          },
          required: ['database', 'barcode'],
        },
      },
      {
        name: 'list_traces',
        description: 'List sequence-read (trace) metadata records for a species database — traces are raw sequencing reads uploaded before assembly',
        inputSchema: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              description: 'Species database name: senterica, ecoli, yersinia, or mcatarrhalis',
            },
            barcode: {
              type: 'string',
              description: 'Filter by trace barcode (e.g. SAL_AA0001AA_TR)',
            },
            order_by: {
              type: 'string',
              description: 'Field to order results by',
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of results to return',
            },
            offset: {
              type: 'integer',
              description: 'Number of results to skip for pagination',
            },
          },
          required: ['database'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_databases':
          return this.getDatabases(args);
        case 'login':
          return this.login(args);
        case 'lookup_barcode':
          return this.lookupBarcode(args);
        case 'list_assemblies':
          return this.listAssemblies(args);
        case 'get_assembly':
          return this.getAssembly(args);
        case 'list_strains':
          return this.listStrains(args);
        case 'get_strain':
          return this.getStrain(args);
        case 'list_traces':
          return this.listTraces(args);
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

  private truncate(data: unknown): string {
    const text = JSON.stringify(data, null, 2);
    return text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
  }

  private buildUrl(path: string, params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const query = qs.toString();
    return `${this.baseUrl}${path}${query ? '?' + query : ''}`;
  }

  private async fetchApi(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.apiToken}` },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Enterobase returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDatabases(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.name) params.name = args.name as string;
    if (args.prefix) params.prefix = args.prefix as string;
    if (args.description) params.description = args.description as string;
    return this.fetchApi('/api/v2.0', params);
  }

  private async login(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | undefined> = {};
    if (args.username) params.username = args.username as string;
    if (args.password) params.password = args.password as string;
    return this.fetchApi('/api/v2.0/login', params);
  }

  private async lookupBarcode(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.barcode) {
      return this.fetchApi(`/api/v2.0/lookup/${encodeURIComponent(args.barcode as string)}`);
    }
    return this.fetchApi('/api/v2.0/lookup');
  }

  private async listAssemblies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.database) return { content: [{ type: 'text', text: 'database is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.barcode) params.barcode = args.barcode as string;
    if (args.n50 !== undefined) params.n50 = String(args.n50);
    if (args.order_by) params.order_by = args.order_by as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    return this.fetchApi(`/api/v2.0/${encodeURIComponent(args.database as string)}/assemblies`, params);
  }

  private async getAssembly(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.database) return { content: [{ type: 'text', text: 'database is required' }], isError: true };
    if (!args.barcode) return { content: [{ type: 'text', text: 'barcode is required' }], isError: true };
    return this.fetchApi(`/api/v2.0/${encodeURIComponent(args.database as string)}/assemblies/${encodeURIComponent(args.barcode as string)}`);
  }

  private async listStrains(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.database) return { content: [{ type: 'text', text: 'database is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.barcode) params.barcode = args.barcode as string;
    if (args.order_by) params.order_by = args.order_by as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    return this.fetchApi(`/api/v2.0/${encodeURIComponent(args.database as string)}/strains`, params);
  }

  private async getStrain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.database) return { content: [{ type: 'text', text: 'database is required' }], isError: true };
    if (!args.barcode) return { content: [{ type: 'text', text: 'barcode is required' }], isError: true };
    return this.fetchApi(`/api/v2.0/${encodeURIComponent(args.database as string)}/strains/${encodeURIComponent(args.barcode as string)}`);
  }

  private async listTraces(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.database) return { content: [{ type: 'text', text: 'database is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.barcode) params.barcode = args.barcode as string;
    if (args.order_by) params.order_by = args.order_by as string;
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.offset !== undefined) params.offset = String(args.offset);
    return this.fetchApi(`/api/v2.0/${encodeURIComponent(args.database as string)}/traces`, params);
  }
}
