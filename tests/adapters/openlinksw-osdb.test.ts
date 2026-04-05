import { describe, it, expect } from "vitest";
import { OpenLinkOsdbMCPServer } from "../../src/mcp-servers/openlinksw-osdb.js";

describe("OpenLinkOsdbMCPServer", () => {
  const adapter = new OpenLinkOsdbMCPServer({ baseUrl: "https://osdb.openlinksw.com/osdb" });

  it("instantiates without error", () => {
    expect(adapter).toBeDefined();
  });

  it("instantiates with default baseUrl when no config provided", () => {
    const defaultAdapter = new OpenLinkOsdbMCPServer();
    expect(defaultAdapter).toBeDefined();
  });

  it("exposes tools", () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it("exposes exactly 10 tools", () => {
    expect(adapter.tools.length).toBe(10);
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
    const catalog = OpenLinkOsdbMCPServer.catalog();
    const toolNames = adapter.tools.map((t) => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it("catalog returns correct category", () => {
    const catalog = OpenLinkOsdbMCPServer.catalog();
    expect(catalog.category).toBe("data");
    expect(catalog.name).toBe("openlinksw-osdb");
  });

  it("unknown tool returns error, not throw", async () => {
    const result = await adapter.callTool("nonexistent_tool_xyz", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool");
  });

  it("load_service without service_description_url returns validation error", async () => {
    const result = await adapter.callTool("load_service", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("service_description_url is required");
  });

  it("describe_service without service_id returns validation error", async () => {
    const result = await adapter.callTool("describe_service", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("service_id is required");
  });

  it("unload_service without service_id returns validation error", async () => {
    const result = await adapter.callTool("unload_service", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("service_id is required");
  });

  it("list_actions without service_id returns validation error", async () => {
    const result = await adapter.callTool("list_actions", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("service_id is required");
  });

  it("describe_action without service_id returns validation error", async () => {
    const result = await adapter.callTool("describe_action", { action_id: "read" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("service_id is required");
  });

  it("describe_action without action_id returns validation error", async () => {
    const result = await adapter.callTool("describe_action", { service_id: "my-service" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("action_id is required");
  });

  it("get_action_help without service_id returns validation error", async () => {
    const result = await adapter.callTool("get_action_help", { action_id: "read" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("service_id is required");
  });

  it("get_action_help without action_id returns validation error", async () => {
    const result = await adapter.callTool("get_action_help", { service_id: "my-service" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("action_id is required");
  });

  it("execute_action without service_id returns validation error", async () => {
    const result = await adapter.callTool("execute_action", { action_id: "read" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("service_id is required");
  });

  it("execute_action without action_id returns validation error", async () => {
    const result = await adapter.callTool("execute_action", { service_id: "my-service" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("action_id is required");
  });
});
