import { describe, it, expect } from 'vitest';
import { MusixmatchMCPServer } from '../../src/mcp-servers/musixmatch.js';

describe('MusixmatchMCPServer', () => {
  const adapter = new MusixmatchMCPServer({ apiKey: 'test-key' });

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

  it('exposes all 16 tools', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('search_tracks');
    expect(names).toContain('get_track');
    expect(names).toContain('get_track_lyrics');
    expect(names).toContain('get_track_snippet');
    expect(names).toContain('get_track_subtitle');
    expect(names).toContain('match_track');
    expect(names).toContain('match_lyrics');
    expect(names).toContain('match_subtitle');
    expect(names).toContain('search_artists');
    expect(names).toContain('get_artist');
    expect(names).toContain('get_artist_albums');
    expect(names).toContain('get_artist_related');
    expect(names).toContain('get_album');
    expect(names).toContain('get_album_tracks');
    expect(names).toContain('get_chart_tracks');
    expect(names).toContain('get_chart_artists');
    expect(adapter.tools.length).toBe(16);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_track with no args returns error', async () => {
    const result = await adapter.callTool('get_track', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('track_id');
  });

  it('get_track_lyrics with no args returns error', async () => {
    const result = await adapter.callTool('get_track_lyrics', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('track_id');
  });

  it('get_artist with no args returns error', async () => {
    const result = await adapter.callTool('get_artist', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('artist_id');
  });

  it('get_artist_albums with no args returns error', async () => {
    const result = await adapter.callTool('get_artist_albums', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('artist_id');
  });

  it('get_album with no args returns error', async () => {
    const result = await adapter.callTool('get_album', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('album_id');
  });

  it('match_track with no args returns error', async () => {
    const result = await adapter.callTool('match_track', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('q_artist');
  });

  it('match_lyrics with no args returns error', async () => {
    const result = await adapter.callTool('match_lyrics', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('q_track');
  });

  it('catalog() returns correct metadata', () => {
    const cat = MusixmatchMCPServer.catalog();
    expect(cat.name).toBe('musixmatch');
    expect(cat.category).toBe('music');
    expect(cat.toolNames.length).toBe(16);
    expect(cat.keywords).toContain('lyrics');
  });

  it('accepts baseUrl override', () => {
    const custom = new MusixmatchMCPServer({ apiKey: 'k', baseUrl: 'https://custom.example.com/api' });
    expect(custom).toBeDefined();
  });
});
