import { describe, it, expect } from 'vitest';
import { NAuthMCPServer } from '../../src/mcp-servers/n-auth.js';

describe('NAuthMCPServer', () => {
  const adapter = new NAuthMCPServer({ apiKey: 'test-api-key' });

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

  it('get_server requires serverid', async () => {
    const result = await adapter.callTool('get_server', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('serverid is required');
  });

  it('get_users requires serverid', async () => {
    const result = await adapter.callTool('get_users', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('serverid is required');
  });

  it('check_session requires serverid and nonce', async () => {
    const result = await adapter.callTool('check_session', { serverid: 'srv1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('nonce');
  });

  it('create_transaction requires serverid, nonce, and msg', async () => {
    const result = await adapter.callTool('create_transaction', { serverid: 'srv1', nonce: 'n1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('msg');
  });

  it('delete_user requires serverid and userid', async () => {
    const result = await adapter.callTool('delete_user', { serverid: 'srv1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('userid');
  });

  it('update_account requires serverid, accountid, and blocked', async () => {
    const result = await adapter.callTool('update_account', { serverid: 'srv1', accountid: 'acc1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('blocked');
  });

  it('catalog returns correct name and category', () => {
    const cat = NAuthMCPServer.catalog();
    expect(cat.name).toBe('n-auth');
    expect(cat.category).toBe('identity');
    expect(cat.author).toBe('protectnil');
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('catalog toolNames match tools getter', () => {
    const cat = NAuthMCPServer.catalog();
    const toolNames = adapter.tools.map((t) => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('instantiates with suRole', () => {
    const withSu = new NAuthMCPServer({ apiKey: 'k', suRole: 'admin' });
    expect(withSu).toBeDefined();
    expect(withSu.tools.length).toBeGreaterThan(0);
  });

  it('grant_permissions requires serverid, roleid, and permissions', async () => {
    const result = await adapter.callTool('grant_permissions', { serverid: 'srv1', roleid: 'r1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('permissions');
  });
});
