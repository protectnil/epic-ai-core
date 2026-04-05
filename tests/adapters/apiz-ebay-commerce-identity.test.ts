import { describe, it, expect } from 'vitest';
import { ApizEbayCommerceIdentityMCPServer } from '../../src/mcp-servers/apiz-ebay-commerce-identity.js';

describe('ApizEbayCommerceIdentityMCPServer', () => {
  const adapter = new ApizEbayCommerceIdentityMCPServer({ accessToken: 'test-token' });

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

  it('exposes get_user tool', () => {
    const toolNames = adapter.tools.map(t => t.name);
    expect(toolNames).toContain('get_user');
  });

  it('catalog returns correct metadata', () => {
    const catalog = ApizEbayCommerceIdentityMCPServer.catalog();
    expect(catalog.name).toBe('apiz-ebay-commerce-identity');
    expect(catalog.category).toBe('ecommerce');
    expect(catalog.author).toBe('protectnil');
    expect(catalog.toolNames).toContain('get_user');
  });
});
