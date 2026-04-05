import { describe, it, expect } from 'vitest';
import { IZettleProductsMCPServer } from '../../src/mcp-servers/izettle-products.js';

describe('IZettleProductsMCPServer', () => {
  const adapter = new IZettleProductsMCPServer({ accessToken: 'test-token' });

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

  it('catalog returns required fields', () => {
    const cat = IZettleProductsMCPServer.catalog();
    expect(cat.name).toBe('izettle-products');
    expect(cat.category).toBe('commerce');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = IZettleProductsMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  // -- Validation: organizationUuid required ---------------------------------

  it('get_library returns error without organizationUuid', async () => {
    const result = await adapter.callTool('get_library', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('organizationUuid');
  });

  it('get_all_products returns error without organizationUuid', async () => {
    const result = await adapter.callTool('get_all_products', {});
    expect(result.isError).toBe(true);
  });

  it('get_all_products_v2 returns error without organizationUuid', async () => {
    const result = await adapter.callTool('get_all_products_v2', {});
    expect(result.isError).toBe(true);
  });

  it('count_products returns error without organizationUuid', async () => {
    const result = await adapter.callTool('count_products', {});
    expect(result.isError).toBe(true);
  });

  it('get_product returns error without productUuid', async () => {
    const result = await adapter.callTool('get_product', { organizationUuid: 'org-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('productUuid');
  });

  it('get_product returns error without organizationUuid', async () => {
    const result = await adapter.callTool('get_product', {});
    expect(result.isError).toBe(true);
  });

  it('create_product returns error without name', async () => {
    const result = await adapter.callTool('create_product', { organizationUuid: 'org-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('create_product returns error without organizationUuid', async () => {
    const result = await adapter.callTool('create_product', { name: 'Test Product' });
    expect(result.isError).toBe(true);
  });

  it('update_product returns error without productUuid', async () => {
    const result = await adapter.callTool('update_product', { organizationUuid: 'org-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('productUuid');
  });

  it('delete_product returns error without productUuid', async () => {
    const result = await adapter.callTool('delete_product', { organizationUuid: 'org-1' });
    expect(result.isError).toBe(true);
  });

  it('delete_products returns error without uuids', async () => {
    const result = await adapter.callTool('delete_products', { organizationUuid: 'org-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('uuids');
  });

  it('delete_products returns error with empty uuids array', async () => {
    const result = await adapter.callTool('delete_products', { organizationUuid: 'org-1', uuids: [] });
    expect(result.isError).toBe(true);
  });

  it('get_all_options returns error without organizationUuid', async () => {
    const result = await adapter.callTool('get_all_options', {});
    expect(result.isError).toBe(true);
  });

  // -- Categories ------------------------------------------------------------

  it('get_categories returns error without organizationUuid', async () => {
    const result = await adapter.callTool('get_categories', {});
    expect(result.isError).toBe(true);
  });

  it('create_categories returns error without categories', async () => {
    const result = await adapter.callTool('create_categories', { organizationUuid: 'org-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('categories');
  });

  it('delete_category returns error without categoryUuid', async () => {
    const result = await adapter.callTool('delete_category', { organizationUuid: 'org-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('categoryUuid');
  });

  it('rename_category returns error without name', async () => {
    const result = await adapter.callTool('rename_category', { organizationUuid: 'org-1', categoryUuid: 'cat-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  // -- Discounts -------------------------------------------------------------

  it('get_all_discounts returns error without organizationUuid', async () => {
    const result = await adapter.callTool('get_all_discounts', {});
    expect(result.isError).toBe(true);
  });

  it('get_discount returns error without discountUuid', async () => {
    const result = await adapter.callTool('get_discount', { organizationUuid: 'org-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('discountUuid');
  });

  it('create_discount returns error without name', async () => {
    const result = await adapter.callTool('create_discount', { organizationUuid: 'org-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('update_discount returns error without discountUuid', async () => {
    const result = await adapter.callTool('update_discount', { organizationUuid: 'org-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('discountUuid');
  });

  it('delete_discount returns error without discountUuid', async () => {
    const result = await adapter.callTool('delete_discount', { organizationUuid: 'org-1' });
    expect(result.isError).toBe(true);
  });

  it('get_all_image_urls returns error without organizationUuid', async () => {
    const result = await adapter.callTool('get_all_image_urls', {});
    expect(result.isError).toBe(true);
  });

  // -- Import ----------------------------------------------------------------

  it('import_library returns error without organizationUuid', async () => {
    const result = await adapter.callTool('import_library', {});
    expect(result.isError).toBe(true);
  });

  it('get_import_status returns error without organizationUuid', async () => {
    const result = await adapter.callTool('get_import_status', {});
    expect(result.isError).toBe(true);
  });

  it('get_import_status_by_uuid returns error without importUuid', async () => {
    const result = await adapter.callTool('get_import_status_by_uuid', { organizationUuid: 'org-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('importUuid');
  });

  // -- Tax Rates -------------------------------------------------------------

  it('get_tax_rate returns error without taxRateUuid', async () => {
    const result = await adapter.callTool('get_tax_rate', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('taxRateUuid');
  });

  it('create_tax_rates returns error without taxRates', async () => {
    const result = await adapter.callTool('create_tax_rates', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('taxRates');
  });

  it('update_tax_rate returns error without taxRateUuid', async () => {
    const result = await adapter.callTool('update_tax_rate', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('taxRateUuid');
  });

  it('delete_tax_rate returns error without taxRateUuid', async () => {
    const result = await adapter.callTool('delete_tax_rate', {});
    expect(result.isError).toBe(true);
  });

  it('set_taxation_mode returns error without taxationMode', async () => {
    const result = await adapter.callTool('set_taxation_mode', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('taxationMode');
  });

  it('create_product_slug returns error without organizationUuid', async () => {
    const result = await adapter.callTool('create_product_slug', {});
    expect(result.isError).toBe(true);
  });
});
