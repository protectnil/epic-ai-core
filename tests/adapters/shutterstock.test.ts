import { describe, it, expect } from 'vitest';
import { ShutterstockMCPServer } from '../../src/mcp-servers/shutterstock.js';

describe('ShutterstockMCPServer', () => {
  const adapter = new ShutterstockMCPServer({ apiToken: 'test-token' });

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
    const cat = ShutterstockMCPServer.catalog();
    expect(cat.name).toBe('shutterstock');
    expect(cat.category).toBe('media');
    expect(cat.toolNames.length).toBe(12);
    expect(Array.isArray(cat.keywords)).toBe(true);
  });

  it('unknown tool returns error without throwing', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
