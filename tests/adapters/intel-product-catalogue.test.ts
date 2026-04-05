import { describe, it, expect } from 'vitest';
import { IntelProductCatalogueMCPServer } from '../../src/mcp-servers/intel-product-catalogue.js';

describe('IntelProductCatalogueMCPServer', () => {
  const adapter = new IntelProductCatalogueMCPServer({
    username: 'test-user',
    password: 'test-pass',
    clientId: 'test-client-id',
  });

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

  it('exposes expected tool names', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('list_products');
    expect(names).toContain('get_product_info');
    expect(names).toContain('get_ordering_info');
    expect(names).toContain('get_codenames');
  });

  it('list_products returns error when locale_geo_id missing', async () => {
    const result = await adapter.callTool('list_products', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('locale_geo_id');
  });

  it('list_products returns error when neither category_id nor product_id provided', async () => {
    const result = await adapter.callTool('list_products', { locale_geo_id: 'en-US' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('category_id');
  });

  it('get_product_info returns error when product_id missing', async () => {
    const result = await adapter.callTool('get_product_info', { locale_geo_id: 'en-US' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('product_id');
  });

  it('get_ordering_info returns error when locale_geo_id missing', async () => {
    const result = await adapter.callTool('get_ordering_info', { product_id: '["123003"]' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('locale_geo_id');
  });

  it('get_codenames returns error when locale_geo_id missing', async () => {
    const result = await adapter.callTool('get_codenames', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('locale_geo_id');
  });

  it('static catalog returns correct metadata', () => {
    const cat = IntelProductCatalogueMCPServer.catalog();
    expect(cat.name).toBe('intel-product-catalogue');
    expect(cat.category).toBe('data');
    expect(cat.author).toBe('protectnil');
    expect(cat.keywords).toContain('intel');
    expect(cat.keywords).toContain('processor');
  });
});
