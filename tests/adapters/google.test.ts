import { describe, it, expect } from 'vitest';
import { GoogleMCPServer } from '../../src/mcp-servers/google.js';

describe('GoogleMCPServer', () => {
  const adapter = new GoogleMCPServer({ accessToken: 'test-token' });

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

  it('catalog returns valid metadata', () => {
    const catalog = GoogleMCPServer.catalog();
    expect(catalog.name).toBe('google');
    expect(catalog.category).toBe('cloud');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('tool names match catalog toolNames', () => {
    const toolNames = adapter.tools.map(t => t.name);
    const catalogNames = GoogleMCPServer.catalog().toolNames;
    for (const name of toolNames) {
      expect(catalogNames).toContain(name);
    }
  });
});
