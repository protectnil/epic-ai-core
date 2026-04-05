import { describe, it, expect } from 'vitest';
import { NytimesTopStoriesMCPServer } from '../../src/mcp-servers/nytimes-top-stories.js';

describe('NytimesTopStoriesMCPServer', () => {
  const adapter = new NytimesTopStoriesMCPServer({ apiKey: 'test-key' });

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

  it('exposes get_top_stories tool', () => {
    const tool = adapter.tools.find(t => t.name === 'get_top_stories');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('section');
  });

  it('get_top_stories section enum includes expected sections', () => {
    const tool = adapter.tools.find(t => t.name === 'get_top_stories');
    const sectionEnum = (tool!.inputSchema.properties as Record<string, { enum?: string[] }>)['section']?.enum;
    expect(sectionEnum).toBeDefined();
    expect(sectionEnum).toContain('home');
    expect(sectionEnum).toContain('world');
    expect(sectionEnum).toContain('politics');
    expect(sectionEnum).toContain('technology');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_top_stories missing section returns error', async () => {
    const result = await adapter.callTool('get_top_stories', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('section');
  });

  it('catalog returns correct metadata', () => {
    const catalog = NytimesTopStoriesMCPServer.catalog();
    expect(catalog.name).toBe('nytimes-top-stories');
    expect(catalog.category).toBe('media');
    expect(catalog.toolNames).toContain('get_top_stories');
    expect(catalog.keywords).toContain('nytimes');
  });
});
