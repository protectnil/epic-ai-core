import { describe, it, expect } from 'vitest';
import { OnePasswordEventsMCPServer } from '../../src/mcp-servers/1password-events.js';

describe('OnePasswordEventsMCPServer', () => {
  const adapter = new OnePasswordEventsMCPServer({ jwtToken: 'test-jwt-token' });

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
    expect(adapter.tools.length).toBe(3);
  });

  it('tool names match expected set', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('introspect_token');
    expect(names).toContain('get_item_usages');
    expect(names).toContain('get_sign_in_attempts');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const cat = OnePasswordEventsMCPServer.catalog();
    expect(cat.name).toBe('1password-events');
    expect(cat.category).toBe('identity');
    expect(cat.toolNames).toHaveLength(3);
  });
});
