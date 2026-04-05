import { describe, it, expect } from 'vitest';
import { KeycloakMCPServer } from '../../src/mcp-servers/keycloak.js';

describe('KeycloakMCPServer', () => {
  const adapter = new KeycloakMCPServer({ accessToken: 'test-token' });

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
    const names = adapter.tools.map((t) => t.name);
    for (const expected of [
      'get_realm', 'update_realm',
      'list_users', 'get_user', 'create_user', 'update_user', 'delete_user',
      'reset_user_password', 'send_verify_email', 'logout_user', 'get_user_sessions',
      'list_groups', 'create_group', 'get_group_members', 'add_user_to_group', 'remove_user_from_group',
      'list_realm_roles', 'create_realm_role', 'get_user_role_mappings',
      'add_realm_roles_to_user', 'remove_realm_roles_from_user',
      'list_clients', 'get_client', 'create_client', 'get_client_secret', 'regenerate_client_secret',
      'delete_session', 'get_brute_force_status', 'clear_brute_force_for_user', 'get_events',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('get_realm returns error when realm missing', async () => {
    const result = await adapter.callTool('get_realm', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/realm/i);
  });

  it('list_users returns error when realm missing', async () => {
    const result = await adapter.callTool('list_users', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/realm/i);
  });

  it('create_user returns error when username missing', async () => {
    const result = await adapter.callTool('create_user', { realm: 'master' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/username/i);
  });

  it('reset_user_password returns error when password missing', async () => {
    const result = await adapter.callTool('reset_user_password', { realm: 'master', userId: 'u1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/password/i);
  });

  it('add_realm_roles_to_user returns error when roles missing', async () => {
    const result = await adapter.callTool('add_realm_roles_to_user', { realm: 'master', userId: 'u1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/roles/i);
  });

  it('create_client returns error when clientId missing', async () => {
    const result = await adapter.callTool('create_client', { realm: 'master' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/clientId/i);
  });

  it('delete_session returns error when sessionId missing', async () => {
    const result = await adapter.callTool('delete_session', { realm: 'master' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/sessionId/i);
  });

  it('catalog() returns expected metadata', () => {
    const cat = KeycloakMCPServer.catalog();
    expect(cat.name).toBe('keycloak');
    expect(cat.category).toBe('identity');
    expect(cat.author).toBe('protectnil');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.keywords).toContain('keycloak');
    expect(cat.keywords).toContain('oauth2');
  });
});
