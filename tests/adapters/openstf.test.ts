import { describe, it, expect } from 'vitest';
import { OpenSTFMCPServer } from '../../src/mcp-servers/openstf.js';

describe('OpenSTFMCPServer', () => {
  const adapter = new OpenSTFMCPServer({ accessToken: 'test-token' });

  it('instantiates', () => {
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
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const catalog = OpenSTFMCPServer.catalog();
    expect(catalog.name).toBe('openstf');
    expect(catalog.category).toBe('engineering');
    expect(catalog.toolNames.length).toBeGreaterThan(0);
  });

  it('tool names are unique', () => {
    const names = adapter.tools.map(t => t.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('add_user_device requires serial', async () => {
    const result = await adapter.callTool('add_user_device', {});
    expect(result.isError).toBe(true);
  });

  it('get_device requires serial', async () => {
    const result = await adapter.callTool('get_device', {});
    expect(result.isError).toBe(true);
  });

  it('remote_connect_device requires serial', async () => {
    const result = await adapter.callTool('remote_connect_device', {});
    expect(result.isError).toBe(true);
  });

  it('delete_user_device requires serial', async () => {
    const result = await adapter.callTool('delete_user_device', {});
    expect(result.isError).toBe(true);
  });
});
