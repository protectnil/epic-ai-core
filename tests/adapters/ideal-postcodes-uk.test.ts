import { describe, it, expect } from 'vitest';
import { IdealPostcodesUKMCPServer } from '../../src/mcp-servers/ideal-postcodes-uk.js';

describe('IdealPostcodesUKMCPServer', () => {
  const adapter = new IdealPostcodesUKMCPServer({ apiKey: 'test-api-key' });

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
    const catalog = IdealPostcodesUKMCPServer.catalog();
    expect(catalog.name).toBe('ideal-postcodes-uk');
    expect(catalog.category).toBe('data');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.keywords).toContain('postcode');
  });

  it('all catalog toolNames have a matching tool definition', () => {
    const catalog = IdealPostcodesUKMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
