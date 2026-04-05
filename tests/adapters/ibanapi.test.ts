import { describe, it, expect } from 'vitest';
import { IbanapiMCPServer } from '../../src/mcp-servers/ibanapi.js';

describe('IbanapiMCPServer', () => {
  const adapter = new IbanapiMCPServer({ apiKey: 'test-api-key' });

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

  it('exposes exactly 3 tools', () => {
    expect(adapter.tools).toHaveLength(3);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('validate_iban missing iban returns error', async () => {
    const result = await adapter.callTool('validate_iban', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('iban is required');
  });

  it('validate_iban_basic missing iban returns error', async () => {
    const result = await adapter.callTool('validate_iban_basic', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('iban is required');
  });

  it('validate_iban tool has iban in required array', () => {
    const tool = adapter.tools.find(t => t.name === 'validate_iban');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('iban');
  });

  it('validate_iban_basic tool has iban in required array', () => {
    const tool = adapter.tools.find(t => t.name === 'validate_iban_basic');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('iban');
  });

  it('get_account_balance tool does not require arguments', () => {
    const tool = adapter.tools.find(t => t.name === 'get_account_balance');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toBeUndefined();
  });

  it('catalog returns correct metadata', () => {
    const cat = IbanapiMCPServer.catalog();
    expect(cat.name).toBe('ibanapi');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames).toContain('validate_iban');
    expect(cat.toolNames).toContain('validate_iban_basic');
    expect(cat.toolNames).toContain('get_account_balance');
    expect(cat.author).toBe('protectnil');
  });

  it('catalog keywords include finance-related terms', () => {
    const cat = IbanapiMCPServer.catalog();
    expect(cat.keywords).toContain('iban');
    expect(cat.keywords).toContain('finance');
    expect(cat.keywords).toContain('bank');
  });

  it('accepts custom baseUrl', () => {
    const custom = new IbanapiMCPServer({ apiKey: 'key', baseUrl: 'https://custom.example.com/v1' });
    expect(custom).toBeDefined();
  });

  it('tool names match catalog toolNames', () => {
    const cat = IbanapiMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
