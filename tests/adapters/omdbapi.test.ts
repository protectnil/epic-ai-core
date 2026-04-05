import { describe, it, expect } from 'vitest';
import { OmdbApiMCPServer } from '../../src/mcp-servers/omdbapi.js';

describe('OmdbApiMCPServer', () => {
  const adapter = new OmdbApiMCPServer({ apiKey: 'test-key' });

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

  it('exposes exactly 3 tools', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('get_movie_by_title');
    expect(names).toContain('get_movie_by_id');
    expect(names).toContain('search_movies');
    expect(adapter.tools.length).toBe(3);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_movie_by_title requires title', async () => {
    const result = await adapter.callTool('get_movie_by_title', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('title is required');
  });

  it('get_movie_by_id requires imdb_id', async () => {
    const result = await adapter.callTool('get_movie_by_id', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('imdb_id is required');
  });

  it('search_movies requires query', async () => {
    const result = await adapter.callTool('search_movies', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query is required');
  });

  it('catalog returns correct metadata', () => {
    const cat = OmdbApiMCPServer.catalog();
    expect(cat.name).toBe('omdbapi');
    expect(cat.category).toBe('media');
    expect(cat.toolNames).toEqual(['get_movie_by_title', 'get_movie_by_id', 'search_movies']);
    expect(cat.author).toBe('protectnil');
  });
});
