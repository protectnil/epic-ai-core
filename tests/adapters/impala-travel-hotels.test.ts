import { describe, it, expect } from 'vitest';
import { ImpalaHotelsMCPServer } from '../../src/mcp-servers/impala-travel-hotels.js';

describe('ImpalaHotelsMCPServer', () => {
  const adapter = new ImpalaHotelsMCPServer({ apiKey: 'test-api-key' });

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
    const catalog = ImpalaHotelsMCPServer.catalog();
    expect(catalog.name).toBe('impala-travel-hotels');
    expect(catalog.category).toBe('travel');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.keywords).toContain('hotel');
  });

  it('all catalog toolNames have a matching tool definition', () => {
    const catalog = ImpalaHotelsMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
