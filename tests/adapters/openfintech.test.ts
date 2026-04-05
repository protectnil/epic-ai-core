import { describe, it, expect } from 'vitest';
import { OpenFinTechMCPServer } from '../../src/mcp-servers/openfintech.js';

describe('OpenFinTechMCPServer', () => {
  const adapter = new OpenFinTechMCPServer();

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
    const cat = OpenFinTechMCPServer.catalog();
    expect(cat.name).toBe('openfintech');
    expect(cat.category).toBe('finance');
    expect(Array.isArray(cat.toolNames)).toBe(true);
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('get_bank with missing id returns error, not throw', async () => {
    const result = await adapter.callTool('get_bank', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing required parameter: id');
  });

  it('tool names match catalog toolNames', () => {
    const cat = OpenFinTechMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
