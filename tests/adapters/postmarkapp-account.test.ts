import { describe, it, expect } from 'vitest';
import { PostmarkAppAccountMCPServer } from '../../src/mcp-servers/postmarkapp-account.js';

describe('PostmarkAppAccountMCPServer', () => {
  const adapter = new PostmarkAppAccountMCPServer({ accountToken: 'test-account-token' });

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

  it('exposes server management tools', () => {
    const toolNames = adapter.tools.map(t => t.name);
    expect(toolNames).toContain('list_servers');
    expect(toolNames).toContain('get_server');
    expect(toolNames).toContain('create_server');
    expect(toolNames).toContain('update_server');
    expect(toolNames).toContain('delete_server');
  });

  it('exposes domain tools', () => {
    const toolNames = adapter.tools.map(t => t.name);
    expect(toolNames).toContain('list_domains');
    expect(toolNames).toContain('get_domain');
    expect(toolNames).toContain('create_domain');
    expect(toolNames).toContain('verify_domain_dkim');
    expect(toolNames).toContain('rotate_domain_dkim');
  });

  it('exposes sender signature tools', () => {
    const toolNames = adapter.tools.map(t => t.name);
    expect(toolNames).toContain('list_sender_signatures');
    expect(toolNames).toContain('create_sender_signature');
    expect(toolNames).toContain('verify_sender_signature_spf');
  });

  it('create_server requires name', () => {
    const tool = adapter.tools.find(t => t.name === 'create_server');
    expect(tool?.inputSchema.required).toContain('name');
  });

  it('get_server requires server_id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_server');
    expect(tool?.inputSchema.required).toContain('server_id');
  });

  it('push_templates requires source and destination server ids', () => {
    const tool = adapter.tools.find(t => t.name === 'push_templates');
    expect(tool?.inputSchema.required).toContain('source_server_id');
    expect(tool?.inputSchema.required).toContain('destination_server_id');
  });
});
