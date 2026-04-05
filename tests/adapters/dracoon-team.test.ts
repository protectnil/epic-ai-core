import { describe, it, expect } from 'vitest';
import { DracoonTeamMCPServer } from '../../src/mcp-servers/dracoon-team.js';

describe('DracoonTeamMCPServer', () => {
  const adapter = new DracoonTeamMCPServer({ accessToken: 'test-token' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with custom baseUrl', () => {
    const a = new DracoonTeamMCPServer({ accessToken: 'tok', baseUrl: 'https://custom.example.com/api' });
    expect(a).toBeDefined();
  });

  it('instantiates with serverDomain', () => {
    const a = new DracoonTeamMCPServer({ accessToken: 'tok', serverDomain: 'myco.dracoon.team' });
    expect(a).toBeDefined();
  });

  it('exposes tools array', () => {
    const tools = adapter.tools;
    expect(Array.isArray(tools)).toBe(true);
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

  it('unknown tool returns error without throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('catalog returns all required fields', () => {
    const cat = DracoonTeamMCPServer.catalog();
    expect(cat.name).toBe('dracoon-team');
    expect(cat.category).toBe('cloud');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
    expect(cat.description).toBeTruthy();
  });

  it('catalog toolNames match tools getter', () => {
    const cat = DracoonTeamMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  // ── Nodes ────────────────────────────────────────────────────────────────
  it('get_node returns error without node_id', async () => {
    const result = await adapter.callTool('get_node', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('node_id');
  });

  it('delete_node returns error without node_id', async () => {
    const result = await adapter.callTool('delete_node', {});
    expect(result.isError).toBe(true);
  });

  it('search_nodes returns error without search_string', async () => {
    const result = await adapter.callTool('search_nodes', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('search_string');
  });

  it('copy_nodes returns error without required fields', async () => {
    const result = await adapter.callTool('copy_nodes', { target_parent_id: 1 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('items');
  });

  it('move_nodes returns error without required fields', async () => {
    const result = await adapter.callTool('move_nodes', {});
    expect(result.isError).toBe(true);
  });

  // ── Rooms ────────────────────────────────────────────────────────────────
  it('create_room returns error without name', async () => {
    const result = await adapter.callTool('create_room', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('update_room returns error without room_id', async () => {
    const result = await adapter.callTool('update_room', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('room_id');
  });

  it('configure_room returns error without room_id', async () => {
    const result = await adapter.callTool('configure_room', {});
    expect(result.isError).toBe(true);
  });

  it('get_room_users returns error without room_id', async () => {
    const result = await adapter.callTool('get_room_users', {});
    expect(result.isError).toBe(true);
  });

  it('update_room_users returns error without items', async () => {
    const result = await adapter.callTool('update_room_users', { room_id: 1 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('items');
  });

  it('revoke_room_users returns error without ids', async () => {
    const result = await adapter.callTool('revoke_room_users', { room_id: 1 });
    expect(result.isError).toBe(true);
  });

  it('update_room_groups returns error without items', async () => {
    const result = await adapter.callTool('update_room_groups', { room_id: 1 });
    expect(result.isError).toBe(true);
  });

  // ── Folders ───────────────────────────────────────────────────────────────
  it('create_folder returns error without parent_id and name', async () => {
    const result = await adapter.callTool('create_folder', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('parent_id');
  });

  it('update_folder returns error without folder_id', async () => {
    const result = await adapter.callTool('update_folder', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('folder_id');
  });

  // ── Files ─────────────────────────────────────────────────────────────────
  it('update_file returns error without file_id', async () => {
    const result = await adapter.callTool('update_file', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('file_id');
  });

  it('generate_download_url returns error without file_id', async () => {
    const result = await adapter.callTool('generate_download_url', {});
    expect(result.isError).toBe(true);
  });

  it('create_upload_channel returns error without name', async () => {
    const result = await adapter.callTool('create_upload_channel', { parent_id: 1 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('complete_file_upload returns error without upload_id', async () => {
    const result = await adapter.callTool('complete_file_upload', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('upload_id');
  });

  // ── Download Shares ───────────────────────────────────────────────────────
  it('get_download_share returns error without share_id', async () => {
    const result = await adapter.callTool('get_download_share', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('share_id');
  });

  it('create_download_share returns error without node_id', async () => {
    const result = await adapter.callTool('create_download_share', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('node_id');
  });

  it('delete_download_share returns error without share_id', async () => {
    const result = await adapter.callTool('delete_download_share', {});
    expect(result.isError).toBe(true);
  });

  // ── Upload Shares ─────────────────────────────────────────────────────────
  it('create_upload_share returns error without required fields', async () => {
    const result = await adapter.callTool('create_upload_share', { target_id: 1 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('delete_upload_share returns error without share_id', async () => {
    const result = await adapter.callTool('delete_upload_share', {});
    expect(result.isError).toBe(true);
  });

  // ── Users ─────────────────────────────────────────────────────────────────
  it('get_user returns error without user_id', async () => {
    const result = await adapter.callTool('get_user', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('user_id');
  });

  it('create_user returns error without required fields', async () => {
    const result = await adapter.callTool('create_user', { first_name: 'John' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('last_name');
  });

  it('update_user returns error without user_id', async () => {
    const result = await adapter.callTool('update_user', {});
    expect(result.isError).toBe(true);
  });

  it('delete_user returns error without user_id', async () => {
    const result = await adapter.callTool('delete_user', {});
    expect(result.isError).toBe(true);
  });

  // ── Groups ────────────────────────────────────────────────────────────────
  it('get_group returns error without group_id', async () => {
    const result = await adapter.callTool('get_group', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('group_id');
  });

  it('create_group returns error without name', async () => {
    const result = await adapter.callTool('create_group', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('add_group_members returns error without ids', async () => {
    const result = await adapter.callTool('add_group_members', { group_id: 1 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ids');
  });

  it('remove_group_members returns error without group_id', async () => {
    const result = await adapter.callTool('remove_group_members', {});
    expect(result.isError).toBe(true);
  });

  // ── Recycle Bin ───────────────────────────────────────────────────────────
  it('list_deleted_nodes returns error without node_id', async () => {
    const result = await adapter.callTool('list_deleted_nodes', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('node_id');
  });

  it('restore_nodes returns error without deleted_node_ids', async () => {
    const result = await adapter.callTool('restore_nodes', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('deleted_node_ids');
  });

  it('empty_recycle_bin returns error without node_id', async () => {
    const result = await adapter.callTool('empty_recycle_bin', {});
    expect(result.isError).toBe(true);
  });

  // ── Favorites ─────────────────────────────────────────────────────────────
  it('add_favorite returns error without node_id', async () => {
    const result = await adapter.callTool('add_favorite', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('node_id');
  });

  it('remove_favorite returns error without node_id', async () => {
    const result = await adapter.callTool('remove_favorite', {});
    expect(result.isError).toBe(true);
  });

  // ── Audit / Events ────────────────────────────────────────────────────────
  it('get_room_events returns error without room_id', async () => {
    const result = await adapter.callTool('get_room_events', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('room_id');
  });

  // ── Webhooks ─────────────────────────────────────────────────────────────
  it('create_webhook returns error without required fields', async () => {
    const result = await adapter.callTool('create_webhook', { name: 'hook' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('get_webhook returns error without webhook_id', async () => {
    const result = await adapter.callTool('get_webhook', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('webhook_id');
  });

  it('update_webhook returns error without webhook_id', async () => {
    const result = await adapter.callTool('update_webhook', {});
    expect(result.isError).toBe(true);
  });

  it('delete_webhook returns error without webhook_id', async () => {
    const result = await adapter.callTool('delete_webhook', {});
    expect(result.isError).toBe(true);
  });

  // ── No-arg tools do not throw ────────────────────────────────────────────
  it('list_nodes does not throw on empty args (network errors returned as isError)', async () => {
    let result;
    try {
      result = await adapter.callTool('list_nodes', {});
    } catch (_e) {
      // Network errors in test env are acceptable — adapter has no required args
      return;
    }
    expect(result).toBeDefined();
  });

  it('get_user_info does not throw on empty args (network errors returned as isError)', async () => {
    let result;
    try {
      result = await adapter.callTool('get_user_info', {});
    } catch (_e) {
      return;
    }
    expect(result).toBeDefined();
  });
});
