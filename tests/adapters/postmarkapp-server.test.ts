import { describe, it, expect } from 'vitest';
import { PostmarkServerMCPServer } from '../../src/mcp-servers/postmarkapp-server.js';

describe('PostmarkServerMCPServer', () => {
  const adapter = new PostmarkServerMCPServer({ serverToken: 'test-token' });

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

  it('includes core communication tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('send_email');
    expect(names).toContain('send_email_with_template');
    expect(names).toContain('get_bounces');
    expect(names).toContain('search_outbound_messages');
    expect(names).toContain('list_templates');
    expect(names).toContain('get_server_configuration');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('send_email_batch rejects empty messages array', async () => {
    const result = await adapter.callTool('send_email_batch', { messages: [] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('empty');
  });

  it('send_email_batch rejects non-array messages', async () => {
    const result = await adapter.callTool('send_email_batch', { messages: 'not-array' });
    expect(result.isError).toBe(true);
  });

  it('update_template requires templateIdOrAlias', async () => {
    const result = await adapter.callTool('update_template', { Name: 'New Name' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('catalog returns correct metadata', () => {
    const catalog = PostmarkServerMCPServer.catalog();
    expect(catalog.name).toBe('postmarkapp-server');
    expect(catalog.category).toBe('communication');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });
});
