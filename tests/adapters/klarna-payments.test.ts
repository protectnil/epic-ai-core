import { describe, it, expect } from 'vitest';
import { KlarnaPaymentsMCPServer } from '../../src/mcp-servers/klarna-payments.js';

describe('KlarnaPaymentsMCPServer', () => {
  const adapter = new KlarnaPaymentsMCPServer({ apiUser: 'test-user', apiPassword: 'test-password' });

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

  it('exposes all expected tool names', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('create_payment_session');
    expect(names).toContain('read_payment_session');
    expect(names).toContain('update_payment_session');
    expect(names).toContain('create_order');
    expect(names).toContain('cancel_authorization');
    expect(names).toContain('create_customer_token');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('create_payment_session returns error when required fields missing', async () => {
    const result = await adapter.callTool('create_payment_session', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/required/i);
  });

  it('read_payment_session returns error when session_id missing', async () => {
    const result = await adapter.callTool('read_payment_session', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/session_id/i);
  });

  it('update_payment_session returns error when session_id missing', async () => {
    const result = await adapter.callTool('update_payment_session', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/session_id/i);
  });

  it('create_order returns error when required fields missing', async () => {
    const result = await adapter.callTool('create_order', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/required/i);
  });

  it('cancel_authorization returns error when authorization_token missing', async () => {
    const result = await adapter.callTool('cancel_authorization', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/authorization_token/i);
  });

  it('create_customer_token returns error when required fields missing', async () => {
    const result = await adapter.callTool('create_customer_token', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/required/i);
  });

  it('catalog() returns expected metadata', () => {
    const cat = KlarnaPaymentsMCPServer.catalog();
    expect(cat.name).toBe('klarna-payments');
    expect(cat.category).toBe('finance');
    expect(cat.author).toBe('protectnil');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.keywords).toContain('klarna');
  });
});
