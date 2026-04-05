import { describe, it, expect } from 'vitest';
import { SimplyRetsMCPServer } from '../../src/mcp-servers/simplyrets.js';

describe('SimplyRetsMCPServer', () => {
  const adapter = new SimplyRetsMCPServer({ username: 'simplyrets', password: 'simplyrets' });

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
    const catalog = SimplyRetsMCPServer.catalog();
    expect(catalog.name).toBe('simplyrets');
    expect(catalog.category).toBe('realestate');
    expect(catalog.toolNames).toContain('search_listings');
    expect(catalog.toolNames).toContain('get_listing');
    expect(catalog.toolNames).toContain('search_openhouses');
    expect(catalog.toolNames).toContain('get_openhouse');
  });

  it('unknown tool returns error without throwing', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });
});
