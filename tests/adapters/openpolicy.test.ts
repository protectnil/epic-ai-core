import { describe, it, expect } from "vitest";
import { OpenPolicyMCPServer } from "../../src/mcp-servers/openpolicy.js";

describe("OpenPolicyMCPServer", () => {
  const adapter = new OpenPolicyMCPServer({ baseUrl: "http://localhost:8181" });

  it("instantiates without error", () => {
    expect(adapter).toBeDefined();
  });

  it("instantiates with default baseUrl when no config provided", () => {
    const defaultAdapter = new OpenPolicyMCPServer();
    expect(defaultAdapter).toBeDefined();
  });

  it("exposes tools", () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it("exposes exactly 9 tools", () => {
    expect(adapter.tools.length).toBe(9);
  });

  it("every tool has required fields", () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("tool names match catalog toolNames", () => {
    const catalog = OpenPolicyMCPServer.catalog();
    const toolNames = adapter.tools.map((t) => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it("catalog returns correct category", () => {
    const catalog = OpenPolicyMCPServer.catalog();
    expect(catalog.category).toBe("compliance");
    expect(catalog.name).toBe("openpolicy");
  });

  it("unknown tool returns error, not throw", async () => {
    const result = await adapter.callTool("nonexistent_tool_xyz", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool");
  });

  it("get_policy without id returns validation error", async () => {
    const result = await adapter.callTool("get_policy", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("id is required");
  });

  it("put_policy without id returns validation error", async () => {
    const result = await adapter.callTool("put_policy", { rego_source: "package x" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("id is required");
  });

  it("put_policy without rego_source returns validation error", async () => {
    const result = await adapter.callTool("put_policy", { id: "example" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("rego_source is required");
  });

  it("delete_policy without id returns validation error", async () => {
    const result = await adapter.callTool("delete_policy", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("id is required");
  });

  it("get_document without path returns validation error", async () => {
    const result = await adapter.callTool("get_document", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("path is required");
  });

  it("put_document without path returns validation error", async () => {
    const result = await adapter.callTool("put_document", { document: "{}" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("path is required");
  });

  it("put_document without document returns validation error", async () => {
    const result = await adapter.callTool("put_document", { path: "users" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("document is required");
  });

  it("put_document with invalid JSON document returns validation error", async () => {
    const result = await adapter.callTool("put_document", { path: "users", document: "not-json" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("valid JSON");
  });

  it("delete_document without path returns validation error", async () => {
    const result = await adapter.callTool("delete_document", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("path is required");
  });

  it("execute_query without query returns validation error", async () => {
    const result = await adapter.callTool("execute_query", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("query is required");
  });
});
