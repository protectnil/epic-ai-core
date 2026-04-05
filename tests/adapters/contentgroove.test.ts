import { describe, it, expect } from 'vitest';
import { ContentGrooveMCPServer } from '../../src/mcp-servers/contentgroove.js';

describe('ContentGrooveMCPServer', () => {
  const adapter = new ContentGrooveMCPServer({ apiKey: 'test-key' });

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

  it('static catalog returns correct metadata', () => {
    const catalog = ContentGrooveMCPServer.catalog();
    expect(catalog.name).toBe('contentgroove');
    expect(catalog.category).toBe('media');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('catalog toolNames match tools getter', () => {
    const catalog = ContentGrooveMCPServer.catalog();
    const toolGetterNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolGetterNames).toContain(name);
    }
  });
});
