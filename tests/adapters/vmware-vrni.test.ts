import { describe, it, expect } from 'vitest';
import { VmwareVrniMCPServer } from '../../src/mcp-servers/vmware-vrni.js';

describe('VmwareVrniMCPServer', () => {
  const adapter = new VmwareVrniMCPServer({
    baseUrl: 'https://vrni.example.com/api/ni',
    token: 'test-token',
  });

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

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });

  it('catalog returns required fields', () => {
    const cat = VmwareVrniMCPServer.catalog();
    expect(cat.name).toBe('vmware-vrni');
    expect(cat.category).toBe('cloud');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
    expect(cat.displayName).toBeTruthy();
    expect(cat.description).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = VmwareVrniMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  it('create_auth_token returns error without username', async () => {
    const result = await adapter.callTool('create_auth_token', { password: 'pass' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('username');
  });

  it('create_auth_token returns error without password', async () => {
    const result = await adapter.callTool('create_auth_token', { username: 'user' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('password');
  });

  it('search_entities returns error without query', async () => {
    const result = await adapter.callTool('search_entities', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query');
  });

  it('get_entity_names returns error without entity_ids', async () => {
    const result = await adapter.callTool('get_entity_names', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entity_ids');
  });

  it('get_entity_names returns error with empty entity_ids', async () => {
    const result = await adapter.callTool('get_entity_names', { entity_ids: [] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entity_ids');
  });

  it('get_entity_name returns error without id', async () => {
    const result = await adapter.callTool('get_entity_name', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_data_source_vcenter returns error without id', async () => {
    const result = await adapter.callTool('get_data_source_vcenter', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_data_source_vcenter returns error without id', async () => {
    const result = await adapter.callTool('delete_data_source_vcenter', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_vm returns error without id', async () => {
    const result = await adapter.callTool('get_vm', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_host returns error without id', async () => {
    const result = await adapter.callTool('get_host', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_cluster returns error without id', async () => {
    const result = await adapter.callTool('get_cluster', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_firewall returns error without id', async () => {
    const result = await adapter.callTool('get_firewall', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('get_security_group returns error without id', async () => {
    const result = await adapter.callTool('get_security_group', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('add_application returns error without name', async () => {
    const result = await adapter.callTool('add_application', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('get_application returns error without id', async () => {
    const result = await adapter.callTool('get_application', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('delete_application returns error without id', async () => {
    const result = await adapter.callTool('delete_application', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('list_application_tiers returns error without id', async () => {
    const result = await adapter.callTool('list_application_tiers', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('add_application_tier returns error without id', async () => {
    const result = await adapter.callTool('add_application_tier', { name: 'web' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('id');
  });

  it('add_application_tier returns error without name', async () => {
    const result = await adapter.callTool('add_application_tier', { id: 'app-123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('get_application_tier returns error without tier_id', async () => {
    const result = await adapter.callTool('get_application_tier', { id: 'app-123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('tier_id');
  });

  it('delete_application_tier returns error without tier_id', async () => {
    const result = await adapter.callTool('delete_application_tier', { id: 'app-123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('tier_id');
  });

  it('get_tier returns error without tier_id', async () => {
    const result = await adapter.callTool('get_tier', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('tier_id');
  });

  it('get_recommended_rules returns error without application_id', async () => {
    const result = await adapter.callTool('get_recommended_rules', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('application_id');
  });

  it('export_nsx_recommended_rules returns error without application_id', async () => {
    const result = await adapter.callTool('export_nsx_recommended_rules', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('application_id');
  });

  it('has over 100 tools covering full API surface', () => {
    expect(adapter.tools.length).toBeGreaterThan(100);
  });

  it('all data source types are represented', () => {
    const names = adapter.tools.map(t => t.name);
    const types = ['vcenter', 'nsxv', 'cisco_switch', 'arista_switch', 'juniper_switch',
      'brocade_switch', 'dell_switch', 'checkpoint_firewall', 'panorama_firewall',
      'ucs_manager', 'hpov_manager', 'hpvc_manager'];
    for (const type of types) {
      expect(names.some(n => n.includes(type))).toBe(true);
    }
  });
});
