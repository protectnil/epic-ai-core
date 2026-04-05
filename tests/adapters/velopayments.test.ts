import { describe, it, expect } from 'vitest';
import { VeloPaymentsMCPServer } from '../../src/mcp-servers/velopayments.js';

describe('VeloPaymentsMCPServer', () => {
  const adapter = new VeloPaymentsMCPServer({ apiKey: 'dGVzdC1rZXk6dGVzdC1zZWNyZXQ=' });
  const adapterWithPayor = new VeloPaymentsMCPServer({
    apiKey: 'dGVzdC1rZXk6dGVzdC1zZWNyZXQ=',
    payorId: 'test-payor-id',
  });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with optional payorId', () => {
    expect(adapterWithPayor).toBeDefined();
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
    const cat = VeloPaymentsMCPServer.catalog();
    expect(cat.name).toBe('velopayments');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = VeloPaymentsMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('list_payees tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'list_payees');
    expect(tool).toBeDefined();
  });

  it('get_payee tool exists with payee_id param', () => {
    const tool = adapter.tools.find(t => t.name === 'get_payee');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty('payee_id');
  });

  it('list_payments_for_payor tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'list_payments_for_payor');
    expect(tool).toBeDefined();
  });

  it('withdraw_payment tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'withdraw_payment');
    expect(tool).toBeDefined();
  });

  it('list_source_accounts tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'list_source_accounts');
    expect(tool).toBeDefined();
  });

  it('get_source_account tool exists with source_account_id param', () => {
    const tool = adapter.tools.find(t => t.name === 'get_source_account');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties).toHaveProperty('source_account_id');
  });

  it('create_funding_request tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'create_funding_request');
    expect(tool).toBeDefined();
  });

  it('list_webhooks tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'list_webhooks');
    expect(tool).toBeDefined();
  });

  it('create_webhook tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'create_webhook');
    expect(tool).toBeDefined();
  });

  it('authenticate tool exists', () => {
    const tool = adapter.tools.find(t => t.name === 'authenticate');
    expect(tool).toBeDefined();
  });
});
