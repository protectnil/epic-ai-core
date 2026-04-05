import { describe, it, expect } from 'vitest';
import { LyftMCPServer } from '../../src/mcp-servers/lyft.js';

describe('LyftMCPServer', () => {
  const adapter = new LyftMCPServer({ accessToken: 'test-bearer-token' });

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

  it('catalog returns correct metadata', () => {
    const cat = LyftMCPServer.catalog();
    expect(cat.name).toBe('lyft');
    expect(cat.category).toBe('travel');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(typeof cat.description).toBe('string');
  });

  it('unknown tool returns isError true without throwing', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
