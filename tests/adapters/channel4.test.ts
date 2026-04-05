import { describe, it, expect } from 'vitest';
import { Channel4MCPServer } from '../../src/mcp-servers/channel4.js';

describe('Channel4MCPServer', () => {
  const adapter = new Channel4MCPServer({ apiKey: 'test-api-key' });

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

  it('exposes all expected tool names', () => {
    const names = adapter.tools.map(t => t.name);
    expect(names).toContain('get_atoz');
    expect(names).toContain('search_programmes');
    expect(names).toContain('get_programme');
    expect(names).toContain('get_episode_guide');
    expect(names).toContain('get_programme_videos');
    expect(names).toContain('get_programme_epg');
    expect(names).toContain('get_programme_by_id');
    expect(names).toContain('get_categories');
    expect(names).toContain('get_category_programmes');
    expect(names).toContain('get_brands_on_demand');
    expect(names).toContain('get_popular_brands');
    expect(names).toContain('get_tv_listings');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('search_programmes missing q returns error', async () => {
    const result = await adapter.callTool('search_programmes', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('q');
  });

  it('get_programme missing brand_web_safe_title returns error', async () => {
    const result = await adapter.callTool('get_programme', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('brand_web_safe_title');
  });

  it('get_episode_guide missing brand_web_safe_title returns error', async () => {
    const result = await adapter.callTool('get_episode_guide', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('brand_web_safe_title');
  });

  it('get_programme_videos missing brand_web_safe_title returns error', async () => {
    const result = await adapter.callTool('get_programme_videos', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('brand_web_safe_title');
  });

  it('get_programme_epg missing brand_web_safe_title returns error', async () => {
    const result = await adapter.callTool('get_programme_epg', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('brand_web_safe_title');
  });

  it('get_programme_by_id missing programme_id returns error', async () => {
    const result = await adapter.callTool('get_programme_by_id', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('programme_id');
  });

  it('get_category_programmes missing category returns error', async () => {
    const result = await adapter.callTool('get_category_programmes', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('category');
  });

  it('get_tv_listings missing date fields returns error', async () => {
    const result = await adapter.callTool('get_tv_listings', {});
    expect(result.isError).toBe(true);
  });

  it('catalog() returns correct metadata', () => {
    const cat = Channel4MCPServer.catalog();
    expect(cat.name).toBe('channel4');
    expect(cat.category).toBe('media');
    expect(cat.author).toBe('protectnil');
    expect(cat.toolNames.length).toBe(12);
  });

  it('accepts custom baseUrl', () => {
    const custom = new Channel4MCPServer({ apiKey: 'key', baseUrl: 'https://custom.example.com' });
    expect(custom).toBeDefined();
    expect(custom.tools.length).toBeGreaterThan(0);
  });
});
