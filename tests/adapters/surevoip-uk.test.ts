import { describe, it, expect } from 'vitest';
import { SureVoIPUKMCPServer } from '../../src/mcp-servers/surevoip-uk.js';

describe('SureVoIPUKMCPServer', () => {
  const adapter = new SureVoIPUKMCPServer({ username: 'test-user', password: 'test-pass' });

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

  it('create_call returns error when from is missing', async () => {
    const result = await adapter.callTool('create_call', { to: '+441234567890' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('from');
  });

  it('create_call returns error when to is missing', async () => {
    const result = await adapter.callTool('create_call', { from: '+441234567890' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('to');
  });

  it('get_customer returns error when account is missing', async () => {
    const result = await adapter.callTool('get_customer', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account');
  });

  it('get_customer_announcement returns error when announcement_id is missing', async () => {
    const result = await adapter.callTool('get_customer_announcement', { account: 'ACME-001' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('announcement_id');
  });

  it('delete_customer_announcement returns error when account is missing', async () => {
    const result = await adapter.callTool('delete_customer_announcement', { announcement_id: '123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account');
  });

  it('create_announcement returns error when required fields are missing', async () => {
    const result = await adapter.callTool('create_announcement', { description: 'test' });
    expect(result.isError).toBe(true);
  });

  it('add_charge returns error when amount is missing', async () => {
    const result = await adapter.callTool('add_charge', { description: 'Manual charge' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('amount');
  });

  it('catalog returns expected shape', () => {
    const cat = SureVoIPUKMCPServer.catalog();
    expect(cat.name).toBe('surevoip-uk');
    expect(cat.category).toBe('telecom');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('tool names in catalog match tools getter', () => {
    const cat = SureVoIPUKMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });
});
