import { describe, it, expect } from 'vitest';
import { OpenBankingUkMCPServer } from '../../src/mcp-servers/openbanking-uk.js';

describe('OpenBankingUkMCPServer', () => {
  const adapter = new OpenBankingUkMCPServer();

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const custom = new OpenBankingUkMCPServer({ baseUrl: 'https://example.com/api' });
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

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('catalog returns expected shape', () => {
    const catalog = OpenBankingUkMCPServer.catalog();
    expect(catalog.name).toBe('openbanking-uk');
    expect(catalog.category).toBe('finance');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
    expect(catalog.author).toBe('protectnil');
  });

  it('tools include all expected Open Data endpoints', () => {
    const toolNames = adapter.tools.map(t => t.name);
    expect(toolNames).toContain('list_atms');
    expect(toolNames).toContain('list_branches');
    expect(toolNames).toContain('list_personal_current_accounts');
    expect(toolNames).toContain('list_business_current_accounts');
    expect(toolNames).toContain('list_unsecured_sme_loans');
    expect(toolNames).toContain('list_commercial_credit_cards');
  });
});
