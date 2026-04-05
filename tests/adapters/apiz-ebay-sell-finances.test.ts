import { describe, it, expect } from 'vitest';
import { ApizEbaySellFinancesMCPServer } from '../../src/mcp-servers/apiz-ebay-sell-finances.js';

describe('ApizEbaySellFinancesMCPServer', () => {
  const adapter = new ApizEbaySellFinancesMCPServer({ accessToken: 'test-token' });

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

  it('exposes all 7 expected tools', () => {
    const toolNames = adapter.tools.map(t => t.name);
    expect(toolNames).toContain('list_payouts');
    expect(toolNames).toContain('get_payout');
    expect(toolNames).toContain('get_payout_summary');
    expect(toolNames).toContain('get_seller_funds_summary');
    expect(toolNames).toContain('list_transactions');
    expect(toolNames).toContain('get_transaction_summary');
    expect(toolNames).toContain('get_transfer');
  });

  it('get_payout requires payout_id in inputSchema', () => {
    const tool = adapter.tools.find(t => t.name === 'get_payout');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('payout_id');
  });

  it('get_transfer requires transfer_id in inputSchema', () => {
    const tool = adapter.tools.find(t => t.name === 'get_transfer');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('transfer_id');
  });

  it('catalog returns correct metadata', () => {
    const catalog = ApizEbaySellFinancesMCPServer.catalog();
    expect(catalog.name).toBe('apiz-ebay-sell-finances');
    expect(catalog.category).toBe('finance');
    expect(catalog.author).toBe('protectnil');
    expect(catalog.toolNames.length).toBe(7);
  });
});
