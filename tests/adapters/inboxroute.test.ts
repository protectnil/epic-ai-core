import { describe, it, expect } from 'vitest';
import { InboxrouteMCPServer } from '../../src/mcp-servers/inboxroute.js';

describe('InboxrouteMCPServer', () => {
  const adapter = new InboxrouteMCPServer({ apiKey: 'test-api-key' });

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

  it('catalog returns correct metadata', () => {
    const cat = InboxrouteMCPServer.catalog();
    expect(cat.name).toBe('inboxroute');
    expect(cat.category).toBe('communication');
    expect(cat.toolNames.length).toBe(adapter.tools.length);
    expect(cat.author).toBe('protectnil');
  });

  it('catalog toolNames match tool definitions', () => {
    const cat = InboxrouteMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('update_contact without contactid returns error', async () => {
    const result = await adapter.callTool('update_contact', { email: 'test@example.com' });
    expect(result.isError).toBe(true);
  });

  it('delete_contact without contactid returns error', async () => {
    const result = await adapter.callTool('delete_contact', {});
    expect(result.isError).toBe(true);
  });

  it('create_contact_list without name returns error', async () => {
    const result = await adapter.callTool('create_contact_list', {});
    expect(result.isError).toBe(true);
  });

  it('update_contact_list without listid returns error', async () => {
    const result = await adapter.callTool('update_contact_list', { name: 'Updated List' });
    expect(result.isError).toBe(true);
  });

  it('delete_contact_list without listid returns error', async () => {
    const result = await adapter.callTool('delete_contact_list', {});
    expect(result.isError).toBe(true);
  });

  it('subscribe_to_list without listid returns error', async () => {
    const result = await adapter.callTool('subscribe_to_list', { email: 'user@example.com' });
    expect(result.isError).toBe(true);
  });

  it('subscribe_to_list without email returns error', async () => {
    const result = await adapter.callTool('subscribe_to_list', { listid: 'abc1234567890123' });
    expect(result.isError).toBe(true);
  });
});
