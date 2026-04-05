import { describe, it, expect } from 'vitest';
import { OpenFIGIMCPServer } from '../../src/mcp-servers/openfigi.js';

describe('OpenFIGIMCPServer', () => {
  const adapter = new OpenFIGIMCPServer({ apiKey: 'test-key' });

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

  it('catalog returns expected shape', () => {
    const cat = OpenFIGIMCPServer.catalog();
    expect(cat.name).toBe('openfigi');
    expect(cat.category).toBe('finance');
    expect(Array.isArray(cat.toolNames)).toBe(true);
    expect(cat.toolNames).toContain('map_identifiers');
    expect(cat.toolNames).toContain('get_mapping_values');
  });

  it('map_identifiers with empty jobs returns error', async () => {
    const result = await adapter.callTool('map_identifiers', { jobs: [] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('jobs');
  });

  it('map_identifiers with missing jobs returns error', async () => {
    const result = await adapter.callTool('map_identifiers', {});
    expect(result.isError).toBe(true);
  });

  it('get_mapping_values with missing key returns error', async () => {
    const result = await adapter.callTool('get_mapping_values', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('key');
  });

  it('tool names match catalog toolNames', () => {
    const cat = OpenFIGIMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
