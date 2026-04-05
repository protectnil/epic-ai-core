/**
 * FireBrowse Beta API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. No official Broad Institute / FireBrowse
//   MCP server exists on GitHub or npmjs.
//
// Base URL: http://firebrowse.org/api/v1
// Auth: None required -- public API (TCGA cancer genomics open data)
// Docs: http://firebrowse.org/api-docs/
// Spec: https://api.apis.guru/v2/specs/firebrowse.org/1.1.38/swagger.json
// Rate limits: Not published. Data is read-only and publicly accessible.
// Note: API serves data from The Cancer Genome Atlas (TCGA) program.

import { ToolDefinition, ToolResult } from "./types.js";
import { MCPAdapterBase } from './base.js';

interface FirebrowseConfig {
  baseUrl?: string; // default: http://firebrowse.org/api/v1
}

export class FirebrowseMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: FirebrowseConfig = {}) {
    super();
    this.baseUrl = (config.baseUrl ?? "http://firebrowse.org/api/v1").replace(/\/$/, "");
  }

  static catalog() {
    return {
      name: "firebrowse",
      displayName: "FireBrowse (TCGA Cancer Genomics)",
      version: "1.0.0",
      category: "science" as const,
      keywords: [
        "cancer", "genomics", "tcga", "firebrowse", "rna-seq", "mirna", "copy number",
        "mutation", "maf", "clinical", "bioinformatics", "broad institute", "open data",
      ],
      toolNames: [
        "get_copy_number_genes_all",
        "get_copy_number_genes_amplified",
        "get_copy_number_genes_deleted",
        "get_copy_number_genes_focal",
        "get_copy_number_genes_thresholded",
        "get_feature_table",
        "get_mutation_maf",
        "get_mutation_smg",
        "get_analyses_reports",
        "get_mrna_seq_quartiles",
        "get_standard_data",
        "get_metadata_centers",
        "get_metadata_cohorts",
        "get_metadata_counts",
        "get_metadata_dates",
        "get_metadata_heartbeat",
        "get_metadata_patients",
        "get_metadata_platforms",
        "get_metadata_sample_types",
        "get_metadata_tssites",
        "get_sample_type_by_barcode",
        "get_sample_type_by_code",
        "get_sample_type_by_short_letter_code",
        "get_samples_clinical",
        "get_samples_mrna_seq",
        "get_samples_mirna_seq",
      ],
      description:
        "Access TCGA cancer genomics data via FireBrowse: copy number variation, mutation analysis (MAF/SMG), mRNA/miRNA expression, clinical samples, metadata (cohorts, centers, platforms, patients), and archive listings.",
      author: "protectnil",
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Copy Number --------------------------------------------------------
      {
        name: "get_copy_number_genes_all",
        description:
          "Retrieve all-thresholded copy number data for genes across TCGA cohorts. Returns GISTIC2 results with participant-level values.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:                  { type: "string", description: "TCGA cohort abbreviation(s), e.g. BRCA or BRCA,LUAD (comma-separated)" },
            gene:                    { type: "string", description: "Gene symbol(s), e.g. TP53 or TP53,EGFR" },
            tcga_participant_barcode:{ type: "string", description: "TCGA participant barcode(s), e.g. TCGA-GF-A4EO" },
            page:                    { type: "integer", description: "Page number for pagination (default: 1)" },
            page_size:               { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:                 { type: "string", description: "Column name to sort results by" },
            format:                  { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_copy_number_genes_amplified",
        description:
          "Retrieve amplified copy number gene results from GISTIC2 analysis for one or more TCGA cohorts.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:    { type: "string", description: "TCGA cohort abbreviation(s), e.g. BRCA" },
            gene:      { type: "string", description: "Gene symbol(s), e.g. ERBB2" },
            q:         { type: "number", description: "GISTIC q-value threshold (default: 0.05)" },
            page:      { type: "integer", description: "Page number (default: 1)" },
            page_size: { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:   { type: "string", description: "Column name to sort by" },
            format:    { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_copy_number_genes_deleted",
        description:
          "Retrieve deleted copy number gene results from GISTIC2 analysis for one or more TCGA cohorts.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:    { type: "string", description: "TCGA cohort abbreviation(s), e.g. GBM" },
            gene:      { type: "string", description: "Gene symbol(s), e.g. PTEN" },
            q:         { type: "number", description: "GISTIC q-value threshold (default: 0.05)" },
            page:      { type: "integer", description: "Page number (default: 1)" },
            page_size: { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:   { type: "string", description: "Column name to sort by" },
            format:    { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_copy_number_genes_focal",
        description:
          "Retrieve focal copy number alteration data for genes from GISTIC2 analysis.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:                  { type: "string", description: "TCGA cohort abbreviation(s)" },
            gene:                    { type: "string", description: "Gene symbol(s)" },
            tcga_participant_barcode:{ type: "string", description: "TCGA participant barcode(s)" },
            page:                    { type: "integer", description: "Page number (default: 1)" },
            page_size:               { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:                 { type: "string", description: "Column name to sort by" },
            format:                  { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_copy_number_genes_thresholded",
        description:
          "Retrieve thresholded copy number values (-2, -1, 0, 1, 2) for genes from GISTIC2.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:                  { type: "string", description: "TCGA cohort abbreviation(s)" },
            gene:                    { type: "string", description: "Gene symbol(s)" },
            tcga_participant_barcode:{ type: "string", description: "TCGA participant barcode(s)" },
            page:                    { type: "integer", description: "Page number (default: 1)" },
            page_size:               { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:                 { type: "string", description: "Column name to sort by" },
            format:                  { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      // -- Feature Table & mRNA Quartiles -------------------------------------
      {
        name: "get_feature_table",
        description:
          "Retrieve the feature table of per-cohort analysis results, optionally filtered by cohort, date, and column name.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:    { type: "string", description: "TCGA cohort abbreviation(s)" },
            date:      { type: "string", description: "Report date in YYYY-MM-DD format" },
            column:    { type: "string", description: "Specific column name to retrieve" },
            page:      { type: "integer", description: "Page number (default: 1)" },
            page_size: { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            format:    { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_mrna_seq_quartiles",
        description:
          "Retrieve mRNA-seq expression quartile data for a gene across cohorts and sample types.",
        inputSchema: {
          type: "object",
          properties: {
            gene:        { type: "string", description: "Gene symbol, e.g. EGFR", required: ["gene"] },
            cohort:      { type: "string", description: "TCGA cohort abbreviation(s)" },
            protocol:    { type: "string", description: "RNA-seq protocol, e.g. IlluminaHiSeq" },
            sample_type: { type: "string", description: "Sample type abbreviation, e.g. TP (primary tumor)" },
            Exclude:     { type: "string", description: "Comma-separated barcodes to exclude" },
            format:      { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
          required: ["gene"],
        },
      },
      // -- Mutation -----------------------------------------------------------
      {
        name: "get_mutation_maf",
        description:
          "Retrieve Mutation Annotation Format (MAF) data for somatic mutations across cohorts, genes, and participants.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:                  { type: "string", description: "TCGA cohort abbreviation(s)" },
            tool:                    { type: "string", description: "Mutation calling tool, e.g. MutSig2CV" },
            gene:                    { type: "string", description: "Gene symbol(s), e.g. TP53" },
            tcga_participant_barcode:{ type: "string", description: "TCGA participant barcode(s)" },
            column:                  { type: "string", description: "Specific MAF column(s) to return" },
            page:                    { type: "integer", description: "Page number (default: 1)" },
            page_size:               { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:                 { type: "string", description: "Column name to sort by" },
            format:                  { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_mutation_smg",
        description:
          "Retrieve Significantly Mutated Genes (SMG) results for a cohort, with optional rank and q-value filters.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:    { type: "string", description: "TCGA cohort abbreviation(s)" },
            tool:      { type: "string", description: "SMG detection tool, e.g. MutSig2CV" },
            rank:      { type: "integer", description: "Return only the top N ranked genes" },
            gene:      { type: "string", description: "Gene symbol(s) to filter results" },
            q:         { type: "number", description: "Maximum q-value threshold (default: 0.1)" },
            page:      { type: "integer", description: "Page number (default: 1)" },
            page_size: { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:   { type: "string", description: "Column name to sort by" },
            format:    { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      // -- Reports & Archives -------------------------------------------------
      {
        name: "get_analyses_reports",
        description:
          "Retrieve FireBrowse analysis report listings for cohorts, including available report names and types.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:    { type: "string", description: "TCGA cohort abbreviation(s)" },
            date:      { type: "string", description: "Run date filter in YYYY-MM-DD format" },
            name:      { type: "string", description: "Report name filter" },
            type:      { type: "string", description: "Report type filter" },
            page:      { type: "integer", description: "Page number (default: 1)" },
            page_size: { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:   { type: "string", description: "Column name to sort by" },
            format:    { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_standard_data",
        description:
          "List standard data archives available in FireBrowse, filterable by cohort, data type, platform, center, and analysis level.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:     { type: "string", description: "TCGA cohort abbreviation(s)" },
            date:       { type: "string", description: "Archive date in YYYY-MM-DD format" },
            data_type:  { type: "string", description: "Data type, e.g. CopyNumber_Gistic2" },
            tool:       { type: "string", description: "Analysis tool name" },
            platform:   { type: "string", description: "Platform name, e.g. IlluminaHiSeq_RNASeqV2" },
            center:     { type: "string", description: "TCGA center code" },
            level:      { type: "string", description: "Data level: 1, 2, or 3" },
            protocol:   { type: "string", description: "Protocol name" },
            page:       { type: "integer", description: "Page number (default: 1)" },
            page_size:  { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:    { type: "string", description: "Column name to sort by" },
            format:     { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      // -- Metadata -----------------------------------------------------------
      {
        name: "get_metadata_centers",
        description:
          "List TCGA analysis centers participating in data generation, optionally filtered by center code.",
        inputSchema: {
          type: "object",
          properties: {
            center: { type: "string", description: "Center code to filter, e.g. broad.mit.edu" },
            format: { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_metadata_cohorts",
        description:
          "List all available TCGA cohort abbreviations and their descriptions, optionally filtered by cohort name.",
        inputSchema: {
          type: "object",
          properties: {
            cohort: { type: "string", description: "Cohort abbreviation to filter, e.g. BRCA or LUAD" },
            format: { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_metadata_counts",
        description:
          "Retrieve sample counts per cohort and data type, with optional filters for date, sample type, and data type.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:      { type: "string", description: "TCGA cohort abbreviation(s)" },
            date:        { type: "string", description: "Run date in YYYY-MM-DD format" },
            sample_type: { type: "string", description: "Sample type abbreviation, e.g. TP" },
            data_type:   { type: "string", description: "Data type name" },
            totals:       { type: "boolean", description: "Return totals instead of per-cohort breakdown" },
            sort_by:     { type: "string", description: "Column name to sort by" },
            format:      { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_metadata_dates",
        description:
          "List all FireBrowse data run dates available for download and analysis.",
        inputSchema: {
          type: "object",
          properties: {
            format: { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_metadata_heartbeat",
        description:
          "Check if the FireBrowse API is alive and responding. Returns service uptime status.",
        inputSchema: {
          type: "object",
          properties: {
            format: { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_metadata_patients",
        description:
          "List TCGA participant barcodes for one or more cohorts, with pagination support.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:    { type: "string", description: "TCGA cohort abbreviation(s), e.g. BRCA" },
            page:      { type: "integer", description: "Page number (default: 1)" },
            page_size: { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:   { type: "string", description: "Column name to sort by" },
            format:    { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_metadata_platforms",
        description:
          "List TCGA molecular profiling platforms used in data generation, optionally filtered by platform name.",
        inputSchema: {
          type: "object",
          properties: {
            platform: { type: "string", description: "Platform name to filter, e.g. IlluminaHiSeq_RNASeqV2" },
            format:   { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_metadata_sample_types",
        description:
          "List all TCGA sample type definitions including code, short letter code, and description.",
        inputSchema: {
          type: "object",
          properties: {
            format: { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_metadata_tssites",
        description:
          "List all TCGA Tissue Source Sites (TSS) and their associated descriptions, optionally filtered by TSS code.",
        inputSchema: {
          type: "object",
          properties: {
            tss_code: { type: "string", description: "Two-letter TSS code to filter, e.g. GF" },
            format:   { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_sample_type_by_barcode",
        description:
          "Look up TCGA sample type information for a given TCGA barcode.",
        inputSchema: {
          type: "object",
          properties: {
            TCGA_Barcode: {
              type: "string",
              description: "Full TCGA sample barcode, e.g. TCGA-GF-A4EO-01A-11D-A26O-05",
            },
            format: { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
          required: ["TCGA_Barcode"],
        },
      },
      {
        name: "get_sample_type_by_code",
        description:
          "Look up TCGA sample type information by numeric sample type code, e.g. 01 for Primary Solid Tumor.",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Two-digit sample type code, e.g. 01 (Primary Solid Tumor), 11 (Solid Tissue Normal)",
            },
            format: { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
          required: ["code"],
        },
      },
      {
        name: "get_sample_type_by_short_letter_code",
        description:
          "Look up TCGA sample type information by short letter code, e.g. TP for Primary Tumor.",
        inputSchema: {
          type: "object",
          properties: {
            short_letter_code: {
              type: "string",
              description: "Short letter code, e.g. TP (Primary Tumor), NT (Normal Tissue), NB (Blood Normal)",
            },
            format: { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
          required: ["short_letter_code"],
        },
      },
      // -- Samples ------------------------------------------------------------
      {
        name: "get_samples_clinical",
        description:
          "Retrieve clinical data for TCGA samples, optionally filtered by cohort, participant barcode, and CDE name.",
        inputSchema: {
          type: "object",
          properties: {
            cohort:                  { type: "string", description: "TCGA cohort abbreviation(s)" },
            tcga_participant_barcode:{ type: "string", description: "TCGA participant barcode(s)" },
            cde_name:                { type: "string", description: "Clinical Data Element name(s) to return" },
            page:                    { type: "integer", description: "Page number (default: 1)" },
            page_size:               { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:                 { type: "string", description: "Column name to sort by" },
            format:                  { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_samples_mrna_seq",
        description:
          "Retrieve mRNA-seq expression values for TCGA samples, filterable by gene, cohort, barcode, sample type, and protocol.",
        inputSchema: {
          type: "object",
          properties: {
            gene:                    { type: "string", description: "Gene symbol(s), e.g. EGFR or EGFR,KRAS" },
            cohort:                  { type: "string", description: "TCGA cohort abbreviation(s)" },
            tcga_participant_barcode:{ type: "string", description: "TCGA participant barcode(s)" },
            sample_type:             { type: "string", description: "Sample type abbreviation, e.g. TP" },
            protocol:                { type: "string", description: "RNA-seq protocol, e.g. RSEM or RPKM" },
            page:                    { type: "integer", description: "Page number (default: 1)" },
            page_size:               { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:                 { type: "string", description: "Column name to sort by" },
            format:                  { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
      {
        name: "get_samples_mirna_seq",
        description:
          "Retrieve miRNA-seq expression data for TCGA samples, filterable by miRNA ID, cohort, barcode, tool, and sample type.",
        inputSchema: {
          type: "object",
          properties: {
            mir:                     { type: "string", description: "miRNA ID(s), e.g. hsa-mir-21" },
            cohort:                  { type: "string", description: "TCGA cohort abbreviation(s)" },
            tcga_participant_barcode:{ type: "string", description: "TCGA participant barcode(s)" },
            tool:                    { type: "string", description: "miRNA quantification tool name" },
            sample_type:             { type: "string", description: "Sample type abbreviation, e.g. TP" },
            page:                    { type: "integer", description: "Page number (default: 1)" },
            page_size:               { type: "integer", description: "Results per page (default: 250, max: 2000)" },
            sort_by:                 { type: "string", description: "Column name to sort by" },
            format:                  { type: "string", description: "Response format: json (default), tsv, or csv" },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case "get_copy_number_genes_all":        return await this.getRequest("/Analyses/CopyNumber/Genes/All", args);
        case "get_copy_number_genes_amplified":  return await this.getRequest("/Analyses/CopyNumber/Genes/Amplified", args);
        case "get_copy_number_genes_deleted":    return await this.getRequest("/Analyses/CopyNumber/Genes/Deleted", args);
        case "get_copy_number_genes_focal":      return await this.getRequest("/Analyses/CopyNumber/Genes/Focal", args);
        case "get_copy_number_genes_thresholded":return await this.getRequest("/Analyses/CopyNumber/Genes/Thresholded", args);
        case "get_feature_table":                return await this.getRequest("/Analyses/FeatureTable", args);
        case "get_mutation_maf":                 return await this.getRequest("/Analyses/Mutation/MAF", args);
        case "get_mutation_smg":                 return await this.getRequest("/Analyses/Mutation/SMG", args);
        case "get_analyses_reports":             return await this.getRequest("/Analyses/Reports", args);
        case "get_mrna_seq_quartiles":           return await this.getRequest("/Analyses/mRNASeq/Quartiles", args);
        case "get_standard_data":                return await this.getRequest("/Archives/StandardData", args);
        case "get_metadata_centers":             return await this.getRequest("/Metadata/Centers", args);
        case "get_metadata_cohorts":             return await this.getRequest("/Metadata/Cohorts", args);
        case "get_metadata_counts":              return await this.getRequest("/Metadata/Counts", args);
        case "get_metadata_dates":               return await this.getRequest("/Metadata/Dates", args);
        case "get_metadata_heartbeat":           return await this.getRequest("/Metadata/HeartBeat", args);
        case "get_metadata_patients":            return await this.getRequest("/Metadata/Patients", args);
        case "get_metadata_platforms":           return await this.getRequest("/Metadata/Platforms", args);
        case "get_metadata_sample_types":        return await this.getRequest("/Metadata/SampleTypes", args);
        case "get_metadata_tssites":             return await this.getRequest("/Metadata/TSSites", args);
        case "get_sample_type_by_barcode":       return await this.getSampleTypeByBarcode(args);
        case "get_sample_type_by_code":          return await this.getSampleTypeByCode(args);
        case "get_sample_type_by_short_letter_code": return await this.getSampleTypeByShortLetterCode(args);
        case "get_samples_clinical":             return await this.getRequest("/Samples/Clinical", args);
        case "get_samples_mrna_seq":             return await this.getRequest("/Samples/mRNASeq", args);
        case "get_samples_mirna_seq":            return await this.getRequest("/Samples/miRSeq", args);
        default:
          return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: "text", text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // -- Private helpers --------------------------------------------------------

  private buildQuery(args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    // Always request JSON unless overridden
    params.set("format", (args.format as string) ?? "json");
    const skip = new Set(["format"]);
    for (const [k, v] of Object.entries(args)) {
      if (skip.has(k) || v === undefined || v === null) continue;
      params.set(k, String(v));
    }
    return params.toString();
  }

  private async firebrowseRequest(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      let detail = "";
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: "text", text: `FireBrowse API error ${response.status} ${response.statusText}${detail ? ": " + detail.slice(0, 400) : ""}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: "text", text: `FireBrowse returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: "text", text: truncated }], isError: false };
  }

  private async getRequest(endpoint: string, args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQuery(args);
    return this.firebrowseRequest(`${endpoint}?${qs}`);
  }

  private async getSampleTypeByBarcode(args: Record<string, unknown>): Promise<ToolResult> {
    const barcode = encodeURIComponent(args.TCGA_Barcode as string);
    const fmt = (args.format as string) ?? "json";
    return this.firebrowseRequest(`/Metadata/SampleType/Barcode/${barcode}?format=${fmt}`);
  }

  private async getSampleTypeByCode(args: Record<string, unknown>): Promise<ToolResult> {
    const code = encodeURIComponent(args.code as string);
    const fmt = (args.format as string) ?? "json";
    return this.firebrowseRequest(`/Metadata/SampleType/Code/${code}?format=${fmt}`);
  }

  private async getSampleTypeByShortLetterCode(args: Record<string, unknown>): Promise<ToolResult> {
    const slc = encodeURIComponent(args.short_letter_code as string);
    const fmt = (args.format as string) ?? "json";
    return this.firebrowseRequest(`/Metadata/SampleType/ShortLetterCode/${slc}?format=${fmt}`);
  }
}
