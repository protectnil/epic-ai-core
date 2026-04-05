import { describe, it, expect } from 'vitest';
import { PaymentsServiceUKPaymentsMCPServer } from '../../src/mcp-servers/payments-service-uk-payments.js';

describe('PaymentsServiceUKPaymentsMCPServer', () => {
  const adapter = new PaymentsServiceUKPaymentsMCPServer({ apiKey: 'test-api-key' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools with required fields', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('catalog returns correct shape', () => {
    const cat = PaymentsServiceUKPaymentsMCPServer.catalog();
    expect(cat.name).toBe('payments-service-uk-payments');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('unknown tool returns error without throwing', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
