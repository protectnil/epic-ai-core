import { describe, it, expect } from 'vitest';
import { O2CzSociodemoMCPServer } from '../../src/mcp-servers/o2-cz-sociodemo.js';

describe('O2CzSociodemoMCPServer', () => {
  const adapter = new O2CzSociodemoMCPServer();

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

  it('get_age_presence returns error when required params missing', async () => {
    const result = await adapter.callTool('get_age_presence', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('get_gender_presence returns error when required params missing', async () => {
    const result = await adapter.callTool('get_gender_presence', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('catalog returns expected fields', () => {
    const cat = O2CzSociodemoMCPServer.catalog();
    expect(cat.name).toBe('o2-cz-sociodemo');
    expect(cat.category).toBe('analytics');
    expect(cat.toolNames).toContain('get_age_presence');
    expect(cat.toolNames).toContain('get_gender_presence');
    expect(cat.toolNames).toContain('get_info');
  });

  it('exposes exactly 3 tools', () => {
    expect(adapter.tools).toHaveLength(3);
  });
});
