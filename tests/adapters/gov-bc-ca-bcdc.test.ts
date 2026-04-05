import { describe, it, expect } from 'vitest';
import { GovBcCaBcdcMCPServer } from '../../src/mcp-servers/gov-bc-ca-bcdc.js';

describe('GovBcCaBcdcMCPServer', () => {
  const adapter = new GovBcCaBcdcMCPServer({});

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_package returns error when id is missing', async () => {
    const result = await adapter.callTool('get_package', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('get_resource returns error when id is missing', async () => {
    const result = await adapter.callTool('get_resource', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id is required');
  });

  it('autocomplete_packages returns error when q is missing', async () => {
    const result = await adapter.callTool('autocomplete_packages', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('q is required');
  });

  it('catalog returns correct metadata', () => {
    const catalog = GovBcCaBcdcMCPServer.catalog();
    expect(catalog.name).toBe('gov-bc-ca-bcdc');
    expect(catalog.category).toBe('government');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });
});
