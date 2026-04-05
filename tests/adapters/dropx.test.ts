import { describe, it, expect } from 'vitest';
import { DropXMCPServer } from '../../src/mcp-servers/dropx.js';

describe('DropXMCPServer', () => {
  const adapter = new DropXMCPServer({ apiKey: 'test-api-key' });

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
    const catalog = DropXMCPServer.catalog();
    expect(catalog.name).toBe('dropx');
    expect(catalog.category).toBe('ecommerce');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('tool names in catalog match actual tools', () => {
    const catalog = DropXMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('get_products_by_ids requires pids', () => {
    const tool = adapter.tools.find(t => t.name === 'get_products_by_ids');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('pids');
  });

  it('search_by_link requires url', () => {
    const tool = adapter.tools.find(t => t.name === 'search_by_link');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('url');
  });

  it('search_by_title requires term', () => {
    const tool = adapter.tools.find(t => t.name === 'search_by_title');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('term');
  });

  it('get_usage has no required params', () => {
    const tool = adapter.tools.find(t => t.name === 'get_usage');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toBeUndefined();
  });

  it('search tools support optional providers param', () => {
    const toolsWithProviders = ['search_by_link', 'search_by_link_v2', 'search_by_title', 'search_by_title_v2'];
    for (const name of toolsWithProviders) {
      const tool = adapter.tools.find(t => t.name === name);
      expect(tool).toBeDefined();
      const props = Object.keys(tool!.inputSchema.properties as object);
      expect(props).toContain('providers');
    }
  });
});
