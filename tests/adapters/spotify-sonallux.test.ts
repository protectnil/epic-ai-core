import { describe, it, expect } from 'vitest';
import { SpotifySonalluxMCPServer } from '../../src/mcp-servers/spotify-sonallux.js';

describe('SpotifySonalluxMCPServer', () => {
  const adapter = new SpotifySonalluxMCPServer({ accessToken: 'test-access-token' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name, `tool.name missing for tool`).toBeTruthy();
      expect(tool.description, `tool.description missing for ${tool.name}`).toBeTruthy();
      expect(tool.inputSchema, `tool.inputSchema missing for ${tool.name}`).toBeDefined();
      expect(tool.inputSchema.type, `inputSchema.type for ${tool.name}`).toBe('object');
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('search requires q argument', async () => {
    const result = await adapter.callTool('search', { type: 'track' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('q is required');
  });

  it('search requires type argument', async () => {
    const result = await adapter.callTool('search', { q: 'Bohemian Rhapsody' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('type is required');
  });

  it('search tool has q and type in required array', () => {
    const tool = adapter.tools.find(t => t.name === 'search');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('q');
    expect(tool?.inputSchema.required).toContain('type');
  });

  it('get_track requires id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_track');
    expect(tool?.inputSchema.required).toContain('id');
  });

  it('get_several_tracks requires ids', () => {
    const tool = adapter.tools.find(t => t.name === 'get_several_tracks');
    expect(tool?.inputSchema.required).toContain('ids');
  });

  it('get_audio_features requires id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_audio_features');
    expect(tool?.inputSchema.required).toContain('id');
  });

  it('get_album requires id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_album');
    expect(tool?.inputSchema.required).toContain('id');
  });

  it('get_artist requires id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_artist');
    expect(tool?.inputSchema.required).toContain('id');
  });

  it('get_playlist requires playlist_id', () => {
    const tool = adapter.tools.find(t => t.name === 'get_playlist');
    expect(tool?.inputSchema.required).toContain('playlist_id');
  });

  it('create_playlist requires user_id and name', async () => {
    const missingUserId = await adapter.callTool('create_playlist', { name: 'My Playlist' });
    expect(missingUserId.isError).toBe(true);
    expect(missingUserId.content[0].text).toContain('user_id is required');

    const missingName = await adapter.callTool('create_playlist', { user_id: 'user123' });
    expect(missingName.isError).toBe(true);
    expect(missingName.content[0].text).toContain('name is required');
  });

  it('add_tracks_to_playlist requires playlist_id and uris', async () => {
    const missingPlaylist = await adapter.callTool('add_tracks_to_playlist', { uris: 'spotify:track:123' });
    expect(missingPlaylist.isError).toBe(true);

    const missingUris = await adapter.callTool('add_tracks_to_playlist', { playlist_id: 'playlist123' });
    expect(missingUris.isError).toBe(true);
  });

  it('seek_to_position requires position_ms', () => {
    const tool = adapter.tools.find(t => t.name === 'seek_to_position');
    expect(tool?.inputSchema.required).toContain('position_ms');
  });

  it('set_repeat_mode requires state', () => {
    const tool = adapter.tools.find(t => t.name === 'set_repeat_mode');
    expect(tool?.inputSchema.required).toContain('state');
  });

  it('set_volume requires volume_percent', () => {
    const tool = adapter.tools.find(t => t.name === 'set_volume');
    expect(tool?.inputSchema.required).toContain('volume_percent');
  });

  it('toggle_shuffle requires state', () => {
    const tool = adapter.tools.find(t => t.name === 'toggle_shuffle');
    expect(tool?.inputSchema.required).toContain('state');
  });

  it('add_to_queue requires uri', () => {
    const tool = adapter.tools.find(t => t.name === 'add_to_queue');
    expect(tool?.inputSchema.required).toContain('uri');
  });

  it('upload_playlist_cover requires playlist_id and image_data', async () => {
    const result = await adapter.callTool('upload_playlist_cover', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('playlist_id is required');

    const result2 = await adapter.callTool('upload_playlist_cover', { playlist_id: 'abc' });
    expect(result2.isError).toBe(true);
    expect(result2.content[0].text).toContain('image_data is required');
  });

  it('tools with no required fields have no required array', () => {
    const noReqTools = ['get_recommendation_genres', 'get_available_markets', 'get_current_user_profile', 'get_available_devices', 'get_user_queue'];
    for (const name of noReqTools) {
      const tool = adapter.tools.find(t => t.name === name);
      expect(tool, `tool ${name} not found`).toBeDefined();
      expect(tool?.inputSchema.required, `${name} should have no required`).toBeUndefined();
    }
  });

  it('catalog returns correct metadata', () => {
    const cat = SpotifySonalluxMCPServer.catalog();
    expect(cat.name).toBe('spotify-sonallux');
    expect(cat.category).toBe('music');
    expect(cat.author).toBe('protectnil');
    expect(cat.version).toBe('2023.2.27');
  });

  it('catalog toolNames are non-empty and match tool definitions', () => {
    const cat = SpotifySonalluxMCPServer.catalog();
    expect(cat.toolNames.length).toBeGreaterThan(0);
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames, `catalog toolName ${name} missing from tools getter`).toContain(name);
    }
  });

  it('catalog keywords include music-related terms', () => {
    const cat = SpotifySonalluxMCPServer.catalog();
    expect(cat.keywords).toContain('spotify');
    expect(cat.keywords).toContain('music');
    expect(cat.keywords).toContain('playlist');
  });

  it('accepts custom baseUrl', () => {
    const custom = new SpotifySonalluxMCPServer({ accessToken: 'tok', baseUrl: 'https://custom.example.com/v1' });
    expect(custom).toBeDefined();
  });

  it('tool names match catalog toolNames length', () => {
    const cat = SpotifySonalluxMCPServer.catalog();
    expect(adapter.tools.length).toBe(cat.toolNames.length);
  });
});
