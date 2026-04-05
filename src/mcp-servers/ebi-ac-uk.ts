/**
 * EBI CROssBAR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official EMBL-EBI CROssBAR MCP server was found on GitHub as of March 2026.
//
// Base URL: https://www.ebi.ac.uk/Tools/crossbar
// Auth: None (public API, no authentication required)
// Docs: https://www.ebi.ac.uk/Tools/crossbar
// Rate limits: Not publicly documented; standard academic API fair-use applies

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface EbiAcUkConfig {
  baseUrl?: string;
}

export class EbiAcUkMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: EbiAcUkConfig = {}) {
    super();
    this.baseUrl = config.baseUrl || 'https://www.ebi.ac.uk/Tools/crossbar';
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_activities',
        description: 'Get ChEMBL bioactivity data filtered by assay ID, molecule ChEMBL ID, target ID, or pChEMBL value with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            assayChemblId: {
              type: 'string',
              description: 'ChEMBL assay ID to filter activities (e.g. CHEMBL1614364)',
            },
            moleculeChemblId: {
              type: 'string',
              description: 'ChEMBL molecule ID to filter activities (e.g. CHEMBL25)',
            },
            targetChemblId: {
              type: 'string',
              description: 'ChEMBL target ID to filter activities (e.g. CHEMBL1824)',
            },
            pchemblValue: {
              type: 'number',
              description: 'Minimum pChEMBL value threshold for activity filtering',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_assays',
        description: 'Get ChEMBL assay data filtered by assay ID, organism, type, or target ChEMBL ID with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            assayChemblId: {
              type: 'string',
              description: 'ChEMBL assay ID to look up (e.g. CHEMBL1614364)',
            },
            assayOrg: {
              type: 'string',
              description: 'Assay organism filter (e.g. Homo sapiens)',
            },
            assayType: {
              type: 'string',
              description: 'Assay type filter (e.g. B for binding, F for functional)',
            },
            targetChemblId: {
              type: 'string',
              description: 'ChEMBL target ID to filter assays',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_drugs',
        description: 'Get drug information from CROssBAR filtered by UniProt accession, ChEMBL ID, name, or PubChem CID with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            accession: {
              type: 'string',
              description: 'UniProt accession number to find associated drugs (e.g. P00533)',
            },
            chemblId: {
              type: 'string',
              description: 'ChEMBL compound ID (e.g. CHEMBL25)',
            },
            identifier: {
              type: 'string',
              description: 'Generic drug identifier string',
            },
            name: {
              type: 'string',
              description: 'Drug name or partial name to search for',
            },
            pubchemCid: {
              type: 'string',
              description: 'PubChem compound ID (CID) to look up',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_efo_terms',
        description: 'Get EFO (Experimental Factor Ontology) disease/trait terms filtered by DOID, HPO label, MeSH, OMIM, or OBO ID with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            doid: {
              type: 'string',
              description: 'Disease Ontology ID to look up (e.g. DOID:9352)',
            },
            label: {
              type: 'string',
              description: 'EFO term label or partial name to search for',
            },
            mesh: {
              type: 'string',
              description: 'MeSH disease identifier (e.g. D003920)',
            },
            oboId: {
              type: 'string',
              description: 'OBO ontology ID (e.g. EFO:0000400)',
            },
            omimId: {
              type: 'string',
              description: 'OMIM disease identifier',
            },
            synonym: {
              type: 'string',
              description: 'Synonym term to search within EFO',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_hpo_terms',
        description: 'Get HPO (Human Phenotype Ontology) terms filtered by gene symbol, term name, or synonym with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            genesymbol: {
              type: 'string',
              description: 'Gene symbol to find associated HPO phenotypes (e.g. BRCA1)',
            },
            hpotermname: {
              type: 'string',
              description: 'HPO term name or partial name to search for',
            },
            synonym: {
              type: 'string',
              description: 'HPO synonym term to search within',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_intact_interactions',
        description: 'Get IntAct protein-protein interaction data filtered by UniProt accession, gene, or confidence score with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            accession: {
              type: 'string',
              description: 'UniProt accession to find interactions (e.g. P00533)',
            },
            gene: {
              type: 'string',
              description: 'Gene symbol to find interactions (e.g. EGFR)',
            },
            confidence: {
              type: 'number',
              description: 'Minimum IntAct MISCORE confidence threshold (0-1)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_molecules',
        description: 'Get ChEMBL small molecule data filtered by canonical SMILES, InChI key, or ChEMBL ID with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            canonicalSmiles: {
              type: 'string',
              description: 'Canonical SMILES string for the molecule (e.g. CC(=O)Oc1ccccc1C(=O)O)',
            },
            inchiKey: {
              type: 'string',
              description: 'InChI key for the molecule (e.g. BSYNRYMUTXBXSQ-UHFFFAOYSA-N)',
            },
            moleculeChemblId: {
              type: 'string',
              description: 'ChEMBL molecule ID (e.g. CHEMBL25)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_proteins',
        description: 'Get UniProt protein data filtered by accession, gene, EC number, GO term, InterPro, OMIM, or taxonomy ID with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            accession: {
              type: 'string',
              description: 'UniProt accession number (e.g. P00533)',
            },
            gene: {
              type: 'string',
              description: 'Gene symbol (e.g. EGFR)',
            },
            ec: {
              type: 'string',
              description: 'EC enzyme classification number (e.g. 2.7.10.1)',
            },
            fullName: {
              type: 'string',
              description: 'Full protein name or partial name to search for',
            },
            go: {
              type: 'string',
              description: 'Gene Ontology (GO) term ID (e.g. GO:0004672)',
            },
            interpro: {
              type: 'string',
              description: 'InterPro domain ID (e.g. IPR000719)',
            },
            omim: {
              type: 'string',
              description: 'OMIM disease association ID',
            },
            orphanet: {
              type: 'string',
              description: 'Orphanet rare disease ID',
            },
            pfam: {
              type: 'string',
              description: 'Pfam domain ID (e.g. PF00069)',
            },
            reactome: {
              type: 'string',
              description: 'Reactome pathway ID (e.g. R-HSA-177929)',
            },
            taxId: {
              type: 'string',
              description: 'NCBI taxonomy ID (e.g. 9606 for Homo sapiens)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_pubchem_bioassays',
        description: 'Get PubChem bioassay data filtered by UniProt accession, assay PubChem ID, or NCBI protein ID with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            accession: {
              type: 'string',
              description: 'UniProt accession to find associated PubChem bioassays',
            },
            assayPubchemId: {
              type: 'string',
              description: 'PubChem assay ID (AID) to look up',
            },
            ncbiProteinId: {
              type: 'string',
              description: 'NCBI protein accession to find associated bioassays',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_pubchem_bioassay_sids',
        description: 'Get PubChem bioassay substance (SID) data filtered by SID list and outcome type with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            sids: {
              type: 'string',
              description: 'Comma-separated PubChem substance IDs (SIDs) to look up',
            },
            outcome: {
              type: 'string',
              description: 'Assay outcome filter: active, inactive, inconclusive, unspecified',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_pubchem_compounds',
        description: 'Get PubChem compound data filtered by canonical SMILES, CID, or InChI key with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            cid: {
              type: 'string',
              description: 'PubChem compound ID (CID) to look up',
            },
            canonicalSmiles: {
              type: 'string',
              description: 'Canonical SMILES string to search for',
            },
            inchiKey: {
              type: 'string',
              description: 'InChI key to search for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_pubchem_substances',
        description: 'Get PubChem substance data filtered by CID or SID with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            cid: {
              type: 'string',
              description: 'PubChem compound ID (CID) to find associated substances',
            },
            sid: {
              type: 'string',
              description: 'PubChem substance ID (SID) to look up',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_targets',
        description: 'Get ChEMBL drug target data filtered by UniProt accession or target ChEMBL IDs with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            accession: {
              type: 'string',
              description: 'UniProt accession to find ChEMBL targets (e.g. P00533)',
            },
            targetIds: {
              type: 'string',
              description: 'Comma-separated ChEMBL target IDs (e.g. CHEMBL1824,CHEMBL3038441)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_activities':
          return await this.getActivities(args);
        case 'get_assays':
          return await this.getAssays(args);
        case 'get_drugs':
          return await this.getDrugs(args);
        case 'get_efo_terms':
          return await this.getEfoTerms(args);
        case 'get_hpo_terms':
          return await this.getHpoTerms(args);
        case 'get_intact_interactions':
          return await this.getIntactInteractions(args);
        case 'get_molecules':
          return await this.getMolecules(args);
        case 'get_proteins':
          return await this.getProteins(args);
        case 'get_pubchem_bioassays':
          return await this.getPubchemBioassays(args);
        case 'get_pubchem_bioassay_sids':
          return await this.getPubchemBioassaySids(args);
        case 'get_pubchem_compounds':
          return await this.getPubchemCompounds(args);
        case 'get_pubchem_substances':
          return await this.getPubchemSubstances(args);
        case 'get_targets':
          return await this.getTargets(args);
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

  private buildParams(args: Record<string, unknown>, keys: string[]): string {
    const params = new URLSearchParams();
    for (const key of keys) {
      const val = args[key];
      if (val !== undefined && val !== null && val !== '') {
        params.append(key, String(val));
      }
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `EBI CROssBAR API error ${response.status}: ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async getActivities(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['assayChemblId', 'limit', 'moleculeChemblId', 'page', 'pchemblValue', 'targetChemblId']);
    return this.get(`/activities${qs}`);
  }

  private async getAssays(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['assayChemblId', 'assayOrg', 'assayType', 'limit', 'page', 'targetChemblId']);
    return this.get(`/assays${qs}`);
  }

  private async getDrugs(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['accession', 'chemblId', 'identifier', 'limit', 'name', 'page', 'pubchemCid']);
    return this.get(`/drugs${qs}`);
  }

  private async getEfoTerms(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['doid', 'label', 'limit', 'mesh', 'oboId', 'omimId', 'page', 'synonym']);
    return this.get(`/efo${qs}`);
  }

  private async getHpoTerms(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['genesymbol', 'hpotermname', 'limit', 'page', 'synonym']);
    return this.get(`/hpo${qs}`);
  }

  private async getIntactInteractions(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['accession', 'confidence', 'gene', 'limit', 'page']);
    return this.get(`/intact${qs}`);
  }

  private async getMolecules(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['canonicalSmiles', 'inchiKey', 'limit', 'moleculeChemblId', 'page']);
    return this.get(`/molecules${qs}`);
  }

  private async getProteins(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['accession', 'ec', 'fullName', 'gene', 'go', 'interpro', 'limit', 'omim', 'orphanet', 'page', 'pfam', 'reactome', 'taxId']);
    return this.get(`/proteins${qs}`);
  }

  private async getPubchemBioassays(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['accession', 'assayPubchemId', 'limit', 'ncbiProteinId', 'page']);
    return this.get(`/pubchem/bioassays${qs}`);
  }

  private async getPubchemBioassaySids(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['limit', 'outcome', 'page', 'sids']);
    return this.get(`/pubchem/bioassays/sids${qs}`);
  }

  private async getPubchemCompounds(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['canonicalSmiles', 'cid', 'inchiKey', 'limit', 'page']);
    return this.get(`/pubchem/compounds${qs}`);
  }

  private async getPubchemSubstances(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['cid', 'limit', 'page', 'sid']);
    return this.get(`/pubchem/substances${qs}`);
  }

  private async getTargets(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildParams(args, ['accession', 'limit', 'page', 'targetIds']);
    return this.get(`/targets${qs}`);
  }

  static catalog() {
    return {
      name: 'ebi-ac-uk',
      displayName: 'EBI CROssBAR',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: [
        'ebi',
        'crossbar',
        'bioinformatics',
        'drug discovery',
        'proteins',
        'chembl',
        'pubchem',
        'uniprot',
        'biomedical',
        'molecules',
        'genomics',
        'targets',
        'bioassay',
        'intact',
        'phenotype',
        'ontology',
      ],
      toolNames: [
        'get_activities',
        'get_assays',
        'get_drugs',
        'get_efo_terms',
        'get_hpo_terms',
        'get_intact_interactions',
        'get_molecules',
        'get_proteins',
        'get_pubchem_bioassays',
        'get_pubchem_bioassay_sids',
        'get_pubchem_compounds',
        'get_pubchem_substances',
        'get_targets',
      ],
      description: 'EMBL-EBI CROssBAR biomedical knowledge graph: drugs, proteins, molecules, targets, bioassays, interactions, and disease ontologies from ChEMBL, UniProt, PubChem, and IntAct.',
      author: 'protectnil' as const,
    };
  }
}
