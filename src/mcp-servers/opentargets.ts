/**
 * Open Targets Platform MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://platform-api.opentargets.io/v3/platform
// Auth: None required (public API)
// Docs: https://docs.targetvalidation.org/tutorials/api-tutorials
// Rate limits: Not formally documented; use responsibly

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenTargetsConfig {
  baseUrl?: string;
}

export class OpenTargetsMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: OpenTargetsConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://platform-api.opentargets.io/v3/platform';
  }

  static catalog() {
    return {
      name: 'opentargets',
      displayName: 'Open Targets Platform',
      version: '1.0.0',
      category: 'science',
      keywords: [
        'open targets', 'opentargets', 'drug target', 'target validation', 'disease',
        'evidence', 'association', 'gene', 'ensembl', 'efo', 'therapeutic area',
        'drug discovery', 'genomics', 'biology', 'bioinformatics', 'expression',
        'eco', 'evidence code ontology', 'relation', 'autocomplete',
      ],
      toolNames: [
        'search_targets_diseases',
        'get_association',
        'filter_associations',
        'get_evidence',
        'filter_evidence',
        'get_disease',
        'get_disease_relations',
        'get_target',
        'get_target_expression',
        'get_target_relations',
        'get_drug',
        'get_eco',
        'get_therapeutic_areas',
        'get_api_version',
        'get_api_stats',
        'ping_api',
        'autocomplete_search',
        'quicksearch',
      ],
      description: 'Open Targets Platform: search drug targets and diseases, retrieve association scores, evidence strings, gene expression, and therapeutic area data for drug discovery.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Search ─────────────────────────────────────────────────────────────
      {
        name: 'search_targets_diseases',
        description: 'Full-text search for drug targets (genes) or diseases across the Open Targets Platform',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Full-text search query (e.g. BRAF, diabetes, melanoma)',
            },
            size: {
              type: 'string',
              description: 'Maximum results to return (default 10, max 10000)',
            },
            from: {
              type: 'string',
              description: 'Number of initial results to skip for pagination (default 0)',
            },
            filter: {
              type: 'string',
              description: 'Restrict results to type: target or disease',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'autocomplete_search',
        description: 'Get autocomplete suggestions for a partial query — returns closest matches for search boxes',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Partial text query to autocomplete',
            },
            size: {
              type: 'string',
              description: 'Maximum number of autocomplete results to return (default 5)',
            },
          },
          required: ['q'],
        },
      },
      {
        name: 'quicksearch',
        description: 'Fast search returning best-match targets and diseases for a query string',
        inputSchema: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Full-text query string for quick search',
            },
            size: {
              type: 'string',
              description: 'Maximum number of results to return (default 5)',
            },
          },
          required: ['q'],
        },
      },
      // ── Associations ───────────────────────────────────────────────────────
      {
        name: 'get_association',
        description: 'Retrieve a single target-disease association by its compound ID (TARGET_ID-DISEASE_ID)',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Association ID in the form TARGET_ID-DISEASE_ID (e.g. ENSG00000157764-EFO_0000616)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'filter_associations',
        description: 'Filter and score target-disease associations by gene, disease, datasource, pathway, and score thresholds',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'Ensembl gene identifier to filter by (e.g. ENSG00000157764)',
            },
            disease: {
              type: 'string',
              description: 'EFO disease identifier to filter by (e.g. EFO_0000616)',
            },
            therapeutic_area: {
              type: 'string',
              description: 'EFO code of a therapeutic area',
            },
            datasource: {
              type: 'string',
              description: 'Data source to consider (e.g. gwas_catalog, chembl)',
            },
            datatype: {
              type: 'string',
              description: 'Data type to consider (e.g. genetic_association, known_drug)',
            },
            pathway: {
              type: 'string',
              description: 'Reactome pathway identifier to filter targets',
            },
            target_class: {
              type: 'string',
              description: 'ChEMBL target class identifier',
            },
            uniprotkw: {
              type: 'string',
              description: 'UniProt keyword to filter targets',
            },
            direct: {
              type: 'boolean',
              description: 'Return only associations with at least one direct evidence',
            },
            scorevalue_min: {
              type: 'number',
              description: 'Minimum association score (0-1)',
            },
            scorevalue_max: {
              type: 'number',
              description: 'Maximum association score (0-1)',
            },
            size: {
              type: 'number',
              description: 'Maximum results to return (default 10, max 10000)',
            },
            from: {
              type: 'number',
              description: 'Number of initial results to skip for pagination (default 0)',
            },
            sort: {
              type: 'string',
              description: 'Sort by score type (default: overall descending)',
            },
            datastructure: {
              type: 'string',
              description: 'Response structure: full, simple, ids, or count',
            },
          },
          required: [],
        },
      },
      // ── Evidence ───────────────────────────────────────────────────────────
      {
        name: 'get_evidence',
        description: 'Retrieve a single evidence string by its internal unique ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Internal unique ID of the evidence string to retrieve',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'filter_evidence',
        description: 'Filter evidence strings by target, disease, datasource, pathway, and score thresholds',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'Ensembl gene identifier to filter by',
            },
            disease: {
              type: 'string',
              description: 'EFO disease identifier to filter by',
            },
            datasource: {
              type: 'string',
              description: 'Data source to consider (e.g. gwas_catalog)',
            },
            datatype: {
              type: 'string',
              description: 'Data type to consider (e.g. genetic_association)',
            },
            pathway: {
              type: 'string',
              description: 'Pathway identifier to filter by',
            },
            uniprotkw: {
              type: 'string',
              description: 'UniProt keyword to filter targets',
            },
            scorevalue_min: {
              type: 'number',
              description: 'Filter by minimum score value (0-1)',
            },
            scorevalue_max: {
              type: 'number',
              description: 'Filter by maximum score value (0-1)',
            },
            size: {
              type: 'number',
              description: 'Maximum results to return (default 10, max 10000)',
            },
            from: {
              type: 'number',
              description: 'Number of initial results to skip for pagination',
            },
            sort: {
              type: 'string',
              description: 'Sort by field (default: scores.association_score descending)',
            },
            datastructure: {
              type: 'string',
              description: 'Response structure: full, simple, ids, or count',
            },
          },
          required: [],
        },
      },
      // ── Disease ────────────────────────────────────────────────────────────
      {
        name: 'get_disease',
        description: 'Get detailed information about a disease by its EFO identifier',
        inputSchema: {
          type: 'object',
          properties: {
            disease: {
              type: 'string',
              description: 'EFO disease identifier (e.g. EFO_0000616 for melanoma)',
            },
          },
          required: ['disease'],
        },
      },
      {
        name: 'get_disease_relations',
        description: 'Get diseases related to a given EFO disease identifier — returns ontology neighbors',
        inputSchema: {
          type: 'object',
          properties: {
            disease: {
              type: 'string',
              description: 'EFO disease identifier for which to find related diseases',
            },
          },
          required: ['disease'],
        },
      },
      // ── Target ─────────────────────────────────────────────────────────────
      {
        name: 'get_target',
        description: 'Get detailed information about a drug target by its Ensembl gene ID',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'Ensembl gene ID (e.g. ENSG00000157764 for BRAF)',
            },
          },
          required: ['target'],
        },
      },
      {
        name: 'get_target_expression',
        description: 'Get tissue expression data for a gene target by its Ensembl gene ID',
        inputSchema: {
          type: 'object',
          properties: {
            gene: {
              type: 'string',
              description: 'Ensembl gene identifier (e.g. ENSG00000157764)',
            },
          },
          required: ['gene'],
        },
      },
      {
        name: 'get_target_relations',
        description: 'Get related gene targets for a given Ensembl gene identifier — returns neighbors',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'Ensembl gene identifier (e.g. ENSG00000157764)',
            },
          },
          required: ['target'],
        },
      },
      // ── Drug ───────────────────────────────────────────────────────────────
      {
        name: 'get_drug',
        description: 'Get information about a drug by its ChEMBL drug ID',
        inputSchema: {
          type: 'object',
          properties: {
            drug_id: {
              type: 'string',
              description: 'ChEMBL drug ID (e.g. CHEMBL1201583)',
            },
          },
          required: ['drug_id'],
        },
      },
      // ── ECO ────────────────────────────────────────────────────────────────
      {
        name: 'get_eco',
        description: 'Get information about an evidence code from the Evidence Code Ontology (ECO)',
        inputSchema: {
          type: 'object',
          properties: {
            eco_id: {
              type: 'string',
              description: 'ECO identifier (e.g. ECO_0000205)',
            },
          },
          required: ['eco_id'],
        },
      },
      // ── Utils ──────────────────────────────────────────────────────────────
      {
        name: 'get_therapeutic_areas',
        description: 'Get a list of all therapeutic areas available in the Open Targets Platform',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_api_version',
        description: 'Get the current version of the Open Targets Platform API',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_api_stats',
        description: 'Get summary statistics about data volumes in the Open Targets Platform',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'ping_api',
        description: 'Ping the Open Targets Platform API to verify it is available and responding',
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
        case 'search_targets_diseases':   return this.searchTargetsDiseases(args);
        case 'autocomplete_search':       return this.autocompleteSearch(args);
        case 'quicksearch':               return this.quickSearch(args);
        case 'get_association':           return this.getAssociation(args);
        case 'filter_associations':       return this.filterAssociations(args);
        case 'get_evidence':              return this.getEvidence(args);
        case 'filter_evidence':           return this.filterEvidence(args);
        case 'get_disease':               return this.getDisease(args);
        case 'get_disease_relations':     return this.getDiseaseRelations(args);
        case 'get_target':                return this.getTarget(args);
        case 'get_target_expression':     return this.getTargetExpression(args);
        case 'get_target_relations':      return this.getTargetRelations(args);
        case 'get_drug':                  return this.getDrug(args);
        case 'get_eco':                   return this.getEco(args);
        case 'get_therapeutic_areas':     return this.getTherapeuticAreas();
        case 'get_api_version':           return this.getApiVersion();
        case 'get_api_stats':             return this.getApiStats();
        case 'ping_api':                  return this.pingApi();
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

  private async get(path: string, params: Record<string, string | number | boolean> = {}): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    const response = await this.fetchWithRetry(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Search methods ─────────────────────────────────────────────────────────

  private async searchTargetsDiseases(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string | number | boolean> = { q: args.q as string };
    if (args.size)   params.size   = args.size as string;
    if (args.from)   params.from   = args.from as string;
    if (args.filter) params.filter = args.filter as string;
    return this.get('/public/search', params);
  }

  private async autocompleteSearch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string | number | boolean> = { q: args.q as string };
    if (args.size) params.size = args.size as string;
    return this.get('/private/autocomplete', params);
  }

  private async quickSearch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    const params: Record<string, string | number | boolean> = { q: args.q as string };
    if (args.size) params.size = args.size as string;
    return this.get('/private/quicksearch', params);
  }

  // ── Association methods ────────────────────────────────────────────────────

  private async getAssociation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get('/public/association', { id: args.id as string });
  }

  private async filterAssociations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean> = {};
    if (args.target)                      params.target           = args.target as string;
    if (args.disease)                     params.disease          = args.disease as string;
    if (args.therapeutic_area)            params.therapeutic_area = args.therapeutic_area as string;
    if (args.datasource)                  params.datasource       = args.datasource as string;
    if (args.datatype)                    params.datatype         = args.datatype as string;
    if (args.pathway)                     params.pathway          = args.pathway as string;
    if (args.target_class)                params.target_class     = args.target_class as string;
    if (args.uniprotkw)                   params.uniprotkw        = args.uniprotkw as string;
    if (args.direct !== undefined)        params.direct           = args.direct as boolean;
    if (args.scorevalue_min !== undefined) params.scorevalue_min  = args.scorevalue_min as number;
    if (args.scorevalue_max !== undefined) params.scorevalue_max  = args.scorevalue_max as number;
    if (args.size !== undefined)          params.size             = args.size as number;
    if (args.from !== undefined)          params.from             = args.from as number;
    if (args.sort)                        params.sort             = args.sort as string;
    if (args.datastructure)               params.datastructure    = args.datastructure as string;
    return this.get('/public/association/filter', params);
  }

  // ── Evidence methods ───────────────────────────────────────────────────────

  private async getEvidence(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.get('/public/evidence', { id: args.id as string });
  }

  private async filterEvidence(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean> = {};
    if (args.target)                      params.target          = args.target as string;
    if (args.disease)                     params.disease         = args.disease as string;
    if (args.datasource)                  params.datasource      = args.datasource as string;
    if (args.datatype)                    params.datatype        = args.datatype as string;
    if (args.pathway)                     params.pathway         = args.pathway as string;
    if (args.uniprotkw)                   params.uniprotkw       = args.uniprotkw as string;
    if (args.scorevalue_min !== undefined) params.scorevalue_min = args.scorevalue_min as number;
    if (args.scorevalue_max !== undefined) params.scorevalue_max = args.scorevalue_max as number;
    if (args.size !== undefined)          params.size            = args.size as number;
    if (args.from !== undefined)          params.from            = args.from as number;
    if (args.sort)                        params.sort            = args.sort as string;
    if (args.datastructure)               params.datastructure   = args.datastructure as string;
    return this.get('/public/evidence/filter', params);
  }

  // ── Disease methods ────────────────────────────────────────────────────────

  private async getDisease(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.disease) return { content: [{ type: 'text', text: 'disease is required' }], isError: true };
    return this.get(`/private/disease/${encodeURIComponent(args.disease as string)}`);
  }

  private async getDiseaseRelations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.disease) return { content: [{ type: 'text', text: 'disease is required' }], isError: true };
    return this.get(`/private/relation/disease/${encodeURIComponent(args.disease as string)}`);
  }

  // ── Target methods ─────────────────────────────────────────────────────────

  private async getTarget(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.target) return { content: [{ type: 'text', text: 'target is required' }], isError: true };
    return this.get(`/private/target/${encodeURIComponent(args.target as string)}`);
  }

  private async getTargetExpression(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.gene) return { content: [{ type: 'text', text: 'gene is required' }], isError: true };
    return this.get('/private/target/expression', { gene: args.gene as string });
  }

  private async getTargetRelations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.target) return { content: [{ type: 'text', text: 'target is required' }], isError: true };
    return this.get(`/private/relation/target/${encodeURIComponent(args.target as string)}`);
  }

  // ── Drug methods ───────────────────────────────────────────────────────────

  private async getDrug(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.drug_id) return { content: [{ type: 'text', text: 'drug_id is required' }], isError: true };
    return this.get(`/private/drug/${encodeURIComponent(args.drug_id as string)}`, { drug_id: args.drug_id as string });
  }

  // ── ECO methods ────────────────────────────────────────────────────────────

  private async getEco(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.eco_id) return { content: [{ type: 'text', text: 'eco_id is required' }], isError: true };
    return this.get(`/private/eco/${encodeURIComponent(args.eco_id as string)}`);
  }

  // ── Utils methods ──────────────────────────────────────────────────────────

  private async getTherapeuticAreas(): Promise<ToolResult> {
    return this.get('/public/utils/therapeuticareas');
  }

  private async getApiVersion(): Promise<ToolResult> {
    return this.get('/public/utils/version');
  }

  private async getApiStats(): Promise<ToolResult> {
    return this.get('/public/utils/stats');
  }

  private async pingApi(): Promise<ToolResult> {
    return this.get('/public/utils/ping');
  }
}
