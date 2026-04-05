import { describe, it, expect } from 'vitest';
import { EpaDfrMCPServer } from '../../src/mcp-servers/epa-dfr.js';

describe('EpaDfrMCPServer', () => {
  const adapter = new EpaDfrMCPServer();

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

  it('catalog returns expected shape', () => {
    const cat = EpaDfrMCPServer.catalog();
    expect(cat.name).toBe('epa-dfr');
    expect(cat.category).toBe('government');
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_facility_report returns error when p_id missing', async () => {
    const result = await adapter.callTool('get_facility_report', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('p_id');
  });

  it('get_air_compliance returns error when p_id missing', async () => {
    const result = await adapter.callTool('get_air_compliance', {});
    expect(result.isError).toBe(true);
  });
});
