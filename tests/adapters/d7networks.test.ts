import { describe, it, expect } from 'vitest';
import { D7NetworksMCPServer } from '../../src/mcp-servers/d7networks.js';

describe('D7NetworksMCPServer', () => {
  const adapter = new D7NetworksMCPServer({ username: 'test-user', password: 'test-pass' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('accepts custom baseUrl', () => {
    const custom = new D7NetworksMCPServer({
      username: 'u',
      password: 'p',
      baseUrl: 'https://custom.d7networks.com',
    });
    expect(custom).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('exposes exactly 3 tools', () => {
    expect(adapter.tools.length).toBe(3);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('tool names match expected set', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('get_balance');
    expect(names).toContain('send_sms');
    expect(names).toContain('send_bulk_sms');
  });

  it('send_sms requires to, from, content', () => {
    const tool = adapter.tools.find((t) => t.name === 'send_sms');
    expect(tool?.inputSchema.required).toContain('to');
    expect(tool?.inputSchema.required).toContain('from');
    expect(tool?.inputSchema.required).toContain('content');
  });

  it('send_bulk_sms requires messages', () => {
    const tool = adapter.tools.find((t) => t.name === 'send_bulk_sms');
    expect(tool?.inputSchema.required).toContain('messages');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('send_sms missing args returns error', async () => {
    const result = await adapter.callTool('send_sms', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('send_bulk_sms empty messages returns error', async () => {
    const result = await adapter.callTool('send_bulk_sms', { messages: [] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('send_bulk_sms missing messages returns error', async () => {
    const result = await adapter.callTool('send_bulk_sms', {});
    expect(result.isError).toBe(true);
  });

  it('catalog() returns correct metadata', () => {
    const catalog = D7NetworksMCPServer.catalog();
    expect(catalog.name).toBe('d7networks');
    expect(catalog.category).toBe('communication');
    expect(catalog.author).toBe('protectnil');
    expect(catalog.toolNames).toHaveLength(3);
    expect(catalog.keywords).toContain('sms');
  });
});
