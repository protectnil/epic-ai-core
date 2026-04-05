import { describe, it, expect } from 'vitest';
import { IXAPIMCPServer } from '../../src/mcp-servers/ix-api.js';

describe('IXAPIMCPServer', () => {
  const adapter = new IXAPIMCPServer({ baseUrl: 'https://api.example-ix.net/api/v2' });

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

  it('includes core IX-API tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('auth_token');
    expect(names).toContain('list_connections');
    expect(names).toContain('create_connection');
    expect(names).toContain('list_port_reservations');
    expect(names).toContain('list_network_service_configs');
    expect(names).toContain('get_health');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('auth_token requires username and password', async () => {
    const result = await adapter.callTool('auth_token', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('create_contact requires managing_account, name, email', async () => {
    const result = await adapter.callTool('create_contact', { managing_account: 'acc1' });
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const catalog = IXAPIMCPServer.catalog();
    expect(catalog.name).toBe('ix-api');
    expect(catalog.category).toBe('telecom');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });
});
