import { describe, it, expect } from 'vitest';
import { CircuitSandboxMCPServer } from '../../src/mcp-servers/circuitsandbox.js';

describe('CircuitSandboxMCPServer', () => {
  const adapter = new CircuitSandboxMCPServer({ accessToken: 'test-token' });

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
    const cat = CircuitSandboxMCPServer.catalog();
    expect(cat.name).toBe('circuitsandbox');
    expect(cat.category).toBe('logistics');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = CircuitSandboxMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('get_conversations_by_ids returns error without convId', async () => {
    const result = await adapter.callTool('get_conversations_by_ids', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('convId');
  });

  it('create_direct_conversation returns error without participant', async () => {
    const result = await adapter.callTool('create_direct_conversation', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('participant');
  });

  it('create_group_conversation returns error without participants', async () => {
    const result = await adapter.callTool('create_group_conversation', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('participants');
  });

  it('update_group_conversation returns error without convId', async () => {
    const result = await adapter.callTool('update_group_conversation', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('convId');
  });

  it('get_conversation returns error without convId', async () => {
    const result = await adapter.callTool('get_conversation', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('convId');
  });

  it('search_conversations returns error without query', async () => {
    const result = await adapter.callTool('search_conversations', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query');
  });

  it('get_conversation_items returns error without convId', async () => {
    const result = await adapter.callTool('get_conversation_items', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('convId');
  });

  it('send_message returns error without convId', async () => {
    const result = await adapter.callTool('send_message', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('convId');
  });

  it('send_message returns error without content', async () => {
    const result = await adapter.callTool('send_message', { convId: 'c1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('content');
  });

  it('update_message returns error without required fields', async () => {
    const result = await adapter.callTool('update_message', { convId: 'c1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('itemId');
  });

  it('delete_message returns error without itemId', async () => {
    const result = await adapter.callTool('delete_message', { convId: 'c1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('itemId');
  });

  it('flag_message returns error without convId', async () => {
    const result = await adapter.callTool('flag_message', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('convId');
  });

  it('unflag_message returns error without itemId', async () => {
    const result = await adapter.callTool('unflag_message', { convId: 'c1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('itemId');
  });

  it('like_message returns error without convId', async () => {
    const result = await adapter.callTool('like_message', {});
    expect(result.isError).toBe(true);
  });

  it('unlike_message returns error without itemId', async () => {
    const result = await adapter.callTool('unlike_message', { convId: 'c1' });
    expect(result.isError).toBe(true);
  });

  it('add_conversation_participants returns error without participants', async () => {
    const result = await adapter.callTool('add_conversation_participants', { convId: 'c1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('participants');
  });

  it('remove_conversation_participants returns error without convId', async () => {
    const result = await adapter.callTool('remove_conversation_participants', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('convId');
  });

  it('get_conversation_participants returns error without convId', async () => {
    const result = await adapter.callTool('get_conversation_participants', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('convId');
  });

  it('archive_conversation returns error without convId', async () => {
    const result = await adapter.callTool('archive_conversation', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('convId');
  });

  it('unarchive_conversation returns error without convId', async () => {
    const result = await adapter.callTool('unarchive_conversation', {});
    expect(result.isError).toBe(true);
  });

  it('add_conversation_to_favorites returns error without convId', async () => {
    const result = await adapter.callTool('add_conversation_to_favorites', {});
    expect(result.isError).toBe(true);
  });

  it('remove_conversation_from_favorites returns error without convId', async () => {
    const result = await adapter.callTool('remove_conversation_from_favorites', {});
    expect(result.isError).toBe(true);
  });

  it('add_conversation_label returns error without labelId', async () => {
    const result = await adapter.callTool('add_conversation_label', { convId: 'c1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('labelId');
  });

  it('remove_conversation_label returns error without labelId', async () => {
    const result = await adapter.callTool('remove_conversation_label', { convId: 'c1' });
    expect(result.isError).toBe(true);
  });

  it('pin_topic returns error without itemId', async () => {
    const result = await adapter.callTool('pin_topic', { convId: 'c1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('itemId');
  });

  it('unpin_topic returns error without itemId', async () => {
    const result = await adapter.callTool('unpin_topic', { convId: 'c1' });
    expect(result.isError).toBe(true);
  });

  it('get_pinned_topics returns error without convId', async () => {
    const result = await adapter.callTool('get_pinned_topics', {});
    expect(result.isError).toBe(true);
  });

  it('create_community_conversation returns error without topic', async () => {
    const result = await adapter.callTool('create_community_conversation', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('topic');
  });

  it('join_community returns error without convId', async () => {
    const result = await adapter.callTool('join_community', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('convId');
  });

  it('get_user_by_email returns error without emailAddress', async () => {
    const result = await adapter.callTool('get_user_by_email', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('emailAddress');
  });

  it('update_user_presence returns error without state', async () => {
    const result = await adapter.callTool('update_user_presence', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('state');
  });

  it('create_space returns error without name', async () => {
    const result = await adapter.callTool('create_space', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('update_space returns error without id', async () => {
    const result = await adapter.callTool('update_space', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_space returns error without id', async () => {
    const result = await adapter.callTool('delete_space', {});
    expect(result.isError).toBe(true);
  });

  it('join_space returns error without id', async () => {
    const result = await adapter.callTool('join_space', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('register_webhook returns error without url', async () => {
    const result = await adapter.callTool('register_webhook', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('update_webhook returns error without id', async () => {
    const result = await adapter.callTool('update_webhook', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_webhook returns error without id', async () => {
    const result = await adapter.callTool('delete_webhook', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });
});
