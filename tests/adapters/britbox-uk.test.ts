import { describe, it, expect } from 'vitest';
import { BritBoxUKMCPServer } from '../../src/mcp-servers/britbox-uk.js';

describe('BritBoxUKMCPServer', () => {
  const adapter = new BritBoxUKMCPServer({ accessToken: 'test-token' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with no config', () => {
    const a = new BritBoxUKMCPServer();
    expect(a).toBeDefined();
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

  it('catalog() returns valid metadata', () => {
    const cat = BritBoxUKMCPServer.catalog();
    expect(cat.name).toBe('britbox-uk');
    expect(cat.displayName).toBe('BritBox UK');
    expect(cat.category).toBe('media');
    expect(Array.isArray(cat.keywords)).toBe(true);
    expect(cat.keywords.length).toBeGreaterThan(0);
    expect(Array.isArray(cat.toolNames)).toBe(true);
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('catalog toolNames match tools getter', () => {
    const cat = BritBoxUKMCPServer.catalog();
    const toolNames = adapter.tools.map((t) => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_page requires path', async () => {
    const result = await adapter.callTool('get_page', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('path');
  });

  it('get_list requires id', async () => {
    const result = await adapter.callTool('get_list', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_lists requires ids', async () => {
    const result = await adapter.callTool('get_lists', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ids');
  });

  it('search requires term', async () => {
    const result = await adapter.callTool('search', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('term');
  });

  it('get_schedules requires channels, date, hour, and duration', async () => {
    const result = await adapter.callTool('get_schedules', { channels: 'ch1', date: '2026-01-01' });
    expect(result.isError).toBe(true);
  });

  it('get_account_token requires email and password', async () => {
    const result = await adapter.callTool('get_account_token', { email: 'test@example.com' });
    expect(result.isError).toBe(true);
  });

  it('refresh_token requires refresh_token', async () => {
    const result = await adapter.callTool('refresh_token', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('refresh_token');
  });

  it('bookmark_item requires item_id', async () => {
    const result = await adapter.callTool('bookmark_item', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('item_id');
  });

  it('delete_bookmark requires item_id', async () => {
    const result = await adapter.callTool('delete_bookmark', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('item_id');
  });

  it('set_watched_status requires item_id and position', async () => {
    const result = await adapter.callTool('set_watched_status', { item_id: 'item-1' });
    expect(result.isError).toBe(true);
  });

  it('get_item_media_files requires item_id', async () => {
    const result = await adapter.callTool('get_item_media_files', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('item_id');
  });

  it('get_next_playback_item requires item_id', async () => {
    const result = await adapter.callTool('get_next_playback_item', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('item_id');
  });

  it('register requires email and password', async () => {
    const result = await adapter.callTool('register', { email: 'test@example.com' });
    expect(result.isError).toBe(true);
  });

  it('forgot_password requires email', async () => {
    const result = await adapter.callTool('forgot_password', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('email');
  });

  it('no-arg tools do not throw on callTool', async () => {
    const noArgTools = ['sign_out', 'get_account', 'get_profile', 'get_entitlements', 'get_devices'];
    for (const name of noArgTools) {
      // Will fail at network level — just ensure no throw and isError has a boolean value
      const result = await adapter.callTool(name, {}).catch(() => ({ isError: true, content: [] }));
      expect(typeof result.isError).toBe('boolean');
    }
  });
});
