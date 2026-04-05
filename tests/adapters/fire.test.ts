import { describe, it, expect } from 'vitest';
import { FireMCPServer } from '../../src/mcp-servers/fire.js';

describe('FireMCPServer', () => {
  const adapter = new FireMCPServer({ accessToken: 'test-token' });

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

  it('unknown tool returns error result without throwing', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('catalog returns correct metadata', () => {
    const catalog = FireMCPServer.catalog();
    expect(catalog.name).toBe('fire');
    expect(catalog.category).toBe('finance');
    expect(catalog.author).toBe('protectnil');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });
});
