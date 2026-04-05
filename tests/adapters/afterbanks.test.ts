import { describe, it, expect } from 'vitest';
import { AfterbanksMCPServer } from '../../src/mcp-servers/afterbanks.js';

describe('AfterbanksMCPServer', () => {
  const adapter = new AfterbanksMCPServer({ servicekey: 'test-servicekey-abc123' });

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
    const cat = AfterbanksMCPServer.catalog();
    expect(cat.name).toBe('afterbanks');
    expect(cat.category).toBe('finance');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog toolNames match tools getter', () => {
    const cat = AfterbanksMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const n of cat.toolNames) {
      expect(toolNames).toContain(n);
    }
  });

  it('get_accounts_and_transactions returns error when required params missing', async () => {
    const result = await adapter.callTool('get_accounts_and_transactions', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('service, user, and pass are required');
  });
});
