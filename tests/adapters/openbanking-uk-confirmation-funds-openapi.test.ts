import { describe, it, expect } from 'vitest';
import { OpenBankingUKConfirmationFundsOpenapiMCPServer } from '../../src/mcp-servers/openbanking-uk-confirmation-funds-openapi.js';

describe('OpenBankingUKConfirmationFundsOpenapiMCPServer', () => {
  const adapter = new OpenBankingUKConfirmationFundsOpenapiMCPServer({ accessToken: 'test-token' });

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

  it('create_funds_confirmation_consent requires debtor_account_scheme_name', async () => {
    const result = await adapter.callTool('create_funds_confirmation_consent', {
      debtor_account_identification: '60161331926819',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('debtor_account_scheme_name');
  });

  it('create_funds_confirmation_consent requires debtor_account_identification', async () => {
    const result = await adapter.callTool('create_funds_confirmation_consent', {
      debtor_account_scheme_name: 'UK.OBIE.SortCodeAccountNumber',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('debtor_account_identification');
  });

  it('get_funds_confirmation_consent requires consent_id', async () => {
    const result = await adapter.callTool('get_funds_confirmation_consent', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('consent_id');
  });

  it('delete_funds_confirmation_consent requires consent_id', async () => {
    const result = await adapter.callTool('delete_funds_confirmation_consent', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('consent_id');
  });

  it('create_funds_confirmation requires all fields', async () => {
    const result = await adapter.callTool('create_funds_confirmation', {
      consent_id: 'consent-123',
      reference: 'PAY-001',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('instructed_amount_currency');
  });

  it('catalog returns expected metadata', () => {
    const cat = OpenBankingUKConfirmationFundsOpenapiMCPServer.catalog();
    expect(cat.name).toBe('openbanking-uk-confirmation-funds-openapi');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBe(4);
  });

  it('all 4 expected tools are present', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('create_funds_confirmation_consent');
    expect(names).toContain('get_funds_confirmation_consent');
    expect(names).toContain('delete_funds_confirmation_consent');
    expect(names).toContain('create_funds_confirmation');
  });
});
