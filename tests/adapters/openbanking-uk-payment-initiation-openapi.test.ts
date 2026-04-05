import { describe, it, expect } from 'vitest';
import { OpenBankingUkPaymentInitiationOpenapiMCPServer } from '../../src/mcp-servers/openbanking-uk-payment-initiation-openapi.js';

describe('OpenBankingUkPaymentInitiationOpenapiMCPServer', () => {
  const adapter = new OpenBankingUkPaymentInitiationOpenapiMCPServer({ bearerToken: 'test-token' });

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

  it('catalog returns expected shape', () => {
    const cat = OpenBankingUkPaymentInitiationOpenapiMCPServer.catalog();
    expect(cat.name).toBe('openbanking-uk-payment-initiation-openapi');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
