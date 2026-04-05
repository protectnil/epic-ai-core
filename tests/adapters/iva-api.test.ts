import { describe, it, expect } from 'vitest';
import { IvaApiMCPServer } from '../../src/mcp-servers/iva-api.js';

describe('IvaApiMCPServer', () => {
  const adapter = new IvaApiMCPServer({ apiKey: 'test-api-key-123' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('exposes 20 tools', () => {
    expect(adapter.tools.length).toBe(20);
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
    const cat = IvaApiMCPServer.catalog();
    expect(cat.name).toBe('iva-api');
    expect(cat.category).toBe('media');
    expect(cat.version).toBe('1.0.0');
    expect(cat.author).toBe('protectnil');
    expect(Array.isArray(cat.keywords)).toBe(true);
    expect(cat.keywords.length).toBeGreaterThan(0);
    expect(Array.isArray(cat.toolNames)).toBe(true);
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('catalog toolNames match tools getter', () => {
    const cat = IvaApiMCPServer.catalog();
    const toolGetterNames = adapter.tools.map(t => t.name);
    for (const n of cat.toolNames) {
      expect(toolGetterNames).toContain(n);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('search_movies requires query', async () => {
    const result = await adapter.callTool('search_movies', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query');
  });

  it('get_movie requires movie_id', async () => {
    const result = await adapter.callTool('get_movie', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('movie_id');
  });

  it('get_movie_images requires movie_id', async () => {
    const result = await adapter.callTool('get_movie_images', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('movie_id');
  });

  it('get_movie_videos requires movie_id', async () => {
    const result = await adapter.callTool('get_movie_videos', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('movie_id');
  });

  it('get_movie_releases requires movie_id', async () => {
    const result = await adapter.callTool('get_movie_releases', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('movie_id');
  });

  it('get_movie_cast_crew requires movie_id', async () => {
    const result = await adapter.callTool('get_movie_cast_crew', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('movie_id');
  });

  it('get_movie_alternate_titles requires movie_id', async () => {
    const result = await adapter.callTool('get_movie_alternate_titles', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('movie_id');
  });

  it('search_tv_shows requires query', async () => {
    const result = await adapter.callTool('search_tv_shows', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query');
  });

  it('get_tv_show requires show_id', async () => {
    const result = await adapter.callTool('get_tv_show', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('show_id');
  });

  it('get_tv_season requires show_id and season_number', async () => {
    const result1 = await adapter.callTool('get_tv_season', {});
    expect(result1.isError).toBe(true);
    expect(result1.content[0].text).toContain('show_id');

    const result2 = await adapter.callTool('get_tv_season', { show_id: 123 });
    expect(result2.isError).toBe(true);
    expect(result2.content[0].text).toContain('season_number');
  });

  it('get_tv_episode requires show_id, season_number, and episode_number', async () => {
    const result1 = await adapter.callTool('get_tv_episode', {});
    expect(result1.isError).toBe(true);

    const result2 = await adapter.callTool('get_tv_episode', { show_id: 123 });
    expect(result2.isError).toBe(true);
    expect(result2.content[0].text).toContain('season_number');

    const result3 = await adapter.callTool('get_tv_episode', { show_id: 123, season_number: 1 });
    expect(result3.isError).toBe(true);
    expect(result3.content[0].text).toContain('episode_number');
  });

  it('search_people requires query', async () => {
    const result = await adapter.callTool('search_people', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query');
  });

  it('get_person requires person_id', async () => {
    const result = await adapter.callTool('get_person', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('person_id');
  });

  it('search_all requires query', async () => {
    const result = await adapter.callTool('search_all', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query');
  });

  it('get_companies requires query', async () => {
    const result = await adapter.callTool('get_companies', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query');
  });

  it('accepts custom baseUrl', () => {
    const custom = new IvaApiMCPServer({ apiKey: 'key', baseUrl: 'https://custom.example.com' });
    expect(custom).toBeDefined();
  });
});
