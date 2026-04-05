import { describe, it, expect } from 'vitest';
import { EtherpadMCPServer } from '../../src/mcp-servers/etherpad.js';

describe('EtherpadMCPServer', () => {
  const adapter = new EtherpadMCPServer({ apiKey: 'test-key' });

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

  it('catalog returns expected metadata', () => {
    const cat = EtherpadMCPServer.catalog();
    expect(cat.name).toBe('etherpad');
    expect(cat.category).toBe('collaboration');
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });
});
