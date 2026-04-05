import { describe, it, expect } from 'vitest';
import { BulkSMSMCPServer } from '../../src/mcp-servers/bulksms.js';

describe('BulkSMSMCPServer', () => {
  const adapter = new BulkSMSMCPServer({ credentials: 'dXNlcjpwYXNz' }); // base64 "user:pass"

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

  it('catalog returns expected shape', () => {
    const cat = BulkSMSMCPServer.catalog();
    expect(cat.name).toBe('bulksms');
    expect(cat.category).toBe('communication');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog toolNames match tools getter', () => {
    const cat = BulkSMSMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const n of cat.toolNames) {
      expect(toolNames).toContain(n);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('send_messages requires messages', async () => {
    const result = await adapter.callTool('send_messages', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('messages');
  });

  it('send_message_get requires to and body', async () => {
    const resultMissingBoth = await adapter.callTool('send_message_get', {});
    expect(resultMissingBoth.isError).toBe(true);
    expect(resultMissingBoth.content[0].text).toContain('to');

    const resultMissingBody = await adapter.callTool('send_message_get', { to: '+27831234567' });
    expect(resultMissingBody.isError).toBe(true);
    expect(resultMissingBody.content[0].text).toContain('body');
  });

  it('show_message requires id', async () => {
    const result = await adapter.callTool('show_message', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('list_related_received_messages requires id', async () => {
    const result = await adapter.callTool('list_related_received_messages', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('create_webhook requires name, url, trigger_scope', async () => {
    const resultEmpty = await adapter.callTool('create_webhook', {});
    expect(resultEmpty.isError).toBe(true);
    expect(resultEmpty.content[0].text).toContain('name');

    const resultMissingUrl = await adapter.callTool('create_webhook', { name: 'test' });
    expect(resultMissingUrl.isError).toBe(true);
    expect(resultMissingUrl.content[0].text).toContain('url');

    const resultMissingScope = await adapter.callTool('create_webhook', { name: 'test', url: 'https://example.com' });
    expect(resultMissingScope.isError).toBe(true);
    expect(resultMissingScope.content[0].text).toContain('trigger_scope');
  });

  it('read_webhook requires id', async () => {
    const result = await adapter.callTool('read_webhook', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('update_webhook requires id', async () => {
    const result = await adapter.callTool('update_webhook', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_webhook requires id', async () => {
    const result = await adapter.callTool('delete_webhook', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('create_blocked_number requires phone_numbers array', async () => {
    const resultEmpty = await adapter.callTool('create_blocked_number', {});
    expect(resultEmpty.isError).toBe(true);

    const resultNotArray = await adapter.callTool('create_blocked_number', { phone_numbers: '+27831234567' });
    expect(resultNotArray.isError).toBe(true);
  });

  it('transfer_credits requires to_user_id, to_username, credits', async () => {
    const result = await adapter.callTool('transfer_credits', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('to_user_id');

    const result2 = await adapter.callTool('transfer_credits', { to_user_id: 123 });
    expect(result2.isError).toBe(true);
    expect(result2.content[0].text).toContain('to_username');

    const result3 = await adapter.callTool('transfer_credits', { to_user_id: 123, to_username: 'alice' });
    expect(result3.isError).toBe(true);
    expect(result3.content[0].text).toContain('credits');
  });

  it('pre_sign_attachment requires media_type and file_extension', async () => {
    const result = await adapter.callTool('pre_sign_attachment', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('media_type');

    const result2 = await adapter.callTool('pre_sign_attachment', { media_type: 'image/jpeg' });
    expect(result2.isError).toBe(true);
    expect(result2.content[0].text).toContain('file_extension');
  });

  it('retrieve_messages accepts optional params without error shape', () => {
    const tool = adapter.tools.find(t => t.name === 'retrieve_messages');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toBeUndefined();
  });

  it('get_profile has no required params', () => {
    const tool = adapter.tools.find(t => t.name === 'get_profile');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toBeUndefined();
  });
});
