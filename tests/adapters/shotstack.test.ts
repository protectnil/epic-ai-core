import { describe, it, expect } from 'vitest';
import { ShotstackMCPServer } from '../../src/mcp-servers/shotstack.js';

describe('ShotstackMCPServer', () => {
  const adapter = new ShotstackMCPServer({ apiKey: 'test-key', environment: 'stage' });

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
    const cat = ShotstackMCPServer.catalog();
    expect(cat.name).toBe('shotstack');
    expect(cat.category).toBe('media');
    expect(cat.toolNames.length).toBe(5);
    expect(Array.isArray(cat.keywords)).toBe(true);
  });

  it('unknown tool returns error without throwing', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
