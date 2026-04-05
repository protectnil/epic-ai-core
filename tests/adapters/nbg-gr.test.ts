import { describe, it, expect } from 'vitest';
import { NbgGrMCPServer } from '../../src/mcp-servers/nbg-gr.js';

describe('NbgGrMCPServer', () => {
  const adapter = new NbgGrMCPServer({
    accessToken: 'test-access-token-abc123',
    clientId: 'test-client-id-xyz',
    sandboxId: 'test-sandbox-001',
  });

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
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('catalog returns correct metadata', () => {
    const cat = NbgGrMCPServer.catalog();
    expect(cat.name).toBe('nbg-gr');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog toolNames match tools getter', () => {
    const cat = NbgGrMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const n of cat.toolNames) {
      expect(toolNames).toContain(n);
    }
  });

  it('create_account_access_consent returns error when permissions missing', async () => {
    const result = await adapter.callTool('create_account_access_consent', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('permissions array is required');
  });

  it('get_account_access_consent returns error when consent_id missing', async () => {
    const result = await adapter.callTool('get_account_access_consent', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('consent_id is required');
  });

  it('delete_account_access_consent returns error when consent_id missing', async () => {
    const result = await adapter.callTool('delete_account_access_consent', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('consent_id is required');
  });

  it('get_account returns error when account_id missing', async () => {
    const result = await adapter.callTool('get_account', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account_id is required');
  });

  it('get_account_balances returns error when account_id missing', async () => {
    const result = await adapter.callTool('get_account_balances', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account_id is required');
  });

  it('get_account_transactions returns error when account_id missing', async () => {
    const result = await adapter.callTool('get_account_transactions', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account_id is required');
  });

  it('get_account_beneficiaries returns error when account_id missing', async () => {
    const result = await adapter.callTool('get_account_beneficiaries', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account_id is required');
  });

  it('get_account_standing_orders returns error when account_id missing', async () => {
    const result = await adapter.callTool('get_account_standing_orders', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account_id is required');
  });

  it('get_account_scheduled_payments returns error when account_id missing', async () => {
    const result = await adapter.callTool('get_account_scheduled_payments', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account_id is required');
  });

  it('get_account_statements returns error when account_id missing', async () => {
    const result = await adapter.callTool('get_account_statements', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account_id is required');
  });

  it('get_account_statement returns error when account_id or statement_id missing', async () => {
    const result = await adapter.callTool('get_account_statement', { account_id: 'acc-1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account_id and statement_id are required');
  });

  it('get_account_statement_transactions returns error when params missing', async () => {
    const result = await adapter.callTool('get_account_statement_transactions', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account_id and statement_id are required');
  });

  it('get_account_parties returns error when account_id missing', async () => {
    const result = await adapter.callTool('get_account_parties', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account_id is required');
  });

  it('create_sandbox returns error when sandbox_id missing', async () => {
    const result = await adapter.callTool('create_sandbox', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sandbox_id is required');
  });

  it('export_sandbox returns error when sandbox_id missing', async () => {
    const result = await adapter.callTool('export_sandbox', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sandbox_id is required');
  });

  it('delete_sandbox returns error when sandbox_id missing', async () => {
    const result = await adapter.callTool('delete_sandbox', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sandbox_id is required');
  });

  it('instantiates with custom baseUrl', () => {
    const prod = new NbgGrMCPServer({
      accessToken: 'token',
      clientId: 'cid',
      baseUrl: 'https://services.nbg.gr/apis/open-banking/v3.1.5/aisp',
    });
    expect(prod).toBeDefined();
  });

  it('catalog displayName is set', () => {
    const cat = NbgGrMCPServer.catalog();
    expect(cat.displayName).toBeTruthy();
  });

  it('catalog keywords include finance-related terms', () => {
    const cat = NbgGrMCPServer.catalog();
    expect(cat.keywords).toContain('open-banking');
    expect(cat.keywords).toContain('finance');
  });
});
