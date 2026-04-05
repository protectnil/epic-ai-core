import { describe, it, expect } from 'vitest';
import { NprAuthorizationMCPServer } from '../../src/mcp-servers/npr-authorization.js';

describe('NprAuthorizationMCPServer', () => {
  const adapter = new NprAuthorizationMCPServer();

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools with required fields', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('catalog returns correct metadata', () => {
    const cat = NprAuthorizationMCPServer.catalog();
    expect(cat.name).toBe('npr-authorization');
    expect(cat.category).toBe('media');
    expect(cat.toolNames).toContain('generate_device_code');
    expect(cat.toolNames).toContain('create_token');
    expect(cat.toolNames).toContain('revoke_token');
  });

  it('unknown tool returns error without throwing', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
