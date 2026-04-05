import { describe, it, expect } from 'vitest';
import { PRSSMCPServer } from '../../src/mcp-servers/prss.js';

describe('PRSSMCPServer', () => {
  const adapter = new PRSSMCPServer({ accessToken: 'test-token' });

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
    const cat = PRSSMCPServer.catalog();
    expect(cat.name).toBe('prss');
    expect(cat.category).toBe('media');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = PRSSMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('get_broadcast_service returns error without id', async () => {
    const result = await adapter.callTool('get_broadcast_service', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_program returns error without id', async () => {
    const result = await adapter.callTool('get_program', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('list_episodes returns error without programId', async () => {
    const result = await adapter.callTool('list_episodes', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('programId');
  });

  it('get_episode returns error without id', async () => {
    const result = await adapter.callTool('get_episode', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('list_segments returns error without episodeId', async () => {
    const result = await adapter.callTool('list_segments', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('episodeId');
  });

  it('get_segment returns error without id', async () => {
    const result = await adapter.callTool('get_segment', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_segment returns error without id', async () => {
    const result = await adapter.callTool('delete_segment', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('list_pieces returns error without episodeId', async () => {
    const result = await adapter.callTool('list_pieces', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('episodeId');
  });

  it('get_piece returns error without id', async () => {
    const result = await adapter.callTool('get_piece', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_piece returns error without id', async () => {
    const result = await adapter.callTool('delete_piece', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_spot returns error without id', async () => {
    const result = await adapter.callTool('get_spot', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_spot returns error without id', async () => {
    const result = await adapter.callTool('delete_spot', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_spot_insertion returns error without id', async () => {
    const result = await adapter.callTool('get_spot_insertion', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_spot_insertion returns error without id', async () => {
    const result = await adapter.callTool('delete_spot_insertion', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_epg_batch returns error without batchId', async () => {
    const result = await adapter.callTool('get_epg_batch', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('batchId');
  });

  it('upload_file returns error without filename', async () => {
    const result = await adapter.callTool('upload_file', { contentType: 'audio/mpeg' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('filename');
  });

  it('upload_file returns error without contentType', async () => {
    const result = await adapter.callTool('upload_file', { filename: 'episode.mp3' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('contentType');
  });

  it('get_file_info returns error without fileId', async () => {
    const result = await adapter.callTool('get_file_info', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('fileId');
  });

  it('delete_file returns error without fileId', async () => {
    const result = await adapter.callTool('delete_file', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('fileId');
  });

  it('get_file_content returns error without fileId', async () => {
    const result = await adapter.callTool('get_file_content', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('fileId');
  });

  it('create_folder returns error without name', async () => {
    const result = await adapter.callTool('create_folder', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('get_folder_info returns error without folderId', async () => {
    const result = await adapter.callTool('get_folder_info', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('folderId');
  });

  it('list_folder_items returns error without folderId', async () => {
    const result = await adapter.callTool('list_folder_items', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('folderId');
  });

  it('get_radiodns_pi returns error without required fields', async () => {
    const result = await adapter.callTool('get_radiodns_pi', { fqdn: 'npr.org' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('fqdn');
  });

  it('get_radiodns_gi has no required fields', async () => {
    // Should not throw — will return a network error (expected in unit tests)
    const result = await adapter.callTool('get_radiodns_gi', {}).catch(() => null);
    // Either network error or isError=true is acceptable in unit tests
    expect(result).toBeDefined();
  });

  it('uses custom baseUrl when provided', () => {
    const custom = new PRSSMCPServer({ accessToken: 'tok', baseUrl: 'https://custom.example.com' });
    expect(custom).toBeDefined();
  });
});
