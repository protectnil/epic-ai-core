import { describe, it, expect } from 'vitest';
import { PayRunMCPServer } from '../../src/mcp-servers/payrun.js';

describe('PayRunMCPServer', () => {
  const adapter = new PayRunMCPServer({ authorizationHeader: 'OAuth realm="test"' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools with required fields', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('catalog returns correct shape', () => {
    const cat = PayRunMCPServer.catalog();
    expect(cat.name).toBe('payrun');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('unknown tool returns error without throwing', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
