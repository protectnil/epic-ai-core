import { describe, it, expect } from 'vitest';
import { QualpayMCPServer } from '../../src/mcp-servers/qualpay.js';

describe('QualpayMCPServer', () => {
  const adapter = new QualpayMCPServer({ merchantId: '100000000111', securityKey: 'test-key' });

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

  it('exposes all 14 expected tools', () => {
    const names = adapter.tools.map(t => t.name);
    const expected = [
      'get_card_type',
      'authorize_transaction',
      'capture_transaction',
      'sale_transaction',
      'credit_transaction',
      'force_transaction',
      'refund_transaction',
      'recharge_transaction',
      'void_transaction',
      'tokenize_card',
      'verify_card',
      'expire_token',
      'close_batch',
      'send_receipt_email',
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('capture_transaction requires pg_id_orig', async () => {
    const result = await adapter.callTool('capture_transaction', { amt_tran: 10.00 });
    expect(result.isError).toBe(true);
  });

  it('refund_transaction requires pg_id_orig', async () => {
    const result = await adapter.callTool('refund_transaction', { amt_tran: 10.00 });
    expect(result.isError).toBe(true);
  });

  it('recharge_transaction requires pg_id_orig', async () => {
    const result = await adapter.callTool('recharge_transaction', { amt_tran: 10.00 });
    expect(result.isError).toBe(true);
  });

  it('void_transaction requires pg_id_orig', async () => {
    const result = await adapter.callTool('void_transaction', {});
    expect(result.isError).toBe(true);
  });

  it('send_receipt_email requires pg_id', async () => {
    const result = await adapter.callTool('send_receipt_email', { email_address: ['test@example.com'] });
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const cat = QualpayMCPServer.catalog();
    expect(cat.name).toBe('qualpay');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBe(14);
    expect(cat.author).toBe('protectnil');
  });
});
