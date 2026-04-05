import { describe, it, expect } from 'vitest';
import { BandsintownMCPServer } from '../../src/mcp-servers/bandsintown.js';

describe('BandsintownMCPServer', () => {
  const adapter = new BandsintownMCPServer({ appId: 'test-app-id' });

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
    const cat = BandsintownMCPServer.catalog();
    expect(cat.name).toBe('bandsintown');
    expect(cat.category).toBe('music');
    expect(cat.toolNames).toContain('get_artist');
    expect(cat.toolNames).toContain('get_artist_events');
  });

  it('unknown tool returns error without throwing', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
