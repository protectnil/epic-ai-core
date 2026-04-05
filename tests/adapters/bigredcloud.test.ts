import { describe, it, expect } from 'vitest';
import { BigRedCloudMCPServer } from '../../src/mcp-servers/bigredcloud.js';

describe('BigRedCloudMCPServer', () => {
  const adapter = new BigRedCloudMCPServer({ apiKey: 'test-api-key' });

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

  it('catalog returns expected shape', () => {
    const catalog = BigRedCloudMCPServer.catalog();
    expect(catalog.name).toBe('bigredcloud');
    expect(catalog.category).toBe('finance');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.keywords).toContain('accounting');
  });

  it('catalog toolNames match tools getter', () => {
    const catalog = BigRedCloudMCPServer.catalog();
    const toolNames = adapter.tools.map((t) => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('covers key finance operations', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('list_customers');
    expect(names).toContain('create_sales_invoice');
    expect(names).toContain('list_suppliers');
    expect(names).toContain('list_vat_rates');
    expect(names).toContain('list_payments');
    expect(names).toContain('get_company_settings');
  });
});
