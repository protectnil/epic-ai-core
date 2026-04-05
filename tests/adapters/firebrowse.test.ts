import { describe, it, expect } from "vitest";
import { FirebrowseMCPServer } from "../../src/mcp-servers/firebrowse.js";

describe("FirebrowseMCPServer", () => {
  const adapter = new FirebrowseMCPServer();

  it("instantiates without error (no config required)", () => {
    expect(adapter).toBeDefined();
  });

  it("accepts custom baseUrl", () => {
    const custom = new FirebrowseMCPServer({ baseUrl: "http://localhost:8080/api/v1/" });
    expect(custom).toBeDefined();
  });

  it("exposes catalog metadata", () => {
    const catalog = FirebrowseMCPServer.catalog();
    expect(catalog.name).toBe("firebrowse");
    expect(catalog.category).toBe("science");
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.description).toBeTruthy();
  });

  it("exposes tools", () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it("every tool has required fields", () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("exposes all 26 documented tools", () => {
    const names = adapter.tools.map((t) => t.name);
    const expected = [
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
    ];
    for (const e of expected) {
      expect(names).toContain(e);
    }
  });

  it("path-param tools require their path argument", () => {
    const byBarcode = adapter.tools.find((t) => t.name === "get_sample_type_by_barcode");
    expect(byBarcode!.inputSchema.required).toContain("TCGA_Barcode");

    const byCode = adapter.tools.find((t) => t.name === "get_sample_type_by_code");
    expect(byCode!.inputSchema.required).toContain("code");

    const bySlc = adapter.tools.find((t) => t.name === "get_sample_type_by_short_letter_code");
    expect(bySlc!.inputSchema.required).toContain("short_letter_code");
  });

  it("get_mrna_seq_quartiles requires gene", () => {
    const tool = adapter.tools.find((t) => t.name === "get_mrna_seq_quartiles");
    expect(tool!.inputSchema.required).toContain("gene");
  });

  it("unknown tool returns error, not throw", async () => {
    const result = await adapter.callTool("nonexistent_tool_xyz", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool");
  });

  it("callTool dispatches get_metadata_heartbeat (confirms routing)", async () => {
    // The public FireBrowse API may succeed or fail in CI; either way it must NOT
    // be an unknown-tool error -- proving the dispatcher routed correctly.
    const result = await adapter.callTool("get_metadata_heartbeat", {});
    expect(result.content[0].text).not.toContain("Unknown tool");
  });

  it("callTool dispatches get_mutation_maf (confirms routing)", async () => {
    const result = await adapter.callTool("get_mutation_maf", { cohort: "BRCA", gene: "TP53" });
    expect(result.content[0].text).not.toContain("Unknown tool");
  });

  it("callTool dispatches get_sample_type_by_barcode (confirms routing)", async () => {
    const result = await adapter.callTool("get_sample_type_by_barcode", {
      TCGA_Barcode: "TCGA-GF-A4EO-01A-11D-A26O-05",
    });
    expect(result.content[0].text).not.toContain("Unknown tool");
  });
});
