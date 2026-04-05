import { describe, it, expect } from 'vitest';
import { BillingoHuMCPServer } from '../../src/mcp-servers/billingo-hu.js';

describe('BillingoHuMCPServer', () => {
  const adapter = new BillingoHuMCPServer({ apiKey: 'test-key' });

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

  it('covers all expected tool names', () => {
    const names = adapter.tools.map(t => t.name);
    const expected = [
      'list_bank_accounts', 'create_bank_account', 'get_bank_account', 'update_bank_account', 'delete_bank_account',
      'get_currency_conversion_rate',
      'list_document_blocks',
      'list_documents', 'create_document', 'get_document', 'cancel_document', 'create_document_from_proforma',
      'download_document', 'get_document_public_url', 'send_document', 'get_document_online_szamla_status',
      'get_document_payment', 'update_document_payment', 'delete_document_payment',
      'get_organization',
      'list_partners', 'create_partner', 'get_partner', 'update_partner', 'delete_partner',
      'list_products', 'create_product', 'get_product', 'update_product', 'delete_product',
      'convert_legacy_id',
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('callTool missing required id throws gracefully', async () => {
    const result = await adapter.callTool('get_document', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const cat = BillingoHuMCPServer.catalog();
    expect(cat.name).toBe('billingo-hu');
    expect(cat.category).toBe('finance');
    expect(cat.author).toBe('protectnil');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('catalog toolNames match exposed tools', () => {
    const cat = BillingoHuMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('tools requiring id declare it in required array', () => {
    const idTools = ['get_bank_account', 'update_bank_account', 'delete_bank_account', 'get_document', 'get_partner', 'get_product'];
    for (const toolName of idTools) {
      const tool = adapter.tools.find(t => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema.required).toContain('id');
    }
  });
});
