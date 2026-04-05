import { describe, it, expect } from 'vitest';
import { CodatAccountingMCPServer } from '../../src/mcp-servers/codat-accounting.js';

describe('CodatAccountingMCPServer', () => {
  const adapter = new CodatAccountingMCPServer({ apiKey: 'test-api-key', companyId: 'test-company-id' });

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

  it('catalog returns correct metadata', () => {
    const catalog = CodatAccountingMCPServer.catalog();
    expect(catalog.name).toBe('codat-accounting');
    expect(catalog.category).toBe('finance');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });

  it('tool names in catalog match exposed tools', () => {
    const catalog = CodatAccountingMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of catalog.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('bank account tools return error without connectionId', async () => {
    const result = await adapter.callTool('list_bank_accounts', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('connectionId');
  });

  it('adapter with connectionId instantiates correctly', () => {
    const adapterWithConn = new CodatAccountingMCPServer({
      apiKey: 'test-key',
      companyId: 'test-company',
      connectionId: 'test-conn',
    });
    expect(adapterWithConn).toBeDefined();
    expect(adapterWithConn.tools.length).toBeGreaterThan(0);
  });
});
