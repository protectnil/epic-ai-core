import { describe, it, expect } from 'vitest';
import { CleverCloudMCPServer } from '../../src/mcp-servers/clever-cloud.js';

describe('CleverCloudMCPServer', () => {
  const adapter = new CleverCloudMCPServer({ authorizationHeader: 'OAuth oauth_token=test' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools', () => {
    expect(adapter.tools.length).toBeGreaterThan(0);
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
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns required fields', () => {
    const cat = CleverCloudMCPServer.catalog();
    expect(cat.name).toBe('clever-cloud');
    expect(cat.category).toBe('cloud');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = CleverCloudMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  // Self — no args required
  it('get_self does not error on empty args', async () => {
    // Will fail at network, not at validation — should NOT return validation isError
    const result = await adapter.callTool('get_self', {}).catch(() => null);
    // If it fails, it should be network error not validation
    if (result) {
      // network error is acceptable but should not be "Unknown tool"
      expect(result.content[0].text).not.toContain('Unknown tool');
    }
  });

  // Self — Application tools
  it('get_self_application returns error without appId', async () => {
    const result = await adapter.callTool('get_self_application', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('appId');
  });

  it('update_self_application returns error without appId', async () => {
    const result = await adapter.callTool('update_self_application', {});
    expect(result.isError).toBe(true);
  });

  it('delete_self_application returns error without appId', async () => {
    const result = await adapter.callTool('delete_self_application', {});
    expect(result.isError).toBe(true);
  });

  it('get_self_application_env returns error without appId', async () => {
    const result = await adapter.callTool('get_self_application_env', {});
    expect(result.isError).toBe(true);
  });

  it('delete_self_application_env_var returns error without appId', async () => {
    const result = await adapter.callTool('delete_self_application_env_var', {});
    expect(result.isError).toBe(true);
  });

  it('delete_self_application_env_var returns error without envName', async () => {
    const result = await adapter.callTool('delete_self_application_env_var', { appId: 'app_abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('envName');
  });

  it('get_self_application_instances returns error without appId', async () => {
    const result = await adapter.callTool('get_self_application_instances', {});
    expect(result.isError).toBe(true);
  });

  it('add_self_application_vhost returns error without appId', async () => {
    const result = await adapter.callTool('add_self_application_vhost', {});
    expect(result.isError).toBe(true);
  });

  it('add_self_application_vhost returns error without domain', async () => {
    const result = await adapter.callTool('add_self_application_vhost', { appId: 'app_abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('domain');
  });

  it('link_self_application_addon returns error without addonId', async () => {
    const result = await adapter.callTool('link_self_application_addon', { appId: 'app_abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('addonId');
  });

  // Self — Add-on tools
  it('get_self_addon returns error without addonId', async () => {
    const result = await adapter.callTool('get_self_addon', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('addonId');
  });

  it('delete_self_addon returns error without addonId', async () => {
    const result = await adapter.callTool('delete_self_addon', {});
    expect(result.isError).toBe(true);
  });

  // Self — Consumer tools
  it('get_self_consumer returns error without key', async () => {
    const result = await adapter.callTool('get_self_consumer', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('key');
  });

  it('delete_self_consumer returns error without key', async () => {
    const result = await adapter.callTool('delete_self_consumer', {});
    expect(result.isError).toBe(true);
  });

  // Self — Email/Key/Token tools
  it('add_self_email returns error without email', async () => {
    const result = await adapter.callTool('add_self_email', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('email');
  });

  it('delete_self_key returns error without key', async () => {
    const result = await adapter.callTool('delete_self_key', {});
    expect(result.isError).toBe(true);
  });

  it('revoke_self_token returns error without token', async () => {
    const result = await adapter.callTool('revoke_self_token', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('token');
  });

  // Organisations
  it('get_organisation returns error without id', async () => {
    const result = await adapter.callTool('get_organisation', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_organisation returns error without id', async () => {
    const result = await adapter.callTool('delete_organisation', {});
    expect(result.isError).toBe(true);
  });

  it('get_org_application returns error without id', async () => {
    const result = await adapter.callTool('get_org_application', {});
    expect(result.isError).toBe(true);
  });

  it('get_org_application returns error without appId', async () => {
    const result = await adapter.callTool('get_org_application', { id: 'org_abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('appId');
  });

  it('get_org_addon returns error without addonId', async () => {
    const result = await adapter.callTool('get_org_addon', { id: 'org_abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('addonId');
  });

  it('delete_org_member returns error without userId', async () => {
    const result = await adapter.callTool('delete_org_member', { id: 'org_abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('userId');
  });

  it('get_org_consumer returns error without key', async () => {
    const result = await adapter.callTool('get_org_consumer', { id: 'org_abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('key');
  });

  // Logs
  it('get_app_logs returns error without appId', async () => {
    const result = await adapter.callTool('get_app_logs', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('appId');
  });

  it('get_app_log_drains returns error without appId', async () => {
    const result = await adapter.callTool('get_app_log_drains', {});
    expect(result.isError).toBe(true);
  });

  it('delete_app_log_drain returns error without idOrUrl', async () => {
    const result = await adapter.callTool('delete_app_log_drain', { appId: 'app_abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('idOrUrl');
  });

  // Notifications
  it('list_email_hooks returns error without ownerId', async () => {
    const result = await adapter.callTool('list_email_hooks', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ownerId');
  });

  it('delete_email_hook returns error without id', async () => {
    const result = await adapter.callTool('delete_email_hook', { ownerId: 'user_abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('list_webhook_hooks returns error without ownerId', async () => {
    const result = await adapter.callTool('list_webhook_hooks', {});
    expect(result.isError).toBe(true);
  });

  // Products
  it('get_addon_provider returns error without providerId', async () => {
    const result = await adapter.callTool('get_addon_provider', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('providerId');
  });

  // Users
  it('get_user returns error without id', async () => {
    const result = await adapter.callTool('get_user', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  // Network Groups
  it('list_network_groups returns error without ownerId', async () => {
    const result = await adapter.callTool('list_network_groups', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ownerId');
  });

  it('get_network_group returns error without networkGroupId', async () => {
    const result = await adapter.callTool('get_network_group', { ownerId: 'org_abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('networkGroupId');
  });

  it('add_network_group_member returns error without memberId', async () => {
    const result = await adapter.callTool('add_network_group_member', { ownerId: 'org_abc', networkGroupId: 'ng_abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('memberId');
  });

  it('delete_network_group_member returns error without memberId', async () => {
    const result = await adapter.callTool('delete_network_group_member', { ownerId: 'org_abc', networkGroupId: 'ng_abc' });
    expect(result.isError).toBe(true);
  });
});
