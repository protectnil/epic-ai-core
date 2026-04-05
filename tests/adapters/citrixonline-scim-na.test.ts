import { describe, it, expect } from 'vitest';
import { CitrixonlineScimNaMCPServer } from '../../src/mcp-servers/citrixonline-scim-na.js';

describe('CitrixonlineScimNaMCPServer', () => {
  const adapter = new CitrixonlineScimNaMCPServer({ accessToken: 'test-token' });

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

  it('exposes all 17 SCIM tools', () => {
    const tools = adapter.tools;
    const names = tools.map(t => t.name);
    const expected = [
      'get_users', 'create_user', 'get_user', 'update_user', 'replace_user', 'delete_user',
      'get_me', 'update_me', 'replace_me',
      'get_groups', 'create_group', 'get_group', 'update_group', 'replace_group', 'delete_group',
      'get_user_schema', 'get_service_provider_configs',
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
    expect(tools.length).toBe(17);
  });

  it('user tools have correct required fields', () => {
    const createUser = adapter.tools.find(t => t.name === 'create_user');
    expect(createUser?.inputSchema.required).toContain('userName');

    const getUser = adapter.tools.find(t => t.name === 'get_user');
    expect(getUser?.inputSchema.required).toContain('userKey');

    const deleteUser = adapter.tools.find(t => t.name === 'delete_user');
    expect(deleteUser?.inputSchema.required).toContain('userKey');
  });

  it('group tools have correct required fields', () => {
    const createGroup = adapter.tools.find(t => t.name === 'create_group');
    expect(createGroup?.inputSchema.required).toContain('displayName');

    const getGroup = adapter.tools.find(t => t.name === 'get_group');
    expect(getGroup?.inputSchema.required).toContain('groupKey');

    const replaceGroup = adapter.tools.find(t => t.name === 'replace_group');
    expect(replaceGroup?.inputSchema.required).toContain('groupKey');
    expect(replaceGroup?.inputSchema.required).toContain('displayName');
  });

  it('respects custom baseUrl', () => {
    const custom = new CitrixonlineScimNaMCPServer({
      accessToken: 'tok',
      baseUrl: 'https://custom.example.com/scim/v1',
    });
    expect(custom).toBeDefined();
    expect(custom.tools.length).toBe(17);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
