import { describe, it, expect } from 'vitest';
import { GiteaMCPServer } from '../../src/mcp-servers/gitea.js';

describe('GiteaMCPServer', () => {
  const adapter = new GiteaMCPServer({ token: 'test-token', baseUrl: 'https://gitea.example.com/api/v1' });

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
    const catalog = GiteaMCPServer.catalog();
    expect(catalog.name).toBe('gitea');
    expect(catalog.category).toBe('devops');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('tool names match catalog toolNames', () => {
    const toolNames = adapter.tools.map(t => t.name);
    const catalogNames = GiteaMCPServer.catalog().toolNames;
    for (const name of toolNames) {
      expect(catalogNames).toContain(name);
    }
  });
});
