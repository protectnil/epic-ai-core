import { describe, it, expect } from 'vitest';
import { IDTBeyondMCPServer } from '../../src/mcp-servers/idtbeyond.js';

describe('IDTBeyondMCPServer', () => {
  const adapter = new IDTBeyondMCPServer({ appId: 'test-app-id', appKey: 'test-app-key' });

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
    const catalog = IDTBeyondMCPServer.catalog();
    expect(catalog.name).toBe('idtbeyond');
    expect(catalog.category).toBe('telecom');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.keywords).toContain('topup');
  });

  it('all catalog toolNames have a matching tool definition', () => {
    const catalog = IDTBeyondMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
