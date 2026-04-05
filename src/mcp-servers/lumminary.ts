/**
 * Lumminary MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official Lumminary MCP server found.
// Our adapter covers: 11 tools (auth, genetic data, SNPs, products, authorizations, reference genomes).
// Recommendation: Use this adapter for full Lumminary API coverage.
//
// Base URL: https://api.lumminary.com/v1
// Auth: Bearer JWT token in Authorization header — obtain via authenticate_user tool
// Docs: https://api.lumminary.com/v1/ui/
// Rate limits: Not publicly documented — contact Lumminary for enterprise limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LumminaryConfig {
  apiKey?: string;
  /** JWT Bearer token (obtained via authenticate_user) */
  bearerToken?: string;
  /** Optional base URL override (default: https://api.lumminary.com/v1) */
  baseUrl?: string;
}

export class LumminaryMCPServer extends MCPAdapterBase {
  private apiKey: string;
  private bearerToken: string;
  private readonly baseUrl: string;

  constructor(config: LumminaryConfig) {
    super();
    this.apiKey = config.apiKey ?? '';
    this.bearerToken = config.bearerToken ?? '';
    this.baseUrl = config.baseUrl ?? 'https://api.lumminary.com/v1';
  }

  static catalog() {
    return {
      name: 'lumminary',
      displayName: 'Lumminary',
      version: '1.0.0',
      category: 'healthcare',
      keywords: [
        'lumminary', 'genetics', 'dna', 'genomics', 'snp', 'gene', 'genome',
        'healthcare', 'bioinformatics', 'ancestry', 'biomarker', 'chromosome',
        'reference', 'authorization', 'product',
      ],
      toolNames: [
        'authenticate_user',
        'get_client_gene',
        'list_client_snps',
        'get_client_snps_batch',
        'get_client_snp',
        'get_product',
        'get_authorizations_queue',
        'get_product_authorization',
        'complete_authorization',
        'get_reference_gene',
        'list_reference_genomes',
        'get_reference_genome',
        'get_reference_chromosome',
        'get_reference_snp',
      ],
      description: 'Lumminary genetic data platform — authenticate users, access client SNP and gene data, manage product authorizations, and query reference genome/SNP databases.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'authenticate_user',
        description: 'Authenticate a Lumminary user and obtain a JWT Bearer token for subsequent API calls',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Lumminary account username or email',
            },
            password: {
              type: 'string',
              description: 'Lumminary account password',
            },
            role: {
              type: 'string',
              description: 'Role for authentication context (e.g. "product")',
            },
          },
          required: ['username', 'password', 'role'],
        },
      },
      {
        name: 'get_client_gene',
        description: "Get a specific gene by symbol from a client's genetic dataset",
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'Lumminary client ID',
            },
            dataset_id: {
              type: 'string',
              description: 'Dataset ID within the client account',
            },
            gene_symbol: {
              type: 'string',
              description: 'HGNC gene symbol (e.g. BRCA1, APOE)',
            },
          },
          required: ['client_id', 'dataset_id', 'gene_symbol'],
        },
      },
      {
        name: 'list_client_snps',
        description: "List SNPs (Single Nucleotide Polymorphisms) available in a client's genetic dataset",
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'Lumminary client ID',
            },
            dataset_id: {
              type: 'string',
              description: 'Dataset ID within the client account',
            },
          },
          required: ['client_id', 'dataset_id'],
        },
      },
      {
        name: 'get_client_snps_batch',
        description: "Retrieve a large batch of SNPs from a client's genetic dataset by providing a list of SNP IDs",
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'Lumminary client ID',
            },
            dataset_id: {
              type: 'string',
              description: 'Dataset ID within the client account',
            },
            snps: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of SNP IDs (rsIDs) to retrieve (e.g. ["rs12345", "rs67890"])',
            },
          },
          required: ['client_id', 'dataset_id', 'snps'],
        },
      },
      {
        name: 'get_client_snp',
        description: "Get details for a specific SNP from a client's genetic dataset by SNP accession ID",
        inputSchema: {
          type: 'object',
          properties: {
            client_id: {
              type: 'string',
              description: 'Lumminary client ID',
            },
            dataset_id: {
              type: 'string',
              description: 'Dataset ID within the client account',
            },
            snp_id: {
              type: 'string',
              description: 'SNP accession ID (rsID, e.g. rs429358)',
            },
          },
          required: ['client_id', 'dataset_id', 'snp_id'],
        },
      },
      {
        name: 'get_product',
        description: 'Get details for a Lumminary product by product ID',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Lumminary product ID',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'get_authorizations_queue',
        description: 'Get the queue of pending authorizations for a product, optionally starting from a sequence number',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Lumminary product ID',
            },
            seq_num_start: {
              type: 'integer',
              description: 'Sequence number to start from (for pagination)',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'get_product_authorization',
        description: 'Get details of a specific authorization for a product',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Lumminary product ID',
            },
            authorization_id: {
              type: 'string',
              description: 'Authorization ID to retrieve',
            },
          },
          required: ['product_id', 'authorization_id'],
        },
      },
      {
        name: 'complete_authorization',
        description: 'Signal that processing of an authorization is complete (without uploading a result file)',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              description: 'Lumminary product ID',
            },
            authorization_id: {
              type: 'string',
              description: 'Authorization ID to complete',
            },
          },
          required: ['product_id', 'authorization_id'],
        },
      },
      {
        name: 'get_reference_gene',
        description: 'Get generic gene information from a reference database by accession number',
        inputSchema: {
          type: 'object',
          properties: {
            database_name: {
              type: 'string',
              description: 'Reference database name (e.g. "ncbi")',
            },
            accession: {
              type: 'string',
              description: 'Gene accession number',
            },
            dbsnp_build: {
              type: 'string',
              description: 'dbSNP build version (optional)',
            },
            reference_genome: {
              type: 'string',
              description: 'Reference genome build (e.g. "GRCh38")',
            },
          },
          required: ['database_name', 'accession'],
        },
      },
      {
        name: 'list_reference_genomes',
        description: 'List available reference genome builds',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_reference_genome',
        description: 'Get metadata for a specific reference genome build including chromosome list',
        inputSchema: {
          type: 'object',
          properties: {
            genome_build_accession: {
              type: 'string',
              description: 'Genome build accession (e.g. "GCF_000001405.39")',
            },
          },
          required: ['genome_build_accession'],
        },
      },
      {
        name: 'get_reference_chromosome',
        description: 'Get sequence data for a region of a reference genome chromosome',
        inputSchema: {
          type: 'object',
          properties: {
            genome_build_accession: {
              type: 'string',
              description: 'Genome build accession',
            },
            chromosome_accession: {
              type: 'string',
              description: 'Chromosome accession number',
            },
            range_start: {
              type: 'integer',
              description: 'Start position of the sequence range (1-based)',
            },
            range_stop: {
              type: 'integer',
              description: 'Stop position of the sequence range (1-based)',
            },
          },
          required: ['genome_build_accession', 'chromosome_accession'],
        },
      },
      {
        name: 'get_reference_snp',
        description: 'Get reference SNP data by accession (rsID), including allele frequencies and genomic position',
        inputSchema: {
          type: 'object',
          properties: {
            snp_accession: {
              type: 'string',
              description: 'SNP accession (rsID, e.g. "rs429358")',
            },
            dbsnp_version: {
              type: 'string',
              description: 'dbSNP version to query (optional)',
            },
            grch_version: {
              type: 'string',
              description: 'GRCh reference genome version (optional, e.g. "38")',
            },
          },
          required: ['snp_accession'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'authenticate_user':
          return this.authenticateUser(args);
        case 'get_client_gene':
          return this.getClientGene(args);
        case 'list_client_snps':
          return this.listClientSnps(args);
        case 'get_client_snps_batch':
          return this.getClientSnpsBatch(args);
        case 'get_client_snp':
          return this.getClientSnp(args);
        case 'get_product':
          return this.getProduct(args);
        case 'get_authorizations_queue':
          return this.getAuthorizationsQueue(args);
        case 'get_product_authorization':
          return this.getProductAuthorization(args);
        case 'complete_authorization':
          return this.completeAuthorization(args);
        case 'get_reference_gene':
          return this.getReferenceGene(args);
        case 'list_reference_genomes':
          return this.listReferenceGenomes();
        case 'get_reference_genome':
          return this.getReferenceGenome(args);
        case 'get_reference_chromosome':
          return this.getReferenceChromosome(args);
        case 'get_reference_snp':
          return this.getReferenceSnp(args);
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
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    } else if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private async get(path: string, params: Record<string, string | undefined> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const url = `${this.baseUrl}${path}${query}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.authHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Lumminary returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>, formData = false): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    let fetchInit: RequestInit;
    if (formData) {
      const fd = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) {
        if (v !== undefined) fd.set(k, String(v));
      }
      fetchInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: fd.toString(),
      };
    } else {
      fetchInit = {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      };
    }
    const response = await this.fetchWithRetry(url, fetchInit);
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Lumminary returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async authenticateUser(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.username) return { content: [{ type: 'text', text: 'username is required' }], isError: true };
    if (!args.password) return { content: [{ type: 'text', text: 'password is required' }], isError: true };
    if (!args.role) return { content: [{ type: 'text', text: 'role is required' }], isError: true };
    const result = await this.post('/auth/jwt', {
      username: args.username as string,
      password: args.password as string,
      role: args.role as string,
    }, true);
    if (!result.isError) {
      try {
        const parsed = JSON.parse(result.content[0].text);
        if (parsed.token) {
          this.bearerToken = parsed.token;
        }
      } catch { /* ignore parse errors */ }
    }
    return result;
  }

  private async getClientGene(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.client_id) return { content: [{ type: 'text', text: 'client_id is required' }], isError: true };
    if (!args.dataset_id) return { content: [{ type: 'text', text: 'dataset_id is required' }], isError: true };
    if (!args.gene_symbol) return { content: [{ type: 'text', text: 'gene_symbol is required' }], isError: true };
    return this.get(
      `/clients/${encodeURIComponent(args.client_id as string)}/datasets/${encodeURIComponent(args.dataset_id as string)}/genes/${encodeURIComponent(args.gene_symbol as string)}`
    );
  }

  private async listClientSnps(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.client_id) return { content: [{ type: 'text', text: 'client_id is required' }], isError: true };
    if (!args.dataset_id) return { content: [{ type: 'text', text: 'dataset_id is required' }], isError: true };
    return this.get(
      `/clients/${encodeURIComponent(args.client_id as string)}/datasets/${encodeURIComponent(args.dataset_id as string)}/snps/`
    );
  }

  private async getClientSnpsBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.client_id) return { content: [{ type: 'text', text: 'client_id is required' }], isError: true };
    if (!args.dataset_id) return { content: [{ type: 'text', text: 'dataset_id is required' }], isError: true };
    if (!args.snps || !Array.isArray(args.snps)) return { content: [{ type: 'text', text: 'snps array is required' }], isError: true };
    return this.post(
      `/clients/${encodeURIComponent(args.client_id as string)}/datasets/${encodeURIComponent(args.dataset_id as string)}/snps/`,
      { snps: args.snps }
    );
  }

  private async getClientSnp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.client_id) return { content: [{ type: 'text', text: 'client_id is required' }], isError: true };
    if (!args.dataset_id) return { content: [{ type: 'text', text: 'dataset_id is required' }], isError: true };
    if (!args.snp_id) return { content: [{ type: 'text', text: 'snp_id is required' }], isError: true };
    return this.get(
      `/clients/${encodeURIComponent(args.client_id as string)}/datasets/${encodeURIComponent(args.dataset_id as string)}/snps/${encodeURIComponent(args.snp_id as string)}`
    );
  }

  private async getProduct(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    return this.get(`/products/${encodeURIComponent(args.product_id as string)}`);
  }

  private async getAuthorizationsQueue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.seq_num_start !== undefined) params.seq_num_start = String(args.seq_num_start);
    return this.get(`/products/${encodeURIComponent(args.product_id as string)}/authorizations`, params);
  }

  private async getProductAuthorization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    if (!args.authorization_id) return { content: [{ type: 'text', text: 'authorization_id is required' }], isError: true };
    return this.get(
      `/products/${encodeURIComponent(args.product_id as string)}/authorizations/${encodeURIComponent(args.authorization_id as string)}`
    );
  }

  private async completeAuthorization(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    if (!args.authorization_id) return { content: [{ type: 'text', text: 'authorization_id is required' }], isError: true };
    return this.post(
      `/products/${encodeURIComponent(args.product_id as string)}/authorizations/${encodeURIComponent(args.authorization_id as string)}`,
      {}
    );
  }

  private async getReferenceGene(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.database_name) return { content: [{ type: 'text', text: 'database_name is required' }], isError: true };
    if (!args.accession) return { content: [{ type: 'text', text: 'accession is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.dbsnp_build) params.dbsnp_build = args.dbsnp_build as string;
    if (args.reference_genome) params.reference_genome = args.reference_genome as string;
    return this.get(
      `/reference/genes/databases/${encodeURIComponent(args.database_name as string)}/accessions/${encodeURIComponent(args.accession as string)}`,
      params
    );
  }

  private async listReferenceGenomes(): Promise<ToolResult> {
    return this.get('/reference/genomes/');
  }

  private async getReferenceGenome(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.genome_build_accession) return { content: [{ type: 'text', text: 'genome_build_accession is required' }], isError: true };
    return this.get(
      `/reference/genomes/${encodeURIComponent(args.genome_build_accession as string)}/chromosomes`
    );
  }

  private async getReferenceChromosome(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.genome_build_accession) return { content: [{ type: 'text', text: 'genome_build_accession is required' }], isError: true };
    if (!args.chromosome_accession) return { content: [{ type: 'text', text: 'chromosome_accession is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.range_start !== undefined) params.range_start = String(args.range_start);
    if (args.range_stop !== undefined) params.range_stop = String(args.range_stop);
    return this.get(
      `/reference/genomes/${encodeURIComponent(args.genome_build_accession as string)}/chromosomes/${encodeURIComponent(args.chromosome_accession as string)}`,
      params
    );
  }

  private async getReferenceSnp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.snp_accession) return { content: [{ type: 'text', text: 'snp_accession is required' }], isError: true };
    const params: Record<string, string | undefined> = {};
    if (args.dbsnp_version) params.dbsnp_version = args.dbsnp_version as string;
    if (args.grch_version) params.grch_version = args.grch_version as string;
    return this.get(`/reference/snps/${encodeURIComponent(args.snp_accession as string)}`, params);
  }
}
