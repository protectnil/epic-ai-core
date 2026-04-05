import { describe, it, expect } from 'vitest';
import { CirclLuHashlookupMCPServer } from '../../src/mcp-servers/circl-lu-hashlookup.js';

describe('CirclLuHashlookupMCPServer', () => {
  const adapter = new CirclLuHashlookupMCPServer();

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
    expect(names).toContain('get_info');
    expect(names).toContain('lookup_md5');
    expect(names).toContain('lookup_sha1');
    expect(names).toContain('lookup_sha256');
    expect(names).toContain('bulk_lookup_md5');
    expect(names).toContain('bulk_lookup_sha1');
    expect(names).toContain('get_children');
    expect(names).toContain('get_parents');
    expect(names).toContain('get_top_stats');
    expect(names).toContain('create_session');
    expect(names).toContain('get_session');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('lookup_md5 missing argument returns error', async () => {
    const result = await adapter.callTool('lookup_md5', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('md5');
  });

  it('lookup_sha1 missing argument returns error', async () => {
    const result = await adapter.callTool('lookup_sha1', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sha1');
  });

  it('lookup_sha256 missing argument returns error', async () => {
    const result = await adapter.callTool('lookup_sha256', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sha256');
  });

  it('bulk_lookup_md5 empty hashes returns error', async () => {
    const result = await adapter.callTool('bulk_lookup_md5', { hashes: [] });
    expect(result.isError).toBe(true);
  });

  it('bulk_lookup_sha1 missing hashes returns error', async () => {
    const result = await adapter.callTool('bulk_lookup_sha1', {});
    expect(result.isError).toBe(true);
  });

  it('get_children missing sha1 returns error', async () => {
    const result = await adapter.callTool('get_children', { count: 100, cursor: '0' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sha1');
  });

  it('get_parents missing sha1 returns error', async () => {
    const result = await adapter.callTool('get_parents', { count: 100, cursor: '0' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sha1');
  });

  it('create_session missing name returns error', async () => {
    const result = await adapter.callTool('create_session', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('get_session missing name returns error', async () => {
    const result = await adapter.callTool('get_session', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('catalog() returns correct metadata', () => {
    const cat = CirclLuHashlookupMCPServer.catalog();
    expect(cat.name).toBe('circl-lu-hashlookup');
    expect(cat.category).toBe('cybersecurity');
    expect(cat.author).toBe('protectnil');
    expect(cat.toolNames.length).toBe(11);
  });

  it('accepts custom baseUrl', () => {
    const custom = new CirclLuHashlookupMCPServer({ baseUrl: 'https://custom.example.com' });
    expect(custom).toBeDefined();
    expect(custom.tools.length).toBeGreaterThan(0);
  });
});
