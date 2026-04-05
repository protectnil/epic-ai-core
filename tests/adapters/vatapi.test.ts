import { describe, it, expect } from 'vitest';
import { VatApiMCPServer } from '../../src/mcp-servers/vatapi.js';

describe('VatApiMCPServer', () => {
  const adapter = new VatApiMCPServer({ apiKey: 'test-api-key' });

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

  it('exposes expected tool names', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('validate_vat_number');
    expect(names).toContain('get_vat_rates_by_country_code');
    expect(names).toContain('get_vat_rates_by_ip');
    expect(names).toContain('get_all_vat_rates');
    expect(names).toContain('convert_price');
    expect(names).toContain('convert_currency');
    expect(names).toContain('create_invoice');
    expect(names).toContain('get_invoice');
    expect(names).toContain('check_api_usage');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('validate_vat_number requires vatid parameter', async () => {
    const result = await adapter.callTool('validate_vat_number', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/vatid is required/);
  });

  it('get_vat_rates_by_country_code requires country_code parameter', async () => {
    const result = await adapter.callTool('get_vat_rates_by_country_code', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/country_code is required/);
  });

  it('get_vat_rates_by_ip requires address parameter', async () => {
    const result = await adapter.callTool('get_vat_rates_by_ip', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/address is required/);
  });

  it('convert_price requires amount parameter', async () => {
    const result = await adapter.callTool('convert_price', { country_code: 'DE' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/amount is required/);
  });

  it('convert_price requires country_code parameter', async () => {
    const result = await adapter.callTool('convert_price', { amount: 100 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/country_code is required/);
  });

  it('convert_currency requires all three parameters', async () => {
    const result = await adapter.callTool('convert_currency', { currency_from: 'USD' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/currency_from, currency_to, and amount are required/);
  });

  it('create_invoice requires to, items, and country_code', async () => {
    const result = await adapter.callTool('create_invoice', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/to, items, and country_code are required/);
  });

  it('get_invoice requires invoice_id parameter', async () => {
    const result = await adapter.callTool('get_invoice', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/invoice_id is required/);
  });

  it('catalog returns expected shape', () => {
    const cat = VatApiMCPServer.catalog();
    expect(cat.name).toBe('vatapi');
    expect(cat.category).toBe('finance');
    expect(cat.author).toBe('protectnil');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.keywords).toContain('vat');
  });
});
