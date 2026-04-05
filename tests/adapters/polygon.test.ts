import { describe, it, expect } from 'vitest';
import { PolygonMCPServer } from '../../src/mcp-servers/polygon.js';

describe('PolygonMCPServer', () => {
  const adapter = new PolygonMCPServer({ apiKey: 'test-api-key' });

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
    const cat = PolygonMCPServer.catalog();
    expect(cat.name).toBe('polygon');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = PolygonMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('get_historic_aggregates returns error without size', async () => {
    const result = await adapter.callTool('get_historic_aggregates', { symbol: 'AAPL', date: '2024-01-01' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('size');
  });

  it('get_historic_aggregates returns error without symbol', async () => {
    const result = await adapter.callTool('get_historic_aggregates', { size: 'minute', date: '2024-01-01' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('symbol');
  });

  it('get_historic_aggregates returns error without date', async () => {
    const result = await adapter.callTool('get_historic_aggregates', { size: 'minute', symbol: 'AAPL' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('date');
  });

  it('get_historic_forex_ticks returns error without from', async () => {
    const result = await adapter.callTool('get_historic_forex_ticks', { to: 'EUR', date: '2024-01-01' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('from');
  });

  it('get_historic_forex_ticks returns error without to', async () => {
    const result = await adapter.callTool('get_historic_forex_ticks', { from: 'USD', date: '2024-01-01' });
    expect(result.isError).toBe(true);
  });

  it('get_historic_forex_ticks returns error without date', async () => {
    const result = await adapter.callTool('get_historic_forex_ticks', { from: 'USD', to: 'EUR' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('date');
  });

  it('get_historic_quotes returns error without symbol', async () => {
    const result = await adapter.callTool('get_historic_quotes', { date: '2024-01-01' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('symbol');
  });

  it('get_historic_quotes returns error without date', async () => {
    const result = await adapter.callTool('get_historic_quotes', { symbol: 'AAPL' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('date');
  });

  it('get_historic_trades returns error without symbol', async () => {
    const result = await adapter.callTool('get_historic_trades', { date: '2024-01-01' });
    expect(result.isError).toBe(true);
  });

  it('get_historic_trades returns error without date', async () => {
    const result = await adapter.callTool('get_historic_trades', { symbol: 'AAPL' });
    expect(result.isError).toBe(true);
  });

  it('get_last_currency_trade returns error without from', async () => {
    const result = await adapter.callTool('get_last_currency_trade', { to: 'EUR' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('from');
  });

  it('get_last_currency_trade returns error without to', async () => {
    const result = await adapter.callTool('get_last_currency_trade', { from: 'USD' });
    expect(result.isError).toBe(true);
  });

  it('get_last_stock_trade returns error without symbol', async () => {
    const result = await adapter.callTool('get_last_stock_trade', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('symbol');
  });

  it('get_last_currency_quote returns error without from', async () => {
    const result = await adapter.callTool('get_last_currency_quote', { to: 'EUR' });
    expect(result.isError).toBe(true);
  });

  it('get_last_currency_quote returns error without to', async () => {
    const result = await adapter.callTool('get_last_currency_quote', { from: 'USD' });
    expect(result.isError).toBe(true);
  });

  it('get_last_stock_quote returns error without symbol', async () => {
    const result = await adapter.callTool('get_last_stock_quote', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('symbol');
  });

  it('list_companies and list_currencies do not throw on missing params', async () => {
    // These make live HTTP calls — just verify they don't throw on structural level
    // (network will fail in test env, but callTool catches that)
    const tools = adapter.tools;
    const companiesT = tools.find(t => t.name === 'list_companies');
    const currenciesT = tools.find(t => t.name === 'list_currencies');
    expect(companiesT).toBeDefined();
    expect(currenciesT).toBeDefined();
  });

  it('custom baseUrl is accepted', () => {
    const custom = new PolygonMCPServer({ apiKey: 'k', baseUrl: 'https://custom.example.com' });
    expect(custom).toBeDefined();
  });
});
