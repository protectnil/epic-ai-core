import { describe, it, expect } from 'vitest';
import { AblyPlatformMCPServer } from '../../src/mcp-servers/ably-platform.js';

describe('AblyPlatformMCPServer', () => {
  const adapter = new AblyPlatformMCPServer({ apiKey: 'testAppId.testKeyId:testSecret' });

  it('instantiates with apiKey', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with token', () => {
    const a = new AblyPlatformMCPServer({ token: 'test-jwt-token' });
    expect(a).toBeDefined();
  });

  it('throws without apiKey or token', () => {
    expect(() => new AblyPlatformMCPServer({})).toThrow();
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
    const cat = AblyPlatformMCPServer.catalog();
    expect(cat.name).toBe('ably-platform');
    expect(cat.category).toBe('communication');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = AblyPlatformMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('get_channel returns error without channel_id', async () => {
    const result = await adapter.callTool('get_channel', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('channel_id');
  });

  it('get_channel_messages returns error without channel_id', async () => {
    const result = await adapter.callTool('get_channel_messages', {});
    expect(result.isError).toBe(true);
  });

  it('publish_message returns error without channel_id', async () => {
    const result = await adapter.callTool('publish_message', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('channel_id');
  });

  it('get_channel_presence returns error without channel_id', async () => {
    const result = await adapter.callTool('get_channel_presence', {});
    expect(result.isError).toBe(true);
  });

  it('get_channel_presence_history returns error without channel_id', async () => {
    const result = await adapter.callTool('get_channel_presence_history', {});
    expect(result.isError).toBe(true);
  });

  it('request_access_token returns error without key_name', async () => {
    const result = await adapter.callTool('request_access_token', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('key_name');
  });

  it('get_push_device returns error without device_id', async () => {
    const result = await adapter.callTool('get_push_device', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('device_id');
  });

  it('register_push_device returns error without required fields', async () => {
    const result = await adapter.callTool('register_push_device', { id: 'dev1' });
    expect(result.isError).toBe(true);
  });

  it('update_push_device returns error without device_id', async () => {
    const result = await adapter.callTool('update_push_device', {});
    expect(result.isError).toBe(true);
  });

  it('patch_push_device returns error without device_id', async () => {
    const result = await adapter.callTool('patch_push_device', {});
    expect(result.isError).toBe(true);
  });

  it('unregister_push_device returns error without device_id', async () => {
    const result = await adapter.callTool('unregister_push_device', {});
    expect(result.isError).toBe(true);
  });

  it('reset_push_device_update_token returns error without device_id', async () => {
    const result = await adapter.callTool('reset_push_device_update_token', {});
    expect(result.isError).toBe(true);
  });

  it('publish_push_notification returns error without recipient', async () => {
    const result = await adapter.callTool('publish_push_notification', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('recipient');
  });

  it('subscribe_push_device_to_channel returns error without channel', async () => {
    const result = await adapter.callTool('subscribe_push_device_to_channel', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('channel');
  });

  it('delete_push_device_subscription returns error without channel', async () => {
    const result = await adapter.callTool('delete_push_device_subscription', {});
    expect(result.isError).toBe(true);
  });
});
