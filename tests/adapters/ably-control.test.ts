import { describe, it, expect } from 'vitest';
import { AblyControlMCPServer } from '../../src/mcp-servers/ably-control.js';

describe('AblyControlMCPServer', () => {
  const adapter = new AblyControlMCPServer({ accessToken: 'test-token' });

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

  it('catalog returns required fields', () => {
    const cat = AblyControlMCPServer.catalog();
    expect(cat.name).toBe('ably-control');
    expect(cat.category).toBe('communication');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = AblyControlMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('list_apps returns error without account_id', async () => {
    const result = await adapter.callTool('list_apps', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('account_id');
  });

  it('create_app returns error without account_id', async () => {
    const result = await adapter.callTool('create_app', {});
    expect(result.isError).toBe(true);
  });

  it('update_app returns error without app_id', async () => {
    const result = await adapter.callTool('update_app', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('app_id');
  });

  it('delete_app returns error without app_id', async () => {
    const result = await adapter.callTool('delete_app', {});
    expect(result.isError).toBe(true);
  });

  it('update_app_apns returns error without required fields', async () => {
    const result = await adapter.callTool('update_app_apns', { app_id: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('p12_file_base64');
  });

  it('list_keys returns error without app_id', async () => {
    const result = await adapter.callTool('list_keys', {});
    expect(result.isError).toBe(true);
  });

  it('create_key returns error without app_id', async () => {
    const result = await adapter.callTool('create_key', {});
    expect(result.isError).toBe(true);
  });

  it('update_key returns error without key_id', async () => {
    const result = await adapter.callTool('update_key', { app_id: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('key_id');
  });

  it('revoke_key returns error without both ids', async () => {
    const result = await adapter.callTool('revoke_key', { app_id: 'abc' });
    expect(result.isError).toBe(true);
  });

  it('list_namespaces returns error without app_id', async () => {
    const result = await adapter.callTool('list_namespaces', {});
    expect(result.isError).toBe(true);
  });

  it('update_namespace returns error without namespace_id', async () => {
    const result = await adapter.callTool('update_namespace', { app_id: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('namespace_id');
  });

  it('delete_namespace returns error without both ids', async () => {
    const result = await adapter.callTool('delete_namespace', { app_id: 'abc' });
    expect(result.isError).toBe(true);
  });

  it('list_queues returns error without app_id', async () => {
    const result = await adapter.callTool('list_queues', {});
    expect(result.isError).toBe(true);
  });

  it('create_queue returns error without name', async () => {
    const result = await adapter.callTool('create_queue', { app_id: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('delete_queue returns error without queue_id', async () => {
    const result = await adapter.callTool('delete_queue', { app_id: 'abc' });
    expect(result.isError).toBe(true);
  });

  it('list_rules returns error without app_id', async () => {
    const result = await adapter.callTool('list_rules', {});
    expect(result.isError).toBe(true);
  });

  it('get_rule returns error without rule_id', async () => {
    const result = await adapter.callTool('get_rule', { app_id: 'abc' });
    expect(result.isError).toBe(true);
  });

  it('create_rule returns error without source and target', async () => {
    const result = await adapter.callTool('create_rule', { app_id: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('source');
  });

  it('update_rule returns error without rule_id', async () => {
    const result = await adapter.callTool('update_rule', { app_id: 'abc' });
    expect(result.isError).toBe(true);
  });

  it('delete_rule returns error without rule_id', async () => {
    const result = await adapter.callTool('delete_rule', { app_id: 'abc' });
    expect(result.isError).toBe(true);
  });
});
