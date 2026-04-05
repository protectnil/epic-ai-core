import { describe, it, expect } from "vitest";
import { FirmalyzerIotvasMCPServer } from "../../src/mcp-servers/firmalyzer-iotvas.js";

describe("FirmalyzerIotvasMCPServer", () => {
  const adapter = new FirmalyzerIotvasMCPServer({ apiKey: "test-api-key" });

  it("instantiates without error", () => {
    expect(adapter).toBeDefined();
  });

  it("accepts custom baseUrl", () => {
    const custom = new FirmalyzerIotvasMCPServer({
      apiKey: "key",
      baseUrl: "https://custom.example.com/api/v1/",
    });
    expect(custom).toBeDefined();
  });

  it("exposes catalog metadata", () => {
    const catalog = FirmalyzerIotvasMCPServer.catalog();
    expect(catalog.name).toBe("firmalyzer-iotvas");
    expect(catalog.category).toBe("iot");
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

  it("exposes all 8 documented tools", () => {
    const names = adapter.tools.map((t) => t.name);
    const expected = [
      "detect_device",
      "get_firmware_accounts",
      "get_firmware_config_issues",
      "get_firmware_expired_certs",
      "get_firmware_private_keys",
      "get_firmware_risk",
      "get_firmware_weak_certs",
      "get_firmware_weak_keys",
    ];
    for (const e of expected) {
      expect(names).toContain(e);
    }
  });

  it("firmware tools require firmware_hash", () => {
    const firmwareTools = adapter.tools.filter((t) => t.name.startsWith("get_firmware_"));
    for (const tool of firmwareTools) {
      expect(tool.inputSchema.required).toContain("firmware_hash");
    }
  });

  it("detect_device has no required fields (all optional banners)", () => {
    const tool = adapter.tools.find((t) => t.name === "detect_device");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toBeUndefined();
  });

  it("unknown tool returns error, not throw", async () => {
    const result = await adapter.callTool("nonexistent_tool_xyz", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool");
  });

  it("callTool dispatches detect_device without network call (fetch not defined)", async () => {
    // fetch is not available in test env; we expect a network-related error, not
    // an unknown-tool error -- confirming dispatch routing works correctly.
    const result = await adapter.callTool("detect_device", { nic_mac: "AA:BB:CC:DD:EE:FF" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toContain("Unknown tool");
  });

  it("callTool dispatches get_firmware_risk without network call", async () => {
    const result = await adapter.callTool("get_firmware_risk", {
      firmware_hash: "af88b1aaac0b222df8539f3ae1479b5c8eaeae41f1776b5dd2fa805cb33a1175",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toContain("Unknown tool");
  });
});
