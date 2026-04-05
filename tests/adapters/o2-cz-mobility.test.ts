import { describe, it, expect } from 'vitest';
import { O2CzMobilityMCPServer } from '../../src/mcp-servers/o2-cz-mobility.js';

describe('O2CzMobilityMCPServer', () => {
  const adapter = new O2CzMobilityMCPServer();

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

  it('get_transit returns error when required params missing', async () => {
    const result = await adapter.callTool('get_transit', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('get_transit accepts optional fromType and toType', async () => {
    // Validate the tool definition has the optional params
    const transitTool = adapter.tools.find(t => t.name === 'get_transit');
    expect(transitTool).toBeDefined();
    expect(transitTool!.inputSchema.properties).toHaveProperty('fromType');
    expect(transitTool!.inputSchema.properties).toHaveProperty('toType');
    const required = transitTool!.inputSchema.required ?? [];
    expect(required).not.toContain('fromType');
    expect(required).not.toContain('toType');
  });

  it('catalog returns expected fields', () => {
    const cat = O2CzMobilityMCPServer.catalog();
    expect(cat.name).toBe('o2-cz-mobility');
    expect(cat.category).toBe('analytics');
    expect(cat.toolNames).toContain('get_transit');
    expect(cat.toolNames).toContain('get_info');
  });

  it('exposes exactly 2 tools', () => {
    expect(adapter.tools).toHaveLength(2);
  });
});
