import { describe, it, expect } from 'vitest';
import { BlazeMeterMCPServer } from '../../src/mcp-servers/blazemeter.js';

describe('BlazeMeterMCPServer', () => {
  const adapter = new BlazeMeterMCPServer({ apiKey: 'test-api-key' });

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

  it('includes expected tool names', () => {
    const names = adapter.tools.map((t) => t.name);
    expect(names).toContain('list_tests');
    expect(names).toContain('list_masters');
    expect(names).toContain('list_collections');
    expect(names).toContain('list_projects');
    expect(names).toContain('list_locations');
    expect(names).toContain('list_active_sessions');
    expect(names).toContain('terminate_active_sessions');
    expect(names).toContain('list_invites');
    expect(names).toContain('get_top');
    expect(names).toContain('register_user');
    expect(names).toContain('update_password');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('register_user requires all fields', async () => {
    const result = await adapter.callTool('register_user', { email: 'test@example.com' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('required');
  });

  it('register_user fails without email', async () => {
    const result = await adapter.callTool('register_user', {
      firstName: 'Jane',
      lastName: 'Doe',
      password: 'secret123',
    });
    expect(result.isError).toBe(true);
  });

  it('catalog returns correct metadata', () => {
    const cat = BlazeMeterMCPServer.catalog();
    expect(cat.name).toBe('blazemeter');
    expect(cat.category).toBe('devops');
    expect(cat.author).toBe('protectnil');
    expect(cat.toolNames.length).toBeGreaterThan(0);
  });
});
