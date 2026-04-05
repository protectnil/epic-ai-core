import { describe, it, expect } from 'vitest';
import { WowzaMCPServer } from '../../src/mcp-servers/wowza.js';

describe('WowzaMCPServer', () => {
  const adapter = new WowzaMCPServer({ apiKey: 'test-api-key-64chars', accessKey: 'test-access-key-64chars' });

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

  it('catalog returns expected shape', () => {
    const cat = WowzaMCPServer.catalog();
    expect(cat.name).toBe('wowza');
    expect(cat.category).toBe('media');
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_live_stream returns error when id missing', async () => {
    const result = await adapter.callTool('get_live_stream', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('create_live_stream returns error when name missing', async () => {
    const result = await adapter.callTool('create_live_stream', { encoder: 'other_rtmp', broadcast_location: 'us_west_california' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('create_live_stream returns error when encoder missing', async () => {
    const result = await adapter.callTool('create_live_stream', { name: 'Test Stream', broadcast_location: 'us_west_california' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('encoder');
  });
});
