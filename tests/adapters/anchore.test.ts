import { describe, it, expect } from 'vitest';
import { AnchoreMCPServer } from '../../src/mcp-servers/anchore.js';

describe('AnchoreMCPServer', () => {
  const adapter = new AnchoreMCPServer({ username: 'admin', password: 'test-password' });

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

  it('catalog returns correct metadata', () => {
    const cat = AnchoreMCPServer.catalog();
    expect(cat.name).toBe('anchore');
    expect(cat.category).toBe('cybersecurity');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog toolNames match tools getter', () => {
    const cat = AnchoreMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const n of cat.toolNames) {
      expect(toolNames).toContain(n);
    }
  });

  it('add_image returns error when neither tag nor digest provided', async () => {
    const result = await adapter.callTool('add_image', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('tag or digest');
  });
});
