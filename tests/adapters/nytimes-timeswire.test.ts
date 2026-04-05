import { describe, it, expect } from 'vitest';
import { NytimesTimeswireMCPServer } from '../../src/mcp-servers/nytimes-timeswire.js';

describe('NytimesTimeswireMCPServer', () => {
  const adapter = new NytimesTimeswireMCPServer({ apiKey: 'test-key' });

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

  it('exposes get_newswire_by_section tool', () => {
    const tool = adapter.tools.find(t => t.name === 'get_newswire_by_section');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('source');
    expect(tool!.inputSchema.required).toContain('section');
  });

  it('exposes get_newswire_by_time_period tool', () => {
    const tool = adapter.tools.find(t => t.name === 'get_newswire_by_time_period');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('source');
    expect(tool!.inputSchema.required).toContain('section');
    expect(tool!.inputSchema.required).toContain('time_period');
  });

  it('exposes get_newswire_article tool', () => {
    const tool = adapter.tools.find(t => t.name === 'get_newswire_article');
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.required).toContain('url');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_newswire_by_section missing args returns error', async () => {
    const result = await adapter.callTool('get_newswire_by_section', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('get_newswire_by_time_period missing time_period returns error', async () => {
    const result = await adapter.callTool('get_newswire_by_time_period', { source: 'all', section: 'all' });
    expect(result.isError).toBe(true);
  });

  it('get_newswire_by_time_period out-of-range time_period returns error', async () => {
    const result = await adapter.callTool('get_newswire_by_time_period', { source: 'all', section: 'all', time_period: 25 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('1 and 24');
  });

  it('get_newswire_article missing url returns error', async () => {
    const result = await adapter.callTool('get_newswire_article', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('catalog returns correct metadata', () => {
    const catalog = NytimesTimeswireMCPServer.catalog();
    expect(catalog.name).toBe('nytimes-timeswire');
    expect(catalog.category).toBe('media');
    expect(catalog.toolNames).toContain('get_newswire_by_section');
    expect(catalog.toolNames).toContain('get_newswire_by_time_period');
    expect(catalog.toolNames).toContain('get_newswire_article');
    expect(catalog.keywords).toContain('nytimes');
  });
});
