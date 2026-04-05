import { describe, it, expect } from 'vitest';
import { ExchangeRateApiMCPServer } from '../../src/mcp-servers/exchangerate-api.js';

describe('ExchangeRateApiMCPServer', () => {
  const adapter = new ExchangeRateApiMCPServer({ apiKey: 'test-key' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with no config (no API key)', () => {
    const anon = new ExchangeRateApiMCPServer();
    expect(anon).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new ExchangeRateApiMCPServer({
      apiKey: 'test-key',
      baseUrl: 'https://mock.example.com/v6/test-key',
    });
    expect(custom).toBeDefined();
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

  it('exposes all 8 expected tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('get_latest_rates');
    expect(names).toContain('get_latest_rates_free');
    expect(names).toContain('convert_pair');
    expect(names).toContain('convert_amount');
    expect(names).toContain('get_enriched_pair');
    expect(names).toContain('get_historical_rates');
    expect(names).toContain('list_supported_codes');
    expect(names).toContain('get_quota');
  });

  it('get_latest_rates requires base_currency', () => {
    const tool = adapter.tools.find(t => t.name === 'get_latest_rates');
    expect(tool?.inputSchema.required).toContain('base_currency');
  });

  it('convert_pair requires base_currency and target_currency', () => {
    const tool = adapter.tools.find(t => t.name === 'convert_pair');
    expect(tool?.inputSchema.required).toContain('base_currency');
    expect(tool?.inputSchema.required).toContain('target_currency');
  });

  it('convert_amount requires base_currency, target_currency, and amount', () => {
    const tool = adapter.tools.find(t => t.name === 'convert_amount');
    expect(tool?.inputSchema.required).toContain('base_currency');
    expect(tool?.inputSchema.required).toContain('target_currency');
    expect(tool?.inputSchema.required).toContain('amount');
  });

  it('get_historical_rates requires base_currency, year, month, day', () => {
    const tool = adapter.tools.find(t => t.name === 'get_historical_rates');
    expect(tool?.inputSchema.required).toContain('base_currency');
    expect(tool?.inputSchema.required).toContain('year');
    expect(tool?.inputSchema.required).toContain('month');
    expect(tool?.inputSchema.required).toContain('day');
  });

  it('catalog returns correct metadata', () => {
    const cat = ExchangeRateApiMCPServer.catalog();
    expect(cat.name).toBe('exchangerate-api');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBe(8);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });
});
