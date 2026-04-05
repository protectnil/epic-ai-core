import { describe, it, expect } from 'vitest';
import { BunqMCPServer } from '../../src/mcp-servers/bunq.js';

describe('BunqMCPServer', () => {
  const adapter = new BunqMCPServer({ sessionToken: 'test-session-token', userId: '123456' });

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
    const catalog = BunqMCPServer.catalog();
    expect(catalog.name).toBe('bunq');
    expect(catalog.category).toBe('finance');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.keywords).toContain('banking');
  });

  it('catalog toolNames match tools getter', () => {
    const catalog = BunqMCPServer.catalog();
    const toolNames = adapter.tools.map((t) => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('covers key banking operations', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('list_monetary_accounts');
    expect(names).toContain('create_payment');
    expect(names).toContain('list_cards');
    expect(names).toContain('create_request_inquiry');
    expect(names).toContain('create_schedule_payment');
    expect(names).toContain('create_customer_statement');
  });
});
