import { describe, it, expect } from 'vitest';
import { OneForgeMCPServer } from '../../src/mcp-servers/1forge.js';

describe('OneForgeMCPServer', () => {
  const adapter = new OneForgeMCPServer({ apiKey: 'test-api-key' });

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

  it('unknown tool returns isError true, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns required fields', () => {
    const cat = OneForgeMCPServer.catalog();
    expect(cat.name).toBe('1forge');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = OneForgeMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('exposes get_quotes tool', () => {
    const tool = adapter.tools.find(t => t.name === 'get_quotes');
    expect(tool).toBeDefined();
    expect(tool!.description).toBeTruthy();
  });

  it('exposes get_symbols tool', () => {
    const tool = adapter.tools.find(t => t.name === 'get_symbols');
    expect(tool).toBeDefined();
    expect(tool!.description).toBeTruthy();
  });

  it('get_quotes tool has no required params (pairs is optional)', () => {
    const tool = adapter.tools.find(t => t.name === 'get_quotes');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required ?? []).toHaveLength(0);
  });
});
