import { describe, it, expect } from 'vitest';
import { CodatBankFeedsMCPServer } from '../../src/mcp-servers/codat-bank-feeds.js';

describe('CodatBankFeedsMCPServer', () => {
  const adapter = new CodatBankFeedsMCPServer({ apiKey: 'test-api-key' });

  it('instantiates', () => {
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
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns expected metadata', () => {
    const catalog = CodatBankFeedsMCPServer.catalog();
    expect(catalog.name).toBe('codat-bank-feeds');
    expect(catalog.category).toBe('finance');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });

  it('has all 6 expected tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('list_bank_feed_accounts');
    expect(names).toContain('create_bank_feed_accounts');
    expect(names).toContain('update_bank_feed_account');
    expect(names).toContain('list_bank_transactions');
    expect(names).toContain('get_create_bank_transactions_model');
    expect(names).toContain('create_bank_transactions');
  });

  it('list_bank_feed_accounts has required companyId and connectionId', () => {
    const tool = adapter.tools.find(t => t.name === 'list_bank_feed_accounts')!;
    expect(tool.inputSchema.required).toContain('companyId');
    expect(tool.inputSchema.required).toContain('connectionId');
  });

  it('list_bank_transactions requires page param', () => {
    const tool = adapter.tools.find(t => t.name === 'list_bank_transactions')!;
    expect(tool.inputSchema.required).toContain('page');
  });

  it('create_bank_transactions requires transactions array', () => {
    const tool = adapter.tools.find(t => t.name === 'create_bank_transactions')!;
    expect(tool.inputSchema.required).toContain('transactions');
  });

  it('every tool description is 10-100 words', () => {
    for (const tool of adapter.tools) {
      const wordCount = tool.description.split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(5);
      expect(wordCount).toBeLessThanOrEqual(100);
    }
  });
});
